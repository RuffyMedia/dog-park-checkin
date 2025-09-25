export type NotificationPreferences = {
  notifyOnFriendCheckin: boolean;
  notifyOnFriendEvent: boolean;
};

export type NotificationSettings = {
  enabled: boolean;
  preferences: NotificationPreferences;
};

export type UserDocument = {
  uid: string;
  name: string;
  email: string;
  dogProfileId: string | null;
  notificationSettings?: NotificationSettings;
};

export type DogDocument = {
  dogProfileId: string;
  name: string;
  breed: string;
  temperament: string;
  photoUrl: string;
  ownerUid: string;
  createdAt?: number;
};

export type ParkDocument = {
  parkId: string;
  name: string;
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
};

export type CheckInDocument = {
  checkinId: string;
  parkId: string;
  parkName?: string;
  dogProfileId: string;
  ownerUid: string;
  timestamp: number;
  active: boolean;
  checkedOutAt?: number;
};

export type NotificationTokenDocument = {
  token: string;
  platform: 'ios' | 'android' | 'web';
  createdAt: number;
  updatedAt: number;
  enabled: boolean;
};

export type FriendDocument = {
  friendUid: string;
  email: string;
  name: string;
  createdAt: number;
};

export type EventDocument = {
  eventId: string;
  creatorUid: string;
  parkId: string;
  parkName: string;
  title: string;
  scheduledAt: number;
  createdAt: number;
};

