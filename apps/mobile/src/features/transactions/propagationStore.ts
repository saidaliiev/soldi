/**
 * Propagation toast store — drives the globally-mounted PropagationToast
 * after a user correction propagates to similar merchant transactions.
 *
 * Ephemeral — toast is transient. No persistence. State clears when the toast
 * auto-dismisses or the user taps Undo.
 *
 * Phase 3 / 03-02 — CAT-04 user-feedback surface.
 */

import { create } from 'zustand';

type State = {
  readonly visible: boolean;
  readonly count: number;
  readonly rollback: (() => void) | null;
  /** Monotonically increases on every openWith — drives toast reset / re-trigger. */
  readonly nonce: number;
  readonly openWith: (count: number, rollback: () => void) => void;
  readonly dismiss: () => void;
};

export const usePropagationStore = create<State>((set, get) => ({
  visible: false,
  count: 0,
  rollback: null,
  nonce: 0,
  openWith: (count, rollback) =>
    set({ visible: true, count, rollback, nonce: get().nonce + 1 }),
  dismiss: () => set({ visible: false, count: 0, rollback: null }),
}));
