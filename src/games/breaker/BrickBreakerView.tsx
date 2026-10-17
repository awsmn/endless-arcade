import React, { useEffect, useRef, useState } from 'react';
import { BrickBreakerEngine } from './BrickBreakerEngine';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { FastForward, Play } from 'lucide-react';

interface BrickBreakerViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean) => void;
}

export const BrickBreakerView: React.FC<BrickBreakerViewProps> = ({
  mode,
  level = 1,
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BrickBreakerEngine | null>(null);

  const [isShooting, setIsShooting] = useState(false);
  const [isFastForward, setIsFastForward] = useState(false);
  const isAimingPointerRef = useRef(false);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new BrickBreakerEngine();
    engine.init(canvasRef.current, containerRef.current);
    engine.onScoreUpdate = onScoreUpdate;
    engine.onGameOver = onGameOver;
    engine.onStateChange = (shooting) => {
      setIsShooting(shooting);
      if (!shooting) setIsFastForward(false);
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

  // Pointer aiming events
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isShooting || !containerRef.current || !engineRef.current) return;
    isAimingPointerRef.current = true;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    engineRef.current.setAim(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isAimingPointerRef.current || !containerRef.current || !engineRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    engineRef.current.setAim(x, y);
  };

  const handlePointerUp = () => {
    if (!isAimingPointerRef.current || !engineRef.current) return;
    isAimingPointerRef.current = false;
    engineRef.current.fire();
  };

  const handleToggleFastForward = () => {
    if (!engineRef.current) return;
    engineRef.current.toggleFastForward();
    setIsFastForward(engineRef.current.speedMultiplier > 1);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-4 pt-16"
    >
      {/* HUD Speed Control Button during volley */}
      <div className="absolute top-16 right-4 z-20 flex items-center space-x-2">
        {isShooting && (
          <button
            onClick={handleToggleFastForward}
            className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center space-x-1 backdrop-blur-md border transition-all ${
              isFastForward
                ? 'bg-amber-500 text-game-dark border-amber-400'
                : 'glass-pill text-slate-300 border-white/20'
            }`}
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>{isFastForward ? '2X SPEED' : 'FAST'}</span>
          </button>
        )}
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 w-full flex items-center justify-center max-w-md">
        <canvas ref={canvasRef} className="rounded-2xl" />
      </div>

      {/* Guide prompt at bottom */}
      <div className="w-full max-w-xs px-4 pb-2 z-20 text-center">
        {!isShooting ? (
          <div className="glass-panel py-2 px-4 rounded-xl text-xs text-slate-300 font-bold border border-white/10 flex items-center justify-center space-x-1.5">
            <Play className="w-3 h-3 text-indigo-400 fill-current" />
            <span>DRAG & AIM TO FIRE BALLS</span>
          </div>
        ) : (
          <div className="py-2 text-xs text-slate-400 font-semibold">
            Volley in progress...
          </div>
        )}
      </div>
    </div>
  );
};
