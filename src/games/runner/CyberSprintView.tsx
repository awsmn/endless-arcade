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

  // Swipe gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !engineRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const minDistance = 25;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > minDistance) {
        if (dx > 0) engineRef.current.shiftLane(1);
        else engineRef.current.shiftLane(-1);
      }
    } else {
      if (Math.abs(dy) > minDistance) {
        if (dy < 0) engineRef.current.jump();
        else engineRef.current.slide();
      }
    }
    touchStartRef.current = null;
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
        <canvas ref={canvasRef} className="rounded-2xl" />
      </div>

      {/* On-Screen Touch Controls */}
      <div className="w-full max-w-xs flex items-center justify-between px-4 pb-2 z-20">
        {/* Left / Right Lane Shifts */}
        <div className="flex space-x-2">
          <button
            onClick={() => {
              haptics.tap();
              engineRef.current?.shiftLane(-1);
            }}
            className="w-13 h-13 rounded-2xl glass-panel border border-cyan-500/30 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
            aria-label="Shift Left"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <button
            onClick={() => {
              haptics.tap();
              engineRef.current?.shiftLane(1);
            }}
            className="w-13 h-13 rounded-2xl glass-panel border border-cyan-500/30 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
            aria-label="Shift Right"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        {/* Jump / Slide Actions */}
        <div className="flex space-x-2">
          <button
            onClick={() => {
              haptics.tap();
              engineRef.current?.slide();
            }}
            className="w-13 h-13 rounded-2xl glass-panel border border-purple-500/30 flex items-center justify-center text-purple-300 active:scale-90 transition-transform shadow-lg"
            aria-label="Slide"
          >
            <ArrowDown className="w-6 h-6" />
          </button>

          <button
            onClick={() => {
              haptics.tap();
              engineRef.current?.jump();
            }}
            className="w-13 h-13 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white active:scale-90 transition-transform shadow-neon-cyan"
            aria-label="Jump"
          >
            <ArrowUp className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
