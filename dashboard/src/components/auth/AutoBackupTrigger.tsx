'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import toast from 'react-hot-toast';

export function AutoBackupTrigger() {
  const { user, shop, setShop } = useAppStore();
  const checkingBackupRef = useRef(false);
  const checkingSummaryRef = useRef(false);

  useEffect(() => {
    // Only run if shop is loaded and current user is an Owner or Manager
    if (!shop || (user?.role !== 'Owner' && user?.role !== 'Manager')) {
      return;
    }

    // 1. Weekly Database Email Backup Check
    const checkAndRunBackup = async () => {
      if (checkingBackupRef.current) return;
      checkingBackupRef.current = true;
      try {
        const now = Date.now();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const lastBackup = shop.lastAutoBackupDate || 0;

        // If it's been more than 7 days since the last backup
        if (now - lastBackup >= SEVEN_DAYS_MS) {
          console.log('Initiating server-side automated weekly backup trigger...');
          
          const { auth } = await import('@/lib/firebase');
          const idToken = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
          if (!idToken) return;

          const response = await fetch('/api/cron/email-backup', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              shopName: shop.shopName || 'Shop'
            })
          });

          if (response.ok) {
            const newShopSettings = { ...shop, lastAutoBackupDate: now };
            setShop(newShopSettings);
            toast.success('সাপ্তাহিক অটোমেটিক ব্যাকআপ আপনার ইমেইলে পাঠানো হয়েছে!', { duration: 5000 });
          } else {
            const err = await response.json().catch(() => ({}));
            console.warn('Weekly backup notice:', err?.error || 'Backup pending');
          }
        }
      } catch (error) {
        console.error('Error during auto-backup trigger process:', error);
      }
    };

    // 2. Daily Summary Telegram Catch-Up Check
    // If midnight passed and yesterday's summary was never sent (e.g. server was sleeping/idle at 12 AM),
    // automatically trigger the summary now so the owner never misses their daily closing report!
    const checkAndRunDailySummaryCatchup = async () => {
      if (checkingSummaryRef.current) return;
      checkingSummaryRef.current = true;

      try {
        // Calculate yesterday's Dhaka date
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Dhaka',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(yesterday);

        const lastSummaryDate = shop.telegram?.lastAutoSummaryDate;
        
        // If yesterday's summary was not recorded as sent
        if (lastSummaryDate !== yesterdayStr) {
          const { auth } = await import('@/lib/firebase');
          const idToken = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
          if (!idToken) return;

          console.log(`[AutoSummaryCatchup] Yesterday's closing summary (${yesterdayStr}) pending. Triggering dispatch...`);
          const res = await fetch('/api/cron/daily-summary', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              forceDate: yesterdayStr
            })
          });

          if (res.ok) {
            const result = await res.json();
            if (result.success && !result.skipped) {
              console.log('[AutoSummaryCatchup] Successfully dispatched yesterday summary to Telegram!');
              const updatedShop = {
                ...shop,
                telegram: shop.telegram ? {
                  ...shop.telegram,
                  lastAutoSummaryDate: yesterdayStr
                } : undefined
              };
              setShop(updatedShop);
            }
          }
        }
      } catch (err) {
        console.warn('[AutoSummaryCatchup] Notice:', err);
      }
    };

    // Run after a short delay so it doesn't block initial UI rendering
    const timerBackup = setTimeout(checkAndRunBackup, 12000);
    const timerSummary = setTimeout(checkAndRunDailySummaryCatchup, 7000);

    return () => {
      clearTimeout(timerBackup);
      clearTimeout(timerSummary);
    };
  }, [user, shop, setShop]);

  return null; // Invisible background component
}
