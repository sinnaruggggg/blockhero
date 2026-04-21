import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  Image,
  ImageBackground,
  Alert,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { t } from '../i18n';
import { flushPlayerStateNow } from '../services/playerState';
import { getAdminStatus } from '../services/adminSync';
import { submitLevelLeaderboard } from '../services/rankingService';
import BackImageButton from '../components/BackImageButton';
import BattleNoticeOverlay from '../components/BattleNoticeOverlay';
import FloatingDamageLabel from '../components/FloatingDamageLabel';
import ComboGaugeOverlay from '../components/ComboGaugeOverlay';
import BoardSkillCastEffect, {
  type BoardSkillCastEffectEvent,
} from '../components/BoardSkillCastEffect';
import PiecePlacementEffect from '../components/PiecePlacementEffect';
import SkillTriggerBoardEffect from '../components/SkillTriggerBoardEffect';
import VisualElementView, {
  buildVisualAutomationLabel,
  buildVisualElementStyle,
} from '../components/VisualElementView';
import { useVisualConfig } from '../hooks/useVisualConfig';
import { useCreatorConfig } from '../hooks/useCreatorConfig';
import {
  buildVisualTintColor,
  getLevelBackgroundOverride,
  getVisualElementRule,
  type VisualViewport,
} from '../game/visualConfig';
import { scaleGameplayUnit } from '../game/layoutScale';
import { resolveCreatorLevelRuntime } from '../game/creatorManifest';
import Board from '../components/Board';
import PieceSelector from '../components/PieceSelector';
import ItemBar from '../components/ItemBar';
import NextPiecePreview from '../components/NextPiecePreview';
import KnightSprite from '../components/KnightSprite';
import { useDragDrop } from '../game/useDragDrop';
import { LEVELS, COMBO_TIMEOUT_MS, FEVER_DURATION } from '../constants';
import {
  createBoard,
  generatePlaceablePieces,
  placePiece,
  checkAndClearLines,
  countBlocks,
  canPlaceAnyPiece,
  addObstacles,
  resetPieceGenerationHistory,
  Piece,
  Board as BoardType,
} from '../game/engine';
import {
  adjustEnemyAttackValue,
  getAdjustedLevelMonsterHp,
  getLevelEnemyStats,
} from '../game/battleBalance';
import { resolveCombatTurn } from '../game/combatFlow';
import {
  adjustCharacterXpReward,
  getLevelClearRewards,
} from '../game/levelProgress';
import {
  applyCombatDamageEffectsDetailed,
  applyRewardMultipliers,
  getCharacterSkillEffects,
  getPieceGenerationOptions,
  shouldDodgeAttack,
} from '../game/characterSkillEffects';
import {
  loadGameData,
  loadLevelProgress,
  saveLevelProgress,
  loadDailyStats,
  updateDailyStats,
  addGold,
  useItem as consumeItem,
  useHeart as consumeHeart,
  loadCharacterData,
  addCharacterXP,
  collectSpecialBlockRewards,
  GameData,
  getSelectedCharacter,
  getLevelModeBreakthroughState,
  getUnlockedSpecialPieceShapeIndices,
  gainSummonExp,
  loadSkinData,
  recordLevelModeBreakthroughSuccess,
  resetLevelModeBreakthrough,
} from '../stores/gameStore';
import {
  getCharacterAtk,
  getCharacterHp,
  xpToNextLevel,
} from '../constants/characters';
import {
  getSkinBoardBg,
  getSkinColors,
  setActiveSkin,
} from '../game/skinContext';
import {
  applySkinCombatDamage,
  applySkinIncomingDamage,
  applySkinRewardBonuses,
  getActiveSkinLoadout,
  getSummonGaugeGain,
  mergeSkinPieceGenerationOptions,
} from '../game/skinSummonRuntime';
import {
  getMonsterPoseSource,
  getWorldMonsterSpriteSet,
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
import {
  buildBoardCellEffectCells,
  buildPiecePlacementEffectCells,
  type PiecePlacementEffectCell,
} from '../game/piecePlacementEffect';
import { type MeasuredBoardLayout } from '../game/boardScreenMetrics';
import { applySkillBoardEffects } from '../game/skillBoardEffects';
import {
  ActiveItemKey,
  LEVEL_LOADOUT_ITEM_KEYS,
  createDefaultStartingItemLoadout,
  getItemDefinition,
  resolveStartingItemLoadout,
  type StartingItemLoadoutSlot,
} from '../constants/itemCatalog';

type FailureReason = 'board_full' | 'hp_zero';

type VictoryState = {
  characterId: string;
  rewardGold: number;
  rewardDiamonds: number;
  rewardXp: number;
  fromLevel: number;
  toLevel: number;
  fromXp: number;
  toXp: number;
};

type DefeatState = {
  characterId: string;
  reason: FailureReason;
  remainingMonsterHp: number;
  totalDamage: number;
  maxCombo: number;
};

function getLevelPieceDifficulty(world: number): 'easy' | 'medium' | 'hard' {
  if (world <= 3) {
    return 'easy';
  }
  if (world <= 7) {
    return 'medium';
  }
  return 'hard';
}

function calculateVictoryStars(
  remainingHp: number,
  maxHp: number,
  usedBattleItem: boolean,
): number {
  const hpRatio = remainingHp / Math.max(1, maxHp);
  if (hpRatio >= 0.7 && !usedBattleItem) {
    return 3;
  }
  if (hpRatio >= 0.4) {
    return 2;
  }
  return 1;
}

const CHARACTER_VISUALS: Record<string, { name: string; emoji: string }> = {
  knight: { name: '기사', emoji: '🛡️' },
  mage: { name: '매지션', emoji: '🔮' },
  archer: { name: '궁수', emoji: '🏹' },
  rogue: { name: '도적', emoji: '🗡️' },
  healer: { name: '힐러', emoji: '✨' },
};

const LEVEL_UP_BURST_POINTS = [
  { x: -94, y: -58, color: '#f59e0b' },
  { x: -76, y: -112, color: '#fb7185' },
  { x: -34, y: -86, color: '#38bdf8' },
  { x: 0, y: -128, color: '#facc15' },
  { x: 36, y: -90, color: '#c084fc' },
  { x: 78, y: -112, color: '#22c55e' },
  { x: 96, y: -52, color: '#fb7185' },
  { x: -112, y: 4, color: '#f97316' },
  { x: 112, y: 0, color: '#f59e0b' },
  { x: -88, y: 72, color: '#38bdf8' },
  { x: -30, y: 98, color: '#facc15' },
  { x: 28, y: 104, color: '#c084fc' },
  { x: 84, y: 70, color: '#22c55e' },
];

const COMBO_PARTICLE_POINTS = [
  { x: -92, y: -30, color: '#f59e0b' },
  { x: -74, y: -94, color: '#fb7185' },
  { x: -20, y: -118, color: '#38bdf8' },
  { x: 26, y: -110, color: '#facc15' },
  { x: 76, y: -86, color: '#a78bfa' },
  { x: 98, y: -24, color: '#22c55e' },
  { x: 94, y: 34, color: '#fb7185' },
  { x: 56, y: 88, color: '#f59e0b' },
  { x: 0, y: 110, color: '#38bdf8' },
  { x: -56, y: 90, color: '#facc15' },
  { x: -98, y: 34, color: '#c084fc' },
  { x: -106, y: -2, color: '#22c55e' },
];

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

const WORLD_BACKGROUND_IMAGES: Partial<Record<number, any>> = {
  1: require('../assets/ui/grassland_bg.jpg'),
};

const CHARACTER_PORTRAITS: Partial<Record<string, any>> = {
  knight: require('../assets/ui/hero_knight.png'),
  mage: require('../assets/ui/hero_mage.png'),
};

const WORLD_BACKGROUND_TINTS: Record<number, string> = {
  1: 'rgba(6, 16, 14, 0.62)',
  2: 'rgba(39, 22, 7, 0.66)',
  3: 'rgba(8, 20, 36, 0.66)',
  4: 'rgba(5, 20, 34, 0.68)',
  5: 'rgba(11, 27, 12, 0.68)',
  6: 'rgba(35, 23, 10, 0.7)',
  7: 'rgba(18, 11, 34, 0.72)',
  8: 'rgba(8, 25, 36, 0.68)',
  9: 'rgba(10, 19, 31, 0.72)',
  10: 'rgba(34, 10, 10, 0.72)',
};

function HitEffect({ damage, onDone }: { damage: number; onDone: () => void }) {
  const [frame, setFrame] = useState(0);
  const scale = Math.min(2.2, 1 + Math.floor(damage / 12) * 0.08);
  const size = 88 * scale;
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
        styles.hitEffect,
        {
          width: size,
          height: size,
          top: -(size - 58) / 2,
          left: -(size - 58) / 2,
          transform: [{ rotate: `${rotation}deg` }, { scaleX: flipX ? -1 : 1 }],
        },
      ]}
    />
  );
}

function DamageFlash({
  damage,
  onDone,
}: {
  damage: number;
  onDone: () => void;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -6,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -18,
          duration: 820,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]).start(onDone);
  }, [onDone, opacity, translateY]);

  return (
    <Animated.View
      style={[styles.damageFlash, { opacity, transform: [{ translateY }] }]}
    >
      <Text style={styles.damageFlashText}>-{damage}</Text>
    </Animated.View>
  );
}

export default function SingleGameScreen({ route, navigation }: any) {
  const windowDimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const visualViewport: VisualViewport = {
    width: windowDimensions.width,
    height: windowDimensions.height,
    safeTop: insets.top,
    safeBottom: insets.bottom,
  };
  const modeVerticalGutter = scaleGameplayUnit(46, visualViewport, 16);
  const { levelId } = route.params;
  const levelData = LEVELS.find(l => l.id === levelId);
  const activeLevel = levelData ?? LEVELS[0];
  const { manifest: visualManifest, assetUris: visualAssetUris } =
    useVisualConfig();
  const { manifest: creatorManifest, assetUris: creatorAssetUris } =
    useCreatorConfig();
  const creatorLevelRuntime = resolveCreatorLevelRuntime(
    creatorManifest,
    levelId,
  );
  const activeWorldId = creatorLevelRuntime?.worldId ?? activeLevel.world;
  const activeLevelName = creatorLevelRuntime?.name ?? activeLevel.name;
  const activeObstacles = activeLevel.obstacles;
  const monster = creatorLevelRuntime
    ? {
        monsterHp: creatorLevelRuntime.monsterHp,
        monsterName: creatorLevelRuntime.monsterName,
        monsterEmoji: creatorLevelRuntime.monsterEmoji,
        monsterColor: creatorLevelRuntime.monsterColor,
      }
    : activeLevel.goal;
  const maxMonsterHp = getAdjustedLevelMonsterHp(
    monster.monsterHp,
    activeWorldId,
  );
  const enemyStats = creatorLevelRuntime
    ? {
        attack: adjustEnemyAttackValue(creatorLevelRuntime.enemyAttack),
        attackIntervalMs: creatorLevelRuntime.attackIntervalMs,
        tier: creatorLevelRuntime.enemyTier,
      }
    : getLevelEnemyStats(levelId, activeWorldId);

  const [board, setBoard] = useState<BoardType>(createBoard());
  const [pieces, setPieces] = useState<(Piece | null)[]>([]);
  const [monsterHp, setMonsterHp] = useState(maxMonsterHp);
  const [playerHp, setPlayerHp] = useState(200);
  const [maxPlayerHp, setMaxPlayerHp] = useState(200);
  const [combo, setCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [runItemLoadout, setRunItemLoadout] = useState<StartingItemLoadoutSlot[]>(
    createDefaultStartingItemLoadout(),
  );
  const [attackPower, setAttackPower] = useState(10);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [boardLayout, setBoardLayout] = useState<MeasuredBoardLayout | null>(
    null,
  );
  const [feverActive, setFeverActive] = useState(false);
  const [feverGauge, setFeverGauge] = useState(0);
  const [skinBoardBg, setSkinBoardBg] = useState(getSkinBoardBg());
  const [summonGauge, setSummonGauge] = useState(0);
  const [summonGaugeRequired, setSummonGaugeRequired] = useState(0);
  const [summonAttack, setSummonAttack] = useState(0);
  const [summonActive, setSummonActive] = useState(false);
  const [summonRemainingMs, setSummonRemainingMs] = useState(0);
  const [nextPieces, setNextPieces] = useState<Piece[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] =
    useState<string>('knight');
  const [characterVisualTunings, setCharacterVisualTunings] = useState(
    getCachedCharacterVisualTunings(),
  );
  const [comboRemainingMs, setComboRemainingMs] = useState(0);
  const [levelUpState, setLevelUpState] = useState<{
    fromLevel: number;
    toLevel: number;
    skillPointsGained: number;
  } | null>(null);
  const [comboBurstValue, setComboBurstValue] = useState(0);
  const [monsterHits, setMonsterHits] = useState<FloatingDamageHit[]>([]);
  const [monsterImpactHit, setMonsterImpactHit] =
    useState<FloatingDamageHit | null>(null);
  const [placementEffect, setPlacementEffect] = useState<{
    id: number;
    cells: PiecePlacementEffectCell[];
  } | null>(null);
  const [boardSkillCastEffect, setBoardSkillCastEffect] = useState<
    BoardSkillCastEffectEvent[] | null
  >(null);
  const [playerHit, setPlayerHit] = useState<{
    id: number;
    damage: number;
  } | null>(null);
  const [playerAttackPulse, setPlayerAttackPulse] = useState(0);
  const [monsterPose, setMonsterPose] = useState<MonsterSpritePose>('idle');
  const [victoryState, setVictoryState] = useState<VictoryState | null>(null);
  const [defeatState, setDefeatState] = useState<DefeatState | null>(null);
  const [victoryDisplayedLevel, setVictoryDisplayedLevel] = useState(1);
  const [victoryDisplayedXpCurrent, setVictoryDisplayedXpCurrent] = useState(0);
  const [victoryDisplayedXpMax, setVictoryDisplayedXpMax] = useState(1);
  const [victoryReady, setVictoryReady] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const boardRef = useRef<View>(null);
  const floatingHitIdRef = useRef(0);
  const placementEffectIdRef = useRef(0);
  const boardSkillEffectIdRef = useRef(0);
  const gameDataRef = useRef<GameData | null>(null);
  const maxComboRef = useRef(0);
  const monsterHpRef = useRef(maxMonsterHp);
  const playerHpRef = useRef(200);
  const totalDamageRef = useRef(0);
  const linesClearedRef = useRef(0);
  const gameOverRef = useRef(false);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enemyAttackRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const monsterPoseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const comboRef = useRef(0);
  const comboExpireAtRef = useRef<number | null>(null);
  const feverActiveRef = useRef(false);
  const feverGaugeRef = useRef(0);
  const skillEffectsRef = useRef(getCharacterSkillEffects(null, null));
  const clearEventCounterRef = useRef(0);
  const twoLineCounterRef = useRef(0);
  const reviveUsedRef = useRef(false);
  const smallPieceStreakRef = useRef(0);
  const lastPlacementAtRef = useRef<number | null>(null);
  const damageReductionBuffUntilRef = useRef(0);
  const activeSkinIdRef = useRef(0);
  const summonGaugeRef = useRef(0);
  const summonGaugeRequiredRef = useRef(0);
  const summonAttackRef = useRef(0);
  const summonActiveRef = useRef(false);
  const summonRemainingMsRef = useRef(0);
  const summonExpEarnedRef = useRef(0);
  const diamondsEarnedRef = useRef(0);
  const nextPiecesRef = useRef<Piece[]>([]);
  const usedBattleItemRef = useRef(false);
  const baseAttackPowerRef = useRef(10);
  const powerItemMultiplierRef = useRef(1);
  const isAdminRef = useRef(false);
  const monsterHpAnim = useRef(new Animated.Value(1)).current;
  const playerHpAnim = useRef(new Animated.Value(1)).current;
  const levelUpAnim = useRef(new Animated.Value(0)).current;
  const comboBurstAnim = useRef(new Animated.Value(0)).current;
  const screenShakeX = useRef(new Animated.Value(0)).current;
  const screenShakeY = useRef(new Animated.Value(0)).current;
  const victoryXpAnim = useRef(new Animated.Value(0)).current;
  const playerAvatarShakeX = useRef(new Animated.Value(0)).current;
  const monsterAvatarShakeX = useRef(new Animated.Value(0)).current;
  const startedAtRef = useRef(Date.now());
  const levelPieceDifficulty = getLevelPieceDifficulty(activeWorldId);
  const skillNoticeModeRef = useRef<SkillTriggerNoticeMode>('triggered_only');
  const {
    message: battleNoticeMessage,
    messageKey: battleNoticeKey,
    showNotice: showBattleNotice,
    clearNotice,
  } = useBattleNotice(3000);
  const {
    message: skillEffectMessage,
    messageKey: skillEffectMessageKey,
    showNotice: showSkillEffect,
  } = useBattleNotice(1600);

  const updateAttackPowerWithPotion = useCallback((baseAttack: number) => {
    baseAttackPowerRef.current = baseAttack;
    setAttackPower(
      Math.max(1, Math.round(baseAttack * powerItemMultiplierRef.current)),
    );
  }, []);

  const buildRunItemLoadout = useCallback(
    (data: GameData | null) =>
      resolveStartingItemLoadout(
        data?.items ?? {},
        data?.startingItemLoadout,
        LEVEL_LOADOUT_ITEM_KEYS,
      ).map(slot => ({
        itemKey: slot.itemKey,
        count: slot.effectiveCount,
      })),
    [],
  );

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

  const queueMonsterHit = useCallback((damage: number) => {
    floatingHitIdRef.current += 1;
    const hitId = floatingHitIdRef.current;
    const nextHit = { id: hitId, damage };
    setMonsterHits(current => pushFloatingDamageHit(current, hitId, damage));
    setMonsterImpactHit(nextHit);
  }, []);

  const getCurrentPieceOptions = useCallback(
    () => ({
      ...mergeSkinPieceGenerationOptions(
        getPieceGenerationOptions(skillEffectsRef.current),
        activeSkinIdRef.current,
      ),
      rewardMode: 'level' as const,
      unlockedSpecialShapeIndices: getUnlockedSpecialPieceShapeIndices(
        gameDataRef.current,
      ),
    }),
    [],
  );

  const triggerMonsterPose = useCallback(
    (pose: MonsterSpritePose, duration = 220) => {
      if (monsterPoseTimerRef.current) {
        clearTimeout(monsterPoseTimerRef.current);
      }
      setMonsterPose(pose);
      monsterPoseTimerRef.current = setTimeout(() => {
        setMonsterPose('idle');
        monsterPoseTimerRef.current = null;
      }, duration);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (monsterPoseTimerRef.current) {
        clearTimeout(monsterPoseTimerRef.current);
      }
    };
  }, []);

  const updateNextPieces = useCallback((piecesToPreview: Piece[]) => {
    nextPiecesRef.current = piecesToPreview;
    setNextPieces(piecesToPreview);
  }, []);

  const buildPiecePack = useCallback(
    (targetBoard: BoardType) =>
      generatePlaceablePieces(
        targetBoard,
        levelPieceDifficulty,
        getSkinColors(),
        getCurrentPieceOptions(),
      ),
    [getCurrentPieceOptions, levelPieceDifficulty],
  );

  const isPiecePackPlaceable = useCallback(
    (targetBoard: BoardType, pack: Piece[]) =>
      pack.length === 3 &&
      pack.every(piece => canPlaceAnyPiece(targetBoard, [piece])),
    [],
  );

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
        false,
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

      const events = animations
        .map(animation => {
          const cells = buildBoardCellEffectCells(
            boardLayout,
            animation.cells,
            false,
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
        setBoardSkillCastEffect(events);
      }
    },
    [boardLayout, visualViewport],
  );

  useEffect(() => {
    let mounted = true;
    startedAtRef.current = Date.now();
    resetPieceGenerationHistory();
    gameOverRef.current = false;
    monsterHpRef.current = maxMonsterHp;
    playerHpRef.current = 200;
    totalDamageRef.current = 0;
    linesClearedRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    clearEventCounterRef.current = 0;
    twoLineCounterRef.current = 0;
    reviveUsedRef.current = false;
    smallPieceStreakRef.current = 0;
    lastPlacementAtRef.current = null;
    damageReductionBuffUntilRef.current = 0;
    skillEffectsRef.current = getCharacterSkillEffects(null, null);
    activeSkinIdRef.current = 0;
    summonGaugeRef.current = 0;
    summonGaugeRequiredRef.current = 0;
    summonAttackRef.current = 0;
    summonActiveRef.current = false;
    summonRemainingMsRef.current = 0;
    summonExpEarnedRef.current = 0;
    diamondsEarnedRef.current = 0;
    gameDataRef.current = null;
    usedBattleItemRef.current = false;
    powerItemMultiplierRef.current = 1;
    baseAttackPowerRef.current = 10;

    setMonsterHp(maxMonsterHp);
    setPlayerHp(200);
    setMaxPlayerHp(200);
    updateAttackPowerWithPotion(10);
    setCombo(0);
    setGameOver(false);
    setSelectedItem(null);
    setRunItemLoadout(createDefaultStartingItemLoadout());
    setFeverActive(false);
    setFeverGauge(0);
    setSummonGauge(0);
    setSummonGaugeRequired(0);
    setSummonAttack(0);
    setSummonActive(false);
    setSummonRemainingMs(0);
    setComboRemainingMs(0);
    setLevelUpState(null);
    setComboBurstValue(0);
    setMonsterHits([]);
    setMonsterImpactHit(null);
    setPlacementEffect(null);
    setPlayerHit(null);
    setVictoryState(null);
    setDefeatState(null);
    setVictoryDisplayedLevel(1);
    setVictoryDisplayedXpCurrent(0);
    setVictoryDisplayedXpMax(1);
    setVictoryReady(false);
    clearNotice();
    setShowExitConfirm(false);
    updateNextPieces([]);

    monsterHpAnim.setValue(1);
    playerHpAnim.setValue(1);
    feverActiveRef.current = false;
    feverGaugeRef.current = 0;

    let nextBoard = createBoard();
    if (activeObstacles) {
      nextBoard = addObstacles(nextBoard, activeObstacles);
    }
    setBoard(nextBoard);

    (async () => {
      try {
        const [loadedGameData, skinData, charId, noticeMode, isAdmin] =
          await Promise.all([
            loadGameData(),
            loadSkinData(),
            getSelectedCharacter(),
            loadSkillTriggerNoticeMode(),
            getAdminStatus().catch(() => false),
          ]);

        if (!mounted) {
          return;
        }

        gameDataRef.current = loadedGameData;
        isAdminRef.current = isAdmin;
        skillNoticeModeRef.current = noticeMode;
        setGameData(loadedGameData);
        setRunItemLoadout(buildRunItemLoadout(loadedGameData));
        setActiveSkin(skinData.activeSkinId);
        setSkinBoardBg(getSkinBoardBg());

        const skinLoadout = getActiveSkinLoadout(skinData);
        activeSkinIdRef.current = skinLoadout.skinId;
        summonGaugeRequiredRef.current = skinLoadout.summonGaugeRequired;
        summonAttackRef.current = skinLoadout.summonAttack;
        summonRemainingMsRef.current = skinLoadout.summonDurationMs;
        setSummonGaugeRequired(skinLoadout.summonGaugeRequired);
        setSummonAttack(skinLoadout.summonAttack);
        setSummonRemainingMs(skinLoadout.summonDurationMs);
        const levelModeBreakthroughState =
          getLevelModeBreakthroughState(loadedGameData);
        const levelModeBreakthroughCount =
          levelModeBreakthroughState &&
          levelModeBreakthroughState.nextLevelId === levelId
            ? levelModeBreakthroughState.consecutiveClears
            : 0;

        let pieceOptions = getCurrentPieceOptions();

        if (!charId) {
          setSelectedCharacterId('knight');
        } else {
          setSelectedCharacterId(charId);

          const charData = await loadCharacterData(charId);
          if (!mounted) {
            return;
          }

          const effects = getCharacterSkillEffects(charId, charData, {
            mode: 'level',
            levelModeBreakthroughCount,
          });
          skillEffectsRef.current = effects;
          const resolvedAttack = Math.round(
            getCharacterAtk(charId, charData.level) *
              effects.baseAttackMultiplier *
              skinLoadout.effects.attackBonusMultiplier,
          );
          const resolvedHp = Math.round(
            getCharacterHp(charId, charData.level) * effects.maxHpMultiplier,
          );
          updateAttackPowerWithPotion(resolvedAttack);
          setPlayerHp(resolvedHp);
          setMaxPlayerHp(resolvedHp);
          playerHpRef.current = resolvedHp;
          playerHpAnim.setValue(1);
          pieceOptions = getCurrentPieceOptions();
        }

        const initialPack = generatePlaceablePieces(
          nextBoard,
          levelPieceDifficulty,
          getSkinColors(),
          pieceOptions,
        );
        const previewPack = generatePlaceablePieces(
          nextBoard,
          levelPieceDifficulty,
          getSkinColors(),
          pieceOptions,
        );
        if (!mounted) {
          return;
        }
        setPieces(initialPack);
        updateNextPieces(previewPack);
      } catch (error) {
        console.warn('SingleGameScreen init error:', error);
        if (!mounted) {
          return;
        }
        const fallbackPack = buildPiecePack(nextBoard);
        setPieces(fallbackPack);
        updateNextPieces(buildPiecePack(nextBoard));
      }
    })();

    setTimeout(() => {
      boardRef.current?.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setBoardLayout({ x, y, width, height });
        },
      );
    }, 300);

    return () => {
      mounted = false;
      if (comboTimerRef.current) {
        clearTimeout(comboTimerRef.current);
      }
      if (comboTickerRef.current) {
        clearInterval(comboTickerRef.current);
      }
      if (feverTimerRef.current) {
        clearTimeout(feverTimerRef.current);
      }
      if (enemyAttackRef.current) {
        clearInterval(enemyAttackRef.current);
      }
      clearNotice();
    };
  }, [
    activeLevel,
    buildPiecePack,
    buildRunItemLoadout,
    clearNotice,
    levelPieceDifficulty,
    maxMonsterHp,
    monsterHpAnim,
    playerHpAnim,
    updateAttackPowerWithPotion,
    updateNextPieces,
  ]);

  const animateMonsterHpBar = useCallback(
    (newRatio: number) => {
      Animated.timing(monsterHpAnim, {
        toValue: newRatio,
        duration: 400,
        useNativeDriver: false,
      }).start();
    },
    [monsterHpAnim],
  );

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

  const showLevelUpCelebration = useCallback(
    (fromLevel: number, toLevel: number) =>
      new Promise<void>(resolve => {
        const skillPointsGained = (toLevel - fromLevel) * 2;
        setLevelUpState({ fromLevel, toLevel, skillPointsGained });
        levelUpAnim.setValue(0);
        Animated.sequence([
          Animated.timing(levelUpAnim, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.delay(1050),
          Animated.timing(levelUpAnim, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setLevelUpState(null);
          resolve();
        });
      }),
    [levelUpAnim],
  );

  const triggerAvatarShake = useCallback(
    (target: Animated.Value, intensity: number) => {
      target.setValue(0);
      Animated.sequence([
        Animated.timing(target, {
          toValue: intensity,
          duration: 32,
          useNativeDriver: true,
        }),
        Animated.timing(target, {
          toValue: -intensity * 0.9,
          duration: 34,
          useNativeDriver: true,
        }),
        Animated.timing(target, {
          toValue: intensity * 0.55,
          duration: 32,
          useNativeDriver: true,
        }),
        Animated.timing(target, {
          toValue: 0,
          duration: 30,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [],
  );

  const triggerComboEffects = useCallback(
    (nextCombo: number) => {
      if (nextCombo < 3) {
        return;
      }

      const intensity = Math.min(18, 4 + nextCombo * 1.6);
      const verticalIntensity = Math.min(10, 2 + nextCombo * 0.85);

      setComboBurstValue(nextCombo);
      comboBurstAnim.setValue(0);
      screenShakeX.setValue(0);
      screenShakeY.setValue(0);

      Animated.parallel([
        Animated.timing(comboBurstAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(screenShakeX, {
            toValue: intensity,
            duration: 34,
            useNativeDriver: true,
          }),
          Animated.timing(screenShakeX, {
            toValue: -intensity * 0.9,
            duration: 42,
            useNativeDriver: true,
          }),
          Animated.timing(screenShakeX, {
            toValue: intensity * 0.65,
            duration: 42,
            useNativeDriver: true,
          }),
          Animated.timing(screenShakeX, {
            toValue: -intensity * 0.35,
            duration: 34,
            useNativeDriver: true,
          }),
          Animated.timing(screenShakeX, {
            toValue: 0,
            duration: 38,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(screenShakeY, {
            toValue: -verticalIntensity,
            duration: 38,
            useNativeDriver: true,
          }),
          Animated.timing(screenShakeY, {
            toValue: verticalIntensity * 0.85,
            duration: 42,
            useNativeDriver: true,
          }),
          Animated.timing(screenShakeY, {
            toValue: -verticalIntensity * 0.45,
            duration: 34,
            useNativeDriver: true,
          }),
          Animated.timing(screenShakeY, {
            toValue: 0,
            duration: 34,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        comboBurstAnim.setValue(0);
        screenShakeX.setValue(0);
        screenShakeY.setValue(0);
        setComboBurstValue(0);
      });
    },
    [comboBurstAnim, screenShakeX, screenShakeY],
  );

  const activateFever = useCallback(() => {
    setFeverActive(true);
    setFeverGauge(100);
    feverActiveRef.current = true;
    feverGaugeRef.current = 100;

    if (feverTimerRef.current) {
      clearTimeout(feverTimerRef.current);
    }

    feverTimerRef.current = setTimeout(() => {
      setFeverActive(false);
      setFeverGauge(0);
      feverActiveRef.current = false;
      feverGaugeRef.current = 0;
    }, FEVER_DURATION + skillEffectsRef.current.feverDurationBonusMs);
  }, []);

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
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, summonActive, summonRemainingMs]);

  useEffect(() => {
    const effects = skillEffectsRef.current;
    if (
      gameOver ||
      effects.autoHealIntervalMs <= 0 ||
      effects.autoHealPercent <= 0
    ) {
      return;
    }

    const timer = setInterval(() => {
      if (gameOverRef.current || monsterHpRef.current <= 0) {
        return;
      }
      const maxHp = Math.max(1, maxPlayerHp);
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
  }, [animatePlayerHpBar, gameOver, maxPlayerHp, showSkillTriggerNotice]);

  const endGame = useCallback(
    async (success: boolean, reason: FailureReason = 'board_full') => {
      if (gameOverRef.current) {
        return;
      }

      gameOverRef.current = true;
      setGameOver(true);

      if (comboTimerRef.current) {
        clearTimeout(comboTimerRef.current);
      }
      if (comboTickerRef.current) {
        clearInterval(comboTickerRef.current);
        comboTickerRef.current = null;
      }
      comboExpireAtRef.current = null;
      setComboRemainingMs(0);
      if (feverTimerRef.current) {
        clearTimeout(feverTimerRef.current);
      }
      if (enemyAttackRef.current) {
        clearInterval(enemyAttackRef.current);
      }

      const dailyStats = await loadDailyStats();
      await updateDailyStats(dailyStats, {
        games: 1,
        lines: linesClearedRef.current,
        maxCombo: maxComboRef.current,
        levelClears: success ? 1 : 0,
      });

      if (activeSkinIdRef.current > 0 && summonExpEarnedRef.current > 0) {
        await gainSummonExp(
          activeSkinIdRef.current,
          summonExpEarnedRef.current,
        );
      }

      if (success) {
        const progress = await loadLevelProgress();
        const wasFirstClear = progress[levelId]?.cleared !== true;
        const stars = calculateVictoryStars(
          playerHpRef.current,
          maxPlayerHp,
          usedBattleItemRef.current,
        );
        await saveLevelProgress(
          progress,
          levelId,
          totalDamageRef.current,
          stars,
        );

        const world = activeWorldId;
        const reward = creatorLevelRuntime
          ? {
              gold:
                creatorLevelRuntime.reward.repeatGold +
                (wasFirstClear
                  ? creatorLevelRuntime.reward.firstClearBonusGold
                  : 0),
              xp: adjustCharacterXpReward(
                creatorLevelRuntime.reward.characterExp,
              ),
            }
          : getLevelClearRewards(world, levelId, !wasFirstClear, {
              isAdmin: isAdminRef.current,
            });
        const rewardTotals = applyRewardMultipliers(
          reward.gold,
          0,
          skillEffectsRef.current,
        );
        const goldReward = applySkinRewardBonuses(
          rewardTotals.gold,
          activeSkinIdRef.current,
        );
        const currentGameData = gameDataRef.current ?? (await loadGameData());
        if (!currentGameData) {
          return;
        }
        let updated = await addGold(currentGameData, goldReward);
        if (
          wasFirstClear &&
          skillEffectsRef.current.levelModeBreakthroughAttackPerClear > 0
        ) {
          updated = await recordLevelModeBreakthroughSuccess(
            updated,
            levelId,
            LEVELS.length,
          );
        }

        const charId = (await getSelectedCharacter()) ?? selectedCharacterId;
        let characterIdForReward = charId;
        let victoryFromLevel = 1;
        let victoryToLevel = 1;
        let victoryFromXp = 0;
        let victoryToXp = 0;

        if (charId) {
          const charData = await loadCharacterData(charId);
          characterIdForReward = charData.characterId;
          victoryFromLevel = charData.level;
          victoryFromXp = charData.xp;
          const updatedCharData = await addCharacterXP(charData, reward.xp);
          victoryToLevel = updatedCharData.level;
          victoryToXp = updatedCharData.xp;
          if (updatedCharData.level > charData.level) {
            await showLevelUpCelebration(charData.level, updatedCharData.level);
          }
        }

        void submitLevelLeaderboard({
          levelId,
          stars,
          totalDamage: totalDamageRef.current,
          maxCombo: maxComboRef.current,
          clearTimeMs:
            startedAtRef.current > 0 ? Date.now() - startedAtRef.current : 0,
        });

        void flushPlayerStateNow('single_game_victory');
        gameDataRef.current = updated;
        setGameData(updated);
        setVictoryState({
          characterId: characterIdForReward,
          rewardGold: goldReward,
          rewardDiamonds: diamondsEarnedRef.current,
          rewardXp: reward.xp,
          fromLevel: victoryFromLevel,
          toLevel: victoryToLevel,
          fromXp: victoryFromXp,
          toXp: victoryToXp,
        });
        return;
      }

      const currentGameData = gameDataRef.current ?? (await loadGameData());
      if (currentGameData) {
        const updated = await resetLevelModeBreakthrough(currentGameData);
        gameDataRef.current = updated;
        setGameData(updated);
      }
      void flushPlayerStateNow('single_game_defeat');
      setDefeatState({
        characterId: selectedCharacterId,
        reason,
        remainingMonsterHp: monsterHpRef.current,
        totalDamage: totalDamageRef.current,
        maxCombo: maxComboRef.current,
      });
    },
    [
      activeWorldId,
      levelId,
      maxPlayerHp,
      selectedCharacterId,
      showLevelUpCelebration,
    ],
  );

  const applyMonsterAttack = useCallback(() => {
    if (gameOverRef.current || monsterHpRef.current <= 0) {
      return;
    }

    triggerMonsterPose('attack');

    if (shouldDodgeAttack(skillEffectsRef.current)) {
      showSkillTriggerNotice('dodge');
      return;
    }

    const placementProtectionActive =
      damageReductionBuffUntilRef.current > Date.now();
    const incomingReduction = Math.min(
      0.85,
      skillEffectsRef.current.damageTakenReduction +
        (placementProtectionActive
          ? skillEffectsRef.current.placementDamageReduction
          : 0),
    );
    const incomingDamage = applySkinIncomingDamage(
      Math.max(0, Math.round(enemyStats.attack * (1 - incomingReduction))),
      activeSkinIdRef.current,
    );
    const rawNextHp = Math.max(0, playerHpRef.current - incomingDamage);
    const nextHp =
      rawNextHp <= 0 &&
      skillEffectsRef.current.reviveOnce &&
      !reviveUsedRef.current
        ? 1
        : rawNextHp;
    if (incomingDamage > 0) {
      setPlayerHit({ id: Date.now(), damage: incomingDamage });
      triggerAvatarShake(
        playerAvatarShakeX,
        Math.min(12, 4 + incomingDamage / 10),
      );
    }
    playerHpRef.current = nextHp;
    setPlayerHp(nextHp);
    animatePlayerHpBar(nextHp / Math.max(1, maxPlayerHp));

    if (rawNextHp <= 0 && nextHp === 1) {
      reviveUsedRef.current = true;
      showSkillTriggerNotice('revive');
      return;
    }

    if (nextHp <= 0) {
      endGame(false, 'hp_zero');
    }
  }, [
    animatePlayerHpBar,
    endGame,
    enemyStats.attack,
    maxPlayerHp,
    playerAvatarShakeX,
    showSkillTriggerNotice,
    triggerMonsterPose,
    triggerAvatarShake,
  ]);

  useEffect(() => {
    if (enemyAttackRef.current) {
      clearInterval(enemyAttackRef.current);
    }
    if (gameOver || monsterHpRef.current <= 0) {
      return;
    }

    enemyAttackRef.current = setInterval(() => {
      applyMonsterAttack();
    }, enemyStats.attackIntervalMs);

    return () => {
      if (enemyAttackRef.current) {
        clearInterval(enemyAttackRef.current);
      }
    };
  }, [applyMonsterAttack, enemyStats.attackIntervalMs, gameOver]);

  useEffect(() => {
    if (!victoryState) {
      return;
    }

    let cancelled = false;
    const listeners: string[] = [];
    const segments: Array<{
      level: number;
      required: number;
      startXp: number;
      endXp: number;
    }> = [];

    let cursorLevel = victoryState.fromLevel;
    let cursorXp = victoryState.fromXp;
    let remainingXp = victoryState.rewardXp;

    while (remainingXp > 0) {
      const required = xpToNextLevel(cursorLevel);
      const xpToFill = Math.min(required - cursorXp, remainingXp);
      segments.push({
        level: cursorLevel,
        required,
        startXp: cursorXp,
        endXp: cursorXp + xpToFill,
      });
      remainingXp -= xpToFill;
      cursorXp += xpToFill;
      if (cursorXp >= required && remainingXp > 0) {
        cursorLevel += 1;
        cursorXp = 0;
      }
    }

    if (segments.length === 0) {
      const required = xpToNextLevel(victoryState.toLevel);
      segments.push({
        level: victoryState.toLevel,
        required,
        startXp: victoryState.toXp,
        endXp: victoryState.toXp,
      });
    }

    const animateSegment = (index: number) => {
      if (cancelled) {
        return;
      }

      const segment = segments[index];
      if (!segment) {
        setVictoryReady(true);
        return;
      }

      setVictoryDisplayedLevel(segment.level);
      setVictoryDisplayedXpMax(segment.required);
      setVictoryDisplayedXpCurrent(segment.startXp);
      victoryXpAnim.setValue(segment.startXp / Math.max(1, segment.required));

      listeners.push(
        victoryXpAnim.addListener(({ value }) => {
          if (!cancelled) {
            setVictoryDisplayedXpCurrent(
              Math.round(Math.max(0, Math.min(1, value)) * segment.required),
            );
          }
        }),
      );

      Animated.timing(victoryXpAnim, {
        toValue: segment.endXp / Math.max(1, segment.required),
        duration: 850,
        useNativeDriver: false,
      }).start(() => {
        const listenerId = listeners.pop();
        if (listenerId) {
          victoryXpAnim.removeListener(listenerId);
        }
        if (cancelled) {
          return;
        }

        setVictoryDisplayedXpCurrent(segment.endXp);

        if (segment.endXp >= segment.required && index < segments.length - 1) {
          setTimeout(() => {
            if (!cancelled) {
              animateSegment(index + 1);
            }
          }, 180);
          return;
        }

        if (index < segments.length - 1) {
          setTimeout(() => {
            if (!cancelled) {
              animateSegment(index + 1);
            }
          }, 120);
          return;
        }

        setVictoryReady(true);
      });
    };

    setVictoryReady(false);
    animateSegment(0);

    return () => {
      cancelled = true;
      for (const listenerId of listeners) {
        victoryXpAnim.removeListener(listenerId);
      }
    };
  }, [victoryState, victoryXpAnim]);

  const resetComboTimer = useCallback(() => {
    const durationMs =
      COMBO_TIMEOUT_MS + skillEffectsRef.current.comboWindowBonusMs;

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
    }, 50);

    comboTimerRef.current = setTimeout(() => {
      setCombo(0);
      comboRef.current = 0;
      comboExpireAtRef.current = null;
      setComboRemainingMs(0);
      if (comboTickerRef.current) {
        clearInterval(comboTickerRef.current);
        comboTickerRef.current = null;
      }
    }, durationMs);
  }, []);

  const handlePlace = useCallback(
    (pieceIndex: number, row: number, col: number) => {
      if (gameOverRef.current) {
        return;
      }

      const piece = pieces[pieceIndex];
      if (!piece) {
        return;
      }

      let newBoard = placePiece(board, piece, row, col);
      showPlacementEffect(piece, row, col);
      const blockCount = countBlocks(piece.shape);
      let totalLines = 0;
      let totalGemsFound = 0;
      const totalItemsFound: string[] = [];

      while (true) {
        const result = checkAndClearLines(newBoard);
        const clearedLineCount =
          result.clearedRows.length + result.clearedCols.length;

        if (clearedLineCount === 0) {
          break;
        }

        newBoard = result.newBoard;
        totalLines += clearedLineCount;
        totalGemsFound += result.gemsFound;
        totalItemsFound.push(...result.itemsFound);
      }

      const effects = skillEffectsRef.current;
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

      const boardSkillResult = applySkillBoardEffects({
        board: newBoard,
        piece,
        row,
        col,
        didClear: totalLines > 0,
        combo: totalLines > 0 ? comboRef.current + 1 : comboRef.current,
        effects,
        colors: getSkinColors(),
      });
      showBoardSkillCastEffects(boardSkillResult.animations);
      newBoard = boardSkillResult.board;
      totalLines += boardSkillResult.extraLinesCleared;
      totalGemsFound += boardSkillResult.gemsFound;
      totalItemsFound.push(...boardSkillResult.itemsFound);

      const turnResult = resolveCombatTurn({
        mode: 'level',
        blockCount,
        attackPower,
        clearedLines: totalLines,
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

      if (turnResult.nextCombo > maxComboRef.current) {
        maxComboRef.current = turnResult.nextCombo;
      }

      comboRef.current = turnResult.nextCombo;
      setCombo(turnResult.nextCombo);

      if (turnResult.didClear) {
        resetComboTimer();
        triggerComboEffects(turnResult.nextCombo);
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
          clearedLines: totalLines,
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
      const summonBonus =
        summonActiveRef.current && summonRemainingMsRef.current > 0
          ? summonAttackRef.current
          : 0;
      const damageThisTurn = skinDamage + summonBonus;
      if (summonBonus > 0) {
        summonExpEarnedRef.current += Math.max(1, Math.round(summonBonus / 6));
      }
      if (damageThisTurn > 0) {
        setPlayerAttackPulse(previous => previous + 1);
        triggerMonsterPose('hurt', 260);
        queueMonsterHit(damageThisTurn);
        triggerAvatarShake(
          monsterAvatarShakeX,
          Math.min(14, 4 + turnResult.nextCombo * 1.5),
        );
      }
      const nextMonsterHp = Math.max(0, monsterHpRef.current - damageThisTurn);
      monsterHpRef.current = nextMonsterHp;

      animateMonsterHpBar(nextMonsterHp / maxMonsterHp);
      setMonsterHp(nextMonsterHp);
      totalDamageRef.current += damageThisTurn;
      linesClearedRef.current += totalLines;

      if (
        activeSkinIdRef.current > 0 &&
        summonGaugeRequiredRef.current > 0 &&
        !summonActiveRef.current
      ) {
        const nextGauge = Math.min(
          summonGaugeRequiredRef.current,
          summonGaugeRef.current +
            getSummonGaugeGain(activeSkinIdRef.current, blockCount, totalLines),
        );
        summonGaugeRef.current = nextGauge;
        setSummonGauge(nextGauge);
      }

      if (totalLines > 0) {
        clearEventCounterRef.current += 1;
        twoLineCounterRef.current += totalLines;

        let healAmount = Math.round(
          maxPlayerHp * effects.healPerLineClearPercent * totalLines,
        );
        if (effects.healEveryTwoLinesPercent > 0) {
          const triggerCount = Math.floor(twoLineCounterRef.current / 2);
          if (triggerCount > 0) {
            healAmount += Math.round(
              maxPlayerHp * effects.healEveryTwoLinesPercent * triggerCount,
            );
            twoLineCounterRef.current %= 2;
          }
        }
        if (
          effects.healEveryFiveClearsPercent > 0 &&
          clearEventCounterRef.current >= 5
        ) {
          const triggerCount = Math.floor(clearEventCounterRef.current / 5);
          healAmount += Math.round(
            maxPlayerHp * effects.healEveryFiveClearsPercent * triggerCount,
          );
          clearEventCounterRef.current %= 5;
        }

        if (healAmount > 0) {
          const healedHp = Math.min(
            maxPlayerHp,
            playerHpRef.current + healAmount,
          );
          playerHpRef.current = healedHp;
          setPlayerHp(healedHp);
          animatePlayerHpBar(healedHp / Math.max(1, maxPlayerHp));
        }
      }

      setBoard(newBoard);
      if (
        gameDataRef.current &&
        (totalGemsFound > 0 || totalItemsFound.length > 0)
      ) {
        diamondsEarnedRef.current += totalGemsFound;
        collectSpecialBlockRewards(
          gameDataRef.current,
          totalGemsFound,
          totalItemsFound,
        ).then(rewardResult => {
          gameDataRef.current = rewardResult.data;
          setGameData(rewardResult.data);
        });
      }

      const newPieces = [...pieces];
      newPieces[pieceIndex] = null;
      const remainingPieces = newPieces.filter(p => p !== null);
      if (remainingPieces.length === 0) {
        const upcomingPack = isPiecePackPlaceable(
          newBoard,
          nextPiecesRef.current,
        )
          ? nextPiecesRef.current
          : buildPiecePack(newBoard);
        newPieces[0] = upcomingPack[0];
        newPieces[1] = upcomingPack[1];
        newPieces[2] = upcomingPack[2];
        updateNextPieces(buildPiecePack(newBoard));
      }
      setPieces(newPieces);

      setTimeout(() => {
        if (nextMonsterHp <= 0) {
          endGame(true);
          return;
        }

        const activePieces = newPieces.filter(p => p !== null) as Piece[];
        if (!canPlaceAnyPiece(newBoard, activePieces)) {
          endGame(false, 'board_full');
        }
      }, 200);
    },
    [
      attackPower,
      activateFever,
      board,
      buildPiecePack,
      endGame,
      maxMonsterHp,
      maxPlayerHp,
      pieces,
      resetComboTimer,
      triggerComboEffects,
      isPiecePackPlaceable,
      monsterAvatarShakeX,
      queueMonsterHit,
      showPlacementEffect,
      showBoardSkillCastEffects,
      triggerMonsterPose,
      showSkillTriggerNotice,
      triggerAvatarShake,
      animatePlayerHpBar,
      animateMonsterHpBar,
      updateNextPieces,
    ],
  );

  const dragDrop = useDragDrop(
    board,
    pieces,
    boardLayout,
    handlePlace,
    false,
    0,
    visualViewport,
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
    }

    summonActiveRef.current = !summonActiveRef.current;
    setSummonActive(summonActiveRef.current);
  }, []);

  const decrementRunItemSlot = useCallback((slotIndex?: number) => {
    if (slotIndex === undefined) {
      return;
    }

    setRunItemLoadout(current =>
      current.map((slot, index) =>
        index === slotIndex
          ? { ...slot, count: Math.max(0, slot.count - 1) }
          : slot,
      ),
    );
  }, []);

  const handleItemSelect = useCallback(
    (item: string, slotIndex?: number) => {
      const itemKey = item as ActiveItemKey;
      const itemDefinition = getItemDefinition(itemKey);
      if (!gameData || !itemDefinition || gameOverRef.current) {
        return;
      }

      const inventoryCount = gameData.items[itemKey] ?? 0;
      const slotCount =
        slotIndex === undefined
          ? inventoryCount
          : runItemLoadout[slotIndex]?.itemKey === itemKey
            ? runItemLoadout[slotIndex]?.count ?? 0
            : 0;

      if (inventoryCount <= 0 || slotCount <= 0) {
        showBattleNotice(`${itemDefinition.label}이 없습니다.`);
        return;
      }

      if (itemKey === 'refresh') {
        consumeItem(gameData, itemKey).then(updatedData => {
          if (!updatedData) {
            return;
          }

          usedBattleItemRef.current = true;
          gameDataRef.current = updatedData;
          setGameData(updatedData);
          setPieces(buildPiecePack(board));
          decrementRunItemSlot(slotIndex);
          setSelectedItem(null);
          showBattleNotice('새 블록으로 교체했습니다.');
        });
        return;
      }

      if (itemDefinition.type === 'heal') {
        if (playerHpRef.current >= maxPlayerHp) {
          showBattleNotice('HP가 이미 가득 찼습니다.');
          return;
        }

        consumeItem(gameData, itemKey).then(updatedData => {
          if (!updatedData) {
            return;
          }

          usedBattleItemRef.current = true;
          gameDataRef.current = updatedData;
          setGameData(updatedData);
          const healAmount = Math.max(
            1,
            Math.round(maxPlayerHp * (itemDefinition.healPercent ?? 0)),
          );
          const healedHp = Math.min(maxPlayerHp, playerHpRef.current + healAmount);
          const recovered = Math.max(0, healedHp - playerHpRef.current);
          playerHpRef.current = healedHp;
          setPlayerHp(healedHp);
          animatePlayerHpBar(healedHp / Math.max(1, maxPlayerHp));
          decrementRunItemSlot(slotIndex);
          setSelectedItem(null);
          showBattleNotice(`${itemDefinition.label} 사용: HP +${recovered}`);
        });
        return;
      }

      if (itemDefinition.type === 'power') {
        const nextMultiplier = itemDefinition.powerMultiplier ?? 1;
        if (nextMultiplier <= powerItemMultiplierRef.current) {
          showBattleNotice('더 높은 등급의 파워업 포션이 필요합니다.');
          return;
        }

        consumeItem(gameData, itemKey).then(updatedData => {
          if (!updatedData) {
            return;
          }

          usedBattleItemRef.current = true;
          gameDataRef.current = updatedData;
          setGameData(updatedData);
          powerItemMultiplierRef.current = nextMultiplier;
          updateAttackPowerWithPotion(baseAttackPowerRef.current);
          decrementRunItemSlot(slotIndex);
          setSelectedItem(null);
          showBattleNotice(
            `${itemDefinition.label} 사용: 공격 ${Math.round(
              nextMultiplier * 100,
            )}%`,
          );
        });
        return;
      }
    },
    [
      animatePlayerHpBar,
      board,
      buildPiecePack,
      decrementRunItemSlot,
      gameData,
      maxPlayerHp,
      runItemLoadout,
      showBattleNotice,
      updateAttackPowerWithPotion,
    ],
  );

  const handleRetryLevel = useCallback(async () => {
    const latestGameData = gameDataRef.current ?? (await loadGameData());
    if (
      !latestGameData ||
      (!isAdminRef.current && latestGameData.hearts <= 0)
    ) {
      Alert.alert('하트 부족', '다시 도전하려면 하트가 필요합니다.');
      return;
    }

    const updatedGameData = await consumeHeart(latestGameData);
    if (!updatedGameData) {
      Alert.alert('하트 부족', '다시 도전하려면 하트가 필요합니다.');
      return;
    }

    gameDataRef.current = updatedGameData;
    setGameData(updatedGameData);
    navigation.replace('SingleGame', { levelId });
  }, [levelId, navigation]);

  const monsterHpPercent = monsterHp / maxMonsterHp;
  const monsterHpColor =
    monsterHpPercent > 0.5
      ? '#22c55e'
      : monsterHpPercent > 0.2
      ? '#f59e0b'
      : '#ef4444';
  const playerHpPercent = playerHp / Math.max(1, maxPlayerHp);
  const playerHpColor =
    playerHpPercent > 0.5
      ? '#38bdf8'
      : playerHpPercent > 0.2
      ? '#f59e0b'
      : '#ef4444';
  const previewPieces =
    skillEffectsRef.current.previewCountBonus > 0
      ? nextPieces.slice(
          0,
          Math.min(3, skillEffectsRef.current.previewCountBonus),
        )
      : [];
  const hasSidePreview = previewPieces.length > 0;
  const compactPieceTray = hasSidePreview;
  const comboGaugeMaxMs =
    COMBO_TIMEOUT_MS + skillEffectsRef.current.comboWindowBonusMs;
  const playerVisual =
    CHARACTER_VISUALS[selectedCharacterId] ?? CHARACTER_VISUALS.knight;
  const monsterSpriteSet = getWorldMonsterSpriteSet(
    activeWorldId,
    monster.monsterName,
  );
  const monsterSprite =
    getMonsterPoseSource(monsterSpriteSet, monsterPose) ??
    getMonsterPoseSource(monsterSpriteSet, 'idle');
  const backgroundImage = WORLD_BACKGROUND_IMAGES[activeWorldId] ?? null;
  const levelBackgroundOverride = getLevelBackgroundOverride(
    visualManifest,
    activeLevel.id,
    activeWorldId,
  );
  const creatorBackgroundRule = creatorLevelRuntime?.background ?? null;
  const backgroundTint = levelBackgroundOverride
    ? buildVisualTintColor(
        levelBackgroundOverride.tintColor,
        levelBackgroundOverride.tintOpacity,
      )
    : creatorBackgroundRule
    ? buildVisualTintColor(
        creatorBackgroundRule.tintColor,
        creatorBackgroundRule.tintOpacity,
      )
    : WORLD_BACKGROUND_TINTS[activeWorldId] ?? 'rgba(10, 10, 30, 0.72)';
  const runtimeBackgroundImage =
    levelBackgroundOverride?.removeImage === true ||
    creatorBackgroundRule?.removeImage === true
      ? null
      : levelBackgroundOverride?.assetKey &&
        visualAssetUris[levelBackgroundOverride.assetKey]
      ? { uri: visualAssetUris[levelBackgroundOverride.assetKey] }
      : creatorBackgroundRule?.assetKey &&
        creatorAssetUris[creatorBackgroundRule.assetKey]
      ? { uri: creatorAssetUris[creatorBackgroundRule.assetKey] }
      : backgroundImage;
  const comboGaugeRule = getVisualElementRule(
    visualManifest,
    'level',
    'combo_gauge',
  );
  const boardRule = getVisualElementRule(visualManifest, 'level', 'board');
  useEffect(() => {
    setMonsterPose('idle');
  }, [activeWorldId, monster.monsterName]);
  const renderCharacterPortrait = (
    characterId: string,
    size: number,
    attackPulse: number = 0,
    facing: 1 | -1 = 1,
  ) => {
    const visual = CHARACTER_VISUALS[characterId] ?? CHARACTER_VISUALS.knight;
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
            size={Math.round(size * 0.84)}
            attackPulse={attackPulse}
            facing={facing}
          />
        </View>
      );
    }
    const portraitSource = CHARACTER_PORTRAITS[characterId];
    if (portraitSource) {
      return (
        <View style={battleTransform}>
          <Image
            source={portraitSource}
            resizeMode="contain"
            style={{
              width: size * 0.96,
              height: size * 1.18,
              transform: [{ scaleX: facing }],
            }}
          />
        </View>
      );
    }
    return (
      <View style={battleTransform}>
        <View
          style={[
            styles.characterFallbackBadge,
            { width: size * 0.82, height: size * 0.82 },
          ]}
        >
          <Text
            style={[
              styles.characterFallbackEmoji,
              { fontSize: size * 0.44, transform: [{ scaleX: facing }] },
            ]}
          >
            {visual.emoji}
          </Text>
        </View>
      </View>
    );
  };
  const renderPlayerAvatar = (size: number) => {
    return renderCharacterPortrait(
      selectedCharacterId,
      size,
      playerAttackPulse,
      1,
    );
  };
  const renderMonsterAvatar = (size: number, facingMultiplier: 1 | -1 = 1) => {
    if (monsterSprite) {
      return (
        <Image
          source={monsterSprite}
          resizeMode="contain"
          fadeDuration={0}
          style={{
            width: size,
            height: size,
            transform: [
              { scaleX: (monsterSpriteSet?.facing ?? 1) * facingMultiplier },
            ],
          }}
        />
      );
    }
    return (
      <Text
        style={[
          styles.monsterEmojiCompact,
          { fontSize: size * 0.68, transform: [{ scaleX: facingMultiplier }] },
        ]}
      >
        {monster.monsterEmoji}
      </Text>
    );
  };

  const renderBattleLane = () => (
    <View style={styles.battleLane}>
      <View style={styles.battleUnit}>
        <Animated.View
          style={[
            styles.unitAvatarFrame,
            styles.playerAvatarFrame,
            { transform: [{ translateX: playerAvatarShakeX }] },
          ]}
        >
          <View style={styles.playerAvatarSpriteWrap}>
            {renderPlayerAvatar(62)}
          </View>
          {playerHit && (
            <>
              <HitEffect
                key={`player-hit-${playerHit.id}`}
                damage={playerHit.damage}
                onDone={() => {}}
              />
              <DamageFlash
                key={`player-flash-${playerHit.id}`}
                damage={playerHit.damage}
                onDone={() =>
                  setPlayerHit(current =>
                    current?.id === playerHit.id ? null : current,
                  )
                }
              />
            </>
          )}
        </Animated.View>
        <Text numberOfLines={1} style={styles.unitName}>
          {playerVisual.name}
        </Text>
        <View style={styles.compactHpTrack}>
          <Animated.View
            style={[
              styles.compactHpFill,
              {
                backgroundColor: playerHpColor,
                width: playerHpAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.compactHpText}>
          {playerHp.toLocaleString()} / {maxPlayerHp.toLocaleString()}
        </Text>
      </View>

      <View style={styles.battleCenter}>
        <View style={styles.centerInfoCard}>
          <View style={styles.centerInfoRow}>
            <Text style={styles.centerInfoText}>공격 {attackPower}</Text>
            <Text style={styles.centerInfoText}>
              적 공격 {enemyStats.attack}
            </Text>
          </View>
          <View style={styles.centerInfoRow}>
            <Text
              style={[
                styles.centerInfoStatus,
                feverActive && styles.centerInfoTextActive,
              ]}
            >
              {feverActive ? '피버 발동' : `피버 ${feverGauge}%`}
            </Text>
          </View>

          {activeSkinIdRef.current > 0 && summonGaugeRequired > 0 && (
            <View style={styles.summonInlineCard}>
              <View style={styles.summonInlineHeader}>
                <Text style={styles.summonInlineTitle}>소환수</Text>
                <Text style={styles.summonInlineMeta}>
                  공격 {summonAttack} / {Math.ceil(summonRemainingMs / 1000)}초
                </Text>
              </View>
              <View style={styles.summonInlineTrack}>
                <View
                  style={[
                    styles.summonInlineFill,
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
              <View style={styles.summonInlineFooter}>
                <Text style={styles.summonInlineMeta}>
                  {summonGauge}/{summonGaugeRequired}
                </Text>
                <TouchableOpacity
                  onPress={handleToggleSummon}
                  disabled={
                    (summonGauge < summonGaugeRequired && !summonActive) ||
                    summonRemainingMs <= 0
                  }
                  style={[
                    styles.summonInlineBtn,
                    summonActive && styles.summonInlineBtnActive,
                    (summonRemainingMs <= 0 ||
                      (summonGauge < summonGaugeRequired && !summonActive)) &&
                      styles.summonInlineBtnDisabled,
                  ]}
                >
                  <Text style={styles.summonInlineBtnText}>
                    {summonActive ? '회수' : '소환'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.battleUnit}>
        <Animated.View
          style={[
            styles.unitAvatarFrame,
            styles.monsterAvatarFrame,
            { borderColor: monster.monsterColor },
            { transform: [{ translateX: monsterAvatarShakeX }] },
          ]}
        >
          {renderMonsterAvatar(68, -1)}
          {monsterImpactHit && (
            <HitEffect
              key={`monster-hit-${monsterImpactHit.id}`}
              damage={monsterImpactHit.damage}
              onDone={() =>
                setMonsterImpactHit(current =>
                  current?.id === monsterImpactHit.id ? null : current,
                )
              }
            />
          )}
          <View pointerEvents="none" style={styles.monsterDamageHost}>
            {monsterHits
              .slice()
              .reverse()
              .map((hit, index) => (
                <FloatingDamageLabel
                  key={`monster-flash-${hit.id}`}
                  damage={hit.damage}
                  stackIndex={index}
                  baseTop={8}
                />
              ))}
          </View>
        </Animated.View>
        <Text
          numberOfLines={1}
          style={[styles.unitName, { color: monster.monsterColor }]}
        >
          {monster.monsterName}
        </Text>
        <View style={styles.compactHpTrack}>
          <Animated.View
            style={[
              styles.compactHpFill,
              {
                backgroundColor: monsterHpColor,
                width: monsterHpAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.compactHpText}>
          {monsterHp.toLocaleString()} / {maxMonsterHp.toLocaleString()}
        </Text>
      </View>
    </View>
  );

  if (!levelData) {
    return (
      <SafeAreaView style={styles.missingContainer}>
        <Text style={styles.missingText}>스테이지를 찾을 수 없습니다.</Text>
        <BackImageButton onPress={() => navigation.goBack()} size={48} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {runtimeBackgroundImage ? (
        <ImageBackground
          source={runtimeBackgroundImage}
          resizeMode="cover"
          style={styles.screenBackground}
        >
          <View
            style={[styles.backgroundTint, { backgroundColor: backgroundTint }]}
          >
            <Animated.View
              style={[
                styles.screenContent,
                {
                  paddingTop: modeVerticalGutter,
                  paddingBottom: modeVerticalGutter,
                  transform: [
                    { translateX: screenShakeX },
                    { translateY: screenShakeY },
                  ],
                },
              ]}
            >
              <VisualElementView
                screenId="level"
                elementId="header"
                style={styles.header}
              >
                <TouchableOpacity onPress={() => setShowExitConfirm(true)}>
                  <BackImageButton
                    onPress={() => setShowExitConfirm(true)}
                    size={40}
                  />
                </TouchableOpacity>
                <Text style={styles.stageLabel}>{activeLevelName}</Text>
                <View style={styles.headerSideSpacer} />
              </VisualElementView>

              <VisualElementView
                screenId="level"
                elementId="battle_lane"
                style={styles.visualWrapper}
              >
                {renderBattleLane()}
              </VisualElementView>

              <View style={styles.boardContainer}>
                <VisualElementView
                  screenId="level"
                  elementId="board"
                  style={styles.boardVisualAnchor}
                  onLayout={handleBoardLayout}
                >
                  {comboGaugeRule.visible && (
                    <ComboGaugeOverlay
                      combo={combo}
                      comboRemainingMs={comboRemainingMs}
                      comboMaxMs={comboGaugeMaxMs}
                      visualAutomationLabel={buildVisualAutomationLabel(
                        'level',
                        'combo_gauge',
                      )}
                      style={buildVisualElementStyle(
                        comboGaugeRule,
                        visualViewport,
                        visualManifest.referenceViewport,
                      )}
                    />
                  )}
                  <Board
                    ref={boardRef}
                    board={board}
                    viewport={visualViewport}
                    backgroundColor={skinBoardBg}
                    previewCells={dragDrop.previewCells}
                    invalidPreview={dragDrop.invalidPreview}
                    clearGuideCells={dragDrop.clearGuideCells}
                  />
                  <VisualElementView
                    screenId="level"
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
                </VisualElementView>
              </View>

              <View style={styles.bottomActionRow}>
                <View style={styles.bottomPieceArea}>
                  <VisualElementView
                    screenId="level"
                    elementId="piece_tray"
                    style={styles.visualWrapper}
                  >
                    <PieceSelector
                      pieces={pieces}
                      onDragStart={dragDrop.onDragStart}
                      onDragMove={dragDrop.onDragMove}
                      onDragEnd={dragDrop.onDragEnd}
                      onDragCancel={dragDrop.onDragCancel}
                      compact={compactPieceTray}
                      boardCompact={false}
                      boardScaleY={boardRule.scale * (boardRule.heightScale ?? 1)}
                      viewport={visualViewport}
                    />
                  </VisualElementView>
                </View>
                {hasSidePreview && (
                  <NextPiecePreview
                    pieces={previewPieces}
                    variant="side"
                    viewport={visualViewport}
                  />
                )}
              </View>

              {gameData && (
                <VisualElementView
                  screenId="level"
                  elementId="item_bar"
                  style={styles.visualWrapper}
                >
                  <ItemBar
                    items={gameData.items}
                    loadout={runItemLoadout}
                    allowedItemKeys={LEVEL_LOADOUT_ITEM_KEYS}
                    selectedItem={selectedItem}
                    onSelectItem={handleItemSelect}
                    showAddTurns={false}
                  />
                </VisualElementView>
              )}
            </Animated.View>
          </View>
        </ImageBackground>
      ) : (
        <View
          style={[styles.screenBackground, { backgroundColor: backgroundTint }]}
        >
          <Animated.View
            style={[
              styles.screenContent,
              {
                paddingTop: modeVerticalGutter,
                paddingBottom: modeVerticalGutter,
                transform: [
                  { translateX: screenShakeX },
                  { translateY: screenShakeY },
                ],
              },
            ]}
          >
            <VisualElementView
              screenId="level"
              elementId="header"
              style={styles.header}
            >
              <TouchableOpacity onPress={() => setShowExitConfirm(true)}>
                <BackImageButton
                  onPress={() => setShowExitConfirm(true)}
                  size={40}
                />
              </TouchableOpacity>
              <Text style={styles.stageLabel}>{activeLevelName}</Text>
              <View style={styles.headerSideSpacer} />
            </VisualElementView>

            <VisualElementView
              screenId="level"
              elementId="battle_lane"
              style={styles.visualWrapper}
            >
              {renderBattleLane()}
            </VisualElementView>

            <View style={styles.boardContainer}>
              <VisualElementView
                screenId="level"
                elementId="board"
                style={styles.boardVisualAnchor}
                onLayout={handleBoardLayout}
              >
                {comboGaugeRule.visible && (
                  <ComboGaugeOverlay
                    combo={combo}
                    comboRemainingMs={comboRemainingMs}
                    comboMaxMs={comboGaugeMaxMs}
                    visualAutomationLabel={buildVisualAutomationLabel(
                      'level',
                      'combo_gauge',
                    )}
                    style={buildVisualElementStyle(
                      comboGaugeRule,
                      visualViewport,
                      visualManifest.referenceViewport,
                    )}
                  />
                )}
                <Board
                  ref={boardRef}
                  board={board}
                  viewport={visualViewport}
                  backgroundColor={skinBoardBg}
                  previewCells={dragDrop.previewCells}
                  invalidPreview={dragDrop.invalidPreview}
                  clearGuideCells={dragDrop.clearGuideCells}
                />
                <VisualElementView
                  screenId="level"
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
              </VisualElementView>
            </View>

            <View style={styles.bottomActionRow}>
              <View style={styles.bottomPieceArea}>
                <VisualElementView
                  screenId="level"
                  elementId="piece_tray"
                  style={styles.visualWrapper}
                >
                  <PieceSelector
                    pieces={pieces}
                    onDragStart={dragDrop.onDragStart}
                    onDragMove={dragDrop.onDragMove}
                    onDragEnd={dragDrop.onDragEnd}
                    onDragCancel={dragDrop.onDragCancel}
                    compact={compactPieceTray}
                    boardCompact={false}
                    boardScaleY={boardRule.scale * (boardRule.heightScale ?? 1)}
                    viewport={visualViewport}
                  />
                </VisualElementView>
              </View>
              {hasSidePreview && (
                <NextPiecePreview
                  pieces={previewPieces}
                  variant="side"
                  viewport={visualViewport}
                />
              )}
            </View>

            {gameData && (
              <VisualElementView
                screenId="level"
                elementId="item_bar"
                style={styles.visualWrapper}
              >
                <ItemBar
                  items={gameData.items}
                  loadout={runItemLoadout}
                  allowedItemKeys={LEVEL_LOADOUT_ITEM_KEYS}
                  selectedItem={selectedItem}
                  onSelectItem={handleItemSelect}
                  showAddTurns={false}
                />
              </VisualElementView>
            )}
          </Animated.View>
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

      {boardSkillCastEffect && (
        <BoardSkillCastEffect
          events={boardSkillCastEffect}
          onDone={() => setBoardSkillCastEffect(null)}
        />
      )}

      <BattleNoticeOverlay
        message={battleNoticeMessage}
        messageKey={battleNoticeKey}
      />

      {showExitConfirm && (
        <View style={styles.exitOverlay}>
          <View style={styles.exitCard}>
            <Text style={styles.exitTitle}>나가기</Text>
            <Text style={styles.exitMessage}>
              현재 진행 상황은 저장되지 않습니다. 나가시겠습니까?
            </Text>
            <View style={styles.exitButtonRow}>
              <TouchableOpacity
                style={[styles.exitBtn, styles.exitCancelBtn]}
                onPress={() => setShowExitConfirm(false)}
              >
                <Text style={styles.exitBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exitBtn, styles.exitConfirmBtn]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.exitBtnText}>나가기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {comboBurstValue >= 3 && (
        <View pointerEvents="none" style={styles.comboOverlay}>
          <Animated.View
            style={[
              styles.comboShockwaveFlash,
              {
                opacity: comboBurstAnim.interpolate({
                  inputRange: [0, 0.14, 1],
                  outputRange: [0, 0.28, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    scale: comboBurstAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.42, 1.34],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.comboShockwaveRing,
              {
                opacity: comboBurstAnim.interpolate({
                  inputRange: [0, 0.1, 1],
                  outputRange: [0, 0.82, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    scale: comboBurstAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 1.9],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.comboShockwaveRingSecondary,
              {
                opacity: comboBurstAnim.interpolate({
                  inputRange: [0, 0.22, 1],
                  outputRange: [0, 0.58, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    scale: comboBurstAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.12, 2.25],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.comboCenterBadge,
              {
                opacity: comboBurstAnim.interpolate({
                  inputRange: [0, 0.08, 0.86, 1],
                  outputRange: [0, 1, 1, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    scale: comboBurstAnim.interpolate({
                      inputRange: [0, 0.16, 1],
                      outputRange: [0.58, 1.12, 1.42],
                      extrapolate: 'clamp',
                    }),
                  },
                  {
                    translateY: comboBurstAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, -10],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.comboCenterLabel}>COMBO</Text>
            <Text style={styles.comboCenterValue}>{comboBurstValue}</Text>
          </Animated.View>
        </View>
      )}

      {victoryState && (
        <View style={styles.victoryOverlay}>
          <View style={styles.victoryCard}>
            <Text style={styles.victoryTitle}>몬스터 처치 성공!</Text>
            <Text style={styles.victoryDamageText}>
              총 대미지 {totalDamageRef.current.toLocaleString()} / 최대 콤보{' '}
              {maxComboRef.current}
            </Text>

            <View style={styles.victoryMainRow}>
              <View style={styles.victoryAvatarSlot}>
                <View style={styles.victoryAvatarFrame}>
                  {renderCharacterPortrait(victoryState.characterId, 86)}
                </View>
                <Text style={styles.victoryAvatarName}>
                  {
                    (
                      CHARACTER_VISUALS[victoryState.characterId] ??
                      CHARACTER_VISUALS.knight
                    ).name
                  }
                </Text>
              </View>

              <View style={styles.victoryRewardCol}>
                <View style={styles.victoryRewardRow}>
                  <Text style={styles.victoryRewardLabel}>골드</Text>
                  <Text style={styles.victoryRewardValue}>
                    +{victoryState.rewardGold}
                  </Text>
                </View>
                <View style={styles.victoryRewardRow}>
                  <Text style={styles.victoryRewardLabel}>보석</Text>
                  <Text style={styles.victoryRewardValue}>
                    +{victoryState.rewardDiamonds}
                  </Text>
                </View>
                <View style={styles.victoryRewardRow}>
                  <Text style={styles.victoryRewardLabel}>경험치</Text>
                  <Text style={styles.victoryRewardValue}>
                    +{victoryState.rewardXp}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.victoryXpCard}>
              <View style={styles.victoryXpHeader}>
                <Text style={styles.victoryXpLabel}>
                  레벨 {victoryDisplayedLevel}
                </Text>
                <Text style={styles.victoryXpText}>
                  {victoryDisplayedXpCurrent} / {victoryDisplayedXpMax}
                </Text>
              </View>
              <View style={styles.victoryXpTrack}>
                <Animated.View
                  style={[
                    styles.victoryXpFill,
                    {
                      width: victoryXpAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={styles.victoryXpMeta}>
                {victoryState.fromLevel !== victoryState.toLevel
                  ? `Lv.${victoryState.fromLevel} → Lv.${victoryState.toLevel}`
                  : `현재 레벨 Lv.${victoryState.toLevel}`}
              </Text>
            </View>

            <TouchableOpacity
              disabled={!victoryReady}
              style={[
                styles.victoryConfirmBtn,
                !victoryReady && styles.victoryConfirmBtnDisabled,
              ]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.victoryConfirmText}>
                {victoryReady ? '확인' : '정산 중...'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {defeatState && (
        <View style={styles.defeatOverlay}>
          <View style={styles.defeatCard}>
            <Text style={styles.defeatTitle}>전투 실패</Text>
            <Text style={styles.defeatReason}>
              {defeatState.reason === 'hp_zero'
                ? '체력이 모두 소진되었습니다.'
                : '더 이상 블록을 놓을 자리가 없습니다.'}
            </Text>

            <View style={styles.defeatMainRow}>
              <View style={styles.victoryAvatarSlot}>
                <View
                  style={[styles.victoryAvatarFrame, styles.defeatAvatarFrame]}
                >
                  {renderCharacterPortrait(defeatState.characterId, 86)}
                </View>
                <Text style={styles.victoryAvatarName}>
                  {
                    (
                      CHARACTER_VISUALS[defeatState.characterId] ??
                      CHARACTER_VISUALS.knight
                    ).name
                  }
                </Text>
              </View>

              <View style={styles.defeatInfoCol}>
                <View style={styles.defeatInfoRow}>
                  <Text style={styles.defeatInfoLabel}>남은 몬스터 체력</Text>
                  <Text style={styles.defeatInfoValue}>
                    {defeatState.remainingMonsterHp.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.defeatInfoRow}>
                  <Text style={styles.defeatInfoLabel}>누적 대미지</Text>
                  <Text style={styles.defeatInfoValue}>
                    {defeatState.totalDamage.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.defeatInfoRow}>
                  <Text style={styles.defeatInfoLabel}>최대 콤보</Text>
                  <Text style={styles.defeatInfoValue}>
                    {defeatState.maxCombo}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.defeatButtonRow}>
              <TouchableOpacity
                style={[styles.defeatBtn, styles.defeatRetryBtn]}
                onPress={handleRetryLevel}
              >
                <Text style={styles.defeatBtnText}>다시 도전</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.defeatBtn, styles.defeatExitBtn]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.defeatBtnText}>나가기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {levelUpState && (
        <View pointerEvents="none" style={styles.levelUpOverlay}>
          {LEVEL_UP_BURST_POINTS.map((point, index) => (
            <Animated.View
              key={`${point.x}-${point.y}-${index}`}
              style={[
                styles.levelUpBurstDot,
                {
                  backgroundColor: point.color,
                  opacity: levelUpAnim.interpolate({
                    inputRange: [0, 0.2, 0.8, 1],
                    outputRange: [0, 1, 1, 0],
                    extrapolate: 'clamp',
                  }),
                  transform: [
                    {
                      translateX: levelUpAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, point.x],
                        extrapolate: 'clamp',
                      }),
                    },
                    {
                      translateY: levelUpAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, point.y],
                        extrapolate: 'clamp',
                      }),
                    },
                    {
                      scale: levelUpAnim.interpolate({
                        inputRange: [0, 0.3, 1],
                        outputRange: [0.2, 1, 0.85],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
          <Animated.View
            style={[
              styles.levelUpCard,
              {
                opacity: levelUpAnim.interpolate({
                  inputRange: [0, 0.15, 1],
                  outputRange: [0, 1, 0.96],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    scale: levelUpAnim.interpolate({
                      inputRange: [0, 0.2, 1],
                      outputRange: [0.7, 1.08, 1],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.levelUpBadge}>LEVEL UP</Text>
            <Text style={styles.levelUpTitle}>레벨업!</Text>
            <Text style={styles.levelUpValue}>
              Lv.{levelUpState.fromLevel} → Lv.{levelUpState.toLevel}
            </Text>
            <Text style={styles.levelUpSubtext}>
              스킬 포인트 +{levelUpState.skillPointsGained}
            </Text>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1e' },
  screenBackground: {
    flex: 1,
  },
  backgroundTint: {
    flex: 1,
  },
  screenContent: {
    flex: 1,
  },
  visualWrapper: {
    alignSelf: 'stretch',
  },
  boardSkillEffectLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    elevation: 30,
  },
  missingContainer: {
    flex: 1,
    backgroundColor: '#0f0a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  missingText: { color: '#fff', fontSize: 18, marginBottom: 20 },
  missingLink: { color: '#6366f1', fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
  },
  backBtn: { color: '#94a3b8', fontSize: 20, fontWeight: 'bold' },
  stageLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerSideSpacer: {
    width: 40,
  },
  battleLane: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: 12,
    marginBottom: 22,
    gap: 6,
  },
  battleUnit: {
    width: 82,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  unitAvatarFrame: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    overflow: 'visible',
  },
  monsterAvatarFrame: {},
  playerAvatarFrame: {},
  monsterDamageHost: {
    position: 'absolute',
    top: -18,
    left: -22,
    right: -22,
    bottom: -10,
    alignItems: 'center',
    overflow: 'visible',
    zIndex: 8,
  },
  monsterEmojiCompact: {
    fontSize: 34,
  },
  characterFallbackBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  characterFallbackEmoji: {
    color: '#f8fafc',
  },
  playerFallbackBadge: {
    width: 38,
    height: 38,
  },
  playerEmojiCompact: {
    fontSize: 30,
  },
  playerAvatarSpriteWrap: {
    width: 64,
    height: 76,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  unitName: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 3,
  },
  compactHpTrack: {
    width: '100%',
    height: 7,
    backgroundColor: '#1e293b',
    borderRadius: 999,
    overflow: 'hidden',
  },
  compactHpFill: {
    height: 7,
    borderRadius: 999,
  },
  compactHpText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  battleCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  centerInfoCard: {
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(71,85,105,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
  },
  centerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  centerInfoText: {
    flex: 1,
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  centerInfoStatus: {
    flex: 1,
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  centerInfoTextActive: {
    color: '#fbbf24',
  },
  summonInlineCard: {
    marginTop: 2,
    gap: 4,
  },
  summonInlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  summonInlineTitle: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '800',
  },
  summonInlineMeta: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
  },
  summonInlineTrack: {
    height: 7,
    backgroundColor: '#334155',
    borderRadius: 999,
    overflow: 'hidden',
  },
  summonInlineFill: {
    height: 7,
    backgroundColor: '#f59e0b',
    borderRadius: 999,
  },
  summonInlineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  summonInlineBtn: {
    backgroundColor: '#4338ca',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  summonInlineBtnActive: {
    backgroundColor: '#16a34a',
  },
  summonInlineBtnDisabled: {
    backgroundColor: '#475569',
  },
  summonInlineBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  monsterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 10,
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 10,
  },
  monsterEmoji: { fontSize: 40 },
  monsterInfo: { flex: 1, gap: 4 },
  monsterName: { fontSize: 14, fontWeight: '800' },
  hpBarBg: {
    height: 10,
    backgroundColor: '#334155',
    borderRadius: 5,
    overflow: 'hidden',
  },
  hpBarFill: { height: 10, borderRadius: 5 },
  hpText: { color: '#94a3b8', fontSize: 11 },
  atkInfo: { alignItems: 'center' },
  atkLabel: { color: '#94a3b8', fontSize: 10 },
  atkValue: { color: '#f97316', fontSize: 18, fontWeight: '900' },
  playerStatusCard: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1d4ed8',
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
  playerHpBarBg: {
    height: 10,
    backgroundColor: '#1e293b',
    borderRadius: 5,
    overflow: 'hidden',
  },
  playerHpBarFill: { height: 10, borderRadius: 5 },
  playerMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  boardContainer: {
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 38,
    paddingBottom: 8,
  },
  boardVisualAnchor: {
    alignSelf: 'center',
  },
  bottomActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 2,
  },
  bottomPieceArea: {
    flex: 1,
  },
  itemHintRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  itemHint: { color: '#fbbf24', fontSize: 13, fontWeight: '600' },
  cancelItem: {
    color: '#94a3b8',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  noticeOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 118,
    alignItems: 'center',
  },
  noticeChip: {
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  noticeText: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '800',
  },
  exitOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,7,18,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  exitCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: 'rgba(15,23,42,0.97)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(59,130,246,0.34)',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  exitTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  exitMessage: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  exitButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  exitBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  exitCancelBtn: {
    backgroundColor: '#334155',
  },
  exitConfirmBtn: {
    backgroundColor: '#2563eb',
  },
  exitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  comboOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 0,
  },
  comboShockwaveFlash: {
    position: 'absolute',
    width: 146,
    height: 146,
    borderRadius: 999,
    backgroundColor: 'rgba(250, 204, 21, 0.26)',
  },
  comboShockwaveRing: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(250, 204, 21, 0.95)',
    shadowColor: '#facc15',
    shadowOpacity: 0.65,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 18,
  },
  comboShockwaveRingSecondary: {
    position: 'absolute',
    width: 192,
    height: 192,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(96, 165, 250, 0.72)',
  },
  comboCenterBadge: {
    minWidth: 148,
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(250, 204, 21, 0.72)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 18,
  },
  comboCenterLabel: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  comboCenterValue: {
    marginTop: 4,
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '900',
  },
  hitEffect: {
    position: 'absolute',
    zIndex: 4,
  },
  damageFlash: {
    position: 'absolute',
    top: -22,
    alignSelf: 'center',
    backgroundColor: 'rgba(239,68,68,0.92)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 5,
  },
  damageFlashText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  victoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,7,18,0.76)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  victoryCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(15,23,42,0.96)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(59,130,246,0.5)',
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  victoryTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  victoryDamageText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  victoryMainRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 18,
    alignItems: 'center',
  },
  victoryAvatarSlot: {
    width: 108,
    alignItems: 'center',
  },
  victoryAvatarFrame: {
    width: 96,
    height: 108,
    borderRadius: 20,
    backgroundColor: 'rgba(30,41,59,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  victoryAvatarFallback: {
    fontSize: 46,
  },
  victoryAvatarName: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  victoryRewardCol: {
    flex: 1,
    gap: 10,
  },
  victoryRewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(30,41,59,0.72)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  victoryRewardLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  victoryRewardValue: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '900',
  },
  victoryXpCard: {
    marginTop: 18,
    backgroundColor: 'rgba(30,41,59,0.7)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  victoryXpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  victoryXpLabel: {
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '800',
  },
  victoryXpText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
  },
  victoryXpTrack: {
    height: 14,
    backgroundColor: '#1e293b',
    borderRadius: 999,
    overflow: 'hidden',
  },
  victoryXpFill: {
    height: 14,
    borderRadius: 999,
    backgroundColor: '#38bdf8',
  },
  victoryXpMeta: {
    color: '#bfdbfe',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'right',
  },
  victoryConfirmBtn: {
    marginTop: 18,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  victoryConfirmBtnDisabled: {
    backgroundColor: '#475569',
  },
  victoryConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  defeatOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,10,19,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  defeatCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(24,16,27,0.97)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.45)',
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  defeatTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  defeatReason: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  defeatMainRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 18,
    alignItems: 'center',
  },
  defeatAvatarFrame: {
    borderColor: 'rgba(239,68,68,0.28)',
    backgroundColor: 'rgba(40,18,27,0.92)',
  },
  defeatInfoCol: {
    flex: 1,
    gap: 10,
  },
  defeatInfoRow: {
    backgroundColor: 'rgba(48,20,29,0.72)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  defeatInfoLabel: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: '700',
  },
  defeatInfoValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },
  defeatButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  defeatBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  defeatRetryBtn: {
    backgroundColor: '#dc2626',
  },
  defeatExitBtn: {
    backgroundColor: '#334155',
  },
  defeatBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  levelUpOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelUpBurstDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  levelUpCard: {
    minWidth: 220,
    paddingHorizontal: 22,
    paddingVertical: 18,
    backgroundColor: 'rgba(15,23,42,0.94)',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(250,204,21,0.9)',
    alignItems: 'center',
    shadowColor: '#facc15',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 16,
  },
  levelUpBadge: {
    color: '#fcd34d',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  levelUpTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '900',
  },
  levelUpValue: {
    color: '#38bdf8',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },
  levelUpSubtext: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
});
