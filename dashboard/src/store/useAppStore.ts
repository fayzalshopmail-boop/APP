import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dropdownConfigService } from '@/lib/services/dropdownConfig';
import { ShopSettings, defaultShopSettings } from '@/lib/services/shopSettings';

interface User {
  name: string;
  role: string;
  avatar: string;
  email?: string;
}

interface AppState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  
  shop: ShopSettings;
  setShop: (shop: ShopSettings) => void;

  // Auth & Security
  pin: string | null;
  setPin: (pin: string | null) => void;
  isUnlocked: boolean;
  setUnlocked: (status: boolean) => void;
  
  // Manageable Options
  deviceTypes: string[];
  deviceBrands: Record<string, string[]>;
  deviceProblems: Record<string, string[]>;
  addOption: (category: 'deviceTypes' | 'deviceBrands' | 'deviceProblems', value: string, parentKey?: string) => void;
  removeOption: (category: 'deviceTypes' | 'deviceBrands' | 'deviceProblems', value: string, parentKey?: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isSidebarOpen: false, // Default to false so it's hidden on mobile
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
      user: null, // Start unauthenticated
      setUser: (user) => set({ user }),
      
      shop: defaultShopSettings,
      setShop: (shop) => set({ shop }),

      pin: null,
      setPin: (pin) => set({ pin }),
      isUnlocked: false,
      setUnlocked: (status) => set({ isUnlocked: status }),

      // Default Options
      deviceTypes: ['LED TV', 'LCD TV', 'Smart TV', 'Android TV', 'Monitor'],
      deviceBrands: {}, // Will be populated dynamically per type
      deviceProblems: {},

      addOption: async (category, value, parentKey) => {
        set((state) => {
          if (category === 'deviceTypes') {
            return { deviceTypes: Array.from(new Set([...state.deviceTypes, value])) };
          }
          if (!parentKey) return state; // parentKey is required for brands and problems
          const currentList = state[category][parentKey] || [];
          return {
            [category]: {
              ...state[category],
              [parentKey]: Array.from(new Set([...currentList, value]))
            }
          };
        });
        
        const currentState = get();
        await dropdownConfigService.saveSettings({
          deviceTypes: currentState.deviceTypes,
          deviceBrands: currentState.deviceBrands,
          deviceProblems: currentState.deviceProblems,
        });
      },
      
      removeOption: async (category, value, parentKey) => {
        set((state) => {
          if (category === 'deviceTypes') {
            return { deviceTypes: state.deviceTypes.filter(opt => opt !== value) };
          }
          if (!parentKey) return state;
          const currentList = state[category][parentKey] || [];
          return {
            [category]: {
              ...state[category],
              [parentKey]: currentList.filter(opt => opt !== value)
            }
          };
        });
        
        const currentState = get();
        await dropdownConfigService.saveSettings({
          deviceTypes: currentState.deviceTypes,
          deviceBrands: currentState.deviceBrands,
          deviceProblems: currentState.deviceProblems,
        });
      },
    }),
    {
      name: 'pos-settings-storage',
      merge: (persistedState: unknown, currentState) => {
        const state = persistedState as Partial<AppState>;
        // Migration from string[] to Record<string, string[]>
        const migratedBrands = Array.isArray(state?.deviceBrands) ? {} : state?.deviceBrands || {};
        const migratedProblems = Array.isArray(state?.deviceProblems) ? {} : state?.deviceProblems || {};
        
        return {
          ...currentState,
          ...persistedState,
          deviceBrands: migratedBrands,
          deviceProblems: migratedProblems
        };
      },
      partialize: (state) => ({ 
        user: state.user,
        shop: state.shop,
        pin: state.pin,
        isUnlocked: state.isUnlocked,
        deviceBrands: state.deviceBrands,
        deviceTypes: state.deviceTypes,
        deviceProblems: state.deviceProblems
      }),
    }
  )
);
