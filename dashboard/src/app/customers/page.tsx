'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, Edit, Trash2, MessageCircle, Download, FileText, Phone, PhoneCall, MapPin, Tv, Eye, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/currency';
import { useAppStore } from '@/store/useAppStore';
import { CustomerModal } from '@/components/ui/CustomerModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { StatusDropdown } from '@/components/ui/StatusDropdown';
import { PaymentModal } from '@/components/ui/PaymentModal';
import { InvoiceModal } from '@/components/ui/InvoiceModal';
import { PartsUsedModal, PartsConfirmData } from '@/components/ui/PartsUsedModal';
import { CustomerProfileSidebar } from '@/components/ui/CustomerProfileSidebar';
import { customerService, Customer, CustomerStatus, normalizePhone, RepairRecord } from '@/lib/services/customer';
import { increment } from 'firebase/firestore';
import { transactionService } from '@/lib/services/transaction';
import { shopTransactionService } from '@/lib/services/shopTransaction';
import { inventoryService } from '@/lib/services/inventory';
import { PartUsed } from '@/lib/services/customer';
import { sendSMS } from '@/lib/sms';
import { smsConfigService } from '@/lib/services/smsConfig';

export default function CustomersPage() {
  const { user, highlightCustomerId, highlightCustomerSearch, setHighlightCustomerId, setHighlightCustomerSearch } = useAppStore();
  const hasFullAccess = user?.role === 'Owner' || user?.role === 'Manager';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'All'>('All');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; actionType: 'delete' | 'return' | null; id: string | null;}>({isOpen: false, actionType: null, id: null});
  const [profileSidebarCustomer, setProfileSidebarCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      if (profileSidebarCustomer) {
        setProfileSidebarCustomer(null);
        setSearch('');
      } else if (confirmModal.isOpen) {
        setConfirmModal({ isOpen: false, actionType: null, id: null });
      } else if (isModalOpen) {
        setIsModalOpen(false);
      }
    };
    if (profileSidebarCustomer) {
      window.history.pushState({ modal: 'profile-sidebar' }, '');
      window.addEventListener('popstate', handlePopState);
    } else if (confirmModal.isOpen) {
      window.history.pushState({ modal: 'confirm-modal' }, '');
      window.addEventListener('popstate', handlePopState);
    } else if (isModalOpen) {
      window.history.pushState({ modal: 'customer-modal' }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, [profileSidebarCustomer, confirmModal.isOpen, isModalOpen]);

  const closeProfileSidebar = () => {
    setProfileSidebarCustomer(null);
    setSearch('');
    if (window.history.state?.modal === 'profile-sidebar') {
      window.history.back();
    }
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, actionType: null, id: null });
    if (window.history.state?.modal === 'confirm-modal') {
      window.history.back();
    }
  };

  const closeCustomerModal = () => {
    setIsModalOpen(false);
    if (window.history.state?.modal === 'customer-modal') {
      window.history.back();
    }
  };
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null);
  const [invoiceModalCustomer, setInvoiceModalCustomer] = useState<Customer | null>(null);
  const [partsModalCustomer, setPartsModalCustomer] = useState<{ id: string; name: string; pendingStatus: CustomerStatus } | null>(null);


  const [smsSettings, setSmsSettings] = useState<any>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const [data, settings] = await Promise.all([
        customerService.getAll(),
        smsConfigService.getSettings()
      ]);
      setCustomers(data || []);
      setSmsSettings(settings);
    } catch (error) { console.error("Failed to fetch customers", error); } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const handleOpenAdd = () => {
      openAddModal();
    };
    window.addEventListener('app:add-customer', handleOpenAdd);
    return () => window.removeEventListener('app:add-customer', handleOpenAdd);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // Instant opening on notification click without requiring reload
  useEffect(() => {
    const targetSearch = highlightCustomerSearch || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('search') : null);
    const targetId = highlightCustomerId || (typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('customerId') || new URLSearchParams(window.location.search).get('id')) : null);

    if (customers.length > 0) {
      if (targetId) {
        const found = customers.find(c => c.id === targetId);
        if (found) {
          setProfileSidebarCustomer(found);
          setSearch('');
          if (highlightCustomerId) setHighlightCustomerId(null);
          if (highlightCustomerSearch) setHighlightCustomerSearch(null);
          return;
        }
      } 
      
      if (targetSearch) {
        const found = customers.find(c => 
          c.name.toLowerCase() === targetSearch.toLowerCase() ||
          c.phone.includes(targetSearch) ||
          c.name.toLowerCase().includes(targetSearch.toLowerCase())
        );
        if (found) {
          setProfileSidebarCustomer(found);
          setSearch('');
          if (highlightCustomerSearch) setHighlightCustomerSearch(null);
          return;
        } else {
          setSearch(targetSearch);
        }
      }
    }
  }, [customers, highlightCustomerId, highlightCustomerSearch]);

  const handleSaveCustomer = async (data: Omit<Customer, 'id' | 'createdAt' | 'points'>, instantDelivery?: boolean) => {
    try {
      if (editingCustomer) {
        // Update
        
        const updatedDue = Math.max(0, data.totalBill - (editingCustomer.advance || 0) - (editingCustomer.discount || 0));
        const updatedData = { ...data, due: updatedDue };
        await customerService.update(editingCustomer.id, updatedData);
        data = updatedData; // so local state gets the new due

        setCustomers(customers.map(c => c.id === editingCustomer.id ? { ...c, ...data } : c));
      } else {
        // Add Atomically
        const newId = await shopTransactionService.createCustomer(data, user?.name || user?.email || 'Unknown');
        await fetchCustomers();

        if (instantDelivery) {
          setPartsModalCustomer({ id: newId, name: data.name, pendingStatus: 'Delivered' });
        }

        // Send Welcome SMS
        const smsSettings = await smsConfigService.getSettings();
        if (smsSettings.enabled && smsSettings.apiKey && smsSettings.senderId) {
          const msg = smsSettings.welcomeTemplate
            .replace(/{name}/g, data.name || '')
            .replace(/{phone}/g, data.phone || '')
            .replace(/{brand}/g, data.deviceBrand || '')
            .replace(/{type}/g, data.deviceType || '')
            .replace(/{problem}/g, data.deviceProblem || '')
            .replace(/{total}/g, `${data.totalBill || 0}`)
            .replace(/{advance}/g, `${data.advance || 0}`)
            .replace(/{due}/g, `${data.due || 0}`);
            
          sendSMS(data.phone, msg, smsSettings.apiKey, smsSettings.senderId, smsSettings.apiUrl);
        }
      }
    } catch (error) { console.error("Firebase error", error); alert("Error: " + ((error as any).message || String(error))); }
  };

  const handleUpdateStatus = async (id: string, newStatus: CustomerStatus) => {
    const c = customers.find(x => x.id === id);
    if (!c) return;
    
    if (newStatus === 'Delivered' || newStatus === 'Ready for Delivery') {
      setPartsModalCustomer({ id, name: c.name, pendingStatus: newStatus });
      return;
    }

    if (newStatus === 'Returned (Unrepaired)') {
      setConfirmModal({ isOpen: true, actionType: 'return', id });
      return;
    }

    await performStatusUpdate(id, newStatus, c);
  };

  const performStatusUpdate = async (id: string, newStatus: CustomerStatus, c: Customer) => {
    try {
      await customerService.update(id, { status: newStatus });
      setCustomers(customers.map(c => c.id === id ? { ...c, status: newStatus } : c));
      
      // Send SMS if Ready, Delivered, or Returned
      if (newStatus === 'Ready for Delivery' || newStatus === 'Delivered' || newStatus === 'Returned (Unrepaired)') {
        const c = customers.find(x => x.id === id);
        if (c && c.phone) {
          const smsSettings = await smsConfigService.getSettings();
          if (smsSettings.enabled && smsSettings.apiKey && smsSettings.senderId) {
            const template = newStatus === 'Ready for Delivery' ? smsSettings.readyTemplate : newStatus === 'Delivered' ? smsSettings.deliveredTemplate : smsSettings.returnedTemplate;
            if (template) {
              const msg = template
                .replace(/{name}/g, c.name || '')
                .replace(/{phone}/g, c.phone || '')
                .replace(/{brand}/g, c.deviceBrand || '')
                .replace(/{type}/g, c.deviceType || '')
                .replace(/{problem}/g, c.deviceProblem || '')
                .replace(/{total}/g, `${c.totalBill || 0}`)
                .replace(/{advance}/g, `${c.advance || 0}`)
                .replace(/{due}/g, `${c.due || 0}`);
                
              sendSMS(c.phone, msg, smsSettings.apiKey, smsSettings.senderId, smsSettings.apiUrl);
            }
          }
        }
      }
    } catch (error) { console.error("Firebase error", error); alert("Error: Failed to update status. Please check your internet connection."); }
  };

  const handleConfirmParts = async (data: PartsConfirmData) => {
    if (!partsModalCustomer) return;
    
    const c = customers.find(x => x.id === partsModalCustomer.id);
    if (!c) return;

    try {
      const { parts, discount, paymentReceived, dueDate, newTotalBill, redeemPoints } = data;
      
      // Calculate Points
      let loyaltyUpdates = {};
      try {
        const { loyaltyConfigService } = await import('@/lib/services/loyaltyConfig');
        const config = await loyaltyConfigService.getSettings();
        if (config.enabled && partsModalCustomer.pendingStatus === 'Delivered') {
           let newPoints = c.points || 0;
           if (redeemPoints && newPoints >= config.spendRequiredForOnePoint) {
              const redeemable = Math.floor(newPoints / config.spendRequiredForOnePoint) * config.spendRequiredForOnePoint;
              newPoints -= redeemable;
           }
           if (paymentReceived > 0 && config.spendRequiredForOnePoint > 0) {
              newPoints += Math.floor(paymentReceived / config.spendRequiredForOnePoint);
           }
           loyaltyUpdates = { points: newPoints };
        }
      } catch (e) {
        console.error("Failed loyalty points processing", e);
      }

      await shopTransactionService.checkoutParts(
        c.id,
        parts,
        discount,
        paymentReceived,
        dueDate,
        user?.email || 'Unknown',
        newTotalBill // we need to update shopTransactionService to accept this!
      );
      
      const totalCost = parts.reduce((acc, p) => acc + (p.cost * p.quantity), 0);
      const newAdvance = (c.advance || 0) + paymentReceived;
      const finalBill = newTotalBill > -1 ? newTotalBill : c.totalBill;
      // Note: discount here includes redeemed points equivalent if handled by UI
      const newDue = Math.max(0, finalBill - newAdvance - discount);

      const updateData: Partial<Customer> = { 
        partsUsed: parts, 
        totalCost,
        totalBill: finalBill,
        advance: newAdvance,
        due: newDue,
        discount,
        ...loyaltyUpdates,
        ...(dueDate && { dueDate })
      };
      
      await performStatusUpdate(c.id, partsModalCustomer.pendingStatus, { ...c, ...updateData });
      
      setPartsModalCustomer(null);
    } catch (error: any) {
      console.error("Error confirming parts and delivery checkout", error);
      alert(error.message || "Error: Failed to process delivery checkout.");
    }
  };

  const handleReceivePayment = async (paymentAmount: number, nextDueDate?: string) => {
    if (!paymentModalCustomer) return;
    
    try {
      const { newAdvance, newDue } = await shopTransactionService.receivePayment(
        paymentModalCustomer.id,
        paymentAmount,
        user?.email || 'Unknown',
        nextDueDate
      );
      
      setCustomers(customers.map(c => 
        c.id === paymentModalCustomer.id ? { 
          ...c, 
          advance: newAdvance, 
          due: newDue, 
          ...(newDue === 0 ? { dueDate: '' } : nextDueDate ? { dueDate: nextDueDate } : {}) 
        } : c
      ));
      setPaymentModalCustomer(null);
    } catch (error: any) { 
      console.error("Firebase error", error); 
      alert(error.message || "Error: Failed to save payment."); 
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Phone', 'Address', 'Brand', 'Type', 'Problem', 'Details', 'Total Bill', 'Advance', 'Due', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredCustomers.map(c => [
        `"${c.name}"`,
        `"${c.phone}"`,
        `"${c.address}"`,
        `"${c.deviceBrand || ''}"`,
        `"${c.deviceType || ''}"`,
        `"${c.deviceProblem || ''}"`,
        `"${c.deviceDetails || ''}"`,
        c.totalBill,
        c.advance || 0,
        c.due,
        `"${c.status || 'Received'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteRequest = (id: string) => {
    setConfirmModal({ isOpen: true, actionType: 'delete', id });
  };

  const executeDelete = async (id: string) => {
    try {
      await customerService.delete(id);
      setCustomers(customers.filter(c => c.id !== id));
    } catch (error) { 
      console.error("Firebase error", error); 
      alert("Error: Failed to delete customer. Please check your internet connection."); 
    }
  };

  const handleConfirmAction = async () => {
    const id = confirmModal.id;
    if (!id || !confirmModal.actionType) return;
    try {
      if (confirmModal.actionType === 'delete') {
        await executeDelete(id);
      } else if (confirmModal.actionType === 'return') {
        await executeMarkAsReturned(id);
      }
    } finally {
      setConfirmModal({ isOpen: false, actionType: null, id: null });
    }
  };

    const executeMarkAsReturned = async (id: string) => {
    try {
      await shopTransactionService.markAsReturned(id, user?.email || 'Unknown');
      setCustomers(customers.map(cust => cust.id === id ? { 
        ...cust, 
        status: 'Returned (Unrepaired)', 
        partsUsed: [], 
        totalCost: 0, 
        advance: 0, 
        due: 0, 
        totalBill: 0, 
        discount: 0, 
        dueDate: '' 
      } : cust));
      
      const c = customers.find(x => x.id === id);
      const smsSettings = await smsConfigService.getSettings();
      if (smsSettings.enabled && smsSettings.apiKey && smsSettings.senderId && c?.phone) {
        const template = smsSettings.returnedTemplate;
        if (template) {
          const msg = template
            .replace(/{name}/g, c.name || '')
            .replace(/{phone}/g, c.phone || '')
            .replace(/{brand}/g, c.deviceBrand || '')
            .replace(/{type}/g, c.deviceType || '')
            .replace(/{problem}/g, c.deviceProblem || '')
            .replace(/{total}/g, `${c.totalBill || 0}`)
            .replace(/{advance}/g, `${c.advance || 0}`)
            .replace(/{due}/g, `${c.due || 0}`);
          await sendSMS(c.phone, msg, smsSettings.apiKey, smsSettings.senderId, smsSettings.apiUrl);
        } else {
          await sendSMS(c.phone, `Your device has been returned unrepaired. Please collect it from shop.`, smsSettings.apiKey, smsSettings.senderId, smsSettings.apiUrl);
        }
      }
    } catch (err: any) {
      console.error('Error marking as returned', err);
      alert(err.message || 'Failed to mark as returned');
    }
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const getCustomerTime = (item: Customer) => {
    if (!item.createdAt) return 0;
    if (typeof item.createdAt.toMillis === 'function') return item.createdAt.toMillis();
    if (item.createdAt.seconds) return item.createdAt.seconds * 1000;
    if (item.createdAt instanceof Date) return item.createdAt.getTime();
    const parsed = new Date(item.createdAt).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  // Group and deduplicate customer documents sharing the same phone number so each customer appears once
  const uniqueCustomersMap = new Map<string, Customer>();
  customers.forEach(c => {
    const key = normalizePhone(c.phone) || c.id;
    if (!uniqueCustomersMap.has(key)) {
      uniqueCustomersMap.set(key, { ...c, repairHistory: [...(c.repairHistory || [])] });
    } else {
      const existing = uniqueCustomersMap.get(key)!;
      const historyRecord: RepairRecord = {
        id: c.id,
        deviceBrand: c.deviceBrand,
        deviceType: c.deviceType,
        deviceProblem: c.deviceProblem,
        deviceDetails: c.deviceDetails,
        serialNumber: c.serialNumber,
        totalBill: c.totalBill || 0,
        advance: c.advance || 0,
        due: c.due || 0,
        discount: c.discount || 0,
        dueDate: c.dueDate,
        expectedDeliveryDate: c.expectedDeliveryDate,
        status: c.status || 'Received',
        warrantyMonths: c.warrantyMonths,
        partsUsed: c.partsUsed || [],
        totalCost: c.totalCost || 0,
        createdAt: c.createdAt
      };
      const mergedHistory = [...(existing.repairHistory || []), historyRecord, ...(c.repairHistory || [])];
      if (getCustomerTime(c) > getCustomerTime(existing)) {
        uniqueCustomersMap.set(key, {
          ...c,
          repairHistory: mergedHistory
        });
      } else {
        existing.repairHistory = mergedHistory;
      }
    }
  });

  const displayCustomers = Array.from(uniqueCustomersMap.values());

  const filteredCustomers = displayCustomers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          c.phone.includes(search) ||
                          c.deviceBrand?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || (c.status || 'Received') === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // 0 = Active / Newly Listed, 1 = Delivered, 2 = Returned / Cancelled
    const tierA = a.status === 'Returned (Unrepaired)' ? 2 : a.status === 'Delivered' ? 1 : 0;
    const tierB = b.status === 'Returned (Unrepaired)' ? 2 : b.status === 'Delivered' ? 1 : 0;
    
    if (tierA !== tierB) {
      return tierA - tierB;
    }

    // Within the same tier, sort newest first
    const timeA = getCustomerTime(a);
    const timeB = getCustomerTime(b);
    if (timeA && timeB) {
      return timeB - timeA;
    }
    return 0;
  });

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (typeof window !== 'undefined') {
      const el = document.getElementById('customer-list-container');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const getPageNumbers = (isMobile: boolean = false) => {
    if (isMobile) {
      if (totalPages <= 4) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }
      if (currentPage <= 2) {
        return [1, 2, 3, '...', totalPages];
      }
      if (currentPage >= totalPages - 1) {
        return [1, '...', totalPages - 2, totalPages - 1, totalPages];
      }
      return [1, '...', currentPage, '...', totalPages];
    }

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className="max-w-[1600px] mx-auto w-full">
      {/* Page Controls */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {/* Results Counter & Active Filter Badge */}
        <div className="text-xs sm:text-sm text-gray-400 flex items-center justify-between sm:justify-start gap-2 flex-wrap">
          <span>
            {filteredCustomers.length > 0 ? (
              <>
                Showing <strong className="font-semibold text-white">{startIndex + 1}-{Math.min(endIndex, filteredCustomers.length)}</strong> of <strong className="font-semibold text-white">{filteredCustomers.length}</strong> {filteredCustomers.length === 1 ? 'customer' : 'customers'}
              </>
            ) : (
              <>Showing <strong className="font-semibold text-white">0</strong> customers</>
            )}
          </span>
          {statusFilter !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {statusFilter}
              <button onClick={() => setStatusFilter('All')} className="hover:text-white" title="Clear filter">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
        
        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64 md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input 
              type="text" 
              placeholder="Search customers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="!h-10 sm:!h-11 !bg-card dark:!bg-card border border-gray-800 hover:border-gray-700 text-gray-200 text-xs sm:text-sm !rounded-xl pl-9 pr-8 focus:outline-none focus:!border-blue-500 focus:!ring-1 focus:!ring-blue-500/50 transition-all w-full placeholder:text-gray-500 shadow-sm"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-0.5 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as CustomerStatus | 'All')}>
            <SelectTrigger className="!h-10 sm:!h-11 w-32 sm:w-44 !bg-card dark:!bg-card border border-gray-800 hover:border-gray-700 text-gray-200 text-xs sm:text-sm !rounded-xl px-2.5 sm:px-3.5 focus:outline-none focus:!border-blue-500 focus:!ring-1 focus:!ring-blue-500/50 transition-all shadow-sm shrink-0 flex items-center justify-between">
              <span className="flex items-center gap-1.5 sm:gap-2 truncate">
                <Filter className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors ${statusFilter !== 'All' ? 'text-blue-400' : 'text-gray-400'}`} />
                <SelectValue placeholder="All Statuses" />
              </span>
            </SelectTrigger>
            <SelectContent className="bg-popover border-gray-800 text-gray-200 rounded-xl shadow-xl">
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Received">Received</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Waiting for Parts">Waiting for Parts</SelectItem>
              <SelectItem value="Ready for Delivery">Ready for Delivery</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
              <SelectItem value="Returned (Unrepaired)">Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>
          <div className="hidden sm:flex flex-row items-center gap-2 w-full sm:w-auto">
            <Button 
              onClick={handleExportCSV}
              className="items-center gap-2 bg-secondary hover:bg-gray-800 text-gray-300 border border-gray-800 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button 
              onClick={openAddModal}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 flex-1 sm:flex-none"
            >
              <Plus className="w-5 h-5" />
              <span className="whitespace-nowrap">Add Customer</span>
            </Button>
          </div>
        </div>

      <div id="customer-list-container" className="scroll-mt-20">
        {/* Customer Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="hidden md:block bg-card rounded-2xl border border-gray-800/80 shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto relative">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-secondary/80 sticky top-0 z-10 shadow-sm">
                <tr className="text-gray-400 uppercase tracking-wider text-xs border-b border-gray-800">
                  <th className="px-4 py-3.5 font-medium text-left min-w-[170px]">Customer Info</th>
                  <th className="px-4 py-3.5 font-medium text-left min-w-[130px]">Contact</th>
                  <th className="px-4 py-3.5 font-medium text-left min-w-[180px]">Appliance Info</th>
                  <th className="px-4 py-3.5 font-medium text-left min-w-[130px]">Delivery</th>
                  <th className="px-4 py-3.5 font-medium text-left min-w-[160px]">Status</th>
                  <th className="px-4 py-3.5 font-medium text-right min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">Loading customers...</td>
                  </tr>
                ) : paginatedCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-800/20 transition-colors group">
                  <td className="px-4 py-3.5">
                    <Button variant="link" onClick={() => setProfileSidebarCustomer(customer)} className="p-0 h-auto font-semibold text-gray-200 hover:text-blue-400 transition-colors text-left block hover:no-underline"
                      title="View Customer Profile & History"
                    >
                      {customer.name}
                    </Button>
                    <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{customer.address || 'No Address'}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <a 
                        href={`tel:${customer.phone}`} 
                        className="text-sm text-gray-300 hover:text-blue-400 font-medium transition-colors"
                        title="Click to Call"
                      >
                        {customer.phone}
                      </a>
                      <a 
                        href={`tel:${customer.phone}`}
                        className="text-blue-400 hover:text-blue-300 p-1 bg-blue-500/10 hover:bg-blue-500/20 rounded-md transition-colors"
                        title="Direct Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <a 
                        href={`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          (smsSettings?.whatsappTemplate || '')
                            .replace(/{name}/g, customer.name || '')
                            .replace(/{brand}/g, customer.deviceBrand || '')
                            .replace(/{type}/g, customer.deviceType || '')
                            .replace(/{total}/g, `${customer.totalBill || 0}`)
                            .replace(/{advance}/g, `${customer.advance || 0}`)
                            .replace(/{due}/g, `${customer.due || 0}`)
                        )}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-green-500 hover:text-green-400 p-1 bg-green-500/10 hover:bg-green-500/20 rounded-md transition-colors"
                        title="Send Invoice on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-gray-300 text-sm font-medium">
                      {customer.deviceBrand || 'N/A'} {customer.deviceType ? `(${customer.deviceType})` : ''}
                      {customer.serialNumber && (
                        <span className="ml-2 text-[10px] text-gray-500 font-mono bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700/50">
                          SN: {customer.serialNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-orange-400/80 mt-0.5">{customer.deviceProblem || 'N/A'}</div>
                    {customer.deviceDetails && <div className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[150px]">{customer.deviceDetails}</div>}
                    {customer.warrantyMonths ? (
                      <div className="text-[10px] font-medium text-purple-400 mt-1 bg-purple-500/10 px-2 py-0.5 rounded w-fit">
                        {customer.warrantyMonths} Warranty
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-gray-300 font-medium">Tot: {formatCurrency(customer.totalBill)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Adv: {formatCurrency(customer.advance || 0)}</div>
                    {customer.due > 0 ? (
                      <div className="text-xs font-medium text-red-400 mt-1 flex items-center gap-1">
                        Due: {formatCurrency(customer.due)}
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
                        Paid ✓
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusDropdown 
                      status={customer.status} 
                      onChange={(newStatus) => handleUpdateStatus(customer.id, newStatus)} 
                    />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5 transition-opacity">
                      {customer.due > 0 && (
                        <Button variant="ghost" onClick={() => setPaymentModalCustomer(customer)} className="text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 h-auto rounded text-xs font-medium mr-1"
                          title="Receive Payment"
                        >
                          Pay
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setInvoiceModalCustomer(customer)} className="text-gray-400 hover:text-white hover:bg-gray-800 transition-colors h-8 w-8" 
                        title="Print Invoice"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setProfileSidebarCustomer(customer)} className="text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors h-8 w-8" 
                        title="View History & Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {hasFullAccess && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openEditModal(customer)} className="text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors h-8 w-8" 
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(customer.id)} className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors h-8 w-8" 
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No customers found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Integrated Desktop Table Footer Pagination */}
        {filteredCustomers.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-800/80 bg-secondary/20">
            <div className="text-xs text-gray-400">
              Showing <span className="font-semibold text-white">{startIndex + 1}</span> to <span className="font-semibold text-white">{Math.min(endIndex, filteredCustomers.length)}</span> of <span className="font-semibold text-white">{filteredCustomers.length}</span> customers
              <span className="text-gray-500 ml-1.5">(Page {currentPage} of {totalPages})</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 bg-card border-gray-800 text-gray-300 hover:text-white hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {getPageNumbers(false).map((pageNum, idx) => {
                if (pageNum === '...') {
                  return (
                    <span key={`desktop-ellipsis-${idx}`} className="px-1 text-gray-500 text-xs select-none">
                      ...
                    </span>
                  );
                }
                const page = Number(pageNum);
                const isActive = currentPage === page;
                return (
                  <button
                    key={`desktop-page-${page}`}
                    onClick={() => handlePageChange(page)}
                    className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                        : 'bg-card border border-gray-800 text-gray-300 hover:text-white hover:bg-secondary hover:border-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 bg-card border-gray-800 text-gray-300 hover:text-white hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Mobile Customer Cards (visible on mobile only) */}
      <div className="block md:hidden space-y-3 pb-8">
        {loading ? (
          <div className="bg-card rounded-xl border border-gray-800 p-8 text-center text-gray-500 text-sm">
            Loading customers...
          </div>
        ) : paginatedCustomers.map((customer) => (
          <div 
            key={customer.id}
            className="bg-card border border-gray-800/80 rounded-xl p-3.5 shadow-sm space-y-2.5"
          >
            {/* Header: Customer Name + Status Dropdown */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-800/50">
              <button 
                onClick={() => setProfileSidebarCustomer(customer)}
                className="font-bold text-base text-gray-100 hover:text-blue-400 transition-colors text-left truncate flex-1 min-w-0"
              >
                {customer.name}
              </button>
              <div className="shrink-0">
                <StatusDropdown 
                  status={customer.status} 
                  onChange={(newStatus) => handleUpdateStatus(customer.id, newStatus)} 
                />
              </div>
            </div>

            {/* Contact & Address Sub-header */}
            <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
              <a 
                href={`tel:${customer.phone}`} 
                className="flex items-center gap-1.5 text-blue-400 hover:underline font-medium shrink-0"
              >
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                <span>{customer.phone}</span>
              </a>
              {customer.address ? (
                <span className="flex items-center gap-1 text-gray-400 truncate max-w-[170px] text-right">
                  <MapPin className="w-3 h-3 shrink-0 text-gray-500" />
                  <span className="truncate">{customer.address}</span>
                </span>
              ) : (
                <span className="text-[11px] text-gray-600">No Address</span>
              )}
            </div>

            {/* Device / Appliance Details */}
            <div className="bg-[#121526]/70 rounded-lg p-2.5 border border-gray-800/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-gray-200 font-medium gap-2">
                <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                  <Tv className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{customer.deviceBrand || 'Appliance'} {customer.deviceType ? `(${customer.deviceType})` : ''}</span>
                </div>
                {customer.serialNumber && (
                  <span className="font-mono text-[10px] text-gray-400 bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700/50 shrink-0">
                    SN: {customer.serialNumber}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded font-medium truncate flex-1 min-w-0">
                  {customer.deviceProblem || 'Problem not specified'}
                </span>
                {customer.warrantyMonths ? (
                  <span className="text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded font-medium shrink-0">
                    {customer.warrantyMonths} Warranty
                  </span>
                ) : null}
              </div>
              {customer.deviceDetails && (
                <p className="text-[11px] text-gray-400 italic line-clamp-1">
                  {customer.deviceDetails}
                </p>
              )}
            </div>

            {/* Bill & Financials Strip */}
            <div className="grid grid-cols-3 gap-1 bg-secondary/60 rounded-lg p-2 text-xs border border-gray-800/50 text-center">
              <div>
                <span className="text-gray-500 text-[10px] uppercase block">Total</span>
                <span className="font-semibold text-gray-200 truncate block">{formatCurrency(customer.totalBill)}</span>
              </div>
              <div className="border-x border-gray-800/60 px-1">
                <span className="text-gray-500 text-[10px] uppercase block">Advance</span>
                <span className="font-medium text-gray-300 truncate block">{formatCurrency(customer.advance || 0)}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase block">Due Status</span>
                {customer.due > 0 ? (
                  <span className="font-bold text-red-400 truncate block">{formatCurrency(customer.due)} Due</span>
                ) : (
                  <span className="font-bold text-emerald-400 truncate block">Paid ✓</span>
                )}
              </div>
            </div>

            {/* Actions Bottom Bar */}
            <div className="pt-2 border-t border-gray-800/50 space-y-2">
              {/* Primary Call & WhatsApp Row */}
              <div className="grid grid-cols-2 gap-2">
                <a 
                  href={`tel:${customer.phone}`}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-sm shadow-blue-600/20"
                  title="Direct Call"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call</span>
                </a>

                <a 
                  href={`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    (smsSettings?.whatsappTemplate || '')
                      .replace(/{name}/g, customer.name || '')
                      .replace(/{brand}/g, customer.deviceBrand || '')
                      .replace(/{type}/g, customer.deviceType || '')
                      .replace(/{total}/g, `${customer.totalBill || 0}`)
                      .replace(/{advance}/g, `${customer.advance || 0}`)
                      .replace(/{due}/g, `${customer.due || 0}`)
                  )}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600/15 hover:bg-emerald-600/25 active:scale-95 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all"
                  title="Send on WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>

              {/* Utility Toolbar Row: Pay (if due) + Invoice + History/Profile + Edit + Delete */}
              <div className="flex items-center justify-between bg-secondary/40 rounded-lg px-2.5 py-1.5 border border-gray-800/40">
                {customer.due > 0 ? (
                  <Button 
                    variant="ghost" 
                    onClick={() => setPaymentModalCustomer(customer)} 
                    className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-300 px-2.5 py-1 h-7 text-xs font-semibold rounded-md border border-emerald-500/25"
                  >
                    Receive Due
                  </Button>
                ) : (
                  <span className="text-[11px] text-gray-500 font-medium">Quick Actions</span>
                )}

                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setInvoiceModalCustomer(customer)} 
                    className="text-gray-400 hover:text-white hover:bg-gray-800 h-7 w-7 rounded-md"
                    title="Print Invoice"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setProfileSidebarCustomer(customer)} 
                    className="text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 h-7 w-7 rounded-md"
                    title="View History & Profile"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>

                  {hasFullAccess && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEditModal(customer)} 
                        className="text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 h-7 w-7 rounded-md"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteRequest(customer.id)} 
                        className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-7 w-7 rounded-md"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {!loading && filteredCustomers.length === 0 && (
          <div className="bg-card rounded-xl border border-gray-800 p-8 text-center text-gray-500 text-sm">
            No customers found matching your search.
          </div>
        )}

        {/* Mobile Pagination */}
        {filteredCustomers.length > 0 && (
          <div className="flex flex-col items-center gap-3 pt-3 pb-2 bg-card border border-gray-800/80 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 bg-card border-gray-800 text-gray-300 hover:text-white hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {getPageNumbers(true).map((pageNum, idx) => {
                if (pageNum === '...') {
                  return (
                    <span key={`mobile-ellipsis-${idx}`} className="px-1 text-gray-500 text-xs select-none">
                      ...
                    </span>
                  );
                }
                const page = Number(pageNum);
                const isActive = currentPage === page;
                return (
                  <button
                    key={`mobile-page-${page}`}
                    onClick={() => handlePageChange(page)}
                    className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                        : 'bg-card border border-gray-800 text-gray-300 hover:text-white hover:bg-secondary hover:border-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 bg-card border-gray-800 text-gray-300 hover:text-white hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-xs text-gray-400 text-center">
              Showing <span className="font-semibold text-white">{startIndex + 1}</span> to <span className="font-semibold text-white">{Math.min(endIndex, filteredCustomers.length)}</span> of <span className="font-semibold text-white">{filteredCustomers.length}</span>
              <span className="text-gray-500 ml-1">(Page {currentPage} of {totalPages})</span>
            </div>
          </div>
        )}
      </div>
      </div>

      <CustomerProfileSidebar
        isOpen={!!profileSidebarCustomer}
        onClose={closeProfileSidebar}
        customer={profileSidebarCustomer}
        allCustomers={customers}
      />

      <CustomerModal 
        isOpen={isModalOpen}
        onClose={() => closeCustomerModal()}
        onSave={handleSaveCustomer}
        initialData={editingCustomer}
        existingAddresses={Array.from(new Set(customers.map(c => c.address).filter(Boolean)))}
        existingCustomers={customers}
      />

      <PaymentModal
        isOpen={!!paymentModalCustomer}
        onClose={() => setPaymentModalCustomer(null)}
        customer={paymentModalCustomer}
        onSave={handleReceivePayment}
      />

      <InvoiceModal
        isOpen={!!invoiceModalCustomer}
        onClose={() => setInvoiceModalCustomer(null)}
        customer={invoiceModalCustomer}
      />

      <PartsUsedModal
        isOpen={!!partsModalCustomer}
        onClose={() => setPartsModalCustomer(null)}
        customer={customers.find(c => c.id === partsModalCustomer?.id) || null}
        pendingStatus={partsModalCustomer?.pendingStatus}
        onConfirm={handleConfirmParts}
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={handleConfirmAction}
        title={confirmModal.actionType === 'return' ? "কাজ বাতিল বা ফেরত নিশ্চিতকরণ" : "Delete Customer?"}
        message={confirmModal.actionType === 'return' 
          ? "আপনি কি নিশ্চিতভাবে এই কাস্টমারের কাজ বাতিল/ফেরত (Returned) করতে চান? কোনো অগ্রিম টাকা জমা থাকলে তা রিফান্ড হিসেবে রেকর্ড হবে এবং ব্যবহৃত পার্টস পুনরায় স্টকে যুক্ত হবে।" 
          : "Are you sure you want to delete this customer? This action cannot be undone and all data will be permanently lost."}
        confirmText={confirmModal.actionType === 'return' ? "হ্যাঁ, ফেরত দিন" : "Delete Customer"}
        cancelText="বাতিল"
      />
    </div>
  );
}














