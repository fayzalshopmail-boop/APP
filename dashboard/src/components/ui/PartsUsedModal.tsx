'use client';
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
import { inventoryService, inventorySettingsService, InventoryItem } from '@/lib/services/inventory';
import { PartUsed, Customer } from '@/lib/services/customer';
import { 
 Search, 
 Plus, 
 Trash2, 
 CheckCircle2, 
 Coins, 
 Calendar, 
 Tag as TagIcon, 
 Wrench, 
 Package, 
 AlertCircle,
 Receipt,
 Check,
 X,
 Loader2,
 Star
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import toast from 'react-hot-toast';

export interface PartsConfirmData {
 parts: PartUsed[];
 discount: number;
 paymentReceived: number;
 dueDate: string;
 newTotalBill: number;
 redeemPoints: boolean;
}

interface PartsUsedModalProps {
 isOpen: boolean;
 onClose: () => void;
 onConfirm: (data: PartsConfirmData) => void;
 customer: Customer | null;
 pendingStatus?: string;
}

export function PartsUsedModal({ isOpen, onClose, onConfirm, customer, pendingStatus }: PartsUsedModalProps) {
 const [inventory, setInventory] = useState<InventoryItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [selectedParts, setSelectedParts] = useState<PartUsed[]>([]);
 
 // Payment States
 const [editableTotalBill, setEditableTotalBill] = useState<number>(0);
 const [paymentReceived, setPaymentReceived] = useState<number>(0);
 const [hasDiscount, setHasDiscount] = useState<boolean>(false);
 const [redeemPoints, setRedeemPoints] = useState<boolean>(false);
 const [loyaltyConfig, setLoyaltyConfig] = useState<any>(null);
 const [dueDate, setDueDate] = useState<string>('');
 const [categories, setCategories] = useState<string[]>(['Motherboard', 'Panel', 'Backlight', 'Power Supply', 'Accessories']);
 const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
 const [isSavingQuickPart, setIsSavingQuickPart] = useState(false);
 const [quickPartForm, setQuickPartForm] = useState({
 name: '',
 category: 'General',
 purchasePrice: 0,
 sellingPrice: 0,
 stock: 1
 });

 useEffect(() => {
   import('@/lib/services/loyaltyConfig').then(({ loyaltyConfigService }) => {
     loyaltyConfigService.getSettings().then(setLoyaltyConfig).catch(console.error);
   });
 }, []);

 const loadInventory = async () => {
 setLoading(true);
 try {
 const data = await inventoryService.getAll();
 setInventory(data.filter(item => item.stock > 0));
 } catch (err) {
 console.error('Failed to load inventory', err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 if (isOpen) {
 setEditableTotalBill(customer?.totalBill || 0);
 loadInventory();
 setSelectedParts(customer?.partsUsed || []);
 setSearch('');
 setPaymentReceived(0);
 setHasDiscount(false);
 setDueDate('');
 setIsQuickAddOpen(false);
 setQuickPartForm({ name: '', category: 'General', purchasePrice: 0, sellingPrice: 0, stock: 1 });
 }
 }, [isOpen]);

 const handleSaveQuickPart = async () => {
 if (!quickPartForm.name.trim()) {
 toast.error("পার্টসের নাম আবশ্যক");
 return;
 }
 if (!quickPartForm.sellingPrice || quickPartForm.sellingPrice <= 0) {
 toast.error("সঠিক বিক্রয়মূল্য (৳) ইনপুট দিন");
 return;
 }
 if (quickPartForm.purchasePrice > 0 && quickPartForm.sellingPrice < quickPartForm.purchasePrice) {
 toast.error("বিক্রয়মূল্য অবশ্যই ক্রয়মূল্যের (কেনা দাম) চেয়ে বেশি বা সমান হতে হবে!");
 return;
 }

 try {
 setIsSavingQuickPart(true);
 const stockQty = Math.max(1, quickPartForm.stock || 1);
 const purchasePrice = Number(quickPartForm.purchasePrice) || 0;
 const sellingPrice = Number(quickPartForm.sellingPrice) || 0;
 const category = quickPartForm.category || 'General';

 const newItemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'> = {
 name: quickPartForm.name.trim(),
 category,
 stock: stockQty,
 unit: 'Pcs',
 purchasePrice,
 sellingPrice,
 minStockLevel: 2
 };

 const newId = await inventoryService.add(newItemData);
 const newItem: InventoryItem = {
 id: newId,
 ...newItemData
 };

 // Add to local inventory state
 setInventory(prev => [newItem, ...prev]);

 // Automatically attach to selectedParts
 handleAddPart(newItem);

 toast.success(`"${newItem.name}" ইনভেন্টরিতে যুক্ত হয়েছে এবং সার্ভিসে সিলেক্ট করা হয়েছে!`);
 
 // Reset form and close
 setQuickPartForm({ name: '', category: 'General', purchasePrice: 0, sellingPrice: 0, stock: 1 });
 setIsQuickAddOpen(false);
 setSearch('');
 } catch (error) {
 console.error("Error quick adding inventory item:", error);
 toast.error("ইনভেন্টরিতে যুক্ত করতে সমস্যা হয়েছে");
 } finally {
 setIsSavingQuickPart(false);
 }
 };

 const handleAddPart = (item: InventoryItem) => {
 const existing = selectedParts.find(p => p.inventoryId === item.id);
 if (existing) {
 if (existing.quantity >= item.stock) return;
 setSelectedParts(selectedParts.map(p => 
 p.inventoryId === item.id ? { ...p, quantity: p.quantity + 1 } : p
 ));
 } else {
 setSelectedParts([...selectedParts, {
 inventoryId: item.id!,
 name: item.name,
 cost: item.purchasePrice || 0,
 price: item.sellingPrice || 0,
 quantity: 1
 }]);
 }
 };

 const handleRemovePart = (inventoryId: string) => {
 setSelectedParts(selectedParts.filter(p => p.inventoryId !== inventoryId));
 };

 const updateQuantity = (inventoryId: string, delta: number) => {
 const part = selectedParts.find(p => p.inventoryId === inventoryId);
 if (!part) return;
 
 const item = inventory.find(i => i.id === inventoryId);
 if (!item) return;

 const newQty = part.quantity + delta;
 if (newQty <= 0) {
 handleRemovePart(inventoryId);
 return;
 }
 if (newQty > item.stock) return;

 setSelectedParts(selectedParts.map(p => 
 p.inventoryId === inventoryId ? { ...p, quantity: newQty } : p
 ));
 };

 const filteredInventory = inventory.filter(item => 
 item.name.toLowerCase().includes(search.toLowerCase()) || 
 (item.category && item.category.toLowerCase().includes(search.toLowerCase()))
 );

 if (!customer) return null;

 const minPointsRequired = Number(loyaltyConfig?.minPointsToRedeem) || 0;
 const customerPoints = customer?.points || 0;
 const canRedeemPoints = Boolean(loyaltyConfig?.enabled && customerPoints > 0 && customerPoints >= minPointsRequired);
 const pointsValueTk = canRedeemPoints ? Math.floor(customerPoints * (loyaltyConfig?.pointValueInTk || 1)) : 0;
 const pointsDiscount = (redeemPoints && canRedeemPoints) ? pointsValueTk : 0;
 
 const currentDue = Math.max(0, editableTotalBill - (customer.advance || 0) - pointsDiscount);
 
 // Unpaid balance after applying the "Payment Received Now"
 const unpaidAfterPayment = Math.max(0, currentDue - paymentReceived);
 
 // Is this payment already full without discount?
 const isFullPayment = currentDue > 0 && paymentReceived >= currentDue;
 
 // Effective discount only counts if checkbox is checked. It automatically waives the remaining amount.
 const effectiveDiscount = hasDiscount ? unpaidAfterPayment : 0;
 
 // Final remaining due after payment and discount
 const finalDue = Math.max(0, currentDue - paymentReceived - effectiveDiscount);
 
 // Overpayment check
 const isOverpaid = paymentReceived > currentDue || (effectiveDiscount > unpaidAfterPayment);

 // Quick Action: Pay Full
 const handlePayFull = () => {
 setPaymentReceived(currentDue);
 setHasDiscount(false);
 setDueDate('');
 };

 const handleSubmit = () => {
 if (isOverpaid) return;
 if (paymentReceived < 0) return toast.error("পেমেন্ট নেতিবাচক হতে পারবে না");
 if (pendingStatus === "Delivered" && finalDue > 0 && !dueDate) {
 toast.error("বকেয়া টাকার জন্য অনুগ্রহ করে তাগাদার তারিখ নির্বাচন করুন।");
 return;
 }
 
 onConfirm({
 parts: selectedParts,
 discount: effectiveDiscount + pointsDiscount,
 paymentReceived,
 dueDate: (pendingStatus === "Delivered" && finalDue > 0) ? dueDate : '',
 newTotalBill: editableTotalBill,
 redeemPoints
 });
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="sm:max-w-4xl w-[95vw] bg-popover text-white border-gray-800 shadow-2xl shadow-blue-950/20 p-0 overflow-hidden rounded-2xl z-50">
 {/* Top Gradient Highlight Bar */}
 <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500" />
 
 <div className="p-3.5 sm:p-7 max-h-[88vh] overflow-y-auto custom-scrollbar">
 {/* Header */}
 <DialogHeader className="mb-6">
 <div className="flex items-center justify-between">
 <div>
 <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
 <Receipt className="w-6 h-6 text-indigo-400" />
 Delivery & Checkout
 </DialogTitle>
 <DialogDescription className="text-gray-400 mt-1 text-sm">
 Customer: <span className="text-gray-100 font-semibold">{customer.name}</span> ({customer.phone})
 </DialogDescription>
 </div>
 </div>
 </DialogHeader>

 {/* 2-Column Responsive Layout */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 {/* Left Column: Inventory & Parts Used (7 cols) */}
 <div className={`flex flex-col gap-4 ${pendingStatus === "Delivered" ? "lg:col-span-7" : "lg:col-span-12"}`}>
 <div className="bg-secondary/60 border border-gray-800/80 rounded-xl p-4 sm:p-5 flex flex-col h-full">
 <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
 <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
 <Wrench className="w-4 h-4" /> Parts Replacement
 </h4>
 <Button
 type="button"
 size="sm"
 onClick={() => {
 setQuickPartForm({ name: search || '', category: categories[0] || 'General', purchasePrice: 0, sellingPrice: 0, stock: 1 });
 setIsQuickAddOpen(prev => !prev);
 }}
 className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1 shadow-sm transition-all"
 >
 {isQuickAddOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
 <span>{isQuickAddOpen ? 'ফর্ম বন্ধ করুন' : '+ নতুন আইটেম যুক্ত করুন'}</span>
 </Button>
 </div>

 {/* Inline Quick Add Inventory Item Card */}
 {isQuickAddOpen && (
 <div className="mb-3.5 p-3.5 rounded-xl bg-[#0d0f17] border border-indigo-500/50 shadow-xl shadow-indigo-950/20 space-y-3 animate-in fade-in duration-150">
 <div className="flex items-center justify-between border-b border-gray-800 pb-2">
 <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
 <Package className="w-4 h-4" />
 <span>ইনভেন্টরিতে নতুন আইটেম যুক্ত করুন</span>
 </div>
 <button
 type="button"
 onClick={() => setIsQuickAddOpen(false)}
 className="text-gray-400 hover:text-white p-1 rounded-md"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
 {/* Name */}
 <div className="sm:col-span-2 space-y-1">
 <label className="text-[11px] font-medium text-gray-300">পার্টসের নাম <span className="text-red-400">*</span></label>
 <Input
 type="text"
 placeholder="যেমন: Samsung 32 Backlight Bar"
 value={quickPartForm.name}
 onChange={(e) => setQuickPartForm(prev => ({ ...prev, name: e.target.value }))}
 className="h-8.5 text-xs bg-secondary/80 border-gray-700 text-gray-100"
 autoFocus
 />
 </div>

 {/* Category */}
 <div className="space-y-1">
 <label className="text-[11px] font-medium text-gray-300">ক্যাটাগরি</label>
 <select
 value={quickPartForm.category}
 onChange={(e) => setQuickPartForm(prev => ({ ...prev, category: e.target.value }))}
 className="w-full h-8.5 px-2.5 rounded-lg text-xs bg-secondary/80 border border-gray-700 text-gray-200 focus:outline-none focus:border-indigo-500"
 >
 {categories.map(cat => (
 <option key={cat} value={cat}>{cat}</option>
 ))}
 {!categories.includes('General') && <option value="General">General</option>}
 </select>
 </div>

 {/* Stock Quantity */}
 <div className="space-y-1">
 <label className="text-[11px] font-medium text-gray-300">স্টক সংখ্যা (কত পিস কিনলেন?)</label>
 <Input
 type="number"
 min="1"
 placeholder="1"
 value={quickPartForm.stock || ''}
 onChange={(e) => setQuickPartForm(prev => ({ ...prev, stock: Math.max(1, parseInt(e.target.value) || 1) }))}
 className="h-8.5 text-xs bg-secondary/80 border-gray-700"
 />
 </div>

 {/* Purchase Price (Cost) */}
 <div className="space-y-1">
 <label className="text-[11px] font-medium text-gray-300">ক্রয়মূল্য / কেনা দাম (৳)</label>
 <Input
 type="number"
 min="0"
 placeholder="0"
 value={quickPartForm.purchasePrice || ''}
 onChange={(e) => setQuickPartForm(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
 className="h-8.5 text-xs bg-secondary/80 border-gray-700"
 />
 </div>

 {/* Selling Price */}
 <div className="space-y-1">
 <label className="text-[11px] font-medium text-gray-300">কাস্টমার রেট / বিক্রয়মূল্য (৳) <span className="text-red-400">*</span></label>
 <Input
 type="number"
 min="0"
 placeholder="0"
 value={quickPartForm.sellingPrice || ''}
 onChange={(e) => setQuickPartForm(prev => ({ ...prev, sellingPrice: parseFloat(e.target.value) || 0 }))}
 className={`h-8.5 text-xs bg-secondary/80 font-semibold ${
 quickPartForm.purchasePrice > 0 && quickPartForm.sellingPrice > 0 && quickPartForm.sellingPrice < quickPartForm.purchasePrice
 ? 'border-red-500 text-red-400 focus:border-red-500'
 : 'border-gray-700 text-emerald-400'
 }`}
 />
 {quickPartForm.purchasePrice > 0 && quickPartForm.sellingPrice > 0 && quickPartForm.sellingPrice < quickPartForm.purchasePrice && (
 <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
 <AlertCircle className="w-3 h-3 shrink-0" /> কেনা দামের চেয়ে কম রেট দেওয়া যাবে না!
 </p>
 )}
 </div>
 </div>

 <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800/80">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => setIsQuickAddOpen(false)}
 className="h-7 text-xs text-gray-400 hover:text-white"
 >
 বাতিল
 </Button>
 <Button
 type="button"
 size="sm"
 disabled={isSavingQuickPart || !quickPartForm.name.trim() || !quickPartForm.sellingPrice}
 onClick={handleSaveQuickPart}
 className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg flex items-center gap-1.5 shadow-sm"
 >
 {isSavingQuickPart ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
 ইনভেন্টরিতে সেভ ও ব্যবহার করুন
 </Button>
 </div>
 </div>
 )}

 {/* Inventory Search */}
 <div className="relative mb-3">
 <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
 <Input
 type="text"
 placeholder="Search replacement parts in inventory..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9 h-10 bg-[#0d0f17]"
 />
 </div>
 
 {/* Available Parts List */}
 <div className="h-[140px] sm:h-[160px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-gray-800 border border-gray-800/40 rounded-lg p-2 bg-[#0d0f17]/50 mb-4">
 {loading ? (
 <div className="text-center py-6 text-gray-500 text-xs">Loading available inventory...</div>
 ) : filteredInventory.length === 0 ? (
 <div className="text-center py-5 text-gray-500 text-xs space-y-2">
 <p>{search ? `"${search}" ইনভেন্টরিতে পাওয়া যায়নি` : "ইনভেন্টরিতে কোনো পার্টস নেই"}</p>
 <Button
 type="button"
 size="sm"
 onClick={() => {
 setQuickPartForm(prev => ({ ...prev, name: search || '', category: categories[0] || 'General' }));
 setIsQuickAddOpen(true);
 }}
 className="h-7 text-xs bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg inline-flex items-center gap-1"
 >
 <Plus className="w-3.5 h-3.5" /> {search ? `"${search}" ইনভেন্টরিতে যোগ করুন` : "+ নতুন আইটেম যুক্ত করুন"}
 </Button>
 </div>
 ) : (
 filteredInventory.map(item => (
 <div key={item.id} className="flex items-center justify-between p-2 rounded-md bg-secondary border border-gray-800/60 hover:border-gray-700 transition-colors">
 <div className="min-w-0 pr-2">
 <div className="font-medium text-xs text-gray-200 truncate">{item.name}</div>
 <div className="text-[11px] text-gray-500 flex items-center gap-2">
 <span>Stock: {item.stock}</span>
 <span>•</span>
 <span className="text-emerald-400 font-medium">{formatCurrency(item.sellingPrice || 0)}</span>
 </div>
 </div>
 <Button
 type="button"
 onClick={() => handleAddPart(item)}
 variant="secondary" size="sm" className="h-7 text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 border-none"
 >
 <Plus className="w-3.5 h-3.5" /> Add
 </Button>
 </div>
 ))
 )}
 </div>

 {/* Selected Parts Section */}
 <div className="pt-2 border-t border-gray-800/80">
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
 Parts Attached ({selectedParts.length})
 </span>
 {selectedParts.length > 0 && (
 <span className="text-xs font-medium text-emerald-400">
 Total: {formatCurrency(selectedParts.reduce((acc, p) => acc + (p.price * p.quantity), 0))}
 </span>
 )}
 </div>

 <div className="h-[120px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-gray-800">
 {selectedParts.length === 0 ? (
 <div className="h-full flex flex-col items-center justify-center text-gray-600 text-xs italic py-4">
 <Package className="w-5 h-5 mb-1 opacity-40" />
 No parts selected (Leave empty if no parts used)
 </div>
 ) : (
 selectedParts.map(part => (
 <div key={part.inventoryId} className="flex items-center justify-between bg-[#0d0f17] p-2 rounded-lg border border-gray-800/80">
 <div className="min-w-0 flex-1 pr-2">
 <div className="text-xs font-medium text-gray-200 truncate">{part.name}</div>
 <div className="text-[11px] text-gray-500">{formatCurrency(part.price)} each</div>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <div className="flex items-center bg-secondary rounded border border-gray-800">
 <Button 
 type="button"
 onClick={() => updateQuantity(part.inventoryId, -1)} 
 variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white"
 >
 -
 </Button>
 <span className="text-xs font-semibold w-5 text-center text-gray-200">{part.quantity}</span>
 <Button 
 type="button"
 onClick={() => updateQuantity(part.inventoryId, 1)} 
 variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white"
 >
 +
 </Button>
 </div>
 <Button 
 type="button"
 onClick={() => handleRemovePart(part.inventoryId)} 
 variant="ghost" size="icon" className="h-6 w-6 text-red-400/80 hover:text-red-300 hover:bg-red-500/10"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </Button>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Right Column: Payment Settlement (5 cols) */}
 {pendingStatus === "Delivered" && (
 <div className="lg:col-span-5 flex flex-col gap-4">
 <div className="bg-secondary/60 border border-gray-800/80 rounded-xl p-4 sm:p-5 flex flex-col h-full justify-between">
 <div>
 <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3">
 <Coins className="w-4 h-4" /> Payment Settlement
 </h4>

 {/* Bill Overview Cards */}
 <div className="grid grid-cols-2 gap-3 mb-4">
 <div className="bg-[#0d0f17] p-3 rounded-lg border border-gray-800/80 relative">
 <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Total Bill (Editable)</span>
 <Input 
   type="number" 
   value={editableTotalBill || ''} 
   onChange={(e) => {
     const val = parseInt(e.target.value) || 0;
     setEditableTotalBill(val);
   }}
   className="h-8 bg-transparent border-gray-700 text-gray-100 font-bold px-2 py-0" 
 />
 </div>
 <div className="bg-[#0d0f17] p-3 rounded-lg border border-gray-800/80">
 <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">Already Paid</span>
 <span className="text-base sm:text-lg font-bold text-gray-400">{formatCurrency(customer.advance || 0)}</span>
 </div>
 </div>

 {/* Loyalty Check */}
 {loyaltyConfig?.enabled && customerPoints > 0 && (
   <div className="bg-[#0d0f17] p-3 rounded-xl border border-gray-800/80 space-y-2 mb-4">
     {canRedeemPoints ? (
       <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-emerald-300 select-none">
         <input type="checkbox"
           checked={redeemPoints}
           onChange={(e) => setRedeemPoints(e.target.checked)}
           className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
         />
         <span>Redeem {customerPoints} Points for {formatCurrency(pointsValueTk)} off!</span>
       </label>
     ) : (
       <div className="flex items-center gap-2 text-xs text-amber-400/90 py-0.5">
         <Star className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400/20" />
         <span>কাস্টমারের <strong>{customerPoints}</strong> পয়েন্ট আছে (পয়েন্ট ভাঙাতে সর্বনিম্ন <strong>{minPointsRequired}</strong> পয়েন্ট প্রয়োজন)</span>
       </div>
     )}
   </div>
 )}

 {/* Input Fields */}
 <div className="space-y-4">
 {/* 1. Pay Now Input (PRIMARY ACTION) */}
 <div>
 <div className="flex justify-between items-center mb-1">
 <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
 <Coins className="w-3.5 h-3.5 text-emerald-400" /> Payment Received Now
 </label>
 {currentDue > 0 && !isFullPayment && (
 <Button
 type="button"
 onClick={handlePayFull}
 variant="link" className="h-auto p-0 text-[11px] text-emerald-400 font-semibold flex items-center gap-1"
 >
 Pay Full ({formatCurrency(currentDue)})
 </Button>
 )}
 </div>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 text-sm font-bold">৳</span>
 <Input
 type="number"
 min="0"
 placeholder="0"
 value={paymentReceived || ''}
 onChange={(e) => {
 const valStr = e.target.value.replace(/[^0-9.]/g, "");
 const val = Number(valStr) || 0;
 setPaymentReceived(val);
 if (val >= currentDue) {
 setHasDiscount(false);
 setDueDate('');
 }
 }}
 className="pl-7 h-10 bg-[#0d0f17] border-emerald-500/40 text-emerald-400 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
 />
 </div>
 </div>

 {/* IF FULL PAYMENT: Show green banner */}
 {isFullPayment && (
 <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-semibold">
 <Check className="w-4 h-4 text-emerald-400 shrink-0" />
 Full payment received! No remaining due or discount required.
 </div>
 )}

 {/* IF NOT FULL PAYMENT (unpaid balance remains): Show Discount Checkbox and Due Date */}
 {!isFullPayment && unpaidAfterPayment > 0 && (
 <div className="space-y-3.5 pt-1 border-t border-gray-800/80 animate-in fade-in duration-200">
 {/* Remaining Unpaid Info */}
 <div className="flex justify-between items-center text-xs text-gray-400">
 <span>Unpaid Balance:</span>
 <span className="font-bold text-amber-400 text-sm">{formatCurrency(unpaidAfterPayment)}</span>
 </div>

 {/* Discount Checkbox */}
 <div className="bg-[#0d0f17] p-3 rounded-xl border border-gray-800/80 space-y-2.5">
 <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-300 select-none">
 <input type="checkbox"
 checked={hasDiscount}
 onChange={(e) => setHasDiscount(e.target.checked)}
 className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
 />
 <span className="flex items-center gap-1.5 text-purple-300">
 <TagIcon className="w-3.5 h-3.5" /> Give Discount? (ডিসকাউন্ট দিয়ে হিসাব ক্লোজ করুন)
 </span>
 </label>

 {/* Show auto-applied discount amount message */}
 {hasDiscount && (
 <div className="pt-2 border-t border-gray-800/60 animate-in fade-in duration-150">
 <p className="text-xs text-purple-300 font-medium">
 {formatCurrency(unpaidAfterPayment)} discount automatically applied. No due remains!
 </p>
 </div>
 )}
 </div>

 {/* Due Date Picker (Shown ONLY if finalDue > 0 after any discount) */}
 {finalDue > 0 ? (
 <div className="space-y-1.5 animate-in fade-in duration-200">
 <label className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
 <Calendar className="w-3.5 h-3.5" /> Next Due Date (বাকি টাকা দেয়ার তারিখ) <span className="text-red-400">*</span>
 </label>
 <input type="date"
 required
 value={dueDate}
 onChange={(e) => setDueDate(e.target.value)}
 className="h-10 bg-[#0d0f17] border-amber-500/40 focus-visible:ring-amber-500/50 focus-visible:border-amber-500/50 [color-scheme:dark]"
 />
 <p className="text-[11px] text-gray-500">
 Since {formatCurrency(finalDue)} remains due, specify when customer will clear it.
 </p>
 </div>
 ) : (
 <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-300 text-xs font-medium flex items-center gap-2">
 <Check className="w-4 h-4 text-purple-400 shrink-0" />
 Remaining bill waived via discount. No Due Date required!
 </div>
 )}
 </div>
 )}

 {/* Final Balance Status Box */}
 <div className={`p-3.5 rounded-xl border transition-all ${
 finalDue > 0 
 ? 'bg-amber-500/10 border-amber-500/30' 
 : 'bg-emerald-500/10 border-emerald-500/30'
 }`}>
 <div className="flex justify-between items-center">
 <div>
 <span className="text-xs uppercase tracking-wider text-gray-400 block font-medium">Final Remaining Due</span>
 <span className={`text-xl font-bold ${finalDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
 {formatCurrency(finalDue)}
 </span>
 </div>
 <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
 finalDue > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
 }`}>
 {finalDue > 0 ? 'Has Due' : 'Fully Paid / Settled'}
 </div>
 </div>

 {isOverpaid && (
 <div className="flex items-center gap-1.5 text-xs text-red-400 mt-2 font-medium">
 <AlertCircle className="w-3.5 h-3.5" />
 Payment & discount exceed current due!
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 )}
 
 </div>
 
 {/* Action Footer for BOTH states */}
 <div className="pt-5 mt-4 border-t border-gray-800/80">
 <Button
 type="button"
 onClick={handleSubmit}
 disabled={pendingStatus === 'Delivered' ? (isOverpaid || (finalDue > 0 && !dueDate)) : false}
 className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-blue-900/20 text-white font-semibold"
 >
 <CheckCircle2 className="w-4 h-4" />
 {pendingStatus === 'Delivered' ? 'Complete & Deliver' : 'Save Parts Checklist'}
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 );
}




