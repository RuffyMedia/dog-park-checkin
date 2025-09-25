type FirebaseEnv = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const firebaseEnvMap: Record<keyof FirebaseEnv, string> = {
  apiKey: 'API_KEY',
  authDomain: 'AUTH_DOMAIN',
  projectId: 'PROJECT_ID',
  storageBucket: 'STORAGE_BUCKET',
  messagingSenderId: 'MESSAGING_SENDER_ID',
  appId: 'APP_ID',
};

const prefix = 'EXPO_PUBLIC_FIREBASE_';

const readFirebaseEnv = (): FirebaseEnv => {
  const values = (Object.keys(firebaseEnvMap) as Array<keyof FirebaseEnv>).reduce<
    Partial<FirebaseEnv>
  >((accumulator, key) => {
    const envKey = `${prefix}${firebaseEnvMap[key]}`;
    const envValue = process.env[envKey];

    if (!envValue) {
      throw new Error(`Missing required Firebase environment variable: ${envKey}`);
    }

    return { ...accumulator, [key]: envValue };
  }, {});

  return values as FirebaseEnv;
};

export const firebaseEnv = readFirebaseEnv();

export const appEnv = {
  notificationEndpoint: process.env.EXPO_PUBLIC_NOTIFICATION_ENDPOINT ?? '',
};

