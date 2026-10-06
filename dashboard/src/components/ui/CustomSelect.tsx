'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface SelectOption {
  label: string;
  value: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  icon?: React.ReactNode;
}

export function CustomSelect({ value, onChange, options, placeholder = "Select...", icon }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      if (!isOpen || !containerRef.current) return;
      
      // We use requestAnimationFrame to debounce and smoothly update the position
      requestAnimationFrame(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setCoords({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width
          });
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true); // true for capture to catch modal scrolling
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className={`w-full flex items-center justify-between bg-secondary border ${isOpen ? 'border-blue-500/50 ring-1 ring-blue-500/50' : 'border-gray-800'} text-gray-100 rounded-lg ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 text-sm focus:outline-none transition-all`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <div className="absolute left-3 text-gray-500">{icon}</div>}
          <span className={value ? 'text-gray-100' : 'text-gray-600'}>
            {
              value 
                ? (typeof options[0] === 'object' 
                    ? (options.find(o => typeof o !== 'string' && o.value === value) as SelectOption)?.label || value 
                    : value) 
                : placeholder
            }
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
      </button>

      {mounted && typeof document !== 'undefined' && createPortal(
        <div 
          ref={menuRef}
          style={{
            position: 'absolute',
            top: `${coords.top + 8}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 99999,
            pointerEvents: isOpen ? 'auto' : 'none'
          }}
        >
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="w-full bg-popover border border-gray-800 rounded-lg shadow-2xl shadow-black py-1 max-h-[220px] overflow-y-auto custom-scrollbar"
              >
                {options.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">No options available</div>
                ) : (
                  options.map((opt) => {
                    const optValue = typeof opt === 'string' ? opt : opt.value;
                    const optLabel = typeof opt === 'string' ? opt : opt.label;
                    return (
                    <button
                      key={optValue}
                      type="button"
                      onClick={() => {
                        onChange(optValue);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors
                        ${value === optValue 
                          ? 'bg-blue-500/10 text-blue-400 font-medium' 
                          : 'text-gray-300 hover:bg-secondary hover:text-white'
                        }`}
                    >
                      {optLabel}
                      {value === optValue && <Check className="w-4 h-4 text-blue-500" />}
                    </button>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </div>
  );
}
