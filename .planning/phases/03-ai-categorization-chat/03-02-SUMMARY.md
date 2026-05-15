# 03-02 Summary — Merchant Override Propagation (CAT-04)

**Worktree:** `agent-a3dfd92a49726dd94`
**Branch:** `worktree-agent-a3dfd92a49726dd94`
**Base:** `d42b478` (main)
**Scope:** All 3 tasks complete. CAT-04 fully delivered.
**Date:** 2026-05-14
**SUMMARY authored:** 2026-05-15 by orchestrator (executor returned without writing it; reconstructed from commit/diff evidence + plan must_haves — see Provenance).

## Commits

| Hash | Type | Subject |
|------|------|---------|
| `dbe6de7` | feat(03-02) | normalizeMerchantKey + migration v4 |
| `ebef968` | feat(03-02) | propagateCategoryToSimilar engine |
| `95f5d27` | feat(03-02) | RecategorizeBottomSheet propagation toast |

## Tasks

### Task 1 — normalizeMerchantKey + local schema rewrite migration — DONE
- `apps/mobile/src/features/transactions/merchantNormalize.ts` — canonical pure
  `normalizeMerchantKey(raw)`: lower → NFKD → strip combining marks → keep
  `[a-z0-9 + Cyrillic Ѐ-ӿ Ԁ-ԯ + space]` → collapse whitespace → trim → 64-char cap.
  Deterministic, idempotent. Source of truth; `03-01 _shared/normalize.ts` is a
  byte-identical copy (verified — see Cross-plan gate).
- `apps/mobile/src/features/transactions/merchantNormalize.test.ts` — unit suite
  (case-fold, diacritics, mixed-script, punctuation collapse, length cap, idempotency).
- Local op-sqlite migration **version 4** (`SCHEMA_004_MERCHANT_OVERRIDES_V2`):
  creates `merchant_overrides_v2(id, merchant_key NOT NULL, category_id FK,
  source CHECK(user|llm|mcc), confidence, created_at, updated_at,
  UNIQUE(merchant_key))`, data-migrates Phase 1/2 rows via
  `INSERT … SELECT lower(trim(merchant_pattern)) AS merchant_key … ` with dedup,
  `DROP` old table, `RENAME` v2 → `merchant_overrides`, adds
  `idx_merchant_overrides_key`. Wave-1 lock-step: 03-01 owns v3, 03-02 owns v4 →
  final `MIGRATIONS = [1,2,3,4]` (no gap).

### Task 2 — merchantOverridesRepo rewrite + propagation engine — DONE
- `apps/mobile/src/data/merchantOverridesRepo.ts` rewritten to **exact-match on
  normalized `merchant_key`** (CONTEXT D-02). Old substring/`LIKE %…%` removed.
  - `getOverrideForMerchant`: `WHERE merchant_key = ?` (exact).
  - `upsertOverride`: `INSERT … ON CONFLICT(merchant_key) DO UPDATE` — `source='user'`
    wins over `llm`/`mcc` on the same key (UNIQUE + upsert precedence).
  - `propagateCategoryToSimilar` / `findSimilarUncategorizedTxIds`: select rows,
    normalize in-memory, filter by `normalizeMerchantKey(merchant_name) === key`
    (exact equality, no SQL substring).
- `apps/mobile/tests/merchant-overrides-repo.test.ts` — exact-match behavior,
  user-source precedence, propagation set selection, no false-positive substring hits.

### Task 3 — PropagationToast + store + RecategorizeBottomSheet wire-up + i18n — DONE
- `propagationStore.ts` — transient store holding last propagation `{ key, affectedTxIds }`
  for undo.
- `PropagationToast.tsx` — bottom toast: "Updated N similar transactions" when N ≥ 1,
  silent when N = 0; Undo rolls back ONLY auto-propagated rows (not the
  originally-corrected row).
- `RecategorizeBottomSheet.tsx` — post-pick hook fires `upsertOverride(source=user)`
  + `propagateCategoryToSimilar`, pushes result to `propagationStore`, shows toast.
- `app/_layout.tsx` — mounts `<PropagationToast />` once at root.
- i18n: `i18n/locales/{en,uk}/chat.json` propagation strings + `lib/i18n/index.ts`
  registration. Namespaced keys (`chat.json` namespace).

## Success Criteria

| Criterion | Status |
|-----------|--------|
| CAT-04 user corrections propagate to similar merchant txns | ✅ |
| ROADMAP P3 success criterion #2 (correction propagation) | ✅ |
| Schema reconciled to canonical D-01 shape (single-user, no user_id) | ✅ |
| normalizeMerchantKey shared source of truth (client + Edge copy) | ✅ byte-identical |
| Migration preserves all Phase 1/2 user-source overrides (non-empty key) | ✅ data-migrate + dedup |

## Cross-plan gate (per plan `<output>`)

`merchantNormalize.ts` ⇔ `supabase/functions/_shared/normalize.ts` function bodies
verified **byte-identical** by the Wave-1 forensic audit. Final post-merge gate
(see 03-01 SUMMARY item 12) re-runs the `diff` on merged tree.

## Deviations / rationale

| Deviation | Rationale |
|-----------|-----------|
| Remote `merchant_overrides` sync NOT wired | Per plan: remote sync is Phase 4 (write-through cache). Phase 3 toast acknowledges local rollback only. In scope-as-designed. |
| Pre-migration row count not captured here | Requires device run (no synthetic Phase 1/2 override rows in this worktree). Developer captures on first device launch; non-blocking. |
| SUMMARY not executor-written | Wave-1 executor returned without committing SUMMARY.md. Reconstructed by orchestrator from commit + `git diff main..HEAD` evidence and plan must_haves. All claims above are diff-verifiable, not aspirational. |

## Deferred → UAT / later phases

| Item | When |
|------|------|
| Device capture: Phase 1/2 override rows preserved count → record in STATE.md | UAT (physical iPhone, P0 #1) |
| Remote `merchant_overrides` write-through sync | Phase 4 |

## Self-check

- [x] 3 commits, conventional subjects, scope 03-02
- [x] merchantOverridesRepo uses `WHERE merchant_key = ?` exact-match only (no LIKE)
- [x] migrations final sequence [1,2,3,4], 03-02 owns v4
- [x] normalizeMerchantKey byte-identical to 03-01 `_shared/normalize.ts`
- [x] All commits on `worktree-agent-a3dfd92a49726dd94`; no protected-branch drift
- [ ] `tsc --noEmit` / `expo lint` — DEFERRED to post-merge gate (no node_modules in worktree)
