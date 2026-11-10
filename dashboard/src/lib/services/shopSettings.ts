import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface TelegramSettings {
  enabled: boolean;
  botToken: string;
  chatId: string;
  notifyOnCustomerCreate?: boolean;
  notifyOnSale?: boolean;
  notifyOnPayment?: boolean;
  notifyOnStatusChange?: boolean;
  notifyOnExpense?: boolean;
  notifyOnLowStock?: boolean;
  notifyOnAttendance?: boolean;
  notifyOnSupplier?: boolean;
  notifyOnSecurity?: boolean;
  notifyOnDailySummary?: boolean;
  notifyOnLoan?: boolean;
  notifyOnBackup?: boolean;
}

export interface ShopSettings {
  shopName: string;
  shopTitle: string;
  logoUrl: string;
  phone: string;
  address: string;
  ownerName: string;
  lastAutoBackupDate?: number;
  language?: 'bn' | 'en';
  telegram?: TelegramSettings;
}

export const defaultShopSettings: ShopSettings = {
  shopName: 'My Shop',
  shopTitle: 'Electronics Servicing Center',
  logoUrl: '',
  phone: '',
  address: '',
  ownerName: 'Owner',
  language: 'bn',
  telegram: {
    enabled: false,
    botToken: '',
    chatId: '',
    notifyOnCustomerCreate: true,
    notifyOnSale: true,
    notifyOnPayment: true,
    notifyOnStatusChange: true,
    notifyOnExpense: true,
    notifyOnLowStock: true,
    notifyOnAttendance: true,
    notifyOnSupplier: true,
    notifyOnSecurity: true,
    notifyOnDailySummary: true,
    notifyOnLoan: true,
    notifyOnBackup: true,
  }
};

export const shopSettingsService = {
  async getSettings(): Promise<ShopSettings> {
    try {
      if (!db) return defaultShopSettings;
      const docRef = doc(db, 'settings', 'shop');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const mergedTelegram: TelegramSettings = {
          ...defaultShopSettings.telegram!,
          ...(data.telegram || {})
        };
        const settings: ShopSettings = {
          ...defaultShopSettings,
          ...data,
          telegram: mergedTelegram
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('cached_shop_settings', JSON.stringify(settings));
          } catch {}
        }
        return settings;
      }
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('cached_shop_settings');
        if (cached) {
          try { return JSON.parse(cached); } catch {}
        }
      }
      return defaultShopSettings;
    } catch (error) {
      console.error("Failed to fetch shop settings", error);
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('cached_shop_settings');
        if (cached) {
          try { return JSON.parse(cached); } catch {}
        }
      }
      return defaultShopSettings;
    }
  },
  
  async saveSettings(settings: ShopSettings): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    const docRef = doc(db, 'settings', 'shop');
    const cleanSettings = JSON.parse(JSON.stringify(settings));
    await setDoc(docRef, cleanSettings, { merge: true });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cached_shop_settings', JSON.stringify(cleanSettings));
      } catch {}
    }
  }
};


