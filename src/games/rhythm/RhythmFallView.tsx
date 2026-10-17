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

const LANES = [
  { id: 0, label: 'D', subLabel: '1', color: 'bg-pop-cyan text-black', border: 'border-pop-cyan' },
  { id: 1, label: 'F', subLabel: '2', color: 'bg-pop-pink text-white', border: 'border-pop-pink' },
  { id: 2, label: 'J', subLabel: '3', color: 'bg-pop-yellow text-black', border: 'border-pop-yellow' },
  { id: 3, label: 'K', subLabel: '4', color: 'bg-pop-lime text-black', border: 'border-pop-lime' },
];

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

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new RhythmFallEngine();
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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none touch-none"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />

      {/* Bottom 4 Lane Touch Buttons */}
      <div className="absolute bottom-2 left-0 right-0 px-2 flex space-x-2 z-20">
        {LANES.map((lane) => (
          <button
            key={lane.id}
            onPointerDown={(e) => {
              e.preventDefault();
              engineRef.current?.hitLane(lane.id);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              engineRef.current?.releaseLane(lane.id);
            }}
            onPointerCancel={() => {
              engineRef.current?.releaseLane(lane.id);
            }}
            className={`flex-1 h-14 rounded-2xl ${lane.color} border-2 border-black shadow-pop font-pop font-black text-sm flex flex-col items-center justify-center active:translate-y-1 active:shadow-none transition-all`}
          >
            <span className="leading-none text-base">{lane.label}</span>
            <span className="text-[9px] opacity-70 leading-none mt-0.5">{lane.subLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
