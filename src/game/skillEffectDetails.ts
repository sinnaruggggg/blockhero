import {
  getCharacterSkillEffects,
  type CharacterSkillEffects,
  type SkillEffectContext,
} from './characterSkillEffects';
import type { CharacterData } from '../stores/gameStore';

export type SkillDetailCategory = 'personal' | 'party';

export interface SkillEffectDetail {
  currentLines: string[];
  nextLines: string[];
  contextNote: string | null;
}

const DETAIL_FIELDS = [
  'baseAttackMultiplier',
  'maxHpMultiplier',
  'damageTakenReduction',
  'raidSkillChargeGainMultiplier',
  'comboDamageBonus',
  'comboWindowBonusMs',
  'feverRequirementMultiplier',
  'feverGaugeGainMultiplier',
  'feverDurationBonusMs',
  'feverDamageBonus',
  'raidDamageMultiplier',
  'lineClearDamageBonus',
  'smallPieceChanceBonus',
  'diamondChanceBonus',
  'extraDiamondChance',
  'itemBlockChanceBonus',
  'endlessDifficultySlowRate',
  'endlessObstacleSpawnMultiplier',
  'jackpotDoubleChance',
  'dodgeChance',
  'reviveOnce',
  'heartCapacityBonus',
  'heartRegenMultiplier',
  'healPerLineClearPercent',
  'healEveryTwoLinesPercent',
  'healEveryFiveClearsPercent',
  'autoHealIntervalMs',
  'autoHealPercent',
  'placeHealChance',
  'placeHealPercent',
  'itemPreserveChance',
  'shopGoldDiscount',
  'shopRefreshDiscount',
  'rewardGoldMultiplier',
  'rewardDiamondMultiplier',
  'raidTimeBonusMs',
  'doubleAttackChance',
  'previewCountBonus',
  'itemCapacityPerTypeBonus',
  'adjacentLineClearChance',
  'extraLineClearChance',
  'blockSummonChance',
  'blockSummonMaxCells',
  'magicTransformChance',
  'magicTransformCellCount',
  'randomLineClearChance',
  'randomLineClearComboThreshold',
  'fastPlacementDamageBonus',
  'fastPlacementWindowMs',
  'multiLineDamageBonus',
  'placementDamageReduction',
  'placementDamageReductionWindowMs',
  'rewardJackpotChance',
  'rewardJackpotMultiplier',
  'raidActiveSkillDamageBonus',
  'battleExtraAttackLineChance',
  'battleCounterAttackChance',
  'levelModeBreakthroughAttackPerClear',
] as const satisfies ReadonlyArray<keyof CharacterSkillEffects>;

function cloneCharacterData(data: CharacterData): CharacterData {
  return {
    ...data,
    personalAllocations: [...data.personalAllocations],
    partyAllocations: [...data.partyAllocations],
  };
}

function getDetailContexts(
  characterId: string,
  category: SkillDetailCategory,
): {
  contexts: Array<{
    context: SkillEffectContext;
    linePrefix?: string;
  }>;
  contextNote: string | null;
} {
  if (category === 'party') {
    return {
      contexts: [{ context: { mode: 'raid', partySize: 4, bossHpRatio: 0.2 } }],
      contextNote:
        '레이드 4인 기준이며, 조건부 효과는 발동 가능한 대표 상황으로 표시됩니다.',
    };
  }

  return {
    contexts: [
      { context: { mode: 'level' } },
      { context: { mode: 'battle' }, linePrefix: '[대전] ' },
    ],
    contextNote:
      characterId === 'knight'
        ? '[대전] 표시는 대전 모드 전용 효과입니다.'
        : null,
  };
}

function formatPercent(value: number) {
  const percent = value * 100;
  if (Math.abs(percent - Math.round(percent)) < 0.001) {
    return `${Math.round(percent)}%`;
  }

  return `${percent.toFixed(1)}%`;
}

function formatSeconds(ms: number) {
  const seconds = ms / 1000;
  if (Math.abs(seconds - Math.round(seconds)) < 0.001) {
    return `${Math.round(seconds)}초`;
  }

  return `${seconds.toFixed(1)}초`;
}

function formatEffectDelta(
  field: keyof CharacterSkillEffects,
  currentValue: CharacterSkillEffects[keyof CharacterSkillEffects],
  previousValue: CharacterSkillEffects[keyof CharacterSkillEffects],
): string | null {
  switch (field) {
    case 'baseAttackMultiplier': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `기본 공격력 +${formatPercent(diff)}` : null;
    }
    case 'maxHpMultiplier': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `최대 HP +${formatPercent(diff)}` : null;
    }
    case 'damageTakenReduction': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `받는 피해 ${formatPercent(diff)} 감소` : null;
    }
    case 'raidSkillChargeGainMultiplier': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `레이드 스킬 게이지 획득 +${formatPercent(diff)}` : null;
    }
    case 'comboDamageBonus': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `콤보 피해 +${formatPercent(diff)}` : null;
    }
    case 'comboWindowBonusMs': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `콤보 유지 시간 +${formatSeconds(diff)}` : null;
    }
    case 'feverRequirementMultiplier': {
      const diff = (previousValue as number) - (currentValue as number);
      return diff > 0 ? `피버 발동 필요량 ${formatPercent(diff)} 감소` : null;
    }
    case 'feverGaugeGainMultiplier': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `피버 게이지 획득 +${formatPercent(diff)}` : null;
    }
    case 'feverDurationBonusMs': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `피버 지속 시간 +${formatSeconds(diff)}` : null;
    }
    case 'feverDamageBonus': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `피버 피해 +${formatPercent(diff)}` : null;
    }
    case 'raidDamageMultiplier': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `레이드 피해 +${formatPercent(diff)}` : null;
    }
    case 'lineClearDamageBonus': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `줄 클리어 피해 +${formatPercent(diff)}` : null;
    }
    case 'smallPieceChanceBonus': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `소형 블록 출현 +${formatPercent(diff)}` : null;
    }
    case 'diamondChanceBonus': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `다이아 출현 +${formatPercent(diff)}` : null;
    }
    case 'extraDiamondChance': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `추가 다이아 획득 +${formatPercent(diff)}` : null;
    }
    case 'itemBlockChanceBonus': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `아이템 블록 출현 +${formatPercent(diff)}` : null;
    }
    case 'endlessDifficultySlowRate': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `무한 모드 난이도 상승 ${formatPercent(diff)} 완화` : null;
    }
    case 'endlessObstacleSpawnMultiplier': {
      const diff = (previousValue as number) - (currentValue as number);
      return diff > 0 ? `장애물 출현 ${formatPercent(diff)} 감소` : null;
    }
    case 'jackpotDoubleChance': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `잭팟 2배 확률 +${formatPercent(diff)}` : null;
    }
    case 'dodgeChance': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `회피 확률 +${formatPercent(diff)}` : null;
    }
    case 'reviveOnce': {
      return currentValue && !previousValue ? '전투 중 1회 부활' : null;
    }
    case 'heartCapacityBonus': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `최대 하트 +${diff}` : null;
    }
    case 'heartRegenMultiplier': {
      const diff = (previousValue as number) - (currentValue as number);
      return diff > 0 ? `하트 재생 시간 ${formatPercent(diff)} 단축` : null;
    }
    case 'healPerLineClearPercent': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `줄 클리어 시 HP ${formatPercent(diff)} 회복` : null;
    }
    case 'healEveryTwoLinesPercent': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `2줄 클리어 시 HP ${formatPercent(diff)} 회복` : null;
    }
    case 'healEveryFiveClearsPercent': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `5회 클리어 시 HP ${formatPercent(diff)} 회복` : null;
    }
    case 'autoHealIntervalMs': {
      const currentMs = currentValue as number;
      return currentMs > 0 && previousValue === 0
        ? `자동 회복 주기 ${formatSeconds(currentMs)}`
        : null;
    }
    case 'autoHealPercent': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `자동 회복량 +${formatPercent(diff)}` : null;
    }
    case 'placeHealChance': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `배치 회복 확률 +${formatPercent(diff)}` : null;
    }
    case 'placeHealPercent': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `배치 회복량 +${formatPercent(diff)}` : null;
    }
    case 'itemPreserveChance': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `아이템 보존 확률 +${formatPercent(diff)}` : null;
    }
    case 'shopGoldDiscount': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `상점 골드 할인 ${formatPercent(diff)}` : null;
    }
    case 'shopRefreshDiscount': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `상점 새로고침 할인 ${formatPercent(diff)}` : null;
    }
    case 'rewardGoldMultiplier': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `골드 보상 +${formatPercent(diff)}` : null;
    }
    case 'rewardDiamondMultiplier': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `다이아 보상 +${formatPercent(diff)}` : null;
    }
    case 'raidTimeBonusMs': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `레이드 제한 시간 +${formatSeconds(diff)}` : null;
    }
    case 'doubleAttackChance': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `추가 타격 확률 +${formatPercent(diff)}` : null;
    }
    case 'previewCountBonus': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `미리보기 +${diff}개` : null;
    }
    case 'itemCapacityPerTypeBonus': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `아이템 보유 한도 +${diff}` : null;
    }
    case 'adjacentLineClearChance': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0
        ? `배치 시 인접 줄 정리 확률 +${formatPercent(diff)}`
        : null;
    }
    case 'extraLineClearChance': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0
        ? `클리어 시 추가 줄 정리 확률 +${formatPercent(diff)}`
        : null;
    }
    case 'blockSummonChance': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `블록 소환 확률 +${formatPercent(diff)}` : null;
    }
    case 'blockSummonMaxCells': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `블록 소환 최대 칸 수 +${diff}` : null;
    }
    case 'magicTransformChance': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `마법 변환 확률 +${formatPercent(diff)}` : null;
    }
    case 'magicTransformCellCount': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `마법 변환 최대 칸 수 +${diff}` : null;
    }
    case 'randomLineClearChance': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `랜덤 줄 정리 확률 +${formatPercent(diff)}` : null;
    }
    case 'randomLineClearComboThreshold': {
      const currentThreshold = currentValue as number;
      const previousThreshold = previousValue as number;
      return currentThreshold > 0 && previousThreshold === 0
        ? `${currentThreshold}콤보 이상 시 랜덤 줄 정리 발동`
        : null;
    }
    case 'fastPlacementDamageBonus': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `빠른 배치 추가 피해 +${formatPercent(diff)}` : null;
    }
    case 'fastPlacementWindowMs': {
      const currentMs = currentValue as number;
      const previousMs = previousValue as number;
      return currentMs > 0 && previousMs === 0
        ? `빠른 배치 판정 시간 ${formatSeconds(currentMs)}`
        : null;
    }
    case 'multiLineDamageBonus': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `2줄 이상 클리어 피해 +${formatPercent(diff)}` : null;
    }
    case 'placementDamageReduction': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `배치 직후 피해 감소 ${formatPercent(diff)}` : null;
    }
    case 'placementDamageReductionWindowMs': {
      const currentMs = currentValue as number;
      const previousMs = previousValue as number;
      return currentMs > 0 && previousMs === 0
        ? `배치 직후 보호 시간 ${formatSeconds(currentMs)}`
        : null;
    }
    case 'rewardJackpotChance': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `보상 잭팟 확률 +${formatPercent(diff)}` : null;
    }
    case 'rewardJackpotMultiplier': {
      const currentMultiplier = currentValue as number;
      const previousMultiplier = previousValue as number;
      return currentMultiplier > previousMultiplier && currentMultiplier > 1
        ? `보상 잭팟 배수 x${currentMultiplier}`
        : null;
    }
    case 'raidActiveSkillDamageBonus': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `레이드 액티브 스킬 피해 +${formatPercent(diff)}` : null;
    }
    case 'battleExtraAttackLineChance': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `공격 시 추가 1줄 발사 확률 +${formatPercent(diff)}` : null;
    }
    case 'battleCounterAttackChance': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `피격 시 반격 확률 +${formatPercent(diff)}` : null;
    }
    case 'levelModeBreakthroughAttackPerClear': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `연속 돌파 1회당 공격력 +${formatPercent(diff)}` : null;
    }
    default:
      return null;
  }
}

function summarizeEffectDelta(
  currentEffects: CharacterSkillEffects,
  previousEffects: CharacterSkillEffects,
): string[] {
  return DETAIL_FIELDS.map(field =>
    formatEffectDelta(field, currentEffects[field], previousEffects[field]),
  ).filter((line): line is string => Boolean(line));
}

export function getSkillEffectDetail(
  characterId: string,
  data: CharacterData,
  category: SkillDetailCategory,
  skillIndex: number,
): SkillEffectDetail {
  const { contexts, contextNote } = getDetailContexts(characterId, category);
  const currentData = cloneCharacterData(data);
  const zeroedData = cloneCharacterData(data);
  const nextData = cloneCharacterData(data);
  const allocations =
    category === 'personal'
      ? currentData.personalAllocations
      : currentData.partyAllocations;
  const zeroedAllocations =
    category === 'personal'
      ? zeroedData.personalAllocations
      : zeroedData.partyAllocations;
  const nextAllocations =
    category === 'personal'
      ? nextData.personalAllocations
      : nextData.partyAllocations;

  const currentLevel = allocations[skillIndex] ?? 0;
  zeroedAllocations[skillIndex] = 0;
  nextAllocations[skillIndex] = Math.min(5, currentLevel + 1);

  const currentLines: string[] = [];
  const nextLines: string[] = [];
  const currentSeen = new Set<string>();
  const nextSeen = new Set<string>();

  for (const { context, linePrefix } of contexts) {
    const currentEffects = getCharacterSkillEffects(
      characterId,
      currentData,
      context,
    );
    const zeroedEffects = getCharacterSkillEffects(
      characterId,
      zeroedData,
      context,
    );
    const nextEffects = getCharacterSkillEffects(characterId, nextData, context);

    if (currentLevel > 0) {
      for (const line of summarizeEffectDelta(currentEffects, zeroedEffects)) {
        if (currentSeen.has(line)) {
          continue;
        }
        currentSeen.add(line);
        currentLines.push(linePrefix ? `${linePrefix}${line}` : line);
      }
    }

    if (currentLevel < 5) {
      for (const line of summarizeEffectDelta(nextEffects, currentEffects)) {
        if (nextSeen.has(line)) {
          continue;
        }
        nextSeen.add(line);
        nextLines.push(linePrefix ? `${linePrefix}${line}` : line);
      }
    }
  }

  return {
    currentLines,
    nextLines,
    contextNote,
  };
}
