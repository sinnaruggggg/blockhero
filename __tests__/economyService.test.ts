jest.mock('../src/services/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

jest.mock('../src/services/playerState', () => ({
  mergePlayerStateCache: jest.fn(),
}));

import {
  changeNicknameWithServerCharge,
  claimAchievementReward,
  claimMissionReward,
  claimPendingResourceGrants,
  getEconomyErrorCode,
  purchaseShopItem,
  upgradeRaidSkill,
} from '../src/services/economyService';
import {mergePlayerStateCache} from '../src/services/playerState';
import {supabase} from '../src/services/supabase';

const rpcMock = supabase.rpc as jest.Mock;
const mergePlayerStateCacheMock = mergePlayerStateCache as jest.Mock;

const sampleGameData = {
  hearts: 5,
  lastHeartTime: 123,
  gold: 999,
  diamonds: 77,
  items: {
    hammer: 0,
    refresh: 1,
    heal_small: 2,
    heal_medium: 0,
    heal_large: 0,
    power_small: 1,
    power_medium: 0,
    power_large: 0,
    addTurns: 0,
    bomb: 0,
    piece_square3: 0,
    piece_rect: 0,
    piece_line5: 0,
    piece_num2: 0,
    piece_diag: 0,
  },
};

describe('economyService', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    mergePlayerStateCacheMock.mockReset();
  });

  it('purchases a shop item through RPC and merges game data cache', async () => {
    rpcMock.mockResolvedValue({
      data: {game_data: sampleGameData},
      error: null,
    });

    const result = await purchaseShopItem('heal_small', 'gold');

    expect(rpcMock).toHaveBeenCalledWith('bh_purchase_shop_item', {
      p_item_id: 'heal_small',
      p_currency: 'gold',
    });
    expect(mergePlayerStateCacheMock).toHaveBeenCalledWith({
      game_data: sampleGameData,
    });
    expect(result).toEqual(sampleGameData);
  });

  it('upgrades a raid skill through RPC', async () => {
    rpcMock.mockResolvedValue({
      data: {game_data: sampleGameData},
      error: null,
    });

    await upgradeRaidSkill(2);

    expect(rpcMock).toHaveBeenCalledWith('bh_upgrade_raid_skill', {
      p_skill_index: 2,
    });
  });

  it('claims a mission reward and merges both game and mission caches', async () => {
    const missionData = {date: 'today', claimed: {play3: true}};
    rpcMock.mockResolvedValue({
      data: {
        game_data: sampleGameData,
        mission_data: missionData,
        reward: 30,
      },
      error: null,
    });

    const result = await claimMissionReward('play3');

    expect(rpcMock).toHaveBeenCalledWith('bh_claim_daily_mission_reward', {
      p_mission_id: 'play3',
    });
    expect(mergePlayerStateCacheMock).toHaveBeenCalledWith({
      game_data: sampleGameData,
      mission_data: missionData,
    });
    expect(result).toEqual({
      gameData: sampleGameData,
      missionData,
      reward: 30,
    });
  });

  it('claims an achievement reward and merges caches', async () => {
    const achievementData = {firstWin: true};
    rpcMock.mockResolvedValue({
      data: {
        game_data: sampleGameData,
        achievement_data: achievementData,
        reward: 50,
      },
      error: null,
    });

    const result = await claimAchievementReward('firstWin');

    expect(rpcMock).toHaveBeenCalledWith('bh_claim_achievement_reward', {
      p_achievement_id: 'firstWin',
    });
    expect(mergePlayerStateCacheMock).toHaveBeenCalledWith({
      game_data: sampleGameData,
      achievement_data: achievementData,
    });
    expect(result).toEqual({
      gameData: sampleGameData,
      achievementData,
      reward: 50,
    });
  });

  it('claims pending grants and normalizes the claimed list', async () => {
    const claimed = [{type: 'gold', amount: 100, reason: 'event'}];
    rpcMock.mockResolvedValue({
      data: {
        game_data: sampleGameData,
        claimed,
      },
      error: null,
    });

    const result = await claimPendingResourceGrants();

    expect(rpcMock).toHaveBeenCalledWith('bh_claim_pending_resource_grants');
    expect(result).toEqual({
      gameData: sampleGameData,
      claimed,
    });
  });

  it('changes nickname with a server-side charge', async () => {
    rpcMock.mockResolvedValue({
      data: {
        game_data: sampleGameData,
        nickname: 'Hero',
        nickname_changed: true,
      },
      error: null,
    });

    const result = await changeNicknameWithServerCharge('Hero');

    expect(rpcMock).toHaveBeenCalledWith('bh_change_profile_nickname', {
      p_nickname: 'Hero',
    });
    expect(result).toEqual({
      gameData: sampleGameData,
      nickname: 'Hero',
      nicknameChanged: true,
    });
  });

  it('extracts the final economy error code from an error message', () => {
    expect(getEconomyErrorCode(new Error('rpc failed: not_enough_gold'))).toBe(
      'not_enough_gold',
    );
  });
});
