import { addDoc, collection, doc, getDoc } from 'firebase/firestore';

import { db } from '../config/firebase';
import { eventsCollection } from './firestoreCollections';
import { EventDocument } from '../types/firestore';

export const createEvent = async (
  payload: Omit<EventDocument, 'eventId' | 'createdAt'>,
): Promise<string> => {
  const eventsRef = eventsCollection;
  const eventData = {
    ...payload,
    createdAt: Date.now(),
  } satisfies Omit<EventDocument, 'eventId'>;

  const docRef = await addDoc(eventsRef, eventData);

  return docRef.id;
};

export const getEvent = async (eventId: string): Promise<EventDocument | null> => {
  const docRef = doc(collection(db, 'events'), eventId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as EventDocument;
};
