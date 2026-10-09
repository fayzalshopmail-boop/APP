'use client';

import { useState } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, Users, Box, Clock, CreditCard, Star, 
  Wrench, Truck, Receipt, BarChart2, Settings, MessageSquare, LogOut, Lock 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { auth } from '@/lib/firebase';

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

export function Sidebar() {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser, setUnlocked, isSidebarOpen, toggleSidebar, setSidebarOpen, shop } = useAppStore();

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
      {/* Mobile Overlay Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden" 
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Content */}
      <aside 
        className={cn(
          "w-64 h-screen bg-popover border-r border-gray-800 flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300",
          !isSidebarOpen ? "-translate-x-full md:translate-x-0" : "translate-x-0"
        )}
      >
      {/* Logo */}
      <div className="p-6 flex items-start justify-between">
        <div className="flex flex-col gap-2 overflow-hidden">
          {shop?.logoUrl ? (
            <img src={shop.logoUrl} alt="Logo" className="h-12 w-auto max-w-[180px] rounded-lg object-contain " />
          ) : (
            <div className="text-blue-500 font-bold text-2xl tracking-wider flex items-center truncate">
              {shop?.shopName || 'ViSC'}
            </div>
          )}
          {shop?.logoUrl && (
            <div className="text-white font-bold text-xl truncate">{shop.shopName}</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 mt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          ONLINE
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
        {navItemsAll.filter(item => user?.role === 'Technician' ? ['Customer Details', 'Inventory'].includes(item.name) : true).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={(e) => {
                if (window.innerWidth < 768) {
                  e.preventDefault();
                  setSidebarOpen(false);
                  setTimeout(() => {
                    router.push(item.href);
                  }, 200);
                } else {
                  setSidebarOpen(false);
                }
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










