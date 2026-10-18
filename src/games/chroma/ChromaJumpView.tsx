import React, { useEffect, useRef, useState } from 'react';
import { ChromaJumpEngine, CHROMA_COLORS } from './ChromaJumpEngine';
import { GameMode, GameScoreUpdate } from '../../types/game';

interface ChromaJumpViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

export const ChromaJumpView: React.FC<ChromaJumpViewProps> = ({
  mode,
  level = 1,
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ChromaJumpEngine | null>(null);

  const [activeColor, setActiveColor] = useState(CHROMA_COLORS[0].hex);

  const callbacksRef = useRef({ onScoreUpdate, onGameOver });
  callbacksRef.current = { onScoreUpdate, onGameOver };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new ChromaJumpEngine();
    engine.init(canvasRef.current, containerRef.current);
    engine.onScoreUpdate = update => callbacksRef.current.onScoreUpdate(update);
    engine.onGameOver = (score, isNewHighScore, stars) => callbacksRef.current.onGameOver(score, isNewHighScore, stars);
    engine.onColorChange = (color) => {
      setActiveColor(color);
    };

    engine.start(mode, level);
    engineRef.current = engine;

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        engine.jump();
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

  const handleJump = () => {
    engineRef.current?.jump();
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handleJump}
      className="relative w-full h-full overflow-hidden select-none touch-none cursor-pointer"
    >
      {/* Game Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />

      {/* Top Active Color Indicator HUD */}
      <div className="absolute top-16 left-4 z-20 glass-pill px-3 py-1 flex items-center space-x-2 border border-slate-700/40 dark:border-slate-800 pointer-events-none">
        <span className="text-[10px] font-bold uppercase text-slate-400">Match</span>
        <div
          className="w-4 h-4 rounded-full shadow-md animate-pulse border border-white/40"
          style={{ backgroundColor: activeColor }}
        />
      </div>
    </div>
  );
};
