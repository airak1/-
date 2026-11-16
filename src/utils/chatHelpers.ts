import type {
  BannerPlacement,
  ChatUser,
  CustomSmiley,
  GiftItem,
  PermissionKey,
  RolePermissionSet,
  RolePermissionsMap,
  SiteBanner,
  SiteDesignSettings,
  SiteSettings,
  UserRole,
  YouCamStyleId,
} from '../types/chat';

export interface YouCamStyleTheme {
  id: YouCamStyleId;
  label: string;
  primary: string;
  primaryDark: string;
  soft: string;
  accent: string;
}

export const YOUCAM_STYLES: YouCamStyleTheme[] = [
  {
    id: 'classic',
    label: 'يوكام الكلاسيكي',
    primary: '#8f0d11',
    primaryDark: '#67070a',
    soft: '#fdf1f1',
    accent: '#44a948',
  },
  {
    id: 'royal-blue',
    label: 'الأزرق الملكي',
    primary: '#1e4068',
    primaryDark: '#162f4d',
    soft: '#edf3fa',
    accent: '#2563eb',
  },
  {
    id: 'gold-baghdad',
    label: 'الذهبي البغدادي',
    primary: '#7a5827',
    primaryDark: '#5e421b',
    soft: '#faf4e8',
    accent: '#b45309',
  },
  {
    id: 'rose-pink',
    label: 'الوردي الجوري',
    primary: '#9b4464',
    primaryDark: '#7a314c',
    soft: '#fdf0f5',
    accent: '#db2777',
  },
  {
    id: 'emerald',
    label: 'الزمردي النيلي',
    primary: '#1f5c48',
    primaryDark: '#164536',
    soft: '#eef8f4',
    accent: '#059669',
  },
];

export const DEFAULT_PORTAL_BANNER_URL =
  '/src/assets/images/portal_baghdad_heritage_1794757980500.jpg';

export const PORTAL_IMAGE_PRESETS: { id: string; label: string; url: string }[] = [
  {
    id: 'heritage',
    label: 'التراث البغدادي',
    url: '/src/assets/images/portal_baghdad_heritage_1794757980500.jpg',
  },
  {
    id: 'tigris',
    label: 'غروب دجلة',
    url: '/src/assets/images/portal_tigris_sunset_1794765166409.jpg',
  },
  {
    id: 'night',
    label: 'ليالي المتنبي',
    url: '/src/assets/images/portal_baghdad_night_1794765167324.jpg',
  },
  {
    id: 'diwan',
    label: 'نقش الديوان',
    url: '/src/assets/images/chat_diwan_pattern_1794765167599.jpg',
  },
];

export const DEFAULT_ROOM_IMAGES: Record<string, string> = {
  general: '/src/assets/images/portal_baghdad_heritage_1794757980500.jpg',
  baghdad: '/src/assets/images/portal_tigris_sunset_1794765166409.jpg',
  basra: '/src/assets/images/chat_diwan_pattern_1794765167599.jpg',
  poetry: '/src/assets/images/portal_baghdad_night_1794765167324.jpg',
  games: '/src/assets/images/chat_diwan_pattern_1794765167599.jpg',
};

export const DEFAULT_DESIGN_SETTINGS: SiteDesignSettings = {
  portalBannerUrl: DEFAULT_PORTAL_BANNER_URL,
  portalThumbUrl: DEFAULT_PORTAL_BANNER_URL,
  showPortalThumb: true,
  portalBannerOpacity: 28,
  portalBgUrl: '',
  chatBgUrl: '',
  chatBgOpacity: 12,
  systemAvatarUrl: '',
  useCustomColors: false,
  primaryColor: '#8f0d11',
  primaryDarkColor: '#67070a',
  softBgColor: '#fdf1f1',
  accentColor: '#44a948',
  chatOddRowColor: '',
  chatEvenRowColor: '',
  headerBgStyle: 'solid',
  borderRadiusMode: 'sharp',
  messageDensity: 'normal',
  avatarShape: 'square',
  showMicStage: true,
  showPortalOnlineList: true,
  showPortalInfoBar: true,
  portalFooterText: '',
  lockUserStyleOverride: false,
};

function cleanDesignImageUrl(input: unknown, fallback: string): string {
  if (typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  if (!trimmed) return '';
  if ((trimmed.startsWith('/src/assets/images/') || trimmed.startsWith('/assets/')) && trimmed.length <= 300) {
    return trimmed;
  }
  if (trimmed.startsWith('data:image/') && !trimmed.startsWith('data:image/svg') && trimmed.length <= 2_200_000) {
    return trimmed;
  }
  if ((trimmed.startsWith('https://') || trimmed.startsWith('http://')) && trimmed.length <= 800) {
    return trimmed;
  }
  return fallback;
}

function cleanHexColor(input: unknown, fallback: string, allowEmpty = false): string {
  if (typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  if (allowEmpty && !trimmed) return '';
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  return fallback;
}

export function sanitizeSiteDesign(input?: Partial<SiteDesignSettings> | null): SiteDesignSettings {
  const base = { ...DEFAULT_DESIGN_SETTINGS };
  if (!input || typeof input !== 'object') return base;

  const headerBgStyle = input.headerBgStyle === 'gradient' ? 'gradient' : 'solid';
  const borderRadiusMode =
    input.borderRadiusMode === 'medium' || input.borderRadiusMode === 'rounded'
      ? input.borderRadiusMode
      : 'sharp';
  const messageDensity =
    input.messageDensity === 'compact' || input.messageDensity === 'spacious'
      ? input.messageDensity
      : 'normal';
  const avatarShape =
    input.avatarShape === 'rounded' || input.avatarShape === 'circle'
      ? input.avatarShape
      : 'square';

  return {
    portalBannerUrl: cleanDesignImageUrl(input.portalBannerUrl, base.portalBannerUrl),
    portalThumbUrl: cleanDesignImageUrl(input.portalThumbUrl, base.portalThumbUrl),
    showPortalThumb: typeof input.showPortalThumb === 'boolean' ? input.showPortalThumb : base.showPortalThumb,
    portalBannerOpacity:
      typeof input.portalBannerOpacity === 'number'
        ? Math.max(5, Math.min(100, Math.round(input.portalBannerOpacity)))
        : base.portalBannerOpacity,
    portalBgUrl: cleanDesignImageUrl(input.portalBgUrl, ''),
    chatBgUrl: cleanDesignImageUrl(input.chatBgUrl, ''),
    chatBgOpacity:
      typeof input.chatBgOpacity === 'number'
        ? Math.max(4, Math.min(45, Math.round(input.chatBgOpacity)))
        : base.chatBgOpacity,
    systemAvatarUrl: cleanDesignImageUrl(input.systemAvatarUrl, ''),
    useCustomColors: Boolean(input.useCustomColors),
    primaryColor: cleanHexColor(input.primaryColor, base.primaryColor),
    primaryDarkColor: cleanHexColor(input.primaryDarkColor, base.primaryDarkColor),
    softBgColor: cleanHexColor(input.softBgColor, base.softBgColor),
    accentColor: cleanHexColor(input.accentColor, base.accentColor),
    chatOddRowColor: cleanHexColor(input.chatOddRowColor, '', true),
    chatEvenRowColor: cleanHexColor(input.chatEvenRowColor, '', true),
    headerBgStyle,
    borderRadiusMode,
    messageDensity,
    avatarShape,
    showMicStage: typeof input.showMicStage === 'boolean' ? input.showMicStage : base.showMicStage,
    showPortalOnlineList:
      typeof input.showPortalOnlineList === 'boolean' ? input.showPortalOnlineList : base.showPortalOnlineList,
    showPortalInfoBar:
      typeof input.showPortalInfoBar === 'boolean' ? input.showPortalInfoBar : base.showPortalInfoBar,
    portalFooterText:
      typeof input.portalFooterText === 'string'
        ? input.portalFooterText.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 120)
        : '',
    lockUserStyleOverride: Boolean(input.lockUserStyleOverride),
  };
}

export function getYouCamStyle(styleId?: YouCamStyleId): YouCamStyleTheme {
  return YOUCAM_STYLES.find((s) => s.id === styleId) || YOUCAM_STYLES[0];
}

export function resolveEffectiveTheme(
  siteSettings?: SiteSettings | null,
  userSelectedStyle?: YouCamStyleId | null
): YouCamStyleTheme {
  const design = siteSettings?.design;
  const effectiveStyleId = design?.lockUserStyleOverride
    ? siteSettings?.defaultStyle || 'classic'
    : userSelectedStyle || siteSettings?.defaultStyle || 'classic';
  const base = getYouCamStyle(effectiveStyleId);
  if (design?.useCustomColors) {
    return {
      ...base,
      primary: design.primaryColor || base.primary,
      primaryDark: design.primaryDarkColor || base.primaryDark,
      soft: design.softBgColor || base.soft,
      accent: design.accentColor || base.accent,
    };
  }
  return base;
}

export function getDesignCssVars(
  theme: YouCamStyleTheme,
  design?: SiteDesignSettings | null
): Record<string, string> {
  const radius =
    design?.borderRadiusMode === 'rounded'
      ? '12px'
      : design?.borderRadiusMode === 'medium'
      ? '6px'
      : '2px';
  const avatarRadius =
    design?.avatarShape === 'circle'
      ? '9999px'
      : design?.avatarShape === 'rounded'
      ? '8px'
      : '2px';
  const headerBg =
    design?.headerBgStyle === 'gradient'
      ? `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`
      : theme.primary;

  return {
    '--ych-primary': theme.primary,
    '--ych-primary-dark': theme.primaryDark,
    '--ych-soft': theme.soft,
    '--ych-accent': theme.accent,
    '--ych-radius': radius,
    '--ych-avatar-radius': avatarRadius,
    '--ych-header-bg': headerBg,
  };
}

export function computeUserLevel(likesCount?: number): number {
  const safeLikes = Math.max(0, Math.floor(likesCount ?? 50));
  return Math.max(1, Math.floor(safeLikes / 50) + 1);
}

export function parseYouTubeId(input: string): string | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    let candidate = '';
    if (host === 'youtu.be') {
      candidate = u.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') {
        candidate = u.searchParams.get('v') || '';
      } else if (
        u.pathname.startsWith('/live/') ||
        u.pathname.startsWith('/shorts/') ||
        u.pathname.startsWith('/embed/')
      ) {
        candidate = u.pathname.split('/').filter(Boolean)[1] || '';
      }
    }
    return /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function extractYouTubeFromText(text: string): { videoId: string; url: string } | null {
  if (!text) return null;
  const urlMatch = text.match(/https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/[^\s]+|youtu\.be\/[^\s]+)/i);
  if (!urlMatch) return null;
  const rawUrl = urlMatch[0].replace(/[),.!?]+$/, '');
  const id = parseYouTubeId(rawUrl);
  if (!id) return null;
  return { videoId: id, url: rawUrl };
}

export const QUIZ_PRESETS: { question: string; answer: string; rewardLikes: number }[] = [
  { question: 'ما هو النهر الذي يشق العاصمة بغداد إلى كرخ ورصافة؟', answer: 'دجلة', rewardLikes: 20 },
  { question: 'ما اسم الشارع الشهير للكتب والمثقفين في بغداد؟', answer: 'المتنبي', rewardLikes: 25 },
  { question: 'أين يلتقي نهرا دجلة والفرات لتكوين شط العرب؟', answer: 'القرنة', rewardLikes: 30 },
  { question: 'ما هي عاصمة إقليم كردستان العراق؟', answer: 'اربيل', rewardLikes: 20 },
  { question: 'ما هو اللقب الشعبي الشهير لمدينة البصرة؟', answer: 'الفيحاء', rewardLikes: 25 },
  { question: 'كم عدد ألوان العلم العراقي؟ (اكتب رقماً)', answer: '4', rewardLikes: 20 },
];

export const NAME_COLORS = [
  { label: 'أخضر دجلة', value: '#0F766E' },
  { label: 'أزرق سماوي', value: '#0369A1' },
  { label: 'عنابي دافئ', value: '#BE185D' },
  { label: 'أرجواني ملكي', value: '#6D28D9' },
  { label: 'كهرماني', value: '#B45309' },
  { label: 'قرمزي', value: '#B91C1C' },
  { label: 'نيلي', value: '#1D4ED8' },
  { label: 'زمردي', value: '#047857' },
];

export const TEXT_COLORS = [
  { label: 'افتراضي', value: '' },
  { label: 'زمردي', value: '#0F766E' },
  { label: 'أزرق', value: '#0284C7' },
  { label: 'وردي', value: '#DB2777' },
  { label: 'بنفسجي', value: '#7C3AED' },
  { label: 'عنبر', value: '#D97706' },
  { label: 'أحمر', value: '#DC2626' },
];

export const AVATAR_SYMBOLS = ['🌙', '✨', '🦅', '🌴', '☕', '🌹', '🎵', '📜', '💎', '🦋', '🌊', '🕊️'];

export const COUNTRIES = [
  'العراق',
  'بغداد',
  'البصرة',
  'نينوى',
  'أربيل',
  'النجف',
  'كربلاء',
  'الأردن',
  'السعودية',
  'الإمارات',
  'الكويت',
  'مصر',
  'سوريا',
  'لبنان',
  'المهجر',
];

export const EMOJI_GROUPS: { title: string; items: string[] }[] = [
  {
    title: 'تعابير',
    items: ['😀', '😂', '🥹', '😍', '🥰', '😎', '🤔', '😅', '😭', '🥳', '🤝', '🙏', '👏', '👍', '👌', '🫡'],
  },
  {
    title: 'قلوب وتحيات',
    items: ['❤️', '🧡', '💛', '💚', '💙', '🤍', '🖤', '🌹', '🌸', '💐', '✨', '🌟', '🔥', '💯', '🎉', '🎊'],
  },
  {
    title: 'تراث وقهوة',
    items: ['☕', '🫖', '🌴', '🌙', '☀️', '🌊', '🎵', '🎶', '📜', '🖋️', '🏆', '👑', '🕊️', '🦅'],
  },
];

export interface StatusIconPreset {
  icon: string;
  label: string;
  category: 'mood' | 'activity';
}

export const STATUS_ICON_PRESETS: StatusIconPreset[] = [
  { icon: '😊', label: 'رايق وسعيد', category: 'mood' },
  { icon: '😎', label: 'مزاج عالي', category: 'mood' },
  { icon: '🥰', label: 'مبسوط', category: 'mood' },
  { icon: '🥳', label: 'أحتفل', category: 'mood' },
  { icon: '😌', label: 'هادئ ومرتاح', category: 'mood' },
  { icon: '🤔', label: 'أفكر', category: 'mood' },
  { icon: '😴', label: 'نعسان', category: 'mood' },
  { icon: '😔', label: 'متضايق', category: 'mood' },
  { icon: '🔥', label: 'متحمس', category: 'mood' },
  { icon: '🤍', label: 'مطمئن', category: 'mood' },
  { icon: '💬', label: 'جاهز للدردشة', category: 'activity' },
  { icon: '☕', label: 'أشرب قهوة', category: 'activity' },
  { icon: '🎵', label: 'أستمع للموسيقى', category: 'activity' },
  { icon: '🎧', label: 'على المايك', category: 'activity' },
  { icon: '🎮', label: 'ألعب الآن', category: 'activity' },
  { icon: '📚', label: 'أدرس / أقرأ', category: 'activity' },
  { icon: '💼', label: 'مشغول بالعمل', category: 'activity' },
  { icon: '🚗', label: 'في الطريق', category: 'activity' },
  { icon: '🍽️', label: 'أتناول الطعام', category: 'activity' },
  { icon: '🌙', label: 'سهران', category: 'activity' },
];

export function getStatusIconLabel(icon?: string): string {
  if (!icon) return '';
  return STATUS_ICON_PRESETS.find((p) => p.icon === icon)?.label || '';
}

export function formatStatusIcon(input: string): string {
  const cleaned = (input || '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
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

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'الإدارة';
    case 'moderator':
      return 'مشرف';
    case 'vip':
      return 'عضو مميز';
    case 'member':
      return 'عضو';
    case 'visitor':
    default:
      return 'زائر';
  }
}

export interface PermissionMeta {
  key: PermissionKey;
  label: string;
  category: 'chat' | 'wall' | 'rooms' | 'moderation' | 'admin';
}

export const PERMISSION_CATALOG: PermissionMeta[] = [
  // الدردشة والوسائط
  { key: 'canChatPublic', label: 'الكتابة في الدردشة العامة', category: 'chat' },
  { key: 'canSendImages', label: 'إرسال الصور والرسومات', category: 'chat' },
  { key: 'canSendVoice', label: 'إرسال البصمات الصوتية', category: 'chat' },
  { key: 'canUsePrivateMsg', label: 'إرسال الرسائل الخاصة', category: 'chat' },
  { key: 'canBypassSlowMode', label: 'تجاوز الوضع البطيء للرسائل', category: 'chat' },
  { key: 'canSendDedications', label: 'إرسال الإهداءات العامة', category: 'chat' },
  { key: 'canSendAlerts', label: 'إرسال التنبيهات للأعضاء', category: 'chat' },
  { key: 'canSendGifts', label: 'إرسال الهدايا واللايكات', category: 'chat' },
  { key: 'canPlayGames', label: 'اللعب والتحديات (X-O / Ludo)', category: 'chat' },
  // الحائط والملف الشخصي
  { key: 'canPostWall', label: 'النشر في الحائط', category: 'wall' },
  { key: 'canCommentWall', label: 'التعليق والإعجاب في الحائط', category: 'wall' },
  { key: 'canEditProfile', label: 'تعديل الملف الشخصي والزخرفة', category: 'wall' },
  // الغرف والمايكات
  { key: 'canCreateRoom', label: 'إنشاء غرف جديدة', category: 'rooms' },
  { key: 'canUseMic', label: 'الصعود على المايكات الصوتية', category: 'rooms' },
  { key: 'canUseCam', label: 'فتح الكاميرا على المايك', category: 'rooms' },
  { key: 'canManageRoomMedia', label: 'تغيير راديو ويوتيوب الغرفة', category: 'rooms' },
  { key: 'canRunQuiz', label: 'إطلاق وإيقاف المسابقات', category: 'rooms' },
  { key: 'canEditRoomTopic', label: 'تعديل موضوع الغرفة المثبت', category: 'rooms' },
  // الإشراف والمراقبة
  { key: 'canDeleteMessages', label: 'حذف رسائل ومنشورات الآخرين', category: 'moderation' },
  { key: 'canMuteUsers', label: 'كتم وفك كتم الأعضاء', category: 'moderation' },
  { key: 'canKickUsers', label: 'طرد الأعضاء من الدردشة', category: 'moderation' },
  { key: 'canMoveUsers', label: 'نقل الأعضاء بين الغرف', category: 'moderation' },
  { key: 'canManageMics', label: 'إدارة المايكات (كتم/إنزال/قفل)', category: 'moderation' },
  { key: 'canClearRoom', label: 'تنظيف رسائل الغرف', category: 'moderation' },
  { key: 'canBroadcast', label: 'إرسال إعلانات عامة للجميع', category: 'moderation' },
  // الإدارة العليا
  { key: 'canAccessAdminPanel', label: 'الدخول إلى لوحة تحكم الإدارة', category: 'admin' },
  { key: 'canBanUsers', label: 'حظر ورفع الحظر عن الأعضاء', category: 'admin' },
  { key: 'canManageRooms', label: 'تعديل وحذف الغرف وكلمات سرها', category: 'admin' },
  { key: 'canManageAccounts', label: 'تغيير الرتب وحذف الحسابات واللايكات', category: 'admin' },
  { key: 'canManageSettings', label: 'تعديل إعدادات الموقع والصلاحيات', category: 'admin' },
];

export const ALL_TRUE_PERMISSIONS: RolePermissionSet = {
  canChatPublic: true,
  canSendImages: true,
  canSendVoice: true,
  canUsePrivateMsg: true,
  canBypassSlowMode: true,
  canSendDedications: true,
  canSendAlerts: true,
  canSendGifts: true,
  canPlayGames: true,
  canPostWall: true,
  canCommentWall: true,
  canEditProfile: true,
  canCreateRoom: true,
  canUseMic: true,
  canUseCam: true,
  canManageRoomMedia: true,
  canRunQuiz: true,
  canEditRoomTopic: true,
  canDeleteMessages: true,
  canMuteUsers: true,
  canKickUsers: true,
  canMoveUsers: true,
  canManageMics: true,
  canClearRoom: true,
  canBroadcast: true,
  canAccessAdminPanel: true,
  canBanUsers: true,
  canManageRooms: true,
  canManageAccounts: true,
  canManageSettings: true,
};

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMap = {
  visitor: {
    ...ALL_TRUE_PERMISSIONS,
    canBypassSlowMode: false,
    canSendDedications: false,
    canCreateRoom: false,
    canManageRoomMedia: false,
    canRunQuiz: false,
    canEditRoomTopic: false,
    canDeleteMessages: false,
    canMuteUsers: false,
    canKickUsers: false,
    canMoveUsers: false,
    canManageMics: false,
    canClearRoom: false,
    canBroadcast: false,
    canAccessAdminPanel: false,
    canBanUsers: false,
    canManageRooms: false,
    canManageAccounts: false,
    canManageSettings: false,
  },
  member: {
    ...ALL_TRUE_PERMISSIONS,
    canBypassSlowMode: false,
    canManageRoomMedia: false,
    canRunQuiz: false,
    canEditRoomTopic: false,
    canDeleteMessages: false,
    canMuteUsers: false,
    canKickUsers: false,
    canMoveUsers: false,
    canManageMics: false,
    canClearRoom: false,
    canBroadcast: false,
    canAccessAdminPanel: false,
    canBanUsers: false,
    canManageRooms: false,
    canManageAccounts: false,
    canManageSettings: false,
  },
  vip: {
    ...ALL_TRUE_PERMISSIONS,
    canDeleteMessages: false,
    canMuteUsers: false,
    canKickUsers: false,
    canMoveUsers: false,
    canManageMics: false,
    canClearRoom: false,
    canBroadcast: false,
    canAccessAdminPanel: false,
    canBanUsers: false,
    canManageRooms: false,
    canManageAccounts: false,
    canManageSettings: false,
  },
  moderator: {
    ...ALL_TRUE_PERMISSIONS,
    canBanUsers: false,
    canManageRooms: false,
    canManageAccounts: false,
    canManageSettings: false,
  },
  admin: {
    ...ALL_TRUE_PERMISSIONS,
  },
};

export function cloneDefaultRolePermissions(): RolePermissionsMap {
  return {
    visitor: { ...DEFAULT_ROLE_PERMISSIONS.visitor },
    member: { ...DEFAULT_ROLE_PERMISSIONS.member },
    vip: { ...DEFAULT_ROLE_PERMISSIONS.vip },
    moderator: { ...DEFAULT_ROLE_PERMISSIONS.moderator },
    admin: { ...DEFAULT_ROLE_PERMISSIONS.admin },
  };
}

export function sanitizeRolePermissions(input?: Partial<RolePermissionsMap> | null): RolePermissionsMap {
  const base = cloneDefaultRolePermissions();
  if (!input || typeof input !== 'object') return base;
  const roles: UserRole[] = ['visitor', 'member', 'vip', 'moderator', 'admin'];
  for (const role of roles) {
    if (role === 'admin') {
      base.admin = { ...ALL_TRUE_PERMISSIONS };
      continue;
    }
    const src = input[role];
    if (src && typeof src === 'object') {
      for (const meta of PERMISSION_CATALOG) {
        if (typeof src[meta.key] === 'boolean') {
          base[role][meta.key] = src[meta.key];
        }
      }
    }
  }
  return base;
}

export function hasUserPermission(
  user: Pick<ChatUser, 'role' | 'customPermissions'> | null | undefined,
  settings: SiteSettings | null | undefined,
  key: PermissionKey
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const customVal = user.customPermissions?.[key];
  if (typeof customVal === 'boolean') return customVal;
  const roleMap = settings?.rolePermissions?.[user.role];
  if (roleMap && typeof roleMap[key] === 'boolean') {
    return roleMap[key];
  }
  return DEFAULT_ROLE_PERMISSIONS[user.role]?.[key] ?? false;
}

export function getCountryFlag(country: string): string {
  const c = (country || '').trim();
  if (['العراق', 'بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف', 'كربلاء'].includes(c)) return '🇮🇶';
  if (c === 'قطر') return '🇶🇦';
  if (c === 'السعودية') return '🇸🇦';
  if (c === 'الأردن') return '🇯🇴';
  if (c === 'الإمارات') return '🇦🇪';
  if (c === 'الكويت') return '🇰🇼';
  if (c === 'مصر') return '🇪🇬';
  if (c === 'سوريا') return '🇸🇾';
  if (c === 'لبنان') return '🇱🇧';
  if (c === 'البحرين') return '🇧🇭';
  if (c === 'عمان') return '🇴🇲';
  if (c === 'اليمن') return '🇾🇪';
  if (c === 'فلسطين') return '🇵🇸';
  return '🌍';
}

export function formatCompactMetric(n: number): string {
  const val = Math.max(0, Math.floor(n));
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(val);
}

export function formatTime(timestamp: number): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '--:--';
  }
}

export function formatRelativeDate(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'الآن';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `منذ ${diffMin} د`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `منذ ${diffHour} س`;
  return new Date(timestamp).toLocaleDateString('ar-IQ', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatCompactMinutes(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}د`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}س`;
  return formatTime(timestamp);
}

export async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('يرجى اختيار ملف صورة صالح.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ملف الصورة غير مدعوم.'));
      img.onload = () => {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذر معالجة الصورة.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
        if (dataUrl.length > 900_000) {
          resolve(canvas.toDataURL('image/jpeg', 0.68));
        } else {
          resolve(dataUrl);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function readImageFileWithGifSupport(
  file: File,
  maxGifBytes = 10_000_000
): Promise<string> {
  const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
  if (!file.type.startsWith('image/') && !isGif) {
    throw new Error('يرجى اختيار ملف صورة أو GIF صالح.');
  }
  if (isGif) {
    if (file.size > maxGifBytes) {
      const maxMb = Math.round((maxGifBytes / 1_000_000) * 10) / 10;
      throw new Error(`حجم ملف GIF كبير جداً (الحد الأقصى ${maxMb} ميجابايت). يمكنك استخدام رابط GIF مباشر.`);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('تعذر قراءة ملف GIF.'));
      reader.onload = () => {
        const res = String(reader.result || '');
        if (res.startsWith('data:image/')) {
          resolve(res);
        } else {
          reject(new Error('تعذر قراءة ملف GIF.'));
        }
      };
      reader.readAsDataURL(file);
    });
  }
  return compressImageFile(file);
}

export const DEFAULT_GIFTS: GiftItem[] = [
  { id: 'rose', label: 'وردة حمراء', emoji: '🌹', cost: 5, enabled: true },
  { id: 'coffee', label: 'قهوة عراقية', emoji: '☕', cost: 10, enabled: true },
  { id: 'heart', label: 'قلب دافئ', emoji: '❤️', cost: 15, enabled: true },
  { id: 'crown', label: 'تاج ملكي', emoji: '👑', cost: 30, enabled: true },
  { id: 'diamond', label: 'ألماسة فاخرة', emoji: '💎', cost: 50, enabled: true },
];

export const BANNER_PLACEMENT_LABELS: Record<BannerPlacement, string> = {
  portal_top: 'أعلى صفحة الدخول',
  portal_bottom: 'أسفل صفحة الدخول',
  chat_top: 'أعلى غرفة الدردشة',
  wall_top: 'أعلى الحائط (زاجل)',
};

export function sanitizeExternalImageUrl(input: unknown): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  if ((trimmed.startsWith('/src/assets/images/') || trimmed.startsWith('/assets/')) && trimmed.length <= 300) {
    return trimmed;
  }
  if ((trimmed.startsWith('https://') || trimmed.startsWith('http://')) && trimmed.length <= 2000) {
    return trimmed;
  }
  if (trimmed.startsWith('data:image/') && !trimmed.startsWith('data:image/svg') && trimmed.length <= 14_500_000) {
    return trimmed;
  }
  return '';
}

export function sanitizeHttpLink(input: unknown): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 700) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return '';
  }
  return '';
}

export function normalizeSmileyCode(raw: string): string {
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F\s:]+/g, '')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .slice(0, 22);
  if (!cleaned) return '';
  return `:${cleaned}:`;
}

export function sanitizeGiftList(input: unknown): GiftItem[] {
  if (!Array.isArray(input)) {
    return DEFAULT_GIFTS.map((g) => ({ ...g }));
  }
  const seen = new Set<string>();
  const result: GiftItem[] = [];
  for (const raw of input.slice(0, 60)) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Partial<GiftItem>;
    const rawId = typeof item.id === 'string' ? item.id.trim().replace(/[^\w-]/g, '').slice(0, 48) : '';
    const id = rawId || `gift-${result.length + 1}`;
    if (seen.has(id)) continue;
    const label =
      typeof item.label === 'string'
        ? item.label.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 32)
        : '';
    if (!label) continue;
    const imageUrl = sanitizeExternalImageUrl(item.imageUrl);
    const emoji =
      typeof item.emoji === 'string'
        ? item.emoji.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 16)
        : '';
    if (!imageUrl && !emoji) continue;
    const cost = Math.max(0, Math.min(100_000, Math.round(Number(item.cost) || 0)));
    seen.add(id);
    result.push({
      id,
      label,
      emoji: emoji || '🎁',
      imageUrl: imageUrl || undefined,
      cost,
      enabled: item.enabled !== false,
    });
  }
  return result;
}

export function sanitizeSmileyList(input: unknown): CustomSmiley[] {
  if (!Array.isArray(input)) return [];
  const seenCodes = new Set<string>();
  const result: CustomSmiley[] = [];
  for (const raw of input.slice(0, 120)) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Partial<CustomSmiley>;
    const code = typeof item.code === 'string' ? normalizeSmileyCode(item.code) : '';
    const imageUrl = sanitizeExternalImageUrl(item.imageUrl);
    if (!code || !imageUrl) continue;
    const lowerCode = code.toLowerCase();
    if (seenCodes.has(lowerCode)) continue;
    seenCodes.add(lowerCode);
    const label =
      typeof item.label === 'string' && item.label.trim()
        ? item.label.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 32)
        : code.replace(/:/g, '');
    const id =
      typeof item.id === 'string' && item.id.trim()
        ? item.id.trim().replace(/[^\w-]/g, '').slice(0, 48)
        : `sm-${result.length + 1}`;
    const category =
      typeof item.category === 'string' && item.category.trim()
        ? item.category.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 24)
        : undefined;
    result.push({
      id,
      code,
      label,
      imageUrl,
      category,
    });
  }
  return result;
}

export function sanitizeBannerList(input: unknown): SiteBanner[] {
  if (!Array.isArray(input)) return [];
  const allowedPlacements: BannerPlacement[] = ['portal_top', 'portal_bottom', 'chat_top', 'wall_top'];
  const result: SiteBanner[] = [];
  for (const raw of input.slice(0, 30)) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Partial<SiteBanner>;
    const imageUrl = sanitizeExternalImageUrl(item.imageUrl);
    if (!imageUrl) continue;
    const title =
      typeof item.title === 'string'
        ? item.title.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 60)
        : '';
    const linkUrl = sanitizeHttpLink(item.linkUrl);
    const placement: BannerPlacement =
      typeof item.placement === 'string' && allowedPlacements.includes(item.placement as BannerPlacement)
        ? (item.placement as BannerPlacement)
        : 'portal_top';
    const id =
      typeof item.id === 'string' && item.id.trim()
        ? item.id.trim().replace(/[^\w-]/g, '').slice(0, 48)
        : `bnr-${result.length + 1}`;
    result.push({
      id,
      title: title || 'بنر إعلاني',
      imageUrl,
      linkUrl: linkUrl || undefined,
      placement,
      enabled: item.enabled !== false,
      createdAt: typeof item.createdAt === 'number' && item.createdAt > 0 ? item.createdAt : Date.now(),
    });
  }
  return result;
}

let audioCtx: AudioContext | null = null;

export function playNotificationChime() {
  try {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!audioCtx) {
      audioCtx = new AudioContextCtor();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.22);
  } catch {
    // Audio playback blocked by browser autoplay policy
  }
}
