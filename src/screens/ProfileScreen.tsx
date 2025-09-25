import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, NavigationProp, useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Timestamp, collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';

import { useAuth } from '../context/AuthContext';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { colors, shadows } from '../constants/theme';
import { PARK_LOOKUP } from '../constants/parks';
import { db } from '../config/firebase';
import { useNotifications } from '../providers/NotificationProvider';

type CheckInHistoryItem = {
  checkinId: string;
  parkName: string;
  timestamp: number;
  active: boolean;
  parkId?: string;
};

type ProfileScreenNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NavigationProp<RootStackParamList>
>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigation>();
  const { currentUser, userProfile, dogProfile, profileLoading, handleSignOut } = useAuth();
  const { settings: notificationSettings, hasPermission, requestPermissions, updateSettings, registering } = useNotifications();
  const [checkinHistory, setCheckinHistory] = useState<CheckInHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const accountName = useMemo(() => {
    if (userProfile?.name?.trim()) {
      return userProfile.name;
    }

    if (currentUser?.displayName?.trim()) {
      return currentUser.displayName;
    }

    return 'Guest';
  }, [currentUser?.displayName, userProfile?.name]);

  const accountEmail = currentUser?.email ?? userProfile?.email ?? 'No email linked yet';
  const dogName = dogProfile?.name ?? 'Add your pup';
  const dogBreed = dogProfile?.breed || 'Breed not added yet';
  const dogTemperament = dogProfile?.temperament || 'Temperament not added yet';
  const dogPhotoUrl = dogProfile?.photoUrl?.trim() ?? '';

  const handleNavigateToEdit = () => {
    navigation.navigate('DogProfile', {
      mode: dogProfile ? 'edit' : 'create',
      returnToTab: 'Profile',
    });
  };

  const handleSignOutPress = async () => {
    try {
      await handleSignOut();
    } catch (error) {
      Alert.alert('Sign out failed', error instanceof Error ? error.message : String(error));
    }
  };

  useEffect(() => {
    const loadHistory = async () => {
      if (!currentUser?.uid || !dogProfile?.dogProfileId) {
        setCheckinHistory([]);
        setHistoryLoading(false);
        return;
      }

      try {
        setHistoryLoading(true);
        setHistoryError(null);

        const historyQuery = query(
          collection(db, 'checkins'),
          where('ownerUid', '==', currentUser.uid),
          where('dogProfileId', '==', dogProfile.dogProfileId),
          orderBy('timestamp', 'desc'),
          limit(20),
        );

        const snapshot = await getDocs(historyQuery);

        const historyItems = await Promise.all(snapshot.docs.map(async docSnapshot => {
          const data = docSnapshot.data();

          const parkId: string | undefined = data.parkId;
          const parkFromLookup = parkId ? PARK_LOOKUP[parkId] : undefined;
          let resolvedParkName = data.parkName ?? parkFromLookup?.name ?? 'Dog Park';

          if (!data.parkName && parkId && !parkFromLookup) {
            try {
              const parkDoc = await getDoc(doc(db, 'parks', parkId));

              if (parkDoc.exists()) {
                const remoteParkName = parkDoc.data()?.name;

                if (typeof remoteParkName === 'string' && remoteParkName.trim().length) {
                  resolvedParkName = remoteParkName;
                }
              }
            } catch (lookupError) {
              // Ignore lookup errors and fall back to existing label
            }
          }

          return {
            checkinId: docSnapshot.id,
            parkName: resolvedParkName,
            timestamp: data.timestamp ?? Timestamp.now().toMillis(),
            active: Boolean(data.active),
            parkId,
          } satisfies CheckInHistoryItem;
        }));

        setCheckinHistory(historyItems);
      } catch (error) {
        setCheckinHistory([]);
        setHistoryError(error instanceof Error ? error.message : 'Unable to load check-ins.');
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();
  }, [currentUser?.uid, dogProfile?.dogProfileId, profileLoading]);

  const historyContent = useMemo(() => {
    if (historyLoading) {
      return (
        <View style={styles.historyLoadingRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.historyLoadingText}>Loading recent check-ins…</Text>
        </View>
      );
    }

    if (historyError) {
      return <Text style={styles.historyErrorText}>{historyError}</Text>;
    }

    if (!checkinHistory.length) {
      return <Text style={styles.historyEmptyText}>No check-ins recorded yet.</Text>;
    }

    return checkinHistory.map(item => {
      const readableDate = new Date(item.timestamp);
      const dateString = readableDate.toLocaleDateString();
      const timeString = readableDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return (
        <View key={item.checkinId} style={styles.historyRow}>
          <View>
            <Text style={styles.historyPark}>{item.parkName}</Text>
            <Text style={styles.historyDate}>{dateString}</Text>
          </View>
          <Text style={styles.historyTime}>{timeString}</Text>
        </View>
      );
    });
  }, [checkinHistory, historyError, historyLoading]);

  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Owner</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{accountName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{accountEmail}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.dogHeader}>
            <Text style={styles.sectionHeading}>Dog profile</Text>
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={handleNavigateToEdit}
              accessibilityRole="button"
            >
              <Text style={styles.outlineButtonText}>{dogProfile ? 'Edit' : 'Create'}</Text>
            </TouchableOpacity>
          </View>
          {dogPhotoUrl ? (
            <Image source={{ uri: dogPhotoUrl }} style={styles.dogImage} accessibilityLabel="Dog profile" />
          ) : (
            <View style={styles.dogPlaceholder}>
              <Text style={styles.placeholderInitial}>{dogName.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{dogName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Breed</Text>
            <Text style={styles.detailValue}>{dogBreed}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Temperament</Text>
            <Text style={styles.detailValue}>{dogTemperament}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Notifications</Text>
          <Text style={styles.sectionDescription}>
            Control push alerts when friends check in or create park events.
          </Text>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceDetails}>
              <Text style={styles.preferenceTitle}>Enable notifications</Text>
              <Text style={styles.preferenceSubtitle}>
                {hasPermission ? 'Active on this device.' : 'Grant permission to receive alerts.'}
              </Text>
            </View>
            <Switch
              value={notificationSettings.enabled}
              onValueChange={async nextEnabled => {
                if (nextEnabled && !hasPermission) {
                  await requestPermissions();
                }

                await updateSettings({
                  enabled: nextEnabled,
                  preferences: notificationSettings.preferences,
                });
              }}
            />
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceDetails}>
              <Text style={styles.preferenceTitle}>Friend check-ins</Text>
              <Text style={styles.preferenceSubtitle}>Alert me when friends arrive at this park.</Text>
            </View>
            <Switch
              value={notificationSettings.preferences.notifyOnFriendCheckin}
              onValueChange={async nextValue => {
                await updateSettings({
                  enabled: notificationSettings.enabled,
                  preferences: {
                    ...notificationSettings.preferences,
                    notifyOnFriendCheckin: nextValue,
                  },
                });
              }}
              disabled={!notificationSettings.enabled}
            />
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceDetails}>
              <Text style={styles.preferenceTitle}>Friend events</Text>
              <Text style={styles.preferenceSubtitle}>Alert me when friends host park events.</Text>
            </View>
            <Switch
              value={notificationSettings.preferences.notifyOnFriendEvent}
              onValueChange={async nextValue => {
                await updateSettings({
                  enabled: notificationSettings.enabled,
                  preferences: {
                    ...notificationSettings.preferences,
                    notifyOnFriendEvent: nextValue,
                  },
                });
              }}
              disabled={!notificationSettings.enabled}
            />
          </View>

          {!hasPermission ? (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermissions}
              disabled={registering}
            >
              <Text style={styles.permissionButtonText}>
                {registering ? 'Requesting…' : 'Enable device notifications'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Recent check-ins</Text>
          <View style={styles.historyContainer}>{historyContent}</View>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOutPress}
          accessibilityRole="button"
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    gap: 12,
    ...shadows.card,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  dogImage: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: colors.border,
  },
  dogPlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderInitial: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.accent,
  },
  dogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outlineButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: '#fff',
  },
  outlineButtonText: {
    color: colors.accent,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  signOutText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  historyContainer: {
    gap: 12,
  },
  historyLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyLoadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  historyErrorText: {
    fontSize: 13,
    color: colors.danger,
  },
  historyEmptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyPark: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  historyDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 16,
  },
  preferenceDetails: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  preferenceSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  permissionButton: {
    marginTop: 12,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ProfileScreen;

