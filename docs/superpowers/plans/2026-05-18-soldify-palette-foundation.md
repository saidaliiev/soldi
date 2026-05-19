> **SUPERSEDED 2026-05-19 by `docs/superpowers/plans/2026-05-19-soldify-palette-foundation-slate-sand.md` (Slate & Sand).** Oat & Ink was rejected (reads "for women only"). Do not execute this plan.

# Soldify Palette Foundation (Oat & Ink) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current terracotta/sage palette with the WCAG-gated "Oat & Ink" palette in `tokens.ts` so all 8 screens reskin through tokens, with locked contracts re-derived to match.

**Architecture:** Single source of truth is `apps/mobile/src/design/tokens.ts` (`COLORS`/`GLASS`/`GRADIENTS`). `glass.ts` and every screen consume tokens — no component layout/structure changes. The `auditTokenPairs()` WCAG test in `contrast.ts` is the TDD driver: it derives every pair from `COLORS.*`, so the token swap mechanically fails the audit on `textMuted` until the gated value is applied. Two atomic commits (code bucket, docs bucket) per the approved spec.

**Tech Stack:** TypeScript strict, RN+Expo, test harness `node:test` + `tsx` (`npm test`), `expo lint`, `expo export`.

**Authority spec:** `docs/superpowers/specs/2026-05-18-soldify-palette-foundation-design.md`

---

## Commit Discipline (read before starting)

The approved spec (§10) and the user's explicit decision mandate **exactly two commits**, not per-task commits. This deliberately overrides the writing-plans default of committing every task. Tasks 1–4 stage changes; **Task 5 makes Commit 1** (code bucket); **Task 6 makes Commit 2** (docs bucket). Do not commit between tasks 1–4.

Direct-to-`main` (solo, well-scoped — established working style). Do not push; pushing is user-gated.

## Canonical token map (authoritative — used by multiple tasks)

`tokens.ts` current → Oat & Ink:

| key | current | new |
|---|---|---|
| `background` | `#F7F1E8` | `#F2EFE7` |
| `surface` | `#FAF5F0` | `#FBFAF6` |
| `white` | `#FFFFFF` | `#FFFFFF` |
| `textPrimary` | `#2C1810` | `#1F1B16` |
| `textSecondary` | `#7A5C52` | `#6B6258` |
| `textMuted` | `#8A6558` | `#71695E` (WCAG-gated; raw Oat & Ink `#8A8175` fails AA) |
| `accent` | `#BF6F4F` | `#A85C3C` |
| `accentSoft` | `#D9997A` | `#C07A55` |
| `accentDeep` | `#A86147` | `#8C4A30` |
| `sage` | `#7E8B6C` | `#74815C` |
| `sageDark` | `#5C6B4A` | `#5C6B4A` (unchanged) |
| `sageSoft` | `#B5C0A5` | `#9AA585` |
| `sageDeep` | `#7A876A` | `#687653` |
| `error` | `#B85C5C` | `#9E4A3C` |
| `success` | `#7A876A` | `#5C6B4A` |
| `income` | `#7A876A` | `#5C6B4A` |
| `expense` | `#BF6F4F` | `#A85C3C` |
| `GRADIENTS.primary` | `['#D9997A','#C97B5C']` | `['#C07A55','#A85C3C']` |
| `GRADIENTS.warm` | `['#F2D5C5','#D9A994']` | `['#EDE6D9','#D9B79E']` |
| `GRADIENTS.hero` | `['#F7F1E8','#F0E6D8']` | `['#F2EFE7','#E9E4D7']` |
| `GRADIENTS.sage` | `['#B5C0A5','#9DA88C']` | `['#9AA585','#74815C']` |
| `GRADIENTS.dark` | `['#2E1F1F','#4A2E2E','#3D2626']` | unchanged (out of scope) |
| `GLASS.chromeTint` | `#FAF5F0` | `#FBFAF6` |
| `GLASS.sheetTint` | `#F7F1E8` | `#F2EFE7` |
| `GLASS.fallbackChromeBg` | `#FAF5F0` | `#FBFAF6` |
| `GLASS.chromeTintAlpha` / `sheetTintAlpha` | `0.62` / `0.55` | unchanged |

**Legacy-hex residue replacement map** (for hardcoded literals in non-token files — Task 4):

| legacy literal | replace with | meaning |
|---|---|---|
| `rgba(201, 123, 92, …)` | `rgba(168, 92, 60, …)` | decomposed accent (pre-D-09 #C97B5C → #A85C3C) |
| `#C97B5C` | `#A85C3C` | old accent |
| `#BF6F4F` | `#A85C3C` | current accent |
| `#D9997A` | `#C07A55` | accentSoft |
| `#A86147` | `#8C4A30` | accentDeep |
| `#B8968A` | `#71695E` | pre-D-09 muted (comments only) |
| `#8A6558` | `#71695E` | current muted |
| `#2C1810` | `#1F1B16` | textPrimary |
| `#7A5C52` | `#6B6258` | textSecondary |
| `#9DA88C` | `#74815C` | old sage |
| `#7E8B6C` | `#74815C` | current sage |
| `#7A876A` | `#687653` | sageDeep (or `#5C6B4A` where the value denotes income/success) |
| `#F7F1E8` | `#F2EFE7` | background |
| `#FAF5F0` | `#FBFAF6` | surface |
| `#F0E6D8` | `#E9E4D7` | hero gradient pair |

---

## Task 0: Wave 2 + Checkpoint B completion gate (BLOCKING — no code)

Per spec §8, this work is **planned now but must not execute until Wave 2 motion + Checkpoint B are complete on `main`**. This task is a hard precondition.

**Files:** none (verification only).

- [ ] **Step 1: Check Wave 2 / Checkpoint B status**

Run:
```bash
cd /home/iskan/projects/soldi
grep -niE 'wave 2|checkpoint b' .planning/STATE.md
git log --oneline -20 | grep -iE 'wave 2|checkpoint'
```

- [ ] **Step 2: Decide**

- If STATE.md shows Wave 2 (all tasks + Polish Pass) **and** Checkpoint B complete on `main`: proceed to Task 1.
- If NOT complete (expected at time of writing — Task 7 FAB shipped, later tasks + Checkpoint B pending; Checkpoint B independently blocked on the polluted Open Design "Soldify" project, memory `open-design-soldi-absent`): **STOP. Do not execute Tasks 1–6.** Report to the user that the plan is ready but gated, and that Checkpoint B's OD blocker is a separate decision.

- [ ] **Step 3: Record the gate decision** in the execution log / to the user before continuing. No commit.

---

## Task 1: Swap `COLORS` to Oat & Ink (TDD via WCAG audit)

**Files:**
- Modify: `apps/mobile/src/design/tokens.ts:10-49`
- Test (driver, no edit yet): `apps/mobile/src/design/contrast.test.ts`

- [ ] **Step 1: Run the WCAG audit test to capture the current GREEN baseline**

Run:
```bash
cd /home/iskan/projects/soldi/apps/mobile
npx tsx --test src/design/contrast.test.ts
```
Expected: PASS (current palette already remediated).

- [ ] **Step 2: Apply the new `COLORS` values**

In `apps/mobile/src/design/tokens.ts`, replace the `COLORS` object body (lines 10-49) so every value matches the canonical token map above. Keep all existing keys, types (`as const`), and structure. Replace the existing `textMuted` line and its D-09 comment block (tokens.ts:19-21) with:

```ts
  // Oat & Ink + WCAG gate: raw --muted #8A8175 = 3.34:1 on background
  // (#F2EFE7) / 3.67:1 on surface — WCAG AA body 4.5:1 FAIL.
  // Darkened (hue preserved) to #71695E → 4.70:1 background,
  // 5.18:1 surface. PASS.
  textMuted: '#71695E',
```

Update the other inline remediation comments (accent block tokens.ts:23-28, sage block tokens.ts:30-40) so their cited hexes/ratios reference the Oat & Ink values, not D-09 (#C97B5C/#BF6F4F/#9DA88C). Use the §5 spec ratios: `accent #A85C3C` 4.29:1 bg / 4.72:1 surface (graphic/large policy unchanged); `sage #74815C` graphic-only; `sageDark #5C6B4A` 5.00:1 bg (text-safe, unchanged).

- [ ] **Step 3: Run the audit test — expect it to FAIL on textMuted only if you mistype**

Run:
```bash
cd /home/iskan/projects/soldi/apps/mobile
npx tsx --test src/design/contrast.test.ts
```
Expected: PASS. (The gated `#71695E` clears 4.5:1 on the new `#F2EFE7`/`#FBFAF6`. If you instead applied raw `#8A8175`, the `auditTokenPairs: every entry passes WCAG AA` test FAILS with `FAIL textMuted (#8A8175) on background (#F2EFE7): ratio=3.34 required=4.5` — that is the TDD signal; fix to `#71695E`.)

- [ ] **Step 4: Verify the BANNED_COLORS guard still passes**

Run: same command as Step 3.
Expected: `COLORS: no banned color introduced anywhere in COLORS object` PASS (Oat & Ink contains no banned hex).

- [ ] **Step 5: Do NOT commit.** Continue to Task 2 (Commit 1 is Task 5).

---

## Task 2: Swap `GLASS` + `GRADIENTS` to Oat & Ink

**Files:**
- Modify: `apps/mobile/src/design/tokens.ts:51-57` (`GRADIENTS`), `tokens.ts:131-137` (`GLASS`)

- [ ] **Step 1: Apply `GRADIENTS`**

Replace `tokens.ts:51-57` so values match the canonical map. Final state:

```ts
export const GRADIENTS = {
  primary: ['#C07A55', '#A85C3C'] as const, // CTA buttons, accents
  warm: ['#EDE6D9', '#D9B79E'] as const, // hero overlays
  hero: ['#F2EFE7', '#E9E4D7'] as const, // app shell, welcome
  sage: ['#9AA585', '#74815C'] as const, // success, savings
  dark: ['#2E1F1F', '#4A2E2E', '#3D2626'] as const, // chat dark mode (v1.5) — unchanged, out of scope
} as const;
```

- [ ] **Step 2: Apply `GLASS`**

Replace `tokens.ts:131-137` so values match the canonical map. Final state:

```ts
export const GLASS = {
  chromeTint: '#FBFAF6', // == surface; tab bar / nav wash
  sheetTint: '#F2EFE7', // == background; bottom-sheet wash
  chromeTintAlpha: 0.62, // overlay alpha on native glass (unchanged — HTML has no glass spec)
  sheetTintAlpha: 0.55,
  fallbackChromeBg: '#FBFAF6', // solid fill when isLiquidGlassAvailable() === false
} as const;
```

Do not touch `glass.ts` — it is a pure consumer (spec §4).

- [ ] **Step 3: Typecheck**

Run:
```bash
cd /home/iskan/projects/soldi/apps/mobile
npx tsc --noEmit
```
Expected: exits 0 (no output). `glass.test.ts` fixtures still reference `#FAF5F0`; that is fixed in Task 4 — do not run the full test suite yet.

- [ ] **Step 4: Do NOT commit.** Continue to Task 3.

---

## Task 3: Re-derive the decomposed accent constant in ChatBubbleUser

**Files:**
- Modify: `apps/mobile/src/features/chat/ChatBubbleUser.tsx:27-30`

- [ ] **Step 1: Replace the stale constant + comment**

Current (`ChatBubbleUser.tsx:27-30`):

```ts
// accent @ 12% — derived from COLORS.accent (#C97B5C); rgba avoids hardcoded hex
// The channel values (201, 123, 92) come from COLORS.accent hex decomposition.
// See token reference in design/tokens.ts COLORS.accent.
const ACCENT_12 = 'rgba(201, 123, 92, 0.12)'; // COLORS.accent @ 12% opacity
```

Replace with:

```ts
// accent @ 12% — derived from COLORS.accent (#A85C3C); rgba avoids hardcoded hex
// The channel values (168, 92, 60) come from COLORS.accent hex decomposition.
// See token reference in design/tokens.ts COLORS.accent.
const ACCENT_12 = 'rgba(168, 92, 60, 0.12)'; // COLORS.accent @ 12% opacity
```

- [ ] **Step 2: Typecheck**

Run:
```bash
cd /home/iskan/projects/soldi/apps/mobile
npx tsc --noEmit
```
Expected: exits 0.

- [ ] **Step 3: Do NOT commit.** Continue to Task 4.

---

## Task 4: Mechanical residue sweep (test fixtures + stale comments)

Apply the **legacy-hex residue replacement map** to every hardcoded literal in the files below. These are deterministic literal substitutions — replace each occurrence, then prove correctness with the full test suite.

**Files (exact, from enumeration):**
- Modify: `apps/mobile/src/design/contrast.ts` — comment lines 122, 129, 137, 164 (D-09 narrative → Oat & Ink narrative)
- Modify: `apps/mobile/src/design/contrast.test.ts` — lines 33, 37-38, 45-48 (math-test fixtures)
- Modify: `apps/mobile/src/features/chat/ChatLaunchFAB.tsx` — comment lines 104, 133
- Modify: `apps/mobile/src/components/BottomSheetPrimitive.tsx` — comment line 55
- Modify: `apps/mobile/src/design/glass.test.ts` — fixtures lines 37-51 (`#FAF5F0` → `#FBFAF6`)
- Modify: `apps/mobile/src/features/dashboard/donutArcs.test.ts` — line 19 (`#C97B5C` → `#A85C3C`), line 20 comment (`#B8968A` → `#71695E`)
- Modify: `apps/mobile/src/features/categories/categoryMutations.test.ts` — lines 125, 129, 133, 216, 227, 235, 243, 300, 332, 336, 354 (fixtures: `#C97B5C`→`#A85C3C`, `#A86147`→`#8C4A30`, `#7A5C52`→`#6B6258`)

- [ ] **Step 1: Update `contrast.test.ts` math fixtures**

- Line 33: `assert.strictEqual(contrastRatio('#F7F1E8', '#F7F1E8'), 1);` → `assert.strictEqual(contrastRatio('#F2EFE7', '#F2EFE7'), 1);`
- Lines 37-38: `const a = '#2C1810';` → `const a = '#1F1B16';` ; `const b = '#F7F1E8';` → `const b = '#F2EFE7';`
- Lines 45-48: update the comment + call so it reads `// textPrimary #1F1B16 on background #F2EFE7 — known to be ~15:1` and `const ratio = contrastRatio('#1F1B16', '#F2EFE7');`. Keep the bound assertion `ratio > 14 && ratio < 16` (new value ≈ 14.9 — still in range).

- [ ] **Step 2: Update `glass.test.ts` fixtures**

Replace every `#FAF5F0` literal in lines 37-51 with `#FBFAF6`. If any expected `composeGlassTint` output string embeds the hex (e.g. `#FAF5F0A0`), recompute only the RGB part — keep the existing alpha bytes (alphas unchanged per spec §4).

- [ ] **Step 3: Update remaining test fixtures + comments**

Apply the residue map to `donutArcs.test.ts:19-20`, `categoryMutations.test.ts` (the 11 enumerated lines), `contrast.ts` comments (122/129/137/164), `ChatLaunchFAB.tsx` comments (104/133), `BottomSheetPrimitive.tsx:55`. Comments must describe the Oat & Ink values, not D-09.

- [ ] **Step 4: Run the full test suite**

Run:
```bash
cd /home/iskan/projects/soldi/apps/mobile
npm test
```
Expected: all tests PASS (same count as the pre-change baseline — no new failures, no skipped). If `donutArcs`/`categoryMutations` assert a specific palette hex, the new literal must match the new token value.

- [ ] **Step 5: Residue gate — §6(b) catch-all must be clean**

Run:
```bash
cd /home/iskan/projects/soldi/apps/mobile
grep -rniE '#(C97B5C|BF6F4F|D9997A|A86147|2C1810|7A5C52|8A6558|7E8B6C|7A876A|B5C0A5|9DA88C|B85C5C|F7F1E8|FAF5F0|F0E6D8|F2D5C5|D9A994)' src --include='*.ts' --include='*.tsx' | grep -v 'src/design/tokens.ts' | grep -v 'src/data/.*schema'
```
Expected: **no output**. Any hit (other than `tokens.ts` and the deliberately-deferred `schema.sql.ts`, see Appendix) is unfinished residue — fix it before continuing. If a hit is a legitimate exception, add an inline comment justifying it and note it in the execution log.

- [ ] **Step 6: Do NOT commit.** Continue to Task 5.

---

## Task 5: Full verification gate + Commit 1 (code bucket)

**Files:** none new — commits the staged work from Tasks 1–4.

- [ ] **Step 1: Run the full verification gate in order (stop at first failure)**

```bash
cd /home/iskan/projects/soldi/apps/mobile
npx tsc --noEmit            # expect: exits 0, no output
npx expo lint               # expect: exits 0 (incl. BANNED_COLORS ESLint rule)
npm test                    # expect: all green, baseline count
npx expo export             # expect: bundle completes without error
```
If any step fails, fix within the relevant task's scope and re-run from `tsc`. Do not proceed to commit on any failure.

- [ ] **Step 2: Stage exactly the code-bucket files**

```bash
cd /home/iskan/projects/soldi
git add apps/mobile/src/design/tokens.ts \
        apps/mobile/src/design/contrast.ts \
        apps/mobile/src/design/contrast.test.ts \
        apps/mobile/src/design/glass.test.ts \
        apps/mobile/src/features/chat/ChatBubbleUser.tsx \
        apps/mobile/src/features/chat/ChatLaunchFAB.tsx \
        apps/mobile/src/components/BottomSheetPrimitive.tsx \
        apps/mobile/src/features/dashboard/donutArcs.test.ts \
        apps/mobile/src/features/categories/categoryMutations.test.ts
git status --short
```
Expected: only the listed files staged. No `.planning/` paths in this commit.

- [ ] **Step 3: Commit 1**

```bash
git commit -m "$(cat <<'EOF'
feat(design): Oat & Ink palette foundation

Swap COLORS/GLASS/GRADIENTS in tokens.ts to the Oat & Ink palette
(soldify-screens.html authority). textMuted WCAG-gated #8A8175 →
#71695E (3.34 → 4.70:1). Re-derive ChatBubbleUser decomposed accent
constant; refresh color-asserting tests and stale D-09 comments.
auditTokenPairs() WCAG suite green on the new palette.

Spec: docs/superpowers/specs/2026-05-18-soldify-palette-foundation-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git log --oneline -1
```

---

## Task 6: Re-derive locked contracts + Commit 2 (docs bucket)

**Files:**
- Modify: `.planning/phases/redesign/W1-DEVICE-UAT.md` lines 16, 20, 30
- Modify: `.planning/phases/02-dashboard-transactions-categories/02-UI-SPEC.md` lines 115-127, 139-146, 246-247, 309

- [ ] **Step 1: W1-DEVICE-UAT.md**

- Line 16: `Warm cream tint (#FAF5F0 chromeTint, tintAlpha` → `Warm cream tint (#FBFAF6 chromeTint, tintAlpha`
- Line 20: `accent (#BF6F4F) icon + textPrimary (#2C1810) label` → `accent (#A85C3C) icon + textPrimary (#1F1B16) label`
- Line 30: `solid warm pill (GLASS.fallbackChromeBg #FAF5F0) with the` → `solid warm pill (GLASS.fallbackChromeBg #FBFAF6) with the`

(Spec §7 referenced `#F7F1E8` in this file; enumeration confirms it is NOT present here — only the three edits above. Do not invent a `#F7F1E8` edit.)

- [ ] **Step 2: 02-UI-SPEC.md palette table (lines 115-127)**

Replace the Hex column values with Oat & Ink (the canonical token map). Final rows:

```
| Dominant surface (60%) | `COLORS.background` | `#F2EFE7` | App shell, screen backgrounds, dashboard scroll area |
| Secondary surface (30%) | `COLORS.surface` | `#FBFAF6` | Digest card, bottom sheet background, filter modal background, category editor sheet |
| Primary text | `COLORS.textPrimary` | `#1F1B16` | All body text, merchant names, section labels |
| Secondary text | `COLORS.textSecondary` | `#6B6258` | Date header labels, filter pill text, category chip text, donut center percentage |
| Muted text | `COLORS.textMuted` | `#71695E` | Placeholder text in search input, empty-state sub-copy, "yesterday in money" prefix label |
| Accent (10%) | `COLORS.accent` | `#A85C3C` | Reserved for: expense amounts, sparkline line, active filter pill background, primary CTA button fill, donut slice for top category, selected state on color swatch |
| Accent soft | `COLORS.accentSoft` | `#C07A55` | Gradient pair for CTA buttons, unselected donut slice hover state |
| Accent deep | `COLORS.accentDeep` | `#8C4A30` | Pressed state on CTA buttons, pressed donut slice |
| Sage | `COLORS.sage` | `#74815C` | Income amounts (positive), "money in" category chip |
| Sage soft | `COLORS.sageSoft` | `#9AA585` | Income category donut slice fill |
| Sage deep | `COLORS.sageDeep` | `#687653` | Pressed state on income elements |
| Error / destructive | `COLORS.error` | `#9E4A3C` | Merge confirm modal destructive CTA, delete swipe action reveal background |
| Success | `COLORS.success` | `#5C6B4A` | Confirmation toast after category merge/create |
```

Also update line 133 `**Income color:** \`COLORS.sage\` (\`#9DA88C\`)` → `(\`#74815C\`)`.

- [ ] **Step 3: 02-UI-SPEC.md swatch table (lines 139-146)**

```
| 1 (accent) | `COLORS.accent` | `#A85C3C` |
| 2 (accentSoft) | `COLORS.accentSoft` | `#C07A55` |
| 3 (accentDeep) | `COLORS.accentDeep` | `#8C4A30` |
| 4 (sage) | `COLORS.sage` | `#74815C` |
| 5 (sageSoft) | `COLORS.sageSoft` | `#9AA585` |
| 6 (sageDeep) | `COLORS.sageDeep` | `#687653` |
| 7 (error muted) | `COLORS.error` | `#9E4A3C` |
| 8 (textSecondary) | `COLORS.textSecondary` | `#6B6258` |
```

Lines 246-247, 309 reference tokens by name (`COLORS.accent`, `COLORS.accentDeep`, `COLORS.error`) not hex — no edit needed; verify by reading them and confirm no literal hex.

- [ ] **Step 4: Verify no stale palette hex remains in the two contract docs**

Run:
```bash
cd /home/iskan/projects/soldi
grep -niE '#(C97B5C|BF6F4F|D9997A|A86147|2C1810|7A5C52|8A6558|B8968A|7E8B6C|7A876A|B5C0A5|9DA88C|B85C5C|F7F1E8|FAF5F0)' \
  .planning/phases/redesign/W1-DEVICE-UAT.md \
  .planning/phases/02-dashboard-transactions-categories/02-UI-SPEC.md
```
Expected: no output (banned-colors line 148 of the UI-SPEC contains only `#667EEA` etc., which are not in this grep set, so it stays untouched and produces no hit).

- [ ] **Step 5: Commit 2**

```bash
cd /home/iskan/projects/soldi
git add .planning/phases/redesign/W1-DEVICE-UAT.md \
        .planning/phases/02-dashboard-transactions-categories/02-UI-SPEC.md
git commit -m "$(cat <<'EOF'
docs(redesign): re-derive locked contracts to Oat & Ink

W1-DEVICE-UAT glass-tint + accent/textPrimary acceptance hexes and
Phase 2 UI-SPEC palette/swatch tables updated to the Oat & Ink values.
soldify-screens.html is the authority (spec Q2). Device-UAT not yet
run — criteria updated before the test, no passed gate broken.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git log --oneline -3
```

- [ ] **Step 6: Final state report** — two new commits on `main` (code, docs). Not pushed (user-gated). Report verification outputs verbatim.

---

## Appendix: Known scope gap — category seed colors (DECISION NEEDED, not in this plan)

`apps/mobile/src/data/.../schema.sql.ts:130-147` seeds **18 category color rows** with legacy palette hex. The spec (§2) scopes this work to **design tokens only**; DB seed data is **excluded**. This is a real coupling (seeded categories will render on old hex until reseeded) **but** changing seed rows has migration implications for existing users' data and is a separate decision.

**This plan deliberately does not touch `schema.sql.ts`.** The Task 4 Step 5 residue grep explicitly excludes it. Surface this to the user at execution handoff as a follow-up: "do seeded category colors need a data migration to Oat & Ink, and what happens to users who already customized them?" — that is its own spec/plan.

## Self-Review

- **Spec coverage:** §2 scope (tokens only) → Tasks 1-2; §3 COLORS → Task 1; §4 GLASS/GRADIENTS + propagation → Task 2; §5 WCAG gate (textMuted #71695E, computed, asserted by `auditTokenPairs`) → Task 1; §6 derived constants + residue + grep → Tasks 3-4; §7 contract docs → Task 6; §8 timing gate → Task 0; §9 verification (incl. residue hard gate) → Tasks 4-5; §10 two-commit bucket → Tasks 5-6; §11 risks mitigated across tasks. `schema.sql.ts` gap not in spec → flagged in Appendix (not silently absorbed).
- **Placeholder scan:** all steps have exact paths, exact before/after code, exact commands + expected output. No TBD/TODO.
- **Type consistency:** no new types/functions introduced; `auditTokenPairs()`/`contrastRatio()` referenced exactly as defined in `contrast.ts`; token keys match `tokens.ts` exactly.
