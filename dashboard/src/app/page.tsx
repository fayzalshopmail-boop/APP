'use client';

import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Users, Coins, Tv, Wrench, Loader2, UserPlus, ShoppingCart, Receipt, TrendingUp, ArrowUpRight, Plus } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { QuickAlerts } from '@/components/ui/QuickAlerts';
import { RevenueChart } from '@/components/ui/RevenueChart';
import { normalizePhone } from '@/lib/services/customer';
import { formatCurrency } from '@/lib/currency';
import { getLocalDateString } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Dashboard() {
  const { user, dashboardTimeFilter } = useAppStore();
  const { t, isBangla } = useTranslation();
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
  const lastFetchTimeRef = useRef<number>(0);

  useEffect(() => {
    const loadAggregatedData = async () => {
      if (user?.role === 'Technician') return;
      try {
        setIsLoading(true);
        const { collection, query, where, getCountFromServer, sum, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        let startDate = null;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (timeFilter === 'Today') startDate = startOfToday;
        else if (timeFilter === 'This Week') {
          const d = new Date(startOfToday);
          const diffToSat = (d.getDay() + 1) % 7;
          d.setDate(d.getDate() - diffToSat);
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
          const startDateStr = getLocalDateString(startDate);
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
        lastFetchTimeRef.current = Date.now();
      }
    };

    loadAggregatedData();

    // Auto-refresh when tab gains focus (with 3-minute cooldown), on app refresh, or when reconnected online
    const handleFocus = () => {
      if (Date.now() - lastFetchTimeRef.current > 180000) {
        loadAggregatedData();
      }
    };
    const handleForceRefresh = () => {
      loadAggregatedData();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleForceRefresh);
    window.addEventListener('app:refresh-dashboard', handleForceRefresh);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleForceRefresh);
      window.removeEventListener('app:refresh-dashboard', handleForceRefresh);
    };
  }, [timeFilter]);

  const filteredStats = stats;

  if (user?.role === 'Technician') return null;

  return (
    <div className="flex-1 flex flex-col justify-between gap-3 sm:gap-3.5 xl:gap-4 max-w-[1600px] mx-auto w-full pb-6 sm:pb-1">
      {/* 4 Core StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 xl:gap-4 shrink-0">
        <StatCard 
          title={isBangla ? "মোট কাস্টমার" : "Total Customers"} 
          value={isLoading ? '...' : filteredStats.totalCustomers.toString()} 
          subtitle={
            timeFilter === 'Today' 
              ? (isBangla ? 'আজকের কাস্টমার' : "Today's Customers") 
              : timeFilter === 'This Week' 
              ? (isBangla ? 'এই সপ্তাহের কাস্টমার' : "This Week's Customers") 
              : timeFilter === 'This Month' 
              ? (isBangla ? 'এই মাসের কাস্টমার' : "This Month's Customers") 
              : timeFilter === 'This Year' 
              ? (isBangla ? 'এই বছরের কাস্টমার' : "This Year's Customers") 
              : (isBangla ? 'সর্বমোট কাস্টমার' : "All Time Customers")
          } 
          icon={<Users className="w-5 h-5 text-blue-500" />} 
          iconBgColor="bg-blue-500/10" 
          iconColor="text-blue-500" 
          delay={0.1} 
          href="/customers"
        />
        <StatCard 
          title={isBangla ? "সংগৃহীত রাজস্ব" : "Total Revenue"} 
          value={isLoading ? '...' : formatCurrency(filteredStats.totalRevenue)} 
          subtitle={
            timeFilter === 'Today' 
              ? (isBangla ? 'আজকের নেট আদায়' : "Today's Collection") 
              : timeFilter === 'This Week' 
              ? (isBangla ? 'সাপ্তাহিক নেট আদায়' : "Weekly Collection") 
              : timeFilter === 'This Month' 
              ? (isBangla ? 'মাসিক নেট আদায়' : "Monthly Collection") 
              : (isBangla ? 'মোট নেট আদায়' : "Total Net Collection")
          } 
          icon={<Coins className="w-5 h-5 text-emerald-500" />} 
          iconBgColor="bg-emerald-500/10" 
          iconColor="text-emerald-500" 
          delay={0.2} 
          href="/reports"
        />
        <StatCard 
          title={isBangla ? "পেন্ডিং কাজ" : "Pending Repairs"} 
          value={isLoading ? '...' : filteredStats.pendingJobs.toString()} 
          subtitle={isBangla ? "চলমান মেরামত কাজ" : "Under active repair"} 
          icon={<Tv className="w-5 h-5 text-orange-500" />} 
          iconBgColor="bg-orange-500/10" 
          iconColor="text-orange-500" 
          delay={0.3} 
          href="/customers?status=Pending"
        />
        <StatCard 
          title={isBangla ? "সম্পন্ন মেরামত" : "Completed Repairs"} 
          value={isLoading ? '...' : filteredStats.completedRepairs.toString()} 
          subtitle={
            timeFilter === 'Today' 
              ? (isBangla ? 'আজকের ডেলিভারি' : "Today's Deliveries") 
              : timeFilter === 'This Week' 
              ? (isBangla ? 'এই সপ্তাহের ডেলিভারি' : "This Week's Deliveries") 
              : timeFilter === 'This Month' 
              ? (isBangla ? 'এই মাসের ডেলিভারি' : "This Month's Deliveries") 
              : (isBangla ? 'সর্বমোট সম্পন্ন' : "All-Time Completed")
          } 
          icon={<Wrench className="w-5 h-5 text-purple-500" />} 
          iconBgColor="bg-purple-500/10" 
          iconColor="text-purple-500" 
          delay={0.4} 
          href="/customers?status=Delivered"
        />
      </div>

      {/* Financial Health Overview Bar */}
      <div className="bg-card/70 border border-gray-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 xl:p-4 shadow-lg backdrop-blur-sm shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800/60 pb-2 sm:pb-2.5 mb-2.5 sm:mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-200">{isBangla ? "আর্থিক সারসংক্ষেপ ও নিট লাভ" : "Financial Summary & Net Profit"}</h3>
              <p className="text-[11px] text-gray-400">{isBangla ? "ফিল্টার অনুযায়ী ক্যাশ কালেকশন, মোট খরচ ও প্রকৃত নিট লাভ" : "Collection, expenses and net profit for period"}</p>
            </div>
          </div>
          <Link 
            href="/reports" 
            className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 transition-colors self-start sm:self-auto"
          >
            <span>{isBangla ? "পূর্ণাঙ্গ রিপোর্ট ও লেজার" : "Full Reports & Ledger"}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 xl:gap-4">
          <Link href="/reports" className="bg-secondary/40 hover:bg-secondary/70 p-2.5 sm:p-3 rounded-xl border border-gray-800/40 hover:border-gray-700/60 transition-all block">
            <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider block">{isBangla ? "নেট ক্যাশ জমা" : "Net Cash In"}</span>
            <div className="text-base sm:text-lg xl:text-xl font-bold text-emerald-400 mt-0.5 truncate">
              {isLoading ? '...' : formatCurrency(filteredStats.totalRevenue)}
            </div>
            <span className="text-[10px] text-gray-500">{isBangla ? "রিফান্ড বাদ দেওয়া" : "Excl. refunds"}</span>
          </Link>

          <Link href="/expenses" className="bg-secondary/40 hover:bg-secondary/70 p-2.5 sm:p-3 rounded-xl border border-gray-800/40 hover:border-gray-700/60 transition-all block">
            <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider block">{isBangla ? "দোকানের মোট খরচ" : "Total Expenses"}</span>
            <div className="text-base sm:text-lg xl:text-xl font-bold text-rose-400 mt-0.5 truncate">
              {isLoading ? '...' : formatCurrency(filteredStats.totalExpenses)}
            </div>
            <span className="text-[10px] text-gray-500">{isBangla ? "পার্টস ও সাধারণ খরচ" : "Parts & overheads"}</span>
          </Link>

          <Link href="/reports" className="bg-secondary/40 hover:bg-secondary/70 p-2.5 sm:p-3 rounded-xl border border-gray-800/40 hover:border-gray-700/60 transition-all block">
            <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider block">{isBangla ? "আসল লাভ (নিট ব্যালেন্স)" : "Net Profit Balance"}</span>
            <div className={`text-base sm:text-lg xl:text-xl font-bold mt-0.5 truncate ${filteredStats.netProfit >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
              {isLoading ? '...' : formatCurrency(filteredStats.netProfit)}
            </div>
            <span className="text-[10px] text-gray-500">{isBangla ? "জমা থেকে খরচ বাদ" : "Revenue minus expense"}</span>
          </Link>

          <Link href="/due" className="bg-secondary/40 hover:bg-secondary/70 p-2.5 sm:p-3 rounded-xl border border-gray-800/40 hover:border-gray-700/60 transition-all block">
            <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider block">{isBangla ? "গ্রাহকদের মোট বাকি" : "Total Customer Dues"}</span>
            <div className="text-base sm:text-lg xl:text-xl font-bold text-amber-400 mt-0.5 truncate">
              {isLoading ? '...' : formatCurrency(filteredStats.totalPendingDues)}
            </div>
            <span className="text-[10px] text-gray-500">{isBangla ? "আদায়ের অপেক্ষায়" : "Pending collection"}</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 xl:gap-5 flex-1 min-h-[260px] pb-1">
        <div className="lg:col-span-2 flex flex-col">
          {isLoading ? (
            <div className="bg-card p-4 sm:p-6 rounded-2xl border border-gray-800/50 h-full min-h-[220px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
            </div>
          ) : (
            <RevenueChart timeFilter={timeFilter} />
          )}
        </div>
        <div className="flex flex-col">
          {isLoading ? (
            <div className="bg-card p-4 sm:p-6 rounded-2xl border border-gray-800/50 h-full min-h-[220px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
            </div>
          ) : (
            <QuickAlerts />
          )}
        </div>
      </div>

      {/* Mobile Floating Action Button (FAB) - Bottom Right (+ icon only) */}
      <button
        type="button"
        onClick={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('app:open-add-customer'));
          }
        }}
        className="sm:hidden fixed bottom-24 right-4 z-40 w-13 h-13 bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 active:scale-90 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/50 border border-blue-400/30 transition-all focus:outline-none"
        title={t('topbar.addCustomer')}
        aria-label={t('topbar.addCustomer')}
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
}





