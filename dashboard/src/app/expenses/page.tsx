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
import { getLocalDateString } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import toast from 'react-hot-toast';

const EXPENSE_CATEGORIES = [
  { name: 'Tea & Snacks', bn: 'চা ও নাশতা', icon: Coffee, color: 'text-orange-400' },
  { name: 'Utilities & Bills', bn: 'বিল ও ইউটিলিটি', icon: Plug, color: 'text-blue-400' },
  { name: 'Transport', bn: 'যাতায়াত / ভাড়া', icon: Car, color: 'text-emerald-400' },
  { name: 'Staff Salary', bn: 'স্টাফ বেতন', icon: UserCircle, color: 'text-purple-400' },
  { name: 'Shop Supplies', bn: 'দোকানের মালামাল', icon: ShoppingBag, color: 'text-pink-400' },
  { name: 'Other', bn: 'অন্যান্য', icon: Wallet, color: 'text-gray-400' }
];

export default function ExpensesPage() {
  const { t, language } = useTranslation();
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

  const handleOpenAddModal = () => {
    setEditingExpenseId(null);
    setFormData({ title: '', category: 'Tea & Snacks', amount: '', date: getLocalDateString() });
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
        toast.success(language === 'bn' ? 'খরচ সফলভাবে আপডেট করা হয়েছে' : 'Expense updated successfully');
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
        toast.success(language === 'bn' ? 'খরচ সফলভাবে যোগ করা হয়েছে' : 'Expense added successfully');
      }
    } catch (err) {
      console.error("Failed to save expense", err);
      toast.error(language === 'bn' ? 'খরচ সংরক্ষণ করতে সমস্যা হয়েছে' : 'Failed to save expense');
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
      toast.success(language === 'bn' ? 'খরচ সফলভাবে মুছে ফেলা হয়েছে' : 'Expense deleted successfully');
    } catch (err) {
      console.error(err);
      toast.error(language === 'bn' ? 'খরচ মুছতে সমস্যা হয়েছে' : 'Failed to delete expense');
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
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300 pb-10 max-w-[1600px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500" />
            {language === 'bn' ? 'দোকানের খরচ (Expenses)' : 'Shop Expenses'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">
            {language === 'bn' ? 'দৈনন্দিন খরচ ও নিয়মিত ব্যয় ট্র্যাকিং' : 'Daily expenses and routine expenditure tracking'}
          </p>
        </div>
      </div>

      {/* 3-Card Summary: Side-by-side 3 cols on mobile & desktop */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Card 1: This Month */}
        <div className="bg-card/90 border border-pink-500/20 hover:border-pink-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 relative overflow-hidden group shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 truncate">{language === 'bn' ? 'চলতি মাস' : 'This Month'}</span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 bg-pink-500/10 rounded-lg sm:rounded-xl flex items-center justify-center border border-pink-500/20 text-pink-400 shrink-0">
              <Wallet className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-2xl font-bold text-pink-400 tracking-tight leading-tight truncate">
              {formatCurrency(thisMonthExpenses)}
            </div>
            <p className="text-[9px] sm:text-[11px] text-gray-500 mt-0.5 truncate hidden sm:block">
              {language === 'bn' ? 'চলতি মাসের মোট ব্যয়' : 'Total spent this month'}
            </p>
          </div>
        </div>

        {/* Card 2: Today */}
        <div className="bg-card/90 border border-blue-500/20 hover:border-blue-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 relative overflow-hidden group shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 truncate">{language === 'bn' ? 'আজকের খরচ' : 'Today\'s Expenses'}</span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 bg-blue-500/10 rounded-lg sm:rounded-xl flex items-center justify-center border border-blue-500/20 text-blue-400 shrink-0">
              <Calendar className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-2xl font-bold text-blue-400 tracking-tight leading-tight truncate">
              {formatCurrency(todayExpenses)}
            </div>
            <p className="text-[9px] sm:text-[11px] text-gray-500 mt-0.5 truncate hidden sm:block">
              {language === 'bn' ? 'আজকের মোট ব্যয়' : 'Total spent today'}
            </p>
          </div>
        </div>

        {/* Card 3: Total Expenses */}
        <div className="bg-card/90 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 relative overflow-hidden group shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 truncate">{language === 'bn' ? 'সর্বমোট খরচ' : 'Total Expenses'}</span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 bg-emerald-500/10 rounded-xl sm:rounded-xl flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0">
              <Coffee className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-2xl font-bold text-emerald-400 tracking-tight leading-tight truncate">
              {formatCurrency(totalAllTimeExpenses)}
            </div>
            <p className="text-[9px] sm:text-[11px] text-gray-500 mt-0.5 truncate hidden sm:block">
              {language === 'bn' ? `মোট ${expenses.length} টি রেকর্ড` : `Total ${expenses.length} records`}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter Chip Bar */}
      <div className="bg-card/90 border border-gray-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-sm space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input 
              type="text" 
              placeholder={language === 'bn' ? 'খরচের বিবরণ বা ক্যাটাগরি...' : 'Expense title or category...'} 
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-popover/80 border-gray-800 h-9 sm:h-10 text-xs sm:text-sm rounded-xl focus:border-blue-500"
            />
          </div>
          <FilterChipBar
            filters={[
              { id: 'all', label: language === 'bn' ? 'সব খরচ' : 'All Expenses', count: expenses.length },
              { id: 'today', label: language === 'bn' ? 'আজকে' : 'Today', count: expenses.filter(e => e.date === todayStr).length },
              { id: 'week', label: language === 'bn' ? 'গত ৭ দিন' : 'Last 7 Days' },
              { id: 'month', label: language === 'bn' ? 'চলতি মাস' : 'This Month', count: expenses.filter(e => e.date.startsWith(currentMonth)).length }
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
          <h3 className="text-lg font-semibold text-white mb-2">
            {language === 'bn' ? 'কোন খরচ পাওয়া যায়নি' : 'No expenses found'}
          </h3>
          <p className="text-gray-400 text-sm">
            {language === 'bn' ? 'নতুন খরচ যোগ করতে উপরের "নতুন খরচ" বাটনে ক্লিক করুন।' : 'Click the "New Expense" button to record an expense.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto relative">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-gray-400 uppercase bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                    <th className="px-6 py-4 font-semibold">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                    <th className="px-6 py-4 font-semibold">{language === 'bn' ? 'বিবরণ' : 'Description'}</th>
                    <th className="px-6 py-4 font-semibold">{language === 'bn' ? 'পরিমাণ' : 'Amount'}</th>
                    <th className="px-6 py-4 font-semibold text-right">{language === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
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
                            <span className="text-gray-300 font-medium">
                              {language === 'bn' ? (Category.bn || expense.category) : expense.category}
                            </span>
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
                              title={language === 'bn' ? 'এডিট করুন' : 'Edit'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRequest(expense.id)}
                              className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                              title={language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
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

          {/* Mobile Card View (Sleek, Compact & Space-Efficient) */}
          <div className="md:hidden space-y-2">
            {paginatedExpenses.map((expense) => {
              const Category = getCategoryIcon(expense.category);
              const Icon = Category.icon;
              return (
                <div 
                  key={expense.id} 
                  className="bg-card/90 border border-gray-800/90 rounded-xl p-3 shadow-sm hover:border-gray-700 transition-all flex items-center justify-between gap-2.5"
                >
                  {/* Left: Category Icon */}
                  <div className={`w-9 h-9 rounded-xl bg-secondary/80 border border-border flex items-center justify-center shrink-0 ${Category.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Middle: Title & Meta */}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-100 text-sm truncate">
                      {expense.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5 truncate">
                      <span>{expense.date}</span>
                      <span>•</span>
                      <span className="text-gray-300 font-medium truncate">
                        {language === 'bn' ? (Category.bn || expense.category) : expense.category}
                      </span>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-bold text-pink-400 tabular-nums">
                        {formatCurrency(expense.amount)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(expense)}
                        className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center transition-colors"
                        title={language === 'bn' ? 'এডিট' : 'Edit'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRequest(expense.id)}
                        className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                        title={language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
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
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto bg-popover border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              {editingExpenseId 
                ? (language === 'bn' ? 'খরচ সম্পাদনা করুন' : 'Edit Expense') 
                : (language === 'bn' ? 'নতুন খরচ যোগ করুন' : 'Add New Expense')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</label>
              <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v || ''})}>
                <SelectTrigger className="w-full bg-secondary border-border h-10">
                  <SelectValue placeholder={language === 'bn' ? 'ক্যাটাগরি নির্বাচন করুন' : 'Select Category'} />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.name} value={cat.name}>
                      <div className="flex items-center gap-2">
                        <cat.icon className={`w-4 h-4 ${cat.color}`} />
                        {language === 'bn' ? cat.bn : cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{language === 'bn' ? 'বিবরণ / শিরোনাম' : 'Title / Description'}</label>
              <Input 
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder={language === 'bn' ? 'যেমন: বিকালের চা-নাস্তা, বিদ্যুৎ বিল...' : 'e.g. Afternoon Tea, Electricity Bill...'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">{language === 'bn' ? 'পরিমাণ (৳)' : 'Amount (৳)'}</label>
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
                <label className="block text-sm font-medium text-gray-400 mb-1.5">{language === 'bn' ? 'তারিখ' : 'Date'}</label>
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
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">
                {editingExpenseId ? (language === 'bn' ? 'আপডেট করুন' : 'Update Expense') : (language === 'bn' ? 'খরচ সংরক্ষণ করুন' : 'Save Expense')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({isOpen: false, id: null})}
        onConfirm={handleConfirmDelete}
        title={language === 'bn' ? 'খরচ মুছে ফেলবেন?' : 'Delete Expense?'}
        message={language === 'bn' ? 'আপনি কি নিশ্চিত যে এই খরচের রেকর্ডটি মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।' : 'Are you sure you want to delete this expense record? This action cannot be undone.'}
        confirmText={language === 'bn' ? 'মুছে ফেলুন' : 'Delete Expense'}
      />
    </div>
  );
}







