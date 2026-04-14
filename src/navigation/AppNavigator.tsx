import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState as RNAppState,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GameDialogHost from '../components/GameDialogHost';
import { flushPlayerStateNow } from '../services/playerState';
import { installGameAlertBridge } from '../services/gameDialogService';
import { supabase, getCurrentUserId } from '../services/supabase';
import {
  checkForUpdate,
  downloadAndInstall,
  showUpdateDialog,
} from '../services/updateService';
import {
  getSelectedCharacter,
  loadCharacterData,
  loadGameData,
  preloadGameStoreState,
} from '../stores/gameStore';
import { CHARACTER_CLASSES } from '../constants/characters';
import {
  downloadPublishedVisualConfigIfNeeded,
  loadCachedVisualConfigManifest,
} from '../services/visualConfigService';
import {
  downloadPublishedCreatorManifestIfNeeded,
  ensureCreatorDraftSeeded,
  loadCachedCreatorManifest,
} from '../services/creatorService';
import { getAdminStatus } from '../services/adminSync';
import { updatePresence } from '../services/friendService';
import AdminScreen from '../screens/AdminScreen';
import BattleScreen from '../screens/BattleScreen';
import BossCodexScreen from '../screens/BossCodexScreen';
import EndlessScreen from '../screens/EndlessScreen';
import FriendChatScreen from '../screens/FriendChatScreen';
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
import RankingScreen from '../screens/RankingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ShopScreen from '../screens/ShopScreen';
import SingleGameScreen from '../screens/SingleGameScreen';
import SkillTreeScreen from '../screens/SkillTreeScreen';
import SkinCollectionScreen from '../screens/SkinCollectionScreen';
import UiStudioScreen from '../screens/UiStudioScreen';

const Stack = createNativeStackNavigator();

type AppState = 'intro' | 'login' | 'app';

const SESSION_ID = `${Date.now()}_${Math.random()
  .toString(36)
  .substring(2, 10)}`;
const UPDATE_CHECK_SUCCESS_INTERVAL_MS = 15 * 60 * 1000;
const UPDATE_CHECK_FAILURE_RETRY_MS = 2 * 60 * 1000;
const UPDATE_CHECK_DELAY_MS = 1200;

installGameAlertBridge();

export default function AppNavigator() {
  const [appState, setAppState] = useState<AppState>('intro');
  const [introReadyToExit, setIntroReadyToExit] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const introExitedRef = useRef(false);
  const introBootstrapStartedRef = useRef(false);
  const introNextStateRef = useRef<Exclude<AppState, 'intro'>>('login');
  const appStateRef = useRef<AppState>('intro');
  const sessionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const updateCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const updateCheckInFlightRef = useRef(false);
  const lastSuccessfulUpdateCheckAtRef = useRef(0);
  const lastFailedUpdateCheckAtRef = useRef(0);
  const lastPromptedUpdateVersionRef = useRef<string | null>(null);
  const startupBootstrapPromiseRef = useRef<Promise<void> | null>(null);
  const presenceUserIdRef = useRef<string | null>(null);

  const registerSession = useCallback(async (userId: string) => {
    presenceUserIdRef.current = userId;
    await updatePresence(userId, true, SESSION_ID);
  }, []);

  const setOfflinePresence = useCallback(async (userId?: string | null) => {
    const targetUserId = userId ?? presenceUserIdRef.current;
    if (!targetUserId) {
      return;
    }

    await updatePresence(targetUserId, false, null);
    if (presenceUserIdRef.current === targetUserId) {
      presenceUserIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  const checkSession = useCallback(async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return;
      }

      const { data } = await supabase
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
          [{ text: '확인', onPress: () => supabase.auth.signOut() }],
        );
      }
    } catch {}
  }, []);

  const scheduleUpdateCheck = useCallback(() => {
    const now = Date.now();
    if (updateCheckInFlightRef.current) {
      return;
    }

    if (
      lastSuccessfulUpdateCheckAtRef.current > 0 &&
      now - lastSuccessfulUpdateCheckAtRef.current <
        UPDATE_CHECK_SUCCESS_INTERVAL_MS
    ) {
      return;
    }

    if (
      lastFailedUpdateCheckAtRef.current > 0 &&
      now - lastFailedUpdateCheckAtRef.current < UPDATE_CHECK_FAILURE_RETRY_MS
    ) {
      return;
    }

    if (updateCheckTimeoutRef.current) {
      clearTimeout(updateCheckTimeoutRef.current);
    }

    updateCheckTimeoutRef.current = setTimeout(() => {
      updateCheckTimeoutRef.current = null;

      if (updateCheckInFlightRef.current) {
        return;
      }

      updateCheckInFlightRef.current = true;

      void (async () => {
        try {
          const { update, errorMessage } = await checkForUpdate();
          const completedAt = Date.now();

          if (errorMessage) {
            lastFailedUpdateCheckAtRef.current = completedAt;
            console.warn('Auto update check failed:', errorMessage);
            return;
          }

          lastSuccessfulUpdateCheckAtRef.current = completedAt;
          lastFailedUpdateCheckAtRef.current = 0;

          if (!update) {
            return;
          }

          if (lastPromptedUpdateVersionRef.current === update.versionName) {
            return;
          }

          lastPromptedUpdateVersionRef.current = update.versionName;

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
        } catch (error) {
          lastFailedUpdateCheckAtRef.current = Date.now();
          console.warn('Unexpected auto update check error:', error);
        } finally {
          updateCheckInFlightRef.current = false;
        }
      })();
    }, UPDATE_CHECK_DELAY_MS);
  }, []);

  const preloadHomeEntryData = useCallback(async () => {
    const [, selectedCharacterId] = await Promise.all([
      loadGameData(),
      getSelectedCharacter(),
    ]);

    if (selectedCharacterId) {
      await loadCharacterData(selectedCharacterId);
    }

    await Promise.all(
      CHARACTER_CLASSES.map(async characterClass => {
        try {
          await loadCharacterData(characterClass.id);
        } catch {}
      }),
    );
  }, []);

  const runStartupBootstrap = useCallback(async () => {
    if (startupBootstrapPromiseRef.current) {
      return startupBootstrapPromiseRef.current;
    }

    startupBootstrapPromiseRef.current = (async () => {
      await Promise.all([
        loadCachedVisualConfigManifest().catch(() => {}),
        loadCachedCreatorManifest().catch(() => {}),
      ]);

      await Promise.all([
        preloadGameStoreState().catch(() => {}),
        downloadPublishedVisualConfigIfNeeded().catch(() => {}),
        downloadPublishedCreatorManifestIfNeeded().catch(() => {}),
        preloadHomeEntryData().catch(() => {}),
      ]);

      try {
        if (await getAdminStatus()) {
          await ensureCreatorDraftSeeded();
        }
      } catch {}
    })();

    try {
      return await startupBootstrapPromiseRef.current;
    } finally {
      startupBootstrapPromiseRef.current = null;
    }
  }, [preloadHomeEntryData]);

  const checkAuth = useCallback(
    async ({
      blockOnBootstrap = false,
    }: { blockOnBootstrap?: boolean } = {}) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        void registerSession(session.user.id);
      }

      scheduleUpdateCheck();

      if (!session?.user) {
        await setOfflinePresence();
        setAppState('login');
        return;
      }

      if (blockOnBootstrap) {
        await runStartupBootstrap();
        setAppState('app');
        return;
      }

      setAppState('app');
      void runStartupBootstrap();
    },
    [
      registerSession,
      runStartupBootstrap,
      scheduleUpdateCheck,
      setOfflinePresence,
    ],
  );

  useEffect(() => {
    if (appState !== 'intro' || introBootstrapStartedRef.current) {
      return;
    }

    introBootstrapStartedRef.current = true;

    void (async () => {
      let hasSessionUser = false;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        hasSessionUser = Boolean(session?.user);

        if (session?.user) {
          void registerSession(session.user.id);
        }

        scheduleUpdateCheck();

        if (!session?.user) {
          await setOfflinePresence();
          introNextStateRef.current = 'login';
          return;
        }

        await runStartupBootstrap();
        introNextStateRef.current = 'app';
      } catch (error) {
        console.warn('Initial intro bootstrap failed:', error);
        introNextStateRef.current = hasSessionUser ? 'app' : 'login';
      } finally {
        setIntroReadyToExit(true);
      }
    })();
  }, [
    appState,
    registerSession,
    runStartupBootstrap,
    scheduleUpdateCheck,
    setOfflinePresence,
  ]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!introExitedRef.current) {
        return;
      }

      if (session?.user) {
        void registerSession(session.user.id);
        scheduleUpdateCheck();
        const needsBlockingBootstrap =
          event === 'SIGNED_IN' || appStateRef.current === 'login';

        if (needsBlockingBootstrap) {
          await runStartupBootstrap();
          setAppState('app');
          return;
        }

        setAppState('app');
        void runStartupBootstrap();
      } else {
        void setOfflinePresence();
        if (sessionCheckRef.current) {
          clearInterval(sessionCheckRef.current);
          sessionCheckRef.current = null;
        }
        setAppState('login');
        scheduleUpdateCheck();
      }
    });

    return () => subscription.unsubscribe();
  }, [
    registerSession,
    runStartupBootstrap,
    scheduleUpdateCheck,
    setOfflinePresence,
  ]);

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
    void loadCachedVisualConfigManifest();
    void loadCachedCreatorManifest();
  }, []);

  useEffect(() => {
    const subscription = RNAppState.addEventListener('change', nextState => {
      if (
        introExitedRef.current &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        void flushPlayerStateNow('app_background');
        void setOfflinePresence();
      }

      if (nextState === 'active' && introExitedRef.current) {
        checkAuth();
      }
    });

    return () => subscription.remove();
  }, [checkAuth, setOfflinePresence]);

  useEffect(() => {
    return () => {
      if (updateCheckTimeoutRef.current) {
        clearTimeout(updateCheckTimeoutRef.current);
      }
      void setOfflinePresence();
    };
  }, [setOfflinePresence]);

  const handleIntroFinish = useCallback(() => {
    if (introExitedRef.current) {
      return;
    }

    introExitedRef.current = true;
    setAppState(introNextStateRef.current);
  }, []);

  if (appState === 'intro') {
    return (
      <>
        <IntroScreen
          readyToExit={introReadyToExit}
          onFinish={handleIntroFinish}
        />
        <GameDialogHost />
        <UpdateProgressOverlay downloadProgress={downloadProgress} />
      </>
    );
  }

  if (appState === 'login') {
    return (
      <>
        <LoginScreen
          onLoginSuccess={() => checkAuth({ blockOnBootstrap: true })}
        />
        <GameDialogHost />
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
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Missions" component={MissionsScreen} />
          <Stack.Screen name="Levels" component={LevelsScreen} />
          <Stack.Screen name="Ranking" component={RankingScreen} />
          <Stack.Screen
            name="KnightSpriteTuner"
            component={KnightSpriteTunerScreen}
          />
          <Stack.Screen name="UiStudio" component={UiStudioScreen} />
          <Stack.Screen name="SingleGame" component={SingleGameScreen} />
          <Stack.Screen name="Endless" component={EndlessScreen} />
          <Stack.Screen name="Lobby" component={LobbyScreen} />
          <Stack.Screen name="Battle" component={BattleScreen} />
          <Stack.Screen name="RaidLobby" component={RaidLobbyScreen} />
          <Stack.Screen name="Raid" component={RaidScreen} />
          <Stack.Screen name="Shop" component={ShopScreen} />
          <Stack.Screen name="Friends" component={FriendsScreen} />
          <Stack.Screen name="FriendChat" component={FriendChatScreen} />
          <Stack.Screen name="BossCodex" component={BossCodexScreen} />
          <Stack.Screen
            name="SkinCollection"
            component={SkinCollectionScreen}
          />
          <Stack.Screen name="SkillTree" component={SkillTreeScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <GameDialogHost />
      <UpdateProgressOverlay downloadProgress={downloadProgress} />
    </>
  );
}

function BootLoadingScreen() {
  return (
    <View style={styles.bootOverlay}>
      <View style={styles.bootCard}>
        <ActivityIndicator size="large" color="#7f5a32" />
        <Text style={styles.bootTitle}>게임 데이터를 준비 중입니다</Text>
        <Text style={styles.bootSubtitle}>
          로딩이 끝나면 바로 게임 화면으로 이동합니다.
        </Text>
      </View>
    </View>
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
            <View
              style={[styles.barFill, { width: `${downloadProgress ?? 0}%` }]}
            />
          </View>
          <Text style={styles.percent}>{downloadProgress ?? 0}%</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bootOverlay: {
    flex: 1,
    backgroundColor: '#1b120c',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bootCard: {
    width: 320,
    maxWidth: '100%',
    backgroundColor: '#fff4df',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#8a5e35',
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
    shadowColor: '#160d06',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  bootTitle: {
    color: '#5f3a1e',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
  bootSubtitle: {
    color: '#7a5433',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: 280,
    backgroundColor: '#fff4df',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: '#8a5e35',
    shadowColor: '#160d06',
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  title: {
    color: '#5f3a1e',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
  },
  barBg: {
    height: 10,
    backgroundColor: '#d8c1a1',
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    backgroundColor: '#7f5a32',
    borderRadius: 999,
  },
  percent: {
    color: '#73451e',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
});
