import {supabase, getCurrentUserId, getProfile} from './supabase';

export interface PlayerStateRow {
  user_id: string;
  game_data: unknown;
  level_progress: unknown;
  endless_stats: unknown;
  daily_stats: unknown;
  mission_data: unknown;
  achievement_data: unknown;
  skin_data: unknown;
  selected_character_id: string | null;
  character_data: unknown;
  normal_raid_progress: unknown;
  codex_data: unknown;
  unlocked_titles: unknown;
  active_title: string | null;
  created_at?: string;
  updated_at?: string;
}

let cachedUserId: string | null = null;
let cachedPlayerState: PlayerStateRow | null = null;
let playerStatePromise: Promise<PlayerStateRow | null> | null = null;

function cloneValue<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function clearPlayerStateCache() {
  cachedUserId = null;
  cachedPlayerState = null;
  playerStatePromise = null;
}

export function mergePlayerStateCache(
  patch: Partial<Omit<PlayerStateRow, 'user_id'>>,
) {
  if (!cachedPlayerState) {
    return;
  }

  cachedPlayerState = {
    ...cachedPlayerState,
    ...cloneValue(patch),
  };
}

async function resolveCurrentUserId() {
  const userId = await getCurrentUserId();
  if (!userId) {
    clearPlayerStateCache();
    return null;
  }

  if (cachedUserId && cachedUserId !== userId) {
    clearPlayerStateCache();
  }

  cachedUserId = userId;
  return userId;
}

export async function fetchPlayerState(force = false): Promise<PlayerStateRow | null> {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return null;
  }

  if (!force && cachedPlayerState && cachedUserId === userId) {
    return cachedPlayerState;
  }

  if (!force && playerStatePromise && cachedUserId === userId) {
    return playerStatePromise;
  }

  playerStatePromise = (async () => {
    const {data, error} = await supabase
      .from('player_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    cachedPlayerState = data ?? null;
    return cachedPlayerState;
  })();

  try {
    return await playerStatePromise;
  } finally {
    playerStatePromise = null;
  }
}

export async function upsertPlayerState(
  patch: Partial<Omit<PlayerStateRow, 'user_id'>>,
): Promise<PlayerStateRow | null> {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return null;
  }

  const {data, error} = await supabase
    .from('player_state')
    .upsert(
      {
        user_id: userId,
        ...patch,
      },
      {onConflict: 'user_id'},
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  cachedPlayerState = data;
  return cachedPlayerState;
}

export async function updateOwnProfile(patch: Record<string, unknown>) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return null;
  }

  const {data, error} = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function loadOwnProfile() {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return null;
  }

  const {data, error} = await getProfile(userId);
  if (error) {
    throw error;
  }

  return data ?? null;
}

supabase.auth.onAuthStateChange(() => {
  clearPlayerStateCache();
});
