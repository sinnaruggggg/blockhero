import React, {useState, useEffect, useCallback, useRef} from 'react';
import {View, Text, StyleSheet, Alert, TouchableOpacity, Animated, Vibration, Dimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackImageButton from '../components/BackImageButton';
import {submitBattleLeaderboard} from '../services/rankingService';
import Board from '../components/Board';
import PieceSelector from '../components/PieceSelector';
import PiecePlacementEffect from '../components/PiecePlacementEffect';
import {useDragDrop} from '../game/useDragDrop';
import {ATTACKS} from '../constants';
import {
  createBoard, generateSeededPieces, placePiece,
  checkAndClearLines, countBlocks, canPlaceAnyPiece,
  generateAttackLines, Piece, Board as BoardType,
} from '../game/engine';
import {getPlayerId, getNickname} from '../stores/gameStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from '../services/supabase';
import {t} from '../i18n';
import {
  buildPiecePlacementEffectCells,
  type PiecePlacementEffectCell,
} from '../game/piecePlacementEffect';

// Neon spark particle effect - sparks scatter fast from placed block area
function PlaceEffect({x, y, color, onDone}: {x: number; y: number; color: string; onDone: () => void}) {
  const sparkCount = 14;
  const sparks = useRef(
    Array.from({length: sparkCount}, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 100;
      return {
        anim: new Animated.Value(0),
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        isNeon: Math.random() > 0.3,
      };
    }),
  ).current;

  const flash = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(flash, {toValue: 0, duration: 200, useNativeDriver: true}),
      ...sparks.map(s =>
        Animated.timing(s.anim, {toValue: 1, duration: 250 + Math.random() * 200, useNativeDriver: true}),
      ),
    ]).start(onDone);
  }, [flash, onDone, sparks]);

  return (
    <View style={[StyleSheet.absoluteFill, {pointerEvents: 'none'}]}>
      {/* Bright flash */}
      <Animated.View style={{
        position: 'absolute', left: x - 25, top: y - 25, width: 50, height: 50,
        borderRadius: 25, backgroundColor: '#fff', opacity: flash,
        transform: [{scale: flash.interpolate({inputRange: [0, 1], outputRange: [1.5, 0.3]})}],
      }} />
      {/* Neon sparks */}
      {sparks.map((s, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: x - s.size / 2, top: y - s.size / 2,
          width: s.size, height: s.isNeon ? s.size * 2.5 : s.size,
          borderRadius: s.size / 2,
          backgroundColor: s.isNeon ? color : '#fff',
          shadowColor: color, shadowRadius: 6, shadowOpacity: 0.8,
          elevation: 4,
          opacity: s.anim.interpolate({inputRange: [0, 0.3, 1], outputRange: [1, 0.9, 0]}),
          transform: [
            {translateX: s.anim.interpolate({inputRange: [0, 1], outputRange: [0, s.dx]})},
            {translateY: s.anim.interpolate({inputRange: [0, 1], outputRange: [0, s.dy]})},
            {scale: s.anim.interpolate({inputRange: [0, 0.2, 1], outputRange: [0.5, 1.3, 0]})},
            {rotate: s.anim.interpolate({inputRange: [0, 1], outputRange: ['0deg', `${Math.random() * 360}deg`]})},
          ],
        }} />
      ))}
    </View>
  );
}

// Single missile component
function SingleMissile({delay, startX, onDone}: {delay: number; startX: number; onDone?: () => void}) {
  const pos = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const trailWiggle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Trail wiggle animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(trailWiggle, {toValue: 1, duration: 80, useNativeDriver: true}),
          Animated.timing(trailWiggle, {toValue: -1, duration: 80, useNativeDriver: true}),
        ]),
      ).start();

      Animated.sequence([
        // Missile flies UP from bottom (my board) to top (opponent section) with acceleration
        Animated.timing(pos, {toValue: 1, duration: 500, useNativeDriver: true}),
        // Explosion flash at top
        Animated.sequence([
          Animated.timing(flash, {toValue: 1, duration: 80, useNativeDriver: true}),
          Animated.timing(flash, {toValue: 0, duration: 150, useNativeDriver: true}),
        ]),
      ]).start(() => onDone?.());
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay, flash, onDone, pos, trailWiggle]);

  const trailLength = 12 + Math.random() * 20;
  const trailColor = Math.random() > 0.5 ? '#fbbf24' : '#fb923c';

  return (
    <>
      {/* Missile body - flies from bottom up */}
      <Animated.View style={{
        position: 'absolute', left: startX, width: 10, height: 18,
        backgroundColor: '#ef4444', borderRadius: 5,
        transform: [{
          translateY: pos.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [500, 350, 30],  // bottom to top (accelerating)
          }),
        }, {
          scale: pos.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.6, 1.2, 0.4],
          }),
        }],
        opacity: pos.interpolate({inputRange: [0, 0.9, 1], outputRange: [1, 1, 0]}),
      }}>
        {/* Trailing fire */}
        <Animated.View style={{
          position: 'absolute', bottom: -trailLength, left: -2, width: 14, height: trailLength,
          backgroundColor: trailColor, borderRadius: 7, opacity: 0.7,
          transform: [{translateX: trailWiggle.interpolate({
            inputRange: [-1, 1], outputRange: [-3, 3],
          })}],
        }} />
        <Animated.View style={{
          position: 'absolute', bottom: -(trailLength + 8), left: 1, width: 8, height: trailLength * 0.6,
          backgroundColor: '#fde68a', borderRadius: 4, opacity: 0.4,
          transform: [{translateX: trailWiggle.interpolate({
            inputRange: [-1, 1], outputRange: [2, -2],
          })}],
        }} />
      </Animated.View>
      {/* Explosion at top (opponent area) */}
      <Animated.View style={{
        position: 'absolute', top: 20, left: startX - 40, width: 90, height: 90,
        borderRadius: 45, backgroundColor: 'rgba(239,68,68,0.5)',
        opacity: flash,
        transform: [{scale: flash.interpolate({inputRange: [0, 1], outputRange: [0.3, 1.8]})}],
      }} />
    </>
  );
}

// Attack missile animation - multiple missiles matching line count
function MissileEffect({count, onDone}: {count: number; onDone: () => void}) {
  const missileCount = Math.max(1, Math.min(4, count));
  const doneCount = useRef(0);
  const screenWidth = Dimensions.get('window').width;

  const handleOneDone = useCallback(() => {
    doneCount.current++;
    if (doneCount.current >= missileCount) onDone();
  }, [missileCount, onDone]);

  const missiles = Array.from({length: missileCount}, (_, i) => ({
    delay: i * 180, // staggered timing
    startX: (screenWidth / (missileCount + 1)) * (i + 1) - 5 + (Math.random() - 0.5) * 30,
  }));

  return (
    <View style={[StyleSheet.absoluteFill, {pointerEvents: 'none'}]}>
      {missiles.map((m, i) => (
        <SingleMissile
          key={i}
          delay={m.delay}
          startX={m.startX}
          onDone={i === missileCount - 1 ? handleOneDone : undefined}
        />
      ))}
    </View>
  );
}

// Impact shake effect
function useShake() {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const vibrationRef = useRef(true);

  useEffect(() => {
    (async () => {
      try {
        const settings = await AsyncStorage.getItem('gameSettings');
        if (settings) {
          const parsed = JSON.parse(settings);
          if (parsed.vibration === false) vibrationRef.current = false;
        }
      } catch {}
    })();
  }, []);

  const triggerShake = useCallback(() => {
    if (vibrationRef.current) Vibration.vibrate([0, 100, 50, 100]);
    Animated.sequence([
      Animated.timing(shakeAnim, {toValue: 10, duration: 50, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: -10, duration: 50, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: 8, duration: 50, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: -8, duration: 50, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: 4, duration: 50, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: 0, duration: 50, useNativeDriver: true}),
    ]).start();
  }, [shakeAnim]);

  return {shakeAnim, triggerShake};
}

// Reconnection constants
const HEARTBEAT_INTERVAL = 5000; // 5 seconds
export default function BattleScreen({route, navigation}: any) {
  const {roomCode, isHost} = route.params;

  const [board, setBoard] = useState<BoardType>(createBoard());
  const [opponentBoard, setOpponentBoard] = useState<BoardType>(createBoard());
  const [pieces, setPieces] = useState<(Piece | null)[]>([]);
  const [_score, setScore] = useState(0);
  const [attackPoints, setAttackPoints] = useState(0);
  const [round, setRound] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [opponentName, setOpponentName] = useState(t('battle.opponent'));
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [boardLayout, setBoardLayout] = useState<{x: number; y: number} | null>(null);
  const boardRef = useRef<View>(null);

  // Effects state
  const [placementEffect, setPlacementEffect] = useState<{
    id: number;
    cells: PiecePlacementEffectCell[];
  } | null>(null);
  const [missileEffect, setMissileEffect] = useState<number | null>(null); // number = missile count
  const [rematchAccepted, setRematchAccepted] = useState(false);
  const [opponentRematchAccepted, setOpponentRematchAccepted] = useState(false);
  const [rematchStarting, setRematchStarting] = useState(false);
  const {shakeAnim, triggerShake} = useShake();

  // Reconnection state
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState(60);
  const opponentLastSeen = useRef(Date.now());
  const heartbeatTimer = useRef<any>(null);
  const reconnectTimer = useRef<any>(null);

  const seedRef = useRef(0);
  const playerIdRef = useRef('');
  const nicknameRef = useRef('');
  const channelRef = useRef<any>(null);
  const roundRef = useRef(0);
  const gameOverRef = useRef(false);
  const opponentDisconnectedRef = useRef(false);
  const placementEffectIdRef = useRef(0);
  const rematchAcceptedRef = useRef(false);
  const opponentRematchAcceptedRef = useRef(false);
  const rematchStartingRef = useRef(false);
  const isRematchRoundRef = useRef(false);
  const battleResultSubmittedRef = useRef(false);
  const resetBattleStateRef = useRef<((nextSeed: number) => Promise<void>) | null>(null);
  const startRematchRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    let mounted = true;
    isRematchRoundRef.current = false;
    battleResultSubmittedRef.current = false;
    (async () => {
      try {
        playerIdRef.current = await getPlayerId();
        nicknameRef.current = await getNickname();

        const {data: roomData} = await supabase
          .from('rooms')
          .select('seed')
          .eq('code', roomCode)
          .single();

        if (!mounted) return;

        if (roomData?.seed != null) {
          seedRef.current = roomData.seed;
          const p = generateSeededPieces(roomData.seed, 0);
          setPieces(p);
          setRound(1);
          roundRef.current = 1;
        }

        const channel = supabase
          .channel(`battle:${roomCode}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'players',
            filter: `room_code=eq.${roomCode}`,
          }, (payload: any) => {
            if (!mounted) return;
            const row = payload.new;
            if (row.player_id !== playerIdRef.current) {
              if (row.board) setOpponentBoard(row.board);
              if (row.nickname) setOpponentName(row.nickname);
              if (row.game_over && !gameOverRef.current) {
                rematchAcceptedRef.current = false;
                opponentRematchAcceptedRef.current = false;
                setResult('win');
                setGameOver(true);
                setRematchAccepted(false);
                setOpponentRematchAccepted(false);
                gameOverRef.current = true;
              }
            }
          })
          .on('broadcast', {event: 'attack'}, ({payload}: any) => {
            if (!mounted || !payload) return;
            if (payload.senderId !== playerIdRef.current) {
              // Attack received - shake + vibrate (NO missiles on receive)
              triggerShake();
              setBoard(prev => {
                const newBoard = generateAttackLines(prev, payload.lines);
                // Check game over after attack lines
                setTimeout(() => {
                  setPieces(currentPieces => {
                    const active = currentPieces.filter(p => p !== null) as Piece[];
                    if (active.length > 0 && !canPlaceAnyPiece(newBoard, active)) {
                      if (!gameOverRef.current) {
                        rematchAcceptedRef.current = false;
                        opponentRematchAcceptedRef.current = false;
                        gameOverRef.current = true;
                        setGameOver(true);
                        setResult('lose');
                        setRematchAccepted(false);
                        setOpponentRematchAccepted(false);
                        supabase
                          .from('players')
                          .update({game_over: true})
                          .eq('room_code', roomCode)
                          .eq('player_id', playerIdRef.current)
                          .then();
                      }
                    }
                    return currentPieces;
                  });
                }, 100);
                return newBoard;
              });
            }
          })
          .on('broadcast', {event: 'heartbeat'}, ({payload}: any) => {
            if (!mounted || !payload) return;
            if (payload.playerId !== playerIdRef.current) {
              opponentLastSeen.current = Date.now();
              if (opponentDisconnectedRef.current) {
                opponentDisconnectedRef.current = false;
                setOpponentDisconnected(false);
              }
            }
          })
          .on('broadcast', {event: 'rematch_response'}, ({payload}: any) => {
            if (!mounted || !payload || payload.playerId === playerIdRef.current) {
              return;
            }

            if (payload.accepted) {
              opponentRematchAcceptedRef.current = true;
              setOpponentRematchAccepted(true);
              if (isHost && rematchAcceptedRef.current) {
                const pendingStart = startRematchRef.current?.();
                pendingStart?.catch(error => {
                  console.warn('BattleScreen host startRematch error:', error);
                });
              }
              return;
            }

            Alert.alert('재도전 종료', '상대가 재도전을 원하지 않아 대전 로비로 돌아갑니다.', [
              {
                text: '확인',
                onPress: () => navigation.replace('Lobby'),
              },
            ]);
          })
          .on('broadcast', {event: 'rematch_start'}, ({payload}: any) => {
            if (!mounted) {
              return;
            }
            const nextSeed = typeof payload?.seed === 'number' ? payload.seed : null;
            if (nextSeed == null) {
              return;
            }
            const pendingReset = resetBattleStateRef.current?.(nextSeed);
            pendingReset?.catch(error => {
              console.warn('BattleScreen resetBattleState error:', error);
            });
          });

        await channel.subscribe();
        if (!mounted) {
          supabase.removeChannel(channel);
          return;
        }
        channelRef.current = channel;

        // Start heartbeat
        heartbeatTimer.current = setInterval(() => {
          channel.send({
            type: 'broadcast', event: 'heartbeat',
            payload: {playerId: playerIdRef.current},
          });
          // Check opponent timeout
          const elapsed = Date.now() - opponentLastSeen.current;
          if (elapsed > 15000 && !opponentDisconnectedRef.current && !gameOverRef.current) {
            opponentDisconnectedRef.current = true;
            setOpponentDisconnected(true);
            setReconnectCountdown(60);
            // Start countdown
            let count = 60;
            reconnectTimer.current = setInterval(() => {
              count--;
              setReconnectCountdown(count);
              if (!opponentDisconnectedRef.current) {
                clearInterval(reconnectTimer.current);
                return;
              }
              if (count <= 0) {
                clearInterval(reconnectTimer.current);
                // Opponent timed out - win
                if (!gameOverRef.current) {
                  gameOverRef.current = true;
                  setGameOver(true);
                  setResult('win');
                }
              }
            }, 1000);
          }
        }, HEARTBEAT_INTERVAL);
      } catch (e) {
        console.warn('BattleScreen init error:', e);
        if (mounted) {
          Alert.alert(t('common.error'), t('battle.connectionFail'), [
            {text: t('common.goHome'), onPress: () => navigation.replace('Home')},
          ]);
        }
      }
    })();
    return () => {
      mounted = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      if (reconnectTimer.current) clearInterval(reconnectTimer.current);
    };
  }, [isHost, navigation, roomCode, triggerShake]);

  const syncBoardToDB = useCallback((b: BoardType) => {
    supabase
      .from('players')
      .update({board: b})
      .eq('room_code', roomCode)
      .eq('player_id', playerIdRef.current)
      .then();
  }, [roomCode]);

  const showPlacementEffect = useCallback(
    (piece: Piece, row: number, col: number) => {
      if (!boardLayout) {
        return;
      }
      const cells = buildPiecePlacementEffectCells(boardLayout, piece, row, col, true);
      if (cells.length === 0) {
        return;
      }
      placementEffectIdRef.current += 1;
      setPlacementEffect({id: placementEffectIdRef.current, cells});
    },
    [boardLayout],
  );

  const resetBattleState = useCallback(
    async (nextSeed: number) => {
      const freshBoard = createBoard();
      seedRef.current = nextSeed;
      roundRef.current = 1;
      gameOverRef.current = false;
      battleResultSubmittedRef.current = false;
      isRematchRoundRef.current = true;
      opponentDisconnectedRef.current = false;
      rematchAcceptedRef.current = false;
      opponentRematchAcceptedRef.current = false;
      rematchStartingRef.current = false;
      opponentLastSeen.current = Date.now();

      if (reconnectTimer.current) {
        clearInterval(reconnectTimer.current);
        reconnectTimer.current = null;
      }

      setBoard(freshBoard);
      setOpponentBoard(createBoard());
      setPieces(generateSeededPieces(nextSeed, 0));
      setScore(0);
      setAttackPoints(0);
      setRound(1);
      setGameOver(false);
      setResult(null);
      setPlacementEffect(null);
      setMissileEffect(null);
      setOpponentDisconnected(false);
      setReconnectCountdown(60);
      setRematchAccepted(false);
      setOpponentRematchAccepted(false);
      setRematchStarting(false);

      const {error} = await supabase
        .from('players')
        .update({board: freshBoard, game_over: false})
        .eq('room_code', roomCode)
        .eq('player_id', playerIdRef.current);
      if (error) {
        throw error;
      }
    },
    [roomCode],
  );

  const startRematch = useCallback(async () => {
    if (!isHost || rematchStartingRef.current) {
      return;
    }

    try {
      rematchStartingRef.current = true;
      setRematchStarting(true);
      const nextSeed = Math.floor(Math.random() * 1000000);
      const {error} = await supabase.from('rooms').update({seed: nextSeed}).eq('code', roomCode);
      if (error) {
        throw error;
      }
      await resetBattleState(nextSeed);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'rematch_start',
        payload: {seed: nextSeed},
      });
    } catch (error) {
      console.warn('BattleScreen startRematch error:', error);
      Alert.alert('재도전 실패', '새 대전을 시작하지 못했습니다. 대전 로비로 돌아갑니다.', [
        {
          text: '확인',
          onPress: () => navigation.replace('Lobby'),
        },
      ]);
    } finally {
      rematchStartingRef.current = false;
      setRematchStarting(false);
    }
  }, [isHost, navigation, resetBattleState, roomCode]);

  resetBattleStateRef.current = resetBattleState;
  startRematchRef.current = startRematch;

  const handleGameOver = useCallback(() => {
    if (gameOverRef.current) return;
    rematchAcceptedRef.current = false;
    opponentRematchAcceptedRef.current = false;
    gameOverRef.current = true;
    setGameOver(true);
    setResult('lose');
    setRematchAccepted(false);
    setOpponentRematchAccepted(false);
    supabase
      .from('players')
      .update({game_over: true})
      .eq('room_code', roomCode)
      .eq('player_id', playerIdRef.current)
      .then();
  }, [roomCode]);

  useEffect(() => {
    if (!gameOver || !result || battleResultSubmittedRef.current) {
      return;
    }

    battleResultSubmittedRef.current = true;
    void submitBattleLeaderboard({
      won: result === 'win',
      rematchWin: isRematchRoundRef.current && result === 'win',
    });
  }, [gameOver, result]);

  const handlePlace = useCallback(
    (pieceIndex: number, row: number, col: number) => {
      if (gameOverRef.current) return;
      const piece = pieces[pieceIndex];
      if (!piece) return;

      let newBoard = placePiece(board, piece, row, col);
      showPlacementEffect(piece, row, col);
      const blockCount = countBlocks(piece.shape);

      let totalLines = 0;
      let combo = 0;
      while (true) {
        const r = checkAndClearLines(newBoard);
        const cl = r.clearedRows.length + r.clearedCols.length;
        if (cl === 0) break;
        newBoard = r.newBoard;
        totalLines += cl;
        combo++;
      }

      let gained = blockCount * 10 + totalLines * 100;
      if (combo > 1) gained += combo * 50;
      const ap = blockCount + totalLines * 10 + (combo > 1 ? combo * 5 : 0);

      setBoard(newBoard);
      setScore(prev => prev + gained);
      setAttackPoints(prev => prev + ap);
      syncBoardToDB(newBoard);

      const newPieces = [...pieces];
      newPieces[pieceIndex] = null;
      const remaining = newPieces.filter(p => p !== null);
      if (remaining.length === 0) {
        const nextRound = roundRef.current + 1;
        const fresh = generateSeededPieces(seedRef.current, nextRound);
        newPieces[0] = fresh[0];
        newPieces[1] = fresh[1];
        newPieces[2] = fresh[2];
        setRound(nextRound);
        roundRef.current = nextRound;
      }
      setPieces(newPieces);

      setTimeout(() => {
        const active = newPieces.filter(p => p !== null) as Piece[];
        if (!canPlaceAnyPiece(newBoard, active)) handleGameOver();
      }, 200);
    },
    [board, pieces, showPlacementEffect, syncBoardToDB, handleGameOver],
  );

  const dragDrop = useDragDrop(board, pieces, boardLayout, handlePlace, true, 1);

  const handleBoardLayout = useCallback(() => {
    setTimeout(() => {
      boardRef.current?.measureInWindow((x: number, y: number) => {
        setBoardLayout({x, y});
      });
    }, 100);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      boardRef.current?.measureInWindow((x: number, y: number) => {
        setBoardLayout({x, y});
      });
    }, 500);
  }, [round]);

  const sendAttack = useCallback(
    (attackIdx: number) => {
      const attack = ATTACKS[attackIdx];
      if (attackPoints < attack.cost) return;
      setAttackPoints(prev => prev - attack.cost);
      // Launch missiles from MY board toward opponent (visual)
      setMissileEffect(attack.lines);
      channelRef.current?.send({
        type: 'broadcast', event: 'attack',
        payload: {senderId: playerIdRef.current, lines: attack.lines},
      });
    },
    [attackPoints],
  );

  return (
    <SafeAreaView style={styles.container}>
      {!gameOver && (
        <View style={styles.backButtonDock}>
          <BackImageButton
            onPress={() => {
              Alert.alert('대전 나가기', '지금 나가면 패배 처리됩니다. 나가시겠습니까?', [
                {text: '취소', style: 'cancel'},
                {
                  text: '나가기',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await supabase
                        .from('players')
                        .update({game_over: true})
                        .eq('room_code', roomCode)
                        .eq('player_id', playerIdRef.current);
                    } catch {}
                    navigation.replace('Lobby');
                  },
                },
              ]);
            }}
            size={42}
          />
        </View>
      )}
      <View style={styles.opponentSection}>
        <Text style={styles.opponentName}>상대 {opponentName}</Text>
        <Board board={opponentBoard} small />
      </View>

      <View style={styles.attackBar}>
        <Text style={styles.attackLabel}>공격 포인트 {attackPoints}</Text>
        {ATTACKS.map((atk, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.attackBtn, attackPoints < atk.cost && styles.attackDisabled]}
            onPress={() => sendAttack(i)}
            disabled={attackPoints < atk.cost || gameOverRef.current}>
            <Text style={styles.attackLines}>{t('battle.lines', atk.lines)}</Text>
            <Text style={styles.attackCost}>{atk.cost}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Animated.View
        style={[styles.boardContainer, {
          transform: [{translateX: shakeAnim}],
        }]}
        onLayout={handleBoardLayout}>
        <Board
          ref={boardRef}
          board={board}
          compact
          previewCells={dragDrop.previewCells}
          invalidPreview={dragDrop.invalidPreview}
          clearGuideCells={dragDrop.clearGuideCells}
        />
      </Animated.View>

      <PieceSelector
        pieces={pieces}
        onDragStart={dragDrop.onDragStart}
        onDragMove={dragDrop.onDragMove}
        onDragEnd={dragDrop.onDragEnd}
        onDragCancel={dragDrop.onDragCancel}
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

      {/* Missile attack effect - flies from my board UP to opponent */}
      {missileEffect !== null && (
        <MissileEffect count={missileEffect} onDone={() => setMissileEffect(null)} />
      )}

      {/* Opponent disconnected banner */}
      {opponentDisconnected && !gameOver && (
        <View style={styles.disconnectBanner}>
          <Text style={styles.disconnectText}>
            {t('battle.disconnected', reconnectCountdown)}
          </Text>
        </View>
      )}

      {gameOver && result && (
        <View style={styles.overlay}>
          <Text style={styles.resultText}>
            {result === 'win' ? t('battle.win') : t('battle.lose')}
          </Text>
          <Text style={styles.rematchInfoText}>
            {opponentDisconnected
              ? '상대 연결이 끊겨 재도전을 진행할 수 없습니다.'
              : rematchStarting
                ? '새 대전을 준비 중입니다.'
                : rematchAccepted
                  ? opponentRematchAccepted
                    ? '상대 수락 확인 중입니다.'
                    : '상대의 재도전 응답을 기다리는 중입니다.'
                  : opponentRematchAccepted
                    ? '상대가 재도전을 원합니다.'
                    : '같은 상대와 다시 대결할 수 있습니다.'}
          </Text>
          {!opponentDisconnected && !rematchAccepted && !rematchStarting && (
            <TouchableOpacity
              style={[styles.exitBtn, styles.rematchBtn]}
              onPress={() => {
                rematchAcceptedRef.current = true;
                setRematchAccepted(true);
                channelRef.current?.send({
                  type: 'broadcast',
                  event: 'rematch_response',
                  payload: {playerId: playerIdRef.current, accepted: true},
                });
                if (isHost && opponentRematchAcceptedRef.current) {
                  startRematch().catch(error => {
                    console.warn('BattleScreen local startRematch error:', error);
                  });
                }
              }}>
              <Text style={styles.exitBtnText}>재도전</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.exitBtn}
            onPress={() => {
              channelRef.current?.send({
                type: 'broadcast',
                event: 'rematch_response',
                payload: {playerId: playerIdRef.current, accepted: false},
              });
              navigation.replace('Lobby');
            }}>
            <Text style={styles.exitBtnText}>대전 로비로</Text>
          </TouchableOpacity>
        </View>
      )}

      {pieces.length === 0 && !gameOver && (
        <View style={styles.overlay}>
          <Text style={styles.waitingText}>{t('battle.preparing')}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#1a0a3e'},
  backButtonDock: {
    position: 'absolute',
    top: 10,
    left: 12,
    zIndex: 20,
  },
  opponentSection: {
    alignItems: 'center', paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.3)',
  },
  opponentName: {color: '#e2e8f0', fontSize: 12, fontWeight: '600', marginBottom: 2},
  attackBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 5, backgroundColor: 'rgba(30,27,75,0.6)',
  },
  attackLabel: {color: '#ef4444', fontSize: 15, fontWeight: '900', marginRight: 2},
  attackBtn: {
    backgroundColor: '#7c3aed', borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 4, alignItems: 'center',
  },
  attackDisabled: {opacity: 0.3},
  attackLines: {color: '#fff', fontSize: 12, fontWeight: '700'},
  attackCost: {color: '#fbbf24', fontSize: 9},
  boardContainer: {flex: 1, justifyContent: 'center'},
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center',
  },
  resultText: {color: '#fff', fontSize: 36, fontWeight: '900'},
  rematchInfoText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 14,
    marginHorizontal: 28,
    lineHeight: 20,
  },
  exitBtn: {
    marginTop: 24, backgroundColor: '#6366f1', paddingHorizontal: 32,
    paddingVertical: 14, borderRadius: 12,
  },
  rematchBtn: {
    backgroundColor: '#16a34a',
  },
  exitBtnText: {color: '#fff', fontSize: 18, fontWeight: '800'},
  waitingText: {color: '#e2e8f0', fontSize: 18, fontWeight: '600'},
  disconnectBanner: {
    position: 'absolute', top: '40%', left: 20, right: 20,
    backgroundColor: 'rgba(239,68,68,0.9)', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center',
  },
  disconnectText: {color: '#fff', fontSize: 14, fontWeight: '700'},
});
