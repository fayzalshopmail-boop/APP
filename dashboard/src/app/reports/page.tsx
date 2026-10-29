'use client';

import { useState, useEffect } from 'react';
import { FileText, TrendingUp, TrendingDown, Wallet, Package, Search, ArrowDownRight, Scale } from 'lucide-react';
import { transactionService, Transaction } from '@/lib/services/transaction';
import { expenseService, Expense } from '@/lib/services/expense';
import { customerService, Customer } from '@/lib/services/customer';
import { inventoryService, InventoryItem } from '@/lib/services/inventory';
import { formatCurrency } from '@/lib/currency';
import { PaginationControl } from '@/components/ui/PaginationControl';

type TimeFilter = 'today' | 'week' | 'month' | 'all';

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transData, expData, custData, invData] = await Promise.all([
        transactionService.getAll(),
        expenseService.getAll(),
        customerService.getAll(),
        inventoryService.getAll()
      ]);
      setTransactions(transData);
      setExpenses(expData);
      setCustomers(custData);
      setInventory(invData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter helpers
  const getFilterDate = (filter: TimeFilter) => {
    const now = new Date();
    if (filter === 'today') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }
    if (filter === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (filter === 'month') {
      // Calendar month start to match Dashboard and Expenses
      return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }
    return new Date(0); // all time
  };

  const filterDate = getFilterDate(timeFilter);

  const parseItemDate = (itemDate: any): Date => {
    if (!itemDate) return new Date(0);
    if (typeof itemDate === 'object' && 'seconds' in itemDate) {
      return new Date(itemDate.seconds * 1000);
    }
    if (itemDate instanceof Date) return itemDate;
    const parsed = new Date(itemDate);
    return isNaN(parsed.getTime()) ? new Date(0) : parsed;
  };

  const formatDateDisplay = (dateVal: any) => {
    if (!dateVal) return 'সদ্যকৃত';
    let d: Date;
    if (typeof dateVal === 'object' && 'seconds' in dateVal) {
      d = new Date(dateVal.seconds * 1000);
    } else if (dateVal instanceof Date) {
      d = dateVal;
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) return 'সদ্যকৃত';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const tDate = parseItemDate(t.createdAt);
    return tDate >= filterDate;
  });

  // Filter expenses
  const filteredExpenses = expenses.filter(e => {
    const eDate = parseItemDate(e.date);
    return eDate >= filterDate;
  });

  // Calculations
  const incomeTrans = filteredTransactions.filter(t => ['Advance Payment', 'Due Collection', 'Direct Sell'].includes(t.type));
  const outflowTrans = filteredTransactions.filter(t => ['Inventory Purchase', 'Supplier Payment', 'Mechanic Payment'].includes(t.type));
  const refundTrans = filteredTransactions.filter(t => t.type === 'Refund');

  const totalIncome = incomeTrans.reduce((acc, t) => acc + t.amount, 0);
  const totalOutflowTransactions = outflowTrans.reduce((acc, t) => acc + t.amount, 0);
  const totalRefunds = refundTrans.reduce((acc, t) => acc + t.amount, 0);
  
  const totalManualExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalExpenses = totalManualExpenses + totalOutflowTransactions;
  
  const netProfit = totalIncome - totalExpenses - totalRefunds;

  // All time stats & Comparison metrics
  const totalPendingDues = customers.reduce((acc, c) => acc + (c.due || 0), 0);
  const totalInventoryValue = inventory.reduce((acc, item) => acc + (item.stock * item.purchasePrice), 0);
  const totalTiedCapital = totalPendingDues + totalInventoryValue;
  const duesPercent = totalTiedCapital > 0 ? Math.round((totalPendingDues / totalTiedCapital) * 1000) / 10 : 0;
  const stockPercent = totalTiedCapital > 0 ? Math.round((100 - duesPercent) * 10) / 10 : 0;
  const dueCustomersCount = customers.filter(c => (c.due || 0) > 0).length;
  const inStockItemsCount = inventory.filter(i => (i.stock || 0) > 0).length;
  const duesToStockRatio = totalInventoryValue > 0 ? (totalPendingDues / totalInventoryValue).toFixed(1) : null;

  // Search filtered transactions for the ledger
  const searchLower = search.toLowerCase();
  const searchTransactions = filteredTransactions.filter(t => 
    (t.customerName || '').toLowerCase().includes(searchLower) || 
    (t.type || '').toLowerCase().includes(searchLower) ||
    (t.receivedBy || '').toLowerCase().includes(searchLower)
  );

  const totalPages = Math.ceil(searchTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = searchTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Top Header & Time Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-2 sm:mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            Financial Reports
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-0.5 sm:mt-1">
            দোকানের আয়, ব্যয়, মুনাফা ও লেনদেনের বিস্তারিত খতিয়ান
          </p>
        </div>
        
        {/* Full-width 4-tab bar on mobile, inline pill bar on desktop */}
        <div className="w-full sm:w-auto grid grid-cols-4 sm:flex bg-gray-800/60 p-1 rounded-xl border border-gray-700/80 shadow-sm">
          {(['today', 'week', 'month', 'all'] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => { setTimeFilter(f); setCurrentPage(1); }}
              className={`px-2.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all text-center ${
                timeFilter === f ? 'bg-blue-600 text-white shadow-md font-semibold' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {f === 'today' ? 'আজ' : f === 'week' ? '৭ দিন' : f === 'month' ? '১ মাস' : 'সব সময়'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* 4 Core Financial Stat Cards (Side-by-side: 2x2 grid on mobile, 4 columns on tablet & desktop) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            {/* Total Income */}
            <div className="bg-[#1a1d2d]/80 border border-emerald-500/25 hover:border-emerald-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 relative overflow-hidden group shadow-sm transition-all flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2 relative z-10">
                <span className="text-[11px] sm:text-xs font-semibold text-gray-400 truncate">Total Income</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="relative z-10">
                <div className="text-base sm:text-xl lg:text-2xl font-bold text-emerald-400 truncate tracking-tight leading-tight">
                  {formatCurrency(totalIncome)}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">
                  {incomeTrans.length} টি লেনদেন
                </p>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="bg-[#1a1d2d]/80 border border-red-500/25 hover:border-red-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 relative overflow-hidden group shadow-sm transition-all flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2 relative z-10">
                <span className="text-[11px] sm:text-xs font-semibold text-gray-400 truncate">Total Expenses</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 text-red-400">
                  <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="relative z-10">
                <div className="text-base sm:text-xl lg:text-2xl font-bold text-red-400 truncate tracking-tight leading-tight">
                  {formatCurrency(totalExpenses)}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">
                  {filteredExpenses.length} ম্যানুয়াল, {outflowTrans.length} অটো
                </p>
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-[#1a1d2d]/80 border border-blue-500/25 hover:border-blue-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 relative overflow-hidden group shadow-sm transition-all flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2 relative z-10">
                <span className="text-[11px] sm:text-xs font-semibold text-gray-400 truncate">Net Profit</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="relative z-10">
                <div className={`text-base sm:text-xl lg:text-2xl font-bold truncate tracking-tight leading-tight ${netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {formatCurrency(netProfit)}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">
                  ক্যাশ বেসিস মুনাফা
                </p>
              </div>
            </div>
            
            {/* Total Refunds */}
            <div className="bg-[#1a1d2d]/80 border border-orange-500/25 hover:border-orange-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 relative overflow-hidden group shadow-sm transition-all flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2 relative z-10">
                <span className="text-[11px] sm:text-xs font-semibold text-gray-400 truncate">Total Refunds</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 text-orange-400">
                  <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="relative z-10">
                <div className="text-base sm:text-xl lg:text-2xl font-bold text-orange-400 truncate tracking-tight leading-tight">
                  {formatCurrency(totalRefunds)}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">
                  {refundTrans.length} টি রিফান্ড
                </p>
              </div>
            </div>
          </div>

          {/* Business Insights: Compact Capital & Asset Comparison System */}
          <div className="mt-3 sm:mt-6 mb-2 sm:mb-4 bg-card/80 border border-gray-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-lg">
            {/* 1-Line Compact Header */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-6 h-6 rounded-md bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <Scale className="w-3.5 h-3.5 text-yellow-500" />
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-gray-200 truncate">
                  ক্যাপিটাল তুলনা <span className="text-gray-400 font-normal hidden sm:inline">(Assets Comparison)</span>
                </h2>
              </div>

              <div className="flex items-center gap-1 text-[11px] sm:text-xs bg-gray-800/80 px-2.5 py-1 rounded-lg border border-gray-700/60 shrink-0">
                <span className="text-gray-400">মোট:</span>
                <span className="font-bold text-white tracking-tight">{formatCurrency(totalTiedCapital)}</span>
              </div>
            </div>

            {/* Visual Comparison Dual-Color Balance Bar */}
            <div className="space-y-1 mb-2.5">
              <div className="w-full h-2 sm:h-2.5 bg-gray-900 rounded-full overflow-hidden flex border border-gray-800 shadow-inner">
                <div 
                  style={{ width: `${totalTiedCapital > 0 ? duesPercent : 50}%` }}
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-l-full transition-all duration-500"
                  title={`মার্কেট বাকি: ${formatCurrency(totalPendingDues)} (${duesPercent}%)`}
                />
                <div 
                  style={{ width: `${totalTiedCapital > 0 ? stockPercent : 50}%` }}
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-r-full transition-all duration-500"
                  title={`স্টক মালামাল: ${formatCurrency(totalInventoryValue)} (${stockPercent}%)`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-medium px-0.5">
                <span className="text-yellow-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block"></span>
                  মার্কেট বাকি {duesPercent}%
                </span>
                <span className="text-purple-400 flex items-center gap-1">
                  স্টক পণ্য {stockPercent}%
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"></span>
                </span>
              </div>
            </div>

            {/* 2 Compact Comparison Cards Side by Side */}
            <div className="grid grid-cols-2 gap-2">
              {/* Market Dues Card */}
              <div className="bg-[#1a1d2d]/80 border border-yellow-500/20 hover:border-yellow-500/40 rounded-lg sm:rounded-xl p-2 sm:p-3 relative overflow-hidden transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-[10px] sm:text-xs text-gray-400 font-medium truncate">মার্কেট বাকি</span>
                  <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-yellow-500/10 text-yellow-400 font-semibold shrink-0">
                    {duesPercent}%
                  </span>
                </div>
                <div>
                  <div className="text-sm sm:text-lg lg:text-xl font-bold text-yellow-500 truncate tracking-tight leading-tight">
                    {formatCurrency(totalPendingDues)}
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5 truncate">
                    {dueCustomersCount} জন কাস্টমার
                  </p>
                </div>
              </div>

              {/* Current Stock Value Card */}
              <div className="bg-[#1a1d2d]/80 border border-purple-500/20 hover:border-purple-500/40 rounded-lg sm:rounded-xl p-2 sm:p-3 relative overflow-hidden transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-[10px] sm:text-xs text-gray-400 font-medium truncate">স্টক পণ্য</span>
                  <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 font-semibold shrink-0">
                    {stockPercent}%
                  </span>
                </div>
                <div>
                  <div className="text-sm sm:text-lg lg:text-xl font-bold text-purple-400 truncate tracking-tight leading-tight">
                    {formatCurrency(totalInventoryValue)}
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5 truncate">
                    {inStockItemsCount} টি আইটেম
                  </p>
                </div>
              </div>
            </div>

            {/* Smart 1-Line Insight Strip */}
            {duesToStockRatio && (
              <div className="mt-2 pt-1.5 border-t border-gray-800/60 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-gray-400">
                <span className="text-yellow-400 shrink-0">💡</span>
                <span className="truncate">
                  {Number(duesToStockRatio) > 1 ? (
                    <>স্টক পণ্যের চেয়ে বাকি <strong className="text-yellow-400">{duesToStockRatio} গুণ</strong> বেশি (আদায়ে গুরুত্ব দিন)</>
                  ) : (
                    <>মার্কেট বাকির চেয়ে স্টকে পর্যাপ্ত পণ্য রয়েছে (<strong className="text-purple-400">{duesToStockRatio}x</strong>)</>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Transaction Ledger */}
          <div className="bg-card border border-gray-800 rounded-xl sm:rounded-2xl overflow-hidden mt-4 sm:mt-8 shadow-xl">
            {/* Header & Search Bar */}
            <div className="p-3 sm:p-4 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 bg-gray-900/40">
              <div className="flex items-center justify-between w-full sm:w-auto">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                    Transaction Ledger
                  </h2>
                  <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">মোট {searchTransactions.length} টি লেনদেন পাওয়া গেছে</p>
                </div>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="খুঁজুন (গ্রাহক, টাইপ, স্টাফ)..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-background/80 border border-gray-800 text-xs sm:text-sm text-gray-200 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>

            {searchTransactions.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-gray-500 text-xs sm:text-sm">
                এই সময়কালে কোন লেনদেন পাওয়া যায়নি।
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto relative">
                  <table className="w-full whitespace-nowrap text-sm">
                    <thead className="bg-background/50">
                      <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800/50">
                        <th className="px-6 py-4">তারিখ ও সময়</th>
                        <th className="px-6 py-4">গ্রাহক / বিবরণ</th>
                        <th className="px-6 py-4">ক্যাটাগরি</th>
                        <th className="px-6 py-4">টাকার পরিমাণ</th>
                        <th className="px-6 py-4">রিসিভার</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {paginatedTransactions.map((t) => {
                        const isExpense = ['Refund', 'Inventory Purchase', 'Supplier Payment', 'Mechanic Payment', 'Loan Repayment'].includes(t.type);
                        return (
                          <tr key={t.id} className="hover:bg-gray-800/20 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-400">
                              {formatDateDisplay(t.createdAt)}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-200">{t.customerName || 'সরাসরি লেনদেন'}</td>
                            <td className="px-6 py-4">
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                isExpense 
                                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {t.type}
                              </span>
                            </td>
                            <td className={`px-6 py-4 text-sm font-bold ${isExpense ? 'text-orange-400' : 'text-emerald-400'}`}>
                              {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-400">{t.receivedBy || 'Staff'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Banking Passbook Statement View */}
                <div className="md:hidden divide-y divide-gray-800/60">
                  {paginatedTransactions.map((t) => {
                    const isExpense = ['Refund', 'Inventory Purchase', 'Supplier Payment', 'Mechanic Payment', 'Loan Repayment'].includes(t.type);
                    const isRefund = t.type === 'Refund';
                    const dateFormatted = formatDateDisplay(t.createdAt);

                    return (
                      <div key={t.id} className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 hover:bg-gray-800/20 active:bg-gray-800/30 transition-colors">
                        {/* Direction & Status Icon */}
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isRefund
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : isExpense
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {isRefund ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : isExpense ? (
                            <TrendingDown className="w-4 h-4" />
                          ) : (
                            <TrendingUp className="w-4 h-4" />
                          )}
                        </div>

                        {/* Middle Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-100 text-xs sm:text-sm truncate">
                              {t.customerName || 'সরাসরি লেনদেন'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">
                            <span>{dateFormatted}</span>
                            {t.receivedBy && (
                              <>
                                <span>•</span>
                                <span className="text-gray-300 truncate">স্টাফ: {t.receivedBy}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right Amount & Category Tag */}
                        <div className="text-right shrink-0">
                          <div className={`text-xs sm:text-sm font-bold tabular-nums ${
                            isExpense ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                          </div>
                          <span className={`inline-block mt-0.5 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                            isRefund 
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                              : isExpense 
                              ? 'bg-orange-500/10 text-orange-300 border-orange-500/20' 
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          }`}>
                            {t.type}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="p-3 sm:p-4 border-t border-gray-800">
                  <PaginationControl
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={searchTransactions.length}
                    itemsPerPage={itemsPerPage}
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
