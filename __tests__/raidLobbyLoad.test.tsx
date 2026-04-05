import React from 'react';
import {ActivityIndicator, Text} from 'react-native';
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

const mockedGameStore = require('../src/stores/gameStore');
const mockedRaidService = require('../src/services/raidService');
const mockedFriendService = require('../src/services/friendService');
const mockedPartyService = require('../src/services/partyService');

const flushMicrotasks = () =>
  new Promise<void>(resolve => {
    setImmediate(() => resolve());
  });

function createNavigation() {
  return {
    addListener: jest.fn(() => jest.fn()),
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
  };
}

async function renderScreen() {
  const navigation = createNavigation();
  let tree: TestRenderer.ReactTestRenderer;

  await act(async () => {
    tree = TestRenderer.create(<RaidLobbyScreen navigation={navigation} />);
    await flushMicrotasks();
    await flushMicrotasks();
  });

  return {tree: tree!, navigation};
}

function flattenText(children: any): string[] {
  if (typeof children === 'string') {
    return [children];
  }
  if (Array.isArray(children)) {
    return children.flatMap(child => flattenText(child));
  }
  return [];
}

function expectText(tree: TestRenderer.ReactTestRenderer, expected: string) {
  const texts = tree.root.findAllByType(Text).flatMap(node => flattenText(node.props.children));
  expect(texts.some(text => text.includes(expected))).toBe(true);
}

describe('RaidLobbyScreen bootstrap loading', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockedGameStore.getPlayerId.mockResolvedValue('player-1');
    mockedGameStore.getNickname.mockResolvedValue('Player');
    mockedGameStore.loadNormalRaidProgress.mockResolvedValue({});
    mockedGameStore.loadLevelProgress.mockResolvedValue({1: {cleared: true}});
    mockedGameStore.getSelectedCharacter.mockResolvedValue('knight');
    mockedGameStore.loadCharacterData.mockResolvedValue({
      level: 1,
      personalAllocations: Array(10).fill(0),
      partyAllocations: Array(10).fill(0),
    });

    mockedRaidService.getActiveInstances.mockResolvedValue({data: []});
    mockedFriendService.getFriendIds.mockResolvedValue([]);
    mockedFriendService.getFriendList.mockResolvedValue({data: []});
    mockedPartyService.getMyParty.mockResolvedValue({data: null, error: null});
    mockedPartyService.getPartyMembers.mockResolvedValue({data: []});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('starts loading immediately on mount without waiting for focus event', async () => {
    const {tree, navigation} = await renderScreen();

    expect(navigation.addListener).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(mockedGameStore.getPlayerId).toHaveBeenCalledTimes(1);
    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(0);

    act(() => {
      tree.unmount();
    });
  });

  test('shows an active raid specific warning when active raid loading throws', async () => {
    mockedRaidService.getActiveInstances.mockRejectedValueOnce(new Error('activeRaids_timeout'));

    const {tree} = await renderScreen();

    expect(tree.root.findByProps({testID: 'raid-load-error-partial'})).toBeTruthy();
    expectText(tree, '활성 레이드 목록을 불러오지 못했습니다. 다시 시도해 주세요.');
    expectText(tree, '일반 레이드는 계속 플레이할 수 있습니다.');
    expectText(tree, 'raid.boss1');

    act(() => {
      tree.unmount();
    });
  });

  test('shows a social warning when party loading returns an error response', async () => {
    mockedPartyService.getMyParty.mockResolvedValueOnce({
      data: null,
      error: {message: 'party lookup failed'},
    });

    const {tree} = await renderScreen();

    expectText(tree, '친구 또는 파티 정보를 일부 불러오지 못했습니다.');
    expectText(tree, '일반 레이드는 계속 플레이할 수 있습니다.');

    act(() => {
      tree.unmount();
    });
  });

  test('shows a generic warning when multiple load groups fail together', async () => {
    mockedRaidService.getActiveInstances.mockRejectedValueOnce(new Error('active query failed'));
    mockedFriendService.getFriendList.mockRejectedValueOnce(new Error('friends query failed'));

    const {tree} = await renderScreen();

    expectText(tree, '일부 레이드 정보를 불러오지 못했습니다. 다시 시도해 주세요.');
    expectText(tree, '일반 레이드는 계속 플레이할 수 있습니다.');

    act(() => {
      tree.unmount();
    });
  });

  test('shows a blocking warning when the player profile cannot load', async () => {
    mockedGameStore.getPlayerId.mockRejectedValueOnce(new Error('playerProfile_timeout'));

    const {tree} = await renderScreen();

    expect(tree.root.findByProps({testID: 'raid-load-error-blocking'})).toBeTruthy();
    expectText(tree, '레이드 정보를 불러오지 못했습니다. 다시 시도해 주세요.');

    act(() => {
      tree.unmount();
    });
  });
});
