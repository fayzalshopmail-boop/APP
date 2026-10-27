import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let adminDb: any = null;
    let adminMessaging: any = null;
    let adminAuth: any = null;
    try {
      const adminMod = await import('@/lib/firebase-admin');
      adminDb = adminMod.adminDb;
      adminMessaging = adminMod.adminMessaging;
      adminAuth = adminMod.adminAuth;
    } catch (e) {
      console.warn("Could not load firebase-admin:", e);
    }

    if (!adminDb || !adminMessaging) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    // Dual authorization: either server CRON_SECRET or verified active Firebase User token
    const authHeader = request.headers.get('authorization');
    const token = (authHeader || '').replace(/^Bearer\s+/i, '').trim();

    const expectedCronSecret = process.env.CRON_SECRET;
    const isServerCron = Boolean(expectedCronSecret && token && token === expectedCronSecret);

    let isUserAuthorized = false;
    if (!isServerCron && adminAuth && token) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        const email = (decoded.email || '').toLowerCase().trim();
        if (email) {
          const userDoc = await adminDb.collection('users').doc(email).get();
          if (userDoc.exists && userDoc.data()?.isActive !== false) {
            isUserAuthorized = true;
          }
        }
      } catch (authErr) {
        // Token invalid or expired
      }
    }

    if (!isServerCron && !isUserAuthorized) {
      return NextResponse.json({ error: 'Unauthorized push notification request' }, { status: 401 });
    }
    
    const { title, body, link, targetRole } = await request.json().catch(() => ({}));

    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
    }

    // Avoid composite index requirement by fetching all tokens and filtering in memory
    const querySnapshot = await adminDb.collection('users')
      .where('fcmToken', '!=', null)
      .get();

    const tokens: string[] = [];
    querySnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.fcmToken) {
        if (targetRole === 'Owner' && data.role !== 'Owner') {
          return; // Skip if target is Owner but user is not
        }
        tokens.push(data.fcmToken);
      }
    });

    if (tokens.length === 0) {
      return NextResponse.json({ message: 'No devices found to send notification' }, { status: 200 });
    }

    // Send push notification via FCM with High Urgency for background wake-up
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        title: String(title),
        body: String(body),
        url: String(link || '/'),
        link: String(link || '/'),
      },
      webpush: {
        headers: {
          Urgency: 'high',
          TTL: '86400', // 24 hours
        },
        notification: {
          title: title,
          body: body,
          icon: '/icon.png',
          badge: '/icon.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          tag: `vsc-alert-${Date.now()}`,
          renotify: true,
          data: {
            url: link || '/'
          }
        },
        fcmOptions: {
          link: link || '/'
        }
      },
      android: {
        priority: 'high' as const,
        notification: {
          priority: 'high' as const,
          sound: 'default',
          channelId: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
        }
      },
      tokens: tokens,
    };

    const response = await adminMessaging.sendEachForMulticast(message);
    
    return NextResponse.json({ 
      success: true, 
      successCount: response.successCount, 
      failureCount: response.failureCount 
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
