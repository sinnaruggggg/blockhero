import React, {useState, useEffect, useRef} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {t} from '../i18n';
import {getPlayerId, getNickname} from '../stores/gameStore';
import {
  supabase, generateRoomCode, createRoom, joinRoom,
  enterMatchingQueue, leaveMatchingQueue, findWaitingPlayers,
  updateRoomStatus, updateMatchingStatus, cleanupMatching, getRoomChannel,
} from '../services/supabase';

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

  useEffect(() => {
    (async () => {
      playerIdRef.current = await getPlayerId();
      nicknameRef.current = await getNickname();
      setReady(true);
    })();
    return () => cleanup();
  }, []);

  const cleanup = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (matchIntervalRef.current) {
      clearInterval(matchIntervalRef.current);
      matchIntervalRef.current = null;
    }
  };

  const handleCreateRoom = async () => {
    try {
      const pid = playerIdRef.current;
      const nick = nicknameRef.current;
      if (!pid) {
        Alert.alert(t('common.error'), t('lobby.loadingPlayer'));
        return;
      }
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

      // Listen for opponent BEFORE joining, so we don't miss events
      const channel = supabase
        .channel(`room:${code}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'players',
          filter: `room_code=eq.${code}`,
        }, (payload: any) => {
          try {
            if (payload?.new?.player_id && payload.new.player_id !== pid) {
              cleanup();
              updateRoomStatus(code, 'playing');
              navigation.replace('Battle', {roomCode: code, isHost: true});
            }
          } catch (e) {
            console.warn('postgres_changes callback error:', e);
          }
        })
        .subscribe();
      channelRef.current = channel;

      const {error: joinError} = await joinRoom(code, pid, nick);
      if (joinError) {
        console.warn('joinRoom error:', joinError.message);
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

      await joinRoom(code, playerIdRef.current, nicknameRef.current);
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

      // Clean up any stale entry first, then insert fresh
      await cleanupMatching(pid);
      const {error: enterError} = await enterMatchingQueue(pid, nick);
      if (enterError) {
        Alert.alert(t('common.error'), t('lobby.matchQueueFail') + enterError.message);
        setMode('menu');
        setWaiting(false);
        return;
      }

      matchIntervalRef.current = setInterval(async () => {
        try {
          // First check if someone already matched us
          const {data: myStatus} = await supabase
            .from('matching_queue')
            .select('*')
            .eq('player_id', pid)
            .single();

          if (myStatus?.status === 'matched' && myStatus?.room_code) {
            cleanup();
            navigation.replace('Battle', {
              roomCode: myStatus.room_code,
              isHost: false,
            });
            return;
          }

          // If not matched yet, try to find an opponent
          const {data} = await findWaitingPlayers(pid);
          if (data && data.length > 0) {
            const opponent = data[0];
            // Only the player with lower ID creates the room
            if (pid < opponent.player_id) {
              const code = generateRoomCode();
              const seed = Math.floor(Math.random() * 1000000);
              await createRoom(code, seed);
              await joinRoom(code, pid, nick);
              await joinRoom(code, opponent.player_id, opponent.nickname);
              // Update both players' matching status
              await updateMatchingStatus(opponent.player_id, 'matched', code);
              await updateMatchingStatus(pid, 'matched', code);
              await updateRoomStatus(code, 'playing');
              cleanup();
              navigation.replace('Battle', {roomCode: code, isHost: true});
            }
            // If pid > opponent.player_id, do nothing — the opponent will create the room
            // and we'll detect it via the myStatus check above on next interval
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
    setWaiting(false);
    setMode('menu');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          cleanup();
          cleanupMatching(playerIdRef.current);
          navigation.goBack();
        }}>
          <Text style={styles.backBtn}>{t('common.home')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('lobby.title')}</Text>
        <View style={{width: 40}} />
      </View>

      {mode === 'menu' && (
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={[styles.menuBtn, {backgroundColor: '#6366f1'}, !ready && {opacity: 0.5}]}
            onPress={handleCreateRoom}
            disabled={!ready}>
            <Text style={styles.menuEmoji}>🏠</Text>
            <View>
              <Text style={styles.menuText}>{t('lobby.createRoom')}</Text>
              <Text style={styles.menuDesc}>{t('lobby.createDesc')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuBtn, {backgroundColor: '#22c55e'}, !ready && {opacity: 0.5}]}
            onPress={() => setMode('join')}
            disabled={!ready}>
            <Text style={styles.menuEmoji}>🔑</Text>
            <View>
              <Text style={styles.menuText}>{t('lobby.joinRoom')}</Text>
              <Text style={styles.menuDesc}>{t('lobby.joinDesc')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuBtn, {backgroundColor: '#f59e0b'}, !ready && {opacity: 0.5}]}
            onPress={handleRandomMatch}
            disabled={!ready}>
            <Text style={styles.menuEmoji}>🎲</Text>
            <View>
              <Text style={styles.menuText}>{t('lobby.randomMatch')}</Text>
              <Text style={styles.menuDesc}>{t('lobby.randomDesc')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'create' && (
        <View style={styles.waitContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.waitTitle}>{t('lobby.waiting')}</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>{t('lobby.roomCode')}</Text>
            <Text style={styles.codeValue}>{roomCode}</Text>
          </View>
          <Text style={styles.waitDesc}>{t('lobby.shareCode')}</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'join' && (
        <View style={styles.joinContainer}>
          <Text style={styles.joinTitle}>{t('lobby.enterCode')}</Text>
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
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode('menu')}>
              <Text style={styles.cancelText}>{t('common.back')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.joinBtn, inputCode.length < 4 && {opacity: 0.5}]}
              onPress={handleJoinRoom}
              disabled={inputCode.length < 4 || waiting}>
              {waiting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.joinBtnText}>{t('lobby.join')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {mode === 'random' && (
        <View style={styles.waitContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.waitTitle}>{t('lobby.searching')}</Text>
          <Text style={styles.waitDesc}>{t('lobby.pleaseWait')}</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f0a2e'},
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: {color: '#a5b4fc', fontSize: 14, fontWeight: '600'},
  title: {color: '#e2e8f0', fontSize: 18, fontWeight: '800'},
  menuContainer: {padding: 20, gap: 16},
  menuBtn: {
    borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  menuEmoji: {fontSize: 32},
  menuText: {color: '#fff', fontSize: 18, fontWeight: '800'},
  menuDesc: {color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2},
  waitContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20},
  waitTitle: {color: '#e2e8f0', fontSize: 20, fontWeight: '700', marginTop: 20},
  waitDesc: {color: '#94a3b8', fontSize: 14, marginTop: 8},
  codeBox: {
    backgroundColor: '#1e1b4b', borderRadius: 16, padding: 24, alignItems: 'center',
    marginTop: 20, borderWidth: 2, borderColor: '#6366f1',
  },
  codeLabel: {color: '#a5b4fc', fontSize: 12, fontWeight: '600'},
  codeValue: {color: '#fbbf24', fontSize: 40, fontWeight: '900', letterSpacing: 8},
  cancelBtn: {
    marginTop: 24, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: '#374151', borderRadius: 12,
  },
  cancelText: {color: '#e2e8f0', fontSize: 16, fontWeight: '700'},
  joinContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20},
  joinTitle: {color: '#e2e8f0', fontSize: 20, fontWeight: '700', marginBottom: 20},
  codeInput: {
    backgroundColor: '#1e1b4b', color: '#fbbf24', fontSize: 36, fontWeight: '900',
    textAlign: 'center', letterSpacing: 12, paddingHorizontal: 24, paddingVertical: 16,
    borderRadius: 16, borderWidth: 2, borderColor: '#6366f1', width: 220,
  },
  joinBtns: {flexDirection: 'row', gap: 12, marginTop: 24},
  joinBtn: {
    backgroundColor: '#22c55e', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12,
  },
  joinBtnText: {color: '#fff', fontSize: 18, fontWeight: '800'},
});
