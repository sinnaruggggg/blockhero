import AsyncStorage from '@react-native-async-storage/async-storage';

export type BlockWorldBagItem = {
  id: string;
  typeId: string;
  label: string;
  quantity: number;
  acquiredAt: string;
};

export type BlockWorldInventory = {
  rows: number;
  items: BlockWorldBagItem[];
};

export const BLOCK_WORLD_BAG_COLUMNS = 6;
export const BLOCK_WORLD_BAG_DEFAULT_ROWS = 2;
export const BLOCK_WORLD_BAG_BASE_EXPAND_COST = 200;

const STORAGE_KEY = 'hiddenBlockWorldInventory:v1';
const MAX_ROWS = 20;

function createEmptyInventory(): BlockWorldInventory {
  return {
    rows: BLOCK_WORLD_BAG_DEFAULT_ROWS,
    items: [],
  };
}

function sanitizeItem(value: any): BlockWorldBagItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const id = typeof value.id === 'string' && value.id.trim() ? value.id : null;
  const typeId =
    typeof value.typeId === 'string' && value.typeId.trim() ? value.typeId : null;
  const label =
    typeof value.label === 'string' && value.label.trim() ? value.label : '알 수 없는 물건';

  if (!id || !typeId) {
    return null;
  }

  return {
    id,
    typeId,
    label,
    quantity:
      typeof value.quantity === 'number' && Number.isFinite(value.quantity)
        ? Math.max(1, Math.floor(value.quantity))
        : 1,
    acquiredAt:
      typeof value.acquiredAt === 'string' && value.acquiredAt.trim()
        ? value.acquiredAt
        : new Date().toISOString(),
  };
}

function sanitizeInventory(value: any): BlockWorldInventory {
  if (!value || typeof value !== 'object') {
    return createEmptyInventory();
  }

  const rows =
    typeof value.rows === 'number' && Number.isFinite(value.rows)
      ? Math.min(MAX_ROWS, Math.max(BLOCK_WORLD_BAG_DEFAULT_ROWS, Math.floor(value.rows)))
      : BLOCK_WORLD_BAG_DEFAULT_ROWS;
  const items = Array.isArray(value.items)
    ? value.items
        .map((item: unknown) => sanitizeItem(item))
        .filter((item: BlockWorldBagItem | null): item is BlockWorldBagItem => item !== null)
    : [];

  return {
    rows,
    items: items.slice(0, getBlockWorldBagSlotCount(rows)),
  };
}

async function saveInventory(inventory: BlockWorldInventory) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeInventory(inventory)));
}

export function getBlockWorldBagSlotCount(rows: number) {
  return rows * BLOCK_WORLD_BAG_COLUMNS;
}

export function getBlockWorldBagExpandCost(rows: number) {
  const expansions = Math.max(0, rows - BLOCK_WORLD_BAG_DEFAULT_ROWS);
  return BLOCK_WORLD_BAG_BASE_EXPAND_COST * 2 ** expansions;
}

export async function loadBlockWorldInventory(): Promise<BlockWorldInventory> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyInventory();
    }
    return sanitizeInventory(JSON.parse(raw));
  } catch {
    return createEmptyInventory();
  }
}

export async function expandBlockWorldInventory() {
  const inventory = await loadBlockWorldInventory();
  const next = sanitizeInventory({
    ...inventory,
    rows: Math.min(MAX_ROWS, inventory.rows + 1),
  });
  await saveInventory(next);
  return next;
}
