/**
 * SOLDI onboarding store — persisted via expo-secure-store.
 *
 * Security: No AsyncStorage. The entire serialized state lives under the
 * SecureKey 'soldi-onboarding'. TypeScript SecureKey union prevents arbitrary
 * key writes (T-01-01-01).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';

import { secureGet, secureSet, secureDelete } from '@lib/secure';
import type { SecureKey } from '@lib/secure';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DataSource = 'synthetic' | 'manual' | 'monobank' | 'csv';

export type OnboardingState = {
  /** Selected UI language. Null until user picks on welcome screen. */
  language: 'en' | 'uk' | null;
  /** Selected data ingest source. Null until user picks on data-source screen. */
  dataSource: DataSource | null;
  /** True when the user has completed the full onboarding flow. */
  completed: boolean;

  // Setters
  setLanguage: (lng: 'en' | 'uk') => void;
  setDataSource: (source: DataSource) => void;
  setCompleted: (value: boolean) => void;
  reset: () => void;
};

// ---------------------------------------------------------------------------
// Storage adapter — delegates to expo-secure-store
// ---------------------------------------------------------------------------

/**
 * Zustand StateStorage adapter backed by expo-secure-store.
 * The persist name 'soldi-onboarding' is in the SecureKey union; the cast
 * is safe for the single valid key this store uses.
 */
const secureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return secureGet(name as SecureKey);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await secureSet(name as SecureKey, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await secureDelete(name as SecureKey);
  },
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialState = {
  language: null,
  dataSource: null,
  completed: false,
} as const;

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,

      setLanguage: (lng) => set({ language: lng }),
      setDataSource: (source) => set({ dataSource: source }),
      setCompleted: (value) => set({ completed: value }),
      reset: () => set(initialState),
    }),
    {
      name: 'soldi-onboarding',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
