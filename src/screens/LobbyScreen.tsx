import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MageSprite from '../components/MageSprite';
import BackImageButton from '../components/BackImageButton';
import GameBottomNav, {
  GAME_BOTTOM_NAV_CHAT_OFFSET,
} from '../components/GameBottomNav';
import LobbyChatPanel from '../components/LobbyChatPanel';
import MenuFloatingBlocks from '../components/MenuFloatingBlocks';
import {t} from '../i18n';
import {getNickname, getPlayerId} from '../stores/gameStore';
import {useLobbyChat} from '../hooks/useLobbyChat';
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

const BTN_W = W * 0.871;
const BTN_H = Math.min(H * 0.112, 106);
const BTN_GAP = Math.min(H * 0.016, 14);

export default function LobbyScreen({navigation}: any) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'random'>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [ready, setReady] = useState(false);
  const [chatPlayerId, setChatPlayerId] = useState('');
  const [chatNickname, setChatNickname] = useState('');
  const [chatSessionKey, setChatSessionKey] = useState(0);

  const playerIdRef = useRef('');
  const nicknameRef = useRef('');
  const channelRef = useRef<any>(null);
  const matchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lobbyChat = useLobbyChat({
    mode: 'battle',
    userId: chatPlayerId,
    nickname: chatNickname,
    enabled: ready && !!chatPlayerId && !!chatNickname,
    sessionKey: chatSessionKey,
  });

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
      setChatPlayerId(playerId);
      setChatNickname(nickname);
      setChatSessionKey(current => current + 1);

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
      Alert.alert(
        t('common.error'),
        t('lobby.createError') + (e?.message || t('lobby.unknownError')),
      );
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

      const {error: joinError} = await joinRoom(
        code,
        playerIdRef.current,
        nicknameRef.current,
      );
      if (joinError) {
        Alert.alert(t('common.error'), t('lobby.joinFail') + joinError.message);
        setWaiting(false);
        return;
      }

      cleanup();
      navigation.replace('Battle', {roomCode: code, isHost: false});
    } catch (e: any) {
      Alert.alert(
        t('common.error'),
        t('lobby.joinFail') + (e?.message || t('lobby.unknownError')),
      );
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

              const {error: myMatchError} = await updateMatchingStatus(
                pid,
                'matched',
                code,
              );
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
      Alert.alert(
        t('common.error'),
        t('lobby.matchFail') + (e?.message || t('lobby.unknownError')),
      );
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
      <View style={styles.topGlow} />
      <View style={styles.midGlow} />
      <View style={styles.bottomGlow} />
      <MenuFloatingBlocks />
      <SafeAreaView style={styles.safeArea}>
        {mode !== 'menu' ? (
          <View style={styles.backButtonDock}>
            <BackImageButton
              onPress={() => {
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
        ) : null}

        {mode === 'menu' && (
          <View style={styles.menuContent}>
            <View style={styles.menuTopSection}>
              <View style={styles.titleArea}>
                <Text style={styles.brandTag}>BLOCKHERO ARENA</Text>
                <Text style={styles.titleShadow}>대전 로비</Text>
                <Text style={styles.title}>대전 로비</Text>
              </View>

              <View style={styles.titleRibbon}>
                <Text style={styles.titleRibbonText}>2P BATTLE COMMAND</Text>
              </View>

              <View style={styles.heroStage}>
                <View style={styles.heroOrb} />
                <MageSprite size={150} />
                <View style={styles.heroNameplate}>
                  <Text style={styles.heroName}>Arena Mage</Text>
                  <Text style={styles.heroSubtext}>친구 대전 또는 실시간 매칭</Text>
                </View>
                <View style={styles.heroChipRow}>
                  <View style={styles.heroChip}>
                    <Text style={styles.heroChipLabel}>MODE</Text>
                    <Text style={styles.heroChipValue}>PVP</Text>
                  </View>
                  <View style={styles.heroChip}>
                    <Text style={styles.heroChipLabel}>PLAYERS</Text>
                    <Text style={styles.heroChipValue}>2</Text>
                  </View>
                  <View style={styles.heroChip}>
                    <Text style={styles.heroChipLabel}>MATCH</Text>
                    <Text style={styles.heroChipValue}>LIVE</Text>
                  </View>
                </View>
              </View>

              <View style={styles.btnArea}>
                <TouchableOpacity
                  style={[styles.btnWrapper, !ready && styles.btnWrapperDisabled]}
                  onPress={handleCreateRoom}
                  disabled={!ready}
                  activeOpacity={0.8}>
                  <View style={styles.btnShell} />
                  <Image source={IMG_BTN_CREATE} style={styles.btnImage} resizeMode="stretch" />
                  <View style={styles.btnTextOverlay}>
                    <Text style={styles.btnTitle}>방 만들기</Text>
                    <Text style={styles.btnDesc}>코드를 공유해 친구와 바로 대전</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnWrapper, !ready && styles.btnWrapperDisabled]}
                  onPress={() => setMode('join')}
                  disabled={!ready}
                  activeOpacity={0.8}>
                  <View style={styles.btnShell} />
                  <Image source={IMG_BTN_JOIN} style={styles.btnImage} resizeMode="stretch" />
                  <View style={styles.btnTextOverlay}>
                    <Text style={styles.btnTitle}>방 참가</Text>
                    <Text style={styles.btnDesc}>코드를 입력해 준비된 방에 입장</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnWrapper, !ready && styles.btnWrapperDisabled]}
                  onPress={handleRandomMatch}
                  disabled={!ready}
                  activeOpacity={0.8}>
                  <View style={styles.btnShell} />
                  <Image source={IMG_BTN_RANDOM} style={styles.btnImage} resizeMode="stretch" />
                  <View style={styles.btnTextOverlay}>
                    <Text style={styles.btnTitle}>랜덤 매칭</Text>
                    <Text style={styles.btnDesc}>비슷한 상대를 즉시 탐색</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <GameBottomNav
              navigation={navigation}
              activeItem={null}
              onHomePress={async () => {
                cleanup();
                await cleanupMatching(playerIdRef.current);
                await cleanupBattleState(playerIdRef.current);
              }}
            />
          </View>
        )}

        {mode === 'create' && (
          <View style={styles.overlayCenter}>
            <View style={styles.overlayCard}>
              <Text style={styles.overlayEyebrow}>ROOM READY</Text>
              <View style={styles.overlaySpriteDock}>
                <MageSprite size={150} />
              </View>
              <Text style={styles.waitTitle}>상대를 기다리는 중</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>방 코드</Text>
                <Text style={styles.codeValue}>{roomCode}</Text>
              </View>
              <Text style={styles.waitDesc}>
                이 코드를 친구에게 공유하면 같은 방으로 바로 입장합니다.
              </Text>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {mode === 'join' && (
          <View style={styles.overlayCenter}>
            <View style={styles.overlayCard}>
              <Text style={styles.overlayEyebrow}>ENTER CODE</Text>
              <Text style={styles.waitTitle}>방 코드를 입력하세요</Text>
              <TextInput
                style={styles.codeInput}
                value={inputCode}
                onChangeText={val => setInputCode(val.toUpperCase())}
                maxLength={4}
                autoCapitalize="characters"
                placeholder="XXXX"
                placeholderTextColor="#8f83bc"
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
                  style={[styles.joinBtn, inputCode.length < 4 && styles.joinBtnDisabled]}
                  onPress={handleJoinRoom}
                  disabled={inputCode.length < 4 || waiting}>
                  {waiting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.joinBtnText}>참가</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {mode === 'random' && (
          <View style={styles.overlayCenter}>
            <View style={styles.overlayCard}>
              <Text style={styles.overlayEyebrow}>MATCH SEARCH</Text>
              <View style={styles.overlaySpriteDock}>
                <MageSprite size={150} />
              </View>
              <Text style={styles.waitTitle}>상대를 찾는 중</Text>
              <Text style={styles.waitDesc}>
                잠시만 기다리면 자동으로 대전 방에 연결됩니다.
              </Text>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {ready && chatPlayerId ? (
          <LobbyChatPanel
            title="대전 모집 채팅"
            accentColor="#2da8ff"
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
                console.warn('LobbyScreen switchChannel error:', error);
              });
            }}
            onRandomizeChannel={() => {
              lobbyChat.joinRandomChannel().catch(error => {
                console.warn('LobbyScreen joinRandomChannel error:', error);
              });
            }}
            bottom={mode === 'menu' ? GAME_BOTTOM_NAV_CHAT_OFFSET : 26}
          />
        ) : null}
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
  bgImage: {
    position: 'absolute',
    width: W,
    height: H,
    top: 0,
    left: 0,
  },
  topGlow: {
    position: 'absolute',
    top: -H * 0.05,
    left: -W * 0.15,
    width: W * 0.82,
    height: H * 0.26,
    borderRadius: 999,
    backgroundColor: 'rgba(128, 87, 255, 0.24)',
  },
  midGlow: {
    position: 'absolute',
    top: H * 0.24,
    right: -W * 0.1,
    width: W * 0.56,
    height: H * 0.22,
    borderRadius: 999,
    backgroundColor: 'rgba(45, 168, 255, 0.14)',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -H * 0.04,
    left: W * 0.12,
    width: W * 0.72,
    height: H * 0.22,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 190, 92, 0.12)',
  },
  backButtonDock: {
    position: 'absolute',
    top: 10,
    left: 12,
    zIndex: 20,
    padding: 6,
    borderRadius: 22,
    backgroundColor: 'rgba(35, 19, 78, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(226, 169, 77, 0.72)',
  },
  menuContent: {
    flex: 1,
    paddingTop: H * 0.018,
    paddingBottom: H * 0.008,
    justifyContent: 'space-between',
  },
  menuTopSection: {
    gap: H * 0.014,
    paddingHorizontal: 16,
  },
  titleArea: {
    alignItems: 'center',
  },
  brandTag: {
    color: '#ffd88a',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  titleShadow: {
    position: 'absolute',
    color: 'rgba(25, 9, 62, 0.72)',
    fontSize: 38,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.6,
    top: 20,
  },
  title: {
    color: '#fff7de',
    fontSize: 38,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.6,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: {width: 0, height: 3},
    textShadowRadius: 10,
  },
  titleRibbon: {
    alignSelf: 'center',
    minWidth: 220,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: 'rgba(108, 58, 214, 0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(235, 184, 92, 0.84)',
    shadowColor: '#0b0419',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  titleRibbonText: {
    color: '#fff7de',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.9,
    textAlign: 'center',
  },
  heroStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingTop: 18,
    paddingBottom: 12,
  },
  heroOrb: {
    position: 'absolute',
    top: 16,
    width: 210,
    height: 210,
    borderRadius: 999,
    backgroundColor: 'rgba(122, 80, 255, 0.28)',
  },
  heroNameplate: {
    marginTop: 8,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: 'rgba(35, 19, 78, 0.92)',
    borderWidth: 2,
    borderColor: 'rgba(226, 169, 77, 0.82)',
    alignItems: 'center',
  },
  heroName: {
    color: '#fff7de',
    fontSize: 20,
    fontWeight: '900',
  },
  heroSubtext: {
    color: '#d8cbff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  heroChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  heroChip: {
    minWidth: 82,
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(35, 19, 78, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(235, 184, 92, 0.64)',
  },
  heroChipLabel: {
    color: '#ffd88a',
    fontSize: 10,
    fontWeight: '900',
  },
  heroChipValue: {
    color: '#fff8e1',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  btnArea: {
    alignItems: 'center',
    gap: BTN_GAP,
    marginTop: 2,
  },
  btnWrapper: {
    width: BTN_W,
    height: BTN_H,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(235, 184, 92, 0.82)',
    backgroundColor: 'rgba(35, 19, 78, 0.78)',
    shadowColor: '#0b0419',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 7,
  },
  btnWrapperDisabled: {
    opacity: 0.55,
  },
  btnShell: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  btnImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
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
    color: '#fff9e7',
    fontSize: 23,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 5,
  },
  btnDesc: {
    color: 'rgba(255,244,217,0.96)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  overlayCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  overlayCard: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 22,
    backgroundColor: 'rgba(35, 19, 78, 0.95)',
    borderWidth: 2,
    borderColor: 'rgba(226, 169, 77, 0.82)',
    shadowColor: '#0b0419',
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 12,
  },
  overlayEyebrow: {
    color: '#ffd88a',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  overlaySpriteDock: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(117, 79, 255, 0.16)',
    marginBottom: 8,
  },
  waitTitle: {
    color: '#fff7de',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
    textAlign: 'center',
  },
  waitDesc: {
    color: '#d8cbff',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
  codeBox: {
    backgroundColor: 'rgba(17, 8, 46, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 18,
    borderWidth: 2,
    borderColor: 'rgba(235, 184, 92, 0.62)',
  },
  codeLabel: {
    color: '#ffd88a',
    fontSize: 13,
    fontWeight: '800',
  },
  codeValue: {
    color: '#fff8e1',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 8,
  },
  cancelBtn: {
    marginTop: 24,
    paddingHorizontal: 28,
    minHeight: 48,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#fff4d7',
    fontSize: 15,
    fontWeight: '900',
  },
  codeInput: {
    backgroundColor: 'rgba(17, 8, 46, 0.82)',
    color: '#fff8e1',
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(235, 184, 92, 0.62)',
    width: 220,
    marginTop: 16,
  },
  joinBtns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  joinBtn: {
    minHeight: 48,
    backgroundColor: '#2da8ff',
    borderWidth: 2,
    borderColor: '#dff5ff',
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnDisabled: {
    opacity: 0.5,
  },
  joinBtnText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
});
