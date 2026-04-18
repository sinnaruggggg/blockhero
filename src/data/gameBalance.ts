import {
  ACTIVE_ITEM_KEYS,
  GEM_BLOCK_SPAWN_RATE,
  ITEM_BLOCK_SPAWN_RATE,
  ITEM_DEFINITIONS,
  ITEM_INVENTORY_CAP,
} from '../constants/itemCatalog';
import {
  EndlessRewardThreshold,
  ItemPriceDefinition,
} from '../types/gameDesign';

export const BOARD_ROWS = 8;
export const BOARD_COLS = 8;

export const MAX_HEARTS = 20;
export const HEART_REGEN_MS = 5 * 60 * 1000;

export const COMBO_WINDOW_MS = 10 * 1000;
export const FEVER_LINE_REQUIREMENT = 20;
export const FEVER_DURATION_MS = 10 * 1000;
export const FEVER_DAMAGE_MULTIPLIER = 2;

export const ITEM_CELL_SPAWN_RATE = ITEM_BLOCK_SPAWN_RATE;
export const GEM_CELL_SPAWN_RATE = GEM_BLOCK_SPAWN_RATE;

export const DEFAULT_ITEM_CAP = ITEM_INVENTORY_CAP;
export const DEFAULT_ITEM_IDS = ACTIVE_ITEM_KEYS;

export const LINE_CLEAR_DAMAGE_BONUS_PER_LINE = 0.15;

export const ENDLESS_SCORE_CONVERSION_RATE = 1;

export const ENDLESS_REWARD_THRESHOLDS: EndlessRewardThreshold[] = [
  {scoreTarget: 1000, goldReward: 10},
  {scoreTarget: 3000, goldReward: 20},
  {scoreTarget: 6000, goldReward: 30},
  {scoreTarget: 10000, goldReward: 50},
  {scoreTarget: 15000, goldReward: 70},
  {scoreTarget: 21000, goldReward: 100},
  {scoreTarget: 28000, goldReward: 130},
  {scoreTarget: 36000, goldReward: 170},
  {scoreTarget: 45000, goldReward: 220},
  {scoreTarget: 55000, goldReward: 280},
  {scoreTarget: 70000, goldReward: 360},
  {scoreTarget: 90000, goldReward: 460},
  {scoreTarget: 120000, goldReward: 600},
  {scoreTarget: 160000, goldReward: 800},
  {scoreTarget: 200000, goldReward: 1000},
];

export const SHOP_ITEM_PRICES: ItemPriceDefinition[] = [
  ...ACTIVE_ITEM_KEYS.map(itemId => ({
    itemId,
    goldPrice: ITEM_DEFINITIONS[itemId].goldPrice,
    diamondPrice: ITEM_DEFINITIONS[itemId].diamondPrice,
  })),
];

export const NORMAL_RAID_DIAMOND_REWARDS = [
  {stage: 1, firstClearDiamondReward: 15, repeatDiamondReward: 1},
  {stage: 2, firstClearDiamondReward: 20, repeatDiamondReward: 1},
  {stage: 3, firstClearDiamondReward: 30, repeatDiamondReward: 2},
  {stage: 4, firstClearDiamondReward: 45, repeatDiamondReward: 2},
  {stage: 5, firstClearDiamondReward: 60, repeatDiamondReward: 3},
  {stage: 6, firstClearDiamondReward: 80, repeatDiamondReward: 4},
  {stage: 7, firstClearDiamondReward: 100, repeatDiamondReward: 5},
  {stage: 8, firstClearDiamondReward: 130, repeatDiamondReward: 6},
  {stage: 9, firstClearDiamondReward: 170, repeatDiamondReward: 8},
  {stage: 10, firstClearDiamondReward: 220, repeatDiamondReward: 10},
];

export function getComboMultiplier(comboCount: number): number {
  if (comboCount <= 0) {
    return 1;
  }

  let multiplier = 1;
  for (let combo = 1; combo <= comboCount; combo += 1) {
    const stepMultiplier = combo <= 10 ? 1 + combo * 0.1 : 2;
    multiplier *= stepMultiplier;
  }
  return multiplier;
}

export function formatComboMultiplier(comboCount: number): string {
  return `x${getComboMultiplier(comboCount).toFixed(2)}`;
}

export function getClearBonusMultiplier(clearedLinesThisAction: number): number {
  return 1 + Math.min(clearedLinesThisAction, 4) * LINE_CLEAR_DAMAGE_BONUS_PER_LINE;
}

export function getEndlessObstacleTier(score: number): number {
  if (score < 5000) {
    return 0;
  }

  if (score < 10000) {
    return 2;
  }

  if (score < 20000) {
    return 3;
  }

  if (score < 35000) {
    return 4;
  }

  return 5;
}

export function getBossRaidMaxHp(stage: number): number {
  return 100000 + (stage - 1) * 100000;
}
