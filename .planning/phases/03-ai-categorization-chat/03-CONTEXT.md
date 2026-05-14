# Phase 3: AI Categorization + Chat - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning
**Mode:** --auto (no clarifying questions; recommended defaults selected)

<domain>
## Phase Boundary

User adds or imports a transaction and within seconds it lands in the correct category without a tap — driven by an MCC-first pre-pass and a Haiku-4.5 LLM fallback for ambiguous merchants. User opens the chat tab and asks "Сколько я потратил на кофе в апреле?" / "Where did my salary go last week?" — Sonnet-4.6 answers in EB Garamond bubbles, citing aggregated category sums (never raw transaction descriptions), reading data via a strict, parameterized, RLS-scoped read-only `ai-query` SQL tool. Both flows run server-side in Supabase Edge Functions; the client only sees results.

In scope (Phase 3 only):
- `ai-categorize` Edge Function: MCC pre-pass → merchant_overrides cache → Haiku-4.5 LLM fallback
- `ai-chat` Edge Function: Sonnet-4.6 streaming chat with `ai-query` tool (read-only aggregates)
- `merchant_overrides` table + matching algorithm (per-user learned mappings)
- Categorization trigger orchestration (on ingest + on manual entry + bulk re-run)
- Chat surface in mobile app per UI-SPEC (EB Garamond bubbles, streaming, empty/error states)
- Confidence threshold + auto-apply vs "needs review" badge surfacing in transaction list
- Eval harness for AI-SPEC's locked failure-mode rubric (offline test suite, gates merges)
- Guardrails: PII redaction, prompt-injection defenses, rate limiting, cost ceilings
- Sentry + PostHog instrumentation for AI events (latency, cost, fallback rate, user thumbs)

Out of scope (other phases):
- Goal jars / "money for what" allocation logic (Phase 4: JAR-01..03)
- Ukrainian translation pass of AI prompts/responses beyond what i18next already supports (Phase 4: SET-02, QUAL-01..04)
- Settings UI for AI toggles / model choice (Phase 5)
- Biometric gating of chat history (Phase 5)
- Receipt OCR → AI extract (v1.5)
- Multi-turn agentic actions (changing categories from chat) — Phase 3 chat is read-only
- monobank live sync (Phase 4) — Phase 3 categorization operates on synthetic + manual + Phase 1 ingested data

</domain>

<decisions>
## Implementation Decisions

### Carried Forward (Locked by AI-SPEC.md and UI-SPEC.md — NOT re-decided here)

- **L-01:** Anthropic SDK (`@anthropic-ai/sdk`) in Supabase Edge Functions (Deno). Vendor lock-in accepted with migration path. (AI-SPEC §framework)
- **L-02:** `claude-haiku-4-5` for categorization, `claude-sonnet-4-6` for chat. (AI-SPEC §models)
- **L-03:** Evaluation framework — offline eval suite over PFM-grounded failure-mode rubric. CI gate on regression. (AI-SPEC §evaluation)
- **L-04:** Guardrails — system prompts include PII rules, prompt-injection defenses, redaction of raw transaction descriptions before any LLM call (aggregates + category names only). (AI-SPEC §guardrails, CLAUDE.md §security)
- **L-05:** Production monitoring — Sentry breadcrumbs per AI call, PostHog events for cost/latency/fallback-rate/thumbs. (AI-SPEC §monitoring)
- **L-06:** Chat UI surfaces — EB Garamond italic bubbles, streaming token rendering, suggested-prompt chips on empty state, terracotta brand palette only. (UI-SPEC §chat)
- **L-07:** Categorization UI surfaces — "needs review" amber dot on low-confidence rows in the transaction list, tap → recategorize sheet from Phase 2; no separate "review queue" screen. (UI-SPEC §cat-feedback)
- **L-08:** AI safety rule — `transactions.description` is never sent to any LLM. Only `merchant_name`, `mcc`, and amount sign/bucket are sent for categorization; only aggregates (category sums, counts, date ranges) for chat. (CLAUDE.md, AI-SPEC §pii)

### merchant_overrides Schema + Matching Algorithm

- **D-01:** Schema: `merchant_overrides (id PK, user_id FK→auth.users, merchant_key TEXT, category_id FK→categories, source TEXT CHECK IN ('user','llm','mcc'), confidence REAL, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, UNIQUE(user_id, merchant_key))`. RLS: user can only see/write own rows. Owned by Supabase Postgres (Frankfurt EU); not mirrored locally.
- **D-02:** `merchant_key` is **normalized merchant_name** (lowercase, NFKD-stripped, collapsed whitespace, leading/trailing non-alphanum stripped, max 64 chars). Matching is **exact equality** on the normalized key — no substring, no Levenshtein, no fuzzy match in v1. Rationale: substring matching introduces false positives ("APPLE" matching "PINEAPPLE EXPRESS") and adds latency; exact match is deterministic, debuggable, and good enough at v1 scale.
- **D-03:** Currency is NOT part of the key. Same merchant in EUR vs UAH resolves to the same category. Per-currency segmentation deferred to v1.5 if a real-world false-positive shows up.
- **D-04:** When user manually recategorizes a transaction (Phase 2 swipe-recategorize), the app upserts `merchant_overrides` with `source='user', confidence=1.0`. User-source rows always win over llm-source on conflict.
- **D-05:** Cache invalidation — there is none. Overrides persist until the user manually recategorizes again. No TTL.

### Categorization Trigger Timing

- **D-06:** Categorization runs **on ingest** (every batch insert into `transactions`) AND **on manual entry** (single insert when user adds a transaction). No batched-nightly pass; no separate "Run AI categorization" button in v1.
- **D-07:** Trigger flow lives in the client repository layer (`transactionsRepo.ts`), not in a DB trigger. Insert returns transaction IDs → client fires `POST /functions/v1/ai-categorize` with `{ tx_ids: [...] }` → Edge Function resolves categories and writes back via service-role client. Client invalidates TanStack Query cache on response.
- **D-08:** Categorization is **non-blocking** for the UI. New transactions appear immediately in the list with `category_id = NULL` (rendered as "Uncategorized" pill); categories populate when the Edge Function responds. Optimistic state lives in TanStack Query.
- **D-09:** Bulk re-run endpoint exists (`POST /ai-categorize` with `tx_ids: 'all_uncategorized'`) but no UI surface in Phase 3. Reserved for Phase 4 monobank sync and v1.5 user-triggered bulk re-categorization.

### Confidence Threshold + MCC Pre-Pass Orchestration

- **D-10:** Three-tier resolution per transaction, in order:
  1. **`merchant_overrides` exact match** → use `category_id`. Confidence = 1.0. Skip Haiku. (No cost, <10ms.)
  2. **MCC code → category map** (built-in static table — ~40 MCC ranges → category slugs). If MCC present and matches a known range, use it. Confidence = 0.85. Skip Haiku.
  3. **Haiku-4.5 LLM call** → returns `{ category_slug, confidence (0.0..1.0), rationale }`. Only step that costs money.
- **D-11:** Confidence threshold for **auto-apply**: `>= 0.75`. Below 0.75 → `category_id` is set but row also gets `needs_review = TRUE`; UI shows amber dot per UI-SPEC L-07. User dismisses by tapping (swipe-recategorize or "confirm" action in the recategorize sheet).
- **D-12:** Confidence threshold for **persisting to merchant_overrides** (source='llm'): `>= 0.85`. Below that, Haiku result applies to this transaction only — does not pollute the per-user cache.
- **D-13:** Haiku is skipped when:
  - `merchant_overrides` hits (Tier 1), OR
  - MCC is present AND matches a known range AND no `merchant_overrides` row for this key (Tier 2).
  - On Tier 2, Haiku is still called **asynchronously and discarded** in 1% sampled cases for eval drift detection. Reserved hook; not active in v1.

### Chat Conversation Persistence

- **D-14:** **Session-scoped, in-memory only.** Chat history persists for the lifetime of the chat screen mount (or until app cold-start). Confirmed against UI-SPEC.
- **D-15:** No `chat_messages` table in Postgres. No local op-sqlite mirror. Closing the chat clears history. Rationale: matches UI-SPEC; reduces PII surface area; v1 chat is a "calculator with personality", not a journaling tool. Persisted history deferred to v1.5 with explicit user opt-in.
- **D-16:** Each user turn → fresh `messages` array sent to Sonnet-4.6 with the current session's running history (capped at last 20 turns to bound prompt tokens). System prompt is fixed and versioned in source.

### SQL Safety for `ai-query` Tool

- **D-17:** `ai-query` is a **server-side tool** exposed only to Sonnet inside the `ai-chat` Edge Function. It is NOT a public Postgres role and NOT callable from the mobile client. Sonnet sees a tool with a typed JSON schema:
  `{ query_type: 'sum_by_category' | 'count_by_category' | 'sum_by_month' | 'top_merchants' | 'compare_periods', filters: { date_from, date_to, category_slugs?, currency? } }`.
- **D-18:** No free-form SQL ever reaches Postgres from the LLM. The Edge Function maps the tool call to a **parameterized prepared statement** from a fixed library of ~6 query shapes. Sonnet picks the shape; parameters are validated (date format, category slug existence, currency enum) before binding.
- **D-19:** RLS scoping: the Edge Function uses the **user's JWT** (not service-role) when calling `ai-query` so all queries are auto-filtered by `auth.uid()`. Service-role is only used for `ai-categorize` writes.
- **D-20:** Row-limit caps live in the Edge Function (per-query-shape constants): `top_merchants LIMIT 20`, `sum_by_category LIMIT 50 categories`, `compare_periods` is two scalar sums. Date-range cap: max 13 months (current + 12 lookback). Requests for longer ranges are clamped server-side and the chat response notes the clamp.

### Failure Mode UX for `ai-categorize` Partial Failures

- **D-21:** **Per-row fallback, never whole-batch retry.** The Edge Function processes the batch row-by-row (parallel up to 5 concurrent Haiku calls via `Promise.allSettled`). Failed rows return `{ tx_id, error }` in the response; successful rows return `{ tx_id, category_id, confidence }`.
- **D-22:** Failed rows are left with `category_id = NULL` and a `last_ai_attempt_at` timestamp. They appear as "Uncategorized" in the list. The Edge Function does NOT automatically retry; manual retry happens on next batch insert that includes that tx_id, or via the (Phase 4) bulk re-run endpoint.
- **D-23:** If the ENTIRE batch fails (Anthropic 5xx, rate limit, network), the Edge Function returns HTTP 503 with a structured error. Client surfaces a small, non-blocking inline banner on the transactions list: "Categorization paused — tap to retry" (EB Garamond italic, brand sage muted). Tap → re-fires the request. No toast, no modal.
- **D-24:** Cost ceiling: per-user daily cap of $0.20 categorization spend, $0.50 chat spend (enforced via PostHog counter + Edge Function pre-check). Over cap → fall through to MCC-only (no Haiku) for categorization; chat surfaces a soft "Daily limit reached, try again tomorrow" message. Caps are configurable per-env in Supabase project secrets.

### Claude's Discretion (during planning + execution)

- Exact Edge Function file layout (single vs split `ai-categorize` / `ai-chat` / shared `ai-utils` modules) — planner decides.
- Exact MCC → category mapping table contents (~40 ranges) — pick standard ISO 18245 industry-to-PFM mappings; document in `src/data/mccMap.ts`.
- Streaming protocol for chat (SSE vs chunked JSON) — planner picks based on Anthropic SDK + Edge Function streaming guarantees.
- Exact Sonnet system-prompt wording — write during execution; lock after first eval pass.
- Eval suite test count and structure — derive from AI-SPEC rubric during research/planning.
- Whether to use Supabase Realtime channel vs polling for category-update push to client — planner decides.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project rules + design contract
- `CLAUDE.md` — design tokens, banned values, typography rules, AI security rules (no raw descriptions in LLM calls, aggregates only), `claude-haiku-4-5` + `claude-sonnet-4-6` locked
- `apps/mobile/src/design/tokens.ts` — color, gradient, spacing, radius constants (source of truth)
- `apps/mobile/src/design/typography.ts` — TYPE presets (Oswald display, EB Garamond editorial, Manrope UI) — chat bubbles use EB Garamond
- `.planning/PROJECT.md` — core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — CAT-03, CAT-04, CHAT-01..04 (Phase 3 scope)
- `.planning/ROADMAP.md` §"Phase 3" — phase goal, success criteria, plan slugs

### Phase 3 locked specs (MANDATORY pre-read for planner/researcher)
- `.planning/phases/03-ai-categorization-chat/03-AI-SPEC.md` — framework choice, model selection, eval strategy, guardrails, monitoring (all locked; do not re-decide)
- `.planning/phases/03-ai-categorization-chat/03-UI-SPEC.md` — chat bubble styling, suggested-prompt chips, needs-review amber dot, error banner copy (all locked; do not re-decide)

### Phase 1 + 2 learnings (mandatory pre-read)
- `.planning/phases/01-onboarding-data-ingest/01-LEARNINGS.md` — op-sqlite v15 executeSync, Zustand+persist+secure-store, AI safety description=NULL pattern
- `.planning/phases/01-onboarding-data-ingest/01-SKELETON.md` — negative cents = expense, repo pattern, route literals
- `.planning/phases/02-dashboard-transactions-categories/02-CONTEXT.md` — swipe-recategorize sheet, FlashList sticky headers, recategorize-from-chip UX (Phase 3 piggybacks on this for "needs review" tap target)
- `apps/mobile/src/data/transactionsRepo.ts` — repository pattern to extend with `updateCategoryBatch`, `markNeedsReview`
- `apps/mobile/src/lib/db/index.ts` — DB singleton + splitStatements + migration runner (Phase 3 adds `transactions.needs_review BOOLEAN`, `transactions.ai_confidence REAL`, `transactions.last_ai_attempt_at TIMESTAMPTZ` if not present from Phase 1)

### Stack docs (fetch via context7 during research)
- `@anthropic-ai/sdk` — Messages API, tool use, streaming, system prompt, model IDs (`claude-haiku-4-5`, `claude-sonnet-4-6`)
- Supabase Edge Functions (Deno) — auth helpers, env secrets, JWT pass-through for RLS, service-role client for writes
- Supabase Postgres — RLS policies on `merchant_overrides`, prepared statements via `supabase-js`
- `@tanstack/react-query` v5 — `useMutation` with optimistic updates + cache invalidation
- `expo-secure-store` — Anthropic API key NEVER lives on device; lives in Supabase project secrets only

### Security + ops
- `CLAUDE.md` §"Security rules" — TLS 1.3, no sensitive data in AsyncStorage, no console.log of tx details in prod, AI prompts must use aggregates+category names only
- Anthropic Anthropic prompt-injection mitigation patterns (researcher to fetch current guidance via context7)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/mobile/src/data/transactionsRepo.ts` — extend with `updateCategoryBatch(updates: Array<{ id, category_id, confidence, needs_review }>)`, `markNeedsReview(id, bool)`, `listUncategorized(limit?)`.
- `apps/mobile/src/lib/money.ts` — `formatMoney`, `toCents`, `fromCents` — used by chat result rendering (Sonnet returns cents; UI formats locale-aware).
- `apps/mobile/src/design/tokens.ts` — `COLORS.warningSoft` for amber "needs review" dot, `COLORS.sageMuted` for inline error banner.
- `apps/mobile/src/design/typography.ts` — `TYPE.bodyEditorial` (EB Garamond) for chat bubbles, `TYPE.uiLabel` (Manrope) for suggested-prompt chips and meta.
- Phase 2 recategorize bottom sheet (`@gorhom/bottom-sheet`) — reused as the tap target when user clears a "needs review" row.
- Phase 2 `useFocusEffect` pattern — chat screen mount triggers no data load (session-scoped); transactions list re-queries on focus to pick up newly-categorized rows.

### Established Patterns
- **op-sqlite v15 executeSync** — synchronous, one statement per call. Phase 3 migration adds 3 columns to `transactions` if absent; follows splitStatements idiom from Phase 1.
- **Negative cents = expense, positive = income** — Sonnet system prompt explicitly documents this sign convention. `ai-query` tool result sums respect sign.
- **Zustand + persist (NOT for chat history)** — chat session state is in-memory only (`useState` or non-persistent Zustand store). All other UI state uses the secureStorage adapter pattern from Phase 1.
- **TanStack Query v5 cache** — `['transactions', { month }]` key invalidated when `ai-categorize` responds. Optimistic insert is unchanged from Phase 2; categorization is an async patch.
- **i18next runtime locale** — chat suggested-prompt chips and error banner copy go to `src/i18n/locales/{en,uk}/chat.json` + `categorization.json`. Sonnet response language is detected from user message (no language param sent — Sonnet handles bilingual natively).
- **Repository slug→id pattern** — `merchant_overrides.category_id` is numeric; client resolves Haiku's returned `category_slug` to id before persist.

### Integration Points
- Mobile client: `transactionsRepo.ts` fires `POST {SUPABASE_URL}/functions/v1/ai-categorize` after every insert (single or batch). Auth via Supabase user JWT.
- Mobile client: chat tab (new `app/(tabs)/chat.tsx`) streams from `POST {SUPABASE_URL}/functions/v1/ai-chat` via `EventSource` or fetch-streaming. Auth via Supabase user JWT.
- Edge Function `ai-categorize`: reads `transactions` rows by tx_ids using service-role; writes `category_id`, `ai_confidence`, `needs_review`, `last_ai_attempt_at` back. Upserts to `merchant_overrides` when confidence ≥ 0.85.
- Edge Function `ai-chat`: forwards to Sonnet-4.6 with `ai-query` tool; tool execution uses USER JWT supabase-js client so RLS auto-scopes. Streams text back to client.
- Postgres migration: `merchant_overrides` table + RLS policies; `transactions` adds `ai_confidence REAL`, `needs_review BOOLEAN DEFAULT FALSE`, `last_ai_attempt_at TIMESTAMPTZ` (only if Phase 1 didn't already include them).
- Sentry: new tags `ai.flow=categorize|chat`, `ai.model=haiku-4-5|sonnet-4-6`, `ai.tier=override|mcc|llm`.
- PostHog: events `ai_categorize_completed`, `ai_chat_message_sent`, `ai_chat_thumbs`, `ai_daily_cap_hit`, with cost/latency/fallback-rate properties.

</code_context>

<specifics>
## Specific Ideas

- **Chat empty state aesthetic:** editorial book-spot illustration (small hand-drawn SVG, terracotta palette, ~120pt) + EB Garamond italic phrase like `"Ask about your money."` + 3 suggested-prompt chips (Manrope `TYPE.uiLabel`, sage-muted background, no border).
- **Streaming bubble aesthetic:** characters appear with subtle 80ms `withTiming` fade-in per chunk; cursor is a thin EB Garamond italic vertical bar that pulses (reanimated `withRepeat`). No typewriter sound, no shimmer.
- **"Needs review" amber dot:** 6pt circle, `COLORS.warningSoft`, positioned to the right of the category chip in the transaction row. Tap the dot or anywhere on the row → recategorize sheet from Phase 2 with a pre-populated "Confirm or change" header.
- **Inline error banner (categorization paused):** full-width, ~32pt tall, EB Garamond italic, `COLORS.sageMuted` background, dismissible by tap-to-retry. No icon. No animation.
- **Tone for Sonnet system prompt:** declarative, slightly literary, never breezy. Forbid emoji in chat responses. Forbid fintech-cliché phrases ("Let's break it down!", "Spending insights"). Sample target tone: `"April's coffee added up to €83 — a fifth of your food spend."`
- **No raw transaction descriptions ever cross the wire to Anthropic.** Enforced via `ai-categorize` payload schema (merchant_name + mcc + amount_bucket only) and `ai-chat` tool boundary (aggregates only, never row-level data).

</specifics>

<deferred>
## Deferred Ideas

- **Persisted chat history with biometric gate** — defer to v1.5. v1 chat is session-scoped per D-14/D-15.
- **Agentic chat actions** (e.g., "recategorize all April coffee purchases to Cafés") — defer to v1.5. v1 chat is read-only.
- **Per-currency merchant_overrides segmentation** — defer to v1.5 unless a real-world false-positive appears. v1 uses single key per merchant (D-03).
- **Substring / fuzzy / embedding-based merchant matching** — defer to v1.5. Exact-match on normalized key is the v1 contract (D-02).
- **User-triggered "Run AI categorization" bulk button** — defer to v1.5 / Phase 4. Endpoint exists (D-09); UI doesn't.
- **Settings UI for AI toggle / model picker / cost ceiling editor** — defer to Phase 5.
- **Receipt OCR → AI extract pipeline** — defer to v1.5 per PROJECT.md.
- **Saved chat conversations / chat search** — defer to v1.5 (depends on persisted history).
- **Eval drift detection sampling** — hook reserved (D-13) but not active in v1; activate in Phase 4 alongside monobank sync.
- **Switchable LLM provider** (OpenAI / open-source fallback) — vendor lock-in to Anthropic accepted per AI-SPEC L-01 + memory ID 1027. Migration path documented; not built.

</deferred>

---

*Phase: 03-ai-categorization-chat*
*Context gathered: 2026-05-14*
*Mode: --auto (recommended defaults; AI-SPEC + UI-SPEC decisions carried forward unchanged)*
