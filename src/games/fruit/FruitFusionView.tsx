import { FruitAsset } from '../../components/FruitAsset';
import React, { useEffect, useRef, useState } from 'react';
import { FruitFusionEngine, FRUIT_TIERS } from './FruitFusionEngine';
import { GameMode, GameScoreUpdate } from '../../types/game';

interface FruitFusionViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
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

  const callbacksRef = useRef({ onScoreUpdate, onGameOver });
  callbacksRef.current = { onScoreUpdate, onGameOver };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new FruitFusionEngine();
    engine.init(canvasRef.current, containerRef.current);
    engine.onScoreUpdate = update => callbacksRef.current.onScoreUpdate(update);
    engine.onGameOver = (score, isNewHighScore, stars) => callbacksRef.current.onGameOver(score, isNewHighScore, stars);
    engine.onDropperChange = (_cur, next) => {
      setNextTier(next);
    };

    engine.start(mode, level);
    engineRef.current = engine;

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    // Keyboard support (Desktop arrows & space)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        engineRef.current.setDropperX(engineRef.current.dropperX - 25);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        engineRef.current.setDropperX(engineRef.current.dropperX + 25);
      } else if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        engineRef.current.drop();
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
      <div className="absolute top-16 right-4 z-20 glass-pill rounded-2xl px-3 py-1.5 flex items-center space-x-2 border border-pink-500/30 pointer-events-none">
        <span className="text-[10px] uppercase font-black text-slate-400">Next</span>
        <FruitAsset tier={nextTier} name={nextFruitDef.name} />
      </div>
    </div>
  );
};
