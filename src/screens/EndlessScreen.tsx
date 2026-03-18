import React, {useState, useEffect, useCallback, useRef} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {t} from '../i18n';
import Board from '../components/Board';
import PieceSelector from '../components/PieceSelector';
import ItemBar from '../components/ItemBar';
import GameHeader from '../components/GameHeader';
import {useDragDrop} from '../game/useDragDrop';
import {LEVEL_THRESHOLDS, FEVER_MAX, FEVER_DURATION} from '../constants';
import {
  createBoard, generatePieces, placePiece, checkAndClearLines,
  calculateScore, countBlocks, canPlaceAnyPiece, getDifficulty, getEndlessLevel,
  useHammer, useBomb, Piece, Board as BoardType,
} from '../game/engine';
import {
  loadGameData, addStars, useItem, loadEndlessStats, saveEndlessStats,
  loadDailyStats, updateDailyStats, GameData,
} from '../stores/gameStore';

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
  const boardRef = useRef<View>(null);

  const maxComboRef = useRef(0);
  const feverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feverActiveRef = useRef(false);

  useEffect(() => {
    setBoard(createBoard());
    setPieces(generatePieces('easy'));
    loadGameData().then(setGameData);
    setTimeout(() => {
      boardRef.current?.measureInWindow((x: number, y: number) => {
        setBoardLayout({x, y});
      });
    }, 300);
  }, []);

  const activateFever = useCallback(() => {
    setFeverActive(true);
    feverActiveRef.current = true;
    setFeverGauge(FEVER_MAX);
    if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
    feverTimerRef.current = setTimeout(() => {
      setFeverActive(false);
      feverActiveRef.current = false;
      setFeverGauge(0);
    }, FEVER_DURATION);
  }, []);

  const endGame = useCallback(async () => {
    if (gameOver) return;
    setGameOver(true);
    if (feverTimerRef.current) clearTimeout(feverTimerRef.current);

    const stats = await loadEndlessStats();
    await saveEndlessStats(stats, score, linesCleared, currentLevel, maxComboRef.current);
    const dailyStats = await loadDailyStats();
    await updateDailyStats(dailyStats, {
      games: 1, score, lines: linesCleared, maxCombo: maxComboRef.current,
    });
    const starReward = Math.floor(score / 100) + currentLevel * 5;
    if (gameData) {
      const updated = await addStars(gameData, starReward);
      setGameData(updated);
    }
    const isHighScore = score > stats.highScore;
    Alert.alert(
      t('game.gameOver'),
      `${isHighScore ? t('game.highScore') + '\n' : ''}${t('result.score', score.toLocaleString())}\n${t('result.level', currentLevel)}\n${t('result.linesResult', linesCleared)}\n${t('result.maxCombo', maxComboRef.current)}\n${t('result.reward', starReward)}`,
      [{text: t('common.confirm'), onPress: () => navigation.goBack()}],
    );
  }, [gameOver, score, linesCleared, currentLevel, gameData, navigation]);

  const handlePlace = useCallback(
    (pieceIndex: number, row: number, col: number) => {
      if (gameOver) return;
      const piece = pieces[pieceIndex];
      if (!piece) return;

      let newBoard = placePiece(board, piece, row, col);
      const blockCount = countBlocks(piece.shape);

      let totalLines = 0;
      let currentCombo = combo;
      let totalScore = 0;
      let firstPass = true;

      while (true) {
        const result = checkAndClearLines(newBoard);
        const cl = result.clearedRows.length + result.clearedCols.length;
        if (cl === 0) {
          if (firstPass) currentCombo = 0;
          break;
        }
        newBoard = result.newBoard;
        totalLines += cl;
        currentCombo++;
        totalScore += calculateScore(
          firstPass ? blockCount : 0, cl, currentCombo, feverActiveRef.current,
        );
        firstPass = false;
      }
      if (totalLines === 0) totalScore = blockCount * 10;
      if (currentCombo > maxComboRef.current) maxComboRef.current = currentCombo;

      const newScore = score + totalScore;
      const newLines = linesCleared + totalLines;

      // Fever
      let newFeverGauge = feverGauge;
      if (!feverActiveRef.current && totalLines > 0) {
        newFeverGauge = Math.min(FEVER_MAX, feverGauge + totalLines * 20);
        if (newFeverGauge >= FEVER_MAX) activateFever();
      }

      const newLevel = getEndlessLevel(newScore, LEVEL_THRESHOLDS);

      setBoard(newBoard);
      setScore(newScore);
      setCombo(currentCombo);
      setLinesCleared(newLines);
      setCurrentLevel(newLevel);
      setFeverGauge(newFeverGauge);

      const newPieces = [...pieces];
      newPieces[pieceIndex] = null;
      const remaining = newPieces.filter(p => p !== null);
      if (remaining.length === 0) {
        const difficulty = getDifficulty(newLevel);
        const fresh = generatePieces(difficulty);
        newPieces[0] = fresh[0];
        newPieces[1] = fresh[1];
        newPieces[2] = fresh[2];
      }
      setPieces(newPieces);

      setTimeout(() => {
        const active = newPieces.filter(p => p !== null) as Piece[];
        if (!canPlaceAnyPiece(newBoard, active)) endGame();
      }, 200);
    },
    [board, pieces, combo, score, linesCleared, feverGauge,
     gameOver, activateFever, endGame],
  );

  const dragDrop = useDragDrop(board, pieces, boardLayout, handlePlace);

  const handleBoardLayout = useCallback(() => {
    setTimeout(() => {
      boardRef.current?.measureInWindow((x: number, y: number) => {
        setBoardLayout({x, y});
      });
    }, 100);
  }, []);

  const handleItemSelect = useCallback(
    (item: string) => {
      if (!gameData) return;
      if (selectedItem === item) { setSelectedItem(null); return; }
      if (item === 'refresh') {
        if (gameData.items.refresh <= 0) return;
        useItem(gameData, 'refresh').then(u => {
          if (u) {
            setGameData(u);
            setPieces(generatePieces(getDifficulty(currentLevel)));
          }
        });
        return;
      }
      if (item === 'addTurns') return;
      if (gameData.items[item as keyof typeof gameData.items] <= 0) return;
      setSelectedItem(item);
    },
    [gameData, selectedItem, currentLevel],
  );

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader
        score={score}
        combo={combo}
        linesCleared={linesCleared}
        level={t('endless.level', currentLevel)}
        goalText={t('endless.nextLevel', (LEVEL_THRESHOLDS[currentLevel] || '∞').toLocaleString())}
        onBack={() => {
          Alert.alert(t('common.exit'), t('game.exitEndless'), [
            {text: t('common.cancel'), style: 'cancel'},
            {text: t('common.exit'), onPress: () => endGame()},
          ]);
        }}
        feverActive={feverActive}
        feverGauge={feverGauge}
      />
      <View style={styles.boardContainer} onLayout={handleBoardLayout}>
        <Board
          ref={boardRef}
          board={board}
          previewCells={dragDrop.previewCells}
          invalidPreview={dragDrop.invalidPreview}
        />
      </View>
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
          showAddTurns={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0a1628'},
  boardContainer: {flex: 1, justifyContent: 'center'},
});
