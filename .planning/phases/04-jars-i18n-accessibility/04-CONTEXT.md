# Phase 4: Jars + i18n + Accessibility - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver three things, all local-only and on the locked stack:
1. **Goal jars** (JAR-01/02/03) — create a jar (name, target, SVG icon), animated Skia progress ring on contribution, top-up via a configurable round-up rule with a manual sweep.
2. **Runtime EN↔UK language switch** (SET-02) — a new Settings route with a language toggle that retranslates the whole app with no restart, plus a complete native-reviewed Ukrainian translation.
3. **Accessibility pass** (QUAL-01..04) — full VoiceOver focus contract, AA contrast, and dynamic-type clamping across the **entire** app (existing screens + new jar/settings UI).

Out of scope: any cloud/remote work, per-currency handling, JAR-03 fixed-weekly and %-of-income top-up methods (round-up only for v1), and the orphaned `merchant_overrides` remote DDL (re-deferred — see Deferred Ideas).

</domain>

<decisions>
## Implementation Decisions

### Jars — mechanics
- **D-01:** Round-up rule is a **configurable per-jar unit: €1 / €5 / €10, default €1**. Each qualifying expense rounds up to the chosen unit; the difference is the pending contribution. (Not fixed nearest-€1; not all-three JAR-03 methods.)
- **D-02:** Contributions fire via a **manual "Sweep to jar" action** — the user taps Sweep, the app sums pending round-ups accrued since the last sweep and contributes them. No tx-ingest auto-hook, no scheduler. Deterministic and testable without device/background tasks.
- **D-03:** Round-up **source = EUR expenses only** (negative-cents EUR transactions). UAH/monobank transactions are excluded — mixed-currency round-up is undefined under the locked EUR-only / no-currency-segmentation constraint (Phase-1 D-03).
- **D-04 (Claude's discretion, locked from defaults):** Progress ring reuses the locked Skia idiom — a new **pure `jarRingGeometry.ts` + co-located test** module modelled on `donutArcs.ts`/`chatChartGeometry.ts` (single arc 0→pct). Animate the old→new sweep via the Phase-2-locked canvas-opacity crossfade + `useSharedValue`/`withTiming` 300ms `Easing.out(Easing.cubic)`; **only** use `usePathInterpolation` if a context7 check confirms the installed react-native-skia/reanimated v4 API supports it cleanly. Display clamps at 100%; balance > target shows an "over-funded" label, ring stays full. Center label uses Oswald (hero number) per typography rules.

### Jars — persistence
- **D-05:** New op-sqlite **migration v5** (`SCHEMA_005` in `schema.sql.ts`, appended to ordered `MIGRATIONS` array, idempotent / `IF NOT EXISTS` / one-statement-per-call per the existing `migrations.ts` idiom). Two tables: `jars` (id, name, target_cents, icon, rule_json, created_at) + `jar_contributions` (id, jar_id, amount_cents, source, tx_id nullable, created_at). The ledger is required for JAR-02 old→new ring delta, Phase-5 milestone notifications, and undo/audit.

### Settings + runtime i18n
- **D-06:** Settings is a **new stack route `app/settings.tsx`** (not a 5th tab), reached via a gear control in an existing screen header (dashboard). Preserves the locked Phase-2 four-tab editorial shell; houses the language toggle and future settings.
- **D-07:** Language switch path: toggle calls `setLanguage(lng)` **and** writes `onboarding.language` to the Zustand/expo-secure-store store, **and** bumps a `key` on the root layout to force a full remount. This guarantees module-scope `t()` calls, `Intl.DateTimeFormat` date headers, and FlashList sticky headers all re-resolve (i18next reactivity alone was proven insufficient for these). A brief flash on explicit user action is acceptable.
- **D-08:** UK translation QA loop: Claude produces a first-pass UK translation for **all namespaces** (5 existing + new `jars`, `settings`). A **key-parity check script** (every `en` key must exist in `uk`, and vice-versa) **gates tsc/CI** (consistent with the project's tsc+lint gate; jest is absent — see [[jest-harness-missing]]). Then a **paid Upwork native-Ukrainian review**; the reviewer's committed edits are the approval artifact (mirrors the Phase-3 review-artifact pattern). AI chat response language is model-side (Sonnet bilingual, no lang param) and is **out of i18next scope** — it does not block SET-02.

### Accessibility
- **D-09:** Full a11y contract, applied to **existing screens + new UI** (QUAL-01..04 say "every screen" — Phase-2's a11y-primitive claims are treated as unverified, not done):
  - Focus: standardize `setAccessibilityFocus` on every bottom-sheet/modal **open** + **return focus** to the invoking control on **close**, implemented once in `BottomSheetPrimitive` (+ `ConfirmModal`).
  - Skia canvases (`DonutChart`, `Sparkline`, new `JarRing`): a single summarizing `accessibilityLabel` conveying the data narratively; child paths decorative + hidden. No dead-end focus.
  - Contrast: **full token-pair sweep**, remediated **globally in `tokens.ts`** (changes ripple app-wide), re-verifying the `BANNED_COLORS` list is not violated. Known suspects: `textMuted #B8968A` / `textSecondary` on cream `background #F7F1E8`.
  - Dynamic type: add `maxFontSizeMultiplier` clamps with reflow on Oswald hero numbers, the tab bar, and the jar-ring center label; verify XXXL does not break layout.
  - Swipe-recategorize gesture gets a VoiceOver-accessible alternative action.

### Claude's Discretion
- D-04 ring rendering specifics (geometry module shape, interpolation method pending context7 check).
- Exact `rule_json` shape for the per-jar round-up unit; exact Settings screen layout/sections beyond the language toggle.
- Key-parity script implementation language/location (follow existing scripts/ idiom).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 4: Jars + i18n + Accessibility" — goal, 5 success criteria, requirement IDs, 4-plan shape
- `.planning/REQUIREMENTS.md` (JAR-01, JAR-02, JAR-03, SET-02, QUAL-01, QUAL-02, QUAL-03, QUAL-04 — verbatim text)
- `.planning/PROJECT.md` — core value, "calm, beautifully designed" aesthetic constraint
- `.planning/STATE.md` — current position, P0 outstanding, deferral ledger

### Prior locked decisions (do not re-litigate)
- `.planning/phases/03-ai-categorization-chat/03-CONTEXT.md` — local-only, EUR-only/no-currency-segmentation (D-03), cents/`formatMoney(cents, locale)` money model, chat language model-side
- `.planning/phases/02-dashboard-transactions-categories/02-CONTEXT.md` — editorial scrollable layout / no fixed shell (D-01..D-08), Skia anim on JS thread (D-26), SVG-icons-only (D-20)
- `./CLAUDE.md` — design tokens source-of-truth, banned colors, typography (Oswald/EB Garamond/Manrope), RN-primitives-only, security (expo-secure-store, no AsyncStorage), tsc+lint verification gate

### Stack docs (verify before coding — CLAUDE.md context7 gate)
- `@shopify/react-native-skia` + `react-native-reanimated` v4 — confirm jar-ring arc + `usePathInterpolation` availability
- `i18next` / `react-i18next` / `expo-localization` — runtime `changeLanguage` propagation, languageDetector behavior

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/mobile/src/features/dashboard/DonutChart.tsx:25-90` + `donutArcs.ts`/`donutArcs.test.ts` — Skia Canvas/Path + reanimated idiom + pure-geometry+test pattern. Direct analog for the jar progress ring (single arc 0→pct).
- `apps/mobile/src/features/chat/chatChartGeometry.ts(.test.ts)`, `Sparkline.tsx` — same pure-geometry+test idiom to mirror for `jarRingGeometry`.
- `apps/mobile/src/lib/i18n/index.ts` — `initI18n(forcedLng?)`, `setLanguage(lng)`, namespaced bundles deep-merged into one `translation` ns; `en`/`uk` only. (Note: in-code comment at ~`:28` claiming "uk mirrors en TODO" is **stale/false** — uk bundles already diverge; measure completeness, don't assume.)
- `apps/mobile/src/stores/onboarding.ts:31,73` — language preference persisted via Zustand + expo-secure-store (the store to write on language switch).
- `apps/mobile/src/lib/db/migrations.ts` + `schema.sql.ts` (`SCHEMA_001..004`, `MIGRATIONS` array, `runMigrations()`/PRAGMA user_version) — the exact idiom for the new v5 jars migration.
- `apps/mobile/src/design/tokens.ts:10-104` — `COLORS`, `GRADIENTS.sage` (savings/success semantic — use for jar ring), `RADIUS`, `SPACING`, `SHADOWS`, `BANNED_COLORS`.
- `apps/mobile/src/components/BottomSheetPrimitive.tsx`, `ConfirmModal.tsx` — partial a11y props; the single place to add the standardized focus-on-open/return-on-close contract.

### Established Patterns
- Skia anim: shared `useSharedValue` + `withTiming` 300ms `Easing.out(Easing.cubic)`, canvas-opacity crossfade on data change; gestures on worklets, chart anim on JS thread.
- DB: ordered idempotent migration array, one-statement-per-call, `BEGIN/COMMIT/ROLLBACK`, SQL bodies as `SCHEMA_00N` consts.
- i18n: namespaced JSON under `src/i18n/locales/{en,uk}/{ai,categories,chat,dashboard,transactions}.json` — new `jars`, `settings` namespaces follow this.
- a11y today: ~40 components use `accessibilityLabel`/`Role`; broad `allowFontScaling`; only ONE `accessibilityViewIsModal`; **zero** focus-management / `AccessibilityInfo` / `maxFontSizeMultiplier` code — focus contract and dynamic-type clamp are greenfield.

### Integration Points
- Jar round-up reads committed EUR expense transactions (negative cents) from `transactionsRepo`; sweep writes `jar_contributions`.
- Settings route added to the expo-router stack (`app/`), gear entry from dashboard header.
- Language switch touches root layout (`app/_layout.tsx` or `(tabs)/_layout.tsx`) for the key-bump remount.
- Contrast remediation edits `tokens.ts` globally → affects every screen (regression-sensitive).

</code_context>

<specifics>
## Specific Ideas

- "monobank-style goal jars feel delightful" (ROADMAP goal) — the round-up + animated ring is the signature delight surface; treat it as a portfolio showcase moment.
- Language switch should feel intentional, not janky — a deliberate full remount on explicit user action is the accepted trade-off over a half-retranslated screen.

</specifics>

<deferred>
## Deferred Ideas

- **JAR-03 fixed-weekly amount + percentage-of-income top-up methods** — v1 ships round-up only (configurable unit). These two methods are deferred (revisit post-v1). NOTE for planner/plan-checker: JAR-03 requirement text lists all three; this is a deliberate scope narrowing — flag as partial coverage in PLAN frontmatter, do not treat as a miss.
- **`merchant_overrides` remote DDL + RLS (`supabase/migrations/0001_merchant_overrides.sql`) + wiring `resolveTier1`** — Phase 3 deferred this "to Phase 4" but Phase 4 ROADMAP never listed it (orphaned). **Decision: re-defer to Phase 5/6.** `resolveTier1` stays an intentional no-op until then. ACTION for planner: update `.planning/STATE.md` deferral line and the Phase-3 `03-VERIFICATION.md` deferred-target to point at the real later phase, not Phase 4. Out of Phase 4 scope.
- Per-currency / UAH round-up handling — stays deferred to v1.5 (Phase-1 D-03 unchanged).

</deferred>

---

*Phase: 4-Jars + i18n + Accessibility*
*Context gathered: 2026-05-15*
