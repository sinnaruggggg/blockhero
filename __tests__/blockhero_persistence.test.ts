jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import {mergePersistedState} from '../blockhero_persistence';
import {createInitialState} from '../blockhero_state';

describe('mergePersistedState', () => {
  it('returns the initial state when the snapshot is invalid', () => {
    const initialState = createInitialState();
    const merged = mergePersistedState(null);

    expect(merged).toMatchObject({
      screen: initialState.screen,
      selectedWorldId: initialState.selectedWorldId,
      selectedStageId: initialState.selectedStageId,
      selectedRaidStage: initialState.selectedRaidStage,
      selectedRaidType: initialState.selectedRaidType,
      activeRun: null,
      player: {
        hearts: initialState.player.hearts,
        gold: initialState.player.gold,
        diamonds: initialState.player.diamonds,
        selectedClassId: initialState.player.selectedClassId,
        inventory: initialState.player.inventory,
        unlockedStageId: initialState.player.unlockedStageId,
        clearedStageIds: initialState.player.clearedStageIds,
        unlockedBossRaidStage: initialState.player.unlockedBossRaidStage,
        normalRaidClearCounts: initialState.player.normalRaidClearCounts,
        unlockedSkinIds: initialState.player.unlockedSkinIds,
        equippedSkinId: initialState.player.equippedSkinId,
        characters: initialState.player.characters,
        summonProgress: initialState.player.summonProgress,
      },
    });
    expect(merged.raidLobbyMessages).toHaveLength(initialState.raidLobbyMessages.length);
  });

  it('merges player progress and sanitizes a partial active run', () => {
    const merged = mergePersistedState({
      player: {
        gold: 900,
        inventory: {
          hammer: 2,
        },
        unlockedSkinIds: ['knight-default'],
      },
      activeRun: {
        id: 7,
        mode: 'endless',
        title: 'Endless Trial',
        subtitle: 'Recovered snapshot',
        pieces: 'invalid',
        board: 'invalid',
        logs: 'invalid',
        partySummary: 'invalid',
        lobbyChat: 'invalid',
      },
    });

    expect(merged.player.gold).toBe(900);
    expect(merged.player.inventory.hammer).toBe(2);
    expect(merged.player.inventory.bomb).toBe(createInitialState().player.inventory.bomb);
    expect(merged.player.unlockedSkinIds).toEqual(['knight-default']);
    expect(merged.activeRun).not.toBeNull();
    expect(merged.activeRun?.id).toBe(7);
    expect(merged.activeRun?.mode).toBe('endless');
    expect(Array.isArray(merged.activeRun?.board)).toBe(true);
    expect(merged.activeRun?.pieces).toEqual([]);
    expect(merged.activeRun?.logs).toEqual([]);
    expect(merged.activeRun?.partySummary).toEqual([]);
    expect(merged.activeRun?.lobbyChat).toEqual([]);
  });
});
