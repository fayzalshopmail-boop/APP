'use client';

import React from 'react';

export interface FilterChip {
  id: string;
  label: string;
  count?: number;
  activeColorClass?: string;
  inactiveColorClass?: string;
}

interface FilterChipBarProps {
  chips: FilterChip[];
  activeChip: string;
  onSelectChip: (id: string) => void;
  className?: string;
}

export function FilterChipBar({
  chips,
  activeChip,
  onSelectChip,
  className = '',
}: FilterChipBarProps) {
  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0 w-full ${className}`}>
      {chips.map((chip) => {
        const isActive = activeChip === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onSelectChip(chip.id)}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 select-none ${
              isActive
                ? chip.activeColorClass || 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 font-semibold'
                : chip.inactiveColorClass || 'bg-card border border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700 hover:bg-secondary/40'
            }`}
          >
            <span>{chip.label}</span>
            {typeof chip.count === 'number' && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-800/80 text-gray-400 border border-gray-700/50'
                }`}
              >
                {chip.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
