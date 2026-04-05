import React from 'react';
import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';

interface ItemBarProps {
  items: {[key: string]: number};
  selectedItem: string | null;
  onSelectItem: (item: string) => void;
  showAddTurns?: boolean;
}

const ITEM_DEFS = [
  {key: 'hammer', emoji: '🔨', label: '망치'},
  {key: 'bomb', emoji: '💣', label: '폭탄'},
  {key: 'refresh', emoji: '🔄', label: '새로고침'},
  {key: 'addTurns', emoji: '➕', label: '턴 추가'},
];

const PIECE_ITEM_DEFS = [
  {key: 'piece_square3', emoji: '🟪', label: '3x3'},
  {key: 'piece_rect', emoji: '▭', label: '2x3'},
  {key: 'piece_line5', emoji: '🟦', label: '5줄'},
  {key: 'piece_num2', emoji: '2', label: 'No.2'},
  {key: 'piece_diag', emoji: '╱', label: '대각'},
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
  const ownedPieces = PIECE_ITEM_DEFS.filter(item => (items[item.key] || 0) > 0);
  const allItems = [...visibleItems, ...ownedPieces];

  return (
    <View style={styles.container}>
      {allItems.map(item => {
        const count = items[item.key] || 0;
        const selected = selectedItem === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.itemBtn, selected && styles.selectedItem]}
            onPress={() => onSelectItem(item.key)}
            activeOpacity={0.7}>
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
