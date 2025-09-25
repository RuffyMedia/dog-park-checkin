import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View } from 'react-native';

import { auth } from '../config/firebase';
import { signInWithEmail, signOutUser, signUpWithEmail } from '../services/auth';
import { getDogProfile, getUserDocument, upsertUserDocument } from '../services/userService';
import { DogDocument, NotificationSettings, UserDocument } from '../types/firestore';

type AuthContextValue = {
  currentUser: User | null;
  initializing: boolean;
  userProfile: UserDocument | null;
  dogProfile: DogDocument | null;
  profileLoading: boolean;
  notificationSettings: NotificationSettings | null;
  handleSignUp: typeof signUpWithEmail;
  handleSignIn: typeof signInWithEmail;
  handleSignOut: typeof signOutUser;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [userProfile, setUserProfile] = useState<UserDocument | null>(null);
  const [dogProfile, setDogProfile] = useState<DogDocument | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);

  const loadProfile = async (user: User) => {
    setProfileLoading(true);
    const profile = await getUserDocument(user.uid);

    if (!profile) {
      const defaultProfile: UserDocument = {
        uid: user.uid,
        email: user.email ?? '',
        name: user.displayName ?? '',
        dogProfileId: null,
        notificationSettings: {
          enabled: true,
          preferences: {
            notifyOnFriendCheckin: true,
            notifyOnFriendEvent: true,
          },
        },
      };
      await upsertUserDocument(defaultProfile);
      setUserProfile(defaultProfile);
      setDogProfile(null);
      setNotificationSettings(defaultProfile.notificationSettings ?? null);
      setProfileLoading(false);
      return;
    }

    setUserProfile(profile);
    setNotificationSettings(profile.notificationSettings ?? null);

    if (profile.dogProfileId) {
      const dog = await getDogProfile(profile.dogProfileId);
      setDogProfile(dog ?? null);
    } else {
      setDogProfile(null);
    }

    setProfileLoading(false);
  };

  const refreshProfile = async () => {
    if (!currentUser) {
      return;
    }

    await loadProfile(currentUser);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async nextUser => {
      if (!nextUser) {
        setCurrentUser(null);
        setUserProfile(null);
        setDogProfile(null);
        setProfileLoading(false);
        setInitializing(false);
        return;
      }

      setCurrentUser(nextUser);
      await loadProfile(nextUser);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    currentUser,
    initializing,
    userProfile,
    dogProfile,
    profileLoading,
    notificationSettings,
    handleSignUp: signUpWithEmail,
    handleSignIn: signInWithEmail,
    handleSignOut: signOutUser,
    refreshProfile,
  }), [currentUser, initializing, userProfile, dogProfile, profileLoading, notificationSettings]);

  if (initializing) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

const loadingStyles = {
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
};

