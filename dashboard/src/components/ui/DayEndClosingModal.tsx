'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Coins, 
  X, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Calculator, 
  ArrowDownRight, 
  ArrowUpRight, 
  Scale, 
  FileText,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { telegramService } from '@/lib/services/telegramService';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getLocalDateString } from '@/lib/utils';
import toast from 'react-hot-toast';

interface DayEndClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DayEndClosingModal({ isOpen, onClose, onSuccess }: DayEndClosingModalProps) {
  const { user, shop } = useAppStore();
  const { t, language } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Financial Aggregations
  const [breakdown, setBreakdown] = useState({
    advances: 0,
    dueCollections: 0,
    directSales: 0,
    loansTaken: 0,
    totalIn: 0,
    expenses: 0,
    supplierPayments: 0,
    mechanicPayments: 0,
    refunds: 0,
    loansGiven: 0,
    totalOut: 0,
    expectedCash: 0
  });

  // User input states
  const [actualCashStr, setActualCashStr] = useState('');
  const [note, setNote] = useState('');
  const [sendTelegram, setSendTelegram] = useState(Boolean(shop?.telegram?.chatId));
  const [showDenominations, setShowDenominations] = useState(false);

  // Quick denomination counts
  const [counts, setCounts] = useState<{ [key: number]: number }>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0
  });

  const handleDenominationChange = (denom: number, valStr: string) => {
    const val = parseInt(valStr.replace(/\D/g, ''), 10) || 0;
    const newCounts = { ...counts, [denom]: val };
    setCounts(newCounts);

    const totalCalculated = Object.entries(newCounts).reduce(
      (sum, [d, c]) => sum + Number(d) * c,
      0
    );
    setActualCashStr(String(totalCalculated));
  };

  useEffect(() => {
    if (!isOpen) return;

    const loadTodayFinancials = async () => {
      try {
        setLoading(true);
        if (!db) return;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfTodayStr = getLocalDateString(startOfToday);

        // Fetch Transactions created today
        const qTrans = query(
          collection(db, 'transactions'),
          where('createdAt', '>=', startOfToday)
        );

        // Fetch Expenses for today
        const qExp = query(
          collection(db, 'expenses'),
          where('date', '>=', startOfTodayStr)
        );

        const [transSnap, expSnap] = await Promise.all([
          getDocs(qTrans).catch(() => null),
          getDocs(qExp).catch(() => null)
        ]);

        let advances = 0;
        let dueCollections = 0;
        let directSales = 0;
        let loansTaken = 0;
        let supplierPayments = 0;
        let mechanicPayments = 0;
        let refunds = 0;
        let loansGiven = 0;

        if (transSnap) {
          transSnap.forEach((doc) => {
            const data = doc.data() as any;
            const amt = Number(data.amount) || 0;
            switch (data.type) {
              case 'Advance Payment':
                advances += amt;
                break;
              case 'Due Collection':
                dueCollections += amt;
                break;
              case 'Direct Sell':
                directSales += amt;
                break;
              case 'Loan Taken':
                loansTaken += amt;
                break;
              case 'Supplier Payment':
                supplierPayments += amt;
                break;
              case 'Mechanic Payment':
                mechanicPayments += amt;
                break;
              case 'Refund':
                refunds += amt;
                break;
              case 'Loan Given':
                loansGiven += amt;
                break;
            }
          });
        }

        let expenses = 0;
        if (expSnap) {
          expSnap.forEach((doc) => {
            const data = doc.data() as any;
            expenses += Number(data.amount) || 0;
          });
        }

        const totalIn = advances + dueCollections + directSales + loansTaken;
        const totalOut = expenses + supplierPayments + mechanicPayments + refunds + loansGiven;
        const expectedCash = totalIn - totalOut;

        setBreakdown({
          advances,
          dueCollections,
          directSales,
          loansTaken,
          totalIn,
          expenses,
          supplierPayments,
          mechanicPayments,
          refunds,
          loansGiven,
          totalOut,
          expectedCash
        });

        // Set default telegram checkbox from shop settings
        if (shop?.telegram?.chatId) {
          setSendTelegram(true);
        }
      } catch (err) {
        console.error('Error fetching today financials:', err);
        toast.error('আজকের হিসাব লোড করতে সমস্যা হয়েছে।');
      } finally {
        setLoading(false);
      }
    };

    loadTodayFinancials();
  }, [isOpen, shop?.telegram?.chatId]);

  const actualCash = actualCashStr === '' ? null : Number(actualCashStr);
  const difference = actualCash !== null ? actualCash - breakdown.expectedCash : null;

  const handleSaveClosing = async () => {
    if (actualCash === null || isNaN(actualCash)) {
      toast.error('ড্রয়ারে থাকা নগদ টাকার পরিমাণ লিখুন।');
      return;
    }

    try {
      setSaving(true);
      if (!db) throw new Error('Database is not initialized');

      const now = new Date();
      const todayDateStr = getLocalDateString(now);

      const closingRecord = {
        date: todayDateStr,
        closedAt: serverTimestamp(),
        closedBy: user?.email || 'Unknown',
        closedByName: user?.name || user?.email || 'Shop Owner',
        expectedCash: breakdown.expectedCash,
        actualCash,
        difference: difference || 0,
        breakdown,
        note: note.trim() || null,
        telegramSent: Boolean(sendTelegram && shop?.telegram?.chatId)
      };

      await addDoc(collection(db, 'dailyClosings'), closingRecord);

      // Send to Telegram if requested
      if (sendTelegram && shop?.telegram?.chatId) {
        telegramService.notifyCashClosing({
          date: now.toLocaleDateString('bn-BD', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
          expectedCash: breakdown.expectedCash,
          actualCash,
          difference: difference || 0,
          totalIn: breakdown.totalIn,
          totalOut: breakdown.totalOut,
          note: note.trim() || undefined,
          staffName: user?.name || user?.email || 'Shop Owner'
        });
      }

      toast.success(
        language === 'bn' 
          ? 'আজকের ক্যাশ ক্লোজিং সফলভাবে সম্পন্ন হয়েছে!' 
          : 'Day-end cash closing saved successfully!'
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving cash closing:', err);
      toast.error(err.message || 'ক্যাশ ক্লোজিং সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[620px] max-h-[90dvh] flex flex-col bg-popover text-white border-gray-800 shadow-2xl p-0 overflow-hidden [&>button]:hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-secondary shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{language === 'bn' ? 'কাউন্টার ক্যাশ ক্লোজিং' : 'Day-End Cash Closing'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400">
                {language === 'bn' 
                  ? 'কাউন্টার ড্রয়ারের টাকার সাথে সিস্টেমের হিসাব মিলিয়ে দিন ক্লোজ করুন' 
                  : 'Reconcile drawer cash with system records to close today'}
              </DialogDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white h-8 w-8">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-xs">আজকের আর্থিক হিসাব হিসাব করা হচ্ছে...</p>
            </div>
          ) : (
            <>
              {/* Summary Cards: Inflow vs Outflow */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'মোট ক্যাশ ইন' : 'Cash In'}</span>
                  </div>
                  <p className="text-lg sm:text-xl font-black text-emerald-400">
                    +{formatCurrency(breakdown.totalIn)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    অগ্রিম, বাকি আদায় ও বিক্রয়
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25">
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold mb-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'মোট ক্যাশ আউট' : 'Cash Out'}</span>
                  </div>
                  <p className="text-lg sm:text-xl font-black text-rose-400">
                    -{formatCurrency(breakdown.totalOut)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    খরচ, পার্টস ও মহাজন পেমেন্ট
                  </p>
                </div>
              </div>

              {/* System Expected Cash Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/30 to-indigo-950/40 border border-blue-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-blue-300 font-semibold uppercase tracking-wider block">
                    {language === 'bn' ? 'সিস্টেমের হিসেবে ক্যাশে থাকার কথা' : 'System Expected Cash in Drawer'}
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                    {formatCurrency(breakdown.expectedCash)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Scale className="w-6 h-6" />
                </div>
              </div>

              {/* Actual Cash Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300">
                    {language === 'bn' ? 'ড্রয়ারে বাস্তবে মোট কত নগদ টাকা আছে? (৳)' : 'Actual Cash in Drawer (৳)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDenominations(!showDenominations)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>{showDenominations ? 'ক্যালকুলেটর লুকান' : 'নোটের হিসাব খুলুন'}</span>
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">৳</span>
                  <Input
                    type="number"
                    value={actualCashStr}
                    onChange={(e) => setActualCashStr(e.target.value)}
                    placeholder="ড্রয়ারের টাকার পরিমাণ লিখুন"
                    className="pl-8 bg-secondary border-gray-700 text-white font-bold text-lg h-12 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Optional Denominations Calculator */}
                {showDenominations && (
                  <div className="p-3 bg-secondary/80 rounded-xl border border-gray-800 space-y-2 animate-in fade-in duration-200">
                    <p className="text-[11px] text-gray-400 font-medium">
                      নোটের সংখ্যা লিখলে মোট টাকা স্বয়ংক্রিয়ভাবে যোগ হয়ে যাবে:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[1000, 500, 200, 100, 50, 20, 10].map((denom) => (
                        <div key={denom} className="flex items-center gap-1.5 bg-[#0b0e14] p-1.5 rounded-lg border border-gray-800">
                          <span className="text-[11px] font-bold text-gray-300 w-10 shrink-0">৳{denom}:</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="০"
                            value={counts[denom] || ''}
                            onChange={(e) => handleDenominationChange(denom, e.target.value)}
                            className="w-full bg-transparent text-right text-xs font-bold text-amber-400 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Variance & Discrepancy Alert */}
              {actualCash !== null && difference !== null && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                    difference === 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : difference > 0
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {difference === 0 ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                  ) : difference > 0 ? (
                    <Sparkles className="w-5 h-5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                  )}
                  <div className="text-xs">
                    <p className="font-bold">
                      {difference === 0
                        ? '✅ ক্যাশ নিখুঁতভাবে মিলে গেছে! (পার্থক্য: ৳০)'
                        : difference > 0
                        ? `🔵 উদ্বৃত্ত (Surplus): ড্রয়ারে +${formatCurrency(difference)} বেশি আছে!`
                        : `🔴 ঘাটতি (Shortage): ড্রয়ারে -${formatCurrency(Math.abs(difference))} কম আছে!`}
                    </p>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {difference === 0
                        ? 'সিস্টেমের মোট হিসাব ও ড্রয়ারের টাকা ১০০% সঠিক।'
                        : difference > 0
                        ? 'কোনো খরচ কম লেখা হয়ে থাকলে বা অতিরিক্ত নগদ জমা থাকলে চেক করুন।'
                        : 'কোনো খরচ মিস হয়েছে কিনা বা কাস্টমার পেমেন্ট কম দিয়েছে কিনা যাচাই করুন।'}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">
                  {language === 'bn' ? 'ক্লোজিং নোট / মন্তব্য (ঐচ্ছিক)' : 'Closing Note / Remarks (Optional)'}
                </label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="যেমন: কাল সকালের খুচরার জন্য ড্রয়ারে ৫০০ টাকা রাখা হয়েছে..."
                  className="bg-secondary border-gray-700 text-white text-xs h-9"
                />
              </div>

              {/* Telegram Dispatch Option */}
              <div className="p-3 rounded-xl bg-secondary border border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <label htmlFor="send-tg" className="text-xs font-bold text-white cursor-pointer">
                      টেলিগ্রামে ক্লোজিং রিপোর্ট পাঠান
                    </label>
                    <p className="text-[10px] text-gray-400">
                      {shop?.telegram?.chatId ? 'মালিকের টেলিগ্রাম চ্যানেলে তাৎক্ষণিক মেসেজ যাবে' : 'টেলিগ্রাম কনফিগার করা নেই'}
                    </p>
                  </div>
                </div>
                <input
                  id="send-tg"
                  type="checkbox"
                  disabled={!shop?.telegram?.chatId}
                  checked={sendTelegram}
                  onChange={(e) => setSendTelegram(e.target.checked)}
                  className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-800 bg-secondary flex items-center justify-end gap-2.5 shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={saving} className="text-gray-400 hover:text-white">
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSaveClosing}
            disabled={saving || loading || actualCash === null}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm px-5 h-9 sm:h-10 shadow-lg shadow-amber-600/20 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>সংরক্ষণ হচ্ছে...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'bn' ? 'ক্যাশ ক্লোজিং সম্পন্ন করুন' : 'Confirm Cash Closing'}</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
