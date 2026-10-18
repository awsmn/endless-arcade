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
    <div className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-4 pt-14 pop-dots-dense">
      {/* Top HUD */}
      <div className="w-full max-w-xs px-3 flex items-center justify-between z-20">
        <div className="bg-[#14192b] border-2 border-black rounded-xl px-2.5 py-1 shadow-pop-xs flex items-center space-x-1.5">
          <Zap className="w-3.5 h-3.5 text-pop-yellow fill-pop-yellow" />
          <span className="text-xs font-bungee text-white">STAGE {level}</span>
        </div>

        <div className="bg-[#14192b] border-2 border-black rounded-xl px-2.5 py-1 shadow-pop-xs flex items-center space-x-1.5">
          <Trophy className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-bungee text-white">{score}</span>
        </div>

        <div className="bg-[#14192b] border-2 border-black rounded-xl px-2.5 py-1 shadow-pop-xs flex items-center space-x-1">
          <span className="text-[10px] font-pop font-black text-slate-400">MOVES:</span>
          <span className="text-xs font-bungee text-white">{moves}</span>
        </div>
      </div>

      {/* 5x5 Circuit Grid */}
      <div className="w-[min(340px,86vw,44vh)] aspect-square p-3 bg-[#0e1222] rounded-3xl border-2 border-black shadow-pop-lg flex flex-col justify-between my-auto z-20">
        <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-2.5">
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
                className={`rounded-2xl border-2 border-black flex items-center justify-center transition-all duration-150 transform active:scale-90 cursor-pointer ${
                  isOn
                    ? 'bg-pop-yellow text-slate-950 shadow-[0_0_14px_#facc15] scale-100'
                    : 'bg-[#151b30] text-slate-600 border-black/80 hover:bg-[#1e2644]'
                }`}
              >
                <Lightbulb
                  className={`w-6 h-6 transition-all ${
                    isOn ? 'fill-slate-950 text-slate-950' : 'text-slate-600'
                  }`}
                />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Control Actions & Hint */}
      <div className="w-full max-w-xs px-3 pb-2 z-20 flex flex-col space-y-2">
        <div className="flex items-center justify-between space-x-3">
          <button
            onPointerDown={e => {
              e.preventDefault();
              undoMove();
            }}
            disabled={history.length === 0}
            className={`flex-1 py-2 rounded-xl border-2 border-black flex items-center justify-center space-x-1.5 text-xs font-pop font-black ${
              history.length > 0
                ? 'bg-[#14192b] text-white shadow-pop-xs active:translate-x-0.5 active:translate-y-0.5'
                : 'bg-[#14192b]/40 text-slate-600'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>UNDO</span>
          </button>

          <button
            onPointerDown={e => {
              e.preventDefault();
              restartCurrentLevel();
            }}
            className="flex-1 py-2 rounded-xl bg-[#14192b] text-pop-pink border-2 border-black shadow-pop-xs active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center space-x-1.5 text-xs font-pop font-black"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTART</span>
          </button>
        </div>

        <div className="text-center">
          <span className="text-[10px] font-pop font-bold text-slate-400">
            OBJECTIVE: TURN OFF ALL 25 LIGHTS
          </span>
        </div>
      </div>
    </div>
  );
};
