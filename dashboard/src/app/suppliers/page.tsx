'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Plus, Search, Edit, Trash2, Phone, Building, MapPin, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/currency';
import { supplierService, Supplier } from '@/lib/services/supplier';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PaginationControl } from '@/components/ui/PaginationControl';
import { FilterChipBar } from '@/components/ui/FilterChipBar';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n/useTranslation';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const { user } = useAppStore();
  const { t, language } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'due' | 'cleared'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [paymentModalSupplier, setPaymentModalSupplier] = useState<Supplier | null>(null);
  const [billModalSupplier, setBillModalSupplier] = useState<Supplier | null>(null);
  const [billAmount, setBillAmount] = useState('');
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });

  // Form
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '+880',
    address: '',
    status: 'Active' as 'Active' | 'Inactive'
  });
  const [paymentAmount, setPaymentAmount] = useState('');

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await supplierService.getAll();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingSupplier(null);
    setFormData({ name: '', company: '', phone: '+880', address: '', status: 'Active' });
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const handleOpenAdd = () => {
      openAddModal();
    };
    window.addEventListener('app:add-supplier', handleOpenAdd);
    return () => window.removeEventListener('app:add-supplier', handleOpenAdd);
  }, []);

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      company: supplier.company,
      phone: supplier.phone,
      address: supplier.address || '',
      status: supplier.status
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await supplierService.update(editingSupplier.id, formData);
        setSuppliers(suppliers.map(s => s.id === editingSupplier.id ? { ...s, ...formData } : s));
      } else {
        const id = await supplierService.add(formData);
        const newSupplier: Supplier = {
          id,
          ...formData,
          totalPurchase: 0,
          totalPaid: 0,
          due: 0
        };
        setSuppliers([...suppliers, newSupplier].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success(language === 'bn' ? 'সাপ্লায়ার সফলভাবে যোগ করা হয়েছে!' : 'Supplier added successfully!');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(language === 'bn' ? 'সাপ্লায়ার সংরক্ষণ করতে সমস্যা হয়েছে' : 'Failed to save supplier');
    }
  };

  const handleDelete = async () => {
    if (!confirmModal.id) return;
    try {
      await supplierService.delete(confirmModal.id);
      setSuppliers(suppliers.filter(s => s.id !== confirmModal.id));
      setConfirmModal({ isOpen: false, id: null });
      toast.success(language === 'bn' ? 'সাপ্লায়ার মুছে ফেলা হয়েছে' : 'Supplier deleted successfully');
    } catch (err) {
      console.error(err);
      toast.error(language === 'bn' ? 'সাপ্লায়ার মুছে ফেলতে সমস্যা হয়েছে' : 'Failed to delete supplier');
    }
  };

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billModalSupplier) return;
    const amount = Number(billAmount);
    if (amount <= 0) return toast.error(language === 'bn' ? 'সঠিক টাকার পরিমাণ লিখুন' : 'Please enter a valid amount');

    try {
      const { newPurchase, newDue } = await supplierService.addBill(billModalSupplier.id, amount);
      setSuppliers(suppliers.map(s => 
        s.id === billModalSupplier.id ? { ...s, totalPurchase: newPurchase, due: newDue } : s
      ));
      setBillModalSupplier(null);
      setBillAmount('');
      toast.success(language === 'bn' ? 'বিল সফলভাবে যোগ করা হয়েছে!' : 'Bill added successfully!');
    } catch (err) {
      console.error(err);
      toast.error(language === 'bn' ? 'বিল যোগ করতে সমস্যা হয়েছে' : 'Failed to add bill');
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalSupplier) return;
    const amount = Number(paymentAmount);
    if (amount <= 0 || amount > paymentModalSupplier.due) return toast.error(language === 'bn' ? 'সঠিক টাকার পরিমাণ লিখুন' : 'Please enter a valid amount');

    try {
      const { newPaid, newDue } = await supplierService.addPayment(
        paymentModalSupplier.id, 
        amount, 
        user?.email || user?.name || 'Staff'
      );
      setSuppliers(suppliers.map(s => 
        s.id === paymentModalSupplier.id ? { ...s, totalPaid: newPaid, due: newDue } : s
      ));
      setPaymentModalSupplier(null);
      setPaymentAmount('');
      toast.success(language === 'bn' ? 'পেমেন্ট সফলভাবে সম্পন্ন হয়েছে!' : 'Payment received successfully!');
    } catch (err) {
      console.error(err);
      toast.error(language === 'bn' ? 'পেমেন্ট সম্পন্ন করতে সমস্যা হয়েছে' : 'Failed to process payment');
    }
  };

  const totalShopDue = suppliers.reduce((sum, s) => sum + s.due, 0);
  const totalPurchases = suppliers.reduce((sum, s) => sum + s.totalPurchase, 0);
  const dueCount = suppliers.filter(s => s.due > 0).length;
  const clearedCount = suppliers.filter(s => s.due <= 0).length;

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm);
    if (!matchesSearch) return false;
    if (filterTab === 'due') return s.due > 0;
    if (filterTab === 'cleared') return s.due <= 0;
    return true;
  });

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage) || 1;
  const paginatedSuppliers = filteredSuppliers.slice(
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300 pb-10 max-w-[1600px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
            {language === 'bn' ? 'সাপ্লায়ার ও ডিলার (Suppliers)' : 'Suppliers & Dealers'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">
            {language === 'bn' ? 'পার্টস সাপ্লায়ার ও মহাজনদের দেনা-পাওনার হিসাব' : 'Manage supplier accounts, purchases and payables'}
          </p>
        </div>
      </div>

      {/* 3-Card Summary: Side-by-side 3 cols on mobile & desktop */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Payable Due */}
        <div className="bg-card/90 border border-orange-500/20 hover:border-orange-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 relative overflow-hidden group shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 truncate">{language === 'bn' ? 'সাপ্লায়ার বাকি' : 'Payable Due'}</span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 bg-orange-500/10 rounded-lg sm:rounded-xl flex items-center justify-center border border-orange-500/20 text-orange-400 shrink-0">
              <Wallet className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-2xl font-bold text-orange-400 tracking-tight leading-tight truncate">
              {formatCurrency(totalShopDue)}
            </div>
            <p className="text-[9px] sm:text-[11px] text-gray-500 mt-0.5 truncate hidden sm:block">
              {language === 'bn' ? `${dueCount} জনের বাকি আছে` : `${dueCount} suppliers due`}
            </p>
          </div>
        </div>

        {/* Total Suppliers */}
        <div className="bg-card/90 border border-purple-500/20 hover:border-purple-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 relative overflow-hidden group shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 truncate">{language === 'bn' ? 'মোট সাপ্লায়ার' : 'Total Suppliers'}</span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 bg-purple-500/10 rounded-lg sm:rounded-xl flex items-center justify-center border border-purple-500/20 text-purple-400 shrink-0">
              <Truck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-2xl font-bold text-white tracking-tight leading-tight truncate">
              {suppliers.length} {language === 'bn' ? 'জন' : ''}
            </div>
            <p className="text-[9px] sm:text-[11px] text-gray-500 mt-0.5 truncate hidden sm:block">
              {language === 'bn' ? `${clearedCount} জন পরিশোধিত` : `${clearedCount} settled`}
            </p>
          </div>
        </div>

        {/* Total Purchases */}
        <div className="bg-card/90 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 relative overflow-hidden group shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 truncate">{language === 'bn' ? 'মোট মালামাল ক্রয়' : 'Total Purchases'}</span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 bg-emerald-500/10 rounded-lg sm:rounded-xl flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0">
              <Building className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-2xl font-bold text-emerald-400 tracking-tight leading-tight truncate">
              {formatCurrency(totalPurchases)}
            </div>
            <p className="text-[9px] sm:text-[11px] text-gray-500 mt-0.5 truncate hidden sm:block">
              {language === 'bn' ? 'সর্বমোট ক্রয় হিসাব' : 'Total purchase history'}
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
              placeholder={language === 'bn' ? 'নাম, প্রতিষ্ঠান বা মোবাইল দিয়ে খুঁজুন...' : 'Search by name, company or phone...'} 
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-popover/80 border-gray-800 h-9 sm:h-10 text-xs sm:text-sm rounded-xl focus:border-blue-500"
            />
          </div>
          <FilterChipBar
            filters={[
              { id: 'all', label: language === 'bn' ? 'সকল সাপ্লায়ার' : 'All Suppliers', count: suppliers.length },
              { id: 'due', label: language === 'bn' ? 'বাকি আছে' : 'Has Due', count: dueCount },
              { id: 'cleared', label: language === 'bn' ? 'পরিশোধিত' : 'Settled', count: clearedCount },
            ]}
            activeFilter={filterTab}
            onFilterChange={handleFilterChange}
          />
        </div>
      </div>

      {filteredSuppliers.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
            <Truck className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {language === 'bn' ? 'কোন সাপ্লায়ার পাওয়া যায়নি' : 'No suppliers found'}
          </h3>
          <p className="text-gray-400 text-sm">
            {language === 'bn' ? 'নতুন সাপ্লায়ার যোগ করুন অথবা সার্চ পরিবর্তন করুন।' : 'Add a new supplier or adjust your search filter.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto relative">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-gray-400 uppercase bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">{language === 'bn' ? 'সাপ্লায়ারের বিবরণ' : 'Supplier Details'}</th>
                    <th className="px-6 py-4 font-semibold">{language === 'bn' ? 'যোগাযোগ' : 'Contact'}</th>
                    <th className="px-6 py-4 font-semibold">{language === 'bn' ? 'মোট ক্রয়' : 'Total Purchase'}</th>
                    <th className="px-6 py-4 font-semibold">{language === 'bn' ? 'বকেয়া' : 'Due Amount'}</th>
                    <th className="px-6 py-4 font-semibold text-right">{language === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedSuppliers.map((s, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      key={s.id} 
                      className="hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white mb-1 flex items-center gap-2">
                          {s.name}
                          {s.status === 'Inactive' && (
                            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-medium">
                              {language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <Building className="w-3 h-3" /> {s.company}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-300 flex items-center gap-1.5 mb-1">
                          <Phone className="w-3.5 h-3.5 text-gray-500" /> {s.phone}
                        </div>
                        {s.address && (
                          <div className="text-xs text-gray-400 flex items-center gap-1.5 truncate max-w-[200px]" title={s.address}>
                            <MapPin className="w-3 h-3 text-gray-500 shrink-0" /> {s.address}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-300 font-medium">{formatCurrency(s.totalPurchase)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-bold ${s.due > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                          {formatCurrency(s.due)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {s.due > 0 && (
                            <button 
                              onClick={() => setPaymentModalSupplier(s)}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-400/10 hover:bg-emerald-400/20 px-2 py-0.5 rounded transition-colors"
                            >
                              <span className="font-bold text-[11px] leading-none">৳</span> {language === 'bn' ? 'বাকি পরিশোধ' : 'Pay Due'}
                            </button>
                          )}
                          <button 
                            onClick={() => setBillModalSupplier(s)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-400/10 hover:bg-blue-400/20 px-2 py-0.5 rounded transition-colors inline-flex"
                          >
                            <Plus className="w-3 h-3" /> {language === 'bn' ? 'বিল যোগ' : 'Add Bill'}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditModal(s)} 
                            className="text-gray-400 hover:text-blue-400"
                            title={language === 'bn' ? 'এডিট করুন' : 'Edit'}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setConfirmModal({ isOpen: true, id: s.id })} 
                            className="text-gray-400 hover:text-red-400"
                            title={language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (Sleek, Compact & Space-Efficient) */}
          <div className="md:hidden space-y-2.5">
            {paginatedSuppliers.map((s) => (
              <div 
                key={s.id} 
                className="bg-card/90 border border-gray-800/90 rounded-xl p-3 shadow-sm hover:border-gray-700 transition-all space-y-2.5"
              >
                {/* Top Row: Name, Company & Due Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-100 text-sm truncate">
                      {s.name}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5 truncate">
                      <span className="text-gray-300 font-medium truncate">{s.company}</span>
                      {s.phone && (
                        <>
                          <span>•</span>
                          <a 
                            href={`tel:${s.phone}`} 
                            className="text-blue-400 hover:underline flex items-center gap-1 font-medium shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="w-3 h-3 text-blue-400" />
                            <span>{s.phone}</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 border ${
                    s.due > 0 
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/25' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  }`}>
                    {s.due > 0 ? (language === 'bn' ? 'বাকি আছে' : 'Has Due') : (language === 'bn' ? 'পরিশোধিত' : 'Settled')}
                  </span>
                </div>

                {/* Middle Financial Strip: Total Purchase & Due Amount */}
                <div className="grid grid-cols-2 gap-2 bg-[#121523]/80 p-2 rounded-lg border border-gray-800/60 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block">{language === 'bn' ? 'মোট ক্রয়:' : 'Total Purchase:'}</span>
                    <span className="font-semibold text-gray-200">
                      {formatCurrency(s.totalPurchase)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block">{language === 'bn' ? 'বাকি পাওনা:' : 'Due Amount:'}</span>
                    <span className={`font-bold ${s.due > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                      {formatCurrency(s.due)}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  {s.due > 0 && (
                    <Button 
                      size="sm" 
                      onClick={() => setPaymentModalSupplier(s)} 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7.5 rounded-lg shadow-sm font-medium"
                    >
                      <span className="font-bold text-xs mr-1 leading-none">৳</span> {language === 'bn' ? 'পে ডিউ' : 'Pay Due'}
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setBillModalSupplier(s)} 
                    className="flex-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs h-7.5 rounded-lg font-medium"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'বিল যোগ' : 'Add Bill'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => openEditModal(s)} 
                    className="h-7.5 w-7.5 p-0 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg shrink-0"
                    title={language === 'bn' ? 'এডিট করুন' : 'Edit'}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setConfirmModal({ isOpen: true, id: s.id })} 
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
            totalItems={filteredSuppliers.length}
            itemsPerPage={itemsPerPage}
          />
        </>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto bg-popover border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              {editingSupplier 
                ? (language === 'bn' ? 'সাপ্লায়ার সম্পাদনা করুন' : 'Edit Supplier') 
                : (language === 'bn' ? 'নতুন সাপ্লায়ার যোগ করুন' : 'Add New Supplier')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{language === 'bn' ? 'সাপ্লায়ারের নাম' : 'Supplier Name'}</label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={language === 'bn' ? 'যেমন: রহিম মিয়া' : 'e.g. Rahim Miah'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{language === 'bn' ? 'প্রতিষ্ঠান / দোকানের নাম' : 'Company / Shop Name'}</label>
              <Input required value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder={language === 'bn' ? 'যেমন: রহিম টেলিকম' : 'e.g. Rahim Telecom'} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5 uppercase tracking-wider">{language === 'bn' ? 'ফোন নম্বর' : 'Phone Number'}</label>
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
                    onChange={e => {
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
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{language === 'bn' ? 'ঠিকানা (ঐচ্ছিক)' : 'Address (Optional)'}</label>
              <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder={language === 'bn' ? 'দোকানের ঠিকানা...' : 'Shop address...'} />
            </div>
            {editingSupplier && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</label>
                <Select value={formData.status} onValueChange={(v: any) => setFormData({...formData, status: v || 'Active'})}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">{language === 'bn' ? 'সক্রিয় (Active)' : 'Active'}</SelectItem>
                    <SelectItem value="Inactive">{language === 'bn' ? 'নিষ্ক্রিয় (Inactive)' : 'Inactive'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">
                {editingSupplier ? (language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Changes') : (language === 'bn' ? 'সাপ্লায়ার যোগ করুন' : 'Add Supplier')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay Due Modal */}
      <Dialog open={!!paymentModalSupplier} onOpenChange={(open) => !open && setPaymentModalSupplier(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[400px] max-h-[90vh] overflow-y-auto bg-popover border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {language === 'bn' ? 'সাপ্লায়ারকে বকেয়া পরিশোধ' : 'Pay Supplier'}
            </DialogTitle>
          </DialogHeader>
          {paymentModalSupplier && (
            <div className="mt-4">
              <div className="bg-secondary rounded-xl p-4 mb-6 border border-border flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">{language === 'bn' ? 'বর্তমান বকেয়া' : 'Current Due'}</p>
                  <p className="text-2xl font-bold text-orange-400">{formatCurrency(paymentModalSupplier.due)}</p>
                </div>
                <Wallet className="w-6 h-6 text-orange-500 opacity-50" />
              </div>
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">{language === 'bn' ? 'পরিশোধের পরিমাণ' : 'Payment Amount'}</label>
                  <Input 
                    type="number"
                    required
                    min="1"
                    max={paymentModalSupplier.due}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={language === 'bn' ? 'টাকার পরিমাণ লিখুন...' : 'Enter amount...'}
                    className="h-12 text-lg"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setPaymentModalSupplier(null)}>{t('common.cancel')}</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {language === 'bn' ? 'পেমেন্ট নিশ্চিত করুন' : 'Confirm Payment'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

            {/* Add Bill Modal */}
      <Dialog open={!!billModalSupplier} onOpenChange={(open) => !open && setBillModalSupplier(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[400px] max-h-[90vh] overflow-y-auto bg-popover border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {language === 'bn' ? 'নতুন বিল যোগ করুন' : 'Add New Bill'}
            </DialogTitle>
          </DialogHeader>
          {billModalSupplier && (
            <div className="mt-4">
              <form onSubmit={handleAddBill} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">{language === 'bn' ? 'বিলের পরিমাণ (মালামাল ক্রয়)' : 'Bill Amount (Purchase)'}</label>
                  <Input 
                    type="number"
                    required
                    min="1"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder={language === 'bn' ? 'বিলের পরিমাণ লিখুন...' : 'Enter bill amount...'}
                    className="h-12 text-lg"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setBillModalSupplier(null)}>{t('common.cancel')}</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                    {language === 'bn' ? 'বিল যোগ করুন' : 'Add Bill'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title={language === 'bn' ? 'সাপ্লায়ার মুছে ফেলবেন?' : 'Delete Supplier?'}
        message={language === 'bn' ? 'আপনি কি নিশ্চিত যে এই সাপ্লায়ারকে মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।' : 'Are you sure you want to delete this supplier? This action cannot be undone.'}
        confirmText={language === 'bn' ? 'মুছে ফেলুন' : 'Delete Supplier'}
      />
    </div>
  );
}



