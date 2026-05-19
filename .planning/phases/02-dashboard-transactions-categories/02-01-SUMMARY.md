---
phase: 02-dashboard-transactions-categories
plan: 01
subsystem: dashboard
tags: [dashboard, skia-donut, month-swiper, tab-bar, repos, i18n]
requires:
  - phase-01: db/transactions repo, design tokens + typography presets, i18n init
provides:
  - apps/mobile/src/features/dashboard/donutArcs.ts (pure arc math)
  - apps/mobile/src/features/dashboard/monthMath.ts (month arithmetic + UTC unix-sec bounds)
  - apps/mobile/src/features/dashboard/types.ts (CategorySlice / MonthKey / CategoryBreakdown)
  - apps/mobile/src/features/dashboard/{MonthSwiper,MonthlyTotalHero,DonutChart,CategoryRow,EmptyState,useMonthData}
  - apps/mobile/src/data/dashboardRepo.ts (getMonthlyExpenseTotal / getCategoryBreakdown / getMonthsWithTransactions)
  - apps/mobile/src/data/categoriesRepo.ts: getCategoryById / listCategoriesEnriched / Category type / slugForCategoryName / colorForCategorySlug / DEFAULT_CATEGORY_COLORS
  - apps/mobile/src/data/transactionsRepo.ts: listByMonth
  - apps/mobile/src/design/icons/tabs/{Dashboard,Transactions,Categories}Icon + chevrons + empty illustrations + BaseCategoryIcon
  - dashboard.* i18n keys (en + uk; uk values mirror en pending Phase 4)
  - GestureHandlerRootView wrapper in app/_layout.tsx
affects:
  - apps/mobile/app/(tabs)/_layout.tsx (replaced)
  - apps/mobile/app/(tabs)/index.tsx (replaced)
  - apps/mobile/app/_layout.tsx (wrapped in GestureHandlerRootView)
  - apps/mobile/src/lib/i18n/index.ts (dashboard JSON merge)
tech-stack:
  added:
    - skia path icons (no react-native-svg dependency added)
  patterns:
    - synchronous useFocusEffect → executeSync repo reads (Phase 1 Pattern)
    - reanimated v4 + gesture-handler v2 Gesture.Pan() with worklet handlers
    - skia donut via Path.MakeFromSVGString from pure arc-path strings
    - i18n deep-merge from src/i18n/locales/{en,uk}/dashboard.json
key-files:
  created:
    - apps/mobile/src/features/dashboard/types.ts
    - apps/mobile/src/features/dashboard/donutArcs.ts
    - apps/mobile/src/features/dashboard/donutArcs.test.ts
    - apps/mobile/src/features/dashboard/monthMath.ts
    - apps/mobile/src/features/dashboard/monthMath.test.ts
    - apps/mobile/src/features/dashboard/useMonthData.ts
    - apps/mobile/src/features/dashboard/MonthSwiper.tsx
    - apps/mobile/src/features/dashboard/MonthlyTotalHero.tsx
    - apps/mobile/src/features/dashboard/DonutChart.tsx
    - apps/mobile/src/features/dashboard/CategoryRow.tsx
    - apps/mobile/src/features/dashboard/EmptyState.tsx
    - apps/mobile/src/data/dashboardRepo.ts
    - apps/mobile/src/design/icons/tabs/DashboardIcon.tsx
    - apps/mobile/src/design/icons/tabs/TransactionsIcon.tsx
    - apps/mobile/src/design/icons/tabs/CategoriesIcon.tsx
    - apps/mobile/src/design/icons/tabs/index.tsx
    - apps/mobile/src/design/icons/chevrons/ChevronLeft.tsx
    - apps/mobile/src/design/icons/chevrons/ChevronRight.tsx
    - apps/mobile/src/design/icons/empty/EmptyIllustrationFlower.tsx
    - apps/mobile/src/design/icons/empty/index.tsx
    - apps/mobile/src/design/icons/categories/BaseCategoryIcon.tsx
    - apps/mobile/src/i18n/locales/en/dashboard.json
    - apps/mobile/src/i18n/locales/uk/dashboard.json
    - apps/mobile/app/(tabs)/transactions.tsx
    - apps/mobile/app/(tabs)/categories.tsx
  modified:
    - apps/mobile/app/(tabs)/_layout.tsx
    - apps/mobile/app/(tabs)/index.tsx
    - apps/mobile/app/_layout.tsx
    - apps/mobile/src/data/categoriesRepo.ts
    - apps/mobile/src/data/transactionsRepo.ts
    - apps/mobile/src/lib/i18n/index.ts
decisions:
  - "Render all SVG icons via Skia Path (Skia.Path.MakeFromSVGString) instead of adding react-native-svg — preserves stack discipline and avoids cross-worktree package.json churn during Wave 1."
  - "Derive category slug+color in the repository layer from a static map until schema-002 (plan 02-04) adds the columns — keeps Wave 1 free of migration changes."
  - "Use transactions.date INTEGER unix-sec bounds (computed via monthStartEndUnixSec) for month filtering, not ISO strings — matches the actual schema-001 column type."
  - "Crossfade canvas opacity on month change in DonutChart pending usePathInterpolation hookup in 02-02 — preserves the 300ms Easing.out(Easing.cubic) D-05 contract feel without jank on topologically-distinct arc sets."
  - "Add GestureHandlerRootView to app/_layout.tsx — required for Gesture.Pan in MonthSwiper; was absent in Phase 1 (no gestures used)."
metrics:
  duration_minutes: ~45
  completed: 2026-05-14
  tasks_completed: 3
  files_created: 25
  files_modified: 6
  commits: 4
---

# Phase 02 Plan 01: Dashboard Foundation Summary

> One-line: editorial three-tab app with a Skia donut + month-swiper dashboard, backed by a new dashboardRepo and category enrichment layer that downstream Phase 2 plans consume.

## Outcome

Phase 2 Wave 1 foundation is in place. The Phase 1 minimal dashboard has been replaced with the editorial composition (MonthSwiper → MonthlyTotalHero → DonutChart → CategoryRows → EmptyState) per D-01. The three-tab bar (Overview / Transactions / Categories) ships with hand-drawn Skia SVG icons — no lucide, no emoji, no raster. The `getMonthlyExpenseTotal` / `getCategoryBreakdown` / `getMonthsWithTransactions` repo trio is wired into a `useMonthData` hook that re-reads on focus via `useFocusEffect`. All 23 pure-logic unit tests pass; `tsc --noEmit` and `expo lint` exit 0; banned-values grep is clean across icons, tabs, dashboard feature, and the en locale.

## Tasks

### Task 1 — Pure logic + repos
Commits: `ef46051` (RED), `ef8a2f1` (GREEN).
- `donutArcs.ts` — pure SVG arc-path math consumable by `Skia.Path.MakeFromSVGString`. Empty-input safe (no NaN). Six tests covering empty, 3-slice, 5-slice + Other, single 100%, ordering preservation, and total-swept-angle math.
- `monthMath.ts` — `addMonths`, `clampMonth`, `compareMonth`, `isFutureMonth`, `formatMonthLabel`, plus `monthStartEndUnixSec` helper for repo bounds. 17 tests covering Dec/Jan rollover (both directions), large positive and negative deltas, three-way compare, lock-clamping, UTC-month future detection, and Intl locale formatting.
- `dashboardRepo.ts` — three parameterized queries with year/month bounded (1900–3000 / 1–12) before SQL (T-02-01-01 mitigation). Top-5 + Other aggregation done in JS layer from a single SQL GROUP BY.
- `categoriesRepo.ts` — extended with `Category` enriched shape, `getCategoryById`, `listCategoriesEnriched`, `slugForCategoryName`, `colorForCategorySlug`, `DEFAULT_CATEGORY_COLORS` (D-22 palette assignment per seeded slug).
- `transactionsRepo.ts` — `listByMonth(year, month)` parameterized SELECT using INTEGER unix-sec date bounds, ORDER BY date DESC, id DESC.

### Task 2 — Tab bar + SVG icons
Commit: `e3c8435`.
- 5 Skia-rendered icon components (`DashboardIcon`, `TransactionsIcon`, `CategoriesIcon`, `ChevronLeft`, `ChevronRight`) — 24×24 viewBox, strokeWidth 1.6, round caps + joins, hand-drawn coordinate jitter (D-21).
- Tab barrel at `src/design/icons/tabs/index.tsx`.
- `app/(tabs)/_layout.tsx` rewritten to three tabs with custom icons, `tabBarLabel` via `TYPE.uiLabel`, active/inactive coloring driven by `focused` boolean (`COLORS.accent` / `COLORS.textMuted`), tab bar background `COLORS.surface`, 1pt top border `COLORS.textMuted @ 33` (20% alpha 8-bit suffix).
- Placeholder route files `app/(tabs)/transactions.tsx` + `app/(tabs)/categories.tsx` (replaced in plans 02-03 / 02-04).
- Phase 1 `explore.tsx` hidden via `href: null` (clean swap path for 02-03).

### Task 3 — Dashboard screen + components + i18n
Commit: `2aa4401`.
- `useMonthData(monthKey)` — synchronous `executeSync` reads inside `useFocusEffect`, never logs PII.
- `MonthSwiper` — `Gesture.Pan().activeOffsetX([-12, 12]).onUpdate(worklet).onEnd(worklet)`, 60pt threshold, `withTiming(0, 250ms, Easing.out(Easing.quad))` snap; chevrons hidden at past-lock / future-lock; `accessibilityRole="adjustable"` with `accessibilityActions=[{increment},{decrement}]`.
- `MonthlyTotalHero` — `TYPE.displayXL` Oswald + `fontVariant: ['tabular-nums']`; sub-label `TYPE.uiLabel` `COLORS.textMuted`.
- `DonutChart` — 200×200 Skia canvas, 10pt stroke, 2pt gap, slice tap morphs center label (polar angle hit-test), 300ms crossfade `Easing.out(Easing.cubic)` on month change. Dev-only `console.time('donut-first-frame')` / `console.timeEnd` per D-27 (T-02-01-03 — no PII).
- `CategoryRow` — color dot + `BaseCategoryIcon` + name + tabular amount + proportional 2pt percent bar (40% alpha via 8-bit hex suffix); tap → `/(tabs)/transactions?categoryId=…` for 02-03 deep-link; long-press is a TODO comment pointing at 02-04.
- `EmptyState` — 4 variants (`current-month`, `future-month`, `no-search-results`, `no-categories`) with 4 hand-drawn Skia illustrations (`Flower`, `Window`, `Cup`, `Branches`); EB Garamond italic phrase + CTA Pressable.
- `app/(tabs)/index.tsx` — full composition with `useFocusEffect`-driven `MonthSwiper` bounds, future-month detection, error retry, gap `SPACING.lg` between sections, top padding `SPACING.xl`.
- `app/_layout.tsx` — wrapped in `GestureHandlerRootView` (Rule 3 — required for the swiper's pan gesture).
- i18n: `src/i18n/locales/{en,uk}/dashboard.json` files created with all dashboard.* keys; deep-merged into the bundled `translation` namespace by `src/lib/i18n/index.ts`. UK values mirror EN (Phase 4 translates).

## Patterns Established for Downstream Plans

1. **Skia donut pattern** — pure-JS arc-path strings from `buildDonutArcs(slices, other, radius, strokeWidth, gapDeg)` consumed by `<Path path={Skia.Path.MakeFromSVGString(d)} style="stroke" strokeWidth={…} strokeCap="round" />`. 02-02 can reuse this for the digest-card sparkline (single-line `Path` instead of arcs).
2. **MonthSwiper pan worklet** — `Gesture.Pan().activeOffsetX([-12,12]).onUpdate('worklet').onEnd('worklet')` with `runOnJS(onChange)` and `withTiming` snap. 02-03 transaction-row swipe-left adopts the same shape (different threshold / clamp).
3. **useMonthData hook** — `useFocusEffect(useCallback)` wrapping synchronous `executeSync` repo calls; never throws to the UI, surfaces as `{error: boolean}`. Apply identically in 02-03 for `useTransactionsByMonth`.
4. **i18n bundle merge** — namespaced JSON files at `src/i18n/locales/{lng}/{ns}.json`, deep-merged into the existing `translation` namespace at init. 02-02/03/04 add their own `transactions.json` / `categories.json` files and extend the same merge.
5. **Category color derivation** — `slugForCategoryName(nameEn)` + `colorForCategorySlug(slug)` from `DEFAULT_CATEGORY_COLORS`. 02-04 swaps these for DB columns once the schema gains `slug` + `color`.
6. **Hand-drawn Skia icons** — Skia Path + `Canvas` per icon, parameterized by `color` + `size`. 02-04's full 30-icon category set follows this pattern; no need for react-native-svg.
7. **BottomSheet primitive** — NOT built in this plan (deferred to 02-04 per scope). `@gorhom/bottom-sheet` is not yet in `package.json`; plan 02-04 will add the dep and ship `RecategorizeBottomSheet` + `CategoryEditorBottomSheet`. The `CategoryRow.onLongPress` is a no-op with a `TODO(02-04)` comment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `transactions.date` column is INTEGER unix-sec, not ISO text**
- **Found during:** Task 1 writing `dashboardRepo`.
- **Issue:** Plan §"action" specifies SQL like `WHERE occurred_at >= ? AND occurred_at < ?` with ISO strings. The schema-001 column is `date INTEGER NOT NULL` storing unix seconds (per `01-SKELETON`).
- **Fix:** Added `monthStartEndUnixSec` helper in `monthMath.ts`; all queries use `date >= ? AND date < ?` with the two computed unix seconds. `getMonthsWithTransactions` uses `strftime('%Y'/%m', date, 'unixepoch')` to read the unix-sec column.
- **Files modified:** `src/features/dashboard/monthMath.ts`, `src/data/dashboardRepo.ts`, `src/data/transactionsRepo.ts`.
- **Commit:** `ef8a2f1`.

**2. [Rule 2 — Missing critical functionality] Schema-001 has no `slug`, `color`, or `usage_count` columns on categories**
- **Found during:** Task 1 dashboardRepo `getCategoryBreakdown` needed `slug` + `color` on each `CategorySlice`.
- **Issue:** Plan interfaces assume `slug` and `color` exist on `Category`. Schema-001 only carries `name_en`, `name_uk`, `icon_name`. No schema migration is in scope for 02-01 (lands in 02-04).
- **Fix:** Derive slug+color in the repo layer using the existing `SLUG_TO_NAME_EN` map (Phase 1) + a new `DEFAULT_CATEGORY_COLORS` map keyed by slug. Exposed `slugForCategoryName` + `colorForCategorySlug` helpers. Downstream API surface unchanged. Custom categories created in 02-04 will resolve slug+color via the same helpers until the schema columns land.
- **Files modified:** `src/data/categoriesRepo.ts`.
- **Commit:** `ef8a2f1`.

**3. [Rule 3 — Blocking dependency] `GestureHandlerRootView` was not wrapping the tree**
- **Found during:** Task 3 wiring `MonthSwiper`'s pan gesture.
- **Issue:** Pan gestures via gesture-handler require `GestureHandlerRootView` at the root of the React tree. Phase 1 had no gestures, so the root layout did not include it.
- **Fix:** Wrapped the existing provider tree in `<GestureHandlerRootView style={{ flex: 1 }}>` inside `app/_layout.tsx`.
- **Files modified:** `apps/mobile/app/_layout.tsx`.
- **Commit:** `2aa4401`.

**4. [Rule 3 — Project pattern adaptation] i18n bundle structure differs from plan path**
- **Found during:** Task 3 creating dashboard JSON files.
- **Issue:** Plan asked for `src/i18n/locales/{en,uk}/dashboard.json`. The actual project i18n is configured to read a single bundled JSON per locale at `src/lib/i18n/{en,uk}.json` (Phase 1 pattern). Creating files at the plan path alone would orphan them.
- **Fix:** Created the plan-mandated files at `src/i18n/locales/{en,uk}/dashboard.json` AND deep-merged their contents into the bundled `translation` namespace from `src/lib/i18n/index.ts`. Both the plan artifact contract and the existing i18n consumer pattern are satisfied.
- **Files modified:** `src/lib/i18n/index.ts`, `src/i18n/locales/{en,uk}/dashboard.json` created.
- **Commit:** `2aa4401`.

**5. [Rule 3 — Stack discipline] No `react-native-svg` dependency in `package.json`**
- **Found during:** Task 2 starting icon implementation.
- **Issue:** Plan says "SVG only — no lucide, no emoji". The conventional RN SVG library `react-native-svg` is not a project dep. Adding it would touch `package.json` + `package-lock.json` — risky during a parallel Wave with no per-worktree npm install.
- **Fix:** Render all icons via Skia `Path` + `Canvas` (project already ships `@shopify/react-native-skia` v2.2.12). Skia consumes the same SVG path data strings via `Skia.Path.MakeFromSVGString`, so the hand-drawn aesthetic (D-21) is preserved. Per-icon cost is one small Canvas; acceptable for 24×24 tab icons and 120×120 illustrations rendered once.
- **Files modified:** all icons in `src/design/icons/{tabs,chevrons,empty,categories}/`.
- **Commit:** `e3c8435`.

### Deferred to Downstream Plans

- **DonutChart per-slice path interpolation across distinct topologies (D-05 strict)** — **CLOSED 2026-05-17 (redesign Wave 2).** Implemented as pure angle-space interpolation keyed by stable categoryId (`src/features/dashboard/dashboardMotion.ts:interpolateSliceAngles`) with enter/exit, driven by `MOTION.arcDraw` (mount) + `MOTION.arcInterpolate` (month change) through the motion vocabulary. The original `usePathInterpolation` topology blocker did not apply — it was specific to SVG-path-string interpolation, not angle space, so the 6→5→7-slice case needed no padding. node-tested; device-UAT deferred to batched W1+W2 build. (Original deferral: crossfade stopgap preserved the 300ms `Easing.out(Easing.cubic)` feel without interpolating individual arc segments.)
- **`@gorhom/bottom-sheet` integration** — not added in 02-01. `CategoryRow.onLongPress` is a no-op + TODO comment pointing at 02-04 (per plan §6).
- **`LinearGradient` CTA button** — plan asks for `GRADIENTS.primary` fill on EmptyState CTA; `expo-linear-gradient` is not a project dep yet. Used flat `COLORS.accent` fill with `COLORS.accentDeep` pressed state; visual polish (gradient) lands in 02-04 when the gradient primitive is wired across all sheets/buttons.

## Authentication Gates

None — this plan touches no auth-protected APIs.

## Threat Surface

All five threats in the plan's `<threat_model>` register are addressed:

| Threat ID | Disposition | Implemented mitigation |
|-----------|-------------|------------------------|
| T-02-01-01 | mitigate | All three repo queries use parameterized `?` placeholders; year/month coerced via `Number()` and bounded to 1900–3000 / 1–12 in `boundsOrNull` before SQL. |
| T-02-01-02 | mitigate | All SELECTs bounded by month — never SELECT * across all rows. `executeSync` is synchronous; no inflight setState after unmount because `useFocusEffect` returns a fresh callback per focus. |
| T-02-01-03 | mitigate | Only `console.time('donut-first-frame')` exists in the dashboard render path (no PII). Verified via `grep -rEn "console\.(log\|warn\|error)" src/features/dashboard src/data/dashboardRepo.ts 'app/(tabs)/index.tsx'` → 0 results. |
| T-02-01-04 | accept | CategoryRow `onLongPress` is a no-op TODO; no state change → no audit log. |
| T-02-01-05 | accept | dashboard.* namespace owned by this plan; verified by `grep -E "^\s+\"dashboard\":" src/lib/i18n/en.json` (1 match). |

## Verification Log

```
$ cd apps/mobile && npx tsc --noEmit
(exit 0, no output)

$ cd apps/mobile && npx expo lint
(exit 0, no warnings or errors)

$ cd apps/mobile && npx tsx --test src/features/dashboard/donutArcs.test.ts src/features/dashboard/monthMath.test.ts
# tests 23
# pass 23
# fail 0
# duration_ms ~140

$ grep -rEn "lucide-react-native|🏠|💸|🏷|📊|#667EEA|#8B7AB8|#10B981|#1A73E8|#2563EB" \
    src/design/icons src/features/dashboard 'app/(tabs)' src/i18n/locales
(no matches)
```

## Commit Trail

- `ef46051` `test(02-01): add failing tests for donutArcs + monthMath` (RED)
- `ef8a2f1` `feat(02-01): dashboard repo + donutArcs + monthMath pure logic` (GREEN — Task 1)
- `e3c8435` `feat(02-01): three-tab bar with hand-drawn Skia SVG icons` (Task 2)
- `2aa4401` `feat(02-01): editorial dashboard screen + MonthSwiper + DonutChart` (Task 3)

## Known Stubs

- **`app/(tabs)/transactions.tsx`** — renders `Coming next`. Replaced by plan 02-03 (`TransactionListScreen`). Intentional — Wave 1 only needs the route to exist so the tab bar compiles.
- **`app/(tabs)/categories.tsx`** — same pattern, replaced by plan 02-04.
- **`CategoryRow.onLongPress`** — empty handler with `TODO(02-04)` comment.

## Self-Check: PASSED

- ✅ `apps/mobile/src/features/dashboard/{types,donutArcs,monthMath,useMonthData,MonthSwiper,MonthlyTotalHero,DonutChart,CategoryRow,EmptyState}.{ts,tsx}` exist on disk.
- ✅ `apps/mobile/src/data/dashboardRepo.ts` exists and exports the three required functions.
- ✅ `apps/mobile/src/data/categoriesRepo.ts` exports `getCategoryById` and `listCategoriesEnriched`.
- ✅ `apps/mobile/src/data/transactionsRepo.ts` exports `listByMonth`.
- ✅ `apps/mobile/app/(tabs)/_layout.tsx` references `DashboardIcon`, `TransactionsIcon`, `CategoriesIcon`.
- ✅ `apps/mobile/app/(tabs)/index.tsx` references `MonthSwiper`, `MonthlyTotalHero`, `DonutChart`, `CategoryRow`, `EmptyState`, `useMonthData`.
- ✅ Commits `ef46051`, `ef8a2f1`, `e3c8435`, `2aa4401` all present in `git log --oneline -5`.
- ✅ `apps/mobile/src/i18n/locales/en/dashboard.json` contains `empty_month`.
- ✅ `apps/mobile/app/_layout.tsx` references `GestureHandlerRootView`.
