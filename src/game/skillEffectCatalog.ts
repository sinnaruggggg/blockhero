import type {CharacterSkillEffects} from './characterSkillEffects';

export type SkillEffectFieldType = 'float' | 'int' | 'boolean';

export type SkillEffectFieldDefinition = {
  key: keyof CharacterSkillEffects;
  label: string;
  type: SkillEffectFieldType;
  neutral: number | boolean;
};

export const SKILL_EFFECT_FIELD_DEFINITIONS: SkillEffectFieldDefinition[] = [
  {key: 'baseAttackMultiplier', label: '기본 공격 배율', type: 'float', neutral: 1},
  {key: 'maxHpMultiplier', label: '최대 HP 배율', type: 'float', neutral: 1},
  {key: 'damageTakenReduction', label: '받는 피해 감소', type: 'float', neutral: 0},
  {
    key: 'raidSkillChargeGainMultiplier',
    label: '레이드 스킬 게이지 배율',
    type: 'float',
    neutral: 1,
  },
  {key: 'comboDamageBonus', label: '콤보 피해 보너스', type: 'float', neutral: 0},
  {key: 'comboWindowBonusMs', label: '콤보 시간 보너스', type: 'int', neutral: 0},
  {
    key: 'feverRequirementMultiplier',
    label: '피버 요구량 배율',
    type: 'float',
    neutral: 1,
  },
  {
    key: 'feverGaugeGainMultiplier',
    label: '피버 게이지 배율',
    type: 'float',
    neutral: 1,
  },
  {key: 'feverDurationBonusMs', label: '피버 지속시간 보너스', type: 'int', neutral: 0},
  {key: 'feverDamageBonus', label: '피버 피해 보너스', type: 'float', neutral: 0},
  {key: 'raidDamageMultiplier', label: '레이드 피해 배율', type: 'float', neutral: 1},
  {key: 'lineClearDamageBonus', label: '줄 지우기 피해', type: 'float', neutral: 0},
  {key: 'smallPieceChanceBonus', label: '소형 블록 확률', type: 'float', neutral: 0},
  {key: 'diamondChanceBonus', label: '다이아 확률', type: 'float', neutral: 0},
  {key: 'extraDiamondChance', label: '추가 다이아 확률', type: 'float', neutral: 0},
  {key: 'itemBlockChanceBonus', label: '아이템 블록 확률', type: 'float', neutral: 0},
  {
    key: 'endlessDifficultySlowRate',
    label: '무한 모드 속도 완화',
    type: 'float',
    neutral: 0,
  },
  {
    key: 'endlessObstacleSpawnMultiplier',
    label: '장애물 스폰 배율',
    type: 'float',
    neutral: 1,
  },
  {key: 'jackpotDoubleChance', label: '잭팟 2배 확률', type: 'float', neutral: 0},
  {key: 'dodgeChance', label: '회피 확률', type: 'float', neutral: 0},
  {key: 'reviveOnce', label: '부활 허용', type: 'boolean', neutral: false},
  {key: 'heartCapacityBonus', label: '하트 최대치', type: 'int', neutral: 0},
  {
    key: 'heartRegenMultiplier',
    label: '하트 회복 배율',
    type: 'float',
    neutral: 1,
  },
  {key: 'healPerLineClearPercent', label: '줄당 회복 비율', type: 'float', neutral: 0},
  {key: 'healEveryTwoLinesPercent', label: '2줄 회복 비율', type: 'float', neutral: 0},
  {key: 'healEveryFiveClearsPercent', label: '5회 회복 비율', type: 'float', neutral: 0},
  {key: 'autoHealIntervalMs', label: '자동 회복 주기', type: 'int', neutral: 0},
  {key: 'autoHealPercent', label: '자동 회복 비율', type: 'float', neutral: 0},
  {key: 'placeHealChance', label: '배치 회복 확률', type: 'float', neutral: 0},
  {key: 'placeHealPercent', label: '배치 회복 비율', type: 'float', neutral: 0},
  {key: 'itemPreserveChance', label: '아이템 보존 확률', type: 'float', neutral: 0},
  {key: 'shopGoldDiscount', label: '상점 골드 할인', type: 'float', neutral: 0},
  {key: 'shopRefreshDiscount', label: '상점 새로고침 할인', type: 'float', neutral: 0},
  {
    key: 'rewardGoldMultiplier',
    label: '골드 보상 배율',
    type: 'float',
    neutral: 1,
  },
  {
    key: 'rewardDiamondMultiplier',
    label: '다이아 보상 배율',
    type: 'float',
    neutral: 1,
  },
  {key: 'raidTimeBonusMs', label: '레이드 시간 보너스', type: 'int', neutral: 0},
  {key: 'doubleAttackChance', label: '2연타 확률', type: 'float', neutral: 0},
  {key: 'previewCountBonus', label: '미리보기 개수', type: 'int', neutral: 0},
  {
    key: 'itemCapacityPerTypeBonus',
    label: '아이템 타입별 최대치',
    type: 'int',
    neutral: 0,
  },
  {key: 'adjacentLineClearChance', label: '인접 줄 정리 확률', type: 'float', neutral: 0},
  {key: 'extraLineClearChance', label: '추가 줄 정리 확률', type: 'float', neutral: 0},
  {key: 'blockSummonChance', label: '보조 블록 소환 확률', type: 'float', neutral: 0},
  {key: 'blockSummonMaxCells', label: '보조 블록 최대 칸수', type: 'int', neutral: 0},
  {key: 'magicTransformChance', label: '마법 변환 확률', type: 'float', neutral: 0},
  {key: 'magicTransformCellCount', label: '마법 변환 칸수', type: 'int', neutral: 0},
  {key: 'randomLineClearChance', label: '무작위 줄 정리 확률', type: 'float', neutral: 0},
  {
    key: 'randomLineClearComboThreshold',
    label: '무작위 줄 정리 콤보 조건',
    type: 'int',
    neutral: 0,
  },
  {key: 'fastPlacementDamageBonus', label: '빠른 배치 피해', type: 'float', neutral: 0},
  {key: 'fastPlacementWindowMs', label: '빠른 배치 판정시간', type: 'int', neutral: 0},
  {key: 'multiLineDamageBonus', label: '다중 줄 피해', type: 'float', neutral: 0},
  {key: 'placementDamageReduction', label: '배치 피해 감소', type: 'float', neutral: 0},
  {
    key: 'placementDamageReductionWindowMs',
    label: '배치 피해 감소 시간',
    type: 'int',
    neutral: 0,
  },
  {key: 'rewardJackpotChance', label: '보상 잭팟 확률', type: 'float', neutral: 0},
  {
    key: 'rewardJackpotMultiplier',
    label: '보상 잭팟 배율',
    type: 'float',
    neutral: 1,
  },
  {
    key: 'raidActiveSkillDamageBonus',
    label: '레이드 액티브 피해',
    type: 'float',
    neutral: 0,
  },
  {
    key: 'battleExtraAttackLineChance',
    label: '대전 추가 공격줄 확률',
    type: 'float',
    neutral: 0,
  },
  {
    key: 'battleCounterAttackChance',
    label: '대전 반격 확률',
    type: 'float',
    neutral: 0,
  },
  {
    key: 'levelModeBreakthroughAttackPerClear',
    label: '레벨 돌파 공격 증가',
    type: 'float',
    neutral: 0,
  },
];

export const SKILL_EFFECT_NUMERIC_FIELDS = SKILL_EFFECT_FIELD_DEFINITIONS.filter(
  field => field.type !== 'boolean',
).map(field => field.key) as Array<
  Exclude<keyof CharacterSkillEffects, 'reviveOnce'>
>;

export type SkillEffectNumericField = (typeof SKILL_EFFECT_NUMERIC_FIELDS)[number];

export const SKILL_EFFECT_BOOLEAN_FIELDS = SKILL_EFFECT_FIELD_DEFINITIONS.filter(
  field => field.type === 'boolean',
).map(field => field.key) as Array<'reviveOnce'>;

export type SkillEffectBooleanField = (typeof SKILL_EFFECT_BOOLEAN_FIELDS)[number];

export function getSkillEffectFieldDefinition(
  key: keyof CharacterSkillEffects,
): SkillEffectFieldDefinition {
  return (
    SKILL_EFFECT_FIELD_DEFINITIONS.find(field => field.key === key) ??
    SKILL_EFFECT_FIELD_DEFINITIONS[0]
  );
}
