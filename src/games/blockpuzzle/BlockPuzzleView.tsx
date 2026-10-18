import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';
import { Sparkles, Trophy } from 'lucide-react';

interface BlockPuzzleViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

// Polyomino block definitions
export interface PolyominoShape {
  id: string;
  color: string;
  matrix: number[][]; // 1 for filled, 0 for empty
  isLarge?: boolean;
}

interface ShapeTemplate {
  color: string;
  matrix: number[][];
  weight: number;
  isLarge?: boolean;
}

const SHAPES: ShapeTemplate[] = [
  // 1x1 Single (very versatile)
  { color: '#f59e0b', matrix: [[1]], weight: 5 },
  // 1x2 and 2x1
  { color: '#38bdf8', matrix: [[1, 1]], weight: 5 },
  { color: '#38bdf8', matrix: [[1], [1]], weight: 5 },
  // 1x3 and 3x1
  { color: '#818cf8', matrix: [[1, 1, 1]], weight: 4 },
  { color: '#818cf8', matrix: [[1], [1], [1]], weight: 4 },
  // 1x4 and 4x1
  { color: '#06b6d4', matrix: [[1, 1, 1, 1]], weight: 2 },
  { color: '#06b6d4', matrix: [[1], [1], [1], [1]], weight: 2 },
  // 2x2 Square
  { color: '#ec4899', matrix: [[1, 1], [1, 1]], weight: 4 },
  // 3x3 Large (Rare, max 1 per tray to prevent unfair blockages)
  { color: '#ef4444', matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], weight: 1, isLarge: true },
  // L Shapes
  { color: '#10b981', matrix: [[1, 0], [1, 1]], weight: 4 },
  { color: '#10b981', matrix: [[0, 1], [1, 1]], weight: 4 },
  { color: '#10b981', matrix: [[1, 1], [1, 0]], weight: 4 },
  { color: '#10b981', matrix: [[1, 1], [0, 1]], weight: 4 },
  // T Shape
  { color: '#a855f7', matrix: [[1, 1, 1], [0, 1, 0]], weight: 3 },
  { color: '#a855f7', matrix: [[0, 1, 0], [1, 1, 1]], weight: 3 },
];

const BOARD_SIZE = 8;

export const BlockPuzzleView: React.FC<BlockPuzzleViewProps> = ({
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const [board, setBoard] = useState<(string | null)[][]>(() =>
    Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null))
  );
  const [tray, setTray] = useState<(PolyominoShape | null)[]>([]);
  const [score, setScore] = useState(0);

  // Interaction modes: Dragging and Tap-to-select
  const [draggingShapeIndex, setDraggingShapeIndex] = useState<number | null>(null);
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ r: number; c: number } | null>(null);

  const pointerStartRef = useRef<{ x: number; y: number; index: number; time: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const isGameOverRef = useRef(false);
  const gameOverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to generate 3 balanced random shapes
  const generateNewTray = useCallback(() => {
    // Build weighted pool
    const pool: ShapeTemplate[] = [];
    for (const shape of SHAPES) {
      for (let w = 0; w < shape.weight; w++) {
        pool.push(shape);
      }
    }

    const newTray: PolyominoShape[] = [];
    let hasLargeInTray = false;

    for (let i = 0; i < 3; i++) {
      let pick: ShapeTemplate;
      let attempts = 0;
      do {
        pick = pool[Math.floor(Math.random() * pool.length)];
        attempts++;
      } while (pick.isLarge && hasLargeInTray && attempts < 10);

      if (pick.isLarge) {
        hasLargeInTray = true;
      }

      newTray.push({
        id: `shape-${Date.now()}-${i}-${Math.random()}`,
        color: pick.color,
        matrix: pick.matrix,
        isLarge: pick.isLarge
      });
    }
    return newTray;
  }, []);

  // Initialize board and tray
  useEffect(() => {
    isGameOverRef.current = false;
    setBoard(Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null)));
    setScore(0);
    setTray(generateNewTray());
    setSelectedShapeIndex(null);

    return () => {
      if (gameOverTimerRef.current) {
        clearTimeout(gameOverTimerRef.current);
      }
    };
  }, [generateNewTray]);

  // Check if a shape can be placed at (startR, startC)
  const canPlaceShape = (shape: PolyominoShape, startR: number, startC: number, currentBoard: (string | null)[][]): boolean => {
    const sRows = shape.matrix.length;
    const sCols = shape.matrix[0].length;

    for (let r = 0; r < sRows; r++) {
      for (let c = 0; c < sCols; c++) {
        if (shape.matrix[r][c] === 1) {
          const br = startR + r;
          const bc = startC + c;
          if (br < 0 || br >= BOARD_SIZE || bc < 0 || bc >= BOARD_SIZE) return false;
          if (currentBoard[br][bc] !== null) return false;
        }
      }
    }
    return true;
  };

  // Check if any shape in tray can fit ANYWHERE on the board
  const checkHasMoves = useCallback((currentTray: (PolyominoShape | null)[], currentBoard: (string | null)[][]): boolean => {
    for (const shape of currentTray) {
      if (!shape) continue;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (canPlaceShape(shape, r, c, currentBoard)) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  // Central placement action shared by drag-drop and tap-to-place
  const placeShapeAt = (shapeIndex: number, targetR: number, targetC: number) => {
    const shape = tray[shapeIndex];
    if (!shape || !canPlaceShape(shape, targetR, targetC, board)) return false;

    // 1. Place shape on board
    const newBoard = board.map(row => [...row]);
    let placedBlockCount = 0;

    for (let r = 0; r < shape.matrix.length; r++) {
      for (let c = 0; c < shape.matrix[0].length; c++) {
        if (shape.matrix[r][c] === 1) {
          newBoard[targetR + r][targetC + c] = shape.color;
          placedBlockCount++;
        }
      }
    }

    sounds.playTap();
    haptics.impact();

    // 2. Check full rows and full columns
    const fullRows: number[] = [];
    const fullCols: number[] = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
      if (newBoard[r].every(cell => cell !== null)) {
        fullRows.push(r);
      }
    }

    for (let c = 0; c < BOARD_SIZE; c++) {
      let isColFull = true;
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (newBoard[r][c] === null) {
          isColFull = false;
          break;
        }
      }
      if (isColFull) {
        fullCols.push(c);
      }
    }

    // Clear full lines
    for (const r of fullRows) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        newBoard[r][c] = null;
      }
    }
    for (const c of fullCols) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        newBoard[r][c] = null;
      }
    }

    const linesCleared = fullRows.length + fullCols.length;
    let earnedPoints = placedBlockCount;

    if (linesCleared > 0) {
      earnedPoints += linesCleared * 10 * linesCleared; // exponential combo
      sounds.playCombo(linesCleared * 2);
      haptics.impact();
    }

    const nextScore = score + earnedPoints;
    setScore(nextScore);
    onScoreUpdate({ score: nextScore });
    setBoard(newBoard);

    // 3. Remove shape from tray
    const nextTray = [...tray];
    nextTray[shapeIndex] = null;

    // If tray is empty, generate new set
    let activeTray = nextTray;
    if (nextTray.every(item => item === null)) {
      activeTray = generateNewTray();
      sounds.playCollect(1.5);
    }
    setTray(activeTray);
    setSelectedShapeIndex(null);

    // 4. Check if any moves remaining
    if (!checkHasMoves(activeTray, newBoard)) {
      isGameOverRef.current = true;
      sounds.playGameOver();
      haptics.gameOver();
      const stars = nextScore >= 350 ? 3 : nextScore >= 180 ? 2 : nextScore >= 80 ? 1 : 0;
      gameOverTimerRef.current = setTimeout(() => {
        onGameOver(nextScore, false, stars);
      }, 600);
    }

    return true;
  };

  // Handle Pointer Down on a tray piece
  const handlePointerDown = (index: number, e: React.PointerEvent) => {
    if (isPaused || isGameOverRef.current || !tray[index]) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {}

    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      index,
      time: Date.now()
    };
    setDraggingShapeIndex(index);
    setDragOffset({ x: e.clientX, y: e.clientY });
    haptics.tap();
  };

  // Global Pointer Move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingShapeIndex === null || !boardRef.current) return;
    setDragOffset({ x: e.clientX, y: e.clientY });

    const shape = tray[draggingShapeIndex];
    if (!shape) {
      setHoverCell(null);
      return;
    }

    // Calculate board cell hover
    const rect = boardRef.current.getBoundingClientRect();
    const cellSize = rect.width / BOARD_SIZE;
    const sCols = shape.matrix[0].length;
    const sRows = shape.matrix.length;

    // Floating preview is centered at (e.clientX, e.clientY - 60)
    const shapeCenterX = e.clientX - rect.left;
    const shapeCenterY = e.clientY - 60 - rect.top;

    const hoverX = shapeCenterX - (sCols / 2) * cellSize;
    const hoverY = shapeCenterY - (sRows / 2) * cellSize;

    const c = Math.round(hoverX / cellSize);
    const r = Math.round(hoverY / cellSize);

    if (canPlaceShape(shape, r, c, board)) {
      setHoverCell({ r, c });
    } else {
      setHoverCell(null);
    }
  };

  // Global Pointer Up (Drop or Tap-select)
  const handlePointerUp = (e?: React.PointerEvent) => {
    if (e) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}
    }

    if (draggingShapeIndex !== null) {
      const start = pointerStartRef.current;
      const endX = e ? e.clientX : dragOffset?.x ?? 0;
      const endY = e ? e.clientY : dragOffset?.y ?? 0;
      const dist = start ? Math.hypot(endX - start.x, endY - start.y) : 100;
      const duration = start ? Date.now() - start.time : 1000;

      // If it was a quick tap without drag (< 10px and < 300ms), toggle selection
      if (dist < 10 && duration < 300) {
        setSelectedShapeIndex(prev => (prev === draggingShapeIndex ? null : draggingShapeIndex));
        sounds.playTap();
      } else if (hoverCell) {
        // Successful drop placement
        placeShapeAt(draggingShapeIndex, hoverCell.r, hoverCell.c);
      }
    }

    setDraggingShapeIndex(null);
    setDragOffset(null);
    setHoverCell(null);
    pointerStartRef.current = null;
  };

  // Direct board cell click (for tap-to-place accessibility)
  const handleBoardCellClick = (r: number, c: number) => {
    if (selectedShapeIndex === null || !tray[selectedShapeIndex]) return;
    const shape = tray[selectedShapeIndex]!;

    // Try placing with top-left at (r, c)
    if (placeShapeAt(selectedShapeIndex, r, c)) {
      return;
    }

    // Also test centering the shape on clicked cell
    const centerR = r - Math.floor(shape.matrix.length / 2);
    const centerC = c - Math.floor(shape.matrix[0].length / 2);
    placeShapeAt(selectedShapeIndex, centerR, centerC);
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-4 pt-16 pop-dots-dense"
    >
      {/* Top Score HUD */}
      <div className="w-full max-w-xs px-4 flex items-center justify-between z-20">
        <div className="bg-[#14192b] border-2 border-black rounded-xl px-3 py-1 shadow-pop-xs flex items-center space-x-1.5">
          <Trophy className="w-3.5 h-3.5 text-pop-yellow fill-pop-yellow" />
          <span className="text-xs font-bungee text-white">{score}</span>
        </div>

        <div className="bg-[#14192b] border-2 border-black rounded-xl px-3 py-1 shadow-pop-xs flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-pop-pink fill-pop-pink" />
          <span className="text-xs font-pop font-black text-pop-pink uppercase">POP 1010</span>
        </div>
      </div>

      {/* 8x8 Board */}
      <div
        ref={boardRef}
        className="w-[min(340px,86vw,44vh)] aspect-square p-2 bg-[#0e1222] rounded-3xl border-2 border-black shadow-pop-lg flex flex-col justify-between my-auto relative"
      >
        {board.map((row, r) => (
          <div key={r} className="flex-1 flex space-x-1 my-0.5">
            {row.map((cellColor, c) => {
              // Check if cell is covered by hover preview
              let isHovered = false;
              let hoverColor = '#ffffff';

              const activeIdx = draggingShapeIndex ?? selectedShapeIndex;
              if (activeIdx !== null && tray[activeIdx]) {
                const shape = tray[activeIdx]!;
                const targetHover = hoverCell;
                if (targetHover) {
                  const shapeR = r - targetHover.r;
                  const shapeC = c - targetHover.c;
                  if (
                    shapeR >= 0 &&
                    shapeR < shape.matrix.length &&
                    shapeC >= 0 &&
                    shapeC < shape.matrix[0].length &&
                    shape.matrix[shapeR][shapeC] === 1
                  ) {
                    isHovered = true;
                    hoverColor = shape.color;
                  }
                }
              }

              return (
                <div
                  key={c}
                  onClick={() => handleBoardCellClick(r, c)}
                  className={`flex-1 rounded-lg transition-all duration-150 flex items-center justify-center border cursor-pointer ${
                    cellColor
                      ? 'border-white/30 shadow-md'
                      : isHovered
                      ? 'border-white/60 shadow-lg scale-95'
                      : 'bg-slate-800/40 border-slate-700/30 hover:border-white/20'
                  }`}
                  style={{
                    backgroundColor: cellColor
                      ? cellColor
                      : isHovered
                      ? `${hoverColor}80`
                      : undefined
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Tray with 3 Pieces */}
      <div className="w-full max-w-xs px-2 py-3 flex items-center justify-around z-20 bg-[#14192b] rounded-2xl border-2 border-black shadow-pop">
        {tray.map((shape, idx) => {
          const isSelected = selectedShapeIndex === idx;
          const isDragging = draggingShapeIndex === idx;

          return (
            <div
              key={idx}
              className={`w-20 h-20 flex items-center justify-center cursor-grab active:cursor-grabbing rounded-xl transition-all ${
                isSelected ? 'ring-2 ring-pop-yellow bg-white/5 scale-105 shadow-md' : ''
              }`}
              onPointerDown={(e) => handlePointerDown(idx, e)}
            >
              {shape && (
                <div
                  className={`grid gap-1 transition-opacity ${
                    isDragging ? 'opacity-30' : 'opacity-100 hover:scale-105'
                  }`}
                  style={{
                    gridTemplateColumns: `repeat(${shape.matrix[0].length}, minmax(0, 1fr))`
                  }}
                >
                  {shape.matrix.map((row, r) =>
                    row.map((val, c) => (
                      <div
                        key={`${r}-${c}`}
                        className={`w-4 h-4 rounded-md shadow-sm ${
                          val === 1 ? 'border border-white/30' : 'opacity-0'
                        }`}
                        style={{
                          backgroundColor: val === 1 ? shape.color : 'transparent'
                        }}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Dragged Shape Representation under pointer */}
      {draggingShapeIndex !== null && dragOffset && tray[draggingShapeIndex] && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: dragOffset.x,
            top: dragOffset.y - 60
          }}
        >
          <div
            className="grid gap-1.5 p-2 rounded-xl bg-black/40 backdrop-blur-sm shadow-2xl scale-125"
            style={{
              gridTemplateColumns: `repeat(${tray[draggingShapeIndex]!.matrix[0].length}, minmax(0, 1fr))`
            }}
          >
            {tray[draggingShapeIndex]!.matrix.map((row, r) =>
              row.map((val, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`w-6 h-6 rounded-md shadow-md ${
                    val === 1 ? 'border border-white/50' : 'opacity-0'
                  }`}
                  style={{
                    backgroundColor: val === 1 ? tray[draggingShapeIndex]!.color : 'transparent'
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
