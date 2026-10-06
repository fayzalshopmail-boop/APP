import { collection, addDoc, getDocs, query, orderBy, where, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export type TransactionType = 'Advance Payment' | 'Due Collection' | 'Refund' | 'Direct Sell' | 'Inventory Purchase' | 'Supplier Payment' | 'Mechanic Payment';

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
      const q = query(
        collection(db, COLLECTION_NAME),
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
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
