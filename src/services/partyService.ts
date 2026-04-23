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

  const { count, error: countError } = await getPartyMemberCount(partyId);
  if (countError) {
    return { data: null, error: countError };
  }
  if (count !== null && count >= MAX_PARTY_SIZE) {
    return { data: null, error: { message: 'party_full' } };
  }

  return supabase
    .from('party_members')
    .insert({
      party_id: partyId,
      player_id: playerId,
      nickname,
    })
    .select()
    .single();
}

export async function leaveParty(partyId: string, playerId: string) {
  return supabase
    .from('party_members')
    .delete()
    .eq('party_id', partyId)
    .eq('player_id', playerId);
}

export async function disbandParty(partyId: string) {
  return supabase.from('parties').delete().eq('id', partyId);
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
    .single();

  return { data: party ?? null, error: partyError ?? null };
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

  for (const party of parties ?? []) {
    if (party.status && party.status !== 'recruiting') {
      continue;
    }

    const { data: members, error: memberError } = await getPartyMembers(
      party.id,
    );
    if (memberError) {
      return { data: [] as RaidPartyListing[], error: memberError };
    }

    const memberRows = members ?? [];
    if (memberRows.some(member => member.player_id === excludePlayerId)) {
      continue;
    }
    if (memberRows.length >= MAX_PARTY_SIZE) {
      continue;
    }

    const leader = memberRows.find(
      member => member.player_id === party.leader_id,
    );

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
    .select('id, leader_id')
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
