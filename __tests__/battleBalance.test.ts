import {
  getAdjustedLevelMonsterHp,
  getLevelEnemyStats,
  getLevelWorldBonusMultiplier,
  getRaidBossAttackStats,
} from '../src/game/battleBalance';

describe('battleBalance', () => {
  it('calculates level enemy attack and interval by stage tier', () => {
    expect(getLevelEnemyStats(1, 1)).toEqual({
      attack: 9,
      attackIntervalMs: 2500,
      tier: 'normal',
    });

    expect(getLevelEnemyStats(9, 1)).toEqual({
      attack: 13,
      attackIntervalMs: 2000,
      tier: 'elite',
    });

    expect(getLevelEnemyStats(30, 1)).toEqual({
      attack: 20,
      attackIntervalMs: 1500,
      tier: 'boss',
    });
  });

  it('applies a 10 percent level monster bonus per world after world 1', () => {
    expect(getLevelWorldBonusMultiplier(1)).toBe(1);
    expect(getLevelWorldBonusMultiplier(4)).toBeCloseTo(1.3);
    expect(getLevelWorldBonusMultiplier(10)).toBeCloseTo(1.9);

    expect(getLevelEnemyStats(31, 2)).toMatchObject({ attack: 12 });
    expect(getLevelEnemyStats(91, 4)).toMatchObject({ attack: 21 });
    expect(getAdjustedLevelMonsterHp(800, 4)).toBe(6240);
    expect(getAdjustedLevelMonsterHp(800, 10)).toBe(9120);
  });

  it('calculates raid boss attack stats from stage', () => {
    expect(getRaidBossAttackStats(1)).toEqual({
      attack: 80,
      attackIntervalMs: 1500,
      tier: 'boss',
    });

    expect(getRaidBossAttackStats(10)).toEqual({
      attack: 210,
      attackIntervalMs: 1500,
      tier: 'boss',
    });
  });
});
