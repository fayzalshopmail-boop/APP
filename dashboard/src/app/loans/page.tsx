'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Plus, ArrowUpRight, ArrowDownRight, Edit2, Trash2, CheckCircle, Coins, CalendarClock, History, MessageSquare, Send, Phone } from 'lucide-react';
import { loanService, Loan } from '@/lib/services/loan';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import toast from "react-hot-toast";

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const closePaymentModal = () => {
    setPaymentModalData(null);
    if (window.history.state?.modal === 'loans-modal') window.history.back();
  };
  const closeHistoryModal = () => {
    setHistoryModalData(null);
    if (window.history.state?.modal === 'loans-modal') window.history.back();
  };

  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyModalData, setHistoryModalData] = useState<Loan | null>(null);
  const [sendingSmsId, setSendingSmsId] = useState<string | null>(null);

  // Partial Payment Modal State
  const [paymentModalData, setPaymentModalData] = useState<Loan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [nextDate, setNextDate] = useState<string>('');

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
    if (window.history.state?.modal === 'loans-modal') window.history.back();
  };


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

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const data = await loanService.getAll();
      setLoans(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (loan?: Loan) => {
    if (loan) {
      setEditingLoan(loan);
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
    if (!formData.personName || formData.amount <= 0) return toast.error("Please fill required fields properly.");

    try {
      if (editingLoan) {
        await loanService.update(editingLoan.id, formData);
        setLoans(loans.map(l => l.id === editingLoan.id ? { ...l, ...formData } as Loan : l));
        toast.success("Loan updated!");
      } else {
        const newId = await loanService.add(formData);
        const newLoan: Loan = { id: newId, ...formData, createdAt: new Date() };
        setLoans([newLoan, ...loans]);
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
      setLoans(loans.filter(l => l.id !== id));
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
        paymentAmount < remaining ? nextDate : undefined
      );
      
      setLoans(loans.map(l => l.id === paymentModalData.id ? { 
        ...l, 
        paidAmount: newPaid, 
        status, 
        nextPaymentDate: status === 'Paid' ? undefined : (paymentAmount < remaining && nextDate ? nextDate : l.nextPaymentDate) 
      } : l));
      
      toast.success("Payment recorded!");
      closePaymentModal();
      setPaymentAmount(0);
      setNextDate('');
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
      
      // We need a phone number. We don't store phone numbers in loans currently!
      // Wait, we can ask for a phone number using a prompt.
      let phone = loan.phone;
      if (phone && !phone.startsWith('+880') && phone.length === 11) {
        phone = '+880' + phone.substring(1); // convert 017... to +88017...
      } else if (phone && !phone.startsWith('+880') && phone.length === 10) {
        phone = '+880' + phone;
      }
      
      if (!phone || phone.length < 11) {
        const manualPhone = window.prompt(`Enter mobile number for ${loan.personName} to send SMS:`, loan.phone || "");
        if (!manualPhone || manualPhone.length < 11) {
          toast.error("Valid phone number required.");
          return;
        }
        phone = manualPhone;
      }
      if (!phone || phone.length < 11) {
        toast.error("Valid phone number required.");
        return;
      }

      const dueAmount = loan.amount - (loan.paidAmount || 0);
      let template = loan.type === 'Given' ? smsSettings.loanGivenTemplate : smsSettings.loanTakenTemplate;
      
      if (!template) {
        template = 'Dear {name}, your unpaid loan of {due} TK at {shop} is due. Please clear it ASAP. Thank you.';
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

  const pendingGiven = loans.filter(l => l.type === 'Given' && l.status === 'Pending').reduce((acc, l) => acc + (l.amount - (l.paidAmount || 0)), 0);
  const pendingTaken = loans.filter(l => l.type === 'Taken' && l.status === 'Pending').reduce((acc, l) => acc + (l.amount - (l.paidAmount || 0)), 0);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4 mb-4">
        
        <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-10">
          <Plus className="w-4 h-4" /> Add Record
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#1a1d2d]/50 border border-orange-500/20 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-400">Total Money Given (পাবো)</p>
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <ArrowUpRight className="w-4 h-4 text-orange-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-orange-400">{formatCurrency(pendingGiven)}</h3>
        </div>

        <div className="bg-[#1a1d2d]/50 border border-red-500/20 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-400">Total Money Taken (দিতে হবে)</p>
            <div className="p-2 bg-red-500/10 rounded-lg">
              <ArrowDownRight className="w-4 h-4 text-red-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-red-400">{formatCurrency(pendingTaken)}</h3>
        </div>
      </div>

      {/* Loan List */}
      <div className="bg-card border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" /> All Records
          </h2>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)] relative">
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
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Loading records...</td></tr>
              ) : loans.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No loan records found.</td></tr>
              ) : loans.map((l) => (
                <tr key={l.id} className="hover:bg-gray-800/20 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-200">
                    {l.personName}
                    {l.notes && <p className="text-xs text-gray-500 font-normal mt-0.5">{l.notes}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      l.type === 'Given' ? 'bg-orange-500/10 text-orange-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {l.type === 'Given' ? 'Given (পাবো)' : 'Taken (দিতে হবে)'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-200">{formatCurrency(l.amount)}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-yellow-500">
                      {l.status === 'Paid' ? formatCurrency(0) : formatCurrency(l.amount - (l.paidAmount || 0))}
                    </div>
                    {l.status === 'Pending' && l.nextPaymentDate && (
                      <div className="flex items-center gap-1 text-xs text-blue-400 mt-1">
                        <CalendarClock className="w-3 h-3" />
                        Next: {l.nextPaymentDate}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {l.date}
                    {l.status === 'Paid' && (
                      <span className="block mt-1 text-xs font-medium px-2 py-0.5 rounded w-fit bg-emerald-500/10 text-emerald-400">
                        Paid
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {l.status === 'Pending' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { setPaymentModalData(l); setNextDate(''); }} 
                              className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10" 
                              title="Add Payment (আংশিক পরিশোধ)"
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
                      <Button variant="ghost" size="icon" onClick={() => handleOpenModal(l)} className="h-8 w-8 text-gray-400 hover:text-white" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(l.id)} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Partial Payment Modal */}
      <Dialog open={!!paymentModalData} onOpenChange={(open) => !open && closePaymentModal()}>
        <DialogContent className="sm:max-w-[400px] bg-popover border-border">
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
              <Button type="button" variant="outline" onClick={() => closePaymentModal()}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Save Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(v) => !v && closeLoanModal()}>
        <DialogContent className="sm:max-w-[425px] bg-popover border-border">
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
                  <span className="absolute left-9 top-1/2 -translate-y-1/2 font-medium text-gray-300 pointer-events-none">+880</span>
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
              <Button type="button" variant="outline" onClick={() => closeLoanModal()}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Record</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
                      <p className="text-sm font-medium text-gray-200">{h.type === 'Payment' ? 'Partial Payment' : 'Initial Entry'}</p>
                      <p className="text-xs text-gray-500">{new Date(h.date).toLocaleString()}</p>
                    </div>
                    <div className={`font-bold ${h.type === 'Payment' ? 'text-emerald-400' : 'text-orange-400'}`}>
                      {h.type === 'Payment' ? '+' : ''}{formatCurrency(h.amount)}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50 mt-4 border border-gray-700">
                  <span className="text-sm font-bold text-white">Total Due</span>
                  <span className="text-lg font-bold text-red-400">{formatCurrency((historyModalData.amount || 0) - (historyModalData.paidAmount || 0))}</span>
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

