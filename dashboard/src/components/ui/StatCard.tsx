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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`bg-card rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start gap-3 sm:gap-4 border border-gray-800/50 hover:border-gray-700 transition-all relative ${href ? 'cursor-pointer hover:shadow-lg hover:shadow-blue-500/5 group' : ''}`}
    >
      <div className={`p-3 sm:p-4 rounded-xl flex items-center justify-center ${iconBgColor} ${iconColor} shrink-0 ${href ? 'group-hover:scale-105 transition-transform' : ''}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 w-full">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-gray-400 text-[10px] sm:text-sm font-medium uppercase tracking-wider truncate mr-2 group-hover:text-gray-300 transition-colors">{title}</h3>
          {headerAction && (
            <div className="shrink-0">
              {headerAction}
            </div>
          )}
        </div>
        <div className="text-xl sm:text-2xl font-bold text-white mb-0.5 sm:mb-1 truncate">{value}</div>
        <p className="text-[10px] sm:text-xs text-gray-500 truncate">{subtitle}</p>
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
