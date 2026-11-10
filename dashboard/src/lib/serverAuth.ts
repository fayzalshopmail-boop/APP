export interface VerifiedUser {
  email: string;
  uid: string;
  role: 'Owner' | 'Manager' | 'Technician';
  name?: string;
  isActive: boolean;
}

export function parseFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.integerValue !== undefined) return Number(val.integerValue);
  if (val.doubleValue !== undefined) return Number(val.doubleValue);
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.nullValue !== undefined) return null;
  if (val.mapValue !== undefined) {
    return parseFirestoreFields(val.mapValue.fields);
  }
  if (val.arrayValue !== undefined) {
    return (val.arrayValue.values || []).map(parseFirestoreValue);
  }
  return Object.values(val)[0];
}

export function parseFirestoreFields(fields: any): Record<string, any> {
  const result: Record<string, any> = {};
  if (!fields) return result;
  for (const [key, val] of Object.entries(fields)) {
    result[key] = parseFirestoreValue(val);
  }
  return result;
}

export async function verifyUserToken(bearerToken: string): Promise<{ success: boolean; user?: VerifiedUser; error?: string }> {
  if (!bearerToken) {
    return { success: false, error: 'অথেনটিকেশন টোকেন পাওয়া যায়নি। অনুগ্রহ করে পেজ রিফ্রেশ করে আবার চেষ্টা করুন।' };
  }

  let verifiedEmail = '';
  let verifiedUid = '';

  // 1. Primary: Try Firebase Admin SDK
  try {
    const { adminAuth } = await import('@/lib/firebase-admin');
    if (adminAuth) {
      const decoded = await adminAuth.verifyIdToken(bearerToken);
      verifiedEmail = (decoded.email || '').toLowerCase().trim();
      verifiedUid = decoded.uid || '';
    }
  } catch (adminErr: any) {
    console.warn('Firebase Admin verifyIdToken encountered an error, trying Google REST verification fallback:', adminErr?.message || adminErr);
  }

  // 2. Resilient Fallback: Google Identity Toolkit REST API
  // This bypasses any Next.js / Vercel Serverless ESM bundling issues (e.g. jwks-rsa / jose)
  if (!verifiedEmail) {
    try {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (apiKey) {
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: bearerToken })
        });
        if (res.ok) {
          const data = await res.json();
          const u = data.users?.[0];
          if (u && u.email) {
            verifiedEmail = u.email.toLowerCase().trim();
            verifiedUid = u.localId || '';
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.error('Google accounts:lookup failed:', errData);
        }
      }
    } catch (restErr: any) {
      console.error('REST token verification fallback error:', restErr?.message || restErr);
    }
  }

  if (!verifiedEmail) {
    return { success: false, error: 'লগইন টোকেনটি সঠিক নয় বা মেয়াদোত্তীর্ণ হয়ে গেছে। অনুগ্রহ করে রিলোড দিয়ে আবার চেষ্টা করুন।' };
  }

  // 3. User permission lookup from Firestore
  let userDocData: any = null;

  // 3A. Primary: Firebase Admin SDK
  try {
    const { adminDb } = await import('@/lib/firebase-admin');
    if (adminDb) {
      let userDoc = null;
      if (verifiedEmail) {
        const byEmail = await adminDb.collection('users').doc(verifiedEmail).get();
        if (byEmail.exists) userDoc = byEmail;
      }
      if ((!userDoc || !userDoc.exists) && verifiedUid) {
        const byUid = await adminDb.collection('users').doc(verifiedUid).get();
        if (byUid.exists) userDoc = byUid;
      }
      if ((!userDoc || !userDoc.exists) && verifiedEmail) {
        const qSnap = await adminDb.collection('users').where('email', '==', verifiedEmail).limit(1).get();
        if (!qSnap.empty) userDoc = qSnap.docs[0];
      }

      if (userDoc && userDoc.exists) {
        userDocData = userDoc.data();
      }
    }
  } catch (adminDbErr: any) {
    console.warn('adminDb user lookup error, falling back to Firestore REST:', adminDbErr?.message || adminDbErr);
  }

  // 3B. Resilient Fallback: Firestore REST API with Authenticated User Token
  // Runs if Firebase Admin credentials are not set in Vercel or if adminDb is unavailable
  if (!userDocData) {
    try {
      const projId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      if (projId && (verifiedEmail || verifiedUid)) {
        const docIdsToTry = [verifiedEmail, verifiedUid].filter(Boolean);
        for (const docId of docIdsToTry) {
          const docUrl = `https://firestore.googleapis.com/v1/projects/${projId}/databases/(default)/documents/users/${encodeURIComponent(docId)}`;
          const fsRes = await fetch(docUrl, {
            headers: {
              'Authorization': `Bearer ${bearerToken}`
            }
          });
          if (fsRes.ok) {
            const rawDoc = await fsRes.json();
            if (rawDoc.fields) {
              userDocData = parseFirestoreFields(rawDoc.fields);
              break;
            }
          }
        }
      }
    } catch (fsRestErr: any) {
      console.warn('Firestore REST fallback user lookup error:', fsRestErr?.message || fsRestErr);
    }
  }

  if (!userDocData) {
    return { success: false, error: `ইউজার (${verifiedEmail}) ডাটাবেসের অনুমোদিত তালিকায় পাওয়া যায়নি।` };
  }

  if (userDocData.isActive === false) {
    return { success: false, error: 'আপনার অ্যাকাউন্টটি নিষ্ক্রিয় (Disabled) করা আছে।' };
  }

  return {
    success: true,
    user: {
      email: verifiedEmail,
      uid: verifiedUid,
      role: userDocData.role || 'Technician',
      name: userDocData.name || '',
      isActive: true
    }
  };
}
