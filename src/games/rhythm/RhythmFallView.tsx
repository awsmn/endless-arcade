import React, { useEffect, useRef } from 'react';
import { RhythmFallEngine } from './RhythmFallEngine';
import { GameMode, GameScoreUpdate } from '../../types/game';

interface RhythmFallViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

export const RhythmFallView: React.FC<RhythmFallViewProps> = ({
  mode,
  level = 1,
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RhythmFallEngine | null>(null);

  const callbacksRef = useRef({ onScoreUpdate, onGameOver });
  callbacksRef.current = { onScoreUpdate, onGameOver };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new RhythmFallEngine();
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
      const key = e.key.toLowerCase();
      if (key === 'd' || key === '1') engine.hitLane(0);
      else if (key === 'f' || key === '2') engine.hitLane(1);
      else if (key === 'j' || key === '3') engine.hitLane(2);
      else if (key === 'k' || key === '4') engine.hitLane(3);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'd' || key === '1') engine.releaseLane(0);
      else if (key === 'f' || key === '2') engine.releaseLane(1);
      else if (key === 'j' || key === '3') engine.releaseLane(2);
      else if (key === 'k' || key === '4') engine.releaseLane(3);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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

  const handleContainerPointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current || !engineRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const lane = Math.floor((x / rect.width) * 4);
    if (lane >= 0 && lane <= 3) {
      engineRef.current.hitLane(lane);
    }
  };

  const handleContainerPointerUp = (e: React.PointerEvent) => {
    if (!containerRef.current || !engineRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const lane = Math.floor((x / rect.width) * 4);
    if (lane >= 0 && lane <= 3) {
      engineRef.current.releaseLane(lane);
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handleContainerPointerDown}
      onPointerUp={handleContainerPointerUp}
      onPointerCancel={handleContainerPointerUp}
      className="relative w-full h-full overflow-hidden select-none touch-none cursor-pointer"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />
    </div>
  );
};
