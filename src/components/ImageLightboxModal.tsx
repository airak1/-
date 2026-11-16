import React, { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';

export interface LightboxImagePayload {
  src: string;
  alt?: string;
}

interface ImageLightboxModalProps {
  image: LightboxImagePayload | null;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({ image, onClose }) => {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);

  const lastTapRef = useRef(0);
  const gestureRef = useRef<{
    mode: 'none' | 'pan' | 'pinch';
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    pinchStartDist: number;
    pinchStartScale: number;
    moved: boolean;
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    pinchStartDist: 0,
    pinchStartScale: 1,
    moved: false,
  });

  useEffect(() => {
    if (!image) return;
    setScale(1);
    setPan({ x: 0, y: 0 });
    setIsInteracting(false);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(MAX_SCALE, Number((s + 0.5).toFixed(2))));
      } else if (e.key === '-') {
        setScale((s) => {
          const next = Math.max(MIN_SCALE, Number((s - 0.5).toFixed(2)));
          if (next <= 1) setPan({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === '0') {
        setScale(1);
        setPan({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image, onClose]);

  if (!image) return null;

  const clampPan = (x: number, y: number, currentScale: number) => {
    if (currentScale <= 1) return { x: 0, y: 0 };
    const limit = 420 * (currentScale - 1);
    return {
      x: Math.max(-limit, Math.min(limit, x)),
      y: Math.max(-limit, Math.min(limit, y)),
    };
  };

  const applyScale = (nextScale: number) => {
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number(nextScale.toFixed(2))));
    setScale(clamped);
    setPan((prev) => clampPan(prev.x, prev.y, clamped));
  };

  const toggleDoubleZoom = () => {
    if (scale > 1.05) {
      setScale(1);
      setPan({ x: 0, y: 0 });
    } else {
      setScale(2.2);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.3 : -0.3;
    applyScale(scale + delta);
  };

  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      setIsInteracting(true);
      gestureRef.current = {
        ...gestureRef.current,
        mode: 'pinch',
        pinchStartDist: getTouchDistance(e.touches[0], e.touches[1]),
        pinchStartScale: scale,
        moved: true,
      };
      return;
    }

    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        lastTapRef.current = 0;
        toggleDoubleZoom();
        return;
      }
      lastTapRef.current = now;

      setIsInteracting(true);
      gestureRef.current = {
        ...gestureRef.current,
        mode: 'pan',
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startPanX: pan.x,
        startPanY: pan.y,
        moved: false,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (g.mode === 'pinch' && e.touches.length === 2 && g.pinchStartDist > 0) {
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const ratio = dist / g.pinchStartDist;
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, g.pinchStartScale * ratio));
      setScale(Number(next.toFixed(2)));
      setPan((prev) => clampPan(prev.x, prev.y, next));
      return;
    }

    if (g.mode === 'pan' && e.touches.length === 1) {
      const dx = e.touches[0].clientX - g.startX;
      const dy = e.touches[0].clientY - g.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        g.moved = true;
      }
      if (scale > 1) {
        setPan(clampPan(g.startPanX + dx, g.startPanY + dy, scale));
      }
    }
  };

  const handleTouchEnd = () => {
    setIsInteracting(false);
    gestureRef.current.mode = 'none';
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || scale <= 1) return;
    e.preventDefault();
    setIsInteracting(true);
    gestureRef.current = {
      ...gestureRef.current,
      mode: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      moved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!isInteracting || g.mode !== 'pan' || scale <= 1) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      g.moved = true;
    }
    setPan(clampPan(g.startPanX + dx, g.startPanY + dy, scale));
  };

  const handleMouseUp = () => {
    setIsInteracting(false);
    gestureRef.current.mode = 'none';
  };

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gestureRef.current.moved) {
      gestureRef.current.moved = false;
      return;
    }
    if (e.target === e.currentTarget && scale <= 1) {
      onClose();
    }
  };

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={image.alt || 'معاينة وتكبير الصورة'}
      className="fixed inset-0 z-[100] bg-black/92 backdrop-blur-xs flex flex-col select-none"
    >
      {/* Top Controls Toolbar */}
      <div className="px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-black/55 border-b border-white/10 flex items-center justify-between gap-2 text-white shrink-0">
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold truncate">
            {image.alt || 'معاينة الصورة'}
          </span>
          <button
            type="button"
            onClick={() => {
              setScale(1);
              setPan({ x: 0, y: 0 });
            }}
            title="إعادة الحجم الأصلي"
            className="px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-[11px] font-mono-tabular font-semibold cursor-pointer shrink-0"
          >
            {Math.round(scale * 100)}%
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => applyScale(scale - 0.5)}
            disabled={scale <= MIN_SCALE}
            title="تصغير"
            aria-label="تصغير الصورة"
            className="w-9 h-9 rounded-full bg-white/12 hover:bg-white/25 disabled:opacity-35 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => applyScale(scale + 0.5)}
            disabled={scale >= MAX_SCALE}
            title="تكبير"
            aria-label="تكبير الصورة"
            className="w-9 h-9 rounded-full bg-white/12 hover:bg-white/25 disabled:opacity-35 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {scale > 1 && (
            <button
              type="button"
              onClick={() => {
                setScale(1);
                setPan({ x: 0, y: 0 });
              }}
              title="إعادة ضبط التكبير"
              aria-label="إعادة ضبط التكبير"
              className="w-9 h-9 rounded-full bg-white/12 hover:bg-white/25 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <a
            href={image.src}
            download="iraqiachat-image"
            title="حفظ الصورة"
            aria-label="حفظ الصورة"
            className="w-9 h-9 rounded-full bg-white/12 hover:bg-white/25 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          >
            <Download className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            title="إغلاق"
            aria-label="إغلاق معاينة الصورة"
            className="w-9 h-9 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Interactive Zoom Stage */}
      <div
        onClick={handleStageClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 min-h-0 overflow-hidden flex items-center justify-center p-3 touch-none ${
          scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
        }`}
      >
        <img
          src={image.src}
          alt={image.alt || 'صورة مكبرة'}
          referrerPolicy="no-referrer"
          draggable={false}
          onDoubleClick={(e) => {
            e.stopPropagation();
            toggleDoubleZoom();
          }}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
          }}
          className={`max-w-full max-h-full object-contain rounded-sm shadow-2xl ${
            isInteracting ? '' : 'transition-transform duration-150 ease-out'
          }`}
        />
      </div>

      {/* Bottom Gesture Hint */}
      <div className="px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-1 text-center text-[11px] text-white/65 shrink-0 pointer-events-none">
        {scale > 1
          ? 'اسحب الصورة لتحريكها · اضغط مرتين للرجوع للحجم الأصلي'
          : 'اضغط مرتين أو اسحب بإصبعين للتكبير · اضغط بالخارج للإغلاق'}
      </div>
    </div>
  );
};
