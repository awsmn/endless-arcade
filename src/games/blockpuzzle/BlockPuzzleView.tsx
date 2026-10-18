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
}

const SHAPES: { color: string; matrix: number[][] }[] = [
  // 1x1 Single
  { color: '#f59e0b', matrix: [[1]] },
  // 1x2 and 2x1
  { color: '#38bdf8', matrix: [[1, 1]] },
  { color: '#38bdf8', matrix: [[1], [1]] },
  // 1x3 and 3x1
  { color: '#818cf8', matrix: [[1, 1, 1]] },
  { color: '#818cf8', matrix: [[1], [1], [1]] },
  // 1x4 and 4x1
  { color: '#06b6d4', matrix: [[1, 1, 1, 1]] },
  { color: '#06b6d4', matrix: [[1], [1], [1], [1]] },
  // 2x2 Square
  { color: '#ec4899', matrix: [[1, 1], [1, 1]] },
  // 3x3 Large
  { color: '#ef4444', matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
  // L Shapes
  { color: '#10b981', matrix: [[1, 0], [1, 1]] },
  { color: '#10b981', matrix: [[0, 1], [1, 1]] },
  { color: '#10b981', matrix: [[1, 1], [1, 0]] },
  { color: '#10b981', matrix: [[1, 1], [0, 1]] },
  // T Shape
  { color: '#a855f7', matrix: [[1, 1, 1], [0, 1, 0]] },
  { color: '#a855f7', matrix: [[0, 1, 0], [1, 1, 1]] },
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

  // Dragging state
  const [draggingShapeIndex, setDraggingShapeIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ r: number; c: number } | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const isGameOverRef = useRef(false);

  // Helper to generate 3 random shapes
  const generateNewTray = useCallback(() => {
    const newTray: PolyominoShape[] = [];
    for (let i = 0; i < 3; i++) {
      const template = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      newTray.push({
        id: `shape-${Date.now()}-${i}-${Math.random()}`,
        color: template.color,
        matrix: template.matrix
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

  // Handle Drag Start
  // Handle Drag Start
  const handlePointerDown = (index: number, e: React.PointerEvent) => {
    if (isPaused || isGameOverRef.current || !tray[index]) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
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

    // Calculate which board cell we are hovering over
    const rect = boardRef.current.getBoundingClientRect();
    const cellSize = rect.width / BOARD_SIZE;
    const sCols = shape.matrix[0].length;
    const sRows = shape.matrix.length;

    // The floating preview is centered at (e.clientX, e.clientY - 60).
    // Calculate the top-left cell position (0, 0) of the shape relative to board grid
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

  // Global Pointer Up (Drop)
  const handlePointerUp = (e?: React.PointerEvent) => {
    if (e) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    }
    if (draggingShapeIndex === null) return;

    const shape = tray[draggingShapeIndex];
    if (shape && hoverCell && canPlaceShape(shape, hoverCell.r, hoverCell.c, board)) {
      // 1. Place shape on board
      const newBoard = board.map(row => [...row]);
      let placedBlockCount = 0;

      for (let r = 0; r < shape.matrix.length; r++) {
        for (let c = 0; c < shape.matrix[0].length; c++) {
          if (shape.matrix[r][c] === 1) {
            newBoard[hoverCell.r + r][hoverCell.c + c] = shape.color;
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
      nextTray[draggingShapeIndex] = null;

      // If tray is empty, generate new set
      let activeTray = nextTray;
      if (nextTray.every(item => item === null)) {
        activeTray = generateNewTray();
        sounds.playCollect(1.5);
      }
      setTray(activeTray);

      // 4. Check if any moves remaining
      if (!checkHasMoves(activeTray, newBoard)) {
        isGameOverRef.current = true;
        sounds.playGameOver();
        haptics.gameOver();
        const stars = nextScore >= 350 ? 3 : nextScore >= 180 ? 2 : nextScore >= 80 ? 1 : 0;
        setTimeout(() => {
          onGameOver(nextScore, false, stars);
        }, 600);
      }
    }

    setDraggingShapeIndex(null);
    setDragOffset(null);
    setHoverCell(null);
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

              if (hoverCell && draggingShapeIndex !== null) {
                const shape = tray[draggingShapeIndex];
                if (shape) {
                  const shapeR = r - hoverCell.r;
                  const shapeC = c - hoverCell.c;
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
                  className={`flex-1 rounded-lg transition-all duration-150 flex items-center justify-center border ${
                    cellColor
                      ? 'border-white/30 shadow-md'
                      : isHovered
                      ? 'border-white/60 shadow-lg scale-95'
                      : 'bg-slate-800/40 border-slate-700/30'
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
        {tray.map((shape, idx) => (
          <div
            key={idx}
            className="w-20 h-20 flex items-center justify-center cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => handlePointerDown(idx, e)}
          >
            {shape && (
              <div
                className={`grid gap-1 transition-opacity ${
                  draggingShapeIndex === idx ? 'opacity-30' : 'opacity-100 hover:scale-105'
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
        ))}
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
