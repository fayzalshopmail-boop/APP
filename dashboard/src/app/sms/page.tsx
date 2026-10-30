'use client';

import { formatCurrency } from '@/lib/currency';


import { useState, useEffect } from 'react';
import { Save, Loader2, ToggleLeft, ToggleRight, Settings, FileText, Users, Clock, Send, Wallet, Shield, MessageSquare, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { smsConfigService, SmsSettings, defaultSmsSettings } from '@/lib/services/smsConfig';
import { customerService, Customer } from '@/lib/services/customer';
import { sendSMS } from '@/lib/sms';
import { useTranslation } from '@/lib/i18n/useTranslation';
import toast from 'react-hot-toast';

export default function SmsMarketingPage() {
  const { t, language } = useTranslation();
  const { user: currentUser } = useAppStore();
  const [settings, setSettings] = useState<SmsSettings>(defaultSmsSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number } | null>(null);

  // Bulk SMS states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkFilter, setBulkFilter] = useState<'all' | 'due' | 'delivered'>('all');
  const [sendingBulk, setSendingBulk] = useState(false);

  // Follow-ups states
  const [followupMessage, setFollowupMessage] = useState('');
  const [sendingFollowup, setSendingFollowup] = useState(false);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const sixMonthOldCustomers = customers.filter(c => {
    if (!c.createdAt) return false;
    const createdDate = new Date((c.createdAt as any)?.seconds ? (c.createdAt as any).seconds * 1000 : c.createdAt);
    return createdDate <= sixMonthsAgo;
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [data, custData] = await Promise.all([
          smsConfigService.getSettings(),
          customerService.getAll()
        ]);
        
        const updatedData = { ...data };
        if (!updatedData.loanGivenTemplate) {
          updatedData.loanGivenTemplate = 'সম্মানিত {name}, আমাদের শপ {shop} থেকে আপনার নেওয়া ধারের {due} টাকা বকেয়া রয়েছে। অনুগ্রহ করে আপনার বকেয়াটি পরিশোধ করুন। ধন্যবাদ।';
        }
        if (!updatedData.loanTakenTemplate) {
          updatedData.loanTakenTemplate = 'সম্মানিত {name}, আপনি আমাদের শপ {shop} এর কাছে {due} টাকা পান। আপনার পাওনাটি দ্রুত পরিশোধের ব্যবস্থা করা হচ্ছে। ধন্যবাদ।';
        }
        if (!updatedData.pointsRedeemedTemplate) {
          updatedData.pointsRedeemedTemplate = 'সম্মানিত {name}, আপনি আমাদের শপ থেকে সফলভাবে {points} পয়েন্ট ব্যবহার করেছেন। আমাদের সাথে থাকার জন্য ধন্যবাদ!';
        }
        if (!updatedData.waitingForPartsTemplate) {
          updatedData.waitingForPartsTemplate = 'প্রিয় {name}, আপনার {brand} {type} মেরামতের জন্য প্রয়োজনীয় পার্টসের অপেক্ষা করা হচ্ছে। পার্টস পাওয়া মাত্রই কাজটি দ্রুত সম্পন্ন করা হবে। ধন্যবাদ!';
        }
        setSettings(updatedData);

        setCustomers(custData);
        setFollowupMessage(data.followupTemplate || '');
      } catch (error) {
        console.error("Failed to load SMS settings", error);
        toast.error(language === 'bn' ? 'SMS সেটিংস লোড করতে ব্যর্থ হয়েছে।' : 'Failed to load SMS settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await smsConfigService.saveSettings(settings);
      toast.success(language === 'bn' ? 'SMS সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে!' : 'SMS Settings saved successfully!');
    } catch (error: any) {
      toast.error(error.message || (language === 'bn' ? 'সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে' : 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const handleCheckBalance = async () => {
    try {
      setCheckingBalance(true);
      const { auth } = await import('@/lib/firebase');
      const idToken = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;

      const res = await fetch('/api/sms/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ apiKey: settings.apiKey || undefined })
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        toast.error(language === 'bn' 
          ? `সার্ভার ত্রুটি (HTTP ${res.status})। API কনফিগারেশন চেক করুন।` 
          : `Server error (HTTP ${res.status}). Please check API configuration.`);
        return;
      }
      if (data.success) {
        let displayVal = '0.00';
        if (typeof data.balance === 'number') {
          displayVal = data.balance.toFixed(2);
        } else {
          try {
            const parsed = typeof data.balance === 'string' ? JSON.parse(data.balance) : data.balance;
            if (parsed?.balance !== undefined && !isNaN(Number(parsed.balance))) {
              displayVal = Number(parsed.balance).toFixed(2);
            } else if (!isNaN(Number(data.balance))) {
              displayVal = Number(data.balance).toFixed(2);
            } else {
              displayVal = String(data.balance);
            }
          } catch {
            displayVal = String(data.balance);
          }
        }
        setBalance(displayVal);
      } else {
        toast.error(data.error || (language === 'bn' ? 'ব্যালেন্স দেখতে ব্যর্থ হয়েছে' : 'Failed to fetch balance'));
      }
    } catch (error: any) {
      toast.error(language === 'bn' ? 'ব্যালেন্স লোড করতে ত্রুটি হয়েছে' : 'Error fetching balance');
    } finally {
      setCheckingBalance(false);
    }
  };

  const handleSendBulkSMS = async () => {
    if (!settings.enabled || !settings.apiKey || !settings.senderId) {
      toast.error(language === 'bn' ? 'SMS API কনফিগার করা নেই বা নিষ্ক্রিয়।' : 'SMS API is not configured or disabled.');
      return;
    }
    if (!bulkMessage.trim()) {
      toast.error(language === 'bn' ? 'মেসেজ খালি হতে পারে না।' : 'Message cannot be empty.');
      return;
    }

    let targetCustomers = customers;
    if (bulkFilter === 'due') {
      targetCustomers = customers.filter(c => c.due > 0);
    } else if (bulkFilter === 'delivered') {
      targetCustomers = customers.filter(c => c.status === 'Delivered');
    }

    const validCustomers = targetCustomers.filter(c => c.phone && c.phone.length >= 10);
    if (validCustomers.length === 0) {
      toast.error(language === 'bn' ? 'কোনো সঠিক মোবাইল নম্বর পাওয়া যায়নি।' : 'No valid phone numbers found.');
      return;
    }

    try {
      setSendingBulk(true);
      setSendProgress({ current: 0, total: validCustomers.length });

      // Check if message contains variables
      const hasVariables = /{name}|{brand}|{type}|{due}|{total}|{advance}|{problem}/.test(bulkMessage);

      if (hasVariables) {
        // Send individually to resolve variables
        let successCount = 0;
        for (let i = 0; i < validCustomers.length; i++) {
          const c = validCustomers[i];
          setSendProgress({ current: i + 1, total: validCustomers.length });
          
          const personalizedMsg = bulkMessage
            .replace(/{name}/g, c.name || '')
            .replace(/{brand}/g, c.deviceBrand || '')
            .replace(/{type}/g, c.deviceType || '')
            .replace(/{problem}/g, c.deviceProblem || '')
            .replace(/{total}/g, c.totalBill?.toString() || '0')
            .replace(/{advance}/g, c.advance?.toString() || '0')
            .replace(/{due}/g, c.due?.toString() || '0');

          const result = await sendSMS(c.phone, personalizedMsg, settings.apiKey, settings.senderId, settings.apiUrl);
          if (result.success) successCount++; else console.error("Bulk SMS individual error:", result.error);
        }
        toast.success(language === 'bn' 
          ? `সফলভাবে ${successCount} জন কাস্টমারকে পার্সোনালাইজড SMS পাঠানো হয়েছে!` 
          : `Successfully sent personalized SMS to ${successCount} customers!`);
        setBulkMessage('');
      } else {
        // Send as a single bulk request
        const validNumbers = validCustomers.map(c => c.phone);
        const result = await sendSMS(validNumbers, bulkMessage, settings.apiKey, settings.senderId, settings.apiUrl);
        if (result.success) {
          toast.success(language === 'bn' 
            ? `সফলভাবে ${validNumbers.length} জন কাস্টমারকে বাল্ক SMS পাঠানো হয়েছে!` 
            : `Successfully sent Bulk SMS to ${validNumbers.length} customers!`);
          setBulkMessage('');
        } else {
          toast.error(language === 'bn' ? `বাল্ক SMS পাঠাতে ব্যর্থ: ${result.error}` : `Failed to send bulk SMS: ${result.error}`);
        }
      }
    } catch (error: any) {
      toast.error(error.message || (language === 'bn' ? 'SMS পাঠানোর সময় একটি ত্রুটি ঘটেছে।' : 'An error occurred while sending SMS.'));
    } finally {
      setSendingBulk(false);
      setSendProgress(null);
    }
  };

  const handleSendFollowups = async () => {
    if (!settings.enabled || !settings.apiKey || !settings.senderId) {
      toast.error(language === 'bn' ? 'SMS API কনফিগার করা নেই বা নিষ্ক্রিয়।' : 'SMS API is not configured or disabled.');
      return;
    }
    if (!followupMessage.trim()) {
      toast.error(language === 'bn' ? 'মেসেজ খালি হতে পারে না।' : 'Message cannot be empty.');
      return;
    }
    const eligible = sixMonthOldCustomers.filter(c => c.phone && c.phone.length >= 10);
    if (eligible.length === 0) {
      toast.error(language === 'bn' ? 'কোনো যোগ্য কাস্টমার পাওয়া যায়নি।' : 'No eligible customers found.');
      return;
    }

    try {
      setSendingFollowup(true);
      setSendProgress({ current: 0, total: eligible.length });

      let successCount = 0;
      for (let i = 0; i < eligible.length; i++) {
        const c = eligible[i];
        setSendProgress({ current: i + 1, total: eligible.length });
        
        const personalizedMsg = followupMessage
          .replace(/{name}/g, c.name || '')
          .replace(/{brand}/g, c.deviceBrand || '')
          .replace(/{type}/g, c.deviceType || '');

        const result = await sendSMS(c.phone, personalizedMsg, settings.apiKey, settings.senderId, settings.apiUrl);
        if (result.success) successCount++; else console.error("Bulk SMS individual error:", result.error);
      }
      
      toast.success(language === 'bn' 
        ? `সফলভাবে ${successCount} জন কাস্টমারকে ফলো-আপ SMS পাঠানো হয়েছে!` 
        : `Successfully sent follow-up SMS to ${successCount} customers!`);
    } catch (error: any) {
      toast.error(error.message || (language === 'bn' ? 'SMS পাঠানোর সময় একটি ত্রুটি ঘটেছে।' : 'An error occurred while sending SMS.'));
    } finally {
      setSendingFollowup(false);
      setSendProgress(null);
    }
  };

  const [activeTab, setActiveTab] = useState<'api' | 'templates' | 'bulk' | 'followup'>('api');

  if (currentUser?.role !== 'Owner') {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <Shield className="w-16 h-16 text-red-500/50 mb-4" />
        <h2 className="text-2xl font-bold text-gray-200">
          {language === 'bn' ? 'প্রবেশাধিকার নেই' : 'Access Denied'}
        </h2>
        <p className="text-gray-500 mt-2">
          {language === 'bn' ? 'শুধুমাত্র শপ ওনার SMS সেটিংস পরিচালনা করতে পারবেন।' : 'Only the Shop Owner can access SMS configurations.'}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">

      {/* Tabs */}
      <div className="flex bg-[#131622] p-1.5 rounded-2xl border border-gray-800/80 gap-1.5 overflow-x-auto scrollbar-none mb-6">
        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all shrink-0 select-none ${
            activeTab === 'api'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 font-bold'
              : 'text-gray-400 hover:text-white hover:bg-secondary/40'
          }`}
        >
          <Settings className="w-4 h-4" />
          {language === 'bn' ? 'API সেটআপ' : 'API Setup'}
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all shrink-0 select-none ${
            activeTab === 'templates'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 font-bold'
              : 'text-gray-400 hover:text-white hover:bg-secondary/40'
          }`}
        >
          <FileText className="w-4 h-4" />
          {language === 'bn' ? 'SMS টেমপ্লেট' : 'SMS Templates'}
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all shrink-0 select-none ${
            activeTab === 'bulk'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 font-bold'
              : 'text-gray-400 hover:text-white hover:bg-secondary/40'
          }`}
        >
          <Users className="w-4 h-4" />
          {language === 'bn' ? 'বাল্ক SMS' : 'Bulk SMS'}
        </button>
        <button
          onClick={() => setActiveTab('followup')}
          className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all shrink-0 select-none ${
            activeTab === 'followup'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 font-bold'
              : 'text-gray-400 hover:text-white hover:bg-secondary/40'
          }`}
        >
          <Clock className="w-4 h-4" />
          {language === 'bn' ? '৬ মাসের ফলো-আপ' : '6-Month Follow-ups'}
        </button>
      </div>

      {/* Send Progress Indicator */}
      {sendProgress && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 space-y-2 mb-6">
          <div className="flex justify-between text-xs sm:text-sm text-blue-400 font-semibold">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> 
              {language === 'bn' ? 'SMS পাঠানো হচ্ছে...' : 'Sending SMS in progress...'}
            </span>
            <span>{sendProgress.current} / {sendProgress.total}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-600 to-indigo-500 h-2.5 transition-all duration-200" 
              style={{ width: `${Math.round((sendProgress.current / sendProgress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-card border border-gray-800 rounded-2xl p-6 md:p-8 min-h-[400px]">
        {activeTab === 'api' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full">
            <div className="flex items-center justify-between border-b border-gray-800 pb-5">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {language === 'bn' ? 'BulkSMSBD API সেটআপ' : 'BulkSMSBD API Setup'}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {language === 'bn' ? 'SMS সার্ভিস সক্রিয় করতে আপনার API ক্রেডেনশিয়াল দিন।' : 'Enter your API credentials to activate the SMS service.'}
                </p>
              </div>
              <button 
                onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${settings.enabled ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
              >
                {settings.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                {settings.enabled 
                  ? (language === 'bn' ? 'SMS সক্রিয়' : 'SMS Active') 
                  : (language === 'bn' ? 'SMS নিষ্ক্রিয়' : 'SMS Disabled')}
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {language === 'bn' ? 'SMS প্রোভাইডার API URL' : 'SMS Provider API URL'}
                </label>
                <input 
                  type="text"
                  value={settings.apiUrl || ''}
                  onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" 
                  placeholder="e.g. http://bulksmsbd.net/api/smsapi"
                />
                <p className="text-xs text-gray-500">
                  {language === 'bn' ? 'SMS প্রোভাইডারের বেস API URL।' : 'The base URL of the SMS provider\'s API.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {language === 'bn' ? 'API কী (Key)' : 'API Key'}
                  </label>
                  <input 
                    type="text"
                    value={settings.apiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    className="w-full bg-popover border border-gray-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" 
                    placeholder={language === 'bn' ? 'আপনার API কী দিন' : 'Enter your API Key'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {language === 'bn' ? 'অনুমোদিত সেন্ডার আইডি' : 'Approved Sender ID'}
                  </label>
                  <input 
                    type="text"
                    value={settings.senderId}
                    onChange={(e) => setSettings({ ...settings, senderId: e.target.value })}
                    className="w-full bg-popover border border-gray-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" 
                    placeholder="e.g. 88096..."
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={handleCheckBalance}
                  disabled={checkingBalance || !settings.apiKey}
                  className="w-full sm:w-auto justify-center bg-popover hover:bg-gray-800 border border-gray-700 text-gray-300 px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {checkingBalance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  {checkingBalance 
                    ? (language === 'bn' ? 'ব্যালেন্স যাচাই হচ্ছে...' : 'Checking...') 
                    : (language === 'bn' ? 'ব্যালেন্স দেখুন' : 'Check Balance')}
                </button>
                {balance && (
                  <div className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/20 text-center w-full sm:w-auto">
                    {language === 'bn' ? 'ব্যালেন্স:' : 'Balance:'} {formatCurrency(Number(balance))}
                  </div>
                )}
              </div>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full md:w-auto justify-center bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving 
                  ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') 
                  : (language === 'bn' ? 'API সেটিংস সেভ করুন' : 'Save API Settings')}
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'templates' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">
                  {language === 'bn' ? 'পেন্ডিং রিসিভ টেমপ্লেট' : 'Received Template'}
                </h2>
                <p className="text-xs text-gray-400">
                  {language === 'bn' ? 'কাস্টমার যোগ করার সময় পাঠানো হবে। ভ্যারিয়েবল:' : 'When added to pending. Variables:'} {'{name}, {brand}, {type}, {problem}, {total}, {advance}'}
                </p>
                <textarea 
                  value={settings.welcomeTemplate}
                  onChange={(e) => setSettings({ ...settings, welcomeTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">
                  {language === 'bn' ? 'মেরামত সম্পন্ন টেমপ্লেট' : 'Ready Template'}
                </h2>
                <p className="text-xs text-gray-400">
                  {language === 'bn' ? 'স্ট্যাটাস Ready হলে পাঠানো হবে। ভ্যারিয়েবল:' : 'When status marked as Ready. Variables:'} {'{name}, {brand}, {type}, {due}'}
                </p>
                <textarea 
                  value={settings.readyTemplate}
                  onChange={(e) => setSettings({ ...settings, readyTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">
                  {language === 'bn' ? 'ডেলিভারি টেমপ্লেট' : 'Delivered Template'}
                </h2>
                <p className="text-xs text-gray-400">
                  {language === 'bn' ? 'স্ট্যাটাস Delivered হলে পাঠানো হবে। ভ্যারিয়েবল:' : 'When status marked as Delivered. Variables:'} {'{name}, {brand}, {type}'}
                </p>
                <textarea 
                  value={settings.deliveredTemplate || ''}
                  onChange={(e) => setSettings({ ...settings, deliveredTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">
                  {language === 'bn' ? 'হোয়াটসঅ্যাপ ইনভয়েস টেমপ্লেট' : 'WhatsApp Invoice Template'}
                </h2>
                <p className="text-xs text-gray-400">
                  {language === 'bn' ? 'হোয়াটসঅ্যাপে ইনভয়েস পাঠানোর জন্য। ভ্যারিয়েবল:' : 'For sending invoice via WhatsApp. Variables:'} {'{name}, {brand}, {type}, {total}, {advance}, {due}'}
                </p>
                <textarea 
                  value={settings.whatsappTemplate || ''}
                  onChange={(e) => setSettings({ ...settings, whatsappTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">
                  {language === 'bn' ? 'বাকি তাগাদা টেমপ্লেট' : 'Due Reminder Template'}
                </h2>
                <p className="text-xs text-gray-400">
                  {language === 'bn' ? 'বাকি পেজ বা বাল্ক SMS থেকে পাঠানো হবে। ভ্যারিয়েবল:' : 'Sent from Due Page or Bulk SMS. Variables:'} {'{name}, {brand}, {type}, {due}'}
                </p>
                <textarea 
                  value={settings.paymentReminderTemplate || ''}
                  onChange={(e) => setSettings({ ...settings, paymentReminderTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">
                  {language === 'bn' ? 'ফলো-আপ রিমাইন্ডার টেমপ্লেট' : 'Follow-up Template'}
                </h2>
                <p className="text-xs text-gray-400">
                  {language === 'bn' ? '৬ মাসের সার্ভিস ফলো-আপ। ভ্যারিয়েবল:' : '6-Month Reminder. Variables:'} {'{name}, {brand}, {type}'}
                </p>
                <textarea 
                  value={settings.followupTemplate || ''}
                  onChange={(e) => setSettings({ ...settings, followupTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">
                  {language === 'bn' ? 'ফেরত (অনমেরামতকৃত) টেমপ্লেট' : 'Returned (Unrepaired) Template'}
                </h2>
                <p className="text-xs text-gray-400">
                  {language === 'bn' ? 'স্ট্যাটাস Returned হলে পাঠানো হবে। ভ্যারিয়েবল:' : 'When status marked as Returned. Variables:'} {'{name}, {brand}, {type}'}
                </p>
                <textarea 
                  value={settings.returnedTemplate || ''}
                  onChange={(e) => setSettings({ ...settings, returnedTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">
                  {language === 'bn' ? 'পার্টসের অপেক্ষা টেমপ্লেট' : 'Waiting for Parts Template'}
                </h2>
                <p className="text-xs text-gray-400">
                  {language === 'bn' ? 'পার্টসের অপেক্ষায় থাকাকালীন পাঠানো হবে। ভ্যারিয়েবল:' : 'When status marked as Waiting for Parts. Variables:'} {'{name}, {brand}, {type}, {problem}, {total}, {advance}, {due}'}
                </p>
                <textarea 
                  value={settings.waitingForPartsTemplate || ''}
                  onChange={(e) => setSettings({ ...settings, waitingForPartsTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">
                  {language === 'bn' ? 'পয়েন্ট ব্যবহার টেমপ্লেট' : 'Points Redeemed Template'}
                </h2>
                <p className="text-xs text-gray-400">
                  {language === 'bn' ? 'লয়্যালটি পয়েন্ট ব্যবহার করলে পাঠানো হবে। ভ্যারিয়েবল:' : 'When points are redeemed. Variables:'} {'{name}, {points}'}
                </p>
                <textarea 
                  value={settings.pointsRedeemedTemplate || ''}
                  onChange={(e) => setSettings({ ...settings, pointsRedeemedTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">
                  {language === 'bn' ? 'হাওলাত তাগাদা টেমপ্লেট (পাবো)' : 'Loan Reminder Template (Money Given)'}
                </h2>
                <p className="text-xs text-gray-400">
                  {language === 'bn' ? 'যাদের টাকা হাওলাত দিয়েছেন তাদের জন্য। ভ্যারিয়েবল:' : 'Sent to people who owe you money. Variables:'} {'{name}'}, {'{shop}'}, {'{due}'}
                </p>
                <textarea 
                  value={settings.loanGivenTemplate || ''}
                  onChange={(e) => setSettings({ ...settings, loanGivenTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">
                  {language === 'bn' ? 'হাওলাত তথ্য টেমপ্লেট (দিতে হবে)' : 'Loan Reminder Template (Money Taken)'}
                </h2>
                <p className="text-xs text-gray-400">
                  {language === 'bn' ? 'যাদের কাছ থেকে টাকা নিয়েছেন তাদের জন্য। ভ্যারিয়েবল:' : 'Sent to people you owe money to. Variables:'} {'{name}'}, {'{shop}'}, {'{due}'}
                </p>
                <textarea 
                  value={settings.loanTakenTemplate || ''}
                  onChange={(e) => setSettings({ ...settings, loanTakenTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full md:w-auto justify-center bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (language === 'bn' ? 'টেমপ্লেট সেভ করুন' : 'Save Templates')}
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'bulk' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full">
            <div className="border-b border-gray-800 pb-5">
              <h2 className="text-xl font-bold text-white">
                {language === 'bn' ? 'বাল্ক SMS পাঠান' : 'Send Bulk SMS'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {language === 'bn' ? 'আপনার সকল কাস্টমারকে অফার বা আপডেট মেসেজ পাঠান।' : 'Send promotional messages or updates to your customers.'}
              </p>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-gray-300">
                {language === 'bn' ? 'টার্গেট প্রাপক' : 'Target Audience'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button 
                  onClick={() => setBulkFilter('all')}
                  className={`p-4 rounded-xl border text-left transition-all ${bulkFilter === 'all' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-popover border-gray-800 text-gray-400 hover:border-gray-600'}`}
                >
                  <div className="font-semibold text-gray-200">
                    {language === 'bn' ? 'সকল কাস্টমার' : 'All Customers'}
                  </div>
                  <div className="text-xs mt-1">
                    {language === 'bn' ? `সবাইকে পাঠান (${customers.length} জন)` : `Send to everyone (${customers.length} users)`}
                  </div>
                </button>
                <button 
                  onClick={() => setBulkFilter('due')}
                  className={`p-4 rounded-xl border text-left transition-all ${bulkFilter === 'due' ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-popover border-gray-800 text-gray-400 hover:border-gray-600'}`}
                >
                  <div className="font-semibold text-gray-200">
                    {language === 'bn' ? 'বাকি থাকা কাস্টমার' : 'Due Customers'}
                  </div>
                  <div className="text-xs mt-1">
                    {language === 'bn' ? `যাদের পেমেন্ট বাকি আছে (${customers.filter(c => c.due > 0).length} জন)` : `Customers with pending payments (${customers.filter(c => c.due > 0).length})`}
                  </div>
                </button>
                <button 
                  onClick={() => setBulkFilter('delivered')}
                  className={`p-4 rounded-xl border text-left transition-all ${bulkFilter === 'delivered' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-popover border-gray-800 text-gray-400 hover:border-gray-600'}`}
                >
                  <div className="font-semibold text-gray-200">
                    {language === 'bn' ? 'ডেলিভারি সম্পন্ন কাস্টমার' : 'Past Customers'}
                  </div>
                  <div className="text-xs mt-1">
                    {language === 'bn' ? `সফলভাবে ডেলিভারি করা হয়েছে (${customers.filter(c => c.status === 'Delivered').length} জন)` : `Successfully delivered (${customers.filter(c => c.status === 'Delivered').length})`}
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-gray-300">
                  {language === 'bn' ? 'মেসেজের বিবরণ' : 'Message Content'}
                </label>
                <button 
                  onClick={() => setBulkMessage(settings.paymentReminderTemplate || '')}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20"
                >
                  {language === 'bn' ? 'বাকি তাগাদা লোড করুন' : 'Load Payment Reminder'}
                </button>
              </div>
              <textarea 
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                placeholder={language === 'bn' ? 'আপনার অফার, ঈদের শুভেচ্ছা ইত্যাদির মেসেজ লিখুন...' : 'Write your promotional offer, Eid greetings, etc. here...'}
                className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[160px] resize-none leading-relaxed"
              />
              <p className="text-xs text-gray-500 text-right">
                {bulkMessage.length} {language === 'bn' ? 'টি অক্ষর' : 'characters'}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-800 flex justify-end">
              <button 
                onClick={handleSendBulkSMS}
                disabled={sendingBulk || !bulkMessage.trim()}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-8 py-3 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-70"
              >
                {sendingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {language === 'bn' ? (
                  `${bulkFilter === 'all' ? customers.length : bulkFilter === 'due' ? customers.filter(c => c.due > 0).length : customers.filter(c => c.status === 'Delivered').length} জন কাস্টমারকে পাঠান`
                ) : (
                  `Send to ${bulkFilter === 'all' ? customers.length : bulkFilter === 'due' ? customers.filter(c => c.due > 0).length : customers.filter(c => c.status === 'Delivered').length} Customers`
                )}
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'followup' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full">
            <div className="border-b border-gray-800 pb-5">
              <h2 className="text-xl font-bold text-white">
                {language === 'bn' ? '৬ মাসের সার্ভিস ফলো-আপ' : '6-Month Service Follow-ups'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {language === 'bn' ? '৬ মাস বা তার বেশি সময় পূর্বে সার্ভিস গ্রহণকারী কাস্টমারদের খোঁজ-খবর নেওয়ার মেসেজ পাঠান।' : 'Send a checkup message to customers who received service 6 or more months ago.'}
              </p>
            </div>

            <div className="bg-popover border border-gray-800 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-200">
                    {language === 'bn' ? `যোগ্য কাস্টমার: ${sixMonthOldCustomers.length} জন` : `Eligible Customers: ${sixMonthOldCustomers.length}`}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {language === 'bn' ? 'এই কাস্টমারদের ৬ বা তার বেশি মাস পূর্বে যুক্ত করা হয়েছিল।' : 'These customers were added 6 or more months ago.'}
                  </p>
                </div>
              </div>
              
              {sixMonthOldCustomers.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
                  {sixMonthOldCustomers.map(c => (
                    <span key={c.id} className="bg-gray-800/50 text-gray-300 text-xs px-2.5 py-1 rounded-md border border-gray-700/50">
                      {c.name} ({c.phone})
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  {language === 'bn' ? '৬ মাসের বেশি পুরনো কোনো কাস্টমার এখনও পাওয়া যায়নি।' : 'No customers are older than 6 months yet.'}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-300">
                {language === 'bn' ? 'ফলো-আপ মেসেজ' : 'Follow-up Message'}
              </label>
              <textarea 
                value={followupMessage}
                onChange={(e) => setFollowupMessage(e.target.value)}
                placeholder={language === 'bn' ? 'আপনার ফলো-আপ মেসেজ লিখুন...' : 'Write your follow-up message...'}
                className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
              />
              <p className="text-xs text-gray-500 text-right">
                {language === 'bn' ? 'ব্যবহারযোগ্য ভ্যারিয়েবল:' : 'Available variables:'} {'{name}, {brand}, {type}'}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-800 flex justify-end">
              <button 
                onClick={handleSendFollowups}
                disabled={sendingFollowup || !followupMessage.trim() || sixMonthOldCustomers.length === 0}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-8 py-3 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {sendingFollowup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {language === 'bn' 
                  ? `${sixMonthOldCustomers.length} জন কাস্টমারকে পাঠান` 
                  : `Send to ${sixMonthOldCustomers.length} Customers`}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}



