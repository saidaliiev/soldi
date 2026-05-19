# SOLDI Redesign — Wave 3 (Transactions: Editorial + List-Enter Motion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Transactions/Activity surface to the premium hiring-signal bar (spec §3 Wave 3): editorial polish on `DateHeader` / `TransactionRow` / `FilterPillsRow` / `transactions.tsx`, a subtle governed list-row enter motion, hairline date headers, the Activity-screen header two-tone-seam fix (design-sync defect #1), and retirement of the `MonthSwiper` ad-hoc 250ms pan-snap literal (W2 carry-forward debt) — all motion through the existing Wave-0/2 `MOTION` vocabulary + `useMotion` boundary, reduce-motion mandatory. No new native module → no EAS build triggered here; device-UAT is authored and **batched into the deferred W1+W2 TestFlight build** (user decision 2026-05-19).

**Architecture:** Mirrors Wave 1/2 — pure node-tested decision layer + the ONE existing reanimated boundary. The list-enter timing is a new **additive** pure preset `MOTION.listRowEnter` in `src/design/motion.ts` (W0 `MOTION`/`degradeForReducedMotion`/`selectMotionPreset` untouched; `MotionName` widens automatically so `selectMotionPreset` covers it with zero new branching). The reanimated entry is produced only inside the existing sole reanimated-`Easing` site `src/design/useMotion.ts` via a new `useRowEnter()` helper (reduce-motion aware through `selectMotionPreset(..., isReduceMotionEnabled())`, duration 0 ⇒ no enter animation, row renders final). Components consume `useRowEnter()` / existing `withMotion` only — zero new `duration:`/`Easing.`/`withTiming`/`withSpring` literals introduced in the four W3-touched components, and the `MonthSwiper` literal is **removed** (net governance improvement).

**Spec-table note (read — deliberate, not silent):** spec §2.1's approved motion table does not enumerate a list-enter preset, but spec §3 Wave 3 explicitly requires "subtle list-enter motion" and CLAUDE.md bans ad-hoc literals. The only standard-compliant resolution is a governed preset. `MOTION.listRowEnter` is therefore added as the planning-time realization of already-approved Wave-3 scope (spec §6 "Open Items Carried to Planning" pattern), recorded here for user visibility — it extends the vocabulary, it does not change any existing approved preset.

**MonthSwiper debt mapping (decision, locked):** the removed literal is `withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) })`. `Easing.out(quad)` is **not** a vocabulary easing token (`outCubic`/`inOutCubic`/`spring`/`linear`), so the literal cannot be preserved verbatim under governance — it must be re-expressed. It is mapped to the existing `MOTION.fabReveal` (220ms `outCubic`): same decelerate-to-rest intent, 220↔250ms imperceptible for a label snap-back, no vocabulary sprawl (no per-debt preset). Reuse via the existing `useMotion`→`withMotion(0,'fabReveal')` boundary. Documented for user visibility.

**Tech Stack:** Expo SDK 54 (`~54.0.x`), React Native 0.81.5, TypeScript 5.9 strict, `node:test`+`tsx` runner (`src/**/*.test.ts`), `react-native-reanimated@~4.1.x`, `react-native-gesture-handler` v2, `@shopify/flash-list` v2, `react-i18next` (existing). Binds to the REAL Wave-0/2 API on `origin/main @ 6a44a43` (verified in tree): `MOTION`/`degradeForReducedMotion`/`selectMotionPreset` (`src/design/motion.ts`), the `useMotion`/`withMotion` boundary (`src/design/useMotion.ts`), Slate & Sand `COLORS`/`SPACING`/`RADIUS` (`src/design/tokens.ts`), `TYPE.*` (`src/design/typography.ts`).

**Source of truth:** `docs/superpowers/specs/2026-05-17-soldi-premium-redesign-design.md` (§2.1 motion table, §3 Wave 3 line 111–112, §4 R3/R6 + per-wave gate, §6). Design-sync authority: `docs/design/soldify-screens.html` TRANSACTIONS section lines 205–256 (Slate & Sand, regenerated 2026-05-19 `75e7350`) per `docs/superpowers/specs/2026-05-18-design-sync-local-authority.md` — with the post-relock note that **palette is now in scope** for this wave's design-sync (HTML is Slate & Sand; the earlier palette-deferral caveat lifted when the gender-neutral relock landed). Header-seam defect #1 from that spec is an explicit W3 task. Wave 2 plan carry-forward: `docs/superpowers/plans/2026-05-17-soldi-redesign-wave-2-dashboard-hero.md:41`.

**Sequencing constraint (read before executing):** Wave 3 is **pure RN/JS — NO new native module, NO EAS build triggered.** Local gate only. Device-UAT for W3 (row-enter feel, hairline rhythm, header-seam on device, MonthSwiper snap parity, reduce-motion, list fps) is authored here (Task 7) and **batched into the already-deferred W1+W2 TestFlight build** sequenced after the in-flight build #6 (`eas-build-quota` memory; spec §3 "batch Wave 1–2 → build" — W3 folded in per user decision 2026-05-19). R3 perf budget (≥58fps) is verified in Wave 6, not here — W3 motion is post-mount and subtle so cold-start/list-scroll budget is unaffected; the row-enter must not fire on FlashList **recycle** (see Key Decisions / Task 2 risk).

**Working directory:** all `apps/mobile/...` paths are relative to repo root `/home/iskan/projects/soldify`. Run `npm`/`tsc`/`lint`/`expo`/`git` from `apps/mobile` unless stated. `npm test` glob = `src/**/*.test.ts` (node:test + tsx); design/feature pure modules are testable, RN/reanimated boundary + screen files are NOT (verified by gate + device-UAT, same as Wave-1/2).

---

## File Structure (decomposition locked here)

| File | Responsibility | Wave 3 action |
|---|---|---|
| `apps/mobile/src/design/motion.ts` | Pure motion vocabulary (node-safe, NO reanimated) | Modify — append `listRowEnter` to `MOTION` (additive; W0/W2 exports + types untouched, `MotionName` widens automatically) |
| `apps/mobile/src/design/motion.test.ts` | Pure motion guard | Modify — extend the "every MOTION name resolves both modes" coverage to include `listRowEnter`; add a subtlety assertion (duration ≤ 320ms, easing `outCubic`) |
| `apps/mobile/src/design/useMotion.ts` | The ONLY reanimated-`Easing` boundary (W2) | Modify — add `useRowEnter()` (reduce-motion-aware reanimated `entering` built from `selectMotionPreset('listRowEnter', …)`, fade + `ROW_ENTER_TRANSLATE_Y` rise; duration 0 ⇒ returns no-op entering) |
| `apps/mobile/src/features/transactions/TransactionRow.tsx` | 72pt tx row | Modify — editorial polish to HTML 205–256 (hairline row separator, typography/spacing rhythm); wrap row in list-enter via `useRowEnter()`; recycle-safe (Task 2/3) |
| `apps/mobile/src/features/transactions/DateHeader.tsx` | Sticky day group header | Modify — hairline editorial pass: eyebrow-style uppercase label, hairline weight/alpha + spacing to HTML; tokens only |
| `apps/mobile/src/features/transactions/FilterPillsRow.tsx` | Active-filter pills strip | Modify — editorial polish (pill rhythm/spacing/typography to HTML); no behavior change |
| `apps/mobile/app/(tabs)/transactions.tsx` | Transactions screen composition | Modify — editorial spacing/rhythm pass + **header two-tone-seam fix** (status-bar safe-area tint == header band == one continuous region, design-sync defect #1) |
| `apps/mobile/src/features/dashboard/MonthSwiper.tsx` | Month pan navigator | Modify — replace the `withTiming(0,{duration:250,easing:Easing.out(Easing.quad)})` literal with the `useMotion`→`withMotion(0,'fabReveal')` boundary; drop now-unused `Easing`/`withTiming` imports |
| `.planning/STATE.md` | Planning state | Modify — record Wave 3 code complete + device-UAT batched into W1+W2 build |
| `.planning/phases/redesign/W3-DEVICE-UAT.md` | Deferred device-UAT checklist | Create — appended to the W1+W2 batched-build checkpoint |
| `docs/design/soldify-screens.html` | Local design authority | Read-only (design-sync checkpoint) — surface drift, never silently "fix" the mockup |

**Out of Wave 3 scope (do NOT touch — later waves / known debt):**
- Bottom-sheet glass (`GLASS.sheet`) + `RecategorizeBottomSheet` real glass background — Wave 4 (chat/sheet wave). Spec §3 Wave 3 lists "sheet spring" but `MOTION.sheetSpring` already exists from W0 and its real sheet usage is Wave 4; W3 does **not** wire a sheet. No-op here, recorded.
- `features/chat/*`, Categories, Jars, Onboarding, Settings, tx detail/search screens — Waves 4/5.
- Pre-existing ad-hoc motion literals in untouched files (`ChatBubble*`, `JarRing`, `PropagationToast`, `CategoryListRow`, `onboarding/welcome`, `ChatErrorBanner`, `ChatInputRow`, `ChatEmptyState`) — Waves 4/5. Governance grep in Task 7 is scoped to the W3-touched files only.
- `schema.sql.ts` 18 category seed colors — separate post-Palette data-migration spec (design-sync spec §"Out of scope"; STATE.md deferred). Not design-sync, not W3.
- FlashList perf budget / ≥58fps numeric verification — Wave 6 (spec §4 R3). W3 only ensures the enter is post-mount and recycle-safe.

**Key design decisions (locked, with citations):**
- **One vocabulary, additive preset.** `MOTION.listRowEnter` is the single sanctioned source for the row-enter timing; geometry (`ROW_ENTER_TRANSLATE_Y`) is one named constant in the `useMotion` boundary (vocabulary = timing/easing; a standard enter's rise distance is a sanctioned boundary constant, not an ad-hoc per-component literal). reduce-motion: `selectMotionPreset('listRowEnter', true)` → `durationMs:0` ⇒ `useRowEnter()` returns a no-op `entering` (row appears instantly, no transform) — spec §2.1 "reduce-motion must be respected", §4 R3.
- **Recycle-safe enter (FlashList v2 risk — must be honored).** FlashList v2 recycles row views; a naïve reanimated `entering` re-fires on every recycle = scroll-jank and wrong motion. Mitigation (Task 2/3): the enter is gated to a first-appearance window — `useRowEnter()` returns the `entering` animation only within a short post-mount budget (module-load timestamp + per-screen first-frame guard), after which it returns the no-op entering so recycled/scrolled rows do NOT animate. This keeps the motion to the *initial* list paint (the editorial "settle"), never during scroll. Device-UAT (Task 7) explicitly verifies no enter-animation on fast scroll/recycle.
- **Header two-tone seam = palette-agnostic cohesion (design-sync defect #1).** The fix is structural, not a color value: the status-bar safe-area region and the header band beneath the title/eyebrow must be **one continuous fill** from the very top edge through the eyebrow on the Transactions screen (matches HTML 205–256 + dashboard fix already shipped W2). Implemented via the SafeArea/header treatment in `transactions.tsx`; no `COLORS.*` value change (Slate & Sand locked).
- **MonthSwiper debt → governed reuse, not new preset.** See header note. `withMotion(0,'fabReveal')` through the existing boundary; `Easing`/`withTiming` imports removed from `MonthSwiper.tsx`. Net: −1 ad-hoc motion site in the codebase.
- **Design-sync = drift surfacing, not silent fixing.** Checkpoint before the high-visual tasks (Task 3/4) compares impl vs `soldify-screens.html:205–256` for structure AND palette (both valid post-relock). Mismatches are reported to the user; the mockup is not edited to match code (design-path C: HTML is authority, code conforms — `design-sync-local-authority` spec).

---

## Design-Sync Checkpoint (gate — before Task 3/4, STOP for user)

1. Read `docs/design/soldify-screens.html` lines 205–256 (TRANSACTIONS section).
2. Read current impl: `transactions.tsx`, `TransactionRow.tsx`, `DateHeader.tsx`, `FilterPillsRow.tsx`.
3. Compare (structure + palette, both in scope post Slate & Sand relock): header continuity (no two-tone seam), filter-pill rhythm, date-header eyebrow style + hairline weight/alpha, row hairline separators, row typography hierarchy (merchant vs category meta vs amount), section/row spacing rhythm, tab-bar active state.
4. Produce a drift list. **STOP** — user reviews drift, confirms target, then Task 3/4 proceed. Do NOT edit the HTML.

---

## Task 1: Pure `MOTION.listRowEnter` preset (node-safe, additive)

**Files:**
- Modify: `apps/mobile/src/design/motion.ts` (add ONE key to the `MOTION` object literal; do NOT alter `degradeForReducedMotion`, `selectMotionPreset`, types, or existing presets)
- Modify: `apps/mobile/src/design/motion.test.ts` (extend coverage; keep W0/W2 tests unchanged)

Still pure: NO reanimated/RN import. `MotionName` widens automatically from the new key; `selectMotionPreset` needs zero changes.

- [ ] **Step 1: Write the failing tests** — append to `apps/mobile/src/design/motion.test.ts`:

```ts
test('MOTION.listRowEnter is a subtle decelerate preset', () => {
  assert.ok(MOTION.listRowEnter.durationMs > 0 && MOTION.listRowEnter.durationMs <= 320);
  assert.strictEqual(MOTION.listRowEnter.easing, 'outCubic');
});

test('selectMotionPreset resolves listRowEnter in both modes', () => {
  assert.strictEqual(selectMotionPreset('listRowEnter', false), MOTION.listRowEnter);
  const r = selectMotionPreset('listRowEnter', true);
  assert.strictEqual(r.durationMs, 0);
  assert.strictEqual(r.easing, 'linear');
  assert.strictEqual((r as { reduced?: true }).reduced, true);
});
```

- [ ] **Step 2: Run tests, verify they fail** — from `apps/mobile`: `npm test 2>&1 | grep -E "listRowEnter|# fail"` → expect FAIL (`listRowEnter` not on `MOTION`).
- [ ] **Step 3: Implement** — add to the `MOTION` object in `apps/mobile/src/design/motion.ts`, after `sharedMonth`, before `sheetSpring` (keep the `satisfies Record<string, MotionPreset>` intact):

```ts
  /** Subtle one-shot list-row settle on initial list paint (TransactionRow). */
  listRowEnter: { durationMs: 260, easing: 'outCubic' },
```

- [ ] **Step 4: Run full pure suite** — `npm test` → all pass (≥ prior count + new). Report verbatim.

**Verification:** `cd apps/mobile && npm test` exit 0; new assertions green; `git diff` shows only the additive key + new tests.

---

## Task 2: `useRowEnter()` recycle-safe boundary in `useMotion.ts`

**Files:**
- Modify: `apps/mobile/src/design/useMotion.ts` (the existing sole reanimated-`Easing` site; ADD `useRowEnter` + `ROW_ENTER_TRANSLATE_Y`; do not alter the existing `useMotion`/`withMotion`/`useReduceMotion` exports)

Not node-testable (reanimated boundary) — verified by gate + device-UAT, same status as W2 `useMotion`. Pure decision (`selectMotionPreset`) is already tested in Task 1.

- [ ] **Step 1: Read** `useMotion.ts` in full to bind to its real `useReduceMotion()` / preset-resolution pattern (do not assume the API — match W2's actual shape).
- [ ] **Step 2: Implement `useRowEnter()`**:
  - `const ROW_ENTER_TRANSLATE_Y = 8;` (named constant; the only enter-geometry value).
  - Resolve `const p = selectMotionPreset('listRowEnter', reduceMotionEnabled);` via the existing reduce-motion hook used by `useMotion`.
  - First-appearance gate (recycle-safe): a module-scope `mountedAt = Date.now()` + a short budget (e.g. `ROW_ENTER_WINDOW_MS = 600`); `useRowEnter()` returns the built `entering` ONLY while `Date.now() - mountedAt < ROW_ENTER_WINDOW_MS` AND `p.durationMs > 0`; otherwise returns `undefined` (no entering) so recycled / scrolled-in / reduce-motion rows do NOT animate.
  - Build the `entering` from the resolved preset using reanimated's keyframe/`EntryExitTransition` (or `FadeIn.duration(p.durationMs).easing(resolveEasing(p.easing))` + initial `translateY: ROW_ENTER_TRANSLATE_Y → 0`), reusing the SAME `resolveEasing` token→fn map already in this file (do NOT add a second easing map).
  - Export `useRowEnter`.
- [ ] **Step 3: Gate** — `cd apps/mobile && npx tsc --noEmit` exit 0; `npx expo lint` exit 0.

**Verification:** tsc 0, lint 0; `git grep -nE "Easing\.|withTiming|withSpring|duration:" apps/mobile/src/design/useMotion.ts` shows only the sanctioned boundary uses (no new ad-hoc site); no second easing map introduced.

---

## Task 3: `TransactionRow` editorial polish + recycle-safe list-enter

**Files:** Modify `apps/mobile/src/features/transactions/TransactionRow.tsx`

Depends on: Task 2 (`useRowEnter`), Design-Sync Checkpoint cleared.

- [ ] **Step 1:** Apply the design-sync drift list (palette + structure) for the row: hairline bottom separator (token color/alpha matching HTML row hairline, e.g. `COLORS.textMuted` low-alpha — value confirmed at checkpoint), merchant/category-meta/amount typographic hierarchy and spacing rhythm per HTML 205–256. Tokens only — no hardcoded hex, no inline color objects (CLAUDE.md §Design).
- [ ] **Step 2:** Wrap the foreground row in the `useRowEnter()` entering (apply to the existing `Animated.View`; keep the swipe `useAnimatedStyle`/gesture intact — the enter is additive, the gesture transform is unchanged). Recycle-safe by Task 2 design.
- [ ] **Step 3:** Confirm the swipe-reveal, `accessibilityActions` recategorize, row-tap detail nav, and `numberOfLines`/`allowFontScaling` are all preserved (no behavior regression — visual + enter only).
- [ ] **Step 4: Gate** — tsc 0, lint 0.

**Verification:** tsc 0, lint 0; no banned hex / inline-style hex (`git grep` token guard, Task 7); swipe + a11y unchanged (code review); enter wired through `useRowEnter` only (no `withTiming`/`Easing` literal added).

---

## Task 4: `DateHeader` hairline editorial pass

**Files:** Modify `apps/mobile/src/features/transactions/DateHeader.tsx`

Depends on: Design-Sync Checkpoint cleared.

- [ ] **Step 1:** Match HTML 205–256 sticky date-header: eyebrow-style uppercase label (Manrope `TYPE.uiMeta`/`uiLabel` per checkpoint), hairline weight + alpha + vertical rhythm; subtotal stays tabular-nums `COLORS.textSecondary`. Replace the current `'33'` alpha-suffix hack only if the checkpoint specifies a different hairline weight — keep token-driven (no literal hex; if an alpha is needed use the project's sanctioned pattern, not a magic suffix in a new place).
- [ ] **Step 2:** Preserve i18n Today/Yesterday swap, `accessibilityRole="header"`, `accessibilityLabel`, `allowFontScaling`.
- [ ] **Step 3: Gate** — tsc 0, lint 0.

**Verification:** tsc 0, lint 0; visual matches checkpoint target; a11y/i18n unchanged.

---

## Task 5: `FilterPillsRow` polish + `transactions.tsx` rhythm + header-seam fix

**Files:** Modify `apps/mobile/src/features/transactions/FilterPillsRow.tsx`, `apps/mobile/app/(tabs)/transactions.tsx`

Depends on: Design-Sync Checkpoint cleared.

- [ ] **Step 1 (FilterPillsRow):** Editorial pill rhythm — spacing/height/typography to HTML; no behavior change (`isEmptyFilter` hide, axis dismiss, ordering all preserved). Tokens only.
- [ ] **Step 2 (transactions.tsx — header two-tone-seam fix, design-sync defect #1):** Make the status-bar safe-area region and the header band one continuous color region from the top edge through the eyebrow (no visible seam), matching the dashboard fix already shipped in W2 and HTML 205–256. Adjust the `SafeAreaView`/`Stack.Screen` header treatment so the safe-area fill == header fill == screen top region; no `COLORS.*` value change. Verify the empty-state and error-banner branches still render correctly under the new header treatment.
- [ ] **Step 3 (transactions.tsx — rhythm):** Editorial spacing/rhythm pass on the screen composition (list/section gaps, empty-state spacing) per checkpoint. Tokens only; do not alter FlashList `keyExtractor`/`getItemType`/`stickyHeaderIndices` (recycler identity contract — comment at `transactions.tsx:137`).
- [ ] **Step 4: Gate** — tsc 0, lint 0.

**Verification:** tsc 0, lint 0; header-seam gone (device-UAT Task 7 + checkpoint screenshot); filter behavior unchanged; FlashList recycler props untouched.

---

## Task 6: Retire `MonthSwiper` ad-hoc pan-snap literal (W2 carry-forward debt)

**Files:** Modify `apps/mobile/src/features/dashboard/MonthSwiper.tsx`

Depends on: Task 2 boundary present (uses existing `withMotion`).

- [ ] **Step 1:** Replace `translateX.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) });` (lines ~100–103) with the governed boundary: `withMotion(0, 'fabReveal')` via the existing `useMotion()` hook (resolve `withMotion` at component top, call in the `onEnd` worklet per the boundary's existing worklet-safe usage in W2 — match how `DonutChart`/`MonthlyTotalHero` call `withMotion` inside reactions/handlers; do NOT introduce a new pattern).
- [ ] **Step 2:** Remove now-unused `Easing` and `withTiming` from the `react-native-reanimated` import; keep `runOnJS`/`useAnimatedStyle`/`useSharedValue`/`Animated`. Update the header doc comment line ("withTiming snap, 250ms Easing.out(Easing.quad)") to reference the `fabReveal` vocabulary preset instead.
- [ ] **Step 3:** Confirm pan threshold, `runOnJS(applyDelta)`, chevron bounds, `accessibilityRole="adjustable"` actions all unchanged (snap timing change only).
- [ ] **Step 4: Gate** — tsc 0, lint 0.

**Verification:** tsc 0, lint 0; `git grep -nE "Easing\.|withTiming" apps/mobile/src/features/dashboard/MonthSwiper.tsx` → no matches (debt cleared); STATE.md W2 carry-forward line can be marked resolved (Task 7).

---

## Task 7: Wave 3 verification gate + device-UAT (batched) + state

**Files:** Create `.planning/phases/redesign/W3-DEVICE-UAT.md`; Modify `.planning/STATE.md`; Modify `.planning/ROADMAP.md` + `.planning/PROJECT.md` if they carry a redesign-wave checklist (verify before editing — do not invent rows).

- [ ] **Step 1: Full per-wave gate (spec §4, ordered, stop at first failure, report verbatim)** from `apps/mobile`:
  1. `npx tsc --noEmit` → exit 0
  2. `npx expo lint` → exit 0
  3. `npm test` → ≥164 pass, exit 0 (report pass count)
  4. `npx expo export --platform ios` → exit 0
- [ ] **Step 2: Token / motion governance grep (R6), scoped to W3-touched files:**
  - No banned hex / inline hex in `TransactionRow.tsx`, `DateHeader.tsx`, `FilterPillsRow.tsx`, `transactions.tsx` (CLAUDE.md banned list).
  - `git grep -nE "withTiming|withSpring|Easing\.|duration:" -- apps/mobile/src/features/transactions/ apps/mobile/src/features/dashboard/MonthSwiper.tsx` → only sanctioned (none new; MonthSwiper clean).
- [ ] **Step 3: Author `W3-DEVICE-UAT.md`** — checklist appended to the **W1+W2 batched TestFlight build** checkpoint (NOT a separate build, user decision 2026-05-19): (a) row-enter fires once on initial list paint, NOT on fast scroll / recycle; (b) reduce-motion ON → rows appear instantly, no rise/fade; (c) hairline date-header rhythm reads editorial; (d) no header two-tone seam on Activity screen (top edge → eyebrow one region); (e) MonthSwiper label snap-back feels equivalent to pre-change (no regression); (f) list scroll stays smooth (R3 numeric budget deferred to Wave 6). Cross-link from `W1-DEVICE-UAT.md`/`W2-DEVICE-UAT.md` build checkpoint.
- [ ] **Step 4: Update `.planning/STATE.md`** — Wave 3 CODE complete; device-UAT batched into W1+W2 build; mark the W2 "MonthSwiper pan-snap ad-hoc 250ms" carry-forward **RESOLVED (W3 Task 6)**.
- [ ] **Step 5: Commit** — atomic conventional commits, one per task bucket (T1 pure preset, T2 boundary, T3 row, T4 date-header, T5 pills+screen+seam, T6 monthswiper-debt, T7 state+uat), or grouped per the executing-plans skill. Never `--no-verify`. Forward-only on `main` (solo, per CLAUDE.md).

**Wave 3 done = all of:** spec §4 gate 4/4 green; governance grep clean; design-sync drift either resolved or explicitly user-accepted; `W3-DEVICE-UAT.md` authored + linked into the W1+W2 build checkpoint; STATE.md updated + W2 carry-forward closed. Device confirmation itself is deferred (batched), so Wave 3 is `[~]` (code-complete) until the batched build is run on device — same convention as W1/W2.

---

## Risks specific to Wave 3

| Risk | Mitigation |
|---|---|
| FlashList v2 recycle re-fires the row `entering` → scroll jank / wrong motion | First-appearance time-window gate in `useRowEnter()` (Task 2); device-UAT (f)/(a) explicitly checks fast-scroll has no enter; if the time-gate proves leaky on device, fall back to disabling the enter entirely (subtle is optional; correctness is not) — recorded as the device-UAT exit branch |
| Header-seam fix touches shared SafeArea/header treatment → could regress other screens | W3 edits only `transactions.tsx`'s own header treatment (screen-local), mirroring the already-shipped W2 dashboard fix; no shared chrome component changed; empty/error branches re-verified (Task 5 Step 2) |
| `fabReveal` reuse for MonthSwiper feels different from the old 250ms quad | 220ms vs 250ms + outCubic vs outQuad are imperceptible for a label snap-back; device-UAT (e) is the explicit check; if rejected, the fallback is a dedicated governed `monthSnap` preset (additive, same pattern as Task 1) — not an ad-hoc literal |
| Design-sync drift large (HTML newer/older than impl) | Checkpoint STOPs for user; per `design-sync-local-authority` spec the HTML is authority and drift is surfaced not silently fixed; user decides target before Task 3/4 |
