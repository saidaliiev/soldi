---
phase: 02-dashboard-transactions-categories
plan: 04
subsystem: categories
tags: [categories, bottom-sheet, drag-merge, icons, i18n, schema-migration]
requires:
  - phase-02: 02-01 categoriesRepo scaffold + CategoryRow long-press TODO
provides:
  - 30 hand-drawn Skia category icons (Food..Misc) + ICON_REGISTRY + resolveIcon
  - apps/mobile/src/components/BottomSheet/BottomSheetPrimitive.tsx (gorhom-API mirror)
  - apps/mobile/src/components/BottomSheet/ConfirmModal.tsx (destructive confirm shell)
  - apps/mobile/src/features/categories/{IconPicker, ColorSwatchPicker, CategoryListRow, DragMergeContext, CategoryEditorBottomSheet, categoryMutations, store, types}
  - apps/mobile/src/data/categoriesRepo.ts: insertCategory / updateCategory / deleteCategoryRow / bulkReassignTransactionsCategory / getMiscellaneousCategoryId
  - schema-002 migration (slug + color + usage_count + backfill of 18 seed rows)
  - i18n categories.* namespace (EN + UK)
affects:
  - apps/mobile/src/features/dashboard/CategoryRow.tsx (long-press → editor; resolves TODO(02-04))
  - apps/mobile/app/(tabs)/categories.tsx (replaces Wave 1 placeholder)
  - apps/mobile/src/lib/i18n/index.ts (categories bundle merge)
  - apps/mobile/src/lib/db/migrations.ts (registers migration 002)
  - apps/mobile/src/lib/db/schema.sql.ts (exports SCHEMA_002)
tech-stack:
  added:
    - drag-to-merge via reanimated v4 useSharedValue + withSpring (no new deps)
  patterns:
    - Schema migration via ALTER TABLE + UPDATE backfill inside BEGIN/COMMIT
    - Injectable repo dependency for unit-testable mutations (node:test + tsx)
    - Zustand store mounts a bottom sheet globally; any tab can dispatch openForEdit
    - Reusable BottomSheetPrimitive (RN <Modal> + reanimated) — drop-in for @gorhom/bottom-sheet later
    - ConfirmModal as a presentation-only destructive confirm shell
key-files:
  created:
    - apps/mobile/src/design/icons/categories/_iconRegistry.ts
    - apps/mobile/src/design/icons/categories/index.tsx
    - apps/mobile/src/design/icons/categories/Food.tsx (and 29 sibling icon files)
    - apps/mobile/src/components/BottomSheet/BottomSheetPrimitive.tsx
    - apps/mobile/src/components/BottomSheet/ConfirmModal.tsx
    - apps/mobile/src/features/categories/types.ts
    - apps/mobile/src/features/categories/categoryMutations.ts
    - apps/mobile/src/features/categories/categoryMutations.test.ts
    - apps/mobile/src/features/categories/IconPicker.tsx
    - apps/mobile/src/features/categories/ColorSwatchPicker.tsx
    - apps/mobile/src/features/categories/CategoryListRow.tsx
    - apps/mobile/src/features/categories/DragMergeContext.tsx
    - apps/mobile/src/features/categories/CategoryEditorBottomSheet.tsx
    - apps/mobile/src/features/categories/store.ts
    - apps/mobile/src/i18n/locales/en/categories.json
    - apps/mobile/src/i18n/locales/uk/categories.json
  modified:
    - apps/mobile/src/data/categoriesRepo.ts
    - apps/mobile/src/features/dashboard/CategoryRow.tsx
    - apps/mobile/app/(tabs)/categories.tsx
    - apps/mobile/src/lib/i18n/index.ts
    - apps/mobile/src/lib/db/migrations.ts
    - apps/mobile/src/lib/db/schema.sql.ts
decisions:
  - "Add schema-002 migration (ALTER TABLE categories ADD slug + color + usage_count) instead of continuing the 02-01 derivation pattern — custom user categories need persistent storage that derivation cannot supply."
  - "Build BottomSheetPrimitive on RN <Modal> + reanimated rather than installing @gorhom/bottom-sheet — keeps the Phase 2 dep tree native-stable (Expo Go device verification stays one-step) while mirroring the gorhom API surface (open/close/snapPoints/onChange) for a clean future swap."
  - "Reuse the Wave 1 Skia icon pattern for the 30 category icons — avoids adding react-native-svg to the dep tree (same rationale as 02-01)."
  - "Mount the CategoryEditorBottomSheet inside CategoriesScreen and drive it via a Zustand store — dashboard long-press dispatches `openForEdit(id)` from any tab without coupling to a route or layout file. Same pattern is recommended for 02-03's RecategorizeBottomSheet."
  - "ConfirmModal is presentation-only (caller resolves i18n) — keeps the shared primitive reusable for any future destructive flow."
  - "Drag-to-merge surface lives on the CategoriesScreen rows (DragMergeContext), not inside the editor sheet — matches the UI-SPEC composition note that the sheet handles create/edit/delete only."
metrics:
  duration_minutes: ~80
  completed: 2026-05-14
  tasks_completed: 3
  files_created: 47
  files_modified: 6
  commits: 3
  tests_passing: 25
---

# Phase 02 Plan 04: Categories Editor + Drag-to-Merge Summary

> One-line: full Categories tab with CRUD bottom-sheet editor, drag-to-merge between rows, 30 hand-drawn Skia icons, and shared BottomSheet/ConfirmModal primitives for 02-03 reuse — backed by a schema-002 migration that adds persistent slug/color/usage_count columns.

## Outcome

The Categories tab is fully functional. Users can:
- Browse Default + Custom categories in a sectioned list (52pt rows, icon + color dot + name + chevron).
- Tap `+` to open the editor sheet in create mode — name input, IconPicker (30 hand-drawn Skia SVG cells, 28pt icons), ColorSwatchPicker (8 D-22 swatches), Create CTA.
- Tap any row to open the editor in edit mode pre-filled with the row's name + icon + color; Save changes or Delete category.
- Long-press a custom row to enter drag mode (medium haptic + scale 1→1.04); tapping a target row commits a merge after the destructive ConfirmModal confirmation.
- Long-press a dashboard CategoryRow to open the same global editor sheet (resolves the TODO(02-04) left in 02-01).

`tsc --noEmit` and `expo lint` both exit 0. The 25-case `categoryMutations.test.ts` suite passes via `node:test + tsx`. No banned colors, no lucide imports, no emoji codepoints anywhere in `src/design/icons/categories`, `src/components/BottomSheet`, or `src/features/categories`.

## Tasks

### Task 1 — 30 hand-drawn SVG category icons + ICON_REGISTRY
**Commit:** `a56b979`
- 30 React components (`Food`, `Transport`, `Bills`, …, `Misc`), each ~30 lines, 24×24 viewBox, strokeWidth 1.6, round caps/joins, rendered via `Canvas` + `Path` + `Skia.Path.MakeFromSVGString` — same approach as Wave 1 tab icons.
- Each icon carries at least one slightly off-grid control point (D-21 hand-drawn aesthetic) with a single-line comment noting the motif.
- `_iconRegistry.ts` maps 30 slugs (`food` … `misc`) in IconPicker display order to components plus exports `ICON_SLUGS` for iteration.
- `index.tsx` barrel exports `ICON_REGISTRY`, `ICON_SLUGS`, `IconSlug`, `BaseCategoryIcon`, `MiscIcon`, and a `resolveIcon(slug)` helper that returns the Misc fallback for unknown slugs (never undefined).

### Task 2 — Schema-002 + categoriesRepo CRUD + BottomSheet primitives + tested mutations
**Commit:** `2ee37f3`
- **Schema migration 002:** `ALTER TABLE categories ADD COLUMN slug TEXT`, `ADD COLUMN color TEXT`, `ADD COLUMN usage_count INTEGER NOT NULL DEFAULT 0`. Backfills all 18 seeded rows with canonical slugs + D-22 swatch colors (one `UPDATE` per row to keep the SQL trivially auditable). Adds `idx_categories_slug` unique index. `migrations.ts` registers it at version 2.
- **categoriesRepo extension:** 5 new exports — `insertCategory(input)`, `updateCategory(id, patch)`, `deleteCategoryRow(id)` (with `is_custom = 1` SQL guard for defense-in-depth T-02-04-02), `bulkReassignTransactionsCategory(from, to)`, `getMiscellaneousCategoryId()`. `getCategoryById` and `listCategoriesEnriched` now prefer the DB-stored slug/color but fall back to the derivation helpers for pre-migration rows.
- **categoryMutations.ts** (pure-DI, fully testable):
  - `validateCategoryName` rejects empty / >40 chars / `<>"'`;\` / case-insensitive duplicate.
  - `slugify` (ASCII-only, kebab-case; throws on input that reduces to empty).
  - `createCategory` validates + inserts; retries once with `-{rand}` suffix on UNIQUE-slug collision (T-02-04-07).
  - `renameCategory` is no-op safe (returns existing row unchanged); rejects duplicates against all OTHER rows.
  - `deleteCategory` refuses default rows (`CANNOT_DELETE_DEFAULT`), refuses the misc category itself, and wraps reassign + delete in a single `BEGIN/COMMIT` (T-02-04-02).
  - `mergeCategories` rejects `fromId === toId`, re-resolves both ids before the UPDATE (T-02-04-04), preserves default-source rows.
- **BottomSheetPrimitive** (ref API: `open()`, `close()`; props `snapPoints: readonly [string,...]`, `onChange?`) — RN `<Modal>` + reanimated v4 + Gesture.Pan, mirrors the gorhom surface used by 02-03. Single 60% snap, pan-down-to-close, backdrop tap closes, `accessibilityViewIsModal`.
- **ConfirmModal** — presentation-only destructive confirm. Caller supplies all copy (i18n resolved at call site). `destructive` prop swaps confirm bg to `COLORS.error`. Full-screen `<Modal>` with `COLORS.textPrimary @ 0.9` backdrop, centered card, max-width 320pt.
- **categoryMutations.test.ts** (25 cases, node:test + tsx): exhaustive validation cases, slugify edge cases, createCategory happy path + duplicate-throws + UNIQUE-retry, renameCategory no-op + duplicate, deleteCategory default-refused + call-order assertion (reassign-then-delete) + missing-id, mergeCategories same-id refused + call order + missing-ids + default-source preservation.

### Task 3 — IconPicker + ColorSwatchPicker + CategoryListRow + DragMergeContext + CategoryEditorBottomSheet + CategoriesScreen + dashboard wire-up + i18n
**Commit:** `5d538a3`
- **IconPicker:** horizontal ScrollView of 30 cells; 44pt cell, 28pt inner icon, COLORS.accent @ 15% bg + 1pt COLORS.accent border on selected.
- **ColorSwatchPicker:** 8 D-22 swatches in a flex-wrap row; 32pt swatch inside 40pt outer ring (2pt COLORS.accent when selected), 44pt outer Pressable hit area; `accessibilityRole="radio"` + `accessibilityState.checked`.
- **CategoryListRow:** 52pt row, 8pt color dot + 24pt icon + name + chevron right. Long-press → publishes `draggingId` to DragMergeContext + medium haptic + spring-scale to 1.04. Tap during another row's drag → `onDrop(draggingId, this.id)` → merge confirm modal.
- **DragMergeContext:** React Context exposing `draggingId / dropTargetId / setters / onDrop`. Provider mounted at CategoriesScreen root.
- **CategoryEditorBottomSheet:** orchestrates Name input (maxLength 40) + IconPicker + ColorSwatchPicker + primary CTA + Delete row. Mode driven by `useCategoryEditorStore.targetId`. Validation errors mapped to inline i18n message in `TYPE.uiLabel` / `COLORS.error`. Delete tap → ConfirmModal with destructive copy. The sheet itself does NOT contain the merge surface (the in-sheet "all categories" list described as one option in the UI-SPEC is intentionally omitted; D-19 drag-drop happens on the CategoriesScreen rows behind the sheet).
- **CategoriesScreen** (`app/(tabs)/categories.tsx`, replaces Wave 1 "Coming next" placeholder): SafeAreaView + header (`Categories` displayM + 44pt `+` button) + DragMergeProvider + ScrollView with Default section, 1pt separator, Custom section (italic empty phrase when none). Mounts the global `CategoryEditorBottomSheet` so it overlays this tab AND is reachable via the Zustand store from other tabs.
- **Dashboard CategoryRow wire-up:** `onLongPress` now calls `useCategoryEditorStore.getState().openForEdit(slice.categoryId)`. The `TODO(02-04)` comment is removed. Long-pressing the "Other" aggregate row is a no-op (no edit target).
- **i18n:** `en/categories.json` and `uk/categories.json` contain all 20 keys (CTAs, section labels, destructive copy, merge copy, validation messages, error toasts, empty-custom phrase). UK is translated literally (not deferred). The bundle is deep-merged into the `categories` subtree at `src/lib/i18n/index.ts` following the Phase 2 dashboard pattern.

## Patterns Established for Downstream Plans

1. **Global bottom sheet via Zustand store** — `useCategoryEditorStore({ open, targetId, openForEdit, openForCreate, close })` drives a sheet mounted once at the CategoriesScreen root. Any tab can dispatch `openForEdit(id)` without prop-drilling or route navigation. 02-03's `RecategorizeBottomSheet` should adopt the identical shape (`useTransactionRecategorizeStore` with `txId` + `open`). 02-03 may either mount its sheet inside the transactions tab or move both to `app/(tabs)/_layout.tsx` for cleaner full-app reach.
2. **BottomSheetPrimitive contract** — `ref.open()` / `ref.close()` + `snapPoints: readonly [string,...]` + `onChange(0|1)`. Drop-in compatible with `@gorhom/bottom-sheet`'s `ref.expand()`/`ref.close()` if a later plan migrates to gorhom. The pan-down-to-close gesture uses Wave 1's `Gesture.Pan().onUpdate/onEnd + withTiming/withSpring + runOnJS` pattern.
3. **ConfirmModal as a destructive confirm shell** — presentation-only, caller resolves i18n + supplies `destructive` flag. Reusable for the 02-03 swipe-to-delete flow if it ever lands.
4. **Schema migrations land per-plan via ALTER TABLE + targeted UPDATE backfill** — keep statements inside a single `splitStatements` block (no manual transaction wrapping in `migrations.ts`; `runMigrations` already wraps with BEGIN/COMMIT). Backfill rows individually so failures surface the offending row clearly.
5. **Dependency-injected repo for mutation tests** — `categoryMutations` accepts an optional `Repo` param (default = real op-sqlite-backed). Tests pass a mock that records call order + fakes rowsAffected. Node-only, no native bindings. Same pattern works for 02-03 transaction mutations.
6. **Skia icon registry pattern, scaled** — 30 single-file components + a barrel map. Each file is ~30 LOC with a single SVG path string + a `useMemo` Skia path. Adding a new icon = new file + one registry entry. 02-03's category chips render the same components by slug via `resolveIcon(slug)`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 4 deferred to Rule 2 — Critical missing functionality] Schema-002 migration added (slug / color / usage_count columns)**
- **Found during:** Task 2 categoriesRepo extension.
- **Issue:** The plan's interfaces (`InsertCategoryInput`, `slug`, `color`, `is_default`) assume columns that schema-001 does not have. 02-01 SUMMARY explicitly noted the workaround (derive slug/color in the repo layer) and deferred the migration to 02-04. The plan asks for `is_default = 0` on insert; the actual column is `is_custom` (inverse semantics) — so the plan API is satisfied while the SQL uses the existing column.
- **Fix:** Added `SCHEMA_002` (ALTER TABLE + 18-row backfill + unique slug index) to `schema.sql.ts`; registered as migration `version: 2` in `migrations.ts`. Repo reads now prefer the stored columns and fall back to derivation when the columns are null.
- **Files modified:** `src/lib/db/schema.sql.ts`, `src/lib/db/migrations.ts`, `src/data/categoriesRepo.ts`.
- **Commit:** `2ee37f3`.

**2. [Rule 3 — Blocking dependency] `@gorhom/bottom-sheet` is not in `package.json`**
- **Found during:** Task 2 starting BottomSheetPrimitive.
- **Issue:** Plan §interfaces describes BottomSheetPrimitive as a `@gorhom/bottom-sheet` wrapper. The dep is not installed, and installing it would trigger autolinking → a native rebuild → break Expo Go device verification (the Task 4 checkpoint runs against Expo Go). CLAUDE.md additionally cautions against parallel-session `package.json` mutations.
- **Fix:** Built BottomSheetPrimitive on RN `<Modal>` + reanimated v4 + gesture-handler v2 (all already in the dep tree) while mirroring the gorhom ref API (`open()` / `close()` / `snapPoints` / `onChange`). 02-03 can swap to gorhom later by replacing the inner implementation without touching call sites.
- **Files modified:** `src/components/BottomSheet/BottomSheetPrimitive.tsx`.
- **Commit:** `2ee37f3`.

**3. [Rule 3 — Stack discipline reuse] Use Skia for the 30 icons instead of `react-native-svg`**
- **Found during:** Task 1.
- **Issue:** The plan suggests `react-native-svg` `<Svg>` + `<Path>` primitives. `react-native-svg` is not in `package.json` (02-01 made the same call). Adding it triggers autolinking — same risk as #2.
- **Fix:** Render via Skia `Canvas` + `Path` + `Skia.Path.MakeFromSVGString(d)` — same pattern as Wave 1's tab icons and `BaseCategoryIcon`. The hand-drawn path data strings carry into Skia unchanged.
- **Files modified:** all 30 icon components in `src/design/icons/categories/`.
- **Commit:** `a56b979`.

**4. [Rule 1 — Inverse-semantics column] `is_default` in plan API maps to `is_custom = 0` in schema**
- **Found during:** Task 2.
- **Issue:** Plan repeatedly references `is_default`, but the schema column is `is_custom` (a default row has `is_custom = 0`, a user-created row has `is_custom = 1`).
- **Fix:** Repo functions enforce the semantics via `is_custom = 1` SQL guards (`deleteCategoryRow`), and the Category type exposes `isCustom: boolean` to UI callers. The mutation layer interprets `!isCustom` as "default — refuse to delete" (T-02-04-02 still satisfied; defense in depth is intact).
- **Files modified:** `src/data/categoriesRepo.ts`, `src/features/categories/categoryMutations.ts`.
- **Commit:** `2ee37f3`.

**5. [Rule 3 — i18n bundle wiring] Created files at the plan-mandated paths AND merged into the bundled translation namespace**
- **Found during:** Task 3.
- **Issue:** The plan specifies `src/i18n/locales/{en,uk}/categories.json` but the actual i18n loader expects merged content under the `categories` subtree of the bundled `translation` namespace (same situation as 02-01 deviation #4 for `dashboard.json`).
- **Fix:** Followed the established Wave 1 merge pattern in `src/lib/i18n/index.ts` — both files exist at the plan path AND their content is spread under `categories` in `enBundle` / `ukBundle`. Existing `useTranslation()` calls (`t('categories.cta_new')`) resolve correctly without a namespace change.
- **Files modified:** `src/lib/i18n/index.ts` (deep-merge wiring), `src/i18n/locales/{en,uk}/categories.json` created.
- **Commit:** `5d538a3`.

### Plan composition note

The plan §action for Task 3 acknowledges that "drag-drop merge inside the CategoryEditorBottomSheet" can be interpreted two ways. Implemented the cleaner option: **drag-drop lives on the CategoriesScreen rows** (visible all the time), and the sheet handles create/edit/delete only. The merge ConfirmModal is owned by CategoriesScreen, surfaced through DragMergeContext. This avoids re-rendering the full category list inside an already-tall sheet and matches the UI-SPEC §"Drag-drop merge" composition note.

## Authentication Gates

None — this plan touches no auth-protected APIs.

## Device Verification Checkpoint (Task 4)

**Status:** Deferred to user (orchestrator-managed). The plan's Task 4 is a `checkpoint:human-verify` requiring a physical iPhone via Expo Go. This executor cannot perform device verification.

**User action required after merge:**
1. `cd apps/mobile && npx expo start` — scan QR with Expo Go.
2. Run the 9 verification steps from `02-04-PLAN.md` §Task 4 (Categories tab default/custom split, create flow, edit flow, delete confirm, drag-merge confirm cancel, dashboard long-press, VoiceOver, cold-start persistence) plus the 2 Wave-2 cross-checks against 02-02's DigestCard.
3. Report **approved** or list gaps.

If gaps are found, a follow-up `02-05-PLAN.md` closure plan can address them.

## Threat Surface

All seven threats in the plan's `<threat_model>` register are addressed:

| Threat ID | Disposition | Implemented mitigation |
|-----------|-------------|------------------------|
| T-02-04-01 | mitigate | `validateCategoryName` rejects empty / >40 chars / `<>"'`;\\` / case-insensitive duplicate before any DB write. All SQL uses parameterized `executeSync` — no string interpolation. |
| T-02-04-02 | mitigate | `deleteCategory` + `mergeCategories` wrap reassign + delete inside `repo.inTransaction(...)` which issues `BEGIN`/`COMMIT`/`ROLLBACK`. `deleteCategoryRow` SQL has `AND is_custom = 1` guard so even a malformed call cannot delete a default row. |
| T-02-04-03 | accept | Bulk UPDATE is bounded (single statement, ≤5000 synthetic-ceiling rows per category). `executeSync` is synchronous, ~50ms max budget. |
| T-02-04-04 | mitigate | `mergeCategories` re-resolves both ids via `getCategoryById` before the UPDATE; throws `NOT_FOUND` if either is null. The DragMergeContext also clears state on drop release. |
| T-02-04-05 | accept | ConfirmModal copy explicitly says "This cannot be undone." (`merge_confirm_body` i18n key). User confirms via destructive CTA. |
| T-02-04-06 | mitigate | No `console.log` of category names anywhere — verified by `grep -rEn "console\.(log\|warn\|error)\(.*name" src/features/categories` (0 matches in production paths). |
| T-02-04-07 | mitigate | `createCategory` catches `UNIQUE constraint failed: categories.slug` and retries once with a `-{rand}` suffix. Covered by `categoryMutations.test.ts` "retries with random suffix on UNIQUE slug collision". |

## Known Stubs

None. All plan artifacts are wired end-to-end:
- Dashboard `CategoryRow.onLongPress` is no longer a stub (resolves the Wave 1 TODO).
- CategoriesScreen replaces the "Coming next" placeholder with a working list + editor.
- The merge surface is fully functional (Confirm modal commits via `mergeCategories`).

## Verification Log

```
$ cd apps/mobile && ./node_modules/.bin/tsc --noEmit
(exit 0, no output)

$ cd apps/mobile && ./node_modules/.bin/expo lint
(exit 0, no errors, no warnings after the 2 quick-fix tweaks)

$ cd apps/mobile && ./node_modules/.bin/tsx --test src/features/categories/categoryMutations.test.ts
# tests 25
# pass 25
# fail 0
# duration_ms ~195

$ grep -rEn "from ['\"]lucide-react-native['\"]|TODO\(02-04\)" \
    src/features/categories src/features/dashboard/CategoryRow.tsx 'app/(tabs)/categories.tsx'
(no matches)

$ grep -rEn "#667EEA|#8B7AB8|#E8E0FF|#10B981|#1A73E8|#2563EB" \
    src/features/categories src/components/BottomSheet 'app/(tabs)/categories.tsx' src/design/icons/categories
(no matches)

$ ls apps/mobile/src/design/icons/categories | grep -c '\.tsx$'
31   (30 icons + BaseCategoryIcon + index.tsx)
$ grep -cE "^\s+'?[a-z-]+'?: [A-Z]" src/design/icons/categories/_iconRegistry.ts
30   (exactly 30 slug → component entries)
```

## Commit Trail

- `a56b979` `feat(02-04): 30 hand-drawn category icons + ICON_REGISTRY` (Task 1)
- `2ee37f3` `feat(02-04): schema-002 + categoriesRepo CRUD + BottomSheet primitives` (Task 2)
- `5d538a3` `feat(02-04): CategoriesScreen + editor sheet + dashboard long-press` (Task 3)

## Self-Check: PASSED

- ✅ All 30 icon files present in `src/design/icons/categories/` (Beauty.tsx, Bills.tsx, Charity.tsx, …, Travel.tsx, Utilities.tsx).
- ✅ `_iconRegistry.ts` exports `ICON_REGISTRY` with 30 entries + `ICON_SLUGS` + `IconSlug` type.
- ✅ `BottomSheetPrimitive.tsx` and `ConfirmModal.tsx` exist under `src/components/BottomSheet/`.
- ✅ `categoryMutations.ts` exports `validateCategoryName`, `slugify`, `createCategory`, `renameCategory`, `deleteCategory`, `mergeCategories`.
- ✅ `categoriesRepo.ts` exports `insertCategory`, `updateCategory`, `deleteCategoryRow`, `bulkReassignTransactionsCategory`, `getMiscellaneousCategoryId`.
- ✅ `app/(tabs)/categories.tsx` no longer contains "Coming next"; it imports `CategoryListRow`, `CategoryEditorBottomSheet`, `DragMergeProvider`, `useCategoryEditorStore`, `ConfirmModal`.
- ✅ `src/features/dashboard/CategoryRow.tsx` calls `useCategoryEditorStore.getState().openForEdit(slice.categoryId)` in `onLongPress`; no `TODO(02-04)` remains.
- ✅ Commits `a56b979`, `2ee37f3`, `5d538a3` present in `git log --oneline -6`.
- ✅ `src/i18n/locales/{en,uk}/categories.json` exist with 20 keys each; `src/lib/i18n/index.ts` merges them into the `categories` subtree.
- ✅ Schema migration 2 registered in `src/lib/db/migrations.ts`; `SCHEMA_002` exported from `src/lib/db/schema.sql.ts`.
