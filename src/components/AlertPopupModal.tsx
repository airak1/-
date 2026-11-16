import React, { useState } from 'react';
import {
  X,
  Mail,
  MessageCircle,
  BadgeCheck,
  UserCheck,
  Ban,
  Send,
  Heart,
} from 'lucide-react';
import type { ChatUser } from '../types/chat';
import {
  formatCompactMetric,
  formatRelativeDate,
  getCountryFlag,
} from '../utils/chatHelpers';
import { UserAvatar } from './UserAvatar';

interface AlertPopupModalProps {
  alert: {
    kind?: 'alert' | 'like';
    badgeNumber?: number;
    fromUserId: string;
    fromUsername: string;
    fromNameColor?: string;
    fromAvatarUrl?: string;
    message: string;
    timestamp: number;
  };
  sender?: ChatUser;
  senderLikesCount?: number;
  isLikedByMe?: boolean;
  onClose: () => void;
  onStartPm: (user: ChatUser) => void;
  onOpenProfile: (user: ChatUser) => void;
  onReplyAlert: (targetUserId: string, message: string) => void;
  onToggleLike?: (targetUserId: string) => void;
  onIgnoreUser: (userId: string) => void;
}

export const AlertPopupModal: React.FC<AlertPopupModalProps> = ({
  alert,
  sender,
  senderLikesCount,
  isLikedByMe = false,
  onClose,
  onStartPm,
  onOpenProfile,
  onReplyAlert,
  onToggleLike,
  onIgnoreUser,
}) => {
  const [coverError, setCoverError] = useState(false);
  const [showReplyField, setShowReplyField] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);

  const handleSendReply = (customText?: string) => {
    const finalMsg = (customText ?? replyText).trim();
    if (!finalMsg) return;
    onReplyAlert(alert.fromUserId, finalMsg);
    setReplySent(true);
    setShowReplyField(false);
    setReplyText('');
    window.setTimeout(() => {
      onClose();
    }, 900);
  };

  const displayColor = sender?.nameColor || alert.fromNameColor || '#1c1917';
  const displayAvatar = sender?.avatarUrl || alert.fromAvatarUrl;
  const displayCountry = sender?.country || 'العراق';
  const isLikeAlert = alert.kind === 'like' || alert.message.includes('إعجاب');
  const displayLikesCount = senderLikesCount ?? sender?.likesCount ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/65 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-alert-title"
    >
      <div className="w-full max-w-sm max-h-[92dvh] flex flex-col bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-800 rounded-md shadow-2xl overflow-hidden">
        {/* Top Bar matching IMG_3497 */}
        <div
          className="px-3 py-2 dark:bg-zinc-950 text-white flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--ych-primary)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <UserAvatar
              avatarUrl={displayAvatar}
              username={alert.fromUsername}
              size="xs"
              className="rounded-xs border-white/40"
            />
            <span id="incoming-alert-title" className="font-bold text-sm truncate">
              {alert.fromUsername}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق التنبيه"
            className="w-6 h-6 rounded-full bg-white/25 hover:bg-white/40 text-white flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Card Body */}
        <div className="flex-1 overflow-y-auto chat-scroll">
          {/* Cover Banner behind the floating Alert Box */}
          <div className="relative h-32 sm:h-36 bg-gradient-to-b from-teal-900 via-amber-500/80 to-stone-900 overflow-hidden">
            {(!coverError || sender?.coverUrl) && (
              <img
                src={sender?.coverUrl || '/src/assets/images/portal_baghdad_heritage_1794757980500.jpg'}
                alt={`غلاف ${alert.fromUsername}`}
                referrerPolicy="no-referrer"
                onError={() => setCoverError(true)}
                className="w-full h-full object-cover opacity-90"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>

          {/* Floating Bordered "تنبيه" Box overlapping Cover & Profile Body (matching IMG_3497) */}
          <div className="-mt-20 sm:-mt-22 px-4 sm:px-5 relative z-20">
            <div className="flex justify-center -mb-3 relative z-10">
              <span
                className="px-4 py-1 rounded-xs border border-stone-800/85 dark:border-zinc-500 text-white text-xs font-extrabold shadow-sm"
                style={{ backgroundColor: 'var(--ych-primary)' }}
              >
                تنبيه
              </span>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-stone-800/85 dark:border-zinc-500 rounded-md shadow-xl px-3 pt-4 pb-3 space-y-2">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-200 dark:border-zinc-800">
                <button
                  type="button"
                  disabled={!sender}
                  onClick={() => {
                    if (sender) {
                      onOpenProfile(sender);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-2 min-w-0 text-right cursor-pointer disabled:cursor-default hover:opacity-85"
                >
                  <UserAvatar
                    avatarUrl={displayAvatar}
                    username={alert.fromUsername}
                    size="xs"
                    className="rounded-xs shrink-0"
                  />
                  <span
                    className="font-bold text-sm truncate"
                    style={{ color: displayColor }}
                  >
                    {alert.fromUsername}
                  </span>
                  {(!sender || sender.role !== 'visitor') && (
                    <BadgeCheck className="w-4 h-4 text-[#1d9bf0] fill-[#1d9bf0] stroke-white shrink-0" />
                  )}
                </button>

                <span className="text-xs font-mono-tabular text-stone-400 dark:text-stone-500 shrink-0">
                  #{alert.badgeNumber ?? 52}
                </span>
              </div>

              {isLikeAlert ? (
                <p
                  dir="rtl"
                  className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-relaxed flex items-center gap-1.5"
                >
                  <span>{alert.message.replace('❤️', '').trim() || 'حصلت على إعجاب'}</span>
                  <Heart className="w-4 h-4 fill-red-500 text-red-500 shrink-0" />
                </p>
              ) : (
                <p
                  dir="auto"
                  className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-relaxed break-words"
                >
                  {alert.message}
                </p>
              )}
            </div>
          </div>

          <div className="px-3.5 pb-4 pt-2.5 space-y-2.5">
            {/* Country Flag & Relative Time Row */}
            <div
              dir="ltr"
              className="flex items-center justify-between gap-2 px-1 text-xs font-bold text-stone-700 dark:text-stone-300"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-lg leading-none" aria-hidden="true">
                  {getCountryFlag(displayCountry)}
                </span>
                <span>{displayCountry}</span>
              </div>
              <span className="text-[11px] font-normal text-stone-400 dark:text-stone-500">
                {formatRelativeDate(alert.timestamp)}
              </span>
            </div>

            {replySent && (
              <div className="text-center text-xs font-bold text-[#44a948]">
                تم إرسال الرد على التنبيه ✓
              </div>
            )}

            {/* Quick Reply Alert Box */}
            {showReplyField && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendReply();
                }}
                className="p-2.5 rounded-sm border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-2xs space-y-2"
              >
                <div className="flex flex-wrap gap-1 justify-center">
                  {['أهلاً بك!', 'شكراً ❤️', 'تم ✓', 'تعال خاص'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSendReply(preset)}
                      className="px-2.5 py-1 rounded-xs border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-900 hover:bg-[var(--ych-primary)] hover:text-white text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    maxLength={120}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب رداً بتنبيه..."
                    className="flex-1 min-w-0 h-9 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--ych-primary)]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="h-9 px-3 rounded-xs bg-[#44a948] hover:bg-[#3a963e] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>إرسال</span>
                  </button>
                </div>
              </form>
            )}

            {/* Action Grid matching IMG_3497 */}
            <div className="bg-stone-100/90 dark:bg-zinc-950/70 p-2 rounded-sm border border-stone-200/80 dark:border-zinc-800 space-y-1.5">
              {/* Row 1: محادثه خاصه | تنبيه | ❤️ Likes */}
              <div className="grid grid-cols-3 gap-1.5">
                {sender ? (
                  <button
                    type="button"
                    onClick={() => {
                      onStartPm(sender);
                      onClose();
                    }}
                    className="h-10 px-1.5 rounded-sm border border-stone-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-900 dark:text-stone-100 text-xs font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-current shrink-0" />
                    <span className="truncate">محادثه خاصه</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-10 px-1.5 rounded-sm border border-stone-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-400 text-xs font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>غير متصل</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowReplyField((v) => !v)}
                  className={`h-10 px-1.5 rounded-sm border text-xs font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-colors ${
                    showReplyField
                      ? 'border-[var(--ych-primary)] bg-[var(--ych-primary)] text-white'
                      : 'border-stone-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-900 dark:text-stone-100'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>تنبيه</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onToggleLike) {
                      onToggleLike(alert.fromUserId);
                    }
                  }}
                  aria-pressed={isLikedByMe}
                  title={isLikedByMe ? 'إلغاء الإعجاب' : 'إعجاب بالعضو (+1 لايك)'}
                  className={`h-10 px-1.5 rounded-sm border text-xs font-bold font-mono-tabular flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-transform active:scale-95 ${
                    isLikedByMe
                      ? 'border-red-700 bg-[#b83737] text-white'
                      : 'border-[#b94444] bg-[#c94a4a] hover:bg-[#b53d3d] text-white'
                  }`}
                >
                  <Heart className="w-4 h-4 fill-red-200 text-white shrink-0" />
                  <span>{formatCompactMetric(displayLikesCount)}</span>
                </button>
              </div>

              {/* Row 2: تجاهل | ملف العضو */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onIgnoreUser(alert.fromUserId);
                    onClose();
                  }}
                  className="h-10 px-3 rounded-sm border border-stone-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-red-50/60 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Ban className="w-4 h-4 shrink-0" />
                  <span>تجاهل</span>
                </button>

                <button
                  type="button"
                  disabled={!sender}
                  onClick={() => {
                    if (sender) {
                      onOpenProfile(sender);
                      onClose();
                    }
                  }}
                  className="h-10 px-3 rounded-sm border border-stone-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800 disabled:opacity-50 text-stone-800 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>ملف العضو</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
