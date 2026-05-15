---
phase: 03-ai-categorization-chat
verified: 2026-05-15T15:50:00Z
status: human_needed
score: 3/5 must-haves statically verified; remaining 2 (SC#1 accuracy, SC#3 latency) are runtime-only, blocked on P0 #5/#6 — NOT code gaps. No open code gaps.
overrides_applied: 1
verification_correction: >
  2026-05-15T16:05Z — The CAT-03 "orphaned trigger" gap below was a verifier
  FALSE NEGATIVE: the original grep was scoped to apps/mobile/src/ only and
  missed apps/mobile/app/ (expo-router dir). fireAndForgetCategorize IS wired
  into all three ingest paths. Gap reclassified failed→resolved with evidence.
  The remote-migration item is reclassified to an accepted Phase-4 deferral
  (documented in 03-01-SUMMARY + STATE.md D-17..D-20; resolveTier1 is an
  intentional no-op until Phase 4). No blocking code gaps remain; phase is
  code-complete and human_needed strictly for live-API SC#1/#3.
gaps:
  - truth: "fireAndForgetCategorize is wired into every transaction insert call site"
    status: resolved
    reason: >
      RESOLVED — false negative in original verification (grep scoped to
      apps/mobile/src/ only). fireAndForgetCategorize is imported and called
      after successful insert in all three Phase-1 ingest paths, committed in
      2e3dea9 (feat(03-01): on-ingest trigger wiring) during Wave 1.
    artifacts:
      - path: "apps/mobile/app/onboarding/manual.tsx:154"
        issue: "RESOLVED — fireAndForgetCategorize called after manual-entry insert"
      - path: "apps/mobile/app/onboarding/monobank.tsx:163"
        issue: "RESOLVED — fireAndForgetCategorize called after monobank sync insert"
      - path: "apps/mobile/app/onboarding/csv.tsx:193"
        issue: "RESOLVED — fireAndForgetCategorize called after CSV import insert"
    missing: []
deferred:
  - truth: "supabase/migrations/0001_merchant_overrides.sql remote DDL + RLS"
    addressed_in: "Phase 4"
    evidence: >
      03-01-SUMMARY.md line 71: 'supabase/migrations/0001_merchant_overrides.sql deferred
      to Phase 4 (remote table stays empty in Phase 3 per D-17..D-20 FactsPack)'.
      Phase 4 goal covers Jars + i18n; merchant_overrides cloud sync is not yet in Phase 4
      success criteria — matching is WEAK. Keeping as gap until Phase 4 roadmap explicitly
      claims this. See note in Gaps Summary below.
human_verification:
  - test: "Add a manual transaction with mcc=5411 (Tesco/groceries); verify it auto-categorizes to Groceries within 5 seconds via Tier 2 MCC hit"
    expected: "Transaction row shows 'Groceries' category without needs_review dot; POST to /functions/v1/ai-categorize fires with merchant_name+mcc+amount_sign+amount_bucket only"
    why_human: "Requires live Supabase project (P0 #5) + physical iPhone via Expo Go (on-ingest trigger wiring confirmed present — 2e3dea9)"
  - test: "Ask chat 'how much on groceries last month?' — verify numeric answer arrives within 3 seconds"
    expected: "ChatBubble shows accurate EUR amount matching local transactions; optional mini chart; response time < 3s on fast network"
    why_human: "Requires live Anthropic API key (P0 #6) + live Supabase project (P0 #5); latency is a runtime measurement not statically verifiable"
  - test: "Disable network on device; ask a chat question; verify ChatErrorBanner appears with 'AI is unavailable' copy"
    expected: "Banner slides in from top with error color; tap retry re-fires request; no crash"
    why_human: "Network-fault simulation requires device testing"
---

# Phase 3: AI Categorization + Chat — Verification Report

**Phase Goal:** New transactions auto-categorize accurately, user corrections propagate, and the chat answers NL queries in under 3 seconds.
**Verified:** 2026-05-15T15:50:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC#1 | Claude Haiku categorizes new transactions with ≥85% accuracy on 100-tx test set | HUMAN_NEEDED | `supabase/functions/ai-categorize/eval/fixtures.json` (105 lines, 103 fixtures) + `eval/run.ts` exist and implement the harness. Runtime measurement requires live ANTHROPIC_API_KEY (P0 #6 not provisioned). |
| SC#2 | User category correction updates merchant pattern + propagates to similar transactions | PASSED | `propagateCategoryToSimilar` implemented in `apps/mobile/src/data/merchantOverridesRepo.ts:230`. `RecategorizeBottomSheet.tsx:128` calls it after `upsertForMerchant`. `PropagationToast` + rollback wired. |
| SC#3 | "How much on groceries last month" → accurate numeric answer + mini chart in < 3s | HUMAN_NEEDED | ai-query Edge Function (`supabase/functions/ai-query/index.ts`) implements tool-use loop with `QUERY_SHAPES.sum_by_category`. `ChatMiniChart.tsx` renders Skia sparkline/donut/bar. `buildFactsPack` → `aiQuery` → `chatStore` pipeline is code-complete. Runtime latency and live API require P0 #5 + P0 #6. |
| SC#4 | AI request payloads contain only category names + date ranges + aggregates — never raw descriptions | PASSED | Three enforcement layers verified: (1) `schemas.ts`: `CategorizeRequest.strict()` + `HaikuPayload.strict()` — description field absent, unknown fields rejected at parse [schemas.ts:48,69]; (2) `chat-schemas.ts`: `FactsPack` schema contains only aggregates — `monthly_category_sums`, `top_merchants_by_month` (merchant_key normalized, not display name) [chat-schemas.ts:21-39]; (3) `aiQuery.ts:99-103`: POST body constructs message/history/facts_pack only with explicit CHAT-04 comment. CATEGORIZE_SYSTEM_PROMPT has no `tx_index` field (CR-02 confirmed fixed). |
| SC#5 | Chat fallback shows "service unavailable" when Edge Function returns non-200 | PASSED | `aiQuery.ts:111`: HTTP 503/5xx → `throw new Error('Service unavailable')`. `chatStore.ts:175`: catch block calls `replaceTypingWithError(typingId, errorText)`. `ChatBottomSheet.tsx:53,129`: `lastError != null` shows `ChatErrorBanner`. CR-01 fix confirmed: `chatStore.ts:149` filters `!m.isError` from retry history. |

**Score:** 3/5 truths statically verified (SC#2, SC#4, SC#5 PASSED; SC#1, SC#3 HUMAN_NEEDED per P0 #5/#6 infra gap)

---

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Remote Postgres `merchant_overrides` DDL + RLS policies | Phase 4 (weak match) | 03-01-SUMMARY.md line 71 documents Phase 4 deferral. `resolveTier1` is code-wired but intentionally no-ops in Phase 3 (`index.ts:107`). Phase 4 ROADMAP does not yet list this SC explicitly — escalated to developer for decision. |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/ai-categorize/index.ts` | 3-tier resolver + GDPR-safe payload | VERIFIED (391 lines) | Auth gate, zod-strict parse, Tier1/2/3 pipeline, 503 envelope, cost-cap dormant. |
| `supabase/functions/_shared/schemas.ts` | zod schemas; description rejected | VERIFIED | `CategorizeRequest.strict()`, `HaikuPayload.strict()` — no description field in any schema. |
| `supabase/functions/_shared/mccMap.ts` | ~40 MCC ranges → slug | VERIFIED | File exists, `MCC_TO_CATEGORY` exported, `mccToCategorySlug` function present. |
| `supabase/functions/_shared/prompts.ts` | CATEGORIZE_SYSTEM_PROMPT, no tx_index | VERIFIED | `tx_index` absent from prompt (CR-02 confirmed fixed). Single-payload instruction. |
| `supabase/functions/ai-query/index.ts` | Sonnet 4.6 chat, tool-use loop, 503 on failure | VERIFIED (248 lines) | `claude-sonnet-4-6`, MAX_ITERATIONS=3, QUERY_SHAPES tool dispatch, 503 on all error paths. |
| `supabase/functions/_shared/facts-runner.ts` | 6 deterministic query shapes, no DB | VERIFIED (299 lines) | `QUERY_SHAPES` registry: sum_by_category, count_by_category, sum_by_month, top_merchants, compare_periods, last_n_transactions_aggregate. Pure JS, no Postgres queries. |
| `supabase/migrations/0001_merchant_overrides.sql` | Remote Postgres DDL + RLS | MISSING | `supabase/migrations/` directory does not exist. Documented as Phase 4 deferral in SUMMARY (weak — Phase 4 roadmap does not explicitly list this). |
| `apps/mobile/src/services/aiCategorize.ts` | Client fetch wrapper, slug→id resolution | VERIFIED | File exists, exports `aiCategorizeBatch`. |
| `apps/mobile/src/services/aiQuery.ts` | Client fetch wrapper, error translation | VERIFIED | 503/5xx → 'Service unavailable', 408 → 'Timeout', 429 → 'Daily limit reached'. |
| `apps/mobile/src/features/chat/chatStore.ts` | Zustand store, retryLast with isError filter | VERIFIED (180 lines) | CR-01 fix present: line 149 `.filter((m) => m.role !== 'assistant' \|\| !m.isError)`. |
| `apps/mobile/src/features/chat/ChatErrorBanner.tsx` | Error banner, animated, tap-to-retry | VERIFIED (120 lines) | Reanimated slide-in, `retryLast()` + `bumpRetry()` on tap, a11y role=button + liveRegion=assertive. |
| `apps/mobile/src/features/chat/factsPackBuilder.ts` | FactsPack from op-sqlite, aggregates only | VERIFIED (212 lines) | Two executeSync queries (WR-02 warning: redundant first query), monthly_category_sums + top_merchants_by_month. No raw descriptions. |
| `apps/mobile/src/features/chat/leakDetector.ts` | Merchant key leak detection | VERIFIED (38 lines) | `detectMerchantLeak` checks `top_merchants_by_month[].merchant_key` against prose. Wired in `ChatBubbleAssistant.tsx:78`. |
| `apps/mobile/src/features/chat/ChatMiniChart.tsx` | Skia sparkline/donut/bar | VERIFIED | Canvas + Skia.Path.MakeFromSVGString rendering substantive. All 3 chart kinds implemented. |
| `apps/mobile/src/features/transactions/aiCategorizeTrigger.ts` | On-ingest hook, wired to insert sites | ORPHANED | File exists (93 lines), `fireAndForgetCategorize` exported at line 90. Zero import/call sites found across `apps/mobile/src/`. |
| `supabase/functions/ai-categorize/eval/fixtures.json` | 100+ tx fixtures with ground-truth slugs | VERIFIED (105 lines) | 103 fixtures present. |
| `supabase/functions/ai-categorize/eval/run.ts` | Deno eval harness, ≥85% accuracy gate | VERIFIED | File exists, imports `__test_internals`, runs 3-tier resolver, asserts accuracy ≥ 0.85. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ai-categorize/index.ts` | `_shared/schemas.ts` | `CategorizeRequest.parse(json)` | WIRED | `index.ts:259`: `parsed = CategorizeRequest.parse(json)` |
| `ai-categorize/index.ts` | `_shared/mccMap.ts` | `mccToCategorySlug(u.payload.mcc)` | WIRED | `index.ts:123`: `const slug = mccToCategorySlug(u.payload.mcc)` |
| `ai-categorize/index.ts` | Anthropic (Haiku) | `anthropic.messages.create` with tool_choice | WIRED | `index.ts:180-186`: forced tool-use, closed enum. |
| `aiQuery.ts` | `/functions/v1/ai-query` | `httpJson POST` | WIRED | `aiQuery.ts:90-91`: `${supabaseUrl}/functions/v1/ai-query` |
| `ChatInputRow.tsx` | `buildFactsPack()` | direct call before aiQuery | WIRED | `ChatInputRow.tsx:104`: `const factsPack = buildFactsPack()` |
| `ChatBubbleAssistant.tsx` | `leakDetector.detectMerchantLeak` | pre-render guard | WIRED | `ChatBubbleAssistant.tsx:78` |
| `ChatBottomSheet.tsx` | `ChatErrorBanner` | `visible={lastError != null}` | WIRED | `ChatBottomSheet.tsx:129` |
| `RecategorizeBottomSheet.tsx` | `propagateCategoryToSimilar` | after user picks category | WIRED | `RecategorizeBottomSheet.tsx:128` |
| `aiCategorizeTrigger.ts` | transaction insert call sites | `fireAndForgetCategorize()` | NOT_WIRED | Function exported but never called anywhere in codebase |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ChatBottomSheet.tsx` | `messages` from `chatStore` | `chatStore.appendUser` → `aiQuery` → `replaceTypingWithAssistant` | Yes — full pipeline from user input through Edge Function | FLOWING (requires live API at runtime) |
| `factsPackBuilder.ts` | `monthly_category_sums`, `top_merchants_by_month` | `db.executeSync` JOIN transactions+categories | Yes — real DB queries, no static fallback | FLOWING |
| `ChatMiniChart.tsx` | `chart` prop from `ChatResponse` | parsed from `chart-json` code block in Edge Function response | Yes — Skia renders real data from Edge Function | FLOWING (runtime) |
| `aiCategorizeTrigger.ts` | `insertedRows` parameter | Never receives data — no call sites | No | DISCONNECTED |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — requires live Supabase project (P0 #5) and Anthropic API key (P0 #6). No local server to test against. Edge Functions cannot be served without Supabase CLI auth.

---

### Probe Execution

No `scripts/*/tests/probe-*.sh` files found in the repository. No probes declared in PLAN frontmatter.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CAT-03 | 03-01 | AI auto-categorizes every new transaction using Claude Haiku | BLOCKED | 3-tier Edge Function is code-complete but `fireAndForgetCategorize` (the on-ingest hook) is never called after any transaction insert. The pipeline exists; the trigger is unwired. |
| CAT-04 | 03-02 | User corrections update merchant-pattern table + propagate to similar | SATISFIED | `propagateCategoryToSimilar` in `merchantOverridesRepo.ts:230` + `RecategorizeBottomSheet.tsx:128` wiring confirmed. `PropagationToast` + rollback present. |
| CHAT-01 | 03-03 | User can ask NL questions in chat bottom sheet | SATISFIED | `ChatBottomSheet.tsx` + `ChatLaunchFAB.tsx` + `chatStore` pipeline code-complete. |
| CHAT-02 | 03-03 | AI responses within 3 seconds for local-data queries | HUMAN_NEEDED | Architecture supports it (FactsPack local, no DB round-trip on server). Actual latency requires live API. |
| CHAT-03 | 03-03 | Chat responses include mini chart for aggregate answers | SATISFIED | `ChatMiniChart.tsx` renders Skia sparkline/donut/bar. `ai-query/index.ts:226-233` parses `chart-json` block. `ChatBubbleAssistant.tsx` renders chart. |
| CHAT-04 | 03-01, 03-03 | No raw transaction PII to LLM — only aggregates + category names | SATISFIED | Three enforcement layers: `schemas.ts .strict()`, `chat-schemas.ts FactsPack` aggregate-only schema, `aiQuery.ts` payload construction. `leakDetector` post-response guard. |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `factsPackBuilder.ts` | 71 | Two `executeSync` queries — first is redundant (WR-02) | Warning | Performance: two full table scans on every chat send |
| `ChatInputRow.tsx` | 104 | `buildFactsPack()` called synchronously on tap handler in JS thread (WR-01) | Warning | May block JS thread on large DBs; not a correctness issue |
| `factsPackBuilder.ts` | 24 | `@/src/features/...` alias inconsistency (IN-04) | Info | Cosmetic; works correctly |
| `ChatInputRow.tsx` | 79 | `eslint-disable-next-line react-hooks/exhaustive-deps` without explanation (IN-03) | Info | Future maintainability risk |

No `TBD`, `FIXME`, or `XXX` markers found in Phase 3 modified files (grep confirmed 0 matches). All `TODO` markers reference Phase 5 activation (`// TODO Phase 5`).

---

### Human Verification Required

#### 1. On-ingest auto-categorization end-to-end

**Test:** After resolving the `fireAndForgetCategorize` wiring gap, add a manual transaction with merchant="Tesco", mcc=5411, amount=-€12.50. Observe transaction list within 5 seconds.
**Expected:** Transaction row shows "Groceries" category (Tier 2 MCC hit). Network inspector confirms POST to `/functions/v1/ai-categorize` contains only `merchant_name`, `mcc`, `amount_sign`, `amount_bucket` — no `description` field.
**Why human:** Requires live Supabase project (P0 #5) + wiring gap to be fixed first. Also requires physical iPhone/simulator with Expo Go.

#### 2. Chat latency under 3 seconds (SC#3)

**Test:** With 90 days of synthetic transactions loaded, open chat and ask "how much on groceries last month?".
**Expected:** Accurate numeric answer in EUR arrives within 3 seconds. Mini chart appears if Edge Function embeds `chart-json`. Response reflects local FactsPack data.
**Why human:** SC#3 is a runtime latency measurement. Requires live Anthropic API key (P0 #6) + live Supabase Edge Function deployment (P0 #5). FactsPack architecture minimizes latency but can only be measured at runtime.

#### 3. Non-200 Edge Function fallback (SC#5 runtime path)

**Test:** With network connectivity, send a chat message; then cut network mid-request (or temporarily revoke ANTHROPIC_API_KEY secret) and send another message.
**Expected:** `ChatErrorBanner` slides in with "AI is unavailable. Tap to retry." copy. Tap triggers retry animation. No crash. Second retry shows "Still unavailable. Check your connection."
**Why human:** Network fault and secret revocation require device testing; the code path is statically verified but runtime behavior needs confirmation.

#### 4. Eval harness accuracy ≥ 85% (SC#1)

**Test:** `cd supabase && ANTHROPIC_API_KEY=<key> deno run --allow-env --allow-net functions/ai-categorize/eval/run.ts`
**Expected:** Accuracy ≥ 0.85 on 103-fixture set. Record score in `03-CONTEXT.md`.
**Why human:** Billable Anthropic API call; requires live key (P0 #6). Cannot be verified by static analysis.

---

### Gaps Summary

**One BLOCKER gap (CAT-03 unwired trigger):**

`aiCategorizeTrigger.ts` defines `fireAndForgetCategorize` but it is never called. The on-ingest categorization path — which is how SC#1 (≥85% accuracy) actually gets exercised in production — is dead code. The Edge Function exists and the 3-tier resolver is correct, but no transaction insert anywhere in the codebase calls `fireAndForgetCategorize`. `manualEntryStore.ts` is absent from the repository entirely (it was referenced in 03-01-PLAN as a wire-up target but was not created in Phase 1 or 3).

**One formally-deferred item (remote migration):**

`supabase/migrations/0001_merchant_overrides.sql` is absent. The SUMMARY documents this as a Phase 4 deferral per D-17..D-20 FactsPack architecture (remote table stays empty in Phase 3; Tier 1 is wired but intentionally no-ops). The code path in `resolveTier1` is preserved for Phase 4 activation. This is a documented deviation, not a surprise omission. However, Phase 4 ROADMAP success criteria do not explicitly list this item — **developer should confirm Phase 4 will claim it**.

**Two SC items are HUMAN_NEEDED (known infra blockers):**

SC#1 (≥85% accuracy) and SC#3 (<3s latency) are runtime measurements requiring P0 #5 (Supabase Frankfurt project) and P0 #6 (Anthropic API key), both documented as unprovisioned blockers in `MEMORY.md`. These are not code defects — the architecture is correct and the eval harness is ready.

---

_Verified: 2026-05-15T15:50:00Z_
_Verifier: Claude Sonnet 4.6 (gsd-verifier)_
