'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import toast from 'react-hot-toast';

export function AutoBackupTrigger() {
  const { user, shop, setShop } = useAppStore();
  const checkingRef = useRef(false);

  useEffect(() => {
    // Only run if shop is loaded and current user is an Owner or Manager
    if (!shop || checkingRef.current || (user?.role !== 'Owner' && user?.role !== 'Manager')) {
      return;
    }

    const checkAndRunBackup = async () => {
      checkingRef.current = true;
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

          // Dispatch to server backup route; server handles direct database fetch and emailing
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

    // Run after a short delay so it doesn't block initial UI rendering
    const timer = setTimeout(checkAndRunBackup, 12000); // 12 seconds delay
    return () => clearTimeout(timer);
  }, [user, shop, setShop]);

  return null; // Invisible background component
}
