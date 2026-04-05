import type {AppState, CharacterProgress} from './blockhero_state';

export interface PlayerProfileRow {
  user_id: string;
  selected_class: string;
  heart_count: number;
  heart_updated_at: string;
  unlocked_stage_id: number;
  unlocked_boss_raid_stage: number;
}

export interface PlayerWalletRow {
  user_id: string;
  gold_balance: number;
  diamond_balance: number;
}

export interface PlayerInventoryRow {
  user_id: string;
  item_id: string;
  quantity: number;
}

export interface CharacterProgressRow {
  user_id: string;
  class_id: string;
  level: number;
  exp: number;
  skill_points: number;
}

export interface SkillProgressRow {
  user_id: string;
  class_id: string;
  skill_id: string;
  skill_level: number;
}

export interface StageProgressRow {
  user_id: string;
  stage_id: number;
  cleared: boolean;
}

export interface EndlessProfileRow {
  user_id: string;
  high_score: number;
  last_score: number;
  total_lines_cleared: number;
}

export interface NormalRaidProgressRow {
  user_id: string;
  stage: number;
  clear_count: number;
}

export interface PlayerSkinRow {
  user_id: string;
  skin_id: string;
  equipped: boolean;
}

export interface PlayerSummonRow {
  user_id: string;
  summon_id: string;
  level: number;
  exp: number;
  evolution_tier: number;
  active_time_left_sec: number;
}

export interface SupabaseSyncPayload {
  profile: PlayerProfileRow;
  wallet: PlayerWalletRow;
  inventory: PlayerInventoryRow[];
  characterProgress: CharacterProgressRow[];
  skillProgress: SkillProgressRow[];
  stageProgress: StageProgressRow[];
  endlessProfile: EndlessProfileRow;
  normalRaidProgress: NormalRaidProgressRow[];
  playerSkins: PlayerSkinRow[];
  playerSummons: PlayerSummonRow[];
}

function mapCharacterProgress(
  userId: string,
  character: CharacterProgress,
): CharacterProgressRow {
  return {
    user_id: userId,
    class_id: character.classId,
    level: character.level,
    exp: character.exp,
    skill_points: character.skillPoints,
  };
}

export function buildSupabaseSyncPayload(
  userId: string,
  state: AppState,
): SupabaseSyncPayload {
  const inventory = Object.entries(state.player.inventory).map(([itemId, quantity]) => ({
    user_id: userId,
    item_id: itemId,
    quantity,
  }));

  const characters = Object.values(state.player.characters);
  const characterProgress = characters.map(character =>
    mapCharacterProgress(userId, character),
  );

  const skillProgress = characters.flatMap(character =>
    character.skills.map(skill => ({
      user_id: userId,
      class_id: character.classId,
      skill_id: skill.skillId,
      skill_level: skill.level,
    })),
  );

  const stageProgress = state.player.clearedStageIds.map(stageId => ({
    user_id: userId,
    stage_id: stageId,
    cleared: true,
  }));

  const endlessScore =
    state.activeRun?.mode === 'endless' ? state.activeRun.score : 0;
  const endlessLines =
    state.activeRun?.mode === 'endless' ? state.activeRun.totalClearedLines : 0;

  const normalRaidProgress = Object.entries(state.player.normalRaidClearCounts).map(
    ([stage, clearCount]) => ({
      user_id: userId,
      stage: Number(stage),
      clear_count: clearCount,
    }),
  );

  const playerSkins = state.player.unlockedSkinIds.map(skinId => ({
    user_id: userId,
    skin_id: skinId,
    equipped: state.player.equippedSkinId === skinId,
  }));

  const playerSummons = Object.entries(state.player.summonProgress).map(
    ([summonId, summon]) => ({
      user_id: userId,
      summon_id: summonId,
      level: summon.level,
      exp: summon.exp,
      evolution_tier: summon.evolutionTier,
      active_time_left_sec: summon.activeTimeLeftSec,
    }),
  );

  return {
    profile: {
      user_id: userId,
      selected_class: state.player.selectedClassId,
      heart_count: state.player.hearts,
      heart_updated_at: new Date(state.player.lastHeartChargeAtMs).toISOString(),
      unlocked_stage_id: state.player.unlockedStageId,
      unlocked_boss_raid_stage: state.player.unlockedBossRaidStage,
    },
    wallet: {
      user_id: userId,
      gold_balance: state.player.gold,
      diamond_balance: state.player.diamonds,
    },
    inventory,
    characterProgress,
    skillProgress,
    stageProgress,
    endlessProfile: {
      user_id: userId,
      high_score: endlessScore,
      last_score: endlessScore,
      total_lines_cleared: endlessLines,
    },
    normalRaidProgress,
    playerSkins,
    playerSummons,
  };
}
