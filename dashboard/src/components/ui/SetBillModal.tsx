'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Customer } from '@/lib/services/customer';
import { formatCurrency } from '@/lib/currency';
import { Tv, Phone, Coins, Loader2, MessageCircle, CheckCircle, Calendar, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface SetBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSave: (customerId: string, totalBill: number, discount?: number, expectedDeliveryDate?: string) => Promise<void>;
  smsSettings?: any;
}

export function SetBillModal({ isOpen, onClose, customer, onSave, smsSettings }: SetBillModalProps) {
  const { t, language } = useTranslation();
  const [totalBill, setTotalBill] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [expectedDate, setExpectedDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customer && isOpen) {
      setTotalBill(customer.totalBill && customer.totalBill > 0 ? customer.totalBill : '');
      setDiscount(customer.discount && customer.discount > 0 ? customer.discount : '');
      setExpectedDate(customer.expectedDeliveryDate || '');
    }
  }, [customer, isOpen]);

  if (!customer) return null;

  const numBill = typeof totalBill === 'number' ? totalBill : 0;
  const numDiscount = typeof discount === 'number' ? discount : 0;
  const advance = customer.advance || 0;
  const calculatedDue = Math.max(0, numBill - advance - numDiscount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numBill || numBill <= 0) return;

    try {
      setIsSubmitting(true);
      await onSave(customer.id, numBill, numDiscount || 0, expectedDate || undefined);
      onClose();
    } catch (err) {
      console.error('Failed to set bill:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWhatsAppMessage = () => {
    const brand = customer.deviceBrand || 'Appliance';
    const type = customer.deviceType ? ` (${customer.deviceType})` : '';
    if (language === 'bn') {
      return `প্রিয় ${customer.name}, আপনার ${brand}${type} সার্ভিসিং এর মোট খরচ ৳${numBill || 0} টাকা নির্ধারণ করা হয়েছে।${advance > 0 ? ` আপনার অগ্রিম ৳${advance} টাকা বাদ দিয়ে বাকি থাকবে ৳${calculatedDue} টাকা।` : ''} কাজ সম্পন্ন করতে আপনার সম্মতি প্রয়োজন। ধন্যবাদ!`;
    } else {
      return `Dear ${customer.name}, the servicing bill for your ${brand}${type} has been set to ৳${numBill || 0}.${advance > 0 ? ` Less advance of ৳${advance}, outstanding balance is ৳${calculatedDue}.` : ''} Please confirm to proceed. Thank you!`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[92vh] overflow-y-auto bg-popover text-white border-gray-800 shadow-2xl p-0 rounded-2xl">
        {/* Top Accent Gradient */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400" />

        <div className="p-5 sm:p-6 space-y-5">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Coins className="w-5 h-5" />
              </span>
              {language === 'bn' ? 'বিল নির্ধারণ করুন (Set Bill)' : 'Set Final Bill'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-gray-400">
              {language === 'bn' 
                ? 'ডিভাইস চেক করার পর কাস্টমারের মোট সার্ভিসিং খরচ ইনপুট দিন।' 
                : 'Enter total servicing cost after inspecting the device.'}
            </DialogDescription>
          </DialogHeader>

          {/* Customer & Device Summary Card */}
          <div className="bg-[#121526] rounded-xl p-3.5 border border-gray-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between font-semibold text-gray-200">
              <span className="text-sm text-white truncate">{customer.name}</span>
              <a 
                href={`tel:${customer.phone}`}
                className="flex items-center gap-1 text-blue-400 hover:underline font-mono"
              >
                <Phone className="w-3 h-3" />
                {customer.phone}
              </a>
            </div>

            <div className="flex items-center justify-between text-gray-400 pt-1 border-t border-gray-800/50">
              <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                <Tv className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{customer.deviceBrand || 'Appliance'} {customer.deviceType ? `• ${customer.deviceType}` : ''}</span>
              </div>
              <span className="text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded font-medium shrink-0">
                {customer.deviceProblem || 'Service'}
              </span>
            </div>

            {advance > 0 && (
              <div className="flex items-center justify-between text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-medium">
                <span>{language === 'bn' ? 'পূর্বের অগ্রিম জমা (Advance):' : 'Advance Paid:'}</span>
                <span className="font-bold">{formatCurrency(advance)}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Total Bill Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                <span>{language === 'bn' ? 'মোট সার্ভিসিং বিল (Total Bill) *' : 'Total Servicing Bill *'}</span>
                <span className="text-[11px] text-amber-400 font-normal lowercase">
                  {language === 'bn' ? 'বাধ্যতামূলক' : 'required'}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">৳</span>
                <Input 
                  type="text"
                  inputMode="numeric"
                  required
                  autoFocus
                  value={totalBill}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setTotalBill(val ? Number(val) : '');
                  }}
                  placeholder={language === 'bn' ? 'যেমন: ২৫০০' : 'e.g. 2500'}
                  className="pl-8 text-base font-bold bg-[#121526] border-gray-700 hover:border-gray-600 focus:!border-amber-500 focus:!ring-1 focus:!ring-amber-500/50 rounded-xl !h-11"
                />
              </div>
            </div>

            {/* Discount & Expected Delivery Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Discount Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {language === 'bn' ? 'ডিসকাউন্ট (Discount)' : 'Discount'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">৳</span>
                  <Input 
                    type="text"
                    inputMode="numeric"
                    value={discount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setDiscount(val ? Number(val) : '');
                    }}
                    placeholder="0"
                    className="pl-7 bg-[#121526] border-gray-800 text-sm rounded-xl !h-10"
                  />
                </div>
              </div>

              {/* Delivery Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {language === 'bn' ? 'সম্ভাব্য ডেলিভারি তারিখ' : 'Expected Delivery Date'}
                </label>
                <Input 
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="bg-[#121526] border-gray-800 text-gray-200 text-xs sm:text-sm rounded-xl !h-10"
                />
              </div>
            </div>

            {/* Calculation Preview Strip */}
            <div className="bg-secondary/60 rounded-xl p-3 border border-gray-800 flex items-center justify-between text-xs sm:text-sm">
              <div className="space-y-0.5 text-gray-400">
                <div>{language === 'bn' ? 'মোট বিল:' : 'Total Bill:'} <strong className="text-gray-200">{formatCurrency(numBill)}</strong></div>
                {advance > 0 && <div>{language === 'bn' ? 'অগ্রিম বাদ:' : 'Less Advance:'} <span className="text-emerald-400">-{formatCurrency(advance)}</span></div>}
                {numDiscount > 0 && <div>{language === 'bn' ? 'ডিসকাউন্ট:' : 'Less Discount:'} <span className="text-purple-400">-{formatCurrency(numDiscount)}</span></div>}
              </div>

              <div className="text-right">
                <span className="text-[11px] text-gray-400 uppercase tracking-wider block">
                  {language === 'bn' ? 'বকেয়া থাকবে (Due)' : 'Due Balance'}
                </span>
                <span className={`text-lg font-extrabold ${calculatedDue > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {calculatedDue > 0 ? formatCurrency(calculatedDue) : (language === 'bn' ? 'পরিশোধিত ✓' : 'Paid ✓')}
                </span>
              </div>
            </div>

            {/* Direct WhatsApp Share Link */}
            {numBill > 0 && customer.phone && (
              <a
                href={`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(getWhatsAppMessage())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{language === 'bn' ? 'কাস্টমারকে হোয়াটসঅ্যাপে বিল পাঠান' : 'Share Bill via WhatsApp'}</span>
              </a>
            )}

            {/* Actions Footer */}
            <div className="flex flex-row items-center justify-end gap-2 pt-2 border-t border-gray-800">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none text-gray-400 hover:text-white rounded-xl text-xs sm:text-sm h-10"
              >
                {t('common.cancel')}
              </Button>

              <Button 
                type="submit" 
                disabled={isSubmitting || !numBill || numBill <= 0}
                className="flex-1 sm:flex-none bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-orange-500/20 px-4 sm:px-5 h-10"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    {language === 'bn' ? 'বিল চূড়ান্ত করুন' : 'Save Final Bill'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
