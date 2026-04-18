import {
  type AchievementData,
  type GameData,
  type MissionData,
} from '../stores/gameStore';
import {mergePlayerStateCache} from './playerState';
import {supabase} from './supabase';

export type ShopPurchaseCurrency = 'gold' | 'diamonds';

export interface PendingGrantClaim {
  type: string;
  amount: number;
  reason: string | null;
}

interface ShopPurchaseResponse {
  game_data: GameData;
}

interface RaidSkillUpgradeResponse {
  game_data: GameData;
}

interface MissionClaimResponse {
  game_data: GameData;
  mission_data: MissionData;
  reward: number;
}

interface AchievementClaimResponse {
  game_data: GameData;
  achievement_data: AchievementData;
  reward: number;
}

interface PendingGrantResponse {
  game_data: GameData;
  claimed: PendingGrantClaim[];
}

interface RenameProfileResponse {
  game_data: GameData;
  nickname: string;
  nickname_changed: boolean;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as {message?: unknown}).message === 'string'
  ) {
    return (error as {message: string}).message;
  }

  return String(error || 'unknown_error');
}

function expectRpcObject<T>(value: unknown): T {
  if (!value || typeof value !== 'object') {
    throw new Error('invalid_rpc_response');
  }

  return value as T;
}

function applyGameData(gameData: GameData) {
  mergePlayerStateCache({game_data: gameData});
}

export function getEconomyErrorCode(error: unknown): string {
  const message = getErrorMessage(error);
  const normalized = message.split(':').pop()?.trim();
  return normalized || message;
}

export async function purchaseShopItem(
  itemId: string,
  currency: ShopPurchaseCurrency,
): Promise<GameData> {
  const {data, error} = await supabase.rpc('bh_purchase_shop_item', {
    p_item_id: itemId,
    p_currency: currency,
  });

  if (error) {
    throw new Error(error.message);
  }

  const payload = expectRpcObject<ShopPurchaseResponse>(data);
  applyGameData(payload.game_data);
  return payload.game_data;
}

export async function upgradeRaidSkill(skillIndex: number): Promise<GameData> {
  const {data, error} = await supabase.rpc('bh_upgrade_raid_skill', {
    p_skill_index: skillIndex,
  });

  if (error) {
    throw new Error(error.message);
  }

  const payload = expectRpcObject<RaidSkillUpgradeResponse>(data);
  applyGameData(payload.game_data);
  return payload.game_data;
}

export async function claimMissionReward(
  missionId: string,
): Promise<{gameData: GameData; missionData: MissionData; reward: number}> {
  const {data, error} = await supabase.rpc('bh_claim_daily_mission_reward', {
    p_mission_id: missionId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const payload = expectRpcObject<MissionClaimResponse>(data);
  mergePlayerStateCache({
    game_data: payload.game_data,
    mission_data: payload.mission_data,
  });
  return {
    gameData: payload.game_data,
    missionData: payload.mission_data,
    reward: payload.reward,
  };
}

export async function claimAchievementReward(
  achievementId: string,
): Promise<{
  gameData: GameData;
  achievementData: AchievementData;
  reward: number;
}> {
  const {data, error} = await supabase.rpc('bh_claim_achievement_reward', {
    p_achievement_id: achievementId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const payload = expectRpcObject<AchievementClaimResponse>(data);
  mergePlayerStateCache({
    game_data: payload.game_data,
    achievement_data: payload.achievement_data,
  });
  return {
    gameData: payload.game_data,
    achievementData: payload.achievement_data,
    reward: payload.reward,
  };
}

export async function claimPendingResourceGrants(): Promise<{
  gameData: GameData;
  claimed: PendingGrantClaim[];
}> {
  const {data, error} = await supabase.rpc('bh_claim_pending_resource_grants');

  if (error) {
    throw new Error(error.message);
  }

  const payload = expectRpcObject<PendingGrantResponse>(data);
  applyGameData(payload.game_data);
  return {
    gameData: payload.game_data,
    claimed: Array.isArray(payload.claimed) ? payload.claimed : [],
  };
}

export async function changeNicknameWithServerCharge(nickname: string): Promise<{
  gameData: GameData;
  nickname: string;
  nicknameChanged: boolean;
}> {
  const {data, error} = await supabase.rpc('bh_change_profile_nickname', {
    p_nickname: nickname,
  });

  if (error) {
    throw new Error(error.message);
  }

  const payload = expectRpcObject<RenameProfileResponse>(data);
  applyGameData(payload.game_data);
  return {
    gameData: payload.game_data,
    nickname: payload.nickname,
    nicknameChanged: payload.nickname_changed,
  };
}
