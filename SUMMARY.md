# 03-01 Wave-1 Executor Summary

**Worktree:** `agent-a1b43c158afa1b64e`
**Branch:** `worktree-agent-a1b43c158afa1b64e`
**Base:** `d42b478` (main)
**Scope:** Tasks 1 (partial — migration v3 only), 2 (Edge Function), 3 (eval harness).
**Date:** 2026-05-14

## Commits

| Hash | Type | Subject |
|------|------|---------|
| `3b3fbdb` | feat(03-01) | db migration v3 transactions ai cols |
| `9cac151` | feat(03-01) | ai-categorize Edge Function |
| `c5c2516` | test(03-01) | eval harness + 103-tx fixtures |

## Files added

- `supabase/functions/_shared/anthropic.ts` — SDK factory; reads Deno.env ANTHROPIC_API_KEY
- `supabase/functions/_shared/mccMap.ts` — ~80 ISO 18245 ranges → Phase 1 slugs
- `supabase/functions/_shared/normalize.ts` — byte-identical to 03-02 merchantNormalize.ts
- `supabase/functions/_shared/prompts.ts` — CATEGORIZE_SYSTEM_PROMPT + closed CATEGORY_SLUGS enum
- `supabase/functions/_shared/schemas.ts` — zod .strict() request + HaikuPayload + bucketize
- `supabase/functions/ai-categorize/index.ts` — serve handler, 3-tier resolver, 503 envelope
- `supabase/functions/ai-categorize/tests/mcc-prepass.test.ts`
- `supabase/functions/ai-categorize/tests/payload-redaction.test.ts`
- `supabase/functions/ai-categorize/eval/fixtures.json` — 103 curated transactions
- `supabase/functions/ai-categorize/eval/run.ts` — Deno eval harness, ≥0.85 accuracy gate

## Files modified

- `apps/mobile/src/lib/db/schema.sql.ts` — added SCHEMA_003 export
- `apps/mobile/src/lib/db/migrations.ts` — appended { version: 3, sql: SCHEMA_003 }

## What was built

### Task 1 — partial (migration v3 only)
Added local op-sqlite migration version 3 (Wave-1 lock-step with 03-02 owning version 4). SCHEMA_003 adds three columns to `transactions`:
- `ai_confidence REAL` nullable — Haiku-returned confidence 0..1
- `needs_review INTEGER NOT NULL DEFAULT 0` — 1 when confidence < 0.75 (D-11); op-sqlite has no BOOLEAN
- `last_ai_attempt_at INTEGER` nullable — unix seconds (matches `nowSeconds()`)

### Task 2 — Edge Function `ai-categorize`
3-tier resolver (override → MCC → Haiku) with GDPR-safe payload contract enforced at the zod schema level.

- `_shared/schemas.ts` — `CategorizeRequest.strict()` rejects unknown top-level + per-tx keys (description, notes, secret_field). `HaikuPayload.strict()` locks the LLM payload to exactly `{ merchant_name, mcc, amount_sign, amount_bucket }`. `bucketize()` quantizes absolute cents into 5 buckets so exact spend never crosses to Anthropic.
- `_shared/mccMap.ts` — ~80 ISO 18245 ranges. Slugs match Phase 1 SEED_DEFAULT_CATEGORIES exactly. Airline/hotel MCCs map to `entertainment` as `TODO Phase 4: 'travel' slug`.
- `_shared/prompts.ts` — System prompt: role + closed-enum slug list + sign convention + AI-SPEC G10 injection guard + tone rules (no emoji, no "Let's break it down"). User message is `JSON.stringify({transactions})` — pure data.
- `_shared/normalize.ts` — Byte-identical function body to the literal in `03-02-PLAN.md` lines 185-194. Cyrillic-preserving (Ѐ-ӿ + Ԁ-ԯ + Latin alnum), idempotent, 64-char cap.
- `_shared/anthropic.ts` — Fail-fast factory.
- `ai-categorize/index.ts`:
  - CORS 204 preflight; JWT 401 gate; zod-strict 400 on parse failure
  - Tier 1: RLS-scoped lookup against `merchant_overrides` (Phase 3 inert; remote stays empty until Phase 4 — code path wired with TODO)
  - Tier 2: synchronous `mccToCategorySlug` (confidence 0.85, `needs_review=false`)
  - Tier 3: Haiku with tool-use forced (`tool_choice: { type: 'tool', name: 'assign_category' }`), `Promise.allSettled` at concurrency=5 (D-21), max_tokens=256, closed-enum input_schema (T-03-01-09)
  - Whole-batch failure → 503 `{ error: 'ai_unavailable', retry_after: 60 }`
  - Per-row failure → `{ tx_id, error: 'haiku_failed' }`
  - Cost cap (D-24) DORMANT: reads `X-Daily-Spend-Cents`, skips Tier 3 if ≥ 2000¢. `TODO Phase 5: activate when client begins tracking spend` literal in source.
  - Returns 200 `{ results: [...] }` with `category_slug` (not `category_id`). Client resolves slug→id locally.
  - Zero `console.log` of payload contents. `SENTRY:` comments mark Phase 5 breadcrumb sites.
- Tests (Deno, 13 cases total):
  - `mcc-prepass.test.ts` — table-driven correctness across MCC_TO_CATEGORY + null/non-4-digit/empty input + 6 specific known MCCs
  - `payload-redaction.test.ts` — `.strict()` rejects description/notes/extra top-level keys; HaikuPayload has exactly 4 keys; bucketize boundary correctness; 50-row batch cap

### Task 3 — eval harness
- `fixtures.json` — 103 transactions (overshoots 100-min for slug-coverage padding; covers 14 of 18 Phase 1 slugs):
  - 30 European merchants with MCC (Tesco, Lidl, Boojum, Bolt, Aer Lingus, Applegreen)
  - 20 Ukrainian merchants with MCC (АТБ, Сільпо, Київстар, Glovo, OKKO, Метро)
  - 30 global streaming/retail/transfers (Netflix, Spotify, PayPal *Donation, Wise, Revolut Vault)
  - ~20 edge cases (mixed-script `Сільпо Маркет №112`, single-letter `X`, all-punctuation `???`, aggregator-format `PAYPAL *NETFLIX`, `SQ *COFFEE SHOP`)
  - All synthetic; no production data.
- `run.ts` — Deno script: pre-resolves Tier 2 synchronously, sends Tier 3 to Haiku at concurrency=5 with tool-use forced. Prints confusion table + misclassification list + summary. Exits non-zero if accuracy < 0.85. Workflow_dispatch-only in CI per D-24 (Haiku calls are billable).

## Verification gate status

| Gate | Status |
|------|--------|
| `npx tsc --noEmit` | DEFERRED — worktree has no node_modules |
| `npx expo lint` | DEFERRED — same |
| `npx jest tests/ai-categorize-service.test.ts` | DEFERRED — service test out of this worktree's scope |
| `deno test functions/ai-categorize/tests/` | DEFERRED — Deno not installed in this env |
| Eval ≥ 0.85 accuracy | DEFERRED — real-API gate; needs ANTHROPIC_API_KEY + Deno |
| `grep description supabase/functions/_shared/schemas.ts` | PASS by absence |
| MIGRATIONS array contains [1,2,3] | PASS |
| Pre-commit HEAD on worktree-agent-* branch | PASS (3 commits) |

## Device-checkpoint items (developer must run)

1. `cd apps/mobile && npm install`
2. `cd apps/mobile && npx tsc --noEmit` — must exit 0
3. `cd apps/mobile && npx expo lint` — must exit 0
4. Launch on physical iPhone via Expo Go; confirm migration v3 applies cleanly (`PRAGMA user_version = 3`)
5. Install Deno: `curl -fsSL https://deno.land/install.sh | sh`
6. `cd supabase && deno test functions/ai-categorize/tests/` — all tests must pass
7. Provision Supabase secrets:
   - `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` (from Anthropic Console)
   - `supabase secrets set AI_DAILY_CATEGORIZE_USD=0.20`
8. `supabase functions deploy ai-categorize`
9. Run eval: `ANTHROPIC_API_KEY=sk-ant-... deno run --allow-env --allow-net --allow-read supabase/functions/ai-categorize/eval/run.ts`
10. Record accuracy here and in `.planning/STATE.md`. If < 0.85, inspect confusion table and adjust `mccMap.ts` or `prompts.ts`.
11. Smoke test: `supabase functions serve ai-categorize` + curl with `{"transactions":[{"tx_id":1,"merchant_name":"Tesco","mcc":"5411","amount_cents":-1250}]}` → expect 200 with `category_slug: "groceries"` from Tier 2 (no Anthropic call).
12. After 03-02 merges: cross-plan diff gate
    ```
    diff <(sed -n '/^export function normalizeMerchantKey/,/^}/p' apps/mobile/src/features/transactions/merchantNormalize.ts) \
         <(sed -n '/^export function normalizeMerchantKey/,/^}/p' supabase/functions/_shared/normalize.ts)
    ```
    Must exit 0.

## Deviations + rationale

| Deviation | Rationale |
|-----------|-----------|
| Task 1 partial — deferred mobile Supabase client + remote `merchant_overrides` migration + on-ingest trigger | User's worktree dispatch narrowed scope to "migration v3 + transactions ai-columns" only. Supabase client + remote migration depend on ENV-var provisioning and are entangled with 03-02 normalize ordering — reschedule as 03-01b follow-up. |
| `aiCategorize.ts` mobile service NOT written | Same as above. Edge Function contract complete; client wrapper is a small follow-up. |
| `fireAndForgetCategorize` on-ingest trigger NOT wired | Depends on mobile service. Reschedule. |
| Tier 1 reads but does not consume `data` | Remote table stores `category_id` (numeric local), Edge Function contract returns `category_slug`. Without remote categories sync (Phase 4) slug recovery is impossible. Code path wired for Phase 4 activation; inert in Phase 3 because remote `merchant_overrides` stays empty per D-17′..D-20′ FactsPack contract. Documented inline with TODO. |
| 103 fixtures instead of 100 | Overshoot for slug-coverage padding. Covers 14 of 18 Phase 1 slugs (rent/refunds/gifts/coffee underrepresented because coffee collapses into eating-out under MCC 5814 — matches mapping). |
| `_shared/normalize.ts` shipped before 03-02 merges | User's worktree prompt explicitly instructs to copy the literal from `03-02-PLAN.md` Task 1 body byte-for-byte. Cross-plan diff gate (item 12) verifies identity after merge. |
| `supabase secrets set` documented but not executed | No CLI login in worktree. Developer runs on host. |

## Threat flags (new surface)

- T-03-01-01 (description leak): MITIGATED at zod schema layer + test
- T-03-01-02 (prompt injection): MITIGATED via G10 system-prompt guard + closed-enum tool schema
- T-03-01-03 (RLS bypass): N/A Phase 3 (remote table empty); code uses userClient JWT pass-through
- T-03-01-04 (API key leak): MITIGATED — key only in `Deno.env.get`, never in mobile bundle
- T-03-01-05 (cost spike): MITIGATED — batch cap=50, concurrency=5
- T-03-01-08 (log leakage): MITIGATED — zero console.log of payload contents
- T-03-01-09 (Haiku hallucination): MITIGATED — closed-enum input_schema + server-side allowlist check

No new threats beyond the plan's threat model.

## Deferred items (scheduled follow-ups)

| Item | Wave |
|------|------|
| `apps/mobile/src/lib/supabase.ts` singleton with secureStorage adapter | Phase 3 follow-up |
| `apps/mobile/src/services/aiCategorize.ts` (HTTP wrapper + slug→id resolution + needs_review derivation) | Phase 3 follow-up |
| `transactionsRepo` extensions: `updateCategoryBatch`, `markNeedsReview`, `listUncategorized` | Phase 3 follow-up |
| `fireAndForgetCategorize` on-ingest trigger + wiring | Phase 3 follow-up |
| `supabase/migrations/0001_merchant_overrides.sql` remote DDL + RLS | Phase 4 |
| `supabase/config.toml` | Phase 3 follow-up |
| Cost-cap activation (D-24) | Phase 5 |
| Sentry breadcrumb wiring | Phase 5 |
| `.github/workflows/ci.yml` ai-eval workflow_dispatch job | Phase 3 follow-up |
| Final eval accuracy recorded in STATE.md | Device checkpoint |

## Final eval accuracy: TBD — device checkpoint

Eval harness exists with hard 0.85 gate. Cannot run in this worktree (no ANTHROPIC_API_KEY, no Deno).

## Versions pinned

- `@anthropic-ai/sdk@0.32.1` (Deno)
- `zod@3.23.8` (Deno)
- `@supabase/supabase-js@2` (jsr)
- `deno.land/std@0.220.0`

## Self-check

- [x] 3 commits, conventional subjects ≤ 50 chars, scope 03-01, co-author footer
- [x] `_shared/normalize.ts` body matches 03-02-PLAN.md literal byte-for-byte
- [x] `description` absent from `_shared/schemas.ts` and `index.ts` (grep verified)
- [x] MIGRATIONS = [1, 2, 3] in source
- [x] `ANTHROPIC_API_KEY` only in `_shared/anthropic.ts` + `index.ts` `anthropicSingleton()`; never in `apps/mobile/`
- [x] No `console.log` of payload contents in `index.ts`
- [x] All commits on `worktree-agent-a1b43c158afa1b64e`; no protected-branch HEAD drift
