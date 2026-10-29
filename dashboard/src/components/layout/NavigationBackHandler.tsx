'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';

export const MORE_MENU_ROUTES = [
  '/loans',
  '/expenses',
  '/reports',
  '/suppliers',
  '/mechanics',
  '/loyalty',
  '/settings',
  '/sms'
];

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
      const isMenuPage = MORE_MENU_ROUTES.some(p => currentPath === p || currentPath.startsWith(p + '/'));
      const wasOpenedFromMenu = typeof window !== 'undefined' && sessionStorage.getItem('nav_opened_from_menu') === 'true';

      // 2. If More Menu drawer is currently open on mobile:
      // Rule 3: "menu asar por abar back korle dashboard a jabe"
      if (isMoreMenuOpenRef.current) {
        useAppStore.getState().setIsMoreMenuOpen(false);
        if (currentPath !== '/') {
          router.push('/');
        }
        return;
      }

      // 3. If currently on a page that was opened from the More menu:
      // Rule 2: "jodi kina seta menu theke open hoy menu theke hole menu te niye asbe"
      if (isMenuPage || wasOpenedFromMenu) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('nav_opened_from_menu');
        }
        router.push('/');
        setTimeout(() => {
          useAppStore.getState().setIsMoreMenuOpen(true);
        }, 50);
        return;
      }

      // 4. If on any other non-dashboard primary page (e.g. /customers, /inventory, /due):
      // Rule 1: "Back korle sorasori dash board a jabe"
      if (currentPath !== '/') {
        router.push('/');
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user?.role, router]);

  return null;
}
