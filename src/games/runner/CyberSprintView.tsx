import React, { useEffect, useRef } from 'react';
import { CyberSprintEngine } from './CyberSprintEngine';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
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

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new CyberSprintEngine();
    engine.init(canvasRef.current, containerRef.current);
    engine.onScoreUpdate = onScoreUpdate;
    engine.onGameOver = onGameOver;

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
    if (!pointerStartRef.current || pointerStartRef.current.swiped || !engineRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const minDistance = 20;

    if (Math.abs(dx) > minDistance || Math.abs(dy) > minDistance) {
      pointerStartRef.current.swiped = true;
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

      {/* On-Screen Touch Controls positioned at bottom */}
      <div 
        className="absolute bottom-3 left-0 right-0 flex justify-center px-4 z-20 pointer-events-auto"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-xs flex items-center justify-between">
          {/* Left / Right Lane Shifts */}
          <div className="flex space-x-2">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                haptics.tap();
                engineRef.current?.shiftLane(-1);
              }}
              className="w-12 h-12 rounded-2xl glass-panel border border-cyan-500/30 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
              aria-label="Shift Left"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                haptics.tap();
                engineRef.current?.shiftLane(1);
              }}
              className="w-12 h-12 rounded-2xl glass-panel border border-cyan-500/30 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
              aria-label="Shift Right"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>

          {/* Jump / Slide Actions */}
          <div className="flex space-x-2">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                haptics.tap();
                engineRef.current?.slide();
              }}
              className="w-12 h-12 rounded-2xl glass-panel border border-purple-500/30 flex items-center justify-center text-purple-300 active:scale-90 transition-transform shadow-lg"
              aria-label="Slide"
            >
              <ArrowDown className="w-6 h-6" />
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                haptics.tap();
                engineRef.current?.jump();
              }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white active:scale-90 transition-transform shadow-neon-cyan"
              aria-label="Jump"
            >
              <ArrowUp className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
