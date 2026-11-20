'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { userService } from '@/lib/services/user';
import { securitySettingsService } from '@/lib/services/securitySettings';
import { useAppStore } from '@/store/useAppStore';
import { AuthScreen } from './AuthScreen';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { TechnicianBottomNav } from '@/components/layout/TechnicianBottomNav';
import { OwnerBottomNav } from '@/components/layout/OwnerBottomNav';
import { shopSettingsService } from '@/lib/services/shopSettings';
import { dropdownConfigService } from '@/lib/services/dropdownConfig';
import { usePathname } from 'next/navigation';
import { AutoBackupTrigger } from './AutoBackupTrigger';
import { requestNotificationPermission } from '@/lib/services/fcm';
import { isPhoneDevice } from '@/lib/utils';
import { NavigationBackHandler } from '@/components/layout/NavigationBackHandler';
import { isVaultSessionValid, updateVaultActivity, clearVaultSession } from '@/lib/security';

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
  const [sessionChecking, setSessionChecking] = useState(true);
  const { isUnlocked, user, setShop, shop } = useAppStore();


  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    shopSettingsService.getSettings().then(setShop).catch(console.error);
    
    // Register PWA Service Worker for offline operation & background caching
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker active with scope:', reg.scope);
        })
        .catch((err) => {
          console.error('[PWA] Service Worker registration error:', err);
        });
    }

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

  // SEC-02: Cryptographic & Firestore Role Verification
  // Synchronizes client-side state with Firebase Authentication & Firestore users collection.
  // Prevents localStorage tampering (e.g. changing role to 'Owner' or bypassing lock).
  useEffect(() => {
    if (!auth) return;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser || !fbUser.email) {
        // Firebase has no active session. Never trust untrusted localStorage credentials!
        const currentUser = useAppStore.getState().user;
        if (currentUser) {
          useAppStore.getState().setUser(null);
          useAppStore.getState().setUnlocked(false);
        }
        return;
      }

      try {
        const normalizedEmail = fbUser.email.toLowerCase().trim();
        const dbUser = await userService.getUserByEmail(normalizedEmail);

        if (!dbUser || !dbUser.isActive) {
          console.warn('[Security] Unauthorized or inactive user detected:', normalizedEmail);
          if (auth) await signOut(auth);
          useAppStore.getState().setUser(null);
          useAppStore.getState().setUnlocked(false);
          return;
        }

        // Force overwrite store user with authenticated, verified Firestore record
        // This completely prevents client-side localStorage privilege escalation
        const verifiedUser = {
          name: dbUser.name,
          role: dbUser.role,
          avatar: dbUser.avatar || fbUser.photoURL || 'AD',
          email: normalizedEmail,
        };

        const storeUser = useAppStore.getState().user;
        if (
          !storeUser ||
          storeUser.role !== verifiedUser.role ||
          storeUser.email !== verifiedUser.email ||
          storeUser.name !== verifiedUser.name
        ) {
          useAppStore.getState().setUser(verifiedUser);
        }

        // For Owner and Manager, ensure PIN hash is synchronized from Firestore settings/security
        if (dbUser.role === 'Owner' || dbUser.role === 'Manager') {
          const remotePinHash = await securitySettingsService.getPinHash();
          if (remotePinHash) {
            useAppStore.getState().setPin(remotePinHash);
          } else {
            // Backward-compatible migration: If store has a valid 64-char hash, push it to Firestore
            const localPin = useAppStore.getState().pin;
            if (localPin && localPin.length === 64) {
              await securitySettingsService.savePinHash(localPin, normalizedEmail);
            }
          }
        }
      } catch (err) {
        console.error('[Security] Error verifying user authentication state:', err);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user && user.email) {
      requestNotificationPermission(user.email);
    }
  }, [user?.email]);

  // 1. Session Restoration on load / hard refresh
  useEffect(() => {
    let isCurrent = true;

    async function checkVaultSession() {
      if (typeof window === 'undefined') return;

      // Phone devices bypass vault lock completely
      if (isPhoneDevice()) {
        if (isCurrent) setSessionChecking(false);
        return;
      }

      // Check live session validity
      const currentPin = useAppStore.getState().pin;
      const autoLockMinutes = useAppStore.getState().shop?.autoLockMinutes ?? 5;

      if (currentPin) {
        try {
          const isValid = await isVaultSessionValid(currentPin, autoLockMinutes);
          if (isValid && isCurrent) {
            useAppStore.getState().setUnlocked(true);
          }
        } catch (err) {
          console.warn('[AutoLock] Error checking vault session:', err);
        }
      }

      if (isCurrent) {
        setSessionChecking(false);
      }
    }

    checkVaultSession();

    // Multi-tab sync: if another tab locks the vault, lock this tab immediately
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vsc_vault_unlocked' && !e.newValue) {
        useAppStore.getState().setUnlocked(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      isCurrent = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 2. Mobile automatic unlock
  useEffect(() => {
    if (mounted && user && isPhoneDevice() && !isUnlocked) {
      useAppStore.getState().setUnlocked(true);
    }
  }, [mounted, user, isUnlocked]);

  // 3. Idle Auto-Lock Listener for PC / Desktop
  useEffect(() => {
    if (!mounted || sessionChecking || !user || user.role !== 'Owner' || !isUnlocked || isPhoneDevice()) {
      return;
    }

    const autoLockMinutes = shop?.autoLockMinutes ?? 5;
    if (autoLockMinutes <= 0) {
      // 0 = Never / Manual lock only
      return;
    }

    let lastActivity = Date.now();
    let throttleTimer: NodeJS.Timeout | null = null;

    const handleUserActivity = () => {
      lastActivity = Date.now();
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          updateVaultActivity();
          throttleTimer = null;
        }, 3000); // Throttle writes
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    const timeoutMs = autoLockMinutes * 60 * 1000;
    const checkInterval = setInterval(() => {
      const idleTime = Date.now() - lastActivity;
      if (idleTime >= timeoutMs) {
        console.log(`[AutoLock] Idle timeout of ${autoLockMinutes}m reached. Locking screen.`);
        clearVaultSession();
        useAppStore.getState().setUnlocked(false);
      }
    }, 3000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      clearInterval(checkInterval);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [mounted, sessionChecking, user, isUnlocked, shop?.autoLockMinutes]);

  if (!mounted || sessionChecking) {
    // Prevent hydration mismatch while showing user an active loading state centered on screen
    return (
      <div className="fixed inset-0 z-50 min-h-screen w-full bg-[#0b0e14] flex flex-col items-center justify-center gap-3 text-gray-400">
        <div className="w-9 h-9 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs sm:text-sm text-gray-400 font-medium">অ্যাপ লোড হচ্ছে...</p>
      </div>
    );
  }

  const isPhone = isPhoneDevice();

  // Public Routes (Allow customer self-tracking without authentication or dashboard layout)
  if (pathname.startsWith('/track')) {
    return <div className="w-full min-h-screen flex flex-col flex-1">{children}</div>;
  }

  // If not logged in AT ALL, show AuthScreen (email/password login).
  // If Owner on PC/desktop is locked, show AuthScreen (Vault PIN).
  // On phone/mobile, the lock screen is bypassed.
  const requiresVaultLock = user?.role === 'Owner' && !isUnlocked && !isPhone;

  if (!user || requiresVaultLock) {
    return <AuthScreen />;
  }
  // Time-based access control for Technicians
  const currentHour = new Date().getHours();
  const isOutsideWorkingHours = currentHour < 9 || currentHour >= 23;
  
  if (user.role === 'Technician' && isOutsideWorkingHours) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center min-h-[100dvh] w-full text-center bg-background p-6">
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
  const technicianAllowedRoutes = ['/customers', '/inventory', '/staff'];
  const basePath = '/' + pathname.split('/')[1];
  const isTechnicianBlocked = user.role === 'Technician' && pathname !== '/' && !technicianAllowedRoutes.includes(basePath);

  if (isTechnicianBlocked) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center min-h-screen w-full text-center bg-background p-6">
        <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
        <p className="text-gray-500 mt-2">Technicians do not have access to this page.</p>
        <button onClick={() => window.location.href='/customers'} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Go Back</button>
      </div>
    );
  }

  const isTechnician = user?.role === 'Technician';

  return (
    <>
      <TitleUpdater title={shop?.shopName ? shop.shopName + ' Dashboard' : 'Shop Dashboard'} />
      <AutoBackupTrigger />
      <NavigationBackHandler />
      {!isTechnician && <Sidebar />}
      <div className={`flex-1 flex flex-col h-[100dvh] overflow-hidden transition-all duration-300 ${!isTechnician ? 'md:ml-64' : 'w-full'}`}>
        <Topbar />
        <main className={`flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 md:px-6 md:py-4 xl:py-4.5 ${isTechnician ? 'pb-24 md:pb-16' : 'pb-24 md:pb-5'}`}>
          <div className="max-w-[1600px] mx-auto w-full min-h-full flex flex-col items-stretch [&>*]:w-full">
            {children}
          </div>
        </main>
      </div>
      {isTechnician ? <TechnicianBottomNav /> : <OwnerBottomNav />}
    </>
  );
}














