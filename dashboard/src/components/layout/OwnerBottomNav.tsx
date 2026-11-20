'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Users, 
  Box, 
  Clock, 
  LayoutGrid, 
  X, 
  CreditCard, 
  Receipt, 
  BarChart2, 
  Truck, 
  Wrench, 
  Star, 
  MessageSquare, 
  Settings, 
  LogOut,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { auth } from '@/lib/firebase';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export function OwnerBottomNav() {
  const { t, language } = useTranslation();
  const isBangla = language === 'bn';
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser, setUnlocked, shop, isMoreMenuOpen, setIsMoreMenuOpen } = useAppStore();
  const isMoreOpen = isMoreMenuOpen;
  const setIsMoreOpen = setIsMoreMenuOpen;
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleOpenMenuLink = () => {
    setIsMoreMenuOpen(false);
  };

  const handlePrimaryTabClick = () => {
    setIsMoreMenuOpen(false);
  };

  const handleCloseMenu = () => {
    setIsMoreMenuOpen(false);
    if (pathname !== '/') {
      router.push('/');
    }
  };

  // Touch Slide-to-Close Gestures (Only for Top Grab Handle)
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);
  const currentDragDiff = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    currentDragDiff.current = 0;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      currentDragDiff.current = diff;
      setDragOffset(diff);
    } else {
      currentDragDiff.current = 0;
      setDragOffset(0);
    }
  };

  const handleTouchEnd = () => {
    if (currentDragDiff.current > 60) {
      handleCloseMenu();
    }
    setIsDragging(false);
    setDragOffset(0);
    currentDragDiff.current = 0;
  };

  // Prevent background scrolling while More drawer is open on mobile
  useEffect(() => {
    if (isMoreOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isMoreOpen]);

  // List of paths that belong to the "More" menu
  const moreMenuPaths = [
    '/loans',
    '/expenses',
    '/reports',
    '/suppliers',
    '/mechanics',
    '/loyalty',
    '/sms',
    '/settings'
  ];

  const isMoreActive = isMoreOpen || moreMenuPaths.some(p => pathname === p || pathname.startsWith(p + '/'));

  // Core 4 Bottom Tabs
  const primaryTabs = [
    {
      id: 'dashboard',
      name: t('bottomNav.dashboard'),
      href: '/',
      icon: Home,
      isActive: pathname === '/'
    },
    {
      id: 'customers',
      name: t('bottomNav.customers'),
      href: '/customers',
      icon: Users,
      isActive: pathname.startsWith('/customers')
    },
    {
      id: 'inventory',
      name: t('bottomNav.inventory'),
      href: '/inventory',
      icon: Box,
      isActive: pathname.startsWith('/inventory')
    },
    {
      id: 'due',
      name: t('bottomNav.due'),
      href: '/due',
      icon: Clock,
      isActive: pathname.startsWith('/due')
    }
  ];

  const handleConfirmLogout = async () => {
    try {
      if (auth) {
        await auth.signOut();
      }
    } catch (err) {
      console.error("Firebase logout error:", err);
    }
    setUser(null);
    setUnlocked(false);
    setIsMoreOpen(false);
    setShowLogoutConfirm(false);
    router.push('/');
  };

  const handleNavigate = (href: string) => {
    setIsMoreOpen(false);
    router.push(href);
  };

  return (
    <>
      {/* iOS-Style Floating Bottom Navigation Bar for Owner/Manager (Mobile Only) */}
      <nav 
        aria-label="Owner Bottom Navigation"
        className="fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-auto sm:right-auto sm:w-full max-w-md mx-auto z-40 bg-[#0a0d18]/55 backdrop-blur-2xl backdrop-saturate-150 border border-white/12 rounded-full shadow-[0_12px_36px_rgba(0,0,0,0.5)] px-2 py-1.5 sm:px-3 sm:py-2 md:hidden select-none transition-all pb-[max(0.35rem,env(safe-area-inset-bottom,0px))]"
      >
        <div className="grid grid-cols-5 items-center gap-0.5 sm:gap-1">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.isActive;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={handlePrimaryTabClick}
                className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-full transition-all duration-200 relative group min-w-0 active:scale-95 ${
                  active ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all duration-200 ${
                  active ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.3)]' : 'group-hover:bg-gray-800/40 text-gray-400'
                }`}>
                  <Icon className="w-5 h-5 shrink-0" />
                </div>
                <span className="text-[10px] sm:text-[11px] mt-0.5 leading-tight tracking-tight text-center truncate max-w-full block">
                  {tab.name}
                </span>
              </Link>
            );
          })}

          {/* 5th Tab: "More / আরও" Button */}
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-full transition-all duration-200 relative group min-w-0 active:scale-95 ${
              isMoreActive ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all duration-200 ${
              isMoreActive ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.3)]' : 'group-hover:bg-gray-800/40 text-gray-400'
            }`}>
              <LayoutGrid className="w-5 h-5 shrink-0" />
            </div>
            <span className="text-[10px] sm:text-[11px] mt-0.5 leading-tight tracking-tight text-center truncate max-w-full block">
              {t('bottomNav.menu')}
            </span>
          </button>
        </div>
      </nav>

      {/* Quick Business Hub (Bottom Sheet Drawer) - Pre-rendered & GPU-Accelerated */}
      {/* Backdrop (Lightweight, zero shader blur overhead for 60fps response) */}
      <div 
        className={`fixed inset-0 bg-black/60 z-50 md:hidden transition-opacity duration-200 ease-out ${
          isMoreOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleCloseMenu}
        aria-hidden={!isMoreOpen}
      />

      {/* Bottom Sheet Modal */}
      <div 
        style={{
          transform: !isMoreOpen 
            ? 'translateY(100%)' 
            : dragOffset > 0 
              ? `translateY(${dragOffset}px)` 
              : 'translateY(0)',
          transition: isDragging ? 'none' : 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-[#121523] border-t border-gray-800 rounded-t-3xl shadow-2xl max-h-[85dvh] overflow-y-auto overscroll-contain md:hidden pb-8 will-change-transform ${
          isMoreOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!isMoreOpen}
      >
        {/* Grab Handle (Touch here and drag down to close) */}
        <div 
          role="button"
          tabIndex={0}
          aria-label={isBangla ? "মেনু বন্ধ করুন" : "Close menu"}
          className="pt-3.5 pb-2.5 px-12 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded-t-3xl" 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleCloseMenu}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
              e.preventDefault();
              handleCloseMenu();
            }
          }}
          title={isBangla ? "নিচে টেনে বন্ধ করুন" : "Drag down to close"}
        >
          <div className="w-14 h-1.5 bg-gray-500/80 hover:bg-gray-400 active:bg-gray-300 rounded-full transition-colors" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-3 border-b border-gray-800/80 select-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
              {shop?.shopName ? shop.shopName.charAt(0).toUpperCase() : 'V'}
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                {shop?.shopName || 'Shop Hub'}
              </h3>
              <p className="text-xs text-gray-400">
                {isBangla ? 'ব্যবসার অন্যান্য সব অপশন' : 'All other business options'}
              </p>
            </div>
          </div>
        </div>

        {/* Hub Sections */}
        <div className="px-5 py-4 space-y-5">
          
          {/* Section 1: Financial & Accounts */}
          <div>
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-400" />
              {isBangla ? 'আর্থিক ও লাভ-ক্ষতি' : 'Finance & Accounts'}
            </h4>
            <div className="grid grid-cols-3 gap-2.5">
              <Link
                href="/loans"
                onClick={handleOpenMenuLink}
                className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${
                  pathname.startsWith('/loans') 
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' 
                    : 'bg-[#181c2e] border-gray-800/80 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-1.5">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold">{t('nav.loans')}</span>
              </Link>

              <Link
                href="/expenses"
                onClick={handleOpenMenuLink}
                className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${
                  pathname.startsWith('/expenses') 
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' 
                    : 'bg-[#181c2e] border-gray-800/80 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-1.5">
                  <Receipt className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold">{t('nav.expenses')}</span>
              </Link>

              <Link
                href="/reports"
                onClick={handleOpenMenuLink}
                className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${
                  pathname.startsWith('/reports') 
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' 
                    : 'bg-[#181c2e] border-gray-800/80 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-1.5">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold">{t('nav.reports')}</span>
              </Link>
            </div>
          </div>

          {/* Section 2: Partners & Supply */}
          <div>
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              {t('nav.suppliers')} & {t('nav.mechanics')}
            </h4>
            <div className="grid grid-cols-3 gap-2.5">
              <Link
                href="/suppliers"
                onClick={handleOpenMenuLink}
                className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${
                  pathname.startsWith('/suppliers') 
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' 
                    : 'bg-[#181c2e] border-gray-800/80 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-1.5">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold">{t('nav.suppliers')}</span>
              </Link>

              <Link
                href="/mechanics"
                onClick={handleOpenMenuLink}
                className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${
                  pathname.startsWith('/mechanics') 
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' 
                    : 'bg-[#181c2e] border-gray-800/80 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-1.5">
                  <Wrench className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold">{t('nav.mechanics')}</span>
              </Link>

              <Link
                href="/loyalty"
                onClick={handleOpenMenuLink}
                className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${
                  pathname.startsWith('/loyalty') 
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' 
                    : 'bg-[#181c2e] border-gray-800/80 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 mb-1.5">
                  <Star className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold">{t('nav.loyalty')}</span>
              </Link>
            </div>
          </div>

          {/* Section 3: Settings & Configuration */}
          <div>
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-purple-400" />
              {t('nav.settings')}
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/settings"
                onClick={handleOpenMenuLink}
                className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                  pathname.startsWith('/settings') 
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' 
                    : 'bg-[#181c2e] border-gray-800/80 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Settings className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold truncate">{t('nav.settings')}</div>
                </div>
              </Link>

              <Link
                href="/sms"
                onClick={handleOpenMenuLink}
                className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                  pathname.startsWith('/sms') 
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' 
                    : 'bg-[#181c2e] border-gray-800/80 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold truncate">{t('nav.sms')}</div>
                </div>
              </Link>
            </div>
          </div>

          {/* User Profile Summary */}
          <div className="p-3 bg-[#181c2e] rounded-2xl border border-gray-800/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-white text-xs truncate">{user?.name} ({user?.role})</div>
                <div className="text-[10px] text-gray-400 truncate">{user?.email}</div>
              </div>
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold shrink-0 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              {shop?.shopName || 'Shop'}
            </div>
          </div>

          {/* Section 4: Security & Actions */}
          <div className="pt-2 border-t border-gray-800/80 flex items-center">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('nav.logout')}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        title={t('nav.logoutConfirmTitle')}
        message={t('nav.logoutConfirmMessage')}
        confirmText={t('nav.logoutButton')}
      />
    </>
  );
}
