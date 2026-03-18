import AsyncStorage from '@react-native-async-storage/async-storage';
import {MAX_HEARTS, HEART_REGEN_MS} from '../constants';
import {t} from '../i18n';
import {getCurrentUserId} from '../services/supabase';

// Types
export interface GameData {
  hearts: number;
  lastHeartTime: number;
  stars: number;
  diamonds: number;
  items: {
    hammer: number;
    refresh: number;
    addTurns: number;
    bomb: number;
  };
}

export interface LevelProgress {
  [levelId: number]: {
    cleared: boolean;
    stars: number;
    highScore: number;
  };
}

export interface EndlessStats {
  totalGames: number;
  totalScore: number;
  totalLines: number;
  maxLevel: number;
  maxCombo: number;
  highScore: number;
}

export interface DailyStats {
  date: string;
  games: number;
  score: number;
  lines: number;
  maxCombo: number;
  levelClears: number;
}

export interface MissionData {
  date: string;
  claimed: {[missionId: string]: boolean};
}

export interface AchievementData {
  [achievementId: string]: boolean;
}

// Default values
const defaultGameData: GameData = {
  hearts: MAX_HEARTS,
  lastHeartTime: Date.now(),
  stars: 0,
  diamonds: 0,
  items: {hammer: 0, refresh: 0, addTurns: 0, bomb: 0},
};

const defaultEndlessStats: EndlessStats = {
  totalGames: 0,
  totalScore: 0,
  totalLines: 0,
  maxLevel: 0,
  maxCombo: 0,
  highScore: 0,
};

const defaultDailyStats = (): DailyStats => ({
  date: new Date().toDateString(),
  games: 0,
  score: 0,
  lines: 0,
  maxCombo: 0,
  levelClears: 0,
});

// Storage helper
async function load<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultValue;
}

async function save(key: string, value: any): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// GameData operations
export async function loadGameData(): Promise<GameData> {
  const data = await load<GameData>('gameData', defaultGameData);
  // Regenerate hearts
  if (data.hearts < MAX_HEARTS) {
    const elapsed = Date.now() - data.lastHeartTime;
    const heartsToAdd = Math.floor(elapsed / HEART_REGEN_MS);
    if (heartsToAdd > 0) {
      data.hearts = Math.min(MAX_HEARTS, data.hearts + heartsToAdd);
      data.lastHeartTime = Date.now();
      await save('gameData', data);
    }
  }
  return data;
}

export async function saveGameData(data: GameData): Promise<void> {
  await save('gameData', data);
}

export async function useHeart(data: GameData): Promise<GameData | null> {
  if (data.hearts <= 0) return null;
  const updated = {
    ...data,
    hearts: data.hearts - 1,
    lastHeartTime: data.hearts === MAX_HEARTS ? Date.now() : data.lastHeartTime,
  };
  await save('gameData', updated);
  return updated;
}

export async function addStars(data: GameData, amount: number): Promise<GameData> {
  const updated = {...data, stars: data.stars + amount};
  await save('gameData', updated);
  return updated;
}

export async function useStars(data: GameData, amount: number): Promise<GameData | null> {
  if (data.stars < amount) return null;
  const updated = {...data, stars: data.stars - amount};
  await save('gameData', updated);
  return updated;
}

export async function addItem(
  data: GameData,
  item: keyof GameData['items'],
  count: number = 1,
): Promise<GameData> {
  const updated = {
    ...data,
    items: {...data.items, [item]: data.items[item] + count},
  };
  await save('gameData', updated);
  return updated;
}

export async function useItem(
  data: GameData,
  item: keyof GameData['items'],
): Promise<GameData | null> {
  if (data.items[item] <= 0) return null;
  const updated = {
    ...data,
    items: {...data.items, [item]: data.items[item] - 1},
  };
  await save('gameData', updated);
  return updated;
}

export async function refillHearts(data: GameData): Promise<GameData> {
  const updated = {...data, hearts: MAX_HEARTS, lastHeartTime: Date.now()};
  await save('gameData', updated);
  return updated;
}

// Level progress
export async function loadLevelProgress(): Promise<LevelProgress> {
  return load<LevelProgress>('levelProgress', {});
}

export async function saveLevelProgress(
  progress: LevelProgress,
  levelId: number,
  score: number,
  stars: number,
): Promise<LevelProgress> {
  const existing = progress[levelId];
  const updated = {
    ...progress,
    [levelId]: {
      cleared: true,
      stars: Math.max(existing?.stars || 0, stars),
      highScore: Math.max(existing?.highScore || 0, score),
    },
  };
  await save('levelProgress', updated);
  return updated;
}

// Endless stats
export async function loadEndlessStats(): Promise<EndlessStats> {
  return load<EndlessStats>('endlessStats', defaultEndlessStats);
}

export async function saveEndlessStats(
  stats: EndlessStats,
  score: number,
  lines: number,
  level: number,
  combo: number,
): Promise<EndlessStats> {
  const updated: EndlessStats = {
    totalGames: stats.totalGames + 1,
    totalScore: stats.totalScore + score,
    totalLines: stats.totalLines + lines,
    maxLevel: Math.max(stats.maxLevel, level),
    maxCombo: Math.max(stats.maxCombo, combo),
    highScore: Math.max(stats.highScore, score),
  };
  await save('endlessStats', updated);
  return updated;
}

// Daily stats
export async function loadDailyStats(): Promise<DailyStats> {
  const stats = await load<DailyStats>('dailyStats', defaultDailyStats());
  if (stats.date !== new Date().toDateString()) {
    const fresh = defaultDailyStats();
    await save('dailyStats', fresh);
    return fresh;
  }
  return stats;
}

export async function updateDailyStats(
  stats: DailyStats,
  update: Partial<Omit<DailyStats, 'date'>>,
): Promise<DailyStats> {
  const updated: DailyStats = {
    ...stats,
    games: stats.games + (update.games || 0),
    score: stats.score + (update.score || 0),
    lines: stats.lines + (update.lines || 0),
    maxCombo: Math.max(stats.maxCombo, update.maxCombo || 0),
    levelClears: stats.levelClears + (update.levelClears || 0),
  };
  await save('dailyStats', updated);
  return updated;
}

// Mission data
export async function loadMissionData(): Promise<MissionData> {
  const data = await load<MissionData>('missionData', {
    date: new Date().toDateString(),
    claimed: {},
  });
  if (data.date !== new Date().toDateString()) {
    const fresh = {date: new Date().toDateString(), claimed: {}};
    await save('missionData', fresh);
    return fresh;
  }
  return data;
}

export async function claimMission(
  data: MissionData,
  missionId: string,
): Promise<MissionData> {
  const updated = {
    ...data,
    claimed: {...data.claimed, [missionId]: true},
  };
  await save('missionData', updated);
  return updated;
}

// Achievement data
export async function loadAchievements(): Promise<AchievementData> {
  return load<AchievementData>('achievementData', {});
}

export async function claimAchievement(
  data: AchievementData,
  achievementId: string,
): Promise<AchievementData> {
  const updated = {...data, [achievementId]: true};
  await save('achievementData', updated);
  return updated;
}

// Player info - use Supabase auth user ID, fallback to local random ID
export async function getPlayerId(): Promise<string> {
  try {
    const userId = await getCurrentUserId();
    if (userId) return userId;
  } catch {}
  let id = await AsyncStorage.getItem('playerId');
  if (!id) {
    id = 'player_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    await AsyncStorage.setItem('playerId', id);
  }
  return id;
}

export async function getNickname(): Promise<string> {
  return (await AsyncStorage.getItem('nickname')) || t('common.player');
}

export async function setNickname(name: string): Promise<void> {
  await AsyncStorage.setItem('nickname', name);
}

// Heart timer remaining
export function getHeartTimerRemaining(data: GameData): number {
  if (data.hearts >= MAX_HEARTS) return 0;
  const elapsed = Date.now() - data.lastHeartTime;
  return Math.max(0, HEART_REGEN_MS - (elapsed % HEART_REGEN_MS));
}
