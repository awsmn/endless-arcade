import React, { useEffect, useRef, useState } from 'react';
import { StackSliceEngine } from './StackSliceEngine';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { Layers } from 'lucide-react';

interface StackSliceViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

export const StackSliceView: React.FC<StackSliceViewProps> = ({
  mode,
  level = 1,
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<StackSliceEngine | null>(null);

  const [combo, setCombo] = useState(0);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new StackSliceEngine();
    engine.init(canvasRef.current, containerRef.current);
    engine.onScoreUpdate = onScoreUpdate;
    engine.onGameOver = onGameOver;
    engine.onCombo = (c) => {
      setCombo(c);
      setTimeout(() => setCombo(0), 800);
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

  const handleDrop = () => {
    engineRef.current?.drop();
  };

  return (
    <div
      ref={containerRef}
      onClick={handleDrop}
      className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-4 pt-16 cursor-pointer"
    >
      {/* Floating Combo Indicator */}
      {combo > 1 && (
        <div className="absolute top-20 z-20 animate-bounce glass-pill px-4 py-1.5 border border-fuchsia-400 bg-fuchsia-500/20 shadow-neon-pink">
          <span className="text-xs font-black text-fuchsia-300">
            PERFECT x{combo}!
          </span>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="relative flex-1 w-full flex items-center justify-center max-w-md">
        <canvas ref={canvasRef} className="rounded-2xl" />
      </div>

      {/* Bottom Drop Control Button */}
      <div className="w-full max-w-xs px-4 pb-2 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDrop();
          }}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-pink-600 to-rose-600 text-white font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-pink-500/20 active:scale-95 transition-transform"
        >
          <Layers className="w-5 h-5 text-fuchsia-200" />
          <span>TAP ANYWHERE TO STACK</span>
        </button>
      </div>
    </div>
  );
};
