import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface DropdownSettings {
  deviceTypes: string[];
  deviceBrands: Record<string, string[]>;
  deviceProblems: Record<string, string[]>;
}

export const defaultDropdownSettings: DropdownSettings = {
  deviceTypes: ['LED TV', 'LCD TV', 'Smart TV', 'Android TV', 'Monitor'],
  deviceBrands: {},
  deviceProblems: {},
};

export const dropdownConfigService = {
  async getSettings(): Promise<DropdownSettings> {
    try {
      if (!db) return defaultDropdownSettings;
      const docRef = doc(db, 'settings', 'dropdowns');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          deviceTypes: Array.isArray(data.deviceTypes) ? data.deviceTypes : defaultDropdownSettings.deviceTypes,
          deviceBrands: typeof data.deviceBrands === 'object' && !Array.isArray(data.deviceBrands) ? data.deviceBrands : {},
          deviceProblems: typeof data.deviceProblems === 'object' && !Array.isArray(data.deviceProblems) ? data.deviceProblems : {},
        };
      }
      return defaultDropdownSettings;
    } catch (error) {
      console.error('Failed to fetch dropdown settings', error);
      return defaultDropdownSettings;
    }
  },
  
  async saveSettings(settings: DropdownSettings): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    const docRef = doc(db, 'settings', 'dropdowns');
    await setDoc(docRef, settings);
  },

  subscribe(callback: (settings: DropdownSettings) => void): () => void {
    if (!db) return () => {};
    const docRef = doc(db, 'settings', 'dropdowns');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback({
          deviceTypes: Array.isArray(data.deviceTypes) ? data.deviceTypes : defaultDropdownSettings.deviceTypes,
          deviceBrands: typeof data.deviceBrands === 'object' && !Array.isArray(data.deviceBrands) ? data.deviceBrands : {},
          deviceProblems: typeof data.deviceProblems === 'object' && !Array.isArray(data.deviceProblems) ? data.deviceProblems : {},
        });
      }
    });
  }
};

