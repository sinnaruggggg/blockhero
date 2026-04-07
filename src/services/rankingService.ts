import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from './supabase';

export type RankingMode = 'level' | 'endless' | 'battle' | 'raid';
export type RankingPeriod = 'daily' | 'weekly' | 'monthly';

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  nickname: string;
  score: number;
  metadata: Record<string, any>;
  matches: number;
  wins: number;
  losses: number;
  rematch_wins: number;
  best_streak: number;
}

type BattlePeriodState = {
  key: string;
  currentStreak: number;
  bestStreak: number;
};

type BattleStreakState = Record<RankingPeriod, BattlePeriodState>;

const BATTLE_STREAK_STORAGE_KEY = 'battle_ranking_streak_v1';
const DEFAULT_BATTLE_PERIOD_STATE: BattlePeriodState = {
  key: '',
  currentStreak: 0,
  bestStreak: 0,
};

export function calculateLevelRankingScore({
  levelId,
  stars,
  totalDamage,
  maxCombo,
}: {
  levelId: number;
  stars: number;
  totalDamage: number;
  maxCombo: number;
}) {
  return Math.round(
    3000 +
      levelId * 100 +
      stars * 500 +
      Math.min(totalDamage, 200000) * 0.05 +
      maxCombo * 120,
  );
}

export function calculateRaidRankingScore({
  bossStage,
  totalDamage,
  rank,
  bossDefeated,
  clearTimeMs = 0,
}: {
  bossStage: number;
  totalDamage: number;
  rank: number;
  bossDefeated: boolean;
  clearTimeMs?: number;
}) {
  const rankBonus = rank === 1 ? 1200 : rank === 2 ? 700 : rank === 3 ? 400 : 150;
  const timeBonus = bossDefeated ? Math.max(0, 1200 - Math.floor(clearTimeMs / 1000)) : 0;
  return Math.round(
    bossStage * 1000 +
      Math.min(totalDamage, 5_000_000) * 0.02 +
      rankBonus +
      (bossDefeated ? 2500 : 0) +
      timeBonus,
  );
}

export function calculateBattleRankingScore({
  wins,
  losses,
  rematchWins,
  bestStreak,
}: {
  wins: number;
  losses: number;
  rematchWins: number;
  bestStreak: number;
}) {
  return wins * 30 + rematchWins * 5 + bestStreak * 8 - losses * 10;
}

function getKstDateParts() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const year = Number(lookup.year);
  const month = Number(lookup.month);
  const day = Number(lookup.day);
  return {year, month, day};
}

function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

function getBattlePeriodKeys(): Record<RankingPeriod, string> {
  const {year, month, day} = getKstDateParts();
  const localDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = localDate.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(localDate);
  monday.setUTCDate(localDate.getUTCDate() + mondayOffset);

  return {
    daily: `${year}-${padNumber(month)}-${padNumber(day)}`,
    weekly: `${monday.getUTCFullYear()}-${padNumber(monday.getUTCMonth() + 1)}-${padNumber(
      monday.getUTCDate(),
    )}`,
    monthly: `${year}-${padNumber(month)}`,
  };
}

async function loadBattleStreakState(): Promise<BattleStreakState> {
  try {
    const raw = await AsyncStorage.getItem(BATTLE_STREAK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BattleStreakState>;
      return {
        daily: parsed.daily ?? {...DEFAULT_BATTLE_PERIOD_STATE},
        weekly: parsed.weekly ?? {...DEFAULT_BATTLE_PERIOD_STATE},
        monthly: parsed.monthly ?? {...DEFAULT_BATTLE_PERIOD_STATE},
      };
    }
  } catch {}

  return {
    daily: {...DEFAULT_BATTLE_PERIOD_STATE},
    weekly: {...DEFAULT_BATTLE_PERIOD_STATE},
    monthly: {...DEFAULT_BATTLE_PERIOD_STATE},
  };
}

async function saveBattleStreakState(state: BattleStreakState) {
  try {
    await AsyncStorage.setItem(BATTLE_STREAK_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

async function getBattleStreakSnapshot(won: boolean) {
  const periodKeys = getBattlePeriodKeys();
  const state = await loadBattleStreakState();

  (Object.keys(periodKeys) as RankingPeriod[]).forEach(period => {
    if (state[period].key !== periodKeys[period]) {
      state[period] = {
        key: periodKeys[period],
        currentStreak: 0,
        bestStreak: 0,
      };
    }

    if (won) {
      state[period].currentStreak += 1;
      state[period].bestStreak = Math.max(
        state[period].bestStreak,
        state[period].currentStreak,
      );
    } else {
      state[period].currentStreak = 0;
    }
  });

  await saveBattleStreakState(state);
  return {
    dailyCurrentStreak: state.daily.currentStreak,
    dailyBestStreak: state.daily.bestStreak,
    weeklyCurrentStreak: state.weekly.currentStreak,
    weeklyBestStreak: state.weekly.bestStreak,
    monthlyCurrentStreak: state.monthly.currentStreak,
    monthlyBestStreak: state.monthly.bestStreak,
  };
}

function normalizeLeaderboardRows(rows: any[] | null | undefined): LeaderboardEntry[] {
  return (rows ?? []).map(row => ({
    rank: Number(row.rank ?? 0),
    user_id: row.user_id,
    nickname: row.nickname ?? 'Player',
    score: Number(row.score ?? 0),
    metadata: row.metadata ?? {},
    matches: Number(row.matches ?? 0),
    wins: Number(row.wins ?? 0),
    losses: Number(row.losses ?? 0),
    rematch_wins: Number(row.rematch_wins ?? 0),
    best_streak: Number(row.best_streak ?? 0),
  }));
}

export async function fetchLeaderboard(
  mode: RankingMode,
  period: RankingPeriod,
  limit = 100,
) {
  const {data, error} = await supabase.rpc('bh_get_leaderboard', {
    p_mode: mode,
    p_period: period,
    p_limit_count: Math.max(1, Math.min(limit, 100)),
  });

  if (error) {
    throw error;
  }

  return normalizeLeaderboardRows(data);
}

export async function fetchMyLeaderboardEntry(
  mode: RankingMode,
  period: RankingPeriod,
) {
  const {data, error} = await supabase.rpc('bh_get_my_leaderboard', {
    p_mode: mode,
    p_period: period,
  });

  if (error) {
    throw error;
  }

  return normalizeLeaderboardRows(data)[0] ?? null;
}

export async function submitLevelLeaderboard(params: {
  levelId: number;
  stars: number;
  totalDamage: number;
  maxCombo: number;
  clearTimeMs: number;
}) {
  try {
    await supabase.rpc('bh_submit_level_leaderboard', {
      p_level_id: params.levelId,
      p_stars: params.stars,
      p_total_damage: Math.round(params.totalDamage),
      p_max_combo: params.maxCombo,
      p_clear_time_ms: Math.max(0, Math.round(params.clearTimeMs)),
    });
  } catch (error) {
    console.warn('submitLevelLeaderboard failed:', error);
  }
}

export async function submitEndlessLeaderboard(params: {
  finalScore: number;
  maxLevel: number;
  maxCombo: number;
  playTimeMs: number;
  totalLines: number;
}) {
  try {
    await supabase.rpc('bh_submit_endless_leaderboard', {
      p_final_score: Math.round(params.finalScore),
      p_max_level: params.maxLevel,
      p_max_combo: params.maxCombo,
      p_play_time_ms: Math.max(0, Math.round(params.playTimeMs)),
      p_total_lines: params.totalLines,
    });
  } catch (error) {
    console.warn('submitEndlessLeaderboard failed:', error);
  }
}

export async function submitRaidLeaderboard(params: {
  bossStage: number;
  totalDamage: number;
  rank: number;
  bossDefeated: boolean;
  clearTimeMs: number;
}) {
  try {
    await supabase.rpc('bh_submit_raid_leaderboard', {
      p_boss_stage: params.bossStage,
      p_total_damage: Math.round(params.totalDamage),
      p_rank: params.rank,
      p_boss_defeated: params.bossDefeated,
      p_clear_time_ms: Math.max(0, Math.round(params.clearTimeMs)),
    });
  } catch (error) {
    console.warn('submitRaidLeaderboard failed:', error);
  }
}

export async function submitBattleLeaderboard(params: {
  won: boolean;
  rematchWin: boolean;
}) {
  try {
    const snapshot = await getBattleStreakSnapshot(params.won);
    await supabase.rpc('bh_submit_battle_leaderboard', {
      p_won: params.won,
      p_rematch_win: params.rematchWin,
      p_daily_current_streak: snapshot.dailyCurrentStreak,
      p_daily_best_streak: snapshot.dailyBestStreak,
      p_weekly_current_streak: snapshot.weeklyCurrentStreak,
      p_weekly_best_streak: snapshot.weeklyBestStreak,
      p_monthly_current_streak: snapshot.monthlyCurrentStreak,
      p_monthly_best_streak: snapshot.monthlyBestStreak,
    });
  } catch (error) {
    console.warn('submitBattleLeaderboard failed:', error);
  }
}
