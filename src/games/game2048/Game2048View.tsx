import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';

interface Game2048ViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

type Board = (number | null)[][];

export const Game2048View: React.FC<Game2048ViewProps> = ({
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const [board, setBoard] = useState<Board>(createInitialBoard());
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState<{ board: Board; score: number } | null>(null);
  const isGameOverRef = useRef(false);

  // Swipe detection ref
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  function createEmptyBoard(): Board {
    return Array.from({ length: 4 }, () => Array(4).fill(null));
  }

  function spawnRandomTile(b: Board): Board {
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (b[r][c] === null) {
          emptyCells.push({ r, c });
        }
      }
    }
    if (emptyCells.length === 0) return b;
    const choice = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newBoard = b.map(row => [...row]);
    newBoard[choice.r][choice.c] = Math.random() < 0.9 ? 2 : 4;
    return newBoard;
  }

  function createInitialBoard(): Board {
    let b = createEmptyBoard();
    b = spawnRandomTile(b);
    b = spawnRandomTile(b);
    return b;
  }

  const checkGameOver = (b: Board): boolean => {
    // Check for empty cell
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (b[r][c] === null) return false;
        // Check right
        if (c < 3 && b[r][c] === b[r][c + 1]) return false;
        // Check down
        if (r < 3 && b[r][c] === b[r + 1][c]) return false;
      }
    }
    return true;
  };

  const move = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (isPaused || isGameOverRef.current) return;

      let changed = false;
      let pointsEarned = 0;
      let mergeCount = 0;

      const newBoard = board.map(row => [...row]);

      const slideAndMergeRow = (row: (number | null)[]): (number | null)[] => {
        // Filter out nulls
        const filtered = row.filter((val): val is number => val !== null);
        const result: (number | null)[] = [];

        for (let i = 0; i < filtered.length; i++) {
          if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
            const mergedVal = filtered[i] * 2;
            result.push(mergedVal);
            pointsEarned += mergedVal;
            mergeCount++;
            i++; // skip next tile
          } else {
            result.push(filtered[i]);
          }
        }

        while (result.length < 4) {
          result.push(null);
        }
        return result;
      };

      if (direction === 'left') {
        for (let r = 0; r < 4; r++) {
          const oldRow = newBoard[r];
          const newRow = slideAndMergeRow(oldRow);
          if (oldRow.some((val, idx) => val !== newRow[idx])) changed = true;
          newBoard[r] = newRow;
        }
      } else if (direction === 'right') {
        for (let r = 0; r < 4; r++) {
          const oldRow = [...newBoard[r]].reverse();
          const newRow = slideAndMergeRow(oldRow).reverse();
          if (newBoard[r].some((val, idx) => val !== newRow[idx])) changed = true;
          newBoard[r] = newRow;
        }
      } else if (direction === 'up') {
        for (let c = 0; c < 4; c++) {
          const col = [newBoard[0][c], newBoard[1][c], newBoard[2][c], newBoard[3][c]];
          const newCol = slideAndMergeRow(col);
          if (col.some((val, idx) => val !== newCol[idx])) changed = true;
          for (let r = 0; r < 4; r++) newBoard[r][c] = newCol[r];
        }
      } else if (direction === 'down') {
        for (let c = 0; c < 4; c++) {
          const col = [newBoard[3][c], newBoard[2][c], newBoard[1][c], newBoard[0][c]];
          const newCol = slideAndMergeRow(col).reverse();
          if (
            [newBoard[0][c], newBoard[1][c], newBoard[2][c], newBoard[3][c]].some(
              (val, idx) => val !== newCol[idx]
            )
          ) {
            changed = true;
          }
          for (let r = 0; r < 4; r++) newBoard[r][c] = newCol[r];
        }
      }

      if (!changed) return;

      setHistory({ board, score });
      const nextBoard = spawnRandomTile(newBoard);
      const nextScore = score + pointsEarned;

      setBoard(nextBoard);
      setScore(nextScore);
      onScoreUpdate({ score: nextScore });

      if (mergeCount > 0) {
        sounds.playCombo(mergeCount);
        haptics.impact();
      } else {
        sounds.playBounce();
        haptics.tap();
      }

      if (checkGameOver(nextBoard)) {
        isGameOverRef.current = true;
        sounds.playGameOver();
        haptics.gameOver();

        // Calculate stars based on highest tile
        let maxTile = 0;
        for (const r of nextBoard) {
          for (const cell of r) {
            if (cell && cell > maxTile) maxTile = cell;
          }
        }
        const stars = maxTile >= 2048 ? 3 : maxTile >= 1024 ? 2 : maxTile >= 512 ? 1 : 0;
        onGameOver(nextScore, false, stars);
      }
    },
    [board, score, isPaused, onScoreUpdate, onGameOver]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          move('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          move('down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          move('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          move('right');
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const minDistance = 25;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > minDistance) {
        move(dx > 0 ? 'right' : 'left');
      }
    } else {
      if (Math.abs(dy) > minDistance) {
        move(dy > 0 ? 'down' : 'up');
      }
    }
    touchStartRef.current = null;
  };

  const handleUndo = () => {
    if (!history) return;
    setBoard(history.board);
    setScore(history.score);
    onScoreUpdate({ score: history.score });
    setHistory(null);
    sounds.playTap();
    haptics.tap();
  };

  const getTileStyle = (val: number | null) => {
    if (!val) return 'bg-slate-800/40 border border-slate-700/30';
    switch (val) {
      case 2:
        return 'bg-amber-100/90 text-slate-800 font-black shadow-sm';
      case 4:
        return 'bg-amber-200 text-slate-800 font-black shadow-sm';
      case 8:
        return 'bg-amber-500 text-white font-black shadow-md';
      case 16:
        return 'bg-orange-500 text-white font-black shadow-md';
      case 32:
        return 'bg-rose-500 text-white font-black shadow-lg';
      case 64:
        return 'bg-red-600 text-white font-black shadow-lg';
      case 128:
        return 'bg-yellow-400 text-slate-900 font-black shadow-neon-amber';
      case 256:
        return 'bg-yellow-300 text-slate-900 font-black shadow-neon-amber';
      case 512:
        return 'bg-emerald-400 text-slate-900 font-black shadow-neon-emerald';
      case 1024:
        return 'bg-cyan-400 text-slate-900 font-black shadow-neon-cyan';
      case 2048:
        return 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black shadow-neon-indigo animate-pulse';
      default:
        return 'bg-gradient-to-br from-pink-500 via-rose-500 to-amber-500 text-white font-black shadow-neon-pink';
    }
  };

  const getFontSize = (val: number | null) => {
    if (!val) return 'text-xl';
    if (val < 100) return 'text-2xl';
    if (val < 1000) return 'text-xl';
    if (val < 10000) return 'text-lg';
    return 'text-sm';
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-4 pt-16"
    >
      {/* Top Undo Bar */}
      <div className="w-full max-w-xs px-4 flex justify-end z-20">
        <button
          onClick={handleUndo}
          disabled={!history}
          className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5 transition-all ${
            history
              ? 'glass-pill text-white active:scale-95'
              : 'opacity-40 text-slate-500 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>UNDO</span>
        </button>
      </div>

      {/* 2048 4x4 Grid Board */}
      <div className="w-[min(340px,84vw,42vh)] aspect-square p-3 bg-slate-900/80 rounded-3xl border-2 border-amber-500/30 shadow-2xl flex flex-col justify-between my-auto">
        {board.map((row, rIdx) => (
          <div key={rIdx} className="flex-1 flex space-x-2 my-1">
            {row.map((cell, cIdx) => (
              <div
                key={cIdx}
                className={`flex-1 rounded-2xl flex items-center justify-center transition-all duration-150 transform ${getTileStyle(
                  cell
                )}`}
              >
                {cell && (
                  <span className={`${getFontSize(cell)} select-none drop-shadow`}>
                    {cell}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Mobile Virtual D-Pad for one-handed thumb navigation */}
      <div className="w-full max-w-xs flex flex-col items-center space-y-1.5 px-4 pb-2 z-20">
        <button
          onClick={() => move('up')}
          className="w-12 h-12 rounded-2xl glass-panel border border-white/10 active:bg-white/20 active:scale-90 flex items-center justify-center text-slate-200 transition-transform shadow-lg"
          aria-label="Up"
        >
          <ArrowUp className="w-6 h-6" />
        </button>

        <div className="flex items-center space-x-6">
          <button
            onClick={() => move('left')}
            className="w-12 h-12 rounded-2xl glass-panel border border-white/10 active:bg-white/20 active:scale-90 flex items-center justify-center text-slate-200 transition-transform shadow-lg"
            aria-label="Left"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="w-4 h-4 rounded-full bg-amber-500/40 border border-amber-500/60" />

          <button
            onClick={() => move('right')}
            className="w-12 h-12 rounded-2xl glass-panel border border-white/10 active:bg-white/20 active:scale-90 flex items-center justify-center text-slate-200 transition-transform shadow-lg"
            aria-label="Right"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        <button
          onClick={() => move('down')}
          className="w-12 h-12 rounded-2xl glass-panel border border-white/10 active:bg-white/20 active:scale-90 flex items-center justify-center text-slate-200 transition-transform shadow-lg"
          aria-label="Down"
        >
          <ArrowDown className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
