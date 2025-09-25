import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';

import { db } from '../config/firebase';
import { userFriendsCollection, usersCollection } from './firestoreCollections';
import { FriendDocument, UserDocument } from '../types/firestore';

export const getFriends = async (uid: string): Promise<FriendDocument[]> => {
  const snapshot = await getDocs(userFriendsCollection(uid));
  return snapshot.docs.map(friendDoc => friendDoc.data());
};

export const addFriendByEmail = async (
  uid: string,
  email: string,
): Promise<FriendDocument | null> => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail.length) {
    return null;
  }

  const userQuery = query(usersCollection, where('email', '==', normalizedEmail));
  const usersSnapshot = await getDocs(userQuery);

  if (usersSnapshot.empty) {
    return null;
  }

  const targetDoc = usersSnapshot.docs[0];
  const targetData = targetDoc.data() as UserDocument;

  if (targetData.uid === uid) {
    return null;
  }

  const friendRecord: FriendDocument = {
    friendUid: targetData.uid,
    email: targetData.email,
    name: targetData.name,
    createdAt: Date.now(),
  };

  await setDoc(doc(userFriendsCollection(uid), friendRecord.friendUid), friendRecord, {
    merge: true,
  });

  await setDoc(doc(userFriendsCollection(friendRecord.friendUid), uid), {
    friendUid: uid,
    email: '',
    name: '',
    createdAt: Date.now(),
  } satisfies FriendDocument, { merge: true });

  return friendRecord;
};
