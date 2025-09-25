import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { useAuth } from '../context/AuthContext';
import { NotificationSettings } from '../types/firestore';
import { saveNotificationToken, updateNotificationSettings } from '../services/userService';

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
  });
}

type NotificationContextValue = {
  registering: boolean;
  settings: NotificationSettings | null;
  hasPermission: boolean;
  requestPermissions: () => Promise<void>;
  updateSettings: (next: NotificationSettings) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

type NotificationProviderProps = {
  children: ReactNode;
};

const defaultPreferences: NotificationSettings = {
  enabled: true,
  preferences: {
    notifyOnFriendCheckin: true,
    notifyOnFriendEvent: true,
  },
};

const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const { currentUser, notificationSettings } = useAuth();
  const [registering, setRegistering] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(notificationSettings ?? null);

  useEffect(() => {
    setSettings(notificationSettings ?? null);
  }, [notificationSettings?.enabled, notificationSettings?.preferences.notifyOnFriendCheckin, notificationSettings?.preferences.notifyOnFriendEvent]);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!Device.isDevice) {
        setHasPermission(false);
        return;
      }

      const existingStatus = await Notifications.getPermissionsAsync();
      setHasPermission(existingStatus.status === 'granted');
    };

    checkPermissions();
  }, []);

  useEffect(() => {
    const registerToken = async () => {
      if (!currentUser?.uid || !settings?.enabled || !hasPermission) {
        return;
      }

      try {
        setRegistering(true);
        const expoToken = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID,
        });

        await saveNotificationToken(currentUser.uid, {
          token: expoToken.data,
          platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          enabled: true,
        });
      } catch (error) {
        console.warn('Failed to register push token', error);
      } finally {
        setRegistering(false);
      }
    };

    registerToken();
  }, [currentUser?.uid, hasPermission, settings?.enabled]);

  const requestPermissions = async () => {
    if (!Device.isDevice) {
      Alert.alert('Unsupported', 'Push notifications require a physical device or supported emulator.');
      return;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    setHasPermission(granted);

    if (!granted) {
      Alert.alert('Permissions needed', 'Enable notifications in Settings to receive alerts.');
    }
  };

  const updateSettingsHandler = async (next: NotificationSettings) => {
    if (!currentUser?.uid) {
      return;
    }

    await updateNotificationSettings(currentUser.uid, next);
    setSettings(next);
  };

  const value = useMemo<NotificationContextValue>(() => ({
    registering,
    settings: settings ?? defaultPreferences,
    hasPermission,
    requestPermissions,
    updateSettings: updateSettingsHandler,
  }), [hasPermission, registering, settings]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }

  return context;
};

export default NotificationProvider;
