import React, { useEffect, useRef, useState } from 'react';
import { DoorOpen, ImagePlus, Trash2, Link2 } from 'lucide-react';
import {
  PORTAL_IMAGE_PRESETS,
  readImageFileWithGifSupport,
  sanitizeExternalImageUrl,
} from '../utils/chatHelpers';

interface RoomThumbnailProps {
  imageUrl?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<RoomThumbnailProps['size']>, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-base',
};

export const RoomThumbnail: React.FC<RoomThumbnailProps> = ({
  imageUrl,
  name,
  size = 'sm',
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [imageUrl]);

  const safeSrc = sanitizeExternalImageUrl(imageUrl);
  const sizeCls = SIZE_CLASSES[size];

  if (safeSrc && !imgFailed) {
    return (
      <img
        src={safeSrc}
        alt={`صورة ${name}`}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeCls} object-cover shrink-0 border border-stone-200 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800 ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${sizeCls} shrink-0 flex items-center justify-center font-bold border border-stone-200 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800 text-[var(--ych-primary)] dark:text-amber-300 ${className}`}
    >
      <DoorOpen className={size === 'xs' ? 'w-3.5 h-3.5' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
    </div>
  );
};

interface RoomImagePickerProps {
  value: string;
  onChange: (nextUrl: string) => void;
  roomName?: string;
  compact?: boolean;
}

export const RoomImagePicker: React.FC<RoomImagePickerProps> = ({
  value,
  onChange,
  roomName = 'الغرفة',
  compact = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');
    try {
      const encoded = await readImageFileWithGifSupport(file);
      onChange(encoded);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'تعذر تحميل الصورة.');
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-stone-200 dark:border-zinc-700/80 bg-stone-50/70 dark:bg-zinc-950/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <RoomThumbnail
            imageUrl={value}
            name={roomName}
            size={compact ? 'sm' : 'md'}
            className="rounded-md"
          />
          <div className="min-w-0">
            <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
              صورة الغرفة
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
              تظهر بجانب اسم الغرفة في القائمة والبوابة
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
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
            className="px-2.5 py-1.5 rounded-xs bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            <span>رفع صورة</span>
          </button>
          {value && (
            <button
              type="button"
              onClick={() => {
                setUploadError('');
                onChange('');
              }}
              title="إزالة الصورة"
              aria-label="إزالة صورة الغرفة"
              className="p-1.5 rounded-xs border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* URL Input */}
      <div className="relative">
        <Link2 className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          dir="ltr"
          maxLength={800}
          value={value.startsWith('data:image/') ? '' : value}
          onChange={(e) => {
            setUploadError('');
            onChange(e.target.value);
          }}
          placeholder={
            value.startsWith('data:image/')
              ? 'تم اختيار صورة مرفوعة من جهازك ✓ (ألصق رابطاً لاستبدالها)'
              : 'أو ألصق رابط صورة / GIF مباشر (https://...)'
          }
          className="w-full h-8 pr-8 pl-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px] text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-[var(--ych-primary)]"
        />
      </div>

      {/* Iraqi Presets */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <span className="text-[11px] text-stone-500 dark:text-stone-400 shrink-0">
          جاهزة:
        </span>
        {PORTAL_IMAGE_PRESETS.map((preset) => {
          const active = value === preset.url;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setUploadError('');
                onChange(preset.url);
              }}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-xs border text-[11px] shrink-0 cursor-pointer transition-colors ${
                active
                  ? 'border-[var(--ych-primary)] bg-[var(--ych-soft)] dark:bg-zinc-800 font-bold text-[var(--ych-primary)] dark:text-amber-300'
                  : 'border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-700 dark:text-stone-300 hover:border-stone-400'
              }`}
            >
              <img
                src={preset.url}
                alt={preset.label}
                className="w-4 h-4 rounded-xs object-cover shrink-0"
              />
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {uploadError && (
        <p className="text-[11px] text-red-600 dark:text-red-400">{uploadError}</p>
      )}
    </div>
  );
};
