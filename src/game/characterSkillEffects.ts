import type { CharacterData } from '../stores/gameStore';
import {
  SKILL_EFFECT_BOOLEAN_FIELDS,
  SKILL_EFFECT_FIELD_DEFINITIONS,
  SKILL_EFFECT_NUMERIC_FIELDS,
} from './skillEffectCatalog';

export interface SkillEffectContext {
  mode?: 'level' | 'endless' | 'raid' | 'battle';
  partySize?: number;
  bossHpRatio?: number;
  levelModeBreakthroughCount?: number;
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
  adjacentLineClearChance: number;
  extraLineClearChance: number;
  blockSummonChance: number;
  blockSummonMaxCells: number;
  magicTransformChance: number;
  magicTransformCellCount: number;
  randomLineClearChance: number;
  randomLineClearComboThreshold: number;
  fastPlacementDamageBonus: number;
  fastPlacementWindowMs: number;
  multiLineDamageBonus: number;
  placementDamageReduction: number;
  placementDamageReductionWindowMs: number;
  rewardJackpotChance: number;
  rewardJackpotMultiplier: number;
  raidActiveSkillDamageBonus: number;
  battleExtraAttackLineChance: number;
  battleCounterAttackChance: number;
  levelModeBreakthroughAttackPerClear: number;
}

export type CombatDamageEffectEvent =
  | 'combo_bonus'
  | 'line_clear_bonus'
  | 'fever_bonus'
  | 'small_piece_chain'
  | 'fast_placement'
  | 'raid_bonus'
  | 'jackpot_double'
  | 'double_attack';

export interface CombatDamageEffectDetail {
  event: CombatDamageEffectEvent;
  bonusAmount: number;
}

export interface CombatDamageEffectResult {
  amount: number;
  events: CombatDamageEffectEvent[];
  details: CombatDamageEffectDetail[];
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
  adjacentLineClearChance: 0,
  extraLineClearChance: 0,
  blockSummonChance: 0,
  blockSummonMaxCells: 0,
  magicTransformChance: 0,
  magicTransformCellCount: 0,
  randomLineClearChance: 0,
  randomLineClearComboThreshold: 0,
  fastPlacementDamageBonus: 0,
  fastPlacementWindowMs: 0,
  multiLineDamageBonus: 0,
  placementDamageReduction: 0,
  placementDamageReductionWindowMs: 0,
  rewardJackpotChance: 0,
  rewardJackpotMultiplier: 1,
  raidActiveSkillDamageBonus: 0,
  battleExtraAttackLineChance: 0,
  battleCounterAttackChance: 0,
  levelModeBreakthroughAttackPerClear: 0,
};

function scale(points: number, maxValue: number): number {
  if (points <= 0) {
    return 0;
  }

  return (maxValue * points) / 5;
}

function reductionWithBase(
  points: number,
  base: number,
  perPointAfterFirst: number,
): number {
  if (points <= 0) {
    return 0;
  }

  return base + Math.max(0, points - 1) * perPointAfterFirst;
}

function getBlockSummonMaxCells(points: number): number {
  if (points <= 0) {
    return 0;
  }

  return points >= 4 ? 2 : 1;
}

function getMagicTransformCellCount(points: number): number {
  if (points <= 0) {
    return 0;
  }

  if (points >= 5) {
    return 4;
  }

  if (points >= 3) {
    return 2;
  }

  return 1;
}

function applyCreatorSkillBalance(
  characterId: string,
  effects: CharacterSkillEffects,
): CharacterSkillEffects {
  try {
    const {getCachedCreatorManifest} = require('../services/creatorService') as {
      getCachedCreatorManifest: () => {
        balance?: {
          skillEffects?: {
            global?: {
              numeric?: Partial<Record<string, number>>;
              booleans?: Partial<Record<string, boolean>>;
            };
            characters?: Record<
              string,
              {
                numeric?: Partial<Record<string, number>>;
                booleans?: Partial<Record<string, boolean>>;
              }
            >;
          };
        };
      };
    };
    const manifest = getCachedCreatorManifest?.();
    const globalBalance = manifest?.balance?.skillEffects?.global;
    const characterBalance =
      manifest?.balance?.skillEffects?.characters?.[characterId];
    const nextEffects: CharacterSkillEffects = {...effects};

    SKILL_EFFECT_NUMERIC_FIELDS.forEach(field => {
      const definition = SKILL_EFFECT_FIELD_DEFINITIONS.find(
        entry => entry.key === field,
      );
      const neutralValue = Number(definition?.neutral ?? 0);
      const currentValue = Number(nextEffects[field]);
      if (!Number.isFinite(currentValue)) {
        return;
      }

      const globalMultiplier = Number(globalBalance?.numeric?.[field] ?? 1);
      const characterMultiplier = Number(
        characterBalance?.numeric?.[field] ?? 1,
      );
      const nextValue =
        neutralValue +
        (currentValue - neutralValue) * globalMultiplier * characterMultiplier;

      nextEffects[field] =
        definition?.type === 'int'
          ? Math.round(nextValue)
          : nextValue;
    });

    SKILL_EFFECT_BOOLEAN_FIELDS.forEach(field => {
      if (typeof characterBalance?.booleans?.[field] === 'boolean') {
        nextEffects[field] = characterBalance.booleans[field];
        return;
      }
      if (typeof globalBalance?.booleans?.[field] === 'boolean') {
        nextEffects[field] = globalBalance.booleans[field];
      }
    });

    return nextEffects;
  } catch {
    return effects;
  }
}

export function getCharacterSkillEffects(
  characterId: string | null,
  data: CharacterData | null,
  context: SkillEffectContext = {},
): CharacterSkillEffects {
  if (!characterId || !data) {
    return { ...DEFAULT_EFFECTS };
  }

  const effects: CharacterSkillEffects = { ...DEFAULT_EFFECTS };
  const personal = data.personalAllocations;
  const party = data.partyAllocations;
  const mode = context.mode ?? 'level';
  const partySize = Math.max(1, context.partySize ?? 1);
  const bossHpRatio = context.bossHpRatio ?? 1;
  const levelModeBreakthroughCount = Math.max(
    0,
    context.levelModeBreakthroughCount ?? 0,
  );

  switch (characterId) {
    case 'knight': {
      effects.damageTakenReduction += reductionWithBase(
        personal[0] ?? 0,
        0.1,
        0.05,
      );
      effects.comboDamageBonus += scale(personal[1] ?? 0, 0.1);
      effects.raidSkillChargeGainMultiplier += scale(personal[2] ?? 0, 0.2);
      if (mode === 'battle') {
        effects.battleExtraAttackLineChance += scale(personal[3] ?? 0, 0.5);
        effects.battleCounterAttackChance += scale(personal[7] ?? 0, 0.25);
      }
      if (mode === 'level') {
        effects.levelModeBreakthroughAttackPerClear +=
          (personal[4] ?? 0) * 0.01;
        effects.baseAttackMultiplier +=
          effects.levelModeBreakthroughAttackPerClear *
          levelModeBreakthroughCount;
      }
      effects.endlessObstacleSpawnMultiplier *=
        1 - scale(personal[5] ?? 0, 0.25);
      if ((personal[8] ?? 0) > 0) {
        effects.reviveOnce = true;
      }
      if ((personal[6] ?? 0) > 0) {
        effects.comboDamageBonus += scale(personal[6] ?? 0, 0.5);
      }
      effects.adjacentLineClearChance += scale(personal[9] ?? 0, 0.2);

      if (mode === 'raid') {
        effects.damageTakenReduction += scale(party[0] ?? 0, 0.15);
        effects.damageTakenReduction += scale(party[1] ?? 0, 0.08);
        effects.raidDamageMultiplier += scale(party[2] ?? 0, 0.1);
        effects.raidActiveSkillDamageBonus += scale(party[3] ?? 0, 0.15);
        effects.damageTakenReduction += scale(party[4] ?? 0, 0.08);
        if (bossHpRatio <= 0.2) {
          effects.raidDamageMultiplier += scale(party[5] ?? 0, 0.25);
        }
        effects.raidSkillChargeGainMultiplier += scale(party[6] ?? 0, 0.1);
        if ((party[7] ?? 0) > 0) {
          effects.reviveOnce = true;
          effects.maxHpMultiplier += scale(party[7] ?? 0, 0.08);
        }
        effects.rewardGoldMultiplier += scale(party[8] ?? 0, 0.1);
        effects.rewardDiamondMultiplier += scale(party[8] ?? 0, 0.1);
        effects.baseAttackMultiplier += Math.min(
          0.25,
          scale(party[9] ?? 0, 0.05) * partySize,
        );
      }
      break;
    }
    case 'mage': {
      effects.previewCountBonus += Math.round(scale(personal[0] ?? 0, 3));
      effects.endlessDifficultySlowRate += scale(personal[1] ?? 0, 0.1);
      effects.extraLineClearChance += scale(personal[2] ?? 0, 0.2);
      effects.placementDamageReduction += scale(personal[3] ?? 0, 0.18);
      effects.placementDamageReductionWindowMs = Math.max(
        effects.placementDamageReductionWindowMs,
        Math.round(scale(personal[3] ?? 0, 4000)),
      );
      effects.blockSummonChance += (personal[4] ?? 0) * 0.02;
      effects.blockSummonMaxCells = Math.max(
        effects.blockSummonMaxCells,
        getBlockSummonMaxCells(personal[4] ?? 0),
      );
      effects.diamondChanceBonus += (personal[5] ?? 0) * 0.01;
      effects.previewCountBonus += Math.round(scale(personal[6] ?? 0, 1));
      effects.feverGaugeGainMultiplier += scale(personal[7] ?? 0, 0.15);
      effects.randomLineClearChance += scale(personal[8] ?? 0, 0.18);
      effects.randomLineClearComboThreshold = Math.max(
        effects.randomLineClearComboThreshold,
        (personal[8] ?? 0) > 0 ? 4 : 0,
      );
      effects.magicTransformChance += scale(personal[9] ?? 0, 0.12);
      effects.magicTransformCellCount = Math.max(
        effects.magicTransformCellCount,
        getMagicTransformCellCount(personal[9] ?? 0),
      );

      if (mode === 'raid') {
        effects.baseAttackMultiplier += scale(party[0] ?? 0, 0.05);
        if ((party[1] ?? 0) > 0) {
          effects.previewCountBonus = Math.max(effects.previewCountBonus, 1);
        }
        effects.raidTimeBonusMs += Math.round(scale(party[2] ?? 0, 15000));
        effects.lineClearDamageBonus += scale(party[3] ?? 0, 0.12);
        effects.feverDurationBonusMs += Math.round(scale(party[4] ?? 0, 3000));
        effects.raidSkillChargeGainMultiplier += scale(party[5] ?? 0, 0.08);
        effects.comboWindowBonusMs += Math.round(scale(party[6] ?? 0, 5000));
        effects.damageTakenReduction += scale(party[7] ?? 0, 0.08);
        if (bossHpRatio <= 0.5) {
          effects.feverRequirementMultiplier *= 1 - scale(party[8] ?? 0, 0.2);
        }
        effects.feverGaugeGainMultiplier += scale(party[9] ?? 0, 0.12);
      }
      break;
    }
    case 'archer': {
      effects.smallPieceChanceBonus += scale(personal[0] ?? 0, 0.25);
      effects.fastPlacementDamageBonus += scale(personal[1] ?? 0, 0.2);
      effects.fastPlacementWindowMs = Math.max(
        effects.fastPlacementWindowMs,
        Math.round(scale(personal[1] ?? 0, 3000)),
      );
      effects.multiLineDamageBonus += scale(personal[2] ?? 0, 0.15);
      effects.feverDamageBonus += scale(personal[3] ?? 0, 0.2);
      effects.randomLineClearChance += scale(personal[4] ?? 0, 0.16);
      effects.randomLineClearComboThreshold = Math.max(
        effects.randomLineClearComboThreshold,
        (personal[4] ?? 0) > 0 ? 5 : 0,
      );
      effects.lineClearDamageBonus += scale(personal[5] ?? 0, 0.05);
      effects.lineClearDamageBonus += scale(personal[6] ?? 0, 0.08);
      effects.feverDamageBonus += scale(personal[7] ?? 0, 0.15);
      effects.feverRequirementMultiplier *= 1 - scale(personal[8] ?? 0, 0.3);
      effects.dodgeChance += scale(personal[9] ?? 0, 0.3);

      if (mode === 'raid') {
        effects.lineClearDamageBonus += scale(party[0] ?? 0, 0.08);
        effects.raidTimeBonusMs += Math.round(scale(party[1] ?? 0, 10000));
        effects.comboDamageBonus += scale(party[2] ?? 0, 0.08);
        effects.raidDamageMultiplier += scale(party[3] ?? 0, 0.08);
        effects.raidTimeBonusMs += Math.round(scale(party[4] ?? 0, 8000));
        effects.smallPieceChanceBonus += scale(party[5] ?? 0, 0.1);
        effects.fastPlacementDamageBonus += scale(party[6] ?? 0, 0.08);
        effects.fastPlacementWindowMs = Math.max(
          effects.fastPlacementWindowMs,
          Math.round(scale(party[6] ?? 0, 2500)),
        );
        effects.lineClearDamageBonus += scale(party[7] ?? 0, 0.08);
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
      effects.smallPieceChanceBonus += scale(personal[3] ?? 0, 0.08);
      effects.placementDamageReduction += scale(personal[4] ?? 0, 0.2);
      effects.placementDamageReductionWindowMs = Math.max(
        effects.placementDamageReductionWindowMs,
        Math.round(scale(personal[4] ?? 0, 2500)),
      );
      effects.rewardGoldMultiplier += scale(personal[5] ?? 0, 0.1);
      effects.rewardDiamondMultiplier += scale(personal[5] ?? 0, 0.05);
      effects.doubleAttackChance += scale(personal[6] ?? 0, 0.05);
      effects.rewardJackpotChance += scale(personal[7] ?? 0, 0.15);
      effects.rewardJackpotMultiplier = Math.max(
        effects.rewardJackpotMultiplier,
        2 + Math.round(scale(personal[7] ?? 0, 1)),
      );
      effects.itemCapacityPerTypeBonus += Math.round(
        scale(personal[8] ?? 0, 1),
      );
      effects.shopGoldDiscount += scale(personal[9] ?? 0, 0.15);
      effects.shopRefreshDiscount += scale(personal[9] ?? 0, 0.3);

      if (mode === 'raid') {
        effects.rewardGoldMultiplier += scale(party[0] ?? 0, 0.1);
        effects.rewardDiamondMultiplier += scale(party[0] ?? 0, 0.1);
        effects.rewardGoldMultiplier += scale(party[1] ?? 0, 0.08);
        effects.rewardDiamondMultiplier += scale(party[1] ?? 0, 0.08);
        effects.damageTakenReduction += scale(party[2] ?? 0, 0.06);
        effects.raidTimeBonusMs += Math.round(scale(party[3] ?? 0, 8000));
        effects.raidDamageMultiplier += scale(party[4] ?? 0, 0.08);
        effects.lineClearDamageBonus += scale(party[5] ?? 0, 0.08);
        effects.rewardGoldMultiplier += scale(party[6] ?? 0, 0.08);
        effects.rewardDiamondMultiplier += scale(party[6] ?? 0, 0.08);
        effects.raidDamageMultiplier += scale(party[7] ?? 0, 0.08);
        if ((party[8] ?? 0) > 0) {
          effects.reviveOnce = true;
          effects.raidTimeBonusMs += Math.round(scale(party[8] ?? 0, 15000));
        }
        effects.raidSkillChargeGainMultiplier += scale(party[9] ?? 0, 0.05);
      }
      break;
    }
    case 'healer': {
      if ((personal[0] ?? 0) > 0) {
        effects.autoHealIntervalMs = 60000;
        effects.autoHealPercent += scale(personal[0] ?? 0, 0.1);
      }
      effects.autoHealPercent += scale(personal[1] ?? 0, 0.03);
      effects.heartCapacityBonus += Math.round(scale(personal[3] ?? 0, 1));
      effects.heartRegenMultiplier *= 1 - scale(personal[3] ?? 0, 0.2);
      effects.healEveryTwoLinesPercent += scale(personal[4] ?? 0, 0.05);
      effects.comboWindowBonusMs += Math.round(scale(personal[5] ?? 0, 3000));
      effects.itemBlockChanceBonus += scale(personal[6] ?? 0, 0.08);
      effects.itemPreserveChance += scale(personal[7] ?? 0, 0.2);
      effects.baseAttackMultiplier += scale(personal[8] ?? 0, 0.1);
      effects.healPerLineClearPercent += scale(personal[9] ?? 0, 0.01);
      effects.healEveryFiveClearsPercent += scale(personal[2] ?? 0, 0.15);

      if (mode === 'raid') {
        effects.placeHealChance += scale(party[0] ?? 0, 0.05);
        effects.placeHealPercent += scale(party[0] ?? 0, 0.05);
        if ((party[1] ?? 0) > 0) {
          effects.autoHealIntervalMs = Math.min(
            effects.autoHealIntervalMs > 0 ? effects.autoHealIntervalMs : 45000,
            45000,
          );
          effects.autoHealPercent += scale(party[1] ?? 0, 0.08);
        }
        effects.placeHealChance += scale(party[2] ?? 0, 0.04);
        effects.placeHealPercent += scale(party[2] ?? 0, 0.03);
        effects.damageTakenReduction += scale(party[3] ?? 0, 0.05);
        effects.raidTimeBonusMs += Math.round(scale(party[4] ?? 0, 60000));
        effects.damageTakenReduction += scale(party[5] ?? 0, 0.08);
        effects.rewardGoldMultiplier += scale(party[6] ?? 0, 0.1);
        effects.rewardDiamondMultiplier += scale(party[6] ?? 0, 0.1);
        if ((party[7] ?? 0) > 0) {
          effects.reviveOnce = true;
        }
        effects.comboDamageBonus += scale(party[8] ?? 0, 0.08);
        effects.maxHpMultiplier += Math.min(
          0.3,
          scale(party[9] ?? 0, 0.03) * partySize,
        );
      }
      break;
    }
    default:
      break;
  }

  return applyCreatorSkillBalance(characterId, effects);
}

export function applyDamageTakenReduction(
  damage: number,
  effects: CharacterSkillEffects,
): number {
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
    clearedLines?: number;
    fastPlacement?: boolean;
  },
): number {
  return applyCombatDamageEffectsDetailed(baseAmount, effects, context).amount;
}

export function applyCombatDamageEffectsDetailed(
  baseAmount: number,
  effects: CharacterSkillEffects,
  context: {
    combo: number;
    didClear: boolean;
    feverActive: boolean;
    usedSmallPieceStreak?: boolean;
    isRaid?: boolean;
    clearedLines?: number;
    fastPlacement?: boolean;
  },
): CombatDamageEffectResult {
  let value = baseAmount;
  const events: CombatDamageEffectEvent[] = [];
  const details: CombatDamageEffectDetail[] = [];

  if (context.combo > 0) {
    value *= 1 + effects.comboDamageBonus;
    if (effects.comboDamageBonus > 0) {
      events.push('combo_bonus');
    }
  }

  if (context.didClear) {
    value *= 1 + effects.lineClearDamageBonus;
    if (effects.lineClearDamageBonus > 0) {
      events.push('line_clear_bonus');
    }
  }

  if ((context.clearedLines ?? 0) >= 2 && effects.multiLineDamageBonus > 0) {
    value *= 1 + effects.multiLineDamageBonus;
  }

  if (context.feverActive) {
    value *= 1 + effects.feverDamageBonus;
    if (effects.feverDamageBonus > 0) {
      events.push('fever_bonus');
    }
  }

  if (context.usedSmallPieceStreak) {
    const before = value;
    value *= 1 + 0.2;
    events.push('small_piece_chain');
    details.push({
      event: 'small_piece_chain',
      bonusAmount: Math.max(0, Math.round(value - before)),
    });
  }

  if (context.fastPlacement && effects.fastPlacementDamageBonus > 0) {
    const before = value;
    value *= 1 + effects.fastPlacementDamageBonus;
    events.push('fast_placement');
    details.push({
      event: 'fast_placement',
      bonusAmount: Math.max(0, Math.round(value - before)),
    });
  }

  if (context.isRaid) {
    value *= effects.raidDamageMultiplier;
    if (effects.raidDamageMultiplier > 1) {
      events.push('raid_bonus');
    }
  }

  if (
    effects.jackpotDoubleChance > 0 &&
    Math.random() < effects.jackpotDoubleChance
  ) {
    value *= 2;
    events.push('jackpot_double');
  }

  if (
    effects.doubleAttackChance > 0 &&
    Math.random() < effects.doubleAttackChance
  ) {
    value *= 2;
    events.push('double_attack');
  }

  return {
    amount: Math.max(0, Math.round(value)),
    events,
    details,
  };
}

export function getDynamicHeartCap(
  baseHearts: number,
  effects: CharacterSkillEffects,
): number {
  return baseHearts + effects.heartCapacityBonus;
}

export function getDynamicHeartRegenMs(
  baseMs: number,
  effects: CharacterSkillEffects,
): number {
  return Math.round(baseMs * effects.heartRegenMultiplier);
}

export function getDynamicItemCapPerType(
  baseCap: number,
  effects: CharacterSkillEffects,
): number {
  return baseCap + effects.itemCapacityPerTypeBonus;
}

export function shouldPreserveItem(effects: CharacterSkillEffects): boolean {
  return (
    effects.itemPreserveChance > 0 && Math.random() < effects.itemPreserveChance
  );
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
  let nextGold = Math.round(gold * effects.rewardGoldMultiplier);
  let nextDiamonds = Math.round(diamonds * effects.rewardDiamondMultiplier);
  if (
    (nextGold > 0 || nextDiamonds > 0) &&
    effects.rewardJackpotChance > 0 &&
    effects.rewardJackpotMultiplier > 1 &&
    Math.random() < effects.rewardJackpotChance
  ) {
    nextGold = Math.round(nextGold * effects.rewardJackpotMultiplier);
    nextDiamonds = Math.round(nextDiamonds * effects.rewardJackpotMultiplier);
  }
  if (
    nextDiamonds > 0 &&
    effects.extraDiamondChance > 0 &&
    Math.random() < effects.extraDiamondChance
  ) {
    nextDiamonds += 1;
  }

  return {
    gold: nextGold,
    diamonds: nextDiamonds,
  };
}
