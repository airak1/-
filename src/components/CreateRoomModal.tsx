import React, { useState } from 'react';
import { X, Plus, Lock, Mic, MessageSquare } from 'lucide-react';
import { RoomImagePicker } from './RoomImagePicker';

interface CreateRoomModalProps {
  initialVoiceMode?: boolean;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    description: string;
    topic: string;
    password?: string;
    imageUrl?: string;
    isVoiceRoom?: boolean;
    voiceMicCount?: number;
  }) => void;
}

const VOICE_MIC_COUNTS = [4, 6, 8, 10] as const;

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  initialVoiceMode = false,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [password, setPassword] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isVoiceRoom, setIsVoiceRoom] = useState(initialVoiceMode);
  const [voiceMicCount, setVoiceMicCount] = useState<number>(6);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) return;
    onCreate({
      name: name.trim(),
      description: description.trim(),
      topic: topic.trim(),
      password: password.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      isVoiceRoom,
      voiceMicCount: isVoiceRoom ? voiceMicCount : undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-room-title"
    >
      <div className="w-full max-w-md max-h-[92dvh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h2 id="create-room-title" className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {isVoiceRoom && <Mic className="w-5 h-5 text-rose-700 dark:text-amber-400" />}
            <span>{isVoiceRoom ? 'إنشاء غرفة صوتية مخصصة' : 'إنشاء غرفة دردشة جديدة'}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              نوع الغرفة
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsVoiceRoom(true)}
                className={`h-10 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  isVoiceRoom
                    ? 'bg-rose-800 border-rose-800 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Mic className="w-4 h-4 shrink-0" />
                <span>غرفة صوتية</span>
              </button>
              <button
                type="button"
                onClick={() => setIsVoiceRoom(false)}
                className={`h-10 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  !isVoiceRoom
                    ? 'bg-rose-800 border-rose-800 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>غرفة كتابية</span>
              </button>
            </div>
          </div>

          {isVoiceRoom && (
            <div className="p-3 rounded-lg bg-rose-50/70 dark:bg-zinc-950 border border-rose-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-rose-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" />
                  <span>عدد مقاعد المايك الصوتي</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  يتيح التجمع والتحدث بالصوت
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {VOICE_MIC_COUNTS.map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setVoiceMicCount(cnt)}
                    className={`h-8 rounded-md text-xs font-bold font-mono-tabular border cursor-pointer transition-colors ${
                      voiceMicCount === cnt
                        ? 'bg-rose-800 border-rose-800 text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {cnt} مايك
                  </button>
                ))}
              </div>
            </div>
          )}

          <RoomImagePicker
            value={imageUrl}
            onChange={setImageUrl}
            roomName={name || (isVoiceRoom ? 'غرفة صوتية' : 'الغرفة الجديدة')}
          />

          <div>
            <label htmlFor="room-name" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              {isVoiceRoom ? 'اسم الغرفة الصوتية' : 'اسم الغرفة'}
            </label>
            <input
              id="room-name"
              type="text"
              required
              minLength={3}
              maxLength={36}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isVoiceRoom ? 'مثال: ديوانية السوالف الصوتية' : 'مثال: غرفة الموصل وأم الربيعين'}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label htmlFor="room-desc" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              وصف مختصر
            </label>
            <input
              id="room-desc"
              type="text"
              maxLength={100}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isVoiceRoom ? 'غرفة صوتية للتعارف والحديث المباشر...' : 'وصف بسيط لموضوع الغرفة...'}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label htmlFor="room-topic" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              رسالة الترحيب (العنوان المثبت)
            </label>
            <input
              id="room-topic"
              type="text"
              maxLength={140}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="أهلاً وسهلاً بالجميع في الغرفة..."
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label
              htmlFor="room-password"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>كلمة مرور الغرفة (اختياري لعمل غرفة خاصة)</span>
            </label>
            <input
              id="room-password"
              type="password"
              maxLength={32}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="اتركه فارغاً لغرفة مفتوحة للجميع"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-800 hover:bg-rose-900 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isVoiceRoom ? 'إنشاء الغرفة الصوتية' : 'إنشاء الغرفة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
