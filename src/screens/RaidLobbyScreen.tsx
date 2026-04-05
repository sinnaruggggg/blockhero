import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackImageButton from '../components/BackImageButton';
import {
  getPlayerId,
  getNickname,
  loadNormalRaidProgress,
  hasSkinFromRaid,
  loadLevelProgress,
  getSelectedCharacter,
  loadCharacterData,
} from '../stores/gameStore';
import {t} from '../i18n';
import {RAID_BOSSES} from '../constants/raidBosses';
import {getRaidBossSprite} from '../assets/monsterSprites';
import {
  BOSS_RAID_MAX_PLAYERS,
  BOSS_RAID_WINDOW_MS,
  NORMAL_RAID_REWARDS,
} from '../constants';
import {MAX_PARTY_SIZE} from '../constants/raidConfig';
import {
  startRaid,
  getActiveInstances,
  joinRaidInstance,
} from '../services/raidService';
import {supabase} from '../services/supabase';
import {getFriendIds, getFriendList} from '../services/friendService';
import {
  createParty,
  joinParty,
  leaveParty,
  disbandParty,
  getMyParty,
  getPartyMembers,
} from '../services/partyService';
import PartyPanel from '../components/PartyPanel';
import FriendInviteModal from '../components/FriendInviteModal';
import {
  formatBossRaidCountdownLabel,
  getBossRaidWindowInfo,
} from '../game/raidRules';
import {getUnlockedBossRaidStages} from '../game/levelProgress';
import {getCharacterSkillEffects} from '../game/characterSkillEffects';

interface ActiveRaid {
  id: string;
  boss_stage: number;
  boss_current_hp: number;
  boss_max_hp: number;
  expires_at: string;
  starter_id: string;
}

interface PartyMemberLocal {
  playerId: string;
  nickname: string;
}

type LoadIssueKind = 'timeout' | 'supabase' | 'thrown' | 'unknown';

interface LoadIssue {
  label: string;
  kind: LoadIssueKind;
  message?: string;
}

interface LoadSummary {
  blocking: boolean;
  message: string;
  detail?: string;
  issues: LoadIssue[];
}

const QUERY_TIMEOUT_MS = 10000;
const PARTIAL_LOAD_DETAIL = '일반 레이드는 계속 플레이할 수 있습니다.';
const SOCIAL_LOAD_LABELS = new Set(['friendIds', 'friends', 'party', 'partyMembers']);
const PROGRESSION_LOAD_LABELS = new Set(['normalRaidProgress', 'levelProgress']);

function getBossNameColorStyle(color: string) {
  return {color};
}

function withTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = QUERY_TIMEOUT_MS,
) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label}_timeout`));
    }, timeoutMs);

    promise
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function getIssueMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as {message?: unknown}).message === 'string'
  ) {
    return (error as {message: string}).message;
  }
  return undefined;
}

function isSupabaseLikeError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Record<string, unknown>;
  return (
    typeof candidate.message === 'string' ||
    typeof candidate.code === 'string' ||
    typeof candidate.details === 'string' ||
    typeof candidate.hint === 'string'
  );
}

function classifyLoadIssue(label: string, error: unknown): LoadIssue {
  const message = getIssueMessage(error);

  if (message === `${label}_timeout` || message?.endsWith('_timeout')) {
    return {label, kind: 'timeout', message};
  }

  if (isSupabaseLikeError(error)) {
    return {label, kind: 'supabase', message};
  }

  if (message) {
    return {label, kind: 'thrown', message};
  }

  return {label, kind: 'unknown'};
}

function getResponseLoadIssue(label: string, value: unknown): LoadIssue | null {
  if (!value || typeof value !== 'object' || !('error' in value)) {
    return null;
  }

  const responseError = (value as {error?: unknown}).error;
  if (!responseError) {
    return null;
  }

  return classifyLoadIssue(label, responseError);
}

function logLoadIssue(issue: LoadIssue, error: unknown) {
  console.warn(`RaidLobbyScreen ${issue.label} ${issue.kind} error:`, error);
}

function buildPartialLoadSummary(issues: LoadIssue[]): LoadSummary | null {
  if (issues.length === 0) {
    return null;
  }

  const labels = new Set(issues.map(issue => issue.label));
  const hasActiveRaidIssue = labels.has('activeRaids');
  const hasSocialIssue = Array.from(labels).some(label => SOCIAL_LOAD_LABELS.has(label));
  const hasProgressIssue = Array.from(labels).some(label => PROGRESSION_LOAD_LABELS.has(label));

  if (hasActiveRaidIssue && !hasSocialIssue && !hasProgressIssue) {
    return {
      blocking: false,
      message: '활성 레이드 목록을 불러오지 못했습니다. 다시 시도해 주세요.',
      detail: PARTIAL_LOAD_DETAIL,
      issues,
    };
  }

  if (hasSocialIssue && !hasActiveRaidIssue && !hasProgressIssue) {
    return {
      blocking: false,
      message: '친구 또는 파티 정보를 일부 불러오지 못했습니다.',
      detail: PARTIAL_LOAD_DETAIL,
      issues,
    };
  }

  if (hasProgressIssue && !hasActiveRaidIssue && !hasSocialIssue) {
    return {
      blocking: false,
      message: '일부 레이드 진행 정보를 불러오지 못했습니다.',
      detail: PARTIAL_LOAD_DETAIL,
      issues,
    };
  }

  return {
    blocking: false,
    message: '일부 레이드 정보를 불러오지 못했습니다. 다시 시도해 주세요.',
    detail: PARTIAL_LOAD_DETAIL,
    issues,
  };
}

function buildBlockingLoadSummary(issue: LoadIssue): LoadSummary {
  return {
    blocking: true,
    message: '레이드 정보를 불러오지 못했습니다. 다시 시도해 주세요.',
    issues: [issue],
  };
}

export default function RaidLobbyScreen({navigation}: any) {
  const [raidMode, setRaidMode] = useState<'normal' | 'boss'>('normal');
  const [loading, setLoading] = useState(true);
  const [loadSummary, setLoadSummary] = useState<LoadSummary | null>(null);
  const [, setTick] = useState(0);
  const [activeRaids, setActiveRaids] = useState<ActiveRaid[]>([]);
  const [normalRaidProgress, setNormalRaidProgress] = useState<any>({});
  const [unlockedBossStages, setUnlockedBossStages] = useState<number[]>([]);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [partyMembers, setPartyMembers] = useState<PartyMemberLocal[]>([]);
  const [isLeader, setIsLeader] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [friendList, setFriendList] = useState<
    {id: string; nickname: string; isOnline: boolean}[]
  >([]);

  const playerIdRef = useRef('');
  const nicknameRef = useRef('');
  const partyChannelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const loadRequestRef = useRef(0);

  const bossWindowInfo = getBossRaidWindowInfo(Date.now());

  const cleanup = useCallback(() => {
    if (partyChannelRef.current) {
      supabase.removeChannel(partyChannelRef.current);
      partyChannelRef.current = null;
    }
  }, []);

  const setupPartyChannel = useCallback(
    (nextPartyId: string) => {
      cleanup();
      const channel = supabase
        .channel(`party:${nextPartyId}`)
        .on('broadcast', {event: 'party_raid_start'}, ({payload}: any) => {
          if (payload?.instanceId && payload?.bossStage) {
            cleanup();
            navigation.replace('Raid', {
              instanceId: payload.instanceId,
              bossStage: payload.bossStage,
              isNormalRaid: Boolean(payload.isNormalRaid),
            });
          }
        })
        .on('broadcast', {event: 'party_update'}, async () => {
          const {data: members} = await getPartyMembers(nextPartyId);
          if (members) {
            setPartyMembers(
              members.map((member: any) => ({
                playerId: member.player_id,
                nickname: member.nickname,
              })),
            );
          }
        })
        .subscribe();

      partyChannelRef.current = channel;
    },
    [cleanup, navigation],
  );

  const loadData = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () =>
      mountedRef.current && loadRequestRef.current === requestId;

    if (!mountedRef.current) {
      return;
    }

    setLoading(true);
    setLoadSummary(null);

    try {
      const [playerId, nickname] = await withTimeout(
        Promise.all([getPlayerId(), getNickname()]),
        'playerProfile',
      );
      if (!isCurrentRequest()) {
        return;
      }
      playerIdRef.current = playerId;
      nicknameRef.current = nickname;

      const loadIssues: LoadIssue[] = [];
      const safeLoad = async <T,>(
        label: string,
        task: () => Promise<T>,
        fallback: T,
      ): Promise<T> => {
        try {
          const value = await withTimeout(task(), label);
          const responseIssue = getResponseLoadIssue(label, value);
          if (responseIssue) {
            loadIssues.push(responseIssue);
            logLoadIssue(responseIssue, (value as {error?: unknown}).error);
            return fallback;
          }
          return value;
        } catch (error) {
          const issue = classifyLoadIssue(label, error);
          loadIssues.push(issue);
          logLoadIssue(issue, error);
          return fallback;
        }
      };

      const [friendIds, partyResult, loadedFriendList, raidProgress, levelProgress] =
        await Promise.all([
          safeLoad('friendIds', () => getFriendIds(playerId), [] as string[]),
          safeLoad('party', () => getMyParty(playerId), {data: null, error: null} as any),
          safeLoad('friends', () => getFriendList(playerId), {data: []} as any),
          safeLoad('normalRaidProgress', () => loadNormalRaidProgress(), {} as any),
          safeLoad('levelProgress', () => loadLevelProgress(), {} as any),
        ]);

      const raidFilterIds = Array.from(new Set([...(friendIds || []), playerId]));

      const activeRaidResult = await safeLoad(
        'activeRaids',
        () => getActiveInstances(raidFilterIds),
        {data: []} as any,
      );
      const raids = activeRaidResult?.data ?? [];
      const now = Date.now();
      const filteredRaids = (raids || []).filter((raid: any) => {
        const remainingMs = new Date(raid.expires_at).getTime() - now;
        return remainingMs > 0 && remainingMs <= BOSS_RAID_WINDOW_MS;
      });

      if (!isCurrentRequest()) {
        return;
      }

      setActiveRaids(filteredRaids);
      setNormalRaidProgress(raidProgress);
      setUnlockedBossStages(getUnlockedBossRaidStages(levelProgress));
      setFriendList(loadedFriendList.data || []);

      if (partyResult.data) {
        const party = partyResult.data;
        setPartyId(party.id);
        setIsLeader(party.leader_id === playerId);
        const {data: members} = await safeLoad(
          'partyMembers',
          () => getPartyMembers(party.id),
          {data: []} as any,
        );
        if (!isCurrentRequest()) {
          return;
        }
        if (members) {
          setPartyMembers(
            members.map((member: any) => ({
              playerId: member.player_id,
              nickname: member.nickname,
            })),
          );
        }
        setupPartyChannel(party.id);
      } else {
        if (!isCurrentRequest()) {
          return;
        }
        cleanup();
        setPartyId(null);
        setPartyMembers([]);
        setIsLeader(false);
      }

      setLoadSummary(buildPartialLoadSummary(loadIssues));
    } catch (error) {
      const issue = classifyLoadIssue('playerProfile', error);
      logLoadIssue(issue, error);
      if (isCurrentRequest()) {
        setLoadSummary(buildBlockingLoadSummary(issue));
      }
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
      }
    }
  }, [cleanup, setupPartyChannel]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return () => {
      mountedRef.current = false;
      unsubscribe();
      cleanup();
    };
  }, [cleanup, loadData, navigation]);

  useEffect(() => {
    const interval = setInterval(() => setTick(previous => previous + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateParty = useCallback(async () => {
    const {data, error} = await createParty(playerIdRef.current, nicknameRef.current);
    if (error || !data) {
      Alert.alert('오류', error?.message || '파티를 만들 수 없습니다.');
      return;
    }

    setPartyId(data.id);
    setIsLeader(true);
    setPartyMembers([{playerId: playerIdRef.current, nickname: nicknameRef.current}]);
    setupPartyChannel(data.id);
  }, [setupPartyChannel]);

  const handleLeaveParty = useCallback(async () => {
    if (!partyId) {
      return;
    }

    await leaveParty(partyId, playerIdRef.current);
    cleanup();
    setPartyId(null);
    setPartyMembers([]);
    setIsLeader(false);
  }, [cleanup, partyId]);

  const handleDisbandParty = useCallback(async () => {
    if (!partyId) {
      return;
    }

    await disbandParty(partyId);
    cleanup();
    setPartyId(null);
    setPartyMembers([]);
    setIsLeader(false);
  }, [cleanup, partyId]);

  const handleInviteFriend = useCallback(
    async (friendId: string) => {
      if (!partyId) {
        return;
      }

      const friend = friendList.find(entry => entry.id === friendId);
      if (!friend) {
        return;
      }

      const {error} = await joinParty(partyId, friendId, friend.nickname);
      if (error) {
        Alert.alert('오류', error.message);
        return;
      }

      partyChannelRef.current?.send({
        type: 'broadcast',
        event: 'party_update',
        payload: {},
      });

      const {data: members} = await getPartyMembers(partyId);
      if (members) {
        setPartyMembers(
          members.map((member: any) => ({
            playerId: member.player_id,
            nickname: member.nickname,
          })),
        );
      }

      setShowInviteModal(false);
    },
    [friendList, partyId],
  );

  const handleNormalRaidChallenge = useCallback(
    async (bossStage: number) => {
      const boss = RAID_BOSSES.find(entry => entry.stage === bossStage);
      if (!boss) {
        return;
      }

      const {data: instance, error} = await startRaid(
        bossStage,
        boss.maxHp,
        playerIdRef.current,
        nicknameRef.current,
        {
          expiresInMs: 365 * 24 * 60 * 60 * 1000,
          skipCooldown: true,
        },
      );

      if (error || !instance) {
        Alert.alert('오류', error?.message || '일반 레이드를 시작할 수 없습니다.');
        return;
      }

      if (partyId && partyChannelRef.current) {
        partyChannelRef.current.send({
          type: 'broadcast',
          event: 'party_raid_start',
          payload: {
            instanceId: instance.id,
            bossStage,
            isNormalRaid: true,
          },
        });
      }

      cleanup();
      navigation.replace('Raid', {
        instanceId: instance.id,
        bossStage,
        isNormalRaid: true,
      });
    },
    [cleanup, navigation, partyId],
  );

  const handleChallengeBoss = useCallback(
    async (bossStage: number) => {
      if (false && !bossWindowInfo.isOpen) {
        Alert.alert(
          '보스 레이드',
          '보스 레이드는 4시간마다 10분 동안만 열립니다.',
        );
        return;
      }

      if (!unlockedBossStages.includes(bossStage)) {
        Alert.alert(
          '보스 레이드',
          '해당 월드 30스테이지를 모두 클리어해야 도전할 수 있습니다.',
        );
        return;
      }

      const boss = RAID_BOSSES.find(entry => entry.stage === bossStage);
      if (!boss) {
        return;
      }

      const selectedCharacter = await getSelectedCharacter();
      let raidTimeBonusMs = 0;
      if (selectedCharacter) {
        const characterData = await loadCharacterData(selectedCharacter);
        raidTimeBonusMs = getCharacterSkillEffects(
          selectedCharacter,
          characterData,
          {
            mode: 'raid',
            partySize: Math.max(1, partyMembers.length || 1),
            bossHpRatio: 1,
          },
        ).raidTimeBonusMs;
      }

      const {data: instance, error} = await startRaid(
        bossStage,
        boss.maxHp,
        playerIdRef.current,
        nicknameRef.current,
        {
          expiresInMs: BOSS_RAID_WINDOW_MS + raidTimeBonusMs,
          reuseOpenInstance: true,
          skipCooldown: true,
        },
      );

      if (error || !instance) {
        Alert.alert('오류', error?.message || '보스 레이드를 시작할 수 없습니다.');
        return;
      }

      if (partyId && partyChannelRef.current) {
        partyChannelRef.current.send({
          type: 'broadcast',
          event: 'party_raid_start',
          payload: {
            instanceId: instance.id,
            bossStage,
            isNormalRaid: false,
          },
        });
      }

      cleanup();
      navigation.replace('Raid', {
        instanceId: instance.id,
        bossStage,
        isNormalRaid: false,
      });
    },
    [bossWindowInfo.isOpen, cleanup, navigation, partyId, partyMembers.length, unlockedBossStages],
  );

  const handleJoinRaid = useCallback(
    async (raid: ActiveRaid) => {
      if (!unlockedBossStages.includes(raid.boss_stage)) {
        Alert.alert('보스 레이드', '해당 단계가 아직 잠겨 있습니다.');
        return;
      }

      const {error} = await joinRaidInstance(
        raid.id,
        playerIdRef.current,
        nicknameRef.current,
      );

      if (error) {
        Alert.alert('오류', error.message);
        return;
      }

      cleanup();
      navigation.replace('Raid', {
        instanceId: raid.id,
        bossStage: raid.boss_stage,
        isNormalRaid: false,
      });
    },
    [cleanup, navigation, unlockedBossStages],
  );

  const formatHp = (hp: number) => {
    if (hp >= 1000000) {
      return `${(hp / 1000000).toFixed(1)}M`;
    }

    if (hp >= 1000) {
      return `${(hp / 1000).toFixed(0)}K`;
    }

    return hp.toString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#dc2626" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackImageButton
          onPress={() => {
            cleanup();
            navigation.goBack();
          }}
          size={42}
        />
        <TouchableOpacity
          onPress={() => {
            cleanup();
            navigation.goBack();
          }}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>레이드</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Friends')}>
          <Text style={styles.friendsBtn}>친구</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, raidMode === 'normal' && styles.modeTabActive]}
          onPress={() => setRaidMode('normal')}>
          <Text
            style={[
              styles.modeTabText,
              raidMode === 'normal' && styles.modeTabTextActive,
            ]}>
            일반 레이드
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, raidMode === 'boss' && styles.modeTabActive]}
          onPress={() => setRaidMode('boss')}>
          <Text
            style={[
              styles.modeTabText,
              raidMode === 'boss' && styles.modeTabTextActive,
            ]}>
            보스 레이드
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loadSummary && (
          <View
            style={styles.loadErrorCard}
            testID={loadSummary.blocking ? 'raid-load-error-blocking' : 'raid-load-error-partial'}>
            <Text style={styles.loadErrorText}>{loadSummary.message}</Text>
            {loadSummary.detail ? (
              <Text style={styles.loadErrorDetail}>{loadSummary.detail}</Text>
            ) : null}
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
              <Text style={styles.retryBtnText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        )}
        {raidMode === 'normal' ? (
          <>
            {false && (
              <>
            <Text style={styles.modeDesc}>
              일반 레이드는 언제든지 도전할 수 있습니다. 최초 토벌 다이아를 받고,
              이후에는 누적 토벌 수에 따라 반복 보상을 획득합니다.
            </Text>
            <Text style={styles.skinHint}>
              같은 일반 레이드를 10번 클리어하면 해당 레이드 스킨이 해금됩니다.
            </Text>

              </>
            )}
            {NORMAL_RAID_REWARDS.map(reward => {
              const boss = RAID_BOSSES.find(entry => entry.stage === reward.stage);
              if (!boss) {
                return null;
              }

              const stageProgress = normalRaidProgress[reward.stage];
              const killCount = stageProgress?.killCount ?? 0;
              const skinEarned = hasSkinFromRaid(normalRaidProgress, reward.stage);

              return (
                <View
                  key={reward.stage}
                  style={[styles.normalRaidCard, {borderColor: `${boss.color}80`}]}>
                  <Text style={styles.nrEmoji}>{boss.emoji}</Text>
                  <View style={styles.nrInfo}>
                    <Text style={[styles.nrName, {color: boss.color}]}>
                      {t(boss.nameKey)}
                      {skinEarned ? ' · 스킨 획득 완료' : ''}
                    </Text>
                    <Text style={styles.nrReward}>
                      최초 토벌 다이아 {reward.firstDia} / 반복 토벌 +{reward.perKill}
                    </Text>
                    <View style={styles.killBar}>
                      <View
                        style={[
                          styles.killBarFill,
                          {
                            width: `${Math.min((killCount / 10) * 100, 100)}%`,
                            backgroundColor: boss.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.killCount}>누적 토벌 {killCount}회</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.nrChallengeBtn,
                      {backgroundColor: `${boss.color}33`, borderColor: boss.color},
                    ]}
                    onPress={() => handleNormalRaidChallenge(reward.stage)}>
                    <Text style={[styles.nrChallengeBtnText, {color: boss.color}]}>
                      도전
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        ) : (
          <>
            <View style={styles.bossRaidScheduleCard}>
              <Text style={styles.bossRaidScheduleTitle}>보스 레이드</Text>
              <Text style={styles.bossRaidScheduleDesc}>
                서버 시간 기준 4시간마다 열리며, 열리고 나면 10분 동안만 입장할 수
                있습니다.
              </Text>
              <Text style={styles.bossRaidScheduleDesc}>
                방당 최대 {BOSS_RAID_MAX_PLAYERS}명까지 참여 가능하며, 가득 차면 새
                방이 생성됩니다.
              </Text>
              <Text style={styles.voiceHint}>
                음성 대화는 레이드 전투 안에서만 사용할 수 있습니다.
              </Text>
              <View style={styles.bossRaidTimer}>
                <Text style={styles.bossRaidTimerLabel}>
                  {bossWindowInfo.isOpen ? '현재 참여 시간' : '다음 개방까지'}
                </Text>
                <Text style={styles.bossRaidTimerValue}>
                  {formatBossRaidCountdownLabel(Date.now())}
                </Text>
              </View>
            </View>

            <Text style={styles.modeDesc}>
              각 월드 30스테이지를 모두 클리어하면 해당 단계의 보스 레이드가
              해금됩니다.
            </Text>

            {activeRaids.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>진행 중인 보스 레이드</Text>
                {activeRaids.map(raid => {
                  const boss = RAID_BOSSES.find(entry => entry.stage === raid.boss_stage);
                  if (!boss) {
                    return null;
                  }

                  const remainingMs = Math.max(
                    0,
                    new Date(raid.expires_at).getTime() - Date.now(),
                  );
                  const minutes = Math.floor(remainingMs / 60000);
                  const seconds = Math.floor((remainingMs % 60000) / 1000);

                  return (
                    <TouchableOpacity
                      key={raid.id}
                      style={[styles.activeRaidCard, {borderColor: boss.color}]}
                      onPress={() => handleJoinRaid(raid)}>
                      {getRaidBossSprite(boss.stage) ? (
                        <Image
                          source={getRaidBossSprite(boss.stage)!}
                          resizeMode="contain"
                          fadeDuration={0}
                          style={styles.activeRaidSprite}
                        />
                      ) : (
                        <Text style={styles.activeRaidEmoji}>{boss.emoji}</Text>
                      )}
                      <View style={styles.activeRaidInfo}>
                        <Text style={styles.activeRaidName}>{t(boss.nameKey)}</Text>
                        <Text style={styles.activeRaidHp}>
                          체력 {formatHp(raid.boss_current_hp)} / {formatHp(raid.boss_max_hp)}
                        </Text>
                      </View>
                      <Text style={styles.activeRaidTimer}>
                        {minutes}:{seconds.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>보스 단계</Text>
              <View style={styles.bossGrid}>
                {RAID_BOSSES.map(boss => {
                  const unlocked = unlockedBossStages.includes(boss.stage);
                  const disabled = !unlocked;

                  return (
                    <TouchableOpacity
                      key={boss.stage}
                      style={[
                        styles.bossCard,
                        {borderColor: boss.color},
                        disabled && styles.bossCardLocked,
                      ]}
                      disabled={disabled}
                      onPress={() => handleChallengeBoss(boss.stage)}>
                      {getRaidBossSprite(boss.stage) ? (
                        <Image
                          source={getRaidBossSprite(boss.stage)!}
                          resizeMode="contain"
                          fadeDuration={0}
                          style={styles.bossSprite}
                        />
                      ) : (
                        <Text style={styles.bossEmoji}>{boss.emoji}</Text>
                      )}
                      <Text style={styles.bossStage}>{boss.stage}단계</Text>
                      <Text
                        style={[
                          styles.bossName,
                          unlocked
                            ? getBossNameColorStyle(boss.color)
                            : styles.bossNameLocked,
                        ]}>
                        {t(boss.nameKey)}
                      </Text>
                      <Text style={styles.bossHp}>{formatHp(boss.maxHp)}</Text>
                      <Text
                        style={[
                          styles.unlockState,
                          unlocked ? styles.unlocked : styles.locked,
                        ]}>
                        {unlocked
                          ? bossWindowInfo.isOpen
                            ? '입장 가능'
                            : '개방 대기'
                          : '월드 클리어 필요'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        <PartyPanel
          partyId={partyId}
          members={partyMembers}
          isLeader={isLeader}
          myPlayerId={playerIdRef.current}
          onCreateParty={handleCreateParty}
          onLeaveParty={handleLeaveParty}
          onDisbandParty={handleDisbandParty}
          onInviteFriends={() => {
            if (!partyId || partyMembers.length >= MAX_PARTY_SIZE) {
              return;
            }
            setShowInviteModal(true);
          }}
        />
      </ScrollView>

      <FriendInviteModal
        visible={showInviteModal}
        friends={friendList.filter(
          friend => !partyMembers.some(member => member.playerId === friend.id),
        )}
        onInvite={handleInviteFriend}
        onClose={() => setShowInviteModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0a0a1e'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backBtn: {color: 'transparent', fontSize: 1, lineHeight: 1, opacity: 0},
  title: {color: '#e2e8f0', fontSize: 18, fontWeight: '800'},
  friendsBtn: {color: '#22c55e', fontSize: 13, fontWeight: '700'},
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: '#1e1b4b',
    borderRadius: 10,
    padding: 3,
  },
  modeTab: {flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8},
  modeTabActive: {backgroundColor: '#dc2626'},
  modeTabText: {color: '#94a3b8', fontSize: 13, fontWeight: '700'},
  modeTabTextActive: {color: '#fff'},
  scrollContent: {paddingBottom: 28, paddingHorizontal: 14},
  loadErrorCard: {
    backgroundColor: 'rgba(127,29,29,0.35)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 10,
  },
  loadErrorText: {
    color: '#fecaca',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  loadErrorDetail: {
    color: '#fde68a',
    fontSize: 11,
    lineHeight: 16,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  modeDesc: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 18,
  },
  skinHint: {
    color: '#f59e0b',
    fontSize: 12,
    marginBottom: 10,
  },
  voiceHint: {
    color: '#93c5fd',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  normalRaidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 10,
  },
  nrEmoji: {fontSize: 30},
  nrInfo: {flex: 1, gap: 4},
  nrName: {fontSize: 14, fontWeight: '800'},
  nrReward: {color: '#94a3b8', fontSize: 11},
  killBar: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  killBarFill: {height: 4, borderRadius: 2},
  killCount: {color: '#64748b', fontSize: 10},
  nrChallengeBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nrChallengeBtnText: {fontSize: 13, fontWeight: '900'},
  bossRaidScheduleCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#dc2626',
    alignItems: 'center',
    marginBottom: 10,
  },
  bossRaidScheduleTitle: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  bossRaidScheduleDesc: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  bossRaidTimer: {
    marginTop: 12,
    backgroundColor: '#0a0a1e',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  bossRaidTimerLabel: {color: '#64748b', fontSize: 11},
  bossRaidTimerValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  section: {marginBottom: 12},
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  activeRaidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  activeRaidEmoji: {fontSize: 28},
  activeRaidSprite: {width: 40, height: 40},
  activeRaidInfo: {flex: 1},
  activeRaidName: {color: '#f8fafc', fontSize: 14, fontWeight: '800'},
  activeRaidHp: {color: '#94a3b8', fontSize: 11, marginTop: 2},
  activeRaidTimer: {color: '#f87171', fontSize: 13, fontWeight: '800'},
  bossGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  bossCard: {
    width: '47%',
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    alignItems: 'center',
    minHeight: 132,
  },
  bossCardLocked: {opacity: 0.45},
  bossEmoji: {fontSize: 30},
  bossSprite: {width: 54, height: 54},
  bossStage: {color: '#e2e8f0', fontSize: 12, fontWeight: '800', marginTop: 6},
  bossName: {fontSize: 13, fontWeight: '800', marginTop: 4, textAlign: 'center'},
  bossNameLocked: {color: '#64748b'},
  bossHp: {color: '#94a3b8', fontSize: 11, marginTop: 4},
  unlockState: {fontSize: 10, fontWeight: '700', marginTop: 8, textAlign: 'center'},
  unlocked: {color: '#22c55e'},
  locked: {color: '#f87171'},
});
