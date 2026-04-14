import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';

interface ItemBarProps {
  items: { [key: string]: number };
  selectedItem: string | null;
  onSelectItem: (item: string) => void;
  showAddTurns?: boolean;
}

const ITEM_DEFS = [
  { key: 'hammer', emoji: '🔨' },
  { key: 'bomb', emoji: '💣' },
  { key: 'refresh', emoji: '🔄' },
  { key: 'addTurns', emoji: '⏱' },
];

export default function ItemBar({
  items,
  selectedItem,
  onSelectItem,
  showAddTurns = true,
}: ItemBarProps) {
  const visibleItems = showAddTurns
    ? ITEM_DEFS
    : ITEM_DEFS.filter(item => item.key !== 'addTurns');

  return (
    <View style={styles.container}>
      {visibleItems.map(item => {
        const count = items[item.key] || 0;
        const selected = selectedItem === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.itemBtn, selected && styles.selectedItem]}
            onPress={() => onSelectItem(item.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.count}>{count}</Text>
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
    backgroundColor: 'rgba(30, 27, 75, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#312e81',
    minWidth: 50,
  },
  selectedItem: {
    borderColor: '#fbbf24',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  emoji: {
    fontSize: 20,
  },
  count: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});
