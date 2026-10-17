import { PlatformSettings, UserGameProgress } from '../types/game';

const PROGRESS_PREFIX = 'ug_progress_';
const FAVORITES_KEY = 'ug_favorites';
const SETTINGS_KEY = 'ug_settings';
const RECENTS_KEY = 'ug_recents';

const DEFAULT_SETTINGS: PlatformSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  vibrationIntensity: 'medium',
  theme: 'cyber'
};

class StorageEngine {
  private cacheSettings: PlatformSettings | null = null;
  private cacheFavorites: Set<string> | null = null;

  public getSettings(): PlatformSettings {
    if (this.cacheSettings) return this.cacheSettings;
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        const settings: PlatformSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
        this.cacheSettings = settings;
        return settings;
      }
    } catch (e) {
      console.warn('Failed to read settings from storage', e);
    }
    const defaults: PlatformSettings = { ...DEFAULT_SETTINGS };
    this.cacheSettings = defaults;
    return defaults;
  }

  public saveSettings(patch: Partial<PlatformSettings>): PlatformSettings {
    const current = this.getSettings();
    const updated = { ...current, ...patch };
    this.cacheSettings = updated;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
    return updated;
  }

  public getProgress(gameId: string): UserGameProgress {
    try {
      const data = localStorage.getItem(PROGRESS_PREFIX + gameId);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load game progress', e);
    }
    return {
      gameId,
      highScore: 0,
      highestLevelUnlocked: 1,
      starsEarned: {},
      playCount: 0,
      lastPlayed: Date.now()
    };
  }

  public saveScore(
    gameId: string,
    score: number,
    starsEarned: number = 0,
    levelNumber: number = 1
  ): { isNewHighScore: boolean; progress: UserGameProgress } {
    const progress = this.getProgress(gameId);
    const isNewHighScore = score > progress.highScore;

    if (isNewHighScore) {
      progress.highScore = score;
    }

    progress.playCount += 1;
    progress.lastPlayed = Date.now();

    if (starsEarned > 0) {
      const currentStars = progress.starsEarned[levelNumber] || 0;
      if (starsEarned > currentStars) {
        progress.starsEarned[levelNumber] = starsEarned;
      }
      // Unlock next level
      if (levelNumber >= progress.highestLevelUnlocked) {
        progress.highestLevelUnlocked = levelNumber + 1;
      }
    }

    try {
      localStorage.setItem(PROGRESS_PREFIX + gameId, JSON.stringify(progress));
      this.recordRecentPlay(gameId);
    } catch (e) {
      console.warn('Failed to write progress', e);
    }

    return { isNewHighScore, progress };
  }

  public getFavorites(): string[] {
    if (this.cacheFavorites) return Array.from(this.cacheFavorites);
    try {
      const data = localStorage.getItem(FAVORITES_KEY);
      if (data) {
        const arr: string[] = JSON.parse(data);
        this.cacheFavorites = new Set(arr);
        return arr;
      }
    } catch (e) {
      console.warn('Failed to load favorites', e);
    }
    this.cacheFavorites = new Set();
    return [];
  }

  public toggleFavorite(gameId: string): boolean {
    const favs = new Set(this.getFavorites());
    let isFav = false;
    if (favs.has(gameId)) {
      favs.delete(gameId);
      isFav = false;
    } else {
      favs.add(gameId);
      isFav = true;
    }
    this.cacheFavorites = favs;
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favs)));
    } catch (e) {
      console.warn('Failed to save favorites', e);
    }
    return isFav;
  }

  public isFavorite(gameId: string): boolean {
    return this.getFavorites().includes(gameId);
  }

  private recordRecentPlay(gameId: string) {
    try {
      const data = localStorage.getItem(RECENTS_KEY);
      let list: string[] = data ? JSON.parse(data) : [];
      list = [gameId, ...list.filter(id => id !== gameId)].slice(0, 10);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to record recents', e);
    }
  }

  public getRecentGames(): string[] {
    try {
      const data = localStorage.getItem(RECENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public getTotalStars(): number {
    let total = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PROGRESS_PREFIX)) {
          const progress: UserGameProgress = JSON.parse(localStorage.getItem(key) || '{}');
          if (progress.starsEarned) {
            total += Object.values(progress.starsEarned).reduce((sum, val) => sum + val, 0);
          }
        }
      }
    } catch {
      // fallback
    }
    return total;
  }
}

export const storage = new StorageEngine();
