import React, { useEffect, useRef } from 'react';
import { HelixDescentEngine } from './HelixDescentEngine';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { RotateCw } from 'lucide-react';

interface HelixDescentViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

export const HelixDescentView: React.FC<HelixDescentViewProps> = ({
  mode,
  level = 1,
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HelixDescentEngine | null>(null);
  const pointerStartRef = useRef<{ x: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new HelixDescentEngine();
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
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        engine.rotateTower(0.15); // Rotate front face towards right
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        engine.rotateTower(-0.15); // Rotate front face towards left
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

  // Pointer drag controls (Smooth 360 tower rotation matching drag direction)
  const handlePointerDown = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    pointerStartRef.current = { x: e.clientX };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current || !engineRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    pointerStartRef.current = { x: e.clientX };
    // Inverted so dragging right turns the front surface to the right
    engineRef.current.rotateTower(-dx * 0.015);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
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
      className="relative w-full h-full overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />

      {/* Floating Control Tip */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-20">
        <div className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-pop font-bold text-white/90 flex items-center space-x-1.5 shadow-pop-xs">
          <RotateCw className="w-3.5 h-3.5 text-pop-yellow animate-spin" style={{ animationDuration: '6s' }} />
          <span>DRAG OR USE A/D TO ROTATE HELIX</span>
        </div>
      </div>
    </div>
  );
};
