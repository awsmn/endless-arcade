import React, { useEffect, useRef } from 'react';
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

  const callbacksRef = useRef({ onScoreUpdate, onGameOver });
  callbacksRef.current = { onScoreUpdate, onGameOver };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new NeonSnakeEngine();
    engine.init(canvasRef.current, containerRef.current);
    engine.onScoreUpdate = update => callbacksRef.current.onScoreUpdate(update);
    engine.onGameOver = (score, isNewHighScore, stars) => callbacksRef.current.onGameOver(score, isNewHighScore, stars);
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
    </div>
  );
};
