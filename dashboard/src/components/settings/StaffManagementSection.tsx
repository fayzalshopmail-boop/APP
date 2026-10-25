'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserCheck, Clock, CreditCard, 
  CheckCircle2, AlertCircle, Calendar, Wallet, Coins, 
  Plus, Search, Trash2, Edit3, LogIn, LogOut, Wrench, 
  Check, X, ChevronRight, UserX, Loader2, Shield,
  UserPlus, Mail, Lock, CheckCircle, ShieldCheck, MapPin, Wifi
} from 'lucide-react';
import { attendanceService, AttendanceRecord, AttendanceStatus, getLocalDateStr } from '@/lib/services/attendance';
import { attendanceSecurityService, AttendanceSecuritySettings } from '@/lib/services/attendanceSecurity';
import { AttendanceSecurityModal } from './AttendanceSecurityModal';
import { payrollService, PayrollRecord, PayrollType, StaffSalaryConfig, getCurrentMonthStr } from '@/lib/services/payroll';
import { userService, AppUser, UserRole } from '@/lib/services/user';
import { formatCurrency } from '@/lib/currency';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import toast from 'react-hot-toast';

interface StaffManagementSectionProps {
  activeSubTab?: 'attendance' | 'payroll' | 'accounts';
  staffList: AppUser[];
  onRefreshStaff: () => Promise<void>;
  onDeleteStaff: (email: string) => void;
  onToggleAccess: (email: string, currentStatus: boolean) => Promise<void>;
  onAddStaff: (e: React.FormEvent) => Promise<void>;
  newEmail: string;
  setNewEmail: (val: string) => void;
  newName: string;
  setNewName: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  newRole: UserRole;
  setNewRole: (val: UserRole) => void;
  adding: boolean;
  error: string | null;
  success: string | null;
  loadingStaff: boolean;
}

export function StaffManagementSection({
  activeSubTab,
  staffList,
  onRefreshStaff,
  onDeleteStaff,
  onToggleAccess,
  onAddStaff,
  newEmail,
  setNewEmail,
  newName,
  setNewName,
  newPassword,
  setNewPassword,
  newRole,
  setNewRole,
  adding,
  error,
  success,
  loadingStaff
}: StaffManagementSectionProps) {
  const { user: currentUser } = useAppStore();
  const isManagerOrOwner = currentUser?.role === 'Owner' || currentUser?.role === 'Manager';

  // Sub Tab Navigation
  const [internalSubTab, setInternalSubTab] = useState<'attendance' | 'payroll' | 'accounts'>(activeSubTab || 'attendance');

  useEffect(() => {
    if (activeSubTab) {
      setInternalSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const subTab = internalSubTab;

  // Unified Design System Helpers
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'Owner':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Manager':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Technician':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default:
        return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  const getAttendanceStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'Present':
        return { label: 'উপস্থিত', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'Late':
        return { label: 'দেরিতে', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'Half Day':
        return { label: 'হাফ ডে', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'Leave':
        return { label: 'ছুটিতে', className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'Absent':
      default:
        return { label: 'অনুপস্থিত', className: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    }
  };

  const getPayrollTypeBadge = (type: PayrollType) => {
    switch (type) {
      case 'Salary Payment':
        return { label: 'মাসিক বেতন', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'Advance Salary':
        return { label: 'অগ্রিম বেতন', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'Bonus':
        return { label: 'বোনাস', className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'Deduction':
      default:
        return { label: 'কর্তন', className: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    }
  };

  // 1. ATTENDANCE STATE
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateStr());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [isManualAttendanceOpen, setIsManualAttendanceOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [securitySettings, setSecuritySettings] = useState<AttendanceSecuritySettings | null>(null);

  const loadSecuritySettings = useCallback(async () => {
    try {
      const data = await attendanceSecurityService.getSettings();
      setSecuritySettings(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const [manualAttendanceData, setManualAttendanceData] = useState({
    userId: '',
    date: getLocalDateStr(),
    checkInTime: '09:30 AM',
    checkOutTime: '07:30 PM',
    status: 'Present' as AttendanceStatus,
    note: ''
  });

  // 2. PAYROLL STATE
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr());
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [salaryConfigs, setSalaryConfigs] = useState<Record<string, StaffSalaryConfig>>({});
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSalaryConfigModalOpen, setIsSalaryConfigModalOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    staffEmail: '',
    type: 'Salary Payment' as PayrollType,
    amount: '',
    paymentMethod: 'Cash' as 'Cash' | 'bKash' | 'Nagad' | 'Bank',
    date: getLocalDateStr(),
    note: '',
    syncToExpenses: true
  });
  const [salaryConfigFormData, setSalaryConfigFormData] = useState({
    email: '',
    baseSalary: '',
    phone: '',
    notes: ''
  });

  // Form submission loading states (prevent double-submit)
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [submittingSalaryConfig, setSubmittingSalaryConfig] = useState(false);

  // Formatted staff dropdown options (Active staff on top, Inactive clearly marked)
  const staffSelectOptions = useMemo(() => {
    return [...staffList]
      .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0))
      .map(s => ({
        label: `${s.name} (${s.role})${!s.isActive ? ' — [নিষ্ক্রিয়/Blocked]' : ''}`,
        value: s.email
      }));
  }, [staffList]);

  // 3. CONFIRM DELETE MODAL (for attendance or payroll)
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    type: 'attendance' | 'payroll' | null;
    id: string | null;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: null,
    id: null,
    title: '',
    message: ''
  });

  // Load Attendance
  const loadAttendance = useCallback(async (dateStr: string) => {
    try {
      setLoadingAttendance(true);
      const records = await attendanceService.getByDate(dateStr);
      setAttendanceRecords(records);
    } catch (e) {
      console.error(e);
      toast.error('উপস্থিতি ডাটা লোড করা যায়নি');
    } finally {
      setLoadingAttendance(false);
    }
  }, []);

  // Load Payroll
  const loadPayroll = useCallback(async (monthStr: string) => {
    try {
      setLoadingPayroll(true);
      const [records, configs] = await Promise.all([
        payrollService.getRecords(monthStr),
        payrollService.getAllSalaryConfigs()
      ]);
      setPayrollRecords(records);
      setSalaryConfigs(configs);
    } catch (e) {
      console.error(e);
      toast.error('বেতন লেজার লোড করা যায়নি');
    } finally {
      setLoadingPayroll(false);
    }
  }, []);

  // Initial load for security settings
  useEffect(() => {
    loadSecuritySettings();
  }, [loadSecuritySettings]);

  // Load Attendance when on attendance sub-tab or date changes
  useEffect(() => {
    if (subTab === 'attendance') {
      loadAttendance(selectedDate);
    }
  }, [subTab, selectedDate, loadAttendance]);

  // Load Payroll when on payroll sub-tab or month changes
  useEffect(() => {
    if (subTab === 'payroll') {
      loadPayroll(selectedMonth);
    }
  }, [subTab, selectedMonth, loadPayroll]);

  // Attendance Actions
  const myTodayAttendance = attendanceRecords.find(r => r.userId === currentUser?.email);

  const handleMyCheckIn = async () => {
    if (!currentUser?.email || !currentUser?.name) {
      toast.error('লগইন তথ্য পাওয়া যায়নি');
      return;
    }
    try {
      setCheckingIn(true);

      // Verify GPS & Wi-Fi Security
      toast.loading('হাজিরা অবস্থান ও Wi-Fi যাচাই করা হচ্ছে...', { id: 'security-check' });
      const verification = await attendanceSecurityService.verifyAttendanceAccess(currentUser.role);
      
      if (!verification.allowed) {
        toast.error(verification.error || 'আপনি দোকানের বাইরে আছেন। চেক-ইন করা সম্ভব নয়।', { 
          id: 'security-check',
          duration: 6000 
        });
        return;
      }
      toast.dismiss('security-check');

      const rec = await attendanceService.checkIn(
        {
          email: currentUser.email,
          name: currentUser.name,
          role: currentUser.role || 'Staff'
        },
        '',
        {
          verifiedBy: verification.verifiedBy,
          distanceMeters: verification.distanceMeters,
          clientIp: verification.clientIp
        }
      );
      toast.success(`সফলভাবে উপস্থিতি নিশ্চিত করা হয়েছে (${rec.checkInTime})`);
      loadAttendance(selectedDate);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'চেক-ইন ব্যর্থ হয়েছে');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleMyCheckOut = async () => {
    if (!currentUser?.email) return;
    try {
      setCheckingOut(true);

      // Verify GPS & Wi-Fi Security for Checkout
      toast.loading('প্রস্থান অবস্থান ও Wi-Fi যাচাই করা হচ্ছে...', { id: 'security-check' });
      const verification = await attendanceSecurityService.verifyAttendanceAccess(currentUser.role);
      
      if (!verification.allowed) {
        toast.error(verification.error || 'দোকানে উপস্থিত থেকে চেক-আউট সম্পন্ন করুন।', { 
          id: 'security-check',
          duration: 6000 
        });
        return;
      }
      toast.dismiss('security-check');

      await attendanceService.checkOut(currentUser.email);
      toast.success('সফলভাবে প্রস্থান (Check Out) সম্পন্ন হয়েছে');
      loadAttendance(selectedDate);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'চেক-আউট ব্যর্থ হয়েছে');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleSaveManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingAttendance) return;

    if (!manualAttendanceData.userId) {
      toast.error('অনুগ্রহ করে কর্মী নির্বাচন করুন');
      return;
    }
    if (!manualAttendanceData.date) {
      toast.error('তারিখ নির্বাচন করুন');
      return;
    }

    const targetStaff = staffList.find(s => s.email.toLowerCase() === manualAttendanceData.userId.toLowerCase());
    if (!targetStaff) {
      toast.error('নির্বাচিত কর্মী খুঁজে পাওয়া যায়নি');
      return;
    }

    try {
      setSubmittingAttendance(true);
      await attendanceService.saveManualAttendance({
        userId: targetStaff.email,
        userName: targetStaff.name,
        userRole: targetStaff.role,
        date: manualAttendanceData.date,
        checkInTime: manualAttendanceData.checkInTime || '',
        checkOutTime: manualAttendanceData.checkOutTime || '',
        status: manualAttendanceData.status,
        note: manualAttendanceData.note?.trim() || ''
      });
      toast.success('উপস্থিতি রেকর্ড সফলভাবে সংরক্ষিত হয়েছে');
      setIsManualAttendanceOpen(false);
      loadAttendance(selectedDate);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'রেকর্ড সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setSubmittingAttendance(false);
    }
  };

  // Payroll Actions
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingPayment) return;

    if (!paymentFormData.staffEmail) {
      toast.error('অনুগ্রহ করে কর্মী নির্বাচন করুন');
      return;
    }

    const amt = Number(paymentFormData.amount);
    if (!paymentFormData.amount || isNaN(amt) || amt <= 0) {
      toast.error('টাকার পরিমাণ অবশ্যই ০ এর বেশি হতে হবে');
      return;
    }

    if (!paymentFormData.date) {
      toast.error('তারিখ নির্বাচন করুন');
      return;
    }

    const targetStaff = staffList.find(s => s.email.toLowerCase() === paymentFormData.staffEmail.toLowerCase());
    if (!targetStaff) {
      toast.error('নির্বাচিত কর্মী খুঁজে পাওয়া যায়নি');
      return;
    }

    try {
      setSubmittingPayment(true);
      await payrollService.addPayment({
        staffEmail: targetStaff.email,
        staffName: targetStaff.name,
        month: selectedMonth,
        type: paymentFormData.type,
        amount: amt,
        paymentMethod: paymentFormData.paymentMethod,
        date: paymentFormData.date,
        note: paymentFormData.note?.trim() || '',
        paidBy: currentUser?.name || currentUser?.email || 'Admin'
      }, paymentFormData.syncToExpenses);

      toast.success('বেতন/অগ্রিম সফলভাবে পরিশোধ রেকর্ড করা হয়েছে!');
      setIsPaymentModalOpen(false);
      setPaymentFormData({
        staffEmail: '',
        type: 'Salary Payment',
        amount: '',
        paymentMethod: 'Cash',
        date: getLocalDateStr(),
        note: '',
        syncToExpenses: true
      });
      loadPayroll(selectedMonth);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'পেমেন্ট সংরক্ষণ করা যায়নি');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleSaveSalaryConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingSalaryConfig) return;

    if (!salaryConfigFormData.email) {
      toast.error('কর্মী নির্বাচন করুন');
      return;
    }

    const baseSal = Number(salaryConfigFormData.baseSalary);
    if (salaryConfigFormData.baseSalary !== '' && (isNaN(baseSal) || baseSal < 0)) {
      toast.error('মূল বেতন ০ বা তার বেশি হতে হবে');
      return;
    }

    try {
      setSubmittingSalaryConfig(true);
      await payrollService.saveSalaryConfig({
        email: salaryConfigFormData.email,
        baseSalary: isNaN(baseSal) ? 0 : baseSal,
        phone: salaryConfigFormData.phone?.trim() || '',
        notes: salaryConfigFormData.notes?.trim() || ''
      });
      toast.success('মূল বেতন সফলভাবে আপডেট করা হয়েছে');
      setIsSalaryConfigModalOpen(false);
      loadPayroll(selectedMonth);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'বেতন আপডেট ব্যর্থ হয়েছে');
    } finally {
      setSubmittingSalaryConfig(false);
    }
  };

  // Delete Record Confirmation
  const executeDeleteRecord = async () => {
    if (!confirmDeleteModal.id || !confirmDeleteModal.type) return;
    try {
      if (confirmDeleteModal.type === 'attendance') {
        await attendanceService.deleteRecord(confirmDeleteModal.id);
        toast.success('উপস্থিতি রেকর্ড মুছে ফেলা হয়েছে');
        loadAttendance(selectedDate);
      } else if (confirmDeleteModal.type === 'payroll') {
        await payrollService.deleteRecord(confirmDeleteModal.id);
        toast.success('বেতন রেকর্ড মুছে ফেলা হয়েছে');
        loadPayroll(selectedMonth);
      }
    } catch (e: any) {
      console.error(e);
      toast.error('মুছে ফেলতে সমস্যা হয়েছে');
    } finally {
      setConfirmDeleteModal({ isOpen: false, type: null, id: null, title: '', message: '' });
    }
  };

  // Calculations for Attendance
  const totalStaffCount = staffList.length;
  const presentCount = attendanceRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
  const lateCount = attendanceRecords.filter(r => r.status === 'Late').length;

  // Calculations for Payroll
  const totalBaseSalaries = staffList.reduce((acc, s) => {
    const cfg = salaryConfigs[s.email];
    return acc + (cfg?.baseSalary || s.baseSalary || 0);
  }, 0);

  const totalPaidThisMonth = payrollRecords.reduce((acc, r) => {
    if (r.type === 'Salary Payment' || r.type === 'Advance Salary' || r.type === 'Bonus') {
      return acc + r.amount;
    }
    return acc;
  }, 0);

  const totalAdvanceThisMonth = payrollRecords.reduce((acc, r) => {
    return r.type === 'Advance Salary' ? acc + r.amount : acc;
  }, 0);

  const remainingPayable = Math.max(0, totalBaseSalaries - totalPaidThisMonth);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Modern Staff Management Header & Underline Tabs */}
      <div className="bg-[#121524]/60 border border-gray-800 rounded-2xl p-5 pb-0 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">কর্মী ব্যবস্থাপনা (Staff Management)</h2>
              <p className="text-xs text-gray-400">দৈনিক হাজিরা, বেতন ও অগ্রিম লেজার এবং কর্মী এক্সেস ও রোল</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-gray-800 text-gray-300 font-semibold border border-gray-700">
              মোট কর্মী: {staffList.length} জন
            </span>
          </div>
        </div>

        {/* Sleek Underline Tabs */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1 sm:gap-3 border-t border-gray-800/80 pt-1 -mb-px scrollbar-none">
          <button
            onClick={() => setInternalSubTab('attendance')}
            className={`flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-1 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all text-center select-none ${
              subTab === 'attendance'
                ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">দৈনিক হাজিরা</span>
          </button>

          <button
            onClick={() => setInternalSubTab('payroll')}
            className={`flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-1 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all text-center select-none ${
              subTab === 'payroll'
                ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">বেতন লেজার</span>
          </button>

          <button
            onClick={() => setInternalSubTab('accounts')}
            className={`flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-1 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all text-center select-none ${
              subTab === 'accounts'
                ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">কর্মী এক্সেস</span>
            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold shrink-0">
              {staffList.length}
            </span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. ATTENDANCE SUB-TAB */}
      {/* ===================================================================== */}
      {subTab === 'attendance' && (
        <div className="space-y-6">
          {/* Quick Check-In / Check-Out Widget */}
          <div className="bg-gradient-to-r from-blue-950/40 via-secondary to-indigo-950/30 border border-blue-500/20 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xl border border-blue-500/30 shrink-0">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} className="w-14 h-14 rounded-2xl object-cover" alt={currentUser.name} />
                  ) : (
                    currentUser?.name?.charAt(0) || 'U'
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{currentUser?.name || 'User'}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {currentUser?.role || 'Staff'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    আজকের তারিখ: <span className="text-gray-200 font-medium">{new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    {myTodayAttendance ? (
                      <>
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <LogIn className="w-3.5 h-3.5" /> প্রবেশ: {myTodayAttendance.checkInTime}
                        </span>
                        {myTodayAttendance.checkOutTime ? (
                          <span className="text-purple-400 flex items-center gap-1 font-medium">
                            <LogOut className="w-3.5 h-3.5" /> প্রস্থান: {myTodayAttendance.checkOutTime} ({myTodayAttendance.workingHours})
                          </span>
                        ) : (
                          <span className="text-amber-400 animate-pulse font-medium">● ডিউটিতে আছেন</span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">আপনি এখনও আজকের হাজিরা দেননি</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button & Security Status */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                {securitySettings?.enabled && (
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-blue-300 bg-[#121524] border border-blue-500/20 px-3 py-2 rounded-xl font-medium shrink-0 shadow-inner">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>লক সক্রিয়: {securitySettings.mode === 'strict' ? 'GPS + Wi-Fi' : 'GPS / Wi-Fi'}</span>
                  </div>
                )}

                {!myTodayAttendance ? (
                  <Button
                    onClick={handleMyCheckIn}
                    disabled={checkingIn}
                    className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 px-6 shadow-lg shadow-emerald-950/40"
                  >
                    {checkingIn ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                    Check In (হাজিরা দিন)
                  </Button>
                ) : !myTodayAttendance.checkOutTime ? (
                  <Button
                    onClick={handleMyCheckOut}
                    disabled={checkingOut}
                    className="flex-1 md:flex-initial bg-amber-600 hover:bg-amber-500 text-white font-bold h-11 px-6 shadow-lg shadow-amber-950/40"
                  >
                    {checkingOut ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                    Check Out (প্রস্থান করুন)
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" /> আজকের শিফট সম্পন্ন
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Today's Stats & Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-gray-800 rounded-2xl p-4">
              <span className="text-xs text-gray-400 font-medium block">মোট কর্মী</span>
              <h3 className="text-2xl font-black text-white mt-1">{totalStaffCount} জন</h3>
              <p className="text-[11px] text-gray-500 mt-1">অনুমোদিত অ্যাকাউন্ট</p>
            </div>
            <div className="bg-card border border-gray-800 rounded-2xl p-4">
              <span className="text-xs text-emerald-400 font-medium block">উপস্থিত (Present)</span>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">{presentCount} জন</h3>
              <p className="text-[11px] text-gray-500 mt-1">{lateCount > 0 ? `${lateCount} জন দেরিতে প্রবেশ` : 'সময়মতো উপস্থিত'}</p>
            </div>
            <div className="bg-card border border-gray-800 rounded-2xl p-4">
              <span className="text-xs text-amber-400 font-medium block">দেরিতে চেক-ইন (Late)</span>
              <h3 className="text-2xl font-black text-amber-400 mt-1">{lateCount} জন</h3>
              <p className="text-[11px] text-gray-500 mt-1">সকাল ১০:৩০ এর পর</p>
            </div>
            <div className="bg-card border border-gray-800 rounded-2xl p-4">
              <span className="text-xs text-rose-400 font-medium block">ছুটি / অনুপস্থিত</span>
              <h3 className="text-2xl font-black text-rose-400 mt-1">{Math.max(0, totalStaffCount - presentCount)} জন</h3>
              <p className="text-[11px] text-gray-500 mt-1">হাজিরা রেকর্ড নেই</p>
            </div>
          </div>

          {/* Date Selector & Manual Entry Bar */}
          <div className="bg-secondary/40 border border-gray-800 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                <label className="text-xs font-semibold text-gray-300">তারিখ:</label>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[#10131f] border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 h-9"
              />
              {selectedDate !== getLocalDateStr() && (
                <button
                  onClick={() => setSelectedDate(getLocalDateStr())}
                  className="text-xs text-blue-400 hover:underline font-medium"
                >
                  আজকে ফিরে যান
                </button>
              )}
            </div>

            {isManagerOrOwner && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button
                  onClick={() => setIsSecurityModalOpen(true)}
                  variant="outline"
                  className="border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold text-xs h-9 sm:h-10 px-3.5 rounded-xl shadow-sm flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>হাজিরা সিকিউরিটি (GPS & Wi-Fi)</span>
                  {securitySettings?.enabled ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="সিকিউরিটি সক্রিয়" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-600" title="সিকিউরিটি নিষ্ক্রিয়" />
                  )}
                </Button>

                <Button
                  onClick={() => {
                    setManualAttendanceData({
                      userId: staffList[0]?.email || '',
                      date: selectedDate,
                      checkInTime: '09:30 AM',
                      checkOutTime: '07:30 PM',
                      status: 'Present',
                      note: ''
                    });
                    setIsManualAttendanceOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold h-9 sm:h-10 px-4 rounded-xl shadow-md shadow-blue-950/40 flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  উপস্থিতি এন্ট্রি যোগ করুন
                </Button>
              </div>
            )}
          </div>

          {/* Attendance Records Table */}
          <div className="bg-card border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/30">
              <h3 className="font-bold text-gray-200 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                {selectedDate === getLocalDateStr() ? "আজকের উপস্থিতি তালিকা" : `${selectedDate} তারিখের উপস্থিতি`}
              </h3>
              <span className="text-xs text-gray-400 font-medium">মোট রেকর্ড: {attendanceRecords.length} টি</span>
            </div>

            {loadingAttendance ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-50" />
                <h4 className="text-base font-semibold text-gray-300">কোনো হাজিরা রেকর্ড পাওয়া যায়নি</h4>
                <p className="text-xs text-gray-500 mt-1">এই তারিখে কোনো কর্মী এখনও চেক-ইন করেননি।</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#121524] text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
                      <tr>
                        <th className="px-5 py-3.5">কর্মী</th>
                        <th className="px-5 py-3.5">রোল</th>
                        <th className="px-5 py-3.5">প্রবেশ (Check-In)</th>
                        <th className="px-5 py-3.5">প্রস্থান (Check-Out)</th>
                        <th className="px-5 py-3.5">মোট কর্মঘণ্টা</th>
                        <th className="px-5 py-3.5">ভেরিফিকেশন</th>
                        <th className="px-5 py-3.5">স্ট্যাটাস</th>
                        {isManagerOrOwner && <th className="px-5 py-3.5 text-right">অ্যাকশন</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 text-gray-200">
                      {attendanceRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-secondary/40 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                                {rec.userName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-white text-sm">{rec.userName}</p>
                                <p className="text-xs text-gray-500">{rec.userId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${getRoleBadgeClass(rec.userRole)}`}>
                              {rec.userRole}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-emerald-400 font-medium font-mono text-xs">
                            {rec.checkInTime}
                          </td>
                          <td className="px-5 py-4 text-purple-400 font-medium font-mono text-xs">
                            {rec.checkOutTime || <span className="text-gray-500 italic">এখনও চেক-আউট হয়নি</span>}
                          </td>
                          <td className="px-5 py-4 text-gray-300 font-medium text-xs">
                            {rec.workingHours || '-'}
                          </td>
                          <td className="px-5 py-4">
                            {rec.verifiedBy === 'GPS + Wi-Fi' ? (
                              <span 
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                title={`GPS দূরত্ব: ${rec.distanceMeters ?? 0}m, IP: ${rec.clientIp || 'Verified'}`}
                              >
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                GPS + Wi-Fi {rec.distanceMeters !== undefined ? `(${rec.distanceMeters}m)` : ''}
                              </span>
                            ) : rec.verifiedBy === 'GPS' ? (
                              <span 
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                title={`GPS দূরত্ব: ${rec.distanceMeters ?? 0}m`}
                              >
                                <MapPin className="w-3 h-3 text-blue-400" />
                                GPS {rec.distanceMeters !== undefined ? `(${rec.distanceMeters}m)` : ''}
                              </span>
                            ) : rec.verifiedBy === 'Wi-Fi' ? (
                              <span 
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                title={`IP: ${rec.clientIp || 'Verified'}`}
                              >
                                <Wifi className="w-3 h-3 text-indigo-400" />
                                Wi-Fi
                              </span>
                            ) : rec.verifiedBy === 'Manual / Owner' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                <Shield className="w-3 h-3 text-purple-400" />
                                ম্যানুয়াল
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-500">স্ট্যান্ডার্ড</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {(() => {
                              const badge = getAttendanceStatusBadge(rec.status);
                              return (
                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.className}`}>
                                  {badge.label}
                                </span>
                              );
                            })()}
                          </td>
                          {isManagerOrOwner && (
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => setConfirmDeleteModal({
                                  isOpen: true,
                                  type: 'attendance',
                                  id: rec.id || null,
                                  title: 'উপস্থিতি রেকর্ড মুছে ফেলবেন?',
                                  message: `আপনি কি নিশ্চিতভাবে ${rec.userName}-এর এই রেকর্ডটি মুছে ফেলতে চান?`
                                })}
                                className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden p-3 space-y-3">
                  {attendanceRecords.map((rec) => (
                    <div key={rec.id} className="bg-[#1b1f30]/60 border border-gray-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {rec.userName.charAt(0)}
                          </div>
                          <div>
                            <div className="text-gray-200 font-semibold text-sm">{rec.userName}</div>
                            <div className="text-[11px] text-gray-500">{rec.userId}</div>
                          </div>
                        </div>
                        {(() => {
                          const badge = getAttendanceStatusBadge(rec.status);
                          return (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.className}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-[#121524] p-3 rounded-xl border border-gray-800/80 text-xs">
                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">প্রবেশ সময়</span>
                          <span className="font-mono text-emerald-400 font-bold text-xs">{rec.checkInTime}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">প্রস্থান সময়</span>
                          <span className="font-mono text-purple-400 font-bold text-xs">
                            {rec.checkOutTime || <span className="text-gray-500 italic font-sans font-normal text-[11px]">চলমান</span>}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">মোট কর্মঘণ্টা</span>
                          <span className="text-gray-200 font-medium text-xs">{rec.workingHours || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">যাচাইকরণ</span>
                          {rec.verifiedBy === 'GPS + Wi-Fi' ? (
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> GPS + Wi-Fi
                            </span>
                          ) : rec.verifiedBy === 'GPS' ? (
                            <span className="text-[10px] text-blue-400 font-semibold flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> GPS
                            </span>
                          ) : rec.verifiedBy === 'Wi-Fi' ? (
                            <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1">
                              <Wifi className="w-3 h-3" /> Wi-Fi
                            </span>
                          ) : (
                            <span className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                              <Shield className="w-3 h-3" /> ম্যানুয়াল
                            </span>
                          )}
                        </div>
                      </div>

                      {isManagerOrOwner && (
                        <div className="flex justify-end pt-1 border-t border-gray-800/50">
                          <button
                            onClick={() => setConfirmDeleteModal({
                              isOpen: true,
                              type: 'attendance',
                              id: rec.id || null,
                              title: 'উপস্থিতি রেকর্ড মুছে ফেলবেন?',
                              message: `আপনি কি নিশ্চিতভাবে ${rec.userName}-এর এই রেকর্ডটি মুছে ফেলতে চান?`
                            })}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 transition-colors font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            রেকর্ড মুছুন
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. PAYROLL SUB-TAB */}
      {/* ===================================================================== */}
      {subTab === 'payroll' && (
        <div className="space-y-6">
          {/* Month Selector & Controls */}
          <div className="bg-secondary/50 border border-gray-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Calendar className="w-5 h-5 text-blue-400 shrink-0" />
              <label className="text-xs font-semibold text-gray-300 shrink-0">হিসাবের মাস:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-[#10131f] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 w-full sm:w-auto"
              />
            </div>

            {isManagerOrOwner && (
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setIsSalaryConfigModalOpen(true)}
                  className="border-gray-700 text-gray-200 hover:bg-gray-800 text-xs font-semibold h-9 flex-1 sm:flex-none justify-center"
                >
                  <Coins className="w-3.5 h-3.5 mr-1.5 text-yellow-400" />
                  মূল বেতন নির্ধারণ
                </Button>
                <Button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-9 px-4 flex-1 sm:flex-none justify-center"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  বেতন / অগ্রিম প্রদান
                </Button>
              </div>
            )}
          </div>

          {/* Payroll KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-gray-800 rounded-2xl p-4">
              <span className="text-xs text-gray-400 font-medium block">মোট ধার্যকৃত বেতন</span>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-1">{formatCurrency(totalBaseSalaries)}</h3>
              <p className="text-[11px] text-gray-500 mt-1">সব কর্মীদের নির্ধারিত মূল বেতন</p>
            </div>
            <div className="bg-card border border-gray-800 rounded-2xl p-4">
              <span className="text-xs text-emerald-400 font-medium block">চলতি মাসে পরিশোধিত</span>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{formatCurrency(totalPaidThisMonth)}</h3>
              <p className="text-[11px] text-gray-500 mt-1">বেতন ও অগ্রিম বাবদ দেওয়া</p>
            </div>
            <div className="bg-card border border-gray-800 rounded-2xl p-4">
              <span className="text-xs text-amber-400 font-medium block">প্রদত্ত অগ্রিম (Advance)</span>
              <h3 className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{formatCurrency(totalAdvanceThisMonth)}</h3>
              <p className="text-[11px] text-gray-500 mt-1">মাসিক বেতনের বিপরীতে অগ্রিম</p>
            </div>
            <div className="bg-card border border-gray-800 rounded-2xl p-4">
              <span className="text-xs text-rose-400 font-medium block">বাকি প্রদেয় বেতন</span>
              <h3 className="text-xl sm:text-2xl font-black text-rose-400 mt-1">{formatCurrency(remainingPayable)}</h3>
              <p className="text-[11px] text-gray-500 mt-1">মাসের অবশিষ্ট পাওনা</p>
            </div>
          </div>

          {/* Staff Salary Balance Table */}
          <div className="bg-card border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/30">
              <h3 className="font-bold text-gray-200 text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                কর্মীদের মাসিক বেতন ও বকেয়া স্ট্যাটাস ({selectedMonth})
              </h3>
            </div>

            {loadingPayroll ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : staffList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">কোনো স্টাফ অ্যাকাউন্ট পাওয়া যায়নি</div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#121524] text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
                      <tr>
                        <th className="px-5 py-3.5">কর্মী</th>
                        <th className="px-5 py-3.5">রোল</th>
                        <th className="px-5 py-3.5">নির্ধারিত মূল বেতন</th>
                        <th className="px-5 py-3.5">গৃহীত অগ্রিম</th>
                        <th className="px-5 py-3.5">পরিশোধিত বেতন</th>
                        <th className="px-5 py-3.5">অবশিষ্ট পাওনা</th>
                        {isManagerOrOwner && <th className="px-5 py-3.5 text-right">পেমেন্ট দিন</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 text-gray-200">
                      {staffList.map((st) => {
                        const cfg = salaryConfigs[st.email];
                        const baseSal = cfg?.baseSalary || st.baseSalary || 0;
                        const summary = payrollService.calculateStaffMonthlySummary(payrollRecords, st.email, selectedMonth, baseSal);

                        return (
                          <tr key={st.email} className="hover:bg-secondary/40 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                                  {st.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold text-white text-sm">{st.name}</p>
                                  <p className="text-xs text-gray-500">{st.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${getRoleBadgeClass(st.role)}`}>
                                {st.role}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-bold text-white text-xs">
                              {formatCurrency(baseSal)}
                            </td>
                            <td className="px-5 py-4 font-semibold text-amber-400 text-xs">
                              {formatCurrency(summary.advancePaid)}
                            </td>
                            <td className="px-5 py-4 font-semibold text-emerald-400 text-xs">
                              {formatCurrency(summary.salaryPaid)}
                            </td>
                            <td className="px-5 py-4 font-black text-rose-400 text-xs">
                              {formatCurrency(summary.balanceDue)}
                            </td>
                            {isManagerOrOwner && (
                              <td className="px-5 py-4 text-right">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setPaymentFormData(prev => ({
                                      ...prev,
                                      staffEmail: st.email,
                                      amount: summary.balanceDue > 0 ? String(summary.balanceDue) : ''
                                    }));
                                    setIsPaymentModalOpen(true);
                                  }}
                                  className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs h-7 px-3"
                                >
                                  প্রদান করুন
                                </Button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden p-3 space-y-3">
                  {staffList.map((st) => {
                    const cfg = salaryConfigs[st.email];
                    const baseSal = cfg?.baseSalary || st.baseSalary || 0;
                    const summary = payrollService.calculateStaffMonthlySummary(payrollRecords, st.email, selectedMonth, baseSal);

                    return (
                      <div key={st.email} className="bg-[#1b1f30]/60 border border-gray-800 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                              {st.avatar ? <img src={st.avatar} className="w-9 h-9 rounded-full object-cover" /> : st.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-gray-200 font-semibold text-sm">{st.name}</div>
                              <div className="text-[11px] text-gray-500">{st.email}</div>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${getRoleBadgeClass(st.role)}`}>
                            {st.role}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-[#121524] p-3 rounded-xl border border-gray-800/80 text-xs">
                          <div>
                            <span className="text-[10px] text-gray-400 block font-medium">মূল বেতন</span>
                            <span className="font-bold text-white text-sm">{formatCurrency(baseSal)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-amber-400 block font-medium">গৃহীত অগ্রিম</span>
                            <span className="font-bold text-amber-400 text-sm">{formatCurrency(summary.advancePaid)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-400 block font-medium">পরিশোধিত</span>
                            <span className="font-bold text-emerald-400 text-sm">{formatCurrency(summary.salaryPaid)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-rose-400 block font-medium">অবশিষ্ট পাওনা</span>
                            <span className="font-black text-rose-400 text-sm">{formatCurrency(summary.balanceDue)}</span>
                          </div>
                        </div>

                        {isManagerOrOwner && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setPaymentFormData(prev => ({
                                ...prev,
                                staffEmail: st.email,
                                amount: summary.balanceDue > 0 ? String(summary.balanceDue) : ''
                              }));
                              setIsPaymentModalOpen(true);
                            }}
                            className="w-full bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs h-9 font-semibold"
                          >
                            পেমেন্ট প্রদান করুন
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Payroll Transaction History Table */}
          <div className="bg-card border border-gray-800 rounded-2xl overflow-hidden shadow-xl mt-8">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/30">
              <h3 className="font-bold text-gray-200 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-400" />
                বেতন পরিশোধের খতিয়ান (Transaction History)
              </h3>
              <span className="text-xs text-gray-400 font-medium">মোট লেনদেন: {payrollRecords.length} টি</span>
            </div>

            {payrollRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">এই মাসে কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি</div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#121524] text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
                      <tr>
                        <th className="px-5 py-3.5">তারিখ</th>
                        <th className="px-5 py-3.5">কর্মী</th>
                        <th className="px-5 py-3.5">পেমেন্টের ধরন</th>
                        <th className="px-5 py-3.5">টাকার পরিমাণ</th>
                        <th className="px-5 py-3.5">পদ্ধতি</th>
                        <th className="px-5 py-3.5">প্রদানকারী</th>
                        <th className="px-5 py-3.5">মন্তব্য</th>
                        {isManagerOrOwner && <th className="px-5 py-3.5 text-right">মুছে ফেলুন</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 text-gray-200">
                      {payrollRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-secondary/40 transition-colors">
                          <td className="px-5 py-4 font-mono text-xs text-gray-400">{r.date}</td>
                          <td className="px-5 py-4 font-medium text-white text-xs">{r.staffName}</td>
                          <td className="px-5 py-4">
                            {(() => {
                              const badge = getPayrollTypeBadge(r.type);
                              return (
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.className}`}>
                                  {badge.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-5 py-4 font-bold text-emerald-400 text-xs">
                            {formatCurrency(r.amount)}
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-400">{r.paymentMethod}</td>
                          <td className="px-5 py-4 text-xs text-gray-400">{r.paidBy}</td>
                          <td className="px-5 py-4 text-xs text-gray-500 italic">{r.note || '-'}</td>
                          {isManagerOrOwner && (
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => setConfirmDeleteModal({
                                  isOpen: true,
                                  type: 'payroll',
                                  id: r.id || null,
                                  title: 'পেমেন্ট রেকর্ড মুছে ফেলবেন?',
                                  message: `আপনি কি নিশ্চিতভাবে ${r.staffName}-এর এই পেমেন্ট রেকর্ডটি মুছে ফেলতে চান?`
                                })}
                                className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden p-3 space-y-3">
                  {payrollRecords.map((r) => (
                    <div key={r.id} className="bg-[#1b1f30]/60 border border-gray-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-xs text-gray-400 block">{r.date}</span>
                          <h5 className="font-semibold text-white text-sm mt-0.5">{r.staffName}</h5>
                        </div>
                        {(() => {
                          const badge = getPayrollTypeBadge(r.type);
                          return (
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.className}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>

                      <div className="flex items-center justify-between bg-[#121524] px-3.5 py-2.5 rounded-xl border border-gray-800/80">
                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">পেমেন্ট মেথড</span>
                          <span className="text-xs text-gray-200 font-medium">{r.paymentMethod}</span>
                          <span className="text-[11px] text-gray-500 block">প্রদানকারী: {r.paidBy}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block font-medium">টাকার পরিমাণ</span>
                          <span className="font-bold text-emerald-400 text-base">{formatCurrency(r.amount)}</span>
                        </div>
                      </div>

                      {r.note && (
                        <p className="text-xs text-gray-400 italic bg-[#121524]/50 p-2 rounded-lg border border-gray-800/40">নোট: {r.note}</p>
                      )}

                      {isManagerOrOwner && (
                        <div className="flex justify-end pt-1 border-t border-gray-800/50">
                          <button
                            onClick={() => setConfirmDeleteModal({
                              isOpen: true,
                              type: 'payroll',
                              id: r.id || null,
                              title: 'পেমেন্ট রেকর্ড মুছে ফেলবেন?',
                              message: `আপনি কি নিশ্চিতভাবে ${r.staffName}-এর এই পেমেন্ট রেকর্ডটি মুছে ফেলতে চান?`
                            })}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 transition-colors font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            রেকর্ড মুছুন
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. ACCOUNTS & ROLES SUB-TAB */}
      {/* ===================================================================== */}
      {subTab === 'accounts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* ADD STAFF FORM */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-gray-800 rounded-2xl p-6 h-fit"
          >
            <div className="flex items-center gap-2 mb-6">
              <UserPlus className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-bold text-gray-200">Add New Staff</h2>
            </div>

            <form onSubmit={onAddStaff} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">Staff Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="email"
                    name="new-staff-email"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-[#1b1f30] border border-gray-800 text-gray-100 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 transition-all" 
                    placeholder="staff@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">Full Name</label>
                <input 
                  type="text"
                  name="new-staff-fullname"
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#1b1f30] border border-gray-800 text-gray-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 transition-all" 
                  placeholder="e.g. Rahim Uddin"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">Login Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="password"
                    name="new-staff-access-pwd"
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#1b1f30] border border-gray-800 text-gray-100 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 transition-all" 
                    placeholder="Minimum 6 characters"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">Role / Position</label>
                <CustomSelect 
                  value={newRole}
                  onChange={(val) => setNewRole(val as UserRole)}
                  options={['Technician', 'Manager', 'Owner']}
                  placeholder="Select Role"
                />
              </div>

              {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
              {success && <p className="text-xs text-green-400 mt-2 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> {success}</p>}

              <button 
                type="submit" 
                disabled={adding}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Authorize Staff
              </button>
            </form>
          </motion.div>

          {/* STAFF LIST */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 bg-card border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-bold text-gray-200">Authorized Personnel</h2>
                <span className="text-xs text-gray-400">অনুমোদিত কর্মী তালিকা ও এক্সেস</span>
              </div>
              <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs font-medium">
                {staffList.length} Accounts
              </span>
            </div>

            {loadingStaff ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="text-gray-500 uppercase tracking-wider border-b border-gray-800">
                        <th className="pb-3 font-medium">Staff Member</th>
                        <th className="pb-3 font-medium">Role</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium text-right">Access Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {staffList.map((staff) => (
                        <tr key={staff.email} className={`transition-colors ${!staff.isActive ? 'opacity-50' : ''}`}>
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                                {staff.avatar ? <img src={staff.avatar} className="w-8 h-8 rounded-full" /> : staff.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-gray-200 font-medium">{staff.name}</div>
                                <div className="text-xs text-gray-500">{staff.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeClass(staff.role)}`}>
                              {staff.role}
                            </span>
                          </td>
                          <td className="py-4">
                            {staff.isActive ? (
                              <span className="text-green-400 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Active</span>
                            ) : (
                              <span className="text-red-400 text-xs flex items-center gap-1"><UserX className="w-3 h-3"/> Blocked</span>
                            )}
                          </td>
                          <td className="py-4 text-right">
                            {staff.email !== currentUser?.email && (currentUser?.role === 'Owner' || staff.role !== 'Owner') && (
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => onToggleAccess(staff.email, staff.isActive)}
                                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                                    staff.isActive 
                                      ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20' 
                                      : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                                  }`}
                                >
                                  {staff.isActive ? 'Block' : 'Restore'}
                                </button>
                                
                                <button 
                                  onClick={() => onDeleteStaff(staff.email)}
                                  className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 p-1.5 rounded-lg transition-colors"
                                  title="Delete Permanently"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {staffList.map((staff) => (
                    <div key={staff.email} className={`bg-[#1b1f30]/60 border border-gray-800 rounded-xl p-4 space-y-3 ${!staff.isActive ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                            {staff.avatar ? <img src={staff.avatar} className="w-9 h-9 rounded-full" /> : staff.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-gray-200 font-medium text-sm">{staff.name}</div>
                            <div className="text-xs text-gray-500">{staff.email}</div>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeClass(staff.role)}`}>
                          {staff.role}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-800/50">
                        <div>
                          {staff.isActive ? (
                            <span className="text-green-400 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Active</span>
                          ) : (
                            <span className="text-red-400 text-xs flex items-center gap-1"><UserX className="w-3 h-3"/> Blocked</span>
                          )}
                        </div>

                        {staff.email !== currentUser?.email && (currentUser?.role === 'Owner' || staff.role !== 'Owner') && (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => onToggleAccess(staff.email, staff.isActive)}
                              className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                                staff.isActive 
                                  ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20' 
                                  : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                              }`}
                            >
                              {staff.isActive ? 'Block' : 'Restore'}
                            </button>
                            
                            <button 
                              onClick={() => onDeleteStaff(staff.email)}
                              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 p-1 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALS */}
      {/* ===================================================================== */}

      {/* 1. Manual Attendance Modal */}
      <Dialog open={isManualAttendanceOpen} onOpenChange={setIsManualAttendanceOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto bg-secondary text-white border-gray-800 shadow-2xl p-4 sm:p-6 rounded-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              উপস্থিতি রেকর্ড যোগ / সংশোধন
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveManualAttendance} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">কর্মী নির্বাচন</label>
              <CustomSelect
                value={manualAttendanceData.userId}
                onChange={(val) => setManualAttendanceData(prev => ({ ...prev, userId: val }))}
                options={staffSelectOptions}
                placeholder="কর্মী নির্বাচন করুন"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">তারিখ</label>
                <input
                  type="date"
                  required
                  value={manualAttendanceData.date}
                  onChange={(e) => setManualAttendanceData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-[#1b1f30] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">স্ট্যাটাস</label>
                <CustomSelect
                  value={manualAttendanceData.status}
                  onChange={(val) => setManualAttendanceData(prev => ({ ...prev, status: val as AttendanceStatus }))}
                  options={['Present', 'Late', 'Half Day', 'Leave', 'Absent']}
                  placeholder="স্ট্যাটাস"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">প্রবেশ সময় (Check-In)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 09:30 AM"
                  value={manualAttendanceData.checkInTime}
                  onChange={(e) => setManualAttendanceData(prev => ({ ...prev, checkInTime: e.target.value }))}
                  className="w-full bg-[#1b1f30] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">প্রস্থান সময় (Check-Out)</label>
                <input
                  type="text"
                  placeholder="e.g. 07:30 PM"
                  value={manualAttendanceData.checkOutTime}
                  onChange={(e) => setManualAttendanceData(prev => ({ ...prev, checkOutTime: e.target.value }))}
                  className="w-full bg-[#1b1f30] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">মন্তব্য (অপশনাল)</label>
              <input
                type="text"
                placeholder="যেমন: বিশেষ অনুমতিতে ছুটি বা দেরি"
                value={manualAttendanceData.note}
                onChange={(e) => setManualAttendanceData(prev => ({ ...prev, note: e.target.value }))}
                className="w-full bg-[#1b1f30] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
              <Button type="button" variant="outline" disabled={submittingAttendance} onClick={() => setIsManualAttendanceOpen(false)} className="border-gray-700 text-xs">
                বাতিল
              </Button>
              <Button type="submit" disabled={submittingAttendance} className="bg-blue-600 hover:bg-blue-500 text-white text-xs flex items-center gap-1.5">
                {submittingAttendance ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    সংরক্ষণ হচ্ছে...
                  </>
                ) : (
                  'সংরক্ষণ করুন'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Payroll Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto bg-secondary text-white border-gray-800 shadow-2xl p-4 sm:p-6 rounded-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              বেতন বা অগ্রিম প্রদান ফর্ম
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePayment} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">কর্মী নির্বাচন</label>
              <CustomSelect
                value={paymentFormData.staffEmail}
                onChange={(val) => setPaymentFormData(prev => ({ ...prev, staffEmail: val }))}
                options={staffSelectOptions}
                placeholder="কর্মী নির্বাচন করুন"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">পেমেন্টের ধরন</label>
                <CustomSelect
                  value={paymentFormData.type}
                  onChange={(val) => setPaymentFormData(prev => ({ ...prev, type: val as PayrollType }))}
                  options={[
                    { label: 'মাসিক বেতন (Salary)', value: 'Salary Payment' },
                    { label: 'অগ্রিম বেতন (Advance)', value: 'Advance Salary' },
                    { label: 'বোনাস (Bonus)', value: 'Bonus' },
                    { label: 'কর্তন (Deduction)', value: 'Deduction' },
                  ]}
                  placeholder="ধরন"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">টাকার পরিমাণ (৳)</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="টাকার অংক"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-[#1b1f30] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">তারিখ</label>
                <input
                  type="date"
                  required
                  value={paymentFormData.date}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-[#1b1f30] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">পেমেন্ট মেথড</label>
                <CustomSelect
                  value={paymentFormData.paymentMethod}
                  onChange={(val) => setPaymentFormData(prev => ({ ...prev, paymentMethod: val as any }))}
                  options={['Cash', 'bKash', 'Nagad', 'Bank']}
                  placeholder="মেথড"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">বিবরণ / নোট</label>
              <input
                type="text"
                placeholder="যেমন: অক্টোবর মাসের নিয়মিত বেতন"
                value={paymentFormData.note}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, note: e.target.value }))}
                className="w-full bg-[#1b1f30] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="p-3 bg-gray-900/40 rounded-xl border border-gray-800">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-300">
                <input
                  type="checkbox"
                  checked={paymentFormData.syncToExpenses}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, syncToExpenses: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500"
                />
                <span>দোকানের খরচের খতিয়ানেও স্বয়ংক্রিয় যোগ করুন (Sync to Expenses)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
              <Button type="button" variant="outline" disabled={submittingPayment} onClick={() => setIsPaymentModalOpen(false)} className="border-gray-700 text-xs">
                বাতিল
              </Button>
              <Button type="submit" disabled={submittingPayment} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5">
                {submittingPayment ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    পেমেন্ট হচ্ছে...
                  </>
                ) : (
                  'পেমেন্ট নিশ্চিত করুন'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Salary Config Modal */}
      <Dialog open={isSalaryConfigModalOpen} onOpenChange={setIsSalaryConfigModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto bg-secondary text-white border-gray-800 shadow-2xl p-4 sm:p-6 rounded-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              কর্মীর মাসিক মূল বেতন নির্ধারণ
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSalaryConfig} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">কর্মী নির্বাচন</label>
              <CustomSelect
                value={salaryConfigFormData.email}
                onChange={(val) => {
                  const cfg = salaryConfigs[val];
                  const st = staffList.find(s => s.email === val);
                  setSalaryConfigFormData({
                    email: val,
                    baseSalary: String(cfg?.baseSalary || st?.baseSalary || ''),
                    phone: cfg?.phone || st?.phone || '',
                    notes: cfg?.notes || ''
                  });
                }}
                options={staffSelectOptions}
                placeholder="কর্মী নির্বাচন করুন"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">মাসিক মূল বেতন (৳)</label>
              <input
                type="number"
                required
                min="0"
                placeholder="যেমন: ১৫০০০"
                value={salaryConfigFormData.baseSalary}
                onChange={(e) => setSalaryConfigFormData(prev => ({ ...prev, baseSalary: e.target.value }))}
                className="w-full bg-[#1b1f30] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">যোগাযোগের ফোন নম্বর</label>
              <input
                type="text"
                placeholder="017xxxxxxxx"
                value={salaryConfigFormData.phone}
                onChange={(e) => setSalaryConfigFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full bg-[#1b1f30] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
              <Button type="button" variant="outline" disabled={submittingSalaryConfig} onClick={() => setIsSalaryConfigModalOpen(false)} className="border-gray-700 text-xs">
                বাতিল
              </Button>
              <Button type="submit" disabled={submittingSalaryConfig} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5">
                {submittingSalaryConfig ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    সংরক্ষণ হচ্ছে...
                  </>
                ) : (
                  'সংরক্ষণ করুন'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attendance Security Modal (GPS & Wi-Fi Lock) */}
      <AttendanceSecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        onSaved={loadSecuritySettings}
      />

      {/* Delete Record Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDeleteModal.isOpen}
        title={confirmDeleteModal.title}
        message={confirmDeleteModal.message}
        confirmText="মুছে ফেলুন"
        onConfirm={executeDeleteRecord}
        onClose={() => setConfirmDeleteModal({ isOpen: false, type: null, id: null, title: '', message: '' })}
      />
    </div>
  );
}
