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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in pop-dots-dense">
      <div role="dialog" aria-modal="true" aria-label="Game over" className="w-full max-w-sm max-h-[90dvh] overflow-y-auto bg-[#14192b] border-2 border-black p-6 rounded-3xl shadow-pop-lg flex flex-col items-center space-y-5">
        {/* Top Header */}
        <div className="text-center space-y-1">
          <span className="text-[10px] font-bungee uppercase tracking-widest text-pop-yellow bg-black/60 px-2.5 py-0.5 rounded border border-black inline-block">
            {game.title}
          </span>
          <h2 className="text-4xl font-bungee text-pop-pink pop-text-shadow-lg tracking-wider">
            GAME OVER
          </h2>
        </div>

        {/* Score Showcase Card */}
        <div className="w-full bg-[#0d111f] border-2 border-black rounded-2xl p-4 flex flex-col items-center space-y-2 shadow-pop-sm relative overflow-hidden pop-dots-dense">
          {isNewHighScore && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded bg-pop-yellow text-black border-2 border-black shadow-pop-xs text-xs font-bungee tracking-wide animate-pop-wiggle">
              <Sparkles className="w-3.5 h-3.5 fill-black text-black" />
              <span>NEW HIGH SCORE!</span>
            </div>
          )}

          <div className="text-5xl font-bungee text-white tracking-wider pop-text-shadow pt-1">
            {finalScore.toLocaleString()}
          </div>
          <span className="text-[11px] font-pop font-black text-pop-yellow uppercase tracking-widest">
            FINAL SCORE
          </span>

          {/* Star Rating if in level mode */}
          {stars > 0 && (
            <div className="flex items-center space-x-1.5 pt-1">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-7 h-7 stroke-[2] ${
                    s <= stars
                      ? 'fill-pop-yellow text-black drop-shadow-[2px_2px_0px_#000]'
                      : 'text-slate-700 fill-slate-800'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Best Record */}
          <div className="flex items-center space-x-1.5 pt-2 border-t-2 border-black/80 text-xs font-pop text-slate-300">
            <Trophy className="w-3.5 h-3.5 text-pop-yellow fill-pop-yellow" />
            <span>BEST: <strong className="font-bungee text-white">{Math.max(highScore, finalScore).toLocaleString()}</strong></span>
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
            className="w-full py-3.5 px-4 rounded-2xl bg-pop-yellow hover:bg-yellow-300 text-black font-pop font-black text-sm flex items-center justify-center space-x-2 border-2 border-black shadow-pop active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all tracking-wider"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span>PLAY AGAIN</span>
          </button>

          {/* Share Score */}
          <button
            onClick={handleShare}
            className="w-full py-3 px-4 rounded-2xl bg-pop-cyan hover:bg-cyan-300 text-black font-pop font-black text-xs flex items-center justify-center space-x-2 border-2 border-black shadow-pop-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all tracking-wider"
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
            <span>SHARE SCORE</span>
          </button>

          {/* Return to Lobby */}
          <button
            onClick={() => {
              sounds.playTap();
              haptics.tap();
              onExit();
            }}
            className="w-full py-2.5 px-4 rounded-2xl text-slate-300 hover:text-white font-pop font-black text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-transform tracking-wider uppercase"
          >
            <Home className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
