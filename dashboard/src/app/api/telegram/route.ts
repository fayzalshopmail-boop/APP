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

function getTodayDhakaDateStr(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
  return parts; // 'YYYY-MM-DD'
}

export async function POST(request: Request) {
  try {
    // 1. Mandatory Authentication: Either CRON_SECRET or verified active Firebase User token
    const authHeader = request.headers.get('authorization');
    const bearerToken = (authHeader || '').replace(/^Bearer\s+/i, '').trim();

    const expectedCronSecret = process.env.CRON_SECRET;
    const isServerCron = Boolean(expectedCronSecret && bearerToken && bearerToken === expectedCronSecret);

    let isUserAuthorized = isServerCron;
    let userRole = isServerCron ? 'Owner' : '';
    let authErrorMessage = '';

    if (!isServerCron) {
      const { verifyUserToken } = await import('@/lib/serverAuth');
      const authResult = await verifyUserToken(bearerToken);
      if (authResult.success && authResult.user) {
        isUserAuthorized = true;
        userRole = authResult.user.role;
      } else {
        authErrorMessage = authResult.error || 'Unauthorized Telegram request';
      }
    }

    if (!isUserAuthorized) {
      return NextResponse.json({ success: false, error: authErrorMessage || 'Unauthorized Telegram request' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, botToken: directToken, chatId: directChatId, type, data } = body;

    // For test actions, only Owner or Manager (or Cron) is permitted
    if (action === 'test' && !isServerCron && userRole !== 'Owner' && userRole !== 'Manager') {
      return NextResponse.json({ success: false, error: 'Only Owners or Managers can send test Telegram messages' }, { status: 403 });
    }

    // Default to server-configured secrets
    let token = process.env.TELEGRAM_BOT_TOKEN;
    let chatId = process.env.TELEGRAM_CHAT_ID;

    // Direct token and chat ID override is ONLY permitted for Owners/Managers in test mode
    if (action === 'test' && (isServerCron || userRole === 'Owner' || userRole === 'Manager')) {
      if (directToken) token = directToken;
      if (directChatId) chatId = directChatId;
    }

    // Check Firestore settings if needed
    let tgSettings: any = null;
    try {
      const { adminDb } = await import('@/lib/firebase-admin');
      if (adminDb) {
        const settingsSnap = await adminDb.collection('settings').doc('shop').get();
        if (settingsSnap.exists) {
          const settings = settingsSnap.data();
          tgSettings = settings?.telegram || null;
          if (tgSettings) {
            if (!token && tgSettings.botToken) token = tgSettings.botToken;
            if (!chatId && tgSettings.chatId) chatId = tgSettings.chatId;

            // If not explicit test and disabled globally, skip
            if (action !== 'test' && tgSettings.enabled === false) {
              return NextResponse.json({ success: true, skipped: true, reason: 'Telegram disabled in settings' });
            }

            // Check granular notification toggles
            if (action === 'notify') {
              if (type === 'customer_create' && tgSettings.notifyOnCustomerCreate === false) return NextResponse.json({ success: true, skipped: true });
              if (type === 'sale' && tgSettings.notifyOnSale === false) return NextResponse.json({ success: true, skipped: true });
              if (type === 'payment' && tgSettings.notifyOnPayment === false) return NextResponse.json({ success: true, skipped: true });
              if (type === 'status_change' && tgSettings.notifyOnStatusChange === false) return NextResponse.json({ success: true, skipped: true });
              if (type === 'expense' && tgSettings.notifyOnExpense === false) return NextResponse.json({ success: true, skipped: true });
              if (type === 'low_stock' && tgSettings.notifyOnLowStock === false) return NextResponse.json({ success: true, skipped: true });
              if (type === 'attendance' && tgSettings.notifyOnAttendance === false) return NextResponse.json({ success: true, skipped: true });
              if (type === 'supplier' && tgSettings.notifyOnSupplier === false) return NextResponse.json({ success: true, skipped: true });
              if (type === 'security' && tgSettings.notifyOnSecurity === false) return NextResponse.json({ success: true, skipped: true });
              if (type === 'loan' && tgSettings.notifyOnLoan === false) return NextResponse.json({ success: true, skipped: true });
              if (type === 'backup' && tgSettings.notifyOnBackup === false) return NextResponse.json({ success: true, skipped: true });
            } else if (action === 'send_daily_summary') {
              if (tgSettings.notifyOnDailySummary === false) return NextResponse.json({ success: true, skipped: true });
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn('Could not read Telegram settings from Firestore:', dbErr);
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
    } else if (action === 'send_daily_summary') {
      const { executeDailySummary } = await import('@/app/api/cron/daily-summary/route');
      const todayStr = getTodayDhakaDateStr();
      const summaryResult = await executeDailySummary(todayStr);
      if (!summaryResult.success) {
        return NextResponse.json({ 
          success: false, 
          error: summaryResult.error || 'দৈনিক হিসাব বিবরণী পাঠানো যায়নি।' 
        }, { status: 400 });
      }
      return NextResponse.json({ success: true, messageId: summaryResult.messageId });
    } else if (action === 'notify') {
      if (type === 'customer_create') {
        const { customerName, phone, device, problem, advance, totalBill, isBillPending, staffName } = data || {};
        text = `📱 <b>নতুন কাস্টমার / সার্ভিস রিসিভ</b>\n\n` +
               `👤 <b>গ্রাহক:</b> ${customerName || 'N/A'}\n` +
               `📱 <b>মোবাইল:</b> ${phone || 'N/A'}\n` +
               (device ? `🛠️ <b>ডিভাইস:</b> ${device}\n` : '') +
               (problem ? `⚠️ <b>সমস্যা:</b> ${problem}\n` : '') +
               (advance > 0 ? `💵 <b>অগ্রিম জমা:</b> ${formatCurrency(advance)}\n` : '') +
               (!isBillPending && totalBill > 0 ? `💰 <b>মোট বিল:</b> ${formatCurrency(totalBill)}\n` : `⏳ <b>বিল স্ট্যাটাস:</b> চেক করে জানানো হবে (পেন্ডিং)\n`) +
               (staffName ? `👨‍🔧 <b>রিসিভ করেছেন:</b> ${staffName}\n` : '') +
               `\n🕒 <b>সময়:</b> ${formatNow()}`;
      } else if (type === 'sale') {
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
      } else if (type === 'status_change') {
        const { customerName, phone, device, status, due, totalBill, paid, reason, staffName } = data || {};
        if (status === 'Ready for Delivery') {
          text = `✅ <b>ডিভাইস প্রস্তুত (Ready for Delivery)</b>\n\n` +
                 `👤 <b>গ্রাহক:</b> ${customerName || 'N/A'}\n` +
                 `📱 <b>মোবাইল:</b> ${phone || 'N/A'}\n` +
                 (device ? `🛠️ <b>ডিভাইস:</b> ${device}\n` : '') +
                 (due > 0 ? `⚠️ <b>বকেয়া পাওনা:</b> ${formatCurrency(due)}\n` : `✅ <b>বিল স্ট্যাটাস:</b> সম্পূর্ণ পরিশোধিত\n`) +
                 (staffName ? `👨‍🔧 <b>মেরামতকারী:</b> ${staffName}\n` : '') +
                 `\n🕒 <b>সময়:</b> ${formatNow()}`;
        } else if (status === 'Delivered') {
          text = `🚚 <b>ডিভাইস ডেলিভারি সম্পন্ন (Delivered)</b>\n\n` +
                 `👤 <b>গ্রাহক:</b> ${customerName || 'N/A'}\n` +
                 `📱 <b>মোবাইল:</b> ${phone || 'N/A'}\n` +
                 (device ? `🛠️ <b>ডিভাইস:</b> ${device}\n` : '') +
                 (totalBill ? `💰 <b>মোট বিল:</b> ${formatCurrency(totalBill)}\n` : '') +
                 (paid ? `💵 <b>পরিশোধিত:</b> ${formatCurrency(paid)}\n` : '') +
                 (staffName ? `👨‍🔧 <b>ডেলিভারি দিয়েছেন:</b> ${staffName}\n` : '') +
                 `\n🕒 <b>সময়:</b> ${formatNow()}`;
        } else if (status === 'Returned (Unrepaired)') {
          text = `↩️ <b>ডিভাইস ফেরত প্রদান (মেরামত ছাড়া)</b>\n\n` +
                 `👤 <b>গ্রাহক:</b> ${customerName || 'N/A'}\n` +
                 `📱 <b>মোবাইল:</b> ${phone || 'N/A'}\n` +
                 (device ? `🛠️ <b>ডিভাইস:</b> ${device}\n` : '') +
                 (reason ? `📝 <b>কারণ:</b> ${reason}\n` : '') +
                 (staffName ? `👨‍🔧 <b>হ্যান্ডেল করেছেন:</b> ${staffName}\n` : '') +
                 `\n🕒 <b>সময়:</b> ${formatNow()}`;
        } else {
          text = `🔄 <b>ডিভাইস স্ট্যাটাস আপডেট: ${status}</b>\n\n` +
                 `👤 <b>গ্রাহক:</b> ${customerName || 'N/A'}\n` +
                 (device ? `🛠️ <b>ডিভাইস:</b> ${device}\n` : '') +
                 (staffName ? `👤 <b>আপডেট করেছেন:</b> ${staffName}\n` : '') +
                 `\n🕒 <b>সময়:</b> ${formatNow()}`;
        }
      } else if (type === 'attendance') {
        const { eventType, staffName, role, time, date, status, workingHours } = data || {};
        if (eventType === 'check_in') {
          text = `👨‍🔧 <b>স্টাফ উপস্থিতি: চেক-ইন (Check-in)</b>\n\n` +
                 `👤 <b>নাম:</b> ${staffName || 'Staff'} (${role || 'Technician'})\n` +
                 `⏰ <b>হাজিরার সময়:</b> ${time || ''}\n` +
                 `📍 <b>স্ট্যাটাস:</b> ${status === 'Late' ? '⚠️ দেরি (Late)' : '✅ সময়মতো (Present)'}\n` +
                 `📅 <b>তারিখ:</b> ${date || ''}\n` +
                 `\n🕒 <b>সময়:</b> ${formatNow()}`;
        } else {
          text = `🚪 <b>স্টাফ উপস্থিতি: চেক-আউট (Check-out)</b>\n\n` +
                 `👤 <b>নাম:</b> ${staffName || 'Staff'} (${role || 'Technician'})\n` +
                 `⏰ <b>প্রস্থানের সময়:</b> ${time || ''}\n` +
                 `⏱️ <b>মোট কাজের সময়:</b> ${workingHours || 'N/A'}\n` +
                 `📅 <b>তারিখ:</b> ${date || ''}\n` +
                 `\n🕒 <b>সময়:</b> ${formatNow()}`;
        }
      } else if (type === 'supplier') {
        const { eventType, supplierName, itemName, quantity, purchasePrice, totalAmount, amount, remainingDue, staffName } = data || {};
        if (eventType === 'restock') {
          text = `📦 <b>নতুন পার্টস স্টক-ইন (মহাজন ক্রয়)</b>\n\n` +
                 `🏢 <b>সাপ্লায়ার:</b> ${supplierName || 'N/A'}\n` +
                 (itemName ? `🔩 <b>পার্টস:</b> ${itemName} (${quantity || 1} টি)\n` : '') +
                 (purchasePrice ? `💵 <b>একক ক্রয়মূল্য:</b> ${formatCurrency(purchasePrice)}\n` : '') +
                 (totalAmount ? `💰 <b>মোট ইনভয়েস:</b> ${formatCurrency(totalAmount)}\n` : '') +
                 (staffName ? `👤 <b>স্টক-ইন করেছেন:</b> ${staffName}\n` : '') +
                 `\n🕒 <b>সময়:</b> ${formatNow()}`;
        } else {
          text = `💵 <b>সাপ্লায়ারকে পেমেন্ট পরিশোধ</b>\n\n` +
                 `🏢 <b>সাপ্লায়ার:</b> ${supplierName || 'N/A'}\n` +
                 `💵 <b>পরিশোধের পরিমাণ:</b> ${formatCurrency(amount)}\n` +
                 (remainingDue !== undefined ? `⚠️ <b>বর্তমান বকেয়া:</b> ${formatCurrency(remainingDue)}\n` : '') +
                 (staffName ? `👤 <b>পেমেন্ট দিয়েছেন:</b> ${staffName}\n` : '') +
                 `\n🕒 <b>সময়:</b> ${formatNow()}`;
        }
      } else if (type === 'security') {
        const { title, details, user: userIdentifier } = data || {};
        text = `🚨 <b>নিরাপত্তা ও অডিট সতর্কবার্তা (Security Alert)</b>\n\n` +
               `⚠️ <b>বিষয়:</b> ${title || 'সিস্টেম পরিবর্তন'}\n` +
               `📝 <b>বিবরণ:</b> ${details || 'N/A'}\n` +
               (userIdentifier ? `👤 <b>অ্যাকশন নিয়েছেন:</b> ${userIdentifier}\n` : '') +
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
      } else if (type === 'loan') {
        const { eventType, personName, phone, loanType, amount, paidAmount, remainingDue, paymentAmount, note, staffName } = data || {};
        const loanTypeLabel = loanType === 'Taken' ? 'ঋণ গ্রহণ (দেনা)' : 'ধার প্রদান (পাওনা)';

        if (eventType === 'new_loan') {
          text = `🤝 <b>নতুন ঋণ / ধার এন্ট্রি (Loan Recorded)</b>\n\n` +
                 `👤 <b>ব্যক্তি/প্রতিষ্ঠান:</b> ${personName || 'N/A'}\n` +
                 (phone ? `📱 <b>মোবাইল:</b> ${phone}\n` : '') +
                 `🔄 <b>লেনদেনের ধরন:</b> ${loanTypeLabel}\n` +
                 `💰 <b>টাকার পরিমাণ:</b> ${formatCurrency(amount)}\n` +
                 (note ? `📝 <b>নোট:</b> ${note}\n` : '') +
                 (staffName ? `👤 <b>এন্ট্রি করেছেন:</b> ${staffName}\n` : '') +
                 `\n🕒 <b>সময়:</b> ${formatNow()}`;
        } else if (eventType === 'payment') {
          const actionLabel = loanType === 'Taken' ? 'দেনা পরিশোধ' : 'পাওনা আদায়';
          text = `💵 <b>ধারের টাকা লেনদেন (${actionLabel})</b>\n\n` +
                 `👤 <b>ব্যক্তি:</b> ${personName || 'N/A'}\n` +
                 (phone ? `📱 <b>মোবাইল:</b> ${phone}\n` : '') +
                 `💸 <b>টাকার পরিমাণ:</b> ${formatCurrency(paymentAmount || 0)}\n` +
                 `📊 <b>মোট ঋণ হিসাব:</b> ${formatCurrency(amount || 0)}\n` +
                 `✅ <b>মোট পরিশোধিত:</b> ${formatCurrency(paidAmount || 0)}\n` +
                 (remainingDue !== undefined ? `⚠️ <b>অবশিষ্ট বাকি:</b> ${formatCurrency(remainingDue)}\n` : '') +
                 (note ? `📝 <b>নোট:</b> ${note}\n` : '') +
                 (staffName ? `👤 <b>হ্যান্ডেল করেছেন:</b> ${staffName}\n` : '') +
                 `\n🕒 <b>সময়:</b> ${formatNow()}`;
        } else {
          text = `✅ <b>ধার সম্পূর্ণ পরিশোধিত / ক্লোজড (Settled)</b>\n\n` +
                 `👤 <b>ব্যক্তি:</b> ${personName || 'N/A'}\n` +
                 (phone ? `📱 <b>মোবাইল:</b> ${phone}\n` : '') +
                 `🔄 <b>ধরন:</b> ${loanTypeLabel}\n` +
                 `💰 <b>সম্পূর্ণ পরিশোধিত:</b> ${formatCurrency(amount || 0)}\n` +
                 (staffName ? `👤 <b>সম্পন্ন করেছেন:</b> ${staffName}\n` : '') +
                 `\n🎉 এই ধার-দেনার হিসাব সফলভাবে সমাপ্ত হয়েছে।\n` +
                 `\n🕒 <b>সময়:</b> ${formatNow()}`;
        }
      } else if (type === 'backup') {
        const { status, email: targetEmail, filename, fileSize, shopName, error: errDetail } = data || {};
        if (status === 'success') {
          text = `💾 <b>অটো ডাটাবেস ব্যাকআপ সম্পন্ন (Backup Success)</b>\n\n` +
                 `✅ আপনার শপের সম্পূর্ণ ডাটাবেস ব্যাকআপ ফাইল সফলভাবে জিমেইলে পাঠানো হয়েছে।\n\n` +
                 (shopName ? `🏢 <b>দোকান:</b> ${shopName}\n` : '') +
                 `📧 <b>প্রাপক ইমেইল:</b> ${targetEmail || 'Owner Email'}\n` +
                 (filename ? `📁 <b>ফাইল:</b> <code>${filename}</code>\n` : '') +
                 (fileSize ? `📦 <b>ফাইলের আকার:</b> ${fileSize}\n` : '') +
                 `\n🔒 আপনার সকল কাস্টমার, স্টক ও হিসাবের ডাটা নিরাপদে সংরক্ষিত রয়েছে।\n` +
                 `\n🕒 <b>সময়:</b> ${formatNow()}`;
        } else {
          text = `🚨 <b>ডাটাবেস ব্যাকআপ ব্যর্থ (Backup Failed)</b>\n\n` +
                 `⚠️ আপনার শপের সাপ্তাহিক স্বয়ংক্রিয় ব্যাকআপ পাঠানো সম্ভব হয়নি।\n\n` +
                 `📝 <b>ত্রুটি:</b> ${errDetail || 'অজানা ত্রুটি'}\n` +
                 (targetEmail ? `📧 <b>টার্গেট ইমেইল:</b> ${targetEmail}\n` : '') +
                 `\nঅনুগ্রহ করে সেটিংস থেকে ইমেইল কনফিগারেশন চেক করুন।\n` +
                 `\n🕒 <b>সময়:</b> ${formatNow()}`;
        }
      } else {
        const { title, message } = data || {};
        text = `📢 <b>${title || 'অ্যাপ নোটিফিকেশন'}</b>\n\n` +
               `${message || ''}\n\n` +
               `🕒 <b>সময়:</b> ${formatNow()}`;
      }
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    // Dispatch to Telegram Bot API
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
        error: tgResult?.description || 'টেলিগ্রামে মেসেজ পাঠানো যায়নি।' 
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
