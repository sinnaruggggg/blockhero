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
  StatusBar,
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
} from '../stores/gameStore';
import { t } from '../i18n';
import {
  RAID_BOSSES,
  getBossRaidMaxHp,
  getNormalRaidMaxHp,
} from '../constants/raidBosses';
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
import { getFriendList, searchOnlinePlayers } from '../services/friendService';
import {
  acceptPartyInvite,
  createRaidParty,
  createPartyInvite,
  declinePartyInvite,
  joinParty,
  listOpenPartiesForRaid,
  listOpenPartiesForRaidType,
  disbandParty,
  leaveOrDisbandParty,
  getIncomingPartyInvites,
  getMyParty,
  getPartyMembers,
  updatePartyRaidTarget,
  type RaidPartyListing,
  type PartyRaidTarget,
} from '../services/partyService';
import FriendInviteModal, {
  type InviteCandidate,
} from '../components/FriendInviteModal';
import LobbyChatPanel from '../components/LobbyChatPanel';
import RaidPartyManagerModal, {
  type RaidPartyModalTarget,
} from '../components/RaidPartyManagerModal';
import MenuFloatingBlocks from '../components/MenuFloatingBlocks';
import {
  formatBossRaidCountdownLabel,
  getBossRaidWindowInfo,
} from '../game/raidRules';
import {
  listCreatorRaids,
  resolveCreatorRaidRuntime,
} from '../game/creatorManifest';
import { adjustEnemyHpValue } from '../game/battleBalance';
import { getUnlockedBossRaidStages } from '../game/levelProgress';
import { getAdminStatus } from '../services/adminSync';
import { useLobbyChat } from '../hooks/useLobbyChat';
import {
  clearRaidLobbyPartyCache,
  readRaidLobbyCoreCache,
  readRaidLobbyPartyCache,
  readRaidLobbySocialCache,
  writeRaidLobbyCoreCache,
  writeRaidLobbyPartyCache,
  writeRaidLobbySocialCache,
} from '../services/raidRuntimeCache';
import {
  buildRaidPartyRecruitmentMessage,
} from '../services/lobbyChatService';

interface ActiveRaid {
  id: string;
  boss_stage: number;
  boss_current_hp: number;
  boss_max_hp: number;
  started_at?: string;
  expires_at: string;
  starter_id: string;
  status?: string;
  party_id?: string | null;
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
const IMG_BG = require('../assets/ui/lobby_bg.jpg');
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
    case 'party_target_mismatch':
      return '이 파티는 다른 레이드 몬스터로 만든 파티입니다.';
    case 'party_password_setup_required':
      return '비밀번호 기능 SQL을 먼저 적용해야 합니다.';
    case 'party_password_required':
      return '파티 비밀번호를 입력해 주세요.';
    case 'party_password_invalid':
      return '파티 비밀번호가 맞지 않습니다.';
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

function getPartyRaidTargetFromRecord(party: any): PartyRaidTarget | null {
  const raidType = party?.raid_type;
  const bossStage = party?.boss_stage;
  if (
    (raidType === 'normal' || raidType === 'boss') &&
    typeof bossStage === 'number'
  ) {
    return { raidType, bossStage };
  }
  return null;
}

function isSameRaidTarget(
  left: PartyRaidTarget | null,
  right: PartyRaidTarget,
) {
  return (
    !left ||
    (left.raidType === right.raidType && left.bossStage === right.bossStage)
  );
}

export default function RaidLobbyScreen({ navigation }: any) {
  const { manifest: creatorManifest } = useCreatorConfig();
  const cachedCore = useMemo(() => readRaidLobbyCoreCache(), []);
  const cachedSocial = useMemo(() => readRaidLobbySocialCache(), []);
  const cachedParty = useMemo(() => readRaidLobbyPartyCache(), []);
  const [raidMode, setRaidMode] = useState<'normal' | 'boss'>('normal');
  const [coreLoading, setCoreLoading] = useState(!cachedCore);
  const [, setSocialLoading] = useState(false);
  const [_partyLoading, setPartyLoading] = useState(false);
  const [loadSummary, setLoadSummary] = useState<LoadSummary | null>(null);
  const [, setTick] = useState(0);
  const [activeRaids, setActiveRaids] = useState<ActiveRaid[]>(
    cachedCore?.activeRaids ?? [],
  );
  const [normalRaidProgress, setNormalRaidProgress] = useState<any>(
    cachedCore?.normalRaidProgress ?? {},
  );
  const [unlockedBossStages, setUnlockedBossStages] = useState<number[]>(
    cachedCore?.unlockedBossStages ?? [],
  );
  const [isAdmin, setIsAdmin] = useState(cachedCore?.isAdmin ?? false);
  const [partyId, setPartyId] = useState<string | null>(
    cachedCore?.partyId ?? null,
  );
  const [partyRaidTarget, setPartyRaidTarget] =
    useState<PartyRaidTarget | null>(null);
  const [partyMembers, setPartyMembers] = useState<PartyMemberLocal[]>(
    cachedParty?.partyMembers ?? [],
  );
  const [partyActiveRaid, setPartyActiveRaid] = useState<ActiveRaid | null>(
    null,
  );
  const [isLeader, setIsLeader] = useState(cachedCore?.isLeader ?? false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [friendList, setFriendList] = useState<InviteCandidate[]>(
    cachedSocial?.friendList ?? [],
  );
  const [incomingInvites, setIncomingInvites] = useState<PartyInviteLocal[]>(
    cachedSocial?.incomingInvites ?? [],
  );
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [inviteSearchResults, setInviteSearchResults] = useState<
    InviteCandidate[]
  >([]);
  const [inviteSearching, setInviteSearching] = useState(false);
  const [partyModalTarget, setPartyModalTarget] =
    useState<RaidPartyModalTarget | null>(null);
  const [raidPartyListings, setRaidPartyListings] = useState<
    RaidPartyListing[]
  >([]);
  const [normalRecruitmentListings, setNormalRecruitmentListings] = useState<
    RaidPartyListing[]
  >([]);
  const [bossRecruitmentListings, setBossRecruitmentListings] = useState<
    RaidPartyListing[]
  >([]);
  const [recruitmentLoading, setRecruitmentLoading] = useState(false);
  const [raidPartyLoading, setRaidPartyLoading] = useState(false);
  const [partyActionLoading, setPartyActionLoading] = useState(false);
  const [partyJoinCode, setPartyJoinCode] = useState('');
  const [partyPassword, setPartyPassword] = useState('');
  const [chatPlayerId, setChatPlayerId] = useState(cachedCore?.playerId ?? '');
  const [chatNickname, setChatNickname] = useState(cachedCore?.nickname ?? '');
  const [chatSessionKey, setChatSessionKey] = useState(cachedCore ? 1 : 0);

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
          maxHp: raidDisplay?.maxHp ?? getNormalRaidMaxHp(raid.stage),
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
        maxHp: getNormalRaidMaxHp(boss.stage),
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
          maxHp:
            (resolveCreatorRaidRuntime(creatorManifest, 'normal', raid.stage)
              ?.maxHp ?? getNormalRaidMaxHp(raid.stage)) * 20,
        };
      });
    }

    return RAID_BOSSES.map(boss => ({
      stage: boss.stage,
      name: t(boss.nameKey),
      color: boss.color,
      emoji: boss.emoji,
      maxHp: getBossRaidMaxHp(boss.stage),
    }));
  }, [creatorBossRaids, creatorManifest]);

  const playerIdRef = useRef('');
  const nicknameRef = useRef('');
  const partyChannelRef = useRef<any>(null);
  const recruitmentChannelRef = useRef<any>(null);
  const recruitmentRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const keepPartyForRaidNavigationRef = useRef(false);
  const partyIdRef = useRef<string | null>(cachedCore?.partyId ?? null);
  const isLeaderRef = useRef(cachedCore?.isLeader ?? false);
  const autoEnteringPartyRaidRef = useRef<string | null>(null);
  const inviteChannelRef = useRef<any>(null);
  const socialChannelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const loadRequestRef = useRef(0);
  const socialRequestRef = useRef(0);
  const partyRequestRef = useRef(0);
  const partyStateRequestRef = useRef(0);
  const recruitmentRequestRef = useRef(0);
  const loadDataRef = useRef<
    (options?: { showBlockingSpinner?: boolean }) => Promise<void>
  >(async () => {});
  const refreshPartyStateRef = useRef<() => Promise<void>>(async () => {});
  const loadRecruitmentListingsRef = useRef<() => Promise<void>>(async () => {});
  const lobbyChat = useLobbyChat({
    mode: 'raid',
    userId: chatPlayerId,
    nickname: chatNickname,
    enabled: !coreLoading && !!chatPlayerId && !!chatNickname,
    sessionKey: chatSessionKey,
  });

  const bossWindowInfo = getBossRaidWindowInfo(Date.now());
  useEffect(() => {
    partyIdRef.current = partyId;
  }, [partyId]);

  useEffect(() => {
    isLeaderRef.current = isLeader;
  }, [isLeader]);

  const visibleRaidPartyListings = useMemo(() => {
    if (!partyModalTarget) {
      return raidPartyListings;
    }
    // RAID_FIX: only DB-backed open parties are listed. Old chat recruitment
    // messages must not resurrect a disbanded party in the join list.
    return raidPartyListings.filter(listing => listing.id !== partyId);
  }, [partyId, partyModalTarget, raidPartyListings]);

  const resolveRaidDisplay = useCallback(
    (raidType: 'normal' | 'boss', stage: number) => {
      const creatorRaid = resolveCreatorRaidRuntime(
        creatorManifest,
        raidType,
        stage,
      );
      const creatorNormalRaid = resolveCreatorRaidRuntime(
        creatorManifest,
        'normal',
        stage,
      );
      const staticBoss =
        RAID_BOSSES.find(entry => entry.stage === stage) ?? RAID_BOSSES[0];
      const normalRaidMaxHp = creatorNormalRaid
        ? adjustEnemyHpValue(creatorNormalRaid.maxHp)
        : getNormalRaidMaxHp(stage);
      return {
        name: creatorRaid?.name ?? t(staticBoss.nameKey),
        color: creatorRaid?.monsterColor ?? staticBoss.color,
        emoji: creatorRaid?.monsterEmoji ?? staticBoss.emoji,
        maxHp: raidType === 'normal' ? normalRaidMaxHp : normalRaidMaxHp * 20,
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

  const cleanupSocialChannel = useCallback(() => {
    if (socialChannelRef.current) {
      supabase.removeChannel(socialChannelRef.current);
      socialChannelRef.current = null;
    }
  }, []);

  const cleanupRecruitmentChannel = useCallback(() => {
    if (recruitmentRefreshTimerRef.current) {
      clearTimeout(recruitmentRefreshTimerRef.current);
      recruitmentRefreshTimerRef.current = null;
    }
    if (recruitmentChannelRef.current) {
      supabase.removeChannel(recruitmentChannelRef.current);
      recruitmentChannelRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    cleanupPartyChannel();
    cleanupInviteChannel();
    cleanupSocialChannel();
  }, [cleanupInviteChannel, cleanupPartyChannel, cleanupSocialChannel]);

  const leaveCurrentPartyForRaidExit = useCallback(() => {
    const currentPartyId = partyIdRef.current;
    const currentPlayerId = playerIdRef.current;
    if (!currentPartyId || !currentPlayerId) {
      return;
    }

    // RAID_FIX: raid parties live only inside raid mode. Leaving the raid
    // lobby disbands the party for hosts and removes normal members.
    void leaveOrDisbandParty(currentPartyId, currentPlayerId);
    partyIdRef.current = null;
    cleanupPartyChannel();
    clearRaidLobbyPartyCache();
    setPartyId(null);
    setPartyRaidTarget(null);
    setPartyMembers([]);
    setPartyActiveRaid(null);
    setIsLeader(false);
  }, [cleanupPartyChannel]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (keepPartyForRaidNavigationRef.current) {
        keepPartyForRaidNavigationRef.current = false;
        return;
      }

      leaveCurrentPartyForRaidExit();
    });

    return unsubscribe;
  }, [leaveCurrentPartyForRaidExit, navigation]);

  useEffect(() => {
    if (!cachedCore) {
      return;
    }

    playerIdRef.current = cachedCore.playerId;
    nicknameRef.current = cachedCore.nickname;
  }, [cachedCore]);

  const enterPartyRaidFromSync = useCallback(
    async (raid: ActiveRaid | null, source: string) => {
      const currentPartyId = partyIdRef.current;
      const currentPlayerId = playerIdRef.current;
      const currentNickname = nicknameRef.current;
      const raidStatus = raid?.status ?? 'active';
      const raidPartyId = raid?.party_id ?? null;

      if (
        !raid?.id ||
        !currentPartyId ||
        !currentPlayerId ||
        !currentNickname ||
        isLeaderRef.current ||
        (raidStatus !== 'active' && raidStatus !== 'battle')
      ) {
        return;
      }

      if (raidPartyId && raidPartyId !== currentPartyId) {
        // RAID_FIX: ignore stale/mismatched party raid rows before navigation.
        return;
      }

      if (autoEnteringPartyRaidRef.current === raid.id) {
        return;
      }

      autoEnteringPartyRaidRef.current = raid.id;

      // RAID_FIX: public raid entry remains manual, but a party member must
      // follow the host automatically when this party's active raid appears
      // through realtime, DB polling, or refresh restore.
      const { error } = await joinRaidInstance(
        raid.id,
        currentPlayerId,
        currentNickname,
        {
          bypassBossWindow: isAdmin,
          expectedPartyId: currentPartyId,
          raidType: inferPartyRaidIsNormal(raid) ? 'normal' : 'boss',
        },
      );

      if (error) {
        console.warn(
          'RaidLobbyScreen party auto enter failed:',
          source,
          raid.id,
          error.message,
        );
        autoEnteringPartyRaidRef.current = null;
        return;
      }

      if (!mountedRef.current) {
        return;
      }

      keepPartyForRaidNavigationRef.current = true;
      cleanup();
      navigation.replace('Raid', {
        instanceId: raid.id,
        bossStage: raid.boss_stage,
        isNormalRaid: inferPartyRaidIsNormal(raid),
      });
    },
    [cleanup, isAdmin, navigation],
  );

  const rememberPartyActiveRaidStatus = useCallback(
    (raidPayload: {
      id?: string;
      instanceId?: string;
      boss_stage?: number;
      bossStage?: number;
      boss_current_hp?: number;
      boss_max_hp?: number;
      started_at?: string;
      expires_at?: string;
      starter_id?: string;
      partyId?: string | null;
      party_id?: string | null;
      isNormalRaid?: boolean;
      status?: string;
    }) => {
      const nextInstanceId = raidPayload.instanceId ?? raidPayload.id;
      const nextBossStage = raidPayload.bossStage ?? raidPayload.boss_stage;
      const status = raidPayload.status ?? 'active';
      const payloadPartyId = raidPayload.partyId ?? raidPayload.party_id;

      if (!nextInstanceId || typeof nextBossStage !== 'number') {
        return;
      }

      if (
        payloadPartyId &&
        partyIdRef.current &&
        payloadPartyId !== partyIdRef.current
      ) {
        // RAID_FIX: party channels are client-created, so verify the payload's
        // party id before treating it as a start signal.
        return;
      }

      if (status !== 'active' && status !== 'battle') {
        setPartyActiveRaid(currentRaid =>
          currentRaid?.id === nextInstanceId ? null : currentRaid,
        );
        return;
      }

      const now = new Date();
      const fallbackDurationMs = raidPayload.isNormalRaid
        ? 365 * 24 * 60 * 60 * 1000
        : BOSS_RAID_WINDOW_MS;
      const startedAt = raidPayload.started_at ?? now.toISOString();
      const expiresAt =
        raidPayload.expires_at ??
        new Date(now.getTime() + fallbackDurationMs).toISOString();
      const nextRaid = {
        id: nextInstanceId,
        boss_stage: nextBossStage,
        boss_current_hp: raidPayload.boss_current_hp ?? 0,
        boss_max_hp: raidPayload.boss_max_hp ?? 0,
        started_at: startedAt,
        expires_at: expiresAt,
        starter_id: raidPayload.starter_id ?? '',
        status,
        party_id: payloadPartyId ?? partyIdRef.current,
      };

      setPartyActiveRaid(currentRaid =>
        currentRaid?.id === nextInstanceId
          ? {
              ...currentRaid,
              ...nextRaid,
              boss_current_hp:
                raidPayload.boss_current_hp ?? currentRaid.boss_current_hp,
              boss_max_hp:
                raidPayload.boss_max_hp ?? currentRaid.boss_max_hp,
            }
          : nextRaid,
      );
      void enterPartyRaidFromSync(nextRaid, 'party-active-raid-sync');
    },
    [enterPartyRaidFromSync],
  );

  const setupPartyChannel = useCallback(
    (nextPartyId: string) => {
      cleanupPartyChannel();
      const channel = supabase
        .channel(`party:${nextPartyId}`)
        .on('broadcast', { event: 'party_raid_start' }, ({ payload }: any) => {
          rememberPartyActiveRaidStatus(payload ?? {});
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
            void refreshPartyStateRef.current();
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
            void refreshPartyStateRef.current();
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'raid_instances',
            filter: `party_id=eq.${nextPartyId}`,
          },
          payload => {
            // RAID_FIX: DB room changes are a fallback start signal for
            // devices that miss the party_raid_start broadcast.
            rememberPartyActiveRaidStatus((payload.new ?? {}) as any);
          },
        )
        .subscribe(status => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('RaidLobbyScreen party channel error:', nextPartyId);
          }
        });
      partyChannelRef.current = channel;
    },
    [cleanupPartyChannel, rememberPartyActiveRaidStatus],
  );

  useEffect(() => {
    if (!partyId) {
      return;
    }

    // RAID_FIX: polling backs up Supabase realtime. Some devices miss
    // postgres_changes/broadcasts, so party members must still follow the
    // host once the party active raid exists in the DB.
    const timer = setInterval(() => {
      void Promise.all([
        getPartyMembers(partyId),
        getPartyActiveRaid(partyId, undefined, {
          bypassBossWindow: isAdmin,
        }),
      ]).then(([membersResult, raidResult]) => {
        if (membersResult.data) {
          const nextPartyMembers = membersResult.data.map((member: any) => ({
            playerId: member.player_id,
            nickname: member.nickname,
          }));
          setPartyMembers(nextPartyMembers);
          writeRaidLobbyPartyCache({
            partyMembers: nextPartyMembers,
          });
        }
        const nextRaid = raidResult.data ?? null;
        setPartyActiveRaid(nextRaid);
        if (nextRaid) {
          void enterPartyRaidFromSync(nextRaid, 'party-active-raid-poll');
        }
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [enterPartyRaidFromSync, isAdmin, partyId]);

  const hasVisibleCoreData = useCallback(
    () =>
      Boolean(
        chatPlayerId ||
          activeRaids.length > 0 ||
          Object.keys(normalRaidProgress || {}).length > 0 ||
          unlockedBossStages.length > 0 ||
          partyId,
      ),
    [
      activeRaids.length,
      chatPlayerId,
      normalRaidProgress,
      partyId,
      unlockedBossStages.length,
    ],
  );

  const applyPlayerProfile = useCallback(
    (playerId: string, nickname: string, refreshChatSession: boolean) => {
      playerIdRef.current = playerId;
      nicknameRef.current = nickname;
      setChatPlayerId(playerId);
      setChatNickname(nickname);
      if (refreshChatSession) {
        setChatSessionKey(current => current + 1);
      }
    },
    [],
  );

  const loadSocialData = useCallback(async (playerId: string) => {
    const requestId = socialRequestRef.current + 1;
    socialRequestRef.current = requestId;
    const isCurrentRequest = () =>
      mountedRef.current && socialRequestRef.current === requestId;

    if (!playerId) {
      return;
    }

    setSocialLoading(true);
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

    try {
      const [loadedFriendList, loadedInvites] = await Promise.all([
        safeLoad('friends', () => getFriendList(playerId), { data: [] } as any),
        safeLoad('incomingInvites', () => getIncomingPartyInvites(playerId), {
          data: [],
        } as any),
      ]);

      if (!isCurrentRequest()) {
        return;
      }

      const nextFriendList = loadedFriendList.data || [];
      const nextIncomingInvites = (loadedInvites.data || []).map(
        (invite: any) => ({
          id: invite.id,
          partyId: invite.party_id,
          inviterId: invite.inviter_id,
          inviterNickname: invite.inviter_nickname,
          expiresAt: invite.expires_at,
          createdAt: invite.created_at,
        }),
      );

      setFriendList(nextFriendList);
      setIncomingInvites(nextIncomingInvites);
      writeRaidLobbySocialCache({
        friendList: nextFriendList,
        incomingInvites: nextIncomingInvites,
      });

      if (loadIssues.length > 0) {
        setLoadSummary(buildPartialLoadSummary(loadIssues));
      }
    } finally {
      if (isCurrentRequest()) {
        setSocialLoading(false);
      }
    }
  }, []);

  const loadPartyData = useCallback(
    async (nextPartyId: string | null) => {
      const requestId = partyRequestRef.current + 1;
      partyRequestRef.current = requestId;
      const isCurrentRequest = () =>
        mountedRef.current && partyRequestRef.current === requestId;

      if (!nextPartyId) {
        partyIdRef.current = null;
        cleanupPartyChannel();
        clearRaidLobbyPartyCache();
        setPartyRaidTarget(null);
        setPartyMembers([]);
        setPartyActiveRaid(null);
        setPartyLoading(false);
        return;
      }

      partyIdRef.current = nextPartyId;
      setPartyLoading(true);
      setupPartyChannel(nextPartyId);

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

      try {
        const [membersResult, partyActiveRaidResult] = await Promise.all([
          safeLoad('partyMembers', () => getPartyMembers(nextPartyId), {
            data: [],
          } as any),
          safeLoad(
            'partyActiveRaid',
            () =>
              getPartyActiveRaid(nextPartyId, undefined, {
                bypassBossWindow: isAdmin,
              }),
            {
              data: null,
              error: null,
            } as any,
          ),
        ]);

        if (!isCurrentRequest()) {
          return;
        }

        const nextPartyMembers = (membersResult.data || []).map(
          (member: any) => ({
            playerId: member.player_id,
            nickname: member.nickname,
          }),
        );

        setPartyMembers(nextPartyMembers);
        writeRaidLobbyPartyCache({
          partyMembers: nextPartyMembers,
        });

        const partyActiveRaid = partyActiveRaidResult?.data ?? null;
        // RAID_FIX: refresh restore also follows a party raid that the host
        // already started while this client was reconnecting or polling late.
        setPartyActiveRaid(partyActiveRaid);
        if (partyActiveRaid) {
          void enterPartyRaidFromSync(
            partyActiveRaid,
            'party-active-raid-load',
          );
        }

        if (loadIssues.length > 0) {
          setLoadSummary(buildPartialLoadSummary(loadIssues));
        }
      } finally {
        if (isCurrentRequest()) {
          setPartyLoading(false);
        }
      }
    },
    [cleanupPartyChannel, enterPartyRaidFromSync, isAdmin, setupPartyChannel],
  );

  const refreshPartyState = useCallback(async () => {
    const playerId = playerIdRef.current;
    if (!playerId) {
      return;
    }

    const requestId = partyStateRequestRef.current + 1;
    partyStateRequestRef.current = requestId;
    const isCurrentRequest = () =>
      mountedRef.current && partyStateRequestRef.current === requestId;

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

    const partyResult = await safeLoad('party', () => getMyParty(playerId), {
      data: null,
      error: null,
    } as any);

    if (!isCurrentRequest()) {
      return;
    }

    if (partyResult.data) {
      const nextPartyId = partyResult.data.id;
      const nextPartyRaidTarget = getPartyRaidTargetFromRecord(partyResult.data);
      partyIdRef.current = nextPartyId;
      isLeaderRef.current = partyResult.data.leader_id === playerId;
      setPartyId(nextPartyId);
      setPartyRaidTarget(nextPartyRaidTarget);
      setIsLeader(partyResult.data.leader_id === playerId);
      writeRaidLobbyCoreCache({
        playerId,
        nickname: nicknameRef.current,
        activeRaids,
        normalRaidProgress,
        unlockedBossStages,
        isAdmin,
        partyId: nextPartyId,
        isLeader: partyResult.data.leader_id === playerId,
      });
      await loadPartyData(nextPartyId);
    } else {
      partyIdRef.current = null;
      isLeaderRef.current = false;
      cleanupPartyChannel();
      clearRaidLobbyPartyCache();
      setPartyId(null);
      setPartyRaidTarget(null);
      setPartyMembers([]);
      setPartyActiveRaid(null);
      setIsLeader(false);
      writeRaidLobbyCoreCache({
        playerId,
        nickname: nicknameRef.current,
        activeRaids,
        normalRaidProgress,
        unlockedBossStages,
        isAdmin,
        partyId: null,
        isLeader: false,
      });
    }

    if (loadIssues.length > 0) {
      setLoadSummary(buildPartialLoadSummary(loadIssues));
    }
  }, [
    activeRaids,
    cleanupPartyChannel,
    isAdmin,
    loadPartyData,
    normalRaidProgress,
    unlockedBossStages,
  ]);

  const loadData = useCallback(
    async (options?: { showBlockingSpinner?: boolean }) => {
      const requestId = loadRequestRef.current + 1;
      loadRequestRef.current = requestId;
      const isCurrentRequest = () =>
        mountedRef.current && loadRequestRef.current === requestId;
      const showBlockingSpinner =
        options?.showBlockingSpinner ?? !hasVisibleCoreData();

      if (!mountedRef.current) {
        return;
      }

      if (showBlockingSpinner) {
        setCoreLoading(true);
      }
      setLoadSummary(null);

      try {
        const [playerId, nickname] = await withTimeout(
          Promise.all([getPlayerId(), getNickname()]),
          'playerProfile',
        );
        if (!isCurrentRequest()) {
          return;
        }

        applyPlayerProfile(
          playerId,
          nickname,
          playerId !== chatPlayerId || nickname !== chatNickname,
        );

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

        const [partyResult, raidProgress, levelProgress, adminStatus] =
          await Promise.all([
            safeLoad('party', () => getMyParty(playerId), {
              data: null,
              error: null,
            } as any),
            safeLoad(
              'normalRaidProgress',
              () => loadNormalRaidProgress(),
              {} as any,
            ),
            safeLoad('levelProgress', () => loadLevelProgress(), {} as any),
            getAdminStatus().catch(() => false),
          ]);

        const activeRaidResult = await safeLoad(
          'activeRaids',
          () =>
            getActiveInstances(undefined, { bypassBossWindow: adminStatus }),
          {
            data: [],
          } as any,
        );

        if (!isCurrentRequest()) {
          return;
        }

        const now = Date.now();
        const filteredRaids = (activeRaidResult?.data ?? []).filter(
          (raid: any) => {
            const remainingMs = new Date(raid.expires_at).getTime() - now;
            return adminStatus
              ? remainingMs > 0
              : remainingMs > 0 && remainingMs <= BOSS_RAID_WINDOW_MS;
          },
        );
        const nextUnlockedBossStages = adminStatus
          ? RAID_BOSSES.map(boss => boss.stage)
          : getUnlockedBossRaidStages(levelProgress);
        const nextPartyId = partyResult.data?.id ?? null;
        const nextPartyRaidTarget = getPartyRaidTargetFromRecord(
          partyResult.data,
        );
        const nextIsLeader = Boolean(
          partyResult.data && partyResult.data.leader_id === playerId,
        );

        partyIdRef.current = nextPartyId;
        isLeaderRef.current = nextIsLeader;
        setActiveRaids(filteredRaids);
        setNormalRaidProgress(raidProgress);
        setIsAdmin(adminStatus);
        setUnlockedBossStages(nextUnlockedBossStages);
        setPartyId(nextPartyId);
        setPartyRaidTarget(nextPartyRaidTarget);
        setIsLeader(nextIsLeader);
        writeRaidLobbyCoreCache({
          playerId,
          nickname,
          activeRaids: filteredRaids,
          normalRaidProgress: raidProgress,
          unlockedBossStages: nextUnlockedBossStages,
          isAdmin: adminStatus,
          partyId: nextPartyId,
          isLeader: nextIsLeader,
        });

        if (!nextPartyId) {
          cleanupPartyChannel();
          clearRaidLobbyPartyCache();
          setPartyRaidTarget(null);
          setPartyMembers([]);
          setPartyActiveRaid(null);
        }

        if (loadIssues.length > 0) {
          setLoadSummary(buildPartialLoadSummary(loadIssues));
        }

        setCoreLoading(false);

        void loadSocialData(playerId);
        void loadPartyData(nextPartyId);
      } catch (error) {
        const issue = classifyLoadIssue('playerProfile', error);
        logLoadIssue(issue, error);
        if (isCurrentRequest()) {
          setLoadSummary(buildBlockingLoadSummary(issue));
        }
      } finally {
        if (isCurrentRequest()) {
          setCoreLoading(false);
        }
      }
    },
    [
      applyPlayerProfile,
      chatNickname,
      chatPlayerId,
      cleanupPartyChannel,
      hasVisibleCoreData,
      loadPartyData,
      loadSocialData,
    ],
  );

  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  useEffect(() => {
    refreshPartyStateRef.current = refreshPartyState;
  }, [refreshPartyState]);

  useEffect(() => {
    mountedRef.current = true;
    void loadData();
    const unsubscribe = navigation.addListener('focus', () => {
      void loadData({ showBlockingSpinner: false });
    });
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
          void loadSocialData(chatPlayerId);
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
  }, [chatPlayerId, cleanupInviteChannel, loadSocialData]);

  useEffect(() => {
    cleanupSocialChannel();

    if (!chatPlayerId) {
      return;
    }

    const channel = supabase
      .channel(`raid-lobby-social:${chatPlayerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        () => {
          void loadSocialData(chatPlayerId);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friends' },
        () => {
          void loadSocialData(chatPlayerId);
        },
      )
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('RaidLobbyScreen social channel error:', chatPlayerId);
        }
      });

    socialChannelRef.current = channel;

    return () => {
      cleanupSocialChannel();
    };
  }, [chatPlayerId, cleanupSocialChannel, loadSocialData]);

  useEffect(() => {
    const interval = setInterval(() => setTick(previous => previous + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const loadRecruitmentListings = useCallback(async () => {
    const requestId = recruitmentRequestRef.current + 1;
    recruitmentRequestRef.current = requestId;
    const isCurrentRequest = () =>
      mountedRef.current && recruitmentRequestRef.current === requestId;

    setRecruitmentLoading(true);
    try {
      const [normalResult, bossResult] = await Promise.all([
        listOpenPartiesForRaidType('normal', undefined, 50),
        listOpenPartiesForRaidType('boss', undefined, 50),
      ]);

      if (!isCurrentRequest()) {
        return;
      }

      if (normalResult.error) {
        console.warn(
          'RaidLobbyScreen normal recruitment list error:',
          normalResult.error,
        );
      }
      if (bossResult.error) {
        console.warn(
          'RaidLobbyScreen boss recruitment list error:',
          bossResult.error,
        );
      }

      setNormalRecruitmentListings(normalResult.data ?? []);
      setBossRecruitmentListings(bossResult.data ?? []);
    } finally {
      if (isCurrentRequest()) {
        setRecruitmentLoading(false);
      }
    }
  }, []);

  const loadRaidPartyListings = useCallback(
    async (target: RaidPartyModalTarget) => {
      setRaidPartyLoading(true);
      try {
        const partyListResult = await listOpenPartiesForRaid(
          {
            raidType: target.raidType,
            bossStage: target.bossStage,
          },
          playerIdRef.current,
        );

        if (partyListResult.error) {
          console.warn(
            'RaidLobbyScreen listOpenPartiesForRaid error:',
            partyListResult.error,
          );
        }

        // RAID_FIX: never rebuild the party list from old chat recruitment
        // messages. Only DB-backed parties with a live leader member can show.
        setRaidPartyListings(partyListResult.data ?? []);
      } finally {
        setRaidPartyLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadRecruitmentListingsRef.current = loadRecruitmentListings;
  }, [loadRecruitmentListings]);

  const scheduleRecruitmentRefresh = useCallback(() => {
    if (recruitmentRefreshTimerRef.current) {
      clearTimeout(recruitmentRefreshTimerRef.current);
    }
    recruitmentRefreshTimerRef.current = setTimeout(() => {
      recruitmentRefreshTimerRef.current = null;
      void loadRecruitmentListingsRef.current();
    }, 250);
  }, []);

  useEffect(() => {
    cleanupRecruitmentChannel();

    if (coreLoading) {
      return;
    }

    void loadRecruitmentListings();

    const channel = supabase
      .channel('raid-party-recruitment-db')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parties' },
        scheduleRecruitmentRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'party_members' },
        scheduleRecruitmentRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        scheduleRecruitmentRefresh,
      )
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('RaidLobbyScreen recruitment channel error');
        }
      });

    recruitmentChannelRef.current = channel;

    return () => {
      cleanupRecruitmentChannel();
    };
  }, [
    cleanupRecruitmentChannel,
    coreLoading,
    loadRecruitmentListings,
    scheduleRecruitmentRefresh,
  ]);

  const openPartyManager = useCallback(
    (target: RaidPartyModalTarget, initialPartyId = '') => {
      setPartyModalTarget(target);
      setPartyJoinCode(initialPartyId);
      setPartyPassword('');
      setRaidPartyListings([]);
      void loadRaidPartyListings(target);
    },
    [loadRaidPartyListings],
  );

  const closePartyManager = useCallback(() => {
    setPartyModalTarget(null);
    setPartyJoinCode('');
    setPartyPassword('');
    setRaidPartyListings([]);
  }, []);

  const resetInviteModal = useCallback(() => {
    setShowInviteModal(false);
    setInviteSearchQuery('');
    setInviteSearchResults([]);
  }, []);

  const postPartyRecruitment = useCallback(
    async (
      target: RaidPartyModalTarget,
      nextPartyId: string,
      memberCount = partyMembers.length || 1,
    ) => {
      if (target.raidType === 'normal') {
        return true;
      }

      const rawMessage = buildRaidPartyRecruitmentMessage(
        `${target.name} 파티 모집 중입니다. (${memberCount}/${MAX_PARTY_SIZE})`,
        {
          partyId: nextPartyId,
          raidType: target.raidType,
          bossStage: target.bossStage,
          raidName: target.name,
          leaderNickname: nicknameRef.current,
        },
      );

      const sent = await lobbyChat.sendTextMessage(rawMessage);
      if (!sent) {
        Alert.alert(
          '파티 모집',
          `채팅 채널 연결 전이라 모집글은 올리지 못했습니다. 파티 코드 ${nextPartyId}로 직접 참가할 수 있습니다.`,
        );
        return false;
      }

      Alert.alert(
        '파티 모집',
        '채팅창에 파티 참가 버튼이 있는 모집글을 올렸습니다.',
      );
      return true;
    },
    [lobbyChat, partyMembers.length],
  );

  const handleCreateParty = useCallback(async () => {
    if (!partyModalTarget) {
      return;
    }

    const requestedTarget = {
      raidType: partyModalTarget.raidType,
      bossStage: partyModalTarget.bossStage,
    };

    if (partyId && !isLeader) {
      Alert.alert(
        '파티',
        '이미 파티에 참가 중입니다. 파티장만 모집글을 올릴 수 있습니다.',
      );
      return;
    }

    setPartyActionLoading(true);
    try {
      if (partyId && isLeader) {
        if (!isSameRaidTarget(partyRaidTarget, requestedTarget)) {
          Alert.alert(
            '파티',
            '이 파티는 다른 레이드 몬스터로 만든 파티입니다. 다른 몬스터에 도전하려면 현재 파티를 해산하고 다시 만들어 주세요.',
          );
          return;
        }
        const { error } = await updatePartyRaidTarget(
          partyId,
          playerIdRef.current,
          requestedTarget,
        );
        if (error) {
          Alert.alert('파티', getPartyInviteErrorMessage(error.message));
          return;
        }
        await postPartyRecruitment(
          partyModalTarget,
          partyId,
          partyMembers.length || 1,
        );
        await loadRaidPartyListings(partyModalTarget);
        await loadRecruitmentListings();
        return;
      }

      const { data, error } = await createRaidParty(
        playerIdRef.current,
        nicknameRef.current,
        requestedTarget,
        partyPassword,
      );
      if (error || !data) {
        Alert.alert(
          '오류',
          error
            ? getPartyInviteErrorMessage(error.message)
            : '파티를 만들 수 없습니다.',
        );
        return;
      }

      setPartyId(data.id);
      setPartyRaidTarget(requestedTarget);
      setIsLeader(true);
      setPartyMembers([
        { playerId: playerIdRef.current, nickname: nicknameRef.current },
      ]);
      writeRaidLobbyCoreCache({
        playerId: playerIdRef.current,
        nickname: nicknameRef.current,
        activeRaids,
        normalRaidProgress,
        unlockedBossStages,
        isAdmin,
        partyId: data.id,
        isLeader: true,
      });
      writeRaidLobbyPartyCache({
        partyMembers: [
          { playerId: playerIdRef.current, nickname: nicknameRef.current },
        ],
      });
      setupPartyChannel(data.id);
      void loadPartyData(data.id);
      await postPartyRecruitment(partyModalTarget, data.id, 1);
      await loadRaidPartyListings(partyModalTarget);
      await loadRecruitmentListings();
    } finally {
      setPartyActionLoading(false);
    }
  }, [
    activeRaids,
    isAdmin,
    isLeader,
    loadPartyData,
    loadRaidPartyListings,
    loadRecruitmentListings,
    normalRaidProgress,
    partyPassword,
    partyId,
    partyMembers.length,
    partyModalTarget,
    partyRaidTarget,
    postPartyRecruitment,
    setupPartyChannel,
    unlockedBossStages,
  ]);

  const handleLeaveParty = useCallback(async () => {
    if (!partyId) {
      return;
    }

    await leaveOrDisbandParty(partyId, playerIdRef.current);
    cleanup();
    clearRaidLobbyPartyCache();
    setPartyId(null);
    setPartyRaidTarget(null);
    setPartyMembers([]);
    setIsLeader(false);
    writeRaidLobbyCoreCache({
      playerId: playerIdRef.current,
      nickname: nicknameRef.current,
      activeRaids,
      normalRaidProgress,
      unlockedBossStages,
      isAdmin,
      partyId: null,
      isLeader: false,
    });
    resetInviteModal();
    await loadRecruitmentListings();
  }, [
    activeRaids,
    cleanup,
    isAdmin,
    loadRecruitmentListings,
    normalRaidProgress,
    partyId,
    resetInviteModal,
    unlockedBossStages,
  ]);

  const handleDisbandParty = useCallback(async () => {
    if (!partyId) {
      return;
    }

    await disbandParty(partyId);
    cleanup();
    clearRaidLobbyPartyCache();
    setPartyId(null);
    setPartyRaidTarget(null);
    setPartyMembers([]);
    setIsLeader(false);
    writeRaidLobbyCoreCache({
      playerId: playerIdRef.current,
      nickname: nicknameRef.current,
      activeRaids,
      normalRaidProgress,
      unlockedBossStages,
      isAdmin,
      partyId: null,
      isLeader: false,
    });
    resetInviteModal();
    await loadRecruitmentListings();
  }, [
    activeRaids,
    cleanup,
    isAdmin,
    loadRecruitmentListings,
    normalRaidProgress,
    partyId,
    resetInviteModal,
    unlockedBossStages,
  ]);

  const handleJoinPartyById = useCallback(
    async (
      targetPartyId: string,
      closeAfterJoin = false,
      passwordOverride?: string,
    ) => {
      const trimmed = targetPartyId.trim();
      if (!trimmed) {
        return;
      }

      const resolvedPartyId =
        visibleRaidPartyListings.find(listing => listing.id.startsWith(trimmed))
          ?.id ?? trimmed;

      setPartyActionLoading(true);
      try {
        const { error } = await joinParty(
          resolvedPartyId,
          playerIdRef.current,
          nicknameRef.current,
          passwordOverride ?? partyPassword,
        );
        if (error) {
          Alert.alert('파티 참가', getPartyInviteErrorMessage(error.message));
          return;
        }

        await refreshPartyState();
        void loadSocialData(playerIdRef.current);
        if (partyModalTarget) {
          await loadRaidPartyListings(partyModalTarget);
        }
        await loadRecruitmentListings();
        if (closeAfterJoin) {
          closePartyManager();
        }
      } finally {
        setPartyActionLoading(false);
      }
    },
    [
      closePartyManager,
      loadRaidPartyListings,
      loadRecruitmentListings,
      loadSocialData,
      partyPassword,
      partyModalTarget,
      refreshPartyState,
      visibleRaidPartyListings,
    ],
  );

  const handleJoinPartyFromCode = useCallback(() => {
    void handleJoinPartyById(partyJoinCode);
  }, [handleJoinPartyById, partyJoinCode]);

  const handleRandomPartyJoin = useCallback(async () => {
    let joinableListings = visibleRaidPartyListings;

    if (joinableListings.length === 0 && partyModalTarget) {
      setRaidPartyLoading(true);
      try {
        const { data, error } = await listOpenPartiesForRaid(
          {
            raidType: partyModalTarget.raidType,
            bossStage: partyModalTarget.bossStage,
          },
          playerIdRef.current,
        );
        if (error) {
          Alert.alert('빠른 참가', getPartyInviteErrorMessage(error.message));
          return;
        }
        const nextListings = (data ?? []).filter(
          listing => listing.id !== partyId,
        );
        setRaidPartyListings(nextListings);
        joinableListings = nextListings;
      } finally {
        setRaidPartyLoading(false);
      }
    }

    if (joinableListings.length === 0) {
      Alert.alert('랜덤 참가', '현재 참가 가능한 파티가 없습니다.');
      return;
    }

    const passwordInput = partyPassword.trim();
    const passwordCompatibleListings = passwordInput
      ? joinableListings
      : joinableListings.filter(listing => !listing.hasPassword);

    if (passwordCompatibleListings.length === 0) {
      Alert.alert(
        '빠른 참가',
        '비밀번호가 필요한 파티만 있습니다. 비밀번호를 입력한 뒤 다시 시도해 주세요.',
      );
      return;
    }

    const index = Math.floor(Math.random() * passwordCompatibleListings.length);
    await handleJoinPartyById(passwordCompatibleListings[index].id);
  }, [
    handleJoinPartyById,
    partyId,
    partyModalTarget,
    partyPassword,
    visibleRaidPartyListings,
  ]);

  const handlePostRecruitment = useCallback(async () => {
    if (!partyModalTarget || !partyId) {
      Alert.alert('파티 모집', '먼저 파티를 만들어 주세요.');
      return;
    }
    if (!isLeader) {
      Alert.alert('파티 모집', '파티장만 모집글을 올릴 수 있습니다.');
      return;
    }

    const requestedTarget = {
      raidType: partyModalTarget.raidType,
      bossStage: partyModalTarget.bossStage,
    };
    if (!isSameRaidTarget(partyRaidTarget, requestedTarget)) {
      Alert.alert(
        '파티 모집',
        '이 파티는 다른 레이드 몬스터로 만든 파티입니다. 현재 파티를 해산한 뒤 다시 만들어 주세요.',
      );
      return;
    }

    setPartyActionLoading(true);
    try {
      const { error } = await updatePartyRaidTarget(
        partyId,
        playerIdRef.current,
        requestedTarget,
      );
      if (error) {
        Alert.alert('파티 모집', getPartyInviteErrorMessage(error.message));
        return;
      }

      await postPartyRecruitment(
        partyModalTarget,
        partyId,
        partyMembers.length || 1,
      );
      await loadRaidPartyListings(partyModalTarget);
      await loadRecruitmentListings();
    } finally {
      setPartyActionLoading(false);
    }
  }, [
    isLeader,
    loadRaidPartyListings,
    loadRecruitmentListings,
    partyId,
    partyMembers.length,
    partyModalTarget,
    partyRaidTarget,
    postPartyRecruitment,
  ]);

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
      void loadSocialData(playerIdRef.current);
      Alert.alert(
        '파티 초대',
        `${inviteeNickname || '대상 유저'}에게 초대를 보냈습니다.`,
      );
    },
    [isLeader, loadSocialData, partyId, resetInviteModal],
  );

  const handleAcceptInvite = useCallback(
    async (inviteId: string) => {
      const { error } = await acceptPartyInvite(
        inviteId,
        playerIdRef.current,
        nicknameRef.current,
      );
      if (error) {
        Alert.alert('파티 초대', getPartyInviteErrorMessage(error.message));
        return;
      }

      await refreshPartyState();
      void loadSocialData(playerIdRef.current);
    },
    [loadSocialData, refreshPartyState],
  );

  const handleDeclineInvite = useCallback(
    async (inviteId: string) => {
      const { error } = await declinePartyInvite(inviteId, playerIdRef.current);
      if (error) {
        Alert.alert('파티 초대', getPartyInviteErrorMessage(error.message));
        return;
      }

      await loadSocialData(playerIdRef.current);
    },
    [loadSocialData],
  );

  const handleNormalRaidChallenge = useCallback(
    async (bossStage: number) => {
      if (partyId && !isLeader) {
        Alert.alert('파티 레이드', '파티장만 레이드를 시작할 수 있습니다.');
        return;
      }
      if (
        partyId &&
        isLeader &&
        !isSameRaidTarget(partyRaidTarget, {
          raidType: 'normal',
          bossStage,
        })
      ) {
        Alert.alert(
          '파티 레이드',
          '이 파티는 다른 레이드 몬스터로 만든 파티입니다. 다른 몬스터에 도전하려면 현재 파티를 해산하고 다시 만들어 주세요.',
        );
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
          raidType: 'normal',
        },
      );

      if (error || !instance) {
        Alert.alert(
          '오류',
          error
            ? getPartyInviteErrorMessage(error.message)
            : '일반 레이드를 시작할 수 없습니다.',
        );
        return;
      }

      if (partyId && partyChannelRef.current) {
        partyChannelRef.current.send({
          type: 'broadcast',
          event: 'party_raid_start',
          payload: {
            instanceId: instance.id,
            id: instance.id,
            bossStage,
            boss_stage: bossStage,
            boss_current_hp: instance.boss_current_hp,
            boss_max_hp: instance.boss_max_hp,
            started_at: instance.started_at,
            expires_at: instance.expires_at,
            starter_id: instance.starter_id,
            status: instance.status ?? 'active',
            partyId,
            party_id: partyId,
            isNormalRaid: true,
          },
        });
      }

      keepPartyForRaidNavigationRef.current = true;
      cleanup();
      navigation.replace('Raid', {
        instanceId: instance.id,
        bossStage,
        isNormalRaid: true,
      });
    },
    [cleanup, isLeader, navigation, partyId, partyRaidTarget, resolveRaidDisplay],
  );

  const handleChallengeBoss = useCallback(
    async (bossStage: number) => {
      if (!isAdmin && !bossWindowInfo.isOpen) {
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
      if (
        partyId &&
        isLeader &&
        !isSameRaidTarget(partyRaidTarget, {
          raidType: 'boss',
          bossStage,
        })
      ) {
        Alert.alert(
          '파티 레이드',
          '이 파티는 다른 레이드 몬스터로 만든 파티입니다. 다른 몬스터에 도전하려면 현재 파티를 해산하고 다시 만들어 주세요.',
        );
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

      const { data: instance, error } = await startRaid(
        bossStage,
        raidDisplay.maxHp,
        playerIdRef.current,
        nicknameRef.current,
        {
          expiresInMs: BOSS_RAID_WINDOW_MS,
          reuseOpenInstance: true,
          skipCooldown: true,
          partyId,
          bypassBossWindow: isAdmin,
          raidType: 'boss',
        },
      );

      if (error || !instance) {
        Alert.alert(
          '오류',
          error
            ? getPartyInviteErrorMessage(error.message)
            : '보스 레이드를 시작할 수 없습니다.',
        );
        return;
      }

      if (partyId && partyChannelRef.current) {
        partyChannelRef.current.send({
          type: 'broadcast',
          event: 'party_raid_start',
          payload: {
            instanceId: instance.id,
            id: instance.id,
            bossStage,
            boss_stage: bossStage,
            boss_current_hp: instance.boss_current_hp,
            boss_max_hp: instance.boss_max_hp,
            started_at: instance.started_at,
            expires_at: instance.expires_at,
            starter_id: instance.starter_id,
            status: instance.status ?? 'active',
            partyId,
            party_id: partyId,
            isNormalRaid: false,
          },
        });
      }

      keepPartyForRaidNavigationRef.current = true;
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
      partyRaidTarget,
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
        {
          bypassBossWindow: isAdmin,
          expectedPartyId: null,
          raidType: 'boss',
        },
      );

      if (error) {
        Alert.alert(
          '오류',
          error.message === 'raid_expired'
            ? '이미 만료된 보스 레이드입니다. 다시 목록을 불러와 주세요.'
            : error.message,
        );
        return;
      }

      keepPartyForRaidNavigationRef.current = true;
      cleanup();
      navigation.replace('Raid', {
        instanceId: raid.id,
        bossStage: raid.boss_stage,
        isNormalRaid: false,
      });
    },
    [cleanup, isAdmin, navigation, partyId, unlockedBossStages],
  );

  const handleJoinPartyActiveRaid = useCallback(async () => {
    if (!partyActiveRaid) {
      return;
    }

    const { error } = await joinRaidInstance(
      partyActiveRaid.id,
      playerIdRef.current,
      nicknameRef.current,
      {
        bypassBossWindow: isAdmin,
        expectedPartyId: partyId,
        raidType: inferPartyRaidIsNormal(partyActiveRaid) ? 'normal' : 'boss',
      },
    );

    if (error) {
      Alert.alert(
        '오류',
        error.message === 'raid_expired'
          ? '이미 종료된 파티 레이드입니다. 다시 목록을 불러와 주세요.'
          : error.message,
      );
      void loadPartyData(partyId);
      return;
    }

    keepPartyForRaidNavigationRef.current = true;
    cleanup();
    navigation.replace('Raid', {
      instanceId: partyActiveRaid.id,
      bossStage: partyActiveRaid.boss_stage,
      isNormalRaid: inferPartyRaidIsNormal(partyActiveRaid),
    });
  }, [cleanup, isAdmin, loadPartyData, navigation, partyActiveRaid, partyId]);

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
  const partyActiveRaidIsNormal = partyActiveRaid
    ? inferPartyRaidIsNormal(partyActiveRaid)
    : false;
  const partyActiveRaidDisplay = partyActiveRaid
    ? resolveRaidDisplay(
        partyActiveRaidIsNormal ? 'normal' : 'boss',
        partyActiveRaid.boss_stage,
      )
    : null;
  const inviteableFriends = friendList.filter(
    friend =>
      friend.isOnline &&
      !partyMembers.some(member => member.playerId === friend.id),
  );
  const validRecruitmentPartyIds = useMemo(
    () =>
      new Set(
        [...normalRecruitmentListings, ...bossRecruitmentListings].map(
          listing => listing.id,
        ),
      ),
    [bossRecruitmentListings, normalRecruitmentListings],
  );
  const bossChatMessages = useMemo(
    () =>
      lobbyChat.messages.map(message => {
        const recruitment = message.partyRecruitment;
        if (!recruitment || validRecruitmentPartyIds.has(recruitment.partyId)) {
          return message;
        }
        return {
          ...message,
          partyRecruitment: undefined,
        };
      }),
    [lobbyChat.messages, validRecruitmentPartyIds],
  );

  const renderNormalRecruitmentPanel = () => (
    <View style={styles.normalRecruitmentPanel}>
      <View style={styles.normalRecruitmentHeader}>
        <View>
          <Text style={styles.normalRecruitmentTitle}>파티 모집</Text>
          <Text style={styles.normalRecruitmentMeta}>
            {recruitmentLoading
              ? '목록 갱신 중'
              : `${normalRecruitmentListings.length}개 모집 중`}
          </Text>
        </View>
      </View>
      <ScrollView
        style={styles.normalRecruitmentScroll}
        contentContainerStyle={styles.normalRecruitmentContent}
      >
        {normalRecruitmentListings.length === 0 ? (
          <Text style={styles.normalRecruitmentEmpty}>
            {recruitmentLoading
              ? '파티 모집 목록을 확인하는 중입니다.'
              : '현재 올라온 파티 모집이 없습니다.'}
          </Text>
        ) : (
          normalRecruitmentListings.map(listing => {
            const raidDisplay = resolveRaidDisplay(
              listing.raidType,
              listing.bossStage,
            );
            const isOwnParty = listing.id === partyId;
            const target = {
              raidType: listing.raidType,
              bossStage: listing.bossStage,
              name: raidDisplay.name,
              color: raidDisplay.color,
              emoji: raidDisplay.emoji,
            };
            return (
              <View key={listing.id} style={styles.normalRecruitmentRow}>
                <View style={styles.normalRecruitmentInfo}>
                  <Text style={styles.normalRecruitmentName} numberOfLines={1}>
                    {raidDisplay.name} 파티
                  </Text>
                  <Text style={styles.normalRecruitmentText} numberOfLines={2}>
                    {listing.memberCount}/{MAX_PARTY_SIZE} 모집 중
                    {listing.hasPassword ? ' · 비공개' : ''}
                  </Text>
                  <Text style={styles.normalRecruitmentSub} numberOfLines={1}>
                    {listing.leaderNickname} · {listing.bossStage}단계
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.normalRecruitmentJoinBtn,
                    isOwnParty && styles.normalRecruitmentJoinBtnDisabled,
                  ]}
                  disabled={isOwnParty || partyActionLoading}
                  onPress={() => {
                    if (listing.hasPassword) {
                      openPartyManager(target, listing.id);
                      return;
                    }
                    void handleJoinPartyById(listing.id, true);
                  }}
                >
                  <Text style={styles.normalRecruitmentJoinText}>
                    {isOwnParty
                      ? '내 파티'
                      : listing.hasPassword
                      ? '비밀번호'
                      : '참가'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  if (coreLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#dc2626" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <Image source={IMG_BG} style={styles.bgImage} resizeMode="cover" />
      <MenuFloatingBlocks />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.title}>레이드</Text>
          <TouchableOpacity
            style={styles.friendsBtnWrap}
            onPress={() => navigation.navigate('Friends')}
          >
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
            style={[
              styles.modeTab,
              raidMode === 'boss' && styles.modeTabActive,
            ]}
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
          style={[
            styles.scrollView,
            raidMode === 'normal' && styles.normalRaidListPane,
          ]}
          contentContainerStyle={styles.scrollContent}
        >
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
                        첫 클리어 다이아 {entry.reward.firstClearDiamondReward}{' '}
                        / 반복 처치 +{entry.reward.repeatDiamondReward}
                      </Text>
                      <View style={styles.killBar}>
                        <View
                          style={[
                            styles.killBarFill,
                            {
                              width: `${Math.min(
                                (killCount / 10) * 100,
                                100,
                              )}%`,
                              backgroundColor: entry.color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.killCount}>
                        누적 처치 {killCount}회
                      </Text>
                    </View>
                    <View style={styles.raidActionColumn}>
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
                          {partyStartLocked ? '대기' : '도전'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.partyManageBtn,
                          { borderColor: entry.color },
                        ]}
                        onPress={() =>
                          openPartyManager({
                            raidType: 'normal',
                            bossStage: entry.stage,
                            name: entry.name,
                            color: entry.color,
                            emoji: entry.emoji,
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.partyManageBtnText,
                            { color: entry.color },
                          ]}
                        >
                          파티
                        </Text>
                      </TouchableOpacity>
                    </View>
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
                  방당 최대 {BOSS_RAID_MAX_PLAYERS}명까지 참가 가능하며, 가득
                  차면 새 방이 생성됩니다.
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
                      <View
                        key={entry.stage}
                        style={[
                          styles.bossCard,
                          { borderColor: entry.color },
                          disabled && styles.bossCardLocked,
                          partyStartLocked && styles.bossCardPartyLocked,
                        ]}
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
                        <Text style={styles.bossHp}>
                          {formatHp(entry.maxHp)}
                        </Text>
                        <Text
                          style={[
                            styles.unlockState,
                            unlocked ? styles.unlocked : styles.locked,
                          ]}
                        >
                          {unlocked
                            ? isAdmin
                              ? '관리자 입장 가능'
                              : bossWindowInfo.isOpen
                              ? '입장 가능'
                              : '개방 대기'
                            : '월드 클리어 필요'}
                        </Text>
                        <View style={styles.bossActionRow}>
                          <TouchableOpacity
                            style={[
                              styles.bossChallengeBtn,
                              { backgroundColor: `${entry.color}33` },
                              (disabled || partyStartLocked) &&
                                styles.challengeBtnDisabled,
                            ]}
                            disabled={disabled || partyStartLocked}
                            onPress={() => handleChallengeBoss(entry.stage)}
                          >
                            <Text
                              style={[
                                styles.bossChallengeBtnText,
                                { color: entry.color },
                              ]}
                            >
                              {partyStartLocked ? '대기' : '도전'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.bossPartyBtn,
                              { borderColor: entry.color },
                              disabled && styles.challengeBtnDisabled,
                            ]}
                            disabled={disabled}
                            onPress={() =>
                              openPartyManager({
                                raidType: 'boss',
                                bossStage: entry.stage,
                                name: entry.name,
                                color: entry.color,
                                emoji: entry.emoji,
                              })
                            }
                          >
                            <Text
                              style={[
                                styles.bossPartyBtnText,
                                { color: entry.color },
                              ]}
                            >
                              파티
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
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
                  : '파티장이 시작하면 진행 중 레이드가 표시됩니다. 입장 버튼을 눌러 직접 합류하세요.'}
              </Text>
              {partyActiveRaid && partyActiveRaidDisplay ? (
                <TouchableOpacity
                  style={[
                    styles.partyActiveRaidBtn,
                    { borderColor: partyActiveRaidDisplay.color },
                  ]}
                  onPress={handleJoinPartyActiveRaid}
                >
                  <View style={styles.partyActiveRaidInfo}>
                    <Text style={styles.partyActiveRaidTitle}>
                      진행 중 레이드 입장
                    </Text>
                    <Text style={styles.partyActiveRaidMeta}>
                      {partyActiveRaidDisplay.name} ·{' '}
                      {partyActiveRaidIsNormal ? '일반' : '보스'} 레이드
                    </Text>
                  </View>
                  <Text style={styles.partyActiveRaidEnter}>입장</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        {raidMode === 'normal' ? renderNormalRecruitmentPanel() : null}

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

        <RaidPartyManagerModal
          visible={Boolean(partyModalTarget)}
          target={partyModalTarget}
          partyId={partyId}
          members={partyMembers}
          isLeader={isLeader}
          myPlayerId={playerIdRef.current}
          listings={visibleRaidPartyListings}
          loading={raidPartyLoading}
          actionLoading={partyActionLoading}
          joinCode={partyJoinCode}
          partyPassword={partyPassword}
          onChangeJoinCode={setPartyJoinCode}
          onChangePartyPassword={setPartyPassword}
          onCreateParty={handleCreateParty}
          onPostRecruitment={handlePostRecruitment}
          onJoinByCode={handleJoinPartyFromCode}
          onJoinParty={partyIdToJoin => {
            void handleJoinPartyById(partyIdToJoin);
          }}
          onRandomJoin={handleRandomPartyJoin}
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
          onLeaveParty={handleLeaveParty}
          onDisbandParty={handleDisbandParty}
          onClose={closePartyManager}
        />

        {raidMode === 'boss' && !coreLoading && chatPlayerId ? (
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
            messages={bossChatMessages}
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
            onJoinParty={partyIdToJoin => {
              void handleJoinPartyById(partyIdToJoin, true);
            }}
            bottom={GAME_BOTTOM_NAV_CHAT_OFFSET}
          />
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1e' },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerSpacer: {
    width: 58,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  friendsBtnWrap: {
    minWidth: 58,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(196, 164, 255, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  friendsBtn: { color: '#f4f0ff', fontSize: 12, fontWeight: '800' },
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(54, 39, 108, 0.7)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 11,
  },
  modeTabActive: { backgroundColor: 'rgba(128, 88, 255, 0.9)' },
  modeTabText: { color: '#d3c9ff', fontSize: 13, fontWeight: '700' },
  modeTabTextActive: { color: '#fff' },
  scrollView: {
    flex: 1,
  },
  normalRaidListPane: {
    flex: 3,
  },
  scrollContent: { paddingBottom: 20, paddingHorizontal: 14 },
  normalRecruitmentPanel: {
    flex: 2,
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.42)',
    backgroundColor: 'rgba(15,23,42,0.82)',
    overflow: 'hidden',
  },
  normalRecruitmentHeader: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  normalRecruitmentTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
  },
  normalRecruitmentMeta: {
    color: '#86efac',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  normalRecruitmentChannelBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(134,239,172,0.42)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  normalRecruitmentChannelText: {
    color: '#bbf7d0',
    fontSize: 10,
    fontWeight: '900',
  },
  normalRecruitmentScroll: {
    flex: 1,
  },
  normalRecruitmentContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  normalRecruitmentEmpty: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingVertical: 18,
  },
  normalRecruitmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(2,6,23,0.48)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  normalRecruitmentInfo: {
    flex: 1,
    gap: 2,
  },
  normalRecruitmentName: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '900',
  },
  normalRecruitmentText: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 15,
  },
  normalRecruitmentSub: {
    color: '#86efac',
    fontSize: 10,
    fontWeight: '800',
  },
  normalRecruitmentJoinBtn: {
    minWidth: 52,
    borderRadius: 9,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  normalRecruitmentJoinBtnDisabled: {
    backgroundColor: '#475569',
  },
  normalRecruitmentJoinText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
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
  sectionLoadingCard: {
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.28)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  sectionLoadingText: {
    color: '#bfdbfe',
    fontSize: 12,
    fontWeight: '700',
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
    backgroundColor: 'rgba(66, 46, 135, 0.68)',
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
  raidActionColumn: {
    width: 66,
    gap: 6,
  },
  nrChallengeBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  nrChallengeBtnText: { fontSize: 13, fontWeight: '900' },
  partyManageBtn: {
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.34)',
    paddingHorizontal: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  partyManageBtnText: {
    fontSize: 12,
    fontWeight: '900',
  },
  challengeBtnDisabled: {
    opacity: 0.55,
  },
  bossRaidScheduleCard: {
    backgroundColor: 'rgba(66, 46, 135, 0.72)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 139, 111, 0.9)',
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
    backgroundColor: 'rgba(18, 11, 48, 0.7)',
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
    backgroundColor: 'rgba(66, 46, 135, 0.68)',
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
    backgroundColor: 'rgba(66, 46, 135, 0.68)',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    alignItems: 'center',
    minHeight: 170,
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
  bossActionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    alignSelf: 'stretch',
  },
  bossChallengeBtn: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 7,
    alignItems: 'center',
  },
  bossChallengeBtnText: {
    fontSize: 11,
    fontWeight: '900',
  },
  bossPartyBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 9,
    backgroundColor: 'rgba(15, 23, 42, 0.34)',
    paddingVertical: 7,
    alignItems: 'center',
  },
  bossPartyBtnText: {
    fontSize: 11,
    fontWeight: '900',
  },
  inviteInboxCard: {
    backgroundColor: 'rgba(45, 34, 95, 0.82)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(196, 164, 255, 0.32)',
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
    backgroundColor: 'rgba(66, 46, 135, 0.72)',
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
  partyActiveRaidBtn: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  partyActiveRaidInfo: {
    flex: 1,
    gap: 2,
  },
  partyActiveRaidTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
  },
  partyActiveRaidMeta: {
    color: '#94a3b8',
    fontSize: 11,
  },
  partyActiveRaidEnter: {
    color: '#facc15',
    fontSize: 12,
    fontWeight: '900',
  },
});
