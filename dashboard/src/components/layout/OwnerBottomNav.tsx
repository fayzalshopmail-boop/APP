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
import { auth } from '@/lib/firebase';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export function OwnerBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser, setUnlocked, shop, isMoreMenuOpen, setIsMoreMenuOpen } = useAppStore();
  const isMoreOpen = isMoreMenuOpen;
  const setIsMoreOpen = setIsMoreMenuOpen;
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleOpenMenuLink = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('nav_opened_from_menu', 'true');
    }
    setIsMoreMenuOpen(false);
  };

  const handlePrimaryTabClick = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('nav_opened_from_menu');
    }
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
      name: 'ড্যাশবোর্ড',
      href: '/',
      icon: Home,
      isActive: pathname === '/'
    },
    {
      id: 'customers',
      name: 'কাস্টমার',
      href: '/customers',
      icon: Users,
      isActive: pathname.startsWith('/customers')
    },
    {
      id: 'inventory',
      name: 'ইনভেন্টরি',
      href: '/inventory',
      icon: Box,
      isActive: pathname.startsWith('/inventory')
    },
    {
      id: 'due',
      name: 'বাকি খাতা',
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
        className="fixed bottom-3.5 left-4 right-4 sm:bottom-5 sm:left-6 sm:right-6 z-40 max-w-md mx-auto bg-[#0a0d18]/50 backdrop-blur-3xl backdrop-saturate-150 border border-white/15 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.65)] px-3 py-1.5 md:hidden select-none transition-all"
      >
        <div className="grid grid-cols-5 items-center gap-1">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.isActive;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={handlePrimaryTabClick}
                className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 relative group active:scale-95 ${
                  active ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all duration-200 ${
                  active ? 'bg-blue-500/20 text-blue-400 scale-105 shadow-[0_0_12px_rgba(59,130,246,0.25)]' : 'group-hover:bg-gray-800/40 text-gray-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 leading-none tracking-tight">
                  {tab.name}
                </span>
                {active && (
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-0.5 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                )}
              </Link>
            );
          })}

          {/* 5th Tab: "More / আরও" Button */}
          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 relative group active:scale-95 ${
              isMoreActive ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all duration-200 ${
              isMoreActive ? 'bg-blue-500/20 text-blue-400 scale-105 shadow-[0_0_12px_rgba(59,130,246,0.25)]' : 'group-hover:bg-gray-800/40 text-gray-400'
            }`}>
              <LayoutGrid className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 leading-none tracking-tight">
              মেনু
            </span>
            {isMoreActive && (
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-0.5 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
            )}
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
        className={`fixed bottom-0 left-0 right-0 z-50 bg-[#121523] border-t border-gray-800 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto md:hidden pb-8 will-change-transform ${
          isMoreOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!isMoreOpen}
      >
        {/* Grab Handle (Touch here and drag down to close) */}
        <div 
          className="pt-3.5 pb-2.5 px-12 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none w-full" 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleCloseMenu}
          title="নিচে টেনে বন্ধ করুন"
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
              <p className="text-xs text-gray-400">ব্যবসার অন্যান্য সব অপশন</p>
            </div>
          </div>
        </div>

        {/* Hub Sections */}
        <div className="px-5 py-4 space-y-5">
          
          {/* Section 1: Financial & Accounts */}
          <div>
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-400" />
              আর্থিক ও লাভ-ক্ষতি
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
                <span className="text-xs font-semibold">ঋণ (Loans)</span>
                <span className="text-[9px] text-gray-500 mt-0.5">লেনদেন ও হিসাব</span>
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
                <span className="text-xs font-semibold">খরচ (Expenses)</span>
                <span className="text-[9px] text-gray-500 mt-0.5">দৈনিক ব্যয়</span>
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
                <span className="text-xs font-semibold">রিপোর্ট (Reports)</span>
                <span className="text-[9px] text-gray-500 mt-0.5">লাভ-ক্ষতি ও সেলস</span>
              </Link>
            </div>
          </div>

          {/* Section 2: Partners & Supply */}
          <div>
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              সাপ্লায়ার ও পার্টনার
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
                <span className="text-xs font-semibold">সাপ্লায়ার্স</span>
                <span className="text-[9px] text-gray-500 mt-0.5">পার্টস ও ডিলার</span>
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
                <span className="text-xs font-semibold">মেকানিক্স (B2B)</span>
                <span className="text-[9px] text-gray-500 mt-0.5">বাহিরের কাজ</span>
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
                <span className="text-xs font-semibold">লয়ালটি (Loyalty)</span>
                <span className="text-[9px] text-gray-500 mt-0.5">কাস্টমার পয়েন্ট</span>
              </Link>
            </div>
          </div>

          {/* Section 3: Settings & Configuration */}
          <div>
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-purple-400" />
              কনফিগারেশন ও সেটিংস
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
                  <div className="text-xs font-semibold truncate">শপ সেটিংস</div>
                  <div className="text-[9px] text-gray-500 truncate">দোকানের নাম, ঠিকানা ও প্রিন্ট</div>
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
                  <div className="text-xs font-semibold truncate">এসএমএস সেটিংস</div>
                  <div className="text-[9px] text-gray-500 truncate">ব্যালেন্স ও অটো মেসেজ</div>
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
              <span>লগআউট (Logout)</span>
            </button>
          </div>

        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        title="লগআউট নিশ্চিত করুন"
        message="আপনি কি নিশ্চিত যে আপনার অ্যাকাউন্ট থেকে লগআউট করতে চান?"
        confirmText="লগআউট করুন"
      />
    </>
  );
}
