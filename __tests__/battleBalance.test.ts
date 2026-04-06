import {
  getLevelEnemyStats,
  getRaidBossAttackStats,
} from '../src/game/battleBalance';

describe('battleBalance', () => {
  it('calculates level enemy attack and interval by stage tier', () => {
    expect(getLevelEnemyStats(1, 1)).toEqual({
      attack: 24,
      attackIntervalMs: 5000,
      tier: 'normal',
    });

    expect(getLevelEnemyStats(9, 1)).toEqual({
      attack: 33,
      attackIntervalMs: 4000,
      tier: 'elite',
    });

    expect(getLevelEnemyStats(30, 1)).toEqual({
      attack: 54,
      attackIntervalMs: 3000,
      tier: 'boss',
    });
  });

  it('calculates raid boss attack stats from stage', () => {
    expect(getRaidBossAttackStats(1)).toEqual({
      attack: 16,
      attackIntervalMs: 3000,
      tier: 'boss',
    });

    expect(getRaidBossAttackStats(10)).toEqual({
      attack: 41,
      attackIntervalMs: 3000,
      tier: 'boss',
    });
  });
});
