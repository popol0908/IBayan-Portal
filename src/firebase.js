
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";



export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};


const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Returns a secondary Firebase Auth instance used exclusively for creating
 * new admin accounts without logging out the current admin session.
 * Reuses an existing secondary app if one was already initialized.
 */
export const getSecondaryAuth = () => {
  const SECONDARY_APP_NAME = "secondary-admin-creation";
  const existing = getApps().find((a) => a.name === SECONDARY_APP_NAME);
  const secondaryApp = existing || initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  return getAuth(secondaryApp);
};

/**
 * Returns a Firestore instance bound to the secondary app so the newly
 * created user can write their own profile (passes the isOwner rule).
 */
export const getSecondaryDb = (secondaryAuth) => {
  return getFirestore(secondaryAuth.app);
};


const analytics = getAnalytics(app);

export default app;
