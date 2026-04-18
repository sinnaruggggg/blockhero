import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  STARTING_ITEM_MAX_COUNT,
  getAllowedLoadoutItemKeys,
  getItemDefinition,
  normalizeStartingItemLoadout,
  type ActiveItemKey,
  type StartingItemLoadoutSlot,
} from '../constants/itemCatalog';

interface ItemLoadoutModalProps {
  visible: boolean;
  mode: 'level' | 'endless';
  items: Record<string, number>;
  initialLoadout: StartingItemLoadoutSlot[] | undefined;
  onClose: () => void;
  onConfirm: (loadout: StartingItemLoadoutSlot[]) => void;
}

function getMaxSelectableCount(
  items: Record<string, number>,
  itemKey: ActiveItemKey | null,
) {
  if (!itemKey) {
    return 0;
  }

  return Math.max(0, Math.min(STARTING_ITEM_MAX_COUNT, items[itemKey] ?? 0));
}

export default function ItemLoadoutModal({
  visible,
  mode,
  items,
  initialLoadout,
  onClose,
  onConfirm,
}: ItemLoadoutModalProps) {
  const allowedItemKeys = useMemo(
    () => getAllowedLoadoutItemKeys(mode),
    [mode],
  );
  const [draft, setDraft] = useState<StartingItemLoadoutSlot[]>(
    normalizeStartingItemLoadout(initialLoadout),
  );
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setDraft(normalizeStartingItemLoadout(initialLoadout));
    setActiveSlotIndex(0);
  }, [initialLoadout, visible]);

  const activeSlot = draft[activeSlotIndex] ?? {
    itemKey: null,
    count: 0,
  };
  const activeMaxCount = getMaxSelectableCount(items, activeSlot.itemKey);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>시작 아이템 설정</Text>
          <Text style={styles.subtitle}>
            빈 슬롯 3칸에 들고 갈 아이템을 고르세요. 슬롯마다 최대 3개까지
            시작 수량을 정할 수 있습니다.
          </Text>

          <View style={styles.slotRow}>
            {draft.map((slot, index) => {
              const item = getItemDefinition(slot.itemKey);
              const maxCount = getMaxSelectableCount(items, slot.itemKey);
              const effectiveCount = Math.min(slot.count, maxCount);
              return (
                <TouchableOpacity
                  key={`slot-${index}`}
                  style={[
                    styles.slotCard,
                    index === activeSlotIndex && styles.slotCardActive,
                    item
                      ? { backgroundColor: item.barBackgroundColor }
                      : styles.slotCardEmpty,
                  ]}
                  onPress={() => setActiveSlotIndex(index)}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.slotEmoji,
                      item
                        ? { fontSize: Math.round(24 * item.sizeScale) }
                        : null,
                    ]}>
                    {item?.emoji ?? '+'}
                  </Text>
                  <Text style={styles.slotLabel}>
                    {item?.shortLabel ?? `빈 슬롯 ${index + 1}`}
                  </Text>
                  <Text style={styles.slotCount}>
                    {item ? `${effectiveCount}/${maxCount}` : '-'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.selectorCard}>
            <Text style={styles.selectorTitle}>
              {activeSlot.itemKey
                ? `${getItemDefinition(activeSlot.itemKey)?.label ?? ''} 수량`
                : '아이템 선택'}
            </Text>
            <View style={styles.countRow}>
              <TouchableOpacity
                style={[
                  styles.countButton,
                  (!activeSlot.itemKey || activeSlot.count <= 1) &&
                    styles.countButtonDisabled,
                ]}
                disabled={!activeSlot.itemKey || activeSlot.count <= 1}
                onPress={() =>
                  setDraft(current =>
                    current.map((slot, index) =>
                      index === activeSlotIndex
                        ? { ...slot, count: Math.max(1, slot.count - 1) }
                        : slot,
                    ),
                  )
                }>
                <Text style={styles.countButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.countValue}>
                {activeSlot.itemKey ? activeSlot.count : 0}
              </Text>
              <TouchableOpacity
                style={[
                  styles.countButton,
                  (!activeSlot.itemKey ||
                    activeSlot.count >= activeMaxCount ||
                    activeSlot.count >= STARTING_ITEM_MAX_COUNT) &&
                    styles.countButtonDisabled,
                ]}
                disabled={
                  !activeSlot.itemKey ||
                  activeSlot.count >= activeMaxCount ||
                  activeSlot.count >= STARTING_ITEM_MAX_COUNT
                }
                onPress={() =>
                  setDraft(current =>
                    current.map((slot, index) =>
                      index === activeSlotIndex
                        ? {
                            ...slot,
                            count: Math.min(
                              STARTING_ITEM_MAX_COUNT,
                              activeMaxCount,
                              slot.count + 1,
                            ),
                          }
                        : slot,
                    ),
                  )
                }>
                <Text style={styles.countButtonText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() =>
                  setDraft(current =>
                    current.map((slot, index) =>
                      index === activeSlotIndex
                        ? { itemKey: null, count: 0 }
                        : slot,
                    ),
                  )
                }>
                <Text style={styles.clearButtonText}>비우기</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.itemChoiceRow}>
              {allowedItemKeys.map(itemKey => {
                const item = getItemDefinition(itemKey);
                if (!item) {
                  return null;
                }

                const owned = items[itemKey] ?? 0;
                const disabled = owned <= 0;

                return (
                  <TouchableOpacity
                    key={`${itemKey}-${activeSlotIndex}`}
                    style={[
                      styles.itemChoice,
                      { backgroundColor: item.barBackgroundColor },
                      activeSlot.itemKey === itemKey && styles.itemChoiceActive,
                      disabled && styles.itemChoiceDisabled,
                    ]}
                    disabled={disabled}
                    onPress={() =>
                      setDraft(current =>
                        current.map((slot, index) =>
                          index === activeSlotIndex
                            ? {
                                itemKey,
                                count: Math.max(
                                  1,
                                  Math.min(
                                    slot.count || 1,
                                    getMaxSelectableCount(items, itemKey),
                                  ),
                                ),
                              }
                            : slot,
                        ),
                      )
                    }>
                    <Text
                      style={[
                        styles.itemChoiceEmoji,
                        { fontSize: Math.round(20 * item.sizeScale) },
                      ]}>
                      {item.emoji}
                    </Text>
                    <Text style={styles.itemChoiceLabel}>{item.shortLabel}</Text>
                    <Text style={styles.itemChoiceOwned}>보유 {owned}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => onConfirm(normalizeStartingItemLoadout(draft))}>
              <Text style={styles.primaryButtonText}>이 설정으로 시작</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    backgroundColor: '#140c2c',
    borderWidth: 1,
    borderColor: '#3b2f62',
    padding: 18,
    gap: 14,
  },
  title: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  slotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  slotCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#312e81',
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 102,
  },
  slotCardActive: {
    borderColor: '#fbbf24',
  },
  slotCardEmpty: {
    backgroundColor: 'rgba(30, 27, 75, 0.45)',
  },
  slotEmoji: {
    fontSize: 24,
  },
  slotLabel: {
    marginTop: 4,
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  slotCount: {
    marginTop: 4,
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  selectorCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#312e81',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    padding: 14,
    gap: 12,
  },
  selectorTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  countButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#312e81',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countButtonDisabled: {
    opacity: 0.35,
  },
  countButtonText: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
  },
  countValue: {
    minWidth: 36,
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  clearButton: {
    marginLeft: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(248, 113, 113, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearButtonText: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: '700',
  },
  itemChoiceRow: {
    gap: 8,
    paddingRight: 4,
  },
  itemChoice: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 82,
  },
  itemChoiceActive: {
    borderColor: '#fbbf24',
  },
  itemChoiceDisabled: {
    opacity: 0.35,
  },
  itemChoiceEmoji: {
    fontSize: 20,
  },
  itemChoiceLabel: {
    marginTop: 4,
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  itemChoiceOwned: {
    marginTop: 2,
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#475569',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  secondaryButtonText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1.2,
    borderRadius: 14,
    backgroundColor: '#f59e0b',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '800',
  },
});
