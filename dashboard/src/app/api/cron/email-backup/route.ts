import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { email, password, dataJSON, shopName } = await req.json();

    if (!email || !password || !dataJSON) {
      return NextResponse.json({ error: 'Missing credentials or data' }, { status: 400 });
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
    console.error('Email backup error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
