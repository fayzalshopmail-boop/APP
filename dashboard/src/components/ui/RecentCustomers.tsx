'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Star, Users, Phone, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { customerService, Customer } from '@/lib/services/customer';
import Link from 'next/link';

export function RecentCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await customerService.getRecent(5);
        setCustomers(data);
      } catch (error) {
        console.error("Error loading recent customers", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-card p-4 sm:p-6 rounded-2xl border border-gray-800/50 mt-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <h3 className="text-gray-200 font-semibold text-lg">Recent Customers</h3>
        </div>
        <Link href="/customers" className="text-xs bg-secondary border border-gray-700/50 hover:bg-gray-800 text-gray-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-1">
          View All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3"></div>
          <p className="text-sm">Loading recent customers...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center bg-background/30 rounded-xl border border-gray-800/50 border-dashed">
          <Users className="w-10 h-10 text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm font-medium mb-1">No customers yet</p>
          <p className="text-gray-500 text-xs mb-4">Add your first customer to see them here.</p>
          <Link href="/customers" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
            Add Customer
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile Card Layout (<640px) */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {customers.map((c) => (
              <Link href="/customers" key={c.id} className="bg-secondary p-4 rounded-xl border border-gray-800/60 flex flex-col gap-3 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-purple-400 font-semibold text-sm">{c.name}</h4>
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1">
                      <Phone className="w-3 h-3" /> {c.phone}
                    </div>
                  </div>
                  <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-md text-[10px] font-medium border border-blue-500/20">
                    {c.status || 'Received'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">
                  <div className="text-gray-300 font-bold text-sm">
                    {formatCurrency(c.totalBill)}
                  </div>
                  <div className="text-orange-400 text-xs font-medium flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-md">
                    <Star className="w-3 h-3 fill-orange-400" />
                    {c.points} pts
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop Table Layout (>=640px) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="text-gray-400 uppercase tracking-wider border-b border-gray-800 text-xs">
                  <th className="pb-3 font-medium min-w-[150px]">Customer Name</th>
                  <th className="pb-3 font-medium min-w-[120px]">Phone</th>
                  <th className="pb-3 font-medium min-w-[100px]">Total Bill</th>
                  <th className="pb-3 font-medium min-w-[80px]">Points</th>
                  <th className="pb-3 font-medium min-w-[140px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-3.5">
                      <div className="text-purple-400 font-medium">{c.name}</div>
                    </td>
                    <td className="py-3.5 text-gray-300 font-medium">{c.phone}</td>
                    <td className="py-3.5 text-gray-200 font-medium">{formatCurrency(c.totalBill)}</td>
                    <td className="py-3.5 text-orange-400 font-medium">
                      <div className="flex items-center gap-1.5 bg-orange-500/10 w-fit px-2 py-0.5 rounded-md border border-orange-500/20">
                        <Star className="w-3.5 h-3.5 fill-orange-400" />
                        {c.points}
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-medium border border-blue-500/20">
                        {c.status || 'Received'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </motion.div>
  );
}
