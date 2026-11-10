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
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const itemData = snap.data() as InventoryItem;
        const newStock = Math.max(0, (itemData.stock || 0) + delta);
        await updateDoc(docRef, {
          stock: newStock,
          updatedAt: serverTimestamp()
        });

        const minLevel = itemData.minStockLevel || 5;
        if (delta < 0 && newStock <= minLevel) {
          try {
            const { telegramService } = await import('./telegramService');
            telegramService.notifyLowStock({
              itemName: itemData.name,
              currentStock: newStock,
              minStock: minLevel
            });

            const { notificationService } = await import('./notification');
            await notificationService.add({
              title: 'Low Stock Alert',
              message: `${itemData.name} stock has dropped to ${newStock} (Min: ${minLevel}). Please restock!`,
              type: 'warning',
              targetRole: 'Owner',
              link: `/inventory?search=${encodeURIComponent(itemData.name)}`
            });
          } catch (notifErr) {
            console.warn('Failed to send low stock notification:', notifErr);
          }
        }
      } else {
        await updateDoc(docRef, {
          stock: increment(delta),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      throw error;
    }
  },
  async update(id: string, item: Partial<InventoryItem>): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const snap = await getDoc(docRef);
      const prevData = snap.exists() ? (snap.data() as InventoryItem) : null;

      const updateData = { ...item };
      delete updateData.id; // Don't update the ID field
      
      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });

      // Check if stock decreased to low level
      if (typeof item.stock === 'number' && prevData) {
        const minLevel = typeof item.minStockLevel === 'number' ? item.minStockLevel : (prevData.minStockLevel || 5);
        if (item.stock < prevData.stock && item.stock <= minLevel) {
          try {
            const { telegramService } = await import('./telegramService');
            telegramService.notifyLowStock({
              itemName: item.name || prevData.name,
              currentStock: item.stock,
              minStock: minLevel
            });

            const { notificationService } = await import('./notification');
            await notificationService.add({
              title: 'Low Stock Alert',
              message: `${item.name || prevData.name} stock has dropped to ${item.stock} (Min: ${minLevel}). Please restock!`,
              type: 'warning',
              targetRole: 'Owner',
              link: `/inventory?search=${encodeURIComponent(item.name || prevData.name)}`
            });
          } catch (notifErr) {
            console.warn('Failed to send low stock notification:', notifErr);
          }
        }
      }
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
