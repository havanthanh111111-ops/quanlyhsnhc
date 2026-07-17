import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Build config from environment variables if present (useful for Vercel/production deployment)
const metaEnv = (import.meta as any).env || {};

const envConfig = {
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID,
  appId: metaEnv.VITE_FIREBASE_APP_ID,
  apiKey: metaEnv.VITE_FIREBASE_API_KEY,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN,
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

// Use environment variables if at least apiKey and projectId are specified
const isEnvConfigured = !!(envConfig.apiKey && envConfig.projectId);
const activeConfig = isEnvConfigured ? envConfig : firebaseConfig;

// Initialize Firebase
const app = initializeApp(activeConfig);

// Determine the firestore database ID
let databaseId = activeConfig.firestoreDatabaseId;

// If we are not in the sandbox project ("fleet-realm-5k91c") and the database ID starts with "ai-studio-",
// it means this is an exported/deployed version running in the user's own Firebase project.
// The user's project won't have this sandbox database instance, so we fall back to the "(default)" database.
if (activeConfig.projectId !== 'fleet-realm-5k91c' && databaseId && databaseId.startsWith('ai-studio-')) {
  console.log(`Fallback detected: running on custom project '${activeConfig.projectId}' but config specifies sandbox database '${databaseId}'. Falling back to default database.`);
  databaseId = undefined;
}

// Initialize Firestore with the specific databaseId from config or fallback to default
export const db = getFirestore(app, databaseId || undefined);

export { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  query,
  where 
};
