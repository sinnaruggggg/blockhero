import { supabase } from './supabase';

interface PresenceRow {
  player_id: string;
  is_online: boolean;
  last_seen: string;
}

function isMissingSessionIdColumnError(error: unknown) {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';

  return (
    message.includes('session_id') &&
    (message.includes('schema cache') || message.includes('column'))
  );
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function fetchPresenceMap(playerIds: string[]) {
  if (playerIds.length === 0) {
    return {} as Record<string, { isOnline: boolean; lastSeen: string }>;
  }

  const { data: presence } = await supabase
    .from('user_presence')
    .select('player_id, is_online, last_seen')
    .in('player_id', playerIds);

  const presenceMap: Record<string, { isOnline: boolean; lastSeen: string }> =
    {};
  (presence as PresenceRow[] | null)?.forEach(row => {
    presenceMap[row.player_id] = {
      isOnline: row.is_online,
      lastSeen: row.last_seen,
    };
  });

  return presenceMap;
}

export async function searchPlayers(query: string, excludePlayerId: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { data: [], error: null };
  }

  return supabase
    .from('profiles')
    .select('id, nickname')
    .ilike('nickname', `%${trimmed}%`)
    .neq('id', excludePlayerId)
    .limit(20);
}

export async function searchOnlinePlayers(
  query: string,
  excludePlayerId: string,
) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { data: [], error: null };
  }

  const results = new Map<
    string,
    { id: string; nickname: string; isOnline: boolean }
  >();

  const { data: nicknameMatches, error: nicknameError } = await supabase
    .from('profiles')
    .select('id, nickname')
    .ilike('nickname', `%${trimmed}%`)
    .neq('id', excludePlayerId)
    .limit(20);
  if (nicknameError) {
    return { data: null, error: nicknameError };
  }

  (nicknameMatches ?? []).forEach(profile => {
    results.set(profile.id, {
      id: profile.id,
      nickname: profile.nickname,
      isOnline: false,
    });
  });

  if (isUuidLike(trimmed) && trimmed !== excludePlayerId) {
    const { data: exactMatch, error: exactError } = await supabase
      .from('profiles')
      .select('id, nickname')
      .eq('id', trimmed)
      .maybeSingle();
    if (exactError) {
      return { data: null, error: exactError };
    }
    if (exactMatch) {
      results.set(exactMatch.id, {
        id: exactMatch.id,
        nickname: exactMatch.nickname,
        isOnline: false,
      });
    }
  }

  const presenceMap = await fetchPresenceMap(Array.from(results.keys()));
  const onlinePlayers = Array.from(results.values())
    .map(player => ({
      ...player,
      isOnline: presenceMap[player.id]?.isOnline ?? false,
    }))
    .filter(player => player.isOnline);

  return { data: onlinePlayers, error: null };
}

export async function sendFriendRequest(requesterId: string, targetId: string) {
  return supabase.from('friends').insert({
    requester_id: requesterId,
    target_id: targetId,
    status: 'pending',
  });
}

export async function acceptFriendRequest(friendshipId: string) {
  return supabase
    .from('friends')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);
}

export async function rejectFriendRequest(friendshipId: string) {
  return supabase.from('friends').delete().eq('id', friendshipId);
}

export async function getFriendList(playerId: string) {
  const { data: asRequester } = await supabase
    .from('friends')
    .select('id, target_id, created_at')
    .eq('requester_id', playerId)
    .eq('status', 'accepted');

  const { data: asTarget } = await supabase
    .from('friends')
    .select('id, requester_id, created_at')
    .eq('target_id', playerId)
    .eq('status', 'accepted');

  const friendIds: string[] = [];
  const friendshipMap: Record<string, string> = {};

  if (asRequester) {
    for (const friendship of asRequester) {
      friendIds.push(friendship.target_id);
      friendshipMap[friendship.target_id] = friendship.id;
    }
  }
  if (asTarget) {
    for (const friendship of asTarget) {
      friendIds.push(friendship.requester_id);
      friendshipMap[friendship.requester_id] = friendship.id;
    }
  }

  if (friendIds.length === 0) {
    return { data: [], friendshipMap };
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname')
    .in('id', friendIds);

  const presenceMap = await fetchPresenceMap(friendIds);

  const friends = (profiles || []).map(profile => ({
    id: profile.id,
    nickname: profile.nickname,
    friendshipId: friendshipMap[profile.id],
    isOnline: presenceMap[profile.id]?.isOnline || false,
    lastSeen: presenceMap[profile.id]?.lastSeen || '',
  }));

  return { data: friends, friendshipMap };
}

export async function getPendingRequests(playerId: string) {
  const { data } = await supabase
    .from('friends')
    .select('id, requester_id, created_at')
    .eq('target_id', playerId)
    .eq('status', 'pending');

  if (!data || data.length === 0) {
    return { data: [] };
  }

  const requesterIds = data.map(entry => entry.requester_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname')
    .in('id', requesterIds);

  const profileMap: Record<string, string> = {};
  if (profiles) {
    for (const profile of profiles) {
      profileMap[profile.id] = profile.nickname;
    }
  }

  const requests = data.map(entry => ({
    friendshipId: entry.id,
    requesterId: entry.requester_id,
    nickname: profileMap[entry.requester_id] || 'Unknown',
    createdAt: entry.created_at,
  }));

  return { data: requests };
}

export async function removeFriend(friendshipId: string) {
  return supabase.from('friends').delete().eq('id', friendshipId);
}

export async function updatePresence(
  playerId: string,
  isOnline: boolean,
  sessionId?: string | null,
) {
  const basePayload = {
    player_id: playerId,
    last_seen: new Date().toISOString(),
    is_online: isOnline,
  };

  const result = await supabase.from('user_presence').upsert(
    {
      ...basePayload,
      session_id: typeof sessionId === 'undefined' ? undefined : sessionId,
    },
    { onConflict: 'player_id' },
  );

  if (!result.error || !isMissingSessionIdColumnError(result.error)) {
    return result;
  }

  return supabase.from('user_presence').upsert(basePayload, {
    onConflict: 'player_id',
  });
}

export async function getFriendIds(playerId: string): Promise<string[]> {
  const { data: asRequester } = await supabase
    .from('friends')
    .select('target_id')
    .eq('requester_id', playerId)
    .eq('status', 'accepted');

  const { data: asTarget } = await supabase
    .from('friends')
    .select('requester_id')
    .eq('target_id', playerId)
    .eq('status', 'accepted');

  const ids: string[] = [];
  if (asRequester) {
    ids.push(...asRequester.map(row => row.target_id));
  }
  if (asTarget) {
    ids.push(...asTarget.map(row => row.requester_id));
  }
  return ids;
}
