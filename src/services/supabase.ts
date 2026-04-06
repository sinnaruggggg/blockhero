import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://alhlmdhixmlmsdvgzhdu.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaGxtZGhpeG1sbXNkdmd6aGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTY4NTQsImV4cCI6MjA4ODYzMjg1NH0.lkTNn1jeXzkQdCRnmtNAjejezJN_RfC1n5HEhCbV_n8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

let cachedSessionUserId: string | null | undefined = undefined;

supabase.auth.onAuthStateChange((_event, session) => {
  cachedSessionUserId = session?.user?.id ?? null;
});

// Get current user ID
export async function getCurrentUserId(): Promise<string | null> {
  if (cachedSessionUserId !== undefined) {
    return cachedSessionUserId;
  }

  const {
    data: {session},
  } = await supabase.auth.getSession();
  cachedSessionUserId = session?.user?.id ?? null;
  return cachedSessionUserId;
}

// Get profile
export async function getProfile(userId: string) {
  return supabase.from('profiles').select('*').eq('id', userId).single();
}

// Update profile nickname
export async function updateNickname(userId: string, nickname: string) {
  return supabase.from('profiles').update({nickname}).eq('id', userId);
}

// Room code generation (exclude confusing chars)
const CHARS = 'ABCDEFGHJKMNPQRTUVWXYZ0123456789';
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

// Create a room
export async function createRoom(roomCode: string, seed?: number) {
  return supabase.from('rooms').insert({code: roomCode, status: 'waiting', seed: seed ?? null});
}

// Join a room
export async function joinRoom(roomCode: string, playerId: string, nickname: string) {
  return supabase.from('players').insert({
    room_code: roomCode,
    player_id: playerId,
    nickname,
    board: null,
    game_over: false,
  });
}

// Enter matching queue
export async function enterMatchingQueue(playerId: string, nickname: string) {
  return supabase.from('matching_queue').insert({
    player_id: playerId,
    nickname,
    status: 'waiting',
    room_code: null,
  });
}

// Leave matching queue
export async function leaveMatchingQueue(playerId: string) {
  return supabase.from('matching_queue').delete().eq('player_id', playerId);
}

// Find waiting players
export async function findWaitingPlayers(excludePlayerId: string) {
  return supabase
    .from('matching_queue')
    .select('*')
    .eq('status', 'waiting')
    .neq('player_id', excludePlayerId)
    .limit(1);
}

// Update room status
export async function updateRoomStatus(roomCode: string, status: string) {
  return supabase.from('rooms').update({status}).eq('code', roomCode);
}

// Update matching queue status
export async function updateMatchingStatus(
  playerId: string,
  status: string,
  roomCode?: string,
) {
  const update: any = {status};
  if (roomCode) update.room_code = roomCode;
  return supabase.from('matching_queue').update(update).eq('player_id', playerId);
}

// Clean up player from matching queue
export async function cleanupMatching(playerId: string) {
  await supabase.from('matching_queue').delete().eq('player_id', playerId);
}

// Clean up stale multiplayer state before entering battle flows again
export async function cleanupBattleState(playerId: string) {
  await Promise.allSettled([
    supabase.from('matching_queue').delete().eq('player_id', playerId),
    supabase.from('players').delete().eq('player_id', playerId),
  ]);
}

// Get room channel for realtime
export function getRoomChannel(roomCode: string) {
  return supabase.channel(`game:${roomCode}`);
}

// Raid, Friend, Party services are in separate files:
// - src/services/raidService.ts
// - src/services/friendService.ts
// - src/services/partyService.ts
