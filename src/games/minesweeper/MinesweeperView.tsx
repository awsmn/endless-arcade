import { getDifficulty } from '../../engine/difficulty';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';
import { Flag, Shield, Sparkles, Bomb } from 'lucide-react';

interface MinesweeperViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

interface Cell {
  r: number;
  c: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

export const MinesweeperView: React.FC<MinesweeperViewProps> = ({
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const rows = 9;
  const cols = 9;
  const [totalMines] = useState(() => getDifficulty().mines);

  const [grid, setGrid] = useState<Cell[][]>(() => createInitialGrid());
  const [isFirstTap, setIsFirstTap] = useState(true);
  const [flagMode, setFlagMode] = useState(false);
  const [remainingFlags, setRemainingFlags] = useState<number>(totalMines);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);

  const isGameOverRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function createInitialGrid(): Cell[][] {
    const g: Cell[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          r,
          c,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0
        });
      }
      g.push(row);
    }
    return g;
  }

  // Populate mines ensuring safe zone around first clicked cell
  const populateMines = (firstR: number, firstC: number, g: Cell[][]) => {
    let placed = 0;
    while (placed < totalMines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      // Skip cells in 3x3 surrounding first tap
      if (Math.abs(r - firstR) <= 1 && Math.abs(c - firstC) <= 1) continue;
      if (!g[r][c].isMine) {
        g[r][c].isMine = true;
        placed++;
      }
    }

    // Compute neighbor mine counts
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (g[r][c].isMine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && g[nr][nc].isMine) {
              count++;
            }
          }
        }
        g[r][c].neighborMines = count;
      }
    }
  };

  useEffect(() => {
    return () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); };
  }, []);

  useEffect(() => {
    if (isPaused && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      pointerStartRef.current = null;
    }
  }, [isPaused]);

  // Timer
  useEffect(() => {
    if (isFirstTap || isPaused || isGameOverRef.current) return;
    const interval = setInterval(() => {
      if (!isGameOverRef.current) setTimer((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isFirstTap, isPaused]);

  // Reveal cell with flood fill
  const revealCell = useCallback(
    (startR: number, startC: number) => {
      if (isPaused || isGameOverRef.current) return;

      const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

      if (newGrid[startR][startC].isFlagged || newGrid[startR][startC].isRevealed) return;

      // If first tap, generate safe board
      if (isFirstTap) {
        populateMines(startR, startC, newGrid);
        setIsFirstTap(false);
      }

      const target = newGrid[startR][startC];
      if (target.isFlagged || target.isRevealed) return;

      if (target.isMine) {
        // Mine hit!
        isGameOverRef.current = true;
        target.isRevealed = true;
        // Reveal all mines
        for (const row of newGrid) {
          for (const cell of row) {
            if (cell.isMine) cell.isRevealed = true;
          }
        }
        setGrid(newGrid);
        sounds.playHit();
        sounds.playGameOver();
        haptics.gameOver();
        onGameOver(score, false, 0);
        return;
      }

      // Flood fill reveal
      let newlyRevealed = 0;
      const queue: [number, number][] = [[startR, startC]];
      target.isRevealed = true;
      newlyRevealed++;

      while (queue.length > 0) {
        const [cr, cc] = queue.shift()!;
        const curr = newGrid[cr][cc];

        if (curr.neighborMines === 0) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = cr + dr;
              const nc = cc + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                const neighbor = newGrid[nr][nc];
                if (!neighbor.isRevealed && !neighbor.isFlagged && !neighbor.isMine) {
                  neighbor.isRevealed = true;
                  newlyRevealed++;
                  if (neighbor.neighborMines === 0) {
                    queue.push([nr, nc]);
                  }
                }
              }
            }
          }
        }
      }

      sounds.playTap();
      haptics.tap();

      const nextScore = score + newlyRevealed * 10;
      setScore(nextScore);
      onScoreUpdate({ score: nextScore });
      setGrid(newGrid);

      // Check Victory
      let unrevealedSafeCells = 0;
      for (const row of newGrid) {
        for (const cell of row) {
          if (!cell.isMine && !cell.isRevealed) {
            unrevealedSafeCells++;
          }
        }
      }

      if (unrevealedSafeCells === 0) {
        // Won!
        isGameOverRef.current = true;
        const victoryScore = nextScore + Math.max(0, 500 - timer * 5);
        sounds.playVictory();
        haptics.impact();
        onGameOver(victoryScore, true, 3);
      }
    },
    [grid, isFirstTap, isPaused, score, timer, onScoreUpdate, onGameOver]
  );

  // Toggle flag
  const toggleFlag = (r: number, c: number) => {
    if (isPaused || isGameOverRef.current) return;
    const cell = grid[r][c];
    if (cell.isRevealed) return;

    const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
    const target = newGrid[r][c];

    if (!target.isFlagged && remainingFlags <= 0) return;

    target.isFlagged = !target.isFlagged;
    setRemainingFlags((f) => (target.isFlagged ? f - 1 : f + 1));
    setGrid(newGrid);

    sounds.playBounce();
    haptics.bump();
  };

  const didLongPressRef = useRef(false);
  const pointerStartRef = useRef<{ r: number; c: number } | null>(null);

  const handlePointerDownCell = (r: number, c: number, e: React.PointerEvent) => {
    if (isPaused || isGameOverRef.current || e.button !== 0) return;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    try {
      (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    pointerStartRef.current = { r, c };
    didLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      toggleFlag(r, c);
      longPressTimerRef.current = null;
    }, 320);
  };

  const handlePointerUpCell = (r: number, c: number, e?: React.PointerEvent) => {
    if (e) {
      try {
        (e.currentTarget as HTMLElement)?.releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    }
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (didLongPressRef.current) {
      didLongPressRef.current = false;
      return;
    }
    if (pointerStartRef.current && pointerStartRef.current.r === r && pointerStartRef.current.c === c) {
      if (flagMode) {
        toggleFlag(r, c);
      } else {
        revealCell(r, c);
      }
    }
    pointerStartRef.current = null;
  };

  const getNumberColor = (num: number) => {
    switch (num) {
      case 1:
        return 'text-cyan-400 font-black';
      case 2:
        return 'text-emerald-400 font-black';
      case 3:
        return 'text-rose-400 font-black';
      case 4:
        return 'text-purple-400 font-black';
      case 5:
        return 'text-amber-400 font-black';
      default:
        return 'text-orange-400 font-black';
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-4 pt-16">
      {/* Top HUD: Flag counter, mode toggle & Time counter */}
      <div className="w-full max-w-lg px-4 flex items-center justify-between z-20">
        <div className="glass-pill px-3 py-1.5 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm flex items-center space-x-1.5">
          <Flag className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{remainingFlags}</span>
        </div>

        {/* Compact Mode Switcher */}
        <button
          type="button"
          onClick={() => {
            setFlagMode(!flagMode);
            sounds.playTap();
            haptics.tap();
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 active:scale-95 ${
            flagMode
              ? 'bg-rose-500/20 border-rose-500/60 text-rose-400 shadow-sm'
              : 'glass-panel border-slate-700/40 text-slate-300 dark:text-slate-200 hover:text-white'
          }`}
          title="Tap to switch between Reveal and Flag modes"
          aria-label="Toggle flag mode"
        >
          {flagMode ? <Flag className="w-3.5 h-3.5 fill-current" /> : <Shield className="w-3.5 h-3.5" />}
          <span>{flagMode ? 'FLAG' : 'REVEAL'}</span>
        </button>

        <div className="glass-pill px-3 py-1.5 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{timer}s</span>
        </div>
      </div>

      {/* Minesweeper Grid Board - Expanded for full touch canvas */}
      <div className="w-[min(480px,94vw,70vh)] aspect-square p-2 sm:p-3 bg-slate-900/85 dark:bg-slate-950/85 rounded-3xl border border-slate-700/50 dark:border-slate-800 shadow-2xl flex flex-col justify-between my-auto">
        {grid.map((row, r) => (
          <div key={r} className="flex-1 flex space-x-1 sm:space-x-1.5 my-0.5">
            {row.map((cell, c) => (
              <button
                key={c}
                type="button"
                aria-label={`Row ${r + 1}, column ${c + 1}: ${cell.isRevealed ? cell.isMine ? 'mine' : `${cell.neighborMines} nearby mines` : cell.isFlagged ? 'flagged' : 'hidden'}`}
                onClick={(e) => {
                  if (e.detail === 0) {
                    if (flagMode) toggleFlag(r, c);
                    else revealCell(r, c);
                  }
                }}
                onPointerDown={(e) => handlePointerDownCell(r, c, e)}
                onPointerUp={(e) => handlePointerUpCell(r, c, e)}
                onPointerCancel={() => {
                  if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                  }
                  pointerStartRef.current = null;
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  toggleFlag(r, c);
                }}
                className={`flex-1 rounded-xl flex items-center justify-center transition-all duration-100 cursor-pointer ${
                  cell.isRevealed
                    ? cell.isMine
                    ? 'bg-rose-600 text-white shadow-inner animate-pulse'
                    : 'bg-slate-800/40 dark:bg-slate-900/50 border border-slate-700/30'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 border border-slate-700/50 shadow-sm'
                }`}
              >
                {cell.isRevealed ? (
                  cell.isMine ? (
                    <Bomb className="w-5 h-5 text-white fill-current" />
                  ) : cell.neighborMines > 0 ? (
                    <span className={`text-base font-bold ${getNumberColor(cell.neighborMines)}`}>
                      {cell.neighborMines}
                    </span>
                  ) : null
                ) : cell.isFlagged ? (
                  <Flag className="w-5 h-5 text-rose-400 fill-rose-400 drop-shadow-sm" />
                ) : null}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
