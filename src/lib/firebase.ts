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

// Initialize Firestore with the specific databaseId from config
export const db = getFirestore(app, activeConfig.firestoreDatabaseId || undefined);

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
