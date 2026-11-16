import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Send,
  MessageCircle,
  ArrowRight,
  Smile,
  Heart,
  Bell,
  ImagePlus,
  Search,
  UserCheck,
  BadgeCheck,
  X,
  ChevronUp,
  ChevronDown,
  ZoomIn,
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
  formatTime,
  getCountryFlag,
  readImageFileWithGifSupport,
} from '../utils/chatHelpers';
import { UserAvatar } from './UserAvatar';
import { RichSmileyText } from './RichSmileyText';
import { ImageLightboxModal, type LightboxImagePayload } from './ImageLightboxModal';

interface PrivateMessagesPanelProps {
  self: ChatUser;
  onlineUsers: ChatUser[];
  messages: PrivateMessage[];
  activePartnerId: string | null;
  unreadByUser: Record<string, number>;
  customSmileys?: CustomSmiley[];
  userStatsMap?: Record<string, UserProfileStats>;
  canSendImages?: boolean;
  onSelectPartner: (userId: string) => void;
  onSendPm: (toUserId: string, text: string, textColor: string, imageUrl?: string) => void;
  onToggleLikeUser?: (targetUserId: string) => void;
  onAlertUser?: (targetUserId: string, message?: string) => void;
  onOpenUserProfile?: (user: ChatUser) => void;
  listOnly?: boolean;
}

interface PartnerSummary {
  userId: string;
  username: string;
  nameColor: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastText: string;
  lastTimestamp: number;
  hasImage?: boolean;
}

export const PrivateMessagesPanel: React.FC<PrivateMessagesPanelProps> = ({
  self,
  onlineUsers,
  messages,
  activePartnerId,
  unreadByUser,
  customSmileys = [],
  userStatsMap = {},
  canSendImages = true,
  onSelectPartner,
  onSendPm,
  onToggleLikeUser,
  onAlertUser,
  onOpenUserProfile,
  listOnly = false,
}) => {
  const [draft, setDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSmileys, setShowSmileys] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | undefined>(undefined);
  const [pmUploadError, setPmUploadError] = useState('');
  const [alertSentFlash, setAlertSentFlash] = useState(false);
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState('');
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);
  const [filterMatchesOnly, setFilterMatchesOnly] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<LightboxImagePayload | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const msgSearchInputRef = useRef<HTMLInputElement>(null);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const partners = useMemo<PartnerSummary[]>(() => {
    const map = new Map<string, PartnerSummary>();

    for (const pm of messages) {
      const isFromSelf = pm.fromUserId === self.id;
      const partnerId = isFromSelf ? pm.toUserId : pm.fromUserId;
      const partnerName = isFromSelf ? pm.toUsername : pm.fromUsername;
      const partnerColor = isFromSelf ? '#0F766E' : pm.fromNameColor;
      const onlineMatch = onlineUsers.find((u) => u.id === partnerId);
      const partnerAvatar = onlineMatch?.avatarUrl || (isFromSelf ? undefined : pm.fromAvatarUrl);
      const existing = map.get(partnerId);
      if (!existing || pm.timestamp >= existing.lastTimestamp) {
        map.set(partnerId, {
          userId: partnerId,
          username: partnerName,
          nameColor: onlineMatch?.nameColor || partnerColor,
          avatarUrl: partnerAvatar,
          isOnline: Boolean(onlineMatch),
          lastText: pm.text || (pm.imageUrl ? '📷 صورة مرفقة' : ''),
          lastTimestamp: pm.timestamp,
          hasImage: Boolean(pm.imageUrl),
        });
      }
    }

    if (activePartnerId && !map.has(activePartnerId)) {
      const target = onlineUsers.find((u) => u.id === activePartnerId);
      if (target) {
        map.set(target.id, {
          userId: target.id,
          username: target.username,
          nameColor: target.nameColor,
          avatarUrl: target.avatarUrl,
          isOnline: true,
          lastText: 'بدء محادثة خاصة جديدة',
          lastTimestamp: Date.now(),
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  }, [messages, self.id, onlineUsers, activePartnerId]);

  const filteredPartners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((p) => p.username.toLowerCase().includes(q));
  }, [partners, searchQuery]);

  const quickOnlineContacts = useMemo(() => {
    const partnerIds = new Set(partners.map((p) => p.userId));
    const q = searchQuery.trim().toLowerCase();
    return onlineUsers
      .filter((u) => u.id !== self.id && !partnerIds.has(u.id))
      .filter((u) => !q || u.username.toLowerCase().includes(q))
      .slice(0, 12);
  }, [onlineUsers, partners, self.id, searchQuery]);

  const activePartner = partners.find((p) => p.userId === activePartnerId) || null;
  const activePartnerUser = activePartner
    ? onlineUsers.find((u) => u.id === activePartner.userId)
    : undefined;
  const activePartnerStats = activePartner ? userStatsMap[activePartner.userId] : undefined;
  const partnerLikes = activePartnerStats?.likes || [];
  const isPartnerLiked = partnerLikes.includes(self.id);

  const activeThread = useMemo(() => {
    if (!activePartnerId) return [];
    return messages.filter(
      (pm) =>
        (pm.fromUserId === self.id && pm.toUserId === activePartnerId) ||
        (pm.fromUserId === activePartnerId && pm.toUserId === self.id)
    );
  }, [messages, self.id, activePartnerId]);

  const trimmedMsgQuery = showMsgSearch ? msgSearchQuery.trim().toLowerCase() : '';

  const matchingMsgIds = useMemo(() => {
    if (!trimmedMsgQuery) return [];
    return activeThread
      .filter((pm) => (pm.text || '').toLowerCase().includes(trimmedMsgQuery))
      .map((pm) => pm.id);
  }, [activeThread, trimmedMsgQuery]);

  const displayedThread = useMemo(() => {
    if (!trimmedMsgQuery || !filterMatchesOnly) return activeThread;
    const matchSet = new Set(matchingMsgIds);
    return activeThread.filter((pm) => matchSet.has(pm.id));
  }, [activeThread, trimmedMsgQuery, filterMatchesOnly, matchingMsgIds]);

  const activeMatchId =
    matchingMsgIds.length > 0 ? matchingMsgIds[activeMatchIdx] || matchingMsgIds[matchingMsgIds.length - 1] : null;

  useEffect(() => {
    if (trimmedMsgQuery) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread.length, activePartnerId, trimmedMsgQuery]);

  useEffect(() => {
    if (matchingMsgIds.length === 0) {
      setActiveMatchIdx(0);
      return;
    }
    const newestIdx = matchingMsgIds.length - 1;
    setActiveMatchIdx(newestIdx);
    const targetId = matchingMsgIds[newestIdx];
    window.setTimeout(() => {
      msgRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 30);
  }, [matchingMsgIds]);

  const jumpToMatch = (direction: 'prev' | 'next') => {
    if (matchingMsgIds.length === 0) return;
    const total = matchingMsgIds.length;
    const nextIdx =
      direction === 'prev'
        ? (activeMatchIdx - 1 + total) % total
        : (activeMatchIdx + 1) % total;
    setActiveMatchIdx(nextIdx);
    const targetId = matchingMsgIds[nextIdx];
    msgRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    setPendingImage(undefined);
    setShowSmileys(false);
    setAlertSentFlash(false);
    setShowMsgSearch(false);
    setMsgSearchQuery('');
    setFilterMatchesOnly(false);
    setActiveMatchIdx(0);
  }, [activePartnerId]);

  const handleAttachImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPmUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const processed = await readImageFileWithGifSupport(file);
      setPendingImage(processed);
    } catch (err) {
      setPmUploadError(err instanceof Error ? err.message : 'تعذر قراءة الصورة أو ملف GIF.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartnerId || (!draft.trim() && !pendingImage)) return;
    onSendPm(activePartnerId, draft.trim(), '', pendingImage);
    setDraft('');
    setPendingImage(undefined);
    setShowSmileys(false);
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-stone-50 dark:bg-zinc-950 h-full">
      {/* Conversations List: Full-width in drawer mode or on mobile when no partner selected */}
      <aside
        className={`${
          listOnly ? 'flex w-full' : activePartner ? 'hidden md:flex md:w-76' : 'flex w-full md:w-76'
        } border-l border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-col shrink-0`}
      >
        <div
          className="px-3.5 py-2.5 text-white border-b border-black/15 dark:border-zinc-800 space-y-2 shrink-0"
          style={{ backgroundColor: 'var(--ych-primary)' }}
        >
          <div className={`flex items-center justify-between ${listOnly ? 'pl-10' : ''}`}>
            <h2 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" />
              <span>المحادثات الخاصة</span>
            </h2>
            <span className="text-xs font-mono-tabular font-bold bg-black/25 px-2 py-0.5 rounded-xs">
              {partners.length}
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث عن عضو أو محادثة..."
              className="w-full h-10 sm:h-9 pr-8 pl-2.5 rounded-xs border border-black/20 bg-white dark:bg-zinc-950 text-sm sm:text-xs text-stone-900 dark:text-stone-100 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto chat-scroll divide-y divide-stone-100 dark:divide-zinc-800/80">
          {filteredPartners.length === 0 && quickOnlineContacts.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              لا توجد محادثات خاصة بعد. اضغط على اسم أي عضو في قائمة المتواجدين لبدء محادثة خاصة.
            </div>
          ) : (
            <>
              {filteredPartners.map((p) => {
                const unread = unreadByUser[p.userId] || 0;
                const isActive = p.userId === activePartnerId;
                return (
                  <button
                    key={p.userId}
                    type="button"
                    onClick={() => onSelectPartner(p.userId)}
                    className={`w-full p-3 min-h-[60px] text-right transition-colors cursor-pointer flex items-center justify-between gap-2 active:bg-[var(--ych-soft)] dark:active:bg-zinc-800 ${
                      isActive
                        ? 'bg-[var(--ych-soft)] dark:bg-zinc-800/90 border-r-4 border-[var(--ych-primary)]'
                        : 'hover:bg-stone-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <UserAvatar
                          avatarUrl={p.avatarUrl}
                          username={p.username}
                          size="md"
                          className="rounded-xs"
                        />
                        {p.isOnline && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#44a948] border-2 border-white dark:border-zinc-900"
                            title="متصل الآن"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm truncate" style={{ color: p.nameColor }}>
                            {p.username}
                          </span>
                          <span className="text-[10px] text-stone-400 dark:text-stone-500 shrink-0">
                            · {p.isOnline ? 'متصل' : 'أوفلاين'}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                          {p.lastText}
                        </p>
                      </div>
                    </div>
                    {unread > 0 && (
                      <span className="px-1.5 py-0.5 rounded-xs bg-[var(--ych-primary)] text-white text-[11px] font-mono-tabular font-bold shrink-0">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}

              {quickOnlineContacts.length > 0 && (
                <div className="bg-stone-50/70 dark:bg-zinc-950/60">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-stone-500 dark:text-stone-400 border-b border-stone-200/70 dark:border-zinc-800">
                    متصلون لبدء محادثة خاصة
                  </div>
                  <div className="divide-y divide-stone-100 dark:divide-zinc-800/60">
                    {quickOnlineContacts.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => onSelectPartner(u.id)}
                        className="w-full px-3 py-2.5 min-h-[52px] text-right hover:bg-[var(--ych-soft)] active:bg-[var(--ych-soft)] dark:hover:bg-zinc-800/60 dark:active:bg-zinc-800/80 transition-colors cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative shrink-0">
                            <UserAvatar
                              avatarUrl={u.avatarUrl}
                              username={u.username}
                              size="sm"
                              className="rounded-xs"
                            />
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#44a948] border border-white dark:border-zinc-900" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate" style={{ color: u.nameColor }}>
                              {u.username}
                            </div>
                            <div className="text-[10px] text-stone-400 truncate">
                              {u.statusText || u.country}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-xs bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-[10px] font-bold text-[var(--ych-primary)] dark:text-amber-300 shrink-0">
                          محادثة
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Active Conversation Stream */}
      {!listOnly && (
      <div className={`${activePartner ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {!activePartner ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-stone-200/80 dark:bg-zinc-800 flex items-center justify-center mb-3 text-[var(--ych-primary)] dark:text-amber-300">
              <MessageCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
              اختر محادثة خاصة لعرض الرسائل
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-xs">
              اضغط على أي عضو من القائمة أو من داخل الغرفة لفتح محادثة خاصة فورية وإرسال التنبيهات والإعجابات.
            </p>
          </div>
        ) : (
          <div key={activePartner.userId} className="flex-1 flex flex-col min-h-0">
            {/* Partner Header with Profile, Like & Alert Quick Actions */}
            <div className="px-2.5 sm:px-4 py-2.5 border-b border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => onSelectPartner('')}
                  aria-label="العودة لقائمة المحادثات"
                  className="md:hidden w-10 h-10 rounded-sm border border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-stone-200 flex items-center justify-center cursor-pointer active:scale-95 transition-transform shrink-0"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={!activePartnerUser || !onOpenUserProfile}
                  onClick={() => {
                    if (activePartnerUser && onOpenUserProfile) {
                      onOpenUserProfile(activePartnerUser);
                    }
                  }}
                  className="flex items-center gap-2 min-w-0 text-right cursor-pointer disabled:cursor-default"
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      avatarUrl={activePartner.avatarUrl}
                      username={activePartner.username}
                      size="sm"
                      className="rounded-xs"
                    />
                    {activePartner.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#44a948] border border-white dark:border-zinc-900" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-bold text-sm truncate" style={{ color: activePartner.nameColor }}>
                        {activePartner.username}
                      </span>
                      {activePartnerUser && activePartnerUser.role !== 'visitor' && (
                        <BadgeCheck className="w-4 h-4 text-[#1d9bf0] fill-[#1d9bf0] stroke-white shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate flex items-center gap-1">
                      <span>{activePartner.isOnline ? 'متصل الآن' : 'غير متصل'}</span>
                      {activePartnerUser?.country && (
                        <span>
                          · {getCountryFlag(activePartnerUser.country)} {activePartnerUser.country}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              {/* Quick Search / Like / Alert / Profile Bar matching IMG_3478 */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowMsgSearch((v) => {
                      const next = !v;
                      if (next) {
                        window.setTimeout(() => msgSearchInputRef.current?.focus(), 40);
                      } else {
                        setMsgSearchQuery('');
                        setFilterMatchesOnly(false);
                      }
                      return next;
                    });
                  }}
                  title="البحث في الرسائل"
                  aria-label="البحث في الرسائل"
                  aria-pressed={showMsgSearch}
                  className={`h-9 sm:h-8 px-2.5 sm:px-2 rounded-sm border text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-all active:scale-95 ${
                    showMsgSearch
                      ? 'border-[var(--ych-primary)] bg-[var(--ych-primary)] text-white'
                      : 'border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-700 dark:text-stone-200'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden lg:inline">بحث</span>
                </button>

                {onToggleLikeUser && (
                  <button
                    type="button"
                    onClick={() => onToggleLikeUser(activePartner.userId)}
                    title={isPartnerLiked ? 'إلغاء الإعجاب' : 'إعجاب بالعضو (+1 لايك)'}
                    className={`h-9 sm:h-8 px-2.5 sm:px-2 rounded-sm border text-xs font-bold font-mono-tabular flex items-center gap-1 shadow-2xs cursor-pointer transition-all active:scale-95 ${
                      isPartnerLiked
                        ? 'border-red-300 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'
                        : 'border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-red-50/70 text-red-600 dark:text-red-400'
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500 shrink-0" />
                    <span>
                      {formatCompactMetric(
                        activePartnerStats?.likesCount ??
                          activePartnerUser?.likesCount ??
                          partnerLikes.length
                      )}
                    </span>
                  </button>
                )}

                {onAlertUser && activePartner.isOnline && (
                  <button
                    type="button"
                    onClick={() => {
                      onAlertUser(activePartner.userId, 'نبهك في المحادثة الخاصة 🔔');
                      setAlertSentFlash(true);
                      window.setTimeout(() => setAlertSentFlash(false), 1800);
                    }}
                    title="إرسال تنبيه مباشر"
                    className="h-9 sm:h-8 px-2.5 sm:px-2 rounded-sm border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-[var(--ych-soft)] text-stone-800 dark:text-stone-200 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-transform"
                  >
                    <Bell className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="hidden sm:inline">
                      {alertSentFlash ? 'تم ✓' : 'تنبيه'}
                    </span>
                  </button>
                )}

                {activePartnerUser && onOpenUserProfile && (
                  <button
                    type="button"
                    onClick={() => onOpenUserProfile(activePartnerUser)}
                    title="عرض الملف الشخصي"
                    className="h-9 sm:h-8 px-2.5 sm:px-2 rounded-sm border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-800 dark:text-stone-200 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-transform"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[var(--ych-primary)] dark:text-amber-300 shrink-0" />
                    <span className="hidden sm:inline">الملف</span>
                  </button>
                )}
              </div>
            </div>

            {/* Compact Search in Messages Bar */}
            {showMsgSearch && (
              <div className="px-2.5 sm:px-4 py-1.5 border-b border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 flex items-center gap-1.5 shrink-0">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={msgSearchInputRef}
                    type="text"
                    value={msgSearchQuery}
                    onChange={(e) => setMsgSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        jumpToMatch(e.shiftKey ? 'next' : 'prev');
                      } else if (e.key === 'Escape') {
                        setMsgSearchQuery('');
                        setFilterMatchesOnly(false);
                        setShowMsgSearch(false);
                      }
                    }}
                    placeholder="ابحث في رسائل هذه المحادثة..."
                    className="w-full h-9 sm:h-8 pr-8 pl-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm sm:text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[var(--ych-primary)]"
                  />
                </div>

                {trimmedMsgQuery && (
                  <span className="text-[11px] font-mono-tabular font-bold text-stone-600 dark:text-stone-300 px-1.5 shrink-0">
                    {matchingMsgIds.length > 0
                      ? `${activeMatchIdx + 1}/${matchingMsgIds.length}`
                      : '0'}
                  </span>
                )}

                <button
                  type="button"
                  disabled={matchingMsgIds.length === 0}
                  onClick={() => jumpToMatch('prev')}
                  title="النتيجة الأقدم"
                  aria-label="النتيجة الأقدم"
                  className="w-9 h-9 sm:w-7 sm:h-8 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-zinc-800 disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  disabled={matchingMsgIds.length === 0}
                  onClick={() => jumpToMatch('next')}
                  title="النتيجة الأحدث"
                  aria-label="النتيجة الأحدث"
                  className="w-9 h-9 sm:w-7 sm:h-8 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-zinc-800 disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {trimmedMsgQuery && (
                  <button
                    type="button"
                    onClick={() => setFilterMatchesOnly((v) => !v)}
                    title="عرض الرسائل المطابقة فقط"
                    className={`h-9 sm:h-8 px-2 rounded-xs border text-[11px] font-bold shrink-0 cursor-pointer transition-colors ${
                      filterMatchesOnly
                        ? 'bg-[var(--ych-primary)] border-[var(--ych-primary-dark)] text-white'
                        : 'bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    المطابقة
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMsgSearchQuery('');
                    setFilterMatchesOnly(false);
                    setShowMsgSearch(false);
                  }}
                  title="إغلاق البحث"
                  aria-label="إغلاق البحث"
                  className="w-9 h-9 sm:w-7 sm:h-8 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/40 text-stone-600 dark:text-stone-300 hover:text-red-600 flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto chat-scroll p-3 sm:p-5 space-y-2.5 bg-[#f7f7f8] dark:bg-zinc-950">
              {activeThread.length === 0 ? (
                <div className="text-center py-10 text-xs text-stone-500 dark:text-stone-400">
                  ابدأ المحادثة الخاصة مع {activePartner.username} بإرسال رسالة أو صورة ترحيبية.
                </div>
              ) : displayedThread.length === 0 ? (
                <div className="text-center py-10 text-xs text-stone-500 dark:text-stone-400 space-y-2">
                  <p>لا توجد رسائل تطابق &ldquo;{msgSearchQuery.trim()}&rdquo; في هذه المحادثة.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setMsgSearchQuery('');
                      setFilterMatchesOnly(false);
                    }}
                    className="px-3 py-1 rounded-xs bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700 text-xs font-bold text-[var(--ych-primary)] dark:text-amber-300 cursor-pointer"
                  >
                    عرض كل الرسائل
                  </button>
                </div>
              ) : (
                displayedThread.map((pm) => {
                  const isMine = pm.fromUserId === self.id;
                  const isMatch =
                    Boolean(trimmedMsgQuery) &&
                    (pm.text || '').toLowerCase().includes(trimmedMsgQuery);
                  const isFocusedMatch = isMatch && activeMatchId === pm.id;
                  return (
                    <div
                      key={pm.id}
                      ref={(el) => {
                        msgRefs.current[pm.id] = el;
                      }}
                      className={`flex flex-col ${isMine ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[80%] sm:max-w-[72%] rounded-xl px-3.5 py-2 text-sm leading-relaxed border shadow-2xs transition-shadow ${
                          isMine
                            ? 'bg-[var(--ych-primary)] text-white border-[var(--ych-primary-dark)]'
                            : 'bg-white dark:bg-zinc-900 text-stone-900 dark:text-stone-100 border-stone-200 dark:border-zinc-800'
                        } ${
                          isFocusedMatch
                            ? 'ring-2 ring-amber-400 shadow-md'
                            : isMatch
                            ? 'ring-1 ring-amber-300/80'
                            : ''
                        }`}
                      >
                        {pm.imageUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setZoomedImage({
                                src: pm.imageUrl!,
                                alt: `صورة من ${pm.fromUsername}`,
                              })
                            }
                            className="group/pmimg relative block w-full mb-1.5 rounded-lg overflow-hidden border border-black/10 cursor-zoom-in active:scale-[0.99] transition-transform"
                            aria-label="تكبير الصورة"
                          >
                            <img
                              src={pm.imageUrl}
                              alt="صورة في الخاص"
                              referrerPolicy="no-referrer"
                              className="max-h-80 sm:max-h-96 w-full object-contain"
                            />
                            <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-85 sm:opacity-0 sm:group-hover/pmimg:opacity-100 transition-opacity pointer-events-none">
                              <ZoomIn className="w-3.5 h-3.5" />
                            </span>
                          </button>
                        )}
                        {pm.text && (
                          <p className="whitespace-pre-wrap break-words">
                            <RichSmileyText
                              text={pm.text}
                              smileys={customSmileys}
                              highlightQuery={trimmedMsgQuery}
                            />
                          </p>
                        )}
                        <div
                          className={`text-[10px] font-mono-tabular mt-1 ${
                            isMine ? 'text-white/75' : 'text-stone-400 dark:text-stone-500'
                          }`}
                        >
                          {formatTime(pm.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            {pmUploadError && (
              <div className="px-3 py-1.5 border-t border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-2 shrink-0">
                <span>{pmUploadError}</span>
                <button
                  type="button"
                  onClick={() => setPmUploadError('')}
                  className="text-red-500 hover:text-red-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Pending Image Preview */}
            {pendingImage && (
              <div className="px-3 py-2 border-t border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 flex items-center gap-2 shrink-0">
                <div className="relative inline-block">
                  <img
                    src={pendingImage}
                    alt="معاينة الصورة"
                    referrerPolicy="no-referrer"
                    className="h-20 max-w-[180px] rounded border border-stone-300 dark:border-zinc-700 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setPendingImage(undefined)}
                    aria-label="حذف الصورة"
                    className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  صورة / GIF جاهزة للإرسال في الخاص
                </span>
              </div>
            )}

            {/* Emoji & Custom Smileys Picker */}
            {showSmileys && (
              <div className="px-3 py-2 border-t border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 max-h-48 overflow-y-auto chat-scroll space-y-2 shrink-0">
                {customSmileys.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-[var(--ych-primary)] dark:text-amber-300 mb-1">
                      سمايلات الموقع
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {customSmileys.map((sm) => (
                        <button
                          key={sm.id}
                          type="button"
                          title={`${sm.label} (${sm.code})`}
                          onClick={() =>
                            setDraft((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${sm.code} `)
                          }
                          className="w-8 h-8 rounded border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 hover:bg-amber-50 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
                        >
                          <img
                            src={sm.imageUrl}
                            alt={sm.label}
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-7 sm:grid-cols-12 gap-1">
                  {EMOJI_GROUPS.flatMap((g) => g.items).map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setDraft((prev) => `${prev}${em}`)}
                      className="h-10 sm:h-8 rounded hover:bg-stone-100 dark:hover:bg-zinc-800 text-lg sm:text-base flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PM Composer */}
            <form
              onSubmit={handleSubmit}
              className="p-2 sm:p-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-3 border-t border-stone-200 dark:border-zinc-800 bg-[#ededed] dark:bg-zinc-900 flex items-center gap-1.5 shrink-0"
            >
              <button
                type="button"
                onClick={() => setShowSmileys((v) => !v)}
                title="الإيموجي والسمايلات"
                aria-label="الإيموجي والسمايلات"
                className="w-10 h-10 sm:w-9 sm:h-9 rounded-md border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-amber-50 dark:hover:bg-zinc-800 text-amber-500 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
              >
                <Smile className="w-5 h-5" />
              </button>

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
                    title="إرسال صورة أو GIF في الخاص"
                    aria-label="إرسال صورة أو GIF في الخاص"
                    className="w-10 h-10 sm:w-9 sm:h-9 rounded-md border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-stone-100 dark:hover:bg-zinc-800 text-[var(--ych-primary)] dark:text-amber-300 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                </>
              )}

              <input
                type="text"
                maxLength={600}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`أكتب رسالة خاصة إلى ${activePartner.username}...`}
                className="flex-1 min-w-0 h-10 sm:h-9 px-3 rounded-md border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-base sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[var(--ych-primary)]"
              />

              <button
                type="submit"
                disabled={!draft.trim() && !pendingImage}
                className="h-10 sm:h-9 px-3.5 sm:px-4 rounded-md bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] text-white text-xs sm:text-sm font-bold disabled:opacity-55 flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 transition-transform"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال</span>
              </button>
            </form>
          </div>
        )}
      </div>
      )}

      <ImageLightboxModal image={zoomedImage} onClose={() => setZoomedImage(null)} />
    </div>
  );
};
