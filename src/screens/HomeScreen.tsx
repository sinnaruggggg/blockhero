import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {supabase, getCurrentUserId, getProfile, updateNickname as updateProfileNickname} from '../services/supabase';
import {fetchAnnouncements, claimPendingGrants} from '../services/adminSync';
import {t} from '../i18n';
import {
  loadGameData,
  saveGameData,
  getHeartTimerRemaining,
  refillHearts,
  useStars,
  getNickname,
  setNickname as saveNickname,
  GameData,
} from '../stores/gameStore';
import {MAX_HEARTS} from '../constants';

export default function HomeScreen({navigation}: any) {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [nickname, setNicknameState] = useState(t('common.player'));
  const [timerText, setTimerText] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [announcement, setAnnouncement] = useState<{title: string; content: string} | null>(null);

  const loadData = useCallback(async () => {
    const data = await loadGameData();
    setGameData(data);
    // Load nickname from Supabase profile first, fallback to local
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        const {data: profile} = await getProfile(userId);
        if (profile?.nickname) {
          setNicknameState(profile.nickname);
          await saveNickname(profile.nickname);
          return;
        }
      }
    } catch {}
    const name = await getNickname();
    setNicknameState(name);

    // Check pending grants
    try {
      const claimed = await claimPendingGrants();
      if (claimed.length > 0) {
        const summary = claimed.map(g => `${g.type} x${g.amount}`).join(', ');
        Alert.alert(t('common.notice'), `보상이 도착했습니다!\n${summary}`);
        const freshData = await loadGameData();
        setGameData(freshData);
      }
    } catch {}

    // Fetch announcements
    try {
      const announcements = await fetchAnnouncements();
      if (announcements.length > 0) {
        setAnnouncement(announcements[0]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  useEffect(() => {
    if (!gameData || gameData.hearts >= MAX_HEARTS) {
      setTimerText('');
      return;
    }
    const interval = setInterval(() => {
      const remaining = getHeartTimerRemaining(gameData);
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setTimerText(`${mins}:${secs.toString().padStart(2, '0')}`);
      if (remaining <= 0) loadData();
    }, 1000);
    return () => clearInterval(interval);
  }, [gameData, loadData]);

  const handleRefillHearts = async () => {
    if (!gameData) return;
    if (gameData.hearts >= MAX_HEARTS) {
      Alert.alert(t('common.notice'), t('home.heartsFull'));
      return;
    }
    Alert.alert(t('home.refillHearts'), t('home.refillConfirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('home.refill'),
        onPress: async () => {
          const result = await useStars(gameData, 30);
          if (!result) {
            Alert.alert(t('common.notice'), t('home.notEnoughStars'));
            return;
          }
          const updated = await refillHearts(result);
          setGameData(updated);
        },
      },
    ]);
  };

  const handleSaveName = async () => {
    if (nameInput.trim()) {
      await saveNickname(nameInput.trim());
      setNicknameState(nameInput.trim());
      // Sync to Supabase profile
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          await updateProfileNickname(userId, nameInput.trim());
        }
      } catch {}
    }
    setEditingName(false);
  };

  if (!gameData) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('app.title')}</Text>
          <Text style={styles.subtitle}>{t('app.subtitle')}</Text>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              Alert.alert(t('auth.logout'), t('auth.logoutConfirm'), [
                {text: t('common.cancel'), style: 'cancel'},
                {
                  text: t('auth.logout'),
                  style: 'destructive',
                  onPress: () => supabase.auth.signOut(),
                },
              ]);
            }}>
            <Text style={styles.logoutText}>{t('auth.logout')}</Text>
          </TouchableOpacity>
        </View>

        {/* Nickname */}
        <View style={styles.nicknameContainer}>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                maxLength={10}
                autoFocus
                onSubmitEditing={handleSaveName}
              />
              <TouchableOpacity onPress={handleSaveName} style={styles.nameBtn}>
                <Text style={styles.nameBtnText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setNameInput(nickname);
                setEditingName(true);
              }}>
              <Text style={styles.nickname}>
                👤 {nickname} ✏️
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Announcement Banner */}
        {announcement && (
          <TouchableOpacity
            style={styles.announceBanner}
            onPress={() => {
              Alert.alert(announcement.title, announcement.content);
              setAnnouncement(null);
            }}>
            <Text style={styles.announceText}>
              📢 {announcement.title}
            </Text>
          </TouchableOpacity>
        )}

        {/* Resources */}
        <View style={styles.resourceRow}>
          <TouchableOpacity style={styles.resource} onPress={handleRefillHearts}>
            <Text style={styles.resourceEmoji}>❤️</Text>
            <Text style={styles.resourceValue}>
              {gameData.hearts}/{MAX_HEARTS}
            </Text>
            {timerText ? <Text style={styles.timer}>{timerText}</Text> : null}
          </TouchableOpacity>
          <View style={styles.resource}>
            <Text style={styles.resourceEmoji}>⭐</Text>
            <Text style={styles.resourceValue}>{gameData.stars}</Text>
          </View>
          <View style={styles.resource}>
            <Text style={styles.resourceEmoji}>💎</Text>
            <Text style={styles.resourceValue}>{gameData.diamonds}</Text>
          </View>
        </View>

        {/* Menu Buttons */}
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={[styles.menuBtn, {backgroundColor: '#6366f1'}]}
            onPress={() => navigation.navigate('Levels')}>
            <Text style={styles.menuEmoji}>🗺️</Text>
            <Text style={styles.menuText}>{t('home.levelMode')}</Text>
            <Text style={styles.menuDesc}>{t('home.levelDesc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuBtn, {backgroundColor: '#22c55e'}]}
            onPress={() => navigation.navigate('Endless')}>
            <Text style={styles.menuEmoji}>♾️</Text>
            <Text style={styles.menuText}>{t('home.endlessMode')}</Text>
            <Text style={styles.menuDesc}>{t('home.endlessDesc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuBtn, {backgroundColor: '#8b5cf6'}]}
            onPress={() => navigation.navigate('Lobby')}>
            <Text style={styles.menuEmoji}>⚔️</Text>
            <Text style={styles.menuText}>{t('home.battleMode')}</Text>
            <Text style={styles.menuDesc}>{t('home.battleDesc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuBtn, {backgroundColor: '#f59e0b'}]}
            onPress={() => navigation.navigate('Missions')}>
            <Text style={styles.menuEmoji}>📋</Text>
            <Text style={styles.menuText}>{t('home.missions')}</Text>
            <Text style={styles.menuDesc}>{t('home.missionsDesc')}</Text>
          </TouchableOpacity>

          <View style={[styles.menuBtn, {backgroundColor: '#374151', opacity: 0.6}]}>
            <Text style={styles.menuEmoji}>🐉</Text>
            <Text style={styles.menuText}>{t('home.raidMode')}</Text>
            <Text style={styles.menuDesc}>{t('home.raidDesc')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0a2e',
  },
  scroll: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#e2e8f0',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#a5b4fc',
    marginTop: 4,
  },
  logoutBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  nicknameContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  nickname: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    backgroundColor: '#1e1b4b',
    color: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#6366f1',
    minWidth: 150,
  },
  nameBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  nameBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  resourceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(30, 27, 75, 0.6)',
    borderRadius: 12,
    padding: 12,
  },
  resource: {
    alignItems: 'center',
    minWidth: 60,
  },
  resourceEmoji: {
    fontSize: 24,
  },
  resourceValue: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  timer: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  menuContainer: {
    gap: 12,
  },
  menuBtn: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuEmoji: {
    fontSize: 32,
  },
  menuText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  announceBanner: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  announceText: {
    color: '#a5b4fc',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  menuDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
});
