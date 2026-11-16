import React, { useState } from 'react';
import { X, Dices, Trophy, Bot } from 'lucide-react';
import type { GameChallengeState } from '../types/chat';

interface ChallengeGameModalProps {
  challenge: GameChallengeState;
  selfId: string;
  onXoMove: (challengeId: string, cellIndex: number) => void;
  onLudoRoll: (challengeId: string) => void;
  onClose: () => void;
}

function checkLocalXoWinner(board: ('' | 'X' | 'O')[]): 'X' | 'O' | 'draw' | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as 'X' | 'O';
    }
  }
  if (board.every((cell) => cell !== '')) return 'draw';
  return null;
}

export const ChallengeGameModal: React.FC<ChallengeGameModalProps> = ({
  challenge,
  selfId,
  onXoMove,
  onLudoRoll,
  onClose,
}) => {
  // Optional instant bot practice mode while opponent hasn't accepted yet
  const [botMode, setBotMode] = useState(false);
  const [botXoBoard, setBotXoBoard] = useState<('' | 'X' | 'O')[]>(() => Array(9).fill(''));
  const [botXoStatus, setBotXoStatus] = useState<'active' | 'win' | 'lose' | 'draw'>('active');
  const [botLudoPos, setBotLudoPos] = useState({ player: 0, bot: 0, lastDice: 0, msg: 'ارمِ النرد لتبدأ السباق!' });

  const isMyTurn = challenge.turnUserId === selfId;
  const myMark = challenge.challengerId === selfId ? 'X' : 'O';

  const handleBotXoClick = (idx: number) => {
    if (botXoStatus !== 'active' || botXoBoard[idx] !== '') return;
    const next = [...botXoBoard];
    next[idx] = 'X';
    const afterPlayer = checkLocalXoWinner(next);
    if (afterPlayer === 'X') {
      setBotXoBoard(next);
      setBotXoStatus('win');
      return;
    }
    if (afterPlayer === 'draw') {
      setBotXoBoard(next);
      setBotXoStatus('draw');
      return;
    }
    const emptyCells = next
      .map((val, i) => (val === '' ? i : -1))
      .filter((i) => i !== -1);
    if (emptyCells.length > 0) {
      const botPick = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      next[botPick] = 'O';
    }
    const afterBot = checkLocalXoWinner(next);
    setBotXoBoard(next);
    if (afterBot === 'O') setBotXoStatus('lose');
    else if (afterBot === 'draw') setBotXoStatus('draw');
  };

  const handleBotLudoRoll = () => {
    if (botLudoPos.player >= 24 || botLudoPos.bot >= 24) return;
    const pRoll = Math.floor(Math.random() * 6) + 1;
    const nextPlayer = Math.min(24, botLudoPos.player + pRoll);
    if (nextPlayer >= 24) {
      setBotLudoPos({
        player: 24,
        bot: botLudoPos.bot,
        lastDice: pRoll,
        msg: `رميت (${pRoll}) وفزت بالسباق!`,
      });
      return;
    }
    const bRoll = Math.floor(Math.random() * 6) + 1;
    const nextBot = Math.min(24, botLudoPos.bot + bRoll);
    setBotLudoPos({
      player: nextPlayer,
      bot: nextBot,
      lastDice: pRoll,
      msg:
        nextBot >= 24
          ? `رميت (${pRoll}) ولكن البوت رمى (${bRoll}) وسبقك!`
          : `رميت (${pRoll}) وتقدمت للخانة ${nextPlayer} · البوت رمى (${bRoll})`,
    });
  };

  const renderXoBoard = (
    board: ('' | 'X' | 'O')[],
    disabled: boolean,
    onCellClick: (idx: number) => void
  ) => (
    <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto" dir="ltr">
      {board.map((cell, i) => (
        <button
          key={i}
          type="button"
          disabled={disabled || cell !== ''}
          onClick={() => onCellClick(i)}
          className={`h-18 rounded-md border-2 text-2xl font-extrabold flex items-center justify-center transition-colors cursor-pointer disabled:cursor-default ${
            cell === 'X'
              ? 'border-[#855853] bg-[#f8eff0] text-[#855853]'
              : cell === 'O'
              ? 'border-[#44a948] bg-emerald-50 text-[#44a948]'
              : 'border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-stone-50 dark:hover:bg-zinc-800'
          }`}
        >
          {cell}
        </button>
      ))}
    </div>
  );

  const renderLudoTrack = (p1Pos: number, p2Pos: number, p1Label: string, p2Label: string) => (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-1.5" dir="ltr">
        {Array.from({ length: 24 }, (_, idx) => {
          const step = idx + 1;
          const hasP1 = p1Pos === step;
          const hasP2 = p2Pos === step;
          const isFinish = step === 24;
          const zoneColor =
            idx < 6
              ? 'bg-rose-100 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
              : idx < 12
              ? 'bg-sky-100 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800'
              : idx < 18
              ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
              : 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800';
          return (
            <div
              key={step}
              className={`h-9 rounded-xs border flex items-center justify-center relative text-[10px] font-mono-tabular font-bold ${zoneColor}`}
            >
              <span className="opacity-55">{isFinish ? '🏁' : step}</span>
              {hasP1 && (
                <span
                  title={p1Label}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#855853] text-white text-[9px] flex items-center justify-center shadow-xs"
                >
                  1
                </span>
              )}
              {hasP2 && (
                <span
                  title={p2Label}
                  className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-[#44a948] text-white text-[9px] flex items-center justify-center shadow-xs"
                >
                  2
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs font-bold px-1">
        <span className="text-[#855853] dark:text-amber-300">
          ● {p1Label}: {p1Pos}/24
        </span>
        <span className="text-[#44a948]">
          ● {p2Label}: {p2Pos}/24
        </span>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-800 rounded-md shadow-2xl overflow-hidden">
        <div className="px-4 py-2.5 bg-[#855853] text-white flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Trophy className="w-4 h-4 text-amber-300" />
            <span>{challenge.gameType === 'xo' ? 'تحدي X-O' : 'تحدي Ludo'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق التحدي"
            className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/35 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!botMode ? (
            <>
              <div className="flex items-center justify-between text-xs font-bold text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-zinc-950 p-2.5 rounded-xs border border-stone-200 dark:border-zinc-800">
                <span>{challenge.challengerName} (X / 1)</span>
                <span className="text-[#855853] dark:text-amber-300">ضد</span>
                <span>{challenge.opponentName} (O / 2)</span>
              </div>

              <div className="text-center text-xs font-bold text-[#855853] dark:text-amber-300">
                {challenge.lastActionText}
              </div>

              {challenge.status === 'pending' && (
                <div className="text-center space-y-2.5 py-2">
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    تم إرسال الدعوة بنجاح. يمكنك الانتظار أو اللعب فوراً ضد البوت:
                  </p>
                  <button
                    type="button"
                    onClick={() => setBotMode(true)}
                    className="px-4 py-2 rounded-xs bg-[#44a948] hover:bg-[#3a963e] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bot className="w-4 h-4" />
                    <span>العب ضد البوت الآن</span>
                  </button>
                </div>
              )}

              {challenge.status !== 'pending' && challenge.gameType === 'xo' && (
                <div className="space-y-2">
                  <div className="text-center text-[11px] text-stone-500 dark:text-stone-400">
                    رمزك: <strong>{myMark}</strong>
                  </div>
                  {renderXoBoard(
                    challenge.xoBoard,
                    challenge.status !== 'active' || !isMyTurn,
                    (idx) => onXoMove(challenge.id, idx)
                  )}
                </div>
              )}

              {challenge.status !== 'pending' && challenge.gameType === 'ludo' && (
                <div className="space-y-3">
                  {renderLudoTrack(
                    challenge.ludoPositions[challenge.challengerId] || 0,
                    challenge.ludoPositions[challenge.opponentId] || 0,
                    challenge.challengerName,
                    challenge.opponentName
                  )}
                  {challenge.status === 'active' && (
                    <button
                      type="button"
                      disabled={!isMyTurn}
                      onClick={() => onLudoRoll(challenge.id)}
                      className="w-full py-2.5 rounded-xs bg-[#44a948] hover:bg-[#3a963e] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Dices className="w-4 h-4" />
                      <span>{isMyTurn ? 'ارمِ نرد اللودو' : `بانتظار رمية ${challenge.opponentName === challenge.challengerName ? '' : isMyTurn ? '' : 'الخصم'}`}</span>
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#855853] dark:text-amber-300 flex items-center gap-1">
                  <Bot className="w-4 h-4" />
                  <span>وضع اللعب السريع ضد البوت</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setBotXoBoard(Array(9).fill(''));
                    setBotXoStatus('active');
                    setBotLudoPos({ player: 0, bot: 0, lastDice: 0, msg: 'ارمِ النرد لتبدأ السباق!' });
                  }}
                  className="text-[#44a948] hover:underline cursor-pointer"
                >
                  إعادة اللعب
                </button>
              </div>

              {challenge.gameType === 'xo' ? (
                <div className="space-y-3">
                  {renderXoBoard(botXoBoard, botXoStatus !== 'active', handleBotXoClick)}
                  {botXoStatus !== 'active' && (
                    <div className="text-center text-sm font-bold text-[#855853] dark:text-amber-300">
                      {botXoStatus === 'win'
                        ? 'مبروك، فزت!'
                        : botXoStatus === 'lose'
                        ? 'فاز البوت هذه الجولة!'
                        : 'تعادل!'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {renderLudoTrack(botLudoPos.player, botLudoPos.bot, 'أنت', 'البوت')}
                  <div className="text-center text-xs font-semibold text-stone-700 dark:text-stone-300">
                    {botLudoPos.msg}
                  </div>
                  <button
                    type="button"
                    disabled={botLudoPos.player >= 24 || botLudoPos.bot >= 24}
                    onClick={handleBotLudoRoll}
                    className="w-full py-2.5 rounded-xs bg-[#44a948] hover:bg-[#3a963e] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Dices className="w-4 h-4" />
                    <span>ارمِ النرد</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
