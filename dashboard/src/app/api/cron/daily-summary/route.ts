import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatCurrency(amount: number): string {
  return '৳' + (amount || 0).toLocaleString('en-US');
}

function getDhakaDateInfo(offsetDays = 0) {
  const now = new Date();
  if (offsetDays !== 0) {
    now.setDate(now.getDate() + offsetDays);
  }
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    hour: 'numeric',
    hour12: false
  }).format(new Date());

  const hour = parseInt(hourStr, 10);
  return { dateStr, hour };
}

async function fetchCollectionDocs(
  adminDb: any, 
  colName: string, 
  bearerToken?: string
): Promise<{ id: string; [key: string]: any }[]> {
  if (adminDb) {
    try {
      const snap = await adminDb.collection(colName).get();
      return snap.docs.map((d: any) => ({
        id: d.id,
        ...d.data()
      }));
    } catch (e) {
      console.warn(`adminDb collection fetch error for ${colName}:`, e);
    }
  }

  // Resilient REST fallback using bearerToken on Vercel Serverless
  if (bearerToken) {
    try {
      const projId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      if (projId) {
        const url = `https://firestore.googleapis.com/v1/projects/${projId}/databases/(default)/documents/${colName}?pageSize=300`;
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${bearerToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          const { parseFirestoreFields } = await import('@/lib/serverAuth');
          return (data.documents || []).map((doc: any) => ({
            id: doc.name.split('/').pop(),
            ...parseFirestoreFields(doc.fields)
          }));
        }
      }
    } catch (restErr) {
      console.warn(`Firestore REST collection fetch error for ${colName}:`, restErr);
    }
  }

  return [];
}

export async function executeDailySummary(
  forceDate?: string,
  overrides?: { token?: string; chatId?: string; bearerToken?: string }
): Promise<{ success: boolean; messageId?: number; error?: string; skipped?: boolean }> {
  try {
    let adminDb: any = null;
    try {
      const adminMod = await import('@/lib/firebase-admin');
      adminDb = adminMod.adminDb;
    } catch {}

    // 1. Load Telegram settings from Firestore or env
    let token = overrides?.token || process.env.TELEGRAM_BOT_TOKEN;
    let chatId = overrides?.chatId || process.env.TELEGRAM_CHAT_ID;
    let notifyOnDailySummary = true;
    let enabled = true;
    let lastAutoSummaryDate = '';

    let settingsSnap: any = null;
    if (adminDb) {
      try {
        settingsSnap = await adminDb.collection('settings').doc('shop').get();
      } catch (e) {
        console.warn('Could not get settings from adminDb:', e);
      }
    }
    if (settingsSnap && settingsSnap.exists) {
      const data = settingsSnap.data();
      const tg = data?.telegram;
      if (tg) {
        if (tg.botToken) token = tg.botToken;
        if (tg.chatId) chatId = tg.chatId;
        if (tg.enabled === false) enabled = false;
        if (tg.notifyOnDailySummary === false) notifyOnDailySummary = false;
        lastAutoSummaryDate = tg.lastAutoSummaryDate || '';
      }
    }

    // Fallback: If token/chatId still missing, query Firestore REST API
    if ((!token || !chatId) && overrides?.bearerToken) {
      try {
        const projId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        if (projId) {
          const docUrl = `https://firestore.googleapis.com/v1/projects/${projId}/databases/(default)/documents/settings/shop`;
          const fsRes = await fetch(docUrl, {
            headers: { 'Authorization': `Bearer ${overrides.bearerToken}` }
          });
          if (fsRes.ok) {
            const rawDoc = await fsRes.json();
            const { parseFirestoreFields } = await import('@/lib/serverAuth');
            const shopData = parseFirestoreFields(rawDoc.fields);
            const tg = shopData?.telegram;
            if (tg) {
              if (!token && tg.botToken) token = tg.botToken;
              if (!chatId && tg.chatId) chatId = tg.chatId;
              if (tg.enabled === false) enabled = false;
              if (tg.notifyOnDailySummary === false) notifyOnDailySummary = false;
              lastAutoSummaryDate = tg.lastAutoSummaryDate || '';
            }
          }
        }
      } catch (restErr) {
        console.warn('Could not read settings via Firestore REST:', restErr);
      }
    }

    if (!enabled || !notifyOnDailySummary) {
      return { success: true, skipped: true };
    }

    if (!token || !chatId) {
      return { success: false, error: 'Telegram Bot Token বা Chat ID সেট করা নেই।' };
    }

    // 2. Determine target date
    // If it's around midnight (hour 0), summarize yesterday (the day that just concluded).
    // Otherwise, summarize the specified forceDate or today.
    let targetDateStr = forceDate;
    if (!targetDateStr) {
      const { dateStr, hour } = getDhakaDateInfo();
      if (hour === 0) {
        // Just crossed midnight (12:00 AM) -> summarize yesterday
        targetDateStr = getDhakaDateInfo(-1).dateStr;
      } else {
        targetDateStr = dateStr;
      }
    }

    const startOfDayMs = new Date(`${targetDateStr}T00:00:00+06:00`).getTime();
    const endOfDayMs = new Date(`${targetDateStr}T23:59:59.999+06:00`).getTime();

    let cashCollected = 0;
    let totalExpenses = 0;
    let totalBilled = 0;
    let newCustomersCount = 0;
    let deliveredCount = 0;

    // A. Query transactions in that target date
    const transactions = await fetchCollectionDocs(adminDb, 'transactions', overrides?.bearerToken);
    transactions.forEach((tData) => {
      const createdAt = tData.createdAt?.toDate ? tData.createdAt.toDate() : (tData.createdAt ? new Date(tData.createdAt) : null);
      if (createdAt) {
        const timeMs = createdAt.getTime();
        if (timeMs >= startOfDayMs && timeMs <= endOfDayMs) {
          const amt = Number(tData.amount) || 0;
          if (amt > 0 && tData.type !== 'Supplier Payment') {
            cashCollected += amt;
          }
        }
      }
    });

    // B. Query expenses in that target date
    const expenses = await fetchCollectionDocs(adminDb, 'expenses', overrides?.bearerToken);
    expenses.forEach((eData) => {
      const eDate = eData.date || '';
      const createdAt = eData.createdAt?.toDate ? eData.createdAt.toDate() : (eData.createdAt ? new Date(eData.createdAt) : null);
      const isDateMatch = eDate === targetDateStr;
      const isTimeMatch = createdAt && createdAt.getTime() >= startOfDayMs && createdAt.getTime() <= endOfDayMs;
      if (isDateMatch || isTimeMatch) {
        totalExpenses += Number(eData.amount) || 0;
      }
    });

    // C. Query customers created or delivered in that target date
    const customers = await fetchCollectionDocs(adminDb, 'customers', overrides?.bearerToken);
    customers.forEach((cData) => {
      const createdAt = cData.createdAt?.toDate ? cData.createdAt.toDate() : (cData.createdAt ? new Date(cData.createdAt) : null);
      const deliveredAt = cData.deliveredAt?.toDate ? cData.deliveredAt.toDate() : (cData.deliveredAt ? new Date(cData.deliveredAt) : null);

      if (createdAt) {
        const cTimeMs = createdAt.getTime();
        if (cTimeMs >= startOfDayMs && cTimeMs <= endOfDayMs) {
          newCustomersCount++;
          totalBilled += Number(cData.totalBill) || 0;
        }
      }

      if (cData.status === 'Delivered' && deliveredAt) {
        const dTimeMs = deliveredAt.getTime();
        if (dTimeMs >= startOfDayMs && dTimeMs <= endOfDayMs) {
          deliveredCount++;
        }
      }
    });

    const netCash = cashCollected - totalExpenses;

    const text = `📊 <b>দৈনিক ব্যবসায়িক সমাপ্তি হিসাব (Daily Closing Summary)</b>\n` +
                 `📅 <b>তারিখ:</b> ${targetDateStr}\n` +
                 `⏰ <b>ক্লোজিং সময়:</b> রাত ১২:০০ টা\n\n` +
                 `💵 <b>মোট নগদ ক্যাশ জমা:</b> ${formatCurrency(cashCollected)}\n` +
                 `💸 <b>মোট দোকানের খরচ:</b> ${formatCurrency(totalExpenses)}\n` +
                 `📈 <b>আজকের নেট ক্যাশ ব্যালেন্স:</b> ${formatCurrency(netCash)}\n\n` +
                 `🛒 <b>মোট সার্ভিসিং ও সেলস বিল:</b> ${formatCurrency(totalBilled)}\n` +
                 `📱 <b>নতুন ডিভাইস গ্রহণ:</b> ${newCustomersCount} টি\n` +
                 `🚚 <b>ডেলিভারি সম্পন্ন:</b> ${deliveredCount} টি\n\n` +
                 `✨ <i>আলহামদুলিল্লাহ, সারাদিনের ব্যবসায়িক হিসাব সফলভাবে ক্লোজ করা হয়েছে।</i>`;

    const telegramEndpoint = `https://api.telegram.org/bot${token}/sendMessage`;
    const tgResponse = await fetch(telegramEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const tgResult = await tgResponse.json();
    if (!tgResponse.ok || !tgResult.ok) {
      return { success: false, error: tgResult?.description || 'Telegram dispatch failed' };
    }

    // Save last summary date to avoid re-triggering for the same day
    if (adminDb) {
      try {
        await adminDb.collection('settings').doc('shop').set({
          telegram: {
            lastAutoSummaryDate: targetDateStr
          }
        }, { merge: true });
      } catch (saveErr) {
        console.warn('Could not update lastAutoSummaryDate:', saveErr);
      }
    }

    return { success: true, messageId: tgResult?.result?.message_id };
  } catch (err: any) {
    console.error('executeDailySummary error:', err);
    return { success: false, error: err?.message || 'Server error generating daily summary' };
  }
}

async function verifyCronOrOwnerAuth(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;

  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && token === expectedSecret) {
    return true;
  }

  const { verifyUserToken } = await import('@/lib/serverAuth');
  const res = await verifyUserToken(token);
  if (res.success && res.user && (res.user.role === 'Owner' || res.user.role === 'Manager')) {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyCronOrOwnerAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized request' }, { status: 401 });
  }

  const result = await executeDailySummary();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyCronOrOwnerAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized request' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await executeDailySummary(body?.forceDate);
  return NextResponse.json(result);
}
