import React, { useEffect, useRef, useState } from 'react';
import { X, Eraser, Send, Paintbrush } from 'lucide-react';

interface DoodleModalProps {
  onClose: () => void;
  onSendDrawing: (dataUrl: string) => void;
}

const BRUSH_COLORS = [
  '#111827',
  '#b91c1c',
  '#0f766e',
  '#1d4ed8',
  '#d97706',
  '#9333ea',
];

const BRUSH_SIZES = [
  { label: 'رفيع', size: 3 },
  { label: 'وسط', size: 6 },
  { label: 'عريض', size: 11 },
];

export const DoodleModal: React.FC<DoodleModalProps> = ({ onClose, onSendDrawing }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasStrokesRef = useRef(false);
  const [brushColor, setBrushColor] = useState(BRUSH_COLORS[0]);
  const [brushSize, setBrushSize] = useState(6);
  const [hasContent, setHasContent] = useState(false);

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hasStrokesRef.current = false;
    setHasContent(false);
  };

  useEffect(() => {
    resetCanvas();
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getPoint(e);
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    if (!hasStrokesRef.current) {
      hasStrokesRef.current = true;
      setHasContent(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    canvasRef.current?.getContext('2d')?.closePath();
  };

  const handleSend = () => {
    if (!hasStrokesRef.current || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSendDrawing(dataUrl);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/65 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doodle-modal-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-800 rounded-md shadow-2xl overflow-hidden">
        <div
          className="px-3.5 py-2.5 text-white flex items-center justify-between"
          style={{ backgroundColor: 'var(--ych-primary)' }}
        >
          <div className="flex items-center gap-2">
            <Paintbrush className="w-4 h-4" />
            <h2 id="doodle-modal-title" className="font-display text-sm sm:text-base font-bold">
              لوحة الرسم الحر للشات
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق لوحة الرسم"
            className="p-1 rounded-xs bg-black/20 hover:bg-black/35 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 space-y-3">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {BRUSH_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setBrushColor(color)}
                  aria-label={`لون ${color}`}
                  className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                    brushColor === color
                      ? 'border-stone-900 dark:border-white scale-110'
                      : 'border-stone-300 dark:border-zinc-700'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className="flex items-center gap-1">
              {BRUSH_SIZES.map((b) => (
                <button
                  key={b.size}
                  type="button"
                  onClick={() => setBrushSize(b.size)}
                  className={`px-2 py-1 rounded-xs text-[11px] font-bold border cursor-pointer ${
                    brushSize === b.size
                      ? 'text-white border-transparent'
                      : 'border-stone-300 dark:border-zinc-700 text-stone-700 dark:text-stone-300'
                  }`}
                  style={
                    brushSize === b.size ? { backgroundColor: 'var(--ych-primary)' } : undefined
                  }
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Drawing Canvas */}
          <div className="border-2 border-stone-300 dark:border-zinc-700 rounded-xs overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={480}
              height={280}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-full h-auto touch-none cursor-crosshair block"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={resetCanvas}
              className="px-3 py-2 rounded-xs border border-stone-300 dark:border-zinc-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>مسح اللوحة</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xs border border-stone-300 dark:border-zinc-700 text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!hasContent}
                onClick={handleSend}
                className="px-4 py-2 rounded-xs bg-[#44a948] hover:bg-[#3a963e] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال الرسمة للشات</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
