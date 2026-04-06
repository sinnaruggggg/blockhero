const mockGetCurrentUserIdImpl = jest.fn();
const mockGetProfileImpl = jest.fn();
const mockFromImpl = jest.fn();
const mockMaybeSingle = jest.fn();
const mockUpsert = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockUpdate = jest.fn();
const mockSingle = jest.fn();

const mockBuilder = {
  select: mockSelect,
  eq: mockEq,
  maybeSingle: mockMaybeSingle,
  upsert: mockUpsert,
  update: mockUpdate,
  single: mockSingle,
};

function mockGetCurrentUserId(...args: any[]) {
  return mockGetCurrentUserIdImpl(...args);
}

function mockGetProfile(...args: any[]) {
  return mockGetProfileImpl(...args);
}

function mockFrom(...args: any[]) {
  return mockFromImpl(...args);
}

jest.mock('../src/services/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: {subscription: {unsubscribe: jest.fn()}},
      })),
    },
  },
  getCurrentUserId: mockGetCurrentUserId,
  getProfile: mockGetProfile,
}));

import {
  clearPlayerStateCache,
  fetchPlayerState,
  peekPlayerStateCache,
  schedulePlayerStateFlush,
  stagePlayerStatePatch,
} from '../src/services/playerState';

describe('playerState caching and flush queue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearPlayerStateCache();

    mockFromImpl.mockReset();
    mockMaybeSingle.mockReset();
    mockUpsert.mockReset();
    mockSelect.mockReset();
    mockEq.mockReset();
    mockUpdate.mockReset();
    mockSingle.mockReset();
    mockGetCurrentUserIdImpl.mockReset();
    mockGetProfileImpl.mockReset();

    mockSelect.mockReturnValue(mockBuilder);
    mockEq.mockReturnValue(mockBuilder);
    mockUpdate.mockReturnValue(mockBuilder);
    mockSingle.mockResolvedValue({data: null, error: null});
    mockFromImpl.mockReturnValue(mockBuilder);
    mockGetCurrentUserIdImpl.mockResolvedValue('user-1');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reuses the cached player_state row for repeated reads', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        user_id: 'user-1',
        game_data: {gold: 1},
      },
      error: null,
    });

    const first = await fetchPlayerState();
    const second = await fetchPlayerState();

    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  it('batches dirty patches into a single debounced upsert', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        user_id: 'user-1',
        game_data: {gold: 1},
        daily_stats: {games: 0},
      },
      error: null,
    });
    mockUpsert.mockResolvedValue({error: null});

    await fetchPlayerState();

    stagePlayerStatePatch({game_data: {gold: 2}});
    schedulePlayerStateFlush('batched_test', 25);
    stagePlayerStatePatch({daily_stats: {games: 3}});
    schedulePlayerStateFlush('batched_test', 25);

    await jest.advanceTimersByTimeAsync(30);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        user_id: 'user-1',
        game_data: {gold: 2},
        daily_stats: {games: 3},
      },
      {onConflict: 'user_id'},
    );
    expect(peekPlayerStateCache()).toMatchObject({
      user_id: 'user-1',
      game_data: {gold: 2},
      daily_stats: {games: 3},
    });
  });
});
