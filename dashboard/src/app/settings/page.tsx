'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, Lock, Trash2, Mail, Loader2, UserX, Store, Building, Phone, Image as ImageIcon, Save, MapPin, Settings, Download, Upload, Database, FileText, ArrowUpRight, Clock, CreditCard, Award, Globe, Check, Send, Info, ShieldCheck, KeyRound } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { AppUser, UserRole, userService } from '@/lib/services/user';
import { ShopSettings, shopSettingsService, defaultShopSettings } from '@/lib/services/shopSettings';
import { securitySettingsService } from '@/lib/services/securitySettings';
import { hashPin, verifyPin, recordVaultUnlock } from '@/lib/security';
import { telegramService } from '@/lib/services/telegramService';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { backupService } from '@/lib/services/backup';
import { StaffManagementSection } from '@/components/settings/StaffManagementSection';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user: currentUser, shop: globalShop, setShop: setGlobalShop, pin, setPin } = useAppStore();
  const { t, language, setLanguage } = useTranslation();

  // SEC-02: Vault PIN Management State
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [savingPin, setSavingPin] = useState(false);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    // If there is an existing pin, verify the current pin first
    if (pin) {
      if (!currentPinInput) {
        setPinError(language === 'bn' ? 'বর্তমান পিন কোড লিখুন' : 'Please enter current PIN code');
        return;
      }
      const check = await verifyPin(currentPinInput, pin);
      if (!check.valid) {
        setPinError(language === 'bn' ? 'বর্তমান পিন কোডটি সঠিক নয়' : 'Current PIN code is incorrect');
        return;
      }
    }

    // Validate new pin
    const cleanNewPin = newPinInput.trim();
    if (!/^\d{4,6}$/.test(cleanNewPin)) {
      setPinError(language === 'bn' ? 'নতুন পিন কোডটি অবশ্যই ৪ থেকে ৬ ডিজিটের সংখ্যা হতে হবে' : 'New PIN code must be a 4 to 6 digit number');
      return;
    }

    if (cleanNewPin !== confirmPinInput.trim()) {
      setPinError(language === 'bn' ? 'নতুন পিন কোড দুটি মিলছে না!' : 'New PIN codes do not match!');
      return;
    }

    try {
      setSavingPin(true);
      const hashedPin = await hashPin(cleanNewPin);
      await securitySettingsService.savePinHash(hashedPin, currentUser?.email);
      setPin(hashedPin);
      recordVaultUnlock(hashedPin).catch(() => {});
      toast.success(language === 'bn' ? 'ভল্ট পিন সফলভাবে পরিবর্তন ও ক্লাউডে সুরক্ষিত করা হয়েছে!' : 'Vault PIN successfully updated and secured to cloud!');
      setIsChangingPin(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
    } catch (err: any) {
      setPinError(err?.message || (language === 'bn' ? 'পিন সংরক্ষণ করতে সমস্যা হয়েছে' : 'Failed to save PIN'));
    } finally {
      setSavingPin(false);
    }
  };

  const handleLanguageChange = async (newLang: 'bn' | 'en') => {
    if (newLang === language) return;
    setLanguage(newLang);
    const updated = { ...shopForm, language: newLang };
    setShopForm(updated);
    setGlobalShop(updated);
    try {
      await shopSettingsService.saveSettings(updated);
    } catch (e) {
      console.error("Failed to sync language to Firestore:", e);
    }
    toast.success(newLang === 'bn' ? 'ভাষা সফলভাবে বাংলায় পরিবর্তন করা হয়েছে' : 'Language updated to English successfully');
  };

  const handleConfirmAction = async () => {
    const { actionType, payload } = confirmModal;
    if (!actionType) return;
    try {
      if (actionType === 'merge') {
        await executeMergeBackup(payload);
      } else if (actionType === 'wipe') {
        await executeWipeDatabase();
      } else if (actionType === 'deleteStaff') {
        await executeDeleteStaff(payload);
      }
    } finally {
      setConfirmModal({isOpen: false, actionType: null, payload: null});
    }
  };

  const getModalProps = () => {
    switch (confirmModal.actionType) {
      case 'wipe': return { 
        title: language === 'bn' ? "সমস্ত ডেটা মুছে ফেলবেন?" : "Wipe All Data?", 
        message: language === 'bn' ? "সতর্কতা: এটি দোকানের সমস্ত কাস্টমার, স্টক, ট্রানজেকশন, লোন ও খরচের ডেটা স্থায়ীভাবে মুছে ফেলবে। এটি আর ফেরত আনা সম্ভব নয়।" : "CRITICAL WARNING: This will PERMANENTLY DELETE ALL shop data (Customers, Inventory, Transactions, Loans, Expenses). This action is irreversible.", 
        confirmText: language === 'bn' ? "ডেটাবেজ রিসেট করুন" : "Wipe Database",
        requireMatchString: "DELETE"
      };
      case 'deleteStaff': return { 
        title: language === 'bn' ? "স্টাফ সদস্য মুছে ফেলতে চান?" : "Delete Staff Member?", 
        message: language === 'bn' ? "আপনি কি নিশ্চিতভাবে এই স্টাফ অ্যাকাউন্টটি স্থায়ীভাবে মুছে ফেলতে চান? এটি মুছে ফেললে তিনি আর সিস্টেমে লগইন করতে পারবেন না।" : "Are you sure you want to permanently delete this staff account? They will no longer be able to log in.", 
        confirmText: language === 'bn' ? "হ্যাঁ, মুছে ফেলুন" : "Yes, Delete" 
      };
      default: return { title: language === 'bn' ? "নিশ্চিতকরণ" : "Confirm", message: language === 'bn' ? "আপনি কি নিশ্চিত?" : "Are you sure?", confirmText: language === 'bn' ? "নিশ্চিত করুন" : "Confirm" };
    }
  };
  const [activeTab, setActiveTab] = useState<'shop' | 'staff' | 'data'>('shop');
  
  // Shop State
  const [shopForm, setShopForm] = useState<ShopSettings>(globalShop || defaultShopSettings);
  const [savingShop, setSavingShop] = useState(false);
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [sendingSummary, setSendingSummary] = useState(false);

  const handleSaveTelegram = async () => {
    try {
      setSavingTelegram(true);
      await shopSettingsService.saveSettings(shopForm);
      setGlobalShop(shopForm);
      toast.success(language === 'bn' ? 'টেলিগ্রাম সেটিংস সফলভাবে সংরক্ষিত হয়েছে!' : 'Telegram settings saved successfully!');
    } catch (err: any) {
      toast.error(err?.message || (language === 'bn' ? 'টেলিগ্রাম সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে।' : 'Failed to save Telegram settings.'));
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleTestTelegram = async () => {
    const token = shopForm.telegram?.botToken?.trim();
    const chat = shopForm.telegram?.chatId?.trim();
    if (!token || !chat) {
      toast.error(language === 'bn' ? 'অনুগ্রহ করে টেলিগ্রাম বট টোকেন এবং চ্যাট আইডি দুটিই প্রদান করুন।' : 'Please provide both Telegram Bot Token and Chat ID.');
      return;
    }
    try {
      setTestingTelegram(true);
      // Auto-save to Firestore and LocalStorage
      await shopSettingsService.saveSettings(shopForm);
      setGlobalShop(shopForm);

      const res = await telegramService.sendTestMessage(token, chat);
      if (res.success) {
        toast.success(t('settings.telegramCard.testSuccess'));
      } else {
        toast.error(res.error || t('settings.telegramCard.testFailed'));
      }
    } catch (e: any) {
      toast.error(e?.message || t('settings.telegramCard.testFailed'));
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleSendDailySummary = async () => {
    const token = shopForm.telegram?.botToken?.trim();
    const chat = shopForm.telegram?.chatId?.trim();
    if (!token || !chat) {
      toast.error(language === 'bn' ? 'অনুগ্রহ করে টেলিগ্রাম বট টোকেন এবং চ্যাট আইডি প্রদান করুন।' : 'Please provide Telegram Bot Token and Chat ID.');
      return;
    }
    try {
      setSendingSummary(true);
      // Auto-save to Firestore and LocalStorage
      await shopSettingsService.saveSettings(shopForm);
      setGlobalShop(shopForm);

      const res = await telegramService.sendDailySummary(token, chat);
      if (res.success) {
        toast.success(t('settings.telegramCard.summarySuccess'));
      } else {
        toast.error(res.error || t('settings.telegramCard.summaryFailed'));
      }
    } catch (e: any) {
      toast.error(e?.message || t('settings.telegramCard.summaryFailed'));
    } finally {
      setSendingSummary(false);
    }
  };

  // Staff State
  const [staffList, setStaffList] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Technician');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, actionType: 'wipe'|'merge'|'deleteStaff'|null, payload: any}>({isOpen: false, actionType: null, payload: null});
  const [backupLoading, setBackupLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [users, shopData] = await Promise.all([
        userService.getAllUsers(),
        shopSettingsService.getSettings()
      ]);
      setStaffList(users);
      setShopForm(shopData);
      setGlobalShop(shopData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as any;
      if (['shop', 'staff', 'data'].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  const handleExportData = async () => {
    if (currentUser?.role !== 'Owner') {
      return toast.error(language === 'bn' ? "শুধুমাত্র দোকানের মালিক (Owner) ব্যাকআপ ডাউনলোড করতে পারবেন।" : "Only the shop Owner can download backups.");
    }
    try {
      setBackupLoading(true);
      await backupService.exportAllData();
      toast.success(language === 'bn' ? 'সম্পূর্ণ ব্যাকআপ ফাইল ডাউনলোড সম্পন্ন হয়েছে!' : 'Full backup downloaded successfully!');
      setSuccess(language === 'bn' ? 'সম্পূর্ণ ব্যাকআপ ফাইল ডাউনলোড সম্পন্ন হয়েছে!' : 'Full backup downloaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      toast.error(err.message || (language === 'bn' ? 'ডেটা এক্সপোর্ট করতে ব্যর্থ হয়েছে' : 'Failed to export data'));
      setError(err.message || (language === 'bn' ? 'ডেটা এক্সপোর্ট করতে ব্যর্থ হয়েছে' : 'Failed to export data'));
    } finally {
      setBackupLoading(false);
    }
  };

  const handleExportContacts = async () => {
    try {
      setBackupLoading(true);
      await backupService.exportCustomerContactsCSV();
      toast.success(language === 'bn' ? 'কাস্টমার কন্টাক্ট লিস্ট ডাউনলোড হয়েছে!' : 'Customer contacts downloaded successfully!');
      setSuccess(language === 'bn' ? 'কাস্টমার কন্টাক্ট লিস্ট ডাউনলোড হয়েছে!' : 'Customer contacts downloaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      toast.error(err.message || (language === 'bn' ? 'কন্টাক্ট এক্সপোর্ট করতে ব্যর্থ হয়েছে' : 'Failed to export contacts'));
      setError(err.message || (language === 'bn' ? 'কন্টাক্ট এক্সপোর্ট করতে ব্যর্থ হয়েছে' : 'Failed to export contacts'));
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentUser?.role !== 'Owner') {
      return toast.error(language === 'bn' ? "শুধুমাত্র দোকানের মালিক (Owner) ডেটা রিস্টোর করতে পারবেন।" : "Only the shop Owner can restore data.");
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setConfirmModal({isOpen: true, actionType: 'merge', payload: file});
  };

  const executeMergeBackup = async (file: File) => {

    try {
      setBackupLoading(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = event.target?.result as string;
          await backupService.restoreData(json);
          toast.success(language === 'bn' ? 'ডেটা সফলভাবে রিস্টোর হয়েছে!' : 'Data restored successfully!');
          setSuccess(language === 'bn' ? 'ডেটা সফলভাবে রিস্টোর হয়েছে!' : 'Data restored successfully!');
          setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
          toast.error(err.message || (language === 'bn' ? 'ফাইল পার্স বা রিস্টোর করতে ব্যর্থ হয়েছে' : 'Failed to parse or restore file'));
          setError(err.message || (language === 'bn' ? 'ফাইল পার্স বা রিস্টোর করতে ব্যর্থ হয়েছে' : 'Failed to parse or restore file'));
        } finally {
          setBackupLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      toast.error(err.message || (language === 'bn' ? 'ফাইল পড়তে ব্যর্থ হয়েছে' : 'Failed to read file'));
      setError(err.message || (language === 'bn' ? 'ফাইল পড়তে ব্যর্থ হয়েছে' : 'Failed to read file'));
      setBackupLoading(false);
    }
  };

    const handleClearData = async () => {
      if (currentUser?.role !== 'Owner') {
        return toast.error(language === 'bn' ? "শুধুমাত্র দোকানের মালিক (Owner) ডেটাবেজ মুছে ফেলতে পারবেন।" : "Only the shop Owner can wipe the database.");
      }
      setConfirmModal({isOpen: true, actionType: 'wipe', payload: null});
    };

    const executeWipeDatabase = async () => {
    try {
      setBackupLoading(true);
      await backupService.clearAllData();
      toast.success(language === 'bn' ? 'সমস্ত ডেটা সফলভাবে মুছে ফেলা হয়েছে! সিস্টেম প্রস্তুত।' : 'All data wiped successfully! System is ready.');
      setSuccess(language === 'bn' ? 'সমস্ত ডেটা সফলভাবে মুছে ফেলা হয়েছে! সিস্টেম প্রস্তুত।' : 'All data cleared successfully! System is ready for live use.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      toast.error(err.message || (language === 'bn' ? 'ডেটা মুছে ফেলতে ব্যর্থ হয়েছে' : 'Failed to clear data'));
      setError(err.message || (language === 'bn' ? 'ডেটা মুছে ফেলতে ব্যর্থ হয়েছে' : 'Failed to clear data'));
    } finally {
      setBackupLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 500) {
        setError("Logo image must be less than 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setShopForm({ ...shopForm, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveShop = async () => {
    try {
      setSavingShop(true);
      setError(null);
      await shopSettingsService.saveSettings(shopForm);
      setGlobalShop(shopForm);
      setSuccess('Shop settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save shop settings');
    } finally {
      setSavingShop(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setAdding(true);

    try {
      if (!newEmail || !newName || !newPassword) throw new Error("Email, Name, and Password are required");
      if (newPassword.length < 6) throw new Error("Password must be at least 6 characters long.");
      
      const exists = await userService.getUserByEmail(newEmail);
      if (exists) throw new Error("This email is already registered.");

      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.toLowerCase(),
          password: newPassword,
          returnSecureToken: false
        })
      });

      const authData = await res.json();
      if (!res.ok) {
        throw new Error(authData.error?.message || "Failed to create Auth account.");
      }

      const newStaff = await userService.addStaff(newEmail.toLowerCase(), newName, newRole);
      setStaffList([newStaff, ...staffList]);
      
      setSuccess(`${newName} has been added successfully.`);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('Technician');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to add staff");
    } finally {
      setAdding(false);
    }
  };

  const toggleAccess = async (email: string, currentStatus: boolean) => {
    try {
      if (currentUser?.email === email) return; 
      
      setStaffList(prev => prev.map(s => s.email === email ? { ...s, isActive: !currentStatus } : s));
      await userService.updateUser(email, { isActive: !currentStatus });
    } catch (err) {
      console.error(err);
      setStaffList(prev => prev.map(s => s.email === email ? { ...s, isActive: currentStatus } : s));
    }
  };

  const handleDeleteStaff = (email: string) => {
    if (currentUser?.email?.toLowerCase() === email?.toLowerCase()) {
      toast.error(language === 'bn' ? "আপনি নিজের অ্যাকাউন্ট মুছতে পারবেন না।" : "You cannot delete your own account.");
      return;
    }
    const targetUser = staffList.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (targetUser?.role === 'Owner' && currentUser?.role !== 'Owner') {
      toast.error(language === 'bn' ? "মালিকের (Owner) অ্যাকাউন্ট শুধুমাত্র অন্য মালিক মুছে ফেলতে পারেন।" : "Only an Owner can delete an Owner account.");
      return;
    }
    setConfirmModal({
      isOpen: true,
      actionType: 'deleteStaff',
      payload: email
    });
  };

  const executeDeleteStaff = async (email: string) => {
    try {
      if (currentUser?.email?.toLowerCase() === email?.toLowerCase()) {
        toast.error(language === 'bn' ? "নিজের অ্যাকাউন্ট মোছা সম্ভব নয়।" : "Cannot delete your own account.");
        return;
      }
      const targetUser = staffList.find(s => s.email.toLowerCase() === email.toLowerCase());
      if (targetUser?.role === 'Owner' && currentUser?.role !== 'Owner') {
        toast.error(language === 'bn' ? "মালিকের অ্যাকাউন্ট মোছার অনুমতি আপনার নেই।" : "You do not have permission to delete an Owner account.");
        return;
      }
      await userService.deleteUser(email);
      setStaffList(prev => prev.filter(s => s.email.toLowerCase() !== email.toLowerCase()));
      toast.success(language === 'bn' ? "স্টাফ সফলভাবে মুছে ফেলা হয়েছে" : "Staff member deleted successfully");
    } catch (err) {
      console.error("Failed to delete user", err);
      toast.error(language === 'bn' ? "স্টাফ মুছতে সমস্যা হয়েছে। আবার চেষ্টা করুন।" : "Failed to delete staff member. Please try again.");
    }
  };

  if (currentUser?.role !== 'Owner' && currentUser?.role !== 'Manager') {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <Lock className="w-16 h-16 text-red-500/50 mb-4" />
        <h2 className="text-2xl font-bold text-gray-200">Access Denied</h2>
        <p className="text-gray-500 mt-2">You do not have permission to view shop settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">

      <div className="grid grid-cols-3 sm:flex bg-[#131622] p-1 sm:p-1.5 rounded-2xl border border-gray-800/80 gap-1 sm:gap-2 mb-6 scrollbar-none">
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-2 sm:px-5 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all select-none text-center ${
            activeTab === 'shop'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 font-bold'
              : 'text-gray-400 hover:text-white hover:bg-secondary/40'
          }`}
        >
          <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">{t('settings.tabs.shop')}</span>
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-2 sm:px-5 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all select-none text-center ${
            activeTab === 'staff'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 font-bold'
              : 'text-gray-400 hover:text-white hover:bg-secondary/40'
          }`}
        >
          <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">{t('settings.tabs.staff')}</span>
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-2 sm:px-5 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all select-none text-center ${
            activeTab === 'data'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 font-bold'
              : 'text-gray-400 hover:text-white hover:bg-secondary/40'
          }`}
        >
          <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">{t('settings.tabs.data')}</span>
        </button>
      </div>

      {activeTab === 'staff' && (
        <StaffManagementSection
          staffList={staffList}
          onRefreshStaff={loadData}
          onDeleteStaff={handleDeleteStaff}
          onToggleAccess={toggleAccess}
          onAddStaff={handleAddStaff}
          newEmail={newEmail}
          setNewEmail={setNewEmail}
          newName={newName}
          setNewName={setNewName}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          newRole={newRole}
          setNewRole={setNewRole}
          adding={adding}
          error={error}
          success={success}
          loadingStaff={loading}
        />
      )}

      {activeTab === 'shop' && (
        <div className="space-y-6">
          {/* Shop Information Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-gray-800 rounded-2xl p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
              <Building className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-white">{t('settings.shopInfo.title')}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.shopInfo.shortName')}</label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text" 
                    name="shop-short-name"
                    id="shop-short-name"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    value={shopForm.shopName}
                    onChange={(e) => setShopForm({ ...shopForm, shopName: e.target.value })}
                    className="w-full bg-popover border border-gray-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50" 
                    placeholder={language === 'bn' ? "যেমন: দোকানের নাম" : "e.g. Shop Name"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.shopInfo.fullTitle')}</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text" 
                    name="shop-full-title"
                    id="shop-full-title"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    value={shopForm.shopTitle}
                    onChange={(e) => setShopForm({ ...shopForm, shopTitle: e.target.value })}
                    className="w-full bg-popover border border-gray-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50" 
                    placeholder={language === 'bn' ? "যেমন: ইলেকট্রনিক্স সার্ভিসিং সেন্টার" : "e.g. Electronics Servicing Center"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.shopInfo.logo')}</label>
                <div className="flex items-center gap-4">
                  {shopForm.logoUrl ? (
                    <div className="relative group">
                      <img src={shopForm.logoUrl} alt="Logo Preview" width={48} height={48} className="w-12 h-12 rounded-xl object-contain" />
                      <button 
                        type="button"
                        onClick={() => setShopForm({ ...shopForm, logoUrl: '' })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        title={language === 'bn' ? "লোগো মুছুন" : "Remove Logo"}
                        aria-label={language === 'bn' ? "লোগো মুছুন" : "Remove Logo"}
                      >
                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-popover border border-gray-800 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 relative">
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg"
                      onChange={handleLogoUpload}
                      className="w-full bg-popover border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-500 hover:file:bg-blue-500/20 cursor-pointer focus:outline-none focus:border-blue-500/50" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.shopInfo.phone')}</label>
                <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <span className="absolute left-10 top-1/2 -translate-y-1/2 font-medium text-gray-300 pointer-events-none">+880</span>
                    <input 
                      type="tel"
                      maxLength={11}
                      name="shop-contact-telephone"
                      id="shop-contact-telephone"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                      value={shopForm.phone ? shopForm.phone.replace(/^\+880/, '') : ''}
                      onChange={(e) => {
                        let digits = e.target.value.replace(/\D/g, ''); 
                        if (digits.startsWith('0')) digits = digits.substring(1);
                        if (digits.length > 10) digits = digits.substring(0, 10);
                        setShopForm({ ...shopForm, phone: '+880' + digits });
                      }}
                      className="w-full bg-popover border border-gray-800 text-white rounded-xl pl-[76px] pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50" 
                      placeholder="1711000000"
                    />
                  </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.shopInfo.ownerName')}</label>
                <div className="relative">
                  <UserX className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text" 
                    name="shop-owner-fullname"
                    id="shop-owner-fullname"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    value={shopForm.ownerName}
                    onChange={(e) => setShopForm({ ...shopForm, ownerName: e.target.value })}
                    className="w-full bg-popover border border-gray-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50" 
                    placeholder={language === 'bn' ? "মালিকের নাম" : "Owner's Name"}
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.shopInfo.address')}</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 w-4 h-4 text-gray-500" />
                  <textarea 
                    name="shop-full-physical-address"
                    id="shop-full-physical-address"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    value={shopForm.address}
                    onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })}
                    className="w-full bg-popover border border-gray-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 h-24 resize-none" 
                    placeholder={language === 'bn' ? "দোকানের সম্পূর্ণ ঠিকানা…" : "Full shop address…"}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end border-t border-gray-800 pt-6">
              <button
                onClick={handleSaveShop}
                disabled={savingShop}
                className="w-full md:w-auto justify-center bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-70"
              >
                {savingShop ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('settings.shopInfo.saveButton')}
              </button>
            </div>
          </motion.div>

          {/* Telegram Notifications Card (Personal Alerts for Owner) */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-gray-800 rounded-2xl p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Send className="w-5 h-5 -rotate-12" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    {t('settings.telegramCard.title')}
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Private Alert
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">{t('settings.telegramCard.description')}</p>
                </div>
              </div>

              {/* Master Toggle */}
              <label className="flex items-center gap-3 cursor-pointer self-start sm:self-auto select-none">
                <span className="text-xs font-medium text-gray-300">
                  {shopForm.telegram?.enabled ? (language === 'bn' ? 'সক্রিয় (Active)' : 'Active') : (language === 'bn' ? 'নিষ্ক্রিয় (Disabled)' : 'Disabled')}
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(shopForm.telegram?.enabled)}
                  onChange={(e) => {
                    const currentTg = shopForm.telegram || {
                      enabled: false,
                      botToken: '',
                      chatId: '',
                      notifyOnSale: true,
                      notifyOnPayment: true,
                      notifyOnExpense: true,
                      notifyOnLowStock: true,
                    };
                    setShopForm({
                      ...shopForm,
                      telegram: { ...currentTg, enabled: e.target.checked }
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:bg-blue-600 relative"></div>
              </label>
            </div>

            {/* Privacy Notice Banner */}
            <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/20 flex items-start gap-3 text-xs text-sky-300/90 leading-relaxed">
              <Shield className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>{t('settings.telegramCard.privacyNotice')}</span>
            </div>

            {/* Inputs: Bot Token & Chat ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{t('settings.telegramCard.botToken')}</span>
                </label>
                <input
                  type="text"
                  value={shopForm.telegram?.botToken || ''}
                  onChange={(e) => {
                    const currentTg = shopForm.telegram || {
                      enabled: false,
                      botToken: '',
                      chatId: '',
                      notifyOnSale: true,
                      notifyOnPayment: true,
                      notifyOnExpense: true,
                      notifyOnLowStock: true,
                    };
                    setShopForm({
                      ...shopForm,
                      telegram: { ...currentTg, botToken: e.target.value }
                    });
                  }}
                  placeholder={t('settings.telegramCard.botTokenPlaceholder')}
                  className="w-full bg-popover border border-gray-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{t('settings.telegramCard.chatId')}</span>
                </label>
                <input
                  type="text"
                  value={shopForm.telegram?.chatId || ''}
                  onChange={(e) => {
                    const currentTg = shopForm.telegram || {
                      enabled: false,
                      botToken: '',
                      chatId: '',
                      notifyOnSale: true,
                      notifyOnPayment: true,
                      notifyOnExpense: true,
                      notifyOnLowStock: true,
                    };
                    setShopForm({
                      ...shopForm,
                      telegram: { ...currentTg, chatId: e.target.value }
                    });
                  }}
                  placeholder={t('settings.telegramCard.chatIdPlaceholder')}
                  className="w-full bg-popover border border-gray-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 font-mono text-xs"
                />
              </div>
            </div>

            {/* Event Specific Checkboxes */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                {t('settings.telegramCard.eventsTitle')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-300">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-popover/50 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={shopForm.telegram?.notifyOnCustomerCreate !== false}
                    onChange={(e) => {
                      const currentTg = shopForm.telegram || { enabled: false, botToken: '', chatId: '' };
                      setShopForm({
                        ...shopForm,
                        telegram: { ...currentTg, notifyOnCustomerCreate: e.target.checked }
                      });
                    }}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700 focus:ring-0"
                  />
                  <span className="text-xs font-medium">{t('settings.telegramCard.notifyOnCustomerCreate')}</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-popover/50 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={shopForm.telegram?.notifyOnSale !== false}
                    onChange={(e) => {
                      const currentTg = shopForm.telegram || { enabled: false, botToken: '', chatId: '' };
                      setShopForm({
                        ...shopForm,
                        telegram: { ...currentTg, notifyOnSale: e.target.checked }
                      });
                    }}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700 focus:ring-0"
                  />
                  <span className="text-xs font-medium">{t('settings.telegramCard.notifyOnSale')}</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-popover/50 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={shopForm.telegram?.notifyOnPayment !== false}
                    onChange={(e) => {
                      const currentTg = shopForm.telegram || { enabled: false, botToken: '', chatId: '' };
                      setShopForm({
                        ...shopForm,
                        telegram: { ...currentTg, notifyOnPayment: e.target.checked }
                      });
                    }}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700 focus:ring-0"
                  />
                  <span className="text-xs font-medium">{t('settings.telegramCard.notifyOnPayment')}</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-popover/50 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={shopForm.telegram?.notifyOnStatusChange !== false}
                    onChange={(e) => {
                      const currentTg = shopForm.telegram || { enabled: false, botToken: '', chatId: '' };
                      setShopForm({
                        ...shopForm,
                        telegram: { ...currentTg, notifyOnStatusChange: e.target.checked }
                      });
                    }}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700 focus:ring-0"
                  />
                  <span className="text-xs font-medium">{t('settings.telegramCard.notifyOnStatusChange')}</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-popover/50 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={shopForm.telegram?.notifyOnExpense !== false}
                    onChange={(e) => {
                      const currentTg = shopForm.telegram || { enabled: false, botToken: '', chatId: '' };
                      setShopForm({
                        ...shopForm,
                        telegram: { ...currentTg, notifyOnExpense: e.target.checked }
                      });
                    }}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700 focus:ring-0"
                  />
                  <span className="text-xs font-medium">{t('settings.telegramCard.notifyOnExpense')}</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-popover/50 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={shopForm.telegram?.notifyOnLowStock !== false}
                    onChange={(e) => {
                      const currentTg = shopForm.telegram || { enabled: false, botToken: '', chatId: '' };
                      setShopForm({
                        ...shopForm,
                        telegram: { ...currentTg, notifyOnLowStock: e.target.checked }
                      });
                    }}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700 focus:ring-0"
                  />
                  <span className="text-xs font-medium">{t('settings.telegramCard.notifyOnLowStock')}</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-popover/50 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={shopForm.telegram?.notifyOnAttendance !== false}
                    onChange={(e) => {
                      const currentTg = shopForm.telegram || { enabled: false, botToken: '', chatId: '' };
                      setShopForm({
                        ...shopForm,
                        telegram: { ...currentTg, notifyOnAttendance: e.target.checked }
                      });
                    }}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700 focus:ring-0"
                  />
                  <span className="text-xs font-medium">{t('settings.telegramCard.notifyOnAttendance')}</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-popover/50 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={shopForm.telegram?.notifyOnSupplier !== false}
                    onChange={(e) => {
                      const currentTg = shopForm.telegram || { enabled: false, botToken: '', chatId: '' };
                      setShopForm({
                        ...shopForm,
                        telegram: { ...currentTg, notifyOnSupplier: e.target.checked }
                      });
                    }}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700 focus:ring-0"
                  />
                  <span className="text-xs font-medium">{t('settings.telegramCard.notifyOnSupplier')}</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-popover/50 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={shopForm.telegram?.notifyOnSecurity !== false}
                    onChange={(e) => {
                      const currentTg = shopForm.telegram || { enabled: false, botToken: '', chatId: '' };
                      setShopForm({
                        ...shopForm,
                        telegram: { ...currentTg, notifyOnSecurity: e.target.checked }
                      });
                    }}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700 focus:ring-0"
                  />
                  <span className="text-xs font-medium">{t('settings.telegramCard.notifyOnSecurity')}</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-popover/50 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={shopForm.telegram?.notifyOnDailySummary !== false}
                    onChange={(e) => {
                      const currentTg = shopForm.telegram || { enabled: false, botToken: '', chatId: '' };
                      setShopForm({
                        ...shopForm,
                        telegram: { ...currentTg, notifyOnDailySummary: e.target.checked }
                      });
                    }}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700 focus:ring-0"
                  />
                  <span className="text-xs font-medium">{t('settings.telegramCard.notifyOnDailySummary')}</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-popover/50 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={shopForm.telegram?.notifyOnLoan !== false}
                    onChange={(e) => {
                      const currentTg = shopForm.telegram || { enabled: false, botToken: '', chatId: '' };
                      setShopForm({
                        ...shopForm,
                        telegram: { ...currentTg, notifyOnLoan: e.target.checked }
                      });
                    }}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700 focus:ring-0"
                  />
                  <span className="text-xs font-medium">{t('settings.telegramCard.notifyOnLoan')}</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-popover/50 border border-gray-800/80 cursor-pointer hover:border-gray-700 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={shopForm.telegram?.notifyOnBackup !== false}
                    onChange={(e) => {
                      const currentTg = shopForm.telegram || { enabled: false, botToken: '', chatId: '' };
                      setShopForm({
                        ...shopForm,
                        telegram: { ...currentTg, notifyOnBackup: e.target.checked }
                      });
                    }}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700 focus:ring-0"
                  />
                  <span className="text-xs font-medium">{t('settings.telegramCard.notifyOnBackup')}</span>
                </label>
              </div>
            </div>

            {/* Quick Setup Guide accordion */}
            <details className="group rounded-xl border border-gray-800 bg-popover/30 p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between font-medium text-xs text-blue-400 hover:text-blue-300">
                <span className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  {t('settings.telegramCard.guideTitle')}
                </span>
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <div className="mt-3 space-y-2 text-xs text-gray-400 pl-6 border-l-2 border-blue-500/30">
                <p>{t('settings.telegramCard.guideStep1')}</p>
                <p>{t('settings.telegramCard.guideStep2')}</p>
                <p>{t('settings.telegramCard.guideStep3')}</p>
              </div>
            </details>

            {/* Action Bar: Test Message & Summary Trigger */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-500 text-center sm:text-left">
                {language === 'bn' ? 'টোকেন ও আইডি লিখে নিচের সেভ বাটনে ক্লিক করুন। টেস্ট বা সামারি পাঠালেও তা স্বয়ংক্রিয়ভাবে সেভ হয়ে যাবে।' : 'Click Save Settings below to store credentials. Sending test or summary also auto-saves.'}
              </p>
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveTelegram}
                  disabled={savingTelegram}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {savingTelegram ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      <span>{language === 'bn' ? 'সংরক্ষণ হচ্ছে…' : 'Saving…'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'টেলিগ্রাম সেটিংস সেভ করুন' : 'Save Telegram Settings'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSendDailySummary}
                  disabled={sendingSummary || !shopForm.telegram?.botToken || !shopForm.telegram?.chatId}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingSummary ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('settings.telegramCard.summarySending')}</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" />
                      <span>{t('settings.telegramCard.summaryButton')}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={testingTelegram || !shopForm.telegram?.botToken || !shopForm.telegram?.chatId}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-medium text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testingTelegram ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('settings.telegramCard.testSending')}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{t('settings.telegramCard.testButton')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* SEC-02: Vault PIN Security Card (Owner Only) */}
          {currentUser?.role === 'Owner' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-gray-800 rounded-2xl p-6 lg:p-8">
              <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {language === 'bn' ? 'ভল্ট পিন ও কাউন্টার নিরাপত্তা' : 'Vault PIN & Counter Security'}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {language === 'bn' 
                        ? 'পিসিতে ক্যাশ কাউন্টার ও ওনার স্ক্রিন লক করার জন্য ৪-৬ ডিজিটের পিন কোড (SHA-256 এনক্রিপ্টেড)' 
                        : '4-6 digit PIN code (SHA-256 encrypted) to lock cash counter and owner screen on PC'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    pin ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {pin 
                      ? (language === 'bn' ? '✓ সক্রিয় ও সুরক্ষিত' : '✓ Active & Protected') 
                      : (language === 'bn' ? '⚠ পিন সেট করা নেই' : '⚠ PIN Not Set')}
                  </span>
                </div>
              </div>

              {!isChangingPin ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#1b1f30] border border-gray-800">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-200">
                      {pin 
                        ? (language === 'bn' ? 'আপনার অ্যাকাউন্টে একটি মাস্টার ভল্ট পিন সক্রিয় রয়েছে।' : 'A master vault PIN is active on your account.') 
                        : (language === 'bn' ? 'আপনার অ্যাকাউন্টে এখনো কোনো ভল্ট পিন সেট করা হয়নি।' : 'No vault PIN has been set on your account yet.')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {language === 'bn' 
                        ? 'ডেস্কটপ ব্রাউজারে ক্যাশ কাউন্টার ছেড়ে যাওয়ার আগে সাইডবার থেকে "Lock Screen" চাপলেই এই পিন দিয়ে স্ক্রিন লক থাকবে।' 
                        : 'Before stepping away from the counter on desktop, click "Lock Screen" in sidebar to lock screen behind this PIN.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPin(true);
                      setPinError(null);
                      setCurrentPinInput('');
                      setNewPinInput('');
                      setConfirmPinInput('');
                    }}
                    className="shrink-0 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    {pin 
                      ? (language === 'bn' ? 'পিন পরিবর্তন করুন' : 'Change PIN') 
                      : (language === 'bn' ? 'নতুন পিন সেট করুন' : 'Set New PIN')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleUpdatePin} className="space-y-4 p-5 rounded-2xl bg-[#1b1f30] border border-gray-800">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-800/80">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-blue-400" />
                      {pin 
                        ? (language === 'bn' ? 'ভল্ট পিন পরিবর্তন' : 'Change Vault PIN') 
                        : (language === 'bn' ? 'নতুন ভল্ট পিন সেট' : 'Set New Vault PIN')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsChangingPin(false)}
                      className="text-xs text-gray-400 hover:text-gray-200"
                    >
                      {language === 'bn' ? 'বাতিল' : 'Cancel'}
                    </button>
                  </div>

                  {pinError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs sm:text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{pinError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {pin && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {language === 'bn' ? 'বর্তমান পিন' : 'Current PIN'}
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={6}
                          required
                          value={currentPinInput}
                          onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                          placeholder={language === 'bn' ? 'বর্তমান পিন' : 'Current PIN'}
                          className="w-full bg-popover border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {language === 'bn' ? 'নতুন পিন (৪-৬ ডিজিট)' : 'New PIN (4-6 digits)'}
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                        placeholder={language === 'bn' ? '৪-৬ ডিজিট' : '4-6 digits'}
                        className="w-full bg-popover border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {language === 'bn' ? 'নতুন পিন নিশ্চিত করুন' : 'Confirm New PIN'}
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        value={confirmPinInput}
                        onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                        placeholder={language === 'bn' ? 'পুনরায় লিখুন' : 'Re-enter PIN'}
                        className="w-full bg-popover border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsChangingPin(false)}
                      disabled={savingPin}
                      className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                      {language === 'bn' ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={savingPin}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      {savingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {language === 'bn' ? 'পিন সংরক্ষণ করুন' : 'Save PIN'}
                    </button>
                  </div>
                </form>
              )}

              {/* Idle Auto-Lock Configuration */}
              <div className="border-t border-gray-800/80 pt-6 mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
                        {language === 'bn' ? 'নিষ্ক্রিয় অবস্থায় অটো-লক (Idle Auto-Lock)' : 'Idle Auto-Lock'}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {language === 'bn' 
                          ? 'পিসিতে কাজ না থাকলে কতক্ষণ পর স্বয়ংক্রিয়ভাবে স্ক্রিন লক হবে তা নির্ধারণ করুন।' 
                          : 'Set how long before the screen automatically locks when idle.'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      (shopForm.autoLockMinutes ?? 5) > 0 
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                        : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                    }`}>
                      {(shopForm.autoLockMinutes ?? 5) > 0
                        ? (language === 'bn' ? `⏱ ${shopForm.autoLockMinutes ?? 5} মিনিট পর লক হবে` : `⏱ Locks after ${shopForm.autoLockMinutes ?? 5} min`)
                        : (language === 'bn' ? '🔓 শুধুমাত্র ম্যানুয়াল লক' : '🔓 Manual Lock Only')}
                    </span>
                  </div>
                </div>

                {/* Preset Options Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {[
                    { value: 1, labelBn: '১ মিনিট', labelEn: '1 Min', descBn: 'দ্রুততম' },
                    { value: 3, labelBn: '৩ মিনিট', labelEn: '3 Min', descBn: 'কম সময়' },
                    { value: 5, labelBn: '৫ মিনিট', labelEn: '5 Min', descBn: 'প্রস্তাবিত' },
                    { value: 10, labelBn: '১০ মিনিট', labelEn: '10 Min', descBn: 'স্বাভাবিক' },
                    { value: 15, labelBn: '১৫ মিনিট', labelEn: '15 Min', descBn: 'মাঝারি' },
                    { value: 30, labelBn: '৩০ মিনিট', labelEn: '30 Min', descBn: 'বেশি সময়' },
                    { value: 0, labelBn: 'কখনই না', labelEn: 'Never', descBn: 'ম্যানুয়াল' },
                  ].map((opt) => {
                    const isSelected = (shopForm.autoLockMinutes ?? 5) === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={async () => {
                          const updated = { ...shopForm, autoLockMinutes: opt.value };
                          setShopForm(updated);
                          setGlobalShop(updated);
                          try {
                            await shopSettingsService.saveSettings(updated);
                            toast.success(
                              language === 'bn' 
                                ? (opt.value === 0 ? 'ম্যানুয়াল লক মোড সক্রিয় করা হয়েছে' : `অটো-লক সময় ${opt.labelBn} সেট করা হয়েছে`) 
                                : (opt.value === 0 ? 'Manual lock only mode active' : `Auto-lock timeout set to ${opt.labelEn}`)
                            );
                          } catch (e) {
                            toast.error(language === 'bn' ? 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে' : 'Failed to save setting');
                          }
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm shadow-blue-500/20 ring-1 ring-blue-500'
                            : 'bg-[#1b1f30] border-gray-800 text-gray-300 hover:border-gray-700 hover:bg-[#20253a]'
                        }`}
                      >
                        <span className="text-xs font-bold">{language === 'bn' ? opt.labelBn : opt.labelEn}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">{opt.descBn}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Helpful Guide Notice */}
                <div className="mt-3.5 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-start gap-2.5 text-xs text-gray-400">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-gray-300 font-medium">
                      {language === 'bn' ? 'স্মার্ট কাউন্টার নিরাপত্তা কার্যপদ্ধতি:' : 'Smart Counter Security Operation:'}
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                      <li>
                        {language === 'bn'
                          ? 'আপনি সক্রিয় থাকলে হার্ড রিফ্রেশ (Ctrl+F5) বা পেজ রিলোড দিলেও বারবার পিন চাওয়া হবে না।'
                          : 'While active, refreshing the page (Ctrl+F5) will not prompt for PIN repeatedly.'}
                      </li>
                      <li>
                        {language === 'bn'
                          ? 'কম্পিউটার ছেড়ে গেলে নির্ধারিত সময় নিষ্ক্রিয় থাকলে ভল্ট পিন দিয়ে স্বয়ংক্রিয়ভাবে লক হয়ে যাবে।'
                          : 'Screen will lock automatically behind your Vault PIN after the configured idle duration.'}
                      </li>
                      <li>
                        {language === 'bn'
                          ? 'তাৎক্ষণিক লক করতে চাইলে যেকোনো সময় সাইডবারের নিচে "Lock Screen" বাটনে ক্লিক করতে পারেন।'
                          : 'Click "Lock Screen" in the sidebar at any time to lock immediately.'}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Language Selection Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-gray-800 rounded-2xl p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
              <Globe className="w-5 h-5 text-blue-400" />
              <div>
                <h2 className="text-lg font-semibold text-white">{t('settings.languageCard.title')}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{t('settings.languageCard.description')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bangla Option */}
              <button
                type="button"
                onClick={() => handleLanguageChange('bn')}
                className={`relative flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                  language === 'bn'
                    ? 'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-500/10'
                    : 'bg-popover border-gray-800 hover:border-gray-700 text-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    language === 'bn' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                  }`}>
                    বাং
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{t('settings.languageCard.bangla')}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{t('settings.languageCard.banglaSub')}</p>
                  </div>
                </div>
                {language === 'bn' && (
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>

              {/* English Option */}
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`relative flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                  language === 'en'
                    ? 'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-500/10'
                    : 'bg-popover border-gray-800 hover:border-gray-700 text-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                  }`}>
                    EN
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{t('settings.languageCard.english')}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{t('settings.languageCard.englishSub')}</p>
                  </div>
                </div>
                {language === 'en' && (
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {activeTab === 'data' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-gray-800 rounded-2xl p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
            <Database className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">{t('settings.dataBackup.title')}</h2>
          </div>

          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm">{success}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-[#1b1f30] p-6 rounded-xl border border-gray-800/80 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg"><Download className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-semibold text-gray-200">{t('settings.dataBackup.fullBackup')}</h3>
                  <p className="text-xs text-gray-500">{t('settings.dataBackup.fullBackupDesc')}</p>
                </div>
              </div>
              <button 
                onClick={handleExportData}
                disabled={backupLoading}
                className="w-full py-2.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2"
              >
                {backupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {t('settings.dataBackup.fullBackup')} (JSON)
              </button>
            </div>

            <div className="bg-[#1b1f30] p-6 rounded-xl border border-gray-800/80 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 text-green-400 rounded-lg"><FileText className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-semibold text-gray-200">{t('settings.dataBackup.contacts')}</h3>
                  <p className="text-xs text-gray-500">{t('settings.dataBackup.contactsDesc')}</p>
                </div>
              </div>
              <button 
                onClick={handleExportContacts}
                disabled={backupLoading}
                className="w-full py-2.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2"
              >
                {backupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {t('settings.dataBackup.contacts')} (CSV)
              </button>
            </div>

            <div className="bg-[#1b1f30] p-6 rounded-xl border border-gray-800/80 space-y-4 md:col-span-2 mt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-500/10 text-orange-400 rounded-lg"><Upload className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-semibold text-gray-200">{t('settings.dataBackup.restore')}</h3>
                  <p className="text-xs text-gray-500">{t('settings.dataBackup.restoreDesc')}</p>
                </div>
              </div>
              
              <div className="relative">
                <input 
                  type="file" 
                  accept=".json"
                  onChange={handleRestoreData}
                  disabled={backupLoading}
                  className="w-full bg-popover border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-500/10 file:text-orange-500 hover:file:bg-orange-500/20 cursor-pointer focus:outline-none focus:border-orange-500/50" 
                />
              </div>
            </div>

            {currentUser?.role === 'Owner' && (
              <div className="bg-red-500/5 p-6 rounded-xl border border-red-500/20 space-y-4 md:col-span-2 mt-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-500/10 text-red-400 rounded-lg"><AlertTriangle className="w-5 h-5" /></div>
                  <div>
                    <h3 className="font-semibold text-red-400">
                      {language === 'bn' ? 'বিপদজনক অঞ্চল: ডেটাবেজ রিসেট' : 'Danger Zone: Wipe Database'}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {language === 'bn' 
                        ? 'সমস্ত কাস্টমার, স্টক, ট্রানজেকশন ও লোন ডেটা স্থায়ীভাবে মুছে ফেলুন। এই কাজটি পুনরায় ফিরিয়ে আনা সম্ভব নয়।' 
                        : 'Permanently wipe all customers, stock, transactions and loans data. This action cannot be undone.'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleClearData}
                  disabled={backupLoading}
                  className="w-full sm:w-auto py-2.5 px-6 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {language === 'bn' ? 'Wipe All Data (রিসেট ডেটাবেজ)' : 'Wipe All Data (Factory Reset)'}
                </button>
              </div>
            )}

          </div>
        </motion.div>
      )}

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({isOpen: false, actionType: null, payload: null})}
        onConfirm={handleConfirmAction}
        title={getModalProps().title}
        message={getModalProps().message}
        confirmText={getModalProps().confirmText}
        requireMatchString={(getModalProps() as any).requireMatchString}
        variant={confirmModal.actionType === 'wipe' ? 'danger' : 'warning'}
      />
    </div>
  );
}











