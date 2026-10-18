import React, { useEffect, useRef } from 'react';
import { CyberSprintEngine } from './CyberSprintEngine';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { haptics } from '../../engine/haptics';

interface CyberSprintViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

export const CyberSprintView: React.FC<CyberSprintViewProps> = ({
  mode,
  level = 1,
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CyberSprintEngine | null>(null);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const callbacksRef = useRef({ onScoreUpdate, onGameOver });
  callbacksRef.current = { onScoreUpdate, onGameOver };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new CyberSprintEngine();
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
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          engine.shiftLane(-1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          engine.shiftLane(1);
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
          e.preventDefault();
          engine.jump();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          engine.slide();
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

  useEffect(() => {
    if (!engineRef.current) return;
    if (isPaused) {
      engineRef.current.pause();
    } else {
      engineRef.current.resume();
    }
  }, [isPaused]);

  const pointerStartRef = useRef<{ x: number; y: number; swiped: boolean } | null>(null);

  // Responsive pointer gestures: immediate action mid-swipe
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY, swiped: false };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current || !engineRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const minDistance = 20;

    if (Math.abs(dx) > minDistance || Math.abs(dy) > minDistance) {
      pointerStartRef.current = { x: e.clientX, y: e.clientY, swiped: true };
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) engineRef.current.shiftLane(1);
        else engineRef.current.shiftLane(-1);
      } else {
        if (dy < 0) engineRef.current.jump();
        else engineRef.current.slide();
      }
    }
  };

  const handlePointerUp = () => {
    if (pointerStartRef.current && !pointerStartRef.current.swiped && engineRef.current) {
      engineRef.current.jump();
      haptics.tap();
    }
    pointerStartRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-full h-full overflow-hidden select-none touch-none cursor-pointer"
    >
      {/* Game Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />
    </div>
  );
};
