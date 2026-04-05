import type {ImageSourcePropType} from 'react-native';

export type MonsterSpritePose = 'idle' | 'attack' | 'hurt';

export interface MonsterSpriteSet {
  idle: ImageSourcePropType;
  attack: ImageSourcePropType;
  hurt: ImageSourcePropType;
  scale?: number;
  facing?: 1 | -1;
}

function createStaticSpriteSet(
  source: ImageSourcePropType,
  options?: Pick<MonsterSpriteSet, 'scale' | 'facing'>,
): MonsterSpriteSet {
  return {
    idle: source,
    attack: source,
    hurt: source,
    ...options,
  };
}

const WORLD_01_FRAMES: Record<string, MonsterSpriteSet> = {
  slime: {
    idle: require('./monsters/world_01/slime_idle.png'),
    attack: require('./monsters/world_01/slime_attack.png'),
    hurt: require('./monsters/world_01/slime_hurt.png'),
    facing: 1,
  },
  grasslandRabbit: {
    idle: require('./monsters/world_01/grassland_rabbit_idle.png'),
    attack: require('./monsters/world_01/grassland_rabbit_attack.png'),
    hurt: require('./monsters/world_01/grassland_rabbit_hurt.png'),
    facing: 1,
  },
  mushroomSoldier: {
    idle: require('./monsters/world_01/mushroom_soldier_idle.png'),
    attack: require('./monsters/world_01/mushroom_soldier_attack.png'),
    hurt: require('./monsters/world_01/mushroom_soldier_hurt.png'),
    facing: 1,
  },
  stoneGolem: {
    idle: require('./monsters/world_01/stone_golem_idle.png'),
    attack: require('./monsters/world_01/stone_golem_attack.png'),
    hurt: require('./monsters/world_01/stone_golem_hurt.png'),
    facing: 1,
  },
  vineCreature: {
    idle: require('./monsters/world_01/vine_creature_idle.png'),
    attack: require('./monsters/world_01/vine_creature_attack.png'),
    hurt: require('./monsters/world_01/vine_creature_hurt.png'),
    facing: 1,
  },
  forestSpirit: {
    idle: require('./monsters/world_01/forest_spirit_idle.png'),
    attack: require('./monsters/world_01/forest_spirit_attack.png'),
    hurt: require('./monsters/world_01/forest_spirit_hurt.png'),
    facing: 1,
  },
  forestGuardian: {
    idle: require('./monsters/world_01/forest_guardian_idle.png'),
    attack: require('./monsters/world_01/forest_guardian_attack.png'),
    hurt: require('./monsters/world_01/forest_guardian_hurt.png'),
    facing: 1,
  },
  greenBasilisk: {
    idle: require('./monsters/world_01/green_basilisk_idle.png'),
    attack: require('./monsters/world_01/green_basilisk_attack.png'),
    hurt: require('./monsters/world_01/green_basilisk_hurt.png'),
    facing: 1,
  },
  kingSlime: {
    idle: require('./monsters/world_01/king_slime_idle.png'),
    attack: require('./monsters/world_01/king_slime_attack.png'),
    hurt: require('./monsters/world_01/king_slime_hurt.png'),
    facing: 1,
  },
};

const WORLD_MONSTER_NAME_SPRITE_SETS: Record<string, MonsterSpriteSet> = {
  슬라임: WORLD_01_FRAMES.slime,
  '초원 토끼': WORLD_01_FRAMES.grasslandRabbit,
  '버섯 병사': WORLD_01_FRAMES.mushroomSoldier,
  '석상 골렘': WORLD_01_FRAMES.stoneGolem,
  '덩굴 생물': WORLD_01_FRAMES.vineCreature,
  '숲의 정령': WORLD_01_FRAMES.forestSpirit,
  '포레스트 가디언': WORLD_01_FRAMES.forestGuardian,
  '그린 바실리스크': WORLD_01_FRAMES.greenBasilisk,
  킹슬라임: WORLD_01_FRAMES.kingSlime,
};

const WORLD_MONSTER_SPRITE_SETS: Record<number, MonsterSpriteSet> = {
  1: WORLD_01_FRAMES.kingSlime,
  2: createStaticSpriteSet(require('./monsters/world_02_scorpion.png')),
  3: createStaticSpriteSet(require('./monsters/world_03_ice_queen.png')),
  4: createStaticSpriteSet(require('./monsters/world_04_kraken.png')),
  5: createStaticSpriteSet(require('./monsters/world_05_hydra.png')),
  6: createStaticSpriteSet(require('./monsters/world_06_medusa.png')),
  7: createStaticSpriteSet(require('./monsters/world_07_lich.png')),
  8: createStaticSpriteSet(require('./monsters/world_08_storm_dragon.png')),
  9: createStaticSpriteSet(require('./monsters/world_09_abyss_lord.png')),
  10: createStaticSpriteSet(require('./monsters/world_10_red_dragon.png')),
};

export function getWorldMonsterSpriteSet(
  worldId: number,
  monsterName?: string,
): MonsterSpriteSet | null {
  if (monsterName) {
    const namedSpriteSet = WORLD_MONSTER_NAME_SPRITE_SETS[monsterName];
    if (namedSpriteSet) {
      return namedSpriteSet;
    }
  }
  return WORLD_MONSTER_SPRITE_SETS[worldId] ?? null;
}

export function getMonsterPoseSource(
  spriteSet: MonsterSpriteSet | null,
  pose: MonsterSpritePose,
): ImageSourcePropType | null {
  return spriteSet?.[pose] ?? null;
}

export function getWorldMonsterSprite(
  worldId: number,
  monsterName?: string,
): ImageSourcePropType | null {
  return getMonsterPoseSource(getWorldMonsterSpriteSet(worldId, monsterName), 'idle');
}

export function getRaidBossSpriteSet(stage: number): MonsterSpriteSet | null {
  return WORLD_MONSTER_SPRITE_SETS[stage] ?? null;
}

export function getRaidBossSprite(stage: number): ImageSourcePropType | null {
  return getMonsterPoseSource(getRaidBossSpriteSet(stage), 'idle');
}

export interface RaidSummonSpriteSet {
  name: string;
  idle: ImageSourcePropType;
  attack: ImageSourcePropType;
  hurt: ImageSourcePropType;
  scale?: number;
  facing?: 1 | -1;
}

const RAID_SUMMON_SPRITES: Record<number, RaidSummonSpriteSet> = {
  1: {
    name: '슬라임',
    ...WORLD_01_FRAMES.slime,
    scale: 1.25,
  },
  2: {
    name: 'Scorpion',
    idle: require('./monsters/world_02_scorpion.png'),
    attack: require('./monsters/world_02_scorpion.png'),
    hurt: require('./monsters/world_02_scorpion.png'),
    scale: 1,
  },
  3: {
    name: 'Ice Queen',
    idle: require('./monsters/world_03_ice_queen.png'),
    attack: require('./monsters/world_03_ice_queen.png'),
    hurt: require('./monsters/world_03_ice_queen.png'),
    scale: 1,
  },
  4: {
    name: 'Kraken',
    idle: require('./monsters/world_04_kraken.png'),
    attack: require('./monsters/world_04_kraken.png'),
    hurt: require('./monsters/world_04_kraken.png'),
    scale: 1,
  },
  5: {
    name: 'Hydra',
    idle: require('./monsters/world_05_hydra.png'),
    attack: require('./monsters/world_05_hydra.png'),
    hurt: require('./monsters/world_05_hydra.png'),
    scale: 1,
  },
  6: {
    name: 'Medusa',
    idle: require('./monsters/world_06_medusa.png'),
    attack: require('./monsters/world_06_medusa.png'),
    hurt: require('./monsters/world_06_medusa.png'),
    scale: 1,
  },
  7: {
    name: 'Lich',
    idle: require('./monsters/world_07_lich.png'),
    attack: require('./monsters/world_07_lich.png'),
    hurt: require('./monsters/world_07_lich.png'),
    scale: 1,
  },
  8: {
    name: 'Storm Dragon',
    idle: require('./monsters/world_08_storm_dragon.png'),
    attack: require('./monsters/world_08_storm_dragon.png'),
    hurt: require('./monsters/world_08_storm_dragon.png'),
    scale: 1,
  },
  9: {
    name: 'Abyss Lord',
    idle: require('./monsters/world_09_abyss_lord.png'),
    attack: require('./monsters/world_09_abyss_lord.png'),
    hurt: require('./monsters/world_09_abyss_lord.png'),
    scale: 1,
  },
  10: {
    name: 'Red Dragon',
    idle: require('./monsters/world_10_red_dragon.png'),
    attack: require('./monsters/world_10_red_dragon.png'),
    hurt: require('./monsters/world_10_red_dragon.png'),
    scale: 1,
  },
};

export function getRaidSummonSpriteSet(stage: number): RaidSummonSpriteSet | null {
  return RAID_SUMMON_SPRITES[stage] ?? null;
}
