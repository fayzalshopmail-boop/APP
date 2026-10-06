import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface LoyaltyConfig {
  enabled: boolean;
  spendRequiredForOnePoint: number; // e.g. spend 100 tk to get 1 point
  pointValueInTk: number;           // e.g. 1 point = 1 tk discount
}

export const defaultLoyaltyConfig: LoyaltyConfig = {
  enabled: true,
  spendRequiredForOnePoint: 100,
  pointValueInTk: 1,
};

export const loyaltyConfigService = {
  async getSettings(): Promise<LoyaltyConfig> {
    try {
      if (!db) return defaultLoyaltyConfig;
      const docRef = doc(db, 'settings', 'loyalty');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...defaultLoyaltyConfig, ...docSnap.data() } as LoyaltyConfig;
      }
      return defaultLoyaltyConfig;
    } catch (error) {
      console.error("Failed to fetch loyalty settings", error);
      return defaultLoyaltyConfig;
    }
  },
  
  async saveSettings(settings: LoyaltyConfig): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    const docRef = doc(db, 'settings', 'loyalty');
    await setDoc(docRef, settings, { merge: true });
  }
};
