import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';
import { RotateCcw, Clock, Footprints, Trophy } from 'lucide-react';

interface GemSlideViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

// Generate guaranteed solvable 15-puzzle by walking valid random moves from solved state
function generateSolvableBoard(): (number | null)[] {
  const board: (number | null)[] = [...Array.from({ length: 15 }, (_, i) => i + 1), null];
  let emptyIdx = 15;

  // Make 120 random legal sliding moves
  for (let step = 0; step < 120; step++) {
    const r = Math.floor(emptyIdx / 4);
    const c = emptyIdx % 4;
    const neighbors: number[] = [];
    if (r > 0) neighbors.push(emptyIdx - 4);
    if (r < 3) neighbors.push(emptyIdx + 4);
    if (c > 0) neighbors.push(emptyIdx - 1);
    if (c < 3) neighbors.push(emptyIdx + 1);

    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    board[emptyIdx] = board[pick];
    board[pick] = null;
    emptyIdx = pick;
  }

  return board;
}

function checkIsSolved(board: (number | null)[]): boolean {
  for (let i = 0; i < 15; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[15] === null;
}

export const GemSlideView: React.FC<GemSlideViewProps> = ({
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const [board, setBoard] = useState<(number | null)[]>(() => generateSolvableBoard());
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [score, setScore] = useState(0);

  const isGameOverRef = useRef(false);

  // Timer interval
  useEffect(() => {
    if (isPaused || isGameOverRef.current) return;
    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Restart puzzle
  const handleReset = useCallback(() => {
    isGameOverRef.current = false;
    setBoard(generateSolvableBoard());
    setMoves(0);
    setTimer(0);
    setScore(0);
    onScoreUpdate({ score: 0 });
    sounds.playTap();
  }, [onScoreUpdate]);

  // Slide tile at index if adjacent to empty slot
  const slideTile = useCallback(
    (index: number) => {
      if (isPaused || isGameOverRef.current) return;
      if (board[index] === null) return;

      const emptyIdx = board.indexOf(null);
      const r = Math.floor(index / 4);
      const c = index % 4;
      const er = Math.floor(emptyIdx / 4);
      const ec = emptyIdx % 4;

      const isAdjacent = Math.abs(r - er) + Math.abs(c - ec) === 1;
      if (!isAdjacent) return;

      const newBoard = [...board];
      newBoard[emptyIdx] = newBoard[index];
      newBoard[index] = null;

      const nextMoves = moves + 1;
      setBoard(newBoard);
      setMoves(nextMoves);

      sounds.playTap();
      haptics.tap();

      if (checkIsSolved(newBoard)) {
        isGameOverRef.current = true;
        const timeBonus = Math.max(0, 1000 - timer * 4);
        const moveBonus = Math.max(0, 1500 - nextMoves * 12);
        const finalScore = 2000 + timeBonus + moveBonus;
        setScore(finalScore);
        onScoreUpdate({ score: finalScore });

        sounds.playVictory();
        haptics.success();
        const stars = nextMoves <= 80 ? 3 : nextMoves <= 140 ? 2 : 1;
        onGameOver(finalScore, true, stars);
      }
    },
    [board, isPaused, moves, onGameOver, onScoreUpdate, timer]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || isGameOverRef.current) return;
      const emptyIdx = board.indexOf(null);
      const er = Math.floor(emptyIdx / 4);
      const ec = emptyIdx % 4;

      let targetIdx = -1;
      if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && er < 3) {
        targetIdx = (er + 1) * 4 + ec;
      } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && er > 0) {
        targetIdx = (er - 1) * 4 + ec;
      } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && ec < 3) {
        targetIdx = er * 4 + (ec + 1);
      } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && ec > 0) {
        targetIdx = er * 4 + (ec - 1);
      }

      if (targetIdx !== -1) {
        e.preventDefault();
        slideTile(targetIdx);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [board, isPaused, slideTile]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-4 pt-14">
      {/* Top HUD */}
      <div className="w-full max-w-md px-3 flex items-center justify-between z-20">
        <div className="glass-pill px-3 py-1.5 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm flex items-center space-x-1.5">
          <Footprints className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">MOVES: {moves}</span>
        </div>

        <div className="glass-pill px-3 py-1.5 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm flex items-center space-x-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{timer}s</span>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="glass-panel border border-slate-700/40 rounded-xl p-2 active:scale-95 shadow-sm text-rose-400"
          aria-label="Restart"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4x4 Sliding Tile Grid - Maximized */}
      <div className="w-[min(480px,94vw,66vh)] aspect-square p-3 sm:p-4 bg-slate-900/85 dark:bg-slate-950/85 rounded-3xl border border-slate-700/50 dark:border-slate-800 shadow-2xl flex flex-col justify-between my-auto z-20">
        <div className="w-full h-full grid grid-cols-4 grid-rows-4 gap-2 sm:gap-2.5">
          {board.map((val, idx) => {
            if (val === null) {
              return (
                <div
                  key="empty"
                  className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40"
                />
              );
            }

            const isCorrectPosition = val === idx + 1;

            return (
              <button
                key={val}
                type="button"
                aria-label={`Tile ${val}`}
                onPointerDown={e => {
                  e.preventDefault();
                  slideTile(idx);
                }}
                className={`rounded-2xl border flex items-center justify-center font-bold text-xl sm:text-2xl transition-all duration-100 active:scale-95 cursor-pointer ${
                  isCorrectPosition
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-white border-slate-700/40 shadow-sm'
                }`}
              >
                {val}
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Preview Hint */}
      <div className="w-full max-w-md px-3 pb-2 z-20 flex justify-center">
        <div className="glass-panel border border-slate-700/40 rounded-2xl px-4 py-2 shadow-sm flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="text-[11px] font-semibold text-slate-400">
            ARRANGE NUMBERS 1 THROUGH 15 IN ORDER
          </span>
        </div>
      </div>
    </div>
  );
};
