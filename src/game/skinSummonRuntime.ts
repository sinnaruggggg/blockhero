import type {PieceGenerationOptions} from './engine';
import {BLOCK_SKINS} from '../constants/blockSkins';

export interface SummonProgressData {
  level: number;
  exp: number;
  evolutionTier: number;
}

export interface SkinBattleEffects {
  attackBonusMultiplier: number;
  lineDamageBonusRate: number;
  comboDamageBonusRate: number;
  feverGaugeGainMultiplier: number;
  feverDurationBonusMs: number;
  damageTakenMultiplier: number;
  rewardGoldMultiplier: number;
  smallPieceChanceBonus: number;
  summonGaugeGainMultiplier: number;
  summonAttackMultiplier: number;
  summonDurationBonusMs: number;
  doubleAttackChance: number;
  uniqueEffectLabel: string;
}

export interface SummonDefinition {
  skinId: number;
  name: string;
  gaugeRequired: number;
  baseAttack: number;
  attackGrowthPerLevel: number;
  activeDurationMs: number;
}

export interface ActiveSkinLoadout {
  skinId: number;
  effects: SkinBattleEffects;
  summonProgress: SummonProgressData | null;
  summonAttack: number;
  summonGaugeRequired: number;
  summonDurationMs: number;
}

const DEFAULT_EFFECTS: SkinBattleEffects = {
  attackBonusMultiplier: 1,
  lineDamageBonusRate: 0,
  comboDamageBonusRate: 0,
  feverGaugeGainMultiplier: 1,
  feverDurationBonusMs: 0,
  damageTakenMultiplier: 1,
  rewardGoldMultiplier: 1,
  smallPieceChanceBonus: 0,
  summonGaugeGainMultiplier: 1,
  summonAttackMultiplier: 1,
  summonDurationBonusMs: 0,
  doubleAttackChance: 0,
  uniqueEffectLabel: '고유 효과 없음',
};

const SKIN_EFFECTS: Record<number, Omit<SkinBattleEffects, 'attackBonusMultiplier'>> = {
  1: {
    ...DEFAULT_EFFECTS,
    lineDamageBonusRate: 0.05,
    uniqueEffectLabel: '줄 클리어 대미지 +5%',
  },
  2: {
    ...DEFAULT_EFFECTS,
    feverGaugeGainMultiplier: 1.12,
    uniqueEffectLabel: '피버 게이지 충전 +12%',
  },
  3: {
    ...DEFAULT_EFFECTS,
    comboDamageBonusRate: 0.12,
    uniqueEffectLabel: '콤보 대미지 +12%',
  },
  4: {
    ...DEFAULT_EFFECTS,
    damageTakenMultiplier: 0.92,
    uniqueEffectLabel: '받는 피해 8% 감소',
  },
  5: {
    ...DEFAULT_EFFECTS,
    rewardGoldMultiplier: 1.1,
    uniqueEffectLabel: '골드 획득량 +10%',
  },
  6: {
    ...DEFAULT_EFFECTS,
    feverDurationBonusMs: 1000,
    uniqueEffectLabel: '피버 지속시간 +1초',
  },
  7: {
    ...DEFAULT_EFFECTS,
    doubleAttackChance: 0.05,
    uniqueEffectLabel: '5% 확률 더블 어택',
  },
  8: {
    ...DEFAULT_EFFECTS,
    smallPieceChanceBonus: 0.1,
    uniqueEffectLabel: '작은 블록 등장 확률 +10%',
  },
  9: {
    ...DEFAULT_EFFECTS,
    summonGaugeGainMultiplier: 1.25,
    uniqueEffectLabel: '소환 게이지 충전 +25%',
  },
  10: {
    ...DEFAULT_EFFECTS,
    summonAttackMultiplier: 1.25,
    summonDurationBonusMs: 60_000,
    uniqueEffectLabel: '소환수 공격력 +25%, 지속시간 +60초',
  },
};

const SUMMON_DEFINITIONS: Record<number, SummonDefinition> = {
  1: {skinId: 1, name: '점액 전령', gaugeRequired: 100, baseAttack: 30, attackGrowthPerLevel: 5, activeDurationMs: 30_000},
  2: {skinId: 2, name: '독안개 정령', gaugeRequired: 100, baseAttack: 38, attackGrowthPerLevel: 6, activeDurationMs: 30_000},
  3: {skinId: 3, name: '가시 수호수', gaugeRequired: 100, baseAttack: 46, attackGrowthPerLevel: 6, activeDurationMs: 30_000},
  4: {skinId: 4, name: '물결 정령', gaugeRequired: 100, baseAttack: 54, attackGrowthPerLevel: 7, activeDurationMs: 30_000},
  5: {skinId: 5, name: '해일 사도', gaugeRequired: 100, baseAttack: 62, attackGrowthPerLevel: 8, activeDurationMs: 30_000},
  6: {skinId: 6, name: '수정 골렘', gaugeRequired: 100, baseAttack: 72, attackGrowthPerLevel: 8, activeDurationMs: 30_000},
  7: {skinId: 7, name: '천둥 매', gaugeRequired: 100, baseAttack: 82, attackGrowthPerLevel: 9, activeDurationMs: 30_000},
  8: {skinId: 8, name: '소용돌이 군주', gaugeRequired: 100, baseAttack: 94, attackGrowthPerLevel: 9, activeDurationMs: 30_000},
  9: {skinId: 9, name: '다이아 골렘', gaugeRequired: 100, baseAttack: 108, attackGrowthPerLevel: 10, activeDurationMs: 30_000},
  10: {skinId: 10, name: '크라운 드래곤', gaugeRequired: 100, baseAttack: 124, attackGrowthPerLevel: 12, activeDurationMs: 30_000},
};

function createDefaultProgress(): SummonProgressData {
  return {
    level: 1,
    exp: 0,
    evolutionTier: 1,
  };
}

export function createDefaultSummonProgressMap(): Record<number, SummonProgressData> {
  return BLOCK_SKINS.filter(skin => skin.id > 0).reduce<Record<number, SummonProgressData>>(
    (accumulator, skin) => {
      accumulator[skin.id] = createDefaultProgress();
      return accumulator;
    },
    {},
  );
}

export function ensureSummonProgressMap(
  progress?: Record<number, SummonProgressData>,
): Record<number, SummonProgressData> {
  const next = createDefaultSummonProgressMap();
  if (!progress) {
    return next;
  }

  for (const skin of BLOCK_SKINS) {
    if (skin.id <= 0) {
      continue;
    }
    const current = progress[skin.id];
    if (current) {
      next[skin.id] = {
        level: Math.max(1, current.level ?? 1),
        exp: Math.max(0, current.exp ?? 0),
        evolutionTier: Math.max(1, current.evolutionTier ?? 1),
      };
    }
  }

  return next;
}

export function getSkinAttackBonusRate(skinId: number): number {
  if (skinId <= 0) {
    return 0;
  }

  return Math.min(0.4, skinId * 0.02);
}

export function getSkinBattleEffects(skinId: number): SkinBattleEffects {
  const effect = SKIN_EFFECTS[skinId];
  const attackBonusMultiplier = 1 + getSkinAttackBonusRate(skinId);

  return {
    ...DEFAULT_EFFECTS,
    ...(effect ?? {}),
    attackBonusMultiplier,
  };
}

export function getSummonDefinition(skinId: number): SummonDefinition | null {
  if (skinId <= 0) {
    return null;
  }

  return (
    SUMMON_DEFINITIONS[skinId] ?? {
      skinId,
      name: `소환수 ${skinId}`,
      gaugeRequired: 100,
      baseAttack: 24 + skinId * 8,
      attackGrowthPerLevel: 4 + Math.floor(skinId / 2),
      activeDurationMs: 30_000,
    }
  );
}

export function getSummonProgressForSkin(
  progressMap: Record<number, SummonProgressData> | undefined,
  skinId: number,
): SummonProgressData | null {
  if (skinId <= 0) {
    return null;
  }

  const safeProgress = ensureSummonProgressMap(progressMap);
  return safeProgress[skinId] ?? createDefaultProgress();
}

export function getSummonAttack(skinId: number, level: number): number {
  const summon = getSummonDefinition(skinId);
  if (!summon) {
    return 0;
  }

  return summon.baseAttack + Math.max(0, level - 1) * summon.attackGrowthPerLevel;
}

export function getSummonDurationMs(skinId: number, level = 1): number {
  const baseDuration = getSummonDefinition(skinId)?.activeDurationMs ?? 0;
  if (baseDuration <= 0) {
    return 0;
  }
  return baseDuration + Math.max(0, level - 1) * 5000;
}

export function getSummonExpRequired(level: number): number {
  return (100 + Math.max(0, level - 1) * 60) * 20;
}

export function applySummonExp(
  progress: SummonProgressData,
  expAmount: number,
): SummonProgressData {
  if (expAmount <= 0) {
    return progress;
  }

  let level = progress.level;
  let exp = progress.exp + expAmount;

  while (exp >= getSummonExpRequired(level)) {
    exp -= getSummonExpRequired(level);
    level += 1;
  }

  return {
    level,
    exp,
    evolutionTier: Math.max(progress.evolutionTier, Math.floor((level - 1) / 10) + 1),
  };
}

export function getActiveSkinLoadout(
  skinData:
    | {
        activeSkinId: number;
        summonProgress?: Record<number, SummonProgressData>;
      }
    | null
    | undefined,
): ActiveSkinLoadout {
  const skinId = skinData?.activeSkinId ?? 0;
  const effects = getSkinBattleEffects(skinId);
  const summonProgress = getSummonProgressForSkin(skinData?.summonProgress, skinId);
  const summonDurationMs = Math.max(
    0,
    getSummonDurationMs(skinId, summonProgress?.level ?? 1) +
      effects.summonDurationBonusMs,
  );

  return {
    skinId,
    effects,
    summonProgress,
    summonAttack: summonProgress
      ? Math.round(getSummonAttack(skinId, summonProgress.level) * effects.summonAttackMultiplier)
      : 0,
    summonGaugeRequired: getSummonDefinition(skinId)?.gaugeRequired ?? 0,
    summonDurationMs,
  };
}

export function mergeSkinPieceGenerationOptions(
  baseOptions: PieceGenerationOptions,
  skinId: number,
): PieceGenerationOptions {
  const effects = getSkinBattleEffects(skinId);

  return {
    ...baseOptions,
    smallPieceChanceBonus:
      (baseOptions.smallPieceChanceBonus ?? 0) + effects.smallPieceChanceBonus,
  };
}

export function applySkinCombatDamage(
  damage: number,
  skinId: number,
  context: {
    combo: number;
    didClear: boolean;
  },
  roll: number = Math.random(),
): {damage: number; doubled: boolean} {
  const effects = getSkinBattleEffects(skinId);
  let nextDamage = damage;

  if (context.didClear) {
    nextDamage *= 1 + effects.lineDamageBonusRate;
  }

  if (context.combo >= 3) {
    nextDamage *= 1 + effects.comboDamageBonusRate;
  }

  let doubled = false;
  if (effects.doubleAttackChance > 0 && roll < effects.doubleAttackChance) {
    nextDamage *= 2;
    doubled = true;
  }

  return {
    damage: Math.max(0, Math.round(nextDamage)),
    doubled,
  };
}

export function applySkinIncomingDamage(damage: number, skinId: number): number {
  const effects = getSkinBattleEffects(skinId);
  return Math.max(0, Math.round(damage * effects.damageTakenMultiplier));
}

export function applySkinRewardBonuses(
  gold: number,
  skinId: number,
): number {
  const effects = getSkinBattleEffects(skinId);
  return Math.max(0, Math.round(gold * effects.rewardGoldMultiplier));
}

export function getSummonGaugeGain(
  skinId: number,
  blockCount: number,
  clearedLines: number,
): number {
  const effects = getSkinBattleEffects(skinId);
  const baseGain = blockCount + clearedLines * 6;
  return Math.max(1, Math.round(baseGain * effects.summonGaugeGainMultiplier));
}
