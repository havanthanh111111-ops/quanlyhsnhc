/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request the required Google Sheets & Drive scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory.
let cachedAccessToken: string | null = null;

// Listeners for auth token changes
const tokenChangeListeners: ((token: string | null) => void)[] = [];

export const onTokenChange = (listener: (token: string | null) => void) => {
  tokenChangeListeners.push(listener);
  // Call immediately with current cached value
  listener(cachedAccessToken);
  return () => {
    const idx = tokenChangeListeners.indexOf(listener);
    if (idx !== -1) tokenChangeListeners.splice(idx, 1);
  };
};

const notifyTokenChange = (token: string | null) => {
  tokenChangeListeners.forEach(listener => listener(token));
};

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        notifyTokenChange(cachedAccessToken);
      } else if (!isSigningIn) {
        // Token was cleared or expired, require re-authentication to get a fresh token
        cachedAccessToken = null;
        notifyTokenChange(null);
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      notifyTokenChange(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    notifyTokenChange(cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  notifyTokenChange(null);
};
