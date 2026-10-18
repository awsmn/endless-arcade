import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';
import { Pencil, Eraser, RotateCcw, AlertCircle, Clock, Trophy } from 'lucide-react';

interface SudokuViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

interface CellData {
  r: number;
  c: number;
  value: number | null;
  solution: number;
  isInitial: boolean;
  notes: number[];
}

type Difficulty = 'easy' | 'medium' | 'hard';

// Sudoku solver & generator utilities
function isValidPlacement(grid: number[][], r: number, c: number, num: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[r][i] === num && i !== c) return false;
    if (grid[i][c] === num && i !== r) return false;
  }
  const boxR = Math.floor(r / 3) * 3;
  const boxC = Math.floor(c / 3) * 3;
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const cr = boxR + br;
      const cc = boxC + bc;
      if (grid[cr][cc] === num && (cr !== r || cc !== c)) return false;
    }
  }
  return true;
}

function solveGrid(grid: number[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (const num of nums) {
          if (isValidPlacement(grid, r, c, num)) {
            grid[r][c] = num;
            if (solveGrid(grid)) return true;
            grid[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generateSudoku(diff: Difficulty): { puzzle: number[][]; solution: number[][] } {
  const solution: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  // Seed diagonal 3x3 boxes first (they are independent)
  for (let box = 0; box < 9; box += 3) {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    let idx = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        solution[box + r][box + c] = nums[idx++];
      }
    }
  }
  solveGrid(solution);

  // Copy solution to puzzle
  const puzzle = solution.map(row => [...row]);
  const clues = diff === 'easy' ? 36 : diff === 'medium' ? 30 : 25;
  const cellsToRemove = 81 - clues;

  let removed = 0;
  const positions: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  positions.sort(() => Math.random() - 0.5);

  for (const [r, c] of positions) {
    if (removed >= cellsToRemove) break;
    puzzle[r][c] = 0;
    removed++;
  }

  return { puzzle, solution };
}

export const SudokuView: React.FC<SudokuViewProps> = ({
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [grid, setGrid] = useState<CellData[][]>(() => createInitialBoard('medium'));
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>({ r: 0, c: 0 });
  const [notesMode, setNotesMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [score, setScore] = useState(1000);
  const [timer, setTimer] = useState(0);
  const [history, setHistory] = useState<CellData[][][]>([]);

  const isGameOverRef = useRef(false);

  function createInitialBoard(diff: Difficulty): CellData[][] {
    const { puzzle, solution } = generateSudoku(diff);
    return puzzle.map((row, r) =>
      row.map((val, c) => ({
        r,
        c,
        value: val === 0 ? null : val,
        solution: solution[r][c],
        isInitial: val !== 0,
        notes: []
      }))
    );
  }

  const startNewGame = useCallback((diff: Difficulty) => {
    isGameOverRef.current = false;
    setDifficulty(diff);
    setGrid(createInitialBoard(diff));
    setSelectedCell({ r: 4, c: 4 });
    setMistakes(0);
    setScore(1000);
    setTimer(0);
    setHistory([]);
    onScoreUpdate({ score: 1000 });
  }, [onScoreUpdate]);

  // Timer interval
  useEffect(() => {
    if (isPaused || isGameOverRef.current) return;
    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Handle number input
  const enterNumber = useCallback(
    (num: number) => {
      if (isPaused || isGameOverRef.current || !selectedCell) return;
      const { r, c } = selectedCell;
      const current = grid[r][c];
      if (current.isInitial) return;

      const newGrid = grid.map(row => row.map(cell => ({ ...cell, notes: [...cell.notes] })));
      setHistory(h => [...h.slice(-15), grid]);

      if (notesMode) {
        // Toggle note candidate
        const hasNote = current.notes.includes(num);
        newGrid[r][c].notes = hasNote
          ? current.notes.filter(n => n !== num)
          : [...current.notes, num].sort((a, b) => a - b);
        setGrid(newGrid);
        sounds.playTap();
        haptics.tap();
        return;
      }

      // Check if value is already this number (toggle clear)
      if (current.value === num) {
        newGrid[r][c].value = null;
        setGrid(newGrid);
        sounds.playTap();
        return;
      }

      newGrid[r][c].value = num;
      newGrid[r][c].notes = [];

      // Validate correctness against solution
      const isCorrect = num === current.solution;

      if (!isCorrect) {
        const nextMistakes = mistakes + 1;
        setMistakes(nextMistakes);
        const nextScore = Math.max(0, score - 150);
        setScore(nextScore);
        onScoreUpdate({ score: nextScore });
        sounds.playHit();
        haptics.impact();

        if (nextMistakes >= 3) {
          isGameOverRef.current = true;
          sounds.playGameOver();
          haptics.gameOver();
          setGrid(newGrid);
          onGameOver(nextScore, false, 0);
          return;
        }
      } else {
        const nextScore = score + 40;
        setScore(nextScore);
        onScoreUpdate({ score: nextScore });
        sounds.playBounce();
        haptics.bump();

        // Check Victory
        let isSolved = true;
        for (let rowIdx = 0; rowIdx < 9; rowIdx++) {
          for (let colIdx = 0; colIdx < 9; colIdx++) {
            if (newGrid[rowIdx][colIdx].value !== newGrid[rowIdx][colIdx].solution) {
              isSolved = false;
              break;
            }
          }
          if (!isSolved) break;
        }

        if (isSolved) {
          isGameOverRef.current = true;
          const timeBonus = Math.max(0, 1200 - timer * 3);
          const finalScore = nextScore + timeBonus;
          setScore(finalScore);
          sounds.playVictory();
          haptics.success();
          const stars = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
          onGameOver(finalScore, true, stars);
        }
      }

      setGrid(newGrid);
    },
    [grid, isPaused, mistakes, notesMode, onGameOver, onScoreUpdate, score, selectedCell, timer]
  );

  const eraseCell = useCallback(() => {
    if (isPaused || isGameOverRef.current || !selectedCell) return;
    const { r, c } = selectedCell;
    const current = grid[r][c];
    if (current.isInitial || (!current.value && current.notes.length === 0)) return;

    setHistory(h => [...h.slice(-15), grid]);
    const newGrid = grid.map(row => row.map(cell => ({ ...cell, notes: [...cell.notes] })));
    newGrid[r][c].value = null;
    newGrid[r][c].notes = [];
    setGrid(newGrid);
    sounds.playTap();
    haptics.tap();
  }, [grid, isPaused, selectedCell]);

  const undoMove = useCallback(() => {
    if (isPaused || isGameOverRef.current || history.length === 0) return;
    const previous = history[history.length - 1];
    setGrid(previous);
    setHistory(h => h.slice(0, -1));
    sounds.playTap();
    haptics.tap();
  }, [history, isPaused]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || isGameOverRef.current) return;
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        enterNumber(parseInt(e.key, 10));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        eraseCell();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setNotesMode(m => !m);
        sounds.playTap();
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undoMove();
      } else if (e.key === 'ArrowUp' && selectedCell && selectedCell.r > 0) {
        e.preventDefault();
        setSelectedCell(s => s ? { ...s, r: s.r - 1 } : null);
      } else if (e.key === 'ArrowDown' && selectedCell && selectedCell.r < 8) {
        e.preventDefault();
        setSelectedCell(s => s ? { ...s, r: s.r + 1 } : null);
      } else if (e.key === 'ArrowLeft' && selectedCell && selectedCell.c > 0) {
        e.preventDefault();
        setSelectedCell(s => s ? { ...s, c: s.c - 1 } : null);
      } else if (e.key === 'ArrowRight' && selectedCell && selectedCell.c < 8) {
        e.preventDefault();
        setSelectedCell(s => s ? { ...s, c: s.c + 1 } : null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enterNumber, eraseCell, isPaused, selectedCell, undoMove]);

  const selectedValue = selectedCell ? grid[selectedCell.r][selectedCell.c].value : null;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-2 pt-14">
      {/* Top HUD Stats */}
      <div className="w-full max-w-md px-3 flex items-center justify-between z-20">
        <div className="glass-pill px-3 py-1 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm flex items-center space-x-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{score}</span>
        </div>

        <div className="glass-pill px-3 py-1 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm flex items-center space-x-1">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{timer}s</span>
        </div>

        <div className="glass-pill px-3 py-1 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm flex items-center space-x-1">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{mistakes}/3</span>
        </div>
      </div>

      {/* Difficulty Switcher Bar */}
      <div className="w-full max-w-md px-3 flex items-center justify-center space-x-2 z-20">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
          <button
            key={d}
            type="button"
            onClick={() => {
              startNewGame(d);
              sounds.playTap();
            }}
            className={`flex-1 py-1 rounded-xl text-[11px] font-bold uppercase transition-all border ${
              difficulty === d
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-400 shadow-sm'
                : 'glass-panel border-slate-700/40 text-slate-400 dark:text-slate-500'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* 9x9 Sudoku Board - Expanded */}
      <div className="w-[min(460px,94vw,56vh)] aspect-square p-2 bg-slate-900/85 dark:bg-slate-950/85 rounded-2xl border border-slate-700/50 dark:border-slate-800 shadow-2xl flex flex-col justify-between my-auto z-20">
        {grid.map((row, r) => (
          <div key={r} className="flex-1 flex space-x-0.5 my-[1px]">
            {row.map((cell, c) => {
              const isSelected = selectedCell?.r === r && selectedCell?.c === c;
              const isSameRowCol = selectedCell?.r === r || selectedCell?.c === c;
              const isSameBox =
                selectedCell &&
                Math.floor(selectedCell.r / 3) === Math.floor(r / 3) &&
                Math.floor(selectedCell.c / 3) === Math.floor(c / 3);
              const isSameNumber = selectedValue && cell.value === selectedValue;
              const isError = cell.value !== null && cell.value !== cell.solution;

              // Border accents for 3x3 blocks
              const borderRight = (c + 1) % 3 === 0 && c !== 8 ? 'border-r-2 border-r-sky-500/40' : '';
              const borderBottom = (r + 1) % 3 === 0 && r !== 8 ? 'border-b-2 border-b-sky-500/40' : '';

              return (
                <button
                  key={c}
                  type="button"
                  onPointerDown={e => {
                    e.preventDefault();
                    setSelectedCell({ r, c });
                    sounds.playTap();
                    haptics.tap();
                  }}
                  className={`flex-1 rounded-md flex items-center justify-center relative font-bold text-sm sm:text-base transition-all duration-75 ${borderRight} ${borderBottom} ${
                    isSelected
                      ? 'bg-amber-400/30 text-amber-300 border border-amber-400/60 z-10 scale-105'
                      : isError
                      ? 'bg-rose-500/30 text-rose-400 border border-rose-500 animate-pulse'
                      : isSameNumber
                      ? 'bg-amber-500/15 text-amber-300'
                      : isSameRowCol || isSameBox
                      ? 'bg-slate-800/60 dark:bg-slate-800/40'
                      : 'bg-slate-800/30 dark:bg-slate-900/40'
                  }`}
                >
                  {cell.value ? (
                    <span className={cell.isInitial ? 'text-slate-100 font-black' : 'text-sky-400 font-bold'}>
                      {cell.value}
                    </span>
                  ) : cell.notes.length > 0 ? (
                    <div className="grid grid-cols-3 gap-0 text-[7px] font-mono leading-none text-slate-400 pointer-events-none p-0.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <span key={n} className="w-2 h-2 flex items-center justify-center">
                          {cell.notes.includes(n) ? n : ''}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Control Actions (Notes, Erase, Undo) */}
      <div className="w-full max-w-md px-3 flex items-center justify-around space-x-2 z-20">
        <button
          type="button"
          onClick={undoMove}
          disabled={history.length === 0}
          className={`flex-1 py-1.5 rounded-xl border flex items-center justify-center space-x-1 text-xs font-bold transition-all active:scale-95 ${
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
          onClick={eraseCell}
          className="flex-1 py-1.5 rounded-xl glass-panel border border-slate-700/40 text-rose-400 active:scale-95 flex items-center justify-center space-x-1 text-xs font-bold"
        >
          <Eraser className="w-3.5 h-3.5" />
          <span>ERASE</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setNotesMode(m => !m);
            sounds.playTap();
          }}
          className={`flex-1 py-1.5 rounded-xl border flex items-center justify-center space-x-1 text-xs font-bold active:scale-95 transition-all ${
            notesMode
              ? 'bg-rose-500/20 border-rose-500/60 text-rose-400'
              : 'glass-panel border-slate-700/40 text-slate-300'
          }`}
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>{notesMode ? 'NOTES ON' : 'NOTES'}</span>
        </button>
      </div>

      {/* 1-9 Number Keypad */}
      <div className="w-full max-w-md px-3 pb-2 flex items-center justify-between space-x-1 sm:space-x-1.5 z-20">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            type="button"
            onPointerDown={e => {
              e.preventDefault();
              enterNumber(num);
            }}
            className="flex-1 h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 active:scale-95 font-bold text-base text-amber-400 flex items-center justify-center transition-all shadow-sm"
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
};
