'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatEnglishCurrency } from '@/lib/currency';
import { useAppStore } from '@/store/useAppStore';
import { Printer, X, ShoppingBag, Phone, MapPin } from 'lucide-react';
import { useRef } from 'react';

export interface DirectSaleReceiptData {
  id?: string;
  itemName: string;
  quantity: number;
  price: number;
  total: number;
  customerName: string;
  date?: string;
}

interface DirectSaleReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: DirectSaleReceiptData | null;
}

export function DirectSaleReceiptModal({ isOpen, onClose, receiptData }: DirectSaleReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { shop } = useAppStore();

  if (!receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  const shopName = shop?.shopName || 'TV Care Center';
  const shopSubtitle = shop?.shopTitle || 'Expert LED TV Servicing & Electronics';
  const shopPhone = shop?.phone || '';
  const shopAddress = shop?.address || '';
  const receiptNo = receiptData.id ? receiptData.id.slice(0, 8).toUpperCase() : 'DS-SALE';
  const dateStr = receiptData.date || new Date().toLocaleDateString('en-GB');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] bg-popover text-white border-gray-800 shadow-2xl p-0 overflow-hidden [&>button]:hidden print:bg-white print:text-black print:border-none print:shadow-none print:max-w-full">
        {/* Screen Only Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-secondary print:hidden">
          <h2 className="text-lg font-bold">Sales Receipt (বিক্রয় রশিদ)</h2>
          <div className="flex items-center gap-3">
            <Button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Printable Area */}
        <div 
          ref={printRef}
          className="p-8 md:p-10 bg-white text-black min-h-[500px] print:p-0 print:min-h-0"
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center print:bg-blue-600">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{shopName}</h1>
                <p className="text-sm text-gray-500 font-medium tracking-wider">{shopSubtitle}</p>
                {(shopPhone || shopAddress) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[shopPhone, shopAddress].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">Cash Receipt</h2>
              <p className="text-sm text-gray-500 mt-1">Receipt No: #{receiptNo}</p>
              <p className="text-sm text-gray-500">Date: {dateStr}</p>
            </div>
          </div>

          {/* Customer Details */}
          <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Customer Information</h3>
            <p className="text-base font-bold text-gray-800">{receiptData.customerName || 'Walk-in Customer'}</p>
          </div>

          {/* Items Table */}
          <div className="mb-8 rounded-xl overflow-hidden border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-bold text-gray-600">Item Description</th>
                  <th className="px-6 py-3 font-bold text-gray-600 text-center">Qty</th>
                  <th className="px-6 py-3 font-bold text-gray-600 text-right">Unit Price</th>
                  <th className="px-6 py-3 font-bold text-gray-600 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                <tr>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-800">{receiptData.itemName}</span>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-700 font-medium">
                    {receiptData.quantity}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700 font-medium">
                    {formatEnglishCurrency(receiptData.price)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900">
                    {formatEnglishCurrency(receiptData.total)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={3} className="px-6 py-3 font-bold text-gray-800 text-right uppercase tracking-wider text-xs">Total Amount</td>
                  <td className="px-6 py-3 text-right font-black text-gray-900 text-base">
                    {formatEnglishCurrency(receiptData.total)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-6 py-2 font-medium text-gray-600 text-right text-xs">Paid (Cash)</td>
                  <td className="px-6 py-2 text-right font-bold text-emerald-600 text-sm">
                    {formatEnglishCurrency(receiptData.total)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-6 py-2 font-bold text-gray-800 text-right uppercase tracking-wider text-xs">Due</td>
                  <td className="px-6 py-2 text-right font-bold text-gray-500 text-sm">
                    ৳ 0
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
                <li>Goods once sold can only be exchanged within 3 days with this receipt.</li>
                <li>No warranty on electronic components against power surge or physical damage.</li>
                <li>Thank you for choosing our services!</li>
              </ul>
            </div>
            
            <div className="w-[180px] text-center">
              <div className="border-b border-gray-400 h-10 mb-2"></div>
              <p className="text-xs font-medium text-gray-600">Authorized Signature</p>
            </div>
          </div>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}
