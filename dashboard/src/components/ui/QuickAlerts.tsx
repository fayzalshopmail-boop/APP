'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Coins, CheckCircle } from 'lucide-react';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

export function QuickAlerts() {
  const [alerts, setAlerts] = useState<any[]>([
    {
      id: 1,
      title: 'কম স্টক সতর্কতা',
      desc: 'লোড হচ্ছে...',
      icon: AlertCircle,
      count: 0,
      color: 'text-gray-400',
      bgColor: 'bg-gray-800',
      countColor: 'text-gray-500',
      link: '/inventory',
    },
    {
      id: 2,
      title: 'গ্রাহকদের বকেয়া',
      desc: 'লোড হচ্ছে...',
      icon: Coins,
      count: 0,
      color: 'text-gray-400',
      bgColor: 'bg-gray-800',
      countColor: 'text-gray-500',
      link: '/due',
    },
    {
      id: 3,
      title: 'ডেলিভারি প্রস্তুত',
      desc: 'লোড হচ্ছে...',
      icon: CheckCircle,
      count: 0,
      color: 'text-gray-400',
      bgColor: 'bg-gray-800',
      countColor: 'text-gray-500',
      link: '/customers?status=Ready for Delivery',
    },
  ]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const qReady = query(
          collection(db, 'customers'),
          where('status', '==', 'Ready for Delivery')
        );
        const qDues = query(
          collection(db, 'customers'),
          where('due', '>', 0)
        );

        // Execute all 3 alert queries in parallel
        const [snapshotReady, snapshotDues, snapshotStock] = await Promise.all([
          getCountFromServer(qReady),
          getDocs(qDues),
          getDocs(collection(db, 'inventory'))
        ]);

        const readyCount = snapshotReady.data().count;

        // Process Dues
        let dueCount = 0;
        let closeDueDateCount = 0;
        const now = new Date().getTime();
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

        snapshotDues.forEach(doc => {
          dueCount++;
          const customer = doc.data();
          if (customer.dueDate) {
            const dueDateMs = new Date(customer.dueDate).getTime();
            // Approaching within 3 days or already overdue
            if (dueDateMs - now <= threeDaysInMs) {
              closeDueDateCount++;
            }
          }
        });

        // Process Low Stock
        let lowStockCount = 0;
        snapshotStock.forEach(doc => {
          const item = doc.data();
          if (item.stock <= (item.minStockLevel || 5)) {
            lowStockCount++;
          }
        });

        setAlerts([
          {
            id: 1,
            title: 'কম স্টক সতর্কতা',
            desc: lowStockCount > 0 ? `${lowStockCount}টি পার্টসের স্টক কমে গেছে` : 'স্টক সন্তোষজনক',
            icon: AlertCircle,
            count: lowStockCount,
            color: lowStockCount > 0 ? 'text-red-500' : 'text-gray-400',
            bgColor: lowStockCount > 0 ? 'bg-red-500/20' : 'bg-gray-800',
            countColor: lowStockCount > 0 ? 'text-red-500' : 'text-green-500',
            link: '/inventory',
          },
          {
            id: 2,
            title: 'গ্রাহকদের বকেয়া',
            desc: dueCount > 0 ? (
                <span>
                  {dueCount} জনের কাছে বকেয়া 
                  {closeDueDateCount > 0 && (
                    <span className="text-red-400 font-semibold ml-1">
                      ({closeDueDateCount} জনের মেয়াদ শেষ)
                    </span>
                  )}
                </span>
              ) : 'কোনো বকেয়া নেই',
            icon: Coins,
            count: dueCount,
            color: dueCount > 0 ? 'text-orange-500' : 'text-gray-400',
            bgColor: dueCount > 0 ? 'bg-orange-500/20' : 'bg-gray-800',
            countColor: dueCount > 0 ? 'text-orange-500' : 'text-green-500',
            link: '/due',
          },
          {
            id: 3,
            title: 'ডেলিভারি প্রস্তুত',
            desc: readyCount > 0 ? `${readyCount}টি ডিভাইস ডেলিভারির জন্য প্রস্তুত` : 'কোনো ডিভাইস ডেলিভারি বাকি নেই',
            icon: CheckCircle,
            count: readyCount,
            color: readyCount > 0 ? 'text-emerald-400' : 'text-gray-400',
            bgColor: readyCount > 0 ? 'bg-emerald-500/20' : 'bg-gray-800',
            countColor: readyCount > 0 ? 'text-emerald-400' : 'text-green-500',
            link: '/customers?status=Ready for Delivery',
          },
        ]);
      } catch (error) {
        console.error("Error loading alerts data", error);
      }
    };

    fetchAlerts();

    // Auto-refresh when tab gains focus
    const handleRefresh = () => {
      fetchAlerts();
    };
    window.addEventListener('focus', handleRefresh);
    window.addEventListener('app:refresh-dashboard', handleRefresh);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('app:refresh-dashboard', handleRefresh);
    };
  }, []);

  return (
    <div className="bg-card border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="flex items-center justify-between mb-6 relative">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-orange-500" />
          </div>
          জরুরি নোটিফিকেশন
        </h3>
        <Link href="/reports" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
          সকল রিপোর্ট <span className="text-[10px]">→</span>
        </Link>
      </div>
      
      <div className="space-y-4 relative">
        {alerts.map((alert, idx) => (
          <Link 
            href={alert.link} 
            key={alert.id}
            className="block no-underline group"
          >
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * idx }}
              className="p-4 rounded-xl border border-gray-800/60 bg-popover/50 hover:bg-[#1a1d2d] transition-all hover:border-gray-700/80 cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${alert.bgColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                  <alert.icon className={`w-5 h-5 ${alert.color}`} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">{alert.title}</h4>
                  <div className="text-xs text-gray-500 mt-0.5">{alert.desc}</div>
                </div>
              </div>
              <div className={`text-xl font-bold ${alert.countColor}`}>
                {alert.count}
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
