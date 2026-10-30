'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Customer, customerService } from '@/lib/services/customer';
import { shopTransactionService } from '@/lib/services/shopTransaction';
import { formatCurrency } from '@/lib/currency';
import { motion } from 'framer-motion';
import { Coins, Search, ArrowUpRight, Phone, Calendar, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PaymentModal } from '@/components/ui/PaymentModal';
import { PaginationControl } from '@/components/ui/PaginationControl';
import { FilterChipBar } from '@/components/ui/FilterChipBar';
import toast from 'react-hot-toast';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function DuePage() {
  const { user } = useAppStore();
  const { t, language } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'overdue' | 'high'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null);

  const fetchDues = useCallback(async () => {
    try {
      setLoading(true);
      const dueCustomers = await customerService.getWithDue();
      setCustomers(dueCustomers);
    } catch (error) {
      console.error("Failed to fetch dues", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDues();
  }, [fetchDues]);

  const handleReceivePayment = async (amount: number, nextDueDate?: string) => {
    if (!paymentModalCustomer) return;
    try {
      const result = await shopTransactionService.receivePayment(paymentModalCustomer.id, amount, user?.email || 'Unknown', nextDueDate);
      
      setCustomers(customers.map(c => {
        if (c.id === paymentModalCustomer.id) {
          return {
            ...c,
            advance: result.newAdvance,
            due: result.newDue,
            ...(result.newDue === 0 ? { dueDate: '' } : nextDueDate ? { dueDate: nextDueDate } : {})
          };
        }
        return c;
      }).filter(c => c.due > 0));
      
      setPaymentModalCustomer(null);
      toast.success(language === 'bn' ? 'পেমেন্ট সফলভাবে সম্পন্ন হয়েছে!' : 'Payment received successfully!');
    } catch (err: any) {
      console.error("Payment error", err);
      toast.error(err.message || (language === 'bn' ? 'পেমেন্ট সম্পন্ন করতে সমস্যা হয়েছে' : 'Failed to process payment'));
    }
  };

  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    setCurrentTime(Date.now());
  }, []);

  const isOverdue = useCallback((dueDate?: string) => {
    if (!dueDate || currentTime === 0) return false;
    const d = new Date(dueDate);
    d.setHours(23, 59, 59, 999);
    return d.getTime() < currentTime;
  }, [currentTime]);

  const totalDues = customers.reduce((sum, c) => sum + c.due, 0);
  const overdueCount = customers.filter(c => isOverdue(c.dueDate)).length;
  const highDueCount = customers.filter(c => c.due >= 500).length;

  const filteredCustomers = customers
    .filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm);
      if (!matchesSearch) return false;
      if (filterTab === 'overdue') return isOverdue(c.dueDate);
      if (filterTab === 'high') return c.due >= 500;
      return true;
    })
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleFilterChange = (id: string) => {
    setFilterTab(id as 'all' | 'overdue' | 'high');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300 pb-10 max-w-[1600px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
            {language === 'bn' ? 'বাকি খাতা (Due Collection)' : 'Due Collection'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">
            {language === 'bn' ? 'কাস্টমারদের বকেয়া টাকা আদায় ও পরবর্তী তাগাদার হিসাব' : 'Collect customer dues and manage payment schedules'}
          </p>
        </div>
      </div>

      {/* 3-Card Summary: Side-by-side 3 cols on mobile & desktop */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Total Due */}
        <div className="bg-card/90 border border-orange-500/20 hover:border-orange-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 relative overflow-hidden group shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 truncate">{language === 'bn' ? 'মোট বকেয়া' : 'Total Due'}</span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 bg-orange-500/10 rounded-lg sm:rounded-xl flex items-center justify-center border border-orange-500/20 text-orange-400 shrink-0">
              <Coins className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-2xl font-bold text-orange-400 tracking-tight leading-tight truncate">
              {formatCurrency(totalDues)}
            </div>
            <p className="text-[9px] sm:text-[11px] text-gray-500 mt-0.5 truncate hidden sm:block">
              {language === 'bn' ? 'সর্বমোট বাজার বাকি' : 'Total market due'}
            </p>
          </div>
        </div>

        {/* Due Customers Count */}
        <div className="bg-card/90 border border-purple-500/20 hover:border-purple-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 relative overflow-hidden group shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 truncate">{language === 'bn' ? 'বাকি কাস্টমার' : 'Due Customers'}</span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 bg-purple-500/10 rounded-lg sm:rounded-xl flex items-center justify-center border border-purple-500/20 text-purple-400 shrink-0">
              <Phone className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-2xl font-bold text-white tracking-tight leading-tight truncate">
              {customers.length} {language === 'bn' ? 'জন' : ''}
            </div>
            <p className="text-[9px] sm:text-[11px] text-gray-500 mt-0.5 truncate hidden sm:block">
              {highDueCount} {language === 'bn' ? 'জনের ৫০০৳+ বাকি' : 'with ≥ 500৳ due'}
            </p>
          </div>
        </div>

        {/* Overdue Count */}
        <div className="bg-card/90 border border-red-500/20 hover:border-red-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 relative overflow-hidden group shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 truncate">{language === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Overdue'}</span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 bg-red-500/10 rounded-lg sm:rounded-xl flex items-center justify-center border border-red-500/20 text-red-400 shrink-0">
              <AlertCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-2xl font-bold text-red-400 tracking-tight leading-tight truncate">
              {overdueCount} {language === 'bn' ? 'জন' : ''}
            </div>
            <p className="text-[9px] sm:text-[11px] text-gray-500 mt-0.5 truncate hidden sm:block">
              {language === 'bn' ? 'তাগাদার তারিখ পার হয়েছে' : 'Payment date passed'}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter Chip Bar */}
      <div className="bg-card/90 border border-gray-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-sm space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input 
              type="text" 
              placeholder={language === 'bn' ? 'কাস্টমারের নাম বা ফোন নম্বর...' : 'Customer name or phone number...'} 
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-popover/80 border-gray-800 h-9 sm:h-10 text-xs sm:text-sm rounded-xl focus:border-blue-500"
            />
          </div>
          <FilterChipBar
            filters={[
              { id: 'all', label: language === 'bn' ? 'সকল বাকি' : 'All Dues', count: customers.length },
              { id: 'overdue', label: language === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Overdue', count: overdueCount },
              { id: 'high', label: language === 'bn' ? '≥ ৫০০৳ বাকি' : '≥ 500৳ Due', count: highDueCount },
            ]}
            activeFilter={filterTab}
            onFilterChange={handleFilterChange}
          />
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
            <Coins className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {language === 'bn' ? 'কোন বাকি পাওয়া যায়নি!' : 'No dues found!'}
          </h3>
          <p className="text-gray-400 text-sm">
            {language === 'bn' ? 'সকল কাস্টমার তাদের বকেয়া পরিশোধ করেছেন অথবা সার্চ ফিল্টারে কোন তথ্য মেলেনি।' : 'All customers have cleared their dues or no matches found.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto relative">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-gray-400 uppercase bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">{language === 'bn' ? 'কাস্টমার' : 'Customer'}</th>
                    <th className="px-6 py-4 font-semibold">{language === 'bn' ? 'বকেয়ার পরিমাণ' : 'Due Amount'}</th>
                    <th className="px-6 py-4 font-semibold">{language === 'bn' ? 'তাগাদার তারিখ' : 'Due Date'}</th>
                    <th className="px-6 py-4 font-semibold text-right">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedCustomers.map((c, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      key={c.id} 
                      className="hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white mb-1">{c.name}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {c.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-orange-400 font-bold text-base">
                          {formatCurrency(c.due)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {c.dueDate ? (
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${
                            isOverdue(c.dueDate) ? 'text-red-400' : 'text-gray-300'
                          }`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(c.dueDate).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US')}
                            {isOverdue(c.dueDate) && (
                              <span title={language === 'bn' ? 'মেয়াদোত্তীর্ণ!' : 'Overdue!'}><AlertCircle className="w-3.5 h-3.5 ml-1 text-red-500" /></span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">{language === 'bn' ? 'নির্ধারিত নেই' : 'Not specified'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          onClick={() => setPaymentModalCustomer(c)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
                        >
                          <ArrowUpRight className="w-4 h-4 mr-1" />
                          {language === 'bn' ? 'জমা নিন' : 'Collect'}
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (Compact, Fast & Space-Efficient) */}
          <div className="md:hidden space-y-2.5">
            {paginatedCustomers.map((c) => {
              const isOverdueItem = isOverdue(c.dueDate);
              return (
                <div 
                  key={c.id} 
                  className="bg-card/90 border border-gray-800/90 rounded-xl p-3 shadow-sm hover:border-gray-700 transition-all space-y-2"
                >
                  {/* Top Row: Customer Info & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-100 text-sm truncate">
                        {c.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                        <Phone className="w-3 h-3 text-blue-400" />
                        <a 
                          href={`tel:${c.phone}`} 
                          className="hover:underline text-gray-300 font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.phone}
                        </a>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 border ${
                      isOverdueItem 
                        ? 'bg-red-500/10 text-red-400 border-red-500/25' 
                        : 'bg-orange-500/10 text-orange-400 border-orange-500/25'
                    }`}>
                      {isOverdueItem ? (language === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Overdue') : (language === 'bn' ? 'বাকি আছে' : 'Due')}
                    </span>
                  </div>

                  {/* Middle Info Strip: Due Amount & Due Date */}
                  <div className="flex items-center justify-between bg-[#121523]/80 px-2.5 py-1.5 rounded-lg border border-gray-800/60 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block">{language === 'bn' ? 'বকেয়া টাকা:' : 'Due Amount:'}</span>
                      <span className="text-sm font-bold text-orange-400">
                        {formatCurrency(c.due)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">{language === 'bn' ? 'তাগাদার তারিখ:' : 'Due Date:'}</span>
                      <span className={`text-[11px] font-medium flex items-center justify-end gap-1 ${
                        isOverdueItem ? 'text-red-400 font-bold' : 'text-gray-300'
                      }`}>
                        <Calendar className="w-3 h-3" />
                        {c.dueDate ? new Date(c.dueDate).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short' }) : (language === 'bn' ? 'নির্ধারিত নেই' : 'Not set')}
                      </span>
                    </div>
                  </div>

                  {/* Actions Row: Collect Payment + Call */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <Button 
                      size="sm" 
                      onClick={() => setPaymentModalCustomer(c)} 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7.5 rounded-lg shadow-sm font-medium"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'জমা নিন' : 'Collect'}
                    </Button>
                    <a 
                      href={`tel:${c.phone}`} 
                      className="inline-flex items-center justify-center px-3.5 h-7.5 rounded-lg border border-gray-700 bg-secondary/60 hover:bg-gray-800 text-gray-200 text-xs font-medium transition-colors"
                      title={language === 'bn' ? 'কল করুন' : 'Call'}
                    >
                      <Phone className="w-3.5 h-3.5 mr-1 text-blue-400" /> {language === 'bn' ? 'কল' : 'Call'}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <PaginationControl
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredCustomers.length}
            itemsPerPage={itemsPerPage}
          />
        </>
      )}

      <PaymentModal 
        isOpen={!!paymentModalCustomer}
        onClose={() => setPaymentModalCustomer(null)}
        customer={paymentModalCustomer}
        onSave={handleReceivePayment}
      />
    </div>
  );
}




