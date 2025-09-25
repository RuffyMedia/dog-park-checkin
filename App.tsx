import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationProvider from './src/providers/NotificationProvider';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldSetBadge: false,
    shouldPlaySound: false,
  }),
});

const App = () => {
  useEffect(() => {
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
