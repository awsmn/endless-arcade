import React, { useEffect, useRef, useState } from 'react';
import { StackSliceEngine } from './StackSliceEngine';
import { GameMode, GameScoreUpdate } from '../../types/game';

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

  const callbacksRef = useRef({ onScoreUpdate, onGameOver });
  callbacksRef.current = { onScoreUpdate, onGameOver };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new StackSliceEngine();
    engine.init(canvasRef.current, containerRef.current);
    engine.onScoreUpdate = update => callbacksRef.current.onScoreUpdate(update);
    engine.onGameOver = (score, isNewHighScore, stars) => callbacksRef.current.onGameOver(score, isNewHighScore, stars);
    engine.onCombo = (c) => {
      setCombo(c);
      setTimeout(() => setCombo(0), 800);
    };

    engine.start(mode, level);
    engineRef.current = engine;

    const handleResize = () => {
      engine.resize();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        engine.drop();
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

  const handleDrop = () => {
    engineRef.current?.drop();
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={(e) => {
        e.preventDefault();
        handleDrop();
      }}
      className="relative w-full h-full overflow-hidden select-none touch-none cursor-pointer"
    >
      {/* Game Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />

      {/* Floating Combo Indicator */}
      {combo > 1 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 animate-bounce glass-pill px-4 py-1.5 border border-rose-400/50 bg-rose-500/20 shadow-sm pointer-events-none">
          <span className="text-xs font-bold text-rose-300">
            PERFECT x{combo}!
          </span>
        </div>
      )}
    </div>
  );
};
