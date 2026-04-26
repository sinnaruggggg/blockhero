import { supabase } from './supabase';
import { MAX_PARTY_SIZE } from '../constants/raidConfig';

export type RaidPartyType = 'normal' | 'boss';

export interface PartyRaidTarget {
  raidType: RaidPartyType;
  bossStage: number;
}

export interface RaidPartyListing {
  id: string;
  leaderId: string;
  leaderNickname: string;
  raidType: RaidPartyType;
  bossStage: number;
  memberCount: number;
  updatedAt?: string | null;
  createdAt?: string | null;
}

export interface PartyInviteRecord {
  id: string;
  party_id: string;
  inviter_id: string;
  inviter_nickname: string;
  invitee_id: string;
  invitee_nickname?: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  expires_at: string;
  created_at: string;
  updated_at: string;
}

const RAID_PARTY_STALE_MS = 60 * 60 * 1000;
const RAID_PARTY_LEADER_PRESENCE_MAX_AGE_MS = 3 * 60 * 1000;

function isMissingPartyTargetColumnError(error: unknown) {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';

  return (
    (message.includes('raid_type') ||
      message.includes('boss_stage') ||
      message.includes('status') ||
      message.includes('updated_at')) &&
    (message.includes('schema cache') ||
      message.includes('column') ||
      message.includes('does not exist'))
  );
}

function buildPartyTargetPayload(target?: PartyRaidTarget | null) {
  if (!target) {
    return {};
  }

  return {
    raid_type: target.raidType,
    boss_stage: target.bossStage,
    status: 'recruiting',
    updated_at: new Date().toISOString(),
  };
}

async function getMembership(playerId: string) {
  return supabase
    .from('party_members')
    .select('party_id')
    .eq('player_id', playerId)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

async function getPartyMemberCount(partyId: string) {
  return supabase
    .from('party_members')
    .select('*', { count: 'exact', head: true })
    .eq('party_id', partyId);
}

async function getPartyById(partyId: string) {
  return supabase.from('parties').select('*').eq('id', partyId).maybeSingle();
}

function isStalePartyRecord(party: any) {
  const updatedAt = Date.parse(party?.updated_at ?? party?.created_at ?? '');
  return Number.isFinite(updatedAt) && Date.now() - updatedAt > RAID_PARTY_STALE_MS;
}

function isFreshOnlinePresence(presence: any) {
  const lastSeen = Date.parse(presence?.last_seen ?? '');
  return (
    presence?.is_online === true &&
    Number.isFinite(lastSeen) &&
    Date.now() - lastSeen <= RAID_PARTY_LEADER_PRESENCE_MAX_AGE_MS
  );
}

async function cleanupInvalidParty(partyId: string) {
  // RAID_FIX: invalid raid parties must be removed instead of staying as
  // joinable ghost rooms in the recruitment list.
  const result = await disbandParty(partyId);
  if (result.error) {
    console.warn('partyService cleanupInvalidParty failed:', result.error);
  }
}

async function cleanupCreatedPartyOnFailure(partyId: string) {
  // RAID_FIX: party creation is split across parties + party_members. If the
  // member insert fails, remove the new party immediately so it cannot remain
  // as a hostless recruitment row.
  const result = await disbandParty(partyId);
  if (result.error) {
    console.warn('partyService cleanupCreatedPartyOnFailure failed:', result.error);
  }
}

function isDuplicateMembershipError(error: unknown) {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';

  return code === '23505' || message.includes('duplicate key');
}

function isMissingOptionalTableError(error: unknown, tableName: string) {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';

  return (
    message.includes(tableName) &&
    (message.includes('schema cache') ||
      message.includes('relation') ||
      message.includes('does not exist'))
  );
}

async function updateInviteStatus(
  inviteId: string,
  status: PartyInviteRecord['status'],
  filters: Record<string, string> = {},
) {
  let query = supabase
    .from('party_invites')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inviteId);

  Object.entries(filters).forEach(([column, value]) => {
    query = query.eq(column, value);
  });

  return query.select().single();
}

export async function createParty(leaderId: string, nickname: string) {
  const { data: existingMembership, error: membershipError } =
    await getMembership(leaderId);
  if (membershipError) {
    return { data: null, error: membershipError };
  }
  if (existingMembership?.party_id) {
    return { data: null, error: { message: 'already_in_party' } };
  }

  const { data: party, error: partyErr } = await supabase
    .from('parties')
    .insert({ leader_id: leaderId })
    .select()
    .single();

  if (partyErr || !party) {
    return { data: null, error: partyErr };
  }

  const { error: memberError } = await supabase.from('party_members').insert({
    party_id: party.id,
    player_id: leaderId,
    nickname,
  });
  if (memberError) {
    await cleanupCreatedPartyOnFailure(party.id);
    return { data: null, error: memberError };
  }

  return { data: party, error: null };
}

export async function createRaidParty(
  leaderId: string,
  nickname: string,
  target: PartyRaidTarget,
) {
  const { data: existingMembership, error: membershipError } =
    await getMembership(leaderId);
  if (membershipError) {
    return { data: null, error: membershipError };
  }
  if (existingMembership?.party_id) {
    return { data: null, error: { message: 'already_in_party' } };
  }

  let { data: party, error: partyErr } = await supabase
    .from('parties')
    .insert({
      leader_id: leaderId,
      ...buildPartyTargetPayload(target),
    })
    .select()
    .single();

  if (partyErr && isMissingPartyTargetColumnError(partyErr)) {
    const fallback = await supabase
      .from('parties')
      .insert({ leader_id: leaderId })
      .select()
      .single();
    party = fallback.data;
    partyErr = fallback.error;
  }

  if (partyErr || !party) {
    return { data: null, error: partyErr };
  }

  const { error: memberError } = await supabase.from('party_members').insert({
    party_id: party.id,
    player_id: leaderId,
    nickname,
  });
  if (memberError) {
    return { data: null, error: memberError };
  }

  if (!('raid_type' in party)) {
    return {
      data: {
        ...party,
        raid_type: target.raidType,
        boss_stage: target.bossStage,
      },
      error: null,
    };
  }

  return { data: party, error: null };
}

export async function updatePartyRaidTarget(
  partyId: string,
  leaderId: string,
  target: PartyRaidTarget,
) {
  const { data: party, error: partyError } = await getPartyById(partyId);
  if (partyError) {
    return { data: null, error: partyError };
  }
  if (!party) {
    return { data: null, error: { message: 'party_not_found' } };
  }
  if (party.leader_id !== leaderId) {
    return { data: null, error: { message: 'leader_only' } };
  }

  const { data, error } = await supabase
    .from('parties')
    .update(buildPartyTargetPayload(target))
    .eq('id', partyId)
    .select()
    .single();

  if (error && isMissingPartyTargetColumnError(error)) {
    return {
      data: {
        ...party,
        raid_type: target.raidType,
        boss_stage: target.bossStage,
      },
      error: null,
    };
  }

  return { data, error };
}

export async function joinParty(
  partyId: string,
  playerId: string,
  nickname: string,
) {
  const { data: existingMembership, error: membershipError } =
    await getMembership(playerId);
  if (membershipError) {
    return { data: null, error: membershipError };
  }

  if (existingMembership?.party_id === partyId) {
    const { data: existingRow } = await supabase
      .from('party_members')
      .select('*')
      .eq('party_id', partyId)
      .eq('player_id', playerId)
      .maybeSingle();
    return { data: existingRow, error: null };
  }

  if (existingMembership?.party_id) {
    return { data: null, error: { message: 'already_in_party' } };
  }

  const { data: party, error: partyError } = await getPartyById(partyId);
  if (partyError) {
    return { data: null, error: partyError };
  }
  if (!party) {
    return { data: null, error: { message: 'party_not_found' } };
  }

  if (party.status && party.status !== 'recruiting') {
    return { data: null, error: { message: 'party_not_found' } };
  }

  const { data: leaderMember, error: leaderMemberError } = await supabase
    .from('party_members')
    .select('player_id')
    .eq('party_id', partyId)
    .eq('player_id', party.leader_id)
    .maybeSingle();
  if (leaderMemberError) {
    return { data: null, error: leaderMemberError };
  }
  if (!leaderMember || isStalePartyRecord(party)) {
    await cleanupInvalidParty(partyId);
    return { data: null, error: { message: 'party_not_found' } };
  }

  const { count, error: countError } = await getPartyMemberCount(partyId);
  if (countError) {
    return { data: null, error: countError };
  }
  if (count !== null && count >= MAX_PARTY_SIZE) {
    return { data: null, error: { message: 'party_full' } };
  }

  const { data: latestMembership, error: latestMembershipError } =
    await getMembership(playerId);
  if (latestMembershipError) {
    return { data: null, error: latestMembershipError };
  }
  if (latestMembership?.party_id && latestMembership.party_id !== partyId) {
    // RAID_FIX: reduce race windows before insert; the DB unique index in the
    // runtime SQL is the final guard for "one player, one raid party".
    return { data: null, error: { message: 'already_in_party' } };
  }

  const result = await supabase
    .from('party_members')
    .insert({
      party_id: partyId,
      player_id: playerId,
      nickname,
    })
    .select()
    .single();

  if (result.error && isDuplicateMembershipError(result.error)) {
    return { data: null, error: { message: 'already_in_party' } };
  }

  return result;
}

export async function leaveParty(partyId: string, playerId: string) {
  return supabase
    .from('party_members')
    .delete()
    .eq('party_id', partyId)
    .eq('player_id', playerId);
}

export async function disbandParty(partyId: string) {
  // RAID_FIX: a disbanded raid party must disappear from recruitment and stop
  // leaving an active party raid room behind.
  const closeResult = await supabase
    .from('raid_instances')
    .update({ status: 'closed' })
    .eq('party_id', partyId)
    .in('status', ['active', 'battle', 'waiting', 'ready']);
  if (closeResult.error) {
    return { data: null, error: closeResult.error };
  }

  const inviteResult = await supabase
    .from('party_invites')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('party_id', partyId)
    .eq('status', 'pending');
  if (
    inviteResult.error &&
    !isMissingOptionalTableError(inviteResult.error, 'party_invites')
  ) {
    return { data: null, error: inviteResult.error };
  }

  return supabase.from('parties').delete().eq('id', partyId);
}

export async function leaveOrDisbandParty(partyId: string, playerId: string) {
  const { data: party, error } = await getPartyById(partyId);
  if (error) {
    return { data: null, error };
  }
  if (!party) {
    return { data: null, error: null };
  }

  if (party.leader_id === playerId) {
    return disbandParty(partyId);
  }

  return leaveParty(partyId, playerId);
}

export async function getMyParty(playerId: string) {
  const { data: membership, error: membershipError } = await getMembership(
    playerId,
  );

  if (membershipError || !membership) {
    return { data: null, error: membershipError ?? null };
  }

  const { data: party, error: partyError } = await supabase
    .from('parties')
    .select('*')
    .eq('id', membership.party_id)
    .maybeSingle();

  if (partyError) {
    return { data: null, error: partyError };
  }

  if (!party) {
    // RAID_FIX: if a party row was deleted without cascade on an older DB,
    // drop the orphan member row so this user is not stuck in a phantom party.
    await leaveParty(membership.party_id, playerId);
    return { data: null, error: null };
  }

  return { data: party, error: null };
}

export async function getPartyMembers(partyId: string) {
  return supabase
    .from('party_members')
    .select('*')
    .eq('party_id', partyId)
    .order('joined_at', { ascending: true });
}

export async function listOpenPartiesForRaid(
  target: PartyRaidTarget,
  excludePlayerId?: string,
) {
  const { data: parties, error } = await supabase
    .from('parties')
    .select(
      'id, leader_id, raid_type, boss_stage, status, created_at, updated_at',
    )
    .eq('raid_type', target.raidType)
    .eq('boss_stage', target.bossStage)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    if (isMissingPartyTargetColumnError(error)) {
      return { data: [] as RaidPartyListing[], error: null };
    }
    return { data: [] as RaidPartyListing[], error };
  }

  const listings: RaidPartyListing[] = [];
  const presenceResult =
    parties && parties.length > 0
      ? await supabase
          .from('user_presence')
          .select('player_id, is_online, last_seen')
          .in(
            'player_id',
            Array.from(new Set(parties.map((party: any) => party.leader_id))),
          )
      : { data: [], error: null };
  const presenceMap = new Map<string, any>();
  (presenceResult.data ?? []).forEach((row: any) => {
    presenceMap.set(row.player_id, row);
  });

  for (const party of parties ?? []) {
    if (party.status && party.status !== 'recruiting') {
      continue;
    }
    if (isStalePartyRecord(party)) {
      await cleanupInvalidParty(party.id);
      continue;
    }

    const { data: members, error: memberError } = await getPartyMembers(
      party.id,
    );
    if (memberError) {
      return { data: [] as RaidPartyListing[], error: memberError };
    }

    const memberRows = members ?? [];
    if (memberRows.length === 0) {
      await cleanupInvalidParty(party.id);
      continue;
    }
    if (memberRows.some(member => member.player_id === excludePlayerId)) {
      continue;
    }
    if (memberRows.length >= MAX_PARTY_SIZE) {
      continue;
    }

    const leader = memberRows.find(
      member => member.player_id === party.leader_id,
    );
    if (!leader || !isFreshOnlinePresence(presenceMap.get(party.leader_id))) {
      await cleanupInvalidParty(party.id);
      continue;
    }

    listings.push({
      id: party.id,
      leaderId: party.leader_id,
      leaderNickname: leader?.nickname ?? '파티장',
      raidType: party.raid_type,
      bossStage: party.boss_stage,
      memberCount: memberRows.length,
      createdAt: party.created_at,
      updatedAt: party.updated_at,
    });
  }

  return { data: listings, error: null };
}

export async function createPartyInvite(
  partyId: string,
  inviterId: string,
  inviteeId: string,
  inviterNickname: string,
  inviteeNickname?: string | null,
) {
  if (inviterId === inviteeId) {
    return { data: null, error: { message: 'self_invite' } };
  }

  const { data: party, error: partyError } = await supabase
    .from('parties')
    .select('id, leader_id, status')
    .eq('id', partyId)
    .maybeSingle();
  if (partyError) {
    return { data: null, error: partyError };
  }
  if (!party) {
    return { data: null, error: { message: 'party_not_found' } };
  }
  if (party.leader_id !== inviterId) {
    return { data: null, error: { message: 'leader_only' } };
  }
  if (party.status && party.status !== 'recruiting') {
    // RAID_FIX: after the host starts a raid, late invites must not add a new
    // member who missed the synchronized party entry flow.
    return { data: null, error: { message: 'party_not_found' } };
  }

  const { count, error: countError } = await getPartyMemberCount(partyId);
  if (countError) {
    return { data: null, error: countError };
  }
  if (count !== null && count >= MAX_PARTY_SIZE) {
    return { data: null, error: { message: 'party_full' } };
  }

  const { data: inviteeMembership, error: membershipError } =
    await getMembership(inviteeId);
  if (membershipError) {
    return { data: null, error: membershipError };
  }
  if (inviteeMembership?.party_id === partyId) {
    return { data: null, error: { message: 'already_in_party' } };
  }
  if (inviteeMembership?.party_id) {
    return { data: null, error: { message: 'invitee_in_other_party' } };
  }

  const { data: presence, error: presenceError } = await supabase
    .from('user_presence')
    .select('is_online')
    .eq('player_id', inviteeId)
    .maybeSingle();
  if (presenceError) {
    return { data: null, error: presenceError };
  }
  if (!presence?.is_online) {
    return { data: null, error: { message: 'player_offline' } };
  }

  const nowIso = new Date().toISOString();
  const { data: existingInvite, error: inviteLookupError } = await supabase
    .from('party_invites')
    .select('*')
    .eq('party_id', partyId)
    .eq('invitee_id', inviteeId)
    .eq('status', 'pending')
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (inviteLookupError) {
    return { data: null, error: inviteLookupError };
  }
  if (existingInvite) {
    return {
      data: existingInvite,
      error: { message: 'invite_already_pending' },
    };
  }

  return supabase
    .from('party_invites')
    .insert({
      party_id: partyId,
      inviter_id: inviterId,
      inviter_nickname: inviterNickname,
      invitee_id: inviteeId,
      invitee_nickname: inviteeNickname ?? null,
      status: 'pending',
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      updated_at: nowIso,
    })
    .select()
    .single();
}

export async function getIncomingPartyInvites(playerId: string) {
  const { data, error } = await supabase
    .from('party_invites')
    .select('*')
    .eq('invitee_id', playerId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  return { data: (data as PartyInviteRecord[] | null) ?? [], error };
}

export async function acceptPartyInvite(
  inviteId: string,
  playerId: string,
  nickname: string,
) {
  const { data: invite, error: inviteError } = await supabase
    .from('party_invites')
    .select('*')
    .eq('id', inviteId)
    .eq('invitee_id', playerId)
    .maybeSingle();
  if (inviteError) {
    return { data: null, error: inviteError };
  }
  if (!invite) {
    return { data: null, error: { message: 'invite_not_found' } };
  }
  if (invite.status !== 'pending') {
    return { data: null, error: { message: 'invite_not_pending' } };
  }
  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    await updateInviteStatus(inviteId, 'expired', { invitee_id: playerId });
    return { data: null, error: { message: 'invite_expired' } };
  }

  const { data: currentParty, error: currentPartyError } = await getMyParty(
    playerId,
  );
  if (currentPartyError) {
    return { data: null, error: currentPartyError };
  }

  if (currentParty?.id && currentParty.id !== invite.party_id) {
    return { data: null, error: { message: 'already_in_party' } };
  }

  if (!currentParty?.id) {
    const { error: joinError } = await joinParty(
      invite.party_id,
      playerId,
      nickname,
    );
    if (joinError) {
      return { data: null, error: joinError };
    }
  }

  const { data: updatedInvite, error: updateError } = await updateInviteStatus(
    inviteId,
    'accepted',
    { invitee_id: playerId },
  );
  if (updateError) {
    return { data: null, error: updateError };
  }

  return { data: updatedInvite, error: null };
}

export async function declinePartyInvite(inviteId: string, playerId: string) {
  return updateInviteStatus(inviteId, 'declined', { invitee_id: playerId });
}

export async function cancelPartyInvite(inviteId: string, inviterId: string) {
  return updateInviteStatus(inviteId, 'cancelled', { inviter_id: inviterId });
}

export function getPartyChannel(partyId: string) {
  return supabase.channel(`party:${partyId}`);
}
