import type {CharacterData} from '../stores/gameStore';

export interface SkillEffectContext {
  mode?: 'level' | 'endless' | 'raid';
  partySize?: number;
  bossHpRatio?: number;
}

export interface CharacterSkillEffects {
  baseAttackMultiplier: number;
  maxHpMultiplier: number;
  damageTakenReduction: number;
  raidSkillChargeGainMultiplier: number;
  comboDamageBonus: number;
  comboWindowBonusMs: number;
  feverRequirementMultiplier: number;
  feverGaugeGainMultiplier: number;
  feverDurationBonusMs: number;
  feverDamageBonus: number;
  raidDamageMultiplier: number;
  lineClearDamageBonus: number;
  smallPieceChanceBonus: number;
  diamondChanceBonus: number;
  extraDiamondChance: number;
  itemBlockChanceBonus: number;
  endlessDifficultySlowRate: number;
  endlessObstacleSpawnMultiplier: number;
  jackpotDoubleChance: number;
  dodgeChance: number;
  reviveOnce: boolean;
  heartCapacityBonus: number;
  heartRegenMultiplier: number;
  healPerLineClearPercent: number;
  healEveryTwoLinesPercent: number;
  healEveryFiveClearsPercent: number;
  autoHealIntervalMs: number;
  autoHealPercent: number;
  placeHealChance: number;
  placeHealPercent: number;
  itemPreserveChance: number;
  shopGoldDiscount: number;
  shopRefreshDiscount: number;
  rewardGoldMultiplier: number;
  rewardDiamondMultiplier: number;
  raidTimeBonusMs: number;
  doubleAttackChance: number;
  previewCountBonus: number;
  itemCapacityPerTypeBonus: number;
}

const DEFAULT_EFFECTS: CharacterSkillEffects = {
  baseAttackMultiplier: 1,
  maxHpMultiplier: 1,
  damageTakenReduction: 0,
  raidSkillChargeGainMultiplier: 1,
  comboDamageBonus: 0,
  comboWindowBonusMs: 0,
  feverRequirementMultiplier: 1,
  feverGaugeGainMultiplier: 1,
  feverDurationBonusMs: 0,
  feverDamageBonus: 0,
  raidDamageMultiplier: 1,
  lineClearDamageBonus: 0,
  smallPieceChanceBonus: 0,
  diamondChanceBonus: 0,
  extraDiamondChance: 0,
  itemBlockChanceBonus: 0,
  endlessDifficultySlowRate: 0,
  endlessObstacleSpawnMultiplier: 1,
  jackpotDoubleChance: 0,
  dodgeChance: 0,
  reviveOnce: false,
  heartCapacityBonus: 0,
  heartRegenMultiplier: 1,
  healPerLineClearPercent: 0,
  healEveryTwoLinesPercent: 0,
  healEveryFiveClearsPercent: 0,
  autoHealIntervalMs: 0,
  autoHealPercent: 0,
  placeHealChance: 0,
  placeHealPercent: 0,
  itemPreserveChance: 0,
  shopGoldDiscount: 0,
  shopRefreshDiscount: 0,
  rewardGoldMultiplier: 1,
  rewardDiamondMultiplier: 1,
  raidTimeBonusMs: 0,
  doubleAttackChance: 0,
  previewCountBonus: 0,
  itemCapacityPerTypeBonus: 0,
};

function scale(points: number, maxValue: number): number {
  if (points <= 0) {
    return 0;
  }

  return (maxValue * points) / 5;
}

function reductionWithBase(points: number, base: number, perPointAfterFirst: number): number {
  if (points <= 0) {
    return 0;
  }

  return base + Math.max(0, points - 1) * perPointAfterFirst;
}

export function getCharacterSkillEffects(
  characterId: string | null,
  data: CharacterData | null,
  context: SkillEffectContext = {},
): CharacterSkillEffects {
  if (!characterId || !data) {
    return {...DEFAULT_EFFECTS};
  }

  const effects: CharacterSkillEffects = {...DEFAULT_EFFECTS};
  const personal = data.personalAllocations;
  const party = data.partyAllocations;
  const mode = context.mode ?? 'level';
  const partySize = Math.max(1, context.partySize ?? 1);
  const bossHpRatio = context.bossHpRatio ?? 1;

  switch (characterId) {
    case 'knight': {
      effects.damageTakenReduction += reductionWithBase(personal[0] ?? 0, 0.1, 0.05);
      effects.comboDamageBonus += scale(personal[1] ?? 0, 0.1);
      effects.raidSkillChargeGainMultiplier += scale(personal[2] ?? 0, 0.2);
      effects.endlessObstacleSpawnMultiplier *= 1 - scale(personal[5] ?? 0, 0.25);
      if ((personal[8] ?? 0) > 0) {
        effects.reviveOnce = true;
      }
      if ((personal[6] ?? 0) > 0) {
        effects.comboDamageBonus += scale(personal[6] ?? 0, 0.5);
      }

      if (mode === 'raid') {
        effects.damageTakenReduction += scale(party[0] ?? 0, 0.15);
        effects.raidDamageMultiplier += scale(party[2] ?? 0, 0.1);
        if (bossHpRatio <= 0.2) {
          effects.raidDamageMultiplier += scale(party[5] ?? 0, 0.25);
        }
        effects.raidSkillChargeGainMultiplier += scale(party[6] ?? 0, 0.1);
        effects.rewardGoldMultiplier += scale(party[8] ?? 0, 0.1);
        effects.rewardDiamondMultiplier += scale(party[8] ?? 0, 0.1);
        effects.baseAttackMultiplier += Math.min(0.25, scale(party[9] ?? 0, 0.05) * partySize);
      }
      break;
    }
    case 'mage': {
      effects.previewCountBonus += Math.round(scale(personal[0] ?? 0, 3));
      effects.endlessDifficultySlowRate += scale(personal[1] ?? 0, 0.1);
      effects.diamondChanceBonus += scale(personal[5] ?? 0, 0.01);
      effects.feverGaugeGainMultiplier += scale(personal[7] ?? 0, 0.15);

      if (mode === 'raid') {
        effects.baseAttackMultiplier += scale(party[0] ?? 0, 0.05);
        if ((party[1] ?? 0) > 0) {
          effects.previewCountBonus = Math.max(effects.previewCountBonus, 1);
        }
        effects.raidTimeBonusMs += Math.round(scale(party[2] ?? 0, 15000));
        effects.lineClearDamageBonus += scale(party[3] ?? 0, 0.12);
        effects.feverDurationBonusMs += Math.round(scale(party[4] ?? 0, 3000));
        effects.comboWindowBonusMs += Math.round(scale(party[6] ?? 0, 5000));
        if (bossHpRatio <= 0.5) {
          effects.feverRequirementMultiplier *= 1 - scale(party[8] ?? 0, 0.2);
        }
      }
      break;
    }
    case 'archer': {
      effects.smallPieceChanceBonus += scale(personal[0] ?? 0, 0.25);
      effects.feverDamageBonus += scale(personal[3] ?? 0, 0.2);
      effects.feverRequirementMultiplier *= 1 - scale(personal[8] ?? 0, 0.3);
      effects.dodgeChance += scale(personal[9] ?? 0, 0.3);

      if (mode === 'raid') {
        effects.lineClearDamageBonus += scale(party[0] ?? 0, 0.08);
        effects.smallPieceChanceBonus += scale(party[5] ?? 0, 0.1);
        effects.doubleAttackChance += scale(party[8] ?? 0, 0.05);
        effects.doubleAttackChance += Math.min(
          0.2,
          scale(party[9] ?? 0, 0.04) * partySize,
        );
      }
      break;
    }
    case 'rogue': {
      effects.diamondChanceBonus += scale(personal[0] ?? 0, 0.05);
      effects.extraDiamondChance += scale(personal[0] ?? 0, 0.1);
      effects.itemBlockChanceBonus += scale(personal[1] ?? 0, 0.1);
      effects.jackpotDoubleChance += scale(personal[2] ?? 0, 0.1);
      effects.itemCapacityPerTypeBonus += Math.round(scale(personal[8] ?? 0, 1));
      effects.shopGoldDiscount += scale(personal[9] ?? 0, 0.15);
      effects.shopRefreshDiscount += scale(personal[9] ?? 0, 0.3);

      if (mode === 'raid') {
        effects.rewardGoldMultiplier += scale(party[0] ?? 0, 0.1);
        effects.rewardDiamondMultiplier += scale(party[0] ?? 0, 0.1);
      }
      break;
    }
    case 'healer': {
      if ((personal[0] ?? 0) > 0) {
        effects.autoHealIntervalMs = 60000;
        effects.autoHealPercent += scale(personal[0] ?? 0, 0.1);
      }
      effects.heartCapacityBonus += Math.round(scale(personal[3] ?? 0, 1));
      effects.heartRegenMultiplier *= 1 - scale(personal[3] ?? 0, 0.2);
      effects.healEveryTwoLinesPercent += scale(personal[4] ?? 0, 0.05);
      effects.comboWindowBonusMs += Math.round(scale(personal[5] ?? 0, 3000));
      effects.itemPreserveChance += scale(personal[7] ?? 0, 0.2);
      effects.healPerLineClearPercent += scale(personal[9] ?? 0, 0.01);
      effects.healEveryFiveClearsPercent += scale(personal[2] ?? 0, 0.15);

      if (mode === 'raid') {
        effects.placeHealChance += scale(party[0] ?? 0, 0.05);
        effects.placeHealPercent += scale(party[0] ?? 0, 0.05);
        effects.raidTimeBonusMs += Math.round(scale(party[4] ?? 0, 60000));
        effects.rewardGoldMultiplier += scale(party[6] ?? 0, 0.1);
        effects.rewardDiamondMultiplier += scale(party[6] ?? 0, 0.1);
        effects.maxHpMultiplier += Math.min(0.3, scale(party[9] ?? 0, 0.03) * partySize);
      }
      break;
    }
    default:
      break;
  }

  return effects;
}

export function applyDamageTakenReduction(damage: number, effects: CharacterSkillEffects): number {
  return Math.max(0, Math.round(damage * (1 - effects.damageTakenReduction)));
}

export function applyCombatDamageEffects(
  baseAmount: number,
  effects: CharacterSkillEffects,
  context: {
    combo: number;
    didClear: boolean;
    feverActive: boolean;
    usedSmallPieceStreak?: boolean;
    isRaid?: boolean;
  },
): number {
  let value = baseAmount;

  if (context.combo > 0) {
    value *= 1 + effects.comboDamageBonus;
  }

  if (context.didClear) {
    value *= 1 + effects.lineClearDamageBonus;
  }

  if (context.feverActive) {
    value *= 1 + effects.feverDamageBonus;
  }

  if (context.usedSmallPieceStreak) {
    value *= 1 + 0.2;
  }

  if (context.isRaid) {
    value *= effects.raidDamageMultiplier;
  }

  if (effects.jackpotDoubleChance > 0 && Math.random() < effects.jackpotDoubleChance) {
    value *= 2;
  }

  if (effects.doubleAttackChance > 0 && Math.random() < effects.doubleAttackChance) {
    value *= 2;
  }

  return Math.max(0, Math.round(value));
}

export function getDynamicHeartCap(baseHearts: number, effects: CharacterSkillEffects): number {
  return baseHearts + effects.heartCapacityBonus;
}

export function getDynamicHeartRegenMs(baseMs: number, effects: CharacterSkillEffects): number {
  return Math.round(baseMs * effects.heartRegenMultiplier);
}

export function getDynamicItemCapPerType(baseCap: number, effects: CharacterSkillEffects): number {
  return baseCap + effects.itemCapacityPerTypeBonus;
}

export function shouldPreserveItem(effects: CharacterSkillEffects): boolean {
  return effects.itemPreserveChance > 0 && Math.random() < effects.itemPreserveChance;
}

export function shouldDodgeAttack(effects: CharacterSkillEffects): boolean {
  return effects.dodgeChance > 0 && Math.random() < effects.dodgeChance;
}

export function getPieceGenerationOptions(effects: CharacterSkillEffects) {
  return {
    smallPieceChanceBonus: effects.smallPieceChanceBonus,
    gemChanceBonus: effects.diamondChanceBonus,
    itemChanceBonus: effects.itemBlockChanceBonus,
  };
}

export function applyRewardMultipliers(
  gold: number,
  diamonds: number,
  effects: CharacterSkillEffects,
) {
  let nextDiamonds = Math.round(diamonds * effects.rewardDiamondMultiplier);
  if (nextDiamonds > 0 && effects.extraDiamondChance > 0 && Math.random() < effects.extraDiamondChance) {
    nextDiamonds += 1;
  }

  return {
    gold: Math.round(gold * effects.rewardGoldMultiplier),
    diamonds: nextDiamonds,
  };
}
