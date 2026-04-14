import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import GameBottomNav, {
  GAME_BOTTOM_NAV_CHAT_OFFSET,
} from '../components/GameBottomNav';
import { useCreatorConfig } from '../hooks/useCreatorConfig';
import {
  getPlayerId,
  getNickname,
  loadNormalRaidProgress,
  hasSkinFromRaid,
  loadLevelProgress,
  getSelectedCharacter,
  loadCharacterData,
} from '../stores/gameStore';
import { t } from '../i18n';
import { RAID_BOSSES } from '../constants/raidBosses';
import { getRaidBossSprite } from '../assets/monsterSprites';
import {
  BOSS_RAID_MAX_PLAYERS,
  BOSS_RAID_WINDOW_MS,
  NORMAL_RAID_REWARDS,
} from '../constants';
import { MAX_PARTY_SIZE } from '../constants/raidConfig';
import {
  startRaid,
  getActiveInstances,
  joinRaidInstance,
  getPartyActiveRaid,
} from '../services/raidService';
import { supabase } from '../services/supabase';
import {
  getFriendIds,
  getFriendList,
  searchOnlinePlayers,
} from '../services/friendService';
import {
  acceptPartyInvite,
  createParty,
  createPartyInvite,
  declinePartyInvite,
  leaveParty,
  disbandParty,
  getIncomingPartyInvites,
  getMyParty,
  getPartyMembers,
} from '../services/partyService';
import PartyPanel from '../components/PartyPanel';
import FriendInviteModal, {
  type InviteCandidate,
} from '../components/FriendInviteModal';
import LobbyChatPanel from '../components/LobbyChatPanel';
import {
  formatBossRaidCountdownLabel,
  getBossRaidWindowInfo,
} from '../game/raidRules';
import {
  listCreatorRaids,
  resolveCreatorRaidRuntime,
} from '../game/creatorManifest';
import { getUnlockedBossRaidStages } from '../game/levelProgress';
import { getCharacterSkillEffects } from '../game/characterSkillEffects';
import { getAdminStatus } from '../services/adminSync';
import { useLobbyChat } from '../hooks/useLobbyChat';

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

interface PartyInviteLocal {
  id: string;
  partyId: string;
  inviterId: string;
  inviterNickname: string;
  expiresAt: string;
  createdAt: string;
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
const SOCIAL_LOAD_LABELS = new Set([
  'friendIds',
  'friends',
  'party',
  'partyMembers',
  'incomingInvites',
  'partyActiveRaid',
]);
const PROGRESSION_LOAD_LABELS = new Set([
  'normalRaidProgress',
  'levelProgress',
]);

function getBossNameColorStyle(color: string) {
  return { color };
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
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
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
    return { label, kind: 'timeout', message };
  }

  if (isSupabaseLikeError(error)) {
    return { label, kind: 'supabase', message };
  }

  if (message) {
    return { label, kind: 'thrown', message };
  }

  return { label, kind: 'unknown' };
}

function getResponseLoadIssue(label: string, value: unknown): LoadIssue | null {
  if (!value || typeof value !== 'object' || !('error' in value)) {
    return null;
  }

  const responseError = (value as { error?: unknown }).error;
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
  const hasSocialIssue = Array.from(labels).some(label =>
    SOCIAL_LOAD_LABELS.has(label),
  );
  const hasProgressIssue = Array.from(labels).some(label =>
    PROGRESSION_LOAD_LABELS.has(label),
  );

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

function getPartyInviteErrorMessage(message?: string) {
  switch (message) {
    case 'leader_only':
      return '파티장만 초대할 수 있습니다.';
    case 'self_invite':
      return '자기 자신은 초대할 수 없습니다.';
    case 'player_offline':
      return '접속 중인 유저만 초대할 수 있습니다.';
    case 'already_in_party':
      return '이미 파티에 속한 유저입니다.';
    case 'invitee_in_other_party':
      return '상대방이 이미 다른 파티에 속해 있습니다.';
    case 'invite_already_pending':
      return '이미 보낸 파티 초대가 있습니다.';
    case 'party_full':
      return '파티가 가득 찼습니다.';
    case 'party_not_found':
      return '파티를 찾을 수 없습니다.';
    case 'invite_expired':
      return '초대가 만료되었습니다.';
    case 'invite_not_found':
      return '초대를 찾을 수 없습니다.';
    case 'invite_not_pending':
      return '이미 처리된 초대입니다.';
    default:
      return message || '파티 초대를 처리할 수 없습니다.';
  }
}

function inferPartyRaidIsNormal(instance: {
  started_at?: string;
  expires_at?: string;
}) {
  const startedAt = Date.parse(instance.started_at ?? '');
  const expiresAt = Date.parse(instance.expires_at ?? '');
  if (!Number.isFinite(startedAt) || !Number.isFinite(expiresAt)) {
    return false;
  }

  return expiresAt - startedAt >= 24 * 60 * 60 * 1000;
}

export default function RaidLobbyScreen({ navigation }: any) {
  const { manifest: creatorManifest } = useCreatorConfig();
  const [raidMode, setRaidMode] = useState<'normal' | 'boss'>('normal');
  const [loading, setLoading] = useState(true);
  const [loadSummary, setLoadSummary] = useState<LoadSummary | null>(null);
  const [, setTick] = useState(0);
  const [activeRaids, setActiveRaids] = useState<ActiveRaid[]>([]);
  const [normalRaidProgress, setNormalRaidProgress] = useState<any>({});
  const [unlockedBossStages, setUnlockedBossStages] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [partyMembers, setPartyMembers] = useState<PartyMemberLocal[]>([]);
  const [isLeader, setIsLeader] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [friendList, setFriendList] = useState<InviteCandidate[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<PartyInviteLocal[]>(
    [],
  );
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [inviteSearchResults, setInviteSearchResults] = useState<
    InviteCandidate[]
  >([]);
  const [inviteSearching, setInviteSearching] = useState(false);
  const [chatPlayerId, setChatPlayerId] = useState('');
  const [chatNickname, setChatNickname] = useState('');
  const [chatSessionKey, setChatSessionKey] = useState(0);

  const creatorNormalRaids = useMemo(
    () =>
      listCreatorRaids(creatorManifest, 'normal').filter(
        raid => raid.enabled !== false,
      ),
    [creatorManifest],
  );
  const creatorBossRaids = useMemo(
    () =>
      listCreatorRaids(creatorManifest, 'boss').filter(
        raid => raid.enabled !== false,
      ),
    [creatorManifest],
  );
  const normalRaidEntries = useMemo(() => {
    if (creatorNormalRaids.length > 0) {
      return creatorNormalRaids.map(raid => {
        const raidDisplay = resolveCreatorRaidRuntime(
          creatorManifest,
          'normal',
          raid.stage,
        );
        return {
          stage: raid.stage,
          name: raidDisplay?.name ?? raid.name,
          color: raidDisplay?.monsterColor ?? '#22c55e',
          emoji: raidDisplay?.monsterEmoji ?? '⚔',
          maxHp: raidDisplay?.maxHp ?? 0,
          reward: raid.reward,
        };
      });
    }

    return NORMAL_RAID_REWARDS.map(reward => {
      const boss =
        RAID_BOSSES.find(entry => entry.stage === reward.stage) ??
        RAID_BOSSES[0];
      return {
        stage: reward.stage,
        name: t(boss.nameKey),
        color: boss.color,
        emoji: boss.emoji,
        maxHp: boss.maxHp,
        reward: {
          firstClearDiamondReward: reward.firstDia,
          repeatDiamondReward: reward.perKill,
        },
      };
    });
  }, [creatorManifest, creatorNormalRaids]);
  const bossRaidEntries = useMemo(() => {
    if (creatorBossRaids.length > 0) {
      return creatorBossRaids.map(raid => {
        const raidDisplay = resolveCreatorRaidRuntime(
          creatorManifest,
          'boss',
          raid.stage,
        );
        return {
          stage: raid.stage,
          name: raidDisplay?.name ?? raid.name,
          color: raidDisplay?.monsterColor ?? '#ef4444',
          emoji: raidDisplay?.monsterEmoji ?? '⚔',
          maxHp: raidDisplay?.maxHp ?? 0,
        };
      });
    }

    return RAID_BOSSES.map(boss => ({
      stage: boss.stage,
      name: t(boss.nameKey),
      color: boss.color,
      emoji: boss.emoji,
      maxHp: boss.maxHp,
    }));
  }, [creatorBossRaids, creatorManifest]);

  const playerIdRef = useRef('');
  const nicknameRef = useRef('');
  const partyChannelRef = useRef<any>(null);
  const inviteChannelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const loadRequestRef = useRef(0);
  const loadDataRef = useRef<() => Promise<void>>(async () => {});
  const lobbyChat = useLobbyChat({
    mode: 'raid',
    userId: chatPlayerId,
    nickname: chatNickname,
    enabled: !loading && !!chatPlayerId && !!chatNickname,
    sessionKey: chatSessionKey,
  });

  const bossWindowInfo = getBossRaidWindowInfo(Date.now());
  const resolveRaidDisplay = useCallback(
    (raidType: 'normal' | 'boss', stage: number) => {
      const creatorRaid = resolveCreatorRaidRuntime(
        creatorManifest,
        raidType,
        stage,
      );
      const staticBoss =
        RAID_BOSSES.find(entry => entry.stage === stage) ?? RAID_BOSSES[0];
      return {
        name: creatorRaid?.name ?? t(staticBoss.nameKey),
        color: creatorRaid?.monsterColor ?? staticBoss.color,
        emoji: creatorRaid?.monsterEmoji ?? staticBoss.emoji,
        maxHp: creatorRaid?.maxHp ?? staticBoss.maxHp,
        timeLimitMs:
          creatorRaid?.timeLimitMs ??
          (raidType === 'normal' ? 15 * 60 * 1000 : BOSS_RAID_WINDOW_MS),
        reward: creatorRaid?.reward ?? {
          firstClearDiamondReward:
            NORMAL_RAID_REWARDS.find(entry => entry.stage === stage)
              ?.firstDia ?? 0,
          repeatDiamondReward:
            NORMAL_RAID_REWARDS.find(entry => entry.stage === stage)?.perKill ??
            0,
        },
      };
    },
    [creatorManifest],
  );

  const cleanupPartyChannel = useCallback(() => {
    if (partyChannelRef.current) {
      supabase.removeChannel(partyChannelRef.current);
      partyChannelRef.current = null;
    }
  }, []);

  const cleanupInviteChannel = useCallback(() => {
    if (inviteChannelRef.current) {
      supabase.removeChannel(inviteChannelRef.current);
      inviteChannelRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    cleanupPartyChannel();
    cleanupInviteChannel();
  }, [cleanupInviteChannel, cleanupPartyChannel]);

  const setupPartyChannel = useCallback(
    (nextPartyId: string) => {
      cleanupPartyChannel();
      const channel = supabase
        .channel(`party:${nextPartyId}`)
        .on('broadcast', { event: 'party_raid_start' }, ({ payload }: any) => {
          if (payload?.instanceId && payload?.bossStage) {
            cleanup();
            navigation.replace('Raid', {
              instanceId: payload.instanceId,
              bossStage: payload.bossStage,
              isNormalRaid: Boolean(payload.isNormalRaid),
            });
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'party_members',
            filter: `party_id=eq.${nextPartyId}`,
          },
          () => {
            void loadDataRef.current();
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'parties',
            filter: `id=eq.${nextPartyId}`,
          },
          () => {
            void loadDataRef.current();
          },
        )
        .subscribe(status => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('RaidLobbyScreen party channel error:', nextPartyId);
          }
        });
      partyChannelRef.current = channel;
    },
    [cleanup, cleanupPartyChannel, navigation],
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
      setChatPlayerId(playerId);
      setChatNickname(nickname);
      setChatSessionKey(current => current + 1);

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
            logLoadIssue(responseIssue, (value as { error?: unknown }).error);
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

      const [
        friendIds,
        partyResult,
        loadedFriendList,
        loadedInvites,
        raidProgress,
        levelProgress,
        adminStatus,
      ] = await Promise.all([
        safeLoad('friendIds', () => getFriendIds(playerId), [] as string[]),
        safeLoad('party', () => getMyParty(playerId), {
          data: null,
          error: null,
        } as any),
        safeLoad('friends', () => getFriendList(playerId), { data: [] } as any),
        safeLoad('incomingInvites', () => getIncomingPartyInvites(playerId), {
          data: [],
        } as any),
        safeLoad(
          'normalRaidProgress',
          () => loadNormalRaidProgress(),
          {} as any,
        ),
        safeLoad('levelProgress', () => loadLevelProgress(), {} as any),
        getAdminStatus().catch(() => false),
      ]);

      const raidFilterIds = Array.from(
        new Set([...(friendIds || []), playerId]),
      );

      const activeRaidResult = await safeLoad(
        'activeRaids',
        () => getActiveInstances(raidFilterIds),
        { data: [] } as any,
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
      setIsAdmin(adminStatus);
      setUnlockedBossStages(
        adminStatus
          ? RAID_BOSSES.map(boss => boss.stage)
          : getUnlockedBossRaidStages(levelProgress),
      );
      setFriendList(loadedFriendList.data || []);
      setIncomingInvites(
        (loadedInvites.data || []).map((invite: any) => ({
          id: invite.id,
          partyId: invite.party_id,
          inviterId: invite.inviter_id,
          inviterNickname: invite.inviter_nickname,
          expiresAt: invite.expires_at,
          createdAt: invite.created_at,
        })),
      );

      if (partyResult.data) {
        const party = partyResult.data;
        setPartyId(party.id);
        setIsLeader(party.leader_id === playerId);
        const { data: members } = await safeLoad(
          'partyMembers',
          () => getPartyMembers(party.id),
          { data: [] } as any,
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

        const partyActiveRaidResult = await safeLoad(
          'partyActiveRaid',
          () => getPartyActiveRaid(party.id),
          { data: null, error: null } as any,
        );
        if (!isCurrentRequest()) {
          return;
        }

        const partyActiveRaid = partyActiveRaidResult?.data ?? null;
        if (partyActiveRaid) {
          cleanup();
          navigation.replace('Raid', {
            instanceId: partyActiveRaid.id,
            bossStage: partyActiveRaid.boss_stage,
            isNormalRaid: inferPartyRaidIsNormal(partyActiveRaid),
          });
          return;
        }
      } else {
        if (!isCurrentRequest()) {
          return;
        }
        cleanupPartyChannel();
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
  }, [cleanup, cleanupPartyChannel, navigation, setupPartyChannel]);

  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

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
    cleanupInviteChannel();

    if (!chatPlayerId) {
      return;
    }

    const channel = supabase
      .channel(`party-invites:${chatPlayerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'party_invites',
          filter: `invitee_id=eq.${chatPlayerId}`,
        },
        () => {
          void loadDataRef.current();
        },
      )
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('RaidLobbyScreen invite channel error:', chatPlayerId);
        }
      });

    inviteChannelRef.current = channel;

    return () => {
      cleanupInviteChannel();
    };
  }, [chatPlayerId, cleanupInviteChannel]);

  useEffect(() => {
    const interval = setInterval(() => setTick(previous => previous + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const resetInviteModal = useCallback(() => {
    setShowInviteModal(false);
    setInviteSearchQuery('');
    setInviteSearchResults([]);
  }, []);

  const handleCreateParty = useCallback(async () => {
    const { data, error } = await createParty(
      playerIdRef.current,
      nicknameRef.current,
    );
    if (error || !data) {
      Alert.alert('오류', error?.message || '파티를 만들 수 없습니다.');
      return;
    }

    setPartyId(data.id);
    setIsLeader(true);
    setPartyMembers([
      { playerId: playerIdRef.current, nickname: nicknameRef.current },
    ]);
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
    resetInviteModal();
  }, [cleanup, partyId, resetInviteModal]);

  const handleDisbandParty = useCallback(async () => {
    if (!partyId) {
      return;
    }

    await disbandParty(partyId);
    cleanup();
    setPartyId(null);
    setPartyMembers([]);
    setIsLeader(false);
    resetInviteModal();
  }, [cleanup, partyId, resetInviteModal]);

  const handleSearchInviteTargets = useCallback(async () => {
    if (!partyId || !isLeader) {
      return;
    }

    const query = inviteSearchQuery.trim();
    if (!query) {
      setInviteSearchResults([]);
      return;
    }

    setInviteSearching(true);
    try {
      const { data, error } = await searchOnlinePlayers(
        query,
        playerIdRef.current,
      );
      if (error) {
        Alert.alert('검색 오류', error.message || '유저를 찾을 수 없습니다.');
        return;
      }

      setInviteSearchResults(
        (data || []).filter(
          candidate =>
            !partyMembers.some(member => member.playerId === candidate.id),
        ),
      );
    } finally {
      setInviteSearching(false);
    }
  }, [inviteSearchQuery, isLeader, partyId, partyMembers]);

  const handleInvitePlayer = useCallback(
    async (inviteeId: string, inviteeNickname?: string) => {
      if (!partyId) {
        Alert.alert('파티 초대', '먼저 파티를 만들어 주세요.');
        return;
      }
      if (!isLeader) {
        Alert.alert('파티 초대', '파티장만 초대할 수 있습니다.');
        return;
      }

      const { error } = await createPartyInvite(
        partyId,
        playerIdRef.current,
        inviteeId,
        nicknameRef.current,
        inviteeNickname,
      );
      if (error) {
        Alert.alert('파티 초대', getPartyInviteErrorMessage(error.message));
        return;
      }

      resetInviteModal();
      setInviteSearchResults(current =>
        current.filter(candidate => candidate.id !== inviteeId),
      );
      void loadDataRef.current();
      Alert.alert(
        '파티 초대',
        `${inviteeNickname || '대상 유저'}에게 초대를 보냈습니다.`,
      );
    },
    [isLeader, partyId, resetInviteModal],
  );

  const handleAcceptInvite = useCallback(async (inviteId: string) => {
    const { error } = await acceptPartyInvite(
      inviteId,
      playerIdRef.current,
      nicknameRef.current,
    );
    if (error) {
      Alert.alert('파티 초대', getPartyInviteErrorMessage(error.message));
      return;
    }

    await loadDataRef.current();
  }, []);

  const handleDeclineInvite = useCallback(async (inviteId: string) => {
    const { error } = await declinePartyInvite(inviteId, playerIdRef.current);
    if (error) {
      Alert.alert('파티 초대', getPartyInviteErrorMessage(error.message));
      return;
    }

    await loadDataRef.current();
  }, []);

  const handleInviteFromChat = useCallback(
    (inviteeId: string, inviteeNickname: string) => {
      if (inviteeId === playerIdRef.current) {
        return;
      }

      if (!partyId) {
        Alert.alert('파티 초대', '먼저 파티를 만들어 주세요.');
        return;
      }

      if (!isLeader) {
        Alert.alert('파티 초대', '파티장만 초대할 수 있습니다.');
        return;
      }

      Alert.alert(
        '파티 초대',
        `${inviteeNickname}님에게 파티 초대를 보내겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '초대',
            onPress: () => {
              void handleInvitePlayer(inviteeId, inviteeNickname);
            },
          },
        ],
      );
    },
    [handleInvitePlayer, isLeader, partyId],
  );

  const handleNormalRaidChallenge = useCallback(
    async (bossStage: number) => {
      if (partyId && !isLeader) {
        Alert.alert('파티 레이드', '파티장만 레이드를 시작할 수 있습니다.');
        return;
      }

      const raidDisplay = resolveRaidDisplay('normal', bossStage);

      const { data: instance, error } = await startRaid(
        bossStage,
        raidDisplay.maxHp,
        playerIdRef.current,
        nicknameRef.current,
        {
          expiresInMs: Math.max(
            365 * 24 * 60 * 60 * 1000,
            raidDisplay.timeLimitMs,
          ),
          skipCooldown: true,
          partyId,
        },
      );

      if (error || !instance) {
        Alert.alert(
          '오류',
          error?.message || '일반 레이드를 시작할 수 없습니다.',
        );
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
    [cleanup, isLeader, navigation, partyId, resolveRaidDisplay],
  );

  const handleChallengeBoss = useCallback(
    async (bossStage: number) => {
      if (false && !bossWindowInfo.isOpen) {
        Alert.alert(
          '보스 레이드',
          '보스 레이드는 4시간마다 열리고, 열린 뒤 10분 동안만 입장할 수 있습니다.',
        );
        return;
      }

      if (partyId && !isLeader) {
        Alert.alert('파티 레이드', '파티장만 레이드를 시작할 수 있습니다.');
        return;
      }

      if (!isAdmin && !unlockedBossStages.includes(bossStage)) {
        Alert.alert(
          '보스 레이드',
          '해당 월드의 30스테이지를 모두 클리어해야 보스 레이드에 도전할 수 있습니다.',
        );
        return;
      }

      const raidDisplay = resolveRaidDisplay('boss', bossStage);

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

      const { data: instance, error } = await startRaid(
        bossStage,
        raidDisplay.maxHp,
        playerIdRef.current,
        nicknameRef.current,
        {
          expiresInMs: raidDisplay.timeLimitMs + raidTimeBonusMs,
          reuseOpenInstance: true,
          skipCooldown: true,
          partyId,
        },
      );

      if (error || !instance) {
        Alert.alert(
          '오류',
          error?.message || '보스 레이드를 시작할 수 없습니다.',
        );
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
    [
      bossWindowInfo.isOpen,
      cleanup,
      isAdmin,
      isLeader,
      navigation,
      partyId,
      partyMembers.length,
      resolveRaidDisplay,
      unlockedBossStages,
    ],
  );

  const handleJoinRaid = useCallback(
    async (raid: ActiveRaid) => {
      if (partyId) {
        Alert.alert(
          '파티 레이드',
          '파티 중에는 진행 중인 공개 레이드를 직접 합류할 수 없습니다. 파티장이 새 레이드를 시작해 주세요.',
        );
        return;
      }

      if (!isAdmin && !unlockedBossStages.includes(raid.boss_stage)) {
        Alert.alert('보스 레이드', '해당 보스 단계가 아직 열리지 않았습니다.');
        return;
      }

      const { error } = await joinRaidInstance(
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
    [cleanup, isAdmin, navigation, partyId, unlockedBossStages],
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

  const partyStartLocked = Boolean(partyId) && !isLeader;
  const inviteableFriends = friendList.filter(
    friend =>
      friend.isOnline &&
      !partyMembers.some(member => member.playerId === friend.id),
  );

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
        <View style={styles.headerSpacer} />
        <Text style={styles.title}>레이드</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Friends')}>
          <Text style={styles.friendsBtn}>친구</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[
            styles.modeTab,
            raidMode === 'normal' && styles.modeTabActive,
          ]}
          onPress={() => setRaidMode('normal')}
        >
          <Text
            style={[
              styles.modeTabText,
              raidMode === 'normal' && styles.modeTabTextActive,
            ]}
          >
            일반 레이드
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, raidMode === 'boss' && styles.modeTabActive]}
          onPress={() => setRaidMode('boss')}
        >
          <Text
            style={[
              styles.modeTabText,
              raidMode === 'boss' && styles.modeTabTextActive,
            ]}
          >
            보스 레이드
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        {loadSummary && (
          <View
            style={styles.loadErrorCard}
            testID={
              loadSummary.blocking
                ? 'raid-load-error-blocking'
                : 'raid-load-error-partial'
            }
          >
            <Text style={styles.loadErrorText}>{loadSummary.message}</Text>
            {loadSummary.detail ? (
              <Text style={styles.loadErrorDetail}>{loadSummary.detail}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadData()}
            >
              <Text style={styles.retryBtnText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        )}
        {raidMode === 'normal' ? (
          <>
            {false && (
              <>
                <Text style={styles.modeDesc}>
                  일반 레이드는 상시 도전할 수 있습니다. 제한 시간 동안 최대한
                  많은 피해를 넣고 누적 처치 수를 올려 보상을 챙기세요.
                </Text>
                <Text style={styles.skinHint}>
                  일반 레이드 10회 누적 처치 시 스킨 관련 보상을 받을 수
                  있습니다.
                </Text>
              </>
            )}
            {normalRaidEntries.map(entry => {
              const stageProgress = normalRaidProgress[entry.stage];
              const killCount = stageProgress?.killCount ?? 0;
              const skinEarned = hasSkinFromRaid(
                normalRaidProgress,
                entry.stage,
              );

              return (
                <View
                  key={entry.stage}
                  style={[
                    styles.normalRaidCard,
                    { borderColor: `${entry.color}80` },
                  ]}
                >
                  <Text style={styles.nrEmoji}>{entry.emoji}</Text>
                  <View style={styles.nrInfo}>
                    <Text style={[styles.nrName, { color: entry.color }]}>
                      {entry.name}
                      {skinEarned ? ' · 스킨 획득 완료' : ''}
                    </Text>
                    <Text style={styles.nrReward}>
                      첫 클리어 다이아 {entry.reward.firstClearDiamondReward} /
                      반복 처치 +{entry.reward.repeatDiamondReward}
                    </Text>
                    <View style={styles.killBar}>
                      <View
                        style={[
                          styles.killBarFill,
                          {
                            width: `${Math.min((killCount / 10) * 100, 100)}%`,
                            backgroundColor: entry.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.killCount}>
                      누적 처치 {killCount}회
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.nrChallengeBtn,
                      partyStartLocked && styles.challengeBtnDisabled,
                      {
                        backgroundColor: `${entry.color}33`,
                        borderColor: entry.color,
                      },
                    ]}
                    disabled={partyStartLocked}
                    onPress={() => handleNormalRaidChallenge(entry.stage)}
                  >
                    <Text
                      style={[
                        styles.nrChallengeBtnText,
                        { color: entry.color },
                      ]}
                    >
                      {partyStartLocked ? '파티장 시작 대기' : '도전'}
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
                서버 시간 기준 4시간마다 열리고, 열린 뒤 10분 동안만 입장할 수
                있습니다.
              </Text>
              <Text style={styles.bossRaidScheduleDesc}>
                방당 최대 {BOSS_RAID_MAX_PLAYERS}명까지 참가 가능하며, 가득 차면
                새 방이 생성됩니다.
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
              모든 월드 30스테이지를 클리어하면 해당 단계의 보스 레이드가
              열립니다.
            </Text>

            {activeRaids.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>진행 중인 보스 레이드</Text>
                {activeRaids.map(raid => {
                  const raidDisplay = resolveRaidDisplay(
                    'boss',
                    raid.boss_stage,
                  );

                  const remainingMs = Math.max(
                    0,
                    new Date(raid.expires_at).getTime() - Date.now(),
                  );
                  const minutes = Math.floor(remainingMs / 60000);
                  const seconds = Math.floor((remainingMs % 60000) / 1000);

                  return (
                    <TouchableOpacity
                      key={raid.id}
                      style={[
                        styles.activeRaidCard,
                        { borderColor: raidDisplay.color },
                        partyId && styles.activeRaidCardDisabled,
                      ]}
                      disabled={Boolean(partyId)}
                      onPress={() => handleJoinRaid(raid)}
                    >
                      {getRaidBossSprite(raid.boss_stage) ? (
                        <Image
                          source={getRaidBossSprite(raid.boss_stage)!}
                          resizeMode="contain"
                          fadeDuration={0}
                          style={styles.activeRaidSprite}
                        />
                      ) : (
                        <Text style={styles.activeRaidEmoji}>
                          {raidDisplay.emoji}
                        </Text>
                      )}
                      <View style={styles.activeRaidInfo}>
                        <Text style={styles.activeRaidName}>
                          {raidDisplay.name}
                        </Text>
                        <Text style={styles.activeRaidHp}>
                          체력 {formatHp(raid.boss_current_hp)} /{' '}
                          {formatHp(raid.boss_max_hp)}
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
                {bossRaidEntries.map(entry => {
                  const unlocked =
                    isAdmin || unlockedBossStages.includes(entry.stage);
                  const disabled = !unlocked;

                  return (
                    <TouchableOpacity
                      key={entry.stage}
                      style={[
                        styles.bossCard,
                        { borderColor: entry.color },
                        disabled && styles.bossCardLocked,
                        partyStartLocked && styles.bossCardPartyLocked,
                      ]}
                      disabled={disabled || partyStartLocked}
                      onPress={() => handleChallengeBoss(entry.stage)}
                    >
                      {getRaidBossSprite(entry.stage) ? (
                        <Image
                          source={getRaidBossSprite(entry.stage)!}
                          resizeMode="contain"
                          fadeDuration={0}
                          style={styles.bossSprite}
                        />
                      ) : (
                        <Text style={styles.bossEmoji}>{entry.emoji}</Text>
                      )}
                      <Text style={styles.bossStage}>{entry.stage}단계</Text>
                      <Text
                        style={[
                          styles.bossName,
                          unlocked
                            ? getBossNameColorStyle(entry.color)
                            : styles.bossNameLocked,
                        ]}
                      >
                        {entry.name}
                      </Text>
                      <Text style={styles.bossHp}>{formatHp(entry.maxHp)}</Text>
                      <Text
                        style={[
                          styles.unlockState,
                          unlocked ? styles.unlocked : styles.locked,
                        ]}
                      >
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

        {incomingInvites.length > 0 && (
          <View style={styles.inviteInboxCard}>
            <Text style={styles.inviteInboxTitle}>받은 파티 초대</Text>
            {incomingInvites.map(invite => (
              <View key={invite.id} style={styles.inviteInboxRow}>
                <View style={styles.inviteInboxInfo}>
                  <Text style={styles.inviteInboxName}>
                    {invite.inviterNickname}
                  </Text>
                  <Text style={styles.inviteInboxMeta}>
                    {new Date(invite.createdAt).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    초대
                  </Text>
                </View>
                <View style={styles.inviteInboxActions}>
                  <TouchableOpacity
                    style={styles.inviteAcceptBtn}
                    onPress={() => handleAcceptInvite(invite.id)}
                  >
                    <Text style={styles.inviteAcceptBtnText}>수락</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.inviteDeclineBtn}
                    onPress={() => handleDeclineInvite(invite.id)}
                  >
                    <Text style={styles.inviteDeclineBtnText}>거절</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {partyId ? (
          <View style={styles.partyHintCard}>
            <Text style={styles.partyHintTitle}>
              {isLeader ? '파티 레이드 시작 권한' : '파티 레이드 대기 중'}
            </Text>
            <Text style={styles.partyHintText}>
              {isLeader
                ? '파티장은 레이드를 시작하고 온라인 유저만 초대할 수 있습니다.'
                : '파티장이 시작하면 같은 보스 인스턴스로 자동 합류합니다.'}
            </Text>
          </View>
        ) : null}

        <PartyPanel
          partyId={partyId}
          members={partyMembers}
          isLeader={isLeader}
          myPlayerId={playerIdRef.current}
          onCreateParty={handleCreateParty}
          onLeaveParty={handleLeaveParty}
          onDisbandParty={handleDisbandParty}
          onInviteFriends={() => {
            if (
              !partyId ||
              !isLeader ||
              partyMembers.length >= MAX_PARTY_SIZE
            ) {
              return;
            }
            setShowInviteModal(true);
          }}
        />
      </ScrollView>

      <GameBottomNav
        navigation={navigation}
        activeItem={null}
        onHomePress={cleanup}
      />

      <FriendInviteModal
        visible={showInviteModal}
        friends={inviteableFriends}
        searchQuery={inviteSearchQuery}
        searchResults={inviteSearchResults}
        searching={inviteSearching}
        onChangeSearchQuery={setInviteSearchQuery}
        onSearch={handleSearchInviteTargets}
        onInvite={playerId => {
          const candidate =
            inviteableFriends.find(friend => friend.id === playerId) ||
            inviteSearchResults.find(friend => friend.id === playerId);
          void handleInvitePlayer(playerId, candidate?.nickname);
        }}
        onClose={resetInviteModal}
      />

      {!loading && chatPlayerId ? (
        <LobbyChatPanel
          title="레이드 모집 채팅"
          accentColor={raidMode === 'boss' ? '#ef4444' : '#22c55e'}
          isOpen={lobbyChat.isOpen}
          connected={lobbyChat.connected}
          currentChannelId={lobbyChat.currentChannelId}
          currentOccupancy={lobbyChat.currentOccupancy}
          capacity={lobbyChat.capacity}
          channelOptions={lobbyChat.channelOptions}
          draft={lobbyChat.draft}
          messages={lobbyChat.messages}
          onToggle={lobbyChat.toggleOpen}
          onChangeDraft={lobbyChat.setDraft}
          onSend={lobbyChat.sendMessage}
          onSwitchChannel={(channelId: number) => {
            lobbyChat.switchChannel(channelId).catch(error => {
              console.warn('RaidLobbyScreen switchChannel error:', error);
            });
          }}
          onRandomizeChannel={() => {
            lobbyChat.joinRandomChannel().catch(error => {
              console.warn('RaidLobbyScreen joinRandomChannel error:', error);
            });
          }}
          onPressUser={handleInviteFromChat}
          bottom={GAME_BOTTOM_NAV_CHAT_OFFSET}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1e' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerSpacer: { width: 58 },
  title: { color: '#e2e8f0', fontSize: 18, fontWeight: '800' },
  friendsBtn: { color: '#22c55e', fontSize: 13, fontWeight: '700' },
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: '#1e1b4b',
    borderRadius: 10,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  modeTabActive: { backgroundColor: '#dc2626' },
  modeTabText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  modeTabTextActive: { color: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 28, paddingHorizontal: 14 },
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
  nrEmoji: { fontSize: 30 },
  nrInfo: { flex: 1, gap: 4 },
  nrName: { fontSize: 14, fontWeight: '800' },
  nrReward: { color: '#94a3b8', fontSize: 11 },
  killBar: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  killBarFill: { height: 4, borderRadius: 2 },
  killCount: { color: '#64748b', fontSize: 10 },
  nrChallengeBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nrChallengeBtnText: { fontSize: 13, fontWeight: '900' },
  challengeBtnDisabled: {
    opacity: 0.55,
  },
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
  bossRaidTimerLabel: { color: '#64748b', fontSize: 11 },
  bossRaidTimerValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  section: { marginBottom: 12 },
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
  activeRaidCardDisabled: {
    opacity: 0.45,
  },
  activeRaidEmoji: { fontSize: 28 },
  activeRaidSprite: { width: 40, height: 40 },
  activeRaidInfo: { flex: 1 },
  activeRaidName: { color: '#f8fafc', fontSize: 14, fontWeight: '800' },
  activeRaidHp: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  activeRaidTimer: { color: '#f87171', fontSize: 13, fontWeight: '800' },
  bossGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bossCard: {
    width: '47%',
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    alignItems: 'center',
    minHeight: 132,
  },
  bossCardLocked: { opacity: 0.45 },
  bossCardPartyLocked: { opacity: 0.55 },
  bossEmoji: { fontSize: 30 },
  bossSprite: { width: 54, height: 54 },
  bossStage: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },
  bossName: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  bossNameLocked: { color: '#64748b' },
  bossHp: { color: '#94a3b8', fontSize: 11, marginTop: 4 },
  unlockState: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  unlocked: { color: '#22c55e' },
  locked: { color: '#f87171' },
  inviteInboxCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.35)',
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    gap: 10,
  },
  inviteInboxTitle: {
    color: '#dbeafe',
    fontSize: 14,
    fontWeight: '800',
  },
  inviteInboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inviteInboxInfo: {
    flex: 1,
    gap: 3,
  },
  inviteInboxName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  inviteInboxMeta: {
    color: '#94a3b8',
    fontSize: 11,
  },
  inviteInboxActions: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteAcceptBtn: {
    borderRadius: 8,
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  inviteAcceptBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  inviteDeclineBtn: {
    borderRadius: 8,
    backgroundColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  inviteDeclineBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  partyHintCard: {
    backgroundColor: 'rgba(30, 27, 75, 0.72)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
    padding: 12,
    gap: 6,
    marginTop: 4,
  },
  partyHintTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  partyHintText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
});
