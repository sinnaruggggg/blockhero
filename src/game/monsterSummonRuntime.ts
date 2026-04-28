export type MonsterSummonRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type MonsterSummonSkillKey =
  | 'heavy_strike'
  | 'multi_strike'
  | 'piercing_hit'
  | 'critical_focus'
  | 'execution'
  | 'blast_attack'
  | 'toxic_wound'
  | 'burning'
  | 'chain_lightning'
  | 'frost_shock'
  | 'guardian_shield'
  | 'taunt'
  | 'damage_reduction'
  | 'unyielding'
  | 'counter'
  | 'regeneration'
  | 'emergency_heal'
  | 'attack_buff'
  | 'speed_buff'
  | 'lucky_aura';

export interface MonsterSummonDefinition {
  id: string;
  worldId: number;
  order: number;
  name: string;
  spriteKey: string;
  rarity: MonsterSummonRarity;
  weight: number;
  fragmentCost: number;
  isBoss: boolean;
}

export interface MonsterSummonState {
  id: string;
  level: number;
  exp: number;
  evolutionStage: number;
  skills: MonsterSummonSkillKey[];
}

export interface MonsterSummonData {
  owned: Record<string, MonsterSummonState>;
  selectedSummonId: string | null;
  fragments: number;
  pendingRewards: Record<number, number>;
  pendingSkillChoices: Record<string, MonsterSummonSkillKey[]>;
}

export interface MonsterSummonBattleStats {
  attack: number;
  hp: number;
  durationMs: number;
  gaugeRequired: number;
  expRequired: number;
  gaugeGainMultiplier: number;
  expGainMultiplier: number;
  doubleAttackChance: number;
}

export interface MonsterSummonLoadout {
  definition: MonsterSummonDefinition;
  progress: MonsterSummonState;
  stats: MonsterSummonBattleStats;
}

export interface MonsterSummonDrawResult {
  data: MonsterSummonData;
  definition: MonsterSummonDefinition | null;
  duplicate: boolean;
  error?: 'no_reward' | 'missing_world';
}

export interface MonsterSummonFragmentResult {
  data: MonsterSummonData;
  amount: number;
  error?: 'no_reward';
}

export interface MonsterSummonPurchaseResult {
  data: MonsterSummonData;
  definition: MonsterSummonDefinition | null;
  duplicate: boolean;
  error?: 'missing_summon' | 'boss_only_draw' | 'not_enough_fragments';
}

export interface MonsterSummonConvertResult {
  data: MonsterSummonData;
  amount: number;
  error?: 'missing_summon';
}

export const MONSTER_SUMMON_GAUGE_REQUIRED = 100;
export const MONSTER_SUMMON_AUTO_ATTACK_INTERVAL_MS = 1800;

const DRAW_WEIGHTS = [32, 20, 15, 10, 8, 6, 4, 3, 2];

const WORLD_SUMMON_ROWS: Array<
  Array<{id: string; name: string; spriteKey: string}>
> = [
  [
    {id: 'w01_slime', name: '슬라임', spriteKey: 'slime'},
    {id: 'w01_grassland_rabbit', name: '초원 토끼', spriteKey: 'grasslandRabbit'},
    {id: 'w01_mushroom_soldier', name: '버섯 병사', spriteKey: 'mushroomSoldier'},
    {id: 'w01_stone_golem', name: '석상 골렘', spriteKey: 'stoneGolem'},
    {id: 'w01_vine_creature', name: '덩굴 생물', spriteKey: 'vineCreature'},
    {id: 'w01_forest_spirit', name: '숲의 정령', spriteKey: 'forestSpirit'},
    {id: 'w01_forest_guardian', name: '포레스트 가디언', spriteKey: 'forestGuardian'},
    {id: 'w01_green_basilisk', name: '그린 바실리스크', spriteKey: 'greenBasilisk'},
    {id: 'w01_king_slime', name: '킹슬라임', spriteKey: 'kingSlime'},
  ],
  [
    {id: 'w02_sand_crab', name: '모래 게', spriteKey: 'sandCrab'},
    {id: 'w02_desert_lizard', name: '사막 도마뱀', spriteKey: 'desertLizard'},
    {id: 'w02_cactus_soldier', name: '선인장 병사', spriteKey: 'cactusSoldier'},
    {id: 'w02_mummy', name: '미라', spriteKey: 'mummy'},
    {id: 'w02_sand_worm', name: '모래 지렁이', spriteKey: 'sandWorm'},
    {id: 'w02_desert_fox', name: '사막 여우', spriteKey: 'desertFox'},
    {id: 'w02_desert_golem', name: '사막 골렘', spriteKey: 'desertGolem'},
    {id: 'w02_sphinx', name: '스핑크스', spriteKey: 'sphinx'},
    {id: 'w02_scorpion_king', name: '전갈왕', spriteKey: 'scorpionKing'},
  ],
  [
    {id: 'w03_ice_wolf', name: '얼음 늑대', spriteKey: 'iceWolf'},
    {id: 'w03_snow_rabbit', name: '눈 토끼', spriteKey: 'snowRabbit'},
    {id: 'w03_frost_fairy', name: '서리 요정', spriteKey: 'frostFairy'},
    {id: 'w03_ice_giant', name: '얼음 거인', spriteKey: 'iceGiant'},
    {id: 'w03_snow_hawk', name: '설원 매', spriteKey: 'snowHawk'},
    {id: 'w03_frozen_golem', name: '동결 골렘', spriteKey: 'frozenGolem'},
    {id: 'w03_glacier_dragon', name: '빙하 드래곤', spriteKey: 'glacierDragon'},
    {id: 'w03_blizzard_spirit', name: '눈보라 정령', spriteKey: 'blizzardSpirit'},
    {id: 'w03_ice_queen', name: '설빙 여왕', spriteKey: 'iceQueen'},
  ],
  [
    {id: 'w04_jellyfish', name: '해파리', spriteKey: 'jellyfish'},
    {id: 'w04_shell_knight', name: '조개 기사', spriteKey: 'shellKnight'},
    {id: 'w04_coral_spirit', name: '산호 정령', spriteKey: 'coralSpirit'},
    {id: 'w04_electric_eel', name: '전기뱀장어', spriteKey: 'electricEel'},
    {id: 'w04_shark_warrior', name: '상어 전사', spriteKey: 'sharkWarrior'},
    {id: 'w04_deep_sea_dragon', name: '심해 용', spriteKey: 'deepSeaDragon'},
    {id: 'w04_giant_turtle', name: '거대 거북', spriteKey: 'giantTurtle'},
    {id: 'w04_abyss_leviathan', name: '심해 레비아탄', spriteKey: 'abyssLeviathan'},
    {id: 'w04_kraken', name: '크라켄', spriteKey: 'kraken'},
  ],
  [
    {id: 'w05_poison_mushroom', name: '독버섯', spriteKey: 'poisonMushroom'},
    {id: 'w05_poison_frog', name: '독 개구리', spriteKey: 'poisonFrog'},
    {id: 'w05_vine_spider', name: '덩굴 거미', spriteKey: 'vineSpider'},
    {id: 'w05_plague_bat', name: '역병 박쥐', spriteKey: 'plagueBat'},
    {id: 'w05_viper', name: '독사', spriteKey: 'viper'},
    {id: 'w05_poison_treant', name: '독 트레인트', spriteKey: 'poisonTreant'},
    {id: 'w05_poison_golem', name: '독 골렘', spriteKey: 'poisonGolem'},
    {id: 'w05_king_spider', name: '킹 독거미', spriteKey: 'kingSpider'},
    {id: 'w05_hydra', name: '히드라', spriteKey: 'hydra'},
  ],
  [
    {id: 'w06_stone_statue', name: '석상', spriteKey: 'stoneStatue'},
    {id: 'w06_cursed_scarab', name: '저주받은 풍뎅이', spriteKey: 'cursedScarab'},
    {id: 'w06_ruin_ghost', name: '유적 유령', spriteKey: 'ruinGhost'},
    {id: 'w06_golem_knight', name: '골렘 기사', spriteKey: 'golemKnight'},
    {id: 'w06_ancient_sphinx', name: '고대 스핑크스', spriteKey: 'ancientSphinx'},
    {id: 'w06_lava_spirit', name: '용암 정령', spriteKey: 'lavaSpirit'},
    {id: 'w06_ancient_watcher', name: '고대 감시자', spriteKey: 'ancientWatcher'},
    {id: 'w06_tablet_golem', name: '석판 골렘', spriteKey: 'tabletGolem'},
    {id: 'w06_medusa', name: '메두사', spriteKey: 'medusa'},
  ],
  [
    {id: 'w07_shadow_bat', name: '그림자 박쥐', spriteKey: 'shadowBat'},
    {id: 'w07_skeleton_soldier', name: '해골 병사', spriteKey: 'skeletonSoldier'},
    {id: 'w07_ghost_knight', name: '유령 기사', spriteKey: 'ghostKnight'},
    {id: 'w07_vampire_bat', name: '흡혈 박쥐', spriteKey: 'vampireBat'},
    {id: 'w07_dark_mage', name: '암흑 마법사', spriteKey: 'darkMage'},
    {id: 'w07_death_golem', name: '죽음 골렘', spriteKey: 'deathGolem'},
    {id: 'w07_banshee', name: '밴시', spriteKey: 'banshee'},
    {id: 'w07_dark_knight', name: '다크 나이트', spriteKey: 'darkKnight'},
    {id: 'w07_lich_king', name: '리치 킹', spriteKey: 'lichKing'},
  ],
  [
    {id: 'w08_wind_fairy', name: '바람 요정', spriteKey: 'windFairy'},
    {id: 'w08_cloud_rabbit', name: '구름 토끼', spriteKey: 'cloudRabbit'},
    {id: 'w08_thunderbird', name: '천둥새', spriteKey: 'thunderbird'},
    {id: 'w08_storm_eagle', name: '폭풍 독수리', spriteKey: 'stormEagle'},
    {id: 'w08_sky_guardian', name: '하늘 수호자', spriteKey: 'skyGuardian'},
    {id: 'w08_celestial_knight', name: '천상 기사', spriteKey: 'celestialKnight'},
    {id: 'w08_storm_phoenix', name: '스톰 피닉스', spriteKey: 'stormPhoenix'},
    {id: 'w08_sky_guardian_boss', name: '천공 가디언', spriteKey: 'skyGuardianBoss'},
    {id: 'w08_thunder_dragon', name: '천둥 용', spriteKey: 'thunderDragon'},
  ],
  [
    {id: 'w09_void_slime', name: '허공 슬라임', spriteKey: 'voidSlime'},
    {id: 'w09_dark_leech', name: '암흑 거머리', spriteKey: 'darkLeech'},
    {id: 'w09_abyss_watcher', name: '심연 감시자', spriteKey: 'abyssWatcher'},
    {id: 'w09_chaos_knight', name: '혼돈 기사', spriteKey: 'chaosKnight'},
    {id: 'w09_nightmare_beast', name: '악몽 짐승', spriteKey: 'nightmareBeast'},
    {id: 'w09_void_dragon', name: '허공 드래곤', spriteKey: 'voidDragon'},
    {id: 'w09_abyss_king', name: '심연 왕', spriteKey: 'abyssKing'},
    {id: 'w09_void_god', name: '공허의 신', spriteKey: 'voidGod'},
    {id: 'w09_abyss_lord', name: '심연의 군주', spriteKey: 'abyssLord'},
  ],
  [
    {id: 'w10_lava_slime', name: '용암 슬라임', spriteKey: 'lavaSlime'},
    {id: 'w10_fire_lizard', name: '불 도마뱀', spriteKey: 'fireLizard'},
    {id: 'w10_magma_crab', name: '마그마 게', spriteKey: 'magmaCrab'},
    {id: 'w10_fire_giant', name: '화염 거인', spriteKey: 'fireGiant'},
    {id: 'w10_molten_golem', name: '용융 골렘', spriteKey: 'moltenGolem'},
    {id: 'w10_flame_wyvern', name: '불꽃 와이번', spriteKey: 'flameWyvern'},
    {id: 'w10_volcano_lord', name: '화산 군주', spriteKey: 'volcanoLord'},
    {id: 'w10_inferno_drake', name: '인페르노 드레이크', spriteKey: 'infernoDrake'},
    {id: 'w10_red_dragon', name: '레드 드래곤', spriteKey: 'redDragon'},
  ],
];

export const MONSTER_SUMMON_SKILLS: Array<{
  key: MonsterSummonSkillKey;
  name: string;
  category: 'attack' | 'area' | 'tank' | 'heal' | 'buff' | 'luck';
  description: string;
}> = [
  {key: 'heavy_strike', name: '강타', category: 'attack', description: '소환수 공격력 +12%'},
  {key: 'multi_strike', name: '연속타격', category: 'attack', description: '자동 공격 시 10% 확률로 2배 피해'},
  {key: 'piercing_hit', name: '관통타', category: 'attack', description: '소환수 공격력 +8%, 경험치 획득 +5%'},
  {key: 'critical_focus', name: '치명 집중', category: 'attack', description: '자동 공격 시 6% 확률로 2배 피해'},
  {key: 'execution', name: '처형', category: 'attack', description: '소환수 공격력 +10%'},
  {key: 'blast_attack', name: '폭발 공격', category: 'area', description: '소환수 공격력 +7%'},
  {key: 'toxic_wound', name: '독성 상처', category: 'area', description: '소환수 공격력 +6%, 지속시간 +3초'},
  {key: 'burning', name: '화상', category: 'area', description: '소환수 공격력 +6%, 경험치 획득 +5%'},
  {key: 'chain_lightning', name: '번개 연쇄', category: 'area', description: '자동 공격 시 8% 확률로 2배 피해'},
  {key: 'frost_shock', name: '빙결 충격', category: 'area', description: '지속시간 +5초'},
  {key: 'guardian_shield', name: '수호 방패', category: 'tank', description: '소환수 HP +18%'},
  {key: 'taunt', name: '도발', category: 'tank', description: '소환수 HP +12%, 지속시간 +3초'},
  {key: 'damage_reduction', name: '피해 감소', category: 'tank', description: '소환수 HP +15%'},
  {key: 'unyielding', name: '불굴', category: 'tank', description: '소환수 HP +20%'},
  {key: 'counter', name: '반격', category: 'tank', description: '소환수 공격력 +6%, HP +8%'},
  {key: 'regeneration', name: '재생', category: 'heal', description: '지속시간 +4초, HP +10%'},
  {key: 'emergency_heal', name: '응급 회복', category: 'heal', description: '지속시간 +4초'},
  {key: 'attack_buff', name: '공격력 버프', category: 'buff', description: '소환수 공격력 +15%'},
  {key: 'speed_buff', name: '공속 버프', category: 'buff', description: '자동 공격 시 6% 확률로 2배 피해, 게이지 획득 +5%'},
  {key: 'lucky_aura', name: '행운의 기운', category: 'luck', description: '경험치 획득 +10%, 게이지 획득 +8%'},
];

const RARITY_STATS: Record<
  MonsterSummonRarity,
  {baseAttack: number; attackGrowth: number; baseHp: number; hpGrowth: number}
> = {
  common: {baseAttack: 24, attackGrowth: 2, baseHp: 180, hpGrowth: 14},
  rare: {baseAttack: 36, attackGrowth: 4, baseHp: 260, hpGrowth: 24},
  epic: {baseAttack: 54, attackGrowth: 7, baseHp: 380, hpGrowth: 38},
  legendary: {baseAttack: 80, attackGrowth: 11, baseHp: 560, hpGrowth: 58},
};

function getRarity(order: number): MonsterSummonRarity {
  if (order >= 9) {
    return 'legendary';
  }
  if (order >= 7) {
    return 'epic';
  }
  if (order >= 4) {
    return 'rare';
  }
  return 'common';
}

export function getSummonFragmentCost(order: number): number {
  let cost = 2;
  for (let i = 1; i < order; i += 1) {
    cost = Math.ceil(cost * 1.3);
  }
  return cost;
}

export const MONSTER_SUMMON_DEFINITIONS: MonsterSummonDefinition[] =
  WORLD_SUMMON_ROWS.flatMap((row, worldIndex) =>
    row.map((entry, index) => ({
      ...entry,
      worldId: worldIndex + 1,
      order: index + 1,
      rarity: getRarity(index + 1),
      weight: DRAW_WEIGHTS[index] ?? 1,
      fragmentCost: getSummonFragmentCost(index + 1),
      isBoss: index === row.length - 1,
    })),
  );

const SUMMON_BY_ID = MONSTER_SUMMON_DEFINITIONS.reduce<
  Record<string, MonsterSummonDefinition>
>((accumulator, definition) => {
  accumulator[definition.id] = definition;
  return accumulator;
}, {});

export function createDefaultMonsterSummonData(): MonsterSummonData {
  return {
    owned: {},
    selectedSummonId: null,
    fragments: 0,
    pendingRewards: {},
    pendingSkillChoices: {},
  };
}

export function ensureMonsterSummonData(
  data?: Partial<MonsterSummonData> | null,
): MonsterSummonData {
  const owned: Record<string, MonsterSummonState> = {};
  Object.entries(data?.owned ?? {}).forEach(([id, state]) => {
    if (!SUMMON_BY_ID[id]) {
      return;
    }
    owned[id] = normalizeSummonState(id, state);
  });

  const selectedSummonId =
    data?.selectedSummonId && owned[data.selectedSummonId]
      ? data.selectedSummonId
      : Object.keys(owned)[0] ?? null;

  const pendingRewards: Record<number, number> = {};
  Object.entries(data?.pendingRewards ?? {}).forEach(([worldId, count]) => {
    const key = Number(worldId);
    if (Number.isFinite(key) && key >= 1 && key <= WORLD_SUMMON_ROWS.length) {
      pendingRewards[key] = Math.max(0, Math.floor(Number(count) || 0));
    }
  });

  const pendingSkillChoices: Record<string, MonsterSummonSkillKey[]> = {};
  Object.entries(data?.pendingSkillChoices ?? {}).forEach(([id, choices]) => {
    if (!owned[id] || !Array.isArray(choices)) {
      return;
    }
    const safeChoices = choices.filter(isSummonSkillKey).slice(0, 3);
    if (safeChoices.length > 0) {
      pendingSkillChoices[id] = safeChoices;
    }
  });

  return {
    owned,
    selectedSummonId,
    fragments: Math.max(0, Math.floor(Number(data?.fragments) || 0)),
    pendingRewards,
    pendingSkillChoices,
  };
}

function normalizeSummonState(
  id: string,
  state?: Partial<MonsterSummonState>,
): MonsterSummonState {
  return {
    id,
    level: Math.max(1, Math.floor(Number(state?.level) || 1)),
    exp: Math.max(0, Math.floor(Number(state?.exp) || 0)),
    evolutionStage: Math.max(
      0,
      Math.min(3, Math.floor(Number(state?.evolutionStage) || 0)),
    ),
    skills: Array.isArray(state?.skills)
      ? state.skills.filter(isSummonSkillKey).slice(0, 4)
      : [],
  };
}

function isSummonSkillKey(value: unknown): value is MonsterSummonSkillKey {
  return MONSTER_SUMMON_SKILLS.some(skill => skill.key === value);
}

function createLevelOneSummon(id: string): MonsterSummonState {
  return {
    id,
    level: 1,
    exp: 0,
    evolutionStage: 0,
    skills: [],
  };
}

export function getSummonDefinition(
  summonId: string | null | undefined,
): MonsterSummonDefinition | null {
  return summonId ? SUMMON_BY_ID[summonId] ?? null : null;
}

export function getWorldSummonDefinitions(
  worldId: number,
): MonsterSummonDefinition[] {
  return MONSTER_SUMMON_DEFINITIONS.filter(entry => entry.worldId === worldId);
}

export function getSummonFragmentReward(worldId: number): number {
  return Math.max(1, Math.round(2 * Math.pow(1.5, Math.max(0, worldId - 1))));
}

export function addPendingSummonReward(
  data: MonsterSummonData,
  worldId: number,
  count = 1,
): MonsterSummonData {
  const safeData = ensureMonsterSummonData(data);
  const safeWorldId = Math.max(1, Math.min(WORLD_SUMMON_ROWS.length, worldId));
  return {
    ...safeData,
    pendingRewards: {
      ...safeData.pendingRewards,
      [safeWorldId]: (safeData.pendingRewards[safeWorldId] ?? 0) + Math.max(1, count),
    },
  };
}

function consumePendingReward(
  data: MonsterSummonData,
  worldId: number,
): MonsterSummonData | null {
  const current = data.pendingRewards[worldId] ?? 0;
  if (current <= 0) {
    return null;
  }
  return {
    ...data,
    pendingRewards: {
      ...data.pendingRewards,
      [worldId]: current - 1,
    },
  };
}

export function drawWorldSummon(
  data: MonsterSummonData,
  worldId: number,
  roll = Math.random(),
): MonsterSummonDrawResult {
  const safeData = ensureMonsterSummonData(data);
  const rewardData = consumePendingReward(safeData, worldId);
  if (!rewardData) {
    return {data: safeData, definition: null, duplicate: false, error: 'no_reward'};
  }

  const pool = getWorldSummonDefinitions(worldId);
  if (pool.length === 0) {
    return {data: safeData, definition: null, duplicate: false, error: 'missing_world'};
  }

  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let target = Math.max(0, Math.min(0.999999, roll)) * totalWeight;
  const definition =
    pool.find(entry => {
      target -= entry.weight;
      return target < 0;
    }) ?? pool[pool.length - 1];

  const existing = rewardData.owned[definition.id];
  const duplicate = Boolean(existing);
  const owned = {
    ...rewardData.owned,
    [definition.id]: existing
      ? {...existing, level: existing.level + 1}
      : createLevelOneSummon(definition.id),
  };
  const nextSelected = rewardData.selectedSummonId ?? definition.id;
  const nextChoices = {...rewardData.pendingSkillChoices};
  if (definition.isBoss && !duplicate) {
    nextChoices[definition.id] = createRandomSkillChoices([], `${definition.id}:boss`);
  }

  return {
    data: {
      ...rewardData,
      owned,
      selectedSummonId: nextSelected,
      pendingSkillChoices: nextChoices,
    },
    definition,
    duplicate,
  };
}

export function claimMonsterSummonFragments(
  data: MonsterSummonData,
  worldId: number,
): MonsterSummonFragmentResult {
  const safeData = ensureMonsterSummonData(data);
  const rewardData = consumePendingReward(safeData, worldId);
  if (!rewardData) {
    return {data: safeData, amount: 0, error: 'no_reward'};
  }
  const amount = getSummonFragmentReward(worldId);
  return {
    data: {
      ...rewardData,
      fragments: rewardData.fragments + amount,
    },
    amount,
  };
}

export function buyMonsterSummonWithFragments(
  data: MonsterSummonData,
  summonId: string,
): MonsterSummonPurchaseResult {
  const safeData = ensureMonsterSummonData(data);
  const definition = getSummonDefinition(summonId);
  if (!definition) {
    return {data: safeData, definition: null, duplicate: false, error: 'missing_summon'};
  }
  if (definition.isBoss) {
    return {data: safeData, definition, duplicate: false, error: 'boss_only_draw'};
  }
  if (safeData.fragments < definition.fragmentCost) {
    return {
      data: safeData,
      definition,
      duplicate: Boolean(safeData.owned[summonId]),
      error: 'not_enough_fragments',
    };
  }
  const existing = safeData.owned[summonId];
  const duplicate = Boolean(existing);
  const owned = {
    ...safeData.owned,
    [summonId]: existing
      ? {...existing, level: existing.level + 1}
      : createLevelOneSummon(summonId),
  };
  return {
    data: {
      ...safeData,
      fragments: safeData.fragments - definition.fragmentCost,
      owned,
      selectedSummonId: safeData.selectedSummonId ?? summonId,
    },
    definition,
    duplicate,
  };
}

export function convertMonsterSummonToFragments(
  data: MonsterSummonData,
  summonId: string,
): MonsterSummonConvertResult {
  const safeData = ensureMonsterSummonData(data);
  const state = safeData.owned[summonId];
  const definition = getSummonDefinition(summonId);
  if (!state || !definition) {
    return {data: safeData, amount: 0, error: 'missing_summon'};
  }

  const amount =
    definition.fragmentCost *
    Math.max(1, state.level) *
    Math.pow(2, Math.max(0, state.evolutionStage));
  const owned = {...safeData.owned};
  delete owned[summonId];
  const pendingSkillChoices = {...safeData.pendingSkillChoices};
  delete pendingSkillChoices[summonId];
  const nextSelected =
    safeData.selectedSummonId === summonId
      ? Object.keys(owned)[0] ?? null
      : safeData.selectedSummonId;

  return {
    data: {
      ...safeData,
      owned,
      selectedSummonId: nextSelected,
      pendingSkillChoices,
      fragments: safeData.fragments + amount,
    },
    amount,
  };
}

export function selectMonsterSummon(
  data: MonsterSummonData,
  summonId: string | null,
): MonsterSummonData {
  const safeData = ensureMonsterSummonData(data);
  if (!summonId || !safeData.owned[summonId]) {
    return {...safeData, selectedSummonId: null};
  }
  return {...safeData, selectedSummonId: summonId};
}

export function getMonsterSummonExpRequired(level: number): number {
  return (100 + Math.max(0, level - 1) * 60) * 20;
}

function getEligibleEvolutionStage(level: number): number {
  if (level >= 60) {
    return 3;
  }
  if (level >= 40) {
    return 2;
  }
  if (level >= 20) {
    return 1;
  }
  return 0;
}

export function applyMonsterSummonExp(
  data: MonsterSummonData,
  summonId: string,
  expAmount: number,
): MonsterSummonData {
  const safeData = ensureMonsterSummonData(data);
  const current = safeData.owned[summonId];
  if (!current || expAmount <= 0) {
    return safeData;
  }

  const stats = getMonsterSummonBattleStats(summonId, current);
  let level = current.level;
  let exp = current.exp + Math.round(expAmount * stats.expGainMultiplier);
  while (exp >= getMonsterSummonExpRequired(level)) {
    exp -= getMonsterSummonExpRequired(level);
    level += 1;
  }

  const nextState = {...current, level, exp};
  const pendingSkillChoices = {...safeData.pendingSkillChoices};
  const eligibleEvolution = getEligibleEvolutionStage(level);
  if (eligibleEvolution > nextState.evolutionStage && !pendingSkillChoices[summonId]) {
    pendingSkillChoices[summonId] = createRandomSkillChoices(
      nextState.skills,
      `${summonId}:${eligibleEvolution}:${level}`,
    );
  }

  return {
    ...safeData,
    owned: {...safeData.owned, [summonId]: nextState},
    pendingSkillChoices,
  };
}

export function chooseMonsterSummonSkill(
  data: MonsterSummonData,
  summonId: string,
  skillKey: MonsterSummonSkillKey,
): MonsterSummonData {
  const safeData = ensureMonsterSummonData(data);
  const state = safeData.owned[summonId];
  const choices = safeData.pendingSkillChoices[summonId] ?? [];
  if (!state || !choices.includes(skillKey)) {
    return safeData;
  }

  const nextEvolutionStage = Math.min(
    3,
    Math.max(state.evolutionStage + 1, getEligibleEvolutionStage(state.level)),
  );
  const owned = {
    ...safeData.owned,
    [summonId]: {
      ...state,
      evolutionStage: nextEvolutionStage,
      skills: Array.from(new Set([...state.skills, skillKey])).slice(0, 4),
    },
  };
  const pendingSkillChoices = {...safeData.pendingSkillChoices};
  delete pendingSkillChoices[summonId];

  return {
    ...safeData,
    owned,
    pendingSkillChoices,
  };
}

export function getMonsterSummonBattleStats(
  summonId: string,
  state: Pick<MonsterSummonState, 'level' | 'evolutionStage' | 'skills'>,
): MonsterSummonBattleStats {
  const definition = getSummonDefinition(summonId);
  if (!definition) {
    return {
      attack: 0,
      hp: 0,
      durationMs: 0,
      gaugeRequired: 0,
      expRequired: getMonsterSummonExpRequired(1),
      gaugeGainMultiplier: 1,
      expGainMultiplier: 1,
      doubleAttackChance: 0,
    };
  }

  const rarityStats = RARITY_STATS[definition.rarity];
  const worldFactor = 1 + Math.max(0, definition.worldId - 1) * 0.18;
  const level = Math.max(1, state.level);
  const evolutionMultiplier = 1 + Math.max(0, state.evolutionStage) * 0.25;
  const skillEffects = getMonsterSummonSkillEffects(state.skills);
  const attack = Math.round(
    (rarityStats.baseAttack + (level - 1) * rarityStats.attackGrowth) *
      worldFactor *
      evolutionMultiplier *
      skillEffects.attackMultiplier,
  );
  const hp = Math.round(
    (rarityStats.baseHp + (level - 1) * rarityStats.hpGrowth) *
      worldFactor *
      evolutionMultiplier *
      skillEffects.hpMultiplier,
  );

  return {
    attack: Math.max(1, attack),
    hp: Math.max(1, hp),
    durationMs:
      (30 + Math.max(0, level - 1) * 5) * 1000 + skillEffects.durationBonusMs,
    gaugeRequired: MONSTER_SUMMON_GAUGE_REQUIRED,
    expRequired: getMonsterSummonExpRequired(level),
    gaugeGainMultiplier: skillEffects.gaugeGainMultiplier,
    expGainMultiplier: skillEffects.expGainMultiplier,
    doubleAttackChance: skillEffects.doubleAttackChance,
  };
}

export function getSelectedMonsterSummonLoadout(
  data: MonsterSummonData,
): MonsterSummonLoadout | null {
  const safeData = ensureMonsterSummonData(data);
  const selectedId = safeData.selectedSummonId;
  const progress = selectedId ? safeData.owned[selectedId] : null;
  const definition = getSummonDefinition(selectedId);
  if (!selectedId || !progress || !definition) {
    return null;
  }
  return {
    definition,
    progress,
    stats: getMonsterSummonBattleStats(selectedId, progress),
  };
}

export function getMonsterSummonGaugeGain(
  blockCount: number,
  clearedLines: number,
  gaugeGainMultiplier = 1,
): number {
  const baseGain = blockCount + clearedLines * 6;
  return Math.max(1, Math.round(baseGain * gaugeGainMultiplier));
}

export function getSummonSkillName(key: MonsterSummonSkillKey): string {
  return MONSTER_SUMMON_SKILLS.find(skill => skill.key === key)?.name ?? key;
}

function getMonsterSummonSkillEffects(skills: MonsterSummonSkillKey[]) {
  return skills.reduce(
    (effects, skill) => {
      switch (skill) {
        case 'heavy_strike':
          effects.attackMultiplier += 0.12;
          break;
        case 'multi_strike':
          effects.doubleAttackChance += 0.1;
          break;
        case 'piercing_hit':
          effects.attackMultiplier += 0.08;
          effects.expGainMultiplier += 0.05;
          break;
        case 'critical_focus':
          effects.doubleAttackChance += 0.06;
          break;
        case 'execution':
          effects.attackMultiplier += 0.1;
          break;
        case 'blast_attack':
          effects.attackMultiplier += 0.07;
          break;
        case 'toxic_wound':
          effects.attackMultiplier += 0.06;
          effects.durationBonusMs += 3000;
          break;
        case 'burning':
          effects.attackMultiplier += 0.06;
          effects.expGainMultiplier += 0.05;
          break;
        case 'chain_lightning':
          effects.doubleAttackChance += 0.08;
          break;
        case 'frost_shock':
          effects.durationBonusMs += 5000;
          break;
        case 'guardian_shield':
          effects.hpMultiplier += 0.18;
          break;
        case 'taunt':
          effects.hpMultiplier += 0.12;
          effects.durationBonusMs += 3000;
          break;
        case 'damage_reduction':
          effects.hpMultiplier += 0.15;
          break;
        case 'unyielding':
          effects.hpMultiplier += 0.2;
          break;
        case 'counter':
          effects.attackMultiplier += 0.06;
          effects.hpMultiplier += 0.08;
          break;
        case 'regeneration':
          effects.hpMultiplier += 0.1;
          effects.durationBonusMs += 4000;
          break;
        case 'emergency_heal':
          effects.durationBonusMs += 4000;
          break;
        case 'attack_buff':
          effects.attackMultiplier += 0.15;
          break;
        case 'speed_buff':
          effects.doubleAttackChance += 0.06;
          effects.gaugeGainMultiplier += 0.05;
          break;
        case 'lucky_aura':
          effects.expGainMultiplier += 0.1;
          effects.gaugeGainMultiplier += 0.08;
          break;
      }
      return effects;
    },
    {
      attackMultiplier: 1,
      hpMultiplier: 1,
      durationBonusMs: 0,
      gaugeGainMultiplier: 1,
      expGainMultiplier: 1,
      doubleAttackChance: 0,
    },
  );
}

function createRandomSkillChoices(
  ownedSkills: MonsterSummonSkillKey[],
  seed: string,
): MonsterSummonSkillKey[] {
  const owned = new Set(ownedSkills);
  const candidates = MONSTER_SUMMON_SKILLS.filter(skill => !owned.has(skill.key));
  const pool = candidates.length >= 3 ? candidates : MONSTER_SUMMON_SKILLS;
  const shuffled = [...pool].sort(
    (a, b) =>
      seededScore(`${seed}:${a.key}`) - seededScore(`${seed}:${b.key}`),
  );
  return shuffled.slice(0, 3).map(skill => skill.key);
}

function seededScore(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}
