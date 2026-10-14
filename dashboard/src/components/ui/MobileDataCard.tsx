'use client';

import React from 'react';
import { Phone } from 'lucide-react';

interface MobileDataCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function MobileDataCard({
  children,
  className = '',
  onClick,
}: MobileDataCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-card border border-gray-800/80 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3 hover:border-gray-700/80 transition-all ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface MobileDataCardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  phone?: string;
  date?: string;
  badge?: React.ReactNode;
  extra?: React.ReactNode;
  className?: string;
}

export function MobileDataCardHeader({
  title,
  subtitle,
  phone,
  date,
  badge,
  extra,
  className = '',
}: MobileDataCardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-2 ${className}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-white text-sm sm:text-base truncate">{title}</span>
          {badge}
        </div>
        {(subtitle || phone || date) && (
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1 flex-wrap">
            {subtitle && <span>{subtitle}</span>}
            {phone && (
              <a
                href={`tel:${phone}`}
                onClick={(e) => e.stopPropagation()}
                className="text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Phone className="w-3 h-3 text-blue-400" />
                <span>{phone}</span>
              </a>
            )}
            {date && <span>• {date}</span>}
          </div>
        )}
      </div>
      {extra && <div className="shrink-0">{extra}</div>}
    </div>
  );
}

interface MetricItem {
  label: string;
  value: React.ReactNode;
  colorClass?: string;
  highlight?: 'danger' | 'warning' | 'success' | 'info' | string;
}

interface MobileDataCardFinancialStripProps {
  metrics?: MetricItem[];
  items?: MetricItem[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function MobileDataCardFinancialStrip({
  metrics,
  items,
  columns,
  className = '',
}: MobileDataCardFinancialStripProps) {
  const list = metrics || items || [];
  const defaultCols = list.length === 2 ? 2 : list.length === 4 ? 4 : list.length === 1 ? 1 : 3;
  const colClass =
    (columns || defaultCols) === 2
      ? 'grid-cols-2'
      : (columns || defaultCols) === 4
      ? 'grid-cols-4'
      : (columns || defaultCols) === 1
      ? 'grid-cols-1'
      : 'grid-cols-3';

  const getColorClass = (item: MetricItem) => {
    if (item.colorClass) return item.colorClass;
    if (item.highlight === 'danger') return 'text-red-400';
    if (item.highlight === 'warning') return 'text-orange-400';
    if (item.highlight === 'success') return 'text-emerald-400';
    if (item.highlight === 'info') return 'text-blue-400';
    return 'text-white';
  };

  return (
    <div
      className={`bg-background/80 border border-gray-800/80 rounded-xl p-2.5 grid ${colClass} text-center gap-2 divide-x divide-gray-800/60 ${className}`}
    >
      {list.map((metric, idx) => (
        <div key={idx} className={idx > 0 && (columns || defaultCols) > 1 ? 'pl-2' : ''}>
          <div className="text-[10px] text-gray-400 font-medium tracking-tight mb-0.5">
            {metric.label}
          </div>
          <div
            className={`text-xs sm:text-sm font-bold truncate ${getColorClass(metric)}`}
          >
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
}

interface MobileDataCardDetailsProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileDataCardDetails({
  children,
  className = '',
}: MobileDataCardDetailsProps) {
  return (
    <div
      className={`bg-[#0e111d]/80 rounded-xl px-3 py-2 border border-gray-800/60 text-xs text-gray-300 flex items-center justify-between gap-2 ${className}`}
    >
      {children}
    </div>
  );
}

interface MobileDataCardActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileDataCardActions({
  children,
  className = '',
}: MobileDataCardActionsProps) {
  return (
    <div
      className={`flex items-center justify-end gap-2 pt-1 border-t border-gray-800/50 flex-wrap ${className}`}
    >
      {children}
    </div>
  );
}

MobileDataCard.Header = MobileDataCardHeader;
MobileDataCard.Details = MobileDataCardDetails;
MobileDataCard.FinancialStrip = MobileDataCardFinancialStrip;
MobileDataCard.Actions = MobileDataCardActions;
