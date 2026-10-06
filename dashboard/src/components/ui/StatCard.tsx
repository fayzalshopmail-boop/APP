'use client';

import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  delay?: number;
  headerAction?: React.ReactNode;
}

export function StatCard({ title, value, subtitle, icon, iconBgColor, iconColor, delay = 0, headerAction }: StatCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-card rounded-2xl p-6 flex items-start gap-4 border border-gray-800/50 hover:border-gray-700 transition-colors relative"
    >
      <div className={`p-4 rounded-xl flex items-center justify-center ${iconBgColor} ${iconColor} shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider truncate mr-2">{title}</h3>
          {headerAction && (
            <div className="shrink-0">
              {headerAction}
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-white mb-1 truncate">{value}</div>
        <p className="text-xs text-gray-500 truncate">{subtitle}</p>
      </div>
    </motion.div>
  );
}
