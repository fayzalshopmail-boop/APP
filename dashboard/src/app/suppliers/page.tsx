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
import { MobileDataCard } from '@/components/ui/MobileDataCard';
import { useAppStore } from '@/store/useAppStore';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const { user } = useAppStore();
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
        toast.success("সাপ্লায়ার সফলভাবে যোগ করা হয়েছে!");
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("সাপ্লায়ার সংরক্ষণ করতে সমস্যা হয়েছে");
    }
  };

  const handleDelete = async () => {
    if (!confirmModal.id) return;
    try {
      await supplierService.delete(confirmModal.id);
      setSuppliers(suppliers.filter(s => s.id !== confirmModal.id));
      setConfirmModal({ isOpen: false, id: null });
      toast.success("সাপ্লায়ার মুছে ফেলা হয়েছে");
    } catch (err) {
      console.error(err);
      toast.error("সাপ্লায়ার মুছে ফেলতে সমস্যা হয়েছে");
    }
  };

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billModalSupplier) return;
    const amount = Number(billAmount);
    if (amount <= 0) return toast.error("সঠিক টাকার পরিমাণ লিখুন");

    try {
      const { newPurchase, newDue } = await supplierService.addBill(billModalSupplier.id, amount);
      setSuppliers(suppliers.map(s => 
        s.id === billModalSupplier.id ? { ...s, totalPurchase: newPurchase, due: newDue } : s
      ));
      setBillModalSupplier(null);
      setBillAmount('');
      toast.success("বিল সফলভাবে যোগ করা হয়েছে!");
    } catch (err) {
      console.error(err);
      toast.error("বিল যোগ করতে সমস্যা হয়েছে");
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalSupplier) return;
    const amount = Number(paymentAmount);
    if (amount <= 0 || amount > paymentModalSupplier.due) return toast.error("সঠিক টাকার পরিমাণ লিখুন");

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
      toast.success("পেমেন্ট সফলভাবে সম্পন্ন হয়েছে!");
    } catch (err) {
      console.error(err);
      toast.error("পেমেন্ট সম্পন্ন করতে সমস্যা হয়েছে");
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
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-purple-500" />
            Suppliers & Dealers
          </h1>
          <p className="text-sm text-gray-400 mt-1">Manage your parts suppliers and their payment dues</p>
        </div>
        <Button onClick={openAddModal} className="hidden sm:inline-flex bg-purple-600 hover:bg-purple-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Add Supplier
        </Button>
      </div>

      {/* 3-Card Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-orange-500/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">সাপ্লায়ার বাকি (Payable Due)</p>
              <h2 className="text-2xl font-bold text-orange-400">{formatCurrency(totalShopDue)}</h2>
              <p className="text-[11px] text-gray-500 mt-1">{dueCount} জন সাপ্লায়ারের বাকি আছে</p>
            </div>
            <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20">
              <Wallet className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-purple-500/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">মোট সাপ্লায়ার (Suppliers)</p>
              <h2 className="text-2xl font-bold text-white">{suppliers.length}</h2>
              <p className="text-[11px] text-gray-500 mt-1">{clearedCount} জন পরিশোধিত</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
              <Truck className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">মোট মালামাল ক্রয় (Purchases)</p>
              <h2 className="text-2xl font-bold text-emerald-400">{formatCurrency(totalPurchases)}</h2>
              <p className="text-[11px] text-gray-500 mt-1">সর্বমোট ক্রয় হিসাব</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <Building className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Chip Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input 
              placeholder="নাম, প্রতিষ্ঠান বা মোবাইল দিয়ে খুঁজুন..." 
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-background/50 h-10"
            />
          </div>
          <FilterChipBar
            filters={[
              { id: 'all', label: 'সকল সাপ্লায়ার', count: suppliers.length },
              { id: 'due', label: 'বাকি আছে', count: dueCount },
              { id: 'cleared', label: 'পরিশোধিত', count: clearedCount },
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
          <h3 className="text-lg font-semibold text-white mb-2">কোন সাপ্লায়ার পাওয়া যায়নি</h3>
          <p className="text-gray-400 text-sm">নতুন সাপ্লায়ার যোগ করুন অথবা সার্চ পরিবর্তন করুন।</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto relative">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-gray-400 uppercase bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Supplier Details</th>
                    <th className="px-6 py-4 font-semibold">Contact</th>
                    <th className="px-6 py-4 font-semibold">Total Purchase</th>
                    <th className="px-6 py-4 font-semibold">Due Amount</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
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
                            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-medium">Inactive</span>
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
                              <span className="font-bold text-[11px] leading-none">৳</span> Pay Due
                            </button>
                          )}
                          <button 
                            onClick={() => setBillModalSupplier(s)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-400/10 hover:bg-blue-400/20 px-2 py-0.5 rounded transition-colors inline-flex"
                          >
                            <Plus className="w-3 h-3" /> Add Bill
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditModal(s)} className="text-gray-400 hover:text-blue-400">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setConfirmModal({ isOpen: true, id: s.id })} className="text-gray-400 hover:text-red-400">
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {paginatedSuppliers.map((s) => (
              <MobileDataCard key={s.id}>
                <MobileDataCard.Header
                  title={s.name}
                  subtitle={s.company}
                  badge={
                    s.due > 0 ? (
                      <span className="text-[11px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-medium">
                        বাকি আছে
                      </span>
                    ) : (
                      <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                        পরিশোধিত
                      </span>
                    )
                  }
                />
                <MobileDataCard.Details>
                  <div className="flex flex-col gap-1 text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-500" />
                      <span>{s.phone}</span>
                    </div>
                    {s.address && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span className="truncate">{s.address}</span>
                      </div>
                    )}
                  </div>
                </MobileDataCard.Details>
                <MobileDataCard.FinancialStrip
                  items={[
                    { label: 'মোট ক্রয়', value: formatCurrency(s.totalPurchase) },
                    { label: 'বাকি পাওনা', value: formatCurrency(s.due), highlight: s.due > 0 ? 'danger' : 'success' },
                  ]}
                />
                <MobileDataCard.Actions>
                  {s.due > 0 && (
                    <Button 
                      size="sm" 
                      onClick={() => setPaymentModalSupplier(s)} 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                    >
                      <span className="font-bold text-xs mr-1 leading-none">৳</span> পে ডিউ
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setBillModalSupplier(s)} 
                    className="flex-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs h-8"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> বিল যোগ
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => openEditModal(s)} 
                    className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setConfirmModal({ isOpen: true, id: s.id })} 
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </MobileDataCard.Actions>
              </MobileDataCard>
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
              {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Supplier Name</label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Rahim Miah" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Company / Shop Name</label>
              <Input required value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="e.g. Rahim Telecom" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Phone Number</label>
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
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Address (Optional)</label>
              <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Shop address..." />
            </div>
            {editingSupplier && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Status</label>
                <Select value={formData.status} onValueChange={(v: any) => setFormData({...formData, status: v || 'Active'})}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">
                {editingSupplier ? 'Save Changes' : 'Add Supplier'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay Due Modal */}
      <Dialog open={!!paymentModalSupplier} onOpenChange={(open) => !open && setPaymentModalSupplier(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[400px] max-h-[90vh] overflow-y-auto bg-popover border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Pay Supplier</DialogTitle>
          </DialogHeader>
          {paymentModalSupplier && (
            <div className="mt-4">
              <div className="bg-secondary rounded-xl p-4 mb-6 border border-border flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Current Due</p>
                  <p className="text-2xl font-bold text-orange-400">{formatCurrency(paymentModalSupplier.due)}</p>
                </div>
                <Wallet className="w-6 h-6 text-orange-500 opacity-50" />
              </div>
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Payment Amount</label>
                  <Input 
                    type="number"
                    required
                    min="1"
                    max={paymentModalSupplier.due}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="h-12 text-lg"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setPaymentModalSupplier(null)}>Cancel</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Confirm Payment</Button>
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
            <DialogTitle className="text-xl font-bold text-white">Add New Bill</DialogTitle>
          </DialogHeader>
          {billModalSupplier && (
            <div className="mt-4">
              <form onSubmit={handleAddBill} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Bill Amount (Purchase)</label>
                  <Input 
                    type="number"
                    required
                    min="1"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder="Enter bill amount..."
                    className="h-12 text-lg"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setBillModalSupplier(null)}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Add Bill</Button>
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
        title="Delete Supplier?"
        message="Are you sure you want to delete this supplier? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}



