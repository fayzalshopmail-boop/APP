'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  delay?: number;
  headerAction?: React.ReactNode;
  href?: string;
}

export function StatCard({ title, value, subtitle, icon, iconBgColor, iconColor, delay = 0, headerAction, href }: StatCardProps) {
  const cardContent = (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`bg-card/90 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-gray-800/70 hover:border-gray-700 active:scale-[0.98] transition-all relative flex flex-col justify-between ${href ? 'cursor-pointer hover:shadow-lg hover:shadow-blue-500/5 group' : ''}`}
    >
      {/* Top Row: Title & Compact Icon Badge */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
        <h3 className="text-gray-400 text-[11px] sm:text-xs font-semibold tracking-wide truncate group-hover:text-gray-300 transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          {headerAction}
          <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center ${iconBgColor} ${iconColor} shrink-0 group-hover:scale-105 transition-transform [&>svg]:w-3.5 [&>svg]:h-3.5 sm:[&>svg]:w-4.5 sm:[&>svg]:h-4.5`}>
            {icon}
          </div>
        </div>
      </div>

      {/* Value & Subtitle */}
      <div>
        <div className="text-lg sm:text-2xl font-bold text-white tracking-tight truncate leading-tight">
          {value}
        </div>
        <p className="text-[10px] sm:text-xs text-gray-500 truncate mt-0.5">
          {subtitle}
        </p>
      </div>
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
