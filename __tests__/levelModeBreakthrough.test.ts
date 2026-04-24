import {
  advanceLevelModeBreakthroughState,
  getLevelModeBreakthroughBonusRate,
  normalizeLevelModeBreakthroughState,
  shouldResetLevelModeBreakthroughOnChallenge,
} from '../src/game/levelModeBreakthrough';

describe('level mode breakthrough state', () => {
  test('starts a new streak on first qualifying clear', () => {
    const state = advanceLevelModeBreakthroughState(null, 7, 300);

    expect(state).toEqual({
      consecutiveClears: 1,
      lastClearedLevelId: 7,
      nextLevelId: 8,
    });
  });

  test('extends the streak only when the expected next level is cleared', () => {
    const state = advanceLevelModeBreakthroughState(
      {
        consecutiveClears: 3,
        lastClearedLevelId: 7,
        nextLevelId: 8,
      },
      8,
      300,
    );

    expect(state.consecutiveClears).toBe(4);
    expect(state.nextLevelId).toBe(9);
    expect(getLevelModeBreakthroughBonusRate(state, 0.05)).toBeCloseTo(0.2, 5);
  });

  test('breaks when a non-next level is challenged', () => {
    expect(
      shouldResetLevelModeBreakthroughOnChallenge(
        {
          consecutiveClears: 5,
          lastClearedLevelId: 10,
          nextLevelId: 11,
        },
        13,
      ),
    ).toBe(true);

    expect(
      shouldResetLevelModeBreakthroughOnChallenge(
        {
          consecutiveClears: 5,
          lastClearedLevelId: 10,
          nextLevelId: 11,
        },
        11,
      ),
    ).toBe(false);
  });

  test('normalization removes invalid streak payloads', () => {
    expect(
      normalizeLevelModeBreakthroughState({
        consecutiveClears: 0,
        nextLevelId: 0,
      }),
    ).toBeNull();
  });
});
