import {
  getLevelEnemyStats,
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

  it('calculates raid boss attack stats from stage', () => {
    expect(getRaidBossAttackStats(1)).toEqual({
      attack: 16,
      attackIntervalMs: 1500,
      tier: 'boss',
    });

    expect(getRaidBossAttackStats(10)).toEqual({
      attack: 42,
      attackIntervalMs: 1500,
      tier: 'boss',
    });
  });
});
