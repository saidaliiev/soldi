---
phase: 01-onboarding-data-ingest
type: skeleton
created: 2026-05-13
last_revised: 2026-05-13 (rev 1)
---

# Walking Skeleton — Phase 1

> The thinnest possible end-to-end stack that touches every architectural layer SOLDI will rely on for v1. Phase 1's first plan brings this skeleton up; later phases build on these decisions without renegotiating them. Subsequent plans MUST conform — diverging requires explicit retro + update here.

## User Story (Phase Goal)

**As a** first-time SOLDI installer, **I want to** pick my language and a data source, **so that** I land on a populated dashboard within 90 seconds and feel like the app already knows me.

## Architectural Spine (locked decisions)

| Layer | Decision | Why | Where |
|-------|----------|-----|-------|
| Runtime | Expo SDK 54 + RN 0.81.5 + React 19.1.0 + TS strict + `noUncheckedIndexedAccess` | Already scaffolded in Phase 0; Windows dev box; locked in CLAUDE.md | `apps/mobile/package.json`, `tsconfig.json` |
| Router | `expo-router` v6 with typed routes | File-based + deep-link friendly + Phase 0 enables typed routes | `apps/mobile/app/` |
| State (UI) | Zustand v5 | Locked in CLAUDE.md; small, no provider tree | `apps/mobile/src/stores/` |
| State (server cache) | TanStack Query v5 | Locked; for monobank fetch + future Edge Function calls | `apps/mobile/src/api/` (Phase 1 stubs query client) |
| Local DB | `@op-engineering/op-sqlite` v15 | Locked; sync API + native module; offline-first | `apps/mobile/src/lib/db/` |
| Schema migrations | Hand-rolled SQL migration list with monotonic version (`PRAGMA user_version`) | No drizzle yet; keep deps minimal until schema stabilises | `apps/mobile/src/lib/db/migrations.ts` |
| Secrets | `expo-secure-store` only — NEVER `AsyncStorage` | Fintech-grade default in CLAUDE.md | `apps/mobile/src/lib/secure.ts` |
| App state persistence | Zustand `persist` middleware → `expo-secure-store` adapter for ALL persisted UI prefs (language, onboarding-completed flag, data source, future token) — one storage layer only | Avoid AsyncStorage entirely; no extra deps; single source of truth for "did the user finish onboarding" | `apps/mobile/src/stores/onboarding.ts` |
| i18n | `i18next` + `react-i18next` + `expo-localization` initial detection | Locked; EN + UK only in v1 | `apps/mobile/src/lib/i18n/` |
| Design tokens | `src/design/tokens.ts` + `src/design/typography.ts` (Phase 0) | Source of truth; ESLint catches drift | `apps/mobile/src/design/` |
| Animation | `react-native-reanimated` v4 + `react-native-worklets` 0.5.1 | Locked; v4 ships breaking changes that the codebase will adopt from day one | usage in screens, not lib |
| Network | `globalThis.fetch` (RN ships fetch) wrapped in a thin `httpClient` with timeout + retry | No `axios`; keep deps minimal | `apps/mobile/src/lib/http.ts` |
| Currency | All amounts stored as `INTEGER amount_cents` (no floats) + `currency TEXT` | Float math = bug factory in finance | DB schema + `Money` helpers in `src/lib/money.ts` |
| Time | UNIX seconds (INTEGER) stored, `Date` at boundaries only | SQLite has no native Date; consistent serialization | `src/lib/time.ts` |
| Test runner | Phase 1 introduces **node-only unit tests via Node `node:test`** for pure logic (synthetic generator, MCC mapping, CSV parser, Money math, DB migration). RN-component tests deferred to Phase 5 (Jest + react-native-testing-library). `tsx` added as a devDependency so all test invocations are `npx tsx tests/<file>` (no `--yes tsx@latest` indirection). | `node:test` ships with Node, zero runtime deps; `tsx` is the one compile-time helper | `apps/mobile/tests/` |

## Directory Layout (locked)

```
apps/mobile/
├── app/                              # expo-router file routes
│   ├── _layout.tsx                   # root, fonts + providers
│   ├── index.tsx                     # NEW: boot redirector → onboarding or tabs
│   ├── onboarding/                   # NEW Phase 1
│   │   ├── _layout.tsx               # stack with Reanimated transitions
│   │   ├── welcome.tsx               # 01-01
│   │   ├── data-source.tsx           # 01-02
│   │   ├── synthetic.tsx             # 01-03 result screen
│   │   ├── monobank.tsx              # 01-04
│   │   ├── csv.tsx                   # 01-04
│   │   └── manual.tsx                # 01-04
│   └── (tabs)/                       # placeholder dashboard for Phase 1; Phase 2 fleshes out
├── src/
│   ├── api/
│   │   ├── monobank.ts               # 01-04: typed monobank client
│   │   └── queryClient.ts            # 01-01: TanStack QueryClient singleton
│   ├── data/                         # Phase 1: repositories (DB-touching functions)
│   │   ├── transactionsRepo.ts
│   │   ├── categoriesRepo.ts
│   │   ├── accountsRepo.ts
│   │   └── merchantOverridesRepo.ts
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts              # getDB() singleton
│   │   │   ├── migrations.ts         # ordered list of SQL strings
│   │   │   └── schema.sql.ts         # exported SQL constants
│   │   ├── i18n/
│   │   │   ├── index.ts              # init + i18n instance export
│   │   │   ├── en.json               # 01-01 minimal keys; grows phase by phase
│   │   │   └── uk.json
│   │   ├── secure.ts                 # thin wrapper around expo-secure-store
│   │   ├── http.ts                   # fetch wrapper with timeout + auth header injector
│   │   ├── money.ts                  # cents↔display, parse, format with currency
│   │   ├── time.ts                   # seconds↔Date, formatters
│   │   ├── csv/
│   │   │   ├── parser.ts             # 01-04: pure CSV → row[]; size-capped
│   │   │   └── mappers.ts            # 01-04: row[] → Transaction[] heuristic columns
│   │   ├── synthetic/
│   │   │   ├── generator.ts          # 01-03 entry
│   │   │   ├── merchants.ts          # 01-03 IE + UA seed data
│   │   │   └── mcc.ts                # 01-03 MCC → category mapping
│   │   └── monobank/
│   │       ├── mapper.ts             # 01-04 monobank tx → SOLDI tx
│   │       └── mcc-table.ts          # ISO 18245 minimal MCC table for monobank
│   ├── stores/
│   │   └── onboarding.ts             # 01-01: language, source, step, status flags
│   ├── components/                   # shared RN primitives (PressableButton, etc.) — Phase 1 introduces only what each plan needs
│   └── design/                       # Phase 0; do not modify under Phase 1
├── tests/                            # node:test unit tests (pure logic only in Phase 1)
│   ├── synthetic.test.ts
│   ├── csv-parser.test.ts
│   ├── monobank-mapper.test.ts
│   ├── money.test.ts
│   ├── db-migration.test.ts          # rev 1: BLOCKER B1 — verifies runMigrations + getSchemaVersion
│   └── tsconfig.json                 # extends apps/mobile/tsconfig.json, sets module=NodeNext
└── app.json                          # plugins: + @op-engineering/op-sqlite, expo-document-picker
```

## Routing Contract

- `/` → boot screen: reads `onboardingCompleted` flag from Zustand-persisted store. If true → `/(tabs)`. Else → `/onboarding/welcome`.
- `/onboarding/welcome` → language pick (EN | UK). On next → `/onboarding/data-source`.
- `/onboarding/data-source` → 4 options: synthetic | manual | monobank | csv. Branches to source-specific screen.
- `/onboarding/{synthetic|monobank|csv|manual}` → completes ingest, sets `onboardingCompleted = true`, replaces stack with `/(tabs)`.
- `/(tabs)/index` → minimal dashboard in Phase 1: list of `transactions` by date desc, count + last-month total. Phase 2 replaces with full design.

## Database Schema (v1, locked in 01-03)

```sql
-- migration 001: initial schema
CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_en TEXT NOT NULL,
  name_uk TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  is_custom INTEGER NOT NULL DEFAULT 0, -- bool
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  type TEXT NOT NULL CHECK (type IN ('cash','bank','card')),
  source TEXT NOT NULL CHECK (source IN ('synthetic','manual','monobank','csv')),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount_cents INTEGER NOT NULL,             -- positive = income, negative = expense (sign convention)
  currency TEXT NOT NULL DEFAULT 'EUR',
  merchant_name TEXT NOT NULL,
  merchant_id TEXT,                          -- nullable; reserved for monobank stable id
  mcc_code INTEGER,                          -- nullable; ISO 18245
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  description TEXT,
  date INTEGER NOT NULL,                     -- unix seconds
  source TEXT NOT NULL CHECK (source IN ('synthetic','manual','monobank','csv')),
  external_id TEXT,                          -- stable id for de-dupe of imports (monobank tx id, csv hash)
  created_at INTEGER NOT NULL,
  UNIQUE(source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);

CREATE TABLE IF NOT EXISTS merchant_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_pattern TEXT NOT NULL,            -- lowercased substring or exact match key
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  confidence REAL NOT NULL DEFAULT 1.0,      -- 0..1
  created_by_user INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_merchant_overrides_pattern ON merchant_overrides(merchant_pattern);
```

Seed (run on first migration):
- 18 default categories with `name_en` / `name_uk` / `icon_name` (groceries, transport, eating-out, coffee, rent, utilities, mobile, entertainment, health, clothing, gifts, transfers, salary, refunds, savings, kids, pets, misc).

## Money Sign Convention (locked)

- `amount_cents` is signed: **negative = expense, positive = income, zero = neutral transfer**.
- All adapters MUST follow this. Display layer flips sign for "spent" totals.
- Synthetic generator + monobank mapper + manual form + CSV parser all converge on this.

## Module Path Aliases (already in tsconfig)

- `@design`, `@design/*`
- `@components/*`
- `@stores/*`
- `@data/*`
- `@api/*`
- `@lib/*`
- `@utils/*`

All Phase 1 source files MUST use these aliases; no `../../../src/*` imports.

## Threat Boundaries (Phase 1)

- **monobank token** → secure-store; never URL-bound; never logged; sent only as `X-Token` header to `api.monobank.ua`.
- **CSV file** → size cap 5MB; parser is sync, runs on JS thread (acceptable for ≤5MB); rejects > 200k rows.
- **Synthetic data** → no PII; deterministic where useful (seedable RNG).
- **i18n strings** → no string interpolation of user-supplied data into translation keys.
- **AI** → Phase 1 sends **nothing** to any AI endpoint. Repository layer is designed so Phase 3 can call aggregates without exposing rows.

## Out of Scope for Phase 1

- Encryption-at-rest for the SQLite DB (op-sqlite SQLCipher integration) → deferred; CLAUDE.md says expo-secure-store handles the only HIGH-sensitivity item (monobank token) and the SQLite store has no plaintext bank credentials.
- Push notifications.
- Biometric gate (ONBD-04 lives in Phase 5).
- Full dashboard styling (Phase 2).
- Background sync (monobank pull is on-demand only in Phase 1).
- Edge Functions / Supabase (Phase 3).
- **monobank Phase 1 syncs the primary account only (first entry in `client.accounts`). Multi-account picker deferred to Phase 5.** (rev 1: BLOCKER B3 — explicit scope reduction sanction.)
- **CSV manual column-mapping UI**: if `detectColumns` returns `null` (headers don't match the heuristic set), Phase 1 surfaces a "couldn't find columns" error and offers retry; full mapping UI deferred.
- **Multi-currency dashboard rollup**: Phase 1 dashboard uses an EUR rollup even when UAH rows exist (synthetic UA salary, monobank UAH rows). Per-row currency is preserved in the DB; Phase 2 introduces proper FX-aware aggregation.

## Definition of Done — Walking Skeleton

After plan 01-01 lands, all of the following MUST be observable on a physical iPhone via Expo Go:

1. App launches; existing Phase 0 fonts still load.
2. New `/` boot route redirects unboot users to `/onboarding/welcome`.
3. Welcome screen shows EN / UK pick with Reanimated entrance animation.
4. After picking a language, app navigates to `/onboarding/data-source` (stub screen visible).
5. `getDB()` opens the SQLite DB; migration 001 applies; `PRAGMA user_version` returns `1`.
6. `npx tsc --noEmit` exits 0; `npx expo lint` exits 0.
7. `npx tsx tests/db-migration.test.ts` exits 0 — verifies migration applies cleanly to a fresh DB.
8. The DB module path is reachable from any screen via `@lib/db`.

Subsequent Phase 1 plans add depth to existing slices; they do NOT change the spine above.

---

## Revision Log

**rev 1 (2026-05-13)** — gsd-plan-checker round 1:
- B3: Multi-account monobank deferral made explicit in Out of Scope.
- B1: `db-migration.test.ts` added to test inventory + DoD #7.
- W2: Storage layer description simplified to "expo-secure-store only" (no expo-file-system).
- W5: `tsx` codified as a devDependency (devDependencies note in test-runner row).
