import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let adminDb: any = null;
    let adminAuth: any = null;
    try {
      const adminMod = await import('@/lib/firebase-admin');
      adminDb = adminMod.adminDb;
      adminAuth = adminMod.adminAuth;
    } catch (e) {
      console.warn("Could not load firebase-admin:", e);
    }
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    // 1. Authorize: Server CRON_SECRET or verified Owner/Manager token
    const expectedSecret = process.env.CRON_SECRET;
    const isServerCron = Boolean(expectedSecret && token && token === expectedSecret);

    let isAuthorizedUser = false;
    if (!isServerCron && adminAuth && token) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        const email = (decoded.email || '').toLowerCase().trim();
        if (email && adminDb) {
          const userDoc = await adminDb.collection('users').doc(email).get();
          if (userDoc.exists) {
            const data = userDoc.data();
            if (data?.isActive !== false && (data?.role === 'Owner' || data?.role === 'Manager')) {
              isAuthorizedUser = true;
            }
          }
        }
      } catch (authErr) {
        // Token invalid
      }
    }

    if (!isServerCron && !isAuthorizedUser) {
      return NextResponse.json({ error: 'Unauthorized backup request' }, { status: 401 });
    }

    // 2. Resolve Email Credentials strictly from Server Environment Variables
    const email = process.env.EMAIL_BACKUP_USER;
    const password = process.env.EMAIL_BACKUP_PASS;

    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email backup credentials (EMAIL_BACKUP_USER, EMAIL_BACKUP_PASS) are not configured on the server.' 
      }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    let dataJSON = body.dataJSON;
    let shopName = body.shopName;

    // 3. Server-side Backup Generation: If client didn't supply dataJSON, generate it directly on server
    if (!dataJSON && adminDb) {
      const collectionsToExport = [
        'customers', 'inventory', 'transactions', 'expenses', 
        'suppliers', 'mechanics', 'loans', 'attendance', 'payroll', 'settings'
      ];

      const backupData: Record<string, any[]> = {};
      for (const colName of collectionsToExport) {
        try {
          const snap = await adminDb.collection(colName).get();
          backupData[colName] = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        } catch (colErr) {
          console.warn(`Could not export collection ${colName}:`, colErr);
          backupData[colName] = [];
        }
      }

      if (!shopName) {
        const shopDoc = backupData['settings']?.find((s: any) => s.id === 'shop');
        shopName = shopDoc?.shopName || 'Shop';
      }

      dataJSON = JSON.stringify({
        ...backupData,
        exportDate: new Date().toISOString(),
        exportSource: 'Automated Server Cron'
      }, null, 2);
    }

    if (!dataJSON) {
      return NextResponse.json({ error: 'Failed to generate database backup.' }, { status: 500 });
    }

    // 4. Configure Nodemailer with Gmail App Password
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: password.replace(/\s+/g, ''), // Ensure no spaces in password
      },
    });

    const backupBuffer = Buffer.from(dataJSON, 'utf-8');
    const dateStr = new Date().toISOString().split('T')[0];
    const safeShopName = (shopName || 'Shop').replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, '_');
    const filename = `${safeShopName}_Backup_${dateStr}.json`;

    // 5. Send Email
    await transporter.sendMail({
      from: `"${shopName || 'Shop'} Backup" <${email}>`,
      to: email,
      subject: `Weekly Automated Backup - ${shopName || 'Shop'} - ${dateStr}`,
      text: `Hello,\n\nPlease find the automated full database backup for ${shopName || 'Shop'} attached to this email.\n\nKeep this file safe.\n\nBest regards,\n${shopName || 'Shop'} System`,
      attachments: [
        {
          filename: filename,
          content: backupBuffer,
        },
      ],
    });

    // 6. Update lastAutoBackupDate atomically in Firestore
    if (adminDb) {
      try {
        await adminDb.collection('settings').doc('shop').set({
          lastAutoBackupDate: Date.now()
        }, { merge: true });
      } catch (saveErr) {
        console.warn('Could not update lastAutoBackupDate in settings/shop:', saveErr);
      }
    }

    return NextResponse.json({ success: true, message: 'Backup email sent successfully!' });
  } catch (error: any) {
    console.error('Email backup error:', error?.message || error);
    return NextResponse.json({ error: error.message || 'Failed to send backup email' }, { status: 500 });
  }
}
