import React, {useState, useEffect, useCallback} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {supabase} from '../services/supabase';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import LevelsScreen from '../screens/LevelsScreen';
import SingleGameScreen from '../screens/SingleGameScreen';
import EndlessScreen from '../screens/EndlessScreen';
import LobbyScreen from '../screens/LobbyScreen';
import BattleScreen from '../screens/BattleScreen';
import MissionsScreen from '../screens/MissionsScreen';

const Stack = createNativeStackNavigator();

type AppState = 'splash' | 'login' | 'app';

export default function AppNavigator() {
  const [appState, setAppState] = useState<AppState>('splash');

  const checkAuth = useCallback(async () => {
    const {data: {session}} = await supabase.auth.getSession();
    setAppState(session ? 'app' : 'login');
  }, []);

  useEffect(() => {
    const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
      if (appState !== 'splash') {
        setAppState(session ? 'app' : 'login');
      }
    });
    return () => subscription.unsubscribe();
  }, [appState]);

  if (appState === 'splash') {
    return <SplashScreen onFinish={checkAuth} />;
  }

  if (appState === 'login') {
    return <LoginScreen onLoginSuccess={() => setAppState('app')} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: {backgroundColor: '#0f0a2e'},
        }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Levels" component={LevelsScreen} />
        <Stack.Screen name="SingleGame" component={SingleGameScreen} />
        <Stack.Screen name="Endless" component={EndlessScreen} />
        <Stack.Screen name="Lobby" component={LobbyScreen} />
        <Stack.Screen name="Battle" component={BattleScreen} />
        <Stack.Screen name="Missions" component={MissionsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
