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
  const pathname = usePathname();
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

  // Role based access control
  const technicianAllowedRoutes = ['/customers', '/inventory'];
  const basePath = '/' + pathname.split('/')[1];
  const isTechnicianBlocked = user.role === 'Technician' && pathname !== '/' && !technicianAllowedRoutes.includes(basePath);

  if (isTechnicianBlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center bg-background">
        <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
        <p className="text-gray-500 mt-2">Technicians do not have access to this page.</p>
        <button onClick={() => window.location.href='/customers'} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Go Back</button>
      </div>
    );
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














