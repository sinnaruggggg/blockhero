export type CharacterClassId =
  | 'knight'
  | 'mage'
  | 'archer'
  | 'rogue'
  | 'healer';

export type SkillTreeType = 'personal' | 'party';

export type SkillStackingRule =
  | 'self_only'
  | 'additive'
  | 'highest_same_skill'
  | 'non_stack';

export type SkillComplexity = 'core' | 'advanced' | 'vfx' | 'server';

export interface SkillScaling {
  baseValue: number;
  perLevel: number;
  unit:
    | 'flat'
    | 'percent'
    | 'seconds'
    | 'chance'
    | 'lines'
    | 'count'
    | 'multiplier';
  cap?: number;
}

export interface CharacterDefinition {
  id: CharacterClassId;
  name: string;
  role: string;
  baseAttack: number;
  attackGrowthPerLevel: number;
  baseHp: number;
  hpGrowthPerLevel: number;
}

export interface SkillDefinition {
  id: string;
  classId: CharacterClassId;
  treeType: SkillTreeType;
  legacyIndex: number;
  treeNodeIndex: number;
  name: string;
  shortDescription: string;
  maxLevel: number;
  prerequisiteSkillId?: string;
  effectType: string;
  stackingRule: SkillStackingRule;
  complexity: SkillComplexity;
  scaling?: SkillScaling;
  extra?: Record<string, number | string | boolean>;
  notes?: string;
}

export interface ChapterDefinition {
  chapterIndex: number;
  code: string;
  name: string;
  theme: string;
  isBossChapter: boolean;
}

export interface WorldDefinition {
  id: number;
  code: string;
  name: string;
  bossId: string;
  bossName: string;
  theme: string;
  chapters: ChapterDefinition[];
}

export interface StageDefinition {
  id: number;
  worldId: number;
  worldCode: string;
  chapterIndex: number;
  chapterCode: string;
  stageNumberInChapter: number;
  stageNumberInWorld: number;
  stageNumberGlobal: number;
  name: string;
  monsterId: string;
  monsterName: string;
  monsterType: 'normal' | 'elite' | 'boss';
  monsterHp: number;
  monsterAttack: number;
  attackIntervalSec: number;
  rewardGold: number;
  rewardCharacterExp: number;
  unlocksBossRaidStage?: number;
}

export interface ItemPriceDefinition {
  itemId: string;
  goldPrice: number;
  diamondPrice: number;
}

export interface EndlessRewardThreshold {
  scoreTarget: number;
  goldReward: number;
}

export interface NormalRaidBossDefinition {
  id: string;
  stage: number;
  name: string;
  skinId: string;
  firstClearDiamondReward: number;
  repeatDiamondReward: number;
}

export interface BossRaidDefinition {
  id: string;
  stage: number;
  worldId: number;
  name: string;
  maxHp: number;
  unlockWorldId: number;
  raidWindowHours: number;
  joinWindowMinutes: number;
  maxParticipants: number;
}

export interface SkinDefinition {
  id: string;
  sourceBossId: string;
  attackBonusRate: number;
  summonId: string;
  uniqueEffectId: string;
}
