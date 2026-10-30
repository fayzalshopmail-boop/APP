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

  // Notification Navigation Targets
  highlightCustomerId: string | null;
  setHighlightCustomerId: (id: string | null) => void;
  highlightCustomerSearch: string | null;
  setHighlightCustomerSearch: (term: string | null) => void;
  highlightInventorySearch: string | null;
  setHighlightInventorySearch: (term: string | null) => void;

  // Dashboard Filters
  dashboardTimeFilter: 'Today' | 'This Week' | 'This Month' | 'This Year' | 'All Time';
  setDashboardTimeFilter: (filter: 'Today' | 'This Week' | 'This Month' | 'This Year' | 'All Time') => void;

  // Mobile Bottom More Menu Drawer
  isMoreMenuOpen: boolean;
  setIsMoreMenuOpen: (isOpen: boolean) => void;
  toggleMoreMenu: () => void;

  // Internationalization (Bilingual: 'bn' | 'en')
  language: 'bn' | 'en';
  setLanguage: (language: 'bn' | 'en') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      language: 'bn',
      setLanguage: (language) => set({ language }),

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

      highlightCustomerId: null,
      setHighlightCustomerId: (highlightCustomerId) => set({ highlightCustomerId }),
      highlightCustomerSearch: null,
      setHighlightCustomerSearch: (highlightCustomerSearch) => set({ highlightCustomerSearch }),
      highlightInventorySearch: null,
      setHighlightInventorySearch: (highlightInventorySearch) => set({ highlightInventorySearch }),

      dashboardTimeFilter: 'This Week',
      setDashboardTimeFilter: (dashboardTimeFilter) => set({ dashboardTimeFilter }),

      isMoreMenuOpen: false,
      setIsMoreMenuOpen: (isMoreMenuOpen) => set({ isMoreMenuOpen }),
      toggleMoreMenu: () => set((state) => ({ isMoreMenuOpen: !state.isMoreMenuOpen })),

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
          ...(persistedState as any),
          isUnlocked: state?.isUnlocked ?? false,
          deviceBrands: migratedBrands,
          deviceProblems: migratedProblems,
          language: (state?.language === 'en' || state?.language === 'bn') ? state.language : (state?.shop?.language || 'bn')
        };
      },
      partialize: (state) => ({ 
        user: state.user,
        shop: state.shop,
        pin: state.pin,
        isUnlocked: state.isUnlocked,
        deviceBrands: state.deviceBrands,
        deviceTypes: state.deviceTypes,
        deviceProblems: state.deviceProblems,
        language: state.language
      }),
    }
  )
);
