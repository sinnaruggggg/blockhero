export interface ShopItem {
  id: string;
  nameKey: string;
  diamondPrice: number;
  goldPrice: number;
  type: 'item' | 'hearts' | 'piece';
  itemKey?: string;
  itemCount?: number;
  emoji: string;
  pieceIndices?: number[];
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'hammer',
    nameKey: 'item.hammer',
    diamondPrice: 5,
    goldPrice: 120,
    type: 'item',
    itemKey: 'hammer',
    itemCount: 1,
    emoji: '🔨',
  },
  {
    id: 'bomb',
    nameKey: 'item.bomb',
    diamondPrice: 6,
    goldPrice: 160,
    type: 'item',
    itemKey: 'bomb',
    itemCount: 1,
    emoji: '💣',
  },
  {
    id: 'refresh',
    nameKey: 'item.refresh',
    diamondPrice: 3,
    goldPrice: 80,
    type: 'item',
    itemKey: 'refresh',
    itemCount: 1,
    emoji: '🔄',
  },
  {
    id: 'hearts',
    nameKey: 'shop.heartRefill',
    diamondPrice: 5,
    goldPrice: 60,
    type: 'hearts',
    emoji: '❤️',
  },
];

export const SPECIAL_PIECE_ITEMS: ShopItem[] = [
  {
    id: 'piece_square3',
    nameKey: 'item.pieceSquare3',
    diamondPrice: 20,
    goldPrice: 600,
    type: 'piece',
    itemKey: 'piece_square3',
    itemCount: 1,
    emoji: '🟪',
    pieceIndices: [20],
  },
  {
    id: 'piece_rect',
    nameKey: 'item.pieceRect',
    diamondPrice: 20,
    goldPrice: 600,
    type: 'piece',
    itemKey: 'piece_rect',
    itemCount: 1,
    emoji: '▭',
    pieceIndices: [21, 22],
  },
  {
    id: 'piece_line5',
    nameKey: 'item.pieceLine5',
    diamondPrice: 20,
    goldPrice: 600,
    type: 'piece',
    itemKey: 'piece_line5',
    itemCount: 1,
    emoji: '📏',
    pieceIndices: [23, 24],
  },
  {
    id: 'piece_num2',
    nameKey: 'item.pieceNum2',
    diamondPrice: 20,
    goldPrice: 600,
    type: 'piece',
    itemKey: 'piece_num2',
    itemCount: 1,
    emoji: '2',
    pieceIndices: [25],
  },
  {
    id: 'piece_diag',
    nameKey: 'item.pieceDiag',
    diamondPrice: 20,
    goldPrice: 600,
    type: 'piece',
    itemKey: 'piece_diag',
    itemCount: 1,
    emoji: '⟍',
    pieceIndices: [26, 27],
  },
];

export const RAID_SKILL_UPGRADE_COSTS = [30, 60, 100, 150, 200];

export function getSkinPrice(_bossStage: number): number {
  return 0;
}
