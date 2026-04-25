import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Text,
  Animated,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Board from '../components/Board';
import PieceSelector from '../components/PieceSelector';
import ItemBar from '../components/ItemBar';
import BattleNoticeOverlay from '../components/BattleNoticeOverlay';
import ComboGaugeOverlay from '../components/ComboGaugeOverlay';
import GameHeader from '../components/GameHeader';
import NextPiecePreview from '../components/NextPiecePreview';
import BoardSkillCastEffect, {
  type BoardSkillCastEffectEvent,
} from '../components/BoardSkillCastEffect';
import PiecePlacementEffect from '../components/PiecePlacementEffect';
import LineClearEffect from '../components/LineClearEffect';
import SkillTriggerBoardEffect from '../components/SkillTriggerBoardEffect';
import BaseVisualElementView, {
  buildVisualAutomationLabel,
  buildVisualElementStyle,
} from '../components/VisualElementView';
import { flushPlayerStateNow } from '../services/playerState';
import { playGameBgm, stopGameBgm } from '../services/gameAudio';
import { playGameSfx } from '../services/gameSfx';
import { playBlockPlacementSound } from '../services/placementSound';
import { playLineClearSound } from '../services/lineClearSound';
import { submitEndlessLeaderboard } from '../services/rankingService';
import { useVisualConfig } from '../hooks/useVisualConfig';
import {
  getGameplayDragTuning,
  getVisualElementRule,
  type VisualViewport,
} from '../game/visualConfig';
import { useDragDrop } from '../game/useDragDrop';
import {
  LEVEL_THRESHOLDS,
  FEVER_MAX,
  FEVER_DURATION,
  COMBO_TIMEOUT_MS,
  ENDLESS_GOLD_MILESTONES,
} from '../constants';
import {
  createBoard,
  generatePlaceablePieces,
  placePiece,
  checkAndClearLines,
  countBlocks,
  canPlacePiece,
  canPlaceAnyPiece,
  getDifficulty,
  getEndlessLevel,
  addEndlessHardObstacles,
  resetPieceGenerationHistory,
  Piece,
  Board as BoardType,
} from '../game/engine';
import { resolveCombatTurn } from '../game/combatFlow';
import {
  applyCombatDamageEffectsDetailed,
  getCharacterSkillEffects,
  getPieceGenerationOptions,
} from '../game/characterSkillEffects';
import {
  loadGameData,
  addGold,
  useItem as consumeItem,
  loadEndlessStats,
  saveEndlessStats,
  loadDailyStats,
  updateDailyStats,
  GameData,
  getSelectedCharacter,
  getUnlockedSpecialPieceShapeIndices,
  loadCharacterData,
  collectSpecialBlockRewards,
  loadSkinData,
} from '../stores/gameStore';
import { getCharacterAtk } from '../constants/characters';
import {
  getSkinBoardBg,
  getSkinColors,
  setActiveSkin,
} from '../game/skinContext';
import {
  applySkinCombatDamage,
  applySkinRewardBonuses,
  getActiveSkinLoadout,
  mergeSkinPieceGenerationOptions,
} from '../game/skinSummonRuntime';
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
  buildBoardCellEffectCells,
  buildPiecePlacementEffectCells,
  type PiecePlacementEffectCell,
} from '../game/piecePlacementEffect';
import {
  buildLineClearEffectCells,
  type LineClearEffectCell,
} from '../game/lineClearEffect';
import { scaleGameplayUnit } from '../game/layoutScale';
import { applySkillBoardEffects } from '../game/skillBoardEffects';
import { type MeasuredBoardLayout } from '../game/boardScreenMetrics';
import {
  ENDLESS_LOADOUT_ITEM_KEYS,
  createDefaultStartingItemLoadout,
  getItemDefinition,
  resolveStartingItemLoadout,
  type ActiveItemKey,
  type StartingItemLoadoutSlot,
} from '../constants/itemCatalog';

export default function EndlessScreen({ navigation }: any) {
  const windowDimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const visualViewport: VisualViewport = {
    width: windowDimensions.width,
    height: windowDimensions.height,
    safeTop: insets.top,
    safeBottom: insets.bottom,
  };
  const modeVerticalGutter = scaleGameplayUnit(46, visualViewport, 16);
  const { manifest: visualManifest } = useVisualConfig();
  const dragTuning = getGameplayDragTuning(visualManifest);

  useEffect(() => {
    playGameBgm('endless');
    return () => stopGameBgm();
  }, [visualManifest.version]);
  const [board, setBoard] = useState<BoardType>(createBoard());
  const [pieces, setPieces] = useState<(Piece | null)[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboRemainingMs, setComboRemainingMs] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [feverGauge, setFeverGauge] = useState(0);
  const [feverActive, setFeverActive] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [runItemLoadout, setRunItemLoadout] = useState<StartingItemLoadoutSlot[]>(
    createDefaultStartingItemLoadout(),
  );
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState('knight');
  const [boardLayout, setBoardLayout] = useState<MeasuredBoardLayout | null>(
    null,
  );
  const [attackPower, setAttackPower] = useState(10);
  const [nextMilestoneIdx, setNextMilestoneIdx] = useState(0);
  const [goldEarned, setGoldEarned] = useState(0);
  const [milestoneText, setMilestoneText] = useState('');
  const [skinBoardBg, setSkinBoardBg] = useState(getSkinBoardBg());
  const [feverRemainingMs, setFeverRemainingMs] = useState(0);
  const [nextPieces, setNextPieces] = useState<Piece[]>([]);
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

  const boardRef = useRef<View>(null);
  const placementEffectIdRef = useRef(0);
  const lineClearEffectIdRef = useRef(0);
  const boardSkillEffectIdRef = useRef(0);
  const maxComboRef = useRef(0);
  const feverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feverTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feverExpireAtRef = useRef<number | null>(null);
  const feverActiveRef = useRef(false);
  const feverRemainingMsRef = useRef(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const comboExpireAtRef = useRef<number | null>(null);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const linesClearedRef = useRef(0);
  const nextMilestoneRef = useRef(0);
  const goldEarnedRef = useRef(0);
  const gameDataRef = useRef<GameData | null>(null);
  const baseAttackPowerRef = useRef(10);
  const powerItemMultiplierRef = useRef(1);
  const startedAtRef = useRef(Date.now());
  const skillEffectsRef = useRef(getCharacterSkillEffects(null, null));
  const smallPieceStreakRef = useRef(0);
  const lastPlacementAtRef = useRef<number | null>(null);
  const activeSkinIdRef = useRef(0);
  const skinBattleEffectsRef = useRef(getActiveSkinLoadout(null).effects);
  const nextPiecesRef = useRef<Piece[]>([]);
  const skillNoticeModeRef = useRef<SkillTriggerNoticeMode>('triggered_only');
  const screenShakeEnabledRef = useRef(true);
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

  const milestoneAnim = useRef(new Animated.Value(0)).current;
  const boardShakeAnim = useRef(new Animated.Value(0)).current;

  const getCurrentPieceOptions = useCallback(
    () => ({
      ...mergeSkinPieceGenerationOptions(
        getPieceGenerationOptions(skillEffectsRef.current),
        activeSkinIdRef.current,
      ),
      rewardMode: 'endless' as const,
      unlockedSpecialShapeIndices: getUnlockedSpecialPieceShapeIndices(
        gameDataRef.current,
      ),
    }),
    [],
  );

  const updateNextPieces = useCallback((piecesToPreview: Piece[]) => {
    nextPiecesRef.current = piecesToPreview;
    setNextPieces(piecesToPreview);
  }, []);

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
        ENDLESS_LOADOUT_ITEM_KEYS,
      ).map(slot => ({
        itemKey: slot.itemKey,
        count: slot.effectiveCount,
      })),
    [],
  );

  const shouldUseCompactEndlessLayout = useCallback(() => {
    const nextPreviewRule = getVisualElementRule(
      visualManifest,
      'endless',
      'next_preview',
      selectedCharacterId,
    );
    return nextPreviewRule.visible;
  }, [selectedCharacterId, visualManifest]);

  const showPlacementEffect = useCallback(
    (piece: Piece, row: number, col: number) => {
      if (!boardLayout) {
        return;
      }
      const compactLayout = shouldUseCompactEndlessLayout();
      const cells = buildPiecePlacementEffectCells(
        boardLayout,
        piece,
        row,
        col,
        compactLayout,
        visualViewport,
      );
      if (cells.length === 0) {
        return;
      }
      placementEffectIdRef.current += 1;
      setPlacementEffect({ id: placementEffectIdRef.current, cells });
    },
    [boardLayout, shouldUseCompactEndlessLayout, visualViewport],
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
      setLineClearEffect({ id: lineClearEffectIdRef.current, cells });
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

      const compactLayout = shouldUseCompactEndlessLayout();
      const events = animations
        .map(animation => {
          const cells = buildBoardCellEffectCells(
            boardLayout,
            animation.cells,
            compactLayout,
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
    [
      boardLayout,
      boardShakeAnim,
      shouldUseCompactEndlessLayout,
      triggerBoardShake,
      visualViewport,
    ],
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

  const buildPiecePack = useCallback(
    (difficulty: 'easy' | 'medium' | 'hard', targetBoard: BoardType) =>
      generatePlaceablePieces(
        targetBoard,
        difficulty,
        getSkinColors(),
        getCurrentPieceOptions(),
      ),
    [getCurrentPieceOptions],
  );

  const isPiecePackPlaceable = useCallback(
    (targetBoard: BoardType, pack: Piece[]) =>
      pack.length === 3 &&
      pack.every(piece => canPlaceAnyPiece(targetBoard, [piece])),
    [],
  );

  useEffect(() => {
    startedAtRef.current = Date.now();
    resetPieceGenerationHistory();
    const initialBoard = createBoard();
    setBoard(initialBoard);
    lastPlacementAtRef.current = null;
    activeSkinIdRef.current = 0;
    skinBattleEffectsRef.current = getActiveSkinLoadout(null).effects;
    feverExpireAtRef.current = null;
    feverRemainingMsRef.current = 0;
    setPlacementEffect(null);
    setLineClearEffect(null);
    setFeverRemainingMs(0);
    setComboRemainingMs(0);
    updateNextPieces([]);
    setSelectedItem(null);
    setRunItemLoadout(createDefaultStartingItemLoadout());
    powerItemMultiplierRef.current = 1;
    baseAttackPowerRef.current = 10;
    updateAttackPowerWithPotion(10);
    const initialPack = buildPiecePack('easy', initialBoard);
    setPieces(initialPack);
    updateNextPieces(buildPiecePack('easy', initialBoard));
    (async () => {
      const [loadedGameData, skinData, charId, settings] = await Promise.all([
        loadGameData(),
        loadSkinData(),
        getSelectedCharacter(),
        loadGameSettings(),
      ]);
      setGameData(loadedGameData);
      gameDataRef.current = loadedGameData;
      setRunItemLoadout(buildRunItemLoadout(loadedGameData));
      skillNoticeModeRef.current = settings.skillTriggerNoticeMode;
      screenShakeEnabledRef.current = settings.screenShake;
      setSelectedCharacterId(charId ?? 'knight');

      setActiveSkin(skinData.activeSkinId);
      setSkinBoardBg(getSkinBoardBg());
      const skinLoadout = getActiveSkinLoadout(skinData);
      activeSkinIdRef.current = skinLoadout.skinId;
      skinBattleEffectsRef.current = skinLoadout.effects;

      if (!charId) {
        const refreshedPack = buildPiecePack('easy', initialBoard);
        setPieces(refreshedPack);
        updateNextPieces(buildPiecePack('easy', initialBoard));
        return;
      }

      const charData = await loadCharacterData(charId);
      const effects = getCharacterSkillEffects(charId, charData, {
        mode: 'endless',
      });
      skillEffectsRef.current = effects;
      updateAttackPowerWithPotion(
        Math.round(
          getCharacterAtk(charId, charData.level) *
            effects.baseAttackMultiplier *
            skinLoadout.effects.attackBonusMultiplier,
        ),
      );
      const refreshedPack = buildPiecePack('easy', initialBoard);
      setPieces(refreshedPack);
      updateNextPieces(buildPiecePack('easy', initialBoard));
    })();
    setTimeout(() => {
      boardRef.current?.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setBoardLayout({ x, y, width, height });
        },
      );
    }, 300);
  }, [
    buildPiecePack,
    buildRunItemLoadout,
    updateAttackPowerWithPotion,
    updateNextPieces,
  ]);

  const clearFeverTimers = useCallback(() => {
    if (feverTimerRef.current) {
      clearTimeout(feverTimerRef.current);
      feverTimerRef.current = null;
    }
    if (feverTickerRef.current) {
      clearInterval(feverTickerRef.current);
      feverTickerRef.current = null;
    }
  }, []);

  const stopFever = useCallback(() => {
    clearFeverTimers();
    feverExpireAtRef.current = null;
    feverRemainingMsRef.current = 0;
    feverActiveRef.current = false;
    setFeverActive(false);
    setFeverGauge(0);
    setFeverRemainingMs(0);
  }, [clearFeverTimers]);

  const activateFever = useCallback(() => {
    const durationMs =
      FEVER_DURATION +
      skillEffectsRef.current.feverDurationBonusMs +
      skinBattleEffectsRef.current.feverDurationBonusMs;

    clearFeverTimers();
    feverActiveRef.current = true;
    feverExpireAtRef.current = Date.now() + durationMs;
    feverRemainingMsRef.current = durationMs;
    setFeverActive(true);
    setFeverGauge(FEVER_MAX);
    setFeverRemainingMs(durationMs);

    feverTickerRef.current = setInterval(() => {
      if (!feverExpireAtRef.current) {
        return;
      }
      const remaining = Math.max(0, feverExpireAtRef.current - Date.now());
      feverRemainingMsRef.current = remaining;
      setFeverRemainingMs(remaining);
      if (remaining <= 0) {
        stopFever();
      }
    }, 50);

    feverTimerRef.current = setTimeout(() => {
      stopFever();
    }, durationMs);
  }, [clearFeverTimers, stopFever]);

  const showMilestoneBanner = useCallback(
    (text: string) => {
      setMilestoneText(text);
      milestoneAnim.setValue(0);
      Animated.sequence([
        Animated.timing(milestoneAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(milestoneAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [milestoneAnim],
  );

  useEffect(() => {
    return () => {
      clearFeverTimers();
      if (comboTimerRef.current) {
        clearTimeout(comboTimerRef.current);
      }
      if (comboTickerRef.current) {
        clearInterval(comboTickerRef.current);
      }
    };
  }, [clearFeverTimers]);

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
    }, 100);

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

  const endGame = useCallback(async () => {
    if (gameOver) {
      return;
    }
    setGameOver(true);
    playGameSfx('defeat');
    clearFeverTimers();
    feverExpireAtRef.current = null;
    feverRemainingMsRef.current = 0;
    setFeverRemainingMs(0);
    if (comboTimerRef.current) {
      clearTimeout(comboTimerRef.current);
    }
    if (comboTickerRef.current) {
      clearInterval(comboTickerRef.current);
      comboTickerRef.current = null;
    }
    comboExpireAtRef.current = null;
    setComboRemainingMs(0);

    const finalScore = scoreRef.current;
    const finalLines = linesClearedRef.current;
    const finalGold = goldEarnedRef.current;

    const stats = await loadEndlessStats();
    await saveEndlessStats(
      stats,
      finalScore,
      finalLines,
      currentLevel,
      maxComboRef.current,
    );
    const dailyStats = await loadDailyStats();
    await updateDailyStats(dailyStats, {
      games: 1,
      score: finalScore,
      lines: finalLines,
      maxCombo: maxComboRef.current,
    });

    void submitEndlessLeaderboard({
      finalScore,
      maxLevel: currentLevel,
      maxCombo: maxComboRef.current,
      playTimeMs:
        startedAtRef.current > 0 ? Date.now() - startedAtRef.current : 0,
      totalLines: finalLines,
    });

    void flushPlayerStateNow('endless_end');

    const isHighScore = finalScore > stats.highScore;
    Alert.alert(
      isHighScore ? '최고 기록 갱신!' : '게임 종료',
      `점수: ${finalScore.toLocaleString()}\n레벨: ${currentLevel}\n클리어 줄: ${finalLines}\n최대 콤보: ${
        maxComboRef.current
      }\n획득 골드: +${finalGold}`,
      [{ text: '확인', onPress: () => navigation.goBack() }],
    );
  }, [clearFeverTimers, currentLevel, gameOver, navigation]);

  const checkMilestones = useCallback(
    async (newScore: number) => {
      let idx = nextMilestoneRef.current;
      let totalGoldGained = 0;

      while (
        idx < ENDLESS_GOLD_MILESTONES.length &&
        newScore >= ENDLESS_GOLD_MILESTONES[idx].score
      ) {
        const milestone = ENDLESS_GOLD_MILESTONES[idx];
        totalGoldGained += milestone.gold;
        idx++;
      }

      if (totalGoldGained > 0) {
        totalGoldGained = applySkinRewardBonuses(
          Math.round(
            totalGoldGained * skillEffectsRef.current.rewardGoldMultiplier,
          ),
          activeSkinIdRef.current,
        );
        const newIdx = idx;
        nextMilestoneRef.current = newIdx;
        setNextMilestoneIdx(newIdx);
        goldEarnedRef.current += totalGoldGained;
        setGoldEarned(prev => prev + totalGoldGained);

        const gd = gameDataRef.current;
        if (gd) {
          const updated = await addGold(gd, totalGoldGained);
          gameDataRef.current = updated;
          setGameData(updated);
        }

        const nextScore = ENDLESS_GOLD_MILESTONES[newIdx]?.score;
        showMilestoneBanner(
          `+${totalGoldGained} 골드! 다음 목표: ${
            nextScore?.toLocaleString() ?? '최대'
          }`,
        );
      }
    },
    [showMilestoneBanner],
  );

  const handlePlace = useCallback(
    (pieceIndex: number, row: number, col: number) => {
      if (gameOver) {
        return;
      }
        const piece = pieces[pieceIndex];
        if (!piece) {
          return;
        }
        if (!canPlacePiece(board, piece.shape, row, col)) {
          playGameSfx('blockPlaceFail');
          return;
        }

      let newBoard = placePiece(board, piece, row, col);
      playBlockPlacementSound();
      showPlacementEffect(piece, row, col);
      const blockCount = countBlocks(piece.shape);

      let totalLines = 0;
      let totalGemsFound = 0;
      const totalItemsFound: string[] = [];
      const clearedEffectCells: LineClearEffectCell[] = [];

      while (true) {
        const result = checkAndClearLines(newBoard);
        const clearedLines =
          result.clearedRows.length + result.clearedCols.length;
        if (clearedLines === 0) {
          break;
        }
        clearedEffectCells.push(
          ...buildLineClearEffectCells(newBoard, result.newBoard),
        );
        newBoard = result.newBoard;
        totalLines += clearedLines;
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
      clearedEffectCells.push(
        ...buildLineClearEffectCells(newBoard, boardSkillResult.board),
      );
      newBoard = boardSkillResult.board;
      totalLines += boardSkillResult.extraLinesCleared;
      totalGemsFound += boardSkillResult.gemsFound;
      totalItemsFound.push(...boardSkillResult.itemsFound);
      showLineClearEffect(clearedEffectCells);

      const turnResult = resolveCombatTurn({
        mode: 'endless',
        blockCount,
        attackPower,
        clearedLines: totalLines,
        combo: comboRef.current,
        comboBonus: boardSkillResult.comboChainBonus,
        feverActive: feverActiveRef.current,
        feverGauge,
        feverLinesRequired: Math.max(
          1,
          Math.round(20 * effects.feverRequirementMultiplier),
        ),
        feverGaugeGainMultiplier:
          effects.feverGaugeGainMultiplier *
          skinBattleEffectsRef.current.feverGaugeGainMultiplier,
      });
      if (turnResult.nextCombo > maxComboRef.current) {
        maxComboRef.current = turnResult.nextCombo;
      }

        comboRef.current = turnResult.nextCombo;
        setCombo(turnResult.nextCombo);
        if (turnResult.didClear) {
          if (turnResult.nextCombo > 1) {
            playGameSfx('combo');
          }
          resetComboTimer();
        }

      const scoreResult = applyCombatDamageEffectsDetailed(
        turnResult.score,
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
      showSkillTriggerNotice(...scoreResult.events);
      const fastPlacementDetail = scoreResult.details.find(
        detail => detail.event === 'fast_placement' && detail.bonusAmount > 0,
      );
      if (fastPlacementDetail) {
        showSkillEffect(
          `신속 배치 +${fastPlacementDetail.bonusAmount.toLocaleString()}`,
          1800,
        );
      }
      const skinScore = applySkinCombatDamage(
        scoreResult.amount,
        activeSkinIdRef.current,
        {
          combo: turnResult.nextCombo,
          didClear: turnResult.didClear,
        },
      ).damage;
      const scoreThisTurn = skinScore;
      const newScore = score + scoreThisTurn;
      const newLines = linesCleared + totalLines;
      scoreRef.current = newScore;
      linesClearedRef.current = newLines;

      let newFeverGauge = turnResult.nextFeverGauge;
      if (turnResult.feverTriggered) {
        activateFever();
        newFeverGauge = FEVER_MAX;
      }

      const effectiveScoreForLevel = Math.floor(
        newScore * (1 - effects.endlessDifficultySlowRate),
      );
      const newLevel = getEndlessLevel(
        effectiveScoreForLevel,
        LEVEL_THRESHOLDS,
      );

      if (
        newLevel > currentLevel &&
        Math.random() < effects.endlessObstacleSpawnMultiplier
      ) {
        newBoard = addEndlessHardObstacles(newBoard, newLevel);
      }

        setBoard(newBoard);
        setScore(newScore);
        setLinesCleared(newLines);
        if (newLevel > currentLevel) {
          playGameSfx('levelUp');
        }
        setCurrentLevel(newLevel);
        setFeverGauge(newFeverGauge);

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
          setGameData(rewardResult.data);
        });
      }

      const newPieces = [...pieces];
      newPieces[pieceIndex] = null;
      const remaining = newPieces.filter(p => p !== null);
      if (remaining.length === 0) {
        const difficulty = getDifficulty(newLevel);
        const upcomingPack = isPiecePackPlaceable(
          newBoard,
          nextPiecesRef.current,
        )
          ? nextPiecesRef.current
          : buildPiecePack(difficulty, newBoard);
        newPieces[0] = upcomingPack[0];
        newPieces[1] = upcomingPack[1];
        newPieces[2] = upcomingPack[2];
        updateNextPieces(buildPiecePack(difficulty, newBoard));
      }
      setPieces(newPieces);

      checkMilestones(newScore);

      setTimeout(() => {
        const active = newPieces.filter(p => p !== null) as Piece[];
        if (!canPlaceAnyPiece(newBoard, active)) {
          endGame();
        }
      }, 200);
    },
    [
      activateFever,
      attackPower,
      board,
      checkMilestones,
      currentLevel,
      buildPiecePack,
      endGame,
      feverGauge,
      gameOver,
      isPiecePackPlaceable,
      linesCleared,
      pieces,
      resetComboTimer,
      score,
      showPlacementEffect,
      showLineClearEffect,
      showBoardSkillCastEffects,
      showSkillTriggerNotice,
      updateNextPieces,
    ],
  );

  const nextPreviewRule = getVisualElementRule(
    visualManifest,
    'endless',
    'next_preview',
    selectedCharacterId,
  );
  const boardRule = getVisualElementRule(
    visualManifest,
    'endless',
    'board',
    selectedCharacterId,
  );
  const useCompactLayout = shouldUseCompactEndlessLayout();
  const dragDrop = useDragDrop(
    board,
    pieces,
    boardLayout,
    handlePlace,
    useCompactLayout,
    0,
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
      if (!gameData || !itemDefinition || gameOver) {
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
        showBattleNotice(`${itemDefinition.label}이(가) 없습니다.`);
        return;
      }

      if (itemKey === 'refresh') {
        consumeItem(gameData, itemKey).then(updated => {
          if (updated) {
            setGameData(updated);
            gameDataRef.current = updated;
            const diff = getDifficulty(currentLevel);
            setPieces(buildPiecePack(diff, board));
            decrementRunItemSlot(slotIndex);
            setSelectedItem(null);
            showBattleNotice('새 블록으로 교체했습니다.');
          }
        });
        return;
      }

      if (itemDefinition.type !== 'power') {
        return;
      }

      const nextMultiplier = itemDefinition.powerMultiplier ?? 1;
      if (nextMultiplier <= powerItemMultiplierRef.current) {
        showBattleNotice('더 높은 등급의 파워업 포션이 필요합니다.');
        return;
      }

      consumeItem(gameData, itemKey).then(updated => {
        if (!updated) {
          return;
        }

        setGameData(updated);
        gameDataRef.current = updated;
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
    },
    [
      board,
      buildPiecePack,
      currentLevel,
      decrementRunItemSlot,
      gameData,
      gameOver,
      runItemLoadout,
      showBattleNotice,
      updateAttackPowerWithPotion,
    ],
  );

  const nextMilestone = ENDLESS_GOLD_MILESTONES[nextMilestoneIdx];
  const comboGaugeMaxMs =
    COMBO_TIMEOUT_MS + skillEffectsRef.current.comboWindowBonusMs;
  const comboGaugeRule = getVisualElementRule(
    visualManifest,
    'endless',
    'combo_gauge',
    selectedCharacterId,
  );
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
  const feverDurationMs =
    FEVER_DURATION +
    skillEffectsRef.current.feverDurationBonusMs +
    skinBattleEffectsRef.current.feverDurationBonusMs;
  const boardScaleX = boardRule.scale * (boardRule.widthScale ?? 1);
  const boardScaleY = boardRule.scale * (boardRule.heightScale ?? 1);
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
      <View style={styles.screenContent}>
      <VisualElementView screenId="endless" elementId="header">
        <GameHeader
          score={score}
          combo={combo}
          linesCleared={linesCleared}
          level={`무한 모드 레벨 ${currentLevel}`}
          goalText={
            nextMilestone
              ? `다음 골드: ${nextMilestone.score.toLocaleString()}점 / +${nextMilestone.gold}골드`
              : '최대 목표 달성!'
          }
          onBack={() => {
            Alert.alert('나가기', '게임을 종료하시겠습니까?', [
              { text: '취소', style: 'cancel' },
              { text: '나가기', onPress: () => endGame() },
            ]);
          }}
          feverActive={feverActive}
          feverGauge={feverGauge}
        />
      </VisualElementView>


      <Animated.View
        style={[
          styles.milestoneBanner,
          {
            opacity: milestoneAnim,
            transform: [
              {
                translateY: milestoneAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.milestoneBannerText}>{milestoneText}</Text>
      </Animated.View>

      {boardSkillCastEffect && (
        <BoardSkillCastEffect
          events={boardSkillCastEffect}
          onDone={() => setBoardSkillCastEffect(null)}
        />
      )}

      <BattleNoticeOverlay
        message={battleNoticeMessage}
        messageKey={battleNoticeKey}
        bottom={148}
      />


      <VisualElementView screenId="endless" elementId="status_bar">
        <View style={styles.goldBar}>
          <Text style={styles.goldBarText}>이번 라운드 골드: {goldEarned}</Text>
          {nextMilestone && (
            <Text style={styles.goldBarNext}>
              다음: {nextMilestone.score.toLocaleString()}점
            </Text>
          )}
        </View>
      </VisualElementView>



      <VisualElementView
        screenId="endless"
        elementId="next_preview"
        style={styles.visualWrapper}
      >
        {nextPreviewRule.visible ? (
          skillEffectsRef.current.previewCountBonus > 0 &&
          nextPieces.length > 0 ? (
            <NextPiecePreview
              pieces={nextPieces.slice(
                0,
                Math.min(3, skillEffectsRef.current.previewCountBonus),
              )}
              viewport={visualViewport}
            />
          ) : (
            <View style={styles.nextPreviewPlaceholder} />
          )
        ) : null}
      </VisualElementView>
      <View style={styles.boardStage}>
        <Animated.View
          style={[
            styles.boardContainer,
            { transform: [{ translateX: boardShakeAnim }] },
          ]}
        >
          <VisualElementView
            screenId="endless"
            elementId="board"
            style={styles.boardVisualAnchor}
            onLayout={handleBoardLayout}
          >
            {comboGaugeRule.visible && (
              <ComboGaugeOverlay
                combo={combo}
                comboRemainingMs={comboRemainingMs}
                comboMaxMs={comboGaugeMaxMs}
                feverActive={feverActive}
                feverRemainingMs={feverRemainingMs}
                feverMaxMs={Math.max(1, feverDurationMs)}
                visualAutomationLabel={buildVisualAutomationLabel(
                  'endless',
                  'combo_gauge',
                )}
                style={buildVisualElementStyle(
                  comboGaugeRule,
                  visualViewport,
                  visualManifest.referenceViewport,
                )}
              />
            )}
            <View style={styles.boardSurface}>
              <Board
                ref={boardRef}
                board={board}
                viewport={visualViewport}
                backgroundColor={skinBoardBg}
                compact={useCompactLayout}
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
                  compact={useCompactLayout}
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
              screenId="endless"
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
        </Animated.View>
      </View>

      <VisualElementView
        screenId="endless"
        elementId="piece_tray"
        style={styles.visualWrapper}
      >
      <View style={styles.pieceTraySection}>
        <PieceSelector
          pieces={pieces}
          onDragStart={dragDrop.onDragStart}
          onDragMove={dragDrop.onDragMove}
          onDragEnd={dragDrop.onDragEnd}
          onDragCancel={dragDrop.onDragCancel}
          compact={useCompactLayout}
          boardCompact={useCompactLayout}
          boardScaleX={boardScaleX}
          boardScaleY={boardScaleY}
          viewport={visualViewport}
          dragTuning={dragTuning}
        />
      </View>
      </VisualElementView>
      {gameData && (
        <VisualElementView
          screenId="endless"
          elementId="item_bar"
          style={styles.visualWrapper}
        >
        <View style={styles.itemBarSection}>
        <ItemBar
          items={gameData.items}
          loadout={runItemLoadout}
          allowedItemKeys={ENDLESS_LOADOUT_ITEM_KEYS}
          selectedItem={selectedItem}
          onSelectItem={handleItemSelect}
          showAddTurns={false}
        />
        </View>
        </VisualElementView>
      )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  visualWrapper: {
    alignSelf: 'stretch',
  },
  screenContent: {
    flex: 1,
    minHeight: 0,
  },
  boardSkillEffectLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    elevation: 30,
  },
  boardStage: {
    flex: 1,
    minHeight: 0,
  },
  boardContainer: {
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  boardVisualAnchor: {
    position: 'relative',
    alignSelf: 'center',
  },
  boardSurface: {
    position: 'relative',
    alignSelf: 'center',
  },
  pieceTraySection: {
    flexShrink: 0,
  },
  itemBarSection: {
    flexShrink: 0,
  },
  milestoneBanner: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    zIndex: 100,
  },
  milestoneBannerText: {
    color: '#0a1628',
    fontSize: 14,
    fontWeight: '800',
  },
  goldBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: '#1e1b4b',
  },
  goldBarText: { color: '#fbbf24', fontSize: 13, fontWeight: '700' },
  goldBarNext: { color: '#94a3b8', fontSize: 12 },
  nextPreviewPlaceholder: {
    minHeight: 72,
  },
  summonCard: {
    marginHorizontal: 14,
    marginTop: 8,
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
  feverBarFill: {
    height: 8,
    backgroundColor: '#f97316',
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
  summonPlaceholder: {
    minHeight: 78,
    marginHorizontal: 14,
    marginTop: 8,
  },
});
