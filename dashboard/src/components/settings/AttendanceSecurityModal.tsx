'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, 
  MapPin, 
  Wifi, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Radio, 
  Lock, 
  Compass, 
  Sparkles,
  Info
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  AttendanceSecuritySettings, 
  attendanceSecurityService, 
  defaultAttendanceSecuritySettings, 
  getCurrentGpsLocation, 
  getCurrentClientIp, 
  calculateDistanceMeters,
  VerificationResult 
} from '@/lib/services/attendanceSecurity';
import toast from 'react-hot-toast';

interface AttendanceSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function AttendanceSecurityModal({ isOpen, onClose, onSaved }: AttendanceSecurityModalProps) {
  const [settings, setSettings] = useState<AttendanceSecuritySettings>(defaultAttendanceSecuritySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Detection States
  const [detectingGps, setDetectingGps] = useState(false);
  const [detectingIp, setDetectingIp] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [customIpInput, setCustomIpInput] = useState('');

  // Diagnostic Live Test
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ran: boolean;
    allowed: boolean;
    currentIp?: string;
    wifiMatched: boolean;
    currentLat?: number;
    currentLon?: number;
    distanceMeters?: number;
    gpsMatched: boolean;
    error?: string;
  } | null>(null);

  // Load Settings on Open
  useEffect(() => {
    if (isOpen) {
      loadSettings();
      setTestResult(null);
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await attendanceSecurityService.getSettings();
      setSettings(data);
    } catch (e) {
      console.error(e);
      toast.error('সিকিউরিটি সেটিংস লোড করা যায়নি');
    } finally {
      setLoading(false);
    }
  };

  // 1. Detect & Set Current GPS
  const handleDetectCurrentGps = async () => {
    try {
      setDetectingGps(true);
      toast.loading('বর্তমান GPS অবস্থান খোঁজা হচ্ছে...', { id: 'gps-toast' });

      if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        toast.error('ব্রাউজারের নিরাপত্তা নিয়মে লোকাল HTTP আইপিতে সরাসরি GPS পারমিশন দেয় না। অনুগ্রহ করে নিচে অক্ষাংশ/দ্রাঘিমাংশ লিখুন অথবা লাইভ ডোমেইনে ব্যবহার করুন।', { 
          id: 'gps-toast',
          duration: 7000 
        });
        setDetectingGps(false);
        return;
      }

      const loc = await getCurrentGpsLocation();
      setSettings(prev => ({
        ...prev,
        shopLatitude: Number(loc.latitude.toFixed(6)),
        shopLongitude: Number(loc.longitude.toFixed(6))
      }));
      setGpsAccuracy(Math.round(loc.accuracy));
      toast.success(`লোকেশন সফলভাবে সেট হয়েছে! (±${Math.round(loc.accuracy)}m নিখুঁত)`, { id: 'gps-toast' });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'GPS অবস্থান পাওয়া যায়নি', { id: 'gps-toast' });
    } finally {
      setDetectingGps(false);
    }
  };

  // 2. Detect & Add Current Wi-Fi IP
  const handleLockCurrentIp = async () => {
    try {
      setDetectingIp(true);
      toast.loading('বর্তমান Wi-Fi আইপি শনাক্ত করা হচ্ছে...', { id: 'ip-toast' });
      const ip = await getCurrentClientIp();
      const newIps = (ip && ip !== '127.0.0.1' && ip !== '::1') ? [ip] : [];

      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
          if (!newIps.includes(hostname)) newIps.push(hostname);
          const parts = hostname.split('.');
          if (parts.length === 4) {
            const subnet = `${parts[0]}.${parts[1]}.${parts[2]}.*`;
            if (!newIps.includes(subnet)) newIps.push(subnet);
          }
        }
      }

      if (newIps.length === 0) {
        toast.error('কোনো নেটওয়ার্ক আইপি পাওয়া যায়নি। ম্যানুয়ালি লিখুন।', { id: 'ip-toast' });
        return;
      }

      setSettings(prev => {
        const merged = Array.from(new Set([...prev.allowedIpAddresses, ...newIps]));
        return {
          ...prev,
          allowedIpAddresses: merged
        };
      });
      toast.success(`Wi-Fi আইপি (${newIps.join(', ')}) সফলভাবে লক হয়েছে!`, { id: 'ip-toast' });
    } catch (e: any) {
      console.error(e);
      toast.error('আইপি শনাক্ত করা যায়নি', { id: 'ip-toast' });
    } finally {
      setDetectingIp(false);
    }
  };

  // 3. Add Custom IP
  const handleAddCustomIp = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customIpInput.trim();
    if (!clean) return;

    if (settings.allowedIpAddresses.includes(clean)) {
      toast.error('এই আইপি ইতোমধ্যে তালিকায় আছে');
      return;
    }

    setSettings(prev => ({
      ...prev,
      allowedIpAddresses: [...prev.allowedIpAddresses, clean]
    }));
    setCustomIpInput('');
    toast.success('আইপি সফলভাবে যুক্ত হয়েছে');
  };

  // 4. Remove IP
  const handleRemoveIp = (ipToRemove: string) => {
    setSettings(prev => ({
      ...prev,
      allowedIpAddresses: prev.allowedIpAddresses.filter(ip => ip !== ipToRemove)
    }));
  };

  // 5. Run Live Diagnostic Test
  const handleRunLiveTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      let currentIp = '';
      let wifiMatched = false;
      let currentLat: number | undefined;
      let currentLon: number | undefined;
      let distanceMeters: number | undefined;
      let gpsMatched = false;
      const errors: string[] = [];

      // Wi-Fi Check
      if (settings.wifiEnabled) {
        if (!settings.allowedIpAddresses || settings.allowedIpAddresses.length === 0) {
          wifiMatched = true;
        } else {
          currentIp = await getCurrentClientIp();
          wifiMatched = settings.allowedIpAddresses.some(ip => {
            const cleanAllowed = ip.trim();
            const cleanClient = currentIp.trim();
            if (cleanAllowed === cleanClient) return true;
            if (cleanAllowed.endsWith('*')) {
              return cleanClient.startsWith(cleanAllowed.slice(0, -1));
            }
            return false;
          });
          if (!wifiMatched) {
            errors.push('দোকানের Wi-Fi পাওয়া যায়নি');
          }
        }
      } else {
        wifiMatched = true;
      }

      // GPS Check
      if (settings.gpsEnabled) {
        if (settings.shopLatitude === null || settings.shopLongitude === null) {
          gpsMatched = true;
        } else {
          try {
            const loc = await getCurrentGpsLocation();
            currentLat = loc.latitude;
            currentLon = loc.longitude;
            distanceMeters = calculateDistanceMeters(
              loc.latitude,
              loc.longitude,
              settings.shopLatitude,
              settings.shopLongitude
            );
            const maxAllowed = settings.radiusMeters || 50;
            if (distanceMeters <= maxAllowed) {
              gpsMatched = true;
            } else {
              errors.push(`দোকান থেকে ${distanceMeters}m দূরে (অনুমোদিত ${maxAllowed}m)`);
            }
          } catch (e: any) {
            errors.push(e.message || 'GPS পাওয়া যায়নি');
          }
        }
      } else {
        gpsMatched = true;
      }

      const allowed = settings.mode === 'strict'
        ? (wifiMatched && gpsMatched)
        : (wifiMatched || gpsMatched);

      setTestResult({
        ran: true,
        allowed,
        currentIp,
        wifiMatched,
        currentLat,
        currentLon,
        distanceMeters,
        gpsMatched,
        error: errors.join(' এবং ')
      });

    } catch (e: any) {
      console.error(e);
      toast.error('টেস্ট রান করা যায়নি');
    } finally {
      setTesting(false);
    }
  };

  // 6. Save Settings to Firestore
  const handleSave = async () => {
    try {
      setSaving(true);
      await attendanceSecurityService.saveSettings(settings);
      toast.success('হাজিরা সিকিউরিটি সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
      onSaved?.();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-gray-800 text-white rounded-2xl p-5 sm:p-6 shadow-2xl custom-scrollbar">
        <DialogHeader className="border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                হাজিরা সিকিউরিটি সেটিংস (GPS & Wi-Fi Lock)
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                দোকানের বাইরে থেকে ফেক হাজিরা বন্ধ করতে জিপিএস ও ওয়াইফাই দ্বি-স্তরীয় নিরাপত্তা।
              </p>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm">সেটিংস লোড হচ্ছে...</p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            
            {/* MASTER TOGGLE CARD */}
            <div className="bg-[#121524] p-4 sm:p-5 rounded-2xl border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">হাজিরা অবস্থান ও নেটওয়ার্ক যাচাইকরণ</h3>
                  {settings.enabled ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      সক্রিয় (Active)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                      নিষ্ক্রিয় (Disabled)
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  অন থাকলে স্টাফরা কেবল দোকানে শারীরিকভাবে উপস্থিত ও ওয়াইফাইয়ে কানেক্টেড থেকেই চেক-ইন করতে পারবে।
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.enabled ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* SECURITY MODE SELECTION */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
                যাচাইয়ের ধরন (Security Mode)
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Strict Mode */}
                <div 
                  onClick={() => setSettings(prev => ({ ...prev, mode: 'strict' }))}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    settings.mode === 'strict'
                      ? 'bg-blue-500/10 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                      : 'bg-secondary/40 border-gray-800 hover:border-gray-700 text-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className={`w-4 h-4 ${settings.mode === 'strict' ? 'text-blue-400' : 'text-gray-500'}`} />
                      <span className="text-sm font-bold text-white">Strict Mode (উভয়টি বাধ্যতামূলক)</span>
                    </div>
                    {settings.mode === 'strict' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </div>
                  <p className="text-xs mt-2 text-gray-400 leading-relaxed">
                    স্টাফকে অবশ্যই দোকানের Wi-Fi-তে থাকতে হবে <strong>এবং</strong> নির্দিষ্ট দূরত্বের মধ্যে থাকতে হবে। সর্বোচ্চ নিরাপদ।
                  </p>
                </div>

                {/* Flexible Mode */}
                <div 
                  onClick={() => setSettings(prev => ({ ...prev, mode: 'flexible' }))}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    settings.mode === 'flexible'
                      ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                      : 'bg-secondary/40 border-gray-800 hover:border-gray-700 text-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className={`w-4 h-4 ${settings.mode === 'flexible' ? 'text-indigo-400' : 'text-gray-500'}`} />
                      <span className="text-sm font-bold text-white">Flexible Mode (যেকোনো একটি)</span>
                    </div>
                    {settings.mode === 'flexible' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                  </div>
                  <p className="text-xs mt-2 text-gray-400 leading-relaxed">
                    Wi-Fi অথবা GPS যেকোনো একটি মিললেই হাজিরা গ্রহণ করবে। দোকানে নেট বা জিপিএস দুর্বল হলে উপযোগী।
                  </p>
                </div>
              </div>
            </div>

            {/* GPS GEOFENCING CONFIGURATION */}
            <div className="bg-secondary/30 p-4 sm:p-5 rounded-2xl border border-gray-800 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">১. GPS Geofencing (দোকানের ভৌগোলিক অবস্থান)</h4>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400">
                  <span>সক্রিয়:</span>
                  <input 
                    type="checkbox"
                    checked={settings.gpsEnabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, gpsEnabled: e.target.checked }))}
                    className="rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-0 w-4 h-4"
                  />
                </label>
              </div>

              {/* Set Current GPS Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  type="button"
                  onClick={handleDetectCurrentGps}
                  disabled={detectingGps}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-10 px-4 shadow-md shadow-emerald-950/40"
                >
                  {detectingGps ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  ) : (
                    <Compass className="w-3.5 h-3.5 mr-2" />
                  )}
                  📍 বর্তমান অবস্থান থেকে দোকানের GPS সেট করুন
                </Button>

                {settings.shopLatitude && settings.shopLongitude && (
                  <a
                    href={`https://www.google.com/maps?q=${settings.shopLatitude},${settings.shopLongitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    গুগল ম্যাপে দেখুন
                  </a>
                )}
              </div>

              {/* Coordinates & Radius Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-400 block mb-1">অক্ষাংশ (Latitude)</label>
                  <input
                    type="number"
                    step="any"
                    value={settings.shopLatitude ?? ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, shopLatitude: e.target.value ? parseFloat(e.target.value) : null }))}
                    placeholder="e.g. 23.8103"
                    className="w-full bg-[#121524] border border-gray-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-gray-400 block mb-1">দ্রাঘিমাংশ (Longitude)</label>
                  <input
                    type="number"
                    step="any"
                    value={settings.shopLongitude ?? ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, shopLongitude: e.target.value ? parseFloat(e.target.value) : null }))}
                    placeholder="e.g. 90.4125"
                    className="w-full bg-[#121524] border border-gray-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-gray-400 block mb-1">অনুমোদিত দূরত্ব (Radius)</label>
                  <select
                    value={settings.radiusMeters || 50}
                    onChange={(e) => setSettings(prev => ({ ...prev, radiusMeters: parseInt(e.target.value) }))}
                    className="w-full bg-[#121524] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50"
                  >
                    <option value={20}>২০ মিটার (দোকানের ভেতরে)</option>
                    <option value={30}>৩০ মিটার</option>
                    <option value={50}>৫০ মিটার (প্রস্তাবিত)</option>
                    <option value={100}>১০০ মিটার</option>
                    <option value={200}>২০০ মিটার (বড় শোরুম)</option>
                  </select>
                </div>
              </div>

              {gpsAccuracy !== null && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ব্রাউজারের GPS নির্ভুলতা: ±{gpsAccuracy} মিটার
                </p>
              )}
            </div>

            {/* WI-FI RESTRICTION CONFIGURATION */}
            <div className="bg-secondary/30 p-4 sm:p-5 rounded-2xl border border-gray-800 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-bold text-white">২. Wi-Fi Restriction (দোকানের নেটওয়ার্ক লক)</h4>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400">
                  <span>সক্রিয়:</span>
                  <input 
                    type="checkbox"
                    checked={settings.wifiEnabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, wifiEnabled: e.target.checked }))}
                    className="rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-0 w-4 h-4"
                  />
                </label>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  type="button"
                  onClick={handleLockCurrentIp}
                  disabled={detectingIp}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold h-10 px-4 shadow-md shadow-blue-950/40"
                >
                  {detectingIp ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  ) : (
                    <Wifi className="w-3.5 h-3.5 mr-2" />
                  )}
                  📶 বর্তমান Wi-Fi আইপি লক করুন
                </Button>

                <div className="flex-1">
                  <input
                    type="text"
                    value={settings.shopWifiSsid || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, shopWifiSsid: e.target.value }))}
                    placeholder="দোকানের Wi-Fi নাম (যেমন: VSC_SHOP_5G)"
                    className="w-full bg-[#121524] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              {/* IP List */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-gray-400 block">
                  অনুমোদিত Wi-Fi / রাউটার আইপি তালিকা:
                </label>

                {settings.allowedIpAddresses.length === 0 ? (
                  <div className="p-3 bg-[#121524] rounded-xl border border-gray-800 text-center text-xs text-gray-500">
                    এখনও কোনো Wi-Fi আইপি যুক্ত করা হয়নি। উপরের বাটনে চাপ দিয়ে বর্তমান Wi-Fi লক করুন।
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {settings.allowedIpAddresses.map((ip) => (
                      <div
                        key={ip}
                        className="flex items-center gap-2 bg-[#121524] border border-blue-500/30 text-blue-300 px-3 py-1.5 rounded-xl text-xs font-mono shadow-sm"
                      >
                        <Wifi className="w-3 h-3 text-blue-400" />
                        <span>{ip}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIp(ip)}
                          className="text-gray-400 hover:text-red-400 transition-colors ml-1"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Custom IP manually */}
                <form onSubmit={handleAddCustomIp} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customIpInput}
                    onChange={(e) => setCustomIpInput(e.target.value)}
                    placeholder="ম্যানুয়ালি আইপি বা সাবনেট লিখুন (যেমন: 103.145.xxx.xxx বা 192.168.10.*)"
                    className="flex-1 bg-[#121524] border border-gray-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500/50"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="border-gray-800 hover:bg-gray-800 text-xs text-gray-300 h-9 px-3"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> যোগ করুন
                  </Button>
                </form>
              </div>
            </div>

            {/* OWNER BYPASS TOGGLE */}
            <div className="p-3.5 bg-secondary/30 rounded-xl border border-gray-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">মালিক ও ম্যানেজারের জন্য শিথিলতা (Owner Bypass)</span>
                <span className="text-[11px] text-gray-400">Owner ও Manager যেকোনো স্থান থেকেই চেক-ইন করতে পারবেন।</span>
              </div>
              <input
                type="checkbox"
                checked={settings.allowOwnerBypass}
                onChange={(e) => setSettings(prev => ({ ...prev, allowOwnerBypass: e.target.checked }))}
                className="rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-0 w-4 h-4"
              />
            </div>

            {/* LIVE DIAGNOSTIC TEST */}
            <div className="p-4 bg-gradient-to-r from-blue-950/20 via-[#121524] to-indigo-950/20 rounded-2xl border border-blue-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    লাইভ টেস্ট ডায়াগনস্টিক (Live Attendance Test)
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    আপনার বর্তমান অবস্থান ও নেটওয়ার্ক পাস করছে কি না এখুনি পরীক্ষা করুন।
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleRunLiveTest}
                  disabled={testing}
                  variant="outline"
                  className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border-blue-500/30 text-xs h-9 px-3 font-semibold"
                >
                  {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  পরীক্ষা করুন
                </Button>
              </div>

              {testResult?.ran && (
                <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  testResult.allowed 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {testResult.allowed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>✅ চেক-ইন সফল হবে! (অনুমোদিত)</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <span>❌ চেক-ইন আটকে যাবে! ({testResult.error || 'শর্ত পূরণ হয়নি'})</span>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <Wifi className="w-3 h-3" />
                      <span>Wi-Fi IP: {testResult.currentIp || 'N/A'}</span>
                      {testResult.wifiMatched ? <span className="text-emerald-400">● মিল রয়েছে</span> : <span className="text-rose-400">● মিলেনি</span>}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      <span>GPS দূরত্ব: {testResult.distanceMeters !== undefined ? `${testResult.distanceMeters}m` : 'অজানা'}</span>
                      {testResult.gpsMatched ? <span className="text-emerald-400">● রেঞ্জে আছে</span> : <span className="text-rose-400">● দূরে</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-800 pt-4 mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-white text-xs h-10 px-4"
          >
            বাতিল
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-10 px-6 shadow-lg shadow-blue-950/40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            সংরক্ষণ করুন (Save)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
