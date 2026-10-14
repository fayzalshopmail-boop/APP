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
import { MobileDataCard } from '@/components/ui/MobileDataCard';
import { useAppStore } from '@/store/useAppStore';
import toast from "react-hot-toast";

export default function MechanicsPage() {
  const { user } = useAppStore();
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return toast.error("Name and Phone are required.");

    try {
      if (editingMechanic) {
        await mechanicService.update(editingMechanic.id, formData);
        setMechanics(mechanics.map(m => m.id === editingMechanic.id ? { ...m, ...formData } : m));
        toast.success("Mechanic updated!");
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
        toast.success("Mechanic added!");
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save mechanic.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await mechanicService.delete(id);
      setMechanics(mechanics.filter(m => m.id !== id));
      toast.success("Mechanic deleted!");
      setDeleteId(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete mechanic.");
    }
  };

  const handleAddCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMechanic || commissionAmount <= 0) return toast.error("Invalid commission amount.");
    
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
      toast.success("Commission added successfully!");
      setIsCommissionModalOpen(false);
      setCommissionAmount(0);
    } catch (error) {
      console.error(error);
      toast.error("Failed to add commission.");
    }
  };

  const handlePayCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMechanic || paymentAmount <= 0) return toast.error("Invalid payment amount.");
    if (paymentAmount > activeMechanic.commissionDue) return toast.error("Payment cannot exceed total due.");

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
      toast.success("Payment recorded successfully!");
      setIsPaymentModalOpen(false);
      setPaymentAmount(0);
    } catch (error) {
      console.error(error);
      toast.error("Failed to record payment.");
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
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-500" />
            Mechanics (B2B)
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage partner mechanics, their jobs, and commissions.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Add Mechanic
        </Button>
      </div>

      {/* 3-Card Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">বকেয়া কমিশন (Unpaid Commissions)</p>
              <h2 className="text-2xl font-bold text-blue-400">{formatCurrency(totalShopDueToMechanics)}</h2>
              <p className="text-[11px] text-gray-500 mt-1">{dueCount} জন মেকানিকের পাওনা বাকি</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
              <Coins className="w-4 h-4 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-purple-500/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">মোট পার্টনার মেকানিক</p>
              <h2 className="text-2xl font-bold text-white">{mechanics.length}</h2>
              <p className="text-[11px] text-gray-500 mt-1">{clearedCount} জন পরিশোধিত</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
              <Wrench className="w-4 h-4 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">সম্পন্ন কাজ (Jobs Brought)</p>
              <h2 className="text-2xl font-bold text-emerald-400">{totalJobs} টি</h2>
              <p className="text-[11px] text-gray-500 mt-1">সকল মেকানিকের মোট কাজ</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <Briefcase className="w-4 h-4 text-emerald-400" />
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
              placeholder="মেকানিকের নাম, মোবাইল বা ঠিকানা দিয়ে খুঁজুন..." 
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-background/50 h-10"
            />
          </div>
          <FilterChipBar
            filters={[
              { id: 'all', label: 'সকল মেকানিক', count: mechanics.length },
              { id: 'due', label: 'কমিশন বাকি', count: dueCount },
              { id: 'cleared', label: 'পরিশোধিত', count: clearedCount },
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
          <h3 className="text-lg font-medium text-gray-400">কোন মেকানিক পাওয়া যায়নি</h3>
          <p className="text-sm text-gray-500 mt-2">নতুন মেকানিক যোগ করুন অথবা সার্চ ফিল্টার পরিবর্তন করুন।</p>
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
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">বাকি আছে</span>
                      ) : (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">পরিশোধিত</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-500" /> {m.phone}</span>
                      {m.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-500" /> {m.address}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleOpenModal(m)} className="p-1.5 text-gray-500 hover:text-white rounded-md hover:bg-gray-800 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteId(m.id)} className="p-1.5 text-gray-500 hover:text-red-400 rounded-md hover:bg-red-400/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                
                <div className="p-5 grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-800/50">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Jobs Brought</p>
                    <p className="text-lg font-bold text-gray-200">{m.totalJobsBrought}</p>
                  </div>
                  <div className="bg-blue-500/5 rounded-xl p-3 border border-blue-500/10">
                    <p className="text-xs text-blue-400/70 mb-1 flex items-center gap-1"><Coins className="w-3 h-3" /> Due Balance</p>
                    <p className="text-lg font-bold text-blue-400">{formatCurrency(m.commissionDue)}</p>
                  </div>
                </div>

                <div className="px-5 pb-5 flex gap-3">
                  <Button 
                    onClick={() => { setActiveMechanic(m); setIsCommissionModalOpen(true); }} 
                    className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200"
                  >
                    <Calculator className="w-4 h-4 mr-2" /> Add Job
                  </Button>
                  <Button 
                    onClick={() => { setActiveMechanic(m); setIsPaymentModalOpen(true); }} 
                    disabled={m.commissionDue <= 0}
                    className="w-full bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 hover:text-emerald-300 disabled:opacity-50"
                  >
                    Pay Due
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {paginatedMechanics.map(m => (
              <MobileDataCard key={m.id}>
                <MobileDataCard.Header
                  title={m.name}
                  subtitle={m.phone}
                  badge={
                    m.commissionDue > 0 ? (
                      <span className="text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                        বাকি আছে
                      </span>
                    ) : (
                      <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                        পরিশোধিত
                      </span>
                    )
                  }
                />
                {m.address && (
                  <MobileDataCard.Details>
                    <div className="text-xs text-gray-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span>{m.address}</span>
                    </div>
                  </MobileDataCard.Details>
                )}
                <MobileDataCard.FinancialStrip
                  items={[
                    { label: 'মোট কাজ', value: `${m.totalJobsBrought} টি` },
                    { label: 'বকেয়া কমিশন', value: formatCurrency(m.commissionDue), highlight: m.commissionDue > 0 ? 'danger' : 'success' }
                  ]}
                />
                <MobileDataCard.Actions>
                  <Button 
                    size="sm"
                    onClick={() => { setActiveMechanic(m); setIsCommissionModalOpen(true); }}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs h-8"
                  >
                    <Calculator className="w-3.5 h-3.5 mr-1" /> কাজ যোগ
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setActiveMechanic(m); setIsPaymentModalOpen(true); }}
                    disabled={m.commissionDue <= 0}
                    className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs h-8 disabled:opacity-40"
                  >
                    <Coins className="w-3.5 h-3.5 mr-1" /> কমিশন পে
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleOpenModal(m)} className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteId(m.id)} className="h-8 w-8 p-0 text-gray-400 hover:text-red-400">
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
            totalItems={filteredMechanics.length}
            itemsPerPage={itemsPerPage}
          />
        </>
      )}

      {/* Add/Edit Mechanic Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {editingMechanic ? 'Edit Mechanic' : 'Add Mechanic'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Name <span className="text-red-400">*</span></label>
              <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Phone Number <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <span className="absolute left-9 top-1/2 -translate-y-1/2 font-medium text-gray-300 pointer-events-none">+880</span>
                  <Input 
                    required
                    value={formData.phone ? formData.phone.replace(/^\+880/, '') : ''}
                    onChange={(e) => {
                      let digits = e.target.value.replace(/\D/g, ''); 
                      if (digits.startsWith('0')) digits = digits.substring(1);
                      if (digits.length > 10) digits = digits.substring(0, 10);
                      setFormData({ ...formData, phone: '+880' + digits });
                    }}
                    className="pl-[76px]" 
                    placeholder="1711000000"
                    maxLength={11}
                  />
                </div>
              </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Shop / Address</label>
              <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Mechanic</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Job/Commission Modal */}
      <Dialog open={isCommissionModalOpen} onOpenChange={setIsCommissionModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Record New Job</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add commission for a job brought by {activeMechanic?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCommission} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Commission Amount <span className="text-red-400">*</span></label>
              <Input 
                type="number" required min="1"
                value={commissionAmount || ''}
                onChange={(e) => setCommissionAmount(parseInt(e.target.value) || 0)}
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsCommissionModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Add Commission</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay Commission Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Pay Commission</DialogTitle>
            <DialogDescription className="text-gray-400">
              Clear due balance for {activeMechanic?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePayCommission} className="space-y-4 pt-4">
            <div className="bg-gray-800/50 p-4 rounded-lg flex justify-between items-center mb-4 border border-gray-700">
              <span className="text-sm text-gray-400">Pending Due:</span>
              <span className="text-lg font-bold text-blue-400">{formatCurrency(activeMechanic?.commissionDue || 0)}</span>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Payment Amount <span className="text-red-400">*</span></label>
              <Input 
                type="number" required min="1" max={activeMechanic?.commissionDue}
                value={paymentAmount || ''}
                onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Record Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) handleDelete(deleteId); }}
        title="Delete Mechanic"
        message="Are you sure you want to delete this mechanic? This cannot be undone."
      />
    </div>
  );
}


