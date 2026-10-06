import { 
  collection, 
  doc, 
  getDocs,
  getDoc,
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Mechanic {
  id: string;
  name: string;
  phone: string;
  address?: string;
  totalJobsBrought: number;
  totalCommissionEarned: number;
  totalCommissionPaid: number;
  commissionDue: number;
  createdAt?: any;
  updatedAt?: any;
}

const COLLECTION_NAME = 'mechanics';

export const mechanicService = {
  getAll: async (): Promise<Mechanic[]> => {
    try {
      if (!db) return [];
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Mechanic[];
    } catch (error) {
      console.error("Error fetching mechanics:", error);
      return [];
    }
  },

  add: async (data: Omit<Mechanic, 'id' | 'createdAt' | 'updatedAt' | 'totalJobsBrought' | 'totalCommissionEarned' | 'totalCommissionPaid' | 'commissionDue'>): Promise<string> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      totalJobsBrought: 0,
      totalCommissionEarned: 0,
      totalCommissionPaid: 0,
      commissionDue: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  update: async (id: string, data: Partial<Mechanic>): Promise<void> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  delete: async (id: string): Promise<void> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  addJobCommission: async (id: string, commission: number): Promise<void> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Mechanic not found');
    
    const data = snap.data() as Mechanic;
    
    await updateDoc(docRef, {
      totalJobsBrought: (data.totalJobsBrought || 0) + 1,
      totalCommissionEarned: (data.totalCommissionEarned || 0) + commission,
      commissionDue: (data.commissionDue || 0) + commission,
      updatedAt: serverTimestamp()
    });
  },

  payCommission: async (id: string, amount: number, userEmail: string = 'Unknown'): Promise<{ newPaid: number, newDue: number }> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const docRef = doc(db, COLLECTION_NAME, id);
    let result = { newPaid: 0, newDue: 0 };
    
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) throw new Error('Mechanic not found');
      
      const data = snap.data() as Mechanic;
      const newPaid = (data.totalCommissionPaid || 0) + amount;
      const newDue = Math.max(0, (data.commissionDue || 0) - amount);
      
      transaction.update(docRef, {
        totalCommissionPaid: newPaid,
        commissionDue: newDue,
        updatedAt: serverTimestamp()
      });
      
      const newTransactionRef = doc(collection(db, 'transactions'));
      transaction.set(newTransactionRef, {
        customerId: id,
        customerName: data.name + ' (Mechanic)',
        amount: amount,
        type: 'Mechanic Payment',
        receivedBy: userEmail,
        createdAt: serverTimestamp()
      });
      
      result = { newPaid, newDue };
    });
    
    return result;
  }
};
