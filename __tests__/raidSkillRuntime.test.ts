import {
  consumeRaidSkillGauge,
  formatRaidSkillMultiplier,
  getRaidSkillCharges,
  getRaidSkillEffectiveMultiplier,
  getRaidSkillGaugeGain,
  getRaidSkillLevels,
  getRaidSkillPreview,
  getRaidSkillThreshold,
} from '../src/game/raidSkillRuntime';

describe('raidSkillRuntime', () => {
  test('reads persisted raid skill levels from item keys', () => {
    const levels = getRaidSkillLevels({
      raidSkill_0: 0,
      raidSkill_1: 2,
      raidSkill_2: 3,
      raidSkill_3: 1,
      raidSkill_4: 0,
      raidSkill_5: 5,
    });

    expect(levels[3]).toBe(2);
    expect(levels[7]).toBe(3);
    expect(levels[50]).toBe(5);
  });

  test('upgrades increase multiplier and reduce gauge threshold', () => {
    expect(getRaidSkillEffectiveMultiplier(20, 3)).toBeGreaterThan(20);
    expect(getRaidSkillThreshold(200, 3)).toBeLessThan(200);
  });

  test('preview returns current and next upgrade values', () => {
    const preview = getRaidSkillPreview(12, 100, 2);

    expect(preview.currentMultiplier).toBeGreaterThan(12);
    expect(preview.nextMultiplier).toBeGreaterThan(preview.currentMultiplier);
    expect(preview.nextThreshold).toBeLessThan(preview.currentThreshold);
  });

  test('multiplier labels are formatted for UI', () => {
    expect(formatRaidSkillMultiplier(3)).toBe('x3');
    expect(formatRaidSkillMultiplier(3.5)).toBe('x3.5');
  });

  test('raid skill gauge only fills from line clears', () => {
    expect(getRaidSkillGaugeGain(0, 1)).toBe(0);
    expect(getRaidSkillGaugeGain(2, 1)).toBe(16);
    expect(getRaidSkillGaugeGain(1, 0.5)).toBe(4);
  });

  test('shared gauge exposes lower and higher skill counts from the same pool', () => {
    const charges = getRaidSkillCharges(80);

    expect(charges[3]).toBe(4);
    expect(charges[7]).toBe(1);
    expect(charges[12]).toBe(0);
  });

  test('consuming a higher skill also reduces lower tier available counts', () => {
    const spent = consumeRaidSkillGauge(80, 7);
    const remainingCharges = getRaidSkillCharges(spent.nextGauge);

    expect(spent.consumed).toBe(true);
    expect(spent.nextGauge).toBe(30);
    expect(remainingCharges[3]).toBe(1);
    expect(remainingCharges[7]).toBe(0);
  });
});
