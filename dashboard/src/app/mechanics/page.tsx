'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Plus, Edit2, Trash2, Coins, Phone, MapPin, Calculator, Briefcase } from 'lucide-react';
import { mechanicService, Mechanic } from '@/lib/services/mechanic';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import toast from "react-hot-toast";

export default function MechanicsPage() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  
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
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchMechanics();
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
      setFormData({ name: '', phone: '', address: '' });
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
      const { newPaid, newDue } = await mechanicService.payCommission(activeMechanic.id, paymentAmount);
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

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Mechanics (B2B)</h1>
          <p className="text-gray-400 text-sm">Manage partner mechanics, their jobs, and commissions.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-10">
          <Plus className="w-4 h-4" /> Add Mechanic
        </Button>
      </div>

      {/* Summary Card */}
      <div className="bg-[#1a1d2d]/50 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden group mb-8">
        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-400">Total Unpaid Commissions (দিতে হবে)</p>
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Coins className="w-4 h-4 text-blue-400" />
          </div>
        </div>
        <h3 className="text-3xl font-bold text-blue-400">{formatCurrency(totalShopDueToMechanics)}</h3>
      </div>

      {/* Mechanics Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : mechanics.length === 0 ? (
        <div className="bg-card border border-gray-800 rounded-2xl p-12 text-center">
          <Wrench className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400">No mechanics found</h3>
          <p className="text-sm text-gray-500 mt-2">Add a mechanic to start tracking their jobs and commissions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {mechanics.map(m => (
            <div key={m.id} className="bg-card border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-colors">
              <div className="p-5 border-b border-gray-800/50 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{m.name}</h3>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {m.phone}</span>
                    {m.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {m.address}</span>}
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
              <label className="text-xs font-medium text-gray-400">Phone <span className="text-red-400">*</span></label>
              <Input required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
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
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete Mechanic"
        message="Are you sure you want to delete this mechanic? This cannot be undone."
      />
    </div>
  );
}

