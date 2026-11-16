import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface SecuritySettings {
  pinHash?: string | null;
  updatedAt?: string;
  updatedBy?: string;
}

const SETTINGS_COLLECTION = 'settings';
const SECURITY_DOC = 'security';

export const securitySettingsService = {
  /**
   * Fetch the stored SHA-256 PIN hash from Firestore settings/security.
   * Only accessible to Manager and Owner per firestore.rules.
   */
  getPinHash: async (): Promise<string | null> => {
    if (!db) return null;
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SECURITY_DOC);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as SecuritySettings;
        return data.pinHash || null;
      }
    } catch (err) {
      // Regular technicians will encounter permission-denied gracefully
      console.warn('Could not read security settings (may be non-owner or offline):', err);
    }
    return null;
  },

  /**
   * Save a SHA-256 hashed PIN to Firestore settings/security.
   */
  savePinHash: async (pinHash: string, userEmail?: string): Promise<void> => {
    if (!db || !pinHash) return;
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SECURITY_DOC);
      await setDoc(
        docRef,
        {
          pinHash,
          updatedAt: new Date().toISOString(),
          updatedBy: userEmail || 'Owner',
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Failed to save security PIN hash to Firestore:', err);
      throw err;
    }
  },

  /**
   * Clear the PIN hash from Firestore settings/security (e.g. on verified PIN reset).
   */
  clearPinHash: async (): Promise<void> => {
    if (!db) return;
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SECURITY_DOC);
      await updateDoc(docRef, {
        pinHash: null,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Could not clear remote PIN hash:', err);
    }
  },
};
