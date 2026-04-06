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

type PlayerStatePatch = Partial<Omit<PlayerStateRow, 'user_id'>>;

const PLAYER_STATE_FLUSH_DEBOUNCE_MS = 450;

let cachedUserId: string | null = null;
let cachedPlayerState: PlayerStateRow | null = null;
let playerStatePromise: Promise<PlayerStateRow | null> | null = null;
let preloadPromise: Promise<PlayerStateRow | null> | null = null;
let dirtyPlayerStatePatch: PlayerStatePatch | null = null;
let flushPromise: Promise<PlayerStateRow | null> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

let cachedProfileUserId: string | null = null;
let cachedOwnProfile: Record<string, any> | null = null;
let ownProfilePromise: Promise<Record<string, any> | null> | null = null;

function cloneValue<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function clonePatch(
  patch: PlayerStatePatch,
): PlayerStatePatch {
  return cloneValue(patch);
}

function clearProfileCache() {
  cachedProfileUserId = null;
  cachedOwnProfile = null;
  ownProfilePromise = null;
}

function clearFlushTimer() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

function mergePatches(
  current: PlayerStatePatch | null,
  patch: PlayerStatePatch,
): PlayerStatePatch {
  return {
    ...(current ?? {}),
    ...clonePatch(patch),
  };
}

function mergeCachedPlayerState(
  userId: string,
  patch: PlayerStatePatch,
) {
  const baseState =
    cachedPlayerState ?? ({user_id: userId} as PlayerStateRow);

  cachedPlayerState = {
    ...baseState,
    ...clonePatch(patch),
    user_id: userId,
  };
}

async function persistPlayerStatePatch(
  patch: PlayerStatePatch,
): Promise<PlayerStateRow | null> {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return null;
  }

  const nextPatch = clonePatch(patch);
  const {error} = await supabase
    .from('player_state')
    .upsert(
      {
        user_id: userId,
        ...nextPatch,
      },
      {onConflict: 'user_id'},
    );

  if (error) {
    throw error;
  }

  mergeCachedPlayerState(userId, nextPatch);
  return cachedPlayerState;
}

function scheduleFlushTimer(reason: string, delayMs = PLAYER_STATE_FLUSH_DEBOUNCE_MS) {
  clearFlushTimer();
  flushTimer = setTimeout(() => {
    void flushPlayerStateNow(reason);
  }, delayMs);
}

export function clearPlayerStateCache() {
  cachedUserId = null;
  cachedPlayerState = null;
  playerStatePromise = null;
  preloadPromise = null;
  dirtyPlayerStatePatch = null;
  flushPromise = null;
  clearFlushTimer();
  clearProfileCache();
}

export function peekPlayerStateCache() {
  return cachedPlayerState;
}

export function mergePlayerStateCache(
  patch: Partial<Omit<PlayerStateRow, 'user_id'>>,
) {
  if (!cachedPlayerState || !cachedUserId) {
    return;
  }

  mergeCachedPlayerState(cachedUserId, patch);
}

export function stagePlayerStatePatch(
  patch: Partial<Omit<PlayerStateRow, 'user_id'>>,
) {
  if (cachedUserId) {
    mergeCachedPlayerState(cachedUserId, patch);
  }

  dirtyPlayerStatePatch = mergePatches(dirtyPlayerStatePatch, patch);
}

export function schedulePlayerStateFlush(
  reason = 'scheduled',
  delayMs = PLAYER_STATE_FLUSH_DEBOUNCE_MS,
) {
  if (!dirtyPlayerStatePatch) {
    return;
  }

  if (delayMs <= 0) {
    void flushPlayerStateNow(reason);
    return;
  }

  scheduleFlushTimer(reason, delayMs);
}

export async function flushPlayerStateNow(
  reason = 'manual',
): Promise<PlayerStateRow | null> {
  clearFlushTimer();

  if (!dirtyPlayerStatePatch) {
    return cachedPlayerState;
  }

  if (flushPromise) {
    return flushPromise;
  }

  const patchToFlush = clonePatch(dirtyPlayerStatePatch);
  dirtyPlayerStatePatch = null;

  flushPromise = (async () => {
    try {
      return await persistPlayerStatePatch(patchToFlush);
    } catch (error) {
      dirtyPlayerStatePatch = mergePatches(dirtyPlayerStatePatch, patchToFlush);
      throw error;
    } finally {
      flushPromise = null;
      if (dirtyPlayerStatePatch) {
        scheduleFlushTimer(reason);
      }
    }
  })();

  return flushPromise;
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

export async function preloadPlayerState(force = false) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return null;
  }

  if (!force && cachedPlayerState && cachedUserId === userId) {
    return cachedPlayerState;
  }

  if (!force && preloadPromise && cachedUserId === userId) {
    return preloadPromise;
  }

  preloadPromise = fetchPlayerState(force);

  try {
    return await preloadPromise;
  } finally {
    preloadPromise = null;
  }
}

export async function upsertPlayerState(
  patch: Partial<Omit<PlayerStateRow, 'user_id'>>,
): Promise<PlayerStateRow | null> {
  return persistPlayerStatePatch(patch);
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

  cachedProfileUserId = userId;
  cachedOwnProfile = (data ?? null) as Record<string, any> | null;
  return data;
}

export async function loadOwnProfile(force = false) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return null;
  }

  if (!force && cachedOwnProfile && cachedProfileUserId === userId) {
    return cachedOwnProfile;
  }

  if (!force && ownProfilePromise && cachedProfileUserId === userId) {
    return ownProfilePromise;
  }

  cachedProfileUserId = userId;
  ownProfilePromise = (async () => {
    const {data, error} = await getProfile(userId);
    if (error) {
      throw error;
    }

    cachedOwnProfile = (data ?? null) as Record<string, any> | null;
    return cachedOwnProfile;
  })();

  try {
    return await ownProfilePromise;
  } finally {
    ownProfilePromise = null;
  }
}

supabase.auth.onAuthStateChange(() => {
  clearPlayerStateCache();
});
