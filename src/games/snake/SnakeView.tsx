import React, { useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { NeonSnakeEngine } from './NeonSnake';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { haptics } from '../../engine/haptics';

interface SnakeViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean) => void;
}

export const SnakeView: React.FC<SnakeViewProps> = ({
  mode,
  level = 1,
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<NeonSnakeEngine | null>(null);

  // Touch swipe tracking coordinates
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new NeonSnakeEngine();
    engine.init(canvasRef.current, containerRef.current);
    engine.onScoreUpdate = onScoreUpdate;
    engine.onGameOver = onGameOver;
    engine.start(mode, level);
    engineRef.current = engine;

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    // Keyboard support (Desktop & external controllers)
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          engine.setDirection(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          engine.setDirection(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          engine.setDirection(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          engine.setDirection(1, 0);
          break;
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

  // Handle Pause / Resume transitions
  useEffect(() => {
    if (!engineRef.current) return;
    if (isPaused) {
      engineRef.current.pause();
    } else {
      engineRef.current.resume();
    }
  }, [isPaused]);

  // Touch Swipe Handlers for anywhere on screen
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const minSwipeDistance = 25;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > minSwipeDistance) {
        haptics.tap();
        if (dx > 0) engineRef.current?.setDirection(1, 0);
        else engineRef.current?.setDirection(-1, 0);
      }
    } else {
      if (Math.abs(dy) > minSwipeDistance) {
        haptics.tap();
        if (dy > 0) engineRef.current?.setDirection(0, 1);
        else engineRef.current?.setDirection(0, -1);
      }
    }
    touchStartRef.current = null;
  };

  const handleDPadPress = (x: number, y: number) => {
    haptics.tap();
    engineRef.current?.setDirection(x, y);
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-4 pt-16"
    >
      {/* Canvas Area */}
      <div className="relative flex-1 w-full flex items-center justify-center max-w-md">
        <canvas ref={canvasRef} className="rounded-2xl shadow-2xl" />
      </div>

      {/* Mobile Virtual D-Pad for thumb controls */}
      <div className="w-full max-w-xs flex flex-col items-center space-y-1.5 px-4 pb-2 z-20">
        {/* Up Button */}
        <button
          onClick={() => handleDPadPress(0, -1)}
          className="w-13 h-13 rounded-2xl glass-panel border border-white/10 active:bg-white/20 active:scale-90 flex items-center justify-center text-slate-200 transition-transform shadow-lg"
          aria-label="Up"
        >
          <ArrowUp className="w-6 h-6" />
        </button>

        {/* Left, Center Indicator, Right */}
        <div className="flex items-center space-x-6">
          <button
            onClick={() => handleDPadPress(-1, 0)}
            className="w-13 h-13 rounded-2xl glass-panel border border-white/10 active:bg-white/20 active:scale-90 flex items-center justify-center text-slate-200 transition-transform shadow-lg"
            aria-label="Left"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="w-4 h-4 rounded-full bg-game-neonCyan/30 border border-game-neonCyan/50" />

          <button
            onClick={() => handleDPadPress(1, 0)}
            className="w-13 h-13 rounded-2xl glass-panel border border-white/10 active:bg-white/20 active:scale-90 flex items-center justify-center text-slate-200 transition-transform shadow-lg"
            aria-label="Right"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        {/* Down Button */}
        <button
          onClick={() => handleDPadPress(0, 1)}
          className="w-13 h-13 rounded-2xl glass-panel border border-white/10 active:bg-white/20 active:scale-90 flex items-center justify-center text-slate-200 transition-transform shadow-lg"
          aria-label="Down"
        >
          <ArrowDown className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
