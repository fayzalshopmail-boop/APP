'use client';

import { Customer, RepairRecord, normalizePhone } from '@/lib/services/customer';
import { X, User, Phone, PhoneCall, MapPin, Tv, Shield, History, Coins, UserCheck, Calendar, CalendarClock, TrendingUp, Link2, Copy, MessageCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { transactionService } from '@/lib/services/transaction';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAppStore } from '@/store/useAppStore';
import { getWarrantyStatus } from '@/lib/warranty';
import { RescheduleDeliveryModal } from '@/components/ui/RescheduleDeliveryModal';
import { getTrackingUrl } from '@/lib/trackingToken';
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

  // Deduplicate and generate guaranteed stable unique keys for each record
  const seenKeys = new Set<string>();
  const history = rawHistory
    .map((item, index) => {
      const validId = (item.id && typeof item.id === 'string' && item.id.trim() !== '') ? item.id.trim() : null;
      const customId = (item as any).customId ? `cid-${(item as any).customId}` : '';
      const brand = item.deviceBrand || '';
      const serial = item.serialNumber || '';
      const total = item.totalBill ?? '';
      const stableKey = validId || `hist_${customId}_${brand}_${serial}_${total}_${index}`;
      return { ...item, _stableKey: stableKey };
    })
    .filter(item => {
      if (seenKeys.has(item._stableKey)) return false;
      seenKeys.add(item._stableKey);
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
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            key="customer-sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
        )}
        
        {isOpen && (
          <motion.div 
            key="customer-sidebar-panel"
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
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-5">
              
              {/* Profile Card */}
              <div className="bg-gradient-to-br from-secondary via-secondary/95 to-[#131627] rounded-xl p-3.5 sm:p-4 border border-gray-800 shadow-xl relative overflow-hidden space-y-3">
                {/* Subtle Ambient Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

                {/* Top Row: Name, ID and Secret Tracking Link */}
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20 shrink-0">
                      {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate leading-tight">
                          {customer.name}
                        </h3>
                        {activeCust.customId && (
                          <span 
                            className="font-mono text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 select-all" 
                            title="সার্ভিস / প্রোডাক্ট আইডি"
                          >
                            #{activeCust.customId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Secret Tracking Link (Top-Right) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        const trackUrl = getTrackingUrl(window.location.origin, activeCust);
                        navigator.clipboard.writeText(trackUrl);
                        toast.success(language === 'bn' ? 'সিক্রেট ট্র্যাকিং লিংক কপি হয়েছে!' : 'Secret tracking link copied!');
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/35 text-indigo-300 hover:text-white text-xs font-semibold transition-all shadow-sm active:scale-95 shrink-0 group"
                    title={language === 'bn' ? 'কাস্টমারের সিক্রেট ট্র্যাকিং লিংক কপি করুন' : 'Copy Customer Secret Tracking Link'}
                  >
                    <Link2 className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-45 transition-transform" />
                    <span>{language === 'bn' ? 'সিক্রেট লিংক' : 'Secret Link'}</span>
                  </button>
                </div>

                {/* Contact Box: Phone + Call + WhatsApp & Address */}
                <div className="bg-[#121524]/90 p-2.5 rounded-lg border border-gray-800/80 space-y-1.5 relative z-10">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-gray-200 min-w-0">
                      <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="font-mono font-semibold text-xs sm:text-sm tracking-wide select-all text-white">
                        {activeCust.phone}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a 
                        href={`tel:${activeCust.phone}`}
                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[11px] font-semibold transition-all active:scale-95 shadow-sm"
                        title={language === 'bn' ? 'কাস্টমারকে কল দিন' : 'Call Customer'}
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>{language === 'bn' ? 'কল' : 'Call'}</span>
                      </a>

                      {(() => {
                        const trackUrl = getTrackingUrl(
                          typeof window !== 'undefined' ? window.location.origin : '',
                          activeCust
                        );
                        const waText = `হ্যালো ${activeCust.name || 'গ্রাহক'}, VVSC তে আপনার ${activeCust.deviceBrand || ''} ${activeCust.deviceType || 'ডিভাইস'} (আইডি: #${activeCust.customId || ''}) মেরামতের লাইভ অবস্থা ও ইনভয়েস দেখতে নিচের লিংকে ক্লিক করুন:\n${trackUrl}`;
                        return (
                          <a
                            href={`https://wa.me/${activeCust.phone.replace(/\D/g, '')}?text=${encodeURIComponent(waText)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-md text-[11px] font-semibold transition-all active:scale-95 shadow-sm"
                            title={language === 'bn' ? 'হোয়াটসঅ্যাপে ট্র্যাকিং পাঠান' : 'Send WhatsApp Tracking'}
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        );
                      })()}
                    </div>
                  </div>

                  {activeCust.address && (
                    <div className="flex items-center gap-2 text-gray-400 text-[11px] pt-1 border-t border-gray-800/50">
                      <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
                      <span className="truncate">{activeCust.address}</span>
                    </div>
                  )}
                </div>

                {/* Inline Stats: Lifetime Value & Points */}
                <div className="pt-2 border-t border-gray-800/70 flex items-center justify-between text-xs relative z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                      {language === 'bn' ? 'মোট লেনদেন:' : 'Lifetime:'}
                    </span>
                    <span className="font-bold text-emerald-400 text-xs sm:text-sm">
                      {formatCurrency(totalSpent)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                      {language === 'bn' ? 'লয়ালটি পয়েন্ট:' : 'Points:'}
                    </span>
                    <span className="font-bold text-blue-400 text-xs sm:text-sm">
                      ★ {customer.points || 0}
                    </span>
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
                  {history.map((job, idx) => {
                    const isCurrentJob = Boolean(activeCust.id && job.id && activeCust.id === job.id);
                    return (
                    <div key={(job as any)._stableKey || job.id || `job-${idx}`} className={`relative p-5 rounded-xl border transition-colors ${isCurrentJob ? 'bg-blue-500/5 border-blue-500/30' : 'bg-secondary border-gray-800'}`}>
                      {isCurrentJob && (
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
                            <span className="bg-gray-800 px-2 py-0.5 rounded text-orange-400">
                              {job.deviceProblem}
                              {job.displayAction && ` (${job.displayAction})`}
                            </span>
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

                      {/* Received By Staff & Creation Date Badge */}
                      <div className="mt-3 pt-3 border-t border-gray-800/80 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-300 min-w-0">
                          <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <UserCheck className="w-3 h-3" />
                          </div>
                          <span className="text-[11px] text-gray-400 truncate">
                            {language === 'bn' ? 'রিসিভ করেছেন:' : 'Received by:'} <strong className="text-white font-semibold">{getReceivedByDisplay(job)}</strong>
                          </span>
                        </div>
                        {formatJobDate(job.createdAt) && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-800/60 px-2 py-0.5 rounded-md border border-gray-700/50 shrink-0">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span>{formatJobDate(job.createdAt)}</span>
                          </div>
                        )}
                      </div>

                      {/* Delivery Date & Reschedule Action */}
                      {(job as any).expectedDeliveryDate && (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-[#141824] border border-gray-800 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
                              (job as any).isRescheduled 
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                                : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                            }`}>
                              <CalendarClock className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                                {(job as any).isRescheduled 
                                  ? (language === 'bn' ? 'রিসিডিউল ডেলিভারি' : 'Rescheduled Delivery') 
                                  : (language === 'bn' ? 'সম্ভাব্য ডেলিভারি' : 'Expected Delivery')}
                              </span>
                              <span className={`text-xs font-bold ${(job as any).isRescheduled ? 'text-amber-400' : 'text-blue-300'}`}>
                                {(job as any).expectedDeliveryDate}
                              </span>
                            </div>
                          </div>

                          {isCurrentJob && (
                            <button 
                              type="button"
                              onClick={() => setIsRescheduleOpen(true)}
                              className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shrink-0 active:scale-95"
                              title={language === 'bn' ? 'ডেলিভারি তারিখ পরিবর্তন করুন' : 'Reschedule Delivery Date'}
                            >
                              <CalendarClock className="w-3 h-3" />
                              <span>{language === 'bn' ? 'রিসিডিউল' : 'Reschedule'}</span>
                            </button>
                          )}
                        </div>
                      )}

                      {isCurrentJob && activeCust.isBillPending && onOpenSetBill && (
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
                              <div key={`part-${part.name || 'item'}-${i}`} className="flex justify-between items-center text-xs">
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
                  );
                })}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </>
  );
}
