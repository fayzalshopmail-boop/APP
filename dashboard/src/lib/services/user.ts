import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, limit, where } from 'firebase/firestore';
import { db } from '../firebase';

export type UserRole = 'Owner' | 'Manager' | 'Technician';

export interface AppUser {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  phone?: string;
  baseSalary?: number;
  joiningDate?: string;
  createdAt: unknown;
}

const COLLECTION_NAME = 'users';

export const userService = {
  /**
   * Fetch a user by their Email (used to check if they are authorized)
   */
  getUserByEmail: async (email: string): Promise<AppUser | null> => {
    if (!db) return null;
    const q = query(collection(db, COLLECTION_NAME), where('email', '==', email), limit(1));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as AppUser;
    }
    return null;
  },

  /**
   * Check if this is the very first user logging into the app
   */
  isFirstUser: async (): Promise<boolean> => {
    if (!db) return false;
    const q = query(collection(db, COLLECTION_NAME), limit(1));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  },

  /**
   * Create the first Owner account
   */
  createOwner: async (email: string, name: string, avatar: string): Promise<AppUser> => {
    if (!db) throw new Error('Database not connected');
    
    const newUser: AppUser = {
      email,
      name,
      role: 'Owner',
      avatar,
      isActive: true,
      createdAt: serverTimestamp(),
    };
    
    // Use email as the document ID for easy lookup
    await setDoc(doc(db, COLLECTION_NAME, email), newUser);
    return { id: email, ...newUser };
  },

  /**
   * Pre-authorize a staff member (Admin only)
   */
  addStaff: async (email: string, name: string, role: UserRole): Promise<AppUser> => {
    if (!db) throw new Error('Database not connected');
    
    const newUser: AppUser = {
      email,
      name,
      role,
      avatar: '',
      isActive: true,
      createdAt: serverTimestamp(),
    };
    
    await setDoc(doc(db, COLLECTION_NAME, email), newUser);
    return { id: email, ...newUser };
  },

  /**
   * Get all authorized users (Admin only)
   */
  getAllUsers: async (): Promise<AppUser[]> => {
    if (!db) return [];
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
  },

  /**
   * Update user access/role (Admin only)
   */
  updateUser: async (email: string, data: Partial<AppUser>) => {
    if (!db) return;
    const docRef = doc(db, COLLECTION_NAME, email);
    await updateDoc(docRef, data);
  },

  /**
   * Permanently delete a staff member (Admin only)
   * Also safely removes associated salaryConfigs to prevent orphaned records
   */
  deleteUser: async (email: string) => {
    if (!db || !email) return;
    const normalizedEmail = email.toLowerCase().trim();

    // Delete user document
    const docRef = doc(db, COLLECTION_NAME, normalizedEmail);
    await deleteDoc(docRef);

    // If original email differed from lowercase, also clean up the unnormalized doc if present
    if (email !== normalizedEmail) {
      try {
        await deleteDoc(doc(db, COLLECTION_NAME, email));
      } catch {}
    }

    // Clean up salary config from salaryConfigs collection
    try {
      await deleteDoc(doc(db, 'salaryConfigs', normalizedEmail));
      if (email !== normalizedEmail) {
        await deleteDoc(doc(db, 'salaryConfigs', email));
      }
    } catch (err) {
      console.warn('Failed to clean up staff salary config during user deletion:', err);
    }
  }
};
