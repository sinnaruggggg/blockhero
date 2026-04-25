import {
  BOSS_RAID_INTERVAL_MS,
  BOSS_RAID_MAX_PLAYERS,
  BOSS_RAID_WINDOW_MS,
  LEVELS,
  NORMAL_RAID_REWARDS,
  WORLDS,
  type LevelDef,
} from '../constants';
import {CHARACTER_CLASSES} from '../constants/characters';
import {
  RAID_BOSSES,
  getBossRaidMaxHp,
  getNormalRaidMaxHp,
} from '../constants/raidBosses';
import {
  getLevelEnemyStats,
  getNormalRaidAttackStats,
  getRaidBossAttackStats,
  type EnemyTier,
} from './battleBalance';
import { getLevelClearRewards } from './levelProgress';
import {
  SKILL_EFFECT_BOOLEAN_FIELDS,
  SKILL_EFFECT_NUMERIC_FIELDS,
  type SkillEffectBooleanField,
  type SkillEffectNumericField,
} from './skillEffectCatalog';

export type CreatorRaidType = 'normal' | 'boss';
export type CreatorGoalType = 'defeat_enemy';
export type CreatorEncounterKind = 'level' | 'raid';
export type CreatorEncounterPattern =
  | 'basic_auto'
  | 'burst_every_n'
  | 'phase_hp_threshold'
  | 'rage_after_time';

export type CreatorBackgroundRule = {
  assetKey: string | null;
  tintColor: string;
  tintOpacity: number;
  removeImage: boolean;
};

export type CreatorEncounterTemplate = {
  id: string;
  kind: CreatorEncounterKind;
  displayName: string;
  tier: EnemyTier;
  monsterName: string;
  monsterEmoji: string;
  monsterColor: string;
  baseHp: number;
  baseAttack: number;
  attackIntervalMs: number;
  attackPattern: CreatorEncounterPattern;
  enabled: boolean;
  notes?: string;
};

export type CreatorEncounterOverrides = Partial<
  Pick<
    CreatorEncounterTemplate,
    | 'displayName'
    | 'tier'
    | 'monsterName'
    | 'monsterEmoji'
    | 'monsterColor'
    | 'baseHp'
    | 'baseAttack'
    | 'attackIntervalMs'
    | 'attackPattern'
  >
>;

export type CreatorLevelReward = {
  repeatGold: number;
  firstClearBonusGold: number;
  characterExp: number;
};

export type CreatorLevelConfig = {
  id: string;
  levelId: number;
  worldId: number;
  stageNumberInWorld: number;
  name: string;
  goalType: CreatorGoalType;
  goalValue: number;
  enemyTemplateId: string;
  enemyOverrides: CreatorEncounterOverrides;
  reward: CreatorLevelReward;
  unlocksBossRaidStage?: number;
  enabled: boolean;
  background: CreatorBackgroundRule;
  notes?: string;
};

export type CreatorRaidReward = {
  firstClearDiamondReward: number;
  repeatDiamondReward: number;
};

export type CreatorRaidConfig = {
  id: string;
  raidType: CreatorRaidType;
  stage: number;
  worldId: number | null;
  name: string;
  encounterTemplateId: string;
  encounterOverrides: CreatorEncounterOverrides;
  reward: CreatorRaidReward;
  timeLimitMs: number;
  raidWindowHours: number;
  joinWindowMinutes: number;
  maxParticipants: number;
  enabled: boolean;
  background: CreatorBackgroundRule;
  notes?: string;
};

export type CreatorCharacterBalanceConfig = {
  id: string;
  name: string;
  baseAtk: number;
  atkPerLevel: number;
  baseHp: number;
  hpPerLevel: number;
  notes?: string;
};

export type CreatorSkillNumericBalanceConfig = Partial<
  Record<SkillEffectNumericField, number>
>;

export type CreatorSkillBooleanBalanceConfig = Partial<
  Record<SkillEffectBooleanField, boolean>
>;

export type CreatorSkillBalanceConfig = {
  numeric: CreatorSkillNumericBalanceConfig;
  booleans: CreatorSkillBooleanBalanceConfig;
};

export type CreatorBalanceConfig = {
  characters: Record<string, CreatorCharacterBalanceConfig>;
  skillEffects: {
    global: CreatorSkillBalanceConfig;
    characters: Record<string, CreatorSkillBalanceConfig>;
  };
};

export type CreatorManifest = {
  version: number;
  levels: Record<string, CreatorLevelConfig>;
  raids: {
    normal: Record<string, CreatorRaidConfig>;
    boss: Record<string, CreatorRaidConfig>;
  };
  encounters: Record<string, CreatorEncounterTemplate>;
  balance: CreatorBalanceConfig;
  meta: {
    generatedAt: string;
    seededFromCode: boolean;
    notes?: string;
  };
};

export type ResolvedCreatorLevelRuntime = {
  config: CreatorLevelConfig;
  encounter: CreatorEncounterTemplate;
  levelId: number;
  worldId: number;
  stageNumberInWorld: number;
  name: string;
  monsterName: string;
  monsterEmoji: string;
  monsterColor: string;
  monsterHp: number;
  enemyAttack: number;
  attackIntervalMs: number;
  enemyTier: EnemyTier;
  reward: CreatorLevelReward;
  background: CreatorBackgroundRule;
  enabled: boolean;
};

export type ResolvedCreatorRaidRuntime = {
  config: CreatorRaidConfig;
  encounter: CreatorEncounterTemplate;
  raidType: CreatorRaidType;
  stage: number;
  name: string;
  monsterName: string;
  monsterEmoji: string;
  monsterColor: string;
  maxHp: number;
  enemyAttack: number;
  attackIntervalMs: number;
  enemyTier: EnemyTier;
  reward: CreatorRaidReward;
  timeLimitMs: number;
  raidWindowHours: number;
  joinWindowMinutes: number;
  maxParticipants: number;
  background: CreatorBackgroundRule;
  enabled: boolean;
};

export const DEFAULT_CREATOR_BACKGROUND_RULE: CreatorBackgroundRule = {
  assetKey: null,
  tintColor: '#000000',
  tintOpacity: 0,
  removeImage: false,
};

export const DEFAULT_CREATOR_SKILL_BALANCE_CONFIG: CreatorSkillBalanceConfig = {
  numeric: {},
  booleans: {},
};

function cloneBackgroundRule(
  value: Partial<CreatorBackgroundRule> | null | undefined,
): CreatorBackgroundRule {
  return {
    ...DEFAULT_CREATOR_BACKGROUND_RULE,
    ...(value ?? {}),
  };
}

function getRaidWindowHours() {
  return Math.max(1, Math.round(BOSS_RAID_INTERVAL_MS / (60 * 60 * 1000)));
}

function getRaidJoinWindowMinutes() {
  return Math.max(1, Math.round(BOSS_RAID_WINDOW_MS / (60 * 1000)));
}

function buildLevelEncounterId(levelId: number) {
  return `level_stage_${levelId}`;
}

function buildNormalRaidEncounterId(stage: number) {
  return `raid_normal_stage_${stage}`;
}

function buildBossRaidEncounterId(stage: number) {
  return `raid_boss_stage_${stage}`;
}

function buildLevelConfigId(levelId: number) {
  return `level_${levelId}`;
}

function buildRaidConfigId(raidType: CreatorRaidType, stage: number) {
  return `${raidType}_${stage}`;
}

function createDefaultCreatorSkillBalanceConfig(): CreatorSkillBalanceConfig {
  return {
    numeric: {},
    booleans: {},
  };
}

function createDefaultCharacterBalanceConfig(): Record<
  string,
  CreatorCharacterBalanceConfig
> {
  return CHARACTER_CLASSES.reduce(
    (acc, characterClass) => {
      acc[characterClass.id] = {
        id: characterClass.id,
        name: characterClass.name,
        baseAtk: characterClass.baseAtk,
        atkPerLevel: characterClass.atkPerLevel,
        baseHp: characterClass.baseHp,
        hpPerLevel: characterClass.hpPerLevel,
      };
      return acc;
    },
    {} as Record<string, CreatorCharacterBalanceConfig>,
  );
}

function createDefaultCharacterSkillBalanceConfig(): Record<
  string,
  CreatorSkillBalanceConfig
> {
  return CHARACTER_CLASSES.reduce(
    (acc, characterClass) => {
      acc[characterClass.id] = createDefaultCreatorSkillBalanceConfig();
      return acc;
    },
    {} as Record<string, CreatorSkillBalanceConfig>,
  );
}

function buildDefaultLevelEntry(level: LevelDef): {
  config: CreatorLevelConfig;
  encounter: CreatorEncounterTemplate;
} {
  const levelEnemyStats = getLevelEnemyStats(level.id, level.world);
  const firstClearReward = getLevelClearRewards(level.world, level.id, false);
  const repeatReward = getLevelClearRewards(level.world, level.id, true);
  const stageNumberInWorld = ((level.id - 1) % 30) + 1;
  const encounterId = buildLevelEncounterId(level.id);

  const encounter: CreatorEncounterTemplate = {
    id: encounterId,
    kind: 'level',
    displayName: level.goal.monsterName,
    tier: levelEnemyStats.tier,
    monsterName: level.goal.monsterName,
    monsterEmoji: level.goal.monsterEmoji,
    monsterColor: level.goal.monsterColor,
    baseHp: level.goal.monsterHp,
    baseAttack: levelEnemyStats.attack,
    attackIntervalMs: levelEnemyStats.attackIntervalMs,
    attackPattern: 'basic_auto',
    enabled: true,
  };

  return {
    encounter,
    config: {
      id: buildLevelConfigId(level.id),
      levelId: level.id,
      worldId: level.world,
      stageNumberInWorld,
      name: level.name,
      goalType: 'defeat_enemy',
      goalValue: level.goal.monsterHp,
      enemyTemplateId: encounterId,
      enemyOverrides: {},
      reward: {
        repeatGold: repeatReward.gold,
        firstClearBonusGold: Math.max(
          0,
          firstClearReward.gold - repeatReward.gold,
        ),
        characterExp: firstClearReward.xp,
      },
      unlocksBossRaidStage: stageNumberInWorld === 30 ? level.world : undefined,
      enabled: true,
      background: cloneBackgroundRule(null),
    },
  };
}

function buildDefaultRaidEntry(
  raidType: CreatorRaidType,
  stage: number,
): {
  config: CreatorRaidConfig;
  encounter: CreatorEncounterTemplate;
} {
  const raidBoss =
    RAID_BOSSES.find(entry => entry.stage === stage) ?? RAID_BOSSES[0];
  const reward =
    NORMAL_RAID_REWARDS.find(entry => entry.stage === stage) ??
    NORMAL_RAID_REWARDS[NORMAL_RAID_REWARDS.length - 1];
  const attackStats =
    raidType === 'normal'
      ? getNormalRaidAttackStats(stage)
      : getRaidBossAttackStats(stage);
  const encounterId =
    raidType === 'normal'
      ? buildNormalRaidEncounterId(stage)
      : buildBossRaidEncounterId(stage);
  const worldId = raidType === 'boss' ? Math.min(stage, WORLDS.length) : null;
  const defaultTimeLimitMs =
    raidType === 'normal' ? 15 * 60 * 1000 : BOSS_RAID_WINDOW_MS;

  const encounter: CreatorEncounterTemplate = {
    id: encounterId,
    kind: 'raid',
    displayName: raidBoss.nameKey,
    tier: 'boss',
    monsterName: raidBoss.nameKey,
    monsterEmoji: raidBoss.emoji,
    monsterColor: raidBoss.color,
    baseHp:
      raidType === 'normal'
        ? getNormalRaidMaxHp(stage)
        : getBossRaidMaxHp(stage),
    baseAttack: attackStats.attack,
    attackIntervalMs: attackStats.attackIntervalMs,
    attackPattern: 'basic_auto',
    enabled: true,
  };

  return {
    encounter,
    config: {
      id: buildRaidConfigId(raidType, stage),
      raidType,
      stage,
      worldId,
      name: raidBoss.nameKey,
      encounterTemplateId: encounterId,
      encounterOverrides: {},
      reward: {
        firstClearDiamondReward: reward.firstDia,
        repeatDiamondReward: reward.perKill,
      },
      timeLimitMs: defaultTimeLimitMs,
      raidWindowHours: getRaidWindowHours(),
      joinWindowMinutes: getRaidJoinWindowMinutes(),
      maxParticipants: BOSS_RAID_MAX_PLAYERS,
      enabled: true,
      background: cloneBackgroundRule(null),
    },
  };
}

export function buildDefaultCreatorManifest(): CreatorManifest {
  const manifest: CreatorManifest = {
    version: 0,
    levels: {},
    raids: {
      normal: {},
      boss: {},
    },
    encounters: {},
    balance: {
      characters: createDefaultCharacterBalanceConfig(),
      skillEffects: {
        global: createDefaultCreatorSkillBalanceConfig(),
        characters: createDefaultCharacterSkillBalanceConfig(),
      },
    },
    meta: {
      generatedAt: new Date(0).toISOString(),
      seededFromCode: true,
      notes: 'Seeded from current runtime defaults.',
    },
  };

  LEVELS.forEach(level => {
    const entry = buildDefaultLevelEntry(level);
    manifest.levels[String(level.id)] = entry.config;
    manifest.encounters[entry.encounter.id] = entry.encounter;
  });

  RAID_BOSSES.forEach(boss => {
    const normalEntry = buildDefaultRaidEntry('normal', boss.stage);
    manifest.raids.normal[String(boss.stage)] = normalEntry.config;
    manifest.encounters[normalEntry.encounter.id] = normalEntry.encounter;

    const bossEntry = buildDefaultRaidEntry('boss', boss.stage);
    manifest.raids.boss[String(boss.stage)] = bossEntry.config;
    manifest.encounters[bossEntry.encounter.id] = bossEntry.encounter;
  });

  return manifest;
}

export const DEFAULT_CREATOR_MANIFEST = buildDefaultCreatorManifest();

export function cloneCreatorManifest(
  manifest: CreatorManifest = DEFAULT_CREATOR_MANIFEST,
): CreatorManifest {
  return JSON.parse(JSON.stringify(manifest)) as CreatorManifest;
}

function sanitizeBackgroundRule(
  value: Partial<CreatorBackgroundRule> | null | undefined,
): CreatorBackgroundRule {
  const merged = {
    ...DEFAULT_CREATOR_BACKGROUND_RULE,
    ...(value ?? {}),
  };

  return {
    assetKey:
      typeof merged.assetKey === 'string' && merged.assetKey.trim().length > 0
        ? merged.assetKey.trim()
        : null,
    tintColor:
      typeof merged.tintColor === 'string' && merged.tintColor.trim().length > 0
        ? merged.tintColor.trim()
        : DEFAULT_CREATOR_BACKGROUND_RULE.tintColor,
    tintOpacity: Math.min(1, Math.max(0, Number(merged.tintOpacity) || 0)),
    removeImage: merged.removeImage === true,
  };
}

function sanitizeEncounterTemplate(
  fallback: CreatorEncounterTemplate,
  value: Partial<CreatorEncounterTemplate> | null | undefined,
): CreatorEncounterTemplate {
  const merged = {
    ...fallback,
    ...(value ?? {}),
  };

  return {
    ...fallback,
    ...merged,
    id: fallback.id,
    kind: fallback.kind,
    displayName:
      typeof merged.displayName === 'string' &&
      merged.displayName.trim().length > 0
        ? merged.displayName.trim()
        : fallback.displayName,
    monsterName:
      typeof merged.monsterName === 'string' &&
      merged.monsterName.trim().length > 0
        ? merged.monsterName.trim()
        : fallback.monsterName,
    monsterEmoji:
      typeof merged.monsterEmoji === 'string' &&
      merged.monsterEmoji.trim().length > 0
        ? merged.monsterEmoji.trim()
        : fallback.monsterEmoji,
    monsterColor:
      typeof merged.monsterColor === 'string' &&
      merged.monsterColor.trim().length > 0
        ? merged.monsterColor.trim()
        : fallback.monsterColor,
    baseHp: Math.max(1, Math.round(Number(merged.baseHp) || fallback.baseHp)),
    baseAttack: Math.max(
      1,
      Math.round(Number(merged.baseAttack) || fallback.baseAttack),
    ),
    attackIntervalMs: Math.max(
      500,
      Math.round(Number(merged.attackIntervalMs) || fallback.attackIntervalMs),
    ),
    attackPattern:
      merged.attackPattern === 'burst_every_n' ||
      merged.attackPattern === 'phase_hp_threshold' ||
      merged.attackPattern === 'rage_after_time'
        ? merged.attackPattern
        : 'basic_auto',
    enabled: merged.enabled !== false,
    notes:
      typeof merged.notes === 'string' && merged.notes.trim().length > 0
        ? merged.notes.trim()
        : fallback.notes,
    tier:
      merged.tier === 'elite' ||
      merged.tier === 'boss' ||
      merged.tier === 'normal'
        ? merged.tier
        : fallback.tier,
  };
}

function sanitizeEncounterOverrides(
  value: CreatorEncounterOverrides | null | undefined,
): CreatorEncounterOverrides {
  if (!value) {
    return {};
  }

  const next: CreatorEncounterOverrides = {};
  if (typeof value.displayName === 'string' && value.displayName.trim()) {
    next.displayName = value.displayName.trim();
  }
  if (typeof value.monsterName === 'string' && value.monsterName.trim()) {
    next.monsterName = value.monsterName.trim();
  }
  if (typeof value.monsterEmoji === 'string' && value.monsterEmoji.trim()) {
    next.monsterEmoji = value.monsterEmoji.trim();
  }
  if (typeof value.monsterColor === 'string' && value.monsterColor.trim()) {
    next.monsterColor = value.monsterColor.trim();
  }
  if (
    value.tier === 'normal' ||
    value.tier === 'elite' ||
    value.tier === 'boss'
  ) {
    next.tier = value.tier;
  }
  if (typeof value.baseHp === 'number' && Number.isFinite(value.baseHp)) {
    next.baseHp = Math.max(1, Math.round(value.baseHp));
  }
  if (
    typeof value.baseAttack === 'number' &&
    Number.isFinite(value.baseAttack)
  ) {
    next.baseAttack = Math.max(1, Math.round(value.baseAttack));
  }
  if (
    typeof value.attackIntervalMs === 'number' &&
    Number.isFinite(value.attackIntervalMs)
  ) {
    next.attackIntervalMs = Math.max(500, Math.round(value.attackIntervalMs));
  }
  if (
    value.attackPattern === 'basic_auto' ||
    value.attackPattern === 'burst_every_n' ||
    value.attackPattern === 'phase_hp_threshold' ||
    value.attackPattern === 'rage_after_time'
  ) {
    next.attackPattern = value.attackPattern;
  }
  return next;
}

function sanitizeLevelConfig(
  fallback: CreatorLevelConfig,
  value: Partial<CreatorLevelConfig> | null | undefined,
): CreatorLevelConfig {
  const merged = {
    ...fallback,
    ...(value ?? {}),
  };

  return {
    ...fallback,
    ...merged,
    id: fallback.id,
    levelId: fallback.levelId,
    worldId: Math.max(
      1,
      Math.round(Number(merged.worldId) || fallback.worldId),
    ),
    stageNumberInWorld: Math.max(
      1,
      Math.round(
        Number(merged.stageNumberInWorld) || fallback.stageNumberInWorld,
      ),
    ),
    name:
      typeof merged.name === 'string' && merged.name.trim().length > 0
        ? merged.name.trim()
        : fallback.name,
    goalType: 'defeat_enemy',
    goalValue: Math.max(
      1,
      Math.round(Number(merged.goalValue) || fallback.goalValue),
    ),
    enemyTemplateId:
      typeof merged.enemyTemplateId === 'string' &&
      merged.enemyTemplateId.trim().length > 0
        ? merged.enemyTemplateId.trim()
        : fallback.enemyTemplateId,
    enemyOverrides: sanitizeEncounterOverrides(merged.enemyOverrides),
    reward: {
      repeatGold: Math.max(
        0,
        Math.round(
          Number(merged.reward?.repeatGold) || fallback.reward.repeatGold,
        ),
      ),
      firstClearBonusGold: Math.max(
        0,
        Math.round(
          Number(merged.reward?.firstClearBonusGold) ||
            fallback.reward.firstClearBonusGold,
        ),
      ),
      characterExp: Math.max(
        0,
        Math.round(
          Number(merged.reward?.characterExp) || fallback.reward.characterExp,
        ),
      ),
    },
    unlocksBossRaidStage:
      typeof merged.unlocksBossRaidStage === 'number' &&
      Number.isFinite(merged.unlocksBossRaidStage)
        ? Math.max(1, Math.round(merged.unlocksBossRaidStage))
        : fallback.unlocksBossRaidStage,
    enabled: merged.enabled !== false,
    background: sanitizeBackgroundRule(merged.background),
    notes:
      typeof merged.notes === 'string' && merged.notes.trim().length > 0
        ? merged.notes.trim()
        : fallback.notes,
  };
}

function sanitizeRaidConfig(
  fallback: CreatorRaidConfig,
  value: Partial<CreatorRaidConfig> | null | undefined,
): CreatorRaidConfig {
  const merged = {
    ...fallback,
    ...(value ?? {}),
  };

  return {
    ...fallback,
    ...merged,
    id: fallback.id,
    raidType: fallback.raidType,
    stage: fallback.stage,
    worldId:
      merged.worldId === null
        ? null
        : Math.max(
            1,
            Math.round(
              Number(merged.worldId) ||
                (fallback.worldId === null ? 1 : fallback.worldId),
            ),
          ),
    name:
      typeof merged.name === 'string' && merged.name.trim().length > 0
        ? merged.name.trim()
        : fallback.name,
    encounterTemplateId:
      typeof merged.encounterTemplateId === 'string' &&
      merged.encounterTemplateId.trim().length > 0
        ? merged.encounterTemplateId.trim()
        : fallback.encounterTemplateId,
    encounterOverrides: sanitizeEncounterOverrides(merged.encounterOverrides),
    reward: {
      firstClearDiamondReward: Math.max(
        0,
        Math.round(
          Number(merged.reward?.firstClearDiamondReward) ||
            fallback.reward.firstClearDiamondReward,
        ),
      ),
      repeatDiamondReward: Math.max(
        0,
        Math.round(
          Number(merged.reward?.repeatDiamondReward) ||
            fallback.reward.repeatDiamondReward,
        ),
      ),
    },
    timeLimitMs: Math.max(
      1000,
      Math.round(Number(merged.timeLimitMs) || fallback.timeLimitMs),
    ),
    raidWindowHours: Math.max(
      1,
      Math.round(Number(merged.raidWindowHours) || fallback.raidWindowHours),
    ),
    joinWindowMinutes: Math.max(
      1,
      Math.round(
        Number(merged.joinWindowMinutes) || fallback.joinWindowMinutes,
      ),
    ),
    maxParticipants: Math.max(
      1,
      Math.round(Number(merged.maxParticipants) || fallback.maxParticipants),
    ),
    enabled: merged.enabled !== false,
    background: sanitizeBackgroundRule(merged.background),
    notes:
      typeof merged.notes === 'string' && merged.notes.trim().length > 0
        ? merged.notes.trim()
        : fallback.notes,
  };
}

function sanitizeCharacterBalanceConfig(
  fallback: CreatorCharacterBalanceConfig,
  value: Partial<CreatorCharacterBalanceConfig> | null | undefined,
): CreatorCharacterBalanceConfig {
  const merged = {
    ...fallback,
    ...(value ?? {}),
  };

  return {
    ...fallback,
    ...merged,
    id: fallback.id,
    name:
      typeof merged.name === 'string' && merged.name.trim().length > 0
        ? merged.name.trim()
        : fallback.name,
    baseAtk: Math.max(1, Math.round(Number(merged.baseAtk) || fallback.baseAtk)),
    atkPerLevel: Math.max(
      0,
      Math.round(Number(merged.atkPerLevel) || fallback.atkPerLevel),
    ),
    baseHp: Math.max(1, Math.round(Number(merged.baseHp) || fallback.baseHp)),
    hpPerLevel: Math.max(
      0,
      Math.round(Number(merged.hpPerLevel) || fallback.hpPerLevel),
    ),
    notes:
      typeof merged.notes === 'string' && merged.notes.trim().length > 0
        ? merged.notes.trim()
        : fallback.notes,
  };
}

function sanitizeCreatorSkillBalanceConfig(
  value: Partial<CreatorSkillBalanceConfig> | null | undefined,
): CreatorSkillBalanceConfig {
  const numeric: CreatorSkillNumericBalanceConfig = {};
  const booleans: CreatorSkillBooleanBalanceConfig = {};

  SKILL_EFFECT_NUMERIC_FIELDS.forEach(field => {
    const nextValue = value?.numeric?.[field];
    if (typeof nextValue === 'number' && Number.isFinite(nextValue)) {
      numeric[field] = Math.max(0, Math.min(10, nextValue));
    }
  });

  SKILL_EFFECT_BOOLEAN_FIELDS.forEach(field => {
    const nextValue = value?.booleans?.[field];
    if (typeof nextValue === 'boolean') {
      booleans[field] = nextValue;
    }
  });

  return {
    numeric,
    booleans,
  };
}

export function sanitizeCreatorManifest(
  input?: Partial<CreatorManifest> | null,
): CreatorManifest {
  const fallback = buildDefaultCreatorManifest();
  const value = input ?? {};

  const next: CreatorManifest = {
    version: Math.max(0, Math.round(Number(value.version) || fallback.version)),
    levels: {},
    raids: {
      normal: {},
      boss: {},
    },
    encounters: {},
    balance: {
      characters: {},
      skillEffects: {
        global: sanitizeCreatorSkillBalanceConfig(
          value.balance?.skillEffects?.global,
        ),
        characters: {},
      },
    },
    meta: {
      generatedAt:
        typeof value.meta?.generatedAt === 'string' &&
        value.meta.generatedAt.length > 0
          ? value.meta.generatedAt
          : fallback.meta.generatedAt,
      seededFromCode:
        typeof value.meta?.seededFromCode === 'boolean'
          ? value.meta.seededFromCode
          : fallback.meta.seededFromCode,
      notes:
        typeof value.meta?.notes === 'string' &&
        value.meta.notes.trim().length > 0
          ? value.meta.notes.trim()
          : fallback.meta.notes,
    },
  };

  Object.entries(fallback.encounters).forEach(([key, encounter]) => {
    next.encounters[key] = sanitizeEncounterTemplate(
      encounter,
      value.encounters?.[key],
    );
  });

  Object.entries(fallback.levels).forEach(([key, config]) => {
    next.levels[key] = sanitizeLevelConfig(config, value.levels?.[key]);
  });

  Object.entries(fallback.raids.normal).forEach(([key, config]) => {
    next.raids.normal[key] = sanitizeRaidConfig(
      config,
      value.raids?.normal?.[key],
    );
  });

  Object.entries(fallback.raids.boss).forEach(([key, config]) => {
    next.raids.boss[key] = sanitizeRaidConfig(config, value.raids?.boss?.[key]);
  });

  Object.entries(fallback.balance.characters).forEach(([key, config]) => {
    next.balance.characters[key] = sanitizeCharacterBalanceConfig(
      config,
      value.balance?.characters?.[key],
    );
  });

  Object.entries(fallback.balance.skillEffects.characters).forEach(
    ([key, config]) => {
      next.balance.skillEffects.characters[key] = sanitizeCreatorSkillBalanceConfig(
        value.balance?.skillEffects?.characters?.[key] ?? config,
      );
    },
  );

  return next;
}

export function listCreatorLevels(manifest: CreatorManifest) {
  return Object.values(manifest.levels).sort(
    (left, right) => left.levelId - right.levelId,
  );
}

export function listCreatorRaids(
  manifest: CreatorManifest,
  raidType: CreatorRaidType,
) {
  return Object.values(manifest.raids[raidType]).sort(
    (left, right) => left.stage - right.stage,
  );
}

export function listCreatorEncounters(manifest: CreatorManifest) {
  return Object.values(manifest.encounters).sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

export function getCreatorLevelConfig(
  manifest: CreatorManifest,
  levelId: number,
) {
  return manifest.levels[String(levelId)] ?? null;
}

export function getCreatorRaidConfig(
  manifest: CreatorManifest,
  raidType: CreatorRaidType,
  stage: number,
) {
  return manifest.raids[raidType][String(stage)] ?? null;
}

export function getCreatorEncounter(
  manifest: CreatorManifest,
  encounterId: string | null | undefined,
) {
  if (!encounterId) {
    return null;
  }

  return manifest.encounters[encounterId] ?? null;
}

export function getCreatorCharacterBalance(
  manifest: CreatorManifest,
  characterId: string,
) {
  return manifest.balance.characters[characterId] ?? null;
}

export function getCreatorSkillBalance(
  manifest: CreatorManifest,
  characterId: string | null,
) {
  return {
    global: manifest.balance.skillEffects.global,
    character: characterId
      ? manifest.balance.skillEffects.characters[characterId] ??
        DEFAULT_CREATOR_SKILL_BALANCE_CONFIG
      : DEFAULT_CREATOR_SKILL_BALANCE_CONFIG,
  };
}

function applyEncounterOverrides(
  encounter: CreatorEncounterTemplate,
  overrides: CreatorEncounterOverrides,
): CreatorEncounterTemplate {
  return sanitizeEncounterTemplate(encounter, {
    ...encounter,
    ...overrides,
  });
}

export function resolveCreatorLevelRuntime(
  manifest: CreatorManifest,
  levelId: number,
): ResolvedCreatorLevelRuntime | null {
  const config = getCreatorLevelConfig(manifest, levelId);
  if (!config || config.enabled === false) {
    return null;
  }

  const encounter = getCreatorEncounter(manifest, config.enemyTemplateId);
  if (!encounter || encounter.enabled === false) {
    return null;
  }

  const resolvedEncounter = applyEncounterOverrides(
    encounter,
    config.enemyOverrides,
  );
  return {
    config,
    encounter: resolvedEncounter,
    levelId: config.levelId,
    worldId: config.worldId,
    stageNumberInWorld: config.stageNumberInWorld,
    name: config.name,
    monsterName: resolvedEncounter.monsterName,
    monsterEmoji: resolvedEncounter.monsterEmoji,
    monsterColor: resolvedEncounter.monsterColor,
    monsterHp: resolvedEncounter.baseHp,
    enemyAttack: resolvedEncounter.baseAttack,
    attackIntervalMs: resolvedEncounter.attackIntervalMs,
    enemyTier: resolvedEncounter.tier,
    reward: config.reward,
    background: config.background,
    enabled: config.enabled,
  };
}

export function resolveCreatorRaidRuntime(
  manifest: CreatorManifest,
  raidType: CreatorRaidType,
  stage: number,
): ResolvedCreatorRaidRuntime | null {
  const config = getCreatorRaidConfig(manifest, raidType, stage);
  if (!config || config.enabled === false) {
    return null;
  }

  const encounter = getCreatorEncounter(manifest, config.encounterTemplateId);
  if (!encounter || encounter.enabled === false) {
    return null;
  }

  const resolvedEncounter = applyEncounterOverrides(
    encounter,
    config.encounterOverrides,
  );

  return {
    config,
    encounter: resolvedEncounter,
    raidType,
    stage: config.stage,
    name: config.name,
    monsterName: resolvedEncounter.monsterName,
    monsterEmoji: resolvedEncounter.monsterEmoji,
    monsterColor: resolvedEncounter.monsterColor,
    maxHp: resolvedEncounter.baseHp,
    enemyAttack: resolvedEncounter.baseAttack,
    attackIntervalMs: resolvedEncounter.attackIntervalMs,
    enemyTier: resolvedEncounter.tier,
    reward: config.reward,
    timeLimitMs: config.timeLimitMs,
    raidWindowHours: config.raidWindowHours,
    joinWindowMinutes: config.joinWindowMinutes,
    maxParticipants: config.maxParticipants,
    background: config.background,
    enabled: config.enabled,
  };
}

export function collectReferencedCreatorAssetKeys(manifest: CreatorManifest) {
  const keys = new Set<string>();

  Object.values(manifest.levels).forEach(level => {
    if (level.background.assetKey && level.background.removeImage !== true) {
      keys.add(level.background.assetKey);
    }
  });

  Object.values(manifest.raids.normal).forEach(raid => {
    if (raid.background.assetKey && raid.background.removeImage !== true) {
      keys.add(raid.background.assetKey);
    }
  });

  Object.values(manifest.raids.boss).forEach(raid => {
    if (raid.background.assetKey && raid.background.removeImage !== true) {
      keys.add(raid.background.assetKey);
    }
  });

  return Array.from(keys);
}
