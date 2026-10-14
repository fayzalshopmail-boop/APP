const fs = require('fs');
let content = fs.readFileSync('src/app/customers/page.tsx', 'utf8');

// 1. Update handleUpdateStatus
const statusUpdateRegex = /const handleUpdateStatus = async \([\s\S]*?await performStatusUpdate\(id, newStatus, c\);\r?\n  \};/m;

const newStatusUpdate = `const handleUpdateStatus = async (id: string, newStatus: CustomerStatus) => {
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
          await sendSMS(c.phone, \`Your device \${c.deviceBrand} \${c.deviceType} has been returned unrepaired. Please collect it from \${settings?.shopName || 'our shop'}.\`);
        }
        return;
      } catch (err: any) {
        console.error('Error marking as returned', err);
        alert(err.message || 'Failed to mark as returned');
        return;
      }
    }

    await performStatusUpdate(id, newStatus, c);
  };`;

content = content.replace(statusUpdateRegex, newStatusUpdate);

// 2. Update handleDeleteConfirm
const deleteConfirmRegex = /const handleDeleteConfirm = async \(\) => \{[\s\S]*?await customerService\.delete\(confirmModal\.id\);\r?\n\s+setCustomers\(customers\.filter\(c => c\.id !== confirmModal\.id\)\);[\s\S]*?\};/m;

const newDeleteConfirm = `const handleDeleteConfirm = async () => {
    if (!confirmModal.id) return;
    try {
      await shopTransactionService.deleteCustomerSafely(confirmModal.id);
      setCustomers(customers.filter(c => c.id !== confirmModal.id));
      setConfirmModal({ isOpen: false, id: null, title: '', message: '' });
    } catch (error) { 
      console.error("Firebase error", error); 
      alert("Error: Failed to delete customer."); 
    }
  };`;

content = content.replace(deleteConfirmRegex, newDeleteConfirm);

fs.writeFileSync('src/app/customers/page.tsx', content, 'utf8');
console.log('Updated Phase 2 UI for customers page');
