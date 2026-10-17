'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Users, 
  Boxes, 
  UserCircle, 
  CalendarCheck, 
  LogOut, 
  Store, 
  ShieldCheck, 
  Mail,
  ChevronRight,
  Clock
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { auth } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function TechnicianBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser, setUnlocked, shop } = useAppStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // 3 Bottom Tabs: 1. Customer, 2. Inventory, 3. Profile (contains Attendance)
  const navTabs = [
    {
      id: 'customers',
      name: 'কাস্টমার',
      href: '/customers',
      icon: Users,
      match: pathname.startsWith('/customers')
    },
    {
      id: 'inventory',
      name: 'ইনভেন্টরি',
      href: '/inventory',
      icon: Boxes,
      match: pathname.startsWith('/inventory')
    },
    {
      id: 'profile',
      name: 'প্রোফাইল',
      isAction: true,
      icon: UserCircle,
      onClick: () => setIsProfileOpen(true),
      match: isProfileOpen || pathname === '/staff'
    }
  ];

  const handleLogout = async () => {
    const confirmed = window.confirm('আপনি কি নিশ্চিত যে অ্যাকাউন্ট থেকে লগআউট করতে চান?');
    if (!confirmed) return;

    try {
      setLoggingOut(true);
      if (auth) {
        await auth.signOut();
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setUnlocked(false);
      setIsProfileOpen(false);
      router.push('/');
    }
  };

  const handleGoToAttendance = () => {
    setIsProfileOpen(false);
    router.push('/staff');
  };

  return (
    <>
      {/* Fixed 3-Item Compact Bottom Navigation Bar for Technicians */}
      <nav 
        aria-label="Technician Navigation"
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f111a]/95 backdrop-blur-xl border-t border-gray-800/90 shadow-[0_-4px_16px_rgba(0,0,0,0.5)] px-3 py-0.5"
      >
        <div className="max-w-xs sm:max-w-sm mx-auto grid grid-cols-3 items-center">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.match;

            if (tab.isAction) {
              return (
                <button
                  key={tab.id}
                  onClick={tab.onClick}
                  className={`flex flex-col items-center justify-center py-1 px-1 transition-all duration-150 relative group select-none ${
                    isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className={`p-1 rounded-lg transition-all ${
                    isActive ? 'bg-blue-500/15 scale-105' : 'group-hover:bg-gray-800/40'
                  }`}>
                    <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <span className={`text-[10px] sm:text-[11px] mt-0.5 leading-none tracking-tight ${
                    isActive ? 'font-bold text-blue-400' : 'font-medium'
                  }`}>
                    {tab.name}
                  </span>
                  {isActive && (
                    <span className="absolute top-0 w-6 h-0.5 bg-blue-500 rounded-full" />
                  )}
                </button>
              );
            }

            return (
              <Link
                key={tab.id}
                href={tab.href || '#'}
                className={`flex flex-col items-center justify-center py-1 px-1 transition-all duration-150 relative group select-none ${
                  isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className={`p-1 rounded-lg transition-all ${
                  isActive ? 'bg-blue-500/15 scale-105' : 'group-hover:bg-gray-800/40'
                }`}>
                  <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                </div>
                <span className={`text-[10px] sm:text-[11px] mt-0.5 leading-none tracking-tight ${
                  isActive ? 'font-bold text-blue-400' : 'font-medium'
                }`}>
                  {tab.name}
                </span>
                {isActive && (
                  <span className="absolute top-0 w-6 h-0.5 bg-blue-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Technician Profile Modal with Attendance Option Inside */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="w-[92vw] max-w-sm bg-[#131724] border-gray-800 text-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20 text-white font-bold text-2xl">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'T'}
            </div>
            <DialogTitle className="text-lg font-bold text-white">
              {user?.name || 'টেকনিশিয়ান'}
            </DialogTitle>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold mx-auto mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>পদবী: টেকনিশিয়ান</span>
            </div>
          </DialogHeader>

          {/* 1. FEATURED: Attendance Option inside Profile */}
          <div className="py-2">
            <button
              onClick={handleGoToAttendance}
              className="w-full text-left p-3.5 bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-blue-600/10 hover:from-blue-600/25 hover:to-indigo-600/20 border border-blue-500/30 rounded-2xl transition-all flex items-center justify-between group shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0 group-hover:scale-105 transition-transform">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm flex items-center gap-1.5">
                    <span>হাজিরা ও কর্মঘণ্টা</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-[11px] text-gray-400">
                    আজকের উপস্থিতি দিন ও রেকর্ড দেখুন
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          </div>

          {/* 2. User & Shop Details Box */}
          <div className="space-y-2.5 py-1 text-xs">
            <div className="p-3 bg-[#181d2e] rounded-xl border border-gray-800 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-800/80 text-gray-400 shrink-0">
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">ইমেইল অ্যাকাউন্ট</div>
                <div className="text-gray-200 font-medium truncate">{user?.email || 'N/A'}</div>
              </div>
            </div>

            <div className="p-3 bg-[#181d2e] rounded-xl border border-gray-800 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-800/80 text-gray-400 shrink-0">
                <Store className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">দোকানের নাম</div>
                <div className="text-gray-200 font-medium truncate">{shop?.shopName || 'ViSC Shop'}</div>
              </div>
            </div>
          </div>

          {/* 3. Logout Action */}
          <div className="pt-2">
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full h-10 bg-red-600/90 hover:bg-red-600 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>{loggingOut ? 'লগআউট হচ্ছে...' : 'লগআউট করুন (Log Out)'}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
