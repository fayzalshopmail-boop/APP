import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export type CustomerStatus = 'Received' | 'In Progress' | 'Waiting for Parts' | 'Ready for Delivery' | 'Delivered' | 'Returned (Unrepaired)';

export interface PartUsed {
  inventoryId: string;
  name: string;
  quantity: number;
  cost: number;
  price: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  deviceBrand?: string;
  deviceType?: string;
  deviceProblem?: string;
  deviceDetails?: string;
  serialNumber?: string;
  totalBill: number;
  advance?: number;
  due: number;
  discount?: number;
  dueDate?: string;
  expectedDeliveryDate?: string;
  points: number;
  status?: CustomerStatus;
  warrantyMonths?: string | number;
  partsUsed?: PartUsed[];
  totalCost?: number;
  createdAt?: string | Date | any;
}

const COLLECTION_NAME = 'customers';

export const customerService = {
  // Get recent customers safely
  getRecent: async (limitCount: number): Promise<Customer[]> => {
    try {
      if (!db) return [];
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Customer));
    } catch (error) {
      console.error('Error fetching recent customers: ', error);
      return [];
    }
  },

  // Get all customers
  getAll: async (): Promise<Customer[]> => {
    try {
      if (!db) {
        console.warn("Firebase DB is not initialized. Using local state.");
        return [];
      }
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Customer));
    } catch (error) {
      console.error("Error fetching customers: ", error);
      throw error;
    }
  },



  // Update a customer
  update: async (id: string, data: Partial<Customer>) => {
    try {
      if (!db) throw "Firebase DB is not initialized";
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, data);
    } catch (error) {
      console.error("Error updating customer: ", error);
      throw error;
    }
  },

  // Delete a customer
  delete: async (id: string) => {
    try {
      if (!db) throw "Firebase DB is not initialized";
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting customer: ", error);
      throw error;
    }
  }
};



