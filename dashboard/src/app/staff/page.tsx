'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clock, 
  MapPin, 
  Wifi, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  History, 
  LogIn, 
  LogOut, 
  User, 
  Briefcase, 
  Sparkles, 
  ChevronRight, 
  RefreshCw,
  Award,
  Check,
  Building2,
  Wrench,
  Boxes
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { 
  attendanceService, 
  AttendanceRecord, 
  getLocalDateStr, 
  getLocalTimeStr,
  calculateWorkingHours
} from '@/lib/services/attendance';
import { 
  attendanceSecurityService, 
  getCurrentGpsLocation, 
  getCurrentClientIp, 
  calculateDistanceMeters,
  AttendanceSecuritySettings,
  defaultAttendanceSecuritySettings
} from '@/lib/services/attendanceSecurity';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function StaffAttendancePage() {
  const router = useRouter();
  const { user } = useAppStore();

  // If user is Owner or Manager, redirect to Settings > Staff
  useEffect(() => {
    if (user && user.role !== 'Technician') {
      router.replace('/settings?tab=staff');
    }
  }, [user, router]);

  // Current Live Time & Date
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setCurrentDateFormatted(now.toLocaleDateString('bn-BD', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Attendance Records State
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [noteInput, setNoteInput] = useState('');

  // Live Security Diagnostics State
  const [securitySettings, setSecuritySettings] = useState<AttendanceSecuritySettings | null>(null);
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(false);
  const [liveSecurityStatus, setLiveSecurityStatus] = useState<{
    distanceMeters?: number;
    gpsOk: boolean;
    wifiOk: boolean;
    clientIp?: string;
    checked: boolean;
    error?: string;
  }>({
    gpsOk: false,
    wifiOk: false,
    checked: false
  });

  // Elapsed Time Counter for checked-in status
  const [elapsedWorkingTime, setElapsedWorkingTime] = useState<string>('');

  // Load Today's Attendance & History
  const loadAttendanceData = async () => {
    if (!user?.email) return;
    try {
      setLoading(true);
      const userEmail = user.email.toLowerCase();
      const today = getLocalDateStr();
      const [todayList, historyList, secSettings] = await Promise.all([
        attendanceService.getByDate(today),
        attendanceService.getStaffHistory(user.email),
        attendanceSecurityService.getSettings()
      ]);

      setSecuritySettings(secSettings);
      const myToday = todayList.find(r => r.userId.toLowerCase() === userEmail);
      setTodayRecord(myToday || null);
      setHistoryRecords(historyList);
    } catch (e) {
      console.error('Error loading staff attendance:', e);
      toast.error('হাজিরার তথ্য লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      loadAttendanceData();
    }
  }, [user?.email]);

  // Fast background check of GPS and Wi-Fi security
  const checkLiveSecurity = async (silent = true) => {
    if (!user) return;
    try {
      setIsCheckingSecurity(true);
      const settings = securitySettings || await attendanceSecurityService.getSettings();
      let gpsOk = false;
      let wifiOk = false;
      let distanceMeters: number | undefined;
      let clientIp: string | undefined;
      let errorMsg: string | undefined;

      // Check Wi-Fi
      if (settings.enabled && settings.wifiEnabled) {
        try {
          clientIp = await getCurrentClientIp();
          const matched = settings.allowedIpAddresses.some(ip => {
            const cleanAllowed = ip.trim();
            const cleanClient = (clientIp || '').trim();
            if (cleanAllowed === cleanClient) return true;
            if (cleanAllowed.endsWith('*')) {
              return cleanClient.startsWith(cleanAllowed.slice(0, -1));
            }
            return false;
          });
          wifiOk = matched;
        } catch {
          wifiOk = false;
        }
      } else {
        wifiOk = true;
      }

      // Check GPS
      if (settings.enabled && settings.gpsEnabled && settings.shopLatitude && settings.shopLongitude) {
        try {
          const loc = await getCurrentGpsLocation();
          distanceMeters = calculateDistanceMeters(
            loc.latitude,
            loc.longitude,
            settings.shopLatitude,
            settings.shopLongitude
          );
          gpsOk = distanceMeters <= (settings.radiusMeters || 50);
        } catch (e: any) {
          gpsOk = false;
          errorMsg = e.message;
        }
      } else {
        gpsOk = true;
      }

      setLiveSecurityStatus({
        gpsOk,
        wifiOk,
        distanceMeters,
        clientIp,
        checked: true,
        error: errorMsg
      });

      if (!silent) {
        toast.success('লোকেশন ও নেটওয়ার্ক স্ট্যাটাস আপডেট হয়েছে');
      }
    } catch (e) {
      console.error('Security check error:', e);
    } finally {
      setIsCheckingSecurity(false);
    }
  };

  useEffect(() => {
    if (securitySettings) {
      checkLiveSecurity(true);
    }
  }, [securitySettings]);

  // Update live elapsed time while checked in
  useEffect(() => {
    if (!todayRecord || !todayRecord.checkInTime || todayRecord.checkOutTime) {
      setElapsedWorkingTime('');
      return;
    }

    const calculateElapsed = () => {
      const now = new Date();
      const timeStr = getLocalTimeStr(now);
      const hoursStr = calculateWorkingHours(todayRecord.checkInTime, timeStr);
      setElapsedWorkingTime(hoursStr);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [todayRecord]);

  // Check In Handler with GPS & Wi-Fi Lock Verification
  const handleCheckIn = async () => {
    if (!user?.email || !user?.name) {
      toast.error('ইউজার সেশন পাওয়া যায়নি। পুনরায় লগইন করুন।');
      return;
    }

    try {
      setActionLoading(true);

      // Verify Attendance Access strictly for staff
      const verification = await attendanceSecurityService.verifyAttendanceAccess('Technician', false);
      
      if (!verification.allowed) {
        toast.error(verification.error || 'হাজিরা লক সক্রিয়: আপনি দোকানের বাইরে আছেন।', { duration: 6000 });
        // Refresh security status display
        checkLiveSecurity(true);
        return;
      }

      // Check in via attendance service
      const newRecord = await attendanceService.checkIn(
        {
          email: user.email,
          name: user.name,
          role: user.role || 'Technician'
        },
        noteInput.trim(),
        {
          verifiedBy: verification.verifiedBy,
          distanceMeters: verification.distanceMeters,
          clientIp: verification.clientIp
        }
      );

      setTodayRecord(newRecord);
      setNoteInput('');
      toast.success('🎉 শুভ সকাল! আজকের হাজিরা সফলভাবে গ্রহণ করা হয়েছে।', { duration: 5000 });
      
      // Reload history
      const historyList = await attendanceService.getStaffHistory(user.email);
      setHistoryRecords(historyList);
    } catch (err: any) {
      console.error('Check in failed:', err);
      toast.error(err.message || 'হাজিরা গ্রহণে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setActionLoading(false);
    }
  };

  // Check Out Handler
  const handleCheckOut = async () => {
    if (!user?.email) return;

    const confirmed = window.confirm('আপনি কি নিশ্চিত যে আজকের মতো কাজ সমাপ্ত করে চেক-আউট (প্রস্থান) করতে চান?');
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await attendanceService.checkOut(user.email, noteInput.trim() || undefined);
      toast.success('👋 আজকের মতো কাজ সফলভাবে সমাপ্ত হয়েছে। শুভ বিদায়!', { duration: 5000 });
      
      // Reload data
      await loadAttendanceData();
      setNoteInput('');
    } catch (err: any) {
      console.error('Check out failed:', err);
      toast.error(err.message || 'চেক-আউটে সমস্যা হয়েছে।');
    } finally {
      setActionLoading(false);
    }
  };

  // Monthly Statistics
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthRecords = historyRecords.filter(r => r.date.startsWith(currentYearMonth));

    const totalDays = thisMonthRecords.length;
    const presentDays = thisMonthRecords.filter(r => r.status === 'Present').length;
    const lateDays = thisMonthRecords.filter(r => r.status === 'Late').length;

    let totalMinutes = 0;
    thisMonthRecords.forEach(r => {
      if (r.workingHours && r.workingHours.includes('h')) {
        const parts = r.workingHours.split(' ');
        const h = parseInt(parts[0].replace('h', '')) || 0;
        const m = parseInt(parts[1]?.replace('m', '') || '0') || 0;
        totalMinutes += (h * 60) + m;
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const totalRemainingMinutes = totalMinutes % 60;

    return {
      totalDays,
      presentDays,
      lateDays,
      totalWorkingHours: `${totalHours} ঘণ্টা ${totalRemainingMinutes} মি`
    };
  }, [historyRecords]);

  if (user && user.role !== 'Technician') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm">সেটিংস কর্মী ব্যবস্থাপনায় রিডাইরেক্ট করা হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* 1. Header Greeting & Live Clock Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#121624] via-[#101420] to-[#0c0e17] p-5 sm:p-7 rounded-2xl border border-gray-800/80 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs font-semibold text-blue-400">
              <Briefcase className="w-3.5 h-3.5" />
              <span>স্টাফ হাজিরা ও ওয়ার্কস্পেস</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              আসসালামু আলাইকুম, <span className="text-blue-400">{user?.name || 'টেকনিশিয়ান'}</span>! 👋
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
              <span>{currentDateFormatted || 'আজকের দিন'}</span>
            </p>
          </div>

          {/* Live Digital Clock Badge */}
          <div className="bg-[#181d2e]/90 border border-gray-700/60 px-5 py-3 rounded-xl shadow-inner flex flex-col items-end shrink-0 self-stretch sm:self-auto">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              বর্তমান সময়
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-wider mt-0.5">
              {currentTime || '--:--:--'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Today's Main Attendance Action Card */}
      <div className="bg-[#131724] border border-gray-800 rounded-2xl p-5 sm:p-7 shadow-lg relative overflow-hidden">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm">আজকের হাজিরার তথ্য যাচাই করা হচ্ছে...</p>
          </div>
        ) : !todayRecord ? (
          /* STATE A: NOT CHECKED IN YET */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs font-semibold mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  হাজিরা বাকি আছে
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white">আজকের কর্মদিবস শুরু করুন</h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                  দোকানে প্রবেশ করার পর নিচে "হাজিরা দিন" বাটনে ক্লিক করে চেক-ইন সম্পন্ন করুন।
                </p>
              </div>

              {/* Quick Security Check Badges */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => checkLiveSecurity(false)}
                  disabled={isCheckingSecurity}
                  className="h-8 text-xs border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isCheckingSecurity ? 'animate-spin' : ''}`} />
                  নেটওয়ার্ক রিফ্রেশ
                </Button>
              </div>
            </div>

            {/* Live Security Readiness Indicator */}
            {securitySettings?.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#0e111a] rounded-xl border border-gray-800/70 text-xs">
                {/* GPS Status */}
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${liveSecurityStatus.gpsOk ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-200">
                      {liveSecurityStatus.gpsOk ? 'দোকানের সীমানার ভেতরে আছেন' : 'দোকানের সীমানা যাচাই'}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {liveSecurityStatus.distanceMeters !== undefined 
                        ? `দূরত্ব: প্রায় ${liveSecurityStatus.distanceMeters} মিটার` 
                        : (securitySettings.gpsEnabled ? 'GPS অবস্থান স্ক্যান হচ্ছে' : 'GPS লক বন্ধ')}
                    </div>
                  </div>
                </div>

                {/* Wi-Fi Status */}
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${liveSecurityStatus.wifiOk ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-200">
                      {liveSecurityStatus.wifiOk ? 'দোকানের Wi-Fi নেটওয়ার্ক সংযুক্ত' : 'দোকানের Wi-Fi লক'}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {liveSecurityStatus.clientIp 
                        ? `আইপি: ${liveSecurityStatus.clientIp}` 
                        : (securitySettings.shopWifiSsid ? `Wi-Fi: ${securitySettings.shopWifiSsid}` : 'Wi-Fi চেক হচ্ছে')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Note Input (Optional) */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                কাজের নোট বা মন্তব্য (ঐচ্ছিক):
              </label>
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="যেমন: সকালের শিফট / বিশেষ কাজের বিবরণ..."
                className="w-full bg-[#181d2e] border border-gray-700/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Big Action Check-in Button */}
            <Button
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="w-full h-12 sm:h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base sm:text-lg rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2.5"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>যাচাই ও হাজিরা গ্রহণ করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>আজকের হাজিরা দিন (Check In)</span>
                </>
              )}
            </Button>
          </div>
        ) : !todayRecord.checkOutTime ? (
          /* STATE B: CHECKED IN, STILL WORKING (ON DUTY) */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    কর্মস্থলে উপস্থিত আছেন
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {todayRecord.status === 'Late' ? 'দেরিতে উপস্থিতি (Late)' : 'উপস্থিত (Present)'}
                  </h2>
                </div>
              </div>

              {/* Check-In Summary Info */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                <div className="bg-[#181d2e] px-3.5 py-2 rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">প্রবেশ সময়</div>
                  <div className="text-sm font-bold text-white font-mono">{todayRecord.checkInTime}</div>
                </div>
                {elapsedWorkingTime && (
                  <div className="bg-blue-500/10 border border-blue-500/20 px-3.5 py-2 rounded-xl">
                    <div className="text-[10px] text-blue-400 uppercase font-semibold">চলমান কাজের সময়</div>
                    <div className="text-sm font-bold text-blue-300 font-mono">{elapsedWorkingTime}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Attendance Metadata Badge */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1 bg-[#181d2e] px-2.5 py-1 rounded-lg border border-gray-800 text-gray-300">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                ভেরিফিকেশন: {todayRecord.verifiedBy || 'GPS + Wi-Fi'}
              </span>
              {todayRecord.distanceMeters !== undefined && (
                <span className="inline-flex items-center gap-1 bg-[#181d2e] px-2.5 py-1 rounded-lg border border-gray-800 text-gray-300">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  দূরত্ব: {todayRecord.distanceMeters} মিটার
                </span>
              )}
              {todayRecord.note && (
                <span className="italic text-gray-400">"{todayRecord.note}"</span>
              )}
            </div>

            {/* Note Input for Checkout (Optional) */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                প্রস্থানের নোট বা সারাংশ (ঐচ্ছিক):
              </label>
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="যেমন: আজকের সকল কাজ শেষ করেছি..."
                className="w-full bg-[#181d2e] border border-gray-700/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-gray-200 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            {/* Check-Out Button */}
            <Button
              onClick={handleCheckOut}
              disabled={actionLoading}
              variant="destructive"
              className="w-full h-12 sm:h-14 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-base sm:text-lg rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2.5"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>চেক-আউট করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-5 h-5" />
                  <span>কাজ সমাপ্ত ও প্রস্থান (Check Out)</span>
                </>
              )}
            </Button>
          </div>
        ) : (
          /* STATE C: CHECKED OUT (DAY COMPLETED) */
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-xs font-bold mb-1">
                    <Check className="w-3.5 h-3.5" />
                    আজকের কাজ সমাপ্ত
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-white">আজকের কর্মদিবস সফলভাবে সম্পন্ন হয়েছে</h2>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#181d2e] p-3 rounded-xl border border-gray-800/80">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">প্রবেশ সময়</div>
                <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5">{todayRecord.checkInTime}</div>
              </div>
              <div className="bg-[#181d2e] p-3 rounded-xl border border-gray-800/80">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">প্রস্থান সময়</div>
                <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5">{todayRecord.checkOutTime}</div>
              </div>
              <div className="bg-[#181d2e] p-3 rounded-xl border border-gray-800/80">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">মোট কর্মঘণ্টা</div>
                <div className="text-sm sm:text-base font-bold text-emerald-400 font-mono mt-0.5">{todayRecord.workingHours || 'N/A'}</div>
              </div>
              <div className="bg-[#181d2e] p-3 rounded-xl border border-gray-800/80">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">চূড়ান্ত স্ট্যাটাস</div>
                <div className="text-sm sm:text-base font-bold text-blue-400 mt-0.5">{todayRecord.status}</div>
              </div>
            </div>

            <p className="text-xs text-gray-400 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
              ✅ আপনি আজকের হাজিরা ও প্রস্থান সফলভাবে সম্পন্ন করেছেন। ধন্যবাদ!
            </p>
          </div>
        )}
      </div>

      {/* 3. Monthly Attendance Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#131724] border border-gray-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-xs text-gray-400 font-medium">চলতি মাসে উপস্থিত</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
            {monthlyStats.presentDays} <span className="text-xs font-normal text-gray-400">দিন</span>
          </div>
        </div>

        <div className="bg-[#131724] border border-gray-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-xs text-gray-400 font-medium">দেরিতে আসা (Late)</div>
          <div className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">
            {monthlyStats.lateDays} <span className="text-xs font-normal text-gray-400">দিন</span>
          </div>
        </div>

        <div className="bg-[#131724] border border-gray-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-xs text-gray-400 font-medium">মোট কর্মদিবস</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-400 mt-1">
            {monthlyStats.totalDays} <span className="text-xs font-normal text-gray-400">দিন</span>
          </div>
        </div>

        <div className="bg-[#131724] border border-gray-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-xs text-gray-400 font-medium">মোট কাজের সময়</div>
          <div className="text-base sm:text-lg font-bold text-purple-400 mt-1 font-mono truncate">
            {monthlyStats.totalWorkingHours}
          </div>
        </div>
      </div>

      {/* 4. Quick Shortcuts for Technician Work */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Link 
          href="/customers" 
          className="group flex items-center justify-between p-4 bg-[#131724] hover:bg-[#181d2e] border border-gray-800 hover:border-blue-500/40 rounded-xl transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-white text-sm">কাস্টমার কাজ তালিকা</div>
              <div className="text-xs text-gray-400">টিভি সার্ভিসিং ও জবশিট ম্যানেজ করুন</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors" />
        </Link>

        <Link 
          href="/inventory" 
          className="group flex items-center justify-between p-4 bg-[#131724] hover:bg-[#181d2e] border border-gray-800 hover:border-emerald-500/40 rounded-xl transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-white text-sm">পার্টস ও স্টক ইনভেন্টরি</div>
              <div className="text-xs text-gray-400">প্রয়োজনীয় পার্টস ও মূল্য তালিকা দেখুন</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
        </Link>
      </div>

      {/* 5. Recent Attendance Log History */}
      <div className="bg-[#131724] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-white text-sm sm:text-base">আমার সাম্প্রতিক হাজিরার ইতিহাস</h3>
          </div>
          <span className="text-xs text-gray-400">সর্বশেষ {historyRecords.length} টি রেকর্ড</span>
        </div>

        {historyRecords.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs sm:text-sm">
            এখনও কোনো পূর্ববর্তী হাজিরার রেকর্ড নেই।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-800/80 bg-[#161a29]/60 text-gray-400 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">তারিখ</th>
                  <th className="py-3 px-4">প্রবেশ (In)</th>
                  <th className="py-3 px-4">প্রস্থান (Out)</th>
                  <th className="py-3 px-4">মোট সময়</th>
                  <th className="py-3 px-4">স্ট্যাটাস</th>
                  <th className="py-3 px-4">ভেরিফিকেশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {historyRecords.slice(0, 15).map((rec) => (
                  <tr key={rec.id || rec.date} className="hover:bg-[#181d2e]/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-200 whitespace-nowrap">
                      {rec.date}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-300 whitespace-nowrap">
                      {rec.checkInTime || '--'}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-300 whitespace-nowrap">
                      {rec.checkOutTime || '--'}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-medium whitespace-nowrap">
                      {rec.workingHours || '--'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rec.status === 'Present' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : rec.status === 'Late'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-gray-800 text-gray-400'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                      {rec.verifiedBy || 'ম্যানুয়াল'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
