'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { shopSettingsService } from '@/lib/services/shopSettings';
import { backupService } from '@/lib/services/backup';
import toast from 'react-hot-toast';

export function AutoBackupTrigger() {
  const { shop, setShop } = useAppStore();
  const checkingRef = useRef(false);

  useEffect(() => {
    // Only run if shop is loaded and we haven't already started checking
    if (!shop || checkingRef.current) return;

    const checkAndRunBackup = async () => {
      checkingRef.current = true;
      try {
        const now = Date.now();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const lastBackup = shop.lastAutoBackupDate || 0;

        // If it's been more than 7 days since last backup
        if (now - lastBackup >= SEVEN_DAYS_MS) {
          console.log('Initiating automated weekly backup...');
          
          // Generate the JSON string
          const jsonString = await backupService.generateFullBackupJSON();

          // Send to our email API route
          const response = await fetch('/api/cron/email-backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'fayzalahmedantor@gmail.com',
              password: 'gupm zcoq hrhs jrrd', // User's provided app password
              dataJSON: jsonString,
              shopName: shop.shopName || 'Shop'
            })
          });

          if (response.ok) {
            // Update the date in Firebase and local store
            const newShopSettings = { ...shop, lastAutoBackupDate: now };
            await shopSettingsService.saveSettings(newShopSettings);
            setShop(newShopSettings);
            toast.success('Weekly automatic backup sent to your email!', { duration: 5000 });
          } else {
            const err = await response.json();
            console.error('Failed to send backup email:', err);
          }
        }
      } catch (error) {
        console.error('Error during auto-backup process:', error);
      }
    };

    // Run after a short delay so it doesn't block initial UI rendering
    const timer = setTimeout(checkAndRunBackup, 10000); // 10 seconds delay
    return () => clearTimeout(timer);
  }, [shop, setShop]);

  return null; // Invisible component
}
