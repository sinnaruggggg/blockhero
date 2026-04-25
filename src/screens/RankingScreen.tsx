import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import GamePanel from '../components/GamePanel';
import MenuScreenFrame from '../components/MenuScreenFrame';
import {formatBlockWorldToolName} from '../game/blockWorldTools';
import {
  fetchLeaderboard,
  fetchMyLeaderboardEntry,
  type LeaderboardEntry,
  type RankingMode,
  type RankingPeriod,
} from '../services/rankingService';
import {claimBlockWorldRankingReward} from '../stores/blockWorldToolStore';

const PERIOD_TABS: Array<{value: RankingPeriod; label: string}> = [
  {value: 'daily', label: '일간'},
  {value: 'weekly', label: '주간'},
  {value: 'monthly', label: '월간'},
];

const MODE_TABS: Array<{value: RankingMode; label: string}> = [
  {value: 'level', label: '레벨'},
  {value: 'endless', label: '무한'},
  {value: 'battle', label: '대전'},
  {value: 'raid', label: '레이드'},
];

function formatAuxText(mode: RankingMode, entry: LeaderboardEntry) {
  const metadata = entry.metadata ?? {};
  if (mode === 'level') {
    return `스테이지 ${metadata.levelId ?? 0} · 별 ${metadata.stars ?? 0} · 콤보 ${metadata.maxCombo ?? 0}`;
  }
  if (mode === 'endless') {
    return `레벨 ${metadata.maxLevel ?? 0} · 콤보 ${metadata.maxCombo ?? 0} · 줄 ${metadata.totalLines ?? 0}`;
  }
  if (mode === 'battle') {
    const matches = Math.max(1, entry.matches || 0);
    const winRate = Math.round(((entry.wins || 0) / matches) * 100);
    return `승 ${entry.wins} / 패 ${entry.losses} · 승률 ${winRate}% · 최고 연승 ${entry.best_streak}`;
  }
  return `단계 ${metadata.bossStage ?? 0} · 피해 ${Number(
    metadata.totalDamage ?? 0,
  ).toLocaleString()} · ${
    metadata.bossDefeated ? '처치 성공' : '미처치'
  }`;
}

function rankAccent(rank: number) {
  if (rank === 1) {
    return '#f0b84b';
  }
  if (rank === 2) {
    return '#b8c4d8';
  }
  if (rank === 3) {
    return '#c88e58';
  }
  return '#8f6036';
}

export default function RankingScreen({navigation}: any) {
  const [period, setPeriod] = useState<RankingPeriod>('daily');
  const [mode, setMode] = useState<RankingMode>('level');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingReward, setClaimingReward] = useState(false);
  const [errorText, setErrorText] = useState('');

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setErrorText('');
    try {
      const [nextEntries, nextMyEntry] = await Promise.all([
        fetchLeaderboard(mode, period, 100),
        fetchMyLeaderboardEntry(mode, period),
      ]);
      setEntries(nextEntries);
      setMyEntry(nextMyEntry);
    } catch (error: any) {
      setEntries([]);
      setMyEntry(null);
      setErrorText(
        error?.message?.includes('bh_get_leaderboard')
          ? '랭킹 SQL이 아직 적용되지 않았습니다.'
          : error?.message || '랭킹을 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, [mode, period]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const showMyPanel = useMemo(() => {
    if (!myEntry) {
      return false;
    }
    return !entries.some(entry => entry.user_id === myEntry.user_id);
  }, [entries, myEntry]);

  const handleClaimBlockWorldReward = useCallback(async () => {
    if (!myEntry) {
      return;
    }

    setClaimingReward(true);
    try {
      const result = await claimBlockWorldRankingReward({
        mode,
        period,
        rank: myEntry.rank,
      });
      if (result.alreadyClaimed || !result.tool) {
        Alert.alert('이미 받음', '이번 기간의 블록월드 보상은 이미 받았습니다.');
        return;
      }

      Alert.alert(
        '블록월드 보상 획득',
        `${formatBlockWorldToolName(result.tool)}을(를) 획득했습니다.`,
      );
    } catch (error: any) {
      Alert.alert('보상 오류', error?.message || '보상을 받을 수 없습니다.');
    } finally {
      setClaimingReward(false);
    }
  }, [mode, myEntry, period]);

  return (
    <MenuScreenFrame
      title="랭킹"
      subtitle="레벨, 무한, 대전, 레이드 기록을 기간별로 확인합니다."
      onBack={() => navigation.goBack()}>
      <GamePanel>
        <Text style={styles.sectionTitle}>기간</Text>
        <View style={styles.tabRow}>
          {PERIOD_TABS.map(tab => {
            const active = tab.value === period;
            return (
              <TouchableOpacity
                key={tab.value}
                style={[styles.tabButton, active && styles.tabButtonActive]}
                onPress={() => setPeriod(tab.value)}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, styles.modeTitle]}>모드</Text>
        <View style={styles.modeGrid}>
          {MODE_TABS.map(tab => {
            const active = tab.value === mode;
            return (
              <TouchableOpacity
                key={tab.value}
                style={[styles.modeButton, active && styles.modeButtonActive]}
                onPress={() => setMode(tab.value)}>
                <Text style={[styles.modeText, active && styles.modeTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </GamePanel>

      {!loading && myEntry ? (
        <GamePanel>
          <Text style={styles.sectionTitle}>블록월드 랭킹 보상</Text>
          <Text style={styles.rewardDescription}>
            현재 기간 내 순위 #{myEntry.rank} 기준으로 특별 삽/도끼/곡괭이 중
            하나를 받습니다.
          </Text>
          <TouchableOpacity
            activeOpacity={0.82}
            disabled={claimingReward}
            onPress={handleClaimBlockWorldReward}
            style={[
              styles.rewardButton,
              claimingReward && styles.rewardButtonDisabled,
            ]}>
            <Text style={styles.rewardButtonText}>
              {claimingReward ? '지급 중...' : '보상 받기'}
            </Text>
          </TouchableOpacity>
        </GamePanel>
      ) : null}

      <GamePanel>
        <Text style={styles.sectionTitle}>상위 100명</Text>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#7f5a32" />
            <Text style={styles.stateText}>랭킹 집계 중...</Text>
          </View>
        ) : errorText ? (
          <View style={styles.centerState}>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.stateText}>아직 기록이 없습니다.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {entries.map(entry => (
              <View key={`${entry.user_id}-${entry.rank}`} style={styles.entryRow}>
                <View
                  style={[
                    styles.rankBadge,
                    {backgroundColor: `${rankAccent(entry.rank)}22`, borderColor: rankAccent(entry.rank)},
                  ]}>
                  <Text
                    style={[styles.rankText, {color: rankAccent(entry.rank)}]}>
                    #{entry.rank}
                  </Text>
                </View>
                <View style={styles.entryMain}>
                  <Text style={styles.entryName}>{entry.nickname}</Text>
                  <Text style={styles.entryMeta}>{formatAuxText(mode, entry)}</Text>
                </View>
                <Text style={styles.entryScore}>{entry.score.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}
      </GamePanel>

      {showMyPanel && myEntry ? (
        <GamePanel>
          <Text style={styles.sectionTitle}>내 순위</Text>
          <View style={styles.entryRow}>
            <View
              style={[
                styles.rankBadge,
                styles.myRankBadge,
              ]}>
              <Text style={[styles.rankText, styles.myRankText]}>
                #{myEntry.rank}
              </Text>
            </View>
            <View style={styles.entryMain}>
              <Text style={styles.entryName}>{myEntry.nickname}</Text>
              <Text style={styles.entryMeta}>{formatAuxText(mode, myEntry)}</Text>
            </View>
            <Text style={styles.entryScore}>{myEntry.score.toLocaleString()}</Text>
          </View>
        </GamePanel>
      ) : null}
    </MenuScreenFrame>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: '#4f3118',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
  },
  modeTitle: {
    marginTop: 6,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tabButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#c7a176',
    backgroundColor: '#fff7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#7f5a32',
    borderColor: '#4f3118',
  },
  tabText: {
    color: '#6f4c2a',
    fontSize: 15,
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#fff8ec',
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modeButton: {
    width: '48%',
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#c7a176',
    backgroundColor: '#fff7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#7f5a32',
    borderColor: '#4f3118',
  },
  modeText: {
    color: '#6f4c2a',
    fontSize: 15,
    fontWeight: '900',
  },
  modeTextActive: {
    color: '#fff8ec',
  },
  rewardDescription: {
    color: '#876346',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 12,
  },
  rewardButton: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4f3118',
    backgroundColor: '#7f5a32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardButtonDisabled: {
    opacity: 0.58,
  },
  rewardButtonText: {
    color: '#fff8ec',
    fontSize: 15,
    fontWeight: '900',
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  stateText: {
    color: '#876346',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },
  errorText: {
    color: '#a94436',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    gap: 10,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff8ef',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d7b48e',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rankBadge: {
    minWidth: 54,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  myRankBadge: {
    backgroundColor: '#7f5a3222',
    borderColor: '#7f5a32',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '900',
  },
  myRankText: {
    color: '#7f5a32',
  },
  entryMain: {
    flex: 1,
  },
  entryName: {
    color: '#4f3118',
    fontSize: 16,
    fontWeight: '900',
  },
  entryMeta: {
    color: '#886447',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  entryScore: {
    color: '#7f5a32',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'right',
  },
});
