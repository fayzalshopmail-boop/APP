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

    // 7. Dispatch Telegram Confirmation Notification to Owner
    const fileSizeStr = backupBuffer.length > 1024 * 1024
      ? (backupBuffer.length / (1024 * 1024)).toFixed(2) + ' MB'
      : (backupBuffer.length / 1024).toFixed(1) + ' KB';

    await sendTelegramBackupNotification(adminDb, 'success', {
      email,
      filename,
      fileSize: fileSizeStr,
      shopName
    });

    return NextResponse.json({ success: true, message: 'Backup email sent successfully!' });
  } catch (error: any) {
    console.error('Email backup error:', error?.message || error);
    try {
      await sendTelegramBackupNotification(null, 'failure', {
        email: process.env.EMAIL_BACKUP_USER,
        error: error?.message || 'Failed to send backup email'
      });
    } catch {}
    return NextResponse.json({ error: error.message || 'Failed to send backup email' }, { status: 500 });
  }
}

async function sendTelegramBackupNotification(
  adminDb: any, 
  status: 'success' | 'failure', 
  payload: { email?: string; filename?: string; fileSize?: string; shopName?: string; error?: string }
) {
  try {
    let token = process.env.TELEGRAM_BOT_TOKEN;
    let chatId = process.env.TELEGRAM_CHAT_ID;
    let enabled = true;
    let notifyOnBackup = true;

    if (adminDb) {
      try {
        const snap = await adminDb.collection('settings').doc('shop').get();
        if (snap.exists) {
          const tg = snap.data()?.telegram;
          if (tg) {
            if (tg.botToken) token = tg.botToken;
            if (tg.chatId) chatId = tg.chatId;
            if (tg.enabled === false) enabled = false;
            if (tg.notifyOnBackup === false) notifyOnBackup = false;
          }
        }
      } catch (err) {
        console.warn('Could not read Telegram settings for backup notification:', err);
      }
    }

    if (!enabled || !notifyOnBackup || !token || !chatId) return;

    const timeStr = new Intl.DateTimeFormat('bn-BD', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Dhaka'
    }).format(new Date());

    let text = '';
    if (status === 'success') {
      text = `💾 <b>অটো ডাটাবেস ব্যাকআপ সম্পন্ন (Backup Success)</b>\n\n` +
             `✅ আপনার শপের সম্পূর্ণ ডাটাবেস ব্যাকআপ ফাইল সফলভাবে জিমেইলে পাঠানো হয়েছে।\n\n` +
             (payload.shopName ? `🏢 <b>দোকান:</b> ${payload.shopName}\n` : '') +
             `📧 <b>প্রাপক ইমেইল:</b> ${payload.email || 'Owner Email'}\n` +
             (payload.filename ? `📁 <b>ফাইল:</b> <code>${payload.filename}</code>\n` : '') +
             (payload.fileSize ? `📦 <b>ফাইলের আকার:</b> ${payload.fileSize}\n` : '') +
             `\n🔒 আপনার সকল কাস্টমার, স্টক, পার্টস ও হিসাবের ডাটা নিরাপদে সংরক্ষিত রয়েছে।\n` +
             `\n🕒 <b>সময়:</b> ${timeStr}`;
    } else {
      text = `🚨 <b>ডাটাবেস ব্যাকআপ ব্যর্থ (Backup Failed)</b>\n\n` +
             `⚠️ আপনার শপের সাপ্তাহিক স্বয়ংক্রিয় ব্যাকআপ ইমেইল পাঠানো সম্ভব হয়নি।\n\n` +
             `📝 <b>ত্রুটি:</b> ${payload.error || 'অজানা ত্রুটি'}\n` +
             (payload.email ? `📧 <b>টার্গেট ইমেইল:</b> ${payload.email}\n` : '') +
             `\nঅনুগ্রহ করে সেটিংস থেকে জিমেইল অ্যাপ পাসওয়ার্ড ও ব্যাকআপ কনফিগারেশন চেক করুন।\n` +
             `\n🕒 <b>সময়:</b> ${timeStr}`;
    }

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    }).catch(e => console.warn('Telegram backup fetch failed:', e));
  } catch (err) {
    console.warn('sendTelegramBackupNotification exception:', err);
  }
}
