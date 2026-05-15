# SECURITY.md — Phase 04: jars-i18n-accessibility

**Audited:** 2026-05-16
**ASVS Level:** 1
**block_on:** high
**Auditor model:** claude-sonnet-4-6

---

## Threat Verification

### Plan 04-01 — Jar Foundation

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-04-01-01 | Tampering — jarsRepo SQL writes | mitigate | CLOSED | `jarsRepo.ts:38,62,75,93,120` — all five executeSync calls use `?` placeholders; string-concat scan returned NONE |
| T-04-01-02 | Info Disclosure — jar name in logs | mitigate | CLOSED | `grep console.log` across jarsRepo.ts, JarCreateBottomSheet.tsx, JarDetailScreen.tsx, JarListScreen.tsx → NONE |
| T-04-01-03 | DoS — migration v5 on existing DBs | accept | CLOSED | See Accepted Risks log below |
| T-04-01-SC | Tampering — npm installs | mitigate | CLOSED | No third-party packages added; all imports in jarsRepo.ts are project-internal or already-installed `@op-engineering/op-sqlite` |

### Plan 04-02 — Sweep + Skia Ring

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-04-02-01 | Tampering — sweepRepo SQL | mitigate | CLOSED | `sweepRepo.ts:49,105` — `lastSweepAt` query uses `[jarId, 'roundup']`; sweep query uses `['EUR', cutoff]`; string-concat scan returned NO STRING CONCAT |
| T-04-02-02 | Info Disclosure — sweep reading tx rows | mitigate | CLOSED | `sweepRepo.ts:105` — SELECT limited to `amount_cents, currency, created_at`; grep for `merchant_name`/`description` returned ABSENT; no `console.log` in sweepRepo or JarRing (no unguarded log found) |
| T-04-02-03 | Repudiation — contribution ledger | mitigate | CLOSED | `sweepRepo.ts:136,140` — `insertContribution(...)` called with `source: 'roundup'`; every non-zero sweep writes an auditable `jar_contributions` row |
| T-04-02-04 | DoS — double-sweep / rapid taps | accept | CLOSED | See Accepted Risks log below |
| T-04-02-SC | Tampering — npm installs | mitigate | CLOSED | JarRing.tsx imports only `@shopify/react-native-skia`, `react-native-reanimated`, `react-i18next` — all previously installed; sweepRepo.ts imports project-internal only |

**CR-01 fix verification (ms vs Unix-seconds timestamp bug):** `sweepRepo.ts:42-43` contains explicit comment warning NOT to store ms; `sweepToJar` calls `Math.floor(Date.now() / 1000)` for `now` default. The lastSweepAt cutoff comparison at line 105 (`created_at > ?` with `cutoff` from `lastSweepAt()`) is consistent with `transactions.created_at` being Unix seconds. Fix does not undermine T-04-02-* mitigations — parameter binding and PII column exclusion are unaffected by the timestamp unit correction.

### Plan 04-03 — i18n

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-04-03-01 | Tampering — translation JSON placeholders | mitigate | CLOSED | `check-i18n-parity.mjs:22-25` — `extractPlaceholders()` uses `/\{\{[^}]+\}\}/g` regex; lines 73-90 assert placeholder set equality en↔uk per key; non-zero exit on mismatch; `package.json:12` wires as `lint:i18n` gate |
| T-04-03-02 | Info Disclosure — language pref persistence | mitigate | CLOSED | `onboarding.ts:2,4,38,42` — explicitly uses expo-secure-store adapter, no AsyncStorage; no `console.log` in onboarding.ts or LanguageToggle.tsx |
| T-04-03-03 | DoS — runtime remount on language switch | accept | CLOSED | See Accepted Risks log below |
| T-04-03-SC | Tampering — npm installs | mitigate | CLOSED | `check-i18n-parity.mjs:13-15` — imports only `node:fs`, `node:path`, `node:url` (builtins); zero new npm deps |

### Plan 04-04 — Accessibility / Contrast

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-04-04-01 | Tampering — global tokens.ts remediation | mitigate | CLOSED | `contrast.ts:56,96` — exports `contrastRatio` + `auditTokenPairs`; `contrast.test.ts:60-73,85-107` — asserts every pair passes AA AND that no COLORS value is in BANNED_COLORS; 4 tokens remediated (textMuted, accent, expense, sage) with documented old→new ratios in 04-04-SUMMARY.md |
| T-04-04-02 | DoS — unbounded dynamic type | mitigate | CLOSED | `MonthlyTotalHero.tsx:50` maxFontSizeMultiplier=1.3; `MonthlyTotalHero.tsx:61` maxFontSizeMultiplier=1.6; `JarRing.tsx:164` maxFontSizeMultiplier=1.2; `_layout.tsx:52` maxFontSizeMultiplier=1.0 — all three mandated surfaces clamped |
| T-04-04-03 | Repudiation — a11y "done" without device test | accept | CLOSED | See Accepted Risks log below |
| T-04-04-SC | Tampering — npm installs | mitigate | CLOSED | `BottomSheetPrimitive.tsx:35` imports `AccessibilityInfo` from `react-native` (builtin); `findNodeHandle` from `react-native` (builtin); no new packages |

---

## Accepted Risks Log

### T-04-01-03 — Migration v5 DoS on existing DBs

**Risk:** A failure in the v5 migration could theoretically leave the database in a partial state.

**Rationale accepted:** `schema.sql.ts:246,254` uses `CREATE TABLE IF NOT EXISTS` for both `jars` and `jar_contributions` tables; `runMigrations` in `db/index.ts` applies migrations idempotently. A repeated migration run does not throw. Per the existing `app/_layout.tsx` migration catch pattern, a migration failure unblocks the UI rather than hard-crashing. This is a local SQLite database with no PII schema risk; recovery is app-reinstall. Risk level: LOW. No network exposure.

### T-04-02-04 — Double-sweep / rapid taps DoS

**Rationale accepted:** The `lastSweepAt` cutoff in `sweepRepo.ts:99` advances after each non-zero sweep, making a repeated tap idempotent (second call returns contributedCents=0, inserts no row). The Sweep Pressable in `JarDetailScreen.tsx:162` is `disabled={sweeping}` during the synchronous write, preventing concurrent taps. The idempotency is inherent to the data model, not a race-condition fix. Risk level: LOW. Local SQLite, no financial loss vector.

### T-04-03-03 — Runtime remount DoS on language switch

**Rationale accepted:** The `<I18nextProvider key={language}>` in `_layout.tsx:118` forces a full React tree remount on language change. This is an explicit user action (Settings toggle), not an automatic or externally triggerable event. State is persisted in expo-secure-store prior to remount; no data loss. The brief visual flash is documented in 04-CONTEXT as an accepted UX trade-off (D-07). Risk level: LOW. No security boundary crossed; no crash vector.

### T-04-04-03 — A11y "done" claim without device test

**Rationale accepted:** Static analysis (tsc, expo lint, grep) cannot prove VoiceOver UX behavior. Code-level contract is complete and verifiable: `AccessibilityInfo.setAccessibilityFocus` calls are present in BottomSheetPrimitive and ConfirmModal; `accessibilityViewIsModal` is set; Skia canvases carry summarizing labels with children hidden; `accessibilityActions` VoiceOver alternative is present on TransactionRow. Outstanding device gates (ROADMAP SC#4/#5) are explicitly flagged in 04-04-SUMMARY.md and 04-HUMAN-UAT.md as human/device verification items. Risk level: LOW (code contract verified; UX confirmation is a UAT gate, not a security gap).

---

## Unregistered Flags

**04-02-SUMMARY.md Threat Flags:** "None — no new network endpoints, auth paths, or schema changes introduced in Task 3."

**04-03-SUMMARY.md Threat Flags:** "None — no new network endpoints, auth paths, or trust boundary changes introduced."

**04-04-SUMMARY.md Threat Flags:** None declared.

No unregistered flags identified in any SUMMARY `## Threat Flags` section. All new attack surface maps to existing registered threats.

---

## Known Stub — sage/overFundedLabel Body Text Threshold

`JarRing.tsx` `styles.overFundedLabel` uses `TYPE.uiLabel` (14pt medium = body text, requiring 4.5:1). The remediated `sage #7E8B6C` achieves 3.23:1 — passes graphic/large threshold (3.0) but not body threshold (4.5). This edge case only renders when `balanceCents > targetCents` (rare). Formally: this is a **known sub-threshold use of the `sage` color token in a body-text context**. It is tracked in 04-04-SUMMARY.md Known Stubs and deferred to a post-Phase 4 token refinement pass (`sageDark` dedicated text token). It does not affect any security threat — it is a WCAG AA gap, not a data or integrity issue. It is noted here for completeness but does not constitute an OPEN_THREAT under the registered threat model.

---

## Summary Counts

- **Total threats:** 14
- **Closed (mitigate — verified in code):** 10
- **Closed (accept — rationale documented above):** 4
- **Open:** 0
- **Unregistered flags:** 0
