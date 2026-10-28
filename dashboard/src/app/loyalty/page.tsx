'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Settings, Users, Gift, Save, Award, Search } from 'lucide-react';
import { loyaltyConfigService, LoyaltyConfig } from '@/lib/services/loyaltyConfig';
import { customerService, Customer } from '@/lib/services/customer';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { PaginationControl } from '@/components/ui/PaginationControl';
import { MobileDataCard } from '@/components/ui/MobileDataCard';
import toast from "react-hot-toast";

export default function LoyaltyPage() {
  const [config, setConfig] = useState<LoyaltyConfig>({
    enabled: true,
    spendRequiredForOnePoint: 100,
    pointValueInTk: 1,
    minPointsToRedeem: 0
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [confData, topCustomers] = await Promise.all([
        loyaltyConfigService.getSettings(),
        customerService.getWithPoints()
      ]);
      setConfig(confData);
      setCustomers(topCustomers);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load loyalty data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.spendRequiredForOnePoint <= 0 || config.pointValueInTk <= 0) {
      return toast.error("Values must be greater than zero.");
    }
    if ((config.minPointsToRedeem ?? 0) < 0) {
      return toast.error("Minimum points cannot be negative.");
    }
    try {
      setSaving(true);
      await loyaltyConfigService.saveSettings(config);
      toast.success("Loyalty settings updated!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const totalPointsInMarket = customers.reduce((acc, c) => acc + (c.points || 0), 0);
  const totalPointsValueInTk = totalPointsInMarket * config.pointValueInTk;

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-[1600px] mx-auto pb-6 lg:pb-0">
      {/* 3 Top Summary KPI Cards (Program Impact) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 mb-3 sm:mb-4">
        {/* Card 1: Total Points Distributed */}
        <div className="bg-card/90 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-gray-800/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-gray-400">মোট অর্জিত পয়েন্ট</p>
            <p className="text-base sm:text-xl font-bold text-white tracking-tight mt-0.5">
              {totalPointsInMarket.toLocaleString()} <span className="text-xs font-medium text-yellow-500">pts</span>
            </p>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 shrink-0">
            <Star className="w-4 h-4 fill-yellow-500/30" />
          </div>
        </div>

        {/* Card 2: Total Discount Value */}
        <div className="bg-card/90 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-gray-800/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-gray-400">সম্ভাব্য মোট ছাড়</p>
            <p className="text-base sm:text-xl font-bold text-emerald-400 tracking-tight mt-0.5">
              {formatCurrency(totalPointsValueInTk)}
            </p>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Gift className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Loyal Members */}
        <div className="bg-card/90 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-gray-800/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-gray-400">পয়েন্ট প্রাপ্ত কাস্টমার</p>
            <p className="text-base sm:text-xl font-bold text-blue-400 tracking-tight mt-0.5">
              {customers.length} <span className="text-xs font-medium text-gray-400">জন</span>
            </p>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Users className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Grid (No Scroll on PC) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
        
        {/* Left Column: Reward Rules Settings (lg: 4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <form onSubmit={handleSaveConfig} className="bg-card/90 border border-gray-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 relative">
            <div className="flex items-center justify-between pb-2.5 border-b border-gray-800/80 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white leading-tight">Reward Rules</h2>
                  <p className="text-[10px] sm:text-[11px] text-gray-400">পয়েন্ট ও ছাড়ের নিয়মাবলী</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  config.enabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                }`}>
                  {config.enabled ? 'সক্রিয়' : 'বন্ধ'}
                </span>
                <Switch 
                  checked={config.enabled}
                  onCheckedChange={(checked) => setConfig({...config, enabled: checked})}
                />
              </div>
            </div>
            
            <div className={`space-y-2.5 transition-opacity ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] sm:text-xs font-semibold text-gray-300">Spend for 1 Point (৳)</label>
                  <span className="text-[10px] text-gray-500">প্রতি কত খরচে ১ পয়েন্ট</span>
                </div>
                <div className="relative">
                  <Input 
                    type="number" min="1"
                    placeholder="100"
                    value={config.spendRequiredForOnePoint || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setConfig({...config, spendRequiredForOnePoint: parseInt(e.target.value) || 0})}
                    className="pl-3 pr-10 h-8 sm:h-8.5 text-xs bg-background/80 border-gray-800 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-[11px] font-semibold">TK</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] sm:text-xs font-semibold text-gray-300">Value of 1 Point (৳)</label>
                  <span className="text-[10px] text-gray-500">১ পয়েন্টের মূল্য (ছাড়)</span>
                </div>
                <div className="relative">
                  <Input 
                    type="number" min="0.1" step="0.1"
                    placeholder="1"
                    value={config.pointValueInTk || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setConfig({...config, pointValueInTk: parseFloat(e.target.value) || 0})}
                    className="pl-3 pr-10 h-8 sm:h-8.5 text-xs bg-background/80 border-gray-800 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-[11px] font-semibold">TK</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] sm:text-xs font-semibold text-gray-300">Minimum Points to Redeem</label>
                  <span className="text-[10px] text-gray-500">সর্বনিম্ন রিডিম সীমা</span>
                </div>
                <div className="relative">
                  <Input 
                    type="number" min="0"
                    placeholder="0"
                    value={config.minPointsToRedeem || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setConfig({...config, minPointsToRedeem: Math.max(0, parseInt(e.target.value) || 0)})}
                    className="pl-3 pr-10 h-8 sm:h-8.5 text-xs bg-background/80 border-gray-800 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-[11px] font-semibold">PTS</span>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={saving}
              className="w-full mt-3.5 h-8.5 sm:h-9 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'সেভ রুলস (Save Rules)'}
            </Button>
          </form>
        </div>

        {/* Right Column: Top Loyal Customers Leaderboard (lg: 7-8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="bg-card/90 border border-gray-800/80 rounded-xl sm:rounded-2xl overflow-hidden flex flex-col">
            <div className="p-3 sm:p-3.5 border-b border-gray-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 bg-gray-900/40">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white leading-tight">Top Loyal Customers</h2>
                  <p className="text-[10px] sm:text-[11px] text-gray-400">{filteredCustomers.length} জন পয়েন্ট প্রাপ্ত কাস্টমার</p>
                </div>
              </div>
              <div className="relative w-full sm:w-48 lg:w-56">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input 
                  placeholder="খুঁজুন (নাম বা ফোন)..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-8 h-8 text-xs bg-background/80 border-gray-800 rounded-lg focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex-1 p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-9 h-9 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-2 text-yellow-500">
                    <Star className="w-4 h-4 fill-yellow-500/30" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-300">কোন কাস্টমার পাওয়া যায়নি</h3>
                  <p className="text-[11px] text-gray-500 mt-1 max-w-xs mx-auto">পয়েন্ট অর্জনকারী কাস্টমারদের তালিকা এখানে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table with controlled max-height */}
                  <div className="hidden md:block overflow-x-auto max-h-[260px] xl:max-h-[300px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                      <thead className="bg-background/80 sticky top-0 z-10 backdrop-blur-sm">
                        <tr className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800/60">
                          <th className="px-4 py-2.5">Rank</th>
                          <th className="px-4 py-2.5">Customer Info</th>
                          <th className="px-4 py-2.5">Points Balance</th>
                          <th className="px-4 py-2.5 text-right">Value (৳)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {paginatedCustomers.map((c, index) => {
                          const rank = (currentPage - 1) * itemsPerPage + index + 1;
                          return (
                            <tr key={c.id} className="hover:bg-gray-800/30 transition-colors">
                              <td className="px-4 py-2.5">
                                {rank <= 3 ? (
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                    rank === 1 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                                    rank === 2 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                                    'bg-orange-600/20 text-orange-400 border border-orange-600/30'
                                  }`}>
                                    #{rank}
                                  </div>
                                ) : (
                                  <span className="text-gray-500 font-medium ml-1">#{rank}</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                <p className="text-xs font-bold text-gray-200">{c.name}</p>
                                <p className="text-[10px] text-gray-500">{c.phone}</p>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                  <span className="text-xs font-bold text-yellow-500">{c.points?.toLocaleString()} pts</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <span className="text-xs font-bold text-emerald-400">
                                  {formatCurrency((c.points || 0) * config.pointValueInTk)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-2.5 p-3">
                    {paginatedCustomers.map((c, index) => {
                      const rank = (currentPage - 1) * itemsPerPage + index + 1;
                      return (
                        <MobileDataCard key={c.id}>
                          <MobileDataCard.Header
                            title={c.name}
                            subtitle={c.phone}
                            badge={
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                rank === 2 ? 'bg-gray-400/20 text-gray-300 border-gray-400/30' :
                                rank === 3 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              }`}>
                                #{rank} Rank
                              </span>
                            }
                          />
                          <MobileDataCard.FinancialStrip
                            items={[
                              { label: 'পয়েন্ট ব্যালেন্স', value: `${(c.points || 0).toLocaleString()} pts` },
                              { label: 'মূল্য (ছাড়)', value: formatCurrency((c.points || 0) * config.pointValueInTk), highlight: 'success' },
                            ]}
                          />
                        </MobileDataCard>
                      );
                    })}
                  </div>

                  {/* Pagination (only shown when multiple pages exist) */}
                  {totalPages > 1 && (
                    <div className="p-2.5 border-t border-gray-800/80">
                      <PaginationControl
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredCustomers.length}
                        itemsPerPage={itemsPerPage}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}


