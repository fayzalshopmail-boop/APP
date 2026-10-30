'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Customer } from '@/lib/services/customer';
import { formatEnglishCurrency } from '@/lib/currency';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Printer, X, Tv, Phone, MapPin } from 'lucide-react';
import { useRef } from 'react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export function InvoiceModal({ isOpen, onClose, customer }: InvoiceModalProps) {
  const { t, language } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const { shop } = useAppStore();

  if (!customer) return null;

  const handlePrint = () => {
    window.print();
  };

  const shopName = shop?.shopName || 'TV Care Center';
  const shopSubtitle = shop?.shopTitle || 'Expert LED TV Servicing';
  const shopPhone = shop?.phone || '';
  const shopAddress = shop?.address || '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[96vw] sm:max-w-[800px] max-h-[92vh] sm:max-h-[90vh] flex flex-col bg-popover text-white border-gray-800 shadow-2xl p-0 overflow-hidden [&>button]:hidden print:bg-white print:text-black print:border-none print:shadow-none print:max-w-full print:max-h-none print:h-auto">
        {/* Screen Only Header */}
        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-800 bg-secondary print:hidden shrink-0">
          <h2 className="text-base sm:text-lg font-bold">
            {language === 'bn' ? 'রসিদ প্রিন্ট' : 'Print Invoice'}
          </h2>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              onClick={handlePrint}
              className="flex items-center gap-2 h-9 text-xs sm:text-sm"
            >
              <Printer className="w-4 h-4" />
              {language === 'bn' ? 'প্রিন্ট' : 'Print'}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white h-9 w-9">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Printable Area */}
        <div 
          ref={printRef}
          className="p-4 sm:p-8 md:p-12 bg-white text-black min-h-[400px] overflow-y-auto overflow-x-auto flex-1 print:p-0 print:min-h-0 print:overflow-visible"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-gray-200 pb-4 sm:pb-6 mb-6 sm:mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl flex items-center justify-center print:bg-blue-600 shrink-0">
                <Tv className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight uppercase">{shopName}</h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium tracking-wider">{shopSubtitle}</p>
                {(shopPhone || shopAddress) && (
                  <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                    {[shopPhone, shopAddress].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                {language === 'bn' ? 'ইনভয়েস / রসিদ' : 'INVOICE'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {language === 'bn' ? 'ইনভয়েস নং:' : 'Invoice No:'} #{customer.id.substring(0, 6).toUpperCase()}
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                {language === 'bn' ? 'তারিখ:' : 'Date:'} {new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-GB')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 mb-8 sm:mb-10">
            {/* Customer Details */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                {language === 'bn' ? 'গ্রাহকের বিবরণ' : 'Billed To'}
              </h3>
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
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                {language === 'bn' ? 'ডিভাইসের বিবরণ' : 'Device Details'}
              </h3>
              <p className="text-base font-bold text-gray-800 mb-1">{customer.deviceBrand || 'Device'} {customer.deviceType ? `(${customer.deviceType})` : ''}</p>
              {customer.serialNumber && (
                <p className="text-xs text-gray-500 font-mono mb-2 border border-gray-200 rounded px-2 py-1 w-fit bg-gray-50">
                  SN: {customer.serialNumber}
                </p>
              )}
              <p className="text-sm text-gray-600 mb-1">
                {language === 'bn' ? 'সমস্যা:' : 'Problem:'} <span className="font-medium text-orange-600">{customer.deviceProblem || 'N/A'}</span>
              </p>
              {customer.deviceDetails && (
                <p className="text-xs text-gray-500 mb-1">{customer.deviceDetails}</p>
              )}
              {customer.warrantyMonths ? (
                <p className="text-xs font-bold text-purple-600 mt-2 uppercase tracking-wide">
                  {language === 'bn' ? 'ওয়ারেন্টি:' : 'Warranty:'} {customer.warrantyMonths}
                </p>
              ) : null}
            </div>
          </div>

          {/* Billing Table */}
          <div className="mb-10 rounded-xl overflow-hidden border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-600">
                    {language === 'bn' ? 'বিবরণ' : 'Description'}
                  </th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-right">
                    {language === 'bn' ? 'টাকার পরিমাণ' : 'Amount'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                <tr>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-800">
                      {language === 'bn' ? 'সার্ভিসিং ও পার্টস বিল' : 'Servicing & Parts Bill'}
                    </span>
                    <br/>
                    <span className="text-xs text-gray-500">
                      {language === 'bn' 
                        ? `${customer.deviceBrand || ''} ${customer.deviceType || 'ডিভাইস'} মেরামতের খরচ` 
                        : `Total charge for repair of ${customer.deviceBrand || ''} ${customer.deviceType || 'Device'}`}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-800">
                    {formatEnglishCurrency(customer.totalBill)}
                  </td>
                </tr>
                {Boolean(customer.discount && customer.discount > 0) && (
                  <tr>
                    <td className="px-6 py-4">
                      <span className="font-medium text-emerald-700">
                        {language === 'bn' ? 'বিশেষ ছাড় (Discount)' : 'Special Discount'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-700">
                      - {formatEnglishCurrency(customer.discount || 0)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-800">
                      {language === 'bn' ? 'অগ্রিম পরিশোধ' : 'Advance Paid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">
                    - {formatEnglishCurrency(customer.advance || 0)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td className="px-6 py-4 font-bold text-gray-800 text-right uppercase tracking-wider text-xs">
                    {language === 'bn' ? 'মোট বকেয়া (Due)' : 'Total Due'}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-red-600 text-lg">
                    {formatEnglishCurrency(customer.due)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer / Terms */}
          <div className="border-t border-gray-200 pt-6 flex justify-between items-end">
            <div className="w-1/2">
              <h4 className="text-xs font-bold text-gray-800 uppercase mb-2">
                {language === 'bn' ? 'শর্তাবলী' : 'Terms & Conditions'}
              </h4>
              <ul className="text-[10px] text-gray-500 space-y-1 list-disc pl-3">
                <li>
                  {language === 'bn' ? 'ফিজিক্যাল ড্যামেজ বা পুড়ে যাওয়া কেসে কোনো ওয়ারেন্টি প্রযোজ্য নয়।' : 'No warranty on physical damage or burn cases.'}
                </li>
                <li>
                  {language === 'bn' ? 'ডিভাইস গ্রহণের সময় অনুগ্রহ করে এই রসিদটি সাথে আনবেন।' : 'Please bring this invoice when collecting your device.'}
                </li>
                <li>
                  {language === 'bn' ? '৩০ দিনের অধিক সময় অতিবাহিত হলে প্রতিষ্ঠানের কোনো দায় থাকবে না।' : 'Items left over 30 days are not our responsibility.'}
                </li>
              </ul>
            </div>
            
            <div className="w-[200px] text-center">
              <div className="border-b border-gray-400 h-10 mb-2"></div>
              <p className="text-xs font-medium text-gray-600">
                {language === 'bn' ? 'কর্তৃপক্ষের স্বাক্ষর' : 'Authorized Signature'}
              </p>
              {customer.receivedByName && (
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {language === 'bn' ? 'রিসিভ করেছেন:' : 'Received by:'} {customer.receivedByName}
                </p>
              )}
            </div>
          </div>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}
