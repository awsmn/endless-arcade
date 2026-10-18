import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';
import { Lightbulb, RotateCcw, Trophy, Zap } from 'lucide-react';

interface LightsOutViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

const SIZE = 5;

// Generate solvable board by applying random toggle presses from an all-off board
function generateSolvableBoard(level: number): { board: boolean[][]; minMoves: number } {
  const board: boolean[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const movesToApply = Math.min(15, 2 + level * 2);

  const toggle = (r: number, c: number) => {
    board[r][c] = !board[r][c];
    if (r > 0) board[r - 1][c] = !board[r - 1][c];
    if (r < SIZE - 1) board[r + 1][c] = !board[r + 1][c];
    if (c > 0) board[r][c - 1] = !board[r][c - 1];
    if (c < SIZE - 1) board[r][c + 1] = !board[r][c + 1];
  };

  const chosenMoves: [number, number][] = [];
  for (let i = 0; i < movesToApply; i++) {
    const r = Math.floor(Math.random() * SIZE);
    const c = Math.floor(Math.random() * SIZE);
    toggle(r, c);
    chosenMoves.push([r, c]);
  }

  // Ensure board is not already solved
  if (board.every(row => row.every(cell => !cell))) {
    toggle(2, 2);
  }

  return { board, minMoves: movesToApply };
}

export const LightsOutView: React.FC<LightsOutViewProps> = ({
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const [level, setLevel] = useState(1);
  const [board, setBoard] = useState<boolean[][]>(() => generateSolvableBoard(1).board);
  const [initialBoard, setInitialBoard] = useState<boolean[][]>(board);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState<boolean[][][]>([]);

  const isGameOverRef = useRef(false);

  const startLevel = useCallback(
    (lvl: number) => {
      isGameOverRef.current = false;
      const { board: newBoard } = generateSolvableBoard(lvl);
      setLevel(lvl);
      setBoard(newBoard);
      setInitialBoard(newBoard);
      setMoves(0);
      setHistory([]);
    },
    []
  );

  const toggleNode = useCallback(
    (r: number, c: number) => {
      if (isPaused || isGameOverRef.current) return;

      const nextBoard = board.map(row => [...row]);
      nextBoard[r][c] = !nextBoard[r][c];
      if (r > 0) nextBoard[r - 1][c] = !nextBoard[r - 1][c];
      if (r < SIZE - 1) nextBoard[r + 1][c] = !nextBoard[r + 1][c];
      if (c > 0) nextBoard[r][c - 1] = !nextBoard[r][c - 1];
      if (c < SIZE - 1) nextBoard[r][c + 1] = !nextBoard[r][c + 1];

      setHistory(h => [...h.slice(-20), board]);
      const nextMoves = moves + 1;
      setBoard(nextBoard);
      setMoves(nextMoves);

      sounds.playTap();
      haptics.tap();

      // Check Victory: all lights off!
      const isCleared = nextBoard.every(row => row.every(cell => !cell));
      if (isCleared) {
        sounds.playVictory();
        haptics.success();
        const earned = Math.max(100, 500 - nextMoves * 20) * level;
        const nextScore = score + earned;
        setScore(nextScore);
        onScoreUpdate({ score: nextScore });

        setTimeout(() => {
          const nextLevel = level + 1;
          if (nextLevel > 20) {
            isGameOverRef.current = true;
            onGameOver(nextScore, true, 3);
          } else {
            startLevel(nextLevel);
          }
        }, 800);
      }
    },
    [board, isPaused, level, moves, onGameOver, onScoreUpdate, score, startLevel]
  );

  const undoMove = () => {
    if (history.length === 0 || isPaused || isGameOverRef.current) return;
    const previous = history[history.length - 1];
    setBoard(previous);
    setHistory(h => h.slice(0, -1));
    setMoves(m => Math.max(0, m - 1));
    sounds.playTap();
  };

  const restartCurrentLevel = () => {
    setBoard(initialBoard);
    setHistory([]);
    setMoves(0);
    sounds.playTap();
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-4 pt-14">
      {/* Top HUD */}
      <div className="w-full max-w-md px-3 flex items-center justify-between z-20">
        <div className="glass-pill px-3 py-1.5 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm flex items-center space-x-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">STAGE {level}</span>
        </div>

        <div className="glass-pill px-3 py-1.5 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm flex items-center space-x-1.5">
          <Trophy className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{score}</span>
        </div>

        <div className="glass-pill px-3 py-1.5 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm flex items-center space-x-1">
          <span className="text-[10px] font-bold text-slate-400">MOVES:</span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{moves}</span>
        </div>
      </div>

      {/* 5x5 Circuit Grid - Maximized */}
      <div className="w-[min(480px,94vw,62vh)] aspect-square p-3 sm:p-4 bg-slate-900/85 dark:bg-slate-950/85 rounded-3xl border border-slate-700/50 dark:border-slate-800 shadow-2xl flex flex-col justify-between my-auto z-20">
        <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-2.5 sm:gap-3">
          {board.map((row, r) =>
            row.map((isOn, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                aria-label={`Node row ${r + 1}, column ${c + 1}: ${isOn ? 'On' : 'Off'}`}
                onPointerDown={e => {
                  e.preventDefault();
                  toggleNode(r, c);
                }}
                className={`rounded-2xl border flex items-center justify-center transition-all duration-150 transform active:scale-95 cursor-pointer ${
                  isOn
                    ? 'bg-amber-400/90 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30'
                    : 'bg-slate-800/80 text-slate-500 border-slate-700/40 hover:bg-slate-700/80'
                }`}
              >
                <Lightbulb
                  className={`w-6 h-6 sm:w-7 sm:h-7 transition-all ${
                    isOn ? 'fill-slate-950 text-slate-950' : 'text-slate-500'
                  }`}
                />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Control Actions & Hint */}
      <div className="w-full max-w-md px-3 pb-2 z-20 flex flex-col space-y-2">
        <div className="flex items-center justify-between space-x-3">
          <button
            type="button"
            onClick={undoMove}
            disabled={history.length === 0}
            className={`flex-1 py-2 rounded-xl border flex items-center justify-center space-x-1.5 text-xs font-bold transition-all active:scale-95 ${
              history.length > 0
                ? 'glass-panel border-slate-700/40 text-slate-200'
                : 'opacity-30 border-slate-800 text-slate-600'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>UNDO</span>
          </button>

          <button
            type="button"
            onClick={restartCurrentLevel}
            className="flex-1 py-2 rounded-xl glass-panel border border-slate-700/40 text-rose-400 active:scale-95 flex items-center justify-center space-x-1.5 text-xs font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTART</span>
          </button>
        </div>

        <div className="text-center">
          <span className="text-[11px] font-semibold text-slate-400">
            OBJECTIVE: TURN OFF ALL 25 LIGHTS
          </span>
        </div>
      </div>
    </div>
  );
};
