export type LegacyItemKey = 'hammer' | 'bomb';
export type UtilityItemKey = 'refresh';
export type HealPotionItemKey = 'heal_small' | 'heal_medium' | 'heal_large';
export type PowerPotionItemKey =
  | 'power_small'
  | 'power_medium'
  | 'power_large';
export type ActiveItemKey =
  | UtilityItemKey
  | HealPotionItemKey
  | PowerPotionItemKey;
export type BattleInventoryItemKey = ActiveItemKey | LegacyItemKey | 'addTurns';

export type GameModeRewardItemKey = 'level' | 'endless' | 'battle' | 'raid';

export interface StartingItemLoadoutSlot {
  itemKey: ActiveItemKey | null;
  count: number;
}

export interface ItemDefinition {
  key: ActiveItemKey;
  label: string;
  shortLabel: string;
  emoji: string;
  badgeIcon: string;
  badgeBackgroundColor: string;
  badgeBorderColor: string;
  badgeIconColor: string;
  barBackgroundColor: string;
  countColor: string;
  goldPrice: number;
  diamondPrice: number;
  sizeScale: number;
  type: 'refresh' | 'heal' | 'power';
  healPercent?: number;
  powerMultiplier?: number;
}

export const GEM_BLOCK_SPAWN_RATE = 0.0075;
export const ITEM_BLOCK_SPAWN_RATE = 0.01;
export const ITEM_INVENTORY_CAP = 99;
export const STARTING_ITEM_SLOT_COUNT = 3;
export const STARTING_ITEM_MAX_COUNT = 3;

export const ACTIVE_ITEM_KEYS: ActiveItemKey[] = [
  'refresh',
  'heal_small',
  'heal_medium',
  'heal_large',
  'power_small',
  'power_medium',
  'power_large',
];

export const LEVEL_LOADOUT_ITEM_KEYS: ActiveItemKey[] = [...ACTIVE_ITEM_KEYS];
export const ENDLESS_LOADOUT_ITEM_KEYS: ActiveItemKey[] = [
  'refresh',
  'power_small',
  'power_medium',
  'power_large',
];

export const LEVEL_ITEM_DROP_KEYS: ActiveItemKey[] = [...ACTIVE_ITEM_KEYS];
export const ENDLESS_ITEM_DROP_KEYS: ActiveItemKey[] = [...ACTIVE_ITEM_KEYS];

export const ITEM_DEFINITIONS: Record<ActiveItemKey, ItemDefinition> = {
  refresh: {
    key: 'refresh',
    label: '새로고침',
    shortLabel: '리셋',
    emoji: '\u21BB',
    badgeIcon: '\u21BB',
    badgeBackgroundColor: '#22c55e',
    badgeBorderColor: '#dcfce7',
    badgeIconColor: '#052e16',
    barBackgroundColor: 'rgba(34, 197, 94, 0.18)',
    countColor: '#dcfce7',
    goldPrice: 80,
    diamondPrice: 3,
    sizeScale: 0.94,
    type: 'refresh',
  },
  heal_small: {
    key: 'heal_small',
    label: '힐링 포션 소',
    shortLabel: '힐 소',
    emoji: '\u2665',
    badgeIcon: '\u2665',
    badgeBackgroundColor: '#ef4444',
    badgeBorderColor: '#fee2e2',
    badgeIconColor: '#ffffff',
    barBackgroundColor: 'rgba(239, 68, 68, 0.18)',
    countColor: '#fee2e2',
    goldPrice: 100,
    diamondPrice: 2,
    sizeScale: 0.7,
    type: 'heal',
    healPercent: 0.3,
  },
  heal_medium: {
    key: 'heal_medium',
    label: '힐링 포션 중',
    shortLabel: '힐 중',
    emoji: '\u2665',
    badgeIcon: '\u2665',
    badgeBackgroundColor: '#f97316',
    badgeBorderColor: '#ffedd5',
    badgeIconColor: '#ffffff',
    barBackgroundColor: 'rgba(249, 115, 22, 0.18)',
    countColor: '#ffedd5',
    goldPrice: 250,
    diamondPrice: 3,
    sizeScale: 0.86,
    type: 'heal',
    healPercent: 0.6,
  },
  heal_large: {
    key: 'heal_large',
    label: '힐링 포션 대',
    shortLabel: '힐 대',
    emoji: '\u2665',
    badgeIcon: '\u2665',
    badgeBackgroundColor: '#ec4899',
    badgeBorderColor: '#fce7f3',
    badgeIconColor: '#ffffff',
    barBackgroundColor: 'rgba(236, 72, 153, 0.18)',
    countColor: '#fce7f3',
    goldPrice: 400,
    diamondPrice: 7,
    sizeScale: 1,
    type: 'heal',
    healPercent: 1,
  },
  power_small: {
    key: 'power_small',
    label: '파워업 포션 소',
    shortLabel: '파워 소',
    emoji: '\u26A1',
    badgeIcon: '\u26A1',
    badgeBackgroundColor: '#3b82f6',
    badgeBorderColor: '#dbeafe',
    badgeIconColor: '#ffffff',
    barBackgroundColor: 'rgba(59, 130, 246, 0.18)',
    countColor: '#dbeafe',
    goldPrice: 100,
    diamondPrice: 2,
    sizeScale: 0.7,
    type: 'power',
    powerMultiplier: 1.3,
  },
  power_medium: {
    key: 'power_medium',
    label: '파워업 포션 중',
    shortLabel: '파워 중',
    emoji: '\u26A1',
    badgeIcon: '\u26A1',
    badgeBackgroundColor: '#6366f1',
    badgeBorderColor: '#e0e7ff',
    badgeIconColor: '#ffffff',
    barBackgroundColor: 'rgba(99, 102, 241, 0.18)',
    countColor: '#e0e7ff',
    goldPrice: 250,
    diamondPrice: 3,
    sizeScale: 0.86,
    type: 'power',
    powerMultiplier: 1.6,
  },
  power_large: {
    key: 'power_large',
    label: '파워업 포션 대',
    shortLabel: '파워 대',
    emoji: '\u26A1',
    badgeIcon: '\u26A1',
    badgeBackgroundColor: '#8b5cf6',
    badgeBorderColor: '#ede9fe',
    badgeIconColor: '#ffffff',
    barBackgroundColor: 'rgba(139, 92, 246, 0.18)',
    countColor: '#ede9fe',
    goldPrice: 400,
    diamondPrice: 7,
    sizeScale: 1,
    type: 'power',
    powerMultiplier: 2,
  },
};

export function isActiveItemKey(value: string | null | undefined): value is ActiveItemKey {
  return value !== undefined && value !== null && value in ITEM_DEFINITIONS;
}

export function getItemDefinition(itemKey: string | null | undefined): ItemDefinition | null {
  if (!isActiveItemKey(itemKey)) {
    return null;
  }

  return ITEM_DEFINITIONS[itemKey];
}

export function createDefaultStartingItemLoadout(): StartingItemLoadoutSlot[] {
  return Array.from({ length: STARTING_ITEM_SLOT_COUNT }, () => ({
    itemKey: null,
    count: 0,
  }));
}

export function normalizeStartingItemLoadout(
  value: unknown,
): StartingItemLoadoutSlot[] {
  const normalized = createDefaultStartingItemLoadout();
  const rawSlots = Array.isArray(value) ? value : [];

  for (let index = 0; index < STARTING_ITEM_SLOT_COUNT; index += 1) {
    const rawSlot = rawSlots[index] as
      | Partial<StartingItemLoadoutSlot>
      | undefined;
    if (!rawSlot || !isActiveItemKey(rawSlot.itemKey)) {
      continue;
    }

    const safeCount = Math.max(
      1,
      Math.min(
        STARTING_ITEM_MAX_COUNT,
        Math.round(Number(rawSlot.count) || 0),
      ),
    );

    normalized[index] = {
      itemKey: rawSlot.itemKey,
      count: safeCount,
    };
  }

  return normalized;
}

export function getAllowedLoadoutItemKeys(
  mode: 'level' | 'endless',
): ActiveItemKey[] {
  return mode === 'endless'
    ? ENDLESS_LOADOUT_ITEM_KEYS
    : LEVEL_LOADOUT_ITEM_KEYS;
}

export interface ResolvedStartingItemSlot extends StartingItemLoadoutSlot {
  slotIndex: number;
  effectiveCount: number;
}

export function resolveStartingItemLoadout(
  items: Record<string, number>,
  loadout: StartingItemLoadoutSlot[] | undefined,
  allowedItemKeys: readonly ActiveItemKey[],
): ResolvedStartingItemSlot[] {
  const normalized = normalizeStartingItemLoadout(loadout);
  const remainingByItem: Record<string, number> = {};

  normalized.forEach(slot => {
    if (!slot.itemKey || remainingByItem[slot.itemKey] !== undefined) {
      return;
    }

    remainingByItem[slot.itemKey] = Math.max(0, items[slot.itemKey] ?? 0);
  });

  return normalized.map((slot, slotIndex) => {
    if (!slot.itemKey || !allowedItemKeys.includes(slot.itemKey)) {
      return {
        slotIndex,
        itemKey: null,
        count: 0,
        effectiveCount: 0,
      };
    }

    const remainingForSlot = remainingByItem[slot.itemKey] ?? 0;
    const effectiveCount = Math.max(0, Math.min(slot.count, remainingForSlot));
    remainingByItem[slot.itemKey] = Math.max(
      0,
      remainingForSlot - effectiveCount,
    );

    return {
      slotIndex,
      itemKey: slot.itemKey,
      count: slot.count,
      effectiveCount,
    };
  });
}

export function getItemDropPool(
  mode: GameModeRewardItemKey | undefined,
): ActiveItemKey[] {
  if (mode === 'endless') {
    return ENDLESS_ITEM_DROP_KEYS;
  }

  if (mode === 'level') {
    return LEVEL_ITEM_DROP_KEYS;
  }

  return [];
}
