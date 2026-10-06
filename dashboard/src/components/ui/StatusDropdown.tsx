'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertCircle, Settings2, CheckCircle, ChevronDown, XCircle, Lock } from 'lucide-react';
import { CustomerStatus } from '@/lib/services/customer';

interface StatusDropdownProps {
  status: CustomerStatus | undefined;
  onChange: (status: CustomerStatus) => void;
}

const STATUS_OPTIONS: CustomerStatus[] = ['Received', 'In Progress', 'Waiting for Parts', 'Ready for Delivery', 'Delivered', 'Returned (Unrepaired)'];

export function StatusDropdown({ status, onChange }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 192 });

  const calculatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 220; // Approximate height of the dropdown
      const spaceBelow = window.innerHeight - rect.bottom;
      
      let topPos = rect.bottom + window.scrollY + 8;
      
      // If not enough space below and enough space above, open upwards
      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        topPos = rect.top + window.scrollY - dropdownHeight - 8;
      }

      setDropdownPos({
        top: topPos,
        left: rect.right + window.scrollX - 192,
        width: 192
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close if clicking outside both the trigger button and the dropdown portal
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      if (!isOpen) return;
      requestAnimationFrame(calculatePosition);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen(!isOpen);
  };

  const getStatusConfig = (s?: CustomerStatus) => {
    switch (s) {
      case 'Received': return { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20', icon: <Clock className="w-3.5 h-3.5" /> };
      case 'In Progress': return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: <AlertCircle className="w-3.5 h-3.5" /> };
      case 'Waiting for Parts': return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', icon: <Settings2 className="w-3.5 h-3.5" /> };
      case 'Ready for Delivery': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: <CheckCircle className="w-3.5 h-3.5" /> };
      case 'Delivered': return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', icon: <CheckCircle className="w-3.5 h-3.5" /> };
      case 'Returned (Unrepaired)': return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', icon: <XCircle className="w-3.5 h-3.5" /> };
      default: return { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20', icon: <Clock className="w-3.5 h-3.5" /> };
    }
  };

  const currentConfig = getStatusConfig(status || 'Received');
  const isFinalState = status === 'Delivered' || status === 'Returned (Unrepaired)';

  return (
    <>
      <div className="relative inline-block" ref={containerRef}>
        <button
          type="button"
          onClick={() => {
            if (!isFinalState) toggleDropdown();
          }}
          disabled={isFinalState}
          title={isFinalState ? "Status locked (Cannot be changed)" : "Change status"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${currentConfig.bg} ${currentConfig.text} ${currentConfig.border} ${isFinalState ? 'cursor-not-allowed opacity-80 bg-opacity-50' : 'cursor-pointer hover:brightness-110'}`}
        >
          {currentConfig.icon}
          {status || 'Received'}
          {!isFinalState ? (
            <ChevronDown className={`w-3 h-3 opacity-50 ml-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          ) : (
            <Lock className="w-2.5 h-2.5 opacity-50 ml-0.5" />
          )}
        </button>
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ 
              position: 'absolute', 
              top: `${dropdownPos.top}px`, 
              left: `${dropdownPos.left}px`,
              width: `${dropdownPos.width}px`
            }}
            className="z-[9999] bg-popover border border-gray-800 rounded-lg shadow-xl shadow-blue-900/10 py-1"
          >
            {STATUS_OPTIONS.map((opt) => {
              const conf = getStatusConfig(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-secondary
                    ${status === opt ? 'bg-secondary font-medium' : 'text-gray-300'}`}
                >
                  <span className={`flex items-center justify-center w-5 h-5 rounded-md ${conf.bg} ${conf.text}`}>
                    {conf.icon}
                  </span>
                  {opt}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
