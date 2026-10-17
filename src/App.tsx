import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { CategoryFilter } from './components/CategoryFilter';
import { GameCard } from './components/GameCard';
import { InGameOverlay } from './components/InGameOverlay';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { InstallBanner } from './components/InstallBanner';
import { StatsView } from './components/StatsView';
import { SettingsView } from './components/SettingsView';
import { SnakeView } from './games/snake/SnakeView';
import { FruitFusionView } from './games/fruit/FruitFusionView';
import { BrickBreakerView } from './games/breaker/BrickBreakerView';
import { Game2048View } from './games/game2048/Game2048View';
import { KnifeStrikeView } from './games/knife/KnifeStrikeView';
import { MinesweeperView } from './games/minesweeper/MinesweeperView';
import { StackSliceView } from './games/stack/StackSliceView';
import { CyberSprintView } from './games/runner/CyberSprintView';
import { FlappyOrbitView } from './games/flappy/FlappyOrbitView';
import { ChromaJumpView } from './games/chroma/ChromaJumpView';
import { GalaxiaVoidView } from './games/space/GalaxiaVoidView';
import { BlockPuzzleView } from './games/blockpuzzle/BlockPuzzleView';

const PLAYABLE_GAMES = [
  'neon-snake',
  'fruit-fusion',
  'brick-breaker',
  '2048-unlimited',
  'knife-strike',
  'stack-slice',
  'minesweeper-pulse',
  'cyber-sprint',
  'flappy-orbit',
  'chroma-jump',
  'galaxia-void',
  'block-puzzle'
];

import { GAME_CATALOG } from './games/registry';
import { GameCategory, GameMetadata, GameScoreUpdate, PlatformSettings } from './types/game';
import { storage } from './engine/storage';
import { sounds } from './engine/audio';
import { haptics } from './engine/haptics';
import { Search, Flame, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation & Filtering
  const [navTab, setNavTab] = useState<NavTab>('arcade');
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  // Platform Preferences & Meta
  const [settings, setSettings] = useState<PlatformSettings>(storage.getSettings());
  const [totalStars, setTotalStars] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Active Game State
  const [activeGame, setActiveGame] = useState<GameMetadata | null>(null);
  const [gameSessionId, setGameSessionId] = useState(0);
  const [gameScore, setGameScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [gameStars, setGameStars] = useState(0);

  // Initialize and Sync Settings & PWA prompt
  useEffect(() => {
    sounds.setEnabled(settings.soundEnabled);
    haptics.setEnabled(settings.hapticsEnabled);
    setFavorites(storage.getFavorites());
    setTotalStars(storage.getTotalStars());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleToggleSound = () => {
    const next = !settings.soundEnabled;
    const updated = storage.saveSettings({ soundEnabled: next });
    setSettings(updated);
    sounds.setEnabled(next);
    if (next) sounds.playTap();
  };

  const handleToggleHaptics = () => {
    const next = !settings.hapticsEnabled;
    const updated = storage.saveSettings({ hapticsEnabled: next });
    setSettings(updated);
    haptics.setEnabled(next);
    if (next) haptics.bump();
  };

  const handleToggleFavorite = (gameId: string) => {
    storage.toggleFavorite(gameId);
    setFavorites(storage.getFavorites());
  };

  const handleStartGame = (game: GameMetadata) => {
    const progress = storage.getProgress(game.id);
    setActiveGame(game);
    setGameScore(0);
    setHighScore(progress.highScore);
    setIsPaused(false);
    setIsGameOver(false);
    setIsNewHighScore(false);
    setGameStars(0);
    setGameSessionId((prev) => prev + 1);
  };

  const handleScoreUpdate = (update: GameScoreUpdate) => {
    setGameScore(update.score);
  };

  const handleGameOver = (finalScore: number) => {
    if (!activeGame) return;
    const result = storage.saveScore(activeGame.id, finalScore, gameStars, 1);
    setHighScore(result.progress.highScore);
    setIsNewHighScore(result.isNewHighScore);
    setIsGameOver(true);
    setTotalStars(storage.getTotalStars());
  };

  const handleRestartGame = () => {
    if (!activeGame) return;
    setGameScore(0);
    setIsPaused(false);
    setIsGameOver(false);
    setIsNewHighScore(false);
    setGameSessionId((prev) => prev + 1);
  };

  const handleExitGame = () => {
    setActiveGame(null);
    setIsPaused(false);
    setIsGameOver(false);
    setTotalStars(storage.getTotalStars());
  };

  const handleResetProgress = () => {
    localStorage.clear();
    setFavorites([]);
    setTotalStars(0);
    setSettings(storage.getSettings());
  };

  // Filter games based on search, category, and tabs
  const filteredGames = GAME_CATALOG.filter((game) => {
    // If in favorites tab
    if (navTab === 'favorites' && !favorites.includes(game.id)) {
      return false;
    }

    // Category filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'endless') {
        if (!game.modes.includes('endless')) return false;
      } else if (selectedCategory === 'levels') {
        if (!game.modes.includes('levels')) return false;
      } else if (game.category !== selectedCategory) {
        return false;
      }
    }

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        game.title.toLowerCase().includes(q) ||
        game.tagline.toLowerCase().includes(q) ||
        game.category.toLowerCase().includes(q)
      );
    }

    return true;
  });

  // Featured Game (Neon Snake)
  const featuredGame = GAME_CATALOG.find((g) => g.id === 'neon-snake')!;

  return (
    <div className="min-h-screen bg-[#0b0e1b] flex flex-col justify-between relative overflow-hidden pop-dots-bg">
      {/* Active Game View (Full Screen on Mobile, Centered Arcade Cabinet on Desktop) */}
      {activeGame ? (
        <div className="fixed inset-0 z-50 bg-[#05070e] flex items-center justify-center">
          <div className="relative w-full max-w-md h-full flex flex-col overflow-hidden bg-[#0c101e] shadow-2xl border-x-2 border-black">
            {/* In-Game HUD Overlay */}
            <InGameOverlay
              game={activeGame}
              score={gameScore}
              highScore={highScore}
              soundEnabled={settings.soundEnabled}
              onToggleSound={handleToggleSound}
              onPause={() => setIsPaused(true)}
              onExit={handleExitGame}
            />

            {/* Active Game View Area */}
            <div key={gameSessionId} className="relative flex-1 w-full h-full overflow-hidden">
              {activeGame.id === 'neon-snake' && (
                <SnakeView
                  mode="endless"
                  isPaused={isPaused}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'fruit-fusion' && (
                <FruitFusionView
                  mode="endless"
                  isPaused={isPaused}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'brick-breaker' && (
                <BrickBreakerView
                  mode="endless"
                  isPaused={isPaused}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === '2048-unlimited' && (
                <Game2048View
                  mode="endless"
                  isPaused={isPaused}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'knife-strike' && (
                <KnifeStrikeView
                  mode="endless"
                  isPaused={isPaused}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'minesweeper-pulse' && (
                <MinesweeperView
                  mode="endless"
                  isPaused={isPaused}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'stack-slice' && (
                <StackSliceView
                  mode="endless"
                  isPaused={isPaused}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'cyber-sprint' && (
                <CyberSprintView
                  mode="endless"
                  isPaused={isPaused}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'flappy-orbit' && (
                <FlappyOrbitView
                  mode="endless"
                  isPaused={isPaused}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'chroma-jump' && (
                <ChromaJumpView
                  mode="endless"
                  isPaused={isPaused}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'galaxia-void' && (
                <GalaxiaVoidView
                  mode="endless"
                  isPaused={isPaused}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'block-puzzle' && (
                <BlockPuzzleView
                  mode="endless"
                  isPaused={isPaused}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
            </div>

            {/* Pause Modal */}
            {isPaused && (
              <PauseModal
                game={activeGame}
                onResume={() => setIsPaused(false)}
                onRestart={handleRestartGame}
                onExit={handleExitGame}
              />
            )}

            {/* Game Over Modal */}
            {isGameOver && (
              <GameOverModal
                game={activeGame}
                finalScore={gameScore}
                highScore={highScore}
                isNewHighScore={isNewHighScore}
                stars={gameStars}
                onRestart={handleRestartGame}
                onExit={handleExitGame}
              />
            )}
          </div>
        </div>
      ) : (
        /* Arcade Launcher Hub */
        <>
          {/* Sticky Header */}
          <Header
            soundEnabled={settings.soundEnabled}
            onToggleSound={handleToggleSound}
            hapticsEnabled={settings.hapticsEnabled}
            onToggleHaptics={handleToggleHaptics}
            totalStars={totalStars}
            installPrompt={installPrompt}
            onInstall={handleInstallApp}
          />

          {/* Main Content Area */}
          <main className="flex-1 w-full max-w-md mx-auto">
            {navTab === 'arcade' && (
              <div className="space-y-4 pb-24">
                {/* Search Bar */}
                <div className="px-4 pt-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pop-yellow stroke-[2.5]" />
                    <input
                      type="text"
                      placeholder="Search games, mechanics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#14192b] border-2 border-black shadow-pop-sm text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pop-yellow focus:shadow-pop transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Hero / Featured Game Banner (Only if no search active) */}
                {searchQuery === '' && selectedCategory === 'all' && (
                  <div className="px-4">
                    <div
                      onClick={() => handleStartGame(featuredGame)}
                      className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 border-2 border-black shadow-pop-lg cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-pop-sm transition-all pop-dots-dense"
                    >
                      <div className="relative z-10 space-y-2.5">
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 rounded bg-pop-pink text-white text-[9px] font-bungee uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] -rotate-3 inline-block">
                            HOT
                          </span>
                        </div>
                        <h2 className="text-2xl font-pop font-black text-white pop-text-shadow leading-tight">
                          {featuredGame.title}
                        </h2>
                        <p className="text-xs text-emerald-100/90 line-clamp-2 max-w-[260px] leading-relaxed">
                          {featuredGame.tagline}
                        </p>
                        <div className="pt-1">
                          <button className="py-2.5 px-4 rounded-xl bg-pop-yellow text-black font-pop font-black text-xs flex items-center space-x-2 border-2 border-black shadow-pop hover:shadow-pop-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all tracking-wider">
                            <span>PLAY NOW</span>
                            <span>▶</span>
                          </button>
                        </div>
                      </div>

                      {/* Ambient background graphics */}
                      <div className="absolute right-2 -bottom-4 text-8xl font-black text-black/20 select-none pointer-events-none drop-shadow">
                        🐍
                      </div>
                    </div>
                  </div>
                )}

                {/* Category Filter Pills */}
                <CategoryFilter
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />

                {/* Games Grid */}
                <div className="px-4">
                  <div className="flex items-center justify-between pb-2">
                    <h3 className="text-xs font-pop font-black uppercase tracking-wider text-white pop-text-shadow">
                      {selectedCategory === 'all'
                        ? '★ ALL ARCADE GAMES ★'
                        : `★ ${selectedCategory.toUpperCase()} GAMES ★`}
                    </h3>
                    <span className="text-[10px] font-bungee text-pop-yellow bg-[#14192b] px-2 py-0.5 rounded border-2 border-black shadow-pop-xs">
                      {filteredGames.length} GAMES
                    </span>
                  </div>

                  {filteredGames.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3.5">
                      {filteredGames.map((game) => (
                        <GameCard
                          key={game.id}
                          game={game}
                          progress={storage.getProgress(game.id)}
                          isFavorite={favorites.includes(game.id)}
                          isPlayable={PLAYABLE_GAMES.includes(game.id)}
                          onToggleFavorite={() => handleToggleFavorite(game.id)}
                          onSelectGame={handleStartGame}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 space-y-2 bg-[#14192b] border-2 border-black rounded-2xl p-6 shadow-pop">
                      <p className="text-slate-300 text-sm font-pop font-bold">NO GAMES FOUND</p>
                      <button
                        onClick={() => {
                          setSelectedCategory('all');
                          setSearchQuery('');
                        }}
                        className="text-xs font-pop font-black text-pop-yellow hover:underline"
                      >
                        RESET FILTERS
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {navTab === 'favorites' && (
              <div className="px-4 py-4 space-y-4 pb-24">
                <div>
                  <h2 className="text-xl font-pop font-black text-white pop-text-shadow">
                    FAVORITE <span className="text-pop-pink">GAMES</span>
                  </h2>
                  <p className="text-xs text-slate-300">Quick access to the games you love</p>
                </div>
                {filteredGames.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3.5">
                    {filteredGames.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        progress={storage.getProgress(game.id)}
                        isFavorite={true}
                        isPlayable={PLAYABLE_GAMES.includes(game.id)}
                        onToggleFavorite={() => handleToggleFavorite(game.id)}
                        onSelectGame={handleStartGame}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 space-y-3 bg-[#14192b] border-2 border-black rounded-2xl p-6 shadow-pop">
                    <span className="text-4xl inline-block animate-bounce">❤️</span>
                    <p className="text-white text-base font-pop font-black">NO FAVORITES YET</p>
                    <p className="text-xs text-slate-300 max-w-[220px] mx-auto">
                      Tap the heart icon on any game card to pin it to your favorites!
                    </p>
                  </div>
                )}
              </div>
            )}

            {navTab === 'stats' && <StatsView />}

            {navTab === 'settings' && (
              <SettingsView
                settings={settings}
                onUpdateSettings={(patch: Partial<PlatformSettings>) => {
                  const updated = storage.saveSettings(patch);
                  setSettings(updated);
                }}
                onResetProgress={handleResetProgress}
              />
            )}
          </main>

          {/* Mobile PWA Install Floating Banner */}
          <InstallBanner
            promptEvent={installPrompt}
            onInstall={handleInstallApp}
          />

          {/* Mobile Bottom Navigation Bar */}
          <BottomNav
            currentTab={navTab}
            onSelectTab={setNavTab}
            favoritesCount={favorites.length}
          />
        </>
      )}
    </div>
  );
};
export default App;
