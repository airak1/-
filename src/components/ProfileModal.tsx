import React, { useRef, useState } from 'react';
import { X, Check, Shuffle, Upload, RefreshCw, ImagePlus, Trash2 } from 'lucide-react';
import type { ChatUser, UserGender } from '../types/chat';
import {
  NAME_COLORS,
  STATUS_ICON_PRESETS,
  formatStatusIcon,
  getRoleLabel,
  getStatusIconLabel,
  readImageFileWithGifSupport,
  sanitizeExternalImageUrl,
} from '../utils/chatHelpers';
import {
  AVATAR_STYLES,
  type AvatarStyleId,
  buildDiceBearSpec,
  compressAvatarFile,
  generateRandomSeed,
  parseDiceBearSpec,
} from '../utils/avatar';
import { UserAvatar } from './UserAvatar';

interface ProfileModalProps {
  user: ChatUser;
  onClose: () => void;
  onSave: (payload: {
    nameColor: string;
    statusText: string;
    statusIcon?: string;
    bio: string;
    avatarSymbol: string;
    avatarUrl: string;
    coverUrl?: string;
    gender: UserGender;
  }) => void;
}

function createSeedBatch(count = 10): string[] {
  return Array.from({ length: count }, () => generateRandomSeed());
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onSave }) => {
  const initialParsed = parseDiceBearSpec(user.avatarUrl);
  const [nameColor, setNameColor] = useState(user.nameColor);
  const [statusText, setStatusText] = useState(user.statusText);
  const [statusIcon, setStatusIcon] = useState(user.statusIcon || '');
  const [bio, setBio] = useState(user.bio);
  const [gender, setGender] = useState<UserGender>(user.gender);
  const [avatarUrl, setAvatarUrl] = useState<string>(
    user.avatarUrl || buildDiceBearSpec('adventurer', user.username)
  );
  const [coverUrl, setCoverUrl] = useState<string>(user.coverUrl || '');
  const [activeStyle, setActiveStyle] = useState<AvatarStyleId>(
    initialParsed?.style || 'adventurer'
  );
  const [seedBatch, setSeedBatch] = useState<string[]>(() => createSeedBatch(10));
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleRandomizeSingle = () => {
    const newSeed = generateRandomSeed();
    setAvatarUrl(buildDiceBearSpec(activeStyle, newSeed));
    setUploadError('');
  };

  const handleStyleSelect = (styleId: AvatarStyleId) => {
    setActiveStyle(styleId);
    const firstSeed = seedBatch[0] || generateRandomSeed();
    setAvatarUrl(buildDiceBearSpec(styleId, firstSeed));
    setUploadError('');
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUri = await compressAvatarFile(file);
      setAvatarUrl(dataUri);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'تعذر تحميل الصورة');
    } finally {
      e.target.value = '';
    }
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUri = await readImageFileWithGifSupport(file);
      setCoverUrl(dataUri);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'تعذر تحميل صورة الغلاف');
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      nameColor,
      statusText,
      statusIcon: formatStatusIcon(statusIcon),
      bio,
      avatarSymbol: user.avatarSymbol,
      avatarUrl,
      coverUrl,
      gender,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="w-full max-w-lg max-h-[92dvh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h2 id="profile-modal-title" className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            تعديل الملف الشخصي والصورة الرمزية
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto chat-scroll">
          {/* Current Avatar Preview & Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3.5 min-w-0">
              <UserAvatar avatarUrl={avatarUrl} username={user.username} size="xl" />
              <div className="min-w-0">
                <div className="font-bold text-base truncate flex items-center gap-1.5" style={{ color: nameColor }}>
                  <span className="truncate">{user.username}</span>
                  {statusIcon && (
                    <span
                      title={getStatusIconLabel(statusIcon) || statusText}
                      className="text-sm leading-none shrink-0"
                    >
                      {statusIcon}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {getRoleLabel(user.role)} · {user.country}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRandomizeSingle}
                className="px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-amber-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>توليد عشوائي</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/gif,image/png,image/jpeg,image/webp,image/*"
                onChange={handleUploadAvatar}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>رفع صورة / GIF</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 -mt-2">
            <input
              type="url"
              dir="ltr"
              value={avatarUrl.startsWith('http') ? avatarUrl : ''}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (!val) {
                  setAvatarUrl(buildDiceBearSpec(activeStyle, seedBatch[0] || generateRandomSeed()));
                } else {
                  setAvatarUrl(val);
                }
              }}
              placeholder="أو الصق رابط صورة / GIF مباشر للصورة الرمزية (https://...)"
              className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100"
            />
          </div>

          {uploadError && (
            <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>
          )}

          {/* Avatar Style Picker + Generated Avatar Gallery */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                معرض الصور الرمزية المولدة
              </span>
              <button
                type="button"
                onClick={() => setSeedBatch(createSeedBatch(10))}
                className="text-xs text-rose-800 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>توليد خيارات جديدة</span>
              </button>
            </div>

            {/* Style Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {AVATAR_STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleStyleSelect(st.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    activeStyle === st.id
                      ? 'bg-rose-800 text-white border-rose-800'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* 10 Generated Avatars Grid */}
            <div className="grid grid-cols-5 gap-2.5">
              {seedBatch.map((seed) => {
                const spec = buildDiceBearSpec(activeStyle, seed);
                const isSelected = avatarUrl === spec;
                return (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => setAvatarUrl(spec)}
                    className={`p-1.5 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-rose-700 bg-rose-50/70 dark:bg-rose-950/50 scale-105'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                    aria-label="اختيار صورة رمزية"
                  >
                    <UserAvatar avatarUrl={spec} username={seed} size="lg" className="border-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profile Cover Photo / GIF Picker */}
          <div className="space-y-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                صورة أو GIF غلاف الملف الشخصي
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/gif,image/png,image/jpeg,image/webp,image/*"
                  onChange={handleUploadCover}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>{coverUrl ? 'تغيير الغلاف / GIF' : 'رفع غلاف / GIF'}</span>
                </button>
                {coverUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverUrl('')}
                    aria-label="حذف الغلاف"
                    className="p-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <input
              type="url"
              dir="ltr"
              value={coverUrl.startsWith('http') ? coverUrl : ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (!raw.trim()) {
                  setCoverUrl('');
                } else {
                  const clean = sanitizeExternalImageUrl(raw);
                  setCoverUrl(clean || raw.trim());
                }
              }}
              placeholder="أو الصق رابط غلاف متحرك GIF / صورة (https://...)"
              className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100"
            />
            {coverUrl && (
              <div className="h-24 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                <img
                  src={coverUrl}
                  alt="معاينة الغلاف"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              لون الاسم
            </span>
            <div className="flex flex-wrap gap-2.5 sm:gap-2">
              {NAME_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNameColor(c.value)}
                  className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full border-2 transition-transform cursor-pointer active:scale-90 ${
                    nameColor === c.value ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                  aria-label={c.label}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                رمز الحالة (المزاج أو النشاط بجانب اسمك)
              </span>
              {statusIcon && (
                <button
                  type="button"
                  onClick={() => setStatusIcon('')}
                  className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                >
                  إزالة الرمز
                </button>
              )}
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 mb-2">
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
                        !statusText.trim() ||
                        ['متواجد', 'متواجد للدردشة', 'عضو في عراقية شات', 'إدارة الديوان'].includes(statusText.trim()) ||
                        STATUS_ICON_PRESETS.some((p) => p.label === statusText.trim());
                      if (isDefaultOrPreset) {
                        setStatusText(preset.label);
                      }
                    }}
                    className={`h-8 rounded-lg border text-base flex items-center justify-center transition-all cursor-pointer ${
                      active
                        ? 'border-rose-700 bg-rose-50 dark:bg-rose-950/60 scale-105'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {preset.icon}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={statusIcon}
                onChange={(e) => setStatusIcon(formatStatusIcon(e.target.value))}
                placeholder="أو اكتب رمزاً تعبيرياً مخصصاً..."
                className="w-44 h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 text-center"
              />
              {statusIcon && (
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {getStatusIconLabel(statusIcon) || 'رمز مخصص'}
                </span>
              )}
            </div>

            <label htmlFor="profile-status" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              الحالة الشخصية (تظهر بجانب اسمك)
            </label>
            <input
              id="profile-status"
              type="text"
              maxLength={48}
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="مثال: متواجد، أستمع للموسيقى..."
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label htmlFor="profile-bio" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              نبذة عني
            </label>
            <textarea
              id="profile-bio"
              rows={2}
              maxLength={180}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="اكتب عبارة أو نبذة قصيرة..."
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">الجنس</span>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                  gender === 'male'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                شاب
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                  gender === 'female'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                فتاة
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              className="h-11 sm:h-10 px-4 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer active:scale-95 transition-transform"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="h-11 sm:h-10 px-4 text-sm font-semibold text-white bg-rose-800 hover:bg-rose-900 rounded-lg flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
            >
              <Check className="w-4 h-4" />
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
