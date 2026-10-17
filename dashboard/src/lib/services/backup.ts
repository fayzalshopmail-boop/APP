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
      loans,
      attendance,
      payroll,
      settingsDocs
    ] = await Promise.all([
      customerService.getAll(),
      inventoryService.getAll(),
      transactionService.getAll(),
      expenseService.getAll(),
      supplierService.getAll(),
      mechanicService.getAll(),
      loanService.getAll(),
      getDocs(collection(db, 'attendance')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))).catch(() => []),
      getDocs(collection(db, 'payroll')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))).catch(() => []),
      getDocs(collection(db, 'settings')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))).catch(() => [])
    ]);

    const data = {
      customers,
      inventory,
      transactions,
      expenses,
      suppliers,
      mechanics,
      loans,
      attendance,
      payroll,
      settings: settingsDocs,
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
      loans,
      attendance,
      payroll,
      settingsDocs
    ] = await Promise.all([
      customerService.getAll(),
      inventoryService.getAll(),
      transactionService.getAll(),
      expenseService.getAll(),
      supplierService.getAll(),
      mechanicService.getAll(),
      loanService.getAll(),
      getDocs(collection(db, 'attendance')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))).catch(() => []),
      getDocs(collection(db, 'payroll')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))).catch(() => []),
      getDocs(collection(db, 'settings')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))).catch(() => [])
    ]);

    const data = {
      customers,
      inventory,
      transactions,
      expenses,
      suppliers,
      mechanics,
      loans,
      attendance,
      payroll,
      settings: settingsDocs,
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

    const collectionsToRestore: { name: string; items: any[] }[] = [
      { name: 'customers', items: data.customers },
      { name: 'inventory', items: data.inventory },
      { name: 'transactions', items: data.transactions },
      { name: 'expenses', items: data.expenses },
      { name: 'suppliers', items: data.suppliers },
      { name: 'mechanics', items: data.mechanics },
      { name: 'loans', items: data.loans },
      { name: 'attendance', items: data.attendance },
      { name: 'payroll', items: data.payroll },
      { name: 'settings', items: data.settings },
    ];

    let currentBatch = writeBatch(db);
    let opCount = 0;
    const BATCH_LIMIT = 400; // safe margin under Firestore 500 op limit

    for (const col of collectionsToRestore) {
      if (!col.items || !Array.isArray(col.items)) continue;
      for (const item of col.items) {
        const { id, ...rest } = item;
        if (id) {
          const docRef = doc(db, col.name, id);
          currentBatch.set(docRef, rest, { merge: true });
        } else {
          const docRef = doc(collection(db, col.name));
          currentBatch.set(docRef, rest);
        }
        opCount++;
        if (opCount >= BATCH_LIMIT) {
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          opCount = 0;
        }
      }
    }

    if (opCount > 0) {
      await currentBatch.commit();
    }
  },

  clearAllData: async () => {
    if (!db) throw new Error('Firebase DB is not initialized');
    
    const collectionsToClear = [
      'customers', 'inventory', 'transactions', 'expenses', 
      'suppliers', 'mechanics', 'loans', 'attendance', 'payroll'
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


