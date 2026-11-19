'use client';

import { Customer, RepairRecord, normalizePhone } from '@/lib/services/customer';
import { X, User, Phone, PhoneCall, MapPin, Tv, Shield, History, Coins, UserCheck, Calendar, CalendarClock, TrendingUp, Link2, Copy } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { transactionService } from '@/lib/services/transaction';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAppStore } from '@/store/useAppStore';
import { getWarrantyStatus } from '@/lib/warranty';
import { RescheduleDeliveryModal } from '@/components/ui/RescheduleDeliveryModal';
import toast from 'react-hot-toast';

interface CustomerProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  allCustomers: Customer[];
  onOpenSetBill?: (customer: Customer) => void;
  onCustomerUpdated?: (updated: Customer) => void;
}

export function CustomerProfileSidebar({ isOpen, onClose, customer, allCustomers, onOpenSetBill, onCustomerUpdated }: CustomerProfileSidebarProps) {
  const { t, language } = useTranslation();
  const { user } = useAppStore();
  const isOwnerOrManager = user?.role === 'Owner' || user?.role === 'Manager';
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(customer);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [advanceReceivedByMap, setAdvanceReceivedByMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setCurrentCustomer(customer);
  }, [customer]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [isOpen]);

  useEffect(() => {
    if (!customer?.id) return;
    transactionService.getByCustomer(customer.id).then((transList) => {
      const map: Record<string, string> = {};
      transList.forEach(t => {
        if (t.receivedBy) {
          map[t.customerId] = t.receivedBy;
        }
      });
      setAdvanceReceivedByMap(map);
    }).catch(err => console.error("Error loading customer transactions:", err));
  }, [customer?.id]);

  if (!customer) return null;
  const activeCust = currentCustomer || customer;

  // Combine current active job and all historical repairs
  const rawHistory: (Customer | RepairRecord)[] = [
    activeCust,
    ...(activeCust.repairHistory || []),
    ...allCustomers.filter(c => c.id !== activeCust.id && normalizePhone(c.phone) === normalizePhone(activeCust.phone))
  ];

  // Deduplicate by id if needed
  const seenIds = new Set<string>();
  const history = rawHistory.filter(item => {
    const key = item.id || `${item.deviceBrand}_${item.serialNumber}_${item.totalBill}`;
    if (seenIds.has(key)) return false;
    seenIds.add(key);
    return true;
  });

  const totalSpent = history.reduce((sum, c) => sum + (c.totalBill || 0), 0);

  const getReceivedByDisplay = (job: Customer | RepairRecord) => {
    if (job.receivedByName) return job.receivedByName;
    if (job.receivedBy) {
      if (job.receivedBy.includes('@')) return job.receivedBy.split('@')[0];
      return job.receivedBy;
    }
    if (job.id && advanceReceivedByMap[job.id]) {
      const by = advanceReceivedByMap[job.id];
      if (by.includes('@')) return by.split('@')[0];
      return by;
    }
    if (job.servicedByName) return job.servicedByName;
    if (job.servicedBy) {
      if (job.servicedBy.includes('@')) return job.servicedBy.split('@')[0];
      return job.servicedBy;
    }
    return language === 'bn' ? 'শপ স্টাফ' : 'Shop Staff';
  };

  const formatJobDate = (createdAt: any) => {
    if (!createdAt) return '';
    try {
      let d: Date;
      if (typeof createdAt.toDate === 'function') {
        d = createdAt.toDate();
      } else if (createdAt.seconds) {
        d = new Date(createdAt.seconds * 1000);
      } else {
        d = new Date(createdAt);
      }
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          
          {/* Sidebar */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-popover border-l border-gray-800 shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-secondary">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  {language === 'bn' ? 'কাস্টমার প্রোফাইল' : 'Customer Profile'}
                </h2>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              
              {/* Profile Card */}
              <div className="bg-secondary rounded-xl p-5 border border-gray-800">
                <div className="flex items-center justify-between gap-2.5 mb-4 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-2xl font-bold text-white">{customer.name}</h3>
                    {customer.customId && (
                      <span 
                        className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/25 select-all" 
                        title="সার্ভিস / প্রোডাক্ট আইডি"
                      >
                        #{activeCust.customId}
                      </span>
                    )}
                  </div>

                  {/* Public Tracking Link Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        const trackUrl = `${window.location.origin}/track?id=${activeCust.customId || activeCust.id}`;
                        navigator.clipboard.writeText(trackUrl);
                        toast.success(language === 'bn' ? 'অনলাইন ট্র্যাকিং লিংক কপি হয়েছে!' : 'Tracking link copied!');
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold transition-colors shadow-sm"
                    title={language === 'bn' ? 'কাস্টমারের ট্র্যাকিং লিংক কপি করুন' : 'Copy Customer Tracking Link'}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ট্র্যাকিং লিংক' : 'Track Link'}</span>
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 text-gray-300">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-blue-400" />
                      </div>
                      <span 
                        className="font-medium tracking-wide text-gray-200 select-all"
                      >
                        {activeCust.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a 
                        href={`tel:${activeCust.phone}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                        title={language === 'bn' ? 'কাস্টমারকে কল দিন' : 'Call Customer'}
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'কল' : 'Call'}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setIsRescheduleOpen(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                        title={language === 'bn' ? 'ডেলিভারি তারিখ রিসিডিউল / পরিবর্তন' : 'Reschedule Delivery Date'}
                      >
                        <CalendarClock className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'রিসিডিউল' : 'Reschedule'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-orange-400" />
                    </div>
                    <span className="text-sm">{activeCust.address}</span>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-gray-800 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      {language === 'bn' ? 'মোট লেনদেন' : 'Total Lifetime Value'}
                    </p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(totalSpent)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      {language === 'bn' ? 'লয়ালটি পয়েন্ট' : 'Loyalty Points'}
                    </p>
                    <p className="text-lg font-bold text-blue-400">★ {customer.points || 0}</p>
                  </div>
                </div>
              </div>

              {/* Repair History List */}
              <div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <History className="w-4 h-4" />
                  {language === 'bn' ? 'মেরামতের ইতিহাস' : 'Repair History'} ({history.length})
                </h4>
                
                <div className="space-y-4">
                  {history.map((job) => (
                    <div key={job.id} className={`relative p-5 rounded-xl border transition-all ${job.id === customer.id ? 'bg-blue-500/5 border-blue-500/30' : 'bg-secondary border-gray-800'}`}>
                      {job.id === customer.id && (
                        <div className="absolute top-0 right-6 -translate-y-1/2 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg">
                          {language === 'bn' ? 'বর্তমান জব' : 'Current Viewing'}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Tv className="w-4 h-4 text-gray-400" />
                            <span className="font-bold text-gray-200">{job.deviceBrand || 'Unknown'} {job.deviceType}</span>
                            {job.customId && (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25 select-all" title="সার্ভিস / প্রোডাক্ট আইডি">
                                #{job.customId}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span className="bg-gray-800 px-2 py-0.5 rounded text-orange-400">{job.deviceProblem}</span>
                            {job.serialNumber && (
                              <span className="bg-gray-800/50 border border-gray-700/50 px-2 py-0.5 rounded font-mono text-gray-400">
                                SN: {job.serialNumber}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {job.isBillPending ? (
                            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full inline-block">
                              {language === 'bn' ? '⏳ বিল পেন্ডিং' : '⏳ Bill Pending'}
                            </span>
                          ) : (
                            <p className="text-sm font-bold text-gray-200">{formatCurrency(job.totalBill)}</p>
                          )}
                          <p className={`text-[10px] font-bold mt-1 ${job.status === 'Delivered' ? 'text-emerald-500' : 'text-blue-400'}`}>
                            {job.status?.toUpperCase() || 'RECEIVED'}
                          </p>
                        </div>
                      </div>

                      {/* Received By Staff & Date Badge */}
                      <div className="mt-2.5 pt-2.5 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <UserCheck className="w-3 h-3" />
                          </div>
                          <span className="text-[11px] text-gray-400">
                            {language === 'bn' ? 'রিসিভ করেছেন:' : 'Received by:'} <strong className="text-white font-semibold">{getReceivedByDisplay(job)}</strong>
                          </span>
                        </div>
                        {formatJobDate(job.createdAt) && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-800/60 px-2 py-0.5 rounded-md border border-gray-700/50">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span>{formatJobDate(job.createdAt)}</span>
                          </div>
                        )}
                        {(job as any).expectedDeliveryDate && (
                          <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border ${
                            (job as any).isRescheduled 
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          }`} title={(job as any).rescheduleNote ? `নোট: ${(job as any).rescheduleNote}` : undefined}>
                            <CalendarClock className="w-3 h-3" />
                            <span>
                              {(job as any).isRescheduled ? (language === 'bn' ? 'রিসিডিউল: ' : 'Rescheduled: ') : (language === 'bn' ? 'ডেলিভারি: ' : 'Delivery: ')}
                              {(job as any).expectedDeliveryDate}
                            </span>
                          </div>
                        )}
                      </div>

                      {job.id === activeCust.id && (
                        <div className="mt-2.5">
                          <button 
                            type="button"
                            onClick={() => setIsRescheduleOpen(true)}
                            className="w-full py-1.5 px-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-blue-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                            <span>{language === 'bn' ? 'ডেলিভারি তারিখ রিসিডিউল / পরিবর্তন' : 'Reschedule Delivery Date'}</span>
                          </button>
                        </div>
                      )}

                      {job.id === activeCust.id && activeCust.isBillPending && onOpenSetBill && (
                        <div className="mt-2.5 mb-1">
                          <button 
                            type="button"
                            onClick={() => onOpenSetBill(activeCust)}
                            className="w-full py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>{language === 'bn' ? 'কাস্টমারের বিল নির্ধারণ করুন (Set Bill)' : 'Set Customer Bill'}</span>
                          </button>
                        </div>
                      )}

                      {job.warrantyMonths ? (() => {
                        const w = getWarrantyStatus(
                          job.warrantyMonths, 
                          (job as any).deliveredAt || (job as any).completedAt, 
                          job.status
                        );
                        return (
                          <div className={`mt-3 pt-3 border-t border-gray-800/50 flex items-center gap-2 text-xs font-medium ${w.colorClass} px-2.5 py-1.5 rounded-lg border`}>
                            <Shield className="w-3.5 h-3.5 shrink-0" />
                            <span>{language === 'bn' ? w.displayBadgeText.bn : w.displayBadgeText.en}</span>
                          </div>
                        );
                      })() : null}

                      {job.partsUsed && job.partsUsed.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-800/50">
                          <h5 className="text-xs font-medium text-gray-400 mb-2">
                            {language === 'bn' ? 'ব্যবহৃত পার্টসসমূহ' : 'Parts Replaced / Used'}
                          </h5>
                          <div className="space-y-1.5">
                            {job.partsUsed.map((part, i) => (
                              <div key={i} className="flex justify-between items-center text-xs">
                                <span className="text-gray-300">{part.quantity}x {part.name}</span>
                                <span className="text-gray-500 font-medium">{formatCurrency(part.price * part.quantity)}</span>
                              </div>
                            ))}
                            <div className="border-t border-gray-800 mt-2 pt-1 flex justify-between items-center text-[10px] text-gray-500">
                              <span>{language === 'bn' ? 'মোট পার্টস খরচ:' : 'Total Parts Cost:'} {formatCurrency(job.totalCost || 0)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Feature 4: Job-Level Net Profit Analysis (Strictly restricted to Owner and Manager) */}
                      {isOwnerOrManager && !job.isBillPending && (
                        <div className="mt-3 pt-3 border-t border-gray-800/80 bg-emerald-950/20 rounded-xl p-3 border border-emerald-500/25">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span>{language === 'bn' ? 'মোট সার্ভিস বিল:' : 'Total Bill:'}</span>
                            <span className="font-semibold text-white">{formatCurrency(job.totalBill || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                            <span>{language === 'bn' ? 'পার্টসের ক্রয়মূল্য (খরচ):' : 'Parts Cost:'}</span>
                            <span className="font-medium text-rose-400">-{formatCurrency(job.totalCost || 0)}</span>
                          </div>
                          <div className="pt-1.5 border-t border-emerald-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span className="text-xs font-bold">
                                {language === 'bn' ? 'এই জবে নিট লাভ:' : 'Job Net Profit:'}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-emerald-400">
                                {formatCurrency(Math.max(0, (job.totalBill || 0) - (job.totalCost || 0)))}
                              </span>
                              {Boolean(job.totalBill && job.totalBill > 0) && (
                                <span className="text-[10px] text-emerald-300/80 ml-1.5 font-bold">
                                  ({Math.round(((job.totalBill - (job.totalCost || 0)) / job.totalBill) * 100)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}

      {customer && (
        <RescheduleDeliveryModal
          isOpen={isRescheduleOpen}
          onClose={() => setIsRescheduleOpen(false)}
          customer={activeCust}
          onSuccess={(updated) => {
            setCurrentCustomer(updated);
            onCustomerUpdated?.(updated);
          }}
        />
      )}
    </AnimatePresence>
  );
}
