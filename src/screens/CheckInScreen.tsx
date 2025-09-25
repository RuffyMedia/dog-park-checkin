import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadows } from '../constants/theme';
import { addDoc, doc, getDocs, limit, query, updateDoc, where } from 'firebase/firestore';

import { useAuth } from '../context/AuthContext';
import { MONTEREY_COUNTY_DOG_PARKS, Park, ParkCoordinates } from '../constants/parks';
import { checkinsCollection } from '../services/firestoreCollections';


const PARK_RADIUS_METERS = 200;

const toRadians = (degrees: number) => {
  return (degrees * Math.PI) / 180;
};

const calculateDistanceInMeters = (start: ParkCoordinates, end: ParkCoordinates) => {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(end.latitude - start.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);

  const startLatitude = toRadians(start.latitude);
  const endLatitude = toRadians(end.latitude);

  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
};

const CheckInScreen = () => {
  const { currentUser, dogProfile, profileLoading } = useAuth();
  const [activeCheckInId, setActiveCheckInId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const hasDogProfile = Boolean(dogProfile?.dogProfileId);
  const canInteract = hasDogProfile && !profileLoading && !initializing;

  const findNearestPark = useCallback((position: ParkCoordinates) => {
    return MONTEREY_COUNTY_DOG_PARKS.reduce<null | { park: Park; distance: number }>((nearest, park) => {
      const distance = calculateDistanceInMeters(position, park.coordinates);

      if (!nearest || distance < nearest.distance) {
        return { park, distance };
      }

      return nearest;
    }, null);
  }, []);

  useEffect(() => {
    const loadActiveCheckIn = async () => {
      if (!currentUser?.uid || !dogProfile?.dogProfileId) {
        setActiveCheckInId(null);
        setInitializing(false);
        return;
      }

      try {
        const activeCheckInQuery = query(
          checkinsCollection,
          where('ownerUid', '==', currentUser.uid),
          where('dogProfileId', '==', dogProfile.dogProfileId),
          where('active', '==', true),
          limit(1),
        );

        const snapshot = await getDocs(activeCheckInQuery);

        if (snapshot.empty) {
          setActiveCheckInId(null);
          setInitializing(false);
          return;
        }

        setActiveCheckInId(snapshot.docs[0].id);
      } catch (error) {
        Alert.alert('Check-in status unavailable', error instanceof Error ? error.message : String(error));
      } finally {
        setInitializing(false);
      }
    };

    loadActiveCheckIn();
  }, [currentUser?.uid, dogProfile?.dogProfileId]);

  const verifyProximityToPark = useCallback(async (): Promise<Park | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Location required', 'Enable location access to check in.');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const userPosition: ParkCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      const nearestPark = findNearestPark(userPosition);

      if (!nearestPark || nearestPark.distance > PARK_RADIUS_METERS) {
        Alert.alert('Out of range', 'You must be at the park to check in.');
        return null;
      }

      return nearestPark.park;
    } catch (error) {
      Alert.alert('Location unavailable', error instanceof Error ? error.message : String(error));
      return null;
    }
  }, [findNearestPark]);

  const handleCheckIn = async () => {
    if (submitting) {
      return;
    }

    if (!currentUser?.uid || !dogProfile?.dogProfileId) {
      Alert.alert('Unavailable', 'Complete your dog profile before checking in.');
      return;
    }

    try {
      setSubmitting(true);

      const nearbyPark = await verifyProximityToPark();

      if (!nearbyPark) {
        return;
      }

      const checkInPayload = {
        parkId: nearbyPark.parkId,
        parkName: nearbyPark.name,
        dogProfileId: dogProfile.dogProfileId,
        ownerUid: currentUser.uid,
        timestamp: Date.now(),
        active: true,
        checkedOutAt: null,
      };

      const docRef = await addDoc(checkinsCollection, checkInPayload);

      await updateDoc(doc(checkinsCollection, docRef.id), {
        checkinId: docRef.id,
      });

      setActiveCheckInId(docRef.id);
    } catch (error) {
      Alert.alert('Check-in failed', error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (submitting || !activeCheckInId) {
      return;
    }

    try {
      setSubmitting(true);

      await updateDoc(doc(checkinsCollection, activeCheckInId), {
        active: false,
        checkedOutAt: Date.now(),
      });

      setActiveCheckInId(null);
    } catch (error) {
      Alert.alert('Check-out failed', error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  const buttonLabel = activeCheckInId ? 'Check Out' : 'Check In';
  const handlePress = activeCheckInId ? handleCheckOut : handleCheckIn;
  const buttonDisabled = submitting || !canInteract;

  const statusText = useMemo(() => {
    if (!hasDogProfile) {
      return 'Add your dog profile to enable check-ins.';
    }

    if (initializing || profileLoading) {
      return 'Loading your check-in status...';
    }

    if (activeCheckInId) {
      return 'Your pup is currently checked in.';
    }

    return 'Your pup is currently checked out.';
  }, [activeCheckInId, hasDogProfile, initializing, profileLoading]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.heading}>Check-In</Text>
          <Text style={styles.description}>
            Quickly check your pup into the park and let friends know when you arrive.
          </Text>

          <View style={styles.statusContainer}>
            {initializing ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            <Text style={styles.statusText}>{statusText}</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, buttonDisabled ? styles.buttonDisabled : null]}
            onPress={handlePress}
            disabled={buttonDisabled}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{submitting ? 'Please wait…' : buttonLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    ...shadows.card,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 24,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});

export default CheckInScreen;

