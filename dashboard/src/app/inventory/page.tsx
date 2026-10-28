'use client';
import { shopTransactionService } from '@/lib/services/shopTransaction';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import { Box, Plus, Search, Edit2, Trash2, Loader2, AlertCircle, Settings, Settings2, X, Package, Tag, Layers, PlusCircle, ShoppingCart, Coins } from 'lucide-react';
import { supplierService, Supplier } from '@/lib/services/supplier';
import { inventoryService, inventorySettingsService, InventoryItem, InventorySettings } from '@/lib/services/inventory';
import { transactionService } from '@/lib/services/transaction';
import { useAppStore } from '@/store/useAppStore';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { InventoryManageModal } from "@/components/ui/InventoryManageModal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { PaginationControl } from '@/components/ui/PaginationControl';
import { MobileDataCard } from '@/components/ui/MobileDataCard';
import { DirectSaleReceiptModal, DirectSaleReceiptData } from "@/components/ui/DirectSaleReceiptModal";
import toast from "react-hot-toast";

const formatNumber = (num: number) => num.toLocaleString('en-IN');

export default function InventoryPage() {
  const { user, highlightInventorySearch, setHighlightInventorySearch } = useAppStore();
  const hasFullAccess = user?.role === 'Owner' || user?.role === 'Manager';
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [invSettings, setInvSettings] = useState<InventorySettings>({ categories: [], productNames: {} });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<DirectSaleReceiptData | null>(null);

  // Handle URL search parameter or notification click immediately without reload
  useEffect(() => {
    const q = highlightInventorySearch || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('search') : null);
    if (q) {
      setSearchTerm(q);
      if (highlightInventorySearch) setHighlightInventorySearch(null);
    }
  }, [highlightInventorySearch]);

  useEffect(() => {
    const handlePopState = () => {
      if (isModalOpen) setIsModalOpen(false);
      if (isRestockModalOpen) setIsRestockModalOpen(false);
      if (isSellModalOpen) setIsSellModalOpen(false);
    };
    
    if (isModalOpen || isRestockModalOpen || isSellModalOpen) {
      window.history.pushState({ modal: 'inventory-modal' }, '');
      window.addEventListener('popstate', handlePopState);
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isModalOpen, isRestockModalOpen, isSellModalOpen]);

  const closeInvModal = () => {
    setIsModalOpen(false);
    if (window.history.state?.modal === 'inventory-modal') window.history.back();
  };
  const closeRestockModal = () => {
    setIsRestockModalOpen(false);
    if (window.history.state?.modal === 'inventory-modal') window.history.back();
  };
  const closeSellModal = () => {
    setIsSellModalOpen(false);
    if (window.history.state?.modal === 'inventory-modal') window.history.back();
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});
  const [sellItem, setSellItem] = useState<InventoryItem | null>(null);
  const [sellData, setSellData] = useState({ quantity: 1, price: 0, customerName: 'Walk-in Customer' });
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [restockData, setRestockData] = useState({ addQuantity: 1, newPurchasePrice: 0, newSellingPrice: 0, supplierId: '' });
  const [manageCategoryModal, setManageCategoryModal] = useState(false);
  const [manageProductModal, setManageProductModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    stock: 0,
    unit: 'Pcs',
    purchasePrice: 0,
    sellingPrice: 0,
    supplierId: '', minStockLevel: 5
        });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [data, settings, sups] = await Promise.all([
          inventoryService.getAll(),
          inventorySettingsService.getSettings(),
          supplierService.getAll()
        ]);
        setItems(data);
        setInvSettings(settings);
        setSuppliers(sups);
      if (settings.categories.length > 0) {
        setFormData(prev => ({ ...prev, category: settings.categories[0] }));
      }
    } catch (error) {
      console.error("Failed to fetch inventory data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        stock: item.stock,
        unit: item.unit || 'Pcs',
        purchasePrice: item.purchasePrice,
      sellingPrice: item.sellingPrice,
        supplierId: item.supplierId || '', minStockLevel: item.minStockLevel || 5
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        category: invSettings.categories.length > 0 ? invSettings.categories[0] : '',
        stock: 0,
        unit: 'Pcs',
        purchasePrice: 0,
        sellingPrice: 0,
        supplierId: '', minStockLevel: 5
        });
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    const handleOpenAdd = () => {
      handleOpenModal();
    };
    window.addEventListener('app:add-inventory', handleOpenAdd);
    return () => window.removeEventListener('app:add-inventory', handleOpenAdd);
  }, []);

    const handleManageCategories = () => {
    setManageCategoryModal(true);
  };

  const handleManageProducts = () => {
    if (!formData.category) return toast.error('Select a category first!');
    setManageProductModal(true);
  };
  
  const handleAddCategory = async (newCat: string) => {
    if (!invSettings.categories.includes(newCat)) {
      const updatedSettings = {
        ...invSettings,
        categories: [...invSettings.categories, newCat]
      };
      await inventorySettingsService.saveSettings(updatedSettings);
      setInvSettings(updatedSettings);
      if (!formData.category) setFormData(prev => ({ ...prev, category: newCat }));
    }
  };

  const handleRemoveCategory = async (cat: string) => {
    const updatedSettings = {
      ...invSettings,
      categories: invSettings.categories.filter(c => c !== cat)
    };
    await inventorySettingsService.saveSettings(updatedSettings);
    setInvSettings(updatedSettings);
    if (formData.category === cat) setFormData(prev => ({ ...prev, category: '', name: '' }));
  };

  const handleAddProduct = async (newProd: string) => {
    const existing = invSettings.productNames[formData.category] || [];
    if (!existing.includes(newProd)) {
      const updatedSettings = {
        ...invSettings,
        productNames: {
          ...invSettings.productNames,
          [formData.category]: [...existing, newProd]
        }
      };
      await inventorySettingsService.saveSettings(updatedSettings);
      setInvSettings(updatedSettings);
      setFormData(prev => ({ ...prev, name: newProd }));
    }
  };

  const handleRemoveProduct = async (prod: string) => {
    const existing = invSettings.productNames[formData.category] || [];
    const updatedSettings = {
      ...invSettings,
      productNames: {
        ...invSettings.productNames,
        [formData.category]: existing.filter(p => p !== prod)
      }
    };
    await inventorySettingsService.saveSettings(updatedSettings);
    setInvSettings(updatedSettings);
    if (formData.name === prod) setFormData(prev => ({ ...prev, name: '' }));
  };


  
  const handleOpenRestock = (item: InventoryItem) => {
    setRestockItem(item);
    setRestockData({
      addQuantity: 0,
      newPurchasePrice: item.purchasePrice,
      newSellingPrice: item.sellingPrice,
        supplierId: item.supplierId || ''
      });
    setIsRestockModalOpen(true);
  };

  const handleSaveRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem || restockData.addQuantity <= 0) return;
    if (restockData.newPurchasePrice > 0 && restockData.newSellingPrice < restockData.newPurchasePrice) {
      toast.error("নতুন বিক্রয়মূল্য কেনা দামের চেয়ে কম হতে পারে না!");
      return;
    }

    try {
      const { newStock, avgPurchasePrice } = await shopTransactionService.restockItem({
        inventoryId: restockItem.id,
        addQuantity: restockData.addQuantity,
        newPurchasePrice: restockData.newPurchasePrice,
        newSellingPrice: restockData.newSellingPrice,
        supplierId: restockData.supplierId || undefined,
        userEmail: user?.email || 'Unknown'
      });

      const updates = {
        stock: newStock,
        purchasePrice: avgPurchasePrice,
        sellingPrice: restockData.newSellingPrice,
        ...(restockData.supplierId ? { supplierId: restockData.supplierId } : {})
      };

      setItems(items.map(item => item.id === restockItem.id ? { ...item, ...updates } : item));
      toast.success(restockData.supplierId ? "Item restocked & Supplier due updated" : "Item restocked & Cash purchase recorded");
      closeRestockModal();
    } catch (error: any) {
      console.error("Error restocking item", error);
      toast.error(error?.message || "Failed to restock item.");
    }
  };

  
  const handleOpenSell = (item: InventoryItem) => {
    setSellItem(item);
    setSellData({
      quantity: 1,
      price: item.sellingPrice,
      customerName: 'Walk-in Customer'
    });
    setIsSellModalOpen(true);
  };

  const handleSaveSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellItem || sellData.quantity <= 0 || sellData.quantity > sellItem.stock) {
      return toast.error('Invalid quantity! Must be between 1 and current stock.');
    }
    if (sellData.price < 0) {
      return toast.error('Price cannot be negative!');
    }

    try {
      const { newStock } = await shopTransactionService.directSell(
        sellItem.id,
        sellData.quantity,
        sellData.price,
        sellData.customerName,
        user?.email || 'Unknown'
      );

      // 3. Update UI
      setItems(items.map(item => item.id === sellItem.id ? { ...item, stock: newStock } : item));
      const completedReceipt: DirectSaleReceiptData = {
        itemName: sellItem.name,
        quantity: sellData.quantity,
        price: sellData.price,
        total: sellData.quantity * sellData.price,
        customerName: sellData.customerName || 'Walk-in Customer',
      };
      closeSellModal();
      setReceiptData(completedReceipt);
      toast.success('Direct sell successful!');
    } catch (error: any) {
      console.error("Error direct selling", error);
      toast.error(error.message || "Failed to process direct sell.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.purchasePrice > 0 && formData.sellingPrice < formData.purchasePrice) {
      toast.error("বিক্রয়মূল্য অবশ্যই ক্রয়মূল্যের (কেনা দাম) চেয়ে বেশি বা সমান হতে হবে!");
      return;
    }
    try {
      if (editingItem) {
        await inventoryService.update(editingItem.id, formData);
        setItems(items.map(i => i.id === editingItem.id ? { ...i, ...formData } as InventoryItem : i));
        toast.success("Item updated successfully");
      } else {
        const id = await inventoryService.add(formData);
        const newItem = { id, ...formData, createdAt: new Date() } as InventoryItem;
        setItems([newItem, ...items]);
        
        const totalCost = formData.stock * formData.purchasePrice;
        if (totalCost > 0) {
          if (formData.supplierId) {
            await supplierService.addBill(formData.supplierId, totalCost);
            toast.success("Item added & Supplier due updated");
          } else {
            await transactionService.add({
              customerId: 'cash-purchase',
              customerName: formData.name,
              amount: totalCost,
              type: 'Inventory Purchase',
              receivedBy: user?.email || 'Unknown'
            });
            toast.success("Item added & Cash purchase recorded");
          }
        } else {
          toast.success("Item added successfully");
        }
      }
      closeInvModal();
    } catch (error) {
      console.error("Error saving item", error);
      toast.error("Failed to save item. Please try again.");
    }
  };

  const executeDelete = async (id: string) => {
    try {
      await inventoryService.delete(id);
      setItems(items.filter(i => i.id !== id));
      toast.success("Item deleted successfully");
      setDeleteConfirm({isOpen: false, id: null});
    } catch (error) {
      console.error("Error deleting item", error);
      toast.error("Failed to delete item.");
    }
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteConfirm({isOpen: true, id});
  };

  const categories = ['All', 'Low Stock', ...invSettings.categories];

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (categoryFilter === 'All') return true;
    if (categoryFilter === 'Low Stock') return item.stock <= (item.minStockLevel || 5);
    return item.category === categoryFilter;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    setCurrentPage(1);
  };

  const totalInventoryValue = items.reduce((sum, item) => sum + (item.stock * item.purchasePrice), 0);
  const lowStockItems = items.filter(item => item.stock <= (item.minStockLevel || 5));

  if (user?.role !== 'Owner' && user?.role !== 'Manager' && user?.role !== 'Technician') {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <Box className="w-16 h-16 text-red-500/50 mb-4" />
        <h2 className="text-2xl font-bold text-gray-200">Access Denied</h2>
        <p className="text-gray-500 mt-2">You do not have permission to view Inventory.</p>
          
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({isOpen: false, id: null})}
        onConfirm={async () => {
          if (deleteConfirm.id) await executeDelete(deleteConfirm.id);
        }}
        title="Delete Item?"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-10">
      {/* 3-Card Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">মোট আইটেম / পার্টস</p>
              <h2 className="text-2xl font-bold text-white">{items.length}</h2>
              <p className="text-[11px] text-gray-500 mt-1">দোকানের মোট নিবন্ধিত পার্টস</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
              <Box className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">মোট স্টক মূল্য (Stock Value)</p>
              <h2 className="text-2xl font-bold text-emerald-400">{formatCurrency(totalInventoryValue)}</h2>
              <p className="text-[11px] text-gray-500 mt-1">ক্রয়মূল্যের ভিত্তিতে বর্তমান ইনভেন্টরি</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <Coins className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-red-500/20 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">লো স্টক সতর্কতা (Low Stock)</p>
              <h2 className="text-2xl font-bold text-red-400">{lowStockItems.length}</h2>
              <p className="text-[11px] text-gray-500 mt-1">রি-স্টক প্রয়োজন এমন পার্টস</p>
            </div>
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-gray-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <Input 
            type="text" 
            placeholder="পার্টসের নাম দিয়ে খুঁজুন..." 
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-11 h-11 rounded-xl bg-popover"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          {categories.map(cat => (
            <Button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                categoryFilter === cat 
                  ? 'bg-blue-500/10 text-blue-400 border-indigo-500/30' 
                  : 'bg-popover text-gray-400 border-gray-800 hover:text-white'
              }`}
            >
              {cat === 'Low Stock' ? `⚠️ লো স্টক (${lowStockItems.length})` : cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="bg-card border border-gray-800 rounded-2xl flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-card border border-gray-800 rounded-2xl flex flex-col justify-center items-center h-64 text-gray-500">
          <Box className="w-12 h-12 mb-3 opacity-20" />
          <p>কোন পার্টস পাওয়া যায়নি</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-card border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto relative">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-popover sticky top-0 z-10 shadow-sm">
                  <tr className="text-gray-400 uppercase tracking-wider text-xs border-b border-gray-800">
                    <th className="px-6 py-4 font-medium min-w-[200px]">Part Name</th>
                    <th className="px-6 py-4 font-medium min-w-[120px]">Category</th>
                    <th className="px-6 py-4 font-medium min-w-[100px]">Stock</th>
                    <th className="px-6 py-4 font-medium min-w-[120px]">Cost Price</th>
                    <th className="px-6 py-4 font-medium min-w-[120px]">Selling Price</th>
                    <th className="px-6 py-4 font-medium text-right min-w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-200">{item.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-800 text-gray-300">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-bold ${item.stock <= (item.minStockLevel || 5) ? 'text-red-400' : 'text-emerald-400'}`}>
                          {item.stock} {item.unit || 'Pcs'}
                        </div>
                        {item.stock <= (item.minStockLevel || 5) && (
                          <div className="text-[10px] text-red-500/70">Low Stock</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {formatCurrency(item.purchasePrice)}
                      </td>
                      <td className="px-6 py-4 text-gray-200 font-medium">
                        {formatCurrency(item.sellingPrice)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleOpenSell(item)} 
                            className="h-8 w-8 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 hover:text-blue-400 rounded-lg transition-colors"
                            title="Direct Sell"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleOpenRestock(item)} 
                            className="h-8 w-8 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 hover:text-emerald-400 rounded-lg transition-colors"
                            title="Restock Item"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </Button>
                          {hasFullAccess && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleOpenModal(item)} 
                                className="h-8 w-8 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
                                title="Edit Part"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteRequest(item.id)} 
                                className="h-8 w-8 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 rounded-lg transition-colors"
                                title="Delete Part"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {paginatedItems.map((item) => {
              const isLow = item.stock <= (item.minStockLevel || 5);
              return (
                <MobileDataCard key={item.id}>
                  <MobileDataCard.Header
                    title={item.name}
                    subtitle={item.category}
                    badge={
                      isLow ? (
                        <span className="text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-medium">
                          লো স্টক ({item.stock} {item.unit || 'Pcs'})
                        </span>
                      ) : (
                        <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                          স্টকে আছে ({item.stock} {item.unit || 'Pcs'})
                        </span>
                      )
                    }
                  />
                  <MobileDataCard.Details>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>মিনিমাম স্টক লেভেল:</span>
                      <span className="text-gray-300 font-medium">{item.minStockLevel || 5} {item.unit || 'Pcs'}</span>
                    </div>
                  </MobileDataCard.Details>
                  <MobileDataCard.FinancialStrip
                    items={[
                      { label: 'ক্রয়মূল্য', value: formatCurrency(item.purchasePrice) },
                      { label: 'বিক্রয়মূল্য', value: formatCurrency(item.sellingPrice) },
                      { label: 'স্টক মূল্য', value: formatCurrency(item.stock * item.purchasePrice), highlight: isLow ? 'danger' : 'success' },
                    ]}
                  />
                  <MobileDataCard.Actions>
                    <Button 
                      size="sm" 
                      onClick={() => handleOpenSell(item)} 
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs h-8"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1" /> ডাইরেক্ট সেল
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleOpenRestock(item)} 
                      className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs h-8"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" /> রিস্টক
                    </Button>
                    {hasFullAccess && (
                      <>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleOpenModal(item)} 
                          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDeleteRequest(item.id)} 
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
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
            totalItems={filteredItems.length}
            itemsPerPage={itemsPerPage}
          />
        </>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(v) => !v && closeInvModal()}>
        <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[92vh] overflow-y-auto bg-popover text-gray-100 border-gray-800 p-0 shadow-2xl shadow-black rounded-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/10 p-6 border-b border-gray-800 flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <DialogTitle className="text-xl font-bold text-gray-100 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-400" />
                {editingItem ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
              <DialogDescription className="text-gray-400 mt-1">
                {editingItem ? 'Update inventory details for this product.' : 'Enter details to add a new product to inventory.'}
              </DialogDescription>
            </div>
            <Button onClick={() => closeInvModal()} className="p-2 rounded-full bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors relative z-10 focus:outline-none">
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Content */}
          <form onSubmit={handleSave} className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-6">
              
              {/* 1. Basic Info */}
              <div className="bg-[#1a1d2d]/30 p-4 sm:p-5 rounded-xl border border-gray-800/60 space-y-4">
                <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4" /> Product Information
                </h4>
                
                
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    
                    <div className="space-y-1.5 mb-4 col-span-full">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Select Supplier (Optional)</label>
                      <CustomSelect
                        value={formData.supplierId}
                        onChange={(val) => setFormData({ ...formData, supplierId: val })}
                        options={[
                          { label: 'No Supplier', value: '' },
                          ...suppliers.map(s => ({ label: s.name + (s.company ? ` (${s.company})` : ''), value: s.id }))
                        ]}
                        placeholder="Select a supplier..."
                      />
                    </div>
                    {/* Category Field */}
                  <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Category <span className="text-red-400">*</span></label>
                        <Button variant="ghost" size="icon" type="button" onClick={handleManageCategories} className="h-6 w-6 text-gray-500 hover:text-blue-400">
                          <Settings2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <CustomSelect 
                        value={formData.category}
                        onChange={(val) => setFormData({ ...formData, category: val, name: '' })}
                        options={invSettings.categories}
                        placeholder="Select Category"
                        icon={<Layers className="w-4 h-4" />}
                      />
                    </div>

                  {/* Product Name Field */}
                  <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Product Name <span className="text-red-400">*</span></label>
                        <Button variant="ghost" size="icon" type="button" onClick={handleManageProducts} className="h-6 w-6 text-gray-500 hover:text-blue-400">
                          <Settings2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <CustomSelect 
                        value={formData.name}
                        onChange={(val) => setFormData({ ...formData, name: val })}
                        options={invSettings.productNames[formData.category] || []}
                        placeholder={formData.category ? 'Select Product' : 'Select Category first'}
                        icon={<Box className="w-4 h-4" />}
                        disabled={!formData.category}
                      />
                    </div>
                </div>
              </div>

              {/* 2. Stock Info */}
              <div className="bg-[#1a1d2d]/30 p-4 sm:p-5 rounded-xl border border-gray-800/60 space-y-4">
                <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-1">
                  <Box className="w-4 h-4" /> Stock Details
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Stock Quantity */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Current Stock <span className="text-red-400">*</span></label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input 
                          type="number" 
                          required min="0"
                          value={formData.stock === 0 ? '' : formData.stock}
                          onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                          placeholder="0"
                          
                        />
                      </div>
                      <CustomSelect 
                          value={formData.unit}
                          onChange={(val) => setFormData({ ...formData, unit: val })}
                          options={['Pcs', 'Set']}
                          placeholder="Unit"
                        />
                    </div>
                  </div>

                  {/* Minimum Stock Alert */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Low Stock Alert</label>
                    <div className="relative">
                      <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input 
                        type="number" 
                        min="0"
                        value={formData.minStockLevel}
                        onChange={e => setFormData({...formData, minStockLevel: parseInt(e.target.value) || 0})}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Pricing Info */}
              <div className="bg-[#1a1d2d]/30 p-4 sm:p-5 rounded-xl border border-gray-800/60 space-y-4">
                <h4 className="text-sm font-semibold text-orange-400 flex items-center gap-2 mb-1">
                  <Coins className="w-4 h-4" /> Pricing Information
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Purchase Price */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Purchase Price <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">৳</span>
                      <Input 
                        type="number" 
                        required min="0" step="0.01"
                        placeholder="0.00"
                        value={formData.purchasePrice === 0 ? '' : formData.purchasePrice}
                        onChange={e => setFormData({...formData, purchasePrice: parseFloat(e.target.value) || 0})}
                        className="w-full bg-secondary border border-gray-800 text-gray-100 rounded-lg pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                      />
                    </div>
                  </div>
                  {/* Selling Price */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Selling Price <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">৳</span>
                      <Input 
                        type="number" 
                        required min="0" step="0.01"
                        placeholder="0.00"
                        value={formData.sellingPrice === 0 ? '' : formData.sellingPrice}
                        onChange={e => setFormData({...formData, sellingPrice: parseFloat(e.target.value) || 0})}
                        className={`w-full bg-secondary border rounded-lg pl-8 pr-4 py-2.5 text-sm focus:outline-none transition-all ${
                          formData.purchasePrice > 0 && formData.sellingPrice > 0 && formData.sellingPrice < formData.purchasePrice
                            ? 'border-red-500 text-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                            : 'border-gray-800 text-gray-100 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50'
                        }`}
                      />
                    </div>
                    {formData.purchasePrice > 0 && formData.sellingPrice > 0 && formData.sellingPrice < formData.purchasePrice && (
                      <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1 font-medium animate-in fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        বিক্রয়মূল্য অবশ্যই ক্রয়মূল্যের (কেনা দাম) চেয়ে বেশি বা সমান হতে হবে!
                      </p>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-gray-800/60">
              <Button 
                type="button"
                onClick={() => closeInvModal()}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-gray-800/50 hover:bg-gray-800 hover:text-gray-200 transition-colors"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {editingItem ? 'Save Changes' : 'Add Product'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>


      {/* Category Manage Modal */}
      <InventoryManageModal 
        isOpen={manageCategoryModal}
        onClose={() => setManageCategoryModal(false)}
        title="Categories"
        options={invSettings.categories}
        onAdd={handleAddCategory}
        onRemove={handleRemoveCategory}
      />

      {/* Product Manage Modal */}
      <InventoryManageModal 
        isOpen={manageProductModal}
        onClose={() => setManageProductModal(false)}
        title={`Products (${formData.category})`}
        options={invSettings.productNames[formData.category] || []}
        onAdd={handleAddProduct}
        onRemove={handleRemoveProduct}
      />
    
{/* Restock Modal */}
      <Dialog open={isRestockModalOpen} onOpenChange={(v) => !v && closeRestockModal()}>
        <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[92vh] overflow-y-auto bg-popover text-gray-100 border-gray-800 p-0 shadow-2xl shadow-black rounded-2xl">
          <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/10 p-6 border-b border-gray-800 flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <DialogTitle className="text-xl font-bold text-gray-100 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Restock Item
              </DialogTitle>
              <DialogDescription className="text-gray-400 mt-1">
                Add stock and recalculate average cost price.
              </DialogDescription>
            </div>
            <Button onClick={() => closeRestockModal()} className="p-2 rounded-full bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors relative z-10 focus:outline-none">
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <form onSubmit={handleSaveRestock} className="p-6 space-y-6">
            {restockItem && (
              <>
                <div className="bg-[#1a1d2d]/30 p-4 rounded-xl border border-gray-800/60 space-y-2">
                  <h4 className="text-sm font-semibold text-emerald-400">{restockItem.name}</h4>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Current Stock: <strong className="text-gray-200">{restockItem.stock} {restockItem.unit}</strong></span>
                    <span>Current Avg Cost: <strong className="text-gray-200">{formatCurrency(restockItem.purchasePrice)}</strong></span>
                  </div>
                </div>

                <div className="space-y-4">
                  
                  <div className="space-y-1.5">
                    
                  
                  <div className="space-y-1.5 mb-4">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Select Supplier (Optional)</label>
                    <CustomSelect
                      value={restockData.supplierId}
                      onChange={(val) => setRestockData({ ...restockData, supplierId: val })}
                      options={[
                        { label: 'No Supplier', value: '' },
                        ...suppliers.map(s => ({ label: s.name + (s.company ? ` (${s.company})` : ''), value: s.id }))
                      ]}
                      placeholder="Select a supplier..."
                    />
                  </div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Add Quantity <span className="text-red-400">*</span></label>
                    <Input 
                      type="number" 
                      required min="1"
                      value={restockData.addQuantity || ''}
                      onChange={e => setRestockData({...restockData, addQuantity: parseInt(e.target.value) || 0})}
                      
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">New Purchase Price <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">৳</span>
                        <Input 
                          type="number" 
                          required min="0" step="0.01"
                          value={restockData.newPurchasePrice === 0 ? '' : restockData.newPurchasePrice}
                          onChange={e => setRestockData({...restockData, newPurchasePrice: parseFloat(e.target.value) || 0})}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Selling Price <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">৳</span>
                        <Input 
                          type="number" 
                          required min="0" step="0.01"
                          value={restockData.newSellingPrice === 0 ? '' : restockData.newSellingPrice}
                          onChange={e => setRestockData({...restockData, newSellingPrice: parseFloat(e.target.value) || 0})}
                          className={`pl-8 ${
                            restockData.newPurchasePrice > 0 && restockData.newSellingPrice > 0 && restockData.newSellingPrice < restockData.newPurchasePrice
                              ? 'border-red-500 text-red-400 focus-visible:ring-red-500'
                              : ''
                          }`}
                        />
                      </div>
                      {restockData.newPurchasePrice > 0 && restockData.newSellingPrice > 0 && restockData.newSellingPrice < restockData.newPurchasePrice && (
                        <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1 font-medium animate-in fade-in">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          বিক্রয়মূল্য কেনা দামের চেয়ে কম হতে পারে না!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Calculated WAC preview */}
                  {(restockData.addQuantity > 0 && restockData.newPurchasePrice >= 0) && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-center justify-between mt-2">
                      <span className="text-xs text-emerald-400/80">Calculated Average Cost:</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {formatCurrency(((restockItem.stock * restockItem.purchasePrice) + (restockData.addQuantity * restockData.newPurchasePrice)) / (restockItem.stock + restockData.addQuantity))}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-800/60">
              <Button 
                type="button"
                onClick={() => closeRestockModal()}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-gray-800/50 hover:bg-gray-800 hover:text-gray-200 transition-colors"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Confirm Restock
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    
      {/* Direct Sell Modal */}
      <Dialog open={isSellModalOpen} onOpenChange={(v) => !v && closeSellModal()}>
        <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[92vh] overflow-y-auto bg-popover text-gray-100 border-gray-800 p-0 shadow-2xl shadow-black rounded-2xl">
          <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/10 p-6 border-b border-gray-800 flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <DialogTitle className="text-xl font-bold text-gray-100 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-400" />
                Direct Sell
              </DialogTitle>
              <DialogDescription className="text-gray-400 mt-1">
                Sell this item directly without a repair job.
              </DialogDescription>
            </div>
            <Button onClick={() => closeSellModal()} className="p-2 rounded-full bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors relative z-10 focus:outline-none">
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <form onSubmit={handleSaveSell} className="p-6 space-y-6">
            {sellItem && (
              <>
                <div className="bg-[#1a1d2d]/30 p-4 rounded-xl border border-gray-800/60 space-y-2">
                  <h4 className="text-sm font-semibold text-blue-400">{sellItem.name}</h4>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Available Stock: <strong className="text-emerald-400">{sellItem.stock} {sellItem.unit}</strong></span>
                    <span>Selling Price: <strong className="text-gray-200">{formatCurrency(sellItem.sellingPrice)}</strong></span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Customer Name</label>
                    <Input 
                      type="text" 
                      value={sellData.customerName}
                      onChange={e => setSellData({...sellData, customerName: e.target.value})}
                      placeholder="Walk-in Customer"
                      
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Quantity <span className="text-red-400">*</span></label>
                      <Input 
                        type="number" 
                        required min="1" max={sellItem.stock}
                        value={sellData.quantity || ''}
                        onChange={e => setSellData({...sellData, quantity: parseInt(e.target.value) || 0})}
                        
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Unit Price <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">৳</span>
                        <Input 
                          type="number" 
                          required min="0" step="0.01"
                          value={sellData.price === 0 ? '' : sellData.price}
                          onChange={e => setSellData({...sellData, price: parseFloat(e.target.value) || 0})}
                          className="pl-8"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Total summary preview */}
                  {(sellData.quantity > 0 && sellData.price >= 0) && (
                    <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex items-center justify-between mt-2">
                      <span className="text-xs text-blue-400/80">Total Revenue to Collect:</span>
                      <span className="text-base font-bold text-blue-400">
                        {formatCurrency(sellData.quantity * sellData.price)}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-800/60">
              <Button 
                type="button"
                onClick={() => closeSellModal()}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-gray-800/50 hover:bg-gray-800 hover:text-gray-200 transition-colors"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Confirm Sale
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DirectSaleReceiptModal
        isOpen={!!receiptData}
        onClose={() => setReceiptData(null)}
        receiptData={receiptData}
      />
    </div>
  );
}















