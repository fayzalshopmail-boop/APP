'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/currency';
import { transactionService, Transaction } from '@/lib/services/transaction';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function RevenueChart() {
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLast7DaysRevenue = async () => {
      try {
        setLoading(true);
        // Generate last 7 days array
        const last7Days = Array.from({length: 7}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          d.setHours(0, 0, 0, 0); // start of day
          return {
            name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            dateStr: d.toDateString(),
            revenue: 0,
            timestamp: d
          };
        });

        const startDate = last7Days[0].timestamp;

        // Query transactions from the last 7 days only
        const q = query(
          collection(db, 'transactions'),
          where('createdAt', '>=', startDate)
        );
        
        const snapshot = await getDocs(q);
        
        snapshot.forEach((doc) => {
          const t = doc.data();
          if (t.createdAt) {
            let tDate;
            if (t.createdAt.seconds) {
              tDate = new Date(t.createdAt.seconds * 1000).toDateString();
            } else {
              tDate = new Date(t.createdAt).toDateString();
            }
            
            if (tDate) {
              const dayObj = last7Days.find(d => d.dateStr === tDate);
              if (dayObj && t.type !== 'Refund') {
                dayObj.revenue += Number(t.amount) || 0;
              }
            }
          }
        });

        setData(last7Days);
      } catch (err) {
        console.error("Failed to load revenue chart data", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLast7DaysRevenue();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card border border-gray-800 rounded-2xl p-6 shadow-xl relative"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <div className="w-3 h-3 rounded-sm bg-indigo-500" />
          </div>
          Revenue Overview <span className="text-gray-500 text-sm font-medium ml-2">(7 Days)</span>
        </h3>
      </div>
      
      <div className="h-[300px] w-full">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">Loading chart data...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#4b5563" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="#4b5563" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f111a', 
                  border: '1px solid #1f2937',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }}
                itemStyle={{ color: '#fff', fontWeight: 600 }}
                labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4, stroke: '#0f111a' }}
                activeDot={{ r: 6, fill: '#a78bfa', stroke: '#0f111a', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}
