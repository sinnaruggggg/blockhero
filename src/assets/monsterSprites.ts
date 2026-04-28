import type {ImageSourcePropType} from 'react-native';
import {getSummonDefinition} from '../game/monsterSummonRuntime';

export type MonsterSpritePose = 'idle' | 'attack' | 'hurt';

export interface MonsterSpriteSet {
  idle: ImageSourcePropType;
  attack: ImageSourcePropType;
  hurt: ImageSourcePropType;
  scale?: number;
  facing?: 1 | -1;
}

function spriteSet(
  idle: ImageSourcePropType,
  attack: ImageSourcePropType,
  hurt: ImageSourcePropType,
  options?: Pick<MonsterSpriteSet, 'scale' | 'facing'>,
): MonsterSpriteSet {
  return {
    idle,
    attack,
    hurt,
    facing: 1,
    ...options,
  };
}

const MONSTER_SPRITES: Record<string, MonsterSpriteSet> = {
  slime: spriteSet(
    require('./monsters/world_01/slime_idle.png'),
    require('./monsters/world_01/slime_attack.png'),
    require('./monsters/world_01/slime_hurt.png'),
  ),
  grasslandRabbit: spriteSet(
    require('./monsters/world_01/grassland_rabbit_idle.png'),
    require('./monsters/world_01/grassland_rabbit_attack.png'),
    require('./monsters/world_01/grassland_rabbit_hurt.png'),
  ),
  mushroomSoldier: spriteSet(
    require('./monsters/world_01/mushroom_soldier_idle.png'),
    require('./monsters/world_01/mushroom_soldier_attack.png'),
    require('./monsters/world_01/mushroom_soldier_hurt.png'),
  ),
  stoneGolem: spriteSet(
    require('./monsters/world_01/stone_golem_idle.png'),
    require('./monsters/world_01/stone_golem_attack.png'),
    require('./monsters/world_01/stone_golem_hurt.png'),
  ),
  vineCreature: spriteSet(
    require('./monsters/world_01/vine_creature_idle.png'),
    require('./monsters/world_01/vine_creature_attack.png'),
    require('./monsters/world_01/vine_creature_hurt.png'),
  ),
  forestSpirit: spriteSet(
    require('./monsters/world_01/forest_spirit_idle.png'),
    require('./monsters/world_01/forest_spirit_attack.png'),
    require('./monsters/world_01/forest_spirit_hurt.png'),
  ),
  forestGuardian: spriteSet(
    require('./monsters/world_01/forest_guardian_idle.png'),
    require('./monsters/world_01/forest_guardian_attack.png'),
    require('./monsters/world_01/forest_guardian_hurt.png'),
  ),
  greenBasilisk: spriteSet(
    require('./monsters/world_01/green_basilisk_idle.png'),
    require('./monsters/world_01/green_basilisk_attack.png'),
    require('./monsters/world_01/green_basilisk_hurt.png'),
  ),
  kingSlime: spriteSet(
    require('./monsters/world_01/king_slime_idle.png'),
    require('./monsters/world_01/king_slime_attack.png'),
    require('./monsters/world_01/king_slime_hurt.png'),
  ),

  sandCrab: spriteSet(
    require('./monsters/world_02/sand_crab_idle.png'),
    require('./monsters/world_02/sand_crab_attack.png'),
    require('./monsters/world_02/sand_crab_hurt.png'),
  ),
  desertLizard: spriteSet(
    require('./monsters/world_02/desert_lizard_idle.png'),
    require('./monsters/world_02/desert_lizard_attack.png'),
    require('./monsters/world_02/desert_lizard_hurt.png'),
  ),
  cactusSoldier: spriteSet(
    require('./monsters/world_02/cactus_soldier_idle.png'),
    require('./monsters/world_02/cactus_soldier_attack.png'),
    require('./monsters/world_02/cactus_soldier_hurt.png'),
  ),
  mummy: spriteSet(
    require('./monsters/world_02/mummy_idle.png'),
    require('./monsters/world_02/mummy_attack.png'),
    require('./monsters/world_02/mummy_hurt.png'),
  ),
  sandWorm: spriteSet(
    require('./monsters/world_02/sand_worm_idle.png'),
    require('./monsters/world_02/sand_worm_attack.png'),
    require('./monsters/world_02/sand_worm_hurt.png'),
  ),
  desertFox: spriteSet(
    require('./monsters/world_02/desert_fox_idle.png'),
    require('./monsters/world_02/desert_fox_attack.png'),
    require('./monsters/world_02/desert_fox_hurt.png'),
  ),
  desertGolem: spriteSet(
    require('./monsters/world_02/desert_golem_idle.png'),
    require('./monsters/world_02/desert_golem_attack.png'),
    require('./monsters/world_02/desert_golem_hurt.png'),
  ),
  sphinx: spriteSet(
    require('./monsters/world_02/sphinx_idle.png'),
    require('./monsters/world_02/sphinx_attack.png'),
    require('./monsters/world_02/sphinx_hurt.png'),
  ),
  scorpionKing: spriteSet(
    require('./monsters/world_02/scorpion_king_idle.png'),
    require('./monsters/world_02/scorpion_king_attack.png'),
    require('./monsters/world_02/scorpion_king_hurt.png'),
  ),

  iceWolf: spriteSet(
    require('./monsters/world_03/ice_wolf_idle.png'),
    require('./monsters/world_03/ice_wolf_attack.png'),
    require('./monsters/world_03/ice_wolf_hurt.png'),
  ),
  snowRabbit: spriteSet(
    require('./monsters/world_03/snow_rabbit_idle.png'),
    require('./monsters/world_03/snow_rabbit_attack.png'),
    require('./monsters/world_03/snow_rabbit_hurt.png'),
  ),
  frostFairy: spriteSet(
    require('./monsters/world_03/frost_fairy_idle.png'),
    require('./monsters/world_03/frost_fairy_attack.png'),
    require('./monsters/world_03/frost_fairy_hurt.png'),
  ),
  iceGiant: spriteSet(
    require('./monsters/world_03/ice_giant_idle.png'),
    require('./monsters/world_03/ice_giant_attack.png'),
    require('./monsters/world_03/ice_giant_hurt.png'),
  ),
  snowHawk: spriteSet(
    require('./monsters/world_03/snow_hawk_idle.png'),
    require('./monsters/world_03/snow_hawk_attack.png'),
    require('./monsters/world_03/snow_hawk_hurt.png'),
  ),
  frozenGolem: spriteSet(
    require('./monsters/world_03/frozen_golem_idle.png'),
    require('./monsters/world_03/frozen_golem_attack.png'),
    require('./monsters/world_03/frozen_golem_hurt.png'),
  ),
  glacierDragon: spriteSet(
    require('./monsters/world_03/glacier_dragon_idle.png'),
    require('./monsters/world_03/glacier_dragon_attack.png'),
    require('./monsters/world_03/glacier_dragon_hurt.png'),
  ),
  blizzardSpirit: spriteSet(
    require('./monsters/world_03/blizzard_spirit_idle.png'),
    require('./monsters/world_03/blizzard_spirit_attack.png'),
    require('./monsters/world_03/blizzard_spirit_hurt.png'),
  ),
  iceQueen: spriteSet(
    require('./monsters/world_03/ice_queen_idle.png'),
    require('./monsters/world_03/ice_queen_attack.png'),
    require('./monsters/world_03/ice_queen_hurt.png'),
  ),

  jellyfish: spriteSet(
    require('./monsters/world_04/jellyfish_idle.png'),
    require('./monsters/world_04/jellyfish_attack.png'),
    require('./monsters/world_04/jellyfish_hurt.png'),
  ),
  shellKnight: spriteSet(
    require('./monsters/world_04/shell_knight_idle.png'),
    require('./monsters/world_04/shell_knight_attack.png'),
    require('./monsters/world_04/shell_knight_hurt.png'),
  ),
  coralSpirit: spriteSet(
    require('./monsters/world_04/coral_spirit_idle.png'),
    require('./monsters/world_04/coral_spirit_attack.png'),
    require('./monsters/world_04/coral_spirit_hurt.png'),
  ),
  electricEel: spriteSet(
    require('./monsters/world_04/electric_eel_idle.png'),
    require('./monsters/world_04/electric_eel_attack.png'),
    require('./monsters/world_04/electric_eel_hurt.png'),
  ),
  sharkWarrior: spriteSet(
    require('./monsters/world_04/shark_warrior_idle.png'),
    require('./monsters/world_04/shark_warrior_attack.png'),
    require('./monsters/world_04/shark_warrior_hurt.png'),
  ),
  deepSeaDragon: spriteSet(
    require('./monsters/world_04/deep_sea_dragon_idle.png'),
    require('./monsters/world_04/deep_sea_dragon_attack.png'),
    require('./monsters/world_04/deep_sea_dragon_hurt.png'),
  ),
  giantTurtle: spriteSet(
    require('./monsters/world_04/giant_turtle_idle.png'),
    require('./monsters/world_04/giant_turtle_attack.png'),
    require('./monsters/world_04/giant_turtle_hurt.png'),
  ),
  abyssLeviathan: spriteSet(
    require('./monsters/world_04/abyss_leviathan_idle.png'),
    require('./monsters/world_04/abyss_leviathan_attack.png'),
    require('./monsters/world_04/abyss_leviathan_hurt.png'),
  ),
  kraken: spriteSet(
    require('./monsters/world_04/kraken_idle.png'),
    require('./monsters/world_04/kraken_attack.png'),
    require('./monsters/world_04/kraken_hurt.png'),
  ),

  poisonMushroom: spriteSet(
    require('./monsters/world_05/poison_mushroom_idle.png'),
    require('./monsters/world_05/poison_mushroom_attack.png'),
    require('./monsters/world_05/poison_mushroom_hurt.png'),
  ),
  poisonFrog: spriteSet(
    require('./monsters/world_05/poison_frog_idle.png'),
    require('./monsters/world_05/poison_frog_attack.png'),
    require('./monsters/world_05/poison_frog_hurt.png'),
  ),
  vineSpider: spriteSet(
    require('./monsters/world_05/vine_spider_idle.png'),
    require('./monsters/world_05/vine_spider_attack.png'),
    require('./monsters/world_05/vine_spider_hurt.png'),
  ),
  plagueBat: spriteSet(
    require('./monsters/world_05/plague_bat_idle.png'),
    require('./monsters/world_05/plague_bat_attack.png'),
    require('./monsters/world_05/plague_bat_hurt.png'),
  ),
  viper: spriteSet(
    require('./monsters/world_05/viper_idle.png'),
    require('./monsters/world_05/viper_attack.png'),
    require('./monsters/world_05/viper_hurt.png'),
  ),
  poisonTreant: spriteSet(
    require('./monsters/world_05/poison_treant_idle.png'),
    require('./monsters/world_05/poison_treant_attack.png'),
    require('./monsters/world_05/poison_treant_hurt.png'),
  ),
  poisonGolem: spriteSet(
    require('./monsters/world_05/poison_golem_idle.png'),
    require('./monsters/world_05/poison_golem_attack.png'),
    require('./monsters/world_05/poison_golem_hurt.png'),
  ),
  kingSpider: spriteSet(
    require('./monsters/world_05/king_spider_idle.png'),
    require('./monsters/world_05/king_spider_attack.png'),
    require('./monsters/world_05/king_spider_hurt.png'),
  ),
  hydra: spriteSet(
    require('./monsters/world_05/hydra_idle.png'),
    require('./monsters/world_05/hydra_attack.png'),
    require('./monsters/world_05/hydra_hurt.png'),
  ),

  stoneStatue: spriteSet(
    require('./monsters/world_06/stone_statue_idle.png'),
    require('./monsters/world_06/stone_statue_attack.png'),
    require('./monsters/world_06/stone_statue_hurt.png'),
  ),
  cursedScarab: spriteSet(
    require('./monsters/world_06/cursed_scarab_idle.png'),
    require('./monsters/world_06/cursed_scarab_attack.png'),
    require('./monsters/world_06/cursed_scarab_hurt.png'),
  ),
  ruinGhost: spriteSet(
    require('./monsters/world_06/ruin_ghost_idle.png'),
    require('./monsters/world_06/ruin_ghost_attack.png'),
    require('./monsters/world_06/ruin_ghost_hurt.png'),
  ),
  golemKnight: spriteSet(
    require('./monsters/world_06/golem_knight_idle.png'),
    require('./monsters/world_06/golem_knight_attack.png'),
    require('./monsters/world_06/golem_knight_hurt.png'),
  ),
  ancientSphinx: spriteSet(
    require('./monsters/world_06/ancient_sphinx_idle.png'),
    require('./monsters/world_06/ancient_sphinx_attack.png'),
    require('./monsters/world_06/ancient_sphinx_hurt.png'),
  ),
  lavaSpirit: spriteSet(
    require('./monsters/world_06/lava_spirit_idle.png'),
    require('./monsters/world_06/lava_spirit_attack.png'),
    require('./monsters/world_06/lava_spirit_hurt.png'),
  ),
  ancientWatcher: spriteSet(
    require('./monsters/world_06/ancient_watcher_idle.png'),
    require('./monsters/world_06/ancient_watcher_attack.png'),
    require('./monsters/world_06/ancient_watcher_hurt.png'),
  ),
  tabletGolem: spriteSet(
    require('./monsters/world_06/tablet_golem_idle.png'),
    require('./monsters/world_06/tablet_golem_attack.png'),
    require('./monsters/world_06/tablet_golem_hurt.png'),
  ),
  medusa: spriteSet(
    require('./monsters/world_06/medusa_idle.png'),
    require('./monsters/world_06/medusa_attack.png'),
    require('./monsters/world_06/medusa_hurt.png'),
  ),

  shadowBat: spriteSet(
    require('./monsters/world_07/shadow_bat_idle.png'),
    require('./monsters/world_07/shadow_bat_attack.png'),
    require('./monsters/world_07/shadow_bat_hurt.png'),
  ),
  skeletonSoldier: spriteSet(
    require('./monsters/world_07/skeleton_soldier_idle.png'),
    require('./monsters/world_07/skeleton_soldier_attack.png'),
    require('./monsters/world_07/skeleton_soldier_hurt.png'),
  ),
  ghostKnight: spriteSet(
    require('./monsters/world_07/ghost_knight_idle.png'),
    require('./monsters/world_07/ghost_knight_attack.png'),
    require('./monsters/world_07/ghost_knight_hurt.png'),
  ),
  vampireBat: spriteSet(
    require('./monsters/world_07/vampire_bat_idle.png'),
    require('./monsters/world_07/vampire_bat_attack.png'),
    require('./monsters/world_07/vampire_bat_hurt.png'),
  ),
  darkMage: spriteSet(
    require('./monsters/world_07/dark_mage_idle.png'),
    require('./monsters/world_07/dark_mage_attack.png'),
    require('./monsters/world_07/dark_mage_hurt.png'),
  ),
  deathGolem: spriteSet(
    require('./monsters/world_07/death_golem_idle.png'),
    require('./monsters/world_07/death_golem_attack.png'),
    require('./monsters/world_07/death_golem_hurt.png'),
  ),
  banshee: spriteSet(
    require('./monsters/world_07/banshee_idle.png'),
    require('./monsters/world_07/banshee_attack.png'),
    require('./monsters/world_07/banshee_hurt.png'),
  ),
  darkKnight: spriteSet(
    require('./monsters/world_07/dark_knight_idle.png'),
    require('./monsters/world_07/dark_knight_attack.png'),
    require('./monsters/world_07/dark_knight_hurt.png'),
  ),
  lichKing: spriteSet(
    require('./monsters/world_07/lich_king_idle.png'),
    require('./monsters/world_07/lich_king_attack.png'),
    require('./monsters/world_07/lich_king_hurt.png'),
  ),

  windFairy: spriteSet(
    require('./monsters/world_08/wind_fairy_idle.png'),
    require('./monsters/world_08/wind_fairy_attack.png'),
    require('./monsters/world_08/wind_fairy_hurt.png'),
  ),
  cloudRabbit: spriteSet(
    require('./monsters/world_08/cloud_rabbit_idle.png'),
    require('./monsters/world_08/cloud_rabbit_attack.png'),
    require('./monsters/world_08/cloud_rabbit_hurt.png'),
  ),
  thunderbird: spriteSet(
    require('./monsters/world_08/thunderbird_idle.png'),
    require('./monsters/world_08/thunderbird_attack.png'),
    require('./monsters/world_08/thunderbird_hurt.png'),
  ),
  stormEagle: spriteSet(
    require('./monsters/world_08/storm_eagle_idle.png'),
    require('./monsters/world_08/storm_eagle_attack.png'),
    require('./monsters/world_08/storm_eagle_hurt.png'),
  ),
  skyGuardian: spriteSet(
    require('./monsters/world_08/sky_guardian_idle.png'),
    require('./monsters/world_08/sky_guardian_attack.png'),
    require('./monsters/world_08/sky_guardian_hurt.png'),
  ),
  celestialKnight: spriteSet(
    require('./monsters/world_08/celestial_knight_idle.png'),
    require('./monsters/world_08/celestial_knight_attack.png'),
    require('./monsters/world_08/celestial_knight_hurt.png'),
  ),
  stormPhoenix: spriteSet(
    require('./monsters/world_08/storm_phoenix_idle.png'),
    require('./monsters/world_08/storm_phoenix_attack.png'),
    require('./monsters/world_08/storm_phoenix_hurt.png'),
  ),
  skyGuardianBoss: spriteSet(
    require('./monsters/world_08/sky_guardian_boss_idle.png'),
    require('./monsters/world_08/sky_guardian_boss_attack.png'),
    require('./monsters/world_08/sky_guardian_boss_hurt.png'),
  ),
  thunderDragon: spriteSet(
    require('./monsters/world_08/thunder_dragon_idle.png'),
    require('./monsters/world_08/thunder_dragon_attack.png'),
    require('./monsters/world_08/thunder_dragon_hurt.png'),
  ),

  voidSlime: spriteSet(
    require('./monsters/world_09/void_slime_idle.png'),
    require('./monsters/world_09/void_slime_attack.png'),
    require('./monsters/world_09/void_slime_hurt.png'),
  ),
  darkLeech: spriteSet(
    require('./monsters/world_09/dark_leech_idle.png'),
    require('./monsters/world_09/dark_leech_attack.png'),
    require('./monsters/world_09/dark_leech_hurt.png'),
  ),
  abyssWatcher: spriteSet(
    require('./monsters/world_09/abyss_watcher_idle.png'),
    require('./monsters/world_09/abyss_watcher_attack.png'),
    require('./monsters/world_09/abyss_watcher_hurt.png'),
  ),
  chaosKnight: spriteSet(
    require('./monsters/world_09/chaos_knight_idle.png'),
    require('./monsters/world_09/chaos_knight_attack.png'),
    require('./monsters/world_09/chaos_knight_hurt.png'),
  ),
  nightmareBeast: spriteSet(
    require('./monsters/world_09/nightmare_beast_idle.png'),
    require('./monsters/world_09/nightmare_beast_attack.png'),
    require('./monsters/world_09/nightmare_beast_hurt.png'),
  ),
  voidDragon: spriteSet(
    require('./monsters/world_09/void_dragon_idle.png'),
    require('./monsters/world_09/void_dragon_attack.png'),
    require('./monsters/world_09/void_dragon_hurt.png'),
  ),
  abyssKing: spriteSet(
    require('./monsters/world_09/abyss_king_idle.png'),
    require('./monsters/world_09/abyss_king_attack.png'),
    require('./monsters/world_09/abyss_king_hurt.png'),
  ),
  voidGod: spriteSet(
    require('./monsters/world_09/void_god_idle.png'),
    require('./monsters/world_09/void_god_attack.png'),
    require('./monsters/world_09/void_god_hurt.png'),
  ),
  abyssLord: spriteSet(
    require('./monsters/world_09/abyss_lord_idle.png'),
    require('./monsters/world_09/abyss_lord_attack.png'),
    require('./monsters/world_09/abyss_lord_hurt.png'),
  ),

  lavaSlime: spriteSet(
    require('./monsters/world_10/lava_slime_idle.png'),
    require('./monsters/world_10/lava_slime_attack.png'),
    require('./monsters/world_10/lava_slime_hurt.png'),
  ),
  fireLizard: spriteSet(
    require('./monsters/world_10/fire_lizard_idle.png'),
    require('./monsters/world_10/fire_lizard_attack.png'),
    require('./monsters/world_10/fire_lizard_hurt.png'),
  ),
  magmaCrab: spriteSet(
    require('./monsters/world_10/magma_crab_idle.png'),
    require('./monsters/world_10/magma_crab_attack.png'),
    require('./monsters/world_10/magma_crab_hurt.png'),
  ),
  fireGiant: spriteSet(
    require('./monsters/world_10/fire_giant_idle.png'),
    require('./monsters/world_10/fire_giant_attack.png'),
    require('./monsters/world_10/fire_giant_hurt.png'),
  ),
  moltenGolem: spriteSet(
    require('./monsters/world_10/molten_golem_idle.png'),
    require('./monsters/world_10/molten_golem_attack.png'),
    require('./monsters/world_10/molten_golem_hurt.png'),
  ),
  flameWyvern: spriteSet(
    require('./monsters/world_10/flame_wyvern_idle.png'),
    require('./monsters/world_10/flame_wyvern_attack.png'),
    require('./monsters/world_10/flame_wyvern_hurt.png'),
  ),
  volcanoLord: spriteSet(
    require('./monsters/world_10/volcano_lord_idle.png'),
    require('./monsters/world_10/volcano_lord_attack.png'),
    require('./monsters/world_10/volcano_lord_hurt.png'),
  ),
  infernoDrake: spriteSet(
    require('./monsters/world_10/inferno_drake_idle.png'),
    require('./monsters/world_10/inferno_drake_attack.png'),
    require('./monsters/world_10/inferno_drake_hurt.png'),
  ),
  redDragon: spriteSet(
    require('./monsters/world_10/red_dragon_idle.png'),
    require('./monsters/world_10/red_dragon_attack.png'),
    require('./monsters/world_10/red_dragon_hurt.png'),
  ),
};

const WORLD_MONSTER_NAME_SPRITE_SETS: Record<string, MonsterSpriteSet> = {
  슬라임: MONSTER_SPRITES.slime,
  '초원 토끼': MONSTER_SPRITES.grasslandRabbit,
  '버섯 병사': MONSTER_SPRITES.mushroomSoldier,
  '석상 골렘': MONSTER_SPRITES.stoneGolem,
  '덩굴 생물': MONSTER_SPRITES.vineCreature,
  '숲의 정령': MONSTER_SPRITES.forestSpirit,
  '포레스트 가디언': MONSTER_SPRITES.forestGuardian,
  '그린 바실리스크': MONSTER_SPRITES.greenBasilisk,
  킹슬라임: MONSTER_SPRITES.kingSlime,

  '모래 게': MONSTER_SPRITES.sandCrab,
  '사막 도마뱀': MONSTER_SPRITES.desertLizard,
  '선인장 병사': MONSTER_SPRITES.cactusSoldier,
  미라: MONSTER_SPRITES.mummy,
  '모래 지렁이': MONSTER_SPRITES.sandWorm,
  '사막 여우': MONSTER_SPRITES.desertFox,
  '사막 골렘': MONSTER_SPRITES.desertGolem,
  스핑크스: MONSTER_SPRITES.sphinx,
  전갈왕: MONSTER_SPRITES.scorpionKing,

  '얼음 늑대': MONSTER_SPRITES.iceWolf,
  '눈 토끼': MONSTER_SPRITES.snowRabbit,
  '서리 요정': MONSTER_SPRITES.frostFairy,
  '얼음 거인': MONSTER_SPRITES.iceGiant,
  '설원 매': MONSTER_SPRITES.snowHawk,
  '동결 골렘': MONSTER_SPRITES.frozenGolem,
  '빙하 드래곤': MONSTER_SPRITES.glacierDragon,
  '눈보라 정령': MONSTER_SPRITES.blizzardSpirit,
  '설빙 여왕': MONSTER_SPRITES.iceQueen,

  해파리: MONSTER_SPRITES.jellyfish,
  '조개 기사': MONSTER_SPRITES.shellKnight,
  '산호 정령': MONSTER_SPRITES.coralSpirit,
  전기뱀장어: MONSTER_SPRITES.electricEel,
  '상어 전사': MONSTER_SPRITES.sharkWarrior,
  '심해 용': MONSTER_SPRITES.deepSeaDragon,
  '거대 거북': MONSTER_SPRITES.giantTurtle,
  '심해 레비아탄': MONSTER_SPRITES.abyssLeviathan,
  크라켄: MONSTER_SPRITES.kraken,

  독버섯: MONSTER_SPRITES.poisonMushroom,
  '독 개구리': MONSTER_SPRITES.poisonFrog,
  '덩굴 거미': MONSTER_SPRITES.vineSpider,
  '역병 박쥐': MONSTER_SPRITES.plagueBat,
  독사: MONSTER_SPRITES.viper,
  '독 트레인트': MONSTER_SPRITES.poisonTreant,
  '독 골렘': MONSTER_SPRITES.poisonGolem,
  '킹 독거미': MONSTER_SPRITES.kingSpider,
  히드라: MONSTER_SPRITES.hydra,

  석상: MONSTER_SPRITES.stoneStatue,
  '저주받은 풍뎅이': MONSTER_SPRITES.cursedScarab,
  '유적 유령': MONSTER_SPRITES.ruinGhost,
  '골렘 기사': MONSTER_SPRITES.golemKnight,
  '고대 스핑크스': MONSTER_SPRITES.ancientSphinx,
  '용암 정령': MONSTER_SPRITES.lavaSpirit,
  '고대 감시자': MONSTER_SPRITES.ancientWatcher,
  '석판 골렘': MONSTER_SPRITES.tabletGolem,
  메두사: MONSTER_SPRITES.medusa,

  '그림자 박쥐': MONSTER_SPRITES.shadowBat,
  '해골 병사': MONSTER_SPRITES.skeletonSoldier,
  '유령 기사': MONSTER_SPRITES.ghostKnight,
  '흡혈 박쥐': MONSTER_SPRITES.vampireBat,
  '암흑 마법사': MONSTER_SPRITES.darkMage,
  '죽음 골렘': MONSTER_SPRITES.deathGolem,
  밴시: MONSTER_SPRITES.banshee,
  '다크 나이트': MONSTER_SPRITES.darkKnight,
  '리치 킹': MONSTER_SPRITES.lichKing,

  '바람 요정': MONSTER_SPRITES.windFairy,
  '구름 토끼': MONSTER_SPRITES.cloudRabbit,
  천둥새: MONSTER_SPRITES.thunderbird,
  '폭풍 독수리': MONSTER_SPRITES.stormEagle,
  '하늘 수호자': MONSTER_SPRITES.skyGuardian,
  '천상 기사': MONSTER_SPRITES.celestialKnight,
  '스톰 피닉스': MONSTER_SPRITES.stormPhoenix,
  '천공 가디언': MONSTER_SPRITES.skyGuardianBoss,
  '천둥 용': MONSTER_SPRITES.thunderDragon,

  '허공 슬라임': MONSTER_SPRITES.voidSlime,
  '암흑 거머리': MONSTER_SPRITES.darkLeech,
  '심연 감시자': MONSTER_SPRITES.abyssWatcher,
  '혼돈 기사': MONSTER_SPRITES.chaosKnight,
  '악몽 짐승': MONSTER_SPRITES.nightmareBeast,
  '허공 드래곤': MONSTER_SPRITES.voidDragon,
  '심연 왕': MONSTER_SPRITES.abyssKing,
  '공허의 신': MONSTER_SPRITES.voidGod,
  '심연의 군주': MONSTER_SPRITES.abyssLord,

  '용암 슬라임': MONSTER_SPRITES.lavaSlime,
  '불 도마뱀': MONSTER_SPRITES.fireLizard,
  '마그마 게': MONSTER_SPRITES.magmaCrab,
  '화염 거인': MONSTER_SPRITES.fireGiant,
  '용융 골렘': MONSTER_SPRITES.moltenGolem,
  '불꽃 와이번': MONSTER_SPRITES.flameWyvern,
  '화산 군주': MONSTER_SPRITES.volcanoLord,
  '인페르노 드레이크': MONSTER_SPRITES.infernoDrake,
  '레드 드래곤': MONSTER_SPRITES.redDragon,
};

const WORLD_MONSTER_SPRITE_SETS: Record<number, MonsterSpriteSet> = {
  1: MONSTER_SPRITES.kingSlime,
  2: MONSTER_SPRITES.scorpionKing,
  3: MONSTER_SPRITES.iceQueen,
  4: MONSTER_SPRITES.kraken,
  5: MONSTER_SPRITES.hydra,
  6: MONSTER_SPRITES.medusa,
  7: MONSTER_SPRITES.lichKing,
  8: MONSTER_SPRITES.thunderDragon,
  9: MONSTER_SPRITES.abyssLord,
  10: MONSTER_SPRITES.redDragon,
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

export function getRaidBossSpriteSet(
  stage: number,
  monsterName?: string,
): MonsterSpriteSet | null {
  if (monsterName) {
    const namedSpriteSet = WORLD_MONSTER_NAME_SPRITE_SETS[monsterName];
    if (namedSpriteSet) {
      return namedSpriteSet;
    }
  }
  return WORLD_MONSTER_SPRITE_SETS[stage] ?? null;
}

export function getRaidBossSprite(
  stage: number,
  monsterName?: string,
): ImageSourcePropType | null {
  return getMonsterPoseSource(getRaidBossSpriteSet(stage, monsterName), 'idle');
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
  1: {name: '슬라임', ...MONSTER_SPRITES.slime, scale: 1.25},
  2: {name: '전갈왕', ...MONSTER_SPRITES.scorpionKing, scale: 1},
  3: {name: '설빙 여왕', ...MONSTER_SPRITES.iceQueen, scale: 1},
  4: {name: '크라켄', ...MONSTER_SPRITES.kraken, scale: 1},
  5: {name: '히드라', ...MONSTER_SPRITES.hydra, scale: 1},
  6: {name: '메두사', ...MONSTER_SPRITES.medusa, scale: 1},
  7: {name: '리치 킹', ...MONSTER_SPRITES.lichKing, scale: 1},
  8: {name: '천둥 용', ...MONSTER_SPRITES.thunderDragon, scale: 1},
  9: {name: '심연의 군주', ...MONSTER_SPRITES.abyssLord, scale: 1},
  10: {name: '레드 드래곤', ...MONSTER_SPRITES.redDragon, scale: 1},
};

export function getRaidSummonSpriteSet(stage: number): RaidSummonSpriteSet | null {
  return RAID_SUMMON_SPRITES[stage] ?? null;
}

export function getRaidSummonSpriteSetById(
  summonId: string | null | undefined,
): RaidSummonSpriteSet | null {
  const definition = getSummonDefinition(summonId);
  if (!definition) {
    return null;
  }

  const spriteSet = MONSTER_SPRITES[definition.spriteKey];
  if (!spriteSet) {
    return null;
  }

  return {
    name: definition.name,
    ...spriteSet,
    scale: definition.isBoss ? 0.95 : 1.08,
  };
}
