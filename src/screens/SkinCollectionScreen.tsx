import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackImageButton from '../components/BackImageButton';
import {t} from '../i18n';
import {BLOCK_SKINS} from '../constants/blockSkins';
import {
  loadNormalRaidProgress,
  loadSkinData,
  NormalRaidProgress,
  setActiveSkinId,
  SkinData,
} from '../stores/gameStore';
import {setActiveSkin} from '../game/skinContext';
import {getActiveSkinLoadout} from '../game/skinSummonRuntime';

function getVisibleSkins(skinData: SkinData) {
  return BLOCK_SKINS.filter(
    skin => skin.id <= 10 || skin.id === 0 || skinData.unlockedSkins.includes(skin.id),
  );
}

export default function SkinCollectionScreen({navigation}: any) {
  const [skinData, setSkinData] = useState<SkinData>({
    unlockedSkins: [0],
    activeSkinId: 0,
    summonProgress: {},
  } as SkinData);
  const [normalRaidProgress, setNormalRaidProgress] = useState<NormalRaidProgress>({});

  const loadData = useCallback(async () => {
    const [loadedSkinData, loadedRaidProgress] = await Promise.all([
      loadSkinData(),
      loadNormalRaidProgress(),
    ]);
    setSkinData(loadedSkinData);
    setNormalRaidProgress(loadedRaidProgress);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [loadData, navigation]);

  const visibleSkins = useMemo(() => getVisibleSkins(skinData), [skinData]);

  const handleEquip = async (skinId: number) => {
    const updated = await setActiveSkinId(skinId);
    setSkinData(updated);
    setActiveSkin(skinId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackImageButton onPress={() => navigation.goBack()} size={42} />
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>스킨 컬렉션</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          {visibleSkins.map(skin => {
            const isUnlocked = skinData.unlockedSkins.includes(skin.id);
            const isActive = skinData.activeSkinId === skin.id;
            const clearCount = normalRaidProgress[skin.id]?.killCount ?? 0;
            const loadout = getActiveSkinLoadout({
              activeSkinId: skin.id,
              summonProgress: skinData.summonProgress,
            });

            return (
              <TouchableOpacity
                key={skin.id}
                style={[
                  styles.skinCard,
                  !isUnlocked && styles.skinLocked,
                  isActive && styles.skinActive,
                ]}
                onPress={() => isUnlocked && handleEquip(skin.id)}
                disabled={!isUnlocked}>
                <View style={styles.colorGrid}>
                  {skin.colors.slice(0, 6).map((color, index) => (
                    <View
                      key={index}
                      style={[
                        styles.colorBlock,
                        {backgroundColor: isUnlocked ? color : '#374151'},
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.skinName, !isUnlocked && styles.skinNameLocked]}>
                  {t(skin.nameKey)}
                </Text>
                <Text style={styles.skinMeta}>
                  공격력 +{Math.round((loadout.effects.attackBonusMultiplier - 1) * 100)}%
                </Text>
                <Text style={styles.skinMeta}>{loadout.effects.uniqueEffectLabel}</Text>
                {skin.id > 0 && (
                  <Text style={styles.skinMeta}>
                    일반 레이드 {skin.id}단계 {clearCount}/10
                  </Text>
                )}
                {skin.id > 0 && loadout.summonProgress && (
                  <Text style={styles.summonMeta}>
                    소환수 레벨 {loadout.summonProgress.level} / 공격 {loadout.summonAttack}
                  </Text>
                )}
                {isActive && <Text style={styles.equippedBadge}>장착 중</Text>}
                {!isUnlocked && <Text style={styles.lockedText}>잠금</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f0a2e'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {color: 'transparent', fontSize: 1, lineHeight: 1, opacity: 0},
  title: {color: '#e2e8f0', fontSize: 18, fontWeight: '800'},
  scrollContent: {padding: 12, paddingBottom: 40},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  skinCard: {
    width: '31%',
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  skinLocked: {opacity: 0.5},
  skinActive: {borderColor: '#fbbf24', borderWidth: 2},
  colorGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginBottom: 6},
  colorBlock: {width: 16, height: 16, borderRadius: 3},
  skinName: {color: '#e2e8f0', fontSize: 10, fontWeight: '700', textAlign: 'center'},
  skinNameLocked: {color: '#64748b'},
  skinMeta: {color: '#94a3b8', fontSize: 9, textAlign: 'center', marginTop: 3},
  summonMeta: {color: '#fbbf24', fontSize: 9, textAlign: 'center', marginTop: 3},
  equippedBadge: {color: '#fbbf24', fontSize: 8, fontWeight: '900', marginTop: 4},
  lockedText: {position: 'absolute', top: 4, right: 4, fontSize: 10, color: '#cbd5e1'},
});
