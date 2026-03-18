import React from 'react';
import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';

interface ItemBarProps {
  items: {hammer: number; refresh: number; addTurns: number; bomb: number};
  selectedItem: string | null;
  onSelectItem: (item: string) => void;
  showAddTurns?: boolean;
}

const ITEM_DEFS = [
  {key: 'hammer', emoji: '🔨', label: '해머'},
  {key: 'bomb', emoji: '💣', label: '폭탄'},
  {key: 'refresh', emoji: '🔄', label: '새로고침'},
  {key: 'addTurns', emoji: '⏰', label: '+3턴'},
];

export default function ItemBar({items, selectedItem, onSelectItem, showAddTurns = true}: ItemBarProps) {
  const visibleItems = showAddTurns ? ITEM_DEFS : ITEM_DEFS.filter(d => d.key !== 'addTurns');

  return (
    <View style={styles.container}>
      {visibleItems.map(def => {
        const count = items[def.key as keyof typeof items];
        const selected = selectedItem === def.key;
        return (
          <TouchableOpacity
            key={def.key}
            style={[styles.itemBtn, selected && styles.selectedItem]}
            onPress={() => onSelectItem(def.key)}
            activeOpacity={0.7}>
            <Text style={styles.emoji}>{def.emoji}</Text>
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
    gap: 12,
    paddingVertical: 8,
  },
  itemBtn: {
    backgroundColor: 'rgba(30, 27, 75, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#312e81',
    minWidth: 56,
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
