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
  label?: string;
  description?: string;
}

export type SpecialPieceUnlockKey =
  | 'piece_square3'
  | 'piece_rect'
  | 'piece_line5'
  | 'piece_diag'
  | 'piece_single'
  | 'piece_num2';

export const SPECIAL_PIECE_UNLOCK_KEYS: SpecialPieceUnlockKey[] = [
  'piece_diag',
  'piece_rect',
  'piece_single',
  'piece_line5',
  'piece_square3',
  'piece_num2',
];

export const SPECIAL_PIECE_SHAPE_MAP: Record<SpecialPieceUnlockKey, number[]> =
  {
    piece_square3: [20],
    piece_rect: [21, 22],
    piece_line5: [23, 24],
    piece_num2: [25],
    piece_diag: [26, 27],
    piece_single: [0],
  };

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
    label: '망치',
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
    label: '폭탄',
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
    label: '새로고침',
  },
  {
    id: 'hearts',
    nameKey: 'shop.heartRefill',
    diamondPrice: 5,
    goldPrice: 60,
    type: 'hearts',
    emoji: '❤️',
    label: '하트 충전',
  },
];

export const SPECIAL_PIECE_ITEMS: ShopItem[] = [
  {
    id: 'piece_diag',
    nameKey: 'item.pieceDiag',
    diamondPrice: 200,
    goldPrice: 0,
    type: 'piece',
    itemKey: 'piece_diag',
    emoji: '╱',
    pieceIndices: SPECIAL_PIECE_SHAPE_MAP.piece_diag,
    label: '대각선 블록',
    description: '구매 후 영구 해금. 이후 블록 생성 시 함께 등장합니다.',
  },
  {
    id: 'piece_rect',
    nameKey: 'item.pieceRect',
    diamondPrice: 300,
    goldPrice: 0,
    type: 'piece',
    itemKey: 'piece_rect',
    emoji: '▭',
    pieceIndices: SPECIAL_PIECE_SHAPE_MAP.piece_rect,
    label: '3×2 블록',
    description: '구매 후 영구 해금. 이후 블록 생성 시 함께 등장합니다.',
  },
  {
    id: 'piece_single',
    nameKey: 'item.pieceSingle',
    diamondPrice: 500,
    goldPrice: 0,
    type: 'piece',
    itemKey: 'piece_single',
    emoji: '1',
    pieceIndices: SPECIAL_PIECE_SHAPE_MAP.piece_single,
    label: '한 칸 블록',
    description: '기본 생성 풀에서는 나오지 않으며 구매 후에만 등장합니다.',
  },
  {
    id: 'piece_line5',
    nameKey: 'item.pieceLine5',
    diamondPrice: 600,
    goldPrice: 0,
    type: 'piece',
    itemKey: 'piece_line5',
    emoji: '━',
    pieceIndices: SPECIAL_PIECE_SHAPE_MAP.piece_line5,
    label: '5칸 라인 블록',
    description: '구매 후 영구 해금. 이후 블록 생성 시 함께 등장합니다.',
  },
  {
    id: 'piece_square3',
    nameKey: 'item.pieceSquare3',
    diamondPrice: 600,
    goldPrice: 0,
    type: 'piece',
    itemKey: 'piece_square3',
    emoji: '▣',
    pieceIndices: SPECIAL_PIECE_SHAPE_MAP.piece_square3,
    label: '3×3 블록',
    description: '구매 후 영구 해금. 이후 블록 생성 시 함께 등장합니다.',
  },
];

export const RAID_SKILL_UPGRADE_COSTS = [30, 60, 100, 150, 200];

export function getSkinPrice(_bossStage: number): number {
  return 0;
}

export function getSpecialPieceShapeIndices(
  unlockedKeys: readonly string[] | undefined,
): number[] {
  if (!Array.isArray(unlockedKeys) || unlockedKeys.length === 0) {
    return [];
  }

  const next = new Set<number>();
  for (const key of unlockedKeys) {
    const shapeIndices =
      SPECIAL_PIECE_SHAPE_MAP[key as SpecialPieceUnlockKey] ?? [];
    shapeIndices.forEach(shapeIndex => next.add(shapeIndex));
  }

  return Array.from(next.values());
}
