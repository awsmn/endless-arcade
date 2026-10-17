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
          origin: { y: 0.6 }
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
    const shareText = `I just scored ${finalScore.toLocaleString()} in ${game.title} on Unlimited Arcade! Can you beat my score?`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Unlimited Arcade',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm glass-panel border border-game-border p-6 rounded-3xl shadow-2xl flex flex-col items-center space-y-5">
        {/* Top Header */}
        <div className="text-center space-y-1">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            {game.title}
          </span>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-500">
            GAME OVER
          </h2>
        </div>

        {/* Score Showcase Card */}
        <div className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex flex-col items-center space-y-2 relative overflow-hidden">
          {isNewHighScore && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black tracking-wide animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>NEW HIGH SCORE!</span>
            </div>
          )}

          <div className="text-4xl font-black text-white tracking-tight">
            {finalScore.toLocaleString()}
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Final Score
          </span>

          {/* Star Rating if in level mode */}
          {stars > 0 && (
            <div className="flex items-center space-x-1 pt-1">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-6 h-6 ${
                    s <= stars ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Best Record */}
          <div className="flex items-center space-x-1.5 pt-2 border-t border-white/5 text-xs text-slate-300">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Best: <strong className="text-white">{Math.max(highScore, finalScore).toLocaleString()}</strong></span>
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
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-game-accent to-indigo-600 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-sm flex items-center justify-center space-x-2 shadow-neon-indigo active:scale-95 transition-transform"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN</span>
          </button>

          {/* Share Score */}
          <button
            onClick={handleShare}
            className="w-full py-3 px-4 rounded-2xl glass-pill hover:bg-white/10 text-game-neonCyan font-bold text-xs flex items-center justify-center space-x-2 active:scale-95 transition-transform"
          >
            <Share2 className="w-4 h-4" />
            <span>SHARE SCORE</span>
          </button>

          {/* Return to Lobby */}
          <button
            onClick={() => {
              sounds.playTap();
              haptics.tap();
              onExit();
            }}
            className="w-full py-2.5 px-4 rounded-2xl text-slate-400 hover:text-white font-semibold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-transform"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
