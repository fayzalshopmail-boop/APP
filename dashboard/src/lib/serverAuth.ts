export interface VerifiedUser {
  email: string;
  uid: string;
  role: 'Owner' | 'Manager' | 'Technician';
  name?: string;
  isActive: boolean;
}

export async function verifyUserToken(bearerToken: string): Promise<{ success: boolean; user?: VerifiedUser; error?: string }> {
  if (!bearerToken) {
    return { success: false, error: 'অথেনটিকেশন টোকেন পাওয়া যায়নি। অনুগ্রহ করে রিলোড দিয়ে আবার চেষ্টা করুন।' };
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

      if (!userDoc || !userDoc.exists) {
        return { success: false, error: `ইউজার (${verifiedEmail}) ডাটাবেসে অনুমোদিত তালিকায় পাওয়া যায়নি।` };
      }

      const uData = userDoc.data();
      if (uData?.isActive === false) {
        return { success: false, error: 'আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা আছে।' };
      }

      return {
        success: true,
        user: {
          email: verifiedEmail,
          uid: verifiedUid,
          role: uData?.role || 'Technician',
          name: uData?.name || '',
          isActive: true
        }
      };
    }
  } catch (dbErr: any) {
    console.error('Firestore user lookup error in serverAuth:', dbErr);
  }

  return { success: false, error: 'ডাটাবেস কানেকশন ত্রুটি। সার্ভার লগ চেক করুন।' };
}
