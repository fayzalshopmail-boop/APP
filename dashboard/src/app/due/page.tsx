'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Customer, customerService } from '@/lib/services/customer';
import { shopTransactionService } from '@/lib/services/shopTransaction';
import { formatCurrency } from '@/lib/currency';
import { motion } from 'framer-motion';
import { Coins, Search, ArrowUpRight, Phone, Calendar, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PaymentModal } from '@/components/ui/PaymentModal';

export default function DuePage() {
  const { user } = useAppStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchDues();
  }, []);

  const fetchDues = async () => {
    try {
      setLoading(true);
      const data = await customerService.getAll();
      const dueCustomers = data.filter(c => c.due > 0);
      setCustomers(dueCustomers);
    } catch (error) {
      console.error("Failed to fetch dues", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReceivePayment = async (amount: number, nextDueDate?: string) => {
    if (!paymentModalCustomer) return;
    try {
      const result = await shopTransactionService.receivePayment(paymentModalCustomer.id, amount, user?.email || 'Unknown', nextDueDate);
      
      setCustomers(customers.map(c => {
        if (c.id === paymentModalCustomer.id) {
          return {
            ...c,
            advance: result.newAdvance,
            due: result.newDue,
            ...(result.newDue === 0 ? { dueDate: '' } : nextDueDate ? { dueDate: nextDueDate } : {})
          };
        }
        return c;
      }).filter(c => c.due > 0));
      
      setPaymentModalCustomer(null);
    } catch (err: any) {
      console.error("Payment error", err);
      alert(err.message || 'Failed to process payment');
    }
  };

  const filteredCustomers = customers
    .filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    )
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  const totalDues = customers.reduce((sum, c) => sum + c.due, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Coins className="w-6 h-6 text-orange-400" />
            Pending Dues
          </h1>
          <p className="text-sm text-gray-400 mt-1">Manage and collect outstanding balances from customers</p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1 uppercase tracking-wider">Total Outstanding Due</p>
              <h2 className="text-3xl font-bold text-white">{formatCurrency(totalDues)}</h2>
            </div>
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <Coins className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and List */}
      <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-border bg-card/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              type="text" 
              placeholder="Search by customer name or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
              <Coins className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No pending dues!</h3>
            <p className="text-gray-400 text-sm">All customers have cleared their balances.</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)] relative">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-400 uppercase bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Due Amount</th>
                  <th className="px-6 py-4 font-semibold">Due Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredCustomers.map((c, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={c.id} 
                    className="hover:bg-secondary/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white mb-1">{c.name}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-orange-400 font-bold text-base">
                        {formatCurrency(c.due)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.dueDate ? (
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${
                          new Date(c.dueDate) < new Date() ? 'text-red-400' : 'text-gray-300'
                        }`}>
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(c.dueDate).toLocaleDateString()}
                          {new Date(c.dueDate) < new Date() && (
                            <AlertCircle className="w-3.5 h-3.5 ml-1 text-red-500" title="Overdue!" />
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">Not specified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        onClick={() => setPaymentModalCustomer(c)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
                      >
                        <ArrowUpRight className="w-4 h-4 mr-1" />
                        Collect
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PaymentModal 
        isOpen={!!paymentModalCustomer}
        onClose={() => setPaymentModalCustomer(null)}
        customer={paymentModalCustomer}
        onSave={handleReceivePayment}
      />
    </div>
  );
}


