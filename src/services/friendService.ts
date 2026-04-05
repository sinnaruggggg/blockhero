import {supabase} from './supabase';

// Search players by nickname
export async function searchPlayers(query: string, excludePlayerId: string) {
  return supabase
    .from('profiles')
    .select('id, nickname')
    .ilike('nickname', `%${query}%`)
    .neq('id', excludePlayerId)
    .limit(20);
}

// Send friend request
export async function sendFriendRequest(requesterId: string, targetId: string) {
  return supabase.from('friends').insert({
    requester_id: requesterId,
    target_id: targetId,
    status: 'pending',
  });
}

// Accept friend request
export async function acceptFriendRequest(friendshipId: string) {
  return supabase
    .from('friends')
    .update({status: 'accepted', updated_at: new Date().toISOString()})
    .eq('id', friendshipId);
}

// Reject friend request (delete)
export async function rejectFriendRequest(friendshipId: string) {
  return supabase.from('friends').delete().eq('id', friendshipId);
}

// Get friend list (accepted)
export async function getFriendList(playerId: string) {
  // Get all accepted friendships where I'm involved
  const {data: asRequester} = await supabase
    .from('friends')
    .select('id, target_id, created_at')
    .eq('requester_id', playerId)
    .eq('status', 'accepted');

  const {data: asTarget} = await supabase
    .from('friends')
    .select('id, requester_id, created_at')
    .eq('target_id', playerId)
    .eq('status', 'accepted');

  // Collect friend IDs
  const friendIds: string[] = [];
  const friendshipMap: Record<string, string> = {}; // friendId -> friendshipId

  if (asRequester) {
    for (const f of asRequester) {
      friendIds.push(f.target_id);
      friendshipMap[f.target_id] = f.id;
    }
  }
  if (asTarget) {
    for (const f of asTarget) {
      friendIds.push(f.requester_id);
      friendshipMap[f.requester_id] = f.id;
    }
  }

  if (friendIds.length === 0) return {data: [], friendshipMap};

  // Get profiles
  const {data: profiles} = await supabase
    .from('profiles')
    .select('id, nickname')
    .in('id', friendIds);

  // Get presence
  const {data: presence} = await supabase
    .from('user_presence')
    .select('player_id, is_online, last_seen')
    .in('player_id', friendIds);

  const presenceMap: Record<string, {isOnline: boolean; lastSeen: string}> = {};
  if (presence) {
    for (const p of presence) {
      presenceMap[p.player_id] = {isOnline: p.is_online, lastSeen: p.last_seen};
    }
  }

  const friends = (profiles || []).map(p => ({
    id: p.id,
    nickname: p.nickname,
    friendshipId: friendshipMap[p.id],
    isOnline: presenceMap[p.id]?.isOnline || false,
    lastSeen: presenceMap[p.id]?.lastSeen || '',
  }));

  return {data: friends, friendshipMap};
}

// Get pending friend requests (incoming)
export async function getPendingRequests(playerId: string) {
  const {data} = await supabase
    .from('friends')
    .select('id, requester_id, created_at')
    .eq('target_id', playerId)
    .eq('status', 'pending');

  if (!data || data.length === 0) return {data: []};

  const requesterIds = data.map(d => d.requester_id);
  const {data: profiles} = await supabase
    .from('profiles')
    .select('id, nickname')
    .in('id', requesterIds);

  const profileMap: Record<string, string> = {};
  if (profiles) {
    for (const p of profiles) {
      profileMap[p.id] = p.nickname;
    }
  }

  const requests = data.map(d => ({
    friendshipId: d.id,
    requesterId: d.requester_id,
    nickname: profileMap[d.requester_id] || 'Unknown',
    createdAt: d.created_at,
  }));

  return {data: requests};
}

// Remove friend
export async function removeFriend(friendshipId: string) {
  return supabase.from('friends').delete().eq('id', friendshipId);
}

// Update user presence
export async function updatePresence(playerId: string, isOnline: boolean) {
  return supabase
    .from('user_presence')
    .upsert(
      {
        player_id: playerId,
        last_seen: new Date().toISOString(),
        is_online: isOnline,
      },
      {onConflict: 'player_id'},
    );
}

// Get friend IDs (for filtering active raids)
export async function getFriendIds(playerId: string): Promise<string[]> {
  const {data: asRequester} = await supabase
    .from('friends')
    .select('target_id')
    .eq('requester_id', playerId)
    .eq('status', 'accepted');

  const {data: asTarget} = await supabase
    .from('friends')
    .select('requester_id')
    .eq('target_id', playerId)
    .eq('status', 'accepted');

  const ids: string[] = [];
  if (asRequester) ids.push(...asRequester.map(r => r.target_id));
  if (asTarget) ids.push(...asTarget.map(r => r.requester_id));
  return ids;
}
