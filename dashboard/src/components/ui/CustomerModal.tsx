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
import { Customer } from '@/lib/services/customer';
import { User, Phone, MapPin, Loader2, Tv, Wrench, Tag, FileText, Settings2, Camera } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ManageOptionsModal } from './ManageOptionsModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { CustomSelect } from './CustomSelect';

interface CustomerModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSave: (data: Omit<Customer, 'id' | 'createdAt' | 'points'>, instantDelivery?: boolean) => Promise<void>;
 initialData?: Customer | null;
 existingAddresses?: string[];
}

export function CustomerModal({ isOpen, onClose, onSave, initialData, existingAddresses = [] }: CustomerModalProps) {
 const { deviceBrands: storeBrands, deviceTypes, deviceProblems: storeProblems } = useAppStore();
 
 const [instantDelivery, setInstantDelivery] = useState(false);
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
 warrantyMonths: '', expectedDeliveryDate: '' });
 const [isScannerOpen, setIsScannerOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [manageCategory, setManageCategory] = useState<'deviceBrands' | 'deviceTypes' | 'deviceProblems' | null>(null);

 const currentType = formData.deviceType;
 const currentBrand = formData.deviceBrand;
 const currentBrands = currentType ? (storeBrands[currentType] || []) : [];
 const currentProblems = currentBrand ? (storeProblems[currentBrand] || []) : [];

 useEffect(() => {
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
 totalBill: initialData.totalBill,
 advance: initialData.advance || 0,
 warrantyMonths: initialData.warrantyMonths ? String(initialData.warrantyMonths) : '', expectedDeliveryDate: initialData.expectedDeliveryDate || '' });
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
 warrantyMonths: '', expectedDeliveryDate: '' });
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [initialData, isOpen]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSubmitting(true);
 try {
 const due = formData.totalBill - formData.advance;
 await onSave({ ...formData, due }, instantDelivery);
 onClose();
 } catch (error) {
 console.error(error);
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="sm:max-w-3xl w-[95vw] bg-popover text-white border-gray-800 shadow-2xl shadow-blue-900/10 p-0 overflow-hidden rounded-xl">
 {/* Gradient Header Background */}
 <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
 
 <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar max-h-[85vh]">
 <DialogHeader className="mb-6">
 <DialogTitle className="text-xl font-bold tracking-tight">
 {initialData ? 'Edit Customer Details' : 'Add New Customer'}
 </DialogTitle>
 <DialogDescription className="text-gray-400 mt-1.5">
 {initialData ? 'Update the details below to save changes.' : 'Enter the customer details to add them to your POS system.'}
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleSubmit} className="space-y-5">
 {/* 1. Customer Info */}
 <div className="bg-[#1a1d2d]/30 p-4 sm:p-5 rounded-xl border border-gray-800/60 space-y-4">
 <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2 mb-1">
 <User className="w-4 h-4" /> Customer Information
 </h4>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
 setFormData({ ...formData, phone: '+880' + digits });
 }}
 className="pl-[76px]" 
 placeholder="1711000000"
 maxLength={11}
 />
 </div>
 </div>
 </div>

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
 </div>

 {/* 2. Device Info */}
 <div className="bg-[#1a1d2d]/30 p-4 sm:p-5 rounded-xl border border-gray-800/60 space-y-4">
 <h4 className="text-sm font-semibold text-orange-400 flex items-center gap-2 mb-1">
 <Tv className="w-4 h-4" /> Device Information
 </h4>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* Device Type */}
   <div className="space-y-1.5">
   <div className="flex items-center justify-between">
   <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Device Type</label>
   <Button variant="ghost" size="icon" type="button" onClick={() => setManageCategory('deviceTypes')} className="h-6 w-6 text-gray-500 hover:text-blue-400">
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
     <Button variant="ghost" size="icon" type="button" onClick={() => setManageCategory('deviceBrands')} className="h-6 w-6 text-gray-500 hover:text-blue-400">
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

   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
   {/* Device Problem */}
   <div className="space-y-1.5">
     <div className="flex items-center justify-between">
     <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Primary Issue</label>
     <Button variant="ghost" size="icon" type="button" onClick={() => setManageCategory('deviceProblems')} className="h-6 w-6 text-gray-500 hover:text-blue-400">
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
 className="pl-10" 
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
 className="pl-10" 
 placeholder="e.g. SN-123456789"
 />
 </div>
 <Button 
 type="button"
 onClick={() => setIsScannerOpen(true)}
 className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-500/20 px-4 rounded-lg flex items-center justify-center transition-colors"
 title="Scan Barcode using Camera"
 >
 <Camera className="w-5 h-5" />
 </Button>
 </div>
 </div>
 </div>

 {/* 3. Billing & Warranty */}
 <div className="bg-[#1a1d2d]/30 p-4 sm:p-5 rounded-xl border border-gray-800/60 space-y-4">
 <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-1">
 <FileText className="w-4 h-4" /> Billing & Warranty
 </h4>
 
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {/* Total Bill Input */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Bill</label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-blue-500 font-bold"></span>
 <Input 
 type="text"
 inputMode="numeric"
 required
 value={formData.totalBill || ''}
 onChange={(e) => setFormData({ ...formData, totalBill: Number(e.target.value.replace(/\D/g, '')) })}
 className="pl-10 border-blue-500/30 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50" 
 placeholder="5000"
 />
 </div>
 </div>

 {/* Advance Input */}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Advance</label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-green-500 font-bold"></span>
 <Input 
 type="text"
 inputMode="numeric"
 value={formData.advance || ''}
 onChange={(e) => setFormData({ ...formData, advance: Number(e.target.value.replace(/\D/g, '')) })}
 className="pl-10 border-green-500/30 focus-visible:ring-green-500/50 focus-visible:border-green-500/50" 
 placeholder="1000"
 />
 </div>
 </div>
 
 {/* Warranty Input */}
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
 </div>
 </div>

 {/* Expected Delivery Date */}
   {!instantDelivery && (
   <div className="space-y-1.5 pt-2 pb-2">
   <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Expected Delivery Date</label>
   <Input 
   type="date"
   value={formData.expectedDeliveryDate}
   onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
   className="bg-secondary text-gray-200"
   />
   </div>
   )}

   {/* Status Row */}
 <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-2">
 <label className="flex items-center gap-2 cursor-pointer bg-blue-500/10 hover:bg-blue-500/20 px-3 py-2 rounded-lg border border-blue-500/20 transition-colors w-full sm:w-auto">
 <input type="checkbox" 
 checked={instantDelivery} 
 onChange={(e) => setInstantDelivery(e.target.checked)}
 className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
 />
 <span className="text-sm font-medium text-blue-400">
 Instant Delivery (Quick Service)
 </span>
 </label>
 
 <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-4 py-2 flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
 <span className="text-sm font-medium text-orange-400">Calculated Due:</span>
 <span className="text-lg font-bold text-orange-400">{Math.max(0, (formData.totalBill || 0) - (formData.advance || 0))}</span>
 </div>
 </div>
 </div>

 {/* Footer Buttons */}
 <div className="pt-4 mt-2 flex items-center justify-end gap-3 border-t border-gray-800/50">
 <Button 
 type="button" 
 onClick={onClose}
 className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all"
 >
 Cancel
 </Button>
 <Button type="submit" disabled={isSubmitting} className="px-8 shadow-blue-500/20"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" />
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











