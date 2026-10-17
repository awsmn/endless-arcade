import React, { useEffect, useRef, useState } from 'react';
import { KnifeStrikeEngine } from './KnifeStrikeEngine';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { Crosshair } from 'lucide-react';

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

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new KnifeStrikeEngine();
    engine.init(canvasRef.current, containerRef.current);
    engine.onScoreUpdate = onScoreUpdate;
    engine.onGameOver = onGameOver;
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
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
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
      onClick={handleThrow}
      className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-4 pt-16 cursor-pointer"
    >
      {/* Top HUD: Stage Pill */}
      <div className="absolute top-16 left-4 z-20 glass-pill px-3 py-1 flex items-center space-x-1.5 border border-violet-500/30">
        <span className="text-[10px] font-black uppercase text-violet-300">STAGE</span>
        <span className="text-xs font-black text-white">{stage}</span>
      </div>

      {/* Knife Inventory Vertical Indicator on Left */}
      <div className="absolute left-4 top-28 z-20 flex flex-col space-y-1.5">
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

      {/* Main Canvas Area */}
      <div className="relative flex-1 w-full flex items-center justify-center max-w-md">
        <canvas ref={canvasRef} className="rounded-2xl" />
      </div>

      {/* Bottom Action Prompt */}
      <div className="w-full max-w-xs px-4 pb-2 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleThrow();
          }}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 text-white font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-violet-500/20 active:scale-95 transition-transform"
        >
          <Crosshair className="w-5 h-5 text-violet-200" />
          <span>TAP ANYWHERE TO THROW</span>
        </button>
      </div>
    </div>
  );
};
