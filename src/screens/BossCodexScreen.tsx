import React, {useCallback, useEffect, useState} from 'react';
import {Image, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getRaidBossSprite} from '../assets/monsterSprites';
import BackImageButton from '../components/BackImageButton';
import {RAID_BOSSES} from '../constants/raidBosses';
import {TITLES} from '../constants/titles';
import {t} from '../i18n';
import {
  CodexData,
  loadActiveTitle,
  loadCodexData,
  loadUnlockedTitles,
  saveActiveTitle,
} from '../stores/gameStore';

export default function BossCodexScreen({navigation}: any) {
  const [codex, setCodex] = useState<CodexData>({});
  const [titles, setTitles] = useState<string[]>([]);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setCodex(await loadCodexData());
    setTitles(await loadUnlockedTitles());
    setActiveTitle(await loadActiveTitle());
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [loadData, navigation]);

  const defeatedCount = Object.keys(codex).length;

  const handleSelectTitle = async (titleId: string | null) => {
    await saveActiveTitle(titleId);
    setActiveTitle(titleId);
  };

  const formatDamage = (damage: number) => damage.toLocaleString();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackImageButton onPress={() => navigation.goBack()} size={42} />
        <Text style={styles.title}>{t('codex.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, {width: `${(defeatedCount / 10) * 100}%`}]} />
          <Text style={styles.progressText}>{defeatedCount} / 10</Text>
        </View>

        <View style={styles.bossGrid}>
          {RAID_BOSSES.map(boss => {
            const entry = codex[boss.stage];
            const defeated = Boolean(entry);
            const bossSprite = getRaidBossSprite(boss.stage);

            return (
              <View
                key={boss.stage}
                style={[styles.bossCard, defeated && {borderColor: boss.color}]}>
                {defeated && bossSprite ? (
                  <Image
                    source={bossSprite}
                    resizeMode="contain"
                    fadeDuration={0}
                    style={styles.bossSprite}
                  />
                ) : (
                  <Text style={[styles.bossEmoji, !defeated && styles.bossEmojiHidden]}>
                    {defeated ? boss.emoji : '🔒'}
                  </Text>
                )}
                <Text style={styles.bossStage}>{boss.stage}</Text>
                {defeated && entry && (
                  <>
                    <Text style={styles.bossDefeatCount}>{entry.defeatCount}승</Text>
                    <Text style={styles.bossBestDamage}>{formatDamage(entry.bestDamage)}</Text>
                  </>
                )}
              </View>
            );
          })}
        </View>

        {titles.length > 0 && (
          <View style={styles.titleSection}>
            <Text style={styles.sectionTitle}>{t('codex.titles')}</Text>
            <TouchableOpacity
              style={[styles.titleRow, !activeTitle && styles.titleActive]}
              onPress={() => handleSelectTitle(null)}>
              <Text style={styles.titleName}>{t('codex.noTitle')}</Text>
            </TouchableOpacity>

            {titles.map(titleId => {
              const titleDef = TITLES.find(entry => entry.id === titleId);
              if (!titleDef) {
                return null;
              }

              const isActive = activeTitle === titleId;
              return (
                <TouchableOpacity
                  key={titleId}
                  style={[styles.titleRow, isActive && styles.titleActive]}
                  onPress={() => handleSelectTitle(titleId)}>
                  <Text style={[styles.titleName, isActive && styles.titleNameActive]}>
                    {t(titleDef.nameKey)}
                  </Text>
                  {isActive && <Text style={styles.equippedText}>착용 중</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {backgroundColor: '#0f0a2e', flex: 1},
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerSpacer: {width: 40},
  title: {color: '#e2e8f0', fontSize: 18, fontWeight: '800'},
  scrollContent: {padding: 16, paddingBottom: 40},
  progressBar: {
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  bossGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  bossCard: {
    alignItems: 'center',
    aspectRatio: 0.75,
    backgroundColor: '#1e1b4b',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    padding: 2,
    width: '18.5%',
  },
  bossEmoji: {fontSize: 20},
  bossEmojiHidden: {opacity: 0.3},
  bossSprite: {width: 28, height: 28},
  bossStage: {color: '#94a3b8', fontSize: 9, fontWeight: '800'},
  bossDefeatCount: {color: '#22c55e', fontSize: 8, fontWeight: '700'},
  bossBestDamage: {color: '#fbbf24', fontSize: 8, fontWeight: '700'},
  titleSection: {marginTop: 20},
  sectionTitle: {color: '#e2e8f0', fontSize: 16, fontWeight: '800', marginBottom: 10},
  titleRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(30,27,75,0.6)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  titleActive: {borderColor: '#fbbf24'},
  titleName: {color: '#e2e8f0', fontSize: 14, fontWeight: '700'},
  titleNameActive: {color: '#fbbf24'},
  equippedText: {color: '#fbbf24', fontSize: 10, fontWeight: '900'},
});
