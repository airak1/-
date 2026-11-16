import React, { useMemo, useState } from 'react';
import {
  X,
  Bell,
  AtSign,
  Heart,
  MessageCircle,
  Trophy,
  Megaphone,
  CheckCheck,
  Trash2,
  UserCheck,
  Mail,
} from 'lucide-react';
import type { ChatUser, MemberNotification, MemberNotificationKind } from '../types/chat';
import { formatRelativeDate } from '../utils/chatHelpers';
import { UserAvatar } from './UserAvatar';

type FilterTab = 'all' | 'alert' | 'like' | 'activity';

interface NotificationsModalProps {
  notifications: MemberNotification[];
  onlineUsers: ChatUser[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onOpenUserProfile: (user: ChatUser) => void;
  onStartPm: (user: ChatUser) => void;
  onAlertUser?: (targetUserId: string, message?: string) => void;
}

function getKindMeta(kind: MemberNotificationKind): {
  label: string;
  Icon: React.FC<{ className?: string }>;
  badgeClass: string;
} {
  switch (kind) {
    case 'alert':
      return {
        label: 'تنبيه خاص',
        Icon: Bell,
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
      };
    case 'mention':
      return {
        label: 'منشن',
        Icon: AtSign,
        badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
      };
    case 'like':
      return {
        label: 'إعجاب',
        Icon: Heart,
        badgeClass: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
      };
    case 'wall':
      return {
        label: 'الحائط',
        Icon: MessageCircle,
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
      };
    case 'game':
      return {
        label: 'تحدي ألعاب',
        Icon: Trophy,
        badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
      };
    case 'admin':
    default:
      return {
        label: 'إعلان إداري',
        Icon: Megaphone,
        badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
      };
  }
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  onlineUsers,
  onClose,
  onMarkAllRead,
  onClearAll,
  onOpenUserProfile,
  onStartPm,
  onAlertUser,
}) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sentAlertIds, setSentAlertIds] = useState<Record<string, boolean>>({});
  const unreadCount = notifications.filter((n) => !n.read).length;

  const counts = useMemo(
    () => ({
      all: notifications.length,
      alert: notifications.filter((n) => n.kind === 'alert').length,
      like: notifications.filter((n) => n.kind === 'like').length,
      activity: notifications.filter(
        (n) => n.kind !== 'alert' && n.kind !== 'like'
      ).length,
    }),
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (filterTab === 'all') return notifications;
    if (filterTab === 'alert') return notifications.filter((n) => n.kind === 'alert');
    if (filterTab === 'like') return notifications.filter((n) => n.kind === 'like');
    return notifications.filter((n) => n.kind !== 'alert' && n.kind !== 'like');
  }, [notifications, filterTab]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/65 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-modal-title"
    >
      <div className="w-full max-w-md max-h-[88dvh] flex flex-col bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-800 rounded-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className="px-3.5 py-2.5 dark:bg-zinc-950 text-white border-b border-black/20 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--ych-primary)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-4 h-4 text-amber-200 shrink-0" />
            <h2 id="notifications-modal-title" className="font-display font-bold text-sm sm:text-base truncate">
              التنبيهات والإعجابات
            </h2>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-xs bg-[#44a948] text-white text-[11px] font-bold font-mono-tabular">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق التنبيهات"
            className="w-9 h-9 sm:w-7 sm:h-7 rounded-full bg-white/25 hover:bg-white/40 text-white flex items-center justify-center shrink-0 cursor-pointer active:scale-90 transition-transform"
          >
            <X className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="px-2.5 py-2 bg-stone-100/90 dark:bg-zinc-950 border-b border-stone-200 dark:border-zinc-800 grid grid-cols-4 gap-1 shrink-0">
          {(
            [
              { id: 'all', label: 'الكل', count: counts.all },
              { id: 'alert', label: 'التنبيهات', count: counts.alert },
              { id: 'like', label: 'الإعجابات', count: counts.like },
              { id: 'activity', label: 'التفاعل', count: counts.activity },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilterTab(t.id)}
              className={`h-9 sm:h-8 px-1.5 rounded-xs border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 ${
                filterTab === t.id
                  ? 'bg-[var(--ych-primary)] border-[var(--ych-primary-dark)] text-white shadow-2xs'
                  : 'bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="truncate">{t.label}</span>
              {t.count > 0 && (
                <span
                  className={`font-mono-tabular text-[10px] ${
                    filterTab === t.id ? 'text-white/90' : 'text-stone-400'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Action Toolbar */}
        {notifications.length > 0 && (
          <div className="px-3 py-1.5 bg-stone-50 dark:bg-zinc-950 border-b border-stone-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
              className="h-9 sm:h-8 px-2.5 rounded-xs bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700 hover:bg-stone-100 dark:hover:bg-zinc-800 disabled:opacity-50 text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#44a948]" />
              <span>تحديد الكل كمقروء</span>
            </button>

            <button
              type="button"
              onClick={onClearAll}
              className="h-9 sm:h-8 px-2.5 rounded-xs bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/70 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح الكل</span>
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto chat-scroll divide-y divide-stone-200/80 dark:divide-zinc-800">
          {filteredNotifications.length === 0 ? (
            <div className="py-14 px-6 text-center space-y-2">
              <Bell className="w-8 h-8 mx-auto text-stone-300 dark:text-zinc-700" />
              <p className="text-sm font-bold text-stone-600 dark:text-stone-300">
                {notifications.length === 0
                  ? 'لا توجد تنبيهات أو إعجابات حالياً'
                  : 'لا توجد عناصر ضمن هذا القسم'}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                ستصلك هنا تنبيهات الأعضاء المباشرة، الإعجابات بملفك ❤️، المنشن @، وتفاعلات الحائط.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const meta = getKindMeta(notif.kind);
              const KindIcon = meta.Icon;
              const onlineSender = onlineUsers.find((u) => u.id === notif.fromUserId);
              const alertReplied = sentAlertIds[notif.id];

              return (
                <div
                  key={notif.id}
                  dir="ltr"
                  className={`px-3 py-2.5 flex items-start gap-2.5 text-left transition-colors ${
                    !notif.read
                      ? 'bg-[var(--ych-soft)] dark:bg-amber-950/20'
                      : 'bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <button
                    type="button"
                    disabled={!onlineSender}
                    onClick={() => {
                      if (onlineSender) {
                        onOpenUserProfile(onlineSender);
                        onClose();
                      }
                    }}
                    className={`shrink-0 ${onlineSender ? 'cursor-pointer' : 'cursor-default'}`}
                    aria-label={notif.fromUsername}
                  >
                    <UserAvatar
                      avatarUrl={onlineSender?.avatarUrl || notif.fromAvatarUrl}
                      username={notif.fromUsername}
                      size="md"
                      className="rounded-xs"
                    />
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span
                          className="font-bold text-xs sm:text-sm truncate"
                          style={notif.fromNameColor ? { color: notif.fromNameColor } : undefined}
                        >
                          {notif.fromUsername}
                        </span>
                        <span
                          dir="rtl"
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[10px] font-bold ${meta.badgeClass}`}
                        >
                          <KindIcon className="w-3 h-3" />
                          <span>{meta.label}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!notif.read && (
                          <span
                            className="w-2 h-2 rounded-full bg-[#44a948]"
                            title="غير مقروء"
                          />
                        )}
                        <span dir="rtl" className="text-[11px] text-stone-400 dark:text-stone-500 font-mono-tabular">
                          {formatRelativeDate(notif.timestamp)}
                        </span>
                      </div>
                    </div>

                    <p
                      dir="auto"
                      className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 text-left leading-relaxed break-words"
                    >
                      {notif.message}
                    </p>

                    {onlineSender && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onOpenUserProfile(onlineSender);
                            onClose();
                          }}
                          className="h-9 sm:h-7 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-stone-100 dark:hover:bg-zinc-800 text-[11px] font-bold text-stone-700 dark:text-stone-200 inline-flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          <UserCheck className="w-3 h-3 text-[var(--ych-primary)] dark:text-amber-300" />
                          <span>ملف العضو</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onStartPm(onlineSender);
                            onClose();
                          }}
                          className="h-9 sm:h-7 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-stone-100 dark:hover:bg-zinc-800 text-[11px] font-bold text-stone-700 dark:text-stone-200 inline-flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          <MessageCircle className="w-3 h-3 text-[#44a948]" />
                          <span>محادثة خاصة</span>
                        </button>
                        {onAlertUser && notif.kind === 'alert' && (
                          <button
                            type="button"
                            onClick={() => {
                              onAlertUser(onlineSender.id, 'وصلني تنبيهك 👋');
                              setSentAlertIds((prev) => ({ ...prev, [notif.id]: true }));
                            }}
                            className="h-9 sm:h-7 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-stone-100 dark:hover:bg-zinc-800 text-[11px] font-bold text-stone-700 dark:text-stone-200 inline-flex items-center gap-1 cursor-pointer active:scale-95"
                          >
                            <Mail className="w-3 h-3 text-amber-600" />
                            <span>{alertReplied ? 'تم الرد ✓' : 'رد بتنبيه'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
