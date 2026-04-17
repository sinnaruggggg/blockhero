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
  ImageBackground,
  StatusBar,
  useWindowDimensions,
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
import MenuFloatingBlocks from '../components/MenuFloatingBlocks';
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
const IMG_BG = require('../assets/ui/lobby_bg.jpg');
const IMG_FRIENDS = require('../assets/ui/friends.png');
const IMG_PROFILE = require('../assets/ui/profile.png');
const IMG_CODEX = require('../assets/ui/codex.png');
const IMG_BTN_CREATE = require('../assets/ui/btn_create.png');
const IMG_BTN_JOIN = require('../assets/ui/btn_join.png');
const IMG_BTN_RANDOM = require('../assets/ui/btn_random.png');
const IMG_HERO_KNIGHT = require('../assets/ui/hero_knight.png');
const IMG_HERO_MAGE = require('../assets/ui/hero_mage.png');
const IMG_RAID_BUTTON_SIDE = require('../assets/ui/raid/button_side.png');
const IMG_RAID_BUTTON_PRIMARY = require('../assets/ui/raid/button_primary.png');
const IMG_RAID_BOSS_SHOWCASE = require('../assets/ui/raid/boss_showcase_gargoyle.png');
const IMG_RAID_CHAT_ORB = require('../assets/ui/raid/chat_orb.png');
const IMG_RAID_CORNER_BUTTON = require('../assets/ui/raid/corner_button.png');
const IMG_RAID_PARTY_SLOT = require('../assets/ui/raid/party_slot_frame.png');
const IMG_RAID_RECRUIT_BAR = require('../assets/ui/raid/recruit_bar.png');
const IMG_RAID_STAGE_MEDAL_BLUE = require('../assets/ui/raid/stage_medal_blue.png');
const IMG_RAID_STAGE_MEDAL_GREEN = require('../assets/ui/raid/stage_medal_green.png');
const IMG_RAID_STAGE_MEDAL_RED = require('../assets/ui/raid/stage_medal_red.png');
const IMG_RAID_TIMER_RIBBON = require('../assets/ui/raid/timer_ribbon.png');
const IMG_RAID_LABEL_RIBBON = require('../assets/ui/raid/label_ribbon.png');
const IMG_RAID_STAGE_MEDAL_FINAL = require('../assets/ui/raid/stage_medal_final.png');
const IMG_RAID_BOSS_NAMEPLATE = require('../assets/ui/raid/boss_nameplate.png');

const PARTY_PREVIEW_IMAGES = [
  IMG_HERO_KNIGHT,
  IMG_HERO_MAGE,
  IMG_HERO_KNIGHT,
  IMG_HERO_MAGE,
];
const PARTY_PREVIEW_FALLBACKS = [
  { name: 'HeroOne', role: 'TANK', accent: '#55b6ff' },
  { name: 'MageGirl', role: 'HEALER', accent: '#9b6cff' },
  { name: 'RogueGuy', role: 'DPS', accent: '#ff6a5d' },
  { name: 'Maton', role: 'TANK', accent: '#f5b44a' },
];
const RAID_BOSS_SHOWCASE_NAME = 'Giga-Gargoyle';
const RAID_BOSS_REFERENCE_WIDTH = 434;
const RAID_BOSS_REFERENCE_HEIGHT = 688;
const RAID_BOSS_LAYOUT = {
  topInfo: { x: 382, y: 10, w: 40, h: 40 },
  topChat: { x: 382, y: 66, w: 40, h: 40 },
  timer: { x: 90, y: 8, w: 252, h: 92 },
  boss: { x: 94, y: 122, w: 244, h: 250 },
  bossAura: { x: 110, y: 166, w: 212, h: 126 },
  medals: [
    { x: 16, y: 164, w: 82, h: 82 },
    { x: 24, y: 266, w: 82, h: 82 },
    { x: 336, y: 164, w: 82, h: 82 },
    { x: 330, y: 272, w: 88, h: 88 },
  ],
  nameplate: { x: 82, y: 392, w: 272, h: 54 },
  nameplateInfo: { x: 362, y: 398, w: 36, h: 36 },
  partyRow: { x: 52, y: 451, w: 332, h: 108 },
  leftButton: { x: 18, y: 556, w: 94, h: 58 },
  centerButton: { x: 118, y: 549, w: 198, h: 66 },
  rightButton: { x: 322, y: 556, w: 94, h: 58 },
  recruitBar: { x: 12, y: 620, w: 330, h: 46 },
  chatOrb: { x: 348, y: 604, w: 66, h: 66 },
} as const;
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { manifest: creatorManifest } = useCreatorConfig();
  const [raidMode, setRaidMode] = useState<'normal' | 'boss'>('normal');
  const [showBossDetails, setShowBossDetails] = useState(false);
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
  const inviteChannelRef = useRef<any>(null);
  const socialChannelRef = useRef<any>(null);
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
      const creatorNormalRaid = resolveCreatorRaidRuntime(
        creatorManifest,
        'normal',
        stage,
      );
      const staticBoss =
        RAID_BOSSES.find(entry => entry.stage === stage) ?? RAID_BOSSES[0];
      const normalRaidMaxHp =
        creatorNormalRaid?.maxHp ?? getNormalRaidMaxHp(stage);
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

  const cleanup = useCallback(() => {
    cleanupPartyChannel();
    cleanupInviteChannel();
    cleanupSocialChannel();
  }, [cleanupInviteChannel, cleanupPartyChannel, cleanupSocialChannel]);

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
          void loadDataRef.current();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friends' },
        () => {
          void loadDataRef.current();
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
  }, [chatPlayerId, cleanupSocialChannel]);

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
  const featuredNormalEntry = normalRaidEntries[0] ?? null;
  const featuredNormalKills = featuredNormalEntry
    ? normalRaidProgress[featuredNormalEntry.stage]?.killCount ?? 0
    : 0;
  const featuredBossStage =
    activeRaids[0]?.boss_stage ?? unlockedBossStages[0] ?? bossRaidEntries[0]?.stage ?? 1;
  const featuredBossUnlocked =
    isAdmin || unlockedBossStages.includes(featuredBossStage);
  const bossReferenceScale = Math.min(
    (windowWidth - 18) / RAID_BOSS_REFERENCE_WIDTH,
    (windowHeight - 180) / RAID_BOSS_REFERENCE_HEIGHT,
  );
  const bossReferenceWidth = RAID_BOSS_REFERENCE_WIDTH * bossReferenceScale;
  const bossReferenceHeight = RAID_BOSS_REFERENCE_HEIGHT * bossReferenceScale;
  const bossShowcaseEntries = (() => {
    const picks: typeof bossRaidEntries = [];
    const pushUnique = (entry?: (typeof bossRaidEntries)[number]) => {
      if (!entry || picks.some(item => item.stage === entry.stage)) {
        return;
      }
      picks.push(entry);
    };

    pushUnique(bossRaidEntries.find(entry => entry.stage === 1));
    pushUnique(bossRaidEntries.find(entry => entry.stage === 2));
    pushUnique(bossRaidEntries.find(entry => entry.stage === 3));
    pushUnique(
      bossRaidEntries.find(entry => entry.stage === featuredBossStage) ??
        bossRaidEntries[3],
    );
    bossRaidEntries.forEach(pushUnique);

    return picks.slice(0, 4);
  })();
  const bossPartySlots = Array.from({length: 4}, (_, index) => {
    return partyMembers[index] ?? null;
  });
  const bossPartyCards = bossPartySlots.map((member, index) => {
    const fallback = PARTY_PREVIEW_FALLBACKS[index];
    return {
      member,
      image: PARTY_PREVIEW_IMAGES[index % PARTY_PREVIEW_IMAGES.length],
      role:
        member != null
          ? index === 1
            ? 'HEALER'
            : index === 2
              ? 'DPS'
              : 'TANK'
          : fallback.role,
      name: member?.nickname ?? fallback.name,
      accent: fallback.accent,
    };
  });
  const quickJoinRaid = activeRaids[0] ?? null;
  const partyActionTitle = !partyId
    ? 'CREATE'
    : isLeader
      ? partyMembers.length < MAX_PARTY_SIZE
        ? 'INVITE'
        : 'DISBAND'
      : 'LEAVE';
  const partyActionHint = !partyId
    ? '파티 생성'
    : isLeader
      ? partyMembers.length < MAX_PARTY_SIZE
        ? '친구 초대'
        : '파티 해산'
      : '파티 나가기';
  const recruitmentLine =
    incomingInvites.length > 0
      ? `${incomingInvites[0].inviterNickname}님의 파티 초대가 도착했습니다.`
      : partyId
        ? isLeader
          ? '모집 채팅을 열고 레이드 파티원을 더 모아보세요.'
          : '파티장이 시작하면 같은 레이드로 자동 합류합니다.'
        : '파티를 만들거나 빠른 입장으로 즉시 보스 레이드에 참가할 수 있습니다.';
  const recruitBadgeCount = Math.min(incomingInvites.length, 9);

  useEffect(() => {
    if (raidMode !== 'boss') {
      setShowBossDetails(false);
    }
  }, [raidMode]);

  const refBox = useCallback(
    (box: { x: number; y: number; w: number; h: number }) => ({
      left: box.x * bossReferenceScale,
      top: box.y * bossReferenceScale,
      width: box.w * bossReferenceScale,
      height: box.h * bossReferenceScale,
    }),
    [bossReferenceScale],
  );
  const refSize = useCallback(
    (value: number, min = 10) => Math.max(min, Math.round(value * bossReferenceScale)),
    [bossReferenceScale],
  );
  const medalSources = [
    IMG_RAID_STAGE_MEDAL_GREEN,
    IMG_RAID_STAGE_MEDAL_BLUE,
    IMG_RAID_STAGE_MEDAL_RED,
    IMG_RAID_STAGE_MEDAL_FINAL,
  ];

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
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <Image source={IMG_BG} style={styles.bgImage} resizeMode="cover" />
      <View pointerEvents="none" style={styles.bgVignette} />
      <View pointerEvents="none" style={styles.bgTopGlow} />
      <View pointerEvents="none" style={styles.bgBottomGlow} />
      <MenuFloatingBlocks />
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.raidHudTopBar, raidMode === 'boss' && styles.raidHudTopBarBoss]}>
          {raidMode === 'boss' ? (
            <View style={styles.referenceTopBarSpacer} />
          ) : (
            <>
              <TouchableOpacity
                style={styles.cornerIconButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <Image source={IMG_PROFILE} resizeMode="contain" style={styles.cornerIconImage} />
              </TouchableOpacity>

              <View style={styles.modeToggleWrap}>
                <TouchableOpacity
                  style={[
                    styles.modeToggleButton,
                    styles.modeToggleButtonActive,
                  ]}
                  onPress={() => setRaidMode('normal')}
                >
                  <Text
                    style={[
                      styles.modeToggleText,
                      styles.modeToggleTextActive,
                    ]}
                  >
                    NORMAL
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modeToggleButton}
                  onPress={() => setRaidMode('boss')}
                >
                  <Text style={styles.modeToggleText}>BOSS</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.topActionStack}>
                <TouchableOpacity
                  style={styles.cornerIconButton}
                  onPress={() => navigation.navigate('BossCodex')}
                >
                  <Image source={IMG_CODEX} resizeMode="contain" style={styles.cornerIconImage} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cornerIconButton}
                  onPress={() => {
                    if (incomingInvites.length > 0) {
                      setShowBossDetails(true);
                      return;
                    }
                    lobbyChat.toggleOpen();
                  }}
                >
                  <Text style={styles.cornerChatGlyph}>💬</Text>
                  {incomingInvites.length > 0 ? (
                    <View style={styles.cornerAlertBadge}>
                      <Text style={styles.cornerAlertBadgeText}>
                        {Math.min(incomingInvites.length, 9)}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {raidMode === 'boss' ? (
          <View style={styles.referenceBossShell}>
            <View
              style={[
                styles.referenceBossSurface,
                { width: bossReferenceWidth, height: bossReferenceHeight },
              ]}
            >
              <TouchableOpacity
                style={[styles.referenceFloatingButton, refBox(RAID_BOSS_LAYOUT.topInfo)]}
                activeOpacity={0.86}
                onPress={() => setShowBossDetails(current => !current)}
              >
                <ImageBackground
                  source={IMG_RAID_CORNER_BUTTON}
                  resizeMode="stretch"
                  style={styles.referenceIconBackground}
                >
                  <Text style={[styles.referenceIconText, { fontSize: refSize(24, 18) }]}>
                    i
                  </Text>
                </ImageBackground>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.referenceFloatingButton, refBox(RAID_BOSS_LAYOUT.topChat)]}
                activeOpacity={0.86}
                onPress={() => {
                  if (incomingInvites.length > 0) {
                    setShowBossDetails(true);
                    return;
                  }
                  lobbyChat.toggleOpen();
                }}
              >
                <ImageBackground
                  source={IMG_RAID_CORNER_BUTTON}
                  resizeMode="stretch"
                  style={styles.referenceIconBackground}
                >
                  <Text style={[styles.referenceIconText, { fontSize: refSize(19, 15) }]}>
                    💬
                  </Text>
                </ImageBackground>
                {recruitBadgeCount > 0 ? (
                  <View
                    style={[
                      styles.referenceBadge,
                      {
                        minWidth: refSize(18, 14),
                        height: refSize(18, 14),
                        borderRadius: refSize(9, 7),
                        right: -refSize(4, 3),
                        top: -refSize(4, 3),
                      },
                    ]}
                  >
                    <Text style={[styles.referenceBadgeText, { fontSize: refSize(10, 8) }]}>
                      {recruitBadgeCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>

              <ImageBackground
                source={IMG_RAID_TIMER_RIBBON}
                resizeMode="stretch"
                style={[styles.referenceTimerRibbon, refBox(RAID_BOSS_LAYOUT.timer)]}
              >
                <Text style={[styles.referenceTimerLabel, { fontSize: refSize(12, 10) }]}>
                  RAID STARTS IN:
                </Text>
                <Text style={[styles.referenceTimerValue, { fontSize: refSize(31, 22) }]}>
                  {formatBossRaidCountdownLabel(Date.now())}
                </Text>
              </ImageBackground>

              {bossShowcaseEntries.map((entry, index) => {
                const unlocked = isAdmin || unlockedBossStages.includes(entry.stage);
                const disabled = partyStartLocked || !unlocked;

                return (
                  <TouchableOpacity
                    key={`reference-stage-${entry.stage}`}
                    style={[
                      styles.referenceMedalTouch,
                      refBox(RAID_BOSS_LAYOUT.medals[index]),
                    ]}
                    activeOpacity={0.88}
                    disabled={disabled}
                    onPress={() => {
                      void handleChallengeBoss(entry.stage);
                    }}
                  >
                    <ImageBackground
                      source={medalSources[index] ?? IMG_RAID_STAGE_MEDAL_FINAL}
                      resizeMode="contain"
                      style={[styles.referenceMedalFrame, disabled && styles.referenceDisabled]}
                    >
                      {index === 3 ? (
                        <>
                          <Text
                            style={[styles.referenceMedalTitle, { fontSize: refSize(11, 9) }]}
                          >
                            FINAL
                          </Text>
                          <Text
                            style={[
                              styles.referenceMedalFinalText,
                              { fontSize: refSize(19, 14) },
                            ]}
                          >
                            BOSS
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text
                            style={[styles.referenceMedalTitle, { fontSize: refSize(11, 9) }]}
                          >
                            STAGE
                          </Text>
                          <Text
                            style={[styles.referenceMedalNumber, { fontSize: refSize(30, 22) }]}
                          >
                            {entry.stage}
                          </Text>
                        </>
                      )}
                      <View style={styles.referenceMedalFooter}>
                        <View
                          style={[
                            styles.referenceMedalGem,
                            {
                              width: refSize(11, 8),
                              height: refSize(11, 8),
                              borderRadius: refSize(5, 4),
                            },
                          ]}
                        />
                        <Text
                          style={[styles.referenceMedalFooterText, { fontSize: refSize(11, 9) }]}
                        >
                          {unlocked ? '0' : 'LOCK'}
                        </Text>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                );
              })}

              <View style={[styles.referenceBossAura, refBox(RAID_BOSS_LAYOUT.bossAura)]} />
              <View style={[styles.referenceBossDock, refBox(RAID_BOSS_LAYOUT.boss)]}>
                <Image
                  source={IMG_RAID_BOSS_SHOWCASE}
                  resizeMode="contain"
                  fadeDuration={0}
                  style={styles.referenceBossSprite}
                />
              </View>

              <ImageBackground
                source={IMG_RAID_BOSS_NAMEPLATE}
                resizeMode="stretch"
                style={[styles.referenceNameplate, refBox(RAID_BOSS_LAYOUT.nameplate)]}
              >
                <View style={styles.referenceNameplateTextBlock}>
                  <Text
                    numberOfLines={1}
                    style={[styles.referenceNameplateTitle, { fontSize: refSize(21, 15) }]}
                  >
                    {RAID_BOSS_SHOWCASE_NAME}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.referenceNameplateSubtitle, { fontSize: refSize(10, 8) }]}
                  >
                    {featuredBossUnlocked
                      ? 'Tap a medal to challenge'
                      : 'Clear World 30 to unlock'}
                  </Text>
                </View>
              </ImageBackground>

              <TouchableOpacity
                style={[styles.referenceFloatingButton, refBox(RAID_BOSS_LAYOUT.nameplateInfo)]}
                activeOpacity={0.86}
                onPress={() => navigation.navigate('BossCodex')}
              >
                <ImageBackground
                  source={IMG_RAID_CORNER_BUTTON}
                  resizeMode="stretch"
                  style={styles.referenceIconBackground}
                >
                  <Text style={[styles.referenceIconText, { fontSize: refSize(22, 16) }]}>
                    i
                  </Text>
                </ImageBackground>
              </TouchableOpacity>

              <View style={[styles.referencePartyRow, refBox(RAID_BOSS_LAYOUT.partyRow)]}>
                {bossPartyCards.map((card, index) => (
                  <ImageBackground
                    key={`reference-party-${index}`}
                    source={IMG_RAID_PARTY_SLOT}
                    resizeMode="stretch"
                    style={styles.referencePartySlot}
                    imageStyle={!card.member ? styles.referenceDisabled : undefined}
                  >
                    <View
                      style={[
                        styles.referencePartyRoleOrb,
                        { backgroundColor: card.accent },
                      ]}
                    />
                    <View style={styles.referencePartyPortraitWrap}>
                      <Image
                        source={card.image}
                        resizeMode="contain"
                        style={[
                          styles.referencePartyPortrait,
                          !card.member && styles.referencePartyPortraitMuted,
                        ]}
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[styles.referencePartyRole, { fontSize: refSize(10, 8) }]}
                    >
                      {card.role}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.referencePartyName, { fontSize: refSize(9, 8) }]}
                    >
                      {card.name}
                    </Text>
                  </ImageBackground>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.referenceActionTouch, refBox(RAID_BOSS_LAYOUT.leftButton)]}
                activeOpacity={0.86}
                onPress={() => {
                  if (!partyId) {
                    void handleCreateParty();
                    return;
                  }

                  if (isLeader) {
                    if (partyMembers.length < MAX_PARTY_SIZE) {
                      setShowInviteModal(true);
                      return;
                    }
                    void handleDisbandParty();
                    return;
                  }

                  void handleLeaveParty();
                }}
              >
                <ImageBackground
                  source={IMG_RAID_BUTTON_SIDE}
                  resizeMode="stretch"
                  style={styles.referenceActionFrame}
                >
                  <Text style={[styles.referenceActionLabel, { fontSize: refSize(10, 8) }]}>
                    PARTY
                  </Text>
                  <Text style={[styles.referenceActionText, { fontSize: refSize(16, 12) }]}>
                    {partyActionTitle}
                  </Text>
                </ImageBackground>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.referenceActionTouch, refBox(RAID_BOSS_LAYOUT.centerButton)]}
                activeOpacity={0.9}
                disabled={(!quickJoinRaid && !featuredBossUnlocked) || partyStartLocked}
                onPress={() => {
                  if (quickJoinRaid) {
                    void handleJoinRaid(quickJoinRaid);
                    return;
                  }
                  void handleChallengeBoss(featuredBossStage);
                }}
              >
                <ImageBackground
                  source={IMG_RAID_BUTTON_PRIMARY}
                  resizeMode="stretch"
                  style={[
                    styles.referenceActionFrame,
                    ((!quickJoinRaid && !featuredBossUnlocked) || partyStartLocked) &&
                      styles.referenceDisabled,
                  ]}
                >
                  <Text style={[styles.referenceQuickLabel, { fontSize: refSize(12, 10) }]}>
                    QUICK JOIN
                  </Text>
                </ImageBackground>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.referenceActionTouch, refBox(RAID_BOSS_LAYOUT.rightButton)]}
                activeOpacity={0.86}
                onPress={() => {
                  if (incomingInvites.length > 0) {
                    setShowBossDetails(true);
                    return;
                  }
                  lobbyChat.toggleOpen();
                }}
              >
                <ImageBackground
                  source={IMG_RAID_BUTTON_SIDE}
                  resizeMode="stretch"
                  style={styles.referenceActionFrame}
                >
                  <Text style={[styles.referenceActionText, { fontSize: refSize(16, 12) }]}>
                    RECRUIT
                  </Text>
                </ImageBackground>
                {recruitBadgeCount > 0 ? (
                  <View
                    style={[
                      styles.referenceBadge,
                      {
                        minWidth: refSize(20, 14),
                        height: refSize(20, 14),
                        borderRadius: refSize(10, 7),
                        right: -refSize(5, 3),
                        top: -refSize(5, 3),
                      },
                    ]}
                  >
                    <Text style={[styles.referenceBadgeText, { fontSize: refSize(10, 8) }]}>
                      {recruitBadgeCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.referenceRecruitTouch, refBox(RAID_BOSS_LAYOUT.recruitBar)]}
                activeOpacity={0.86}
                onPress={() => lobbyChat.toggleOpen()}
              >
                <ImageBackground
                  source={IMG_RAID_RECRUIT_BAR}
                  resizeMode="stretch"
                  style={styles.referenceRecruitFrame}
                >
                  <View style={styles.referenceRecruitBadgeInner}>
                    <Image
                      source={IMG_FRIENDS}
                      resizeMode="contain"
                      style={styles.referenceRecruitBadgeIcon}
                    />
                    <Text
                      style={[styles.referenceRecruitBadgeText, { fontSize: refSize(10, 8) }]}
                    >
                      RECRUITMENT
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[styles.referenceRecruitText, { fontSize: refSize(11, 9) }]}
                  >
                    {recruitmentLine}
                  </Text>
                </ImageBackground>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.referenceFloatingButton, refBox(RAID_BOSS_LAYOUT.chatOrb)]}
                activeOpacity={0.86}
                onPress={() => lobbyChat.toggleOpen()}
              >
                <ImageBackground
                  source={IMG_RAID_CHAT_ORB}
                  resizeMode="stretch"
                  style={styles.referenceChatOrbFrame}
                >
                  <Text style={[styles.referenceChatOrbText, { fontSize: refSize(24, 18) }]}>
                    💬
                  </Text>
                </ImageBackground>
                {recruitBadgeCount > 0 ? (
                  <View
                    style={[
                      styles.referenceBadge,
                      {
                        minWidth: refSize(18, 14),
                        height: refSize(18, 14),
                        borderRadius: refSize(9, 7),
                        right: -refSize(4, 3),
                        top: -refSize(4, 3),
                      },
                    ]}
                  >
                    <Text style={[styles.referenceBadgeText, { fontSize: refSize(10, 8) }]}>
                      {recruitBadgeCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.heroCard}>
            <ImageBackground
              source={IMG_RAID_LABEL_RIBBON}
              resizeMode="stretch"
              style={styles.heroRibbon}
              imageStyle={styles.heroRibbonImage}
            >
              <Text style={styles.heroRibbonText}>NORMAL RAID OPEN</Text>
            </ImageBackground>
            <Text style={styles.heroEmoji}>{featuredNormalEntry?.emoji ?? '⚔'}</Text>
            <Text style={styles.heroTitle}>
              {featuredNormalEntry?.name ?? '일반 레이드'}
            </Text>
            <Text style={styles.heroSubtitle}>
              상시 개방된 레이드에서 누적 처치와 반복 보상을 쌓아 보세요.
            </Text>
            <View style={styles.heroChipRow}>
              <View style={styles.heroChip}>
                <Text style={styles.heroChipLabel}>대표 단계</Text>
                <Text style={styles.heroChipValue}>
                  {featuredNormalEntry?.stage ?? 1}단계
                </Text>
              </View>
              <View style={styles.heroChip}>
                <Text style={styles.heroChipLabel}>누적 처치</Text>
                <Text style={styles.heroChipValue}>{featuredNormalKills}회</Text>
              </View>
              <View style={styles.heroChip}>
                <Text style={styles.heroChipLabel}>반복 보상</Text>
                <Text style={styles.heroChipValue}>
                  +{featuredNormalEntry?.reward.repeatDiamondReward ?? 0}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.heroActionBtn,
                (!featuredNormalEntry || partyStartLocked) &&
                  styles.challengeBtnDisabled,
              ]}
              disabled={!featuredNormalEntry || partyStartLocked}
              onPress={() => {
                if (featuredNormalEntry) {
                  void handleNormalRaidChallenge(featuredNormalEntry.stage);
                }
              }}
            >
              <Text style={styles.heroActionBtnText}>
                {partyStartLocked ? '파티장 시작 대기' : '대표 레이드 도전'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
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
            {showBossDetails ? (
              <>
                <View style={styles.bossModeDetailSwitch}>
                  <TouchableOpacity
                    style={styles.bossModeDetailSwitchBtn}
                    onPress={() => setRaidMode('normal')}
                  >
                    <Text style={styles.bossModeDetailSwitchBtnText}>NORMAL 보기</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.bossQuickInfoRow}>
                  <View style={styles.bossQuickInfoChip}>
                    <Text style={styles.bossQuickInfoLabel}>ENTRY</Text>
                    <Text style={styles.bossQuickInfoValue}>
                      {bossWindowInfo.isOpen ? 'OPEN NOW' : 'COUNTDOWN'}
                    </Text>
                  </View>
                  <View style={styles.bossQuickInfoChip}>
                    <Text style={styles.bossQuickInfoLabel}>CAPACITY</Text>
                    <Text style={styles.bossQuickInfoValue}>
                      MAX {BOSS_RAID_MAX_PLAYERS}
                    </Text>
                  </View>
                  <View style={styles.bossQuickInfoChip}>
                    <Text style={styles.bossQuickInfoLabel}>VOICE</Text>
                    <Text style={styles.bossQuickInfoValue}>IN RAID</Text>
                  </View>
                </View>

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
            ) : null}
          </>
        )}

        {(showBossDetails || raidMode !== 'boss') && incomingInvites.length > 0 && (
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

        {(showBossDetails || raidMode !== 'boss') && partyId ? (
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

        {(showBossDetails || raidMode !== 'boss') ? (
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
        ) : null}
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
            accentColor={raidMode === 'boss' ? '#44b8ff' : '#7a5bff'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#120f33' },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  bgVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 4, 28, 0.22)',
  },
  bgTopGlow: {
    position: 'absolute',
    top: -70,
    left: '10%',
    width: '80%',
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(176, 110, 255, 0.18)',
  },
  bgBottomGlow: {
    position: 'absolute',
    bottom: 90,
    left: '14%',
    width: '72%',
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(45, 168, 255, 0.12)',
  },
  safeArea: {
    flex: 1,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  raidHudTopBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 6,
    marginBottom: 8,
  },
  raidHudTopBarBoss: {
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 2,
    marginBottom: 0,
  },
  referenceTopBarSpacer: {
    width: 1,
    height: 1,
  },
  cornerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(57, 89, 126, 0.88)',
    borderWidth: 1.5,
    borderColor: '#d7b06a',
    shadowColor: '#2d1406',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cornerIconImage: {
    width: 22,
    height: 22,
  },
  cornerChatGlyph: {
    fontSize: 20,
  },
  cornerAlertBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#fff3d7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cornerAlertBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  topActionStack: {
    gap: 8,
  },
  referenceBossShell: {
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 12,
  },
  referenceBossSurface: {
    position: 'relative',
  },
  referenceFloatingButton: {
    position: 'absolute',
    zIndex: 20,
  },
  referenceIconBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referenceIconText: {
    color: '#ffffff',
    fontWeight: '900',
    textShadowColor: 'rgba(15,20,34,0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  referenceBadge: {
    position: 'absolute',
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fff3d7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 30,
  },
  referenceBadgeText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  referenceTimerRibbon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 18,
  },
  referenceTimerLabel: {
    color: '#ffe7a6',
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  referenceTimerValue: {
    color: '#ffffff',
    fontWeight: '900',
    marginTop: -1,
    textShadowColor: 'rgba(28,8,52,0.75)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  referenceMedalTouch: {
    position: 'absolute',
    zIndex: 16,
  },
  referenceMedalFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  referenceMedalTitle: {
    color: '#fff8d8',
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  referenceMedalNumber: {
    color: '#ffffff',
    fontWeight: '900',
    lineHeight: 32,
    marginTop: 1,
  },
  referenceMedalFinalText: {
    color: '#ffffff',
    fontWeight: '900',
    lineHeight: 24,
    marginTop: -1,
  },
  referenceMedalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 3,
  },
  referenceMedalGem: {
    backgroundColor: '#5fdcff',
    borderWidth: 1.5,
    borderColor: '#fff7d8',
  },
  referenceMedalFooterText: {
    color: '#fff7d4',
    fontWeight: '800',
  },
  referenceBossAura: {
    position: 'absolute',
    backgroundColor: 'rgba(122, 240, 255, 0.18)',
    borderRadius: 999,
    shadowColor: '#79eaff',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 14,
  },
  referenceBossDock: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  referenceBossSprite: {
    width: '112%',
    height: '112%',
  },
  referenceBossEmoji: {
    textAlign: 'center',
  },
  referenceNameplate: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 18,
    zIndex: 14,
  },
  referenceNameplateTextBlock: {
    flex: 1,
    alignItems: 'center',
  },
  referenceNameplateTitle: {
    color: '#fff8e6',
    fontWeight: '900',
    textShadowColor: 'rgba(17, 18, 56, 0.72)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  referenceNameplateSubtitle: {
    color: '#dbe6ff',
    fontWeight: '700',
    marginTop: 1,
  },
  referencePartyRow: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    zIndex: 12,
  },
  referencePartySlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginHorizontal: 3,
    paddingTop: 10,
    paddingHorizontal: 5,
    paddingBottom: 8,
  },
  referencePartyRoleOrb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 2,
  },
  referencePartyPortraitWrap: {
    width: '84%',
    height: '54%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referencePartyPortrait: {
    width: '100%',
    height: '100%',
  },
  referencePartyPortraitMuted: {
    opacity: 0.55,
  },
  referencePartyRole: {
    color: '#ffffff',
    fontWeight: '900',
    marginTop: 2,
  },
  referencePartyName: {
    color: '#f7edd6',
    fontWeight: '800',
    marginTop: 1,
  },
  referenceActionTouch: {
    position: 'absolute',
    zIndex: 14,
  },
  referenceActionFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingBottom: 2,
  },
  referenceActionLabel: {
    color: '#ffffff',
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  referenceActionText: {
    color: '#ffffff',
    fontWeight: '900',
    marginTop: -1,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(18, 31, 86, 0.72)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  referenceQuickLabel: {
    color: '#ffffff',
    fontWeight: '900',
    letterSpacing: 0.6,
    textShadowColor: 'rgba(17, 64, 98, 0.72)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  referenceRecruitTouch: {
    position: 'absolute',
    zIndex: 12,
  },
  referenceRecruitFrame: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  referenceRecruitBadgeInner: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  referenceRecruitBadgeIcon: {
    width: 18,
    height: 18,
    marginBottom: 1,
  },
  referenceRecruitBadgeText: {
    color: '#f8fbff',
    fontWeight: '900',
  },
  referenceRecruitText: {
    flex: 1,
    color: '#eee4ff',
    fontWeight: '700',
  },
  referenceChatOrbFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referenceChatOrbText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  referenceDisabled: {
    opacity: 0.5,
  },
  modeToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    backgroundColor: 'rgba(43, 20, 101, 0.82)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(226, 169, 77, 0.72)',
  },
  modeToggleButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  modeToggleButtonActive: {
    backgroundColor: 'rgba(120, 81, 255, 0.9)',
  },
  modeToggleText: {
    color: '#eadfff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modeToggleTextActive: {
    color: '#fff8e7',
  },
  raidHudHeroCard: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 26,
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(54, 28, 123, 0.32)',
  },
  timerBanner: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 288,
    minHeight: 96,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  timerBannerImage: {
    resizeMode: 'stretch',
  },
  timerBannerLabel: {
    color: '#ffe8a8',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  timerBannerValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 2,
  },
  stageArena: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  bossMonsterDock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossMonsterAura: {
    position: 'absolute',
    backgroundColor: 'rgba(98, 235, 255, 0.26)',
    borderWidth: 2,
    borderColor: 'rgba(173, 244, 255, 0.45)',
    shadowColor: '#60e9ff',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 8,
  },
  bossMonsterSprite: {
    zIndex: 2,
  },
  bossMonsterEmoji: {
    fontSize: 120,
  },
  stageMedal: {
    position: 'absolute',
  },
  stageMedalFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  stageMedalLeftTop: {
    left: 8,
    top: 34,
  },
  stageMedalLeftBottom: {
    left: 16,
    top: 130,
  },
  stageMedalRightTop: {
    right: 8,
    top: 34,
  },
  stageMedalRightBottom: {
    right: 16,
    top: 130,
  },
  stageMedalDisabled: {
    opacity: 0.45,
  },
  stageMedalTopText: {
    color: '#fff7da',
    fontSize: 11,
    fontWeight: '900',
  },
  stageMedalMainText: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 2,
  },
  stageMedalBottomText: {
    color: '#f9f0cf',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  bossNamePlate: {
    marginTop: -4,
    marginHorizontal: 14,
    minHeight: 54,
    paddingLeft: 18,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bossNamePlateImage: {
    resizeMode: 'stretch',
  },
  bossNamePlateTextBlock: {
    flex: 1,
    paddingVertical: 8,
  },
  bossNamePlateTitle: {
    color: '#fff8de',
    fontSize: 22,
    fontWeight: '900',
  },
  bossNamePlateSubtitle: {
    color: '#e6d7ff',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  bossInfoOrb: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(116, 169, 236, 0.94)',
    borderWidth: 1.5,
    borderColor: '#f3d79b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossInfoOrbIcon: {
    width: 18,
    height: 18,
  },
  partyPreviewStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 10,
  },
  partyPreviewSlot: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(58, 28, 123, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(226, 169, 77, 0.72)',
    alignItems: 'center',
  },
  partyPreviewSlotEmpty: {
    opacity: 0.72,
  },
  partyPreviewPortrait: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
    overflow: 'hidden',
  },
  partyPreviewPortraitImage: {
    width: '96%',
    height: '96%',
  },
  partyPreviewPortraitText: {
    color: '#fff6dc',
    fontSize: 18,
    fontWeight: '900',
  },
  partyPreviewRole: {
    color: '#aee4ff',
    fontSize: 10,
    fontWeight: '900',
  },
  partyPreviewName: {
    color: '#fff7df',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  hudActionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
  },
  hudImageButtonWrap: {
    flex: 1,
    position: 'relative',
    borderRadius: 18,
    overflow: 'visible',
  },
  hudImageButtonWrapPrimary: {
    flex: 1.2,
  },
  hudImageButtonDisabled: {
    opacity: 0.45,
  },
  hudActionShadow: {
    ...StyleSheet.absoluteFillObject,
    top: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 10, 42, 0.38)',
  },
  hudImageButtonBackground: {
    flex: 1,
    justifyContent: 'center',
  },
  hudImageButtonImage: {
    borderRadius: 18,
  },
  hudImageButtonTextOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  hudActionTopText: {
    color: '#eef7ff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  hudActionMainText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 1,
  },
  hudActionBottomText: {
    color: '#eff9ff',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  quickJoinButtonTopText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  quickJoinButtonMainText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 1,
  },
  quickJoinButtonBottomText: {
    color: '#effbff',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  hudActionAlertBadge: {
    position: 'absolute',
    right: -5,
    top: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fff3d7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  hudActionAlertBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  recruitmentTicker: {
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(49, 31, 111, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(226, 169, 77, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 10,
  },
  recruitmentTickerBadge: {
    borderRadius: 10,
    backgroundColor: 'rgba(100, 136, 189, 0.96)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recruitmentTickerBadgeText: {
    color: '#fffaf0',
    fontSize: 10,
    fontWeight: '900',
  },
  recruitmentTickerText: {
    flex: 1,
    color: '#eee3ff',
    fontSize: 12,
    fontWeight: '700',
  },
  detailTogglePill: {
    alignSelf: 'center',
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(40, 24, 90, 0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(226, 169, 77, 0.72)',
  },
  detailTogglePillText: {
    color: '#f2e7c5',
    fontSize: 11,
    fontWeight: '900',
  },
  bossModeDetailSwitch: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  bossModeDetailSwitchBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(34, 21, 88, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(226, 169, 77, 0.72)',
  },
  bossModeDetailSwitchBtnText: {
    color: '#fff0ce',
    fontSize: 11,
    fontWeight: '900',
  },
  bossQuickInfoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  bossQuickInfoChip: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(47, 26, 101, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(226, 169, 77, 0.6)',
    alignItems: 'center',
  },
  bossQuickInfoLabel: {
    color: '#ffd88a',
    fontSize: 10,
    fontWeight: '900',
  },
  bossQuickInfoValue: {
    color: '#fff9e4',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
  },
  headerSpacer: {
    width: 58,
  },
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  titleEyebrow: {
    color: '#ffd88a',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    color: '#fff7de',
    fontSize: 22,
    fontWeight: '900',
    textShadowColor: 'rgba(19,8,35,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  friendsBtnWrap: {
    minWidth: 58,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(36, 30, 93, 0.76)',
    borderWidth: 1.5,
    borderColor: 'rgba(236, 183, 96, 0.65)',
    shadowColor: '#080311',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  friendsBtn: { color: '#fff4d7', fontSize: 12, fontWeight: '800' },
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginBottom: 12,
    backgroundColor: 'rgba(43, 27, 99, 0.76)',
    borderRadius: 18,
    padding: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(232, 178, 90, 0.4)',
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
  },
  modeTabActive: {
    backgroundColor: 'rgba(108, 58, 214, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(236, 183, 96, 0.75)',
  },
  modeTabText: { color: '#dfd2ff', fontSize: 13, fontWeight: '800' },
  modeTabTextActive: { color: '#fff5d4' },
  heroCard: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(33, 20, 82, 0.94)',
    borderWidth: 2.5,
    borderColor: '#e2a94d',
    shadowColor: '#0b0419',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 14,
  },
  heroRibbon: {
    alignSelf: 'center',
    marginBottom: 10,
    minWidth: 178,
    minHeight: 54,
    paddingHorizontal: 24,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRibbonImage: {
    resizeMode: 'stretch',
  },
  heroRibbonText: {
    color: '#fff0bb',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroSprite: {
    width: 124,
    height: 124,
    marginBottom: 8,
  },
  heroEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  heroTitle: {
    color: '#fff8e1',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroSubtitle: {
    color: '#ddd0ff',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  heroChipRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginTop: 12,
  },
  heroChip: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroChipLabel: {
    color: '#d4c6ff',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroChipValue: {
    color: '#fff5d7',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 3,
  },
  heroActionBtn: {
    marginTop: 14,
    minWidth: 190,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 12,
    backgroundColor: '#2da8ff',
    borderWidth: 2,
    borderColor: '#dff5ff',
  },
  heroActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: { paddingBottom: 30, paddingHorizontal: 14 },
  loadErrorCard: {
    backgroundColor: 'rgba(110, 20, 58, 0.52)',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255, 131, 154, 0.45)',
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
    color: '#e0d6ff',
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 18,
    textAlign: 'center',
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
    backgroundColor: 'rgba(33, 20, 82, 0.92)',
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    gap: 10,
    shadowColor: '#0b0419',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
  nrEmoji: { fontSize: 30 },
  nrInfo: { flex: 1, gap: 4 },
  nrName: { fontSize: 14, fontWeight: '800' },
  nrReward: { color: '#ded4ff', fontSize: 11 },
  killBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  killBarFill: { height: 4, borderRadius: 2 },
  killCount: { color: '#cabdff', fontSize: 10 },
  nrChallengeBtn: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  nrChallengeBtnText: { fontSize: 13, fontWeight: '900' },
  challengeBtnDisabled: {
    opacity: 0.55,
  },
  bossRaidScheduleCard: {
    backgroundColor: 'rgba(33, 20, 82, 0.9)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(226, 169, 77, 0.86)',
    alignItems: 'center',
    marginBottom: 12,
  },
  bossRaidScheduleTitle: {
    color: '#fff5d7',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  bossRaidScheduleDesc: {
    color: '#ddd0ff',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  bossRaidTimer: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  bossRaidTimerLabel: { color: '#d4c6ff', fontSize: 11 },
  bossRaidTimerValue: {
    color: '#fff7de',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  section: { marginBottom: 12 },
  sectionTitle: {
    color: '#fff1c7',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(75, 43, 155, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 178, 90, 0.72)',
  },
  activeRaidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(33, 20, 82, 0.92)',
    borderRadius: 18,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    shadowColor: '#0b0419',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
  activeRaidCardDisabled: {
    opacity: 0.45,
  },
  activeRaidEmoji: { fontSize: 28 },
  activeRaidSprite: { width: 40, height: 40 },
  activeRaidInfo: { flex: 1 },
  activeRaidName: { color: '#fff5d7', fontSize: 14, fontWeight: '800' },
  activeRaidHp: { color: '#ddd0ff', fontSize: 11, marginTop: 2 },
  activeRaidTimer: {
    color: '#fff7de',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(219, 63, 82, 0.85)',
    overflow: 'hidden',
  },
  bossGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bossCard: {
    width: '47%',
    backgroundColor: 'rgba(33, 20, 82, 0.92)',
    borderRadius: 20,
    borderWidth: 2,
    padding: 12,
    alignItems: 'center',
    minHeight: 140,
    shadowColor: '#0b0419',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
  bossCardLocked: { opacity: 0.45 },
  bossCardPartyLocked: { opacity: 0.55 },
  bossEmoji: { fontSize: 30 },
  bossSprite: { width: 54, height: 54 },
  bossStage: {
    color: '#fff1c7',
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
  bossHp: { color: '#ddd0ff', fontSize: 11, marginTop: 4 },
  unlockState: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  unlocked: { color: '#fff8e1', backgroundColor: 'rgba(34, 197, 94, 0.7)' },
  locked: { color: '#fff8e1', backgroundColor: 'rgba(219, 63, 82, 0.78)' },
  inviteInboxCard: {
    backgroundColor: 'rgba(33, 20, 82, 0.92)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(232, 178, 90, 0.36)',
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    gap: 10,
  },
  inviteInboxTitle: {
    color: '#fff4d7',
    fontSize: 14,
    fontWeight: '900',
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
    color: '#fff7de',
    fontSize: 13,
    fontWeight: '800',
  },
  inviteInboxMeta: {
    color: '#d4c6ff',
    fontSize: 11,
  },
  inviteInboxActions: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteAcceptBtn: {
    borderRadius: 12,
    backgroundColor: '#2da8ff',
    borderWidth: 1.5,
    borderColor: '#dff5ff',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  inviteAcceptBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  inviteDeclineBtn: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  inviteDeclineBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  partyHintCard: {
    backgroundColor: 'rgba(33, 20, 82, 0.92)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(232, 178, 90, 0.32)',
    padding: 12,
    gap: 6,
    marginTop: 4,
  },
  partyHintTitle: {
    color: '#fff7de',
    fontSize: 13,
    fontWeight: '900',
  },
  partyHintText: {
    color: '#ddd0ff',
    fontSize: 12,
    lineHeight: 18,
  },
});
