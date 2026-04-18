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
import PiecePlacementEffect from '../components/PiecePlacementEffect';
import RaidSummonOverlay from '../components/RaidSummonOverlay';
import SkillTriggerBoardEffect from '../components/SkillTriggerBoardEffect';
import SkillBar from '../components/SkillBar';
import KnightSprite from '../components/KnightSprite';
import VisualElementView, {
  buildVisualAutomationLabel,
  buildVisualElementStyle,
} from '../components/VisualElementView';
import { RaidParticipant } from '../components/RaidParticipants';
import { useDragDrop } from '../game/useDragDrop';
import { COMBO_TIMEOUT_MS, FEVER_DURATION } from '../constants';
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
  loadSkinData,
} from '../stores/gameStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { flushPlayerStateNow } from '../services/playerState';
import { submitRaidLeaderboard } from '../services/rankingService';
import { supabase } from '../services/supabase';
import {
  getRaidInstance,
  getRaidParticipants,
  dealRaidDamage,
  joinRaidInstance,
  getRaidChannel,
  expireRaidInstance,
} from '../services/raidService';
import {
  clearRaidScreenCache,
  readRaidScreenCache,
  writeRaidScreenCache,
} from '../services/raidRuntimeCache';
import { upsertCodexEntry } from '../services/codexService';
import { calculateRewards, RewardResult } from '../constants/raidRewards';
import { checkNewTitles } from '../constants/titles';
import { getSkinColors } from '../game/skinContext';
import { getSkinBoardBg, setActiveSkin } from '../game/skinContext';
import RaidRewardPopup from '../components/RaidRewardPopup';
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
  getSummonGaugeGain,
  mergeSkinPieceGenerationOptions,
} from '../game/skinSummonRuntime';
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
  loadSkillTriggerNoticeMode,
  type SkillTriggerNoticeMode,
} from '../stores/gameSettings';
import {
  pushFloatingDamageHit,
  type FloatingDamageHit,
} from '../game/floatingDamage';
import { useVisualConfig } from '../hooks/useVisualConfig';
import {
  buildVisualTintColor,
  getRaidBackgroundOverride,
  getVisualElementRule,
  type VisualViewport,
} from '../game/visualConfig';
import { useCreatorConfig } from '../hooks/useCreatorConfig';
import { resolveCreatorRaidRuntime } from '../game/creatorManifest';
import {
  buildPiecePlacementEffectCells,
  type PiecePlacementEffectCell,
} from '../game/piecePlacementEffect';
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
  const { manifest: creatorManifest, assetUris: creatorAssetUris } =
    useCreatorConfig();
  const raidScreenId = isNormalRaid ? 'raidNormal' : 'raidBoss';
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
  const [skillGauge, setSkillGauge] = useState(0);
  const [activeMultiplier, setActiveMultiplier] = useState(1);
  const [myTotalDamage, setMyTotalDamage] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [bossDefeated, setBossDefeated] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [boardLayout, setBoardLayout] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [bossDamageHits, setBossDamageHits] = useState<FloatingDamageHit[]>([]);
  const [bossImpactHit, setBossImpactHit] = useState<FloatingDamageHit | null>(
    null,
  );
  const [placementEffect, setPlacementEffect] = useState<{
    id: number;
    cells: PiecePlacementEffectCell[];
  } | null>(null);
  const [playerAttackPulse, setPlayerAttackPulse] = useState(0);
  const [bossPose, setBossPose] = useState<MonsterSpritePose>('idle');
  const [round, setRound] = useState(0);
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

  const startedAtRef = useRef(0);
  const vibrationRef = useRef(true);
  const boardRef = useRef<View>(null);
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
  const spectatorRef = useRef(false);
  const attackPowerRef = useRef(10);
  const baseAttackPowerRef = useRef(10);
  const playerHpRef = useRef(200);
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
  const summonExpEarnedRef = useRef(0);
  const skillGaugeRef = useRef(0);
  const raidSkillLevelsRef = useRef<Record<number, number>>({});
  const floatingHitIdRef = useRef(0);
  const placementEffectIdRef = useRef(0);
  const remoteBoardsRef = useRef<
    Map<string, { board: BoardType; nickname: string }>
  >(new Map());
  const alivePlayersRef = useRef<string[]>(
    cachedRaidSnapshot?.alivePlayerIds ?? [],
  );
  const participantCountRef = useRef(cachedRaidSnapshot?.participants.length ?? 0);
  const chatScrollRef = useRef<ScrollView>(null);
  const gameDataRef = useRef<GameData | null>(null);
  const playerHpAnim = useRef(new Animated.Value(1)).current;
  const skillNoticeModeRef = useRef<SkillTriggerNoticeMode>('triggered_only');
  const allowLeaveRef = useRef(false);
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
    summonGaugeRef.current = 0;
    summonGaugeRequiredRef.current = 0;
    summonAttackRef.current = 0;
    summonActiveRef.current = false;
    summonRemainingMsRef.current = 0;
    summonExpEarnedRef.current = 0;
    skillGaugeRef.current = 0;
    raidSkillLevelsRef.current = {};
    setSummonGauge(0);
    setSummonGaugeRequired(0);
    setSummonAttack(0);
    setSummonActive(false);
    setSummonRemainingMs(0);
    setSummonAttackPulse(0);
    setSummonOverlayVisible(false);
    setSummonReturning(false);
    setSummonSpawnIndex(0);
    setBossDamageHits([]);
    setBossImpactHit(null);
    setPlacementEffect(null);
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
          noticeMode,
          nextGameData,
          skinData,
          selectedCharacter,
          rawSettings,
        ] = await withTimeout(
          Promise.all([
            getPlayerId(),
            getNickname(),
            loadSkillTriggerNoticeMode(),
            loadGameData(),
            loadSkinData(),
            getSelectedCharacter(),
            AsyncStorage.getItem('gameSettings'),
          ]),
          'raid_local_bootstrap',
        );
        playerIdRef.current = playerId;
        nicknameRef.current = nickname;
        skillNoticeModeRef.current = noticeMode;
        gameDataRef.current = nextGameData;
        if (mounted && gameDataRef.current) {
          const levels = getRaidSkillLevels(nextGameData.items);
          raidSkillLevelsRef.current = levels;
          setRaidSkillLevels(levels);
        }

        setActiveSkin(skinData.activeSkinId);
        activeSkinIdRef.current = skinData.activeSkinId;
        const skinLoadout = getActiveSkinLoadout(skinData);
        summonGaugeRequiredRef.current = skinLoadout.summonGaugeRequired;
        summonAttackRef.current = skinLoadout.summonAttack;
        summonRemainingMsRef.current = skinLoadout.summonDurationMs;
        if (mounted) {
          setSkinBoardBg(getSkinBoardBg());
          setSummonGaugeRequired(skinLoadout.summonGaugeRequired);
          setSummonAttack(skinLoadout.summonAttack);
          setSummonRemainingMs(skinLoadout.summonDurationMs);
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
          ),
          'raid_join',
        ).catch(error => ({ data: null, error }));

        if (selectedCharacter) {
          const characterData = await withTimeout(
            loadCharacterData(selectedCharacter),
            'raid_character_data',
          );
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
        }

        try {
          if (rawSettings) {
            const parsed = JSON.parse(rawSettings);
            if (parsed.vibration === false) {
              vibrationRef.current = false;
            }
          }
        } catch {}

        const skinColors = getSkinColors();
        const difficulty = getDifficulty(Math.min(bossStage, 10));
        const p = generatePlaceablePieces(
          createBoard(),
          difficulty,
          skinColors,
          getCurrentPieceOptions(),
        );
        if (mounted) {
          setPieces(p);
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
          startedAtRef.current = new Date(instance.started_at).getTime();
          const expTs = new Date(instance.expires_at).getTime();
          setExpiresAt(expTs);

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
              return updated.map((entry, index) => ({
                ...entry,
                rank: index + 1,
              }));
            });
            if (payload.defeated) {
              setBossDefeated(true);
              setGameOver(true);
              gameOverRef.current = true;
              setSpectatorMode(false);
              spectatorRef.current = false;
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
          .on('broadcast', { event: 'heartbeat' }, () => {})
          // NEW: player_dead - someone's board filled
          .on('broadcast', { event: 'player_dead' }, ({ payload }: any) => {
            if (!mounted || !payload) return;
            setAlivePlayers(prev => {
              const next = prev.filter(id => id !== payload.playerId);
              alivePlayersRef.current = next;
              // If no alive players left (excluding self who is already dead/spectating)
              if (next.length === 0 && spectatorRef.current) {
                setGameOver(true);
                gameOverRef.current = true;
                setSpectatorMode(false);
                spectatorRef.current = false;
              }
              return next;
            });
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
          channel.send({
            type: 'broadcast',
            event: 'heartbeat',
            payload: { playerId: playerIdRef.current },
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
            const partList = parts.map((participant: any, index: number) => ({
              playerId: participant.player_id,
              nickname: participant.nickname,
              totalDamage: participant.total_damage,
              rank: index + 1,
            }));
            setParticipants(partList);
            participantCountRef.current = partList.length;
            const aliveIds = partList.map(entry => entry.playerId);
            setAlivePlayers(aliveIds);
            alivePlayersRef.current = aliveIds;
            writeRaidScreenCache(instanceId, {
              bossHp: bossHpRef.current,
              expiresAt: new Date(instance.expires_at).getTime(),
              participants: partList,
              alivePlayerIds: aliveIds,
            });
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
    };
  }, [
    bossStage,
    getCurrentPieceOptions,
    getRaidEffects,
    instanceId,
    isNormalRaid,
    navigation,
    playerHpAnim,
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
    }, 80);

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
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, summonActive, summonRemainingMs]);

  useEffect(() => {
    if (!gameOver && !bossDefeated && !spectatorMode) {
      return;
    }

    summonActiveRef.current = false;
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

      playerHpRef.current = healedHp;
      setPlayerHp(healedHp);
      animatePlayerHpBar(healedHp / maxHp);
      showSkillTriggerNotice('auto_heal');
    }, effects.autoHealIntervalMs);

    return () => clearInterval(timer);
  }, [
    animatePlayerHpBar,
    bossDefeated,
    gameOver,
    getRaidEffects,
    showSkillTriggerNotice,
    spectatorMode,
  ]);

  // Enter spectator mode helper
  const enterSpectator = useCallback(() => {
    spectatorRef.current = true;
    setSpectatorMode(true);

    // Broadcast that we died
    channelRef.current?.send({
      type: 'broadcast',
      event: 'player_dead',
      payload: { playerId: playerIdRef.current, nickname: nicknameRef.current },
    });

    // Remove self from alive
    setAlivePlayers(prev => {
      const next = prev.filter(id => id !== playerIdRef.current);
      alivePlayersRef.current = next;
      // If nobody else alive, game over
      if (next.length === 0) {
        setGameOver(true);
        gameOverRef.current = true;
        setSpectatorMode(false);
        spectatorRef.current = false;
      } else {
        // Start spectating first alive player
        setSpectatingIdx(0);
        const data = remoteBoardsRef.current.get(next[0]);
        if (data) {
          setSpectatorBoard(data.board);
          setSpectatorNickname(data.nickname);
        } else {
          setSpectatorNickname(next[0].slice(0, 8) + '...');
        }
      }
      return next;
    });
  }, []);

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
      setGameOver(true);
      gameOverRef.current = true;
      return;
    }

    enterSpectator();
  }, [
    animatePlayerHpBar,
    bossAttackStats.attack,
    bossDefeated,
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

      let newBoard = placePiece(board, piece, row, col);
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
      while (true) {
        const r = checkAndClearLines(newBoard);
        const cl = r.clearedRows.length + r.clearedCols.length;
        if (cl === 0) break;
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
      newBoard = boardSkillResult.board;
      totalLinesCleared += boardSkillResult.extraLinesCleared;
      totalGemsFound += boardSkillResult.gemsFound;
      totalItemsFound.push(...boardSkillResult.itemsFound);

      const blocksFromLines = totalLinesCleared * 8;
      const totalBroken = blockCount + blocksFromLines;
      const gaugeBeforeTurn = skillGaugeRef.current;

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
      if (turnResult.didClear) {
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
      const summonBonus =
        summonActiveRef.current && summonRemainingMsRef.current > 0
          ? summonAttackRef.current
          : 0;
      const raidSkillDamageMultiplier = skillSpend.consumed
        ? 1 + effects.raidActiveSkillDamageBonus
        : 1;
      const finalDamage = Math.round(
        (skinDamage + summonBonus) *
          effectiveMultiplier *
          raidSkillDamageMultiplier,
      );
      if (summonBonus > 0) {
        summonExpEarnedRef.current += Math.max(1, Math.round(summonBonus / 8));
        setSummonAttackPulse(prev => prev + 1);
      }

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
        playerHpRef.current = healedHp;
        setPlayerHp(healedHp);
        animatePlayerHpBar(healedHp / maxHp);
        showSkillTriggerNotice('place_heal');
      }

      setMyTotalDamage(prev => prev + finalDamage);
      if (
        activeSkinIdRef.current > 0 &&
        summonGaugeRequiredRef.current > 0 &&
        !summonActiveRef.current
      ) {
        const nextGauge = Math.min(
          summonGaugeRequiredRef.current,
          summonGaugeRef.current +
            getSummonGaugeGain(
              activeSkinIdRef.current,
              blockCount,
              totalLinesCleared,
            ),
        );
        summonGaugeRef.current = nextGauge;
        setSummonGauge(nextGauge);
      }
      dealRaidDamage(
        instanceId,
        playerIdRef.current,
        finalDamage,
        totalBroken,
      ).then(result => {
        if (result.data) {
          setBossHp(result.data.newHp);
          bossHpRef.current = result.data.newHp;
          channelRef.current?.send({
            type: 'broadcast',
            event: 'damage',
            payload: {
              playerId: playerIdRef.current,
              nickname: nicknameRef.current,
              damage: finalDamage,
              newBossHp: result.data.newHp,
              defeated: result.data.defeated,
            },
          });
          if (result.data.defeated) {
            setBossDefeated(true);
            setGameOver(true);
            gameOverRef.current = true;
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
        return updated.map((p, i) => ({ ...p, rank: i + 1 }));
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
        const difficulty = getDifficulty(
          Math.min(bossStage + Math.floor(nextRound / 5), 10),
        );
        const fresh = generatePlaceablePieces(
          newBoard,
          difficulty,
          getSkinColors(),
          getCurrentPieceOptions(),
        );
        newPieces[0] = fresh[0];
        newPieces[1] = fresh[1];
        newPieces[2] = fresh[2];
        setRound(nextRound);
      }
      setPieces(newPieces);

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
      board,
      bossStage,
      enterSpectator,
      getRaidEffects,
      instanceId,
      pieces,
      resetComboTimer,
      round,
      showPlacementEffect,
      animatePlayerHpBar,
      getCurrentPieceOptions,
      showSkillTriggerNotice,
      triggerBossPose,
    ],
  );

  const dragDrop = useDragDrop(
    board,
    pieces,
    boardLayout,
    handlePlace,
    true,
    1,
    visualViewport,
  );

  const handleBoardLayout = useCallback(() => {
    setTimeout(() => {
      boardRef.current?.measureInWindow((x: number, y: number) => {
        setBoardLayout({ x, y });
      });
    }, 100);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      boardRef.current?.measureInWindow((x: number, y: number) => {
        setBoardLayout({ x, y });
      });
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
      summonGaugeRef.current = 0;
      setSummonGauge(0);
      setSummonSpawnIndex(Math.floor(Math.random() * SUMMON_SPAWN_POINTS));
      setSummonReturning(false);
      setSummonOverlayVisible(true);
      summonActiveRef.current = true;
      setSummonActive(true);
      return;
    }

    summonActiveRef.current = false;
    setSummonActive(false);
    setSummonReturning(true);
  }, []);

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

  const leaveRaidToLobby = useCallback(() => {
    allowLeaveRef.current = true;
    navigation.replace('RaidLobby');
  }, [navigation]);

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
              allowLeaveRef.current = true;
              onConfirm();
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
      const sorted = finalParts.sort(
        (a: any, b: any) => b.total_damage - a.total_damage,
      );
      const idx = sorted.findIndex(
        (p: any) => p.player_id === playerIdRef.current,
      );
      if (idx >= 0) myRank = idx + 1;
      setParticipants(
        sorted.map((p: any, i: number) => ({
          playerId: p.player_id,
          nickname: p.nickname,
          totalDamage: p.total_damage,
          rank: i + 1,
        })),
      );
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

  const handleCollectReward = async () => {
    if (!rewardData || rewardCollected) return;
    setRewardCollected(true);
    let data = await loadGameData();

    if (isNormalRaid) {
      const progress = await loadNormalRaidProgress();
      const preview = getNormalRaidRewardPreview(bossStage, progress);
      const updatedProgress = await recordNormalRaidKill(progress, bossStage);
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
    if (activeSkinIdRef.current > 0 && summonExpEarnedRef.current > 0) {
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
    leaveRaidToLobby();
  };

  const getResultText = () => {
    if (bossDefeated) return t('raid.defeated');
    if (timeExpired || failureReason === 'time_up') return t('raid.timeUp');
    if (failureReason === 'hp_zero') return t('raid.hpDepleted');
    return t('raid.boardFull');
  };

  const bossSpriteSet = getRaidBossSpriteSet(bossStage);
  const bossSprite =
    getMonsterPoseSource(bossSpriteSet, bossPose) ??
    getMonsterPoseSource(bossSpriteSet, 'idle');
  const summonSpriteSet = getRaidSummonSpriteSet(bossStage);
  useEffect(() => {
    setBossPose('idle');
  }, [bossStage]);
  const hasSummon = activeSkinIdRef.current > 0 && summonGaugeRequired > 0;
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

        if (selectedCharacterRef.current === 'knight') {
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
            <Text style={styles.raidPlayerSpriteEmoji}>
              {myRaidVisual.emoji}
            </Text>
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
              ? `${summonSpriteSet?.name ?? 'Summon'} · 공격 ${summonAttack}`
              : '미장착'}
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
                } · ${Math.ceil(summonRemainingMs / 1000)}초`
              : '활성 스킨 없음'}
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
  );
  const renderBoardStatusDock = (compact: boolean) => {
    if (!raidComboGaugeRule.visible) {
      return null;
    }

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
        style={buildVisualElementStyle(
          raidComboGaugeRule,
          visualViewport,
          visualManifest.referenceViewport,
        )}
      />
    );

    const showComboGauge = combo > 0 && comboRemainingMs > 0;
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
        {false && (
          <View pointerEvents="none" style={styles.normalRaidTimerCover}>
            <Text style={styles.normalRaidTimerCoverText}>일반 레이드</Text>
          </View>
        )}
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
              activeDamageHit={bossImpactHit}
              onClearActiveDamageHit={hitId =>
                setBossImpactHit(current =>
                  current?.id === hitId ? null : current,
                )
              }
              overlay={renderSummonOverlay(false)}
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
                onPress={handleSendChat}
                style={styles.chatSendBtn}
              >
                <Text style={styles.chatSendText}>전송</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.playArea}>
          <VisualElementView
            screenId={raidScreenId}
            elementId="board"
            style={styles.visualWrapper}
          >
            <View
              style={[
                styles.boardContainer,
                isNormalRaid && styles.boardContainerCompact,
                { minHeight: raidBoardMetrics.boardSize + 18 },
              ]}
              onLayout={handleBoardLayout}
            >
              {renderBoardStatusDock(isNormalRaid)}
              <Board
                ref={boardRef}
                board={board}
                viewport={visualViewport}
                backgroundColor={skinBoardBg}
                compact
                previewCells={dragDrop.previewCells}
                invalidPreview={dragDrop.invalidPreview}
                clearGuideCells={dragDrop.clearGuideCells}
              />
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
            </View>
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
              viewport={visualViewport}
            />
          </VisualElementView>
        </View>
      )}

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

      <BattleNoticeOverlay
        message={battleNoticeMessage}
        messageKey={battleNoticeKey}
        bottom={156}
      />

      {/* Boss defeated - reward popup */}
      {bossDefeated && rewardData && !rewardCollected && (
        <RaidRewardPopup
          reward={rewardData}
          bossName={bossName}
          onCollect={handleCollectReward}
        />
      )}

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
});
