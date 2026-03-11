import 'react-native-gesture-handler';
import React, { Component, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';

import { AuthProvider } from './src/context/AuthContext';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';
import NotificationProvider from './src/providers/NotificationProvider';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldSetBadge: true,
    shouldPlaySound: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info.componentStack);
    // TODO: report to Crashlytics / Sentry when integrated
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>Please try again or restart the app.</Text>
          <TouchableOpacity style={errorStyles.retryButton} onPress={this.handleRetry}>
            <Text style={errorStyles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f1f5f9',
  },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8, color: '#1f2937' },
  message: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  retryButton: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});

const App = () => {
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(_notification => {
      // Notification received while app is foregrounded — no-op, alert is shown automatically
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const screen = typeof data?.screen === 'string' ? data.screen : null;

      if (!navigationRef.current) {
        return;
      }

      if (screen === 'Park') {
        navigationRef.current.navigate('Main', { screen: 'Park' });
      } else if (screen === 'Check-In') {
        navigationRef.current.navigate('Main', { screen: 'Check-In' });
      } else if (screen === 'Profile') {
        navigationRef.current.navigate('Main', { screen: 'Profile' });
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
