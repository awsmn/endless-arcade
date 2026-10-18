import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';
import { Shield, Sparkles } from 'lucide-react';

interface TetrisViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

const COLS = 10;
const ROWS = 20;

type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

interface Piece {
  type: TetrominoType;
  color: string;
  shape: number[][];
  x: number;
  y: number;
}

const TETROMINOES: Record<TetrominoType, { color: string; shape: number[][] }> = {
  I: {
    color: '#06b6d4',
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]
  },
  O: {
    color: '#f59e0b',
    shape: [
      [1, 1],
      [1, 1]
    ]
  },
  T: {
    color: '#a855f7',
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ]
  },
  S: {
    color: '#10b981',
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ]
  },
  Z: {
    color: '#f43f5e',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ]
  },
  J: {
    color: '#3b82f6',
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ]
  },
  L: {
    color: '#f97316',
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ]
  }
};

const PIECE_TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

function getRandomPiece(): Piece {
  const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  const { color, shape } = TETROMINOES[type];
  const x = Math.floor((COLS - shape[0].length) / 2);
  return { type, color, shape, x, y: 0 };
}

function rotateMatrix(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const rotated: number[][] = [];
  for (let c = 0; c < cols; c++) {
    const newRow: number[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      newRow.push(matrix[r][c]);
    }
    rotated.push(newRow);
  }
  return rotated;
}

export const TetrisView: React.FC<TetrisViewProps> = ({
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const [grid, setGrid] = useState<(string | null)[][]>(() =>
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState<Piece>(() => getRandomPiece());
  const [nextPiece, setNextPiece] = useState<Piece>(() => getRandomPiece());
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);

  const isGameOverRef = useRef(false);
  const dropIntervalRef = useRef<number>(800);
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const pieceRef = useRef(currentPiece);
  pieceRef.current = currentPiece;

  // Collision detection
  const checkCollision = useCallback((p: Piece, g: (string | null)[][]): boolean => {
    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (p.shape[r][c] !== 0) {
          const gx = p.x + c;
          const gy = p.y + r;
          if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
          if (gy >= 0 && g[gy][gx] !== null) return true;
        }
      }
    }
    return false;
  }, []);

  // Compute ghost piece position
  const getGhostPiece = useCallback((p: Piece, g: (string | null)[][]): Piece => {
    let ghost = { ...p };
    while (!checkCollision({ ...ghost, y: ghost.y + 1 }, g)) {
      ghost.y += 1;
    }
    return ghost;
  }, [checkCollision]);

  // Lock piece into grid & clear complete rows
  const lockPiece = useCallback((p: Piece) => {
    if (isGameOverRef.current) return;
    const newGrid = gridRef.current.map(row => [...row]);

    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (p.shape[r][c] !== 0) {
          const gy = p.y + r;
          const gx = p.x + c;
          if (gy < 0) {
            // Block above top edge -> Game Over
            isGameOverRef.current = true;
            sounds.playGameOver();
            haptics.gameOver();
            onGameOver(score, false, lines >= 20 ? 3 : lines >= 10 ? 2 : lines >= 4 ? 1 : 0);
            return;
          }
          newGrid[gy][gx] = p.color;
        }
      }
    }

    // Check full rows
    let cleared = 0;
    const remainingRows = newGrid.filter(row => {
      const isFull = row.every(cell => cell !== null);
      if (isFull) cleared++;
      return !isFull;
    });

    while (remainingRows.length < ROWS) {
      remainingRows.unshift(Array(COLS).fill(null));
    }

    let earned = 10; // placement points
    if (cleared > 0) {
      const linePoints = [0, 100, 300, 500, 800];
      earned += linePoints[cleared] || cleared * 200;
      sounds.playCombo(cleared * 2);
      haptics.impact();
    } else {
      sounds.playBounce();
      haptics.bump();
    }

    const nextScore = score + earned;
    const nextLines = lines + cleared;
    setScore(nextScore);
    setLines(nextLines);
    onScoreUpdate({ score: nextScore });
    setGrid(remainingRows);
    setCanHold(true);

    // Speed scaling
    dropIntervalRef.current = Math.max(120, 800 - Math.floor(nextLines / 5) * 60);

    // Spawn next piece
    const incoming = nextPiece;
    const futurePiece = getRandomPiece();
    setNextPiece(futurePiece);

    if (checkCollision(incoming, remainingRows)) {
      isGameOverRef.current = true;
      sounds.playGameOver();
      haptics.gameOver();
      const stars = nextLines >= 20 ? 3 : nextLines >= 10 ? 2 : nextLines >= 4 ? 1 : 0;
      onGameOver(nextScore, false, stars);
      return;
    }

    setCurrentPiece(incoming);
  }, [checkCollision, lines, nextPiece, onGameOver, onScoreUpdate, score]);

  // Movement actions
  const moveLeft = useCallback(() => {
    if (isPaused || isGameOverRef.current) return;
    const candidate = { ...pieceRef.current, x: pieceRef.current.x - 1 };
    if (!checkCollision(candidate, gridRef.current)) {
      setCurrentPiece(candidate);
      sounds.playTap();
      haptics.tap();
    }
  }, [checkCollision, isPaused]);

  const moveRight = useCallback(() => {
    if (isPaused || isGameOverRef.current) return;
    const candidate = { ...pieceRef.current, x: pieceRef.current.x + 1 };
    if (!checkCollision(candidate, gridRef.current)) {
      setCurrentPiece(candidate);
      sounds.playTap();
      haptics.tap();
    }
  }, [checkCollision, isPaused]);

  const rotatePiece = useCallback(() => {
    if (isPaused || isGameOverRef.current) return;
    const rotatedShape = rotateMatrix(pieceRef.current.shape);
    let candidate = { ...pieceRef.current, shape: rotatedShape };

    // Basic wall-kick: test current x, then left-shifted, then right-shifted
    const kicks = [0, -1, 1, -2, 2];
    let fits = false;
    for (const kick of kicks) {
      const kicked = { ...candidate, x: candidate.x + kick };
      if (!checkCollision(kicked, gridRef.current)) {
        candidate = kicked;
        fits = true;
        break;
      }
    }

    if (fits) {
      setCurrentPiece(candidate);
      sounds.playTap();
      haptics.tap();
    }
  }, [checkCollision, isPaused]);

  const softDrop = useCallback(() => {
    if (isPaused || isGameOverRef.current) return;
    const candidate = { ...pieceRef.current, y: pieceRef.current.y + 1 };
    if (!checkCollision(candidate, gridRef.current)) {
      setCurrentPiece(candidate);
    } else {
      lockPiece(pieceRef.current);
    }
  }, [checkCollision, isPaused, lockPiece]);

  const hardDrop = useCallback(() => {
    if (isPaused || isGameOverRef.current) return;
    const ghost = getGhostPiece(pieceRef.current, gridRef.current);
    lockPiece(ghost);
    haptics.impact();
  }, [getGhostPiece, isPaused, lockPiece]);

  const holdCurrentPiece = useCallback(() => {
    if (isPaused || isGameOverRef.current || !canHold) return;
    const currentType = pieceRef.current.type;

    if (holdPiece === null) {
      setHoldPiece(currentType);
      setCurrentPiece(nextPiece);
      setNextPiece(getRandomPiece());
    } else {
      const { color, shape } = TETROMINOES[holdPiece];
      const newPiece: Piece = {
        type: holdPiece,
        color,
        shape,
        x: Math.floor((COLS - shape[0].length) / 2),
        y: 0
      };
      setHoldPiece(currentType);
      setCurrentPiece(newPiece);
    }

    setCanHold(false);
    sounds.playTap();
    haptics.bump();
  }, [canHold, holdPiece, isPaused, nextPiece]);

  // Game tick interval
  useEffect(() => {
    if (isPaused || isGameOverRef.current) return;
    const interval = setInterval(() => {
      softDrop();
    }, dropIntervalRef.current);
    return () => clearInterval(interval);
  }, [isPaused, softDrop]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || isGameOverRef.current) return;
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          moveLeft();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          moveRight();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          rotatePiece();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          softDrop();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'c':
        case 'C':
        case 'Shift':
          e.preventDefault();
          holdCurrentPiece();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hardDrop, holdCurrentPiece, isPaused, moveLeft, moveRight, rotatePiece, softDrop]);

  // Touch gesture handling for matrix
  const touchStartRef = useRef<{ x: number; y: number; time: number; lastX: number; lastY: number; moved: boolean } | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  const handleMatrixPointerDown = (e: React.PointerEvent) => {
    if (isPaused || isGameOverRef.current) return;
    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      time: performance.now(),
      moved: false,
    };
  };

  const handleMatrixPointerMove = (e: React.PointerEvent) => {
    if (!touchStartRef.current || isPaused || isGameOverRef.current) return;
    const current = touchStartRef.current;
    const dx = e.clientX - current.lastX;
    const dy = e.clientY - current.lastY;
    const cellThresholdX = 22;
    const cellThresholdY = 28;

    if (Math.abs(e.clientX - current.x) > 8 || Math.abs(e.clientY - current.y) > 8) {
      current.moved = true;
    }

    if (Math.abs(dx) >= cellThresholdX) {
      if (dx > 0) {
        moveRight();
      } else {
        moveLeft();
      }
      current.lastX = e.clientX;
    }

    if (dy >= cellThresholdY) {
      softDrop();
      current.lastY = e.clientY;
    }
  };

  const handleMatrixPointerUp = (e: React.PointerEvent) => {
    if (!touchStartRef.current || isPaused || isGameOverRef.current) return;
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const totalDy = e.clientY - start.y;
    const totalDx = Math.abs(e.clientX - start.x);
    const duration = performance.now() - start.time;

    // Fast downward flick -> hard drop
    if (totalDy > 70 && totalDy > totalDx * 1.4 && duration < 320) {
      hardDrop();
      return;
    }

    // Tap or double tap
    if (!start.moved && duration < 280) {
      const now = performance.now();
      if (now - lastTapTimeRef.current < 260) {
        // Double tap -> hard drop
        hardDrop();
        lastTapTimeRef.current = 0;
      } else {
        lastTapTimeRef.current = now;
        rotatePiece();
      }
    }
  };

  // Render combined grid (landed blocks + active piece + ghost projection)
  const ghost = getGhostPiece(currentPiece, grid);
  const displayGrid = grid.map(row => [...row]);

  // Layer ghost piece (translucent outline marker)
  for (let r = 0; r < ghost.shape.length; r++) {
    for (let c = 0; c < ghost.shape[r].length; c++) {
      if (ghost.shape[r][c] !== 0) {
        const gy = ghost.y + r;
        const gx = ghost.x + c;
        if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS && displayGrid[gy][gx] === null) {
          displayGrid[gy][gx] = 'ghost';
        }
      }
    }
  }

  // Layer active piece
  for (let r = 0; r < currentPiece.shape.length; r++) {
    for (let c = 0; c < currentPiece.shape[r].length; c++) {
      if (currentPiece.shape[r][c] !== 0) {
        const gy = currentPiece.y + r;
        const gx = currentPiece.x + c;
        if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
          displayGrid[gy][gx] = currentPiece.color;
        }
      }
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-4 pt-14">
      {/* Top HUD stats */}
      <div className="w-full max-w-md px-4 flex items-center justify-between z-20">
        <div className="glass-pill px-3 py-1.5 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{score}</span>
        </div>

        <div className="glass-pill px-3 py-1.5 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm flex items-center space-x-1.5">
          <Shield className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">LINES: {lines}</span>
        </div>
      </div>

      {/* Main Play Area with Side Previews */}
      <div className="flex items-center justify-center space-x-2 sm:space-x-4 my-auto z-20 w-full px-2">
        {/* Hold Piece Box (Interactive: Tap to hold) */}
        <button
          type="button"
          onClick={holdCurrentPiece}
          className="w-14 sm:w-16 h-20 sm:h-24 glass-panel border border-slate-700/40 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col items-center justify-between p-2 active:scale-95 transition-transform"
          title="Tap to Hold"
          aria-label="Hold Piece"
        >
          <span className="text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500">HOLD</span>
          <div className="flex-1 flex items-center justify-center">
            {holdPiece && (
              <div
                className="grid gap-0.5"
                style={{
                  gridTemplateColumns: `repeat(${TETROMINOES[holdPiece].shape[0].length}, minmax(0, 1fr))`
                }}
              >
                {TETROMINOES[holdPiece].shape.map((row, r) =>
                  row.map((val, c) => (
                    <div
                      key={`${r}-${c}`}
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{
                        backgroundColor: val ? TETROMINOES[holdPiece].color : 'transparent'
                      }}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </button>

        {/* 10x20 Tetris Matrix with direct Touch Gestures */}
        <div
          onPointerDown={handleMatrixPointerDown}
          onPointerMove={handleMatrixPointerMove}
          onPointerUp={handleMatrixPointerUp}
          onPointerCancel={handleMatrixPointerUp}
          className="w-[min(380px,76vw,70vh)] aspect-[10/20] p-1.5 sm:p-2 bg-slate-900/90 dark:bg-slate-950/90 rounded-2xl border border-slate-700/50 dark:border-slate-800/80 shadow-2xl flex flex-col justify-between cursor-pointer touch-none select-none"
        >
          {displayGrid.map((row, r) => (
            <div key={r} className="flex-1 flex space-x-0.5 my-[1px]">
              {row.map((cell, c) => (
                <div
                  key={c}
                  className={`flex-1 rounded-[3px] border border-black/30 transition-colors ${
                    cell === 'ghost'
                      ? 'border-dashed border-sky-400/50 bg-sky-500/10'
                      : cell
                      ? 'shadow-inner'
                      : 'bg-slate-800/40 dark:bg-slate-900/60'
                  }`}
                  style={{
                    backgroundColor: cell && cell !== 'ghost' ? cell : undefined,
                    boxShadow: cell && cell !== 'ghost' ? `0 0 4px ${cell}60` : undefined
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Next Piece Box */}
        <div className="w-14 sm:w-16 h-20 sm:h-24 glass-panel border border-slate-700/40 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col items-center justify-between p-2">
          <span className="text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500">NEXT</span>
          <div className="flex-1 flex items-center justify-center">
            <div
              className="grid gap-0.5"
              style={{
                gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, minmax(0, 1fr))`
              }}
            >
              {nextPiece.shape.map((row, r) =>
                row.map((val, c) => (
                  <div
                    key={`${r}-${c}`}
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{
                      backgroundColor: val ? nextPiece.color : 'transparent'
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
