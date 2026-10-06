import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { customerService } from './customer';
import { inventoryService } from './inventory';
import { transactionService } from './transaction';
import { expenseService } from './expense';
import { supplierService } from './supplier';
import { mechanicService } from './mechanic';
import { loanService } from './loan';

export const backupService = {
  generateFullBackupJSON: async (): Promise<string> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    
    const [
      customers,
      inventory,
      transactions,
      expenses,
      suppliers,
      mechanics,
      loans
    ] = await Promise.all([
      customerService.getAll(),
      inventoryService.getAll(),
      transactionService.getAll(),
      expenseService.getAll(),
      supplierService.getAll(),
      mechanicService.getAll(),
      loanService.getAll()
    ]);

    const data = {
      customers,
      inventory,
      transactions,
      expenses,
      suppliers,
      mechanics,
      loans,
      exportDate: new Date().toISOString()
    };

    return JSON.stringify(data, null, 2);
  },

  exportAllData: async () => {
    if (!db) throw new Error('Firebase DB is not initialized');
    
    const [
      customers,
      inventory,
      transactions,
      expenses,
      suppliers,
      mechanics,
      loans
    ] = await Promise.all([
      customerService.getAll(),
      inventoryService.getAll(),
      transactionService.getAll(),
      expenseService.getAll(),
      supplierService.getAll(),
      mechanicService.getAll(),
      loanService.getAll()
    ]);

    const data = {
      customers,
      inventory,
      transactions,
      expenses,
      suppliers,
      mechanics,
      loans,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shop_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportCustomerContactsCSV: async () => {
    const customers = await customerService.getAll();
    let csv = "Name,Phone\n";
    
    customers.forEach(c => {
      const name = c.name.includes(',') ? `"${c.name}"` : c.name;
      const phone = c.phone.includes(',') ? `"${c.phone}"` : c.phone;
      csv += `${name},${phone}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_contacts_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  restoreData: async (jsonString: string) => {
    if (!db) throw new Error('Firebase DB is not initialized');
    
    const data = JSON.parse(jsonString);
    if (!data.customers && !data.inventory) {
      throw new Error("Invalid backup file format.");
    }

    const batch = writeBatch(db);

    const restoreCollection = (items: any[], collectionName: string) => {
      if (!items || !Array.isArray(items)) return;
      items.forEach(item => {
        const { id, ...rest } = item;
        if (id) {
          const docRef = doc(db, collectionName, id);
          batch.set(docRef, rest, { merge: true });
        } else {
          const docRef = doc(collection(db!, collectionName));
          batch.set(docRef, rest);
        }
      });
    };

    restoreCollection(data.customers, 'customers');
    restoreCollection(data.inventory, 'inventory');
    restoreCollection(data.transactions, 'transactions');
    restoreCollection(data.expenses, 'expenses');
    restoreCollection(data.suppliers, 'suppliers');
    restoreCollection(data.mechanics, 'mechanics');
    restoreCollection(data.loans, 'loans');

    await batch.commit();
  },

  clearAllData: async () => {
    if (!db) throw new Error('Firebase DB is not initialized');
    
    const collectionsToClear = [
      'customers', 'inventory', 'transactions', 'expenses', 
      'suppliers', 'mechanics', 'loans'
    ];

    for (const colName of collectionsToClear) {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      
      // Batch deletes in chunks of 500 (Firestore limit)
      let batch = writeBatch(db);
      let count = 0;
      
      for (const document of snapshot.docs) {
        batch.delete(document.ref);
        count++;
        
        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      
      if (count > 0) {
        await batch.commit();
      }
    }
  }
};


