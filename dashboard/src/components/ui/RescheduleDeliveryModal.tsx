'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Customer, customerService } from '@/lib/services/customer';
import { CalendarClock, Phone, Tv, Loader2, MessageCircle, AlertCircle, CheckCircle2, Calendar, FileText } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/useAppStore';

interface RescheduleDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSuccess?: (updatedCustomer: Customer) => void;
  smsSettings?: any;
}

function getFormattedDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

export function RescheduleDeliveryModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
  smsSettings
}: RescheduleDeliveryModalProps) {
  const { language } = useTranslation();
  const isBangla = language === 'bn';
  const { shop } = useAppStore();

  const [selectedDate, setSelectedDate] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customer && isOpen) {
      setSelectedDate(customer.expectedDeliveryDate || getFormattedDate(1));
      setNote(customer.rescheduleNote || '');
    }
  }, [customer, isOpen]);

  if (!customer) return null;

  const todayStr = getFormattedDate(0);

  const presets = [
    { labelBn: 'আগামীকাল', labelEn: 'Tomorrow', days: 1 },
    { labelBn: '২ দিন পর', labelEn: 'In 2 Days', days: 2 },
    { labelBn: '৩ দিন পর', labelEn: 'In 3 Days', days: 3 },
    { labelBn: '১ সপ্তাহ পর', labelEn: 'Next Week', days: 7 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      toast.error(isBangla ? 'অনুগ্রহ করে নতুন ডেলিভারি তারিখ সিলেক্ট করুন' : 'Please select a delivery date');
      return;
    }

    try {
      setIsSubmitting(true);
      const updates = await customerService.rescheduleDelivery(
        customer.id,
        selectedDate,
        note,
        customer.rescheduleCount || 0
      );

      toast.success(
        isBangla 
          ? 'ডেলিভারি তারিখ সফলভাবে পুনঃনির্ধারণ করা হয়েছে!' 
          : 'Delivery date successfully rescheduled!'
      );

      const updatedCustomer: Customer = {
        ...customer,
        ...updates
      };

      onSuccess?.(updatedCustomer);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || (isBangla ? 'রিসিডিউল সংরক্ষণ করতে সমস্যা হয়েছে' : 'Failed to reschedule delivery'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWhatsAppMessage = () => {
    const brand = customer.deviceBrand || 'Device';
    const type = customer.deviceType ? ` (${customer.deviceType})` : '';
    const shopName = shop?.shopName || 'VVSC';
    const shopPhone = shop?.phone || '';

    if (isBangla) {
      return `আসসালামু আলাইকুম ${customer.name || 'গ্রাহক'},\n` +
             `আপনার অনুরোধ অনুযায়ী আপনার ${brand}${type}-এর সম্ভাব্য ডেলিভারি তারিখ *${selectedDate}* এ পুনঃনির্ধারণ করা হয়েছে।\n\n` +
             `যেকোনো তথ্যের জন্য কল করুন: ${shopPhone}\n` +
             `ধন্যবাদ — *${shopName}*`;
    }

    return `Dear ${customer.name || 'Customer'},\n` +
           `As per your request, the delivery date for your ${brand}${type} has been rescheduled to *${selectedDate}*.\n\n` +
           `For any queries, please call: ${shopPhone}\n` +
           `Thank you — *${shopName}*`;
  };

  const currentCount = customer.rescheduleCount || 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full bg-[#121524] border border-gray-800 text-white p-5 sm:p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-gray-800/80 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {isBangla ? 'ডেলিভারি তারিখ রিসিডিউল' : 'Reschedule Delivery Date'}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400 mt-0.5">
                {isBangla 
                  ? 'কাস্টমারের অনুরোধ অনুযায়ী পরবর্তী ডেলিভারি তারিখ নির্ধারণ করুন' 
                  : 'Update the delivery date based on customer request'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Customer & Device Summary Box */}
        <div className="p-3.5 bg-[#1b1f30] border border-gray-800 rounded-xl space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-200 text-sm">{customer.name}</span>
              {customer.customId && (
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  #{customer.customId}
                </span>
              )}
            </div>
            <a 
              href={`tel:${customer.phone}`}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded-md transition-colors"
              title={isBangla ? "কাস্টমারকে কল দিন" : "Call Customer"}
            >
              <Phone className="w-3 h-3" />
              <span>{customer.phone}</span>
            </a>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-800/60">
            <div className="flex items-center gap-1.5 truncate">
              <Tv className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-300 font-medium">
                {customer.deviceBrand || 'Device'} {customer.deviceType ? `(${customer.deviceType})` : ''}
              </span>
            </div>
            {currentCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium shrink-0">
                {isBangla ? `পূর্বে ${currentCount} বার পেছানো হয়েছে` : `Rescheduled ${currentCount} time(s)`}
              </span>
            )}
          </div>

          {customer.expectedDeliveryDate && (
            <div className="text-[11px] text-gray-400 flex items-center justify-between pt-0.5">
              <span>{isBangla ? 'বর্তমান তারিখ:' : 'Current Date:'}</span>
              <span className="font-semibold text-gray-200">{customer.expectedDeliveryDate}</span>
            </div>
          )}
        </div>

        {/* Reschedule Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Date Presets */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{isBangla ? 'কুইক ডেট নির্বাচন (Quick Pick)' : 'Quick Presets'}</span>
              <span className="text-[10px] text-blue-400 font-normal lowercase">{isBangla ? '১ ক্লিকে সেট করুন' : '1 click to set'}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {presets.map((p) => {
                const targetDate = getFormattedDate(p.days);
                const isSelected = selectedDate === targetDate;
                return (
                  <button
                    key={p.days}
                    type="button"
                    onClick={() => setSelectedDate(targetDate)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all text-center flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                        : 'bg-[#1b1f30] border-gray-800 text-gray-300 hover:border-gray-700 hover:bg-[#20253a]'
                    }`}
                  >
                    <span>{isBangla ? p.labelBn : p.labelEn}</span>
                    <span className="text-[10px] font-normal opacity-70 mt-0.5">{targetDate}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>{isBangla ? 'নতুন ডেলিভারি তারিখ' : 'New Delivery Date'}</span>
            </label>
            <input
              type="date"
              min={todayStr}
              required
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-[#1b1f30] border border-gray-800 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Reschedule Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>{isBangla ? 'কাস্টমারের কারণ বা মন্তব্য (অপশনাল)' : 'Customer Note / Reason (Optional)'}</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isBangla ? 'যেমন: কাস্টমার বাইরে আছেন, রবিবার সন্ধ্যায় নেবেন...' : 'e.g. Customer out of town, will collect Sunday...'}
              className="w-full bg-[#1b1f30] border border-gray-800 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            {/* WhatsApp notification button */}
            {customer.phone ? (
              <a
                href={`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(getWhatsAppMessage())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 border border-emerald-500/25 transition-all flex items-center justify-center gap-1.5"
                title={isBangla ? 'হোয়াটসঅ্যাপে নতুন তারিখের মেসেজ পাঠান' : 'Send WhatsApp Confirmation'}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{isBangla ? 'WhatsApp নোটিশ' : 'WhatsApp'}</span>
              </a>
            ) : <div />}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedDate}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{isBangla ? 'রিসিডিউল নিশ্চিত করুন' : 'Confirm Reschedule'}</span>
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
