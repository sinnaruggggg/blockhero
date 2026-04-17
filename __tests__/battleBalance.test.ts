import {
  getLevelEnemyStats,
  getNormalRaidAttackStats,
  getRaidBossAttackStats,
} from '../src/game/battleBalance';

describe('battleBalance', () => {
  it('calculates level enemy attack and interval by stage tier', () => {
    expect(getLevelEnemyStats(1, 1)).toEqual({
      attack: 12,
      attackIntervalMs: 5000,
      tier: 'normal',
    });

    expect(getLevelEnemyStats(9, 1)).toEqual({
      attack: 17,
      attackIntervalMs: 4000,
      tier: 'elite',
    });

    expect(getLevelEnemyStats(30, 1)).toEqual({
      attack: 27,
      attackIntervalMs: 3000,
      tier: 'boss',
    });
  });

  it('calculates normal raid attack stats from stage', () => {
    expect(getNormalRaidAttackStats(1)).toEqual({
      attack: 16,
      attackIntervalMs: 3000,
      tier: 'boss',
    });

    expect(getNormalRaidAttackStats(10)).toEqual({
      attack: 41,
      attackIntervalMs: 3000,
      tier: 'boss',
    });
  });

  it('calculates boss raid attack stats as double the normal raid', () => {
    expect(getRaidBossAttackStats(1)).toEqual({
      attack: 32,
      attackIntervalMs: 3000,
      tier: 'boss',
    });

    expect(getRaidBossAttackStats(10)).toEqual({
      attack: 82,
      attackIntervalMs: 3000,
      tier: 'boss',
    });
  });
});
