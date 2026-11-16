import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  User as UserIcon,
  Maximize2,
  Minimize2,
  Minus,
  Share2,
  Send,
  ImagePlus,
  Heart,
  Bell,
  Search,
  X,
  ZoomIn,
  MessageCircle,
} from 'lucide-react';
import type {
  ChatUser,
  CustomSmiley,
  PrivateMessage,
  UserProfileStats,
} from '../types/chat';
import {
  EMOJI_GROUPS,
  formatCompactMetric,
  readImageFileWithGifSupport,
} from '../utils/chatHelpers';
import { UserAvatar } from './UserAvatar';
import { RichSmileyText } from './RichSmileyText';
import { ImageLightboxModal, type LightboxImagePayload } from './ImageLightboxModal';

interface FloatingPrivateChatProps {
  self: ChatUser;
  partnerId: string;
  onlineUsers: ChatUser[];
  messages: PrivateMessage[];
  customSmileys?: CustomSmiley[];
  userStatsMap?: Record<string, UserProfileStats>;
  unreadOthersCount?: number;
  canSendImages?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
  onOpenList?: () => void;
  onSendPm: (toUserId: string, text: string, textColor: string, imageUrl?: string) => void;
  onToggleLikeUser?: (targetUserId: string) => void;
  onAlertUser?: (targetUserId: string, message?: string) => void;
  onOpenUserProfile?: (user: ChatUser) => void;
}

function formatCompactPmTime(timestamp: number): string {
  const diffMin = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (diffMin === 0) return 'الآن';
  if (diffMin < 60) return `${diffMin}د`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}س`;
  return new Date(timestamp).toLocaleTimeString('ar-IQ', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const FloatingPrivateChat: React.FC<FloatingPrivateChatProps> = ({
  self,
  partnerId,
  onlineUsers,
  messages,
  customSmileys = [],
  userStatsMap = {},
  unreadOthersCount = 0,
  canSendImages = true,
  isExpanded,
  onToggleExpand,
  onClose,
  onOpenList,
  onSendPm,
  onToggleLikeUser,
  onAlertUser,
  onOpenUserProfile,
}) => {
  const [draft, setDraft] = useState('');
  const [showSmileys, setShowSmileys] = useState(false);
  const [showToolsTray, setShowToolsTray] = useState(false);
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState('');
  const [pendingImage, setPendingImage] = useState<string | undefined>(undefined);
  const [uploadError, setUploadError] = useState('');
  const [alertSentFlash, setAlertSentFlash] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<LightboxImagePayload | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const thread = useMemo(
    () =>
      messages.filter(
        (pm) =>
          (pm.fromUserId === self.id && pm.toUserId === partnerId) ||
          (pm.fromUserId === partnerId && pm.toUserId === self.id)
      ),
    [messages, self.id, partnerId]
  );

  const partnerOnline = useMemo(
    () => onlineUsers.find((u) => u.id === partnerId),
    [onlineUsers, partnerId]
  );

  const partnerInfo = useMemo(() => {
    if (partnerOnline) {
      return {
        userId: partnerOnline.id,
        username: partnerOnline.username,
        nameColor: partnerOnline.nameColor,
        avatarUrl: partnerOnline.avatarUrl,
        isOnline: true,
        userObj: partnerOnline,
      };
    }
    const lastPartnerMsg = [...thread]
      .reverse()
      .find((m) => m.fromUserId === partnerId || m.toUserId === partnerId);
    const fallbackName = lastPartnerMsg
      ? lastPartnerMsg.fromUserId === partnerId
        ? lastPartnerMsg.fromUsername
        : lastPartnerMsg.toUsername
      : 'عضو';
    const fallbackColor =
      lastPartnerMsg && lastPartnerMsg.fromUserId === partnerId
        ? lastPartnerMsg.fromNameColor
        : '#1c1917';
    const fallbackAvatar =
      lastPartnerMsg && lastPartnerMsg.fromUserId === partnerId
        ? lastPartnerMsg.fromAvatarUrl
        : undefined;
    const fallbackUser: ChatUser = {
      id: partnerId,
      username: fallbackName,
      isGuest: false,
      role: 'member',
      gender: 'male',
      nameColor: fallbackColor,
      statusText: '',
      bio: '',
      avatarSymbol: '',
      avatarUrl: fallbackAvatar,
      roomId: self.roomId,
      joinedAt: Date.now(),
      isMuted: false,
      country: '',
    };
    return {
      userId: partnerId,
      username: fallbackName,
      nameColor: fallbackColor,
      avatarUrl: fallbackAvatar,
      isOnline: false,
      userObj: fallbackUser,
    };
  }, [partnerOnline, thread, partnerId, self.roomId]);

  const partnerStats = userStatsMap[partnerId];
  const partnerLikes = partnerStats?.likes || [];
  const isPartnerLiked = partnerLikes.includes(self.id);

  const displayedThread = useMemo(() => {
    const q = msgSearchQuery.trim().toLowerCase();
    if (!showMsgSearch || !q) return thread;
    return thread.filter((pm) => (pm.text || '').toLowerCase().includes(q));
  }, [thread, showMsgSearch, msgSearchQuery]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.length, partnerId, isExpanded]);

  useEffect(() => {
    setPendingImage(undefined);
    setShowSmileys(false);
    setShowToolsTray(false);
    setShowMsgSearch(false);
    setMsgSearchQuery('');
    setUploadError('');
    setAlertSentFlash(false);
  }, [partnerId]);

  const handleAttachImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const processed = await readImageFileWithGifSupport(file);
      setPendingImage(processed);
      setShowToolsTray(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'تعذر قراءة الصورة أو ملف GIF.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() && !pendingImage) return;
    onSendPm(partnerId, draft.trim(), '', pendingImage);
    setDraft('');
    setPendingImage(undefined);
    setShowSmileys(false);
    setShowToolsTray(false);
    inputRef.current?.focus();
  };

  return (
    <>
      <div
        className={`${
          isExpanded
            ? 'absolute inset-0 z-30'
            : 'absolute top-0 left-0 right-0 z-30 h-[52%] min-h-[240px] max-h-[64%] border-b-2 border-stone-400/90 dark:border-zinc-700 shadow-[0_8px_24px_rgba(0,0,0,0.28)]'
        } flex flex-col bg-white dark:bg-zinc-950 overflow-hidden`}
      >
        {/* Top Header Bar matching IMG_3508 */}
        <div
          dir="ltr"
          className="bg-[#c9c0b8] dark:bg-zinc-800 border-b border-stone-500/70 dark:border-zinc-700 px-1.5 py-1 flex items-center justify-between gap-1.5 shrink-0"
        >
          {/* Left: Profile button + Partner avatar + Partner name */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onOpenUserProfile?.(partnerInfo.userObj)}
              title="عرض ملف العضو"
              aria-label="عرض ملف العضو"
              className="w-8 h-7 rounded-xs bg-[#e8e3de] hover:bg-white dark:bg-zinc-700 dark:hover:bg-zinc-600 border border-stone-500/70 dark:border-zinc-600 text-stone-700 dark:text-stone-100 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
            >
              <UserIcon className="w-4 h-4 fill-current opacity-85" />
            </button>

            <button
              type="button"
              onClick={() => onOpenUserProfile?.(partnerInfo.userObj)}
              className="flex items-center gap-1.5 min-w-0 cursor-pointer group"
            >
              <div className="relative shrink-0">
                <UserAvatar
                  avatarUrl={partnerInfo.avatarUrl}
                  username={partnerInfo.username}
                  size="sm"
                  className="!w-7 !h-7 rounded-xs border border-stone-500/60"
                />
                {partnerInfo.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#44a948] border border-white dark:border-zinc-800" />
                )}
              </div>
              <span
                className="font-bold text-sm text-stone-950 dark:text-stone-100 truncate group-hover:underline"
                style={{ color: partnerInfo.nameColor || undefined }}
              >
                {partnerInfo.username}
              </span>
            </button>

            {onOpenList && unreadOthersCount > 0 && (
              <button
                type="button"
                onClick={onOpenList}
                title="رسائل خاصة أخرى غير مقروءة"
                className="ml-1 px-1.5 py-0.5 rounded-xs bg-[#a93226] text-white text-[10px] font-bold font-mono-tabular flex items-center gap-1 shrink-0 cursor-pointer animate-pulse"
              >
                <MessageCircle className="w-3 h-3" />
                <span>{unreadOthersCount}</span>
              </button>
            )}
          </div>

          {/* Right: Sky-blue Expand/Shrink button + Red Minus Close button */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onToggleExpand}
              title={isExpanded ? 'تصغير نافذة الخاص' : 'تكبير نافذة الخاص'}
              aria-label={isExpanded ? 'تصغير نافذة الخاص' : 'تكبير نافذة الخاص'}
              className="w-9 h-7 rounded-xs bg-[#4eb6d9] hover:bg-[#3aa4c7] border border-sky-700/50 text-white flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform shadow-2xs"
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4 stroke-[2.4]" />
              ) : (
                <Maximize2 className="w-4 h-4 stroke-[2.4]" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              title="إغلاق نافذة الخاص"
              aria-label="إغلاق نافذة الخاص"
              className="w-9 h-7 rounded-xs bg-[#d64541] hover:bg-[#bf3632] border border-red-900/50 text-white flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform shadow-2xs"
            >
              <Minus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Optional Inline Search Bar */}
        {showMsgSearch && (
          <div className="px-2 py-1 border-b border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 flex items-center gap-1.5 shrink-0">
            <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <input
              type="text"
              value={msgSearchQuery}
              onChange={(e) => setMsgSearchQuery(e.target.value)}
              placeholder="بحث داخل رسائل الخاص..."
              className="flex-1 min-w-0 h-7 px-2 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-stone-900 dark:text-stone-100 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setMsgSearchQuery('');
                setShowMsgSearch(false);
              }}
              aria-label="إغلاق البحث"
              className="w-7 h-7 rounded-xs text-stone-500 hover:text-red-600 flex items-center justify-center cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Crisp White Messages Area */}
        <div className="flex-1 min-h-0 overflow-y-auto chat-scroll bg-white dark:bg-zinc-950 divide-y divide-stone-100 dark:divide-zinc-900">
          {displayedThread.length === 0 ? (
            <div className="h-full flex items-center justify-center p-4 text-center text-xs text-stone-400 dark:text-stone-500">
              {showMsgSearch && msgSearchQuery.trim()
                ? `لا توجد رسائل تطابق "${msgSearchQuery.trim()}"`
                : `ابدأ المحادثة الخاصة مع ${partnerInfo.username}...`}
            </div>
          ) : (
            displayedThread.map((pm) => {
              const isMine = pm.fromUserId === self.id;
              const senderName = isMine ? self.username : pm.fromUsername;
              const senderColor = isMine
                ? self.nameColor || '#991b1b'
                : partnerOnline?.nameColor || pm.fromNameColor || '#1c1917';
              const senderAvatar = isMine
                ? self.avatarUrl
                : partnerOnline?.avatarUrl ?? pm.fromAvatarUrl;
              return (
                <div
                  key={pm.id}
                  dir="ltr"
                  className={`px-2 py-1.5 flex items-start gap-2 text-left ${
                    isMine
                      ? 'bg-[#faf6f6] dark:bg-zinc-900/50'
                      : 'bg-white dark:bg-zinc-950'
                  }`}
                >
                  <UserAvatar
                    avatarUrl={senderAvatar}
                    username={senderName}
                    size="sm"
                    className="!w-9 !h-9 rounded-xs shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="font-bold text-[13px] leading-tight truncate text-left"
                        style={{ color: senderColor }}
                      >
                        {senderName}
                      </span>
                      <span
                        dir="rtl"
                        className="text-[10px] text-stone-400 dark:text-stone-500 font-mono-tabular shrink-0"
                      >
                        {formatCompactPmTime(pm.timestamp)}
                      </span>
                    </div>
                    {pm.text && (
                      <p
                        dir="rtl"
                        className="mt-0.5 text-[13px] sm:text-sm leading-snug font-medium text-stone-900 dark:text-stone-100 whitespace-pre-wrap break-words text-right"
                      >
                        <RichSmileyText
                          text={pm.text}
                          smileys={customSmileys}
                          highlightQuery={showMsgSearch ? msgSearchQuery.trim() : ''}
                        />
                      </p>
                    )}
                    {pm.imageUrl && (
                      <div className="mt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setZoomedImage({
                              src: pm.imageUrl!,
                              alt: `صورة في الخاص من ${senderName}`,
                            })
                          }
                          className="group/pmimg relative inline-block rounded-md border border-stone-200 dark:border-zinc-700 overflow-hidden cursor-zoom-in active:scale-[0.99] transition-transform"
                          aria-label="تكبير الصورة"
                        >
                          <img
                            src={pm.imageUrl}
                            alt="صورة في الخاص"
                            referrerPolicy="no-referrer"
                            className="max-h-60 sm:max-h-72 max-w-full rounded-md object-contain"
                          />
                          <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-85 sm:opacity-0 sm:group-hover/pmimg:opacity-100 transition-opacity pointer-events-none">
                            <ZoomIn className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {/* Upload error notice */}
        {uploadError && (
          <div className="px-2.5 py-1 border-t border-red-200 bg-red-50 dark:bg-red-950/50 text-[11px] text-red-700 dark:text-red-300 flex items-center justify-between gap-2 shrink-0">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError('')}
              className="cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Pending image preview */}
        {pendingImage && (
          <div className="px-2.5 py-1.5 border-t border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 flex items-center gap-2 shrink-0">
            <div className="relative inline-block">
              <img
                src={pendingImage}
                alt="معاينة"
                referrerPolicy="no-referrer"
                className="h-14 max-w-[140px] rounded border border-stone-300 dark:border-zinc-700 object-contain"
              />
              <button
                type="button"
                onClick={() => setPendingImage(undefined)}
                aria-label="إزالة الصورة"
                className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              صورة جاهزة للإرسال في الخاص
            </span>
          </div>
        )}

        {/* Tools tray (opened from the left Share/Attach button) */}
        {showToolsTray && (
          <div className="px-2 py-1.5 border-t border-stone-300 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-900 flex flex-wrap items-center gap-1.5 shrink-0">
            {canSendImages && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/gif,image/png,image/jpeg,image/webp,image/*"
                  onChange={handleAttachImage}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 px-2.5 rounded-xs bg-white dark:bg-zinc-800 border border-stone-300 dark:border-zinc-700 text-xs font-bold text-[var(--ych-primary)] dark:text-amber-300 flex items-center gap-1 cursor-pointer hover:bg-stone-50"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>صورة / GIF</span>
                </button>
              </>
            )}

            {onToggleLikeUser && (
              <button
                type="button"
                onClick={() => onToggleLikeUser(partnerId)}
                className={`h-7 px-2.5 rounded-xs border text-xs font-bold flex items-center gap-1 cursor-pointer ${
                  isPartnerLiked
                    ? 'bg-red-50 border-red-300 text-red-600 dark:bg-red-950/50 dark:border-red-800 dark:text-red-300'
                    : 'bg-white dark:bg-zinc-800 border-stone-300 dark:border-zinc-700 text-red-600 dark:text-red-400'
                }`}
              >
                <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                <span>
                  {formatCompactMetric(
                    partnerStats?.likesCount ?? partnerOnline?.likesCount ?? partnerLikes.length
                  )}
                </span>
              </button>
            )}

            {onAlertUser && partnerInfo.isOnline && (
              <button
                type="button"
                onClick={() => {
                  onAlertUser(partnerId, 'نبهك في المحادثة الخاصة 🔔');
                  setAlertSentFlash(true);
                  window.setTimeout(() => setAlertSentFlash(false), 1800);
                }}
                className="h-7 px-2.5 rounded-xs bg-white dark:bg-zinc-800 border border-stone-300 dark:border-zinc-700 text-xs font-bold text-stone-800 dark:text-stone-100 flex items-center gap-1 cursor-pointer hover:bg-amber-50"
              >
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                <span>{alertSentFlash ? 'تم ✓' : 'تنبيه'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowMsgSearch((v) => !v);
                setShowToolsTray(false);
              }}
              className="h-7 px-2.5 rounded-xs bg-white dark:bg-zinc-800 border border-stone-300 dark:border-zinc-700 text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>بحث</span>
            </button>
          </div>
        )}

        {/* Emoji & Custom Smileys Picker */}
        {showSmileys && (
          <div className="px-2 py-1.5 border-t border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 max-h-36 overflow-y-auto chat-scroll space-y-1.5 shrink-0">
            {customSmileys.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {customSmileys.map((sm) => (
                  <button
                    key={sm.id}
                    type="button"
                    title={`${sm.label} (${sm.code})`}
                    onClick={() =>
                      setDraft((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${sm.code} `)
                    }
                    className="w-7 h-7 rounded border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 flex items-center justify-center cursor-pointer"
                  >
                    <img
                      src={sm.imageUrl}
                      alt={sm.label}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-8 sm:grid-cols-12 gap-1">
              {EMOJI_GROUPS.flatMap((g) => g.items).map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setDraft((prev) => `${prev}${em}`)}
                  className="h-8 rounded hover:bg-stone-100 dark:hover:bg-zinc-800 text-base flex items-center justify-center cursor-pointer active:scale-90"
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Composer Bar matching IMG_3508 */}
        <form
          dir="ltr"
          onSubmit={handleSubmit}
          className="bg-[#c9c0b8] dark:bg-zinc-800 border-t border-stone-500/70 dark:border-zinc-700 px-1 py-1 flex items-center gap-1 shrink-0"
        >
          <button
            type="button"
            onClick={() => {
              setShowToolsTray((v) => !v);
              setShowSmileys(false);
            }}
            title="إرفاق صورة أو تنبيه"
            aria-label="إرفاق صورة أو تنبيه"
            className={`w-11 h-8 rounded-xs border border-black/25 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform ${
              showToolsTray
                ? 'bg-[#7f2219] text-amber-200'
                : 'bg-[#a93226] hover:bg-[#8e281e] text-white'
            }`}
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowSmileys((v) => !v);
              setShowToolsTray(false);
            }}
            title="الرموز التعبيرية والسمايلات"
            aria-label="الرموز التعبيرية والسمايلات"
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
          >
            <span className="w-7 h-7 rounded-full bg-[#ffe033] border-[1.5px] border-[#574100] flex items-center justify-center shadow-2xs">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
                <path
                  d="M7.5 9.5C7.8 8.3 9.2 8.3 9.5 9.5"
                  stroke="#1f1600"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
                <path
                  d="M14.5 9.5C14.8 8.3 16.2 8.3 16.5 9.5"
                  stroke="#1f1600"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
                <path
                  d="M7.5 13.8C8.8 16.4 15.2 16.4 16.5 13.8"
                  stroke="#1f1600"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </button>

          <input
            ref={inputRef}
            type="text"
            dir="auto"
            maxLength={600}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="اكتب رسالتك هنا"
            className="flex-1 min-w-0 h-8 px-2.5 rounded-xs border border-stone-500/60 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-right text-stone-900 dark:text-stone-100 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!draft.trim() && !pendingImage}
            title="إرسال"
            aria-label="إرسال"
            className="w-11 h-8 rounded-xs bg-[#a93226] hover:bg-[#8e281e] text-white border border-black/25 disabled:opacity-55 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      <ImageLightboxModal image={zoomedImage} onClose={() => setZoomedImage(null)} />
    </>
  );
};
