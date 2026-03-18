import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {t} from '../i18n';
import {DAILY_MISSIONS, ACHIEVEMENTS} from '../constants';
import {
  loadGameData, addStars, loadDailyStats, loadEndlessStats,
  loadMissionData, claimMission, loadAchievements, claimAchievement,
  loadLevelProgress, GameData, DailyStats, MissionData, AchievementData,
} from '../stores/gameStore';

export default function MissionsScreen({navigation}: any) {
  const [tab, setTab] = useState<'missions' | 'achievements'>('missions');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [missionData, setMissionData] = useState<MissionData | null>(null);
  const [achievementData, setAchievementData] = useState<AchievementData>({});
  const [allStats, setAllStats] = useState<any>({});

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const gd = await loadGameData();
      setGameData(gd);
      setDailyStats(await loadDailyStats());
      setMissionData(await loadMissionData());
      setAchievementData(await loadAchievements());

      const endless = await loadEndlessStats();
      const progress = await loadLevelProgress();
      const daily = await loadDailyStats();
      const totalLevelClears = Object.values(progress).filter(p => p.cleared).length;

      setAllStats({
        dailyGames: daily.games,
        dailyScore: daily.score,
        dailyLines: daily.lines,
        dailyMaxCombo: daily.maxCombo,
        dailyLevelClears: daily.levelClears,
        totalLevelClears,
        endlessHighScore: endless.highScore,
        totalLines: endless.totalLines + daily.lines,
        maxCombo: Math.max(endless.maxCombo, daily.maxCombo),
        totalGames: endless.totalGames + daily.games,
        endlessMaxLevel: endless.maxLevel,
      });
    });
    return unsubscribe;
  }, [navigation]);

  const handleClaimMission = async (missionId: string, reward: number) => {
    if (!missionData || !gameData) return;
    const updated = await claimMission(missionData, missionId);
    setMissionData(updated);
    const updatedGd = await addStars(gameData, reward);
    setGameData(updatedGd);
    Alert.alert(t('missions.rewardClaimed'), t('missions.starsEarned', reward));
  };

  const handleClaimAchievement = async (achievementId: string, reward: number) => {
    if (!gameData) return;
    const updated = await claimAchievement(achievementData, achievementId);
    setAchievementData(updated);
    const updatedGd = await addStars(gameData, reward);
    setGameData(updatedGd);
    Alert.alert(t('missions.achievementClaimed'), t('missions.starsEarned', reward));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>{t('common.home')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('missions.title')}</Text>
        <Text style={styles.stars}>⭐ {gameData?.stars ?? 0}</Text>
      </View>

      {/* Tabs */}
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
              const current = allStats[mission.stat] || 0;
              const progress = Math.min(current / mission.target, 1);
              const completed = current >= mission.target;
              const claimed = missionData.claimed[mission.id];
              return (
                <View key={mission.id} style={styles.missionCard}>
                  <View style={styles.missionInfo}>
                    <Text style={styles.missionTitle}>{t(`mission.${mission.id}`)}</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, {width: `${progress * 100}%`}]} />
                    </View>
                    <Text style={styles.progressText}>
                      {current} / {mission.target}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.claimBtn,
                      !completed && styles.claimDisabled,
                      claimed && styles.claimedBtn,
                    ]}
                    onPress={() => handleClaimMission(mission.id, mission.reward)}
                    disabled={!completed || claimed}>
                    <Text style={styles.claimText}>
                      {claimed ? t('common.done') : `⭐ ${mission.reward}`}
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
              const current = allStats[achievement.stat] || 0;
              const progress = Math.min(current / achievement.target, 1);
              const completed = current >= achievement.target;
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
                      {current} / {achievement.target}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.claimBtn,
                      !completed && styles.claimDisabled,
                      claimed && styles.claimedBtn,
                    ]}
                    onPress={() => handleClaimAchievement(achievement.id, achievement.reward)}
                    disabled={!completed || claimed}>
                    <Text style={styles.claimText}>
                      {claimed ? t('common.done') : `⭐ ${achievement.reward}`}
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
  container: {flex: 1, backgroundColor: '#0f0a2e'},
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: {color: '#a5b4fc', fontSize: 14, fontWeight: '600'},
  title: {color: '#e2e8f0', fontSize: 18, fontWeight: '800'},
  stars: {color: '#fbbf24', fontSize: 14, fontWeight: '600'},
  tabs: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#1e1b4b', borderRadius: 12, padding: 4,
  },
  tab: {flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10},
  activeTab: {backgroundColor: '#6366f1'},
  tabText: {color: '#94a3b8', fontSize: 14, fontWeight: '700'},
  activeTabText: {color: '#fff'},
  scroll: {padding: 16, gap: 10},
  missionCard: {
    backgroundColor: '#1e1b4b', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#312e81',
  },
  missionInfo: {flex: 1},
  missionTitle: {color: '#e2e8f0', fontSize: 14, fontWeight: '700'},
  achieveDesc: {color: '#94a3b8', fontSize: 11, marginTop: 2},
  progressBar: {
    height: 6, backgroundColor: '#312e81', borderRadius: 3,
    marginTop: 6, overflow: 'hidden',
  },
  progressFill: {height: '100%', backgroundColor: '#6366f1', borderRadius: 3},
  progressText: {color: '#94a3b8', fontSize: 11, marginTop: 4},
  claimBtn: {
    backgroundColor: '#6366f1', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10,
  },
  claimDisabled: {backgroundColor: '#374151', opacity: 0.5},
  claimedBtn: {backgroundColor: '#22c55e'},
  claimText: {color: '#fff', fontSize: 12, fontWeight: '700'},
});
