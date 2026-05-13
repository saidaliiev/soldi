---
phase: 01-onboarding-data-ingest
verified: 2026-05-13T17:10:00+01:00
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Полный прогон onboarding <90s зафиксирован пользователем (Task 4 approved 2026-05-13)"
    expected: "synthetic, manual, csv, monobank — каждый путь укладывается в 90s end-to-end на физическом iPhone"
    why_human: "Task 4 одобрен без записи точных секунд по каждому пути. Суммари содержит 'approved within 90s window' без цифр. SC-1 формально закрыт апрувом, но тайминги в SUMMARY.md отсутствуют. Если ревьюер требует цифр — нужно перегнать тест."
---

# Phase 1: Onboarding + Data Ingest — Verification Report

**Phase Goal:** A new user picks a language, picks a data source, and lands on a populated dashboard within 90 seconds.
**Verified:** 2026-05-13T17:10:00+01:00
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (5 Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Onboarding flow from launch to dashboard <90s (timed) | PASSED (human approved) | Task 4 in 01-04-PLAN.md `status="approved" approved_at="2026-05-13"`. SUMMARY: "all flows complete within budget". No per-path second counts in SUMMARY. |
| 2 | monobank token paste → real transactions in op-sqlite | ✓ VERIFIED | `monobank.tsx`: full 7-phase state machine; `getMonobankClient` + `getMonobankStatement` wired; `insertManyTransactions` called; `secureSet('monobank_token', ...)` line 162 after API success. |
| 3 | CSV file pick → transactions parsed into op-sqlite | ✓ VERIFIED | `csv.tsx`: `getDocumentAsync` → `parseCsv` → `detectColumns` → `csvRowsToTransactions` → `insertManyTransactions`; B4 zero-row guard at line 191; `csv_no_rows_imported` i18n key present. |
| 4 | "synthetic" → 90 days of realistic IE+UA transactions | ✓ VERIFIED | `synthetic.tsx` calls `generateSyntheticTransactions(cfg{days:90, ieRatio:0.7})`; synthetic.test.ts 14/14 pass confirms bounds, IE/UA ratio 0.6-0.8, determinism. |
| 5 | Manual single-transaction add → row in list | ✓ VERIFIED | `manual.tsx`: form validates amount+merchant+categoryId, calls `insertManyTransactions([single_row])`, checks `result.inserted > 0` before navigating; dashboard re-fetches on `useFocusEffect`. |

**Score:** 5/5 truths verified (SC-1 conditionally — user-approved device test, no timestamped seconds in SUMMARY)

---

## Requirement Coverage

| Requirement | Description | File:Evidence | Status |
|-------------|-------------|---------------|--------|
| ONBD-01 | Language pick (EN/UK) during first launch | `welcome.tsx:83-108` — две Pressable tile, `setLanguage` + `changeI18nLanguage` on press, persisted via store | ✓ SATISFIED |
| ONBD-02 | Data source choice: synthetic/manual/monobank/CSV | `data-source.tsx:39-46` — 4-way `choose()`, `setDataSource` записывается в Zustand | ✓ SATISFIED |
| ONBD-03 | Full flow under 90s | Task 4 device approval 2026-05-13 | PASSED (human approved; no per-path timing numbers) |
| DATA-01 | CSV import via document picker | `csv.tsx:73-196` — `getDocumentAsync` → `parseCsv` → `csvRowsToTransactions` → `insertManyTransactions` | ✓ SATISFIED |
| DATA-02 | monobank token → transactions synced | `monobank.tsx:77-167` — full fetch pipeline; token in X-Token header only | ✓ SATISFIED |
| DATA-03 | Manual single transaction add | `manual.tsx:96-165` — form + `insertManyTransactions` + merchant override seeding | ✓ SATISFIED |
| DATA-04 | 90 days of realistic synthetic transactions | `synthetic.tsx:generator call`; 14/14 unit tests pass | ✓ SATISFIED |

---

## Architectural Integrity — Walking Skeleton DoD

| DoD Item | Status | Evidence |
|----------|--------|---------|
| 1. Fonts load (Phase 0) | ✓ | `_layout.tsx:37-58` — useFonts hooks preserved |
| 2. `/` boot redirects unbooted users to `/onboarding/welcome` | ✓ | `index.tsx:15-21` — `Redirect` based on `completed` flag |
| 3. Welcome screen EN/UK pick with Reanimated entrance | ✓ | `welcome.tsx:42-53` — `useSharedValue(0)` → `withTiming(1, {duration:600})` on opacity + translateY |
| 4. Language pick navigates to `/onboarding/data-source` | ✓ | `welcome.tsx:58` — `router.push('/onboarding/data-source')` |
| 5. DB opens, migration 001 applies, `user_version=1` | ✓ | `db-migration.test.ts` 1/1 pass; `_layout.tsx:77` — `runMigrations(getDB())` on mount |
| 6. `tsc --noEmit` exit 0 | ✓ | Confirmed by test run (no output = no errors) |
| 7. `expo lint` exit 0 | ✓ | Confirmed by test run (no output = no errors) |
| 8. `npx tsx tests/db-migration.test.ts` exit 0 | ✓ | 1/1 pass (better-sqlite3 backend) |

---

## Required Artifacts

| Artifact | Min Lines | Actual | Status | Notes |
|----------|-----------|--------|--------|-------|
| `app/index.tsx` | 15 | 22 | ✓ VERIFIED | Redirect + useOnboardingStore |
| `app/onboarding/welcome.tsx` | 60 | 167 | ✓ VERIFIED | Reanimated v4, language tiles, a11y |
| `app/onboarding/data-source.tsx` | 60 | 129 | ✓ VERIFIED | 4 SourceTile, setDataSource wired |
| `app/onboarding/synthetic.tsx` | 80 | 228 | ✓ VERIFIED | Generator + insertMany + progress UI |
| `app/onboarding/monobank.tsx` | 110 | 294 | ✓ VERIFIED | 7-phase machine, token in secure-store |
| `app/onboarding/csv.tsx` | 100 | 360 | ✓ VERIFIED | picker + parse + B4 guard |
| `app/onboarding/manual.tsx` | 90 | 420 | ✓ VERIFIED | Full form + category modal + override seeding |
| `app/(tabs)/index.tsx` | 70 | 164 | ✓ VERIFIED | useFocusEffect + countTransactions + sumLastNDays |
| `src/lib/db/index.ts` | 45 | 123 | ✓ VERIFIED | getDB/runMigrations/getSchemaVersion/openTestDB/splitStatements |
| `src/lib/db/migrations.ts` | 30 | 31 | ✓ VERIFIED | MIGRATIONS array, version:1 |
| `src/lib/db/schema.sql.ts` | 80 | 98 | ✓ VERIFIED | SCHEMA_001 + SEED_DEFAULT_CATEGORIES |
| `src/lib/money.ts` | 40 | 135 | ✓ VERIFIED | toCents/fromCents/parseAmount/formatMoney |
| `src/lib/secure.ts` | 25 | 58 | ✓ VERIFIED | SecureKey union, WHEN_UNLOCKED_THIS_DEVICE_ONLY |
| `src/lib/http.ts` | 45 | 115 | ✓ VERIFIED | HttpError, AbortController, [redacted] |
| `src/lib/time.ts` | 30 | 78 | ✓ VERIFIED | nowSeconds/toSeconds/fromSeconds/startOfDaySeconds |
| `src/lib/i18n/index.ts` | 25 | 68 | ✓ VERIFIED | createInstance + Localization.getLocales |
| `src/stores/onboarding.ts` | 35 | 83 | ✓ VERIFIED | persist + secureStorage adapter |
| `src/api/queryClient.ts` | 8 | 18 | ✓ VERIFIED | QueryClient singleton |
| `src/components/PressableButton.tsx` | 40 | 104 | ✓ VERIFIED | minHeight:44, a11y, tokens |
| `src/components/TextField.tsx` | 45 | 114 | ✓ VERIFIED | secureTextEntry, a11y, error prop |
| `src/lib/synthetic/generator.ts` | 80 | 189 | ✓ VERIFIED | generateSyntheticTransactions pure function |
| `src/lib/synthetic/merchants.ts` | 100 | 118 | ✓ VERIFIED | IE+UA merchant arrays |
| `src/lib/synthetic/mcc.ts` | 50 | 161 | ✓ VERIFIED | MCC_TO_CATEGORY map, categoryForMcc |
| `src/lib/synthetic/rng.ts` | 20 | 76 | ✓ VERIFIED | mulberry32/pick/randInt |
| `src/data/transactionsRepo.ts` | 50 | 153 | ✓ VERIFIED | insertMany/count/sumLastNDays |
| `src/data/categoriesRepo.ts` | 35 | 101 | ✓ VERIFIED | getCategoryIdBySlug/listCategories |
| `src/data/accountsRepo.ts` | 25 | 86 | ✓ VERIFIED | ensureDefaultAccount idempotent |
| `src/data/merchantOverridesRepo.ts` | 35 | 116 | ✓ VERIFIED | add/list/find override |
| `src/api/monobank.ts` | 60 | 134 | ✓ VERIFIED | getMonobankClient/getMonobankStatement |
| `src/lib/csv/parser.ts` | 60 | 179 | ✓ VERIFIED | RFC 4180, 5MB cap, auto-delimiter |
| `src/lib/csv/mappers.ts` | 80 | 253 | ✓ VERIFIED | detectColumns + csvRowsToTransactions + djb2 |
| `src/lib/monobank/mapper.ts` | 45 | 108 | ✓ VERIFIED | mapMonobankItems + isPotentiallyOversizedBatch |
| `src/lib/monobank/mcc-table.ts` | 20 | — | ✓ VERIFIED | resolveMcc (dual-MCC fallback) |

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `app/_layout.tsx` | `@lib/db::runMigrations` | useEffect on mount | ✓ WIRED | `_layout.tsx:77` — `runMigrations(getDB())` |
| `app/_layout.tsx` | `@lib/i18n::initI18n` | useEffect on mount | ✓ WIRED | `_layout.tsx:73` — `await initI18n()` |
| `app/index.tsx` | `@stores/onboarding::completed` | Reads flag, Redirect | ✓ WIRED | `index.tsx:15` — `useOnboardingStore((s) => s.completed)` |
| `app/onboarding/welcome.tsx` | `@stores/onboarding::setLanguage` | On tile press | ✓ WIRED | `welcome.tsx:56` — `useOnboardingStore.getState().setLanguage(lng)` |
| `app/onboarding/data-source.tsx` | `@stores/onboarding::setDataSource` | Tile onPress → choose() | ✓ WIRED | `data-source.tsx:40` — `setDataSource(source)` |
| `app/onboarding/synthetic.tsx` | `@lib/synthetic::generateSyntheticTransactions` | useEffect on mount | ✓ WIRED | `synthetic.tsx` contains `generateSyntheticTransactions` |
| `app/onboarding/monobank.tsx` | `@api/monobank::getMonobankStatement` | handleConnect() | ✓ WIRED | `monobank.tsx:122` — `await getMonobankStatement(trimmedToken, ...)` |
| `src/api/monobank.ts` | `@lib/http::httpJson` | GET with X-Token header | ✓ WIRED | `monobank.ts:87` — `headers: { 'X-Token': token }` |
| `app/onboarding/csv.tsx` | `@lib/csv/parser::parseCsv` | handlePick() | ✓ WIRED | `csv.tsx:121` — `parseCsv(text, ...)` |
| `app/onboarding/csv.tsx` | `@data/categoriesRepo::getCategoryIdBySlug` | handleImport() | ✓ WIRED | `csv.tsx:176` — `getCategoryIdBySlug(r.categorySlug)` |
| `app/onboarding/manual.tsx` | `@data/transactionsRepo::insertManyTransactions` | handleSubmit() | ✓ WIRED | `manual.tsx:135` — `insertManyTransactions([...])` |
| `app/(tabs)/index.tsx` | `@data/transactionsRepo` | useFocusEffect | ✓ WIRED | `(tabs)/index.tsx:51-52` — `countTransactions()` + `sumLastNDays(30)` |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `app/(tabs)/index.tsx` | `count`, `sumLast30Cents` | `countTransactions()` + `sumLastNDays(30)` → `getDB().executeSync(SELECT COUNT/SUM)` | Yes — live DB reads via op-sqlite | ✓ FLOWING |
| `app/onboarding/synthetic.tsx` | rows from generator | `generateSyntheticTransactions(cfg)` → `insertManyTransactions` | Yes — pure function + parameterized INSERT | ✓ FLOWING |
| `app/onboarding/monobank.tsx` | `items` from API | `getMonobankStatement` → real HTTPS to api.monobank.ua | Yes — real network response | ✓ FLOWING |
| `app/onboarding/csv.tsx` | `parsedRows` | `getDocumentAsync` → `fetch(asset.uri).text()` → `parseCsv` | Yes — real file content | ✓ FLOWING |

---

## Test Gate Results

| Test File | Command | Result | Count |
|-----------|---------|--------|-------|
| `tests/money.test.ts` | `npx tsx tests/money.test.ts` | ✓ PASS | 14/14 |
| `tests/db-migration.test.ts` | `npx tsx tests/db-migration.test.ts` | ✓ PASS | 1/1 (better-sqlite3 backend) |
| `tests/synthetic.test.ts` | `npx tsx tests/synthetic.test.ts` | ✓ PASS | 14/14 |
| `tests/csv-parser.test.ts` | `npx tsx tests/csv-parser.test.ts` | ✓ PASS | 11/11 (incl. Test 11: B2 contract) |
| `tests/monobank-mapper.test.ts` | `npx tsx tests/monobank-mapper.test.ts` | ✓ PASS | 11/11 |
| TypeScript | `npx tsc --noEmit` | ✓ exit 0 | — |
| Expo lint | `npx expo lint` | ✓ exit 0 | — |

**Total: 51/51 unit tests pass. tsc + lint clean.**

---

## Security Audit (ASVS L1)

| Check | Result | Evidence |
|-------|--------|---------|
| monobank token in expo-secure-store (never AsyncStorage) | ✓ PASS | `secure.ts`: `SecureStore.setItemAsync` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; `monobank.tsx:162` — `secureSet('monobank_token', ...)` after API success |
| monobank token in X-Token header only (never URL) | ✓ PASS | `monobank.ts:87,123` — `headers: { 'X-Token': token }`; grep на `${token}.*api.monobank` → 0 совпадений |
| monobank token never logged | ✓ PASS | grep на `console.*` в `src/api/monobank.ts`, `src/lib/monobank/`, `app/onboarding/monobank.tsx` — только комментарии |
| AsyncStorage zero hits in src/ and app/ | ✓ PASS | grep → только комментарии-предупреждения ("Never AsyncStorage") в secure.ts и onboarding.ts |
| description column NULL for all ingest paths | ✓ PASS | `generator.ts:148,179`, `mapper.ts:87`, `mappers.ts:239(implicit via MappedCsvRow)`, `manual.tsx:144` — все `description: null` |
| CSV size capped 5MB + quoted-field RFC 4180 | ✓ PASS | `parser.ts:97-99` — `throw CsvParseError('too-large')`; char-by-char state machine с quoted field handling |
| NSAllowsArbitraryLoads in app.json | ✓ PASS | grep → нет записей NSAllowsArbitraryLoads; iOS ATS defaults в силе |
| TBD/FIXME/XXX debt markers | ✓ PASS | grep по src/ app/ → 0 хитов |
| Inline hex в новых файлах Phase 1 | ✓ PASS | grep → 0 хитов в app/onboarding/, src/stores/, src/api/, src/components/, src/data/ |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Money: toCents(1.23) = 123 | `npx tsx tests/money.test.ts` | 14/14 pass | ✓ PASS |
| DB migration: user_version = 1 | `npx tsx tests/db-migration.test.ts` | 1/1 pass | ✓ PASS |
| Synthetic: 90*3 ≤ count ≤ 90*6+salaries | `npx tsx tests/synthetic.test.ts` | 14/14 pass | ✓ PASS |
| CSV B2: no-MCC row → categorySlug='misc' (Test 11) | `npx tsx tests/csv-parser.test.ts` | 11/11 pass | ✓ PASS |
| monobank mapper: description always null | `npx tsx tests/monobank-mapper.test.ts` | 11/11 pass | ✓ PASS |

---

## Deviations Log (плановые vs. реализованные)

| Отклонение | Файл | Причина | Влияние |
|-----------|------|---------|---------|
| `db.executeSync` вместо `db.execute` (async) | `src/lib/db/index.ts` | op-sqlite v15 API изменился с v14 | Нет. Поведение эквивалентно. |
| `splitStatements()` добавлен в db/index.ts | `src/lib/db/index.ts` | op-sqlite v15 отклоняет multi-statement SQL | Нет. Необходимая адаптация. |
| `better-sqlite3` devDep вместо op-sqlite Node shim | `tests/db-migration.test.ts` | op-sqlite shim имеет баг PRAGMA read | Нет. CI получает рабочий тест. |
| `tests/` исключён из `apps/mobile/tsconfig.json` | `tsconfig.json` | NodeNext/ESM конфликт с Expo types | Нет. Корректно. |
| `readonly T[]` вместо `ReadonlyArray<T>` | `merchants.ts`, `rng.ts` | ESLint rule `@typescript-eslint/array-type` | Нет. Идентично. |
| Explicit 4-branch if/else в choose() | `data-source.tsx:42-45` | typed routes требуют literal strings, не template literal | Нет. Безопаснее (T-01-02-01). |
| 3 salary rows (days 1, 31, 61) вместо 1 | `generator.ts` | Реалистичнее для 90-дневного датасета | Нет. Тест ожидает ≥1, получает 3. |
| `monobank_connect` и `monobank_try_again` i18n ключи | `en.json`/`uk.json` | Добавлены для кнопок в monobank.tsx | Нет. Дополнительные ключи сверх плана. |
| B3: `client.accounts[0]` primary only | `monobank.tsx:107` | Явно санкционировано SKELETON Out of Scope | Нет. Задокументировано. |

---

## Gaps Summary

Нет блокеров. Все 5 критериев успеха выполнены. Все 51 тест проходят. Архитектурная целостность полная.

### Human Verification Required

**Единственное открытое замечание** — отсутствие числовых таймингов по каждому пути в SUMMARY.md.

---

## Human Verification Required

### 1. Timing Records for SC-1

**Test:** Пройти onboarding по каждому из 4 путей с секундомером на физическом iPhone. Записать время от Welcome screen до появления dashboard с данными.
**Expected:** synthetic ≤ 90s, manual ≤ 90s, csv ≤ 90s (файл ~50 строк), monobank ≤ 90s (при хорошем сигнале и отсутствии rate-limit)
**Why human:** Task 4 одобрен пользователем 2026-05-13 с формулировкой "all flows complete within budget" — но конкретные секунды по каждому пути не зафиксированы в SUMMARY.md. Для аудита портфолио желательно иметь числа. Это не BLOCKER (задача одобрена), но является незакрытым пунктом документации.

---

## Overall Status

**GOAL ACHIEVED.** Фаза 1 доставила все 5 заявленных критериев успеха и все 7 требований (ONBD-01/02/03, DATA-01/02/03/04).

- 51/51 unit tests pass
- tsc + expo lint clean
- Все 4 пути ingest полностью подключены к op-sqlite
- Безопасность: токен в secure-store, не в URL, не в логах; AsyncStorage = 0; description = NULL везде; CSV size cap
- Walking Skeleton DoD: все 8 пунктов подтверждены
- SKELETON контракты B2 (categorySlug всегда string), B3 (primary account only), B4 (zero-row guard) — все закрыты и проверены тестами

Статус `human_needed` выставлен исключительно из-за отсутствия числовых таймингов в SUMMARY.md. Это документационный пробел, не технический. Если тайминги достаточно зафиксированы апрувом Task 4 — можно переключить на `passed`.

---

_Verified: 2026-05-13T17:10:00+01:00_
_Verifier: Claude (gsd-verifier)_
