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
  const totalMines = 10;

  const [grid, setGrid] = useState<Cell[][]>(() => createInitialGrid());
  const [isFirstTap, setIsFirstTap] = useState(true);
  const [flagMode, setFlagMode] = useState(false);
  const [remainingFlags, setRemainingFlags] = useState(totalMines);
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

  // Timer
  useEffect(() => {
    if (isFirstTap || isPaused || isGameOverRef.current) return;
    const interval = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isFirstTap, isPaused]);

  // Reveal cell with flood fill
  const revealCell = useCallback(
    (startR: number, startC: number) => {
      if (isPaused || isGameOverRef.current) return;

      const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

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

  const handleCellClick = (r: number, c: number) => {
    if (didLongPressRef.current) {
      didLongPressRef.current = false;
      return;
    }
    if (flagMode) {
      toggleFlag(r, c);
    } else {
      revealCell(r, c);
    }
  };

  const handleTouchStart = (r: number, c: number) => {
    didLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      toggleFlag(r, c);
      longPressTimerRef.current = null;
    }, 400);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
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
    <div className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-4 pt-16 pop-dots-dense">
      {/* Top HUD: Flag & Time counter */}
      <div className="w-full max-w-xs px-4 flex items-center justify-between z-20">
        <div className="bg-[#14192b] border-2 border-black rounded-xl px-3 py-1 shadow-pop-xs flex items-center space-x-1.5">
          <Flag className="w-3.5 h-3.5 text-pop-pink fill-pop-pink" />
          <span className="text-xs font-bungee text-white">{remainingFlags}</span>
        </div>

        <div className="bg-[#14192b] border-2 border-black rounded-xl px-3 py-1 shadow-pop-xs flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-pop-yellow fill-pop-yellow" />
          <span className="text-xs font-bungee text-white">{timer}s</span>
        </div>
      </div>

      {/* Minesweeper Grid Board */}
      <div className="w-[min(340px,85vw,44vh)] aspect-square p-2 bg-[#0e1222] rounded-3xl border-2 border-black shadow-pop-lg flex flex-col justify-between my-auto">
        {grid.map((row, r) => (
          <div key={r} className="flex-1 flex space-x-1 my-0.5">
            {row.map((cell, c) => (
              <div
                key={c}
                onClick={() => handleCellClick(r, c)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  toggleFlag(r, c);
                }}
                onTouchStart={() => handleTouchStart(r, c)}
                onTouchEnd={handleTouchEnd}
                className={`flex-1 rounded-xl flex items-center justify-center transition-all duration-100 cursor-pointer ${
                  cell.isRevealed
                    ? cell.isMine
                      ? 'bg-pop-red text-white shadow-inner animate-pulse'
                      : 'bg-[#13182b] border border-black/40'
                    : 'bg-[#1e2744] hover:bg-[#283458] active:scale-95 border-2 border-black/80 shadow-[1px_1px_0px_#000]'
                }`}
              >
                {cell.isRevealed ? (
                  cell.isMine ? (
                    <Bomb className="w-4 h-4 text-white fill-current" />
                  ) : cell.neighborMines > 0 ? (
                    <span className={`text-sm font-bungee ${getNumberColor(cell.neighborMines)}`}>
                      {cell.neighborMines}
                    </span>
                  ) : null
                ) : cell.isFlagged ? (
                  <Flag className="w-4 h-4 text-pop-pink fill-pop-pink drop-shadow" />
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Mode Switcher Buttons */}
      <div className="w-full max-w-xs px-4 pb-2 z-20 flex space-x-3">
        <button
          onClick={() => {
            setFlagMode(false);
            sounds.playTap();
            haptics.tap();
          }}
          className={`flex-1 py-3 rounded-2xl font-pop font-black text-xs flex items-center justify-center space-x-2 transition-all ${
            !flagMode
              ? 'bg-pop-yellow text-black border-2 border-black shadow-pop-xs -translate-y-0.5'
              : 'bg-[#14192b] text-slate-300 border-2 border-black/80'
          }`}
        >
          <Shield className="w-4 h-4 stroke-[2.5]" />
          <span>REVEAL</span>
        </button>

        <button
          onClick={() => {
            setFlagMode(true);
            sounds.playTap();
            haptics.tap();
          }}
          className={`flex-1 py-3 rounded-2xl font-pop font-black text-xs flex items-center justify-center space-x-2 transition-all ${
            flagMode
              ? 'bg-pop-pink text-white border-2 border-black shadow-pop-xs -translate-y-0.5'
              : 'bg-[#14192b] text-slate-300 border-2 border-black/80'
          }`}
        >
          <Flag className="w-4 h-4 stroke-[2.5]" />
          <span>FLAG ({remainingFlags})</span>
        </button>
      </div>
    </div>
  );
};
