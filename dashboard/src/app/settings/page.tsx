'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, UserPlus, Lock, CheckCircle, Trash2, Mail, Loader2, UserX, Store, Building, Phone, Image as ImageIcon, Save, MapPin, Settings, Download, Upload, Database, FileText } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { AppUser, UserRole, userService } from '@/lib/services/user';
import { ShopSettings, shopSettingsService, defaultShopSettings } from '@/lib/services/shopSettings';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { backupService } from '@/lib/services/backup';

export default function SettingsPage() {
  const { user: currentUser, shop: globalShop, setShop: setGlobalShop } = useAppStore();
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
      case 'wipe': return { title: "Wipe All Data?", message: "CRITICAL WARNING: This will PERMANENTLY DELETE ALL shop data.", confirmText: "Wipe Database" };
      case 'merge': return { title: "Merge Backup?", message: "WARNING: This will merge data from the backup file into your database.", confirmText: "Merge Data" };
      case 'deleteStaff': return { title: "Delete Staff Member?", message: "Are you sure you want to completely DELETE this staff member?", confirmText: "Delete Staff" };
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
  }, []);

  const handleExportData = async () => {
    try {
      setBackupLoading(true);
      await backupService.exportAllData();
      setSuccess('Full backup downloaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to export data');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleExportContacts = async () => {
    try {
      setBackupLoading(true);
      await backupService.exportCustomerContactsCSV();
      setSuccess('Customer contacts downloaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to export contacts');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreData = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setSuccess('Data restored successfully!');
          setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
          setError(err.message || 'Failed to parse or restore file');
        } finally {
          setBackupLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      setError(err.message || 'Failed to read file');
      setBackupLoading(false);
    }
  };

    const handleClearData = async () => {
      setConfirmModal({isOpen: true, actionType: 'wipe', payload: null});
    };

    const executeWipeDatabase = async () => {
    
    if (prompt("Type 'DELETE' to confirm:") !== 'DELETE') {
      alert('Operation cancelled.');
      return;
    }

    try {
      setBackupLoading(true);
      await backupService.clearAllData();
      setSuccess('All data cleared successfully! System is ready for live use.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
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
    if (currentUser?.email === email) {
      alert("You cannot delete your own account.");
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
        await userService.deleteUser(email);
        setStaffList(prev => prev.filter(s => s.email !== email));
      } catch (err) {
        console.error("Failed to delete user", err);
        alert("Failed to delete user. Please try again.");
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
    <div className="max-w-6xl mx-auto space-y-6">

      <div className="flex overflow-x-auto whitespace-nowrap space-x-2 border-b border-gray-800 pb-px [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-medium text-sm transition-all ${activeTab === 'shop' ? 'bg-card text-white border-t border-x border-gray-800 shadow-lg' : 'text-gray-500 hover:text-gray-300 hover:bg-card/50'}`}
        >
          <Store className="w-4 h-4" />
          Shop Profile
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-medium text-sm transition-all ${activeTab === 'staff' ? 'bg-card text-white border-t border-x border-gray-800 shadow-lg' : 'text-gray-500 hover:text-gray-300 hover:bg-card/50'}`}
        >
          <Shield className="w-4 h-4" />
          Staff Management
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-medium text-sm transition-all ${activeTab === 'data' ? 'bg-card text-white border-t border-x border-gray-800 shadow-lg' : 'text-gray-500 hover:text-gray-300 hover:bg-card/50'}`}
        >
          <Database className="w-4 h-4" />
          Data Backup
        </button>
      </div>

      {activeTab === 'staff' && (
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

          <form onSubmit={handleAddStaff} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">Staff Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="email"
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-200">Authorized Personnel</h2>
            <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs font-medium">
              {staffList.length} Accounts
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          staff.role === 'Owner' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                          staff.role === 'Manager' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                          'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        }`}>
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
                              onClick={() => toggleAccess(staff.email, staff.isActive)}
                              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                                staff.isActive 
                                  ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20' 
                                  : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                              }`}
                            >
                              {staff.isActive ? 'Block' : 'Restore'}
                            </button>
                            
                            <button 
                              onClick={() => handleDeleteStaff(staff.email)}
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
          )}
        </motion.div>
        </div>
      )}

      {activeTab === 'shop' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-gray-800 rounded-2xl p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
            <Building className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Shop Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Shop Name (Short)</label>
              <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={shopForm.shopName}
                  onChange={(e) => setShopForm({ ...shopForm, shopName: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50" 
                  placeholder="e.g. Shop Name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Shop Title (Full)</label>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={shopForm.shopTitle}
                  onChange={(e) => setShopForm({ ...shopForm, shopTitle: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50" 
                  placeholder="e.g. Electronics Servicing Center"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Shop Logo (PNG/JPG)</label>
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
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact Phone</label>
              <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <span className="absolute left-10 top-1/2 -translate-y-1/2 font-medium text-gray-300 pointer-events-none">+880</span>
                  <input 
                    type="tel"
                    maxLength={11}
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
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Owner Name</label>
              <div className="relative">
                <UserX className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={shopForm.ownerName}
                  onChange={(e) => setShopForm({ ...shopForm, ownerName: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50" 
                  placeholder="Owner's Name"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Shop Address</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 w-4 h-4 text-gray-500" />
                <textarea 
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
              Save Shop Profile
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === 'data' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-gray-800 rounded-2xl p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
            <Database className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Data Backup & Restore</h2>
          </div>

          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm">{success}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-[#1b1f30] p-6 rounded-xl border border-gray-800/80 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg"><Download className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-semibold text-gray-200">Full System Backup</h3>
                  <p className="text-xs text-gray-500">Download a complete JSON backup of all data</p>
                </div>
              </div>
              <button 
                onClick={handleExportData}
                disabled={backupLoading}
                className="w-full py-2.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2"
              >
                {backupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export Full Backup (JSON)
              </button>
            </div>

            <div className="bg-[#1b1f30] p-6 rounded-xl border border-gray-800/80 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 text-green-400 rounded-lg"><FileText className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-semibold text-gray-200">Customer Contacts</h3>
                  <p className="text-xs text-gray-500">Export only customer names and numbers</p>
                </div>
              </div>
              <button 
                onClick={handleExportContacts}
                disabled={backupLoading}
                className="w-full py-2.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2"
              >
                {backupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Export Contacts (CSV)
              </button>
            </div>

            <div className="bg-[#1b1f30] p-6 rounded-xl border border-gray-800/80 space-y-4 md:col-span-2 mt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-500/10 text-orange-400 rounded-lg"><Upload className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-semibold text-gray-200">Restore System Data</h3>
                  <p className="text-xs text-gray-500">Upload a JSON backup file to restore data. Note: This will merge with existing data.</p>
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
        variant={confirmModal.actionType === 'wipe' ? 'danger' : 'warning'}
      />
    </div>
  );
}











