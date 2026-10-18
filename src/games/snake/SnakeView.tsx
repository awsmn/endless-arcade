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
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
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

  const pointerStartRef = useRef<{ x: number; y: number; swiped: boolean } | null>(null);

  // Responsive pointer swipe: turns immediately mid-swipe without waiting for finger release
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY, swiped: false };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const minSwipeDistance = 18;

    if (Math.abs(dx) > minSwipeDistance || Math.abs(dy) > minSwipeDistance) {
      pointerStartRef.current = { x: e.clientX, y: e.clientY, swiped: true };
      haptics.tap();
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) engineRef.current?.setDirection(1, 0);
        else engineRef.current?.setDirection(-1, 0);
      } else {
        if (dy > 0) engineRef.current?.setDirection(0, 1);
        else engineRef.current?.setDirection(0, -1);
      }
    }
  };

  const handlePointerUp = () => {
    pointerStartRef.current = null;
  };

  const handleDPadPress = (x: number, y: number) => {
    haptics.tap();
    engineRef.current?.setDirection(x, y);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-full h-full overflow-hidden select-none touch-none"
    >
      {/* Game Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />

      {/* Mobile Virtual D-Pad for thumb controls */}
      <div 
        className="absolute bottom-3 left-0 right-0 flex flex-col items-center space-y-1.5 px-4 z-20 pointer-events-auto"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Up Button */}
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDPadPress(0, -1);
          }}
          className="w-12 h-12 rounded-2xl bg-[#14192b] border-2 border-black shadow-pop-xs active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center text-pop-yellow transition-all"
          aria-label="Up"
        >
          <ArrowUp className="w-6 h-6 stroke-[3]" />
        </button>

        {/* Left, Center Indicator, Right */}
        <div className="flex items-center space-x-6">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDPadPress(-1, 0);
            }}
            className="w-12 h-12 rounded-2xl bg-[#14192b] border-2 border-black shadow-pop-xs active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center text-pop-yellow transition-all"
            aria-label="Left"
          >
            <ArrowLeft className="w-6 h-6 stroke-[3]" />
          </button>

          <div className="w-4 h-4 rounded-full bg-pop-pink border-2 border-black shadow-[1px_1px_0px_#000]" />

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDPadPress(1, 0);
            }}
            className="w-12 h-12 rounded-2xl bg-[#14192b] border-2 border-black shadow-pop-xs active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center text-pop-yellow transition-all"
            aria-label="Right"
          >
            <ArrowRight className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Down Button */}
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDPadPress(0, 1);
          }}
          className="w-12 h-12 rounded-2xl bg-[#14192b] border-2 border-black shadow-pop-xs active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center text-pop-yellow transition-all"
          aria-label="Down"
        >
          <ArrowDown className="w-6 h-6 stroke-[3]" />
        </button>
      </div>
    </div>
  );
};
