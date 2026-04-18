import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  ACTIVE_ITEM_KEYS,
  getItemDefinition,
  resolveStartingItemLoadout,
  type ActiveItemKey,
  type StartingItemLoadoutSlot,
} from '../constants/itemCatalog';

interface ItemBarProps {
  items: { [key: string]: number };
  selectedItem: string | null;
  onSelectItem: (item: string, slotIndex?: number) => void;
  showAddTurns?: boolean;
  loadout?: StartingItemLoadoutSlot[];
  allowedItemKeys?: readonly ActiveItemKey[];
}

const FALLBACK_ITEM_KEYS: ActiveItemKey[] = [...ACTIVE_ITEM_KEYS];

export default function ItemBar({
  items,
  selectedItem,
  onSelectItem,
  loadout,
  allowedItemKeys = ACTIVE_ITEM_KEYS,
}: ItemBarProps) {
  if (loadout) {
    const resolvedSlots = resolveStartingItemLoadout(
      items,
      loadout,
      allowedItemKeys,
    );

    return (
      <View style={styles.container}>
        {resolvedSlots.map(slot => {
          const item = slot.itemKey ? getItemDefinition(slot.itemKey) : null;
          const selected = selectedItem === slot.itemKey;
          const disabled = !slot.itemKey || slot.effectiveCount <= 0;

          return (
            <TouchableOpacity
              key={`slot-${slot.slotIndex}`}
              style={[
                styles.loadoutSlot,
                selected && styles.selectedItem,
                item
                  ? { backgroundColor: item.barBackgroundColor }
                  : styles.emptyLoadoutSlot,
                disabled && styles.disabledSlot,
              ]}
              onPress={() => {
                if (slot.itemKey && slot.effectiveCount > 0) {
                  onSelectItem(slot.itemKey, slot.slotIndex);
                }
              }}
              activeOpacity={disabled ? 1 : 0.7}>
              <Text
                style={[
                  styles.emoji,
                  item ? { fontSize: Math.round(20 * item.sizeScale) } : null,
                ]}>
                {item?.emoji ?? '+'}
              </Text>
              <Text style={styles.slotLabel}>
                {item?.shortLabel ?? `빈 슬롯 ${slot.slotIndex + 1}`}
              </Text>
              <Text
                style={[
                  styles.count,
                  item ? { color: item.countColor } : styles.emptyCount,
                ]}>
                {slot.itemKey ? slot.effectiveCount : '-'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  const visibleItems = FALLBACK_ITEM_KEYS.map(itemKey =>
    getItemDefinition(itemKey),
  ).filter((item): item is NonNullable<ReturnType<typeof getItemDefinition>> => {
    return item !== null;
  });

  return (
    <View style={styles.container}>
      {visibleItems.map(item => {
        const count = items[item.key] || 0;
        const selected = selectedItem === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.itemBtn,
              selected && styles.selectedItem,
              { backgroundColor: item.barBackgroundColor },
            ]}
            onPress={() => onSelectItem(item.key)}
            activeOpacity={0.7}>
            <Text style={[styles.emoji, { fontSize: Math.round(20 * item.sizeScale) }]}>
              {item.emoji}
            </Text>
            <Text style={styles.slotLabel}>{item.shortLabel}</Text>
            <Text style={[styles.count, { color: item.countColor }]}>{count}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  itemBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#312e81',
    minWidth: 68,
  },
  loadoutSlot: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#312e81',
    minWidth: 82,
  },
  emptyLoadoutSlot: {
    backgroundColor: 'rgba(30, 27, 75, 0.45)',
  },
  disabledSlot: {
    opacity: 0.55,
  },
  selectedItem: {
    borderColor: '#fbbf24',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  emoji: {
    fontSize: 20,
  },
  slotLabel: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  count: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  emptyCount: {
    color: '#94a3b8',
  },
});
