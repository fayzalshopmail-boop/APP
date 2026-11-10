import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleBalanceCheck(request: Request, passedApiKey?: string | null) {
  try {
    // 1. Mandatory session check: Only Shop Owners and Managers can access SMS balance
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Missing or invalid authorization header. Login required." }, { status: 401 });
    }

    const idToken = authHeader.substring(7).trim();
    const isCron = Boolean(process.env.CRON_SECRET && idToken === process.env.CRON_SECRET);
    let isAuthorized = isCron;

    if (!isAuthorized) {
      try {
        const { adminAuth, adminDb } = await import('@/lib/firebase-admin');
        if (adminAuth) {
          const decoded = await adminAuth.verifyIdToken(idToken);
          const email = (decoded.email || '').toLowerCase().trim();
          const uid = decoded.uid;

          if (adminDb && (email || uid)) {
            let userDoc = null;
            if (email) {
              const byEmail = await adminDb.collection('users').doc(email).get();
              if (byEmail.exists) userDoc = byEmail;
            }
            if ((!userDoc || !userDoc.exists) && uid) {
              const byUid = await adminDb.collection('users').doc(uid).get();
              if (byUid.exists) userDoc = byUid;
            }
            if ((!userDoc || !userDoc.exists) && email) {
              const qSnap = await adminDb.collection('users').where('email', '==', email).limit(1).get();
              if (!qSnap.empty) userDoc = qSnap.docs[0];
            }

            if (userDoc && userDoc.exists) {
              const data = userDoc.data();
              if (data?.isActive !== false && (data?.role === 'Owner' || data?.role === 'Manager')) {
                isAuthorized = true;
              }
            }
          }
        }
      } catch (authErr) {
        return NextResponse.json({ error: "Invalid or expired authorization token." }, { status: 401 });
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Only Shop Owners and Managers can access SMS balance." }, { status: 403 });
    }

    // 2. Resolve API Key from passed parameter or fallback to Firestore
    let resolvedApiKey = (passedApiKey || '').trim();

    if (!resolvedApiKey) {
      try {
        const { adminDb } = await import('@/lib/firebase-admin');
        if (adminDb) {
          const docSnap = await adminDb.collection('settings').doc('sms').get();
          if (docSnap.exists) {
            resolvedApiKey = docSnap.data()?.apiKey || '';
          }
        }
      } catch (dbErr) {
        console.warn("Could not retrieve SMS key from adminDb:", dbErr);
      }
    }

    if (!resolvedApiKey) {
      return NextResponse.json({ error: "API Key is required to fetch balance. Please configure it in Settings." }, { status: 400 });
    }

    // 3. Query BulkSMSBD balance API securely
    const url = `https://bulksmsbd.net/api/getBalanceApi?api_key=${encodeURIComponent(resolvedApiKey.trim())}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { 
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const resultText = await response.text();
    let balanceVal: string | number = resultText;
    try {
      const parsed = JSON.parse(resultText);
      if (parsed.balance !== undefined && !isNaN(Number(parsed.balance))) {
        balanceVal = Number(Number(parsed.balance).toFixed(2));
      }
    } catch {}

    return NextResponse.json({ success: true, balance: balanceVal, raw: resultText });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return NextResponse.json({ error: "Request timed out while checking balance." }, { status: 504 });
    }
    return NextResponse.json({ error: error.message || "Failed to fetch balance" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get('apiKey');
  return handleBalanceCheck(request, apiKey);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return handleBalanceCheck(request, body.apiKey);
}
