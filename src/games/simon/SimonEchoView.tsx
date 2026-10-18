import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';
import { Music, Trophy, Heart, Volume2 } from 'lucide-react';

interface SimonEchoViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

interface Pad {
  id: number;
  color: string;
  glow: string;
  freq: number;
  name: string;
}

const PADS: Pad[] = [
  { id: 0, color: '#10b981', glow: '#34d399', freq: 261.63, name: 'Emerald' },
  { id: 1, color: '#06b6d4', glow: '#38bdf8', freq: 329.63, name: 'Cyan' },
  { id: 2, color: '#f59e0b', glow: '#fbbf24', freq: 392.0, name: 'Amber' },
  { id: 3, color: '#f43f5e', glow: '#fb7185', freq: 523.25, name: 'Rose' }
];

export const SimonEchoView: React.FC<SimonEchoViewProps> = ({
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerStep, setPlayerStep] = useState(0);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);

  const isGameOverRef = useRef(false);
  const sequenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Play a pad tone & flash pad visually
  const flashPad = useCallback((padId: number, duration = 300) => {
    setActivePad(padId);
    sounds.playTone(PADS[padId].freq, duration / 1000, 'sine');
    haptics.tap();
    setTimeout(() => {
      setActivePad(null);
    }, duration);
  }, []);

  // Play the full computer sequence
  const playSequence = useCallback((seq: number[]) => {
    setIsPlayingSequence(true);
    let step = 0;

    const interval = Math.max(220, 600 - seq.length * 25);

    const playNext = () => {
      if (step >= seq.length) {
        setIsPlayingSequence(false);
        setPlayerStep(0);
        return;
      }
      flashPad(seq[step], interval * 0.7);
      step++;
      sequenceTimerRef.current = setTimeout(playNext, interval);
    };

    sequenceTimerRef.current = setTimeout(playNext, 500);
  }, [flashPad]);

  // Start initial game
  useEffect(() => {
    const initialSeq = [Math.floor(Math.random() * 4)];
    setSequence(initialSeq);
    playSequence(initialSeq);

    return () => {
      if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
    };
  }, [playSequence]);

  // Handle player pressing a pad
  const handlePadPress = (padId: number) => {
    if (isPlayingSequence || isPaused || isGameOverRef.current) return;
    flashPad(padId, 250);

    const expected = sequence[playerStep];
    if (padId === expected) {
      // Correct!
      const nextStep = playerStep + 1;
      const earned = 50 * sequence.length;
      const nextScore = score + earned;
      setScore(nextScore);
      onScoreUpdate({ score: nextScore });

      if (nextStep >= sequence.length) {
        // Completed current round!
        sounds.playVictory();
        haptics.combo();
        const nextSeq = [...sequence, Math.floor(Math.random() * 4)];
        setSequence(nextSeq);
        setPlayerStep(0);
        setTimeout(() => {
          playSequence(nextSeq);
        }, 800);
      } else {
        setPlayerStep(nextStep);
      }
    } else {
      // Mistake!
      sounds.playHit();
      haptics.failure();
      const nextLives = lives - 1;
      setLives(nextLives);

      if (nextLives <= 0) {
        isGameOverRef.current = true;
        sounds.playGameOver();
        haptics.gameOver();
        const stars = sequence.length >= 12 ? 3 : sequence.length >= 6 ? 2 : sequence.length >= 3 ? 1 : 0;
        setTimeout(() => {
          onGameOver(score, false, stars);
        }, 1000);
      } else {
        // Re-play sequence for second chance
        setTimeout(() => {
          playSequence(sequence);
        }, 1000);
      }
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-4 pt-14 pop-dots-dense">
      {/* Top HUD */}
      <div className="w-full max-w-xs px-3 flex items-center justify-between z-20">
        <div className="bg-[#14192b] border-2 border-black rounded-xl px-2.5 py-1 shadow-pop-xs flex items-center space-x-1.5">
          <Music className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-bungee text-white">ROUND {sequence.length}</span>
        </div>

        <div className="bg-[#14192b] border-2 border-black rounded-xl px-2.5 py-1 shadow-pop-xs flex items-center space-x-1.5">
          <Trophy className="w-3.5 h-3.5 text-pop-yellow fill-pop-yellow" />
          <span className="text-xs font-bungee text-white">{score}</span>
        </div>

        <div className="bg-[#14192b] border-2 border-black rounded-xl px-2.5 py-1 shadow-pop-xs flex items-center space-x-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart
              key={i}
              className={`w-3.5 h-3.5 transition-all ${
                i < lives ? 'text-pop-pink fill-pop-pink' : 'text-slate-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* State Indicator */}
      <div className="w-full max-w-xs px-3 flex items-center justify-center space-x-2 z-20">
        <div className="px-3.5 py-1 rounded-full bg-[#14192b] border-2 border-black shadow-pop-xs flex items-center space-x-2">
          <Volume2 className="w-3.5 h-3.5 text-pop-yellow animate-pulse" />
          <span className="text-[10px] font-pop font-black uppercase tracking-wider text-slate-300">
            {isPlayingSequence ? 'LISTEN TO SEQUENCE' : `YOUR TURN: ${playerStep + 1}/${sequence.length}`}
          </span>
        </div>
      </div>

      {/* Circular 4-Pad Simon Arena */}
      <div className="w-[min(340px,86vw,44vh)] aspect-square p-3 bg-[#0e1222] rounded-full border-2 border-black shadow-pop-lg flex items-center justify-center relative my-auto z-20">
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-3 p-2">
          {PADS.map(pad => {
            const isLit = activePad === pad.id;
            return (
              <button
                key={pad.id}
                type="button"
                disabled={isPlayingSequence}
                aria-label={`Pad ${pad.name}`}
                onPointerDown={e => {
                  e.preventDefault();
                  handlePadPress(pad.id);
                }}
                className={`rounded-3xl border-2 border-black transition-all duration-100 transform active:scale-90 cursor-pointer ${
                  isLit
                    ? 'scale-95 shadow-[0_0_25px_var(--pad-glow)]'
                    : 'opacity-75 hover:opacity-100 shadow-pop-xs'
                }`}
                style={
                  {
                    backgroundColor: isLit ? pad.glow : pad.color,
                    '--pad-glow': pad.glow
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>

        {/* Center Console Dial */}
        <div className="absolute w-20 h-20 rounded-full bg-[#0c1020] border-2 border-black shadow-pop flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[9px] font-bungee text-slate-400">PULSE</span>
          <span className="text-xs font-bungee text-pop-yellow">{sequence.length}</span>
        </div>
      </div>

      {/* Footer Hint */}
      <div className="w-full max-w-xs px-3 pb-2 z-20 flex justify-center">
        <div className="bg-[#14192b] border-2 border-black rounded-2xl px-4 py-2 shadow-pop-xs">
          <span className="text-[10px] font-pop font-black text-slate-300">
            REPEAT THE MELODIC SEQUENCE WITHOUT MISTAKES
          </span>
        </div>
      </div>
    </div>
  );
};
