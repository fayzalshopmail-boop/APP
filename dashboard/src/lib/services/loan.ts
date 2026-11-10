import { 
  collection, 
  doc, 
  getDocs,
  getDoc,
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
import { telegramService } from './telegramService';

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

  add: async (loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>, staffName?: string): Promise<string> => {
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

    try {
      telegramService.notifyLoan({
        eventType: 'new_loan',
        personName: loan.personName,
        phone: loan.phone,
        loanType: loan.type,
        amount: loan.amount,
        note: loan.notes,
        staffName
      });
    } catch (e) {
      console.warn('Telegram notifyLoan exception:', e);
    }

    try {
      const { notificationService } = await import('./notification');
      await notificationService.add({
        title: loan.type === 'Given' ? 'নতুন ধার প্রদান (Loan Given)' : 'নতুন ঋণ গ্রহণ (Loan Taken)',
        message: `${loan.personName} কে ৳${loan.amount} ${loan.type === 'Given' ? 'ধার দেওয়া হয়েছে' : 'ঋণ নেওয়া হয়েছে'}।`,
        type: 'info',
        targetRole: 'Owner',
        link: '/loans'
      });
    } catch (e) {
      console.warn('Failed to add in-app loan notification:', e);
    }

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
  
  markAsPaid: async (id: string, staffName?: string): Promise<void> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    const loanData = snap.exists() ? (snap.data() as Loan) : null;

    await updateDoc(docRef, {
      status: 'Paid',
      nextPaymentDate: null,
      updatedAt: serverTimestamp()
    });

    if (loanData) {
      try {
        telegramService.notifyLoan({
          eventType: 'settled',
          personName: loanData.personName,
          phone: loanData.phone,
          loanType: loanData.type,
          amount: loanData.amount,
          staffName
        });
      } catch (e) {
        console.warn('Telegram notifyLoan exception:', e);
      }
    }
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

    const remaining = Math.max(0, totalAmount - newPaid);

    try {
      telegramService.notifyLoan({
        eventType: newStatus === 'Paid' ? 'settled' : 'payment',
        personName: personName || '',
        loanType: loanType || 'Given',
        amount: totalAmount,
        paidAmount: newPaid,
        paymentAmount: payment,
        remainingDue: remaining,
        note: defaultNote,
        staffName: receivedBy
      });
    } catch (e) {
      console.warn('Telegram notifyLoan exception:', e);
    }

    try {
      const { notificationService } = await import('./notification');
      await notificationService.add({
        title: newStatus === 'Paid' ? 'ধার সম্পূর্ণ পরিশোধিত' : (loanType === 'Taken' ? 'ঋণ পরিশোধ সম্পন্ন' : 'ধারের কিস্তি আদায়'),
        message: `${personName || 'ব্যক্তি'} এর ৳${payment} ${loanType === 'Taken' ? 'পরিশোধ করা হয়েছে' : 'আদায় হয়েছে'}${newStatus === 'Paid' ? ' (সকল হিসাব পরিশোধিত)' : ` (বাকি: ৳${remaining})`}।`,
        type: newStatus === 'Paid' ? 'success' : 'info',
        targetRole: 'Owner',
        link: '/loans'
      });
    } catch (e) {
      console.warn('Failed to add in-app loan payment notification:', e);
    }

    return { newPaid, status: newStatus };
  }
};

