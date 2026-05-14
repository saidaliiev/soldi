/**
 * filterStore — Zustand store holding the active transactions FilterState,
 * persisted via expo-secure-store (CLAUDE.md security rule: no AsyncStorage).
 *
 * Pattern mirrors `src/stores/onboarding.ts` (Phase 1 SecureStore adapter).
 * Hydration is async — the consumer reads `useFilterStore.getState()` lazily
 * via useFocusEffect so the first render after cold start is allowed to be
 * empty for one frame; on hydrate the store re-emits.
 *
 * T-02-03-06 mitigation: on hydrate, the persisted JSON is validated against
 * the expected FilterState shape. Any malformed value falls back to
 * EMPTY_FILTER — never crashes the app.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';

import { secureGet, secureSet, secureDelete } from '@lib/secure';
import type { SecureKey } from '@lib/secure';

import {
  EMPTY_FILTER,
  type FilterAxisKey,
  type FilterSign,
  type FilterState,
} from './types';

// ---------------------------------------------------------------------------
// Storage adapter — delegates to expo-secure-store
// ---------------------------------------------------------------------------

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
// Store API
// ---------------------------------------------------------------------------

export type FilterStoreState = FilterState & {
  readonly setSearch: (q: string) => void;
  readonly setCategoryIds: (ids: readonly number[]) => void;
  readonly setMinCents: (c: number | null) => void;
  readonly setMaxCents: (c: number | null) => void;
  readonly setSign: (s: FilterSign) => void;
  readonly setDateRange: (fromISO: string | null, toISO: string | null) => void;
  readonly removeFilterAxis: (key: FilterAxisKey) => void;
  readonly clearAll: () => void;
  readonly hydrate: (next: FilterState) => void;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useFilterStore = create<FilterStoreState>()(
  persist(
    (set) => ({
      ...EMPTY_FILTER,

      setSearch: (q) => set({ search: q }),
      setCategoryIds: (ids) => set({ categoryIds: [...ids] }),
      setMinCents: (c) => set({ minCents: c }),
      setMaxCents: (c) => set({ maxCents: c }),
      setSign: (s) => set({ sign: s }),
      setDateRange: (fromISO, toISO) => set({ dateFromISO: fromISO, dateToISO: toISO }),

      removeFilterAxis: (key) => {
        switch (key) {
          case 'search':
            set({ search: '' });
            break;
          case 'categories':
            set({ categoryIds: [] });
            break;
          case 'amount':
            set({ minCents: null, maxCents: null });
            break;
          case 'sign':
            set({ sign: 'both' });
            break;
          case 'date':
            set({ dateFromISO: null, dateToISO: null });
            break;
        }
      },

      clearAll: () => set({ ...EMPTY_FILTER }),

      hydrate: (next) => set({ ...next }),
    }),
    {
      name: 'soldi-tx-filter',
      storage: createJSONStorage(() => secureStorage),
      // T-02-03-06: validate shape on rehydrate; fall back to defaults if malformed.
      merge: (persisted, current) => {
        const safe = validateFilterShape(persisted);
        if (safe === null) return current;
        return { ...current, ...safe };
      },
      partialize: (state) => ({
        search: state.search,
        categoryIds: state.categoryIds,
        minCents: state.minCents,
        maxCents: state.maxCents,
        sign: state.sign,
        dateFromISO: state.dateFromISO,
        dateToISO: state.dateToISO,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
// validateFilterShape — defensive
// ---------------------------------------------------------------------------

function validateFilterShape(input: unknown): FilterState | null {
  if (input === null || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;

  if (typeof o['search'] !== 'string') return null;
  if (!Array.isArray(o['categoryIds'])) return null;
  if (!(o['categoryIds'] as unknown[]).every((v) => typeof v === 'number')) return null;
  if (o['minCents'] !== null && typeof o['minCents'] !== 'number') return null;
  if (o['maxCents'] !== null && typeof o['maxCents'] !== 'number') return null;
  if (o['sign'] !== 'expense' && o['sign'] !== 'income' && o['sign'] !== 'both') return null;
  if (o['dateFromISO'] !== null && typeof o['dateFromISO'] !== 'string') return null;
  if (o['dateToISO'] !== null && typeof o['dateToISO'] !== 'string') return null;

  return {
    search: o['search'] as string,
    categoryIds: o['categoryIds'] as number[],
    minCents: o['minCents'] as number | null,
    maxCents: o['maxCents'] as number | null,
    sign: o['sign'] as FilterSign,
    dateFromISO: o['dateFromISO'] as string | null,
    dateToISO: o['dateToISO'] as string | null,
  };
}
