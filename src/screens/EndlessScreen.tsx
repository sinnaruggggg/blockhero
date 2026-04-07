import React, {useState, useEffect, useCallback, useRef} from 'react';
import {View, StyleSheet, Alert, Text, Animated, TouchableOpacity, Dimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Board from '../components/Board';
import PieceSelector from '../components/PieceSelector';
import ItemBar from '../components/ItemBar';
import BattleNoticeOverlay from '../components/BattleNoticeOverlay';
import GameHeader from '../components/GameHeader';
import NextPiecePreview from '../components/NextPiecePreview';
import PiecePlacementEffect from '../components/PiecePlacementEffect';
import {flushPlayerStateNow} from '../services/playerState';
import {submitEndlessLeaderboard} from '../services/rankingService';
import {useDragDrop} from '../game/useDragDrop';
import {
  LEVEL_THRESHOLDS,
  FEVER_MAX,
  FEVER_DURATION,
  COMBO_TIMEOUT_MS,
  ENDLESS_GOLD_MILESTONES,
} from '../constants';

const MODE_VERTICAL_GUTTER = Math.round(Dimensions.get('window').height * 0.05);
import {
  createBoard,
  generatePlaceablePieces,
  generateSpecificPiece,
  placePiece,
  checkAndClearLines,
  countBlocks,
  canPlaceAnyPiece,
  getDifficulty,
  getEndlessLevel,
  addEndlessHardObstacles,
  resetPieceGenerationHistory,
  Piece,
  Board as BoardType,
} from '../game/engine';
import {resolveCombatTurn} from '../game/combatFlow';
import {
  applyCombatDamageEffectsDetailed,
  getCharacterSkillEffects,
  getPieceGenerationOptions,
} from '../game/characterSkillEffects';
import {SPECIAL_PIECE_ITEMS} from '../constants/shopItems';
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
  loadCharacterData,
  collectSpecialBlockRewards,
  gainSummonExp,
  loadSkinData,
} from '../stores/gameStore';
import {getCharacterAtk} from '../constants/characters';
import {getSkinBoardBg, getSkinColors, setActiveSkin} from '../game/skinContext';
import {
  applySkinCombatDamage,
  applySkinRewardBonuses,
  getActiveSkinLoadout,
  getSummonGaugeGain,
  mergeSkinPieceGenerationOptions,
} from '../game/skinSummonRuntime';
import {useBattleNotice} from '../hooks/useBattleNotice';
import {buildSkillTriggerNotice} from '../game/skillTriggerNotice';
import {loadSkillTriggerNoticeMode, type SkillTriggerNoticeMode} from '../stores/gameSettings';
import {
  buildPiecePlacementEffectCells,
  type PiecePlacementEffectCell,
} from '../game/piecePlacementEffect';

export default function EndlessScreen({navigation}: any) {
  const [board, setBoard] = useState<BoardType>(createBoard());
  const [pieces, setPieces] = useState<(Piece | null)[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [feverGauge, setFeverGauge] = useState(0);
  const [feverActive, setFeverActive] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [boardLayout, setBoardLayout] = useState<{x: number; y: number} | null>(null);
  const [attackPower, setAttackPower] = useState(10);
  const [nextMilestoneIdx, setNextMilestoneIdx] = useState(0);
  const [goldEarned, setGoldEarned] = useState(0);
  const [milestoneText, setMilestoneText] = useState('');
  const [skinBoardBg, setSkinBoardBg] = useState(getSkinBoardBg());
  const [summonGauge, setSummonGauge] = useState(0);
  const [summonGaugeRequired, setSummonGaugeRequired] = useState(0);
  const [summonAttack, setSummonAttack] = useState(0);
  const [summonActive, setSummonActive] = useState(false);
  const [summonRemainingMs, setSummonRemainingMs] = useState(0);
  const [nextPieces, setNextPieces] = useState<Piece[]>([]);
  const [placementEffect, setPlacementEffect] = useState<{
    id: number;
    cells: PiecePlacementEffectCell[];
  } | null>(null);

  const boardRef = useRef<View>(null);
  const placementEffectIdRef = useRef(0);
  const maxComboRef = useRef(0);
  const feverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feverActiveRef = useRef(false);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const linesClearedRef = useRef(0);
  const nextMilestoneRef = useRef(0);
  const goldEarnedRef = useRef(0);
  const gameDataRef = useRef<GameData | null>(null);
  const startedAtRef = useRef(Date.now());
  const skillEffectsRef = useRef(getCharacterSkillEffects(null, null));
  const smallPieceStreakRef = useRef(0);
  const activeSkinIdRef = useRef(0);
  const summonGaugeRef = useRef(0);
  const summonGaugeRequiredRef = useRef(0);
  const summonAttackRef = useRef(0);
  const summonActiveRef = useRef(false);
  const summonRemainingMsRef = useRef(0);
  const summonExpEarnedRef = useRef(0);
  const nextPiecesRef = useRef<Piece[]>([]);
  const skillNoticeModeRef = useRef<SkillTriggerNoticeMode>('triggered_only');
  const {message: battleNoticeMessage, showNotice: showBattleNotice} =
    useBattleNotice(3000);

  const milestoneAnim = useRef(new Animated.Value(0)).current;

  const getCurrentPieceOptions = useCallback(
    () =>
      mergeSkinPieceGenerationOptions(
        getPieceGenerationOptions(skillEffectsRef.current),
        activeSkinIdRef.current,
      ),
    [],
  );

  const updateNextPieces = useCallback((piecesToPreview: Piece[]) => {
    nextPiecesRef.current = piecesToPreview;
    setNextPieces(piecesToPreview);
  }, []);

  const showPlacementEffect = useCallback(
    (piece: Piece, row: number, col: number) => {
      if (!boardLayout) {
        return;
      }
      const compactLayout =
        activeSkinIdRef.current > 0 ||
        (skillEffectsRef.current.previewCountBonus > 0 && nextPiecesRef.current.length > 0);
      const cells = buildPiecePlacementEffectCells(
        boardLayout,
        piece,
        row,
        col,
        compactLayout,
      );
      if (cells.length === 0) {
        return;
      }
      placementEffectIdRef.current += 1;
      setPlacementEffect({id: placementEffectIdRef.current, cells});
    },
    [boardLayout],
  );

  const showSkillTriggerNotice = useCallback(
    (...events: Parameters<typeof buildSkillTriggerNotice>[1]) => {
      const message = buildSkillTriggerNotice(skillNoticeModeRef.current, events);
      if (message) {
        showBattleNotice(message);
      }
    },
    [showBattleNotice],
  );

  const buildPiecePack = useCallback(
    (
      difficulty: 'easy' | 'medium' | 'hard',
      targetBoard: BoardType,
    ) =>
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
      pack.length === 3 && pack.every(piece => canPlaceAnyPiece(targetBoard, [piece])),
    [],
  );

  useEffect(() => {
    startedAtRef.current = Date.now();
    resetPieceGenerationHistory();
    const initialBoard = createBoard();
    setBoard(initialBoard);
    activeSkinIdRef.current = 0;
    summonGaugeRef.current = 0;
    summonGaugeRequiredRef.current = 0;
    summonAttackRef.current = 0;
    summonActiveRef.current = false;
    summonRemainingMsRef.current = 0;
    summonExpEarnedRef.current = 0;
    setPlacementEffect(null);
    setSummonGauge(0);
    setSummonGaugeRequired(0);
    setSummonAttack(0);
    setSummonActive(false);
    setSummonRemainingMs(0);
    updateNextPieces([]);
    const initialPack = buildPiecePack('easy', initialBoard);
    setPieces(initialPack);
    updateNextPieces(buildPiecePack('easy', initialBoard));
    (async () => {
      const [loadedGameData, skinData, charId, noticeMode] = await Promise.all([
        loadGameData(),
        loadSkinData(),
        getSelectedCharacter(),
        loadSkillTriggerNoticeMode(),
      ]);
      setGameData(loadedGameData);
      gameDataRef.current = loadedGameData;
      skillNoticeModeRef.current = noticeMode;

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

      if (!charId) {
        const refreshedPack = buildPiecePack('easy', initialBoard);
        setPieces(refreshedPack);
        updateNextPieces(buildPiecePack('easy', initialBoard));
        return;
      }

      const charData = await loadCharacterData(charId);
      const effects = getCharacterSkillEffects(charId, charData, {mode: 'endless'});
      skillEffectsRef.current = effects;
      setAttackPower(
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
      boardRef.current?.measureInWindow((x: number, y: number) => {
        setBoardLayout({x, y});
      });
    }, 300);
  }, [buildPiecePack, updateNextPieces]);

  const showMilestoneBanner = useCallback(
    (text: string) => {
      setMilestoneText(text);
      milestoneAnim.setValue(0);
      Animated.sequence([
        Animated.timing(milestoneAnim, {toValue: 1, duration: 300, useNativeDriver: true}),
        Animated.delay(1500),
        Animated.timing(milestoneAnim, {toValue: 0, duration: 400, useNativeDriver: true}),
      ]).start();
    },
    [milestoneAnim],
  );

  const activateFever = useCallback(() => {
    setFeverActive(true);
    feverActiveRef.current = true;
    setFeverGauge(FEVER_MAX);
    if (feverTimerRef.current) {
      clearTimeout(feverTimerRef.current);
    }
    feverTimerRef.current = setTimeout(() => {
      setFeverActive(false);
      feverActiveRef.current = false;
      setFeverGauge(0);
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

  const resetComboTimer = useCallback(() => {
    if (comboTimerRef.current) {
      clearTimeout(comboTimerRef.current);
    }
    comboTimerRef.current = setTimeout(() => {
      setCombo(0);
      comboRef.current = 0;
    }, COMBO_TIMEOUT_MS + skillEffectsRef.current.comboWindowBonusMs);
  }, []);

  const endGame = useCallback(async () => {
    if (gameOver) {
      return;
    }
    setGameOver(true);
    if (feverTimerRef.current) {
      clearTimeout(feverTimerRef.current);
    }
    if (comboTimerRef.current) {
      clearTimeout(comboTimerRef.current);
    }

    const finalScore = scoreRef.current;
    const finalLines = linesClearedRef.current;
    const finalGold = goldEarnedRef.current;

    if (activeSkinIdRef.current > 0 && summonExpEarnedRef.current > 0) {
      await gainSummonExp(activeSkinIdRef.current, summonExpEarnedRef.current);
    }

    const stats = await loadEndlessStats();
    await saveEndlessStats(stats, finalScore, finalLines, currentLevel, maxComboRef.current);
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
      playTimeMs: startedAtRef.current > 0 ? Date.now() - startedAtRef.current : 0,
      totalLines: finalLines,
    });

    void flushPlayerStateNow('endless_end');

    const isHighScore = finalScore > stats.highScore;
    Alert.alert(
      isHighScore ? '새 최고 기록!' : '게임 종료',
      `점수: ${finalScore.toLocaleString()}\n레벨: ${currentLevel}\n클리어 줄: ${finalLines}\n최대 콤보: ${maxComboRef.current}\n획득 골드: +${finalGold}`,
      [{text: '확인', onPress: () => navigation.goBack()}],
    );
  }, [currentLevel, gameOver, navigation]);

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
          Math.round(totalGoldGained * skillEffectsRef.current.rewardGoldMultiplier),
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
          `+${totalGoldGained} 골드! 다음 목표: ${nextScore?.toLocaleString() ?? '최대'}`,
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

      let newBoard = placePiece(board, piece, row, col);
      showPlacementEffect(piece, row, col);
      const blockCount = countBlocks(piece.shape);

      let totalLines = 0;
      let totalGemsFound = 0;
      const totalItemsFound: string[] = [];

      while (true) {
        const result = checkAndClearLines(newBoard);
        const clearedLines = result.clearedRows.length + result.clearedCols.length;
        if (clearedLines === 0) {
          break;
        }
        newBoard = result.newBoard;
        totalLines += clearedLines;
        totalGemsFound += result.gemsFound;
        totalItemsFound.push(...result.itemsFound);
      }

      const effects = skillEffectsRef.current;
      const wasSmallPiece = blockCount <= 2;
      smallPieceStreakRef.current = wasSmallPiece ? smallPieceStreakRef.current + 1 : 0;
      const usedSmallPieceStreak = smallPieceStreakRef.current >= 2;
      if (usedSmallPieceStreak) {
        smallPieceStreakRef.current = 0;
      }

      const turnResult = resolveCombatTurn({
        mode: 'endless',
        blockCount,
        attackPower,
        clearedLines: totalLines,
        combo: comboRef.current,
        feverActive: feverActiveRef.current,
        feverGauge,
        feverLinesRequired: Math.max(1, Math.round(20 * effects.feverRequirementMultiplier)),
        feverGaugeGainMultiplier: effects.feverGaugeGainMultiplier,
      });
      if (turnResult.nextCombo > maxComboRef.current) {
        maxComboRef.current = turnResult.nextCombo;
      }

      comboRef.current = turnResult.nextCombo;
      setCombo(turnResult.nextCombo);
      if (turnResult.didClear) {
        resetComboTimer();
      }

      const scoreResult = applyCombatDamageEffectsDetailed(turnResult.score, effects, {
        combo: turnResult.nextCombo,
        didClear: turnResult.didClear,
        feverActive: feverActiveRef.current,
        usedSmallPieceStreak,
      });
      showSkillTriggerNotice(...scoreResult.events);
      const skinScore = applySkinCombatDamage(scoreResult.amount, activeSkinIdRef.current, {
        combo: turnResult.nextCombo,
        didClear: turnResult.didClear,
      }).damage;
      const summonBonus =
        summonActiveRef.current && summonRemainingMsRef.current > 0
          ? summonAttackRef.current
          : 0;
      if (summonBonus > 0) {
        summonExpEarnedRef.current += Math.max(1, Math.round(summonBonus / 8));
      }

      const scoreThisTurn = skinScore + summonBonus;
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
      const newLevel = getEndlessLevel(effectiveScoreForLevel, LEVEL_THRESHOLDS);

      if (
        newLevel > currentLevel &&
        Math.random() < effects.endlessObstacleSpawnMultiplier
      ) {
        newBoard = addEndlessHardObstacles(newBoard, newLevel);
      }

      setBoard(newBoard);
      setScore(newScore);
      setLinesCleared(newLines);
      setCurrentLevel(newLevel);
      setFeverGauge(newFeverGauge);

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

      if (gameDataRef.current && (totalGemsFound > 0 || totalItemsFound.length > 0)) {
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
        const upcomingPack =
          isPiecePackPlaceable(newBoard, nextPiecesRef.current)
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
      showSkillTriggerNotice,
      updateNextPieces,
    ],
  );

  const dragDrop = useDragDrop(board, pieces, boardLayout, handlePlace);
  const useCompactLayout =
    activeSkinIdRef.current > 0 ||
    (skillEffectsRef.current.previewCountBonus > 0 && nextPieces.length > 0);

  const handleBoardLayout = useCallback(() => {
    setTimeout(() => {
      boardRef.current?.measureInWindow((x: number, y: number) => {
        setBoardLayout({x, y});
      });
    }, 100);
  }, []);

  const handleToggleSummon = useCallback(() => {
    if (summonGaugeRequiredRef.current <= 0 || summonRemainingMsRef.current <= 0) {
      return;
    }

    if (!summonActiveRef.current && summonGaugeRef.current < summonGaugeRequiredRef.current) {
      return;
    }

    if (!summonActiveRef.current) {
      summonGaugeRef.current = 0;
      setSummonGauge(0);
    }

    summonActiveRef.current = !summonActiveRef.current;
    setSummonActive(summonActiveRef.current);
  }, []);

  const handleItemSelect = useCallback(
    (item: string) => {
      if (!gameData) {
        return;
      }
      if (selectedItem === item) {
        setSelectedItem(null);
        return;
      }
      if (item === 'refresh') {
        if (gameData.items.refresh <= 0) {
          return;
        }
        consumeItem(gameData, 'refresh').then(updated => {
          if (updated) {
            setGameData(updated);
            gameDataRef.current = updated;
            const diff = getDifficulty(currentLevel);
            setPieces(buildPiecePack(diff, board));
          }
        });
        return;
      }
      if (item === 'addTurns') {
        return;
      }
      const specialDef = SPECIAL_PIECE_ITEMS.find(definition => definition.itemKey === item);
      if (specialDef?.pieceIndices) {
        if ((gameData.items[item] || 0) <= 0) {
          return;
        }
        consumeItem(gameData, item as keyof typeof gameData.items).then(updated => {
          if (updated) {
            setGameData(updated);
            gameDataRef.current = updated;
            const newPiece = generateSpecificPiece(specialDef.pieceIndices!);
            setPieces(prev => {
              const nextPieces = [...prev];
              const nullIdx = nextPieces.findIndex(piece => piece === null);
              nextPieces[nullIdx >= 0 ? nullIdx : 0] = newPiece;
              return nextPieces;
            });
          }
        });
        return;
      }
      if ((gameData.items[item as keyof typeof gameData.items] ?? 0) <= 0) {
        return;
      }
      setSelectedItem(item);
    },
    [board, buildPiecePack, currentLevel, gameData, selectedItem],
  );

  const nextMilestone = ENDLESS_GOLD_MILESTONES[nextMilestoneIdx];

  return (
    <SafeAreaView style={styles.container}>
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
            {text: '취소', style: 'cancel'},
            {text: '나가기', onPress: () => endGame()},
          ]);
        }}
        feverActive={feverActive}
        feverGauge={feverGauge}
      />

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
        ]}>
        <Text style={styles.milestoneBannerText}>{milestoneText}</Text>
      </Animated.View>

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

      <BattleNoticeOverlay message={battleNoticeMessage} bottom={148} />

      <View style={styles.goldBar}>
        <Text style={styles.goldBarText}>이번 판 획득 골드: {goldEarned}</Text>
        {nextMilestone && (
          <Text style={styles.goldBarNext}>
            다음: {nextMilestone.score.toLocaleString()}점
          </Text>
        )}
      </View>

      {skillEffectsRef.current.previewCountBonus > 0 && nextPieces.length > 0 && (
        <NextPiecePreview
          pieces={nextPieces.slice(0, Math.min(3, skillEffectsRef.current.previewCountBonus))}
        />
      )}

      {activeSkinIdRef.current > 0 && (
        <View style={styles.summonCard}>
          <View style={styles.summonHeader}>
            <Text style={styles.summonTitle}>소환수</Text>
            <Text style={styles.summonMeta}>
              공격 {summonAttack} / 남은 시간 {Math.ceil(summonRemainingMs / 1000)}초
            </Text>
          </View>
          <View style={styles.summonBarBg}>
            <View
              style={[
                styles.summonBarFill,
                {
                  width: `${summonGaugeRequired > 0 ? (summonGauge / summonGaugeRequired) * 100 : 0}%`,
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
                (summonGauge < summonGaugeRequired && !summonActive) || summonRemainingMs <= 0
              }
              style={[
                styles.summonBtn,
                summonActive && styles.summonBtnActive,
                (summonRemainingMs <= 0 ||
                  (summonGauge < summonGaugeRequired && !summonActive)) &&
                  styles.summonBtnDisabled,
              ]}>
              <Text style={styles.summonBtnText}>{summonActive ? '회수' : '소환'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.boardContainer} onLayout={handleBoardLayout}>
        <Board
          ref={boardRef}
          board={board}
          backgroundColor={skinBoardBg}
          compact={useCompactLayout}
          previewCells={dragDrop.previewCells}
          invalidPreview={dragDrop.invalidPreview}
          clearGuideCells={dragDrop.clearGuideCells}
        />
      </View>

      <PieceSelector
        pieces={pieces}
        onDragStart={dragDrop.onDragStart}
        onDragMove={dragDrop.onDragMove}
        onDragEnd={dragDrop.onDragEnd}
        onDragCancel={dragDrop.onDragCancel}
        compact={useCompactLayout}
      />
      {gameData && (
        <ItemBar
          items={gameData.items}
          selectedItem={selectedItem}
          onSelectItem={handleItemSelect}
          showAddTurns={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
    paddingTop: MODE_VERTICAL_GUTTER,
    paddingBottom: MODE_VERTICAL_GUTTER,
  },
  boardContainer: {
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 4,
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
  goldBarText: {color: '#fbbf24', fontSize: 13, fontWeight: '700'},
  goldBarNext: {color: '#94a3b8', fontSize: 12},
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
});
