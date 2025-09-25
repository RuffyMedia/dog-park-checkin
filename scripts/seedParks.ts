import 'dotenv/config';
import fs from 'node:fs';
import process from 'node:process';

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

import { MONTEREY_COUNTY_DOG_PARKS } from '../src/constants/parks';

const log = console.log;
const error = console.error;

const resolveServiceAccountPath = () => {
  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!explicitPath) {
    throw new Error('Set FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS to your service account JSON file.');
  }

  if (!fs.existsSync(explicitPath)) {
    throw new Error(`Service account file not found at ${explicitPath}`);
  }

  return explicitPath;
};

const loadCredentials = () => {
  const credentialPath = resolveServiceAccountPath();
  const fileContents = fs.readFileSync(credentialPath, 'utf-8');

  try {
    return JSON.parse(fileContents);
  } catch (parseError) {
    throw new Error(`Failed to parse service account JSON: ${(parseError as Error).message}`);
  }
};

const seedParks = async () => {
  const credentials = loadCredentials();

  if (!getApps().length) {
    initializeApp({
      credential: cert(credentials),
    });
  }

  const firestore = getFirestore();
  const batch = firestore.batch();
  MONTEREY_COUNTY_DOG_PARKS.forEach(park => {
    const documentReference = firestore.collection('parks').doc(park.parkId);

    batch.set(documentReference, {
      name: park.name,
      coordinates: park.coordinates,
      image: park.image,
      createdAt: Timestamp.now(),
    });
  });

  await batch.commit();
};

const run = async () => {
  try {
    log('Seeding Monterey County dog parks...');
    await seedParks();
    log('Successfully seeded dog parks.');
    process.exit(0);
  } catch (seedError) {
    error('Failed to seed dog parks:', seedError);
    process.exit(1);
  }
};

run();
