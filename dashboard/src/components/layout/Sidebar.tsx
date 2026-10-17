'use client';

import { useState, useEffect } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, Users, Box, Clock, CreditCard, Star, 
  Wrench, Truck, Receipt, BarChart2, Settings, MessageSquare, LogOut, Lock,
  WifiOff, RefreshCw, CalendarCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { auth } from '@/lib/firebase';
import { offlineSyncService } from '@/lib/services/offlineSync';

const navItemsAll = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Customer Details', href: '/customers', icon: Users },
  { name: 'Inventory', href: '/inventory', icon: Box },
  { name: 'Due', href: '/due', icon: Clock },
  { name: 'My Loans', href: '/loans', icon: CreditCard },
  { name: 'Loyalty', href: '/loyalty', icon: Star },
  { name: 'Mechanics (B2B)', href: '/mechanics', icon: Wrench },
  { name: 'Suppliers', href: '/suppliers', icon: Truck },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Reports', href: '/reports', icon: BarChart2 },
  { name: 'Shop Settings', href: '/settings', icon: Settings },
  { name: 'SMS Settings', href: '/sms', icon: MessageSquare },
];

const technicianNavItems = [
  { name: 'My Attendance', href: '/staff', icon: CalendarCheck },
  { name: 'Customer Details', href: '/customers', icon: Users },
  { name: 'Inventory', href: '/inventory', icon: Box },
];

export function Sidebar() {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser, setUnlocked, isSidebarOpen, toggleSidebar, setSidebarOpen, shop } = useAppStore();

  // Smart Offline/Online State
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    setPendingSyncCount(offlineSyncService.getPendingCount());

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleQueueUpdate = (e: any) => setPendingSyncCount(e.detail?.count ?? offlineSyncService.getPendingCount());
    const handleSyncStatus = (e: any) => setIsSyncing(!!e.detail?.syncing);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('app:offline-sync-queue-updated', handleQueueUpdate);
    window.addEventListener('app:sync-in-progress', handleSyncStatus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('app:offline-sync-queue-updated', handleQueueUpdate);
      window.removeEventListener('app:sync-in-progress', handleSyncStatus);
    };
  }, []);

  const handleLogoutRequest = () => setShowLogoutConfirm(true);

  const handleConfirmLogout = async () => {
    try {
      if (auth) {
        await auth.signOut();
      } } catch (err) {
        console.error("Firebase logout error:", err);
      }
      setUser(null);
      // We do not clear the PIN here so the Owner doesn't have to set it up again
      setUnlocked(false);
      router.push('/');
  };

  return (
    <>
      {/* Sidebar Content (Desktop Only) */}
      <aside 
        className="hidden md:flex w-64 h-screen bg-popover border-r border-gray-800 flex-col fixed left-0 top-0 z-50"
      >
      {/* Logo */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center overflow-hidden">
          {shop?.logoUrl ? (
            <img 
              src={shop.logoUrl} 
              alt={shop?.shopName || 'Logo'} 
              className="h-12 w-auto max-w-[170px] rounded-lg object-contain" 
            />
          ) : (
            <div className="text-blue-500 font-bold text-2xl tracking-wider flex items-center truncate">
              {shop?.shopName || 'ViSC'}
            </div>
          )}
        </div>
        {/* Smart Online/Offline Indicator */}
        {isSyncing ? (
          <div 
            className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 animate-pulse"
            title="অফলাইন ডাটা ক্লাউডে সিঙ্ক হচ্ছে..."
          >
            <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-400" />
            <span>সিঙ্ক হচ্ছে</span>
          </div>
        ) : isOnline ? (
          <div 
            className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0"
            title="ক্লাউড ডাটাবেজের সাথে সরাসরি সংযুক্ত"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>ONLINE</span>
          </div>
        ) : (
          <div 
            className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 cursor-help"
            title="ইন্টারনেট সংযোগ নেই। অফলাইন মোড সক্রিয়, সব কাজ লোকালি সেভ হচ্ছে।"
          >
            <WifiOff className="w-3 h-3 text-amber-400" />
            <span>{pendingSyncCount > 0 ? `অফলাইন (${pendingSyncCount})` : 'OFFLINE'}</span>
          </div>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
        {(user?.role === 'Technician' ? technicianNavItems : navItemsAll).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => {
                setSidebarOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-3.5 md:py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-blue-500/10 text-blue-400 border-l-2 border-blue-500" 
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-blue-400" : "text-gray-400")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 m-3 bg-secondary rounded-xl flex items-center gap-3 relative group">
        <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
          {user?.avatar?.startsWith('http') ? (
            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            user?.name?.charAt(0) || 'U'
          )}
        </div>
        <div className="flex-1 overflow-hidden pr-8">
          <div className="text-xs text-gray-400 font-medium">{user?.role}</div>
          <div className="text-sm text-gray-200 font-semibold truncate">{user?.name}</div>
          {user?.email && (
            <div className="text-[10px] text-gray-400 truncate" title={user.email}>
              {user.email}
            </div>
          )}
        </div>
        
        <div className="absolute right-2 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
          {user?.role === 'Owner' && (
            <button 
              onClick={() => setUnlocked(false)}
              className="text-gray-500 hover:text-orange-400 transition-colors bg-[#1b1f30] hover:bg-gray-800 p-1.5 rounded-lg"
              title="Lock Screen"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={handleLogoutRequest}
            className="text-gray-500 hover:text-red-400 transition-colors bg-[#1b1f30] hover:bg-gray-800 p-1.5 rounded-lg"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

      <ConfirmModal 
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        title="Log Out?"
        message="Are you sure you want to log out of your account? You will need your credentials and PIN to access the dashboard again."
        confirmText="Log Out"
        variant="warning"
      />
    </>
  );
}










