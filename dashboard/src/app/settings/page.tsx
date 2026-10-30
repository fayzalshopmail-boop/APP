'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, UserPlus, Lock, CheckCircle, Trash2, Mail, Loader2, UserX, Store, Building, Phone, Image as ImageIcon, Save, MapPin, Settings, Download, Upload, Database, FileText, ArrowUpRight, Clock, CreditCard, Award, Globe, Check } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { AppUser, UserRole, userService } from '@/lib/services/user';
import { ShopSettings, shopSettingsService, defaultShopSettings } from '@/lib/services/shopSettings';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { backupService } from '@/lib/services/backup';
import { StaffManagementSection } from '@/components/settings/StaffManagementSection';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user: currentUser, shop: globalShop, setShop: setGlobalShop } = useAppStore();
  const { t, language, setLanguage } = useTranslation();

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
        title: "Wipe All Data?", 
        message: "CRITICAL WARNING: This will PERMANENTLY DELETE ALL shop data (Customers, Inventory, Transactions, Loans, Expenses). This action is irreversible.", 
        confirmText: "Wipe Database",
        requireMatchString: "DELETE"
      };
      case 'deleteStaff': return { 
        title: "স্টাফ সদস্য মুছে ফেলতে চান?", 
        message: "আপনি কি নিশ্চিতভাবে এই স্টাফ অ্যাকাউন্টটি স্থায়ীভাবে মুছে ফেলতে চান? এটি মুছে ফেললে তিনি আর সিস্টেমে লগইন করতে পারবেন না।", 
        confirmText: "হ্যাঁ, মুছে ফেলুন" 
      };
      default: return { title: "Confirm", message: "Are you sure?", confirmText: "Confirm" };
    }
  };
  const [activeTab, setActiveTab] = useState<'shop' | 'staff' | 'data'>('shop');
  
  // Shop State
  const [shopForm, setShopForm] = useState<ShopSettings>(globalShop || defaultShopSettings);
  const [savingShop, setSavingShop] = useState(false);

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
      return toast.error("শুধুমাত্র দোকানের মালিক (Owner) ব্যাকআপ ডাউনলোড করতে পারবেন।");
    }
    try {
      setBackupLoading(true);
      await backupService.exportAllData();
      toast.success('Full backup downloaded successfully!');
      setSuccess('Full backup downloaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to export data');
      setError(err.message || 'Failed to export data');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleExportContacts = async () => {
    try {
      setBackupLoading(true);
      await backupService.exportCustomerContactsCSV();
      toast.success('Customer contacts downloaded successfully!');
      setSuccess('Customer contacts downloaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to export contacts');
      setError(err.message || 'Failed to export contacts');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentUser?.role !== 'Owner') {
      return toast.error("শুধুমাত্র দোকানের মালিক (Owner) ডেটা রিস্টোর করতে পারবেন।");
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
          toast.success('Data restored successfully!');
          setSuccess('Data restored successfully!');
          setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
          toast.error(err.message || 'Failed to parse or restore file');
          setError(err.message || 'Failed to parse or restore file');
        } finally {
          setBackupLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      toast.error(err.message || 'Failed to read file');
      setError(err.message || 'Failed to read file');
      setBackupLoading(false);
    }
  };

    const handleClearData = async () => {
      if (currentUser?.role !== 'Owner') {
        return toast.error("শুধুমাত্র দোকানের মালিক (Owner) ডেটাবেজ মুছে ফেলতে পারবেন।");
      }
      setConfirmModal({isOpen: true, actionType: 'wipe', payload: null});
    };

    const executeWipeDatabase = async () => {
    try {
      setBackupLoading(true);
      await backupService.clearAllData();
      toast.success('সমস্ত ডেটা সফলভাবে মুছে ফেলা হয়েছে! সিস্টেম প্রস্তুত।');
      setSuccess('All data cleared successfully! System is ready for live use.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear data');
      setError(err.message || 'Failed to clear data');
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
      toast.error("আপনি নিজের অ্যাকাউন্ট মুছতে পারবেন না।");
      return;
    }
    const targetUser = staffList.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (targetUser?.role === 'Owner' && currentUser?.role !== 'Owner') {
      toast.error("মালিকের (Owner) অ্যাকাউন্ট শুধুমাত্র অন্য মালিক মুছে ফেলতে পারেন।");
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
        toast.error("নিজের অ্যাকাউন্ট মোছা সম্ভব নয়।");
        return;
      }
      const targetUser = staffList.find(s => s.email.toLowerCase() === email.toLowerCase());
      if (targetUser?.role === 'Owner' && currentUser?.role !== 'Owner') {
        toast.error("মালিকের অ্যাকাউন্ট মোছার অনুমতি আপনার নেই।");
        return;
      }
      await userService.deleteUser(email);
      setStaffList(prev => prev.filter(s => s.email.toLowerCase() !== email.toLowerCase()));
      toast.success("স্টাফ সফলভাবে মুছে ফেলা হয়েছে");
    } catch (err) {
      console.error("Failed to delete user", err);
      toast.error("স্টাফ মুছতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
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
                    placeholder="e.g. Shop Name"
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
                    placeholder="e.g. Electronics Servicing Center"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.shopInfo.logo')}</label>
                <div className="flex items-center gap-4">
                  {shopForm.logoUrl ? (
                    <div className="relative group">
                      <img src={shopForm.logoUrl} alt="Logo Preview" className="w-12 h-12 rounded-xl object-contain " />
                      <button 
                        onClick={() => setShopForm({ ...shopForm, logoUrl: '' })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-3 h-3" />
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
                    placeholder="Owner's Name"
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
                    placeholder="Full shop address..."
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
                    <h3 className="font-semibold text-red-400">Danger Zone: Wipe Database</h3>
                    <p className="text-xs text-gray-400">সমস্ত কাস্টমার, স্টক, ট্রানজেকশন ও লোন ডেটা স্থায়ীভাবে মুছে ফেলুন। এই কাজটি পুনরায় ফিরিয়ে আনা সম্ভব নয়।</p>
                  </div>
                </div>
                <button 
                  onClick={handleClearData}
                  disabled={backupLoading}
                  className="w-full sm:w-auto py-2.5 px-6 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Wipe All Data (রিসেট ডেটাবেজ)
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











