import {supabase} from './supabase';
import {ATTACK_WINDOW_MS, MAX_RAID_PLAYERS, getTierForStage} from '../constants/raidConfig';

interface StartRaidOptions {
  expiresInMs?: number;
  reuseOpenInstance?: boolean;
  skipCooldown?: boolean;
}

// Create a new raid instance (boss spawn)
export async function createRaidInstance(
  bossStage: number,
  maxHp: number,
  starterId: string,
  expiresInMs: number = ATTACK_WINDOW_MS,
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInMs);

  return supabase.from('raid_instances').insert({
    boss_stage: bossStage,
    boss_current_hp: maxHp,
    boss_max_hp: maxHp,
    starter_id: starterId,
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'active',
  }).select().single();
}

export async function findJoinableRaidInstance(bossStage: number) {
  const {data: instances, error} = await supabase
    .from('raid_instances')
    .select('*')
    .eq('boss_stage', bossStage)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', {ascending: true})
    .limit(20);

  if (error || !instances) {
    return {data: null, error};
  }

  for (const instance of instances) {
    const {count} = await supabase
      .from('raid_participants')
      .select('*', {count: 'exact', head: true})
      .eq('raid_instance_id', instance.id);

    if (count === null || count < MAX_RAID_PLAYERS) {
      return {data: instance, error: null};
    }
  }

  return {data: null, error: null};
}

// Get raid instance by ID
export async function getRaidInstance(instanceId: string) {
  return supabase
    .from('raid_instances')
    .select('*')
    .eq('id', instanceId)
    .single();
}

// Get active raid instances (for browsing joinable raids from friends)
export async function getActiveInstances(friendIds?: string[]) {
  let query = supabase
    .from('raid_instances')
    .select('*')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', {ascending: false});

  if (friendIds && friendIds.length > 0) {
    query = query.in('starter_id', friendIds);
  }

  return query.limit(20);
}

// Join a raid instance (or rejoin with damage reset)
export async function joinRaidInstance(
  instanceId: string,
  playerId: string,
  nickname: string,
) {
  // Check participant count
  const {count} = await supabase
    .from('raid_participants')
    .select('*', {count: 'exact', head: true})
    .eq('raid_instance_id', instanceId);

  if (count !== null && count >= MAX_RAID_PLAYERS) {
    return {data: null, error: {message: 'raid_full'}};
  }

  // Upsert: if re-entering, reset damage to 0
  const {data, error} = await supabase
    .from('raid_participants')
    .upsert(
      {
        raid_instance_id: instanceId,
        player_id: playerId,
        nickname,
        total_damage: 0,
        blocks_broken: 0,
        joined_at: new Date().toISOString(),
      },
      {onConflict: 'raid_instance_id,player_id'},
    )
    .select()
    .single();

  return {data, error};
}

// Get raid participants
export async function getRaidParticipants(instanceId: string) {
  return supabase
    .from('raid_participants')
    .select('*')
    .eq('raid_instance_id', instanceId)
    .order('total_damage', {ascending: false});
}

// Deal damage to raid boss (atomic-ish update)
export async function dealRaidDamage(
  instanceId: string,
  playerId: string,
  damage: number,
  blocksCount: number,
) {
  // Get current boss HP
  const {data: instance} = await supabase
    .from('raid_instances')
    .select('boss_current_hp, status')
    .eq('id', instanceId)
    .single();

  if (!instance || instance.status !== 'active') {
    return {data: null, error: {message: 'instance_not_active'}};
  }

  const newHp = Math.max(0, instance.boss_current_hp - damage);
  const defeated = newHp <= 0;

  // Update boss HP
  await supabase
    .from('raid_instances')
    .update({
      boss_current_hp: newHp,
      ...(defeated ? {status: 'defeated'} : {}),
    })
    .eq('id', instanceId);

  // Update participant damage
  const {data: participant} = await supabase
    .from('raid_participants')
    .select('total_damage, blocks_broken')
    .eq('raid_instance_id', instanceId)
    .eq('player_id', playerId)
    .single();

  if (participant) {
    await supabase
      .from('raid_participants')
      .update({
        total_damage: participant.total_damage + damage,
        blocks_broken: participant.blocks_broken + blocksCount,
      })
      .eq('raid_instance_id', instanceId)
      .eq('player_id', playerId);
  }

  return {data: {newHp, defeated}, error: null};
}

// Get player cooldowns (all tiers)
export async function getPlayerCooldowns(playerId: string) {
  return supabase
    .from('raid_cooldowns')
    .select('*')
    .eq('player_id', playerId);
}

// Set cooldown for a tier (upsert)
export async function setPlayerCooldown(playerId: string, tier: number) {
  return supabase
    .from('raid_cooldowns')
    .upsert(
      {
        player_id: playerId,
        tier,
        last_used_at: new Date().toISOString(),
      },
      {onConflict: 'player_id,tier'},
    );
}

// Reset boss HP (for solo retry)
export async function resetBossHp(instanceId: string, maxHp: number) {
  return supabase
    .from('raid_instances')
    .update({boss_current_hp: maxHp})
    .eq('id', instanceId);
}

// Get raid channel
export function getRaidChannel(instanceId: string) {
  return supabase.channel(`raid:${instanceId}`);
}

// Start a raid: create instance + set cooldown + join
export async function startRaid(
  bossStage: number,
  maxHp: number,
  playerId: string,
  nickname: string,
  options: StartRaidOptions = {},
) {
  const tier = getTierForStage(bossStage);
  const expiresInMs = options.expiresInMs ?? ATTACK_WINDOW_MS;

  if (options.reuseOpenInstance) {
    const {data: reusableInstance, error: reusableError} = await findJoinableRaidInstance(bossStage);
    if (reusableError) {
      return {data: null, error: reusableError};
    }

    if (reusableInstance) {
      await joinRaidInstance(reusableInstance.id, playerId, nickname);
      return {data: reusableInstance, error: null};
    }
  }

  // Create instance
  const {data: instance, error: instErr} = await createRaidInstance(
    bossStage,
    maxHp,
    playerId,
    expiresInMs,
  );
  if (instErr || !instance) {
    return {data: null, error: instErr || {message: 'failed to create instance'}};
  }

  if (!options.skipCooldown) {
    await setPlayerCooldown(playerId, tier);
  }

  // Join as first participant
  await joinRaidInstance(instance.id, playerId, nickname);

  return {data: instance, error: null};
}
