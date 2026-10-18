import React from 'react';
import { Play, Heart, Trophy, ArrowUpRight } from 'lucide-react';
import { GameMetadata, UserGameProgress } from '../types/game';
import { sounds } from '../engine/audio';
import { haptics } from '../engine/haptics';
import { GameArtwork } from './GameArtwork';

interface GameCardProps {
  game: GameMetadata;
  progress: UserGameProgress;
  isFavorite: boolean;
  isPlayable: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onSelectGame: (game: GameMetadata) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, progress, isFavorite, isPlayable, onToggleFavorite, onSelectGame }) => {
  const play = () => { if (isPlayable) { sounds.playTap(); haptics.bump(); onSelectGame(game); } };
  return <article className="arcade-card group" style={{ '--game-accent': game.accentColor } as React.CSSProperties}>
    <div className={`card-art bg-gradient-to-br ${game.color}`}>
      <button className="art-play" onClick={play} disabled={!isPlayable} aria-label={`Play ${game.title}`}><GameArtwork gameId={game.id} /><span className="art-play-indicator"><Play size={22} fill="currentColor" /></span></button>
      <div className="card-badges"><span>{game.badge === 'HOT' ? 'FAN FAVORITE' : game.badge === 'NEW' ? 'FRESH DROP' : game.category.toUpperCase()}</span><button className="favorite-button" onClick={onToggleFavorite} aria-pressed={isFavorite} aria-label={`${isFavorite ? 'Remove' : 'Add'} ${game.title} ${isFavorite ? 'from' : 'to'} favorites`}><Heart size={17} className={isFavorite ? 'fill-pop-pink text-pop-pink' : ''} /></button></div>
    </div>
    <div className="card-info"><div className="card-title-row"><h3>{game.title}</h3><ArrowUpRight size={17} aria-hidden="true" /></div><p>{game.tagline}</p><div className="card-footer"><span className="card-best"><Trophy size={13} /><span>{progress.highScore > 0 ? progress.highScore.toLocaleString() : 'Set a best'}</span></span><button onClick={play} disabled={!isPlayable} className="card-play"><Play size={12} fill="currentColor" />{isPlayable ? 'PLAY' : 'SOON'}</button></div></div>
  </article>;
};
