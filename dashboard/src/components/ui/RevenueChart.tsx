'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/currency';
import { useAppStore } from '@/store/useAppStore';

const BENGALI_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const BENGALI_MONTHS_SHORT = [
  'জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'
];

const BENGALI_DAYS_SHORT = [
  'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'
];

interface RevenueChartProps {
  timeFilter?: string;
}

export function RevenueChart({ timeFilter: propTimeFilter }: RevenueChartProps) {
  const storeTimeFilter = useAppStore((state) => state.dashboardTimeFilter);
  const activeFilter = propTimeFilter || storeTimeFilter || 'This Week';

  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subtitle, setSubtitle] = useState('');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const lastFetchTimeRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;

    const fetchRevenueData = async () => {
      try {
        setLoading(true);
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

        let startDate: Date | null = null;
        let generatedBuckets: any[] = [];
        let filterSubtitle = '';

        if (activeFilter === 'Today') {
          startDate = startOfToday;
          filterSubtitle = '(আজকের ঘণ্টার চিত্র)';

          // 2-hour interval slots for Today
          const slots = [
            { name: '8 AM', start: 8, end: 10, label: 'সকাল ৮:০০ - ১০:০০' },
            { name: '10 AM', start: 10, end: 12, label: 'সকাল ১০:০০ - ১২:০০' },
            { name: '12 PM', start: 12, end: 14, label: 'দুপুর ১২:০০ - ২:০০' },
            { name: '2 PM', start: 14, end: 16, label: 'দুপুর ২:০০ - বিকাল ৪:০০' },
            { name: '4 PM', start: 16, end: 18, label: 'বিকাল ৪:০০ - সন্ধ্যা ৬:০০' },
            { name: '6 PM', start: 18, end: 20, label: 'সন্ধ্যা ৬:০০ - রাত ৮:০০' },
            { name: '8 PM', start: 20, end: 22, label: 'রাত ৮:০০ - রাত ১০:০০' },
            { name: '10 PM+', start: 22, end: 24, label: 'রাত ১০:০০ এর পর' }
          ];

          generatedBuckets = slots.map((s) => ({
            name: s.name,
            fullLabel: s.label,
            revenue: 0,
            start: s.start,
            end: s.end
          }));
        } else if (activeFilter === 'This Week') {
          // Saturday start of the week in Bangladesh
          const startOfWeek = new Date(startOfToday);
          const dayOfWeek = startOfWeek.getDay();
          const diffToSat = (dayOfWeek + 1) % 7;
          startOfWeek.setDate(startOfWeek.getDate() - diffToSat);
          startDate = startOfWeek;
          filterSubtitle = '(এই সপ্তাহের দৈনিক চিত্র)';

          const weekDays = [];
          for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            const dayName = BENGALI_DAYS_SHORT[d.getDay()];
            const dateNum = d.getDate();
            weekDays.push({
              name: `${dayName} (${dateNum})`,
              fullLabel: `${dayName}বার, ${dateNum} ${BENGALI_MONTHS[d.getMonth()]}`,
              dateStr: d.toDateString(),
              revenue: 0,
              timestamp: d
            });
          }
          generatedBuckets = weekDays;
        } else if (activeFilter === 'This Month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          filterSubtitle = `(${BENGALI_MONTHS[now.getMonth()]} মাসের দৈনিক চিত্র)`;

          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          const monthDays = [];
          for (let i = 1; i <= daysInMonth; i++) {
            monthDays.push({
              name: `${i}`,
              fullLabel: `${i} ${BENGALI_MONTHS[now.getMonth()]} ${now.getFullYear()}`,
              dayNum: i,
              revenue: 0
            });
          }
          generatedBuckets = monthDays;
        } else if (activeFilter === 'This Year') {
          startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
          filterSubtitle = `(${now.getFullYear()} সালের ১২ মাসের চিত্র)`;

          const yearMonths = [];
          for (let m = 0; m < 12; m++) {
            yearMonths.push({
              name: BENGALI_MONTHS_SHORT[m],
              fullLabel: `${BENGALI_MONTHS[m]} ${now.getFullYear()}`,
              monthIndex: m,
              revenue: 0
            });
          }
          generatedBuckets = yearMonths;
        } else {
          // All Time -> past 12 rolling months
          filterSubtitle = '(সার্বিক মাসিক রাজস্ব চিত্র)';
          const rollingMonths = [];
          for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = d.getMonth();
            const y = d.getFullYear();
            rollingMonths.push({
              name: `${BENGALI_MONTHS_SHORT[m]} '${y.toString().slice(2)}`,
              fullLabel: `${BENGALI_MONTHS[m]} ${y}`,
              year: y,
              monthIndex: m,
              revenue: 0
            });
          }
          startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
          generatedBuckets = rollingMonths;
        }

        // Prepare Firestore query
        let q = collection(db, 'transactions') as any;
        if (startDate) {
          q = query(q, where('createdAt', '>=', startDate));
        }

        let snapshot;
        try {
          snapshot = await getDocs(q);
        } catch (queryErr) {
          // Fallback if index not yet created
          const fallbackQ = collection(db, 'transactions');
          snapshot = await getDocs(fallbackQ);
        }

        let sumRevenue = 0;

        snapshot.forEach((doc: any) => {
          const t = doc.data();
          let amount = 0;
          if (['Advance Payment', 'Due Collection', 'Direct Sell'].includes(t.type)) {
            amount = Number(t.amount) || 0;
          } else if (t.type === 'Refund') {
            amount = -(Number(t.amount) || 0);
          }

          if (amount === 0) return;

          // Parse transaction date safely
          const rawDate = t.createdAt || t.date;
          if (!rawDate) return;

          let tDate: Date | null = null;
          if (rawDate.toDate) tDate = rawDate.toDate();
          else if (rawDate.seconds) tDate = new Date(rawDate.seconds * 1000);
          else tDate = new Date(rawDate);

          if (!tDate || isNaN(tDate.getTime())) return;
          if (startDate && tDate < startDate) return;

          // Bucket matching logic
          if (activeFilter === 'Today') {
            const hour = tDate.getHours();
            let bucket = generatedBuckets.find((b) => hour >= b.start && hour < b.end);
            if (!bucket) {
              if (hour < 8) bucket = generatedBuckets[0];
              else bucket = generatedBuckets[generatedBuckets.length - 1];
            }
            if (bucket) {
              bucket.revenue += amount;
              sumRevenue += amount;
            }
          } else if (activeFilter === 'This Week') {
            const dateStr = tDate.toDateString();
            const bucket = generatedBuckets.find((b) => b.dateStr === dateStr);
            if (bucket) {
              bucket.revenue += amount;
              sumRevenue += amount;
            }
          } else if (activeFilter === 'This Month') {
            if (tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear()) {
              const day = tDate.getDate();
              const bucket = generatedBuckets.find((b) => b.dayNum === day);
              if (bucket) {
                bucket.revenue += amount;
                sumRevenue += amount;
              }
            }
          } else if (activeFilter === 'This Year') {
            if (tDate.getFullYear() === now.getFullYear()) {
              const m = tDate.getMonth();
              const bucket = generatedBuckets.find((b) => b.monthIndex === m);
              if (bucket) {
                bucket.revenue += amount;
                sumRevenue += amount;
              }
            }
          } else {
            // All Time (rolling 12 months)
            const bucket = generatedBuckets.find(
              (b) => b.year === tDate!.getFullYear() && b.monthIndex === tDate!.getMonth()
            );
            if (bucket) {
              bucket.revenue += amount;
              sumRevenue += amount;
            }
          }
        });

        if (isMounted) {
          setChartData(generatedBuckets);
          setSubtitle(filterSubtitle);
          setTotalRevenue(sumRevenue);
          lastFetchTimeRef.current = Date.now();
        }
      } catch (err) {
        console.error('Failed to load revenue chart data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRevenueData();

    // Auto-refresh when tab gains focus (with 3-minute cooldown), on app refresh, or when reconnected online
    const handleFocus = () => {
      if (Date.now() - lastFetchTimeRef.current > 180000) {
        fetchRevenueData();
      }
    };
    const handleForceRefresh = () => {
      fetchRevenueData();
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
  }, [activeFilter]);

  const xAxisInterval = useMemo(() => {
    if (activeFilter === 'This Month') return 2; // Show every 3rd day to avoid clutter
    return 0; // Show all ticks for Today, Week, Year
  }, [activeFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card border border-gray-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-4.5 xl:p-5 shadow-xl relative h-full flex flex-col justify-between"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-indigo-500" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              রাজস্ব চিত্র <span className="text-gray-400 text-xs font-medium">{subtitle}</span>
            </h3>
            <p className="text-[10px] sm:text-[11px] text-gray-500">
              নির্বাচিত সময়সীমার রাজস্ব ও সংগৃহীত নগদ প্রবাহ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-secondary/50 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-gray-800/60">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">মোট রাজস্ব:</span>
          <span className="text-xs sm:text-sm font-bold text-indigo-400">
            {loading ? '...' : formatCurrency(totalRevenue)}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-[220px] w-full">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
            চার্ট ডেটা লোড হচ্ছে...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#4b5563"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={10}
                interval={xAxisInterval}
              />
              <YAxis
                stroke="#4b5563"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={50}
                tickFormatter={(value) => {
                  if (value >= 1000) return `৳${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
                  return `৳${value}`;
                }}
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
                formatter={(value: any) => [formatCurrency(Number(value) || 0), 'সংগৃহীত রাজস্ব']}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]?.payload?.fullLabel) {
                    return payload[0].payload.fullLabel;
                  }
                  return label;
                }}
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


