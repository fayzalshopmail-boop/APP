import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

// Strict whitelist of permitted external SMS gateway domains (SSRF mitigation)
const ALLOWED_SMS_DOMAINS = [
  'bulksmsbd.net',
  'api.bulksmsbd.net',
  'www.bulksmsbd.net'
];

function sanitizeGatewayUrl(candidateUrl?: string): string {
  const fallback = 'https://bulksmsbd.net/api/smsapi';
  if (!candidateUrl) return fallback;

  try {
    const parsed = new URL(candidateUrl);
    // Enforce HTTPS
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return fallback;

    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = ALLOWED_SMS_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      throw new Error(`Unauthorized SMS gateway domain: ${hostname}`);
    }

    // Force HTTPS for privacy
    parsed.protocol = 'https:';
    // Strip query parameters to prevent parameter smuggling
    parsed.search = '';
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate Request via Firebase Auth ID Token if Admin Auth is available
    const authHeader = request.headers.get('authorization');
    let callerEmail: string | null = null;

    if (adminAuth && authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.substring(7).trim();
      try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        callerEmail = (decodedToken.email || '').toLowerCase().trim();
      } catch (authErr: any) {
        return NextResponse.json({ error: "Invalid or expired authorization session. Please log in again." }, { status: 401 });
      }
    }

    // Verify user is active in Firestore
    if (adminDb && callerEmail) {
      try {
        const userDoc = await adminDb.collection('users').doc(callerEmail).get();
        if (userDoc.exists && userDoc.data()?.isActive === false) {
          return NextResponse.json({ error: "Your account is disabled. Cannot send SMS." }, { status: 403 });
        }
      } catch (userCheckErr) {
        console.warn("Could not verify active status of caller, continuing:", userCheckErr);
      }
    }

    const body = await request.json().catch(() => ({}));
    const { number, message } = body;

    if (!number || (Array.isArray(number) && number.length === 0)) {
      return NextResponse.json({ error: "No recipient phone number provided." }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: "Message content cannot be empty." }, { status: 400 });
    }

    // 2. Resolve SMS credentials safely from Server Database (preferred) with request fallback
    let apiKey = body.apiKey || '';
    let senderId = body.senderId || '';
    let rawApiUrl = body.apiUrl || '';

    if (adminDb) {
      try {
        const smsDoc = await adminDb.collection('settings').doc('sms').get();
        if (smsDoc.exists) {
          const smsData = smsDoc.data();
          if (smsData?.apiKey) apiKey = smsData.apiKey;
          if (smsData?.senderId) senderId = smsData.senderId;
          if (smsData?.apiUrl) rawApiUrl = smsData.apiUrl;
        }
      } catch (dbErr) {
        console.warn("Failed to read server SMS settings from adminDb:", dbErr);
      }
    }

    if (!apiKey || !senderId) {
      return NextResponse.json({ 
        error: "SMS configuration missing. Please setup your API Key and Sender ID in Settings." 
      }, { status: 400 });
    }

    // 3. SSRF Mitigation: Validate and sanitize SMS Gateway URL
    const baseUrl = sanitizeGatewayUrl(rawApiUrl);

    // 4. Format phone numbers to Bangladesh 880 prefix
    const formatPhone = (num: string) => {
      let f = String(num).replace(/\D/g, '');
      if (f.startsWith('01')) f = '88' + f;
      return f;
    };

    let targetNumbers = '';
    if (Array.isArray(number)) {
      targetNumbers = number.map(formatPhone).filter(n => n.length >= 11).join(',');
    } else {
      targetNumbers = formatPhone(number);
    }

    if (!targetNumbers) {
      return NextResponse.json({ error: "No valid recipient phone numbers formatted." }, { status: 400 });
    }

    const isUnicode = /[\u0980-\u09FF]/.test(message) || /[^\u0000-\u007F]/.test(message);
    const smsType = isUnicode ? 'unicode' : 'text';

    const url = `${baseUrl}?api_key=${encodeURIComponent(apiKey)}&type=${smsType}&number=${targetNumbers}&senderid=${encodeURIComponent(senderId)}&message=${encodeURIComponent(message)}`;

    // 5. Send with safe timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const response = await fetch(url, { 
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const resultText = await response.text();

    let result: any = resultText;
    try {
      result = JSON.parse(resultText);
    } catch {}

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return NextResponse.json({ error: "SMS gateway request timed out. Please try again." }, { status: 504 });
    }
    console.error("SMS API Route Error:", error);
    return NextResponse.json({ error: error.message || "Failed to dispatch SMS" }, { status: 500 });
  }
}
