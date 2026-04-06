import {
  getCharacterSkillEffects,
  type CharacterSkillEffects,
  type SkillEffectContext,
} from './characterSkillEffects';
import type {CharacterData} from '../stores/gameStore';

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
] as const satisfies ReadonlyArray<keyof CharacterSkillEffects>;

function cloneCharacterData(data: CharacterData): CharacterData {
  return {
    ...data,
    personalAllocations: [...data.personalAllocations],
    partyAllocations: [...data.partyAllocations],
  };
}

function getDetailContext(category: SkillDetailCategory): {
  context: SkillEffectContext;
  contextNote: string | null;
} {
  if (category === 'party') {
    return {
      context: {mode: 'raid', partySize: 4, bossHpRatio: 0.2},
      contextNote: '레이드 4인 기준, 조건부 효과는 발동 상황 기준으로 표시됩니다.',
    };
  }

  return {
    context: {mode: 'level'},
    contextNote: null,
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
      return diff > 0 ? `콤보 유지시간 +${formatSeconds(diff)}` : null;
    }
    case 'feverRequirementMultiplier': {
      const diff = (previousValue as number) - (currentValue as number);
      return diff > 0 ? `피버 필요량 ${formatPercent(diff)} 감소` : null;
    }
    case 'feverGaugeGainMultiplier': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `피버 게이지 획득 +${formatPercent(diff)}` : null;
    }
    case 'feverDurationBonusMs': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `피버 지속시간 +${formatSeconds(diff)}` : null;
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
      return diff > 0 ? `라인 클리어 피해 +${formatPercent(diff)}` : null;
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
      return diff > 0 ? `추가 다이아 확률 +${formatPercent(diff)}` : null;
    }
    case 'itemBlockChanceBonus': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `아이템 블록 출현 +${formatPercent(diff)}` : null;
    }
    case 'endlessDifficultySlowRate': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `무한 모드 난이도 증가 ${formatPercent(diff)} 완화` : null;
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
      return currentValue && !previousValue ? '전투 중 1회 부활 활성' : null;
    }
    case 'heartCapacityBonus': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `최대 하트 +${diff}` : null;
    }
    case 'heartRegenMultiplier': {
      const diff = (previousValue as number) - (currentValue as number);
      return diff > 0 ? `하트 회복 시간 ${formatPercent(diff)} 단축` : null;
    }
    case 'healPerLineClearPercent': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `라인 클리어 시 HP ${formatPercent(diff)} 회복` : null;
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
      return diff > 0 ? `자동 회복량 ${formatPercent(diff)}` : null;
    }
    case 'placeHealChance': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `배치 회복 확률 +${formatPercent(diff)}` : null;
    }
    case 'placeHealPercent': {
      const diff = (currentValue as number) - (previousValue as number);
      return diff > 0 ? `배치 회복량 ${formatPercent(diff)}` : null;
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
      return diff > 0 ? `새로고침 할인 ${formatPercent(diff)}` : null;
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
      return diff > 0 ? `레이드 제한시간 +${formatSeconds(diff)}` : null;
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
  const {context, contextNote} = getDetailContext(category);
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

  const currentEffects = getCharacterSkillEffects(characterId, currentData, context);
  const zeroedEffects = getCharacterSkillEffects(characterId, zeroedData, context);
  const nextEffects = getCharacterSkillEffects(characterId, nextData, context);

  return {
    currentLines: currentLevel > 0 ? summarizeEffectDelta(currentEffects, zeroedEffects) : [],
    nextLines:
      currentLevel < 5
        ? summarizeEffectDelta(nextEffects, currentEffects)
        : [],
    contextNote,
  };
}
