import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

async function handleBalanceCheck(request: Request, passedApiKey?: string | null) {
  try {
    // 1. Verify user session if adminAuth is initialized
    const authHeader = request.headers.get('authorization');
    if (adminAuth && authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.substring(7).trim();
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        const email = (decoded.email || '').toLowerCase().trim();

        // Ensure user is active and has Manager or Owner privileges
        if (adminDb && email) {
          const userDoc = await adminDb.collection('users').doc(email).get();
          if (userDoc.exists) {
            const data = userDoc.data();
            if (data?.isActive === false || (data?.role !== 'Owner' && data?.role !== 'Manager')) {
              return NextResponse.json({ error: "Only Shop Owners and Managers can access SMS balance." }, { status: 403 });
            }
          }
        }
      } catch (authErr) {
        return NextResponse.json({ error: "Invalid or expired authorization session." }, { status: 401 });
      }
    }

    // 2. Resolve API Key from Server Firestore first, or fall back to passed API Key
    let resolvedApiKey = passedApiKey || '';

    if (!resolvedApiKey && adminDb) {
      try {
        const docSnap = await adminDb.collection('settings').doc('sms').get();
        if (docSnap.exists) {
          resolvedApiKey = docSnap.data()?.apiKey || '';
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

    const result = await response.text();
    return NextResponse.json({ success: true, balance: result });
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
