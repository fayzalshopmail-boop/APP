'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  Loader2, 
  AlertTriangle, 
  Calendar, 
  History, 
  LogIn, 
  LogOut, 
  Award, 
  Check, 
  Timer,
  Store,
  Mail,
  User
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { auth } from '@/lib/firebase';
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
  AttendanceSecuritySettings
} from '@/lib/services/attendanceSecurity';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function StaffAttendancePage() {
  const router = useRouter();
  const { user, shop, setUser, setUnlocked } = useAppStore();

  // If user is Owner or Manager, redirect to Settings > Staff
  useEffect(() => {
    if (user && user.role !== 'Technician') {
      router.replace('/settings?tab=staff');
    }
  }, [user, router]);

  // Current Date Formatted in Bengali
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    setCurrentDateFormatted(
      now.toLocaleDateString('bn-BD', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
    );
  }, []);

  // Attendance Records State
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  // Live Security Diagnostics State
  const [securitySettings, setSecuritySettings] = useState<AttendanceSecuritySettings | null>(null);
  const [liveSecurityStatus, setLiveSecurityStatus] = useState<{
    distanceMeters?: number;
    gpsOk: boolean;
    wifiOk: boolean;
    clientIp?: string;
    checked: boolean;
  }>({
    gpsOk: false,
    wifiOk: false,
    checked: false
  });

  // Elapsed Time Counter for checked-in status
  const [elapsedWorkingTime, setElapsedWorkingTime] = useState<string>('');

  // Helper formatters
  const formatBanglaHours = (hoursStr?: string) => {
    if (!hoursStr || hoursStr === 'N/A' || hoursStr === '--') return '--';
    return hoursStr
      .replace('h', ' ঘণ্টা')
      .replace('m', ' মিনিট');
  };

  const formatBanglaDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        weekday: 'short'
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Present':
        return { 
          label: 'উপস্থিত', 
          color: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
        };
      case 'Late':
        return { 
          label: 'দেরিতে উপস্থিতি', 
          color: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
        };
      case 'Half Day':
        return { 
          label: 'হাফ ডে', 
          color: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' 
        };
      case 'Leave':
        return { 
          label: 'ছুটি', 
          color: 'bg-purple-500/15 text-purple-400 border border-purple-500/30' 
        };
      case 'Absent':
        return { 
          label: 'অনুপস্থিত', 
          color: 'bg-rose-500/15 text-rose-400 border border-rose-500/30' 
        };
      default:
        return { 
          label: status, 
          color: 'bg-gray-800 text-gray-300 border border-gray-700' 
        };
    }
  };

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
  const checkLiveSecurity = async () => {
    if (!user) return;
    try {
      const settings = securitySettings || await attendanceSecurityService.getSettings();
      let gpsOk = false;
      let wifiOk = false;
      let distanceMeters: number | undefined;
      let clientIp: string | undefined;

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
        } catch {
          gpsOk = false;
        }
      } else {
        gpsOk = true;
      }

      setLiveSecurityStatus({
        gpsOk,
        wifiOk,
        distanceMeters,
        clientIp,
        checked: true
      });
    } catch (e) {
      console.error('Security check error:', e);
    }
  };

  useEffect(() => {
    if (securitySettings) {
      checkLiveSecurity();
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
      setElapsedWorkingTime(formatBanglaHours(hoursStr));
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
        checkLiveSecurity();
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
      setShowNoteInput(false);
      toast.success('🎉 শুভ সকাল! আজকের হাজিরা গ্রহণ করা হয়েছে।', { duration: 4000 });
      
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

    const confirmed = window.confirm('আপনি কি আজকের মতো কাজ শেষ করে প্রস্থান (Check Out) করতে চান?');
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await attendanceService.checkOut(user.email, noteInput.trim() || undefined);
      toast.success('👋 আজকের মতো ছুটি সম্পন্ন হয়েছে। শুভ বিদায়!', { duration: 4000 });
      
      // Reload data
      await loadAttendanceData();
      setNoteInput('');
      setShowNoteInput(false);
    } catch (err: any) {
      console.error('Check out failed:', err);
      toast.error(err.message || 'চেক-আউটে সমস্যা হয়েছে।');
    } finally {
      setActionLoading(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    const confirmed = window.confirm('আপনি কি নিশ্চিত যে অ্যাকাউন্ট থেকে লগআউট করতে চান?');
    if (!confirmed) return;

    try {
      setLoggingOut(true);
      if (auth) {
        await auth.signOut();
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setUnlocked(false);
      router.push('/');
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

  // Is security ready to check in?
  const isSecurityReady = useMemo(() => {
    if (!securitySettings?.enabled) return true;
    const gpsRequired = securitySettings.gpsEnabled;
    const wifiRequired = securitySettings.wifiEnabled;

    if (gpsRequired && wifiRequired) {
      return liveSecurityStatus.gpsOk && liveSecurityStatus.wifiOk;
    }
    if (gpsRequired) return liveSecurityStatus.gpsOk;
    if (wifiRequired) return liveSecurityStatus.wifiOk;
    return true;
  }, [securitySettings, liveSecurityStatus]);

  if (user && user.role !== 'Technician') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm">সেটিংস কর্মী ব্যবস্থাপনায় রিডাইরেক্ট করা হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20 px-1 sm:px-0">
      
      {/* 1. Header: Greeting & Date */}
      <div className="flex items-center justify-between py-1 px-1">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-white">
            আসসালামু আলাইকুম, <span className="text-blue-400">{user?.name || 'সহকর্মী'}</span>! 👋
          </h1>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>{currentDateFormatted || 'আজকের দিন'}</span>
          </p>
        </div>
      </div>

      {/* 2. Hero Punch Card (Simple, Direct, 1-Click Attendance) */}
      <div className="bg-[#131724] border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center gap-2.5 text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
            <p className="text-xs font-medium">হাজিরা লোড হচ্ছে...</p>
          </div>
        ) : !todayRecord ? (
          /* STATE A: NOT CHECKED IN YET */
          <div className="space-y-4 text-center sm:text-left">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">আজকের হাজিরা শুরু করুন</h2>
              <p className="text-xs text-gray-400 mt-0.5">দোকানে পৌঁছানোর পর নিচের বাটনে চাপ দিন।</p>
            </div>

            {/* Big Punch-In Button */}
            <Button
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-base sm:text-lg rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>যাচাই ও হাজিরা গ্রহণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>হাজিরা দিন (Check In)</span>
                </>
              )}
            </Button>

            {/* Simple Readiness Pill below button */}
            {securitySettings?.enabled && (
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] text-gray-400 pt-0.5">
                {isSecurityReady ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    দোকানের ভেতরে আছেন (প্রস্তুত)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    দোকানের Wi-Fi বা লোকেশন চালু করুন
                  </span>
                )}
              </div>
            )}

            {/* Optional Note (Collapsible, doesn't clutter by default) */}
            <div className="pt-1">
              {!showNoteInput ? (
                <button
                  type="button"
                  onClick={() => setShowNoteInput(true)}
                  className="text-[11px] text-gray-400 hover:text-blue-400 underline underline-offset-2 transition-colors"
                >
                  + মন্তব্য বা কাজের বিবরণ লিখুন (ঐচ্ছিক)
                </button>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="মন্তব্য লিখুন (যেমন: সকালের শিফট)..."
                    className="w-full bg-[#181d2e] border border-gray-700/80 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => { setShowNoteInput(false); setNoteInput(''); }}
                    className="text-[10px] text-gray-500 hover:text-gray-400"
                  >
                    বাদ দিন
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : !todayRecord.checkOutTime ? (
          /* STATE B: CHECKED IN (ON DUTY) */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                ডিউটি চলছে
              </span>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(todayRecord.status).color}`}>
                {getStatusBadge(todayRecord.status).label}
              </span>
            </div>

            {/* Live Timer Display */}
            <div className="bg-[#181d2e] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-gray-400 font-semibold uppercase">চলমান কাজের সময়</div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono mt-0.5">
                  {elapsedWorkingTime || 'গণনা হচ্ছে...'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-gray-400 font-semibold uppercase">প্রবেশের সময়</div>
                <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5">
                  {todayRecord.checkInTime}
                </div>
              </div>
            </div>

            {/* Check-Out Button */}
            <Button
              onClick={handleCheckOut}
              disabled={actionLoading}
              variant="destructive"
              className="w-full h-13 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-base rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>ছুটি সম্পন্ন হচ্ছে...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-5 h-5" />
                  <span>ছুটি নিন (Check Out)</span>
                </>
              )}
            </Button>

            {/* Optional Checkout Note */}
            <div className="pt-0.5">
              {!showNoteInput ? (
                <button
                  type="button"
                  onClick={() => setShowNoteInput(true)}
                  className="text-[11px] text-gray-400 hover:text-rose-400 underline underline-offset-2 transition-colors"
                >
                  + প্রস্থান নোট লিখুন (ঐচ্ছিক)
                </button>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="প্রস্থান নোট লিখুন..."
                    className="w-full bg-[#181d2e] border border-gray-700/80 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => { setShowNoteInput(false); setNoteInput(''); }}
                    className="text-[10px] text-gray-500 hover:text-gray-400"
                  >
                    বাদ দিন
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* STATE C: CHECKED OUT (DAY COMPLETED) */
          <div className="space-y-3.5 text-center sm:text-left">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <Check className="w-3.5 h-3.5" />
                আজকের ডিউটি সমাপ্ত
              </span>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(todayRecord.status).color}`}>
                {getStatusBadge(todayRecord.status).label}
              </span>
            </div>

            {/* 3 Metric Pills */}
            <div className="grid grid-cols-3 gap-2 bg-[#181d2e] p-3 rounded-xl border border-gray-800 text-center">
              <div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase">প্রবেশ</div>
                <div className="text-sm font-bold text-white font-mono mt-0.5">{todayRecord.checkInTime}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase">প্রস্থান</div>
                <div className="text-sm font-bold text-rose-300 font-mono mt-0.5">{todayRecord.checkOutTime}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase">মোট সময়</div>
                <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">{formatBanglaHours(todayRecord.workingHours)}</div>
              </div>
            </div>

            <p className="text-xs text-gray-400 pt-0.5">
              ✅ আজকের হাজিরা সফলভাবে সম্পন্ন হয়েছে। কাল আবার দেখা হবে!
            </p>
          </div>
        )}
      </div>

      {/* 3. Monthly Summary at a Glance (4 Compact Badges) */}
      <div className="bg-[#131724] border border-gray-800 rounded-2xl p-4 shadow-md space-y-2">
        <div className="text-xs font-bold text-gray-300 flex items-center justify-between">
          <span>চলতি মাসের হিসাব</span>
          <span className="text-[11px] text-gray-400 font-normal">এই মাস</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-[#0e111a] p-2.5 rounded-xl border border-gray-800/80">
            <div className="text-[10px] text-gray-400">উপস্থিত</div>
            <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono mt-0.5">{monthlyStats.presentDays} দিন</div>
          </div>
          <div className="bg-[#0e111a] p-2.5 rounded-xl border border-gray-800/80">
            <div className="text-[10px] text-gray-400">দেরি</div>
            <div className="text-base sm:text-lg font-bold text-amber-400 font-mono mt-0.5">{monthlyStats.lateDays} দিন</div>
          </div>
          <div className="bg-[#0e111a] p-2.5 rounded-xl border border-gray-800/80">
            <div className="text-[10px] text-gray-400">মোট দিন</div>
            <div className="text-base sm:text-lg font-bold text-blue-400 font-mono mt-0.5">{monthlyStats.totalDays} দিন</div>
          </div>
          <div className="bg-[#0e111a] p-2.5 rounded-xl border border-gray-800/80">
            <div className="text-[10px] text-gray-400">মোট সময়</div>
            <div className="text-xs sm:text-sm font-bold text-purple-300 font-mono mt-1 truncate">{monthlyStats.totalWorkingHours}</div>
          </div>
        </div>
      </div>

      {/* 4. Recent History (Compact Clean List) */}
      <div className="bg-[#131724] border border-gray-800 rounded-2xl overflow-hidden shadow-md">
        <div className="p-3.5 px-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-white text-xs sm:text-sm">পূর্ববর্তী হাজিরার ইতিহাস</h3>
          </div>
          <span className="text-[11px] text-gray-400">সর্বশেষ {Math.min(historyRecords.length, 10)} দিন</span>
        </div>

        {historyRecords.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-xs">
            এখনও কোনো হাজিরার রেকর্ড নেই।
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {historyRecords.slice(0, 10).map((rec) => (
              <div key={rec.id || rec.date} className="p-3 px-4 flex items-center justify-between hover:bg-[#181d2e]/40 transition-colors">
                <div>
                  <div className="font-semibold text-white text-xs sm:text-sm">
                    {formatBanglaDate(rec.date)}
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                    {rec.checkInTime || '--'} &rarr; {rec.checkOutTime || '--'} ({formatBanglaHours(rec.workingHours)})
                  </div>
                </div>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${getStatusBadge(rec.status).color}`}>
                  {getStatusBadge(rec.status).label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Dedicated Profile Information Section (Dokaner Nam, Email & Log Out) - Placed at the very bottom */}
      <div className="bg-[#131724] border border-gray-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-3">
        <div className="text-xs font-bold text-gray-300 flex items-center justify-between">
          <span>আমার প্রোফাইল ও অ্যাকাউন্ট</span>
          <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
            {user?.role || 'টেকনিশিয়ান'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          {/* Shop Name */}
          <div className="p-3 bg-[#0e111a] rounded-xl border border-gray-800/80 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-gray-400 font-semibold uppercase">দোকানের নাম</div>
              <div className="text-xs sm:text-sm font-bold text-white truncate">{shop?.shopName || 'Shop Name'}</div>
            </div>
          </div>

          {/* Email */}
          <div className="p-3 bg-[#0e111a] rounded-xl border border-gray-800/80 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-gray-400 font-semibold uppercase">ইমেইল অ্যাকাউন্ট</div>
              <div className="text-xs sm:text-sm font-medium text-gray-200 truncate">{user?.email || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          variant="destructive"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full h-11 bg-red-600/15 hover:bg-red-600/25 text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] mt-1"
        >
          <LogOut className="w-4 h-4" />
          <span>{loggingOut ? 'লগআউট হচ্ছে...' : 'অ্যাকাউন্ট থেকে লগআউট (Log Out)'}</span>
        </Button>
      </div>

    </div>
  );
}
