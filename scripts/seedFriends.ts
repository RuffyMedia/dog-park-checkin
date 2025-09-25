import { readFileSync } from 'fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ensureAdmin = () => {
  if (getApps().length) {
    return getFirestore();
  }

  const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!credentialPath) {
    throw new Error('Set FIREBASE_SERVICE_ACCOUNT_PATH before running this script.');
  }

  const serviceAccount = JSON.parse(readFileSync(credentialPath, 'utf-8'));

  initializeApp({
    credential: cert(serviceAccount),
  });

  return getFirestore();
};

const db = ensureAdmin();

const addFriendship = async (
  sourceUid: string,
  friendUid: string,
  friendName: string,
  friendEmail: string,
) => {
  const payload = {
    friendUid,
    name: friendName,
    email: friendEmail,
    createdAt: Date.now(),
  };

  await db
    .collection('users')
    .doc(sourceUid)
    .collection('friends')
    .doc(friendUid)
    .set(payload, { merge: true });
};

const run = async () => {
  const pairs: Array<[
    string,
    string,
    string,
    string,
  ]> = [
    ['uidA', 'uidB', 'Bobby Barker', 'bobby@example.com'],
    ['uidB', 'uidA', 'Alice Anderson', 'alice@example.com'],
  ];

  for (const pair of pairs) {
    await addFriendship(...pair);
  }

  console.log('Friendships seeded.');
  process.exit(0);
};

run().catch(error => {
  console.error('Friend seeding failed', error);
  process.exit(1);
});
