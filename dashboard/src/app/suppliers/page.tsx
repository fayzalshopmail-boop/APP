'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Plus, Search, Edit, Trash2, Phone, Building, MapPin, DollarSign, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/currency';
import { supplierService, Supplier } from '@/lib/services/supplier';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
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
    phone: '',
    address: '',
    status: 'Active' as 'Active' | 'Inactive'
  });
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, []);

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
    setFormData({ name: '', company: '', phone: '', address: '', status: 'Active' });
    setIsModalOpen(true);
  };

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
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save supplier");
    }
  };

  const handleDelete = async () => {
    if (!confirmModal.id) return;
    try {
      await supplierService.delete(confirmModal.id);
      setSuppliers(suppliers.filter(s => s.id !== confirmModal.id));
      setConfirmModal({ isOpen: false, id: null });
    } catch (err) {
      console.error(err);
      alert("Failed to delete supplier");
    }
  };

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billModalSupplier) return;
    const amount = Number(billAmount);
    if (amount <= 0) return alert("Invalid amount");

    try {
      const { newPurchase, newDue } = await supplierService.addBill(billModalSupplier.id, amount);
      setSuppliers(suppliers.map(s => 
        s.id === billModalSupplier.id ? { ...s, totalPurchase: newPurchase, due: newDue } : s
      ));
      setBillModalSupplier(null);
      setBillAmount('');
    } catch (err) {
      console.error(err);
      alert("Failed to add bill");
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalSupplier) return;
    const amount = Number(paymentAmount);
    if (amount <= 0 || amount > paymentModalSupplier.due) return alert("Invalid amount");

    try {
      const { newPaid, newDue } = await supplierService.addPayment(paymentModalSupplier.id, amount);
      setSuppliers(suppliers.map(s => 
        s.id === paymentModalSupplier.id ? { ...s, totalPaid: newPaid, due: newDue } : s
      ));
      setPaymentModalSupplier(null);
      setPaymentAmount('');
    } catch (err) {
      console.error(err);
      alert("Payment failed");
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  const totalShopDue = suppliers.reduce((sum, s) => sum + s.due, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-purple-500" />
            Suppliers & Dealers
          </h1>
          <p className="text-sm text-gray-400 mt-1">Manage your parts suppliers and their payment dues</p>
        </div>
        <Button 
          onClick={openAddModal}
          className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Supplier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1 uppercase tracking-wider">Payable to Suppliers</p>
              <h2 className="text-3xl font-bold text-white">{formatCurrency(totalShopDue)}</h2>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center bg-card/50">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input 
              placeholder="Search by name, company, or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>
        </div>

        {filteredSuppliers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
              <Truck className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No suppliers found</h3>
            <p className="text-gray-400 text-sm">Add your first supplier to start tracking purchases.</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)] relative">
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
                {filteredSuppliers.map((s, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
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
                      {s.due > 0 && (
                        <button 
                          onClick={() => setPaymentModalSupplier(s)}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 mt-1 flex items-center gap-1 bg-emerald-400/10 hover:bg-emerald-400/20 px-2 py-0.5 rounded transition-colors"
                        >
                          <DollarSign className="w-3 h-3" /> Pay Due
                        </button>
                      )}
                      <button 
                        onClick={() => setBillModalSupplier(s)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 mt-1 ml-2 flex items-center gap-1 bg-blue-400/10 hover:bg-blue-400/20 px-2 py-0.5 rounded transition-colors inline-flex"
                      >
                        <Plus className="w-3 h-3" /> Add Bill
                      </button>
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
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-popover border-border">
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
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Phone Number</label>
              <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="01XXX-XXXXXX" />
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
        <DialogContent className="sm:max-w-[400px] bg-popover border-border">
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
        <DialogContent className="sm:max-w-[400px] bg-popover border-border">
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



