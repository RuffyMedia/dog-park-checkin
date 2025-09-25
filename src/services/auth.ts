import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  UserCredential,
} from 'firebase/auth';

import { auth } from '../config/firebase';
import { upsertUserDocument } from './userService';

type SignUpWithEmailArgs = {
  email: string;
  password: string;
  name?: string;
};

type SignInWithEmailArgs = {
  email: string;
  password: string;
};

export const signUpWithEmail = async ({
  email,
  password,
  name,
}: SignUpWithEmailArgs): Promise<UserCredential> => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  if (name) {
    await updateProfile(credential.user, {
      displayName: name,
    });
  }

  const displayName = name ?? credential.user.displayName ?? '';

  await upsertUserDocument({
    uid: credential.user.uid,
    email,
    name: displayName,
    dogProfileId: null,
  });

  return credential;
};

export const signInWithEmail = async ({
  email,
  password,
}: SignInWithEmailArgs): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signOutUser = async (): Promise<void> => {
  await signOut(auth);
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

