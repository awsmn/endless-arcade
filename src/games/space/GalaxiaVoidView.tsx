import React, { useEffect, useRef } from 'react';
import { GalaxiaVoidEngine } from './GalaxiaVoidEngine';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { Crosshair } from 'lucide-react';

interface GalaxiaVoidViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

export const GalaxiaVoidView: React.FC<GalaxiaVoidViewProps> = ({
  mode,
  level = 1,
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GalaxiaVoidEngine | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new GalaxiaVoidEngine();
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
      const step = 28;
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          engine.shiftPosition(-step, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          engine.shiftPosition(step, 0);
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          engine.shiftPosition(0, -step);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          engine.shiftPosition(0, step);
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

  // Direct finger / mouse steering
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current || !engineRef.current) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    isDraggingRef.current = true;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    engineRef.current.setTargetPosition(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current || !engineRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    engineRef.current.setTargetPosition(x, y);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-full h-full overflow-hidden select-none touch-none cursor-crosshair"
    >
      {/* Game Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />

      {/* Top HUD Pill */}
      <div className="absolute top-16 left-4 z-20 glass-pill px-3 py-1 flex items-center space-x-1.5 border border-cyan-500/30 pointer-events-none">
        <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-[10px] font-black uppercase text-cyan-300">AUTO-FIRE ACTIVE</span>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 left-0 right-0 px-4 z-20 flex justify-center pointer-events-none">
        <div className="glass-panel py-1.5 px-4 rounded-xl text-[11px] text-slate-400 font-semibold border border-white/5">
          DRAG TO STEER STARSHIP
        </div>
      </div>
    </div>
  );
};
