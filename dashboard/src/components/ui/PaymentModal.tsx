'use client';
import { Input } from '@/components/ui/input';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Coins } from 'lucide-react';
import { Customer } from '@/lib/services/customer';
import { formatCurrency } from '@/lib/currency';

interface PaymentModalProps {
 isOpen: boolean;
 onClose: () => void;
 customer: Customer | null;
 onSave: (paymentAmount: number, nextDueDate?: string) => Promise<void>;
}

export function PaymentModal({ isOpen, onClose, customer, onSave }: PaymentModalProps) {
 const [amount, setAmount] = useState<string>('');
 const [nextDueDate, setNextDueDate] = useState<string>('');
 const [isSubmitting, setIsSubmitting] = useState(false);

 if (!customer) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 const payAmount = Number(amount);
 if (payAmount <= 0 || payAmount > customer.due) return;
 
 setIsSubmitting(true);
 try {
 await onSave(payAmount, payAmount < customer.due ? nextDueDate : undefined);
 setAmount('');
 onClose();
 } catch (error) {
 console.error(error);
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="sm:max-w-[400px] bg-popover text-white border-gray-800 shadow-2xl p-0 overflow-hidden ">
 <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-500" />
 
 <div className="p-6">
 <DialogHeader className="mb-6">
 <DialogTitle className="text-xl font-bold tracking-tight">Receive Payment</DialogTitle>
 <DialogDescription className="text-gray-400 mt-1.5">
 Collect due amount for <span className="text-gray-200 font-medium">{customer.name}</span>.
 </DialogDescription>
 </DialogHeader>

 <div className="bg-secondary rounded-xl p-4 mb-6 border border-gray-800 flex justify-between items-center">
 <div className="space-y-1">
 <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Current Due</p>
 <p className="text-2xl font-bold text-red-400">{formatCurrency(customer.due)}</p>
 </div>
 <div className="h-10 w-10 bg-red-500/10 rounded-full flex items-center justify-center">
 <Coins className="w-5 h-5 text-red-400" />
 </div>
 </div>

 <form onSubmit={handleSubmit} className="space-y-6">
 <div className="space-y-2">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Payment Amount</label>
 <div className="relative">
 <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-emerald-500">৳</span>
 <Input 
 type="text"
 inputMode="numeric"
 required
 autoFocus
 value={amount}
 onChange={(e) => {
 const val = e.target.value.replace(/\D/g, '');
 if (Number(val) <= customer.due) {
 setAmount(val);
 }
 }}
 className="pl-10 h-12 text-lg font-medium border-emerald-500/30 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50" 
 placeholder="0"
 />
 </div>
 
 {Number(amount) > 0 && (
 <p className="text-xs text-gray-400 text-right mt-2 mb-4">
 Remaining Due will be: <span className="text-emerald-400 font-medium">{formatCurrency(customer.due - Number(amount))}</span>
 </p>
 )}

 {Number(amount) > 0 && Number(amount) < customer.due && (
  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300 mb-6">
    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Next Due Date (For Remaining Amount)</label>
    <Input 
      type="date"
      required
      value={nextDueDate}
      onChange={(e) => setNextDueDate(e.target.value)}
      className="h-12 border-orange-500/30 focus-visible:ring-orange-500/50"
    />
  </div>
 )}
 </div>

 <div className="flex items-center gap-3 pt-2">

 <Button 
 type="button" 
 onClick={onClose}
 variant="ghost" className="flex-1 h-12"
 >
 Cancel
 </Button>
 <Button 
 type="submit" 
 disabled={isSubmitting || !amount || Number(amount) <= 0 || Number(amount) > customer.due}
 className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20 text-white"
 >
 {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Payment'}
 </Button>
 </div>
 </form>
 </div>
 </DialogContent>
 </Dialog>
 );
}
