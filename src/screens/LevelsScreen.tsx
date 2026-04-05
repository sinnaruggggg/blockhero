import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackImageButton from '../components/BackImageButton';
import {getWorldMonsterSprite} from '../assets/monsterSprites';
import {INFINITE_HEARTS_ENABLED, LEVELS, WORLDS, formatHeartValue} from '../constants';
import {getNextUnlockedLevel, getWorldProgressSummary} from '../game/levelProgress';
import {
  GameData,
  LevelProgress,
  loadGameData,
  loadLevelProgress,
  useHeart as consumeHeart,
} from '../stores/gameStore';

const {width: screenWidth} = Dimensions.get('window');
const cellSize = (screenWidth - 32 - 5 * 8) / 6;

export default function LevelsScreen({navigation}: any) {
  const [progress, setProgress] = useState<LevelProgress>({});
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [expandedWorld, setExpandedWorld] = useState<number>(1);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      setProgress(await loadLevelProgress());
      setGameData(await loadGameData());
    });

    return unsubscribe;
  }, [navigation]);

  const unlockedLevel = getNextUnlockedLevel(progress);

  useEffect(() => {
    if (unlockedLevel <= 300) {
      const worldId = LEVELS.find(level => level.id === unlockedLevel)?.world ?? 1;
      setExpandedWorld(worldId);
    }
  }, [unlockedLevel]);

  const handleLevelPress = useCallback(
    async (levelId: number) => {
      if (!gameData) {
        return;
      }

      if (levelId > unlockedLevel) {
        Alert.alert('잠금', '이전 스테이지를 먼저 클리어해 주세요.');
        return;
      }

      if (!INFINITE_HEARTS_ENABLED && gameData.hearts <= 0) {
        Alert.alert('하트 부족', '하트가 없습니다.\n5분마다 1개씩 회복됩니다.');
        return;
      }

      const updatedGameData = await consumeHeart(gameData);
      if (!updatedGameData) {
        return;
      }

      setGameData(updatedGameData);
      navigation.navigate('SingleGame', {levelId});
    },
    [gameData, navigation, unlockedLevel],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackImageButton onPress={() => navigation.goBack()} size={42} />
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>레벨 선택</Text>
        <Text style={styles.hearts}>{`하트 ${formatHeartValue(gameData?.hearts ?? 0)}`}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {WORLDS.map(world => {
          const {cleared, total, completed} = getWorldProgressSummary(progress, world.id);
          const isExpanded = expandedWorld === world.id;
          const worldFirstLevel = (world.id - 1) * 30 + 1;
          const isWorldUnlocked = unlockedLevel >= worldFirstLevel;

          return (
            <View key={world.id} style={styles.worldSection}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={!isWorldUnlocked}
                style={[
                  styles.worldHeader,
                  {borderColor: `${world.color}80`},
                  !isWorldUnlocked && styles.worldHeaderLocked,
                ]}
                onPress={() => setExpandedWorld(isExpanded ? 0 : world.id)}>
                <Text style={styles.worldEmoji}>{world.emoji}</Text>
                <View style={styles.worldHeaderInfo}>
                  <Text
                    style={[
                      styles.worldName,
                      {color: isWorldUnlocked ? world.color : '#4b5563'},
                    ]}>
                    {world.id}. {world.name}
                  </Text>
                  <Text style={styles.worldProgress}>
                    {isWorldUnlocked ? `${cleared} / ${total}` : '잠금'}
                  </Text>
                </View>
                {completed && <Text style={styles.worldComplete}>완료</Text>}
                <Text style={styles.expandArrow}>{isExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isWorldUnlocked && (
                <View style={styles.worldProgressBar}>
                  <View
                    style={[
                      styles.worldProgressFill,
                      {
                        width: `${(cleared / total) * 100}%`,
                        backgroundColor: world.color,
                      },
                    ]}
                  />
                </View>
              )}

              {isExpanded && isWorldUnlocked && (
                <View style={styles.levelGrid}>
                  {LEVELS.filter(level => level.world === world.id).map(level => {
                    const stageProgress = progress[level.id];
                    const isLocked = level.id > unlockedLevel;
                    const isCurrent = level.id === unlockedLevel;
                    const stageInWorld = ((level.id - 1) % 30) + 1;
                    const isBoss = stageInWorld === 30;

                    return (
                      <TouchableOpacity
                        key={level.id}
                        disabled={isLocked}
                        style={[
                          styles.levelBtn,
                          {width: cellSize, height: cellSize},
                          stageProgress?.cleared && styles.clearedLevel,
                          isCurrent && styles.currentLevel,
                          isLocked && styles.lockedLevel,
                          isBoss && styles.bossLevel,
                        ]}
                        onPress={() => handleLevelPress(level.id)}>
                        {isBoss ? (
                          <>
                            {getWorldMonsterSprite(level.world) ? (
                              <Image
                                source={getWorldMonsterSprite(level.world)!}
                                resizeMode="contain"
                                fadeDuration={0}
                                style={styles.bossSprite}
                              />
                            ) : (
                              <Text style={styles.bossEmoji}>{level.goal.monsterEmoji}</Text>
                            )}
                            <Text style={styles.bossLabel}>보스</Text>
                          </>
                        ) : (
                          <Text
                            style={[
                              styles.levelNum,
                              isLocked && styles.levelNumLocked,
                            ]}>
                            {stageInWorld}
                          </Text>
                        )}

                        {isLocked && !isBoss && <Text style={styles.lockIcon}>🔒</Text>}
                        {stageProgress?.cleared && <Text style={styles.clearCheck}>완</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {completed && (
                <View style={[styles.bossRaidUnlock, {borderColor: world.color}]}>
                  <Text style={styles.bossRaidText}>
                    {world.bossEmoji} 보스 레이드 해금: {world.bossName}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0a0a1e'},
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backBtn: {color: 'transparent', fontSize: 1, lineHeight: 1, opacity: 0},
  title: {color: '#e2e8f0', flex: 1, fontSize: 18, fontWeight: '800'},
  hearts: {color: '#f87171', fontSize: 14, fontWeight: '700'},
  scroll: {padding: 12},
  worldSection: {marginBottom: 8},
  worldHeader: {
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  worldHeaderLocked: {backgroundColor: '#111827', opacity: 0.5},
  worldEmoji: {fontSize: 28},
  worldHeaderInfo: {flex: 1},
  worldName: {fontSize: 16, fontWeight: '800'},
  worldProgress: {color: '#94a3b8', fontSize: 12, marginTop: 2},
  worldComplete: {color: '#22c55e', fontSize: 14, fontWeight: '900'},
  expandArrow: {color: '#6b7280', fontSize: 12},
  worldProgressBar: {
    backgroundColor: '#1f2937',
    borderRadius: 2,
    height: 3,
    marginBottom: 4,
    marginTop: 2,
    overflow: 'hidden',
  },
  worldProgressFill: {borderRadius: 2, height: 3},
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 4,
    paddingTop: 8,
  },
  levelBtn: {
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    borderColor: '#312e81',
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  clearedLevel: {backgroundColor: 'rgba(34,197,94,0.15)', borderColor: '#22c55e'},
  currentLevel: {backgroundColor: 'rgba(251,191,36,0.1)', borderColor: '#fbbf24'},
  lockedLevel: {backgroundColor: '#111827', opacity: 0.35},
  bossLevel: {backgroundColor: 'rgba(239,68,68,0.1)', borderColor: '#ef4444'},
  levelNum: {color: '#e2e8f0', fontSize: 13, fontWeight: '800'},
  levelNumLocked: {color: '#4b5563'},
  lockIcon: {fontSize: 10, position: 'absolute'},
  clearCheck: {
    color: '#22c55e',
    fontSize: 9,
    fontWeight: '900',
    position: 'absolute',
    right: 4,
    top: 2,
  },
  bossEmoji: {fontSize: 18},
  bossSprite: {width: 22, height: 22},
  bossLabel: {color: '#ef4444', fontSize: 9, fontWeight: '900'},
  bossRaidUnlock: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bossRaidText: {color: '#94a3b8', flex: 1, fontSize: 12},
});
