'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Coins, CheckCircle, Truck } from 'lucide-react';
import { collection, query, where, getCountFromServer, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n/useTranslation';
import Link from 'next/link';

export function QuickAlerts() {
  const { t, isBangla } = useTranslation();
  const lastFetchTimeRef = useRef<number>(0);
  const [alerts, setAlerts] = useState<any[]>([
    {
      id: 1,
      title: isBangla ? 'কম স্টক সতর্কতা' : 'Low Stock Warning',
      desc: isBangla ? 'লোড হচ্ছে...' : 'Loading...',
      icon: AlertCircle,
      count: 0,
      color: 'text-gray-400',
      bgColor: 'bg-gray-800',
      countColor: 'text-gray-500',
      link: '/inventory',
    },
    {
      id: 2,
      title: isBangla ? 'গ্রাহকদের বকেয়া' : 'Customer Dues',
      desc: isBangla ? 'লোড হচ্ছে...' : 'Loading...',
      icon: Coins,
      count: 0,
      color: 'text-gray-400',
      bgColor: 'bg-gray-800',
      countColor: 'text-gray-500',
      link: '/due',
    },
    {
      id: 3,
      title: isBangla ? 'ডেলিভারি প্রস্তুত' : 'Ready for Delivery',
      desc: isBangla ? 'লোড হচ্ছে...' : 'Loading...',
      icon: CheckCircle,
      count: 0,
      color: 'text-gray-400',
      bgColor: 'bg-gray-800',
      countColor: 'text-gray-500',
      link: '/customers?status=Ready for Delivery',
    },
  ]);

  useEffect(() => {
    let isMounted = true;

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

        // Execute queries in parallel with optimized single-field inventory scan
        const [snapshotReady, snapshotDues, snapshotStock, snapshotSuppliers] = await Promise.all([
          getCountFromServer(qReady),
          getDocs(qDues),
          (async () => {
            try {
              // Only query items where stock is low (<= 15) up to 100 items instead of full table scan
              const qLow = query(collection(db, 'inventory'), where('stock', '<=', 15), limit(100));
              return await getDocs(qLow);
            } catch (e) {
              return await getDocs(collection(db, 'inventory'));
            }
          })(),
          (async () => {
            try {
              const qSup = query(collection(db, 'suppliers'), where('due', '>', 0));
              return await getDocs(qSup);
            } catch (e) {
              return null;
            }
          })()
        ]);

        const readyCount = snapshotReady.data().count;

        // Process Dues
        let dueCount = 0;
        let closeDueDateCount = 0;
        const now = new Date().getTime();
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

        snapshotDues.forEach((doc) => {
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
        snapshotStock.forEach((doc) => {
          const item = doc.data();
          if (item.stock <= (item.minStockLevel || 5)) {
            lowStockCount++;
          }
        });

        // Process Supplier Payables
        let supplierDueCount = 0;
        let supplierTotalDue = 0;
        if (snapshotSuppliers) {
          snapshotSuppliers.forEach((doc: any) => {
            const sup = doc.data();
            const d = Number(sup.due) || 0;
            if (d > 0) {
              supplierDueCount++;
              supplierTotalDue += d;
            }
          });
        }

        const alertList: any[] = [
          {
            id: 1,
            title: isBangla ? 'কম স্টক সতর্কতা' : 'Low Stock Warning',
            desc: lowStockCount > 0 
              ? (isBangla ? `${lowStockCount}টি পার্টসের স্টক কমে গেছে` : `${lowStockCount} parts running low in stock`) 
              : (isBangla ? 'স্টক সন্তোষজনক' : 'Stock level healthy'),
            icon: AlertCircle,
            count: lowStockCount,
            color: lowStockCount > 0 ? 'text-red-500' : 'text-gray-400',
            bgColor: lowStockCount > 0 ? 'bg-red-500/20' : 'bg-gray-800',
            countColor: lowStockCount > 0 ? 'text-red-500' : 'text-green-500',
            link: '/inventory',
          },
          {
            id: 2,
            title: isBangla ? 'গ্রাহকদের বকেয়া' : 'Customer Dues',
            desc: dueCount > 0 ? (
                <span>
                  {dueCount} {isBangla ? 'জনের কাছে বকেয়া' : 'customers with dues'} 
                  {closeDueDateCount > 0 && (
                    <span className="text-red-400 font-semibold ml-1">
                      ({closeDueDateCount} {isBangla ? 'জনের মেয়াদ শেষ' : 'overdue'})
                    </span>
                  )}
                </span>
              ) : (isBangla ? 'কোনো বকেয়া নেই' : 'No pending dues'),
            icon: Coins,
            count: dueCount,
            color: dueCount > 0 ? 'text-orange-500' : 'text-gray-400',
            bgColor: dueCount > 0 ? 'bg-orange-500/20' : 'bg-gray-800',
            countColor: dueCount > 0 ? 'text-orange-500' : 'text-green-500',
            link: '/due',
          },
          {
            id: 3,
            title: isBangla ? 'ডেলিভারি প্রস্তুত' : 'Ready for Delivery',
            desc: readyCount > 0 
              ? (isBangla ? `${readyCount}টি ডিভাইস ডেলিভারির জন্য প্রস্তুত` : `${readyCount} devices ready for delivery`) 
              : (isBangla ? 'কোনো ডিভাইস ডেলিভারি বাকি নেই' : 'No devices pending delivery'),
            icon: CheckCircle,
            count: readyCount,
            color: readyCount > 0 ? 'text-emerald-400' : 'text-gray-400',
            bgColor: readyCount > 0 ? 'bg-emerald-500/20' : 'bg-gray-800',
            countColor: readyCount > 0 ? 'text-emerald-400' : 'text-green-500',
            link: '/customers?status=Ready for Delivery',
          },
        ];

        if (supplierDueCount > 0) {
          alertList.push({
            id: 4,
            title: isBangla ? 'মহাজন/সাপ্লায়ার দেনা' : 'Supplier Payable Dues',
            desc: isBangla ? `${supplierDueCount} জন মহাজনের মোট ${formatCurrency(supplierTotalDue)} দেনা` : `${supplierDueCount} suppliers payable (${formatCurrency(supplierTotalDue)})`,
            icon: Truck,
            count: supplierDueCount,
            color: 'text-amber-400',
            bgColor: 'bg-amber-500/20',
            countColor: 'text-amber-400',
            link: '/suppliers',
          });
        }

        if (isMounted) {
          setAlerts(alertList);
          lastFetchTimeRef.current = Date.now();
        }
      } catch (error) {
        console.error("Error loading alerts data", error);
      }
    };

    fetchAlerts();

    // Auto-refresh when tab gains focus (with 3-minute cooldown) or on app refresh
    const handleFocus = () => {
      if (Date.now() - lastFetchTimeRef.current > 180000) {
        fetchAlerts();
      }
    };
    const handleForceRefresh = () => {
      fetchAlerts();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleForceRefresh);
    window.addEventListener('app:refresh-dashboard', handleForceRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleForceRefresh);
      window.removeEventListener('app:refresh-dashboard', handleForceRefresh);
    };
  }, []);

  return (
    <div className="bg-card border border-gray-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-4.5 xl:p-5 shadow-xl relative overflow-hidden h-full flex flex-col justify-between">
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2.5 sm:mb-3 relative shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </div>
            <span>{isBangla ? 'জরুরি নোটিফিকেশন' : 'Alert Center'}</span>
          </h3>
          <Link href="/reports" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
            <span>{t('nav.reports')}</span>
            <span className="text-[10px]">→</span>
          </Link>
        </div>
        
        <div className="flex-1 flex flex-col justify-between gap-2 sm:gap-2.5 relative">
          {alerts.map((alert, idx) => (
            <Link 
              href={alert.link} 
              key={alert.id}
              className="block no-underline group flex-1 flex flex-col justify-center"
            >
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="p-2.5 sm:p-3 xl:p-3.5 rounded-xl border border-gray-800/60 bg-popover/50 hover:bg-[#1a1d2d] transition-all hover:border-gray-700/80 cursor-pointer flex items-center justify-between h-full"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${alert.bgColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                    <alert.icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${alert.color}`} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-200 group-hover:text-white transition-colors truncate">{alert.title}</h4>
                    <div className="text-[11px] sm:text-xs text-gray-400 mt-0.5 truncate">{alert.desc}</div>
                  </div>
                </div>
                <div className={`text-base sm:text-lg xl:text-xl font-bold ${alert.countColor} ml-2 shrink-0`}>
                  {alert.count}
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
