import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackImageButton from '../components/BackImageButton';
import {ACHIEVEMENTS, DAILY_MISSIONS} from '../constants';
import {t} from '../i18n';
import {
  AchievementData,
  DailyStats,
  GameData,
  MissionData,
  loadAchievements,
  loadDailyStats,
  loadEndlessStats,
  loadGameData,
  loadLevelProgress,
  loadMissionData,
} from '../stores/gameStore';
import {
  claimAchievementReward,
  claimMissionReward,
  getEconomyErrorCode,
} from '../services/economyService';
import {playGameSfx} from '../services/gameSfx';

export default function MissionsScreen({navigation}: any) {
  const [tab, setTab] = useState<'missions' | 'achievements'>('missions');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [missionData, setMissionData] = useState<MissionData | null>(null);
  const [achievementData, setAchievementData] = useState<AchievementData>({});
  const [allStats, setAllStats] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const [
        loadedGameData,
        loadedDailyStats,
        loadedMissionData,
        loadedAchievementData,
        endlessStats,
        levelProgress,
      ] = await Promise.all([
        loadGameData(),
        loadDailyStats(),
        loadMissionData(),
        loadAchievements(),
        loadEndlessStats(),
        loadLevelProgress(),
      ]);

      setGameData(loadedGameData);
      setDailyStats(loadedDailyStats);
      setMissionData(loadedMissionData);
      setAchievementData(loadedAchievementData);
      const totalLevelClears = Object.values(levelProgress).filter(progress => progress.cleared).length;

      setAllStats({
        dailyGames: loadedDailyStats.games,
        dailyScore: loadedDailyStats.score,
        dailyLines: loadedDailyStats.lines,
        dailyMaxCombo: loadedDailyStats.maxCombo,
        dailyLevelClears: loadedDailyStats.levelClears,
        totalLevelClears,
        endlessHighScore: endlessStats.highScore,
        totalLines: endlessStats.totalLines + loadedDailyStats.lines,
        maxCombo: Math.max(endlessStats.maxCombo, loadedDailyStats.maxCombo),
        totalGames: endlessStats.totalGames + loadedDailyStats.games,
        endlessMaxLevel: endlessStats.maxLevel,
      });
    });

    return unsubscribe;
  }, [navigation]);

  const handleClaimMission = async (missionId: string, reward: number) => {
    if (!missionData || !gameData) {
      return;
    }

    try {
      const result = await claimMissionReward(missionId);
      setMissionData(result.missionData);
      setGameData(result.gameData);
      playGameSfx('reward');
      Alert.alert(t('missions.rewardClaimed'), t('missions.starsEarned', result.reward));
    } catch (error) {
      const code = getEconomyErrorCode(error);
      if (code === 'mission_already_claimed') {
        Alert.alert(t('common.notice'), t('common.done'));
        return;
      }

      Alert.alert(t('common.notice'), t('game.tryAgain'));
    }
  };

  const handleClaimAchievement = async (achievementId: string, reward: number) => {
    if (!gameData) {
      return;
    }

    try {
      const result = await claimAchievementReward(achievementId);
      setAchievementData(result.achievementData);
      setGameData(result.gameData);
      playGameSfx('reward');
      Alert.alert(
        t('missions.achievementClaimed'),
        t('missions.starsEarned', result.reward),
      );
    } catch (error) {
      const code = getEconomyErrorCode(error);
      if (code === 'achievement_already_claimed') {
        Alert.alert(t('common.notice'), t('common.done'));
        return;
      }

      Alert.alert(t('common.notice'), t('game.tryAgain'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackImageButton onPress={() => navigation.goBack()} size={42} />
        <Text style={styles.title}>{t('missions.title')}</Text>
        <Text style={styles.stars}>골드 {gameData?.gold ?? 0}</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'missions' && styles.activeTab]}
          onPress={() => setTab('missions')}>
          <Text style={[styles.tabText, tab === 'missions' && styles.activeTabText]}>
            {t('missions.daily')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'achievements' && styles.activeTab]}
          onPress={() => setTab('achievements')}>
          <Text style={[styles.tabText, tab === 'achievements' && styles.activeTabText]}>
            {t('missions.achievements')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === 'missions' && dailyStats && missionData && (
          <>
            {DAILY_MISSIONS.map(mission => {
              const currentValue = allStats[mission.stat] || 0;
              const progress = Math.min(currentValue / mission.target, 1);
              const completed = currentValue >= mission.target;
              const claimed = missionData.claimed[mission.id];

              return (
                <View key={mission.id} style={styles.missionCard}>
                  <View style={styles.missionInfo}>
                    <Text style={styles.missionTitle}>{t(`mission.${mission.id}`)}</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, {width: `${progress * 100}%`}]} />
                    </View>
                    <Text style={styles.progressText}>
                      {currentValue} / {mission.target}
                    </Text>
                  </View>
                  <TouchableOpacity
                    disabled={!completed || claimed}
                    style={[
                      styles.claimBtn,
                      !completed && styles.claimDisabled,
                      claimed && styles.claimedBtn,
                    ]}
                    onPress={() => handleClaimMission(mission.id, mission.reward)}>
                    <Text style={styles.claimText}>
                      {claimed ? t('common.done') : `골드 ${mission.reward}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {tab === 'achievements' && (
          <>
            {ACHIEVEMENTS.map(achievement => {
              const currentValue = allStats[achievement.stat] || 0;
              const progress = Math.min(currentValue / achievement.target, 1);
              const completed = currentValue >= achievement.target;
              const claimed = achievementData[achievement.id];

              return (
                <View key={achievement.id} style={styles.missionCard}>
                  <View style={styles.missionInfo}>
                    <Text style={styles.missionTitle}>{t(`achieve.${achievement.id}.title`)}</Text>
                    <Text style={styles.achieveDesc}>{t(`achieve.${achievement.id}.desc`)}</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, {width: `${progress * 100}%`}]} />
                    </View>
                    <Text style={styles.progressText}>
                      {currentValue} / {achievement.target}
                    </Text>
                  </View>
                  <TouchableOpacity
                    disabled={!completed || claimed}
                    style={[
                      styles.claimBtn,
                      !completed && styles.claimDisabled,
                      claimed && styles.claimedBtn,
                    ]}
                    onPress={() => handleClaimAchievement(achievement.id, achievement.reward)}>
                    <Text style={styles.claimText}>
                      {claimed ? t('common.done') : `골드 ${achievement.reward}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
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
  title: {color: '#e2e8f0', fontSize: 18, fontWeight: '800'},
  stars: {color: '#fbbf24', fontSize: 14, fontWeight: '600'},
  tabs: {
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 12,
    marginHorizontal: 16,
    padding: 4,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    paddingVertical: 10,
  },
  activeTab: {backgroundColor: '#6366f1'},
  tabText: {color: '#94a3b8', fontSize: 14, fontWeight: '700'},
  activeTabText: {color: '#fff'},
  scroll: {gap: 10, padding: 16},
  missionCard: {
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    borderColor: '#312e81',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  missionInfo: {flex: 1},
  missionTitle: {color: '#e2e8f0', fontSize: 14, fontWeight: '700'},
  achieveDesc: {color: '#94a3b8', fontSize: 11, marginTop: 2},
  progressBar: {
    backgroundColor: '#312e81',
    borderRadius: 3,
    height: 6,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {backgroundColor: '#6366f1', borderRadius: 3, height: '100%'},
  progressText: {color: '#94a3b8', fontSize: 11, marginTop: 4},
  claimBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  claimDisabled: {backgroundColor: '#374151', opacity: 0.5},
  claimedBtn: {backgroundColor: '#22c55e'},
  claimText: {color: '#fff', fontSize: 12, fontWeight: '700'},
});
