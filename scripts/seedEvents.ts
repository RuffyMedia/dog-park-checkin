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

const run = async () => {
  const sampleEvents = [
    {
      creatorUid: 'uidB',
      parkId: 'el-estero-dog-park',
      parkName: 'El Estero Dog Park',
      title: 'Morning Fetch Session',
      scheduledAt: Date.now() + 2 * 60 * 60 * 1000,
    },
    {
      creatorUid: 'uidA',
      parkId: 'laguna-grande-dog-park',
      parkName: 'Laguna Grande Dog Park',
      title: 'Sunset Stroll',
      scheduledAt: Date.now() + 6 * 60 * 60 * 1000,
    },
  ];

  for (const eventPayload of sampleEvents) {
    await db.collection('events').add({
      ...eventPayload,
      createdAt: Date.now(),
    });
  }

  console.log('Events seeded.');
  process.exit(0);
};

run().catch(error => {
  console.error('Event seeding failed', error);
  process.exit(1);
});
