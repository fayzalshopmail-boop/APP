'use client';

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
import { User, Phone, MapPin, Loader2, Tv, Wrench, Tag, FileText, Settings2, Camera, CheckCircle, UserCheck } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
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
 const { deviceBrands: storeBrands, deviceTypes, deviceProblems: storeProblems, user } = useAppStore();
 
 const [instantDelivery, setInstantDelivery] = useState(false);
 const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
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
 const currentBrand = formData.deviceBrand;
 const currentBrands = currentType ? (storeBrands[currentType] || []) : [];
 const currentProblems = currentBrand ? (storeProblems[currentBrand] || []) : [];

 // Automatically bill pending if totalBill is blank or 0
 const isBillPending = !formData.totalBill || Number(formData.totalBill) <= 0;

 useEffect(() => {
 setMatchedCustomer(null);
 if (initialData) {
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
 } else {
 // eslint-disable-next-line react-hooks/set-state-in-effect
 setFormData({ 
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
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [initialData, isOpen, user]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSubmitting(true);
 try {
 const isPending = !formData.totalBill || Number(formData.totalBill) <= 0;
 const numBill = isPending ? 0 : Number(formData.totalBill);
 const due = isPending ? 0 : Math.max(0, numBill - (formData.advance || 0));
 await onSave({ 
   ...formData, 
   totalBill: numBill, 
   due, 
   isBillPending: isPending,
   receivedByName: formData.receivedByName || user?.name || user?.email || 'Unknown',
   receivedBy: formData.receivedBy || user?.email || 'Unknown'
 }, instantDelivery);
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
 {initialData ? 'Edit Customer Details' : 'Add New Customer'}
 </DialogTitle>
 <DialogDescription className="text-gray-400 mt-1 text-xs sm:text-sm">
 {initialData ? 'Update the details below to save changes.' : 'Enter the customer details to add them to your POS system.'}
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
 {/* 1. Customer Info */}
 <div className="bg-[#1a1d2d]/30 p-3.5 sm:p-5 rounded-xl border border-gray-800/60 space-y-3.5 sm:space-y-4">
 <h4 className="text-xs sm:text-sm font-semibold text-blue-400 flex items-center gap-2 mb-1">
 <User className="w-4 h-4" /> Customer Information
 </h4>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* Phone */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Phone Number</label>
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
 const fullPhone = '+880' + digits;

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

 setFormData({ ...formData, phone: fullPhone });
 }}
 className="pl-[76px]" 
 placeholder="1711000000"
 maxLength={11}
 />
 </div>
 {matchedCustomer && (
 <div className="flex items-start gap-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 mt-2">
 <CheckCircle className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
 <span className="leading-tight">পূর্বের কাস্টমার পাওয়া গেছে: <strong>{matchedCustomer.name}</strong>। নতুন তথ্যগুলো এই কাস্টমারের হিস্ট্রিতে যুক্ত হবে।</span>
 </div>
 )}
 </div>

 {/* Name */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Full Name</label>
 <div className="relative">
 <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
 <Input 
 required
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 className="pl-10" 
 placeholder="e.g. Rahim Uddin"
 />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* Address */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Address</label>
 <div className="relative">
 <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
 <Input 
 list="address-suggestions"
 value={formData.address}
 onChange={(e) => setFormData({ ...formData, address: e.target.value })}
 className="pl-10" 
 placeholder="e.g. Dhaka, Bangladesh"
 />
 <datalist id="address-suggestions">
 {existingAddresses.map((addr, idx) => (
 <option key={idx} value={addr} />
 ))}
 </datalist>
 </div>
 </div>

 {/* Received By */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">রিসিভ করেছেন (Received By)</label>
 <div className="relative">
 <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
 <Input 
 value={formData.receivedByName}
 onChange={(e) => setFormData({ ...formData, receivedByName: e.target.value })}
 className="pl-10" 
 placeholder="যিনি কাজ গ্রহণ করেছেন..."
 />
 </div>
 </div>
 </div>
 </div>

 {/* 2. Device Info */}
 <div className="bg-[#1a1d2d]/30 p-3.5 sm:p-5 rounded-xl border border-gray-800/60 space-y-3.5 sm:space-y-4">
 <h4 className="text-xs sm:text-sm font-semibold text-orange-400 flex items-center gap-2 mb-1">
 <Tv className="w-4 h-4" /> Device Information
 </h4>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
 {/* Device Type */}
   <div className="space-y-1.5">
   <div className="flex items-center justify-between">
   <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Device Type</label>
   <Button variant="ghost" size="icon" type="button" onClick={() => setManageCategory('deviceTypes')} className="h-6 w-6 text-gray-500 hover:text-blue-400 p-0" title="Manage Types">
   <Settings2 className="w-3.5 h-3.5" />
   </Button>
   </div>
   <CustomSelect 
   value={formData.deviceType}
   onChange={(val) => setFormData({ ...formData, deviceType: val })}
   options={deviceTypes}
   placeholder="Select Type"
   icon={<Tv className="w-4 h-4" />}
   />
   </div>

   {/* Device Brand */}
   <div className="space-y-1.5">
     <div className="flex items-center justify-between">
     <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Device Brand</label>
     <Button variant="ghost" size="icon" type="button" onClick={() => setManageCategory('deviceBrands')} className="h-6 w-6 text-gray-500 hover:text-blue-400 p-0" title="Manage Brands">
     <Settings2 className="w-3.5 h-3.5" />
     </Button>
     </div>
     <CustomSelect 
     value={formData.deviceBrand}
     onChange={(val) => setFormData({ ...formData, deviceBrand: val })}
     options={currentBrands}
     placeholder="Select Brand"
     icon={<Tag className="w-4 h-4" />}
     />
     </div>
   </div>

   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
   {/* Device Problem */}
   <div className="space-y-1.5">
     <div className="flex items-center justify-between">
     <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Primary Issue</label>
     <Button variant="ghost" size="icon" type="button" onClick={() => setManageCategory('deviceProblems')} className="h-6 w-6 text-gray-500 hover:text-blue-400 p-0" title="Manage Problems">
     <Settings2 className="w-3.5 h-3.5" />
     </Button>
     </div>
     <CustomSelect 
     value={formData.deviceProblem}
     onChange={(val) => setFormData({ ...formData, deviceProblem: val })}
     options={currentProblems}
     placeholder="Select Problem"
     icon={<Wrench className="w-4 h-4" />}
     />
     </div>

   {/* Device Details */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Device Details / Model</label>
 <div className="relative">
 <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
 <Input 
 value={formData.deviceDetails}
 onChange={(e) => setFormData({ ...formData, deviceDetails: e.target.value })}
 className="pl-10 text-sm" 
 placeholder="e.g. 55 inch Bravia"
 />
 </div>
 </div>
 </div>

 {/* Serial Number */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Serial Number / Barcode</label>
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
 title="Scan Barcode using Camera"
 >
 <Camera className="w-4 h-4" />
 <span className="hidden sm:inline-block ml-1.5 text-xs font-medium">Scan</span>
 </Button>
 </div>
 </div>
 </div>

 {/* 3. Billing & Warranty */}
 <div className="bg-[#1a1d2d]/30 p-3.5 sm:p-5 rounded-xl border border-gray-800/60 space-y-3.5 sm:space-y-4">
 <h4 className="text-xs sm:text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-1">
 <FileText className="w-4 h-4" /> Billing & Warranty
 </h4>
 
 {/* Row 1: Financials & Warranty (3 columns on PC) */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
 {/* Total Bill */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Bill</label>
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
 <p className="text-[11px] text-gray-500">ফাঁকা রাখলে বিল পেন্ডিং হবে</p>
 </div>

 {/* Advance */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Advance</label>
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
 <p className="text-[11px] text-gray-500">অগ্রিম জমা থাকলে লিখুন</p>
 </div>
 
 {/* Warranty */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Warranty</label>
 <CustomSelect 
 value={formData.warrantyMonths ? String(formData.warrantyMonths) : 'No Warranty'}
 onChange={(val) => {
 setFormData({ ...formData, warrantyMonths: val === 'No Warranty' ? '' : val });
 }}
 options={['No Warranty', '7 Days', '15 Days', '1 Month', '3 Months', '6 Months', '12 Months', '24 Months']}
 placeholder="Select warranty"
 />
 <p className="text-[11px] text-gray-500">সার্ভিসিং ওয়ারেন্টি সময়</p>
 </div>
 </div>

 {/* Row 2: Delivery & Due Calculation (2 balanced columns) */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 pt-1 items-end">
 {/* Expected Delivery */}
 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Expected Delivery</label>
 <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors select-none">
 <input 
 type="checkbox" 
 checked={instantDelivery} 
 onChange={(e) => setInstantDelivery(e.target.checked)}
 className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500"
 />
 <span>Instant Delivery (তাৎক্ষণিক)</span>
 </label>
 </div>

 {instantDelivery ? (
 <div className="h-10 px-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center text-xs text-blue-400 font-medium">
 ⚡ তাৎক্ষণিক সার্ভিস (আজকেই ডেলিভারি হবে)
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
 {isBillPending ? 'বিল স্ট্যাটাস:' : 'বাকি (Due):'}
 </span>
 <span className="text-base font-bold">
 {isBillPending 
 ? ((formData.advance || 0) > 0 ? `Adv: ৳${formData.advance} (বিল পেন্ডিং)` : '⏳ বিল পেন্ডিং') 
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
 Cancel
 </Button>
 <Button 
 type="submit" 
 disabled={isSubmitting} 
 className="flex-1 sm:flex-none h-10 px-6 sm:px-8 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center justify-center"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
 Saving...
 </>
 ) : (
 'Save Customer'
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
 parentKey={manageCategory === 'deviceProblems' ? formData.deviceBrand : formData.deviceType}
 />

 <BarcodeScannerModal 
 isOpen={isScannerOpen} 
 onClose={() => setIsScannerOpen(false)} 
 onScan={(text) => setFormData({ ...formData, serialNumber: text })}
 />
 </Dialog>
 );
}











