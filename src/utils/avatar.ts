import { createAvatar, type Style } from '@dicebear/core';
import {
  adventurer,
  avataaars,
  lorelei,
  personas,
  botttsNeutral,
  funEmoji,
} from '@dicebear/collection';

export type AvatarStyleId =
  | 'adventurer'
  | 'avataaars'
  | 'lorelei'
  | 'personas'
  | 'botttsNeutral'
  | 'funEmoji';

export interface AvatarStyleOption {
  id: AvatarStyleId;
  label: string;
}

export const AVATAR_STYLES: AvatarStyleOption[] = [
  { id: 'adventurer', label: 'شخصيات كرتونية' },
  { id: 'avataaars', label: 'أفاتار كلاسيكي' },
  { id: 'lorelei', label: 'بورتريه فني' },
  { id: 'personas', label: 'شخصيات عصرية' },
  { id: 'botttsNeutral', label: 'روبوتات' },
  { id: 'funEmoji', label: 'تعابير مرحة' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STYLE_MAP: Record<AvatarStyleId, Style<any>> = {
  adventurer,
  avataaars,
  lorelei,
  personas,
  botttsNeutral,
  funEmoji,
};

const avatarCache = new Map<string, string>();

export function generateRandomSeed(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function buildDiceBearSpec(style: AvatarStyleId, seed: string): string {
  return `dicebear:${style}:${seed}`;
}

export function parseDiceBearSpec(spec?: string): { style: AvatarStyleId; seed: string } | null {
  if (!spec || !spec.startsWith('dicebear:')) return null;
  const parts = spec.split(':');
  if (parts.length < 3) return null;
  const styleId = parts[1] as AvatarStyleId;
  const seed = parts.slice(2).join(':');
  if (!STYLE_MAP[styleId] || !seed) return null;
  return { style: styleId, seed };
}

export function resolveAvatarDataUri(avatarUrl?: string, fallbackSeed = 'user'): string {
  if (
    avatarUrl &&
    (avatarUrl.startsWith('data:image/') ||
      avatarUrl.startsWith('https://') ||
      avatarUrl.startsWith('http://') ||
      avatarUrl.startsWith('/'))
  ) {
    return avatarUrl;
  }

  const parsed = parseDiceBearSpec(avatarUrl);
  const styleId: AvatarStyleId = parsed ? parsed.style : 'adventurer';
  const seed = parsed ? parsed.seed : fallbackSeed || 'user';
  const cacheKey = `${styleId}:${seed}`;

  const cached = avatarCache.get(cacheKey);
  if (cached) return cached;

  const styleModule = STYLE_MAP[styleId] || adventurer;
  const dataUri = createAvatar(styleModule, {
    seed,
    size: 128,
    backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'],
  }).toDataUri();

  avatarCache.set(cacheKey, dataUri);
  return dataUri;
}

export async function compressAvatarFile(file: File): Promise<string> {
  const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
  if (!file.type.startsWith('image/') && !isGif) {
    throw new Error('يرجى اختيار ملف صورة أو GIF صالح.');
  }

  if (isGif) {
    if (file.size > 8_000_000) {
      throw new Error('حجم الصورة المتحركة GIF كبير جداً (الحد الأقصى 8 ميجابايت). يمكنك استخدام رابط GIF مباشر.');
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('تعذر قراءة ملف GIF.'));
      reader.onload = () => {
        const res = String(reader.result || '');
        if (res.startsWith('data:image/')) {
          resolve(res);
        } else {
          reject(new Error('تعذر قراءة ملف GIF.'));
        }
      };
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('الصورة غير صالحة.'));
      img.onload = () => {
        const targetSize = 256;
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذر معالجة الصورة.'));
          return;
        }
        // Center-crop square avatar
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
