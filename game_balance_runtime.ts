export const BOARD_ROWS = 10;
export const BOARD_COLS = 8;

export const MAX_HEARTS = 10;
export const HEART_REGEN_MS = 5 * 60 * 1000;

export const COMBO_WINDOW_MS = 10 * 1000;
export const FEVER_LINE_REQUIREMENT = 20;
export const FEVER_DURATION_MS = 10 * 1000;
export const FEVER_DAMAGE_MULTIPLIER = 2;

export const ITEM_CELL_SPAWN_RATE = 0.02;
export const GEM_CELL_SPAWN_RATE = 0.015;

export const DEFAULT_ITEM_CAP = 2;
export const DEFAULT_ITEM_IDS = ['hammer', 'bomb', 'refresh'] as const;

export const LINE_CLEAR_DAMAGE_BONUS_PER_LINE = 0.15;
export const COMBO_DAMAGE_STEP = 0.1;
export const ENDLESS_SCORE_CONVERSION_RATE = 1;

export const ENDLESS_REWARD_THRESHOLDS = [
  {scoreTarget: 1000, goldReward: 50},
  {scoreTarget: 3000, goldReward: 80},
  {scoreTarget: 6000, goldReward: 120},
  {scoreTarget: 10000, goldReward: 180},
  {scoreTarget: 15000, goldReward: 280},
  {scoreTarget: 20000, goldReward: 380},
  {scoreTarget: 25000, goldReward: 480},
  {scoreTarget: 30000, goldReward: 580},
  {scoreTarget: 35000, goldReward: 680},
  {scoreTarget: 40000, goldReward: 780},
];

export const SHOP_ITEM_PRICES = [
  {itemId: 'hammer', goldPrice: 800, diamondPrice: 4},
  {itemId: 'bomb', goldPrice: 1200, diamondPrice: 6},
  {itemId: 'refresh', goldPrice: 1000, diamondPrice: 5},
];

export const NORMAL_RAID_DIAMOND_REWARDS = [
  {stage: 1, firstClearDiamondReward: 50, repeatDiamondReward: 1},
  {stage: 2, firstClearDiamondReward: 70, repeatDiamondReward: 2},
  {stage: 3, firstClearDiamondReward: 110, repeatDiamondReward: 3},
  {stage: 4, firstClearDiamondReward: 180, repeatDiamondReward: 4},
  {stage: 5, firstClearDiamondReward: 280, repeatDiamondReward: 5},
  {stage: 6, firstClearDiamondReward: 400, repeatDiamondReward: 6},
  {stage: 7, firstClearDiamondReward: 520, repeatDiamondReward: 7},
  {stage: 8, firstClearDiamondReward: 700, repeatDiamondReward: 8},
  {stage: 9, firstClearDiamondReward: 1500, repeatDiamondReward: 9},
  {stage: 10, firstClearDiamondReward: 3000, repeatDiamondReward: 15},
];

export function getComboMultiplier(comboCount: number): number {
  if (comboCount <= 1) {
    return 1;
  }

  return 1 + (comboCount - 1) * COMBO_DAMAGE_STEP;
}

export function getClearBonusMultiplier(clearedLinesThisAction: number): number {
  return 1 + clearedLinesThisAction * LINE_CLEAR_DAMAGE_BONUS_PER_LINE;
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
