import React, { useEffect, useState } from 'react';
import {
  X,
  MessageCircle,
  Mail,
  Heart,
  Ban,
  Eye,
  Crown,
  BadgeCheck,
  Dices,
  Grid3X3,
  VolumeX,
  UserMinus,
  Award,
  ShieldAlert,
  Send,
  Gift,
  Volume2,
  ArrowRightLeft,
  MicOff,
  Mic,
  Trash2,
  SlidersHorizontal,
  Check,
  ChevronDown,
  ChevronUp,
  Palette,
  ImageOff,
  Pencil,
  Radar,
  Copy,
  Globe,
  Laptop,
  ZoomIn,
} from 'lucide-react';
import { resolveAvatarDataUri } from '../utils/avatar';
import { ImageLightboxModal, type LightboxImagePayload } from './ImageLightboxModal';
import type {
  ChatUser,
  GiftId,
  MicSlot,
  NickRevealPayload,
  Room,
  SiteSettings,
  UserGender,
  UserProfileStats,
  UserRole,
} from '../types/chat';
import {
  DEFAULT_GIFTS,
  NAME_COLORS,
  computeUserLevel,
  formatCompactMetric,
  formatRelativeDate,
  getCountryFlag,
  getRoleLabel,
  getStatusIconLabel,
  hasUserPermission,
} from '../utils/chatHelpers';
import { UserAvatar } from './UserAvatar';

interface UserProfileModalProps {
  target: ChatUser;
  self: ChatUser;
  selfLikes?: number;
  stats?: UserProfileStats;
  siteSettings?: SiteSettings;
  rooms?: Room[];
  currentRoomId?: string;
  targetMicSlot?: MicSlot;
  isIgnored: boolean;
  onClose: () => void;
  onStartPm: (user: ChatUser) => void;
  onMention?: (username: string) => void;
  onToggleIgnore: (userId: string) => void;
  onToggleLike: (targetUserId: string) => void;
  onSendGift: (targetUserId: string, giftId: GiftId) => void;
  onClearGiftIcon?: (targetUserId: string) => void;
  onSendAlert: (targetUserId: string, message?: string) => void;
  onChallengeGame: (targetUserId: string, gameType: 'xo' | 'ludo') => void;
  onModAction: (targetUserId: string, action: 'mute' | 'unmute' | 'kick' | 'promote' | 'demote') => void;
  onMoveUserRoom?: (targetUserId: string, roomId: string) => void;
  onBanUser?: (username: string, reason: string, targetUserId?: string) => void;
  onSetRole?: (targetUserId: string, role: UserRole) => void;
  onSetUserLikes?: (targetUserId: string, likesCount: number) => void;
  onEditUser?: (
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
  onDeleteAccount?: (targetUserId: string) => void;
  onMicModAction?: (
    slotIndex: number,
    action: 'kick' | 'mute' | 'unmute' | 'lock' | 'unlock'
  ) => void;
  onSetDemoTalkControl?: (targetUserId: string, enabled: boolean) => void;
  onDemoDirectAction?: (
    targetUserId: string,
    action: 'sayRoom' | 'micJoin' | 'micLeave' | 'micSpeak' | 'setGender',
    payload?: { text?: string; slotIndex?: number; gender?: UserGender }
  ) => void;
  nickRevealResult?: NickRevealPayload | null;
  onRevealUserNicks?: (targetUserId: string) => void;
  onClearNickReveal?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  target,
  self,
  selfLikes = 50,
  stats,
  siteSettings,
  rooms = [],
  currentRoomId,
  targetMicSlot,
  isIgnored,
  onClose,
  onStartPm,
  onToggleIgnore,
  onToggleLike,
  onSendGift,
  onClearGiftIcon,
  onSendAlert,
  onChallengeGame,
  onModAction,
  onMoveUserRoom,
  onBanUser,
  onSetRole,
  onSetUserLikes,
  onEditUser,
  onSetRoyalEntry,
  onDeleteAccount,
  onMicModAction,
  onSetDemoTalkControl,
  onDemoDirectAction,
  nickRevealResult,
  onRevealUserNicks,
  onClearNickReveal,
}) => {
  const [coverError, setCoverError] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [showAlertBox, setShowAlertBox] = useState(false);
  const [showGiftBox, setShowGiftBox] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [sentGiftLabel, setSentGiftLabel] = useState<string | null>(null);

  const likesList = stats?.likes || [];
  const profileLikesCount = likesList.length;
  const isLikedByMe = likesList.includes(self.id);
  const viewsCount = stats?.views ?? 1;
  const totalLikesCount = stats?.likesCount ?? target.likesCount ?? 50;

  const effectiveTargetRoomId = target.roomId || currentRoomId || 'general';
  const [moveRoomId, setMoveRoomId] = useState<string>(() => {
    const other = rooms.find((r) => r.id !== effectiveTargetRoomId);
    return other?.id || rooms[0]?.id || '';
  });
  const [showBanBox, setShowBanBox] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [showAdvancedMod, setShowAdvancedMod] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [roleDraft, setRoleDraft] = useState<UserRole>(target.role);
  const [likesDraft, setLikesDraft] = useState<string>(String(totalLikesCount));

  useEffect(() => {
    setLikesDraft(String(totalLikesCount));
  }, [totalLikesCount]);
  const [editUsername, setEditUsername] = useState<string>(target.username);
  const [editNameColor, setEditNameColor] = useState<string>(target.nameColor || '#0F766E');
  const [modFeedback, setModFeedback] = useState<string | null>(null);
  const [demoSayText, setDemoSayText] = useState('');
  const [demoMicText, setDemoMicText] = useState('');
  const [showNickReveal, setShowNickReveal] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<LightboxImagePayload | null>(null);

  useEffect(() => {
    setEditUsername(target.username);
    setShowNickReveal(false);
    setCopiedIp(false);
    onClearNickReveal?.();
  }, [target.id]);

  useEffect(() => {
    setEditUsername(target.username);
  }, [target.username]);

  useEffect(() => {
    setEditNameColor(target.nameColor || '#0F766E');
  }, [target.id, target.nameColor]);

  useEffect(() => {
    setRoleDraft(target.role);
  }, [target.id, target.role]);

  const showModToast = (msg: string) => {
    setModFeedback(msg);
    window.setTimeout(() => {
      setModFeedback((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const handleDispatchAlert = (customMsg?: string) => {
    const finalMsg = (customMsg ?? alertMessage).trim();
    onSendAlert(target.id, finalMsg || undefined);
    setAlertSent(true);
    setShowAlertBox(false);
    setAlertMessage('');
    window.setTimeout(() => setAlertSent(false), 2200);
  };

  const isSelf = target.id === self.id;
  const isAdmin = self.role === 'admin';
  const canMuteUsers = hasUserPermission(self, siteSettings, 'canMuteUsers');
  const canKickUsers = hasUserPermission(self, siteSettings, 'canKickUsers');
  const canMoveUsers = hasUserPermission(self, siteSettings, 'canMoveUsers');
  const canManageMics = hasUserPermission(self, siteSettings, 'canManageMics');
  const canBanUsers = hasUserPermission(self, siteSettings, 'canBanUsers');
  const canManageAccounts = hasUserPermission(self, siteSettings, 'canManageAccounts');
  const canRevealNicks =
    !isSelf &&
    Boolean(onRevealUserNicks) &&
    (isAdmin || (hasUserPermission(self, siteSettings, 'canAccessAdminPanel') && target.role !== 'admin'));

  const canModerate =
    !isSelf &&
    (canRevealNicks ||
      (target.role !== 'admin' &&
        (canMuteUsers || canKickUsers || canMoveUsers || canManageMics || canBanUsers || canManageAccounts)));

  const currentTargetRoomName =
    rooms.find((r) => r.id === effectiveTargetRoomId)?.name || effectiveTargetRoomId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/65 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-card-title"
    >
      <div className="w-full max-w-sm max-h-[92dvh] flex flex-col bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-800 rounded-md shadow-2xl overflow-hidden">
        {/* Top Bar matching IMG_3478 */}
        <div
          className="px-3 py-2 dark:bg-zinc-950 text-white flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--ych-primary)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <UserAvatar
              avatarUrl={target.avatarUrl}
              username={target.username}
              size="xs"
              className="rounded-xs border-white/40"
            />
            <span
              id="user-card-title"
              className="font-bold text-sm truncate"
            >
              {target.username}
            </span>
            {target.giftImageUrl ? (
              <img
                src={target.giftImageUrl}
                alt={target.giftLabel || 'هدية'}
                title={target.giftLabel ? `هدية: ${target.giftLabel}` : 'أيقونة هدية'}
                referrerPolicy="no-referrer"
                className="h-6 w-auto max-w-[44px] object-contain shrink-0"
              />
            ) : target.giftIcon ? (
              <span
                title={target.giftLabel ? `هدية: ${target.giftLabel}` : 'أيقونة هدية'}
                className="text-lg leading-none shrink-0"
              >
                {target.giftIcon}
              </span>
            ) : null}
            {target.statusIcon && (
              <span
                title={getStatusIconLabel(target.statusIcon) || target.statusText}
                className="text-sm leading-none shrink-0"
              >
                {target.statusIcon}
              </span>
            )}
            {target.statusText && (
              <span className="text-xs text-white/85 truncate">
                {target.statusText}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 sm:w-7 sm:h-7 rounded-full bg-white/25 hover:bg-white/40 text-white flex items-center justify-center shrink-0 cursor-pointer active:scale-90 transition-transform"
          >
            <X className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Profile Body */}
        <div className="flex-1 overflow-y-auto chat-scroll">
          {/* Scenic Cover Photo */}
          <div className="relative h-32 sm:h-36 bg-gradient-to-b from-teal-900 via-amber-500/80 to-stone-900 overflow-hidden">
            {(!coverError || target.coverUrl) && (
              <button
                type="button"
                onClick={() =>
                  setZoomedImage({
                    src:
                      target.coverUrl ||
                      '/src/assets/images/portal_baghdad_heritage_1794757980500.jpg',
                    alt: `صورة الغلاف — ${target.username}`,
                  })
                }
                className="w-full h-full block cursor-zoom-in"
                aria-label="تكبير صورة الغلاف"
              >
                <img
                  src={target.coverUrl || '/src/assets/images/portal_baghdad_heritage_1794757980500.jpg'}
                  alt={`غلاف ${target.username}`}
                  referrerPolicy="no-referrer"
                  onError={() => setCoverError(true)}
                  className="w-full h-full object-cover opacity-90"
                />
              </button>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <span
              className="absolute top-2 left-2 px-2 py-0.5 rounded-xs bg-black/60 text-amber-300 text-[11px] font-mono-tabular font-extrabold border border-amber-400/40"
              title="المستوى بناءً على اللايكات"
            >
              LV {computeUserLevel(totalLikesCount)}
            </span>
          </div>

          <div className="px-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
            {/* Overlapping Circular Avatar on Left + Name + Verified Check (matching IMG_3478) */}
            <div dir="ltr" className="flex items-end gap-3 -mt-12 relative z-10">
              <button
                type="button"
                onClick={() => {
                  if (target.avatarUrl === 'none') return;
                  const resolved = resolveAvatarDataUri(target.avatarUrl, target.username);
                  if (resolved) {
                    setZoomedImage({
                      src: resolved,
                      alt: `الصورة الشخصية — ${target.username}`,
                    });
                  }
                }}
                disabled={target.avatarUrl === 'none'}
                className="group/av relative w-24 h-24 rounded-full border-4 border-white dark:border-zinc-900 shadow-lg overflow-hidden bg-stone-200 dark:bg-zinc-800 shrink-0 cursor-zoom-in disabled:cursor-default active:scale-95 transition-transform"
                aria-label="تكبير الصورة الشخصية"
              >
                <UserAvatar
                  avatarUrl={target.avatarUrl}
                  username={target.username}
                  size="xl"
                  className="!w-full !h-full !rounded-full border-0"
                />
                {target.avatarUrl !== 'none' && (
                  <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/65 text-white flex items-center justify-center opacity-0 group-hover/av:opacity-100 transition-opacity pointer-events-none">
                    <ZoomIn className="w-3 h-3" />
                  </span>
                )}
              </button>

              <div className="pb-1.5 min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {target.giftImageUrl ? (
                    <img
                      src={target.giftImageUrl}
                      alt={target.giftLabel || 'هدية'}
                      title={target.giftLabel ? `هدية: ${target.giftLabel}` : 'أيقونة هدية'}
                      referrerPolicy="no-referrer"
                      className="h-7 w-auto max-w-[56px] object-contain shrink-0"
                    />
                  ) : target.giftIcon ? (
                    <span
                      title={target.giftLabel ? `هدية: ${target.giftLabel}` : 'أيقونة هدية'}
                      className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-xs bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-2xl leading-none shrink-0"
                    >
                      {target.giftIcon}
                    </span>
                  ) : null}
                  <span
                    className="font-display font-extrabold text-lg sm:text-xl truncate"
                    style={{ color: target.nameColor }}
                  >
                    {target.username}
                  </span>
                  {target.statusIcon && (
                    <span
                      title={getStatusIconLabel(target.statusIcon) || target.statusText}
                      className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-xs bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-sm leading-none shrink-0"
                    >
                      {target.statusIcon}
                    </span>
                  )}
                  {target.role !== 'visitor' && (
                    <BadgeCheck className="w-5 h-5 text-[#1d9bf0] fill-[#1d9bf0] stroke-white shrink-0" />
                  )}
                  {target.royalEntry && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-l from-amber-500 to-yellow-400 text-amber-950 text-[10px] font-extrabold shadow-2xs shrink-0">
                      <Crown className="w-3 h-3 fill-amber-950/20" />
                      <span>دخول ملكي</span>
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  {getRoleLabel(target.role)} · {target.gender === 'female' ? 'فتاة' : 'شاب'} · LV {computeUserLevel(totalLikesCount)}
                </div>
              </div>
            </div>

            {/* 3 Colored Crowns + Achievement Badges Row */}
            <div className="flex items-center justify-around py-1">
              <Crown className={`w-5 h-5 ${target.role === 'admin' || target.role === 'moderator' ? 'text-amber-500 fill-amber-400' : 'text-amber-400/70'}`} />
              <Crown className={`w-5 h-5 ${totalLikesCount >= 100 ? 'text-purple-600 fill-purple-500' : 'text-purple-500/60'}`} />
              <Crown className={`w-5 h-5 ${profileLikesCount >= 3 ? 'text-emerald-600 fill-emerald-500' : 'text-emerald-500/60'}`} />
            </div>

            {/* Views & Likes Pill Badges */}
            <div dir="ltr" className="flex items-center justify-between gap-2">
              <div className="px-3 py-1 rounded-full bg-[#edf6fc] dark:bg-sky-950/50 border border-sky-200/60 dark:border-sky-900 text-[#0c568c] dark:text-sky-200 text-xs font-bold font-mono-tabular flex items-center gap-1.5 shadow-2xs">
                <Eye className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>{formatCompactMetric(viewsCount)}</span>
              </div>

              <div
                title="إجمالي اللايكات"
                className="px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200/70 dark:border-rose-900 text-rose-700 dark:text-rose-200 text-xs font-bold font-mono-tabular flex items-center gap-1.5 shadow-2xs"
              >
                <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-500 dark:text-rose-400" />
                <span>{formatCompactMetric(totalLikesCount)} لايك</span>
              </div>
            </div>

            {/* Country Flag & Country Name */}
            <div dir="ltr" className="flex items-center gap-2 text-sm font-bold text-stone-800 dark:text-stone-200 px-1">
              <span className="text-xl leading-none" aria-hidden="true">
                {getCountryFlag(target.country)}
              </span>
              <span>{target.country}</span>
            </div>

            {/* Centered Bio / Status */}
            <div className="py-1.5 px-2 text-center space-y-1">
              <p className="text-sm font-medium text-stone-800 dark:text-stone-200 leading-relaxed">
                {target.bio || target.statusText || 'أهلاً بكم في ملفي الشخصي'}
              </p>
              {target.statusText && target.bio && (
                <p
                  className="text-xs font-semibold"
                  style={target.statusColor ? { color: target.statusColor } : undefined}
                >
                  {target.statusText}
                </p>
              )}
            </div>

            {target.pmDisabled && !isSelf && (
              <div className="text-center text-xs text-amber-700 dark:text-amber-400 font-semibold">
                قام هذا العضو بتعطيل المحادثات الخاصة.
              </div>
            )}

            {target.isMuted && (
              <div className="text-center text-xs text-red-600 dark:text-red-400 font-semibold">
                هذا المستخدم مكتوم حالياً من الكتابة في العام.
              </div>
            )}

            {/* Social Links (if added) */}
            {target.socialLinks &&
              Object.values(target.socialLinks).some((v) => Boolean(v && v.trim())) && (
                <div className="p-2.5 rounded-xs bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 space-y-1 text-xs">
                  <div className="font-bold text-[var(--ych-primary)] dark:text-amber-300">روابط العضو</div>
                  {target.socialLinks.instagram && (
                    <div className="truncate">إنستغرام: {target.socialLinks.instagram}</div>
                  )}
                  {target.socialLinks.tiktok && (
                    <div className="truncate">تيك توك: {target.socialLinks.tiktok}</div>
                  )}
                  {target.socialLinks.snapchat && (
                    <div className="truncate">سناب شات: {target.socialLinks.snapchat}</div>
                  )}
                  {target.socialLinks.youtube && (
                    <div className="truncate">يوتيوب: {target.socialLinks.youtube}</div>
                  )}
                  {target.socialLinks.website && (
                    <div className="truncate">رابط: {target.socialLinks.website}</div>
                  )}
                </div>
              )}

            {/* Action Grid matching IMG_3478 */}
            {!isSelf ? (
              <div className="bg-stone-100/90 dark:bg-zinc-950/70 p-2 rounded-sm border border-stone-200/80 dark:border-zinc-800 space-y-1.5">
                {/* Row 1: تحدي X-O & تحدي Ludo */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onChallengeGame(target.id, 'xo');
                      onClose();
                    }}
                    className="h-11 sm:h-10 px-2 rounded-sm border border-stone-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-transform"
                  >
                    <Grid3X3 className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>تحدي X-O</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onChallengeGame(target.id, 'ludo');
                      onClose();
                    }}
                    className="h-11 sm:h-10 px-2 rounded-sm border border-stone-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-transform"
                  >
                    <Dices className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>تحدي Ludo</span>
                  </button>
                </div>

                {/* Row 2: محادثه خاصه | تنبيه | ❤️ Likes */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onStartPm(target);
                      onClose();
                    }}
                    className="h-11 sm:h-10 px-1.5 rounded-sm border border-stone-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-900 dark:text-stone-100 text-xs font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-transform"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-current shrink-0" />
                    <span className="truncate">محادثه خاصه</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAlertBox((v) => !v);
                      setShowGiftBox(false);
                    }}
                    className={`h-11 sm:h-10 px-1.5 rounded-sm border text-xs font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all ${
                      showAlertBox
                        ? 'border-[var(--ych-primary)] bg-[var(--ych-primary)] text-white'
                        : 'border-stone-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-900 dark:text-stone-100'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>{alertSent ? 'تم التنبيه ✓' : 'تنبيه'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleLike(target.id)}
                    aria-pressed={isLikedByMe}
                    title={isLikedByMe ? 'إلغاء الإعجاب' : 'إعجاب بالملف الشخصي (+1 لايك)'}
                    className={`h-11 sm:h-10 px-1.5 rounded-sm border text-xs font-bold font-mono-tabular flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-transform active:scale-95 ${
                      isLikedByMe
                        ? 'border-red-300 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'
                        : 'border-stone-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-red-50/60 text-red-600 dark:text-red-400'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isLikedByMe
                          ? 'fill-red-500 text-red-500 scale-110'
                          : 'fill-red-500 text-red-500'
                      }`}
                    />
                    <span>{formatCompactMetric(totalLikesCount)}</span>
                  </button>
                </div>

                {/* Inline Custom Alert Box */}
                {showAlertBox && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleDispatchAlert();
                    }}
                    className="p-2.5 rounded-sm bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 shadow-xs space-y-2"
                  >
                    <div className="flex flex-wrap gap-1">
                      {['مرحباً بك!', 'تعال خاص', 'رد بالعام', 'نورت الشات'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleDispatchAlert(preset)}
                          className="px-2 py-0.5 rounded-xs bg-stone-50 dark:bg-zinc-950 border border-stone-300 dark:border-zinc-700 hover:bg-[var(--ych-primary)] hover:text-white text-[11px] font-bold cursor-pointer shadow-2xs transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        maxLength={120}
                        value={alertMessage}
                        onChange={(e) => setAlertMessage(e.target.value)}
                        placeholder="رسالة التنبيه (اختياري)..."
                        className="flex-1 min-w-0 h-9 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--ych-primary)]"
                      />
                      <button
                        type="submit"
                        className="h-9 px-3 rounded-xs bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>إرسال</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Row 3: تجاهل + هدية */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onToggleIgnore(target.id);
                      onClose();
                    }}
                    className={`h-11 sm:h-10 px-3 rounded-sm border text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-transform ${
                      isIgnored
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-stone-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-red-50/60 text-red-600 dark:text-red-400'
                    }`}
                  >
                    <Ban className="w-4 h-4 shrink-0" />
                    <span>{isIgnored ? 'إلغاء التجاهل' : 'تجاهل'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={siteSettings?.allowGifts === false && !isAdmin}
                    onClick={() => {
                      setShowGiftBox((v) => !v);
                      setShowAlertBox(false);
                    }}
                    className={`h-11 sm:h-10 px-3 rounded-sm border text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
                      showGiftBox
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-stone-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-amber-50 dark:hover:bg-zinc-800 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    <Gift className="w-4 h-4 shrink-0" />
                    <span>{sentGiftLabel ? `تم إهداء ${sentGiftLabel} ✓` : 'هدية'}</span>
                  </button>
                </div>

                {/* Gift Selector Panel (triggered by Gift button) */}
                {showGiftBox && (siteSettings?.allowGifts !== false || isAdmin) && (() => {
                  const catalog =
                    siteSettings?.customGifts && siteSettings.customGifts.length > 0
                      ? siteSettings.customGifts
                      : DEFAULT_GIFTS;
                  const activeGifts = catalog.filter((g) => g.enabled !== false);
                  if (activeGifts.length === 0) return null;
                  return (
                    <div className="p-2.5 rounded-sm bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/60 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-[var(--ych-primary)] dark:text-amber-300 flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5" />
                          <span>اختر هدية لتظهر أيقونتها بجانب اسم العضو</span>
                        </span>
                        <span className="font-mono-tabular font-semibold text-stone-600 dark:text-stone-300 shrink-0">
                          {sentGiftLabel ? (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              تم إرسال {sentGiftLabel} ✓
                            </span>
                          ) : (
                            `رصيدك: ${formatCompactMetric(selfLikes)} لايك`
                          )}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1 max-h-44 overflow-y-auto chat-scroll">
                        {activeGifts.map((gift) => {
                          const canAfford = isAdmin || selfLikes >= gift.cost;
                          return (
                            <button
                              key={gift.id}
                              type="button"
                              disabled={!canAfford}
                              onClick={() => {
                                onSendGift(target.id, gift.id);
                                setSentGiftLabel(gift.label);
                                window.setTimeout(() => setSentGiftLabel(null), 2200);
                              }}
                              title={
                                canAfford
                                  ? `إرسال ${gift.label} (${gift.cost} لايك)`
                                  : `تحتاج ${gift.cost} لايك`
                              }
                              className="py-1.5 px-1 rounded-xs border border-stone-200 dark:border-zinc-700 bg-stone-50/70 dark:bg-zinc-950 hover:bg-amber-50 dark:hover:bg-zinc-800 disabled:opacity-45 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors"
                            >
                              {gift.imageUrl ? (
                                <img
                                  src={gift.imageUrl}
                                  alt={gift.label}
                                  referrerPolicy="no-referrer"
                                  className="w-9 h-9 object-contain"
                                />
                              ) : (
                                <span className="text-2xl leading-none">{gift.emoji || '🎁'}</span>
                              )}
                              <span className="text-[10px] font-bold text-stone-800 dark:text-stone-200 truncate max-w-full">
                                {gift.label}
                              </span>
                              <span className="text-[10px] font-mono-tabular text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                                <span>{gift.cost}</span>
                                <Heart className="w-2.5 h-2.5 fill-current" />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {(target.giftIcon || target.giftImageUrl) &&
                        onClearGiftIcon &&
                        (isAdmin || canManageAccounts || canMuteUsers) && (
                          <button
                            type="button"
                            onClick={() => {
                              onClearGiftIcon(target.id);
                              showModToast('تمت إزالة أيقونة الهدية من جانب الاسم');
                            }}
                            className="w-full h-8 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 text-[11px] font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>إزالة أيقونة الهدية الحالية</span>
                          </button>
                        )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-stone-100/90 dark:bg-zinc-950/70 p-2.5 rounded-sm border border-stone-200/80 dark:border-zinc-800 flex items-center justify-between gap-2 text-xs">
                <span className="text-stone-600 dark:text-stone-400 font-medium">
                  هذا ملفك الشخصي كما يظهر للآخرين
                </span>
                <span className="px-2.5 py-1 rounded-sm bg-white dark:bg-zinc-900 border border-red-200 dark:border-zinc-700 text-red-600 dark:text-red-400 font-bold font-mono-tabular flex items-center gap-1 shadow-2xs shrink-0">
                  <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                  <span>{formatCompactMetric(totalLikesCount)} لايك</span>
                </span>
              </div>
            )}

            {/* Admin / Moderator Tools */}
            {canModerate && (
              <div className="pt-3 border-t border-stone-200 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[var(--ych-primary)] dark:text-amber-400 shrink-0" />
                    <span>أدوات الإدارة والإشراف</span>
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                    <span>{currentTargetRoomName}</span>
                    {targetMicSlot && (
                      <>
                        <span className="mx-1">·</span>
                        <span>مايك #{targetMicSlot.slotIndex + 1}</span>
                      </>
                    )}
                  </div>
                </div>

                {modFeedback && (
                  <div className="px-2.5 py-1.5 rounded-sm bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{modFeedback}</span>
                  </div>
                )}

                <div className="bg-stone-100/90 dark:bg-zinc-950/70 p-2 rounded-sm border border-stone-200/80 dark:border-zinc-800 space-y-2">
                  {/* Demo Member Talk & Control Mode (Admin Only) */}
                  {isAdmin && target.id.startsWith('demo-member-test') && onSetDemoTalkControl && (
                    <div
                      className={`p-2.5 rounded-sm border space-y-2 shadow-2xs ${
                        target.demoTalkControlEnabled
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-800'
                          : 'bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                          <span>وضع التحدث والتحكم</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-xs ${
                            target.demoTalkControlEnabled
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-200 dark:bg-zinc-800 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {target.demoTalkControlEnabled ? 'مفعّل ✓' : 'معطّل (صامت)'}
                        </span>
                      </div>

                      <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
                        {target.demoTalkControlEnabled
                          ? 'وضع التحدث والتحكم مفعّل الآن؛ يمكنك توجيه العضو التجريبي أو التحدث باسمه أو إصعاده للمايك.'
                          : 'العضو التجريبي صامت تماماً حالياً ولا يتحدث أو ينفذ أي شيء حتى تفعّل له وضع التحدث والتحكم.'}
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          const nextEnabled = !target.demoTalkControlEnabled;
                          onSetDemoTalkControl(target.id, nextEnabled);
                          showModToast(
                            nextEnabled
                              ? 'تم تفعيل وضع التحدث والتحكم للعضو التجريبي'
                              : 'تم إيقاف وضع التحدث والتحكم (إسكات تام)'
                          );
                        }}
                        className={`w-full h-9 px-3 rounded-xs text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                          target.demoTalkControlEnabled
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-teal-700 hover:bg-teal-800 text-white'
                        }`}
                      >
                        {target.demoTalkControlEnabled ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 shrink-0" />
                            <span>إيقاف وضع التحدث والتحكم (إسكات)</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 shrink-0" />
                            <span>تفعيل وضع التحدث والتحكم</span>
                          </>
                        )}
                      </button>

                      {target.demoTalkControlEnabled && onDemoDirectAction && (
                        <div className="pt-2 border-t border-emerald-200 dark:border-emerald-900/60 space-y-2">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const trimmed = demoSayText.trim();
                              if (!trimmed) return;
                              onDemoDirectAction(target.id, 'sayRoom', { text: trimmed });
                              setDemoSayText('');
                              showModToast('تم إرسال الرسالة باسم العضو التجريبي');
                            }}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="text"
                              maxLength={400}
                              value={demoSayText}
                              onChange={(e) => setDemoSayText(e.target.value)}
                              placeholder="اجعله يكتب في الغرفة..."
                              aria-label="رسالة باسم العضو التجريبي"
                              className="flex-1 min-w-0 h-8 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-stone-900 dark:text-stone-100"
                            />
                            <button
                              type="submit"
                              disabled={!demoSayText.trim()}
                              className="h-8 px-2.5 rounded-xs bg-teal-700 hover:bg-teal-800 disabled:opacity-45 text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>إرسال</span>
                            </button>
                          </form>

                          <div className="flex items-center gap-1.5">
                            {targetMicSlot ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onDemoDirectAction(target.id, 'micLeave');
                                  showModToast('تم إنزال العضو التجريبي من المايك');
                                }}
                                className="flex-1 h-8 px-2.5 rounded-xs border border-orange-300 dark:border-orange-800 bg-white dark:bg-zinc-900 text-orange-800 dark:text-orange-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <MicOff className="w-3.5 h-3.5" />
                                <span>إنزال من المايك</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onDemoDirectAction(target.id, 'micJoin');
                                  showModToast('تم إصعاد العضو التجريبي للمايك العام');
                                }}
                                className="flex-1 h-8 px-2.5 rounded-xs border border-teal-400 dark:border-teal-800 bg-white dark:bg-zinc-900 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Mic className="w-3.5 h-3.5" />
                                <span>إصعاد للمايك العام</span>
                              </button>
                            )}
                          </div>

                          {targetMicSlot && (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                onDemoDirectAction(target.id, 'micSpeak', {
                                  text: demoMicText.trim() || undefined,
                                });
                                setDemoMicText('');
                                showModToast('يتحدث العضو التجريبي على المايك الآن');
                              }}
                              className="flex items-center gap-1.5"
                            >
                              <input
                                type="text"
                                maxLength={280}
                                value={demoMicText}
                                onChange={(e) => setDemoMicText(e.target.value)}
                                placeholder="كلام على المايك (أو اتركه للتلقائي)..."
                                aria-label="كلام العضو التجريبي على المايك"
                                className="flex-1 min-w-0 h-8 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-stone-900 dark:text-stone-100"
                              />
                              <button
                                type="submit"
                                className="h-8 px-2.5 rounded-xs bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                              >
                                <Mic className="w-3 h-3" />
                                <span>تكلم</span>
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reveal Nicks & IP (Admin / Panel Staff) */}
                  {canRevealNicks && onRevealUserNicks && (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const nextOpen = !showNickReveal;
                          setShowNickReveal(nextOpen);
                          if (nextOpen) {
                            onRevealUserNicks(target.id);
                          }
                        }}
                        className={`w-full h-10 px-3 rounded-sm border text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors ${
                          showNickReveal
                            ? 'border-indigo-700 bg-indigo-700 text-white'
                            : 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-950/60'
                        }`}
                      >
                        <Radar className="w-4 h-4 shrink-0" />
                        <span>كشف النكات والآيبي (IP)</span>
                      </button>

                      {showNickReveal && (
                        <div className="p-2.5 rounded-sm bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-900/70 space-y-2 shadow-2xs text-xs">
                          {!nickRevealResult || nickRevealResult.targetUserId !== target.id ? (
                            <div className="text-[11px] text-stone-500 dark:text-stone-400 text-center py-2">
                              جاري كشف النكات والآيبي...
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-stone-100 dark:border-zinc-800">
                                <div className="min-w-0">
                                  <div className="text-[10px] text-stone-400">الاسم الحالي والنوع</div>
                                  <div className="font-bold text-stone-900 dark:text-stone-100 truncate">
                                    {nickRevealResult.username}{' '}
                                    <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400">
                                      ({nickRevealResult.isGuest ? 'زائر' : 'عضو مسجل'} · {getRoleLabel(nickRevealResult.role)})
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
                                  {nickRevealResult.linkedNicks.length} نك مسجل
                                </span>
                              </div>

                              <div className="grid grid-cols-1 gap-1.5 bg-stone-50 dark:bg-zinc-950 p-2 rounded-xs border border-stone-200/80 dark:border-zinc-800">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1">
                                    <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                    <span>الآيبي (IP):</span>
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span dir="ltr" className="font-mono-tabular text-[11px] font-bold text-stone-900 dark:text-stone-100">
                                      {nickRevealResult.ip}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard?.writeText(nickRevealResult.ip);
                                        setCopiedIp(true);
                                        window.setTimeout(() => setCopiedIp(false), 1800);
                                      }}
                                      title="نسخ الآيبي"
                                      className="p-1 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-600 dark:text-stone-300 hover:bg-stone-100 cursor-pointer"
                                    >
                                      {copiedIp ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1">
                                    <Laptop className="w-3.5 h-3.5 text-stone-500" />
                                    <span>الجهاز:</span>
                                  </span>
                                  <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate">
                                    {nickRevealResult.deviceSummary}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                                  النكات المرتبطة بنفس الآيبي:
                                </div>
                                {nickRevealResult.linkedNicks.length === 0 ? (
                                  <div className="text-[11px] text-stone-400 py-1">
                                    لا توجد نكات سابقة أخرى مسجلة لهذا الآيبي بعد.
                                  </div>
                                ) : (
                                  <div className="max-h-36 overflow-y-auto space-y-1 chat-scroll">
                                    {nickRevealResult.linkedNicks.map((item) => (
                                      <div
                                        key={item.id}
                                        className="flex items-center justify-between gap-2 px-2 py-1 rounded-xs bg-stone-50 dark:bg-zinc-950 border border-stone-200/70 dark:border-zinc-800"
                                      >
                                        <div className="min-w-0 flex items-center gap-1.5">
                                          <span
                                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                              item.isOnline ? 'bg-emerald-500' : 'bg-stone-400'
                                            }`}
                                          />
                                          <span
                                            className="font-bold text-[11px] truncate"
                                            style={{ color: item.nameColor }}
                                          >
                                            {item.username}
                                          </span>
                                          <span className="text-[10px] text-stone-400 shrink-0">
                                            ({item.isGuest ? 'زائر' : getRoleLabel(item.role)})
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-stone-400 shrink-0 font-mono-tabular">
                                          {formatRelativeDate(item.lastSeenAt)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Primary Actions: Mute, Kick, Ban */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {canMuteUsers && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAction = target.isMuted ? 'unmute' : 'mute';
                          onModAction(target.id, nextAction);
                          showModToast(
                            nextAction === 'mute' ? 'تم كتم العضو من الكتابة' : 'تم فك الكتم عن العضو'
                          );
                        }}
                        className={`h-10 px-2.5 rounded-sm border text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors ${
                          target.isMuted
                            ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                            : 'border-amber-300 bg-white dark:bg-zinc-900 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        }`}
                      >
                        {target.isMuted ? (
                          <Volume2 className="w-4 h-4 shrink-0" />
                        ) : (
                          <VolumeX className="w-4 h-4 shrink-0" />
                        )}
                        <span>{target.isMuted ? 'فك الكتم' : 'كتم العضو'}</span>
                      </button>
                    )}

                    {canKickUsers && (
                      <button
                        type="button"
                        onClick={() => {
                          onModAction(target.id, 'kick');
                          onClose();
                        }}
                        className="h-10 px-2.5 rounded-sm border border-rose-300 dark:border-rose-900 bg-white dark:bg-zinc-900 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <UserMinus className="w-4 h-4 shrink-0" />
                        <span>طرد من الغرفة</span>
                      </button>
                    )}

                    {canBanUsers && onBanUser && (
                      <button
                        type="button"
                        onClick={() => setShowBanBox((v) => !v)}
                        className={`h-10 px-2.5 rounded-sm border text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors ${
                          !canMuteUsers || !canKickUsers ? '' : 'col-span-2'
                        } ${
                          showBanBox
                            ? 'border-red-700 bg-red-600 text-white'
                            : 'border-red-300 dark:border-red-900 bg-white dark:bg-zinc-900 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40'
                        }`}
                      >
                        <Ban className="w-4 h-4 shrink-0" />
                        <span>حظر نهائي من الدردشة</span>
                      </button>
                    )}
                  </div>

                  {/* Direct Admin Photo Removal & Rename Controls */}
                  {canManageAccounts && onEditUser && (
                    <div className="p-2 rounded-sm bg-white dark:bg-zinc-900 border border-stone-200/90 dark:border-zinc-800 space-y-2 shadow-2xs">
                      <div className="text-[11px] font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1">
                        <Pencil className="w-3.5 h-3.5 text-[var(--ych-primary)] dark:text-amber-400" />
                        <span>تغيير اسم العضو وحذف صورته</span>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const trimmed = editUsername.trim();
                          if (trimmed.length < 2) return;
                          onEditUser(target.id, { username: trimmed });
                          showModToast(`تم تغيير اسم العضو إلى "${trimmed}"`);
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          type="text"
                          maxLength={28}
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          placeholder="اكتب الاسم الجديد..."
                          aria-label="الاسم الجديد للعضو"
                          className="flex-1 min-w-0 h-9 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[var(--ych-primary)]"
                        />
                        <button
                          type="submit"
                          disabled={
                            editUsername.trim().length < 2 ||
                            editUsername.trim() === target.username
                          }
                          className="h-9 px-3 rounded-xs bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold shrink-0 cursor-pointer"
                        >
                          تغيير الاسم
                        </button>
                      </form>

                      <div className={`grid gap-1.5 ${target.coverUrl ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <button
                          type="button"
                          disabled={target.avatarUrl === 'none'}
                          onClick={() => {
                            onEditUser(target.id, { removeAvatar: true });
                            showModToast('تم حذف صورة العضو');
                          }}
                          className="h-9 px-2.5 rounded-xs border border-rose-300 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 disabled:opacity-50 disabled:cursor-not-allowed text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <ImageOff className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {target.avatarUrl === 'none'
                              ? 'تم حذف الصورة الشخصية'
                              : 'حذف صورة العضو'}
                          </span>
                        </button>

                        {target.coverUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              onEditUser(target.id, { removeCover: true });
                              showModToast('تم حذف صورة غلاف العضو');
                            }}
                            className="h-9 px-2.5 rounded-xs border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            <span>حذف صورة الغلاف</span>
                          </button>
                        )}
                      </div>

                      {(isAdmin || !target.id.startsWith('demo-member-test')) && (
                        <div className="pt-1 space-y-1">
                          <div className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                            تحديد نوع الجنس {target.id.startsWith('demo-member-test') ? '(وصوت المايك)' : ''}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (target.gender === 'male') return;
                                onEditUser(target.id, { gender: 'male' });
                                showModToast('تم تعيين الجنس: ذكر (صوت رجل)');
                              }}
                              className={`h-8 px-2 rounded-xs border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                                target.gender === 'male'
                                  ? 'border-sky-600 bg-sky-600 text-white'
                                  : 'border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-stone-700 dark:text-stone-200 hover:bg-sky-50 dark:hover:bg-sky-950/30'
                              }`}
                            >
                              <span>ذكر (شاب)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (target.gender === 'female') return;
                                onEditUser(target.id, { gender: 'female' });
                                showModToast('تم تعيين الجنس: أنثى (صوت فتاة)');
                              }}
                              className={`h-8 px-2 rounded-xs border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                                target.gender === 'female'
                                  ? 'border-rose-600 bg-rose-600 text-white'
                                  : 'border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-stone-700 dark:text-stone-200 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                              }`}
                            >
                              <span>أنثى (فتاة)</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {onSetRoyalEntry && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextEnabled = !target.royalEntry;
                            onSetRoyalEntry(target.id, nextEnabled, target.royalEntryText, nextEnabled);
                            showModToast(
                              nextEnabled
                                ? 'تم منح العضو ميزة الدخول الملكي وإعلان دخوله'
                                : 'تم سحب ميزة الدخول الملكي من العضو'
                            );
                          }}
                          className={`w-full h-9 px-2.5 rounded-xs border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                            target.royalEntry
                              ? 'border-amber-500 bg-gradient-to-l from-amber-500 to-yellow-400 text-amber-950 hover:brightness-95'
                              : 'border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/50'
                          }`}
                        >
                          <Crown className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {target.royalEntry
                              ? 'سحب الدخول الملكي الحالي 👑'
                              : 'منح دخول ملكي للعضو 👑'}
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Inline Ban Reason Box */}
                  {canBanUsers && onBanUser && showBanBox && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        onBanUser(
                          target.username,
                          banReason.trim() || 'مخالفة قوانين الدردشة',
                          target.id
                        );
                        onClose();
                      }}
                      className="p-2.5 rounded-sm bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/70 space-y-2 shadow-2xs"
                    >
                      <div className="text-[11px] font-bold text-red-700 dark:text-red-300">
                        تحديد سبب الحظر لـ {target.username}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['مخالفة القوانين', 'إزعاج الأعضاء', 'نشر روابط', 'ألفاظ غير لائقة'].map(
                          (reasonPreset) => (
                            <button
                              key={reasonPreset}
                              type="button"
                              onClick={() => setBanReason(reasonPreset)}
                              className={`px-2 py-1 rounded-xs border text-[11px] font-bold cursor-pointer transition-colors ${
                                banReason === reasonPreset
                                  ? 'bg-red-600 border-red-600 text-white'
                                  : 'bg-stone-50 dark:bg-zinc-950 border-stone-300 dark:border-zinc-700 text-stone-700 dark:text-stone-300 hover:border-red-300'
                              }`}
                            >
                              {reasonPreset}
                            </button>
                          )
                        )}
                      </div>
                      <input
                        type="text"
                        maxLength={120}
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="سبب الحظر (اختياري)..."
                        className="w-full h-9 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="submit"
                          className="flex-1 h-9 rounded-xs bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                        >
                          تأكيد الحظر
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowBanBox(false)}
                          className="h-9 px-3 rounded-xs border border-stone-300 dark:border-zinc-700 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Mic Moderation (if target is currently on a mic slot) */}
                  {canManageMics && onMicModAction && targetMicSlot && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const nextMicAction = targetMicSlot.isMuted ? 'unmute' : 'mute';
                          onMicModAction(targetMicSlot.slotIndex, nextMicAction);
                          showModToast(
                            nextMicAction === 'mute' ? 'تم كتم المايك للعضو' : 'تم فتح المايك للعضو'
                          );
                        }}
                        className="h-10 px-2.5 rounded-sm border border-sky-300 dark:border-sky-800 bg-white dark:bg-zinc-900 text-sky-800 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        {targetMicSlot.isMuted ? (
                          <Mic className="w-4 h-4 shrink-0" />
                        ) : (
                          <MicOff className="w-4 h-4 shrink-0" />
                        )}
                        <span>{targetMicSlot.isMuted ? 'فتح المايك' : 'كتم المايك'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onMicModAction(targetMicSlot.slotIndex, 'kick');
                          showModToast('تم إنزال العضو من المايك');
                        }}
                        className="h-10 px-2.5 rounded-sm border border-orange-300 dark:border-orange-800 bg-white dark:bg-zinc-900 text-orange-800 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <MicOff className="w-4 h-4 shrink-0" />
                        <span>إنزال من المايك</span>
                      </button>
                    </div>
                  )}

                  {/* Move User to Another Room */}
                  {canMoveUsers && onMoveUserRoom && rooms.length > 0 && (
                    <div className="p-2 rounded-sm bg-white dark:bg-zinc-900 border border-stone-200/90 dark:border-zinc-800 space-y-1.5 shadow-2xs">
                      <div className="text-[11px] font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-[var(--ych-primary)] dark:text-amber-400" />
                        <span>نقل العضو إلى غرفة أخرى</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={moveRoomId}
                          onChange={(e) => setMoveRoomId(e.target.value)}
                          aria-label="اختيار الغرفة للنقل"
                          className="flex-1 min-w-0 h-10 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs font-semibold text-stone-800 dark:text-stone-100"
                        >
                          {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                              {r.id === effectiveTargetRoomId ? ' (الحالية)' : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!moveRoomId || moveRoomId === effectiveTargetRoomId}
                          onClick={() => {
                            if (!moveRoomId) return;
                            const targetRoomName =
                              rooms.find((r) => r.id === moveRoomId)?.name || moveRoomId;
                            onMoveUserRoom(target.id, moveRoomId);
                            showModToast(`تم نقل العضو إلى ${targetRoomName}`);
                          }}
                          className="h-10 px-3.5 rounded-xs bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>نقل</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Change Member Role */}
                  {canManageAccounts && !target.isGuest && (
                    <div className="p-2 rounded-sm bg-white dark:bg-zinc-900 border border-stone-200/90 dark:border-zinc-800 space-y-1.5 shadow-2xs">
                      <div className="text-[11px] font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>تغيير الرتبة</span>
                      </div>
                      {onSetRole ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={roleDraft}
                            onChange={(e) => setRoleDraft(e.target.value as UserRole)}
                            aria-label="تغيير رتبة العضو"
                            className="flex-1 min-w-0 h-10 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs font-semibold text-stone-800 dark:text-stone-100"
                          >
                            <option value="member">عضو مسجل</option>
                            <option value="vip">عضو مميز VIP</option>
                            <option value="moderator">مشرف</option>
                            {isAdmin && <option value="admin">إدارة عليا</option>}
                          </select>
                          <button
                            type="button"
                            disabled={roleDraft === target.role}
                            onClick={() => {
                              onSetRole(target.id, roleDraft);
                              showModToast(`تم تغيير الرتبة إلى ${getRoleLabel(roleDraft)}`);
                            }}
                            className="h-10 px-3.5 rounded-xs bg-teal-700 hover:bg-teal-800 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold shrink-0 cursor-pointer"
                          >
                            حفظ
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const act = target.role === 'moderator' ? 'demote' : 'promote';
                            onModAction(target.id, act);
                            showModToast(
                              act === 'promote' ? 'تمت الترقية إلى مشرف' : 'تم إلغاء الإشراف'
                            );
                          }}
                          className="w-full h-10 px-3 rounded-xs border border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Award className="w-4 h-4" />
                          <span>{target.role === 'moderator' ? 'إلغاء الإشراف' : 'ترقية إلى مشرف'}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Advanced Account Management: Likes, Name/Color, Delete */}
                  {canManageAccounts && (onSetUserLikes || onEditUser || (onDeleteAccount && !target.isGuest)) && (
                    <div className="rounded-sm bg-white dark:bg-zinc-900 border border-stone-200/90 dark:border-zinc-800 overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setShowAdvancedMod((v) => !v)}
                        className="w-full h-10 px-2.5 flex items-center justify-between text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-zinc-800/60 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>إدارة اللايكات والبيانات والحساب</span>
                        </span>
                        {showAdvancedMod ? (
                          <ChevronUp className="w-4 h-4 text-stone-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-stone-400" />
                        )}
                      </button>

                      {showAdvancedMod && (
                        <div className="p-2.5 pt-2 border-t border-stone-200 dark:border-zinc-800 space-y-3">
                          {/* Likes Editor */}
                          {onSetUserLikes && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1">
                                  <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-500" />
                                  <span>لايكات العضو (الحالية: {formatCompactMetric(totalLikesCount)})</span>
                                </span>
                                <div className="flex items-center gap-1">
                                  {[50, 100, -50].map((delta) => (
                                    <button
                                      key={delta}
                                      type="button"
                                      onClick={() => {
                                        const nextVal = Math.max(0, totalLikesCount + delta);
                                        setLikesDraft(String(nextVal));
                                        onSetUserLikes(target.id, nextVal);
                                        showModToast(`تم تحديث اللايكات إلى ${nextVal}`);
                                      }}
                                      className="px-1.5 py-0.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-[10px] font-mono-tabular font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                    >
                                      {delta > 0 ? `+${delta}` : delta}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={1000000}
                                  value={likesDraft}
                                  onChange={(e) => setLikesDraft(e.target.value)}
                                  className="flex-1 min-w-0 h-9 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs font-mono-tabular"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const num = Math.max(
                                      0,
                                      Math.min(1_000_000, Math.round(Number(likesDraft) || 0))
                                    );
                                    onSetUserLikes(target.id, num);
                                    showModToast(`تم ضبط اللايكات إلى ${num}`);
                                  }}
                                  className="h-9 px-3 rounded-xs bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shrink-0 cursor-pointer"
                                >
                                  حفظ اللايكات
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Name & Name Color Editor */}
                          {onEditUser && (
                            <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-zinc-800">
                              <div className="text-[11px] font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1">
                                <Palette className="w-3.5 h-3.5 text-sky-600" />
                                <span>تعديل الاسم واللون</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  maxLength={28}
                                  value={editUsername}
                                  onChange={(e) => setEditUsername(e.target.value)}
                                  placeholder="اسم العضو..."
                                  className="flex-1 min-w-0 h-9 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs font-bold"
                                  style={{ color: editNameColor }}
                                />
                                <input
                                  type="color"
                                  value={editNameColor}
                                  onChange={(e) => setEditNameColor(e.target.value)}
                                  aria-label="لون اسم العضو"
                                  className="w-9 h-9 rounded-xs border border-stone-300 dark:border-zinc-700 bg-transparent cursor-pointer shrink-0"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {NAME_COLORS.slice(0, 8).map((c) => (
                                    <button
                                      key={c.value}
                                      type="button"
                                      onClick={() => setEditNameColor(c.value)}
                                      aria-label={`اختيار لون ${c.label}`}
                                      title={c.label}
                                      className={`w-5 h-5 rounded-full border cursor-pointer ${
                                        editNameColor.toLowerCase() === c.value.toLowerCase()
                                          ? 'ring-2 ring-offset-1 ring-stone-700 dark:ring-white border-white'
                                          : 'border-stone-300 dark:border-zinc-700'
                                      }`}
                                      style={{ backgroundColor: c.value }}
                                    />
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  disabled={editUsername.trim().length < 2}
                                  onClick={() => {
                                    onEditUser(target.id, {
                                      username: editUsername.trim(),
                                      nameColor: editNameColor,
                                    });
                                    showModToast('تم حفظ تعديل الاسم واللون');
                                  }}
                                  className="h-9 px-3 rounded-xs bg-stone-800 dark:bg-zinc-700 hover:bg-stone-900 text-white text-xs font-bold shrink-0 cursor-pointer disabled:opacity-45"
                                >
                                  حفظ البيانات
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Delete Registered Account */}
                          {onDeleteAccount && !target.isGuest && (
                            <div className="pt-2 border-t border-stone-100 dark:border-zinc-800">
                              {!confirmDeleteAccount ? (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteAccount(true)}
                                  className="w-full h-9 px-3 rounded-xs border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>حذف حساب العضو نهائياً</span>
                                </button>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteAccount(target.id);
                                      onClose();
                                    }}
                                    className="flex-1 h-9 px-2.5 rounded-xs bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                                  >
                                    تأكيد الحذف النهائي
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteAccount(false)}
                                    className="h-9 px-3 rounded-xs border border-stone-300 dark:border-zinc-700 text-xs font-bold text-stone-600 dark:text-stone-300 cursor-pointer"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ImageLightboxModal image={zoomedImage} onClose={() => setZoomedImage(null)} />
    </div>
  );
};
