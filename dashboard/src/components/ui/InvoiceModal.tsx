'use client';
import { Input } from '@/components/ui/input';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Customer } from '@/lib/services/customer';
import { formatCurrency } from '@/lib/currency';
import { Printer, X, Tv, Phone, MapPin } from 'lucide-react';
import { useRef } from 'react';

interface InvoiceModalProps {
 isOpen: boolean;
 onClose: () => void;
 customer: Customer | null;
}

export function InvoiceModal({ isOpen, onClose, customer }: InvoiceModalProps) {
 const printRef = useRef<HTMLDivElement>(null);

 if (!customer) return null;

 const handlePrint = () => {
 window.print();
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="sm:max-w-[800px] bg-popover text-white border-gray-800 shadow-2xl p-0 overflow-hidden [&>button]:hidden print:bg-white print:text-black print:border-none print:shadow-none print:max-w-full">
 {/* Screen Only Header */}
 <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-secondary print:hidden">
 <h2 className="text-lg font-bold">Print Invoice</h2>
 <div className="flex items-center gap-3">
 <Button 
 onClick={handlePrint}
 className="flex items-center gap-2"
 >
 <Printer className="w-4 h-4" />
 Print
 </Button>
 <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
 <X className="w-5 h-5" />
 </Button>
 </div>
 </div>

 {/* Printable Area */}
 <div 
 ref={printRef}
 className="p-8 md:p-12 bg-white text-black min-h-[600px] print:p-0 print:min-h-0"
 >
 {/* Header */}
 <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6 mb-8">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center print:bg-blue-600">
 <Tv className="w-7 h-7 text-white" />
 </div>
 <div>
 <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">TV Care Center</h1>
 <p className="text-sm text-gray-500 font-medium tracking-wider">Expert LED TV Servicing</p>
 </div>
 </div>
 <div className="text-right">
 <h2 className="text-xl font-bold text-gray-800">INVOICE</h2>
 <p className="text-sm text-gray-500 mt-1">Invoice No: #{customer.id.substring(0, 6).toUpperCase()}</p>
 <p className="text-sm text-gray-500">Date: {new Date().toLocaleDateString('en-GB')}</p>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-12 mb-10">
 {/* Customer Details */}
 <div>
 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Billed To</h3>
 <p className="text-lg font-bold text-gray-800 mb-1">{customer.name}</p>
 <div className="flex items-center gap-2 text-gray-600 mb-1 text-sm">
 <Phone className="w-3.5 h-3.5" />
 <span>{customer.phone}</span>
 </div>
 <div className="flex items-center gap-2 text-gray-600 text-sm">
 <MapPin className="w-3.5 h-3.5" />
 <span>{customer.address}</span>
 </div>
 </div>
 
 {/* Device Details */}
 <div>
 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Device Details</h3>
 <p className="text-base font-bold text-gray-800 mb-1">{customer.deviceBrand || 'Unknown Brand'} {customer.deviceType ? `(${customer.deviceType})` : ''}</p>
 {customer.serialNumber && (
 <p className="text-xs text-gray-500 font-mono mb-2 border border-gray-200 rounded px-2 py-1 w-fit bg-gray-50">
 SN: {customer.serialNumber}
 </p>
 )}
 <p className="text-sm text-gray-600 mb-1">Problem: <span className="font-medium text-orange-600">{customer.deviceProblem || 'N/A'}</span></p>
 {customer.deviceDetails && (
 <p className="text-xs text-gray-500 mb-1">{customer.deviceDetails}</p>
 )}
 {customer.warrantyMonths ? (
 <p className="text-xs font-bold text-purple-600 mt-2 uppercase tracking-wide">
 Warranty: {customer.warrantyMonths}
 </p>
 ) : null}
 </div>
 </div>

 {/* Billing Table */}
 <div className="mb-10 rounded-xl overflow-hidden border border-gray-200">
 <table className="w-full text-left text-sm">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-6 py-4 font-bold text-gray-600">Description</th>
 <th className="px-6 py-4 font-bold text-gray-600 text-right">Amount</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 bg-white">
 <tr>
 <td className="px-6 py-4">
 <span className="font-medium text-gray-800">Servicing & Parts Bill</span>
 <br/>
 <span className="text-xs text-gray-500">Total charge for repair of {customer.deviceBrand} TV</span>
 </td>
 <td className="px-6 py-4 text-right font-medium text-gray-800">
 {formatCurrency(customer.totalBill)}
 </td>
 </tr>
 <tr>
 <td className="px-6 py-4">
 <span className="font-medium text-gray-800">Advance Paid</span>
 </td>
 <td className="px-6 py-4 text-right text-gray-600">
 - {formatCurrency(customer.advance || 0)}
 </td>
 </tr>
 </tbody>
 <tfoot className="bg-gray-50 border-t-2 border-gray-200">
 <tr>
 <td className="px-6 py-4 font-bold text-gray-800 text-right uppercase tracking-wider text-xs">Total Due</td>
 <td className="px-6 py-4 text-right font-black text-red-600 text-lg">
 {formatCurrency(customer.due)}
 </td>
 </tr>
 </tfoot>
 </table>
 </div>

 {/* Footer / Terms */}
 <div className="border-t border-gray-200 pt-6 flex justify-between items-end">
 <div className="w-1/2">
 <h4 className="text-xs font-bold text-gray-800 uppercase mb-2">Terms & Conditions</h4>
 <ul className="text-[10px] text-gray-500 space-y-1 list-disc pl-3">
 <li>No warranty on physical damage or burn cases.</li>
 <li>Please bring this invoice when collecting your device.</li>
 <li>Items left over 30 days are not our responsibility.</li>
 </ul>
 </div>
 
 <div className="w-[200px] text-center">
 <div className="border-b border-gray-400 h-10 mb-2"></div>
 <p className="text-xs font-medium text-gray-600">Authorized Signature</p>
 </div>
 </div>
 
 </div>
 </DialogContent>
 </Dialog>
 );
}
