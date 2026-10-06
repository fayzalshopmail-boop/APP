import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDo3aboTNS8cPOMkES-njM93C4uKS7h0f4",
  authDomain: "shop-management-19fcd.firebaseapp.com",
  projectId: "shop-management-19fcd",
  storageBucket: "shop-management-19fcd.firebasestorage.app",
  messagingSenderId: "156009696120",
  appId: "1:156009696120:web:054f408aaa26c6f81cd68d",
};

// Only initialize if we have at least the API key
let app;
if (typeof window !== 'undefined' && firebaseConfig.apiKey) {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} else if (firebaseConfig.apiKey) {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
}

export const auth = app ? getAuth(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;
export const db = app ? getFirestore(app) : null;
