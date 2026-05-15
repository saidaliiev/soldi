---
phase: 04-jars-i18n-accessibility
plan: "03"
subsystem: i18n / settings
tags: [i18n, settings, language-toggle, runtime-remount, key-parity, ukraine]
dependency_graph:
  requires: ["04-01"]
  provides: ["SET-02", "i18n-parity-gate", "settings-route"]
  affects: ["apps/mobile/app/_layout.tsx", "apps/mobile/app/settings.tsx", "apps/mobile/src/features/settings/", "apps/mobile/src/i18n/locales/uk/", "apps/mobile/scripts/check-i18n-parity.mjs"]
tech_stack:
  added: ["check-i18n-parity.mjs (node ESM, builtins only)"]
  patterns: ["root key-bump remount via language-keyed I18nextProvider", "lint:i18n parity gate in package.json scripts"]
key_files:
  created:
    - apps/mobile/app/settings.tsx
    - apps/mobile/src/features/settings/SettingsScreen.tsx
    - apps/mobile/src/features/settings/LanguageToggle.tsx
    - apps/mobile/scripts/check-i18n-parity.mjs
    - apps/mobile/src/i18n/locales/en/settings.json
    - apps/mobile/src/i18n/locales/uk/settings.json
  modified:
    - apps/mobile/app/_layout.tsx
    - apps/mobile/app/(tabs)/index.tsx
    - apps/mobile/src/lib/i18n/index.ts
    - apps/mobile/src/stores/onboarding.ts
    - apps/mobile/src/i18n/locales/uk/dashboard.json
    - apps/mobile/src/i18n/locales/uk/transactions.json
    - apps/mobile/src/i18n/locales/uk/categories.json
    - apps/mobile/src/i18n/locales/uk/chat.json
    - apps/mobile/src/i18n/locales/uk/ai.json
    - apps/mobile/src/i18n/locales/uk/jars.json
    - apps/mobile/package.json
    - .planning/phases/03-ai-categorization-chat/03-VERIFICATION.md
decisions:
  - "D-07: root key-bump on I18nextProvider using persisted language — module-scope t() and Intl.DateTimeFormat force re-evaluation on language switch without app restart"
  - "D-08: check-i18n-parity.mjs uses node builtins only (zero new deps); wired as lint:i18n script; gates verification alongside tsc+lint"
  - "merchant_overrides deferral repointed from Phase 4 to Phase 5/6 — orphaned in Phase 4 ROADMAP"
metrics:
  duration_minutes: ~45
  completed_date: "2026-05-15"
  tasks_completed: 3
  files_changed: 16
---

# Phase 4 Plan 03: Settings Route + i18n Runtime Toggle + UK Translation + Parity Gate Summary

SET-02 runtime language capability: gear-accessed Settings stack route with EN↔UK toggle that remounts the entire app via a language-keyed I18nextProvider, backed by native-first-pass Ukrainian translations across all 7 namespaces and a key+placeholder parity gate script.

---

## Tasks Completed

### Task 1: Settings route + gear entry + LanguageToggle + runtime key-bump remount
**Commit:** 1ec74fa

Files created/modified:
- `apps/mobile/app/settings.tsx` — Stack route rendering SettingsScreen
- `apps/mobile/src/features/settings/SettingsScreen.tsx` — scrollable settings screen (RN primitives, tokens, TYPE.*)
- `apps/mobile/src/features/settings/LanguageToggle.tsx` — segmented EN | Українська control calling setLanguage (i18n module) + useOnboardingStore.setLanguage (expo-secure-store persistence)
- `apps/mobile/app/_layout.tsx` — added `key={language ?? 'en'}` on `<I18nextProvider>` for root remount (D-07)
- `apps/mobile/app/(tabs)/index.tsx` — gear Pressable in dashboard header → `router.push('/settings')`, SVG gear icon, accessibilityLabel + accessibilityRole="button"

**D-07 context7 finding:** i18next `changeLanguage()` propagates to components subscribed via `useTranslation()` hook, but module-scope `t()` calls, `Intl.DateTimeFormat` formatters, and FlashList sticky header content cached outside React rendering are NOT automatically re-evaluated. The supported pattern for full-app retranslation on language switch is mounting the app tree under a new React key, forcing a full unmount+remount. Applied as `<I18nextProvider key={language ?? 'en'}>` where `language` is the persisted value from `useOnboardingStore`. Brief visual flash on explicit user action is the accepted trade-off (D-07, 04-CONTEXT).

**Acceptance:** Settings reachable via gear in dashboard header; `app/(tabs)/_layout.tsx` tab count unchanged (4 tabs); LanguageToggle calls both setLanguage functions; `key=` on I18nextProvider confirmed; gear SVG (no emoji); no BANNED_COLORS.

---

### Task 2: Complete native-first-pass UK translations for all namespaces + settings ns + i18n wiring
**Commit:** 0b3397b

**Measured pre-translation baseline (measured from codebase, not trusting stale :28 comment):**

| Namespace | en keys | uk keys pre-task | % translated (non-stub) |
|-----------|---------|-----------------|------------------------|
| dashboard | 15 | 15 | 0% (byte-identical stubs) |
| transactions | 35 | 35 | ~11% (4/35 translated) |
| categories | 23 | 23 | 0% (byte-identical stubs) |
| chat | 24 | 24 | 0% (byte-identical stubs) |
| ai | 2 | 2 | 0% (byte-identical stubs) |
| jars | 20 | 20 | first-pass from 04-01 |
| settings | — | — | new ns created |

Post-task: all namespaces have native-first-pass Ukrainian translations with preserved `{{placeholder}}` tokens and ICU plural structures.

Files:
- `uk/dashboard.json` — all 15 keys translated (dates, month navigation, empty state)
- `uk/transactions.json` — all 35 keys translated (transaction list, filters, search, propagation plurals)
- `uk/categories.json` — all 23 category slugs/labels translated
- `uk/chat.json` — all 24 chat UI strings translated
- `uk/ai.json` — all 2 AI status strings translated
- `uk/jars.json` — 04-01/04-02 first-pass brought to audited quality
- `en/settings.json` + `uk/settings.json` — new ns: title, language_section, language_en, language_uk, open_a11y
- `src/lib/i18n/index.ts` — settingsEn/settingsUk imported and merged into both bundles; stale `:28 "uk bundle currently mirrors en"` comment removed

**Outstanding human gate (D-08):** Upwork native-Ukrainian reviewer must audit and commit edits to the Claude first-pass translations. The reviewer's committed edits are the approval artifact (mirrors Phase 3 review-artifact pattern). This does NOT block tsc/lint or this plan's completion. AI chat response language is model-side (out of i18next scope) and does not block SET-02.

---

### Task 3: en/uk key-parity + placeholder-parity gate script + deferral-repoint doc correction
**Commit:** 52b06b5

Files created/modified:
- `apps/mobile/scripts/check-i18n-parity.mjs` — node ESM script (builtins only: node:fs, node:path, node:url); checks: (1) uk file exists for every en namespace, (2) key sets are identical, (3) `{{placeholder}}` token sets match en↔uk. Prints concise PASS/FAIL per namespace. Non-zero exit on any mismatch.
- `apps/mobile/package.json` — added `"lint:i18n": "node ./scripts/check-i18n-parity.mjs"` script; NO test script added (jest harness absent per [[jest-harness-missing]])
- `.planning/phases/03-ai-categorization-chat/03-VERIFICATION.md` — merchant_overrides deferral target changed from "Phase 4" to "Phase 5/6 (re-deferred 2026-05-15; orphaned deferral repointed)" in 3 locations (deferred block, deferred items table, required artifacts table)

**Negative gate demonstration (per acceptance criteria):**
- Temporarily removed `title` key from `uk/settings.json`
- `npm run -s lint:i18n` exited 1 with: `FAIL [settings] Keys present in en but MISSING in uk: - title`
- File restored; all namespaces pass at exit 0

**Acceptance:** `lint:i18n` exits 0; negative check confirmed exit 1; tsc exits 0; expo lint exits 0; package.json has `lint:i18n` and no `test` script; parity script uses only node builtins; no merchant_overrides DDL implemented; `resolveTier1` unchanged.

---

## Deviations from Plan

### Auto-skipped: STATE.md edit
STATE.md was updated (merchant_overrides line repointed to Phase 5/6) but not committed — orchestrator owns STATE.md in parallel worktree execution mode. The .planning/STATE.md change was written to the shared filesystem and will be visible to the orchestrator when it reads STATE.md.

No other deviations — plan executed exactly as written.

---

## Known Stubs

None that affect plan goals. The Ukrainian translations are Claude first-pass (not human-reviewed), but the outstanding Upwork native review is explicitly flagged as an external human gate (D-08), not a blocking stub.

---

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes introduced. T-04-03-01 (placeholder parity) mitigated by `check-i18n-parity.mjs`. T-04-03-02 (language pref) mitigated by expo-secure-store persistence in onboarding store.

---

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| check-i18n-parity.mjs exists | FOUND (main repo .planning shared fs) |
| package.json updated | FOUND |
| 04-03-SUMMARY.md exists | FOUND at .planning/phases/04-jars-i18n-accessibility/04-03-SUMMARY.md |
| 03-VERIFICATION.md updated | FOUND |
| commit 1ec74fa (task 1) | FOUND |
| commit 0b3397b (task 2) | FOUND |
| commit 52b06b5 (task 3) | FOUND |
| no test script in package.json | PASS |
| lint:i18n script present | PASS |
| no supabase/migrations dir | PASS |
| STATE.md merchant_overrides repointed | PASS |
| 03-VERIFICATION.md table cells updated to Phase 5/6 | PASS (contextual "Phase 4" mentions in evidence text are accurate historical references)
