import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';

export interface Supplier {
  id: string;
  name: string;
  company: string;
  phone: string;
  address?: string;
  totalPurchase: number;
  totalPaid: number;
  due: number;
  status: 'Active' | 'Inactive';
  createdAt?: any;
}

const COLLECTION_NAME = 'suppliers';

export const supplierService = {
  getAll: async (): Promise<Supplier[]> => {
    try {
      if (!db) return [];
      const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Supplier));
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return [];
    }
  },

  getById: async (id: string): Promise<Supplier | null> => {
    if (!db) return null;
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Supplier;
  },

  add: async (supplierData: Omit<Supplier, 'id' | 'createdAt' | 'totalPurchase' | 'totalPaid' | 'due'>): Promise<string> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...supplierData,
      totalPurchase: 0,
      totalPaid: 0,
      due: 0,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  update: async (id: string, data: Partial<Supplier>): Promise<void> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, data);
  },

  addBill: async (id: string, amount: number): Promise<{ newPurchase: number, newDue: number }> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Supplier not found');
    
    const data = snap.data() as Supplier;
    const newPurchase = (data.totalPurchase || 0) + amount;
    const newDue = (data.due || 0) + amount;
    
    await updateDoc(docRef, {
      totalPurchase: newPurchase,
      due: newDue
    });
    return { newPurchase, newDue };
  },

  delete: async (id: string): Promise<void> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  addPayment: async (id: string, amount: number, userEmail: string = 'Unknown'): Promise<{ newPaid: number, newDue: number }> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const docRef = doc(db, COLLECTION_NAME, id);
    let result = { newPaid: 0, newDue: 0 };
    
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) throw new Error('Supplier not found');
      
      const data = snap.data() as Supplier;
      const newPaid = (data.totalPaid || 0) + amount;
      const newDue = Math.max(0, (data.totalPurchase || 0) - newPaid);
      
      transaction.update(docRef, {
        totalPaid: newPaid,
        due: newDue
      });
      
      const newTransactionRef = doc(collection(db, 'transactions'));
      transaction.set(newTransactionRef, {
        customerId: id,
        customerName: data.name + (data.company ? ` (${data.company})` : ''),
        amount: amount,
        type: 'Supplier Payment',
        receivedBy: userEmail,
        createdAt: serverTimestamp()
      });
      
      result = { newPaid, newDue };
    });
    
    return result;
  }
};
