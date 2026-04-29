import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Animated,
  Vibration,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Board from '../components/Board';
import PieceSelector from '../components/PieceSelector';
import BattleNoticeOverlay from '../components/BattleNoticeOverlay';
import BossDisplay from '../components/BossDisplay';
import FloatingDamageLabel from '../components/FloatingDamageLabel';
import ComboGaugeOverlay from '../components/ComboGaugeOverlay';
import BoardSkillCastEffect, {
  type BoardSkillCastEffectEvent,
} from '../components/BoardSkillCastEffect';
import NextPiecePreview from '../components/NextPiecePreview';
import PiecePlacementEffect from '../components/PiecePlacementEffect';
import LineClearEffect from '../components/LineClearEffect';
import RaidSummonOverlay from '../components/RaidSummonOverlay';
import SkillTriggerBoardEffect from '../components/SkillTriggerBoardEffect';
import SkillBar from '../components/SkillBar';
import CharacterSprite from '../components/CharacterSprite';
import KnightSprite from '../components/KnightSprite';
import BaseVisualElementView, {
  buildVisualAutomationLabel,
  buildVisualElementStyle,
} from '../components/VisualElementView';
import { RaidParticipant } from '../components/RaidParticipants';
import { useDragDrop } from '../game/useDragDrop';
import { BOSS_RAID_WINDOW_MS, COMBO_TIMEOUT_MS, FEVER_DURATION } from '../constants';
import { RAID_BOSSES, getNormalRaidMaxHp } from '../constants/raidBosses';
import { formatAttackTimer } from '../constants/raidConfig';
import {
  adjustEnemyAttackValue,
  adjustEnemyHpValue,
  getNormalRaidAttackStats,
  getRaidBossAttackStats,
} from '../game/battleBalance';
import { resolveCombatTurn } from '../game/combatFlow';
import {
  applyCombatDamageEffectsDetailed,
  applyRewardMultipliers,
  getCharacterSkillEffects,
  getPieceGenerationOptions,
  shouldDodgeAttack,
} from '../game/characterSkillEffects';
import {
  createBoard,
  generatePlaceablePieces,
  placePiece,
  checkAndClearLines,
  countBlocks,
  canPlacePiece,
  canPlaceAnyPiece,
  Piece,
  Board as BoardType,
  getDifficulty,
  resetPieceGenerationHistory,
} from '../game/engine';
import {
  getPlayerId,
  getNickname,
  getSelectedCharacter,
  loadCharacterData,
  loadGameData,
  addGold,
  addDiamonds,
  addItem,
  loadCodexData,
  collectSpecialBlockRewards,
  GameData,
  getUnlockedSpecialPieceShapeIndices,
  unlockSkin,
  loadUnlockedTitles,
  saveUnlockedTitles,
  updateLocalCodex,
  gainSummonExp,
  gainMonsterSummonExp,
  grantMonsterSummonReward,
  loadMonsterSummonData,
  loadSkinData,
} from '../stores/gameStore';
import { flushPlayerStateNow } from '../services/playerState';
import { playGameBgm, stopGameBgm } from '../services/gameAudio';
import { playGameSfx } from '../services/gameSfx';
import { playBlockPlacementSound } from '../services/placementSound';
import { playLineClearSound } from '../services/lineClearSound';
import { submitRaidLeaderboard } from '../services/rankingService';
import { supabase } from '../services/supabase';
import {
  getRaidInstance,
  getRaidParticipants,
  dealRaidDamage,
  joinRaidInstance,
  getRaidChannel,
  expireRaidInstance,
  failRaidInstance,
  leaveRaidParticipant,
  restartRaidInstance,
  updateRaidParticipantRuntimeState,
} from '../services/raidService';
import { leaveOrDisbandParty } from '../services/partyService';
import {
  clearRaidScreenCache,
  readRaidScreenCache,
  writeRaidScreenCache,
} from '../services/raidRuntimeCache';
import { getAdminStatus } from '../services/adminSync';
import { upsertCodexEntry } from '../services/codexService';
import { calculateRewards, RewardResult } from '../constants/raidRewards';
import { checkNewTitles } from '../constants/titles';
import { getSkinColors } from '../game/skinContext';
import { getSkinBoardBg, setActiveSkin } from '../game/skinContext';
import { t } from '../i18n';
import { getCharacterAtk, getCharacterHp } from '../constants/characters';
import { getNormalRaidRewardPreview } from '../game/raidRules';
import {
  claimFirstClearDia,
  loadNormalRaidProgress,
  recordNormalRaidKill,
} from '../stores/gameStore';
import {
  applySkinCombatDamage,
  applySkinIncomingDamage,
  applySkinRewardBonuses,
  getActiveSkinLoadout,
  getSkinBattleEffects,
  getSummonAttack,
  getSummonExpRequired,
  getSummonGaugeGain,
  mergeSkinPieceGenerationOptions,
} from '../game/skinSummonRuntime';
import {
  getMonsterSummonBattleStats,
  getMonsterSummonExpRequired,
  getMonsterSummonGaugeGain,
  getSelectedMonsterSummonLoadout,
  type MonsterSummonSkillKey,
} from '../game/monsterSummonRuntime';
import {
  consumeRaidSkillGauge,
  getRaidSkillCharges,
  getRaidSkillEffectiveMultiplier,
  getRaidSkillGaugeGain,
  getRaidSkillLevels,
} from '../game/raidSkillRuntime';
import {
  getMonsterPoseSource,
  getRaidBossSpriteSet,
  getRaidSummonSpriteSet,
  getRaidSummonSpriteSetById,
  MonsterSpritePose,
} from '../assets/monsterSprites';
import {
  getCachedCharacterVisualTunings,
  loadCharacterVisualTunings,
  subscribeCharacterVisualTunings,
} from '../stores/characterVisualTuning';
import { useBattleNotice } from '../hooks/useBattleNotice';
import {
  buildBoardSkillTriggerNotice,
  buildSkillTriggerNotice,
} from '../game/skillTriggerNotice';
import {
  loadGameSettings,
  type SkillTriggerNoticeMode,
} from '../stores/gameSettings';
import {
  pushFloatingDamageHit,
  type FloatingDamageHit,
} from '../game/floatingDamage';
import { useVisualConfig } from '../hooks/useVisualConfig';
import {
  buildVisualTintColor,
  getGameplayDragTuning,
  getRaidBackgroundOverride,
  getVisualElementRule,
  type VisualViewport,
} from '../game/visualConfig';
import { useCreatorConfig } from '../hooks/useCreatorConfig';
import { resolveCreatorRaidRuntime } from '../game/creatorManifest';
import {
  buildBoardCellEffectCells,
  buildPiecePlacementEffectCells,
  type PiecePlacementEffectCell,
} from '../game/piecePlacementEffect';
import {
  buildLineClearEffectCells,
  type LineClearEffectCell,
} from '../game/lineClearEffect';
import { type MeasuredBoardLayout } from '../game/boardScreenMetrics';
import { getBoardMetrics } from '../components/Board';
import { scaleGameplayUnit } from '../game/layoutScale';
import { applySkillBoardEffects } from '../game/skillBoardEffects';

const HIT_FRAMES = [
  require('../assets/effects/hit_00.png'),
  require('../assets/effects/hit_01.png'),
  require('../assets/effects/hit_02.png'),
  require('../assets/effects/hit_03.png'),
  require('../assets/effects/hit_04.png'),
  require('../assets/effects/hit_05.png'),
  require('../assets/effects/hit_06.png'),
  require('../assets/effects/hit_07.png'),
  require('../assets/effects/hit_08.png'),
  require('../assets/effects/hit_09.png'),
  require('../assets/effects/hit_10.png'),
  require('../assets/effects/hit_11.png'),
  require('../assets/effects/hit_12.png'),
  require('../assets/effects/hit_13.png'),
];

function HitEffect({ damage, onDone }: { damage: number; onDone: () => void }) {
  const [frame, setFrame] = useState(0);
  const scale = Math.min(2.5, 1 + Math.floor(damage / 10) * 0.1);
  const size = 120 * scale;
  const rotation = useRef(Math.floor(Math.random() * 4) * 90).current;
  const flipX = useRef(Math.random() > 0.5).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(previous => {
        if (previous >= HIT_FRAMES.length - 1) {
          clearInterval(interval);
          onDone();
          return previous;
        }

        return previous + 1;
      });
    }, 20);

    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <Image
      source={HIT_FRAMES[frame]}
      resizeMode="contain"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          top: -(size - 88) / 2,
          left: -(size - 88) / 2,
          transform: [{ rotate: `${rotation}deg` }, { scaleX: flipX ? -1 : 1 }],
        },
      ]}
    />
  );
}

interface ChatMsg {
  id: string;
  nickname: string;
  text: string;
}

interface RaidBattleStats {
  damageDealt: number;
  healingDone: number;
  healingReceived: number;
  damageTaken: number;
  summonsUsed: number;
  comboMax: number;
  deathCount: number;
  isAlive: boolean;
}

type RaidBattleStatsMap = Record<string, RaidBattleStats>;
type RaidStatsTab =
  | 'damageDealt'
  | 'healingDone'
  | 'healingReceived'
  | 'damageTaken'
  | 'comboMax';

interface RemoteRaidSummon {
  eventId: string;
  casterId: string;
  summonId: string;
  summonType: string;
  spawnAnchor: number;
  createdAt: number;
  durationMs: number;
  attackPulse: number;
  returning: boolean;
}

interface RaidClearSnapshot {
  clearedAt: number;
  clearTimeMs: number;
  bossName: string;
  bossStage: number;
  participants: RaidParticipant[];
  battleStats: RaidBattleStatsMap;
}

const HEARTBEAT_INTERVAL = 5000;
const INIT_QUERY_TIMEOUT_MS = 7000;
const SUMMON_SPAWN_POINTS = 4;
const RAID_CHARACTER_VISUALS: Record<string, { name: string; emoji: string }> =
  {
    knight: { name: '기사', emoji: '🛡️' },
    mage: { name: '매지션', emoji: '🔮' },
    archer: { name: '궁수', emoji: '🏹' },
    rogue: { name: '도적', emoji: '🗡️' },
    healer: { name: '힐러', emoji: '✨' },
  };

const RAID_CHARACTER_PORTRAITS: Partial<Record<string, any>> = {
  knight: require('../assets/ui/hero_knight.png'),
  mage: require('../assets/ui/hero_mage.png'),
};

function withTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = INIT_QUERY_TIMEOUT_MS,
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

function createEmptyRaidBattleStats(isAlive = true): RaidBattleStats {
  return {
    damageDealt: 0,
    healingDone: 0,
    healingReceived: 0,
    damageTaken: 0,
    summonsUsed: 0,
    comboMax: 0,
    deathCount: 0,
    isAlive,
  };
}

function formatRaidStat(value: number) {
  return Math.round(value).toLocaleString();
}

const RAID_STATS_TABS: Array<{ key: RaidStatsTab; label: string }> = [
  { key: 'damageDealt', label: '딜량' },
  { key: 'healingDone', label: '힐량' },
  { key: 'healingReceived', label: '받은힐량' },
  { key: 'damageTaken', label: '받은피해' },
  { key: 'comboMax', label: '콤보' },
];

function formatRaidClearTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function isRaidReplaceAction(action: any) {
  return (
    action?.type === 'REPLACE' &&
    (action?.payload?.name === 'Raid' ||
      action?.payload?.name === 'RaidScreen')
  );
}

export default function RaidScreen({ route, navigation }: any) {
  const windowDimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const visualViewport: VisualViewport = {
    width: windowDimensions.width,
    height: windowDimensions.height,
    safeTop: insets.top,
    safeBottom: insets.bottom,
  };
  const modeVerticalGutter = scaleGameplayUnit(46, visualViewport, 16);
  const { instanceId, bossStage, isNormalRaid = false } = route.params;
  const staticBoss =
    RAID_BOSSES.find(b => b.stage === bossStage) || RAID_BOSSES[0];
  const { manifest: visualManifest, assetUris: visualAssetUris } =
    useVisualConfig();
  const dragTuning = getGameplayDragTuning(visualManifest);
  const { manifest: creatorManifest, assetUris: creatorAssetUris } =
    useCreatorConfig();
  const raidScreenId = isNormalRaid ? 'raidNormal' : 'raidBoss';

  useEffect(() => {
    playGameBgm(isNormalRaid ? 'raidNormal' : 'raidBoss');
    return () => stopGameBgm();
  }, [isNormalRaid, visualManifest.version]);

  const creatorRaidRuntime = resolveCreatorRaidRuntime(
    creatorManifest,
    isNormalRaid ? 'normal' : 'boss',
    bossStage,
  );
  const creatorNormalRaidRuntime = resolveCreatorRaidRuntime(
    creatorManifest,
    'normal',
    bossStage,
  );
  const bossName = creatorRaidRuntime?.name ?? t(staticBoss.nameKey);
  const bossColor = creatorRaidRuntime?.monsterColor ?? staticBoss.color;
  const bossEmoji = creatorRaidRuntime?.monsterEmoji ?? staticBoss.emoji;
  const normalRaidBaseHp =
    creatorNormalRaidRuntime
      ? adjustEnemyHpValue(creatorNormalRaidRuntime.maxHp)
      : getNormalRaidMaxHp(bossStage);
  const normalRaidAttackStats = creatorNormalRaidRuntime
    ? {
        attack: adjustEnemyAttackValue(creatorNormalRaidRuntime.enemyAttack),
        attackIntervalMs: creatorNormalRaidRuntime.attackIntervalMs,
        tier: 'boss' as const,
      }
    : getNormalRaidAttackStats(bossStage);
  const bossMaxHp = isNormalRaid ? normalRaidBaseHp : normalRaidBaseHp * 20;
  const bossAttackStats = isNormalRaid
    ? normalRaidAttackStats
    : {
        attack: normalRaidAttackStats.attack * 2,
        attackIntervalMs:
          creatorRaidRuntime?.attackIntervalMs ??
          getRaidBossAttackStats(bossStage).attackIntervalMs,
        tier: 'boss' as const,
      };
  const cachedRaidSnapshot = useRef(readRaidScreenCache(instanceId)).current;
  const raidBoardMetrics = getBoardMetrics(visualViewport, {
    compact: true,
  });

  const [board, setBoard] = useState<BoardType>(createBoard());
  const [pieces, setPieces] = useState<(Piece | null)[]>([]);
  const [bossHp, setBossHp] = useState(cachedRaidSnapshot?.bossHp ?? bossMaxHp);
  const [playerHp, setPlayerHp] = useState(200);
  const [maxPlayerHp, setMaxPlayerHp] = useState(200);
  const [combo, setCombo] = useState(0);
  const [comboRemainingMs, setComboRemainingMs] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [feverGauge, setFeverGauge] = useState(0);
  const [feverActive, setFeverActive] = useState(false);
  const [feverRemainingMs, setFeverRemainingMs] = useState(0);
  const [participants, setParticipants] = useState<RaidParticipant[]>(
    cachedRaidSnapshot?.participants ?? [],
  );
  const [selectedCharacterId, setSelectedCharacterId] = useState('knight');
  const [skillGauge, setSkillGauge] = useState(0);
  const [activeMultiplier, setActiveMultiplier] = useState(1);
  const [myTotalDamage, setMyTotalDamage] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [bossDefeated, setBossDefeated] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [boardLayout, setBoardLayout] = useState<MeasuredBoardLayout | null>(
    null,
  );
  const [bossDamageHits, setBossDamageHits] = useState<FloatingDamageHit[]>([]);
  const [bossSummonDamageHits, setBossSummonDamageHits] = useState<
    FloatingDamageHit[]
  >([]);
  const [bossImpactHit, setBossImpactHit] = useState<FloatingDamageHit | null>(
    null,
  );
  const [placementEffect, setPlacementEffect] = useState<{
    id: number;
    cells: PiecePlacementEffectCell[];
  } | null>(null);
  const [lineClearEffect, setLineClearEffect] = useState<{
    id: number;
    cells: LineClearEffectCell[];
  } | null>(null);
  const [boardSkillCastEffect, setBoardSkillCastEffect] = useState<
    BoardSkillCastEffectEvent[] | null
  >(null);
  const [playerAttackPulse, setPlayerAttackPulse] = useState(0);
  const [bossPose, setBossPose] = useState<MonsterSpritePose>('idle');
  const [round, setRound] = useState(0);
  const [nextPieces, setNextPieces] = useState<Piece[]>([]);
  const [attackTimerText, setAttackTimerText] = useState(
    isNormalRaid
      ? '?곸떆 ?꾩쟾'
      : cachedRaidSnapshot
        ? formatAttackTimer(
            Math.max(0, cachedRaidSnapshot.expiresAt - Date.now()),
          )
        : '10:00',
  );
  const [expiresAt, setExpiresAt] = useState(cachedRaidSnapshot?.expiresAt ?? 0);
  const [rewardData, setRewardData] = useState<RewardResult | null>(null);
  const [rewardCollected, setRewardCollected] = useState(false);
  const [standingsExpanded, setStandingsExpanded] = useState(false);
  const [skinBoardBg, setSkinBoardBg] = useState(getSkinBoardBg());
  const [summonGauge, setSummonGauge] = useState(0);
  const [summonGaugeRequired, setSummonGaugeRequired] = useState(0);
  const [summonAttack, setSummonAttack] = useState(0);
  const [summonActive, setSummonActive] = useState(false);
  const [summonRemainingMs, setSummonRemainingMs] = useState(0);
  const [summonName, setSummonName] = useState('');
  const [summonLevel, setSummonLevel] = useState(1);
  const [summonExp, setSummonExp] = useState(0);
  const [summonExpRequired, setSummonExpRequired] = useState(1);
  const [selectedMonsterSummonId, setSelectedMonsterSummonId] = useState<
    string | null
  >(null);
  const [summonAttackPulse, setSummonAttackPulse] = useState(0);
  const [summonOverlayVisible, setSummonOverlayVisible] = useState(false);
  const [summonReturning, setSummonReturning] = useState(false);
  const [summonSpawnIndex, setSummonSpawnIndex] = useState(0);
  const [characterVisualTunings, setCharacterVisualTunings] = useState(
    getCachedCharacterVisualTunings(),
  );
  const [raidSkillLevels, setRaidSkillLevels] = useState<
    Record<number, number>
  >({});
  const [localCoreReady, setLocalCoreReady] = useState(false);
  const [instanceReady, setInstanceReady] = useState(Boolean(cachedRaidSnapshot));
  const [participantsReady, setParticipantsReady] = useState(
    Boolean(cachedRaidSnapshot),
  );
  const [failureReason, setFailureReason] = useState<
    'board_full' | 'hp_zero' | 'time_up'
  >('board_full');

  // Spectator mode states
  const [spectatorMode, setSpectatorMode] = useState(false);
  const [alivePlayers, setAlivePlayers] = useState<string[]>(
    cachedRaidSnapshot?.alivePlayerIds ?? [],
  );
  const [_spectatingIdx, setSpectatingIdx] = useState(0);
  const [spectatorBoard, setSpectatorBoard] = useState<BoardType>(
    createBoard(),
  );
  const [spectatorNickname, setSpectatorNickname] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [battleStats, setBattleStats] = useState<RaidBattleStatsMap>({});
  const [showBattleStatsPanel, setShowBattleStatsPanel] = useState(false);
  const [battleStatsTab, setBattleStatsTab] =
    useState<RaidStatsTab>('damageDealt');
  const [remoteSummons, setRemoteSummons] = useState<RemoteRaidSummon[]>([]);
  const [clearSnapshot, setClearSnapshot] = useState<RaidClearSnapshot | null>(
    null,
  );
  const [rematchReady, setRematchReady] = useState<Record<string, boolean>>({});
  const [raidStarterId, setRaidStarterId] = useState('');

  const startedAtRef = useRef(0);
  const vibrationRef = useRef(true);
  const boardRef = useRef<View>(null);
  const boardStateRef = useRef<BoardType>(createBoard());
  const playerIdRef = useRef('');
  const nicknameRef = useRef('');
  const channelRef = useRef<any>(null);
  const heartbeatTimer = useRef<any>(null);
  const attackTimer = useRef<any>(null);
  const bossAttackTimer = useRef<any>(null);
  const bossPoseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feverTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameOverRef = useRef(false);
  const bossDefeatedRef = useRef(false);
  const spectatorRef = useRef(false);
  const attackPowerRef = useRef(10);
  const baseAttackPowerRef = useRef(10);
  const playerHpRef = useRef(200);
  const maxPlayerHpRef = useRef(200);
  const baseMaxPlayerHpRef = useRef(200);
  const bossHpRef = useRef(cachedRaidSnapshot?.bossHp ?? bossMaxHp);
  const selectedCharacterRef = useRef<string | null>(null);
  const selectedCharacterDataRef = useRef<any>(null);
  const activeSkinIdRef = useRef(0);
  const comboRef = useRef(0);
  const comboExpireAtRef = useRef<number | null>(null);
  const linesClearedRef = useRef(0);
  const feverGaugeRef = useRef(0);
  const feverActiveRef = useRef(false);
  const feverExpireAtRef = useRef<number | null>(null);
  const reviveUsedRef = useRef(false);
  const smallPieceStreakRef = useRef(0);
  const lastPlacementAtRef = useRef<number | null>(null);
  const damageReductionBuffUntilRef = useRef(0);
  const summonGaugeRef = useRef(0);
  const summonGaugeRequiredRef = useRef(0);
  const summonAttackRef = useRef(0);
  const summonActiveRef = useRef(false);
  const summonRemainingMsRef = useRef(0);
  const activeSummonIdRef = useRef<string | null>(null);
  const selectedMonsterSummonIdRef = useRef<string | null>(null);
  const selectedMonsterSummonEvolutionRef = useRef(0);
  const selectedMonsterSummonSkillsRef = useRef<MonsterSummonSkillKey[]>([]);
  const monsterSummonGaugeGainMultiplierRef = useRef(1);
  const monsterSummonExpGainMultiplierRef = useRef(1);
  const monsterSummonDoubleAttackChanceRef = useRef(0);
  const summonExpEarnedRef = useRef(0);
  const summonLevelRef = useRef(1);
  const summonExpRef = useRef(0);
  const summonAttackMultiplierRef = useRef(1);
  const raidPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const skillGaugeRef = useRef(0);
  const raidSkillLevelsRef = useRef<Record<number, number>>({});
  const floatingHitIdRef = useRef(0);
  const placementEffectIdRef = useRef(0);
  const lineClearEffectIdRef = useRef(0);
  const boardSkillEffectIdRef = useRef(0);
  const nextPiecesRef = useRef<Piece[]>([]);
  const remoteBoardsRef = useRef<
    Map<string, { board: BoardType; nickname: string }>
  >(new Map());
  const participantsRef = useRef<RaidParticipant[]>(
    cachedRaidSnapshot?.participants ?? [],
  );
  const battleStatsRef = useRef<RaidBattleStatsMap>({});
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const remoteSummonTimersRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());
  const rematchReadyRef = useRef<Record<string, boolean>>({});
  const raidStarterIdRef = useRef('');
  const raidPartyIdRef = useRef<string | null>(null);
  const publishRaidFailedRef = useRef<() => void>(() => {});
  const alivePlayersRef = useRef<string[]>(
    cachedRaidSnapshot?.alivePlayerIds ?? [],
  );
  const participantCountRef = useRef(cachedRaidSnapshot?.participants.length ?? 0);
  const chatScrollRef = useRef<ScrollView>(null);
  const gameDataRef = useRef<GameData | null>(null);
  const playerHpAnim = useRef(new Animated.Value(1)).current;
  const boardShakeAnim = useRef(new Animated.Value(0)).current;
  const skillNoticeModeRef = useRef<SkillTriggerNoticeMode>('triggered_only');
  const screenShakeEnabledRef = useRef(true);
  const allowLeaveRef = useRef(false);
  const leavingRaidRef = useRef(false);
  const {
    message: battleNoticeMessage,
    messageKey: battleNoticeKey,
    showNotice: showBattleNotice,
  } = useBattleNotice(3000);
  const {
    message: skillEffectMessage,
    messageKey: skillEffectMessageKey,
    showNotice: showSkillEffect,
  } = useBattleNotice(1600);

  useEffect(() => {
    participantsRef.current = participants;
    participantCountRef.current = participants.length;
  }, [participants]);

  useEffect(() => {
    boardStateRef.current = board;
  }, [board]);

  useEffect(() => {
    maxPlayerHpRef.current = maxPlayerHp;
  }, [maxPlayerHp]);

  useEffect(() => {
    let active = true;
    loadCharacterVisualTunings().then(nextTunings => {
      if (active) {
        setCharacterVisualTunings(nextTunings);
      }
    });
    const unsubscribe = subscribeCharacterVisualTunings(nextTunings => {
      if (active) {
        setCharacterVisualTunings(nextTunings);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const getRaidEffects = useCallback(
    () =>
      getCharacterSkillEffects(
        selectedCharacterRef.current,
        selectedCharacterDataRef.current,
        {
          mode: 'raid',
          partySize: Math.max(1, participantCountRef.current),
          bossHpRatio: bossHpRef.current / Math.max(1, bossMaxHp),
        },
      ),
    [bossMaxHp],
  );

  const getCurrentPieceOptions = useCallback(
    () => ({
      ...mergeSkinPieceGenerationOptions(
        getPieceGenerationOptions(getRaidEffects()),
        activeSkinIdRef.current,
      ),
      rewardMode: 'raid' as const,
      unlockedSpecialShapeIndices: getUnlockedSpecialPieceShapeIndices(
        gameDataRef.current,
      ),
    }),
    [getRaidEffects],
  );

  const buildRaidPiecePack = useCallback(
    (targetBoard: BoardType, targetRound: number) => {
      const difficulty = getDifficulty(
        Math.min(bossStage + Math.floor(Math.max(1, targetRound) / 5), 10),
      );
      return generatePlaceablePieces(
        targetBoard,
        difficulty,
        getSkinColors(),
        getCurrentPieceOptions(),
      );
    },
    [bossStage, getCurrentPieceOptions],
  );

  const updateNextPieces = useCallback((piecesToPreview: Piece[]) => {
    nextPiecesRef.current = piecesToPreview;
    setNextPieces(piecesToPreview);
  }, []);

  const createRaidEventId = useCallback(
    (type: string) =>
      `${instanceId}:${type}:${playerIdRef.current || 'local'}:${Date.now()}:${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    [instanceId],
  );

  const markRaidEventProcessed = useCallback((eventId?: string | null) => {
    if (!eventId) {
      return false;
    }
    if (processedEventIdsRef.current.has(eventId)) {
      return true;
    }
    processedEventIdsRef.current.add(eventId);
    if (processedEventIdsRef.current.size > 800) {
      const oldest = processedEventIdsRef.current.values().next().value;
      if (oldest) {
        processedEventIdsRef.current.delete(oldest);
      }
    }
    return false;
  }, []);

  const persistLocalRaidRuntimeState = useCallback(
    (patch: Parameters<typeof updateRaidParticipantRuntimeState>[2]) => {
      const playerId = playerIdRef.current;
      if (!playerId) {
        return;
      }

      void updateRaidParticipantRuntimeState(instanceId, playerId, patch);
    },
    [instanceId],
  );

  const buildLocalRaidRuntimeSnapshot = useCallback(() => {
    const playerId = playerIdRef.current;
    if (!playerId) {
      return null;
    }

    const participant = participantsRef.current.find(
      entry => entry.playerId === playerId,
    );
    const isAlive = !spectatorRef.current;
    const localStats =
      battleStatsRef.current[playerId] ?? createEmptyRaidBattleStats(isAlive);

    // RAID_FIX: heartbeat carries the current runtime snapshot so a device
    // that misses a one-shot broadcast can still recover party battle data.
    return {
      playerId,
      nickname: nicknameRef.current,
      totalDamage: participant?.totalDamage ?? 0,
      avatarIcon: participant?.avatarIcon ?? nicknameRef.current.slice(0, 1),
      role:
        participant?.role ??
        (playerId === raidStarterIdRef.current ? 'host' : 'member'),
      isHost:
        typeof participant?.isHost === 'boolean'
          ? participant.isHost
          : playerId === raidStarterIdRef.current,
      isReady: Boolean(rematchReadyRef.current[playerId]),
      isAlive,
      currentHp: playerHpRef.current,
      maxHp: Math.max(maxPlayerHpRef.current, playerHpRef.current),
      board: boardStateRef.current,
      battleStats: {
        ...localStats,
        damageDealt: Math.max(
          localStats.damageDealt,
          participant?.totalDamage ?? 0,
        ),
        isAlive,
      },
    };
  }, []);

  const removeParticipantFromRaid = useCallback((targetPlayerId: string) => {
    if (!targetPlayerId) {
      return;
    }

    // RAID_FIX: explicit leaves must disappear on every client immediately,
    // while normal deaths remain visible as dead/spectator participants.
    remoteBoardsRef.current.delete(targetPlayerId);
    setRemoteSummons(previous =>
      previous.filter(entry => entry.casterId !== targetPlayerId),
    );
    setParticipants(previous => {
      const ranked = previous
        .filter(entry => entry.playerId !== targetPlayerId)
        .sort((a, b) => b.totalDamage - a.totalDamage)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
      participantsRef.current = ranked;
      participantCountRef.current = ranked.length;
      return ranked;
    });
    setAlivePlayers(previous => {
      const next = previous.filter(id => id !== targetPlayerId);
      alivePlayersRef.current = next;
      return next;
    });
    const currentStats =
      battleStatsRef.current[targetPlayerId] ??
      createEmptyRaidBattleStats(false);
    const nextStatsMap = {
      ...battleStatsRef.current,
      [targetPlayerId]: {
        ...currentStats,
        isAlive: false,
      },
    };
    battleStatsRef.current = nextStatsMap;
    setBattleStats(nextStatsMap);
  }, []);

  const applyParticipantRuntimeSnapshot = useCallback((payload: any) => {
    const playerId = payload?.playerId;
    if (!playerId || playerId === playerIdRef.current) {
      return;
    }

    if (payload.left === true || payload.role === 'left') {
      removeParticipantFromRaid(playerId);
      return;
    }

    const isAlive =
      typeof payload.isAlive === 'boolean' ? payload.isAlive : undefined;

    if (typeof payload.isReady === 'boolean') {
      setRematchReady(previous => {
        const next = { ...previous, [playerId]: payload.isReady };
        rematchReadyRef.current = next;
        return next;
      });
    }

    if (payload.board) {
      // RAID_FIX: heartbeat also carries board state so spectators recover
      // when the one-shot board_state broadcast is missed.
      remoteBoardsRef.current.set(playerId, {
        board: payload.board,
        nickname: payload.nickname ?? playerId.slice(0, 8),
      });
      if (spectatorRef.current) {
        const aliveList = alivePlayersRef.current.filter(
          id => id !== playerIdRef.current,
        );
        if (aliveList.length > 0) {
          setSpectatingIdx(index => {
            const watchingId = aliveList[index % aliveList.length];
            if (watchingId === playerId) {
              setSpectatorBoard(payload.board);
              setSpectatorNickname(payload.nickname ?? playerId.slice(0, 8));
            }
            return index;
          });
        }
      }
    }

    if (payload.battleStats && typeof payload.battleStats === 'object') {
      const nextStats = {
        ...createEmptyRaidBattleStats(isAlive ?? true),
        ...(battleStatsRef.current[playerId] ?? {}),
        ...payload.battleStats,
        isAlive:
          isAlive ??
          payload.battleStats.isAlive ??
          battleStatsRef.current[playerId]?.isAlive ??
          true,
      };
      const nextStatsMap = {
        ...battleStatsRef.current,
        [playerId]: nextStats,
      };
      battleStatsRef.current = nextStatsMap;
      setBattleStats(nextStatsMap);
    } else if (typeof isAlive === 'boolean') {
      const currentStats =
        battleStatsRef.current[playerId] ??
        createEmptyRaidBattleStats(isAlive);
      const nextStatsMap = {
        ...battleStatsRef.current,
        [playerId]: {
          ...currentStats,
          isAlive,
        },
      };
      battleStatsRef.current = nextStatsMap;
      setBattleStats(nextStatsMap);
    }

    if (typeof isAlive === 'boolean') {
      setAlivePlayers(previous => {
        const next = isAlive
          ? previous.includes(playerId)
            ? previous
            : [...previous, playerId]
          : previous.filter(id => id !== playerId);
        alivePlayersRef.current = next;
        return next;
      });
    }

    setParticipants(previous => {
      let found = false;
      const next = previous.map(entry => {
        if (entry.playerId !== playerId) {
          return entry;
        }
        found = true;
        return {
          ...entry,
          nickname: payload.nickname ?? entry.nickname,
          totalDamage:
            typeof payload.totalDamage === 'number'
              ? Math.max(entry.totalDamage, payload.totalDamage)
              : entry.totalDamage,
          avatarIcon: payload.avatarIcon ?? entry.avatarIcon,
          role: payload.role ?? entry.role,
          isHost:
            typeof payload.isHost === 'boolean' ? payload.isHost : entry.isHost,
          isReady:
            typeof payload.isReady === 'boolean'
              ? payload.isReady
              : entry.isReady,
          isAlive:
            typeof isAlive === 'boolean' ? isAlive : entry.isAlive,
          currentHp:
            typeof payload.currentHp === 'number'
              ? payload.currentHp
              : entry.currentHp,
          maxHp:
            typeof payload.maxHp === 'number' ? payload.maxHp : entry.maxHp,
        };
      });

      if (!found && payload.nickname) {
        next.push({
          playerId,
          nickname: payload.nickname,
          totalDamage:
            typeof payload.totalDamage === 'number' ? payload.totalDamage : 0,
          rank: next.length + 1,
          avatarIcon: payload.avatarIcon ?? payload.nickname.slice(0, 1),
          role:
            payload.role ??
            (playerId === raidStarterIdRef.current ? 'host' : 'member'),
          isHost:
            typeof payload.isHost === 'boolean'
              ? payload.isHost
              : playerId === raidStarterIdRef.current,
          isReady: Boolean(payload.isReady),
          isAlive: typeof isAlive === 'boolean' ? isAlive : true,
          currentHp:
            typeof payload.currentHp === 'number'
              ? payload.currentHp
              : undefined,
          maxHp:
            typeof payload.maxHp === 'number' ? payload.maxHp : undefined,
        });
      }

      const ranked = next
        .sort((a, b) => b.totalDamage - a.totalDamage)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
      participantsRef.current = ranked;
      participantCountRef.current = ranked.length;
      return ranked;
    });
  }, [removeParticipantFromRaid]);

  const applyBattleStats = useCallback(
    (
      targetPlayerId: string,
      patch: Partial<RaidBattleStats>,
      eventId?: string | null,
    ) => {
      if (!targetPlayerId || markRaidEventProcessed(eventId)) {
        return;
      }

      // RAID_FIX: battleStats is the raid-only source of truth for the
      // post-death panel and clear snapshot; event ids prevent double counts.
      const current =
        battleStatsRef.current[targetPlayerId] ??
        createEmptyRaidBattleStats(true);
      const next: RaidBattleStats = {
        damageDealt: current.damageDealt + Math.max(0, patch.damageDealt ?? 0),
        healingDone: current.healingDone + Math.max(0, patch.healingDone ?? 0),
        healingReceived:
          current.healingReceived + Math.max(0, patch.healingReceived ?? 0),
        damageTaken: current.damageTaken + Math.max(0, patch.damageTaken ?? 0),
        summonsUsed: current.summonsUsed + Math.max(0, patch.summonsUsed ?? 0),
        comboMax: Math.max(current.comboMax, patch.comboMax ?? 0),
        deathCount: current.deathCount + Math.max(0, patch.deathCount ?? 0),
        isAlive:
          typeof patch.isAlive === 'boolean' ? patch.isAlive : current.isAlive,
      };
      const nextMap = { ...battleStatsRef.current, [targetPlayerId]: next };
      battleStatsRef.current = nextMap;
      setBattleStats(nextMap);
      if (targetPlayerId === playerIdRef.current) {
        persistLocalRaidRuntimeState({
          battleStats: next as unknown as Record<string, unknown>,
          isAlive: next.isAlive,
          currentHp: playerHpRef.current,
          maxHp: maxPlayerHpRef.current,
          boardState: boardStateRef.current,
        });
      }
    },
    [markRaidEventProcessed, persistLocalRaidRuntimeState],
  );

  const syncParticipantsFromRows = useCallback(
    (rows: any[] | null | undefined, instanceExpiresAt: number) => {
      // RAID_FIX: a participant marked as left is a delete fallback for older
      // DB policies. Treat it exactly like a deleted raid participant row.
      const visibleRows = (rows ?? []).filter(
        participant => participant?.role !== 'left',
      );
      const nextReadyMap = { ...rematchReadyRef.current };
      const nextStatsMap: RaidBattleStatsMap = { ...battleStatsRef.current };
      visibleRows.forEach((participant: any) => {
        if (typeof participant.is_ready === 'boolean') {
          nextReadyMap[participant.player_id] = participant.is_ready;
        }
        if (participant.board_state) {
          // RAID_FIX: board_state is the DB fallback for devices that miss
          // realtime board_state/heartbeat broadcasts.
          applyParticipantRuntimeSnapshot({
            playerId: participant.player_id,
            nickname: participant.nickname,
            board: participant.board_state,
            isReady: participant.is_ready,
            isAlive: participant.is_alive,
            currentHp: participant.current_hp,
            maxHp: participant.max_hp,
          });
        }
        if (
          participant.battle_stats &&
          typeof participant.battle_stats === 'object'
        ) {
          const currentStats =
            nextStatsMap[participant.player_id] ??
            createEmptyRaidBattleStats(participant.is_alive !== false);
          const dbStats = participant.battle_stats as Partial<RaidBattleStats>;
          nextStatsMap[participant.player_id] = {
            ...createEmptyRaidBattleStats(participant.is_alive !== false),
            ...currentStats,
            ...dbStats,
            damageDealt: Math.max(
              currentStats.damageDealt ?? 0,
              dbStats.damageDealt ?? 0,
              participant.total_damage ?? 0,
            ),
            isAlive:
              typeof participant.is_alive === 'boolean'
                ? participant.is_alive
                : dbStats.isAlive ?? currentStats.isAlive ?? true,
          };
        } else if (typeof participant.total_damage === 'number') {
          const currentStats =
            nextStatsMap[participant.player_id] ??
            createEmptyRaidBattleStats(participant.is_alive !== false);
          nextStatsMap[participant.player_id] = {
            ...currentStats,
            damageDealt: Math.max(
              currentStats.damageDealt,
              participant.total_damage,
            ),
            isAlive:
              typeof participant.is_alive === 'boolean'
                ? participant.is_alive
                : currentStats.isAlive,
          };
        }
      });
      rematchReadyRef.current = nextReadyMap;
      setRematchReady(nextReadyMap);
      battleStatsRef.current = nextStatsMap;
      setBattleStats(nextStatsMap);

      const partList = visibleRows
        .map((participant: any) => ({
          playerId: participant.player_id,
          nickname: participant.nickname,
          totalDamage: participant.total_damage ?? 0,
          rank: 0,
          avatarIcon:
            participant.avatar_icon ?? participant.nickname?.slice(0, 1),
          role:
            participant.role ??
            (participant.player_id === raidStarterIdRef.current
              ? 'host'
              : 'member'),
          isHost:
            typeof participant.is_host === 'boolean'
              ? participant.is_host
              : participant.player_id === raidStarterIdRef.current,
          isReady: Boolean(nextReadyMap[participant.player_id]),
          isAlive:
            typeof participant.is_alive === 'boolean'
              ? participant.is_alive
              : nextStatsMap[participant.player_id]?.isAlive ?? true,
          currentHp:
            typeof participant.current_hp === 'number'
              ? participant.current_hp
              : participant.player_id === playerIdRef.current
              ? playerHpRef.current
              : undefined,
          maxHp:
            typeof participant.max_hp === 'number'
              ? participant.max_hp
              : participant.player_id === playerIdRef.current
              ? baseMaxPlayerHpRef.current
              : undefined,
          joinedAt: participant.joined_at,
        }))
        .sort((a, b) => b.totalDamage - a.totalDamage)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setParticipants(partList);
      participantsRef.current = partList;
      participantCountRef.current = partList.length;
      const nextAlive = partList
        .filter(entry => entry.isAlive !== false)
        .map(entry => entry.playerId);
      alivePlayersRef.current = nextAlive;
      setAlivePlayers(nextAlive);
      if (
        partList.length > 0 &&
        nextAlive.length === 0 &&
        !bossDefeatedRef.current &&
        !gameOverRef.current
      ) {
        publishRaidFailedRef.current();
      }
      const ensuredStats: RaidBattleStatsMap = { ...battleStatsRef.current };
      partList.forEach(entry => {
        if (!ensuredStats[entry.playerId]) {
          ensuredStats[entry.playerId] = createEmptyRaidBattleStats(
            entry.isAlive ?? true,
          );
        }
      });
      battleStatsRef.current = ensuredStats;
      setBattleStats(ensuredStats);
      writeRaidScreenCache(instanceId, {
        bossHp: bossHpRef.current,
        expiresAt: instanceExpiresAt,
        participants: partList,
        alivePlayerIds: alivePlayersRef.current,
      });
    },
    [applyParticipantRuntimeSnapshot, instanceId],
  );

  const showSkillTriggerNotice = useCallback(
    (...events: Parameters<typeof buildSkillTriggerNotice>[1]) => {
      const noticeMessage = buildSkillTriggerNotice(
        skillNoticeModeRef.current,
        events,
      );
      if (noticeMessage) {
        showBattleNotice(noticeMessage);
      }

      const boardMessage = buildBoardSkillTriggerNotice(events);
      if (boardMessage) {
        showSkillEffect(boardMessage);
      }
    },
    [showBattleNotice, showSkillEffect],
  );

  const queueBossDamageHit = useCallback((damage: number) => {
    floatingHitIdRef.current += 1;
    const hitId = floatingHitIdRef.current;
    const nextHit = { id: hitId, damage };
    setBossDamageHits(current => pushFloatingDamageHit(current, hitId, damage));
    setBossImpactHit(nextHit);
  }, []);

  const queueSummonDamageHit = useCallback((damage: number) => {
    floatingHitIdRef.current += 1;
    const hitId = floatingHitIdRef.current;
    setBossSummonDamageHits(current =>
      pushFloatingDamageHit(current, hitId, damage),
    );
  }, []);

  const grantSummonBattleExp = useCallback((damage: number) => {
    const monsterSummonId = selectedMonsterSummonIdRef.current;
    if (monsterSummonId && damage > 0) {
      const expGain = Math.max(
        1,
        Math.round(damage * monsterSummonExpGainMultiplierRef.current),
      );
      summonExpEarnedRef.current += expGain;
      summonExpRef.current += expGain;

      let leveled = false;
      while (
        summonExpRef.current >= getMonsterSummonExpRequired(summonLevelRef.current)
      ) {
        summonExpRef.current -= getMonsterSummonExpRequired(summonLevelRef.current);
        summonLevelRef.current += 1;
        leveled = true;
      }

      setSummonLevel(summonLevelRef.current);
      setSummonExp(summonExpRef.current);
      setSummonExpRequired(getMonsterSummonExpRequired(summonLevelRef.current));

      if (leveled) {
        const nextStats = getMonsterSummonBattleStats(monsterSummonId, {
          level: summonLevelRef.current,
          evolutionStage: selectedMonsterSummonEvolutionRef.current,
          skills: selectedMonsterSummonSkillsRef.current,
        });
        summonAttackRef.current = nextStats.attack;
        setSummonAttack(nextStats.attack);
      }
      return;
    }

    const skinId = activeSkinIdRef.current;
    if (skinId <= 0 || damage <= 0) {
      return;
    }

    const expGain = Math.max(1, Math.round(damage));
    summonExpEarnedRef.current += expGain;
    summonExpRef.current += expGain;

    let leveled = false;
    while (summonExpRef.current >= getSummonExpRequired(summonLevelRef.current)) {
      summonExpRef.current -= getSummonExpRequired(summonLevelRef.current);
      summonLevelRef.current += 1;
      leveled = true;
    }

    if (leveled) {
      // RAID_FIX: summon attacks can level the summon during the raid, and the
      // stronger attack is used for the next independent summon hit.
      const multiplier =
        summonAttackMultiplierRef.current ||
        getSkinBattleEffects(skinId).summonAttackMultiplier;
      const nextAttack = Math.max(
        1,
        Math.round(getSummonAttack(skinId, summonLevelRef.current) * multiplier),
      );
      summonAttackRef.current = nextAttack;
      setSummonAttack(nextAttack);
    }
  }, []);

  const showPlacementEffect = useCallback(
    (piece: Piece, row: number, col: number) => {
      if (!boardLayout) {
        return;
      }
      const cells = buildPiecePlacementEffectCells(
        boardLayout,
        piece,
        row,
        col,
        true,
        visualViewport,
      );
      if (cells.length === 0) {
        return;
      }
      placementEffectIdRef.current += 1;
      setPlacementEffect({ id: placementEffectIdRef.current, cells });
    },
    [boardLayout, visualViewport],
  );

  const triggerBoardShake = useCallback(() => {
    if (!screenShakeEnabledRef.current) {
      return;
    }

    boardShakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(boardShakeAnim, {
        toValue: -8,
        duration: 38,
        useNativeDriver: true,
      }),
      Animated.timing(boardShakeAnim, {
        toValue: 8,
        duration: 42,
        useNativeDriver: true,
      }),
      Animated.timing(boardShakeAnim, {
        toValue: -5,
        duration: 34,
        useNativeDriver: true,
      }),
      Animated.timing(boardShakeAnim, {
        toValue: 0,
        duration: 48,
        useNativeDriver: true,
      }),
    ]).start();
  }, [boardShakeAnim]);

  const showLineClearEffect = useCallback(
    (cells: LineClearEffectCell[]) => {
      if (cells.length === 0) {
        return;
      }

      triggerBoardShake();
      playLineClearSound();
      lineClearEffectIdRef.current += 1;
      setLineClearEffect({id: lineClearEffectIdRef.current, cells});
    },
    [triggerBoardShake],
  );

  const showBoardSkillCastEffects = useCallback(
    (
      animations: Array<{
        type: 'block_summon' | 'magic_transform';
        cells: Array<{ row: number; col: number; color: string }>;
      }>,
    ) => {
      if (!boardLayout || animations.length === 0) {
        return;
      }
      playGameSfx('skillUse');

      const events = animations
        .map(animation => {
          const cells = buildBoardCellEffectCells(
            boardLayout,
            animation.cells,
            true,
            visualViewport,
          );
          if (cells.length === 0) {
            return null;
          }

          boardSkillEffectIdRef.current += 1;
          return {
            id: boardSkillEffectIdRef.current,
            type: animation.type,
            cells,
          } satisfies BoardSkillCastEffectEvent;
        })
        .filter((event): event is BoardSkillCastEffectEvent => Boolean(event));

      if (events.length > 0) {
        if (events.some(event => event.type === 'magic_transform')) {
          triggerBoardShake();
        }
        setBoardSkillCastEffect(events);
      }
    },
    [boardLayout, triggerBoardShake, visualViewport],
  );

  const triggerBossPose = useCallback(
    (pose: MonsterSpritePose, duration = 220) => {
      if (bossPoseTimerRef.current) {
        clearTimeout(bossPoseTimerRef.current);
      }
      setBossPose(pose);
      bossPoseTimerRef.current = setTimeout(() => {
        setBossPose('idle');
        bossPoseTimerRef.current = null;
      }, duration);
    },
    [],
  );

  const getSummonSpawnIndexForPlayer = useCallback((casterId: string) => {
    const stableParticipants = [...participantsRef.current].sort((left, right) => {
      const leftJoinedAt = left.joinedAt ?? '';
      const rightJoinedAt = right.joinedAt ?? '';
      if (leftJoinedAt !== rightJoinedAt) {
        return leftJoinedAt.localeCompare(rightJoinedAt);
      }
      return left.playerId.localeCompare(right.playerId);
    });
    const participantIndex = stableParticipants.findIndex(
      entry => entry.playerId === casterId,
    );
    if (participantIndex >= 0) {
      return participantIndex % SUMMON_SPAWN_POINTS;
    }
    return 0;
  }, []);

  const registerRemoteSummon = useCallback(
    (payload: any) => {
      if (
        !payload?.eventId ||
        !payload?.casterId ||
        payload.casterId === playerIdRef.current ||
        markRaidEventProcessed(payload.eventId)
      ) {
        return;
      }

      const summon: RemoteRaidSummon = {
        eventId: payload.eventId,
        casterId: payload.casterId,
        summonId:
          payload.summonId ??
          `${payload.casterId}:${payload.eventId}:${payload.createdAt ?? Date.now()}`,
        summonType: payload.summonType ?? 'raid_summon',
        spawnAnchor:
          typeof payload.spawnAnchor === 'number'
            ? payload.spawnAnchor
            : getSummonSpawnIndexForPlayer(payload.casterId),
        createdAt: payload.createdAt ?? Date.now(),
        durationMs: Math.max(1000, payload.durationMs ?? 6000),
        attackPulse: 0,
        returning: false,
      };

      // RAID_FIX: summon visuals are broadcast to peers, but damage stays on
      // the existing authoritative damage path to avoid double application.
      setRemoteSummons(previous => [
        ...previous.filter(entry => entry.summonId !== summon.summonId),
        summon,
      ]);
      if (remoteSummonTimersRef.current.has(summon.summonId)) {
        clearTimeout(remoteSummonTimersRef.current.get(summon.summonId)!);
      }
      const timer = setTimeout(() => {
        setRemoteSummons(previous =>
          previous.filter(entry => entry.summonId !== summon.summonId),
        );
        remoteSummonTimersRef.current.delete(summon.summonId);
      }, summon.durationMs);
      remoteSummonTimersRef.current.set(summon.summonId, timer);
      applyBattleStats(payload.casterId, { summonsUsed: 1 });
    },
    [applyBattleStats, getSummonSpawnIndexForPlayer, markRaidEventProcessed],
  );

  const pulseRemoteSummonAttack = useCallback(
    (payload: any) => {
      if (
        !payload?.eventId ||
        !payload?.casterId ||
        payload.casterId === playerIdRef.current ||
        markRaidEventProcessed(payload.eventId)
      ) {
        return;
      }

      // RAID_FIX: summon events are keyed by summonId first. Using only
      // casterId can merge separate summons and make one player's return
      // animation affect another active summon visual.
      const targetSummonId = payload.summonId;
      setRemoteSummons(previous =>
        previous.map(entry => {
          const matches = targetSummonId
            ? entry.summonId === targetSummonId
            : entry.casterId === payload.casterId;
          return matches
            ? { ...entry, attackPulse: entry.attackPulse + 1 }
            : entry;
        }),
      );
    },
    [markRaidEventProcessed],
  );

  const returnRemoteSummon = useCallback(
    (payload: any) => {
      if (
        !payload?.eventId ||
        !payload?.casterId ||
        payload.casterId === playerIdRef.current ||
        markRaidEventProcessed(payload.eventId)
      ) {
        return;
      }

      // RAID_FIX: return only the exact summon instance that ended.
      const targetSummonId = payload.summonId;
      setRemoteSummons(previous =>
        previous.map(entry => {
          const matches = targetSummonId
            ? entry.summonId === targetSummonId
            : entry.casterId === payload.casterId;
          return matches ? { ...entry, returning: true } : entry;
        }),
      );
      setTimeout(() => {
        setRemoteSummons(previous =>
          previous.filter(entry => {
            const matches = targetSummonId
              ? entry.summonId === targetSummonId
              : entry.casterId === payload.casterId;
            return !matches;
          }),
        );
      }, 280);
    },
    [markRaidEventProcessed],
  );

  const buildRaidClearSnapshot = useCallback((): RaidClearSnapshot => {
    const now = Date.now();
    const participantsSnapshot = participantsRef.current.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    return {
      clearedAt: now,
      clearTimeMs:
        startedAtRef.current > 0 ? Math.max(0, now - startedAtRef.current) : 0,
      bossName,
      bossStage,
      participants: participantsSnapshot,
      battleStats: battleStatsRef.current,
    };
  }, [bossName, bossStage]);

  const applyRaidCleared = useCallback((snapshot?: RaidClearSnapshot | null) => {
    setBossDefeated(true);
    bossDefeatedRef.current = true;
    setGameOver(true);
    gameOverRef.current = true;
    setSpectatorMode(false);
    spectatorRef.current = false;
    setClearSnapshot(snapshot ?? buildRaidClearSnapshot());
  }, [buildRaidClearSnapshot]);

  const applyRaidFailed = useCallback(() => {
    if (bossDefeatedRef.current) {
      return;
    }

    setFailureReason('hp_zero');
    setTimeExpired(false);
    setGameOver(true);
    gameOverRef.current = true;
    setSpectatorMode(false);
    spectatorRef.current = false;
    summonActiveRef.current = false;
    activeSummonIdRef.current = null;
    setSummonActive(false);
    setSummonReturning(false);
    setSummonOverlayVisible(false);
    alivePlayersRef.current = [];
    setAlivePlayers([]);
    setParticipants(previous => {
      const next = previous.map(entry => ({
        ...entry,
        isAlive: false,
        currentHp: 0,
      }));
      participantsRef.current = next;
      return next;
    });
  }, []);

  const publishRaidFailed = useCallback(() => {
    applyRaidFailed();
    void failRaidInstance(instanceId);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'raid_failed',
      payload: { reason: 'all_dead' },
    });
  }, [applyRaidFailed, instanceId]);
  publishRaidFailedRef.current = publishRaidFailed;

  const resetLocalRaidBattleForNextRun = useCallback(
    (payload?: { startedAt?: string; expiresAt?: string }) => {
      const nextBoard = createBoard();
      const nextPieces = buildRaidPiecePack(nextBoard, 1);
      resetPieceGenerationHistory();

      // RAID_FIX: next battle starts from a clean local raid state so clear
      // stats, death state, summons, combo and boss hp do not leak forward.
      boardStateRef.current = nextBoard;
      setBoard(nextBoard);
      setPieces(nextPieces);
      updateNextPieces(buildRaidPiecePack(nextBoard, 2));
      setRound(1);
      setBossHp(bossMaxHp);
      bossHpRef.current = bossMaxHp;
      setBossDefeated(false);
      bossDefeatedRef.current = false;
      setGameOver(false);
      gameOverRef.current = false;
      setTimeExpired(false);
      setFailureReason('board_full');
      setRewardData(null);
      setRewardCollected(false);
      setClearSnapshot(null);
      setShowBattleStatsPanel(false);
      setBossSummonDamageHits([]);
      setRemoteSummons([]);
      remoteSummonTimersRef.current.forEach(timer => clearTimeout(timer));
      remoteSummonTimersRef.current.clear();

      comboRef.current = 0;
      setCombo(0);
      setComboRemainingMs(0);
      linesClearedRef.current = 0;
      setLinesCleared(0);
      feverGaugeRef.current = 0;
      feverActiveRef.current = false;
      setFeverGauge(0);
      setFeverActive(false);
      setFeverRemainingMs(0);
      summonActiveRef.current = false;
      activeSummonIdRef.current = null;
      setSummonActive(false);
      setSummonReturning(false);
      setSummonOverlayVisible(false);
      setSummonAttackPulse(0);
      setPlayerHp(maxPlayerHp);
      playerHpRef.current = maxPlayerHp;
      playerHpAnim.setValue(1);
      spectatorRef.current = false;
      setSpectatorMode(false);
      const revivedParticipants = participantsRef.current.map(entry => ({
        ...entry,
        isAlive: true,
        currentHp:
          entry.playerId === playerIdRef.current
            ? maxPlayerHp
            : entry.currentHp,
        maxHp:
          entry.playerId === playerIdRef.current ? maxPlayerHp : entry.maxHp,
      }));
      participantsRef.current = revivedParticipants;
      setParticipants(revivedParticipants);
      const aliveIds = revivedParticipants.map(entry => entry.playerId);
      setAlivePlayers(aliveIds);
      alivePlayersRef.current = aliveIds;
      const freshStats: RaidBattleStatsMap = {};
      aliveIds.forEach(playerId => {
        freshStats[playerId] = createEmptyRaidBattleStats(true);
      });
      battleStatsRef.current = freshStats;
      setBattleStats(freshStats);
      rematchReadyRef.current = {};
      setRematchReady({});
      persistLocalRaidRuntimeState({
        isReady: false,
        isAlive: true,
        currentHp: maxPlayerHp,
        maxHp: maxPlayerHp,
        boardState: nextBoard,
        battleStats:
          (freshStats[playerIdRef.current] ??
            createEmptyRaidBattleStats(true)) as unknown as Record<
            string,
            unknown
          >,
      });
      const nextStartedAt = payload?.startedAt
        ? Date.parse(payload.startedAt)
        : Date.now();
      const nextExpiresAt = payload?.expiresAt
        ? Date.parse(payload.expiresAt)
        : Date.now() + (isNormalRaid ? 365 * 24 * 60 * 60 * 1000 : BOSS_RAID_WINDOW_MS);
      startedAtRef.current = Number.isFinite(nextStartedAt)
        ? nextStartedAt
        : Date.now();
      setExpiresAt(Number.isFinite(nextExpiresAt) ? nextExpiresAt : 0);
    },
    [
      bossMaxHp,
      buildRaidPiecePack,
      isNormalRaid,
      maxPlayerHp,
      persistLocalRaidRuntimeState,
      playerHpAnim,
      updateNextPieces,
    ],
  );

  const applyRaidRematchFromInstance = useCallback(
    (instance: any) => {
      if (!instance || !['active', 'battle'].includes(instance.status)) {
        return false;
      }
      if (!bossDefeatedRef.current && !gameOverRef.current) {
        return false;
      }

      const nextStartedAt = Date.parse(instance.started_at ?? '');
      if (
        Number.isFinite(nextStartedAt) &&
        startedAtRef.current > 0 &&
        nextStartedAt <= startedAtRef.current
      ) {
        return false;
      }

      // RAID_FIX: if a party member misses raid_rematch_start broadcast, the
      // raid_instances row update is the fallback signal to enter the next run.
      resetLocalRaidBattleForNextRun({
        startedAt: instance.started_at,
        expiresAt: instance.expires_at,
      });
      return true;
    },
    [resetLocalRaidBattleForNextRun],
  );

  useEffect(() => {
    return () => {
      if (bossPoseTimerRef.current) {
        clearTimeout(bossPoseTimerRef.current);
      }
    };
  }, []);

  // Initialize
  useEffect(() => {
    let mounted = true;
    resetPieceGenerationHistory();
    comboRef.current = 0;
    linesClearedRef.current = 0;
    feverGaugeRef.current = 0;
    feverActiveRef.current = false;
    lastPlacementAtRef.current = null;
    damageReductionBuffUntilRef.current = 0;
    comboExpireAtRef.current = null;
    feverExpireAtRef.current = null;
    setCombo(0);
    setComboRemainingMs(0);
    setLinesCleared(0);
    setFeverGauge(0);
    setFeverActive(false);
    setFeverRemainingMs(0);
    activeSkinIdRef.current = 0;
    selectedMonsterSummonIdRef.current = null;
    selectedMonsterSummonEvolutionRef.current = 0;
    selectedMonsterSummonSkillsRef.current = [];
    monsterSummonGaugeGainMultiplierRef.current = 1;
    monsterSummonExpGainMultiplierRef.current = 1;
    monsterSummonDoubleAttackChanceRef.current = 0;
    summonGaugeRef.current = 0;
    summonGaugeRequiredRef.current = 0;
    summonAttackRef.current = 0;
    summonActiveRef.current = false;
    activeSummonIdRef.current = null;
    summonRemainingMsRef.current = 0;
    summonExpEarnedRef.current = 0;
    summonLevelRef.current = 1;
    summonExpRef.current = 0;
    summonAttackMultiplierRef.current = 1;
    skillGaugeRef.current = 0;
    raidSkillLevelsRef.current = {};
    setSummonGauge(0);
    setSummonGaugeRequired(0);
    setSummonAttack(0);
    setSummonActive(false);
    setSummonRemainingMs(0);
    setSummonName('');
    setSummonLevel(1);
    setSummonExp(0);
    setSummonExpRequired(1);
    setSelectedMonsterSummonId(null);
    setSummonAttackPulse(0);
    setSummonOverlayVisible(false);
    setSummonReturning(false);
    setSummonSpawnIndex(0);
    setBossDamageHits([]);
    setBossSummonDamageHits([]);
    setBossImpactHit(null);
    setPlacementEffect(null);
    setLineClearEffect(null);
    setBoardSkillCastEffect(null);
    setRemoteSummons([]);
    remoteSummonTimersRef.current.forEach(timer => clearTimeout(timer));
    remoteSummonTimersRef.current.clear();
    battleStatsRef.current = {};
    setBattleStats({});
    setShowBattleStatsPanel(false);
    setClearSnapshot(null);
    rematchReadyRef.current = {};
    setRematchReady({});
    updateNextPieces([]);
    setSkillGauge(0);
    setActiveMultiplier(1);
    setRaidSkillLevels({});
    setLocalCoreReady(false);
    setInstanceReady(Boolean(cachedRaidSnapshot));
    setParticipantsReady(Boolean(cachedRaidSnapshot));
    if (cachedRaidSnapshot) {
      setBossHp(cachedRaidSnapshot.bossHp);
      bossHpRef.current = cachedRaidSnapshot.bossHp;
      setParticipants(cachedRaidSnapshot.participants);
      participantCountRef.current = cachedRaidSnapshot.participants.length;
      setAlivePlayers(cachedRaidSnapshot.alivePlayerIds);
      alivePlayersRef.current = cachedRaidSnapshot.alivePlayerIds;
      setExpiresAt(cachedRaidSnapshot.expiresAt);
      if (!isNormalRaid) {
        setAttackTimerText(
          formatAttackTimer(
            Math.max(0, cachedRaidSnapshot.expiresAt - Date.now()),
          ),
        );
      }
    }
    (async () => {
      try {
        const [
          playerId,
          nickname,
          settings,
          nextGameData,
          skinData,
          monsterSummonData,
          selectedCharacter,
          isAdmin,
        ] = await withTimeout(
          Promise.all([
            getPlayerId(),
            getNickname(),
            loadGameSettings(),
            loadGameData(),
            loadSkinData(),
            loadMonsterSummonData(),
            getSelectedCharacter(),
            getAdminStatus().catch(() => false),
          ]),
          'raid_local_bootstrap',
        );
        playerIdRef.current = playerId;
        nicknameRef.current = nickname;
        skillNoticeModeRef.current = settings.skillTriggerNoticeMode;
        vibrationRef.current = settings.vibration;
        screenShakeEnabledRef.current = settings.screenShake;
        gameDataRef.current = nextGameData;
        if (mounted && gameDataRef.current) {
          const levels = getRaidSkillLevels(nextGameData.items);
          raidSkillLevelsRef.current = levels;
          setRaidSkillLevels(levels);
        }

        setActiveSkin(skinData.activeSkinId);
        activeSkinIdRef.current = skinData.activeSkinId;
        const skinLoadout = getActiveSkinLoadout(skinData);
        const monsterLoadout = getSelectedMonsterSummonLoadout(monsterSummonData);
        if (monsterLoadout) {
          selectedMonsterSummonIdRef.current = monsterLoadout.definition.id;
          selectedMonsterSummonEvolutionRef.current =
            monsterLoadout.progress.evolutionStage;
          selectedMonsterSummonSkillsRef.current = monsterLoadout.progress.skills;
          monsterSummonGaugeGainMultiplierRef.current =
            monsterLoadout.stats.gaugeGainMultiplier;
          monsterSummonExpGainMultiplierRef.current =
            monsterLoadout.stats.expGainMultiplier;
          monsterSummonDoubleAttackChanceRef.current =
            monsterLoadout.stats.doubleAttackChance;
          summonGaugeRequiredRef.current = monsterLoadout.stats.gaugeRequired;
          summonAttackRef.current = monsterLoadout.stats.attack;
          summonRemainingMsRef.current = monsterLoadout.stats.durationMs;
          summonLevelRef.current = monsterLoadout.progress.level;
          summonExpRef.current = monsterLoadout.progress.exp;
          summonAttackMultiplierRef.current = 1;
        } else {
          selectedMonsterSummonIdRef.current = null;
          selectedMonsterSummonEvolutionRef.current = 0;
          selectedMonsterSummonSkillsRef.current = [];
          monsterSummonGaugeGainMultiplierRef.current = 1;
          monsterSummonExpGainMultiplierRef.current = 1;
          monsterSummonDoubleAttackChanceRef.current = 0;
          summonGaugeRequiredRef.current = skinLoadout.summonGaugeRequired;
          summonAttackRef.current = skinLoadout.summonAttack;
          summonRemainingMsRef.current = skinLoadout.summonDurationMs;
          summonLevelRef.current = skinLoadout.summonProgress?.level ?? 1;
          summonExpRef.current = skinLoadout.summonProgress?.exp ?? 0;
          summonAttackMultiplierRef.current =
            skinLoadout.effects.summonAttackMultiplier;
        }
        if (mounted) {
          setSkinBoardBg(getSkinBoardBg());
          setSelectedMonsterSummonId(monsterLoadout?.definition.id ?? null);
          setSummonName(monsterLoadout?.definition.name ?? '');
          setSummonLevel(summonLevelRef.current);
          setSummonExp(summonExpRef.current);
          setSummonExpRequired(
            monsterLoadout
              ? monsterLoadout.stats.expRequired
              : getSummonExpRequired(summonLevelRef.current),
          );
          setSummonGaugeRequired(summonGaugeRequiredRef.current);
          setSummonAttack(summonAttackRef.current);
          setSummonRemainingMs(summonRemainingMsRef.current);
        }

        const instancePromise = withTimeout(
          getRaidInstance(instanceId),
          'raid_instance',
        ).catch(error => ({ data: null, error }));
        const joinPromise = withTimeout(
          joinRaidInstance(
            instanceId,
            playerIdRef.current,
            nicknameRef.current,
            {
              bypassBossWindow: isAdmin,
              raidType: isNormalRaid ? 'normal' : 'boss',
            },
          ),
          'raid_join',
        ).catch(error => ({ data: null, error }));

        if (selectedCharacter) {
          const characterData = await withTimeout(
            loadCharacterData(selectedCharacter),
            'raid_character_data',
          );
          setSelectedCharacterId(selectedCharacter);
          selectedCharacterRef.current = selectedCharacter;
          selectedCharacterDataRef.current = characterData;
          baseAttackPowerRef.current = getCharacterAtk(
            selectedCharacter,
            characterData.level,
          );
          baseMaxPlayerHpRef.current = getCharacterHp(
            selectedCharacter,
            characterData.level,
          );
          const effects = getRaidEffects();
          attackPowerRef.current = Math.round(
            baseAttackPowerRef.current *
              effects.baseAttackMultiplier *
              skinLoadout.effects.attackBonusMultiplier,
          );
          const resolvedHp = Math.round(
            baseMaxPlayerHpRef.current * effects.maxHpMultiplier,
          );
          playerHpRef.current = resolvedHp;
          if (mounted) {
            setPlayerHp(resolvedHp);
            setMaxPlayerHp(resolvedHp);
            playerHpAnim.setValue(1);
          }
        } else {
          setSelectedCharacterId('knight');
        }

        const p = buildRaidPiecePack(createBoard(), 1);
        const previewPack = buildRaidPiecePack(createBoard(), 2);
        if (mounted) {
          setPieces(p);
          updateNextPieces(previewPack);
          setRound(1);
          setLocalCoreReady(true);
        }

        const [instanceResult, joinResult] = await Promise.all([
          instancePromise,
          joinPromise,
        ]);

        if (instanceResult?.error) {
          throw instanceResult.error;
        }
        if (joinResult?.error) {
          throw joinResult.error;
        }

        const instance = instanceResult?.data;
        if (!instance) {
          throw new Error('raid_instance_missing');
        }

        if (mounted && instance) {
          setBossHp(instance.boss_current_hp);
          bossHpRef.current = instance.boss_current_hp;
          const nextStarterId = instance.starter_id ?? '';
          setRaidStarterId(nextStarterId);
          raidStarterIdRef.current = nextStarterId;
          raidPartyIdRef.current = instance.party_id ?? null;
          startedAtRef.current = new Date(instance.started_at).getTime();
          persistLocalRaidRuntimeState({
            avatarIcon: nicknameRef.current.slice(0, 1),
            role:
              playerIdRef.current === nextStarterId ? 'host' : 'member',
            isHost: playerIdRef.current === nextStarterId,
            isReady: false,
            isAlive: true,
            currentHp: playerHpRef.current,
            maxHp: maxPlayerHpRef.current,
            boardState: boardStateRef.current,
            battleStats:
              (battleStatsRef.current[
                playerIdRef.current
              ] ?? createEmptyRaidBattleStats(true)) as unknown as Record<
                string,
                unknown
              >,
          });
          const expTs = new Date(instance.expires_at).getTime();
          setExpiresAt(expTs);

          if (instance.status === 'defeated' || instance.status === 'cleared') {
            // RAID_FIX: reconnecting after a clear should restore the clear
            // result screen instead of forcing users back to manual entry.
            applyRaidCleared(buildRaidClearSnapshot());
          }

          if (!isNormalRaid && Date.now() >= expTs) {
            void expireRaidInstance(instanceId);
            setTimeExpired(true);
            setFailureReason('time_up');
            setGameOver(true);
            gameOverRef.current = true;
          }

          if (!isNormalRaid) {
            setAttackTimerText(formatAttackTimer(Math.max(0, expTs - Date.now())));
          }
        }

        const channel = getRaidChannel(instanceId);
        channel
          .on('broadcast', { event: 'damage' }, ({ payload }: any) => {
            if (!mounted || !payload) return;
            setBossHp(payload.newBossHp);
            bossHpRef.current = payload.newBossHp;
            applyBattleStats(
              payload.playerId,
              {
                damageDealt: payload.damage ?? 0,
                comboMax: payload.combo ?? 0,
              },
              payload.eventId,
            );
            setParticipants(prev => {
              const updated = prev.map(entry =>
                entry.playerId === payload.playerId
                  ? {
                      ...entry,
                      totalDamage: entry.totalDamage + payload.damage,
                    }
                  : entry,
              );
              updated.sort((a, b) => b.totalDamage - a.totalDamage);
              const ranked = updated.map((entry, index) => ({
                ...entry,
                rank: index + 1,
              }));
              participantsRef.current = ranked;
              return ranked;
            });
            if (payload.defeated) {
              applyRaidCleared(payload.clearSnapshot ?? null);
            }
          })
          .on('broadcast', { event: 'raid_expired' }, () => {
            if (!mounted || isNormalRaid) return;
            setTimeExpired(true);
            setFailureReason('time_up');
            setGameOver(true);
            gameOverRef.current = true;
            setSpectatorMode(false);
            spectatorRef.current = false;
          })
          .on('broadcast', { event: 'heartbeat' }, ({ payload }: any) => {
            if (!mounted || !payload) return;
            applyParticipantRuntimeSnapshot(payload.runtime ?? payload);
          })
          // RAID_FIX: personal death is a spectator state, not a room leave.
          .on('broadcast', { event: 'player_dead' }, ({ payload }: any) => {
            if (!mounted || !payload) return;
            applyParticipantRuntimeSnapshot({
              playerId: payload.playerId,
              nickname: payload.nickname,
              isAlive: false,
              currentHp: 0,
              maxHp: payload.maxHp,
              battleStats: {
                ...(battleStatsRef.current[payload.playerId] ??
                  createEmptyRaidBattleStats(false)),
                isAlive: false,
              },
            });
            applyBattleStats(
              payload.playerId,
              { deathCount: 1, isAlive: false },
              payload.eventId,
            );
            setAlivePlayers(prev => {
              const next = prev.filter(id => id !== payload.playerId);
              alivePlayersRef.current = next;
              const hasKnownAliveMember = participantsRef.current.some(
                entry =>
                  entry.playerId !== payload.playerId &&
                  entry.isAlive !== false,
              );
              if (next.length === 0 && !hasKnownAliveMember) {
                publishRaidFailedRef.current();
              }
              return next;
            });
          })
          .on('broadcast', { event: 'raid_failed' }, () => {
            if (!mounted) return;
            applyRaidFailed();
          })
          .on('broadcast', { event: 'player_left' }, ({ payload }: any) => {
            if (!mounted || !payload?.playerId) return;
            // RAID_FIX: explicit leaves are party exits, not deaths. Remove the
            // leaving member from the raid UI and do not keep a dead skull row.
            removeParticipantFromRaid(payload.playerId);
            if (
              payload.playerId === raidStarterIdRef.current &&
              payload.playerId !== playerIdRef.current
            ) {
              allowLeaveRef.current = true;
              clearRaidScreenCache(instanceId);
              navigation.replace('RaidLobby');
            }
          })
          .on('broadcast', { event: 'summon_spawn' }, ({ payload }: any) => {
            if (!mounted) return;
            registerRemoteSummon(payload);
          })
          .on('broadcast', { event: 'summon_attack' }, ({ payload }: any) => {
            if (!mounted) return;
            pulseRemoteSummonAttack(payload);
          })
          .on('broadcast', { event: 'summon_damage' }, ({ payload }: any) => {
            if (!mounted || !payload) return;
            const isLocalSummonDamage =
              payload.playerId === playerIdRef.current;
            if (typeof payload.newBossHp === 'number') {
              setBossHp(payload.newBossHp);
              bossHpRef.current = payload.newBossHp;
            }
            if (!isLocalSummonDamage && payload.damage > 0) {
              queueSummonDamageHit(payload.damage);
            }
            applyBattleStats(
              payload.playerId,
              {
                damageDealt: payload.damage ?? 0,
                comboMax: payload.combo ?? 0,
              },
              payload.eventId,
            );
            if (!isLocalSummonDamage) {
              setParticipants(prev => {
                const updated = prev.map(entry =>
                  entry.playerId === payload.playerId
                    ? {
                        ...entry,
                        totalDamage: entry.totalDamage + payload.damage,
                      }
                    : entry,
                );
                updated.sort((a, b) => b.totalDamage - a.totalDamage);
                const ranked = updated.map((entry, index) => ({
                  ...entry,
                  rank: index + 1,
                }));
                participantsRef.current = ranked;
                return ranked;
              });
            }
            if (payload.defeated) {
              applyRaidCleared(payload.clearSnapshot ?? null);
            }
          })
          .on('broadcast', { event: 'summon_return' }, ({ payload }: any) => {
            if (!mounted) return;
            returnRemoteSummon(payload);
          })
          .on('broadcast', { event: 'battle_stats' }, ({ payload }: any) => {
            if (!mounted || !payload?.playerId || !payload?.patch) return;
            applyBattleStats(payload.playerId, payload.patch, payload.eventId);
          })
          .on('broadcast', { event: 'raid_cleared' }, ({ payload }: any) => {
            if (!mounted) return;
            applyRaidCleared(payload?.clearSnapshot ?? null);
          })
          .on('broadcast', { event: 'raid_rematch_ready' }, ({ payload }: any) => {
            if (!mounted || !payload?.playerId) return;
            setRematchReady(previous => {
              const next = { ...previous, [payload.playerId]: Boolean(payload.ready) };
              rematchReadyRef.current = next;
              return next;
            });
            applyParticipantRuntimeSnapshot(
              payload.runtime ?? {
                playerId: payload.playerId,
                isReady: Boolean(payload.ready),
              },
            );
          })
          .on('broadcast', { event: 'raid_rematch_start' }, ({ payload }: any) => {
            if (!mounted) return;
            resetLocalRaidBattleForNextRun(payload ?? {});
          })
          // NEW: board_state - alive player broadcasts their board
          .on('broadcast', { event: 'board_state' }, ({ payload }: any) => {
            if (!mounted || !payload) return;
            remoteBoardsRef.current.set(payload.playerId, {
              board: payload.board,
              nickname: payload.nickname,
            });
            // Update spectator view if watching this player
            if (spectatorRef.current) {
              const aliveList = alivePlayersRef.current.filter(
                id => id !== playerIdRef.current,
              );
              if (aliveList.length > 0) {
                // use functional state to get current idx
                setSpectatingIdx(idx => {
                  const watchingId = aliveList[idx % aliveList.length];
                  if (watchingId === payload.playerId) {
                    setSpectatorBoard(payload.board);
                    setSpectatorNickname(payload.nickname);
                  }
                  return idx;
                });
              }
            }
          })
          // NEW: chat
          .on('broadcast', { event: 'chat' }, ({ payload }: any) => {
            if (!mounted || !payload) return;
            setChatMessages(prev => [
              ...prev.slice(-49),
              {
                id: `${payload.playerId}-${Date.now()}`,
                nickname: payload.nickname,
                text: payload.text,
              },
            ]);
          })
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'raid_instances',
              filter: `id=eq.${instanceId}`,
            },
            (payload: any) => {
              const nextInstance = payload.new ?? {};
              if (!mounted || !nextInstance) {
                return;
              }
              if (applyRaidRematchFromInstance(nextInstance)) {
                return;
              }
              // RAID_FIX: cleared/closed instance updates are table state, not
              // only realtime broadcasts, so dead spectators also see results.
              if (
                nextInstance.status === 'defeated' ||
                nextInstance.status === 'cleared' ||
                nextInstance.boss_current_hp <= 0
              ) {
                if (typeof nextInstance.boss_current_hp === 'number') {
                  setBossHp(nextInstance.boss_current_hp);
                  bossHpRef.current = nextInstance.boss_current_hp;
                }
                applyRaidCleared(buildRaidClearSnapshot());
                return;
              }

              if (nextInstance.status === 'closed') {
                allowLeaveRef.current = true;
                clearRaidScreenCache(instanceId);
                navigation.replace('RaidLobby');
                return;
              }

              if (nextInstance.status === 'failed') {
                applyRaidFailed();
              }
            },
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'raid_participants',
              filter: `raid_instance_id=eq.${instanceId}`,
            },
            () => {
              // RAID_FIX: all clients render the same participants table
              // instead of relying on local join/order assumptions.
              void getRaidParticipants(instanceId).then(result => {
                if (!mounted || result.error) {
                  return;
                }
                syncParticipantsFromRows(
                  result.data,
                  new Date(instance.expires_at).getTime(),
                );
              });
            },
          )
          .subscribe();

        if (mounted) {
          channelRef.current = channel;
          setInstanceReady(true);
          writeRaidScreenCache(instanceId, {
            bossHp: bossHpRef.current,
            expiresAt: new Date(instance.expires_at).getTime(),
            participants,
            alivePlayerIds: alivePlayersRef.current,
          });
        } else {
          supabase.removeChannel(channel);
        }

        heartbeatTimer.current = setInterval(() => {
          const runtime = buildLocalRaidRuntimeSnapshot();
          if (!runtime) {
            return;
          }

          // RAID_FIX: persist the same snapshot to DB on every heartbeat so
          // devices that miss realtime broadcasts can recover by polling.
          persistLocalRaidRuntimeState({
            avatarIcon: runtime.avatarIcon,
            role: runtime.role,
            isHost: runtime.isHost,
            isReady: runtime.isReady,
            isAlive: runtime.isAlive,
            currentHp: runtime.currentHp,
            maxHp: runtime.maxHp,
            battleStats: runtime.battleStats as unknown as Record<
              string,
              unknown
            >,
            boardState: runtime.board,
          });

          channel.send({
            type: 'broadcast',
            event: 'heartbeat',
            payload: {
              ...runtime,
              runtime,
            },
          });
        }, HEARTBEAT_INTERVAL);

        void (async () => {
          const participantsResult = await withTimeout(
            getRaidParticipants(instanceId),
            'raid_participants',
          ).catch(error => ({ data: null, error }));

          if (!mounted) {
            return;
          }

          if (participantsResult?.error) {
            console.warn(
              'RaidScreen participants bootstrap error:',
              participantsResult.error,
            );
            setParticipantsReady(true);
            return;
          }

          const parts = participantsResult?.data;
          if (parts) {
            syncParticipantsFromRows(
              parts,
              new Date(instance.expires_at).getTime(),
            );
          }
          setParticipantsReady(true);
        })();
      } catch (e) {
        console.warn('RaidScreen init error:', e);
        if (mounted) {
          Alert.alert(t('common.error'), t('raid.connectionFail'), [
            {
              text: '레이드 로비',
              onPress: () => {
                allowLeaveRef.current = true;
                navigation.replace('RaidLobby');
              },
            },
          ]);
        }
      }
    })();

    return () => {
      mounted = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      if (attackTimer.current) clearInterval(attackTimer.current);
      if (bossAttackTimer.current) clearInterval(bossAttackTimer.current);
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      if (comboTickerRef.current) clearInterval(comboTickerRef.current);
      if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
      if (feverTickerRef.current) clearInterval(feverTickerRef.current);
      remoteSummonTimersRef.current.forEach(timer => clearTimeout(timer));
      remoteSummonTimersRef.current.clear();
    };
  }, [
    applyBattleStats,
    applyRaidFailed,
    applyParticipantRuntimeSnapshot,
    applyRaidCleared,
    applyRaidRematchFromInstance,
    bossStage,
    buildRaidClearSnapshot,
    buildRaidPiecePack,
    buildLocalRaidRuntimeSnapshot,
    getRaidEffects,
    instanceId,
    isNormalRaid,
    navigation,
    playerHpAnim,
    persistLocalRaidRuntimeState,
    pulseRemoteSummonAttack,
    queueSummonDamageHit,
    registerRemoteSummon,
    removeParticipantFromRaid,
    resetLocalRaidBattleForNextRun,
    returnRemoteSummon,
    syncParticipantsFromRows,
    updateNextPieces,
  ]);

  useEffect(() => {
    if (!instanceReady) {
      return;
    }

    // RAID_FIX: polling backs up realtime for devices that miss raid
    // participant, ready, and stat updates.
    raidPollTimerRef.current = setInterval(() => {
      void Promise.all([
        getRaidInstance(instanceId).catch(error => ({ data: null, error })),
        getRaidParticipants(instanceId).catch(error => ({ data: null, error })),
      ]).then(([instanceResult, participantsResult]) => {
        const instance = (instanceResult as any).data;
        if (instance) {
          const didApplyRematch = applyRaidRematchFromInstance(instance);
          if (!didApplyRematch && typeof instance.boss_current_hp === 'number') {
            setBossHp(instance.boss_current_hp);
            bossHpRef.current = instance.boss_current_hp;
          }
          if (
            !didApplyRematch &&
            (instance.status === 'defeated' || instance.status === 'cleared')
          ) {
            applyRaidCleared(clearSnapshot ?? buildRaidClearSnapshot());
          }
          if (!didApplyRematch && instance.status === 'closed') {
            allowLeaveRef.current = true;
            clearRaidScreenCache(instanceId);
            navigation.replace('RaidLobby');
          }
          if (!didApplyRematch && instance.status === 'failed') {
            applyRaidFailed();
          }
        }

        const rows = (participantsResult as any).data;
        if (rows) {
          syncParticipantsFromRows(
            rows,
            instance?.expires_at
              ? new Date(instance.expires_at).getTime()
              : expiresAt,
          );
        }
      });
    }, 2500);

    return () => {
      if (raidPollTimerRef.current) {
        clearInterval(raidPollTimerRef.current);
        raidPollTimerRef.current = null;
      }
    };
  }, [
    applyRaidCleared,
    applyRaidFailed,
    applyRaidRematchFromInstance,
    buildRaidClearSnapshot,
    clearSnapshot,
    expiresAt,
    instanceId,
    instanceReady,
    navigation,
    syncParticipantsFromRows,
  ]);

  // 10-minute attack timer
  useEffect(() => {
    if (isNormalRaid) {
      setAttackTimerText('상시 도전');
      return;
    }

    if (expiresAt <= 0) return;
    attackTimer.current = setInterval(() => {
      const remaining = Math.max(0, expiresAt - Date.now());
      setAttackTimerText(formatAttackTimer(remaining));
      if (remaining <= 0 && !gameOverRef.current) {
        setTimeExpired(true);
        setFailureReason('time_up');
        setGameOver(true);
        gameOverRef.current = true;
        setSpectatorMode(false);
        spectatorRef.current = false;
        void expireRaidInstance(instanceId);
        channelRef.current?.send({
          type: 'broadcast',
          event: 'raid_expired',
          payload: {},
        });
      }
    }, 1000);
    return () => {
      if (attackTimer.current) clearInterval(attackTimer.current);
    };
  }, [expiresAt, isNormalRaid]);

  useEffect(() => {
    if (!instanceReady && !participantsReady) {
      return;
    }

    writeRaidScreenCache(instanceId, {
      bossHp,
      expiresAt,
      participants,
      alivePlayerIds: alivePlayers,
    });
  }, [
    alivePlayers,
    bossHp,
    expiresAt,
    instanceId,
    instanceReady,
    participants,
    participantsReady,
  ]);

  useEffect(() => {
    if (!bossDefeated && !timeExpired) {
      return;
    }

    clearRaidScreenCache(instanceId);
  }, [bossDefeated, instanceId, timeExpired]);

  useEffect(() => {
    if (bossDefeated) {
      playGameSfx('victory');
    }
  }, [bossDefeated]);

  useEffect(() => {
    if (gameOver && !bossDefeated && !spectatorMode) {
      playGameSfx('defeat');
    }
  }, [bossDefeated, gameOver, spectatorMode]);

  useEffect(() => {
    if (!selectedCharacterRef.current || !selectedCharacterDataRef.current) {
      return;
    }

    const effects = getRaidEffects();
    attackPowerRef.current = Math.round(
      baseAttackPowerRef.current *
        effects.baseAttackMultiplier *
        getActiveSkinLoadout({
          activeSkinId: activeSkinIdRef.current,
        }).effects.attackBonusMultiplier,
    );
    const nextMaxHp = Math.round(
      baseMaxPlayerHpRef.current * effects.maxHpMultiplier,
    );
    const hpRatio = playerHpRef.current / Math.max(1, maxPlayerHp || nextMaxHp);
    const adjustedHp = Math.min(
      nextMaxHp,
      Math.max(1, Math.round(nextMaxHp * hpRatio)),
    );
    playerHpRef.current = adjustedHp;
    setPlayerHp(adjustedHp);
    setMaxPlayerHp(nextMaxHp);
    Animated.timing(playerHpAnim, {
      toValue: adjustedHp / Math.max(1, nextMaxHp),
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [getRaidEffects, maxPlayerHp, participants.length, playerHpAnim]);

  const animatePlayerHpBar = useCallback(
    (newRatio: number) => {
      Animated.timing(playerHpAnim, {
        toValue: newRatio,
        duration: 250,
        useNativeDriver: false,
      }).start();
    },
    [playerHpAnim],
  );

  const resetComboTimer = useCallback(() => {
    const durationMs = COMBO_TIMEOUT_MS + getRaidEffects().comboWindowBonusMs;

    if (comboTimerRef.current) {
      clearTimeout(comboTimerRef.current);
    }
    if (comboTickerRef.current) {
      clearInterval(comboTickerRef.current);
    }

    comboExpireAtRef.current = Date.now() + durationMs;
    setComboRemainingMs(durationMs);

    comboTickerRef.current = setInterval(() => {
      if (!comboExpireAtRef.current) {
        return;
      }
      const remaining = Math.max(0, comboExpireAtRef.current - Date.now());
      setComboRemainingMs(remaining);
      if (remaining <= 0 && comboTickerRef.current) {
        clearInterval(comboTickerRef.current);
        comboTickerRef.current = null;
      }
    }, 100);

    comboTimerRef.current = setTimeout(() => {
      comboRef.current = 0;
      comboExpireAtRef.current = null;
      setCombo(0);
      setComboRemainingMs(0);
      if (comboTickerRef.current) {
        clearInterval(comboTickerRef.current);
        comboTickerRef.current = null;
      }
    }, durationMs);
  }, [getRaidEffects]);

  const activateFever = useCallback(() => {
    const durationMs = FEVER_DURATION + getRaidEffects().feverDurationBonusMs;

    setFeverActive(true);
    setFeverGauge(100);
    setFeverRemainingMs(durationMs);
    feverActiveRef.current = true;
    feverGaugeRef.current = 100;
    feverExpireAtRef.current = Date.now() + durationMs;

    if (feverTimerRef.current) {
      clearTimeout(feverTimerRef.current);
    }
    if (feverTickerRef.current) {
      clearInterval(feverTickerRef.current);
    }

    feverTickerRef.current = setInterval(() => {
      if (!feverExpireAtRef.current) {
        return;
      }
      const remaining = Math.max(0, feverExpireAtRef.current - Date.now());
      setFeverRemainingMs(remaining);
      if (remaining <= 0 && feverTickerRef.current) {
        clearInterval(feverTickerRef.current);
        feverTickerRef.current = null;
      }
    }, 80);

    feverTimerRef.current = setTimeout(() => {
      setFeverActive(false);
      setFeverGauge(0);
      setFeverRemainingMs(0);
      feverActiveRef.current = false;
      feverGaugeRef.current = 0;
      feverExpireAtRef.current = null;
      if (feverTickerRef.current) {
        clearInterval(feverTickerRef.current);
        feverTickerRef.current = null;
      }
    }, durationMs);
  }, [getRaidEffects]);

  useEffect(() => {
    if (!summonActive || summonRemainingMs <= 0 || gameOver) {
      return;
    }

    const timer = setInterval(() => {
      setSummonRemainingMs(current => {
        const next = Math.max(0, current - 1000);
        summonRemainingMsRef.current = next;
        if (next <= 0) {
          summonActiveRef.current = false;
          setSummonActive(false);
          setSummonReturning(true);
          const eventId = createRaidEventId('summon_return');
          const summonId = activeSummonIdRef.current;
          channelRef.current?.send({
            type: 'broadcast',
            event: 'summon_return',
            payload: {
              eventId,
              raidRoomId: instanceId,
              casterId: playerIdRef.current,
              summonId,
            },
          });
          activeSummonIdRef.current = null;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [createRaidEventId, gameOver, instanceId, summonActive, summonRemainingMs]);

  useEffect(() => {
    if (
      !summonActive ||
      summonRemainingMsRef.current <= 0 ||
      gameOver ||
      bossDefeated
    ) {
      return;
    }

    const timer = setInterval(() => {
      if (
        !summonActiveRef.current ||
        summonRemainingMsRef.current <= 0 ||
        gameOverRef.current ||
        bossHpRef.current <= 0
      ) {
        return;
      }

      const summonDamage = Math.max(
        1,
        Math.round(
          summonAttackRef.current *
            (Math.random() < monsterSummonDoubleAttackChanceRef.current ? 2 : 1),
        ),
      );
      const eventId = createRaidEventId('summon_damage');
      const summonId = activeSummonIdRef.current;
      setSummonAttackPulse(prev => prev + 1);
      triggerBossPose('hurt', 180);
      queueSummonDamageHit(summonDamage);
      grantSummonBattleExp(summonDamage);

      channelRef.current?.send({
        type: 'broadcast',
        event: 'summon_attack',
        payload: {
          eventId: createRaidEventId('summon_attack'),
          raidRoomId: instanceId,
          casterId: playerIdRef.current,
          summonId,
        },
      });

      dealRaidDamage(instanceId, playerIdRef.current, summonDamage, 0).then(
        result => {
          if (!result.data) {
            return;
          }

          applyBattleStats(
            playerIdRef.current,
            { damageDealt: summonDamage, comboMax: comboRef.current },
            eventId,
          );
          setBossHp(result.data.newHp);
          bossHpRef.current = result.data.newHp;
          setMyTotalDamage(prev => prev + summonDamage);
          setParticipants(prev => {
            const updated = prev.map(p =>
              p.playerId === playerIdRef.current
                ? { ...p, totalDamage: p.totalDamage + summonDamage }
                : p,
            );
            updated.sort((a, b) => b.totalDamage - a.totalDamage);
            const ranked = updated.map((p, i) => ({ ...p, rank: i + 1 }));
            participantsRef.current = ranked;
            return ranked;
          });

          const clearSnapshot = result.data.defeated
            ? buildRaidClearSnapshot()
            : null;
          channelRef.current?.send({
            type: 'broadcast',
            event: 'summon_damage',
            payload: {
              eventId,
              summonId,
              playerId: playerIdRef.current,
              nickname: nicknameRef.current,
              damage: summonDamage,
              combo: comboRef.current,
              newBossHp: result.data.newHp,
              defeated: result.data.defeated,
              clearSnapshot,
            },
          });

          if (result.data.defeated) {
            channelRef.current?.send({
              type: 'broadcast',
              event: 'raid_cleared',
              payload: { clearSnapshot },
            });
            applyRaidCleared(clearSnapshot);
          }
        },
      );
    }, 1800);

    return () => clearInterval(timer);
  }, [
    applyBattleStats,
    applyRaidCleared,
    bossDefeated,
    buildRaidClearSnapshot,
    createRaidEventId,
    gameOver,
    grantSummonBattleExp,
    instanceId,
    queueSummonDamageHit,
    summonActive,
    triggerBossPose,
  ]);

  useEffect(() => {
    if (!gameOver && !bossDefeated && !spectatorMode) {
      return;
    }

    summonActiveRef.current = false;
    activeSummonIdRef.current = null;
    setSummonActive(false);
    setSummonReturning(false);
    setSummonOverlayVisible(false);
  }, [bossDefeated, gameOver, spectatorMode]);

  useEffect(() => {
    const effects = getRaidEffects();
    if (
      gameOver ||
      spectatorMode ||
      bossDefeated ||
      effects.autoHealIntervalMs <= 0 ||
      effects.autoHealPercent <= 0
    ) {
      return;
    }

    const timer = setInterval(() => {
      if (
        gameOverRef.current ||
        spectatorRef.current ||
        bossHpRef.current <= 0
      ) {
        return;
      }

      const maxHp = Math.max(
        1,
        Math.round(
          baseMaxPlayerHpRef.current * getRaidEffects().maxHpMultiplier,
        ),
      );
      if (playerHpRef.current / maxHp > 0.5) {
        return;
      }

      const healAmount = Math.max(
        1,
        Math.round(maxHp * effects.autoHealPercent),
      );
      const healedHp = Math.min(maxHp, playerHpRef.current + healAmount);
      if (healedHp === playerHpRef.current) {
        return;
      }

      const appliedHeal = healedHp - playerHpRef.current;
      playerHpRef.current = healedHp;
      setPlayerHp(healedHp);
      animatePlayerHpBar(healedHp / maxHp);
      showSkillTriggerNotice('auto_heal');
      const eventId = createRaidEventId('auto_heal');
      applyBattleStats(
        playerIdRef.current,
        {
          healingDone: appliedHeal,
          healingReceived: appliedHeal,
        },
        eventId,
      );
      channelRef.current?.send({
        type: 'broadcast',
        event: 'battle_stats',
        payload: {
          eventId,
          playerId: playerIdRef.current,
          patch: {
            healingDone: appliedHeal,
            healingReceived: appliedHeal,
          },
        },
      });
    }, effects.autoHealIntervalMs);

    return () => clearInterval(timer);
  }, [
    animatePlayerHpBar,
    applyBattleStats,
    bossDefeated,
    createRaidEventId,
    gameOver,
    getRaidEffects,
    showSkillTriggerNotice,
    spectatorMode,
  ]);

  // Enter spectator mode helper
  const enterSpectator = useCallback(() => {
    if (spectatorRef.current) {
      return;
    }

    spectatorRef.current = true;
    setSpectatorMode(true);

    const eventId = createRaidEventId('player_dead');
    applyBattleStats(
      playerIdRef.current,
      { deathCount: 1, isAlive: false },
      eventId,
    );
    setParticipants(previous => {
      const next = previous.map(entry =>
        entry.playerId === playerIdRef.current
          ? {
              ...entry,
              isAlive: false,
              currentHp: 0,
              maxHp: maxPlayerHpRef.current,
            }
          : entry,
      );
      participantsRef.current = next;
      return next;
    });

    // RAID_FIX: death stays in the raid room and only changes personal state.
    channelRef.current?.send({
      type: 'broadcast',
      event: 'player_dead',
      payload: {
        eventId,
        playerId: playerIdRef.current,
        nickname: nicknameRef.current,
        currentHp: 0,
        maxHp: maxPlayerHpRef.current,
      },
    });

    // Remove self from alive
    setAlivePlayers(prev => {
      const next = prev.filter(id => id !== playerIdRef.current);
      const knownAliveOthers = participantsRef.current
        .filter(
          entry =>
            entry.playerId !== playerIdRef.current &&
            entry.isAlive !== false,
        )
        .map(entry => entry.playerId);
      const nextAliveTargets = next.length > 0 ? next : knownAliveOthers;
      alivePlayersRef.current = nextAliveTargets;
      // If nobody else alive, game over
      if (nextAliveTargets.length === 0) {
        publishRaidFailedRef.current();
      } else {
        // Start spectating first alive player
        setSpectatingIdx(0);
        const data = remoteBoardsRef.current.get(nextAliveTargets[0]);
        if (data) {
          setSpectatorBoard(data.board);
          setSpectatorNickname(data.nickname);
        } else {
          setSpectatorNickname(nextAliveTargets[0].slice(0, 8) + '...');
        }
      }
      return nextAliveTargets;
    });
  }, [applyBattleStats, createRaidEventId]);

  const applyBossAttack = useCallback(() => {
    if (gameOverRef.current || spectatorRef.current || bossDefeated) {
      return;
    }

    triggerBossPose('attack');

    const effects = getRaidEffects();
    if (shouldDodgeAttack(effects)) {
      showSkillTriggerNotice('dodge');
      return;
    }

    const placementProtectionActive =
      damageReductionBuffUntilRef.current > Date.now();
    const incomingReduction = Math.min(
      0.85,
      effects.damageTakenReduction +
        (placementProtectionActive ? effects.placementDamageReduction : 0),
    );
    const incomingDamage = applySkinIncomingDamage(
      Math.max(0, Math.round(bossAttackStats.attack * (1 - incomingReduction))),
      activeSkinIdRef.current,
    );
    const appliedDamageTaken = Math.min(playerHpRef.current, incomingDamage);
    if (appliedDamageTaken > 0) {
      const eventId = createRaidEventId('damage_taken');
      applyBattleStats(
        playerIdRef.current,
        { damageTaken: appliedDamageTaken },
        eventId,
      );
      channelRef.current?.send({
        type: 'broadcast',
        event: 'battle_stats',
        payload: {
          eventId,
          playerId: playerIdRef.current,
          patch: { damageTaken: appliedDamageTaken },
        },
      });
    }
    const rawNextHp = Math.max(0, playerHpRef.current - incomingDamage);
    const nextHp =
      rawNextHp <= 0 && effects.reviveOnce && !reviveUsedRef.current
        ? 1
        : rawNextHp;
    playerHpRef.current = nextHp;
    setPlayerHp(nextHp);
    animatePlayerHpBar(nextHp / Math.max(1, maxPlayerHp));

    if (rawNextHp <= 0 && nextHp === 1) {
      reviveUsedRef.current = true;
      showSkillTriggerNotice('revive');
      return;
    }

    if (nextHp > 0) {
      return;
    }

    setFailureReason('hp_zero');

    if (participantCountRef.current <= 1) {
      enterSpectator();
      setGameOver(true);
      gameOverRef.current = true;
      return;
    }

    enterSpectator();
  }, [
    animatePlayerHpBar,
    applyBattleStats,
    bossAttackStats.attack,
    bossDefeated,
    createRaidEventId,
    enterSpectator,
    getRaidEffects,
    maxPlayerHp,
    showSkillTriggerNotice,
    triggerBossPose,
  ]);

  useEffect(() => {
    if (bossAttackTimer.current) {
      clearInterval(bossAttackTimer.current);
    }
    if (gameOver || spectatorMode || bossDefeated) {
      return;
    }

    bossAttackTimer.current = setInterval(() => {
      applyBossAttack();
    }, bossAttackStats.attackIntervalMs);

    return () => {
      if (bossAttackTimer.current) {
        clearInterval(bossAttackTimer.current);
      }
    };
  }, [
    applyBossAttack,
    bossAttackStats.attackIntervalMs,
    bossDefeated,
    gameOver,
    spectatorMode,
  ]);

  const handlePlace = useCallback(
    (pieceIndex: number, row: number, col: number) => {
      if (gameOverRef.current || spectatorRef.current) return;
        const piece = pieces[pieceIndex];
        if (!piece) return;
        if (!canPlacePiece(board, piece.shape, row, col)) {
          playGameSfx('blockPlaceFail');
          return;
        }

      let newBoard = placePiece(board, piece, row, col);
      playBlockPlacementSound();
      showPlacementEffect(piece, row, col);
      const blockCount = countBlocks(piece.shape);
      const effects = getRaidEffects();
      const placedAt = Date.now();
      const fastPlacement =
        effects.fastPlacementWindowMs > 0 &&
        lastPlacementAtRef.current !== null &&
        placedAt - lastPlacementAtRef.current <= effects.fastPlacementWindowMs;
      lastPlacementAtRef.current = placedAt;
      if (
        effects.placementDamageReduction > 0 &&
        effects.placementDamageReductionWindowMs > 0
      ) {
        damageReductionBuffUntilRef.current =
          placedAt + effects.placementDamageReductionWindowMs;
      }
      const wasSmallPiece = blockCount <= 2;
      smallPieceStreakRef.current = wasSmallPiece
        ? smallPieceStreakRef.current + 1
        : 0;
      const usedSmallPieceStreak = smallPieceStreakRef.current >= 2;
      if (usedSmallPieceStreak) {
        smallPieceStreakRef.current = 0;
      }

      let totalLinesCleared = 0;
      let totalGemsFound = 0;
      const totalItemsFound: string[] = [];
      const clearedEffectCells: LineClearEffectCell[] = [];
      while (true) {
        const r = checkAndClearLines(newBoard);
        const cl = r.clearedRows.length + r.clearedCols.length;
        if (cl === 0) break;
        clearedEffectCells.push(...buildLineClearEffectCells(newBoard, r.newBoard));
        newBoard = r.newBoard;
        totalLinesCleared += cl;
        totalGemsFound += r.gemsFound;
        totalItemsFound.push(...r.itemsFound);
      }

      const boardSkillResult = applySkillBoardEffects({
        board: newBoard,
        piece,
        row,
        col,
        didClear: totalLinesCleared > 0,
        combo: totalLinesCleared > 0 ? comboRef.current + 1 : comboRef.current,
        effects,
        colors: getSkinColors(),
      });
      showBoardSkillCastEffects(boardSkillResult.animations);
      clearedEffectCells.push(
        ...buildLineClearEffectCells(newBoard, boardSkillResult.board),
      );
      newBoard = boardSkillResult.board;
      totalLinesCleared += boardSkillResult.extraLinesCleared;
      totalGemsFound += boardSkillResult.gemsFound;
      totalItemsFound.push(...boardSkillResult.itemsFound);
      showLineClearEffect(clearedEffectCells);

      const blocksFromLines = totalLinesCleared * 8;
      const totalBroken = blockCount + blocksFromLines;
      const gaugeBeforeTurn = skillGaugeRef.current;

      boardStateRef.current = newBoard;
      setBoard(newBoard);

      const gainedGauge = getRaidSkillGaugeGain(
        totalLinesCleared,
        effects.raidSkillChargeGainMultiplier,
      );

      const turnResult = resolveCombatTurn({
        mode: 'raid',
        blockCount,
        attackPower: Math.round(
          baseAttackPowerRef.current *
            effects.baseAttackMultiplier *
            getActiveSkinLoadout({
              activeSkinId: activeSkinIdRef.current,
            }).effects.attackBonusMultiplier,
        ),
        clearedLines: totalLinesCleared,
        combo: comboRef.current,
        comboBonus: boardSkillResult.comboChainBonus,
        feverActive: feverActiveRef.current,
        feverGauge: feverGaugeRef.current,
        feverLinesRequired: Math.max(
          1,
          Math.round(20 * effects.feverRequirementMultiplier),
        ),
        feverGaugeGainMultiplier: effects.feverGaugeGainMultiplier,
      });
        comboRef.current = turnResult.nextCombo;
        setCombo(turnResult.nextCombo);
        linesClearedRef.current += totalLinesCleared;
        setLinesCleared(linesClearedRef.current);
        if (turnResult.nextCombo > 0) {
          const comboEventId = createRaidEventId('combo');
          applyBattleStats(
            playerIdRef.current,
            { comboMax: turnResult.nextCombo },
            comboEventId,
          );
          channelRef.current?.send({
            type: 'broadcast',
            event: 'battle_stats',
            payload: {
              eventId: comboEventId,
              playerId: playerIdRef.current,
              patch: { comboMax: turnResult.nextCombo },
            },
          });
        }
        if (turnResult.didClear) {
          if (turnResult.nextCombo > 1) {
            playGameSfx('combo');
          }
          resetComboTimer();
        }

      if (turnResult.feverTriggered) {
        activateFever();
      } else {
        feverGaugeRef.current = turnResult.nextFeverGauge;
        setFeverGauge(turnResult.nextFeverGauge);
      }

      const damageResult = applyCombatDamageEffectsDetailed(
        turnResult.damage,
        effects,
        {
          combo: turnResult.nextCombo,
          didClear: turnResult.didClear,
          feverActive: feverActiveRef.current,
          usedSmallPieceStreak,
          isRaid: true,
          clearedLines: totalLinesCleared,
          fastPlacement,
        },
      );
      showSkillTriggerNotice(...damageResult.events);
      const fastPlacementDetail = damageResult.details.find(
        detail => detail.event === 'fast_placement' && detail.bonusAmount > 0,
      );
      if (fastPlacementDetail) {
        showSkillEffect(
          `신속 배치 +${fastPlacementDetail.bonusAmount.toLocaleString()}`,
          1800,
        );
      }
      const skinDamage = applySkinCombatDamage(
        damageResult.amount,
        activeSkinIdRef.current,
        {
          combo: turnResult.nextCombo,
          didClear: turnResult.didClear,
        },
      ).damage;
      const skillSpend =
        activeMultiplier > 1
          ? consumeRaidSkillGauge(
              gaugeBeforeTurn,
              activeMultiplier,
              raidSkillLevelsRef.current,
            )
          : { consumed: false, nextGauge: gaugeBeforeTurn, cost: 0 };
      const appliedMultiplier = skillSpend.consumed ? activeMultiplier : 1;
      const effectiveMultiplier = getRaidSkillEffectiveMultiplier(
        appliedMultiplier,
        raidSkillLevelsRef.current[appliedMultiplier] ?? 0,
      );
      const raidSkillDamageMultiplier = skillSpend.consumed
        ? 1 + effects.raidActiveSkillDamageBonus
        : 1;
      const finalDamage = Math.round(
        skinDamage *
          effectiveMultiplier *
          raidSkillDamageMultiplier,
      );

      const nextGauge = skillSpend.nextGauge + gainedGauge;
      skillGaugeRef.current = nextGauge;
      setSkillGauge(nextGauge);

      if (skillSpend.consumed) {
        setActiveMultiplier(1);
      }

      if (finalDamage > 0) {
        setPlayerAttackPulse(previous => previous + 1);
        triggerBossPose('hurt', 260);
        queueBossDamageHit(finalDamage);
        if (vibrationRef.current) Vibration.vibrate(50);
      }

      if (
        effects.placeHealChance > 0 &&
        effects.placeHealPercent > 0 &&
        Math.random() < effects.placeHealChance
      ) {
        const maxHp = Math.max(
          1,
          Math.round(baseMaxPlayerHpRef.current * effects.maxHpMultiplier),
        );
        const healAmount = Math.max(
          1,
          Math.round(maxHp * effects.placeHealPercent),
        );
        const healedHp = Math.min(maxHp, playerHpRef.current + healAmount);
        const appliedHeal = healedHp - playerHpRef.current;
        playerHpRef.current = healedHp;
        setPlayerHp(healedHp);
        animatePlayerHpBar(healedHp / maxHp);
        showSkillTriggerNotice('place_heal');
        if (appliedHeal > 0) {
          const healEventId = createRaidEventId('place_heal');
          applyBattleStats(
            playerIdRef.current,
            {
              healingDone: appliedHeal,
              healingReceived: appliedHeal,
            },
            healEventId,
          );
          channelRef.current?.send({
            type: 'broadcast',
            event: 'battle_stats',
            payload: {
              eventId: healEventId,
              playerId: playerIdRef.current,
              patch: {
                healingDone: appliedHeal,
                healingReceived: appliedHeal,
              },
            },
          });
        }
      }

      setMyTotalDamage(prev => prev + finalDamage);
      if (summonGaugeRequiredRef.current > 0 && !summonActiveRef.current) {
        const gaugeGain = selectedMonsterSummonIdRef.current
          ? getMonsterSummonGaugeGain(
              blockCount,
              totalLinesCleared,
              monsterSummonGaugeGainMultiplierRef.current,
            )
          : getSummonGaugeGain(
              activeSkinIdRef.current,
              blockCount,
              totalLinesCleared,
            );
        const nextGauge = Math.min(
          summonGaugeRequiredRef.current,
          summonGaugeRef.current + gaugeGain,
        );
        summonGaugeRef.current = nextGauge;
        setSummonGauge(nextGauge);
      }
      const damageEventId = createRaidEventId('damage');
      dealRaidDamage(
        instanceId,
        playerIdRef.current,
        finalDamage,
        totalBroken,
      ).then(result => {
        if (result.data) {
          applyBattleStats(
            playerIdRef.current,
            { damageDealt: finalDamage, comboMax: turnResult.nextCombo },
            damageEventId,
          );
          setBossHp(result.data.newHp);
          bossHpRef.current = result.data.newHp;
          const clearSnapshot = result.data.defeated
            ? buildRaidClearSnapshot()
            : null;
          channelRef.current?.send({
            type: 'broadcast',
            event: 'damage',
            payload: {
              eventId: damageEventId,
              playerId: playerIdRef.current,
              nickname: nicknameRef.current,
              damage: finalDamage,
              combo: turnResult.nextCombo,
              newBossHp: result.data.newHp,
              defeated: result.data.defeated,
              clearSnapshot,
            },
          });
          if (result.data.defeated) {
            channelRef.current?.send({
              type: 'broadcast',
              event: 'raid_cleared',
              payload: { clearSnapshot },
            });
            applyRaidCleared(clearSnapshot);
          }
        }
      });

      setParticipants(prev => {
        const updated = prev.map(p =>
          p.playerId === playerIdRef.current
            ? { ...p, totalDamage: p.totalDamage + finalDamage }
            : p,
        );
        updated.sort((a, b) => b.totalDamage - a.totalDamage);
        const ranked = updated.map((p, i) => ({ ...p, rank: i + 1 }));
        participantsRef.current = ranked;
        return ranked;
      });
      if (
        gameDataRef.current &&
        (totalGemsFound > 0 || totalItemsFound.length > 0)
      ) {
        collectSpecialBlockRewards(
          gameDataRef.current,
          totalGemsFound,
          totalItemsFound,
        ).then(rewardResult => {
          gameDataRef.current = rewardResult.data;
        });
      }

      const newPieces = [...pieces];
      newPieces[pieceIndex] = null;
      const remaining = newPieces.filter(p => p !== null);
      if (remaining.length === 0) {
        const nextRound = round + 1;
        const fresh =
          nextPiecesRef.current.length === 3
            ? nextPiecesRef.current
            : buildRaidPiecePack(newBoard, nextRound);
        newPieces[0] = fresh[0];
        newPieces[1] = fresh[1];
        newPieces[2] = fresh[2];
        setRound(nextRound);
        updateNextPieces(buildRaidPiecePack(newBoard, nextRound + 1));
      }
      setPieces(newPieces);

      // RAID_FIX: store latest board in DB as a fallback for devices that do
      // not receive the board_state broadcast.
      persistLocalRaidRuntimeState({
        boardState: newBoard,
        currentHp: playerHpRef.current,
        maxHp: maxPlayerHpRef.current,
        battleStats:
          (battleStatsRef.current[playerIdRef.current] ??
            createEmptyRaidBattleStats(!spectatorRef.current)) as unknown as Record<
            string,
            unknown
          >,
      });

      // Broadcast board state for spectators
      channelRef.current?.send({
        type: 'broadcast',
        event: 'board_state',
        payload: {
          playerId: playerIdRef.current,
          nickname: nicknameRef.current,
          board: newBoard,
        },
      });

      // Check if board is full
      setTimeout(() => {
        const active = newPieces.filter(p => p !== null) as Piece[];
        if (!canPlaceAnyPiece(newBoard, active)) {
          if (!gameOverRef.current && !spectatorRef.current) {
            setFailureReason('board_full');
            // Solo: ask to retry
            if (participantCountRef.current <= 1) {
              enterSpectator();
              gameOverRef.current = true;
              setGameOver(true);
              return;
              /* Alert.alert(
                '패배',
                '보드가 가득 찼습니다.\n재도전 하시겠습니까?',
                [
                  {text: '포기', style: 'cancel', onPress: () => {
                    gameOverRef.current = true;
                    setGameOver(true);
                  }},
                  {text: '재도전', onPress: () => doSoloReset()},
                ],
                {cancelable: false},
              ); */
            } else {
              // Team: enter spectator mode
              enterSpectator();
            }
          }
        }
      }, 200);
    },
    [
      activeMultiplier,
      activateFever,
      applyBattleStats,
      applyRaidCleared,
      board,
      bossStage,
      buildRaidClearSnapshot,
      enterSpectator,
      createRaidEventId,
      getRaidEffects,
      instanceId,
      pieces,
      persistLocalRaidRuntimeState,
      resetComboTimer,
      round,
      showPlacementEffect,
      showLineClearEffect,
      showBoardSkillCastEffects,
      animatePlayerHpBar,
      buildRaidPiecePack,
      showSkillTriggerNotice,
      triggerBossPose,
      updateNextPieces,
    ],
  );

  const dragDrop = useDragDrop(
    board,
    pieces,
    boardLayout,
    handlePlace,
    true,
    0, // RAID_FIX: raid Board already reports its real measured origin.
    visualViewport,
    dragTuning,
  );

  const handleBoardLayout = useCallback(() => {
    setTimeout(() => {
      boardRef.current?.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setBoardLayout({ x, y, width, height });
        },
      );
    }, 100);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      boardRef.current?.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setBoardLayout({ x, y, width, height });
        },
      );
    }, 500);
  }, [round]);

  const handleSelectSkill = useCallback((multiplier: number) => {
    setActiveMultiplier(multiplier);
  }, []);

  const skillCharges = getRaidSkillCharges(skillGauge, raidSkillLevels);

  const handleToggleSummon = useCallback(() => {
    if (
      summonGaugeRequiredRef.current <= 0 ||
      summonRemainingMsRef.current <= 0
    ) {
      return;
    }

    if (
      !summonActiveRef.current &&
      summonGaugeRef.current < summonGaugeRequiredRef.current
    ) {
      return;
    }

    if (!summonActiveRef.current) {
      const eventId = createRaidEventId('summon_spawn');
      const summonId = `${playerIdRef.current}:summon:${Date.now()}`;
      const spawnAnchor = getSummonSpawnIndexForPlayer(playerIdRef.current);
      summonGaugeRef.current = 0;
      setSummonGauge(0);
      setSummonSpawnIndex(spawnAnchor);
      setSummonReturning(false);
      setSummonOverlayVisible(true);
      summonActiveRef.current = true;
      activeSummonIdRef.current = summonId;
      setSummonActive(true);
      applyBattleStats(
        playerIdRef.current,
        { summonsUsed: 1 },
        eventId,
      );
      // RAID_FIX: summon spawn is a visual raid event for peers. Damage remains
      // in dealRaidDamage so it is not applied twice.
      channelRef.current?.send({
        type: 'broadcast',
        event: 'summon_spawn',
        payload: {
          eventId,
          raidRoomId: instanceId,
          casterId: playerIdRef.current,
          summonId,
          summonType: 'raid_summon',
          spawnAnchor,
          createdAt: Date.now(),
          durationMs: summonRemainingMsRef.current,
        },
      });
      return;
    }

    summonActiveRef.current = false;
    const summonId = activeSummonIdRef.current;
    activeSummonIdRef.current = null;
    setSummonActive(false);
    setSummonReturning(true);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'summon_return',
      payload: {
        eventId: createRaidEventId('summon_return'),
        raidRoomId: instanceId,
        casterId: playerIdRef.current,
        summonId,
      },
    });
  }, [
    applyBattleStats,
    createRaidEventId,
    getSummonSpawnIndexForPlayer,
    instanceId,
  ]);

  // Spectator navigation
  const cycleSpectator = useCallback((dir: number) => {
    const aliveList = alivePlayersRef.current.filter(
      id => id !== playerIdRef.current,
    );
    if (aliveList.length === 0) return;
    setSpectatingIdx(prev => {
      const next = (prev + dir + aliveList.length) % aliveList.length;
      const playerId = aliveList[next];
      const data = remoteBoardsRef.current.get(playerId);
      if (data) {
        setSpectatorBoard(data.board);
        setSpectatorNickname(data.nickname);
      } else {
        // Find nickname from participants
        setSpectatorNickname(playerId.slice(0, 8));
      }
      return next;
    });
  }, []);

  // Send chat
  const handleSendChat = useCallback(() => {
    const text = chatInput.trim();
    if (!text || text.length > 100) return;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'chat',
      payload: {
        playerId: playerIdRef.current,
        nickname: nicknameRef.current,
        text,
      },
    });
    setChatMessages(prev => [
      ...prev.slice(-49),
      {
        id: `${playerIdRef.current}-${Date.now()}`,
        nickname: nicknameRef.current,
        text,
      },
    ]);
    setChatInput('');
    setTimeout(
      () => chatScrollRef.current?.scrollToEnd({ animated: true }),
      100,
    );
  }, [chatInput]);

  const leaveRaidSession = useCallback(async () => {
    const playerId = playerIdRef.current;
    if (!playerId || leavingRaidRef.current) {
      return;
    }

    leavingRaidRef.current = true;
    const partyId = raidPartyIdRef.current;
    const nickname = nicknameRef.current;
    // RAID_FIX: pressing leave is an explicit raid exit, not a background
    // pause. Broadcast first for instant UI, then persist delete/fallback.
    channelRef.current?.send({
      type: 'broadcast',
      event: 'player_left',
      payload: {
        playerId,
        nickname,
        left: true,
        role: 'left',
        partyId,
        eventId: createRaidEventId('player_left'),
      },
    });

    removeParticipantFromRaid(playerId);

    try {
      await leaveRaidParticipant(instanceId, playerId);
    } catch (error) {
      console.warn('RaidScreen leaveRaidParticipant failed:', error);
    }

    if (partyId) {
      try {
        await leaveOrDisbandParty(partyId, playerId);
      } catch (error) {
        console.warn('RaidScreen leaveOrDisbandParty failed:', error);
      }
    }

    raidPartyIdRef.current = null;
  }, [createRaidEventId, instanceId, removeParticipantFromRaid]);

  const leaveRaidToLobby = useCallback(() => {
    allowLeaveRef.current = true;
    void leaveRaidSession().finally(() => {
      navigation.replace('RaidLobby');
    });
  }, [leaveRaidSession, navigation]);

  const requestRaidExit = useCallback(
    (onConfirm?: () => void) => {
      let message = '레이드를 종료하고 홈으로 이동하시겠습니까?';
      if (bossDefeated && rewardData && !rewardCollected) {
        message =
          '지금 나가면 아직 수령하지 않은 레이드 보상을 받을 수 없습니다.\n보상을 받고 나가는 것을 권장합니다.\n그래도 나가시겠습니까?';
      } else if (spectatorMode && !bossDefeated) {
        message =
          '지금 나가면 관전을 종료하며 이번 레이드의 점수와 보상을 받을 수 없습니다.\n대기하면 레이드 종료 후 점수 보상을 받을 수 있습니다.\n그래도 나가시겠습니까?';
      } else if (!gameOver && !bossDefeated) {
        message =
          '지금 나가면 진행 중인 레이드 기록과 보상을 받을 수 없습니다.\n그래도 나가시겠습니까?';
      }

      Alert.alert('레이드 나가기', message, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: () => {
            if (onConfirm) {
              void leaveRaidSession().finally(() => {
                allowLeaveRef.current = true;
                onConfirm();
              });
              return;
            }
            leaveRaidToLobby();
          },
        },
      ]);
    },
    [
      bossDefeated,
      gameOver,
      leaveRaidToLobby,
      leaveRaidSession,
      rewardCollected,
      rewardData,
      spectatorMode,
    ],
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event: any) => {
      if (allowLeaveRef.current) {
        return;
      }

      if (isRaidReplaceAction(event.data?.action)) {
        // RAID_FIX: internal raid start/restart navigation must not show the
        // "leave raid" confirmation popup.
        allowLeaveRef.current = true;
        return;
      }

      if (
        !spectatorMode &&
        !(bossDefeated && rewardData && !rewardCollected) &&
        !(!gameOver && !bossDefeated)
      ) {
        return;
      }

      event.preventDefault();
      requestRaidExit(() => navigation.dispatch(event.data.action));
    });

    return unsubscribe;
  }, [
    bossDefeated,
    gameOver,
    navigation,
    requestRaidExit,
    rewardCollected,
    rewardData,
    spectatorMode,
  ]);

  // Calculate and apply rewards when boss is defeated
  const processRewards = useCallback(async () => {
    if (rewardCollected) return;

    if (isNormalRaid) {
      const normalRaidProgress = await loadNormalRaidProgress();
      const preview = getNormalRaidRewardPreview(bossStage, normalRaidProgress);
      const rewardTotals = applyRewardMultipliers(
        0,
        preview.diamonds,
        getRaidEffects(),
      );
        playGameSfx('reward');
        setRewardData({
        gold: 0,
        diamonds: rewardTotals.diamonds,
        items: {},
        rankMultiplier: 1,
        rank: 1,
        skinUnlocked: preview.unlocksSkin ? bossStage : null,
        titlesUnlocked: [],
      });
      return;
    }

    await new Promise<void>(resolve => setTimeout(resolve, 500));
    const { data: finalParts } = await getRaidParticipants(instanceId);
    let myRank = 1;
    if (finalParts) {
      const sorted = finalParts
        .filter((p: any) => p.role !== 'left')
        .sort((a: any, b: any) => b.total_damage - a.total_damage);
      const idx = sorted.findIndex(
        (p: any) => p.player_id === playerIdRef.current,
      );
      if (idx >= 0) myRank = idx + 1;
      const finalParticipants = sorted.map((p: any, i: number) => ({
          playerId: p.player_id,
          nickname: p.nickname,
          totalDamage: p.total_damage,
          rank: i + 1,
          avatarIcon: p.avatar_icon ?? p.nickname?.slice(0, 1),
          role: p.player_id === raidStarterIdRef.current ? 'host' : 'member',
          isHost: p.player_id === raidStarterIdRef.current,
          isReady: Boolean(rematchReadyRef.current[p.player_id]),
          isAlive: battleStatsRef.current[p.player_id]?.isAlive ?? true,
          joinedAt: p.joined_at,
        }));
      participantsRef.current = finalParticipants;
      setParticipants(finalParticipants);
    }
    const codexData = await loadCodexData();
    const firstDefeat = !codexData[bossStage];
    const reward = calculateRewards(bossStage, myRank, firstDefeat);
    const existingTitles = await loadUnlockedTitles();
    const defeatedBosses = Object.keys(codexData).map(Number);
    if (firstDefeat) defeatedBosses.push(bossStage);
    const newTitles = checkNewTitles(
      existingTitles,
      defeatedBosses,
      myRank === 1,
      myTotalDamage,
    );
    reward.titlesUnlocked = newTitles;
    const rewardTotals = applyRewardMultipliers(
      reward.gold,
      reward.diamonds,
      getRaidEffects(),
    );
    reward.gold = applySkinRewardBonuses(
      rewardTotals.gold,
      activeSkinIdRef.current,
    );
    reward.diamonds = rewardTotals.diamonds;
      playGameSfx('reward');
      setRewardData(reward);
  }, [
    bossStage,
    getRaidEffects,
    instanceId,
    isNormalRaid,
    myTotalDamage,
    rewardCollected,
  ]);

  useEffect(() => {
    if (bossDefeated && !rewardData && !rewardCollected) {
      processRewards();
    }
  }, [bossDefeated, rewardData, rewardCollected, processRewards]);

  // RAID_FIX: clear screen can collect rewards without forcing the party out,
  // so users can ready up for the next raid battle.
  const handleCollectReward = async (exitAfterCollect = true) => {
    if (!rewardData || rewardCollected) return;
    setRewardCollected(true);
    let data = await loadGameData();

    if (isNormalRaid) {
      const progress = await loadNormalRaidProgress();
      const preview = getNormalRaidRewardPreview(bossStage, progress);
      const updatedProgress = await recordNormalRaidKill(progress, bossStage);
      const reachedSummonReward =
        preview.killCountAfter > 0 && preview.killCountAfter % 10 === 0;
      if (reachedSummonReward) {
        await grantMonsterSummonReward(bossStage);
        Alert.alert(
          '소환수 획득 가능',
          '일반 레이드를 10번 클리어했습니다. 도감 메뉴에서 소환수 획득을 확인하세요.',
          [{text: '닫기'}],
        );
      }
      if (preview.firstClearReward) {
        await claimFirstClearDia(updatedProgress, bossStage);
      }
      setRewardData(current =>
        current
          ? {
              ...current,
              diamonds: preview.diamonds,
              skinUnlocked: preview.unlocksSkin ? bossStage : null,
            }
          : current,
      );
    }

    data = await addGold(data, rewardData.gold);
    data = await addDiamonds(data, rewardData.diamonds);
    for (const [key, count] of Object.entries(rewardData.items)) {
      for (let i = 0; i < count; i++) {
        data = await addItem(data, key as any, 1);
      }
    }
    if (rewardData.skinUnlocked !== null) {
      await unlockSkin(rewardData.skinUnlocked);
    }
    if (rewardData.titlesUnlocked.length > 0) {
      const existing = await loadUnlockedTitles();
      await saveUnlockedTitles([...existing, ...rewardData.titlesUnlocked]);
    }
    if (
      selectedMonsterSummonIdRef.current &&
      summonExpEarnedRef.current > 0
    ) {
      await gainMonsterSummonExp(
        selectedMonsterSummonIdRef.current,
        summonExpEarnedRef.current,
      );
    } else if (activeSkinIdRef.current > 0 && summonExpEarnedRef.current > 0) {
      await gainSummonExp(activeSkinIdRef.current, summonExpEarnedRef.current);
    }
    const clearTimeMs =
      startedAtRef.current > 0 ? Date.now() - startedAtRef.current : undefined;
    await updateLocalCodex(bossStage, myTotalDamage, clearTimeMs);
    try {
      await upsertCodexEntry(
        playerIdRef.current,
        bossStage,
        myTotalDamage,
        clearTimeMs,
      );
    } catch {}
    void submitRaidLeaderboard({
      bossStage,
      totalDamage: myTotalDamage,
      rank: rewardData.rank,
      bossDefeated: true,
      clearTimeMs: clearTimeMs ?? 0,
    });
    void flushPlayerStateNow('raid_rewards');
    if (exitAfterCollect) {
      leaveRaidToLobby();
    }
  };

  const handleToggleRematchReady = useCallback(() => {
    const playerId = playerIdRef.current;
    if (!playerId) {
      return;
    }

    const nextReady = !rematchReadyRef.current[playerId];
    const nextMap = { ...rematchReadyRef.current, [playerId]: nextReady };
    const readyRuntimeAlive = !gameOverRef.current && !spectatorRef.current;
    rematchReadyRef.current = nextMap;
    setRematchReady(nextMap);
    persistLocalRaidRuntimeState({
      isReady: nextReady,
      isAlive: readyRuntimeAlive,
      currentHp: readyRuntimeAlive ? playerHpRef.current : 0,
      maxHp: maxPlayerHpRef.current,
      boardState: boardStateRef.current,
      battleStats:
        (battleStatsRef.current[playerId] ??
          createEmptyRaidBattleStats(true)) as unknown as Record<
          string,
          unknown
        >,
    });
    channelRef.current?.send({
      type: 'broadcast',
      event: 'raid_rematch_ready',
      payload: {
        playerId,
        ready: nextReady,
        runtime: {
          ...(buildLocalRaidRuntimeSnapshot() ?? {}),
          isReady: nextReady,
          isAlive: readyRuntimeAlive,
          currentHp: readyRuntimeAlive ? playerHpRef.current : 0,
        },
      },
    });
  }, [buildLocalRaidRuntimeSnapshot, persistLocalRaidRuntimeState]);

  const handleStartNextRaid = useCallback(async () => {
    const hostId = raidStarterIdRef.current || participantsRef.current[0]?.playerId;
    if (!hostId || playerIdRef.current !== hostId) {
      return;
    }

    const latestParticipants = await getRaidParticipants(instanceId);
    if (latestParticipants.data) {
      syncParticipantsFromRows(latestParticipants.data, expiresAt);
    }

    const memberIds = participantsRef.current
      .map(entry => entry.playerId)
      .filter(playerId => playerId !== hostId);
    const allMembersReady = memberIds.every(
      playerId => rematchReadyRef.current[playerId],
    );
    if (!allMembersReady) {
      return;
    }

    // RAID_FIX: only the host can reset the shared raid instance for the next
    // fight, then all subscribed clients reset their local battle state.
    const result = await restartRaidInstance(
      instanceId,
      bossMaxHp,
      isNormalRaid ? 365 * 24 * 60 * 60 * 1000 : BOSS_RAID_WINDOW_MS,
    );
    if (result.error || !result.data) {
      Alert.alert('레이드', '다음 전투를 시작할 수 없습니다.');
      return;
    }

    const payload = {
      startedAt: result.data.started_at,
      expiresAt: result.data.expires_at,
    };
    channelRef.current?.send({
      type: 'broadcast',
      event: 'raid_rematch_start',
      payload,
    });
    resetLocalRaidBattleForNextRun(payload);
  }, [
    bossMaxHp,
    expiresAt,
    instanceId,
    isNormalRaid,
    resetLocalRaidBattleForNextRun,
    syncParticipantsFromRows,
  ]);

  const getResultText = () => {
    if (bossDefeated) return t('raid.defeated');
    if (timeExpired || failureReason === 'time_up') return t('raid.timeUp');
    if (failureReason === 'hp_zero') return '파티가 전멸했습니다.';
    return t('raid.boardFull');
  };

  const bossSpriteSet = getRaidBossSpriteSet(
    bossStage,
    creatorRaidRuntime?.monsterName ?? bossName,
  );
  const bossSprite =
    getMonsterPoseSource(bossSpriteSet, bossPose) ??
    getMonsterPoseSource(bossSpriteSet, 'idle');
  const summonSpriteSet =
    getRaidSummonSpriteSetById(selectedMonsterSummonId) ??
    getRaidSummonSpriteSet(bossStage);
  useEffect(() => {
    setBossPose('idle');
  }, [bossStage]);
  const hasSummon = summonGaugeRequired > 0;
  const summonButtonDisabled =
    !hasSummon ||
    (summonGauge < summonGaugeRequired && !summonActive) ||
    summonRemainingMs <= 0;
  const myRaidVisual =
    RAID_CHARACTER_VISUALS[selectedCharacterRef.current ?? 'knight'] ??
    RAID_CHARACTER_VISUALS.knight;
  const myRaidPortrait = selectedCharacterRef.current
    ? RAID_CHARACTER_PORTRAITS[selectedCharacterRef.current]
    : null;
  const allyParticipants = participants.filter(
    participant => participant.playerId !== playerIdRef.current,
  );
  const normalRaidSlots = [
    allyParticipants[0] ?? null,
    allyParticipants[1] ?? null,
    allyParticipants[2] ?? null,
    allyParticipants[3] ?? null,
  ];
  const currentRaidHostId = raidStarterId || participants[0]?.playerId || '';
  const isCurrentRaidHost =
    Boolean(currentRaidHostId) && playerIdRef.current === currentRaidHostId;
  const rematchMemberIds = participants
    .map(entry => entry.playerId)
    .filter(playerId => playerId !== currentRaidHostId);
  const allRematchReady = rematchMemberIds.every(
    playerId => rematchReady[playerId],
  );
  const myRematchReady = Boolean(rematchReady[playerIdRef.current]);

  const handleSummonOverlayDone = useCallback(() => {
    setSummonReturning(false);
    setSummonOverlayVisible(false);
  }, []);

  const renderSummonOverlay = (compact: boolean) => (
    <RaidSummonOverlay
      visible={summonOverlayVisible}
      returning={summonReturning}
      attackPulse={summonAttackPulse}
      spawnIndex={summonSpawnIndex}
      spriteSet={summonSpriteSet}
      compact={compact}
      onReturnDone={handleSummonOverlayDone}
    />
  );

  const renderRemoteSummonOverlays = (compact: boolean) => (
    <>
      {remoteSummons.map(summon => (
        <RaidSummonOverlay
          key={summon.summonId}
          visible
          returning={summon.returning}
          attackPulse={summon.attackPulse}
          spawnIndex={summon.spawnAnchor}
          spriteSet={summonSpriteSet}
          compact={compact}
          onReturnDone={() =>
            setRemoteSummons(previous =>
              previous.filter(entry => entry.summonId !== summon.summonId),
            )
          }
        />
      ))}
    </>
  );

  const renderRaidPlayerSprite = (compact: boolean) => (
    <View
      pointerEvents="none"
      style={[
        styles.raidPlayerSpriteDock,
        compact && styles.raidPlayerSpriteDockCompact,
      ]}
    >
      {(() => {
        const characterId = selectedCharacterRef.current ?? 'knight';
        const tuning =
          characterVisualTunings[
            characterId as keyof typeof characterVisualTunings
          ] ?? characterVisualTunings.knight;
        const battleTransform = {
          transform: [
            { translateX: tuning.battleOffsetX },
            { translateY: tuning.battleOffsetY },
            { scale: tuning.battleScaleMultiplier },
          ],
        };

        if (characterId === 'knight') {
          return (
            <View style={battleTransform}>
              <KnightSprite
                size={compact ? 40 : 44}
                attackPulse={playerAttackPulse}
                facing={1}
              />
            </View>
          );
        }

        if (myRaidPortrait) {
          return (
            <View style={battleTransform}>
              <Image
                source={myRaidPortrait}
                resizeMode="contain"
                fadeDuration={0}
                style={[
                  styles.raidPlayerSpriteImage,
                  compact && styles.raidPlayerSpriteImageCompact,
                ]}
              />
            </View>
          );
        }

        return (
          <View style={battleTransform}>
            <CharacterSprite
              characterId={characterId}
              size={compact ? 52 : 58}
              attackPulse={playerAttackPulse}
              facing={1}
            />
          </View>
        );
      })()}
    </View>
  );

  const renderTopStatusRow = (compact: boolean) => (
    <View style={[styles.topStatusRow, compact && styles.topStatusRowCompact]}>
      <View
        style={[
          styles.statusPanel,
          styles.statusPanelHp,
          compact && styles.statusPanelCompact,
        ]}
      >
        <View style={styles.playerStatusBarGroup}>
          <View style={styles.playerStatusBarRow}>
            <View style={styles.playerHpBarBg}>
              <Animated.View
                style={[
                  styles.playerHpBarFill,
                  {
                    width: playerHpAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            </View>
            <View pointerEvents="none" style={styles.playerStatusBarOverlay}>
              <Text style={styles.playerStatusBarText}>
                {`${playerHp.toLocaleString()} / ${maxPlayerHp.toLocaleString()}`}
              </Text>
            </View>
          </View>

          <View style={styles.playerStatusBarRow}>
            <View style={styles.playerFeverBarBg}>
              <View
                style={[
                  styles.playerFeverBarFill,
                  { width: `${Math.min(100, feverGauge)}%` },
                  feverActive && styles.playerFeverBarFillActive,
                ]}
              />
            </View>
            <View pointerEvents="none" style={styles.playerStatusBarOverlay}>
              <Text
                style={[
                  styles.playerStatusBarText,
                  feverActive && styles.playerStatusBarTextActive,
                ]}
              >
                {feverActive ? '피버 발동' : `피버 ${feverGauge}%`}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.statusPanel,
          styles.statusPanelSummon,
          compact && styles.statusPanelCompact,
          !hasSummon && styles.statusPanelSummonDisabled,
        ]}
      >
        <View style={styles.summonHeader}>
          <Text style={styles.summonTitle}>소환수</Text>
          <Text style={styles.summonMeta}>
            {hasSummon
              ? `${summonName || summonSpriteSet?.name || '소환수'} Lv.${summonLevel} · 공격 ${summonAttack}`
              : '도감에서 소환수를 획득하세요'}
          </Text>
        </View>
        <View style={styles.summonBarBg}>
          <View
            style={[
              styles.summonBarFill,
              {
                width: `${
                  summonGaugeRequired > 0
                    ? (summonGauge / summonGaugeRequired) * 100
                    : 0
                }%`,
              },
            ]}
          />
        </View>
        <View style={styles.summonFooter}>
          <Text style={styles.summonMeta}>
            {hasSummon
              ? `게이지 ${summonGauge}/${
                  summonGaugeRequired || '-'
                } · ${Math.ceil(summonRemainingMs / 1000)}초 · EXP ${summonExp}/${summonExpRequired}`
              : '일반 레이드 10회 보상으로 획득'}
          </Text>
          <TouchableOpacity
            onPress={handleToggleSummon}
            disabled={summonButtonDisabled}
            style={[
              styles.summonBtn,
              summonActive && styles.summonBtnActive,
              summonButtonDisabled && styles.summonBtnDisabled,
            ]}
          >
            <Text style={styles.summonBtnText}>
              {summonActive ? '회수' : '소환'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const comboGaugeMaxMs =
    COMBO_TIMEOUT_MS + getRaidEffects().comboWindowBonusMs;
  const feverGaugeMaxMs =
    FEVER_DURATION + getRaidEffects().feverDurationBonusMs;
  const creatorRaidBackgroundRule = creatorRaidRuntime?.background ?? null;
  const raidBackgroundOverride = getRaidBackgroundOverride(
    visualManifest,
    bossStage,
    isNormalRaid,
  );
  const raidBackgroundSource =
    raidBackgroundOverride?.removeImage === true ||
    creatorRaidBackgroundRule?.removeImage === true
      ? null
      : raidBackgroundOverride?.assetKey &&
        visualAssetUris[raidBackgroundOverride.assetKey]
      ? { uri: visualAssetUris[raidBackgroundOverride.assetKey] }
      : creatorRaidBackgroundRule?.assetKey &&
        creatorAssetUris[creatorRaidBackgroundRule.assetKey]
      ? { uri: creatorAssetUris[creatorRaidBackgroundRule.assetKey] }
      : null;
  const raidBackgroundTint = raidBackgroundOverride
    ? buildVisualTintColor(
        raidBackgroundOverride.tintColor,
        raidBackgroundOverride.tintOpacity,
      )
    : creatorRaidBackgroundRule
    ? buildVisualTintColor(
        creatorRaidBackgroundRule.tintColor,
        creatorRaidBackgroundRule.tintOpacity,
      )
    : 'transparent';
  const raidComboGaugeRule = getVisualElementRule(
    visualManifest,
    raidScreenId,
    'combo_gauge',
    selectedCharacterId,
  );
  const raidBoardRule = getVisualElementRule(
    visualManifest,
    raidScreenId,
    'board',
    selectedCharacterId,
  );
  const previewPieces =
    getRaidEffects().previewCountBonus > 0
      ? nextPieces.slice(0, Math.min(3, getRaidEffects().previewCountBonus))
      : [];
  const VisualElementView = React.useMemo(
    () =>
      function CharacterVisualElementView(
        props: React.ComponentProps<typeof BaseVisualElementView>,
      ) {
        return (
          <BaseVisualElementView
            characterId={selectedCharacterId}
            {...props}
          />
        );
      },
    [selectedCharacterId],
  );
  const renderBoardStatusDock = (compact: boolean) => {
    const comboLayerOffset = 80;
    const comboGaugeStyle = {
      ...buildVisualElementStyle(
        raidComboGaugeRule,
        visualViewport,
        visualManifest.referenceViewport,
      ),
      // RAID_FIX: keep the raid combo gauge above the board while still
      // letting PC edit mode zIndex adjust the relative order.
      zIndex: comboLayerOffset + raidComboGaugeRule.zIndex,
      elevation: comboLayerOffset + Math.max(0, raidComboGaugeRule.zIndex),
    };

    if (raidComboGaugeRule.visible) {

      return (
        <ComboGaugeOverlay
          combo={combo}
          comboRemainingMs={comboRemainingMs}
          comboMaxMs={comboGaugeMaxMs}
          feverActive={feverActive}
          feverRemainingMs={feverRemainingMs}
          feverMaxMs={feverGaugeMaxMs}
          compact={compact}
          visualAutomationLabel={buildVisualAutomationLabel(
            raidScreenId,
            'combo_gauge',
          )}
          style={comboGaugeStyle}
        />
      );
    }

    // RAID_FIX: keep a fallback combo HUD visible when the editor layer hides
    // the configured gauge, so raid combat always exposes combo state.
    return (
      <ComboGaugeOverlay
        combo={combo}
        comboRemainingMs={comboRemainingMs}
        comboMaxMs={comboGaugeMaxMs}
        feverActive={feverActive}
        feverRemainingMs={feverRemainingMs}
        feverMaxMs={feverGaugeMaxMs}
        compact={compact}
        style={comboGaugeStyle}
      />
    );

    const showComboGauge = true;
    const showFeverTimer = feverActive && feverRemainingMs > 0;

    if (!showComboGauge && !showFeverTimer) {
      return null;
    }

    return (
      <View
        pointerEvents="none"
        style={[
          styles.boardStatusOverlay,
          compact && styles.boardStatusOverlayCompact,
        ]}
      >
        {showComboGauge && (
          <View style={styles.boardGaugeCard}>
            <View style={styles.boardGaugeHeader}>
              <Text style={styles.boardGaugeLabel}>콤보 유지</Text>
              <Text style={styles.boardGaugeValue}>
                {`${combo}콤보 · ${Math.max(0, comboRemainingMs / 1000).toFixed(
                  2,
                )}초`}
              </Text>
            </View>
            <View style={styles.boardGaugeTrack}>
              <View
                style={[
                  styles.boardGaugeFill,
                  styles.boardGaugeFillCombo,
                  {
                    width: `${
                      Math.max(
                        0,
                        Math.min(
                          1,
                          comboRemainingMs / Math.max(1, comboGaugeMaxMs),
                        ),
                      ) * 100
                    }%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {showFeverTimer && (
          <View style={styles.boardGaugeCard}>
            <View style={styles.boardGaugeHeader}>
              <Text style={styles.boardGaugeLabel}>피버 타이머</Text>
              <Text style={styles.boardGaugeValue}>
                {`${Math.max(0, feverRemainingMs / 1000).toFixed(2)}초`}
              </Text>
            </View>
            <View style={styles.boardGaugeTrack}>
              <View
                style={[
                  styles.boardGaugeFill,
                  styles.boardGaugeFillFever,
                  {
                    width: `${
                      Math.max(
                        0,
                        Math.min(
                          1,
                          feverRemainingMs / Math.max(1, feverGaugeMaxMs),
                        ),
                      ) * 100
                    }%`,
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderNormalRaidSlot = (
    participant: RaidParticipant | null,
    side: 'left' | 'right',
    slotIndex: number,
  ) => {
    const isMe = participant?.playerId === playerIdRef.current;
    const avatarLabel = isMe
      ? myRaidVisual.emoji
      : participant?.nickname?.trim().slice(0, 1) || '•';
    const displayName = participant
      ? isMe
        ? myRaidVisual.name
        : participant.nickname
      : '대기중';

    const isAlive = participant?.isAlive !== false;
    const hpMax = Math.max(1, participant?.maxHp ?? 0);
    const hpCurrent = Math.max(
      0,
      participant?.currentHp ?? (participant ? hpMax : 0),
    );
    const hpPercent = participant
      ? Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100))
      : 0;

    return (
      <View
        key={`${side}-${slotIndex}-${participant?.playerId ?? 'empty'}`}
        style={[
          styles.normalRaidPartySlot,
          side === 'left'
            ? styles.normalRaidPartySlotLeft
            : styles.normalRaidPartySlotRight,
          !participant && styles.normalRaidPartySlotEmpty,
        ]}
      >
        <View
          style={[
            styles.normalRaidAvatarOrb,
            isMe && styles.normalRaidAvatarOrbMe,
            !participant && styles.normalRaidAvatarOrbEmpty,
          ]}
        >
          <Text style={styles.normalRaidAvatarText}>{avatarLabel}</Text>
        </View>
        <Text numberOfLines={1} style={styles.normalRaidAvatarName}>
          {displayName}
        </Text>
        {participant ? (
          <View style={styles.normalRaidMemberHpBlock}>
            <Text
              numberOfLines={1}
              style={[
                styles.normalRaidMemberState,
                !isAlive && styles.normalRaidMemberStateDead,
              ]}
            >
              {isAlive
                ? `${hpCurrent.toLocaleString()} / ${hpMax.toLocaleString()}`
                : '☠'}
            </Text>
            <View style={styles.normalRaidMemberHpTrack}>
              <View
                style={[
                  styles.normalRaidMemberHpFill,
                  !isAlive && styles.normalRaidMemberHpFillDead,
                  { width: `${hpPercent}%` },
                ]}
              />
            </View>
          </View>
        ) : null}
        {false && (
          <View pointerEvents="none" style={styles.normalRaidTimerCover}>
            <Text style={styles.normalRaidTimerCoverText}>일반 레이드</Text>
          </View>
        )}
      </View>
    );
  };

  const renderBattleStatsPanel = () => {
    const rows = participants.length > 0 ? participants : clearSnapshot?.participants ?? [];
    const rankedRows = rows
      .map(participant => {
        const stats =
          battleStats[participant.playerId] ??
          clearSnapshot?.battleStats[participant.playerId] ??
          createEmptyRaidBattleStats(true);
        return {
          participant,
          stats,
          value: stats[battleStatsTab],
        };
      })
      .sort((a, b) => b.value - a.value);
    const maxValue = Math.max(1, ...rankedRows.map(row => row.value));
    const activeTabLabel =
      RAID_STATS_TABS.find(tab => tab.key === battleStatsTab)?.label ?? '딜량';

    // RAID_FIX: raid battle stats are tabbed and sorted with horizontal gauges
    // so the highest value is always easiest to read.
    return (
      <View style={styles.raidStatsPanel}>
        <View style={styles.raidStatsHeader}>
          <Text style={styles.raidStatsTitle}>전투 현황</Text>
          <TouchableOpacity onPress={() => setShowBattleStatsPanel(false)}>
            <Text style={styles.raidStatsClose}>닫기</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.raidStatsTabRow}>
          {RAID_STATS_TABS.map(tab => {
            const active = tab.key === battleStatsTab;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setBattleStatsTab(tab.key)}
                style={[
                  styles.raidStatsTab,
                  active && styles.raidStatsTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.raidStatsTabText,
                    active && styles.raidStatsTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <ScrollView style={styles.raidStatsScroll}>
          {rankedRows.map(({ participant, stats, value }, index) => {
            const percent = Math.max(4, Math.min(100, (value / maxValue) * 100));
            return (
              <View key={participant.playerId} style={styles.raidStatsRow}>
                <View style={styles.raidStatsNameCol}>
                  <Text style={styles.raidStatsName} numberOfLines={1}>
                    {index + 1}. {participant.nickname}
                  </Text>
                  <Text
                    style={[
                      styles.raidStatsState,
                      !stats.isAlive && styles.raidStatsStateDead,
                    ]}
                  >
                    {stats.isAlive ? '생존' : '사망'}
                  </Text>
                </View>
                <View style={styles.raidStatsGaugeCol}>
                  <View style={styles.raidStatsGaugeTrack}>
                    <View
                      style={[
                        styles.raidStatsGaugeFill,
                        { width: `${percent}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.raidStatsGaugeValue}>
                    {activeTabLabel} {formatRaidStat(value)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );

    return (
      <View style={styles.raidStatsPanel}>
        <View style={styles.raidStatsHeader}>
          <Text style={styles.raidStatsTitle}>전투 현황</Text>
          <TouchableOpacity onPress={() => setShowBattleStatsPanel(false)}>
            <Text style={styles.raidStatsClose}>닫기</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.raidStatsScroll}>
          {rows.map(participant => {
            const stats =
              battleStats[participant.playerId] ??
              clearSnapshot?.battleStats[participant.playerId] ??
              createEmptyRaidBattleStats(true);
            return (
              <View key={participant.playerId} style={styles.raidStatsRow}>
                <View style={styles.raidStatsNameCol}>
                  <Text style={styles.raidStatsName} numberOfLines={1}>
                    {participant.nickname}
                  </Text>
                  <Text
                    style={[
                      styles.raidStatsState,
                      !stats.isAlive && styles.raidStatsStateDead,
                    ]}
                  >
                    {stats.isAlive ? '생존' : '사망'}
                  </Text>
                </View>
                <View style={styles.raidStatsGrid}>
                  <Text style={styles.raidStatsCell}>
                    딜 {formatRaidStat(stats.damageDealt)}
                  </Text>
                  <Text style={styles.raidStatsCell}>
                    힐 {formatRaidStat(stats.healingDone)}
                  </Text>
                  <Text style={styles.raidStatsCell}>
                    받은힐 {formatRaidStat(stats.healingReceived)}
                  </Text>
                  <Text style={styles.raidStatsCell}>
                    피해 {formatRaidStat(stats.damageTaken)}
                  </Text>
                  <Text style={styles.raidStatsCell}>
                    소환 {stats.summonsUsed}
                  </Text>
                  <Text style={styles.raidStatsCell}>
                    콤보 {stats.comboMax}
                  </Text>
                  <Text style={styles.raidStatsCell}>
                    사망 {stats.deathCount}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderRaidClearPanel = () => {
    if (!rewardData) {
      return null;
    }

    const snapshot = clearSnapshot ?? buildRaidClearSnapshot();
    const rows = snapshot.participants;
    const statsMap = snapshot.battleStats;
    const mvpDamage = rows.reduce(
      (best, row) =>
        (statsMap[row.playerId]?.damageDealt ?? row.totalDamage) >
        (statsMap[best.playerId]?.damageDealt ?? best.totalDamage)
          ? row
          : best,
      rows[0] ?? {
        playerId: '',
        nickname: '-',
        totalDamage: 0,
        rank: 1,
      },
    );
    const mvpHeal = rows.reduce(
      (best, row) =>
        (statsMap[row.playerId]?.healingDone ?? 0) >
        (statsMap[best.playerId]?.healingDone ?? 0)
          ? row
          : best,
      rows[0] ?? {
        playerId: '',
        nickname: '-',
        totalDamage: 0,
        rank: 1,
      },
    );

    return (
      <View style={styles.raidClearOverlay}>
        <View style={styles.raidClearPanel}>
          <Text style={styles.raidClearTitle}>RAID CLEAR</Text>
          <Text style={styles.raidClearMeta}>
            {snapshot.bossName} · {formatRaidClearTime(snapshot.clearTimeMs)}
          </Text>
          <View style={styles.raidClearBadges}>
            <Text style={styles.raidClearBadge}>MVP {mvpDamage.nickname}</Text>
            <Text style={styles.raidClearBadge}>힐 {mvpHeal.nickname}</Text>
          </View>

          <ScrollView style={styles.raidClearStats}>
            {rows.map(row => {
              const stats =
                statsMap[row.playerId] ?? createEmptyRaidBattleStats(true);
              return (
                <View key={row.playerId} style={styles.raidClearRow}>
                  <Text style={styles.raidClearName} numberOfLines={1}>
                    {row.nickname}
                  </Text>
                  <Text style={styles.raidClearValue}>
                    딜 {formatRaidStat(stats.damageDealt || row.totalDamage)}
                  </Text>
                  <Text style={styles.raidClearValue}>
                    힐 {formatRaidStat(stats.healingDone)}
                  </Text>
                  <Text style={styles.raidClearValue}>
                    받은힐 {formatRaidStat(stats.healingReceived)}
                  </Text>
                  <Text style={styles.raidClearValue}>
                    피해 {formatRaidStat(stats.damageTaken)}
                  </Text>
                  <Text style={styles.raidClearValue}>소환 {stats.summonsUsed}</Text>
                  <Text style={styles.raidClearValue}>콤보 {stats.comboMax}</Text>
                  <Text style={styles.raidClearValue}>사망 {stats.deathCount}</Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.raidRewardSummary}>
            <Text style={styles.raidRewardText}>
              골드 {rewardData.gold.toLocaleString()} · 다이아{' '}
              {rewardData.diamonds.toLocaleString()}
            </Text>
          </View>

          <View style={styles.raidRematchRow}>
            <TouchableOpacity
              style={[
                styles.raidClearAction,
                rewardCollected && styles.raidClearActionDisabled,
              ]}
              disabled={rewardCollected}
              onPress={() => void handleCollectReward(false)}
            >
              <Text style={styles.raidClearActionText}>
                {rewardCollected ? '보상 수령 완료' : '보상 받기'}
              </Text>
            </TouchableOpacity>

            {isCurrentRaidHost ? (
              <TouchableOpacity
                style={[
                  styles.raidClearAction,
                  !allRematchReady && styles.raidClearActionDisabled,
                ]}
                disabled={!allRematchReady}
                onPress={() => void handleStartNextRaid()}
              >
                <Text style={styles.raidClearActionText}>
                  {allRematchReady ? '다음 전투 시작' : '파티원 준비 대기 중'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.raidClearAction,
                  myRematchReady && styles.raidReadyActionActive,
                ]}
                onPress={handleToggleRematchReady}
              >
                <Text style={styles.raidClearActionText}>
                  {myRematchReady ? '준비 완료' : '전투 준비'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.raidClearExit} onPress={leaveRaidToLobby}>
            <Text style={styles.raidClearExitText}>레이드 로비</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          paddingTop: modeVerticalGutter,
          paddingBottom: modeVerticalGutter,
        },
      ]}
    >
      {raidBackgroundSource ? (
        <ImageBackground
          source={raidBackgroundSource}
          resizeMode="cover"
          style={styles.visualBackgroundLayer}
        >
          <View
            pointerEvents="none"
            style={[
              styles.visualBackgroundTintLayer,
              { backgroundColor: raidBackgroundTint },
            ]}
          />
        </ImageBackground>
      ) : raidBackgroundTint !== 'transparent' ? (
        <View
          pointerEvents="none"
          style={[
            styles.visualBackgroundTintLayer,
            { backgroundColor: raidBackgroundTint },
          ]}
        />
      ) : null}
      <VisualElementView
        screenId={raidScreenId}
        elementId="top_panel"
        style={styles.visualWrapper}
      >
        {isNormalRaid ? (
          <>
            <View style={styles.normalRaidHeader}>
              <View style={styles.normalRaidPartyColumn}>
                {renderNormalRaidSlot(normalRaidSlots[0], 'left', 0)}
                {renderNormalRaidSlot(normalRaidSlots[1], 'left', 1)}
              </View>

              <View style={styles.normalRaidBossCard}>
                <Text style={[styles.normalRaidBossName, { color: bossColor }]}>
                  {bossName}
                </Text>
                <View
                  style={[styles.normalRaidBossOrb, { borderColor: bossColor }]}
                >
                  {bossSprite ? (
                    <Image
                      source={bossSprite}
                      resizeMode="contain"
                      fadeDuration={0}
                      style={[
                        styles.normalRaidBossSprite,
                        {
                          transform: [
                            { scaleX: -(bossSpriteSet?.facing ?? 1) },
                          ],
                        },
                      ]}
                    />
                  ) : (
                    <Text style={styles.normalRaidBossEmoji}>{bossEmoji}</Text>
                  )}
                  {bossImpactHit && bossImpactHit.damage >= 10 && (
                    <HitEffect
                      key={`raid-normal-hit-effect-${bossImpactHit.id}`}
                      damage={bossImpactHit.damage}
                      onDone={() =>
                        setBossImpactHit(current =>
                          current?.id === bossImpactHit.id ? null : current,
                        )
                      }
                    />
                  )}
                  <View
                    pointerEvents="none"
                    style={styles.normalRaidBossDamageHost}
                  >
                    {bossSummonDamageHits
                      .slice()
                      .reverse()
                      .map((hit, index) => (
                        <FloatingDamageLabel
                          key={`raid-normal-summon-hit-${hit.id}`}
                          damage={hit.damage}
                          stackIndex={index}
                          baseTop={30}
                          stackGap={20}
                          variant="summon"
                        />
                      ))}
                    {bossDamageHits
                      .slice()
                      .reverse()
                      .map((hit, index) => (
                        <FloatingDamageLabel
                          key={`raid-normal-hit-${hit.id}`}
                          damage={hit.damage}
                          stackIndex={index}
                          baseTop={8}
                          stackGap={20}
                        />
                      ))}
                  </View>
                </View>
                <View
                  pointerEvents="none"
                  style={styles.normalRaidBossOverlayHost}
                >
                  {renderSummonOverlay(true)}
                  {renderRemoteSummonOverlays(true)}
                </View>
                {renderRaidPlayerSprite(true)}
                <View style={styles.normalRaidBossHpTrack}>
                  <View
                    style={[
                      styles.normalRaidBossHpFill,
                      {
                        width: `${Math.max(
                          0,
                          (bossHp / Math.max(1, bossMaxHp)) * 100,
                        )}%`,
                      },
                      bossHp / Math.max(1, bossMaxHp) > 0.5
                        ? styles.normalRaidBossHpFillHigh
                        : bossHp / Math.max(1, bossMaxHp) > 0.25
                        ? styles.normalRaidBossHpFillMid
                        : styles.normalRaidBossHpFillLow,
                    ]}
                  />
                </View>
                <Text style={styles.normalRaidBossHpText}>
                  {bossHp.toLocaleString()} / {bossMaxHp.toLocaleString()}
                </Text>
              </View>

              <View style={styles.normalRaidPartyColumn}>
                {renderNormalRaidSlot(normalRaidSlots[2], 'right', 2)}
                {renderNormalRaidSlot(normalRaidSlots[3], 'right', 3)}
              </View>
            </View>

            {renderTopStatusRow(true)}
          </>
        ) : (
          <>
            <BossDisplay
              bossName={bossName}
              bossEmoji={bossEmoji}
              bossColor={bossColor}
              currentHp={bossHp}
              maxHp={bossMaxHp}
              stage={bossStage}
              participants={participants.slice(0, 30).map(p => ({
                rank: p.rank,
                nickname: p.nickname,
                totalDamage: p.totalDamage,
              }))}
              expandedStandings={standingsExpanded}
              onToggleStandings={() => setStandingsExpanded(prev => !prev)}
              damageHits={bossDamageHits}
              summonDamageHits={bossSummonDamageHits}
              activeDamageHit={bossImpactHit}
              onClearActiveDamageHit={hitId =>
                setBossImpactHit(current =>
                  current?.id === hitId ? null : current,
                )
              }
              overlay={
                <>
                  {renderSummonOverlay(false)}
                  {renderRemoteSummonOverlays(false)}
                </>
              }
              bossPose={bossPose}
              playerOverlay={renderRaidPlayerSprite(false)}
            />

            {renderTopStatusRow(false)}
          </>
        )}
      </VisualElementView>

      {false && activeSkinIdRef.current > 0 && (
        <View
          style={[styles.summonCard, isNormalRaid && styles.summonCardCompact]}
        >
          <View style={styles.summonHeader}>
            <Text style={styles.summonTitle}>소환수</Text>
            <Text style={styles.summonMeta}>
              공격 {summonAttack} / 남은 시간{' '}
              {Math.ceil(summonRemainingMs / 1000)}초
            </Text>
          </View>
          <View style={styles.summonBarBg}>
            <View
              style={[
                styles.summonBarFill,
                {
                  width: `${
                    summonGaugeRequired > 0
                      ? (summonGauge / summonGaugeRequired) * 100
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
          <View style={styles.summonFooter}>
            <Text style={styles.summonMeta}>
              게이지 {summonGauge}/{summonGaugeRequired || '-'}
            </Text>
            <TouchableOpacity
              onPress={handleToggleSummon}
              disabled={
                (summonGauge < summonGaugeRequired && !summonActive) ||
                summonRemainingMs <= 0
              }
              style={[
                styles.summonBtn,
                summonActive && styles.summonBtnActive,
                (summonRemainingMs <= 0 ||
                  (summonGauge < summonGaugeRequired && !summonActive)) &&
                  styles.summonBtnDisabled,
              ]}
            >
              <Text style={styles.summonBtnText}>
                {summonActive ? '회수' : '소환'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Skill bar (hidden in spectator) */}
      {!spectatorMode && (
        <VisualElementView screenId={raidScreenId} elementId="skill_bar">
          <SkillBar
            currentGauge={skillGauge}
            charges={skillCharges}
            activeMultiplier={activeMultiplier}
            skillLevels={raidSkillLevels}
            onSelectSkill={handleSelectSkill}
            disabled={gameOverRef.current}
          />
        </VisualElementView>
      )}

      {/* Damage info */}
      <VisualElementView
        screenId={raidScreenId}
        elementId="info_bar"
        style={styles.visualWrapper}
      >
        <View style={[styles.infoBar, isNormalRaid && styles.infoBarCompact]}>
          <Text style={styles.infoText}>
            {t('raid.yourDamage', myTotalDamage)}
          </Text>
          <Text style={styles.infoText}>
            {spectatorMode ? '관전 모드' : `${t('raid.gauge')}: ${skillGauge}`}
          </Text>
        </View>
      </VisualElementView>

      {!spectatorMode && (
        <VisualElementView
          screenId={raidScreenId}
          elementId="next_preview"
          style={styles.visualWrapper}
        >
          {previewPieces.length > 0 ? (
            <NextPiecePreview pieces={previewPieces} viewport={visualViewport} />
          ) : (
            <View style={styles.nextPreviewPlaceholder} />
          )}
        </VisualElementView>
      )}

      {/* Main content: Board or Spectator view */}
      {spectatorMode ? (
        <KeyboardAvoidingView
          style={styles.flexFill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Spectator navigation */}
          <View style={styles.spectatorNav}>
            <TouchableOpacity
              onPress={() => cycleSpectator(-1)}
              style={styles.arrowBtn}
            >
              <Text style={styles.arrowText}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.spectatorLabel}>{spectatorNickname}</Text>
            <TouchableOpacity
              onPress={() => cycleSpectator(1)}
              style={styles.arrowBtn}
            >
              <Text style={styles.arrowText}>▶</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => requestRaidExit()}
              style={styles.spectatorExitBtn}
            >
              <Text style={styles.spectatorExitBtnText}>나가기</Text>
            </TouchableOpacity>
          </View>

          {/* Spectator board (read-only) */}
          <View style={styles.boardContainer}>
            <Board board={spectatorBoard} compact viewport={visualViewport} />
          </View>

          {/* Chat panel */}
          <View style={styles.chatPanel}>
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatScroll}
              onContentSizeChange={() =>
                chatScrollRef.current?.scrollToEnd({ animated: true })
              }
            >
              {chatMessages.length === 0 && (
                <Text style={styles.chatEmpty}>채팅을 시작하세요</Text>
              )}
              {chatMessages.map(m => (
                <View key={m.id} style={styles.chatRow}>
                  <Text style={styles.chatNick}>{m.nickname}</Text>
                  <Text style={styles.chatText}>{m.text}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatTextInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="메시지 입력..."
                placeholderTextColor="#64748b"
                maxLength={100}
                returnKeyType="send"
                onSubmitEditing={handleSendChat}
              />
              <TouchableOpacity
                onPress={() => setShowBattleStatsPanel(previous => !previous)}
                style={[
                  styles.raidStatsToggle,
                  showBattleStatsPanel && styles.raidStatsToggleActive,
                ]}
              >
                <Text style={styles.raidStatsToggleText}>현황</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendChat}
                style={styles.chatSendBtn}
              >
                <Text style={styles.chatSendText}>전송</Text>
              </TouchableOpacity>
            </View>
            {showBattleStatsPanel && renderBattleStatsPanel()}
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.playArea}>
          <VisualElementView
            screenId={raidScreenId}
            elementId="board"
            style={styles.visualWrapper}
          >
            <Animated.View
              style={[
                styles.boardContainer,
                isNormalRaid && styles.boardContainerCompact,
                {
                  minHeight: raidBoardMetrics.boardSize + 18,
                  transform: [{ translateX: boardShakeAnim }],
                },
              ]}
              onLayout={handleBoardLayout}
            >
              <View style={styles.boardSurface}>
                <Board
                  ref={boardRef}
                  board={board}
                  viewport={visualViewport}
                  backgroundColor={skinBoardBg}
                  compact
                  previewCells={dragDrop.previewCells}
                  invalidPreview={dragDrop.invalidPreview}
                  clearGuideCells={dragDrop.clearGuideCells}
                  placementEffectCells={placementEffect?.cells}
                  placementEffectId={placementEffect?.id ?? null}
                />
                {placementEffect && (
                  <PiecePlacementEffect
                    cells={placementEffect.cells}
                    onDone={() =>
                      setPlacementEffect(current =>
                        current?.id === placementEffect.id ? null : current,
                      )
                    }
                  />
                )}
                {lineClearEffect && (
                  <LineClearEffect
                    cells={lineClearEffect.cells}
                    compact
                    viewport={visualViewport}
                    onDone={() =>
                      setLineClearEffect(current =>
                        current?.id === lineClearEffect.id ? null : current,
                      )
                    }
                  />
                )}
              </View>
              <VisualElementView
                screenId={raidScreenId}
                elementId="skill_effect"
                style={styles.boardSkillEffectLayer}
                pointerEvents="none"
                viewport={visualViewport}
              >
                <SkillTriggerBoardEffect
                  message={skillEffectMessage}
                  triggerKey={skillEffectMessageKey}
                />
              </VisualElementView>
              {renderBoardStatusDock(isNormalRaid)}
            </Animated.View>
          </VisualElementView>

          <VisualElementView screenId={raidScreenId} elementId="piece_tray">
            <PieceSelector
              pieces={pieces}
              onDragStart={dragDrop.onDragStart}
              onDragMove={dragDrop.onDragMove}
              onDragEnd={dragDrop.onDragEnd}
              onDragCancel={dragDrop.onDragCancel}
              compact
              boardCompact
              boardScaleX={
                raidBoardRule.scale * (raidBoardRule.widthScale ?? 1)
              }
              boardScaleY={
                raidBoardRule.scale * (raidBoardRule.heightScale ?? 1)
              }
              viewport={visualViewport}
              dragTuning={dragTuning}
            />
          </VisualElementView>
        </View>
      )}

      {boardSkillCastEffect && (
        <BoardSkillCastEffect
          events={boardSkillCastEffect}
          onDone={() => setBoardSkillCastEffect(null)}
        />
      )}

      <BattleNoticeOverlay
        message={battleNoticeMessage}
        messageKey={battleNoticeKey}
        bottom={156}
      />

      {/* RAID_FIX: shared clear screen with final stats and rematch flow. */}
      {bossDefeated && rewardData && renderRaidClearPanel()}

      {/* Non-victory game over (time up / all dead) - NOT shown in spectator */}
      {gameOver && !bossDefeated && !spectatorMode && (
        <View style={styles.overlay}>
          <Text style={styles.resultText}>{getResultText()}</Text>
          <Text style={styles.resultDamage}>
            {t('raid.yourDamage', myTotalDamage)}
          </Text>

          <View style={styles.finalRankings}>
            {participants.slice(0, 10).map((p, i) => (
              <View key={p.playerId} style={styles.finalRankRow}>
                <Text style={styles.finalRankNum}>{i + 1}.</Text>
                <Text
                  style={[
                    styles.finalRankName,
                    p.playerId === playerIdRef.current &&
                      styles.finalRankNameMe,
                  ]}
                >
                  {p.nickname}
                </Text>
                <Text style={styles.finalRankDmg}>{p.totalDamage}</Text>
              </View>
            ))}
          </View>

          <View style={styles.raidRematchRow}>
            {isCurrentRaidHost ? (
              <TouchableOpacity
                style={[
                  styles.raidClearAction,
                  !allRematchReady && styles.raidClearActionDisabled,
                ]}
                disabled={!allRematchReady}
                onPress={() => void handleStartNextRaid()}
              >
                <Text style={styles.raidClearActionText}>
                  {allRematchReady ? '재도전 시작' : '파티원 준비 대기 중'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.raidClearAction,
                  myRematchReady && styles.raidReadyActionActive,
                ]}
                onPress={handleToggleRematchReady}
              >
                <Text style={styles.raidClearActionText}>
                  {myRematchReady ? '준비 완료' : '재도전 준비'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.exitBtn} onPress={leaveRaidToLobby}>
            <Text style={styles.exitBtnText}>레이드 로비</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading overlay */}
      {!localCoreReady && !gameOver && !spectatorMode && (
        <View style={styles.overlay}>
          <Text style={styles.waitingText}>{t('battle.preparing')}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0a3e',
  },
  visualWrapper: {
    alignSelf: 'stretch',
  },
  visualBackgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  visualBackgroundTintLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  timerBar: {
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  timerText: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '900',
  },
  timerTextDanger: {
    color: '#ef4444',
  },
  normalRaidTimerCover: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  normalRaidTimerCoverText: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '900',
  },
  flexFill: {
    flex: 1,
  },
  normalRaidHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 5,
    marginHorizontal: 10,
    marginBottom: 2,
  },
  normalRaidPartyColumn: {
    width: 64,
    justifyContent: 'space-between',
    gap: 4,
  },
  normalRaidPartySlot: {
    flex: 1,
    minHeight: 45,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    paddingVertical: 4,
    paddingHorizontal: 6,
    justifyContent: 'center',
    gap: 2,
  },
  normalRaidPartySlotLeft: {
    alignItems: 'flex-end',
  },
  normalRaidPartySlotRight: {
    alignItems: 'flex-start',
  },
  normalRaidPartySlotEmpty: {
    opacity: 0.55,
  },
  normalRaidAvatarOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(99,102,241,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(165,180,252,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  normalRaidAvatarOrbMe: {
    backgroundColor: 'rgba(56,189,248,0.22)',
    borderColor: 'rgba(56,189,248,0.82)',
  },
  normalRaidAvatarOrbEmpty: {
    backgroundColor: 'rgba(51,65,85,0.4)',
    borderColor: 'rgba(100,116,139,0.45)',
  },
  normalRaidAvatarText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
  },
  normalRaidAvatarName: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '700',
    maxWidth: '100%',
  },
  normalRaidMemberHpBlock: {
    width: '100%',
    gap: 2,
  },
  normalRaidMemberState: {
    color: '#bbf7d0',
    fontSize: 7,
    fontWeight: '900',
    maxWidth: '100%',
  },
  normalRaidMemberStateDead: {
    color: '#fca5a5',
    fontSize: 11,
  },
  normalRaidMemberHpTrack: {
    width: '100%',
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.9)',
  },
  normalRaidMemberHpFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  normalRaidMemberHpFillDead: {
    backgroundColor: '#64748b',
  },
  normalRaidBossCard: {
    flex: 1,
    minHeight: 78,
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  normalRaidBossName: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 2,
  },
  normalRaidBossOrb: {
    width: 68,
    height: 68,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  normalRaidBossSprite: {
    width: 60,
    height: 60,
  },
  normalRaidBossOverlayHost: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  normalRaidBossDamageHost: {
    position: 'absolute',
    top: -18,
    left: -24,
    right: -24,
    bottom: -10,
    alignItems: 'center',
    overflow: 'visible',
    zIndex: 14,
  },
  raidPlayerSpriteDock: {
    position: 'absolute',
    left: 2,
    bottom: 20,
    width: 54,
    height: 68,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
    zIndex: 3,
  },
  raidPlayerSpriteDockCompact: {
    left: 0,
    bottom: 18,
    width: 46,
    height: 60,
  },
  raidPlayerSpriteImage: {
    width: '100%',
    height: '100%',
  },
  raidPlayerSpriteImageCompact: {
    width: '100%',
    height: '100%',
  },
  raidPlayerSpriteEmoji: {
    fontSize: 34,
  },
  normalRaidBossOrbHit: {
    shadowColor: '#f87171',
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  normalRaidBossEmoji: {
    fontSize: 24,
  },
  normalRaidBossHpTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#111827',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 4,
  },
  normalRaidBossHpFill: {
    height: 6,
    borderRadius: 999,
  },
  normalRaidBossHpFillHigh: {
    backgroundColor: '#22c55e',
  },
  normalRaidBossHpFillMid: {
    backgroundColor: '#f59e0b',
  },
  normalRaidBossHpFillLow: {
    backgroundColor: '#ef4444',
  },
  normalRaidBossHpText: {
    color: '#e2e8f0',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
  },
  topStatusRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 4,
  },
  topStatusRowCompact: {
    marginHorizontal: 10,
    marginBottom: 3,
  },
  statusPanel: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPanelCompact: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusPanelHp: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(59,130,246,0.5)',
  },
  statusPanelSummon: {
    backgroundColor: '#1f2937',
    borderColor: '#475569',
  },
  statusPanelSummonDisabled: {
    opacity: 0.75,
  },
  playerStatusCard: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.5)',
  },
  playerStatusCardCompact: {
    marginHorizontal: 10,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  playerStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  playerStatusText: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '700',
  },
  playerStatusBarGroup: {
    gap: 6,
  },
  playerStatusBarRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  playerHpBarBg: {
    height: 18,
    backgroundColor: '#0f172a',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.28)',
  },
  playerHpBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#38bdf8',
  },
  playerFeverBarBg: {
    height: 18,
    backgroundColor: '#24124a',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.28)',
  },
  playerFeverBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#8b5cf6',
  },
  playerFeverBarFillActive: {
    backgroundColor: '#f97316',
  },
  playerStatusBarOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerStatusBarText: {
    color: '#eff6ff',
    fontSize: 11,
    fontWeight: '900',
  },
  playerStatusBarTextActive: {
    color: '#fff7ed',
  },
  playerMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  playerMetaText: {
    color: '#bfdbfe',
    fontSize: 11,
    fontWeight: '700',
  },
  playerMetaTextActive: {
    color: '#fbbf24',
  },
  summonCard: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    gap: 8,
  },
  summonCardCompact: {
    marginHorizontal: 10,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  summonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summonTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
  },
  summonMeta: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  summonBarBg: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 999,
    overflow: 'hidden',
  },
  summonBarFill: {
    height: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 999,
  },
  summonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  summonBtn: {
    backgroundColor: '#4338ca',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  summonBtnActive: {
    backgroundColor: '#16a34a',
  },
  summonBtnDisabled: {
    backgroundColor: '#475569',
  },
  summonBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  infoBarCompact: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 2,
  },
  infoText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  nextPreviewPlaceholder: {
    height: 72,
  },
  playArea: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 0,
  },
  boardContainer: {
    position: 'relative',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingTop: 4,
    paddingBottom: 8,
  },
  boardContainerCompact: {
    paddingTop: 6,
    paddingBottom: 6,
  },
  boardSurface: {
    position: 'relative',
    alignSelf: 'center',
    // RAID_FIX: the block board is the base layer; HUD/effects sit above it.
    zIndex: 0,
    elevation: 0,
  },
  boardSkillEffectLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    elevation: 30,
  },
  boardStatusOverlay: {
    position: 'absolute',
    top: 8,
    left: 18,
    right: 18,
    zIndex: 12,
    gap: 4,
  },
  boardStatusOverlayCompact: {
    top: 6,
    left: 14,
    right: 14,
  },
  boardGaugeCard: {
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.22)',
    paddingHorizontal: 7,
    paddingVertical: 5,
    gap: 4,
  },
  boardGaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  boardGaugeLabel: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '800',
  },
  boardGaugeValue: {
    color: '#f8fafc',
    fontSize: 9,
    fontWeight: '900',
  },
  boardGaugeTrack: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.86)',
  },
  boardGaugeFill: {
    height: '100%',
    borderRadius: 999,
  },
  boardGaugeFillCombo: {
    backgroundColor: '#f59e0b',
  },
  boardGaugeFillFever: {
    backgroundColor: '#f97316',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  resultDamage: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },
  finalRankings: {
    marginTop: 20,
    width: '100%',
    maxWidth: 300,
    backgroundColor: 'rgba(30,27,75,0.8)',
    borderRadius: 12,
    padding: 16,
  },
  finalRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  finalRankNum: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '800',
    width: 24,
  },
  finalRankName: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', flex: 1 },
  finalRankNameMe: { color: '#fbbf24' },
  finalRankDmg: { color: '#f87171', fontSize: 14, fontWeight: '800' },
  exitBtn: {
    marginTop: 24,
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  exitBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  waitingText: { color: '#e2e8f0', fontSize: 18, fontWeight: '600' },
  damageFlash: {
    position: 'absolute',
    top: '25%',
    alignSelf: 'center',
    backgroundColor: 'rgba(239,68,68,0.9)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  damageFlashText: { color: '#fff', fontSize: 28, fontWeight: '900' },
  // Spectator styles
  spectatorNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 16,
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99,102,241,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: '#a5b4fc',
    fontSize: 18,
    fontWeight: '900',
  },
  spectatorLabel: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '800',
    minWidth: 100,
    textAlign: 'center',
  },
  spectatorExitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.26)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.45)',
  },
  spectatorExitBtnText: {
    color: '#fecaca',
    fontSize: 13,
    fontWeight: '800',
  },
  // Chat styles
  chatPanel: {
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  chatScroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  chatEmpty: {
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  chatRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    gap: 6,
  },
  chatNick: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '700',
  },
  chatText: {
    color: '#e2e8f0',
    fontSize: 12,
    flex: 1,
  },
  chatInputRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
    alignItems: 'center',
  },
  chatTextInput: {
    flex: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingHorizontal: 14,
    color: '#e2e8f0',
    fontSize: 13,
  },
  chatSendBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  chatSendText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  raidStatsToggle: {
    minWidth: 46,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.34)',
  },
  raidStatsToggleActive: {
    backgroundColor: 'rgba(245,158,11,0.24)',
    borderColor: 'rgba(245,158,11,0.72)',
  },
  raidStatsToggleText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '900',
  },
  raidStatsPanel: {
    position: 'absolute',
    right: 8,
    bottom: 48,
    width: '92%',
    maxHeight: 260,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.28)',
    padding: 10,
    zIndex: 50,
  },
  raidStatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  raidStatsTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  raidStatsClose: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
  },
  raidStatsTabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  raidStatsTab: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30,41,59,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
  },
  raidStatsTabActive: {
    backgroundColor: 'rgba(37,99,235,0.28)',
    borderColor: 'rgba(96,165,250,0.72)',
  },
  raidStatsTabText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '900',
  },
  raidStatsTabTextActive: {
    color: '#eff6ff',
  },
  raidStatsScroll: {
    maxHeight: 220,
  },
  raidStatsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.12)',
  },
  raidStatsNameCol: {
    width: 76,
  },
  raidStatsName: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '900',
  },
  raidStatsState: {
    marginTop: 2,
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '900',
  },
  raidStatsStateDead: {
    color: '#f87171',
  },
  raidStatsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  raidStatsCell: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
    minWidth: 62,
  },
  raidStatsGaugeCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 5,
  },
  raidStatsGaugeTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(30,41,59,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
  },
  raidStatsGaugeFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#60a5fa',
  },
  raidStatsGaugeValue: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '900',
  },
  raidClearOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    zIndex: 60,
  },
  raidClearPanel: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.38)',
    padding: 14,
  },
  raidClearTitle: {
    color: '#facc15',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  raidClearMeta: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
  raidClearBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  raidClearBadge: {
    color: '#fde68a',
    fontSize: 11,
    fontWeight: '900',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.35)',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  raidClearStats: {
    marginTop: 12,
    maxHeight: 260,
  },
  raidClearRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.12)',
  },
  raidClearName: {
    width: 78,
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '900',
  },
  raidClearValue: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
    minWidth: 58,
  },
  raidRewardSummary: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(30,41,59,0.78)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  raidRewardText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  raidRematchRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  raidClearAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  raidClearActionDisabled: {
    opacity: 0.48,
    backgroundColor: '#475569',
  },
  raidReadyActionActive: {
    backgroundColor: '#16a34a',
  },
  raidClearActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  raidClearExit: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  raidClearExitText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '900',
  },
});
