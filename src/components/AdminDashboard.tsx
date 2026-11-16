import React, { useEffect, useMemo, useState } from 'react';
import {
  Shield,
  Sliders,
  Users,
  UserCheck,
  DoorOpen,
  Ban,
  Megaphone,
  Trash2,
  Plus,
  Search,
  VolumeX,
  Volume2,
  UserMinus,
  Check,
  Edit3,
  Eraser,
  X,
  Download,
  Lock,
  Unlock,
  KeyRound,
  Mic,
  MicOff,
  RotateCcw,
  Heart,
  Wrench,
  Palette,
  Image as ImageIcon,
  Upload,
  Ghost,
  Gift,
  Smile,
  LayoutTemplate,
  Link2,
  Eye,
  EyeOff,
  ExternalLink,
  UserPlus,
  ImageOff,
  Crown,
  Sparkles,
  Radar,
  Copy,
  Globe,
  Laptop,
} from 'lucide-react';
import type {
  AdminStatePayload,
  BannerPlacement,
  ChatUser,
  CustomSmiley,
  GiftItem,
  NickAccessRecord,
  PermissionKey,
  RolePermissionsMap,
  RolePermissionSet,
  Room,
  SiteBanner,
  SiteDesignSettings,
  SiteSettings,
  UserGender,
  UserRole,
  YouCamStyleId,
} from '../types/chat';
import { UserAvatar } from './UserAvatar';
import { RoomImagePicker, RoomThumbnail } from './RoomImagePicker';
import {
  ALL_TRUE_PERMISSIONS,
  BANNER_PLACEMENT_LABELS,
  DEFAULT_DESIGN_SETTINGS,
  DEFAULT_GIFTS,
  PERMISSION_CATALOG,
  PORTAL_IMAGE_PRESETS,
  YOUCAM_STYLES,
  cloneDefaultRolePermissions,
  formatRelativeDate,
  formatTime,
  getDesignCssVars,
  getRoleLabel,
  getYouCamStyle,
  hasUserPermission,
  normalizeSmileyCode,
  readImageFileWithGifSupport,
  sanitizeBannerList,
  sanitizeExternalImageUrl,
  sanitizeGiftList,
  sanitizeHttpLink,
  sanitizeRolePermissions,
  sanitizeSiteDesign,
  sanitizeSmileyList,
} from '../utils/chatHelpers';

type AdminSection =
  | 'overview'
  | 'design'
  | 'gifts'
  | 'banners'
  | 'smileys'
  | 'permissions'
  | 'royal'
  | 'online'
  | 'accounts'
  | 'nicks'
  | 'rooms'
  | 'security';

const PERMISSION_CATEGORY_LABELS: Record<'chat' | 'wall' | 'rooms' | 'moderation' | 'admin', string> = {
  chat: 'صلاحيات الدردشة والوسائط',
  wall: 'صلاحيات الحائط والملف الشخصي',
  rooms: 'صلاحيات الغرف والمايكات',
  moderation: 'صلاحيات الإشراف والمراقبة',
  admin: 'صلاحيات الإدارة العليا',
};

const EDITABLE_ROLES: UserRole[] = ['visitor', 'member', 'vip', 'moderator', 'admin'];

interface AdminDashboardProps {
  self: ChatUser;
  token: string;
  rooms: Room[];
  adminState: AdminStatePayload | null;
  siteSettings?: SiteSettings;
  onFetchState: () => void;
  onUpdateSettings: (settings: SiteSettings) => void;
  onUpdateDesign?: (design: SiteDesignSettings, defaultStyle?: YouCamStyleId) => void;
  onUpdateGifts?: (gifts: GiftItem[]) => void;
  onUpdateSmileys?: (smileys: CustomSmiley[]) => void;
  onUpdateBanners?: (banners: SiteBanner[]) => void;
  onToggleGhost?: (enabled: boolean) => void;
  onUpdateRolePermissions: (rolePermissions: RolePermissionsMap) => void;
  onSetUserPermissions: (targetUserId: string, permissions: Partial<RolePermissionSet>) => void;
  onSetUserLikes: (targetUserId: string, likesCount: number) => void;
  onEditUser: (
    targetUserId: string,
    payload: {
      username?: string;
      nameColor?: string;
      statusText?: string;
      gender?: UserGender;
      removeAvatar?: boolean;
      removeCover?: boolean;
    }
  ) => void;
  onSetRoyalEntry?: (
    targetUserId: string,
    enabled: boolean,
    royalEntryText?: string,
    announceNow?: boolean
  ) => void;
  onBulkRoyalEntry?: (
    target: 'allOnline' | 'vipAndMods' | 'allRegistered' | 'revokeAll',
    royalEntryText?: string
  ) => void;
  onBulkMicAction: (action: 'lockAll' | 'unlockAll' | 'kickAll' | 'muteAll' | 'unmuteAll') => void;
  onBroadcast: (text: string) => void;
  onModAction: (targetUserId: string, action: 'mute' | 'unmute' | 'kick' | 'promote' | 'demote') => void;
  onSetRole: (targetUserId: string, role: UserRole) => void;
  onBanUser: (username: string, reason: string, targetUserId?: string) => void;
  onUnbanUser: (banId: string) => void;
  onDeleteAccount: (targetUserId: string) => void;
  onMoveUserRoom: (targetUserId: string, roomId: string) => void;
  onCreateRoom: (payload: { name: string; description: string; topic: string; password?: string; imageUrl?: string }) => void;
  onUpdateRoom: (roomId: string, name: string, description: string, topic: string, password?: string, imageUrl?: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onClearRoom: (roomId: string) => void;
  onClearAllRooms: () => void;
  onClearWall: () => void;
  onClearAuditLogs: () => void;
  onAddBannedWord: (word: string) => void;
  onRemoveBannedWord: (word: string) => void;
  onSpawnTestMember?: () => void;
  onSetDemoTalkControl?: (targetUserId: string, enabled: boolean) => void;
  onDemoDirectAction?: (
    targetUserId: string,
    action: 'sayRoom' | 'micJoin' | 'micLeave' | 'micSpeak' | 'setGender',
    payload?: { text?: string; slotIndex?: number; gender?: UserGender }
  ) => void;
  onClearNickHistory?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  self,
  token,
  rooms,
  adminState,
  siteSettings,
  onFetchState,
  onUpdateSettings,
  onUpdateDesign,
  onUpdateGifts,
  onUpdateSmileys,
  onUpdateBanners,
  onToggleGhost,
  onUpdateRolePermissions,
  onSetUserPermissions,
  onSetUserLikes,
  onEditUser,
  onSetRoyalEntry,
  onBulkRoyalEntry,
  onBulkMicAction,
  onBroadcast,
  onModAction,
  onSetRole,
  onBanUser,
  onUnbanUser,
  onDeleteAccount,
  onMoveUserRoom,
  onCreateRoom,
  onUpdateRoom,
  onDeleteRoom,
  onClearRoom,
  onClearAllRooms,
  onClearWall,
  onClearAuditLogs,
  onAddBannedWord,
  onRemoveBannedWord,
  onSpawnTestMember,
  onSetDemoTalkControl,
  onDemoDirectAction,
  onClearNickHistory,
}) => {
  const effectiveSettings = adminState?.settings || siteSettings;
  const isAdmin = self.role === 'admin';
  const canManageSettings = hasUserPermission(self, effectiveSettings, 'canManageSettings');
  const canManageAccounts = hasUserPermission(self, effectiveSettings, 'canManageAccounts');
  const canManageRooms = hasUserPermission(self, effectiveSettings, 'canManageRooms');
  const canBanUsers = hasUserPermission(self, effectiveSettings, 'canBanUsers');
  const canMuteUsers = hasUserPermission(self, effectiveSettings, 'canMuteUsers');
  const canKickUsers = hasUserPermission(self, effectiveSettings, 'canKickUsers');
  const canMoveUsers = hasUserPermission(self, effectiveSettings, 'canMoveUsers');
  const canClearRoom = hasUserPermission(self, effectiveSettings, 'canClearRoom');
  const canBroadcast = hasUserPermission(self, effectiveSettings, 'canBroadcast');
  const canManageMics = hasUserPermission(self, effectiveSettings, 'canManageMics');
  const canClearWall =
    hasUserPermission(self, effectiveSettings, 'canDeleteMessages') || canManageSettings;

  const [section, setSection] = useState<AdminSection>('overview');

  // Settings local form
  const [siteTitle, setSiteTitle] = useState(adminState?.settings.siteTitle || 'عراقية شات');
  const [welcomeBanner, setWelcomeBanner] = useState(adminState?.settings.welcomeBanner || '');
  const [allowGuestLogin, setAllowGuestLogin] = useState(adminState?.settings.allowGuestLogin ?? true);
  const [allowRegistration, setAllowRegistration] = useState(adminState?.settings.allowRegistration ?? true);
  const [allowWallPosts, setAllowWallPosts] = useState(adminState?.settings.allowWallPosts ?? true);
  const [allowImages, setAllowImages] = useState(adminState?.settings.allowImages ?? true);
  const [allowVoiceNotes, setAllowVoiceNotes] = useState(adminState?.settings.allowVoiceNotes ?? true);
  const [allowPrivateMessages, setAllowPrivateMessages] = useState(adminState?.settings.allowPrivateMessages ?? true);
  const [allowMics, setAllowMics] = useState(adminState?.settings.allowMics ?? true);
  const [allowGames, setAllowGames] = useState(adminState?.settings.allowGames ?? true);
  const [allowGifts, setAllowGifts] = useState(adminState?.settings.allowGifts ?? true);
  const [allowRoomCreation, setAllowRoomCreation] = useState(adminState?.settings.allowRoomCreation ?? true);
  const [allowProfileEdits, setAllowProfileEdits] = useState(adminState?.settings.allowProfileEdits ?? true);
  const [maintenanceMode, setMaintenanceMode] = useState(adminState?.settings.maintenanceMode ?? false);
  const [maxGuests, setMaxGuests] = useState(adminState?.settings.maxGuests ?? 100);
  const [defaultStyle, setDefaultStyle] = useState<YouCamStyleId>(adminState?.settings.defaultStyle || 'classic');
  const [slowModeSeconds, setSlowModeSeconds] = useState(adminState?.settings.slowModeSeconds ?? 0);
  const [minLikesToChat, setMinLikesToChat] = useState(adminState?.settings.minLikesToChat ?? 0);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState(false);

  // Portal Images & Internal Design State
  const [designDraft, setDesignDraft] = useState<SiteDesignSettings>(() =>
    sanitizeSiteDesign(adminState?.settings.design || siteSettings?.design)
  );
  const [designStyleDraft, setDesignStyleDraft] = useState<YouCamStyleId>(
    adminState?.settings.defaultStyle || siteSettings?.defaultStyle || 'classic'
  );
  const [designSavedMsg, setDesignSavedMsg] = useState(false);
  const [designUploadBusy, setDesignUploadBusy] = useState<string | null>(null);

  // Gifts, Banners, Smileys management state
  const [giftsDraft, setGiftsDraft] = useState<GiftItem[]>(() => {
    const src = adminState?.settings.customGifts || siteSettings?.customGifts;
    return src && src.length > 0 ? sanitizeGiftList(src) : DEFAULT_GIFTS.map((g) => ({ ...g }));
  });
  const [newGiftLabel, setNewGiftLabel] = useState('');
  const [newGiftCost, setNewGiftCost] = useState(15);
  const [newGiftEmoji, setNewGiftEmoji] = useState('🎁');
  const [newGiftImageUrl, setNewGiftImageUrl] = useState('');
  const [giftUploadBusy, setGiftUploadBusy] = useState(false);
  const [giftError, setGiftError] = useState('');
  const [giftsSavedMsg, setGiftsSavedMsg] = useState(false);

  const [bannersDraft, setBannersDraft] = useState<SiteBanner[]>(() =>
    sanitizeBannerList(adminState?.settings.banners || siteSettings?.banners)
  );
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerImageUrl, setNewBannerImageUrl] = useState('');
  const [newBannerLinkUrl, setNewBannerLinkUrl] = useState('');
  const [newBannerPlacement, setNewBannerPlacement] = useState<BannerPlacement>('portal_top');
  const [bannerUploadBusy, setBannerUploadBusy] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const [bannersSavedMsg, setBannersSavedMsg] = useState(false);

  const [smileysDraft, setSmileysDraft] = useState<CustomSmiley[]>(() =>
    sanitizeSmileyList(adminState?.settings.customSmileys || siteSettings?.customSmileys)
  );
  const [newSmileyCode, setNewSmileyCode] = useState('');
  const [newSmileyLabel, setNewSmileyLabel] = useState('');
  const [newSmileyImageUrl, setNewSmileyImageUrl] = useState('');
  const [smileyUploadBusy, setSmileyUploadBusy] = useState(false);
  const [smileyError, setSmileyError] = useState('');
  const [smileysSavedMsg, setSmileysSavedMsg] = useState(false);

  // Role Permissions Matrix state
  const [selectedPermRole, setSelectedPermRole] = useState<UserRole>('member');
  const [rolePermDraft, setRolePermDraft] = useState<RolePermissionsMap>(() =>
    sanitizeRolePermissions(adminState?.settings.rolePermissions)
  );
  const [permSavedMsg, setPermSavedMsg] = useState(false);

  // Custom Per-User Permissions + Edit Modal
  const [editingAccountTarget, setEditingAccountTarget] = useState<{
    id: string;
    username: string;
    role: UserRole;
    gender?: UserGender;
    nameColor: string;
    statusText?: string;
    likesCount: number;
    customPermissions?: Partial<RolePermissionSet>;
  } | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserColor, setEditUserColor] = useState('#0F766E');
  const [editUserStatus, setEditUserStatus] = useState('');
  const [editUserGender, setEditUserGender] = useState<UserGender>('male');
  const [editUserLikes, setEditUserLikes] = useState(50);
  const [editUserPerms, setEditUserPerms] = useState<Partial<RolePermissionSet>>({});
  const [adminDemoSayText, setAdminDemoSayText] = useState('');
  const [adminDemoMicText, setAdminDemoMicText] = useState('');

  // Broadcast
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);

  // Filters
  const [onlineQuery, setOnlineQuery] = useState('');
  const [accountQuery, setAccountQuery] = useState('');
  const [nicksQuery, setNicksQuery] = useState('');
  const [nicksFilter, setNicksFilter] = useState<'all' | 'multi' | 'online'>('all');
  const [nicksViewMode, setNicksViewMode] = useState<'table' | 'grouped'>('table');
  const [copiedIpValue, setCopiedIpValue] = useState<string | null>(null);
  const [confirmClearNickHistory, setConfirmClearNickHistory] = useState(false);

  // Inline ban modal state
  const [banTarget, setBanTarget] = useState<{ username: string; userId?: string } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [manualBanName, setManualBanName] = useState('');
  const [manualBanReason, setManualBanReason] = useState('');

  // Room editing/creation
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomNameInput, setRoomNameInput] = useState('');
  const [roomDescInput, setRoomDescInput] = useState('');
  const [roomTopicInput, setRoomTopicInput] = useState('');
  const [roomPasswordInput, setRoomPasswordInput] = useState('');
  const [roomImageInput, setRoomImageInput] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomTopic, setNewRoomTopic] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [newRoomImage, setNewRoomImage] = useState('');

  // Backup download state
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<string | null>(null);

  // Word filter
  const [newBannedWord, setNewBannedWord] = useState('');

  // Confirmations without window.confirm
  const [confirmDeleteAccountId, setConfirmDeleteAccountId] = useState<string | null>(null);
  const [confirmClearRoomId, setConfirmClearRoomId] = useState<string | null>(null);
  const [confirmClearAllRooms, setConfirmClearAllRooms] = useState(false);
  const [confirmDeleteRoomId, setConfirmDeleteRoomId] = useState<string | null>(null);
  const [confirmClearWall, setConfirmClearWall] = useState(false);
  const [confirmClearLogs, setConfirmClearLogs] = useState(false);

  // Royal Entry management
  const [royalDefaultPhrase, setRoyalDefaultPhrase] = useState('شرف الديوان بدخول ملكي مهيب 👑');
  const [royalQuery, setRoyalQuery] = useState('');
  const [royalFilter, setRoyalFilter] = useState<'all' | 'royal' | 'online'>('all');
  const [royalRowPhrases, setRoyalRowPhrases] = useState<Record<string, string>>({});
  const [confirmRevokeAllRoyal, setConfirmRevokeAllRoyal] = useState(false);
  const [royalFeedback, setRoyalFeedback] = useState<string | null>(null);

  useEffect(() => {
    onFetchState();
  }, [onFetchState]);

  useEffect(() => {
    if (!adminState) return;
    const s = adminState.settings;
    setSiteTitle(s.siteTitle);
    setWelcomeBanner(s.welcomeBanner);
    setAllowGuestLogin(s.allowGuestLogin);
    setAllowRegistration(s.allowRegistration ?? true);
    setAllowWallPosts(s.allowWallPosts);
    setAllowImages(s.allowImages ?? true);
    setAllowVoiceNotes(s.allowVoiceNotes ?? true);
    setAllowPrivateMessages(s.allowPrivateMessages ?? true);
    setAllowMics(s.allowMics ?? true);
    setAllowGames(s.allowGames ?? true);
    setAllowGifts(s.allowGifts ?? true);
    setAllowRoomCreation(s.allowRoomCreation ?? true);
    setAllowProfileEdits(s.allowProfileEdits ?? true);
    setMaintenanceMode(s.maintenanceMode ?? false);
    setMaxGuests(s.maxGuests ?? 100);
    setDefaultStyle(s.defaultStyle || 'classic');
    setSlowModeSeconds(s.slowModeSeconds);
    setMinLikesToChat(s.minLikesToChat ?? 0);
    setRolePermDraft(sanitizeRolePermissions(s.rolePermissions));
    setDesignDraft(sanitizeSiteDesign(s.design));
    setDesignStyleDraft(s.defaultStyle || 'classic');
    setGiftsDraft(
      Array.isArray(s.customGifts) && s.customGifts.length > 0
        ? sanitizeGiftList(s.customGifts)
        : DEFAULT_GIFTS.map((g) => ({ ...g }))
    );
    setBannersDraft(sanitizeBannerList(s.banners));
    setSmileysDraft(sanitizeSmileyList(s.customSmileys));
  }, [adminState]);

  const handleUploadDesignImage = async (
    field: 'portalBannerUrl' | 'portalThumbUrl' | 'portalBgUrl' | 'chatBgUrl' | 'systemAvatarUrl',
    file?: File
  ) => {
    if (!file) return;
    setDesignUploadBusy(field);
    try {
      const dataUrl = await readImageFileWithGifSupport(file);
      setDesignDraft((prev) => ({ ...prev, [field]: dataUrl }));
    } catch {
      // Ignore invalid image
    } finally {
      setDesignUploadBusy(null);
    }
  };

  const handleSaveDesign = () => {
    if (!canManageSettings || !onUpdateDesign) return;
    const clean = sanitizeSiteDesign(designDraft);
    setDesignDraft(clean);
    onUpdateDesign(clean, designStyleDraft);
    setDesignSavedMsg(true);
    window.setTimeout(() => setDesignSavedMsg(false), 2500);
  };

  const filteredOnline = useMemo(() => {
    const list = adminState?.allOnlineUsers || [];
    const q = onlineQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) => u.username.toLowerCase().includes(q) || u.country.toLowerCase().includes(q)
    );
  }, [adminState?.allOnlineUsers, onlineQuery]);

  const filteredAccounts = useMemo(() => {
    const list = adminState?.registeredUsers || [];
    const q = accountQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) => a.username.toLowerCase().includes(q) || a.country.toLowerCase().includes(q)
    );
  }, [adminState?.registeredUsers, accountQuery]);

  const nickHistoryList = adminState?.nickHistory || [];

  const nicksByIpMap = useMemo(() => {
    const map = new Map<string, NickAccessRecord[]>();
    for (const rec of nickHistoryList) {
      const key = rec.ip || 'غير معروف';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(rec);
    }
    return map;
  }, [nickHistoryList]);

  const filteredNickRecords = useMemo(() => {
    const q = nicksQuery.trim().toLowerCase();
    return nickHistoryList.filter((rec) => {
      if (nicksFilter === 'online' && !rec.isOnline) return false;
      if (nicksFilter === 'multi') {
        const siblings = nicksByIpMap.get(rec.ip || 'غير معروف') || [];
        if (siblings.length <= 1) return false;
      }
      if (!q) return true;
      const siblings = nicksByIpMap.get(rec.ip || 'غير معروف') || [];
      return (
        rec.username.toLowerCase().includes(q) ||
        rec.ip.toLowerCase().includes(q) ||
        rec.deviceSummary.toLowerCase().includes(q) ||
        rec.country.toLowerCase().includes(q) ||
        siblings.some((s) => s.username.toLowerCase().includes(q))
      );
    });
  }, [nickHistoryList, nicksByIpMap, nicksQuery, nicksFilter]);

  const groupedNickEntries = useMemo(() => {
    const groups = new Map<
      string,
      { ip: string; latestAt: number; deviceSummary: string; records: NickAccessRecord[] }
    >();
    for (const rec of filteredNickRecords) {
      const key = rec.ip || 'غير معروف';
      if (!groups.has(key)) {
        groups.set(key, {
          ip: key,
          latestAt: rec.lastSeenAt,
          deviceSummary: rec.deviceSummary,
          records: [],
        });
      }
      const g = groups.get(key)!;
      g.records.push(rec);
      if (rec.lastSeenAt > g.latestAt) {
        g.latestAt = rec.lastSeenAt;
        g.deviceSummary = rec.deviceSummary;
      }
    }
    return Array.from(groups.values()).sort((a, b) => b.latestAt - a.latestAt);
  }, [filteredNickRecords]);

  const uniqueIpCount = nicksByIpMap.size;
  const multiNickIpCount = useMemo(() => {
    let count = 0;
    for (const list of nicksByIpMap.values()) {
      if (list.length > 1) count += 1;
    }
    return count;
  }, [nicksByIpMap]);

  const handleCopyIp = (ip: string) => {
    if (!ip) return;
    navigator.clipboard?.writeText(ip);
    setCopiedIpValue(ip);
    window.setTimeout(() => {
      setCopiedIpValue((prev) => (prev === ip ? null : prev));
    }, 1800);
  };

  const openNicksInspector = (query: string) => {
    setNicksQuery(query);
    setNicksFilter('all');
    setSection('nicks');
  };

  const royalCandidates = useMemo(() => {
    if (!adminState) return [];
    const onlineMap = new Map<string, ChatUser>();
    for (const u of adminState.allOnlineUsers) {
      onlineMap.set(u.id, u);
    }
    const merged = new Map<
      string,
      {
        id: string;
        username: string;
        role: UserRole;
        nameColor: string;
        avatarUrl?: string;
        country: string;
        isOnline: boolean;
        isGuest: boolean;
        royalEntry: boolean;
        royalEntryText?: string;
      }
    >();
    for (const acc of adminState.registeredUsers) {
      const live = onlineMap.get(acc.id);
      merged.set(acc.id, {
        id: acc.id,
        username: live?.username || acc.username,
        role: live?.role || acc.role,
        nameColor: live?.nameColor || acc.nameColor,
        avatarUrl: live?.avatarUrl || acc.avatarUrl,
        country: live?.country || acc.country,
        isOnline: Boolean(live),
        isGuest: false,
        royalEntry: Boolean(live?.royalEntry ?? acc.royalEntry),
        royalEntryText: live?.royalEntryText || acc.royalEntryText,
      });
    }
    for (const u of adminState.allOnlineUsers) {
      if (!merged.has(u.id)) {
        merged.set(u.id, {
          id: u.id,
          username: u.username,
          role: u.role,
          nameColor: u.nameColor,
          avatarUrl: u.avatarUrl,
          country: u.country,
          isOnline: true,
          isGuest: u.isGuest,
          royalEntry: Boolean(u.royalEntry),
          royalEntryText: u.royalEntryText,
        });
      }
    }
    const q = royalQuery.trim().toLowerCase();
    return Array.from(merged.values())
      .filter((item) => {
        if (royalFilter === 'royal' && !item.royalEntry) return false;
        if (royalFilter === 'online' && !item.isOnline) return false;
        if (q && !item.username.toLowerCase().includes(q) && !item.country.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.royalEntry !== b.royalEntry) return a.royalEntry ? -1 : 1;
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        return a.username.localeCompare(b.username, 'ar');
      });
  }, [adminState, royalQuery, royalFilter]);

  const royalHoldersCount = useMemo(() => {
    if (!adminState) return 0;
    const ids = new Set<string>();
    for (const acc of adminState.registeredUsers) {
      if (acc.royalEntry) ids.add(acc.id);
    }
    for (const u of adminState.allOnlineUsers) {
      if (u.royalEntry) ids.add(u.id);
    }
    return ids.size;
  }, [adminState]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) return;
    onUpdateSettings({
      siteTitle: siteTitle.trim() || 'عراقية شات',
      welcomeBanner: welcomeBanner.trim(),
      allowGuestLogin,
      allowRegistration,
      allowWallPosts,
      allowImages,
      allowVoiceNotes,
      allowPrivateMessages,
      allowMics,
      allowGames,
      allowGifts,
      allowRoomCreation,
      allowProfileEdits,
      maintenanceMode,
      maxGuests,
      defaultStyle,
      slowModeSeconds,
      minLikesToChat: Math.max(0, Math.min(1_000_000, Math.round(Number(minLikesToChat) || 0))),
      rolePermissions: rolePermDraft,
      design: sanitizeSiteDesign(designDraft),
      customGifts: sanitizeGiftList(giftsDraft),
      customSmileys: sanitizeSmileyList(smileysDraft),
      banners: sanitizeBannerList(bannersDraft),
    });
    setSettingsSavedMsg(true);
    window.setTimeout(() => setSettingsSavedMsg(false), 2500);
  };

  const handleSaveGifts = (nextList = giftsDraft) => {
    if (!canManageSettings || !onUpdateGifts) return;
    const clean = sanitizeGiftList(nextList);
    setGiftsDraft(clean);
    onUpdateGifts(clean);
    setGiftsSavedMsg(true);
    window.setTimeout(() => setGiftsSavedMsg(false), 2500);
  };

  const handleAddExternalGift = (e: React.FormEvent) => {
    e.preventDefault();
    setGiftError('');
    if (!canManageSettings) return;
    const label = newGiftLabel.trim();
    if (!label) {
      setGiftError('يرجى كتابة اسم الهدية.');
      return;
    }
    const cleanUrl = sanitizeExternalImageUrl(newGiftImageUrl);
    const cleanEmoji = newGiftEmoji.trim() || '🎁';
    if (newGiftImageUrl.trim() && !cleanUrl) {
      setGiftError('رابط صورة الهدية غير صالح (استخدم رابط https:// أو ارفع صورة من جهازك).');
      return;
    }
    const nextItem: GiftItem = {
      id: `gift-${Date.now().toString(36)}`,
      label: label.slice(0, 32),
      emoji: cleanEmoji.slice(0, 16),
      imageUrl: cleanUrl || undefined,
      cost: Math.max(0, Math.min(100_000, Math.round(Number(newGiftCost) || 0))),
      enabled: true,
    };
    const nextList = [...giftsDraft, nextItem];
    setGiftsDraft(nextList);
    setNewGiftLabel('');
    setNewGiftImageUrl('');
    setNewGiftEmoji('🎁');
    setNewGiftCost(15);
    handleSaveGifts(nextList);
  };

  const handleUploadGiftImage = async (file?: File) => {
    if (!file) return;
    setGiftError('');
    setGiftUploadBusy(true);
    try {
      const dataUrl = await readImageFileWithGifSupport(file);
      setNewGiftImageUrl(dataUrl);
    } catch (err) {
      setGiftError(err instanceof Error ? err.message : 'تعذر قراءة الصورة.');
    } finally {
      setGiftUploadBusy(false);
    }
  };

  const handleSaveBanners = (nextList = bannersDraft) => {
    if (!canManageSettings || !onUpdateBanners) return;
    const clean = sanitizeBannerList(nextList);
    setBannersDraft(clean);
    onUpdateBanners(clean);
    setBannersSavedMsg(true);
    window.setTimeout(() => setBannersSavedMsg(false), 2500);
  };

  const handleAddBanner = (e: React.FormEvent) => {
    e.preventDefault();
    setBannerError('');
    if (!canManageSettings) return;
    const cleanImage = sanitizeExternalImageUrl(newBannerImageUrl);
    if (!cleanImage) {
      setBannerError('يرجى إدخال رابط صورة بنر صالح (https://...) أو رفع صورة من جهازك.');
      return;
    }
    const cleanLink = newBannerLinkUrl.trim() ? sanitizeHttpLink(newBannerLinkUrl) : '';
    if (newBannerLinkUrl.trim() && !cleanLink) {
      setBannerError('رابط التوجيه غير صالح (يجب أن يبدأ بـ http:// أو https://).');
      return;
    }
    const nextBanner: SiteBanner = {
      id: `bnr-${Date.now().toString(36)}`,
      title: newBannerTitle.trim().slice(0, 60) || 'بنر إعلاني',
      imageUrl: cleanImage,
      linkUrl: cleanLink || undefined,
      placement: newBannerPlacement,
      enabled: true,
      createdAt: Date.now(),
    };
    const nextList = [nextBanner, ...bannersDraft];
    setBannersDraft(nextList);
    setNewBannerTitle('');
    setNewBannerImageUrl('');
    setNewBannerLinkUrl('');
    handleSaveBanners(nextList);
  };

  const handleUploadBannerImage = async (file?: File) => {
    if (!file) return;
    setBannerError('');
    setBannerUploadBusy(true);
    try {
      const dataUrl = await readImageFileWithGifSupport(file);
      setNewBannerImageUrl(dataUrl);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'تعذر قراءة صورة البنر.');
    } finally {
      setBannerUploadBusy(false);
    }
  };

  const handleSaveSmileys = (nextList = smileysDraft) => {
    if (!canManageSettings || !onUpdateSmileys) return;
    const clean = sanitizeSmileyList(nextList);
    setSmileysDraft(clean);
    onUpdateSmileys(clean);
    setSmileysSavedMsg(true);
    window.setTimeout(() => setSmileysSavedMsg(false), 2500);
  };

  const handleAddExternalSmiley = (e: React.FormEvent) => {
    e.preventDefault();
    setSmileyError('');
    if (!canManageSettings) return;
    const code = normalizeSmileyCode(newSmileyCode);
    if (!code) {
      setSmileyError('يرجى إدخال اختصار للسمايل (مثال: laugh أو ضحك).');
      return;
    }
    if (smileysDraft.some((s) => s.code.toLowerCase() === code.toLowerCase())) {
      setSmileyError(`الاختصار ${code} مستخدم بالفعل في سمايل آخر.`);
      return;
    }
    const cleanImage = sanitizeExternalImageUrl(newSmileyImageUrl);
    if (!cleanImage) {
      setSmileyError('يرجى إدخال رابط صورة السمايل (https://...) أو رفع صورة/GIF من جهازك.');
      return;
    }
    const nextSmiley: CustomSmiley = {
      id: `sm-${Date.now().toString(36)}`,
      code,
      label: newSmileyLabel.trim().slice(0, 32) || code.replace(/:/g, ''),
      imageUrl: cleanImage,
    };
    const nextList = [...smileysDraft, nextSmiley];
    setSmileysDraft(nextList);
    setNewSmileyCode('');
    setNewSmileyLabel('');
    setNewSmileyImageUrl('');
    handleSaveSmileys(nextList);
  };

  const handleUploadSmileyImage = async (file?: File) => {
    if (!file) return;
    setSmileyError('');
    setSmileyUploadBusy(true);
    try {
      const dataUrl = await readImageFileWithGifSupport(file);
      setNewSmileyImageUrl(dataUrl);
    } catch (err) {
      setSmileyError(err instanceof Error ? err.message : 'تعذر قراءة صورة السمايل.');
    } finally {
      setSmileyUploadBusy(false);
    }
  };

  const handleSaveRolePermissions = () => {
    if (!canManageSettings) return;
    onUpdateRolePermissions(rolePermDraft);
    setPermSavedMsg(true);
    window.setTimeout(() => setPermSavedMsg(false), 2500);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canBroadcast || !broadcastText.trim()) return;
    onBroadcast(broadcastText.trim());
    setBroadcastText('');
    setBroadcastSent(true);
    window.setTimeout(() => setBroadcastSent(false), 2500);
  };

  const openManageUserModal = (target: {
    id: string;
    username: string;
    role: UserRole;
    gender?: UserGender;
    nameColor: string;
    statusText?: string;
    likesCount: number;
    customPermissions?: Partial<RolePermissionSet>;
  }) => {
    setEditingAccountTarget(target);
    setEditUserName(target.username);
    setEditUserColor(target.nameColor || '#0F766E');
    setEditUserStatus(target.statusText || '');
    setEditUserGender(target.gender || 'male');
    setEditUserLikes(target.likesCount);
    setEditUserPerms(target.customPermissions ? { ...target.customPermissions } : {});
  };

  const getRoomName = (roomId: string) =>
    roomId === 'space' ? 'الفضاء' : rooms.find((r) => r.id === roomId)?.name || roomId;

  const handleDownloadBackup = async () => {
    if (!canManageSettings || backupBusy) return;
    setBackupBusy(true);
    setBackupFeedback(null);
    try {
      const res = await fetch('/api/admin/backup', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setBackupFeedback('تعذر تصدير النسخة الاحتياطية.');
        return;
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iraqiachat-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBackupFeedback('تم تنزيل النسخة الاحتياطية بنجاح.');
    } catch {
      setBackupFeedback('حدث خطأ أثناء الاتصال بالخادم.');
    } finally {
      setBackupBusy(false);
    }
  };

  if (!adminState) {
    return (
      <div className="flex-1 flex items-center justify-center bg-stone-50 dark:bg-zinc-950 text-sm text-stone-500 dark:text-stone-400">
        جاري تحميل بيانات لوحة التحكم...
      </div>
    );
  }

  const currentRolePerms = rolePermDraft[selectedPermRole];

  return (
    <div className="flex-1 overflow-y-auto chat-scroll bg-stone-50 dark:bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header & Section Tabs */}
        <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold text-rose-900 dark:text-amber-300 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span>لوحة تحكم الإدارة والصلاحيات الشاملة</span>
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                التحكم الكامل بصلاحيات الرتب والأعضاء، الغرف، المايكات، الحظر، الكلمات الممنوعة، وإعدادات الموقع
              </p>
            </div>
            <span className="text-xs font-medium text-stone-600 dark:text-stone-300">
              صلاحيتك الحالية: <strong className="text-rose-800 dark:text-amber-300">{getRoleLabel(self.role)}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-t border-stone-100 dark:border-zinc-800 pt-3">
            {[
              { id: 'overview', label: 'الإعدادات والبث', icon: Sliders },
              { id: 'design', label: 'صور الواجهة والتصميم', icon: Palette },
              { id: 'gifts', label: `الهدايا (${giftsDraft.length})`, icon: Gift },
              { id: 'banners', label: `البنرات (${bannersDraft.length})`, icon: LayoutTemplate },
              { id: 'smileys', label: `السمايلات (${smileysDraft.length})`, icon: Smile },
              { id: 'permissions', label: 'الصلاحيات والرتب (30)', icon: KeyRound },
              { id: 'royal', label: `الدخول الملكي (${royalHoldersCount})`, icon: Crown },
              { id: 'online', label: `المتصلون (${adminState.allOnlineUsers.length})`, icon: Users },
              { id: 'accounts', label: `الأعضاء (${adminState.registeredUsers.length})`, icon: UserCheck },
              { id: 'nicks', label: `كشف النكات (${nickHistoryList.length})`, icon: Radar },
              { id: 'rooms', label: `الغرف والمحتوى (${rooms.length})`, icon: DoorOpen },
              { id: 'security', label: `الحظر والسجل (${adminState.bans.length})`, icon: Ban },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = section === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSection(tab.id as AdminSection)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-rose-800 text-white'
                      : 'bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-zinc-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 1: OVERVIEW, SETTINGS, BULK MICS & BROADCAST */}
        {section === 'overview' && (
          <div className="space-y-6">
            {/* Real Live Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-4">
                <div className="text-xs text-stone-500 dark:text-stone-400">المتصلون الآن</div>
                <div className="font-mono-tabular text-2xl font-bold text-rose-900 dark:text-amber-300 mt-1">
                  {adminState.allOnlineUsers.length}
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-4">
                <div className="text-xs text-stone-500 dark:text-stone-400">الأعضاء المسجلون</div>
                <div className="font-mono-tabular text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">
                  {adminState.registeredUsers.length}
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-4">
                <div className="text-xs text-stone-500 dark:text-stone-400">الرسائل المحفوظة</div>
                <div className="font-mono-tabular text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">
                  {adminState.totalMessagesCount}
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-4">
                <div className="text-xs text-stone-500 dark:text-stone-400">المحظورون</div>
                <div className="font-mono-tabular text-2xl font-bold text-red-700 dark:text-red-400 mt-1">
                  {adminState.bans.length}
                </div>
              </div>
            </div>

            {/* Admin Ghost Mode Quick Card */}
            {isAdmin && onToggleGhost && (
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Ghost className={`w-4 h-4 ${self.isGhost ? 'text-amber-500' : 'text-rose-800 dark:text-amber-300'}`} />
                    <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                      الدخول الشبحي للإدارة (الوضع المخفي)
                    </h2>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-sm ${
                        self.isGhost
                          ? 'bg-zinc-900 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                      }`}
                    >
                      {self.isGhost ? 'نشط (مخفي)' : 'غير مفعل (مرئي)'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    عند التفعيل، يتم إخفاؤك بالكامل من قائمة المتصلين، عدّادات الغرف، إشعارات الدخول والخروج، مؤشر الكتابة، وعدّاد مشاهدات الملفات.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleGhost(!self.isGhost)}
                  className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shrink-0 transition-colors ${
                    self.isGhost
                      ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-amber-300'
                  }`}
                >
                  <Ghost className="w-4 h-4" />
                  <span>{self.isGhost ? 'إلغاء الوضع الشبحي' : 'تفعيل الوضع الشبحي الآن'}</span>
                </button>
              </div>
            )}

            {/* Global Announcement Broadcast */}
            {canBroadcast && (
              <form
                onSubmit={handleSendBroadcast}
                className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-rose-800 dark:text-amber-400" />
                    <span>إرسال إعلان عام فوري لجميع الغرف</span>
                  </h2>
                  {broadcastSent && (
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      تم إرسال الإعلان للجميع
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    maxLength={280}
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    placeholder="اكتب رسالة التنبيه الإداري لتظهر لكل المتواجدين حالياً..."
                    className="flex-1 h-11 px-3.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-700"
                  />
                  <button
                    type="submit"
                    disabled={!broadcastText.trim()}
                    className="h-11 px-5 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    بث الإعلان
                  </button>
                </div>
              </form>
            )}

            {/* Bulk Mic Controls */}
            {canManageMics && (
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <Mic className="w-4 h-4 text-rose-800 dark:text-amber-400" />
                      <span>التحكم الجماعي بالمايكات الخمسة (الغرفة العامة)</span>
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      أوامر سريعة لقفل أو فتح أو كتم أو إنزال جميع المتحدثين على المايكات دفعة واحدة
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onBulkMicAction('unlockAll')}
                    className="px-3 py-2 rounded-lg bg-[#44a948] hover:bg-[#3a963e] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>فتح جميع المايكات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onBulkMicAction('lockAll')}
                    className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>قفل جميع المايكات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onBulkMicAction('muteAll')}
                    className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <MicOff className="w-3.5 h-3.5" />
                    <span>كتم جميع المتحدثين</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onBulkMicAction('unmuteAll')}
                    className="px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>فك كتم المتحدثين</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onBulkMicAction('kickAll')}
                    className="px-3 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>إنزال الكل من المايكات</span>
                  </button>
                </div>
              </div>
            )}

            {/* Site Settings Form */}
            <form
              onSubmit={handleSaveSettings}
              className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-zinc-800 pb-3">
                <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                  إعدادات الموقع والتحكم العام بالميزات
                </h2>
                {settingsSavedMsg && (
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    تم حفظ الإعدادات وتطبيقها فوراً
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                    اسم الشات الرئيسي
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    disabled={!canManageSettings}
                    value={siteTitle}
                    onChange={(e) => setSiteTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-sm disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                    الوضع البطيء للرسائل (ثانية)
                  </label>
                  <select
                    disabled={!canManageSettings}
                    value={slowModeSeconds}
                    onChange={(e) => setSlowModeSeconds(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-sm disabled:opacity-60"
                  >
                    <option value={0}>بدون تأخير (افتراضي)</option>
                    <option value={2}>ثانيتان</option>
                    <option value={5}>5 ثوانٍ</option>
                    <option value={10}>10 ثوانٍ</option>
                    <option value={30}>30 ثانية</option>
                    <option value={60}>60 ثانية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                    الحد الأقصى للزوار المتصلين
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    disabled={!canManageSettings}
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                    className="w-full h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-sm font-mono-tabular disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                    نص الشريط الترحيبي في بوابة الدخول
                  </label>
                  <input
                    type="text"
                    maxLength={220}
                    disabled={!canManageSettings}
                    value={welcomeBanner}
                    onChange={(e) => setWelcomeBanner(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-sm disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                    ستايل الموقع الافتراضي (يوكام هوست)
                  </label>
                  <select
                    disabled={!canManageSettings}
                    value={defaultStyle}
                    onChange={(e) => setDefaultStyle(e.target.value as YouCamStyleId)}
                    className="w-full h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-sm disabled:opacity-60"
                  >
                    {YOUCAM_STYLES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Min Likes Required to Speak in Public Chat */}
              <div className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label
                      htmlFor="min-likes-chat-input"
                      className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-100 flex items-center gap-1.5"
                    >
                      <Heart className="w-4 h-4 text-rose-600 fill-rose-500 shrink-0" />
                      <span>عدد اللايكات المطلوب للتحدث في الدردشة العامة</span>
                    </label>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      حدد الحد الأدنى من اللايكات المطلوبة للكتابة في الغرف العامة (0 = مفتوح للجميع · الإدارة والمشرفون معفون).
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: 'مفتوح (0)', value: 0 },
                      { label: '50', value: 50 },
                      { label: '100', value: 100 },
                      { label: '250', value: 250 },
                      { label: '500', value: 500 },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        disabled={!canManageSettings}
                        onClick={() => setMinLikesToChat(preset.value)}
                        className={`px-2.5 py-1 rounded-md border text-[11px] font-bold font-mono-tabular cursor-pointer transition-colors disabled:opacity-50 ${
                          minLikesToChat === preset.value
                            ? 'bg-rose-700 border-rose-700 text-white'
                            : 'bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-700 text-stone-700 dark:text-stone-300 hover:border-rose-400'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="min-likes-chat-input"
                    type="number"
                    min={0}
                    max={1000000}
                    disabled={!canManageSettings}
                    value={minLikesToChat}
                    onChange={(e) =>
                      setMinLikesToChat(
                        Math.max(0, Math.min(1_000_000, Math.round(Number(e.target.value) || 0)))
                      )
                    }
                    className="w-40 h-9 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm font-mono-tabular font-bold disabled:opacity-60"
                  />
                  <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                    {minLikesToChat > 0
                      ? `مطلوب ${minLikesToChat} لايك على الأقل للتحدث في العام`
                      : 'التحدث في العام متاح لجميع الأعضاء والزوار بدون حد لايكات'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {[
                  { label: 'السماح بدخول الزوار', checked: allowGuestLogin, onChange: setAllowGuestLogin },
                  { label: 'السماح بتسجيل عضويات جديدة', checked: allowRegistration, onChange: setAllowRegistration },
                  { label: 'السماح بالنشر في الحائط', checked: allowWallPosts, onChange: setAllowWallPosts },
                  { label: 'السماح بإرسال الصور والرسومات', checked: allowImages, onChange: setAllowImages },
                  { label: 'السماح بالرسائل الصوتية', checked: allowVoiceNotes, onChange: setAllowVoiceNotes },
                  { label: 'تفعيل المحادثات الخاصة', checked: allowPrivateMessages, onChange: setAllowPrivateMessages },
                  { label: 'تفعيل المايكات الصوتية والكاميرا', checked: allowMics, onChange: setAllowMics },
                  { label: 'تفعيل الألعاب والتحديات', checked: allowGames, onChange: setAllowGames },
                  { label: 'تفعيل نظام الهدايا واللايكات', checked: allowGifts, onChange: setAllowGifts },
                  { label: 'السماح بإنشاء غرف جديدة', checked: allowRoomCreation, onChange: setAllowRoomCreation },
                  { label: 'السماح بتعديل الملف الشخصي', checked: allowProfileEdits, onChange: setAllowProfileEdits },
                  {
                    label: 'وضع الصيانة (دخول الإدارة فقط)',
                    checked: maintenanceMode,
                    onChange: setMaintenanceMode,
                    danger: true,
                  },
                ].map((item) => (
                  <label
                    key={item.label}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${
                      item.danger && item.checked
                        ? 'border-red-300 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30'
                        : 'border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950'
                    }`}
                  >
                    <span className="text-xs font-medium text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                      {item.danger && <Wrench className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                      <span>{item.label}</span>
                    </span>
                    <input
                      type="checkbox"
                      disabled={!canManageSettings}
                      checked={item.checked}
                      onChange={(e) => item.onChange(e.target.checked)}
                      className="w-4 h-4 accent-rose-800 shrink-0"
                    />
                  </label>
                ))}
              </div>

              {canManageSettings ? (
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>حفظ جميع الإعدادات</span>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  تعديل إعدادات الموقع العامة متاح لمن يملك صلاحية إدارة الإعدادات.
                </p>
              )}
            </form>

            {/* Admin JSON Backup Card */}
            {canManageSettings && (
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                    النسخ الاحتياطي لبيانات الدردشة
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    تصدير نسخة احتياطية كاملة بصيغة JSON تضم الغرف، الأعضاء، الصلاحيات، الرسائل، الحائط، وسجل الإدارة.
                  </p>
                  {backupFeedback && (
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      {backupFeedback}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={backupBusy}
                  onClick={handleDownloadBackup}
                  className="px-4 py-2.5 rounded-lg bg-[#44a948] hover:bg-[#3a963e] text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60 cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>{backupBusy ? 'جاري التصدير...' : 'تصدير نسخة احتياطية (JSON)'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* SECTION 1.5: PORTAL IMAGES & INTERNAL DESIGN */}
        {section === 'design' && (() => {
          const baseTheme = getYouCamStyle(designStyleDraft);
          const previewTheme = designDraft.useCustomColors
            ? {
                ...baseTheme,
                primary: designDraft.primaryColor || baseTheme.primary,
                primaryDark: designDraft.primaryDarkColor || baseTheme.primaryDark,
                soft: designDraft.softBgColor || baseTheme.soft,
                accent: designDraft.accentColor || baseTheme.accent,
              }
            : baseTheme;
          const previewVars = getDesignCssVars(previewTheme, designDraft);

          const imageFields: {
            key: 'portalBannerUrl' | 'portalThumbUrl' | 'portalBgUrl' | 'chatBgUrl' | 'systemAvatarUrl';
            title: string;
            subtitle: string;
            extra?: React.ReactNode;
          }[] = [
            {
              key: 'portalBannerUrl',
              title: 'صورة بنر الواجهة الرئيسية',
              subtitle: 'تظهر كخلفية بانورامية في مربع الترحيب الرئيسي في بوابة الدخول.',
              extra: (
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 shrink-0">
                    شفافية البنر: <span className="font-mono-tabular">{designDraft.portalBannerOpacity}%</span>
                  </span>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    disabled={!canManageSettings}
                    value={designDraft.portalBannerOpacity}
                    onChange={(e) =>
                      setDesignDraft((p) => ({ ...p, portalBannerOpacity: Number(e.target.value) }))
                    }
                    className="flex-1 accent-rose-800"
                  />
                </div>
              ),
            },
            {
              key: 'portalThumbUrl',
              title: 'الصورة المصغرة بالواجهة',
              subtitle: 'الصورة المربعة الجانبية داخل بطاقة الدخول الرئيسية.',
              extra: (
                <label className="flex items-center justify-between gap-2 pt-1 text-[11px] font-semibold text-stone-700 dark:text-stone-300 cursor-pointer">
                  <span>إظهار الصورة المصغرة في الواجهة</span>
                  <input
                    type="checkbox"
                    disabled={!canManageSettings}
                    checked={designDraft.showPortalThumb}
                    onChange={(e) =>
                      setDesignDraft((p) => ({ ...p, showPortalThumb: e.target.checked }))
                    }
                    className="w-4 h-4 accent-rose-800"
                  />
                </label>
              ),
            },
            {
              key: 'portalBgUrl',
              title: 'خلفية صفحة الدخول الكاملة',
              subtitle: 'صورة أو نقش يغطي خلفية بوابة الدخول بالكامل خلف البطاقات.',
            },
            {
              key: 'chatBgUrl',
              title: 'خلفية / نقش غرفة الدردشة الداخلية',
              subtitle: 'خلفية أنيقة تظهر وراء ساحة الرسائل داخل الغرف بدون إزعاج القراءة.',
              extra: (
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 shrink-0">
                    شفافية الخلفية: <span className="font-mono-tabular">{designDraft.chatBgOpacity}%</span>
                  </span>
                  <input
                    type="range"
                    min={4}
                    max={45}
                    disabled={!canManageSettings}
                    value={designDraft.chatBgOpacity}
                    onChange={(e) =>
                      setDesignDraft((p) => ({ ...p, chatBgOpacity: Number(e.target.value) }))
                    }
                    className="flex-1 accent-rose-800"
                  />
                </div>
              ),
            },
            {
              key: 'systemAvatarUrl',
              title: 'شعار / أيقونة رسائل النظام',
              subtitle: 'تظهر كصورة رسمية لإدارة الشات في رسائل وإشعارات النظام العامة.',
            },
          ];

          return (
            <div className="space-y-6">
              {/* Top Action & Save Bar */}
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-rose-800 dark:text-amber-400" />
                    <span>التحكم بصور الواجهة والتصميم الداخلي</span>
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    عدّل صور بوابة الدخول وخلفية الدردشة والألوان وتنسيق الرسائل مع معاينة فورية قبل الحفظ.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {designSavedMsg && (
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      تم حفظ ونشر التصميم للجميع!
                    </span>
                  )}
                  {canManageSettings && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setDesignDraft({ ...DEFAULT_DESIGN_SETTINGS });
                          setDesignStyleDraft('classic');
                        }}
                        className="px-3 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>استعادة الافتراضي</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDesign}
                        className="px-4 py-2 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>حفظ وتطبيق التصميم</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Dual Live Mini-Preview */}
              <div
                style={previewVars as React.CSSProperties}
                className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 space-y-3"
              >
                <div className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  معاينة حية (بوابة الدخول + الدردشة الداخلية)
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Mini Portal Preview */}
                  <div className="relative rounded-lg border border-stone-200 dark:border-zinc-800 overflow-hidden bg-[#f5f2f2] dark:bg-zinc-950 p-3 space-y-2">
                    {designDraft.portalBgUrl && (
                      <img
                        src={designDraft.portalBgUrl}
                        alt=""
                        aria-hidden="true"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                      />
                    )}
                    <div
                      style={{ background: previewVars['--ych-header-bg'] }}
                      className="relative z-10 h-7 px-2.5 rounded-xs text-white text-[11px] font-bold flex items-center justify-between"
                    >
                      <span>{siteTitle || 'عراقية شات'}</span>
                      <span
                        style={{ backgroundColor: previewVars['--ych-accent'] }}
                        className="px-1.5 py-0.5 rounded-xs text-[10px]"
                      >
                        متصل
                      </span>
                    </div>
                    <div
                      style={{ borderRadius: previewVars['--ych-radius'] }}
                      className="relative z-10 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 overflow-hidden p-2.5 flex items-center justify-between gap-2 min-h-[76px]"
                    >
                      {designDraft.portalBannerUrl && (
                        <img
                          src={designDraft.portalBannerUrl}
                          alt=""
                          aria-hidden="true"
                          referrerPolicy="no-referrer"
                          style={{ opacity: designDraft.portalBannerOpacity / 100 }}
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        />
                      )}
                      <div className="relative z-10 min-w-0">
                        <div className="text-xs font-extrabold text-[#4a2b28] dark:text-amber-200 truncate">
                          {siteTitle || 'عراقية شات'}
                        </div>
                        <div className="text-[10px] text-stone-700 dark:text-stone-300 truncate max-w-[180px]">
                          {welcomeBanner || 'أهلاً وسهلاً بكم في شات العراق والعرب'}
                        </div>
                        <div
                          style={{ backgroundColor: previewVars['--ych-primary'] }}
                          className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] text-white font-bold"
                        >
                          دخول
                        </div>
                      </div>
                      {designDraft.showPortalThumb && designDraft.portalThumbUrl && (
                        <img
                          src={designDraft.portalThumbUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          style={{ borderRadius: previewVars['--ych-radius'] }}
                          className="relative z-10 w-12 h-12 object-cover border border-white shadow-xs shrink-0"
                        />
                      )}
                    </div>
                    {designDraft.portalFooterText && (
                      <div className="relative z-10 text-[10px] text-center text-stone-500 dark:text-stone-400 truncate">
                        {designDraft.portalFooterText}
                      </div>
                    )}
                  </div>

                  {/* Mini Internal Chat Preview */}
                  <div className="relative rounded-lg border border-stone-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 flex flex-col min-h-[146px]">
                    {designDraft.chatBgUrl && (
                      <img
                        src={designDraft.chatBgUrl}
                        alt=""
                        aria-hidden="true"
                        referrerPolicy="no-referrer"
                        style={{ opacity: designDraft.chatBgOpacity / 100 }}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      />
                    )}
                    <div
                      style={{ background: previewVars['--ych-header-bg'] }}
                      className="relative z-10 h-7 px-2.5 text-white text-[11px] font-bold flex items-center justify-between"
                    >
                      <span>الغرفة العامة</span>
                      {designDraft.showMicStage && (
                        <span className="text-[10px] bg-black/25 px-1.5 py-0.5 rounded-xs">
                          5 مايكات
                        </span>
                      )}
                    </div>
                    <div className="relative z-10 flex-1 divide-y divide-stone-200/70 dark:divide-zinc-800 text-[11px]">
                      <div
                        style={
                          designDraft.chatOddRowColor
                            ? { backgroundColor: designDraft.chatOddRowColor }
                            : undefined
                        }
                        className={`px-2.5 ${
                          designDraft.messageDensity === 'compact'
                            ? 'py-1'
                            : designDraft.messageDensity === 'spacious'
                            ? 'py-2.5'
                            : 'py-1.5'
                        } flex items-center gap-2 ${
                          !designDraft.chatOddRowColor ? 'bg-white/80 dark:bg-zinc-950/80' : ''
                        }`}
                      >
                        <div
                          style={{ borderRadius: previewVars['--ych-avatar-radius'] }}
                          className="w-7 h-7 bg-rose-100 dark:bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center border border-stone-300/60"
                        >
                          {designDraft.systemAvatarUrl ? (
                            <img
                              src={designDraft.systemAvatarUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-rose-800">★</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-red-600 ml-1.5">خدمات الغرفة:</span>
                          <span className="text-stone-700 dark:text-stone-300">مرحباً بكم في الغرفة العامة</span>
                        </div>
                      </div>
                      <div
                        style={
                          designDraft.chatEvenRowColor
                            ? { backgroundColor: designDraft.chatEvenRowColor }
                            : undefined
                        }
                        className={`px-2.5 ${
                          designDraft.messageDensity === 'compact'
                            ? 'py-1'
                            : designDraft.messageDensity === 'spacious'
                            ? 'py-2.5'
                            : 'py-1.5'
                        } flex items-center gap-2 ${
                          !designDraft.chatEvenRowColor ? 'bg-[#eef2fa]/80 dark:bg-zinc-900/70' : ''
                        }`}
                      >
                        <div
                          style={{
                            borderRadius: previewVars['--ych-avatar-radius'],
                            backgroundColor: previewVars['--ych-soft'],
                          }}
                          className="w-7 h-7 shrink-0 flex items-center justify-center text-[10px] font-bold border border-stone-300/60"
                        >
                          ع
                        </div>
                        <div className="min-w-0 flex-1">
                          <span style={{ color: previewVars['--ych-primary'] }} className="font-bold ml-1.5">
                            بغدادي:
                          </span>
                          <span className="text-stone-800 dark:text-stone-200">مساء الخير على الجميع!</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Portal & Internal Images Grid */}
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 dark:border-zinc-800 pb-3">
                  <ImageIcon className="w-4 h-4 text-rose-800 dark:text-amber-400" />
                  <h3 className="font-display text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                    صور الواجهة وخلفيات الغرف
                  </h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {imageFields.map((field) => {
                    const currentVal = designDraft[field.key];
                    return (
                      <div
                        key={field.key}
                        className="p-3.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-950 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                              {field.title}
                            </div>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                              {field.subtitle}
                            </p>
                          </div>
                          <div className="w-16 h-12 rounded-md border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shrink-0 flex items-center justify-center">
                            {currentVal ? (
                              <img
                                src={currentVal}
                                alt={field.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-stone-400">بدون</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            dir="ltr"
                            disabled={!canManageSettings}
                            value={currentVal}
                            onChange={(e) =>
                              setDesignDraft((p) => ({ ...p, [field.key]: e.target.value }))
                            }
                            placeholder="https://... أو اختر صورة من جهازك"
                            className="flex-1 h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs disabled:opacity-60"
                          />
                          {canManageSettings && (
                            <>
                              <label className="h-9 px-2.5 rounded-lg bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0">
                                <Upload className="w-3.5 h-3.5" />
                                <span>{designUploadBusy === field.key ? '...' : 'رفع'}</span>
                                <input
                                  type="file"
                                  accept="image/gif,image/png,image/jpeg,image/webp,image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    handleUploadDesignImage(field.key, f);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                              {currentVal && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDesignDraft((p) => ({ ...p, [field.key]: '' }))
                                  }
                                  title="إزالة الصورة"
                                  className="h-9 px-2 rounded-lg border border-stone-300 dark:border-zinc-700 text-stone-500 hover:text-red-600 cursor-pointer shrink-0"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {canManageSettings && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] text-stone-500 ml-1">خلفيات جاهزة:</span>
                            {PORTAL_IMAGE_PRESETS.map((preset) => (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() =>
                                  setDesignDraft((p) => ({ ...p, [field.key]: preset.url }))
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer transition-colors ${
                                  currentVal === preset.url
                                    ? 'bg-rose-800 border-rose-800 text-white'
                                    : 'bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {field.extra}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Internal Theme Colors & Layout Styling */}
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-5 space-y-5">
                <div className="border-b border-stone-100 dark:border-zinc-800 pb-3">
                  <h3 className="font-display text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                    الألوان، الحواف، وكثافة التصميم الداخلي
                  </h3>
                </div>

                {/* Base Style Swatches */}
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                    القالب اللوني الأساسي (ستايل يوكام هوست)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {YOUCAM_STYLES.map((st) => {
                      const active = designStyleDraft === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          disabled={!canManageSettings}
                          onClick={() => {
                            setDesignStyleDraft(st.id);
                            if (!designDraft.useCustomColors) {
                              setDesignDraft((p) => ({
                                ...p,
                                primaryColor: st.primary,
                                primaryDarkColor: st.primaryDark,
                                softBgColor: st.soft,
                                accentColor: st.accent,
                              }));
                            }
                          }}
                          className={`p-2.5 rounded-lg border text-right flex items-center gap-2 cursor-pointer transition-all ${
                            active
                              ? 'border-stone-900 dark:border-white bg-stone-50 dark:bg-zinc-800 shadow-xs'
                              : 'border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-950'
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full shrink-0 border border-black/10"
                            style={{ backgroundColor: st.primary }}
                          />
                          <span className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                            {st.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Color Palette Toggle & 6 Pickers */}
                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-950 space-y-3">
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                        تفعيل ألوان مخصصة للواجهة والغرف
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        استبدل ألوان القالب الافتراضي بألوان خاصة لموقعك وألوان صفوف الدردشة.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!canManageSettings}
                      checked={designDraft.useCustomColors}
                      onChange={(e) =>
                        setDesignDraft((p) => ({ ...p, useCustomColors: e.target.checked }))
                      }
                      className="w-4 h-4 accent-rose-800 shrink-0"
                    />
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                    {[
                      { key: 'primaryColor' as const, label: 'اللون الرئيسي' },
                      { key: 'primaryDarkColor' as const, label: 'اللون الداكن' },
                      { key: 'softBgColor' as const, label: 'خلفية ناعمة' },
                      { key: 'accentColor' as const, label: 'لون التمييز' },
                      { key: 'chatOddRowColor' as const, label: 'صف رسالة (فردي)', clearable: true },
                      { key: 'chatEvenRowColor' as const, label: 'صف رسالة (زوجي)', clearable: true },
                    ].map((c) => {
                      const val = designDraft[c.key] || '';
                      return (
                        <div key={c.key} className="space-y-1">
                          <span className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                            {c.label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              disabled={!canManageSettings}
                              value={val || '#ffffff'}
                              onChange={(e) =>
                                setDesignDraft((p) => ({ ...p, [c.key]: e.target.value }))
                              }
                              className="w-9 h-8 rounded border border-stone-300 dark:border-zinc-700 bg-white cursor-pointer shrink-0"
                            />
                            <span className="font-mono-tabular text-[11px] text-stone-500 truncate">
                              {val || 'تلقائي'}
                            </span>
                            {c.clearable && val && canManageSettings && (
                              <button
                                type="button"
                                onClick={() => setDesignDraft((p) => ({ ...p, [c.key]: '' }))}
                                className="text-stone-400 hover:text-red-600 cursor-pointer"
                                title="استعادة التلقائي"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Layout Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                      خلفية الشريط العلوي
                    </label>
                    <select
                      disabled={!canManageSettings}
                      value={designDraft.headerBgStyle}
                      onChange={(e) =>
                        setDesignDraft((p) => ({
                          ...p,
                          headerBgStyle: e.target.value as 'solid' | 'gradient',
                        }))
                      }
                      className="w-full h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs sm:text-sm"
                    >
                      <option value="solid">لون موحد</option>
                      <option value="gradient">تدرج لوني متناسق</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                      انحناء حواف البطاقات
                    </label>
                    <select
                      disabled={!canManageSettings}
                      value={designDraft.borderRadiusMode}
                      onChange={(e) =>
                        setDesignDraft((p) => ({
                          ...p,
                          borderRadiusMode: e.target.value as 'sharp' | 'medium' | 'rounded',
                        }))
                      }
                      className="w-full h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs sm:text-sm"
                    >
                      <option value="sharp">حواف حادة (كلاسيك)</option>
                      <option value="medium">انحناء متوسط</option>
                      <option value="rounded">حواف دائرية حديثة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                      كثافة عرض الرسائل
                    </label>
                    <select
                      disabled={!canManageSettings}
                      value={designDraft.messageDensity}
                      onChange={(e) =>
                        setDesignDraft((p) => ({
                          ...p,
                          messageDensity: e.target.value as 'compact' | 'normal' | 'spacious',
                        }))
                      }
                      className="w-full h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs sm:text-sm"
                    >
                      <option value="compact">مضغوط (رسائل أكثر)</option>
                      <option value="normal">قياسي متوازن</option>
                      <option value="spacious">مريح وواسع</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                      شكل الصور الرمزية
                    </label>
                    <select
                      disabled={!canManageSettings}
                      value={designDraft.avatarShape}
                      onChange={(e) =>
                        setDesignDraft((p) => ({
                          ...p,
                          avatarShape: e.target.value as 'square' | 'rounded' | 'circle',
                        }))
                      }
                      className="w-full h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs sm:text-sm"
                    >
                      <option value="square">مربع كلاسيكي</option>
                      <option value="rounded">زوايا منحنية</option>
                      <option value="circle">دائري بالكامل</option>
                    </select>
                  </div>
                </div>

                {/* Visibility & Style Lock Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      key: 'showMicStage' as const,
                      label: 'إظهار منصة المايكات الخمسة في الغرفة العامة',
                    },
                    {
                      key: 'showPortalOnlineList' as const,
                      label: 'إظهار قائمة المتواجدين الآن في صفحة الدخول',
                    },
                    {
                      key: 'showPortalInfoBar' as const,
                      label: 'إظهار أزرار (اتصل بنا / الأسئلة / القوانين / زاجل) بالبوابة',
                    },
                    {
                      key: 'lockUserStyleOverride' as const,
                      label: 'توحيد التصميم للجميع (منع الأعضاء من تغيير ستايل الشات)',
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 cursor-pointer"
                    >
                      <span className="text-xs font-medium text-stone-800 dark:text-stone-200">
                        {item.label}
                      </span>
                      <input
                        type="checkbox"
                        disabled={!canManageSettings}
                        checked={designDraft[item.key]}
                        onChange={(e) =>
                          setDesignDraft((p) => ({ ...p, [item.key]: e.target.checked }))
                        }
                        className="w-4 h-4 accent-rose-800 shrink-0"
                      />
                    </label>
                  ))}
                </div>

                {/* Portal Footer Text */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                    نص التذييل أسفل الواجهة الرئيسية (اختياري)
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    disabled={!canManageSettings}
                    value={designDraft.portalFooterText}
                    onChange={(e) =>
                      setDesignDraft((p) => ({ ...p, portalFooterText: e.target.value }))
                    }
                    placeholder="اتركه فارغاً لاستخدام النص الافتراضي للمنصة..."
                    className="w-full h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-sm disabled:opacity-60"
                  />
                </div>

                {canManageSettings && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleSaveDesign}
                      className="px-5 py-2.5 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>اعتماد صور الواجهة والتصميم الداخلي</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* SECTION: GIFTS MANAGEMENT */}
        {section === 'gifts' && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Gift className="w-4 h-4 text-rose-800 dark:text-amber-400" />
                    <span>إدارة الهدايا وإضافة هدايا خارجية</span>
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    أضف هدايا جديدة عبر رابط صورة خارجي (PNG / GIF / WebP) أو ارفعها من جهازك، وعدّل تكلفة اللايكات أو فعّل/عطّل الهدايا الحالية.
                  </p>
                </div>
                {giftsSavedMsg && (
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    تم حفظ قائمة الهدايا وتطبيقها فوراً!
                  </span>
                )}
              </div>

              {canManageSettings && (
                <form
                  onSubmit={handleAddExternalGift}
                  className="p-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 space-y-3"
                >
                  <div className="text-xs font-bold text-rose-900 dark:text-amber-300">
                    إضافة هدية خارجية جديدة
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        اسم الهدية
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={32}
                        value={newGiftLabel}
                        onChange={(e) => setNewGiftLabel(e.target.value)}
                        placeholder="مثال: سيارة ذهبية"
                        className="w-full h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        التكلفة (باللايكات)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100000}
                        value={newGiftCost}
                        onChange={(e) => setNewGiftCost(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        أيقونة احتياطية (إيموجي)
                      </label>
                      <input
                        type="text"
                        maxLength={12}
                        value={newGiftEmoji}
                        onChange={(e) => setNewGiftEmoji(e.target.value)}
                        placeholder="🎁"
                        className="w-full h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-center"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="w-full h-9 px-2.5 rounded-lg border border-dashed border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center gap-2 text-xs">
                        {sanitizeExternalImageUrl(newGiftImageUrl) ? (
                          <img
                            src={newGiftImageUrl}
                            alt="معاينة الهدية"
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 object-contain"
                          />
                        ) : (
                          <span className="text-lg">{newGiftEmoji || '🎁'}</span>
                        )}
                        <span className="text-[11px] text-stone-500 truncate">
                          {newGiftLabel || 'معاينة'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={newGiftImageUrl}
                      onChange={(e) => setNewGiftImageUrl(e.target.value)}
                      placeholder="https://... رابط صورة الهدية الخارجية (PNG / GIF) اختياري"
                      className="flex-1 min-w-[200px] h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                    <label className="h-9 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5 text-rose-800 dark:text-amber-400" />
                      <span>{giftUploadBusy ? 'جاري الرفع...' : 'رفع صورة / GIF'}</span>
                      <input
                        type="file"
                        accept="image/gif,image/png,image/jpeg,image/webp,image/*"
                        className="hidden"
                        onChange={(e) => {
                          handleUploadGiftImage(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      type="submit"
                      className="h-9 px-4 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة الهدية</span>
                    </button>
                  </div>
                  {giftError && <p className="text-xs text-red-600 dark:text-red-400">{giftError}</p>}
                </form>
              )}

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    قائمة الهدايا الحالية ({giftsDraft.length})
                  </span>
                  {canManageSettings && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const restored = DEFAULT_GIFTS.map((g) => ({ ...g }));
                          setGiftsDraft(restored);
                          handleSaveGifts(restored);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 text-xs font-semibold flex items-center gap-1 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>استعادة الهدايا الافتراضية</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveGifts()}
                        className="px-4 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>حفظ التعديلات</span>
                      </button>
                    </div>
                  )}
                </div>

                {giftsDraft.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-500 border border-dashed border-stone-200 dark:border-zinc-800 rounded-xl">
                    لا توجد هدايا مضافة حالياً. أضف هدية جديدة من النموذج أعلاه أو استعد الهدايا الافتراضية.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {giftsDraft.map((gift) => (
                      <div
                        key={gift.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          gift.enabled !== false
                            ? 'border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-950'
                            : 'border-stone-200/60 dark:border-zinc-800/60 bg-stone-100/70 dark:bg-zinc-900/40 opacity-65'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center shrink-0 overflow-hidden">
                            {gift.imageUrl ? (
                              <img
                                src={gift.imageUrl}
                                alt={gift.label}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 object-contain"
                              />
                            ) : (
                              <span className="text-xl">{gift.emoji || '🎁'}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <input
                              type="text"
                              maxLength={32}
                              disabled={!canManageSettings}
                              value={gift.label}
                              onChange={(e) =>
                                setGiftsDraft((prev) =>
                                  prev.map((g) => (g.id === gift.id ? { ...g, label: e.target.value } : g))
                                )
                              }
                              className="w-full h-7 px-2 rounded border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold"
                            />
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-stone-500">اللايكات:</span>
                              <input
                                type="number"
                                min={0}
                                max={100000}
                                disabled={!canManageSettings}
                                value={gift.cost}
                                onChange={(e) =>
                                  setGiftsDraft((prev) =>
                                    prev.map((g) =>
                                      g.id === gift.id
                                        ? { ...g, cost: Math.max(0, Number(e.target.value) || 0) }
                                        : g
                                    )
                                  )
                                }
                                className="w-20 h-6 px-1.5 rounded border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono-tabular"
                              />
                            </div>
                          </div>
                        </div>

                        {canManageSettings && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const next = giftsDraft.map((g) =>
                                  g.id === gift.id ? { ...g, enabled: g.enabled === false } : g
                                );
                                setGiftsDraft(next);
                                handleSaveGifts(next);
                              }}
                              title={gift.enabled !== false ? 'تعطيل الهدية' : 'تفعيل الهدية'}
                              className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                                gift.enabled !== false
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'border-stone-300 bg-white text-stone-500 dark:border-zinc-700 dark:bg-zinc-900'
                              }`}
                            >
                              {gift.enabled !== false ? (
                                <Eye className="w-3.5 h-3.5" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = giftsDraft.filter((g) => g.id !== gift.id);
                                setGiftsDraft(next);
                                handleSaveGifts(next);
                              }}
                              title="حذف الهدية"
                              className="p-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION: BANNERS MANAGEMENT */}
        {section === 'banners' && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-rose-800 dark:text-amber-400" />
                    <span>إدارة البنرات الإعلانية وبنرات الموقع</span>
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    أضف بنرات صور أو GIF خارجية وحدد موضع ظهورها في صفحة الدخول، أعلى الغرف، أو أعلى الحائط مع رابط اختياري.
                  </p>
                </div>
                {bannersSavedMsg && (
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    تم حفظ البنرات وتحديث الموقع فوراً!
                  </span>
                )}
              </div>

              {canManageSettings && (
                <form
                  onSubmit={handleAddBanner}
                  className="p-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 space-y-3"
                >
                  <div className="text-xs font-bold text-rose-900 dark:text-amber-300">
                    إضافة بنر جديد
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        عنوان البنر
                      </label>
                      <input
                        type="text"
                        maxLength={60}
                        value={newBannerTitle}
                        onChange={(e) => setNewBannerTitle(e.target.value)}
                        placeholder="مثال: مسابقة الجمعة الكبرى"
                        className="w-full h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        مكان الظهور
                      </label>
                      <select
                        value={newBannerPlacement}
                        onChange={(e) => setNewBannerPlacement(e.target.value as BannerPlacement)}
                        className="w-full h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                      >
                        {(Object.keys(BANNER_PLACEMENT_LABELS) as BannerPlacement[]).map((key) => (
                          <option key={key} value={key}>
                            {BANNER_PLACEMENT_LABELS[key]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        رابط عند النقر (اختياري)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          dir="ltr"
                          value={newBannerLinkUrl}
                          onChange={(e) => setNewBannerLinkUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={newBannerImageUrl}
                      onChange={(e) => setNewBannerImageUrl(e.target.value)}
                      placeholder="https://... رابط صورة البنر الخارجية أو GIF"
                      className="flex-1 min-w-[220px] h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                    <label className="h-9 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5 text-rose-800 dark:text-amber-400" />
                      <span>{bannerUploadBusy ? 'جاري الرفع...' : 'رفع من الجهاز'}</span>
                      <input
                        type="file"
                        accept="image/gif,image/png,image/jpeg,image/webp,image/*"
                        className="hidden"
                        onChange={(e) => {
                          handleUploadBannerImage(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      type="submit"
                      className="h-9 px-4 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة البنر</span>
                    </button>
                  </div>

                  {sanitizeExternalImageUrl(newBannerImageUrl) && (
                    <div className="rounded-lg border border-stone-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
                      <img
                        src={newBannerImageUrl}
                        alt="معاينة البنر"
                        referrerPolicy="no-referrer"
                        className="w-full max-h-24 object-cover"
                      />
                    </div>
                  )}

                  {bannerError && (
                    <p className="text-xs text-red-600 dark:text-red-400">{bannerError}</p>
                  )}
                </form>
              )}

              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    البنرات المضافة ({bannersDraft.length})
                  </span>
                  {canManageSettings && bannersDraft.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSaveBanners()}
                      className="px-4 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>حفظ تغييرات البنرات</span>
                    </button>
                  )}
                </div>

                {bannersDraft.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-500 border border-dashed border-stone-200 dark:border-zinc-800 rounded-xl">
                    لا توجد بنرات مضافة حالياً. أضف أول بنر إعلاني من النموذج أعلاه.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bannersDraft.map((banner) => (
                      <div
                        key={banner.id}
                        className={`p-3 rounded-xl border space-y-2.5 ${
                          banner.enabled !== false
                            ? 'border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-950'
                            : 'border-stone-200/60 dark:border-zinc-800/60 bg-stone-100/70 dark:bg-zinc-900/40 opacity-65'
                        }`}
                      >
                        <div className="rounded-lg overflow-hidden border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                          <img
                            src={banner.imageUrl}
                            alt={banner.title}
                            referrerPolicy="no-referrer"
                            className="w-full max-h-24 object-cover"
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                            <input
                              type="text"
                              maxLength={60}
                              disabled={!canManageSettings}
                              value={banner.title}
                              onChange={(e) =>
                                setBannersDraft((prev) =>
                                  prev.map((b) =>
                                    b.id === banner.id ? { ...b, title: e.target.value } : b
                                  )
                                )
                              }
                              className="h-8 px-2.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold min-w-[150px]"
                            />
                            <select
                              disabled={!canManageSettings}
                              value={banner.placement}
                              onChange={(e) =>
                                setBannersDraft((prev) =>
                                  prev.map((b) =>
                                    b.id === banner.id
                                      ? { ...b, placement: e.target.value as BannerPlacement }
                                      : b
                                  )
                                )
                              }
                              className="h-8 px-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                            >
                              {(Object.keys(BANNER_PLACEMENT_LABELS) as BannerPlacement[]).map((key) => (
                                <option key={key} value={key}>
                                  {BANNER_PLACEMENT_LABELS[key]}
                                </option>
                              ))}
                            </select>
                            {banner.linkUrl && (
                              <span
                                dir="ltr"
                                className="inline-flex items-center gap-1 text-[11px] text-sky-700 dark:text-sky-400 truncate max-w-[200px]"
                              >
                                <Link2 className="w-3 h-3 shrink-0" />
                                <span className="truncate">{banner.linkUrl}</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </span>
                            )}
                          </div>

                          {canManageSettings && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = bannersDraft.map((b) =>
                                    b.id === banner.id ? { ...b, enabled: !b.enabled } : b
                                  );
                                  setBannersDraft(next);
                                  handleSaveBanners(next);
                                }}
                                title={banner.enabled ? 'إخفاء البنر' : 'تفعيل البنر'}
                                className={`h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                                  banner.enabled
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : 'border-stone-300 bg-white text-stone-500 dark:border-zinc-700 dark:bg-zinc-900'
                                }`}
                              >
                                {banner.enabled ? (
                                  <>
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>مفعل</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5" />
                                    <span>مخفي</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = bannersDraft.filter((b) => b.id !== banner.id);
                                  setBannersDraft(next);
                                  handleSaveBanners(next);
                                }}
                                title="حذف البنر"
                                className="h-8 px-2.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION: CUSTOM EXTERNAL SMILEYS MANAGEMENT */}
        {section === 'smileys' && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Smile className="w-4 h-4 text-rose-800 dark:text-amber-400" />
                    <span>إدارة السمايلات وإضافة سمايلات خارجية</span>
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    أضف سمايلات صور أو GIF متحركة من روابط خارجية أو من جهازك؛ تظهر تلقائياً في قائمة السمايلات للأعضاء وتُعرض داخل الرسائل والخاص والحائط.
                  </p>
                </div>
                {smileysSavedMsg && (
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    تم حفظ السمايلات وتحديث قائمة الدردشة فوراً!
                  </span>
                )}
              </div>

              {canManageSettings && (
                <form
                  onSubmit={handleAddExternalSmiley}
                  className="p-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 space-y-3"
                >
                  <div className="text-xs font-bold text-rose-900 dark:text-amber-300">
                    إضافة سمايل خارجي جديد
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        كود الاختصار (يتحول تلقائياً إلى :code:)
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={24}
                        value={newSmileyCode}
                        onChange={(e) => setNewSmileyCode(e.target.value)}
                        placeholder="مثال: habibi أو :love:"
                        className="w-full h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono-tabular"
                      />
                      {normalizeSmileyCode(newSmileyCode) && (
                        <span className="text-[10px] text-stone-500 mt-0.5 block font-mono-tabular">
                          الرمز النهائي: {normalizeSmileyCode(newSmileyCode)}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        الاسم التوضيحي
                      </label>
                      <input
                        type="text"
                        maxLength={32}
                        value={newSmileyLabel}
                        onChange={(e) => setNewSmileyLabel(e.target.value)}
                        placeholder="مثال: قلب متحرك"
                        className="w-full h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="w-full h-9 px-3 rounded-lg border border-dashed border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center gap-2 text-xs">
                        {sanitizeExternalImageUrl(newSmileyImageUrl) ? (
                          <img
                            src={newSmileyImageUrl}
                            alt="معاينة السمايل"
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 object-contain"
                          />
                        ) : (
                          <Smile className="w-5 h-5 text-stone-400" />
                        )}
                        <span className="text-[11px] text-stone-500">معاينة الحجم الفعلي</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={newSmileyImageUrl}
                      onChange={(e) => setNewSmileyImageUrl(e.target.value)}
                      placeholder="https://... رابط صورة السمايل أو GIF متحرك"
                      className="flex-1 min-w-[220px] h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                    <label className="h-9 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5 text-rose-800 dark:text-amber-400" />
                      <span>{smileyUploadBusy ? 'جاري الرفع...' : 'رفع سمايل / GIF'}</span>
                      <input
                        type="file"
                        accept="image/gif,image/png,image/jpeg,image/webp,image/*"
                        className="hidden"
                        onChange={(e) => {
                          handleUploadSmileyImage(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      type="submit"
                      className="h-9 px-4 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة السمايل</span>
                    </button>
                  </div>
                  {smileyError && (
                    <p className="text-xs text-red-600 dark:text-red-400">{smileyError}</p>
                  )}
                </form>
              )}

              <div className="space-y-2.5">
                <div className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  السمايلات الخارجية المضافة ({smileysDraft.length})
                </div>

                {smileysDraft.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-500 border border-dashed border-stone-200 dark:border-zinc-800 rounded-xl">
                    لا توجد سمايلات خارجية مضافة بعد. أضف سمايلات عبر رابط خارجي أو ملف GIF من الأعلى.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {smileysDraft.map((sm) => (
                      <div
                        key={sm.id}
                        className="p-2.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-950 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={sm.imageUrl}
                            alt={sm.label}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 object-contain shrink-0 bg-white dark:bg-zinc-900 rounded border border-stone-200 dark:border-zinc-800 p-0.5"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                              {sm.label}
                            </div>
                            <div
                              dir="ltr"
                              className="text-[11px] font-mono-tabular text-stone-500 dark:text-stone-400 truncate"
                            >
                              {sm.code}
                            </div>
                          </div>
                        </div>
                        {canManageSettings && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = smileysDraft.filter((item) => item.id !== sm.id);
                              setSmileysDraft(next);
                              handleSaveSmileys(next);
                            }}
                            title="حذف السمايل"
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: GRANULAR ROLE PERMISSIONS MATRIX */}
        {section === 'permissions' && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-rose-800 dark:text-amber-400" />
                    <span>مصفوفة الصلاحيات الشاملة حسب الرتبة</span>
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    اختر الرتبة وحدد بدقة ما يحق لها فعله في الدردشة، الحائط، المايكات، الغرف، والإشراف.
                  </p>
                </div>

                {permSavedMsg && (
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    تم حفظ مصفوفة الصلاحيات وتطبيقها فوراً!
                  </span>
                )}
              </div>

              {/* Role Selector */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {EDITABLE_ROLES.map((role) => {
                  const active = selectedPermRole === role;
                  const enabledCount = PERMISSION_CATALOG.filter(
                    (p) => rolePermDraft[role]?.[p.key]
                  ).length;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedPermRole(role)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-rose-800 text-white'
                          : 'bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      <span>{getRoleLabel(role)}</span>
                      <span
                        className={`text-[10px] font-mono-tabular px-1.5 py-[1px] rounded ${
                          active ? 'bg-black/25 text-white' : 'bg-stone-200 dark:bg-zinc-700'
                        }`}
                      >
                        {enabledCount}/{PERMISSION_CATALOG.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Bulk Toggles for Selected Role */}
              {canManageSettings && selectedPermRole !== 'admin' && (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-lg p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setRolePermDraft((prev) => ({
                          ...prev,
                          [selectedPermRole]: { ...ALL_TRUE_PERMISSIONS },
                        }))
                      }
                      className="px-2.5 py-1.5 rounded bg-[#44a948] hover:bg-[#3a963e] text-white text-xs font-semibold cursor-pointer"
                    >
                      تفعيل جميع الصلاحيات
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const none = { ...ALL_TRUE_PERMISSIONS };
                        for (const m of PERMISSION_CATALOG) none[m.key] = false;
                        setRolePermDraft((prev) => ({
                          ...prev,
                          [selectedPermRole]: none,
                        }));
                      }}
                      className="px-2.5 py-1.5 rounded bg-red-700 hover:bg-red-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      تعطيل الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const defaults = cloneDefaultRolePermissions();
                        setRolePermDraft((prev) => ({
                          ...prev,
                          [selectedPermRole]: defaults[selectedPermRole],
                        }));
                      }}
                      className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-zinc-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-zinc-800 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>استعادة الافتراضي</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveRolePermissions}
                    className="px-4 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>حفظ الصلاحيات</span>
                  </button>
                </div>
              )}

              {selectedPermRole === 'admin' && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
                  رتبة <strong>الإدارة العليا</strong> تمتلك جميع الصلاحيات الـ 30 بشكل دائم ولا يمكن تقييدها لضمان عدم فقدان التحكم بالمنصة.
                </div>
              )}

              {/* Categorized Permissions Grid */}
              <div className="space-y-4">
                {(['chat', 'wall', 'rooms', 'moderation', 'admin'] as const).map((cat) => {
                  const items = PERMISSION_CATALOG.filter((p) => p.category === cat);
                  return (
                    <div
                      key={cat}
                      className="border border-stone-200 dark:border-zinc-800 rounded-xl overflow-hidden"
                    >
                      <div className="px-4 py-2.5 bg-stone-50 dark:bg-zinc-950 border-b border-stone-200 dark:border-zinc-800 flex items-center justify-between">
                        <h3 className="font-display text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                          {PERMISSION_CATEGORY_LABELS[cat]}
                        </h3>
                        <span className="text-[11px] font-mono-tabular text-stone-500">
                          {items.filter((i) => currentRolePerms?.[i.key]).length}/{items.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-3">
                        {items.map((perm) => {
                          const checked = Boolean(currentRolePerms?.[perm.key]);
                          const locked = !canManageSettings || selectedPermRole === 'admin';
                          return (
                            <label
                              key={perm.key}
                              className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-xs transition-colors ${
                                locked ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'
                              } ${
                                checked
                                  ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-900 text-stone-900 dark:text-stone-100'
                                  : 'bg-white dark:bg-zinc-950 border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-stone-400'
                              }`}
                            >
                              <span className="font-medium">{perm.label}</span>
                              <input
                                type="checkbox"
                                disabled={locked}
                                checked={checked}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  setRolePermDraft((prev) => ({
                                    ...prev,
                                    [selectedPermRole]: {
                                      ...prev[selectedPermRole],
                                      [perm.key]: val,
                                    },
                                  }));
                                }}
                                className="w-4 h-4 accent-[#44a948] shrink-0"
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {canManageSettings && selectedPermRole !== 'admin' && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveRolePermissions}
                    className="px-5 py-2.5 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>اعتماد وحفظ صلاحيات ({getRoleLabel(selectedPermRole)})</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: ROYAL ENTRY DISTRIBUTION */}
        {section === 'royal' && (
          <div className="space-y-6">
            {/* Bulk Distribution Card */}
            <div className="bg-white dark:bg-zinc-900 border-2 border-amber-300/80 dark:border-amber-700/60 rounded-xl p-5 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500 fill-amber-400/30" />
                    <span>توزيع وإدارة الدخول الملكي للأعضاء</span>
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                    امنح ميزة الدخول الملكي لأعضاء محددين أو وزّعها دفعة واحدة. يظهر لصاحب الدخول الملكي بطاقة ذهبية فاخرة ولافتة ترحيب عند دخوله الغرف.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-mono-tabular">
                    الحاصلون على الدخول الملكي: {royalHoldersCount}
                  </span>
                </div>
              </div>

              {royalFeedback && (
                <div className="px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{royalFeedback}</span>
                </div>
              )}

              {/* Default Royal Phrase */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-zinc-950 border border-amber-200/80 dark:border-zinc-800 space-y-2.5">
                <label className="block text-xs font-bold text-stone-800 dark:text-stone-200">
                  عبارة الترحيب الملكية الافتراضية عند التوزيع:
                </label>
                <input
                  type="text"
                  maxLength={90}
                  value={royalDefaultPhrase}
                  onChange={(e) => setRoyalDefaultPhrase(e.target.value)}
                  placeholder="مثال: شرف الديوان بدخول ملكي مهيب 👑"
                  className="w-full h-10 px-3 rounded-lg border border-amber-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm font-medium"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'شرف الديوان بدخول ملكي مهيب 👑',
                    'إطلالة ملكية تليق بالمقام الرفيع ✨',
                    'حضور استثنائي ونور يملأ الغرفة 🔥',
                    'أهلاً بسلطان الحضور وجمال السوالف 💎',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRoyalDefaultPhrase(preset)}
                      className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold cursor-pointer transition-colors ${
                        royalDefaultPhrase === preset
                          ? 'bg-amber-500 border-amber-600 text-amber-950'
                          : 'bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-700 text-stone-700 dark:text-stone-300 hover:border-amber-400'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk Actions */}
              {canManageAccounts && onBulkRoyalEntry && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onBulkRoyalEntry('allOnline', royalDefaultPhrase.trim() || undefined);
                      setRoyalFeedback('تم توزيع الدخول الملكي على جميع المتصلين حالياً.');
                      window.setTimeout(() => setRoyalFeedback(null), 3000);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-gradient-to-l from-amber-500 to-yellow-400 hover:brightness-95 text-amber-950 text-xs font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Crown className="w-4 h-4" />
                    <span>توزيع على جميع المتصلين الآن ({adminState.allOnlineUsers.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onBulkRoyalEntry('vipAndMods', royalDefaultPhrase.trim() || undefined);
                      setRoyalFeedback('تم منح الدخول الملكي لـ VIP والمشرفين والإدارة.');
                      window.setTimeout(() => setRoyalFeedback(null), 3000);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>منح لـ VIP والمشرفين</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onBulkRoyalEntry('allRegistered', royalDefaultPhrase.trim() || undefined);
                      setRoyalFeedback('تم توزيع الدخول الملكي على جميع الأعضاء المسجلين.');
                      window.setTimeout(() => setRoyalFeedback(null), 3000);
                    }}
                    className="px-3.5 py-2 rounded-lg border border-amber-400 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>منح لجميع المسجلين ({adminState.registeredUsers.length})</span>
                  </button>

                  {confirmRevokeAllRoyal ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onBulkRoyalEntry('revokeAll');
                          setConfirmRevokeAllRoyal(false);
                          setRoyalFeedback('تم سحب الدخول الملكي من جميع الحسابات.');
                          window.setTimeout(() => setRoyalFeedback(null), 3000);
                        }}
                        className="px-3 py-2 rounded-lg bg-red-700 text-white text-xs font-bold cursor-pointer"
                      >
                        تأكيد سحب الكل
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRevokeAllRoyal(false)}
                        className="px-2.5 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 text-xs cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRevokeAllRoyal(true)}
                      className="px-3.5 py-2 rounded-lg border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold cursor-pointer"
                    >
                      سحب من الجميع
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Per-Member Distribution Table */}
            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-stone-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: 'جميع الأعضاء والمتصلين' },
                    { id: 'royal', label: `الحاصلون عليه (${royalHoldersCount})` },
                    { id: 'online', label: `المتصلون الآن (${adminState.allOnlineUsers.length})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setRoyalFilter(f.id as 'all' | 'royal' | 'online')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        royalFilter === f.id
                          ? 'bg-amber-500 text-amber-950'
                          : 'bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={royalQuery}
                    onChange={(e) => setRoyalQuery(e.target.value)}
                    placeholder="بحث عن عضو لتوزيع الدخول الملكي..."
                    className="w-full h-9 pr-8 pl-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs"
                  />
                </div>
              </div>

              {royalCandidates.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 dark:text-stone-400">
                  لا يوجد أعضاء مطابقون للتصفية الحالية.
                </div>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-zinc-800">
                  {royalCandidates.map((item) => {
                    const phraseVal =
                      royalRowPhrases[item.id] ?? item.royalEntryText ?? '';
                    const canAct = (isAdmin || item.role !== 'admin') && canManageAccounts;
                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                          item.royalEntry
                            ? 'bg-amber-50/40 dark:bg-amber-950/15'
                            : 'hover:bg-stone-50/70 dark:hover:bg-zinc-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar
                            avatarUrl={item.avatarUrl}
                            username={item.username}
                            size="sm"
                            className={item.royalEntry ? 'ring-2 ring-amber-400 rounded-full' : ''}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm" style={{ color: item.nameColor }}>
                                {item.username}
                              </span>
                              {item.royalEntry && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gradient-to-l from-amber-500 to-yellow-400 text-amber-950 text-[10px] font-extrabold">
                                  <Crown className="w-3 h-3" />
                                  <span>ملكي</span>
                                </span>
                              )}
                              {item.isOnline && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                                  متصل
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500 dark:text-stone-400">
                              {getRoleLabel(item.role)} · {item.isGuest ? 'زائر متصل' : 'عضو مسجل'} · {item.country}
                            </div>
                          </div>
                        </div>

                        {canAct && onSetRoyalEntry ? (
                          <div className="flex flex-wrap items-center gap-2 flex-1 lg:max-w-xl lg:justify-end">
                            <input
                              type="text"
                              maxLength={90}
                              value={phraseVal}
                              onChange={(e) =>
                                setRoyalRowPhrases((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                              placeholder={royalDefaultPhrase}
                              className="flex-1 min-w-[180px] h-8 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const nextEnabled = !item.royalEntry;
                                const phraseToUse = phraseVal.trim() || royalDefaultPhrase.trim();
                                onSetRoyalEntry(item.id, nextEnabled, phraseToUse, nextEnabled && item.isOnline);
                                setRoyalFeedback(
                                  nextEnabled
                                    ? `تم منح ${item.username} ميزة الدخول الملكي.`
                                    : `تم سحب الدخول الملكي من ${item.username}.`
                                );
                                window.setTimeout(() => setRoyalFeedback(null), 2600);
                              }}
                              className={`h-8 px-3 rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer shrink-0 ${
                                item.royalEntry
                                  ? 'border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30'
                                  : 'bg-gradient-to-l from-amber-500 to-yellow-400 text-amber-950 hover:brightness-95'
                              }`}
                            >
                              <Crown className="w-3.5 h-3.5" />
                              <span>{item.royalEntry ? 'سحب الملكي' : 'منح دخول ملكي'}</span>
                            </button>
                            {item.royalEntry && (
                              <button
                                type="button"
                                onClick={() => {
                                  const phraseToUse = phraseVal.trim() || royalDefaultPhrase.trim();
                                  onSetRoyalEntry(item.id, true, phraseToUse, true);
                                  setRoyalFeedback(`تم حفظ عبارة وإعلان الدخول الملكي لـ ${item.username}.`);
                                  window.setTimeout(() => setRoyalFeedback(null), 2600);
                                }}
                                title="حفظ العبارة وإعلان دخول ملكي فوري في الغرفة"
                                className="h-8 px-2.5 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                <span>إعلان الآن</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 3: ONLINE USERS ACROSS ALL ROOMS */}
        {section === 'online' && (
          <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-stone-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                المتواجدون في جميع الغرف ({filteredOnline.length})
              </h2>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => openNicksInspector('')}
                  className="h-9 px-3 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Radar className="w-3.5 h-3.5" />
                  <span>كشف النكات والآيبي</span>
                </button>
                {onSpawnTestMember && (
                  <button
                    type="button"
                    onClick={onSpawnTestMember}
                    className="h-9 px-3 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>إضافة عضو تجريبي</span>
                  </button>
                )}
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={onlineQuery}
                    onChange={(e) => setOnlineQuery(e.target.value)}
                    placeholder="بحث عن متصل..."
                    className="w-full h-9 pr-8 pl-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-stone-50 dark:bg-zinc-950 border-b border-stone-200 dark:border-zinc-800 text-stone-500 dark:text-stone-400">
                  <tr>
                    <th className="py-3 px-4 font-semibold">المستخدم</th>
                    <th className="py-3 px-4 font-semibold">الرتبة</th>
                    <th className="py-3 px-4 font-semibold">الغرفة الحالية / نقل</th>
                    <th className="py-3 px-4 font-semibold">الحالة</th>
                    <th className="py-3 px-4 font-semibold">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-zinc-800">
                  {filteredOnline.map((u) => {
                    const isSelfRow = u.id === self.id;
                    const canAct = !isSelfRow && u.role !== 'admin';
                    return (
                      <tr key={u.id} className="hover:bg-stone-50/70 dark:hover:bg-zinc-800/40">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar avatarUrl={u.avatarUrl} username={u.username} size="sm" />
                            <div>
                              <div className="font-bold flex items-center gap-1.5" style={{ color: u.nameColor }}>
                                <span>{u.username}</span>
                                {u.royalEntry && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-[1px] rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-400/60">
                                    <Crown className="w-2.5 h-2.5" />
                                    <span>ملكي</span>
                                  </span>
                                )}
                                {u.isGhost && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-[1px] rounded bg-zinc-900 text-amber-300 border border-amber-500/40">
                                    <Ghost className="w-2.5 h-2.5" />
                                    <span>شبحي</span>
                                  </span>
                                )}
                                {isAdmin && u.id.startsWith('demo-member-test') && (
                                  <span
                                    className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-[1px] rounded border ${
                                      u.demoTalkControlEnabled
                                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-400/60'
                                        : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-zinc-700'
                                    }`}
                                  >
                                    <span>{u.demoTalkControlEnabled ? 'تحدث وتحكم ✓' : 'صامت'}</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-400 flex flex-wrap items-center gap-1.5">
                                <span>{u.country} · {u.isGuest ? 'زائر' : 'عضو مسجل'}</span>
                                {adminState.onlineIpMap?.[u.id]?.ip && (
                                  <span dir="ltr" className="font-mono-tabular px-1.5 py-[1px] rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                                    {adminState.onlineIpMap[u.id].ip}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-stone-700 dark:text-stone-300">
                          {getRoleLabel(u.role)}
                        </td>
                        <td className="py-2.5 px-4">
                          {canAct && canMoveUsers ? (
                            <select
                              value={u.roomId}
                              onChange={(e) => onMoveUserRoom(u.id, e.target.value)}
                              className="h-8 px-2 rounded border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs"
                            >
                              {rooms.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-stone-600 dark:text-stone-300">
                              {getRoomName(u.roomId)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-xs">
                          {u.isMuted ? (
                            <span className="text-amber-700 dark:text-amber-400 font-semibold">مكتوم</span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400">نشط</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {canAct ? (
                            <div className="flex items-center flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  openNicksInspector(adminState.onlineIpMap?.[u.id]?.ip && !adminState.onlineIpMap[u.id].ip.startsWith('داخلي')
                                    ? adminState.onlineIpMap[u.id].ip
                                    : u.username)
                                }
                                title="كشف النكات والآيبي لهذا المستخدم"
                                className="px-2 py-1 rounded border border-indigo-300 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-950/70 flex items-center gap-1 cursor-pointer"
                              >
                                <Radar className="w-3 h-3" />
                                <span>كشف النكات</span>
                              </button>
                              {isAdmin && u.id.startsWith('demo-member-test') && onSetDemoTalkControl && (
                                <button
                                  type="button"
                                  onClick={() => onSetDemoTalkControl(u.id, !u.demoTalkControlEnabled)}
                                  title={
                                    u.demoTalkControlEnabled
                                      ? 'إيقاف وضع التحدث والتحكم (إسكات)'
                                      : 'تفعيل وضع التحدث والتحكم'
                                  }
                                  className={`px-2 py-1 rounded border text-xs font-bold flex items-center gap-1 cursor-pointer ${
                                    u.demoTalkControlEnabled
                                      ? 'border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700'
                                      : 'border-teal-400 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-950/50'
                                  }`}
                                >
                                  {u.demoTalkControlEnabled ? (
                                    <>
                                      <Volume2 className="w-3 h-3" />
                                      <span>إيقاف التحدث</span>
                                    </>
                                  ) : (
                                    <>
                                      <VolumeX className="w-3 h-3" />
                                      <span>تفعيل التحدث والتحكم</span>
                                    </>
                                  )}
                                </button>
                              )}
                              {canManageAccounts && onSetRoyalEntry && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onSetRoyalEntry(u.id, !u.royalEntry, u.royalEntryText || royalDefaultPhrase, !u.royalEntry)
                                  }
                                  title={u.royalEntry ? 'سحب الدخول الملكي' : 'منح دخول ملكي'}
                                  className={`px-2 py-1 rounded border text-xs flex items-center gap-1 cursor-pointer ${
                                    u.royalEntry
                                      ? 'border-amber-500 bg-amber-400/90 text-amber-950 font-bold'
                                      : 'border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                  }`}
                                >
                                  <Crown className="w-3 h-3" />
                                  <span>{u.royalEntry ? 'سحب الملكي' : 'دخول ملكي'}</span>
                                </button>
                              )}
                              {canManageAccounts && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openManageUserModal({
                                      id: u.id,
                                      username: u.username,
                                      role: u.role,
                                      gender: u.gender,
                                      nameColor: u.nameColor,
                                      statusText: u.statusText,
                                      likesCount:
                                        u.likesCount ??
                                        adminState.registeredUsers.find((a) => a.id === u.id)?.likesCount ??
                                        50,
                                      customPermissions: u.customPermissions,
                                    })
                                  }
                                  className="px-2 py-1 rounded border border-stone-300 dark:border-zinc-700 text-stone-700 dark:text-stone-200 text-xs hover:bg-stone-100 dark:hover:bg-zinc-800 flex items-center gap-1 cursor-pointer"
                                >
                                  <KeyRound className="w-3 h-3" />
                                  <span>صلاحيات/تعديل</span>
                                </button>
                              )}
                              {canMuteUsers && (
                                <button
                                  type="button"
                                  onClick={() => onModAction(u.id, u.isMuted ? 'unmute' : 'mute')}
                                  title={u.isMuted ? 'فك الكتم' : 'كتم'}
                                  className="px-2 py-1 rounded border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-1 cursor-pointer"
                                >
                                  {u.isMuted ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                                  <span>{u.isMuted ? 'فك كتم' : 'كتم'}</span>
                                </button>
                              )}
                              {canKickUsers && (
                                <button
                                  type="button"
                                  onClick={() => onModAction(u.id, 'kick')}
                                  className="px-2 py-1 rounded border border-stone-300 dark:border-zinc-700 text-stone-700 dark:text-stone-300 text-xs hover:bg-stone-100 dark:hover:bg-zinc-800 flex items-center gap-1 cursor-pointer"
                                >
                                  <UserMinus className="w-3 h-3" />
                                  <span>طرد</span>
                                </button>
                              )}
                              {canBanUsers && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBanTarget({ username: u.username, userId: u.id });
                                    setBanReason('');
                                  }}
                                  className="px-2 py-1 rounded border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 text-xs hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1 cursor-pointer"
                                >
                                  <Ban className="w-3 h-3" />
                                  <span>حظر</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 4: REGISTERED ACCOUNTS, ROLES, POINTS & CUSTOM PERMISSIONS */}
        {section === 'accounts' && (
          <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-stone-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                الأعضاء المسجلون، الرتب، اللايكات، والصلاحيات المخصصة ({filteredAccounts.length})
              </h2>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {onSpawnTestMember && (
                  <button
                    type="button"
                    onClick={onSpawnTestMember}
                    className="h-9 px-3 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>إضافة عضو تجريبي</span>
                  </button>
                )}
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={accountQuery}
                    onChange={(e) => setAccountQuery(e.target.value)}
                    placeholder="بحث عن عضوية..."
                    className="w-full h-9 pr-8 pl-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs"
                  />
                </div>
              </div>
            </div>

            {filteredAccounts.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 dark:text-stone-400">
                لا توجد عضويات مسجلة مطابقة.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-stone-50 dark:bg-zinc-950 border-b border-stone-200 dark:border-zinc-800 text-stone-500 dark:text-stone-400">
                    <tr>
                      <th className="py-3 px-4 font-semibold">العضو</th>
                      <th className="py-3 px-4 font-semibold">الرتبة</th>
                      <th className="py-3 px-4 font-semibold">اللايكات</th>
                      <th className="py-3 px-4 font-semibold">الحالة</th>
                      <th className="py-3 px-4 font-semibold">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-zinc-800">
                    {filteredAccounts.map((acc) => {
                      const isSelfAcc = acc.id === self.id;
                      const customCount = acc.customPermissions
                        ? Object.keys(acc.customPermissions).length
                        : 0;
                      return (
                        <tr key={acc.id} className="hover:bg-stone-50/70 dark:hover:bg-zinc-800/40">
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar avatarUrl={acc.avatarUrl} username={acc.username} size="sm" />
                              <div>
                                <div className="font-bold flex items-center gap-1.5" style={{ color: acc.nameColor }}>
                                  <span>{acc.username}</span>
                                  {acc.royalEntry && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-[1px] rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-400/60">
                                      <Crown className="w-2.5 h-2.5" />
                                      <span>ملكي</span>
                                    </span>
                                  )}
                                  {customCount > 0 && (
                                    <span className="text-[10px] font-mono-tabular px-1.5 py-[1px] rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                      +{customCount} مخصصة
                                    </span>
                                  )}
                                  {isAdmin && acc.id.startsWith('demo-member-test') && (
                                    <span
                                      className={`text-[10px] px-1.5 py-[1px] rounded border ${
                                        acc.demoTalkControlEnabled
                                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-400/60'
                                          : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-zinc-700'
                                      }`}
                                    >
                                      {acc.demoTalkControlEnabled ? 'تحدث وتحكم ✓' : 'صامت'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-stone-400 flex flex-wrap items-center gap-1.5">
                                  <span>{acc.country} · {acc.gender === 'female' ? 'فتاة' : 'شاب'} · {formatRelativeDate(acc.createdAt)}</span>
                                  {acc.lastIp && (
                                    <span dir="ltr" className="font-mono-tabular px-1.5 py-[1px] rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                                      {acc.lastIp}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            {canManageAccounts && !isSelfAcc && (isAdmin || acc.role !== 'admin') ? (
                              <select
                                value={acc.role}
                                onChange={(e) => onSetRole(acc.id, e.target.value as UserRole)}
                                className="h-8 px-2 rounded border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs font-medium"
                              >
                                <option value="member">عضو</option>
                                <option value="vip">عضو مميز</option>
                                <option value="moderator">مشرف</option>
                                {isAdmin && <option value="admin">الإدارة</option>}
                              </select>
                            ) : (
                              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                                {getRoleLabel(acc.role)}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-xs font-mono-tabular font-bold text-rose-600 dark:text-rose-400">
                            {acc.likesCount}
                          </td>
                          <td className="py-2.5 px-4 text-xs">
                            {acc.isBanned ? (
                              <span className="text-red-700 dark:text-red-400 font-semibold">محظور</span>
                            ) : acc.isMuted ? (
                              <span className="text-amber-700 dark:text-amber-400 font-semibold">مكتوم</span>
                            ) : (
                              <span className="text-emerald-700 dark:text-emerald-400">سليم</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            {!isSelfAcc && (isAdmin || acc.role !== 'admin') ? (
                              <div className="flex items-center flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openNicksInspector(acc.lastIp || acc.username)}
                                  title="كشف النكات والآيبي المرتبط بهذا العضو"
                                  className="px-2 py-1 rounded border border-indigo-300 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-950/70 flex items-center gap-1 cursor-pointer"
                                >
                                  <Radar className="w-3 h-3" />
                                  <span>كشف النكات</span>
                                </button>
                                {isAdmin && acc.id.startsWith('demo-member-test') && onSetDemoTalkControl && (
                                  <button
                                    type="button"
                                    onClick={() => onSetDemoTalkControl(acc.id, !acc.demoTalkControlEnabled)}
                                    className={`px-2 py-1 rounded border text-xs font-bold flex items-center gap-1 cursor-pointer ${
                                      acc.demoTalkControlEnabled
                                        ? 'border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700'
                                        : 'border-teal-400 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-950/50'
                                    }`}
                                  >
                                    {acc.demoTalkControlEnabled ? (
                                      <>
                                        <Volume2 className="w-3 h-3" />
                                        <span>إيقاف التحدث</span>
                                      </>
                                    ) : (
                                      <>
                                        <VolumeX className="w-3 h-3" />
                                        <span>تفعيل التحدث والتحكم</span>
                                      </>
                                    )}
                                  </button>
                                )}
                                {canManageAccounts && onSetRoyalEntry && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onSetRoyalEntry(acc.id, !acc.royalEntry, acc.royalEntryText || royalDefaultPhrase, false)
                                    }
                                    className={`px-2 py-1 rounded border text-xs flex items-center gap-1 cursor-pointer ${
                                      acc.royalEntry
                                        ? 'border-amber-500 bg-amber-400/90 text-amber-950 font-bold'
                                        : 'border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                    }`}
                                  >
                                    <Crown className="w-3 h-3" />
                                    <span>{acc.royalEntry ? 'ملكي ✓' : 'دخول ملكي'}</span>
                                  </button>
                                )}
                                {canManageAccounts && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openManageUserModal({
                                        id: acc.id,
                                        username: acc.username,
                                        role: acc.role,
                                        gender: acc.gender,
                                        nameColor: acc.nameColor,
                                        likesCount: acc.likesCount,
                                        customPermissions: acc.customPermissions,
                                      })
                                    }
                                    className="px-2 py-1 rounded border border-stone-300 dark:border-zinc-700 text-stone-700 dark:text-stone-200 text-xs hover:bg-stone-100 dark:hover:bg-zinc-800 flex items-center gap-1 cursor-pointer"
                                  >
                                    <KeyRound className="w-3 h-3" />
                                    <span>إدارة وصلاحيات</span>
                                  </button>
                                )}
                                {canMuteUsers && (
                                  <button
                                    type="button"
                                    onClick={() => onModAction(acc.id, acc.isMuted ? 'unmute' : 'mute')}
                                    className="px-2 py-1 rounded border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs cursor-pointer"
                                  >
                                    {acc.isMuted ? 'فك كتم' : 'كتم'}
                                  </button>
                                )}
                                {canBanUsers && !acc.isBanned && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBanTarget({ username: acc.username, userId: acc.id });
                                      setBanReason('');
                                    }}
                                    className="px-2 py-1 rounded border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 text-xs cursor-pointer"
                                  >
                                    حظر
                                  </button>
                                )}
                                {canManageAccounts && (
                                  confirmDeleteAccountId === acc.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onDeleteAccount(acc.id);
                                          setConfirmDeleteAccountId(null);
                                        }}
                                        className="px-2 py-1 rounded bg-red-700 text-white text-xs cursor-pointer"
                                      >
                                        تأكيد الحذف
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteAccountId(null)}
                                        className="px-1.5 py-1 rounded border border-stone-300 text-xs cursor-pointer"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteAccountId(acc.id)}
                                      title="حذف الحساب نهائياً"
                                      className="p-1.5 rounded text-stone-400 hover:text-red-600 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-stone-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECTION 4.5: NICKNAMES & IP REVEAL INSPECTOR */}
        {section === 'nicks' && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-3.5">
                <div className="text-[11px] text-stone-500 dark:text-stone-400">إجمالي السجلات</div>
                <div className="font-mono-tabular text-xl font-bold text-indigo-700 dark:text-indigo-300 mt-1">
                  {nickHistoryList.length}
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-3.5">
                <div className="text-[11px] text-stone-500 dark:text-stone-400">عناوين IP الفريدة</div>
                <div className="font-mono-tabular text-xl font-bold text-stone-900 dark:text-stone-100 mt-1">
                  {uniqueIpCount}
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-3.5">
                <div className="text-[11px] text-stone-500 dark:text-stone-400">آيبيات متعددة النكات</div>
                <div className="font-mono-tabular text-xl font-bold text-rose-700 dark:text-rose-400 mt-1">
                  {multiNickIpCount}
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-3.5">
                <div className="text-[11px] text-stone-500 dark:text-stone-400">المتصلون الآن</div>
                <div className="font-mono-tabular text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                  {nickHistoryList.filter((r) => r.isOnline).length}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-stone-200 dark:border-zinc-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <Radar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>كشف النكات وعناوين الآيبي (IP) للأعضاء والزوار</span>
                    </h2>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      يعرض اسم العضو، عنوان الآيبي، نوع الجهاز، وجميع النكات التي دخلت من نفس الآيبي
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={onFetchState}
                      className="h-8 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      تحديث السجل
                    </button>
                    {isAdmin && onClearNickHistory && nickHistoryList.length > 0 && (
                      confirmClearNickHistory ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onClearNickHistory();
                              setConfirmClearNickHistory(false);
                            }}
                            className="h-8 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                          >
                            تأكيد مسح السجل
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmClearNickHistory(false)}
                            className="h-8 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 text-xs cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmClearNickHistory(true)}
                          className="h-8 px-3 rounded-lg border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold cursor-pointer"
                        >
                          مسح السجل
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={nicksQuery}
                      onChange={(e) => setNicksQuery(e.target.value)}
                      placeholder="ابحث باسم العضو أو النك أو عنوان IP أو الجهاز..."
                      className="w-full h-9 pr-8 pl-8 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs"
                    />
                    {nicksQuery && (
                      <button
                        type="button"
                        onClick={() => setNicksQuery('')}
                        aria-label="مسح البحث"
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'الكل' },
                        { id: 'multi', label: `مشتركة بأكثر من نك (${multiNickIpCount})` },
                        { id: 'online', label: 'المتصلون الآن' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setNicksFilter(f.id)}
                        className={`h-8 px-2.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                          nicksFilter === f.id
                            ? 'bg-indigo-700 border-indigo-700 text-white'
                            : 'bg-stone-50 dark:bg-zinc-950 border-stone-300 dark:border-zinc-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 bg-stone-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setNicksViewMode('table')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                        nicksViewMode === 'table'
                          ? 'bg-white dark:bg-zinc-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                          : 'text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      عرض جدولي
                    </button>
                    <button
                      type="button"
                      onClick={() => setNicksViewMode('grouped')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                        nicksViewMode === 'grouped'
                          ? 'bg-white dark:bg-zinc-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                          : 'text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      تجميع حسب IP
                    </button>
                  </div>
                </div>
              </div>

              {filteredNickRecords.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 dark:text-stone-400">
                  لا توجد سجلات دخول مطابقة لبحثك حالياً. ستظهر السجلات تلقائياً عند دخول الزوار أو الأعضاء.
                </div>
              ) : nicksViewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs sm:text-sm">
                    <thead className="bg-stone-50 dark:bg-zinc-950 border-b border-stone-200 dark:border-zinc-800 text-stone-500 dark:text-stone-400">
                      <tr>
                        <th className="py-3 px-4 font-semibold">اسم العضو / النك</th>
                        <th className="py-3 px-4 font-semibold">عنوان الآيبي (IP)</th>
                        <th className="py-3 px-4 font-semibold">نكات نفس الآيبي</th>
                        <th className="py-3 px-4 font-semibold">الجهاز</th>
                        <th className="py-3 px-4 font-semibold">الحالة وآخر دخول</th>
                        <th className="py-3 px-4 font-semibold">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-zinc-800">
                      {filteredNickRecords.map((rec) => {
                        const siblings = nicksByIpMap.get(rec.ip || 'غير معروف') || [];
                        const otherSiblings = siblings.filter((s) => s.id !== rec.id);
                        const canActOnNick = rec.userId !== self.id && rec.role !== 'admin';
                        return (
                          <tr key={rec.id} className="hover:bg-stone-50/70 dark:hover:bg-zinc-800/40">
                            <td className="py-2.5 px-4">
                              <div className="font-bold flex items-center gap-1.5" style={{ color: rec.nameColor }}>
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    rec.isOnline ? 'bg-emerald-500' : 'bg-stone-400'
                                  }`}
                                />
                                <span>{rec.username}</span>
                              </div>
                              <div className="text-[11px] text-stone-400">
                                {rec.isGuest ? 'زائر' : 'عضو مسجل'} · {getRoleLabel(rec.role)} · {rec.country}
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setNicksQuery(rec.ip)}
                                  title="تصفية حسب هذا الآيبي"
                                  dir="ltr"
                                  className="font-mono-tabular text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 cursor-pointer"
                                >
                                  {rec.ip}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyIp(rec.ip)}
                                  title="نسخ الآيبي"
                                  className="p-1 rounded border border-stone-200 dark:border-zinc-700 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
                                >
                                  {copiedIpValue === rec.ip ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              {otherSiblings.length === 0 ? (
                                <span className="text-[11px] text-stone-400">نك وحيد</span>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1 max-w-xs">
                                  <span className="text-[10px] font-bold px-1.5 py-[1px] rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                                    +{otherSiblings.length} نك
                                  </span>
                                  {otherSiblings.slice(0, 4).map((sib) => (
                                    <span
                                      key={sib.id}
                                      className="text-[11px] font-bold px-1.5 py-[1px] rounded bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700"
                                      style={{ color: sib.nameColor }}
                                    >
                                      {sib.username}
                                    </span>
                                  ))}
                                  {otherSiblings.length > 4 && (
                                    <span className="text-[10px] text-stone-400">
                                      +{otherSiblings.length - 4}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-xs text-stone-600 dark:text-stone-300">
                              <span className="inline-flex items-center gap-1">
                                <Laptop className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span>{rec.deviceSummary}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-xs">
                              <div className={rec.isOnline ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-stone-500 dark:text-stone-400'}>
                                {rec.isOnline ? 'متصل الآن' : 'غير متصل'}
                              </div>
                              <div className="text-[11px] text-stone-400">
                                {formatRelativeDate(rec.lastSeenAt)} · {rec.loginCount} دخول
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center flex-wrap gap-1.5">
                                {canActOnNick && rec.isOnline && canMuteUsers && (
                                  <button
                                    type="button"
                                    onClick={() => onModAction(rec.userId, 'mute')}
                                    className="px-2 py-1 rounded border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                                  >
                                    كتم
                                  </button>
                                )}
                                {canActOnNick && rec.isOnline && canKickUsers && (
                                  <button
                                    type="button"
                                    onClick={() => onModAction(rec.userId, 'kick')}
                                    className="px-2 py-1 rounded border border-stone-300 dark:border-zinc-700 text-stone-700 dark:text-stone-300 text-xs hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
                                  >
                                    طرد
                                  </button>
                                )}
                                {canActOnNick && canBanUsers && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBanTarget({ username: rec.username, userId: rec.userId });
                                      setBanReason('');
                                    }}
                                    className="px-2 py-1 rounded border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 text-xs hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                                  >
                                    حظر
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groupedNickEntries.map((group) => (
                    <div
                      key={group.ip}
                      className={`rounded-xl border p-3.5 space-y-2.5 ${
                        group.records.length > 1
                          ? 'border-rose-300 dark:border-rose-900/70 bg-rose-50/40 dark:bg-rose-950/15'
                          : 'border-stone-200 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-950/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-200/80 dark:border-zinc-800">
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span dir="ltr" className="font-mono-tabular text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                            {group.ip}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyIp(group.ip)}
                            title="نسخ الآيبي"
                            className="p-1 rounded border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-600 dark:text-stone-300 cursor-pointer shrink-0"
                          >
                            {copiedIpValue === group.ip ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                            group.records.length > 1
                              ? 'bg-rose-600 text-white'
                              : 'bg-stone-200 dark:bg-zinc-800 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {group.records.length} {group.records.length > 1 ? 'نكات مرتبطة' : 'نك واحد'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                        <span className="flex items-center gap-1">
                          <Laptop className="w-3 h-3" />
                          <span>{group.deviceSummary}</span>
                        </span>
                        <span>آخر ظهور: {formatRelativeDate(group.latestAt)}</span>
                      </div>

                      <div className="space-y-1.5">
                        {group.records.map((rec) => {
                          const canActOnNick = rec.userId !== self.id && rec.role !== 'admin';
                          return (
                            <div
                              key={rec.id}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-stone-200/80 dark:border-zinc-800 text-xs"
                            >
                              <div className="min-w-0 flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    rec.isOnline ? 'bg-emerald-500' : 'bg-stone-400'
                                  }`}
                                />
                                <span className="font-bold truncate" style={{ color: rec.nameColor }}>
                                  {rec.username}
                                </span>
                                <span className="text-[10px] text-stone-400 shrink-0">
                                  ({rec.isGuest ? 'زائر' : getRoleLabel(rec.role)})
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-stone-400 font-mono-tabular">
                                  {formatRelativeDate(rec.lastSeenAt)}
                                </span>
                                {canActOnNick && canBanUsers && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBanTarget({ username: rec.username, userId: rec.userId });
                                      setBanReason('');
                                    }}
                                    className="px-1.5 py-0.5 rounded border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 text-[10px] font-bold cursor-pointer"
                                  >
                                    حظر
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 5: ROOMS & WALL CONTENT MANAGEMENT */}
        {section === 'rooms' && (
          <div className="space-y-6">
            {/* Create New Room */}
            {(canManageRooms || hasUserPermission(self, effectiveSettings, 'canCreateRoom')) && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newRoomName.trim().length < 3) return;
                  onCreateRoom({
                    name: newRoomName.trim(),
                    description: newRoomDesc.trim(),
                    topic: newRoomTopic.trim(),
                    password: newRoomPassword.trim() || undefined,
                    imageUrl: newRoomImage.trim() || undefined,
                  });
                  setNewRoomName('');
                  setNewRoomDesc('');
                  setNewRoomTopic('');
                  setNewRoomPassword('');
                  setNewRoomImage('');
                }}
                className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-5 space-y-3"
              >
                <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                  إنشاء غرفة جديدة
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={36}
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="اسم الغرفة..."
                    className="h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-sm"
                  />
                  <input
                    type="text"
                    maxLength={100}
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    placeholder="وصف مختصر..."
                    className="h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-sm"
                  />
                  <input
                    type="text"
                    maxLength={140}
                    value={newRoomTopic}
                    onChange={(e) => setNewRoomTopic(e.target.value)}
                    placeholder="رسالة الترحيب المثبتة..."
                    className="h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-sm"
                  />
                  <input
                    type="password"
                    maxLength={32}
                    value={newRoomPassword}
                    onChange={(e) => setNewRoomPassword(e.target.value)}
                    placeholder="كلمة مرور الغرفة (اختياري)..."
                    className="h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-sm"
                  />
                </div>
                <RoomImagePicker
                  value={newRoomImage}
                  onChange={setNewRoomImage}
                  roomName={newRoomName || 'الغرفة الجديدة'}
                  compact
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة الغرفة</span>
                  </button>
                </div>
              </form>
            )}

            {/* Existing Rooms List */}
            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                  إدارة الغرف ({rooms.length})
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {canClearRoom && canManageRooms && (
                    confirmClearAllRooms ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onClearAllRooms();
                            setConfirmClearAllRooms(false);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          تأكيد تنظيف جميع الغرف
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClearAllRooms(false)}
                          className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmClearAllRooms(true)}
                        className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eraser className="w-3.5 h-3.5" />
                        <span>تنظيف كل الغرف</span>
                      </button>
                    )
                  )}

                  {canClearWall && (
                    confirmClearWall ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onClearWall();
                            setConfirmClearWall(false);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          تأكيد مسح جميع منشورات الحائط
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClearWall(false)}
                          className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmClearWall(true)}
                        className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eraser className="w-3.5 h-3.5" />
                        <span>تنظيف الحائط</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="divide-y divide-stone-100 dark:divide-zinc-800">
                {rooms.map((room) => {
                  const isEditing = editingRoomId === room.id;
                  return (
                    <div key={room.id} className="p-4 space-y-3">
                      {isEditing ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            onUpdateRoom(
                              room.id,
                              roomNameInput,
                              roomDescInput,
                              roomTopicInput,
                              roomPasswordInput.trim() || undefined,
                              roomImageInput.trim()
                            );
                            setEditingRoomId(null);
                          }}
                          className="space-y-3"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              required
                              maxLength={36}
                              value={roomNameInput}
                              onChange={(e) => setRoomNameInput(e.target.value)}
                              className="h-9 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs sm:text-sm"
                              placeholder="اسم الغرفة"
                            />
                            <input
                              type="text"
                              maxLength={100}
                              value={roomDescInput}
                              onChange={(e) => setRoomDescInput(e.target.value)}
                              className="h-9 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs sm:text-sm"
                              placeholder="الوصف"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              maxLength={140}
                              value={roomTopicInput}
                              onChange={(e) => setRoomTopicInput(e.target.value)}
                              className="w-full h-9 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs sm:text-sm"
                              placeholder="الموضوع المثبت"
                            />
                            {room.id !== 'general' && (
                              <input
                                type="password"
                                maxLength={32}
                                value={roomPasswordInput}
                                onChange={(e) => setRoomPasswordInput(e.target.value)}
                                className="w-full h-9 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs sm:text-sm"
                                placeholder="كلمة مرور جديدة (اتركه فارغاً لإزالة القفل)"
                              />
                            )}
                          </div>
                          <RoomImagePicker
                            value={roomImageInput}
                            onChange={setRoomImageInput}
                            roomName={roomNameInput || room.name}
                            compact
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingRoomId(null)}
                              className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 text-xs cursor-pointer"
                            >
                              إلغاء
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1.5 rounded-lg bg-rose-800 text-white text-xs font-semibold cursor-pointer"
                            >
                              حفظ التعديل
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex-1 flex items-start gap-3">
                            <RoomThumbnail
                              imageUrl={room.imageUrl}
                              name={room.name}
                              size="md"
                              className="rounded-lg mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                                  {room.name}
                                </span>
                                {room.hasPassword && (
                                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                )}
                                <span className="text-xs text-stone-500 dark:text-stone-400 font-mono-tabular">
                                  · {room.onlineCount} متصل
                                </span>
                              </div>
                              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                {room.description}
                              </p>
                              <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1">
                                الموضوع: {room.topic}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            {canManageRooms && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRoomId(room.id);
                                  setRoomNameInput(room.name);
                                  setRoomDescInput(room.description);
                                  setRoomTopicInput(room.topic);
                                  setRoomPasswordInput('');
                                  setRoomImageInput(room.imageUrl || '');
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 text-xs font-medium hover:bg-stone-50 dark:hover:bg-zinc-800 flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>تعديل</span>
                              </button>
                            )}

                            {canClearRoom && (
                              confirmClearRoomId === room.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClearRoom(room.id);
                                      setConfirmClearRoomId(null);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold cursor-pointer"
                                  >
                                    تأكيد التنظيف
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmClearRoomId(null)}
                                    className="px-2 py-1.5 rounded-lg border border-stone-300 text-xs cursor-pointer"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmClearRoomId(room.id)}
                                  className="px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-medium hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-1 cursor-pointer"
                                >
                                  <Eraser className="w-3.5 h-3.5" />
                                  <span>تنظيف الدردشة</span>
                                </button>
                              )
                            )}

                            {canManageRooms && room.id !== 'general' && (
                              confirmDeleteRoomId === room.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteRoom(room.id);
                                      setConfirmDeleteRoomId(null);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-red-700 text-white text-xs font-semibold cursor-pointer"
                                  >
                                    حذف نهائي
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteRoomId(null)}
                                    className="px-2 py-1.5 rounded-lg border border-stone-300 text-xs cursor-pointer"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteRoomId(room.id)}
                                  className="px-2.5 py-1.5 rounded-lg border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>حذف</span>
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 6: BANS, WORD FILTER & AUDIT LOG */}
        {section === 'security' && (
          <div className="space-y-6">
            {/* Banned Users Manager */}
            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
              <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                إدارة المحظورين ({adminState.bans.length})
              </h2>

              {canBanUsers && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!manualBanName.trim()) return;
                    onBanUser(manualBanName.trim(), manualBanReason.trim() || 'مخالفة القوانين');
                    setManualBanName('');
                    setManualBanReason('');
                  }}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2.5"
                >
                  <input
                    type="text"
                    maxLength={24}
                    value={manualBanName}
                    onChange={(e) => setManualBanName(e.target.value)}
                    placeholder="اسم المستخدم المراد حظره..."
                    className="sm:col-span-4 h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs sm:text-sm"
                  />
                  <input
                    type="text"
                    maxLength={120}
                    value={manualBanReason}
                    onChange={(e) => setManualBanReason(e.target.value)}
                    placeholder="سبب الحظر..."
                    className="sm:col-span-6 h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs sm:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!manualBanName.trim()}
                    className="sm:col-span-2 h-10 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    إضافة حظر
                  </button>
                </form>
              )}

              {adminState.bans.length === 0 ? (
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  لا يوجد مستخدمون محظورون حالياً.
                </p>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-zinc-800 border border-stone-200 dark:border-zinc-800 rounded-lg">
                  {adminState.bans.map((b) => (
                    <div key={b.id} className="p-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                      <div>
                        <div className="font-bold text-stone-900 dark:text-stone-100">{b.username}</div>
                        <div className="text-xs text-stone-500 dark:text-stone-400">
                          السبب: {b.reason} · بواسطة {b.bannedBy} · {formatRelativeDate(b.bannedAt)}
                        </div>
                      </div>
                      {canBanUsers && (
                        <button
                          type="button"
                          onClick={() => onUnbanUser(b.id)}
                          className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          رفع الحظر
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Banned Words Filter */}
            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
              <div>
                <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                  فلتر الكلمات الممنوعة ({adminState.bannedWords.length})
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  يمنع الخادم إرسال أي رسالة عامة أو خاصة أو منشور حائط يحتوي على إحدى هذه الكلمات.
                </p>
              </div>

              {canManageSettings && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newBannedWord.trim().length < 2) return;
                    onAddBannedWord(newBannedWord.trim());
                    setNewBannedWord('');
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    maxLength={32}
                    value={newBannedWord}
                    onChange={(e) => setNewBannedWord(e.target.value)}
                    placeholder="أضف كلمة ممنوعة..."
                    className="flex-1 h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs sm:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={newBannedWord.trim().length < 2}
                    className="px-4 h-10 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    إضافة للفلتر
                  </button>
                </form>
              )}

              {adminState.bannedWords.length === 0 ? (
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  لم تتم إضافة كلمات محظورة بعد.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {adminState.bannedWords.map((word) => (
                    <div
                      key={word}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs font-medium text-stone-800 dark:text-stone-200"
                    >
                      <span>{word}</span>
                      {canManageSettings && (
                        <button
                          type="button"
                          onClick={() => onRemoveBannedWord(word)}
                          aria-label={`إزالة ${word}`}
                          className="text-stone-400 hover:text-red-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Audit Log */}
            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                <h2 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                  سجل إجراءات الإدارة ({adminState.auditLogs.length})
                </h2>
                {isAdmin && adminState.auditLogs.length > 0 && (
                  confirmClearLogs ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onClearAuditLogs();
                          setConfirmClearLogs(false);
                        }}
                        className="px-2.5 py-1 rounded bg-red-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        تأكيد المسح
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearLogs(false)}
                        className="px-2 py-1 rounded border border-stone-300 text-xs cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearLogs(true)}
                      className="px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-semibold cursor-pointer"
                    >
                      مسح السجل
                    </button>
                  )
                )}
              </div>
              {adminState.auditLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500 dark:text-stone-400">
                  لا توجد إجراءات مسجلة حتى الآن.
                </div>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-zinc-800 max-h-80 overflow-y-auto chat-scroll">
                  {adminState.auditLogs.map((log) => (
                    <div key={log.id} className="px-5 py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="font-bold text-rose-900 dark:text-amber-300 ml-1.5">
                          {log.actorName}
                        </span>
                        <span className="text-stone-700 dark:text-stone-300">
                          {log.action}: <strong>{log.target}</strong>
                        </span>
                      </div>
                      <span className="font-mono-tabular text-stone-400 dark:text-stone-500 shrink-0">
                        {formatTime(log.timestamp)} · {formatRelativeDate(log.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ban Confirmation Modal */}
      {banTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onBanUser(banTarget.username, banReason.trim() || 'مخالفة قوانين الدردشة', banTarget.userId);
              setBanTarget(null);
            }}
            className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl p-5 space-y-4"
          >
            <h3 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
              حظر المستخدم: {banTarget.username}
            </h3>
            <input
              type="text"
              maxLength={120}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="اكتب سبب الحظر..."
              className="w-full h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-sm"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBanTarget(null)}
                className="px-4 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 text-xs font-medium cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold cursor-pointer"
              >
                تأكيد الحظر
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Per-User Custom Permissions, Likes & Profile Editor Modal */}
      {editingAccountTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/65 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-200 dark:border-zinc-800 flex items-center justify-between bg-rose-900 text-white">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-300" />
                <h3 className="font-display text-sm sm:text-base font-bold">
                  إدارة وصلاحيات العضو: {editingAccountTarget.username} ({getRoleLabel(editingAccountTarget.role)})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccountTarget(null)}
                className="p-1 rounded hover:bg-black/25 cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto chat-scroll p-4 space-y-5">
              {/* Profile & Likes Quick Edit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    تغيير الاسم
                  </label>
                  <input
                    type="text"
                    maxLength={28}
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    لون الاسم
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editUserColor}
                      onChange={(e) => setEditUserColor(e.target.value)}
                      className="h-9 w-12 rounded border border-stone-300 dark:border-zinc-700 bg-white cursor-pointer"
                    />
                    <span className="font-mono-tabular text-xs text-stone-500">{editUserColor}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    تعديل اللايكات (الرصيد)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-600 fill-rose-500 shrink-0" />
                    <input
                      type="number"
                      min={0}
                      max={1000000}
                      value={editUserLikes}
                      onChange={(e) => setEditUserLikes(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm font-mono-tabular"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    تعديل الحالة النصية
                  </label>
                  <input
                    type="text"
                    maxLength={48}
                    value={editUserStatus}
                    onChange={(e) => setEditUserStatus(e.target.value)}
                    placeholder="اتركه فارغاً للإبقاء على الحالي"
                    className="w-full h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm"
                  />
                </div>
                {(isAdmin || !editingAccountTarget.id.startsWith('demo-member-test')) && (
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      تحديد نوع الجنس {editingAccountTarget.id.startsWith('demo-member-test') ? '(ينعكس مباشرة على صوت المايك والأسلوب)' : ''}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditUserGender('male')}
                        className={`h-9 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                          editUserGender === 'male'
                            ? 'border-sky-600 bg-sky-600 text-white'
                            : 'border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-700 dark:text-stone-200 hover:bg-sky-50 dark:hover:bg-sky-950/30'
                        }`}
                      >
                        <span>ذكر (صوت رجل)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditUserGender('female')}
                        className={`h-9 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                          editUserGender === 'female'
                            ? 'border-rose-600 bg-rose-600 text-white'
                            : 'border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-700 dark:text-stone-200 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                        }`}
                      >
                        <span>أنثى (صوت بنت رقيقة)</span>
                      </button>
                    </div>
                  </div>
                )}
                <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onEditUser(editingAccountTarget.id, { removeAvatar: true, removeCover: true });
                    }}
                    className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ImageOff className="w-3.5 h-3.5" />
                    <span>حذف صورة العضو والغلاف</span>
                  </button>
                </div>
              </div>

              {/* Demo Member Talk & Control Mode (Admin Only) */}
              {isAdmin &&
                editingAccountTarget.id.startsWith('demo-member-test') &&
                onSetDemoTalkControl &&
                (() => {
                  const liveOnlineDemo = adminState?.allOnlineUsers.find(
                    (u) => u.id === editingAccountTarget.id
                  );
                  const regDemo = adminState?.registeredUsers.find(
                    (u) => u.id === editingAccountTarget.id
                  );
                  const isTalkControlOn = Boolean(
                    liveOnlineDemo?.demoTalkControlEnabled ?? regDemo?.demoTalkControlEnabled
                  );
                  return (
                    <div
                      className={`p-3.5 rounded-xl border space-y-2.5 ${
                        isTalkControlOn
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                          : 'bg-stone-50 dark:bg-zinc-950 border-stone-200 dark:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <h4 className="font-display text-sm font-bold text-stone-900 dark:text-stone-100">
                            وضع التحدث والتحكم للعضو التجريبي
                          </h4>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400">
                            {isTalkControlOn
                              ? 'مفعّل الآن — يمكنك توجيهه أو جعله يتحدث نصياً أو صوتياً على المايك.'
                              : 'معطّل حالياً — العضو التجريبي صامت تماماً ولا يتحدث أو يفعل أي شيء حتى تفعّله.'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onSetDemoTalkControl(editingAccountTarget.id, !isTalkControlOn)
                          }
                          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            isTalkControlOn
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-teal-700 hover:bg-teal-800 text-white'
                          }`}
                        >
                          {isTalkControlOn ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5" />
                              <span>إيقاف التحدث والتحكم (إسكات)</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>تفعيل وضع التحدث والتحكم</span>
                            </>
                          )}
                        </button>
                      </div>

                      {isTalkControlOn && onDemoDirectAction && liveOnlineDemo && (
                        <div className="pt-2 border-t border-emerald-200 dark:border-emerald-900/60 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={400}
                              value={adminDemoSayText}
                              onChange={(e) => setAdminDemoSayText(e.target.value)}
                              placeholder="اكتب رسالة ليرسلها في غرفته الحالية..."
                              className="flex-1 min-w-0 h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                            />
                            <button
                              type="button"
                              disabled={!adminDemoSayText.trim()}
                              onClick={() => {
                                if (!adminDemoSayText.trim()) return;
                                onDemoDirectAction(editingAccountTarget.id, 'sayRoom', {
                                  text: adminDemoSayText.trim(),
                                });
                                setAdminDemoSayText('');
                              }}
                              className="h-9 px-3 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-45 text-white text-xs font-bold cursor-pointer shrink-0"
                            >
                              إرسال باسمه
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onDemoDirectAction(editingAccountTarget.id, 'micJoin')
                              }
                              className="h-8 px-3 rounded-lg border border-teal-400 dark:border-teal-800 bg-white dark:bg-zinc-900 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Mic className="w-3.5 h-3.5" />
                              <span>إصعاد للمايك العام</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onDemoDirectAction(editingAccountTarget.id, 'micLeave')
                              }
                              className="h-8 px-3 rounded-lg border border-orange-300 dark:border-orange-800 bg-white dark:bg-zinc-900 text-orange-800 dark:text-orange-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <MicOff className="w-3.5 h-3.5" />
                              <span>إنزال من المايك</span>
                            </button>
                            <div className="flex-1 min-w-[200px] flex items-center gap-1.5">
                              <input
                                type="text"
                                maxLength={280}
                                value={adminDemoMicText}
                                onChange={(e) => setAdminDemoMicText(e.target.value)}
                                placeholder="كلام على المايك (أو فارغ للتلقائي)..."
                                className="flex-1 min-w-0 h-8 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  onDemoDirectAction(editingAccountTarget.id, 'micSpeak', {
                                    text: adminDemoMicText.trim() || undefined,
                                  });
                                  setAdminDemoMicText('');
                                }}
                                className="h-8 px-3 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold cursor-pointer shrink-0"
                              >
                                تكلم بالمايك
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              {/* Per-User Custom Permissions Overrides */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="font-display text-sm font-bold text-stone-900 dark:text-stone-100">
                      صلاحيات فردية مخصصة لهذا العضو
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      يمكنك منح أو سحب أي صلاحية لهذا العضو تحديداً بشكل مستقل عن رتبته
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditUserPerms({})}
                    className="px-2.5 py-1 rounded border border-stone-300 dark:border-zinc-700 text-[11px] font-semibold hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    إعادة الكل لافتراضي الرتبة
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PERMISSION_CATALOG.map((perm) => {
                    const currentVal: boolean | undefined = editUserPerms[perm.key as PermissionKey];
                    const stateMode =
                      currentVal === true ? 'allow' : currentVal === false ? 'deny' : 'default';
                    return (
                      <div
                        key={perm.key}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-950 text-xs"
                      >
                        <span className="font-medium text-stone-800 dark:text-stone-200 truncate">
                          {perm.label}
                        </span>
                        <div className="flex items-center rounded overflow-hidden border border-stone-300 dark:border-zinc-700 shrink-0 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => {
                              setEditUserPerms((prev) => {
                                const next = { ...prev };
                                delete next[perm.key];
                                return next;
                              });
                            }}
                            className={`px-1.5 py-1 cursor-pointer ${
                              stateMode === 'default'
                                ? 'bg-stone-700 text-white'
                                : 'bg-white dark:bg-zinc-900 text-stone-500'
                            }`}
                          >
                            رتبة
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditUserPerms((prev) => ({ ...prev, [perm.key]: true }))
                            }
                            className={`px-1.5 py-1 cursor-pointer ${
                              stateMode === 'allow'
                                ? 'bg-[#44a948] text-white'
                                : 'bg-white dark:bg-zinc-900 text-stone-500'
                            }`}
                          >
                            منح
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditUserPerms((prev) => ({ ...prev, [perm.key]: false }))
                            }
                            className={`px-1.5 py-1 cursor-pointer ${
                              stateMode === 'deny'
                                ? 'bg-red-600 text-white'
                                : 'bg-white dark:bg-zinc-900 text-stone-500'
                            }`}
                          >
                            منع
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingAccountTarget(null)}
                className="px-4 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  onEditUser(editingAccountTarget.id, {
                    username: editUserName.trim() !== editingAccountTarget.username ? editUserName.trim() : undefined,
                    nameColor: editUserColor !== editingAccountTarget.nameColor ? editUserColor : undefined,
                    statusText: editUserStatus.trim() || undefined,
                    gender:
                      (isAdmin || !editingAccountTarget.id.startsWith('demo-member-test')) &&
                      editUserGender !== editingAccountTarget.gender
                        ? editUserGender
                        : undefined,
                  });
                  if (editUserLikes !== editingAccountTarget.likesCount) {
                    onSetUserLikes(editingAccountTarget.id, editUserLikes);
                  }
                  onSetUserPermissions(editingAccountTarget.id, editUserPerms);
                  setEditingAccountTarget(null);
                }}
                className="px-5 py-2 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>حفظ التغييرات والصلاحيات</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
