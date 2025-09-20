import { initializeApp, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDy0FkY9inKLpNBRghYKe8CAq5Sb4niwkM",
  authDomain: "nabhacare-48e2c.firebaseapp.com",
  projectId: "nabhacare-48e2c",
  storageBucket: "nabhacare-48e2c.firebasestorage.app",
  messagingSenderId: "665549963978",
  appId: "1:665549963978:web:ef99ab93ffa243d684ea33"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Ensure auth state persists across restarts/offline
try {
  setPersistence(auth, browserLocalPersistence);
} catch (_) {}

// Enable Firestore offline persistence (IndexedDB)
try {
  enableIndexedDbPersistence(db).catch(() => {});
} catch (_) {}

// Admin configuration: add admin emails here to auto-assign admin role on signup
export const ADMIN_EMAILS = [
  'admin@nabha.gov.in',
  'admin@nabhacare.com'
];

// Optional secondary Firebase app for NabhaPharmacies (read-only usage for pharmacies collection)
// Uses minimal config sufficient for Firestore client
const pharmacyFirebaseConfig = {
  apiKey: "AIzaSyDvIX7xzB0_mhTydOXf7SvPf4UkARW2ztc",
  projectId: "nabhapharmacies"
};

let pharmacyApp;
try {
  pharmacyApp = initializeApp(pharmacyFirebaseConfig, 'pharmacy-app');
} catch (e) {
  try {
    pharmacyApp = getApp('pharmacy-app');
  } catch (_) {
    pharmacyApp = null;
  }
}

export const pharmacyDb = pharmacyApp ? getFirestore(pharmacyApp) : null;

export default app;
