import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  AppState as RNAppState,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {flushPlayerStateNow} from '../services/playerState';
import {supabase, getCurrentUserId} from '../services/supabase';
import {
  checkForUpdate,
  downloadAndInstall,
  showUpdateDialog,
} from '../services/updateService';
import {preloadGameStoreState} from '../stores/gameStore';
import AdminScreen from '../screens/AdminScreen';
import BattleScreen from '../screens/BattleScreen';
import BossCodexScreen from '../screens/BossCodexScreen';
import EndlessScreen from '../screens/EndlessScreen';
import FriendsScreen from '../screens/FriendsScreen';
import HomeScreen from '../screens/HomeScreen';
import IntroScreen from '../screens/IntroScreen';
import KnightSpriteTunerScreen from '../screens/KnightSpriteTunerScreen';
import LevelsScreen from '../screens/LevelsScreen';
import LobbyScreen from '../screens/LobbyScreen';
import LoginScreen from '../screens/LoginScreen';
import MissionsScreen from '../screens/MissionsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RaidLobbyScreen from '../screens/RaidLobbyScreen';
import RaidScreen from '../screens/RaidScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ShopScreen from '../screens/ShopScreen';
import SingleGameScreen from '../screens/SingleGameScreen';
import SkillTreeScreen from '../screens/SkillTreeScreen';
import SkinCollectionScreen from '../screens/SkinCollectionScreen';

const Stack = createNativeStackNavigator();

type AppState = 'intro' | 'login' | 'app';

const SESSION_ID = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;
const UPDATE_CHECK_DELAY_MS = 1200;

export default function AppNavigator() {
  const [appState, setAppState] = useState<AppState>('intro');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const introExitedRef = useRef(false);
  const sessionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const updateCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdateCheckAtRef = useRef(0);

  const registerSession = useCallback(async (userId: string) => {
    await supabase.from('user_presence').upsert(
      {
        player_id: userId,
        session_id: SESSION_ID,
        last_seen: new Date().toISOString(),
        is_online: true,
      },
      {onConflict: 'player_id'},
    );
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return;
      }

      const {data} = await supabase
        .from('user_presence')
        .select('session_id')
        .eq('player_id', userId)
        .single();

      if (data?.session_id && data.session_id !== SESSION_ID) {
        if (sessionCheckRef.current) {
          clearInterval(sessionCheckRef.current);
          sessionCheckRef.current = null;
        }

        Alert.alert(
          '다른 기기에서 로그인됨',
          '다른 기기에서 로그인하여 현재 세션이 종료됩니다.',
          [{text: '확인', onPress: () => supabase.auth.signOut()}],
        );
      }
    } catch {}
  }, []);

  const scheduleUpdateCheck = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateCheckAtRef.current < UPDATE_CHECK_INTERVAL_MS) {
      return;
    }

    if (updateCheckTimeoutRef.current) {
      clearTimeout(updateCheckTimeoutRef.current);
    }

    updateCheckTimeoutRef.current = setTimeout(() => {
      updateCheckTimeoutRef.current = null;
      lastUpdateCheckAtRef.current = Date.now();

      void (async () => {
        try {
          const update = await checkForUpdate();
          if (!update) {
            return;
          }

          showUpdateDialog(update, nextUpdate => {
            setDownloadProgress(0);
            downloadAndInstall(
              nextUpdate,
              progress => setDownloadProgress(progress),
              () => setDownloadProgress(null),
              message => {
                setDownloadProgress(null);
                Alert.alert('업데이트 실패', message);
              },
            );
          });
        } catch {}
      })();
    }, UPDATE_CHECK_DELAY_MS);
  }, []);

  const checkAuth = useCallback(async () => {
    const {
      data: {session},
    } = await supabase.auth.getSession();

    if (session?.user) {
      void registerSession(session.user.id);
    }

    setAppState(session ? 'app' : 'login');

    if (!session?.user) {
      if (updateCheckTimeoutRef.current) {
        clearTimeout(updateCheckTimeoutRef.current);
        updateCheckTimeoutRef.current = null;
      }
      return;
    }

    void preloadGameStoreState();
    scheduleUpdateCheck();
  }, [registerSession, scheduleUpdateCheck]);

  useEffect(() => {
    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!introExitedRef.current) {
        return;
      }

      if (session?.user) {
        void registerSession(session.user.id);
        setAppState('app');
        void preloadGameStoreState();
        scheduleUpdateCheck();
      } else {
        if (sessionCheckRef.current) {
          clearInterval(sessionCheckRef.current);
          sessionCheckRef.current = null;
        }
        if (updateCheckTimeoutRef.current) {
          clearTimeout(updateCheckTimeoutRef.current);
          updateCheckTimeoutRef.current = null;
        }
        setAppState('login');
      }
    });

    return () => subscription.unsubscribe();
  }, [registerSession, scheduleUpdateCheck]);

  useEffect(() => {
    if (appState !== 'app') {
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
        sessionCheckRef.current = null;
      }
      return;
    }

    checkSession();
    sessionCheckRef.current = setInterval(checkSession, 10000);

    return () => {
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
        sessionCheckRef.current = null;
      }
    };
  }, [appState, checkSession]);

  useEffect(() => {
    const subscription = RNAppState.addEventListener('change', nextState => {
      if (
        introExitedRef.current &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        void flushPlayerStateNow('app_background');
      }

      if (nextState === 'active' && introExitedRef.current) {
        checkAuth();
      }
    });

    return () => subscription.remove();
  }, [checkAuth]);

  useEffect(() => {
    return () => {
      if (updateCheckTimeoutRef.current) {
        clearTimeout(updateCheckTimeoutRef.current);
      }
    };
  }, []);

  const handleIntroPress = useCallback(() => {
    if (introExitedRef.current) {
      return;
    }

    introExitedRef.current = true;
    checkAuth();
  }, [checkAuth]);

  if (appState === 'intro') {
    return (
      <>
        <IntroScreen onPress={handleIntroPress} />
        <UpdateProgressOverlay downloadProgress={downloadProgress} />
      </>
    );
  }

  if (appState === 'login') {
    return (
      <>
        <LoginScreen onLoginSuccess={() => setAppState('app')} />
        <UpdateProgressOverlay downloadProgress={downloadProgress} />
      </>
    );
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Missions" component={MissionsScreen} />
          <Stack.Screen name="Levels" component={LevelsScreen} />
          <Stack.Screen name="KnightSpriteTuner" component={KnightSpriteTunerScreen} />
          <Stack.Screen name="SingleGame" component={SingleGameScreen} />
          <Stack.Screen name="Endless" component={EndlessScreen} />
          <Stack.Screen name="Lobby" component={LobbyScreen} />
          <Stack.Screen name="Battle" component={BattleScreen} />
          <Stack.Screen name="RaidLobby" component={RaidLobbyScreen} />
          <Stack.Screen name="Raid" component={RaidScreen} />
          <Stack.Screen name="Shop" component={ShopScreen} />
          <Stack.Screen name="Friends" component={FriendsScreen} />
          <Stack.Screen name="BossCodex" component={BossCodexScreen} />
          <Stack.Screen name="SkinCollection" component={SkinCollectionScreen} />
          <Stack.Screen name="SkillTree" component={SkillTreeScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <UpdateProgressOverlay downloadProgress={downloadProgress} />
    </>
  );
}

function UpdateProgressOverlay({
  downloadProgress,
}: {
  downloadProgress: number | null;
}) {
  return (
    <Modal transparent visible={downloadProgress !== null} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>업데이트 다운로드 중</Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, {width: `${downloadProgress ?? 0}%`}]} />
          </View>
          <Text style={styles.percent}>{downloadProgress ?? 0}%</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  title: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
  },
  barBg: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    backgroundColor: '#6366f1',
    borderRadius: 999,
  },
  percent: {
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
});
