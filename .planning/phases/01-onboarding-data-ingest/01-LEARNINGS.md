---
phase: 1
phase_name: "onboarding-data-ingest"
project: "SOLDI"
generated: "2026-05-13"
counts:
  decisions: 16
  lessons: 8
  patterns: 12
  surprises: 7
missing_artifacts:
  - "UAT.md (not produced — device approval recorded inline in 01-04-SUMMARY)"
  - "CONTEXT.md (no /gsd-discuss-phase was run; locked decisions captured in 01-SKELETON.md instead)"
  - "RESEARCH.md (research disabled in config; Walking Skeleton supplied architectural research)"
---

# Phase 1 Learnings: Onboarding + Data Ingest

## Decisions

### op-sqlite v15 executeSync (sync, one statement per call)
DB layer uses `db.executeSync(sql, params)` (synchronous, single-statement) rather than the v14 async `execute()` API the plan originally assumed.

**Rationale:** Matches current op-sqlite v15 surface; synchronous flow simplifies migration runner; `executeSync` is the only path that has stable typings in the codebase.
**Source:** 01-01-SUMMARY.md (decisions + deviation #1)

---

### splitStatements() helper for multi-statement migration SQL
A `splitStatements(sql: string): string[]` helper was added to `src/lib/db/index.ts`; `runMigrations` splits each migration's SQL and executes statements one at a time.

**Rationale:** `executeSync` rejects multi-statement strings. Migration 001 (schema + seed) exceeds one statement, so a chunker is mandatory.
**Source:** 01-01-SUMMARY.md (deviation #2)

---

### better-sqlite3 as devDep for the db-migration test (not just a shim)
`better-sqlite3` + `@types/better-sqlite3` are real devDependencies, not optional. The test runner prioritises better-sqlite3 over the op-sqlite Node shim.

**Rationale:** op-sqlite Node shim has a known PRAGMA read bug in executeSync. CI must run a real migration test, not skip.
**Source:** 01-01-SUMMARY.md (decisions)

---

### tests/ excluded from main apps/mobile/tsconfig.json
Tests have their own `tests/tsconfig.json` with `module: NodeNext`; the main tsconfig excludes `tests/**`.

**Rationale:** NodeNext/ESM module style for tests collides with expo's bundler types when both are compiled by a single tsc invocation.
**Source:** 01-01-SUMMARY.md (deviation #4)

---

### Zustand persist + expo-secure-store adapter — never AsyncStorage
The onboarding store persists via a `secureStorage` adapter that wraps `secureGet/secureSet/secureDelete`. AsyncStorage is banned project-wide.

**Rationale:** Token + state never land in unencrypted storage. Phase 5 biometric gate and Phase 3 AI safety both depend on this baseline.
**Source:** 01-01-SUMMARY.md + CLAUDE.md project rules

---

### node:test + tsx for pure-logic unit tests
Unit tests run via `npx tsx tests/<file>` using Node's built-in `node:test` runner.

**Rationale:** Zero Jest config; matches the pure-function shape of synthetic generator, money helpers, csv parser, monobank mapper. Faster cold-start than jest+ts-jest. tsx pinned in devDependencies (`^4.21.0`) so verify is deterministic.
**Source:** 01-01-SUMMARY.md (tech_stack patterns)

---

### Explicit 4-branch if/else for typedRoutes (not template literal)
`choose(source)` in `app/onboarding/data-source.tsx` is an explicit 4-branch `if/else if` block with literal route strings, not `router.push(\`/onboarding/${source}\`)`.

**Rationale:** expo-router typedRoutes type-checks string literals only. Also gives a grep-friendly acceptance-criteria match for the 4 literal paths. T-01-02-01 (route literal tampering) mitigation.
**Source:** 01-02-SUMMARY.md (deviation #1)

---

### mulberry32 seedable PRNG for deterministic synthetic
`mulberry32(seed)` produces the synthetic stream. Production seeds with `Math.floor(Date.now()/1000)` for per-run variance; tests pass any fixed seed.

**Rationale:** Determinism makes Test 1 (identical output for identical seed) trivially provable. mulberry32 is ~5 lines and bias-acceptable for this use.
**Source:** 01-03-SUMMARY.md (decisions)

---

### slug → name_en lookup at DB query time (no hardcoded category ids)
`getCategoryIdBySlug('groceries')` resolves to id via `SELECT id FROM categories WHERE name_en = ?` each call.

**Rationale:** Future re-seeding or category renames stay compatible; ids are not embedded in code. Costs one query per insert batch — negligible.
**Source:** 01-03-SUMMARY.md (decisions)

---

### description column NULL for all 4 ingest paths (Phase 3 AI safety)
synthetic, monobank, CSV, and manual all insert `description: null`. Phase 3 AI infers from `category + merchant_name + amount` aggregates only.

**Rationale:** GDPR + project rule: no raw transaction text crosses to the LLM backend. Designed into the data layer from day 1, not bolted on Phase 3.
**Source:** 01-03-SUMMARY.md + 01-04-SUMMARY.md (T-01-04-07)

---

### Token saved to secure-store AFTER all API calls succeed
`monobank.tsx` calls `getMonobankClient → getMonobankStatement → insertManyTransactions` THEN `secureSet('monobank_token', token)`. Never before.

**Rationale:** Prevents persisting a bad/revoked token. If validation fails the secure-store stays empty and the next attempt starts clean.
**Source:** 01-04-SUMMARY.md (decisions)

---

### monobank Phase 1 syncs primary account only (B3 sanctioned)
`getMonobankStatement(token, client.accounts[0].id, ...)` — multi-account picker explicitly deferred to Phase 5.

**Rationale:** Plan-checker B3 BLOCKER required this reduction be sanctioned in SKELETON Out of Scope, not silently shipped. Now traceable.
**Source:** 01-04-SUMMARY.md + 01-SKELETON.md Out of Scope

---

### B4 zero-row guard: `result.inserted === 0 && finalRows.length > 0`
CSV import shows `t('onboarding.csv_no_rows_imported')` error when every parsed row had categorySlug resolve fail, instead of silent success.

**Rationale:** Defensive UX — silent zero-import would look identical to a happy import. Catches "empty categories table" footgun observed during testing.
**Source:** 01-04-SUMMARY.md (B4 fix, T-01-04-08)

---

### B2 contract: MappedCsvRow.categorySlug always defined
`csvRowsToTransactions` defaults `categorySlug = categoryForMcc(mcc ?? 0, 'misc')` — never undefined. Test 11 asserts this.

**Rationale:** Without contract closure, no-MCC rows silently fall through `getCategoryIdBySlug(undefined)`. B2 BLOCKER demanded explicit "always a string" type.
**Source:** 01-04-SUMMARY.md (B2 fix, csv-parser Test 11)

---

### djb2 hash for stable CSV external_id (de-dupe on re-import)
CSV rows get `external_id = "csv-" + djb2(date + amount + merchant)`. Manual entry uses djb2 too.

**Rationale:** `UNIQUE(source, external_id)` + `INSERT OR IGNORE` deduplicate re-imports without comparing every field. djb2 is fast and collision-acceptable for ≤200k rows.
**Source:** 01-04-SUMMARY.md (patterns)

---

### Salary distribution = days {1, 31, 61} (one per 30-day window across 90 days)
Synthetic generator emits 3 salary credits across the 90-day window instead of the plan's literal "one salary on day 1".

**Rationale:** More realistic income distribution; test assertion is "at least 1 salary row" so spec is preserved while improving fidelity.
**Source:** 01-03-SUMMARY.md (plan vs implementation notes)

---

## Lessons

### op-sqlite v15 API differs significantly from v14
Plan assumed `execute()` (async) + `rows._array[]`. Reality: `executeSync()` (sync) + `rows: Array<Record>`. Affected 4 separate auto-fixes in 01-01 alone.

**Context:** When the plan was drafted, the planner referenced older op-sqlite docs. The executor caught the drift at Task 2a and patched the entire DB layer + tests + helper splitStatements in one commit.
**Source:** 01-01-SUMMARY.md (deviation #1, #2)

---

### `executeSync` rejects multi-statement SQL strings
A single migration SQL block (schema + seed) errored out under executeSync; required splitting into individual statements via a helper.

**Context:** Discovered during db-migration.test.ts iteration, not during initial DB module write. Test-first caught it before it could ship broken to a device.
**Source:** 01-01-SUMMARY.md (deviation #2)

---

### `better-sqlite3 .pragma()` returns an array on read, not a number
`db.pragma('user_version')` returns `[{user_version: 0}]`. The write path is `db.pragma('user_version = 1')`, not `db.run('PRAGMA user_version = 1')`.

**Context:** First version of db-migration.test.ts assumed `pragma()` returned a primitive number; assertion failed; shim updated to use `{simple: true}` for reads.
**Source:** 01-01-SUMMARY.md (deviation #3)

---

### ESLint `@typescript-eslint/array-type` forbids both `Array<T>` AND `ReadonlyArray<T>`
Project lint enforces `T[]` / `readonly T[]` shorthand only. Tripped in synthetic plan (ReadonlyArray) and again in monobank/CSV plan (Array).

**Context:** Two separate plans hit the same rule on different generic-array forms. Worth pre-checking lint config when planning any new module that holds collections.
**Source:** 01-03-SUMMARY.md (deviation #1) + 01-04-SUMMARY.md (deviation #2)

---

### `AutoCapitalize` type is not a public export of react-native 0.81.5
`import type { AutoCapitalize } from 'react-native'` fails. Replace with inline literal union `'none' | 'sentences' | 'words' | 'characters'`.

**Context:** TextField component's prop typing tripped tsc. Common across RN versions — many "obvious" prop types live only in internal modules.
**Source:** 01-04-SUMMARY.md (deviation #3)

---

### Test DB artifacts (`t-*.db`) need explicit .gitignore entry
`db-migration.test.ts` writes temp DBs to `apps/mobile/`. Without ignore patterns these show up as untracked noise after every test run.

**Context:** Caught at end of plan 01-04 because by then several plans had written test DBs; pattern added retroactively.
**Source:** 01-04-SUMMARY.md (deviation #4)

---

### `gsd-tools phase-plan-index` requires phase-prefixed plan IDs in depends_on
Bare numerics (`"01"`, `"02"`) are not resolved against plan IDs (`"01-01"`, `"01-02"`). Without the full form, all plans collapse to Wave 1.

**Context:** Caught at start of execute-phase when waves map returned `{1: [01-01,01-02,01-03,01-04]}` despite frontmatter declaring waves 1/2/2/3. Fixed by rewriting depends_on across all 4 plans, committed as a planning-defect fix (`dec621e`).
**Source:** Execution flow (not in any single SUMMARY; documented here for future plans)

---

### plan-checker BLOCKER class can be cleared in a single revision pass
4 BLOCKERs + 5 WARNINGs were all resolved in iteration 1 of the revision loop; iteration 2 passed clean. No stall-handling needed.

**Context:** When BLOCKERs are concrete and the planner has been given the exact fix recipe inline (not just "address these issues"), one revision is typically enough. Use Send Message with literal fix instructions per issue.
**Source:** plan-phase revision loop (iteration 1 → REVISION COMPLETE → iteration 2 → VERIFICATION PASSED)

---

## Patterns

### Walking Skeleton — single Wave-1 plan locks architecture, later waves plug in
01-01 (Walking Skeleton) was the only plan in Wave 1: scaffolds DB, i18n, secure-store, providers, boot redirector, first onboarding screen. 01-02/03/04 import its exports without modifying its files.

**When to use:** First plan of a new feature phase, especially when downstream plans share infrastructure (DB, auth, state). Avoids file-modified overlap across waves and lets later plans run in parallel safely.
**Source:** 01-SKELETON.md + 01-01-SUMMARY.md

---

### Reanimated v4 useSharedValue + withDelay + withTiming staggered entrance
SourceTile uses one `opacity` + one `translateY` shared value, animated with `withDelay(index * 100, withTiming(...))`.

**When to use:** List-of-N entrance where each item is offset from the previous by a fixed delay; no per-item state machine needed. Cheap, single render.
**Source:** 01-02-SUMMARY.md (patterns)

---

### Pressable style callback for pressed feedback (no extra shared values)
SourceTile uses `<Pressable style={({pressed}) => [styles.tile, pressed && styles.pressed]}>` instead of Reanimated for the press scale/opacity dip.

**When to use:** Press feedback that's purely visual (no spring, no fling). RN's built-in pressed prop is enough; saves one shared value per tile.
**Source:** 01-02-SUMMARY.md (patterns)

---

### BEGIN/COMMIT + `INSERT OR IGNORE` for idempotent bulk inserts
`insertManyTransactions` wraps the loop in `BEGIN TRANSACTION; … COMMIT;` and each row uses `INSERT OR IGNORE` against `UNIQUE(source, external_id)`.

**When to use:** Any bulk ingest where re-runs are likely (CSV re-import, monobank re-sync). Atomic + de-duped without explicit existence checks.
**Source:** 01-03-SUMMARY.md (patterns)

---

### `accessibilityLiveRegion="polite"` for VoiceOver progress announcements
Synthetic ingest screen status text uses `accessibilityLiveRegion="polite"` so VoiceOver reads "Generating… 540 rows… Done" without the user manually focusing the element.

**When to use:** Any async screen with status text that updates during a long-running operation. Pairs with progress indicators for non-VO users.
**Source:** 01-03-SUMMARY.md (patterns)

---

### `useFocusEffect` (expo-router) for live-reload on tab focus
Phase 1 dashboard refreshes count + total via `useFocusEffect(() => { reload(); }, [])` so navigating back to the tab shows fresh data.

**When to use:** Tab-bar dashboards or any screen reachable from multiple routes that needs to re-query on focus rather than on mount.
**Source:** 01-03-SUMMARY.md (patterns)

---

### N-phase state machine for async ingest screens (paste → … → done|error)
monobank.tsx uses a 7-phase machine: paste → validating → fetching-client → fetching-statement → inserting → done | error. Each phase has its own UI block.

**When to use:** Any onboarding ingest with multiple awaited steps where the user benefits from seeing which step is in flight (and which one failed). Beats a single "loading" spinner.
**Source:** 01-04-SUMMARY.md (patterns)

---

### RFC 4180 char-by-char CSV parser with CRLF + quoted-field + auto-delimiter
`parseCsv` is a hand-rolled state machine, not a regex split. Handles `"quoted, field"`, doubled `""` escapes, CRLF/LF/CR line endings, comma/semicolon/tab auto-detect.

**When to use:** Untrusted CSV input from a document picker. Library deps would add weight; this is ~60 lines and respects the 5MB cap with a streaming check.
**Source:** 01-04-SUMMARY.md (patterns)

---

### Modal overlay = `COLORS.textPrimary` @ opacity 0.9 (warm overlay)
Instead of a semi-transparent black, modals use the editorial deep-brown token at 0.9 opacity.

**When to use:** Modal backdrops in this design system. Stays inside the warm palette and keeps text-on-overlay contrast at AA.
**Source:** 01-04-SUMMARY.md (plan vs implementation note)

---

### expo-router typed literal routes — explicit string per branch
4 separate `router.push('/onboarding/synthetic' | '/onboarding/manual' | …)` calls instead of `router.push(\`/onboarding/${source}\`)`.

**When to use:** When typedRoutes is enabled AND when acceptance-criteria grep tests need to find literal route strings.
**Source:** 01-02-SUMMARY.md (deviation #1)

---

### Source attribution in deviations: `[Rule N - Type]` prefix
Each auto-fix during execution is labeled `[Rule 1 - Bug]`, `[Rule 1 - Acceptance criteria]`, `[Rule 2 - Missing critical]`, etc.

**When to use:** Whenever the executor auto-fixes something the plan didn't predict. Makes traceability post-hoc trivial — search SUMMARY for `Rule N` to find all auto-fixes of that class.
**Source:** 01-01 / 01-03 / 01-04-SUMMARY.md (deviations sections)

---

### Repository pattern with slug → id lookup at query time
`categoriesRepo.getCategoryIdBySlug(slug)` queries DB each call; ids never appear in code paths above the repo.

**When to use:** Reference data (categories, MCC tables) where rows might be reseeded across versions. Slugs are stable identifiers; ids are not.
**Source:** 01-03-SUMMARY.md (patterns)

---

## Surprises

### op-sqlite shipped a v15 with a near-total API rewrite vs v14
The plan referenced v14 API throughout; reality required 4 separate auto-fixes (executeSync, splitStatements, rows access, PRAGMA shim) in 01-01 alone. Each was an obvious-after-the-fact change, but the cumulative drift surprised both planner and executor.

**Impact:** Single plan took ~75 minutes (longest of the phase) almost entirely due to v15-vs-v14 reconciliation. Worth pinning op-sqlite as a "verify-API-before-planning" item in future DB-heavy phases.
**Source:** 01-01-SUMMARY.md (4 deviations on the same plan)

---

### After 01-01, subsequent plans were dramatically faster
01-01 = ~75 min. 01-02 = ~3 min. 01-03 = ~40 min. 01-04 = ~12 min. Wave 1 carried the architectural cost; Waves 2 and 3 mostly composed against the spine.

**Impact:** Confirms Walking Skeleton as a planning bet — front-load the integration risk into one plan. Future phases should look for a similar single-plan-spine if multiple downstream plans share infrastructure.
**Source:** 01-01..04-SUMMARY.md (metrics blocks)

---

### plan-checker iteration 1 cleared every issue; iteration 2 was redundant
4 BLOCKERs + 5 WARNINGs identified and addressed in one revision pass. The second checker run found nothing new and confirmed all fixes landed. The `Max 3 Iterations` budget went unused.

**Impact:** Suggests the revision loop can be short-circuited when the planner has clear, atomic fix instructions per issue. Worth keeping the 3-iteration cap as safety, but expect iteration 1 to clear most plans.
**Source:** plan-phase iteration 1 → REVISION COMPLETE → iteration 2 → VERIFICATION PASSED

---

### `AutoCapitalize` type missing from react-native 0.81.5 public exports
TextField's auto-capitalize prop seemed like it should have a public type — it doesn't. Inline literal union was the fix.

**Impact:** Small, but a reminder that "obvious" RN prop types frequently live in internal modules. Future plans referencing RN component prop types should accept that the type may need an inline replacement.
**Source:** 01-04-SUMMARY.md (deviation #3)

---

### Reanimated v4 + Pressable style callback combo was simpler than the plan budgeted
SourceTile entrance + press feedback ended up using one Reanimated shared value pair and one Pressable callback. No additional shared values, no spring config, no per-tile state. Plan 01-02 completed in ~3 minutes — the fastest of the phase.

**Impact:** Don't over-engineer entrance animations. The default `withDelay(index * 100, withTiming(...))` + `pressed` boolean is enough for 90% of onboarding tile UIs.
**Source:** 01-02-SUMMARY.md (metrics + patterns)

---

### `gsd-tools phase-plan-index` silently grouped all plans into Wave 1
Frontmatter declared waves 1/2/2/3 correctly; depends_on was the only field gsd-tools used. Because depends_on used bare `"01"` instead of full plan IDs `"01-01"`, the resolver returned no dependencies → all plans got wave 1 → execute-phase would have run them in a single "wave".

**Impact:** Caught by inspecting the waves map before dispatching executors. The fix was a 4-line edit across 3 plan files (committed as `dec621e`). Future plan-checker dimensions should grep depends_on for short-form IDs and BLOCKER on them.
**Source:** Execution flow + gsd-tools phase-plan-index output

---

### 51/51 unit tests passed on first run after revision
After the revision, every test file ran clean on first invocation. No flakes, no port collisions, no temp-DB races. Verifier confirmed the same numbers.

**Impact:** Suggests the node:test + tsx + pure-function strategy is producing reliable tests. Worth keeping this pattern for Phase 2 (charts/list logic) and Phase 3 (AI prompt assembly) where determinism matters.
**Source:** VERIFICATION.md + 01-03/04-SUMMARY.md test counts
