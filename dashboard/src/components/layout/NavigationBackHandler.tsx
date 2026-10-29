'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';

export function NavigationBackHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isMoreMenuOpen } = useAppStore();
  const pathnameRef = useRef(pathname);
  const isMoreMenuOpenRef = useRef(isMoreMenuOpen);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    isMoreMenuOpenRef.current = isMoreMenuOpen;
  }, [isMoreMenuOpen]);

  // Global popstate handler (Hardware Back Button / Android Gesture Back)
  useEffect(() => {
    if (user?.role === 'Technician') return;

    const handlePopState = (e: PopStateEvent) => {
      // 1. If any active modal is handling popstate (e.g. CustomerModal), let modal handle it
      if (e.state?.modal) return;

      const currentPath = pathnameRef.current;

      // 2. If More Menu drawer is currently open on mobile, close it and go to Dashboard if not already there
      if (isMoreMenuOpenRef.current) {
        useAppStore.getState().setIsMoreMenuOpen(false);
        if (currentPath !== '/') {
          router.push('/');
        }
        return;
      }

      // 3. From ANY page (whether opened from menu popup or bottom bar), always go directly to Dashboard
      if (currentPath !== '/') {
        useAppStore.getState().setIsMoreMenuOpen(false);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('nav_opened_from_menu');
        }
        router.push('/');
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user?.role, router]);

  return null;
}
