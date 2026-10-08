'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, Edit, Trash2, MessageCircle, Download, FileText } from 'lucide-react';
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
import { customerService, Customer, CustomerStatus } from '@/lib/services/customer';
import { increment } from 'firebase/firestore';
import { transactionService } from '@/lib/services/transaction';
import { shopTransactionService } from '@/lib/services/shopTransaction';
import { inventoryService } from '@/lib/services/inventory';
import { PartUsed } from '@/lib/services/customer';
import { sendSMS } from '@/lib/sms';
import { smsConfigService } from '@/lib/services/smsConfig';

export default function CustomersPage() {
  const { user } = useAppStore();
  const hasFullAccess = user?.role === 'Owner' || user?.role === 'Manager';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'All'>('All');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null);
  const [invoiceModalCustomer, setInvoiceModalCustomer] = useState<Customer | null>(null);
  const [partsModalCustomer, setPartsModalCustomer] = useState<{ id: string; name: string; pendingStatus: CustomerStatus } | null>(null);
  const [profileSidebarCustomer, setProfileSidebarCustomer] = useState<Customer | null>(null);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; actionType: 'delete' | 'return' | null; id: string | null;}>({isOpen: false, actionType: null, id: null});

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
        const newCustomerData = { ...data, status: 'Received' as const };

        const newCustomer: Customer = {
          id: newId,
          ...newCustomerData,
          points: 0,
        };
        setCustomers([newCustomer, ...customers]);

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
      if (!window.confirm('Are you sure you want to mark this as Returned? Any advance will be logged as Refunded and parts will be restocked.')) {
        return; // Cancel
      }
      try {
        await shopTransactionService.markAsReturned(id, user?.email || 'Unknown');
        // Update local state to reflect the wipe
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
        
        // Also fire sms
        const smsSettings = await smsConfigService.getSettings();
        if (smsSettings.enabled && smsSettings.apiKey && smsSettings.senderId && c.phone) {
          await sendSMS(c.phone, `Your device   has been returned unrepaired. Please collect it from .`, smsSettings.apiKey, smsSettings.senderId, smsSettings.apiUrl);
        }
        return;
      } catch (err: any) {
        console.error('Error marking as returned', err);
        alert(err.message || 'Failed to mark as returned');
        return;
      }
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
        await sendSMS(c.phone, `Your device   has been returned unrepaired. Please collect it from .`, smsSettings.apiKey, smsSettings.senderId, smsSettings.apiUrl);
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

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          c.phone.includes(search) ||
                          c.deviceBrand?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || (c.status || 'Received') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 mb-8">
        
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input 
              type="text" 
              placeholder="Search..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-card border border-gray-800 text-gray-200 text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all w-full sm:w-56"
              />
            </div>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as CustomerStatus | 'All')}>
              <SelectTrigger className="w-36 bg-card border-gray-800 h-[42px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
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
          <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
            <Button 
              onClick={handleExportCSV}
              className="hidden sm:flex items-center gap-2 bg-secondary hover:bg-gray-800 text-gray-300 border border-gray-800 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
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
      </div>

      {/* Customer Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-card rounded-2xl border border-gray-800/50 overflow-hidden"
      >
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)] relative">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary sticky top-0 z-10 shadow-sm">
              <tr className="text-gray-400 uppercase tracking-wider text-xs border-b border-gray-800">
                <th className="px-6 py-4 font-medium text-left min-w-[200px]">Customer Info</th>
                <th className="px-6 py-4 font-medium text-left min-w-[150px]">Contact</th>
                <th className="px-6 py-4 font-medium text-left min-w-[200px]">Appliance Info</th>
                <th className="px-6 py-4 font-medium text-left min-w-[150px]">Delivery</th>
                <th className="px-6 py-4 font-medium text-left min-w-[180px]">Status</th>
                <th className="px-6 py-4 font-medium text-right min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading customers...</td>
                </tr>
              ) : filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-800/20 transition-colors group">
                  <td className="px-6 py-4">
                    <Button variant="link" onClick={() => setProfileSidebarCustomer(customer)} className="p-0 h-auto font-semibold text-gray-200 hover:text-blue-400 transition-colors text-left block hover:no-underline"
                      title="View Customer Profile & History"
                    >
                      {customer.name}
                    </Button>
                    <div className="text-xs text-gray-500 mt-1">{customer.address || 'No Address'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300 font-medium">{customer.phone}</span>
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
                        className="text-green-500 hover:text-green-400 p-1.5 bg-green-500/10 hover:bg-green-500/20 rounded-full transition-colors"
                        title="Send Invoice on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-300 text-sm font-medium">
                      {customer.deviceBrand || 'N/A'} {customer.deviceType ? `(${customer.deviceType})` : ''}
                      {customer.serialNumber && (
                        <span className="ml-2 text-[10px] text-gray-500 font-mono bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700/50">
                          SN: {customer.serialNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-orange-400/80 mt-0.5">{customer.deviceProblem || 'N/A'}</div>
                    {customer.deviceDetails && <div className="text-[10px] text-gray-500 mt-1 truncate max-w-[150px]">{customer.deviceDetails}</div>}
                    {customer.warrantyMonths ? (
                      <div className="text-[10px] font-medium text-purple-400 mt-1 bg-purple-500/10 px-2 py-0.5 rounded w-fit">
                        {customer.warrantyMonths} Warranty
                      </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
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
                  <td className="px-6 py-4">
                    <StatusDropdown 
                      status={customer.status} 
                      onChange={(newStatus) => handleUpdateStatus(customer.id, newStatus)} 
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3 transition-opacity">
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
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No customers found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <CustomerProfileSidebar
        isOpen={!!profileSidebarCustomer}
        onClose={() => setProfileSidebarCustomer(null)}
        customer={profileSidebarCustomer}
        allCustomers={customers}
      />

      <CustomerModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCustomer}
        initialData={editingCustomer}
        existingAddresses={Array.from(new Set(customers.map(c => c.address).filter(Boolean)))}
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
        onClose={() => setConfirmModal({ isOpen: false, actionType: null, id: null })}
        onConfirm={handleConfirmAction}
        title={confirmModal.actionType === 'return' ? "Mark as Returned?" : "Delete Customer?"}
        message={confirmModal.actionType === 'return' 
          ? "Are you sure you want to mark this as Returned? Any advance will be logged as Refunded and parts will be restocked." 
          : "Are you sure you want to delete this customer? This action cannot be undone and all data will be permanently lost."}
        confirmText={confirmModal.actionType === 'return' ? "Confirm Return" : "Delete Customer"}
      />
    </div>
  );
}














