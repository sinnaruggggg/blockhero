export interface TitleDef {
  id: string;
  nameKey: string;
  condition: TitleCondition;
}

export type TitleCondition =
  | {type: 'defeat_boss'; bossStage: number}
  | {type: 'defeat_all'}
  | {type: 'mvp_any'}
  | {type: 'damage_threshold'; amount: number};

export const TITLES: TitleDef[] = [
  {id: 'slime_hunter', nameKey: 'title.slimeHunter', condition: {type: 'defeat_boss', bossStage: 1}},
  {id: 'sand_breaker', nameKey: 'title.shroomCrusher', condition: {type: 'defeat_boss', bossStage: 2}},
  {id: 'frost_witch', nameKey: 'title.vineCutter', condition: {type: 'defeat_boss', bossStage: 3}},
  {id: 'kraken_hunter', nameKey: 'title.krakenHunter', condition: {type: 'defeat_boss', bossStage: 4}},
  {id: 'hydra_hunter', nameKey: 'title.waterTamer', condition: {type: 'defeat_boss', bossStage: 5}},
  {id: 'medusa_breaker', nameKey: 'title.crystalBreaker', condition: {type: 'defeat_boss', bossStage: 6}},
  {id: 'lich_king', nameKey: 'title.stormRider', condition: {type: 'defeat_boss', bossStage: 7}},
  {id: 'storm_rider', nameKey: 'title.crownTaker', condition: {type: 'defeat_boss', bossStage: 8}},
  {id: 'abyss_runner', nameKey: 'title.flameWalker', condition: {type: 'defeat_boss', bossStage: 9}},
  {id: 'dragon_slayer', nameKey: 'title.dragonSlayer', condition: {type: 'defeat_boss', bossStage: 10}},
  {id: 'cubrix_overlord', nameKey: 'title.cubrixOverlord', condition: {type: 'defeat_all'}},
  {id: 'mvp', nameKey: 'title.mvp', condition: {type: 'mvp_any'}},
  {id: 'damage_king', nameKey: 'title.damageKing', condition: {type: 'damage_threshold', amount: 10000}},
  {id: 'damage_god', nameKey: 'title.damageGod', condition: {type: 'damage_threshold', amount: 50000}},
];

export function checkNewTitles(
  existingTitles: string[],
  defeatedBosses: number[],
  wasMvp: boolean,
  totalDamage: number,
): string[] {
  const newTitles: string[] = [];

  for (const title of TITLES) {
    if (existingTitles.includes(title.id)) {
      continue;
    }

    const condition = title.condition;
    switch (condition.type) {
      case 'defeat_boss':
        if (defeatedBosses.includes(condition.bossStage)) {
          newTitles.push(title.id);
        }
        break;
      case 'defeat_all':
        if (defeatedBosses.length >= 10) {
          newTitles.push(title.id);
        }
        break;
      case 'mvp_any':
        if (wasMvp) {
          newTitles.push(title.id);
        }
        break;
      case 'damage_threshold':
        if (totalDamage >= condition.amount) {
          newTitles.push(title.id);
        }
        break;
    }
  }

  return newTitles;
}
