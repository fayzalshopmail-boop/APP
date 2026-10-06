import { NextResponse } from 'next/server';
import { adminMessaging, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { title, body, link, targetRole } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
    }

    // Find users who should receive this notification
    // targetRole could be 'Owner' or 'All'
    let querySnapshot;
    if (targetRole === 'Owner') {
      querySnapshot = await adminDb.collection('users')
        .where('role', '==', 'Owner')
        .where('fcmToken', '!=', null)
        .get();
    } else {
      // Send to all staff and owners who have a token
      querySnapshot = await adminDb.collection('users')
        .where('fcmToken', '!=', null)
        .get();
    }

    const tokens: string[] = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) {
        tokens.push(data.fcmToken);
      }
    });

    if (tokens.length === 0) {
      return NextResponse.json({ message: 'No devices found to send notification' }, { status: 200 });
    }

    // Send push notification via FCM
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        url: link || '/' // Useful if we want clicking the notification to open a specific page
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
