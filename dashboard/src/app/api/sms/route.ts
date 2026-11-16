import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return fallback;

    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = ALLOWED_SMS_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      throw new Error(`Unauthorized SMS gateway domain: ${hostname}`);
    }

    parsed.protocol = 'https:';
    parsed.search = '';
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  try {
    // 1. Strictly authenticate Request via Firebase Auth ID Token or CRON_SECRET
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Missing or invalid authorization header. Login required." }, { status: 401 });
    }

    const token = authHeader.substring(7).trim();
    const isCron = Boolean(process.env.CRON_SECRET && token === process.env.CRON_SECRET);
    let isAuthorized = isCron;
    let userRole = isCron ? 'Owner' : '';
    let userEmail = isCron ? 'cron@system' : '';

    if (!isAuthorized) {
      const { verifyUserToken } = await import('@/lib/serverAuth');
      const authRes = await verifyUserToken(token);
      if (authRes.success && authRes.user) {
        isAuthorized = true;
        userRole = authRes.user.role;
        userEmail = authRes.user.email;
      } else {
        return NextResponse.json({ error: authRes.error || "Your account is disabled or unauthorized to dispatch SMS." }, { status: 403 });
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized SMS request." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { number, message, isBulkCampaign } = body;

    const isOwnerOrManager = userRole === 'Owner' || userRole === 'Manager';
    const isCampaignMode = Boolean(isBulkCampaign || (Array.isArray(number) && number.length > 1));

    // SEC-05: Restrict Bulk SMS and Campaign dispatching to Owner & Manager only
    if (isCampaignMode && !isOwnerOrManager && !isCron) {
      return NextResponse.json(
        { error: "টেকনিশিয়ান অ্যাকাউন্ট থেকে বাল্ক বা ক্যাম্পেইন এসএমএস পাঠানো অনুমোদিত নয়।" },
        { status: 403 }
      );
    }

    // Rate Limiting Enforcement:
    // Bulk SMS and Follow-up SMS campaigns executed by Shop Owner/Manager have NO rate limit,
    // allowing the shop owner to broadcast promotions and follow-ups to all customers without 429 throttling.
    let rateLimitResult: any = null;
    const shouldBypassRateLimit = isCron || (isCampaignMode && isOwnerOrManager);

    if (!shouldBypassRateLimit) {
      const { checkRateLimit, getClientIp } = await import('@/lib/rateLimit');
      const clientIp = getClientIp(request);
      const rateLimitKey = userEmail ? `sms:${userEmail}` : `sms:ip:${clientIp}`;

      // Regular staff / standard dispatch: Technicians max 5 SMS/min; Owners max 20 standard SMS/min
      const maxLimit = isOwnerOrManager ? 20 : 5;
      const rl = checkRateLimit(rateLimitKey, maxLimit, 60 * 1000);
      rateLimitResult = rl;

      if (!rl.allowed) {
        return NextResponse.json(
          {
            error: `খুব দ্রুত এসএমএস পাঠানো হচ্ছে (Rate limit exceeded)। অনুগ্রহ করে ${rl.retryAfterSec} সেকেন্ড অপেক্ষা করুন।`
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(rl.retryAfterSec),
              'X-RateLimit-Limit': String(rl.limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(rl.resetTime),
            }
          }
        );
      }
    }

    if (!number || (Array.isArray(number) && number.length === 0)) {
      return NextResponse.json({ error: "No recipient phone number provided." }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: "Message content cannot be empty." }, { status: 400 });
    }

    // Restrict single multi-number payload to max 500 recipients per batch
    if (Array.isArray(number) && number.length > 500) {
      return NextResponse.json(
        { error: "একবারে সর্বোচ্চ ৫০০ জন কাস্টমারকে এসএমএস পাঠানো যাবে।" },
        { status: 400 }
      );
    }

    // 2. Resolve SMS credentials safely
    let apiKey = body.apiKey || '';
    let senderId = body.senderId || '';
    let rawApiUrl = body.apiUrl || '';

    if (!apiKey || !senderId) {
      try {
        const { adminDb } = await import('@/lib/firebase-admin');
        if (adminDb) {
          const smsDoc = await adminDb.collection('settings').doc('sms').get();
          if (smsDoc.exists) {
            const smsData = smsDoc.data();
            if (smsData?.apiKey) apiKey = smsData.apiKey;
            if (smsData?.senderId) senderId = smsData.senderId;
            if (smsData?.apiUrl) rawApiUrl = smsData.apiUrl;
          }
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

    // 4. Format and strictly validate phone numbers to Bangladesh 880 prefix
    const formatPhone = (num: string): string | null => {
      let f = String(num).replace(/\D/g, '');
      if (f.startsWith('880')) f = f.slice(3);
      else if (f.startsWith('88')) f = f.slice(2);
      if (f.startsWith('0')) f = f.slice(1);

      // Valid Bangladesh mobile local part must be 10 digits starting with 13-19 (e.g. 17XXXXXXXX)
      if (/^1[3-9]\d{8}$/.test(f)) {
        return '880' + f;
      }
      return null;
    };

    let targetNumbers = '';
    if (Array.isArray(number)) {
      const validList = number.map(formatPhone).filter((n): n is string => Boolean(n));
      targetNumbers = validList.join(',');
    } else {
      const formatted = formatPhone(number);
      if (formatted) targetNumbers = formatted;
    }

    if (!targetNumbers) {
      return NextResponse.json({ 
        error: "Invalid recipient phone number. Bangladesh numbers must be 11 digits (e.g. 017XXXXXXXX)." 
      }, { status: 400 });
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

    const responseHeaders: Record<string, string> = {};
    if (rateLimitResult) {
      responseHeaders['X-RateLimit-Limit'] = String(rateLimitResult.limit);
      responseHeaders['X-RateLimit-Remaining'] = String(rateLimitResult.remaining);
      responseHeaders['X-RateLimit-Reset'] = String(rateLimitResult.resetTime);
    }

    return NextResponse.json({ success: true, result }, { headers: responseHeaders });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return NextResponse.json({ error: "SMS gateway request timed out. Please try again." }, { status: 504 });
    }
    console.error("SMS API Route Error:", error);
    return NextResponse.json({ error: error.message || "Failed to dispatch SMS" }, { status: 500 });
  }
}
