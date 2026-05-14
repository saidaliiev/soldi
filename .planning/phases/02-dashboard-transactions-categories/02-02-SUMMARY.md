---
phase: 02-dashboard-transactions-categories
plan: 02
subsystem: dashboard
tags: [dashboard, digest-card, sparkline, skia, mom-compare, i18n]
requires:
  - phase-02-01: dashboardRepo (getMonthlyExpenseTotal), monthMath (addMonths / formatMonthLabel), MonthSwiper / DonutChart / CategoryRow / useMonthData / EmptyState, i18n dashboard namespace
provides:
  - apps/mobile/src/features/dashboard/digestMath.ts (pure: yesterday total, 7-day series, MoM delta, phrase key)
  - apps/mobile/src/features/dashboard/Sparkline.tsx (Skia line, 32pt, configurable color)
  - apps/mobile/src/features/dashboard/DigestCard.tsx (label / total / sparkline / italic MoM phrase)
  - apps/mobile/src/features/dashboard/useDigestData.ts (hook: executeSync inside useFocusEffect)
  - apps/mobile/src/data/dashboardRepo.ts::getDailyExpenseTotals(fromISO, toISO) — per-day positive cents for the sparkline window
  - apps/mobile/src/features/dashboard/monthMath.ts::isSameMonth(key, today) — gate for current-month-only rendering
affects:
  - apps/mobile/app/(tabs)/index.tsx (renders DigestCard between DonutChart and CategoryRows when selected month is the current month)
  - apps/mobile/src/i18n/locales/en/dashboard.json (digest_yesterday_label added; digest_above/below delta interpolation fixed — no hardcoded "€")
  - apps/mobile/src/i18n/locales/uk/dashboard.json (same key set; UK strings mirror EN pending Phase 4)
tech-stack:
  added: []
  patterns:
    - Skia single-stroke `Path` line via `Skia.Path.Make()` + `moveTo` / `lineTo` (Wave 1 donut pattern, generalised to a sparkline primitive)
    - Hook reads via op-sqlite `executeSync` inside `useFocusEffect` (Wave 1 `useMonthData` pattern)
    - UTC-only date arithmetic in `digestMath.ts` (DST-safe, matches `strftime('%Y-%m-%d', date, 'unixepoch')`)
    - Half-open ISO window in repo: inclusive `dateFromISO`, exclusive `dateToISO`, both ISO datetime strings → unix-sec for the INTEGER `date` column
key-files:
  created:
    - apps/mobile/src/features/dashboard/digestMath.ts
    - apps/mobile/src/features/dashboard/digestMath.test.ts
    - apps/mobile/src/features/dashboard/Sparkline.tsx
    - apps/mobile/src/features/dashboard/DigestCard.tsx
    - apps/mobile/src/features/dashboard/useDigestData.ts
  modified:
    - apps/mobile/src/data/dashboardRepo.ts (added getDailyExpenseTotals + header tweak)
    - apps/mobile/src/features/dashboard/monthMath.ts (added isSameMonth)
    - apps/mobile/src/i18n/locales/en/dashboard.json (added digest_yesterday_label; fixed delta interpolation)
    - apps/mobile/src/i18n/locales/uk/dashboard.json (mirrored EN)
    - apps/mobile/app/(tabs)/index.tsx (DigestCard integrated between DonutChart and CategoryRow list)
decisions:
  - "Render DigestCard between DonutChart and CategoryRow list (UI-SPEC §D-08), not between donut-block and top-5 list as a peer — fits the current dashboard composition without restructuring 02-01."
  - "Pass `today+1day` as exclusive upper bound to getDailyExpenseTotals so both yesterday and any in-flight rows up to now are surfaced; digestMath filters today out of the 7-day series."
  - "daysElapsedInCurrent === 0 with prior data → mode='no_prior'. Locked edge case: we have prior month data but cannot compute current daily avg yet, so the editorial copy reverts to 'First month tracked.'"
  - "EQUAL_TOLERANCE_CENTS = 100 (€1). Sub-tolerance daily-avg differences read as 'on_track' to avoid the phrase flipping every time a small transaction lands."
  - "Sparkline `flat-at-mid` when range = 0 (all zeros / all equal). Avoids div-by-zero and produces a visually intentional baseline rather than an undefined path."
metrics:
  duration_minutes: ~25
  completed: 2026-05-14
  tasks_completed: 2
  files_created: 5
  files_modified: 5
  commits: 3
---

# Phase 02 Plan 02: DigestCard + Sparkline + MoM phrase Summary

> One-line: editorial "yesterday in money" digest card slots into the dashboard between donut and top-5 rows, with Skia sparkline + four-template MoM phrase wired through i18n.

## Outcome

The Phase 2 dashboard now carries the digest section that distinguishes it from generic fintech "Spending insights" cards (D-07 + D-08). Pure `digestMath` exports compute yesterday's expense, a 7-entry sparkline series (oldest first, missing days filled with zeros), and a month-over-month daily-average comparison that maps to one of four editorial phrase keys. `dashboardRepo.getDailyExpenseTotals` adds the bounded SQL window the hook consumes via `executeSync`. The card renders only when the selected month is the current month — irrelevant for historical or future months. All 19 pure-math unit tests pass; `tsc --noEmit` and `expo lint` exit 0; banned-values + inline-hex + console.log greps are clean across every new file.

## Tasks

### Task 1 — digestMath module + dashboardRepo.getDailyExpenseTotals (TDD)
Commits: `4770aca` (RED), `9445834` (GREEN).

- `digestMath.ts` — four pure exports: `computeYesterdayExpenseCents`, `buildLast7DaysSeries`, `computeMonthOverMonthDelta`, `selectDigestPhraseKey`. All Date arithmetic in UTC (helper `addDaysUTC` + `toISODate`) to match the SQL `strftime('%Y-%m-%d', date, 'unixepoch')` output.
- `digestMath.test.ts` — 19 `node:test` cases via `tsx` runner (01-LEARNINGS Pattern 11). Covers yesterday lookup with/without rows, yesterday across a month boundary, sparkline window with sparse rows + month-crossing window + out-of-window rows, MoM above/below/equal/no_prior, ≤€1 tolerance edge, both-zero + zero-elapsed locked edge cases.
- `dashboardRepo.getDailyExpenseTotals(fromISO, toISO)` — half-open ISO window converted to unix-sec before binding (T-02-02-01 mitigation: rejects NaN dates by returning empty). SQL `GROUP BY strftime('%Y-%m-%d', date, 'unixepoch') ORDER BY d ASC`. Returns positive cents (DB convention stays negative-cents=expense; abs taken in SQL via `-SUM`).

### Task 2 — Sparkline + DigestCard + useDigestData + dashboard integration
Commit: `2dfe61b`.

- `Sparkline.tsx` — `Canvas` + single `Path` from `Skia.Path.Make()`; width measured via `onLayout`; data normalised to `[V_PAD, height-V_PAD]`; `style="stroke"`, `strokeWidth=1.5`, `strokeCap="round"`, `strokeJoin="round"`; flat line at vertical center when range = 0 or n = 1. `accessibilityRole="image"` with static "Spending sparkline, last 7 days" label.
- `useDigestData.ts` — `useFocusEffect`-driven synchronous read: queries the 7-day window, calls `getMonthlyExpenseTotal(currYear, currMonth)` + same for previous month, derives `daysElapsedInCurrent = today.getUTCDate()`, `daysInPrev` via the `Date.UTC(year, month-1, 0)` JS trick, runs through `digestMath`, surfaces `{ yesterdayCents, last7Days, phraseKey, deltaCents, isLoading, error }`. Try/catch sets `error` to a static string token (`'digest_unavailable'`) — never logs transaction details (T-02-02-02 mitigation).
- `DigestCard.tsx` — `View` with `RADIUS.lg`, `COLORS.surface`, `SHADOWS.card`, `SPACING.md` padding, `SPACING.xs` row gap. Layout per UI-SPEC §DigestCard: prefix label (TYPE.uiLabel, textMuted) / total (TYPE.displayL, accent, tabular-nums) / Sparkline (32pt accent) / italic MoM phrase (TYPE.editorialBody, textSecondary). Inner texts labelled for VoiceOver; container itself is `accessibilityRole="none"`.
- `monthMath.isSameMonth(key, today)` — UTC year+month equality check; gates the DigestCard render in `(tabs)/index.tsx`.
- `i18n` — `digest_yesterday_label` added (`"yesterday in money"`); `digest_above_avg` / `digest_below_avg` adjusted to interpolate the pre-formatted `{{delta}}` from `formatMoney(deltaCents, currency)` instead of hardcoding "€" (was a Wave 1 placeholder; would have double-printed the currency symbol in production).
- `(tabs)/index.tsx` — DigestCard rendered inside the populated-month branch, between `<DonutChart>` and the `<View style={styles.rows}>` category list. Wrapped in `digestWrap` with `marginTop: SPACING.lg` / `marginBottom: SPACING.lg` for the section breath called for in D-08.

## Patterns Established for Downstream Plans

1. **Skia line primitive** — `Skia.Path.Make()` + `moveTo` / `lineTo` per normalised data point, rendered with a single `<Path style="stroke" />`. Reusable for any future inline mini-chart (e.g. category trend mini-line in plan 02-04 detail sheets).
2. **Sparse-row densification in pure code** — SQL returns rows only for days with spend; the math layer (`buildLast7DaysSeries`) fills zeros in a tiny `Map<dateKey, cents>` lookup. Avoids `LEFT JOIN calendar` SQL gymnastics on op-sqlite.
3. **Half-open ISO window → unix-sec binding** — `(fromISO, toISO)` exposed to JS; converted via `new Date(iso).getTime() / 1000` after a `Number.isFinite` round-trip (T-02-02-01). Same pattern reusable for any future range query in `transactionsRepo`.
4. **Editorial-phrase template** — `selectDigestPhraseKey(mode)` returns a literal i18n key; the consumer interpolates a pre-formatted money string. Future "weekly digest" or "anomaly insight" cards can follow the same `mode → key → {{delta}}` shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] EN/UK locale files had hardcoded "€" in delta-interpolation strings**
- **Found during:** Task 2 wiring the DigestCard to i18n.
- **Issue:** The pre-existing `dashboard.json` files (committed in Wave 1 as placeholders) read `"+ €{{delta}} above last month's daily average"`. The plan §action specifies the delta is interpolated from `formatMoney(deltaCents, currency)`, which already produces `"€42.00"`. Leaving the "€" prefix would render `"€€42.00"` in production.
- **Fix:** Stripped the "€" from both EN and UK templates so the rendered string is `"+ €42.00 above last month's daily average"`. Currency symbol now flows entirely through `Intl.NumberFormat`, which keeps non-EUR future deployments (UAH?) clean.
- **Files modified:** `src/i18n/locales/en/dashboard.json`, `src/i18n/locales/uk/dashboard.json`.
- **Commit:** `2dfe61b`.

**2. [Rule 3 — Blocking dependency] Worktree missing node_modules**
- **Found during:** First `tsc --noEmit` invocation.
- **Issue:** The worktree directory has no `node_modules`; the `npx tsc` shim fails because the local dev-dep isn't available, and pointing the main-repo `tsc` binary at the worktree's `tsconfig.json` fails on every file due to absent type-roots.
- **Fix:** Created a symlink `apps/mobile/node_modules -> /home/iskan/projects/soldi/apps/mobile/node_modules` so verification commands resolve against the main repo's installed packages. Symlink is not staged (already covered by `.gitignore` on `node_modules`).
- **Files modified:** none tracked.
- **Commit:** none (verification-only).

### Locked Edge Cases

- `daysElapsedInCurrent === 0` AND `prevMonthTotalCents > 0` → `mode = 'no_prior'`. Rationale: we have prior data but cannot yet form a current daily average; reverting to "First month tracked." is the least misleading editorial choice.
- `prevMonthTotalCents <= 0` AND `currentMonthTotalCents === 0` AND `daysElapsedInCurrent === 0` → `mode = 'equal'`. Both sides nothing → "Right on track for the month."
- `|deltaFloat| ≤ 100 cents` → `mode = 'equal'`. Avoids the phrase flipping every time a small transaction lands.

## Authentication Gates

None — local-only DB reads, no network calls.

## Threat Surface

All four threats in the plan's `<threat_model>` register are addressed:

| Threat ID | Disposition | Implemented mitigation |
|-----------|-------------|------------------------|
| T-02-02-01 | mitigate | `getDailyExpenseTotals` validates each ISO bound via `Number.isFinite(new Date(iso).getTime())`; rejects NaN/malformed dates by returning an empty array. SQL uses `?` placeholders bound to unix-second integers. `toSec <= fromSec` is also rejected (empty). |
| T-02-02-02 | mitigate | No `console.log/warn/error` in `Sparkline`, `DigestCard`, `useDigestData`, or `digestMath`. Verified via `grep -nE "console\.(log\|warn\|error)"` returning exit 1. Error path stores a static string token only. |
| T-02-02-03 | accept | `useDigestData` queries are scoped to an 8-day window + two single-month aggregates (`executeSync` is synchronous and bounded). DigestCard is gated on `isSameMonth(selected, today)` so swiping to past/future months does not re-run the hook. |
| T-02-02-04 | mitigate | All Date arithmetic in `digestMath.ts` + `useDigestData.ts` uses `Date.UTC(...)` / `getUTC*()` helpers (DST-safe). Tests cover the month-boundary case explicitly. |

## Verification Log

```
$ cd apps/mobile && npx tsc --noEmit
(exit 0)

$ cd apps/mobile && npx expo lint
(exit 0)

$ cd apps/mobile && npx tsx --test src/features/dashboard/digestMath.test.ts
# tests 19
# pass 19
# fail 0
# duration_ms ~150

$ grep -rEn "#667EEA|#8B7AB8|#10B981|#1A73E8|#2563EB|🏷|💰|💸" \
    src/features/dashboard/DigestCard.tsx src/features/dashboard/Sparkline.tsx \
    src/features/dashboard/useDigestData.ts src/features/dashboard/digestMath.ts \
    src/i18n/locales/en/dashboard.json src/i18n/locales/uk/dashboard.json
(no matches)

$ grep -nE "#[0-9A-Fa-f]{3,8}" \
    src/features/dashboard/DigestCard.tsx src/features/dashboard/Sparkline.tsx \
    src/features/dashboard/useDigestData.ts src/features/dashboard/digestMath.ts
(no matches)

$ grep -nE "console\.(log|warn|error)" \
    src/features/dashboard/DigestCard.tsx src/features/dashboard/Sparkline.tsx \
    src/features/dashboard/useDigestData.ts src/features/dashboard/digestMath.ts
(no matches)
```

Device verification of DigestCard rendering (visible line in sparkline, correct phrase under varying MoM scenarios, no render on past months) is deferred to the Phase 2 end-of-phase checkpoint inside plan 02-03 per the plan's `<output>` section.

## Commit Trail

- `4770aca` `test(02-02): add failing tests for digestMath` (RED — 19 cases)
- `9445834` `feat(02-02): digest math + getDailyExpenseTotals repo query` (GREEN — Task 1)
- `2dfe61b` `feat(02-02): DigestCard with Skia sparkline + MoM phrase` (Task 2)

## Known Stubs

None. Every new export is consumed; every component is rendered (subject to the current-month gate).

## Self-Check: PASSED

- ✅ `apps/mobile/src/features/dashboard/{digestMath,digestMath.test,Sparkline,DigestCard,useDigestData}.{ts,tsx}` exist on disk.
- ✅ `apps/mobile/src/data/dashboardRepo.ts` exports `getDailyExpenseTotals`.
- ✅ `apps/mobile/src/features/dashboard/monthMath.ts` exports `isSameMonth`.
- ✅ `apps/mobile/app/(tabs)/index.tsx` imports `DigestCard`, `useDigestData`, `isSameMonth` and renders `<DigestCard data={digest} />` inside `showDigest && (...)`.
- ✅ `apps/mobile/src/i18n/locales/en/dashboard.json` contains all 5 digest_* keys (`digest_yesterday_label`, `digest_above_avg`, `digest_below_avg`, `digest_on_track`, `digest_first_month`).
- ✅ `apps/mobile/src/i18n/locales/uk/dashboard.json` mirrors the EN key set.
- ✅ Commits `4770aca`, `9445834`, `2dfe61b` all present in `git log --oneline -5`.
