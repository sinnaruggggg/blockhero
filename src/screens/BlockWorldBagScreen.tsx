import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackImageButton from '../components/BackImageButton';
import GameBottomNav from '../components/GameBottomNav';
import {formatBlockWorldToolName} from '../game/blockWorldTools';
import {
  GameData,
  loadGameData,
  useDiamonds as spendDiamonds,
} from '../stores/gameStore';
import {
  loadBlockWorldToolInventory,
  type BlockWorldToolInventory,
} from '../stores/blockWorldToolStore';
import {
  BLOCK_WORLD_BAG_COLUMNS,
  expandBlockWorldInventory,
  getBlockWorldBagExpandCost,
  getBlockWorldBagSlotCount,
  loadBlockWorldInventory,
  type BlockWorldInventory,
} from '../stores/blockWorldInventoryStore';

type BagSlotItem = {
  id: string;
  label: string;
  quantity?: number;
  meta: string;
};

export default function BlockWorldBagScreen({navigation}: any) {
  const {width} = useWindowDimensions();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [inventory, setInventory] = useState<BlockWorldInventory | null>(null);
  const [toolInventory, setToolInventory] = useState<BlockWorldToolInventory | null>(
    null,
  );

  const loadData = useCallback(async () => {
    const [nextGameData, nextInventory, nextToolInventory] = await Promise.all([
      loadGameData(),
      loadBlockWorldInventory(),
      loadBlockWorldToolInventory(),
    ]);
    setGameData(nextGameData);
    setInventory(nextInventory);
    setToolInventory(nextToolInventory);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [loadData, navigation]);

  const slotSize = Math.floor(
    (Math.min(width, 520) - 32 - (BLOCK_WORLD_BAG_COLUMNS - 1) * 6) /
      BLOCK_WORLD_BAG_COLUMNS,
  );
  const rows = inventory?.rows ?? 2;
  const slotCount = getBlockWorldBagSlotCount(rows);
  const expandCost = getBlockWorldBagExpandCost(rows);
  const displayItems = useMemo<BagSlotItem[]>(() => {
    const tools =
      toolInventory?.tools.map(tool => ({
        id: `tool:${tool.id}`,
        label: formatBlockWorldToolName(tool),
        meta: `내구도 ${tool.durability}/${tool.maxDurability}`,
      })) ?? [];
    const storedItems =
      inventory?.items.map(item => ({
        id: `item:${item.id}`,
        label: item.label,
        quantity: item.quantity,
        meta: item.quantity > 1 ? `x${item.quantity}` : '',
      })) ?? [];

    return [...tools, ...storedItems];
  }, [inventory?.items, toolInventory?.tools]);

  const handleExpand = useCallback(async () => {
    if (!gameData || !inventory) {
      return;
    }

    if (gameData.diamonds < expandCost) {
      Alert.alert('보석 부족', `가방을 확장하려면 보석 ${expandCost}개가 필요합니다.`);
      return;
    }

    const nextGameData = await spendDiamonds(gameData, expandCost);
    if (!nextGameData) {
      Alert.alert('보석 부족', `가방을 확장하려면 보석 ${expandCost}개가 필요합니다.`);
      return;
    }

    const nextInventory = await expandBlockWorldInventory();
    setGameData(nextGameData);
    setInventory(nextInventory);
  }, [expandCost, gameData, inventory]);

  const handlePressSlot = useCallback((item?: BagSlotItem) => {
    if (!item) {
      Alert.alert('빈 칸', '아직 아무것도 없다.');
      return;
    }

    Alert.alert(item.label, '어딘가에 쓰이는 무언가? 이다');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackImageButton onPress={() => navigation.goBack()} size={42} />
        <Text style={styles.title}>가방</Text>
        <Text style={styles.diamonds}>보석 {gameData?.diamonds ?? 0}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>블록월드 인벤토리</Text>
          <Text style={styles.infoText}>
            비공개 블록월드에서 얻게 될 도구와 재료를 보관합니다.
          </Text>
        </View>

        <View style={styles.grid}>
          {Array.from({length: slotCount}).map((_, index) => {
            const item = displayItems[index];
            return (
              <TouchableOpacity
                activeOpacity={0.82}
                key={index}
                onPress={() => handlePressSlot(item)}
                style={[
                  styles.slot,
                  {
                    width: slotSize,
                    height: slotSize,
                  },
                  item && styles.filledSlot,
                ]}>
                {item ? (
                  <>
                    <Text numberOfLines={2} style={styles.slotLabel}>
                      {item.label}
                    </Text>
                    <Text numberOfLines={1} style={styles.slotMeta}>
                      {item.meta || (item.quantity ? `x${item.quantity}` : '')}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.emptySlotText}>+</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => {
            handleExpand().catch(() => {
              Alert.alert('확장 실패', '다시 시도해주세요.');
            });
          }}
          style={styles.expandButton}>
          <Text style={styles.expandButtonText}>한 줄 확장</Text>
          <Text style={styles.expandCostText}>보석 {expandCost}</Text>
        </TouchableOpacity>
      </ScrollView>

      <GameBottomNav navigation={navigation} activeItem="bag" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#101827',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: {
    color: '#f8fbff',
    fontSize: 20,
    fontWeight: '900',
  },
  diamonds: {
    color: '#f6d365',
    fontSize: 13,
    fontWeight: '900',
    minWidth: 64,
    textAlign: 'right',
  },
  content: {
    alignItems: 'center',
    padding: 16,
    paddingBottom: 110,
    gap: 14,
  },
  infoBox: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(246, 211, 101, 0.28)',
    backgroundColor: 'rgba(28, 41, 63, 0.92)',
    padding: 14,
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  infoText: {
    color: '#b7c4d7',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    maxWidth: 520,
    width: '100%',
  },
  slot: {
    alignItems: 'center',
    backgroundColor: '#17243a',
    borderColor: '#31425f',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    padding: 4,
  },
  filledSlot: {
    backgroundColor: '#22324b',
    borderColor: '#f6d365',
  },
  emptySlotText: {
    color: '#43546f',
    fontSize: 20,
    fontWeight: '900',
  },
  slotLabel: {
    color: '#f8fbff',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  slotMeta: {
    color: '#f6d365',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'center',
  },
  expandButton: {
    alignItems: 'center',
    backgroundColor: '#f6d365',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 18,
    width: '100%',
    maxWidth: 520,
  },
  expandButtonText: {
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '900',
  },
  expandCostText: {
    color: '#5b4520',
    fontSize: 13,
    fontWeight: '900',
  },
});
