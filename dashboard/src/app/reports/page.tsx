'use client';

import { useState, useEffect } from 'react';
import { FileText, TrendingUp, TrendingDown, Wallet, DollarSign, Package, Calendar, Search, ArrowDownRight } from 'lucide-react';
import { transactionService, Transaction } from '@/lib/services/transaction';
import { expenseService, Expense } from '@/lib/services/expense';
import { customerService, Customer } from '@/lib/services/customer';
import { inventoryService, InventoryItem } from '@/lib/services/inventory';
import { formatCurrency } from '@/lib/currency';

type TimeFilter = 'today' | 'week' | 'month' | 'all';

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

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

  // Filter helpers
  const getFilterDate = (filter: TimeFilter) => {
    const now = new Date();
    if (filter === 'today') return new Date(now.setHours(0,0,0,0));
    if (filter === 'week') return new Date(now.setDate(now.getDate() - 7));
    if (filter === 'month') return new Date(now.setMonth(now.getMonth() - 1));
    return new Date(0); // all time
  };

  const filterDate = getFilterDate(timeFilter);

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    if (!t.createdAt) return true;
    const tDate = typeof t.createdAt === 'object' && 'seconds' in t.createdAt 
      ? new Date((t.createdAt as any).seconds * 1000) 
      : new Date();
    return tDate >= filterDate;
  });

  // Filter expenses
  const filteredExpenses = expenses.filter(e => {
    const eDate = new Date(e.date);
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

  // All time stats
  const totalPendingDues = customers.reduce((acc, c) => acc + (c.due || 0), 0);
  const totalInventoryValue = inventory.reduce((acc, item) => acc + (item.stock * item.purchasePrice), 0);

  // Search filtered transactions for the ledger
  const searchTransactions = filteredTransactions.filter(t => 
    t.customerName.toLowerCase().includes(search.toLowerCase()) || 
    t.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Profit & Loss Report</h1>
          <p className="text-gray-400 text-sm">Track your income, expenses, and overall business health.</p>
        </div>
        <div className="flex bg-gray-800/50 p-1 rounded-lg border border-gray-700">
          {(['today', 'week', 'month', 'all'] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                timeFilter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {f}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#1a1d2d]/50 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-400">Total Income</p>
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-emerald-400">{formatCurrency(totalIncome)}</h3>
              <p className="text-xs text-gray-500 mt-2">From {incomeTrans.length} transactions</p>
            </div>

            <div className="bg-[#1a1d2d]/50 border border-red-500/20 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-400">Total Expenses</p>
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-red-400">{formatCurrency(totalExpenses)}</h3>
              <p className="text-xs text-gray-500 mt-2">{filteredExpenses.length} manual, {outflowTrans.length} auto</p>
            </div>

            <div className="bg-[#1a1d2d]/50 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-400">Net Profit</p>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Wallet className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <h3 className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {formatCurrency(netProfit)}
              </h3>
              <p className="text-xs text-gray-500 mt-2">Income - Expenses (Cash Basis)</p>
            </div>
            
            <div className="bg-[#1a1d2d]/50 border border-orange-500/20 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-400">Total Refunds</p>
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <ArrowDownRight className="w-4 h-4 text-orange-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-orange-400">{formatCurrency(totalRefunds)}</h3>
              <p className="text-xs text-gray-500 mt-2">From {refundTrans.length} refunds</p>
            </div>
          </div>

          {/* Business Insights (All Time) */}
          <div className="mt-8 mb-4">
            <h2 className="text-lg font-semibold text-gray-200 mb-4">Business Insights (All Time)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-4 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                  <DollarSign className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Market Dues (Pabona)</p>
                  <h3 className="text-xl font-bold text-yellow-500">{formatCurrency(totalPendingDues)}</h3>
                </div>
              </div>
              <div className="bg-card border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-4 bg-purple-500/10 rounded-full border border-purple-500/20">
                  <Package className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">Current Inventory Value (Stock)</p>
                  <h3 className="text-xl font-bold text-purple-400">{formatCurrency(totalInventoryValue)}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Ledger */}
          <div className="bg-card border border-gray-800 rounded-2xl overflow-hidden mt-8">
            <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> Transaction Ledger
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search transactions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-background border border-gray-800 text-sm text-gray-200 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)] relative">
              <table className="w-full whitespace-nowrap">
                <thead className="bg-background/50">
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-800/50">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Customer/Details</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Receiver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {searchTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">No transactions found in this period.</td>
                    </tr>
                  ) : searchTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-800/20 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {t.createdAt && typeof t.createdAt === 'object' && 'seconds' in t.createdAt 
                          ? new Date((t.createdAt as any).seconds * 1000).toLocaleString() 
                          : 'Just now'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-200">{t.customerName}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          ['Refund', 'Inventory Purchase', 'Supplier Payment', 'Mechanic Payment'].includes(t.type) 
                          ? 'bg-orange-500/10 text-orange-400' 
                          : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold ${['Refund', 'Inventory Purchase', 'Supplier Payment', 'Mechanic Payment'].includes(t.type) ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {['Refund', 'Inventory Purchase', 'Supplier Payment', 'Mechanic Payment'].includes(t.type) ? '-' : '+'}{formatCurrency(t.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">{t.receivedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


