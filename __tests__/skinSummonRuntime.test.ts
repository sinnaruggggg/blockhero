import {
  applySkinCombatDamage,
  applySummonExp,
  getActiveSkinLoadout,
  getSkinBattleEffects,
  mergeSkinPieceGenerationOptions,
} from '../src/game/skinSummonRuntime';

describe('skinSummonRuntime', () => {
  test('active skin loadout applies attack bonus and summon attack', () => {
    const loadout = getActiveSkinLoadout({
      activeSkinId: 5,
      summonProgress: {
        5: {level: 3, exp: 0, evolutionTier: 1},
      },
    });

    expect(loadout.effects.attackBonusMultiplier).toBeCloseTo(1.1);
    expect(loadout.effects.rewardGoldMultiplier).toBeCloseTo(1.1);
    expect(loadout.summonAttack).toBeGreaterThan(0);
    expect(loadout.summonGaugeRequired).toBe(100);
  });

  test('skin piece generation bonuses are merged', () => {
    const merged = mergeSkinPieceGenerationOptions(
      {smallPieceChanceBonus: 0.05},
      8,
    );

    expect(merged.smallPieceChanceBonus).toBeCloseTo(0.15);
  });

  test('double attack skin can double damage deterministically', () => {
    const result = applySkinCombatDamage(
      100,
      7,
      {combo: 0, didClear: false},
      0.01,
    );

    expect(result.doubled).toBe(true);
    expect(result.damage).toBe(200);
  });

  test('summon experience levels up summon progress', () => {
    const progressed = applySummonExp(
      {level: 1, exp: 0, evolutionTier: 1},
      220,
    );

    expect(progressed.level).toBeGreaterThan(1);
    expect(progressed.evolutionTier).toBe(1);
  });

  test('skin 4 reduces incoming damage and skin 6 extends fever time', () => {
    expect(getSkinBattleEffects(4).damageTakenMultiplier).toBeCloseTo(0.92);
    expect(getSkinBattleEffects(6).feverDurationBonusMs).toBe(1000);
  });
});

