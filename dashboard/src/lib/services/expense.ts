import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  createdAt?: any;
}

const COLLECTION_NAME = 'expenses';

export const expenseService = {
  getAll: async (): Promise<Expense[]> => {
    try {
      if (!db) return [];
      const q = query(collection(db, COLLECTION_NAME), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Expense));
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }
  },

  add: async (expenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<string> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...expenseData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  delete: async (id: string): Promise<void> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
};
