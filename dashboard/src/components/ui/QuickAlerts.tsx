'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Coins, Clock } from 'lucide-react';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function QuickAlerts() {
  const [alerts, setAlerts] = useState<any[]>([
    {
      id: 1,
      title: 'Low Stock Alert',
      desc: 'Loading...',
      icon: AlertCircle,
      count: 0,
      color: 'text-gray-400',
      bgColor: 'bg-gray-800',
      countColor: 'text-gray-500',
    },
    {
      id: 2,
      title: 'Pending Dues',
      desc: 'Loading...',
      icon: Coins,
      count: 0,
      color: 'text-gray-400',
      bgColor: 'bg-gray-800',
      countColor: 'text-gray-500',
    },
    {
      id: 3,
      title: 'Pending Jobs',
      desc: 'Loading...',
      icon: Clock,
      count: 0,
      color: 'text-gray-400',
      bgColor: 'bg-gray-800',
      countColor: 'text-gray-500',
    },
  ]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        // 1. Pending Jobs Count
        const qJobs = query(
          collection(db, 'customers'),
          where('status', 'in', ['Received', 'In Progress', 'Waiting for Parts'])
        );
        const snapshotJobs = await getCountFromServer(qJobs);
        const pendingJobsCount = snapshotJobs.data().count;

        // 2. Pending Dues Count
        const qDues = query(
          collection(db, 'customers'),
          where('due', '>', 0)
        );
        const snapshotDues = await getDocs(qDues);
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

        // 3. Low Stock Count (Calculate in memory to respect minStockLevel)
        const snapshotStock = await getDocs(collection(db, 'inventory'));
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
            title: 'Low Stock Alert',
            desc: lowStockCount > 0 ? `${lowStockCount} items are running low` : 'Stock levels are good',
            icon: AlertCircle,
            count: lowStockCount,
            color: lowStockCount > 0 ? 'text-red-500' : 'text-gray-400',
            bgColor: lowStockCount > 0 ? 'bg-red-500/20' : 'bg-gray-800',
            countColor: lowStockCount > 0 ? 'text-red-500' : 'text-green-500',
          },
          {
            id: 2,
            title: 'Pending Dues',
            desc: dueCount > 0 ? (
                <span>
                  {dueCount} customers have dues 
                  {closeDueDateCount > 0 && (
                    <span className="text-red-400 font-semibold ml-1">
                      ({closeDueDateCount} close/overdue)
                    </span>
                  )}
                </span>
              ) : 'No pending dues',
            icon: Coins,
            count: dueCount,
            color: dueCount > 0 ? 'text-orange-500' : 'text-gray-400',
            bgColor: dueCount > 0 ? 'bg-orange-500/20' : 'bg-gray-800',
            countColor: dueCount > 0 ? 'text-orange-500' : 'text-green-500',
          },
          {
            id: 3,
            title: 'Pending Jobs',
            desc: pendingJobsCount > 0 ? `${pendingJobsCount} devices need repair` : 'No pending jobs',
            icon: Clock,
            count: pendingJobsCount,
            color: pendingJobsCount > 0 ? 'text-blue-500' : 'text-gray-400',
            bgColor: pendingJobsCount > 0 ? 'bg-blue-500/20' : 'bg-gray-800',
            countColor: pendingJobsCount > 0 ? 'text-blue-500' : 'text-green-500',
          },
        ]);
      } catch (error) {
        console.error("Error loading alerts data", error);
      }
    };

    fetchAlerts();
  }, []);

  return (
    <div className="bg-card border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="flex items-center justify-between mb-6 relative">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-orange-500" />
          </div>
          Quick Alerts
        </h3>
        <button className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
          View All <span className="text-[10px]">→</span>
        </button>
      </div>
      
      <div className="space-y-4 relative">
        {alerts.map((alert, idx) => (
          <motion.div 
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * idx }}
            className="group p-4 rounded-xl border border-gray-800/60 bg-popover/50 hover:bg-[#1a1d2d] transition-all hover:border-gray-700/80 cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full ${alert.bgColor} flex items-center justify-center shrink-0`}>
                <alert.icon className={`w-5 h-5 ${alert.color}`} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">{alert.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{alert.desc}</p>
              </div>
            </div>
            <div className={`text-xl font-bold ${alert.countColor}`}>
              {alert.count}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
