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
  Coins, 
  ShieldCheck, 
  Wrench, 
  Truck, 
  Loader2, 
  MessageCircle, 
  RefreshCw, 
  Sparkles,
  CalendarClock,
  X,
  Check,
  Building2,
  Lock,
  ShieldAlert,
  User,
  KeyRound,
  UserCheck,
  Calendar
} from 'lucide-react';
import { formatEnglishCurrency } from '@/lib/currency';
import { parseTrackingInput } from '@/lib/trackingToken';

interface TrackData {
  id: string;
  customId: number | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deviceBrand: string;
  deviceType: string;
  deviceProblem: string;
  displayAction?: string;
  deviceDetails: string;
  serialNumber: string;
  status: string;
  isBillPending: boolean;
  totalBill: number | null;
  advance: number;
  due: number;
  discount: number;
  createdAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  expectedDeliveryDate: string | null;
  isRescheduled?: boolean;
  rescheduleCount?: number;
  rescheduleNote?: string | null;
  partsUsed?: { name: string; quantity: number }[];
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
  { 
    key: 'Received', 
    label: 'গ্রহণ করা হয়েছে', 
    stepNumber: 1, 
    icon: Tv, 
    shortTitle: 'রিসিভড',
    desc: 'ডিভাইসটি শপে সফলভাবে গ্রহণ করা হয়েছে' 
  },
  { 
    key: 'In Progress', 
    label: 'মেরামত চলছে', 
    stepNumber: 2, 
    icon: Wrench, 
    shortTitle: 'মেরামত',
    desc: 'দক্ষ টেকনিশিয়ান সার্ভিসিং কাজ করছেন' 
  },
  { 
    key: 'Waiting for Parts', 
    label: 'পার্টসের অপেক্ষা', 
    stepNumber: 3, 
    icon: Clock, 
    shortTitle: 'পার্টস',
    desc: 'প্রয়োজনীয় যন্ত্রাংশ সংগ্রহ ও যাচাই চলছে' 
  },
  { 
    key: 'Ready for Delivery', 
    label: 'ডেলিভারির জন্য প্রস্তুত', 
    stepNumber: 4, 
    icon: CheckCircle2, 
    shortTitle: 'প্রস্তুত',
    desc: 'টেস্টিং সম্পন্ন, শপ থেকে নিতে পারেন' 
  },
  { 
    key: 'Delivered', 
    label: 'ডেলিভারি সম্পন্ন', 
    stepNumber: 5, 
    icon: Truck, 
    shortTitle: 'ডেলিভার্ড',
    desc: 'গ্রাহককে সফলভাবে বুঝিয়ে দেওয়া হয়েছে' 
  }
];

function TrackContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id') || searchParams.get('q') || '';
  const initialKey = searchParams.get('key') || searchParams.get('token') || searchParams.get('t') || '';

  const hasInitialParams = Boolean(initialId && initialKey);
  const [rawInput, setRawInput] = useState(initialId ? (initialKey ? `${initialId}` : initialId) : '');
  const [currentKey, setCurrentKey] = useState(initialKey);
  const [currentId, setCurrentId] = useState(initialId);
  const [loading, setLoading] = useState(hasInitialParams);
  const [trackData, setTrackData] = useState<TrackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadProgress, setLoadProgress] = useState(20);
  const [loadStepText, setLoadStepText] = useState('নিরাপদ সিক্রেট কোড যাচাই হচ্ছে…');

  const fetchTrack = async (idToSearch: string, keyToSearch?: string, isRefresh = false) => {
    let cleanId = idToSearch.trim();
    let cleanKey = (keyToSearch ?? currentKey).trim();

    if (cleanId) {
      const parsed = parseTrackingInput(cleanId);
      if (parsed.key) {
        cleanKey = parsed.key;
        if (parsed.id) cleanId = parsed.id;
      }
    }

    if (!cleanId) return;

    if (!cleanKey) {
      setError('গোপনীয়তা ও নিরাপত্তার স্বার্থে সরাসরি আইডি লিখে অন্যের তথ্য দেখা সম্পূর্ণ বন্ধ রয়েছে। আপনার ইনভয়েস বা মেসেজে পাওয়া পূর্ণাঙ্গ সিক্রেট লিংকটি ব্যবহার করুন।');
      setIsRestricted(true);
      setTrackData(null);
      setLoading(false);
      return;
    }

    const startTime = Date.now();
    let pTimer1: NodeJS.Timeout | null = null;
    let pTimer2: NodeJS.Timeout | null = null;
    let pTimer3: NodeJS.Timeout | null = null;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setLoadProgress(15);
        setLoadStepText('নিরাপদ সিক্রেট কোড যাচাই হচ্ছে…');

        pTimer1 = setTimeout(() => {
          setLoadProgress(45);
          setLoadStepText('সার্ভিস সেন্টারের ডাটা সিঙ্ক হচ্ছে…');
        }, 450);

        pTimer2 = setTimeout(() => {
          setLoadProgress(75);
          setLoadStepText('ডিভাইসের বর্তমান অবস্থা পরীক্ষা করা হচ্ছে…');
        }, 950);

        pTimer3 = setTimeout(() => {
          setLoadProgress(95);
          setLoadStepText('তথ্য প্রস্তুত, পেজ ওপেন হচ্ছে…');
        }, 1450);
      }
      setError(null);
      setIsRestricted(false);

      const res = await fetch(`/api/track?id=${encodeURIComponent(cleanId)}&key=${encodeURIComponent(cleanKey)}`);
      const data = await res.json();
      
      // If it's the initial full-screen load, ensure a relaxing 1.8-2.0s hold so customer experiences the smooth animation
      if (!isRefresh) {
        const elapsed = Date.now() - startTime;
        if (elapsed < 1800) {
          await new Promise((resolve) => setTimeout(resolve, 1800 - elapsed));
        }
        setLoadProgress(100);
        setLoadStepText('সম্পন্ন!');
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      if (!res.ok) {
        setError(data.error || 'সার্ভিসের কোনো তথ্য পাওয়া যায়নি।');
        setIsRestricted(Boolean(data.isRestricted || res.status === 403));
        setTrackData(null);
      } else {
        setTrackData(data.data);
        setCurrentKey(cleanKey);
        setCurrentId(cleanId);
      }
    } catch {
      setError('সার্ভারে যোগাযোগ করতে ব্যর্থ হয়েছে। আপনার ইন্টারনেট চেক করুন।');
      setTrackData(null);
    } finally {
      if (pTimer1) clearTimeout(pTimer1);
      if (pTimer2) clearTimeout(pTimer2);
      if (pTimer3) clearTimeout(pTimer3);
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (initialId || initialKey) {
      fetchTrack(initialId, initialKey);
    }
  }, [initialId, initialKey]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rawInput.trim()) {
      fetchTrack(rawInput);
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

  const getProgressPercentage = (currentStatus: string) => {
    if (currentStatus === 'Returned (Unrepaired)') return 15;
    const order = ['Received', 'In Progress', 'Waiting for Parts', 'Ready for Delivery', 'Delivered'];
    const index = order.indexOf(currentStatus);
    if (index === -1) return 10;
    return ((index + 1) / order.length) * 100;
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

  const cleanPhone = trackData?.shop?.phone?.replace(/\D/g, '') || '';
  const currentStepInfo = STEPS.find(s => s.key === trackData?.status);
  const isReturned = trackData?.status === 'Returned (Unrepaired)';
  const progressPercent = trackData ? getProgressPercentage(trackData.status) : 0;

  return (
    <div className="w-full flex-1 min-h-screen bg-[#06080e] text-gray-100 flex flex-col font-['Hind_Siliguri',sans-serif] selection:bg-blue-600 selection:text-white antialiased">
      {/* Top Navbar */}
      <header className="w-full border-b border-white/10 bg-[#0b101c] sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25 text-white font-black shrink-0">
              <Tv className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-extrabold text-white tracking-tight leading-tight truncate">
                {trackData?.shop?.name || 'VVSC'}
              </h1>
              <p className="text-[9px] sm:text-xs text-gray-400 truncate">
                {trackData?.shop?.title || 'অনলাইন সার্ভিস ট্র্যাকিং'}
              </p>
            </div>
          </div>

          {trackData?.shop?.phone && (
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`tel:${trackData.shop.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors text-xs font-semibold"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">সহায়তা:</span>
                <span className="font-mono">{trackData.shop.phone}</span>
              </a>
            </div>
          )}
        </div>
      </header>

      {/* Main Container - Optimized Padding for Mobile */}
      <main className="w-full flex-1 max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-7 flex flex-col gap-3.5 sm:gap-6">
        
        {/* 1. BRANDED ANIMATED RELAXING LOADING SCREEN (HELD FOR 1.8-2.0s ON DIRECT LINK) */}
        {loading && !trackData && (
          <div className="w-full flex-1 max-w-xl mx-auto py-10 sm:py-16 px-4 flex flex-col items-center justify-center text-center">
            
            {/* Ambient Breathing Glow */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500/25 rounded-full blur-3xl scale-150 animate-pulse pointer-events-none" />
              <div className="absolute -inset-2.5 rounded-3xl bg-blue-500/20 animate-ping opacity-25" />
              
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 border border-white/20">
                <Tv className="w-8 h-8 sm:w-10 sm:h-10 transition-transform duration-700 animate-pulse" />
              </div>

              <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500 border-2 border-[#06080e] flex items-center justify-center text-white shadow-lg shadow-emerald-500/40">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              </div>
            </div>

            {/* Reassuring Security Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[11px] sm:text-xs font-bold mb-3 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              <span>১০০% এনক্রিপ্টেড ও সুরক্ষিত সংযোগ</span>
            </div>

            {/* Title & Live Micro-Status */}
            <div className="space-y-1 mb-5">
              <h3 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
                আপনার টিভি সার্ভিসের তথ্য প্রস্তুত হচ্ছে
              </h3>
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-blue-300 font-medium h-6">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
                <span className="transition-all duration-300">{loadStepText}</span>
              </div>
            </div>

            {/* Modern Gradient Progress Bar */}
            <div className="w-full max-w-xs mx-auto space-y-1.5 mb-6">
              <div className="w-full h-2 bg-[#121829] border border-white/10 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 transition-all duration-500 ease-out"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono px-0.5">
                <span>ডাটা সিঙ্ক</span>
                <span className="text-blue-400 font-bold">{Math.round(loadProgress)}%</span>
              </div>
            </div>

            {/* Soothing Reassurance Note */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0d1322] border border-white/5 max-w-sm mx-auto space-y-1 text-center shadow-md">
              <p className="text-xs text-gray-300 font-bold flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>আপনার ডিভাইসের প্রতিটি ধাপ স্বচ্ছ ও নির্ভুল</span>
              </p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                রিসিভ থেকে ডেলিভারি পর্যন্ত সমস্ত তথ্য সরাসরি সিস্টেম থেকে লাইভ আপডেট হচ্ছে
              </p>
            </div>

          </div>
        )}

        {/* 2. PRIVACY PROTECTED NOTICE (ONLY WHEN NOT LOADING & NO DATA) */}
        {!trackData && !loading && (
          <section className="w-full bg-[#0d121f] border border-blue-500/20 rounded-2xl sm:rounded-3xl p-5 sm:p-10 text-center shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3 shadow-sm">
                <Lock className="w-3.5 h-3.5" />
                ১০০% এনক্রিপ্টেড সিক্রেট ট্র্যাকিং
              </span>
              
              <h2 className="text-lg sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-2">
                সুরক্ষিত সার্ভিস ট্র্যাকিং পোর্টাল
              </h2>
              
              <p className="text-xs sm:text-sm text-gray-400 max-w-lg mb-5 sm:mb-8 leading-relaxed">
                গ্রাহকের তথ্যের সুরক্ষা ও ব্যক্তিগত গোপনীয়তা রক্ষায় সরাসরি যেকোনো আইডি লিখে অন্যের তথ্য দেখার অপশন বন্ধ রয়েছে। আপনার ইনভয়েস বা মেসেজে পাওয়া <strong className="text-blue-300">সিক্রেট লিংক</strong> ওপেন করুন।
              </p>

              <form onSubmit={handleSearchSubmit} className="w-full max-w-lg flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder="সম্পূর্ণ ট্র্যাকিং লিংক বা সিক্রেট কোড পেস্ট করুন"
                    className="w-full bg-[#161c2d] border border-white/15 rounded-xl pl-10 pr-9 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {rawInput && (
                    <button
                      type="button"
                      onClick={() => setRawInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || !rawInput.trim()}
                  className="px-5 py-2.5 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>যাচাই হচ্ছে…</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>যাচাই করুন</span>
                    </>
                  )}
                </button>
              </form>

              {error && (
                <div className={`mt-4 p-3.5 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 max-w-lg text-left ${
                  isRestricted 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                    : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                }`}>
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">
                      {isRestricted ? '🔒 ব্যক্তিগত তথ্যের নিরাপত্তা সুরক্ষা' : 'ত্রুটি'}
                    </p>
                    <p className="text-gray-300 leading-relaxed text-xs">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-5 border-t border-white/10 w-full text-left text-xs text-gray-400 space-y-1.5">
                <p className="font-bold text-gray-300">💡 কীভাবে আপনার টিভির অবস্থা দেখবেন?</p>
                <ul className="list-disc list-inside space-y-1 text-gray-400 text-xs">
                  <li>শপ থেকে আপনার WhatsApp বা মোবাইলে পাঠানো <strong className="text-blue-300">সিক্রেট লিংকে</strong> ক্লিক করুন।</li>
                  <li>অথবা ক্যাশ মেমো/ইনভয়েসে প্রিন্ট করা পুরো লিংকটি ব্রাউজারে লিখুন।</li>
                </ul>
              </div>

            </div>
          </section>
        )}

        {/* TRACKING DETAILS (LOADED WITH UNMASKED FULL INFORMATION) */}
        {trackData && (
          <div className="w-full space-y-3.5 sm:space-y-6 animate-in fade-in duration-500">
            
            {/* Top Security Verified Bar - Compact on Mobile */}
            <div className="w-full flex items-center justify-between gap-2 px-1 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] sm:text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">ভেরিফাইড সিক্রেট লিংক • সুরক্ষিত</span>
              </span>

              <span className="text-[11px] sm:text-xs text-gray-400 flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-blue-400 shrink-0" />
                <span>লাইভ আপডেট</span>
              </span>
            </div>

            {/* ======================================================== */}
            {/* 1. HERO STATUS & STEPPER CARD                            */}
            {/* ======================================================== */}
            <div className="w-full bg-[#0d121f] border border-blue-500/25 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-lg relative overflow-hidden">
              
              {/* Header: Device Info + Radar Status + Refresh */}
              <div className="flex items-start sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      #{trackData.customId || trackData.id.slice(0, 6).toUpperCase()}
                    </span>
                    <h3 className="text-base sm:text-2xl font-black text-white tracking-tight truncate">
                      {trackData.deviceBrand} {trackData.deviceType}
                    </h3>
                  </div>

                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span>সমস্যা:</span>
                    <span className="text-amber-400 font-bold truncate">
                      {trackData.deviceProblem}
                      {trackData.displayAction ? ` (${trackData.displayAction})` : ''}
                    </span>
                  </p>
                </div>

                {/* Status Pill & Refresh */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border ${
                    isReturned
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                      : trackData.status === 'Delivered'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                  }`}>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <span>{currentStepInfo?.label || trackData.status}</span>
                  </span>

                  <button
                    onClick={() => fetchTrack(currentId, currentKey, true)}
                    disabled={refreshing}
                    title="রিফ্রেশ"
                    className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors border border-white/10 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Rescheduled Delivery Alert Banner */}
              {trackData.isRescheduled && (
                <div className="mt-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs">
                  <CalendarClock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-300">
                      🗓️ ডেলিভারির তারিখ পুনঃনির্ধারিত করা হয়েছে
                    </p>
                    <p className="text-gray-300 mt-0.5">
                      নতুন ডেলিভারি:{' '}
                      <strong className="text-amber-400 font-bold">
                        {trackData.expectedDeliveryDate ? formatDate(trackData.expectedDeliveryDate) : 'অপেক্ষমান'}
                      </strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Progress Summary Strip */}
              <div className="pt-3.5 pb-2">
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
                  <div>
                    <span>অগ্রগতি: </span>
                    <strong className="text-blue-400 font-bold">{Math.round(progressPercent)}%</strong>
                  </div>
                  <span className="text-gray-400 truncate max-w-[200px]">
                    বর্তমান: <strong className="text-white">{currentStepInfo?.label || trackData.status}</strong>
                  </span>
                </div>

                <div className="w-full h-2 bg-[#141a29] border border-white/10 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* DESKTOP VIEW: 5 CONNECTED STEP CARDS (>= 768px) */}
              <div className="hidden md:block pt-5">
                <div className="grid grid-cols-5 gap-3">
                  {STEPS.map((step, idx) => {
                    const state = getStepStatus(step.key, trackData.status);
                    const StepIcon = step.icon;
                    const isActive = state === 'active';
                    const isCompleted = state === 'completed';

                    return (
                      <div
                        key={step.key}
                        className={`relative flex flex-col items-center text-center p-3.5 rounded-2xl border transition-all ${
                          isActive
                            ? 'bg-gradient-to-b from-blue-600/25 via-blue-600/10 to-[#0e1424] border-blue-500/60 shadow-lg ring-2 ring-blue-500/20'
                            : isCompleted
                            ? 'bg-emerald-500/[0.05] border-emerald-500/30 text-emerald-400'
                            : 'bg-white/[0.02] border-white/5 text-gray-500'
                        }`}
                      >
                        <div className="mb-2.5">
                          {isActive ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white">
                              ✦ বর্তমান ধাপ
                            </span>
                          ) : isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <Check className="w-3 h-3 stroke-[3]" /> সম্পন্ন
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-gray-400">
                              ধাপ {idx + 1}
                            </span>
                          )}
                        </div>

                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2.5 ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-md'
                              : isCompleted
                              ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400'
                              : 'bg-[#141a29] border border-white/10 text-gray-400'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-5 h-5 stroke-[2.5]" />
                          ) : (
                            <StepIcon className="w-5 h-5" />
                          )}
                        </div>

                        <h4 className={`text-xs font-extrabold mb-1 ${
                          isActive ? 'text-blue-300' : isCompleted ? 'text-white' : 'text-gray-300'
                        }`}>
                          {step.label}
                        </h4>

                        <p className={`text-[10px] leading-tight ${
                          isActive ? 'text-blue-200/90' : isCompleted ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {step.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MOBILE VIEW: COMPACT HORIZONTAL 5-STEP PIPELINE (< 768px) */}
              <div className="block md:hidden pt-3">
                {/* 5 Compact Horizontal Icons Rail */}
                <div className="relative px-2 mb-3">
                  <div className="absolute top-4 left-6 right-6 h-0.5 bg-white/10 -translate-y-1/2 z-0" />
                  <div 
                    className="absolute top-4 left-6 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-400 -translate-y-1/2 z-0 transition-all duration-500"
                    style={{ width: `calc(${getProgressPercentage(trackData.status)}% * 0.72)` }}
                  />

                  <div className="relative z-10 flex items-center justify-between">
                    {STEPS.map((step) => {
                      const state = getStepStatus(step.key, trackData.status);
                      const StepIcon = step.icon;
                      const isActive = state === 'active';
                      const isCompleted = state === 'completed';

                      return (
                        <div key={step.key} className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs transition-all ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 ring-2 ring-blue-500/30 scale-105'
                                : isCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#151b2c] border border-white/10 text-gray-500'
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : (
                              <StepIcon className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <span className={`text-[9px] font-bold mt-1 text-center max-w-[55px] truncate ${
                            isActive ? 'text-blue-400' : isCompleted ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            {step.shortTitle}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Single Focused Active Step Card */}
                <div className="p-3 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-start gap-2.5 mt-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    {(() => {
                      const CurrentIcon = currentStepInfo?.icon || Tv;
                      return <CurrentIcon className="w-3.5 h-3.5" />;
                    })()}
                  </div>
                  <div className="flex-1 text-xs min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <strong className="text-blue-300 font-bold truncate">{currentStepInfo?.label || trackData.status}</strong>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500 text-white font-black shrink-0">বর্তমান ধাপ</span>
                    </div>
                    <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">
                      {currentStepInfo?.desc}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* ======================================================== */}
            {/* 2. CUSTOMER & DEVICE DETAILS (COMPACT & BALANCED)        */}
            {/* ======================================================== */}
            <div className="w-full bg-[#0d121f] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md">
              <div className="flex items-center gap-2 pb-3 mb-3.5 border-b border-white/10">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-extrabold text-white">
                    গ্রাহক ও ডিভাইসের বিবরণ
                  </h4>
                </div>
              </div>

              {/* 2-Column Responsive Compact Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                
                {/* Customer Name */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5 min-w-0">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-400 shrink-0" />
                    <span>গ্রাহক</span>
                  </span>
                  <p className="text-white font-bold text-xs sm:text-sm truncate">
                    {trackData.customerName}
                  </p>
                </div>

                {/* Customer Phone */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5 min-w-0">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>মোবাইল</span>
                  </span>
                  <p className="text-white font-bold text-xs sm:text-sm font-mono truncate">
                    <a href={`tel:${trackData.customerPhone}`} className="text-emerald-400 hover:underline">
                      {trackData.customerPhone || 'শপ রেকর্ডভুক্ত'}
                    </a>
                  </p>
                </div>

                {/* Customer Address */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5 col-span-2 lg:col-span-1 min-w-0">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>ঠিকানা</span>
                  </span>
                  <p className="text-gray-200 font-medium text-xs sm:text-sm truncate">
                    {trackData.customerAddress || 'শপ রেকর্ডভুক্ত'}
                  </p>
                </div>

                {/* Device Model */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5 min-w-0">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Tv className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span>ডিভাইস মডেল</span>
                  </span>
                  <p className="text-white font-bold text-xs sm:text-sm truncate">
                    {trackData.deviceBrand} {trackData.deviceType}
                  </p>
                </div>

                {/* Intake Date */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5 min-w-0">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>জমা গ্রহণের তারিখ</span>
                  </span>
                  <p className="text-white font-bold text-xs sm:text-sm truncate">
                    {formatDate(trackData.createdAt)}
                  </p>
                </div>

                {/* Delivery Date */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5 min-w-0">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <CalendarClock className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>ডেলিভারি তারিখ</span>
                  </span>
                  <p className={`font-bold text-xs sm:text-sm truncate ${trackData.isRescheduled ? 'text-amber-400' : 'text-white'}`}>
                    {trackData.expectedDeliveryDate ? formatDate(trackData.expectedDeliveryDate) : 'শীঘ্রই'}
                  </p>
                </div>

              </div>

              {/* Serial / Additional Device Details */}
              {(trackData.serialNumber || trackData.deviceDetails) && (
                <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-wrap gap-3 text-[11px] text-gray-400">
                  {trackData.serialNumber && (
                    <div>
                      <span className="text-gray-500">সিরিয়াল: </span>
                      <strong className="text-gray-200 font-mono">{trackData.serialNumber}</strong>
                    </div>
                  )}
                  {trackData.deviceDetails && (
                    <div>
                      <span className="text-gray-500">বিবরণ: </span>
                      <span className="text-gray-300">{trackData.deviceDetails}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ======================================================== */}
            {/* 3. 2-COLUMN DETAILS SPLIT: BILL & WARRANTY               */}
            {/* ======================================================== */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6">
              
              {/* Box 1: Bill & Payment Summary */}
              <div className="w-full bg-[#0d121f] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-white/10">
                    <div className="flex items-center gap-2 text-gray-300">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                        <Coins className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                        বিল ও পেমেন্ট বিবরণ
                      </h4>
                    </div>

                    {!trackData.isBillPending && (
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                        trackData.due > 0 
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' 
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {trackData.due > 0 ? 'বাকি আছে' : 'পরিশোধিত'}
                      </span>
                    )}
                  </div>

                  {trackData.isBillPending ? (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300">
                        <Clock className="w-3.5 h-3.5" />
                        <span>ডায়াগনসিস চলছে</span>
                      </div>
                      <p className="text-gray-300 text-xs">
                        ডিভাইসটি পর্যবেক্ষণ করা হচ্ছে। চূড়ান্ত সমস্যা নিশ্চিত করার পর মোট বিল জানানো হবে।
                      </p>
                      {trackData.advance > 0 && (
                        <div className="pt-2 border-t border-amber-500/20 flex justify-between items-center text-xs">
                          <span className="text-gray-300">জমা দেওয়া অগ্রিম:</span>
                          <strong className="text-amber-300 font-bold">{formatEnglishCurrency(trackData.advance)}</strong>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-xs sm:text-sm">
                      <div className="flex justify-between items-center text-gray-400">
                        <span>মোট সার্ভিস বিল</span>
                        <span className="text-white font-bold text-sm sm:text-base">
                          {formatEnglishCurrency(trackData.totalBill || 0)}
                        </span>
                      </div>
                      {trackData.discount > 0 && (
                        <div className="flex justify-between items-center text-gray-400">
                          <span>ছাড় (Discount)</span>
                          <span className="text-amber-400 font-semibold">
                            - {formatEnglishCurrency(trackData.discount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-gray-400">
                        <span>অগ্রিম পরিশোধ</span>
                        <span className="text-emerald-400 font-semibold">
                          - {formatEnglishCurrency(trackData.advance)}
                        </span>
                      </div>
                      <div className="pt-2.5 border-t border-white/10 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-gray-200 block">প্রদেয় বাকি (Due)</span>
                          <span className="text-[10px] text-gray-500">ডেলিভারির সময় পরিশোধযোগ্য</span>
                        </div>
                        <span className={`font-black text-lg sm:text-xl ${
                          trackData.due > 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {formatEnglishCurrency(trackData.due)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-2.5 border-t border-white/5 text-[11px] text-gray-500 flex items-center justify-between">
                  <span>পেমেন্ট মাধ্যম: ক্যাশ / বিকাশ / নগদ</span>
                  <span className="text-gray-400">রশিদ সংগ্রহ করুন</span>
                </div>
              </div>

              {/* Box 2: Warranty & Replaced Parts */}
              <div className="w-full bg-[#0d121f] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-white/10">
                    <div className="flex items-center gap-2 text-gray-300">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                        সার্ভিস ওয়ারেন্টি
                      </h4>
                    </div>

                    {trackData.warranty?.hasWarranty && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30">
                        {trackData.warranty.warrantyLabel}
                      </span>
                    )}
                  </div>

                  {trackData.warranty?.hasWarranty ? (
                    <div className={`p-3.5 rounded-xl border text-xs ${trackData.warranty.colorClass}`}>
                      <p className="font-bold">{trackData.warranty.displayBadgeText.bn}</p>
                      {trackData.warranty.expiryDateStr && (
                        <p className="text-[11px] mt-1 opacity-90">
                          ওয়ারেন্টি মেয়াদের শেষ তারিখ: <strong>{trackData.warranty.expiryDateStr}</strong>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-gray-400 text-xs leading-relaxed">
                      এই সার্ভিসিং কাজের জন্য কোনো লিখিত ওয়ারেন্টি প্রযোজ্য নয়।
                    </div>
                  )}

                  {/* Replaced Parts */}
                  {trackData.partsUsed && trackData.partsUsed.length > 0 && (
                    <div className="mt-3.5 pt-2.5 border-t border-white/5 space-y-1">
                      <span className="text-[11px] text-gray-400 font-semibold block">
                        প্রতিস্থাপিত যন্ত্রাংশ:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {trackData.partsUsed.map((part, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-medium">
                            {part.name} ({part.quantity} টি)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-2.5 border-t border-white/5 text-[11px] text-gray-500 flex items-center justify-between">
                  <span>ওয়ারেন্টি শর্ত: শপ পলিসি প্রযোজ্য</span>
                  <span className="text-purple-400 font-semibold">অরিজিনাল পার্টস</span>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* 4. SHOP CONTACT & ACTIONS BAR                            */}
            {/* ======================================================== */}
            <div className="w-full bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-[#0d121f] border border-blue-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-lg">
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-base font-extrabold text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>কোনো প্রশ্ন বা জিজ্ঞাসা আছে?</span>
                </h4>
                <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                  সরাসরি শপে ফোন দিন অথবা হোয়াটসঅ্যাপে মেসেজ পাঠিয়ে সরাসরি কথা বলুন।
                </p>
                {trackData.shop?.address && (
                  <p className="text-[11px] text-gray-400 flex items-center gap-1 pt-0.5">
                    <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                    <span>{trackData.shop.address}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {trackData.shop?.phone && (
                  <>
                    <a
                      href={`tel:${trackData.shop.phone}`}
                      className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>কল দিন</span>
                    </a>
                    <a
                      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                        `আসসালামু আলাইকুম, আমি ${trackData.customerName}। আমার সার্ভিস আইডি #${trackData.customId || trackData.id} (${trackData.deviceBrand}) সম্পর্কে জানতে চাচ্ছিলাম।`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md"
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
      <footer className="w-full border-t border-white/10 py-6 text-center text-xs text-gray-500 mt-auto bg-[#06080d]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-1.5">
          <p className="font-bold text-gray-400 text-xs sm:text-sm">
            {trackData?.shop?.name || 'VVSC'} • {trackData?.shop?.title || 'Expert LED TV Servicing Center'}
          </p>
          {trackData?.shop?.address && (
            <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3 text-gray-500" />
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
        <div className="w-full min-h-screen bg-[#06080e] flex flex-col items-center justify-center text-gray-400 gap-3">
          <Loader2 className="w-9 h-9 text-blue-500 animate-spin" aria-hidden="true" />
          <p className="text-xs sm:text-sm font-medium">সুরক্ষিত পোর্টাল লোড হচ্ছে…</p>
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
