jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../src/services/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

import {
  calculateBattleRankingScore,
  calculateLevelRankingScore,
  calculateRaidRankingScore,
} from '../src/services/rankingService';

describe('rankingService scoring', () => {
  it('calculates level ranking score from the agreed formula', () => {
    expect(
      calculateLevelRankingScore({
        levelId: 12,
        stars: 3,
        totalDamage: 40000,
        maxCombo: 7,
      }),
    ).toBe(3000 + 1200 + 1500 + 2000 + 840);
  });

  it('calculates battle ranking score from wins, losses, rematch wins, and streak', () => {
    expect(
      calculateBattleRankingScore({
        wins: 10,
        losses: 4,
        rematchWins: 3,
        bestStreak: 6,
      }),
    ).toBe(10 * 30 + 3 * 5 + 6 * 8 - 4 * 10);
  });

  it('calculates raid ranking score with rank and clear bonuses', () => {
    expect(
      calculateRaidRankingScore({
        bossStage: 5,
        totalDamage: 250000,
        rank: 2,
        bossDefeated: true,
        clearTimeMs: 180000,
      }),
    ).toBe(5000 + 5000 + 700 + 2500 + 1020);
  });
});
