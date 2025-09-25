export type AppEnv = {
  firebase: FirebaseEnv;
  notificationEndpoint: string;
};

export const appEnv: AppEnv = {
  firebase: firebaseEnv,
  notificationEndpoint: process.env.EXPO_PUBLIC_NOTIFICATION_ENDPOINT ?? '',
};
