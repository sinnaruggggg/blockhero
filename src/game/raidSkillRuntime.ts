import {RAID_SKILLS} from '../constants';

export const MAX_RAID_SKILL_LEVEL = 5;

export function formatRaidSkillMultiplier(multiplier: number): string {
  const rounded = Math.round(multiplier * 10) / 10;
  return Number.isInteger(rounded) ? `x${rounded}` : `x${rounded.toFixed(1)}`;
}

export function getRaidSkillLevels(
  items: Record<string, number | undefined>,
): Record<number, number> {
  return RAID_SKILLS.reduce<Record<number, number>>((accumulator, skill, index) => {
    accumulator[skill.multiplier] = Math.max(0, Math.min(
      MAX_RAID_SKILL_LEVEL,
      Number(items[`raidSkill_${index}`] ?? 0),
    ));
    return accumulator;
  }, {});
}

export function getRaidSkillThreshold(
  baseThreshold: number,
  level: number,
): number {
  if (baseThreshold <= 0) {
    return 0;
  }

  const reductionRate = Math.min(0.4, level * 0.08);
  return Math.max(1, Math.round(baseThreshold * (1 - reductionRate)));
}

export function getRaidSkillEffectiveMultiplier(
  baseMultiplier: number,
  level: number,
): number {
  if (baseMultiplier <= 1) {
    return 1;
  }

  return Math.round(baseMultiplier * (1 + level * 0.1) * 10) / 10;
}

export function getRaidSkillGaugeGain(
  linesCleared: number,
  gainMultiplier = 1,
): number {
  if (linesCleared <= 0) {
    return 0;
  }

  const safeMultiplier = Math.max(0, gainMultiplier);
  return Math.max(1, Math.round(linesCleared * 8 * safeMultiplier));
}

export function getRaidSkillCharges(
  gauge: number,
  levels: Record<number, number> = {},
): Record<number, number> {
  const safeGauge = Math.max(0, Math.floor(gauge));

  return RAID_SKILLS.reduce<Record<number, number>>((accumulator, skill) => {
    if (skill.multiplier === 1) {
      return accumulator;
    }

    const threshold = getRaidSkillThreshold(
      skill.gaugeThreshold,
      levels[skill.multiplier] ?? 0,
    );
    accumulator[skill.multiplier] = Math.floor(safeGauge / threshold);
    return accumulator;
  }, {
    3: 0,
    7: 0,
    12: 0,
    20: 0,
    50: 0,
  });
}

export function consumeRaidSkillGauge(
  gauge: number,
  multiplier: number,
  levels: Record<number, number> = {},
): {
  consumed: boolean;
  nextGauge: number;
  cost: number;
} {
  const safeGauge = Math.max(0, Math.floor(gauge));
  const skill = RAID_SKILLS.find(entry => entry.multiplier === multiplier);

  if (!skill || multiplier <= 1) {
    return {
      consumed: false,
      nextGauge: safeGauge,
      cost: 0,
    };
  }

  const cost = getRaidSkillThreshold(
    skill.gaugeThreshold,
    levels[multiplier] ?? 0,
  );

  if (safeGauge < cost) {
    return {
      consumed: false,
      nextGauge: safeGauge,
      cost,
    };
  }

  return {
    consumed: true,
    nextGauge: safeGauge - cost,
    cost,
  };
}

export function getRaidSkillPreview(baseMultiplier: number, baseThreshold: number, level: number) {
  const safeLevel = Math.max(0, Math.min(MAX_RAID_SKILL_LEVEL, level));
  const nextLevel = Math.min(MAX_RAID_SKILL_LEVEL, safeLevel + 1);

  return {
    currentMultiplier: getRaidSkillEffectiveMultiplier(baseMultiplier, safeLevel),
    nextMultiplier: getRaidSkillEffectiveMultiplier(baseMultiplier, nextLevel),
    currentThreshold: getRaidSkillThreshold(baseThreshold, safeLevel),
    nextThreshold: getRaidSkillThreshold(baseThreshold, nextLevel),
  };
}
