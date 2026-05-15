# Phase 5: Polish + TestFlight Beta - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 delivers the polished settings/security/notifications layer plus a measured performance pass, ending with an Internal TestFlight build live. In scope: a Settings screen housing the biometric app-open gate toggle and CSV data export; onboarding opt-in to that gate (ONBD-04); FaceID/TouchID enforcement (SET-04); two local push notifications (09:00 daily digest NOTIF-01, jar milestone NOTIF-02); instrumented cold-start (<2s, QUAL-05) + Skia first-frame (<100ms, QUAL-06) tuning on iPhone SE 2020; Internal TestFlight build uploaded with ≥1 internal tester.

**Explicitly OUT:** App Store submission/review, screenshots, privacy policy, case study (all Phase 6); the 50-user / 7-day / 99.5%-crash-free beta *results* (= DIST-02, moved to Phase 6 — see D-04); AI settings UI / model picker / cost-ceiling editor (Phase 3 deferred "to Phase 5" but NOT in Phase 5 ROADMAP scope or requirement IDs — stays deferred unless explicitly pulled in); monobank multi-account picker (scope creep); dark mode / OCR / projections (v1.5); remote/cloud transaction storage (project scope fence — local op-sqlite only).
</domain>

<decisions>
## Implementation Decisions

### Biometric App-Open Gate (ONBD-04, SET-01, SET-04)
- **D-01:** Gate fires on **true cold start AND on app-resume when backgrounded > 5 minutes** (AppState listener, threshold 5 min). CLAUDE.md "every cold start when enabled" is the floor; resume-gating after 5 min is the locked addition. Failed FaceID/TouchID → fall back to **device passcode** (`LocalAuthentication` system fallback), **no app-level retry cap** (rely on OS biometric lockout). Cold-start hook lives at the existing `app/_layout.tsx` render gate (returns null until ready); resume hook is an additive AppState listener.

### CSV Export (SET-03)
- **D-02:** Export emits **two files — `transactions.csv` + `jars.csv`** — together in a single iOS **share-sheet** action via `expo-sharing`. `jars.csv` includes the jar contribution ledger; transactions include AI-derived category names. No column excluded for privacy: `transactions.description` is already `null` for all ingest paths by Phase 1 AI-safety design, so there is no PII leak surface. Export is greenfield (only CSV *import* exists from Phase 1).

### Daily Digest Notification (NOTIF-01)
- **D-03:** **Editorial EB-Garamond voice** ("Yesterday's coffee added up to €83") — brand-consistent with the locked DigestCard tone (Phase 2 D-07, "NYT Money column, not fintech insights card"). **Opt-in toggled in Settings, default OFF.** iOS notification permission requested **in-context when the toggle is switched on** (not at app launch — App Store permission best practice). Zero-spend day → send **"A quiet day — nothing spent"** (do not suppress).

### TestFlight Beta Completion Bar (resolves ROADMAP↔REQUIREMENTS conflict)
- **D-04:** Phase 5 **completes on beta LAUNCH**: Internal TestFlight build uploaded + ≥1 internal tester runs it (no Apple beta review required). The "50 users active 7+ days, crash-free ≥99.5%" criterion is **reassigned to Phase 6 as DIST-02** (REQUIREMENTS.md already maps DIST-02→Phase 6; this resolves the conflict toward REQUIREMENTS). Phase 5 does not carry a multi-week calendar gate. Plan 05-04 = beta *build + launch*, not results collection.

### Claude's Discretion
- Exact Settings screen section ordering, component composition (extend existing `SettingsScreen.tsx` section/card pattern from Phase 4 D-06).
- Notification scheduling mechanism (expo-notifications local trigger config), milestone-crossing detection logic for NOTIF-02 off the `jar_contributions` ledger.
- Performance instrumentation approach (perfetto vs Sentry transaction vs `react-native-performance` hooks) — see dependency note: Sentry init is blocked on user EU DSN/keys (P0 #7); if keys absent at execution, fall back to a non-Sentry cold-start measurement and flag QUAL-05 evidence as device-only.
- CSV file schema/column set per entity.
- 5-minute resume threshold may be exposed as a constant, not a user setting (no requirement for configurability).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No standalone ADR/SPEC file exists for Phase 5 (Phase 3 had AI-SPEC/UI-SPEC; Phase 5 has none). The binding context is distributed across:

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 5: Polish + TestFlight Beta" — goal, success criteria, 4-plan shape, Depends-on Phase 4
- `.planning/REQUIREMENTS.md` — ONBD-04, SET-01, SET-03, SET-04, NOTIF-01, NOTIF-02, QUAL-05, QUAL-06; DIST-02 (now the Phase 6 beta-results criterion per D-04)
- `.planning/PROJECT.md` — scope fence (no cloud tx storage, ship free), Ukrainian-diaspora TestFlight cohort, Apple Developer Individual account decision

### Security & verification (binding constraints)
- `CLAUDE.md` §Security rules — biometric every cold start when enabled, expo-secure-store only (never AsyncStorage), no transaction details in prod console.log, TLS 1.3
- `CLAUDE.md` §Design rules — banned color values, Oswald/EB-Garamond/Manrope typeface roles, tokens-only
- `CLAUDE.md` §Verification gate — `cd apps/mobile && npx tsc --noEmit` + `npx expo lint` (jest harness absent — MEMORY jest-harness-missing; do not claim test coverage)

### State, blockers, prior-phase decisions
- `.planning/STATE.md` — P0 #3 Apple Developer enrollment (€99, hard prereq for TestFlight), P0 #4 EAS init, P0 #7 Sentry/PostHog EU keys, Phase 3→5 deferrals (cost-cap D-24 + Sentry breadcrumbs)
- `.planning/phases/04-jars-i18n-accessibility/04-CONTEXT.md` — D-06 settings stack-route, D-07 lang-remount, D-08 i18n key-parity CI gate, jar_contributions ledger (NOTIF-02 source)
- `.planning/phases/03-ai-categorization-chat/03-CONTEXT.md` — D-24 cost-cap deferred→Phase 5, AI-settings-UI deferral, session-scoped chat
- `.planning/phases/02-dashboard-transactions-categories/02-CONTEXT.md` — D-07 DigestCard editorial voice (binds NOTIF-01 copy), D-26/D-27 perf measurement deferred→Phase 5
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/settings/SettingsScreen.tsx:24` (route `app/settings.tsx`) — EXISTS, Language section only with explicit `// Biometric + export are Phase 5` placeholder; established `section`/`card`/`sectionLabel` style pattern to extend.
- `src/i18n/locales/en/settings.json` + `uk/settings.json` — EXISTS (6 keys); add biometric/export/notification keys to BOTH, must pass Phase 4 D-08 key-parity CI gate.
- `src/stores/onboarding.ts:22` — Zustand + persist + secureStorage store; natural home for `biometricEnabled` field (ONBD-04).
- `src/lib/secure.ts:21` — typed `SecureKey` union (currently monobank_token/_hash, soldi-onboarding, soldi-tx-filter); add biometric-enabled key here.
- `src/features/dashboard/DigestCard.tsx` + `transactionsRepo.sumLastNDays` — "yesterday in money" computation reusable for NOTIF-01 body.
- `jar_contributions` ledger (Phase 4 schema v5) + `src/features/jars/JarRing.tsx` — milestone source for NOTIF-02.

### Established Patterns
- Cold-start critical path = `app/_layout.tsx:75-109`: 3 font families + `initI18n()` + `runMigrations()` all gate first render (`return null` until ready) — this is the measured QUAL-05 path AND where the biometric cold-start gate hooks in.
- Settings = stack route, not a tab (Phase 4 D-06). Language switch = root key-bump remount (`app/_layout.tsx:118`).
- expo-local-authentication ~17.0.8, expo-notifications ~0.32.17, @sentry/react-native ~7.2.0, posthog-react-native ^4.45.5 all installed as deps; `NSFaceIDUsageDescription` + plugins registered in `app.json` (:16, :54, :60). Zero init/usage of any of them — all greenfield.

### Integration Points
- Biometric gate ↔ `app/_layout.tsx` render gate (cold start) + new AppState listener (resume).
- CSV export ↔ transactions/jars repos + `expo-sharing`.
- NOTIF-01 ↔ DigestCard digest computation; NOTIF-02 ↔ jar_contributions ledger crossing detection.
- Perf pass ↔ FlashList transaction list, Skia (DonutChart/Sparkline/JarRing), cold-start path.
- Sentry/PostHog init ↔ blocked on user EU DSN/keys (P0 #7) — design for graceful absence.
</code_context>

<specifics>
## Specific Ideas

- Digest copy reference voice: "Yesterday's coffee added up to €83"; zero-spend literal: "A quiet day — nothing spent".
- Biometric resume threshold: exactly 5 minutes backgrounded.
- CSV: exactly two files named `transactions.csv` and `jars.csv`, share-sheet delivery.
- Beta target: Internal TestFlight (no Apple review), Ukrainian-diaspora-in-Ireland cohort recruited later (Phase 6).
</specifics>

<deferred>
## Deferred Ideas

- **Beta results gate (50 users / 7 days / ≥99.5% crash-free)** → Phase 6 as DIST-02 (explicit D-04). Phase 5 stops at beta launch.
- **AI settings UI** (model picker / cost-ceiling editor / AI on-off) — Phase 3 deferred "to Phase 5" but absent from Phase 5 ROADMAP plan list (05-01..04) and requirement IDs. Stays deferred; founder did not pull it into Phase 5 scope. Reconcile in a future phase or roadmap edit if desired.
- **monobank multi-account picker** — Phase 1 P04 deferral; scope creep relative to Phase 5; remains deferred.
- **Cost-cap D-24 activation + Sentry breadcrumb wiring** — legitimate Phase 5 observability work but dependency-blocked on P0 #7 (user EU keys). Treated as Claude's-discretion dependency (graceful-absence design), not a separate scoped feature.

None of the above were scope-creep introduced during discussion — discussion stayed within Phase 5 boundary.
</deferred>

---

*Phase: 05-polish-testflight-beta*
*Context gathered: 2026-05-16*
