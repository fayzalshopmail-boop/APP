import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

let db: any = null;
let msg: any = null;
let authInstance: any = null;

try {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let rawKey = process.env.FIREBASE_PRIVATE_KEY || '';

  if (rawKey.startsWith('"') && rawKey.endsWith('"')) {
    rawKey = rawKey.slice(1, -1);
  }
  const privateKey = rawKey.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log("Firebase Admin Initialized successfully.");
    }
    if (getApps().length > 0) {
      db = getFirestore();
      msg = getMessaging();
      authInstance = getAuth();
    }
  } else {
    console.warn("Firebase Admin credentials missing or incomplete in environment. Admin services fallback active.");
  }
} catch (error) {
  console.error("Firebase admin initialization error:", error);
}

export const adminDb = db;
export const adminMessaging = msg;
export const adminAuth = authInstance;


