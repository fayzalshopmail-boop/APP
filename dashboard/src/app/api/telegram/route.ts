import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatCurrency(amount: number): string {
  return '৳' + (amount || 0).toLocaleString('en-US');
}

function formatNow(): string {
  return new Intl.DateTimeFormat('bn-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Dhaka'
  }).format(new Date());
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, botToken: directToken, chatId: directChatId, type, data } = body;

    // Determine botToken and chatId (Direct payload or environment variables or Firestore)
    let token = directToken || process.env.TELEGRAM_BOT_TOKEN;
    let chatId = directChatId || process.env.TELEGRAM_CHAT_ID;

    // If not supplied directly or in env, check Firestore settings
    if (!token || !chatId) {
      try {
        const { adminDb } = await import('@/lib/firebase-admin');
        if (adminDb) {
          const settingsSnap = await adminDb.collection('settings').doc('shop').get();
          if (settingsSnap.exists) {
            const settings = settingsSnap.data();
            const tg = settings?.telegram;
            if (tg) {
              if (!token && tg.botToken) token = tg.botToken;
              if (!chatId && tg.chatId) chatId = tg.chatId;
              
              // If not an explicit test action and telegram is disabled in settings, skip
              if (action !== 'test' && tg.enabled === false) {
                return NextResponse.json({ success: true, skipped: true, reason: 'Telegram notifications are disabled in settings' });
              }

              // Check individual event filters
              if (action === 'notify') {
                if (type === 'sale' && tg.notifyOnSale === false) {
                  return NextResponse.json({ success: true, skipped: true });
                }
                if (type === 'payment' && tg.notifyOnPayment === false) {
                  return NextResponse.json({ success: true, skipped: true });
                }
                if (type === 'expense' && tg.notifyOnExpense === false) {
                  return NextResponse.json({ success: true, skipped: true });
                }
                if (type === 'low_stock' && tg.notifyOnLowStock === false) {
                  return NextResponse.json({ success: true, skipped: true });
                }
              }
            }
          }
        }
      } catch (dbErr) {
        console.warn('Could not read Telegram settings from Firestore:', dbErr);
      }
    }

    if (!token || !chatId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Telegram Bot Token বা Chat ID সেট করা নেই।' 
      }, { status: 400 });
    }

    let text = '';

    if (action === 'test') {
      text = `🎉 <b>টেলিগ্রাম নোটিফিকেশন সফলভাবে চালু হয়েছে!</b>\n\n` +
             `🔒 <b>ব্যক্তিগত সুরক্ষা:</b>\n` +
             `আপনার শপ ম্যানেজমেন্ট অ্যাপের সকল জরুরি নোটিফিকেশন এখন থেকে সরাসরি শুধুমাত্র আপনার এই অ্যাকাউন্টে চলে আসবে।\n\n` +
             `🕒 <b>সময়:</b> ${formatNow()}`;
    } else if (action === 'notify') {
      if (type === 'sale') {
        const { customerName, phone, device, totalBill, advance, due, staffName } = data || {};
        text = `🧾 <b>নতুন সার্ভিসিং / সেলস বিল</b>\n\n` +
               `👤 <b>গ্রাহক:</b> ${customerName || 'N/A'}\n` +
               `📱 <b>মোবাইল:</b> ${phone || 'N/A'}\n` +
               (device ? `🛠️ <b>ডিভাইস:</b> ${device}\n` : '') +
               `💰 <b>মোট বিল:</b> ${formatCurrency(totalBill)}\n` +
               `💵 <b>জমা:</b> ${formatCurrency(advance)}\n` +
               (due > 0 ? `⚠️ <b>বকেয়া:</b> ${formatCurrency(due)}\n` : `✅ <b>পরিশোধ:</b> সম্পূর্ণ পরিশোধিত\n`) +
               (staffName ? `👨‍🔧 <b>এন্ট্রি করেছেন:</b> ${staffName}\n` : '') +
               `\n🕒 <b>সময়:</b> ${formatNow()}`;
      } else if (type === 'payment') {
        const { customerName, phone, amount, paymentMethod, remainingDue, staffName } = data || {};
        text = `💰 <b>বকেয়া টাকা জমা হয়েছে</b>\n\n` +
               `👤 <b>গ্রাহক:</b> ${customerName || 'N/A'}\n` +
               `📱 <b>মোবাইল:</b> ${phone || 'N/A'}\n` +
               `💵 <b>জমা নেওয়া হয়েছে:</b> ${formatCurrency(amount)} (${paymentMethod || 'Cash'})\n` +
               (remainingDue > 0 ? `⚠️ <b>বর্তমান বকেয়া:</b> ${formatCurrency(remainingDue)}\n` : `✅ <b>বকেয়া স্ট্যাটাস:</b> সকল বকেয়া পরিশোধিত\n`) +
               (staffName ? `👨‍💼 <b>কালেকশনকারী:</b> ${staffName}\n` : '') +
               `\n🕒 <b>সময়:</b> ${formatNow()}`;
      } else if (type === 'expense') {
        const { title, category, amount, staffName } = data || {};
        text = `💸 <b>নতুন খরচ এন্ট্রি (Expense)</b>\n\n` +
               `📝 <b>বিবরণ:</b> ${title || 'N/A'}\n` +
               `📁 <b>ক্যাটাগরি:</b> ${category || 'General'}\n` +
               `💵 <b>টাকার পরিমাণ:</b> ${formatCurrency(amount)}\n` +
               (staffName ? `👤 <b>এন্ট্রি করেছেন:</b> ${staffName}\n` : '') +
               `\n🕒 <b>সময়:</b> ${formatNow()}`;
      } else if (type === 'low_stock') {
        const { itemName, currentStock, minStock } = data || {};
        text = `⚠️ <b>কম স্টক সতর্কতা (Low Stock Alert)</b>\n\n` +
               `📦 <b>আইটেম:</b> ${itemName || 'Unknown Item'}\n` +
               `🚨 <b>বর্তমান স্টক:</b> মাত্র ${currentStock ?? 0} টি অবশিষ্ট!\n` +
               (minStock ? `📊 <b>সর্বনিম্ন সীমা:</b> ${minStock} টি\n` : '') +
               `\n🕒 <b>সময়:</b> ${formatNow()}`;
      } else {
        const { title, message } = data || {};
        text = `📢 <b>${title || 'অ্যাপ নোটিফিকেশন'}</b>\n\n` +
               `${message || ''}\n\n` +
               `🕒 <b>সময়:</b> ${formatNow()}`;
      }
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    // Call Telegram Bot API
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
      console.error('Telegram API Error:', tgResult);
      return NextResponse.json({ 
        success: false, 
        error: tgResult?.description || 'টেলিগ্রামে মেসেজ পাঠানো যায়নি। টোকেন বা চ্যাট আইডি সঠিক কিনা নিশ্চিত করুন।' 
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, messageId: tgResult?.result?.message_id });
  } catch (err: any) {
    console.error('Telegram route handler error:', err);
    return NextResponse.json({ 
      success: false, 
      error: err?.message || 'Internal server error while sending Telegram notification' 
    }, { status: 500 });
  }
}
