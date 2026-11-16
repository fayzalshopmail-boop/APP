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
      name: t('bottomNav.customers'),
      href: '/customers',
      icon: Users,
      isActive: pathname.startsWith('/customers')
    },
    {
      id: 'inventory',
      name: t('bottomNav.inventory'),
      href: '/inventory',
      icon: Boxes,
      isActive: pathname.startsWith('/inventory')
    },
    {
      id: 'profile',
      name: t('bottomNav.attendance'),
      href: '/staff',
      icon: UserCircle,
      isActive: pathname === '/staff'
    }
  ];

  return (
    <nav 
      aria-label="Technician Navigation"
      className="fixed bottom-3 left-4 right-4 sm:bottom-4 sm:left-auto sm:right-auto sm:w-full max-w-xs sm:max-w-sm mx-auto z-40 bg-[#0a0d18]/55 backdrop-blur-2xl backdrop-saturate-150 border border-white/12 rounded-full shadow-[0_12px_36px_rgba(0,0,0,0.5)] px-3 py-1.5 sm:px-4 sm:py-2 md:hidden select-none transition-all pb-[max(0.35rem,env(safe-area-inset-bottom,0px))]"
    >
      <div className="grid grid-cols-3 items-center gap-1">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.isActive;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-full transition-all duration-200 relative group min-w-0 active:scale-95 ${
                isActive ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all duration-200 ${
                isActive ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.3)]' : 'group-hover:bg-gray-800/40 text-gray-400'
              }`}>
                <Icon className="w-5 h-5 shrink-0" />
              </div>
              <span className="text-[10px] sm:text-[11px] mt-0.5 leading-tight tracking-tight text-center truncate max-w-full block">
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
