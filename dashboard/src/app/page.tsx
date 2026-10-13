'use client';

import { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Users, Coins, Tv, Wrench, Loader2, UserPlus, ShoppingCart, Receipt, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { QuickAlerts } from '@/components/ui/QuickAlerts';
import { RevenueChart } from '@/components/ui/RevenueChart';
import { RecentCustomers } from '@/components/ui/RecentCustomers';
import { customerService, Customer, normalizePhone } from '@/lib/services/customer';
import { transactionService, Transaction } from '@/lib/services/transaction';
import { formatCurrency } from '@/lib/currency';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Dashboard() {
  const { user, dashboardTimeFilter } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'Technician') {
      router.replace('/customers');
    }
  }, [user, router]);

  const timeFilter = dashboardTimeFilter;
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ 
    totalCustomers: 0, 
    totalJobs: 0,
    totalRevenue: 0, 
    pendingJobs: 0, 
    completedRepairs: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalPendingDues: 0
  });

  if (user?.role === 'Technician') return null;

  useEffect(() => {
        const loadAggregatedData = async () => {
      try {
        setIsLoading(true);
        const { collection, query, where, getCountFromServer, getAggregateFromServer, sum, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        let startDate = null;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (timeFilter === 'Today') startDate = startOfToday;
        else if (timeFilter === 'This Week') {
          const d = new Date(startOfToday);
          d.setDate(d.getDate() - d.getDay());
          startDate = d;
        }
        else if (timeFilter === 'This Month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        else if (timeFilter === 'This Year') startDate = new Date(now.getFullYear(), 0, 1);

        // 1. Prepare queries
        let qCustomers = collection(db, 'customers') as any;
        if (startDate) qCustomers = query(qCustomers, where('createdAt', '>=', startDate));

        let qTransactions = collection(db, 'transactions') as any;
        if (startDate) qTransactions = query(qTransactions, where('createdAt', '>=', startDate));

        let qExpenses = collection(db, 'expenses') as any;
        if (startDate) {
          const startDateStr = startDate.toISOString().split('T')[0];
          qExpenses = query(qExpenses, where('date', '>=', startDateStr));
        }

        const qDues = query(collection(db, 'customers'), where('due', '>', 0));
        const qPending = query(collection(db, 'customers'), where('status', 'in', ['Received', 'In Progress', 'Waiting for Parts']));
        const qCompleted = query(collection(db, 'customers'), where('status', 'in', ['Delivered', 'Ready for Delivery']));

        // Offline-resilient safe count helper (uses server when online, falls back to local cache when offline)
        const safeCount = async (q: any) => {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            const snap = await getDocs(q);
            return snap.size;
          }
          try {
            const countSnap = await getCountFromServer(q);
            return countSnap.data().count;
          } catch (e) {
            const snap = await getDocs(q);
            return snap.size;
          }
        };

        // Execute all aggregations and queries in parallel
        const [
          snapCustomers,
          docsSnap,
          snapExpenses,
          snapDues,
          pendingCount,
          completedResult
        ] = await Promise.all([
          getDocs(qCustomers),
          getDocs(qTransactions),
          getDocs(qExpenses),
          getDocs(qDues),
          safeCount(qPending),
          startDate ? getDocs(qCompleted) : safeCount(qCompleted)
        ]);

        // Process Customers (Deduplicate by phone to match customers page)
        const uniqueCustomerKeys = new Set<string>();
        let totalCustomerJobs = 0;
        snapCustomers.forEach((doc: any) => {
          const data = doc.data();
          const key = normalizePhone(data.phone) || doc.id;
          uniqueCustomerKeys.add(key);
          totalCustomerJobs += 1;

          if (startDate) {
            if (Array.isArray(data.repairHistory)) {
              data.repairHistory.forEach((rec: any) => {
                let recDate = null;
                if (rec.createdAt?.toDate) recDate = rec.createdAt.toDate();
                else if (rec.createdAt?.seconds) recDate = new Date(rec.createdAt.seconds * 1000);
                else if (rec.createdAt) recDate = new Date(rec.createdAt);
                if (recDate && !isNaN(recDate.getTime()) && recDate >= startDate) {
                  totalCustomerJobs += 1;
                }
              });
            }
          } else {
            const historyCount = Array.isArray(data.repairHistory) ? data.repairHistory.length : 0;
            totalCustomerJobs += historyCount;
          }
        });
        const customersCount = uniqueCustomerKeys.size;

        // Process Transactions (Revenue & Outflows)
        let totalRevenue = 0;
        let outflowTransactions = 0;
        docsSnap.forEach(doc => {
          const data = doc.data() as any;
          if (['Advance Payment', 'Due Collection', 'Direct Sell'].includes(data.type)) {
            totalRevenue += Number(data.amount) || 0;
          } else if (data.type === 'Refund') {
            totalRevenue -= Number(data.amount) || 0;
          } else if (['Inventory Purchase', 'Supplier Payment', 'Mechanic Payment'].includes(data.type)) {
            outflowTransactions += Number(data.amount) || 0;
          }
        });

        // Process Expenses
        let totalManualExpenses = 0;
        snapExpenses.forEach(doc => {
          const data = doc.data() as any;
          if (!startDate) {
            totalManualExpenses += Number(data.amount) || 0;
          } else {
            const expDate = data.date ? new Date(data.date) : data.createdAt?.toDate ? data.createdAt.toDate() : null;
            if (expDate && expDate >= startDate) {
              totalManualExpenses += Number(data.amount) || 0;
            }
          }
        });
        const totalExpenses = totalManualExpenses + outflowTransactions;
        const netProfit = totalRevenue - totalExpenses;

        // Process Shop-wide Pending Dues
        let totalPendingDues = 0;
        snapDues.forEach(doc => {
          totalPendingDues += Number(doc.data().due) || 0;
        });

        // Process Completed Repairs
        let completedCount = 0;
        if (startDate) {
           (completedResult as any).forEach((doc: any) => {
              const d = doc.data();
              const dateToUse = d.completedAt || d.deliveredAt || d.updatedAt || d.createdAt;
              let dateObj = null;
              if (dateToUse?.toDate) dateObj = dateToUse.toDate();
              else if (dateToUse?.seconds) dateObj = new Date(dateToUse.seconds * 1000);
              else if (dateToUse) dateObj = new Date(dateToUse);
              if (dateObj && !isNaN(dateObj.getTime()) && dateObj >= startDate) completedCount++;
           });
        } else {
           completedCount = typeof completedResult === 'number' ? completedResult : (completedResult as any).data().count;
        }

        setStats({
           totalCustomers: customersCount,
           totalJobs: totalCustomerJobs,
           totalRevenue: totalRevenue,
           pendingJobs: pendingCount,
           completedRepairs: completedCount,
           totalExpenses: totalExpenses,
           netProfit: netProfit,
           totalPendingDues: totalPendingDues
        });

      } catch (err) {
        console.error("Failed to load dashboard aggregations", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAggregatedData();

    // Auto-refresh when tab gains focus, on app refresh, or when reconnected online
    const handleRefresh = () => {
      loadAggregatedData();
    };
    window.addEventListener('focus', handleRefresh);
    window.addEventListener('online', handleRefresh);
    window.addEventListener('app:refresh-dashboard', handleRefresh);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('online', handleRefresh);
      window.removeEventListener('app:refresh-dashboard', handleRefresh);
    };
  }, [timeFilter]);

  const filteredStats = stats;

return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* 4 Core StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard 
          title="মোট কাস্টমার" 
          value={isLoading ? '...' : filteredStats.totalCustomers.toString()} 
          subtitle={
            timeFilter === 'Today' 
              ? 'আজকের কাস্টমার' 
              : timeFilter === 'This Week' 
              ? 'এই সপ্তাহের কাস্টমার' 
              : timeFilter === 'This Month' 
              ? 'এই মাসের কাস্টমার' 
              : timeFilter === 'This Year' 
              ? 'এই বছরের কাস্টমার' 
              : 'সর্বমোট কাস্টমার'
          } 
          icon={<Users className="w-5 h-5 text-blue-500" />} 
          iconBgColor="bg-blue-500/10" 
          iconColor="text-blue-500" 
          delay={0.1} 
          href="/customers"
        />
        <StatCard 
          title="সংগৃহীত রাজস্ব" 
          value={isLoading ? '...' : formatCurrency(filteredStats.totalRevenue)} 
          subtitle={timeFilter === 'Today' ? 'আজকের নেট আদায়' : timeFilter === 'This Week' ? 'সাপ্তাহিক নেট আদায়' : timeFilter === 'This Month' ? 'মাসিক নেট আদায়' : 'মোট নেট আদায়'} 
          icon={<Coins className="w-5 h-5 text-emerald-500" />} 
          iconBgColor="bg-emerald-500/10" 
          iconColor="text-emerald-500" 
          delay={0.2} 
          href="/reports"
        />
        <StatCard 
          title="পেন্ডিং কাজ" 
          value={isLoading ? '...' : filteredStats.pendingJobs.toString()} 
          subtitle="চলমান মেরামত কাজ" 
          icon={<Tv className="w-5 h-5 text-orange-500" />} 
          iconBgColor="bg-orange-500/10" 
          iconColor="text-orange-500" 
          delay={0.3} 
          href="/customers?status=Pending"
        />
        <StatCard 
          title="সম্পন্ন মেরামত" 
          value={isLoading ? '...' : filteredStats.completedRepairs.toString()} 
          subtitle={timeFilter === 'Today' ? 'আজকের ডেলিভারি' : timeFilter === 'This Week' ? 'এই সপ্তাহের ডেলিভারি' : timeFilter === 'This Month' ? 'এই মাসের ডেলিভারি' : 'সর্বমোট সম্পন্ন'} 
          icon={<Wrench className="w-5 h-5 text-purple-500" />} 
          iconBgColor="bg-purple-500/10" 
          iconColor="text-purple-500" 
          delay={0.4} 
          href="/customers?status=Delivered"
        />
      </div>

      {/* Financial Health Overview Bar */}
      <div className="bg-card/70 border border-gray-800/80 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800/60 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-200">আর্থিক সারসংক্ষেপ ও নিট লাভ</h3>
              <p className="text-[11px] text-gray-400">ফিল্টার অনুযায়ী ক্যাশ কালেকশন, মোট খরচ ও প্রকৃত নিট লাভ</p>
            </div>
          </div>
          <Link 
            href="/reports" 
            className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 transition-colors self-start sm:self-auto"
          >
            <span>পূর্ণাঙ্গ রিপোর্ট ও লেজার</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Link href="/reports" className="bg-secondary/40 hover:bg-secondary/70 p-3 rounded-xl border border-gray-800/40 hover:border-gray-700/60 transition-all block">
            <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider block">নেট ক্যাশ জমা</span>
            <div className="text-base sm:text-xl font-bold text-emerald-400 mt-0.5 truncate">
              {isLoading ? '...' : formatCurrency(filteredStats.totalRevenue)}
            </div>
            <span className="text-[10px] text-gray-500">রিফান্ড বাদ দেওয়া</span>
          </Link>

          <Link href="/expenses" className="bg-secondary/40 hover:bg-secondary/70 p-3 rounded-xl border border-gray-800/40 hover:border-gray-700/60 transition-all block">
            <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider block">দোকানের মোট খরচ</span>
            <div className="text-base sm:text-xl font-bold text-rose-400 mt-0.5 truncate">
              {isLoading ? '...' : formatCurrency(filteredStats.totalExpenses)}
            </div>
            <span className="text-[10px] text-gray-500">পার্টস ও সাধারণ খরচ</span>
          </Link>

          <Link href="/reports" className="bg-secondary/40 hover:bg-secondary/70 p-3 rounded-xl border border-gray-800/40 hover:border-gray-700/60 transition-all block">
            <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider block">আসল লাভ (নিট ব্যালেন্স)</span>
            <div className={`text-base sm:text-xl font-bold mt-0.5 truncate ${filteredStats.netProfit >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
              {isLoading ? '...' : formatCurrency(filteredStats.netProfit)}
            </div>
            <span className="text-[10px] text-gray-500">জমা থেকে খরচ বাদ</span>
          </Link>

          <Link href="/due" className="bg-secondary/40 hover:bg-secondary/70 p-3 rounded-xl border border-gray-800/40 hover:border-gray-700/60 transition-all block">
            <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider block">গ্রাহকদের মোট বাকি</span>
            <div className="text-base sm:text-xl font-bold text-amber-400 mt-0.5 truncate">
              {isLoading ? '...' : formatCurrency(filteredStats.totalPendingDues)}
            </div>
            <span className="text-[10px] text-gray-500">আদায়ের অপেক্ষায়</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="bg-card p-6 rounded-2xl border border-gray-800/50 h-full min-h-[300px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
            </div>
          ) : (
            <RevenueChart timeFilter={timeFilter} />
          )}
        </div>
        <div>
          {isLoading ? (
            <div className="bg-card p-6 rounded-2xl border border-gray-800/50 h-full min-h-[300px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
            </div>
          ) : (
            <QuickAlerts />
          )}
        </div>
      </div>

      <div>
        <RecentCustomers />
      </div>
    </div>
  );
}





