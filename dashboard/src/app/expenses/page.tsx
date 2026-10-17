'use client';

import { useState, useEffect } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { motion } from 'framer-motion';
import { Wallet, Plus, Trash2, Calendar, Coffee, Plug, Car, UserCircle, ShoppingBag, Search, Filter, Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/currency';
import { expenseService, Expense } from '@/lib/services/expense';
import { PaginationControl } from '@/components/ui/PaginationControl';
import { FilterChipBar } from '@/components/ui/FilterChipBar';
import { MobileDataCard } from '@/components/ui/MobileDataCard';
import { getLocalDateString } from '@/lib/utils';
import toast from 'react-hot-toast';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Tea & Snacks',
    amount: '',
    date: getLocalDateString()
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    const handleOpenAdd = () => {
      handleOpenAddModal();
    };
    window.addEventListener('app:add-expense', handleOpenAdd);
    return () => window.removeEventListener('app:add-expense', handleOpenAdd);
  }, []);

  const handleOpenAddModal = () => {
    setEditingExpenseId(null);
    setFormData({ title: '', category: 'Tea & Snacks', amount: '', date: getLocalDateString() });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setFormData({
      title: expense.title,
      category: expense.category,
      amount: expense.amount.toString(),
      date: expense.date
    });
    setIsModalOpen(true);
  };

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
      if (editingExpenseId) {
        const updateData = {
          title: formData.title,
          category: formData.category,
          amount: Number(formData.amount),
          date: formData.date
        };
        await expenseService.update(editingExpenseId, updateData);
        setExpenses(expenses.map(e => e.id === editingExpenseId ? { ...e, ...updateData } : e));
        setIsModalOpen(false);
        setEditingExpenseId(null);
        setFormData({ title: '', category: 'Tea & Snacks', amount: '', date: getLocalDateString() });
        toast.success('খরচ সফলভাবে আপডেট করা হয়েছে');
      } else {
        const newExpense = {
          title: formData.title,
          category: formData.category,
          amount: Number(formData.amount),
          date: formData.date
        };
        const id = await expenseService.add(newExpense);
        setExpenses([{ id, ...newExpense }, ...expenses]);
        setIsModalOpen(false);
        setFormData({ title: '', category: 'Tea & Snacks', amount: '', date: getLocalDateString() });
        toast.success('খরচ সফলভাবে যোগ করা হয়েছে');
      }
    } catch (err) {
      console.error("Failed to save expense", err);
      toast.error('খরচ সংরক্ষণ করতে সমস্যা হয়েছে');
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
      toast.success('খরচ সফলভাবে মুছে ফেলা হয়েছে');
    } catch (err) {
      console.error(err);
      toast.error('খরচ মুছতে সমস্যা হয়েছে');
    } finally {
      setConfirmModal({isOpen: false, id: null});
    }
  };

  // Calculations
  const todayStr = getLocalDateString();
  const currentMonth = todayStr.slice(0, 7); // YYYY-MM

  const thisMonthExpenses = expenses
    .filter(e => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + e.amount, 0);

  const todayExpenses = expenses
    .filter(e => e.date === todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalAllTimeExpenses = expenses
    .reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (dateFilter === 'all') return true;
    if (dateFilter === 'today') {
      return expense.date === todayStr;
    }
    if (dateFilter === 'week') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      return new Date(expense.date) >= lastWeek;
    }
    if (dateFilter === 'month') {
      return expense.date.startsWith(currentMonth);
    }
    return true;
  });

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage) || 1;
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleFilterChange = (id: string) => {
    setDateFilter(id as 'all' | 'today' | 'week' | 'month');
    setCurrentPage(1);
  };

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
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-pink-500" />
            Shop Expenses (দোকানের খরচ)
          </h1>
          <p className="text-sm text-gray-400 mt-1">দৈনন্দিন খরচ ও নিয়মিত ব্যয় ট্র্যাকিং</p>
        </div>
        <Button 
          onClick={handleOpenAddModal}
          className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন খরচ (Add Expense)</span>
        </Button>
      </div>

      {/* 3-Card Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-pink-500/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">চলতি মাসের খরচ (This Month)</p>
              <h2 className="text-2xl font-bold text-pink-400">{formatCurrency(thisMonthExpenses)}</h2>
              <p className="text-[11px] text-gray-500 mt-1">চলতি মাসের মোট ব্যয়</p>
            </div>
            <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center border border-pink-500/20">
              <Wallet className="w-6 h-6 text-pink-400" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">আজকের খরচ (Today)</p>
              <h2 className="text-2xl font-bold text-blue-400">{formatCurrency(todayExpenses)}</h2>
              <p className="text-[11px] text-gray-500 mt-1">আজকের মোট ব্যয়</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">সর্বমোট খরচ (All Time)</p>
              <h2 className="text-2xl font-bold text-emerald-400">{formatCurrency(totalAllTimeExpenses)}</h2>
              <p className="text-[11px] text-gray-500 mt-1">মোট {expenses.length} টি খরচ রেকর্ড</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <Coffee className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Chip Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              type="text" 
              placeholder="খরচের বিবরণ বা ক্যাটাগরি দিয়ে খুঁজুন..." 
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-background/50 h-10"
            />
          </div>
          <FilterChipBar
            filters={[
              { id: 'all', label: 'সব খরচ', count: expenses.length },
              { id: 'today', label: 'আজকে', count: expenses.filter(e => e.date === todayStr).length },
              { id: 'week', label: 'গত ৭ দিন' },
              { id: 'month', label: 'চলতি মাস', count: expenses.filter(e => e.date.startsWith(currentMonth)).length }
            ]}
            activeFilter={dateFilter}
            onFilterChange={handleFilterChange}
          />
        </div>
      </div>

      {/* Content Area */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-pink-500/10 rounded-full flex items-center justify-center mb-4">
            <Wallet className="w-8 h-8 text-pink-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">কোন খরচ পাওয়া যায়নি</h3>
          <p className="text-gray-400 text-sm">নতুন খরচ যোগ করতে উপরের "নতুন খরচ" বাটনে ক্লিক করুন।</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto relative">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-gray-400 uppercase bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">তারিখ</th>
                    <th className="px-6 py-4 font-semibold">ক্যাটাগরি</th>
                    <th className="px-6 py-4 font-semibold">বিবরণ</th>
                    <th className="px-6 py-4 font-semibold">পরিমাণ</th>
                    <th className="px-6 py-4 font-semibold text-right">পদক্ষেপ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedExpenses.map((expense, idx) => {
                    const Category = getCategoryIcon(expense.category);
                    const Icon = Category.icon;
                    return (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
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
                            <span className="text-gray-300 font-medium">{expense.category}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{expense.title}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-white text-base">
                            {formatCurrency(expense.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditModal(expense)}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                              title="এডিট করুন"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRequest(expense.id)}
                              className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {paginatedExpenses.map((expense) => {
              const Category = getCategoryIcon(expense.category);
              const Icon = Category.icon;
              return (
                <MobileDataCard key={expense.id}>
                  <MobileDataCard.Header
                    title={expense.title}
                    subtitle={expense.date}
                    badge={
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-secondary/80 ${Category.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{expense.category}</span>
                      </div>
                    }
                  />
                  <MobileDataCard.FinancialStrip
                    items={[
                      { label: 'খরচের পরিমাণ', value: formatCurrency(expense.amount), highlight: 'danger' },
                    ]}
                  />
                  <MobileDataCard.Actions>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleOpenEditModal(expense)} 
                      className="flex-1 border-blue-500/20 text-blue-400 hover:bg-blue-500/10 text-xs h-8"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> এডিট
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeleteRequest(expense.id)} 
                      className="flex-1 border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs h-8"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> মুছে ফেলুন
                    </Button>
                  </MobileDataCard.Actions>
                </MobileDataCard>
              );
            })}
          </div>

          {/* Pagination */}
          <PaginationControl
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredExpenses.length}
            itemsPerPage={itemsPerPage}
          />
        </>
      )}

      {/* Add / Edit Expense Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setEditingExpenseId(null); }}>
        <DialogContent className="sm:max-w-md bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              {editingExpenseId ? 'খরচ এডিট করুন (Edit Expense)' : 'নতুন খরচ যোগ করুন (Add Expense)'}
            </DialogTitle>
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
              <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setEditingExpenseId(null); }}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">
                {editingExpenseId ? 'আপডেট করুন (Update)' : 'খরচ সংরক্ষণ (Save Expense)'}
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







