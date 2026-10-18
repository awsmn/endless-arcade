import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Home, Share2, Trophy, Sparkles, Star } from 'lucide-react';
import { sounds } from '../engine/audio';
import { haptics } from '../engine/haptics';
import { GameMetadata } from '../types/game';

interface GameOverModalProps {
  game: GameMetadata;
  finalScore: number;
  highScore: number;
  isNewHighScore: boolean;
  stars?: number;
  onRestart: () => void;
  onExit: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  game,
  finalScore,
  highScore,
  isNewHighScore,
  stars = 0,
  onRestart,
  onExit
}) => {
  useEffect(() => {
    if (isNewHighScore) {
      sounds.playVictory();
      haptics.success();
      // Fire celebratory confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          disableForReducedMotion: true
        });
      } catch {
        // Fallback
      }
    } else {
      sounds.playGameOver();
      haptics.failure();
    }
  }, [isNewHighScore]);

  const handleShare = async () => {
    sounds.playTap();
    haptics.tap();
    const shareText = `I just scored ${finalScore.toLocaleString()} in ${game.title} on Endless Arcade! Can you beat my score?`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Endless Arcade',
          text: shareText,
          url: window.location.href
        });
      } catch {
        // user cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Score copied to clipboard!');
      } catch {
        // fallback
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in pop-dots-dense">
      <div role="dialog" aria-modal="true" aria-label="Game over" className="w-full max-w-sm max-h-[90dvh] overflow-y-auto bg-white dark:bg-[#141b2c] border border-slate-200 dark:border-slate-700/80 p-6 rounded-3xl shadow-2xl flex flex-col items-center space-y-5 transition-colors">
        {/* Top Header */}
        <div className="text-center space-y-1">
          <span className="text-[10px] font-bungee uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 inline-block">
            {game.title}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bungee text-rose-500 dark:text-rose-400 tracking-wider">
            GAME OVER
          </h2>
        </div>

        {/* Score Showcase Card */}
        <div className="w-full bg-slate-50 dark:bg-[#0c101c] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col items-center space-y-2 shadow-sm relative overflow-hidden">
          {isNewHighScore && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-400/40 text-xs font-bungee tracking-wide">
              <Sparkles className="w-3.5 h-3.5 fill-current text-amber-500" />
              <span>NEW HIGH SCORE!</span>
            </div>
          )}

          <div className="text-5xl font-bungee text-slate-900 dark:text-white tracking-wider pt-1">
            {finalScore.toLocaleString()}
          </div>
          <span className="text-[11px] font-pop font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
            FINAL SCORE
          </span>

          {/* Star Rating if in level mode */}
          {stars > 0 && (
            <div className="flex items-center space-x-1.5 pt-1">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-7 h-7 stroke-[1.8] ${
                    s <= stars
                      ? 'fill-amber-400 text-amber-500'
                      : 'text-slate-300 dark:text-slate-700 fill-slate-200 dark:fill-slate-800'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Best Record */}
          <div className="flex items-center space-x-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-pop text-slate-500 dark:text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-amber-500 fill-current" />
            <span>BEST: <strong className="font-bungee text-slate-900 dark:text-white">{Math.max(highScore, finalScore).toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5">
          {/* Play Again */}
          <button
            onClick={() => {
              sounds.playTap();
              haptics.bump();
              onRestart();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-pop font-black text-sm flex items-center justify-center space-x-2 shadow-sm active:scale-95 transition-all tracking-wider"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.2]" />
            <span>PLAY AGAIN</span>
          </button>

          {/* Share Score */}
          <button
            onClick={handleShare}
            className="w-full py-3 px-4 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-400/40 font-pop font-bold text-xs flex items-center justify-center space-x-2 shadow-sm active:scale-95 transition-all tracking-wider"
          >
            <Share2 className="w-4 h-4 stroke-[2.2]" />
            <span>SHARE SCORE</span>
          </button>

          {/* Return to Lobby */}
          <button
            onClick={() => {
              sounds.playTap();
              haptics.tap();
              onExit();
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-pop font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 transition-all tracking-wider uppercase"
          >
            <Home className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
