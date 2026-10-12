'use client';

import { Customer, RepairRecord, normalizePhone } from '@/lib/services/customer';
import { X, User, Phone, PhoneCall, MapPin, Tv, Shield, History, Coins } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface CustomerProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  allCustomers: Customer[];
  onOpenSetBill?: (customer: Customer) => void;
}

export function CustomerProfileSidebar({ isOpen, onClose, customer, allCustomers, onOpenSetBill }: CustomerProfileSidebarProps) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [isOpen]);

  if (!customer) return null;

  // Combine current active job and all historical repairs
  const rawHistory: (Customer | RepairRecord)[] = [
    customer,
    ...(customer.repairHistory || []),
    ...allCustomers.filter(c => c.id !== customer.id && normalizePhone(c.phone) === normalizePhone(customer.phone))
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
                  Customer Profile
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
                <h3 className="text-2xl font-bold text-white mb-4">{customer.name}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 text-gray-300">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-blue-400" />
                      </div>
                      <a 
                        href={`tel:${customer.phone}`} 
                        className="font-medium tracking-wide hover:text-blue-400 transition-colors"
                        title="Click to Call"
                      >
                        {customer.phone}
                      </a>
                    </div>
                    <a 
                      href={`tel:${customer.phone}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors shrink-0"
                      title="Call Customer"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-orange-400" />
                    </div>
                    <span className="text-sm">{customer.address}</span>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-gray-800 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Lifetime Value</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(totalSpent)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Loyalty Points</p>
                    <p className="text-lg font-bold text-blue-400">★ {customer.points || 0}</p>
                  </div>
                </div>
              </div>

              {/* Repair History List */}
              <div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <History className="w-4 h-4" />
                  Repair History ({history.length})
                </h4>
                
                <div className="space-y-4">
                  {history.map((job) => (
                    <div key={job.id} className={`relative p-5 rounded-xl border transition-all ${job.id === customer.id ? 'bg-blue-500/5 border-blue-500/30' : 'bg-secondary border-gray-800'}`}>
                      {job.id === customer.id && (
                        <div className="absolute top-0 right-6 -translate-y-1/2 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg">
                          Current Viewing
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Tv className="w-4 h-4 text-gray-400" />
                            <span className="font-bold text-gray-200">{job.deviceBrand || 'Unknown'} {job.deviceType}</span>
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
                              ⏳ বিল পেন্ডিং
                            </span>
                          ) : (
                            <p className="text-sm font-bold text-gray-200">{formatCurrency(job.totalBill)}</p>
                          )}
                          <p className={`text-[10px] font-bold mt-1 ${job.status === 'Delivered' ? 'text-emerald-500' : 'text-blue-400'}`}>
                            {job.status?.toUpperCase() || 'RECEIVED'}
                          </p>
                        </div>
                      </div>

                      {job.id === customer.id && customer.isBillPending && onOpenSetBill && (
                        <div className="mb-3">
                          <button 
                            type="button"
                            onClick={() => onOpenSetBill(customer)}
                            className="w-full py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>কাস্টমারের বিল নির্ধারণ করুন (Set Bill)</span>
                          </button>
                        </div>
                      )}

                      {job.warrantyMonths && (
                        <div className="mt-3 pt-3 border-t border-gray-800/50 flex items-center gap-2 text-xs text-purple-400 font-medium">
                          <Shield className="w-3.5 h-3.5" />
                          {job.warrantyMonths} Warranty Provided
                        </div>
                      )}

                      {job.partsUsed && job.partsUsed.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-800/50">
                          <h5 className="text-xs font-medium text-gray-400 mb-2">Parts Replaced / Used</h5>
                          <div className="space-y-1.5">
                            {job.partsUsed.map((part, i) => (
                              <div key={i} className="flex justify-between items-center text-xs">
                                <span className="text-gray-300">{part.quantity}x {part.name}</span>
                                <span className="text-gray-500 font-medium">{formatCurrency(part.price * part.quantity)}</span>
                              </div>
                            ))}
                            <div className="border-t border-gray-800 mt-2 pt-1 flex justify-between items-center text-[10px] text-gray-500">
                              <span>Total Parts Cost: {formatCurrency(job.totalCost || 0)}</span>
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
    </AnimatePresence>
  );
}
