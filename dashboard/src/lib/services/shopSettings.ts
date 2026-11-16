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
  lastAutoSummaryDate?: string;
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
      const shopDocRef = doc(db, 'settings', 'shop');
      const shopSnap = await getDoc(shopDocRef);
      
      let shopData: any = {};
      if (shopSnap.exists()) {
        shopData = shopSnap.data();
      }

      // Read isolated telegram credentials from settings/telegram (Restricted to Owner/Manager by firestore.rules)
      let telegramData: Partial<TelegramSettings> = shopData.telegram || {};
      try {
        const tgDocRef = doc(db, 'settings', 'telegram');
        const tgSnap = await getDoc(tgDocRef);
        if (tgSnap.exists()) {
          telegramData = { ...telegramData, ...tgSnap.data() };
        } else if (shopData.telegram && shopData.telegram.botToken) {
          // Self-migration fallback
          await setDoc(tgDocRef, shopData.telegram, { merge: true }).catch(() => {});
        }
      } catch (tgPermErr) {
        // Expected for non-owners/technicians: Firestore rules block them from reading settings/telegram!
        telegramData = {
          enabled: false,
          botToken: '',
          chatId: ''
        };
      }

      const mergedTelegram: TelegramSettings = {
        ...defaultShopSettings.telegram!,
        ...telegramData
      };

      const settings: ShopSettings = {
        ...defaultShopSettings,
        ...shopData,
        telegram: mergedTelegram
      };

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('cached_shop_settings', JSON.stringify(settings));
        } catch {}
      }
      return settings;
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
    const shopDocRef = doc(db, 'settings', 'shop');
    const tgDocRef = doc(db, 'settings', 'telegram');
    const cleanSettings = JSON.parse(JSON.stringify(settings));
    const telegramData = cleanSettings.telegram || defaultShopSettings.telegram;

    // 1. Save sensitive Telegram credentials to settings/telegram (Locked to Owner/Manager)
    await setDoc(tgDocRef, telegramData, { merge: true });

    // 2. Save public shop profile to settings/shop WITHOUT raw secrets
    const sanitizedShopData = {
      ...cleanSettings,
      telegram: {
        enabled: Boolean(telegramData.enabled),
        botToken: '',
        chatId: '',
        notifyOnCustomerCreate: telegramData.notifyOnCustomerCreate ?? true,
        notifyOnSale: telegramData.notifyOnSale ?? true,
        notifyOnPayment: telegramData.notifyOnPayment ?? true,
        notifyOnStatusChange: telegramData.notifyOnStatusChange ?? true,
        notifyOnExpense: telegramData.notifyOnExpense ?? true,
        notifyOnLowStock: telegramData.notifyOnLowStock ?? true,
        notifyOnAttendance: telegramData.notifyOnAttendance ?? true,
        notifyOnSupplier: telegramData.notifyOnSupplier ?? true,
        notifyOnSecurity: telegramData.notifyOnSecurity ?? true,
        notifyOnDailySummary: telegramData.notifyOnDailySummary ?? true,
        notifyOnLoan: telegramData.notifyOnLoan ?? true,
        notifyOnBackup: telegramData.notifyOnBackup ?? true,
      }
    };
    await setDoc(shopDocRef, sanitizedShopData, { merge: true });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cached_shop_settings', JSON.stringify(cleanSettings));
      } catch {}
    }
  }
};


