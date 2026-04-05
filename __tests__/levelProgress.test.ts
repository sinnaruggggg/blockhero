import {LEVELS, WORLDS} from '../src/constants';
import {
  getLevelClearRewards,
  getNextUnlockedLevel,
  getUnlockedBossRaidStages,
  getWorldProgressSummary,
} from '../src/game/levelProgress';
import type {LevelProgress} from '../src/stores/gameStore';

describe('level mode progression', () => {
  it('keeps the 10 world / 300 stage structure intact', () => {
    expect(WORLDS).toHaveLength(10);
    expect(LEVELS).toHaveLength(300);

    for (const world of WORLDS) {
      expect(LEVELS.filter(level => level.world === world.id)).toHaveLength(30);
    }
  });

  it('returns the first uncleared stage as the next unlocked level', () => {
    const progress: LevelProgress = {
      1: {cleared: true, stars: 3, highScore: 100},
      2: {cleared: true, stars: 3, highScore: 100},
      3: {cleared: false, stars: 0, highScore: 0},
    };

    expect(getNextUnlockedLevel(progress)).toBe(3);
  });

  it('unlocks boss raid stages when a world is fully cleared', () => {
    const progress: LevelProgress = {};
    for (let levelId = 1; levelId <= 30; levelId += 1) {
      progress[levelId] = {cleared: true, stars: 3, highScore: 1000};
    }

    expect(getWorldProgressSummary(progress, 1)).toEqual({
      cleared: 30,
      total: 30,
      completed: true,
    });
    expect(getUnlockedBossRaidStages(progress)).toEqual([1]);
  });

  it('calculates first-clear and repeat-clear rewards separately', () => {
    expect(getLevelClearRewards(4, 95, false)).toEqual({
      gold: 97,
      xp: 210000,
    });
    expect(getLevelClearRewards(4, 95, true)).toEqual({
      gold: 51,
      xp: 210000,
    });
  });
});
