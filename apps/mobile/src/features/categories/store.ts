/**
 * Category editor sheet store — drives the globally-mounted
 * CategoryEditorBottomSheet from any tab (dashboard long-press, categories tab
 * row tap, + button). Same Zustand+secureStorage pattern as the onboarding
 * store from Phase 1 (but ephemeral — no persistence needed).
 *
 * Mode is determined by `targetId`: undefined = create, number = edit.
 */

import { create } from 'zustand';

type State = {
  readonly open: boolean;
  readonly targetId: number | undefined;
  readonly openForEdit: (id: number) => void;
  readonly openForCreate: () => void;
  readonly close: () => void;
};

export const useCategoryEditorStore = create<State>((set) => ({
  open: false,
  targetId: undefined,
  openForEdit: (id: number) => set({ open: true, targetId: id }),
  openForCreate: () => set({ open: true, targetId: undefined }),
  close: () => set({ open: false, targetId: undefined }),
}));
