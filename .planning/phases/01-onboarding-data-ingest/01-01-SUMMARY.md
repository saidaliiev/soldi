---
phase: 01-onboarding-data-ingest
plan: 01
subsystem: foundation
tags: [db, i18n, onboarding, store, providers, sqlite, unit-tests]
dependency_graph:
  provides:
    - "@lib/db: getDB/runMigrations/getSchemaVersion/openTestDB/splitStatements"
    - "@lib/money: toCents/fromCents/parseAmount/formatMoney"
    - "@lib/time: nowSeconds/toSeconds/fromSeconds/startOfDaySeconds/formatDateISODay"
    - "@lib/secure: secureGet/secureSet/secureDelete"
    - "@lib/http: httpJson/HttpError"
    - "@lib/i18n: i18n/initI18n/setLanguage"
    - "@stores/onboarding: useOnboardingStore"
    - "@api/queryClient: queryClient"
    - "@components/PressableButton: PressableButton"
    - "app/index.tsx: boot redirector"
    - "app/onboarding/welcome.tsx: language pick screen"
    - "app/onboarding/data-source.tsx: stub screen"
  requires:
    - "Phase 0 scaffold: fonts, design tokens, expo-router, tsconfig paths"
  affects:
    - "01-02: imports @lib/db, @stores/onboarding, @lib/i18n"
    - "01-03: imports @lib/db, @lib/money, @lib/time"
    - "01-04: imports @lib/db, @lib/http, @lib/secure"
tech_stack:
  added:
    - "tsx ^4.21.0 (devDep) — node:test runner"
    - "better-sqlite3 + @types/better-sqlite3 (devDep) — db-migration test fallback"
  patterns:
    - "op-sqlite v15 executeSync (one statement per call; splitStatements() chunker)"
    - "Zustand persist + expo-secure-store adapter (no AsyncStorage anywhere)"
    - "node:test + tsx for pure-logic unit tests"
key_files:
  created:
    - apps/mobile/src/lib/db/schema.sql.ts
    - apps/mobile/src/lib/db/migrations.ts
    - apps/mobile/src/lib/db/index.ts
    - apps/mobile/src/lib/money.ts
    - apps/mobile/src/lib/time.ts
    - apps/mobile/src/lib/secure.ts
    - apps/mobile/src/lib/http.ts
    - apps/mobile/src/lib/i18n/index.ts
    - apps/mobile/src/lib/i18n/en.json
    - apps/mobile/src/lib/i18n/uk.json
    - apps/mobile/src/stores/onboarding.ts
    - apps/mobile/src/api/queryClient.ts
    - apps/mobile/src/components/PressableButton.tsx
    - apps/mobile/app/index.tsx
    - apps/mobile/app/onboarding/_layout.tsx
    - apps/mobile/app/onboarding/welcome.tsx
    - apps/mobile/app/onboarding/data-source.tsx
    - apps/mobile/tests/tsconfig.json
    - apps/mobile/tests/money.test.ts
    - apps/mobile/tests/db-migration.test.ts
  modified:
    - apps/mobile/app.json (added @op-engineering/op-sqlite plugin)
    - apps/mobile/package.json (tsx + better-sqlite3 devDeps)
    - apps/mobile/app/_layout.tsx (providers + DB migration on mount)
    - apps/mobile/tsconfig.json (exclude tests/ from main compilation)
decisions:
  - "Use executeSync (not execute) for migration runner — consistent with op-sqlite v15 Node shim"
  - "splitStatements() added to db/index.ts — op-sqlite v15 rejects multi-statement SQL"
  - "tests/ excluded from apps/mobile/tsconfig.json — avoids NodeNext/ESM conflict with expo types"
  - "better-sqlite3 shim prioritised over op-sqlite Node shim in db test — op-sqlite shim has PRAGMA read bug"
  - "unstable_settings removed from _layout.tsx — Index now controls initial route"
  - "better-sqlite3 added as devDep (not optional) so CI gets a real migration test, not a skip"
metrics:
  duration: "~75 minutes"
  completed_date: "2026-05-13"
  tasks_completed: 3
  files_created: 20
  files_modified: 4
---

# Phase 01 Plan 01: Walking Skeleton Summary

SQLite migration layer, i18n, persisted onboarding store, TanStack QueryClient, root layout providers, boot redirector, and Welcome screen with Reanimated v4 entrance animation — the architectural spine that all later Phase 1 plans attach to.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add @op-engineering/op-sqlite plugin to app.json; add tsx devDep | d3c0807 |
| 2a | DB layer (schema + migrations + helpers) + Money helpers + unit tests | 026b6fd |
| 2b | i18n (en+uk JSON + init module) + secure-store + http + time helpers | b27ca6a |
| 3 | Wire store, QueryClient, root layout, boot redirector, onboarding screens | d8c900d |

## Verification Gate Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npx expo lint` | exit 0 (0 errors, 0 warnings) |
| `npx tsx tests/money.test.ts` | 14/14 pass |
| `npx tsx tests/db-migration.test.ts` | 1/1 pass (better-sqlite3 backend) |
| No AsyncStorage imports/usage | confirmed |
| No inline hex colors in new files | confirmed |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] op-sqlite v15 API differs from plan spec**
- **Found during:** Task 2a
- **Issue:** Plan referenced `db.execute()` (async) + `rows._array[]` (old v14 API). op-sqlite v15 has `db.executeSync()` (sync) + `rows: Array<Record<string,Scalar>>` (flat array, no `_array` wrapper).
- **Fix:** All DB layer code uses `executeSync`; `getSchemaVersion` and `runMigrations` updated to use `result.rows[0]` access pattern.
- **Files modified:** `src/lib/db/index.ts`
- **Commit:** 026b6fd

**2. [Rule 1 - Bug] executeSync rejects multi-statement SQL**
- **Found during:** Task 2a (db-migration test)
- **Issue:** `executeSync` accepts one SQL statement per call. The plan's migration SQL is a single large multi-statement string (SCHEMA_001 + SEED).
- **Fix:** Added `export function splitStatements(sql: string): string[]` to `db/index.ts`. `runMigrations` now splits each migration's SQL and executes statements one by one.
- **Files modified:** `src/lib/db/index.ts`; `tests/db-migration.test.ts` updated accordingly.
- **Commit:** 026b6fd

**3. [Rule 1 - Bug] better-sqlite3 shim PRAGMA handling**
- **Found during:** Task 2a (db-migration test iterations)
- **Issue:** `db.pragma('user_version')` returns `[{user_version: 0}]` (array), not a number. `db.pragma('user_version = 1')` (via `pragma()`) is the correct write path, not `db.run('PRAGMA user_version = 1')`.
- **Fix:** Shim updated to use `db.pragma(name, { simple: true })` for reads and `db.pragma('user_version = N')` for writes. Fallback test path prioritises better-sqlite3 over op-sqlite Node shim (the latter has a known PRAGMA read bug in its executeSync implementation).
- **Files modified:** `tests/db-migration.test.ts`
- **Commit:** 026b6fd

**4. [Rule 2 - Missing critical] tests/ directory excluded from main tsconfig**
- **Found during:** Task 2a
- **Issue:** The root `tsconfig.json` included `tests/**` which caused tsc to fail due to NodeNext/ESM module conflicts (`import('better-sqlite3')` has no types in the main project scope).
- **Fix:** Added `"exclude": ["tests/**"]` to `apps/mobile/tsconfig.json`. Tests have their own `tests/tsconfig.json` with `module: NodeNext`.
- **Files modified:** `apps/mobile/tsconfig.json`
- **Commit:** 026b6fd

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `app/onboarding/data-source.tsx` | "Coming next in plan 01-02" | Intentional placeholder; plan 01-02 replaces this screen |

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes beyond those documented in the plan's `<threat_model>`. All T-01-01-* mitigations implemented:
- T-01-01-01: onboarding state in expo-secure-store via `secureStorage` adapter.
- T-01-01-02: migration failure logs only `error.name` in `_layout.tsx`.
- T-01-01-06: SecureKey literal union enforced at TypeScript level.

## Self-Check: PASSED

All 15 created source files exist on disk. All 4 task commits present in git log:
- d3c0807, 026b6fd, b27ca6a, d8c900d

## Next Plan Handoff Notes

Plan 01-02 (data-source screen) can import:
- `@lib/db` — `getDB()`, `runMigrations()`, `getSchemaVersion()`
- `@stores/onboarding` — `useOnboardingStore`, `DataSource` type
- `@lib/i18n` — `i18n`, `setLanguage`
- `@lib/secure` — `secureGet`, `secureSet`
- `@components/PressableButton` — ready to reuse in picker tiles

`app/onboarding/data-source.tsx` is a stub — plan 01-02 replaces it entirely.
