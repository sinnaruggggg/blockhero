import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MageSprite from '../components/MageSprite';
import BackImageButton from '../components/BackImageButton';
import {SafeAreaView} from 'react-native-safe-area-context';
import {t} from '../i18n';
import {getNickname, getPlayerId} from '../stores/gameStore';
import {
  supabase,
  generateRoomCode,
  createRoom,
  joinRoom,
  enterMatchingQueue,
  findWaitingPlayers,
  updateRoomStatus,
  updateMatchingStatus,
  cleanupMatching,
  cleanupBattleState,
} from '../services/supabase';

const {width: W, height: H} = Dimensions.get('window');

const IMG_BG = require('../assets/ui/lobby_bg.jpg');
const IMG_BTN_CREATE = require('../assets/ui/btn_create.png');
const IMG_BTN_JOIN = require('../assets/ui/btn_join.png');
const IMG_BTN_RANDOM = require('../assets/ui/btn_random.png');
const IMG_NAV_MISSION = require('../assets/ui/missions.png');
const IMG_NAV_SHOP = require('../assets/ui/shop.png');
const IMG_NAV_FRIENDS = require('../assets/ui/friends.png');
const IMG_NAV_SKIN = require('../assets/ui/skin.png');
const IMG_NAV_CODEX = require('../assets/ui/codex.png');

const BTN_W = W * 0.871;
const BTN_H = Math.min(H * 0.112, 106);
const BTN_GAP = Math.min(H * 0.016, 14);
const NAV_ICON_SIZE = W * 0.16;

const BLOCK_COLORS = [
  'rgba(99, 132, 255, 0.25)',
  'rgba(255, 99, 132, 0.2)',
  'rgba(75, 220, 130, 0.22)',
  'rgba(255, 206, 86, 0.22)',
  'rgba(180, 99, 255, 0.2)',
  'rgba(255, 159, 64, 0.22)',
  'rgba(54, 215, 232, 0.2)',
];

interface BlockData {
  id: number;
  size: number;
  color: string;
  startX: number;
  startY: number;
  duration: number;
  delay: number;
  rotation: number;
}

function generateBlocks(count: number): BlockData[] {
  return Array.from({length: count}, (_, i) => ({
    id: i,
    size: 12 + Math.random() * 24,
    color: BLOCK_COLORS[i % BLOCK_COLORS.length],
    startX: -40 + Math.random() * W * 0.8,
    startY: -60 - Math.random() * H * 0.5,
    duration: 6000 + Math.random() * 6000,
    delay: Math.random() * 4000,
    rotation: Math.random() * 360,
  }));
}

const BLOCKS = generateBlocks(14);

function FloatingBlocks() {
  const anims = useRef(BLOCKS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    BLOCKS.forEach((block, i) => {
      const animate = () => {
        anims[i].setValue(0);
        Animated.timing(anims[i], {
          toValue: 1,
          duration: block.duration,
          delay: block.delay,
          useNativeDriver: true,
        }).start(() => {
          block.delay = 0;
          animate();
        });
      };
      animate();
    });
  }, [anims]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {BLOCKS.map((block, i) => {
        const translateX = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [block.startX, block.startX + W * 0.5],
        });
        const translateY = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [block.startY, block.startY + H * 1.4],
        });
        const rotate = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [`${block.rotation}deg`, `${block.rotation + 180}deg`],
        });
        const opacity = anims[i].interpolate({
          inputRange: [0, 0.1, 0.8, 1],
          outputRange: [0, 1, 1, 0],
        });

        return (
          <Animated.View
            key={block.id}
            style={{
              position: 'absolute',
              width: block.size,
              height: block.size,
              backgroundColor: block.color,
              borderRadius: block.size * 0.2,
              opacity,
              transform: [{translateX}, {translateY}, {rotate}],
            }}
          />
        );
      })}
    </View>
  );
}

export default function LobbyScreen({navigation}: any) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'random'>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [ready, setReady] = useState(false);

  const playerIdRef = useRef('');
  const nicknameRef = useRef('');
  const channelRef = useRef<any>(null);
  const matchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (matchIntervalRef.current) {
      clearInterval(matchIntervalRef.current);
      matchIntervalRef.current = null;
    }
  }, []);

  const prepareLobby = useCallback(async () => {
    cleanup();
    setReady(false);
    setWaiting(false);
    setMode('menu');
    setRoomCode('');
    setInputCode('');

    try {
      const [playerId, nickname] = await Promise.all([getPlayerId(), getNickname()]);
      playerIdRef.current = playerId;
      nicknameRef.current = nickname;

      if (playerId) {
        await cleanupBattleState(playerId);
      }
    } catch (error) {
      console.warn('LobbyScreen prepareLobby error:', error);
    } finally {
      setReady(true);
    }
  }, [cleanup]);

  useEffect(() => {
    prepareLobby().catch(error => {
      console.warn('LobbyScreen initial prepareLobby error:', error);
      setReady(true);
    });
    return () => cleanup();
  }, [cleanup, prepareLobby]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      prepareLobby().catch(error => {
        console.warn('LobbyScreen prepareLobby error:', error);
      });
    });

    return unsubscribe;
  }, [navigation, prepareLobby]);

  const handleCreateRoom = async () => {
    try {
      const pid = playerIdRef.current;
      const nick = nicknameRef.current;
      if (!pid) {
        Alert.alert(t('common.error'), t('lobby.loadingPlayer'));
        return;
      }
      cleanup();
      await cleanupBattleState(pid);
      const code = generateRoomCode();
      setRoomCode(code);
      setMode('create');
      setWaiting(true);

      const seed = Math.floor(Math.random() * 1000000);
      const {error: roomError} = await createRoom(code, seed);
      if (roomError) {
        Alert.alert(t('common.error'), t('lobby.createFail') + roomError.message);
        setMode('menu');
        setWaiting(false);
        return;
      }

      const channel = supabase
        .channel(`room:${code}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'players',
            filter: `room_code=eq.${code}`,
          },
          (payload: any) => {
            try {
              if (payload?.new?.player_id && payload.new.player_id !== pid) {
                cleanup();
                updateRoomStatus(code, 'playing');
                navigation.replace('Battle', {roomCode: code, isHost: true});
              }
            } catch (e) {
              console.warn('postgres_changes callback error:', e);
            }
          },
        )
        .subscribe();
      channelRef.current = channel;

      const {error: joinError} = await joinRoom(code, pid, nick);
      if (joinError) {
        await cleanupBattleState(pid);
        cleanup();
        Alert.alert(t('common.error'), t('lobby.joinFail') + joinError.message);
        setMode('menu');
        setWaiting(false);
        setRoomCode('');
        return;
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), t('lobby.createError') + (e?.message || t('lobby.unknownError')));
      setMode('menu');
      setWaiting(false);
    }
  };

  const handleJoinRoom = async () => {
    try {
      if (inputCode.length !== 4) {
        Alert.alert(t('common.error'), t('lobby.enterCodeMsg'));
        return;
      }
      const code = inputCode.toUpperCase();
      setWaiting(true);
      cleanup();
      await cleanupBattleState(playerIdRef.current);

      const {data: rooms, error} = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code)
        .eq('status', 'waiting')
        .limit(1);

      if (error) {
        Alert.alert(t('common.error'), t('lobby.lookupFail') + error.message);
        setWaiting(false);
        return;
      }

      if (!rooms || rooms.length === 0) {
        Alert.alert(t('common.error'), t('lobby.notFound'));
        setWaiting(false);
        return;
      }

      const {error: joinError} = await joinRoom(code, playerIdRef.current, nicknameRef.current);
      if (joinError) {
        Alert.alert(t('common.error'), t('lobby.joinFail') + joinError.message);
        setWaiting(false);
        return;
      }

      cleanup();
      navigation.replace('Battle', {roomCode: code, isHost: false});
    } catch (e: any) {
      Alert.alert(t('common.error'), t('lobby.joinFail') + (e?.message || t('lobby.unknownError')));
      setWaiting(false);
    }
  };

  const handleRandomMatch = async () => {
    try {
      const pid = playerIdRef.current;
      const nick = nicknameRef.current;
      setMode('random');
      setWaiting(true);

      cleanup();
      await cleanupBattleState(pid);
      const {error: enterError} = await enterMatchingQueue(pid, nick);
      if (enterError) {
        Alert.alert(t('common.error'), t('lobby.matchQueueFail') + enterError.message);
        setMode('menu');
        setWaiting(false);
        return;
      }

      const failRandomMatch = async (message: string) => {
        cleanup();
        await cleanupBattleState(pid);
        setMode('menu');
        setWaiting(false);
        Alert.alert(t('common.error'), message);
      };

      matchIntervalRef.current = setInterval(async () => {
        try {
          const {data: myStatus, error: myStatusError} = await supabase
            .from('matching_queue')
            .select('*')
            .eq('player_id', pid)
            .maybeSingle();

          if (myStatusError) {
            console.warn('matching_queue status error:', myStatusError);
            return;
          }

          if (!myStatus) {
            return;
          }

          if (myStatus?.status === 'matched' && myStatus?.room_code) {
            cleanup();
            navigation.replace('Battle', {
              roomCode: myStatus.room_code,
              isHost: false,
            });
            return;
          }

          const {data} = await findWaitingPlayers(pid);
          if (data && data.length > 0) {
            const opponent = data[0];
            if (pid < opponent.player_id) {
              const code = generateRoomCode();
              const seed = Math.floor(Math.random() * 1000000);
              const {error: roomError} = await createRoom(code, seed);
              if (roomError) {
                await failRandomMatch(t('lobby.createFail') + roomError.message);
                return;
              }

              const {error: myJoinError} = await joinRoom(code, pid, nick);
              if (myJoinError) {
                await failRandomMatch(t('lobby.joinFail') + myJoinError.message);
                return;
              }

              const {error: opponentJoinError} = await joinRoom(
                code,
                opponent.player_id,
                opponent.nickname,
              );
              if (opponentJoinError) {
                await failRandomMatch(t('lobby.joinFail') + opponentJoinError.message);
                return;
              }

              const {error: opponentMatchError} = await updateMatchingStatus(
                opponent.player_id,
                'matched',
                code,
              );
              if (opponentMatchError) {
                await failRandomMatch(t('lobby.matchFail') + opponentMatchError.message);
                return;
              }

              const {error: myMatchError} = await updateMatchingStatus(pid, 'matched', code);
              if (myMatchError) {
                await failRandomMatch(t('lobby.matchFail') + myMatchError.message);
                return;
              }

              const {error: roomStatusError} = await updateRoomStatus(code, 'playing');
              if (roomStatusError) {
                await failRandomMatch(t('lobby.matchFail') + roomStatusError.message);
                return;
              }

              cleanup();
              navigation.replace('Battle', {roomCode: code, isHost: true});
            }
          }
        } catch (e) {
          console.warn('matchInterval error:', e);
        }
      }, 1500);
    } catch (e: any) {
      Alert.alert(t('common.error'), t('lobby.matchFail') + (e?.message || t('lobby.unknownError')));
      setMode('menu');
      setWaiting(false);
    }
  };

  const handleCancel = async () => {
    cleanup();
    await cleanupMatching(playerIdRef.current);
    await cleanupBattleState(playerIdRef.current);
    setWaiting(false);
    setMode('menu');
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <Image source={IMG_BG} style={styles.bgImage} resizeMode="cover" />
      <FloatingBlocks />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.backButtonDock}>
          <BackImageButton
            onPress={() => {
              if (mode === 'menu') {
                navigation.goBack();
                return;
              }

              if (mode === 'join') {
                setMode('menu');
                setInputCode('');
                return;
              }

              handleCancel().catch(error => {
                console.warn('LobbyScreen handleCancel error:', error);
              });
            }}
            size={44}
          />
        </View>
        {mode === 'menu' && (
          <View style={styles.menuContent}>
            <View style={styles.menuTopSection}>
              <View style={styles.titleArea}>
                <Text style={styles.brandTag}>⚔ BlockHero</Text>
                <Text style={styles.titleShadow}>대전 로비</Text>
                <Text style={styles.title}>대전 로비</Text>
              </View>

              <View style={styles.btnArea}>
                <TouchableOpacity
                  style={styles.btnWrapper}
                  onPress={handleCreateRoom}
                  disabled={!ready}
                  activeOpacity={0.8}>
                  <Image source={IMG_BTN_CREATE} style={styles.btnImage} resizeMode="stretch" />
                  <View style={styles.btnTextOverlay}>
                    <Text style={styles.btnTitle}>방 만들기</Text>
                    <Text style={styles.btnDesc}>코드를 공유해 친구와 대전</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnWrapper}
                  onPress={() => setMode('join')}
                  disabled={!ready}
                  activeOpacity={0.8}>
                  <Image source={IMG_BTN_JOIN} style={styles.btnImage} resizeMode="stretch" />
                  <View style={styles.btnTextOverlay}>
                    <Text style={styles.btnTitle}>방 참가</Text>
                    <Text style={styles.btnDesc}>코드를 입력하여 참가</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnWrapper}
                  onPress={handleRandomMatch}
                  disabled={!ready}
                  activeOpacity={0.8}>
                  <Image source={IMG_BTN_RANDOM} style={styles.btnImage} resizeMode="stretch" />
                  <View style={styles.btnTextOverlay}>
                    <Text style={styles.btnTitle}>랜덤 매칭</Text>
                    <Text style={styles.btnDesc}>랜덤 상대와 즉시 대전</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.bottomNav}>
              <TouchableOpacity
                style={styles.navItem}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Missions')}>
                <Image source={IMG_NAV_MISSION} style={styles.navIcon} resizeMode="contain" />
                <Text style={styles.navLabel}>미션</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => navigation.navigate('Shop')}
                activeOpacity={0.7}>
                <Image source={IMG_NAV_SHOP} style={styles.navIcon} resizeMode="contain" />
                <Text style={styles.navLabel}>상점</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => navigation.navigate('Friends')}
                activeOpacity={0.7}>
                <Image source={IMG_NAV_FRIENDS} style={styles.navIcon} resizeMode="contain" />
                <Text style={styles.navLabel}>친구</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => navigation.navigate('SkinCollection')}
                activeOpacity={0.7}>
                <Image source={IMG_NAV_SKIN} style={styles.navIcon} resizeMode="contain" />
                <Text style={styles.navLabel}>스킨</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => navigation.navigate('BossCodex')}
                activeOpacity={0.7}>
                <Image source={IMG_NAV_CODEX} style={styles.navIcon} resizeMode="contain" />
                <Text style={styles.navLabel}>도감</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {mode === 'create' && (
          <View style={styles.overlayCenter}>
            <MageSprite size={160} />
            <Text style={styles.waitTitle}>상대를 기다리는 중...</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>방 코드</Text>
              <Text style={styles.codeValue}>{roomCode}</Text>
            </View>
            <Text style={styles.waitDesc}>이 코드를 친구에게 공유하세요</Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'join' && (
          <View style={styles.overlayCenter}>
            <Text style={styles.waitTitle}>방 코드 입력</Text>
            <TextInput
              style={styles.codeInput}
              value={inputCode}
              onChangeText={val => setInputCode(val.toUpperCase())}
              maxLength={4}
              autoCapitalize="characters"
              placeholder="XXXX"
              placeholderTextColor="#64748b"
            />
            <View style={styles.joinBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setMode('menu');
                  setInputCode('');
                }}>
                <Text style={styles.cancelText}>뒤로</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.joinBtn, inputCode.length < 4 && {opacity: 0.5}]}
                onPress={handleJoinRoom}
                disabled={inputCode.length < 4 || waiting}>
                {waiting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.joinBtnText}>참가</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {mode === 'random' && (
          <View style={styles.overlayCenter}>
            <MageSprite size={160} />
            <Text style={styles.waitTitle}>상대를 찾는 중...</Text>
            <Text style={styles.waitDesc}>잠시만 기다려 주세요</Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  backButtonDock: {
    position: 'absolute',
    top: 8,
    left: 12,
    zIndex: 20,
  },
  bgImage: {
    position: 'absolute',
    width: W,
    height: H,
    top: 0,
    left: 0,
  },
  menuContent: {
    flex: 1,
    paddingTop: H * 0.028,
    paddingBottom: H * 0.008,
    justifyContent: 'space-between',
  },
  menuTopSection: {
    gap: H * 0.014,
  },
  titleArea: {
    alignItems: 'center',
  },
  brandTag: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 6,
  },
  titleShadow: {
    position: 'absolute',
    color: 'rgba(0,0,0,0.5)',
    fontSize: 42,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.6,
    top: 24,
  },
  title: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.6,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: {width: 0, height: 4},
    textShadowRadius: 12,
  },
  btnArea: {
    alignItems: 'center',
    gap: BTN_GAP,
    marginTop: 6,
  },
  btnWrapper: {
    width: BTN_W,
    height: BTN_H,
  },
  btnImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  btnTextOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingLeft: BTN_W * 0.22,
    paddingRight: BTN_W * 0.08,
  },
  btnTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 5,
  },
  btnDesc: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingBottom: H * 0.004,
    paddingHorizontal: W * 0.025,
  },
  navItem: {
    width: NAV_ICON_SIZE,
    alignItems: 'center',
  },
  navIcon: {
    width: NAV_ICON_SIZE,
    height: NAV_ICON_SIZE,
  },
  navLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  overlayCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  waitTitle: {
    color: '#e2e8f0',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 20,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  waitDesc: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 8,
  },
  codeBox: {
    backgroundColor: 'rgba(30,27,75,0.85)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.5)',
  },
  codeLabel: {
    color: '#a5b4fc',
    fontSize: 13,
    fontWeight: '600',
  },
  codeValue: {
    color: '#fbbf24',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 8,
  },
  cancelBtn: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: 'rgba(55,65,81,0.8)',
    borderRadius: 12,
  },
  cancelText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
  },
  codeInput: {
    backgroundColor: 'rgba(30,27,75,0.85)',
    color: '#fbbf24',
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.5)',
    width: 220,
    marginTop: 16,
  },
  joinBtns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  joinBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  joinBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
});
