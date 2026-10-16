'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  Shield, 
  MapPin, 
  Wifi, 
  CheckCircle2, 
  XCircle, 
  LogIn, 
  LogOut, 
  Loader2, 
  PlusCircle, 
  ShoppingCart, 
  Calendar, 
  AlertCircle, 
  ArrowUpRight, 
  User, 
  Box, 
  History,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { 
  attendanceService, 
  AttendanceRecord, 
  getLocalDateStr, 
  calculateWorkingHours 
} from '@/lib/services/attendance';
import { 
  attendanceSecurityService, 
  AttendanceSecuritySettings 
} from '@/lib/services/attendanceSecurity';
import { shopTransactionService } from '@/lib/services/shopTransaction';
import { Customer } from '@/lib/services/customer';
import { CustomerModal } from '@/components/ui/CustomerModal';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function StaffPortalPage() {
  const { user } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [securitySettings, setSecuritySettings] = useState<AttendanceSecuritySettings | null>(null);

  const todayStr = getLocalDateStr();

  // Load Attendance data for the logged-in staff member
  const loadStaffData = useCallback(async () => {
    if (!user?.email) return;
    try {
      setLoading(true);
      const [todayList, staffHistory, secSettings] = await Promise.all([
        attendanceService.getByDate(todayStr),
        attendanceService.getStaffHistory(user.email),
        attendanceSecurityService.getSettings()
      ]);

      const emailLower = user.email.toLowerCase();
      const foundToday = todayList.find(r => r.userId.toLowerCase() === emailLower);
      setTodayRecord(foundToday || null);
      setHistory(staffHistory);
      setSecuritySettings(secSettings);
    } catch (err) {
      console.error('Error loading staff portal data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.email, todayStr]);

  useEffect(() => {
    loadStaffData();
  }, [loadStaffData]);

  // Handle Check-In with GPS & Wi-Fi Verification
  const handleCheckIn = async () => {
    if (!user?.email || !user?.name) {
      toast.error('লগইন তথ্য পাওয়া যায়নি। অনুগ্রহ করে আবার লগইন করুন।');
      return;
    }

    try {
      setCheckingIn(true);
      toast.loading('হাজিরা অবস্থান ও Wi-Fi নেটওয়ার্ক যাচাই করা হচ্ছে...', { id: 'staff-checkin' });

      const verification = await attendanceSecurityService.verifyAttendanceAccess(user.role);

      if (!verification.allowed) {
        toast.error(verification.error || 'আপনি দোকানের বাইরে আছেন অথবা অনুমোদিত Wi-Fi-তে কানেক্ট নেই।', {
          id: 'staff-checkin',
          duration: 6500
        });
        return;
      }

      toast.dismiss('staff-checkin');

      const rec = await attendanceService.checkIn(
        {
          email: user.email,
          name: user.name,
          role: user.role || 'Technician'
        },
        '',
        {
          verifiedBy: verification.verifiedBy,
          distanceMeters: verification.distanceMeters,
          clientIp: verification.clientIp
        }
      );

      toast.success(`অভিনন্দন! আপনার উপস্থিতি (Check-In) সম্পন্ন হয়েছে (${rec.checkInTime})`, {
        icon: '🎉',
        duration: 5000
      });

      await loadStaffData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'চেক-ইন ব্যর্থ হয়েছে।');
    } finally {
      setCheckingIn(false);
    }
  };

  // Handle Check-Out with GPS & Wi-Fi Verification
  const handleCheckOut = async () => {
    if (!user?.email) return;

    try {
      setCheckingOut(true);
      toast.loading('প্রস্থান অবস্থান ও Wi-Fi যাচাই করা হচ্ছে...', { id: 'staff-checkout' });

      const verification = await attendanceSecurityService.verifyAttendanceAccess(user.role);

      if (!verification.allowed) {
        toast.error(verification.error || 'দোকানে উপস্থিত থেকে প্রস্থান (Check-Out) সম্পন্ন করুন।', {
          id: 'staff-checkout',
          duration: 6500
        });
        return;
      }

      toast.dismiss('staff-checkout');

      await attendanceService.checkOut(user.email);
      toast.success('আজকের প্রস্থান (Check-Out) সফলভাবে সম্পন্ন হয়েছে। শুভ বিদায়!', {
        icon: '👋',
        duration: 5000
      });

      await loadStaffData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'চেক-আউট ব্যর্থ হয়েছে।');
    } finally {
      setCheckingOut(false);
    }
  };

  // Handle saving customer / order directly from this page
  const handleSaveOrder = async (data: Omit<Customer, 'id' | 'createdAt' | 'points'>) => {
    if (!user) return;
    try {
      await shopTransactionService.createCustomer(data, user.name || user.email || 'Unknown');
      toast.success('নতুন কাস্টমার ও মেরামত অর্ডার সফলভাবে সংরক্ষণ করা হয়েছে!', { duration: 4000 });
      setIsAddOrderOpen(false);
    } catch (e: any) {
      console.error('Failed to create customer from staff portal:', e);
      toast.error(e.message || 'অর্ডার যোগ করতে সমস্যা হয়েছে');
    }
  };

  const isOwnerOrManager = user?.role === 'Owner' || user?.role === 'Manager';

  return (
    <div className="max-w-6xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-blue-900/40 via-card to-indigo-950/30 border border-blue-500/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg shadow-blue-500/30 shrink-0">
              {user?.avatar?.startsWith('http') ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                user?.name?.charAt(0) || 'S'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight">
                  {user?.name || 'স্টাফ পোর্টাল'}
                </h1>
                <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full">
                  {user?.role === 'Technician' ? 'টেকনিশিয়ান (Staff)' : user?.role || 'Staff'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5 flex items-center gap-2">
                <span>আজকের তারিখ:</span>
                <strong className="text-gray-200 font-medium">
                  {new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setIsAddOrderOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold h-10 px-4 rounded-xl text-xs sm:text-sm shadow-md shadow-blue-500/20 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ নতুন অর্ডার / কাজ</span>
            </Button>

            {isOwnerOrManager && (
              <Link href="/settings?tab=staff">
                <Button
                  variant="outline"
                  className="hidden sm:flex items-center gap-1.5 border-gray-800 bg-secondary hover:bg-gray-800 text-gray-300 text-xs sm:text-sm h-10 rounded-xl"
                  title="কর্মী ব্যবস্থাপনা ও বেতন হিসাব"
                >
                  <span>অ্যাডমিন ভিউ</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Attendance Card (GPS & Wi-Fi Protection) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-gray-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
          {/* Status Details */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">দৈনিক উপস্থিতি (Attendance)</h2>
                <p className="text-xs text-gray-400">GPS অবস্থান ও দোকানের Wi-Fi দ্বারা সুরক্ষিত</p>
              </div>
            </div>

            {/* Current State Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Check-In Time */}
              <div className="bg-secondary/70 border border-gray-800/80 rounded-xl p-3">
                <span className="text-[11px] text-gray-400 block font-medium">চেক-ইন (প্রবেশ)</span>
                <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono mt-0.5 block">
                  {todayRecord?.checkInTime || 'এখনো হয়নি'}
                </span>
              </div>

              {/* Check-Out Time */}
              <div className="bg-secondary/70 border border-gray-800/80 rounded-xl p-3">
                <span className="text-[11px] text-gray-400 block font-medium">চেক-আউট (প্রস্থান)</span>
                <span className="text-sm sm:text-base font-bold text-amber-400 font-mono mt-0.5 block">
                  {todayRecord?.checkOutTime || 'চলমান'}
                </span>
              </div>

              {/* Working Hours */}
              <div className="bg-secondary/70 border border-gray-800/80 rounded-xl p-3">
                <span className="text-[11px] text-gray-400 block font-medium">মোট কর্মঘণ্টা</span>
                <span className="text-sm sm:text-base font-bold text-blue-400 font-mono mt-0.5 block">
                  {todayRecord?.workingHours || (todayRecord?.checkInTime ? 'ডিউটি চলছে' : '--')}
                </span>
              </div>

              {/* Security Verification */}
              <div className="bg-secondary/70 border border-gray-800/80 rounded-xl p-3">
                <span className="text-[11px] text-gray-400 block font-medium">ভেরিফিকেশন</span>
                <span className="text-xs sm:text-sm font-semibold text-gray-300 mt-0.5 flex items-center gap-1 truncate">
                  {todayRecord?.verifiedBy ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{todayRecord.verifiedBy}</span>
                    </>
                  ) : (
                    <span className="text-gray-500">অপেক্ষমাণ</span>
                  )}
                </span>
              </div>
            </div>

            {/* Security Notice Pill */}
            {securitySettings?.enabled && (
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-secondary/50 border border-gray-800/60 rounded-xl px-3 py-2">
                <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  হাজিরা দিতে হলে <strong>দোকানের অনুমোদিত Wi-Fi</strong> নেটওয়ার্কে কানেক্টেড থাকতে হবে অথবা <strong>দোকানের ৫০ মিটারের মধ্যে</strong> অবস্থান করতে হবে।
                </span>
              </div>
            )}
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col justify-center gap-3 shrink-0 md:min-w-[220px]">
            {loading ? (
              <div className="flex items-center justify-center p-6 text-gray-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-xs">লোড হচ্ছে...</span>
              </div>
            ) : !todayRecord?.checkInTime ? (
              <Button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-12 px-6 rounded-xl text-sm sm:text-base shadow-xl shadow-emerald-950/40 active:scale-95 transition-all"
              >
                {checkingIn ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>যাচাই করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Check In (হাজিরা দিন)</span>
                  </>
                )}
              </Button>
            ) : !todayRecord?.checkOutTime ? (
              <div className="space-y-2">
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>উপস্থিত: {todayRecord.checkInTime}</span>
                </div>
                <Button
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold h-12 px-6 rounded-xl text-sm sm:text-base shadow-xl shadow-amber-950/40 active:scale-95 transition-all"
                >
                  {checkingOut ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>যাচাই করা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-5 h-5" />
                      <span>Check Out (প্রস্থান করুন)</span>
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-4 text-center space-y-1">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-sm">আজকের ডিউটি সম্পন্ন</h4>
                <p className="text-xs text-gray-400">কাজের সময়: {todayRecord.workingHours}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Add Order Quick Card */}
        <div 
          onClick={() => setIsAddOrderOpen(true)}
          className="bg-card hover:bg-secondary/70 border border-gray-800 hover:border-blue-500/40 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all shadow-md group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-blue-400 group-hover:translate-x-0.5 transition-transform">শুরু করুন →</span>
          </div>
          <h3 className="font-bold text-white text-sm sm:text-base">নতুন অর্ডার / কাস্টমার</h3>
          <p className="text-xs text-gray-400 mt-1">দোকানে নতুন টিভি মেরামত অর্ডার ও বিল গ্রহণ করুন।</p>
        </div>

        {/* View Orders Card */}
        <Link href="/customers" className="block">
          <div className="bg-card hover:bg-secondary/70 border border-gray-800 hover:border-blue-500/40 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all shadow-md group h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-105 transition-transform">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-purple-400 group-hover:translate-x-0.5 transition-transform">দেখুন →</span>
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base">অর্ডার ও কাস্টমার তালিকা</h3>
            <p className="text-xs text-gray-400 mt-1">সব চলমান কাজ, পেন্ডিং ডেলিভারি ও স্ট্যাটাস ট্র্যাক করুন।</p>
          </div>
        </Link>

        {/* Check Inventory Stock */}
        <Link href="/inventory" className="block">
          <div className="bg-card hover:bg-secondary/70 border border-gray-800 hover:border-blue-500/40 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all shadow-md group h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
                <Box className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-emerald-400 group-hover:translate-x-0.5 transition-transform">স্টক দেখুন →</span>
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base">পার্টস ও যন্ত্রাংশ স্টক</h3>
            <p className="text-xs text-gray-400 mt-1">টিভি মেরামতের প্রয়োজনীয় মাদারবোর্ড, ব্যাকলাইট স্টক খুঁজুন।</p>
          </div>
        </Link>
      </div>

      {/* Staff Personal Attendance History */}
      <div className="bg-card border border-gray-800 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-800/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-sm sm:text-base">আমার হাজিরার ইতিহাস (Recent Attendance)</h3>
          </div>
          <span className="text-xs text-gray-400">সর্বশেষ {history.length} দিনের রেকর্ড</span>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs sm:text-sm">
            এখনো কোনো হাজিরার রেকর্ড সংরক্ষিত হয়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
              <thead className="bg-secondary/60 text-gray-400 uppercase tracking-wider text-[11px] border-b border-gray-800">
                <tr>
                  <th className="px-4 sm:px-6 py-3 font-semibold">তারিখ</th>
                  <th className="px-4 sm:px-6 py-3 font-semibold">প্রবেশ (Check-In)</th>
                  <th className="px-4 sm:px-6 py-3 font-semibold">প্রস্থান (Check-Out)</th>
                  <th className="px-4 sm:px-6 py-3 font-semibold">কাজের সময়</th>
                  <th className="px-4 sm:px-6 py-3 font-semibold">স্ট্যাটাস</th>
                  <th className="px-4 sm:px-6 py-3 font-semibold">ভেরিফিকেশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {history.map((rec) => (
                  <tr key={rec.id || rec.date} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 sm:px-6 py-3.5 font-medium text-gray-200">
                      {rec.date}
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 font-mono text-emerald-400 font-semibold">
                      {rec.checkInTime}
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 font-mono text-amber-400">
                      {rec.checkOutTime || '--'}
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-blue-300 font-mono">
                      {rec.workingHours || '--'}
                    </td>
                    <td className="px-4 sm:px-6 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        rec.status === 'Present' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : rec.status === 'Late' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-gray-800 text-gray-400'
                      }`}>
                        {rec.status === 'Present' ? 'উপস্থিত' : rec.status === 'Late' ? 'দেরিতে' : rec.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-xs text-gray-400">
                      {rec.verifiedBy || 'GPS + Wi-Fi'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer / Order Modal */}
      <CustomerModal
        isOpen={isAddOrderOpen}
        onClose={() => setIsAddOrderOpen(false)}
        onSave={handleSaveOrder}
      />
    </div>
  );
}
