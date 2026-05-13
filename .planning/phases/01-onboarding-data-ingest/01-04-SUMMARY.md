---
phase: 01-onboarding-data-ingest
plan: 04
subsystem: data-ingest
tags: [monobank, csv, manual, onboarding, security, i18n, unit-tests]
dependency_graph:
  requires:
    - "01-01: @lib/http (httpJson/HttpError), @lib/secure (secureSet), @lib/time (nowSeconds)"
    - "01-02: app/onboarding/monobank.tsx stub (replaced), csv.tsx stub (replaced), manual.tsx stub (replaced)"
    - "01-03: @data/transactionsRepo (insertManyTransactions), @data/categoriesRepo (getCategoryIdBySlug/listCategories), @data/accountsRepo (ensureDefaultAccount), @lib/synthetic/mcc (categoryForMcc)"
  provides:
    - "@api/monobank: getMonobankClient/getMonobankStatement — typed monobank HTTP client"
    - "@lib/monobank/mcc-table: resolveMcc — dual-MCC fallback (mcc vs originalMcc)"
    - "@lib/monobank/mapper: mapMonobankItems/isPotentiallyOversizedBatch — monobank → InsertableTransaction"
    - "@lib/csv/parser: parseCsv/CsvParseError — RFC 4180, 5MB cap, auto-delimiter"
    - "@lib/csv/mappers: detectColumns/csvRowsToTransactions/djb2/MappedCsvRow — B2 contract: categorySlug always defined"
    - "@data/merchantOverridesRepo: addMerchantOverride/listMerchantOverrides/findOverrideForMerchant"
    - "@components/TextField: label+input+error+a11y, secureTextEntry, 44pt min"
    - "app/onboarding/monobank.tsx: 7-phase token paste + sync flow (primary account only)"
    - "app/onboarding/csv.tsx: document-picker + RFC4180 parse + preview + import with B4 zero-row guard"
    - "app/onboarding/manual.tsx: single-entry form, date quick-pick, category modal, merchant override seed"
  affects:
    - "Phase 3 AI: description always null — no raw text reaches future AI pipeline"
    - "02-xx: (tabs)/index.tsx dashboard reads from the same transactions DB populated by all 4 ingest paths"
tech_stack:
  added: []
  patterns:
    - "7-phase state machine in monobank.tsx (paste→validating→fetching-client→fetching-statement→inserting→done|error)"
    - "RFC 4180 char-by-char CSV state machine with CRLF + quoted-field + auto-delimiter"
    - "djb2 hash for stable CSV external_id (de-dupe on re-import)"
    - "globalThis.fetch(asset.uri) for document-picker URI reading on iOS"
    - "B2 contract: MappedCsvRow.categorySlug always defined via categoryForMcc(mcc ?? 0, 'misc')"
    - "B3 scope reduction: client.accounts[0] only — multi-account picker deferred"
    - "B4 zero-row guard: result.inserted === 0 surfaces csv_no_rows_imported error"
    - "description always null across all ingest paths (Phase 1 AI safety)"
key_files:
  created:
    - apps/mobile/src/api/monobank.ts
    - apps/mobile/src/lib/monobank/mcc-table.ts
    - apps/mobile/src/lib/monobank/mapper.ts
    - apps/mobile/src/lib/csv/parser.ts
    - apps/mobile/src/lib/csv/mappers.ts
    - apps/mobile/src/data/merchantOverridesRepo.ts
    - apps/mobile/src/components/TextField.tsx
    - apps/mobile/tests/csv-parser.test.ts
    - apps/mobile/tests/monobank-mapper.test.ts
  modified:
    - apps/mobile/app/onboarding/monobank.tsx (stub → full 7-phase flow)
    - apps/mobile/app/onboarding/csv.tsx (stub → full CSV import)
    - apps/mobile/app/onboarding/manual.tsx (stub → full entry form)
    - apps/mobile/src/lib/i18n/en.json (21 new keys)
    - apps/mobile/src/lib/i18n/uk.json (21 new keys)
decisions:
  - "Token saved to secure-store AFTER all API calls succeed — never before (prevent storing bad token)"
  - "monobank Phase 1 syncs client.accounts[0] only — B3 scope reduction sanctioned in SKELETON"
  - "description column is null for all three ingest paths (monobank, CSV, manual) — Phase 3 AI safety"
  - "CSV column detection uses string Set heuristics — detectColumns returns null on unknown headers (Out-of-Scope)"
  - "csvRowsToTransactions receives accountId param but caller sets account_id after mapping — accountId used via void to suppress lint"
  - "B4 zero-row guard fires only when finalRows.length > 0 to avoid false error on truly empty CSVs"
metrics:
  duration: "~12 minutes"
  completed_date: "2026-05-13"
  tasks_completed: 3
  tasks_pending_human_verify: 1
  files_created: 9
  files_modified: 5
---

# Phase 01 Plan 04: monobank + CSV + Manual Ingest Summary

Three remaining ingest paths implemented end-to-end: monobank token paste (primary account, 31 days, B3-scoped), RFC 4180 CSV import with column heuristics and B4 zero-row guard, and a manual single-entry form with category picker and merchant override seeding. All converge on `insertManyTransactions` from plan 01-03.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Pure adapters — monobank client + mapper + CSV parser/mappers + unit tests (22/22 pass) | 167a7ab | 7 created |
| 2 | TextField component + merchantOverridesRepo + manual entry form + i18n manual keys | 7e51f33 | 5 changed |
| 3 | monobank token paste screen (B3 primary-only) + CSV import screen (B4 zero-row guard) + i18n monobank/csv keys | a1389de | 4 changed |

## Verification Gate Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npx expo lint` | exit 0 (0 errors, 0 warnings) |
| `npx tsx tests/csv-parser.test.ts` | 11/11 pass (incl. Test 11: B2 contract) |
| `npx tsx tests/monobank-mapper.test.ts` | 11/11 pass |
| No console.* in monobank paths | confirmed |
| Token never in URL template literal | confirmed |
| `client.accounts[0]` in monobank.tsx (B3) | confirmed |
| `result.inserted === 0` guard in csv.tsx (B4) | confirmed |
| `secureSet('monobank_token'` in monobank.tsx | confirmed |
| No AsyncStorage in any new file | confirmed |
| No inline hex in any new file | confirmed |

## Checkpoint: Task 4 Awaiting Human Verification

**Task 4 is a `checkpoint:human-verify` — automated portion complete.**

The human must run a timed end-to-end test on a physical iPhone to close ONBD-03 (< 90 seconds for all four ingest paths). See Task 4 `<how-to-verify>` in 01-04-PLAN.md for exact steps.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript null-narrowing in manual.tsx submit handler**
- **Found during:** Task 2 (tsc run)
- **Issue:** `amountFloat` declared as `number | null` earlier in the function. TS couldn't prove it was non-null inside the `setSubmitting` block because the guard used a `valid` boolean flag rather than a direct type guard.
- **Fix:** Added `|| amountFloat === null` to the early return condition alongside `!valid || categoryId === null`. No logic change — purely a type narrowing fix.
- **Files modified:** `app/onboarding/manual.tsx`

**2. [Rule 1 - ESLint] `Array<T>` → `T[]` in monobank.tsx and csv.tsx**
- **Found during:** Task 3 (expo lint run)
- **Issue:** Project ESLint rule `@typescript-eslint/array-type` forbids `Array<T>`. Used in cast for `insertManyTransactions` call.
- **Fix:** Replaced with `T[]` equivalent: `Parameters<typeof insertManyTransactions>[0][number][]`
- **Files modified:** `app/onboarding/monobank.tsx`, `app/onboarding/csv.tsx`

**3. [Rule 1 - Bug] `AutoCapitalize` type not exported from react-native**
- **Found during:** Task 2 (tsc run)
- **Issue:** `TextField.tsx` imported `AutoCapitalize` as a named type from `react-native` — this type is not exported from the module in RN 0.81.5.
- **Fix:** Replaced with an inline literal union `'none' | 'sentences' | 'words' | 'characters'` which is functionally equivalent.
- **Files modified:** `src/components/TextField.tsx`

**4. [Rule 2 - Missing] `.gitignore` for test DB artifacts**
- **Found during:** Task 1 (git status check)
- **Issue:** `npx tsx tests/db-migration.test.ts` (from 01-03) generates `t-*.db` files in `apps/mobile/`. These are not committed but appeared in `git status` as untracked.
- **Fix:** Added `t-*.db` pattern to `apps/mobile/.gitignore`.
- **Files modified:** `apps/mobile/.gitignore`

### Plan Spec vs. Implementation Notes

1. **`csvRowsToTransactions` accountId param:** The function signature accepts `accountId` per plan spec, but the caller sets `account_id` in the `.map()` step after calling the function (csv.tsx and monobank.tsx do this explicitly). The `accountId` param is acknowledged with `void accountId` to satisfy the linter. This matches the plan's key_link contract (`csv.tsx` sets account_id after mapping).

2. **Modal overlay opacity:** The `modalOverlay` style uses `backgroundColor: COLORS.textPrimary` at `opacity: 0.9` instead of a semi-transparent black. This uses the token system correctly — COLORS.textPrimary is the deep warm brown (`#2C1810`) which provides a warm-toned overlay consistent with the editorial palette.

## Known Stubs

None — all three ingest paths fully wired to `insertManyTransactions`. Input `placeholder` text ("0.00", "Tesco") in TextField are UI affordances, not data stubs.

**Accepted Phase 1 limitations (documented in SKELETON Out-of-Scope):**
- monobank: primary account only (B3). Multi-account picker → Phase 5.
- CSV: `detectColumns` returns null for unrecognised column headers. Manual column mapping UI → future plan.
- monobank: no background sync — on-demand only in Phase 1.

## Threat Surface Scan

All T-01-04-* mitigations implemented and verified:
- T-01-04-01: No console.* in monobank API/mapper/screen. httpJson strips X-Token from errors.
- T-01-04-02: HttpError.bodyText never rendered to UI. Only translated message keys shown.
- T-01-04-03: Token stored via `secureSet` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (confirmed in secure.ts).
- T-01-04-04: `BASE_URL = 'https://api.monobank.ua'` is a hardcoded literal — not derived from input.
- T-01-04-05: `maxBytes: 5_000_000` throws CsvParseError 'too-large' before parsing.
- T-01-04-06: Parser returns plain strings. Nothing is eval'd. SQL params in insertManyTransactions.
- T-01-04-07: `description: null` for all three paths — no raw text can reach Phase 3 AI.
- T-01-04-08: B4 guard: `result.inserted === 0 && finalRows.length > 0` → explicit error, no silent nav.
- T-01-04-09: Manual merchant_name goes to local DB only. Accepted.
- T-01-04-10: Rate-limit (429) shows message + retry button. No auto-loop.

No new threat surface beyond the plan's threat model.

## Self-Check: PASSED

All 9 created source files exist on disk. All 3 task commits present:
- 167a7ab: feat(p01-04): Task 1 — monobank client, CSV parser/mappers, tests
- 7e51f33: feat(p01-04): Task 2 — TextField, merchantOverridesRepo, manual entry form
- a1389de: feat(p01-04): Task 3 — monobank token screen + CSV import screen

## Checkpoint: Task 4 — Physical iPhone Test

**Status: APPROVED 2026-05-13**

User ran `npx expo start --tunnel`, scanned QR via Expo Go on physical iPhone, walked all 4 onboarding paths + VoiceOver + force-quit/resume. Approved without per-path timings — confirmed all flows complete within budget and reach the Phase 1 dashboard.

- synthetic: approved (within 90s window)
- manual: approved
- csv: approved (sample CSV import → rows visible in dashboard)
- monobank: approved
- VoiceOver: EN/UK tiles reachable and labelled
- Cold-start persistence: onboarding skipped after first completion (secure-store flag persists)
- No defects logged

Plan 01-04 is therefore code-complete AND device-verified. Phase 1 closes here.
