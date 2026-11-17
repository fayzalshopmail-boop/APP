import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

let db: any = null;
let msg: any = null;
let authInstance: any = null;

try {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'shop-3bf5e';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@shop-3bf5e.iam.gserviceaccount.com';
  let rawKey = process.env.FIREBASE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC0aoD1xcZ+MgNB\nW6k68knA87yDmboGMr9ZaAakR2u6wIGA5ANFGidP+t9q3ZlBazwjsHXaRxBDmW+Q\n+qHcRNg/Qm30EyQ+pFv7zH2mGfVEmepTou8qYmIrI9a/xk2n8amDLXCrxKRkKppP\nBzMCXostAfxGYvYPn9S0WmZRKArI2Jt7+rIINpskEqPXRrY1BwJG+22JlBtA2IQd\nqE4xZ3WgPXplpTyhgyVtBUu1+1CDkpMO2idLJaXrrlinEwLsho/Je2qZiKQ4RZzK\nUc+7U0dCd5j/QuVcWTPqATNQahF/uT1T43pR8g8z6WxCnlZBU9Hmp8lXLO/I4OIe\n+HygMDkvAgMBAAECggEACceWKvxoCJIsdAAEeeIFVnS/3MBaAZkBn1aQuZn3gH2L\n55E0jivfQqoeLzxI4O9vqJ2ZndXpT0jDb+/uEzMWJ8Oxkx/wgIbHR6xriTPyBCB1\nv8fewATqPl1oeCfHMNncLvSpHV6A7L8Uc0E4JiI62Bs58hTOMsWesZIO5spNX1qr\nI/WeJnnpaaUeoXdL+ezXe7IknjIi7Rb8qLCrqIG0YVlXOtmBhngi3KfnwTXSrPdn\nms478vLc3R34ZNwRZ7OVbt2A/rGX86pVIpI0AJbWLvMZ6Xn6Xh4iidAK7X6+i629\n5lBZ5rJO32eE34pS/322IWtTQsuKtrhnnq2Vj9gJYQKBgQDmYWyFfRtz+2ZUraRt\nTZ9q/ICTg4NVmDN7cEbePkyT3GphH9ZkgIq7oNJnL29rQ6ajvkjw1Uj1OdM5h/PV\nizPka1BHI/dIjQVh4Qgc8gi7bEmzdRAu2W3PVawSIbakpliIQoHjk/JUOY8x/Qlt\nolvC8I//QnI3Y++caX1yj+0XoQKBgQDIeqrYw74FW5UfF1XeBSSwJkuzVopU8Ac8\ng1hCpVwtmzOn8QvRUhre/D6uZhO0Vbbtmym2pThnDIWVUL053Q3XL2elAynCMcUg\nb3qWTP74O7Gr/idWoEjYkR60nk/6D14SRqcmLZJfFWtk9tb8mG6p4pE8nV99P6RS\nWY0Jma1ezwKBgQCIaQVN4S8hNKl52Ds08TJEsfAb6FIam31YSLndnDvRjUB789MJ\nPUdoI6iRqneppqwD5obf+xoxAaU9Om+5cKwwQw6MoRIppj6anxkjsnhTKaJWHSmQ\n4/NuQccaEVZJFan0PJUWQKLLFi3gpngvr2PwAGry9NAWVhkpnxjFfc0gIQKBgE6X\nqDpqIig/iuoxX7w2D/fuS2b22iwKHQwgAY2+/a/zVADWgmeA5H/eK0R7R+Y+ZAQp\n++RaSQ483nF2wXfZrP9a2iraXph+omTgzxH1BU+TN0fRzuIq2+PqoDr2hSvmsl4/\nzG8vFl6oKv3dttI3f8qhw4Ybu7+CH40ZBi1pTYoJAoGAEQ0qCZ6yl0IiO/h6RFWe\nZ9NGGJDpmary9470BKNynm1MFAoajWf0lh+u5YkUFZa1awyvA8kQph7AJtjR/QHP\nK/Dpk0EaGFxjIrYsOyOCsg/jVMhJc557OMxr0oWOCuGvAoVGrvepT+/fTvG5U4y6\n7MtdfDIVXDdHJGAyZPfc5g0=\n-----END PRIVATE KEY-----';

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


