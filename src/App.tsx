import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { CategoryFilter } from './components/CategoryFilter';
import { GameCard } from './components/GameCard';
import { RandomHeroPicker } from './components/RandomHeroPicker';
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
import { HelixDescentView } from './games/helix/HelixDescentView';
import { RhythmFallView } from './games/rhythm/RhythmFallView';
import { CrossyLaneView } from './games/crossy/CrossyLaneView';

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
  'block-puzzle',
  'helix-descent',
  'rhythm-fall',
  'crossy-lane'
];

import { GAME_CATALOG } from './games/registry';
import { GameCategory, GameMetadata, GameScoreUpdate, PlatformSettings } from './types/game';
import { storage } from './engine/storage';
import { sounds } from './engine/audio';
import { haptics } from './engine/haptics';
import { Search } from 'lucide-react';

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

  // Theme Sync effect (Light vs Dark mode)
  useEffect(() => {
    const isLight = settings.theme === 'light';
    document.documentElement.classList.toggle('light', isLight);
    document.documentElement.classList.toggle('dark', !isLight);
  }, [settings.theme]);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = settings.theme === 'light' ? 'dark' : 'light';
    const updated = storage.saveSettings({ theme: nextTheme });
    setSettings(updated);
    sounds.playTap();
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

  const isLight = settings.theme === 'light';

  return (
    <div className={`min-h-screen ${isLight ? 'bg-[#f1f3f9] text-slate-900' : 'bg-[#0b0e1b] text-white'} flex flex-col justify-between relative overflow-hidden pop-dots-bg transition-colors duration-200`}>
      {/* Active Game View (Full Screen on Mobile, Centered Arcade Cabinet on Desktop) */}
      {activeGame ? (
        <div className="fixed inset-0 z-50 bg-[#05070e] flex items-center justify-center">
          <div className="relative w-full max-w-md h-full flex flex-col overflow-hidden bg-[#0c1020] shadow-2xl border-x-2 border-black">
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
              {activeGame.id === 'helix-descent' && (
                <HelixDescentView
                  mode="endless"
                  isPaused={isPaused}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'rhythm-fall' && (
                <RhythmFallView
                  mode="endless"
                  isPaused={isPaused}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'crossy-lane' && (
                <CrossyLaneView
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
            theme={settings.theme}
            onToggleTheme={handleToggleTheme}
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
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pop-pink dark:text-pop-yellow stroke-[2.5]" />
                    <input
                      type="text"
                      placeholder="Search games, mechanics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#14192b] border-2 border-black shadow-pop-sm text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pop-yellow focus:shadow-pop transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Hero / Surprise Pick Card with Interactive Random Roll */}
                {searchQuery === '' && selectedCategory === 'all' && (
                  <RandomHeroPicker
                    catalog={GAME_CATALOG}
                    onSelectGame={handleStartGame}
                    isLight={isLight}
                  />
                )}

                {/* Category Filter Pills */}
                <CategoryFilter
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />

                {/* Games Grid */}
                <div className="px-4">
                  <div className="flex items-center justify-between pb-2">
                    <h3 className="text-xs font-pop font-black uppercase tracking-wider text-slate-900 dark:text-white pop-text-shadow">
                      {selectedCategory === 'all'
                        ? '★ ALL ARCADE GAMES ★'
                        : `★ ${selectedCategory.toUpperCase()} GAMES ★`}
                    </h3>
                    <span className="text-[10px] font-bungee text-pop-pink dark:text-pop-yellow bg-white dark:bg-[#14192b] px-2 py-0.5 rounded border-2 border-black shadow-pop-xs">
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
                    <div className="text-center py-12 space-y-2 bg-white dark:bg-[#14192b] border-2 border-black rounded-2xl p-6 shadow-pop">
                      <p className="text-slate-800 dark:text-slate-300 text-sm font-pop font-bold">NO GAMES FOUND</p>
                      <button
                        onClick={() => {
                          setSelectedCategory('all');
                          setSearchQuery('');
                        }}
                        className="text-xs font-pop font-black text-pop-pink dark:text-pop-yellow hover:underline"
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
                  <h2 className="text-xl font-pop font-black text-slate-900 dark:text-white pop-text-shadow">
                    FAVORITE <span className="text-pop-pink">GAMES</span>
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Quick access to the games you love</p>
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
                  <div className="text-center py-16 space-y-3 bg-white dark:bg-[#14192b] border-2 border-black rounded-2xl p-6 shadow-pop">
                    <span className="text-4xl inline-block animate-bounce">❤️</span>
                    <p className="text-slate-900 dark:text-white text-base font-pop font-black">NO FAVORITES YET</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-[220px] mx-auto">
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
