import {ENDLESS_REWARD_THRESHOLDS, SHOP_ITEM_PRICES} from './game_balance_runtime';
import type {
  CharacterClassId,
  ItemPriceDefinition,
  StageDefinition,
} from './src/types/gameDesign';
import {
  BOSS_RAID_DEFINITIONS,
  CHARACTER_DEFINITIONS,
  NORMAL_RAID_BOSSES,
  SKIN_DEFINITIONS,
  STAGE_DEFINITIONS,
  WORLD_DEFINITIONS,
  getSkillsForClass as getCatalogSkillsForClass,
} from './game_catalog';
import {
  addItemWithCap,
  calculateActionDamage,
  calculateEffectiveCharacterStats,
  canUnlockOrUpgradeSkill,
  derivePartyModifiers,
  getSkillDefinition,
  getCurrentEndlessObstacleTier,
  resolveScaledSkillValue,
  updateComboState,
  updateFeverState,
} from './combat_rules';
import type {
  ComboState,
  DefaultItemId,
  FeverState,
  GameMode,
  PartySkillOwner,
  SkillLevelEntry,
} from './combat_rules';
import {
  BOARD_COLS,
  BOARD_ROWS,
  addRandomObstacle,
  applyPiecePlacement,
  canPlaceAnyPiece,
  cloneBoard,
  createEmptyBoard,
  createPiecePack,
  createPieceQueue,
  getCenteredOrigin,
} from './puzzle_engine';
import type {
  BoardCell,
  BoardState,
  PieceDefinition,
  PieceGenerationOptions,
} from './puzzle_engine';
import {
  getSkinDefinition,
  getSummonAttack,
  getSummonDefinitionBySkinId,
  getSummonExpRequired,
} from './skin_runtime';

export type Screen = 'home' | 'characters' | 'levels' | 'endless' | 'raids' | 'shop' | 'run';
export type ToolMode = 'place' | 'hammer' | 'bomb';
export type InventoryState = Record<DefaultItemId, number>;
export type ShopCurrency = 'gold' | 'diamond';

export interface CharacterProgress {
  classId: CharacterClassId;
  level: number;
  exp: number;
  skillPoints: number;
  skills: SkillLevelEntry[];
}

export interface ChatMessage {
  id: number;
  author: string;
  text: string;
  createdAtMs: number;
}

export interface SummonProgress {
  level: number;
  exp: number;
  evolutionTier: number;
  activeTimeLeftSec: number;
}

export interface RaidStandingEntry {
  id: string;
  name: string;
  damage: number;
}

export interface ActiveRun {
  id: number;
  mode: GameMode;
  title: string;
  subtitle: string;
  board: BoardState;
  pieces: PieceDefinition[];
  upcomingPieces: PieceDefinition[];
  previewCount: number;
  pieceGeneration: PieceGenerationOptions;
  selectedPieceId: number | null;
  selectedTool: ToolMode;
  combo: ComboState;
  fever: FeverState;
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number | null;
  enemyMaxHp: number | null;
  enemyAttack: number;
  attackCountdown: number;
  attackCountdownMax: number;
  score: number;
  earnedGold: number;
  earnedDiamonds: number;
  totalClearedLines: number;
  stageId?: number;
  raidStage?: number;
  lobbyChat: ChatMessage[];
  voiceEnabled: boolean;
  partySummary: string[];
  logs: string[];
  ended: boolean;
  victory: boolean;
  nextEndlessRewardScore: number | null;
  nextEndlessRewardGold: number | null;
  equippedSkinId: string | null;
  summonId: string | null;
  summonGauge: number;
  summonGaugeRequired: number;
  summonActive: boolean;
  summonRemainingMs: number;
  summonAttack: number;
  summonExpEarned: number;
  lastTickAtMs: number | null;
  raidStandings: RaidStandingEntry[];
}

export interface PlayerState {
  hearts: number;
  lastHeartChargeAtMs: number;
  gold: number;
  diamonds: number;
  selectedClassId: CharacterClassId;
  characters: Record<CharacterClassId, CharacterProgress>;
  inventory: InventoryState;
  unlockedStageId: number;
  clearedStageIds: number[];
  unlockedBossRaidStage: number;
  normalRaidClearCounts: Record<number, number>;
  unlockedSkinIds: string[];
  equippedSkinId: string | null;
  summonProgress: Record<string, SummonProgress>;
}

export interface AppState {
  screen: Screen;
  selectedWorldId: number;
  selectedStageId: number;
  selectedRaidStage: number;
  selectedRaidType: 'normal' | 'boss';
  player: PlayerState;
  raidLobbyMessages: ChatMessage[];
  activeRun: ActiveRun | null;
}

export type AppAction =
  | {type: 'hydrate_state'; snapshot: AppState}
  | {type: 'tick'; nowMs: number}
  | {type: 'select_screen'; screen: Screen}
  | {type: 'select_world'; worldId: number}
  | {type: 'select_stage'; stageId: number}
  | {type: 'select_raid_type'; raidType: 'normal' | 'boss'}
  | {type: 'select_raid_stage'; stage: number}
  | {type: 'select_class'; classId: CharacterClassId}
  | {type: 'upgrade_skill'; skillId: string}
  | {type: 'equip_skin'; skinId: string | null}
  | {type: 'start_level_run'; stageId: number}
  | {type: 'start_endless_run'}
  | {type: 'start_normal_raid'; stage: number}
  | {type: 'start_boss_raid'; stage: number}
  | {type: 'select_piece'; pieceId: number}
  | {type: 'select_tool'; tool: ToolMode}
  | {type: 'tap_board'; row: number; col: number}
  | {type: 'use_refresh'}
  | {type: 'toggle_voice'}
  | {type: 'toggle_summon'}
  | {type: 'send_lobby_message'; text: string}
  | {type: 'send_run_message'; text: string}
  | {type: 'buy_shop_item'; itemId: DefaultItemId; currency: ShopCurrency}
  | {type: 'claim_run'};

const EMPTY_COMBO: ComboState = {
  comboCount: 0,
  comboStartedAtMs: null,
  lastClearAtMs: null,
  expiresAtMs: null,
};

let nextRunId = 1;
let nextChatMessageId = 1;

function createInventoryState(): InventoryState {
  return {
    hammer: 1,
    bomb: 1,
    refresh: 1,
  };
}

function createCharacterProgress(classId: CharacterClassId): CharacterProgress {
  return {
    classId,
    level: 1,
    exp: 0,
    skillPoints: 0,
    skills: [],
  };
}

function createCharacterMap(): Record<CharacterClassId, CharacterProgress> {
  return {
    knight: createCharacterProgress('knight'),
    mage: createCharacterProgress('mage'),
    archer: createCharacterProgress('archer'),
    rogue: createCharacterProgress('rogue'),
    healer: createCharacterProgress('healer'),
  };
}

function createSummonProgressMap(): Record<string, SummonProgress> {
  return SKIN_DEFINITIONS.reduce<Record<string, SummonProgress>>((accumulator, skin) => {
    accumulator[skin.summonId] = {
      level: 1,
      exp: 0,
      evolutionTier: 1,
      activeTimeLeftSec: 300,
    };
    return accumulator;
  }, {});
}

function createChatMessage(author: string, text: string, createdAtMs: number): ChatMessage {
  return {
    id: nextChatMessageId++,
    author,
    text,
    createdAtMs,
  };
}

function appendLog(logs: string[], line: string): string[] {
  return [...logs, line].slice(-10);
}

function appendChat(
  messages: ChatMessage[],
  author: string,
  text: string,
  createdAtMs: number,
): ChatMessage[] {
  return [...messages, createChatMessage(author, text, createdAtMs)].slice(-18);
}

function getClassName(classId: CharacterClassId): string {
  return CHARACTER_DEFINITIONS.find(character => character.id === classId)?.name ?? classId;
}

function getCurrentCharacterProgress(state: AppState): CharacterProgress {
  return state.player.characters[state.player.selectedClassId];
}

function getCurrentSkillLevel(state: AppState, skillId: string): number {
  return (
    getCurrentCharacterProgress(state).skills.find(entry => entry.skillId === skillId)?.level ?? 0
  );
}

function getAnySkillExtraNumber(
  state: AppState,
  skillId: string,
  key: string,
): number {
  if (getCurrentSkillLevel(state, skillId) <= 0) {
    return 0;
  }

  return Number(getSkillDefinition(skillId).extra?.[key] ?? 0);
}

function getExpRequired(level: number): number {
  return 100 + (level - 1) * 40;
}

function applyExperience(
  progress: CharacterProgress,
  experienceToAdd: number,
): CharacterProgress {
  let nextLevel = progress.level;
  let nextExp = progress.exp + experienceToAdd;
  let nextSkillPoints = progress.skillPoints;

  while (nextExp >= getExpRequired(nextLevel)) {
    nextExp -= getExpRequired(nextLevel);
    nextLevel += 1;
    nextSkillPoints += 2;
  }

  return {
    ...progress,
    level: nextLevel,
    exp: nextExp,
    skillPoints: nextSkillPoints,
  };
}

export function getCurrentCharacterDefinition(state: AppState) {
  return CHARACTER_DEFINITIONS.find(
    character => character.id === state.player.selectedClassId,
  )!;
}

export function getEquippedSkin(state: AppState) {
  return state.player.equippedSkinId
    ? getSkinDefinition(state.player.equippedSkinId)
    : null;
}

export function getEquippedSummonProgress(state: AppState) {
  const skin = getEquippedSkin(state);
  if (!skin) {
    return null;
  }

  return state.player.summonProgress[skin.summonId] ?? null;
}

function getEquippedSummonRuntime(state: AppState): {
  equippedSkinId: string | null;
  summonLevel: number;
  summonRemainingMs: number;
} {
  const equippedSkinId = state.player.equippedSkinId;
  if (!equippedSkinId) {
    return {
      equippedSkinId: null,
      summonLevel: 1,
      summonRemainingMs: 0,
    };
  }

  const summonDefinition = getSummonDefinitionBySkinId(equippedSkinId);
  const summonProgress = summonDefinition
    ? state.player.summonProgress[summonDefinition.id]
    : null;

  return {
    equippedSkinId,
    summonLevel: summonProgress?.level ?? 1,
    summonRemainingMs:
      (summonProgress?.activeTimeLeftSec ?? 300) * 1000,
  };
}

export function getCurrentSkillTree(state: AppState) {
  const current = getCurrentCharacterProgress(state);
  const skills = getCatalogSkillsForClass(current.classId);

  return {
    personal: skills.filter(skill => skill.treeType === 'personal'),
    party: skills.filter(skill => skill.treeType === 'party'),
  };
}

function getShopDiscountRates(state: AppState): {
  shopDiscountRate: number;
  refreshDiscountRate: number;
} {
  if (getCurrentSkillLevel(state, 'rogue_cunning_eye') <= 0) {
    return {
      shopDiscountRate: 0,
      refreshDiscountRate: 0,
    };
  }

  const skillDefinition = getSkillDefinition('rogue_cunning_eye');
  return {
    shopDiscountRate: Number(skillDefinition.extra?.shopDiscountRate ?? 0),
    refreshDiscountRate: Number(skillDefinition.extra?.refreshDiscountRate ?? 0),
  };
}

export function getCurrentInventoryCap(state: AppState): number {
  const baseCap = 2;

  if (getCurrentSkillLevel(state, 'rogue_hidden_pocket') <= 0) {
    return baseCap;
  }

  const skillDefinition = getSkillDefinition('rogue_hidden_pocket');
  return baseCap + Number(skillDefinition.extra?.extraItemCapPerType ?? 0);
}

export function getCurrentShopOffers(state: AppState): ItemPriceDefinition[] {
  const discounts = getShopDiscountRates(state);

  return SHOP_ITEM_PRICES.map(item => {
    const discountRate =
      item.itemId === 'refresh'
        ? discounts.refreshDiscountRate
        : discounts.shopDiscountRate;

    return {
      itemId: item.itemId as ItemPriceDefinition['itemId'],
      goldPrice: Math.max(1, Math.ceil(item.goldPrice * (1 - discountRate))),
      diamondPrice: Math.max(1, Math.ceil(item.diamondPrice * (1 - discountRate))),
    };
  });
}

export function getSelectedWorld(state: AppState) {
  return WORLD_DEFINITIONS.find(world => world.id === state.selectedWorldId)!;
}

export function getStagesForSelectedWorld(state: AppState): StageDefinition[] {
  return STAGE_DEFINITIONS.filter(stage => stage.worldId === state.selectedWorldId);
}

export function getCurrentClearCount(state: AppState, stage: number): number {
  return state.player.normalRaidClearCounts[stage] ?? 0;
}

export function getBossRaidWindowInfo(nowMs: number) {
  const cycleMs = 4 * 60 * 60 * 1000;
  const joinWindowMs = 10 * 60 * 1000;
  const windowStartedAtMs = Math.floor(nowMs / cycleMs) * cycleMs;
  const joinEndsAtMs = windowStartedAtMs + joinWindowMs;

  return {
    isOpen: nowMs < joinEndsAtMs,
    windowStartedAtMs,
    joinEndsAtMs,
    nextWindowStartsAtMs: windowStartedAtMs + cycleMs,
  };
}

function scaleCurrencyReward(amount: number, rewardRate: number): number {
  if (amount <= 0 || rewardRate <= 0) {
    return amount;
  }

  return Math.round(amount * (1 + rewardRate));
}

export function createInitialState(nowMs: number = Date.now()): AppState {
  return {
    screen: 'home',
    selectedWorldId: 1,
    selectedStageId: 1,
    selectedRaidStage: 1,
    selectedRaidType: 'normal',
    player: {
      hearts: 10,
      lastHeartChargeAtMs: nowMs,
      gold: 500,
      diamonds: 30,
      selectedClassId: 'knight',
      characters: createCharacterMap(),
      inventory: createInventoryState(),
      unlockedStageId: 1,
      clearedStageIds: [],
      unlockedBossRaidStage: 0,
      normalRaidClearCounts: {},
      unlockedSkinIds: [],
      equippedSkinId: null,
      summonProgress: createSummonProgressMap(),
    },
    raidLobbyMessages: [
      createChatMessage('System', 'Lobby chat opens before party and raid matches.', nowMs),
      createChatMessage('Recruiter', 'Write "join" to simulate party recruitment.', nowMs),
    ],
    activeRun: null,
  };
}

export const initialState: AppState = createInitialState();

export function getCurrentCharacterStats(state: AppState, mode: GameMode) {
  const current = getCurrentCharacterProgress(state);
  const partyModifiers =
    mode === 'normal_raid' || mode === 'boss_raid'
      ? derivePartyModifiers(buildRaidParty(state))
      : undefined;

  const baseStats = calculateEffectiveCharacterStats(
    current.classId,
    current.level,
    current.skills,
    partyModifiers,
  );

  const equippedSkin = getEquippedSkin(state);
  if (!equippedSkin) {
    return baseStats;
  }

  return {
    ...baseStats,
    attack: Math.round(baseStats.attack * (1 + equippedSkin.attackBonusRate)),
  };
}

function buildRaidParty(state: AppState): PartySkillOwner[] {
  const current = getCurrentCharacterProgress(state);
  const alliedClasses = (['knight', 'mage', 'archer', 'rogue', 'healer'] as CharacterClassId[])
    .filter(classId => classId !== current.classId)
    .slice(0, 3);

  return [
    {
      classId: current.classId,
      skills: current.skills,
    },
    ...alliedClasses.map(classId => ({
      classId,
      skills: getCatalogSkillsForClass(classId)
        .filter(skill => skill.treeType === 'party')
        .slice(0, 2)
        .map((skill, index) => ({
          skillId: skill.id,
          level: index === 0 ? 3 : 2,
        })),
    })),
  ];
}

function getHighestPartySkillLevel(state: AppState, skillId: string): number {
  return buildRaidParty(state).reduce((highest, member) => {
    const level = member.skills.find(entry => entry.skillId === skillId)?.level ?? 0;
    return Math.max(highest, level);
  }, 0);
}

function getRunPreviewCount(state: AppState, mode: GameMode): number {
  let previewCount = getAnySkillExtraNumber(state, 'mage_foresight', 'previewCount');

  if (mode === 'normal_raid' || mode === 'boss_raid') {
    const partyPreviewLevel = getHighestPartySkillLevel(state, 'mage_light_of_wisdom');
    if (partyPreviewLevel > 0) {
      previewCount += Number(getSkillDefinition('mage_light_of_wisdom').extra?.previewCount ?? 0);
    }
  }

  return previewCount;
}

function getRunSmallPieceRateBonus(state: AppState, mode: GameMode): number {
  let bonusRate = getAnySkillExtraNumber(state, 'archer_rapid_fire', 'smallPieceRate');

  if (mode === 'normal_raid' || mode === 'boss_raid') {
    const highestPartySkillLevel = getHighestPartySkillLevel(state, 'archer_position_support');
    if (highestPartySkillLevel > 0) {
      bonusRate += resolveScaledSkillValue(
        getSkillDefinition('archer_position_support'),
        highestPartySkillLevel,
      );
    }
  }

  return bonusRate;
}

function createBossRaidStandings(stage: number): RaidStandingEntry[] {
  const names = [
    'Astra',
    'Bram',
    'Cinder',
    'Dahl',
    'Eon',
    'Flint',
    'Gale',
    'Hex',
    'Iris',
    'Jett',
    'Kite',
    'Luma',
    'Mako',
    'Nyx',
    'Orin',
    'Pyre',
    'Quartz',
    'Rune',
    'Sable',
    'Talon',
    'Uma',
    'Vex',
    'Wren',
    'Xeno',
    'Yara',
    'Zeph',
    'Aegis',
    'Blaze',
    'Cipher',
  ];

  return [
    {id: 'you', name: 'You', damage: 0},
    ...names.map((name, index) => ({
      id: `raid-${stage}-${index}`,
      name,
      damage: Math.max(0, Math.round((30 - index) * stage * 170 + (29 - index) * 45)),
    })),
  ].sort((left, right) => right.damage - left.damage);
}

function updateBossRaidStandings(
  standings: RaidStandingEntry[],
  addedDamage: number,
): RaidStandingEntry[] {
  if (addedDamage <= 0 || standings.length === 0) {
    return standings;
  }

  return standings
    .map(entry =>
      entry.id === 'you'
        ? {
            ...entry,
            damage: entry.damage + addedDamage,
          }
        : entry,
    )
    .sort((left, right) => right.damage - left.damage);
}

function createBaseRun(
  mode: GameMode,
  title: string,
  subtitle: string,
  playerMaxHp: number,
  enemyHp: number | null,
  enemyAttack: number,
  attackCountdownMax: number,
  partySummary: string[],
  equippedSkinId: string | null,
  summonLevel: number,
  summonRemainingMs: number,
  previewCount: number,
  pieceGeneration: PieceGenerationOptions,
  raidStandings: RaidStandingEntry[] = [],
): ActiveRun {
  const pieces = createPiecePack(pieceGeneration);
  const upcomingPieces = createPieceQueue(Math.max(0, previewCount), pieceGeneration);
  const summonDefinition = equippedSkinId
    ? getSummonDefinitionBySkinId(equippedSkinId)
    : null;

  return {
    id: nextRunId++,
    mode,
    title,
    subtitle,
    board: createEmptyBoard(),
    pieces,
    upcomingPieces,
    previewCount,
    pieceGeneration,
    selectedPieceId: pieces[0]?.id ?? null,
    selectedTool: 'place',
    combo: EMPTY_COMBO,
    fever: {
      lineGauge: 0,
      requirement: 20,
      active: false,
      startedAtMs: null,
      endsAtMs: null,
    },
    playerHp: playerMaxHp,
    playerMaxHp,
    enemyHp,
    enemyMaxHp: enemyHp,
    enemyAttack,
    attackCountdown: attackCountdownMax,
    attackCountdownMax,
    score: 0,
    earnedGold: 0,
    earnedDiamonds: 0,
    totalClearedLines: 0,
    lobbyChat: [],
    voiceEnabled: false,
    partySummary,
    logs: ['Run started.'],
    ended: false,
    victory: false,
    nextEndlessRewardScore: ENDLESS_REWARD_THRESHOLDS[0]?.scoreTarget ?? null,
    nextEndlessRewardGold: ENDLESS_REWARD_THRESHOLDS[0]?.goldReward ?? null,
    equippedSkinId,
    summonId: summonDefinition?.id ?? null,
    summonGauge: 0,
    summonGaugeRequired: summonDefinition?.gaugeRequired ?? 100,
    summonActive: false,
    summonRemainingMs: summonDefinition ? summonRemainingMs : 0,
    summonAttack: summonDefinition ? getSummonAttack(summonDefinition.id, summonLevel) : 0,
    summonExpEarned: 0,
    lastTickAtMs: Date.now(),
    raidStandings,
  };
}

function getStageById(stageId: number): StageDefinition {
  const stage = STAGE_DEFINITIONS.find(entry => entry.id === stageId);

  if (!stage) {
    throw new Error(`Unknown stage ${stageId}`);
  }

  return stage;
}

function getPrototypeBossHp(mode: 'normal' | 'boss', stage: number): number {
  return mode === 'normal' ? 2000 + stage * 900 : 4000 + stage * 1800;
}

function getPartySummary(state: AppState): string[] {
  return buildRaidParty(state).map(member => `${getClassName(member.classId)} support ready`);
}

function createAutoReply(text: string): string {
  const normalized = text.trim().toLowerCase();

  if (normalized.includes('heal')) {
    return 'Healer: wave is held for the next spike.';
  }

  if (normalized.includes('burst')) {
    return 'Mage: saving fever sync for burst.';
  }

  if (normalized.includes('join')) {
    return 'Scout: slot reserved, start when ready.';
  }

  return 'Party: ready.';
}

function normalizeRunTimers(run: ActiveRun, nowMs: number): ActiveRun {
  let nextRun = run;
  const elapsedMs =
    typeof run.lastTickAtMs === 'number' ? Math.max(0, nowMs - run.lastTickAtMs) : 0;

  if (run.combo.expiresAtMs !== null && nowMs > run.combo.expiresAtMs) {
    nextRun = {
      ...nextRun,
      combo: EMPTY_COMBO,
    };
  }

  if (run.fever.active && run.fever.endsAtMs !== null && nowMs >= run.fever.endsAtMs) {
    nextRun = {
      ...nextRun,
      fever: {
        ...nextRun.fever,
        active: false,
        lineGauge: 0,
        startedAtMs: null,
        endsAtMs: null,
      },
    };
  }

  if (nextRun.summonActive && elapsedMs > 0) {
    const nextRemainingMs = Math.max(0, nextRun.summonRemainingMs - elapsedMs);
    nextRun = {
      ...nextRun,
      summonRemainingMs: nextRemainingMs,
      summonActive: nextRemainingMs > 0,
    };
  }

  if (nextRun.summonActive && elapsedMs > 0) {
    nextRun = {
      ...nextRun,
      lastTickAtMs: nowMs,
    };
  }

  return nextRun;
}

function regenerateHearts(state: AppState, nowMs: number): AppState {
  const stats = getCurrentCharacterStats(state, 'level');
  const maxHearts = stats.maxHearts;
  const currentHearts = Math.min(state.player.hearts, maxHearts);

  if (currentHearts >= maxHearts) {
    return {
      ...state,
      player: {
        ...state.player,
        hearts: maxHearts,
        lastHeartChargeAtMs: nowMs,
      },
    };
  }

  const elapsed = nowMs - state.player.lastHeartChargeAtMs;
  if (elapsed < stats.heartRegenMs) {
    return state;
  }

  const gainedHearts = Math.floor(elapsed / stats.heartRegenMs);
  const nextHearts = Math.min(maxHearts, currentHearts + gainedHearts);
  const consumedMs = gainedHearts * stats.heartRegenMs;

  return {
    ...state,
    player: {
      ...state.player,
      hearts: nextHearts,
      lastHeartChargeAtMs: state.player.lastHeartChargeAtMs + consumedMs,
    },
  };
}

function createLevelRun(state: AppState, stageId: number): AppState {
  if (state.player.hearts <= 0 || stageId > state.player.unlockedStageId) {
    return state;
  }

  const stage = getStageById(stageId);
  const stats = getCurrentCharacterStats(state, 'level');
  const summonRuntime = getEquippedSummonRuntime(state);
  const previewCount = getRunPreviewCount(state, 'level');
  const pieceGeneration = {
    smallPieceRateBonus: getRunSmallPieceRateBonus(state, 'level'),
  };
  const run = createBaseRun(
    'level',
    stage.name,
    `${stage.monsterName} HP ${stage.monsterHp}`,
    stats.maxHp,
    stage.monsterHp,
    stage.monsterAttack,
    Math.max(1, Math.round(stage.attackIntervalSec / 3)),
    [],
    summonRuntime.equippedSkinId,
    summonRuntime.summonLevel,
    summonRuntime.summonRemainingMs,
    previewCount,
    pieceGeneration,
  );

  run.stageId = stage.id;
  run.fever.requirement = stats.feverRequirement;
  run.logs = appendLog(
    run.logs,
    `Defeat ${stage.monsterName}. Hearts ${state.player.hearts - 1}/${stats.maxHearts}.`,
  );

  return {
    ...state,
    screen: 'run',
    player: {
      ...state.player,
      hearts: state.player.hearts - 1,
    },
    activeRun: run,
  };
}

function createEndlessRun(state: AppState): AppState {
  const stats = getCurrentCharacterStats(state, 'endless');
  const summonRuntime = getEquippedSummonRuntime(state);
  const previewCount = getRunPreviewCount(state, 'endless');
  const pieceGeneration = {
    smallPieceRateBonus: getRunSmallPieceRateBonus(state, 'endless'),
  };
  const run = createBaseRun(
    'endless',
    'Endless',
    'Score converts from attack output.',
    stats.maxHp,
    null,
    0,
    0,
    [],
    summonRuntime.equippedSkinId,
    summonRuntime.summonLevel,
    summonRuntime.summonRemainingMs,
    previewCount,
    pieceGeneration,
  );

  run.fever.requirement = stats.feverRequirement;
  run.logs = appendLog(run.logs, 'Reach every score threshold to gain gold in-run.');

  return {
    ...state,
    screen: 'run',
    activeRun: run,
  };
}

function createNormalRaidRun(state: AppState, stage: number): AppState {
  const boss = NORMAL_RAID_BOSSES.find(entry => entry.stage === stage);
  if (!boss) {
    return state;
  }

  const stats = getCurrentCharacterStats(state, 'normal_raid');
  const summonRuntime = getEquippedSummonRuntime(state);
  const previewCount = getRunPreviewCount(state, 'normal_raid');
  const pieceGeneration = {
    smallPieceRateBonus: getRunSmallPieceRateBonus(state, 'normal_raid'),
  };
  const run = createBaseRun(
    'normal_raid',
    `Normal Raid ${stage}`,
    `${boss.name} practice lobby`,
    stats.maxHp,
    getPrototypeBossHp('normal', stage),
    18 + stage * 6,
    2,
    getPartySummary(state),
    summonRuntime.equippedSkinId,
    summonRuntime.summonLevel,
    summonRuntime.summonRemainingMs,
    previewCount,
    pieceGeneration,
  );

  run.raidStage = stage;
  run.fever.requirement = stats.feverRequirement;
  run.lobbyChat = [
    createChatMessage('System', 'Lobby opened. Recruit party members here.', Date.now()),
    createChatMessage('Scout', 'Need one more support and one damage dealer.', Date.now()),
  ];
  run.logs = appendLog(
    run.logs,
    'Raid damage uses placed cells x (attack + cleared lines).',
  );

  return {
    ...state,
    screen: 'run',
    selectedRaidStage: stage,
    selectedRaidType: 'normal',
    activeRun: run,
  };
}

function createBossRaidRun(state: AppState, stage: number): AppState {
  if (stage > state.player.unlockedBossRaidStage) {
    return state;
  }

  if (!getBossRaidWindowInfo(Date.now()).isOpen) {
    return state;
  }

  const definition = BOSS_RAID_DEFINITIONS.find(entry => entry.stage === stage);
  if (!definition) {
    return state;
  }

  const stats = getCurrentCharacterStats(state, 'boss_raid');
  const summonRuntime = getEquippedSummonRuntime(state);
  const previewCount = getRunPreviewCount(state, 'boss_raid');
  const pieceGeneration = {
    smallPieceRateBonus: getRunSmallPieceRateBonus(state, 'boss_raid'),
  };
  const run = createBaseRun(
    'boss_raid',
    `Boss Raid ${stage}`,
    `${definition.name} prototype instance`,
    stats.maxHp,
    getPrototypeBossHp('boss', stage),
    25 + stage * 8,
    2,
    getPartySummary(state),
    summonRuntime.equippedSkinId,
    summonRuntime.summonLevel,
    summonRuntime.summonRemainingMs,
    previewCount,
    pieceGeneration,
    createBossRaidStandings(stage),
  );

  run.raidStage = stage;
  run.fever.requirement = stats.feverRequirement;
  run.lobbyChat = [
    createChatMessage('System', 'Voice opens in-match only. Top 10 damage is pinned.', Date.now()),
    createChatMessage('Knight', 'Taunt route ready if phase two starts.', Date.now()),
  ];
  run.logs = appendLog(run.logs, `Server spec HP ${definition.maxHp.toLocaleString()}.`);

  return {
    ...state,
    screen: 'run',
    selectedRaidStage: stage,
    selectedRaidType: 'boss',
    activeRun: run,
  };
}

function upgradeSkill(state: AppState, skillId: string): AppState {
  const current = getCurrentCharacterProgress(state);
  if (current.skillPoints <= 0 || !canUnlockOrUpgradeSkill(skillId, current.skills)) {
    return state;
  }

  const nextSkills = current.skills.some(entry => entry.skillId === skillId)
    ? current.skills.map(entry =>
        entry.skillId === skillId
          ? {
              ...entry,
              level: entry.level + 1,
            }
          : entry,
      )
    : [...current.skills, {skillId, level: 1}];

  return {
    ...state,
    player: {
      ...state.player,
      characters: {
        ...state.player.characters,
        [current.classId]: {
          ...current,
          skillPoints: current.skillPoints - 1,
          skills: nextSkills,
        },
      },
    },
  };
}

function buyShopItem(
  state: AppState,
  itemId: DefaultItemId,
  currency: ShopCurrency,
): AppState {
  const inventoryCap = getCurrentInventoryCap(state);
  if (state.player.inventory[itemId] >= inventoryCap) {
    return state;
  }

  const offer = getCurrentShopOffers(state).find(entry => entry.itemId === itemId);
  if (!offer) {
    return state;
  }

  const price = currency === 'gold' ? offer.goldPrice : offer.diamondPrice;

  if (currency === 'gold' && state.player.gold < price) {
    return state;
  }

  if (currency === 'diamond' && state.player.diamonds < price) {
    return state;
  }

  return {
    ...state,
    player: {
      ...state.player,
      gold: currency === 'gold' ? state.player.gold - price : state.player.gold,
      diamonds:
        currency === 'diamond' ? state.player.diamonds - price : state.player.diamonds,
      inventory: {
        ...state.player.inventory,
        [itemId]: state.player.inventory[itemId] + 1,
      },
    },
  };
}

function sendLobbyMessage(state: AppState, text: string): AppState {
  const trimmed = text.trim();
  if (!trimmed) {
    return state;
  }

  const nowMs = Date.now();
  let messages = appendChat(state.raidLobbyMessages, 'You', trimmed, nowMs);
  messages = appendChat(messages, 'Party Finder', createAutoReply(trimmed), nowMs + 1);

  return {
    ...state,
    raidLobbyMessages: messages,
  };
}

function sendRunMessage(state: AppState, text: string): AppState {
  const trimmed = text.trim();
  const run = state.activeRun;
  if (!run || !trimmed) {
    return state;
  }

  const nowMs = Date.now();
  let messages = appendChat(run.lobbyChat, 'You', trimmed, nowMs);
  messages = appendChat(messages, 'Party', createAutoReply(trimmed), nowMs + 1);

  return {
    ...state,
    activeRun: {
      ...run,
      lobbyChat: messages,
    },
  };
}

function claimRun(state: AppState): AppState {
  const run = state.activeRun;
  if (!run || !run.ended) {
    return state;
  }

  const rewardRate = getCurrentCharacterStats(state, run.mode).modifiers.currencyRewardRateBonus;

  let nextPlayer = state.player;
  const current = getCurrentCharacterProgress(state);
  let nextCharacter = current;

  if (run.mode === 'level' && run.stageId) {
    if (run.victory) {
      const stage = getStageById(run.stageId);
      const goldReward = scaleCurrencyReward(stage.rewardGold + run.earnedGold, rewardRate);
      const diamondReward = scaleCurrencyReward(run.earnedDiamonds, rewardRate);
      nextPlayer = {
        ...nextPlayer,
        gold: nextPlayer.gold + goldReward,
        diamonds: nextPlayer.diamonds + diamondReward,
        unlockedStageId: Math.max(nextPlayer.unlockedStageId, stage.id + 1),
        unlockedBossRaidStage: Math.max(
          nextPlayer.unlockedBossRaidStage,
          stage.unlocksBossRaidStage ?? 0,
        ),
        clearedStageIds: nextPlayer.clearedStageIds.includes(stage.id)
          ? nextPlayer.clearedStageIds
          : [...nextPlayer.clearedStageIds, stage.id],
      };
      nextCharacter = applyExperience(nextCharacter, stage.rewardCharacterExp);
    } else {
      nextPlayer = {
        ...nextPlayer,
        diamonds:
          nextPlayer.diamonds + scaleCurrencyReward(run.earnedDiamonds, rewardRate),
      };
    }
  } else if (run.mode === 'endless') {
    nextPlayer = {
      ...nextPlayer,
      gold: nextPlayer.gold + scaleCurrencyReward(run.earnedGold, rewardRate),
      diamonds:
        nextPlayer.diamonds + scaleCurrencyReward(run.earnedDiamonds, rewardRate),
    };
  } else if (run.mode === 'normal_raid' && run.raidStage) {
    const definition = NORMAL_RAID_BOSSES.find(entry => entry.stage === run.raidStage);
    const currentClearCount = nextPlayer.normalRaidClearCounts[run.raidStage] ?? 0;
    const nextClearCount = run.victory ? currentClearCount + 1 : currentClearCount;
    const stageReward =
      definition && run.victory
        ? currentClearCount === 0
          ? definition.firstClearDiamondReward
          : definition.repeatDiamondReward
        : 0;
    const unlockedSkinIds =
      definition && nextClearCount >= 10 && !nextPlayer.unlockedSkinIds.includes(definition.skinId)
        ? [...nextPlayer.unlockedSkinIds, definition.skinId]
        : nextPlayer.unlockedSkinIds;
    const goldReward = scaleCurrencyReward(
      run.earnedGold + (run.victory ? 800 * run.raidStage : 0),
      rewardRate,
    );
    const diamondReward = scaleCurrencyReward(
      run.earnedDiamonds + stageReward,
      rewardRate,
    );

    nextPlayer = {
      ...nextPlayer,
      gold: nextPlayer.gold + goldReward,
      diamonds: nextPlayer.diamonds + diamondReward,
      normalRaidClearCounts: {
        ...nextPlayer.normalRaidClearCounts,
        [run.raidStage]: nextClearCount,
      },
      unlockedSkinIds,
    };
  } else if (run.mode === 'boss_raid' && run.raidStage) {
    nextPlayer = {
      ...nextPlayer,
      gold:
        nextPlayer.gold +
        scaleCurrencyReward(
          run.earnedGold + (run.victory ? 1400 * run.raidStage : 0),
          rewardRate,
        ),
      diamonds:
        nextPlayer.diamonds +
        scaleCurrencyReward(
          run.earnedDiamonds + (run.victory ? 20 * run.raidStage : 0),
          rewardRate,
        ),
    };
    nextCharacter = applyExperience(nextCharacter, run.victory ? 120 + run.raidStage * 25 : 0);
  }

  nextPlayer = {
    ...nextPlayer,
    characters: {
      ...nextPlayer.characters,
      [nextCharacter.classId]: nextCharacter,
    },
  };

  if (run.summonId) {
    const currentSummon =
      nextPlayer.summonProgress[run.summonId] ?? {
        level: 1,
        exp: 0,
        evolutionTier: 1,
        activeTimeLeftSec: 300,
      };
    let nextSummonLevel = currentSummon.level;
    let nextSummonExp = currentSummon.exp + run.summonExpEarned;

    while (nextSummonExp >= getSummonExpRequired(nextSummonLevel)) {
      nextSummonExp -= getSummonExpRequired(nextSummonLevel);
      nextSummonLevel += 1;
    }

    nextPlayer = {
      ...nextPlayer,
      summonProgress: {
        ...nextPlayer.summonProgress,
        [run.summonId]: {
          ...currentSummon,
          level: nextSummonLevel,
          exp: nextSummonExp,
          activeTimeLeftSec: 300,
        },
      },
    };
  }

  return {
    ...state,
    screen: run.mode === 'endless' ? 'endless' : run.mode === 'level' ? 'levels' : 'raids',
    player: nextPlayer,
    activeRun: null,
  };
}

function equipSkin(state: AppState, skinId: string | null): AppState {
  if (skinId === null) {
    return {
      ...state,
      player: {
        ...state.player,
        equippedSkinId: null,
      },
    };
  }

  if (!state.player.unlockedSkinIds.includes(skinId)) {
    return state;
  }

  return {
    ...state,
    player: {
      ...state.player,
      equippedSkinId: skinId,
    },
  };
}

function toggleSummon(state: AppState): AppState {
  const run = state.activeRun;
  if (!run || !run.summonId) {
    return state;
  }

  if (run.summonActive) {
    return {
      ...state,
      activeRun: {
        ...run,
        summonActive: false,
        logs: appendLog(run.logs, 'Summon returned to standby.'),
      },
    };
  }

  if (run.summonRemainingMs <= 0) {
    return {
      ...state,
      activeRun: {
        ...run,
        logs: appendLog(run.logs, 'Summon duration is exhausted for this run.'),
      },
    };
  }

  if (run.summonGauge < run.summonGaugeRequired) {
    return {
      ...state,
      activeRun: {
        ...run,
        logs: appendLog(run.logs, 'Summon gauge is not full yet.'),
      },
    };
  }

  return {
    ...state,
    activeRun: {
      ...run,
      summonActive: true,
      summonGauge: 0,
      lastTickAtMs: Date.now(),
      logs: appendLog(run.logs, 'Summon deployed for combat support.'),
    },
  };
}

function rollDiamondRewardCount(bonusDiamondChance: number): number {
  return 1 + (bonusDiamondChance > 0 && Math.random() < bonusDiamondChance ? 1 : 0);
}

function handleRewardDrops(
  player: PlayerState,
  run: ActiveRun,
  rewards: Array<{kind: 'item' | 'gem'; itemId?: DefaultItemId}>,
  inventoryCap: number,
  bonusDiamondChance: number,
): {player: PlayerState; run: ActiveRun} {
  let nextPlayer = player;
  let nextRun = run;

  for (const reward of rewards) {
    if (reward.kind === 'gem') {
      const diamondCount = rollDiamondRewardCount(bonusDiamondChance);
      nextRun = {
        ...nextRun,
        earnedDiamonds: nextRun.earnedDiamonds + diamondCount,
        logs: appendLog(nextRun.logs, `Gem block cleared: +${diamondCount} diamond.`),
      };
      continue;
    }

    if (!reward.itemId) {
      continue;
    }

    const result = addItemWithCap(
      nextPlayer.inventory[reward.itemId],
      1,
      inventoryCap,
    );
    nextPlayer = {
      ...nextPlayer,
      inventory: {
        ...nextPlayer.inventory,
        [reward.itemId]: result.nextCount,
      },
    };
    nextRun = {
      ...nextRun,
      logs: appendLog(nextRun.logs, `${reward.itemId} block cleared and stored.`),
    };
  }

  return {
    player: nextPlayer,
    run: nextRun,
  };
}

function collectCellReward(
  player: PlayerState,
  run: ActiveRun,
  cell: BoardCell | null,
  inventoryCap: number,
  bonusDiamondChance: number,
): {player: PlayerState; run: ActiveRun} {
  if (!cell?.specialKind) {
    return {player, run};
  }

  if (cell.specialKind === 'gem') {
    const diamondCount = rollDiamondRewardCount(bonusDiamondChance);
    return {
      player,
      run: {
        ...run,
        earnedDiamonds: run.earnedDiamonds + diamondCount,
        logs: appendLog(run.logs, `Gem recovered from item use: +${diamondCount} diamond.`),
      },
    };
  }

  if (!cell.specialItemId) {
    return {player, run};
  }

  const result = addItemWithCap(player.inventory[cell.specialItemId], 1, inventoryCap);
  return {
    player: {
      ...player,
      inventory: {
        ...player.inventory,
        [cell.specialItemId]: result.nextCount,
      },
    },
    run: {
      ...run,
      logs: appendLog(run.logs, `${cell.specialItemId} recovered from item use.`),
    },
  };
}

function applyHammer(state: AppState, row: number, col: number): AppState {
  const run = state.activeRun;
  if (!run || run.ended || state.player.inventory.hammer <= 0) {
    return state;
  }

  const stats = getCurrentCharacterStats(state, run.mode);
  const inventoryCap = getCurrentInventoryCap(state);

  const target = run.board[row][col];
  if (!target) {
    return {
      ...state,
      activeRun: {
        ...run,
        logs: appendLog(run.logs, 'Hammer missed an empty tile.'),
      },
    };
  }

  let nextPlayer = {
    ...state.player,
    inventory: {
      ...state.player.inventory,
      hammer: state.player.inventory.hammer - 1,
    },
  };
  let nextRun: ActiveRun = {
    ...run,
    board: cloneBoard(run.board),
    selectedTool: 'place',
  };

  const rewardResult = collectCellReward(
    nextPlayer,
    nextRun,
    target,
    inventoryCap,
    stats.modifiers.bonusDiamondChance,
  );
  nextPlayer = rewardResult.player;
  nextRun = rewardResult.run;
  nextRun.board[row][col] = null;
  nextRun.logs = appendLog(nextRun.logs, 'Hammer removed one tile.');

  return {
    ...state,
    player: nextPlayer,
    activeRun: nextRun,
  };
}

function applyBomb(state: AppState, row: number, col: number): AppState {
  const run = state.activeRun;
  if (!run || run.ended || state.player.inventory.bomb <= 0) {
    return state;
  }

  const stats = getCurrentCharacterStats(state, run.mode);
  const inventoryCap = getCurrentInventoryCap(state);

  let nextPlayer = {
    ...state.player,
    inventory: {
      ...state.player.inventory,
      bomb: state.player.inventory.bomb - 1,
    },
  };
  let nextRun: ActiveRun = {
    ...run,
    board: cloneBoard(run.board),
    selectedTool: 'place',
  };

  for (let r = Math.max(0, row - 1); r <= Math.min(BOARD_ROWS - 1, row + 1); r += 1) {
    for (let c = Math.max(0, col - 1); c <= Math.min(BOARD_COLS - 1, col + 1); c += 1) {
      const rewardResult = collectCellReward(
        nextPlayer,
        nextRun,
        nextRun.board[r][c],
        inventoryCap,
        stats.modifiers.bonusDiamondChance,
      );
      nextPlayer = rewardResult.player;
      nextRun = rewardResult.run;
      nextRun.board[r][c] = null;
    }
  }

  nextRun.logs = appendLog(nextRun.logs, 'Bomb cleared a 3x3 area.');

  return {
    ...state,
    player: nextPlayer,
    activeRun: nextRun,
  };
}

function applyRefreshItem(state: AppState): AppState {
  const run = state.activeRun;
  if (!run || run.ended || state.player.inventory.refresh <= 0) {
    return state;
  }

  const pieces = createPiecePack(run.pieceGeneration);
  return {
    ...state,
    player: {
      ...state.player,
      inventory: {
        ...state.player.inventory,
        refresh: state.player.inventory.refresh - 1,
      },
    },
    activeRun: {
      ...run,
      pieces,
      selectedPieceId: pieces[0]?.id ?? null,
      logs: appendLog(run.logs, 'Refresh rerolled the current piece pack.'),
    },
  };
}

function resolveEndlessRewards(run: ActiveRun): ActiveRun {
  let nextRun = run;

  while (
    nextRun.nextEndlessRewardScore !== null &&
    nextRun.nextEndlessRewardGold !== null &&
    nextRun.score >= nextRun.nextEndlessRewardScore
  ) {
    const nextThreshold = ENDLESS_REWARD_THRESHOLDS.find(
      entry => entry.scoreTarget > nextRun.nextEndlessRewardScore!,
    );
    nextRun = {
      ...nextRun,
      earnedGold: nextRun.earnedGold + nextRun.nextEndlessRewardGold,
      nextEndlessRewardScore: nextThreshold?.scoreTarget ?? null,
      nextEndlessRewardGold: nextThreshold?.goldReward ?? null,
      logs: appendLog(
        nextRun.logs,
        `Endless threshold reached: +${nextRun.nextEndlessRewardGold} gold.`,
      ),
    };
  }

  return nextRun;
}

function getSelectedPiece(run: ActiveRun): PieceDefinition | null {
  if (run.pieces.length === 0) {
    return null;
  }

  return run.pieces.find(piece => piece.id === run.selectedPieceId) ?? run.pieces[0];
}

function getObstacleSpawnChance(tier: number, reductionRate: number): number {
  return Math.max(0.04, 0.08 + tier * 0.05 - reductionRate);
}

function executePlacement(state: AppState, row: number, col: number): AppState {
  const run = state.activeRun;
  if (!run || run.ended) {
    return state;
  }

  const piece = getSelectedPiece(run);
  if (!piece) {
    return state;
  }

  const stats = getCurrentCharacterStats(state, run.mode);
  const placement = applyPiecePlacement(
    run.board,
    piece,
    getCenteredOrigin(piece.shape, row, col),
    stats.modifiers.rareItemRateBonus,
    stats.modifiers.diamondCellRateBonus,
  );

  if (!placement) {
    return {
      ...state,
      activeRun: {
        ...run,
        logs: appendLog(run.logs, 'Invalid placement.'),
      },
    };
  }

  const nowMs = Date.now();
  let nextPlayer = state.player;
  let nextRun: ActiveRun = {
    ...run,
    board: placement.board,
    pieces: run.pieces.filter(entry => entry.id !== piece.id),
    totalClearedLines: run.totalClearedLines + placement.clearedLines,
  };

  if (nextRun.pieces.length === 0) {
    nextRun.pieces = createPiecePack(nextRun.pieceGeneration);
    nextRun.upcomingPieces = createPieceQueue(
      Math.max(0, nextRun.previewCount),
      nextRun.pieceGeneration,
    );
  }

  nextRun.selectedPieceId = nextRun.pieces[0]?.id ?? null;
  nextRun.combo = updateComboState(
    run.combo,
    nowMs,
    placement.clearedLines > 0,
    stats.comboWindowMs,
  );
  nextRun.fever = updateFeverState(
    run.fever,
    nowMs,
    placement.clearedLines,
    stats.feverRequirement,
    stats.feverDurationMs,
  );

  const extraDamageMultiplier =
    1 +
    stats.modifiers.lineClearDamageRateBonus +
    (run.mode === 'normal_raid' || run.mode === 'boss_raid'
      ? stats.modifiers.raidDamageRatePartyBonus
      : 0);

  const damage = calculateActionDamage({
    mode: run.mode,
    placedCells: placement.placedCells,
    effectiveAttack: stats.attack,
    clearedLinesThisAction: placement.clearedLines,
    comboCount: nextRun.combo.comboCount,
    feverActive: nextRun.fever.active,
    feverMultiplier: 2 + stats.modifiers.feverDamageRateBonus,
    extraDamageMultiplier,
  });
  const summonBonusDamage = nextRun.summonActive ? nextRun.summonAttack : 0;
  const totalDamage = damage.finalDamage + summonBonusDamage;
  const previousSummonGauge = nextRun.summonGauge;

  if (nextRun.summonId) {
    const summonGaugeGain = placement.placedCells + placement.clearedLines * 6;
    nextRun.summonGauge = Math.min(
      nextRun.summonGaugeRequired,
      nextRun.summonGauge + summonGaugeGain,
    );
    nextRun.summonExpEarned += placement.placedCells + placement.clearedLines * 2;
  }

  if (run.mode === 'endless') {
    nextRun.score += totalDamage;
  } else if (nextRun.enemyHp !== null) {
    nextRun.enemyHp = Math.max(0, nextRun.enemyHp - totalDamage);
  }

  if (run.mode === 'boss_raid') {
    nextRun.raidStandings = updateBossRaidStandings(nextRun.raidStandings, totalDamage);
  }

  const rewardResult = handleRewardDrops(
    nextPlayer,
    nextRun,
    placement.rewards,
    getCurrentInventoryCap(state),
    stats.modifiers.bonusDiamondChance,
  );
  nextPlayer = rewardResult.player;
  nextRun = rewardResult.run;
  nextRun.logs = appendLog(
    nextRun.logs,
    `Placed ${placement.placedCells} cells for ${totalDamage} value.`,
  );

  if (summonBonusDamage > 0) {
    nextRun.logs = appendLog(
      nextRun.logs,
      `Summon support dealt ${summonBonusDamage} bonus damage.`,
    );
  }

  if (
    nextRun.summonId &&
    !nextRun.summonActive &&
    previousSummonGauge < nextRun.summonGaugeRequired &&
    nextRun.summonGauge >= nextRun.summonGaugeRequired
  ) {
    nextRun.logs = appendLog(nextRun.logs, 'Summon gauge is full. Deploy when ready.');
  }

  if (placement.clearedLines > 0) {
    nextRun.logs = appendLog(
      nextRun.logs,
      `Cleared ${placement.clearedLines} line(s). Combo ${nextRun.combo.comboCount}.`,
    );
  }

  if (nextRun.fever.active && nextRun.fever.startedAtMs === nowMs) {
    nextRun.logs = appendLog(nextRun.logs, 'Fever activated: x2 damage.');
  }

  if (run.mode === 'endless') {
    nextRun = resolveEndlessRewards(nextRun);
    const obstacleTier = getCurrentEndlessObstacleTier(nextRun.score);
    if (
      obstacleTier > 0 &&
      Math.random() <
        getObstacleSpawnChance(
          obstacleTier,
          stats.modifiers.endlessObstacleSpawnReductionRate,
        )
    ) {
      nextRun.board = addRandomObstacle(nextRun.board, obstacleTier);
      nextRun.logs = appendLog(
        nextRun.logs,
        `Obstacle spawned with durability ${obstacleTier}.`,
      );
    }
  }

  if (run.mode !== 'endless' && nextRun.enemyHp !== null && nextRun.enemyHp > 0) {
    nextRun.attackCountdown = run.attackCountdown - 1;

    if (nextRun.attackCountdown <= 0) {
      const incomingDamage = Math.max(
        1,
        Math.round(run.enemyAttack * (1 - stats.modifiers.incomingDamageReductionRate)),
      );
      nextRun.playerHp = Math.max(0, nextRun.playerHp - incomingDamage);
      nextRun.attackCountdown = run.attackCountdownMax;
      nextRun.logs = appendLog(nextRun.logs, `Enemy attack hit for ${incomingDamage}.`);
    }
  }

  if (nextRun.enemyHp !== null && nextRun.enemyHp <= 0) {
    nextRun.ended = true;
    nextRun.victory = true;
    nextRun.logs = appendLog(nextRun.logs, 'Target defeated.');
  } else if (nextRun.playerHp <= 0) {
    nextRun.ended = true;
    nextRun.victory = false;
    nextRun.logs = appendLog(nextRun.logs, 'Run failed: HP reached zero.');
  } else if (!canPlaceAnyPiece(nextRun.board, nextRun.pieces)) {
    nextRun.ended = true;
    nextRun.victory = false;
    nextRun.logs = appendLog(nextRun.logs, 'No more valid placements.');
  }

  return {
    ...state,
    player: nextPlayer,
    activeRun: nextRun,
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'hydrate_state':
      return action.snapshot;
    case 'tick': {
      const nextState = regenerateHearts(state, action.nowMs);

      if (!nextState.activeRun) {
        return nextState;
      }

      const normalizedRun = normalizeRunTimers(nextState.activeRun, action.nowMs);
      if (nextState === state && normalizedRun === nextState.activeRun) {
        return state;
      }

      if (normalizedRun === nextState.activeRun) {
        return nextState;
      }

      return {
        ...nextState,
        activeRun: normalizedRun,
      };
    }
    case 'select_screen':
      return {
        ...state,
        screen: action.screen,
      };
    case 'select_world':
      return {
        ...state,
        selectedWorldId: action.worldId,
        selectedStageId: (action.worldId - 1) * 30 + 1,
      };
    case 'select_stage':
      return {
        ...state,
        selectedStageId: action.stageId,
      };
    case 'select_raid_type':
      return {
        ...state,
        selectedRaidType: action.raidType,
      };
    case 'select_raid_stage':
      return {
        ...state,
        selectedRaidStage: action.stage,
      };
    case 'select_class': {
      const nextState = {
        ...state,
        player: {
          ...state.player,
          selectedClassId: action.classId,
        },
      };

      return regenerateHearts(nextState, Date.now());
    }
    case 'upgrade_skill':
      return upgradeSkill(state, action.skillId);
    case 'equip_skin':
      return equipSkin(state, action.skinId);
    case 'start_level_run':
      return createLevelRun(state, action.stageId);
    case 'start_endless_run':
      return createEndlessRun(state);
    case 'start_normal_raid':
      return createNormalRaidRun(state, action.stage);
    case 'start_boss_raid':
      return createBossRaidRun(state, action.stage);
    case 'select_piece':
      return state.activeRun
        ? {
            ...state,
            activeRun: {
              ...state.activeRun,
              selectedPieceId: action.pieceId,
              selectedTool: 'place',
            },
          }
        : state;
    case 'select_tool':
      return state.activeRun
        ? {
            ...state,
            activeRun: {
              ...state.activeRun,
              selectedTool: action.tool,
            },
          }
        : state;
    case 'tap_board':
      if (!state.activeRun) {
        return state;
      }

      if (state.activeRun.selectedTool === 'hammer') {
        return applyHammer(state, action.row, action.col);
      }

      if (state.activeRun.selectedTool === 'bomb') {
        return applyBomb(state, action.row, action.col);
      }

      return executePlacement(state, action.row, action.col);
    case 'use_refresh':
      return applyRefreshItem(state);
    case 'toggle_voice':
      return state.activeRun
        ? {
            ...state,
            activeRun: {
              ...state.activeRun,
              voiceEnabled: !state.activeRun.voiceEnabled,
            },
          }
        : state;
    case 'toggle_summon':
      return toggleSummon(state);
    case 'send_lobby_message':
      return sendLobbyMessage(state, action.text);
    case 'send_run_message':
      return sendRunMessage(state, action.text);
    case 'buy_shop_item':
      return buyShopItem(state, action.itemId, action.currency);
    case 'claim_run':
      return claimRun(state);
    default:
      return state;
  }
}
