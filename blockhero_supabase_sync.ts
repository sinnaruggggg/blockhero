import {createClient} from '@supabase/supabase-js';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {AppState} from './blockhero_state';
import {
  type SupabaseSyncPayload,
  buildSupabaseSyncPayload,
} from './blockhero_sync_payload';

export interface BlockHeroSupabaseConfig {
  url: string;
  anonKey: string;
}

export function createBlockHeroSupabaseClient(
  config: BlockHeroSupabaseConfig,
): SupabaseClient {
  return createClient(config.url, config.anonKey);
}

async function replaceRows(
  client: SupabaseClient,
  table: string,
  userId: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  await client.from(table).delete().eq('user_id', userId);

  if (rows.length === 0) {
    return;
  }

  const {error} = await client.from(table).upsert(rows);
  if (error) {
    throw error;
  }
}

export async function pushStateToSupabase(
  client: SupabaseClient,
  userId: string,
  state: AppState,
): Promise<SupabaseSyncPayload> {
  const payload = buildSupabaseSyncPayload(userId, state);

  const profileResult = await client
    .from('player_profiles')
    .upsert(payload.profile, {onConflict: 'user_id'});
  if (profileResult.error) {
    throw profileResult.error;
  }

  const walletResult = await client
    .from('player_wallets')
    .upsert(payload.wallet, {onConflict: 'user_id'});
  if (walletResult.error) {
    throw walletResult.error;
  }

  await replaceRows(
    client,
    'player_inventories',
    userId,
    payload.inventory.map(row => ({
      user_id: row.user_id,
      item_id: row.item_id,
      quantity: row.quantity,
    })),
  );

  await replaceRows(
    client,
    'character_progress',
    userId,
    payload.characterProgress.map(row => ({
      user_id: row.user_id,
      class_id: row.class_id,
      level: row.level,
      exp: row.exp,
      skill_points: row.skill_points,
    })),
  );

  await replaceRows(
    client,
    'skill_progress',
    userId,
    payload.skillProgress.map(row => ({
      user_id: row.user_id,
      class_id: row.class_id,
      skill_id: row.skill_id,
      skill_level: row.skill_level,
    })),
  );

  await replaceRows(
    client,
    'stage_progress',
    userId,
    payload.stageProgress.map(row => ({
      user_id: row.user_id,
      stage_id: row.stage_id,
      cleared: row.cleared,
    })),
  );

  const endlessResult = await client
    .from('endless_profiles')
    .upsert(
      {
        user_id: payload.endlessProfile.user_id,
        high_score: payload.endlessProfile.high_score,
        last_score: payload.endlessProfile.last_score,
        total_lines_cleared: payload.endlessProfile.total_lines_cleared,
      },
      {onConflict: 'user_id'},
    );
  if (endlessResult.error) {
    throw endlessResult.error;
  }

  await replaceRows(
    client,
    'normal_raid_progress',
    userId,
    payload.normalRaidProgress.map(row => ({
      user_id: row.user_id,
      stage: row.stage,
      clear_count: row.clear_count,
    })),
  );

  await replaceRows(
    client,
    'player_skins',
    userId,
    payload.playerSkins.map(row => ({
      user_id: row.user_id,
      skin_id: row.skin_id,
      equipped: row.equipped,
    })),
  );

  await replaceRows(
    client,
    'player_summons',
    userId,
    payload.playerSummons.map(row => ({
      user_id: row.user_id,
      summon_id: row.summon_id,
      level: row.level,
      exp: row.exp,
      evolution_tier: row.evolution_tier,
      active_time_left_sec: row.active_time_left_sec,
    })),
  );

  return payload;
}
