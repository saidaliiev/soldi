# Soldify Performance & Health Audit

**Date:** 2026-05-26
**Scope:** apps/mobile — Expo SDK 54, RN 0.81.5, Hermes, new arch, op-sqlite, Reanimated v4, Skia, FlashList, TanStack Query v5, Zustand
**Method:** Static recon (parallel Explore agents) — no runtime profiler ran
**Status:** Pre-implementation. Action items below are unverified hypotheses until probes #1–#8 execute on device.

---

## Executive summary

The app is in good shape architecturally: motion is governed (`src/design/motion.ts`), glass is gated (`src/design/glass.ts`), tokens are honored, FlashList is in place for transactions. There are however **two P0 bugs that can ship to users today** and **four P1 hotspots that will surface as jank under load**. Bundle weight is unmeasured but Skia + Sentry + i18next + Reanimated together are the obvious suspects, and **Victory Native is bundled but never imported** — a free removal.

**Recommended next sprint:** 5 fixes (P0 ×2 + P1 ×3) — roughly half a day plus device verification. None of them require new dependencies. Do not optimize anything else until probes #1–#8 produce numbers; below-the-fold P2 work is busywork without measurements.

---

## P0 — visible bugs, ship-blockers

### P0-1 — Biometric gate has no timeout, no max retries

**File:** `apps/mobile/app/_layout.tsx:167–190`

The biometric auth loop calls `LocalAuthentication.authenticateAsync()` and re-attempts indefinitely on failure. If the user cancels three times or the sensor fails on a cold device, the splash sits forever — no fallback, no escape hatch.

**Symptom users see:** Splash screen frozen on cold start, app appears dead.

**Fix:**
1. Cap attempts at 3
2. After cap, show a "Use passcode" fallback path (system passcode → app passcode → recovery)
3. Surface a Sentry error for any auth path that takes >10s

**Effort:** ~2h including UX path.

---

### P0-2 — DonutChart first-frame budget unverified at runtime

**File:** `apps/mobile/src/features/dashboard/DonutChart.tsx:21` (spec D-27 / QUAL-06 — budget < 100ms)
**Marks:** `markFirstFrame()` in `apps/mobile/src/lib/perf.ts:128–138`

The budget exists in code comments and the marker is wired, but **no SLA enforcement is logged** — if a phone exceeds the budget, nobody knows. On a low-end Android device with a 50-category breakdown, `computeSliceAngles()` + `arcsFromSliceAngles()` + Skia path construction can plausibly miss the budget.

**Symptom users see:** Visible jank on first dashboard render after cold start, especially on lower-end Android.

**Fix:**
1. Wire `markFirstFrame()` delta into a Sentry breadcrumb tagged `donut.first_frame_ms`
2. On any sample > 100ms, raise a Sentry message at `level: 'warning'`
3. (Stretch) Pre-warm the Skia paths via `useEffect` in dashboard mount so the first render benefits from cache

**Effort:** ~1h instrumentation + 1 day measurement campaign on real devices.

---

## P1 — likely user-visible under load, worth measuring

### P1-1 — Dashboard double-queries the monthly expense total

**Files:**
- `apps/mobile/src/features/dashboard/dashboardRepo.ts:60–76` (`getMonthlyExpenseTotal`)
- `apps/mobile/app/(tabs)/index.tsx:48` (`useMonthData`)
- `apps/mobile/app/(tabs)/index.tsx:120–125` (hero-subline effect)

Both `useMonthData` and the hero-subline effect call `getMonthlyExpenseTotal()` on every month change. With a sticky `useMonthData` dependency cycle, this fires twice per swipe.

**Symptom users see:** Subtle stutter on month-swipe, especially on a slow SQLite connection.

**Fix:** Lift the total into a single `useQuery` keyed `['monthly-total', year, month]` via TanStack Query; both consumers read from cache.

**Effort:** ~1.5h.

---

### P1-2 — ChatMessageList is not virtualized

**File:** `apps/mobile/src/features/chat/ChatScreen.tsx:77`

`ChatMessageList` renders all messages in a flat list. No FlashList. A long chat session (50+ messages) re-renders the entire history on every new message.

**Symptom users see:** Sluggish typing/sending after the chat has 50+ messages; visible drop in FPS during long-conversation scroll.

**Fix:** Wrap in FlashList with `estimatedItemSize` matched to typical bubble height; provide stable `keyExtractor`.

**Effort:** ~2h including bubble height estimation + scroll-to-bottom behavior.

---

### P1-3 — FlashList row swipe state may leak shared values across recycles

**File:** `apps/mobile/src/features/transactions/TransactionRow.tsx:96–123`

Per-row `Gesture.Pan()` + `useAnimatedStyle` with shared value (damping 20, stiffness 200). If FlashList recycles the row while a swipe is in-flight, the shared value carries to the new row content.

**Symptom users see:** Stale swipe offset after fast scroll on transaction list; occasionally a row appears half-swiped when it shouldn't.

**Fix:** Reset the shared value to `0` in `onLayout` or via `useEffect([tx.id])` — bind the swipe state to the transaction identity, not the row slot.

**Effort:** ~1h fix + scroll-torture test.

---

### P1-4 — Victory Native bundled but unused

**File:** `apps/mobile/package.json:65`

Grep for `victory-native` in `src/` returns zero usage. Pure dead weight in the bundle.

**Symptom users see:** None directly, but every byte costs cold-start time.

**Fix:** `bun remove victory-native` from `apps/mobile/package.json`; `bun install`; verify `npx tsc --noEmit` still passes.

**Effort:** ~10min. Easiest win on this list.

---

## P2 — cleanup, measurable but low-impact

| # | File:Line | Issue | Fix |
|---|-----------|-------|-----|
| P2-1 | `TransactionRow.tsx:54-55` | Hairline color built via string concat `${COLORS.textMuted}<alpha>` on every render — new object each frame | Hoist to `useMemo` or compute once in `StyleSheet.create()` |
| P2-2 | `ChatScreen.tsx:46` | Prefill state managed locally + chained via callbacks (`handlePromptSubmit → handlePrefillConsumed`) | Lift to chat store with a single `setPrefill / consumePrefill` action |
| P2-3 | bundle | Sentry + Skia + i18next + Reanimated weight unmeasured | Run `eas build --platform ios --json` and inspect Hermes bytecode size; report numbers |
| P2-4 | DonutChart Reanimated | `progress` shared value lives across month changes — check teardown on dashboard unmount | Verify with Reanimated devtools; add `cancelAnimation(progress)` in cleanup |
| P2-5 | `DashboardIcon` etc. | Skia.Path.MakeFromSVGString memoized — confirm no leak on repeated parses | Run memory profiler over tab-switch loop, check for unbounded growth |

---

## Bundle weight suspects (need numbers)

Verified imports from `apps/mobile/package.json`:

| Package | Version | Used where | Removable? |
|---------|---------|------------|------------|
| `@sentry/react-native` | ~7.2.0 | `_layout.tsx:51` always init | Behind DSN gate — keep |
| `@shopify/react-native-skia` | 2.2.12 | DonutChart + 55+ icon files | Keep (core feature) |
| `react-native-reanimated` | ~4.1.1 | DonutChart, TransactionRow, FAB | Keep (core feature) |
| `react-native-worklets` | ~0.5.1 | reanimated peer | Keep |
| `@shopify/flash-list` | 2.0.2 | transactions only | Keep, extend to chat (P1-2) |
| `i18next` + `react-i18next` | latest | Whole app | Keep |
| `victory-native` | (pinned) | Zero grep matches | **DROP — P1-4** |
| `posthog-react-native` | 4.45.5 | Bundled, init not visible | Audit — may be droppable |
| `@expo/vector-icons` | sdk default | Tab icons via Skia path — Lucide-style names not in use | Check if any vector icons render; likely droppable post-emoji-swap |
| `expo-glass-effect` | 0.1.10 (beta) | tab bar + bottom sheet only | Keep — gated per `getGlassEffect()` |

After emoji refactor lands, also consider:
- The 30 SVG icon components (~1700 LOC) are deleted — confirm bundle delta via `--bundle-output` byte count before/after.

---

## DB hot paths

| Site | Hot? | Notes |
|------|------|-------|
| `dashboardRepo.ts:60-76` getMonthlyExpenseTotal | Yes | Called 2× per month change — see P1-1 |
| `dashboardRepo.ts` getCategoryBreakdown | Yes | JOIN + GROUP BY + ORDER + LIMIT 5; index on `(category_id, date)` exists? Check schema |
| `transactionsRepo.ts` listByFilter | Yes | Re-fires on every filterStore mutation via `useEffect` in `useTransactionsList.ts:72-74` — debounce if filter UI thrashes |
| `runMigrations()` `src/lib/db/index.ts:100-127` | Cold start only | Synchronous; blocks render gate. Acceptable for a one-time op but watch on app upgrade where 2+ migrations may run |

---

## Network / AI

`apps/mobile/src/services/aiQuery.ts:75-117` — Supabase Edge Function caller.

- Timeout: 45s (generous — user-facing budget is < 3s per CHAT-02)
- No retry. Single attempt → immediate failure on flaky network.
- FactsPack rebuilt from DB on every chat query (no cache).

**Recommendation:** Wrap aiQuery in TanStack Query with `staleTime: 30s` so identical follow-up questions in a session hit cache; consider `retry: 1` for network-class errors only (not 4xx).

`api/queryClient.ts:15` — `refetchOnWindowFocus: false` confirmed. Good. No unbounded polling.

---

## Memory leak candidates

**OK / cleanups present:**
- GlassTabBar accessibility listener — cleanup at `useEffect` return (`GlassTabBar.tsx:82-90`)
- useMotion accessibility listener — cleanup present (`src/design/useMotion.ts:75-77`)

**Worth verifying with profiler:**
- Reanimated `progress` shared value in DonutChart (cancel on unmount?)
- Skia canvas per tab-icon × 4 — no leak expected but should confirm
- Chat store messages array — no max-length cap; sessions of 1000+ msgs will bloat (mitigated once P1-2 lands)

---

## Performance budgets in code

| Metric | Budget | Where | Enforced at runtime? |
|--------|--------|-------|---------------------|
| Donut first frame | < 100ms | `DonutChart.tsx:21` (D-27/QUAL-06) | **No — see P0-2** |
| Hero count-up | 720ms | `MOTION.heroCountUp` | Via motion vocabulary |
| Arc draw (mount) | 760ms | `MOTION.arcDraw` | Via motion vocabulary |
| Arc morph (month change) | 450ms | `MOTION.arcInterpolate` | Via motion vocabulary |
| Cold start | (unspecified) | `markColdStart` → `markAppReady` in `perf.ts` | Marker wired, no SLA |
| Biometric auth | (unspecified) | `_layout.tsx:167` | **No timeout — see P0-1** |
| 5000 tx at 60fps on iPhone SE 2020 | PROJECT requirement | `.planning/PROJECT.md:23` | Not yet probed |

---

## Action items — prioritized for next sprint

| # | Priority | Item | Effort | File anchor |
|---|----------|------|--------|-------------|
| 1 | P0 | Biometric retry cap + fallback | 2h | `app/_layout.tsx:167–190` |
| 2 | P1 | Drop unused `victory-native` from deps | 10min | `package.json` |
| 3 | P1 | TanStack-Query the monthly total to kill double-query | 1.5h | `dashboardRepo.ts` + `index.tsx:120` |
| 4 | P1 | Wrap ChatMessageList in FlashList | 2h | `ChatScreen.tsx:77` |
| 5 | P1 | Reset TransactionRow swipe state on row identity change | 1h | `TransactionRow.tsx:96–123` |
| 6 | P0 | Wire DonutChart first-frame metric to Sentry | 1h | `DonutChart.tsx` + `perf.ts:128` |
| 7 | P2 | Hoist TransactionRow hairline color out of render | 30min | `TransactionRow.tsx:54-55` |
| 8 | P2 | Audit PostHog init (drop if unused) | 30min | grep `posthog` in src/ |

**Total estimated effort for items 1–6:** ~8h (one focused day). Items 7–8: another half day.

---

## Audit playbook — concrete probes (run on real device + emulator, capture numbers)

| # | Probe | Where | Metric | Pass criterion |
|---|-------|-------|--------|----------------|
| 1 | Hermes cold-start trace | systrace on Android emulator from launch → first interactive | `markColdStart` → `markAppReady` delta | < 2s on Pixel 5a |
| 2 | Biometric gate failure mode | Force-cancel auth 3× in a row | Time to fallback or freeze detection | No infinite loop, fallback within 5s |
| 3 | DonutChart first-frame | Hermes profiler from dashboard mount | `computeSliceAngles` + Skia path construction time | < 100ms (QUAL-06 budget) |
| 4 | FlashList scroll torture | 5-min scroll over 1000 fake transactions | Heap growth, FPS, dropped frames | < 5% heap growth, > 55 FPS sustained |
| 5 | Dashboard double-query | React DevTools profiler on month-swipe | `getMonthlyExpenseTotal` call count per swipe | 1 call (cache hit on 2nd consumer) |
| 6 | Chat history scroll | Render 500-msg history; scroll + append | FPS during initial render + on append | > 55 FPS sustained |
| 7 | Bundle size delta | EAS build with + without victory-native; with + without categoryEmoji refactor | Hermes bytecode size | quantified, not just "smaller" |
| 8 | Cold-start with biometric disabled vs enabled | Same launch, two configs | Render-gate delta | Document the cost of biometric in cold start |

Capture all probe output in a follow-up `.planning/perf-audit-results-YYYY-MM-DD.md` — this current doc is the **playbook**, not the **result**.

---

## What this audit did NOT cover

- **Runtime profiling.** Everything here is static reading. Numbers are conjectures until probes run.
- **iOS-specific Hermes traces.** Probes 1, 3, 4 should run on both iOS and Android.
- **Network latency under poor conditions.** No NetworkLink Conditioner runs.
- **Battery drain.** No long-duration test.
- **A11y interaction performance.** VoiceOver flow timing not measured.

These belong in the follow-up result doc once probes run.

---

## Cross-references

- `apps/mobile/CLAUDE.md` — banned values, design rules, security rules
- `.planning/PROJECT.md:23` — "5000 tx at 60fps on iPhone SE 2020" requirement
- `.planning/STATE.md` — current phase + deferred infra (jest harness P1)
- `apps/mobile/src/design/motion.ts` — motion vocabulary + budgets

---

*This audit is a snapshot of the codebase as of HEAD `d12a179` (2026-05-25). Re-run after substantive perf changes.*
