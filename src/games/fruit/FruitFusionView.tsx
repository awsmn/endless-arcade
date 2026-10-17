import React, { useEffect, useRef, useState } from 'react';
import { FruitFusionEngine, FRUIT_TIERS } from './FruitFusionEngine';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { ChevronDown } from 'lucide-react';

interface FruitFusionViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean) => void;
}

export const FruitFusionView: React.FC<FruitFusionViewProps> = ({
  mode,
  level = 1,
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FruitFusionEngine | null>(null);

  const [nextTier, setNextTier] = useState<number>(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new FruitFusionEngine();
    engine.init(canvasRef.current, containerRef.current);
    engine.onScoreUpdate = onScoreUpdate;
    engine.onGameOver = onGameOver;
    engine.onDropperChange = (_cur, next) => {
      setNextTier(next);
    };

    engine.start(mode, level);
    engineRef.current = engine;

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
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

  // Touch & Pointer interactions for aiming and dropping
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current || !engineRef.current) return;
    isDraggingRef.current = true;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    engineRef.current.setDropperX(x);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current || !engineRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    engineRef.current.setDropperX(x);
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current || !engineRef.current) return;
    isDraggingRef.current = false;
    engineRef.current.drop();
  };

  const handleManualDrop = () => {
    engineRef.current?.drop();
  };

  const nextFruitDef = FRUIT_TIERS[nextTier];

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

      {/* Next Fruit Indicator HUD */}
      <div className="absolute top-16 right-4 z-20 glass-pill px-3 py-1.5 flex items-center space-x-2 border border-pink-500/30 pointer-events-none">
        <span className="text-[10px] uppercase font-black text-slate-400">Next</span>
        <span className="text-lg">{nextFruitDef?.emoji}</span>
      </div>

      {/* Bottom Drop Control Button */}
      <div className="absolute bottom-3 left-0 right-0 px-4 z-20 flex justify-center pointer-events-auto">
        <div className="w-full max-w-xs">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleManualDrop();
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-600 to-pink-700 text-white font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-pink-500/20 active:scale-95 transition-transform"
          >
            <ChevronDown className="w-5 h-5 animate-bounce" />
            <span>TAP TO DROP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
