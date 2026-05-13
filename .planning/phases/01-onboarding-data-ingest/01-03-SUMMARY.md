---
phase: 01-onboarding-data-ingest
plan: 03
subsystem: synthetic-data
tags: [synthetic, sqlite, repository, onboarding, dashboard, unit-tests, rng, mcc]
dependency_graph:
  requires:
    - "01-01: @lib/db (getDB/executeSync/splitStatements), @lib/money (toCents/formatMoney), @lib/time (nowSeconds/startOfDaySeconds)"
    - "01-01: @stores/onboarding (setDataSource/setCompleted)"
    - "01-02: app/onboarding/synthetic.tsx stub (replaced)"
    - "01-02: @components/PressableButton (used in error retry)"
  provides:
    - "@lib/synthetic/rng: mulberry32/pick/randInt (seedable PRNG)"
    - "@lib/synthetic/mcc: MCC_TO_CATEGORY map, categoryForMcc, CategorySlug"
    - "@lib/synthetic/merchants: IE_MERCHANTS (32 entries), UA_MERCHANTS (23 entries), MerchantSeed"
    - "@lib/synthetic/generator: generateSyntheticTransactions, SyntheticConfig, SyntheticTxRow"
    - "@data/categoriesRepo: getCategoryIdBySlug, listCategories, CategoryRow"
    - "@data/accountsRepo: ensureDefaultAccount, AccountRow"
    - "@data/transactionsRepo: insertManyTransactions, countTransactions, sumLastNDays, TransactionRow"
    - "app/onboarding/synthetic.tsx: full ingest screen (replaces 01-02 stub)"
    - "app/(tabs)/index.tsx: minimal Phase 1 dashboard"
  affects:
    - "01-04: reuses @data/transactionsRepo (insertManyTransactions), @data/accountsRepo (ensureDefaultAccount)"
    - "01-04: @lib/synthetic/mcc (categoryForMcc) reused by monobank mapper"
    - "02-xx: (tabs)/index.tsx replaced with full design dashboard"
tech_stack:
  added: []
  patterns:
    - "mulberry32 seedable PRNG — deterministic synthetic generation"
    - "BEGIN/COMMIT wrapping for bulk INSERT OR IGNORE (idempotent re-run)"
    - "slug→name_en map in categoriesRepo (no hardcoded ids, dynamic lookup)"
    - "useFocusEffect (expo-router) for live-reload on tab focus"
    - "accessibilityLiveRegion='polite' for VoiceOver progress announcements"
key_files:
  created:
    - apps/mobile/src/lib/synthetic/rng.ts
    - apps/mobile/src/lib/synthetic/mcc.ts
    - apps/mobile/src/lib/synthetic/merchants.ts
    - apps/mobile/src/lib/synthetic/generator.ts
    - apps/mobile/src/data/categoriesRepo.ts
    - apps/mobile/src/data/accountsRepo.ts
    - apps/mobile/src/data/transactionsRepo.ts
    - apps/mobile/tests/synthetic.test.ts
  modified:
    - apps/mobile/app/onboarding/synthetic.tsx (full rewrite — stub replaced with ingest flow)
    - apps/mobile/app/(tabs)/index.tsx (full rewrite — Expo starter replaced with Phase 1 dashboard)
    - apps/mobile/src/lib/i18n/en.json (4 new keys)
    - apps/mobile/src/lib/i18n/uk.json (4 new keys)
decisions:
  - "slug→name_en resolved at DB query time (getCategoryIdBySlug) — no hardcoded category ids; future re-seeding stays compatible"
  - "mulberry32 seeded with Math.floor(Date.now()/1000) in production (per-run variance) but accepts any seed for unit tests"
  - "Phase 1 dashboard EUR-only rollup for 30-day total — UAH rows exist in DB but are excluded from sum (accepted simplification in SKELETON Out-of-Scope)"
  - "readonly T[] used instead of ReadonlyArray<T> — project ESLint @typescript-eslint/array-type rule"
  - "salaryDays = {1, 31, 61} — one salary per 30-day window across 90 days"
  - "description always null in synthetic rows — Phase 3 AI infers from category+merchant (T-01-03-03)"
metrics:
  duration: "~40 minutes"
  completed_date: "2026-05-13"
  tasks_completed: 2
  files_created: 8
  files_modified: 4
---

# Phase 01 Plan 03: Synthetic Generator + Minimal Phase 1 Dashboard Summary

Deterministic mulberry32-powered synthetic engine generating 90 days of realistic IE + UA transactions, inserted into op-sqlite via a transactional bulk repo, with a minimal Phase 1 dashboard reading counts and 30-day expense totals end-to-end.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Pure synthetic engine: rng, mcc (60+ codes), merchants (IE 32 + UA 23), generator — 14/14 unit tests pass | 9498cb8 |
| 2 | Repos (categories, accounts, transactions), real synthetic screen, Phase 1 dashboard, i18n keys | 6a3ffa0 |

## Verification Gate Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npx expo lint` | exit 0 (0 errors, 0 warnings) |
| `npx tsx tests/synthetic.test.ts` | 14/14 pass |
| No ParallaxScrollView / HelloWave / ThemedText in (tabs)/index.tsx | confirmed |
| No AsyncStorage usage | confirmed |
| No hardcoded hex in new files | confirmed |
| `description` always null in SyntheticTxRow | confirmed |
| accessibilityLiveRegion on synthetic screen status text | confirmed |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - ESLint] ReadonlyArray<T> → readonly T[]**
- **Found during:** Task 2 (expo lint run)
- **Issue:** Project ESLint rule `@typescript-eslint/array-type` forbids `ReadonlyArray<T>`. Task 1 used `ReadonlyArray<MerchantSeed>` in merchants.ts and `ReadonlyArray<T>` in rng.ts.
- **Fix:** Replaced with `readonly MerchantSeed[]` and `readonly T[]` respectively.
- **Files modified:** `src/lib/synthetic/merchants.ts`, `src/lib/synthetic/rng.ts`
- **Commit:** 6a3ffa0 (inline fix before Task 2 commit)

### Plan Spec vs. Implementation Notes

1. **i18n key placement:** Plan specified `t('onboarding.synthetic_loading_title')` — key placed inside the `onboarding` namespace in en/uk.json matching this access path exactly.

2. **Salary distribution:** Plan said "insert one salary on day 1". Implementation extends to days 1, 31, 61 (one per 30-day window in a 90-day dataset) — gives a more realistic income distribution without breaking the test assertion (`at least 1 salary row`).

3. **`@data/*` alias usage:** categoriesRepo, accountsRepo, transactionsRepo all import via `@lib/db` and `@lib/time` aliases consistent with SKELETON module path contract.

## Known Stubs

None — all data paths wired. Dashboard reads live from DB via `countTransactions()` and `sumLastNDays(30)`.

**Phase 1 accepted simplifications (documented in SKELETON Out-of-Scope):**
- Dashboard 30-day total is EUR-only rollup (UAH rows excluded from SUM).
- No Skia chart — Phase 2 plan 02-01 introduces charts.
- No FlashList — Phase 2 introduces transaction list.

## Threat Surface Scan

All T-01-03-* mitigations implemented:
- T-01-03-01: `insertManyTransactions` uses parameterized `executeSync(sql, params)` — no string interpolation of merchant_name or other values.
- T-01-03-02: Generator input bounds enforced by caller (days=90, maxPerDay=6 → ceiling ~540+3 salary rows).
- T-01-03-03: No `console.log` of row contents; only `count` is tracked in state.
- T-01-03-04: `INSERT OR IGNORE` + `UNIQUE(source, external_id)` — deterministic `external_id` prevents duplicates on re-run.
- T-01-03-05: currency stored per-row in DB; Phase 1 EUR rollup is an accepted simplification noted in SKELETON.

## Self-Check: PASSED

All 8 created files exist on disk. 4 modified files updated correctly. Both task commits present:
- 9498cb8: feat(p01-03): pure synthetic engine
- 6a3ffa0: feat(p01-03): repos, synthetic ingest screen, Phase 1 dashboard
