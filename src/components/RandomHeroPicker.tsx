import React, { useState } from 'react';
import { GameMetadata } from '../types/game';
import { sounds } from '../engine/audio';
import { haptics } from '../engine/haptics';
import { Dices, Play, ArrowUpRight } from 'lucide-react';
import { GameArtwork } from './GameArtwork';

interface RandomHeroPickerProps { catalog: GameMetadata[]; onSelectGame: (game: GameMetadata) => void; isLight?: boolean; }

export const RandomHeroPicker: React.FC<RandomHeroPickerProps> = ({ catalog, onSelectGame }) => {
  const [selectedId, setSelectedId] = useState(() => catalog[Math.floor(Math.random() * catalog.length)]?.id);
  const game = catalog.find(item => item.id === selectedId) ?? catalog[0];
  if (!game) return null;
  const roll = () => {
    const choices = catalog.filter(item => item.id !== game.id);
    if (!choices.length) return;
    setSelectedId(choices[Math.floor(Math.random() * choices.length)].id);
    sounds.playShuffle(); haptics.tap();
  };
  return <div className="px-4"><section className="featured-game" style={{ '--game-accent': game.accentColor } as React.CSSProperties}>
    <div className="featured-copy"><span className="featured-label"><span />THE SPOTLIGHT <ArrowUpRight size={13} /></span><h2>{game.title}</h2><p>{game.description}</p><div className="featured-actions"><button className="featured-play" onClick={() => { sounds.playTap(); haptics.bump(); onSelectGame(game); }}><Play size={16} fill="currentColor" />LET’S PLAY</button><button className="featured-shuffle" onClick={roll} disabled={catalog.length < 2}><Dices size={18} /><span>Surprise me</span></button></div><span className="featured-caption">INSTANT PLAY <span>/</span> NO SIGN-UP NEEDED</span></div>
    <div className={`featured-art bg-gradient-to-br ${game.color}`} key={game.id}><GameArtwork gameId={game.id} /><span className="featured-art-label">ONE MORE GO.</span></div>
  </section></div>;
};
