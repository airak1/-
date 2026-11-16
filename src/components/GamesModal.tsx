import React, { useState } from 'react';
import { X, Trophy, Dices, HelpCircle, Swords, DoorOpen, Send } from 'lucide-react';

interface GamesModalProps {
  onClose: () => void;
  onJoinGamesRoom: () => void;
  onPostResultToRoom: (text: string) => void;
}

const IRAQI_RIDDLES: { question: string; options: string[]; answerIndex: number }[] = [
  {
    question: 'ما هي المدينة العراقية التي تلقب بـ «أم الربيعين»؟',
    options: ['البصرة', 'الموصل', 'كربلاء', 'بغداد'],
    answerIndex: 1,
  },
  {
    question: 'أي نهرين يلتقيان في منطقة القرنة ليكوّنا شط العرب؟',
    options: ['دجلة والفرات', 'ديالى والزاب', 'دجلة والكارون', 'الفرات والخابور'],
    answerIndex: 0,
  },
  {
    question: 'أكلة عراقية شعبية شهيرة تُطهى على الحطب وتقدّم مع الليمون والطرشي:',
    options: ['الكبسة', 'المسگوف', 'المندي', 'المنسف'],
    answerIndex: 1,
  },
  {
    question: 'ما اسم الشارع البغدادي الشهير بسوق الكتب والثقافة؟',
    options: ['شارع السعدون', 'شارع فلسطين', 'شارع المتنبي', 'شارع الرشيد'],
    answerIndex: 2,
  },
  {
    question: 'في الثقافة العراقية، ما معنى كلمة «خوش»؟',
    options: ['سريع', 'طيب / ممتاز', 'بعيد', 'بارد'],
    answerIndex: 1,
  },
];

type GameTab = 'riddles' | 'rps' | 'dice';
type RpsChoice = 'حجر' | 'ورقة' | 'مقص';

export const GamesModal: React.FC<GamesModalProps> = ({
  onClose,
  onJoinGamesRoom,
  onPostResultToRoom,
}) => {
  const [gameTab, setGameTab] = useState<GameTab>('riddles');

  // Riddles state
  const [riddleIdx, setRiddleIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [riddleScore, setRiddleScore] = useState(0);

  // RPS state
  const [rpsUser, setRpsUser] = useState<RpsChoice | null>(null);
  const [rpsBot, setRpsBot] = useState<RpsChoice | null>(null);
  const [rpsResult, setRpsResult] = useState('');
  const [rpsScore, setRpsScore] = useState({ win: 0, lose: 0, draw: 0 });

  // Dice state
  const [diceValue, setDiceValue] = useState<number>(6);
  const [dicePosted, setDicePosted] = useState(false);

  const currentRiddle = IRAQI_RIDDLES[riddleIdx];

  const handleRiddleAnswer = (optIdx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optIdx);
    if (optIdx === currentRiddle.answerIndex) {
      setRiddleScore((s) => s + 1);
    }
  };

  const handleNextRiddle = () => {
    setSelectedOption(null);
    setRiddleIdx((prev) => (prev + 1) % IRAQI_RIDDLES.length);
  };

  const playRps = (choice: RpsChoice) => {
    const options: RpsChoice[] = ['حجر', 'ورقة', 'مقص'];
    const bot = options[Math.floor(Math.random() * options.length)];
    setRpsUser(choice);
    setRpsBot(bot);

    if (choice === bot) {
      setRpsResult('تعادل!');
      setRpsScore((s) => ({ ...s, draw: s.draw + 1 }));
      return;
    }

    const userWins =
      (choice === 'حجر' && bot === 'مقص') ||
      (choice === 'ورقة' && bot === 'حجر') ||
      (choice === 'مقص' && bot === 'ورقة');

    if (userWins) {
      setRpsResult('مبروك، فزت!');
      setRpsScore((s) => ({ ...s, win: s.win + 1 }));
    } else {
      setRpsResult('فاز البوت هذه الجولة!');
      setRpsScore((s) => ({ ...s, lose: s.lose + 1 }));
    }
  };

  const rollDice = () => {
    const val = Math.floor(Math.random() * 6) + 1;
    setDiceValue(val);
    setDicePosted(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="games-modal-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-800 rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        <div className="px-4 py-3 bg-gradient-to-l from-[#9d71e8] to-[#7c4dff] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            <h2 id="games-modal-title" className="font-display text-base font-bold">
              الألعاب والتحديات
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="p-1 rounded-xs bg-black/20 hover:bg-black/30 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Game Switcher Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1.5 bg-stone-100 dark:bg-zinc-950 border-b border-stone-200 dark:border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setGameTab('riddles')}
            className={`py-2 px-2 rounded-xs text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
              gameTab === 'riddles'
                ? 'bg-[#855853] text-white'
                : 'text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-zinc-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>حزورات</span>
          </button>
          <button
            type="button"
            onClick={() => setGameTab('rps')}
            className={`py-2 px-2 rounded-xs text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
              gameTab === 'rps'
                ? 'bg-[#855853] text-white'
                : 'text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-zinc-800'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>حجر ورقة</span>
          </button>
          <button
            type="button"
            onClick={() => setGameTab('dice')}
            className={`py-2 px-2 rounded-xs text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
              gameTab === 'dice'
                ? 'bg-[#855853] text-white'
                : 'text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-zinc-800'
            }`}
          >
            <Dices className="w-3.5 h-3.5" />
            <span>نرد الحظ</span>
          </button>
        </div>

        <div className="p-4 overflow-y-auto chat-scroll space-y-4">
          {gameTab === 'riddles' && (
            <div key="game-riddles" className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span>السؤال {riddleIdx + 1} من {IRAQI_RIDDLES.length}</span>
                <span className="font-bold text-[#44a948] font-mono-tabular">النتيجة: {riddleScore}</span>
              </div>

              <div className="p-3.5 rounded-xs bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 text-sm font-bold text-stone-900 dark:text-stone-100 leading-relaxed">
                {currentRiddle.question}
              </div>

              <div className="space-y-2">
                {currentRiddle.options.map((opt, i) => {
                  const isPicked = selectedOption === i;
                  const isCorrect = i === currentRiddle.answerIndex;
                  let styleClass =
                    'border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-zinc-800';
                  if (selectedOption !== null) {
                    if (isCorrect) {
                      styleClass = 'border-[#44a948] bg-[#44a948] text-white';
                    } else if (isPicked) {
                      styleClass = 'border-red-600 bg-red-600 text-white';
                    }
                  }
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleRiddleAnswer(i)}
                      className={`w-full py-2.5 px-3 rounded-xs border text-xs sm:text-sm font-semibold text-right transition-colors cursor-pointer ${styleClass}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <button
                  type="button"
                  onClick={handleNextRiddle}
                  className="w-full py-2.5 rounded-xs bg-[#855853] hover:bg-[#734a45] text-white text-xs font-bold cursor-pointer"
                >
                  السؤال التالي
                </button>
              )}
            </div>
          )}

          {gameTab === 'rps' && (
            <div key="game-rps" className="space-y-4 text-center">
              <div className="text-xs text-stone-500 dark:text-stone-400 font-mono-tabular">
                فوز: {rpsScore.win} · تعادل: {rpsScore.draw} · خسارة: {rpsScore.lose}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['حجر', 'ورقة', 'مقص'] as RpsChoice[]).map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => playRps(choice)}
                    className="py-3 px-2 rounded-xs border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 hover:bg-[#855853] hover:text-white hover:border-[#855853] text-sm font-bold transition-colors cursor-pointer"
                  >
                    {choice === 'حجر' ? '🪨 حجر' : choice === 'ورقة' ? '📄 ورقة' : '✂️ مقص'}
                  </button>
                ))}
              </div>

              {rpsUser && rpsBot && (
                <div className="p-3 rounded-xs bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 space-y-1">
                  <div className="text-xs text-stone-600 dark:text-stone-300">
                    اختيارك: <strong>{rpsUser}</strong> — اختيار البوت: <strong>{rpsBot}</strong>
                  </div>
                  <div className="text-sm font-bold text-[#855853] dark:text-amber-300">
                    {rpsResult}
                  </div>
                </div>
              )}
            </div>
          )}

          {gameTab === 'dice' && (
            <div key="game-dice" className="space-y-4 text-center">
              <div className="w-20 h-20 mx-auto rounded-md bg-[#855853] text-white flex items-center justify-center text-3xl font-bold font-mono-tabular shadow-md">
                {diceValue}
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={rollDice}
                  className="px-4 py-2 rounded-xs bg-[#44a948] hover:bg-[#3a963e] text-white text-xs font-bold cursor-pointer"
                >
                  ارمِ النرد
                </button>
                <button
                  type="button"
                  disabled={dicePosted}
                  onClick={() => {
                    onPostResultToRoom(`🎲 رمى نرد الحظ وحصل على الرقم (${diceValue})!`);
                    setDicePosted(true);
                  }}
                  className="px-3 py-2 rounded-xs border border-stone-300 dark:border-zinc-700 text-xs font-semibold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{dicePosted ? 'تم النشر' : 'نشر بالعام'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-stone-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                onJoinGamesRoom();
                onClose();
              }}
              className="w-full py-2.5 px-3 rounded-xs bg-[#855853] hover:bg-[#734a45] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <DoorOpen className="w-4 h-4" />
              <span>الانتقال إلى غرفة المسابقات والثقافة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
