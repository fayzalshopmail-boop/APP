'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Tv, 
  Search, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Coins, 
  ShieldCheck, 
  Wrench, 
  Truck, 
  Loader2, 
  ArrowRight,
  MessageCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { formatEnglishCurrency } from '@/lib/currency';

interface TrackData {
  id: string;
  customId: number | null;
  customerNameMasked: string;
  deviceBrand: string;
  deviceType: string;
  deviceProblem: string;
  status: string;
  isBillPending: boolean;
  totalBill: number | null;
  advance: number;
  due: number;
  createdAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  expectedDeliveryDate: string | null;
  isRescheduled?: boolean;
  rescheduleNote?: string | null;
  warranty: {
    hasWarranty: boolean;
    warrantyLabel: string;
    isPendingDelivery: boolean;
    isActive: boolean;
    isExpired: boolean;
    daysRemaining: number;
    daysExpired: number;
    expiryDateStr: string;
    displayBadgeText: { bn: string; en: string };
    colorClass: string;
  };
  shop: {
    name: string;
    title: string;
    phone: string;
    address: string;
  };
}

const STEPS = [
  { key: 'Received', label: 'গ্রহণ করা হয়েছে', icon: Tv, desc: 'ডিভাইসটি সফলভাবে গ্রহণ করা হয়েছে' },
  { key: 'In Progress', label: 'মেরামত চলছে', icon: Wrench, desc: 'টেকনিশিয়ান কাজ করছেন' },
  { key: 'Waiting for Parts', label: 'পার্টসের অপেক্ষা', icon: Clock, desc: 'প্রয়োজনীয় পার্টস সংগ্রহ করা হচ্ছে' },
  { key: 'Ready for Delivery', label: 'ডেলিভারির জন্য প্রস্তুত', icon: CheckCircle2, desc: 'টেস্টিং সম্পন্ন, শপ থেকে নিতে পারেন' },
  { key: 'Delivered', label: 'ডেলিভারি সম্পন্ন', icon: Truck, desc: 'গ্রাহককে ডেলিভারি দেওয়া হয়েছে' }
];

function TrackContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id') || searchParams.get('q') || '';

  const [searchId, setSearchId] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [trackData, setTrackData] = useState<TrackData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTrack = async (idToSearch: string) => {
    const clean = idToSearch.trim();
    if (!clean) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/track?id=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'সার্ভিসের কোনো তথ্য পাওয়া যায়নি।');
        setTrackData(null);
      } else {
        setTrackData(data.data);
      }
    } catch {
      setError('সার্ভারে যোগাযোগ করতে ব্যর্থ হয়েছে। আপনার ইন্টারনেট চেক করুন।');
      setTrackData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      fetchTrack(initialId);
    }
  }, [initialId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      fetchTrack(searchId);
    }
  };

  const getStepStatus = (stepKey: string, currentStatus: string) => {
    if (currentStatus === 'Returned (Unrepaired)') {
      return stepKey === 'Received' ? 'completed' : 'inactive';
    }

    const order = ['Received', 'In Progress', 'Waiting for Parts', 'Ready for Delivery', 'Delivered'];
    const currentIndex = order.indexOf(currentStatus);
    const stepIndex = order.indexOf(stepKey);

    if (currentStatus === stepKey) return 'active';
    if (currentIndex > stepIndex) return 'completed';
    return 'inactive';
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-[#0c1019]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {trackData?.shop?.name || 'TV Care Center'}
              </h1>
              <p className="text-[10px] text-gray-400">
                {trackData?.shop?.title || 'অনলাইন সার্ভিস ট্র্যাকিং পোর্টাল'}
              </p>
            </div>
          </div>

          {trackData?.shop?.phone && (
            <a
              href={`tel:${trackData.shop.phone}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-xs font-semibold"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>সহায়তা</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
        {/* Search Bar Section */}
        <div className="bg-gradient-to-b from-[#101524] to-[#0c0f1a] border border-white/10 rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            লাইভ সার্ভিস ট্র্যাকার
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            আপনার টিভি মেরামতের বর্তমান অবস্থা দেখুন
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto mb-6">
            ইনভয়েসে থাকা জব বা সার্ভিস আইডি নম্বর (যেমন: #1001) লিখে সার্চ করুন।
          </p>

          <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="জব আইডি লিখুন (যেমন: 1001)"
                className="w-full bg-[#161c2d] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchId.trim()}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ট্র্যাক করুন'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center justify-center gap-2 max-w-md mx-auto">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Tracking Details Result */}
        {trackData && (
          <div className="space-y-6">
            {/* Quick Status Header Card */}
            <div className="bg-[#0f1422] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      #{trackData.customId || trackData.id.slice(0, 6).toUpperCase()}
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      {trackData.deviceBrand} {trackData.deviceType}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400">
                    অভিযোগ/সমস্যা: <span className="text-orange-400 font-medium">{trackData.deviceProblem}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left sm:text-right">
                    <p className="text-[11px] text-gray-400 uppercase font-semibold tracking-wider">বর্তমান অবস্থা</p>
                    <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 border border-blue-500/30 text-blue-400">
                      {STEPS.find(s => s.key === trackData.status)?.label || trackData.status}
                    </span>
                  </div>
                  <button
                    onClick={() => fetchTrack(searchId)}
                    title="রিফ্রেশ"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Visual Timeline Steps */}
              <div className="pt-6">
                <div className="relative">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {STEPS.map((step, idx) => {
                      const state = getStepStatus(step.key, trackData.status);
                      const StepIcon = step.icon;
                      const isActive = state === 'active';
                      const isCompleted = state === 'completed';

                      return (
                        <div
                          key={step.key}
                          className={`relative p-3.5 rounded-xl border transition-all ${
                            isActive
                              ? 'bg-blue-600/15 border-blue-500/50 shadow-lg shadow-blue-500/10'
                              : isCompleted
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : 'bg-white/[0.02] border-white/5 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                                isActive
                                  ? 'bg-blue-600 text-white animate-pulse'
                                  : isCompleted
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-white/5 text-gray-500'
                              }`}
                            >
                              <StepIcon className="w-3.5 h-3.5" />
                            </div>
                            <span
                              className={`text-xs font-bold ${
                                isActive ? 'text-blue-400' : isCompleted ? 'text-gray-200' : 'text-gray-500'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 leading-tight">
                            {step.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Details Grid: Bill + Warranty + Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bill & Payment Box */}
              <div className="bg-[#0f1422] border border-white/10 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center gap-2 mb-4 text-gray-300">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">বিল ও পেমেন্ট বিবরণ</h4>
                </div>

                {trackData.isBillPending ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                    ⏳ <strong>টেস্টিং ও রোগ নির্ণয় চলছে:</strong> ডিভাইসের ত্রুটি নির্ণয় শেষ হলে চূড়ান্ত বিল জানানো হবে।
                    {trackData.advance > 0 && (
                      <p className="mt-1.5 text-gray-300">
                        অগ্রিম জমা: <strong>{formatEnglishCurrency(trackData.advance)}</strong>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-gray-400">
                      <span>মোট সার্ভিস বিল</span>
                      <span className="text-white font-bold text-sm">
                        {formatEnglishCurrency(trackData.totalBill || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-gray-400">
                      <span>অগ্রিম পরিশোধ</span>
                      <span className="text-emerald-400 font-medium">
                        - {formatEnglishCurrency(trackData.advance)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                      <span className="font-bold text-gray-300">প্রদেয় বাকি (Due)</span>
                      <span className={`font-black text-base ${trackData.due > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {formatEnglishCurrency(trackData.due)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Warranty Card */}
              <div className="bg-[#0f1422] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3 text-gray-300">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">সার্ভিস ওয়ারেন্টি</h4>
                  </div>

                  {trackData.warranty?.hasWarranty ? (
                    <div className={`p-3.5 rounded-xl border text-xs ${trackData.warranty.colorClass}`}>
                      <p className="font-semibold">{trackData.warranty.displayBadgeText.bn}</p>
                      {trackData.warranty.expiryDateStr && (
                        <p className="text-[11px] mt-1 opacity-90">
                          ওয়ারেন্টি মেয়াদের শেষ তারিখ: {trackData.warranty.expiryDateStr}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      এই সার্ভিসিংয়ে কোনো লিখিত ওয়ারেন্টি অন্তর্ভুক্ত নেই।
                    </p>
                  )}
                </div>

                {/* Important Dates */}
                <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px] text-gray-400">
                  <div>
                    <span className="text-gray-500 block">ডিভাইস গ্রহণ</span>
                    <span className="text-gray-300 font-medium">{formatDate(trackData.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">
                      {trackData.isRescheduled ? 'পুনঃনির্ধারিত ডেলিভারি' : 'সম্ভাব্য ডেলিভারি'}
                    </span>
                    <span className="text-gray-300 font-medium">
                      {trackData.expectedDeliveryDate ? formatDate(trackData.expectedDeliveryDate) : 'দ্রুততম সময়ে'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shop Contact & Actions */}
            <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border border-blue-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white mb-0.5">কোনো প্রশ্ন বা জিজ্ঞাসা আছে?</h4>
                <p className="text-xs text-gray-400">
                  সরাসরি শপে ফোন দিন অথবা হোয়াটসঅ্যাপে মেসেজ পাঠিয়ে কথা বলুন।
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {trackData.shop?.phone && (
                  <>
                    <a
                      href={`tel:${trackData.shop.phone}`}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>কল দিন</span>
                    </a>
                    <a
                      href={`https://wa.me/${trackData.shop.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `আসসালামু আলাইকুম, আমার সার্ভিস আইডি #${trackData.customId || trackData.id} সম্পর্কে জানতে চাচ্ছিলাম।`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-gray-500 mt-12 bg-[#080b12]">
        <div className="max-w-4xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-gray-400">
            {trackData?.shop?.name || 'TV Care Center'} • {trackData?.shop?.title || 'Expert LED TV Servicing'}
          </p>
          {trackData?.shop?.address && (
            <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{trackData.shop.address}</span>
            </p>
          )}
          <p className="text-[10px] text-gray-600 pt-2">
            © {new Date().getFullYear()} সকল স্বত্ব সংরক্ষিত।
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center text-gray-400 gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs">ট্র্যাকিং পোর্টাল লোড হচ্ছে...</p>
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
