import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Youtube,
  Play,
  Radio,
  Send,
  X,
  Check,
  Music,
  Loader2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import type { YouTubeSearchResult } from '../types/chat';

interface YouTubeSongSearchModalProps {
  token: string;
  initialQuery?: string;
  mode?: 'chat' | 'roomMedia' | 'wall';
  canBroadcastRoom?: boolean;
  onClose: () => void;
  onPlayPersonal?: (song: YouTubeSearchResult) => void;
  onSendToChat?: (song: YouTubeSearchResult) => void;
  onSelectForRoomMedia?: (song: YouTubeSearchResult) => void;
  onSelectForWall?: (song: YouTubeSearchResult) => void;
}

const SUGGESTED_SEARCHES = [
  'كاظم الساهر',
  'حسام الرسام',
  'سيف نبيل',
  'رحمة رياض',
  'حاتم العراقي',
  'أغاني عراقية حزينة',
];

export const YouTubeSongSearchModal: React.FC<YouTubeSongSearchModalProps> = ({
  token,
  initialQuery = '',
  mode = 'chat',
  canBroadcastRoom = false,
  onClose,
  onPlayPersonal,
  onSendToChat,
  onSelectForRoomMedia,
  onSelectForWall,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<YouTubeSearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (window.innerWidth >= 768) {
        inputRef.current?.focus();
      }
    }, 60);
    return () => window.clearTimeout(timer);
  }, []);

  const runSearch = async (rawTerm: string) => {
    const trimmed = rawTerm.trim();
    if (trimmed.length < 2) {
      setError('اكتب حرفين على الأقل للبحث عن الأغنية.');
      return;
    }
    setLoading(true);
    setError('');
    setHasSearched(true);
    setPreviewVideo(null);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(trimmed)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { results?: YouTubeSearchResult[]; error?: string };
      if (!res.ok) {
        setError(data.error || 'تعذر البحث في يوتيوب حالياً.');
        setResults([]);
        return;
      }
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setError('حدث خطأ أثناء الاتصال بالخادم للبحث في يوتيوب.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery.trim().length >= 2) {
      void runSearch(initialQuery);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch(query);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/65 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="yt-search-title"
    >
      <div className="w-full max-w-xl max-h-[90dvh] flex flex-col bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className="px-4 py-3 text-white flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--ych-primary)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Youtube className="w-5 h-5 text-red-200 shrink-0" />
            <div className="min-w-0">
              <h3 id="yt-search-title" className="font-display text-sm sm:text-base font-bold truncate">
                البحث عن أغنية في يوتيوب
              </h3>
              <p className="text-[11px] text-white/80 truncate">
                {mode === 'roomMedia'
                  ? 'ابحث باسم الأغنية واخترها لبث إذاعة الغرفة'
                  : mode === 'wall'
                  ? 'ابحث باسم الأغنية لإرفاقها في منشور الحائط'
                  : 'استمع للأغنية أو شاركها مع أصدقائك في الغرفة'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة البحث"
            className="p-1.5 rounded-lg bg-black/20 hover:bg-black/35 text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Form */}
        <div className="p-3 sm:p-4 border-b border-stone-200 dark:border-zinc-800 space-y-2.5 shrink-0 bg-stone-50/70 dark:bg-zinc-950/50">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                maxLength={100}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="اكتب اسم الأغنية أو الفنان (مثال: كاظم الساهر)..."
                aria-label="اسم الأغنية أو الفنان"
                className="w-full h-10 pr-9 pl-8 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="مسح البحث"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || query.trim().length < 2}
              className="h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>بحث</span>
            </button>
          </form>

          {/* Quick Search Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 shrink-0">
              مقترحات:
            </span>
            {SUGGESTED_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  setQuery(term);
                  void runSearch(term);
                }}
                className="px-2 py-1 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-red-400 text-[11px] font-medium text-stone-700 dark:text-stone-200 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Inline Preview */}
        {previewVideo && (
          <div className="p-3 bg-zinc-950 border-b border-stone-200 dark:border-zinc-800 shrink-0 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs text-white">
              <span className="font-bold truncate">{previewVideo.title}</span>
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-stone-200 cursor-pointer shrink-0"
              >
                إخفاء المعاينة
              </button>
            </div>
            <div className="aspect-video max-h-44 w-full rounded-md overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${previewVideo.videoId}?autoplay=1&playsinline=1&rel=0`}
                title={previewVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </div>
        )}

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto chat-scroll p-3 sm:p-4 space-y-2.5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 text-center">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-stone-500 dark:text-stone-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-red-600" />
              <span>جاري البحث في يوتيوب...</span>
            </div>
          ) : !hasSearched ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-center text-stone-500 dark:text-stone-400">
              <Music className="w-10 h-10 text-red-500/70" />
              <div className="text-sm font-bold text-stone-700 dark:text-stone-200">
                ابحث عن أي أغنية أو أنشودة أو مقطع يوتيوب بالاسم
              </div>
              <p className="text-xs max-w-sm">
                اكتب اسم الأغنية أو المطرب في المربع أعلاه لتظهر لك النتائج فوراً مع خيارات التشغيل والمشاركة.
              </p>
            </div>
          ) : results.length === 0 && !error ? (
            <div className="py-10 text-center text-xs text-stone-500 dark:text-stone-400">
              لم يتم العثور على نتائج مطابقة لـ «{query}». جرّب كلمات بحث أخرى.
            </div>
          ) : (
            results.map((song) => (
              <div
                key={song.videoId}
                className="flex flex-col sm:flex-row gap-2.5 p-2.5 rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-950/60 hover:border-red-300 dark:hover:border-red-900/70 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setPreviewVideo(song)}
                  title="معاينة سريعة"
                  className="relative w-full sm:w-32 h-24 sm:h-20 rounded-md overflow-hidden bg-black shrink-0 group cursor-pointer"
                >
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/25 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                    <span className="w-8 h-8 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow">
                      <Play className="w-4 h-4 fill-current mr-0.5" />
                    </span>
                  </div>
                  {song.duration && (
                    <span
                      dir="ltr"
                      className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono-tabular flex items-center gap-0.5"
                    >
                      <Clock className="w-2.5 h-2.5" />
                      {song.duration}
                    </span>
                  )}
                </button>

                <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                      {song.title}
                    </h4>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                      <span className="truncate">{song.channel || 'YouTube'}</span>
                      {song.viewsText && (
                        <>
                          <span>·</span>
                          <span>{song.viewsText}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {mode === 'roomMedia' && onSelectForRoomMedia && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectForRoomMedia(song);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-xs bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>اختيار لإذاعة الغرفة</span>
                      </button>
                    )}

                    {mode === 'wall' && onSelectForWall && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectForWall(song);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-xs bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>إرفاق بالمنشور</span>
                      </button>
                    )}

                    {onPlayPersonal && (
                      <button
                        type="button"
                        onClick={() => {
                          onPlayPersonal(song);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-xs bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>تشغيل بالمشغّل</span>
                      </button>
                    )}

                    {mode === 'chat' && onSendToChat && (
                      <button
                        type="button"
                        onClick={() => {
                          onSendToChat(song);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-xs bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>إرسال للغرفة</span>
                      </button>
                    )}

                    {mode === 'chat' && canBroadcastRoom && onSelectForRoomMedia && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectForRoomMedia(song);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-xs bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Radio className="w-3 h-3" />
                        <span>بث للغرفة</span>
                      </button>
                    )}

                    <a
                      href={song.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="فتح في يوتيوب"
                      className="px-2 py-1 rounded-xs border border-stone-300 dark:border-zinc-700 text-[11px] text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800 inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>رابط</span>
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
