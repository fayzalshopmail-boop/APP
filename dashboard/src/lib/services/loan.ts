import { 
  collection, 
  doc, 
  getDocs,
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  arrayUnion,
  runTransaction
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

  addPayment: async (
    id: string, 
    currentPaid: number, 
    payment: number, 
    totalAmount: number, 
    nextDate?: string,
    loanType?: 'Given' | 'Taken',
    customNote?: string,
    receivedBy?: string,
    personName?: string
  ): Promise<{ newPaid: number, status: 'Pending' | 'Paid' }> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const newPaid = (currentPaid || 0) + payment;
    const newStatus = newPaid >= totalAmount ? 'Paid' : 'Pending';
    
    const defaultNote = customNote 
      ? customNote 
      : loanType === 'Taken' 
        ? 'দেনা পরিশোধ করা হয়েছে' 
        : 'পাওনা টাকা আদায় হয়েছে';

    const historyEntry: LoanHistoryEntry = {
      amount: payment,
      date: new Date().toISOString(),
      type: 'Payment',
      note: defaultNote
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

    // Atomically update loan and record transaction in general ledger
    await runTransaction(db, async (transaction) => {
      transaction.update(docRef, updateData);

      // Record in central transactions collection for cash flow audit trail
      const transType = loanType === 'Taken' ? 'Loan Repayment' : 'Loan Collection';
      const transRef = doc(collection(db, 'transactions'));
      transaction.set(transRef, {
        customerId: id,
        customerName: personName ? `${personName} (${loanType === 'Taken' ? 'ঋণ পরিশোধ' : 'পাওনা আদায়'})` : (loanType === 'Taken' ? 'ঋণ পরিশোধ' : 'পাওনা আদায়'),
        amount: payment,
        type: transType,
        receivedBy: receivedBy || 'Owner',
        createdAt: serverTimestamp()
      });
    });

    return { newPaid, status: newStatus };
  }
};

