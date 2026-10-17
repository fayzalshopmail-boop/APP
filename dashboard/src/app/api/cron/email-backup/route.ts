import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET || 'backup_secret_shop_2026_antigravity';
    
    // Validate authorization (mandatory)
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized backup request' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { dataJSON, shopName } = body;

    const email = process.env.EMAIL_BACKUP_USER || body.email;
    const password = process.env.EMAIL_BACKUP_PASS || body.password;

    if (!email || !password || !dataJSON) {
      return NextResponse.json({ error: 'Missing backup credentials or data' }, { status: 400 });
    }

    // Configure Nodemailer transporter with user's Gmail app password
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: password.replace(/\s+/g, ''), // Ensure no spaces in password
      },
    });

    // Create a buffer from the JSON string
    const backupBuffer = Buffer.from(dataJSON, 'utf-8');
    const dateStr = new Date().toISOString().split('T')[0];
    const safeShopName = shopName || 'Shop';
    const filename = `${safeShopName.replace(/\s+/g, '_')}_Backup_${dateStr}.json`;

    // Send the email
    await transporter.sendMail({
      from: `"${safeShopName} Backup" <${email}>`,
      to: email, // Send to themselves
      subject: `Weekly Automated Backup - ${safeShopName} - ${dateStr}`,
      text: `Hello,\n\nPlease find the automated full database backup for ${safeShopName} attached to this email.\n\nKeep this file safe.\n\nBest regards,\n${safeShopName} System`,
      attachments: [
        {
          filename: filename,
          content: backupBuffer,
        },
      ],
    });

    return NextResponse.json({ success: true, message: 'Backup email sent successfully!' });
  } catch (error: any) {
    console.error('Email backup error:', error?.message || error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
