# Soldify Palette Foundation (Slate & Sand) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current terracotta/sage palette with the WCAG-gated "Slate & Sand" palette in `tokens.ts` so all 8 screens reskin through tokens, re-derive the locked contracts + decomposed constants to match, and regenerate the `soldify-screens.html` design authority to Slate & Sand with a cohesive no-seam header.

**Architecture:** Single source of truth is `apps/mobile/src/design/tokens.ts` (`COLORS`/`GLASS`/`GRADIENTS`). `glass.ts` and every screen are pure token consumers — **no component layout/structure/motion changes** (recolor only; Wave 1/2 work preserved). The `auditTokenPairs()` WCAG test in `contrast.ts` is the TDD driver: it derives every pair from `COLORS.*`, so the token swap mechanically fails the audit on `textMuted` unless the gated value is applied. Three atomic commits (code bucket, contract-docs bucket, design-authority bucket).

**Tech Stack:** TypeScript strict, RN+Expo SDK 54, test harness `node:test` + `tsx` (`npm test`), `expo lint`, `expo export`.

**Authority spec:** `docs/superpowers/specs/2026-05-18-soldify-palette-redeclaration-design.md` (Slate & Sand — **Locked**). This plan **supersedes** `docs/superpowers/plans/2026-05-18-soldify-palette-foundation.md` (Oat & Ink — REJECTED) per spec §5.

---

## Commit Discipline (read before starting)

**Exactly three commits**, not per-task — this deliberately overrides the writing-plans default of committing every task (established working style: priority-bucketed commits, clean diff hygiene). Tasks 1–4 stage changes only; **Task 5 makes Commit 1** (code bucket); **Task 6 makes Commit 2** (contract-docs bucket); **Task 7 makes Commit 3** (design-authority bucket: regenerated HTML + supersede markers). Do not commit between tasks 1–4. The third bucket exists because the HTML regen + supersede pointers are a distinct concern (design authority artifact, not app code, not planning contracts) per spec §5's "New Task".

Direct-to-`main` (solo, well-scoped — established working style). Do not push; pushing is user-gated.

## Canonical token map (authoritative — used by Tasks 1, 2, 6)

`tokens.ts` current (live) → Slate & Sand (spec §3). Ratios = computed sRGB relative-luminance, `bg` against `background #EDEAE3`, `surf` against `surface #F7F5F0`.

### COLORS

| key | current | new (Slate & Sand) | bg / surf | policy |
|---|---|---|---|---|
| `background` | `#F7F1E8` | `#EDEAE3` | — | App shell. Status-bar safe area uses header fill (§4), never a separate tone. |
| `surface` | `#FAF5F0` | `#F7F5F0` | — | Cards, sheets, chat answer bubbles, tab-bar tint base. |
| `white` | `#FFFFFF` | `#FFFFFF` | — | On-accent button/FAB text + icon only. |
| `textPrimary` | `#2C1810` | `#221F1B` | 13.66 / 15.06 | All primary text, hero numerals (Oswald). |
| `textSecondary` | `#7A5C52` | `#6A645A` | 4.88 / 5.38 | Secondary/meta text — body-safe. |
| `textMuted` | `#8A6558` | `#6E695F` | 4.54 / 5.01 | **GATED** from raw `#8A8478` (3.09 — FAIL). Hue preserved (warm grey). **Hard WCAG-AA floor — 4.54 has no headroom by design**; Task 5 MUST assert `≥4.5`. Do NOT darken `textMuted` alone (collapses the Δ0.34 step vs `textSecondary`). |
| `accent` | `#BF6F4F` | `#9C5B41` | 4.38 / 4.84 | **Graphic + large-text only**: donut arc, chips, icon strokes, OR display text ≥24px regular / ≥18.66px (14pt) bold. NEVER body/normal text. |
| `accentSoft` | `#D9997A` | `#B97A5A` | 2.92 / 3.22 | **Decorative only** — gradient stop / fill. Never text, never sole indicator. |
| `accentDeep` | `#A86147` | `#7C4632` | 6.29 / 6.94 | Text-safe clay: hero `−€` numerals, expense amounts, accent-colored body/label text, button-on-light. |
| `sage` | `#7E8B6C` | `#687653` | 4.06 / 4.48 | Positive **graphic** (donut/chart), `success`/`income` graphic. |
| `sageDark` | `#5C6B4A` | `#586A45` | 4.91 / 5.41 | Text-safe positive: income/positive amount text, "● online", positive deltas. |
| `sageSoft` | `#B5C0A5` | `#9AA585` | 2.16 / 2.38 | **Decorative fill ONLY** — secondary chart segment, chip bg. Never text, never sole/contrast-bearing indicator. |
| `sageDeep` | `#7A876A` | `#4F5C3C` | 5.97 / 6.58 | Positive on dark surfaces / deep emphasis. |
| `error` | `#B85C5C` | `#97463A` | 5.37 / 5.92 | Error text + destructive — body-safe. |
| `success` | `#7A876A` | `#586A45` | 4.91 / 5.41 | = `sageDark` (text contexts: amounts/badges are text). |
| `income` | `#7A876A` | `#586A45` | 4.91 / 5.41 | = `sageDark`. |
| `expense` | `#BF6F4F` | `#7C4632` | 6.29 / 6.94 | = `accentDeep` (amounts are text — must be body-safe; do NOT use `accent`). |

**Critical policy split (spec §3):** amount/label **text** binds `accentDeep`/`sageDark` (body-safe); donut/chart **strokes** use `accent`/`sage`/`accentSoft`/`sageSoft`. The HTML lists amounts with `var(--accent)`; code must not.

**Enforcement gap (spec §3 / §7.3 — state in Task 5 notes):** the `accent` large-text rule (≥24px reg / ≥18.66px bold) is **not grep-enforceable**. Acceptance #3 grep catches `accent` bound to a body-text token role by name only; sub-large-text `accent` usage is design-review-only, NOT CI-covered. Do not claim the grep covers it.

### GRADIENTS (tuples)

| key | current | new (Slate & Sand) |
|---|---|---|
| `primary` | `['#D9997A','#C97B5C']` | `['#B97A5A','#9C5B41']` (white text on it = 5.27:1 ✓) |
| `warm` | `['#F2D5C5','#D9A994']` | `['#E6E1D4','#D9D2C0']` |
| `hero` | `['#F7F1E8','#F0E6D8']` | `['#EDEAE3','#E2DDD0']` |
| `sage` | `['#B5C0A5','#9DA88C']` | `['#9AA585','#788566']` |
| `dark` | `['#2E1F1F','#4A2E2E','#3D2626']` | `['#2A2622','#3A332C','#322B25']` (spec §3 lists explicit new stops; dark-mode *theme* stays future per §6, but the token *value* is in the locked map) |

### GLASS

| key | current | new (Slate & Sand) |
|---|---|---|
| `chromeTint` | `#FAF5F0` | `#F7F5F0` (= `surface`) |
| `sheetTint` | `#F7F1E8` | `#EDEAE3` (= `background`) |
| `chromeTintAlpha` | `0.62` | `0.62` (unchanged — spec §3) |
| `sheetTintAlpha` | `0.55` | `0.55` (unchanged — spec §3) |
| `fallbackChromeBg` | `#FAF5F0` | `#F7F5F0` |

`BANNED_COLORS` unchanged (`#667EEA #8B7AB8 #E8E0FF #10B981 #1A73E8 #2563EB`) — no Slate & Sand value collides (spec §3).

### Legacy-hex residue replacement map (Task 4 — hardcoded literals in non-token files)

| legacy literal | replace with | meaning |
|---|---|---|
| `rgba(201, 123, 92, …)` | `rgba(156, 91, 65, …)` | decomposed accent (pre-D-09 #C97B5C → #9C5B41) |
| `#C97B5C` | `#9C5B41` | old accent |
| `#BF6F4F` | `#9C5B41` | current accent |
| `#D9997A` | `#B97A5A` | accentSoft |
| `#A86147` | `#7C4632` | accentDeep |
| `#B8968A` | `#6E695F` | pre-D-09 muted (comments only) |
| `#8A6558` | `#6E695F` | current muted |
| `#2C1810` | `#221F1B` | textPrimary |
| `#7A5C52` | `#6A645A` | textSecondary |
| `#9DA88C` | `#687653` | old sage |
| `#7E8B6C` | `#687653` | current sage |
| `#7A876A` | `#4F5C3C` (sageDeep) **or** `#586A45` where the value denotes income/success | sageDeep / income |
| `#5C6B4A` | `#586A45` | current sageDark/success/income |
| `#B85C5C` | `#97463A` | current error |
| `#B5C0A5` | `#9AA585` | current sageSoft |
| `#F7F1E8` | `#EDEAE3` | background |
| `#FAF5F0` | `#F7F5F0` | surface |
| `#F0E6D8` | `#E2DDD0` | hero gradient pair |

---

## Task 0: Wave 2 + Checkpoint B completion gate (verify — SATISFIED)

Per the superseded plan's gate, the palette swap must not execute until Wave 2 motion + Checkpoint B are complete on `main`. **At time of this rebuild that gate is SATISFIED** — verify, record, proceed (no longer a STOP).

**Files:** none (verification only).

- [ ] **Step 1: Confirm gate evidence on `main`**

```bash
cd /home/iskan/projects/soldi
git log --oneline -15 | grep -iE 'wave 2|checkpoint|polish pass'
grep -niE 'wave 2|checkpoint b' .planning/STATE.md | tail -5
```
Expected to find: `314c31c polish(dashboard): ... (Wave 2 Polish Pass)`, `583838f ... sharedMonth carry ... (Wave 2 Task 8)`, `17f878c ... Wave 2 code complete ...`, `da39ce6 docs(plan): resolve Wave 2 Checkpoint A/B — OD bypass → local-HTML authority`, and the STATE line `2026-05-17: Redesign Wave 2 (dashboard hero kinetic) CODE complete ...`.

- [ ] **Step 2: Decide**

- Wave 2 (all tasks 1–10 incl. Polish Pass) complete on `main` ✓ (`314c31c`, pushed) AND Checkpoint B resolved ✓ (`da39ce6`, OD bypass → local-HTML authority). **Gate SATISFIED → proceed to Task 1.**
- If (unexpectedly) the grep does not show the above: STOP and report — do not execute Tasks 1–7.

- [ ] **Step 3: Record the gate decision** in the execution log (one line: "Task 0 gate SATISFIED — Wave 2 @314c31c + CkptB @da39ce6 on main"). No commit.

---

## Task 1: Swap `COLORS` to Slate & Sand (TDD via WCAG audit)

**Files:**
- Modify: `apps/mobile/src/design/tokens.ts` (the `COLORS` object — currently ~lines 10-49; locate by the `export const COLORS` declaration, do not trust line numbers blindly)
- Driver (no edit): `apps/mobile/src/design/contrast.test.ts`

- [ ] **Step 1: Capture the current GREEN baseline**

```bash
cd /home/iskan/projects/soldi/apps/mobile
npx tsx --test src/design/contrast.test.ts
```
Expected: PASS (current live palette is already WCAG-remediated). Record the test count.

- [ ] **Step 2: Apply the new `COLORS` values**

In `apps/mobile/src/design/tokens.ts`, replace every value in the `COLORS` object to match the **COLORS** canonical map above. Keep all 17 keys, the `as const`, and object structure byte-identical except the hex strings. Replace the existing `textMuted` line + its D-09 remediation comment block with exactly:

```ts
  // Slate & Sand + WCAG gate: raw --muted #8A8478 = 3.09:1 on
  // background (#EDEAE3) — WCAG AA body 4.5:1 FAIL. Darkened
  // (warm-grey hue preserved) to #6E695F → 4.54:1 background,
  // 5.01:1 surface. PASS. Hard AA floor: no headroom by design —
  // do NOT darken textMuted alone (collapses the step vs
  // textSecondary 4.88). contrast.ts auditTokenPairs asserts ≥4.5.
  textMuted: '#6E695F',
```

Update the other inline remediation comments (the `accent` block and `sage` block) so cited hexes/ratios reference Slate & Sand, not D-09: `accent #9C5B41` 4.38:1 bg / 4.84:1 surf (graphic + large-text-only policy); `accentDeep #7C4632` 6.29:1 bg (text-safe); `sage #687653` 4.06:1 bg (graphic); `sageDark #586A45` 4.91:1 bg (text-safe). Do not invent ratios — use the table above verbatim.

- [ ] **Step 3: Run the audit — expect PASS**

```bash
cd /home/iskan/projects/soldi/apps/mobile
npx tsx --test src/design/contrast.test.ts
```
Expected: PASS. The gated `#6E695F` clears 4.5:1 on `#EDEAE3`/`#F7F5F0`. **TDD signal:** if you mistakenly applied raw `#8A8478`, `auditTokenPairs: every entry passes WCAG AA` FAILS with `FAIL textMuted (#8A8478) on background (#EDEAE3): ratio=3.09 required=4.5` — fix to `#6E695F`.

- [ ] **Step 4: Verify BANNED_COLORS guard still passes**

Same command as Step 3. Expected: `COLORS: no banned color introduced anywhere in COLORS object` PASS (no Slate & Sand hex is in `BANNED_COLORS`).

- [ ] **Step 5: Do NOT commit.** Continue to Task 2.

---

## Task 2: Swap `GLASS` + `GRADIENTS` to Slate & Sand

**Files:**
- Modify: `apps/mobile/src/design/tokens.ts` (`GRADIENTS` object + `GLASS` object — locate by `export const GRADIENTS` / `export const GLASS`)

- [ ] **Step 1: Apply `GRADIENTS`** — final state:

```ts
export const GRADIENTS = {
  primary: ['#B97A5A', '#9C5B41'] as const, // CTA, FAB, send button — white text 5.27:1
  warm: ['#E6E1D4', '#D9D2C0'] as const, // header hero band (cohesive top region)
  hero: ['#EDEAE3', '#E2DDD0'] as const, // subtle full-bleed hero background
  sage: ['#9AA585', '#788566'] as const, // positive decorative sweep
  dark: ['#2A2622', '#3A332C', '#322B25'] as const, // dark surfaces (dark-mode theme = future milestone; token value per spec §3)
} as const;
```

- [ ] **Step 2: Apply `GLASS`** — final state:

```ts
export const GLASS = {
  chromeTint: '#F7F5F0', // == surface; tab bar / nav wash
  sheetTint: '#EDEAE3', // == background; bottom-sheet wash
  chromeTintAlpha: 0.62, // unchanged (spec §3)
  sheetTintAlpha: 0.55, // unchanged (spec §3)
  fallbackChromeBg: '#F7F5F0', // solid fill when isLiquidGlassAvailable() === false
} as const;
```

Do not touch `glass.ts` — pure consumer (spec §6).

- [ ] **Step 3: Typecheck**

```bash
cd /home/iskan/projects/soldi/apps/mobile
npx tsc --noEmit
```
Expected: exits 0. `glass.test.ts` fixtures still reference `#FAF5F0`; fixed in Task 4 — do not run the full suite yet.

- [ ] **Step 4: Do NOT commit.** Continue to Task 3.

---

## Task 3: Re-derive the decomposed accent constant in ChatBubbleUser

**Files:**
- Modify: `apps/mobile/src/features/chat/ChatBubbleUser.tsx` (the `ACCENT_12` constant + its comment — currently ~lines 27-30; locate by `const ACCENT_12`)

- [ ] **Step 1: Replace the stale constant + comment**

Current:
```ts
// accent @ 12% — derived from COLORS.accent (#C97B5C); rgba avoids hardcoded hex
// The channel values (201, 123, 92) come from COLORS.accent hex decomposition.
// See token reference in design/tokens.ts COLORS.accent.
const ACCENT_12 = 'rgba(201, 123, 92, 0.12)'; // COLORS.accent @ 12% opacity
```

Replace with:
```ts
// accent @ 12% — derived from COLORS.accent (#9C5B41); rgba avoids hardcoded hex
// The channel values (156, 91, 65) come from COLORS.accent hex decomposition.
// See token reference in design/tokens.ts COLORS.accent.
const ACCENT_12 = 'rgba(156, 91, 65, 0.12)'; // COLORS.accent @ 12% opacity
```

(Decomposition check: `#9C5B41` → 0x9C=156, 0x5B=91, 0x41=65.)

- [ ] **Step 2: Typecheck**

```bash
cd /home/iskan/projects/soldi/apps/mobile
npx tsc --noEmit
```
Expected: exits 0.

- [ ] **Step 3: Do NOT commit.** Continue to Task 4.

---

## Task 4: Mechanical residue sweep (test fixtures + stale comments)

Apply the **Legacy-hex residue replacement map** to every hardcoded literal in the files below, then prove correctness with the full suite. These are deterministic substitutions.

**Files (from the superseded plan's enumeration — re-verify each before editing; the prior plan never executed so the live tree still has pre-Oat&Ink literals):**
- Modify: `apps/mobile/src/design/contrast.ts` — D-09 narrative comments → Slate & Sand narrative
- Modify: `apps/mobile/src/design/contrast.test.ts` — math-test fixtures
- Modify: `apps/mobile/src/features/chat/ChatLaunchFAB.tsx` — comment lines
- Modify: `apps/mobile/src/components/BottomSheet/BottomSheetPrimitive.tsx` — comment line (path corrected during execution: file is under `components/BottomSheet/`, not `components/`)
- Modify: `apps/mobile/src/design/glass.test.ts` — fixtures (`#FAF5F0` → `#F7F5F0`)
- Modify: `apps/mobile/src/features/dashboard/donutArcs.test.ts` — `#C97B5C` → `#9C5B41`, comment `#B8968A` → `#6E695F`
- Modify: `apps/mobile/src/features/categories/categoryMutations.test.ts` — fixtures (`#C97B5C`→`#9C5B41`, `#A86147`→`#7C4632`, `#7A5C52`→`#6A645A`)
- Modify: `apps/mobile/src/features/jars/JarRing.tsx` — comment line only (CR-04 `sageDark` note `#5C6B4A` → `#586A45`; residue twin of the `contrast.ts` CR-04 comment, found by the Step-5 gate during execution)

- [ ] **Step 1: `contrast.test.ts` math fixtures**

Locate each by content (not fixed line):
- `contrastRatio('#F7F1E8', '#F7F1E8') === 1` → `contrastRatio('#EDEAE3', '#EDEAE3') === 1`
- fixture pair `const a = '#2C1810'` → `'#221F1B'`; `const b = '#F7F1E8'` → `'#EDEAE3'`
- the "known ~15:1" case: comment + call → `// textPrimary #221F1B on background #EDEAE3 — known ~13.7:1` and `contrastRatio('#221F1B', '#EDEAE3')`. **Update the bound assertion to match the new ratio**: Slate & Sand textPrimary/bg = 13.66 (table above), so change any `ratio > 14 && ratio < 16` bound to `ratio > 13 && ratio < 15`. (This differs from the Oat&Ink plan — Oat&Ink was ~14.9; Slate & Sand is 13.66. Do not keep the old bound.)

- [ ] **Step 2: `glass.test.ts` fixtures**

Replace every `#FAF5F0` with `#F7F5F0`. If an expected `composeGlassTint` output embeds the hex (e.g. `#FAF5F0A0`), recompute only the RGB part; keep the alpha bytes (alphas unchanged, spec §3).

- [ ] **Step 3: Remaining fixtures + comments**

Apply the residue map to `donutArcs.test.ts`, `categoryMutations.test.ts` (every enumerated legacy literal), and the comment-only files (`contrast.ts`, `ChatLaunchFAB.tsx`, `BottomSheetPrimitive.tsx`). Comments must describe Slate & Sand values, not D-09/Oat & Ink.

- [ ] **Step 4: Full test suite**

```bash
cd /home/iskan/projects/soldi/apps/mobile
npm test
```
Expected: all PASS, **same count as the Step-1 baseline** (Task 1), no new failures/skips. If `donutArcs`/`categoryMutations` assert a specific palette hex, the new literal must equal the new token value.

- [ ] **Step 5: Residue hard gate**

```bash
cd /home/iskan/projects/soldi/apps/mobile
grep -rniE '#(C97B5C|BF6F4F|D9997A|A86147|2C1810|7A5C52|8A6558|B8968A|7E8B6C|7A876A|5C6B4A|B85C5C|B5C0A5|9DA88C|F7F1E8|FAF5F0|F0E6D8|F2D5C5|D9A994)' src --include='*.ts' --include='*.tsx' | grep -v 'src/design/tokens.ts' | grep -vE 'schema\.sql\.ts'
```
(Exclusion corrected during execution: the seed file is `src/lib/db/schema.sql.ts`, NOT `src/data/...` — the original `grep -v 'src/data/.*schema'` filter would not have matched it.)
Expected: **no output**. Any hit outside `tokens.ts` and the deferred `src/lib/db/schema.sql.ts` (Appendix) is unfinished residue — fix before continuing. A legitimate exception needs an inline justifying comment + execution-log note.

- [ ] **Step 6: Do NOT commit.** Continue to Task 5.

---

## Task 5: Full verification gate + WCAG re-baseline + Commit 1 (code bucket)

**Files:** none new — commits staged work from Tasks 1–4.

- [ ] **Step 1: Confirm the WCAG audit asserts the §3 ratios**

Read `apps/mobile/src/design/contrast.ts` `auditTokenPairs()`. Confirm it derives pairs from `COLORS.*` and asserts: body tokens (`textPrimary`,`textSecondary`,`textMuted`,`accentDeep`,`sageDark`,`error`,`success`,`income`,`expense`) ≥ 4.5; graphic tokens (`accent`,`sage`) ≥ 3; and `accentSoft`/`sageSoft` are flagged decorative-only (sub-3 documented, not asserted as text-pass). The mechanical driver already enforces `textMuted ≥ 4.5` (the hard floor). If `auditTokenPairs` does NOT already assert `textMuted ≥ 4.5` explicitly, add that single assertion (it is the spec §3 hard-floor requirement) + keep its existing structure; this is the only logic edit permitted in this task. **Note in the execution log:** the `accent` large-text rule (≥24px/≥18.66px bold) is design-review-only and NOT covered by this audit or the Acceptance-#3 grep (spec §3 enforcement gap).

- [ ] **Step 2: Full verification gate (stop at first failure)**

```bash
cd /home/iskan/projects/soldi/apps/mobile
npx tsc --noEmit            # expect exits 0
npx expo lint               # expect exits 0 (incl. BANNED_COLORS ESLint rule)
npm test                    # expect all green, Task-1 baseline count
npx expo export --platform ios --output-dir /tmp/soldi-palette-slate; echo "export:$?"  # expect export:0
```
On any failure, fix within the relevant task's scope, re-run from `tsc`. Do not commit on failure.

- [ ] **Step 3: Stage exactly the code-bucket files**

```bash
cd /home/iskan/projects/soldi
git add apps/mobile/src/design/tokens.ts \
        apps/mobile/src/design/contrast.ts \
        apps/mobile/src/design/contrast.test.ts \
        apps/mobile/src/design/glass.test.ts \
        apps/mobile/src/features/chat/ChatBubbleUser.tsx \
        apps/mobile/src/features/chat/ChatLaunchFAB.tsx \
        apps/mobile/src/components/BottomSheet/BottomSheetPrimitive.tsx \
        apps/mobile/src/features/dashboard/donutArcs.test.ts \
        apps/mobile/src/features/categories/categoryMutations.test.ts \
        apps/mobile/src/features/jars/JarRing.tsx
git status --short
```
Expected: exactly these **10** files staged (paths corrected during execution: `BottomSheet/BottomSheetPrimitive.tsx` real path; `JarRing.tsx` added — it carried a `#5C6B4A` CR-04 residue twin fixed in Task 4). No `.planning/` or `docs/` path in this commit. (If a listed file had no residue and is unmodified, it simply won't stage — fine; do not force-add.)

- [ ] **Step 4: Commit 1**

```bash
git commit -m "$(cat <<'EOF'
feat(design): Slate & Sand palette foundation

Swap COLORS/GLASS/GRADIENTS in tokens.ts to the gender-neutral
Slate & Sand palette (supersedes rejected Oat & Ink). textMuted
WCAG-gated #8A8478 -> #6E695F (3.09 -> 4.54:1, hard AA floor,
asserted). Re-derive ChatBubbleUser decomposed accent constant;
refresh color-asserting tests + stale D-09/Oat&Ink comments.
auditTokenPairs() WCAG suite green on the new palette.

Spec: docs/superpowers/specs/2026-05-18-soldify-palette-redeclaration-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git log --oneline -1
```

---

## Task 6: Re-derive locked contracts + Commit 2 (contract-docs bucket)

**Files:**
- Modify: `.planning/phases/redesign/W1-DEVICE-UAT.md` (glass-tint + accent/textPrimary acceptance hexes)
- Modify: `.planning/phases/02-dashboard-transactions-categories/02-UI-SPEC.md` (palette table + swatch table)

- [ ] **Step 1: W1-DEVICE-UAT.md**

Locate by content (not fixed line — re-verify):
- `#FAF5F0 chromeTint` → `#F7F5F0 chromeTint`
- `accent (#BF6F4F) icon + textPrimary (#2C1810) label` → `accent (#9C5B41) icon + textPrimary (#221F1B) label`
- `GLASS.fallbackChromeBg #FAF5F0` → `GLASS.fallbackChromeBg #F7F5F0`

(If a `#F7F1E8` literal is genuinely present here, map it `#EDEAE3`; if not present, do not invent an edit.)

- [ ] **Step 2: 02-UI-SPEC.md palette table** — set the Hex column to the Slate & Sand COLORS map:

```
| Dominant surface (60%) | `COLORS.background` | `#EDEAE3` | App shell, screen backgrounds, dashboard scroll area |
| Secondary surface (30%) | `COLORS.surface` | `#F7F5F0` | Digest card, bottom sheet background, filter modal background, category editor sheet |
| Primary text | `COLORS.textPrimary` | `#221F1B` | All body text, merchant names, section labels |
| Secondary text | `COLORS.textSecondary` | `#6A645A` | Date header labels, filter pill text, category chip text, donut center percentage |
| Muted text | `COLORS.textMuted` | `#6E695F` | Placeholder text in search input, empty-state sub-copy, "yesterday in money" prefix label |
| Accent (10%) | `COLORS.accent` | `#9C5B41` | Graphic/large-text only: sparkline line, active filter pill bg, CTA fill, top-category donut slice, selected swatch |
| Accent soft | `COLORS.accentSoft` | `#B97A5A` | Gradient pair for CTA buttons, decorative donut fill |
| Accent deep | `COLORS.accentDeep` | `#7C4632` | Expense amounts (text), pressed CTA, pressed donut slice |
| Sage | `COLORS.sage` | `#687653` | Income/positive donut+chart graphic |
| Sage soft | `COLORS.sageSoft` | `#9AA585` | Income category donut slice fill (decorative only) |
| Sage deep | `COLORS.sageDeep` | `#4F5C3C` | Pressed state on income elements / deep emphasis |
| Error / destructive | `COLORS.error` | `#97463A` | Merge confirm destructive CTA, delete swipe reveal bg |
| Success | `COLORS.success` | `#586A45` | Confirmation toast after category merge/create |
```

Also update any `**Income color:** \`COLORS.sage\` (\`#9DA88C\`)` → `(\`#687653\`)` and any income-amount-**text** reference to bind `COLORS.sageDark \`#586A45\`` (text must be body-safe — spec §3 split).

- [ ] **Step 3: 02-UI-SPEC.md swatch table**

```
| 1 (accent) | `COLORS.accent` | `#9C5B41` |
| 2 (accentSoft) | `COLORS.accentSoft` | `#B97A5A` |
| 3 (accentDeep) | `COLORS.accentDeep` | `#7C4632` |
| 4 (sage) | `COLORS.sage` | `#687653` |
| 5 (sageSoft) | `COLORS.sageSoft` | `#9AA585` |
| 6 (sageDeep) | `COLORS.sageDeep` | `#4F5C3C` |
| 7 (error muted) | `COLORS.error` | `#97463A` |
| 8 (textSecondary) | `COLORS.textSecondary` | `#6A645A` |
```

Token-name-only references (no hex) need no edit — verify by reading and confirm no literal hex remains.

- [ ] **Step 4: Verify no stale palette hex in the two contract docs**

```bash
cd /home/iskan/projects/soldi
grep -niE '#(C97B5C|BF6F4F|D9997A|A86147|2C1810|7A5C52|8A6558|B8968A|7E8B6C|7A876A|5C6B4A|B85C5C|B5C0A5|9DA88C|F7F1E8|FAF5F0|F0E6D8)' \
  .planning/phases/redesign/W1-DEVICE-UAT.md \
  .planning/phases/02-dashboard-transactions-categories/02-UI-SPEC.md
```
Expected: no output (the UI-SPEC banned-colors line lists only `#667EEA` etc., not in this set).

- [ ] **Step 5: Commit 2**

```bash
cd /home/iskan/projects/soldi
git add .planning/phases/redesign/W1-DEVICE-UAT.md \
        .planning/phases/02-dashboard-transactions-categories/02-UI-SPEC.md
git commit -m "$(cat <<'EOF'
docs(redesign): re-derive locked contracts to Slate & Sand

W1-DEVICE-UAT glass-tint + accent/textPrimary acceptance hexes and
Phase 2 UI-SPEC palette/swatch tables updated to Slate & Sand.
Amount/label text bound to body-safe accentDeep/sageDark (spec §3
split). Device-UAT not yet run — criteria updated before the test,
no passed gate broken.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git log --oneline -1
```

---

## Task 7: Regenerate the design authority HTML to Slate & Sand + supersede markers + Commit 3 (design-authority bucket)

Spec §5 "New Task": `docs/design/soldify-screens.html` currently encodes the **rejected Oat & Ink** palette and a header two-tone seam on some screens. Regenerate it to Slate & Sand with a cohesive no-seam header on every screen, and mark the superseded Oat & Ink artifacts.

> **Work-type note (read first):** This is a **design-generation** task, not a mechanical hex map. The HTML is the Path-C rendered authority (8 screens). It is regenerated via the same generation path that produced the current file (per memory `soldify-figma-design-delivered` / `feedback-design-path-c-premium`: spec-driven generation, premium portfolio bar), then verified by the structural/grep acceptance below — NOT by transcribing thousands of lines here. If executing subagent-driven, this task should be handled in an interactive/dedicated step (it needs design judgment + possibly the imagegen/figma path), not a blind mechanical subagent. See Execution Handoff.

**Files:**
- Modify/regenerate: `docs/design/soldify-screens.html`
- Modify (supersede marker): `docs/superpowers/plans/2026-05-18-soldify-palette-foundation.md`, `docs/superpowers/specs/2026-05-18-soldify-palette-foundation-design.md`

- [ ] **Step 1: Regenerate `soldify-screens.html`**

Regenerate all 8 screens applying spec §3 Slate & Sand values (CSS custom properties / inline styles) and spec §4 Header Cohesion Rule: status-bar safe area → header band → eyebrow is **one continuous fill** (`warm[0]` `#E6E1D4` for hero screens, or `surface`/`background` for plain screens); keep the negative-margin hero technique that unifies notch + hero under one fill. **No layout/structure/type/motion changes** — palette + header-fill only (spec §1, §6). Preserve Oswald numerals / EB Garamond narrative / Manrope UI.

- [ ] **Step 2: Structural + palette acceptance checks**

```bash
cd /home/iskan/projects/soldi
# (a) no rejected Oat&Ink / pre-D-09 / current-legacy palette hex remains in the HTML
grep -niE '#(F2EFE7|FBFAF6|A85C3C|C07A55|8C4A30|71695E|1F1B16|6B6258|74815C|C97B5C|BF6F4F|D9997A|A86147|2C1810|7A5C52|8A6558|F7F1E8|FAF5F0)' docs/design/soldify-screens.html || echo "HTML-NO-STALE-PALETTE-OK"
# (b) Slate & Sand core tokens present
grep -qiE '#EDEAE3' docs/design/soldify-screens.html && grep -qiE '#9C5B41' docs/design/soldify-screens.html && grep -qiE '#221F1B' docs/design/soldify-screens.html && echo "HTML-SLATE-SAND-PRESENT-OK"
```
Expected: `HTML-NO-STALE-PALETTE-OK` and `HTML-SLATE-SAND-PRESENT-OK`. Then **manually open the HTML** and confirm per spec §4: every screen's status-bar/notch region is the same fill as its header band (no seam), on light, dark, and content screens. Record the visual check in the execution log (this is design-review, not CI).

- [ ] **Step 3: Supersede markers**

Prepend to `docs/superpowers/plans/2026-05-18-soldify-palette-foundation.md` (line 1, above the title):
```markdown
> **SUPERSEDED 2026-05-19 by `docs/superpowers/plans/2026-05-19-soldify-palette-foundation-slate-sand.md` (Slate & Sand).** Oat & Ink was rejected (reads "for women only"). Do not execute this plan.

```
Prepend to `docs/superpowers/specs/2026-05-18-soldify-palette-foundation-design.md` (line 1):
```markdown
> **SUPERSEDED 2026-05-19 by `docs/superpowers/specs/2026-05-18-soldify-palette-redeclaration-design.md` (Slate & Sand).** Oat & Ink REJECTED. Historical only.

```

- [ ] **Step 4: Commit 3**

```bash
cd /home/iskan/projects/soldi
git add docs/design/soldify-screens.html \
        docs/superpowers/plans/2026-05-18-soldify-palette-foundation.md \
        docs/superpowers/specs/2026-05-18-soldify-palette-foundation-design.md
git commit -m "$(cat <<'EOF'
design(authority): regenerate soldify-screens.html to Slate & Sand

Recolor all 8 screens to the spec §3 Slate & Sand palette with the
§4 cohesive no-seam header (status-bar -> header -> eyebrow one
fill; negative-margin hero kept). Layout/type/motion unchanged.
Mark the rejected Oat & Ink plan + spec SUPERSEDED.

Spec: docs/superpowers/specs/2026-05-18-soldify-palette-redeclaration-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git log --oneline -3
```

- [ ] **Step 5: Final state report** — three new commits on `main` (code, contract-docs, design-authority). Not pushed (user-gated). Report all gate outputs verbatim + the HTML visual-check result.

---

## Appendix: Known scope gap — category seed colors (DECISION NEEDED, not in this plan)

`apps/mobile/src/lib/db/schema.sql.ts` seeds **18 category color rows** with legacy palette hex. Spec §6 scopes this work to **design tokens only**; DB seed data is **excluded** (changing seed rows has migration implications for existing users' customized colors). The Task 4 Step 5 residue grep deliberately excludes `schema.sql.ts`. **Surface at execution handoff** as a separate follow-up: "do seeded category colors need a data migration to Slate & Sand, and what happens to users who already customized them?" — its own spec/plan.

## Self-Review

**1. Spec coverage** (spec §1–§7):
- §1 context (gender-neutral, recolor-only, structure/type/motion unchanged) → Architecture + Task 1-2 scope + Task 7 Step 1 constraint ✓
- §2 decision (recolor, 17 keys + GRADIENTS + GLASS, AA-gated, computed) → Tasks 1-2 + Task 5 audit ✓
- §3 locked token map (all COLORS/GRADIENTS/GLASS values + ratios + policy split + enforcement gap) → canonical map + Task 1/2 + Task 5 Step 1 note + Task 6 text-binding split ✓
- §4 header cohesion → Task 7 Step 1 + Step 2 visual check ✓
- §5 blast radius (Tasks 1-6 re-derive + New Task HTML + Task 0 survives) → Tasks 1-6 retargeted + Task 7 + Task 0 flipped to SATISFIED ✓
- §6 out-of-scope (no layout/motion/code-beyond-tokens/dark-theme) → stated in Architecture + Task 2 dark note + Task 7 constraint ✓
- §7 acceptance #1 tsc/lint 0 → Task 5 Step 2; #2 auditTokenPairs ratios + flags → Task 5 Step 1; #3 grep binding + design-review caveat → Task 5 note + (residue grep Task 4/6); #4 HTML regenerated → Task 7; #5 BANNED_COLORS → Task 1 Step 4 + Task 5 lint ✓
- Supersede `1d80545` (spec §5) → Task 7 Step 3 + header note ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases". Token values, comment blocks, commit messages, grep sets, expected sentinels are concrete. Task 7 Step 1 is necessarily generative (it is an 8-screen HTML redesign — flagged as a work-type, with concrete grep/visual acceptance instead of fabricated full HTML; this is honest, not a placeholder). Line numbers are given as "locate by declaration/content" because the superseded plan never executed and the live tree's exact lines are unverified — deliberate, with the anchor symbol named each time.

**3. Type consistency:** No new types/functions. `auditTokenPairs()`/`contrastRatio()` referenced exactly as in `contrast.ts`; all 17 `COLORS` keys + `GRADIENTS`/`GLASS` keys match `tokens.ts`. `ACCENT_12` rgb (156,91,65) ⇔ `#9C5B41`. Residue map "replace with" column == canonical-map "new" column for every shared hex. Task-1 baseline test count is the single source the Task-4 Step-4 / Task-5 Step-2 "same count" checks compare against.

**4. Known risks surfaced:** textMuted hard AA-floor (no headroom — asserted, do-not-darken-alone noted). accent large-text enforcement gap (design-review-only, not CI — stated Task 5). amount-text vs chart-stroke binding split (mandatory, Task 6). `schema.sql.ts` seed-color coupling (Appendix, explicit decision deferred). Task 7 HTML regen is generation work (handoff note: may need dedicated/interactive execution, not blind subagent). `dark` gradient value changes per §3 though dark-mode theme is future §6 (noted inline, defensible — §3 is the locked value authority).
