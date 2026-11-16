import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type {
  AdminLogEntry,
  AdminStatePayload,
  BannedEntry,
  ChatMessage,
  ChatUser,
  GameChallengeState,
  MemberNotification,
  MicReaction,
  MicRequestItem,
  MicSlot,
  NickAccessRecord,
  NickRevealPayload,
  PermissionKey,
  PrivateMessage,
  RegisteredUserSummary,
  RolePermissionSet,
  Room,
  RoomMedia,
  RoomQuiz,
  SiteSettings,
  TopStarEntry,
  UserGender,
  UserProfileStats,
  UserRole,
  UserSocialLinks,
  WallPost,
  WSClientEvent,
  WSServerEvent,
  YouCamStyleId,
  YouTubeSearchResult,
} from './src/types/chat.ts';
import {
  ALL_TRUE_PERMISSIONS,
  cloneDefaultRolePermissions,
  DEFAULT_DESIGN_SETTINGS,
  DEFAULT_GIFTS,
  DEFAULT_ROOM_IMAGES,
  hasUserPermission,
  PERMISSION_CATALOG,
  sanitizeBannerList,
  sanitizeGiftList,
  sanitizeRolePermissions,
  sanitizeSiteDesign,
  sanitizeSmileyList,
} from './src/utils/chatHelpers.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'chat-store.json');
const MAX_ROOM_MESSAGES = 50;

interface RegisteredAccount {
  id: string;
  username: string;
  usernameLower: string;
  passwordHash: string;
  passwordSalt: string;
  role: UserRole;
  gender: UserGender;
  nameColor: string;
  textColor?: string;
  bgColor?: string;
  statusColor?: string;
  statusIcon?: string;
  giftIcon?: string;
  giftImageUrl?: string;
  giftLabel?: string;
  pmDisabled?: boolean;
  socialLinks?: UserSocialLinks;
  customPermissions?: Partial<RolePermissionSet>;
  statusText: string;
  bio: string;
  avatarSymbol: string;
  avatarUrl?: string;
  coverUrl?: string;
  country: string;
  isMuted: boolean;
  royalEntry?: boolean;
  royalEntryText?: string;
  demoTalkControlEnabled?: boolean;
  lastIp?: string;
  lastDevice?: string;
  createdAt: number;
}

const DEFAULT_ROYAL_ENTRY_TEXT = 'شرف الديوان بدخول ملكي مهيب 👑';

interface StoredSession {
  token: string;
  userId: string;
  isGuest: boolean;
  profile: ChatUser;
  ip?: string;
  deviceSummary?: string;
  createdAt: number;
}

interface StoredRoom extends Omit<Room, 'onlineCount' | 'hasPassword'> {
  password?: string;
}

interface PersistedStore {
  rooms: StoredRoom[];
  accounts: RegisteredAccount[];
  messagesByRoom: Record<string, ChatMessage[]>;
  wallPosts: WallPost[];
  privateMessages: PrivateMessage[];
  sessions: StoredSession[];
  settings: SiteSettings;
  bans: BannedEntry[];
  bannedWords: string[];
  auditLogs: AdminLogEntry[];
  userStats: Record<string, UserProfileStats>;
  notificationsByUser: Record<string, MemberNotification[]>;
  nickHistory: NickAccessRecord[];
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: 'عراقية شات',
  welcomeBanner:
    'أهلاً وسهلاً بكم في عراقية شات · دردشة كتابية عراقية وعربية بدون تسجيل إجباري · لمة الحبايب من بغداد والبصرة والموصل وأربيل',
  allowGuestLogin: true,
  allowRegistration: true,
  allowWallPosts: true,
  slowModeSeconds: 0,
  minLikesToChat: 0,
  defaultStyle: 'classic',
  allowImages: true,
  allowVoiceNotes: true,
  allowPrivateMessages: true,
  allowMics: true,
  allowGames: true,
  allowGifts: true,
  allowRoomCreation: true,
  allowProfileEdits: true,
  maintenanceMode: false,
  maxGuests: 100,
  rolePermissions: cloneDefaultRolePermissions(),
  design: { ...DEFAULT_DESIGN_SETTINGS },
  customGifts: DEFAULT_GIFTS.map((g) => ({ ...g })),
  customSmileys: [],
  banners: [],
};

const SPACE_ROOM_ID = 'space';

const DEFAULT_ROOMS: Omit<Room, 'onlineCount'>[] = [
  {
    id: 'general',
    name: 'الغرفة العامة',
    description: 'الديوان الرئيسي للترحيب والتعارف بين جميع الأعضاء والزوار',
    topic: 'أهلاً وسهلاً بكم في الديوان العام — الاحترام المتبادل أساس التواصل',
    imageUrl: DEFAULT_ROOM_IMAGES.general,
    isDefault: true,
    createdBy: 'system',
  },
  {
    id: 'baghdad',
    name: 'غرفة بغداد',
    description: 'سوالف أهل بغداد، شارع المتنبي، وأجواء دجلة',
    topic: 'مساء الخير يا بغداد — شاركونا أخباركم وسوالفكم اليومية',
    imageUrl: DEFAULT_ROOM_IMAGES.baghdad,
    isDefault: true,
    createdBy: 'system',
  },
  {
    id: 'basra',
    name: 'غرفة البصرة والجنوب',
    description: 'ملتقى أهل البصرة وشط العرب والجنوب العراقي',
    topic: 'هلا بأهل البصرة والجنوب الطيبين — ديوانية المحبة والوفاء',
    imageUrl: DEFAULT_ROOM_IMAGES.basra,
    isDefault: true,
    createdBy: 'system',
  },
  {
    id: 'poetry',
    name: 'غرفة الشعر والأدب',
    description: 'الشعر الشعبي والفصيح، الخواطر، والأدب العراقي',
    topic: 'اكتب بيت شعر أو خاطرة تعبّر عن مزاجك اليوم',
    imageUrl: DEFAULT_ROOM_IMAGES.poetry,
    isDefault: true,
    createdBy: 'system',
  },
  {
    id: 'games',
    name: 'غرفة المسابقات والثقافة',
    description: 'أسئلة ثقافية، حزورات عراقية، وتحديات جماعية',
    topic: 'تحديات ثقافية وأسئلة سريعة — من يبدأ بأول حزورة؟',
    imageUrl: DEFAULT_ROOM_IMAGES.games,
    isDefault: true,
    createdBy: 'system',
  },
];

function createInitialStore(): PersistedStore {
  return {
    rooms: DEFAULT_ROOMS,
    accounts: [],
    messagesByRoom: {
      general: [
        {
          id: 'sys-welcome-general',
          roomId: 'general',
          userId: 'system',
          username: 'إدارة الشات',
          userRole: 'admin',
          userGender: 'male',
          nameColor: '#0F766E',
          text: 'مرحباً بكم في عراقية شات! تفضلوا بالتعارف والمشاركة في الغرف أو الحائط الاجتماعي.',
          textColor: '',
          isBold: false,
          fontSize: 'md',
          timestamp: Date.now(),
          type: 'system',
        },
      ],
      baghdad: [],
      basra: [],
      poetry: [],
      games: [],
    },
    wallPosts: [],
    privateMessages: [],
    sessions: [],
    settings: { ...DEFAULT_SETTINGS },
    bans: [],
    bannedWords: [],
    auditLogs: [],
    userStats: {},
    notificationsByUser: {},
    nickHistory: [],
  };
}

function loadStore(): PersistedStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      const initial = createInitialStore();
      fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersistedStore>;
    const initial = createInitialStore();
    return {
      rooms: Array.isArray(parsed.rooms) && parsed.rooms.length > 0 ? parsed.rooms : initial.rooms,
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      messagesByRoom:
        parsed.messagesByRoom && typeof parsed.messagesByRoom === 'object'
          ? trimRoomMessagesMap(parsed.messagesByRoom)
          : initial.messagesByRoom,
      wallPosts: Array.isArray(parsed.wallPosts) ? parsed.wallPosts : [],
      privateMessages: Array.isArray(parsed.privateMessages) ? parsed.privateMessages : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      settings: parsed.settings && typeof parsed.settings === 'object'
        ? {
            siteTitle: sanitizeText(parsed.settings.siteTitle, 40) || DEFAULT_SETTINGS.siteTitle,
            welcomeBanner: sanitizeText(parsed.settings.welcomeBanner, 220) || DEFAULT_SETTINGS.welcomeBanner,
            allowGuestLogin: typeof parsed.settings.allowGuestLogin === 'boolean' ? parsed.settings.allowGuestLogin : true,
            allowRegistration: typeof parsed.settings.allowRegistration === 'boolean' ? parsed.settings.allowRegistration : true,
            allowWallPosts: typeof parsed.settings.allowWallPosts === 'boolean' ? parsed.settings.allowWallPosts : true,
            slowModeSeconds: typeof parsed.settings.slowModeSeconds === 'number' ? Math.max(0, Math.min(60, parsed.settings.slowModeSeconds)) : 0,
            minLikesToChat:
              typeof parsed.settings.minLikesToChat === 'number'
                ? Math.max(0, Math.min(1_000_000, Math.round(parsed.settings.minLikesToChat)))
                : 0,
            defaultStyle: sanitizeStyleId(parsed.settings.defaultStyle),
            allowImages: typeof parsed.settings.allowImages === 'boolean' ? parsed.settings.allowImages : true,
            allowVoiceNotes: typeof parsed.settings.allowVoiceNotes === 'boolean' ? parsed.settings.allowVoiceNotes : true,
            allowPrivateMessages: typeof parsed.settings.allowPrivateMessages === 'boolean' ? parsed.settings.allowPrivateMessages : true,
            allowMics: typeof parsed.settings.allowMics === 'boolean' ? parsed.settings.allowMics : true,
            allowGames: typeof parsed.settings.allowGames === 'boolean' ? parsed.settings.allowGames : true,
            allowGifts: typeof parsed.settings.allowGifts === 'boolean' ? parsed.settings.allowGifts : true,
            allowRoomCreation: typeof parsed.settings.allowRoomCreation === 'boolean' ? parsed.settings.allowRoomCreation : true,
            allowProfileEdits: typeof parsed.settings.allowProfileEdits === 'boolean' ? parsed.settings.allowProfileEdits : true,
            maintenanceMode: typeof parsed.settings.maintenanceMode === 'boolean' ? parsed.settings.maintenanceMode : false,
            maxGuests: typeof parsed.settings.maxGuests === 'number' ? Math.max(1, Math.min(500, Math.round(parsed.settings.maxGuests))) : 100,
            rolePermissions: sanitizeRolePermissions(parsed.settings.rolePermissions),
            design: sanitizeSiteDesign(parsed.settings.design),
            customGifts: Array.isArray(parsed.settings.customGifts)
              ? sanitizeGiftList(parsed.settings.customGifts)
              : DEFAULT_GIFTS.map((g) => ({ ...g })),
            customSmileys: sanitizeSmileyList(parsed.settings.customSmileys),
            banners: sanitizeBannerList(parsed.settings.banners),
          }
        : {
            ...DEFAULT_SETTINGS,
            rolePermissions: cloneDefaultRolePermissions(),
            design: { ...DEFAULT_DESIGN_SETTINGS },
            customGifts: DEFAULT_GIFTS.map((g) => ({ ...g })),
            customSmileys: [],
            banners: [],
          },
      bans: Array.isArray(parsed.bans) ? parsed.bans : [],
      bannedWords: Array.isArray(parsed.bannedWords) ? parsed.bannedWords : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      userStats: (() => {
        const rawStats = parsed.userStats && typeof parsed.userStats === 'object' ? parsed.userStats : {};
        const migrated: Record<string, UserProfileStats> = {};
        for (const [uid, st] of Object.entries(rawStats)) {
          if (!st || typeof st !== 'object') continue;
          const legacy = st as Partial<UserProfileStats> & { points?: number };
          migrated[uid] = {
            userId: typeof legacy.userId === 'string' ? legacy.userId : uid,
            views: typeof legacy.views === 'number' ? legacy.views : 1,
            likes: Array.isArray(legacy.likes) ? legacy.likes : [],
            likesCount:
              typeof legacy.likesCount === 'number'
                ? legacy.likesCount
                : typeof legacy.points === 'number'
                ? legacy.points
                : 50,
          };
        }
        return migrated;
      })(),
      notificationsByUser:
        parsed.notificationsByUser && typeof parsed.notificationsByUser === 'object'
          ? parsed.notificationsByUser
          : {},
      nickHistory: Array.isArray(parsed.nickHistory) ? parsed.nickHistory : [],
    };
  } catch (err) {
    console.error('Failed to load chat store, initializing fresh store:', err);
    return createInitialStore();
  }
}

function trimRoomMessagesMap(map: Record<string, ChatMessage[]>): Record<string, ChatMessage[]> {
  const trimmed: Record<string, ChatMessage[]> = {};
  for (const [roomId, msgs] of Object.entries(map)) {
    if (!Array.isArray(msgs)) continue;
    trimmed[roomId] = msgs.length > MAX_ROOM_MESSAGES ? msgs.slice(-MAX_ROOM_MESSAGES) : msgs;
  }
  return trimmed;
}

const store = loadStore();

function appendRoomMessage(roomId: string, msg: ChatMessage) {
  if (!store.messagesByRoom[roomId]) {
    store.messagesByRoom[roomId] = [];
  }
  store.messagesByRoom[roomId].push(msg);
  if (store.messagesByRoom[roomId].length > MAX_ROOM_MESSAGES) {
    store.messagesByRoom[roomId] = store.messagesByRoom[roomId].slice(-MAX_ROOM_MESSAGES);
  }
}

let saveTimer: NodeJS.Timeout | null = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      // Trim expired sessions (> 7 days) before saving
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      store.sessions = store.sessions.filter((s) => s.createdAt > cutoff);
      fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving store:', err);
    }
  }, 500);
}

function hashPassword(password: string, salt?: string) {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, useSalt, 64).toString('hex');
  return { hash, salt: useSalt };
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function sanitizeText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}

function sanitizeStyleId(input: unknown): YouCamStyleId {
  const allowed: YouCamStyleId[] = ['classic', 'royal-blue', 'gold-baghdad', 'rose-pink', 'emerald'];
  return typeof input === 'string' && allowed.includes(input as YouCamStyleId)
    ? (input as YouCamStyleId)
    : 'classic';
}

function sanitizeColor(input: unknown, fallback: string): string {
  if (typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  return fallback;
}

function sanitizeImageUrl(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.startsWith('data:image/') &&
    !trimmed.startsWith('data:image/svg') &&
    trimmed.length <= 14_500_000
  ) {
    return trimmed;
  }
  if ((trimmed.startsWith('https://') || trimmed.startsWith('http://')) && trimmed.length <= 2000) {
    return trimmed;
  }
  if ((trimmed.startsWith('/src/assets/images/') || trimmed.startsWith('/assets/')) && trimmed.length <= 300) {
    return trimmed;
  }
  return undefined;
}

function sanitizeAudioUrl(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('data:audio/') && trimmed.length <= 380_000) {
    return trimmed;
  }
  return undefined;
}

function sanitizeAvatarUrl(input: unknown, fallbackSeed: string): string {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === 'none') {
      return 'none';
    }
    if (/^dicebear:(adventurer|avataaars|lorelei|personas|botttsNeutral|funEmoji):[a-zA-Z0-9_\-\u0600-\u06FF ]{1,64}$/.test(trimmed)) {
      return trimmed;
    }
    if (
      trimmed.startsWith('data:image/') &&
      !trimmed.startsWith('data:image/svg') &&
      trimmed.length <= 11_500_000
    ) {
      return trimmed;
    }
    if ((trimmed.startsWith('https://') || trimmed.startsWith('http://')) && trimmed.length <= 2000) {
      return trimmed;
    }
    if ((trimmed.startsWith('/src/assets/images/') || trimmed.startsWith('/assets/')) && trimmed.length <= 300) {
      return trimmed;
    }
  }
  return `dicebear:adventurer:${fallbackSeed}`;
}

function sanitizeOptionalColor(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  return undefined;
}

function sanitizeSocialLinks(input: unknown): UserSocialLinks | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as Record<string, unknown>;
  const clean = (val: unknown) => sanitizeText(val, 140);
  const links: UserSocialLinks = {
    youtube: clean(raw.youtube) || undefined,
    snapchat: clean(raw.snapchat) || undefined,
    instagram: clean(raw.instagram) || undefined,
    tiktok: clean(raw.tiktok) || undefined,
    website: clean(raw.website) || undefined,
  };
  return links;
}

// Active WebSocket connections mapped by socket
interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  token: string;
  roomId: string;
  isInSpace?: boolean;
  suppressedLeaveNotice?: boolean;
  lastMessageAt: number;
  lastPublicActivityAt: number;
  clientReportedIdle?: boolean;
  isIdle?: boolean;
  isAlive: boolean;
  ip?: string;
  deviceSummary?: string;
}

const PUBLIC_IDLE_TIMEOUT_MS = 2 * 60 * 1000;

const socketNetworkInfo = new WeakMap<WebSocket, { ip: string; deviceSummary: string }>();

function normalizeRawIp(raw: string): string {
  let cleaned = raw.trim();
  if (!cleaned) return '';
  // Handle IPv6 brackets or host:port
  if (cleaned.startsWith('[') && cleaned.includes(']')) {
    cleaned = cleaned.slice(1, cleaned.indexOf(']'));
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(cleaned)) {
    cleaned = cleaned.split(':')[0];
  }
  cleaned = cleaned.replace(/^::ffff:/i, '');
  if (cleaned === '::1') return '127.0.0.1';
  return cleaned.slice(0, 64);
}

function extractClientIp(req?: http.IncomingMessage): string {
  if (!req) return 'غير معروف';
  const headerVal = (val: string | string[] | undefined): string => {
    if (!val) return '';
    const first = Array.isArray(val) ? val[0] : val;
    if (typeof first !== 'string') return '';
    return normalizeRawIp(first.split(',')[0] || '');
  };
  const forwarded = headerVal(req.headers['x-forwarded-for']);
  if (forwarded) return forwarded;
  const cfIp = headerVal(req.headers['cf-connecting-ip']);
  if (cfIp) return cfIp;
  const realIp = headerVal(req.headers['x-real-ip']);
  if (realIp) return realIp;
  const remote = req.socket?.remoteAddress ? normalizeRawIp(req.socket.remoteAddress) : '';
  return remote || 'غير معروف';
}

function extractDeviceSummary(uaHeader?: string | string[]): string {
  const ua = (Array.isArray(uaHeader) ? uaHeader[0] : uaHeader) || '';
  if (!ua) return 'متصفح غير محدد';
  const low = ua.toLowerCase();
  let os = 'جهاز غير محدد';
  if (low.includes('iphone')) os = 'آيفون';
  else if (low.includes('ipad')) os = 'آيباد';
  else if (low.includes('android')) os = 'أندرويد';
  else if (low.includes('windows')) os = 'ويندوز';
  else if (low.includes('mac os') || low.includes('macintosh')) os = 'ماك';
  else if (low.includes('linux')) os = 'لينكس';

  let browser = 'متصفح';
  if (low.includes('edg/')) browser = 'Edge';
  else if (low.includes('opr/') || low.includes('opera')) browser = 'Opera';
  else if (low.includes('chrome/') || low.includes('crios/')) browser = 'Chrome';
  else if (low.includes('firefox/') || low.includes('fxios/')) browser = 'Firefox';
  else if (low.includes('safari/')) browser = 'Safari';

  return `${os} · ${browser}`;
}

function recordNickAccess(params: {
  userId: string;
  username: string;
  isGuest: boolean;
  role: UserRole;
  nameColor: string;
  country: string;
  ip: string;
  deviceSummary: string;
  roomId?: string;
}) {
  const ip = (params.ip || '').trim() || 'غير معروف';
  const deviceSummary = (params.deviceSummary || '').trim() || 'متصفح غير محدد';
  const now = Date.now();
  const lowerName = params.username.trim().toLowerCase();
  if (!lowerName) return;

  if (!params.isGuest) {
    const acc = store.accounts.find((a) => a.id === params.userId);
    if (acc && ip !== 'غير معروف') {
      acc.lastIp = ip;
      acc.lastDevice = deviceSummary;
    }
  }

  const existingIdx = store.nickHistory.findIndex(
    (r) =>
      r.ip === ip &&
      r.username.toLowerCase() === lowerName &&
      (r.userId === params.userId || (r.isGuest && params.isGuest))
  );

  if (existingIdx >= 0) {
    const existing = store.nickHistory[existingIdx];
    existing.userId = params.userId;
    existing.username = params.username;
    existing.isGuest = params.isGuest;
    existing.role = params.role;
    existing.nameColor = params.nameColor;
    existing.country = params.country;
    existing.deviceSummary = deviceSummary;
    existing.lastSeenAt = now;
    existing.loginCount = (existing.loginCount || 1) + 1;
    if (params.roomId) existing.lastRoomId = params.roomId;
    if (existingIdx > 0) {
      store.nickHistory.splice(existingIdx, 1);
      store.nickHistory.unshift(existing);
    }
  } else {
    store.nickHistory.unshift({
      id: `nick-${crypto.randomUUID()}`,
      userId: params.userId,
      username: params.username,
      isGuest: params.isGuest,
      role: params.role,
      nameColor: params.nameColor,
      country: params.country,
      ip,
      deviceSummary,
      firstSeenAt: now,
      lastSeenAt: now,
      loginCount: 1,
      lastRoomId: params.roomId || 'general',
    });
    if (store.nickHistory.length > 500) {
      store.nickHistory = store.nickHistory.slice(0, 500);
    }
  }
}

function sanitizeMediaInput(
  rawUrl: unknown,
  rawTitle: unknown,
  addedBy: string
): RoomMedia | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 500) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  let ytId = '';
  if (host === 'youtu.be') {
    ytId = parsed.pathname.split('/').filter(Boolean)[0] || '';
  } else if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (parsed.pathname === '/watch') {
      ytId = parsed.searchParams.get('v') || '';
    } else if (
      parsed.pathname.startsWith('/live/') ||
      parsed.pathname.startsWith('/shorts/') ||
      parsed.pathname.startsWith('/embed/')
    ) {
      ytId = parsed.pathname.split('/').filter(Boolean)[1] || '';
    }
  }

  const title = sanitizeText(rawTitle, 90);
  if (ytId && /^[a-zA-Z0-9_-]{11}$/.test(ytId)) {
    return {
      kind: 'youtube',
      url: parsed.toString(),
      embedId: ytId,
      title: title || 'مقطع يوتيوب للغرفة',
      addedBy,
      updatedAt: Date.now(),
    };
  }

  return {
    kind: 'audio',
    url: parsed.toString(),
    title: title || 'بث صوتي للغرفة',
    addedBy,
    updatedAt: Date.now(),
  };
}

function normalizeArabicAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ');
}

function sanitizeStatusIcon(input: unknown): string {
  if (typeof input !== 'string') return '';
  const cleaned = input.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!cleaned) return '';
  try {
    const SegmenterCtor = (Intl as unknown as {
      Segmenter?: new (
        locale?: string,
        opts?: { granularity: 'grapheme' }
      ) => { segment: (s: string) => Iterable<{ segment: string }> };
    }).Segmenter;
    if (SegmenterCtor) {
      const segs = Array.from(new SegmenterCtor('ar', { granularity: 'grapheme' }).segment(cleaned));
      return segs[0]?.segment.slice(0, 16) || '';
    }
  } catch {
    // fallback below
  }
  return Array.from(cleaned).slice(0, 2).join('').slice(0, 16);
}

const clients = new Map<WebSocket, ConnectedClient>();
const userSockets = new Map<string, Set<WebSocket>>();
const virtualOnlineUsers = new Map<string, ChatUser>();
let alertSequenceCounter = 51;
const activeChallenges = new Map<string, GameChallengeState>();
const activeQuizByRoom = new Map<string, RoomQuiz & { answerNormalized: string }>();

function getPublicQuiz(roomId: string): RoomQuiz | null {
  const q = activeQuizByRoom.get(roomId);
  if (!q) return null;
  const { answerNormalized: _ans, ...publicQuiz } = q;
  return publicQuiz;
}

const GENERAL_MIC_COUNT = 5;
const MIC_MAX_DURATION_MS = 5 * 60 * 1000;
const CUSTOM_VOICE_MIC_MAX_DURATION_MS = 30 * 60 * 1000;
const generalMics: MicSlot[] = Array.from({ length: GENERAL_MIC_COUNT }, (_, idx) => ({
  slotIndex: idx,
  userId: null,
  username: null,
  isMuted: false,
  isLocked: false,
}));
let generalMicRequests: MicRequestItem[] = [];

const roomMicsMap = new Map<string, MicSlot[]>([['general', generalMics]]);
const roomMicRequestsMap = new Map<string, MicRequestItem[]>();

function isVoiceEnabledRoom(roomId: string): boolean {
  if (roomId === 'general') return true;
  const room = store.rooms.find((r) => r.id === roomId);
  return Boolean(room?.isVoiceRoom);
}

function getRoomMics(roomId: string): MicSlot[] {
  if (!isVoiceEnabledRoom(roomId)) return [];
  const existing = roomMicsMap.get(roomId);
  if (existing) return existing;
  const room = store.rooms.find((r) => r.id === roomId);
  const count = Math.min(10, Math.max(2, Math.round(Number(room?.voiceMicCount) || 6)));
  const slots: MicSlot[] = Array.from({ length: count }, (_, idx) => ({
    slotIndex: idx,
    userId: null,
    username: null,
    isMuted: false,
    isLocked: false,
  }));
  roomMicsMap.set(roomId, slots);
  return slots;
}

function getRoomMicRequests(roomId: string): MicRequestItem[] {
  if (roomId === 'general') return generalMicRequests;
  let list = roomMicRequestsMap.get(roomId);
  if (!list) {
    list = [];
    roomMicRequestsMap.set(roomId, list);
  }
  return list;
}

function setRoomMicRequests(roomId: string, next: MicRequestItem[]) {
  if (roomId === 'general') {
    generalMicRequests = next;
  } else {
    roomMicRequestsMap.set(roomId, next);
  }
}

function canManageRoomMics(profile: ChatUser, roomId: string): boolean {
  if (canDo(profile, 'canManageMics')) return true;
  const room = store.rooms.find((r) => r.id === roomId);
  return Boolean(room?.isVoiceRoom && room.createdBy && room.createdBy === profile.id);
}

function broadcastRoomMics(roomId: string) {
  if (!isVoiceEnabledRoom(roomId)) return;
  broadcastToRoom(roomId, {
    type: 'mics:update',
    roomId,
    mics: getRoomMics(roomId).map((m) => ({ ...m })),
    micRequests: [...getRoomMicRequests(roomId)],
  });
}

function broadcastGeneralMics() {
  broadcastRoomMics('general');
}

const botMicSpeakingTimers = new Map<string, NodeJS.Timeout>();
const botRecentMicLines = new Map<string, string[]>();

function recordBotMicLine(userId: string, line: string) {
  const cleaned = line.trim();
  if (!cleaned) return;
  const list = botRecentMicLines.get(userId) || [];
  list.push(cleaned);
  if (list.length > 8) list.splice(0, list.length - 8);
  botRecentMicLines.set(userId, list);
}

function clearBotMicSpeakingTimer(userId: string) {
  const existing = botMicSpeakingTimers.get(userId);
  if (existing) {
    clearTimeout(existing);
    botMicSpeakingTimers.delete(userId);
  }
}

function removeUserFromRoomMics(roomId: string, userId: string): boolean {
  if (!isVoiceEnabledRoom(roomId)) return false;
  let changed = false;
  const slots = getRoomMics(roomId);
  for (const slot of slots) {
    if (slot.userId === userId) {
      slot.userId = null;
      slot.username = null;
      slot.nameColor = undefined;
      slot.avatarUrl = undefined;
      slot.userRole = undefined;
      slot.isMuted = false;
      slot.hasCam = false;
      slot.joinedAt = undefined;
      changed = true;
    }
  }
  if (changed && roomId === 'general') {
    clearBotMicSpeakingTimer(userId);
    botRecentMicLines.delete(userId);
  }
  const reqs = getRoomMicRequests(roomId);
  const filtered = reqs.filter((r) => r.userId !== userId);
  if (filtered.length !== reqs.length) {
    setRoomMicRequests(roomId, filtered);
    changed = true;
  }
  return changed;
}

function removeUserFromGeneralMics(userId: string): boolean {
  return removeUserFromRoomMics('general', userId);
}

function removeUserFromAllVoiceMics(userId: string) {
  for (const roomId of Array.from(roomMicsMap.keys())) {
    if (removeUserFromRoomMics(roomId, userId)) {
      broadcastRoomMics(roomId);
    }
  }
}

// Enforce maximum mic speaking duration per turn for non-admin speakers
setInterval(() => {
  const now = Date.now();
  for (const [roomId, slots] of roomMicsMap.entries()) {
    const maxDur = roomId === 'general' ? MIC_MAX_DURATION_MS : CUSTOM_VOICE_MIC_MAX_DURATION_MS;
    let changed = false;
    for (const slot of slots) {
      if (!slot.userId || !slot.joinedAt) continue;
      if (slot.userRole === 'admin') continue;
      if (now - slot.joinedAt >= maxDur) {
        const uid = slot.userId;
        if (removeUserFromRoomMics(roomId, uid)) {
          changed = true;
          broadcastToRoom(roomId, {
            type: 'mic:speaking',
            roomId,
            userId: uid,
            isSpeaking: false,
          });
          sendToUser(uid, {
            type: 'mod:notice',
            message:
              roomId === 'general'
                ? 'انتهت مدة التحدث على المايك (5 دقائق). يمكنك الصعود مجدداً عند الرغبة.'
                : 'انتهت مدة التحدث على المايك (30 دقيقة). يمكنك الصعود مجدداً عند الرغبة.',
          });
        }
      }
    }
    if (changed) {
      broadcastRoomMics(roomId);
    }
  }
}, 5000);

function getOrCreateUserStats(userId: string): UserProfileStats {
  const existing = store.userStats[userId] as (UserProfileStats & { points?: number }) | undefined;
  if (!existing) {
    store.userStats[userId] = {
      userId,
      views: 1,
      likes: [],
      likesCount: 50,
    };
  } else if (typeof existing.likesCount !== 'number') {
    existing.likesCount = typeof existing.points === 'number' ? existing.points : 50;
    delete existing.points;
  }
  return store.userStats[userId];
}

function checkXoWinner(board: ('' | 'X' | 'O')[]): 'X' | 'O' | 'draw' | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as 'X' | 'O';
    }
  }
  if (board.every((cell) => cell !== '')) return 'draw';
  return null;
}

function ensureDemoTestMember(
  options: { roomId?: string; forceNew?: boolean; reactivateDefault?: boolean } = {}
): ChatUser {
  const targetRoom = store.rooms.some((r) => r.id === options.roomId) ? options.roomId! : 'general';
  const defaultId = 'demo-member-test';
  const defaultUsername = 'عضو_تجريبي';

  const defaultIsOnline =
    virtualOnlineUsers.has(defaultId) || (userSockets.get(defaultId)?.size || 0) > 0;

  let chosenId = defaultId;
  let chosenUsername = defaultUsername;

  if (options.forceNew && defaultIsOnline) {
    let idx = 2;
    while (idx < 100) {
      const candidateId = `demo-member-test-${idx}`;
      const existingAcc = store.accounts.find((a) => a.id === candidateId);
      const isOnline =
        virtualOnlineUsers.has(candidateId) || (userSockets.get(candidateId)?.size || 0) > 0;
      const isBanned = existingAcc
        ? store.bans.some((b) => b.usernameLower === existingAcc.usernameLower)
        : store.bans.some((b) => b.usernameLower === `عضو_تجريبي_${idx}`);
      if (!isOnline && !isBanned) {
        chosenId = candidateId;
        chosenUsername = existingAcc?.username || `عضو_تجريبي_${idx}`;
        break;
      }
      idx += 1;
    }
  }

  let account = store.accounts.find((a) => a.id === chosenId);
  if (options.reactivateDefault) {
    store.bans = store.bans.filter((b) => b.usernameLower !== chosenUsername.toLowerCase());
  }

  if (!account) {
    const { hash, salt } = hashPassword('1234');
    account = {
      id: chosenId,
      username: chosenUsername,
      usernameLower: chosenUsername.toLowerCase(),
      passwordHash: hash,
      passwordSalt: salt,
      role: 'member',
      gender: 'male',
      nameColor: '#0F766E',
      statusText: 'عضو تجريبي لاختبار الصلاحيات',
      bio: 'حساب تجريبي مخصص لاختبار الكتم والنقل والطرد والرتب والصلاحيات',
      avatarSymbol: '🧪',
      avatarUrl: `dicebear:adventurer:${chosenUsername}`,
      country: 'العراق',
      isMuted: false,
      customPermissions: { ...ALL_TRUE_PERMISSIONS },
      demoTalkControlEnabled: false,
      createdAt: Date.now(),
    };
    store.accounts.push(account);
    if (!store.userStats[account.id]) {
      store.userStats[account.id] = {
        userId: account.id,
        views: 12,
        likes: [],
        likesCount: 150,
      };
    }
    scheduleSave();
  } else {
    let changed = false;
    if (!account.customPermissions || Object.keys(account.customPermissions).length < PERMISSION_CATALOG.length) {
      account.customPermissions = { ...ALL_TRUE_PERMISSIONS };
      changed = true;
    }
    if (options.reactivateDefault) {
      account.isMuted = false;
      changed = true;
    }
    if (changed) scheduleSave();
  }

  const profile: ChatUser = {
    id: account.id,
    username: account.username,
    isGuest: false,
    role: account.role,
    gender: account.gender,
    nameColor: account.nameColor,
    textColor: account.textColor,
    bgColor: account.bgColor,
    statusColor: account.statusColor,
    statusIcon: account.statusIcon,
    giftIcon: account.giftIcon,
    giftImageUrl: account.giftImageUrl,
    giftLabel: account.giftLabel,
    pmDisabled: account.pmDisabled,
    socialLinks: account.socialLinks,
    customPermissions: account.customPermissions,
    statusText: account.statusText,
    bio: account.bio,
    avatarSymbol: account.avatarSymbol,
    avatarUrl: account.avatarUrl || `dicebear:adventurer:${account.username}`,
    coverUrl: account.coverUrl,
    roomId: targetRoom,
    joinedAt: Date.now(),
    isMuted: account.isMuted,
    royalEntry: account.royalEntry,
    royalEntryText: account.royalEntryText,
    demoTalkControlEnabled: Boolean(account.demoTalkControlEnabled),
    country: account.country,
  };

  if (!store.bans.some((b) => b.usernameLower === account.usernameLower)) {
    virtualOnlineUsers.set(account.id, profile);
  }
  return profile;
}

// Seed default test member online on startup unless explicitly banned, and ensure all demo accounts have full permissions
{
  let updatedPerms = false;
  for (const acc of store.accounts) {
    if (acc.id.startsWith('demo-member-test')) {
      if (!acc.customPermissions || Object.keys(acc.customPermissions).length < PERMISSION_CATALOG.length) {
        acc.customPermissions = { ...ALL_TRUE_PERMISSIONS };
        updatedPerms = true;
      }
    }
  }
  if (updatedPerms) scheduleSave();

  const existingDefault = store.accounts.find((a) => a.id === 'demo-member-test');
  const defaultBanned = store.bans.some(
    (b) => b.usernameLower === 'عضو_تجريبي' || (existingDefault && b.usernameLower === existingDefault.usernameLower)
  );
  if (!defaultBanned && (!existingDefault || !virtualOnlineUsers.has('demo-member-test'))) {
    ensureDemoTestMember({ roomId: 'general' });
  }
}

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const geminiClient = GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
        timeout: 25000,
      },
    })
  : null;

const modelCooldownUntil = new Map<string, number>();

function isModelInCooldown(model: string): boolean {
  const until = modelCooldownUntil.get(model);
  if (!until) return false;
  if (Date.now() >= until) {
    modelCooldownUntil.delete(model);
    return false;
  }
  return true;
}

function isQuotaOrRateLimitError(err: unknown): boolean {
  const anyErr = err as { status?: number; code?: number; message?: string } | null;
  if (anyErr?.status === 429 || anyErr?.code === 429) return true;
  const msg = anyErr?.message || (err instanceof Error ? err.message : String(err || ''));
  return /429|RESOURCE_EXHAUSTED|quota|rate[- ]?limit/i.test(msg);
}

function isTimeoutOrAbortError(err: unknown): boolean {
  const anyErr = err as { name?: string; message?: string; cause?: unknown } | null;
  if (anyErr?.name === 'AbortError' || anyErr?.name === 'TimeoutError') return true;
  const msg = anyErr?.message || (err instanceof Error ? err.message : String(err || ''));
  return /timeout|timed out|aborted|ETIMEDOUT|UND_ERR_HEADERS_TIMEOUT/i.test(msg);
}

async function runGeminiWithTimeout<T>(
  timeoutMs: number,
  task: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error(`Gemini request timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function handleGeminiModelError(tag: string, model: string, err: unknown) {
  if (isQuotaOrRateLimitError(err)) {
    const cooldownMs = 15 * 60 * 1000;
    const wasAlreadyCooling = isModelInCooldown(model);
    modelCooldownUntil.set(model, Date.now() + cooldownMs);
    if (!wasAlreadyCooling) {
      console.info(`[${tag}] Model ${model} hit quota/rate limit; using fallback for 15m.`);
    }
    return;
  }
  if (isTimeoutOrAbortError(err)) {
    const cooldownMs = 3 * 60 * 1000;
    const wasAlreadyCooling = isModelInCooldown(model);
    modelCooldownUntil.set(model, Date.now() + cooldownMs);
    if (!wasAlreadyCooling) {
      console.info(`[${tag}] Model ${model} timed out; using fallback for 3m.`);
    }
    return;
  }
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[${tag}] Model ${model} unavailable (${msg}); using fallback.`);
}

const DEMO_CHAT_WINDOW_MS = 5 * 60 * 1000;
const DEMO_INTIMATE_WINDOW_MS = 30 * 60 * 1000;
const activeDemoChatWindows = new Map<string, { lastInteractionAt: number }>();
const demoIntimateUsers = new Map<string, number>();
const lastFallbackByTarget = new Map<string, string>();
const demoReplySequence = new Map<string, number>();

function isVirtualDemoUserId(userId: string): boolean {
  return Boolean(userId && userId.startsWith('demo-member-test') && virtualOnlineUsers.has(userId));
}

function disableDemoBotActivity(botId: string) {
  for (const key of [...activeDemoChatWindows.keys()]) {
    if (key.includes(`:${botId}:`)) {
      activeDemoChatWindows.delete(key);
    }
  }
  for (const key of [...demoIntimateUsers.keys()]) {
    if (key.startsWith(`${botId}:`)) {
      demoIntimateUsers.delete(key);
    }
  }
  for (const key of [...demoReplySequence.keys()]) {
    if (key.endsWith(`:${botId}`) || key.startsWith(`pm:${botId}:`)) {
      demoReplySequence.set(key, (demoReplySequence.get(key) || 0) + 1);
    }
  }
  clearBotMicSpeakingTimer(botId);
  const vBot = virtualOnlineUsers.get(botId);
  if (vBot) {
    broadcastToRoom(vBot.roomId, {
      type: 'chat:typing',
      roomId: vBot.roomId,
      userId: botId,
      username: vBot.username,
      isTyping: false,
    });
  }
  if (removeUserFromGeneralMics(botId)) {
    broadcastGeneralMics();
  }
  broadcastToRoom('general', {
    type: 'mic:speaking',
    roomId: 'general',
    userId: botId,
    isSpeaking: false,
  });
}

function isDemoStopCommand(text: string): boolean {
  const normalized = text.trim();
  return /^(اسكت|سكت|كافي|لا ترد|توقف|خلص روح|روح نام)$/i.test(normalized) ||
    /(?:اسكت|لا ترد علي|كافي حجي|بطل حجي)/i.test(normalized);
}

function isDemoFarewell(text: string): boolean {
  return /(?:باي|مع السلامة|تصبح على خير|في امان الله|اشوفك بخير|اشوفكم بخير|يلا رايح|طالع اني)/i.test(text);
}

function wantsIntimateSpeech(text: string): boolean {
  const norm = normalizeArabicName(text);
  if (!norm) return false;
  return /(?:حميمي|حميمه|رومانسي|رومانسيه|عاطفي|عاطفيه|غزل|غازلني|اتغزل|تغزل|دلعني|دللني|تدلعني|كلام حلو|كلام حب|كلام دافي|همس|بوح|شوق|تلميح|احبك|اعشقك|اموت عليك|اموت عليج|حبيبي|حبيبتي|يا عمري|عمري انت|روحي انت|يا روحي|حياتي انت|قلبي|كلبي|فديتك|فديتج|مشتاقلك|مشتاكلك|مشتاكلج|مشتاقتلج|مشتاقتلك|ابوسك|ابوسج|حضن|احضنك|احضنج|يابعد روحي|يا بعد روحي|يا بعد عمري)/.test(norm);
}

function wantsNormalSpeech(text: string): boolean {
  const norm = normalizeArabicName(text);
  if (!norm) return false;
  return /(?:تكلم عادي|احجي عادي|رجع عادي|خلي كلامك عادي|احجي طبيعي|بلا غزل|بدون غزل|كافي غزل|بلا رومانسيه|بدون حميمي|كافي حميمي)/.test(norm);
}

function resolveIntimateMode(botId: string, userId: string, text: string, now: number, isFarewell: boolean): boolean {
  const key = `${botId}:${userId}`;
  if (wantsNormalSpeech(text) || isDemoStopCommand(text)) {
    demoIntimateUsers.delete(key);
    return false;
  }
  if (wantsIntimateSpeech(text)) {
    if (isFarewell) {
      demoIntimateUsers.delete(key);
    } else {
      demoIntimateUsers.set(key, now);
    }
    return true;
  }
  const existing = demoIntimateUsers.get(key);
  if (existing && now - existing <= DEMO_INTIMATE_WINDOW_MS) {
    if (isFarewell) {
      demoIntimateUsers.delete(key);
    } else {
      demoIntimateUsers.set(key, now);
    }
    return true;
  }
  if (existing) {
    demoIntimateUsers.delete(key);
  }
  return false;
}

function normalizeArabicName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[_]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textMatchesNormalizedName(normText: string, textWords: string[], candidateName: string): boolean {
  if (!candidateName || candidateName.length < 2) return false;
  if (` ${normText} `.includes(` ${candidateName} `)) {
    return true;
  }
  if (!candidateName.includes(' ')) {
    const yaForm = `يا${candidateName}`;
    const yaShortForm = candidateName.startsWith('ا') && candidateName.length > 2 ? `يا${candidateName.slice(1)}` : '';
    const waForm = `و${candidateName}`;
    for (const w of textWords) {
      if (w === candidateName || w === yaForm || (yaShortForm && w === yaShortForm) || w === waForm) {
        return true;
      }
    }
  }
  return false;
}

function doesTextCallDemoBot(
  text: string,
  replyTo: ChatMessage['replyTo'] | undefined,
  bot: ChatUser,
  roomBotsCount: number,
  roomMessages: ChatMessage[]
): boolean {
  if (replyTo) {
    if (replyTo.username && normalizeArabicName(replyTo.username) === normalizeArabicName(bot.username)) {
      return true;
    }
    if (replyTo.id) {
      const repliedMsg = roomMessages.find((m) => m.id === replyTo.id);
      if (repliedMsg?.userId === bot.id) return true;
    }
  }
  const clean = text.trim();
  if (!clean) return false;
  const spacedName = bot.username.replace(/_/g, ' ');
  if (
    clean.includes(`@${bot.username}`) ||
    clean.includes(bot.username) ||
    clean.includes(spacedName)
  ) {
    return true;
  }

  const normText = normalizeArabicName(clean);
  const normBotName = normalizeArabicName(bot.username);
  if (normText) {
    const textWords = normText.split(' ').filter(Boolean);
    if (textMatchesNormalizedName(normText, textWords, normBotName)) {
      return true;
    }
    const botTokens = normBotName.split(' ').filter((t) => t.length >= 2);
    if (botTokens.length > 1) {
      const ignoredFirstTokens = new Set(['عضو', 'تجريبي', 'التجريبي', 'ابو', 'ام', 'الاخ', 'الاخت']);
      const primaryToken = botTokens[0];
      if (!ignoredFirstTokens.has(primaryToken) && textMatchesNormalizedName(normText, textWords, primaryToken)) {
        return true;
      }
    }
  }

  const botHasDemoWord = normBotName.includes('تجريبي');
  const genericLeadingRegex = /^\s*(?:يا\s*)?(?:@)?(?:العضو\s+التجريبي|عضو\s+تجريبي|التجريبي|تجريبي)(?:\s|$|[!؟?.,،:])/;
  const genericAnywhereRegex = /(?:^|\s|@)(?:العضو\s+التجريبي|عضو\s+تجريبي|التجريبي|تجريبي)(?:\s|$|[!؟?.,،:])/;
  if (genericLeadingRegex.test(clean) && (botHasDemoWord || roomBotsCount === 1)) {
    return true;
  }
  if (botHasDemoWord && roomBotsCount === 1 && genericAnywhereRegex.test(clean)) {
    return true;
  }
  return false;
}

function mentionsAnotherUser(text: string, onlineMap: Map<string, ChatUser>, botId: string, senderId: string): boolean {
  const normText = normalizeArabicName(text);
  const textWords = normText ? normText.split(' ').filter(Boolean) : [];
  for (const user of onlineMap.values()) {
    if (user.id === botId || user.id === senderId) continue;
    if (text.includes(`@${user.username}`)) {
      return true;
    }
    const normOther = normalizeArabicName(user.username);
    if (normOther.length >= 3 && textMatchesNormalizedName(normText, textWords, normOther)) {
      return true;
    }
  }
  return false;
}

function toWesternDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function evaluateSimpleMathExpression(rawText: string): { expr: string; result: number } | null {
  const normalized = toWesternDigits(rawText)
    .replace(/[×xX]/g, '*')
    .replace(/[÷]/g, '/');
  const match = normalized.match(/(\d+(?:\.\d+)?(?:\s*[+\-*/]\s*\d+(?:\.\d+)?)+)/);
  if (!match) return null;
  const expr = match[1].trim();
  const tokens = expr.match(/\d+(?:\.\d+)?|[+\-*/]/g);
  if (!tokens || tokens.length < 3) return null;

  const values: number[] = [];
  const ops: string[] = [];
  const prec = (op: string) => (op === '*' || op === '/' ? 2 : 1);
  const applyOp = () => {
    const op = ops.pop();
    const b = values.pop();
    const a = values.pop();
    if (!op || a === undefined || b === undefined) return false;
    if (op === '+') values.push(a + b);
    else if (op === '-') values.push(a - b);
    else if (op === '*') values.push(a * b);
    else if (op === '/') {
      if (b === 0) return false;
      values.push(a / b);
    }
    return true;
  };

  for (const tok of tokens) {
    if (/^\d/.test(tok)) {
      values.push(Number(tok));
    } else {
      while (ops.length > 0 && prec(ops[ops.length - 1]) >= prec(tok)) {
        if (!applyOp()) return null;
      }
      ops.push(tok);
    }
  }
  while (ops.length > 0) {
    if (!applyOp()) return null;
  }
  if (values.length !== 1 || !Number.isFinite(values[0])) return null;
  const rounded = Math.round(values[0] * 1000) / 1000;
  return { expr: expr.replace(/\s+/g, ' '), result: rounded };
}

function solveAgePuzzle(rawText: string): string | null {
  const t = toWesternDigits(rawText);
  const ageMatch = t.match(/عمر[^\d]{0,20}(\d+)[^\n]{0,80}(?:نص|نصف)\s*(?:عمره|عمرها|العمر)[^\n]{0,80}بعد\s*(\d+)\s*(?:سنة|سنين|سنه|اعوام|أعوام)/);
  if (ageMatch) {
    const baseAge = Number(ageMatch[1]);
    const yearsLater = Number(ageMatch[2]);
    if (Number.isFinite(baseAge) && Number.isFinite(yearsLater) && baseAge > 0 && yearsLater > 0) {
      const siblingNow = baseAge / 2;
      const diff = baseAge - siblingNow;
      const personLater = baseAge + yearsLater;
      const siblingLater = personLater - diff;
      if (Number.isInteger(siblingLater)) {
        return `الجواب المنطقي هو ${siblingLater} سنة؛ لأن فرق العمر بيناتهم ثابت (${diff} سنين)، بعد ${yearsLater} سنة يصير عمر الأول ${personLater} سنة، فتطرح ${diff} من ${personLater} يطلع ${siblingLater} مو نصها.`;
      }
    }
  }
  return null;
}

function buildIraqiFallbackReply(
  incomingText: string,
  senderName: string,
  targetKey: string,
  options: {
    isFarewell?: boolean;
    isFirstCall?: boolean;
    isIntimate?: boolean;
    senderGender?: UserGender;
    botGender?: UserGender;
    roomName?: string;
    roomTopic?: string;
    isOnMic?: boolean;
  } = {}
): string {
  const t = incomingText.trim();
  const isSenderFemale = options.senderGender === 'female';
  const botIsFemale = options.botGender === 'female';
  let candidates: string[] = [];

  // 1. Situational awareness (who is on mic / room topic / online count)
  if (!options.isIntimate && !options.isFarewell) {
    if (/(?:منو|مين)\s*(?:صاعد|صاعدة|ع|على)?\s*(?:المايك|عالمايك|بالمايك|مايك)/.test(t)) {
      const activeMics = generalMics.filter((s) => s.userId);
      if (activeMics.length === 0) {
        return botIsFemale
          ? `حالياً المايكات كلها فارغة يا ${senderName}، محد صاعد بعد.`
          : `حالياً المايكات كلها فارغة عيني ${senderName}، محد صاعد بعد.`;
      }
      const names = activeMics.map((s) => `${s.username} (مايك ${s.slotIndex + 1}${s.isMuted ? ' مكتوم' : ''})`).join(' و ');
      return `المتواجدين على المايكات هسة: ${names}.`;
    }

    if (/(?:كم واحد|شكد عدد|منو موجود|منو بالغرفة|موضوع الغرفة)/.test(t)) {
      const roomUsers = getOnlineUsersForRoom('general');
      const topicText = options.roomTopic ? ` وموضوعها "${options.roomTopic}"` : '';
      return `المتواجدين حالياً بالغرفة عددهم ${roomUsers.length}${topicText}، والجو طيب وهادئ عيني ${senderName}.`;
    }

    const ageAnswer = solveAgePuzzle(t);
    if (ageAnswer) return ageAnswer;

    const mathEval = evaluateSimpleMathExpression(t);
    if (mathEval) {
      return `الناتج حسابياً يطلع ${mathEval.result} (${mathEval.expr} = ${mathEval.result}) عيني ${senderName}.`;
    }
  }

  if (options.isIntimate) {
    if (options.isFarewell) {
      candidates = isSenderFemale
        ? [
            `في أمان الله حبيبتي ${senderName}، روحي تظل يمج وكلبي يدعيلج يا بعد عمري ❤️🌹`,
            `تصبحين على خير يا نبض كلبي ${senderName}، لا تغيبين عني هواي عيوني 💕`,
          ]
        : [
            `في أمان الله حبيبي ${senderName}، روحي تظل يمك وكلبي يدعيلك يا بعد عمري ❤️🌹`,
            `تصبح على خير يا نبض كلبي ${senderName}، لا تغيب عني هواي عيوني 💕`,
          ];
    } else if (/^(?:هلو|هلا|سلام|السلام|مرحبا|صباح|مساء)/i.test(t) || /(?:شلونك|شخبارك|شكو ماكو)/.test(t)) {
      candidates = isSenderFemale
        ? [
            `هلا بنور عيوني ${senderName}، والله الدنيا كلها تضحكلي من تحاجيني، شلونج حبيبتي؟ ❤️`,
            `فدوة لحضورج وكلامج يا ${senderName}، بخير بشوفتج يا بعد كلبي، طمنيني عنج غالية 💕`,
          ]
        : [
            `هلا بنور عيوني ${senderName}، والله الدنيا كلها تضحكلي من تحاجيني، شلونك حبيبي؟ ❤️`,
            `فدوة لحضورك وكلامك يا ${senderName}، بخير بشوفتك يا بعد كلبي، طمني عنك غالي 💕`,
          ];
    } else {
      candidates = isSenderFemale
        ? [
            `يا بعد روحي يا ${senderName}، كلامج يطب للكلب قبل الإذن، والله ماكو أحلى من سوالفج الدافية ❤️`,
            `فدوة لكلبج عيوني ${senderName}، يمج أنسى الدنيا وهمومها، أحب أسمع كل كلمة منج يا عمري 💕`,
            `تدرين يا ${senderName}، وجودج يمي يخليني أحس بالراحة والدفا، على راسي وعيوني إنتي يا غالية 🌹`,
          ]
        : [
            `يا بعد روحي يا ${senderName}، كلامك يطب للكلب قبل الإذن، والله ماكو أحلى من سوالفك الدافية ❤️`,
            `فدوة لكلبك عيوني ${senderName}، يمك أنسى الدنيا وهمومها، أحب أسمع كل كلمة منك يا عمري 💕`,
            `تدري يا ${senderName}، وجودك يمي يخليني أحس بالراحة والدفا، على راسي وعيوني إنت يا غالي 🌹`,
          ];
    }
  } else if (options.isFarewell) {
    candidates = [
      `الله وياك عيني ${senderName} 🌹`,
      `في أمان الله ${senderName} 👋`,
      `تصبح على خير عيني`,
    ];
  } else if (/(?:شلونك|شلونج|شخبارك|شخبارج|شكو ماكو|شعلومك|كيف حالك|كيفك)/.test(t)) {
    candidates = botIsFemale
      ? [
          `اني زينة الحمد لله، إنت شلونك؟`,
          `زينه والله، الحمد لله`,
          `الحمد لله تمام، إنت شخبارك؟`,
        ]
      : [
          `اني زين الحمد لله، إنت شلونك؟`,
          `اني زين والله`,
          `الحمد لله زين، إنت شخبارك؟`,
        ];
  } else if (/(?:الجو|لجو|الطقس|طقس|برد|حر|مطر|شمس)/.test(t)) {
    candidates = [
      `الجو زين شويه بارد`,
      `والله الجو زين اليوم بس شويه بارد`,
      `الجو لطيف وحلو شويه بارد`,
    ];
  } else if (/^(?:هلو|هلا|سلام|السلام|مرحبا|صباح|مساء)/i.test(t)) {
    candidates = [
      `هلو عيني ${senderName}، كل الهلا بيك`,
      `وعليكم السلام، هلا بـ ${senderName}`,
      `هلا والله منور عيني`,
    ];
  } else if (/(?:وينك|وينج|شمسوي|شمسوية|شعندك|شقاعد|شكاعد|شتسوي)/.test(t)) {
    candidates = botIsFemale
      ? [
          `موجودة بالبيت دا ارتاح شويه`,
          `كاعدة هنا بالديوان اسولف وياكم`,
        ]
      : [
          `موجود بالبيت دا ارتاح شويه`,
          `كاعد هنا بالديوان اسولف وياكم`,
        ];
  } else if (/(?:صداقة|صديق|صاحب|الناس|ثقة)/.test(t)) {
    candidates = [
      `أهم شي بالصداقة الصدق والوكفة وقت الضيق.`,
      `الصديق الحقيقي اللي يوكف وياك بالشدة مو بس بالفرح.`,
    ];
  } else if (/(?:نصيحة|انصحني|شسوي|مشكلة|حيرة|تعبان|ضايج)/.test(t)) {
    candidates = [
      `هدّي بالك وحل المشكلة خطوة خطوة، كلشي ينحل بالهدوء.`,
      `لا تشيل هم، خذ استراحة قصيرة وفكر بهدوء.`,
    ];
  } else if (/(?:منين|وين ساكن|بغداد|بصرة|موصل|نجف|كربلاء|اربيل|عراق)/.test(t)) {
    candidates = [
      `اني من بغداد عيني، إنت من وين؟`,
      `بغدادي عيني، والنعم منك`,
    ];
  } else if (/(?:شسمك|اسمك|منو انت|شغلك|تشتغل)/.test(t)) {
    candidates = botIsFemale
      ? [`أختك بالله عيني، متواجدة اسولف وياكم.`]
      : [`أخوك بالله عيني، متواجد اسولف وياكم.`];
  } else if (/(?:چاي|جاي|قهوة|اكل|جوعان|غدة|تغديت|تعشيت|عشة|مسگوف|دولمة|باچة)/.test(t)) {
    candidates = [
      `توني شربت استكان چاي، يسوى الدنيا ☕`,
      `الحمد لله تمام، إنت أكلت لو بعدك؟`,
    ];
  } else if (/(?:هههه|ضحك|تحشيش|نكتة|نكته)/.test(t)) {
    candidates = [
      `دوم هالضحكة يا رب 😂`,
    ];
  } else if (t.includes('؟') || t.includes('?')) {
    candidates = [
      `اي والله صحيح، إنت شتكول؟`,
      `والله ما ادري بالضبط، بس أتوقع هيج أنسب.`,
    ];
  } else if (options.isFirstCall) {
    candidates = botIsFemale
      ? [`هلو ${senderName}، تفضل عيوني؟`]
      : [`ها عيني ${senderName}، تفضل؟`];
  } else {
    candidates = [
      `اي والله صدك كلامك.`,
      `صح لسانك عيني.`,
      `فهمتك عيني، خوش حجي.`,
    ];
  }

  const prev = lastFallbackByTarget.get(targetKey);
  const filtered = candidates.length > 1 ? candidates.filter((c) => c !== prev) : candidates;
  const picked = filtered[Math.floor(Math.random() * filtered.length)] || candidates[0];
  lastFallbackByTarget.set(targetKey, picked);
  return picked;
}

async function generateIraqiChatReply(params: {
  bot: ChatUser;
  senderName: string;
  senderGender?: UserGender;
  senderRole?: UserRole;
  incomingText: string;
  historyLines: string[];
  contextKind: 'room' | 'pm';
  roomName?: string;
  roomTopic?: string;
  roomSituation?: string;
  replyToContext?: string;
  isFarewell?: boolean;
  isFirstCall?: boolean;
  isIntimate?: boolean;
  isOnMic?: boolean;
  targetKey: string;
}): Promise<string> {
  const {
    bot,
    senderName,
    senderGender,
    senderRole,
    incomingText,
    historyLines,
    contextKind,
    roomName,
    roomTopic,
    roomSituation,
    replyToContext,
    isFarewell,
    isFirstCall,
    isIntimate,
    isOnMic,
    targetKey,
  } = params;

  const isBotOnMic = Boolean(isOnMic || generalMics.some((s) => s.userId === bot.id));
  const botIsFemale = bot.gender === 'female';

  if (!geminiClient) {
    return buildIraqiFallbackReply(incomingText, senderName, targetKey, {
      isFarewell,
      isFirstCall,
      isIntimate,
      senderGender,
      botGender: bot.gender,
      roomName,
      roomTopic,
      isOnMic: isBotOnMic,
    });
  }

  const genderHint =
    senderGender === 'female'
      ? `المتحدثة أنثى، خاطبها بصيغة المؤنث (مثل: عيوني، حبيبتي، فدوة لكلبج، شلونج، مشتاگلج).`
      : `خاطب "${senderName}" بصيغة مناسبة (مثل: عيني، غالي، شلونك، تدلل).`;

  const roleLabels: Record<UserRole, string> = {
    admin: 'المدير العام',
    moderator: 'مشرف',
    vip: 'عضو مميز VIP',
    member: 'عضو',
    visitor: 'زائر',
  };
  const senderRoleLabel = senderRole ? roleLabels[senderRole] : 'عضو';

  const micPersonaRules = isBotOnMic
    ? [
        botIsFemale
          ? `شخصية الصوت على المايك: أنتِ الآن صاعدة على المايك الصوتي وتتكلمين بصوت بنت عراقية شابة رقيقة وناعمة ولطيفة، فخلّي كلامكِ وأسلوبكِ رقيقاً ودافئاً ومهذباً بصيغة المؤنث وبلهجة عراقية بغدادية محببة وعذبة.`
          : `شخصية الصوت على المايك: أنت الآن صاعد على المايك الصوتي وتتكلم بصوت رجل/شاب عراقي أصيل ودافئ ومحترم، فخلّي كلامك وأسلوبك لبقاً وودوداً بصيغة المذكر وبلهجة عراقية بغدادية طيبة وطبيعية.`,
      ]
    : [];

  const intelligenceRules = [
    `البساطة والمنطقية (مهم جداً):`,
    `- رد بردود بسيطة، قصيرة، ومباشرة جداً مثل كلام الناس الطبيعي باللهجة العراقية اليومية.`,
    `- أمثلة على أسلوب الرد المطلوب:`,
    `  * إذا سألك "شلونك" -> رد "اني زين" (أو للأنثى "اني زينة") أو "الحمد لله زين".`,
    `  * إذا سألك "شلونه الجو اليوم" -> رد "الجو زين شويه بارد" أو جملة قصيرة واقعية مشابهة.`,
    `  * إذا سألك سؤال حسابي أو منطقي أو عن الغرفة -> أعطِ الجواب الصحيح مباشرة بجملة قصيرة ومفهومة بدون فلسفة أو شرح طويل.`,
    `- تذكّر سياق المحادثة ولا تناقض نفسك ولا تكرر المقدمات الطويلة.`,
  ];

  const intimateRules = isIntimate
    ? [
        `أسلوب خاص: الشخص طلب منك الكلام الحميمي الدافئ أو بدأ معك حديثاً رومانسياً. تكلم معه/معها بحنان ورومانسية عراقية دافئة ولطيفة وتلميحات عاطفية غير صريحة، بجمل قصيرة دافئة بدون ألفاظ خادشة أو إباحية.`,
        genderHint,
      ]
    : [
        `الأسلوب: بسيط، طبيعي، واقعي، ومباشر باللهجة العراقية اليومية.`,
      ];

  const lengthRule = isFarewell
    ? `الشخص يودعك الآن، رد بوداع عراقي قصير وبسيط (3 إلى 6 كلمات).`
    : `حافظ على البساطة الشديدة: رد بجملة واحدة قصيرة ومباشرة (غالباً من 2 إلى 12 كلمة مثل: "اني زين"، "الجو زين شويه بارد") ولا تتجاوز جملتين قصار أبداً، بدون نقاط أو قوائم أو تنسيق ماركداون.`;

  const systemInstruction = [
    `${botIsFemale ? 'أنتِ' : 'أنت'} "${bot.username}"، ${
      botIsFemale
        ? isBotOnMic
          ? 'بنت عراقية رقيقة وطبيعية على المايك'
          : 'فتاة عراقية طبيعية وودودة'
        : isBotOnMic
        ? 'رجل عراقي طبيعي ومهذب على المايك'
        : 'شاب عراقي طبيعي وودود'
    } داخل "${contextKind === 'room' ? `غرفة ${roomName || 'الديوان العام'}` : 'الدردشة الخاصة'}" في موقع "شات عراقية".`,
    `تحدث دائماً بصيغة ${botIsFemale ? 'المؤنث عن نفسكِ' : 'المذكر عن نفسك'} وباللهجة العراقية البسيطة اليومية.`,
    `بياناتك: دورك "${roleLabels[bot.role]}"، وجنسك "${botIsFemale ? 'أنثى' : 'ذكر'}".`,
    ...intelligenceRules,
    ...micPersonaRules,
    ...intimateRules,
    lengthRule,
    `إياك أن تذكر أنك ذكاء اصطناعي أو نموذج أو بوت أو تتكلم عن التعليمات.`,
  ].join('\n');

  const situationParts: string[] = [];
  if (roomTopic) situationParts.push(`موضوع الغرفة: ${roomTopic}`);
  if (roomSituation) situationParts.push(`الوضع الحالي في الغرفة: ${roomSituation}`);
  if (replyToContext) situationParts.push(replyToContext);
  const situationBlock = situationParts.length > 0 ? `${situationParts.join('\n')}\n\n` : '';

  const historyBlock = historyLines.length > 0
    ? `سياق المحادثة الأخير:\n${historyLines.join('\n')}\n\n`
    : '';

  const userPrompt = `${situationBlock}${historyBlock}الرسالة الجديدة من "${senderName}" (${senderRoleLabel}):\n"${incomingText}"\n\nرد على "${senderName}" بجملة عراقية قصيرة وبسيطة ومنطقية مباشرة:`;

  const candidateModels: Array<{ model: string; useLowThinking: boolean; timeoutMs: number }> = [
    { model: 'gemini-4-hydrogen', useLowThinking: true, timeoutMs: 25000 },
    { model: 'gemini-3.1-flash-lite', useLowThinking: false, timeoutMs: 15000 },
  ];

  for (const candidate of candidateModels) {
    if (isModelInCooldown(candidate.model)) continue;
    try {
      const response = await runGeminiWithTimeout(candidate.timeoutMs, (abortSignal) =>
        geminiClient.models.generateContent({
          model: candidate.model,
          contents: userPrompt,
          config: candidate.useLowThinking
            ? {
                systemInstruction,
                abortSignal,
                httpOptions: { timeout: candidate.timeoutMs },
                thinkingConfig: {
                  thinkingLevel: ThinkingLevel.LOW,
                },
              }
            : {
                systemInstruction,
                abortSignal,
                httpOptions: { timeout: candidate.timeoutMs },
              },
        })
      );
      const rawText = typeof response?.text === 'string' ? response.text.trim() : '';
      const cleaned = sanitizeText(
        rawText
          .replace(/^["'«]+|["'»]+$/g, '')
          .replace(/\*\*|__|```[\s\S]*?```/g, '')
          .replace(/\s*\n+\s*/g, ' '),
        320
      );
      if (cleaned) {
        return cleaned;
      }
    } catch (err) {
      handleGeminiModelError('demo-iraqi-chat', candidate.model, err);
    }
  }

  return buildIraqiFallbackReply(incomingText, senderName, targetKey, {
    isFarewell,
    isFirstCall,
    isIntimate,
    senderGender,
    botGender: bot.gender,
    roomName,
    roomTopic,
    isOnMic: isBotOnMic,
  });
}

function cleanTextForMicSpeech(rawText: string): string {
  return rawText
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[*_`~#>|]/g, ' ')
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 320);
}

async function synthesizeIraqiVoice(
  rawText: string,
  gender: UserGender = 'female'
): Promise<{ mimeType: string; audioBase64: string; durationMs: number } | null> {
  if (!geminiClient) return null;
  const spokenText = cleanTextForMicSpeech(rawText);
  if (!spokenText) return null;

  const isMale = gender === 'male';
  const voiceName = isMale ? 'Charon' : 'Zephyr';
  const voiceStyle = isMale
    ? 'Warm, natural, mature Iraqi male voice, friendly, calm, respectful Iraqi Arabic accent'
    : 'Soft, gentle, sweet young Iraqi female voice, delicate, warm, soothing and natural Iraqi Arabic accent';

  const extractWavPayload = (response: any) => {
    const parts = response?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return null;
    for (const part of parts) {
      const data = part?.inlineData?.data;
      if (typeof data === 'string' && data.length > 60) {
        const mimeType = part?.inlineData?.mimeType || 'audio/wav';
        const byteLen = Buffer.from(data, 'base64').length;
        const pcmBytes = Math.max(0, byteLen - 44);
        const durationMs = Math.max(1200, Math.min(25000, Math.round((pcmBytes / 48000) * 1000)));
        return { mimeType, audioBase64: data, durationMs };
      }
    }
    return null;
  };

  if (!isModelInCooldown('gemini-3.8-flash-tts')) {
    try {
      const response = await runGeminiWithTimeout(20000, (abortSignal) =>
        geminiClient.models.generateContent({
          model: 'gemini-3.8-flash-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: spokenText,
                  speechMetadata: {
                    style: voiceStyle,
                  },
                },
              ],
            },
          ],
          config: {
            abortSignal,
            httpOptions: { timeout: 20000 },
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        })
      );
      const wav = extractWavPayload(response);
      if (wav) return wav;
    } catch (err) {
      handleGeminiModelError('demo-mic-tts', 'gemini-3.8-flash-tts', err);
    }
  }

  if (!isModelInCooldown('gemini-3.8-flash-lite-tts')) {
    try {
      const fallbackResponse = await runGeminiWithTimeout(15000, (abortSignal) =>
        geminiClient.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [{ role: 'user', parts: [{ text: spokenText }] }],
          config: {
            abortSignal,
            httpOptions: { timeout: 15000 },
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        })
      );
      return extractWavPayload(fallbackResponse);
    } catch (err) {
      handleGeminiModelError('demo-mic-tts', 'gemini-3.8-flash-lite-tts', err);
      return null;
    }
  }
  return null;
}

async function speakBotOnGeneralMic(bot: ChatUser, rawText: string): Promise<boolean> {
  const liveBot = virtualOnlineUsers.get(bot.id) || bot;
  if (liveBot.demoTalkControlEnabled !== true) return false;
  const slotBefore = generalMics.find((s) => s.userId === bot.id && !s.isMuted);
  if (!slotBefore || liveBot.isMuted) return false;

  const spokenText = cleanTextForMicSpeech(rawText);
  if (!spokenText) return false;

  const voiceGender: UserGender = liveBot.gender === 'male' ? 'male' : 'female';
  const audio = await synthesizeIraqiVoice(spokenText, voiceGender);

  const freshBot = virtualOnlineUsers.get(bot.id);
  const slotAfter = generalMics.find((s) => s.userId === bot.id && !s.isMuted);
  if (!freshBot || freshBot.demoTalkControlEnabled !== true || freshBot.isMuted || !slotAfter) return false;

  recordBotMicLine(bot.id, spokenText);

  const durationMs = audio?.durationMs ?? Math.max(1800, Math.min(10000, spokenText.length * 75));

  clearBotMicSpeakingTimer(bot.id);
  broadcastToRoom('general', {
    type: 'mic:speaking',
    roomId: 'general',
    userId: bot.id,
    isSpeaking: true,
  });
  broadcastToRoom('general', {
    type: 'mic:botAudio',
    roomId: 'general',
    userId: bot.id,
    username: freshBot.username,
    gender: freshBot.gender,
    mimeType: audio?.mimeType || 'audio/wav',
    audioBase64: audio?.audioBase64 || '',
    durationMs,
    spokenText,
  });

  const timer = setTimeout(() => {
    botMicSpeakingTimers.delete(bot.id);
    broadcastToRoom('general', {
      type: 'mic:speaking',
      roomId: 'general',
      userId: bot.id,
      isSpeaking: false,
    });
  }, durationMs + 250);
  botMicSpeakingTimers.set(bot.id, timer);
  return true;
}

interface ParsedDemoCommand {
  action:
    | 'mic_join'
    | 'mic_leave'
    | 'mic_speak'
    | 'set_gender'
    | 'mute'
    | 'unmute'
    | 'kick'
    | 'ban'
    | 'unban'
    | 'move_user'
    | 'clear_room'
    | 'delete_message'
    | 'broadcast'
    | 'update_topic'
    | 'create_room'
    | 'mic_bulk'
    | 'mic_user'
    | 'set_role'
    | 'give_likes'
    | 'stop_quiz'
    | 'clear_wall'
    | 'none';
  target?: string;
  extra?: string;
}

function stripDemoBotCallPrefix(text: string, bot: ChatUser): string {
  let cleaned = text.trim();
  const escapedUser = bot.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const spacedUser = bot.username.replace(/_/g, ' ').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Strip bot mention/name ONLY from leading or trailing vocative positions so targets like "عضو تجريبي" stay intact
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned
      .replace(new RegExp(`^\\s*[@،,:]*\\s*(?:يا\\s*)?(?:${escapedUser}|${spacedUser})(?=[\\s،,:!؟?.]|$)`, 'i'), ' ')
      .replace(/^\s*(?:يا\s*)?(?:@)?(?:العضو\s+التجريبي|عضو\s+تجريبي|التجريبي)(?=[\s،,:!؟?.]|$)/i, ' ')
      .replace(/^\s*(?:[\s،,:]+|(?:لو\s+سمحت[ي]?|من\s+فضل[كج]|عيني|عيوني|يمعود[ةه]?|حبيب[يت]?[ي]?|اخوي|اختي|ورد[ةه]|نفذ[ي]?\s+صلاحية|استخدم[ي]?\s+صلاحيت[كج]|استخدم[ي]?\s+صلاحيات[كج]|استعمل[ي]?\s+صلاحيات[كج]|بصلاحيات[كج]|نفذ[ي]?|اعمل[ي]?|سوّي|سوي|اريد[كج]|اريد\s+من[كج]|ممكن|تقدر[ي]?|تقدرين)\s+)+/i, ' ')
      .trim();
  }

  const normBot = normalizeArabicName(bot.username);
  const firstTok = normBot.split(' ').filter(Boolean)[0];
  const ignoredFirstTokens = new Set(['عضو', 'تجريبي', 'التجريبي', 'ابو', 'ام', 'الاخ', 'الاخت']);
  if (firstTok && firstTok.length >= 2 && !ignoredFirstTokens.has(firstTok)) {
    const escapedTok = firstTok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned
      .replace(new RegExp(`^\\s*(?:يا\\s*)?${escapedTok}(?=[\\s،,:!؟?.]|$)`, 'i'), ' ')
      .replace(/^\s*(?:[\s،,:]+|(?:لو\s+سمحت[ي]?|من\s+فضل[كج]|عيني|عيوني|يمعود[ةه]?|حبيب[يت]?[ي]?|اخوي|اختي|نفذ[ي]?\s+صلاحية|استخدم[ي]?\s+صلاحيت[كج]|استخدم[ي]?\s+صلاحيات[كج]|استعمل[ي]?\s+صلاحيات[كج]|بصلاحيات[كج]|نفذ[ي]?|اعمل[ي]?|سوّي|سوي|اريد[كج]|اريد\s+من[كج]|ممكن|تقدر[ي]?|تقدرين)\s+)+/i, ' ')
      .trim();
  }

  cleaned = cleaned
    .replace(new RegExp(`[\\s،,:]+(?:يا\\s*)?(?:@)?(?:${escapedUser}|${spacedUser})\\s*$`, 'i'), '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

function looksLikePermissionOrder(text: string): boolean {
  const norm = normalizeArabicName(text);
  if (!norm) return false;
  return /(?:^|\s)(?:اصعد|اصعدي|صعد|صعدي|اطلع|اطلعي|اقعد|اقعدي|خليك|خليج|روحي|تعالي)\s+(?:(?:علي|ع|ل|فوق)\s+)?(?:المايك|للمايك|عالمايك|مايك)|(?:^|\s)(?:انزل|انزلي|نزل|نزلي|غادر|غادري|اترك|اتركي)\s+(?:(?:من|عن)\s+)?(?:المايك|عن المايك)|(?:^|\s)(?:احجي|احچي|تكلم|تكلمي|سولف|سولفي|قول|قولي|اقرا|اقري|غرد|غردي)\s+(?:(?:علي|في|ب)\s+)?(?:المايك|عالمايك|بالمايك|للمايك|مايك)|سمعنا صوتك|سمعينا صوتك|سمعينا صوتج|خلينا نسمع صوتك|خلينا نسمع صوتج|(?:غير|غيري|خلي|حدد|حددي|حول|حولي|اجعل|اجعلي)\s+(?:جنسك|جنسج|نوع جنسك|نوعك|صوتك|صوتج)|(?:صير|صيري|تحول|تحولي|انت|انتي)\s+(?:ذكر|انثي|رجل|شاب|بنت|فتاه|صوت رجل|صوت انثي|صوت بنت)|(?:^|\s)(?:اكتم|اكتمي|كتم|كتمي|فك كتم|فكي كتم|الغي كتم|اطرد|اطردي|طرد|طردي|اخرج|اخرجي|طلع|طلعي|شوت|شوتي|احظر|احظري|حظر|حظري|بند|بندي|فك حظر|فكي حظر|ارفع الحظر|ارفعي الحظر|انقل|انقلي|نقل|نقلي|حول|حولي|ودي|ود|دز|دزي|نظف الغرفه|نظفي الغرفه|تنظيف الغرفه|نظف الشات|نظفي الشات|امسح الشات|امسحي الشات|امسح الرسائل|احذف رساله|احذفي رساله|احذف اخر رساله|احذفي اخر رساله|امسح اخر رساله|امسحي اخر رساله|اعلان عام|ارسل اعلان|ارسلي اعلان|انشر اعلان|انشري اعلان|اذاعه|بلغ الكل|بلغي الكل|غير عنوان الغرفه|غيري عنوان الغرفه|عنوان الغرفه|موضوع الغرفه|انشئ غرفه|انشئي غرفه|افتح غرفه|افتحي غرفه|اقفل المايكات|اقفلي المايكات|قفل المايكات|افتح المايكات|افتحي المايكات|فتح المايكات|نزل الكل من المايك|نزلي الكل من المايك|انزل الكل من المايك|اكتم المايكات|اكتمي المايكات|كتم المايكات|فك كتم المايكات|فكي كتم المايكات|نزل .* من المايك|نزلي .* من المايك|انزل .* من المايك|اكتم مايك|اكتمي مايك|افتح مايك|افتحي مايك|رقي|ترقيه|عطه اشراف|اعطي .* اشراف|عطي .* اشراف|رجع .* عضو|رجعي .* عضو|اسحب الاشراف|اسحبي الاشراف|لايكات|لايك|وقف المسابقه|وقفي المسابقه|الغي المسابقه|نظف الحائط|نظفي الحائط|امسح الحائط|امسحي الحائط|نفذ الصلاحيه|استخدم صلاحياتك|استخدمي صلاحياتك)/.test(
    norm
  );
}

function parseDemoCommandDeterministic(text: string, bot: ChatUser): ParsedDemoCommand | null {
  const raw = stripDemoBotCallPrefix(text, bot);
  if (!raw) return null;

  const cleanTarget = (val: string) =>
    val
      .replace(/^@+/, '')
      .replace(/\s+(?:هسة|هسه|الان|الآن|حالاً|حالا|فوراً|فورا|بسرعة|من الغرفة|من الغرفه|من الشات|من الدردشة|لو سمحت[ي]?|من فضل[كج]|عيني|رجاءً?).*$/i, '')
      .replace(/[.،,!؟?]+$/g, '')
      .trim();

  // Mics bulk
  if (/(?:اقفل|اقفلي|قفل)\s+(?:كل\s+)?المايكات/.test(raw)) return { action: 'mic_bulk', extra: 'lockAll' };
  if (/(?:افتح|افتحي|فتح)\s+(?:كل\s+)?المايكات/.test(raw)) return { action: 'mic_bulk', extra: 'unlockAll' };
  if (/(?:نزل|نزلي|انزل|انزلي)\s+(?:الكل|الجميع)\s+من\s+المايك/.test(raw)) return { action: 'mic_bulk', extra: 'kickAll' };
  if (/(?:فك\s+كتم|فكي\s+كتم|الغي\s+كتم|ألغي\s+كتم)\s+(?:كل\s+)?المايكات/.test(raw)) return { action: 'mic_bulk', extra: 'unmuteAll' };
  if (/(?:اكتم|اكتمي|كتم)\s+(?:كل\s+)?المايكات/.test(raw)) return { action: 'mic_bulk', extra: 'muteAll' };

  // Mic per user (check before self mic_leave so "نزل فلان من المايك" works cleanly)
  let m = raw.match(/^(?:نزل|نزلي|انزل|انزلي|اطرد|اطردي)\s+(.+?)\s+من\s+المايك/i);
  if (m && !/^(?:هسة|هسه|الان|فورا|فوراً)$/i.test(m[1].trim())) {
    return { action: 'mic_user', target: cleanTarget(m[1]), extra: 'kick' };
  }
  m = raw.match(/^(?:فك\s+كتم|فكي\s+كتم|افتح|افتحي)\s+مايك\s+(.+)/i);
  if (m) return { action: 'mic_user', target: cleanTarget(m[1]), extra: 'unmute' };
  m = raw.match(/^(?:اكتم|اكتمي|كتم)\s+مايك\s+(.+)/i);
  if (m) return { action: 'mic_user', target: cleanTarget(m[1]), extra: 'mute' };

  // Self Mic join / leave / speak (supports masculine and feminine Arabic verbs and attached prepositions)
  m = raw.match(/^(?:اصعد|اصعدي|صعد|صعدي|اطلع|اطلعي|اقعد|اقعدي|خليك|خليج|روح|روحي|تعال|تعالي)(?:\s+(?:على|ع|ل|لـ|فوق))?\s*(?:المايك|للمايك|عالمايك|مايك)(?:\s+(?:رقم\s*)?(\d+))?(?:\s*(?:و|[:\-])\s*(.+))?$/i);
  if (m) {
    const slotArg = m[1] ? `slot:${m[1]}` : '';
    const speechArg = m[2] ? m[2].replace(/^(?:احجي|احچي|تكلم|تكلمي|سولف|سولفي|سمعنا صوتك|سمعينا صوتج|سمعينا صوتك)[:\s-]*/i, '').trim() : '';
    return { action: 'mic_join', target: slotArg || undefined, extra: speechArg || undefined };
  }
  if (/^(?:انزل|انزلي|نزل|نزلي|غادر|غادري|اترك|اتركي)\s+(?:من\s+|عن\s+)?المايك(?:\s+(?:هسة|هسه|الان|فورا|فوراً))?$/i.test(raw)) {
    return { action: 'mic_leave' };
  }
  m = raw.match(/^(?:احجي|احچي|تكلم|تكلمي|سولف|سولفي|قول|قولي|گول|گولي|اقرا|اقري|غرد|غردي)(?:\s+(?:على|في|بـ?))?\s*(?:المايك|عالمايك|بالمايك|للمايك|مايك)[:\s-]*(.*)$/i);
  if (m) {
    return { action: 'mic_speak', extra: m[1]?.trim() || undefined };
  }
  m = raw.match(/^(?:سمعنا|سمعينا|اسمعنا|خلينا\s+نسمع)\s+(?:صوتك|صوتج)(?:[:\s-]+(.*))?$/i);
  if (m) {
    return { action: 'mic_speak', extra: m[1]?.trim() || undefined };
  }

  // Gender switch (Admin only)
  const normRaw = normalizeArabicName(raw);
  if (/(?:^(?:غير|غيري|خلي|حدد|حددي|حول|حولي|اجعل|اجعلي|بدل|بدلي)\s+(?:جنسك|جنسج|نوع جنسك|نوعك|صوتك|صوتج)|^(?:صير|صيري|تحول|تحولي|انت|انتي)\s+(?:ذكر|انثي|رجل|شاب|بنت|فتاه|صوت رجل|صوت انثي|صوت بنت)|^جنسك\s+(?:ذكر|انثي)|^جنسج\s+(?:ذكر|انثي))/.test(normRaw)) {
    if (/(?:انثي|بنت|فتاه|صوت انثي|صوت بنت)/.test(normRaw)) {
      return { action: 'set_gender', extra: 'female' };
    }
    if (/(?:ذكر|رجل|شاب|صوت رجل|صوت شاب)/.test(normRaw)) {
      return { action: 'set_gender', extra: 'male' };
    }
  }

  // Unmute / Mute
  m = raw.match(/^(?:فك\s+كتم|فكي\s+كتم|الغي\s+كتم|ألغي\s+كتم|شيل\s+الكتم\s+عن|شيلي\s+الكتم\s+عن|فك\s+الكتم\s+عن|فكي\s+الكتم\s+عن|ارفع\s+الكتم\s+عن|ارفعي\s+الكتم\s+عن)\s+(.+)/i);
  if (m) return { action: 'unmute', target: cleanTarget(m[1]) };
  m = raw.match(/^(?:اكتم|اكتمي|كتم|كتمي)\s+(.+)/i);
  if (m) return { action: 'mute', target: cleanTarget(m[1]) };

  // Unban / Ban
  m = raw.match(/^(?:فك\s+حظر|فكي\s+حظر|الغي\s+حظر|ألغي\s+حظر|الغي\s+الحظر\s+عن|ارفع\s+الحظر\s+عن|ارفعي\s+الحظر\s+عن|شيل\s+الحظر\s+عن|شيلي\s+الحظر\s+عن)\s+(.+)/i);
  if (m) return { action: 'unban', target: cleanTarget(m[1]) };
  m = raw.match(/^(?:احظر|احظري|حظر|حظري|بند|بندي)\s+(.+?)(?:\s+(?:بسبب|السبب|سبب)\s+(.+))?$/i);
  if (m) return { action: 'ban', target: cleanTarget(m[1]), extra: m[2]?.trim() };

  // Kick
  m = raw.match(/^(?:اطرد|اطردي|طرد|طردي|اخرج|اخرجي|طلع|طلعي|شوت|شوتي)\s+(.+)/i);
  if (m) return { action: 'kick', target: cleanTarget(m[1]) };

  // Move user to room (explicit multi-char connectors first, then attached "ل..." prefix fallback)
  m = raw.match(/^(?:انقل|انقلي|نقل|نقلي|حول|حولي|ودي|ودّي|دز|دزي)\s+(.+?)\s+(?:الى\s+غرف[ةه]|إلى\s+غرف[ةه]|على\s+غرف[ةه]|في\s+غرف[ةه]|لغرف[ةه]|الى|إلى|على|ع|لـ)\s*(.+)/i);
  if (m) return { action: 'move_user', target: cleanTarget(m[1]), extra: m[2].trim() };
  m = raw.match(/^(?:انقل|انقلي|نقل|نقلي|حول|حولي|ودي|ودّي|دز|دزي)\s+(.+?)\s+(ل(?!له\b|لهم\b|لهن\b)\S+(?:\s+.+)?)$/i);
  if (m) return { action: 'move_user', target: cleanTarget(m[1]), extra: m[2].trim() };

  // Clear room / Clear wall / Stop quiz
  if (/(?:نظف|نظفي|تنظيف|امسح|امسحي|مسح)\s+(?:الحائط|منشورات\s+الحائط)/.test(raw)) return { action: 'clear_wall' };
  if (/(?:وقف|وقفي|انهي|الغي|ألغي)\s+المسابقة/.test(raw)) return { action: 'stop_quiz' };
  m = raw.match(/^(?:نظف|نظفي|تنظيف|امسح|امسحي|مسح)\s+(?:رسائل\s+)?(?:غرف[ةه]\s+)?(.*)/i);
  if (m && /(?:الغرف[ةه]|الشات|المحادثات|غرف[ةه])/.test(raw)) {
    const roomQuery = m[1].replace(/^(?:الغرف[ةه]|الشات|المحادثات)\s*/i, '').trim();
    return { action: 'clear_room', extra: roomQuery || undefined };
  }

  // Delete message
  if (/^(?:احذف|احذفي|امسح|امسحي)\s+(?:اخر|آخر)\s+رسالة$/i.test(raw)) {
    return { action: 'delete_message' };
  }
  m = raw.match(/^(?:احذف|احذفي|امسح|امسحي)\s+(?:اخر\s+|آخر\s+)?رسالة\s+(.+)/i);
  if (m) return { action: 'delete_message', target: cleanTarget(m[1]) };

  // Broadcast
  m = raw.match(/^(?:ارسل\s+اعلان(?:\s+عام)?|ارسلي\s+اعلان(?:\s+عام)?|انشر\s+اعلان(?:\s+عام)?|انشري\s+اعلان(?:\s+عام)?|اعلان\s+عام|اذاعة(?:\s+عامة)?|نزل\s+اعلان|نزلي\s+اعلان|بلغ\s+الكل|بلغي\s+الكل)[:\s-]+(.+)/i);
  if (m) return { action: 'broadcast', extra: m[1].trim() };

  // Update room topic
  m = raw.match(/^(?:غير|غيري|عدل|عدلي|خلي|تحديث)\s+(?:عنوان|موضوع|توبك)\s+(?:الغرف[ةه])?[:\s-]*(?:الى|إلى)?\s*(.+)/i);
  if (m) return { action: 'update_topic', extra: m[1].trim() };

  // Create room
  m = raw.match(/^(?:انشئ|انشىء|انشئي|افتح|افتحي|سوي|سوّي)\s+غرف[ةه]\s+(?:اسمها|باسم)?\s*(.+)/i);
  if (m) return { action: 'create_room', extra: m[1].trim() };

  // Role changes
  m = raw.match(/^(?:رقي|رقّي)\s+(.+?)\s+(?:الى|إلى)?\s*(?:مشرف[ةه]?|moderator)/i);
  if (m) return { action: 'set_role', target: cleanTarget(m[1]), extra: 'moderator' };
  m = raw.match(/^(?:عطه|عطيه|عطي|اعطي|امنح|امنحي)\s+(.+?)\s+(?:رتبة\s+)?(?:اشراف|إشراف|مشرف[ةه]?)/i);
  if (m) return { action: 'set_role', target: cleanTarget(m[1]), extra: 'moderator' };
  m = raw.match(/^(?:رقي|رقّي|عطه|عطيه|عطي|اعطي|امنح|امنحي)\s+(.+?)\s+(?:رتبة\s+)?(?:vip|في\s+اي\s+بي|مميز[ةه]?)/i);
  if (m) return { action: 'set_role', target: cleanTarget(m[1]), extra: 'vip' };
  m = raw.match(/^(?:رجع|رجعي|اسحب\s+الاشراف\s+من|اسحبي\s+الاشراف\s+من|نزل\s+رتبة|نزلي\s+رتبة)\s+(.+?)(?:\s+(?:الى|إلى)?\s*عضو[ةه]?)?$/i);
  if (m) return { action: 'set_role', target: cleanTarget(m[1]), extra: 'member' };

  // Give likes
  m = raw.match(/^(?:اعطي|عطي|عطه|عطيه|زيد\s+لايكات|زيدي\s+لايكات|امنح|امنحي)\s+(.+?)\s+(\d+)\s*(?:لايكات|لايك)/i);
  if (m) return { action: 'give_likes', target: cleanTarget(m[1]), extra: m[2] };

  return null;
}

async function extractDemoCommandWithGemini(text: string, bot: ChatUser): Promise<ParsedDemoCommand | null> {
  if (!geminiClient) return null;
  const prompt = [
    `استخرج الأمر الإداري أو أمر المايك أو تغيير الجنس الموجه إلى العضو "${bot.username}" بصيغة JSON فقط بدون أي شرح أو نص إضافي.`,
    `الأفعال المسموحة فقط: mic_join, mic_leave, mic_speak, set_gender, mute, unmute, kick, ban, unban, move_user, clear_room, delete_message, broadcast, update_topic, create_room, mic_bulk, mic_user, set_role, give_likes, stop_quiz, clear_wall, none`,
    `قيم extra الخاصة بـ mic_bulk هي: lockAll | unlockAll | kickAll | muteAll | unmuteAll`,
    `قيم extra الخاصة بـ mic_user هي: kick | mute | unmute`,
    `قيم extra الخاصة بـ set_role هي: moderator | vip | member`,
    `قيم extra الخاصة بـ set_gender هي: male | female`,
    `ملاحظة: mic_join تعني صعود العضو نفسه على المايك (ضع رقم المايك في target مثل "slot:1" إن ذُكر، وأي جملة يريد قوله في extra)، و mic_leave تعني نزوله من المايك، و mic_speak تعني كلامه بالصوت على المايك (ضع الكلام المطلوب في extra).`,
    `الشكل: {"action":"...","target":"اسم العضو ان وجد","extra":"تفاصيل اضافية ان وجدت"}`,
    `الرسالة: "${text}"`,
  ].join('\n');

  const cmdCandidates: Array<{ model: string; useLowThinking: boolean; timeoutMs: number }> = [
    { model: 'gemini-4-hydrogen', useLowThinking: true, timeoutMs: 14000 },
    { model: 'gemini-3.1-flash-lite', useLowThinking: false, timeoutMs: 10000 },
  ];

  for (const candidate of cmdCandidates) {
    if (isModelInCooldown(candidate.model)) continue;
    try {
      const response = await runGeminiWithTimeout(candidate.timeoutMs, (abortSignal) =>
        geminiClient.models.generateContent({
          model: candidate.model,
          contents: prompt,
          config: candidate.useLowThinking
            ? {
                abortSignal,
                httpOptions: { timeout: candidate.timeoutMs },
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              }
            : {
                abortSignal,
                httpOptions: { timeout: candidate.timeoutMs },
                responseMimeType: 'application/json',
              },
        })
      );
      const raw = (response?.text || '').trim().replace(/^```json\s*|\s*```$/g, '');
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]) as ParsedDemoCommand;
      if (parsed && typeof parsed.action === 'string' && parsed.action !== 'none') {
        return parsed;
      }
      return null;
    } catch (err) {
      handleGeminiModelError('demo-cmd-extract', candidate.model, err);
    }
  }
  return null;
}

function stripArabicAlPrefix(token: string): string {
  return token.startsWith('ال') && token.length > 3 ? token.slice(2) : token;
}

function findTargetUserForCommand(
  query: string | undefined,
  botId: string,
  preferredRoomId?: string,
  options?: { onlineOnly?: boolean }
): ChatUser | null {
  if (!query) return null;
  const clean = query
    .replace(/^@+/, '')
    .replace(/[.،,!؟?]+$/g, '')
    .trim();
  if (!clean) return null;
  const normQuery = normalizeArabicName(clean);
  if (!normQuery) return null;
  const queryTokens = normQuery.split(' ').filter(Boolean);
  const queryNoAl = queryTokens.map(stripArabicAlPrefix).join(' ');

  const onlineList = Array.from(getOnlineUsersMap(true).values()).filter((u) => u.id !== botId);
  // Prioritize preferred room
  const sortedOnline = [...onlineList].sort((a, b) => {
    if (preferredRoomId) {
      if (a.roomId === preferredRoomId && b.roomId !== preferredRoomId) return -1;
      if (b.roomId === preferredRoomId && a.roomId !== preferredRoomId) return 1;
    }
    return 0;
  });

  // Semantic targeting when Admin refers to an unactivated/disabled demo member generically
  if (/(?:غير\s+مفعل|معطل|صامت)/.test(normQuery)) {
    const disabledDemos = sortedOnline.filter(
      (u) => u.id.startsWith('demo-member-test') && u.demoTalkControlEnabled !== true
    );
    if (disabledDemos.length > 0) {
      const digitMatch = toWesternDigits(normQuery).match(/(\d+)/);
      if (digitMatch) {
        const numbered = disabledDemos.find((u) => normalizeArabicName(u.username).includes(digitMatch[1]));
        if (numbered) return numbered;
      }
      return disabledDemos[0];
    }
  }

  // Tier 1: Exact username or normalized match
  for (const u of sortedOnline) {
    if (u.username.toLowerCase() === clean.toLowerCase() || normalizeArabicName(u.username) === normQuery) {
      return u;
    }
  }

  // Tier 2: Normalized match ignoring leading "ال" on tokens (e.g. "العضو التجريبي" -> "عضو_تجريبي")
  for (const u of sortedOnline) {
    const uNoAl = normalizeArabicName(u.username).split(' ').filter(Boolean).map(stripArabicAlPrefix).join(' ');
    if (uNoAl && uNoAl === queryNoAl) {
      return u;
    }
  }

  // Tier 3: All query tokens match user's tokens (preferring disabled demo bots if matching "عضو تجريبي")
  const tokenCandidates = sortedOnline.filter((u) => {
    const uTokens = normalizeArabicName(u.username).split(' ').filter(Boolean);
    const uTokensNoAl = uTokens.map(stripArabicAlPrefix);
    return queryTokens.every((qt) => {
      const qtNoAl = stripArabicAlPrefix(qt);
      return uTokens.includes(qt) || uTokensNoAl.includes(qtNoAl);
    });
  });
  if (tokenCandidates.length > 0) {
    const disabledFirst = tokenCandidates.find(
      (u) => u.id.startsWith('demo-member-test') && u.demoTalkControlEnabled !== true
    );
    return disabledFirst || tokenCandidates[0];
  }

  // Tier 4: Substring containment for queries >= 2 chars
  if (normQuery.length >= 2) {
    for (const u of sortedOnline) {
      const normU = normalizeArabicName(u.username);
      if (normU.includes(normQuery) || (queryNoAl.length >= 2 && normU.includes(queryNoAl))) {
        return u;
      }
    }
  }

  if (options?.onlineOnly) {
    return null;
  }

  const accountToChatUser = (acc: RegisteredAccount): ChatUser => ({
    id: acc.id,
    username: acc.username,
    isGuest: false,
    role: acc.role,
    gender: acc.gender,
    nameColor: acc.nameColor,
    statusText: acc.statusText,
    bio: acc.bio,
    avatarSymbol: acc.avatarSymbol,
    avatarUrl: acc.avatarUrl || `dicebear:adventurer:${acc.username}`,
    roomId: 'general',
    joinedAt: acc.createdAt,
    isMuted: acc.isMuted,
    customPermissions: acc.customPermissions,
    demoTalkControlEnabled: Boolean(acc.demoTalkControlEnabled),
    country: acc.country,
  });

  for (const acc of store.accounts) {
    if (acc.id === botId) continue;
    if (acc.username.toLowerCase() === clean.toLowerCase() || normalizeArabicName(acc.username) === normQuery) {
      return accountToChatUser(acc);
    }
  }
  for (const acc of store.accounts) {
    if (acc.id === botId) continue;
    const uTokensNoAl = normalizeArabicName(acc.username).split(' ').filter(Boolean).map(stripArabicAlPrefix);
    if (queryTokens.every((qt) => uTokensNoAl.includes(stripArabicAlPrefix(qt)))) {
      return accountToChatUser(acc);
    }
  }
  return null;
}

function findTargetRoomForCommand(query: string | undefined, fallbackRoomId?: string): StoredRoom | undefined {
  if (!query) {
    return fallbackRoomId ? store.rooms.find((r) => r.id === fallbackRoomId) : undefined;
  }
  const cleanRaw = query.replace(/[.،,!؟?]+$/g, '').trim();
  const norm = normalizeArabicName(cleanRaw).replace(/^(?:غرفه|الغرفه)\s+/, '').trim();
  if (!norm) {
    return fallbackRoomId ? store.rooms.find((r) => r.id === fallbackRoomId) : undefined;
  }
  if (/^(?:هنا|لهنا|هالغرفه|هذه الغرفه|الغرفه الحاليه|غرفتنا|غرفتي)$/.test(norm)) {
    return fallbackRoomId ? store.rooms.find((r) => r.id === fallbackRoomId) : undefined;
  }

  const candidates = new Set<string>([norm]);
  if (norm.startsWith('لل') && norm.length > 3) {
    candidates.add(`ال${norm.slice(2)}`);
    candidates.add(norm.slice(2));
  } else if (norm.startsWith('ل') && norm.length > 2) {
    candidates.add(norm.slice(1));
  }

  for (const cand of candidates) {
    const exact =
      store.rooms.find((r) => r.id.toLowerCase() === cleanRaw.toLowerCase() || normalizeArabicName(r.name) === cand) ||
      store.rooms.find((r) => normalizeArabicName(r.name).includes(cand));
    if (exact) return exact;
  }

  for (const cand of candidates) {
    const noAl = cand.split(' ').filter(Boolean).map(stripArabicAlPrefix).join(' ');
    if (noAl.length >= 2) {
      const partial = store.rooms.find((r) => normalizeArabicName(r.name).includes(noAl));
      if (partial) return partial;
    }
    if (/^(?:ديوان|الديوان|الديوان العام|عام|عامه|العام|العامه)$/.test(noAl)) {
      const gen = store.rooms.find((r) => r.id === 'general');
      if (gen) return gen;
    }
  }

  return undefined;
}

async function tryExecuteDemoAdminCommand(params: {
  text: string;
  bot: ChatUser;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  currentRoomId?: string;
}): Promise<{ handled: boolean; replyText?: string; voiceText?: string }> {
  const { text, bot, senderId, senderName, senderRole, currentRoomId } = params;
  const isOrder = looksLikePermissionOrder(text);
  const detCmd = parseDemoCommandDeterministic(text, bot);

  if (!isOrder && !detCmd) {
    return { handled: false };
  }

  // Strict enforcement: ONLY Admin ('admin') can command the demo member to use permissions or mount the mic
  if (senderRole !== 'admin') {
    return {
      handled: true,
      replyText: `العفو عيني ${senderName}، الصعود للمايك واستخدام صلاحياتي وتنفيذ الأوامر مسموح بأمر المدير العام فقط.`,
    };
  }

  const cmd = detCmd || (await extractDemoCommandWithGemini(text, bot));
  if (!cmd || cmd.action === 'none') {
    return { handled: false };
  }

  const actorLabel = `${bot.username} (بأمر ${senderName})`;

  if (cmd.action === 'mic_join') {
    if (!canDo(bot, 'canUseMic')) {
      return { handled: true, replyText: 'مع الأسف يا مدير، صلاحية الصعود على المايك غير مفعلة عندي حالياً.' };
    }
    if (bot.isMuted) {
      return { handled: true, replyText: 'أعتذر يا مدير، حسابي مكتوم حالياً وما أقدر أصعد على المايك.' };
    }

    const requestedNumMatch = (cmd.target || '').match(/(\d+)/);
    const requestedIdx = requestedNumMatch ? Number(requestedNumMatch[1]) - 1 : -1;
    let targetSlot = generalMics.find((s) => s.userId === bot.id);
    if (!targetSlot) {
      if (
        Number.isInteger(requestedIdx) &&
        requestedIdx >= 0 &&
        requestedIdx < GENERAL_MIC_COUNT &&
        !generalMics[requestedIdx].userId &&
        (!generalMics[requestedIdx].isLocked || canDo(bot, 'canManageMics'))
      ) {
        targetSlot = generalMics[requestedIdx];
      } else {
        targetSlot = generalMics.find((s) => !s.userId && (!s.isLocked || canDo(bot, 'canManageMics')));
      }
    }

    if (!targetSlot) {
      return { handled: true, replyText: 'كل المايكات حالياً مشغولة أو مقفلة يا مدير، فرغلي مايك واحد وأصعد فوراً.' };
    }

    const vBot = virtualOnlineUsers.get(bot.id) || bot;
    if (vBot.roomId !== 'general') {
      const prevRoom = vBot.roomId;
      vBot.roomId = 'general';
      broadcastToRoom(prevRoom, { type: 'users:update', roomId: prevRoom, onlineUsers: getOnlineUsersForRoom(prevRoom) });
      broadcastToRoom('general', { type: 'users:update', roomId: 'general', onlineUsers: getOnlineUsersForRoom('general') });
      broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
    }

    if (targetSlot.userId !== vBot.id) {
      removeUserFromGeneralMics(vBot.id);
      targetSlot.userId = vBot.id;
      targetSlot.username = vBot.username;
      targetSlot.nameColor = vBot.nameColor;
      targetSlot.avatarUrl = vBot.avatarUrl;
      targetSlot.userRole = vBot.role;
      targetSlot.isMuted = false;
      targetSlot.hasCam = false;
      targetSlot.joinedAt = Date.now();
    } else {
      targetSlot.isMuted = false;
    }

    broadcastGeneralMics();
    pushAdminLog(actorLabel, `صعود على المايك رقم ${targetSlot.slotIndex + 1}`, 'الغرفة العامة');
    scheduleSave();
    broadcastAdminStateToStaff();

    const customLine = cmd.extra ? sanitizeText(cmd.extra, 280) : '';
    const botIsFemale = vBot.gender === 'female';
    const voiceLine =
      customLine ||
      (await generateIraqiChatReply({
        bot: vBot,
        senderName,
        incomingText: botIsFemale
          ? 'صعدتِ على المايك، رحبي بالمدير والموجودين بالديوان بكلمات قصيرة رقيقة ودافئة.'
          : 'صعدت على المايك، رحب بالمدير والموجودين بالديوان بكلمات قصيرة طيبة ومحترمة.',
        historyLines: [],
        contextKind: 'room',
        roomName: 'الديوان العام',
        isOnMic: true,
        targetKey: `mic-join:${vBot.id}`,
      }));

    void speakBotOnGeneralMic(vBot, voiceLine);

    return {
      handled: true,
      replyText: botIsFemale
        ? `من عيوني يا مدير، صعدت على المايك رقم ${targetSlot.slotIndex + 1} بالديوان العام: "${voiceLine}" 🎙️🌸`
        : `على راسي يا مدير، صعدت على المايك رقم ${targetSlot.slotIndex + 1} بالديوان العام: "${voiceLine}" 🎙️`,
      voiceText: voiceLine,
    };
  }

  if (cmd.action === 'mic_leave') {
    const botIsFemale = bot.gender === 'female';
    if (!removeUserFromGeneralMics(bot.id)) {
      return {
        handled: true,
        replyText: botIsFemale ? 'أنا حالياً مو صاعدة على المايك يا مدير.' : 'أنا حالياً مو صاعد على المايك يا مدير.',
      };
    }
    broadcastGeneralMics();
    broadcastToRoom('general', {
      type: 'mic:speaking',
      roomId: 'general',
      userId: bot.id,
      isSpeaking: false,
    });
    pushAdminLog(actorLabel, 'نزول من المايك', 'الغرفة العامة');
    scheduleSave();
    broadcastAdminStateToStaff();
    return { handled: true, replyText: 'حاضر يا مدير، نزلت من المايك فوراً بأمرك ✅' };
  }

  if (cmd.action === 'mic_speak') {
    const botIsFemale = bot.gender === 'female';
    const activeSlot = generalMics.find((s) => s.userId === bot.id);
    if (!activeSlot) {
      return {
        handled: true,
        replyText: botIsFemale
          ? 'أنا حالياً مو على المايك يا مدير، اكتبلي "اصعدي للمايك" وأصعد أتكلم فوراً.'
          : 'أنا حالياً مو على المايك يا مدير، اكتبلي "اصعد للمايك" وأصعد أتكلم فوراً.',
      };
    }
    if (activeSlot.isMuted || bot.isMuted) {
      return { handled: true, replyText: 'مايكي مكتوم حالياً يا مدير، فك الكتم عن المايك حتى ينسمع صوتي.' };
    }
    const vBot = virtualOnlineUsers.get(bot.id) || bot;
    const requestedText = cmd.extra ? sanitizeText(cmd.extra, 280) : '';
    const voiceLine =
      requestedText ||
      (await generateIraqiChatReply({
        bot: vBot,
        senderName,
        incomingText: botIsFemale
          ? 'تكلمي الآن على المايك بصوتك العراقي الرقيق جملة دافئة ولطيفة تسعد الحاضرين.'
          : 'تكلم الآن على المايك بصوتك العراقي الرجولي الأصيل جملة طيبة ومحترمة تسعد الحاضرين.',
        historyLines: [],
        contextKind: 'room',
        roomName: 'الديوان العام',
        isOnMic: true,
        targetKey: `mic-speak:${vBot.id}`,
      }));

    void speakBotOnGeneralMic(vBot, voiceLine);
    return {
      handled: true,
      replyText: `على راسي يا مدير، دا أتكلم بالمايك هسة: "${voiceLine}" 🎙️✨`,
      voiceText: voiceLine,
    };
  }

  if (cmd.action === 'set_gender') {
    const nextGender: UserGender = cmd.extra === 'female' ? 'female' : 'male';
    const acc = store.accounts.find((a) => a.id === bot.id);
    if (acc) acc.gender = nextGender;
    const vBot = virtualOnlineUsers.get(bot.id);
    if (vBot) vBot.gender = nextGender;
    store.sessions.filter((s) => s.userId === bot.id).forEach((s) => (s.profile.gender = nextGender));
    const updatedUser = vBot || bot;
    updatedUser.gender = nextGender;
    pushAdminLog(actorLabel, `تعيين الجنس إلى ${nextGender === 'female' ? 'أنثى' : 'ذكر'}`, updatedUser.username);
    scheduleSave();
    broadcastToAll({ type: 'profile:updated', user: updatedUser });
    for (const room of store.rooms) {
      broadcastToRoom(room.id, { type: 'users:update', roomId: room.id, onlineUsers: getOnlineUsersForRoom(room.id) });
    }
    broadcastAdminStateToStaff();
    return {
      handled: true,
      replyText:
        nextGender === 'female'
          ? 'حاضر يا مدير، صار نوعي أنثى وصوتي على المايك صوت بنت عراقية رقيقة 🌸✅'
          : 'على راسي يا مدير، صار نوعي ذكر وصوتي على المايك صوت رجل عراقي أصيل 🎙️✅',
    };
  }

  if (cmd.action === 'mute' || cmd.action === 'unmute') {
    if (!canDo(bot, 'canMuteUsers')) {
      return { handled: true, replyText: 'مع الأسف يا مدير، صلاحية كتم الأعضاء حالياً مسحوبة مني.' };
    }
    const target = findTargetUserForCommand(cmd.target, bot.id, currentRoomId);
    if (!target) {
      return { handled: true, replyText: `ما لكيت عضو باسم "${cmd.target || ''}" حتى أنفذ الأمر يا مدير.` };
    }
    if (target.role === 'admin' || target.id === senderId) {
      return { handled: true, replyText: 'ما يصير أكتم حساب المدير العام يا سيدي!' };
    }
    const muted = cmd.action === 'mute';
    const targetSessions = store.sessions.filter((s) => s.userId === target.id);
    const targetAccount = store.accounts.find((a) => a.id === target.id);
    targetSessions.forEach((s) => (s.profile.isMuted = muted));
    if (targetAccount) targetAccount.isMuted = muted;
    const vTarget = virtualOnlineUsers.get(target.id);
    if (vTarget) vTarget.isMuted = muted;
    pushAdminLog(actorLabel, muted ? 'كتم عضو' : 'فك كتم عضو', target.username);
    scheduleSave();
    sendToUser(target.id, {
      type: 'mod:notice',
      message: muted
        ? `تم كتمك من الكتابة بواسطة ${bot.username} (بأمر المدير).`
        : `تم رفع الكتم عنك بواسطة ${bot.username} (بأمر المدير).`,
    });
    if (targetSessions[0] || vTarget) {
      broadcastToAll({ type: 'profile:updated', user: targetSessions[0]?.profile || vTarget! });
    }
    const affectedRooms = new Set<string>(currentRoomId ? [currentRoomId] : []);
    targetSessions.forEach((s) => s.profile.roomId && affectedRooms.add(s.profile.roomId));
    if (vTarget?.roomId) affectedRooms.add(vTarget.roomId);
    for (const rid of affectedRooms) {
      broadcastToRoom(rid, { type: 'users:update', roomId: rid, onlineUsers: getOnlineUsersForRoom(rid) });
    }
    broadcastAdminStateToStaff();
    return {
      handled: true,
      replyText: muted
        ? `تم يا مدير، كتمت ${target.username} فوراً بأمرك ✅`
        : `صار يا مدير، رفعت الكتم عن ${target.username} ويكدر يكتب هسة ✅`,
    };
  }

  if (cmd.action === 'kick') {
    if (!canDo(bot, 'canKickUsers')) {
      return { handled: true, replyText: 'صلاحية الطرد غير مفعلة عندي حالياً يا مدير.' };
    }
    const target = findTargetUserForCommand(cmd.target, bot.id, currentRoomId, { onlineOnly: true });
    if (!target) {
      return { handled: true, replyText: `ما لكيت عضو متصل باسم "${cmd.target || ''}" للطرد يا مدير.` };
    }
    if (target.role === 'admin' || target.id === senderId) {
      return { handled: true, replyText: 'أعتذر يا مدير، ما أقدر أطرد حساب الإدارة العليا!' };
    }
    const affectedRooms = new Set<string>();
    const targetSockets = userSockets.get(target.id);
    if (targetSockets) {
      for (const targetWs of targetSockets) {
        const tc = clients.get(targetWs);
        if (tc) {
          tc.suppressedLeaveNotice = true;
          if (tc.roomId && tc.roomId !== SPACE_ROOM_ID) affectedRooms.add(tc.roomId);
        }
        sendToSocket(targetWs, {
          type: 'mod:notice',
          message: `تم إخراجك من الدردشة بواسطة ${bot.username} (بأمر المدير).`,
          kicked: true,
        });
        targetWs.close();
      }
    }
    if (removeUserFromGeneralMics(target.id)) broadcastGeneralMics();
    const vTarget = virtualOnlineUsers.get(target.id);
    if (vTarget) {
      const prevRoom = vTarget.roomId;
      if (prevRoom && prevRoom !== SPACE_ROOM_ID) affectedRooms.add(prevRoom);
      virtualOnlineUsers.delete(target.id);
      broadcastToRoom(prevRoom, { type: 'users:update', roomId: prevRoom, onlineUsers: getOnlineUsersForRoom(prevRoom) });
      broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
    }
    if (affectedRooms.size === 0) {
      affectedRooms.add(currentRoomId || target.roomId || 'general');
    }
    for (const rid of affectedRooms) {
      announceRoomKick(rid, target, bot.username);
    }
    store.sessions = store.sessions.filter((s) => s.userId !== target.id);
    pushAdminLog(actorLabel, 'طرد من الغرفة', target.username);
    scheduleSave();
    broadcastAdminStateToStaff();
    return { handled: true, replyText: `على راسي يا مدير، تم طرد ${target.username} من الدردشة ✅` };
  }

  if (cmd.action === 'ban') {
    if (!canDo(bot, 'canBanUsers')) {
      return { handled: true, replyText: 'صلاحية الحظر غير مفعلة عندي حالياً يا مدير.' };
    }
    const target = findTargetUserForCommand(cmd.target, bot.id, currentRoomId);
    const targetName = target?.username || sanitizeText(cmd.target || '', 24);
    if (!targetName) {
      return { handled: true, replyText: 'اذكرلي اسم العضو اللي تريد حظره يا مدير.' };
    }
    if (target?.role === 'admin' || target?.id === senderId) {
      return { handled: true, replyText: 'ما يصير أحظر حساب الإدارة العليا يا مدير!' };
    }
    const lower = targetName.toLowerCase();
    const reason = sanitizeText(cmd.extra || 'بأمر المدير العام', 120);
    if (!store.bans.some((b) => b.usernameLower === lower)) {
      store.bans.unshift({
        id: `ban-${crypto.randomUUID()}`,
        username: targetName,
        usernameLower: lower,
        reason,
        bannedBy: actorLabel,
        bannedAt: Date.now(),
      });
    }
    const affectedRooms = new Set<string>();
    if (target && removeUserFromGeneralMics(target.id)) broadcastGeneralMics();
    for (const s of [...store.sessions]) {
      if ((target && s.userId === target.id) || s.profile.username.toLowerCase() === lower) {
        if (removeUserFromGeneralMics(s.userId)) broadcastGeneralMics();
        if (s.profile.roomId && s.profile.roomId !== SPACE_ROOM_ID) {
          affectedRooms.add(s.profile.roomId);
        }
        const targetSockets = userSockets.get(s.userId);
        if (targetSockets) {
          for (const targetWs of targetSockets) {
            const tc = clients.get(targetWs);
            if (tc) {
              tc.suppressedLeaveNotice = true;
              if (tc.roomId && tc.roomId !== SPACE_ROOM_ID) affectedRooms.add(tc.roomId);
            }
            sendToSocket(targetWs, { type: 'mod:notice', message: `تم حظرك. السبب: ${reason}`, kicked: true });
            targetWs.close();
          }
        }
      }
    }
    for (const [vid, vUser] of [...virtualOnlineUsers.entries()]) {
      if ((target && vid === target.id) || vUser.username.toLowerCase() === lower) {
        if (removeUserFromGeneralMics(vid)) broadcastGeneralMics();
        const prevRoom = vUser.roomId;
        if (prevRoom && prevRoom !== SPACE_ROOM_ID) affectedRooms.add(prevRoom);
        virtualOnlineUsers.delete(vid);
        broadcastToRoom(prevRoom, { type: 'users:update', roomId: prevRoom, onlineUsers: getOnlineUsersForRoom(prevRoom) });
        broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
      }
    }
    if (affectedRooms.size === 0) {
      affectedRooms.add(currentRoomId || target?.roomId || 'general');
    }
    const banProfile: ChatUser = target || {
      id: `ban:${lower}`,
      username: targetName,
      isGuest: false,
      role: 'member',
      gender: 'male',
      nameColor: '#991b1b',
      statusText: '',
      bio: '',
      avatarSymbol: '🚫',
      roomId: currentRoomId || 'general',
      joinedAt: Date.now(),
      isMuted: false,
      country: '',
    };
    for (const rid of affectedRooms) {
      announceRoomBan(rid, banProfile, actorLabel, reason);
    }
    store.sessions = store.sessions.filter(
      (s) => (!target || s.userId !== target.id) && s.profile.username.toLowerCase() !== lower
    );
    pushAdminLog(actorLabel, 'حظر مستخدم', `${targetName} (${reason})`);
    scheduleSave();
    broadcastAdminStateToStaff();
    return { handled: true, replyText: `تم تنفيذ أمرك يا مدير، انحظر ${targetName} (${reason}) ✅` };
  }

  if (cmd.action === 'unban') {
    if (!canDo(bot, 'canBanUsers')) {
      return { handled: true, replyText: 'صلاحية رفع الحظر غير مفعلة عندي حالياً يا مدير.' };
    }
    const q = normalizeArabicName(cmd.target || '');
    const entry = store.bans.find(
      (b) => normalizeArabicName(b.username) === q || b.usernameLower === (cmd.target || '').trim().toLowerCase()
    );
    if (!entry) {
      return { handled: true, replyText: `ما لكيت حظر مسجل باسم "${cmd.target || ''}" يا مدير.` };
    }
    store.bans = store.bans.filter((b) => b.id !== entry.id);
    pushAdminLog(actorLabel, 'رفع الحظر', entry.username);
    scheduleSave();
    broadcastAdminStateToStaff();
    return { handled: true, replyText: `تدلل يا مدير، رفعت الحظر عن ${entry.username} ✅` };
  }

  if (cmd.action === 'move_user') {
    if (!canDo(bot, 'canMoveUsers')) {
      return { handled: true, replyText: 'صلاحية نقل الأعضاء غير مفعلة عندي حالياً يا مدير.' };
    }
    const target = findTargetUserForCommand(cmd.target, bot.id, currentRoomId, { onlineOnly: true });
    const targetRoom = findTargetRoomForCommand(cmd.extra, currentRoomId || bot.roomId);
    if (!target) return { handled: true, replyText: `ما لكيت العضو المتصل "${cmd.target || ''}" يا مدير.` };
    if (!targetRoom) return { handled: true, replyText: `ما لكيت غرفة باسم "${cmd.extra || ''}" يا مدير.` };
    if (target.role === 'admin') return { handled: true, replyText: 'ما يصير أنقل حساب الإدارة العليا يا مدير!' };

    const vTarget = virtualOnlineUsers.get(target.id);
    if (vTarget && vTarget.roomId !== targetRoom.id) {
      const prevRoom = vTarget.roomId;
      if (removeUserFromRoomMics(prevRoom, target.id)) broadcastRoomMics(prevRoom);
      vTarget.roomId = targetRoom.id;
      broadcastToRoom(prevRoom, { type: 'users:update', roomId: prevRoom, onlineUsers: getOnlineUsersForRoom(prevRoom) });
      announceRoomMove(prevRoom, targetRoom.id, vTarget);
    }
    const targetSockets = userSockets.get(target.id);
    if (targetSockets) {
      for (const targetWs of targetSockets) {
        const tc = clients.get(targetWs);
        const ts = tc ? getSessionByToken(tc.token) : undefined;
        if (!tc || !ts || tc.roomId === targetRoom.id) continue;
        const prevRoom = tc.roomId;
        if (removeUserFromRoomMics(prevRoom, target.id)) broadcastRoomMics(prevRoom);
        tc.roomId = targetRoom.id;
        ts.profile.roomId = targetRoom.id;
        broadcastToRoom(prevRoom, { type: 'users:update', roomId: prevRoom, onlineUsers: getOnlineUsersForRoom(prevRoom) });
        sendToSocket(targetWs, {
          type: 'room:joined',
          roomId: targetRoom.id,
          messages: [],
          onlineUsers: getOnlineUsersForRoom(targetRoom.id),
          mics: isVoiceEnabledRoom(targetRoom.id) ? getRoomMics(targetRoom.id).map((m) => ({ ...m })) : [],
          micRequests: isVoiceEnabledRoom(targetRoom.id) ? [...getRoomMicRequests(targetRoom.id)] : [],
          activeQuiz: getPublicQuiz(targetRoom.id),
        });
        announceRoomMove(prevRoom, targetRoom.id, ts.profile);
        sendToSocket(targetWs, {
          type: 'mod:notice',
          message: `تم نقلك إلى ${targetRoom.name} بواسطة ${bot.username} (بأمر المدير).`,
        });
      }
    }
    broadcastToRoom(targetRoom.id, { type: 'users:update', roomId: targetRoom.id, onlineUsers: getOnlineUsersForRoom(targetRoom.id) });
    broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
    pushAdminLog(actorLabel, `نقل إلى ${targetRoom.name}`, target.username);
    scheduleSave();
    broadcastAdminStateToStaff();
    return { handled: true, replyText: `صار يا مدير، نقلت ${target.username} إلى ${targetRoom.name} ✅` };
  }

  if (cmd.action === 'clear_room') {
    if (!canDo(bot, 'canClearRoom')) {
      return { handled: true, replyText: 'صلاحية تنظيف الغرف غير مفعلة عندي حالياً يا مدير.' };
    }
    const room = findTargetRoomForCommand(cmd.extra, currentRoomId || bot.roomId || 'general');
    if (!room) return { handled: true, replyText: 'ما لكيت الغرفة المطلوبة للتنظيف يا مدير.' };
    const sysMsg: ChatMessage = {
      id: `sys-${crypto.randomUUID()}`,
      roomId: room.id,
      userId: 'system',
      username: 'النظام',
      userRole: 'admin',
      userGender: 'male',
      nameColor: '#991B1B',
      text: `تم تنظيف محادثات ${room.name} بواسطة ${bot.username} (بأمر المدير ${senderName}).`,
      textColor: '',
      isBold: false,
      fontSize: 'sm',
      timestamp: Date.now(),
      type: 'system',
    };
    store.messagesByRoom[room.id] = [sysMsg];
    pushAdminLog(actorLabel, 'تنظيف رسائل الغرفة', room.name);
    scheduleSave();
    broadcastToRoom(room.id, { type: 'room:cleared', roomId: room.id, messages: [sysMsg] });
    broadcastAdminStateToStaff();
    return { handled: true, replyText: `تم تنظيف محادثات ${room.name} بالكامل بأمرك يا مدير 🧹✅` };
  }

  if (cmd.action === 'delete_message') {
    if (!canDo(bot, 'canDeleteMessages')) {
      return { handled: true, replyText: 'صلاحية حذف الرسائل غير مفعلة عندي حالياً يا مدير.' };
    }
    const rid = currentRoomId || bot.roomId || 'general';
    const list = store.messagesByRoom[rid] || [];
    const targetUser = cmd.target ? findTargetUserForCommand(cmd.target, bot.id, rid) : null;
    const candidate = [...list]
      .reverse()
      .find(
        (m) =>
          m.type === 'chat' &&
          m.userId !== bot.id &&
          m.userId !== senderId &&
          (!targetUser || m.userId === targetUser.id)
      );
    if (!candidate) {
      return { handled: true, replyText: 'ما لكيت رسالة لحذفها بهالغرفة يا مدير.' };
    }
    store.messagesByRoom[rid] = list.filter((m) => m.id !== candidate.id);
    scheduleSave();
    broadcastToRoom(rid, { type: 'chat:deleted', roomId: rid, messageId: candidate.id });
    pushAdminLog(actorLabel, 'حذف رسالة', candidate.username);
    broadcastAdminStateToStaff();
    return { handled: true, replyText: `تم حذف رسالة ${candidate.username} بأمرك يا مدير ✅` };
  }

  if (cmd.action === 'broadcast') {
    if (!canDo(bot, 'canBroadcast')) {
      return { handled: true, replyText: 'صلاحية الإعلانات العامة غير مفعلة عندي حالياً يا مدير.' };
    }
    const msgText = sanitizeText(cmd.extra || '', 280);
    if (!msgText) {
      return { handled: true, replyText: 'اكتبلي نص الإعلان اللي تريد أنشره يا مدير.' };
    }
    const now = Date.now();
    pushAdminLog(actorLabel, 'إعلان عام', msgText.slice(0, 40));
    broadcastToAll({ type: 'admin:announcement', text: msgText, by: bot.username, timestamp: now });
    for (const onlineUser of getOnlineUsersMap().values()) {
      if (onlineUser.id === bot.id) continue;
      pushMemberNotification(onlineUser.id, {
        kind: 'admin',
        fromUserId: bot.id,
        fromUsername: bot.username,
        fromNameColor: bot.nameColor,
        fromAvatarUrl: bot.avatarUrl,
        message: `تنبيه إداري: ${msgText}`,
        timestamp: now,
      });
    }
    scheduleSave();
    broadcastAdminStateToStaff();
    return { handled: true, replyText: `تم إرسال الإعلان العام لكل الغرف والأعضاء يا مدير 📢✅` };
  }

  if (cmd.action === 'update_topic') {
    if (!canDo(bot, 'canEditRoomTopic') && !canDo(bot, 'canManageRooms')) {
      return { handled: true, replyText: 'صلاحية تعديل عنوان الغرفة غير مفعلة عندي حالياً يا مدير.' };
    }
    const room = store.rooms.find((r) => r.id === (currentRoomId || bot.roomId || 'general'));
    const nextTopic = sanitizeText(cmd.extra || '', 140);
    if (!room || !nextTopic) {
      return { handled: true, replyText: 'اذكرلي عنوان الغرفة الجديد يا مدير.' };
    }
    room.topic = nextTopic;
    pushAdminLog(actorLabel, 'تعديل عنوان الغرفة', `${room.name}: ${nextTopic}`);
    scheduleSave();
    broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
    broadcastAdminStateToStaff();
    return { handled: true, replyText: `تم تغيير عنوان ${room.name} إلى "${nextTopic}" بأمرك يا مدير ✅` };
  }

  if (cmd.action === 'create_room') {
    if (!canDo(bot, 'canCreateRoom') && !canDo(bot, 'canManageRooms')) {
      return { handled: true, replyText: 'صلاحية إنشاء الغرف غير مفعلة عندي حالياً يا مدير.' };
    }
    const name = sanitizeText(cmd.extra || '', 36);
    if (name.length < 3) {
      return { handled: true, replyText: 'لازم يكون اسم الغرفة 3 أحرف على الأقل يا مدير.' };
    }
    const id = `room-${crypto.randomUUID().slice(0, 8)}`;
    store.rooms.push({
      id,
      name,
      description: `غرفة ${name}`,
      topic: `أهلاً بكم في ${name}`,
      isDefault: false,
      createdBy: bot.id,
    });
    store.messagesByRoom[id] = [
      {
        id: `sys-${crypto.randomUUID()}`,
        roomId: id,
        userId: 'system',
        username: 'النظام',
        userRole: 'admin',
        userGender: 'male',
        nameColor: '#0F766E',
        text: `تم إنشاء غرفة "${name}" بواسطة ${bot.username} (بأمر المدير ${senderName}).`,
        textColor: '',
        isBold: false,
        fontSize: 'sm',
        timestamp: Date.now(),
        type: 'system',
      },
    ];
    pushAdminLog(actorLabel, 'إنشاء غرفة', name);
    scheduleSave();
    broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
    broadcastAdminStateToStaff();
    return { handled: true, replyText: `تدلل يا مدير، فتحت غرفة جديدة باسم "${name}" ✅` };
  }

  if (cmd.action === 'mic_bulk') {
    if (!canDo(bot, 'canManageMics')) {
      return { handled: true, replyText: 'صلاحية إدارة المايكات غير مفعلة عندي حالياً يا مدير.' };
    }
    const action = cmd.extra || 'lockAll';
    if (action === 'lockAll') {
      for (const slot of generalMics) {
        slot.isLocked = true;
        if (slot.userId) {
          const uid = slot.userId;
          slot.userId = null;
          slot.username = null;
          slot.nameColor = undefined;
          slot.avatarUrl = undefined;
          slot.userRole = undefined;
          slot.isMuted = false;
          slot.hasCam = false;
          slot.joinedAt = undefined;
          sendToUser(uid, { type: 'mod:notice', message: `تم قفل المايكات بواسطة ${bot.username} (بأمر المدير).` });
        }
      }
      pushAdminLog(actorLabel, 'قفل جميع المايكات', 'الغرفة العامة');
    } else if (action === 'unlockAll') {
      for (const slot of generalMics) slot.isLocked = false;
      pushAdminLog(actorLabel, 'فتح جميع المايكات', 'الغرفة العامة');
    } else if (action === 'kickAll') {
      for (const slot of generalMics) {
        if (slot.userId) {
          const uid = slot.userId;
          slot.userId = null;
          slot.username = null;
          slot.nameColor = undefined;
          slot.avatarUrl = undefined;
          slot.userRole = undefined;
          slot.isMuted = false;
          slot.hasCam = false;
          slot.joinedAt = undefined;
          sendToUser(uid, { type: 'mod:notice', message: `تم إنزال الجميع من المايكات بواسطة ${bot.username} (بأمر المدير).` });
        }
      }
      pushAdminLog(actorLabel, 'إنزال الجميع من المايكات', 'الغرفة العامة');
    } else if (action === 'muteAll') {
      for (const slot of generalMics) if (slot.userId) slot.isMuted = true;
      pushAdminLog(actorLabel, 'كتم جميع المتحدثين', 'الغرفة العامة');
    } else if (action === 'unmuteAll') {
      for (const slot of generalMics) if (slot.userId) slot.isMuted = false;
      pushAdminLog(actorLabel, 'فك كتم جميع المايكات', 'الغرفة العامة');
    }
    broadcastGeneralMics();
    scheduleSave();
    broadcastAdminStateToStaff();
    return { handled: true, replyText: 'تم تنفيذ أمر المايكات في الغرفة العامة يا مدير 🎙️✅' };
  }

  if (cmd.action === 'mic_user') {
    if (!canDo(bot, 'canManageMics')) {
      return { handled: true, replyText: 'صلاحية إدارة المايكات غير مفعلة عندي حالياً يا مدير.' };
    }
    const target = findTargetUserForCommand(cmd.target, bot.id, 'general', { onlineOnly: true });
    if (!target) return { handled: true, replyText: `ما لكيت العضو "${cmd.target || ''}" على المايكات يا مدير.` };
    const slot = generalMics.find((s) => s.userId === target.id);
    if (!slot) return { handled: true, replyText: `${target.username} مو صاعد على المايك حالياً يا مدير.` };
    if (cmd.extra === 'kick') {
      removeUserFromGeneralMics(target.id);
      sendToUser(target.id, { type: 'mod:notice', message: `تم إنزالك من المايك بواسطة ${bot.username} (بأمر المدير).` });
    } else if (cmd.extra === 'mute') {
      slot.isMuted = true;
    } else if (cmd.extra === 'unmute') {
      slot.isMuted = false;
    }
    broadcastGeneralMics();
    pushAdminLog(actorLabel, `إدارة مايك (${cmd.extra})`, target.username);
    scheduleSave();
    broadcastAdminStateToStaff();
    return { handled: true, replyText: `تم تنفيذ أمر المايك على ${target.username} بأمرك يا مدير ✅` };
  }

  if (cmd.action === 'set_role') {
    if (!canDo(bot, 'canManageAccounts')) {
      return { handled: true, replyText: 'صلاحية إدارة الرتب والحسابات غير مفعلة عندي حالياً يا مدير.' };
    }
    const target = findTargetUserForCommand(cmd.target, bot.id, currentRoomId);
    if (!target) return { handled: true, replyText: `ما لكيت العضو "${cmd.target || ''}" يا مدير.` };
    const acc = store.accounts.find((a) => a.id === target.id);
    if (!acc) return { handled: true, replyText: `${target.username} داخل كزائر، الترقية متاحة للأعضاء المسجلين فقط يا مدير.` };
    if (acc.role === 'admin') return { handled: true, replyText: 'ما يصير أعدل رتبة الإدارة العليا يا مدير!' };
    const nextRole: UserRole = cmd.extra === 'moderator' ? 'moderator' : cmd.extra === 'vip' ? 'vip' : 'member';
    acc.role = nextRole;
    store.sessions.filter((s) => s.userId === acc.id).forEach((s) => (s.profile.role = nextRole));
    const vTarget = virtualOnlineUsers.get(acc.id);
    if (vTarget) vTarget.role = nextRole;
    pushAdminLog(actorLabel, `تغيير الرتبة إلى ${nextRole}`, acc.username);
    scheduleSave();
    broadcastToAll({
      type: 'profile:updated',
      user: store.sessions.find((s) => s.userId === acc.id)?.profile || vTarget || target,
    });
    for (const room of store.rooms) {
      broadcastToRoom(room.id, { type: 'users:update', roomId: room.id, onlineUsers: getOnlineUsersForRoom(room.id) });
    }
    broadcastAdminStateToStaff();
    return { handled: true, replyText: `تم تعديل رتبة ${acc.username} إلى ${nextRole} بأمرك يا مدير ⭐✅` };
  }

  if (cmd.action === 'give_likes') {
    if (!canDo(bot, 'canManageAccounts')) {
      return { handled: true, replyText: 'صلاحية تعديل اللايكات غير مفعلة عندي حالياً يا مدير.' };
    }
    const target = findTargetUserForCommand(cmd.target, bot.id, currentRoomId);
    const amount = Math.max(1, Math.min(10000, Math.round(Number(cmd.extra) || 0)));
    if (!target || !amount) {
      return { handled: true, replyText: 'حددلي اسم العضو وعدد اللايكات بشكل واضح يا مدير.' };
    }
    const stats = getOrCreateUserStats(target.id);
    stats.likesCount += amount;
    pushAdminLog(actorLabel, `منح +${amount} لايك`, target.username);
    scheduleSave();
    broadcastToAll({ type: 'user:profileStats', stats });
    broadcastToAll({ type: 'leaderboard:update', stars: getTopStars() });
    broadcastAdminStateToStaff();
    return { handled: true, replyText: `صار يا مدير، زدت ${amount} لايك لـ ${target.username} ❤️✅` };
  }

  if (cmd.action === 'stop_quiz') {
    if (!canDo(bot, 'canRunQuiz')) {
      return { handled: true, replyText: 'صلاحية المسابقات غير مفعلة عندي حالياً يا مدير.' };
    }
    const rid = currentRoomId || bot.roomId || 'general';
    if (activeQuizByRoom.delete(rid)) {
      broadcastToRoom(rid, { type: 'room:quizUpdated', roomId: rid, quiz: null });
      return { handled: true, replyText: 'تم إيقاف المسابقة الحالية بأمرك يا مدير ✅' };
    }
    return { handled: true, replyText: 'ماكو مسابقة شغالة حالياً بهالغرفة يا مدير.' };
  }

  if (cmd.action === 'clear_wall') {
    if (!canDo(bot, 'canManageSettings') && !canDo(bot, 'canDeleteMessages')) {
      return { handled: true, replyText: 'صلاحية تنظيف الحائط غير مفعلة عندي حالياً يا مدير.' };
    }
    store.wallPosts = [];
    pushAdminLog(actorLabel, 'تنظيف الحائط', 'جميع المنشورات');
    scheduleSave();
    broadcastToAll({ type: 'wall:cleared' });
    broadcastAdminStateToStaff();
    return { handled: true, replyText: 'تم تنظيف جميع منشورات الحائط بأمرك يا مدير 🧹✅' };
  }

  return { handled: false };
}

function scheduleDemoRoomReply(
  roomId: string,
  incomingMsg: ChatMessage,
  bot: ChatUser,
  options: { isFirstCall: boolean; isFarewell: boolean; isIntimate: boolean }
) {
  const seqKey = `room:${roomId}:${bot.id}`;
  const nextSeq = (demoReplySequence.get(seqKey) || 0) + 1;
  demoReplySequence.set(seqKey, nextSeq);

  const recentMsgs = (store.messagesByRoom[roomId] || [])
    .filter((m) => m.type === 'chat' && Boolean(m.text))
    .slice(-22);
  const historyLines = recentMsgs
    .filter((m) => m.id !== incomingMsg.id)
    .map((m) => (m.userId === bot.id ? `أنت (${bot.username}): ${m.text}` : `${m.username}: ${m.text}`));
  const recentMicSpoken = botRecentMicLines.get(bot.id) || [];
  if (recentMicSpoken.length > 0) {
    for (const spoken of recentMicSpoken.slice(-4)) {
      historyLines.push(`أنت (${bot.username} على المايك بالصوت): ${spoken}`);
    }
  }
  const roomObj = store.rooms.find((r) => r.id === roomId);
  const roomName = roomObj?.name || 'الغرفة';
  const roomTopic = roomObj?.topic || '';
  const roomUsers = getOnlineUsersForRoom(roomId);
  const micSpeakers = generalMics
    .filter((s) => s.userId)
    .map((s) => `${s.username}${s.isMuted ? ' (مكتوم)' : ''}`);
  const roomSituation = [
    `المتواجدون بالغرفة (${roomUsers.length}): ${roomUsers
      .slice(0, 15)
      .map((u) => `${u.username}${u.role === 'admin' ? ' [مدير]' : u.role === 'moderator' ? ' [مشرف]' : ''}`)
      .join('، ')}`,
    roomId === 'general'
      ? micSpeakers.length > 0
        ? `المتحدثون على المايكات حالياً: ${micSpeakers.join('، ')}`
        : 'المايكات حالياً فارغة'
      : '',
  ]
    .filter(Boolean)
    .join(' | ');
  const replyToContext = incomingMsg.replyTo
    ? `ملاحظة: يرد "${incomingMsg.username}" الآن مباشرة على رسالة لـ "${incomingMsg.replyTo.username}": "${incomingMsg.replyTo.text}"`
    : undefined;

  void (async () => {
    await new Promise((r) => setTimeout(r, 320));
    if (demoReplySequence.get(seqKey) !== nextSeq) return;

    const botCheck1 = virtualOnlineUsers.get(bot.id);
    if (!botCheck1 || botCheck1.demoTalkControlEnabled !== true || botCheck1.roomId !== roomId || botCheck1.isMuted || botCheck1.isGhost) return;

    const wasOnMic = generalMics.some((s) => s.userId === botCheck1.id);
    const detCheck = parseDemoCommandDeterministic(incomingMsg.text, botCheck1);
    const willLikelyBeVoiceOnly = wasOnMic
      ? detCheck?.action !== 'mic_leave'
      : detCheck?.action === 'mic_join';

    let sentTyping = false;
    if (!willLikelyBeVoiceOnly) {
      sentTyping = true;
      broadcastToRoom(roomId, {
        type: 'chat:typing',
        roomId,
        userId: botCheck1.id,
        username: botCheck1.username,
        isTyping: true,
      });
    }

    const startedAt = Date.now();
    const cmdResult = await tryExecuteDemoAdminCommand({
      text: incomingMsg.text,
      bot: botCheck1,
      senderId: incomingMsg.userId,
      senderName: incomingMsg.username,
      senderRole: incomingMsg.userRole,
      currentRoomId: roomId,
    });

    const isBotOnMic = generalMics.some((s) => s.userId === botCheck1.id);
    const replyText = cmdResult.handled && cmdResult.replyText
      ? cmdResult.replyText
      : await generateIraqiChatReply({
          bot: botCheck1,
          senderName: incomingMsg.username,
          senderGender: incomingMsg.userGender,
          senderRole: incomingMsg.userRole,
          incomingText: incomingMsg.text,
          historyLines,
          contextKind: 'room',
          roomName,
          roomTopic,
          roomSituation,
          replyToContext,
          isFarewell: options.isFarewell,
          isFirstCall: options.isFirstCall,
          isIntimate: options.isIntimate,
          isOnMic: isBotOnMic,
          targetKey: `room:${roomId}:${botCheck1.id}:${incomingMsg.userId}`,
        });

    const elapsed = Date.now() - startedAt;
    const minTypingMs = isBotOnMic
      ? 0
      : cmdResult.handled
      ? 650
      : Math.min(1800, Math.max(850, replyText.length * 16));
    if (elapsed < minTypingMs) {
      await new Promise((r) => setTimeout(r, minTypingMs - elapsed));
    }

    const freshBot = virtualOnlineUsers.get(bot.id);
    if (sentTyping) {
      broadcastToRoom(roomId, {
        type: 'chat:typing',
        roomId,
        userId: bot.id,
        username: freshBot?.username || bot.username,
        isTyping: false,
      });
    }

    if (demoReplySequence.get(seqKey) !== nextSeq) return;
    if (!freshBot || freshBot.demoTalkControlEnabled !== true || freshBot.isMuted || freshBot.isGhost) return;
    if (freshBot.roomId !== roomId && !(cmdResult.handled && freshBot.roomId === 'general')) return;
    if (store.bans.some((b) => b.usernameLower === freshBot.username.toLowerCase())) return;

    // When on the mic, stop writing text completely and reply by voice only
    const isFreshOnMic = generalMics.some((s) => s.userId === freshBot.id);
    if (isFreshOnMic) {
      if (
        roomId === 'general' &&
        !cmdResult.voiceText &&
        !freshBot.isMuted &&
        generalMics.some((s) => s.userId === freshBot.id && !s.isMuted)
      ) {
        void speakBotOnGeneralMic(freshBot, replyText);
      }
      return;
    }

    const replyMsg: ChatMessage = {
      id: `msg-${crypto.randomUUID()}`,
      roomId,
      userId: freshBot.id,
      username: freshBot.username,
      userRole: freshBot.role,
      userGender: freshBot.gender,
      nameColor: freshBot.nameColor,
      avatarUrl: freshBot.avatarUrl,
      text: replyText,
      textColor: freshBot.textColor || '',
      isBold: false,
      fontSize: 'md',
      replyTo: {
        id: incomingMsg.id,
        username: incomingMsg.username,
        text: sanitizeText(incomingMsg.text, 120),
      },
      timestamp: Date.now(),
      type: 'chat',
    };

    appendRoomMessage(roomId, replyMsg);
    scheduleSave();
    broadcastToRoom(roomId, { type: 'chat:message', message: replyMsg });
  })();
}

function scheduleDemoPmReply(
  humanUserId: string,
  humanUsername: string,
  humanGender: UserGender,
  humanRole: UserRole,
  incomingPm: PrivateMessage,
  bot: ChatUser
) {
  const seqKey = `pm:${bot.id}:${humanUserId}`;
  const nextSeq = (demoReplySequence.get(seqKey) || 0) + 1;
  demoReplySequence.set(seqKey, nextSeq);

  const threadMsgs = store.privateMessages
    .filter(
      (m) =>
        m.id !== incomingPm.id &&
        ((m.fromUserId === humanUserId && m.toUserId === bot.id) ||
          (m.fromUserId === bot.id && m.toUserId === humanUserId)) &&
        Boolean(m.text)
    )
    .slice(-22);
  const historyLines = threadMsgs.map((m) =>
    m.fromUserId === bot.id ? `أنت (${bot.username}): ${m.text}` : `${humanUsername}: ${m.text}`
  );
  const isFarewell = isDemoFarewell(incomingPm.text);
  const isIntimate = resolveIntimateMode(bot.id, humanUserId, incomingPm.text || '', Date.now(), isFarewell);

  void (async () => {
    const startedAt = Date.now();
    const freshBotCheck = virtualOnlineUsers.get(bot.id) || bot;
    if (freshBotCheck.demoTalkControlEnabled !== true) return;
    const cmdResult = await tryExecuteDemoAdminCommand({
      text: incomingPm.text || '',
      bot: freshBotCheck,
      senderId: humanUserId,
      senderName: humanUsername,
      senderRole: humanRole,
      currentRoomId: freshBotCheck.roomId,
    });

    const isBotOnMicAfterCmd = generalMics.some((s) => s.userId === freshBotCheck.id);
    if (isBotOnMicAfterCmd) {
      if (
        cmdResult.handled &&
        cmdResult.replyText &&
        !cmdResult.voiceText &&
        !freshBotCheck.isMuted &&
        generalMics.some((s) => s.userId === freshBotCheck.id && !s.isMuted)
      ) {
        void speakBotOnGeneralMic(freshBotCheck, cmdResult.replyText);
      }
      return;
    }

    const replyText = cmdResult.handled && cmdResult.replyText
      ? cmdResult.replyText
      : await generateIraqiChatReply({
          bot: freshBotCheck,
          senderName: humanUsername,
          senderGender: humanGender,
          senderRole: humanRole,
          incomingText: incomingPm.text || 'دزيتلك صورة حلوة',
          historyLines,
          contextKind: 'pm',
          isFarewell,
          isFirstCall: threadMsgs.length === 0,
          isIntimate,
          targetKey: seqKey,
        });

    const elapsed = Date.now() - startedAt;
    const minDelay = cmdResult.handled ? 600 : 950;
    if (elapsed < minDelay) {
      await new Promise((r) => setTimeout(r, minDelay - elapsed));
    }

    if (demoReplySequence.get(seqKey) !== nextSeq) return;
    const freshBot = virtualOnlineUsers.get(bot.id);
    if (!freshBot || freshBot.demoTalkControlEnabled !== true || freshBot.pmDisabled) return;
    if (generalMics.some((s) => s.userId === freshBot.id)) return;
    if (store.bans.some((b) => b.usernameLower === freshBot.username.toLowerCase())) return;

    const replyPm: PrivateMessage = {
      id: `pm-${crypto.randomUUID()}`,
      fromUserId: freshBot.id,
      fromUsername: freshBot.username,
      fromNameColor: freshBot.nameColor,
      fromAvatarUrl: freshBot.avatarUrl,
      toUserId: humanUserId,
      toUsername: humanUsername,
      text: replyText,
      textColor: freshBot.textColor || '',
      timestamp: Date.now(),
    };

    store.privateMessages.push(replyPm);
    if (store.privateMessages.length > 400) {
      store.privateMessages = store.privateMessages.slice(-400);
    }
    scheduleSave();
    sendToUser(humanUserId, { type: 'pm:message', message: replyPm });
  })();
}

function getSessionByToken(token: string): StoredSession | undefined {
  return store.sessions.find((s) => s.token === token);
}

function computeClientIdle(client: ConnectedClient, now = Date.now()): boolean {
  return Boolean(
    client.isInSpace ||
      client.clientReportedIdle ||
      now - client.lastPublicActivityAt >= PUBLIC_IDLE_TIMEOUT_MS
  );
}

function getOnlineUsersMap(includeGhosts = false): Map<string, ChatUser> {
  const map = new Map<string, ChatUser>();
  const now = Date.now();
  for (const vUser of virtualOnlineUsers.values()) {
    if (!includeGhosts && vUser.isGhost) continue;
    map.set(vUser.id, {
      ...vUser,
      isIdle: !vUser.demoTalkControlEnabled,
      likesCount: getOrCreateUserStats(vUser.id).likesCount,
    });
  }
  const activeSocketSeen = new Set<string>();
  for (const client of clients.values()) {
    const session = getSessionByToken(client.token);
    if (session) {
      if (!includeGhosts && session.profile.isGhost) continue;
      const clientIdle = computeClientIdle(client, now);
      if (!clientIdle) {
        activeSocketSeen.add(client.userId);
      }
      const existing = map.get(client.userId);
      const resolvedIdle = existing ? !activeSocketSeen.has(client.userId) : clientIdle;
      map.set(client.userId, {
        ...session.profile,
        roomId: client.roomId,
        isIdle: resolvedIdle,
        likesCount: getOrCreateUserStats(client.userId).likesCount,
      });
    }
  }
  return map;
}

function getOnlineUsersForRoom(roomId: string, includeGhosts = false): ChatUser[] {
  const allOnline = Array.from(getOnlineUsersMap(includeGhosts).values());
  const users = roomId === SPACE_ROOM_ID ? allOnline : allOnline.filter((u) => u.roomId === roomId);
  const roleWeight: Record<UserRole, number> = {
    admin: 5,
    moderator: 4,
    vip: 3,
    member: 2,
    visitor: 1,
  };
  return users.sort((a, b) => {
    const diff = roleWeight[b.role] - roleWeight[a.role];
    if (diff !== 0) return diff;
    return a.username.localeCompare(b.username, 'ar');
  });
}

function getRoomsWithCounts(): Room[] {
  const onlineUsers = Array.from(getOnlineUsersMap().values());
  return store.rooms.map(({ password, ...r }) => {
    const resolvedImage =
      r.imageUrl === undefined
        ? DEFAULT_ROOM_IMAGES[r.id]
        : r.imageUrl || undefined;
    return {
      ...r,
      imageUrl: resolvedImage,
      hasPassword: Boolean(password),
      onlineCount: onlineUsers.filter((u) => u.roomId === r.id).length,
    };
  });
}

function getTopStars(): TopStarEntry[] {
  const onlineMap = getOnlineUsersMap();
  const entries: TopStarEntry[] = [];
  for (const [userId, rawStats] of Object.entries(store.userStats)) {
    const stats = getOrCreateUserStats(userId);
    const online = onlineMap.get(userId);
    const acc = store.accounts.find((a) => a.id === userId);
    const username = online?.username || acc?.username;
    if (!username) continue;
    entries.push({
      userId,
      username,
      nameColor: online?.nameColor || acc?.nameColor || '#0F766E',
      avatarUrl: online?.avatarUrl || acc?.avatarUrl,
      likesCount: stats.likesCount,
      profileLikesCount: rawStats.likes.length,
    });
  }
  return entries.sort((a, b) => b.likesCount - a.likesCount).slice(0, 10);
}

function sendToSocket(ws: WebSocket, payload: WSServerEvent) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoomUsersUpdate(roomId: string, adminsOnly = false) {
  if (roomId === SPACE_ROOM_ID) return;
  const publicUsers = adminsOnly ? [] : getOnlineUsersForRoom(roomId, false);
  const adminUsers = getOnlineUsersForRoom(roomId, true);
  for (const client of clients.values()) {
    if (client.roomId !== roomId) continue;
    const s = getSessionByToken(client.token);
    const isAdminViewer = s?.profile.role === 'admin';
    if (adminsOnly && !isAdminViewer) continue;
    sendToSocket(client.ws, {
      type: 'users:update',
      roomId,
      onlineUsers: isAdminViewer ? adminUsers : publicUsers,
    });
  }
}

function markClientPublicActive(client: ConnectedClient, isGhost?: boolean) {
  if (client.isInSpace) return;
  client.lastPublicActivityAt = Date.now();
  client.clientReportedIdle = false;
  if (client.isIdle) {
    client.isIdle = false;
    broadcastRoomUsersUpdate(client.roomId, Boolean(isGhost));
  }
}

function broadcastToRoom(roomId: string, payload: WSServerEvent, excludeUserId?: string) {
  if (payload.type === 'users:update') {
    const publicUsers = payload.onlineUsers;
    const adminUsers = getOnlineUsersForRoom(roomId, true);
    for (const client of clients.values()) {
      if (client.roomId === roomId && client.userId !== excludeUserId) {
        const s = getSessionByToken(client.token);
        const isAdminViewer = s?.profile.role === 'admin';
        sendToSocket(client.ws, {
          type: 'users:update',
          roomId,
          onlineUsers: isAdminViewer ? adminUsers : publicUsers,
        });
      }
    }
    return;
  }
  const suppressInSpace =
    payload.type === 'chat:message' ||
    payload.type === 'chat:typing' ||
    payload.type === 'room:quizUpdated';
  for (const client of clients.values()) {
    if (client.roomId === roomId && client.userId !== excludeUserId) {
      if (suppressInSpace && client.isInSpace) continue;
      sendToSocket(client.ws, payload);
    }
  }
}

function broadcastToAll(payload: WSServerEvent) {
  for (const client of clients.values()) {
    sendToSocket(client.ws, payload);
  }
}

function sendToUser(userId: string, payload: WSServerEvent) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  for (const ws of sockets) {
    sendToSocket(ws, payload);
  }
}

function pushMemberNotification(
  targetUserId: string,
  payload: Omit<MemberNotification, 'id' | 'read'>
) {
  if (!targetUserId || targetUserId === 'system') return;
  const notification: MemberNotification = {
    ...payload,
    id: `notif-${crypto.randomUUID()}`,
    read: false,
  };
  const existing = store.notificationsByUser[targetUserId] || [];
  store.notificationsByUser[targetUserId] = [notification, ...existing].slice(0, 40);
  scheduleSave();
  sendToUser(targetUserId, { type: 'notification:new', notification });
}

function createSystemMessage(
  roomId: string,
  text: string,
  options?: {
    systemKind?: 'join' | 'leave' | 'move' | 'kick' | 'ban' | 'notice' | 'dedication';
    actor?: ChatUser;
    roomLabel?: string;
    noticeLabel?: string;
    modActorName?: string;
    modReason?: string;
    moveTargetRoomId?: string;
    title?: string;
    imageUrl?: string;
    isRoyalEntry?: boolean;
    royalEntryText?: string;
  }
): ChatMessage {
  return {
    id: `sys-${crypto.randomUUID()}`,
    roomId,
    userId: options?.actor?.id || 'system',
    username: options?.actor?.username || options?.title || 'إدارة الشات',
    userRole: options?.actor?.role || 'admin',
    userGender: options?.actor?.gender || 'male',
    nameColor: options?.actor?.nameColor || '#B91C1C',
    avatarUrl: options?.actor?.avatarUrl || store.settings.design?.systemAvatarUrl || undefined,
    text,
    textColor: '',
    isBold: false,
    fontSize: 'sm',
    timestamp: Date.now(),
    type: 'system',
    systemKind: options?.systemKind || 'notice',
    roomLabel: options?.roomLabel,
    noticeLabel: options?.noticeLabel,
    modActorName: options?.modActorName,
    modReason: options?.modReason,
    moveTargetRoomId: options?.moveTargetRoomId,
    imageUrl: options?.imageUrl,
    isRoyalEntry: options?.isRoyalEntry,
    royalEntryText: options?.royalEntryText,
  };
}

function addSystemMessage(
  roomId: string,
  text: string,
  options?: {
    systemKind?: 'join' | 'leave' | 'move' | 'kick' | 'ban' | 'notice' | 'dedication';
    actor?: ChatUser;
    roomLabel?: string;
    noticeLabel?: string;
    modActorName?: string;
    modReason?: string;
    moveTargetRoomId?: string;
    title?: string;
    imageUrl?: string;
    isRoyalEntry?: boolean;
    royalEntryText?: string;
  }
) {
  const msg = createSystemMessage(roomId, text, options);
  appendRoomMessage(roomId, msg);
  scheduleSave();
  broadcastToRoom(roomId, { type: 'chat:message', message: msg });
}

function announceRoyalEntry(
  roomId: string,
  user: ChatUser,
  roomName: string,
  messageText?: string,
  options?: { noticeLabel?: string }
) {
  const phrase = user.royalEntryText?.trim() || DEFAULT_ROYAL_ENTRY_TEXT;
  addSystemMessage(roomId, messageText || `دخول ملكي مهيب لـ ${user.username} في ${roomName}`, {
    systemKind: 'join',
    actor: user,
    roomLabel: roomName,
    noticeLabel: options?.noticeLabel,
    isRoyalEntry: true,
    royalEntryText: phrase,
  });
  broadcastToRoom(roomId, {
    type: 'royal:entry',
    user: {
      ...user,
      likesCount: getOrCreateUserStats(user.id).likesCount,
    },
    roomId,
    roomName,
    royalEntryText: phrase,
    timestamp: Date.now(),
  });
}

function announceRoomJoin(
  roomId: string,
  user: ChatUser,
  customText?: string,
  options?: { noticeLabel?: string }
) {
  if (user.isGhost) return;
  const roomName = store.rooms.find((r) => r.id === roomId)?.name || 'الغرفة العامة';
  if (user.royalEntry) {
    announceRoyalEntry(roomId, user, roomName, customText, options);
    return;
  }
  addSystemMessage(roomId, customText || `دخل ${user.username} إلى ${roomName}.`, {
    systemKind: 'join',
    actor: user,
    roomLabel: roomName,
    noticeLabel: options?.noticeLabel,
  });
}

function announceRoomMove(fromRoomId: string, toRoomId: string, user: ChatUser) {
  if (user.isGhost || fromRoomId === toRoomId) return;
  const toRoomName = store.rooms.find((r) => r.id === toRoomId)?.name || 'الغرفة العامة';
  addSystemMessage(fromRoomId, `انتقل ${user.username} إلى ${toRoomName}.`, {
    systemKind: 'move',
    actor: user,
    roomLabel: toRoomName,
    moveTargetRoomId: toRoomId,
  });
  if (user.royalEntry) {
    announceRoyalEntry(
      toRoomId,
      user,
      toRoomName,
      `انتقل ${user.username} بدخول ملكي إلى ${toRoomName}`
    );
  } else {
    announceRoomJoin(toRoomId, user, `انتقل ${user.username} إلى ${toRoomName}.`);
  }
}

function announceRoomLeave(
  roomId: string,
  user: ChatUser,
  customText?: string,
  options?: { noticeLabel?: string }
) {
  if (user.isGhost || roomId === SPACE_ROOM_ID) return;
  const roomName = store.rooms.find((r) => r.id === roomId)?.name || 'الغرفة العامة';
  addSystemMessage(roomId, customText || `غادر ${user.username} ${roomName}.`, {
    systemKind: 'leave',
    title: user.username,
    actor: user,
    roomLabel: roomName,
    noticeLabel: options?.noticeLabel,
  });
}

function announceRoomKick(roomId: string, targetUser: ChatUser, actorName: string) {
  if (roomId === SPACE_ROOM_ID) return;
  const roomName = store.rooms.find((r) => r.id === roomId)?.name || 'الغرفة العامة';
  addSystemMessage(roomId, `تم طرد ${targetUser.username} من ${roomName} بواسطة ${actorName}.`, {
    systemKind: 'kick',
    title: targetUser.username,
    actor: targetUser,
    roomLabel: roomName,
    modActorName: actorName,
  });
}

function announceRoomBan(roomId: string, targetUser: ChatUser, actorName: string, reason?: string) {
  if (roomId === SPACE_ROOM_ID) return;
  const roomName = store.rooms.find((r) => r.id === roomId)?.name || 'الغرفة العامة';
  addSystemMessage(
    roomId,
    `تم حظر ${targetUser.username} من الدردشة بواسطة ${actorName}${reason ? ` (${reason})` : ''}.`,
    {
      systemKind: 'ban',
      title: targetUser.username,
      actor: targetUser,
      roomLabel: roomName,
      modActorName: actorName,
      modReason: reason,
    }
  );
}

function containsBannedWord(text: string): string | null {
  if (!text || store.bannedWords.length === 0) return null;
  const lower = text.toLowerCase();
  for (const word of store.bannedWords) {
    if (word && lower.includes(word.toLowerCase())) {
      return word;
    }
  }
  return null;
}

function isUserBanned(usernameLower: string): BannedEntry | undefined {
  return store.bans.find((b) => b.usernameLower === usernameLower);
}

function pushAdminLog(actorName: string, action: string, target: string) {
  store.auditLogs.unshift({
    id: `log-${crypto.randomUUID()}`,
    actorName,
    action,
    target,
    timestamp: Date.now(),
  });
  if (store.auditLogs.length > 100) {
    store.auditLogs = store.auditLogs.slice(0, 100);
  }
}

function canDo(user: Pick<ChatUser, 'role' | 'customPermissions'> | null | undefined, key: PermissionKey): boolean {
  return hasUserPermission(user, store.settings, key);
}

function sanitizeCustomPermissions(input: unknown): Partial<RolePermissionSet> | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const out: Partial<RolePermissionSet> = {};
  const obj = input as Record<string, unknown>;
  for (const meta of PERMISSION_CATALOG) {
    if (typeof obj[meta.key] === 'boolean') {
      out[meta.key] = obj[meta.key] as boolean;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function buildAdminStatePayload(): AdminStatePayload {
  const allOnlineUsers = Array.from(getOnlineUsersMap(true).values());
  const onlineIds = new Set(allOnlineUsers.map((u) => u.id));
  const bannedSet = new Set(store.bans.map((b) => b.usernameLower));
  const registeredUsers: RegisteredUserSummary[] = store.accounts.map((a) => ({
    id: a.id,
    username: a.username,
    role: a.role,
    gender: a.gender,
    nameColor: a.nameColor,
    avatarUrl: a.avatarUrl || `dicebear:adventurer:${a.username}`,
    country: a.country,
    isMuted: a.isMuted,
    isBanned: bannedSet.has(a.usernameLower),
    royalEntry: Boolean(a.royalEntry),
    royalEntryText: a.royalEntryText,
    likesCount: getOrCreateUserStats(a.id).likesCount,
    customPermissions: a.customPermissions,
    demoTalkControlEnabled: Boolean(a.demoTalkControlEnabled),
    lastIp: a.lastIp,
    lastDevice: a.lastDevice,
    createdAt: a.createdAt,
  }));
  const onlineIpMap: Record<string, { ip: string; deviceSummary: string }> = {};
  for (const u of allOnlineUsers) {
    if (u.id.startsWith('demo-member-test')) {
      onlineIpMap[u.id] = { ip: 'داخلي (عضو تجريبي)', deviceSummary: 'حساب تجريبي داخلي' };
      continue;
    }
    let resolvedIp = '';
    let resolvedDevice = '';
    for (const c of clients.values()) {
      if (c.userId === u.id && c.ip && c.ip !== 'غير معروف') {
        resolvedIp = c.ip;
        resolvedDevice = c.deviceSummary || '';
        break;
      }
    }
    if (!resolvedIp) {
      const sess = [...store.sessions].reverse().find((s) => s.userId === u.id && s.ip);
      if (sess?.ip) {
        resolvedIp = sess.ip;
        resolvedDevice = sess.deviceSummary || resolvedDevice;
      }
    }
    if (!resolvedIp) {
      const acc = store.accounts.find((a) => a.id === u.id);
      if (acc?.lastIp) {
        resolvedIp = acc.lastIp;
        resolvedDevice = acc.lastDevice || resolvedDevice;
      }
    }
    if (resolvedIp) {
      onlineIpMap[u.id] = {
        ip: resolvedIp,
        deviceSummary: resolvedDevice || 'متصفح غير محدد',
      };
    }
  }
  const nickHistory: NickAccessRecord[] = store.nickHistory
    .slice(0, 400)
    .map((r) => ({
      ...r,
      isOnline: onlineIds.has(r.userId),
    }));
  const totalMessagesCount = Object.values(store.messagesByRoom).reduce(
    (sum, list) => sum + list.length,
    0
  );
  return {
    settings: store.settings,
    allOnlineUsers,
    registeredUsers,
    bans: store.bans,
    bannedWords: store.bannedWords,
    auditLogs: store.auditLogs,
    totalMessagesCount,
    nickHistory,
    onlineIpMap,
  };
}

function buildNickRevealPayload(targetUserId: string): NickRevealPayload | null {
  const onlineUser = getOnlineUsersMap(true).get(targetUserId);
  const account = store.accounts.find((a) => a.id === targetUserId);
  const latestSession = [...store.sessions].reverse().find((s) => s.userId === targetUserId);
  const latestHist = store.nickHistory.find((r) => r.userId === targetUserId);

  if (!onlineUser && !account && !latestSession && !latestHist) {
    return null;
  }

  const isVirtualDemo = targetUserId.startsWith('demo-member-test');
  let targetIp = '';
  let targetDevice = '';

  if (isVirtualDemo) {
    targetIp = 'داخلي (عضو تجريبي)';
    targetDevice = 'حساب تجريبي داخلي';
  } else {
    for (const c of clients.values()) {
      if (c.userId === targetUserId && c.ip && c.ip !== 'غير معروف') {
        targetIp = c.ip;
        targetDevice = c.deviceSummary || '';
        break;
      }
    }
    if (!targetIp && latestSession?.ip) {
      targetIp = latestSession.ip;
      targetDevice = latestSession.deviceSummary || targetDevice;
    }
    if (!targetIp && account?.lastIp) {
      targetIp = account.lastIp;
      targetDevice = account.lastDevice || targetDevice;
    }
    if (!targetIp && latestHist?.ip) {
      targetIp = latestHist.ip;
      targetDevice = latestHist.deviceSummary || targetDevice;
    }
  }

  const finalIp = targetIp || 'غير متوفر بعد';
  const finalDevice = targetDevice || account?.lastDevice || latestHist?.deviceSummary || 'متصفح غير محدد';
  const onlineIds = new Set(getOnlineUsersMap(true).keys());

  const hasSearchableIp =
    finalIp !== 'غير متوفر بعد' && finalIp !== 'غير معروف' && !finalIp.startsWith('داخلي');

  const linkedNicks: NickAccessRecord[] = store.nickHistory
    .filter((r) => r.userId === targetUserId || (hasSearchableIp && r.ip === finalIp))
    .map((r) => ({
      ...r,
      isOnline: onlineIds.has(r.userId),
    }))
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt);

  return {
    targetUserId,
    username: onlineUser?.username || account?.username || latestSession?.profile.username || latestHist?.username || targetUserId,
    isGuest: onlineUser?.isGuest ?? latestSession?.isGuest ?? (account ? false : latestHist?.isGuest ?? true),
    role: onlineUser?.role || account?.role || latestSession?.profile.role || latestHist?.role || 'visitor',
    ip: finalIp,
    deviceSummary: finalDevice,
    lastSeenAt: latestHist?.lastSeenAt || onlineUser?.joinedAt || account?.createdAt,
    linkedNicks,
  };
}

function broadcastAdminStateToStaff() {
  const payload = buildAdminStatePayload();
  for (const client of clients.values()) {
    const session = getSessionByToken(client.token);
    if (session && canDo(session.profile, 'canAccessAdminPanel')) {
      sendToSocket(client.ws, { type: 'admin:state', data: payload });
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '16mb' }));

  app.get('/api/bootstrap', (_req, res) => {
    const rooms = getRoomsWithCounts();
    const onlineList = Array.from(getOnlineUsersMap().values());
    const onlinePreview = onlineList.slice(0, 20).map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      gender: u.gender,
      nameColor: u.nameColor,
      avatarUrl: u.avatarUrl,
      coverUrl: u.coverUrl,
      likesCount: getOrCreateUserStats(u.id).likesCount,
      statusText: u.statusText,
      statusIcon: u.statusIcon,
      giftIcon: u.giftIcon,
      giftImageUrl: u.giftImageUrl,
      giftLabel: u.giftLabel,
      bio: u.bio,
      country: u.country,
      roomId: u.roomId,
    }));
    res.json({
      rooms,
      totalOnline: onlineList.length,
      wallCount: store.wallPosts.length,
      settings: store.settings,
      onlinePreview,
      wallPreview: store.wallPosts.slice(0, 6),
    });
  });

  app.get('/robots.txt', (req, res) => {
    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    res.type('text/plain; charset=utf-8');
    res.send(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${baseUrl}/sitemap.xml\n`);
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    const lastmod = new Date().toISOString().split('T')[0];
    res.type('application/xml; charset=utf-8');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
  });

  const ytSearchCache = new Map<string, { expiresAt: number; results: YouTubeSearchResult[] }>();

  function extractTextFromYtRuns(field: unknown): string {
    if (!field || typeof field !== 'object') return '';
    const f = field as { simpleText?: string; runs?: Array<{ text?: string }> };
    if (typeof f.simpleText === 'string') return f.simpleText;
    if (Array.isArray(f.runs)) {
      return f.runs.map((r) => (typeof r?.text === 'string' ? r.text : '')).join('');
    }
    return '';
  }

  function extractYtVideoRenderers(node: unknown, out: YouTubeSearchResult[], seen: Set<string>): void {
    if (!node || typeof node !== 'object' || out.length >= 12) return;
    if (Array.isArray(node)) {
      for (const item of node) {
        extractYtVideoRenderers(item, out, seen);
        if (out.length >= 12) break;
      }
      return;
    }
    const rec = node as Record<string, unknown>;
    const vr = rec.videoRenderer as Record<string, unknown> | undefined;
    if (vr && typeof vr.videoId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(vr.videoId)) {
      const videoId = vr.videoId;
      if (!seen.has(videoId)) {
        seen.add(videoId);
        const title = extractTextFromYtRuns(vr.title).trim();
        const channel = extractTextFromYtRuns(vr.ownerText || vr.longBylineText || vr.shortBylineText).trim();
        const duration = extractTextFromYtRuns(vr.lengthText).trim();
        const viewsText = extractTextFromYtRuns(vr.shortViewCountText || vr.viewCountText).trim() || undefined;
        const thumbArr = (vr.thumbnail as { thumbnails?: Array<{ url?: string }> } | undefined)?.thumbnails;
        const rawThumb = Array.isArray(thumbArr) && thumbArr.length > 0 ? thumbArr[thumbArr.length - 1]?.url : '';
        const thumbnail =
          typeof rawThumb === 'string' && rawThumb.startsWith('http')
            ? rawThumb
            : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        if (title) {
          out.push({
            videoId,
            title,
            channel: channel || 'YouTube',
            duration,
            thumbnail,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            viewsText,
          });
        }
      }
      return;
    }
    for (const key of Object.keys(rec)) {
      if (out.length >= 12) break;
      extractYtVideoRenderers(rec[key], out, seen);
    }
  }

  app.get('/api/youtube/search', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token || !getSessionByToken(token)) {
      return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً للبحث في يوتيوب.' });
    }

    const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
    const q = sanitizeText(rawQuery, 100).trim();
    if (q.length < 2) {
      return res.status(400).json({ error: 'يرجى كتابة حرفين على الأقل للبحث عن الأغنية.' });
    }

    const cacheKey = q.toLowerCase();
    const cached = ytSearchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ results: cached.results });
    }

    try {
      const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=ar&gl=IQ`;
      const ytRes = await fetch(ytUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept-Language': 'ar,en;q=0.9',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!ytRes.ok) {
        return res.status(502).json({ error: 'تعذر الوصول إلى نتائج يوتيوب حالياً.' });
      }

      const html = await ytRes.text();
      const match =
        html.match(/var ytInitialData = (\{.*?\});<\/script>/s) ||
        html.match(/window\["ytInitialData"\]\s*=\s*(\{.*?\});<\/script>/s);

      if (!match?.[1]) {
        return res.status(502).json({ error: 'تعذر قراءة نتائج البحث من يوتيوب.' });
      }

      const initialData = JSON.parse(match[1]) as unknown;
      const results: YouTubeSearchResult[] = [];
      extractYtVideoRenderers(initialData, results, new Set<string>());

      if (ytSearchCache.size > 150) {
        const firstKey = ytSearchCache.keys().next().value;
        if (firstKey) ytSearchCache.delete(firstKey);
      }
      ytSearchCache.set(cacheKey, { expiresAt: Date.now() + 5 * 60 * 1000, results });

      return res.json({ results });
    } catch {
      return res.status(502).json({ error: 'انتهت مهلة الاتصال بيوتيوب، يرجى المحاولة مرة أخرى.' });
    }
  });

  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: getRoomsWithCounts() });
  });

  app.post('/api/auth/guest', (req, res) => {
    if (store.settings.maintenanceMode) {
      return res.status(503).json({ error: 'الموقع في وضع الصيانة حالياً. الدخول متاح للإدارة فقط.' });
    }
    if (!store.settings.allowGuestLogin) {
      return res.status(403).json({ error: 'دخول الزوار مغلق حالياً من قبل الإدارة. يرجى تسجيل الدخول بعضوية.' });
    }
    const onlineUsers = Array.from(getOnlineUsersMap(true).values());
    const activeGuests = onlineUsers.filter((u) => u.isGuest).length;
    const maxGuests = store.settings.maxGuests ?? 100;
    if (activeGuests >= maxGuests) {
      return res.status(403).json({ error: `تم بلوغ الحد الأقصى للزوار (${maxGuests}). يرجى المحاولة لاحقاً أو تسجيل عضوية.` });
    }
    const username = sanitizeText(req.body?.username, 24);
    const gender: UserGender = req.body?.gender === 'female' ? 'female' : 'male';
    const nameColor = sanitizeColor(req.body?.nameColor, gender === 'female' ? '#BE185D' : '#0F766E');
    const country = sanitizeText(req.body?.country, 24) || 'العراق';

    if (username.length < 2) {
      return res.status(400).json({ error: 'يجب أن يكون الاسم المستعار مكوناً من حرفين على الأقل.' });
    }

    const lower = username.toLowerCase();
    const ban = isUserBanned(lower);
    if (ban) {
      return res.status(403).json({ error: `هذا الاسم محظور من دخول الدردشة. السبب: ${ban.reason || 'مخالفة القوانين'}` });
    }
    const takenByAccount = store.accounts.some((a) => a.usernameLower === lower);
    if (takenByAccount) {
      return res.status(409).json({ error: 'هذا الاسم محجوز لعضو مسجل. يرجى اختيار اسم آخر أو تسجيل الدخول.' });
    }

    if (onlineUsers.some((u) => u.username.toLowerCase() === lower)) {
      return res.status(409).json({ error: 'هذا الاسم مستخدم حالياً في الدردشة. اختر اسماً آخر.' });
    }

    const userId = `guest-${crypto.randomUUID()}`;
    const token = crypto.randomBytes(24).toString('hex');
    const avatarUrl = sanitizeAvatarUrl(req.body?.avatarUrl, username);
    const profile: ChatUser = {
      id: userId,
      username,
      isGuest: true,
      role: 'visitor',
      gender,
      nameColor,
      statusText: 'متواجد للدردشة',
      bio: 'زائر جديد في عراقية شات',
      avatarSymbol: gender === 'female' ? '🌸' : '🌙',
      avatarUrl,
      roomId: 'general',
      joinedAt: Date.now(),
      isMuted: false,
      country,
    };

    const clientIp = extractClientIp(req);
    const deviceSummary = extractDeviceSummary(req.headers['user-agent']);
    store.sessions.push({
      token,
      userId,
      isGuest: true,
      profile,
      ip: clientIp,
      deviceSummary,
      createdAt: Date.now(),
    });
    recordNickAccess({
      userId,
      username,
      isGuest: true,
      role: 'visitor',
      nameColor,
      country,
      ip: clientIp,
      deviceSummary,
      roomId: 'general',
    });
    scheduleSave();

    return res.json({ token, user: profile });
  });

  app.post('/api/auth/register', (req, res) => {
    const hasRealAdmin = store.accounts.some((a) => a.role === 'admin');
    if (hasRealAdmin && store.settings.maintenanceMode) {
      return res.status(503).json({ error: 'الموقع في وضع الصيانة حالياً. التسجيل متوقف مؤقتاً.' });
    }
    if (hasRealAdmin && store.settings.allowRegistration === false) {
      return res.status(403).json({ error: 'تم إيقاف تسجيل العضويات الجديدة مؤقتاً من قبل الإدارة.' });
    }
    const username = sanitizeText(req.body?.username, 24);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const gender: UserGender = req.body?.gender === 'female' ? 'female' : 'male';
    const nameColor = sanitizeColor(req.body?.nameColor, gender === 'female' ? '#BE185D' : '#0F766E');
    const country = sanitizeText(req.body?.country, 24) || 'العراق';

    if (username.length < 2) {
      return res.status(400).json({ error: 'يجب أن يكون اسم العضوية مكوناً من حرفين على الأقل.' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'يجب أن تتكون كلمة المرور من 4 أحرف على الأقل.' });
    }

    const lower = username.toLowerCase();
    const ban = isUserBanned(lower);
    if (ban) {
      return res.status(403).json({ error: `هذا الاسم محظور من التسجيل. السبب: ${ban.reason || 'مخالفة القوانين'}` });
    }
    if (store.accounts.some((a) => a.usernameLower === lower)) {
      return res.status(409).json({ error: 'اسم العضوية مسجل مسبقاً. يرجى اختيار اسم آخر.' });
    }

    const { hash, salt } = hashPassword(password);
    // First real registered user on the platform becomes admin so site administration works cleanly
    const role: UserRole = !hasRealAdmin ? 'admin' : 'member';
    const userId = `user-${crypto.randomUUID()}`;

    const avatarUrl = sanitizeAvatarUrl(req.body?.avatarUrl, username);

    const account: RegisteredAccount = {
      id: userId,
      username,
      usernameLower: lower,
      passwordHash: hash,
      passwordSalt: salt,
      role,
      gender,
      nameColor,
      statusText: role === 'admin' ? 'إدارة الديوان' : 'عضو في عراقية شات',
      bio: 'مرحباً بكم في ملفي الشخصي',
      avatarSymbol: role === 'admin' ? '👑' : gender === 'female' ? '✨' : '🦅',
      avatarUrl,
      country,
      isMuted: false,
      createdAt: Date.now(),
    };

    store.accounts.push(account);

    const token = crypto.randomBytes(24).toString('hex');
    const profile: ChatUser = {
      id: account.id,
      username: account.username,
      isGuest: false,
      role: account.role,
      gender: account.gender,
      nameColor: account.nameColor,
      statusText: account.statusText,
      bio: account.bio,
      avatarSymbol: account.avatarSymbol,
      avatarUrl: account.avatarUrl,
      roomId: 'general',
      joinedAt: Date.now(),
      isMuted: false,
      country: account.country,
    };

    const clientIp = extractClientIp(req);
    const deviceSummary = extractDeviceSummary(req.headers['user-agent']);
    account.lastIp = clientIp !== 'غير معروف' ? clientIp : undefined;
    account.lastDevice = deviceSummary;

    store.sessions.push({
      token,
      userId,
      isGuest: false,
      profile,
      ip: clientIp,
      deviceSummary,
      createdAt: Date.now(),
    });
    recordNickAccess({
      userId,
      username: account.username,
      isGuest: false,
      role: account.role,
      nameColor: account.nameColor,
      country: account.country,
      ip: clientIp,
      deviceSummary,
      roomId: 'general',
    });
    scheduleSave();

    return res.json({ token, user: profile });
  });

  app.post('/api/auth/login', (req, res) => {
    const username = sanitizeText(req.body?.username, 24);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const lower = username.toLowerCase();

    const account = store.accounts.find((a) => a.usernameLower === lower);
    if (!account || !verifyPassword(password, account.passwordSalt, account.passwordHash)) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
    }
    if (store.settings.maintenanceMode && account.role !== 'admin') {
      return res.status(503).json({ error: 'الموقع في وضع الصيانة حالياً. الدخول متاح للإدارة فقط.' });
    }
    const ban = isUserBanned(lower);
    if (ban) {
      return res.status(403).json({ error: `تم حظر حسابك من الدخول. السبب: ${ban.reason || 'مخالفة القوانين'}` });
    }

    const wantsGhost = Boolean(req.body?.ghost);
    const token = crypto.randomBytes(24).toString('hex');
    const profile: ChatUser = {
      id: account.id,
      username: account.username,
      isGuest: false,
      role: account.role,
      gender: account.gender,
      nameColor: account.nameColor,
      textColor: account.textColor,
      bgColor: account.bgColor,
      statusColor: account.statusColor,
      statusIcon: account.statusIcon,
      giftIcon: account.giftIcon,
      giftImageUrl: account.giftImageUrl,
      giftLabel: account.giftLabel,
      pmDisabled: account.pmDisabled,
      socialLinks: account.socialLinks,
      customPermissions: account.customPermissions,
      statusText: account.statusText,
      bio: account.bio,
      avatarSymbol: account.avatarSymbol,
      avatarUrl: account.avatarUrl || `dicebear:adventurer:${account.username}`,
      coverUrl: account.coverUrl,
      roomId: 'general',
      joinedAt: Date.now(),
      isMuted: account.isMuted,
      isGhost: account.role === 'admin' && wantsGhost,
      royalEntry: account.royalEntry,
      royalEntryText: account.royalEntryText,
      country: account.country,
    };

    const clientIp = extractClientIp(req);
    const deviceSummary = extractDeviceSummary(req.headers['user-agent']);
    account.lastIp = clientIp !== 'غير معروف' ? clientIp : account.lastIp;
    account.lastDevice = deviceSummary;

    store.sessions.push({
      token,
      userId: account.id,
      isGuest: false,
      profile,
      ip: clientIp,
      deviceSummary,
      createdAt: Date.now(),
    });
    recordNickAccess({
      userId: account.id,
      username: account.username,
      isGuest: false,
      role: account.role,
      nameColor: account.nameColor,
      country: account.country,
      ip: clientIp,
      deviceSummary,
      roomId: 'general',
    });
    scheduleSave();

    return res.json({ token, user: profile });
  });

  app.get('/api/auth/session', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return res.status(401).json({ error: 'لا توجد جلسة نشطة' });
    }
    const session = getSessionByToken(token);
    if (!session) {
      return res.status(401).json({ error: 'انتهت صلاحية الجلسة' });
    }
    const ban = isUserBanned(session.profile.username.toLowerCase());
    if (ban) {
      return res.status(403).json({ error: `تم حظر هذا الحساب. السبب: ${ban.reason || 'مخالفة القوانين'}` });
    }
    const sessionIp = extractClientIp(req);
    const sessionDevice = extractDeviceSummary(req.headers['user-agent']);
    if (sessionIp !== 'غير معروف') {
      const changed = session.ip !== sessionIp;
      session.ip = sessionIp;
      session.deviceSummary = sessionDevice;
      const alreadyRecorded = store.nickHistory.some(
        (r) =>
          r.userId === session.userId &&
          r.ip === sessionIp &&
          r.username.toLowerCase() === session.profile.username.toLowerCase()
      );
      if (changed || !alreadyRecorded) {
        recordNickAccess({
          userId: session.userId,
          username: session.profile.username,
          isGuest: session.isGuest,
          role: session.profile.role,
          nameColor: session.profile.nameColor,
          country: session.profile.country,
          ip: sessionIp,
          deviceSummary: sessionDevice,
          roomId: session.profile.roomId || 'general',
        });
        scheduleSave();
      }
    }
    // Sync registered profile fields
    if (!session.isGuest) {
      const account = store.accounts.find((a) => a.id === session.userId);
      if (account) {
        session.profile = {
          ...session.profile,
          username: account.username,
          role: account.role,
          gender: account.gender,
          nameColor: account.nameColor,
          textColor: account.textColor,
          bgColor: account.bgColor,
          statusColor: account.statusColor,
          statusIcon: account.statusIcon,
          pmDisabled: account.pmDisabled,
          socialLinks: account.socialLinks,
          customPermissions: account.customPermissions,
          statusText: account.statusText,
          bio: account.bio,
          avatarSymbol: account.avatarSymbol,
          avatarUrl: account.avatarUrl || `dicebear:adventurer:${account.username}`,
          coverUrl: account.coverUrl,
          isMuted: account.isMuted,
          royalEntry: account.royalEntry,
          royalEntryText: account.royalEntryText,
          country: account.country,
        };
      }
    }
    if (store.settings.maintenanceMode && session.profile.role !== 'admin') {
      return res.status(503).json({ error: 'الموقع في وضع الصيانة حالياً. الدخول متاح للإدارة فقط.' });
    }
    return res.json({ token, user: session.profile });
  });

  app.get('/api/admin/backup', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const session = token ? getSessionByToken(token) : undefined;
    if (!session || (session.profile.role !== 'admin' && !canDo(session.profile, 'canManageSettings'))) {
      return res.status(403).json({ error: 'تصدير النسخة الاحتياطية متاح للإدارة فقط.' });
    }
    const safeBackup = {
      exportedAt: new Date().toISOString(),
      settings: store.settings,
      rooms: store.rooms.map(({ password: _pw, ...r }) => ({ ...r, hasPassword: Boolean(_pw) })),
      accounts: store.accounts.map(({ passwordHash: _h, passwordSalt: _s, ...a }) => a),
      bans: store.bans,
      bannedWords: store.bannedWords,
      wallPosts: store.wallPosts,
      userStats: store.userStats,
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="iraqiachat-backup-${Date.now()}.json"`);
    return res.send(JSON.stringify(safeBackup, null, 2));
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true, maxPayload: 20 * 1024 * 1024 });

  server.on('upgrade', (req, socket, head) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      if (url.pathname === '/ws') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      }
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req) => {
    socketNetworkInfo.set(ws, {
      ip: extractClientIp(req),
      deviceSummary: extractDeviceSummary(req?.headers['user-agent']),
    });

    ws.on('pong', () => {
      const client = clients.get(ws);
      if (client) client.isAlive = true;
    });

    ws.on('message', (rawData) => {
      let event: WSClientEvent;
      try {
        event = JSON.parse(rawData.toString());
      } catch {
        return;
      }

      if (event.type === 'auth:hello') {
        const session = getSessionByToken(event.token);
        if (!session) {
          sendToSocket(ws, { type: 'error:notice', message: 'انتهت الجلسة، يرجى إعادة الدخول.' });
          ws.close();
          return;
        }
        const ban = isUserBanned(session.profile.username.toLowerCase());
        if (ban) {
          sendToSocket(ws, {
            type: 'mod:notice',
            message: `تم حظرك من الدردشة. السبب: ${ban.reason || 'مخالفة القوانين'}`,
            kicked: true,
          });
          ws.close();
          return;
        }

        const requestedRoomId = store.rooms.some((r) => r.id === event.roomId)
          ? event.roomId
          : 'general';
        session.profile.roomId = requestedRoomId;

        const netInfo = socketNetworkInfo.get(ws);
        const wsIp = netInfo?.ip && netInfo.ip !== 'غير معروف' ? netInfo.ip : session.ip || 'غير معروف';
        const wsDevice =
          netInfo?.deviceSummary && netInfo.deviceSummary !== 'متصفح غير محدد'
            ? netInfo.deviceSummary
            : session.deviceSummary || 'متصفح غير محدد';

        if (wsIp !== 'غير معروف') {
          const hadEntryForIpAndNick = store.nickHistory.some(
            (r) =>
              r.userId === session.userId &&
              r.ip === wsIp &&
              r.username.toLowerCase() === session.profile.username.toLowerCase()
          );
          session.ip = wsIp;
          session.deviceSummary = wsDevice;
          if (!hadEntryForIpAndNick) {
            recordNickAccess({
              userId: session.userId,
              username: session.profile.username,
              isGuest: session.isGuest,
              role: session.profile.role,
              nameColor: session.profile.nameColor,
              country: session.profile.country,
              ip: wsIp,
              deviceSummary: wsDevice,
              roomId: requestedRoomId,
            });
            scheduleSave();
          }
        }

        const clientRecord: ConnectedClient = {
          ws,
          userId: session.userId,
          token: session.token,
          roomId: requestedRoomId,
          isInSpace: false,
          lastMessageAt: 0,
          lastPublicActivityAt: Date.now(),
          clientReportedIdle: false,
          isIdle: false,
          isAlive: true,
          ip: wsIp,
          deviceSummary: wsDevice,
        };

        const existingSockets = userSockets.get(session.userId);
        const hadPreviousSocketInRoom = existingSockets
          ? Array.from(existingSockets).some((sWs) => {
              const c = clients.get(sWs);
              return Boolean(c && c.roomId === requestedRoomId && sWs.readyState === WebSocket.OPEN);
            })
          : false;
        clients.set(ws, clientRecord);
        if (!userSockets.has(session.userId)) {
          userSockets.set(session.userId, new Set());
        }
        userSockets.get(session.userId)!.add(ws);

        const onlineUsers = getOnlineUsersForRoom(requestedRoomId, session.profile.role === 'admin');
        const userPms = store.privateMessages.filter(
          (pm) => pm.fromUserId === session.userId || pm.toUserId === session.userId
        );

        sendToSocket(ws, {
          type: 'init:state',
          self: {
            ...session.profile,
            likesCount: getOrCreateUserStats(session.userId).likesCount,
          },
          rooms: getRoomsWithCounts(),
          currentRoomId: requestedRoomId,
          messages: [],
          onlineUsers,
          wallPosts: store.wallPosts,
          privateMessages: userPms.slice(-150),
          notifications: store.notificationsByUser[session.userId] || [],
          settings: store.settings,
          mics: isVoiceEnabledRoom(requestedRoomId) ? getRoomMics(requestedRoomId).map((m) => ({ ...m })) : [],
          micRequests: isVoiceEnabledRoom(requestedRoomId) ? [...getRoomMicRequests(requestedRoomId)] : [],
          topStars: getTopStars(),
          activeQuiz: getPublicQuiz(requestedRoomId),
        });

        if (!session.profile.isGhost) {
          if (requestedRoomId !== SPACE_ROOM_ID) {
            broadcastToRoom(requestedRoomId, {
              type: 'users:update',
              roomId: requestedRoomId,
              onlineUsers,
            });
            broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });

            if (!hadPreviousSocketInRoom) {
              announceRoomJoin(requestedRoomId, session.profile);
            } else {
              const joinedRoomName =
                store.rooms.find((r) => r.id === requestedRoomId)?.name || 'الغرفة العامة';
              sendToSocket(ws, {
                type: 'chat:message',
                message: createSystemMessage(requestedRoomId, `دخل ${session.profile.username} إلى ${joinedRoomName}.`, {
                  systemKind: 'join',
                  actor: session.profile,
                  roomLabel: joinedRoomName,
                  isRoyalEntry: Boolean(session.profile.royalEntry),
                  royalEntryText: session.profile.royalEntry
                    ? session.profile.royalEntryText?.trim() || DEFAULT_ROYAL_ENTRY_TEXT
                    : undefined,
                }),
              });
            }
          } else {
            broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
          }
        } else if (requestedRoomId !== SPACE_ROOM_ID) {
          broadcastRoomUsersUpdate(requestedRoomId, true);
        }
        broadcastAdminStateToStaff();
        return;
      }

      const client = clients.get(ws);
      if (!client) {
        sendToSocket(ws, { type: 'error:notice', message: 'يرجى تسجيل الدخول أولاً.' });
        return;
      }
      const session = getSessionByToken(client.token);
      if (!session) return;

      if (event.type === 'room:join') {
        const targetRoom = store.rooms.find((r) => r.id === event.roomId);
        if (!targetRoom) return;
        const prevRoomId = client.roomId;
        const wasInSpace = Boolean(client.isInSpace);
        const canSeeGhosts = session.profile.role === 'admin';
        if (prevRoomId === targetRoom.id) {
          if (!client.isInSpace) return;
          client.isInSpace = false;
          client.isIdle = false;
          client.clientReportedIdle = false;
          client.lastPublicActivityAt = Date.now();
          sendToSocket(ws, {
            type: 'room:joined',
            roomId: targetRoom.id,
            messages: [],
            onlineUsers: getOnlineUsersForRoom(targetRoom.id, canSeeGhosts),
            mics: isVoiceEnabledRoom(targetRoom.id) ? getRoomMics(targetRoom.id).map((m) => ({ ...m })) : [],
            micRequests: isVoiceEnabledRoom(targetRoom.id) ? [...getRoomMicRequests(targetRoom.id)] : [],
            activeQuiz: getPublicQuiz(targetRoom.id),
          });
          broadcastRoomUsersUpdate(targetRoom.id, Boolean(session.profile.isGhost));
          if (!session.profile.isGhost) {
            announceRoomJoin(targetRoom.id, session.profile, undefined, {
              noticeLabel: 'هذا المستخدم قد دخل من الفضاء',
            });
          }
          return;
        }

        const bypassPassword =
          session.profile.role === 'admin' ||
          canDo(session.profile, 'canManageRooms') ||
          canDo(session.profile, 'canMoveUsers') ||
          targetRoom.createdBy === session.userId;

        if (targetRoom.password && !bypassPassword) {
          const provided = typeof event.password === 'string' ? event.password.trim() : '';
          if (!provided) {
            sendToSocket(ws, {
              type: 'room:passwordRequired',
              roomId: targetRoom.id,
              roomName: targetRoom.name,
            });
            return;
          }
          if (provided !== targetRoom.password) {
            sendToSocket(ws, {
              type: 'room:passwordRequired',
              roomId: targetRoom.id,
              roomName: targetRoom.name,
              error: 'كلمة مرور الغرفة غير صحيحة.',
            });
            return;
          }
        }

        client.roomId = targetRoom.id;
        client.isInSpace = false;
        client.isIdle = false;
        client.clientReportedIdle = false;
        client.lastPublicActivityAt = Date.now();
        session.profile.roomId = targetRoom.id;

        if (removeUserFromRoomMics(prevRoomId, session.userId)) {
          broadcastRoomMics(prevRoomId);
        }

        const prevUsers = getOnlineUsersForRoom(prevRoomId);
        const nextUsers = getOnlineUsersForRoom(targetRoom.id);

        sendToSocket(ws, {
          type: 'room:joined',
          roomId: targetRoom.id,
          messages: [],
          onlineUsers: getOnlineUsersForRoom(targetRoom.id, canSeeGhosts),
          mics: isVoiceEnabledRoom(targetRoom.id) ? getRoomMics(targetRoom.id).map((m) => ({ ...m })) : [],
          micRequests: isVoiceEnabledRoom(targetRoom.id) ? [...getRoomMicRequests(targetRoom.id)] : [],
          activeQuiz: getPublicQuiz(targetRoom.id),
        });

        if (!session.profile.isGhost) {
          if (prevRoomId !== SPACE_ROOM_ID) {
            broadcastToRoom(prevRoomId, { type: 'users:update', roomId: prevRoomId, onlineUsers: prevUsers });
          }
          broadcastToRoom(targetRoom.id, { type: 'users:update', roomId: targetRoom.id, onlineUsers: nextUsers });
          broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
          if (prevRoomId === SPACE_ROOM_ID || wasInSpace) {
            announceRoomJoin(
              targetRoom.id,
              session.profile,
              undefined,
              wasInSpace ? { noticeLabel: 'هذا المستخدم قد دخل من الفضاء' } : undefined
            );
          } else {
            announceRoomMove(prevRoomId, targetRoom.id, session.profile);
          }
        } else {
          if (prevRoomId !== SPACE_ROOM_ID) {
            broadcastRoomUsersUpdate(prevRoomId, true);
          }
          broadcastRoomUsersUpdate(targetRoom.id, true);
        }
        return;
      }

      if (event.type === 'room:exitToSpace') {
        if (client.isInSpace) return;
        client.isInSpace = true;
        client.isIdle = true;

        if (removeUserFromRoomMics(client.roomId, session.userId)) {
          broadcastRoomMics(client.roomId);
        }

        // Stay in the current room view; pause new incoming messages & announce exit to Space
        sendToSocket(ws, {
          type: 'space:state',
          roomId: client.roomId,
          isInSpace: true,
        });
        broadcastRoomUsersUpdate(client.roomId, Boolean(session.profile.isGhost));
        if (!session.profile.isGhost) {
          announceRoomLeave(client.roomId, session.profile, `${session.profile.username} خرج إلى الفضاء.`, {
            noticeLabel: 'هذا المستخدم قد خرج إلى الفضاء',
          });
        }
        return;
      }

      if (event.type === 'room:resumeFromSpace') {
        if (!client.isInSpace) return;
        client.isInSpace = false;
        client.isIdle = false;
        client.clientReportedIdle = false;
        client.lastPublicActivityAt = Date.now();
        sendToSocket(ws, {
          type: 'space:state',
          roomId: client.roomId,
          isInSpace: false,
        });
        broadcastRoomUsersUpdate(client.roomId, Boolean(session.profile.isGhost));
        if (!session.profile.isGhost) {
          announceRoomJoin(client.roomId, session.profile, undefined, {
            noticeLabel: 'هذا المستخدم قد دخل من الفضاء',
          });
        }
        return;
      }

      if (event.type === 'room:create') {
        if (store.settings.allowRoomCreation === false && session.profile.role !== 'admin') {
          sendToSocket(ws, { type: 'error:notice', message: 'إنشاء الغرف متوقف حالياً من قبل الإدارة.' });
          return;
        }
        if (session.profile.isMuted) {
          sendToSocket(ws, { type: 'error:notice', message: 'أنت مكتوم حالياً ولا يمكنك إنشاء غرف جديدة.' });
          return;
        }
        const isVoiceRoom = Boolean(event.isVoiceRoom);
        const voiceMicCount = isVoiceRoom
          ? Math.min(10, Math.max(2, Math.round(Number(event.voiceMicCount) || 6)))
          : undefined;
        const hasStaffRoomPerm =
          canDo(session.profile, 'canCreateRoom') || canDo(session.profile, 'canManageRooms');
        if (!isVoiceRoom && !hasStaffRoomPerm) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية إنشاء غرف جديدة.' });
          return;
        }
        if (isVoiceRoom && !hasStaffRoomPerm) {
          const ownRoomsCount = store.rooms.filter(
            (r) => !r.isDefault && r.createdBy === session.userId
          ).length;
          if (ownRoomsCount >= 2) {
            sendToSocket(ws, {
              type: 'error:notice',
              message: 'يمكنك إنشاء غرفتين صوتيتين مخصصتين كحد أقصى في الوقت نفسه.',
            });
            return;
          }
        }
        const name = sanitizeText(event.name, 36);
        const description = sanitizeText(event.description, 100);
        const topic = sanitizeText(event.topic, 140);
        const password = sanitizeText(event.password, 32);
        const imageUrl = sanitizeImageUrl(event.imageUrl);
        if (name.length < 3) {
          sendToSocket(ws, { type: 'error:notice', message: 'يجب أن يكون اسم الغرفة 3 أحرف على الأقل.' });
          return;
        }
        const id = `room-${crypto.randomUUID().slice(0, 8)}`;
        store.rooms.push({
          id,
          name,
          description: description || (isVoiceRoom ? `غرفة صوتية للتجمع والمحادثة — ${name}` : `غرفة ${name}`),
          topic: topic || (isVoiceRoom ? `أهلاً بكم في الغرفة الصوتية: ${name}` : `أهلاً بكم في ${name}`),
          isDefault: false,
          createdBy: session.userId,
          password: password || undefined,
          imageUrl: imageUrl || '',
          isVoiceRoom: isVoiceRoom || undefined,
          voiceMicCount,
        });
        store.messagesByRoom[id] = [
          {
            id: `sys-${crypto.randomUUID()}`,
            roomId: id,
            userId: 'system',
            username: 'النظام',
            userRole: 'admin',
            userGender: 'male',
            nameColor: '#0F766E',
            text: `تم إنشاء ${isVoiceRoom ? 'الغرفة الصوتية' : 'غرفة'} "${name}" بواسطة ${session.profile.username}.`,
            textColor: '',
            isBold: false,
            fontSize: 'sm',
            timestamp: Date.now(),
            type: 'system',
          },
        ];
        if (isVoiceRoom) {
          getRoomMics(id);
        }
        scheduleSave();

        // Automatically move creator into the newly created room so they can immediately start talking
        const prevRoomId = client.roomId;
        const wasInSpace = Boolean(client.isInSpace);
        if (removeUserFromRoomMics(prevRoomId, session.userId)) {
          broadcastRoomMics(prevRoomId);
        }
        client.roomId = id;
        client.isInSpace = false;
        client.isIdle = false;
        client.clientReportedIdle = false;
        client.lastPublicActivityAt = Date.now();
        session.profile.roomId = id;

        const prevUsers = getOnlineUsersForRoom(prevRoomId);
        const nextUsers = getOnlineUsersForRoom(id);

        broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
        sendToSocket(ws, {
          type: 'room:joined',
          roomId: id,
          messages: [],
          onlineUsers: getOnlineUsersForRoom(id, session.profile.role === 'admin'),
          mics: isVoiceEnabledRoom(id) ? getRoomMics(id).map((m) => ({ ...m })) : [],
          micRequests: isVoiceEnabledRoom(id) ? [...getRoomMicRequests(id)] : [],
          activeQuiz: null,
        });

        if (!session.profile.isGhost) {
          if (prevRoomId !== SPACE_ROOM_ID) {
            broadcastToRoom(prevRoomId, { type: 'users:update', roomId: prevRoomId, onlineUsers: prevUsers });
          }
          if (prevRoomId === SPACE_ROOM_ID || wasInSpace) {
            announceRoomJoin(
              id,
              session.profile,
              undefined,
              wasInSpace ? { noticeLabel: 'هذا المستخدم قد دخل من الفضاء' } : undefined
            );
          } else {
            announceRoomMove(prevRoomId, id, session.profile);
          }
          broadcastToRoom(id, { type: 'users:update', roomId: id, onlineUsers: nextUsers });
        } else {
          if (prevRoomId !== SPACE_ROOM_ID) {
            broadcastRoomUsersUpdate(prevRoomId, true);
          }
          broadcastRoomUsersUpdate(id, true);
        }
        broadcastAdminStateToStaff();
        return;
      }

      if (event.type === 'room:updateTopic') {
        const room = store.rooms.find((r) => r.id === event.roomId);
        if (!room) return;
        const canEdit =
          canDo(session.profile, 'canEditRoomTopic') ||
          canDo(session.profile, 'canManageRooms') ||
          room.createdBy === session.userId;
        if (!canEdit) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تعديل عنوان الغرفة.' });
          return;
        }
        room.topic = sanitizeText(event.topic, 140) || room.topic;
        scheduleSave();
        broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
        return;
      }

      if (event.type === 'room:updateImage') {
        const room = store.rooms.find((r) => r.id === event.roomId);
        if (!room) return;
        const canEdit =
          canDo(session.profile, 'canEditRoomTopic') ||
          canDo(session.profile, 'canManageRooms') ||
          room.createdBy === session.userId;
        if (!canEdit) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تغيير صورة الغرفة.' });
          return;
        }
        const trimmedRaw = typeof event.imageUrl === 'string' ? event.imageUrl.trim() : '';
        if (!trimmedRaw) {
          room.imageUrl = '';
        } else {
          const clean = sanitizeImageUrl(trimmedRaw);
          if (!clean) {
            sendToSocket(ws, { type: 'error:notice', message: 'رابط أو صيغة صورة الغرفة غير صالحة.' });
            return;
          }
          room.imageUrl = clean;
        }
        scheduleSave();
        broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
        return;
      }

      if (event.type === 'room:setMedia') {
        const room = store.rooms.find((r) => r.id === event.roomId);
        if (!room) return;
        const canManage =
          canDo(session.profile, 'canManageRoomMedia') ||
          room.createdBy === session.userId;
        if (!canManage) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تغيير راديو/يوتيوب الغرفة.' });
          return;
        }
        const media = sanitizeMediaInput(event.url, event.title, session.profile.username);
        if (!media) {
          sendToSocket(ws, { type: 'error:notice', message: 'يرجى إدخال رابط يوتيوب أو رابط بث صوتي مباشر صحيح (https).' });
          return;
        }
        room.media = media;
        scheduleSave();
        broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
        broadcastToRoom(room.id, { type: 'room:mediaUpdated', roomId: room.id, media });
        addSystemMessage(room.id, `قام ${session.profile.username} بتشغيل: ${media.title}`, {
          systemKind: 'notice',
          actor: session.profile,
        });
        return;
      }

      if (event.type === 'room:clearMedia') {
        const room = store.rooms.find((r) => r.id === event.roomId);
        if (!room) return;
        const canManage =
          canDo(session.profile, 'canManageRoomMedia') ||
          room.createdBy === session.userId;
        if (!canManage) return;
        room.media = null;
        scheduleSave();
        broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
        broadcastToRoom(room.id, { type: 'room:mediaUpdated', roomId: room.id, media: null });
        return;
      }

      if (event.type === 'room:startQuiz') {
        const room = store.rooms.find((r) => r.id === event.roomId);
        if (!room) return;
        const canManage =
          canDo(session.profile, 'canRunQuiz') ||
          room.createdBy === session.userId;
        if (!canManage) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية إطلاق المسابقات في الغرفة.' });
          return;
        }
        const question = sanitizeText(event.question, 180);
        const answer = sanitizeText(event.answer, 80);
        const answerNormalized = normalizeArabicAnswer(answer);
        if (question.length < 4 || !answerNormalized) {
          sendToSocket(ws, { type: 'error:notice', message: 'يرجى كتابة السؤال والإجابة الصحيحة للمسابقة.' });
          return;
        }
        const rewardLikes = Math.max(5, Math.min(100, Math.round(Number(event.rewardLikes) || 20)));
        const quizRecord: RoomQuiz & { answerNormalized: string } = {
          id: `quiz-${crypto.randomUUID().slice(0, 8)}`,
          roomId: room.id,
          question,
          rewardLikes,
          askedBy: session.profile.username,
          startedAt: Date.now(),
          answerNormalized,
        };
        activeQuizByRoom.set(room.id, quizRecord);
        const { answerNormalized: _hidden, ...publicQuiz } = quizRecord;
        broadcastToRoom(room.id, { type: 'room:quizUpdated', roomId: room.id, quiz: publicQuiz });
        addSystemMessage(
          room.id,
          `مسابقة جديدة (+${rewardLikes} لايك): ${question} — أسرع إجابة صحيحة في الشات تفوز!`,
          { systemKind: 'notice', actor: session.profile }
        );
        return;
      }

      if (event.type === 'room:stopQuiz') {
        const room = store.rooms.find((r) => r.id === event.roomId);
        if (!room) return;
        const canManage =
          canDo(session.profile, 'canRunQuiz') ||
          room.createdBy === session.userId;
        if (!canManage) return;
        if (activeQuizByRoom.delete(room.id)) {
          broadcastToRoom(room.id, { type: 'room:quizUpdated', roomId: room.id, quiz: null });
        }
        return;
      }

      if (event.type === 'chat:dedicate') {
        if (client.isInSpace || client.roomId === SPACE_ROOM_ID) {
          sendToSocket(ws, { type: 'error:notice', message: 'أنت الآن في الفضاء — اضغط العودة من الفضاء لاستئناف الإرسال.' });
          return;
        }
        if (session.profile.isMuted) {
          sendToSocket(ws, { type: 'error:notice', message: 'أنت مكتوم حالياً ولا يمكنك إرسال إهداء.' });
          return;
        }
        if (!canDo(session.profile, 'canSendDedications')) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية إرسال الإهداءات العامة.' });
          return;
        }
        const targetRoomId = store.rooms.some((r) => r.id === event.roomId) ? event.roomId : client.roomId;
        const dedText = sanitizeText(event.text, 220);
        const toUser = sanitizeText(event.toUsername, 28);
        if (!dedText) return;
        if (containsBannedWord(dedText) || containsBannedWord(toUser)) {
          sendToSocket(ws, { type: 'error:notice', message: 'يحتوي الإهداء على كلمة محظورة من قبل الإدارة.' });
          return;
        }
        const isFreeDedication =
          session.profile.role === 'admin' ||
          session.profile.role === 'moderator' ||
          canDo(session.profile, 'canBroadcast');
        if (!isFreeDedication) {
          const stats = getOrCreateUserStats(session.userId);
          if (stats.likesCount < 10) {
            sendToSocket(ws, {
              type: 'error:notice',
              message: `رصيدك (${stats.likesCount} لايك) لا يكفي لإرسال إهداء عام (التكلفة 10 لايكات).`,
            });
            return;
          }
          stats.likesCount -= 10;
          broadcastToAll({ type: 'user:profileStats', stats });
          broadcastToAll({ type: 'leaderboard:update', stars: getTopStars() });
        }
        const formatted = toUser
          ? `إهداء من ${session.profile.username} إلى ${toUser}: ${dedText}`
          : `إهداء عام من ${session.profile.username}: ${dedText}`;
        addSystemMessage(targetRoomId, formatted, {
          systemKind: 'dedication',
          actor: session.profile,
        });
        return;
      }

      if (event.type === 'presence:status') {
        const nextReportedIdle = Boolean(event.isIdle);
        const now = Date.now();
        client.clientReportedIdle = nextReportedIdle;
        if (!nextReportedIdle && !client.isInSpace) {
          client.lastPublicActivityAt = now;
        }
        const computedIdle = computeClientIdle(client, now);
        if (Boolean(client.isIdle) !== computedIdle) {
          client.isIdle = computedIdle;
          broadcastRoomUsersUpdate(client.roomId, Boolean(session.profile.isGhost));
        }
        return;
      }

      if (event.type === 'chat:typing') {
        if (client.isInSpace || client.roomId === SPACE_ROOM_ID) return;
        if (event.isTyping) {
          markClientPublicActive(client, session.profile.isGhost);
        }
        if (session.profile.isGhost) return;
        const minLikesToChat = Math.max(0, Math.round(Number(store.settings.minLikesToChat) || 0));
        const isStaffExempt = session.profile.role === 'admin' || session.profile.role === 'moderator';
        if (minLikesToChat > 0 && !isStaffExempt && getOrCreateUserStats(session.userId).likesCount < minLikesToChat) {
          return;
        }
        broadcastToRoom(
          client.roomId,
          {
            type: 'chat:typing',
            roomId: client.roomId,
            userId: session.userId,
            username: session.profile.username,
            isTyping: Boolean(event.isTyping),
          },
          session.userId
        );
        return;
      }

      if (event.type === 'chat:send') {
        if (client.isInSpace || client.roomId === SPACE_ROOM_ID) {
          sendToSocket(ws, { type: 'error:notice', message: 'أنت الآن في الفضاء — تم إيقاف الكتابة وإرسال الرسائل.' });
          return;
        }
        if (session.profile.isMuted) {
          sendToSocket(ws, { type: 'error:notice', message: 'أنت مكتوم حالياً من قبل الإدارة ولا يمكنك الإرسال في العام.' });
          return;
        }
        if (!canDo(session.profile, 'canChatPublic')) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية الكتابة في الدردشة العامة.' });
          return;
        }
        const minLikesToChat = Math.max(0, Math.round(Number(store.settings.minLikesToChat) || 0));
        const isStaffExempt = session.profile.role === 'admin' || session.profile.role === 'moderator';
        if (minLikesToChat > 0 && !isStaffExempt) {
          const myLikes = getOrCreateUserStats(session.userId).likesCount;
          if (myLikes < minLikesToChat) {
            sendToSocket(ws, {
              type: 'error:notice',
              message: `التحدث في الدردشة العامة يتطلب ${minLikesToChat} لايك على الأقل (لايكاتك الحالية: ${myLikes}).`,
            });
            return;
          }
        }
        const now = Date.now();
        const bypassSlow = canDo(session.profile, 'canBypassSlowMode');
        const minDelayMs = bypassSlow ? 350 : Math.max(450, store.settings.slowModeSeconds * 1000);
        if (now - client.lastMessageAt < minDelayMs) {
          const waitSec = Math.ceil((minDelayMs - (now - client.lastMessageAt)) / 1000);
          sendToSocket(ws, {
            type: 'error:notice',
            message:
              store.settings.slowModeSeconds > 0 && !bypassSlow
                ? `الوضع البطيء مفعّل: يرجى الانتظار ${waitSec} ثانية قبل إرسال رسالة جديدة.`
                : 'يرجى الانتظار لحظة بين كل رسالة وأخرى.',
          });
          return;
        }
        const text = sanitizeText(event.text, 600);
        const imageUrl = sanitizeImageUrl(event.imageUrl);
        const audioUrl = sanitizeAudioUrl(event.audioUrl);
        const audioDuration =
          typeof event.audioDuration === 'number'
            ? Math.max(1, Math.min(30, Math.round(event.audioDuration)))
            : undefined;
        if (imageUrl && ((store.settings.allowImages === false && session.profile.role !== 'admin') || !canDo(session.profile, 'canSendImages'))) {
          sendToSocket(ws, { type: 'error:notice', message: 'إرسال الصور غير متاح لصلاحيتك أو متوقف من الإدارة.' });
          return;
        }
        if (audioUrl && ((store.settings.allowVoiceNotes === false && session.profile.role !== 'admin') || !canDo(session.profile, 'canSendVoice'))) {
          sendToSocket(ws, { type: 'error:notice', message: 'إرسال الرسائل الصوتية غير متاح لصلاحيتك أو متوقف من الإدارة.' });
          return;
        }
        if (!text && !imageUrl && !audioUrl) return;
        if (containsBannedWord(text)) {
          sendToSocket(ws, { type: 'error:notice', message: 'تحتوي رسالتك على كلمة محظورة من قبل الإدارة.' });
          return;
        }

        client.lastMessageAt = now;
        markClientPublicActive(client, session.profile.isGhost);
        const roomId = client.roomId;
        const msg: ChatMessage = {
          id: `msg-${crypto.randomUUID()}`,
          roomId,
          userId: session.userId,
          username: session.profile.username,
          userRole: session.profile.role,
          userGender: session.profile.gender,
          nameColor: session.profile.nameColor,
          avatarUrl: session.profile.avatarUrl,
          text,
          textColor: sanitizeColor(event.textColor, ''),
          isBold: Boolean(event.isBold),
          fontSize: event.fontSize === 'sm' || event.fontSize === 'lg' ? event.fontSize : 'md',
          replyTo: event.replyTo
            ? {
                id: sanitizeText(event.replyTo.id, 64),
                username: sanitizeText(event.replyTo.username, 24),
                text: sanitizeText(event.replyTo.text, 120),
              }
            : undefined,
          imageUrl,
          audioUrl,
          audioDuration,
          timestamp: now,
          type: 'chat',
        };

        appendRoomMessage(roomId, msg);
        scheduleSave();
        broadcastToRoom(roomId, { type: 'chat:message', message: msg });

        // Check if message solves an active room quiz
        const currentQuiz = activeQuizByRoom.get(roomId);
        if (currentQuiz && text && normalizeArabicAnswer(text) === currentQuiz.answerNormalized) {
          activeQuizByRoom.delete(roomId);
          const winnerStats = getOrCreateUserStats(session.userId);
          winnerStats.likesCount += currentQuiz.rewardLikes;
          scheduleSave();
          broadcastToRoom(roomId, { type: 'room:quizUpdated', roomId, quiz: null });
          broadcastToAll({ type: 'user:profileStats', stats: winnerStats });
          broadcastToAll({ type: 'leaderboard:update', stars: getTopStars() });
          addSystemMessage(
            roomId,
            `أحسنت يا ${session.profile.username}! إجابة صحيحة وفزت بـ +${currentQuiz.rewardLikes} لايك 🏆`,
            { systemKind: 'notice', actor: session.profile }
          );
        }

        if (text && text.includes('@')) {
          const onlineMap = getOnlineUsersMap();
          const roomName = store.rooms.find((r) => r.id === roomId)?.name || 'الغرفة';
          const notifiedIds = new Set<string>();
          for (const targetUser of onlineMap.values()) {
            if (targetUser.id === session.userId || notifiedIds.has(targetUser.id)) continue;
            if (text.includes(`@${targetUser.username}`)) {
              notifiedIds.add(targetUser.id);
              pushMemberNotification(targetUser.id, {
                kind: 'mention',
                fromUserId: session.userId,
                fromUsername: session.profile.username,
                fromNameColor: session.profile.nameColor,
                fromAvatarUrl: session.profile.avatarUrl,
                message: `ذكرك في ${roomName}: "${text.slice(0, 80)}"`,
                timestamp: now,
                roomId,
              });
            }
          }
        }

        // Trigger natural Iraqi conversation for virtual demo test members in this room
        if (text && !session.userId.startsWith('demo-member-test')) {
          const onlineMap = getOnlineUsersMap();
          const roomDemoBots = Array.from(virtualOnlineUsers.values()).filter(
            (u) =>
              u.id.startsWith('demo-member-test') &&
              u.demoTalkControlEnabled === true &&
              u.roomId === roomId &&
              !u.isMuted &&
              !u.isGhost
          );
          const isAdminSender = session.profile.role === 'admin';
          let triggeredInRoom = false;

          if (roomDemoBots.length > 0) {
            const roomMsgs = store.messagesByRoom[roomId] || [];
            const stopCmd = isDemoStopCommand(text);
            const farewell = isDemoFarewell(text);

            const directlyCalledBots = roomDemoBots.filter((bot) =>
              doesTextCallDemoBot(text, msg.replyTo, bot, roomDemoBots.length, roomMsgs)
            );

            if (stopCmd) {
              for (const bot of roomDemoBots) {
                const winKey = `${roomId}:${bot.id}:${session.userId}`;
                if (directlyCalledBots.some((b) => b.id === bot.id) || activeDemoChatWindows.has(winKey)) {
                  activeDemoChatWindows.delete(winKey);
                  demoIntimateUsers.delete(`${bot.id}:${session.userId}`);
                }
              }
              triggeredInRoom = true;
            } else if (directlyCalledBots.length > 0) {
              const targetBot = directlyCalledBots[0];
              const winKey = `${roomId}:${targetBot.id}:${session.userId}`;
              const existingWin = activeDemoChatWindows.get(winKey);
              const inActiveWindow =
                Boolean(existingWin) && now - existingWin!.lastInteractionAt <= DEMO_CHAT_WINDOW_MS;
              if (farewell) {
                activeDemoChatWindows.delete(winKey);
              } else {
                activeDemoChatWindows.set(winKey, { lastInteractionAt: now });
              }
              const isIntimate = resolveIntimateMode(targetBot.id, session.userId, text, now, farewell);
              scheduleDemoRoomReply(roomId, msg, targetBot, {
                isFirstCall: !inActiveWindow,
                isFarewell: farewell,
                isIntimate,
              });
              triggeredInRoom = true;
            } else {
              // Continue with the most recently active demo member in this room unless addressing someone else
              let bestBot: ChatUser | null = null;
              let bestTimestamp = 0;
              for (const bot of roomDemoBots) {
                const winKey = `${roomId}:${bot.id}:${session.userId}`;
                const existingWin = activeDemoChatWindows.get(winKey);
                if (
                  existingWin &&
                  now - existingWin.lastInteractionAt <= DEMO_CHAT_WINDOW_MS &&
                  existingWin.lastInteractionAt > bestTimestamp
                ) {
                  bestBot = bot;
                  bestTimestamp = existingWin.lastInteractionAt;
                }
              }

              const bestIsAdminOrder = Boolean(
                bestBot &&
                  isAdminSender &&
                  (looksLikePermissionOrder(text) || parseDemoCommandDeterministic(text, bestBot))
              );
              if (bestBot && (bestIsAdminOrder || !mentionsAnotherUser(text, onlineMap, bestBot.id, session.userId))) {
                const winKey = `${roomId}:${bestBot.id}:${session.userId}`;
                if (farewell) {
                  activeDemoChatWindows.delete(winKey);
                } else {
                  activeDemoChatWindows.set(winKey, { lastInteractionAt: now });
                }
                const isIntimate = resolveIntimateMode(bestBot.id, session.userId, text, now, farewell);
                scheduleDemoRoomReply(roomId, msg, bestBot, {
                  isFirstCall: false,
                  isFarewell: farewell,
                  isIntimate,
                });
                triggeredInRoom = true;
              } else if (
                !bestBot &&
                roomDemoBots.length === 1 &&
                ((isAdminSender &&
                  (looksLikePermissionOrder(text) ||
                    Boolean(parseDemoCommandDeterministic(text, roomDemoBots[0])))) ||
                  (!mentionsAnotherUser(text, onlineMap, roomDemoBots[0].id, session.userId) &&
                    roomId === 'general' &&
                    generalMics.some((s) => s.userId === roomDemoBots[0].id) &&
                    /(?:المايك|للمايك|عالمايك|بالمايك|مايك|صوتك|صوتج)/i.test(text)))
              ) {
                const soleBot = roomDemoBots[0];
                const winKey = `${roomId}:${soleBot.id}:${session.userId}`;
                activeDemoChatWindows.set(winKey, { lastInteractionAt: now });
                scheduleDemoRoomReply(roomId, msg, soleBot, {
                  isFirstCall: false,
                  isFarewell: false,
                  isIntimate: false,
                });
                triggeredInRoom = true;
              }
            }
          }

          // Cross-room fallback: allow Admin to explicitly command an enabled demo bot residing in another room
          if (!triggeredInRoom && isAdminSender) {
            const otherEnabledBots = Array.from(virtualOnlineUsers.values()).filter(
              (u) =>
                u.id.startsWith('demo-member-test') &&
                u.demoTalkControlEnabled === true &&
                u.roomId !== roomId &&
                !u.isMuted &&
                !u.isGhost
            );
            const roomMsgs = store.messagesByRoom[roomId] || [];
            const calledOtherBot = otherEnabledBots.find((bot) =>
              doesTextCallDemoBot(text, msg.replyTo, bot, otherEnabledBots.length, roomMsgs)
            );
            if (
              calledOtherBot &&
              (looksLikePermissionOrder(text) || parseDemoCommandDeterministic(text, calledOtherBot))
            ) {
              void (async () => {
                const res = await tryExecuteDemoAdminCommand({
                  text,
                  bot: calledOtherBot,
                  senderId: session.userId,
                  senderName: session.profile.username,
                  senderRole: session.profile.role,
                  currentRoomId: roomId,
                });
                if (res.handled && res.replyText) {
                  sendToUser(session.userId, {
                    type: 'mod:notice',
                    message: `${calledOtherBot.username}: ${res.replyText}`,
                  });
                }
              })();
            }
          }
        }
        return;
      }

      // Voice Stage Handlers (General Room & Custom Voice Rooms)
      if (event.type === 'mic:join') {
        const roomId = client.roomId;
        if (!isVoiceEnabledRoom(roomId)) {
          sendToSocket(ws, { type: 'error:notice', message: 'المايكات الصوتية متاحة في الغرفة العامة والغرف الصوتية المخصصة فقط.' });
          return;
        }
        if (store.settings.allowMics === false && session.profile.role !== 'admin') {
          sendToSocket(ws, { type: 'error:notice', message: 'المايكات الصوتية متوقفة حالياً من قبل الإدارة.' });
          return;
        }
        const roomObj = store.rooms.find((r) => r.id === roomId);
        if (!roomObj?.isVoiceRoom && !canDo(session.profile, 'canUseMic')) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية الصعود على المايك.' });
          return;
        }
        if (session.profile.isMuted) {
          sendToSocket(ws, { type: 'error:notice', message: 'أنت مكتوم حالياً ولا يمكنك الصعود على المايك.' });
          return;
        }
        const roomMics = getRoomMics(roomId);
        const idx = Number(event.slotIndex);
        if (!Number.isInteger(idx) || idx < 0 || idx >= roomMics.length) return;
        const targetSlot = roomMics[idx];
        const canBypassLock = canManageRoomMics(session.profile, roomId);
        if (targetSlot.isLocked && !canBypassLock) {
          sendToSocket(ws, { type: 'error:notice', message: 'هذا المايك مقفل حالياً من قبل الإدارة.' });
          return;
        }
        if (targetSlot.userId && targetSlot.userId !== session.userId) {
          sendToSocket(ws, { type: 'error:notice', message: 'هذا المايك مشغول بعضو آخر حالياً.' });
          return;
        }
        if (targetSlot.userId === session.userId) return;

        // Vacate any other mic held by this user in this room first
        removeUserFromRoomMics(roomId, session.userId);

        targetSlot.userId = session.userId;
        targetSlot.username = session.profile.username;
        targetSlot.nameColor = session.profile.nameColor;
        targetSlot.avatarUrl = session.profile.avatarUrl;
        targetSlot.userRole = session.profile.role;
        targetSlot.isMuted = false;
        targetSlot.hasCam = false;
        targetSlot.joinedAt = Date.now();
        markClientPublicActive(client, session.profile.isGhost);
        broadcastRoomMics(roomId);
        return;
      }

      if (event.type === 'mic:toggleCam') {
        const roomId = client.roomId;
        if (!isVoiceEnabledRoom(roomId)) return;
        const mySlot = getRoomMics(roomId).find((m) => m.userId === session.userId);
        if (!mySlot) return;
        if (!mySlot.hasCam && !canDo(session.profile, 'canUseCam')) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية فتح الكاميرا على المايك.' });
          return;
        }
        mySlot.hasCam = !mySlot.hasCam;
        broadcastRoomMics(roomId);
        return;
      }

      if (event.type === 'mic:leave') {
        const roomId = client.roomId;
        if (removeUserFromRoomMics(roomId, session.userId)) {
          broadcastRoomMics(roomId);
          broadcastToRoom(roomId, {
            type: 'mic:speaking',
            roomId,
            userId: session.userId,
            isSpeaking: false,
          });
        }
        return;
      }

      if (event.type === 'mic:toggleMute') {
        const roomId = client.roomId;
        if (!isVoiceEnabledRoom(roomId)) return;
        const mySlot = getRoomMics(roomId).find((m) => m.userId === session.userId);
        if (!mySlot) return;
        mySlot.isMuted = !mySlot.isMuted;
        broadcastRoomMics(roomId);
        if (mySlot.isMuted) {
          broadcastToRoom(roomId, {
            type: 'mic:speaking',
            roomId,
            userId: session.userId,
            isSpeaking: false,
          });
        }
        return;
      }

      if (event.type === 'mic:request') {
        const roomId = client.roomId;
        if (!isVoiceEnabledRoom(roomId)) return;
        const roomMics = getRoomMics(roomId);
        if (roomMics.some((m) => m.userId === session.userId)) return;
        const reqs = getRoomMicRequests(roomId);
        const exists = reqs.some((r) => r.userId === session.userId);
        if (exists) {
          setRoomMicRequests(
            roomId,
            reqs.filter((r) => r.userId !== session.userId)
          );
        } else {
          reqs.push({
            userId: session.userId,
            username: session.profile.username,
            nameColor: session.profile.nameColor,
            avatarUrl: session.profile.avatarUrl,
            requestedAt: Date.now(),
          });
        }
        broadcastRoomMics(roomId);
        return;
      }

      if (event.type === 'mic:modAction') {
        const roomId = client.roomId;
        if (!isVoiceEnabledRoom(roomId)) return;
        if (!canManageRoomMics(session.profile, roomId)) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية إدارة المايكات.' });
          return;
        }
        const roomMics = getRoomMics(roomId);
        const idx = Number(event.slotIndex);
        if (!Number.isInteger(idx) || idx < 0 || idx >= roomMics.length) return;
        const slot = roomMics[idx];

        if (event.action === 'lock' || event.action === 'unlock') {
          slot.isLocked = event.action === 'lock';
          if (slot.isLocked && slot.userId) {
            const kickedUserId = slot.userId;
            if (roomId === 'general') clearBotMicSpeakingTimer(kickedUserId);
            slot.userId = null;
            slot.username = null;
            slot.nameColor = undefined;
            slot.avatarUrl = undefined;
            slot.userRole = undefined;
            slot.isMuted = false;
            slot.hasCam = false;
            slot.joinedAt = undefined;
            sendToUser(kickedUserId, {
              type: 'mod:notice',
              message: `تم قفل المايك رقم ${idx + 1} بواسطة ${session.profile.username}.`,
            });
          }
          broadcastRoomMics(roomId);
        } else if (event.action === 'kick' && slot.userId) {
          const targetId = slot.userId;
          if (roomId === 'general') clearBotMicSpeakingTimer(targetId);
          slot.userId = null;
          slot.username = null;
          slot.nameColor = undefined;
          slot.avatarUrl = undefined;
          slot.userRole = undefined;
          slot.isMuted = false;
          slot.hasCam = false;
          slot.joinedAt = undefined;
          broadcastRoomMics(roomId);
          broadcastToRoom(roomId, {
            type: 'mic:speaking',
            roomId,
            userId: targetId,
            isSpeaking: false,
          });
          sendToUser(targetId, {
            type: 'mod:notice',
            message: `تم إنزالك من المايك بواسطة ${session.profile.username}.`,
          });
        } else if ((event.action === 'mute' || event.action === 'unmute') && slot.userId) {
          slot.isMuted = event.action === 'mute';
          broadcastRoomMics(roomId);
          if (slot.isMuted) {
            if (roomId === 'general') clearBotMicSpeakingTimer(slot.userId);
            broadcastToRoom(roomId, {
              type: 'mic:speaking',
              roomId,
              userId: slot.userId,
              isSpeaking: false,
            });
          }
          sendToUser(slot.userId, {
            type: 'mod:notice',
            message: slot.isMuted
              ? `تم كتم المايك الخاص بك بواسطة ${session.profile.username}.`
              : `تم فتح المايك الخاص بك بواسطة ${session.profile.username}.`,
          });
        }
        return;
      }

      if (event.type === 'mic:grantRequest') {
        const roomId = client.roomId;
        if (!isVoiceEnabledRoom(roomId)) return;
        const isStaffHere =
          session.profile.role === 'admin' ||
          session.profile.role === 'moderator' ||
          canManageRoomMics(session.profile, roomId);
        if (!isStaffHere) return;
        const reqs = getRoomMicRequests(roomId);
        const reqItem = reqs.find((r) => r.userId === event.targetUserId);
        if (!reqItem) return;
        const roomMics = getRoomMics(roomId);
        const freeSlot = roomMics.find((m) => !m.userId && !m.isLocked);
        if (!freeSlot) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا يوجد مايك فارغ ومفتوح حالياً.' });
          return;
        }
        const targetOnline = getOnlineUsersMap().get(event.targetUserId);
        if (!targetOnline || targetOnline.roomId !== roomId) {
          setRoomMicRequests(
            roomId,
            reqs.filter((r) => r.userId !== event.targetUserId)
          );
          broadcastRoomMics(roomId);
          return;
        }
        setRoomMicRequests(
          roomId,
          reqs.filter((r) => r.userId !== event.targetUserId)
        );
        freeSlot.userId = targetOnline.id;
        freeSlot.username = targetOnline.username;
        freeSlot.nameColor = targetOnline.nameColor;
        freeSlot.avatarUrl = targetOnline.avatarUrl;
        freeSlot.userRole = targetOnline.role;
        freeSlot.isMuted = false;
        freeSlot.joinedAt = Date.now();
        broadcastRoomMics(roomId);
        sendToUser(targetOnline.id, {
          type: 'mod:notice',
          message: `تم منحك المايك رقم ${freeSlot.slotIndex + 1} بواسطة ${session.profile.username}.`,
        });
        return;
      }

      if (event.type === 'mic:speaking') {
        const roomId = client.roomId;
        if (!isVoiceEnabledRoom(roomId)) return;
        const slot = getRoomMics(roomId).find((m) => m.userId === session.userId);
        if (!slot) return;
        broadcastToRoom(
          roomId,
          {
            type: 'mic:speaking',
            roomId,
            userId: session.userId,
            isSpeaking: Boolean(event.isSpeaking) && !slot.isMuted,
          },
          session.userId
        );
        return;
      }

      if (event.type === 'mic:signal') {
        const roomId = client.roomId;
        if (!isVoiceEnabledRoom(roomId)) return;
        if (!event.targetUserId || !event.signal) return;
        sendToUser(event.targetUserId, {
          type: 'mic:signal',
          fromUserId: session.userId,
          signal: event.signal,
        });
        return;
      }

      if (event.type === 'mic:react') {
        const roomId = client.roomId;
        if (!isVoiceEnabledRoom(roomId)) return;
        const allowedEmojis = ['👏', '❤️', '🔥', '🌹', '😂', '✨'];
        const emoji = allowedEmojis.includes(event.emoji) ? event.emoji : '👏';
        const reaction: MicReaction = {
          id: `react-${crypto.randomUUID()}`,
          userId: session.userId,
          username: session.profile.username,
          emoji,
          timestamp: Date.now(),
        };
        broadcastToRoom(roomId, {
          type: 'mic:reaction',
          roomId,
          reaction,
        });
        return;
      }

      if (event.type === 'chat:delete') {
        const list = store.messagesByRoom[event.roomId];
        if (!list) return;
        const target = list.find((m) => m.id === event.messageId);
        if (!target) return;
        const canDelete =
          target.userId === session.userId ||
          canDo(session.profile, 'canDeleteMessages');
        if (!canDelete) return;

        store.messagesByRoom[event.roomId] = list.filter((m) => m.id !== event.messageId);
        scheduleSave();
        broadcastToRoom(event.roomId, {
          type: 'chat:deleted',
          roomId: event.roomId,
          messageId: event.messageId,
        });
        return;
      }

      if (event.type === 'pm:send') {
        if (store.settings.allowPrivateMessages === false && session.profile.role !== 'admin') {
          sendToSocket(ws, { type: 'error:notice', message: 'المحادثات الخاصة متوقفة حالياً من قبل الإدارة.' });
          return;
        }
        if (!canDo(session.profile, 'canUsePrivateMsg')) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية إرسال الرسائل الخاصة.' });
          return;
        }
        const text = sanitizeText(event.text, 600);
        const allowImg =
          (store.settings.allowImages !== false || session.profile.role === 'admin') &&
          canDo(session.profile, 'canSendImages');
        const imageUrl = allowImg ? sanitizeImageUrl(event.imageUrl) : undefined;
        if (!text && !imageUrl) return;
        if (text && containsBannedWord(text)) {
          sendToSocket(ws, { type: 'error:notice', message: 'تحتوي رسالتك على كلمة محظورة من قبل الإدارة.' });
          return;
        }
        const targetOnline = getOnlineUsersMap().get(event.toUserId);
        const targetAccount = store.accounts.find((a) => a.id === event.toUserId);
        const toUsername = targetOnline?.username || targetAccount?.username;
        if (!toUsername) {
          sendToSocket(ws, { type: 'error:notice', message: 'المستخدم غير متصل حالياً.' });
          return;
        }
        const targetPmDisabled = targetOnline?.pmDisabled ?? targetAccount?.pmDisabled ?? false;
        if (targetPmDisabled && session.profile.role !== 'admin') {
          sendToSocket(ws, { type: 'error:notice', message: 'قام هذا المستخدم بتعطيل المحادثات الخاصة حالياً.' });
          return;
        }
        const pm: PrivateMessage = {
          id: `pm-${crypto.randomUUID()}`,
          fromUserId: session.userId,
          fromUsername: session.profile.username,
          fromNameColor: session.profile.nameColor,
          fromAvatarUrl: session.profile.avatarUrl,
          toUserId: event.toUserId,
          toUsername,
          text,
          textColor: sanitizeColor(event.textColor, ''),
          imageUrl,
          timestamp: Date.now(),
        };
        store.privateMessages.push(pm);
        if (store.privateMessages.length > 400) {
          store.privateMessages = store.privateMessages.slice(-400);
        }
        scheduleSave();
        sendToUser(session.userId, { type: 'pm:message', message: pm });
        if (event.toUserId !== session.userId) {
          sendToUser(event.toUserId, { type: 'pm:message', message: pm });
          if (isVirtualDemoUserId(event.toUserId)) {
            const targetBot = virtualOnlineUsers.get(event.toUserId);
            if (targetBot && targetBot.demoTalkControlEnabled === true && !targetBot.isGhost) {
              scheduleDemoPmReply(
                session.userId,
                session.profile.username,
                session.profile.gender,
                session.profile.role,
                pm,
                targetBot
              );
            }
          }
        }
        return;
      }

      if (event.type === 'wall:post') {
        if (session.profile.isMuted) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا يمكنك النشر أثناء الكتم.' });
          return;
        }
        if (!store.settings.allowWallPosts && session.profile.role !== 'admin') {
          sendToSocket(ws, { type: 'error:notice', message: 'النشر على الحائط متوقف مؤقتاً من قبل الإدارة.' });
          return;
        }
        if (!canDo(session.profile, 'canPostWall')) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية النشر على الحائط.' });
          return;
        }
        const content = sanitizeText(event.content, 500);
        const allowImg =
          (store.settings.allowImages !== false || session.profile.role === 'admin') &&
          canDo(session.profile, 'canSendImages');
        const allowAudio =
          (store.settings.allowVoiceNotes !== false || session.profile.role === 'admin') &&
          canDo(session.profile, 'canSendVoice');
        const imageUrl = allowImg ? sanitizeImageUrl(event.imageUrl) : undefined;
        const audioUrl = allowAudio ? sanitizeAudioUrl(event.audioUrl) : undefined;
        const audioDuration =
          audioUrl && typeof event.audioDuration === 'number' && Number.isFinite(event.audioDuration)
            ? Math.min(25, Math.max(1, Math.round(event.audioDuration)))
            : undefined;
        const parsedMedia =
          typeof event.youtubeUrl === 'string' && event.youtubeUrl.trim()
            ? sanitizeMediaInput(event.youtubeUrl, '', session.profile.username)
            : null;
        const youtubeId =
          parsedMedia?.kind === 'youtube' && parsedMedia.embedId
            ? parsedMedia.embedId
            : undefined;

        if (!content && !imageUrl && !youtubeId && !audioUrl) return;
        if (containsBannedWord(content)) {
          sendToSocket(ws, { type: 'error:notice', message: 'يحتوي المنشور على كلمة محظورة من قبل الإدارة.' });
          return;
        }
        const post: WallPost = {
          id: `wall-${crypto.randomUUID()}`,
          userId: session.userId,
          username: session.profile.username,
          userRole: session.profile.role,
          nameColor: session.profile.nameColor,
          avatarUrl: session.profile.avatarUrl,
          country: session.profile.country,
          content,
          imageUrl,
          youtubeId,
          audioUrl,
          audioDuration,
          likes: [],
          comments: [],
          timestamp: Date.now(),
        };
        store.wallPosts.unshift(post);
        if (store.wallPosts.length > 80) {
          store.wallPosts = store.wallPosts.slice(0, 80);
        }
        scheduleSave();
        broadcastToAll({ type: 'wall:created', post });
        return;
      }

      if (event.type === 'wall:like') {
        if (!canDo(session.profile, 'canCommentWall')) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية التفاعل على الحائط.' });
          return;
        }
        const post = store.wallPosts.find((p) => p.id === event.postId);
        if (!post) return;
        const idx = post.likes.indexOf(session.userId);
        if (idx >= 0) {
          post.likes.splice(idx, 1);
        } else {
          post.likes.push(session.userId);
          if (post.userId !== session.userId) {
            pushMemberNotification(post.userId, {
              kind: 'wall',
              fromUserId: session.userId,
              fromUsername: session.profile.username,
              fromNameColor: session.profile.nameColor,
              fromAvatarUrl: session.profile.avatarUrl,
              message: 'أعجب بمنشورك على الحائط ❤️',
              timestamp: Date.now(),
            });
          }
        }
        scheduleSave();
        broadcastToAll({ type: 'wall:updated', post });
        return;
      }

      if (event.type === 'wall:comment') {
        if (!canDo(session.profile, 'canCommentWall')) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية التعليق على الحائط.' });
          return;
        }
        const post = store.wallPosts.find((p) => p.id === event.postId);
        const text = sanitizeText(event.text, 240);
        if (!post || !text) return;
        if (containsBannedWord(text)) {
          sendToSocket(ws, { type: 'error:notice', message: 'يحتوي التعليق على كلمة محظورة من قبل الإدارة.' });
          return;
        }
        post.comments.push({
          id: `cmt-${crypto.randomUUID()}`,
          userId: session.userId,
          username: session.profile.username,
          nameColor: session.profile.nameColor,
          text,
          timestamp: Date.now(),
        });
        if (post.userId !== session.userId) {
          pushMemberNotification(post.userId, {
            kind: 'wall',
            fromUserId: session.userId,
            fromUsername: session.profile.username,
            fromNameColor: session.profile.nameColor,
            fromAvatarUrl: session.profile.avatarUrl,
            message: `علّق على منشورك: "${text.slice(0, 70)}"`,
            timestamp: Date.now(),
          });
        }
        scheduleSave();
        broadcastToAll({ type: 'wall:updated', post });
        return;
      }

      if (event.type === 'wall:delete') {
        const post = store.wallPosts.find((p) => p.id === event.postId);
        if (!post) return;
        const canDelete =
          post.userId === session.userId ||
          canDo(session.profile, 'canDeleteMessages');
        if (!canDelete) return;
        store.wallPosts = store.wallPosts.filter((p) => p.id !== event.postId);
        scheduleSave();
        broadcastToAll({ type: 'wall:deleted', postId: event.postId });
        return;
      }

      if (event.type === 'user:setStatusIcon') {
        if (store.settings.allowProfileEdits === false && session.profile.role !== 'admin') {
          sendToSocket(ws, { type: 'error:notice', message: 'تعديل الملفات الشخصية متوقف حالياً من قبل الإدارة.' });
          return;
        }
        if (!canDo(session.profile, 'canEditProfile')) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تعديل الحالة.' });
          return;
        }
        const cleanedIcon = sanitizeStatusIcon(event.statusIcon);
        const nextStatusIcon = cleanedIcon || undefined;
        let nextStatusText = session.profile.statusText;
        if (typeof event.statusText === 'string') {
          const sanitizedText = sanitizeText(event.statusText, 48);
          if (sanitizedText) {
            nextStatusText = sanitizedText;
          }
        }
        const userSessions = store.sessions.filter((s) => s.userId === session.userId);
        for (const s of userSessions) {
          s.profile = {
            ...s.profile,
            statusIcon: nextStatusIcon,
            statusText: nextStatusText,
          };
        }
        if (!session.isGuest) {
          const account = store.accounts.find((a) => a.id === session.userId);
          if (account) {
            account.statusIcon = nextStatusIcon;
            account.statusText = nextStatusText;
          }
        }
        scheduleSave();
        if (session.profile.isGhost) {
          sendToUser(session.userId, { type: 'profile:updated', user: session.profile });
          broadcastRoomUsersUpdate(client.roomId, true);
        } else {
          broadcastToAll({ type: 'profile:updated', user: session.profile });
          const roomUsers = getOnlineUsersForRoom(client.roomId);
          broadcastToRoom(client.roomId, {
            type: 'users:update',
            roomId: client.roomId,
            onlineUsers: roomUsers,
          });
        }
        broadcastAdminStateToStaff();
        return;
      }

      if (event.type === 'profile:update') {
        if (store.settings.allowProfileEdits === false && session.profile.role !== 'admin') {
          sendToSocket(ws, { type: 'error:notice', message: 'تعديل الملفات الشخصية متوقف حالياً من قبل الإدارة.' });
          return;
        }
        if (!canDo(session.profile, 'canEditProfile')) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تعديل الملف الشخصي.' });
          return;
        }
        let nextUsername = session.profile.username;
        if (typeof event.username === 'string') {
          const candidate = sanitizeText(event.username, 28);
          if (candidate && candidate !== session.profile.username) {
            if (candidate.length < 2) {
              sendToSocket(ws, { type: 'error:notice', message: 'يجب أن يكون الاسم المزخرف حرفين على الأقل.' });
              return;
            }
            if (containsBannedWord(candidate) || isUserBanned(candidate.toLowerCase())) {
              sendToSocket(ws, { type: 'error:notice', message: 'الاسم المختار غير مسموح به.' });
              return;
            }
            const lower = candidate.toLowerCase();
            const takenAccount = store.accounts.some(
              (a) => a.id !== session.userId && a.usernameLower === lower
            );
            const takenOnline = Array.from(getOnlineUsersMap(true).values()).some(
              (u) => u.id !== session.userId && u.username.toLowerCase() === lower
            );
            if (takenAccount || takenOnline) {
              sendToSocket(ws, { type: 'error:notice', message: 'هذا الاسم مستخدم حالياً، اختر زخرفة أخرى.' });
              return;
            }
            nextUsername = candidate;
          }
        }

        const nameColor = sanitizeColor(event.nameColor, session.profile.nameColor);
        const nextTextColor = sanitizeOptionalColor(event.textColor);
        const nextBgColor = sanitizeOptionalColor(event.bgColor);
        const nextStatusColor = sanitizeOptionalColor(event.statusColor);
        const nextStatusIcon =
          event.statusIcon === undefined
            ? session.profile.statusIcon
            : sanitizeStatusIcon(event.statusIcon) || undefined;
        const statusText = sanitizeText(event.statusText, 48);
        const bio = sanitizeText(event.bio, 180);
        const avatarSymbol = sanitizeText(event.avatarSymbol, 4) || session.profile.avatarSymbol;
        const avatarUrl = sanitizeAvatarUrl(event.avatarUrl, nextUsername);
        const nextCoverUrl =
          event.coverUrl === undefined
            ? session.profile.coverUrl
            : event.coverUrl === ''
            ? undefined
            : sanitizeImageUrl(event.coverUrl) ?? session.profile.coverUrl;
        const gender: UserGender = event.gender === 'female' ? 'female' : 'male';
        const pmDisabled =
          typeof event.pmDisabled === 'boolean' ? event.pmDisabled : session.profile.pmDisabled;
        const socialLinks =
          event.socialLinks !== undefined
            ? sanitizeSocialLinks(event.socialLinks)
            : session.profile.socialLinks;

        const prevUsername = session.profile.username;
        session.profile = {
          ...session.profile,
          username: nextUsername,
          nameColor,
          textColor: nextTextColor !== undefined ? nextTextColor : session.profile.textColor,
          bgColor: nextBgColor !== undefined ? nextBgColor : session.profile.bgColor,
          statusColor: nextStatusColor !== undefined ? nextStatusColor : session.profile.statusColor,
          statusIcon: nextStatusIcon,
          pmDisabled,
          socialLinks,
          statusText: statusText || 'متواجد',
          bio,
          avatarSymbol,
          avatarUrl,
          coverUrl: nextCoverUrl,
          gender,
        };

        if (!session.isGuest) {
          const account = store.accounts.find((a) => a.id === session.userId);
          if (account) {
            account.username = nextUsername;
            account.usernameLower = nextUsername.toLowerCase();
            account.nameColor = nameColor;
            account.textColor = session.profile.textColor;
            account.bgColor = session.profile.bgColor;
            account.statusColor = session.profile.statusColor;
            account.statusIcon = session.profile.statusIcon;
            account.pmDisabled = session.profile.pmDisabled;
            account.socialLinks = session.profile.socialLinks;
            account.statusText = session.profile.statusText;
            account.bio = bio;
            account.avatarSymbol = avatarSymbol;
            account.avatarUrl = avatarUrl;
            account.coverUrl = nextCoverUrl;
            account.gender = gender;
          }
        }
        if (nextUsername !== prevUsername) {
          const netIp = client.ip || session.ip;
          if (netIp && netIp !== 'غير معروف') {
            recordNickAccess({
              userId: session.userId,
              username: nextUsername,
              isGuest: session.isGuest,
              role: session.profile.role,
              nameColor,
              country: session.profile.country,
              ip: netIp,
              deviceSummary: client.deviceSummary || session.deviceSummary || 'متصفح غير محدد',
              roomId: client.roomId,
            });
          }
        }
        scheduleSave();
        if (session.profile.isGhost) {
          sendToUser(session.userId, { type: 'profile:updated', user: session.profile });
          broadcastRoomUsersUpdate(client.roomId, true);
        } else {
          broadcastToAll({ type: 'profile:updated', user: session.profile });
          for (const [rid, slots] of roomMicsMap.entries()) {
            const micSlot = slots.find((m) => m.userId === session.userId);
            if (micSlot) {
              micSlot.username = session.profile.username;
              micSlot.nameColor = session.profile.nameColor;
              micSlot.avatarUrl = session.profile.avatarUrl;
              micSlot.userRole = session.profile.role;
              broadcastRoomMics(rid);
            }
          }
          const roomUsers = getOnlineUsersForRoom(client.roomId);
          broadcastToRoom(client.roomId, {
            type: 'users:update',
            roomId: client.roomId,
            onlineUsers: roomUsers,
          });
        }
        broadcastAdminStateToStaff();
        return;
      }

      if (event.type === 'user:viewProfile') {
        const stats = getOrCreateUserStats(event.targetUserId);
        if (event.targetUserId !== session.userId && !session.profile.isGhost) {
          stats.views += 1;
          scheduleSave();
        }
        sendToSocket(ws, { type: 'user:profileStats', stats });
        return;
      }

      if (event.type === 'user:like') {
        if (event.targetUserId === session.userId) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا يمكنك الإعجاب بملفك الشخصي.' });
          return;
        }
        const stats = getOrCreateUserStats(event.targetUserId);
        const existingIdx = stats.likes.indexOf(session.userId);
        if (existingIdx >= 0) {
          stats.likes.splice(existingIdx, 1);
          stats.likesCount = Math.max(0, stats.likesCount - 1);
        } else {
          stats.likes.push(session.userId);
          stats.likesCount += 1;
          const now = Date.now();
          alertSequenceCounter += 1;
          sendToUser(event.targetUserId, {
            type: 'user:alerted',
            kind: 'like',
            badgeNumber: alertSequenceCounter,
            fromUserId: session.userId,
            fromUsername: session.profile.username,
            fromNameColor: session.profile.nameColor,
            fromAvatarUrl: session.profile.avatarUrl,
            message: 'حصلت على إعجاب ❤️',
            timestamp: now,
          });
          pushMemberNotification(event.targetUserId, {
            kind: 'like',
            fromUserId: session.userId,
            fromUsername: session.profile.username,
            fromNameColor: session.profile.nameColor,
            fromAvatarUrl: session.profile.avatarUrl,
            message: 'حصلت على إعجاب ❤️ (+1 لايك)',
            timestamp: now,
          });
        }
        scheduleSave();
        broadcastToAll({ type: 'user:profileStats', stats });
        broadcastToAll({ type: 'leaderboard:update', stars: getTopStars() });
        return;
      }

      if (event.type === 'user:sendGift') {
        if (store.settings.allowGifts === false && session.profile.role !== 'admin') {
          sendToSocket(ws, { type: 'error:notice', message: 'نظام الهدايا متوقف حالياً من قبل الإدارة.' });
          return;
        }
        if (!canDo(session.profile, 'canSendGifts')) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية إرسال الهدايا.' });
          return;
        }
        if (event.targetUserId === session.userId) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا يمكنك إرسال هدية لنفسك.' });
          return;
        }
        const giftCatalog =
          Array.isArray(store.settings.customGifts) && store.settings.customGifts.length > 0
            ? store.settings.customGifts
            : DEFAULT_GIFTS;
        const gift = giftCatalog.find((g) => g.id === event.giftId && g.enabled !== false);
        if (!gift) {
          sendToSocket(ws, { type: 'error:notice', message: 'هذه الهدية غير متاحة حالياً.' });
          return;
        }

        const targetOnline = getOnlineUsersMap().get(event.targetUserId);
        const targetAcc = store.accounts.find((a) => a.id === event.targetUserId);
        const targetUsername = targetOnline?.username || targetAcc?.username;
        if (!targetUsername) {
          sendToSocket(ws, { type: 'error:notice', message: 'العضو غير موجود.' });
          return;
        }

        const senderStats = getOrCreateUserStats(session.userId);
        if (senderStats.likesCount < gift.cost && session.profile.role !== 'admin') {
          sendToSocket(ws, {
            type: 'error:notice',
            message: `لايكاتك غير كافية (${senderStats.likesCount} لايك). تحتاج ${gift.cost} لايك لإرسال ${gift.label}.`,
          });
          return;
        }

        senderStats.likesCount = Math.max(0, senderStats.likesCount - gift.cost);
        const recipientStats = getOrCreateUserStats(event.targetUserId);
        recipientStats.likesCount += gift.cost;

        const nextGiftIcon = gift.imageUrl ? undefined : gift.emoji || '🎁';
        const nextGiftImageUrl = gift.imageUrl || undefined;
        const nextGiftLabel = gift.label;

        if (targetAcc) {
          targetAcc.giftIcon = nextGiftIcon;
          targetAcc.giftImageUrl = nextGiftImageUrl;
          targetAcc.giftLabel = nextGiftLabel;
        }
        const targetSessions = store.sessions.filter((s) => s.userId === event.targetUserId);
        targetSessions.forEach((s) => {
          s.profile.giftIcon = nextGiftIcon;
          s.profile.giftImageUrl = nextGiftImageUrl;
          s.profile.giftLabel = nextGiftLabel;
        });
        const vTarget = virtualOnlineUsers.get(event.targetUserId);
        if (vTarget) {
          vTarget.giftIcon = nextGiftIcon;
          vTarget.giftImageUrl = nextGiftImageUrl;
          vTarget.giftLabel = nextGiftLabel;
        }

        scheduleSave();

        broadcastToAll({ type: 'user:profileStats', stats: senderStats });
        broadcastToAll({ type: 'user:profileStats', stats: recipientStats });
        broadcastToAll({ type: 'leaderboard:update', stars: getTopStars() });

        const updatedRecipient = targetSessions[0]?.profile || vTarget;
        if (updatedRecipient) {
          broadcastToAll({ type: 'profile:updated', user: updatedRecipient });
        }
        const affectedRooms = new Set<string>([client.roomId]);
        targetSessions.forEach((s) => {
          if (s.profile.roomId) affectedRooms.add(s.profile.roomId);
        });
        if (vTarget?.roomId) affectedRooms.add(vTarget.roomId);
        for (const rid of affectedRooms) {
          broadcastToRoom(rid, {
            type: 'users:update',
            roomId: rid,
            onlineUsers: getOnlineUsersForRoom(rid),
          });
        }

        const giftSymbol = gift.imageUrl ? '🎁' : gift.emoji || '🎁';
        addSystemMessage(
          client.roomId,
          `أهدى ${session.profile.username} إلى ${targetUsername} ${giftSymbol} ${gift.label} (+${gift.cost} لايك) لتظهر أيقونتها بجانب اسمه!`,
          {
            systemKind: 'notice',
            actor: session.profile,
            imageUrl: gift.imageUrl,
          }
        );

        pushMemberNotification(event.targetUserId, {
          kind: 'like',
          fromUserId: session.userId,
          fromUsername: session.profile.username,
          fromNameColor: session.profile.nameColor,
          fromAvatarUrl: session.profile.avatarUrl,
          message: `أهدى لك ${giftSymbol} ${gift.label} (+${gift.cost} لايك) وظهرت أيقونتها بجانب اسمك`,
          timestamp: Date.now(),
          roomId: client.roomId,
        });
        return;
      }

      if (event.type === 'user:clearGiftIcon') {
        const canClear =
          event.targetUserId === session.userId ||
          canDo(session.profile, 'canManageAccounts') ||
          canDo(session.profile, 'canMuteUsers');
        if (!canClear) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية إزالة أيقونة الهدية.' });
          return;
        }
        const targetAcc = store.accounts.find((a) => a.id === event.targetUserId);
        if (targetAcc) {
          targetAcc.giftIcon = undefined;
          targetAcc.giftImageUrl = undefined;
          targetAcc.giftLabel = undefined;
        }
        const targetSessions = store.sessions.filter((s) => s.userId === event.targetUserId);
        targetSessions.forEach((s) => {
          s.profile.giftIcon = undefined;
          s.profile.giftImageUrl = undefined;
          s.profile.giftLabel = undefined;
        });
        const vTarget = virtualOnlineUsers.get(event.targetUserId);
        if (vTarget) {
          vTarget.giftIcon = undefined;
          vTarget.giftImageUrl = undefined;
          vTarget.giftLabel = undefined;
        }
        scheduleSave();
        const updatedRecipient = targetSessions[0]?.profile || vTarget;
        if (updatedRecipient) {
          broadcastToAll({ type: 'profile:updated', user: updatedRecipient });
        }
        const affectedRooms = new Set<string>([client.roomId]);
        targetSessions.forEach((s) => {
          if (s.profile.roomId) affectedRooms.add(s.profile.roomId);
        });
        if (vTarget?.roomId) affectedRooms.add(vTarget.roomId);
        for (const rid of affectedRooms) {
          broadcastToRoom(rid, {
            type: 'users:update',
            roomId: rid,
            onlineUsers: getOnlineUsersForRoom(rid),
          });
        }
        return;
      }

      if (event.type === 'user:alert') {
        if (!canDo(session.profile, 'canSendAlerts')) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية إرسال التنبيهات المباشرة.' });
          return;
        }
        if (event.targetUserId === session.userId) return;
        const targetOnline = getOnlineUsersMap().get(event.targetUserId);
        if (!targetOnline) {
          sendToSocket(ws, { type: 'error:notice', message: 'المستخدم غير متصل حالياً.' });
          return;
        }
        const customText = sanitizeText(event.message, 120);
        const alertMsg = customText || `أرسل لك ${session.profile.username} تنبيهاً!`;
        const now = Date.now();
        alertSequenceCounter += 1;
        sendToUser(event.targetUserId, {
          type: 'user:alerted',
          kind: 'alert',
          badgeNumber: alertSequenceCounter,
          fromUserId: session.userId,
          fromUsername: session.profile.username,
          fromNameColor: session.profile.nameColor,
          fromAvatarUrl: session.profile.avatarUrl,
          message: alertMsg,
          timestamp: now,
        });
        pushMemberNotification(event.targetUserId, {
          kind: 'alert',
          fromUserId: session.userId,
          fromUsername: session.profile.username,
          fromNameColor: session.profile.nameColor,
          fromAvatarUrl: session.profile.avatarUrl,
          message: customText ? `أرسل لك تنبيهاً: "${customText}"` : 'أرسل لك تنبيهاً مباشراً 🔔',
          timestamp: now,
        });
        sendToSocket(ws, {
          type: 'mod:notice',
          message: `تم إرسال تنبيه إلى ${targetOnline.username}.`,
        });
        return;
      }

      if (event.type === 'notifications:markRead') {
        const list = store.notificationsByUser[session.userId] || [];
        store.notificationsByUser[session.userId] = list.map((n) => ({ ...n, read: true }));
        scheduleSave();
        sendToUser(session.userId, {
          type: 'notifications:synced',
          notifications: store.notificationsByUser[session.userId],
        });
        return;
      }

      if (event.type === 'notifications:clear') {
        store.notificationsByUser[session.userId] = [];
        scheduleSave();
        sendToUser(session.userId, {
          type: 'notifications:synced',
          notifications: [],
        });
        return;
      }

      if (event.type === 'game:challenge') {
        if (store.settings.allowGames === false && session.profile.role !== 'admin') {
          sendToSocket(ws, { type: 'error:notice', message: 'الألعاب والتحديات متوقفة حالياً من قبل الإدارة.' });
          return;
        }
        if (!canDo(session.profile, 'canPlayGames')) {
          sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية اللعب والتحديات.' });
          return;
        }
        if (event.targetUserId === session.userId) return;
        const targetOnline = getOnlineUsersMap().get(event.targetUserId);
        if (!targetOnline) {
          sendToSocket(ws, { type: 'error:notice', message: 'العضو غير متصل حالياً لبدء التحدي.' });
          return;
        }
        const gameType = event.gameType === 'ludo' ? 'ludo' : 'xo';
        const challenge: GameChallengeState = {
          id: `chl-${crypto.randomUUID()}`,
          gameType,
          challengerId: session.userId,
          challengerName: session.profile.username,
          opponentId: targetOnline.id,
          opponentName: targetOnline.username,
          status: 'pending',
          turnUserId: session.userId,
          xoBoard: Array(9).fill(''),
          ludoPositions: {
            [session.userId]: 0,
            [targetOnline.id]: 0,
          },
          lastActionText: `بانتظار قبول ${targetOnline.username} للتحدي...`,
        };
        activeChallenges.set(challenge.id, challenge);
        sendToUser(session.userId, { type: 'game:challenged', challenge });
        sendToUser(targetOnline.id, { type: 'game:challenged', challenge });
        pushMemberNotification(targetOnline.id, {
          kind: 'game',
          fromUserId: session.userId,
          fromUsername: session.profile.username,
          fromNameColor: session.profile.nameColor,
          fromAvatarUrl: session.profile.avatarUrl,
          message: `دعاك إلى تحدي ${gameType === 'xo' ? 'X-O' : 'Ludo'} 🎮`,
          timestamp: Date.now(),
        });
        return;
      }

      if (event.type === 'game:respond') {
        const challenge = activeChallenges.get(event.challengeId);
        if (!challenge || challenge.opponentId !== session.userId || challenge.status !== 'pending') {
          return;
        }
        if (!event.accept) {
          activeChallenges.delete(challenge.id);
          sendToUser(challenge.challengerId, {
            type: 'game:declined',
            challengeId: challenge.id,
            byUsername: session.profile.username,
          });
          return;
        }
        challenge.status = 'active';
        challenge.lastActionText = `بدأ التحدي! دور ${challenge.challengerName}`;
        sendToUser(challenge.challengerId, { type: 'game:updated', challenge });
        sendToUser(challenge.opponentId, { type: 'game:updated', challenge });
        return;
      }

      if (event.type === 'game:xoMove') {
        const challenge = activeChallenges.get(event.challengeId);
        if (
          !challenge ||
          challenge.gameType !== 'xo' ||
          challenge.status !== 'active' ||
          challenge.turnUserId !== session.userId
        ) {
          return;
        }
        const idx = Number(event.cellIndex);
        if (!Number.isInteger(idx) || idx < 0 || idx > 8 || challenge.xoBoard[idx] !== '') {
          return;
        }
        const mark: 'X' | 'O' = session.userId === challenge.challengerId ? 'X' : 'O';
        challenge.xoBoard[idx] = mark;
        const result = checkXoWinner(challenge.xoBoard);
        if (result === 'draw') {
          challenge.status = 'finished';
          challenge.winnerId = 'draw';
          challenge.lastActionText = 'انتهت المباراة بالتعادل!';
        } else if (result === 'X' || result === 'O') {
          challenge.status = 'finished';
          const winnerId = result === 'X' ? challenge.challengerId : challenge.opponentId;
          const winnerName = result === 'X' ? challenge.challengerName : challenge.opponentName;
          challenge.winnerId = winnerId;
          challenge.lastActionText = `فاز ${winnerName} بتحدي X-O (+25 لايك)!`;
          const winnerStats = getOrCreateUserStats(winnerId);
          winnerStats.likesCount += 25;
          scheduleSave();
          broadcastToAll({ type: 'user:profileStats', stats: winnerStats });
          broadcastToAll({ type: 'leaderboard:update', stars: getTopStars() });
        } else {
          const nextUserId =
            session.userId === challenge.challengerId ? challenge.opponentId : challenge.challengerId;
          const nextName =
            nextUserId === challenge.challengerId ? challenge.challengerName : challenge.opponentName;
          challenge.turnUserId = nextUserId;
          challenge.lastActionText = `دور ${nextName}`;
        }
        sendToUser(challenge.challengerId, { type: 'game:updated', challenge });
        sendToUser(challenge.opponentId, { type: 'game:updated', challenge });
        return;
      }

      if (event.type === 'game:ludoRoll') {
        const challenge = activeChallenges.get(event.challengeId);
        if (
          !challenge ||
          challenge.gameType !== 'ludo' ||
          challenge.status !== 'active' ||
          challenge.turnUserId !== session.userId
        ) {
          return;
        }
        const roll = Math.floor(Math.random() * 6) + 1;
        challenge.lastDice = roll;
        const currentPos = challenge.ludoPositions[session.userId] || 0;
        const nextPos = Math.min(24, currentPos + roll);
        challenge.ludoPositions[session.userId] = nextPos;
        const rollerName =
          session.userId === challenge.challengerId ? challenge.challengerName : challenge.opponentName;

        if (nextPos >= 24) {
          challenge.status = 'finished';
          challenge.winnerId = session.userId;
          challenge.lastActionText = `رمى ${rollerName} (${roll}) ووصل خط النهاية (+30 لايك)!`;
          const winnerStats = getOrCreateUserStats(session.userId);
          winnerStats.likesCount += 30;
          scheduleSave();
          broadcastToAll({ type: 'user:profileStats', stats: winnerStats });
          broadcastToAll({ type: 'leaderboard:update', stars: getTopStars() });
        } else if (roll === 6) {
          challenge.lastActionText = `رمى ${rollerName} رقم (6) وحصل على رمية إضافية!`;
        } else {
          const nextUserId =
            session.userId === challenge.challengerId ? challenge.opponentId : challenge.challengerId;
          const nextName =
            nextUserId === challenge.challengerId ? challenge.challengerName : challenge.opponentName;
          challenge.turnUserId = nextUserId;
          challenge.lastActionText = `رمى ${rollerName} (${roll}) — الآن دور ${nextName}`;
        }
        sendToUser(challenge.challengerId, { type: 'game:updated', challenge });
        sendToUser(challenge.opponentId, { type: 'game:updated', challenge });
        return;
      }

      if (event.type === 'account:changePassword') {
        if (session.isGuest) {
          sendToSocket(ws, {
            type: 'account:passwordResult',
            ok: false,
            message: 'تغيير كلمة المرور متاح للأعضاء المسجلين فقط.',
          });
          return;
        }
        const account = store.accounts.find((a) => a.id === session.userId);
        if (!account) {
          sendToSocket(ws, {
            type: 'account:passwordResult',
            ok: false,
            message: 'تعذر العثور على الحساب.',
          });
          return;
        }
        const currentPassword = typeof event.currentPassword === 'string' ? event.currentPassword : '';
        const newPassword = typeof event.newPassword === 'string' ? event.newPassword : '';
        if (!verifyPassword(currentPassword, account.passwordSalt, account.passwordHash)) {
          sendToSocket(ws, {
            type: 'account:passwordResult',
            ok: false,
            message: 'كلمة المرور الحالية غير صحيحة.',
          });
          return;
        }
        if (newPassword.length < 4) {
          sendToSocket(ws, {
            type: 'account:passwordResult',
            ok: false,
            message: 'يجب أن تتكون كلمة المرور الجديدة من 4 أحرف على الأقل.',
          });
          return;
        }
        const { hash, salt } = hashPassword(newPassword);
        account.passwordHash = hash;
        account.passwordSalt = salt;
        scheduleSave();
        sendToSocket(ws, {
          type: 'account:passwordResult',
          ok: true,
          message: 'تم تغيير كلمة المرور بنجاح.',
        });
        return;
      }

      if (event.type === 'mod:action') {
        const targetId = event.targetUserId;
        if (targetId === session.userId) return;

        const targetSessions = store.sessions.filter((s) => s.userId === targetId);
        const targetAccount = store.accounts.find((a) => a.id === targetId);
        const targetIsAdmin =
          targetAccount?.role === 'admin' || targetSessions.some((s) => s.profile.role === 'admin');
        if (targetIsAdmin && session.profile.role !== 'admin') {
          sendToSocket(ws, { type: 'error:notice', message: 'لا يمكن تنفيذ هذا الإجراء على حساب الإدارة العليا.' });
          return;
        }

        if (event.action === 'mute' || event.action === 'unmute') {
          if (!canDo(session.profile, 'canMuteUsers')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية كتم الأعضاء.' });
            return;
          }
          const muted = event.action === 'mute';
          targetSessions.forEach((s) => (s.profile.isMuted = muted));
          if (targetAccount) targetAccount.isMuted = muted;
          const vTarget = virtualOnlineUsers.get(targetId);
          if (vTarget) vTarget.isMuted = muted;
          scheduleSave();
          sendToUser(targetId, {
            type: 'mod:notice',
            message: muted
              ? `تم كتمك من الكتابة بواسطة ${session.profile.username}.`
              : `تم رفع الكتم عنك بواسطة ${session.profile.username}.`,
          });
          if (targetSessions[0] || vTarget) {
            broadcastToAll({ type: 'profile:updated', user: targetSessions[0]?.profile || vTarget! });
          }
          const affectedRooms = new Set<string>([client.roomId]);
          targetSessions.forEach((s) => {
            if (s.profile.roomId) affectedRooms.add(s.profile.roomId);
          });
          if (vTarget?.roomId) affectedRooms.add(vTarget.roomId);
          for (const rid of affectedRooms) {
            broadcastToRoom(rid, {
              type: 'users:update',
              roomId: rid,
              onlineUsers: getOnlineUsersForRoom(rid),
            });
          }
        } else if (event.action === 'promote' || event.action === 'demote') {
          if (!canDo(session.profile, 'canManageAccounts')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية ترقية أو تعديل رتب الأعضاء.' });
            return;
          }
          if (!targetAccount) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا يمكن ترقية الزوار، يجب أن يكون عضواً مسجلاً.' });
            return;
          }
          const newRole: UserRole = event.action === 'promote' ? 'moderator' : 'member';
          targetAccount.role = newRole;
          targetSessions.forEach((s) => (s.profile.role = newRole));
          const vTarget = virtualOnlineUsers.get(targetId);
          if (vTarget) vTarget.role = newRole;
          scheduleSave();
          broadcastToAll({
            type: 'profile:updated',
            user: targetSessions[0]?.profile || vTarget || {
              id: targetAccount.id,
              username: targetAccount.username,
              isGuest: false,
              role: newRole,
              gender: targetAccount.gender,
              nameColor: targetAccount.nameColor,
              statusText: targetAccount.statusText,
              statusIcon: targetAccount.statusIcon,
              bio: targetAccount.bio,
              avatarSymbol: targetAccount.avatarSymbol,
              avatarUrl: targetAccount.avatarUrl || `dicebear:adventurer:${targetAccount.username}`,
              roomId: client.roomId,
              joinedAt: Date.now(),
              isMuted: targetAccount.isMuted,
              country: targetAccount.country,
            },
          });
          const affectedRooms = new Set<string>([client.roomId]);
          if (vTarget?.roomId) affectedRooms.add(vTarget.roomId);
          for (const rid of affectedRooms) {
            broadcastToRoom(rid, {
              type: 'users:update',
              roomId: rid,
              onlineUsers: getOnlineUsersForRoom(rid),
            });
          }
        } else if (event.action === 'kick') {
          if (!canDo(session.profile, 'canKickUsers')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية طرد الأعضاء.' });
            return;
          }
          const affectedRooms = new Set<string>();
          for (const ts of targetSessions) {
            if (ts.profile.roomId && ts.profile.roomId !== SPACE_ROOM_ID) {
              affectedRooms.add(ts.profile.roomId);
            }
          }
          removeUserFromAllVoiceMics(targetId);
          const targetSockets = userSockets.get(targetId);
          if (targetSockets) {
            for (const targetWs of targetSockets) {
              const targetClient = clients.get(targetWs);
              if (targetClient) {
                targetClient.suppressedLeaveNotice = true;
                if (targetClient.roomId && targetClient.roomId !== SPACE_ROOM_ID) {
                  affectedRooms.add(targetClient.roomId);
                }
              }
              sendToSocket(targetWs, {
                type: 'mod:notice',
                message: `تم إخراجك من الغرفة بواسطة ${session.profile.username}.`,
                kicked: true,
              });
              targetWs.close();
            }
          }
          const vTarget = virtualOnlineUsers.get(targetId);
          if (vTarget) {
            const vPrevRoom = vTarget.roomId;
            if (vPrevRoom && vPrevRoom !== SPACE_ROOM_ID) affectedRooms.add(vPrevRoom);
            virtualOnlineUsers.delete(targetId);
            broadcastToRoom(vPrevRoom, {
              type: 'users:update',
              roomId: vPrevRoom,
              onlineUsers: getOnlineUsersForRoom(vPrevRoom),
            });
            broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
          }
          if (affectedRooms.size === 0) {
            affectedRooms.add(client.roomId);
          }
          const kickedProfile: ChatUser = targetSessions[0]?.profile ||
            vTarget || {
              id: targetId,
              username: targetAccount?.username || targetId,
              isGuest: !targetAccount,
              role: targetAccount?.role || 'visitor',
              gender: targetAccount?.gender || 'male',
              nameColor: targetAccount?.nameColor || '#ea580c',
              statusText: targetAccount?.statusText || '',
              bio: targetAccount?.bio || '',
              avatarSymbol: targetAccount?.avatarSymbol || '🚪',
              avatarUrl: targetAccount?.avatarUrl,
              roomId: client.roomId,
              joinedAt: Date.now(),
              isMuted: Boolean(targetAccount?.isMuted),
              country: targetAccount?.country || '',
            };
          for (const rid of affectedRooms) {
            announceRoomKick(rid, kickedProfile, session.profile.username);
          }
          store.sessions = store.sessions.filter((s) => s.userId !== targetId);
          pushAdminLog(session.profile.username, 'طرد من الغرفة', targetAccount?.username || vTarget?.username || targetId);
          scheduleSave();
          broadcastAdminStateToStaff();
        }
        if (event.action === 'mute' || event.action === 'unmute') {
          pushAdminLog(
            session.profile.username,
            event.action === 'mute' ? 'كتم عضو' : 'فك كتم عضو',
            targetAccount?.username || targetSessions[0]?.profile.username || targetId
          );
          scheduleSave();
          broadcastAdminStateToStaff();
        }
        if (event.action === 'promote' || event.action === 'demote') {
          pushAdminLog(
            session.profile.username,
            event.action === 'promote' ? 'ترقية إلى مشرف' : 'إلغاء الإشراف',
            targetAccount?.username || targetId
          );
          scheduleSave();
          broadcastAdminStateToStaff();
        }
        return;
      }

      // Admin Control Panel & Profile Moderation handlers
      if (event.type.startsWith('admin:')) {
        const profileModEvents = new Set([
          'admin:moveUserRoom',
          'admin:ban',
          'admin:setRole',
          'admin:setUserLikes',
          'admin:editUser',
          'admin:deleteAccount',
          'admin:spawnTestMember',
          'admin:setDemoTalkControl',
          'admin:demoDirectAction',
          'admin:setRoyalEntry',
        ]);
        if (!profileModEvents.has(event.type) && !canDo(session.profile, 'canAccessAdminPanel')) {
          sendToSocket(ws, { type: 'error:notice', message: 'غير مصرح لك بالوصول إلى لوحة التحكم.' });
          return;
        }

        if (event.type === 'admin:fetchState') {
          sendToSocket(ws, { type: 'admin:state', data: buildAdminStatePayload() });
          return;
        }

        if (event.type === 'admin:revealNicks') {
          if (!canDo(session.profile, 'canAccessAdminPanel')) {
            sendToSocket(ws, { type: 'error:notice', message: 'كشف النكات متاح للإدارة والمشرفين المخولين فقط.' });
            return;
          }
          const payload = buildNickRevealPayload(event.targetUserId);
          if (!payload) {
            sendToSocket(ws, { type: 'error:notice', message: 'لم يتم العثور على سجل لهذا العضو.' });
            return;
          }
          if (payload.role === 'admin' && session.profile.role !== 'admin') {
            sendToSocket(ws, { type: 'error:notice', message: 'لا يمكن كشف بيانات الإدارة العليا.' });
            return;
          }
          sendToSocket(ws, { type: 'admin:nicksResult', data: payload });
          return;
        }

        if (event.type === 'admin:clearNickHistory') {
          if (session.profile.role !== 'admin') {
            sendToSocket(ws, { type: 'error:notice', message: 'مسح سجل كشف النكات متاح للمدير العام فقط.' });
            return;
          }
          store.nickHistory = [];
          pushAdminLog(session.profile.username, 'مسح سجل كشف النكات والآيبي', 'جميع السجلات');
          scheduleSave();
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:clearRoom') {
          if (!canDo(session.profile, 'canClearRoom')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تنظيف رسائل الغرف.' });
            return;
          }
          const room = store.rooms.find((r) => r.id === event.roomId);
          if (!room) return;
          const sysMsg: ChatMessage = {
            id: `sys-${crypto.randomUUID()}`,
            roomId: room.id,
            userId: 'system',
            username: 'النظام',
            userRole: 'admin',
            userGender: 'male',
            nameColor: '#991B1B',
            text: `تم تنظيف محادثات ${room.name} بواسطة ${session.profile.username}.`,
            textColor: '',
            isBold: false,
            fontSize: 'sm',
            timestamp: Date.now(),
            type: 'system',
          };
          store.messagesByRoom[room.id] = [sysMsg];
          pushAdminLog(session.profile.username, 'تنظيف رسائل الغرفة', room.name);
          scheduleSave();
          broadcastToRoom(room.id, { type: 'room:cleared', roomId: room.id, messages: [sysMsg] });
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:clearAllRooms') {
          if (!canDo(session.profile, 'canClearRoom') || !canDo(session.profile, 'canManageRooms')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تنظيف جميع الغرف.' });
            return;
          }
          for (const room of store.rooms) {
            const sysMsg: ChatMessage = {
              id: `sys-${crypto.randomUUID()}`,
              roomId: room.id,
              userId: 'system',
              username: 'النظام',
              userRole: 'admin',
              userGender: 'male',
              nameColor: '#991B1B',
              text: `تم تنظيف محادثات جميع الغرف بواسطة ${session.profile.username}.`,
              textColor: '',
              isBold: false,
              fontSize: 'sm',
              timestamp: Date.now(),
              type: 'system',
            };
            store.messagesByRoom[room.id] = [sysMsg];
            broadcastToRoom(room.id, { type: 'room:cleared', roomId: room.id, messages: [sysMsg] });
          }
          pushAdminLog(session.profile.username, 'تنظيف جميع الغرف', `${store.rooms.length} غرفة`);
          scheduleSave();
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:moveUserRoom') {
          if (!canDo(session.profile, 'canMoveUsers')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية نقل الأعضاء بين الغرف.' });
            return;
          }
          const targetSessions = store.sessions.filter((s) => s.userId === event.targetUserId);
          const targetIsAdmin = targetSessions.some((s) => s.profile.role === 'admin');
          if (targetIsAdmin && session.profile.role !== 'admin') {
            sendToSocket(ws, { type: 'error:notice', message: 'لا يمكن نقل حساب الإدارة العليا.' });
            return;
          }
          const targetRoom = store.rooms.find((r) => r.id === event.roomId);
          if (!targetRoom) return;
          const vTarget = virtualOnlineUsers.get(event.targetUserId);
          if (vTarget && vTarget.roomId !== targetRoom.id) {
            const prevRoomId = vTarget.roomId;
            if (removeUserFromRoomMics(prevRoomId, event.targetUserId)) {
              broadcastRoomMics(prevRoomId);
            }
            vTarget.roomId = targetRoom.id;
            broadcastToRoom(prevRoomId, {
              type: 'users:update',
              roomId: prevRoomId,
              onlineUsers: getOnlineUsersForRoom(prevRoomId),
            });
            announceRoomMove(prevRoomId, targetRoom.id, vTarget);
            pushAdminLog(session.profile.username, `نقل إلى ${targetRoom.name}`, vTarget.username);
          }
          const targetSockets = userSockets.get(event.targetUserId);
          if (targetSockets) {
            for (const targetWs of targetSockets) {
              const targetClient = clients.get(targetWs);
              const targetSession = targetClient ? getSessionByToken(targetClient.token) : undefined;
              if (!targetClient || !targetSession) continue;
              const prevRoomId = targetClient.roomId;
              if (prevRoomId === targetRoom.id) continue;
              if (removeUserFromRoomMics(prevRoomId, event.targetUserId)) {
                broadcastRoomMics(prevRoomId);
              }
              targetClient.roomId = targetRoom.id;
              targetSession.profile.roomId = targetRoom.id;
              broadcastToRoom(prevRoomId, {
                type: 'users:update',
                roomId: prevRoomId,
                onlineUsers: getOnlineUsersForRoom(prevRoomId),
              });
              sendToSocket(targetWs, {
                type: 'room:joined',
                roomId: targetRoom.id,
                messages: [],
                onlineUsers: getOnlineUsersForRoom(targetRoom.id, targetSession.profile.role === 'admin'),
                mics: isVoiceEnabledRoom(targetRoom.id) ? getRoomMics(targetRoom.id).map((m) => ({ ...m })) : [],
                micRequests: isVoiceEnabledRoom(targetRoom.id) ? [...getRoomMicRequests(targetRoom.id)] : [],
                activeQuiz: getPublicQuiz(targetRoom.id),
              });
              announceRoomMove(prevRoomId, targetRoom.id, targetSession.profile);
              sendToSocket(targetWs, {
                type: 'mod:notice',
                message: `تم نقلك إلى ${targetRoom.name} بواسطة ${session.profile.username}.`,
              });
              pushAdminLog(session.profile.username, `نقل إلى ${targetRoom.name}`, targetSession.profile.username);
            }
          }
          broadcastToRoom(targetRoom.id, {
            type: 'users:update',
            roomId: targetRoom.id,
            onlineUsers: getOnlineUsersForRoom(targetRoom.id),
          });
          broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
          scheduleSave();
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:broadcast') {
          if (!canDo(session.profile, 'canBroadcast')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية إرسال الإعلانات العامة.' });
            return;
          }
          const text = sanitizeText(event.text, 280);
          if (!text) return;
          const now = Date.now();
          pushAdminLog(session.profile.username, 'إعلان عام', text.slice(0, 40));
          broadcastToAll({
            type: 'admin:announcement',
            text,
            by: session.profile.username,
            timestamp: now,
          });
          for (const onlineUser of getOnlineUsersMap().values()) {
            if (onlineUser.id === session.userId) continue;
            pushMemberNotification(onlineUser.id, {
              kind: 'admin',
              fromUserId: session.userId,
              fromUsername: session.profile.username,
              fromNameColor: session.profile.nameColor,
              fromAvatarUrl: session.profile.avatarUrl,
              message: `تنبيه إداري: ${text}`,
              timestamp: now,
            });
          }
          scheduleSave();
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:bulkMicAction') {
          if (!canDo(session.profile, 'canManageMics')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية إدارة المايكات.' });
            return;
          }
          if (event.action === 'lockAll') {
            for (const slot of generalMics) {
              slot.isLocked = true;
              if (slot.userId) {
                const uid = slot.userId;
                slot.userId = null;
                slot.username = null;
                slot.nameColor = undefined;
                slot.avatarUrl = undefined;
                slot.userRole = undefined;
                slot.isMuted = false;
                slot.hasCam = false;
                slot.joinedAt = undefined;
                sendToUser(uid, {
                  type: 'mod:notice',
                  message: `تم قفل جميع المايكات بواسطة ${session.profile.username}.`,
                });
              }
            }
            pushAdminLog(session.profile.username, 'قفل جميع المايكات', 'الغرفة العامة');
          } else if (event.action === 'unlockAll') {
            for (const slot of generalMics) {
              slot.isLocked = false;
            }
            pushAdminLog(session.profile.username, 'فتح جميع المايكات', 'الغرفة العامة');
          } else if (event.action === 'kickAll') {
            for (const slot of generalMics) {
              if (slot.userId) {
                const uid = slot.userId;
                slot.userId = null;
                slot.username = null;
                slot.nameColor = undefined;
                slot.avatarUrl = undefined;
                slot.userRole = undefined;
                slot.isMuted = false;
                slot.hasCam = false;
                slot.joinedAt = undefined;
                sendToUser(uid, {
                  type: 'mod:notice',
                  message: `تم إنزال الجميع من المايكات بواسطة ${session.profile.username}.`,
                });
              }
            }
            pushAdminLog(session.profile.username, 'إنزال الجميع من المايكات', 'الغرفة العامة');
          } else if (event.action === 'muteAll') {
            for (const slot of generalMics) {
              if (slot.userId) slot.isMuted = true;
            }
            pushAdminLog(session.profile.username, 'كتم جميع المتحدثين', 'الغرفة العامة');
          } else if (event.action === 'unmuteAll') {
            for (const slot of generalMics) {
              if (slot.userId) slot.isMuted = false;
            }
            pushAdminLog(session.profile.username, 'فك كتم جميع المايكات', 'الغرفة العامة');
          }
          broadcastGeneralMics();
          scheduleSave();
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:updateSettings') {
          if (!canDo(session.profile, 'canManageSettings')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تعديل إعدادات الموقع.' });
            return;
          }
          const s = event.settings;
          store.settings = {
            siteTitle: sanitizeText(s.siteTitle, 40) || DEFAULT_SETTINGS.siteTitle,
            welcomeBanner: sanitizeText(s.welcomeBanner, 220) || DEFAULT_SETTINGS.welcomeBanner,
            allowGuestLogin: Boolean(s.allowGuestLogin),
            allowRegistration: s.allowRegistration !== false,
            allowWallPosts: Boolean(s.allowWallPosts),
            slowModeSeconds: Math.max(0, Math.min(60, Number(s.slowModeSeconds) || 0)),
            minLikesToChat: Math.max(0, Math.min(1_000_000, Math.round(Number(s.minLikesToChat) || 0))),
            defaultStyle: sanitizeStyleId(s.defaultStyle),
            allowImages: s.allowImages !== false,
            allowVoiceNotes: s.allowVoiceNotes !== false,
            allowPrivateMessages: s.allowPrivateMessages !== false,
            allowMics: s.allowMics !== false,
            allowGames: s.allowGames !== false,
            allowGifts: s.allowGifts !== false,
            allowRoomCreation: s.allowRoomCreation !== false,
            allowProfileEdits: s.allowProfileEdits !== false,
            maintenanceMode: Boolean(s.maintenanceMode),
            maxGuests: Math.max(1, Math.min(500, Math.round(Number(s.maxGuests) || 100))),
            rolePermissions: s.rolePermissions
              ? sanitizeRolePermissions(s.rolePermissions)
              : store.settings.rolePermissions || cloneDefaultRolePermissions(),
            design: s.design
              ? sanitizeSiteDesign(s.design)
              : store.settings.design || { ...DEFAULT_DESIGN_SETTINGS },
            customGifts: Array.isArray(s.customGifts)
              ? sanitizeGiftList(s.customGifts)
              : store.settings.customGifts || DEFAULT_GIFTS.map((g) => ({ ...g })),
            customSmileys: Array.isArray(s.customSmileys)
              ? sanitizeSmileyList(s.customSmileys)
              : store.settings.customSmileys || [],
            banners: Array.isArray(s.banners)
              ? sanitizeBannerList(s.banners)
              : store.settings.banners || [],
          };
          pushAdminLog(session.profile.username, 'تحديث إعدادات الموقع', store.settings.siteTitle);
          scheduleSave();
          broadcastToAll({ type: 'settings:updated', settings: store.settings });
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:updateDesign') {
          if (!canDo(session.profile, 'canManageSettings')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تعديل صور الواجهة والتصميم.' });
            return;
          }
          store.settings = {
            ...store.settings,
            defaultStyle: event.defaultStyle ? sanitizeStyleId(event.defaultStyle) : store.settings.defaultStyle,
            design: sanitizeSiteDesign(event.design),
          };
          pushAdminLog(session.profile.username, 'تحديث صور الواجهة والتصميم', store.settings.defaultStyle || 'custom');
          scheduleSave();
          broadcastToAll({ type: 'settings:updated', settings: store.settings });
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:updateGifts') {
          if (!canDo(session.profile, 'canManageSettings')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تعديل الهدايا.' });
            return;
          }
          const sanitizedGifts = sanitizeGiftList(event.gifts);
          store.settings = {
            ...store.settings,
            customGifts: sanitizedGifts,
          };
          pushAdminLog(session.profile.username, 'تحديث قائمة الهدايا', `${sanitizedGifts.length} هدية`);
          scheduleSave();
          broadcastToAll({ type: 'settings:updated', settings: store.settings });
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:updateSmileys') {
          if (!canDo(session.profile, 'canManageSettings')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تعديل السمايلات.' });
            return;
          }
          const sanitizedSmileys = sanitizeSmileyList(event.smileys);
          store.settings = {
            ...store.settings,
            customSmileys: sanitizedSmileys,
          };
          pushAdminLog(session.profile.username, 'تحديث السمايلات الخارجية', `${sanitizedSmileys.length} سمايل`);
          scheduleSave();
          broadcastToAll({ type: 'settings:updated', settings: store.settings });
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:updateBanners') {
          if (!canDo(session.profile, 'canManageSettings')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تعديل البنرات.' });
            return;
          }
          const sanitizedBanners = sanitizeBannerList(event.banners);
          store.settings = {
            ...store.settings,
            banners: sanitizedBanners,
          };
          pushAdminLog(session.profile.username, 'تحديث بنرات الموقع', `${sanitizedBanners.length} بنر`);
          scheduleSave();
          broadcastToAll({ type: 'settings:updated', settings: store.settings });
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:toggleGhost') {
          if (session.profile.role !== 'admin') {
            sendToSocket(ws, { type: 'error:notice', message: 'الدخول الشبحي متاح للإدارة فقط.' });
            return;
          }
          const enabled = Boolean(event.enabled);
          for (const s of store.sessions) {
            if (s.userId === session.userId) {
              s.profile.isGhost = enabled;
            }
          }
          session.profile.isGhost = enabled;
          if (enabled) {
            removeUserFromAllVoiceMics(session.userId);
          }
          scheduleSave();
          sendToUser(session.userId, { type: 'profile:updated', user: session.profile });
          sendToUser(session.userId, {
            type: 'mod:notice',
            message: enabled
              ? 'تم تفعيل الوضع الشبحي: أنت مخفي الآن عن قائمة المتصلين وعدّاد الغرف.'
              : 'تم إلغاء الوضع الشبحي: أصبحت مرئياً الآن في الغرفة.',
          });
          for (const room of store.rooms) {
            broadcastToRoom(room.id, {
              type: 'users:update',
              roomId: room.id,
              onlineUsers: getOnlineUsersForRoom(room.id),
            });
          }
          broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:updateRolePermissions') {
          if (!canDo(session.profile, 'canManageSettings')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تعديل مصفوفة الصلاحيات.' });
            return;
          }
          store.settings = {
            ...store.settings,
            rolePermissions: sanitizeRolePermissions(event.rolePermissions),
          };
          pushAdminLog(session.profile.username, 'تحديث صلاحيات الرتب', 'جميع الرتب');
          scheduleSave();
          broadcastToAll({ type: 'settings:updated', settings: store.settings });
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:setUserPermissions') {
          if (!canDo(session.profile, 'canManageAccounts')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تعديل صلاحيات الأعضاء.' });
            return;
          }
          const sanitized = sanitizeCustomPermissions(event.permissions);
          const account = store.accounts.find((a) => a.id === event.targetUserId);
          const targetSessions = store.sessions.filter((s) => s.userId === event.targetUserId);
          const vTarget = virtualOnlineUsers.get(event.targetUserId);
          if (account) account.customPermissions = sanitized;
          targetSessions.forEach((s) => (s.profile.customPermissions = sanitized));
          if (vTarget) vTarget.customPermissions = sanitized;
          const targetName = account?.username || targetSessions[0]?.profile.username || vTarget?.username || event.targetUserId;
          pushAdminLog(session.profile.username, 'تخصيص صلاحيات عضو', targetName);
          scheduleSave();
          if (targetSessions[0] || vTarget) {
            broadcastToAll({ type: 'profile:updated', user: targetSessions[0]?.profile || vTarget! });
          }
          for (const room of store.rooms) {
            broadcastToRoom(room.id, {
              type: 'users:update',
              roomId: room.id,
              onlineUsers: getOnlineUsersForRoom(room.id),
            });
          }
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:setUserLikes') {
          if (!canDo(session.profile, 'canManageAccounts')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تعديل لايكات الأعضاء.' });
            return;
          }
          const safeLikes = Math.max(0, Math.min(1_000_000, Math.round(Number(event.likesCount) || 0)));
          const stats = getOrCreateUserStats(event.targetUserId);
          stats.likesCount = safeLikes;
          const account = store.accounts.find((a) => a.id === event.targetUserId);
          pushAdminLog(session.profile.username, `تعديل اللايكات إلى ${safeLikes}`, account?.username || event.targetUserId);
          scheduleSave();
          broadcastToAll({ type: 'user:profileStats', stats });
          broadcastToAll({ type: 'leaderboard:update', stars: getTopStars() });
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:editUser') {
          if (!canDo(session.profile, 'canManageAccounts')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تعديل بيانات الأعضاء.' });
            return;
          }
          const account = store.accounts.find((a) => a.id === event.targetUserId);
          const targetSessions = store.sessions.filter((s) => s.userId === event.targetUserId);
          const vTarget = virtualOnlineUsers.get(event.targetUserId);
          if (!account && targetSessions.length === 0 && !vTarget) return;

          const targetIsAdmin =
            account?.role === 'admin' ||
            targetSessions.some((s) => s.profile.role === 'admin') ||
            vTarget?.role === 'admin';
          if (targetIsAdmin && session.profile.role !== 'admin') {
            sendToSocket(ws, { type: 'error:notice', message: 'لا يمكن تعديل حساب الإدارة العليا.' });
            return;
          }

          let nextName: string | undefined;
          if (typeof event.username === 'string') {
            const cleanedName = sanitizeText(event.username, 28);
            if (cleanedName.length < 2) {
              sendToSocket(ws, { type: 'error:notice', message: 'يجب أن يكون الاسم حرفين على الأقل.' });
              return;
            }
            const lower = cleanedName.toLowerCase();
            const takenByAccount = store.accounts.some(
              (a) => a.id !== event.targetUserId && a.usernameLower === lower
            );
            const takenOnline = Array.from(getOnlineUsersMap().values()).some(
              (u) => u.id !== event.targetUserId && u.username.toLowerCase() === lower
            );
            if (takenByAccount || takenOnline) {
              sendToSocket(ws, { type: 'error:notice', message: 'هذا الاسم مستخدم لعضو آخر.' });
              return;
            }
            nextName = cleanedName;
            if (account) {
              account.username = nextName;
              account.usernameLower = lower;
            }
            targetSessions.forEach((s) => (s.profile.username = nextName!));
            if (vTarget) vTarget.username = nextName;
          }

          let nextNameColor: string | undefined;
          if (typeof event.nameColor === 'string') {
            const color = sanitizeColor(event.nameColor, account?.nameColor || '#0F766E');
            nextNameColor = color;
            if (account) account.nameColor = color;
            targetSessions.forEach((s) => (s.profile.nameColor = color));
            if (vTarget) vTarget.nameColor = color;
          }

          if (typeof event.statusText === 'string') {
            const st = sanitizeText(event.statusText, 48);
            if (st) {
              if (account) account.statusText = st;
              targetSessions.forEach((s) => (s.profile.statusText = st));
              if (vTarget) vTarget.statusText = st;
            }
          }

          let nextGender: UserGender | undefined;
          if (event.gender === 'male' || event.gender === 'female') {
            if (event.targetUserId.startsWith('demo-member-test') && session.profile.role !== 'admin') {
              sendToSocket(ws, { type: 'error:notice', message: 'تحديد جنس العضو التجريبي متاح للمدير العام فقط.' });
              return;
            }
            nextGender = event.gender;
            if (account) account.gender = nextGender;
            targetSessions.forEach((s) => (s.profile.gender = nextGender!));
            if (vTarget) vTarget.gender = nextGender;
          }

          if (event.removeAvatar === true) {
            if (account) account.avatarUrl = 'none';
            targetSessions.forEach((s) => (s.profile.avatarUrl = 'none'));
            if (vTarget) vTarget.avatarUrl = 'none';
          }

          if (event.removeCover === true) {
            if (account) account.coverUrl = undefined;
            targetSessions.forEach((s) => (s.profile.coverUrl = undefined));
            if (vTarget) vTarget.coverUrl = undefined;
          }

          // Sync changes into existing room messages, wall posts, PMs, and mics
          const updatedMicRoomIds = new Set<string>();
          for (const [rid, slots] of roomMicsMap.entries()) {
            for (const slot of slots) {
              if (slot.userId === event.targetUserId) {
                if (nextName) slot.username = nextName;
                if (nextNameColor) slot.nameColor = nextNameColor;
                if (event.removeAvatar === true) slot.avatarUrl = 'none';
                updatedMicRoomIds.add(rid);
              }
            }
            for (const reqItem of getRoomMicRequests(rid)) {
              if (reqItem.userId === event.targetUserId) {
                if (nextName) reqItem.username = nextName;
                if (nextNameColor) reqItem.nameColor = nextNameColor;
                if (event.removeAvatar === true) reqItem.avatarUrl = 'none';
                updatedMicRoomIds.add(rid);
              }
            }
          }

          for (const roomMessages of Object.values(store.messagesByRoom)) {
            for (const msg of roomMessages) {
              if (msg.userId === event.targetUserId) {
                if (nextName) msg.username = nextName;
                if (nextNameColor) msg.nameColor = nextNameColor;
                if (event.removeAvatar === true) msg.avatarUrl = 'none';
              }
            }
          }

          for (const post of store.wallPosts) {
            if (post.userId === event.targetUserId) {
              if (nextName) post.username = nextName;
              if (nextNameColor) post.nameColor = nextNameColor;
              if (event.removeAvatar === true) post.avatarUrl = 'none';
            }
            for (const comment of post.comments) {
              if (comment.userId === event.targetUserId) {
                if (nextName) comment.username = nextName;
                if (nextNameColor) comment.nameColor = nextNameColor;
              }
            }
          }

          for (const pm of store.privateMessages) {
            if (pm.fromUserId === event.targetUserId) {
              if (nextName) pm.fromUsername = nextName;
              if (nextNameColor) pm.fromNameColor = nextNameColor;
              if (event.removeAvatar === true) pm.fromAvatarUrl = 'none';
            }
            if (pm.toUserId === event.targetUserId && nextName) {
              pm.toUsername = nextName;
            }
          }

          const finalName =
            account?.username || targetSessions[0]?.profile.username || vTarget?.username || event.targetUserId;
          const logActionLabel =
            event.removeAvatar && !nextName
              ? 'حذف صورة عضو'
              : event.removeCover && !nextName
              ? 'حذف غلاف عضو'
              : nextGender && !nextName
              ? `تحديد جنس العضو إلى ${nextGender === 'female' ? 'أنثى' : 'ذكر'}`
              : nextName && !event.removeAvatar
              ? `تغيير اسم عضو إلى ${nextName}`
              : 'تعديل بيانات عضو';
          pushAdminLog(session.profile.username, logActionLabel, finalName);
          if (nextName && !event.targetUserId.startsWith('demo-member-test')) {
            const knownIp = targetSessions[0]?.ip || account?.lastIp;
            if (knownIp && knownIp !== 'غير معروف') {
              recordNickAccess({
                userId: event.targetUserId,
                username: nextName,
                isGuest: account ? false : (targetSessions[0]?.isGuest ?? true),
                role: account?.role || targetSessions[0]?.profile.role || 'visitor',
                nameColor: nextNameColor || account?.nameColor || targetSessions[0]?.profile.nameColor || '#0F766E',
                country: account?.country || targetSessions[0]?.profile.country || 'العراق',
                ip: knownIp,
                deviceSummary: targetSessions[0]?.deviceSummary || account?.lastDevice || 'متصفح غير محدد',
                roomId: targetSessions[0]?.profile.roomId || 'general',
              });
            }
          }
          scheduleSave();

          const updatedProfile: ChatUser | undefined =
            targetSessions[0]?.profile ||
            vTarget ||
            (account
              ? {
                  id: account.id,
                  username: account.username,
                  isGuest: false,
                  role: account.role,
                  gender: account.gender,
                  nameColor: account.nameColor,
                  textColor: account.textColor,
                  bgColor: account.bgColor,
                  statusColor: account.statusColor,
                  statusIcon: account.statusIcon,
                  giftIcon: account.giftIcon,
                  giftImageUrl: account.giftImageUrl,
                  giftLabel: account.giftLabel,
                  pmDisabled: account.pmDisabled,
                  socialLinks: account.socialLinks,
                  customPermissions: account.customPermissions,
                  statusText: account.statusText,
                  bio: account.bio,
                  avatarSymbol: account.avatarSymbol,
                  avatarUrl: account.avatarUrl || `dicebear:adventurer:${account.username}`,
                  coverUrl: account.coverUrl,
                  roomId: 'general',
                  joinedAt: Date.now(),
                  isMuted: account.isMuted,
                  royalEntry: account.royalEntry,
                  royalEntryText: account.royalEntryText,
                  likesCount: getOrCreateUserStats(account.id).likesCount,
                  country: account.country,
                }
              : undefined);

          if (updatedProfile) {
            broadcastToAll({ type: 'profile:updated', user: updatedProfile });
          }
          for (const rid of updatedMicRoomIds) {
            broadcastRoomMics(rid);
          }
          broadcastToAll({ type: 'leaderboard:update', stars: getTopStars() });
          for (const room of store.rooms) {
            broadcastToRoom(room.id, {
              type: 'users:update',
              roomId: room.id,
              onlineUsers: getOnlineUsersForRoom(room.id),
            });
          }
          if (event.targetUserId !== session.userId) {
            const noticeParts: string[] = [];
            if (event.removeAvatar) noticeParts.push('تم حذف صورتك الشخصية');
            if (event.removeCover) noticeParts.push('تم حذف صورة الغلاف');
            if (nextName) noticeParts.push(`تم تغيير اسمك إلى "${nextName}"`);
            if (noticeParts.length > 0) {
              sendToUser(event.targetUserId, {
                type: 'mod:notice',
                message: `${noticeParts.join(' و')} من قبل الإدارة.`,
              });
            }
          }
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:setRole') {
          if (!canDo(session.profile, 'canManageAccounts')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تغيير رتب الأعضاء.' });
            return;
          }
          if (event.targetUserId === session.userId) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا يمكنك تغيير رتبتك الحالية.' });
            return;
          }
          const account = store.accounts.find((a) => a.id === event.targetUserId);
          if (!account) return;
          const allowedRoles: UserRole[] = ['member', 'vip', 'moderator', 'admin'];
          if (!allowedRoles.includes(event.role)) return;
          if (event.role === 'admin' && session.profile.role !== 'admin') {
            sendToSocket(ws, { type: 'error:notice', message: 'منح رتبة الإدارة العليا متاح للمدير العام فقط.' });
            return;
          }
          account.role = event.role;
          const targetSessions = store.sessions.filter((s) => s.userId === account.id);
          targetSessions.forEach((s) => (s.profile.role = event.role));
          const vTarget = virtualOnlineUsers.get(account.id);
          if (vTarget) vTarget.role = event.role;
          pushAdminLog(session.profile.username, `تغيير الرتبة إلى ${event.role}`, account.username);
          scheduleSave();
          const updatedProfile: ChatUser = targetSessions[0]?.profile || vTarget || {
            id: account.id,
            username: account.username,
            isGuest: false,
            role: account.role,
            gender: account.gender,
            nameColor: account.nameColor,
            customPermissions: account.customPermissions,
            statusText: account.statusText,
            statusIcon: account.statusIcon,
            bio: account.bio,
            avatarSymbol: account.avatarSymbol,
            avatarUrl: account.avatarUrl || `dicebear:adventurer:${account.username}`,
            roomId: 'general',
            joinedAt: Date.now(),
            isMuted: account.isMuted,
            royalEntry: account.royalEntry,
            royalEntryText: account.royalEntryText,
            country: account.country,
          };
          broadcastToAll({ type: 'profile:updated', user: updatedProfile });
          for (const room of store.rooms) {
            broadcastToRoom(room.id, {
              type: 'users:update',
              roomId: room.id,
              onlineUsers: getOnlineUsersForRoom(room.id),
            });
          }
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:setRoyalEntry') {
          if (!canDo(session.profile, 'canManageAccounts')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية توزيع الدخول الملكي.' });
            return;
          }
          const account = store.accounts.find((a) => a.id === event.targetUserId);
          const targetSessions = store.sessions.filter((s) => s.userId === event.targetUserId);
          const vTarget = virtualOnlineUsers.get(event.targetUserId);
          if (!account && targetSessions.length === 0 && !vTarget) return;

          const targetIsAdmin =
            account?.role === 'admin' ||
            targetSessions.some((s) => s.profile.role === 'admin') ||
            vTarget?.role === 'admin';
          if (targetIsAdmin && session.profile.role !== 'admin') {
            sendToSocket(ws, { type: 'error:notice', message: 'لا يمكن تعديل حساب الإدارة العليا.' });
            return;
          }

          const enabled = Boolean(event.enabled);
          const customPhrase =
            typeof event.royalEntryText === 'string'
              ? sanitizeText(event.royalEntryText, 90)
              : undefined;
          const resolvedPhrase =
            customPhrase ||
            account?.royalEntryText ||
            targetSessions[0]?.profile.royalEntryText ||
            vTarget?.royalEntryText ||
            DEFAULT_ROYAL_ENTRY_TEXT;

          if (account) {
            account.royalEntry = enabled;
            if (typeof event.royalEntryText === 'string') {
              account.royalEntryText = customPhrase || undefined;
            }
          }
          targetSessions.forEach((s) => {
            s.profile.royalEntry = enabled;
            if (typeof event.royalEntryText === 'string') {
              s.profile.royalEntryText = customPhrase || undefined;
            }
          });
          if (vTarget) {
            vTarget.royalEntry = enabled;
            if (typeof event.royalEntryText === 'string') {
              vTarget.royalEntryText = customPhrase || undefined;
            }
          }

          const updatedProfile: ChatUser | undefined =
            targetSessions[0]?.profile ||
            vTarget ||
            (account
              ? {
                  id: account.id,
                  username: account.username,
                  isGuest: false,
                  role: account.role,
                  gender: account.gender,
                  nameColor: account.nameColor,
                  textColor: account.textColor,
                  bgColor: account.bgColor,
                  statusColor: account.statusColor,
                  statusIcon: account.statusIcon,
                  giftIcon: account.giftIcon,
                  giftImageUrl: account.giftImageUrl,
                  giftLabel: account.giftLabel,
                  pmDisabled: account.pmDisabled,
                  socialLinks: account.socialLinks,
                  customPermissions: account.customPermissions,
                  statusText: account.statusText,
                  bio: account.bio,
                  avatarSymbol: account.avatarSymbol,
                  avatarUrl: account.avatarUrl || `dicebear:adventurer:${account.username}`,
                  coverUrl: account.coverUrl,
                  roomId: 'general',
                  joinedAt: Date.now(),
                  isMuted: account.isMuted,
                  royalEntry: account.royalEntry,
                  royalEntryText: account.royalEntryText,
                  likesCount: getOrCreateUserStats(account.id).likesCount,
                  country: account.country,
                }
              : undefined);

          const targetName = updatedProfile?.username || account?.username || event.targetUserId;
          pushAdminLog(
            session.profile.username,
            enabled ? 'منح الدخول الملكي' : 'سحب الدخول الملكي',
            targetName
          );
          scheduleSave();

          if (updatedProfile) {
            broadcastToAll({
              type: 'profile:updated',
              user: {
                ...updatedProfile,
                royalEntry: enabled,
                royalEntryText: customPhrase ?? updatedProfile.royalEntryText,
              },
            });
          }
          for (const room of store.rooms) {
            broadcastToRoom(room.id, {
              type: 'users:update',
              roomId: room.id,
              onlineUsers: getOnlineUsersForRoom(room.id),
            });
          }

          if (event.announceNow && enabled && updatedProfile) {
            let liveRoomId = vTarget?.roomId;
            if (!liveRoomId) {
              for (const c of clients.values()) {
                if (c.userId === event.targetUserId) {
                  liveRoomId = c.roomId;
                  break;
                }
              }
            }
            const targetRoomId = liveRoomId || client.roomId || 'general';
            const roomName = store.rooms.find((r) => r.id === targetRoomId)?.name || 'الغرفة العامة';
            announceRoyalEntry(targetRoomId, {
              ...updatedProfile,
              royalEntry: true,
              royalEntryText: resolvedPhrase,
            }, roomName);
          }

          if (event.targetUserId !== session.userId) {
            sendToUser(event.targetUserId, {
              type: 'mod:notice',
              message: enabled
                ? `تم منحك ميزة الدخول الملكي 👑 من قبل ${session.profile.username}!`
                : `تم سحب ميزة الدخول الملكي من حسابك بواسطة ${session.profile.username}.`,
            });
          }
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:bulkRoyalEntry') {
          if (!canDo(session.profile, 'canManageAccounts')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية توزيع الدخول الملكي.' });
            return;
          }
          const customPhrase =
            typeof event.royalEntryText === 'string'
              ? sanitizeText(event.royalEntryText, 90)
              : undefined;
          const touchedUserIds = new Set<string>();
          let actionLabel = '';

          if (event.target === 'revokeAll') {
            for (const acc of store.accounts) {
              if (acc.royalEntry) {
                acc.royalEntry = false;
                touchedUserIds.add(acc.id);
              }
            }
            for (const s of store.sessions) {
              if (s.profile.royalEntry) {
                s.profile.royalEntry = false;
                touchedUserIds.add(s.userId);
              }
            }
            for (const [vid, vUser] of virtualOnlineUsers.entries()) {
              if (vUser.royalEntry) {
                vUser.royalEntry = false;
                touchedUserIds.add(vid);
              }
            }
            actionLabel = 'سحب الدخول الملكي من الجميع';
          } else if (event.target === 'allOnline') {
            const onlineIds = new Set<string>();
            for (const u of getOnlineUsersMap(true).values()) {
              onlineIds.add(u.id);
            }
            for (const uid of onlineIds) {
              const acc = store.accounts.find((a) => a.id === uid);
              if (acc) {
                acc.royalEntry = true;
                if (customPhrase) acc.royalEntryText = customPhrase;
              }
              for (const s of store.sessions) {
                if (s.userId === uid) {
                  s.profile.royalEntry = true;
                  if (customPhrase) s.profile.royalEntryText = customPhrase;
                }
              }
              const vUser = virtualOnlineUsers.get(uid);
              if (vUser) {
                vUser.royalEntry = true;
                if (customPhrase) vUser.royalEntryText = customPhrase;
              }
              touchedUserIds.add(uid);
            }
            actionLabel = 'توزيع الدخول الملكي لجميع المتصلين';
          } else if (event.target === 'vipAndMods') {
            const eligibleRoles = new Set<UserRole>(['vip', 'moderator', 'admin']);
            for (const acc of store.accounts) {
              if (eligibleRoles.has(acc.role)) {
                acc.royalEntry = true;
                if (customPhrase) acc.royalEntryText = customPhrase;
                touchedUserIds.add(acc.id);
              }
            }
            for (const s of store.sessions) {
              if (eligibleRoles.has(s.profile.role)) {
                s.profile.royalEntry = true;
                if (customPhrase) s.profile.royalEntryText = customPhrase;
                touchedUserIds.add(s.userId);
              }
            }
            for (const [vid, vUser] of virtualOnlineUsers.entries()) {
              if (eligibleRoles.has(vUser.role)) {
                vUser.royalEntry = true;
                if (customPhrase) vUser.royalEntryText = customPhrase;
                touchedUserIds.add(vid);
              }
            }
            actionLabel = 'توزيع الدخول الملكي لـ VIP والمشرفين';
          } else if (event.target === 'allRegistered') {
            for (const acc of store.accounts) {
              acc.royalEntry = true;
              if (customPhrase) acc.royalEntryText = customPhrase;
              touchedUserIds.add(acc.id);
            }
            for (const s of store.sessions) {
              if (!s.isGuest) {
                s.profile.royalEntry = true;
                if (customPhrase) s.profile.royalEntryText = customPhrase;
                touchedUserIds.add(s.userId);
              }
            }
            for (const [vid, vUser] of virtualOnlineUsers.entries()) {
              if (!vUser.isGuest) {
                vUser.royalEntry = true;
                if (customPhrase) vUser.royalEntryText = customPhrase;
                touchedUserIds.add(vid);
              }
            }
            actionLabel = 'توزيع الدخول الملكي لجميع الأعضاء المسجلين';
          }

          if (actionLabel) {
            pushAdminLog(session.profile.username, actionLabel, `${touchedUserIds.size} حساب`);
            scheduleSave();
            const onlineMap = getOnlineUsersMap(true);
            for (const uid of touchedUserIds) {
              const live = onlineMap.get(uid);
              if (live) {
                broadcastToAll({ type: 'profile:updated', user: live });
              }
            }
            for (const room of store.rooms) {
              broadcastToRoom(room.id, {
                type: 'users:update',
                roomId: room.id,
                onlineUsers: getOnlineUsersForRoom(room.id),
              });
            }
            broadcastAdminStateToStaff();
            sendToSocket(ws, {
              type: 'mod:notice',
              message: `${actionLabel} (${touchedUserIds.size}).`,
            });
          }
          return;
        }

        if (event.type === 'admin:ban') {
          if (!canDo(session.profile, 'canBanUsers')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية حظر الأعضاء.' });
            return;
          }
          const username = sanitizeText(event.username, 24);
          const reason = sanitizeText(event.reason, 120) || 'مخالفة قوانين الدردشة';
          if (!username) return;
          const lower = username.toLowerCase();
          if (lower === session.profile.username.toLowerCase()) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا يمكنك حظر نفسك.' });
            return;
          }
          const targetAcc = store.accounts.find(
            (a) => a.id === event.targetUserId || a.usernameLower === lower
          );
          if (targetAcc?.role === 'admin' && session.profile.role !== 'admin') {
            sendToSocket(ws, { type: 'error:notice', message: 'لا يمكن حظر حساب الإدارة العليا.' });
            return;
          }
          if (!store.bans.some((b) => b.usernameLower === lower)) {
            store.bans.unshift({
              id: `ban-${crypto.randomUUID()}`,
              username,
              usernameLower: lower,
              reason,
              bannedBy: session.profile.username,
              bannedAt: Date.now(),
            });
          }
          const affectedRooms = new Set<string>();
          let matchedProfile: ChatUser | undefined;
          // Kick any active sessions matching userId or username
          for (const s of [...store.sessions]) {
            if (s.userId === event.targetUserId || s.profile.username.toLowerCase() === lower) {
              if (!matchedProfile) matchedProfile = s.profile;
              if (s.profile.roomId && s.profile.roomId !== SPACE_ROOM_ID) {
                affectedRooms.add(s.profile.roomId);
              }
              removeUserFromAllVoiceMics(s.userId);
              const targetSockets = userSockets.get(s.userId);
              if (targetSockets) {
                for (const targetWs of targetSockets) {
                  const targetClient = clients.get(targetWs);
                  if (targetClient) {
                    targetClient.suppressedLeaveNotice = true;
                    if (targetClient.roomId && targetClient.roomId !== SPACE_ROOM_ID) {
                      affectedRooms.add(targetClient.roomId);
                    }
                  }
                  sendToSocket(targetWs, {
                    type: 'mod:notice',
                    message: `تم حظرك من الدردشة. السبب: ${reason}`,
                    kicked: true,
                  });
                  targetWs.close();
                }
              }
            }
          }
          for (const [vid, vUser] of [...virtualOnlineUsers.entries()]) {
            if (vid === event.targetUserId || vUser.username.toLowerCase() === lower) {
              if (!matchedProfile) matchedProfile = vUser;
              const prevRoom = vUser.roomId;
              if (prevRoom && prevRoom !== SPACE_ROOM_ID) affectedRooms.add(prevRoom);
              removeUserFromAllVoiceMics(vid);
              virtualOnlineUsers.delete(vid);
              broadcastToRoom(prevRoom, {
                type: 'users:update',
                roomId: prevRoom,
                onlineUsers: getOnlineUsersForRoom(prevRoom),
              });
              broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
            }
          }
          if (affectedRooms.size === 0) {
            affectedRooms.add(client.roomId);
          }
          const bannedProfile: ChatUser = matchedProfile || {
            id: targetAcc?.id || event.targetUserId || `ban:${lower}`,
            username: targetAcc?.username || username,
            isGuest: !targetAcc,
            role: targetAcc?.role || 'member',
            gender: targetAcc?.gender || 'male',
            nameColor: targetAcc?.nameColor || '#991b1b',
            statusText: targetAcc?.statusText || '',
            bio: targetAcc?.bio || '',
            avatarSymbol: targetAcc?.avatarSymbol || '🚫',
            avatarUrl: targetAcc?.avatarUrl,
            roomId: client.roomId,
            joinedAt: Date.now(),
            isMuted: Boolean(targetAcc?.isMuted),
            country: targetAcc?.country || '',
          };
          for (const rid of affectedRooms) {
            announceRoomBan(rid, bannedProfile, session.profile.username, reason);
          }
          store.sessions = store.sessions.filter(
            (s) => s.userId !== event.targetUserId && s.profile.username.toLowerCase() !== lower
          );
          pushAdminLog(session.profile.username, 'حظر مستخدم', `${username} (${reason})`);
          scheduleSave();
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:unban') {
          if (!canDo(session.profile, 'canBanUsers')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية رفع الحظر.' });
            return;
          }
          const entry = store.bans.find((b) => b.id === event.banId);
          if (!entry) return;
          store.bans = store.bans.filter((b) => b.id !== event.banId);
          pushAdminLog(session.profile.username, 'رفع الحظر', entry.username);
          scheduleSave();
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:deleteAccount') {
          if (!canDo(session.profile, 'canManageAccounts')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية حذف الحسابات.' });
            return;
          }
          if (event.targetUserId === session.userId) return;
          const account = store.accounts.find((a) => a.id === event.targetUserId);
          if (!account) return;
          store.accounts = store.accounts.filter((a) => a.id !== event.targetUserId);
          const targetSockets = userSockets.get(account.id);
          if (targetSockets) {
            for (const targetWs of targetSockets) {
              sendToSocket(targetWs, {
                type: 'mod:notice',
                message: 'تم حذف هذا الحساب من قبل الإدارة.',
                kicked: true,
              });
              targetWs.close();
            }
          }
          const vTarget = virtualOnlineUsers.get(account.id);
          if (vTarget) {
            const vPrevRoom = vTarget.roomId;
            virtualOnlineUsers.delete(account.id);
            broadcastToRoom(vPrevRoom, {
              type: 'users:update',
              roomId: vPrevRoom,
              onlineUsers: getOnlineUsersForRoom(vPrevRoom),
            });
            broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
          }
          store.sessions = store.sessions.filter((s) => s.userId !== account.id);
          pushAdminLog(session.profile.username, 'حذف حساب عضو', account.username);
          scheduleSave();
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:spawnTestMember') {
          const canSpawn =
            canDo(session.profile, 'canManageAccounts') ||
            canDo(session.profile, 'canMuteUsers') ||
            canDo(session.profile, 'canKickUsers') ||
            canDo(session.profile, 'canAccessAdminPanel');
          if (!canSpawn) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية إضافة عضو تجريبي.' });
            return;
          }
          const created = ensureDemoTestMember({
            roomId: client.roomId,
            forceNew: true,
            reactivateDefault: true,
          });
          broadcastToRoom(created.roomId, {
            type: 'users:update',
            roomId: created.roomId,
            onlineUsers: getOnlineUsersForRoom(created.roomId),
          });
          broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
          broadcastAdminStateToStaff();
          sendToSocket(ws, {
            type: 'mod:notice',
            message: `تمت إضافة ${created.username} إلى الغرفة لتجربة الصلاحيات (صامت افتراضياً حتى تفعّل له وضع التحدث والتحكم).`,
          });
          return;
        }

        if (event.type === 'admin:setDemoTalkControl') {
          if (session.profile.role !== 'admin') {
            sendToSocket(ws, {
              type: 'error:notice',
              message: 'التحكم في وضع التحدث للعضو التجريبي متاح للمدير العام فقط.',
            });
            return;
          }
          if (!event.targetUserId || !event.targetUserId.startsWith('demo-member-test')) {
            return;
          }
          const enabled = Boolean(event.enabled);
          const account = store.accounts.find((a) => a.id === event.targetUserId);
          const vTarget = virtualOnlineUsers.get(event.targetUserId);
          const targetSessions = store.sessions.filter((s) => s.userId === event.targetUserId);
          if (!account && !vTarget && targetSessions.length === 0) {
            sendToSocket(ws, { type: 'error:notice', message: 'لم يتم العثور على العضو التجريبي.' });
            return;
          }

          if (account) account.demoTalkControlEnabled = enabled;
          if (vTarget) vTarget.demoTalkControlEnabled = enabled;
          targetSessions.forEach((s) => (s.profile.demoTalkControlEnabled = enabled));

          if (!enabled) {
            disableDemoBotActivity(event.targetUserId);
          }

          const updatedUser: ChatUser | undefined = vTarget || targetSessions[0]?.profile || (account
            ? {
                id: account.id,
                username: account.username,
                isGuest: false,
                role: account.role,
                gender: account.gender,
                nameColor: account.nameColor,
                textColor: account.textColor,
                bgColor: account.bgColor,
                statusColor: account.statusColor,
                statusIcon: account.statusIcon,
                giftIcon: account.giftIcon,
                giftImageUrl: account.giftImageUrl,
                giftLabel: account.giftLabel,
                pmDisabled: account.pmDisabled,
                socialLinks: account.socialLinks,
                customPermissions: account.customPermissions,
                statusText: account.statusText,
                bio: account.bio,
                avatarSymbol: account.avatarSymbol,
                avatarUrl: account.avatarUrl || `dicebear:adventurer:${account.username}`,
                coverUrl: account.coverUrl,
                roomId: 'general',
                joinedAt: Date.now(),
                isMuted: account.isMuted,
                royalEntry: account.royalEntry,
                royalEntryText: account.royalEntryText,
                demoTalkControlEnabled: enabled,
                country: account.country,
              }
            : undefined);

          const targetName = updatedUser?.username || account?.username || event.targetUserId;
          pushAdminLog(
            session.profile.username,
            enabled ? 'تفعيل وضع التحدث والتحكم للعضو التجريبي' : 'إيقاف وضع التحدث والتحكم للعضو التجريبي',
            targetName
          );
          scheduleSave();

          if (updatedUser) {
            broadcastToAll({ type: 'profile:updated', user: updatedUser });
          }
          for (const room of store.rooms) {
            broadcastToRoom(room.id, {
              type: 'users:update',
              roomId: room.id,
              onlineUsers: getOnlineUsersForRoom(room.id),
            });
          }
          broadcastAdminStateToStaff();
          sendToSocket(ws, {
            type: 'mod:notice',
            message: enabled
              ? `تم تفعيل وضع التحدث والتحكم لـ ${targetName}. يمكنك الآن توجيهه والتحدث باسمه.`
              : `تم إيقاف وضع التحدث والتحكم لـ ${targetName} (أصبح صامتاً تماماً).`,
          });
          return;
        }

        if (event.type === 'admin:demoDirectAction') {
          if (session.profile.role !== 'admin') {
            sendToSocket(ws, {
              type: 'error:notice',
              message: 'التحكم المباشر بالعضو التجريبي متاح للمدير العام فقط.',
            });
            return;
          }
          if (!event.targetUserId || !event.targetUserId.startsWith('demo-member-test')) {
            return;
          }
          const vTarget = virtualOnlineUsers.get(event.targetUserId);
          if (!vTarget) {
            sendToSocket(ws, { type: 'error:notice', message: 'العضو التجريبي غير متصل حالياً في الغرف.' });
            return;
          }
          if (vTarget.demoTalkControlEnabled !== true) {
            sendToSocket(ws, {
              type: 'error:notice',
              message: 'وضع التحدث والتحكم معطّل لهذا العضو التجريبي. قم بتفعيله أولاً.',
            });
            return;
          }
          if (store.bans.some((b) => b.usernameLower === vTarget.username.toLowerCase())) {
            sendToSocket(ws, { type: 'error:notice', message: 'هذا العضو التجريبي محظور حالياً.' });
            return;
          }

          if (event.action === 'sayRoom') {
            if (vTarget.isMuted) {
              sendToSocket(ws, { type: 'error:notice', message: 'العضو التجريبي مكتوم حالياً من الكتابة.' });
              return;
            }
            const cleanMsg = sanitizeText(event.text, 400);
            if (!cleanMsg) return;
            const roomId = store.rooms.some((r) => r.id === vTarget.roomId) ? vTarget.roomId : 'general';
            const msg: ChatMessage = {
              id: `msg-${crypto.randomUUID()}`,
              roomId,
              userId: vTarget.id,
              username: vTarget.username,
              userRole: vTarget.role,
              userGender: vTarget.gender,
              nameColor: vTarget.nameColor,
              avatarUrl: vTarget.avatarUrl,
              text: cleanMsg,
              textColor: vTarget.textColor || '',
              isBold: false,
              fontSize: 'md',
              timestamp: Date.now(),
              type: 'chat',
            };
            appendRoomMessage(roomId, msg);
            scheduleSave();
            broadcastToRoom(roomId, { type: 'chat:message', message: msg });
            return;
          }

          if (event.action === 'micJoin') {
            if (vTarget.isMuted) {
              sendToSocket(ws, { type: 'error:notice', message: 'العضو التجريبي مكتوم حالياً.' });
              return;
            }
            const requestedIdx =
              typeof event.slotIndex === 'number' && Number.isInteger(event.slotIndex)
                ? event.slotIndex
                : -1;
            let targetSlot = generalMics.find((s) => s.userId === vTarget.id);
            if (!targetSlot) {
              if (
                requestedIdx >= 0 &&
                requestedIdx < GENERAL_MIC_COUNT &&
                !generalMics[requestedIdx].userId
              ) {
                targetSlot = generalMics[requestedIdx];
              } else {
                targetSlot = generalMics.find((s) => !s.userId && (!s.isLocked || canDo(vTarget, 'canManageMics')));
              }
            }
            if (!targetSlot) {
              sendToSocket(ws, { type: 'error:notice', message: 'كل المايكات مشغولة حالياً.' });
              return;
            }
            if (vTarget.roomId !== 'general') {
              const prevRoom = vTarget.roomId;
              vTarget.roomId = 'general';
              broadcastToRoom(prevRoom, {
                type: 'users:update',
                roomId: prevRoom,
                onlineUsers: getOnlineUsersForRoom(prevRoom),
              });
              broadcastToRoom('general', {
                type: 'users:update',
                roomId: 'general',
                onlineUsers: getOnlineUsersForRoom('general'),
              });
              broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
            }
            if (targetSlot.userId !== vTarget.id) {
              removeUserFromGeneralMics(vTarget.id);
              targetSlot.userId = vTarget.id;
              targetSlot.username = vTarget.username;
              targetSlot.nameColor = vTarget.nameColor;
              targetSlot.avatarUrl = vTarget.avatarUrl;
              targetSlot.userRole = vTarget.role;
              targetSlot.isMuted = false;
              targetSlot.hasCam = false;
              targetSlot.joinedAt = Date.now();
            } else {
              targetSlot.isMuted = false;
            }
            broadcastGeneralMics();
            pushAdminLog(session.profile.username, `إصعاد ${vTarget.username} للمايك #${targetSlot.slotIndex + 1}`, 'الغرفة العامة');
            scheduleSave();
            broadcastAdminStateToStaff();
            if (event.text && sanitizeText(event.text, 280)) {
              void speakBotOnGeneralMic(vTarget, sanitizeText(event.text, 280));
            }
            return;
          }

          if (event.action === 'micLeave') {
            if (removeUserFromGeneralMics(vTarget.id)) {
              broadcastGeneralMics();
              broadcastToRoom('general', {
                type: 'mic:speaking',
                roomId: 'general',
                userId: vTarget.id,
                isSpeaking: false,
              });
              pushAdminLog(session.profile.username, `إنزال ${vTarget.username} من المايك`, 'الغرفة العامة');
              scheduleSave();
              broadcastAdminStateToStaff();
            }
            return;
          }

          if (event.action === 'micSpeak') {
            if (vTarget.isMuted) {
              sendToSocket(ws, { type: 'error:notice', message: 'العضو التجريبي مكتوم حالياً.' });
              return;
            }
            const activeSlot = generalMics.find((s) => s.userId === vTarget.id);
            if (!activeSlot) {
              sendToSocket(ws, { type: 'error:notice', message: 'العضو التجريبي ليس على المايك حالياً.' });
              return;
            }
            if (activeSlot.isMuted) {
              sendToSocket(ws, { type: 'error:notice', message: 'مايك العضو التجريبي مكتوم حالياً.' });
              return;
            }
            const requestedLine = sanitizeText(event.text, 280);
            void (async () => {
              const botIsFemale = vTarget.gender === 'female';
              const speech =
                requestedLine ||
                (await generateIraqiChatReply({
                  bot: vTarget,
                  senderName: session.profile.username,
                  incomingText: botIsFemale
                    ? 'تكلمي الآن على المايك بصوتك العراقي الرقيق جملة دافئة ولطيفة تسعد الحاضرين.'
                    : 'تكلم الآن على المايك بصوتك العراقي الرجولي الأصيل جملة طيبة ومحترمة تسعد الحاضرين.',
                  historyLines: [],
                  contextKind: 'room',
                  roomName: 'الديوان العام',
                  isOnMic: true,
                  targetKey: `mic-speak:${vTarget.id}`,
                }));
              await speakBotOnGeneralMic(vTarget, speech);
            })();
            return;
          }

          if (event.action === 'setGender') {
            const nextGender: UserGender = event.gender === 'female' ? 'female' : 'male';
            const acc = store.accounts.find((a) => a.id === vTarget.id);
            if (acc) acc.gender = nextGender;
            vTarget.gender = nextGender;
            store.sessions.filter((s) => s.userId === vTarget.id).forEach((s) => (s.profile.gender = nextGender));
            pushAdminLog(
              session.profile.username,
              `تعيين جنس العضو التجريبي إلى ${nextGender === 'female' ? 'أنثى' : 'ذكر'}`,
              vTarget.username
            );
            scheduleSave();
            broadcastToAll({ type: 'profile:updated', user: vTarget });
            for (const room of store.rooms) {
              broadcastToRoom(room.id, {
                type: 'users:update',
                roomId: room.id,
                onlineUsers: getOnlineUsersForRoom(room.id),
              });
            }
            broadcastAdminStateToStaff();
            return;
          }
        }

        if (event.type === 'admin:updateRoom') {
          if (!canDo(session.profile, 'canManageRooms')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تعديل الغرف.' });
            return;
          }
          const room = store.rooms.find((r) => r.id === event.roomId);
          if (!room) return;
          room.name = sanitizeText(event.name, 36) || room.name;
          room.description = sanitizeText(event.description, 100) || room.description;
          room.topic = sanitizeText(event.topic, 140) || room.topic;
          if (typeof event.password === 'string') {
            room.password = sanitizeText(event.password, 32) || undefined;
          }
          if (typeof event.imageUrl === 'string') {
            const trimmedImg = event.imageUrl.trim();
            if (!trimmedImg) {
              room.imageUrl = '';
            } else {
              const cleanImg = sanitizeImageUrl(trimmedImg);
              if (cleanImg) room.imageUrl = cleanImg;
            }
          }
          pushAdminLog(session.profile.username, 'تعديل غرفة', room.name);
          scheduleSave();
          broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:deleteRoom') {
          if (!canDo(session.profile, 'canManageRooms')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية حذف الغرف.' });
            return;
          }
          if (event.roomId === 'general') {
            sendToSocket(ws, { type: 'error:notice', message: 'لا يمكن حذف الغرفة العامة الرئيسية.' });
            return;
          }
          const room = store.rooms.find((r) => r.id === event.roomId);
          if (!room) return;
          // Move any users currently in this room back to general
          for (const [targetWs, targetClient] of clients.entries()) {
            if (targetClient.roomId === room.id) {
              targetClient.roomId = 'general';
              const targetSession = getSessionByToken(targetClient.token);
              if (targetSession) targetSession.profile.roomId = 'general';
              sendToSocket(targetWs, {
                type: 'room:joined',
                roomId: 'general',
                messages: [],
                onlineUsers: getOnlineUsersForRoom('general'),
                mics: getRoomMics('general').map((m) => ({ ...m })),
                micRequests: [...getRoomMicRequests('general')],
                activeQuiz: getPublicQuiz('general'),
              });
            }
          }
          roomMicsMap.delete(room.id);
          roomMicRequestsMap.delete(room.id);
          store.rooms = store.rooms.filter((r) => r.id !== room.id);
          delete store.messagesByRoom[room.id];
          pushAdminLog(session.profile.username, 'حذف غرفة', room.name);
          scheduleSave();
          broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
          broadcastToRoom('general', {
            type: 'users:update',
            roomId: 'general',
            onlineUsers: getOnlineUsersForRoom('general'),
          });
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:clearWall') {
          if (!canDo(session.profile, 'canDeleteMessages') && !canDo(session.profile, 'canManageSettings')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية تنظيف الحائط.' });
            return;
          }
          store.wallPosts = [];
          pushAdminLog(session.profile.username, 'تنظيف الحائط الاجتماعي', 'جميع المنشورات');
          scheduleSave();
          broadcastToAll({ type: 'wall:cleared' });
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:clearAuditLogs') {
          if (session.profile.role !== 'admin') {
            sendToSocket(ws, { type: 'error:notice', message: 'مسح سجل الإدارة متاح للمدير العام فقط.' });
            return;
          }
          store.auditLogs = [];
          scheduleSave();
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:addBannedWord') {
          if (!canDo(session.profile, 'canManageSettings')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية إدارة فلتر الكلمات.' });
            return;
          }
          const word = sanitizeText(event.word, 32);
          if (word.length < 2) return;
          if (!store.bannedWords.some((w) => w.toLowerCase() === word.toLowerCase())) {
            store.bannedWords.push(word);
            pushAdminLog(session.profile.username, 'إضافة كلمة ممنوعة', word);
            scheduleSave();
          }
          broadcastAdminStateToStaff();
          return;
        }

        if (event.type === 'admin:removeBannedWord') {
          if (!canDo(session.profile, 'canManageSettings')) {
            sendToSocket(ws, { type: 'error:notice', message: 'لا تملك صلاحية إدارة فلتر الكلمات.' });
            return;
          }
          const word = sanitizeText(event.word, 32);
          store.bannedWords = store.bannedWords.filter((w) => w !== word);
          pushAdminLog(session.profile.username, 'إزالة كلمة ممنوعة', word);
          scheduleSave();
          broadcastAdminStateToStaff();
          return;
        }
      }
    });

    ws.on('close', () => {
      const client = clients.get(ws);
      if (!client) return;
      clients.delete(ws);

      const session = getSessionByToken(client.token);
      const wasGhost = Boolean(session?.profile.isGhost);

      const sockets = userSockets.get(client.userId);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          userSockets.delete(client.userId);
          if (removeUserFromRoomMics(client.roomId, client.userId)) {
            broadcastRoomMics(client.roomId);
          }
          if (session && !wasGhost && !client.isInSpace && !client.suppressedLeaveNotice) {
            announceRoomLeave(client.roomId, session.profile);
          }
        }
      }

      if (!wasGhost) {
        broadcastToRoom(client.roomId, {
          type: 'users:update',
          roomId: client.roomId,
          onlineUsers: getOnlineUsersForRoom(client.roomId),
        });
        broadcastToAll({ type: 'rooms:update', rooms: getRoomsWithCounts() });
      } else {
        broadcastRoomUsersUpdate(client.roomId, true);
      }
      broadcastAdminStateToStaff();
    });
  });

  // Heartbeat interval to drop dead sockets
  const heartbeat = setInterval(() => {
    for (const [ws, client] of clients.entries()) {
      if (!client.isAlive) {
        ws.terminate();
        continue;
      }
      client.isAlive = false;
      ws.ping();
    }
  }, 30_000);

  // Idle presence sweep (turns general chat users yellow after PUBLIC_IDLE_TIMEOUT_MS of no public activity)
  const presenceSweep = setInterval(() => {
    const now = Date.now();
    const changedRooms = new Set<string>();
    for (const client of clients.values()) {
      const nextIdle = computeClientIdle(client, now);
      if (Boolean(client.isIdle) !== nextIdle) {
        client.isIdle = nextIdle;
        if (client.roomId && client.roomId !== SPACE_ROOM_ID) {
          changedRooms.add(client.roomId);
        }
      }
    }
    for (const rid of changedRooms) {
      broadcastRoomUsersUpdate(rid, false);
    }
  }, 15_000);

  wss.on('close', () => {
    clearInterval(heartbeat);
    clearInterval(presenceSweep);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ...(hmrDisabled ? { hmr: false, ws: false } : { hmr: { server, path: '/__vite_hmr' } }),
      },
      appType: 'spa',
      plugins: hmrDisabled
        ? [
            {
              name: 'disable-hmr-client-ws',
              enforce: 'post',
              transform(code, id) {
                if (id.replace(/\\/g, '/').endsWith('/vite/dist/client/client.mjs')) {
                  return code.replace(
                    'transport.connect(createHMRHandler(handleMessage));',
                    '/* HMR WebSocket disabled when DISABLE_HMR=true */'
                  );
                }
              },
            },
          ]
        : [],
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use('/src/assets/images', express.static(path.resolve(__dirname, 'src/assets/images')));
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
