import React, { useMemo, useState } from 'react';
import { resolveAvatarDataUri } from '../utils/avatar';

interface UserAvatarProps {
  avatarUrl?: string;
  username: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  username,
  size = 'md',
  className = '',
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const isDeletedAvatar = avatarUrl === 'none';

  const src = useMemo(
    () => (isDeletedAvatar ? '' : resolveAvatarDataUri(avatarUrl, username)),
    [avatarUrl, username, isDeletedAvatar]
  );

  const imgFailed = isDeletedAvatar || failedSrc === src;
  const initial = (username || '؟').trim().slice(0, 1).toUpperCase();

  return (
    <div
      style={
        className.includes('rounded-full')
          ? undefined
          : { borderRadius: 'var(--ych-avatar-radius, 0.5rem)' }
      }
      className={`rounded-lg overflow-hidden border border-stone-200 dark:border-zinc-700 bg-[#faf7f5] dark:bg-zinc-800 flex items-center justify-center shrink-0 ${SIZE_CLASSES[size]} ${className}`}
    >
      {!imgFailed && src ? (
        <img
          key={src}
          src={src}
          alt={username}
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span key="fallback" className="font-serif font-bold text-[#855853] dark:text-amber-300 select-none">
          {initial}
        </span>
      )}
    </div>
  );
};
