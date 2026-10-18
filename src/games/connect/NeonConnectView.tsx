import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';
import { Zap, RotateCcw, Trophy } from 'lucide-react';

interface NeonConnectViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

interface ColorPair {
  id: number;
  color: string;
  name: string;
  start: { r: number; c: number };
  end: { r: number; c: number };
}

interface LevelDef {
  size: number;
  pairs: ColorPair[];
}

const PRESET_LEVELS: LevelDef[] = [
  {
    size: 5,
    pairs: [
      { id: 1, color: '#f43f5e', name: 'Rose', start: { r: 0, c: 0 }, end: { r: 4, c: 1 } },
      { id: 2, color: '#38bdf8', name: 'Cyan', start: { r: 0, c: 1 }, end: { r: 2, c: 3 } },
      { id: 3, color: '#f59e0b', name: 'Amber', start: { r: 1, c: 1 }, end: { r: 4, c: 4 } },
      { id: 4, color: '#10b981', name: 'Emerald', start: { r: 3, c: 0 }, end: { r: 4, c: 3 } }
    ]
  },
  {
    size: 5,
    pairs: [
      { id: 1, color: '#a855f7', name: 'Purple', start: { r: 0, c: 2 }, end: { r: 3, c: 1 } },
      { id: 2, color: '#f59e0b', name: 'Amber', start: { r: 1, c: 0 }, end: { r: 4, c: 2 } },
      { id: 3, color: '#38bdf8', name: 'Cyan', start: { r: 2, c: 3 }, end: { r: 4, c: 0 } },
      { id: 4, color: '#f43f5e', name: 'Rose', start: { r: 0, c: 4 }, end: { r: 3, c: 4 } }
    ]
  },
  {
    size: 6,
    pairs: [
      { id: 1, color: '#f43f5e', name: 'Rose', start: { r: 0, c: 0 }, end: { r: 5, c: 2 } },
      { id: 2, color: '#38bdf8', name: 'Cyan', start: { r: 0, c: 3 }, end: { r: 3, c: 5 } },
      { id: 3, color: '#f59e0b', name: 'Amber', start: { r: 1, c: 2 }, end: { r: 5, c: 5 } },
      { id: 4, color: '#10b981', name: 'Emerald', start: { r: 2, c: 1 }, end: { r: 4, c: 4 } },
      { id: 5, color: '#a855f7', name: 'Purple', start: { r: 4, c: 0 }, end: { r: 1, c: 4 } }
    ]
  }
];

export const NeonConnectView: React.FC<NeonConnectViewProps> = ({
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const [levelIndex, setLevelIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [paths, setPaths] = useState<Record<number, { r: number; c: number }[]>>({});
  const [activePairId, setActivePairId] = useState<number | null>(null);

  const isGameOverRef = useRef(false);
  const currentLevel = PRESET_LEVELS[levelIndex % PRESET_LEVELS.length];
  const size = currentLevel.size;

  // Initialize level
  const resetLevel = useCallback(() => {
    setPaths({});
    setActivePairId(null);
  }, []);

  // Check if cell is an endpoint of a pair
  const getEndpoint = useCallback(
    (r: number, c: number): ColorPair | null => {
      for (const p of currentLevel.pairs) {
        if ((p.start.r === r && p.start.c === c) || (p.end.r === r && p.end.c === c)) {
          return p;
        }
      }
      return null;
    },
    [currentLevel.pairs]
  );

  // Check which pair occupies a cell
  const getCellColor = useCallback(
    (r: number, c: number): string | null => {
      const ep = getEndpoint(r, c);
      if (ep) return ep.color;

      for (const [pairIdStr, path] of Object.entries(paths)) {
        const pairId = parseInt(pairIdStr, 10);
        const pair = currentLevel.pairs.find(p => p.id === pairId);
        if (pair && path.some(pt => pt.r === r && pt.c === c)) {
          return pair.color;
        }
      }
      return null;
    },
    [currentLevel.pairs, getEndpoint, paths]
  );

  // Start path drag from cell
  const handlePointerDownCell = (r: number, c: number) => {
    if (isPaused || isGameOverRef.current) return;
    const ep = getEndpoint(r, c);
    if (ep) {
      setActivePairId(ep.id);
      setPaths(prev => ({
        ...prev,
        [ep.id]: [{ r, c }]
      }));
      sounds.playTap();
      haptics.tap();
      return;
    }

    // If tapping existing path, prune or re-activate
    for (const [pairIdStr, path] of Object.entries(paths)) {
      const pairId = parseInt(pairIdStr, 10);
      const idx = path.findIndex(pt => pt.r === r && pt.c === c);
      if (idx !== -1) {
        setActivePairId(pairId);
        setPaths(prev => ({
          ...prev,
          [pairId]: path.slice(0, idx + 1)
        }));
        sounds.playTap();
        return;
      }
    }
  };

  // Extend path during pointer move
  const handlePointerEnterCell = (r: number, c: number) => {
    if (activePairId === null || isPaused || isGameOverRef.current) return;
    const currentPath = paths[activePairId] || [];
    if (currentPath.length === 0) return;

    const last = currentPath[currentPath.length - 1];
    // Must be orthogonal neighbor
    const isAdjacent = Math.abs(last.r - r) + Math.abs(last.c - c) === 1;
    if (!isAdjacent) return;

    const pair = currentLevel.pairs.find(p => p.id === activePairId)!;

    // Check if cell is an endpoint
    const ep = getEndpoint(r, c);
    if (ep && ep.id !== activePairId) {
      // Cannot enter other pair's endpoint
      return;
    }

    // Check if already in current path -> backtrack
    const existingIdx = currentPath.findIndex(pt => pt.r === r && pt.c === c);
    if (existingIdx !== -1) {
      setPaths(prev => ({
        ...prev,
        [activePairId]: currentPath.slice(0, existingIdx + 1)
      }));
      return;
    }

    // Overwrite any other pair's path if crossing
    const newPaths = { ...paths };
    for (const [pIdStr, p] of Object.entries(newPaths)) {
      const pId = parseInt(pIdStr, 10);
      if (pId !== activePairId) {
        const conflictIdx = p.findIndex(pt => pt.r === r && pt.c === c);
        if (conflictIdx !== -1) {
          newPaths[pId] = p.slice(0, conflictIdx);
        }
      }
    }

    const nextPath = [...currentPath, { r, c }];
    newPaths[activePairId] = nextPath;
    setPaths(newPaths);
    sounds.playTap();

    // Check if path reached opposite endpoint
    const isStart = r === pair.start.r && c === pair.start.c;
    const isEnd = r === pair.end.r && c === pair.end.c;
    const reachedGoal = (isStart || isEnd) && nextPath.length > 1;

    if (reachedGoal) {
      setActivePairId(null);
      sounds.playCollect(1.5);
      haptics.bump();

      // Check if ALL pairs are connected!
      let allConnected = true;
      for (const p of currentLevel.pairs) {
        const path = newPaths[p.id];
        if (!path || path.length < 2) {
          allConnected = false;
          break;
        }
        const hasStart = path.some(pt => pt.r === p.start.r && pt.c === p.start.c);
        const hasEnd = path.some(pt => pt.r === p.end.r && pt.c === p.end.c);
        if (!hasStart || !hasEnd) {
          allConnected = false;
          break;
        }
      }

      if (allConnected) {
        sounds.playVictory();
        haptics.success();
        const earned = 500 * (levelIndex + 1);
        const nextScore = score + earned;
        setScore(nextScore);
        onScoreUpdate({ score: nextScore });

        setTimeout(() => {
          if (levelIndex + 1 >= PRESET_LEVELS.length) {
            isGameOverRef.current = true;
            onGameOver(nextScore, true, 3);
          } else {
            setLevelIndex(idx => idx + 1);
            resetLevel();
          }
        }, 800);
      }
    }
  };

  const handlePointerUp = () => {
    setActivePairId(null);
  };

  return (
    <div
      onPointerUp={handlePointerUp}
      className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-4 pt-14 pop-dots-dense"
    >
      {/* Top HUD */}
      <div className="w-full max-w-xs px-3 flex items-center justify-between z-20">
        <div className="bg-[#14192b] border-2 border-black rounded-xl px-2.5 py-1 shadow-pop-xs flex items-center space-x-1.5">
          <Zap className="w-3.5 h-3.5 text-pop-yellow fill-pop-yellow" />
          <span className="text-xs font-bungee text-white">LEVEL {levelIndex + 1}</span>
        </div>

        <div className="bg-[#14192b] border-2 border-black rounded-xl px-2.5 py-1 shadow-pop-xs flex items-center space-x-1.5">
          <Trophy className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-bungee text-white">{score}</span>
        </div>

        <button
          onPointerDown={e => {
            e.preventDefault();
            resetLevel();
            sounds.playTap();
          }}
          className="bg-[#14192b] border-2 border-black rounded-xl p-1.5 shadow-pop-xs active:translate-x-0.5 active:translate-y-0.5"
          aria-label="Restart Level"
        >
          <RotateCcw className="w-3.5 h-3.5 text-pop-pink" />
        </button>
      </div>

      {/* Grid Connect Board */}
      <div className="w-[min(340px,86vw,44vh)] aspect-square p-3 bg-[#0e1222] rounded-3xl border-2 border-black shadow-pop-lg flex flex-col justify-between my-auto z-20">
        <div
          className="w-full h-full grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`
          }}
        >
          {Array.from({ length: size }).map((_, r) =>
            Array.from({ length: size }).map((_, c) => {
              const ep = getEndpoint(r, c);
              const color = getCellColor(r, c);

              return (
                <div
                  key={`${r}-${c}`}
                  onPointerDown={e => {
                    e.preventDefault();
                    handlePointerDownCell(r, c);
                  }}
                  onPointerEnter={() => handlePointerEnterCell(r, c)}
                  className="w-full h-full rounded-2xl bg-[#14192b] border-2 border-black/80 flex items-center justify-center relative cursor-pointer"
                >
                  {/* Pipe segment trail */}
                  {color && !ep && (
                    <div
                      className="w-5 h-5 rounded-full shadow-inner animate-pulse"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 10px ${color}`
                      }}
                    />
                  )}

                  {/* Terminal Endpoint */}
                  {ep && (
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-pop-xs flex items-center justify-center transform active:scale-95 transition-all"
                      style={{
                        backgroundColor: ep.color,
                        boxShadow: `0 0 14px ${ep.color}`
                      }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Instruction Footer */}
      <div className="w-full max-w-xs px-3 pb-2 z-20 flex justify-center">
        <div className="bg-[#14192b] border-2 border-black rounded-2xl px-4 py-2 shadow-pop-xs">
          <span className="text-[10px] font-pop font-black text-slate-300">
            CONNECT MATCHING TERMINALS WITHOUT CROSSING PIPES
          </span>
        </div>
      </div>
    </div>
  );
};
