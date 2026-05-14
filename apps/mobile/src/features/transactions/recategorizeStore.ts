/**
 * Recategorize sheet store — drives the globally-mounted
 * RecategorizeBottomSheet from any surface that wants to reassign a
 * transaction's category (swipe-left action, detail screen's category cell).
 *
 * Mirror of `src/features/categories/store.ts` (CategoryEditorBottomSheet
 * pattern). Ephemeral state — no persistence.
 */

import { create } from 'zustand';

type State = {
  readonly open: boolean;
  /** Currently-targeted transaction id; null when sheet is closed. */
  readonly targetTxId: number | null;
  /** Optional callback fired after the user picks a new category. */
  readonly onPicked: ((categoryId: number) => void) | null;
  readonly openFor: (txId: number, onPicked?: (categoryId: number) => void) => void;
  readonly close: () => void;
};

export const useRecategorizeStore = create<State>((set) => ({
  open: false,
  targetTxId: null,
  onPicked: null,
  openFor: (txId, onPicked) =>
    set({ open: true, targetTxId: txId, onPicked: onPicked ?? null }),
  close: () => set({ open: false, targetTxId: null, onPicked: null }),
}));
