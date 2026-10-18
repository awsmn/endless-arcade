import React, { useEffect, useRef } from 'react';
import { FlappyOrbitEngine } from './FlappyOrbitEngine';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { Rocket } from 'lucide-react';

interface FlappyOrbitViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

export const FlappyOrbitView: React.FC<FlappyOrbitViewProps> = ({
  mode,
  level = 1,
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FlappyOrbitEngine | null>(null);

  const callbacksRef = useRef({ onScoreUpdate, onGameOver });
  callbacksRef.current = { onScoreUpdate, onGameOver };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new FlappyOrbitEngine();
    engine.init(canvasRef.current, containerRef.current);
    engine.onScoreUpdate = update => callbacksRef.current.onScoreUpdate(update);
    engine.onGameOver = (score, isNewHighScore, stars) => callbacksRef.current.onGameOver(score, isNewHighScore, stars);

    engine.start(mode, level);
    engineRef.current = engine;

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        engine.flap();
      }
    };
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

  const handleThrust = () => {
    engineRef.current?.flap();
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handleThrust}
      className="relative w-full h-full overflow-hidden select-none touch-none cursor-pointer"
    >
      {/* Game Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />

      {/* Floating Prompt */}
      <div className="absolute top-16 left-4 z-20 glass-pill px-3 py-1 flex items-center space-x-1.5 border border-sky-400/30 pointer-events-none">
        <span className="text-[10px] font-black uppercase text-sky-300">IMPULSE GLIDE</span>
      </div>

      {/* Bottom Action Button for one-handed mobile control */}
      <div className="absolute bottom-3 left-0 right-0 px-4 z-20 flex justify-center pointer-events-auto">
        <div className="w-full max-w-xs">
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              handleThrust();
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-sky-500/25 active:scale-95 transition-transform"
          >
            <Rocket className="w-5 h-5 text-sky-200" />
            <span>TAP ANYWHERE TO THRUST</span>
          </button>
        </div>
      </div>
    </div>
  );
};
