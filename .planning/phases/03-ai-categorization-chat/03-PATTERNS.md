# Phase 3: AI Categorization + Chat — Pattern Map

**Mapped:** 2026-05-14
**Files analyzed:** ~30 new/modified files across 3 plans
**Analogs found:** 21 / 30 (9 are net-new pattern territory — Edge Functions, chat surfaces)

---

## Repository State at Mapping Time

- `supabase/` exists at repo root but `supabase/functions/` and `supabase/migrations/` are **empty** — Phase 3 introduces the first Edge Functions and the first remote-Postgres migration into the project.
- `apps/mobile/src/data/merchantOverridesRepo.ts` **already exists** (116 lines, local op-sqlite). Phase 3 extends this for Postgres semantics (or splits into local cache + remote source — planner decides).
- `apps/mobile/src/data/transactionsRepo.ts` (440 lines), `categoriesRepo.ts` (403 lines), `dashboardRepo.ts` exist — solid repo analogs.
- `apps/mobile/src/components/BottomSheet/BottomSheetPrimitive.tsx` exists (custom RN Modal + Reanimated v4 — **NOT `@gorhom/bottom-sheet`** despite UI-SPEC referencing gorhom). Sheet API is gorhom-shaped (`open()/close()/snapPoints`) so the migration is drop-in but Phase 3 chat sheet should reuse this primitive, NOT introduce gorhom (would break Expo Go device verification per BottomSheetPrimitive header comment).
- `apps/mobile/src/features/transactions/RecategorizeBottomSheet.tsx` + `recategorizeStore.ts` exist — gold-standard Phase 2 analog for the new ChatBottomSheet + chatStore.
- `apps/mobile/src/lib/http.ts` exists — fetch wrapper with timeout + `HttpError` + token redaction. **Direct analog for the AI Edge Function fetch wrappers** (`aiCategorize.ts`, `aiQuery.ts`).
- i18n is **flat-merged into `translation` namespace** in `src/lib/i18n/index.ts`. Phase 3 chat namespace adds `chat.*` and `ai.*` keys; index.ts must be edited to import + merge the new JSON bundles.
- Tests live in two places: `apps/mobile/tests/*.test.ts` (integration-shaped — `csv-parser`, `db-migration`, `synthetic`, `money`, `monobank-mapper`) and co-located `src/features/**/<thing>.test.ts` (pure logic — `dateGrouping`, `digestMath`, `donutArcs`, `categoryMutations`). Test framework is jest.

---

## File Classification

### Plan 03-01 — `ai-categorize` Edge Function

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/ai-categorize/index.ts` | Edge Function (Deno) | request-response (batch) | `apps/mobile/src/api/monobank.ts` (request shape, HTTP error → translated key) + `lib/http.ts` (fetch + timeout + redact) | role-match only — **NEW PATTERN** for Edge Functions |
| `supabase/functions/_shared/anthropic.ts` | utility (SDK wrapper) | request-response | none — **NEW PATTERN** | no analog |
| `supabase/functions/_shared/prompts.ts` | config (system prompts as consts) | n/a | `apps/mobile/src/lib/synthetic/` (static data exports) | role-match (just exports constants) |
| `supabase/functions/_shared/mccMap.ts` | config / data table | n/a | `apps/mobile/src/data/categoriesRepo.ts` seed data section (slug → row mapping) | role-match |
| `supabase/functions/_shared/schemas.ts` | utility (zod schemas) | n/a | none (zod not yet used in repo) — **NEW PATTERN** | no analog |
| `supabase/migrations/NNNN_merchant_overrides.sql` | migration | DDL | `apps/mobile/src/lib/db/migrations/` local SQL (splitStatements pattern, runs on op-sqlite) | partial — local vs remote; remote SQL still mirrors statement style |
| `supabase/migrations/NNNN_transactions_ai_columns.sql` | migration | DDL | same as above | partial |
| `apps/mobile/src/services/aiCategorize.ts` | service (HTTP fetch wrapper) | request-response | `apps/mobile/src/api/monobank.ts` | **exact** |
| `apps/mobile/src/data/transactionsRepo.ts` (MODIFIED) | repo | CRUD | self — adds `updateCategoryBatch`, `markNeedsReview`, `listUncategorized` following existing repo style | self-reuse |
| `apps/mobile/tests/ai-categorize.test.ts` | test | n/a | `apps/mobile/tests/monobank-mapper.test.ts` (integration shape) | **exact** |

### Plan 03-02 — `merchant_overrides` Propagation

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/mobile/src/data/merchantOverridesRepo.ts` (MODIFIED) | repo | CRUD | **self** (already exists, 116 lines) — extend with `upsertOverride`, `propagateCategoryToSimilar`, normalize-key helper | self-reuse |
| `apps/mobile/src/features/transactions/propagationStore.ts` | zustand store (ephemeral) | event-driven | `apps/mobile/src/features/transactions/recategorizeStore.ts` | **exact** |
| `apps/mobile/src/features/transactions/PropagationToast.tsx` | component (transient UI) | event-driven | `apps/mobile/src/features/transactions/RecategorizeBottomSheet.tsx` (Pressable + Haptics + zustand + tokens) — toast is simpler but follows same import/style discipline | role-match |
| `apps/mobile/src/features/transactions/RecategorizeBottomSheet.tsx` (MODIFIED) | component | event-driven | self — add post-pick hook firing `propagationStore.openWith(count)` | self-reuse |
| `apps/mobile/src/features/transactions/merchantNormalize.ts` | utility (pure fn) | transform | `apps/mobile/src/features/transactions/filterCompose.ts` (pure logic + co-located test) | **exact** |
| `apps/mobile/src/features/transactions/merchantNormalize.test.ts` | test | n/a | `apps/mobile/src/features/transactions/filterCompose.test.ts` | **exact** |
| `apps/mobile/tests/merchant-overrides-repo.test.ts` | test (integration-shape) | n/a | `apps/mobile/tests/db-migration.test.ts` | **exact** |

### Plan 03-03 — Chat bottom sheet + `ai-query` Edge Function

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/ai-query/index.ts` | Edge Function | request-response (with tool use) | (none in repo) — **NEW PATTERN**; copy structure from `ai-categorize` once that's written | no analog |
| `supabase/functions/_shared/sql-runner.ts` | utility (parameterized statement registry) | CRUD (read-only) | `apps/mobile/src/data/dashboardRepo.ts` (parameterized SQL via executeSync — same "registry of named query shapes" idea) | role-match |
| `apps/mobile/src/services/aiQuery.ts` | service (HTTP fetch wrapper) | request-response | `apps/mobile/src/api/monobank.ts` | **exact** |
| `apps/mobile/src/features/chat/chatStore.ts` | zustand store (ephemeral, NO persist) | event-driven | `apps/mobile/src/features/transactions/recategorizeStore.ts` (ephemeral, no `persist`) | **exact** |
| `apps/mobile/src/features/chat/ChatBottomSheet.tsx` | screen-level component | event-driven | `apps/mobile/src/features/transactions/RecategorizeBottomSheet.tsx` | **exact** |
| `apps/mobile/src/features/chat/ChatLaunchFAB.tsx` | component | event-driven | `apps/mobile/src/components/PressableButton.tsx` + dashboard FAB-like elements (gradient via `LinearGradient` from `MonthlyTotalHero.tsx` reuse) | partial — copy `LinearGradient` spread idiom from CLAUDE.md |
| `apps/mobile/src/features/chat/ChatEmptyState.tsx` | component | n/a | `apps/mobile/src/features/dashboard/EmptyState.tsx` | **exact** (per UI-SPEC: "inspiration only — new variant") |
| `apps/mobile/src/features/chat/PromptSuggestionChip.tsx` | component | event-driven | `apps/mobile/src/features/transactions/CategoryChip.tsx` + `FilterPillsRow.tsx` (pill-shaped Pressable + Haptics + token-only styling) | **exact** |
| `apps/mobile/src/features/chat/ChatMessageList.tsx` | component (list) | streaming-append | `apps/mobile/src/features/transactions/useTransactionsList.ts` + section list usage in TX screen (FlashList with `getItemType`) | role-match |
| `apps/mobile/src/features/chat/ChatBubbleUser.tsx` | component | n/a | `apps/mobile/src/features/transactions/TransactionRow.tsx` (token-only StyleSheet, RN primitives, accessibility) | role-match |
| `apps/mobile/src/features/chat/ChatBubbleAssistant.tsx` | component | n/a | same as ChatBubbleUser | role-match |
| `apps/mobile/src/features/chat/ChatBubbleAssistantTyping.tsx` | component (animation) | n/a | `apps/mobile/src/features/dashboard/Sparkline.tsx` (Reanimated `withRepeat` patterns) | partial |
| `apps/mobile/src/features/chat/ChatMiniChart.tsx` | component (Skia chart) | n/a | `apps/mobile/src/features/dashboard/DonutChart.tsx` + `Sparkline.tsx` (Skia + arc math, pre-computed in JS) | **exact** |
| `apps/mobile/src/features/chat/ChatInputRow.tsx` | component (input + send) | event-driven | `apps/mobile/src/components/TextField.tsx` + `PressableButton.tsx` (Pressable + gradient + hitSlop + a11y) | role-match |
| `apps/mobile/src/features/chat/ChatErrorBanner.tsx` | component (transient banner) | n/a | `apps/mobile/src/features/dashboard/EmptyState.tsx` (banner-like layout) — token-only error styling per CLAUDE.md | partial |
| `apps/mobile/src/i18n/locales/{en,uk}/chat.json` | i18n bundle | n/a | `apps/mobile/src/i18n/locales/{en,uk}/transactions.json` | **exact** |
| `apps/mobile/src/i18n/locales/{en,uk}/ai.json` | i18n bundle | n/a | same as chat.json | **exact** |
| `apps/mobile/src/lib/i18n/index.ts` (MODIFIED) | config | n/a | self — add `chat` + `ai` bundle imports + deep-merge into resources | self-reuse |
| `apps/mobile/src/features/chat/ChatBubble.test.tsx` | test (component) | n/a | (no RN component test in repo yet — first one) — **NEW PATTERN** | no analog |
| `apps/mobile/tests/ai-query.test.ts` | test (integration) | n/a | `apps/mobile/tests/monobank-mapper.test.ts` | **exact** |
| `apps/mobile/tests/sql-runner.test.ts` | test | n/a | `apps/mobile/tests/db-migration.test.ts` | **exact** |

---

## Pattern Assignments

### Plan 03-01

#### `supabase/functions/ai-categorize/index.ts` (Edge Function — NEW pattern territory)

**Analogs (composition):**
- HTTP error semantics: `apps/mobile/src/api/monobank.ts` lines 83-98
- Fetch + timeout + redaction: `apps/mobile/src/lib/http.ts` lines 76-115
- Repository-layer write back: `apps/mobile/src/data/transactionsRepo.ts` (executeSync parameterized writes — translate to supabase-js `.update()`)

**Imports pattern to copy** (style from `monobank.ts:18`):
```typescript
// Deno-style for Edge Function — adapt:
import { serve } from 'https://deno.land/std@VERSION/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js';
import Anthropic from 'npm:@anthropic-ai/sdk';
```

**Error envelope pattern** — mirror `HttpError` + monobank's status→message translation (`monobank.ts:91-97`):
```typescript
// Edge Function returns 200 with per-row errors in body, or 503 on whole-batch failure.
// Client-side aiCategorize.ts then maps 503 → HttpError(503, ...) using the same
// HttpError class from lib/http.ts (re-thrown into TanStack Query onError).
```

**Security rules from CLAUDE.md (apply directly here):**
- `transactions.description` NEVER sent to Anthropic — only `merchant_name`, `mcc`, `amount` sign/bucket
- No `console.log` of payload contents in production builds (match `lib/http.ts` discipline: zero `console.*` calls; errors carry redacted bodies)
- Use **service-role** client for write-back; use **user JWT** client only for read-scoping (this Edge Function only writes, so service-role only)

**No analog for:** Anthropic SDK tool-use loop, MCC pre-pass, `Promise.allSettled` row-parallel. Reference 03-AI-SPEC.md §framework directly.

---

#### `supabase/functions/_shared/anthropic.ts` — NEW PATTERN

No prior SDK wrapper in repo. Planner should establish convention:
- Single exported factory `getAnthropic(): Anthropic` that reads `Deno.env.get('ANTHROPIC_API_KEY')`
- Throws at first call if env missing (fail fast, not at request time)
- No retries inside the wrapper — let caller decide (Phase 3 D-21: per-row `Promise.allSettled`, no whole-batch retry)
- See AI-SPEC §framework

---

#### `supabase/migrations/NNNN_merchant_overrides.sql` (remote Postgres DDL)

**Analog:** Local op-sqlite migrations in `apps/mobile/src/lib/db/migrations/` (splitStatements pattern). Style of one-statement-per-block carries over to remote DDL.

**Concrete contract from 03-CONTEXT.md D-01:**
```sql
-- Mirror the structure literally; do not re-decide:
CREATE TABLE merchant_overrides (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_key TEXT NOT NULL,
  category_id BIGINT NOT NULL REFERENCES categories(id),
  source TEXT NOT NULL CHECK (source IN ('user','llm','mcc')),
  confidence REAL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, merchant_key)
);
ALTER TABLE merchant_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rows only" ON merchant_overrides USING (auth.uid() = user_id);
```

**Note:** Existing local repo `apps/mobile/src/data/merchantOverridesRepo.ts` uses `merchant_pattern` (not `merchant_key`) and `created_by_user` (not `source`) — Phase 3 must reconcile: either remote uses same names (preferred) or repo gets a thin mapping layer. Planner decides; flag in plan.

---

#### `apps/mobile/src/services/aiCategorize.ts` (service)

**Analog (EXACT):** `apps/mobile/src/api/monobank.ts` lines 83-98

**Pattern to copy** (full structure — substitute endpoint, error codes, body):
```typescript
import { httpJson, HttpError } from '@lib/http';
import { supabase } from '@lib/supabase'; // assumed Phase 3 adds this

const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

export type AiCategorizeBatchResult = {
  results: Array<
    | { tx_id: number; category_id: number; confidence: number }
    | { tx_id: number; error: string }
  >;
};

export async function aiCategorizeBatch(
  txIds: readonly number[],
): Promise<AiCategorizeBatchResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  try {
    return await httpJson<AiCategorizeBatchResult>(
      `${BASE_URL}/functions/v1/ai-categorize`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tx_ids: txIds }),
        timeoutMs: 30_000, // batch Haiku can take 10-20s
      },
    );
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status === 503) throw new Error('Categorization unavailable');
      if (err.status === 429) throw new Error('Daily AI limit reached');
    }
    throw err;
  }
}
```

Copy: imports, BASE_URL constant, async function with try/catch, `HttpError` instanceof discrimination, throw translated `Error` for known codes, re-throw otherwise.

---

### Plan 03-02

#### `apps/mobile/src/data/merchantOverridesRepo.ts` (EXTEND existing)

**Self-reuse.** Read existing file (`/home/iskan/projects/soldi/apps/mobile/src/data/merchantOverridesRepo.ts`, 116 lines). Conventions already locked:
- `getDB()` from `@lib/db`, `nowSeconds()` from `@lib/time`
- All SQL via parameterized `executeSync(sql, [...params])` — NEVER string interpolation (comment at line 8 makes this explicit)
- Each public function has a JSDoc with `@param`/`@returns`
- Row → typed object mapping via `result.rows.map(row => ({ id: row['id'] as number, ... }))`
- Top-of-file `// ---` section dividers between exported functions

**New functions to add (Phase 3):**
- `upsertOverride(merchantKey, categoryId, source, confidence)` — replaces existing `addMerchantOverride` for the LLM/propagation flow; existing function stays for manual entry
- `findSimilarUncategorizedTxIds(merchantKey)` — for propagation pass (returns `number[]`)
- `normalizeMerchantKey(raw: string): string` — pure helper; export separately into `merchantNormalize.ts` (testable)

**Migration step:** existing schema uses `merchant_pattern` + `created_by_user` + substring `LIKE` match (D-02 in CONTEXT says new design is **exact** match on normalized key). The repo overhaul is non-trivial — flag explicitly in the plan; do not silently rename columns.

---

#### `apps/mobile/src/features/transactions/propagationStore.ts` (NEW, EXACT analog)

**Analog (EXACT):** `apps/mobile/src/features/transactions/recategorizeStore.ts` (full file, 31 lines)

**Pattern to copy verbatim** (substitute names):
```typescript
import { create } from 'zustand';

type State = {
  readonly visible: boolean;
  readonly count: number;
  readonly rollback: (() => void) | null;
  readonly openWith: (count: number, rollback: () => void) => void;
  readonly dismiss: () => void;
};

export const usePropagationStore = create<State>((set) => ({
  visible: false,
  count: 0,
  rollback: null,
  openWith: (count, rollback) => set({ visible: true, count, rollback }),
  dismiss: () => set({ visible: false, count: 0, rollback: null }),
}));
```

Copy: file header JSDoc style, `create<State>((set) => ...)` form, ephemeral (no `persist`), function-style setters, dismiss resets all fields.

---

#### `apps/mobile/src/features/transactions/merchantNormalize.ts` + `.test.ts`

**Analog (EXACT):** `apps/mobile/src/features/transactions/filterCompose.ts` + `filterCompose.test.ts`

Co-located pure-logic file + jest test next to it. Pattern:
```typescript
// merchantNormalize.ts — pure, no side effects, no DB
export function normalizeMerchantKey(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')      // strip diacritics
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64);
}
```

Test pattern (per `filterCompose.test.ts` style):
```typescript
import { normalizeMerchantKey } from './merchantNormalize';

describe('normalizeMerchantKey', () => {
  it('lowercases', () => { expect(normalizeMerchantKey('STARBUCKS')).toBe('starbucks'); });
  it('strips diacritics', () => { expect(normalizeMerchantKey('Café Krëm')).toBe('cafe krem'); });
  // ...
});
```

---

### Plan 03-03

#### `apps/mobile/src/features/chat/ChatBottomSheet.tsx` (EXACT analog)

**Analog (EXACT):** `apps/mobile/src/features/transactions/RecategorizeBottomSheet.tsx`

**Pattern to copy** (imports block from analog lines 17-34):
```typescript
import React from 'react';
import { View, Text, Pressable, ScrollView, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import {
  BottomSheetPrimitive,
  type BottomSheetPrimitiveRef,
} from '@/src/components/BottomSheet/BottomSheetPrimitive';

import { useChatStore } from './chatStore';
```

**Open/close imperative bridge** (analog lines 56-72) — copy verbatim, substitute `useRecategorizeStore` → `useChatStore`, `targetTxId` → `isOpen`:
```typescript
const sheetRef = React.useRef<BottomSheetPrimitiveRef>(null);
React.useEffect(() => {
  if (isOpen) sheetRef.current?.open();
  else sheetRef.current?.close();
}, [isOpen]);
```

**Snap point literal pattern** (analog line 39): `const SNAP_POINTS = ['85%'] as const;` (UI-SPEC says 85%).

**CRITICAL — UI-SPEC says `@gorhom/bottom-sheet`, but the repo uses `BottomSheetPrimitive` (custom RN Modal + Reanimated v4) for Expo Go compatibility.** Phase 3 MUST reuse `BottomSheetPrimitive`. The primitive's header comment (lines 5-12) explicitly documents that gorhom would break Expo Go device verification. Planner should call this out as a UI-SPEC vs codebase reality reconciliation; Phase 3 ships with the custom primitive. The primitive's API is gorhom-shaped so this is a name-only deviation.

---

#### `apps/mobile/src/features/chat/chatStore.ts` (EXACT analog)

**Analog (EXACT):** `apps/mobile/src/features/transactions/recategorizeStore.ts`

Same structure as propagationStore above, but holds the chat session message array + isOpen flag:
```typescript
type ChatMessage = /* see UI-SPEC §ChatMessageList */;
type State = {
  readonly isOpen: boolean;
  readonly messages: readonly ChatMessage[];
  readonly isAwaitingResponse: boolean;
  readonly open: () => void;
  readonly close: () => void;
  readonly appendUser: (text: string) => void;
  readonly appendAssistant: (msg: ChatMessage) => void;
  readonly clear: () => void;
};
```

**Critical (per D-14/D-15):** NO `persist` middleware. No expo-secure-store. Session-scoped only. Closing the chat clears messages — wire `close()` to also call `clear()`, OR rely on app cold-start to clear (planner picks; UI-SPEC says "or until app cold-start").

**Contrast with `filterStore.ts`** (which DOES persist via secureStorage adapter) — chat is the opposite. The fact that `filterStore.ts` exists in the same directory makes the persist-vs-ephemeral choice locally readable; comment in `chatStore.ts` header should explicitly note "ephemeral, no persist — see D-14/D-15".

---

#### `apps/mobile/src/features/chat/ChatMiniChart.tsx` (EXACT analog)

**Analog (EXACT):** `apps/mobile/src/features/dashboard/DonutChart.tsx` and `Sparkline.tsx`

Copy:
- Skia imports (`@shopify/react-native-skia`) — same as Phase 2 donut
- Arc math co-located in `donutArcs.ts` + tested in `donutArcs.test.ts` — Phase 3 should follow same split: `chatChartGeometry.ts` (pure geometry) + `chatChartGeometry.test.ts` + `ChatMiniChart.tsx` (Skia render only, geometry imported)
- Stroke widths, gap pts per UI-SPEC §ChatMiniChart (donut 8pt, sparkline 1.5pt)
- **Token-name-only color contract** (UI-SPEC §ChatMiniChart): build a const `CHART_COLOR_RESOLVER: Record<'accent'|'sage'|'accentSoft'|'textMuted', string>` mapping to `COLORS.*` — unknown payload colors fall back to `COLORS.textMuted` (defense in depth)

---

#### `apps/mobile/src/features/chat/PromptSuggestionChip.tsx`

**Analog (EXACT):** `apps/mobile/src/features/transactions/CategoryChip.tsx`

Reuses the pill geometry + Pressable + Haptics + token-only styling discipline. UI-SPEC §PromptSuggestionChip locks size (36pt h, pill radius, 1pt border `textMuted @ 30%`, pressed state `accent @ 10%` bg).

---

#### `apps/mobile/src/services/aiQuery.ts`

**Analog (EXACT):** Same as `aiCategorize.ts` above (which itself mirrors `monobank.ts`). Difference: longer timeout (45-60s for Sonnet with tool round-trips), streaming consideration deferred to planner per CONTEXT D-16.

---

#### `apps/mobile/src/i18n/locales/{en,uk}/chat.json` + `ai.json`

**Analog (EXACT):** `apps/mobile/src/i18n/locales/en/transactions.json` (and `uk/transactions.json`)

Style: flat JSON, snake_case keys (`error_unavailable`, `prompt_groceries_last_month`, `propagation_one`). Interpolation uses `{{count}}` for pluralization. **UI-SPEC §Copywriting Contract gives the literal EN strings — copy them verbatim into chat.json.** UK translations deferred to Phase 4 per phase context, so `uk/chat.json` can be a copy of EN for v1 (planner decides — UI-SPEC explicitly defers UK).

**Modification to `apps/mobile/src/lib/i18n/index.ts`** (analog lines 19-25): add two more import pairs:
```typescript
import chatEn from '../../i18n/locales/en/chat.json';
import chatUk from '../../i18n/locales/uk/chat.json';
import aiEn from '../../i18n/locales/en/ai.json';
import aiUk from '../../i18n/locales/uk/ai.json';
```
And extend `enBundle`/`ukBundle` with `chat: { ...chatEn }, ai: { ...aiEn }` following the existing deep-merge pattern (lines 43-49).

---

## Shared Patterns (cross-cutting)

### Token-only styling (apply to ALL chat components)

**Source:** `apps/mobile/src/features/transactions/TransactionRow.tsx`, `CategoryChip.tsx`, `RecategorizeBottomSheet.tsx`, `BottomSheetPrimitive.tsx`

**Rule:**
```typescript
import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...TYPE.editorialBody,
  },
});
```
- NEVER hardcoded hex
- NEVER inline `style={{ color: '#...' }}` — only inline `style` allowed is for dynamic values like animated transforms
- LinearGradient: `colors={[...GRADIENTS.primary]}` (spread the tuple — CLAUDE.md)

### Parameterized SQL (apply to all DB access — local + remote)

**Source:** `apps/mobile/src/data/merchantOverridesRepo.ts:49-53`, `transactionsRepo.ts` (entire file)

**Rule:** All SQL goes through `executeSync(sqlString, paramsArray)` locally and `supabase.from(...).update(...).match(...)` remotely. Zero string interpolation into SQL. Remote SQL Edge Function `sql-runner.ts` registry uses **parameterized prepared statements** keyed by `query_type` enum (D-18).

### HTTP error semantics (apply to all AI service wrappers)

**Source:** `apps/mobile/src/lib/http.ts:31-42` (HttpError class) + `monobank.ts:91-97` (status → translated message)

**Rule:** Every service file imports `{ httpJson, HttpError } from '@lib/http'`, wraps the call in try/catch, discriminates `err instanceof HttpError` to map known status codes to translated user-facing keys, then re-throws unknowns. Token redaction is already built-in.

### Zustand store discipline (apply to chatStore, propagationStore)

**Source:** `apps/mobile/src/features/transactions/recategorizeStore.ts` (ephemeral) vs `apps/mobile/src/stores/onboarding.ts` and `features/transactions/filterStore.ts` (persisted)

**Rule:** Chat session state and propagation toast state are **ephemeral** (no `persist` middleware). Anything user-config or onboarding state continues to use the SecureStore adapter pattern. Chat history persistence is explicitly out of scope per D-14/D-15.

### Test layout (apply to all Phase 3 tests)

**Source:** `apps/mobile/src/features/transactions/filterCompose.test.ts` (pure logic, co-located) vs `apps/mobile/tests/db-migration.test.ts` (integration, root tests dir)

**Rule:**
- Pure functions (normalizeMerchantKey, chart geometry, prompt construction): co-located `<file>.test.ts` next to source
- Repo / DB-touching / wire-shape tests: `apps/mobile/tests/<name>.test.ts`
- React component tests: **NEW PATTERN** — no precedent yet; planner picks `@testing-library/react-native` or skips component tests for Phase 3 (UI verified manually on physical device per CLAUDE.md verification gate)

### Security (apply to ALL Edge Functions + services)

**Source:** `CLAUDE.md` §Security, `monobank.ts` (no console.log), `http.ts` (token redaction), `merchantOverridesRepo.ts` line 8 (parameterized SQL comment)

**Rule applied to Phase 3:**
- `transactions.description` NEVER serialized into any LLM payload (enforced at the `ai-categorize` request-shape contract — payload schema rejects a `description` field)
- Chat queries see only aggregates via `ai-query` SQL runner — never row-level data
- Anthropic API key lives in Supabase project secrets only (`Deno.env.get`); never in app bundle, never in `expo-secure-store` (which is for *device-local* secrets only)
- Zero `console.log` in production Edge Function code (mirror `monobank.ts` discipline)
- Edge Function user-JWT pass-through (D-19) for `ai-query` so RLS auto-scopes
- Service-role used ONLY for `ai-categorize` writes (it needs to write transactions.category_id on behalf of the user, but the row belongs to the user — RLS still applies via WHERE user_id = JWT.sub)

---

## No Analog Found (planner uses RESEARCH.md / 03-AI-SPEC.md / 03-UI-SPEC.md as blueprint)

| File | Role | Reason |
|------|------|--------|
| `supabase/functions/ai-categorize/index.ts` | Edge Function | First Edge Function in repo. Pattern derived from AI-SPEC §framework + this map's "Edge Function composition" entry above. |
| `supabase/functions/ai-query/index.ts` | Edge Function | Same — first chat/streaming Edge Function. Derive structure from `ai-categorize` once landed. |
| `supabase/functions/_shared/anthropic.ts` | Anthropic SDK wrapper | No precedent. Planner establishes convention per AI-SPEC. |
| `supabase/functions/_shared/schemas.ts` | zod schemas | zod not yet used in the repo. AI-SPEC mandates schema validation; planner introduces zod as new dep for Edge Functions only (NOT mobile, where validation is type-only). |
| `supabase/functions/_shared/sql-runner.ts` | Parameterized statement registry for Sonnet's tool calls | Local op-sqlite repos give a *style* analog but the semantics are Postgres + RLS scoping + `query_type` enum dispatch — new pattern. See D-17..D-20. |
| `apps/mobile/src/features/chat/ChatBubble.test.tsx` | RN component test | No prior RN component test in repo. Planner picks `@testing-library/react-native` OR defers visual verification to physical-device UAT (per CLAUDE.md gate). |

---

## Metadata

**Analog search scope:**
- `apps/mobile/src/data/` — repos (5 files)
- `apps/mobile/src/api/` — HTTP clients (2 files)
- `apps/mobile/src/lib/` — utilities (http, db, i18n, money, time, secure, monobank, synthetic, csv)
- `apps/mobile/src/features/{dashboard,transactions,categories}/` — Phase 1+2 feature modules
- `apps/mobile/src/components/` — shared primitives (BottomSheet, TextField, PressableButton, SourceTile)
- `apps/mobile/src/stores/` — global stores (onboarding only)
- `apps/mobile/src/i18n/locales/` — Phase 1+2 i18n bundles
- `apps/mobile/src/lib/i18n/index.ts` — i18n bootstrap
- `apps/mobile/tests/` — integration tests (5 files)
- `apps/mobile/src/features/**/*.test.ts` — co-located pure-logic tests (5 files)
- `supabase/` — root presence only (functions/ and migrations/ are empty)

**Files scanned:** ~40 source files inspected by name; 8 read in full (merchantOverridesRepo, monobank, http, onboarding, BottomSheetPrimitive header, RecategorizeBottomSheet header, recategorizeStore, filterStore, i18n/index, transactions.json).

**Pattern extraction date:** 2026-05-14

**Critical reconciliation flags for planner:**
1. **UI-SPEC says `@gorhom/bottom-sheet`, repo uses `BottomSheetPrimitive`** — Phase 3 reuses primitive (drop-in API, Expo Go compatible). Spec-vs-reality must be called out explicitly in 03-03 plan.
2. **`merchant_overrides` schema name mismatch** — local repo uses `merchant_pattern` + substring `LIKE`; CONTEXT D-01/D-02 mandates `merchant_key` + exact match. Phase 3 must reconcile (rename columns + change matching strategy + drop existing migration data, OR introduce a mapping layer). Flag in 03-02 plan.
3. **UK translations deferred to Phase 4 per UI-SPEC** — `uk/chat.json` and `uk/ai.json` can be EN copies for v1; do not block on translation.
