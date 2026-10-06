import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface ShopSettings {
  shopName: string;
  shopTitle: string;
  logoUrl: string;
  phone: string;
  address: string;
  ownerName: string;
  lastAutoBackupDate?: number;
}

export const defaultShopSettings: ShopSettings = {
  shopName: 'My Shop',
  shopTitle: 'Electronics Servicing Center',
  logoUrl: '',
  phone: '',
  address: '',
  ownerName: 'Owner',
};

export const shopSettingsService = {
  async getSettings(): Promise<ShopSettings> {
    try {
      if (!db) return defaultShopSettings;
      const docRef = doc(db, 'settings', 'shop');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...defaultShopSettings, ...docSnap.data() } as ShopSettings;
      }
      return defaultShopSettings;
    } catch (error) {
      console.error("Failed to fetch shop settings", error);
      return defaultShopSettings;
    }
  },
  
  async saveSettings(settings: ShopSettings): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    const docRef = doc(db, 'settings', 'shop');
    await setDoc(docRef, settings);
  }
};


