import { supabase } from './supabase';
import {
  ATTACK_WINDOW_MS,
  MAX_RAID_PLAYERS,
  getTierForStage,
} from '../constants/raidConfig';
import { getBossRaidWindowInfo } from '../game/raidRules';

interface StartRaidOptions {
  expiresInMs?: number;
  reuseOpenInstance?: boolean;
  skipCooldown?: boolean;
  partyId?: string | null;
  bypassBossWindow?: boolean;
}

interface RaidAccessOptions {
  bypassBossWindow?: boolean;
}

interface RaidInstanceRecord {
  id: string;
  boss_stage: number;
  status: string;
  started_at?: string | null;
  expires_at?: string | null;
  party_id?: string | null;
}

const NORMAL_RAID_DURATION_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function getRaidDurationMs(
  instance: Pick<RaidInstanceRecord, 'started_at' | 'expires_at'>,
) {
  const startedAt = Date.parse(instance.started_at ?? '');
  const expiresAt = Date.parse(instance.expires_at ?? '');
  if (!Number.isFinite(startedAt) || !Number.isFinite(expiresAt)) {
    return 0;
  }
  return Math.max(0, expiresAt - startedAt);
}

function isNormalRaidInstance(
  instance: Pick<RaidInstanceRecord, 'started_at' | 'expires_at'>,
) {
  return getRaidDurationMs(instance) >= NORMAL_RAID_DURATION_THRESHOLD_MS;
}

function isCurrentBossWindowInstance(
  instance: Pick<RaidInstanceRecord, 'started_at' | 'expires_at'>,
  now = Date.now(),
) {
  const startedAt = Date.parse(instance.started_at ?? '');
  if (!Number.isFinite(startedAt)) {
    return false;
  }
  const windowInfo = getBossRaidWindowInfo(now);
  return (
    startedAt >= windowInfo.windowStartAt && startedAt < windowInfo.windowEndAt
  );
}

function isUsableActiveRaidInstance(
  instance: Pick<RaidInstanceRecord, 'started_at' | 'expires_at'>,
  now = Date.now(),
  bypassBossWindow = false,
) {
  if (isNormalRaidInstance(instance)) {
    return true;
  }
  if (bypassBossWindow) {
    const expiresAt = Date.parse(instance.expires_at ?? '');
    return Number.isFinite(expiresAt) && expiresAt > now;
  }
  return isCurrentBossWindowInstance(instance, now);
}

export async function expireStaleRaidInstances() {
  return supabase
    .from('raid_instances')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lte('expires_at', new Date().toISOString());
}

export async function expireRaidInstance(instanceId: string) {
  return supabase
    .from('raid_instances')
    .update({ status: 'expired' })
    .eq('id', instanceId)
    .eq('status', 'active');
}

export async function createRaidInstance(
  bossStage: number,
  maxHp: number,
  starterId: string,
  expiresInMs: number = ATTACK_WINDOW_MS,
  partyId: string | null = null,
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInMs);

  return supabase
    .from('raid_instances')
    .insert({
      boss_stage: bossStage,
      boss_current_hp: maxHp,
      boss_max_hp: maxHp,
      starter_id: starterId,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'active',
      party_id: partyId,
    })
    .select()
    .single();
}

export async function findJoinableRaidInstance(
  bossStage: number,
  partyId?: string | null,
  options: RaidAccessOptions = {},
) {
  let query = supabase
    .from('raid_instances')
    .select('*')
    .eq('boss_stage', bossStage)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(20);

  query = partyId ? query.eq('party_id', partyId) : query.is('party_id', null);

  const { data: instances, error } = await query;

  if (error || !instances) {
    return { data: null, error };
  }

  const usableInstances = instances.filter(instance =>
    isUsableActiveRaidInstance(
      instance,
      Date.now(),
      options.bypassBossWindow,
    ),
  );

  for (const instance of usableInstances) {
    const { count } = await supabase
      .from('raid_participants')
      .select('*', { count: 'exact', head: true })
      .eq('raid_instance_id', instance.id);

    if (count === null || count < MAX_RAID_PLAYERS) {
      return { data: instance, error: null };
    }
  }

  return { data: null, error: null };
}

export async function getPartyActiveRaid(
  partyId: string,
  bossStage?: number,
  options: RaidAccessOptions = {},
) {
  let query = supabase
    .from('raid_instances')
    .select('*')
    .eq('party_id', partyId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  if (typeof bossStage === 'number') {
    query = query.eq('boss_stage', bossStage);
  }

  const { data, error } = await query;
  if (error || !data) {
    return { data: null, error };
  }

  const usableInstance = data.find(instance =>
    isUsableActiveRaidInstance(
      instance,
      Date.now(),
      options.bypassBossWindow,
    ),
  );
  return { data: usableInstance ?? null, error: null };
}

export async function getRaidInstance(instanceId: string) {
  return supabase
    .from('raid_instances')
    .select('*')
    .eq('id', instanceId)
    .single();
}

export async function getActiveInstances(
  friendIds?: string[],
  options: RaidAccessOptions = {},
) {
  let query = supabase
    .from('raid_instances')
    .select('*')
    .eq('status', 'active')
    .is('party_id', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (friendIds && friendIds.length > 0) {
    query = query.in('starter_id', friendIds);
  }

  const { data, error } = await query.limit(20);
  if (error || !data) {
    return { data: [], error };
  }

  return {
    data: data.filter(instance =>
      isUsableActiveRaidInstance(
        instance,
        Date.now(),
        options.bypassBossWindow,
      ),
    ),
    error: null,
  };
}

export async function joinRaidInstance(
  instanceId: string,
  playerId: string,
  nickname: string,
  options: RaidAccessOptions = {},
) {
  const { data: instance, error: instanceError } = await supabase
    .from('raid_instances')
    .select('*')
    .eq('id', instanceId)
    .maybeSingle();

  if (instanceError) {
    return { data: null, error: instanceError };
  }

  if (
    !instance ||
    instance.status !== 'active' ||
    new Date(instance.expires_at).getTime() <= Date.now() ||
    !isUsableActiveRaidInstance(
      instance,
      Date.now(),
      options.bypassBossWindow,
    )
  ) {
    return { data: null, error: { message: 'raid_expired' } };
  }

  const { data: existingParticipant, error: existingParticipantError } =
    await supabase
      .from('raid_participants')
      .select('*')
      .eq('raid_instance_id', instanceId)
      .eq('player_id', playerId)
      .maybeSingle();

  if (existingParticipantError) {
    return { data: null, error: existingParticipantError };
  }

  if (existingParticipant) {
    const { data, error } = await supabase
      .from('raid_participants')
      .update({
        nickname,
        joined_at: existingParticipant.joined_at ?? new Date().toISOString(),
      })
      .eq('raid_instance_id', instanceId)
      .eq('player_id', playerId)
      .select()
      .single();

    return { data: data ?? existingParticipant, error };
  }

  const { count } = await supabase
    .from('raid_participants')
    .select('*', { count: 'exact', head: true })
    .eq('raid_instance_id', instanceId);

  if (count !== null && count >= MAX_RAID_PLAYERS) {
    return { data: null, error: { message: 'raid_full' } };
  }

  const { data, error } = await supabase
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
      { onConflict: 'raid_instance_id,player_id' },
    )
    .select()
    .single();

  return { data, error };
}

export async function getRaidParticipants(instanceId: string) {
  return supabase
    .from('raid_participants')
    .select('*')
    .eq('raid_instance_id', instanceId)
    .order('total_damage', { ascending: false });
}

export async function dealRaidDamage(
  instanceId: string,
  playerId: string,
  damage: number,
  blocksCount: number,
) {
  const { data: instance } = await supabase
    .from('raid_instances')
    .select('boss_current_hp, status')
    .eq('id', instanceId)
    .single();

  if (!instance || instance.status !== 'active') {
    return { data: null, error: { message: 'instance_not_active' } };
  }

  const newHp = Math.max(0, instance.boss_current_hp - damage);
  const defeated = newHp <= 0;

  await supabase
    .from('raid_instances')
    .update({
      boss_current_hp: newHp,
      ...(defeated ? { status: 'defeated' } : {}),
    })
    .eq('id', instanceId);

  const { data: participant } = await supabase
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

  return { data: { newHp, defeated }, error: null };
}

export async function getPlayerCooldowns(playerId: string) {
  return supabase.from('raid_cooldowns').select('*').eq('player_id', playerId);
}

export async function setPlayerCooldown(playerId: string, tier: number) {
  return supabase.from('raid_cooldowns').upsert(
    {
      player_id: playerId,
      tier,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'player_id,tier' },
  );
}

export async function resetBossHp(instanceId: string, maxHp: number) {
  return supabase
    .from('raid_instances')
    .update({ boss_current_hp: maxHp })
    .eq('id', instanceId);
}

export function getRaidChannel(instanceId: string) {
  return supabase.channel(`raid:${instanceId}`);
}

export async function startRaid(
  bossStage: number,
  maxHp: number,
  playerId: string,
  nickname: string,
  options: StartRaidOptions = {},
) {
  const tier = getTierForStage(bossStage);
  const expiresInMs = options.expiresInMs ?? ATTACK_WINDOW_MS;
  const partyId = options.partyId ?? null;

  if (partyId) {
    const { data: partyInstance, error: partyError } = await getPartyActiveRaid(
      partyId,
      bossStage,
      { bypassBossWindow: options.bypassBossWindow },
    );
    if (partyError) {
      return { data: null, error: partyError };
    }

    if (partyInstance) {
      const { error: joinError } = await joinRaidInstance(
        partyInstance.id,
        playerId,
        nickname,
        { bypassBossWindow: options.bypassBossWindow },
      );
      if (joinError) {
        return { data: null, error: joinError };
      }

      return { data: partyInstance, error: null };
    }
  }

  if (options.reuseOpenInstance || partyId) {
    const { data: reusableInstance, error: reusableError } =
      await findJoinableRaidInstance(bossStage, partyId, {
        bypassBossWindow: options.bypassBossWindow,
      });
    if (reusableError) {
      return { data: null, error: reusableError };
    }

    if (reusableInstance) {
      const { error: joinError } = await joinRaidInstance(
        reusableInstance.id,
        playerId,
        nickname,
        { bypassBossWindow: options.bypassBossWindow },
      );
      if (joinError) {
        return { data: null, error: joinError };
      }

      return { data: reusableInstance, error: null };
    }
  }

  const { data: instance, error: instErr } = await createRaidInstance(
    bossStage,
    maxHp,
    playerId,
    expiresInMs,
    partyId,
  );
  if (instErr || !instance) {
    return {
      data: null,
      error: instErr || { message: 'failed to create instance' },
    };
  }

  if (!options.skipCooldown) {
    await setPlayerCooldown(playerId, tier);
  }

  const { error: joinError } = await joinRaidInstance(
    instance.id,
    playerId,
    nickname,
    { bypassBossWindow: options.bypassBossWindow },
  );
  if (joinError) {
    return { data: null, error: joinError };
  }

  return { data: instance, error: null };
}
