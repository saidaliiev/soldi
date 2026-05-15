---
status: partial
phase: 03-ai-categorization-chat
source: [03-VERIFICATION.md]
started: 2026-05-15T16:10:00Z
updated: 2026-05-15T16:10:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. On-ingest auto-categorization (Tier 2 MCC hit)
expected: Add a manual transaction with mcc=5411 (Tesco/groceries). Transaction row shows 'Groceries' category without needs_review dot within ~5s; POST to /functions/v1/ai-categorize fires with merchant_name+mcc+amount_sign+amount_bucket only (no raw description).
blocked_by: P0 #5 (live Supabase Frankfurt project) + physical iPhone via Expo Go
result: [pending]

### 2. Chat NL query latency + accuracy (SC#3 / SC#1)
expected: Ask chat "how much on groceries last month?". ChatBubble shows accurate EUR amount matching local transactions; optional mini chart; response time < 3s on fast network.
blocked_by: P0 #6 (live Anthropic API key) + P0 #5 (live Supabase project)
result: [pending]

### 3. Offline graceful fallback (SC#5 device confirm)
expected: Disable network on device; ask a chat question. ChatErrorBanner slides in from top with error color + "AI is unavailable" copy; tap retry re-fires request; no crash.
blocked_by: device network-fault simulation (logic already statically PASSED in code review)
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 3

## Gaps

None — no open code gaps. Phase 3 is code-complete. The 3 items above are runtime/device confirmations of SC#1 (≥85% accuracy), SC#3 (<3s latency), and SC#5 (offline fallback on-device), all gated on P0 #5 (Supabase Frankfurt project) and P0 #6 (Anthropic API key) being provisioned. SC#1 accuracy specifically requires the curated 100-transaction eval run (CI `ai-eval` workflow_dispatch job, needs ANTHROPIC_API_KEY secret).
