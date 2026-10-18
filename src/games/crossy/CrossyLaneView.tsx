import React, { useEffect, useRef } from 'react';
import { CrossyLaneEngine } from './CrossyLaneEngine';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface CrossyLaneViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

export const CrossyLaneView: React.FC<CrossyLaneViewProps> = ({
  mode,
  level = 1,
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CrossyLaneEngine | null>(null);

  const callbacksRef = useRef({ onScoreUpdate, onGameOver });
  callbacksRef.current = { onScoreUpdate, onGameOver };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new CrossyLaneEngine();
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
      const key = e.key;
      if (key === 'ArrowUp' || key === 'w' || key === 'W' || key === ' ') {
        e.preventDefault();
        engine.hop('up');
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        e.preventDefault();
        engine.hop('down');
      } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        e.preventDefault();
        engine.hop('left');
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        e.preventDefault();
        engine.hop('right');
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

  // Responsive pointer gestures: immediate swipe detection without waiting for finger lift
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY, swiped: false };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current || pointerStartRef.current.swiped || !engineRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const swipeThreshold = 22;

    if (Math.abs(dx) > swipeThreshold || Math.abs(dy) > swipeThreshold) {
      pointerStartRef.current.swiped = true;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) engineRef.current.hop('right');
        else engineRef.current.hop('left');
      } else {
        if (dy > 0) engineRef.current.hop('down');
        else engineRef.current.hop('up');
      }
    }
  };

  const handlePointerUp = () => {
    if (!pointerStartRef.current || !engineRef.current) return;
    if (!pointerStartRef.current.swiped) {
      // Quick tap -> hop forward
      engineRef.current.hop('up');
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
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />

      {/* On-screen Directional Touch Controls for Accessibility */}
      <div 
        className="absolute bottom-4 right-4 z-20 flex flex-col items-center space-y-1 pointer-events-auto"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            engineRef.current?.hop('up');
          }}
          className="w-11 h-11 rounded-xl bg-pop-yellow text-black border-2 border-black shadow-pop-xs flex items-center justify-center active:translate-y-0.5 active:shadow-none"
        >
          <ArrowUp className="w-5 h-5 stroke-[3]" />
        </button>
        <div className="flex space-x-1">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              engineRef.current?.hop('left');
            }}
            className="w-11 h-11 rounded-xl bg-[#14192b] text-white border-2 border-black shadow-pop-xs flex items-center justify-center active:translate-y-0.5 active:shadow-none"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              engineRef.current?.hop('down');
            }}
            className="w-11 h-11 rounded-xl bg-[#14192b] text-white border-2 border-black shadow-pop-xs flex items-center justify-center active:translate-y-0.5 active:shadow-none"
          >
            <ArrowDown className="w-5 h-5 stroke-[2.5]" />
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              engineRef.current?.hop('right');
            }}
            className="w-11 h-11 rounded-xl bg-[#14192b] text-white border-2 border-black shadow-pop-xs flex items-center justify-center active:translate-y-0.5 active:shadow-none"
          >
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
