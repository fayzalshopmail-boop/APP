'use client';

import { formatCurrency } from '@/lib/currency';


import { useState, useEffect } from 'react';
import { Save, Loader2, ToggleLeft, ToggleRight, Settings, FileText, Users, Clock, Send, Wallet, Shield, MessageSquare, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { smsConfigService, SmsSettings, defaultSmsSettings } from '@/lib/services/smsConfig';
import { customerService, Customer } from '@/lib/services/customer';
import { sendSMS } from '@/lib/sms';

export default function SmsMarketingPage() {
  const { user: currentUser } = useAppStore();
  const [settings, setSettings] = useState<SmsSettings>(defaultSmsSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

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
        setSettings(data);
        setCustomers(custData);
        setFollowupMessage(data.followupTemplate || '');
      } catch (error) {
        console.error("Failed to load SMS settings", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await smsConfigService.saveSettings(settings);
      setMessage({ text: 'SMS Settings saved successfully!', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ text: error.message || 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCheckBalance = async () => {
    if (!settings.apiKey) {
      setMessage({ text: 'Please enter and save your API Key first.', type: 'error' });
      return;
    }
    try {
      setCheckingBalance(true);
      const res = await fetch(`/api/sms/balance?apiKey=${settings.apiKey}`);
      const data = await res.json();
      if (data.success) {
        try {
          const parsed = JSON.parse(data.balance);
          if (parsed.balance !== undefined) {
            setBalance(Number(parsed.balance).toFixed(2));
          } else {
            setBalance(data.balance);
          }
        } catch (e) {
          setBalance(data.balance);
        }
      } else {
        setMessage({ text: data.error || 'Failed to fetch balance', type: 'error' });
      }
    } catch (error: any) {
      setMessage({ text: 'Error fetching balance', type: 'error' });
    } finally {
      setCheckingBalance(false);
    }
  };

  const handleSendBulkSMS = async () => {
    if (!settings.enabled || !settings.apiKey || !settings.senderId) {
      setMessage({ text: 'SMS API is not configured or disabled.', type: 'error' });
      return;
    }
    if (!bulkMessage.trim()) {
      setMessage({ text: 'Message cannot be empty.', type: 'error' });
      return;
    }

    let targetCustomers = customers;
    if (bulkFilter === 'due') {
      targetCustomers = customers.filter(c => c.due > 0);
    } else if (bulkFilter === 'delivered') {
      targetCustomers = customers.filter(c => c.status === 'Delivered');
    }

    try {
      setSendingBulk(true);
      setMessage(null);

      // Check if message contains variables
      const hasVariables = /{name}|{brand}|{type}|{due}|{total}|{advance}|{problem}/.test(bulkMessage);

      if (hasVariables) {
        // Send individually to resolve variables
        let successCount = 0;
        for (const c of targetCustomers) {
          if (!c.phone || c.phone.length < 10) continue;
          
          let personalizedMsg = bulkMessage
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
        setMessage({ text: `Successfully sent personalized SMS to ${successCount} customers!`, type: 'success' });
        setBulkMessage('');
      } else {
        // Send as a single bulk request
        const validNumbers = targetCustomers.map(c => c.phone).filter(phone => phone && phone.length >= 10);
        if (validNumbers.length === 0) {
          setMessage({ text: 'No valid phone numbers found.', type: 'error' });
          return;
        }
        
        const result = await sendSMS(validNumbers, bulkMessage, settings.apiKey, settings.senderId, settings.apiUrl);
        if (result.success) {
          setMessage({ text: `Successfully sent Bulk SMS to ${validNumbers.length} customers!`, type: 'success' });
          setBulkMessage('');
        } else {
          setMessage({ text: `Failed to send bulk SMS: ${result.error}`, type: 'error' });
        }
      }
    } catch (error: any) {
      setMessage({ text: error.message || 'An error occurred while sending SMS.', type: 'error' });
    } finally {
      setSendingBulk(false);
    }
  };

  const handleSendFollowups = async () => {
    if (!settings.enabled || !settings.apiKey || !settings.senderId) {
      setMessage({ text: 'SMS API is not configured or disabled.', type: 'error' });
      return;
    }
    if (!followupMessage.trim()) {
      setMessage({ text: 'Message cannot be empty.', type: 'error' });
      return;
    }
    if (sixMonthOldCustomers.length === 0) {
      setMessage({ text: 'No eligible customers found.', type: 'error' });
      return;
    }

    try {
      setSendingFollowup(true);
      setMessage(null);

      let successCount = 0;
      for (const c of sixMonthOldCustomers) {
        if (!c.phone || c.phone.length < 10) continue;
        
        let personalizedMsg = followupMessage
          .replace(/{name}/g, c.name || '')
          .replace(/{brand}/g, c.deviceBrand || '')
          .replace(/{type}/g, c.deviceType || '');

        const result = await sendSMS(c.phone, personalizedMsg, settings.apiKey, settings.senderId, settings.apiUrl);
        if (result.success) successCount++; else console.error("Bulk SMS individual error:", result.error);
      }
      
      setMessage({ text: `Successfully sent follow-up SMS to ${successCount} customers!`, type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message || 'An error occurred while sending SMS.', type: 'error' });
    } finally {
      setSendingFollowup(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'api' | 'templates' | 'bulk' | 'followup'>('api');

  if (currentUser?.role !== 'Owner') {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <Shield className="w-16 h-16 text-red-500/50 mb-4" />
        <h2 className="text-2xl font-bold text-gray-200">Access Denied</h2>
        <p className="text-gray-500 mt-2">Only the Shop Owner can access SMS configurations.</p>
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
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <MessageSquare className="w-8 h-8 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">SMS Settings</h1>
            <p className="text-sm text-gray-400">Manage your SMS marketing and API configuration.</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          <CheckCircle className="w-4 h-4" />
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-800 pb-px mb-6">
        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-medium text-sm transition-all ${activeTab === 'api' ? 'bg-card text-white border-t border-x border-gray-800 shadow-lg' : 'text-gray-500 hover:text-gray-300 hover:bg-card/50'}`}
        >
          <Settings className="w-4 h-4" />
          API Setup
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-medium text-sm transition-all ${activeTab === 'templates' ? 'bg-card text-white border-t border-x border-gray-800 shadow-lg' : 'text-gray-500 hover:text-gray-300 hover:bg-card/50'}`}
        >
          <FileText className="w-4 h-4" />
          SMS Templates
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-medium text-sm transition-all ${activeTab === 'bulk' ? 'bg-card text-white border-t border-x border-gray-800 shadow-lg' : 'text-gray-500 hover:text-gray-300 hover:bg-card/50'}`}
        >
          <Users className="w-4 h-4" />
          Bulk SMS
        </button>
        <button
          onClick={() => setActiveTab('followup')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-medium text-sm transition-all ${activeTab === 'followup' ? 'bg-card text-white border-t border-x border-gray-800 shadow-lg' : 'text-gray-500 hover:text-gray-300 hover:bg-card/50'}`}
        >
          <Clock className="w-4 h-4" />
          Follow-ups
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-card border border-gray-800 rounded-2xl p-6 md:p-8 min-h-[400px]">
        {activeTab === 'api' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full">
            <div className="flex items-center justify-between border-b border-gray-800 pb-5">
              <div>
                <h2 className="text-xl font-bold text-white">BulkSMSBD API Setup</h2>
                <p className="text-sm text-gray-400 mt-1">Enter your API credentials to activate the SMS service.</p>
              </div>
              <button 
                onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${settings.enabled ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
              >
                {settings.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                {settings.enabled ? 'SMS Active' : 'SMS Disabled'}
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">SMS Provider API URL</label>
                <input 
                  type="text"
                  value={settings.apiUrl || ''}
                  onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" 
                  placeholder="e.g. http://bulksmsbd.net/api/smsapi"
                />
                <p className="text-xs text-gray-500">The base URL of the SMS provider's API.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">API Key</label>
                  <input 
                    type="text"
                    value={settings.apiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    className="w-full bg-popover border border-gray-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" 
                    placeholder="Enter your API Key"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Approved Sender ID</label>
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

              <div className="pt-8 border-t border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleCheckBalance}
                    disabled={checkingBalance || !settings.apiKey}
                    className="bg-popover hover:bg-gray-800 border border-gray-700 text-gray-300 px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {checkingBalance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                    Check Balance
                  </button>
                  {balance && (
                    <div className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20">
                      Balance: {formatCurrency(balance)}
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full md:w-auto justify-center bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-70"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save API Settings
                </button>
              </div>
          </motion.div>
        )}

        {activeTab === 'templates' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">Received Template</h2>
                <p className="text-xs text-gray-400">When added to pending. Variables: {'{name}, {brand}, {type}, {problem}, {total}, {advance}'}</p>
                <textarea 
                  value={settings.welcomeTemplate}
                  onChange={(e) => setSettings({ ...settings, welcomeTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">Ready Template</h2>
                <p className="text-xs text-gray-400">When status marked as Ready. Variables: {'{name}, {brand}, {type}, {due}'}</p>
                <textarea 
                  value={settings.readyTemplate}
                  onChange={(e) => setSettings({ ...settings, readyTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">Delivered Template</h2>
                <p className="text-xs text-gray-400">When status marked as Delivered. Variables: {'{name}, {brand}, {type}'}</p>
                <textarea 
                  value={settings.deliveredTemplate || ''}
                  onChange={(e) => setSettings({ ...settings, deliveredTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">WhatsApp Invoice Template</h2>
                <p className="text-xs text-gray-400">For sending invoice via WhatsApp. Variables: {'{name}, {brand}, {type}, {total}, {advance}, {due}'}</p>
                <textarea 
                  value={settings.whatsappTemplate || ''}
                  onChange={(e) => setSettings({ ...settings, whatsappTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">Due Reminder Template</h2>
                <p className="text-xs text-gray-400">Sent from Due Page or Bulk SMS. Variables: {'{name}, {brand}, {type}, {due}'}</p>
                <textarea 
                  value={settings.paymentReminderTemplate || ''}
                  onChange={(e) => setSettings({ ...settings, paymentReminderTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">Follow-up Template</h2>
                <p className="text-xs text-gray-400">6-Month Reminder. Variables: {'{name}, {brand}, {type}'}</p>
                <textarea 
                  value={settings.followupTemplate || ''}
                  onChange={(e) => setSettings({ ...settings, followupTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">Returned (Unrepaired) Template</h2>
                <p className="text-xs text-gray-400">When status marked as Returned. Variables: {'{name}, {brand}, {type}'}</p>
                <textarea 
                  value={settings.returnedTemplate || ''}
                  onChange={(e) => setSettings({ ...settings, returnedTemplate: e.target.value })}
                  className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">Points Redeemed Template</h2>
                <p className="text-xs text-gray-400">When points are redeemed. Variables: {'{name}, {points}'}</p>
                <textarea 
                  value={settings.pointsRedeemedTemplate || ''}
                  onChange={(e) => setSettings({ ...settings, pointsRedeemedTemplate: e.target.value })}
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
                Save Templates
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'bulk' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full">
            <div className="border-b border-gray-800 pb-5">
              <h2 className="text-xl font-bold text-white">Send Bulk SMS</h2>
              <p className="text-sm text-gray-400 mt-1">Send promotional messages or updates to your customers.</p>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-gray-300">Target Audience</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button 
                  onClick={() => setBulkFilter('all')}
                  className={`p-4 rounded-xl border text-left transition-all ${bulkFilter === 'all' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-popover border-gray-800 text-gray-400 hover:border-gray-600'}`}
                >
                  <div className="font-semibold text-gray-200">All Customers</div>
                  <div className="text-xs mt-1">Send to everyone ({customers.length} users)</div>
                </button>
                <button 
                  onClick={() => setBulkFilter('due')}
                  className={`p-4 rounded-xl border text-left transition-all ${bulkFilter === 'due' ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-popover border-gray-800 text-gray-400 hover:border-gray-600'}`}
                >
                  <div className="font-semibold text-gray-200">Due Customers</div>
                  <div className="text-xs mt-1">Customers with pending payments ({customers.filter(c => c.due > 0).length})</div>
                </button>
                <button 
                  onClick={() => setBulkFilter('delivered')}
                  className={`p-4 rounded-xl border text-left transition-all ${bulkFilter === 'delivered' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-popover border-gray-800 text-gray-400 hover:border-gray-600'}`}
                >
                  <div className="font-semibold text-gray-200">Past Customers</div>
                  <div className="text-xs mt-1">Successfully delivered ({customers.filter(c => c.status === 'Delivered').length})</div>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-gray-300">Message Content</label>
                <button 
                  onClick={() => setBulkMessage(settings.paymentReminderTemplate || '')}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20"
                >
                  Load Payment Reminder
                </button>
              </div>
              <textarea 
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                placeholder="Write your promotional offer, Eid greetings, etc. here..."
                className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[160px] resize-none leading-relaxed"
              />
              <p className="text-xs text-gray-500 text-right">{bulkMessage.length} characters</p>
            </div>

            <div className="pt-4 border-t border-gray-800 flex justify-end">
              <button 
                onClick={handleSendBulkSMS}
                disabled={sendingBulk || !bulkMessage.trim()}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-8 py-3 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-70"
              >
                {sendingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send to {
                  bulkFilter === 'all' ? customers.length :
                  bulkFilter === 'due' ? customers.filter(c => c.due > 0).length :
                  customers.filter(c => c.status === 'Delivered').length
                } Customers
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'followup' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full">
            <div className="border-b border-gray-800 pb-5">
              <h2 className="text-xl font-bold text-white">6-Month Service Follow-ups</h2>
              <p className="text-sm text-gray-400 mt-1">Send a checkup message to customers who received service 6 or more months ago.</p>
            </div>

            <div className="bg-popover border border-gray-800 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-200">Eligible Customers: {sixMonthOldCustomers.length}</h3>
                  <p className="text-xs text-gray-500">These customers were added 6 or more months ago.</p>
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
                <div className="text-sm text-gray-500 italic">No customers are older than 6 months yet.</div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-300">Follow-up Message</label>
              <textarea 
                value={followupMessage}
                onChange={(e) => setFollowupMessage(e.target.value)}
                placeholder="Write your follow-up message..."
                className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
              />
              <p className="text-xs text-gray-500 text-right">Available variables: {'{name}, {brand}, {type}'}</p>
            </div>

            <div className="pt-4 border-t border-gray-800 flex justify-end">
              <button 
                onClick={handleSendFollowups}
                disabled={sendingFollowup || !followupMessage.trim() || sixMonthOldCustomers.length === 0}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-8 py-3 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {sendingFollowup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send to {sixMonthOldCustomers.length} Customers
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

