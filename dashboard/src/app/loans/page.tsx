'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, Plus, ArrowUpRight, ArrowDownRight, Edit2, Trash2, 
  CheckCircle, Coins, CalendarClock, History, MessageSquare, Phone, 
  Search, X, Filter, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { loanService, Loan } from '@/lib/services/loan';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { getLocalDateString } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import toast from "react-hot-toast";

type FilterType = 'all' | 'pending' | 'paid' | 'given' | 'taken';

export default function LoansPage() {
  const { user } = useAppStore();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyModalData, setHistoryModalData] = useState<Loan | null>(null);
  const [sendingSmsId, setSendingSmsId] = useState<string | null>(null);

  // Partial Payment Modal State
  const [paymentModalData, setPaymentModalData] = useState<Loan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [nextDate, setNextDate] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    personName: '',
    phone: '+880',
    type: 'Given' as 'Given' | 'Taken',
    amount: 0,
    paidAmount: 0,
    status: 'Pending' as 'Pending' | 'Paid',
    notes: '',
    nextPaymentDate: '',
    date: getLocalDateString()
  });

  // Popstate Modal Management
  useEffect(() => {
    const handlePopState = () => {
      if (isModalOpen) setIsModalOpen(false);
      if (paymentModalData) setPaymentModalData(null);
      if (historyModalData) setHistoryModalData(null);
    };
    
    if (isModalOpen || paymentModalData || historyModalData) {
      window.history.pushState({ modal: 'loans-modal' }, '');
      window.addEventListener('popstate', handlePopState);
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isModalOpen, paymentModalData, historyModalData]);

  const closeLoanModal = () => {
    setIsModalOpen(false);
    setEditingLoan(null);
    if (window.history.state?.modal === 'loans-modal') window.history.back();
  };

  const closePaymentModal = () => {
    setPaymentModalData(null);
    setPaymentAmount(0);
    setNextDate('');
    setPaymentNote('');
    if (window.history.state?.modal === 'loans-modal') window.history.back();
  };

  const closeHistoryModal = () => {
    setHistoryModalData(null);
    if (window.history.state?.modal === 'loans-modal') window.history.back();
  };

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const data = await loanService.getAll();
      setLoans(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load loan records.");
    } finally {
      setLoading(false);
    }
  };

  // Open Modal (Bug Fixed: properly populates fields when editing)
  const handleOpenModal = (loan?: Loan) => {
    if (loan) {
      setEditingLoan(loan);
      setFormData({
        personName: loan.personName || '',
        phone: loan.phone || '+880',
        type: loan.type || 'Given',
        amount: loan.amount || 0,
        paidAmount: loan.paidAmount || 0,
        status: loan.status || 'Pending',
        notes: loan.notes || '',
        nextPaymentDate: loan.nextPaymentDate || '',
        date: loan.date || getLocalDateString()
      });
    } else {
      setEditingLoan(null);
      setFormData({
        personName: '',
        phone: '+880',
        type: 'Given',
        amount: 0,
        paidAmount: 0,
        status: 'Pending',
        notes: '',
        nextPaymentDate: '',
        date: getLocalDateString()
      });
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  // Topbar "+ Add Record" button integration
  useEffect(() => {
    const handleOpenAdd = () => {
      handleOpenModal();
    };
    window.addEventListener('app:add-loan', handleOpenAdd);
    return () => window.removeEventListener('app:add-loan', handleOpenAdd);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.personName.trim() || formData.amount <= 0) {
      return toast.error("Please fill required fields properly.");
    }

    try {
      if (editingLoan) {
        await loanService.update(editingLoan.id, formData);
        setLoans(prev => prev.map(l => l.id === editingLoan.id ? { ...l, ...formData } as Loan : l));
        toast.success("Loan updated!");
      } else {
        const newId = await loanService.add(formData);
        const newLoan: Loan = { 
          id: newId, 
          ...formData, 
          paidAmount: 0,
          history: [{
            amount: formData.amount,
            date: new Date().toISOString(),
            type: formData.type,
            note: 'Initial entry'
          }],
          createdAt: new Date() 
        };
        setLoans(prev => [newLoan, ...prev]);
        toast.success("Loan recorded!");
      }
      closeLoanModal();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save loan.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await loanService.delete(id);
      setLoans(prev => prev.filter(l => l.id !== id));
      toast.success("Loan deleted!");
      setDeleteId(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete loan.");
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalData || paymentAmount <= 0) return toast.error("Enter a valid amount");
    
    const remaining = paymentModalData.amount - (paymentModalData.paidAmount || 0);
    if (paymentAmount > remaining) return toast.error(`Amount cannot exceed the remaining due (${remaining})`);

    try {
      const { newPaid, status } = await loanService.addPayment(
        paymentModalData.id, 
        paymentModalData.paidAmount || 0, 
        paymentAmount, 
        paymentModalData.amount,
        paymentAmount < remaining ? nextDate : undefined,
        paymentModalData.type,
        paymentNote.trim() || undefined,
        user?.email || user?.name || 'Owner',
        paymentModalData.personName
      );
      
      setLoans(prev => prev.map(l => l.id === paymentModalData.id ? { 
        ...l, 
        paidAmount: newPaid, 
        status, 
        nextPaymentDate: status === 'Paid' ? undefined : (paymentAmount < remaining && nextDate ? nextDate : l.nextPaymentDate),
        history: [
          ...(l.history || []),
          {
            amount: paymentAmount,
            date: new Date().toISOString(),
            type: 'Payment',
            note: paymentNote.trim() || (paymentModalData.type === 'Taken' ? 'দেনা পরিশোধ করা হয়েছে' : 'পাওনা টাকা আদায় হয়েছে')
          }
        ]
      } : l));
      
      toast.success("Payment recorded!");
      closePaymentModal();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add payment.");
    }
  };

  const handleSendSms = async (loan: Loan) => {
    try {
      setSendingSmsId(loan.id);
      const { smsConfigService } = await import('@/lib/services/smsConfig');
      const { sendSMS } = await import('@/lib/sms');
      const { useAppStore } = await import('@/store/useAppStore');
      const shopName = useAppStore.getState().shop?.shopName || 'আমাদের শপ';
      
      const smsSettings = await smsConfigService.getSettings();
      if (!smsSettings.enabled || !smsSettings.apiKey || !smsSettings.senderId) {
        toast.error("SMS is disabled or not configured.");
        return;
      }
      
      let phone = loan.phone;
      if (phone && !phone.startsWith('+880') && phone.length === 11) {
        phone = '+880' + phone.substring(1);
      } else if (phone && !phone.startsWith('+880') && phone.length === 10) {
        phone = '+880' + phone;
      }
      
      if (!phone || phone.length < 11) {
        const manualPhone = window.prompt(`Enter mobile number for ${loan.personName} to send SMS:`, loan.phone || "");
        if (!manualPhone || manualPhone.replace(/\D/g, '').length < 10) {
          toast.error("Valid phone number required.");
          return;
        }
        let clean = manualPhone.replace(/\D/g, '');
        if (clean.startsWith('880')) clean = clean.substring(3);
        if (clean.startsWith('0')) clean = clean.substring(1);
        phone = '+880' + clean;
      }

      const dueAmount = loan.amount - (loan.paidAmount || 0);
      let template = loan.type === 'Given' ? smsSettings.loanGivenTemplate : smsSettings.loanTakenTemplate;
      
      if (!template) {
        template = loan.type === 'Given'
          ? 'জনাব {name}, {shop} এ আপনার ধার/পাওনা বাবদ {due} টাকা বাকি রয়েছে। অতিসত্বর পরিশোধ করার অনুরোধ করা হলো।'
          : 'জনাব {name}, {shop} আপনার থেকে নেওয়া ধার বাবদ {due} টাকা বাকি রয়েছে। অতিসত্বর পরিশোধ করা হবে। ধন্যবাদ।';
      }
      
      const msg = template
        .replace(/{name}/g, loan.personName || '')
        .replace(/{due}/g, `${dueAmount}`)
        .replace(/{shop}/g, shopName || '');
      
      const result = await sendSMS([phone], msg, smsSettings.apiKey, smsSettings.senderId, smsSettings.apiUrl);
      if (result.success) {
        toast.success("SMS Reminder sent!");
      } else {
        toast.error("Failed to send SMS.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error sending SMS.");
    } finally {
      setSendingSmsId(null);
    }
  };

  // Financial Summaries
  const pendingGiven = useMemo(() => {
    return loans.filter(l => l.type === 'Given' && l.status === 'Pending').reduce((acc, l) => acc + (l.amount - (l.paidAmount || 0)), 0);
  }, [loans]);

  const pendingTaken = useMemo(() => {
    return loans.filter(l => l.type === 'Taken' && l.status === 'Pending').reduce((acc, l) => acc + (l.amount - (l.paidAmount || 0)), 0);
  }, [loans]);

  // Unified Search and Filter
  const filteredLoans = useMemo(() => {
    return loans.filter(loan => {
      // Filter tab
      if (activeFilter === 'pending' && loan.status !== 'Pending') return false;
      if (activeFilter === 'paid' && loan.status !== 'Paid') return false;
      if (activeFilter === 'given' && loan.type !== 'Given') return false;
      if (activeFilter === 'taken' && loan.type !== 'Taken') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = loan.personName.toLowerCase().includes(q);
        const matchesPhone = loan.phone ? loan.phone.includes(q) : false;
        const matchesNotes = loan.notes ? loan.notes.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesPhone && !matchesNotes) return false;
      }

      return true;
    });
  }, [loans, activeFilter, searchQuery]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredLoans.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedLoans = filteredLoans.slice(startIndex, endIndex);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  // Adjust page if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (typeof window !== 'undefined') {
      const el = document.getElementById('loans-list-container');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const getPageNumbers = (isMobile: boolean = false) => {
    if (isMobile) {
      if (totalPages <= 4) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }
      if (currentPage <= 2) {
        return [1, 2, 3, '...', totalPages];
      }
      if (currentPage >= totalPages - 1) {
        return [1, '...', totalPages - 2, totalPages - 1, totalPages];
      }
      return [1, '...', currentPage, '...', totalPages];
    }

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className="space-y-3 sm:space-y-6 max-w-[1600px] mx-auto pb-6 sm:pb-10 px-1 sm:px-0">
      
      {/* 2 Core Summary Cards (Compact 2-col on mobile to prevent excessive scrolling) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-6">
        {/* Total Money Given (পাবো) */}
        <div className="bg-[#1a1d2d]/60 border border-orange-500/25 rounded-xl sm:rounded-2xl p-3 sm:p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-1 sm:mb-4">
            <p className="text-[11px] sm:text-sm font-medium text-gray-400 truncate">পাবো (Given)</p>
            <div className="p-1 sm:p-2 bg-orange-500/10 rounded-lg shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
            </div>
          </div>
          <h3 className="text-base sm:text-3xl font-bold text-orange-400 truncate">{formatCurrency(pendingGiven)}</h3>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1 hidden sm:block">অন্যদের কাছে মোট বাকি পাওনা</p>
        </div>

        {/* Total Money Taken (দিতে হবে) */}
        <div className="bg-[#1a1d2d]/60 border border-red-500/25 rounded-xl sm:rounded-2xl p-3 sm:p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-1 sm:mb-4">
            <p className="text-[11px] sm:text-sm font-medium text-gray-400 truncate">দিতে হবে (Taken)</p>
            <div className="p-1 sm:p-2 bg-red-500/10 rounded-lg shrink-0">
              <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
            </div>
          </div>
          <h3 className="text-base sm:text-3xl font-bold text-red-400 truncate">{formatCurrency(pendingTaken)}</h3>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1 hidden sm:block">অন্যদের কাছে মোট বাকি দেনা</p>
        </div>
      </div>

      {/* Search & Filter Header Card */}
      <div id="loans-list-container" className="bg-card border border-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0" />
            <h2 className="text-sm sm:text-lg font-semibold text-gray-200 truncate">সকল খতিয়ান</h2>
            <span className="text-[10px] sm:text-xs text-gray-400 bg-secondary px-2 py-0.5 rounded-full border border-gray-800 shrink-0">
              {filteredLoans.length}
            </span>
          </div>

          {/* Search Box & Filter Chips */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="নাম, ফোন বা নোট খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 sm:h-9 bg-secondary/80 border-gray-800 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm focus:border-blue-500 w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Filter Chips (Horizontal compact scrollable on mobile) */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none w-full sm:w-auto">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-medium transition-colors shrink-0 ${
                  activeFilter === 'all' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter('pending')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-medium transition-colors shrink-0 ${
                  activeFilter === 'pending' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-gray-400 hover:text-white'
                }`}
              >
                বাকি
              </button>
              <button
                onClick={() => setActiveFilter('paid')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-medium transition-colors shrink-0 ${
                  activeFilter === 'paid' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-gray-400 hover:text-white'
                }`}
              >
                পরিশোধিত
              </button>
              <button
                onClick={() => setActiveFilter('given')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-medium transition-colors shrink-0 ${
                  activeFilter === 'given' ? 'bg-orange-500/20 text-orange-400 font-semibold' : 'text-gray-400 hover:text-white'
                }`}
              >
                পাবো
              </button>
              <button
                onClick={() => setActiveFilter('taken')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-medium transition-colors shrink-0 ${
                  activeFilter === 'taken' ? 'bg-red-500/20 text-red-400 font-semibold' : 'text-gray-400 hover:text-white'
                }`}
              >
                দিতে হবে
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Mobile Individual Cards (<640px) - Separate cards like Customers page */}
      <div className="block sm:hidden space-y-2.5">
        {loading ? (
          <div className="bg-card rounded-xl border border-gray-800 p-8 text-center text-gray-500 text-xs">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
            <p>রেকর্ড লোড হচ্ছে...</p>
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="bg-card rounded-xl border border-gray-800 p-8 text-center text-gray-500 text-xs">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>কোনো রেকর্ড পাওয়া যায়নি।</p>
          </div>
        ) : (
          <>
            {paginatedLoans.map((l) => {
              const remainingDue = l.amount - (l.paidAmount || 0);
              const isPaid = l.status === 'Paid' || remainingDue <= 0;
              const isGiven = l.type === 'Given';

              return (
                <div 
                  key={l.id} 
                  className="bg-card border border-gray-800/80 rounded-xl p-3.5 shadow-sm space-y-2.5 hover:border-gray-700/80 transition-all"
                >
                  {/* Top Row: Name, Phone & Date | Type & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-sm truncate max-w-[170px]">{l.personName}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                          isGiven ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                          {isGiven ? 'পাবো' : 'দিতে হবে'}
                        </span>
                        {isPaid && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            পরিশোধিত
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                        {l.phone && (
                          <a href={`tel:${l.phone}`} className="text-blue-400 hover:underline flex items-center gap-1 font-medium">
                            <Phone className="w-3 h-3 text-blue-400" />
                            <span>{l.phone}</span>
                          </a>
                        )}
                        <span>• {l.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Appliance / Details style strip: Notes & Due Date */}
                  {(l.notes || (!isPaid && l.nextPaymentDate)) && (
                    <div className="bg-[#101322] rounded-lg px-2.5 py-1.5 border border-gray-800/70 text-xs flex items-center justify-between gap-2">
                      {l.notes ? (
                        <p className="text-[11px] text-gray-400 truncate italic flex-1">
                          {l.notes}
                        </p>
                      ) : <span />}
                      {!isPaid && l.nextPaymentDate && (
                        <span className="text-[10px] text-blue-400 font-medium flex items-center gap-1 shrink-0 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                          <CalendarClock className="w-3 h-3" />
                          তাগাদা: {l.nextPaymentDate}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Financials Strip (Exact Sleek Horizontal Bar from Customers Page) */}
                  <div className="flex items-center justify-between bg-secondary/40 rounded-lg px-2.5 py-1.5 text-xs border border-gray-800/50">
                    <div className="flex items-center gap-2.5 text-[11px]">
                      <span className="text-gray-400">
                        মোট: <strong className="font-semibold text-gray-200">{formatCurrency(l.amount)}</strong>
                      </span>
                      {(l.paidAmount || 0) > 0 && (
                        <span className="text-gray-400">
                          পরিশোধ: <strong className="font-medium text-emerald-400">{formatCurrency(l.paidAmount || 0)}</strong>
                        </span>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-0.5 font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px]">
                          পরিশোধিত ✓
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 font-bold ${
                          isGiven ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'
                        } px-2 py-0.5 rounded-full text-[11px]`}>
                          বাকি: {formatCurrency(remainingDue)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions toolbar */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-gray-800/50">
                    <div>
                      {!isPaid ? (
                        <Button 
                          size="sm"
                          onClick={() => { setPaymentModalData(l); setNextDate(''); setPaymentNote(''); }}
                          className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-1"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>পরিশোধ</span>
                        </Button>
                      ) : (
                        <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> পরিশোধিত
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!isPaid && (
                        <Button 
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSendSms(l)}
                          disabled={sendingSmsId === l.id}
                          className="h-7 w-7 p-0 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg"
                          title="SMS পাঠান"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button 
                        size="sm"
                        variant="ghost"
                        onClick={() => setHistoryModalData(l)}
                        className="h-7 w-7 p-0 text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                        title="হিস্ট্রি"
                      >
                        <History className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenModal(l)}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-white rounded-lg"
                        title="এডিট"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(l.id)}
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                        title="ডিলিট"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Mobile Pagination Card */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-2 pt-3 pb-3 px-3 bg-card border border-gray-800/80 rounded-xl shadow-sm">
                <div className="text-[11px] text-gray-400">
                  দেখাচ্ছে <span className="font-semibold text-white">{startIndex + 1}</span> - <span className="font-semibold text-white">{Math.min(endIndex, filteredLoans.length)}</span> / মোট <span className="font-semibold text-white">{filteredLoans.length}</span> টি
                  <span className="text-gray-500 ml-1">({currentPage}/{totalPages} পৃষ্ঠা)</span>
                </div>

                <div className="flex items-center gap-1 flex-wrap justify-center">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="h-7 w-7 bg-card border-gray-800 text-gray-300 hover:text-white hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded-md p-0"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>

                  {getPageNumbers(true).map((pageNum, idx) => {
                    if (pageNum === '...') {
                      return (
                        <span key={`mobile-ellipsis-${idx}`} className="px-1 text-gray-500 text-xs select-none">
                          ...
                        </span>
                      );
                    }
                    const page = Number(pageNum);
                    const isActive = currentPage === page;
                    return (
                      <button
                        key={`mobile-page-${page}`}
                        onClick={() => handlePageChange(page)}
                        className={`h-7 min-w-[28px] px-1.5 rounded-md text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                            : 'bg-card border border-gray-800 text-gray-300 hover:text-white hover:bg-secondary hover:border-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="h-7 w-7 bg-card border-gray-800 text-gray-300 hover:text-white hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded-md p-0"
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 2. Desktop Table View (>=640px) */}
      <div className="hidden sm:block bg-card border border-gray-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-7 h-7 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">রেকর্ড লোড হচ্ছে...</p>
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">কোনো রেকর্ড পাওয়া যায়নি।</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] relative">
              <table className="w-full whitespace-nowrap">
                <thead className="bg-background/50">
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-800/50">
                    <th className="px-6 py-4">Person/Entity</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Total Amount</th>
                    <th className="px-6 py-4">Remaining Due</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {paginatedLoans.map((l) => {
                    const remainingDue = l.amount - (l.paidAmount || 0);
                    const isPaid = l.status === 'Paid' || remainingDue <= 0;
                    const isGiven = l.type === 'Given';

                    return (
                      <tr key={l.id} className="hover:bg-gray-800/20 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-200">
                          <div className="font-semibold text-white">{l.personName}</div>
                          {l.phone && (
                            <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-gray-500" />
                              {l.phone}
                            </span>
                          )}
                          {l.notes && <p className="text-xs text-gray-500 font-normal mt-0.5 truncate max-w-[200px]">{l.notes}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded ${
                            isGiven ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {isGiven ? 'Given (পাবো)' : 'Taken (দিতে হবে)'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-200">{formatCurrency(l.amount)}</td>
                        <td className="px-6 py-4">
                          <div className={`text-sm font-bold ${isPaid ? 'text-emerald-400' : 'text-yellow-500'}`}>
                            {isPaid ? formatCurrency(0) : formatCurrency(remainingDue)}
                          </div>
                          {!isPaid && l.nextPaymentDate && (
                            <div className="flex items-center gap-1 text-xs text-blue-400 mt-1">
                              <CalendarClock className="w-3 h-3" />
                              Next: {l.nextPaymentDate}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {l.date}
                          {isPaid && (
                            <span className="block mt-1 text-xs font-medium px-2 py-0.5 rounded w-fit bg-emerald-500/10 text-emerald-400">
                              Paid
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {!isPaid && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => { setPaymentModalData(l); setNextDate(''); setPaymentNote(''); }} 
                                  className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10" 
                                  title="Add Payment (পরিশোধ)"
                                >
                                  <Coins className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleSendSms(l)} 
                                  disabled={sendingSmsId === l.id} 
                                  className="h-8 w-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10" 
                                  title="Send SMS Reminder"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setHistoryModalData(l)} 
                              className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10" 
                              title="View History"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleOpenModal(l)} 
                              className="h-8 w-8 text-gray-400 hover:text-white" 
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setDeleteId(l.id)} 
                              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10" 
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Desktop Pagination (>=640px) */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-800/80 bg-secondary/20">
                <div className="text-xs text-gray-400">
                  Showing <span className="font-semibold text-white">{startIndex + 1}</span> to <span className="font-semibold text-white">{Math.min(endIndex, filteredLoans.length)}</span> of <span className="font-semibold text-white">{filteredLoans.length}</span> records
                  <span className="text-gray-500 ml-1.5">(Page {currentPage} of {totalPages})</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 bg-card border-gray-800 text-gray-300 hover:text-white hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {getPageNumbers(false).map((pageNum, idx) => {
                    if (pageNum === '...') {
                      return (
                        <span key={`desktop-ellipsis-${idx}`} className="px-1 text-gray-500 text-xs select-none">
                          ...
                        </span>
                      );
                    }
                    const page = Number(pageNum);
                    const isActive = currentPage === page;
                    return (
                      <button
                        key={`desktop-page-${page}`}
                        onClick={() => handlePageChange(page)}
                        className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                            : 'bg-card border border-gray-800 text-gray-300 hover:text-white hover:bg-secondary hover:border-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 bg-card border-gray-800 text-gray-300 hover:text-white hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Partial Payment Modal */}
      <Dialog open={!!paymentModalData} onOpenChange={(open) => !open && closePaymentModal()}>
        <DialogContent className="w-[95vw] sm:max-w-[400px] max-h-[90vh] overflow-y-auto bg-popover border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Add Payment (পরিশোধ)</DialogTitle>
            <DialogDescription className="text-gray-400">
              {paymentModalData?.personName} ({paymentModalData?.type === 'Given' ? 'পাবো' : 'দিতে হবে'})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-4 pt-4">
            <div className="bg-gray-800/50 p-4 rounded-lg flex justify-between items-center mb-4 border border-gray-700">
              <span className="text-sm text-gray-400">Remaining Due:</span>
              <span className="text-lg font-bold text-yellow-500">
                {paymentModalData ? formatCurrency(paymentModalData.amount - (paymentModalData.paidAmount || 0)) : 0}
              </span>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Payment Amount <span className="text-red-400">*</span></label>
              <Input 
                type="number"
                required min="1"
                max={paymentModalData ? (paymentModalData.amount - (paymentModalData.paidAmount || 0)) : undefined}
                value={paymentAmount || ''}
                onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
                placeholder="Amount..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Note (Optional)</label>
              <Input 
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Cash / bKash / remarks..."
              />
            </div>
            
            {/* Show Next Payment Date ONLY if amount entered is less than remaining due */}
            {paymentModalData && paymentAmount > 0 && paymentAmount < (paymentModalData.amount - (paymentModalData.paidAmount || 0)) && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-1.5 pt-2"
              >
                <label className="text-xs font-medium text-blue-400 flex items-center gap-1">
                  <CalendarClock className="w-3 h-3" /> Next Payment Date (পরবর্তী তারিখ)
                </label>
                <Input 
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  className="w-full bg-background border border-blue-500/30 focus:border-blue-500 text-white px-3 py-2 rounded-lg"
                />
              </motion.div>
            )}

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={closePaymentModal}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Save Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Modal (Bug Fixed: Perfectly populates on Edit) */}
      <Dialog open={isModalOpen} onOpenChange={(v) => !v && closeLoanModal()}>
        <DialogContent className="w-[95vw] sm:max-w-[425px] max-h-[90vh] overflow-y-auto bg-popover border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {editingLoan ? 'Edit Record' : 'Add New Record'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Track money given or taken.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Person / Entity Name <span className="text-red-400">*</span></label>
              <Input 
                required
                value={formData.personName}
                onChange={(e) => setFormData({...formData, personName: e.target.value})}
                placeholder="Name..."
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Phone Number (Optional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <span className="absolute left-9 top-1/2 -translate-y-1/2 font-medium text-gray-300 pointer-events-none text-xs">+880</span>
                <Input 
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="tel"
                  maxLength={25}
                  value={formData.phone ? formData.phone.replace(/^\+880/, '') : ''}
                  onChange={(e) => {
                    let digits = e.target.value.replace(/\D/g, ''); 
                    if (digits.startsWith('880')) digits = digits.slice(3);
                    else if (digits.startsWith('88')) digits = digits.slice(2);
                    if (digits.startsWith('0')) digits = digits.slice(1);
                    if (digits.length > 10) digits = digits.slice(0, 10);
                    setFormData({ ...formData, phone: digits ? '+880' + digits : '' });
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const raw = e.clipboardData.getData('text');
                    let digits = raw.replace(/\D/g, '');
                    if (digits.startsWith('880')) digits = digits.slice(3);
                    else if (digits.startsWith('88')) digits = digits.slice(2);
                    if (digits.startsWith('0')) digits = digits.slice(1);
                    if (digits.length > 10) digits = digits.slice(0, 10);
                    setFormData({ ...formData, phone: digits ? '+880' + digits : '' });
                  }}
                  className="pl-[76px]" 
                  placeholder="1711000000"
                />
              </div>
            </div>
          
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Type</label>
                <CustomSelect
                  value={formData.type}
                  onChange={(val) => setFormData({...formData, type: val as any})}
                  options={['Given', 'Taken']}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Total Amount <span className="text-red-400">*</span></label>
                <Input 
                  type="number"
                  required min="1"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({...formData, amount: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Date</label>
                <Input 
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-background border border-border text-white px-3 py-2 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Status</label>
                <CustomSelect
                  value={formData.status}
                  onChange={(val) => setFormData({...formData, status: val as any})}
                  options={['Pending', 'Paid']}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Next Payment Date (Optional)</label>
              <Input 
                type="date"
                value={formData.nextPaymentDate || ''}
                onChange={(e) => setFormData({...formData, nextPaymentDate: e.target.value})}
                className="w-full bg-background border border-border text-white px-3 py-2 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Notes (Optional)</label>
              <Input 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Reason or details..."
              />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeLoanModal}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                {editingLoan ? 'Update Record' : 'Save Record'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) handleDelete(deleteId); }}
        title="Delete Record"
        message="Are you sure you want to delete this loan record? This cannot be undone."
      />
    
      {/* History Modal */}
      <Dialog open={!!historyModalData} onOpenChange={(open) => !open && closeHistoryModal()}>
        <DialogContent className="sm:max-w-[500px] bg-popover border-border max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Loan History</DialogTitle>
            <DialogDescription className="text-gray-400">
              Transaction history for {historyModalData?.personName}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {historyModalData?.history && historyModalData.history.length > 0 ? (
              <div className="space-y-3">
                {historyModalData.history.map((h, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-background border border-gray-800">
                    <div>
                      <p className="text-sm font-medium text-gray-200">
                        {h.note || (h.type === 'Payment' ? 'Partial Payment' : 'Initial Entry')}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(h.date).toLocaleString()}</p>
                    </div>
                    <div className={`font-bold ${h.type === 'Payment' ? 'text-emerald-400' : 'text-orange-400'}`}>
                      {h.type === 'Payment' ? '+' : ''}{formatCurrency(h.amount)}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50 mt-4 border border-gray-700">
                  <span className="text-sm font-bold text-white">Total Due</span>
                  <span className="text-lg font-bold text-red-400">
                    {formatCurrency((historyModalData.amount || 0) - (historyModalData.paidAmount || 0))}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">No detailed history found for this record.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
