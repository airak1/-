import React, { useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  User,
  UserPlus,
  Users,
  Phone,
  HelpCircle,
  Ticket,
  Star,
  Moon,
  Sun,
  Shuffle,
  SlidersHorizontal,
  X,
  MessageSquare,
  Check,
  Upload,
  Heart,
} from 'lucide-react';
import type {
  AuthResponse,
  OnlineUserPreview,
  Room,
  SiteSettings,
  UserGender,
  UserRole,
  WallPost,
} from '../types/chat';
import {
  COUNTRIES,
  DEFAULT_DESIGN_SETTINGS,
  DEFAULT_PORTAL_BANNER_URL,
  NAME_COLORS,
  computeUserLevel,
  formatCompactMetric,
  formatTime,
  getCountryFlag,
  getDesignCssVars,
  getStatusIconLabel,
  resolveEffectiveTheme,
} from '../utils/chatHelpers';
import {
  AVATAR_STYLES,
  buildDiceBearSpec,
  compressAvatarFile,
  generateRandomSeed,
} from '../utils/avatar';
import { UserAvatar } from './UserAvatar';
import { RoomThumbnail } from './RoomImagePicker';
import { BannerStrip } from './RichSmileyText';

interface PortalLoginProps {
  rooms: Room[];
  totalOnline: number;
  onlinePreview?: OnlineUserPreview[];
  wallPreview?: WallPost[];
  siteSettings?: SiteSettings;
  isDark: boolean;
  onToggleTheme: () => void;
  onRefresh?: () => Promise<void> | void;
  onAuthenticated: (auth: AuthResponse, initialRoomId: string) => void;
}

type AuthMode = 'guest' | 'login' | 'register';
type InfoPanel = 'zajel' | 'rules' | 'faq' | 'contact' | null;

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'الإدارة',
  moderator: 'إشراف',
  vip: 'VIP',
  member: 'عضو',
  visitor: 'زائر',
};

export const PortalLogin: React.FC<PortalLoginProps> = ({
  rooms,
  totalOnline,
  onlinePreview = [],
  wallPreview = [],
  siteSettings,
  isDark,
  onToggleTheme,
  onRefresh,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<AuthMode>('guest');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<UserGender>('male');
  const [country, setCountry] = useState('العراق');
  const [nameColor, setNameColor] = useState(NAME_COLORS[0].value);
  const [avatarUrl, setAvatarUrl] = useState(() =>
    buildDiceBearSpec('adventurer', generateRandomSeed())
  );
  const [selectedRoomId, setSelectedRoomId] = useState('general');
  const [showCustomize, setShowCustomize] = useState(false);
  const [isGhostLogin, setIsGhostLogin] = useState(false);
  const [activeInfo, setActiveInfo] = useState<InfoPanel>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [imgError, setImgError] = useState(false);
  const [thumbImgError, setThumbImgError] = useState(false);
  const [bgImgError, setBgImgError] = useState(false);

  const siteTitle = siteSettings?.siteTitle || 'عراقية شات';
  const design = siteSettings?.design || DEFAULT_DESIGN_SETTINGS;
  const theme = resolveEffectiveTheme(siteSettings, undefined);
  const cssVars = useMemo(() => getDesignCssVars(theme, design), [theme, design]);

  const portalBannerUrl = design.portalBannerUrl || DEFAULT_PORTAL_BANNER_URL;
  const portalThumbUrl = design.portalThumbUrl || portalBannerUrl;
  const portalBannerOpacity = Math.max(0.05, Math.min(1, (design.portalBannerOpacity ?? 28) / 100));

  useEffect(() => {
    setImgError(false);
  }, [portalBannerUrl]);

  useEffect(() => {
    setThumbImgError(false);
  }, [portalThumbUrl]);

  useEffect(() => {
    setBgImgError(false);
  }, [design.portalBgUrl]);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || rooms[0],
    [rooms, selectedRoomId]
  );

  const todayInfo = useMemo(() => {
    const now = new Date();
    const dayName = now.toLocaleDateString('ar-IQ', { weekday: 'long' });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return { dayName, timeStr };
  }, []);

  const handleManualRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      window.setTimeout(() => setIsRefreshing(false), 350);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = username.trim();
    if (trimmedName.length < 2) {
      setErrorMsg('يرجى كتابة اسم مستعار لا يقل عن حرفين.');
      return;
    }
    if (mode !== 'guest' && password.length < 4) {
      setErrorMsg('كلمة المرور يجب أن تكون 4 أحرف على الأقل.');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint =
        mode === 'guest'
          ? '/api/auth/guest'
          : mode === 'login'
          ? '/api/auth/login'
          : '/api/auth/register';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedName,
          password: password || undefined,
          gender,
          country,
          nameColor,
          avatarUrl,
          ghost: mode === 'login' && isGhostLogin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'تعذر تسجيل الدخول، حاول مرة أخرى.');
        return;
      }

      onAuthenticated(data as AuthResponse, selectedRoomId);
    } catch {
      setErrorMsg('حدث خطأ في الاتصال بالخادم، يرجى المحاولة مجدداً.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={cssVars as React.CSSProperties}
      className="relative min-h-screen flex flex-col bg-[#f5f2f2] text-stone-900 dark:bg-zinc-950 dark:text-stone-100 transition-colors"
    >
      {/* Optional Full-Page Portal Background Image */}
      {design.portalBgUrl && !bgImgError && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <img
            src={design.portalBgUrl}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            onError={() => setBgImgError(true)}
            className="w-full h-full object-cover opacity-25 dark:opacity-15"
          />
          <div className="absolute inset-0 bg-[#f5f2f2]/65 dark:bg-zinc-950/75" />
        </div>
      )}

      {/* Classic YouCam Host Chat Portal Bar */}
      <header
        style={{ background: 'var(--ych-header-bg, var(--ych-primary))' }}
        className="dark:!bg-none dark:bg-zinc-900 text-white border-b border-[var(--ych-primary-dark)] dark:border-zinc-800 sticky top-0 z-30"
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-12 sm:h-14 flex items-center justify-between gap-4 sm:gap-8">
          <a
            href="#portal"
            className="font-display text-sm sm:text-lg font-bold text-white whitespace-nowrap shrink-0 flex items-center gap-2 min-w-0 max-w-[65vw] sm:max-w-none"
          >
            <span className="truncate">
              {siteTitle} | {siteTitle} للجوال
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-stone-100/90">
            <a
              href="#rooms-directory"
              className="hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              الغرف
            </a>
            <button
              type="button"
              onClick={() => setActiveInfo('zajel')}
              className="hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              زاجل
            </button>
            <button
              type="button"
              onClick={() => setActiveInfo('rules')}
              className="hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              القوانين
            </button>
            <button
              type="button"
              onClick={() => setActiveInfo('faq')}
              className="hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              الأسئلة
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
              className="w-10 h-10 rounded-md bg-black/20 hover:bg-black/30 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleManualRefresh}
              aria-label="تحديث المتصلين"
              style={{ backgroundColor: 'var(--ych-accent)' }}
              className="w-10 h-10 rounded-sm hover:opacity-90 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main id="portal" className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-2.5 sm:px-6 py-3 sm:py-6">
        <BannerStrip banners={siteSettings?.banners} placement="portal_top" className="mb-3 sm:mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* Primary Portal Entry Column (Right side in RTL / Top on Mobile) */}
          <section
            style={{ borderRadius: 'var(--ych-radius, 6px)' }}
            className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 overflow-hidden shadow-xs"
          >
            {/* Hero Soft-Rose / Heritage Banner */}
            <div className="relative min-h-[156px] sm:h-48 overflow-hidden bg-gradient-to-l from-[#f6e4e7] via-[#eed3d8] to-[#dfc0c5] dark:from-zinc-900 dark:via-[#332225] dark:to-zinc-950 border-b border-stone-200 dark:border-zinc-800">
              {portalBannerUrl && !imgError && (
                <img
                  src={portalBannerUrl}
                  alt={`واجهة ${siteTitle}`}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  style={{ opacity: isDark ? Math.min(portalBannerOpacity, 0.35) : portalBannerOpacity }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="relative z-10 h-full p-3 sm:p-4 flex items-center justify-between gap-2.5 sm:gap-3">
                {/* Right Side: Calligraphic Title, Tagline & Schedule/Live chips */}
                <div className="flex-1 min-w-0 flex flex-col items-start justify-center gap-1.5">
                  <h1 className="font-display text-xl sm:text-3xl font-extrabold text-[#4a2b28] dark:text-amber-200 leading-tight drop-shadow-xs">
                    {siteTitle}
                  </h1>
                  <p className="text-xs sm:text-sm font-semibold text-[#683e3a] dark:text-stone-200 line-clamp-2 max-w-[230px]">
                    {siteSettings?.welcomeBanner ||
                      'أهلاً وسهلاً بكم في شات العراق والعرب — لمة الحبايب'}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-[11px] sm:text-xs font-semibold text-[#5a3531] dark:text-stone-300">
                    <span>{todayInfo.dayName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{todayInfo.timeStr}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{totalOnline} متصل</span>
                  </div>
                </div>

                {/* Left Side: Framed Featured Image Box */}
                {design.showPortalThumb !== false && (
                  <div
                    style={{ borderRadius: 'var(--ych-radius, 6px)' }}
                    className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 overflow-hidden border-2 border-white/80 dark:border-zinc-700 shadow-sm bg-[#e6c4ca] dark:bg-zinc-800"
                  >
                    {portalThumbUrl && !thumbImgError ? (
                      <img
                        src={portalThumbUrl}
                        alt={`صورة ${siteTitle}`}
                        referrerPolicy="no-referrer"
                        onError={() => setThumbImgError(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#855853] dark:text-amber-300">
                        <MessageSquare className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 4-Button Action Bar */}
            {design.showPortalInfoBar !== false && (
              <div className="grid grid-cols-4 gap-1.5 px-2.5 pt-2.5 bg-white dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setActiveInfo((cur) => (cur === 'contact' ? null : 'contact'))}
                className={`min-h-[40px] sm:h-9 rounded-xs text-[11px] sm:text-xs font-bold text-white flex items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap ${
                  activeInfo === 'contact'
                    ? 'bg-[var(--ych-primary-dark)]'
                    : 'bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)]'
                }`}
              >
                <Phone className="w-3 h-3 shrink-0" />
                <span>اتصل بنا</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveInfo((cur) => (cur === 'faq' ? null : 'faq'))}
                className={`min-h-[40px] sm:h-9 rounded-xs text-[11px] sm:text-xs font-bold text-white flex items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap ${
                  activeInfo === 'faq'
                    ? 'bg-[var(--ych-primary-dark)]'
                    : 'bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)]'
                }`}
              >
                <HelpCircle className="w-3 h-3 shrink-0" />
                <span>الأسئلة</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveInfo((cur) => (cur === 'rules' ? null : 'rules'))}
                className={`min-h-[40px] sm:h-9 rounded-xs text-[11px] sm:text-xs font-bold text-white flex items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap ${
                  activeInfo === 'rules'
                    ? 'bg-[var(--ych-primary-dark)]'
                    : 'bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)]'
                }`}
              >
                <Ticket className="w-3 h-3 shrink-0" />
                <span>القوانين</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveInfo((cur) => (cur === 'zajel' ? null : 'zajel'))}
                className={`min-h-[40px] sm:h-9 rounded-xs text-[11px] sm:text-xs font-bold text-white flex items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap ${
                  activeInfo === 'zajel'
                    ? 'bg-[var(--ych-primary-dark)]'
                    : 'bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)]'
                }`}
              >
                <Star className="w-3 h-3 shrink-0" />
                <span>زاجل</span>
              </button>
            </div>
            )}

            {/* Expandable Info Drawer when one of the 4 buttons is active */}
            {design.showPortalInfoBar !== false && activeInfo && (
              <div className="mx-2 mt-2 p-3 rounded-md bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-zinc-800 pb-1.5">
                  <span className="font-bold text-[var(--ych-primary)] dark:text-amber-300">
                    {activeInfo === 'zajel'
                      ? 'زاجل الحائط العام'
                      : activeInfo === 'rules'
                      ? 'قوانين وشروط الدردشة'
                      : activeInfo === 'faq'
                      ? 'الأسئلة الشائعة'
                      : 'التواصل مع الإدارة'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveInfo(null)}
                    aria-label="إغلاق"
                    className="p-1 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {activeInfo === 'zajel' && (
                  <div className="space-y-2 max-h-44 overflow-y-auto chat-scroll">
                    {wallPreview.length === 0 ? (
                      <p className="text-stone-500 dark:text-stone-400">
                        لا توجد رسائل زاجل منشورة حالياً. ادخل الشات وشارك أول خاطرة على الحائط!
                      </p>
                    ) : (
                      wallPreview.map((post) => (
                        <div
                          key={post.id}
                          className="p-2 rounded bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800"
                        >
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="font-bold" style={{ color: post.nameColor }}>
                              {post.username}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono-tabular">
                              {formatTime(post.timestamp)}
                            </span>
                          </div>
                          <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                            {post.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeInfo === 'rules' && (
                  <ul className="space-y-1.5 text-stone-600 dark:text-stone-300 leading-relaxed">
                    <li>1. الالتزام بالاحترام المتبادل بين جميع الزوار والأعضاء.</li>
                    <li>2. يمنع نشر الروابط الإعلانية أو الترويج لمواقع أخرى.</li>
                    <li>3. يمنع إثارة المواضيع السياسية أو الطائفية داخل الغرف.</li>
                    <li>4. للإدارة والمشرفين كامل الصلاحية في كتم أو طرد أو حظر المخالفين.</li>
                  </ul>
                )}

                {activeInfo === 'faq' && (
                  <div className="space-y-2 text-stone-600 dark:text-stone-300 leading-relaxed">
                    <p>
                      <strong className="text-stone-900 dark:text-stone-100">هل الدخول مجاني بدون تسجيل؟</strong>{' '}
                      نعم، يمكنك الدخول فوراً من تبويب «دخول الزوار» بكتابة اسمك المستعار.
                    </p>
                    <p>
                      <strong className="text-stone-900 dark:text-stone-100">كيف أحفظ اسمي وصورتي الرمزية؟</strong>{' '}
                      سجّل عضوية جديدة من تبويب «تسجيل عضوية» لحفظ اسمك وصورتك ورتبتك.
                    </p>
                  </div>
                )}

                {activeInfo === 'contact' && (
                  <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                    للتواصل مع إدارة {siteTitle} بخصوص الشكاوى أو طلبات الإشراف، يمكنك الدخول إلى الغرفة العامة والتواصل مباشرة عبر الرسائل الخاصة مع حساب الإدارة.
                  </p>
                )}
              </div>
            )}

            {/* 3-Tab Pill Container + Rounded Form (Exact Screenshot Rhythm) */}
            <div className="p-2.5 sm:p-4 space-y-2.5">
              {/* Outer Rounded Border Container for the 3 Mode Buttons */}
              <div
                role="tablist"
                aria-label="طريقة الدخول"
                className="grid grid-cols-3 gap-1 p-1 rounded-full border border-[#7d688a] dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'guest'}
                  onClick={() => {
                    setMode('guest');
                    setErrorMsg('');
                  }}
                  className={`min-h-[44px] px-1 sm:px-2 rounded-full text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap min-w-0 ${
                    mode === 'guest'
                      ? 'bg-[var(--ych-primary)] text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-900 text-[#2d586e] dark:text-stone-200 border border-stone-200 dark:border-zinc-800 hover:bg-stone-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="truncate">دخول الزوار</span>
                  <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className={`min-h-[44px] px-1 sm:px-2 rounded-full text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap min-w-0 ${
                    mode === 'login'
                      ? 'bg-[var(--ych-primary)] text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-900 text-[#2d586e] dark:text-stone-200 border border-stone-200 dark:border-zinc-800 hover:bg-stone-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="truncate">دخول الأعضاء</span>
                  <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                  }}
                  className={`min-h-[44px] px-1 sm:px-2 rounded-full text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap min-w-0 ${
                    mode === 'register'
                      ? 'bg-[var(--ych-primary)] text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-900 text-[#2d586e] dark:text-stone-200 border border-stone-200 dark:border-zinc-800 hover:bg-stone-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="truncate">تسجيل عضوية</span>
                  <UserPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2.5">
                <div>
                  <label htmlFor="chat-username" className="sr-only">
                    {mode === 'guest' ? 'أكتب الاسم المستعار' : 'أكتب اسم العضوية'}
                  </label>
                  <input
                    id="chat-username"
                    type="text"
                    maxLength={24}
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={mode === 'guest' ? 'أكتب الاسم المستعار' : 'أكتب اسم العضوية'}
                    className="w-full h-11 px-4 rounded-full bg-[#e9e9e9] dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-400 text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-[var(--ych-primary)]"
                  />
                </div>

                {mode !== 'guest' && (
                  <div className="space-y-2">
                    <label htmlFor="chat-password" className="sr-only">
                      كلمة المرور
                    </label>
                    <input
                      id="chat-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="أكتب كلمة المرور"
                      className="w-full h-11 px-4 rounded-full bg-[#e9e9e9] dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-400 text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-[var(--ych-primary)]"
                    />
                    {mode === 'login' && (
                      <label className="flex items-center justify-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isGhostLogin}
                          onChange={(e) => setIsGhostLogin(e.target.checked)}
                          className="w-4 h-4 accent-[var(--ych-primary)] rounded cursor-pointer"
                        />
                        <span>دخول شبحي مخفي (متاح للإدارة فقط)</span>
                      </label>
                    )}
                  </div>
                )}

                {mode === 'guest' && siteSettings?.allowGuestLogin === false && (
                  <div
                    role="status"
                    className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs text-center"
                  >
                    دخول الزوار مغلق حالياً من قبل الإدارة. يرجى الدخول من تبويب الأعضاء أو تسجيل عضوية.
                  </div>
                )}

                {errorMsg && (
                  <div
                    role="alert"
                    className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs text-center"
                  >
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    isSubmitting || (mode === 'guest' && siteSettings?.allowGuestLogin === false)
                  }
                  className="w-full h-12 px-5 rounded-full bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center transition-all disabled:opacity-60 cursor-pointer shadow-xs"
                >
                  <span>
                    {isSubmitting
                      ? 'جاري الدخول...'
                      : mode === 'register'
                      ? 'تسجيل العضوية والدخول'
                      : 'دخول'}
                  </span>
                </button>

                {/* Compact Customization Bar (Room / Avatar / Gender / Color) */}
                <div className="pt-1">
                  <div className="flex items-center justify-between gap-2 text-xs text-stone-600 dark:text-stone-400 px-1">
                    <span className="truncate">
                      <span>الغرفة: </span>
                      <strong className="text-stone-800 dark:text-stone-200">
                        {selectedRoom?.name || 'الغرفة العامة'}
                      </strong>
                      {mode !== 'login' && (
                        <span>
                          {' · '}
                          {gender === 'male' ? 'شاب' : 'فتاة'}
                          {' · '}
                          {country}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCustomize((v) => !v)}
                      className="inline-flex items-center gap-1 text-[var(--ych-primary)] dark:text-amber-300 font-semibold hover:underline shrink-0 cursor-pointer py-1"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>{showCustomize ? 'إخفاء الخيارات' : 'تخصيص الدخول'}</span>
                    </button>
                  </div>

                  {(showCustomize || mode === 'register') && (
                    <div className="mt-2 p-3 rounded-lg bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 space-y-3">
                      <div>
                        <label
                          htmlFor="initial-room"
                          className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1"
                        >
                          الغرفة عند الدخول
                        </label>
                        <select
                          id="initial-room"
                          value={selectedRoomId}
                          onChange={(e) => setSelectedRoomId(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-900 dark:text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#855853]"
                        >
                          {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.name} ({room.onlineCount} متصل)
                            </option>
                          ))}
                        </select>
                      </div>

                      {mode !== 'login' && (
                        <div key="guest-register-extras" className="space-y-3">
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <span className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                                الجنس
                              </span>
                              <div className="grid grid-cols-2 gap-1 p-1 bg-stone-200/70 dark:bg-zinc-800 rounded-lg">
                                <button
                                  type="button"
                                  onClick={() => setGender('male')}
                                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                                    gender === 'male'
                                      ? 'bg-white dark:bg-zinc-900 text-[#855853] dark:text-amber-300 shadow-xs'
                                      : 'text-stone-600 dark:text-stone-400'
                                  }`}
                                >
                                  شاب
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setGender('female')}
                                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                                    gender === 'female'
                                      ? 'bg-white dark:bg-zinc-900 text-[#855853] dark:text-amber-300 shadow-xs'
                                      : 'text-stone-600 dark:text-stone-400'
                                  }`}
                                >
                                  فتاة
                                </button>
                              </div>
                            </div>

                            <div>
                              <label
                                htmlFor="chat-country"
                                className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1"
                              >
                                المحافظة / البلد
                              </label>
                              <select
                                id="chat-country"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="w-full h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#855853]"
                              >
                                {COUNTRIES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <span className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                              لون الاسم
                            </span>
                            <div className="flex flex-wrap items-center gap-2.5">
                              {NAME_COLORS.map((swatch) => (
                                <button
                                  key={swatch.value}
                                  type="button"
                                  title={swatch.label}
                                  onClick={() => setNameColor(swatch.value)}
                                  className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full border-2 transition-transform active:scale-95 cursor-pointer ${
                                    nameColor === swatch.value
                                      ? 'border-stone-900 dark:border-white scale-110'
                                      : 'border-transparent hover:scale-105'
                                  }`}
                                  style={{ backgroundColor: swatch.value }}
                                  aria-label={swatch.label}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-1 border-t border-stone-200 dark:border-zinc-800">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar
                                avatarUrl={avatarUrl}
                                username={username || 'ضيف'}
                                size="md"
                              />
                              <div>
                                <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                                  الصورة الرمزية
                                </div>
                                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                                  اضغط لتوليد صورة عشوائية
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <label className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-zinc-800 text-xs font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-1 cursor-pointer">
                                <Upload className="w-3.5 h-3.5" />
                                <span>رفع GIF</span>
                                <input
                                  type="file"
                                  accept="image/gif,image/png,image/jpeg,image/webp,image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = '';
                                    if (!file) return;
                                    try {
                                      setErrorMsg('');
                                      const dataUri = await compressAvatarFile(file);
                                      setAvatarUrl(dataUri);
                                    } catch (err) {
                                      setErrorMsg(
                                        err instanceof Error ? err.message : 'تعذر قراءة الصورة'
                                      );
                                    }
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const randomStyle =
                                    AVATAR_STYLES[
                                      Math.floor(Math.random() * AVATAR_STYLES.length)
                                    ].id;
                                  setAvatarUrl(
                                    buildDiceBearSpec(randomStyle, generateRandomSeed())
                                  );
                                }}
                                className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-zinc-800 text-xs font-semibold text-[#855853] dark:text-amber-300 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Shuffle className="w-3.5 h-3.5" />
                                <span>توليد</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </form>
            </div>
          </section>

          {/* Left Column (Below form on mobile): Split Green/Taupe "متصل" Bar + Live User Banners + Rooms */}
          <section className="lg:col-span-7 flex flex-col gap-3">
            {/* Signature Split Status Header */}
            <div className="flex items-stretch rounded-xs overflow-hidden border border-[var(--ych-primary-dark)] dark:border-zinc-800 shadow-xs">
              <div
                style={{ backgroundColor: 'var(--ych-accent)' }}
                className="text-white px-5 py-1.5 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0"
              >
                متصل
              </div>
              <div className="flex-1 bg-[var(--ych-primary)] dark:bg-zinc-900 text-white/95 px-3 py-1.5 text-xs flex items-center justify-center truncate">
                <span>
                  {onlinePreview.length > 0 && design.showPortalOnlineList !== false
                    ? `المتواجدون الآن في غرف ${siteTitle}`
                    : `غرف الدردشة المفتوحة في ${siteTitle}`}
                </span>
              </div>
              <div
                style={{ backgroundColor: 'var(--ych-accent)' }}
                className="text-white px-3.5 py-1.5 font-bold text-xs sm:text-sm flex items-center gap-1.5 font-mono-tabular shrink-0"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{totalOnline}</span>
              </div>
            </div>

            {/* Live Connected Members Banner Cards */}
            {design.showPortalOnlineList !== false && onlinePreview.length > 0 && (
              <div className="space-y-1.5">
                {onlinePreview.map((user, idx) => {
                  const roomName =
                    rooms.find((r) => r.id === user.roomId)?.name || 'الغرفة العامة';
                  const level = computeUserLevel(user.likesCount);
                  return (
                    <div
                      key={user.id}
                      dir="ltr"
                      className={`relative min-h-[84px] sm:min-h-[96px] py-2 rounded-xs overflow-hidden border border-stone-200 dark:border-zinc-800 flex items-center gap-3 px-3 text-left shadow-2xs ${
                        idx % 2 === 0
                          ? 'bg-gradient-to-r from-white via-stone-50 to-[#f7ecee] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950'
                          : 'bg-gradient-to-r from-stone-50 via-white to-[#eef4f0] dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900'
                      }`}
                    >
                      {user.coverUrl && (
                        <img
                          src={user.coverUrl}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
                        />
                      )}

                      {/* Square User Avatar Thumbnail */}
                      <div className="relative z-10 shrink-0">
                        <UserAvatar
                          avatarUrl={user.avatarUrl}
                          username={user.username}
                          size="xl"
                        />
                      </div>

                      {/* Center Name, Quote & Room */}
                      <div className="relative z-10 flex-1 min-w-0 py-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {user.giftImageUrl ? (
                            <img
                              src={user.giftImageUrl}
                              alt={user.giftLabel || 'هدية'}
                              title={user.giftLabel ? `هدية: ${user.giftLabel}` : 'أيقونة هدية'}
                              referrerPolicy="no-referrer"
                              className="h-6 w-auto max-w-[44px] object-contain shrink-0"
                            />
                          ) : user.giftIcon ? (
                            <span
                              title={user.giftLabel ? `هدية: ${user.giftLabel}` : 'أيقونة هدية'}
                              className="text-lg leading-none shrink-0"
                            >
                              {user.giftIcon}
                            </span>
                          ) : null}
                          <span
                            className="font-display font-extrabold text-sm sm:text-base truncate"
                            style={{ color: user.nameColor }}
                          >
                            {user.username}
                          </span>
                          {user.statusIcon && (
                            <span
                              title={getStatusIconLabel(user.statusIcon) || user.statusText}
                              className="inline-flex items-center justify-center px-1 py-0.5 rounded-xs bg-white/80 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-xs leading-none shrink-0"
                            >
                              {user.statusIcon}
                            </span>
                          )}
                          <span className="text-[10px] font-mono-tabular font-bold px-1.5 py-0.5 rounded-xs bg-amber-100/90 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70">
                            LV {level}
                          </span>
                          <span className="text-[10px] font-mono-tabular font-bold px-1.5 py-0.5 rounded-xs bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/70 inline-flex items-center gap-1">
                            <Heart className="w-2.5 h-2.5 fill-current" />
                            <span>{formatCompactMetric(user.likesCount ?? 50)}</span>
                          </span>
                          <span dir="rtl" className="text-[11px] text-stone-500 dark:text-stone-400">
                            {getCountryFlag(user.country)} {user.country} · {roomName}
                          </span>
                        </div>
                        <p dir="auto" className="text-left text-xs sm:text-sm text-stone-700 dark:text-stone-300 line-clamp-2 mt-0.5 leading-snug">
                          {user.bio || user.statusText || 'متواجد في الدردشة'}
                        </p>
                      </div>

                      {/* Role / Corner Online Tag */}
                      <div className="relative z-10 flex flex-col items-end justify-between h-full py-2 shrink-0">
                        <span className="bg-[#44a948] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-xs">
                          متصل
                        </span>
                        <span className="text-[11px] font-mono-tabular font-semibold text-amber-700 dark:text-amber-300">
                          {ROLE_LABELS[user.role]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Open Chat Rooms Selector Feed */}
            <div
              id="rooms-directory"
              className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-md overflow-hidden shadow-xs"
            >
              <div className="px-4 py-2.5 bg-stone-50 dark:bg-zinc-950/60 border-b border-stone-200 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="font-display text-sm sm:text-base font-bold text-[var(--ych-primary)] dark:text-amber-300 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>غرف الدردشة المتاحة للدخول</span>
                </h2>
                <span className="text-xs text-stone-500 dark:text-stone-400 font-mono-tabular">
                  {rooms.length} غرف
                </span>
              </div>

              <div className="divide-y divide-stone-100 dark:divide-zinc-800">
                {rooms.map((room) => {
                  const isSelected = selectedRoomId === room.id;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`w-full px-3.5 py-3 flex items-center justify-between gap-3 text-right transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--ych-soft)] dark:bg-[#2c1c1b]'
                          : 'hover:bg-stone-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2.5">
                        <RoomThumbnail
                          imageUrl={room.imageUrl}
                          name={room.name}
                          size="md"
                          className="rounded-md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold text-sm truncate ${
                                isSelected
                                  ? 'text-[var(--ych-primary)] dark:text-amber-300'
                                  : 'text-stone-900 dark:text-stone-100'
                              }`}
                            >
                              {room.name}
                            </span>
                            {isSelected && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#44a948] shrink-0">
                                <Check className="w-3.5 h-3.5" />
                                <span>مختارة</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                            {room.topic || room.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-mono-tabular font-bold text-stone-700 dark:text-stone-300 shrink-0">
                        <Users className="w-3.5 h-3.5 text-[#44a948]" />
                        <span>{room.onlineCount}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
        <BannerStrip banners={siteSettings?.banners} placement="portal_bottom" className="mt-4" />
      </main>

      {/* Clean Classic Footer */}
      <footer className="relative z-10 border-t border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-3 px-4 text-center text-xs text-stone-600 dark:text-stone-400">
        {design.portalFooterText
          ? design.portalFooterText
          : `جميع الحقوق محفوظة © ${new Date().getFullYear()} ${siteTitle}`}
      </footer>
    </div>
  );
};
