import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MAX_HEARTS,
  HEART_REGEN_MS,
  MAX_ITEM_PER_TYPE,
  INFINITE_HEARTS_VALUE,
  getConfiguredMaxHearts,
} from '../constants';
import {CHARACTER_CLASSES, xpToNextLevel} from '../constants/characters';
import {t} from '../i18n';
import {getCurrentUserId} from '../services/supabase';
import {getAdminStatus, getCachedAdminStatus} from '../services/adminSync';
import {
  fetchPlayerState,
  loadOwnProfile,
  peekPlayerStateCache,
  schedulePlayerStateFlush,
  stagePlayerStatePatch,
  type PlayerStateRow,
  updateOwnProfile,
  upsertPlayerState,
} from '../services/playerState';
import {
  getCharacterSkillEffects,
  getDynamicHeartCap,
  getDynamicHeartRegenMs,
  getDynamicItemCapPerType,
  shouldPreserveItem,
} from '../game/characterSkillEffects';
import {
  applySummonExp,
  createDefaultSummonProgressMap,
  ensureSummonProgressMap,
  type SummonProgressData,
} from '../game/skinSummonRuntime';

// Types
export interface GameData {
  hearts: number;
  lastHeartTime: number;
  gold: number;
  diamonds: number;
  items: {
    hammer: number;
    refresh: number;
    addTurns: number;
    bomb: number;
    piece_square3: number;
    piece_rect: number;
    piece_line5: number;
    piece_num2: number;
    piece_diag: number;
    [key: string]: number;
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
  hearts: getConfiguredMaxHearts(MAX_HEARTS, false),
  lastHeartTime: Date.now(),
  gold: 0,
  diamonds: 0,
  items: {hammer: 0, refresh: 0, addTurns: 0, bomb: 0, piece_square3: 0, piece_rect: 0, piece_line5: 0, piece_num2: 0, piece_diag: 0},
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

const defaultMissionData = (): MissionData => ({
  date: new Date().toDateString(),
  claimed: {},
});

type PlayerStateColumn =
  | 'game_data'
  | 'level_progress'
  | 'endless_stats'
  | 'daily_stats'
  | 'mission_data'
  | 'achievement_data'
  | 'skin_data'
  | 'selected_character_id'
  | 'character_data'
  | 'normal_raid_progress'
  | 'codex_data'
  | 'unlocked_titles'
  | 'active_title';

function cloneValue<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function hasStateValue(value: unknown): boolean {
  return value !== null && value !== undefined;
}

async function loadLocalJson<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  return cloneValue(defaultValue);
}

async function readLocalJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveLocalJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

async function loadLocalString(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function saveLocalString(key: string, value: string | null): Promise<void> {
  try {
    if (value === null) {
      await AsyncStorage.removeItem(key);
      return;
    }

    await AsyncStorage.setItem(key, value);
  } catch {}
}

const NICKNAME_CACHE_PREFIX = 'nickname_cache_';

function getNicknameCacheKey(userId: string) {
  return `${NICKNAME_CACHE_PREFIX}${userId}`;
}

async function loadNicknameCache(userId: string): Promise<string | null> {
  return loadLocalString(getNicknameCacheKey(userId));
}

async function saveNicknameCache(userId: string, nickname: string | null): Promise<void> {
  await saveLocalString(getNicknameCacheKey(userId), nickname);
}

async function buildLocalPlayerStatePatch(): Promise<
  Partial<Omit<PlayerStateRow, 'user_id'>>
> {
  const characterDataEntries = await Promise.all(
    CHARACTER_CLASSES.map(async characterClass => {
      const raw = await readLocalJson<CharacterData>(`charData_${characterClass.id}`);
      return [characterClass.id, raw ?? defaultCharacterData(characterClass.id)] as const;
    }),
  );

  const selectedCharacter = await loadLocalJson<string | null>(
    'selectedCharacter',
    null,
  );
  const activeTitle = await loadLocalJson<string | null>('activeTitle', null);

  return {
    game_data: await loadLocalJson<GameData>('gameData', defaultGameData),
    level_progress: await loadLocalJson<LevelProgress>('levelProgress', {}),
    endless_stats: await loadLocalJson<EndlessStats>(
      'endlessStats',
      defaultEndlessStats,
    ),
    daily_stats: await loadLocalJson<DailyStats>('dailyStats', defaultDailyStats()),
    mission_data: await loadLocalJson<MissionData>(
      'missionData',
      defaultMissionData(),
    ),
    achievement_data: await loadLocalJson<AchievementData>('achievementData', {}),
    skin_data: await loadLocalJson<SkinData>('skinData', defaultSkinData),
    selected_character_id: selectedCharacter,
    character_data: Object.fromEntries(characterDataEntries),
    normal_raid_progress: await loadLocalJson<NormalRaidProgress>(
      'normalRaidProgress',
      {},
    ),
    codex_data: await loadLocalJson<CodexData>('codexData', {}),
    unlocked_titles: await loadLocalJson<string[]>('unlockedTitles', []),
    active_title: activeTitle,
  };
}

async function ensurePlayerStateRow() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return null;
    }

    const existing = await fetchPlayerState();
    if (existing) {
      return existing;
    }

    return await upsertPlayerState(await buildLocalPlayerStatePatch());
  } catch {
    return null;
  }
}

export async function preloadGameStoreState() {
  return ensurePlayerStateRow();
}

function readStateColumnFromRow<T>(
  row: PlayerStateRow | null,
  column: PlayerStateColumn,
  defaultValue: T,
): T {
  if (row && hasStateValue(row[column])) {
    return cloneValue(row[column] as T);
  }

  return cloneValue(defaultValue);
}

async function loadStateColumn<T>(
  column: PlayerStateColumn,
  localKey: string,
  defaultValue: T,
): Promise<T> {
  const cachedRow = peekPlayerStateCache();
  if (cachedRow) {
    return readStateColumnFromRow(cachedRow, column, defaultValue);
  }

  const row = await ensurePlayerStateRow();
  if (row) {
    return readStateColumnFromRow(row, column, defaultValue);
  }

  return loadLocalJson(localKey, defaultValue);
}

async function saveStateColumn<T>(
  column: PlayerStateColumn,
  localKey: string,
  value: T,
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      if (!peekPlayerStateCache()) {
        const row = await ensurePlayerStateRow();
        if (!row) {
          throw new Error('missing_player_state');
        }
      }

      stagePlayerStatePatch({
        [column]: cloneValue(value),
      } as Partial<Omit<PlayerStateRow, 'user_id'>>);
      schedulePlayerStateFlush(`save_${column}`);
      return;
    }
  } catch {}

  await saveLocalJson(localKey, value);
}

// Storage helper
async function load<T>(key: string, defaultValue: T): Promise<T> {
  switch (key) {
    case 'gameData':
      return loadStateColumn('game_data', key, defaultValue);
    case 'levelProgress':
      return loadStateColumn('level_progress', key, defaultValue);
    case 'endlessStats':
      return loadStateColumn('endless_stats', key, defaultValue);
    case 'dailyStats':
      return loadStateColumn('daily_stats', key, defaultValue);
    case 'missionData':
      return loadStateColumn('mission_data', key, defaultValue);
    case 'achievementData':
      return loadStateColumn('achievement_data', key, defaultValue);
    case 'skinData':
      return loadStateColumn('skin_data', key, defaultValue);
    case 'selectedCharacter':
      return loadStateColumn('selected_character_id', key, defaultValue);
    case 'normalRaidProgress':
      return loadStateColumn('normal_raid_progress', key, defaultValue);
    case 'codexData':
      return loadStateColumn('codex_data', key, defaultValue);
    case 'unlockedTitles':
      return loadStateColumn('unlocked_titles', key, defaultValue);
    case 'activeTitle':
      return loadStateColumn('active_title', key, defaultValue);
    default:
      if (key.startsWith('charData_')) {
        const row = peekPlayerStateCache() ?? (await ensurePlayerStateRow());
        const characterId = key.slice('charData_'.length);
        const characterDataMap = hasStateValue(row?.character_data)
          ? (row?.character_data as Record<string, CharacterData>)
          : null;

        if (row) {
          if (characterDataMap?.[characterId]) {
            return cloneValue(characterDataMap[characterId]) as T;
          }

          return cloneValue(defaultValue);
        }
      }

      return loadLocalJson(key, defaultValue);
  }
}

async function save(key: string, value: any): Promise<void> {
  switch (key) {
    case 'gameData':
      await saveStateColumn('game_data', key, value);
      return;
    case 'levelProgress':
      await saveStateColumn('level_progress', key, value);
      return;
    case 'endlessStats':
      await saveStateColumn('endless_stats', key, value);
      return;
    case 'dailyStats':
      await saveStateColumn('daily_stats', key, value);
      return;
    case 'missionData':
      await saveStateColumn('mission_data', key, value);
      return;
    case 'achievementData':
      await saveStateColumn('achievement_data', key, value);
      return;
    case 'skinData':
      await saveStateColumn('skin_data', key, value);
      return;
    case 'selectedCharacter':
      await saveStateColumn('selected_character_id', key, value);
      return;
    case 'normalRaidProgress':
      await saveStateColumn('normal_raid_progress', key, value);
      return;
    case 'codexData':
      await saveStateColumn('codex_data', key, value);
      return;
    case 'unlockedTitles':
      await saveStateColumn('unlocked_titles', key, value);
      return;
    case 'activeTitle':
      await saveStateColumn('active_title', key, value);
      return;
    default:
      if (key.startsWith('charData_')) {
        const row = peekPlayerStateCache() ?? (await ensurePlayerStateRow());
        const characterId = key.slice('charData_'.length);
        const current = hasStateValue(row?.character_data)
          ? {...(row?.character_data as Record<string, CharacterData>)}
          : {};

        current[characterId] = cloneValue(value);

        try {
          const userId = await getCurrentUserId();
          if (userId) {
            stagePlayerStatePatch({character_data: current});
            schedulePlayerStateFlush(`save_${characterId}_character_data`);
            return;
          }
        } catch {}
      }

      await saveLocalJson(key, value);
  }
}

async function getSelectedCharacterEffects() {
  const characterId = await getSelectedCharacter();
  if (!characterId) {
    return getCharacterSkillEffects(null, null);
  }

  const characterData = await loadCharacterData(characterId);
  return getCharacterSkillEffects(characterId, characterData, {mode: 'level'});
}

async function hasInfiniteHeartsAccess(): Promise<boolean> {
  try {
    return await getAdminStatus();
  } catch {
    return getCachedAdminStatus();
  }
}

// GameData operations
export async function loadGameData(): Promise<GameData> {
  const data = await load<GameData>('gameData', defaultGameData);
  const effects = await getSelectedCharacterEffects();
  const isInfiniteHearts = await hasInfiniteHeartsAccess();
  const maxHearts = getConfiguredMaxHearts(
    getDynamicHeartCap(MAX_HEARTS, effects),
    isInfiniteHearts,
  );
  const heartRegenMs = getDynamicHeartRegenMs(HEART_REGEN_MS, effects);
  // Migration: stars → gold
  if ((data as any).stars !== undefined && (data as any).gold === undefined) {
    data.gold = (data as any).stars;
    delete (data as any).stars;
    await save('gameData', data);
  }
  if (isInfiniteHearts) {
    if (data.hearts !== INFINITE_HEARTS_VALUE) {
      data.hearts = INFINITE_HEARTS_VALUE;
      data.lastHeartTime = Date.now();
      await save('gameData', data);
    }
    return data;
  }
  if (data.hearts > maxHearts) {
    data.hearts = maxHearts;
    data.lastHeartTime = Date.now();
    await save('gameData', data);
  }
  // Regenerate hearts
  if (data.hearts < maxHearts) {
    const elapsed = Date.now() - data.lastHeartTime;
    const heartsToAdd = Math.floor(elapsed / heartRegenMs);
    if (heartsToAdd > 0) {
      data.hearts = Math.min(maxHearts, data.hearts + heartsToAdd);
      data.lastHeartTime = Date.now();
      await save('gameData', data);
    }
  }
  return data;
}

export async function saveGameData(data: GameData): Promise<void> {
  const isInfiniteHearts = await hasInfiniteHeartsAccess();
  if (isInfiniteHearts) {
    await save('gameData', {
      ...data,
      hearts: INFINITE_HEARTS_VALUE,
      lastHeartTime: Date.now(),
    });
    return;
  }
  const effects = await getSelectedCharacterEffects();
  const maxHearts = getConfiguredMaxHearts(
    getDynamicHeartCap(MAX_HEARTS, effects),
    false,
  );
  await save('gameData', {
    ...data,
    hearts: Math.min(maxHearts, Math.max(0, data.hearts)),
  });
}

export async function useHeart(data: GameData): Promise<GameData | null> {
  const isInfiniteHearts = await hasInfiniteHeartsAccess();
  if (isInfiniteHearts) {
    const updated = {
      ...data,
      hearts: INFINITE_HEARTS_VALUE,
      lastHeartTime: Date.now(),
    };
    await save('gameData', updated);
    return updated;
  }
  const effects = await getSelectedCharacterEffects();
  const maxHearts = getConfiguredMaxHearts(
    getDynamicHeartCap(MAX_HEARTS, effects),
    false,
  );
  if (data.hearts <= 0) return null;
  const updated = {
    ...data,
    hearts: data.hearts - 1,
    lastHeartTime: data.hearts === maxHearts ? Date.now() : data.lastHeartTime,
  };
  await save('gameData', updated);
  return updated;
}

export async function addGold(data: GameData, amount: number): Promise<GameData> {
  const updated = {...data, gold: data.gold + amount};
  await save('gameData', updated);
  return updated;
}

export async function useGold(data: GameData, amount: number): Promise<GameData | null> {
  if (data.gold < amount) return null;
  const updated = {...data, gold: data.gold - amount};
  await save('gameData', updated);
  return updated;
}

export async function addItem(
  data: GameData,
  item: keyof GameData['items'],
  count: number = 1,
): Promise<GameData> {
  let nextCount = data.items[item] + count;
  if (COLLECTIBLE_BATTLE_ITEMS.includes(item)) {
    const effects = await getSelectedCharacterEffects();
    nextCount = Math.min(
      getDynamicItemCapPerType(MAX_ITEM_PER_TYPE, effects),
      nextCount,
    );
  }
  const updated = {
    ...data,
    items: {...data.items, [item]: nextCount},
  };
  await save('gameData', updated);
  return updated;
}

const COLLECTIBLE_BATTLE_ITEMS: Array<keyof GameData['items']> = [
  'hammer',
  'bomb',
  'refresh',
];

export interface SpecialBlockRewardResult {
  data: GameData;
  diamondsGained: number;
  itemsCollected: Array<keyof GameData['items']>;
  itemsSkipped: Array<keyof GameData['items']>;
}

export async function collectSpecialBlockRewards(
  data: GameData,
  gemsFound: number,
  itemsFound: string[],
): Promise<SpecialBlockRewardResult> {
  const effects = await getSelectedCharacterEffects();
  const maxItemPerType = getDynamicItemCapPerType(MAX_ITEM_PER_TYPE, effects);
  const updated: GameData = {
    ...data,
    diamonds: data.diamonds + gemsFound,
    items: {...data.items},
  };
  const itemsCollected: Array<keyof GameData['items']> = [];
  const itemsSkipped: Array<keyof GameData['items']> = [];

  for (const item of itemsFound) {
    if (!COLLECTIBLE_BATTLE_ITEMS.includes(item as keyof GameData['items'])) {
      continue;
    }

    const itemKey = item as keyof GameData['items'];
    if (updated.items[itemKey] >= maxItemPerType) {
      itemsSkipped.push(itemKey);
      continue;
    }

    updated.items[itemKey] += 1;
    itemsCollected.push(itemKey);
  }

  await save('gameData', updated);
  return {
    data: updated,
    diamondsGained: gemsFound,
    itemsCollected,
    itemsSkipped,
  };
}

export async function useItem(
  data: GameData,
  item: keyof GameData['items'],
): Promise<GameData | null> {
  if (data.items[item] <= 0) return null;
  const effects = await getSelectedCharacterEffects();
  if (shouldPreserveItem(effects)) {
    return data;
  }
  const updated = {
    ...data,
    items: {...data.items, [item]: data.items[item] - 1},
  };
  await save('gameData', updated);
  return updated;
}

export async function refillHearts(data: GameData): Promise<GameData> {
  const isInfiniteHearts = await hasInfiniteHeartsAccess();
  const effects = await getSelectedCharacterEffects();
  const maxHearts = getConfiguredMaxHearts(
    getDynamicHeartCap(MAX_HEARTS, effects),
    isInfiniteHearts,
  );
  const updated = {...data, hearts: maxHearts, lastHeartTime: Date.now()};
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
  try {
    const userId = await getCurrentUserId();
    const profile = await loadOwnProfile();
    if (profile?.nickname) {
      if (userId) {
        await saveNicknameCache(userId, profile.nickname);
      }
      return profile.nickname;
    }

    if (userId) {
      const cachedNickname = await loadNicknameCache(userId);
      if (cachedNickname) {
        return cachedNickname;
      }
    }
  } catch {}

  return t('common.player');
}

export async function setNickname(name: string): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const updated = await updateOwnProfile({nickname: name});
    if (updated) {
      if (userId) {
        await saveNicknameCache(userId, name);
      }
      return;
    }
  } catch {}
}

// Diamond operations
export async function addDiamonds(data: GameData, amount: number): Promise<GameData> {
  const updated = {...data, diamonds: data.diamonds + amount};
  await save('gameData', updated);
  return updated;
}

export async function useDiamonds(data: GameData, amount: number): Promise<GameData | null> {
  if (data.diamonds < amount) return null;
  const updated = {...data, diamonds: data.diamonds - amount};
  await save('gameData', updated);
  return updated;
}

// Skin data
export interface SkinData {
  unlockedSkins: number[];
  activeSkinId: number;
  summonProgress: Record<number, SummonProgressData>;
}

const defaultSkinData: SkinData = {
  unlockedSkins: [0],
  activeSkinId: 0,
  summonProgress: createDefaultSummonProgressMap(),
};

export async function loadSkinData(): Promise<SkinData> {
  const data = await load<SkinData>('skinData', defaultSkinData);
  const unlockedSkins = Array.isArray(data.unlockedSkins) && data.unlockedSkins.length > 0
    ? Array.from(new Set(data.unlockedSkins)).sort((a, b) => a - b)
    : [0];

  const activeSkinId = unlockedSkins.includes(data.activeSkinId) ? data.activeSkinId : 0;
  const summonProgress = ensureSummonProgressMap(data.summonProgress);

  if (
    activeSkinId !== data.activeSkinId ||
    unlockedSkins.length !== data.unlockedSkins.length ||
    !data.summonProgress
  ) {
    const migrated = {
      ...data,
      unlockedSkins,
      activeSkinId,
      summonProgress,
    };
    await save('skinData', migrated);
    return migrated;
  }

  return {
    ...data,
    unlockedSkins,
    activeSkinId,
    summonProgress,
  };
}

export async function saveSkinData(data: SkinData): Promise<void> {
  await save('skinData', data);
}

export async function unlockSkin(skinId: number): Promise<SkinData> {
  const data = await loadSkinData();
  if (!data.unlockedSkins.includes(skinId)) {
    data.unlockedSkins.push(skinId);
    data.unlockedSkins.sort((a, b) => a - b);
    await save('skinData', data);
  }
  return data;
}

export async function setActiveSkinId(skinId: number): Promise<SkinData> {
  const data = await loadSkinData();
  data.activeSkinId = skinId;
  await save('skinData', data);
  return data;
}

export async function gainSummonExp(
  skinId: number,
  expAmount: number,
): Promise<SkinData> {
  if (skinId <= 0 || expAmount <= 0) {
    return loadSkinData();
  }

  const data = await loadSkinData();
  const current = data.summonProgress[skinId] ?? {
    level: 1,
    exp: 0,
    evolutionTier: 1,
  };
  data.summonProgress = {
    ...data.summonProgress,
    [skinId]: applySummonExp(current, expAmount),
  };
  await save('skinData', data);
  return data;
}

// Codex data (local cache)
export interface CodexEntry {
  defeatCount: number;
  bestDamage: number;
  fastestClearMs: number | null;
  firstDefeatedAt: string | null;
}

export interface CodexData {
  [bossStage: number]: CodexEntry;
}

export async function loadCodexData(): Promise<CodexData> {
  return load<CodexData>('codexData', {});
}

export async function saveCodexData(data: CodexData): Promise<void> {
  await save('codexData', data);
}

export async function updateLocalCodex(
  bossStage: number,
  damage: number,
  clearTimeMs?: number,
): Promise<CodexData> {
  const data = await loadCodexData();
  const existing = data[bossStage];
  if (existing) {
    data[bossStage] = {
      defeatCount: existing.defeatCount + 1,
      bestDamage: Math.max(existing.bestDamage, damage),
      fastestClearMs: clearTimeMs
        ? (existing.fastestClearMs ? Math.min(existing.fastestClearMs, clearTimeMs) : clearTimeMs)
        : existing.fastestClearMs,
      firstDefeatedAt: existing.firstDefeatedAt,
    };
  } else {
    data[bossStage] = {
      defeatCount: 1,
      bestDamage: damage,
      fastestClearMs: clearTimeMs || null,
      firstDefeatedAt: new Date().toISOString(),
    };
  }
  await save('codexData', data);
  return data;
}

// Titles data (local)
export async function loadUnlockedTitles(): Promise<string[]> {
  return load<string[]>('unlockedTitles', []);
}

export async function saveUnlockedTitles(titles: string[]): Promise<void> {
  await save('unlockedTitles', titles);
}

export async function loadActiveTitle(): Promise<string | null> {
  try {
    const profile = await loadOwnProfile();
    if (profile && 'title' in profile) {
      return (profile as {title?: string | null}).title ?? null;
    }
  } catch {}

  return load<string | null>('activeTitle', null);
}

export async function saveActiveTitle(title: string | null): Promise<void> {
  await save('activeTitle', title);

  try {
    await updateOwnProfile({title});
  } catch {}
}

// Get highest cleared level for raid damage bonus
export async function getHighestLevelCleared(): Promise<number> {
  const progress = await loadLevelProgress();
  let highest = 0;
  for (const key of Object.keys(progress)) {
    const id = Number(key);
    if (progress[id]?.cleared && id > highest) {
      highest = id;
    }
  }
  return highest;
}

// Heart timer remaining
export function getHeartTimerRemaining(data: GameData): number {
  if (data.hearts >= INFINITE_HEARTS_VALUE) return 0;
  if (data.hearts >= MAX_HEARTS) return 0;
  const elapsed = Date.now() - data.lastHeartTime;
  return Math.max(0, HEART_REGEN_MS - (elapsed % HEART_REGEN_MS));
}

// Character selection
export async function getSelectedCharacter(): Promise<string | null> {
  return load<string | null>('selectedCharacter', null);
}

export async function setSelectedCharacter(characterId: string): Promise<void> {
  await save('selectedCharacter', characterId);
}

// ─── Character progression system ────────────────────────────
// Each character has its own level, XP, and skill tree state.
// personalAllocations[i] = points spent on personal skill i (0-9)
// partyAllocations[i]    = points spent on party skill i (0-9)
export interface CharacterData {
  characterId: string;
  level: number;
  xp: number;
  skillPoints: number;           // unspent skill points
  personalAllocations: number[]; // [5, 5, 3, 0, ...] length 10
  partyAllocations: number[];    // length 10
}

function defaultCharacterData(characterId: string): CharacterData {
  return {
    characterId,
    level: 1,
    xp: 0,
    skillPoints: 0,
    personalAllocations: Array(10).fill(0),
    partyAllocations: Array(10).fill(0),
  };
}

export async function loadCharacterData(characterId: string): Promise<CharacterData> {
  const key = `charData_${characterId}`;
  const data = await load<CharacterData>(key, defaultCharacterData(characterId));
  // Ensure arrays have correct length (migration safety)
  if (!data.personalAllocations || data.personalAllocations.length < 10) {
    data.personalAllocations = Array(10).fill(0);
  }
  if (!data.partyAllocations || data.partyAllocations.length < 10) {
    data.partyAllocations = Array(10).fill(0);
  }
  return data;
}

export async function saveCharacterData(data: CharacterData): Promise<void> {
  await save(`charData_${data.characterId}`, data);
}

// Add XP to a character. Returns updated data (handles multi-level-ups).
export async function addCharacterXP(
  data: CharacterData,
  xpAmount: number,
): Promise<CharacterData> {
  let d = {...data, xp: data.xp + xpAmount, personalAllocations: [...data.personalAllocations], partyAllocations: [...data.partyAllocations]};
  // Level up loop
  let required = xpToNextLevel(d.level);
  while (d.xp >= required) {
    d.xp -= required;
    d.level += 1;
    d.skillPoints += 2; // 2 skill points per level
    required = xpToNextLevel(d.level);
  }
  await saveCharacterData(d);
  return d;
}

// Allocate 1 skill point to a skill (category: 'personal' | 'party', index: 0-9)
export async function allocateSkillPoint(
  data: CharacterData,
  category: 'personal' | 'party',
  skillIndex: number,
): Promise<CharacterData | null> {
  if (data.skillPoints <= 0) return null;
  const alloc = category === 'personal' ? [...data.personalAllocations] : [...data.partyAllocations];
  // Unlock check: first skill always available; others require previous skill ≥ 5
  if (skillIndex > 0 && (alloc[skillIndex - 1] ?? 0) < 5) return null;
  // Max 5 points per skill
  if ((alloc[skillIndex] ?? 0) >= 5) return null;
  alloc[skillIndex] = (alloc[skillIndex] ?? 0) + 1;
  const updated: CharacterData = {
    ...data,
    skillPoints: data.skillPoints - 1,
    personalAllocations: category === 'personal' ? alloc : [...data.personalAllocations],
    partyAllocations: category === 'party' ? alloc : [...data.partyAllocations],
  };
  await saveCharacterData(updated);
  return updated;
}

// ─── Normal Raid progress (kill counts + first clear) ─────────
export interface NormalRaidProgress {
  [stage: number]: {
    firstCleared: boolean;
    killCount: number;
    firstClearDiaClaimed: boolean;
  };
}

export async function loadNormalRaidProgress(): Promise<NormalRaidProgress> {
  return load<NormalRaidProgress>('normalRaidProgress', {});
}

export async function saveNormalRaidProgress(data: NormalRaidProgress): Promise<void> {
  await save('normalRaidProgress', data);
}

export async function recordNormalRaidKill(
  progress: NormalRaidProgress,
  stage: number,
): Promise<NormalRaidProgress> {
  const existing = progress[stage] ?? {firstCleared: false, killCount: 0, firstClearDiaClaimed: false};
  const updated: NormalRaidProgress = {
    ...progress,
    [stage]: {
      firstCleared: true,
      killCount: existing.killCount + 1,
      firstClearDiaClaimed: existing.firstClearDiaClaimed,
    },
  };
  await save('normalRaidProgress', updated);
  return updated;
}

export async function claimFirstClearDia(
  progress: NormalRaidProgress,
  stage: number,
): Promise<NormalRaidProgress> {
  const existing = progress[stage] ?? {firstCleared: false, killCount: 0, firstClearDiaClaimed: false};
  const updated = {
    ...progress,
    [stage]: {...existing, firstClearDiaClaimed: true},
  };
  await save('normalRaidProgress', updated);
  return updated;
}

// Skin earned by 10 normal raid kills on a specific stage
export function hasSkinFromRaid(progress: NormalRaidProgress, stage: number): boolean {
  return (progress[stage]?.killCount ?? 0) >= 10;
}
