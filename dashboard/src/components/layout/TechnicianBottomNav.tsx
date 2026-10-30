'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Boxes, UserCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export function TechnicianBottomNav() {
  const { t } = useTranslation();
  const pathname = usePathname();

  const navTabs = [
    {
      id: 'customers',
      name: t('nav.customers'),
      href: '/customers',
      icon: Users,
      isActive: pathname.startsWith('/customers')
    },
    {
      id: 'inventory',
      name: t('nav.inventory'),
      href: '/inventory',
      icon: Boxes,
      isActive: pathname.startsWith('/inventory')
    },
    {
      id: 'profile',
      name: t('nav.attendance'),
      href: '/staff',
      icon: UserCircle,
      isActive: pathname === '/staff'
    }
  ];

  return (
    <nav 
      aria-label="Technician Navigation"
      className="fixed bottom-3.5 left-6 right-6 sm:bottom-5 sm:left-8 sm:right-8 z-40 max-w-xs sm:max-w-sm mx-auto bg-[#0a0d18]/50 backdrop-blur-3xl backdrop-saturate-150 border border-white/15 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.65)] px-3 py-1.5 md:hidden select-none transition-all"
    >
      <div className="grid grid-cols-3 items-center gap-1">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.isActive;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 relative group active:scale-95 ${
                isActive ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all duration-200 ${
                isActive ? 'bg-blue-500/20 text-blue-400 scale-105 shadow-[0_0_12px_rgba(59,130,246,0.25)]' : 'group-hover:bg-gray-800/40 text-gray-400'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] sm:text-[11px] mt-0.5 leading-none tracking-tight`}>
                {tab.name}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-0.5 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
