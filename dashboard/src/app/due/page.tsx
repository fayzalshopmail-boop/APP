'use client';

import { useState, useEffect } from 'react';
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
import { MobileDataCard } from '@/components/ui/MobileDataCard';
import toast from 'react-hot-toast';

export default function DuePage() {
  const { user } = useAppStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'overdue' | 'high'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchDues();
  }, []);

  const fetchDues = async () => {
    try {
      setLoading(true);
      const dueCustomers = await customerService.getWithDue();
      setCustomers(dueCustomers);
    } catch (error) {
      console.error("Failed to fetch dues", error);
    } finally {
      setLoading(false);
    }
  };

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
      toast.success('পেমেন্ট সফলভাবে সম্পন্ন হয়েছে!');
    } catch (err: any) {
      console.error("Payment error", err);
      toast.error(err.message || 'পেমেন্ট সম্পন্ন করতে সমস্যা হয়েছে');
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    const d = new Date(dueDate);
    d.setHours(23, 59, 59, 999);
    return d.getTime() < Date.now();
  };

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
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Coins className="w-6 h-6 text-orange-500" />
            Due Collection (বাকি খাতা)
          </h1>
          <p className="text-sm text-gray-400 mt-1">কাস্টমারদের বকেয়া টাকা আদায় ও পরবর্তী তাগাদার হিসাব</p>
        </div>
      </div>

      {/* 3-Card Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-orange-500/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">মোট বকেয়া (Total Due)</p>
              <h2 className="text-2xl font-bold text-orange-400">{formatCurrency(totalDues)}</h2>
              <p className="text-[11px] text-gray-500 mt-1">সর্বমোট বাজার বাকি</p>
            </div>
            <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20">
              <Coins className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-purple-500/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">বাকি থাকা কাস্টমার</p>
              <h2 className="text-2xl font-bold text-white">{customers.length} জন</h2>
              <p className="text-[11px] text-gray-500 mt-1">{highDueCount} জনের ৫০০৳+ বাকি</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
              <Phone className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-red-500/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">মেয়াদোত্তীর্ণ বাকি (Overdue)</p>
              <h2 className="text-2xl font-bold text-red-400">{overdueCount} জন</h2>
              <p className="text-[11px] text-gray-500 mt-1">তাগাদার তারিখ অতিক্রান্ত হয়েছে</p>
            </div>
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Chip Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              type="text" 
              placeholder="কাস্টমারের নাম বা ফোন নম্বর দিয়ে খুঁজুন..." 
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-background/50 h-10"
            />
          </div>
          <FilterChipBar
            filters={[
              { id: 'all', label: 'সকল বাকি', count: customers.length },
              { id: 'overdue', label: 'মেয়াদোত্তীর্ণ', count: overdueCount },
              { id: 'high', label: '≥ ৫০০৳ বাকি', count: highDueCount },
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
          <h3 className="text-lg font-semibold text-white mb-2">কোন বাকি পাওয়া যায়নি!</h3>
          <p className="text-gray-400 text-sm">সকল কাস্টমার তাদের বকেয়া পরিশোধ করেছেন অথবা সার্চ ফিল্টারে কোন তথ্য মেলেনি।</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto relative">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-gray-400 uppercase bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Customer</th>
                    <th className="px-6 py-4 font-semibold">Due Amount</th>
                    <th className="px-6 py-4 font-semibold">Due Date</th>
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
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
                            {new Date(c.dueDate).toLocaleDateString()}
                            {isOverdue(c.dueDate) && (
                              <span title="Overdue!"><AlertCircle className="w-3.5 h-3.5 ml-1 text-red-500" /></span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">Not specified</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          onClick={() => setPaymentModalCustomer(c)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
                        >
                          <ArrowUpRight className="w-4 h-4 mr-1" />
                          Collect
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {paginatedCustomers.map((c) => {
              const isOverdueItem = isOverdue(c.dueDate);
              return (
                <MobileDataCard key={c.id}>
                  <MobileDataCard.Header
                    title={c.name}
                    subtitle={c.phone}
                    badge={
                      isOverdueItem ? (
                        <span className="text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-medium">
                          মেয়াদোত্তীর্ণ
                        </span>
                      ) : (
                        <span className="text-[11px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-medium">
                          বাকি আছে
                        </span>
                      )
                    }
                  />
                  <MobileDataCard.Details>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>তাগাদার তারিখ:</span>
                      <span className={isOverdueItem ? 'text-red-400 font-bold' : 'text-gray-300'}>
                        {c.dueDate ? new Date(c.dueDate).toLocaleDateString() : 'নির্ধারিত নেই'}
                      </span>
                    </div>
                  </MobileDataCard.Details>
                  <MobileDataCard.FinancialStrip
                    items={[
                      { label: 'বকেয়া টাকা', value: formatCurrency(c.due), highlight: 'danger' },
                    ]}
                  />
                  <MobileDataCard.Actions>
                    <Button 
                      size="sm" 
                      onClick={() => setPaymentModalCustomer(c)} 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> জমা নিন (Collect)
                    </Button>
                    <a 
                      href={`tel:${c.phone}`} 
                      className="inline-flex items-center justify-center px-3 h-8 rounded-lg border border-gray-700 bg-secondary/50 text-gray-300 hover:text-white text-xs"
                    >
                      <Phone className="w-3.5 h-3.5 mr-1" /> কল
                    </a>
                  </MobileDataCard.Actions>
                </MobileDataCard>
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




