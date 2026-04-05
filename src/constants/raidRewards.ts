export interface TierReward {
  tier: number;
  goldRange: [number, number];
  diamondsRange: [number, number];
  itemCountRange: [number, number];
}

export const TIER_REWARDS: TierReward[] = [
  {tier: 1, goldRange: [80, 120], diamondsRange: [3, 5], itemCountRange: [1, 1]},
  {tier: 2, goldRange: [150, 220], diamondsRange: [5, 8], itemCountRange: [1, 1]},
  {tier: 3, goldRange: [260, 380], diamondsRange: [8, 12], itemCountRange: [1, 2]},
  {tier: 4, goldRange: [420, 620], diamondsRange: [12, 18], itemCountRange: [2, 2]},
  {tier: 5, goldRange: [650, 950], diamondsRange: [18, 28], itemCountRange: [2, 3]},
];

export const DAMAGE_RANK_MULTIPLIERS: Record<number, number> = {
  1: 1.5,
  2: 1.25,
  3: 1.1,
};

export const DEFAULT_RANK_MULTIPLIER = 1;
export const ITEM_KEYS = ['hammer', 'bomb', 'refresh'] as const;

function randRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface RewardResult {
  gold: number;
  diamonds: number;
  items: Record<string, number>;
  rankMultiplier: number;
  rank: number;
  skinUnlocked: number | null;
  titlesUnlocked: string[];
}

export function calculateRewards(
  bossStage: number,
  myRank: number,
  firstDefeat: boolean,
): RewardResult {
  const tier = Math.max(1, Math.ceil(bossStage / 2));
  const tierReward = TIER_REWARDS.find(entry => entry.tier === tier) ?? TIER_REWARDS[0];
  const rankMult = DAMAGE_RANK_MULTIPLIERS[myRank] ?? DEFAULT_RANK_MULTIPLIER;
  const itemCount = randRange(...tierReward.itemCountRange);
  const items: Record<string, number> = {};

  for (let index = 0; index < itemCount; index += 1) {
    const key = ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)];
    items[key] = (items[key] || 0) + 1;
  }

  return {
    gold: Math.floor(randRange(...tierReward.goldRange) * rankMult),
    diamonds: Math.floor(randRange(...tierReward.diamondsRange) * rankMult),
    items,
    rankMultiplier: rankMult,
    rank: myRank,
    skinUnlocked: firstDefeat ? bossStage : null,
    titlesUnlocked: [],
  };
}
