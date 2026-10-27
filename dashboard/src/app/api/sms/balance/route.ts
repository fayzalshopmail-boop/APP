import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleBalanceCheck(request: Request, passedApiKey?: string | null) {
  try {
    // 1. Optional session check if authorization header is provided
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.substring(7).trim();
      try {
        const { adminAuth, adminDb } = await import('@/lib/firebase-admin');
        if (adminAuth) {
          const decoded = await adminAuth.verifyIdToken(idToken);
          const email = (decoded.email || '').toLowerCase().trim();

          if (adminDb && email) {
            const userDoc = await adminDb.collection('users').doc(email).get();
            if (userDoc.exists) {
              const data = userDoc.data();
              if (data?.isActive === false || (data?.role !== 'Owner' && data?.role !== 'Manager')) {
                return NextResponse.json({ error: "Only Shop Owners and Managers can access SMS balance." }, { status: 403 });
              }
            }
          }
        }
      } catch (authErr) {
        console.warn("Authorization verification skipped or failed:", authErr);
      }
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
