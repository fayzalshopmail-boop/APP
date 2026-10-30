'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Plus, Edit2, Trash2, Coins, Phone, MapPin, Calculator, Briefcase, Search } from 'lucide-react';
import { mechanicService, Mechanic } from '@/lib/services/mechanic';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { PaginationControl } from '@/components/ui/PaginationControl';
import { FilterChipBar } from '@/components/ui/FilterChipBar';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n/useTranslation';
import toast from "react-hot-toast";

export default function MechanicsPage() {
  const { user } = useAppStore();
  const { t, language } = useTranslation();
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'due' | 'cleared'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // States
  const [editingMechanic, setEditingMechanic] = useState<Mechanic | null>(null);
  const [activeMechanic, setActiveMechanic] = useState<Mechanic | null>(null);
  const [commissionAmount, setCommissionAmount] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  const [formData, setFormData] = useState({
      name: '',
      phone: '+880',
    address: ''
  });

  const fetchMechanics = async () => {
    try {
      setLoading(true);
      const data = await mechanicService.getAll();
      setMechanics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mechanic?: Mechanic) => {
    if (mechanic) {
      setEditingMechanic(mechanic);
      setFormData({
        name: mechanic.name,
        phone: mechanic.phone,
        address: mechanic.address || ''
      });
    } else {
      setEditingMechanic(null);
      setFormData({ name: '', phone: '+880', address: '' });
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchMechanics();
  }, []);

  useEffect(() => {
    const handleOpenAdd = () => {
      handleOpenModal();
    };
    window.addEventListener('app:add-mechanic', handleOpenAdd);
    return () => window.removeEventListener('app:add-mechanic', handleOpenAdd);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return toast.error(language === 'bn' ? 'নাম এবং ফোন নম্বর আবশ্যক।' : 'Name and Phone are required.');

    try {
      if (editingMechanic) {
        await mechanicService.update(editingMechanic.id, formData);
        setMechanics(mechanics.map(m => m.id === editingMechanic.id ? { ...m, ...formData } : m));
        toast.success(language === 'bn' ? 'মেকানিকের তথ্য আপডেট করা হয়েছে!' : 'Mechanic updated!');
      } else {
        const newId = await mechanicService.add(formData);
        const newMechanic: Mechanic = { 
          id: newId, 
          ...formData, 
          totalJobsBrought: 0, 
          totalCommissionEarned: 0, 
          totalCommissionPaid: 0, 
          commissionDue: 0 
        };
        setMechanics([newMechanic, ...mechanics]);
        toast.success(language === 'bn' ? 'মেকানিক সফলভাবে যোগ করা হয়েছে!' : 'Mechanic added!');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(language === 'bn' ? 'মেকানিক সংরক্ষণ করতে ব্যর্থ হয়েছে।' : 'Failed to save mechanic.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await mechanicService.delete(id);
      setMechanics(mechanics.filter(m => m.id !== id));
      toast.success(language === 'bn' ? 'মেকানিক মুছে ফেলা হয়েছে!' : 'Mechanic deleted!');
      setDeleteId(null);
    } catch (error) {
      console.error(error);
      toast.error(language === 'bn' ? 'মেকানিক মুছতে ব্যর্থ হয়েছে।' : 'Failed to delete mechanic.');
    }
  };

  const handleAddCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMechanic || commissionAmount <= 0) return toast.error(language === 'bn' ? 'কমিশনের সঠিক পরিমাণ লিখুন।' : 'Invalid commission amount.');
    
    try {
      await mechanicService.addJobCommission(activeMechanic.id, commissionAmount);
      setMechanics(mechanics.map(m => {
        if (m.id === activeMechanic.id) {
          return {
            ...m,
            totalJobsBrought: m.totalJobsBrought + 1,
            totalCommissionEarned: m.totalCommissionEarned + commissionAmount,
            commissionDue: m.commissionDue + commissionAmount
          };
        }
        return m;
      }));
      toast.success(language === 'bn' ? 'কমিশন সফলভাবে যোগ করা হয়েছে!' : 'Commission added successfully!');
      setIsCommissionModalOpen(false);
      setCommissionAmount(0);
    } catch (error) {
      console.error(error);
      toast.error(language === 'bn' ? 'কমিশন যোগ করতে ব্যর্থ হয়েছে।' : 'Failed to add commission.');
    }
  };

  const handlePayCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMechanic || paymentAmount <= 0) return toast.error(language === 'bn' ? 'পেমেন্টের সঠিক পরিমাণ লিখুন।' : 'Invalid payment amount.');
    if (paymentAmount > activeMechanic.commissionDue) return toast.error(language === 'bn' ? 'পেমেন্ট বকেয়ার পরিমাণের চেয়ে বেশি হতে পারে না।' : 'Payment cannot exceed total due.');

    try {
      const { newPaid, newDue } = await mechanicService.payCommission(
        activeMechanic.id, 
        paymentAmount,
        user?.email || user?.name || 'Staff'
      );
      setMechanics(mechanics.map(m => {
        if (m.id === activeMechanic.id) {
          return { ...m, totalCommissionPaid: newPaid, commissionDue: newDue };
        }
        return m;
      }));
      toast.success(language === 'bn' ? 'পেমেন্ট সফলভাবে সংরক্ষিত হয়েছে!' : 'Payment recorded successfully!');
      setIsPaymentModalOpen(false);
      setPaymentAmount(0);
    } catch (error) {
      console.error(error);
      toast.error(language === 'bn' ? 'পেমেন্ট সংরক্ষণ করতে ব্যর্থ হয়েছে।' : 'Failed to record payment.');
    }
  };

  const totalShopDueToMechanics = mechanics.reduce((acc, m) => acc + m.commissionDue, 0);
  const totalJobs = mechanics.reduce((acc, m) => acc + m.totalJobsBrought, 0);
  const dueCount = mechanics.filter(m => m.commissionDue > 0).length;
  const clearedCount = mechanics.filter(m => m.commissionDue <= 0).length;

  const filteredMechanics = mechanics.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.phone.includes(searchTerm) ||
      (m.address && m.address.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;
    if (filterTab === 'due') return m.commissionDue > 0;
    if (filterTab === 'cleared') return m.commissionDue <= 0;
    return true;
  });

  const totalPages = Math.ceil(filteredMechanics.length / itemsPerPage) || 1;
  const paginatedMechanics = filteredMechanics.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleFilterChange = (id: string) => {
    setFilterTab(id as 'all' | 'due' | 'cleared');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1600px] mx-auto w-full pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            {language === 'bn' ? 'বি২বি মেকানিক (Mechanics)' : 'Mechanics (B2B)'}
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-0.5 sm:mt-1">
            {language === 'bn' ? 'পার্টনার মেকানিকদের আনা কাজ ও বকেয়া কমিশন হিসাব' : 'Track partner mechanic referrals and commission dues'}
          </p>
        </div>
      </div>

      {/* 3-Card Summary: Side-by-side 3 cols on mobile & desktop */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Unpaid Commissions */}
        <div className="bg-card/90 border border-blue-500/20 hover:border-blue-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 relative overflow-hidden group shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 truncate">{language === 'bn' ? 'বকেয়া কমিশন' : 'Commission Due'}</span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 bg-blue-500/10 rounded-lg sm:rounded-xl flex items-center justify-center border border-blue-500/20 text-blue-400 shrink-0">
              <Coins className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-2xl font-bold text-blue-400 tracking-tight leading-tight truncate">
              {formatCurrency(totalShopDueToMechanics)}
            </div>
            <p className="text-[9px] sm:text-[11px] text-gray-500 mt-0.5 truncate hidden sm:block">
              {language === 'bn' ? `${dueCount} জনের পাওনা বাকি` : `${dueCount} mechanics due`}
            </p>
          </div>
        </div>

        {/* Total Mechanics */}
        <div className="bg-card/90 border border-purple-500/20 hover:border-purple-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 relative overflow-hidden group shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 truncate">{language === 'bn' ? 'পার্টনার মেকানিক' : 'Partner Mechanics'}</span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 bg-purple-500/10 rounded-lg sm:rounded-xl flex items-center justify-center border border-purple-500/20 text-purple-400 shrink-0">
              <Wrench className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-2xl font-bold text-white tracking-tight leading-tight truncate">
              {mechanics.length} {language === 'bn' ? 'জন' : ''}
            </div>
            <p className="text-[9px] sm:text-[11px] text-gray-500 mt-0.5 truncate hidden sm:block">
              {language === 'bn' ? `${clearedCount} জন পরিশোধিত` : `${clearedCount} settled`}
            </p>
          </div>
        </div>

        {/* Jobs Brought */}
        <div className="bg-card/90 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 relative overflow-hidden group shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 truncate">{language === 'bn' ? 'সম্পন্ন কাজ' : 'Jobs Completed'}</span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 bg-emerald-500/10 rounded-lg sm:rounded-xl flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0">
              <Briefcase className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-2xl font-bold text-emerald-400 tracking-tight leading-tight truncate">
              {totalJobs} {language === 'bn' ? 'টি' : ''}
            </div>
            <p className="text-[9px] sm:text-[11px] text-gray-500 mt-0.5 truncate hidden sm:block">
              {language === 'bn' ? 'মোট রেফারেল কাজ' : 'Total referred jobs'}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Chip Bar */}
      <div className="bg-card/90 border border-gray-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-sm space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input 
              placeholder={language === 'bn' ? 'নাম, মোবাইল বা ঠিকানা দিয়ে খুঁজুন...' : 'Search by name, phone or address...'} 
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-popover/80 border-gray-800 h-9 sm:h-10 text-xs sm:text-sm rounded-xl focus:border-blue-500"
            />
          </div>
          <FilterChipBar
            filters={[
              { id: 'all', label: language === 'bn' ? 'সকল মেকানিক' : 'All Mechanics', count: mechanics.length },
              { id: 'due', label: language === 'bn' ? 'কমিশন বাকি' : 'Has Due', count: dueCount },
              { id: 'cleared', label: language === 'bn' ? 'পরিশোধিত' : 'Settled', count: clearedCount },
            ]}
            activeFilter={filterTab}
            onFilterChange={handleFilterChange}
          />
        </div>
      </div>

      {/* Mechanics Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredMechanics.length === 0 ? (
        <div className="bg-card border border-gray-800 rounded-2xl p-12 text-center">
          <Wrench className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400">
            {language === 'bn' ? 'কোন মেকানিক পাওয়া যায়নি' : 'No mechanics found'}
          </h3>
          <p className="text-sm text-gray-500 mt-2">
            {language === 'bn' ? 'নতুন মেকানিক যোগ করুন অথবা সার্চ ফিল্টার পরিবর্তন করুন।' : 'Add a new mechanic or adjust your search filter.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Grid View */}
          <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {paginatedMechanics.map(m => (
              <div key={m.id} className="bg-card border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-colors">
                <div className="p-5 border-b border-gray-800/50 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                      {m.name}
                      {m.commissionDue > 0 ? (
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                          {language === 'bn' ? 'বাকি আছে' : 'Has Due'}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                          {language === 'bn' ? 'পরিশোধিত' : 'Settled'}
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-500" /> {m.phone}</span>
                      {m.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-500" /> {m.address}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleOpenModal(m)} 
                      className="p-1.5 text-gray-500 hover:text-white rounded-md hover:bg-gray-800 transition-colors"
                      title={language === 'bn' ? 'এডিট করুন' : 'Edit'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeleteId(m.id)} 
                      className="p-1.5 text-gray-500 hover:text-red-400 rounded-md hover:bg-red-400/10 transition-colors"
                      title={language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="p-5 grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-800/50">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> {language === 'bn' ? 'আনা কাজ' : 'Jobs Brought'}</p>
                    <p className="text-lg font-bold text-gray-200">{m.totalJobsBrought}</p>
                  </div>
                  <div className="bg-blue-500/5 rounded-xl p-3 border border-blue-500/10">
                    <p className="text-xs text-blue-400/70 mb-1 flex items-center gap-1"><Coins className="w-3 h-3" /> {language === 'bn' ? 'বকেয়া কমিশন' : 'Due Balance'}</p>
                    <p className="text-lg font-bold text-blue-400">{formatCurrency(m.commissionDue)}</p>
                  </div>
                </div>

                <div className="px-5 pb-5 flex gap-3">
                  <Button 
                    onClick={() => { setActiveMechanic(m); setIsCommissionModalOpen(true); }} 
                    className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200"
                  >
                    <Calculator className="w-4 h-4 mr-2" /> {language === 'bn' ? 'কাজ যোগ' : 'Add Job'}
                  </Button>
                  <Button 
                    onClick={() => { setActiveMechanic(m); setIsPaymentModalOpen(true); }} 
                    disabled={m.commissionDue <= 0}
                    className="w-full bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 hover:text-emerald-300 disabled:opacity-50"
                  >
                    {language === 'bn' ? 'কমিশন পে' : 'Pay Due'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Card View (Sleek, Compact & Space-Efficient) */}
          <div className="md:hidden space-y-2.5">
            {paginatedMechanics.map((m) => (
              <div 
                key={m.id} 
                className="bg-card/90 border border-gray-800/90 rounded-xl p-3 shadow-sm hover:border-gray-700 transition-all space-y-2.5"
              >
                {/* Top Row: Name, Phone & Due Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-100 text-sm truncate">
                      {m.name}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5 truncate">
                      <a 
                        href={`tel:${m.phone}`} 
                        className="text-blue-400 hover:underline flex items-center gap-1 font-medium shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="w-3 h-3 text-blue-400" />
                        <span>{m.phone}</span>
                      </a>
                      {m.address && (
                        <>
                          <span>•</span>
                          <span className="text-gray-400 truncate">{m.address}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 border ${
                    m.commissionDue > 0 
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/25' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  }`}>
                    {m.commissionDue > 0 ? (language === 'bn' ? 'বাকি আছে' : 'Has Due') : (language === 'bn' ? 'পরিশোধিত' : 'Settled')}
                  </span>
                </div>

                {/* Middle Financial Strip */}
                <div className="grid grid-cols-2 gap-2 bg-[#121523]/80 p-2 rounded-lg border border-gray-800/60 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block">{language === 'bn' ? 'মোট কাজ:' : 'Total Jobs:'}</span>
                    <span className="font-semibold text-gray-200">
                      {m.totalJobsBrought} {language === 'bn' ? 'টি' : ''}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block">{language === 'bn' ? 'বকেয়া কমিশন:' : 'Due Commission:'}</span>
                    <span className={`font-bold ${m.commissionDue > 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                      {formatCurrency(m.commissionDue)}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Button 
                    size="sm" 
                    onClick={() => { setActiveMechanic(m); setIsCommissionModalOpen(true); }}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs h-7.5 rounded-lg shadow-sm font-medium"
                  >
                    <Calculator className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'কাজ যোগ' : 'Add Job'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => { setActiveMechanic(m); setIsPaymentModalOpen(true); }}
                    disabled={m.commissionDue <= 0}
                    className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs h-7.5 rounded-lg font-medium disabled:opacity-40"
                  >
                    <Coins className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'কমিশন পে' : 'Pay Due'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleOpenModal(m)} 
                    className="h-7.5 w-7.5 p-0 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg shrink-0"
                    title={language === 'bn' ? 'এডিট করুন' : 'Edit'}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setDeleteId(m.id)} 
                    className="h-7.5 w-7.5 p-0 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg shrink-0"
                    title={language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <PaginationControl
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredMechanics.length}
            itemsPerPage={itemsPerPage}
          />
        </>
      )}

      {/* Add/Edit Mechanic Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[425px] max-h-[90vh] overflow-y-auto bg-popover border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {editingMechanic 
                ? (language === 'bn' ? 'মেকানিক সম্পাদনা করুন' : 'Edit Mechanic') 
                : (language === 'bn' ? 'নতুন মেকানিক যোগ করুন' : 'Add Mechanic')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">{language === 'bn' ? 'নাম' : 'Name'} <span className="text-red-400">*</span></label>
              <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{language === 'bn' ? 'ফোন নম্বর' : 'Phone Number'} <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <span className="absolute left-9 top-1/2 -translate-y-1/2 font-medium text-gray-300 pointer-events-none">+880</span>
                  <Input 
                    required
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="tel"
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
                    maxLength={25}
                  />
                </div>
              </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">{language === 'bn' ? 'দোকান / ঠিকানা' : 'Shop / Address'}</label>
              <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                {editingMechanic ? (language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Changes') : (language === 'bn' ? 'মেকানিক যোগ করুন' : 'Save Mechanic')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Job/Commission Modal */}
      <Dialog open={isCommissionModalOpen} onOpenChange={setIsCommissionModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[400px] max-h-[90vh] overflow-y-auto bg-popover border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {language === 'bn' ? 'নতুন রেফারেল কাজ রেকর্ড' : 'Record New Job'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {language === 'bn' ? `${activeMechanic?.name}-এর আনা কাজের জন্য কমিশন যোগ করুন` : `Add commission for a job brought by ${activeMechanic?.name}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCommission} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">{language === 'bn' ? 'কমিশনের পরিমাণ' : 'Commission Amount'} <span className="text-red-400">*</span></label>
              <Input 
                type="number" required min="1"
                value={commissionAmount || ''}
                onChange={(e) => setCommissionAmount(parseInt(e.target.value) || 0)}
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsCommissionModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                {language === 'bn' ? 'কমিশন যোগ করুন' : 'Add Commission'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay Commission Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[400px] max-h-[90vh] overflow-y-auto bg-popover border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {language === 'bn' ? 'কমিশন পরিশোধ' : 'Pay Commission'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {language === 'bn' ? `${activeMechanic?.name}-এর বকেয়া ব্যালেন্স পরিশোধ করুন` : `Clear due balance for ${activeMechanic?.name}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePayCommission} className="space-y-4 pt-4">
            <div className="bg-gray-800/50 p-4 rounded-lg flex justify-between items-center mb-4 border border-gray-700">
              <span className="text-sm text-gray-400">{language === 'bn' ? 'বর্তমান বকেয়া:' : 'Pending Due:'}</span>
              <span className="text-lg font-bold text-blue-400">{formatCurrency(activeMechanic?.commissionDue || 0)}</span>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">{language === 'bn' ? 'পরিশোধের পরিমাণ' : 'Payment Amount'} <span className="text-red-400">*</span></label>
              <Input 
                type="number" required min="1" max={activeMechanic?.commissionDue}
                value={paymentAmount || ''}
                onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {language === 'bn' ? 'পেমেন্ট সংরক্ষণ করুন' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) handleDelete(deleteId); }}
        title={language === 'bn' ? 'মেকানিক মুছে ফেলবেন?' : 'Delete Mechanic'}
        message={language === 'bn' ? 'আপনি কি নিশ্চিত যে এই মেকানিককে মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।' : 'Are you sure you want to delete this mechanic? This cannot be undone.'}
        confirmText={language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
      />
    </div>
  );
}


