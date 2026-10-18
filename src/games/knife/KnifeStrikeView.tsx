import React, { useEffect, useRef, useState } from 'react';
import { KnifeStrikeEngine } from './KnifeStrikeEngine';
import { GameMode, GameScoreUpdate } from '../../types/game';

interface KnifeStrikeViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

export const KnifeStrikeView: React.FC<KnifeStrikeViewProps> = ({
  mode,
  level = 1,
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<KnifeStrikeEngine | null>(null);

  const [stage, setStage] = useState(level);
  const [remainingKnives, setRemainingKnives] = useState(7);
  const [totalKnives, setTotalKnives] = useState(7);

  const callbacksRef = useRef({ onScoreUpdate, onGameOver });
  callbacksRef.current = { onScoreUpdate, onGameOver };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new KnifeStrikeEngine();
    engine.init(canvasRef.current, containerRef.current);
    engine.onScoreUpdate = update => callbacksRef.current.onScoreUpdate(update);
    engine.onGameOver = (score, isNewHighScore, stars) => callbacksRef.current.onGameOver(score, isNewHighScore, stars);
    engine.onStageChange = (stg, rem, tot) => {
      setStage(stg);
      setRemainingKnives(rem);
      setTotalKnives(tot);
    };

    engine.start(mode, level);
    engineRef.current = engine;

    const handleResize = () => {
      engine.resize();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        engine.throwKnife();
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      engine.destroy();
      engineRef.current = null;
    };
  }, [mode, level]);

  useEffect(() => {
    if (!engineRef.current) return;
    if (isPaused) {
      engineRef.current.pause();
    } else {
      engineRef.current.resume();
    }
  }, [isPaused]);

  const handleThrow = () => {
    engineRef.current?.throwKnife();
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={(e) => {
        e.preventDefault();
        handleThrow();
      }}
      className="relative w-full h-full overflow-hidden select-none touch-none cursor-pointer"
    >
      {/* Game Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />

      {/* Top HUD: Stage Pill */}
      <div className="absolute top-16 left-4 z-20 glass-pill px-3 py-1 flex items-center space-x-1.5 border border-violet-500/30 pointer-events-none">
        <span className="text-[10px] font-black uppercase text-violet-300">STAGE</span>
        <span className="text-xs font-black text-white">{stage}</span>
      </div>

      {/* Knife Inventory Vertical Indicator on Left */}
      <div className="absolute left-4 top-28 z-20 flex flex-col space-y-1.5 pointer-events-none">
        {Array.from({ length: totalKnives }).map((_, idx) => (
          <div
            key={idx}
            className={`w-2.5 h-6 rounded-full transition-all duration-200 ${
              idx < remainingKnives
                ? 'bg-gradient-to-t from-violet-500 to-indigo-300 shadow-sm shadow-violet-500/50'
                : 'bg-slate-700/40 opacity-30'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
