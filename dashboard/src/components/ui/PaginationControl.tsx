'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (newPage: number) => void;
  itemLabel?: string;
  containerId?: string;
  className?: string;
}

export function PaginationControl({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  itemLabel = 'items',
  containerId,
  className = '',
}: PaginationControlProps) {
  const { t, language } = useTranslation();
  if (totalItems <= 0) return null;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const handlePageClick = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    onPageChange(page);
    if (containerId && typeof window !== 'undefined') {
      const el = document.getElementById(containerId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const getPageNumbers = (isMobile: boolean = false) => {
    if (isMobile) {
      if (totalPages <= 4) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }
      if (currentPage <= 2) {
        return [1, 2, 3, '...', totalPages];
      }
      if (currentPage >= totalPages - 1) {
        return [1, '...', totalPages - 2, totalPages - 1, totalPages];
      }
      return [1, '...', currentPage, '...', totalPages];
    }

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className={`border-t border-gray-800/80 bg-secondary/20 px-4 py-3 sm:px-5 sm:py-3.5 ${className}`}>
      {/* Desktop view */}
      <div className="hidden sm:flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {language === 'bn' ? (
            <>
              মোট <span className="font-semibold text-white">{totalItems}</span> টির মধ্যে{' '}
              <span className="font-semibold text-white">{startIndex + 1}</span> থেকে{' '}
              <span className="font-semibold text-white">{endIndex}</span> দেখানো হচ্ছে{' '}
              <span className="text-gray-500 ml-1.5">(পৃষ্ঠা {currentPage} / {totalPages})</span>
            </>
          ) : (
            <>
              Showing <span className="font-semibold text-white">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-white">{endIndex}</span> of{' '}
              <span className="font-semibold text-white">{totalItems}</span> {itemLabel}
              <span className="text-gray-500 ml-1.5">(Page {currentPage} of {totalPages})</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handlePageClick(currentPage - 1)}
            disabled={currentPage <= 1}
            className="h-8 w-8 inline-flex items-center justify-center bg-card border border-gray-800 text-gray-300 hover:text-white hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
            title={language === 'bn' ? 'পূর্ববর্তী পৃষ্ঠা' : 'Previous Page'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {getPageNumbers(false).map((pageNum, idx) => {
            if (pageNum === '...') {
              return (
                <span key={`desktop-ellipsis-${idx}`} className="px-1 text-gray-500 text-xs select-none">
                  ...
                </span>
              );
            }
            const page = Number(pageNum);
            const isActive = currentPage === page;
            return (
              <button
                key={`desktop-page-${page}`}
                type="button"
                onClick={() => handlePageClick(page)}
                className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                    : 'bg-card border border-gray-800 text-gray-300 hover:text-white hover:bg-secondary hover:border-gray-700'
                }`}
              >
                {page}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => handlePageClick(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="h-8 w-8 inline-flex items-center justify-center bg-card border border-gray-800 text-gray-300 hover:text-white hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
            title={language === 'bn' ? 'পরবর্তী পৃষ্ঠা' : 'Next Page'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile view */}
      <div className="sm:hidden flex flex-col items-center gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => handlePageClick(currentPage - 1)}
            disabled={currentPage <= 1}
            className="h-8 w-8 inline-flex items-center justify-center bg-card border border-gray-800 text-gray-300 hover:text-white hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
            title={language === 'bn' ? 'পূর্ববর্তী পৃষ্ঠা' : 'Previous Page'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {getPageNumbers(true).map((pageNum, idx) => {
            if (pageNum === '...') {
              return (
                <span key={`mobile-ellipsis-${idx}`} className="px-1 text-gray-500 text-xs select-none">
                  ...
                </span>
              );
            }
            const page = Number(pageNum);
            const isActive = currentPage === page;
            return (
              <button
                key={`mobile-page-${page}`}
                type="button"
                onClick={() => handlePageClick(page)}
                className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                    : 'bg-card border border-gray-800 text-gray-300 hover:text-white hover:bg-secondary hover:border-gray-700'
                }`}
              >
                {page}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => handlePageClick(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="h-8 w-8 inline-flex items-center justify-center bg-card border border-gray-800 text-gray-300 hover:text-white hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
            title={language === 'bn' ? 'পরবর্তী পৃষ্ঠা' : 'Next Page'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[11px] text-gray-400 text-center">
          {language === 'bn' ? (
            <>
              <span className="font-semibold text-white">{startIndex + 1}</span> -{' '}
              <span className="font-semibold text-white">{endIndex}</span> (মোট{' '}
              <span className="font-semibold text-white">{totalItems}</span> টি){' '}
              <span className="text-gray-500 ml-1">(পৃষ্ঠা {currentPage} / {totalPages})</span>
            </>
          ) : (
            <>
              Showing <span className="font-semibold text-white">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-white">{endIndex}</span> of{' '}
              <span className="font-semibold text-white">{totalItems}</span>
              <span className="text-gray-500 ml-1">(Page {currentPage} of {totalPages})</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
