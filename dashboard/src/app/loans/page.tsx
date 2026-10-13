'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, Plus, ArrowUpRight, ArrowDownRight, Edit2, Trash2, 
  CheckCircle, Coins, CalendarClock, History, MessageSquare, Phone, 
  Search, X, Filter 
} from 'lucide-react';
import { loanService, Loan } from '@/lib/services/loan';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from "react-hot-toast";

type FilterType = 'all' | 'pending' | 'paid' | 'given' | 'taken';

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  
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
    date: new Date().toISOString().split('T')[0]
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
        date: loan.date || new Date().toISOString().split('T')[0]
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
        date: new Date().toISOString().split('T')[0]
      });
    }
    setIsModalOpen(true);
  };

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
        paymentNote.trim() || undefined
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

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1600px] mx-auto pb-8 sm:pb-10 w-full">
      
      {/* 2 Core Summary Cards (Ultra-sleek, compact & side-by-side on all devices) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-6">
        {/* Total Money Given (পাবো) */}
        <div className="bg-card border border-orange-500/25 rounded-xl sm:rounded-2xl p-2.5 sm:p-6 relative overflow-hidden group shadow-lg">
          <div className="flex items-center justify-between mb-0.5 sm:mb-3">
            <span className="text-[11px] sm:text-sm font-semibold text-orange-400 uppercase tracking-wider truncate">
              পাবো (Given)
            </span>
            <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
            </div>
          </div>
          <div className="text-sm sm:text-2xl md:text-3xl font-extrabold text-orange-400 truncate">
            {formatCurrency(pendingGiven)}
          </div>
          <div className="text-[9px] sm:text-xs text-gray-500 mt-0.5 truncate">
            দোকানের মোট বাকি পাওনা
          </div>
        </div>

        {/* Total Money Taken (দিতে হবে) */}
        <div className="bg-card border border-red-500/25 rounded-xl sm:rounded-2xl p-2.5 sm:p-6 relative overflow-hidden group shadow-lg">
          <div className="flex items-center justify-between mb-0.5 sm:mb-3">
            <span className="text-[11px] sm:text-sm font-semibold text-red-400 uppercase tracking-wider truncate">
              দিতে হবে (Taken)
            </span>
            <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
            </div>
          </div>
          <div className="text-sm sm:text-2xl md:text-3xl font-extrabold text-red-400 truncate">
            {formatCurrency(pendingTaken)}
          </div>
          <div className="text-[9px] sm:text-xs text-gray-500 mt-0.5 truncate">
            দোকানের মোট বাকি দেনা
          </div>
        </div>
      </div>

      {/* Main Records Container */}
      <div className="bg-card border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        
        {/* Responsive Header Toolbar (Search, Filter, Quick Add) */}
        <div className="p-3 sm:p-5 border-b border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0" />
              <h2 className="text-sm sm:text-lg font-bold text-gray-200">সকল খতিয়ান</h2>
              <span className="text-[10px] sm:text-xs text-gray-400 bg-secondary px-2 py-0.5 rounded-full border border-gray-800">
                {filteredLoans.length} টি রেকর্ড
              </span>
            </div>

            {/* Mobile-only Quick Add Button directly on page */}
            <Button 
              size="sm"
              onClick={() => handleOpenModal()}
              className="md:hidden h-7 sm:h-8 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন</span>
            </Button>
          </div>

          {/* Search Box & Responsive Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-60">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="নাম বা ফোন দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 sm:pl-9 pr-7 sm:pr-8 h-8 sm:h-10 bg-secondary/80 border-gray-800 text-white rounded-xl text-xs sm:text-sm focus:border-blue-500 w-full"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-0.5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile / Tablet Filter Dropdown */}
            <div className="shrink-0 w-28 sm:w-32 md:hidden">
              <Select value={activeFilter} onValueChange={(val) => setActiveFilter(val as FilterType)}>
                <SelectTrigger className="h-8 sm:h-9 bg-secondary border border-gray-800 text-gray-200 rounded-xl text-xs font-medium">
                  <SelectValue placeholder="ফিল্টার" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value="all">সকল (All)</SelectItem>
                  <SelectItem value="pending">চলমান বাকি</SelectItem>
                  <SelectItem value="paid">পরিশোধিত</SelectItem>
                  <SelectItem value="given">পাবো</SelectItem>
                  <SelectItem value="taken">দিতে হবে</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Desktop Filter Pills */}
            <div className="hidden md:flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-gray-800 shrink-0">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeFilter === 'all' ? 'bg-blue-600 text-white shadow-sm font-semibold' : 'text-gray-400 hover:text-white'}`}
              >
                সকল
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeFilter === 'pending' ? 'bg-amber-600 text-white shadow-sm font-semibold' : 'text-gray-400 hover:text-white'}`}
              >
                বাকি
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('paid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeFilter === 'paid' ? 'bg-emerald-600 text-white shadow-sm font-semibold' : 'text-gray-400 hover:text-white'}`}
              >
                পরিশোধিত
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('given')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeFilter === 'given' ? 'bg-orange-600 text-white shadow-sm font-semibold' : 'text-gray-400 hover:text-white'}`}
              >
                পাবো
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('taken')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeFilter === 'taken' ? 'bg-red-600 text-white shadow-sm font-semibold' : 'text-gray-400 hover:text-white'}`}
              >
                দিতে হবে
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-14 text-gray-500">
            <div className="w-7 h-7 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">রেকর্ড লোড হচ্ছে...</p>
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="text-center py-14 text-gray-500">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">কোনো রেকর্ড পাওয়া যায়নি।</p>
            {searchQuery && <p className="text-[11px] text-gray-600 mt-1">সার্চ বা ফিল্টার পরিবর্তন করে দেখুন।</p>}
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards (Visible on mobile / screens < 768px, ultra-compact) */}
            <div className="block md:hidden space-y-2 p-2.5 sm:p-3">
              {filteredLoans.map((l) => {
                const remainingDue = l.amount - (l.paidAmount || 0);
                const isPaid = l.status === 'Paid' || remainingDue <= 0;
                const isGiven = l.type === 'Given';

                return (
                  <div 
                    key={l.id} 
                    className="bg-card border border-gray-800/80 rounded-xl p-2.5 sm:p-3 shadow-sm space-y-1.5 hover:border-gray-700/80 transition-all"
                  >
                    {/* Header: Person & Contact on Left | Badges on Right */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-gray-100 truncate">
                            {l.personName}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                            isGiven 
                              ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' 
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}>
                            {isGiven ? 'পাবো' : 'দিতে হবে'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          {l.phone && (
                            <a 
                              href={`tel:${l.phone}`}
                              className="flex items-center gap-1 text-blue-400 hover:underline text-[11px]"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{l.phone}</span>
                            </a>
                          )}
                          <span className="text-[11px] text-gray-500">• {l.date}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isPaid 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        }`}>
                          {isPaid ? 'পরিশোধিত ✓' : 'বাকি'}
                        </span>
                      </div>
                    </div>

                    {/* Notes or Next payment reminder (if available) */}
                    {(l.notes || (!isPaid && l.nextPaymentDate)) && (
                      <div className="bg-[#101322] rounded-lg px-2.5 py-1 border border-gray-800/70 text-xs flex items-center justify-between gap-2">
                        {l.notes ? (
                          <span className="text-gray-400 text-[11px] italic truncate flex-1">
                            {l.notes}
                          </span>
                        ) : <span />}
                        {!isPaid && l.nextPaymentDate && (
                          <span className="text-blue-400 text-[10px] font-medium flex items-center gap-1 shrink-0">
                            <CalendarClock className="w-3 h-3" />
                            তাগাদা: {l.nextPaymentDate}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Financial Strip (Clean Horizontal Bar with wrapping protection) */}
                    <div className="flex items-center justify-between flex-wrap gap-1 bg-secondary/40 rounded-lg px-2.5 py-1 text-xs border border-gray-800/50">
                      <div className="text-[11px] text-gray-400 truncate">
                        মোট: <strong className="text-gray-200 font-semibold">{formatCurrency(l.amount)}</strong>
                        {l.paidAmount ? (
                          <span className="text-gray-500 ml-1">(জমা: {formatCurrency(l.paidAmount)})</span>
                        ) : null}
                      </div>
                      
                      <div>
                        {isPaid ? (
                          <span className="text-emerald-400 font-bold text-xs">পরিশোধিত</span>
                        ) : (
                          <span className="text-xs font-bold text-yellow-500">
                            বাকি: {formatCurrency(remainingDue)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-gray-800/40 flex-wrap">
                      {!isPaid && (
                        <Button
                          size="sm"
                          onClick={() => { setPaymentModalData(l); setNextDate(''); setPaymentNote(''); }}
                          className="h-7 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                        >
                          <Coins className="w-3.5 h-3.5 mr-1" />
                          পরিশোধ
                        </Button>
                      )}
                      {isGiven && !isPaid && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendSms(l)}
                          disabled={sendingSmsId === l.id}
                          className="h-7 px-2 text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 rounded-lg"
                          title="SMS তাগাদা"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setHistoryModalData(l)}
                        className="h-7 px-2 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
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
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Desktop Table View (Visible on desktop / md >= 768px only) */}
            <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] relative">
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
                  {filteredLoans.map((l) => {
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
          </>
        )}
      </div>

      {/* Partial Payment Modal */}
      <Dialog open={!!paymentModalData} onOpenChange={(open) => !open && closePaymentModal()}>
        <DialogContent className="w-[95vw] sm:max-w-[400px] bg-popover border-gray-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Add Payment (পরিশোধ)</DialogTitle>
            <DialogDescription className="text-gray-400 text-xs">
              {paymentModalData?.personName} ({paymentModalData?.type === 'Given' ? 'পাবো' : 'দিতে হবে'})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-4 pt-3">
            <div className="bg-gray-800/50 p-3.5 rounded-xl flex justify-between items-center border border-gray-700">
              <span className="text-xs text-gray-400">Remaining Due:</span>
              <span className="text-base sm:text-lg font-bold text-yellow-500">
                {paymentModalData ? formatCurrency(paymentModalData.amount - (paymentModalData.paidAmount || 0)) : 0}
              </span>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Payment Amount <span className="text-red-400">*</span></label>
              <Input 
                type="number"
                required min="1"
                max={paymentModalData ? (paymentModalData.amount - (paymentModalData.paidAmount || 0)) : undefined}
                value={paymentAmount || ''}
                onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
                placeholder="Amount..."
                className="h-10 bg-background border-gray-700 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Note (Optional)</label>
              <Input 
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Cash / bKash / remarks..."
                className="h-9 bg-background border-gray-700 text-white text-xs"
              />
            </div>
            
            {/* Show Next Payment Date ONLY if amount entered is less than remaining due */}
            {paymentModalData && paymentAmount > 0 && paymentAmount < (paymentModalData.amount - (paymentModalData.paidAmount || 0)) && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-1.5 pt-1"
              >
                <label className="text-xs font-medium text-blue-400 flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5" /> Next Payment Date (পরবর্তী তারিখ)
                </label>
                <Input 
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  className="w-full bg-background border border-blue-500/30 focus:border-blue-500 text-white px-3 py-2 rounded-lg text-xs"
                />
              </motion.div>
            )}

            <DialogFooter className="mt-5 gap-2">
              <Button type="button" variant="outline" onClick={closePaymentModal} className="border-gray-700 text-gray-300">
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Save Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Modal (Bug Fixed: Perfectly populates on Edit) */}
      <Dialog open={isModalOpen} onOpenChange={(v) => !v && closeLoanModal()}>
        <DialogContent className="w-[95vw] sm:max-w-[425px] bg-popover border-gray-800 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">
              {editingLoan ? 'Edit Record' : 'Add New Record'}
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs">
              Track money given or taken.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSave} className="space-y-3.5 mt-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Person / Entity Name <span className="text-red-400">*</span></label>
              <Input 
                required
                value={formData.personName}
                onChange={(e) => setFormData({...formData, personName: e.target.value})}
                placeholder="Name..."
                className="h-10 bg-background border-gray-700 text-white"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Phone Number (Optional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <span className="absolute left-9 top-1/2 -translate-y-1/2 font-medium text-gray-300 pointer-events-none text-xs">+880</span>
                <Input 
                  type="tel"
                  maxLength={11}
                  value={formData.phone ? formData.phone.replace(/^\+880/, '') : ''}
                  onChange={(e) => {
                    let digits = e.target.value.replace(/\D/g, ''); 
                    if (digits.startsWith('0')) digits = digits.substring(1);
                    if (digits.length > 10) digits = digits.substring(0, 10);
                    setFormData({ ...formData, phone: '+880' + digits });
                  }}
                  className="pl-[76px] h-10 bg-background border-gray-700 text-white" 
                  placeholder="1711000000"
                />
              </div>
            </div>
          
            <div className="grid grid-cols-2 gap-3">
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
                  className="h-10 bg-background border-gray-700 text-white font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Date</label>
                <Input 
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-background border-gray-700 text-white px-3 py-2 rounded-lg text-xs"
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
                className="w-full bg-background border-gray-700 text-white px-3 py-2 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Notes (Optional)</label>
              <Input 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Reason or details..."
                className="h-9 bg-background border-gray-700 text-white text-xs"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="outline" onClick={closeLoanModal} className="border-gray-700 text-gray-300">
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                {editingLoan ? 'Update Record' : 'Save Record'}
              </Button>
            </DialogFooter>
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
        <DialogContent className="w-[95vw] sm:max-w-[480px] bg-popover border-gray-800 rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Loan History</DialogTitle>
            <DialogDescription className="text-gray-400 text-xs">
              Transaction history for {historyModalData?.personName}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-3">
            {historyModalData?.history && historyModalData.history.length > 0 ? (
              <div className="space-y-2.5">
                {historyModalData.history.map((h, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-background border border-gray-800">
                    <div>
                      <p className="text-xs font-bold text-gray-200">
                        {h.note || (h.type === 'Payment' ? 'Partial Payment' : 'Initial Entry')}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{new Date(h.date).toLocaleString('bn-BD')}</p>
                    </div>
                    <div className={`font-black text-sm ${h.type === 'Payment' ? 'text-emerald-400' : 'text-orange-400'}`}>
                      {h.type === 'Payment' ? '+' : ''}{formatCurrency(h.amount)}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 rounded-xl bg-gray-800/50 mt-3 border border-gray-700">
                  <span className="text-xs font-bold text-white">Total Due</span>
                  <span className="text-base font-bold text-red-400">
                    {formatCurrency((historyModalData.amount || 0) - (historyModalData.paidAmount || 0))}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-xs">No detailed history found for this record.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
