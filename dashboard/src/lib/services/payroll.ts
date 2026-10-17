import { collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { expenseService } from './expense';

export type PayrollType = 'Salary Payment' | 'Advance Salary' | 'Bonus' | 'Deduction';

export interface PayrollRecord {
  id?: string;
  staffEmail: string;
  staffName: string;
  month: string;        // 'YYYY-MM', e.g. '2026-10'
  type: PayrollType;
  amount: number;
  paymentMethod: 'Cash' | 'bKash' | 'Nagad' | 'Bank';
  date: string;         // 'YYYY-MM-DD'
  note?: string;
  paidBy: string;       // Owner or Manager who gave the money
  expenseId?: string;   // Linked expense record ID in 'expenses' collection
  createdAt?: any;
}

export interface StaffSalaryConfig {
  email: string;
  baseSalary: number;
  phone?: string;
  notes?: string;
  updatedAt?: any;
}

const COLLECTION_NAME = 'payroll';
const CONFIG_COLLECTION = 'salaryConfigs';

export const getCurrentMonthStr = (d = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const payrollService = {
  /**
   * Record a payroll transaction (Salary, Advance, Bonus, Deduction)
   * Optionally syncs to the shop's Expenses collection under 'Staff Salary'
   */
  async addPayment(
    record: Omit<PayrollRecord, 'id' | 'createdAt'>, 
    syncToExpenses: boolean = true
  ): Promise<string> {
    if (!db) throw new Error('Database not initialized');

    let linkedExpenseId: string | undefined = undefined;

    // Automatically sync as an Expense under 'Staff Salary' to maintain shop ledger accuracy
    if (syncToExpenses && (record.type === 'Salary Payment' || record.type === 'Advance Salary' || record.type === 'Bonus')) {
      try {
        linkedExpenseId = await expenseService.add({
          title: `${record.type === 'Advance Salary' ? 'অগ্রিম বেতন' : record.type === 'Bonus' ? 'বোনাস' : 'মাসিক বেতন'}: ${record.staffName} (${record.month}${record.note ? ` - ${record.note}` : ''})`,
          amount: Number(record.amount) || 0,
          category: 'Staff Salary',
          date: record.date || new Date().toISOString().split('T')[0]
        });
      } catch (e) {
        console.error('Failed to sync payroll entry to expenses:', e);
      }
    }

    const docData: any = {
      ...record,
      amount: Number(record.amount) || 0,
      createdAt: serverTimestamp()
    };

    if (linkedExpenseId) {
      docData.expenseId = linkedExpenseId;
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);

    return docRef.id;
  },

  /**
   * Fetch all payroll records with optional month and staff filters
   */
  async getRecords(month?: string, staffEmail?: string): Promise<PayrollRecord[]> {
    if (!db) return [];
    try {
      let q = collection(db, COLLECTION_NAME) as any;

      if (month && staffEmail) {
        q = query(q, where('month', '==', month), where('staffEmail', '==', staffEmail));
      } else if (month) {
        q = query(q, where('month', '==', month));
      } else if (staffEmail) {
        q = query(q, where('staffEmail', '==', staffEmail));
      }

      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as object) } as PayrollRecord));
      // Sort by date descending
      return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    } catch (e) {
      console.error('Error fetching payroll records:', e);
      return [];
    }
  },

  /**
   * Delete a payroll record and clean up any linked expense in shop expenses
   */
  async deleteRecord(id: string): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data?.expenseId) {
          try {
            await expenseService.delete(data.expenseId);
          } catch (expErr) {
            console.error('Failed to delete linked expense record:', expErr);
          }
        }
      }
      await deleteDoc(docRef);
    } catch (e) {
      console.error('Error deleting payroll record:', e);
      throw e;
    }
  },

  /**
   * Save / Update a staff member's base salary and info
   */
  /**
   * Save / Update a staff member's base salary and info
   */
  async saveSalaryConfig(config: StaffSalaryConfig): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    const normalizedEmail = (config.email || '').toLowerCase().trim();
    const docRef = doc(db, CONFIG_COLLECTION, normalizedEmail);
    await setDoc(docRef, {
      ...config,
      email: normalizedEmail,
      baseSalary: Number(config.baseSalary) || 0,
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  /**
   * Delete salary configuration for a staff member
   */
  async deleteSalaryConfig(email: string): Promise<void> {
    if (!db) return;
    try {
      const normalized = (email || '').toLowerCase().trim();
      await deleteDoc(doc(db, CONFIG_COLLECTION, normalized));
      if (email && email !== normalized) {
        await deleteDoc(doc(db, CONFIG_COLLECTION, email));
      }
    } catch (e) {
      console.error('Error deleting salary config:', e);
    }
  },

  /**
   * Fetch salary configs for all staff members
   */
  async getAllSalaryConfigs(): Promise<Record<string, StaffSalaryConfig>> {
    if (!db) return {};
    try {
      const snap = await getDocs(collection(db, CONFIG_COLLECTION));
      const result: Record<string, StaffSalaryConfig> = {};
      snap.forEach(d => {
        result[d.id] = d.data() as StaffSalaryConfig;
      });
      return result;
    } catch (e) {
      console.error('Error fetching salary configs:', e);
      return {};
    }
  },

  /**
   * Calculate financial summary for a staff member for a specific month
   */
  calculateStaffMonthlySummary(
    records: PayrollRecord[],
    staffEmail: string,
    month: string,
    baseSalary: number = 0
  ) {
    const staffRecords = records.filter(r => r.staffEmail === staffEmail && r.month === month);

    let salaryPaid = 0;
    let advancePaid = 0;
    let bonus = 0;
    let deductions = 0;

    for (const r of staffRecords) {
      if (r.type === 'Salary Payment') salaryPaid += r.amount;
      else if (r.type === 'Advance Salary') advancePaid += r.amount;
      else if (r.type === 'Bonus') bonus += r.amount;
      else if (r.type === 'Deduction') deductions += r.amount;
    }

    const totalPaidThisMonth = salaryPaid + advancePaid;
    const netPayableTarget = Math.max(0, baseSalary + bonus - deductions);
    const balanceDue = Math.max(0, netPayableTarget - totalPaidThisMonth);

    return {
      baseSalary,
      salaryPaid,
      advancePaid,
      bonus,
      deductions,
      totalPaidThisMonth,
      balanceDue,
      records: staffRecords
    };
  }
};
