import {supabase} from './supabase';
import {MAX_PARTY_SIZE} from '../constants/raidConfig';

// Create a new party
export async function createParty(leaderId: string, nickname: string) {
  const {data: party, error: partyErr} = await supabase
    .from('parties')
    .insert({leader_id: leaderId})
    .select()
    .single();

  if (partyErr || !party) return {data: null, error: partyErr};

  // Add leader as first member
  await supabase.from('party_members').insert({
    party_id: party.id,
    player_id: leaderId,
    nickname,
  });

  return {data: party, error: null};
}

// Join a party
export async function joinParty(partyId: string, playerId: string, nickname: string) {
  // Check member count
  const {count} = await supabase
    .from('party_members')
    .select('*', {count: 'exact', head: true})
    .eq('party_id', partyId);

  if (count !== null && count >= MAX_PARTY_SIZE) {
    return {data: null, error: {message: 'party_full'}};
  }

  return supabase.from('party_members').insert({
    party_id: partyId,
    player_id: playerId,
    nickname,
  });
}

// Leave a party
export async function leaveParty(partyId: string, playerId: string) {
  return supabase
    .from('party_members')
    .delete()
    .eq('party_id', partyId)
    .eq('player_id', playerId);
}

// Disband party (leader only)
export async function disbandParty(partyId: string) {
  // Cascade deletes members
  return supabase.from('parties').delete().eq('id', partyId);
}

// Get my current party
export async function getMyParty(playerId: string) {
  const {data: membership, error: membershipError} = await supabase
    .from('party_members')
    .select('party_id')
    .eq('player_id', playerId)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return {data: null, error: membershipError ?? null};
  }

  const {data: party, error: partyError} = await supabase
    .from('parties')
    .select('*')
    .eq('id', membership.party_id)
    .single();

  return {data: party ?? null, error: partyError ?? null};
}

// Get party members
export async function getPartyMembers(partyId: string) {
  return supabase
    .from('party_members')
    .select('*')
    .eq('party_id', partyId)
    .order('joined_at', {ascending: true});
}

// Get party channel for realtime
export function getPartyChannel(partyId: string) {
  return supabase.channel(`party:${partyId}`);
}
