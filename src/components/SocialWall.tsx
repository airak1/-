import React, { useMemo, useRef, useState } from 'react';
import {
  Heart,
  MessageSquare,
  ImagePlus,
  Trash2,
  Send,
  X,
  Trophy,
  Award,
  Youtube,
  Mic,
  Square,
  Paintbrush,
  Search,
  ZoomIn,
  Share2,
  Play,
} from 'lucide-react';
import type { ChatUser, SiteSettings, TopStarEntry, WallPost } from '../types/chat';
import {
  computeUserLevel,
  formatCompactMetric,
  formatCompactMinutes,
  formatRelativeDate,
  formatStatusIcon,
  getCountryFlag,
  getRoleLabel,
  parseYouTubeId,
  readImageFileWithGifSupport,
} from '../utils/chatHelpers';
import { EMOJI_GROUPS } from '../utils/chatHelpers';
import { UserAvatar } from './UserAvatar';
import { DoodleModal } from './DoodleModal';
import { YouTubeSongSearchModal } from './YouTubeSongSearchModal';
import { BannerStrip, RichSmileyText } from './RichSmileyText';
import { ImageLightboxModal, type LightboxImagePayload } from './ImageLightboxModal';

type WallFilterTab = 'all' | 'featured' | 'stars';

interface SocialWallProps {
  self: ChatUser;
  token?: string;
  posts: WallPost[];
  topStars?: TopStarEntry[];
  onlineUsers?: ChatUser[];
  siteSettings?: SiteSettings;
  onCreatePost: (
    content: string,
    imageUrl?: string,
    extras?: { youtubeUrl?: string; audioUrl?: string; audioDuration?: number }
  ) => void;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onDeletePost: (postId: string) => void;
  onOpenUserProfileById?: (userId: string) => void;
  onClose?: () => void;
}

export const SocialWall: React.FC<SocialWallProps> = ({
  self,
  token,
  posts,
  topStars = [],
  onlineUsers = [],
  siteSettings,
  onCreatePost,
  onToggleLike,
  onAddComment,
  onDeletePost,
  onOpenUserProfileById,
  onClose,
}) => {
  const [wallTab, setWallTab] = useState<WallFilterTab>('all');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [showToolsTray, setShowToolsTray] = useState(false);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showYoutubeSearchModal, setShowYoutubeSearchModal] = useState(false);
  const [showDoodleModal, setShowDoodleModal] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [expandedVideos, setExpandedVideos] = useState<Record<string, boolean>>({});
  const [showSmileyBar, setShowSmileyBar] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<LightboxImagePayload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice note recording on Wall
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioClip, setAudioClip] = useState<{ url: string; duration: number } | undefined>(
    undefined
  );
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const durationRef = useRef(0);

  const isStaff = self.role === 'admin' || self.role === 'moderator';
  const canPostToWall = siteSettings?.allowWallPosts !== false || isStaff;
  const canAttachImage = siteSettings?.allowImages !== false || isStaff;
  const canAttachAudio = siteSettings?.allowVoiceNotes !== false || isStaff;

  const youtubePreviewId = useMemo(() => parseYouTubeId(youtubeUrl), [youtubeUrl]);

  const featuredPosts = useMemo(() => {
    return [...posts]
      .filter((p) => p.likes.length > 0 || p.comments.length > 0)
      .sort(
        (a, b) =>
          b.likes.length * 2 + b.comments.length - (a.likes.length * 2 + a.comments.length)
      );
  }, [posts]);

  const displayedPosts = wallTab === 'featured' ? featuredPosts : posts;

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const startRecording = async () => {
    setUploadError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setUploadError('المتصفح لا يدعم تسجيل المقاطع الصوتية.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 24000 })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      durationRef.current = 0;
      setRecordSeconds(0);
      setIsRecording(true);
      recorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 0 && blob.size <= 270_000) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              setAudioClip({
                url: reader.result,
                duration: Math.max(1, durationRef.current),
              });
            }
          };
          reader.readAsDataURL(blob);
        } else if (blob.size > 270_000) {
          setUploadError('المقطع الصوتي طويل جداً، يرجى تقصير المدة.');
        }
      };

      recorder.start(250);
      timerRef.current = window.setInterval(() => {
        durationRef.current += 1;
        setRecordSeconds(durationRef.current);
        if (durationRef.current >= 20) stopRecording();
      }, 1000);
    } catch {
      setUploadError('تعذر الوصول إلى الميكروفون.');
      setIsRecording(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const processed = await readImageFileWithGifSupport(file);
      setImageUrl(processed);
      setShowToolsTray(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'تعذر رفع الصورة');
    } finally {
      e.target.value = '';
    }
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    const trimmedYt = youtubeUrl.trim();
    if (trimmedYt && !parseYouTubeId(trimmedYt)) {
      setUploadError('يرجى إدخال رابط يوتيوب صحيح أو إزالة الرابط.');
      return;
    }
    if (!content.trim() && !imageUrl && !trimmedYt && !audioClip) return;

    onCreatePost(content.trim(), imageUrl, {
      youtubeUrl: trimmedYt || undefined,
      audioUrl: audioClip?.url,
      audioDuration: audioClip?.duration,
    });
    setContent('');
    setImageUrl(undefined);
    setYoutubeUrl('');
    setShowYoutubeInput(false);
    setShowToolsTray(false);
    setShowSmileyBar(false);
    setAudioClip(undefined);
    if (wallTab !== 'all') setWallTab('all');
  };

  const handleCommentSubmit = (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    onAddComment(postId, text);
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    setExpandedComments((prev) => ({ ...prev, [postId]: true }));
  };

  const canPublish =
    canPostToWall &&
    Boolean(content.trim() || imageUrl || youtubePreviewId || audioClip) &&
    !self.isMuted;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-zinc-950 text-stone-900 dark:text-stone-100">
      {/* Top Header Bar matching IMG_3511: taupe bar with "الحائط" on left and red X close button on right */}
      <div
        dir="ltr"
        className="px-2 py-1 bg-[#968e87] dark:bg-zinc-800 border-b border-stone-600/60 dark:border-zinc-700 text-white shrink-0 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-display text-sm sm:text-base font-bold text-white whitespace-nowrap pl-1">
            الحائط
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setWallTab('all')}
              className={`h-6 px-1.5 rounded-xs text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors ${
                wallTab === 'all'
                  ? 'bg-[#44a948] text-white'
                  : 'bg-black/20 hover:bg-black/30 text-white/90'
              }`}
            >
              <MessageSquare className="w-2.5 h-2.5 shrink-0" />
              <span>الكل</span>
            </button>
            <button
              type="button"
              onClick={() => setWallTab('featured')}
              className={`h-6 px-1.5 rounded-xs text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors ${
                wallTab === 'featured'
                  ? 'bg-[#44a948] text-white'
                  : 'bg-black/20 hover:bg-black/30 text-white/90'
              }`}
            >
              <Award className="w-2.5 h-2.5 shrink-0" />
              <span>تفاعلاً</span>
            </button>
            <button
              type="button"
              onClick={() => setWallTab('stars')}
              className={`h-6 px-1.5 rounded-xs text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors ${
                wallTab === 'stars'
                  ? 'bg-[#44a948] text-white'
                  : 'bg-black/20 hover:bg-black/30 text-white/90'
              }`}
            >
              <Trophy className="w-2.5 h-2.5 shrink-0" />
              <span>النجوم</span>
            </button>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق الحائط"
            className="w-10 h-8 rounded-xs bg-[#d64541] hover:bg-[#bf3632] text-white flex items-center justify-center border border-red-950/30 cursor-pointer active:scale-95 transition-transform shrink-0 shadow-2xs"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        )}
      </div>

      {/* Scrollable Wall Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto chat-scroll bg-white dark:bg-zinc-950">
        <BannerStrip banners={siteSettings?.banners} placement="wall_top" />

        {wallTab === 'stars' ? (
          <div className="divide-y divide-stone-200 dark:divide-zinc-800">
            {topStars.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 dark:text-stone-400">
                لا توجد لايكات مسجلة بعد. شارك بالتحديات وأرسل الهدايا لتتصدر القائمة!
              </div>
            ) : (
              topStars.map((star, index) => (
                <button
                  key={star.userId}
                  type="button"
                  onClick={() => onOpenUserProfileById?.(star.userId)}
                  className="w-full px-3 py-2.5 flex items-center justify-between gap-2.5 hover:bg-stone-50 dark:hover:bg-zinc-900 transition-colors text-right cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-xs font-mono-tabular text-[11px] font-extrabold flex items-center justify-center shrink-0 ${
                        index === 0
                          ? 'bg-amber-400 text-stone-950'
                          : index === 1
                          ? 'bg-stone-300 text-stone-900'
                          : index === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      #{index + 1}
                    </span>
                    <UserAvatar
                      avatarUrl={star.avatarUrl}
                      username={star.username}
                      size="sm"
                      className="rounded-xs"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate" style={{ color: star.nameColor }}>
                        {star.username}
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 font-mono-tabular">
                        LV {computeUserLevel(star.likesCount)} · {formatCompactMetric(star.profileLikesCount)} إعجاب
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold font-mono-tabular text-rose-600 dark:text-rose-400 shrink-0">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    <span>{formatCompactMetric(star.likesCount)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1">
              {wallTab === 'featured' ? 'لا توجد مشاركات مميزة بعد' : 'الحائط بانتظار أول مشاركة'}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              اكتب في الحقل بالأسفل أو أرفق صورة أو يوتيوب للنشر على الحائط.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-300/80 dark:divide-zinc-800">
            {displayedPosts.map((post, postIdx) => {
              const hasLiked = post.likes.includes(self.id);
              const canDelete =
                post.userId === self.id || self.role === 'admin' || self.role === 'moderator';
              const authorOnline = onlineUsers.find((u) => u.id === post.userId);
              const isCommentsOpen = Boolean(expandedComments[post.id]);
              const isVideoExpanded = Boolean(expandedVideos[post.id]);
              const compactTime = formatCompactMinutes(post.timestamp);
              const authorIcon = authorOnline?.statusIcon
                ? formatStatusIcon(authorOnline.statusIcon)
                : post.country
                ? getCountryFlag(post.country)
                : '';

              return (
                <article
                  key={post.id}
                  className="px-2 py-2 bg-white dark:bg-zinc-950"
                >
                  <div dir="ltr" className="flex items-start gap-2 text-left">
                    <button
                      type="button"
                      onClick={() => onOpenUserProfileById?.(post.userId)}
                      className="shrink-0 cursor-pointer"
                      aria-label={`ملف ${post.username}`}
                    >
                      <UserAvatar
                        avatarUrl={authorOnline?.avatarUrl || post.avatarUrl}
                        username={post.username}
                        size="lg"
                        className="!w-11 !h-11 rounded-xs border border-stone-300/80 dark:border-zinc-700"
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Header line: Optional icon + Colored Username on left, Compact minutes (0د / 1د) + Trash on right */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1 min-w-0">
                          {wallTab === 'featured' && postIdx < 3 && (
                            <span className="font-mono-tabular text-[11px] font-extrabold text-amber-600 dark:text-amber-400 shrink-0">
                              #{postIdx + 1}
                            </span>
                          )}
                          {authorIcon && (
                            <span className="text-xs leading-none shrink-0">{authorIcon}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenUserProfileById?.(post.userId)}
                            className="font-bold text-[13px] sm:text-sm leading-tight truncate hover:underline cursor-pointer text-left"
                            style={{ color: authorOnline?.nameColor || post.nameColor }}
                            title={`${post.username} · ${getRoleLabel(post.userRole)}`}
                          >
                            {post.username}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => onDeletePost(post.id)}
                              aria-label="حذف المنشور"
                              title="حذف المنشور"
                              className="p-0.5 rounded text-stone-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span
                            dir="rtl"
                            className="text-[11px] font-mono-tabular text-stone-400 dark:text-stone-500"
                          >
                            {compactTime}
                          </span>
                        </div>
                      </div>

                      {/* Post Text */}
                      {post.content && (
                        <p
                          dir="auto"
                          className="mt-0.5 text-[13px] sm:text-sm font-bold leading-snug text-stone-900 dark:text-stone-100 whitespace-pre-wrap break-words"
                        >
                          <RichSmileyText text={post.content} smileys={siteSettings?.customSmileys} />
                        </p>
                      )}

                      {/* Image Attachment */}
                      {post.imageUrl && (
                        <div className="mt-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setZoomedImage({
                                src: post.imageUrl!,
                                alt: `صورة من ${post.username}`,
                              })
                            }
                            className="group/wimg relative inline-block max-w-full rounded-xs overflow-hidden border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 cursor-zoom-in active:scale-[0.99]"
                            aria-label={`تكبير صورة ${post.username}`}
                          >
                            <img
                              src={post.imageUrl}
                              alt={`صورة من ${post.username}`}
                              referrerPolicy="no-referrer"
                              className="max-h-64 sm:max-h-72 max-w-full object-contain"
                            />
                            <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-85 sm:opacity-0 sm:group-hover/wimg:opacity-100 transition-opacity pointer-events-none">
                              <ZoomIn className="w-3.5 h-3.5" />
                            </span>
                          </button>
                        </div>
                      )}

                      {/* YouTube Attachment: plays directly inside the Wall post (and stays running in background when Wall closes) */}
                      {post.youtubeId && (
                        <div className="mt-1.5 space-y-1.5">
                          {!isVideoExpanded ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedVideos((prev) => ({
                                  ...prev,
                                  [post.id]: true,
                                }))
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#f1f2f4] hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-stone-300 dark:border-zinc-700 text-xs font-bold text-stone-800 dark:text-stone-100 shadow-2xs cursor-pointer active:scale-95 transition-transform"
                            >
                              <span className="w-5 h-5 rounded-xs bg-red-600 text-white flex items-center justify-center shrink-0">
                                <Play className="w-3 h-3 fill-current" />
                              </span>
                              <span>عرض الفيديو</span>
                            </button>
                          ) : (
                            <div className="space-y-1">
                              <div className="aspect-video max-h-56 w-full rounded-xs overflow-hidden border border-stone-300 dark:border-zinc-700 bg-black">
                                <iframe
                                  src={`https://www.youtube-nocookie.com/embed/${post.youtubeId}?autoplay=1&playsinline=1&rel=0&enablejsapi=1`}
                                  title={`فيديو مشارك من ${post.username}`}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="w-full h-full border-0"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedVideos((prev) => ({
                                    ...prev,
                                    [post.id]: false,
                                  }))
                                }
                                className="h-6 px-2 rounded-xs border border-stone-300 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800 text-[10px] font-bold text-stone-600 dark:text-stone-300 cursor-pointer"
                              >
                                إيقاف وإخفاء الفيديو
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Voice Note Attachment */}
                      {post.audioUrl && (
                        <div className="mt-1.5 flex items-center gap-2 p-1.5 rounded-xs bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 max-w-full">
                          <audio controls preload="metadata" src={post.audioUrl} className="h-8 flex-1 min-w-0" />
                          {post.audioDuration && (
                            <span className="text-[10px] font-mono-tabular text-stone-500 shrink-0">
                              {post.audioDuration}ث
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bottom Row: Subtle Like on left + Crimson Comment Bubble Badge on right matching IMG_3511 */}
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleLike(post.id)}
                          className={`inline-flex items-center gap-1 px-1.5 py-[1px] rounded-xs text-[11px] font-bold cursor-pointer transition-colors ${
                            hasLiked
                              ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                              : 'text-stone-400 hover:text-rose-600'
                          }`}
                          title="أعجبني"
                        >
                          <Heart className={`w-3 h-3 ${hasLiked ? 'fill-current' : ''}`} />
                          {post.likes.length > 0 && (
                            <span className="font-mono-tabular">{post.likes.length}</span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedComments((prev) => ({
                              ...prev,
                              [post.id]: !prev[post.id],
                            }))
                          }
                          aria-label="التعليقات"
                          className="inline-flex items-center gap-1 px-2 py-[2px] rounded-xs bg-[#c0392b] hover:bg-[#a93226] text-white text-[11px] font-bold shadow-2xs cursor-pointer active:scale-95 transition-transform"
                        >
                          {post.comments.length > 0 && (
                            <span className="font-mono-tabular">{post.comments.length}</span>
                          )}
                          <MessageSquare className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>

                      {/* Expandable Comments Stream & Reply Input */}
                      {isCommentsOpen && (
                        <div dir="rtl" className="mt-2 pt-1.5 space-y-1.5 border-t border-stone-200 dark:border-zinc-800">
                          {post.comments.length > 0 && (
                            <div className="space-y-1">
                              {post.comments.map((cmt) => (
                                <div
                                  key={cmt.id}
                                  className="text-xs bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xs px-2 py-1 flex items-baseline justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <span
                                      className="font-bold ml-1"
                                      style={{ color: cmt.nameColor }}
                                    >
                                      {cmt.username}:
                                    </span>
                                    <span className="text-stone-800 dark:text-stone-200 break-words">
                                      <RichSmileyText
                                        text={cmt.text}
                                        smileys={siteSettings?.customSmileys}
                                        imgClassName="w-4 h-4 object-contain inline-block align-middle mx-0.5"
                                      />
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-stone-400 font-mono-tabular shrink-0">
                                    {formatRelativeDate(cmt.timestamp)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          <form
                            onSubmit={(e) => handleCommentSubmit(e, post.id)}
                            className="flex items-center gap-1"
                          >
                            <input
                              type="text"
                              maxLength={240}
                              value={commentInputs[post.id] || ''}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({
                                  ...prev,
                                  [post.id]: e.target.value,
                                }))
                              }
                              placeholder="اكتب تعليقاً..."
                              className="flex-1 min-w-0 h-8 px-2 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-stone-900 dark:text-stone-100 focus:outline-none"
                            />
                            <button
                              type="submit"
                              disabled={!(commentInputs[post.id] || '').trim()}
                              className="h-8 px-2.5 rounded-xs bg-[#a93226] text-white text-[11px] font-bold disabled:opacity-50 cursor-pointer shrink-0"
                            >
                              تعليق
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Attachment Previews & Tools Tray above Bottom Composer */}
      {uploadError && (
        <div className="px-2.5 py-1 border-t border-red-200 bg-red-50 dark:bg-red-950/40 text-[11px] text-red-700 dark:text-red-300 flex items-center justify-between gap-2 shrink-0">
          <span>{uploadError}</span>
          <button type="button" onClick={() => setUploadError('')} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {imageUrl && (
        <div className="px-2 py-1.5 border-t border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 flex items-center gap-2 shrink-0">
          <div className="relative inline-block">
            <img
              src={imageUrl}
              alt="معاينة"
              referrerPolicy="no-referrer"
              className="h-14 max-w-[140px] rounded border border-stone-300 dark:border-zinc-700 object-contain"
            />
            <button
              type="button"
              onClick={() => setImageUrl(undefined)}
              aria-label="إزالة الصورة"
              className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <span className="text-[11px] text-stone-500">صورة جاهزة للنشر</span>
        </div>
      )}

      {isRecording && (
        <div className="px-2.5 py-1.5 border-t border-red-200 bg-red-50 dark:bg-red-950/40 flex items-center justify-between gap-2 text-xs shrink-0">
          <span className="font-bold text-red-700 dark:text-red-300 font-mono-tabular">
            جاري التسجيل... {recordSeconds}ث / 20ث
          </span>
          <button
            type="button"
            onClick={stopRecording}
            className="px-2 py-0.5 rounded-xs bg-red-600 text-white font-bold flex items-center gap-1 cursor-pointer"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>إيقاف</span>
          </button>
        </div>
      )}

      {audioClip && (
        <div className="px-2 py-1.5 border-t border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 flex items-center justify-between gap-2 shrink-0">
          <audio controls src={audioClip.url} className="h-8 flex-1 min-w-0" />
          <button
            type="button"
            onClick={() => setAudioClip(undefined)}
            aria-label="حذف الصوتية"
            className="text-stone-400 hover:text-red-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showYoutubeInput && (
        <div className="px-2 py-1.5 border-t border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 flex flex-wrap items-center gap-1.5 shrink-0">
          <input
            type="url"
            dir="ltr"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 min-w-[140px] h-8 px-2 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs focus:outline-none"
          />
          {token && (
            <button
              type="button"
              onClick={() => setShowYoutubeSearchModal(true)}
              className="h-8 px-2 rounded-xs bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Search className="w-3 h-3" />
              <span>بحث</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setShowYoutubeInput(false);
              setYoutubeUrl('');
            }}
            aria-label="إلغاء يوتيوب"
            className="h-8 px-1.5 rounded-xs border border-stone-300 dark:border-zinc-700 text-stone-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showToolsTray && (
        <div className="px-2 py-1.5 border-t border-stone-300 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-900 flex flex-wrap items-center gap-1.5 shrink-0">
          {canAttachImage && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/gif,image/png,image/jpeg,image/webp,image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 px-2 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1 cursor-pointer"
              >
                <ImagePlus className="w-3.5 h-3.5 text-[var(--ych-primary)]" />
                <span>صورة / GIF</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDoodleModal(true);
                  setShowToolsTray(false);
                }}
                className="h-7 px-2 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1 cursor-pointer"
              >
                <Paintbrush className="w-3.5 h-3.5 text-indigo-600" />
                <span>رسمة</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setShowYoutubeInput((v) => !v);
              setShowToolsTray(false);
            }}
            className="h-7 px-2 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1 cursor-pointer"
          >
            <Youtube className="w-3.5 h-3.5 text-red-600" />
            <span>يوتيوب</span>
          </button>
          {canAttachAudio && (
            <button
              type="button"
              onClick={() => {
                setShowToolsTray(false);
                if (isRecording) stopRecording();
                else startRecording();
              }}
              className="h-7 px-2 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 text-[#44a948]" />
              <span>صوتية</span>
            </button>
          )}
        </div>
      )}

      {showSmileyBar && (
        <div className="px-2 py-1.5 border-t border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 max-h-36 overflow-y-auto chat-scroll space-y-1.5 shrink-0">
          {(siteSettings?.customSmileys?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-1">
              {siteSettings!.customSmileys!.map((sm) => (
                <button
                  key={sm.id}
                  type="button"
                  title={`${sm.label} (${sm.code})`}
                  onClick={() =>
                    setContent((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${sm.code} `)
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
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
            {EMOJI_GROUPS.flatMap((g) => g.items).map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setContent((prev) => `${prev}${em}`)}
                className="h-8 rounded hover:bg-stone-100 dark:hover:bg-zinc-800 text-base flex items-center justify-center cursor-pointer"
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Single-Row Composer matching IMG_3511: [Share] [YouTube] [Smiley] [اكتب رسالتك هنا] [إرسال] */}
      <form
        dir="ltr"
        onSubmit={handlePublish}
        className="px-1 py-1 bg-[#e5e0dc] dark:bg-zinc-900 border-t border-stone-300 dark:border-zinc-700 flex items-center gap-1 shrink-0"
      >
        <button
          type="button"
          disabled={!canPostToWall || self.isMuted}
          onClick={() => {
            setShowToolsTray((v) => !v);
            setShowSmileyBar(false);
          }}
          title="إرفاق صورة أو رسمة أو يوتيوب أو صوتية"
          aria-label="إرفاق وسائط على الحائط"
          className={`w-9 h-[34px] rounded-md text-white flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform disabled:opacity-50 ${
            showToolsTray
              ? 'bg-[#7f2219] text-amber-200'
              : 'bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)]'
          }`}
        >
          <Share2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            setShowToolsTray(false);
            setShowSmileyBar(false);
            if (token) {
              setShowYoutubeSearchModal(true);
            } else {
              setShowYoutubeInput((v) => !v);
            }
          }}
          title="يوتيوب (بحث أو تشغيل بالخلفية)"
          aria-label="يوتيوب"
          className={`w-9 h-[34px] rounded-md text-white flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform ${
            showYoutubeInput || youtubePreviewId
              ? 'bg-red-700 ring-1 ring-amber-300'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          <Youtube className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={!canPostToWall || self.isMuted}
          onClick={() => {
            setShowSmileyBar((v) => !v);
            setShowToolsTray(false);
          }}
          title="الرموز التعبيرية والسمايلات"
          aria-label="الرموز التعبيرية والسمايلات"
          className="w-8 h-[34px] rounded-md flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 disabled:opacity-50"
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
          type="text"
          dir="auto"
          maxLength={500}
          disabled={!canPostToWall || self.isMuted}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            !canPostToWall
              ? 'النشر متوقف مؤقتاً'
              : self.isMuted
              ? 'أنت مكتوم حالياً...'
              : 'اكتب رسالتك هنا'
          }
          className="flex-1 min-w-0 h-[34px] px-2.5 rounded-md border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-right text-stone-900 dark:text-stone-100 focus:outline-none disabled:bg-stone-200 dark:disabled:bg-zinc-800"
        />

        <button
          type="submit"
          disabled={!canPublish}
          className="h-[34px] px-2.5 rounded-md bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] text-white text-xs font-bold disabled:opacity-55 flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-transform"
        >
          <Send className="w-3.5 h-3.5" />
          <span>إرسال</span>
        </button>
      </form>

      {showDoodleModal && (
        <DoodleModal
          onClose={() => setShowDoodleModal(false)}
          onSendDrawing={(dataUrl) => {
            setImageUrl(dataUrl);
            setShowDoodleModal(false);
          }}
        />
      )}

      {showYoutubeSearchModal && token && (
        <YouTubeSongSearchModal
          token={token}
          mode="wall"
          onClose={() => setShowYoutubeSearchModal(false)}
          onSelectForWall={(song) => {
            setShowYoutubeInput(true);
            setYoutubeUrl(song.url);
            if (!content.trim()) {
              setContent(`🎵 ${song.title}`);
            }
          }}
        />
      )}

      <ImageLightboxModal image={zoomedImage} onClose={() => setZoomedImage(null)} />
    </div>
  );
};
