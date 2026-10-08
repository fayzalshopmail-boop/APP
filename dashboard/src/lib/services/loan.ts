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
  arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase';

export interface LoanHistoryEntry {
  amount: number;
  date: string;
  type: 'Payment' | 'Given' | 'Taken';
  note?: string;
}

export interface Loan {
  id: string;
  personName: string;
  phone?: string;
  type: 'Given' | 'Taken';
  amount: number;
  paidAmount?: number;
  date: string | any;
  status: 'Pending' | 'Paid';
  notes?: string;
  nextPaymentDate?: string;
  history?: LoanHistoryEntry[];
  createdAt?: any;
  updatedAt?: any;
}

const COLLECTION_NAME = 'loans';

export const loanService = {
  getAll: async (): Promise<Loan[]> => {
    try {
      if (!db) return [];
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Loan[];
    } catch (error) {
      console.error("Error fetching loans:", error);
      return [];
    }
  },

  add: async (loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const historyEntry: LoanHistoryEntry = {
      amount: loan.amount,
      date: new Date().toISOString(),
      type: loan.type,
      note: 'Initial entry'
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...loan,
      paidAmount: 0,
      history: [historyEntry],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  update: async (id: string, data: Partial<Loan>): Promise<void> => {
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
  
  markAsPaid: async (id: string): Promise<void> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      status: 'Paid',
      nextPaymentDate: null,
      updatedAt: serverTimestamp()
    });
  },

  addPayment: async (id: string, currentPaid: number, payment: number, totalAmount: number, nextDate?: string): Promise<{ newPaid: number, status: 'Pending' | 'Paid' }> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const newPaid = (currentPaid || 0) + payment;
    const newStatus = newPaid >= totalAmount ? 'Paid' : 'Pending';
    
    const historyEntry: LoanHistoryEntry = {
      amount: payment,
      date: new Date().toISOString(),
      type: 'Payment',
      note: 'Partial payment received'
    };

    const updateData: any = {
      paidAmount: newPaid,
      status: newStatus,
      history: arrayUnion(historyEntry),
      updatedAt: serverTimestamp()
    };
    
    if (newStatus === 'Paid') {
      updateData.nextPaymentDate = null;
    } else if (nextDate) {
      updateData.nextPaymentDate = nextDate;
    }

    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updateData);

    return { newPaid, status: newStatus };
  }
};

