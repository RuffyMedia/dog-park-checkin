import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Timestamp, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { MONTEREY_COUNTY_DOG_PARKS, PARK_LOOKUP, Park } from '../constants/parks';
import { checkinsCollection, dogsCollection } from '../services/firestoreCollections';
import { DogDocument } from '../types/firestore';
import { colors, shadows } from '../constants/theme';

const RECENTLY_LEFT_THRESHOLD_MINUTES = 30;

type ActiveDogProfile = DogDocument & {
  checkinTimestamp: number;
  parkName?: string;
  checkedOutAt?: number | null;
};

const ParkScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDogs, setActiveDogs] = useState<ActiveDogProfile[]>([]);
  const [recentlyLeftDogs, setRecentlyLeftDogs] = useState<ActiveDogProfile[]>([]);
  const [selectedPark, setSelectedPark] = useState<Park>(MONTEREY_COUNTY_DOG_PARKS[0]);
  const [busyLevel, setBusyLevel] = useState<'quiet' | 'moderate' | 'busy'>('quiet');
  const [showBusyLegend, setShowBusyLegend] = useState(false);

  const fetchActiveDogProfiles = useCallback(async () => {
    setLoading(true);

    try {
      const activeCheckinsQuery = query(
        checkinsCollection,
        where('parkId', '==', selectedPark.parkId),
        orderBy('timestamp', 'desc'),
      );

      const checkinsSnapshot = await getDocs(activeCheckinsQuery);

      const now = Timestamp.now().toMillis();
      const recentlyLeftThreshold = now - RECENTLY_LEFT_THRESHOLD_MINUTES * 60 * 1000;

      const active: typeof checkinsSnapshot.docs = [];
      const recentlyLeft: typeof checkinsSnapshot.docs = [];

      checkinsSnapshot.docs.forEach(docSnapshot => {
        const data = docSnapshot.data();

        if (data.active) {
          active.push(docSnapshot);
          return;
        }

        const checkedOutAt = data.checkedOutAt ?? 0;

        if (checkedOutAt >= recentlyLeftThreshold) {
          recentlyLeft.push(docSnapshot);
        }
      });

      const buildDogEntries = async (documents: typeof checkinsSnapshot.docs) => {
        const entries = await Promise.all(
          documents.map(async entryDoc => {
            const data = entryDoc.data();
            const dogSnapshot = await getDoc(doc(dogsCollection, data.dogProfileId));

            if (!dogSnapshot.exists()) {
              return null;
            }

            const dogProfile = dogSnapshot.data();
            const dogPark = PARK_LOOKUP[data.parkId];

            return {
              ...dogProfile,
              checkinTimestamp: data.timestamp ?? 0,
              parkName: dogPark?.name ?? selectedPark.name,
              checkedOutAt: data.checkedOutAt ?? null,
            } satisfies ActiveDogProfile;
          }),
        );

        return entries.filter((entry): entry is ActiveDogProfile => Boolean(entry));
      };

      const [activeDogProfiles, recentlyLeftProfiles] = await Promise.all([
        buildDogEntries(active),
        buildDogEntries(recentlyLeft),
      ]);

      setActiveDogs(activeDogProfiles);
      setRecentlyLeftDogs(recentlyLeftProfiles);
      const activeCount = activeDogProfiles.length;

      if (activeCount <= 3) {
        setBusyLevel('quiet');
      } else if (activeCount <= 8) {
        setBusyLevel('moderate');
      } else {
        setBusyLevel('busy');
      }
    } catch (error) {
      setActiveDogs([]);
      setRecentlyLeftDogs([]);
      setBusyLevel('quiet');
    } finally {
      setLoading(false);
    }
  }, [selectedPark.parkId, selectedPark.name]);

  const handleSelectPark = useCallback((park: Park) => {
    if (park.parkId === selectedPark.parkId) {
      return;
    }

    setLoading(true);
    setActiveDogs([]);
    setSelectedPark(park);
  }, [selectedPark.parkId]);

  useEffect(() => {
    fetchActiveDogProfiles();
  }, [fetchActiveDogProfiles]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActiveDogProfiles();
    setRefreshing(false);
  }, [fetchActiveDogProfiles]);

  const renderDogItem = useCallback(({ item }: { item: ActiveDogProfile }) => {
    return (
      <View style={styles.card}>
        {item.photoUrl ? (
          <Image
            source={{ uri: item.photoUrl }}
            style={styles.dogImage}
            accessibilityLabel={`${item.name} photo`}
            onError={() => undefined}
            defaultSource={require('../../assets/icon.png')}
          />
        ) : (
          <View style={[styles.dogImage, styles.placeholderImage]}>
            <Text style={styles.placeholderInitial}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.detailsContainer}>
          <Text style={styles.dogName}>{item.name}</Text>
          <Text style={styles.dogDetail}>{item.breed || 'Breed not specified'}</Text>
          <Text style={styles.dogDetail}>{item.temperament || 'Temperament not specified'}</Text>
          <Text style={styles.parkBadge}>{item.parkName ?? selectedPark.name}</Text>
        </View>
      </View>
    );
  }, [selectedPark.name]);

  const keyExtractor = useCallback((item: ActiveDogProfile) => item.dogProfileId, []);

  const emptyListComponent = useMemo(() => {
    if (loading) {
      return null;
    }

    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateTitle}>No pups checked in</Text>
        <Text style={styles.emptyStateDescription}>
          When dogs check in at the park, you'll see them listed here.
        </Text>
      </View>
    );
  }, [loading]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <Text style={styles.heading}>Who’s here now</Text>
        <Text style={styles.description}>Friends playing at {selectedPark.name}</Text>
        <View style={styles.busyRow}>
          <View style={[styles.busyBadge, styles[`busyBadge_${busyLevel}`]]}>
            <MaterialCommunityIcons
              name={busyLevel === 'quiet' ? 'dog' : busyLevel === 'moderate' ? 'dog-side' : 'dog-service'}
              size={14}
              color={styles[`busyBadgeLabel_${busyLevel}`].color}
            />
            <Text style={[styles.busyBadgeLabel, styles[`busyBadgeLabel_${busyLevel}`]]}>
              {busyLevel === 'quiet' ? 'Quiet' : busyLevel === 'moderate' ? 'Moderate' : 'Busy'} · {activeDogs.length} pups here
            </Text>
          </View>

          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setShowBusyLegend(previous => !previous)}
            accessibilityRole="button"
            accessibilityLabel="Busy level legend"
            accessibilityState={{ expanded: showBusyLegend }}
          >
            <Feather name="info" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {showBusyLegend ? (
          <View style={styles.legendCard}>
            <View style={styles.legendRow}>
              <MaterialCommunityIcons name="dog" size={16} color={colors.textPrimary} />
              <Text style={styles.legendText}>Quiet · 0–3 pups</Text>
            </View>
            <View style={styles.legendRow}>
              <MaterialCommunityIcons name="dog-side" size={16} color="#92400e" />
              <Text style={styles.legendText}>Moderate · 4–8 pups</Text>
            </View>
            <View style={styles.legendRow}>
              <MaterialCommunityIcons name="dog-service" size={16} color="#991b1b" />
              <Text style={styles.legendText}>Busy · 9+ pups</Text>
            </View>
          </View>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {MONTEREY_COUNTY_DOG_PARKS.map(park => {
          const isSelected = park.parkId === selectedPark.parkId;

          return (
            <TouchableOpacity
              key={park.parkId}
              style={[styles.tabChip, isSelected ? styles.tabChipActive : null]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => handleSelectPark(park)}
            >
              <View style={styles.tabContent}>
                <Image
                  source={{ uri: park.image }}
                  style={styles.tabImage}
                  accessibilityLabel={`${park.name} photo`}
                  onError={() => undefined}
                />
                <Text style={[styles.tabLabel, isSelected ? styles.tabLabelActive : null]}>{park.name}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={activeDogs}
          keyExtractor={keyExtractor}
          renderItem={renderDogItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={emptyListComponent}
        />
      )}

      {recentlyLeftDogs.length ? (
        <View style={styles.recentSection}>
          <Text style={styles.recentHeading}>Recently Left</Text>
          {recentlyLeftDogs.map(dog => (
            <View key={dog.dogProfileId} style={[styles.card, styles.recentCard]}>
              {dog.photoUrl ? (
                <Image
                  source={{ uri: dog.photoUrl }}
                  style={[styles.dogImage, styles.recentImage]}
                  accessibilityLabel={`${dog.name} photo`}
                />
              ) : (
                <View style={[styles.dogImage, styles.placeholderImage, styles.recentImage]}>
                  <Text style={styles.placeholderInitial}>{dog.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.detailsContainer}>
                <Text style={[styles.dogName, styles.recentText]}>{dog.name}</Text>
                <Text style={[styles.dogDetail, styles.recentText]}>{dog.breed || 'Breed not specified'}</Text>
                <Text style={[styles.dogDetail, styles.recentText]}>{dog.temperament || 'Temperament not specified'}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
    gap: 8,
  },
  tabsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  tabChip: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    ...shadows.card,
  },
  tabChipActive: {
    backgroundColor: colors.accent,
    shadowOpacity: 0.25,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tabImage: {
    width: 44,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.border,
  },
  tabLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#fff',
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  description: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  busyBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.accentMuted,
  },
  busyBadge_quiet: {
    backgroundColor: colors.accentMuted,
  },
  busyBadge_moderate: {
    backgroundColor: '#fef3c7',
  },
  busyBadge_busy: {
    backgroundColor: '#fee2e2',
  },
  busyBadgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  busyBadgeLabel_quiet: {
    color: colors.textPrimary,
  },
  busyBadgeLabel_moderate: {
    color: '#92400e',
  },
  busyBadgeLabel_busy: {
    color: '#991b1b',
  },
  infoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  legendCard: {
    marginTop: 8,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    gap: 8,
    ...shadows.card,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 18,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    gap: 16,
    ...shadows.card,
  },
  dogImage: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.border,
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.accent,
  },
  detailsContainer: {
    flex: 1,
    gap: 2,
  },
  dogName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dogDetail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  parkBadge: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '500',
    color: colors.accent,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 20,
  },
  recentSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 14,
  },
  recentHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    opacity: 0.8,
  },
  recentCard: {
    opacity: 0.5,
  },
  recentImage: {
    opacity: 0.8,
  },
  recentText: {
    color: colors.textSecondary,
  },
});

export default ParkScreen;

