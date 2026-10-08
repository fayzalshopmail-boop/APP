'use client';

import { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Users, Coins, Tv, Wrench, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuickAlerts } from '@/components/ui/QuickAlerts';
import { RevenueChart } from '@/components/ui/RevenueChart';
import { RecentCustomers } from '@/components/ui/RecentCustomers';
import { customerService, Customer } from '@/lib/services/customer';
import { transactionService, Transaction } from '@/lib/services/transaction';
import { formatCurrency } from '@/lib/currency';
import { useAppStore } from '@/store/useAppStore';

export default function Dashboard() {
  const [timeFilter, setTimeFilter] = useState<'Today' | 'This Week' | 'This Month' | 'This Year' | 'All Time'>('This Week');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalCustomers: 0, totalRevenue: 0, pendingJobs: 0, completedRepairs: 0 });

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

        // 1. Total Customers
        let qCustomers = collection(db, 'customers') as any;
        if (startDate) qCustomers = query(qCustomers, where('createdAt', '>=', startDate));
        const snapCustomers = await getCountFromServer(qCustomers);

        // 2. Total Revenue (Transactions)
        let totalRevenue = 0;
        let qTransactions = collection(db, 'transactions') as any;
        
        if (startDate) {
          qTransactions = query(qTransactions, where('createdAt', '>=', startDate));
        }
        
        const docsSnap = await getDocs(qTransactions);
        docsSnap.forEach(doc => {
          const data = doc.data();
          if (['Advance Payment', 'Due Collection', 'Direct Sell'].includes(data.type)) {
            totalRevenue += Number(data.amount) || 0;
          }
        });

        // 3. Pending Jobs (Live snapshot, ignores date filter)
        const qPending = query(collection(db, 'customers'), where('status', 'in', ['Received', 'In Progress', 'Waiting for Parts']));
        const snapPending = await getCountFromServer(qPending);

        // 4. Completed Repairs
        let qCompleted = query(collection(db, 'customers'), where('status', 'in', ['Delivered', 'Ready for Delivery']));
        let completedCount = 0;
        if (startDate) {
           const docsSnap = await getDocs(qCompleted);
           docsSnap.forEach(doc => {
              const d = doc.data();
              const dateToUse = d.updatedAt || d.createdAt;
              let dateObj = null;
              if (dateToUse?.seconds) dateObj = new Date(dateToUse.seconds * 1000);
              else if (dateToUse) dateObj = new Date(dateToUse);
              if (dateObj && dateObj >= startDate) completedCount++;
           });
        } else {
           const snapCompleted = await getCountFromServer(qCompleted);
           completedCount = snapCompleted.data().count;
        }

        setStats({
           totalCustomers: snapCustomers.data().count,
           totalRevenue: totalRevenue,
           pendingJobs: snapPending.data().count,
           completedRepairs: completedCount
        });

      } catch (err) {
        console.error("Failed to load dashboard aggregations", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAggregatedData();
  }, [timeFilter]);

  const filteredStats = stats;

return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 rounded-xl hidden sm:block">
            <LayoutDashboard className="w-8 h-8 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Overview</h1>
            <p className="text-gray-400 text-sm">Welcome back to your {useAppStore().shop?.shopTitle || 'TV Repair Center'} dashboard.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isLoading && (
            <div className="flex items-center gap-2 text-blue-400 bg-blue-500/10 px-4 py-2 rounded-lg text-sm font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Syncing...</span>
            </div>
          )}
          <Select value={timeFilter} onValueChange={(val: any) => setTimeFilter(val)}>
            <SelectTrigger className="w-[140px] bg-secondary border-gray-800 text-gray-100 rounded-lg focus:ring-1 focus:ring-blue-500/50">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="This Week">This Week</SelectItem>
              <SelectItem value="This Month">This Month</SelectItem>
              <SelectItem value="This Year">This Year</SelectItem>
              <SelectItem value="All Time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard 
          title="Total Customers" 
          value={isLoading ? '...' : filteredStats.totalCustomers.toString()} 
          subtitle={timeFilter} 
          icon={<Users className="w-5 h-5 text-blue-500" />} 
          iconBgColor="bg-blue-500/10" 
          iconColor="text-blue-500" 
          delay={0.1} 
        />
        <StatCard 
          title="Collected Revenue" 
          value={isLoading ? '...' : formatCurrency(filteredStats.totalRevenue)} 
          subtitle="Based on filter" 
          icon={<Coins className="w-5 h-5 text-emerald-500" />} 
          iconBgColor="bg-emerald-500/10" 
          iconColor="text-emerald-500" 
          delay={0.2} 
        />
        <StatCard 
          title="Pending Jobs" 
          value={isLoading ? '...' : filteredStats.pendingJobs.toString()} 
          subtitle="Needs attention" 
          icon={<Tv className="w-5 h-5 text-orange-500" />} 
          iconBgColor="bg-orange-500/10" 
          iconColor="text-orange-500" 
          delay={0.3} 
        />
        <StatCard 
          title="Completed Repairs" 
          value={isLoading ? '...' : filteredStats.completedRepairs.toString()} 
          subtitle={timeFilter} 
          icon={<Wrench className="w-5 h-5 text-purple-500" />} 
          iconBgColor="bg-purple-500/10" 
          iconColor="text-purple-500" 
          delay={0.4} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="bg-card p-6 rounded-2xl border border-gray-800/50 h-full min-h-[300px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
            </div>
          ) : (
            <RevenueChart />
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




