'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Settings, Users, Gift, Save, Award } from 'lucide-react';
import { loyaltyConfigService, LoyaltyConfig } from '@/lib/services/loyaltyConfig';
import { customerService, Customer } from '@/lib/services/customer';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import toast from "react-hot-toast";

export default function LoyaltyPage() {
  const [config, setConfig] = useState<LoyaltyConfig>({
    enabled: true,
    spendRequiredForOnePoint: 100,
    pointValueInTk: 1
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [confData, custData] = await Promise.all([
        loyaltyConfigService.getSettings(),
        customerService.getAll()
      ]);
      setConfig(confData);
      
      // Only keep customers with points and sort by points descending
      const topCustomers = custData
        .filter(c => (c.points || 0) > 0)
        .sort((a, b) => (b.points || 0) - (a.points || 0));
        
      setCustomers(topCustomers);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load loyalty data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.spendRequiredForOnePoint <= 0 || config.pointValueInTk <= 0) {
      return toast.error("Values must be greater than zero.");
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

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" /> Loyalty Program
          </h1>
          <p className="text-gray-400 text-sm">Reward your best customers with points and discounts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleSaveConfig} className="bg-card border border-gray-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" /> Reward Rules
              </h2>
              <Switch 
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({...config, enabled: checked})}
              />
            </div>
            
            <div className={`space-y-5 transition-opacity ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Spend Required for 1 Point (৳)</label>
                <div className="relative">
                  <Input 
                    type="number" min="1"
                    value={config.spendRequiredForOnePoint}
                    onChange={(e) => setConfig({...config, spendRequiredForOnePoint: parseInt(e.target.value) || 0})}
                    className="pl-4 pr-12 h-11 bg-background"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">TK</span>
                </div>
                <p className="text-xs text-gray-500">How much a customer must spend to earn 1 point.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Value of 1 Point (৳)</label>
                <div className="relative">
                  <Input 
                    type="number" min="0.1" step="0.1"
                    value={config.pointValueInTk}
                    onChange={(e) => setConfig({...config, pointValueInTk: parseFloat(e.target.value) || 0})}
                    className="pl-4 pr-12 h-11 bg-background"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">TK</span>
                </div>
                <p className="text-xs text-gray-500">Discount value when redeeming points.</p>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={saving}
              className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white h-11"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Rules'}
            </Button>
          </form>

          {/* Stats Card */}
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-yellow-500 flex items-center gap-2 mb-6">
              <Gift className="w-5 h-5" /> Program Impact
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-yellow-500/10 pb-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Points Distributed</p>
                  <p className="text-2xl font-bold text-gray-200">{totalPointsInMarket.toLocaleString()}</p>
                </div>
                <Star className="w-6 h-6 text-yellow-500/50 fill-yellow-500/20" />
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Discount Value</p>
                  <p className="text-2xl font-bold text-orange-400">{formatCurrency(totalPointsValueInTk)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Customers Leaderboard */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-gray-800 rounded-2xl overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
              <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-400" /> Top Loyal Customers
              </h2>
              <span className="text-xs font-medium bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full">
                {customers.length} Members
              </span>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center py-20 px-4">
                  <Star className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400">No points distributed yet</h3>
                  <p className="text-sm text-gray-500 mt-2">Customers will appear here once they earn points from repairs.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="bg-background/50 sticky top-0 z-10">
                    <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-800/50">
                      <th className="px-6 py-4">Rank</th>
                      <th className="px-6 py-4">Customer Info</th>
                      <th className="px-6 py-4">Points Balance</th>
                      <th className="px-6 py-4 text-right">Value (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {customers.map((c, index) => (
                      <tr key={c.id} className="hover:bg-gray-800/20 transition-colors">
                        <td className="px-6 py-4">
                          {index < 3 ? (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                              index === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                              'bg-orange-600/20 text-orange-400 border border-orange-600/30'
                            }`}>
                              #{index + 1}
                            </div>
                          ) : (
                            <span className="text-gray-500 font-medium ml-2">#{index + 1}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-200">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.phone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-bold text-yellow-500">{c.points?.toLocaleString()} pts</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-bold text-emerald-400">
                            {formatCurrency((c.points || 0) * config.pointValueInTk)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}


