import { DifficultyPicker } from './components/DifficultyPicker';
import { DIFFICULTIES } from './engine/difficulty';
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
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
const SnakeView = lazy(() => import('./games/snake/SnakeView').then(module => ({ default: module.SnakeView })));
const FruitFusionView = lazy(() => import('./games/fruit/FruitFusionView').then(module => ({ default: module.FruitFusionView })));
const BrickBreakerView = lazy(() => import('./games/breaker/BrickBreakerView').then(module => ({ default: module.BrickBreakerView })));
const Game2048View = lazy(() => import('./games/game2048/Game2048View').then(module => ({ default: module.Game2048View })));
const KnifeStrikeView = lazy(() => import('./games/knife/KnifeStrikeView').then(module => ({ default: module.KnifeStrikeView })));
const MinesweeperView = lazy(() => import('./games/minesweeper/MinesweeperView').then(module => ({ default: module.MinesweeperView })));
const StackSliceView = lazy(() => import('./games/stack/StackSliceView').then(module => ({ default: module.StackSliceView })));
const CyberSprintView = lazy(() => import('./games/runner/CyberSprintView').then(module => ({ default: module.CyberSprintView })));
const FlappyOrbitView = lazy(() => import('./games/flappy/FlappyOrbitView').then(module => ({ default: module.FlappyOrbitView })));
const ChromaJumpView = lazy(() => import('./games/chroma/ChromaJumpView').then(module => ({ default: module.ChromaJumpView })));
const GalaxiaVoidView = lazy(() => import('./games/space/GalaxiaVoidView').then(module => ({ default: module.GalaxiaVoidView })));
const BlockPuzzleView = lazy(() => import('./games/blockpuzzle/BlockPuzzleView').then(module => ({ default: module.BlockPuzzleView })));
const HelixDescentView = lazy(() => import('./games/helix/HelixDescentView').then(module => ({ default: module.HelixDescentView })));
const RhythmFallView = lazy(() => import('./games/rhythm/RhythmFallView').then(module => ({ default: module.RhythmFallView })));
const CrossyLaneView = lazy(() => import('./games/crossy/CrossyLaneView').then(module => ({ default: module.CrossyLaneView })));
const TetrisView = lazy(() => import('./games/tetris/TetrisView').then(module => ({ default: module.TetrisView })));
const SudokuView = lazy(() => import('./games/sudoku/SudokuView').then(module => ({ default: module.SudokuView })));
const MemoryMatrixView = lazy(() => import('./games/memory/MemoryMatrixView').then(module => ({ default: module.MemoryMatrixView })));
const GemSlideView = lazy(() => import('./games/gemslide/GemSlideView').then(module => ({ default: module.GemSlideView })));
const LightsOutView = lazy(() => import('./games/lightsout/LightsOutView').then(module => ({ default: module.LightsOutView })));
const WordPulseView = lazy(() => import('./games/wordle/WordPulseView').then(module => ({ default: module.WordPulseView })));
const NeonConnectView = lazy(() => import('./games/connect/NeonConnectView').then(module => ({ default: module.NeonConnectView })));
const SimonEchoView = lazy(() => import('./games/simon/SimonEchoView').then(module => ({ default: module.SimonEchoView })));

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
  'crossy-lane',
  'tetris-neon',
  'sudoku-pulse',
  'memory-matrix',
  'gem-slide-15',
  'cyber-lights',
  'word-pulse',
  'neon-connect',
  'simon-echo'
];

import { GAME_CATALOG } from './games/registry';
import { GameCategory, GameMetadata, GameScoreUpdate, PlatformSettings } from './types/game';
import { storage } from './engine/storage';
import { sounds } from './engine/audio';
import { haptics } from './engine/haptics';
import { Search, Heart } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation & Filtering
  const [navTab, setNavTab] = useState<NavTab>('arcade');
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  // Platform Preferences & Meta
  const [settings, setSettings] = useState<PlatformSettings>(() => storage.getSettings());
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

  const gameEndedRef = useRef(false);

  // Initialize and Sync Settings & PWA prompt
  useEffect(() => {
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

  useEffect(() => {
    sounds.setEnabled(settings.soundEnabled);
    haptics.setEnabled(settings.hapticsEnabled);
  }, [settings.soundEnabled, settings.hapticsEnabled]);

  // Keep a hidden game safe until the player explicitly resumes.
  useEffect(() => {
    if (!activeGame) return;
    const pauseHidden = () => { if (document.hidden && !gameEndedRef.current) setIsPaused(true); };
    const keyboardPause = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !gameEndedRef.current) {
        event.preventDefault();
        setIsPaused(value => !value);
      }
    };
    document.addEventListener('visibilitychange', pauseHidden);
    window.addEventListener('keydown', keyboardPause);
    return () => {
      document.removeEventListener('visibilitychange', pauseHidden);
      window.removeEventListener('keydown', keyboardPause);
    };
  }, [activeGame]);

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
    gameEndedRef.current = false;
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

  const handleGameOver = (finalScore: number, _isNewHighScore?: boolean, stars?: number) => {
    if (!activeGame || gameEndedRef.current) return;
    gameEndedRef.current = true;
    setGameScore(finalScore);
    setIsPaused(false);
    const earnedStars = stars ?? 0;
    setGameStars(earnedStars);
    const result = storage.saveScore(activeGame.id, finalScore, earnedStars, 1);
    setHighScore(result.progress.highScore);
    setIsNewHighScore(result.isNewHighScore);
    setIsGameOver(true);
    setTotalStars(storage.getTotalStars());
  };

  const handleRestartGame = () => {
    if (!activeGame) return;
    gameEndedRef.current = false;
    setGameStars(0);
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
    storage.resetProgress();
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

    // Favorites are independent of the lobby's search and category filters.
    if (navTab === 'favorites') return true;

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
      const q = searchQuery.trim().toLowerCase();
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
    <div className={`min-h-screen ${isLight ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#0b0f19] text-white'} flex flex-col justify-between relative overflow-hidden pop-dots-bg transition-colors duration-200`}>
      {/* Active Game View (Expansive viewport on all devices) */}
      {activeGame ? (
        <div className={`fixed inset-0 z-50 flex items-center justify-center touch-none overscroll-none select-none transition-colors duration-200 ${isLight ? 'bg-slate-200/60' : 'bg-[#080b14]'}`}>
          <div className={`relative w-full max-w-4xl h-full flex flex-col overflow-hidden transition-colors duration-200 shadow-2xl border-x ${isLight ? 'bg-slate-50 border-slate-200/90' : 'bg-[#0c101c] border-slate-800/80'} touch-none select-none`}>
            {/* In-Game HUD Overlay */}
            <InGameOverlay
              difficulty={activeGame.id === '2048-unlimited' ? 'Classic rules' : DIFFICULTIES[settings.difficulty].label}
              game={activeGame}
              score={gameScore}
              highScore={highScore}
              soundEnabled={settings.soundEnabled}
              onToggleSound={handleToggleSound}
              theme={settings.theme}
              onToggleTheme={handleToggleTheme}
              onPause={() => { if (!gameEndedRef.current) setIsPaused(true); }}
              onExit={handleExitGame}
            />

            {/* Active Game View Area */}
            <div key={gameSessionId} className="relative flex-1 w-full h-full overflow-hidden touch-none select-none game-canvas-container">
              <Suspense fallback={<div className="game-loading" role="status"><span className="loading-orbit" />Warming up {activeGame.title}…</div>}>
              {activeGame.id === 'neon-snake' && (
                <SnakeView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'fruit-fusion' && (
                <FruitFusionView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'brick-breaker' && (
                <BrickBreakerView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === '2048-unlimited' && (
                <Game2048View
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'knife-strike' && (
                <KnifeStrikeView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'minesweeper-pulse' && (
                <MinesweeperView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'stack-slice' && (
                <StackSliceView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'cyber-sprint' && (
                <CyberSprintView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'flappy-orbit' && (
                <FlappyOrbitView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'chroma-jump' && (
                <ChromaJumpView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'galaxia-void' && (
                <GalaxiaVoidView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'block-puzzle' && (
                <BlockPuzzleView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'helix-descent' && (
                <HelixDescentView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'rhythm-fall' && (
                <RhythmFallView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'crossy-lane' && (
                <CrossyLaneView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'tetris-neon' && (
                <TetrisView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'sudoku-pulse' && (
                <SudokuView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'memory-matrix' && (
                <MemoryMatrixView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'gem-slide-15' && (
                <GemSlideView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'cyber-lights' && (
                <LightsOutView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'word-pulse' && (
                <WordPulseView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'neon-connect' && (
                <NeonConnectView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              {activeGame.id === 'simon-echo' && (
                <SimonEchoView
                  mode="endless"
                  isPaused={isPaused || isGameOver}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                />
              )}
              </Suspense>
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
          <main className="arcade-main flex-1 w-full max-w-6xl mx-auto">
            {navTab === 'arcade' && (
              <div className="space-y-6 pb-28">
                <div className="lobby-intro px-4 pt-7"><div><span className="eyebrow">INSERT CURIOSITY. PRESS PLAY.</span><h2>Small games.<br /> <span>Endless possibilities.</span></h2><p>23 quick escapes. Zero downloads. One more go.</p></div><span className="lobby-stamp">100%<br /><small>PLAYABLE</small></span></div>
                {/* Search Bar */}
                <div className="px-4 pt-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 dark:text-amber-400 stroke-[2.2]" />
                    <input
                      type="text"
                      aria-label="Search games"
                      placeholder="Find your next obsession..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#14192b] border border-slate-200 dark:border-slate-700/80 shadow-sm text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Hero / Surprise Pick Card with Interactive Random Roll */}
                {searchQuery === '' && selectedCategory === 'all' && (
                  <RandomHeroPicker
                    catalog={GAME_CATALOG.filter(game => PLAYABLE_GAMES.includes(game.id))}
                    onSelectGame={handleStartGame}
                    isLight={isLight}
                  />
                )}

                <div className="px-4"><DifficultyPicker value={settings.difficulty} onChange={difficulty => setSettings(storage.saveSettings({ difficulty }))} /></div>

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
                        ? 'THE GAME ROOM'
                        : `${selectedCategory.toUpperCase()} GAMES`}
                    </h3>
                    <span className="text-[10px] font-bungee text-amber-600 dark:text-amber-400 bg-white dark:bg-[#14192b] px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                      {filteredGames.length} GAMES
                    </span>
                  </div>

                  {filteredGames.length > 0 ? (
                    <div className="game-grid grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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
                    <div className="text-center py-12 space-y-2 bg-white dark:bg-[#14192b] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm">
                      <p className="text-slate-800 dark:text-slate-300 text-sm font-pop font-bold">NO GAMES FOUND</p>
                      <button
                        onClick={() => {
                          setSelectedCategory('all');
                          setSearchQuery('');
                        }}
                        className="text-xs font-pop font-black text-amber-600 dark:text-amber-400 hover:underline"
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
                  <div className="game-grid grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  <div className="text-center py-16 space-y-3 bg-white dark:bg-[#14192b] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm">
                    <Heart className="w-12 h-12 mx-auto text-rose-400" strokeWidth={1.5} />
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
