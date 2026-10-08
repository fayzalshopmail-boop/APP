'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { AuthScreen } from './AuthScreen';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { shopSettingsService } from '@/lib/services/shopSettings';
import { dropdownConfigService } from '@/lib/services/dropdownConfig';
import { usePathname } from 'next/navigation';
import { AutoBackupTrigger } from './AutoBackupTrigger';
import { requestNotificationPermission } from '@/lib/services/fcm';

function TitleUpdater({ title }: { title: string }) {
  const pathname = usePathname();
  useEffect(() => {
    document.title = title;
  }, [title, pathname]);
  return null;
}

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { isUnlocked, user, setShop, shop } = useAppStore();


  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    shopSettingsService.getSettings().then(setShop).catch(console.error);
    
    // Subscribe to dropdown changes from Firebase
    const unsubscribe = dropdownConfigService.subscribe((settings) => {
      useAppStore.setState({
        deviceTypes: settings.deviceTypes,
        deviceBrands: settings.deviceBrands,
        deviceProblems: settings.deviceProblems,
      });
    });
    
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user && user.email) {
      requestNotificationPermission(user.email);
    }
  }, [user?.email]);

  if (!mounted) {
    // Prevent hydration mismatch
    return <div className="min-h-screen bg-background" />;
  }

  // If not logged in AT ALL, or if Owner is locked, show AuthScreen
  if (!user || (user.role === 'Owner' && !isUnlocked)) {
    return <AuthScreen />;
  }

  return (
    <>
      <TitleUpdater title={shop?.shopName ? shop.shopName + ' Dashboard' : 'Shop Dashboard'} />
      <AutoBackupTrigger />
      <Sidebar />
      <div className={`flex-1 flex flex-col h-[100dvh] overflow-hidden transition-all duration-300 md:ml-64`}>
        <Topbar />
        <main className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}













