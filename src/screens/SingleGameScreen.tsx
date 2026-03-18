import React, {useState, useEffect, useCallback, useRef} from 'react';
import {View, StyleSheet, Alert, Text, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {t} from '../i18n';
import Board from '../components/Board';
import PieceSelector from '../components/PieceSelector';
import ItemBar from '../components/ItemBar';
import GameHeader from '../components/GameHeader';
import {useDragDrop} from '../game/useDragDrop';
import {LEVELS} from '../constants';
import {
  createBoard, generatePieces, placePiece, checkAndClearLines,
  calculateScore, calculateStars, countBlocks, canPlaceAnyPiece, addObstacles,
  useHammer, useBomb, Piece, Board as BoardType,
} from '../game/engine';
import {
  loadGameData, loadLevelProgress, saveLevelProgress,
  loadDailyStats, updateDailyStats, addStars, useItem, GameData,
} from '../stores/gameStore';

export default function SingleGameScreen({route, navigation}: any) {
  const {levelId} = route.params;
  const levelData = LEVELS.find(l => l.id === levelId);

  if (!levelData) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: '#0f0a2e', justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{color: '#fff', fontSize: 18, marginBottom: 20}}>{t('game.levelNotFound')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{color: '#6366f1', fontSize: 16}}>{t('game.goBack')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const [board, setBoard] = useState<BoardType>(createBoard());
  const [pieces, setPieces] = useState<(Piece | null)[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [stonesDestroyed, setStonesDestroyed] = useState(0);
  const [iceDestroyed, setIceDestroyed] = useState(0);
  const [turnsLeft, setTurnsLeft] = useState<number | null>(levelData.turns);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [boardLayout, setBoardLayout] = useState<{x: number; y: number} | null>(null);
  const boardRef = useRef<View>(null);

  const maxComboRef = useRef(0);
  const scoreRef = useRef(0);
  const linesClearedRef = useRef(0);
  const stonesRef = useRef(0);
  const iceRef = useRef(0);

  // Init
  useEffect(() => {
    let b = createBoard();
    if (levelData.obstacles) {
      b = addObstacles(b, levelData.obstacles);
    }
    setBoard(b);
    setPieces(generatePieces());
    loadGameData().then(setGameData);
    // Measure board position after mount
    setTimeout(() => {
      boardRef.current?.measureInWindow((x: number, y: number) => {
        setBoardLayout({x, y});
      });
    }, 300);
  }, [levelData]);

  const goalText = (() => {
    const g = levelData.goal;
    switch (g.type) {
      case 'score': return t('goal.score', g.target.toLocaleString());
      case 'lines': return t('goal.lines', g.target);
      case 'stone': return t('goal.stone', g.target);
      case 'ice': return t('goal.ice', g.target);
    }
  })();

  const checkGoal = useCallback(
    (s: number, lines: number, stones: number, ice: number) => {
      const g = levelData.goal;
      switch (g.type) {
        case 'score': return s >= g.target;
        case 'lines': return lines >= g.target;
        case 'stone': return stones >= g.target;
        case 'ice': return ice >= g.target;
      }
    },
    [levelData],
  );

  const endGame = useCallback(
    async (success: boolean) => {
      if (gameOver) return;
      setGameOver(true);
      const s = scoreRef.current;
      const stars = calculateStars(s, levelData.stars);
      const dailyStats = await loadDailyStats();
      await updateDailyStats(dailyStats, {
        games: 1, score: s, lines: linesClearedRef.current,
        maxCombo: maxComboRef.current, levelClears: success ? 1 : 0,
      });
      if (success && gameData) {
        const progress = await loadLevelProgress();
        await saveLevelProgress(progress, levelId, s, stars);
        const starReward = stars * 10 + (progress[levelId]?.cleared ? 0 : 20);
        const updated = await addStars(gameData, starReward);
        setGameData(updated);
        Alert.alert(
          t('game.clear'),
          t('result.score', s.toLocaleString()) + '\n' + t('result.stars', '⭐'.repeat(stars) + '☆'.repeat(3 - stars)) + '\n' + t('result.reward', starReward),
          [{text: t('common.confirm'), onPress: () => navigation.goBack()}],
        );
      } else {
        Alert.alert(t('game.failed'), t('result.score', s.toLocaleString()) + '\n' + t('game.tryAgain'),
          [{text: t('common.confirm'), onPress: () => navigation.goBack()}],
        );
      }
    },
    [gameOver, levelData, gameData, levelId, navigation],
  );

  // Handle piece placement from drag-drop
  const handlePlace = useCallback(
    (pieceIndex: number, row: number, col: number) => {
      if (gameOver) return;
      const piece = pieces[pieceIndex];
      if (!piece) return;

      let newBoard = placePiece(board, piece, row, col);
      const blockCount = countBlocks(piece.shape);

      // Chain clear
      let totalLines = 0;
      let currentCombo = combo;
      let totalScore = 0;
      let totalStones = 0;
      let totalIce = 0;

      let keepClearing = true;
      let firstPass = true;
      while (keepClearing) {
        const result = checkAndClearLines(newBoard);
        const cl = result.clearedRows.length + result.clearedCols.length;
        if (cl === 0) {
          if (firstPass) currentCombo = 0;
          break;
        }
        newBoard = result.newBoard;
        totalLines += cl;
        currentCombo++;
        totalStones += result.stonesDestroyed;
        totalIce += result.iceDestroyed;
        totalScore += calculateScore(firstPass ? blockCount : 0, cl, currentCombo);
        firstPass = false;
      }
      // 레벨 모드: 라인 클리어 시에만 점수 획득
      if (currentCombo > maxComboRef.current) maxComboRef.current = currentCombo;

      const newScore = score + totalScore;
      const newLines = linesCleared + totalLines;
      const newStones = stonesDestroyed + totalStones;
      const newIce = iceDestroyed + totalIce;

      scoreRef.current = newScore;
      linesClearedRef.current = newLines;
      stonesRef.current = newStones;
      iceRef.current = newIce;

      setBoard(newBoard);
      setScore(newScore);
      setCombo(currentCombo);
      setLinesCleared(newLines);
      setStonesDestroyed(newStones);
      setIceDestroyed(newIce);

      // Remove used piece, refill if all used
      const newPieces = [...pieces];
      newPieces[pieceIndex] = null;
      const remaining = newPieces.filter(p => p !== null);
      if (remaining.length === 0) {
        const fresh = generatePieces();
        newPieces[0] = fresh[0];
        newPieces[1] = fresh[1];
        newPieces[2] = fresh[2];
      }
      setPieces(newPieces);

      // Turns
      const newTurns = turnsLeft !== null ? turnsLeft - 1 : null;
      setTurnsLeft(newTurns);

      // Win/loss check
      setTimeout(() => {
        if (checkGoal(newScore, newLines, newStones, newIce)) {
          endGame(true);
        } else if (newTurns !== null && newTurns <= 0) {
          endGame(false);
        } else {
          const activePieces = newPieces.filter(p => p !== null) as Piece[];
          if (!canPlaceAnyPiece(newBoard, activePieces)) {
            endGame(false);
          }
        }
      }, 200);
    },
    [board, pieces, combo, score, linesCleared, stonesDestroyed, iceDestroyed,
     turnsLeft, gameOver, checkGoal, endGame],
  );

  // Drag-drop hook
  const dragDrop = useDragDrop(board, pieces, boardLayout, handlePlace);

  // Board layout measurement
  const handleBoardLayout = useCallback(() => {
    setTimeout(() => {
      boardRef.current?.measureInWindow((x: number, y: number) => {
        setBoardLayout({x, y});
      });
    }, 100);
  }, []);

  // Item handling
  const handleItemSelect = useCallback(
    (item: string) => {
      if (!gameData) return;
      if (selectedItem === item) { setSelectedItem(null); return; }
      if (item === 'refresh') {
        if (gameData.items.refresh <= 0) { Alert.alert('', t('item.noRefresh')); return; }
        useItem(gameData, 'refresh').then(u => {
          if (u) { setGameData(u); setPieces(generatePieces()); }
        });
        return;
      }
      if (item === 'addTurns') {
        if (turnsLeft === null) { Alert.alert('', t('item.noTurnLimit')); return; }
        if (gameData.items.addTurns <= 0) { Alert.alert('', t('item.noAddTurns')); return; }
        useItem(gameData, 'addTurns').then(u => {
          if (u) { setGameData(u); setTurnsLeft(prev => prev !== null ? prev + 3 : null); }
        });
        return;
      }
      if (gameData.items[item as keyof typeof gameData.items] <= 0) {
        Alert.alert('', t('item.noItems'));
        return;
      }
      setSelectedItem(item);
    },
    [gameData, selectedItem, turnsLeft],
  );

  // Item use on board tap (hammer/bomb only)
  const handleBoardTapForItem = useCallback(
    (row: number, col: number) => {
      if (!selectedItem || !gameData) return;
      if (selectedItem === 'hammer') {
        const result = useHammer(board, row, col);
        if (result) {
          useItem(gameData, 'hammer').then(u => u && setGameData(u));
          setBoard(result);
          setSelectedItem(null);
        }
      } else if (selectedItem === 'bomb') {
        const result = useBomb(board, row, col);
        useItem(gameData, 'bomb').then(u => u && setGameData(u));
        setBoard(result.board);
        setSelectedItem(null);
      }
    },
    [selectedItem, gameData, board],
  );

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader
        score={score}
        combo={combo}
        linesCleared={linesCleared}
        turnsLeft={turnsLeft}
        level={`Level ${levelId} - ${levelData.name}`}
        goalText={goalText}
        onBack={() => {
          Alert.alert(t('common.exit'), t('game.exitConfirm'), [
            {text: t('common.cancel'), style: 'cancel'},
            {text: t('common.exit'), onPress: () => navigation.goBack()},
          ]);
        }}
      />

      <View style={styles.boardContainer} onLayout={handleBoardLayout}>
        <Board
          ref={boardRef}
          board={board}
          previewCells={dragDrop.previewCells}
          invalidPreview={dragDrop.invalidPreview}
          onCellPress={selectedItem ? handleBoardTapForItem : undefined}
        />
      </View>

      {selectedItem && (
        <View style={styles.itemHintRow}>
          <Text style={styles.itemHint}>
            {selectedItem === 'hammer' ? t('item.useHammer') : t('item.useBomb')}
          </Text>
          <TouchableOpacity onPress={() => setSelectedItem(null)}>
            <Text style={styles.cancelItem}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <PieceSelector
        pieces={pieces}
        onDragStart={dragDrop.onDragStart}
        onDragMove={dragDrop.onDragMove}
        onDragEnd={dragDrop.onDragEnd}
        onDragCancel={dragDrop.onDragCancel}
      />

      {gameData && (
        <ItemBar
          items={gameData.items}
          selectedItem={selectedItem}
          onSelectItem={handleItemSelect}
          showAddTurns={turnsLeft !== null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f0a2e'},
  boardContainer: {flex: 1, justifyContent: 'center'},
  itemHintRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  itemHint: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelItem: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
