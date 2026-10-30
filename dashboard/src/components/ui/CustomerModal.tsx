'use client';

import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/currency';
import { Input } from '@/components/ui/input';

import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Customer, normalizePhone } from '@/lib/services/customer';
import { User, Phone, MapPin, Loader2, Tv, Wrench, Tag, FileText, Settings2, Camera, CheckCircle, X, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { ManageOptionsModal } from './ManageOptionsModal';
import dynamic from 'next/dynamic';
import { CustomSelect } from './CustomSelect';

const BarcodeScannerModal = dynamic(
  () => import('./BarcodeScannerModal').then((m) => m.BarcodeScannerModal),
  { ssr: false }
);

interface CustomerModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSave: (data: Omit<Customer, 'id' | 'createdAt' | 'points'>, instantDelivery?: boolean) => Promise<void>;
 initialData?: Customer | null;
 existingAddresses?: string[];
 existingCustomers?: Customer[];
}

export function CustomerModal({ isOpen, onClose, onSave, initialData, existingAddresses = [], existingCustomers = [] }: CustomerModalProps) {
 const { t, language } = useTranslation();
 const { deviceBrands: storeBrands, deviceTypes, deviceProblems: storeProblems, user } = useAppStore();
 
 const [instantDelivery, setInstantDelivery] = useState(false);
 const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
 const [isChinaSelected, setIsChinaSelected] = useState(false);
 const [chinaSubBrand, setChinaSubBrand] = useState('');
 const [formData, setFormData] = useState({
 name: '',
 phone: '+880',
 address: '',
 deviceBrand: '',
 deviceType: '',
 deviceProblem: '',
 deviceDetails: '',
 serialNumber: '',
 totalBill: 0,
 advance: 0,
 warrantyMonths: '',
 expectedDeliveryDate: '',
 receivedByName: '',
 receivedBy: ''
 });
 const [isScannerOpen, setIsScannerOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [manageCategory, setManageCategory] = useState<'deviceBrands' | 'deviceTypes' | 'deviceProblems' | null>(null);

 const currentType = formData.deviceType;
 const isChina = isChinaSelected || /^ch[a]?ina/i.test(formData.deviceBrand.trim());
 const baseBrand = isChina ? 'China' : formData.deviceBrand;
 const currentBrands = currentType ? (storeBrands[currentType] || []) : [];

 const findProblemKey = (targetBrand: string) => {
   if (!targetBrand) return '';
   if (storeProblems[targetBrand]) return targetBrand;
   if (/^ch[a]?ina/i.test(targetBrand)) {
     const matchedKey = Object.keys(storeProblems).find(k => /^ch[a]?ina$/i.test(k));
     if (matchedKey) return matchedKey;
   }
   return targetBrand;
 };
 const problemKey = findProblemKey(baseBrand);
 const currentProblems = problemKey ? (storeProblems[problemKey] || []) : [];

 // Automatically bill pending if totalBill is blank or 0
 const isBillPending = !formData.totalBill || Number(formData.totalBill) <= 0;

 const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

 const getBlankFormData = () => ({
   name: '',
   phone: '+880',
   address: '',
   deviceType: '',
   deviceProblem: '',
   deviceBrand: '',
   deviceDetails: '',
   serialNumber: '',
   totalBill: 0,
   advance: 0,
   warrantyMonths: '',
   expectedDeliveryDate: '',
   receivedByName: user?.name || user?.email || '',
   receivedBy: user?.email || ''
 });

 useEffect(() => {
 setMatchedCustomer(null);
 if (initialData) {
   setHasRestoredDraft(false);
   const brand = initialData.deviceBrand || '';
   const chinaMatch = brand.match(/^ch[a]?ina(?:\s*\((.*?)\)|\s+(.*))?$/i);
   if (chinaMatch) {
     setIsChinaSelected(true);
     setChinaSubBrand(chinaMatch[1] || chinaMatch[2] || '');
   } else {
     setIsChinaSelected(false);
     setChinaSubBrand('');
   }

 // eslint-disable-next-line react-hooks/set-state-in-effect
 setFormData({
 name: initialData.name,
 phone: initialData.phone,
 address: initialData.address,
 deviceBrand: initialData.deviceBrand || '',
 deviceType: initialData.deviceType || '',
 deviceProblem: initialData.deviceProblem || '',
 deviceDetails: initialData.deviceDetails || '',
 serialNumber: initialData.serialNumber || '',
 totalBill: initialData.isBillPending ? 0 : (initialData.totalBill || 0),
 advance: initialData.advance || 0,
 warrantyMonths: initialData.warrantyMonths ? String(initialData.warrantyMonths) : '',
 expectedDeliveryDate: initialData.expectedDeliveryDate || '',
 receivedByName: initialData.receivedByName || user?.name || user?.email || '',
 receivedBy: initialData.receivedBy || user?.email || ''
 });
 } else if (isOpen) {
   // Check for saved draft in localStorage
   let hasDraft = false;
   try {
     const saved = localStorage.getItem('vvsc_customer_add_draft');
     if (saved) {
       const parsed = JSON.parse(saved);
       if (parsed && parsed.formData) {
         setFormData(parsed.formData);
         setIsChinaSelected(Boolean(parsed.isChinaSelected));
         setChinaSubBrand(parsed.chinaSubBrand || '');
         setHasRestoredDraft(true);
         hasDraft = true;
       }
     }
   } catch (e) {
     console.warn('Failed to restore draft', e);
   }

   if (!hasDraft) {
     setHasRestoredDraft(false);
     setIsChinaSelected(false);
     setChinaSubBrand('');
     setFormData(getBlankFormData());
   }
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [initialData, isOpen, user]);

 // Auto-save draft in real-time when user types in Add mode
 useEffect(() => {
   if (initialData || !isOpen) return;

   const hasData = Boolean(
     formData.name?.trim() ||
     (formData.phone && formData.phone !== '+880') ||
     formData.address?.trim() ||
     formData.deviceBrand?.trim() ||
     formData.deviceType?.trim() ||
     formData.deviceProblem?.trim() ||
     formData.deviceDetails?.trim() ||
     formData.serialNumber?.trim() ||
     (formData.totalBill && Number(formData.totalBill) > 0) ||
     (formData.advance && Number(formData.advance) > 0) ||
     formData.warrantyMonths ||
     formData.expectedDeliveryDate ||
     isChinaSelected ||
     chinaSubBrand
   );

   if (hasData) {
     try {
       localStorage.setItem(
         'vvsc_customer_add_draft',
         JSON.stringify({
           formData,
           isChinaSelected,
           chinaSubBrand,
           updatedAt: Date.now()
         })
       );
     } catch (e) {
       console.warn('Failed to save draft', e);
     }
   }
 }, [formData, isChinaSelected, chinaSubBrand, initialData, isOpen]);

 const handleClearDraft = () => {
   try {
     localStorage.removeItem('vvsc_customer_add_draft');
   } catch {}
   setHasRestoredDraft(false);
   setIsChinaSelected(false);
   setChinaSubBrand('');
   setFormData(getBlankFormData());
   setMatchedCustomer(null);
   toast.success(language === 'bn' ? 'ড্রাফট মুছে নতুন ফর্ম তৈরি করা হয়েছে' : 'Draft cleared. New form created.');
 };

 const handlePhoneInput = (rawInput: string) => {
   let digits = rawInput.replace(/\D/g, '');
   if (digits.startsWith('880')) digits = digits.slice(3);
   else if (digits.startsWith('88')) digits = digits.slice(2);
   if (digits.startsWith('0')) digits = digits.slice(1);
   if (digits.length > 10) digits = digits.slice(0, 10);
   const fullPhone = digits ? '+880' + digits : '';

   if (!initialData && digits.length >= 10 && existingCustomers && existingCustomers.length > 0) {
     const match = existingCustomers.find(c => normalizePhone(c.phone) === normalizePhone(fullPhone));
     if (match) {
       setMatchedCustomer(match);
       setFormData(prev => ({
         ...prev,
         phone: fullPhone,
         name: prev.name ? prev.name : match.name,
         address: prev.address ? prev.address : (match.address || '')
       }));
       return;
     } else {
       setMatchedCustomer(null);
     }
   } else if (digits.length < 10) {
     setMatchedCustomer(null);
   }

   setFormData(prev => ({ ...prev, phone: fullPhone }));
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 const phoneDigits = (formData.phone || '').replace(/\D/g, '');
 let localDigits = phoneDigits.startsWith('880') ? phoneDigits.slice(3) : phoneDigits.startsWith('88') ? phoneDigits.slice(2) : phoneDigits;
 if (localDigits.startsWith('0')) localDigits = localDigits.slice(1);

 if (!/^1[3-9]\d{8}$/.test(localDigits)) {
   toast.error(language === 'bn' ? 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)' : 'Please enter a valid 11-digit mobile number (e.g. 017XXXXXXXX)');
   return;
 }

 setIsSubmitting(true);
 try {
 const isPending = !formData.totalBill || Number(formData.totalBill) <= 0;
 const numBill = isPending ? 0 : Number(formData.totalBill);
 const due = isPending ? 0 : Math.max(0, numBill - (formData.advance || 0));

 const finalDeviceBrand = isChinaSelected
   ? (chinaSubBrand.trim() ? `China (${chinaSubBrand.trim()})` : 'China')
   : formData.deviceBrand;

 await onSave({ 
   ...formData, 
   deviceBrand: finalDeviceBrand,
   totalBill: numBill, 
   due, 
   isBillPending: isPending,
   receivedByName: formData.receivedByName || user?.name || user?.email || 'Unknown',
   receivedBy: formData.receivedBy || user?.email || 'Unknown'
 }, instantDelivery);
 try {
   localStorage.removeItem('vvsc_customer_add_draft');
 } catch {}
 setHasRestoredDraft(false);
 onClose();
 } catch (error) {
 console.error(error);
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[92vh] sm:max-h-[88vh] bg-popover text-white border-gray-800 shadow-2xl shadow-blue-900/10 p-0 overflow-hidden rounded-2xl flex flex-col">
 {/* Gradient Header Background */}
 <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 z-10 shrink-0" />
 
 <div className="p-3 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
 <DialogHeader className="mb-4 sm:mb-6 text-left">
 <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
 {initialData 
   ? (language === 'bn' ? 'কাস্টমারের তথ্য সম্পাদনা' : 'Edit Customer Details') 
   : (language === 'bn' ? 'নতুন কাস্টমার যুক্ত করুন' : 'Add New Customer')}
 </DialogTitle>
 <DialogDescription className="text-gray-400 mt-1 text-xs sm:text-sm">
 {initialData 
   ? (language === 'bn' ? 'পরিবর্তন সংরক্ষণ করতে নিচের তথ্য আপডেট করুন।' : 'Update the details below to save changes.') 
   : (language === 'bn' ? 'সিস্টেমে যুক্ত করতে কাস্টমারের বিবরণ লিখুন।' : 'Enter the customer details to add them to your POS system.')}
 </DialogDescription>
 </DialogHeader>

 {hasRestoredDraft && !initialData && (
   <div className="mb-4 flex items-center justify-between p-2.5 sm:p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs sm:text-sm text-amber-400">
     <div className="flex items-center gap-2">
       <RotateCcw className="w-4 h-4 shrink-0 text-amber-400" />
       <span>{language === 'bn' ? 'পূর্বের অসম্পূর্ণ ড্রাফট তথ্য উদ্ধার করা হয়েছে।' : 'Incomplete draft information restored.'}</span>
     </div>
     <button
       type="button"
       onClick={handleClearDraft}
       className="underline hover:text-amber-300 font-semibold ml-2 whitespace-nowrap"
     >
       {language === 'bn' ? 'নতুন করে লিখুন' : 'Start Fresh'}
     </button>
   </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
 {/* 1. Customer Info */}
 <div className="bg-[#1a1d2d]/30 p-3.5 sm:p-5 rounded-xl border border-gray-800/60 space-y-3.5 sm:space-y-4">
 <h4 className="text-xs sm:text-sm font-semibold text-blue-400 flex items-center gap-2 mb-1">
 <User className="w-4 h-4" /> {language === 'bn' ? 'কাস্টমার তথ্য' : 'Customer Information'}
 </h4>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* Phone */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
   {language === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}
 </label>
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
 onChange={(e) => handlePhoneInput(e.target.value)}
 onPaste={(e) => {
   e.preventDefault();
   const pasted = e.clipboardData.getData('text');
   handlePhoneInput(pasted);
 }}
 className="pl-[76px]" 
 placeholder="1711000000"
 maxLength={25}
 />
 </div>
 {matchedCustomer && (
 <div className="flex items-start gap-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 mt-2">
 <CheckCircle className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
 <span className="leading-tight">
   {language === 'bn' 
     ? <>পূর্বের কাস্টমার পাওয়া গেছে: <strong>{matchedCustomer.name}</strong>। নতুন তথ্যগুলো এই কাস্টমারের হিস্ট্রিতে যুক্ত হবে।</>
     : <>Existing customer found: <strong>{matchedCustomer.name}</strong>. New job will be linked to this customer.</>}
 </span>
 </div>
 )}
 </div>

 {/* Name */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
   {language === 'bn' ? 'কাস্টমারের নাম' : 'Full Name'}
 </label>
 <div className="relative">
 <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
 <Input 
 required
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 className="pl-10" 
 placeholder={language === 'bn' ? 'যেমন: রহিম উদ্দিন' : 'e.g. Rahim Uddin'}
 />
 </div>
 </div>
 </div>

 {/* Address */}
 <div className="space-y-1.5 pt-1">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
   {language === 'bn' ? 'ঠিকানা' : 'Address'}
 </label>
 <div className="relative">
 <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
 <Input 
 list="address-suggestions"
 value={formData.address}
 onChange={(e) => setFormData({ ...formData, address: e.target.value })}
 className="pl-10" 
 placeholder={language === 'bn' ? 'যেমন: ধানমন্ডি, ঢাকা' : 'e.g. Dhaka, Bangladesh'}
 />
 <datalist id="address-suggestions">
 {existingAddresses.map((addr, idx) => (
 <option key={idx} value={addr} />
 ))}
 </datalist>
 </div>
 </div>
 </div>

 {/* 2. Device Info */}
 <div className="bg-[#1a1d2d]/30 p-3.5 sm:p-5 rounded-xl border border-gray-800/60 space-y-3.5 sm:space-y-4">
 <h4 className="text-xs sm:text-sm font-semibold text-orange-400 flex items-center gap-2 mb-1">
 <Tv className="w-4 h-4" /> {language === 'bn' ? 'ডিভাইস তথ্য' : 'Device Information'}
 </h4>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
 {/* Device Type */}
   <div className="space-y-1.5">
   <div className="flex items-center justify-between">
   <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
     {language === 'bn' ? 'ডিভাইসের ধরন' : 'Device Type'}
   </label>
   <Button variant="ghost" size="icon" type="button" onClick={() => setManageCategory('deviceTypes')} className="h-6 w-6 text-gray-500 hover:text-blue-400 p-0" title={language === 'bn' ? 'ধরন ম্যানেজ করুন' : 'Manage Types'}>
   <Settings2 className="w-3.5 h-3.5" />
   </Button>
   </div>
   <CustomSelect 
   value={formData.deviceType}
   onChange={(val) => setFormData({ ...formData, deviceType: val })}
   options={deviceTypes}
   placeholder={language === 'bn' ? 'ধরন নির্বাচন করুন' : 'Select Type'}
   icon={<Tv className="w-4 h-4" />}
   />
   </div>

   {/* Device Brand */}
   <div className="space-y-1.5">
     <div className="flex items-center justify-between">
     <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
       {language === 'bn' ? 'ডিভাইস ব্র্যান্ড' : 'Device Brand'}
     </label>
     <Button variant="ghost" size="icon" type="button" onClick={() => setManageCategory('deviceBrands')} className="h-6 w-6 text-gray-500 hover:text-blue-400 p-0" title={language === 'bn' ? 'ব্র্যান্ড ম্যানেজ করুন' : 'Manage Brands'}>
     <Settings2 className="w-3.5 h-3.5" />
     </Button>
     </div>
     {isChinaSelected ? (
        <div className="relative flex items-center">
          <div className="absolute left-2.5 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold pointer-events-none select-none">
            China
          </div>
          <Input 
            autoFocus
            value={chinaSubBrand}
            onChange={(e) => {
              const sub = e.target.value;
              setChinaSubBrand(sub);
              const finalBrand = sub.trim() ? `China (${sub.trim()})` : 'China';
              setFormData(prev => ({ ...prev, deviceBrand: finalBrand }));
            }}
            className="pl-20 pr-8 text-sm bg-secondary border-amber-500/40 focus-visible:ring-amber-500/50" 
            placeholder={language === 'bn' ? 'যেমন: Sunny, Vision...' : 'e.g. Sunny, Vision...'}
          />
          <button
            type="button"
            onClick={() => {
              setIsChinaSelected(false);
              setChinaSubBrand('');
              setFormData(prev => ({ ...prev, deviceBrand: '' }));
            }}
            className="absolute right-2 text-gray-400 hover:text-red-400 p-1 rounded transition-colors"
            title={language === 'bn' ? 'অন্য ব্র্যান্ড সিলেক্ট করতে ড্রপডাউনে ফিরুন' : 'Back to brand dropdown'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <CustomSelect 
        value={formData.deviceBrand}
        onChange={(val) => {
          if (/^ch[a]?ina$/i.test(val.trim())) {
            setIsChinaSelected(true);
            setChinaSubBrand('');
            setFormData(prev => ({ ...prev, deviceBrand: 'China' }));
          } else {
            setIsChinaSelected(false);
            setChinaSubBrand('');
            setFormData(prev => ({ ...prev, deviceBrand: val }));
          }
        }}
        options={currentBrands}
        placeholder={language === 'bn' ? 'ব্র্যান্ড নির্বাচন করুন' : 'Select Brand'}
        icon={<Tag className="w-4 h-4" />}
        />
      )}
      </div>
   </div>

   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
   {/* Device Problem */}
   <div className="space-y-1.5">
     <div className="flex items-center justify-between">
     <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
       {language === 'bn' ? 'প্রধান সমস্যা' : 'Primary Issue'}
     </label>
     <Button variant="ghost" size="icon" type="button" onClick={() => setManageCategory('deviceProblems')} className="h-6 w-6 text-gray-500 hover:text-blue-400 p-0" title={language === 'bn' ? 'সমস্যা ম্যানেজ করুন' : 'Manage Problems'}>
     <Settings2 className="w-3.5 h-3.5" />
     </Button>
     </div>
     <CustomSelect 
     value={formData.deviceProblem}
     onChange={(val) => setFormData({ ...formData, deviceProblem: val })}
     options={currentProblems}
     placeholder={language === 'bn' ? 'সমস্যা নির্বাচন করুন' : 'Select Problem'}
     icon={<Wrench className="w-4 h-4" />}
     />
     </div>

   {/* Device Details */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
   {language === 'bn' ? 'মডেল বা বিবরণ' : 'Device Details / Model'}
 </label>
 <div className="relative">
 <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
 <Input 
 value={formData.deviceDetails}
 onChange={(e) => setFormData({ ...formData, deviceDetails: e.target.value })}
 className="pl-10 text-sm" 
 placeholder={language === 'bn' ? 'যেমন: ৫৫ ইঞ্চি ব্রাভিয়া' : 'e.g. 55 inch Bravia'}
 />
 </div>
 </div>
 </div>

 {/* Serial Number */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
   {language === 'bn' ? 'সিরিয়াল নম্বর বা বারকোড' : 'Serial Number / Barcode'}
 </label>
 <div className="flex gap-2">
 <div className="relative flex-1">
 <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
 <Input 
 value={formData.serialNumber}
 onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
 className="pl-10 text-sm" 
 placeholder="e.g. SN-123456789"
 />
 </div>
 <Button 
 type="button" 
 onClick={() => setIsScannerOpen(true)}
 className="h-10 w-10 sm:w-auto sm:px-4 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-500/20 rounded-lg flex items-center justify-center transition-colors shrink-0 p-0 sm:py-2"
 title={language === 'bn' ? 'ক্যামেরা দিয়ে বারকোড স্ক্যান করুন' : 'Scan Barcode using Camera'}
 >
 <Camera className="w-4 h-4" />
 <span className="hidden sm:inline-block ml-1.5 text-xs font-medium">
   {language === 'bn' ? 'স্ক্যান' : 'Scan'}
 </span>
 </Button>
 </div>
 </div>
 </div>

 {/* 3. Billing & Warranty */}
 <div className="bg-[#1a1d2d]/30 p-3.5 sm:p-5 rounded-xl border border-gray-800/60 space-y-3.5 sm:space-y-4">
 <h4 className="text-xs sm:text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-1">
 <FileText className="w-4 h-4" /> {language === 'bn' ? 'বিলিং ও ওয়ারেন্টি' : 'Billing & Warranty'}
 </h4>
 
 {/* Row 1: Financials & Warranty (3 columns on PC) */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
 {/* Total Bill */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
   {language === 'bn' ? 'মোট বিল' : 'Total Bill'}
 </label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-blue-500 font-bold">৳</span>
 <Input 
 type="text"
 inputMode="numeric"
 value={formData.totalBill || ''}
 onChange={(e) => {
 const val = e.target.value.replace(/\D/g, '');
 setFormData({ ...formData, totalBill: val ? Number(val) : 0 });
 }}
 className="pl-10 text-sm border-blue-500/30 focus-visible:ring-blue-500/50" 
 placeholder="0"
 />
 </div>
 <p className="text-[11px] text-gray-500">
   {language === 'bn' ? 'ফাঁকা রাখলে বিল পেন্ডিং হবে' : 'Leave empty for bill pending'}
 </p>
 </div>

 {/* Advance */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
   {language === 'bn' ? 'অগ্রিম গ্রহণ' : 'Advance'}
 </label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-green-500 font-bold">৳</span>
 <Input 
 type="text"
 inputMode="numeric"
 value={formData.advance || ''}
 onChange={(e) => setFormData({ ...formData, advance: Number(e.target.value.replace(/\D/g, '')) })}
 className="pl-10 text-sm border-green-500/30 focus-visible:ring-green-500/50" 
 placeholder="0"
 />
 </div>
 <p className="text-[11px] text-gray-500">
   {language === 'bn' ? 'অগ্রিম জমা থাকলে লিখুন' : 'Enter if advance was received'}
 </p>
 </div>
 
 {/* Warranty */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
   {language === 'bn' ? 'ওয়ারেন্টি' : 'Warranty'}
 </label>
 <CustomSelect 
 value={formData.warrantyMonths ? String(formData.warrantyMonths) : (language === 'bn' ? 'ওয়ারেন্টি নেই' : 'No Warranty')}
 onChange={(val) => {
 setFormData({ ...formData, warrantyMonths: (val === 'No Warranty' || val === 'ওয়ারেন্টি নেই') ? '' : val });
 }}
 options={language === 'bn' 
   ? ['ওয়ারেন্টি নেই', '৭ দিন', '১৫ দিন', '১ মাস', '৩ মাস', '৬ মাস', '১২ মাস', '২৪ মাস'] 
   : ['No Warranty', '7 Days', '15 Days', '1 Month', '3 Months', '6 Months', '12 Months', '24 Months']}
 placeholder={language === 'bn' ? 'ওয়ারেন্টি নির্বাচন করুন' : 'Select warranty'}
 />
 <p className="text-[11px] text-gray-500">
   {language === 'bn' ? 'সার্ভিসিং ওয়ারেন্টি সময়' : 'Service warranty period'}
 </p>
 </div>
 </div>

 {/* Row 2: Delivery & Due Calculation (2 balanced columns) */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 pt-1 items-end">
 {/* Expected Delivery */}
 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
   {language === 'bn' ? 'সম্ভাব্য ডেলিভারি' : 'Expected Delivery'}
 </label>
 <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors select-none">
 <input 
 type="checkbox" 
 checked={instantDelivery} 
 onChange={(e) => setInstantDelivery(e.target.checked)}
 className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500"
 />
 <span>{language === 'bn' ? 'তাৎক্ষণিক ডেলিভারি (Instant)' : 'Instant Delivery'}</span>
 </label>
 </div>

 {instantDelivery ? (
 <div className="h-10 px-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center text-xs text-blue-400 font-medium">
   {language === 'bn' ? '⚡ তাৎক্ষণিক সার্ভিস (আজকেই ডেলিভারি হবে)' : '⚡ Instant Service (Delivery today)'}
 </div>
 ) : (
 <Input 
 type="date"
 value={formData.expectedDeliveryDate}
 onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
 className="bg-secondary text-gray-200 text-sm h-10"
 />
 )}
 </div>

 {/* Due / Bill Status Box */}
 <div className={`h-10 px-4 rounded-lg flex items-center justify-between border transition-all font-medium text-sm ${
 isBillPending 
 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
 : ((formData.totalBill || 0) - (formData.advance || 0) <= 0)
 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
 : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
 }`}>
 <span className="text-xs uppercase tracking-wider text-gray-400">
 {isBillPending 
   ? (language === 'bn' ? 'বিল স্ট্যাটাস:' : 'Bill Status:') 
   : (language === 'bn' ? 'বাকি (Due):' : 'Due:')}
 </span>
 <span className="text-base font-bold">
 {isBillPending 
 ? ((formData.advance || 0) > 0 
     ? `${language === 'bn' ? 'অগ্রিম' : 'Adv'}: ৳${formData.advance} (${language === 'bn' ? 'বিল পেন্ডিং' : 'Bill Pending'})` 
     : (language === 'bn' ? '⏳ বিল পেন্ডিং' : '⏳ Bill Pending')) 
 : formatCurrency(Math.max(0, (formData.totalBill || 0) - (formData.advance || 0)))}
 </span>
 </div>
 </div>
 </div>

 {/* Footer Buttons */}
 <div className="pt-4 mt-2 flex flex-row items-center justify-end gap-2.5 sm:gap-3 border-t border-gray-800/50">
 <Button 
 type="button" 
 onClick={onClose}
 className="flex-1 sm:flex-none h-10 px-4 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 border border-gray-800 sm:border-transparent transition-all flex items-center justify-center"
 >
 {t('common.cancel')}
 </Button>
 <Button 
 type="submit" 
 disabled={isSubmitting} 
 className="flex-1 sm:flex-none h-10 px-6 sm:px-8 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center justify-center"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
 {t('common.saving')}
 </>
 ) : (
   initialData ? t('customerModal.updateCustomer') : t('customerModal.saveCustomer')
 )}
 </Button>
 </div>
 </form>
 </div>
 </DialogContent>

 <ManageOptionsModal 
 isOpen={manageCategory !== null}
 onClose={() => setManageCategory(null)}
 category={manageCategory || 'deviceBrands'}
 
 title={manageCategory === 'deviceBrands' ? 'Device Brands' : manageCategory === 'deviceTypes' ? 'Device Types' : 'Device Problems'}
 parentKey={manageCategory === 'deviceProblems' ? (problemKey || baseBrand) : formData.deviceType}
 />

 <BarcodeScannerModal 
 isOpen={isScannerOpen} 
 onClose={() => setIsScannerOpen(false)} 
 onScan={(text) => setFormData({ ...formData, serialNumber: text })}
 />
 </Dialog>
 );
}











