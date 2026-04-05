import {
  getLevelEnemyStats,
  getRaidBossAttackStats,
} from '../src/game/battleBalance';

describe('battleBalance', () => {
  it('calculates level enemy attack and interval by stage tier', () => {
    expect(getLevelEnemyStats(1, 1)).toEqual({
      attack: 22,
      attackIntervalMs: 10000,
      tier: 'normal',
    });

    expect(getLevelEnemyStats(9, 1)).toEqual({
      attack: 30,
      attackIntervalMs: 8000,
      tier: 'elite',
    });

    expect(getLevelEnemyStats(30, 1)).toEqual({
      attack: 49,
      attackIntervalMs: 6000,
      tier: 'boss',
    });
  });

  it('calculates raid boss attack stats from stage', () => {
    expect(getRaidBossAttackStats(1)).toEqual({
      attack: 15,
      attackIntervalMs: 6000,
      tier: 'boss',
    });

    expect(getRaidBossAttackStats(10)).toEqual({
      attack: 37,
      attackIntervalMs: 6000,
      tier: 'boss',
    });
  });
});
