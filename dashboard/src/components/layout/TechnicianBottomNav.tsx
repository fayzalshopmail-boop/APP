'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Boxes, UserCircle } from 'lucide-react';

export function TechnicianBottomNav() {
  const pathname = usePathname();

  const navTabs = [
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
      icon: Boxes,
      isActive: pathname.startsWith('/inventory')
    },
    {
      id: 'profile',
      name: 'প্রোফাইল',
      href: '/staff',
      icon: UserCircle,
      isActive: pathname === '/staff'
    }
  ];

  return (
    <nav 
      aria-label="Technician Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f111a]/95 backdrop-blur-xl border-t border-gray-800/90 shadow-[0_-4px_16px_rgba(0,0,0,0.5)] px-3 py-1 md:hidden"
    >
      <div className="max-w-xs sm:max-w-sm mx-auto grid grid-cols-3 items-center">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.isActive;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-1 transition-all duration-150 relative group select-none ${
                isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${
                isActive ? 'bg-blue-500/15 scale-105' : 'group-hover:bg-gray-800/40'
              }`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
              </div>
              <span className={`text-[10px] sm:text-[11px] mt-0.5 leading-none tracking-tight ${
                isActive ? 'font-bold text-blue-400' : 'font-medium text-gray-400'
              }`}>
                {tab.name}
              </span>
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 bg-blue-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
