# DogParkCheckIn

## Firebase Configuration

Create a `.env` or `app.config.js` entry that exposes the following variables through Expo (e.g. `EXPO_PUBLIC_`), then restart the Metro bundler:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

Ensure your Firebase project has Email/Password authentication enabled and Firestore set up with collections:

- `users`
- `dogs`
- `parks`
- `checkins`

## Authentication Flow

- Launching the app presents the email/password login with the option to sign up.
- Successful sign-up stores the user in Firestore with an empty `dogProfileId`.
- After sign-in, if the user has no dog profile they are routed to the Dog Profile setup screen.
- Completing the dog profile inserts a document into the `dogs` collection and links it to the user.
- Once a dog profile exists, the main tab navigator (Park, Check-In, Profile) becomes available.

## Park Data Seeding

1. Generate a Firebase service account JSON and save it locally.
2. Export `FIREBASE_SERVICE_ACCOUNT_PATH=/absolute/path/to/serviceAccount.json` (or `GOOGLE_APPLICATION_CREDENTIALS`).
3. Run `npm run seed:parks` to insert Monterey County dog parks into Firestore.
4. Rerun the script whenever the park list changes.

