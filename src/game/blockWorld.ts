export const BLOCK_WORLD_WIDTH = 12;
export const BLOCK_WORLD_DEPTH = 12;
export const BLOCK_WORLD_HEIGHT = 7;

export type BlockId =
  | 'air'
  | 'grass'
  | 'dirt'
  | 'stone'
  | 'wood'
  | 'leaves'
  | 'iron_ore'
  | 'plank'
  | 'workbench'
  | 'furnace'
  | 'door'
  | 'chair';

export type BlockWorldItemId =
  | Exclude<BlockId, 'air'>
  | 'iron_ingot'
  | 'iron_sword'
  | 'iron_helmet';

export type BlockWorldInventory = Partial<Record<BlockWorldItemId, number>>;

export interface BlockWorldState {
  blocks: BlockId[];
  inventory: BlockWorldInventory;
}

export interface BlockDefinition {
  id: BlockId;
  label: string;
  color: string;
  sideColor: string;
  darkColor: string;
  drop?: BlockWorldItemId;
  placeable: boolean;
}

export interface BlockWorldRecipe {
  id: string;
  label: string;
  kind: 'craft' | 'smelt';
  requires: BlockWorldInventory;
  output: BlockWorldItemId;
  count: number;
}

export const BLOCK_DEFINITIONS: Record<BlockId, BlockDefinition> = {
  air: {
    id: 'air',
    label: '빈 공간',
    color: 'transparent',
    sideColor: 'transparent',
    darkColor: 'transparent',
    placeable: false,
  },
  grass: {
    id: 'grass',
    label: '잔디 블록',
    color: '#68b84f',
    sideColor: '#7a5a32',
    darkColor: '#4a351f',
    drop: 'dirt',
    placeable: true,
  },
  dirt: {
    id: 'dirt',
    label: '흙',
    color: '#9b6b3d',
    sideColor: '#7a4c2b',
    darkColor: '#4f301d',
    drop: 'dirt',
    placeable: true,
  },
  stone: {
    id: 'stone',
    label: '돌',
    color: '#9ca3af',
    sideColor: '#6b7280',
    darkColor: '#374151',
    drop: 'stone',
    placeable: true,
  },
  wood: {
    id: 'wood',
    label: '원목',
    color: '#b7793a',
    sideColor: '#8a4f27',
    darkColor: '#5b341d',
    drop: 'wood',
    placeable: true,
  },
  leaves: {
    id: 'leaves',
    label: '잎 블록',
    color: '#4ade80',
    sideColor: '#22a85a',
    darkColor: '#166534',
    drop: 'leaves',
    placeable: true,
  },
  iron_ore: {
    id: 'iron_ore',
    label: '철광석',
    color: '#a8a29e',
    sideColor: '#78716c',
    darkColor: '#44403c',
    drop: 'iron_ore',
    placeable: true,
  },
  plank: {
    id: 'plank',
    label: '목재',
    color: '#d49a53',
    sideColor: '#b97735',
    darkColor: '#7c461f',
    drop: 'plank',
    placeable: true,
  },
  workbench: {
    id: 'workbench',
    label: '작업대',
    color: '#c0843e',
    sideColor: '#8f5527',
    darkColor: '#5f3219',
    drop: 'workbench',
    placeable: true,
  },
  furnace: {
    id: 'furnace',
    label: '화로',
    color: '#6b7280',
    sideColor: '#4b5563',
    darkColor: '#1f2937',
    drop: 'furnace',
    placeable: true,
  },
  door: {
    id: 'door',
    label: '문',
    color: '#b36a2e',
    sideColor: '#86421f',
    darkColor: '#5a2b17',
    drop: 'door',
    placeable: true,
  },
  chair: {
    id: 'chair',
    label: '의자',
    color: '#c27a3d',
    sideColor: '#8f4e27',
    darkColor: '#5d321b',
    drop: 'chair',
    placeable: true,
  },
};

export const BLOCK_WORLD_RECIPES: BlockWorldRecipe[] = [
  {
    id: 'plank_from_wood',
    label: '원목 1 -> 목재 4',
    kind: 'craft',
    requires: {wood: 1},
    output: 'plank',
    count: 4,
  },
  {
    id: 'workbench',
    label: '목재 4 -> 작업대 1',
    kind: 'craft',
    requires: {plank: 4},
    output: 'workbench',
    count: 1,
  },
  {
    id: 'furnace',
    label: '돌 8 -> 화로 1',
    kind: 'craft',
    requires: {stone: 8},
    output: 'furnace',
    count: 1,
  },
  {
    id: 'door',
    label: '목재 6 -> 문 1',
    kind: 'craft',
    requires: {plank: 6},
    output: 'door',
    count: 1,
  },
  {
    id: 'chair',
    label: '목재 4 -> 의자 1',
    kind: 'craft',
    requires: {plank: 4},
    output: 'chair',
    count: 1,
  },
  {
    id: 'iron_ingot',
    label: '철광석 1 + 원목 1 -> 철괴 1',
    kind: 'smelt',
    requires: {iron_ore: 1, wood: 1},
    output: 'iron_ingot',
    count: 1,
  },
  {
    id: 'iron_sword',
    label: '철괴 2 + 목재 1 -> 철검 1',
    kind: 'craft',
    requires: {iron_ingot: 2, plank: 1},
    output: 'iron_sword',
    count: 1,
  },
  {
    id: 'iron_helmet',
    label: '철괴 4 -> 철 투구 1',
    kind: 'craft',
    requires: {iron_ingot: 4},
    output: 'iron_helmet',
    count: 1,
  },
];

export function blockIndex(x: number, y: number, z: number) {
  return y * BLOCK_WORLD_WIDTH * BLOCK_WORLD_DEPTH + z * BLOCK_WORLD_WIDTH + x;
}

export function isInsideWorld(x: number, y: number, z: number) {
  return (
    x >= 0 &&
    x < BLOCK_WORLD_WIDTH &&
    y >= 0 &&
    y < BLOCK_WORLD_HEIGHT &&
    z >= 0 &&
    z < BLOCK_WORLD_DEPTH
  );
}

export function getBlock(blocks: BlockId[], x: number, y: number, z: number) {
  if (!isInsideWorld(x, y, z)) {
    return 'air';
  }
  return blocks[blockIndex(x, y, z)] ?? 'air';
}

export function setBlock(
  blocks: BlockId[],
  x: number,
  y: number,
  z: number,
  blockId: BlockId,
) {
  if (!isInsideWorld(x, y, z)) {
    return blocks;
  }
  const next = [...blocks];
  next[blockIndex(x, y, z)] = blockId;
  return next;
}

export function findTopBlockY(blocks: BlockId[], x: number, z: number) {
  for (let y = BLOCK_WORLD_HEIGHT - 1; y >= 0; y -= 1) {
    if (getBlock(blocks, x, y, z) !== 'air') {
      return y;
    }
  }
  return -1;
}

export function addInventoryItem(
  inventory: BlockWorldInventory,
  itemId: BlockWorldItemId,
  count: number,
) {
  return {
    ...inventory,
    [itemId]: Math.max(0, (inventory[itemId] ?? 0) + count),
  };
}

export function removeInventoryItems(
  inventory: BlockWorldInventory,
  items: BlockWorldInventory,
) {
  const next = {...inventory};
  Object.entries(items).forEach(([itemId, count]) => {
    const key = itemId as BlockWorldItemId;
    next[key] = Math.max(0, (next[key] ?? 0) - (count ?? 0));
  });
  return next;
}

export function hasInventoryItems(
  inventory: BlockWorldInventory,
  items: BlockWorldInventory,
) {
  return Object.entries(items).every(
    ([itemId, count]) =>
      (inventory[itemId as BlockWorldItemId] ?? 0) >= (count ?? 0),
  );
}

export function isPlaceableBlock(itemId: BlockWorldItemId): itemId is Exclude<BlockId, 'air'> {
  return (
    itemId in BLOCK_DEFINITIONS &&
    BLOCK_DEFINITIONS[itemId as BlockId].placeable
  );
}

export function createInitialBlockWorld(): BlockWorldState {
  let blocks = Array<BlockId>(
    BLOCK_WORLD_WIDTH * BLOCK_WORLD_DEPTH * BLOCK_WORLD_HEIGHT,
  ).fill('air');

  for (let x = 0; x < BLOCK_WORLD_WIDTH; x += 1) {
    for (let z = 0; z < BLOCK_WORLD_DEPTH; z += 1) {
      blocks = setBlock(blocks, x, 0, z, 'stone');
      blocks = setBlock(blocks, x, 1, z, 'dirt');
      blocks = setBlock(blocks, x, 2, z, 'grass');

      if ((x * 17 + z * 11) % 19 === 0) {
        blocks = setBlock(blocks, x, 1, z, 'iron_ore');
      }
      if ((x - 6) * (x - 6) + (z - 5) * (z - 5) < 8) {
        blocks = setBlock(blocks, x, 3, z, 'stone');
      }
    }
  }

  const trees = [
    {x: 2, z: 2},
    {x: 9, z: 3},
    {x: 4, z: 9},
  ];

  trees.forEach(tree => {
    blocks = setBlock(blocks, tree.x, 3, tree.z, 'wood');
    blocks = setBlock(blocks, tree.x, 4, tree.z, 'wood');
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        blocks = setBlock(blocks, tree.x + dx, 5, tree.z + dz, 'leaves');
      }
    }
    blocks = setBlock(blocks, tree.x, 6, tree.z, 'leaves');
  });

  return {
    blocks,
    inventory: {
      dirt: 8,
      plank: 8,
    },
  };
}

export function sanitizeBlockWorldState(value: unknown): BlockWorldState {
  const fallback = createInitialBlockWorld();
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const raw = value as Partial<BlockWorldState>;
  const expectedLength =
    BLOCK_WORLD_WIDTH * BLOCK_WORLD_DEPTH * BLOCK_WORLD_HEIGHT;
  const blocks =
    Array.isArray(raw.blocks) && raw.blocks.length === expectedLength
      ? raw.blocks.map(blockId =>
          typeof blockId === 'string' && blockId in BLOCK_DEFINITIONS
            ? (blockId as BlockId)
            : 'air',
        )
      : fallback.blocks;
  const inventory: BlockWorldInventory = {};

  Object.entries(raw.inventory ?? {}).forEach(([itemId, count]) => {
    const key = itemId as BlockWorldItemId;
    if (
      typeof count === 'number' &&
      Number.isFinite(count) &&
      count > 0 &&
      (key === 'iron_ingot' ||
        key === 'iron_sword' ||
        key === 'iron_helmet' ||
        isPlaceableBlock(key))
    ) {
      inventory[key] = Math.floor(count);
    }
  });

  return {blocks, inventory};
}
