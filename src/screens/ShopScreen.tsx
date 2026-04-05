import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackImageButton from '../components/BackImageButton';
import {
  INFINITE_HEARTS_ENABLED,
  MAX_ITEM_PER_TYPE,
  RAID_SKILLS,
} from '../constants';
import {RAID_SKILL_UPGRADE_COSTS, SHOP_ITEMS, SPECIAL_PIECE_ITEMS} from '../constants/shopItems';
import {t} from '../i18n';
import {
  addItem,
  GameData,
  getSelectedCharacter,
  loadCharacterData,
  loadGameData,
  refillHearts,
  useDiamonds as spendDiamonds,
  useGold as spendGold,
} from '../stores/gameStore';
import {
  getCharacterSkillEffects,
  getDynamicItemCapPerType,
} from '../game/characterSkillEffects';
import {
  formatRaidSkillMultiplier,
  getRaidSkillLevels,
  getRaidSkillPreview,
} from '../game/raidSkillRuntime';
import {
  getEconomyErrorCode,
  purchaseShopItem,
  upgradeRaidSkill,
} from '../services/economyService';

const RAID_SKILL_NAMES: Record<number, string> = {
  1: '기본',
  3: '강타',
  7: '진동',
  12: '번개',
  20: '폭발',
  50: '멸망',
};

const RAID_SKILL_DESCRIPTIONS: Record<number, string> = {
  1: '기본 공격 배율',
  3: '낮은 게이지로 쓰는 강한 일격',
  7: '중반 구간용 강력 스킬',
  12: '번개형 광역 스킬',
  20: '보스 마무리용 일격',
  50: '최종 결정타',
};

export default function ShopScreen({navigation}: any) {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [raidSkillLevels, setRaidSkillLevels] = useState<Record<number, number>>({});
  const [shopDiscountRate, setShopDiscountRate] = useState(0);
  const [refreshDiscountRate, setRefreshDiscountRate] = useState(0);
  const [itemCap, setItemCap] = useState(MAX_ITEM_PER_TYPE);

  const loadData = useCallback(async () => {
    const data = await loadGameData();
    setGameData(data);
    setRaidSkillLevels(getRaidSkillLevels(data.items));

    const characterId = await getSelectedCharacter();
    if (!characterId) {
      setShopDiscountRate(0);
      setRefreshDiscountRate(0);
      setItemCap(MAX_ITEM_PER_TYPE);
      return;
    }

    const characterData = await loadCharacterData(characterId);
    const effects = getCharacterSkillEffects(characterId, characterData, {mode: 'level'});
    setShopDiscountRate(effects.shopGoldDiscount);
    setRefreshDiscountRate(effects.shopRefreshDiscount);
    setItemCap(getDynamicItemCapPerType(MAX_ITEM_PER_TYPE, effects));
  }, []);

  const canBuyItem = useCallback(
    (item: (typeof SHOP_ITEMS)[number] | (typeof SPECIAL_PIECE_ITEMS)[number]) => {
      if (item.type === 'hearts' && INFINITE_HEARTS_ENABLED) {
        Alert.alert('', '하트 무제한 모드가 활성화되어 있어 구매할 필요가 없습니다.');
        return false;
      }

      if (!gameData || item.type !== 'item' || !item.itemKey) {
        return true;
      }

      const owned = gameData.items[item.itemKey] ?? 0;
      if (owned < itemCap) {
        return true;
      }

      Alert.alert('', `이미 최대 보유량(${itemCap})입니다.`);
      return false;
    },
    [gameData, itemCap],
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [loadData, navigation]);

  const getDiscountedGoldPrice = useCallback(
    (item: (typeof SHOP_ITEMS)[number]) => {
      const appliedDiscount =
        item.id === 'refresh'
          ? Math.max(shopDiscountRate, refreshDiscountRate)
          : shopDiscountRate;
      return Math.max(1, Math.round(item.goldPrice * (1 - appliedDiscount)));
    },
    [refreshDiscountRate, shopDiscountRate],
  );

  const handleBuyWithDiamonds = useCallback(
    async (item: (typeof SHOP_ITEMS)[number]) => {
      if (!gameData) {
        return;
      }

      if (!canBuyItem(item)) {
        return;
      }

      try {
        const updated = await purchaseShopItem(item.id, 'diamonds');
        setGameData(updated);
        setRaidSkillLevels(getRaidSkillLevels(updated.items));
        Alert.alert('', '援щℓ媛 ?꾨즺?섏뿀?듬땲??');
        return;
      } catch (error) {
        const code = getEconomyErrorCode(error);
        if (code === 'not_enough_diamonds') {
          Alert.alert('', '?ㅼ씠?꾧? 遺議깊빀?덈떎.');
          return;
        }
        if (code === 'item_cap_reached') {
          Alert.alert('', `?대? 理쒕? 蹂댁쑀??${itemCap})?낅땲??`);
          return;
        }

        Alert.alert('', '援щℓ ?꾨줈?몄뿉 ?ㅽ뙣?덉뒿?덈떎.');
        return;
      }

      const spent = await spendDiamonds(gameData!, item.diamondPrice);
      if (!spent) {
        Alert.alert('', '다이아가 부족합니다.');
        return;
      }

      let updated = spent as GameData;
      if ((item.type === 'item' || item.type === 'piece') && item.itemKey) {
        updated = await addItem(updated, item.itemKey as keyof typeof updated.items, item.itemCount || 1);
      } else if (item.type === 'hearts') {
        updated = await refillHearts(updated);
      }

      setGameData(updated);
      setRaidSkillLevels(getRaidSkillLevels(updated.items));
      Alert.alert('', '구매가 완료되었습니다.');
    },
    [canBuyItem, gameData, itemCap],
  );

  const handleBuyWithGold = useCallback(
    async (item: (typeof SHOP_ITEMS)[number]) => {
      if (!gameData) {
        return;
      }

      if (!canBuyItem(item)) {
        return;
      }

      try {
        const updated = await purchaseShopItem(item.id, 'gold');
        setGameData(updated);
        setRaidSkillLevels(getRaidSkillLevels(updated.items));
        Alert.alert('', '援щℓ媛 ?꾨즺?섏뿀?듬땲??');
        return;
      } catch (error) {
        const code = getEconomyErrorCode(error);
        if (code === 'not_enough_gold') {
          Alert.alert('', '怨⑤뱶媛 遺議깊빀?덈떎.');
          return;
        }
        if (code === 'item_cap_reached') {
          Alert.alert('', `?대? 理쒕? 蹂댁쑀??${itemCap})?낅땲??`);
          return;
        }

        Alert.alert('', '援щℓ ?꾨줈?몄뿉 ?ㅽ뙣?덉뒿?덈떎.');
        return;
      }

      const goldPrice = getDiscountedGoldPrice(item);
      const spent = await spendGold(gameData!, goldPrice);
      if (!spent) {
        Alert.alert('', '골드가 부족합니다.');
        return;
      }

      let updated = spent as GameData;
      if ((item.type === 'item' || item.type === 'piece') && item.itemKey) {
        updated = await addItem(updated, item.itemKey as keyof typeof updated.items, item.itemCount || 1);
      } else if (item.type === 'hearts') {
        updated = await refillHearts(updated);
      }

      setGameData(updated);
      setRaidSkillLevels(getRaidSkillLevels(updated.items));
      Alert.alert('', '구매가 완료되었습니다.');
    },
    [canBuyItem, gameData, itemCap],
  );

  const handleUpgradeRaidSkill = useCallback(
    async (skillIndex: number) => {
      if (!gameData) {
        return;
      }

      const skill = RAID_SKILLS[skillIndex];
      const currentLevel = raidSkillLevels[skill.multiplier] ?? 0;
      if (currentLevel >= 5) {
        Alert.alert('', '이미 최대 레벨입니다.');
        return;
      }

      const cost = RAID_SKILL_UPGRADE_COSTS[currentLevel];
      const preview = getRaidSkillPreview(skill.multiplier, skill.gaugeThreshold, currentLevel);
      Alert.alert(
        `${RAID_SKILL_NAMES[skill.multiplier]} 강화`,
        [
          `현재 배율 ${formatRaidSkillMultiplier(preview.currentMultiplier)} -> 다음 ${formatRaidSkillMultiplier(preview.nextMultiplier)}`,
          skill.multiplier > 1
            ? `필요 게이지 ${preview.currentThreshold} -> ${preview.nextThreshold}`
            : '기본 배율은 게이지를 사용하지 않습니다.',
          `비용: 다이아 ${cost}`,
        ].join('\n'),
        [
          {text: '취소', style: 'cancel'},
          {
            text: '강화',
            onPress: async () => {
              try {
                const updated = await upgradeRaidSkill(skillIndex);
                setGameData(updated);
                setRaidSkillLevels(getRaidSkillLevels(updated.items));
                return;
              } catch (error) {
                const code = getEconomyErrorCode(error);
                if (code === 'not_enough_diamonds') {
                  Alert.alert('', '?ㅼ씠?꾧? 遺議깊빀?덈떎.');
                  return;
                }
                if (code === 'raid_skill_max_level') {
                  Alert.alert('', '?대? 理쒕? ?덈꺼?낅땲??');
                  return;
                }

                Alert.alert('', '媛뺥솕 ?꾨줈?몄뿉 ?ㅽ뙣?덉뒿?덈떎.');
                return;
              }

              const spent = await spendDiamonds(gameData!, cost);
              if (!spent) {
                Alert.alert('', '다이아가 부족합니다.');
                return;
              }
              const updated = await addItem(
                spent as GameData,
                `raidSkill_${skillIndex}` as keyof GameData['items'],
                1,
              );
              setGameData(updated);
              setRaidSkillLevels(getRaidSkillLevels(updated.items));
            },
          },
        ],
      );
    },
    [gameData, raidSkillLevels],
  );

  if (!gameData) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackImageButton onPress={() => navigation.goBack()} size={42} />
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>상점</Text>
        <View style={styles.currencies}>
          <Text style={styles.gold}>골드 {gameData.gold.toLocaleString()}</Text>
          <Text style={styles.diamond}>다이아 {gameData.diamonds.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>기본 아이템</Text>
        <Text style={styles.sectionNote}>모든 아이템은 골드 또는 다이아로 구매할 수 있습니다.</Text>
        {SHOP_ITEMS.map(item => {
          const goldPrice = getDiscountedGoldPrice(item);
          const discounted = goldPrice !== item.goldPrice;
          const heartsDisabled = item.type === 'hearts' && INFINITE_HEARTS_ENABLED;
          return (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemEmoji}>{item.emoji}</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{t(item.nameKey)}</Text>
                {item.type === 'hearts' && INFINITE_HEARTS_ENABLED ? (
                  <Text style={styles.itemDesc}>하트 무제한 모드가 활성화되어 있습니다.</Text>
                ) : item.type === 'hearts' ? (
                  <Text style={styles.itemDesc}>하트를 최대치로 즉시 충전합니다.</Text>
                ) : (
                  <Text style={styles.itemDesc}>
                    보유 {gameData.items[item.itemKey as keyof typeof gameData.items] || 0}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                disabled={heartsDisabled}
                style={[styles.priceBtnGold, heartsDisabled && styles.priceBtnDisabled]}
                onPress={() => handleBuyWithGold(item)}>
                <Text style={styles.priceBtnText}>
                  골드 {goldPrice}
                  {discounted ? ` (${item.goldPrice})` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={heartsDisabled}
                style={[styles.priceBtnDia, heartsDisabled && styles.priceBtnDisabled]}
                onPress={() => handleBuyWithDiamonds(item)}>
                <Text style={styles.priceBtnText}>다이아 {item.diamondPrice}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <Text style={[styles.sectionTitle, styles.sectionSpacing]}>특수 블록</Text>
        {SPECIAL_PIECE_ITEMS.map(item => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemEmoji}>{item.emoji}</Text>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{t(item.nameKey)}</Text>
              <Text style={styles.itemDesc}>
                보유 {gameData.items[item.itemKey as keyof typeof gameData.items] || 0}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.priceBtnGold}
              onPress={() => handleBuyWithGold(item)}>
              <Text style={styles.priceBtnText}>골드 {getDiscountedGoldPrice(item)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.priceBtnDia}
              onPress={() => handleBuyWithDiamonds(item)}>
              <Text style={styles.priceBtnText}>다이아 {item.diamondPrice}</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={[styles.sectionTitle, styles.sectionSpacing]}>레이드 스킬 강화</Text>
        <Text style={styles.sectionNote}>다이아로 배율을 올리고 필요한 게이지를 줄일 수 있습니다.</Text>
        {RAID_SKILLS.map((skill, index) => {
          const currentLevel = raidSkillLevels[skill.multiplier] ?? 0;
          const preview = getRaidSkillPreview(skill.multiplier, skill.gaugeThreshold, currentLevel);
          const cost = currentLevel < 5 ? RAID_SKILL_UPGRADE_COSTS[currentLevel] : null;
          return (
            <View key={skill.multiplier} style={styles.raidSkillRow}>
              <View style={styles.raidSkillLeft}>
                <Text style={styles.raidSkillLabel}>
                  {formatRaidSkillMultiplier(preview.currentMultiplier)}
                </Text>
                <Text style={styles.raidSkillName}>{RAID_SKILL_NAMES[skill.multiplier]}</Text>
              </View>
              <View style={styles.raidSkillBody}>
                <Text style={styles.raidSkillDesc}>{RAID_SKILL_DESCRIPTIONS[skill.multiplier]}</Text>
                <Text style={styles.raidSkillMeta}>레벨 {currentLevel}/5</Text>
                {skill.multiplier > 1 && (
                  <Text style={styles.raidSkillMeta}>필요 게이지 {preview.currentThreshold}</Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.upgradeBtn, currentLevel >= 5 && styles.upgradeBtnMax]}
                onPress={() => handleUpgradeRaidSkill(index)}
                disabled={currentLevel >= 5}>
                <Text style={styles.upgradeBtnText}>
                  {currentLevel >= 5 ? '최대' : `다이아 ${cost}`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={styles.skinInfo}>
          <Text style={styles.skinInfoTitle}>블록 스킨</Text>
          <Text style={styles.skinInfoText}>
            스킨은 상점에서 판매하지 않습니다.{'\n'}
            일반 레이드 보스를 10회 처치하면 해당 스킨이 해금됩니다.{'\n'}
            해금된 스킨은 공격력 보너스와 소환 능력을 제공합니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0a0a1e'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: {color: 'transparent', fontSize: 1, lineHeight: 1, opacity: 0},
  title: {flex: 1, color: '#e2e8f0', fontSize: 18, fontWeight: '800'},
  currencies: {flexDirection: 'row', gap: 8, alignItems: 'center'},
  gold: {color: '#fbbf24', fontSize: 13, fontWeight: '800'},
  diamond: {color: '#a855f7', fontSize: 13, fontWeight: '800'},
  scrollContent: {padding: 14, paddingBottom: 40},
  sectionTitle: {color: '#e2e8f0', fontSize: 15, fontWeight: '800', marginBottom: 4},
  sectionSpacing: {marginTop: 20},
  sectionNote: {color: '#94a3b8', fontSize: 12, marginBottom: 10},
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  itemEmoji: {fontSize: 22, width: 28, textAlign: 'center'},
  itemInfo: {flex: 1},
  itemName: {color: '#e2e8f0', fontSize: 14, fontWeight: '700'},
  itemDesc: {color: '#94a3b8', fontSize: 11, marginTop: 2},
  priceBtnGold: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#fbbf2440',
  },
  priceBtnDia: {
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#a855f740',
  },
  priceBtnDisabled: {
    backgroundColor: 'rgba(100,116,139,0.16)',
    borderColor: '#47556966',
    opacity: 0.55,
  },
  priceBtnText: {color: '#e2e8f0', fontSize: 12, fontWeight: '800'},
  raidSkillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    gap: 10,
  },
  raidSkillLeft: {width: 64},
  raidSkillLabel: {color: '#a78bfa', fontSize: 16, fontWeight: '900'},
  raidSkillName: {color: '#e2e8f0', fontSize: 12, fontWeight: '700'},
  raidSkillBody: {flex: 1, gap: 2},
  raidSkillDesc: {color: '#cbd5e1', fontSize: 12, fontWeight: '600'},
  raidSkillMeta: {color: '#94a3b8', fontSize: 11},
  upgradeBtn: {
    backgroundColor: '#312e81',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  upgradeBtnMax: {backgroundColor: '#1f2937'},
  upgradeBtnText: {color: '#e2e8f0', fontSize: 12, fontWeight: '800'},
  skinInfo: {
    marginTop: 24,
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#312e81',
  },
  skinInfoTitle: {color: '#e2e8f0', fontSize: 14, fontWeight: '800', marginBottom: 8},
  skinInfoText: {color: '#94a3b8', fontSize: 13, lineHeight: 20},
});
