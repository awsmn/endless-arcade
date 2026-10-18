import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';
import { Brain, Sparkles, Heart, Zap } from 'lucide-react';

interface MemoryMatrixViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

type Phase = 'preview' | 'recall' | 'success' | 'failure';

export const MemoryMatrixView: React.FC<MemoryMatrixViewProps> = ({
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState<Phase>('preview');
  const [targets, setTargets] = useState<number[]>([]);
  const [selectedCells, setSelectedCells] = useState<number[]>([]);
  const [wrongCells, setWrongCells] = useState<number[]>([]);

  const isGameOverRef = useRef(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute grid dimensions and target count for current level
  const gridSize = currentLevel <= 2 ? 3 : currentLevel <= 5 ? 4 : currentLevel <= 9 ? 5 : 6;
  const totalCells = gridSize * gridSize;
  const targetCount = Math.min(
    Math.floor(totalCells * 0.45),
    Math.max(3, Math.floor(currentLevel * 0.9) + 2)
  );

  // Start new round
  const startRound = useCallback(
    (lvl: number) => {
      if (isGameOverRef.current) return;
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);

      const size = lvl <= 2 ? 3 : lvl <= 5 ? 4 : lvl <= 9 ? 5 : 6;
      const count = Math.min(
        Math.floor(size * size * 0.45),
        Math.max(3, Math.floor(lvl * 0.9) + 2)
      );

      // Pick distinct random target indices
      const pool = Array.from({ length: size * size }, (_, i) => i);
      pool.sort(() => Math.random() - 0.5);
      const chosen = pool.slice(0, count);

      setTargets(chosen);
      setSelectedCells([]);
      setWrongCells([]);
      setPhase('preview');

      // Display preview for 1.4s, then switch to recall
      previewTimerRef.current = setTimeout(() => {
        setPhase('recall');
        sounds.playBounce();
      }, 1400);
    },
    []
  );

  useEffect(() => {
    startRound(1);
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [startRound]);

  // Handle cell click during recall phase
  const handleCellClick = (idx: number) => {
    if (phase !== 'recall' || isPaused || isGameOverRef.current) return;
    if (selectedCells.includes(idx) || wrongCells.includes(idx)) return;

    if (targets.includes(idx)) {
      // Correct pick!
      const nextSelected = [...selectedCells, idx];
      setSelectedCells(nextSelected);
      sounds.playCollect(1 + nextSelected.length * 0.1);
      haptics.tap();

      const earned = 50 * (streak + 1);
      const nextScore = score + earned;
      setScore(nextScore);
      onScoreUpdate({ score: nextScore });

      // Check if all targets found
      if (nextSelected.length === targets.length) {
        setPhase('success');
        sounds.playVictory();
        haptics.combo();
        const nextStreak = streak + 1;
        setStreak(nextStreak);

        setTimeout(() => {
          const nextLvl = currentLevel + 1;
          setCurrentLevel(nextLvl);
          startRound(nextLvl);
        }, 800);
      }
    } else {
      // Wrong pick!
      const nextWrong = [...wrongCells, idx];
      setWrongCells(nextWrong);
      sounds.playHit();
      haptics.impact();

      const nextLives = lives - 1;
      setLives(nextLives);
      setStreak(0);

      if (nextLives <= 0) {
        isGameOverRef.current = true;
        setPhase('failure');
        sounds.playGameOver();
        haptics.gameOver();
        const stars = currentLevel >= 10 ? 3 : currentLevel >= 5 ? 2 : currentLevel >= 2 ? 1 : 0;
        setTimeout(() => {
          onGameOver(score, false, stars);
        }, 1000);
      }
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-4 pt-14">
      {/* Top HUD */}
      <div className="w-full max-w-md px-3 flex items-center justify-between z-20">
        <div className="glass-pill px-3 py-1.5 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm flex items-center space-x-1.5">
          <Brain className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">LVL {currentLevel}</span>
        </div>

        <div className="glass-pill px-3 py-1.5 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{score}</span>
        </div>

        <div className="glass-pill px-3 py-1.5 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm flex items-center space-x-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart
              key={i}
              className={`w-3.5 h-3.5 transition-all ${
                i < lives ? 'text-rose-500 fill-rose-500' : 'text-slate-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Round Guidance Banner */}
      <div className="w-full max-w-md px-3 flex items-center justify-center space-x-2 z-20">
        <div className="px-4 py-1.5 rounded-full glass-panel border border-slate-700/40 shadow-sm flex items-center space-x-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {phase === 'preview'
              ? 'MEMORIZE TILES'
              : phase === 'recall'
              ? `TAP ${targets.length - selectedCells.length} REMAINING`
              : phase === 'success'
              ? 'PERFECT RECALL!'
              : 'SYSTEM OVERLOAD'}
          </span>
        </div>
      </div>

      {/* NxN Memory Matrix Board - Maximized */}
      <div className="w-[min(480px,94vw,64vh)] aspect-square p-3 sm:p-4 bg-slate-900/85 dark:bg-slate-950/85 rounded-3xl border border-slate-700/50 dark:border-slate-800 shadow-2xl flex flex-col justify-between my-auto z-20">
        <div
          className="w-full h-full grid gap-2 sm:gap-2.5"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`
          }}
        >
          {Array.from({ length: totalCells }).map((_, idx) => {
            const isTarget = targets.includes(idx);
            const isSelected = selectedCells.includes(idx);
            const isWrong = wrongCells.includes(idx);
            const isPreviewActive = phase === 'preview' && isTarget;

            let tileStyle = 'bg-slate-800/80 border border-slate-700/40 hover:bg-slate-700/80';
            if (isPreviewActive) {
              tileStyle = 'bg-sky-400 border border-sky-300 shadow-md shadow-sky-500/30 scale-95';
            } else if (isSelected) {
              tileStyle = 'bg-emerald-500/80 border border-emerald-400 shadow-md shadow-emerald-500/30 scale-95 animate-pulse';
            } else if (isWrong) {
              tileStyle = 'bg-rose-500 border border-rose-400 shadow-md shadow-rose-500/30 animate-bounce';
            }

            return (
              <button
                key={idx}
                type="button"
                aria-label={`Cell ${idx + 1}`}
                onPointerDown={e => {
                  e.preventDefault();
                  handleCellClick(idx);
                }}
                className={`w-full h-full rounded-2xl transition-all duration-150 transform cursor-pointer flex items-center justify-center ${tileStyle}`}
              >
                {isSelected && (
                  <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Streak Bar */}
      <div className="w-full max-w-md px-3 pb-2 z-20 flex justify-center">
        <div className="glass-panel border border-slate-700/40 rounded-2xl px-4 py-1.5 shadow-sm flex items-center space-x-2">
          <span className="text-[11px] font-bold text-slate-400">STREAK MULTIPLIER:</span>
          <span className="text-xs font-bold text-amber-400">{streak + 1}x</span>
        </div>
      </div>
    </div>
  );
};
