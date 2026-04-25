import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AdminScreen from '../screens/AdminScreen';
import UiStudioScreen from '../screens/UiStudioScreen';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import BalanceStudioScreen from '../screens/admin/BalanceStudioScreen';
import CreatorStudioScreen from '../screens/admin/CreatorStudioScreen';
import GameplayStudioScreen from '../screens/admin/GameplayStudioScreen';

const Stack = createNativeStackNavigator();

export default function AdminAppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="AdminHome"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}>
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
      <Stack.Screen name="UiStudio" component={UiStudioScreen} />
      <Stack.Screen name="GameplayStudio" component={GameplayStudioScreen} />
      <Stack.Screen name="CreatorStudio" component={CreatorStudioScreen} />
      <Stack.Screen name="BalanceStudio" component={BalanceStudioScreen} />
      <Stack.Screen name="AdminOps" component={AdminScreen} />
    </Stack.Navigator>
  );
}
