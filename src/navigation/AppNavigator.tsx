import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import AuthScreen from '../screens/auth/AuthScreen';
import DogProfileSetupScreen from '../screens/auth/DogProfileSetupScreen';
import CheckInScreen from '../screens/CheckInScreen';
import ParkScreen from '../screens/ParkScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ParkAnalyticsScreen from '../screens/ParkAnalyticsScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

type MainTabNavigatorProps = NativeStackScreenProps<RootStackParamList, 'Main'>;

const MainTabNavigator = ({ route }: MainTabNavigatorProps) => {
  const initialTab = route.params?.screen ?? 'Park';

  return (
    <Tab.Navigator
      initialRouteName={initialTab}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1f2937',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          height: 64,
          paddingBottom: 12,
          paddingTop: 8,
        },
      }}
    >
      <Tab.Screen name="Park" component={ParkScreen} />
      <Tab.Screen name="Park Analytics" component={ParkAnalyticsScreen} />
      <Tab.Screen name="Check-In" component={CheckInScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { currentUser, userProfile, dogProfile, profileLoading, initializing } = useAuth();

  const navigatorState = useMemo(() => {
    if (initializing || profileLoading) {
      return 'loading';
    }

    if (!currentUser) {
      return 'auth';
    }

    const hasLinkedDogProfile = Boolean(userProfile?.dogProfileId);
    const dogProfileComplete = Boolean((dogProfile?.name?.trim() ?? '').length > 0);

    if (!hasLinkedDogProfile || !dogProfileComplete) {
      return 'dogProfile';
    }

    return 'main';
  }, [currentUser, dogProfile?.name, initializing, profileLoading, userProfile?.dogProfileId]);

  if (navigatorState === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (navigatorState === 'auth') {
    return (
      <NavigationContainer key="auth">
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer key={navigatorState}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={navigatorState === 'dogProfile' ? 'DogProfile' : 'Main'}>
        <Stack.Screen
          name="Main"
          component={MainTabNavigator}
          initialParams={{ screen: 'Park' }}
        />
        <Stack.Screen
          name="DogProfile"
          component={DogProfileSetupScreen}
          initialParams={{ mode: navigatorState === 'dogProfile' ? 'create' : 'edit', returnToTab: 'Profile' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
});

