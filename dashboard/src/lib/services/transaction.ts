import { collection, addDoc, getDocs, query, orderBy, where, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export type TransactionType = 
  | 'Advance Payment' 
  | 'Due Collection' 
  | 'Refund' 
  | 'Direct Sell' 
  | 'Inventory Purchase' 
  | 'Supplier Payment' 
  | 'Mechanic Payment'
  | 'Loan Collection'
  | 'Loan Repayment';

export interface Transaction {
  id: string;
  customerId: string; // Can be supplierId or mechanicId or generic string
  customerName: string; // Can be supplierName or mechanicName or item name
  amount: number;
  type: TransactionType;
  receivedBy: string; // email of staff
  createdAt?: unknown;
}

const COLLECTION_NAME = 'transactions';

export const transactionService = {
  // Record a new transaction
  add: async (data: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding transaction: ', error);
      throw error;
    }
  },

  // Get transactions for a specific customer/entity
  getByCustomer: async (customerId: string): Promise<Transaction[]> => {
    if (!db) return [];
    try {
      // Query without server-side orderBy to prevent Firestore Composite Index requirement error
      const q = query(
        collection(db, COLLECTION_NAME),
        where('customerId', '==', customerId)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];

      const parseTime = (val: unknown): number => {
        if (!val) return 0;
        if (typeof val === 'object' && val !== null) {
          if ('toMillis' in val && typeof (val as any).toMillis === 'function') {
            return (val as any).toMillis();
          }
          if ('seconds' in val && typeof (val as any).seconds === 'number') {
            return (val as any).seconds * 1000;
          }
          if (val instanceof Date) {
            return val.getTime();
          }
        }
        if (typeof val === 'string' || typeof val === 'number') {
          const d = new Date(val).getTime();
          return isNaN(d) ? 0 : d;
        }
        return 0;
      };

      return list.sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt));
    } catch (error) {
      console.error('Error fetching transactions: ', error);
      return [];
    }
  },

  // Get all transactions
  getAll: async (): Promise<Transaction[]> => {
    if (!db) return [];
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
    } catch (error) {
      console.error('Error fetching all transactions: ', error);
      return [];
    }
  },

  // Delete all transactions for a specific customer
  deleteByCustomer: async (customerId: string): Promise<void> => {
    if (!db) return;
    try {
      const q = query(collection(db, COLLECTION_NAME), where('customerId', '==', customerId));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, COLLECTION_NAME, document.id)));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting customer transactions: ', error);
      throw error;
    }
  }
};
