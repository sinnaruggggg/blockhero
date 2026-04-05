import React from 'react';
import {ActivityIndicator} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import RaidLobbyScreen from '../src/screens/RaidLobbyScreen';

jest.mock('../src/stores/gameStore', () => ({
  getPlayerId: jest.fn(async () => 'player-1'),
  getNickname: jest.fn(async () => 'Player'),
  loadNormalRaidProgress: jest.fn(async () => ({})),
  hasSkinFromRaid: jest.fn(() => false),
  loadLevelProgress: jest.fn(async () => ({1: {cleared: true}})),
  getSelectedCharacter: jest.fn(async () => 'knight'),
  loadCharacterData: jest.fn(async () => ({
    level: 1,
    personalAllocations: Array(10).fill(0),
    partyAllocations: Array(10).fill(0),
  })),
}));

jest.mock('../src/services/raidService', () => ({
  startRaid: jest.fn(),
  getActiveInstances: jest.fn(async () => ({data: []})),
  joinRaidInstance: jest.fn(),
}));

jest.mock('../src/services/friendService', () => ({
  getFriendIds: jest.fn(async () => []),
  getFriendList: jest.fn(async () => ({data: []})),
}));

jest.mock('../src/services/partyService', () => ({
  createParty: jest.fn(),
  joinParty: jest.fn(),
  leaveParty: jest.fn(),
  disbandParty: jest.fn(),
  getMyParty: jest.fn(async () => ({data: null, error: null})),
  getPartyMembers: jest.fn(async () => ({data: []})),
}));

jest.mock('../src/services/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../src/assets/monsterSprites', () => ({
  getRaidBossSprite: jest.fn(() => null),
}));

jest.mock('../src/components/BackImageButton', () => 'BackImageButton');
jest.mock('../src/components/PartyPanel', () => 'PartyPanel');
jest.mock('../src/components/FriendInviteModal', () => 'FriendInviteModal');

jest.mock('../src/game/raidRules', () => ({
  formatBossRaidCountdownLabel: jest.fn(() => '00:00'),
  getBossRaidWindowInfo: jest.fn(() => ({isOpen: false, remainingMs: 0})),
}));

jest.mock('../src/game/levelProgress', () => ({
  getUnlockedBossRaidStages: jest.fn(() => [1]),
}));

jest.mock('../src/game/characterSkillEffects', () => ({
  getCharacterSkillEffects: jest.fn(() => ({raidTimeBonusMs: 0})),
}));

jest.mock('../src/i18n', () => ({
  t: jest.fn((key: string) => key),
}));

const flushMicrotasks = () =>
  new Promise<void>(resolve => {
    setImmediate(() => resolve());
  });

describe('RaidLobbyScreen bootstrap loading', () => {
  test('starts loading immediately on mount without waiting for focus event', async () => {
    const navigation = {
      addListener: jest.fn(() => jest.fn()),
      goBack: jest.fn(),
      navigate: jest.fn(),
      replace: jest.fn(),
    };

    let tree: TestRenderer.ReactTestRenderer;

    await act(async () => {
      tree = TestRenderer.create(<RaidLobbyScreen navigation={navigation} />);
      await flushMicrotasks();
      await flushMicrotasks();
    });

    expect(navigation.addListener).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(
      require('../src/stores/gameStore').getPlayerId,
    ).toHaveBeenCalledTimes(1);
    expect(tree!.root.findAllByType(ActivityIndicator)).toHaveLength(0);

    act(() => {
      tree!.unmount();
    });
  });
});
