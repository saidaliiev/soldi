/**
 * Jar create sheet store — drives JarCreateBottomSheet.
 *
 * Mirrors recategorizeStore idiom (Zustand open/close, ephemeral).
 * onRefresh callback lets JarListScreen know when to re-query listJars()
 * after a successful create (mirrors recategorizeStore.onPicked).
 */

import { create } from 'zustand';

type State = {
  readonly open: boolean;
  /** Optional callback fired after a jar is successfully created. */
  readonly onRefresh: (() => void) | null;
  readonly openCreate: (onRefresh?: () => void) => void;
  readonly close: () => void;
};

export const useJarCreateStore = create<State>((set) => ({
  open: false,
  onRefresh: null,
  openCreate: (onRefresh) => set({ open: true, onRefresh: onRefresh ?? null }),
  close: () => set({ open: false, onRefresh: null }),
}));
