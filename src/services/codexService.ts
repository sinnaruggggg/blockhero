import {supabase} from './supabase';

// Get full codex for a player
export async function getPlayerCodex(playerId: string) {
  return supabase
    .from('boss_codex')
    .select('*')
    .eq('player_id', playerId)
    .order('boss_stage', {ascending: true});
}

// Upsert codex entry after boss defeat
export async function upsertCodexEntry(
  playerId: string,
  bossStage: number,
  damage: number,
  clearTimeMs?: number,
) {
  // Check existing
  const {data: existing} = await supabase
    .from('boss_codex')
    .select('*')
    .eq('player_id', playerId)
    .eq('boss_stage', bossStage)
    .single();

  if (existing) {
    // Update: increment count, update best damage, fastest clear
    const updates: any = {
      defeat_count: existing.defeat_count + 1,
      best_damage: Math.max(existing.best_damage, damage),
    };
    if (clearTimeMs && (!existing.fastest_clear_ms || clearTimeMs < existing.fastest_clear_ms)) {
      updates.fastest_clear_ms = clearTimeMs;
    }
    return supabase
      .from('boss_codex')
      .update(updates)
      .eq('player_id', playerId)
      .eq('boss_stage', bossStage);
  } else {
    // Insert new
    return supabase.from('boss_codex').insert({
      player_id: playerId,
      boss_stage: bossStage,
      defeat_count: 1,
      best_damage: damage,
      fastest_clear_ms: clearTimeMs || null,
      first_defeated_at: new Date().toISOString(),
    });
  }
}

// Update player title
export async function updatePlayerTitle(userId: string, title: string | null) {
  return supabase.from('profiles').update({title}).eq('id', userId);
}

// Get player title
export async function getPlayerTitle(userId: string) {
  const {data} = await supabase
    .from('profiles')
    .select('title')
    .eq('id', userId)
    .single();
  return data?.title || null;
}
