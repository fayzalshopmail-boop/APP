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
  // Time-based access control for Technicians
  const currentHour = new Date().getHours();
  const isOutsideWorkingHours = currentHour < 9 || currentHour >= 23;
  
  if (user.role === 'Technician' && isOutsideWorkingHours) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] text-center bg-background p-6">
        <div className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">কাজের সময় শেষ! 😴</h2>
        <p className="text-gray-400 max-w-sm text-sm sm:text-base leading-relaxed">
          এখন বিশ্রামের সময়। প্রতিদিন সকাল ৯:০০ টা থেকে রাত ১১:০০ টা পর্যন্ত আপনি সিস্টেমে কাজ করতে পারবেন। আগামীকাল সকালে আবার দেখা হবে!
        </p>
        <button 
          onClick={() => {
            useAppStore.getState().setUser(null);
            window.location.reload();
          }} 
          className="mt-8 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          লগ আউট করুন
        </button>
      </div>
    );
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














