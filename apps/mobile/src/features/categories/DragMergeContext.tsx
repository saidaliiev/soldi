/**
 * DragMergeContext — React Context that coordinates drag-to-merge state
 * across the CategoriesScreen list (D-19). The provider is mounted at the
 * CategoriesScreen root so individual CategoryListRow components can publish
 * dragging/drop-target ids and trigger the merge confirm flow.
 */

import React from 'react';

type Ctx = {
  readonly draggingId: number | null;
  readonly dropTargetId: number | null;
  readonly setDraggingId: (id: number | null) => void;
  readonly setDropTargetId: (id: number | null) => void;
  /** Caller invokes this on drop release to surface the merge-confirm modal. */
  readonly onDrop: (fromId: number, toId: number) => void;
};

const DragMergeContext = React.createContext<Ctx | null>(null);

type ProviderProps = {
  readonly onMergeRequest: (fromId: number, toId: number) => void;
  readonly children: React.ReactNode;
};

export function DragMergeProvider({ onMergeRequest, children }: ProviderProps): React.JSX.Element {
  const [draggingId, setDraggingId] = React.useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = React.useState<number | null>(null);

  const onDrop = React.useCallback(
    (fromId: number, toId: number) => {
      if (fromId !== toId) {
        onMergeRequest(fromId, toId);
      }
      setDraggingId(null);
      setDropTargetId(null);
    },
    [onMergeRequest],
  );

  const value = React.useMemo<Ctx>(
    () => ({
      draggingId,
      dropTargetId,
      setDraggingId,
      setDropTargetId,
      onDrop,
    }),
    [draggingId, dropTargetId, onDrop],
  );

  return <DragMergeContext.Provider value={value}>{children}</DragMergeContext.Provider>;
}

export function useDragMerge(): Ctx {
  const ctx = React.useContext(DragMergeContext);
  if (ctx == null) {
    throw new Error('useDragMerge must be used inside DragMergeProvider');
  }
  return ctx;
}
