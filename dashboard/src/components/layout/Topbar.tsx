'use client';

import { Bell, Lock, Menu } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { usePathname } from 'next/navigation';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/customers': 'Customer Details',
  '/inventory': 'Inventory',
  '/due': 'Due',
  '/loans': 'My Loans',
  '/loyalty': 'Loyalty',
  '/mechanics': 'Mechanics (B2B)',
  '/suppliers': 'Suppliers',
  '/expenses': 'Expenses',
  '/reports': 'Reports',
  '/settings': 'Shop Settings',
  '/sms': 'SMS Settings',
};

export function Topbar() {
  const pathname = usePathname();
  const { setUnlocked, user, toggleSidebar } = useAppStore();
  
  const basePath = '/' + pathname.split('/')[1];
  const title = routeTitles[basePath] || routeTitles[pathname] || 'Dashboard';

  return (
    <header className="h-16 md:h-20 px-4 md:px-8 flex items-center justify-between bg-background sticky top-0 z-10 border-b border-gray-800 md:border-none">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="md:hidden w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-gray-400 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-white truncate max-w-[200px] md:max-w-none">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {user?.role === 'Owner' && (
          <button 
            onClick={() => setUnlocked(false)}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
            title="Lock Screen"
          >
            <Lock className="w-5 h-5" />
          </button>
        )}
        <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
