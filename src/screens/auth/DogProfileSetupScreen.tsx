import { CommonActions, NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { createDogProfile, linkDogProfileToUser, updateDogProfile } from '../../services/userService';
import { RootStackParamList } from '../../navigation/types';

const DogProfileSetupScreen = () => {
  const { currentUser, refreshProfile, userProfile, profileLoading, dogProfile } = useAuth();
  const { params } = useRoute<RouteProp<RootStackParamList, 'DogProfile'>>();
  const mode = params?.mode ?? (dogProfile ? 'edit' : 'create');
  const returnToTab = params?.returnToTab ?? 'Profile';
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [temperament, setTemperament] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dogProfile) {
      return;
    }

    setName(dogProfile.name ?? '');
    setBreed(dogProfile.breed ?? '');
    setTemperament(dogProfile.temperament ?? '');
    setPhotoUrl(dogProfile.photoUrl ?? '');
  }, [dogProfile?.breed, dogProfile?.name, dogProfile?.photoUrl, dogProfile?.temperament]);

  const handleSaveProfile = async () => {
    if (!currentUser?.uid) {
      Alert.alert('Unavailable', 'Please sign in again to continue.');
      return;
    }

    if (!name) {
      Alert.alert('Missing details', 'Please enter your dogs name.');
      return;
    }

    try {
      setSaving(true);

      if (userProfile?.dogProfileId) {
        await updateDogProfile(userProfile.dogProfileId, {
          name,
          breed,
          temperament,
          photoUrl,
        });
      } else {
        const dogProfileId = await createDogProfile({
          name,
          breed,
          temperament,
          photoUrl,
          ownerUid: currentUser.uid,
        });

        await linkDogProfileToUser(currentUser.uid, dogProfileId);
      }

      await refreshProfile();

      if (mode === 'edit') {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: 'Main',
                params: { screen: 'Profile' },
              },
            ],
          }),
        );
        return;
      }
    } catch (error) {
      Alert.alert('Profile error', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
      return;
    }

    if (profileLoading || saving) {
      return;
    }

    if (mode === 'create' && userProfile?.dogProfileId && dogProfile?.name?.trim()) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  }, [currentUser, dogProfile?.name, mode, navigation, profileLoading, saving, userProfile?.dogProfileId]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>{mode === 'edit' ? 'Update Your Dog Profile' : 'Create Your Dog Profile'}</Text>
            <Text style={styles.subtitle}>
              We use this to personalize your dog park experience. You can update details later.
            </Text>
            <TextInput
              placeholder="Dog name"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              style={styles.input}
              accessibilityLabel="Dog name"
            />
            <TextInput
              placeholder="Breed (optional)"
              placeholderTextColor="#9ca3af"
              value={breed}
              onChangeText={setBreed}
              style={styles.input}
              accessibilityLabel="Dog breed"
            />
            <TextInput
              placeholder="Temperament (optional)"
              placeholderTextColor="#9ca3af"
              value={temperament}
              onChangeText={setTemperament}
              style={styles.input}
              accessibilityLabel="Dog temperament"
            />
            <TextInput
              placeholder="Photo URL (optional)"
              placeholderTextColor="#9ca3af"
              value={photoUrl}
              onChangeText={setPhotoUrl}
              style={styles.input}
              accessibilityLabel="Dog photo URL"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={saving}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save and Continue'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default DogProfileSetupScreen;

