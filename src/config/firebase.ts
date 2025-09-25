import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth } from 'firebase/auth';
import { Platform } from 'react-native';

import { firebaseEnv } from './env';

const firebaseConfig = {
  apiKey: firebaseEnv.apiKey,
  authDomain: firebaseEnv.authDomain,
  projectId: firebaseEnv.projectId,
  storageBucket: firebaseEnv.storageBucket,
  messagingSenderId: firebaseEnv.messagingSenderId,
  appId: firebaseEnv.appId,
};

const initializeFirebaseApp = (): FirebaseApp => {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(firebaseConfig);
};

const app = initializeFirebaseApp();

let auth;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  // Use getReactNativePersistence for persistence in React Native environments
  // Note: getReactNativePersistence is only available in React Native Firebase SDKs.
  // To avoid import errors, require it dynamically inside the block.
  try {
    // Dynamically require getReactNativePersistence to avoid top-level import errors
    const { getReactNativePersistence } = require('firebase/auth');
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (_error) {
    auth = getAuth(app);
  }
}

const db = getFirestore(app);

export { app, auth, db };

