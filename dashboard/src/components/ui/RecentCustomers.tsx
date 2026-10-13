'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Star, Users, Phone, ArrowRight, Tv } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { customerService, Customer } from '@/lib/services/customer';
import Link from 'next/link';

export function RecentCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadData();

    window.addEventListener('focus', loadData);
    window.addEventListener('online', loadData);
    window.addEventListener('app:refresh-dashboard', loadData);

    return () => {
      window.removeEventListener('focus', loadData);
      window.removeEventListener('online', loadData);
      window.removeEventListener('app:refresh-dashboard', loadData);
    };
  }, []);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Received':
        return { label: 'জমা নেওয়া', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'In Progress':
        return { label: 'মেরামত চলছে', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
      case 'Waiting for Parts':
        return { label: 'পার্টস অপেক্ষা', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'Ready for Delivery':
        return { label: 'ডেলিভারি প্রস্তুত', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'Delivered':
        return { label: 'ডেলিভারি সম্পন্ন', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'Returned (Unrepaired)':
        return { label: 'ফেরত দেওয়া', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      default:
        return { label: status || 'জমা নেওয়া', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    }
  };

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
          <h3 className="text-gray-200 font-semibold text-lg">সাম্প্রতিক কাস্টমার ও মেরামত</h3>
        </div>
        <Link href="/customers" className="text-xs bg-secondary border border-gray-700/50 hover:bg-gray-800 text-gray-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-1">
          সকল দেখুন <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3"></div>
          <p className="text-sm">সাম্প্রতিক কাস্টমার লোড হচ্ছে...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center bg-background/30 rounded-xl border border-gray-800/50 border-dashed">
          <Users className="w-10 h-10 text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm font-medium mb-1">কোনো কাস্টমার পাওয়া যায়নি</p>
          <p className="text-gray-500 text-xs mb-4">এখানে দেখতে আপনার প্রথম কাস্টমার যোগ করুন।</p>
          <Link href="/customers" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
            কাস্টমার যুক্ত করুন
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile Card Layout (<640px) */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {customers.map((c) => {
              const statusInfo = getStatusBadge(c.status);
              return (
                <Link href={`/customers?customerId=${c.id}`} key={c.id} className="bg-secondary p-4 rounded-xl border border-gray-800/60 flex flex-col gap-3 hover:border-gray-700 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-purple-400 font-semibold text-sm truncate">{c.name}</h4>
                      {(c.deviceBrand || c.deviceType) && (
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                          <Tv className="w-3 h-3 text-gray-500 shrink-0" />
                          <span>{c.deviceBrand} {c.deviceType}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border shrink-0 ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">
                    <div>
                      {c.isBillPending ? (
                        <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-xs font-semibold">
                          ⏳ বিল পেন্ডিং
                        </span>
                      ) : (
                        <span className="text-gray-300 font-bold text-sm">
                          {formatCurrency(c.totalBill)}
                        </span>
                      )}
                    </div>
                    <div className="text-orange-400 text-xs font-medium flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-md">
                      <Star className="w-3 h-3 fill-orange-400" />
                      {c.points} pts
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop Table Layout (>=640px) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="text-gray-400 uppercase tracking-wider border-b border-gray-800 text-xs">
                  <th className="pb-3 font-medium min-w-[200px]">কাস্টমার ও ডিভাইস</th>
                  <th className="pb-3 font-medium min-w-[120px]">ফোন নম্বর</th>
                  <th className="pb-3 font-medium min-w-[100px]">মোট বিল</th>
                  <th className="pb-3 font-medium min-w-[80px]">পয়েন্ট</th>
                  <th className="pb-3 font-medium min-w-[130px]">কাজের অবস্থা</th>
                  <th className="pb-3 font-medium text-right pr-3 min-w-[90px]">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {customers.map((c) => {
                  const statusInfo = getStatusBadge(c.status);
                  return (
                    <tr key={c.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-3.5">
                        <div className="flex flex-col">
                          <span className="text-purple-400 font-semibold">{c.name}</span>
                          {(c.deviceBrand || c.deviceType) && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <Tv className="w-3 h-3 text-gray-500 shrink-0" />
                              <span className="truncate max-w-[220px]">
                                {c.deviceBrand} {c.deviceType} {c.deviceProblem ? `• ${c.deviceProblem}` : ''}
                              </span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 text-gray-300 font-medium">{c.phone}</td>
                      <td className="py-3.5">
                        {c.isBillPending ? (
                          <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-xs font-semibold">
                            ⏳ বিল পেন্ডিং
                          </span>
                        ) : (
                          <span className="text-gray-200 font-medium">
                            {formatCurrency(c.totalBill)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-orange-400 font-medium">
                        <div className="flex items-center gap-1.5 bg-orange-500/10 w-fit px-2 py-0.5 rounded-md border border-orange-500/20">
                          <Star className="w-3.5 h-3.5 fill-orange-400" />
                          {c.points}
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-3">
                        <Link 
                          href={`/customers?customerId=${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <span>বিস্তারিত</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </motion.div>
  );
}
