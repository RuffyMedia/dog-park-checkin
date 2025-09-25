import {
  collection,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';

import { db } from '../config/firebase';
import {
  CheckInDocument,
  DogDocument,
  EventDocument,
  FriendDocument,
  NotificationTokenDocument,
  ParkDocument,
  UserDocument,
} from '../types/firestore';

const createConverter = <T extends { [key: string]: unknown }>() => ({
  toFirestore: (data: T) => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions) => {
    return snapshot.data(options) as T;
  },
});

const userConverter: FirestoreDataConverter<UserDocument> = createConverter<UserDocument>();
const dogConverter: FirestoreDataConverter<DogDocument> = createConverter<DogDocument>();
const parkConverter: FirestoreDataConverter<ParkDocument> = createConverter<ParkDocument>();
const checkInConverter: FirestoreDataConverter<CheckInDocument> =
  createConverter<CheckInDocument>();
const notificationTokenConverter: FirestoreDataConverter<NotificationTokenDocument> =
  createConverter<NotificationTokenDocument>();
const friendConverter: FirestoreDataConverter<FriendDocument> =
  createConverter<FriendDocument>();
const eventConverter: FirestoreDataConverter<EventDocument> =
  createConverter<EventDocument>();

export const usersCollection = collection(db, 'users').withConverter(userConverter);
export const dogsCollection = collection(db, 'dogs').withConverter(dogConverter);
export const parksCollection = collection(db, 'parks').withConverter(parkConverter);
export const checkinsCollection = collection(db, 'checkins').withConverter(checkInConverter);
export const userNotificationTokensCollection = (uid: string) =>
  collection(db, 'users', uid, 'notificationTokens').withConverter(notificationTokenConverter);
export const userFriendsCollection = (uid: string) =>
  collection(db, 'users', uid, 'friends').withConverter(friendConverter);
export const eventsCollection = collection(db, 'events').withConverter(eventConverter);

