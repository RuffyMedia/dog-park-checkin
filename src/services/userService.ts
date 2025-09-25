import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import { db } from '../config/firebase';
import {
  dogsCollection,
  userFriendsCollection,
  userNotificationTokensCollection,
  usersCollection,
} from './firestoreCollections';
import {
  DogDocument,
  FriendDocument,
  NotificationSettings,
  NotificationTokenDocument,
  UserDocument,
} from '../types/firestore';

export const getUserDocument = async (uid: string): Promise<UserDocument | null> => {
  const userDoc = await getDoc(doc(usersCollection, uid));

  if (!userDoc.exists()) {
    return null;
  }

  return userDoc.data();
};

export const upsertUserDocument = async (user: UserDocument): Promise<void> => {
  await setDoc(doc(usersCollection, user.uid), user, { merge: true });
};

export const updateNotificationSettings = async (
  uid: string,
  settings: NotificationSettings,
): Promise<void> => {
  await updateDoc(doc(usersCollection, uid), {
    notificationSettings: settings,
  });
};

export const saveNotificationToken = async (
  uid: string,
  token: NotificationTokenDocument,
): Promise<void> => {
  await setDoc(doc(userNotificationTokensCollection(uid), token.token), token, { merge: true });
};

export const addFriend = async (uid: string, friend: FriendDocument): Promise<void> => {
  await setDoc(doc(userFriendsCollection(uid), friend.friendUid), friend, { merge: true });
};

export const createDogProfile = async (dog: Omit<DogDocument, 'dogProfileId'>): Promise<string> => {
  const dogDocRef = doc(dogsCollection);
  const dogProfileId = dogDocRef.id;

  await setDoc(dogDocRef, {
    ...dog,
    dogProfileId,
  });

  return dogProfileId;
};

export const getDogProfile = async (dogProfileId: string): Promise<DogDocument | null> => {
  const dogDoc = await getDoc(doc(dogsCollection, dogProfileId));

  if (!dogDoc.exists()) {
    return null;
  }

  return dogDoc.data();
};

export const linkDogProfileToUser = async (
  uid: string,
  dogProfileId: string,
): Promise<void> => {
  await setDoc(
    doc(usersCollection, uid),
    {
      dogProfileId,
    },
    { merge: true },
  );
};

export const updateDogProfile = async (
  dogProfileId: string,
  dog: Partial<Omit<DogDocument, 'dogProfileId' | 'ownerUid'>>,
): Promise<void> => {
  await updateDoc(doc(dogsCollection, dogProfileId), {
    ...dog,
  });
};

