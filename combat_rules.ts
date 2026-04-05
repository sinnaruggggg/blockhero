import type {
  BossRaidDefinition,
  CharacterClassId,
  CharacterDefinition,
  SkillDefinition,
} from './src/types/gameDesign';
import {
  COMBO_WINDOW_MS,
  DEFAULT_ITEM_CAP,
  ENDLESS_REWARD_THRESHOLDS,
  FEVER_DAMAGE_MULTIPLIER,
  FEVER_DURATION_MS,
  FEVER_LINE_REQUIREMENT,
  GEM_CELL_SPAWN_RATE,
  HEART_REGEN_MS,
  ITEM_CELL_SPAWN_RATE,
  MAX_HEARTS,
  getBossRaidMaxHp,
  getClearBonusMultiplier,
  getComboMultiplier,
  getEndlessObstacleTier,
} from './game_balance_runtime';
import {
  BOSS_RAID_DEFINITIONS,
  CHARACTER_DEFINITIONS,
  SKILL_DEFINITIONS,
} from './game_catalog';

export type GameMode =
  | 'level'
  | 'endless'
  | 'battle'
  | 'normal_raid'
  | 'boss_raid';

export type DefaultItemId = 'hammer' | 'bomb' | 'refresh';

export interface CharacterStats {
  attack: number;
  maxHp: number;
}

export interface SkillLevelEntry {
  skillId: string;
  level: number;
}

export interface DamageContext {
  mode: GameMode;
  placedCells: number;
  effectiveAttack: number;
  clearedLinesThisAction: number;
  comboCount: number;
  feverActive: boolean;
  feverMultiplier?: number;
  extraDamageMultiplier?: number;
}

export interface DamageBreakdown {
  baseDamage: number;
  clearBonusMultiplier: number;
  comboMultiplier: number;
  feverMultiplier: number;
  modeMultiplier: number;
  finalDamage: number;
}

export interface ComboState {
  comboCount: number;
  comboStartedAtMs: number | null;
  lastClearAtMs: number | null;
  expiresAtMs: number | null;
}

export interface FeverState {
  lineGauge: number;
  requirement: number;
  active: boolean;
  startedAtMs: number | null;
  endsAtMs: number | null;
}

export interface EndlessRewardState {
  nextScoreTarget: number | null;
  nextGoldReward: number | null;
}

export interface BattleModifiers {
  attackRateBonus: number;
  maxHpRateBonus: number;
  comboWindowMsBonus: number;
  feverRequirementRate: number;
  feverDurationMsBonus: number;
  feverDamageRateBonus: number;
  incomingDamageReductionRate: number;
  endlessObstacleSpawnReductionRate: number;
  lineClearDamageRateBonus: number;
  baseAttackRatePartyBonus: number;
  raidDamageRatePartyBonus: number;
  skillDamageRatePartyBonus: number;
  currencyRewardRateBonus: number;
  diamondCellRateBonus: number;
  bonusDiamondChance: number;
  rareItemRateBonus: number;
  heartMaxBonus: number;
  heartRegenReductionRate: number;
}

export interface PartySkillOwner {
  classId: CharacterClassId;
  skills: SkillLevelEntry[];
}

export interface ItemAddResult {
  nextCount: number;
  overflow: number;
}

export interface SpecialCellRoll {
  kind: 'item' | 'gem' | 'none';
  itemId?: DefaultItemId;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToInt(value: number): number {
  return Math.round(value);
}

export function getCharacterDefinition(
  classId: CharacterClassId,
): CharacterDefinition {
  const definition = CHARACTER_DEFINITIONS.find(character => character.id === classId);

  if (!definition) {
    throw new Error(`Unknown character class: ${classId}`);
  }

  return definition;
}

export function getCharacterBaseStats(
  classId: CharacterClassId,
  level: number,
): CharacterStats {
  const definition = getCharacterDefinition(classId);
  const safeLevel = Math.max(1, level);

  return {
    attack:
      definition.baseAttack + (safeLevel - 1) * definition.attackGrowthPerLevel,
    maxHp: definition.baseHp + (safeLevel - 1) * definition.hpGrowthPerLevel,
  };
}

export function getSkillDefinition(skillId: string): SkillDefinition {
  const skillDefinition = SKILL_DEFINITIONS.find(skill => skill.id === skillId);

  if (!skillDefinition) {
    throw new Error(`Unknown skill id: ${skillId}`);
  }

  return skillDefinition;
}

export function getSkillsForClass(classId: CharacterClassId): SkillDefinition[] {
  return SKILL_DEFINITIONS.filter(skill => skill.classId === classId);
}

export function resolveScaledSkillValue(
  skillDefinition: SkillDefinition,
  skillLevel: number,
): number {
  const level = clamp(skillLevel, 0, skillDefinition.maxLevel);

  if (!skillDefinition.scaling || level <= 0) {
    return 0;
  }

  const value =
    skillDefinition.scaling.baseValue +
    (level - 1) * skillDefinition.scaling.perLevel;

  if (typeof skillDefinition.scaling.cap === 'number') {
    return Math.min(value, skillDefinition.scaling.cap);
  }

  return value;
}

export function canUnlockOrUpgradeSkill(
  skillId: string,
  entries: SkillLevelEntry[],
): boolean {
  const skillDefinition = getSkillDefinition(skillId);
  const current = entries.find(entry => entry.skillId === skillId)?.level ?? 0;

  if (current >= skillDefinition.maxLevel) {
    return false;
  }

  if (!skillDefinition.prerequisiteSkillId) {
    return true;
  }

  const prerequisiteLevel =
    entries.find(entry => entry.skillId === skillDefinition.prerequisiteSkillId)?.level ?? 0;
  const prerequisiteDefinition = getSkillDefinition(skillDefinition.prerequisiteSkillId);

  return prerequisiteLevel >= prerequisiteDefinition.maxLevel;
}

export function getNextUnlockableSkills(
  classId: CharacterClassId,
  entries: SkillLevelEntry[],
): SkillDefinition[] {
  return getSkillsForClass(classId).filter(skillDefinition =>
    canUnlockOrUpgradeSkill(skillDefinition.id, entries),
  );
}

export function getDefaultModifiers(): BattleModifiers {
  return {
    attackRateBonus: 0,
    maxHpRateBonus: 0,
    comboWindowMsBonus: 0,
    feverRequirementRate: 1,
    feverDurationMsBonus: 0,
    feverDamageRateBonus: 0,
    incomingDamageReductionRate: 0,
    endlessObstacleSpawnReductionRate: 0,
    lineClearDamageRateBonus: 0,
    baseAttackRatePartyBonus: 0,
    raidDamageRatePartyBonus: 0,
    skillDamageRatePartyBonus: 0,
    currencyRewardRateBonus: 0,
    diamondCellRateBonus: 0,
    bonusDiamondChance: 0,
    rareItemRateBonus: 0,
    heartMaxBonus: 0,
    heartRegenReductionRate: 0,
  };
}

function applySkillToModifiers(
  modifiers: BattleModifiers,
  skillDefinition: SkillDefinition,
  skillLevel: number,
): BattleModifiers {
  if (skillLevel <= 0) {
    return modifiers;
  }

  const scaled = resolveScaledSkillValue(skillDefinition, skillLevel);
  const next = {...modifiers};

  switch (skillDefinition.effectType) {
    case 'combo_attack_bonus_rate':
      next.attackRateBonus += scaled;
      break;
    case 'incoming_damage_reduction_rate':
      next.incomingDamageReductionRate += scaled;
      break;
    case 'endless_obstacle_spawn_rate_reduction':
      next.endlessObstacleSpawnReductionRate += scaled;
      break;
    case 'fever_requirement_reduction_rate':
      next.feverRequirementRate *= 1 - scaled;
      break;
    case 'fever_gauge_charge_rate':
      next.lineClearDamageRateBonus += scaled;
      break;
    case 'fever_damage_bonus_rate':
      next.feverDamageRateBonus += scaled;
      break;
    case 'line_clear_damage_rate':
    case 'party_line_clear_damage_rate':
      next.lineClearDamageRateBonus += scaled;
      break;
    case 'party_base_attack_rate':
      next.baseAttackRatePartyBonus += scaled;
      break;
    case 'party_raid_damage_rate':
      next.raidDamageRatePartyBonus += scaled;
      break;
    case 'party_skill_damage_rate':
      next.skillDamageRatePartyBonus += scaled;
      break;
    case 'party_currency_reward_rate':
    case 'party_raid_reward_rate':
      next.currencyRewardRateBonus += scaled;
      break;
    case 'diamond_drop_rate_and_bonus':
      next.diamondCellRateBonus += Number(
        skillDefinition.extra?.diamondCellRateBonus ?? 0,
      );
      next.bonusDiamondChance += Number(
        skillDefinition.extra?.bonusDiamondChance ?? 0,
      );
      break;
    case 'diamond_cell_spawn_rate':
      next.diamondCellRateBonus += scaled;
      break;
    case 'rare_item_block_rate_bonus':
      next.rareItemRateBonus += scaled;
      break;
    case 'heart_capacity_and_regen_bonus':
      next.heartMaxBonus += Number(skillDefinition.extra?.extraHearts ?? 0);
      next.heartRegenReductionRate += Number(
        skillDefinition.extra?.regenReductionRate ?? 0,
      );
      break;
    case 'party_fever_duration_bonus_sec':
      next.feverDurationMsBonus += scaled * 1000;
      break;
    case 'party_combo_window_bonus_sec':
      next.comboWindowMsBonus += scaled * 1000;
      break;
    case 'party_attack_rate_per_member':
    case 'party_max_hp_rate_per_member':
      break;
    default:
      break;
  }

  return next;
}

export function derivePersonalModifiers(
  entries: SkillLevelEntry[],
): BattleModifiers {
  return entries.reduce((modifiers, entry) => {
    const skillDefinition = SKILL_DEFINITIONS.find(skill => skill.id === entry.skillId);

    if (!skillDefinition || skillDefinition.treeType !== 'personal') {
      return modifiers;
    }

    return applySkillToModifiers(modifiers, skillDefinition, entry.level);
  }, getDefaultModifiers());
}

export function derivePartyModifiers(
  partyEntries: PartySkillOwner[],
): BattleModifiers {
  const highestPerSkill = new Map<string, {definition: SkillDefinition; level: number}>();
  const partyMemberCount = partyEntries.length;

  for (const member of partyEntries) {
    for (const entry of member.skills) {
      const definition = SKILL_DEFINITIONS.find(skill => skill.id === entry.skillId);

      if (!definition || definition.treeType !== 'party') {
        continue;
      }

      const previous = highestPerSkill.get(definition.id);
      if (!previous || entry.level > previous.level) {
        highestPerSkill.set(definition.id, {definition, level: entry.level});
      }
    }
  }

  let modifiers = getDefaultModifiers();
  for (const active of highestPerSkill.values()) {
    const scaled = resolveScaledSkillValue(active.definition, active.level);

    if (active.definition.effectType === 'party_attack_rate_per_member') {
      modifiers = {
        ...modifiers,
        baseAttackRatePartyBonus:
          modifiers.baseAttackRatePartyBonus + scaled * partyMemberCount,
      };
      continue;
    }

    if (active.definition.effectType === 'party_max_hp_rate_per_member') {
      const capRate = Number(active.definition.extra?.capRate ?? Number.POSITIVE_INFINITY);
      modifiers = {
        ...modifiers,
        maxHpRateBonus:
          modifiers.maxHpRateBonus + Math.min(capRate, scaled * partyMemberCount),
      };
      continue;
    }

    modifiers = applySkillToModifiers(modifiers, active.definition, active.level);
  }

  return modifiers;
}

export function calculateEffectiveCharacterStats(
  classId: CharacterClassId,
  level: number,
  personalEntries: SkillLevelEntry[],
  partyModifiers?: BattleModifiers,
): {
  attack: number;
  maxHp: number;
  maxHearts: number;
  heartRegenMs: number;
  comboWindowMs: number;
  feverRequirement: number;
  feverDurationMs: number;
  modifiers: BattleModifiers;
} {
  const baseStats = getCharacterBaseStats(classId, level);
  const personalModifiers = derivePersonalModifiers(personalEntries);
  const party = partyModifiers ?? getDefaultModifiers();

  const merged: BattleModifiers = {
    ...personalModifiers,
    attackRateBonus:
      personalModifiers.attackRateBonus + party.baseAttackRatePartyBonus,
    maxHpRateBonus: personalModifiers.maxHpRateBonus + party.maxHpRateBonus,
    comboWindowMsBonus:
      personalModifiers.comboWindowMsBonus + party.comboWindowMsBonus,
    feverRequirementRate:
      personalModifiers.feverRequirementRate * party.feverRequirementRate,
    feverDurationMsBonus:
      personalModifiers.feverDurationMsBonus + party.feverDurationMsBonus,
    feverDamageRateBonus:
      personalModifiers.feverDamageRateBonus + party.feverDamageRateBonus,
    incomingDamageReductionRate:
      personalModifiers.incomingDamageReductionRate + party.incomingDamageReductionRate,
    endlessObstacleSpawnReductionRate:
      personalModifiers.endlessObstacleSpawnReductionRate +
      party.endlessObstacleSpawnReductionRate,
    lineClearDamageRateBonus:
      personalModifiers.lineClearDamageRateBonus + party.lineClearDamageRateBonus,
    baseAttackRatePartyBonus: party.baseAttackRatePartyBonus,
    raidDamageRatePartyBonus: party.raidDamageRatePartyBonus,
    skillDamageRatePartyBonus: party.skillDamageRatePartyBonus,
    currencyRewardRateBonus:
      personalModifiers.currencyRewardRateBonus + party.currencyRewardRateBonus,
    diamondCellRateBonus:
      personalModifiers.diamondCellRateBonus + party.diamondCellRateBonus,
    bonusDiamondChance:
      personalModifiers.bonusDiamondChance + party.bonusDiamondChance,
    rareItemRateBonus:
      personalModifiers.rareItemRateBonus + party.rareItemRateBonus,
    heartMaxBonus: personalModifiers.heartMaxBonus + party.heartMaxBonus,
    heartRegenReductionRate:
      personalModifiers.heartRegenReductionRate + party.heartRegenReductionRate,
  };

  const attack = roundToInt(baseStats.attack * (1 + merged.attackRateBonus));
  const maxHp = roundToInt(baseStats.maxHp * (1 + merged.maxHpRateBonus));
  const maxHearts = MAX_HEARTS + merged.heartMaxBonus;
  const heartRegenMs = roundToInt(
    HEART_REGEN_MS * (1 - clamp(merged.heartRegenReductionRate, 0, 0.9)),
  );
  const comboWindowMs = COMBO_WINDOW_MS + merged.comboWindowMsBonus;
  const feverRequirement = Math.max(
    1,
    roundToInt(FEVER_LINE_REQUIREMENT * merged.feverRequirementRate),
  );
  const feverDurationMs = FEVER_DURATION_MS + merged.feverDurationMsBonus;

  return {
    attack,
    maxHp,
    maxHearts,
    heartRegenMs,
    comboWindowMs,
    feverRequirement,
    feverDurationMs,
    modifiers: merged,
  };
}

export function calculateActionDamage(
  context: DamageContext,
): DamageBreakdown {
  const baseDamage =
    context.mode === 'normal_raid' || context.mode === 'boss_raid'
      ? context.placedCells *
        (context.effectiveAttack + context.clearedLinesThisAction)
      : context.placedCells * context.effectiveAttack;

  const clearBonusMultiplier = getClearBonusMultiplier(
    context.clearedLinesThisAction,
  );
  const comboMultiplier = getComboMultiplier(context.comboCount);
  const feverMultiplier = context.feverActive
    ? context.feverMultiplier ?? FEVER_DAMAGE_MULTIPLIER
    : 1;
  const modeMultiplier = context.extraDamageMultiplier ?? 1;
  const finalDamage = roundToInt(
    baseDamage *
      clearBonusMultiplier *
      comboMultiplier *
      feverMultiplier *
      modeMultiplier,
  );

  return {
    baseDamage,
    clearBonusMultiplier,
    comboMultiplier,
    feverMultiplier,
    modeMultiplier,
    finalDamage,
  };
}

export function updateComboState(
  previous: ComboState,
  nowMs: number,
  lineClearTriggered: boolean,
  comboWindowMs: number = COMBO_WINDOW_MS,
): ComboState {
  if (!lineClearTriggered) {
    if (previous.expiresAtMs !== null && nowMs > previous.expiresAtMs) {
      return {
        comboCount: 0,
        comboStartedAtMs: null,
        lastClearAtMs: null,
        expiresAtMs: null,
      };
    }

    return previous;
  }

  const canChain =
    previous.lastClearAtMs !== null &&
    nowMs - previous.lastClearAtMs <= comboWindowMs;
  const comboCount = canChain ? previous.comboCount + 1 : 1;
  const comboStartedAtMs = canChain
    ? previous.comboStartedAtMs ?? nowMs
    : nowMs;

  return {
    comboCount,
    comboStartedAtMs,
    lastClearAtMs: nowMs,
    expiresAtMs: nowMs + comboWindowMs,
  };
}

export function updateFeverState(
  previous: FeverState,
  nowMs: number,
  clearedLinesThisAction: number,
  feverRequirement: number,
  feverDurationMs: number,
): FeverState {
  const isExpired =
    previous.active && previous.endsAtMs !== null && nowMs >= previous.endsAtMs;
  const active = isExpired ? false : previous.active;
  const currentGauge = isExpired ? 0 : previous.lineGauge;

  if (active) {
    return {
      lineGauge: currentGauge,
      requirement: feverRequirement,
      active: true,
      startedAtMs: previous.startedAtMs,
      endsAtMs: previous.endsAtMs,
    };
  }

  const nextGauge = currentGauge + clearedLinesThisAction;
  if (nextGauge >= feverRequirement) {
    return {
      lineGauge: 0,
      requirement: feverRequirement,
      active: true,
      startedAtMs: nowMs,
      endsAtMs: nowMs + feverDurationMs,
    };
  }

  return {
    lineGauge: nextGauge,
    requirement: feverRequirement,
    active: false,
    startedAtMs: null,
    endsAtMs: null,
  };
}

export function getNextEndlessRewardState(score: number): EndlessRewardState {
  const nextThreshold = ENDLESS_REWARD_THRESHOLDS.find(
    threshold => score < threshold.scoreTarget,
  );

  return {
    nextScoreTarget: nextThreshold?.scoreTarget ?? null,
    nextGoldReward: nextThreshold?.goldReward ?? null,
  };
}

export function getCurrentEndlessObstacleTier(score: number): number {
  return getEndlessObstacleTier(score);
}

export function reduceObstacleDurability(
  durability: number,
): {nextDurability: number; destroyed: boolean} {
  const nextDurability = Math.max(0, durability - 1);
  return {
    nextDurability,
    destroyed: nextDurability === 0,
  };
}

export function addItemWithCap(
  currentCount: number,
  delta: number,
  cap: number = DEFAULT_ITEM_CAP,
): ItemAddResult {
  const raw = currentCount + delta;
  const nextCount = Math.min(cap, Math.max(0, raw));
  const overflow = Math.max(0, raw - cap);

  return {
    nextCount,
    overflow,
  };
}

export function rollSpecialCell(
  randomValue: number,
  itemRandomValue: number,
  modifiers?: BattleModifiers,
): SpecialCellRoll {
  const itemRate = ITEM_CELL_SPAWN_RATE + (modifiers?.rareItemRateBonus ?? 0);
  const gemRate = GEM_CELL_SPAWN_RATE + (modifiers?.diamondCellRateBonus ?? 0);

  if (randomValue < itemRate) {
    const itemId = (['hammer', 'bomb', 'refresh'] as const)[
      Math.floor(itemRandomValue * 3)
    ];
    return {
      kind: 'item',
      itemId,
    };
  }

  if (randomValue < itemRate + gemRate) {
    return {
      kind: 'gem',
    };
  }

  return {
    kind: 'none',
  };
}

export function getBossRaidDefinition(stage: number): BossRaidDefinition {
  const boss = BOSS_RAID_DEFINITIONS.find(entry => entry.stage === stage);

  if (!boss) {
    return {
      id: `boss_raid_stage_${stage}`,
      stage,
      worldId: stage,
      name: `Boss Stage ${stage}`,
      maxHp: getBossRaidMaxHp(stage),
      unlockWorldId: stage,
      raidWindowHours: 4,
      joinWindowMinutes: 10,
      maxParticipants: 30,
    };
  }

  return boss;
}
