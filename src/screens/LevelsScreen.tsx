import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {t} from '../i18n';
import {LEVELS, WORLDS} from '../constants';
import {loadLevelProgress, loadGameData, useHeart, LevelProgress, GameData} from '../stores/gameStore';

export default function LevelsScreen({navigation}: any) {
  const [progress, setProgress] = useState<LevelProgress>({});
  const [gameData, setGameData] = useState<GameData | null>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      setProgress(await loadLevelProgress());
      setGameData(await loadGameData());
    });
    return unsubscribe;
  }, [navigation]);

  const getUnlockedLevel = () => {
    for (let i = 1; i <= 20; i++) {
      if (!progress[i]?.cleared) return i;
    }
    return 21; // all cleared
  };

  const handleLevelPress = async (levelId: number) => {
    if (!gameData) return;
    const unlocked = getUnlockedLevel();
    if (levelId > unlocked) {
      Alert.alert(t('levels.locked'), t('levels.clearFirst'));
      return;
    }
    if (gameData.hearts <= 0) {
      Alert.alert(t('levels.noHearts'), t('levels.noHeartsMsg'));
      return;
    }
    const updated = await useHeart(gameData);
    if (updated) {
      setGameData(updated);
      navigation.navigate('SingleGame', {levelId});
    }
  };

  const unlockedLevel = getUnlockedLevel();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>{t('common.home')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('levels.title')}</Text>
        <Text style={styles.hearts}>❤️ {gameData?.hearts ?? 0}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {WORLDS.map(world => (
          <View key={world.id} style={styles.worldSection}>
            <Text style={[styles.worldTitle, {color: world.color}]}>
              {world.emoji} {t(`world.${world.id}`)}
            </Text>
            <View style={styles.levelGrid}>
              {LEVELS.filter(l => l.world === world.id).map(level => {
                const p = progress[level.id];
                const isLocked = level.id > unlockedLevel;
                const isCurrent = level.id === unlockedLevel;
                return (
                  <TouchableOpacity
                    key={level.id}
                    style={[
                      styles.levelBtn,
                      p?.cleared && styles.clearedLevel,
                      isCurrent && styles.currentLevel,
                      isLocked && styles.lockedLevel,
                    ]}
                    onPress={() => handleLevelPress(level.id)}
                    disabled={isLocked}>
                    <Text style={styles.levelNum}>{level.id}</Text>
                    <Text style={styles.levelName}>{t(`level.${level.id}`)}</Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3].map(s => (
                        <Text key={s} style={styles.star}>
                          {(p?.stars || 0) >= s ? '⭐' : '☆'}
                        </Text>
                      ))}
                    </View>
                    {isLocked && <Text style={styles.lock}>🔒</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
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
  backBtn: {color: '#a5b4fc', fontSize: 14, fontWeight: '600'},
  title: {color: '#e2e8f0', fontSize: 18, fontWeight: '800'},
  hearts: {color: '#e2e8f0', fontSize: 14, fontWeight: '600'},
  scroll: {padding: 16},
  worldSection: {marginBottom: 24},
  worldTitle: {fontSize: 20, fontWeight: '800', marginBottom: 12},
  levelGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  levelBtn: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#312e81',
    padding: 4,
  },
  clearedLevel: {borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)'},
  currentLevel: {borderColor: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.1)'},
  lockedLevel: {opacity: 0.4},
  levelNum: {color: '#e2e8f0', fontSize: 18, fontWeight: '900'},
  levelName: {color: '#94a3b8', fontSize: 9, marginTop: 2},
  starsRow: {flexDirection: 'row', marginTop: 2},
  star: {fontSize: 10},
  lock: {position: 'absolute', fontSize: 16},
});
