'use client';

import { useState, useEffect } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { motion } from 'framer-motion';
import { Wallet, Plus, Trash2, Calendar, Coffee, Plug, Car, UserCircle, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/currency';
import { expenseService, Expense } from '@/lib/services/expense';
import { Filter } from 'lucide-react';

const EXPENSE_CATEGORIES = [
  { name: 'Tea & Snacks', icon: Coffee, color: 'text-orange-400' },
  { name: 'Utilities & Bills', icon: Plug, color: 'text-blue-400' },
  { name: 'Transport', icon: Car, color: 'text-emerald-400' },
  { name: 'Staff Salary', icon: UserCircle, color: 'text-purple-400' },
  { name: 'Shop Supplies', icon: ShoppingBag, color: 'text-pink-400' },
  { name: 'Other', icon: Wallet, color: 'text-gray-400' }
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Tea & Snacks',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await expenseService.getAll();
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newExpense = {
        title: formData.title,
        category: formData.category,
        amount: Number(formData.amount),
        date: formData.date
      };
      const id = await expenseService.add(newExpense);
      setExpenses([{ id, ...newExpense }, ...expenses]);
      setIsModalOpen(false);
      setFormData({ title: '', category: 'Tea & Snacks', amount: '', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error("Failed to add expense", err);
    }
  };

  const handleDeleteRequest = (id: string) => {
    setConfirmModal({isOpen: true, id});
  };

  const handleConfirmDelete = async () => {
    if (!confirmModal.id) return;
    try {
      await expenseService.delete(confirmModal.id as string);
      setExpenses(expenses.filter(e => e.id !== (confirmModal.id as string)));
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmModal({isOpen: false, id: null});
    }
  };

  // Calculations
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const thisMonthExpenses = expenses
    .filter(e => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = expenses.filter(expense => {
    if (dateFilter === 'all') return true;
    
    const today = new Date();
    const expDateStr = expense.date; // YYYY-MM-DD
    
    if (dateFilter === 'today') {
      const todayStr = today.toISOString().split('T')[0];
      return expDateStr === todayStr;
    }
    
    if (dateFilter === 'week') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      return new Date(expDateStr) >= lastWeek;
    }
    
    if (dateFilter === 'month') {
      return expDateStr.startsWith(currentMonth);
    }
    
    return true;
  });

  const getCategoryIcon = (catName: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.name === catName);
    return cat ? cat : EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
  };

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
            <Wallet className="w-6 h-6 text-pink-500" />
            Shop Expenses
          </h1>
          <p className="text-sm text-gray-400 mt-1">Track daily expenses and operational costs</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#1a1d2d] rounded-xl border border-gray-800/80 p-1">
            <Filter className="w-4 h-4 text-gray-500 ml-2" />
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-transparent border-none text-xs text-gray-300 focus:ring-0 cursor-pointer outline-none pl-2 pr-4 py-1"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1 uppercase tracking-wider">This Month</p>
              <h2 className="text-3xl font-bold text-white">{formatCurrency(thisMonthExpenses)}</h2>
            </div>
            <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-pink-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        {expenses.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No expenses recorded</h3>
            <p className="text-gray-400 text-sm">Click "Add Expense" to track your first shop expense.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-400 uppercase bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Category</th>
                  <th className="px-6 py-4 font-semibold">Title</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredExpenses.map((expense, idx) => {
                  const Category = getCategoryIcon(expense.category);
                  const Icon = Category.icon;
                  return (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={expense.id} 
                      className="hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-300 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          {expense.date}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md bg-secondary border border-border ${Category.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-gray-300">{expense.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{expense.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">
                          {formatCurrency(expense.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRequest(expense.id)}
                          className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">Add Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Category</label>
              <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v || ''})}>
                <SelectTrigger className="w-full bg-secondary border-border h-10">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.name} value={cat.name}>
                      <div className="flex items-center gap-2">
                        <cat.icon className={`w-4 h-4 ${cat.color}`} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Title / Description</label>
              <Input 
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g. Afternoon Tea, Electricity Bill..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Amount (৳)</label>
                <Input 
                  required
                  type="number"
                  min="1"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Date</label>
                <Input 
                  required
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">
                Save Expense
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({isOpen: false, id: null})}
        onConfirm={handleConfirmDelete}
        title="Delete Expense?"
        message="Are you sure you want to delete this expense record? This action cannot be undone."
        confirmText="Delete Expense"
      />
    </div>
  );
}







