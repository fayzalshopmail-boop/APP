import { 
  collection, 
  doc, 
  getDocs,
  getDoc,
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp, increment,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit?: string; // Pcs, Meters, etc.
  purchasePrice: number;
  sellingPrice: number;
  supplierId?: string;
  minStockLevel?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InventorySettings {
  categories: string[];
  productNames: Record<string, string[]>;
}

const defaultSettings: InventorySettings = {
  categories: ['Motherboard', 'Panel', 'Backlight', 'Power Supply', 'Accessories'],
  productNames: {
    'Motherboard': ['T.V53.03', 'T.SK105A.03'],
    'Panel': ['32 Inch BOE', '43 Inch LG'],
    'Backlight': ['32 Inch Universal', '43 Inch Universal'],
    'Power Supply': ['Universal 12V 5A', 'Universal 24V 3A'],
    'Accessories': ['Remote', 'Wall Mount']
  }
};

const COLLECTION_NAME = 'inventory';

export const inventorySettingsService = {
  async getSettings(): Promise<InventorySettings> {
    if (!db) return defaultSettings;
    try {
      const docRef = doc(db, 'settings', 'inventory');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as InventorySettings;
      }
      return defaultSettings;
    } catch (error) {
      console.error('Error fetching inventory settings:', error);
      return defaultSettings;
    }
  },
  async saveSettings(settings: InventorySettings): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    await setDoc(doc(db, 'settings', 'inventory'), settings);
  }
};

export const inventoryService = {
  async getById(id: string): Promise<InventoryItem | null> {
    if (!db) return null;
    try {
      const { getDoc, doc } = await import('firebase/firestore');
      const docRef = doc(db, COLLECTION_NAME, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() } as InventoryItem;
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  async getAll(): Promise<InventoryItem[]> {
    if (!db) return [];
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw error;
    }
  },

  async add(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!db) throw new Error('Database not initialized');
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding inventory item:', error);
      throw error;
    }
  },

  
  async adjustStock(id: string, delta: number): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        stock: increment(delta),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adjusting stock:', error);
      throw error;
    }
  },
  async update(id: string, item: Partial<InventoryItem>): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData = { ...item };
      delete updateData.id; // Don't update the ID field
      
      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  }
};
