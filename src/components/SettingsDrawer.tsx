import React, { useEffect, useState } from 'react';
import {
  X,
  Edit,
  ChevronsUpDown,
  UserX,
  Trophy,
  MessageCircle,
  KeyRound,
  Moon,
  Sun,
  Shield,
  LogOut,
  Check,
  Sparkles,
  EyeOff,
  Eye,
  Edit3,
  Bell,
  Palette,
  Eraser,
  Ghost,
  Smile,
} from 'lucide-react';
import type { ChatUser, Room, UserGender, UserSocialLinks, YouCamStyleId } from '../types/chat';
import {
  STATUS_ICON_PRESETS,
  YOUCAM_STYLES,
  formatStatusIcon,
  getStatusIconLabel,
} from '../utils/chatHelpers';
import { UserAvatar } from './UserAvatar';

export type ChatFontScale = 85 | 100 | 115 | 130 | 150;
export type VoiceServerOption = 'primary' | 'fast' | 'backup';

const NAME_DECORATION_WRAPS: { label: string; prefix: string; suffix: string }[] = [
  { label: '꧁ ꧂', prefix: '꧁', suffix: '꧂' },
  { label: '★ ★', prefix: '★ ', suffix: ' ★' },
  { label: '♛ ♛', prefix: '♛ ', suffix: ' ♛' },
  { label: '✿ ✿', prefix: '✿ ', suffix: ' ✿' },
  { label: '❖ ❖', prefix: '❖ ', suffix: ' ❖' },
];

interface SettingsDrawerProps {
  self: ChatUser;
  currentRoom?: Room;
  canEditTopic: boolean;
  isDark: boolean;
  soundEnabled: boolean;
  fontScale: ChatFontScale;
  voiceServer: VoiceServerOption;
  selectedStyle: YouCamStyleId;
  styleLocked?: boolean;
  hideJoinNotices: boolean;
  unreadNotificationsCount: number;
  passwordFeedback: { ok: boolean; message: string } | null;
  onClose: () => void;
  onSaveProfile: (payload: {
    username?: string;
    nameColor: string;
    textColor?: string;
    bgColor?: string;
    statusColor?: string;
    statusIcon?: string;
    pmDisabled?: boolean;
    socialLinks?: UserSocialLinks;
    statusText: string;
    bio: string;
    avatarSymbol: string;
    avatarUrl: string;
    gender: UserGender;
  }) => void;
  onChangeFontScale: (scale: ChatFontScale) => void;
  onChangeVoiceServer: (srv: VoiceServerOption) => void;
  onChangeStyle: (style: YouCamStyleId) => void;
  onClearLocalScreen: () => void;
  onOpenAvatarModal: () => void;
  onOpenNotifications: () => void;
  onToggleSound: () => void;
  onToggleTheme: () => void;
  onToggleHideJoinNotices: () => void;
  onOpenGames: () => void;
  onOpenAdmin: () => void;
  onEditRoomTopic: () => void;
  onToggleGhost?: (enabled: boolean) => void;
  onChangePassword: (currentPassword: string, newPassword: string) => void;
  onClearPasswordFeedback: () => void;
  onLogout: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  self,
  currentRoom,
  canEditTopic,
  isDark,
  soundEnabled,
  fontScale,
  voiceServer,
  selectedStyle,
  styleLocked = false,
  hideJoinNotices,
  unreadNotificationsCount,
  passwordFeedback,
  onClose,
  onSaveProfile,
  onChangeFontScale,
  onChangeVoiceServer,
  onChangeStyle,
  onClearLocalScreen,
  onOpenAvatarModal,
  onOpenNotifications,
  onToggleSound,
  onToggleTheme,
  onToggleHideJoinNotices,
  onOpenGames,
  onOpenAdmin,
  onEditRoomTopic,
  onToggleGhost,
  onChangePassword,
  onClearPasswordFeedback,
  onLogout,
}) => {
  const [usernameInput, setUsernameInput] = useState(self.username);
  const [statusInput, setStatusInput] = useState(self.statusText || '');
  const [statusIcon, setStatusIcon] = useState(self.statusIcon || '');
  const [showStatusIconPicker, setShowStatusIconPicker] = useState(false);
  const [nameColor, setNameColor] = useState(self.nameColor || '#000000');
  const [textColor, setTextColor] = useState(self.textColor || '#000000');
  const [bgColor, setBgColor] = useState(self.bgColor || '#ffffff');
  const [statusColor, setStatusColor] = useState(self.statusColor || '#525252');
  const [savedNotice, setSavedNotice] = useState(false);
  const [showDecoPicker, setShowDecoPicker] = useState(false);

  // Expandable sub-sections
  const [openSection, setOpenSection] = useState<'none' | 'links' | 'addons' | 'password'>('none');

  // Social links state
  const [youtubeLink, setYoutubeLink] = useState(self.socialLinks?.youtube || '');
  const [snapchatLink, setSnapchatLink] = useState(self.socialLinks?.snapchat || '');
  const [instagramLink, setInstagramLink] = useState(self.socialLinks?.instagram || '');
  const [tiktokLink, setTiktokLink] = useState(self.socialLinks?.tiktok || '');
  const [websiteLink, setWebsiteLink] = useState(self.socialLinks?.website || '');

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localPwError, setLocalPwError] = useState('');

  useEffect(() => {
    setUsernameInput(self.username);
    setStatusInput(self.statusText || '');
    setStatusIcon(self.statusIcon || '');
    setNameColor(self.nameColor || '#000000');
    setTextColor(self.textColor || '#000000');
    setBgColor(self.bgColor || '#ffffff');
    setStatusColor(self.statusColor || '#525252');
    setYoutubeLink(self.socialLinks?.youtube || '');
    setSnapchatLink(self.socialLinks?.snapchat || '');
    setInstagramLink(self.socialLinks?.instagram || '');
    setTiktokLink(self.socialLinks?.tiktok || '');
    setWebsiteLink(self.socialLinks?.website || '');
  }, [self]);

  useEffect(() => {
    if (passwordFeedback?.ok) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [passwordFeedback]);

  const handleSaveAppearance = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveProfile({
      username: usernameInput.trim() || self.username,
      nameColor,
      textColor: textColor.toLowerCase() === '#000000' ? '' : textColor,
      bgColor: bgColor.toLowerCase() === '#ffffff' ? '' : bgColor,
      statusColor,
      statusIcon: formatStatusIcon(statusIcon),
      pmDisabled: self.pmDisabled,
      socialLinks: self.socialLinks,
      statusText: statusInput.trim() || 'متواجد',
      bio: self.bio,
      avatarSymbol: self.avatarSymbol,
      avatarUrl: self.avatarUrl || '',
      gender: self.gender,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2000);
  };

  const applyDecoration = (prefix: string, suffix: string) => {
    const cleanBase = usernameInput.replace(/^[꧁★♛✿❖\s]+|[꧁꧂★♛✿❖\s]+$/g, '').trim() || self.username;
    const decorated = `${prefix}${cleanBase}${suffix}`.slice(0, 28);
    setUsernameInput(decorated);
    setShowDecoPicker(false);
  };

  const handleDeleteAvatar = () => {
    onSaveProfile({
      nameColor: self.nameColor,
      textColor: self.textColor,
      bgColor: self.bgColor,
      statusColor: self.statusColor,
      statusIcon: self.statusIcon,
      pmDisabled: self.pmDisabled,
      socialLinks: self.socialLinks,
      statusText: self.statusText,
      bio: self.bio,
      avatarSymbol: self.avatarSymbol,
      avatarUrl: 'none',
      gender: self.gender,
    });
  };

  const handleTogglePmDisabled = () => {
    onSaveProfile({
      nameColor: self.nameColor,
      textColor: self.textColor,
      bgColor: self.bgColor,
      statusColor: self.statusColor,
      statusIcon: self.statusIcon,
      pmDisabled: !self.pmDisabled,
      socialLinks: self.socialLinks,
      statusText: self.statusText,
      bio: self.bio,
      avatarSymbol: self.avatarSymbol,
      avatarUrl: self.avatarUrl || '',
      gender: self.gender,
    });
  };

  const handleSaveLinks = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      nameColor: self.nameColor,
      textColor: self.textColor,
      bgColor: self.bgColor,
      statusColor: self.statusColor,
      statusIcon: self.statusIcon,
      pmDisabled: self.pmDisabled,
      socialLinks: {
        youtube: youtubeLink.trim(),
        snapchat: snapchatLink.trim(),
        instagram: instagramLink.trim(),
        tiktok: tiktokLink.trim(),
        website: websiteLink.trim(),
      },
      statusText: self.statusText,
      bio: self.bio,
      avatarSymbol: self.avatarSymbol,
      avatarUrl: self.avatarUrl || '',
      gender: self.gender,
    });
    setOpenSection('none');
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2000);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalPwError('');
    onClearPasswordFeedback();
    if (newPassword.length < 4) {
      setLocalPwError('كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalPwError('كلمة المرور وتأكيدها غير متطابقتين.');
      return;
    }
    onChangePassword(currentPassword, newPassword);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 text-stone-900 dark:text-stone-100">
      {/* Top Bar matching IMG_3476 */}
      <div
        className="px-2.5 py-2 dark:bg-zinc-950 text-white border-b dark:border-zinc-800 flex items-center justify-between shrink-0"
        style={{ background: 'var(--ych-header-bg, var(--ych-primary))', borderColor: 'var(--ych-primary-dark)' }}
      >
        <h2 className="font-display text-sm sm:text-base font-bold pr-1">الإعدادات</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق الإعدادات"
          className="w-10 h-9 sm:w-9 sm:h-7 rounded-xs bg-[#d9534f] hover:bg-red-700 text-white flex items-center justify-center border border-red-900/40 cursor-pointer active:scale-95 transition-transform"
        >
          <X className="w-4 h-4 stroke-[3]" />
        </button>
      </div>

      {/* Scrollable Settings Body */}
      <div className="flex-1 overflow-y-auto chat-scroll p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-1.5">
        <form onSubmit={handleSaveAppearance} className="space-y-1">
          {/* الزخرفه */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between gap-1">
              <span className="inline-block w-36 bg-[var(--ych-primary)] text-white text-xs font-bold text-center py-1.5 rounded-t-xs">
                الزخرفه
              </span>
              <button
                type="button"
                onClick={() => setShowDecoPicker((v) => !v)}
                className="text-[11px] font-bold text-[#855853] dark:text-amber-300 px-2 py-1 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>زخارف جاهزة</span>
              </button>
            </div>
            {showDecoPicker && (
              <div className="flex flex-wrap gap-1 p-1.5 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xs">
                {NAME_DECORATION_WRAPS.map((w) => (
                  <button
                    key={w.label}
                    type="button"
                    onClick={() => applyDecoration(w.prefix, w.suffix)}
                    className="px-2 py-1 text-xs font-bold bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700 rounded-xs hover:bg-[var(--ych-primary)] hover:text-white cursor-pointer"
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              maxLength={28}
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="الاسم المستعار المزخرف"
              className="w-full h-10 sm:h-9 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-base sm:text-sm font-bold text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[#855853]"
            />
          </div>

          {/* الحاله ورمز الحالة */}
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between gap-1">
              <span className="inline-block w-36 bg-[var(--ych-primary)] text-white text-xs font-bold text-center py-1.5 rounded-t-xs">
                الحاله والرمز
              </span>
              <button
                type="button"
                onClick={() => setShowStatusIconPicker((v) => !v)}
                className="text-[11px] font-bold text-[#855853] dark:text-amber-300 px-2 py-1 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Smile className="w-3.5 h-3.5" />
                <span>{statusIcon ? `الرمز: ${statusIcon}` : 'إضافة رمز مزاج'}</span>
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowStatusIconPicker((v) => !v)}
                title={statusIcon ? getStatusIconLabel(statusIcon) || 'رمز الحالة الحالي' : 'اختر رمز الحالة'}
                aria-label="اختيار رمز الحالة"
                className="w-11 h-10 sm:w-10 sm:h-9 shrink-0 rounded-xs border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 hover:bg-stone-100 dark:hover:bg-zinc-800 flex items-center justify-center text-base cursor-pointer active:scale-95 transition-transform"
              >
                {statusIcon || <Smile className="w-4 h-4 text-stone-400" />}
              </button>
              <input
                type="text"
                maxLength={48}
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                placeholder="(عضو جديد)"
                className="flex-1 min-w-0 h-10 sm:h-9 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-base sm:text-sm font-medium text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-[#855853]"
              />
            </div>

            {showStatusIconPicker && (
              <div className="p-2 rounded-xs bg-stone-50 dark:bg-zinc-950 border border-stone-300 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 dark:text-stone-300">
                  <span>اختر رمز المزاج أو النشاط</span>
                  {statusIcon && (
                    <button
                      type="button"
                      onClick={() => setStatusIcon('')}
                      className="text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      إزالة الرمز
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {STATUS_ICON_PRESETS.map((preset) => {
                    const active = statusIcon === preset.icon;
                    return (
                      <button
                        key={preset.icon}
                        type="button"
                        title={preset.label}
                        onClick={() => {
                          setStatusIcon(preset.icon);
                          const isDefaultOrPreset =
                            !statusInput.trim() ||
                            ['متواجد', 'متواجد للدردشة', 'عضو في عراقية شات', 'إدارة الديوان'].includes(statusInput.trim()) ||
                            STATUS_ICON_PRESETS.some((p) => p.label === statusInput.trim());
                          if (isDefaultOrPreset) {
                            setStatusInput(preset.label);
                          }
                        }}
                        className={`h-8 rounded-xs border text-base flex items-center justify-center transition-colors cursor-pointer ${
                          active
                            ? 'border-[var(--ych-primary)] bg-[var(--ych-soft)] dark:bg-zinc-800 ring-1 ring-[var(--ych-primary)]'
                            : 'border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {preset.icon}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={statusIcon}
                    onChange={(e) => setStatusIcon(formatStatusIcon(e.target.value))}
                    placeholder="أو اكتب أي إيموجي مخصص..."
                    className="flex-1 min-w-0 h-8 px-2 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStatusIconPicker(false)}
                    className="px-2.5 h-8 rounded-xs bg-[var(--ych-primary)] text-white text-[11px] font-bold cursor-pointer"
                  >
                    تم
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4 Color Rows */}
          <div className="space-y-1.5 pt-0.5">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <span className="w-36 shrink-0 bg-[var(--ych-primary)] text-white text-xs font-bold text-center py-2 rounded-xs">
                لون الإسم
              </span>
              <div className="relative w-24 h-9 sm:w-20 sm:h-7 border border-stone-500 dark:border-zinc-600 rounded-xs overflow-hidden shrink-0">
                <input
                  type="color"
                  value={nameColor}
                  onChange={(e) => setNameColor(e.target.value)}
                  aria-label="لون الإسم"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full h-full" style={{ backgroundColor: nameColor }} />
              </div>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <span className="w-36 shrink-0 bg-[var(--ych-primary)] text-white text-xs font-bold text-center py-2 rounded-xs">
                لون الخط
              </span>
              <div className="relative w-24 h-9 sm:w-20 sm:h-7 border border-stone-500 dark:border-zinc-600 rounded-xs overflow-hidden shrink-0">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  aria-label="لون الخط"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full h-full" style={{ backgroundColor: textColor }} />
              </div>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <span className="w-36 shrink-0 bg-[var(--ych-primary)] text-white text-xs font-bold text-center py-2 rounded-xs">
                لون الخلفيه
              </span>
              <div className="relative w-24 h-9 sm:w-20 sm:h-7 border border-stone-500 dark:border-zinc-600 rounded-xs overflow-hidden shrink-0">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  aria-label="لون الخلفيه"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full h-full" style={{ backgroundColor: bgColor }} />
              </div>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <span className="w-36 shrink-0 bg-[var(--ych-primary)] text-white text-xs font-bold text-center py-2 rounded-xs">
                لون الحالة
              </span>
              <div className="relative w-24 h-9 sm:w-20 sm:h-7 border border-stone-500 dark:border-zinc-600 rounded-xs overflow-hidden shrink-0">
                <input
                  type="color"
                  value={statusColor}
                  onChange={(e) => setStatusColor(e.target.value)}
                  aria-label="لون الحالة"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full h-full" style={{ backgroundColor: statusColor }} />
              </div>
            </label>
          </div>

          {/* Green Save Button: حفظ */}
          <button
            type="submit"
            className="w-full h-11 sm:h-10 mt-1 rounded-xs bg-[#44a948] hover:bg-[#3a963e] text-white font-bold text-sm border border-stone-600/50 relative flex items-center justify-center cursor-pointer active:scale-[0.98] transition-transform"
          >
            <Edit className="w-4 h-4 absolute right-2.5" />
            <span>{savedNotice ? 'تم الحفظ ✓' : 'حفظ'}</span>
          </button>
        </form>

        {/* حجم الخطوط - %100 */}
        <div className="relative">
          <select
            aria-label="حجم الخطوط"
            value={fontScale}
            onChange={(e) => onChangeFontScale(Number(e.target.value) as ChatFontScale)}
            className="w-full h-10 px-3 pl-8 rounded-xs bg-[var(--ych-primary)] text-white text-xs sm:text-sm font-bold border border-[var(--ych-primary-dark)] appearance-none focus:outline-none cursor-pointer"
          >
            <option value={85}>حجم الخطوط - %85</option>
            <option value={100}>حجم الخطوط - %100</option>
            <option value={115}>حجم الخطوط - %115</option>
            <option value={130}>حجم الخطوط - %130</option>
            <option value={150}>حجم الخطوط - %150</option>
          </select>
          <ChevronsUpDown className="w-4 h-4 text-white/90 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* السيرفر الصوتي: الاساسي */}
        <div className="relative">
          <select
            aria-label="السيرفر الصوتي"
            value={voiceServer}
            onChange={(e) => onChangeVoiceServer(e.target.value as VoiceServerOption)}
            className="w-full h-10 px-3 pl-8 rounded-xs bg-[var(--ych-primary)] text-white text-xs sm:text-sm font-bold border border-[var(--ych-primary-dark)] appearance-none focus:outline-none cursor-pointer"
          >
            <option value="primary">السيرفر الصوتي: الاساسي</option>
            <option value="fast">السيرفر الصوتي: السريع</option>
            <option value="backup">السيرفر الصوتي: الاحتياطي</option>
          </select>
          <ChevronsUpDown className="w-4 h-4 text-white/90 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* تغير الصوره */}
        <button
          type="button"
          onClick={onOpenAvatarModal}
          className="w-full h-11 px-2 rounded-xs bg-white dark:bg-zinc-950 hover:bg-stone-50 dark:hover:bg-zinc-800 border border-stone-500 dark:border-zinc-700 text-stone-900 dark:text-stone-100 font-bold text-sm relative flex items-center justify-center cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            <UserAvatar avatarUrl={self.avatarUrl} username={self.username} size="sm" className="rounded-xs" />
          </div>
          <span>تغير الصوره</span>
        </button>

        {/* حذف الصوره */}
        <button
          type="button"
          onClick={handleDeleteAvatar}
          className="w-full h-11 sm:h-10 px-2 rounded-xs bg-[#e0564b] hover:bg-[#cf483d] border border-stone-700 text-stone-950 font-bold text-sm relative flex items-center justify-center cursor-pointer active:scale-[0.98] transition-transform"
        >
          <UserX className="w-4 h-4 absolute right-2.5 text-stone-950" />
          <span>حذف الصوره</span>
        </button>

        {/* تعطيل المحادثات الخاصه */}
        <button
          type="button"
          onClick={handleTogglePmDisabled}
          className={`w-full h-11 sm:h-10 px-2 rounded-xs border font-bold text-sm flex items-center justify-center cursor-pointer active:scale-[0.98] transition-all ${
            self.pmDisabled
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-800 dark:text-amber-200'
              : 'bg-white dark:bg-zinc-950 hover:bg-stone-50 dark:hover:bg-zinc-800 border-stone-500 dark:border-zinc-700 text-stone-900 dark:text-stone-100'
          }`}
        >
          <span>{self.pmDisabled ? 'تفعيل المحادثات الخاصه' : 'تعطيل المحادثات الخاصه'}</span>
        </button>

        {/* سجل التنبيهات */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="w-full h-11 sm:h-10 px-2 rounded-xs bg-white dark:bg-zinc-950 hover:bg-stone-50 dark:hover:bg-zinc-800 border border-stone-500 dark:border-zinc-700 text-stone-900 dark:text-stone-100 font-bold text-sm relative flex items-center justify-center cursor-pointer active:scale-[0.98] transition-transform"
        >
          <Bell className="w-4 h-4 absolute right-2.5 text-[#855853] dark:text-amber-300" />
          <span>سجل التنبيهات</span>
          {unreadNotificationsCount > 0 && (
            <span className="absolute left-2.5 px-1.5 py-0.5 rounded-xs bg-red-600 text-white text-[11px] font-bold font-mono-tabular">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* تعطيل التنبيهات */}
        <button
          type="button"
          onClick={onToggleSound}
          className={`w-full h-11 sm:h-10 px-2 rounded-xs border font-bold text-sm flex items-center justify-center cursor-pointer active:scale-[0.98] transition-all ${
            !soundEnabled
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-800 dark:text-amber-200'
              : 'bg-white dark:bg-zinc-950 hover:bg-stone-50 dark:hover:bg-zinc-800 border-stone-500 dark:border-zinc-700 text-stone-900 dark:text-stone-100'
          }`}
        >
          <span>{soundEnabled ? 'تعطيل التنبيهات' : 'تفعيل التنبيهات'}</span>
        </button>

        {/* الألعاب */}
        <button
          type="button"
          onClick={onOpenGames}
          className="w-full h-11 sm:h-10 px-2 rounded-xs bg-gradient-to-l from-[#9d71e8] to-[#7c4dff] hover:opacity-95 border border-purple-900/50 text-white font-bold text-sm relative flex items-center justify-center cursor-pointer active:scale-[0.98] transition-transform"
        >
          <Trophy className="w-4 h-4 absolute right-2.5 text-white" />
          <span>الألعاب</span>
        </button>

        {/* اضافة رابط */}
        <button
          type="button"
          onClick={() => setOpenSection((s) => (s === 'links' ? 'none' : 'links'))}
          className="w-full h-11 px-2 rounded-xs bg-black hover:bg-zinc-900 border border-stone-700 text-white font-bold text-sm flex items-center justify-between gap-1 cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-1 shrink-0">
            <span className="w-7 h-5 rounded-xs bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center">
              ▶
            </span>
            <span className="w-6 h-6 rounded-md bg-yellow-400 text-black text-xs font-extrabold flex items-center justify-center">
              👻
            </span>
          </div>
          <span className="truncate">اضافة رابط</span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="w-6 h-6 rounded-md bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white text-[10px] font-extrabold flex items-center justify-center">
              IG
            </span>
            <span className="w-6 h-6 rounded-full bg-zinc-900 border border-cyan-400 text-white text-[11px] font-extrabold flex items-center justify-center">
              ♪
            </span>
          </div>
        </button>

        {openSection === 'links' && (
          <form
            key="section-links"
            onSubmit={handleSaveLinks}
            className="p-2.5 rounded-xs bg-stone-50 dark:bg-zinc-950 border border-stone-300 dark:border-zinc-800 space-y-2"
          >
            <div className="text-xs font-bold text-[#855853] dark:text-amber-300">
              روابط حساباتك (تظهر في بطاقتك الشخصية)
            </div>
            <input
              type="text"
              maxLength={140}
              value={instagramLink}
              onChange={(e) => setInstagramLink(e.target.value)}
              placeholder="إنستغرام (معرّف أو رابط)"
              className="w-full h-8 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
            />
            <input
              type="text"
              maxLength={140}
              value={tiktokLink}
              onChange={(e) => setTiktokLink(e.target.value)}
              placeholder="تيك توك (معرّف أو رابط)"
              className="w-full h-8 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
            />
            <input
              type="text"
              maxLength={140}
              value={snapchatLink}
              onChange={(e) => setSnapchatLink(e.target.value)}
              placeholder="سناب شات"
              className="w-full h-8 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
            />
            <input
              type="text"
              maxLength={140}
              value={youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
              placeholder="يوتيوب"
              className="w-full h-8 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
            />
            <input
              type="text"
              maxLength={140}
              value={websiteLink}
              onChange={(e) => setWebsiteLink(e.target.value)}
              placeholder="رابط شخصي إضافي"
              className="w-full h-8 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
            />
            <button
              type="submit"
              className="w-full py-1.5 rounded-xs bg-[#44a948] text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>حفظ الروابط</span>
            </button>
          </form>
        )}

        {/* الاضافات والميزات */}
        <button
          type="button"
          onClick={() => setOpenSection((s) => (s === 'addons' ? 'none' : 'addons'))}
          className="w-full h-11 sm:h-10 px-2 rounded-xs bg-gradient-to-l from-[#e879f9] via-[#a855f7] to-[#38bdf8] hover:opacity-95 border border-stone-500/50 text-white font-bold text-sm relative flex items-center justify-center cursor-pointer active:scale-[0.98] transition-transform"
        >
          <MessageCircle className="w-4 h-4 absolute right-2.5 text-white" />
          <span>الاضافات والميزات</span>
        </button>

        {openSection === 'addons' && (
          <div
            key="section-addons"
            className="p-2 rounded-xs bg-stone-50 dark:bg-zinc-950 border border-stone-300 dark:border-zinc-800 space-y-2"
          >
            {/* YouCam Host Multi-Style Switcher */}
            <div className="p-2 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 space-y-1.5">
              <div className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" style={{ color: 'var(--ych-primary)' }} />
                <span>ستايل الشات (يوكام هوست)</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {YOUCAM_STYLES.map((st) => {
                  const active = selectedStyle === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      disabled={styleLocked}
                      onClick={() => onChangeStyle(st.id)}
                      title={styleLocked ? 'تم تثبيت الستايل من الإدارة' : st.label}
                      aria-label={st.label}
                      className={`h-9 sm:h-8 rounded-xs border-2 flex items-center justify-center text-white text-[10px] font-bold transition-transform active:scale-95 ${
                        styleLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        active ? 'border-stone-900 dark:border-white scale-105' : 'border-transparent opacity-85 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: st.primary }}
                    >
                      {active ? <Check className="w-3.5 h-3.5" /> : null}
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                الستايل النشط:{' '}
                <strong className="text-stone-800 dark:text-stone-200">
                  {styleLocked
                    ? 'تصميم الإدارة الموحد'
                    : YOUCAM_STYLES.find((s) => s.id === selectedStyle)?.label || 'يوكام الكلاسيكي'}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full min-h-[42px] py-2 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold flex items-center justify-between cursor-pointer active:scale-[0.99]"
            >
              <span>{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" style={{ color: 'var(--ych-primary)' }} />}
            </button>

            <button
              type="button"
              onClick={onToggleHideJoinNotices}
              className="w-full min-h-[42px] py-2 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold flex items-center justify-between cursor-pointer active:scale-[0.99]"
            >
              <span>{hideJoinNotices ? 'إظهار إشعارات الدخول والانتقال والخروج' : 'إخفاء إشعارات الدخول والانتقال والخروج'}</span>
              {hideJoinNotices ? <Eye className="w-4 h-4 text-[#44a948]" /> : <EyeOff className="w-4 h-4 text-stone-500" />}
            </button>

            <button
              type="button"
              onClick={() => {
                onClearLocalScreen();
                onClose();
              }}
              className="w-full min-h-[42px] py-2 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center justify-between cursor-pointer active:scale-[0.99]"
            >
              <span>مسح شاشة الدردشة (محلياً)</span>
              <Eraser className="w-4 h-4 text-amber-600" />
            </button>

            {canEditTopic && currentRoom && (
              <button
                type="button"
                onClick={onEditRoomTopic}
                className="w-full min-h-[42px] py-2 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold flex items-center justify-between cursor-pointer active:scale-[0.99]"
              >
                <span>تعديل عنوان: {currentRoom.name}</span>
                <Edit3 className="w-4 h-4" style={{ color: 'var(--ych-primary)' }} />
              </button>
            )}

            {self.role === 'admin' && onToggleGhost && (
              <button
                type="button"
                onClick={() => onToggleGhost(!self.isGhost)}
                className={`w-full min-h-[42px] py-2 px-2.5 rounded-xs border text-xs font-bold flex items-center justify-between cursor-pointer active:scale-[0.99] transition-colors ${
                  self.isGhost
                    ? 'bg-zinc-900 dark:bg-amber-950/60 border-amber-400 text-amber-300'
                    : 'bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span>{self.isGhost ? 'إلغاء الوضع الشبحي (الظهور للجميع)' : 'تفعيل الوضع الشبحي (مخفي)'}</span>
                <Ghost className={`w-4 h-4 ${self.isGhost ? 'text-amber-300' : 'text-stone-500'}`} />
              </button>
            )}

            {(self.role === 'admin' || self.role === 'moderator') && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="w-full min-h-[42px] py-2 px-2.5 rounded-xs bg-rose-900 hover:bg-rose-950 text-amber-200 text-xs font-bold flex items-center justify-between cursor-pointer active:scale-[0.99]"
              >
                <span>لوحة تحكم الإدارة</span>
                <Shield className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* تغيير كلمة المرور */}
        <button
          type="button"
          onClick={() => {
            onClearPasswordFeedback();
            setLocalPwError('');
            setOpenSection((s) => (s === 'password' ? 'none' : 'password'));
          }}
          className="w-full h-11 sm:h-10 px-2 rounded-xs bg-white dark:bg-zinc-950 hover:bg-stone-50 dark:hover:bg-zinc-800 border border-stone-500 dark:border-zinc-700 text-stone-900 dark:text-stone-100 font-bold text-sm relative flex items-center justify-center cursor-pointer active:scale-[0.98] transition-transform"
        >
          <KeyRound className="w-4 h-4 absolute right-2.5 text-stone-800 dark:text-stone-200" />
          <span>تغيير كلمة المرور</span>
        </button>

        {openSection === 'password' && (
          <form
            key="section-password"
            onSubmit={handlePasswordSubmit}
            className="p-2.5 rounded-xs bg-stone-50 dark:bg-zinc-950 border border-stone-300 dark:border-zinc-800 space-y-2"
          >
            {self.isGuest ? (
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                أنت مسجل حالياً كزائر. يمكنك إنشاء عضوية دائمة من شاشة الدخول لتتمتع بكلمة مرور.
              </p>
            ) : (
              <>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="كلمة المرور الحالية"
                  className="w-full h-10 sm:h-9 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base sm:text-xs"
                />
                <input
                  type="password"
                  required
                  minLength={4}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة"
                  className="w-full h-10 sm:h-9 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base sm:text-xs"
                />
                <input
                  type="password"
                  required
                  minLength={4}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="تأكيد كلمة المرور الجديدة"
                  className="w-full h-10 sm:h-9 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base sm:text-xs"
                />
                {(localPwError || passwordFeedback) && (
                  <p
                    className={`text-xs font-semibold ${
                      passwordFeedback?.ok ? 'text-[#44a948]' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {localPwError || passwordFeedback?.message}
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full h-10 sm:h-9 rounded-xs bg-[#855853] hover:bg-[#734a45] text-white text-xs font-bold cursor-pointer active:scale-[0.98]"
                >
                  تحديث كلمة المرور
                </button>
              </>
            )}
          </form>
        )}

        {/* تسجيل الخروج */}
        <button
          type="button"
          onClick={onLogout}
          className="w-full h-11 sm:h-10 px-2 rounded-xs bg-red-600 hover:bg-red-700 text-white font-bold text-sm relative flex items-center justify-center cursor-pointer active:scale-[0.98] transition-transform"
        >
          <LogOut className="w-4 h-4 absolute right-2.5" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
};
