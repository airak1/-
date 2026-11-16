import React, { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import type { BannerPlacement, CustomSmiley, SiteBanner } from '../types/chat';

interface RichSmileyTextProps {
  text: string;
  smileys?: CustomSmiley[];
  imgClassName?: string;
  highlightQuery?: string;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedSegment(segment: string, query: string, keyPrefix: string): React.ReactNode {
  const trimmed = query.trim();
  if (!trimmed || !segment) return segment;
  const re = new RegExp(`(${escapeRegExp(trimmed)})`, 'gi');
  const pieces = segment.split(re);
  if (pieces.length === 1) return segment;
  const lowerQuery = trimmed.toLowerCase();
  return pieces.map((piece, i) =>
    piece.toLowerCase() === lowerQuery ? (
      <mark
        key={`${keyPrefix}-m-${i}`}
        className="bg-amber-300 text-stone-950 rounded-[2px] px-0.5 font-semibold"
      >
        {piece}
      </mark>
    ) : (
      <React.Fragment key={`${keyPrefix}-t-${i}`}>{piece}</React.Fragment>
    )
  );
}

export const RichSmileyText: React.FC<RichSmileyTextProps> = ({
  text,
  smileys = [],
  imgClassName = 'w-6 h-6 sm:w-7 sm:h-7 object-contain inline-block align-middle mx-0.5',
  highlightQuery = '',
}) => {
  const { regex, map } = useMemo(() => {
    const active = smileys.filter((s) => s.code && s.imageUrl);
    if (active.length === 0) {
      return { regex: null as RegExp | null, map: new Map<string, CustomSmiley>() };
    }
    const lookup = new Map<string, CustomSmiley>();
    const sorted = [...active].sort((a, b) => b.code.length - a.code.length);
    for (const s of sorted) {
      lookup.set(s.code.toLowerCase(), s);
    }
    const pattern = sorted.map((s) => escapeRegExp(s.code)).join('|');
    return {
      regex: pattern ? new RegExp(`(${pattern})`, 'gi') : null,
      map: lookup,
    };
  }, [smileys]);

  if (!text) {
    return null;
  }

  if (!regex) {
    return <>{renderHighlightedSegment(text, highlightQuery, 'plain')}</>;
  }

  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, idx) => {
        if (!part) return null;
        const match = map.get(part.toLowerCase());
        if (match) {
          return (
            <img
              key={`${match.id}-${idx}`}
              src={match.imageUrl}
              alt={match.label || match.code}
              title={match.label ? `${match.label} (${match.code})` : match.code}
              referrerPolicy="no-referrer"
              loading="lazy"
              className={imgClassName}
            />
          );
        }
        return (
          <React.Fragment key={idx}>
            {renderHighlightedSegment(part, highlightQuery, `seg-${idx}`)}
          </React.Fragment>
        );
      })}
    </>
  );
};

interface BannerStripProps {
  banners?: SiteBanner[];
  placement: BannerPlacement;
  className?: string;
}

export const BannerStrip: React.FC<BannerStripProps> = ({
  banners = [],
  placement,
  className = '',
}) => {
  const activeBanners = useMemo(
    () => banners.filter((b) => b.enabled !== false && b.placement === placement && b.imageUrl),
    [banners, placement]
  );

  if (activeBanners.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {activeBanners.map((banner) => {
        const inner = (
          <div className="relative group w-full overflow-hidden rounded-xs border border-stone-300/80 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xs">
            <img
              src={banner.imageUrl}
              alt={banner.title || 'بنر'}
              referrerPolicy="no-referrer"
              loading="lazy"
              className="w-full max-h-24 sm:max-h-28 object-cover block"
            />
            {(banner.title || banner.linkUrl) && (
              <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between gap-2 pointer-events-none">
                {banner.title ? (
                  <span className="px-2 py-0.5 rounded-xs bg-black/55 text-white text-[10px] sm:text-[11px] font-bold truncate backdrop-blur-[1px]">
                    {banner.title}
                  </span>
                ) : (
                  <span />
                )}
                {banner.linkUrl && (
                  <span className="px-1.5 py-0.5 rounded-xs bg-black/55 text-amber-200 text-[10px] font-semibold inline-flex items-center gap-1 shrink-0">
                    <ExternalLink className="w-2.5 h-2.5" />
                    <span>زيارة</span>
                  </span>
                )}
              </div>
            )}
          </div>
        );

        if (banner.linkUrl) {
          return (
            <a
              key={banner.id}
              href={banner.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:opacity-95 transition-opacity"
            >
              {inner}
            </a>
          );
        }

        return <div key={banner.id}>{inner}</div>;
      })}
    </div>
  );
};
