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
  const isClosingModalRef = useRef(false);
  const lastModalClosedTimeRef = useRef(0);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    isMoreMenuOpenRef.current = isMoreMenuOpen;
  }, [isMoreMenuOpen]);

  // Intercept programmatic history.back() calls used by modal dismissal
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalBack = window.history.back.bind(window.history);
    window.history.back = function () {
      if (window.history.state?.modal) {
        isClosingModalRef.current = true;
        lastModalClosedTimeRef.current = Date.now();
      }
      return originalBack();
    };

    return () => {
      window.history.back = originalBack;
    };
  }, []);

  // Global popstate handler (Hardware Back Button / Android Gesture Back)
  useEffect(() => {
    if (user?.role === 'Technician') return;

    const handlePopState = (e: PopStateEvent) => {
      // 1. If programmatic modal close triggered this popstate
      if (isClosingModalRef.current || (Date.now() - lastModalClosedTimeRef.current < 500)) {
        isClosingModalRef.current = false;
        return;
      }

      // 2. If the arriving state still belongs to a modal
      if (e.state?.modal) return;

      // 3. If any modal/dialog/sidebar is currently open in the DOM, let the modal close and DO NOT navigate
      const activeModal = document.querySelector(
        '[role="dialog"], [aria-modal="true"], [data-state="open"]:not([data-radix-popper-content-wrapper]), .fixed.z-\\[100\\], .fixed.z-\\[101\\]'
      );
      if (activeModal) {
        lastModalClosedTimeRef.current = Date.now();
        const closeBtn = activeModal.querySelector(
          'button[aria-label="Close"], button[title="Cancel"], button[title="বাতিল"], button.dialog-close, button:has(svg.lucide-x)'
        );
        if (closeBtn instanceof HTMLElement) {
          closeBtn.click();
        } else {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        }
        return;
      }

      const currentPath = pathnameRef.current;

      // 4. If More Menu drawer is currently open on mobile, close it and stay on current page
      if (isMoreMenuOpenRef.current) {
        useAppStore.getState().setIsMoreMenuOpen(false);
        return;
      }

      // 5. From ANY subpage, only when genuinely navigating back (not inside a modal), go to Dashboard
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
