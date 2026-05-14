# Phase 3: AI Categorization + Chat - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `03-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 03-ai-categorization-chat
**Mode:** --auto (no AskUserQuestion; Claude picked recommended option for every gray area per user instruction "do not pause for clarifying questions; make reasonable calls and proceed")
**Areas discussed:** merchant_overrides schema + matching, categorization trigger timing, confidence threshold + MCC pre-pass orchestration, chat conversation persistence, ai-query SQL safety, ai-categorize partial-failure UX

---

## Pre-locked (carried forward, NOT discussed)

The following were locked by `03-AI-SPEC.md` and `03-UI-SPEC.md` and were explicitly excluded from this discussion per user instruction:

- Framework: `@anthropic-ai/sdk` in Supabase Edge Functions (Deno)
- Models: `claude-haiku-4-5` (categorize), `claude-sonnet-4-6` (chat)
- Evaluation strategy: offline eval suite + CI gate
- Guardrails: PII redaction, prompt-injection defense, aggregates-only-to-LLM rule
- Production monitoring: Sentry + PostHog instrumentation contract
- All UI surfaces (chat bubble styling, suggested-prompt chips, needs-review amber dot, error banner copy, terracotta palette)
- AI safety rule: raw `transactions.description` never sent to any LLM (CLAUDE.md)

These are referenced in CONTEXT.md as L-01..L-08 and are not re-litigated.

---

## merchant_overrides Schema + Matching Algorithm

| Option | Description | Selected |
|--------|-------------|----------|
| A — Exact match on normalized merchant_name (lowercase + NFKD + whitespace + non-alphanum strip, max 64) | Deterministic, debuggable, no false positives, <10ms lookup | ✓ |
| B — Substring/prefix match | More forgiving for "STARBUCKS #1234" variants but introduces false positives ("APPLE" matches "PINEAPPLE EXPRESS") | |
| C — Levenshtein / fuzzy match | Best recall but adds latency and unpredictable behavior; hard to debug "why did this match?" | |
| D — Embedding similarity (pgvector) | Best semantic recall but premature for v1 scale (~hundreds of merchants per user) | |
| E — Per-currency segmentation in key | Avoids cross-currency confusion but doubles cache misses for international users; no evidence of real-world false-positives yet | |

**Claude's choice (auto-decided):** A — exact match on normalized key, no per-currency segmentation
**Rationale:** v1 scale doesn't justify fuzzy matching. Exact match is deterministic, debuggable, fast, and easy to audit. Per-currency split deferred until a real bug appears. Substring matching has well-known false-positive class.
**Tag:** [auto-decided]

---

## Categorization Trigger Timing

| Option | Description | Selected |
|--------|-------------|----------|
| A — On ingest + on manual entry (synchronous fire-and-forget from client repo layer) | Categorization happens immediately, UI is non-blocking, batched-nightly redundant | ✓ |
| B — On ingest only (skip manual entry — user picked the category themselves) | Avoids a wasted Haiku call when the user already chose, but breaks the "AI also learns from manual" loop | |
| C — Batched nightly (cron Edge Function pulls uncategorized rows) | Cheaper but adds 24h latency; bad UX — user sees "Uncategorized" all day | |
| D — User-triggered bulk button only | Most explicit, no surprise costs, but contradicts the "no-tap categorization" core value | |

**Claude's choice (auto-decided):** A — on ingest + on manual entry. Non-blocking UI. No batched-nightly. No user-triggered button in Phase 3 UI (endpoint exists, no surface).
**Rationale:** Matches the phase's stated core value ("transaction lands in the correct category without a tap"). Manual-entry categorization runs cheap (most go to Tier-1 override after first user choice anyway) and seeds the learning loop. Bulk re-run endpoint reserved for Phase 4 monobank sync without committing to Phase 3 UI cost.
**Tag:** [auto-decided]

---

## Confidence Threshold + MCC Pre-Pass Orchestration

| Option | Description | Selected |
|--------|-------------|----------|
| A — Three-tier (overrides → MCC → Haiku); auto-apply ≥0.75; persist to overrides ≥0.85 | Balanced: cheap path for known merchants, conservative threshold for cache pollution | ✓ |
| B — Two-tier (overrides → Haiku); skip MCC entirely | Simpler but expensive — every novel merchant costs a Haiku call | |
| C — Three-tier but auto-apply ≥0.5 | More auto-applies but more "wrong category, user has to fix" — bad UX cost | |
| D — Three-tier with auto-apply ≥0.9 | Very conservative; nearly all rows get amber dot; defeats no-tap value | |
| E — Always-on Haiku even when MCC matches | Best recall but doubles cost and adds latency for the common case | |

**Claude's choice (auto-decided):** A — three-tier; auto-apply at 0.75; cache-persist at 0.85; Haiku skipped on Tier 1 and Tier 2 hits.
**Rationale:** MCC pre-pass eliminates the most expensive class of calls (food, transport, bills — well-known industry codes). 0.75 / 0.85 split lets the cache fill conservatively while still auto-applying most LLM results. Sample-and-discard hook reserved for eval drift detection but not active in v1.
**Tag:** [auto-decided]

---

## Chat Conversation Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| A — Session-scoped, in-memory only (cleared on screen unmount or app cold start) | Matches UI-SPEC; minimal PII surface; "calculator with personality" framing | ✓ |
| B — Local op-sqlite persistence (per-device, no cloud) | Keeps history across sessions; no cloud PII; but adds biometric gate work | |
| C — Persisted in Postgres (cross-device) | Best UX continuity but largest PII surface, requires explicit opt-in + biometric gate | |
| D — Last-N-messages persistence (e.g., last 50) | Compromise but adds eviction logic; user expectation murky | |

**Claude's choice (auto-decided):** A — session-scoped in-memory only. Last 20 turns held in client state, sent back to Sonnet per turn (bounded prompt tokens). Closing chat or cold-starting app clears history.
**Rationale:** Confirmed against UI-SPEC implication. v1 chat is a focused query tool, not a journaling artifact. Reduces PII surface and skips biometric-gate dependency on Phase 5. Persisted history with opt-in is in deferred-ideas for v1.5.
**Tag:** [auto-decided]

---

## SQL Safety for `ai-query` Tool

| Option | Description | Selected |
|--------|-------------|----------|
| A — Fixed library of ~6 parameterized prepared statements; Sonnet picks shape + params; user JWT for RLS; per-shape row + date caps in Edge Function | Strict, audited, no free-form SQL ever reaches Postgres | ✓ |
| B — Sonnet generates raw SQL; Edge Function whitelists tables/columns and runs as user JWT | Most flexible but huge attack surface (prompt injection → SQL injection) and hard to audit | |
| C — GraphQL-like field-selection tool | Adds machinery without much win over A; Sonnet still needs to learn the schema | |
| D — Service-role with manual user_id filter in every query | Bypasses RLS unnecessarily; one bug = cross-user data leak | |

**Claude's choice (auto-decided):** A — fixed prepared-statement library, JSON tool schema, user JWT pass-through for RLS, hard row/date caps server-side.
**Rationale:** Aligns with AI-SPEC guardrails and the project's fintech-grade-defaults posture in CLAUDE.md. Prompt-injection cannot escalate to SQL-injection because there's no SQL surface to inject into — Sonnet only picks a shape and supplies typed params. RLS via JWT pass-through means even a logic bug in the Edge Function cannot leak another user's rows. 13-month range cap + per-shape LIMITs prevent runaway aggregates.
**Tag:** [auto-decided]

---

## Failure Mode UX for `ai-categorize` Partial Failures

| Option | Description | Selected |
|--------|-------------|----------|
| A — Per-row fallback via Promise.allSettled (max 5 concurrent); failed rows = category_id NULL; whole-batch fail = inline retry banner; daily cost ceiling | Resilient, no whole-batch retry storms, surfaces failure without blocking UI | ✓ |
| B — Retry whole batch on any failure (exponential backoff in Edge Function) | Risks runaway cost on systemic Anthropic outage; bad blast radius | |
| C — Surface every per-row failure to the user as a toast | Toast spam; UI-SPEC forbids toasts of this kind | |
| D — Silently swallow failures, leave rows uncategorized indefinitely | User has no signal anything's wrong; bad debuggability | |

**Claude's choice (auto-decided):** A — per-row Promise.allSettled with concurrency cap 5; failed rows left NULL + `last_ai_attempt_at` stamp; whole-batch fail surfaces single dismissible inline retry banner; per-user daily cost caps ($0.20 categorize, $0.50 chat) with graceful MCC-only fallback when categorize cap hits.
**Rationale:** Matches the project's "fail gracefully, never crash, never spam" posture in CLAUDE.md. Per-row isolation means one Anthropic 5xx doesn't poison the batch. Inline banner is non-blocking and brand-consistent (EB Garamond italic + sage-muted bg). Cost caps protect a solo-dev portfolio project from a runaway prompt-injection cost amplification attack.
**Tag:** [auto-decided]

---

## Claude's Discretion (deferred to planning + execution)

- Exact Edge Function file layout (single vs split modules)
- Exact MCC → category mapping table contents (~40 ranges, ISO 18245 reference)
- Streaming protocol for chat (SSE vs chunked JSON — depends on Supabase Edge Functions streaming guarantees + Anthropic SDK)
- Exact Sonnet system-prompt wording (locked after first eval pass)
- Eval suite test count and structure (derived from AI-SPEC rubric during research)
- Supabase Realtime channel vs polling for category-update push to client

## Deferred Ideas (captured in CONTEXT.md `<deferred>` for future phases)

- Persisted chat history with biometric gate (v1.5)
- Agentic chat actions / recategorize-from-chat (v1.5)
- Per-currency merchant_overrides segmentation (v1.5)
- Substring / fuzzy / embedding merchant matching (v1.5)
- User-triggered bulk categorization button (Phase 4 / v1.5)
- Settings UI for AI toggle / model picker / cost-ceiling editor (Phase 5)
- Receipt OCR → AI extract pipeline (v1.5)
- Eval drift detection sampling activation (Phase 4)
- Switchable LLM provider (Anthropic lock-in accepted per AI-SPEC)

---

*All gray-area decisions in this phase were auto-resolved per user instruction. No AskUserQuestion was issued.*
