'use client';

import { useState, useEffect } from 'react';
import { Customer, customerService } from '@/lib/services/customer';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAppStore } from '@/store/useAppStore';
import { getLocalDateString } from '@/lib/utils';
import { CalendarClock, X, Calendar, AlertCircle, MessageSquare, Send, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface RescheduleDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSuccess: (updatedCustomer: Customer) => void;
}

export function RescheduleDeliveryModal({
  isOpen,
  onClose,
  customer,
  onSuccess
}: RescheduleDeliveryModalProps) {
  const { language } = useTranslation();
  const { shop } = useAppStore();
  const isBangla = language === 'bn';

  const [selectedDate, setSelectedDate] = useState('');
  const [note, setNote] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer && isOpen) {
      // Default to tomorrow or current expected date
      if (customer.expectedDeliveryDate) {
        setSelectedDate(customer.expectedDeliveryDate);
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setSelectedDate(getLocalDateString(tomorrow));
      }
      setNote(customer.rescheduleNote || '');
      setSendWhatsApp(false);
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const todayStr = getLocalDateString(new Date());

  const getPresetDate = (daysAhead: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return getLocalDateString(d);
  };

  const presetOptions = [
    { labelBn: 'আগামীকাল', labelEn: 'Tomorrow', days: 1 },
    { labelBn: '২ দিন পর', labelEn: 'In 2 Days', days: 2 },
    { labelBn: '৩ দিন পর', labelEn: 'In 3 Days', days: 3 },
    { labelBn: '৫ দিন পর', labelEn: 'In 5 Days', days: 5 },
    { labelBn: '১ সপ্তাহ পর', labelEn: 'Next Week', days: 7 }
  ];

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    } catch {}
    return dateStr;
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      toast.error(isBangla ? 'অনুগ্রহ করে নতুন ডেলিভারি তারিখ নির্ধারণ করুন' : 'Please select a new delivery date');
      return;
    }

    try {
      setLoading(true);
      const res = await customerService.rescheduleDelivery(customer.id, selectedDate, note);
      
      const updatedCustomer: Customer = {
        ...customer,
        expectedDeliveryDate: res.expectedDeliveryDate,
        isRescheduled: true,
        rescheduledAt: new Date().toISOString(),
        rescheduleNote: res.rescheduleNote,
        rescheduleCount: res.rescheduleCount
      };

      toast.success(
        isBangla
          ? `ডেলিভারি তারিখ সফলভাবে ${formatDisplayDate(selectedDate)}-এ পরিবর্তন করা হয়েছে!`
          : `Delivery date rescheduled to ${formatDisplayDate(selectedDate)}!`
      );

      // Trigger WhatsApp message if checked
      if (sendWhatsApp && customer.phone) {
        const cleanPhone = customer.phone.replace(/\D/g, '');
        const targetPhone = cleanPhone.startsWith('880') ? cleanPhone : (cleanPhone.startsWith('0') ? '88' + cleanPhone : '880' + cleanPhone);
        const shopTitle = shop?.shopName || 'VVSC';
        const msg = isBangla
          ? `আসসালামু আলাইকুম ${customer.name}, আপনার অনুরোধে ${shopTitle}-এ থাকা আপনার ${customer.deviceBrand || ''} ${customer.deviceType || 'ডিভাইস'}-এর ডেলিভারি তারিখ ${formatDisplayDate(selectedDate)} এ পুনঃনির্ধারণ করা হয়েছে।\nঅনলাইন ট্র্যাকিং লিংক: ${typeof window !== 'undefined' ? window.location.origin : ''}/track?id=${customer.customId || customer.id}`
          : `Hello ${customer.name}, as requested, your ${customer.deviceBrand || ''} ${customer.deviceType || 'device'} delivery date at ${shopTitle} has been rescheduled to ${formatDisplayDate(selectedDate)}.\nTrack online: ${typeof window !== 'undefined' ? window.location.origin : ''}/track?id=${customer.customId || customer.id}`;
        
        window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
      }

      onSuccess(updatedCustomer);
      onClose();
    } catch (err: any) {
      console.error('Failed to reschedule delivery:', err);
      toast.error(err?.message || (isBangla ? 'তারিখ পরিবর্তন করতে সমস্যা হয়েছে' : 'Failed to reschedule delivery'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#121524] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800/80 bg-[#161a2d]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {isBangla ? 'ডেলিভারি তারিখ রিসিডিউল' : 'Reschedule Delivery Date'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {customer.name} • {customer.deviceBrand} {customer.deviceType} {customer.customId ? `(#${customer.customId})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-4 sm:p-6 space-y-5">
          {/* Current Status & Past Reschedule Badge */}
          <div className="p-3.5 rounded-xl bg-[#1b1f30] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-gray-400 uppercase tracking-wider block text-[10px] font-semibold">
                {isBangla ? 'বর্তমান প্রত্যাশিত তারিখ' : 'Current Promised Date'}
              </span>
              <span className="text-white font-medium text-sm mt-0.5 block">
                {customer.expectedDeliveryDate ? formatDisplayDate(customer.expectedDeliveryDate) : (isBangla ? 'নির্ধারিত ছিল না' : 'Not set')}
              </span>
            </div>
            {Boolean(customer.rescheduleCount && customer.rescheduleCount > 0) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium self-start sm:self-auto">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isBangla ? `পূর্বে ${customer.rescheduleCount} বার তারিখ পিছিয়েছেন` : `Postponed ${customer.rescheduleCount} time(s) previously`}
                </span>
              </span>
            )}
          </div>

          {/* Quick Date Presets */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              {isBangla ? 'দ্রুত তারিখ নির্বাচন (১-ক্লিক)' : 'Quick Presets (1-Click)'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {presetOptions.map((opt) => {
                const targetDate = getPresetDate(opt.days);
                const isSelected = selectedDate === targetDate;
                return (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setSelectedDate(targetDate)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm shadow-blue-500/20 ring-1 ring-blue-500'
                        : 'bg-[#1b1f30] border-gray-800 text-gray-300 hover:border-gray-700 hover:bg-[#20253a]'
                    }`}
                  >
                    <span>{isBangla ? opt.labelBn : opt.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
              {isBangla ? 'নতুন ডেলিভারি তারিখ' : 'New Delivery Date'}
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={todayStr}
                className="w-full bg-[#1b1f30] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
              />
            </div>
            {selectedDate && (
              <p className="text-xs text-blue-400 flex items-center gap-1.5 pt-1">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{isBangla ? 'নির্ধারিত তারিখ:' : 'Scheduled for:'} <strong>{formatDisplayDate(selectedDate)}</strong></span>
              </p>
            )}
          </div>

          {/* Customer Note / Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
              {isBangla ? 'কাস্টমারের মন্তব্য / কারণ (অপশনাল)' : 'Customer Note / Reason (Optional)'}
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isBangla ? 'যেমন: কাস্টমার বাইরে আছেন, রবিবার বিকেলে এসে নেবেন' : 'e.g. Customer is out of town, will collect Sunday evening'}
              className="w-full bg-[#1b1f30] border border-gray-800 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 resize-none placeholder:text-gray-600"
            />
          </div>

          {/* Optional WhatsApp Toggle */}
          {Boolean(customer.phone) && (
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 cursor-pointer hover:bg-emerald-500/10 transition-colors">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 bg-[#121524] border-gray-700"
              />
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>
                  {isBangla
                    ? 'হোয়াটসঅ্যাপে কাস্টমারকে নতুন ডেলিভারি তারিখের মেসেজ পাঠান'
                    : 'Send confirmation message to customer on WhatsApp'}
                </span>
              </div>
            </label>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              {isBangla ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading || !selectedDate}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isBangla ? 'রিসিডিউল নিশ্চিত করুন' : 'Confirm Reschedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
