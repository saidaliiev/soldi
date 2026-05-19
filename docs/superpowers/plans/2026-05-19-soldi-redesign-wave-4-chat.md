# SOLDI Redesign — Wave 4 (Chat: Editorial Bubbles + Sheet Glass + Spring) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans, task-by-task. Steps use `- [ ]` checkboxes.

**Goal:** Bring the Chat surface to the premium bar (spec §3 Wave 4): editorial chat bubbles (EB Garamond), governed `ChatMiniChart` + bubble enter motion (retire 12 ad-hoc literals across chat), the `ChatBottomSheet` warm Liquid-Glass background with its mandatory non-glass fallback, the sheet open/close governed spring (closes the W2/W3 `'spring'` boundary fail-fast), the chat header two-tone-seam fix (design-sync defect #1) — all motion through the `MOTION` vocabulary + `useMotion`/`useMotionSnap` boundary, all glass only via `glass.ts`, reduce-motion + iOS<26 fallback mandatory. Glass is a native module → no Expo-Go real path; device-UAT batched into the W3-5 glass build.

**Architecture:** Mirrors Wave 1 (glass: pure decision in `glass.ts` + thin `expo-glass-effect` boundary, sole importer) and Wave 2/3 (motion: pure `motion.ts` + the `useMotion` boundary). New work is **additive**:
- `motion.ts`: additive `MOTION.chatBubbleEnter` (governed bubble/element enter, like W3 `listRowEnter`); `MOTION.sheetSpring` already exists ({420ms,'spring'}) — unchanged.
- `motion.ts` `EasingToken` already includes `'spring'`; the boundary just stops throwing on it.
- `useMotion.ts`: extend `resolveEasing`/`withMotion` so `'spring'` resolves via reanimated `withSpring` ({duration, dampingRatio}) instead of throwing; reduce-motion → instant (unchanged contract). No new ad-hoc literals in chat components — they consume `withMotion`/`useMotionSnap`/`useRowEnter`-style hooks only.
- `glass.ts`: additive `resolveSheetChrome(safeGlass)` → a `SheetChrome` union, mirroring `resolveTabBarChrome` exactly (glass branch = `GLASS.sheetTint`/`sheetTintAlpha` regular+interactive; fallback branch = opaque solid + `ELEVATION` shadow). Pure, node-testable. `expo-glass-effect` stays imported ONLY in `glass.ts`'s consumer (`GlassTabBar` precedent); `ChatBottomSheet` consumes the resolved `SheetChrome`, never `expo-glass-effect` directly.

**Hard constraint (CLAUDE.md §Design):** Liquid Glass is allowed on **system chrome / bottom-sheet background ONLY** — NEVER on content. Chat **bubbles, mini-chart, text are content** → flat editorial, never glass/blur. Glass touches only the `ChatBottomSheet` container/backdrop. Text never sits directly on translucency without the solid fallback guaranteeing WCAG (spec §4 R5).

**Tech Stack:** Expo SDK 54, RN 0.81.5, TS 5.9 strict, `node:test`+`tsx` (`src/**/*.test.ts`), `react-native-reanimated@~4.1.x` (`withSpring`), `expo-glass-effect@~0.1.10`, `react-i18next`. Binds to REAL Wave-0/1/2/3 API on `origin/main @ c5b6b3d`: `MOTION`/`selectMotionPreset` (`src/design/motion.ts`), `useMotion`/`useMotionSnap`/`useRowEnter`/`resolveEasing` (`src/design/useMotion.ts`), `glass.ts` (`shouldRenderGlass`/`isSafeToRenderGlass`/`composeGlassTint`/`resolveTabBarChrome`/`ChromeSurface`/`TabBarChrome`), `GLASS.sheetTint`/`sheetTintAlpha`/`fallbackChromeBg`/`ELEVATION` (`tokens.ts`), `TYPE.editorialBody`/`editorialLead` (`typography.ts`).

**Source of truth:** `docs/superpowers/specs/2026-05-17-soldi-premium-redesign-design.md` §3 Wave 4 (line 113-114), §2.1 `sheetSpring`, §2.2 `GLASS.sheet` + the mandatory fallback contract, §4 R1/R2/R5 + per-wave gate. Design-sync authority: `docs/design/soldify-screens.html` CHAT section lines 400-446 (Slate & Sand) per `docs/superpowers/specs/2026-05-18-design-sync-local-authority.md`; header-seam defect #1 is an explicit W4 task; the "user screenshots may supersede HTML" caveat — surface at the checkpoint, do not edit the HTML.

**Sequencing constraint (read first):** Wave 4 introduces a **new native glass surface** (the sheet). Local gates (tsc/lint/test/expo-export) run here; the real glass path is **not runnable in Expo Go** (R2) → device-UAT is authored here and **batched into the W3-5 glass EAS build** (spec §3 "batch Wave 3–5 → build"; W3 itself rode the W1+W2 build as pure RN, so this build is effectively W4+W5 glass), sequenced AFTER TestFlight build #6 (`eas-build-quota`). R1 pre-build gate: `eas.json` testflight `image` must be Xcode-26 (already set `image=latest` in W1 — re-verify at build time, do NOT rebuild here). R5: glass restricted to sheet chrome, never bubble text; `contrast.test` fallback pairs assertion extended if a new glass-fallback fg/bg pair is introduced.

**Working directory:** `apps/mobile/...` paths relative to repo root `/home/iskan/projects/soldify`. Run `npm`/`tsc`/`lint`/`expo`/`git` from `apps/mobile`. `npm test` glob = `src/**/*.test.ts` (node:test+tsx); pure design/feature modules testable, RN/reanimated/glass boundary + screen files NOT (gate + device-UAT, same as W1/2/3).

---

## File Structure (decomposition locked here)

| File | Responsibility | Wave 4 action |
|---|---|---|
| `src/design/motion.ts` | Pure motion vocabulary | Modify — append `MOTION.chatBubbleEnter` (+ a `dampingRatio` constant for the `'spring'` resolution); W0-3 entries/types untouched |
| `src/design/motion.test.ts` | Pure motion guard | Modify — extend coverage to `chatBubbleEnter`; assert `sheetSpring` resolves (no throw expectation) |
| `src/design/useMotion.ts` | Sole reanimated boundary | Modify — `resolveEasing`/`withMotion` handle `'spring'` via `withSpring({duration,dampingRatio})` (remove the W2 fail-fast throw); reduce-motion path unchanged; existing exports intact |
| `src/design/glass.ts` | Pure glass decision (node-safe) | Modify — additive `resolveSheetChrome(safeGlass)` → `SheetChrome` union, mirroring `resolveTabBarChrome`; W1 helpers untouched |
| `src/design/glass.test.ts` | Pure glass guard | Modify — `resolveSheetChrome` both branches (glass + fallback) asserted |
| `src/design/contrast.test.ts` | WCAG pairs | Modify ONLY if a new glass-fallback fg/bg pair is introduced (assert AA) |
| `src/features/chat/ChatBottomSheet.tsx` | Chat sheet container | Modify — warm-glass background via `resolveSheetChrome` + mandatory solid fallback; open/close via governed spring (`useMotionSnap`/`withMotion` `sheetSpring`); NO glass on content; header-seam continuous fill |
| `src/features/chat/ChatBubbleUser.tsx` | User bubble | Modify — editorial typography (TYPE.editorial*); ad-hoc `withTiming` (l.44-45,63) → governed `chatBubbleEnter` |
| `src/features/chat/ChatBubbleAssistant.tsx` | AI bubble | Modify — editorial typography; ad-hoc literals (l.50-51,69) → governed |
| `src/features/chat/ChatBubbleAssistantTyping.tsx` | Typing indicator | Modify — ad-hoc literals (l.41-42) → governed |
| `src/features/chat/ChatMiniChart.tsx` | In-bubble chart | Modify — governed reveal motion (spec §3 "ChatMiniChart motion"); flat content (no glass) |
| `src/features/chat/ChatInputRow.tsx` | Composer row | Modify — editorial/UI polish to HTML input-sheet; ad-hoc press literals (l.178,182) → governed |
| `src/features/chat/ChatEmptyState.tsx` | Empty state | Modify — ad-hoc literals (l.41,45) → governed |
| `src/features/chat/ChatErrorBanner.tsx` | Error banner | Modify — ad-hoc literals (l.50-51,53-54) → governed |
| `.planning/phases/redesign/W4-DEVICE-UAT.md` | Deferred device-UAT | Create — batched into the W3-5 glass build (iOS26 glass path + iOS<26 fallback matrix) |
| `.planning/STATE.md` | Planning state | Modify — W4 code-complete; `'spring'` boundary gap closed; device-UAT batched |
| `docs/design/soldify-screens.html` | Design authority | Read-only (checkpoint) — surface drift, never edit |

**Out of Wave 4 scope (do NOT touch):**
- `ChatLaunchFAB.tsx` — Wave 2 component (its `withSpring` l.61 is W2-owned, not W4 debt).
- Real AI data / Edge Function / eval — gated on P0 #5/#6 (Supabase/Anthropic); W4 is visual polish only, independent (spec §3).
- `RecategorizeBottomSheet` (in `features/transactions/`) — its glass background is Wave 5 secondary-sweep, NOT W4 (W4 sheet = `ChatBottomSheet` only). Recorded to fix placement.
- The glass EAS build itself; Categories/Jars/Onboarding/Settings (Wave 5); perf budget ≥58fps (Wave 6).
- Pre-existing ad-hoc literals OUTSIDE chat — later waves. R6 governance grep scoped to W4-touched chat files only.

**Key design decisions (locked, with citations):**
- **`'spring'` encoding (spec §2.1 `sheetSpring`).** `MotionPreset` stays `{durationMs,easing}`. `'spring'` resolves in the boundary to reanimated `withSpring({ duration: preset.durationMs, dampingRatio: SHEET_DAMPING_RATIO })` (reanimated v4 duration-based spring) — one governed `dampingRatio` constant in `motion.ts`, no `damping/stiffness` literals in components. Removes the W2 fail-fast throw (its "lands Wave 4" message is now satisfied). reduce-motion → instant set (same contract as timing).
- **Glass = sheet chrome ONLY, fallback mandatory (spec §2.2, CLAUDE.md).** `ChatBottomSheet`'s container/backdrop is the only glass surface. Bubbles/mini-chart/text are flat editorial content — explicitly never glass (CLAUDE.md banned: glass on chat bubbles). `resolveSheetChrome` returns a discriminated union; `isLiquidGlassAvailable()===false` → opaque solid `GLASS.fallbackChromeBg`-class fill + `ELEVATION` shadow (premium, not transparent). Both paths designed; `expo-glass-effect` stays a `glass.ts`-only import.
- **Bubbles editorial (CLAUDE.md typography rule).** Chat bubbles + long-form insight use `TYPE.editorialBody`/`editorialLead` (EB Garamond) — never Manrope. Meta/timestamps stay `TYPE.uiMeta`.
- **One governed bubble-enter preset.** `MOTION.chatBubbleEnter` replaces the scattered 250/150/300/200ms `withTiming` literals across the 6 chat files (additive, same pattern as W3 `listRowEnter`). Distinct durations collapse to one governed enter unless the checkpoint says otherwise.
- **Header seam = continuous fill (defect #1).** Chat header (spark mark + "Soldify" + online badge) one continuous color region top→header, mirroring the shipped W2 dashboard / W3 transactions fix. Palette-agnostic, no `COLORS` value change.
- **Design-sync = drift surfacing.** Checkpoint vs `soldify-screens.html:400-446` (structure + palette, Slate & Sand). HTML not edited; user screenshots-supersede-HTML caveat surfaced for a ruling.

---

## Design-Sync Checkpoint (gate — before Task 3/4/5, STOP for user)

1. Read `soldify-screens.html:400-446` (CHAT section).
2. Read impl: `ChatBottomSheet.tsx`, `ChatBubbleUser/Assistant/AssistantTyping.tsx`, `ChatMiniChart.tsx`, `ChatInputRow.tsx`, header area.
3. Compare (structure + palette, both in scope post Slate & Sand): header continuity/no-seam + mark/title/online-badge, bubble shape/typography (editorial) for user vs AI, mini-chart treatment, input-row sheet (pill height, send button gradient), sheet glass vs the design's blur, spacing rhythm.
4. Drift list. **STOP** — user confirms target (incl. the screenshots-supersede-HTML caveat) before Task 3/4/5. Do NOT edit the HTML.

### Checkpoint RESOLVED — 2026-05-19 (user decisions, locked)

Architecture reality found: `ChatBottomSheet` uses the **shared** `src/components/BottomSheet/BottomSheetPrimitive.tsx` (4 consumers: Chat + Recategorize + JarCreate + CategoryEditor; the latter 3 are W5-scope). Primitive hardcodes `styles.sheet.backgroundColor: COLORS.surface`, `overflow:hidden`, no glass/bg slot; owns open/close motion with ad-hoc literals; it is a `Modal` (no status-bar seam). Caveat (screenshots-supersede-HTML) is dashboard/activity-only — chat authority = HTML, no ambiguity. Chat bubbles/typing/KPI already match authority (editorial typography correct) — T4 is governance-only.

1. **Sheet glass → opt-in prop on the shared primitive.** Add an OPTIONAL glass-surface prop to `BottomSheetPrimitive` (default = current solid `COLORS.surface`; W5 sheets pass nothing → byte-unchanged). `ChatBottomSheet` opts in: passes `resolveSheetChrome(isSafeToRenderGlass(api,avail))`; glass branch renders the W1 GlassView pattern, fallback = solid+`SHADOWS.modal` (mandatory). The primitive becomes a sanctioned `expo-glass-effect` boundary — reuse GlassTabBar's exact access pattern; gated + fallback non-optional.
2. **Shared-primitive open/close motion → DEFER.** The primitive's ad-hoc `withSpring{damping,stiffness}` / `withTiming 220/200` are NOT chat-specific (4 sheets). W4 governance scope stays chat-files-only. Logged as **shared-primitive motion debt** for a dedicated task (governed via the now-spring-capable boundary from T1). T3 does NOT touch primitive motion. (T1's spring support still correct + needed for that future task.)
3. **ChatInputRow → editorial only, no blur.** 58pt pill + accent-gradient send + spacing to authority; stays SOLID (input is composer-content-ish; glass-on-content banned, CLAUDE.md). Ad-hoc press literals → governed.
4. **ChatMiniChart → keep single-accent.** Governed reveal motion + editorial polish only. Multi-color bars (authority) = **accepted drift** (needs a ChartPayload color-array change — functional, beyond an editorial wave). Logged.

**Revised task deltas:** T3 = add opt-in glass to `BottomSheetPrimitive` + `ChatBottomSheet` opts in + fallback; DROP the seam-fix (N/A) and DROP the governed-spring-open/close (deferred per #2). T4 = pure governance swap (bubbles already editorial-correct) + minor header editorial (spark/online/title) if low-risk else log drift. T5 = ChatMiniChart governed reveal (single-accent), ChatInputRow 58pt+gradient solid, EmptyState/ErrorBanner literal→governed. T6 = gate + W4-UAT (opt-in glass path: iOS26 + fallback matrix; batched W3-5 build) + STATE (W4 code-complete, 'spring' gap closed, + NEW logged debt: shared-primitive motion governance).

---

## Task 1: `'spring'` in the motion boundary + `MOTION.chatBubbleEnter`

**Files:** Modify `motion.ts` (+`dampingRatio` const, +`chatBubbleEnter`), `motion.test.ts`, `useMotion.ts` (spring path).

- [ ] **Step 1 (tests, RED):** append to `motion.test.ts`: `chatBubbleEnter` subtle (≤320ms, `outCubic`) + resolves both modes; `selectMotionPreset('sheetSpring',false)` returns the preset (no throw at the pure layer — the throw was boundary-only).
- [ ] **Step 2:** verify FAIL.
- [ ] **Step 3 (impl):** `motion.ts` — append `chatBubbleEnter:{durationMs:280,easing:'outCubic'}` (after `listRowEnter`) + `export const SHEET_DAMPING_RATIO = 0.82;` (governed spring damping). `useMotion.ts` — `resolveEasing`: delete the `'spring'` `throw`; `withMotion`: when `preset.easing==='spring'` and not reduce-motion, return `withSpring(toValue, { duration: preset.durationMs, dampingRatio: SHEET_DAMPING_RATIO })`; reduce-motion branch unchanged (return `toValue`). Import `withSpring` from reanimated. **context7-verify** reanimated v4.1.x `withSpring` duration/dampingRatio API before writing.
- [ ] **Step 4:** `npm test` all green; `tsc --noEmit` 0.

**Verification:** `npm test` 0 (+new), tsc 0; `git grep "throw" src/design/useMotion.ts` shows the `'spring'` throw gone, the exhaustive `default` guard kept.

## Task 2: Pure `resolveSheetChrome` in `glass.ts`

**Files:** Modify `glass.ts`, `glass.test.ts` (mirror the `resolveTabBarChrome` tests).

- [ ] **Step 1:** Read `glass.ts` in full (bind to the REAL `resolveTabBarChrome`/`isSafeToRenderGlass`/`composeGlassTint`/`TabBarChrome` shapes — do not assume).
- [ ] **Step 2 (tests RED):** `resolveSheetChrome(true)` → `{glass:true, glassEffectStyle:'regular', tintColor: composeGlassTint(GLASS.sheetTint, GLASS.sheetTintAlpha), isInteractive:true}`; `resolveSheetChrome(false)` → `{glass:false, backgroundColor: <opaque sheet fallback>, shadow: ELEVATION.<x>}`. Purity assertion.
- [ ] **Step 3 (impl):** add `SheetChrome` union + `resolveSheetChrome(safeGlass:boolean)`, structurally identical to `resolveTabBarChrome` but sheet tokens. No W1 export changed.
- [ ] **Step 4:** `npm test` green; tsc 0.

**Verification:** npm test 0, tsc 0; `expo-glass-effect` still imported in zero new files (`git grep -l expo-glass-effect`).

## Task 3: `ChatBottomSheet` glass background + governed spring + seam

**Files:** Modify `ChatBottomSheet.tsx`. Depends: T1, T2, checkpoint cleared.

- [ ] Read `ChatBottomSheet.tsx` fully (current open/close anim, backdrop, structure).
- [ ] Background/backdrop: consume `resolveSheetChrome(isSafeToRenderGlass(...))` — glass branch via the SAME `expo-glass-effect` access pattern `GlassTabBar` uses (no direct import here if the precedent centralises it; match the precedent exactly); fallback branch = opaque solid + shadow. Glass ONLY on the sheet container/backdrop — bubbles/content untouched (CLAUDE.md).
- [ ] Open/close motion: replace any ad-hoc sheet timing with the governed spring — `withMotion(target,'sheetSpring')` (JS effect) or `useMotionSnap('sheetSpring')` (gesture/drag-dismiss worklet), whichever matches the existing trigger; reduce-motion → instant.
- [ ] Header-seam: continuous fill top→header (defect #1), mirror W2/W3.
- [ ] Gate: tsc 0, lint 0.

**Verification:** tsc 0, lint 0; glass only on sheet chrome (code review); fallback path present (not optional); no `expo-glass-effect` import added outside the sanctioned site; no ad-hoc motion literal added.

## Task 4: Chat bubbles editorial + governed enter

**Files:** Modify `ChatBubbleUser.tsx`, `ChatBubbleAssistant.tsx`, `ChatBubbleAssistantTyping.tsx`. Depends: T1, checkpoint.

- [ ] Typography → `TYPE.editorialBody`/`editorialLead` (EB Garamond) for bubble body per checkpoint; meta/time stays `TYPE.uiMeta`. No Manrope in bubble body (CLAUDE.md).
- [ ] Replace every ad-hoc `withTiming` (User 44-45,63; Assistant 50-51,69; Typing 41-42) with the governed `chatBubbleEnter` via the `useMotion` boundary (or `useRowEnter`-style if an entering animation fits). Zero `Easing.`/`duration:`/`withTiming` literals remain in these 3 files.
- [ ] Preserve a11y (roles/labels), security (never log message text — CLAUDE.md), bubble alignment user-vs-AI.
- [ ] Gate: tsc 0, lint 0.

**Verification:** tsc 0, lint 0; `git grep -nE "withTiming|Easing\.|duration:" ChatBubble*` → none; bubbles use editorial presets only.

## Task 5: ChatMiniChart motion + ChatInputRow + EmptyState/ErrorBanner governance

**Files:** Modify `ChatMiniChart.tsx`, `ChatInputRow.tsx`, `ChatEmptyState.tsx`, `ChatErrorBanner.tsx`. Depends: T1, checkpoint.

- [ ] `ChatMiniChart`: governed reveal motion (spec §3 "ChatMiniChart motion") via the boundary; flat content (no glass).
- [ ] `ChatInputRow`: editorial/UI polish to the HTML input-sheet (pill, send button); press feedback (l.178,182) → governed.
- [ ] `ChatEmptyState` (l.41,45), `ChatErrorBanner` (l.50-51,53-54): ad-hoc literals → governed presets.
- [ ] Gate: tsc 0, lint 0.

**Verification:** tsc 0, lint 0; `git grep -nE "withTiming|withSpring|Easing\.|duration:" src/features/chat` → only sanctioned (ChatLaunchFAB W2 excluded by note); chat files governance-clean.

## Task 6: Wave 4 gate + batched device-UAT + state

- [ ] **Spec §4 gate (ordered, stop at first fail, verbatim):** `tsc --noEmit` 0 → `expo lint` 0 → `npm test` ≥164/0 → `expo export --platform ios` 0.
- [ ] **R6 governance + R5:** banned/raw hex grep over W4-touched chat files; `git grep` ad-hoc motion in `src/features/chat` clean (ChatLaunchFAB excepted); glass only on sheet chrome (no bubble/content glass); contrast.test green (extended if a new fallback pair added).
- [ ] **Create `.planning/phases/redesign/W4-DEVICE-UAT.md`** — batched into the W3-5 glass EAS build (AFTER TestFlight #6): iOS26 glass sheet path + iOS<26 solid-fallback path matrix; sheet spring open/close + reduce-motion; bubble editorial legibility; header no-seam; mini-chart motion; R5 contrast on the sheet. Cross-link W1/W2/W3 UAT build checkpoint.
- [ ] **STATE.md:** W4 code-complete; `'spring'` boundary gap CLOSED; device-UAT batched (W4 `[~]` until the glass build runs on device).
- [ ] **Commits:** atomic per task bucket; never `--no-verify`; forward-only `main` (solo).

**Wave 4 done = all of:** spec §4 gate 4/4; governance + R5 clean; design-sync drift resolved or user-accepted; `W4-DEVICE-UAT.md` authored + cross-linked; STATE updated + `'spring'` gap closed. Device confirmation deferred (glass build) → Wave 4 `[~]` code-complete, same convention as W1/W2/W3.

---

## Risks specific to Wave 4

| Risk | Mitigation |
|---|---|
| R1: glass needs Xcode-26 EAS image; `expo export` won't catch native mismatch | Pre-build gate (already `image=latest` from W1) re-verified at the W3-5 build; W4 triggers NO build |
| R2: real glass not in Expo Go | Device-UAT on TestFlight only; iOS<26 fallback path is the Expo-Go-testable path; both authored |
| R5: text on translucency fails WCAG | Glass restricted to sheet chrome; bubble/content text never on glass; solid fallback guarantees AA; contrast.test extended if a new pair |
| `withSpring` duration/dampingRatio API differs in reanimated v4 | context7-verify before T1 Step 3 (CLAUDE.md gate); pure dampingRatio constant, reduce-motion instant path unchanged |
| Glass accidentally applied to bubbles (CLAUDE.md banned) | Explicit Task-4/5 constraint + Task-6 review gate: glass ONLY in ChatBottomSheet container; bubbles flat editorial |
| Authority HTML may be stale vs user screenshots | Checkpoint STOPs; surface the caveat; user rules on target before T3/4/5 |
