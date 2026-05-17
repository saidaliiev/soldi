# SOLDI Redesign — Wave 2 (Dashboard Hero Kinetic + Donut Interpolation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard the live "money-shot" (spec §1/§3 Wave 2): hero total count-up, donut arc draw-in on mount + true arc interpolation on month change (closes deferred decision **D-05**), scroll-driven Chat FAB reveal, a coordinated hero+donut month-swipe carry, and an editorial spacing/hairline pass — all motion driven only by the Wave-0 `MOTION` vocabulary through one new reanimated boundary, reduce-motion mandatory.

**Architecture:** Mirrors the Wave-1 pattern (pure node-tested decision layer + ONE thin native/reanimated boundary). All animation *math* is pure and `node:test`-importable: `selectMotionPreset` appended to the pure `src/design/motion.ts`; `interpolateSliceAngles` + `interpolateScalar` in a new pure `src/features/dashboard/dashboardMotion.ts`; `arcsFromSliceAngles` extracted (DRY) into the existing pure `src/features/dashboard/donutArcs.ts`. Exactly ONE new file imports `react-native-reanimated`'s `Easing` for the vocabulary — `src/design/useMotion.ts` (the motion boundary: `useReduceMotion()` + `useMotion()` → `withMotion(to, presetName)`). Components consume `withMotion` only — no ad-hoc `duration:`/`Easing.` literals introduced in the four touched components (CLAUDE.md §Design: "Motion: only via src/design/motion.ts vocabulary"). D-05 is closed by interpolating `SliceAngle[]` (keyed by stable `categoryId`, with enter/exit), NOT SVG path strings — the original `usePathInterpolation` topology blocker (02-01-SUMMARY) does not apply to angle-space interpolation, and `prev=[]` on first mount makes the same mechanism the arc-draw.

**Polish directive (Variant A — premium/portfolio bar):** Architecture, file structure, pure-layer split, tests, and governance are followed STRICTLY as written — no deviation. The *visual* layer (especially `sharedMonth` carry, donut enter/exit choreography, hero count-up timing, overall "money-shot" feel) is held to a premium hiring-signal standard, not "functional". Any timing/easing/stagger refinement still flows through the `MOTION` vocabulary (tune constants in the pure `motion.ts` / add a pure stagger helper — never ad-hoc literals in components). A dedicated **Task 10 Polish Pass** follows Task 9 (timing, easing curves, micro-details, staggered slice entrance) once the full pipeline is green. Two **Open Design design-sync checkpoints** (before Task 5 and before Task 8) compare the implementation against the live mockups before the high-visual tasks proceed.

**Tech Stack:** Expo SDK 54 (`~54.0.33`), React Native 0.81.5, TypeScript 5.9 strict, `node:test`+`tsx` runner (`src/**/*.test.ts`), `react-native-reanimated@~4.1.1`, `react-native-worklets@0.5.1`, `@shopify/react-native-skia@2.2.12`, `react-i18next` (existing). Binds to the REAL Wave-0/1 API on `origin/main @ 02c93ee` (verified in tree): `MOTION`/`degradeForReducedMotion` (`src/design/motion.ts`), `GlassTabBar` floating bar (`src/features/chrome/GlassTabBar.tsx`), `computeSliceAngles`/`buildDonutArcs`/`SliceAngle`/`DonutArc` (`src/features/dashboard/donutArcs.ts`).

**Source of truth:** `docs/superpowers/specs/2026-05-17-soldi-premium-redesign-design.md` (`3990710`), §2.1 motion table, §3 Wave 2, §4 R3/R6, §6 (D-05 closed by Wave 2). Wave 1 plan: `docs/superpowers/plans/2026-05-17-soldi-redesign-wave-1-glass-tab-bar.md`.

**Sequencing constraint (read before executing):** Wave 2 is **pure RN/JS motion — NO new native module, NO EAS build triggered.** Local gate only. The first glass-bearing EAS build is the *batched W1+W2* TestFlight build, owned by a pre-build R1 gate and sequenced AFTER the in-flight TestFlight build #6 (EAS quota ~10-15/mo — batch, never auto-rebuild; `eas-build-quota` memory). Device-UAT for Wave 2 (count-up/arc-draw/interpolate/FAB-reveal feel + reduce-motion + fps) is authored here (Task 9) and deferred to that batched build checkpoint together with the carried Wave-1 device-UAT. R3 perf budget (≥58fps) is verified in Wave 6, not here — Wave 2 makes the work bounded and post-mount so cold-start is unaffected.

**Working directory:** all `apps/mobile/...` paths are relative to repo root `/home/iskan/projects/soldi`. Run `npm`/`tsc`/`lint`/`expo`/`git` from `apps/mobile` unless stated. `npm test` glob = `src/**/*.test.ts` (node:test + tsx); design/feature pure modules are testable, RN/reanimated boundary files are NOT (verified by gate + device-UAT, same as Wave-1 `GlassTabBar`).

---

## File Structure (decomposition locked here)

| File | Responsibility | Wave 2 action |
|---|---|---|
| `apps/mobile/src/design/motion.ts` | Pure motion vocabulary (node-safe, NO reanimated) | Modify — append `selectMotionPreset` (additive; W0 `MOTION`/`degradeForReducedMotion` untouched) |
| `apps/mobile/src/design/motion.test.ts` | Pure motion guard | Modify — append `selectMotionPreset` tests (W0 tests unchanged) |
| `apps/mobile/src/features/dashboard/dashboardMotion.ts` | Pure dashboard animation math: `interpolateScalar`, `interpolateSliceAngles` (node-safe) | Create |
| `apps/mobile/src/features/dashboard/dashboardMotion.test.ts` | Pure-layer guard for the above | Create |
| `apps/mobile/src/features/dashboard/donutArcs.ts` | Pure donut arc math | Modify — extract/export `arcsFromSliceAngles` (DRY: `buildDonutArcs` reuses it; existing exports + behavior byte-identical) |
| `apps/mobile/src/features/dashboard/donutArcs.test.ts` | Pure donut math guard | Modify — append `arcsFromSliceAngles` tests + a no-regression assertion that `buildDonutArcs` output is unchanged |
| `apps/mobile/src/design/useMotion.ts` | The ONLY new file importing reanimated `Easing` for the vocabulary; `useReduceMotion()` + `useMotion()`→`withMotion` | Create |
| `apps/mobile/src/features/dashboard/MonthlyTotalHero.tsx` | Hero total | Modify — count-up via `withMotion('heroCountUp')`; sharedMonth carry |
| `apps/mobile/src/features/dashboard/DonutChart.tsx` | Donut chart | Modify — replace opacity crossfade with angle interpolation (`arcDraw` first mount, `arcInterpolate` on month change → closes D-05); sharedMonth carry |
| `apps/mobile/src/features/chat/ChatLaunchFAB.tsx` | Chat FAB | Modify — real `scrollY`-driven reveal via `withMotion('fabReveal')`; press feedback via vocabulary |
| `apps/mobile/app/(tabs)/index.tsx` | Dashboard composition | Modify — provide real `scrollY` SharedValue to `ChatLaunchFAB`; derive swipe direction for sharedMonth; editorial spacing/hairline pass |
| `.planning/PROJECT.md` | Decision log | Modify — mark D-05 CLOSED (spec §6) |
| `.planning/STATE.md` | Planning state | Modify — record Wave 2 code complete + device-UAT deferred |
| `.planning/phases/redesign/W2-DEVICE-UAT.md` | Deferred device-UAT checklist | Create |

**Out of Wave 2 scope (do NOT touch — later waves / known debt):**
- `MonthSwiper.tsx` internal pan-snap (`250ms Easing.out(Easing.quad)` literal) — Wave-2 `sharedMonth` is the hero+donut *carry*, not MonthSwiper internals. Leave as-is; logged as a Wave-3 carry-forward in Task 9.
- Pre-existing ad-hoc `withTiming`/`withSpring` literals in untouched files (`ChatBubble*`, `JarRing`, `PropagationToast`, `CategoryListRow`, `onboarding/welcome`, `TransactionRow`, `ChatErrorBanner`, `ChatInputRow`, `ChatEmptyState`) — those screens belong to Waves 3/4/5; not fixed here (YAGNI/scope). Governance grep in Task 9 is scoped to the four W2-touched components only.
- `MOTION.sheetSpring` / `'spring'` easing token — only chat/recategorize sheets (Wave 4). `resolveEasing` (Task 4) intentionally throws on `'spring'` (fail-fast) with a "lands Wave 4" message; W2 uses only timing tokens (`outCubic`/`inOutCubic`).
- Bottom-sheet glass, transactions/chat/secondary screens, the EAS build itself.

**Key design decisions (locked, with spec citations):**
- **One interpolation mechanism, two presets (spec §2.1 `arcDraw` + `arcInterpolate`).** `interpolateSliceAngles(prev, next, t)` with `prev=[]` ⇒ every slice "enters" (grows from its leading edge) = the mount arc-draw (`MOTION.arcDraw`, 700ms). `prev=lastAngles` ⇒ matched slices morph, new enter, gone exit = month-change interpolation (`MOTION.arcInterpolate`, 450ms). This is the legitimate D-05 close (spec §6) — D-05's acceptance is "slices interpolate prev→new", which angle-space interpolation satisfies; the `usePathInterpolation` topology blocker (02-01-SUMMARY) is specific to SVG-path-string interpolation and does not apply.
- **Pure math, thin boundary (mirrors Wave 1).** All frame math is pure + node-tested. `useMotion.ts` is the single sanctioned reanimated-`Easing` site for the vocabulary; `selectMotionPreset` (pure) decides reduced-vs-full. reduce-motion: `selectMotionPreset(name,true)` → duration 0 ⇒ `withMotion` returns the target value instantly (opacity/position snap, count-up shows final number, donut renders final arcs) — spec §2.1 "reduce-motion must be respected", R3.
- **Bounded per-frame cost.** Month-change drives ONE reanimated `progress` SV; `useAnimatedReaction` quantizes `t` to 2 decimals before `runOnJS(setT)` so duplicate frames skip `setState`; ≤7 `Skia.Path.MakeFromSVGString` rebuilt per changed frame. Post-mount only (cold-start unaffected, R3). Full fps budget verified in Wave 6 (spec §4 R3) — explicit device-UAT line in Task 9.
- **`sharedMonth` = coordinated carry, not RN shared-element nav.** No navigation occurs on month-swipe (same screen, state change). Spec §2.1 "shared-element on month-swipe (hero number + donut carry)" is implemented as hero + donut running a synced direction-aware translate+opacity entrance (`MOTION.sharedMonth`, 380ms inOutCubic) keyed off the month change, so they read as one element carried by the swipe. Direction derived from existing pure `compareMonth` (monthMath) — no new pure fn.

---

## Task 1: Pure `selectMotionPreset` in `motion.ts` (node-safe)

**Files:**
- Modify: `apps/mobile/src/design/motion.ts` (append AFTER `degradeForReducedMotion`, before EOF — do NOT alter W0 `MOTION`, `degradeForReducedMotion`, types)
- Modify: `apps/mobile/src/design/motion.test.ts` (append; keep W0 tests unchanged)

Still pure: NO reanimated/RN import. Single decision point so every consumer resolves the same way and reduce-motion is impossible to forget.

- [ ] **Step 1: Write the failing tests**

Append to `apps/mobile/src/design/motion.test.ts`:

```ts
import { selectMotionPreset } from './motion.js';

test('selectMotionPreset: full motion returns the named MOTION preset unchanged', () => {
  const p = selectMotionPreset('arcDraw', false);
  assert.deepStrictEqual(p, MOTION.arcDraw);
  assert.strictEqual('reduced' in p, false);
});

test('selectMotionPreset: reduce-motion collapses to instant linear reduced preset', () => {
  const p = selectMotionPreset('heroCountUp', true);
  assert.strictEqual(p.durationMs, 0);
  assert.strictEqual(p.easing, 'linear');
  assert.strictEqual((p as { reduced?: true }).reduced, true);
});

test('selectMotionPreset: every MOTION name resolves in both modes', () => {
  for (const k of ['heroCountUp', 'arcDraw', 'arcInterpolate', 'fabReveal', 'sharedMonth', 'sheetSpring'] as const) {
    assert.ok(selectMotionPreset(k, false).durationMs >= 0);
    assert.strictEqual(selectMotionPreset(k, true).durationMs, 0);
  }
});

test('selectMotionPreset: is pure (does not mutate MOTION)', () => {
  const before = { ...MOTION.arcInterpolate };
  selectMotionPreset('arcInterpolate', true);
  assert.deepStrictEqual({ ...MOTION.arcInterpolate }, before);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `apps/mobile`): `npm test 2>&1 | grep -E "selectMotionPreset|# fail"`
Expected: FAIL — `selectMotionPreset` not exported from `./motion.js`.

- [ ] **Step 3: Implement**

Append to `apps/mobile/src/design/motion.ts` (after `degradeForReducedMotion`'s closing brace; do not touch existing code):

```ts

/**
 * Resolve a named motion preset for the current accessibility state. Single
 * decision point: full preset when motion is allowed, the instant/linear
 * reduced preset (duration 0) when reduce-motion is enabled. Pure — delegates
 * to degradeForReducedMotion, never mutates MOTION. The reanimated boundary
 * (useMotion.ts) calls this with AccessibilityInfo.isReduceMotionEnabled().
 */
export function selectMotionPreset(
  name: MotionName,
  reduceMotionEnabled: boolean,
): MotionPreset | ReducedMotionPreset {
  return reduceMotionEnabled ? degradeForReducedMotion(MOTION[name]) : MOTION[name];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run (from `apps/mobile`): `npm test 2>&1 | tail -6`
Expected: `# fail 0`; total = 181 (Wave-1 baseline) + 4.

- [ ] **Step 5: Typecheck**

Run (from `apps/mobile`): `npx tsc --noEmit; echo "tsc:$?"` → `tsc:0`.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/design/motion.ts apps/mobile/src/design/motion.test.ts
git commit -m "feat(design): selectMotionPreset — reduce-motion-aware preset resolver (Wave 2)"
```

---

## Task 2: Pure dashboard motion math — `dashboardMotion.ts` (node-safe)

**Files:**
- Create: `apps/mobile/src/features/dashboard/dashboardMotion.ts`
- Create: `apps/mobile/src/features/dashboard/dashboardMotion.test.ts`

Pure (no React/Skia/reanimated) — node:test importable, mirrors `donutArcs.ts`. `interpolateScalar` drives the hero count-up; `interpolateSliceAngles` drives donut draw/interpolation (closes D-05). Matched slices keyed by stable `categoryId`; new slices grow from their leading edge; gone slices shrink to zero and are dropped once collapsed (so `t=1` === `next` exactly).

- [ ] **Step 1: Write the failing tests**

Create `apps/mobile/src/features/dashboard/dashboardMotion.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { interpolateScalar, interpolateSliceAngles } from './dashboardMotion.js';
import type { SliceAngle } from './donutArcs.js';

const A = (id: number | 'other', s: number, e: number, color = '#111111'): SliceAngle => ({
  startDeg: s,
  endDeg: e,
  color,
  categoryId: id,
});

test('interpolateScalar: endpoints exact, midpoint linear, t clamped', () => {
  assert.strictEqual(interpolateScalar(0, 100, 0), 0);
  assert.strictEqual(interpolateScalar(0, 100, 1), 100);
  assert.strictEqual(interpolateScalar(0, 100, 0.5), 50);
  assert.strictEqual(interpolateScalar(40, 80, -1), 40); // clamp low
  assert.strictEqual(interpolateScalar(40, 80, 2), 80); // clamp high
});

test('interpolateSliceAngles: t=0 yields prev geometry for matched slices', () => {
  const prev = [A(1, 1, 100), A(2, 102, 200)];
  const next = [A(1, 1, 60), A(2, 62, 358)];
  const r = interpolateSliceAngles(prev, next, 0);
  assert.strictEqual(r.length, 2);
  assert.strictEqual(r[0]!.startDeg, 1);
  assert.strictEqual(r[0]!.endDeg, 100);
  assert.strictEqual(r[1]!.endDeg, 200);
});

test('interpolateSliceAngles: t=1 equals next exactly (matched, order preserved)', () => {
  const prev = [A(1, 1, 100), A(2, 102, 200)];
  const next = [A(2, 1, 120), A(1, 122, 358)];
  const r = interpolateSliceAngles(prev, next, 1);
  assert.deepStrictEqual([...r], [...next]);
});

test('interpolateSliceAngles: matched slice morphs linearly at midpoint', () => {
  const prev = [A(1, 0, 100)];
  const next = [A(1, 0, 200)];
  const r = interpolateSliceAngles(prev, next, 0.5);
  assert.strictEqual(r[0]!.endDeg, 150);
  assert.strictEqual(r[0]!.color, '#111111');
});

test('interpolateSliceAngles: entering slice grows from its leading edge', () => {
  const prev: SliceAngle[] = [];
  const next = [A(7, 10, 50)];
  const half = interpolateSliceAngles(prev, next, 0.5);
  assert.strictEqual(half[0]!.startDeg, 10);
  assert.strictEqual(half[0]!.endDeg, 30); // lerp(10,50,0.5)
  const full = interpolateSliceAngles(prev, next, 1);
  assert.deepStrictEqual([...full], [...next]);
});

test('interpolateSliceAngles: exiting slice shrinks to zero then is dropped at t=1', () => {
  const prev = [A(1, 0, 100), A(9, 102, 200)];
  const next = [A(1, 0, 358)];
  const mid = interpolateSliceAngles(prev, next, 0.5);
  // matched #1 morphs, exiting #9 still present but half-collapsed
  const exiting = mid.find((a) => a.categoryId === 9)!;
  assert.strictEqual(exiting.startDeg, 102);
  assert.strictEqual(exiting.endDeg, 151); // lerp(200,102,0.5) -> shrink toward start
  const end = interpolateSliceAngles(prev, next, 1);
  assert.deepStrictEqual([...end], [...next]); // #9 fully dropped
});

test('interpolateSliceAngles: empty→empty is empty, never NaN', () => {
  assert.deepStrictEqual([...interpolateSliceAngles([], [], 0.5)], []);
});

test('interpolateSliceAngles: clamps t to [0,1]', () => {
  const prev = [A(1, 0, 100)];
  const next = [A(1, 0, 200)];
  assert.strictEqual(interpolateSliceAngles(prev, next, -5)[0]!.endDeg, 100);
  assert.strictEqual(interpolateSliceAngles(prev, next, 5)[0]!.endDeg, 200);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `apps/mobile`): `npm test 2>&1 | grep -E "dashboardMotion|# fail"`
Expected: FAIL — module `./dashboardMotion.js` not found / exports missing.

- [ ] **Step 3: Implement**

Create `apps/mobile/src/features/dashboard/dashboardMotion.ts`:

```ts
/**
 * SOLDI dashboard kinetic math (redesign Wave 2, spec §2.1).
 *
 * Pure: no React, no Skia, no reanimated — node:test compatible (mirrors
 * donutArcs.ts). The reanimated boundary (useMotion.ts) + components drive a
 * single progress value 0→1 and call these to get the per-frame geometry.
 *
 * D-05 close: arcs are interpolated in ANGLE space keyed by stable categoryId
 * (not SVG path strings — the usePathInterpolation topology blocker in
 * 02-01-SUMMARY is specific to path-string interpolation and does not apply).
 * prev=[] ⇒ every slice "enters" ⇒ the same code is the mount arc-draw.
 */

import type { SliceAngle } from './donutArcs';

/** Linear interpolate from→to by t; t clamped to [0,1]. Pure. */
export function interpolateScalar(from: number, to: number, t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return from + (to - from) * c;
}

// Collapsed exit slices narrower than this (deg) are dropped so t=1 === next.
const COLLAPSE_EPSILON = 1e-6;

/**
 * Interpolate the donut from `prev` slice angles to `next` by `t` (clamped
 * [0,1]). Result order/colors follow `next` for matched + entering slices;
 * exiting slices (in prev, absent from next) are appended, shrinking toward
 * their own start edge, and dropped once collapsed. At t=1 the result equals
 * `next` exactly (matched/entering settled, exits gone).
 *
 * - matched (same categoryId): startDeg/endDeg lerp prev→next, color = next.
 * - entering (only in next): startDeg = next.startDeg, endDeg grows from
 *   next.startDeg → next.endDeg (sweeps in from the leading edge).
 * - exiting (only in prev): startDeg fixed, endDeg shrinks prev.endDeg →
 *   prev.startDeg; removed when its sweep ≤ COLLAPSE_EPSILON.
 */
export function interpolateSliceAngles(
  prev: readonly SliceAngle[],
  next: readonly SliceAngle[],
  t: number,
): readonly SliceAngle[] {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  const prevById = new Map<number | 'other', SliceAngle>();
  for (const p of prev) prevById.set(p.categoryId, p);
  const nextIds = new Set<number | 'other'>(next.map((n) => n.categoryId));

  const out: SliceAngle[] = [];

  for (const n of next) {
    const p = prevById.get(n.categoryId);
    if (p) {
      // matched — morph geometry, snap to the new color (no color flicker).
      out.push({
        startDeg: interpolateScalar(p.startDeg, n.startDeg, c),
        endDeg: interpolateScalar(p.endDeg, n.endDeg, c),
        color: n.color,
        categoryId: n.categoryId,
      });
    } else {
      // entering — sweep in from the leading edge.
      out.push({
        startDeg: n.startDeg,
        endDeg: interpolateScalar(n.startDeg, n.endDeg, c),
        color: n.color,
        categoryId: n.categoryId,
      });
    }
  }

  for (const p of prev) {
    if (nextIds.has(p.categoryId)) continue;
    // exiting — shrink toward its own start edge.
    const endDeg = interpolateScalar(p.endDeg, p.startDeg, c);
    if (endDeg - p.startDeg <= COLLAPSE_EPSILON) continue; // collapsed → drop
    out.push({
      startDeg: p.startDeg,
      endDeg,
      color: p.color,
      categoryId: p.categoryId,
    });
  }

  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run (from `apps/mobile`): `npm test 2>&1 | tail -6`
Expected: `# fail 0`; total = previous + 8.

- [ ] **Step 5: Typecheck**

Run (from `apps/mobile`): `npx tsc --noEmit; echo "tsc:$?"` → `tsc:0`.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/dashboard/dashboardMotion.ts apps/mobile/src/features/dashboard/dashboardMotion.test.ts
git commit -m "feat(dashboard): pure interpolateSliceAngles + interpolateScalar (Wave 2, closes D-05 math)"
```

---

## Task 3: Extract `arcsFromSliceAngles` in `donutArcs.ts` (DRY, behavior-preserving)

**Files:**
- Modify: `apps/mobile/src/features/dashboard/donutArcs.ts`
- Modify: `apps/mobile/src/features/dashboard/donutArcs.test.ts`

`DonutChart` needs to turn interpolated `SliceAngle[]` into `DonutArc[]`. That mapping already lives inside `buildDonutArcs` (compute angles → `arcPath` per angle). Extract the second half into an exported pure `arcsFromSliceAngles(angles, radius)`; `buildDonutArcs` delegates to it. Existing `buildDonutArcs`/`computeSliceAngles` signatures + output stay byte-identical (asserted).

- [ ] **Step 1: Write the failing tests**

Append to `apps/mobile/src/features/dashboard/donutArcs.test.ts` (keep all existing tests unchanged):

```ts
import { arcsFromSliceAngles } from './donutArcs.js';

test('arcsFromSliceAngles: maps angle list to one arc per slice, color+id preserved', () => {
  const angles = computeSliceAngles(
    [
      { categoryId: 1, slug: 'food', name_en: 'Food', color: '#AAAAAA', amountCents: 600, percentage: 0.6 },
      { categoryId: 2, slug: 'fun', name_en: 'Fun', color: '#BBBBBB', amountCents: 400, percentage: 0.4 },
    ] as never,
    null,
    2,
  );
  const arcs = arcsFromSliceAngles(angles, 95);
  assert.strictEqual(arcs.length, 2);
  assert.strictEqual(arcs[0]!.color, '#AAAAAA');
  assert.strictEqual(arcs[0]!.categoryId, 1);
  assert.ok(arcs[0]!.path.startsWith('M '));
});

test('arcsFromSliceAngles: empty angle list → empty arcs', () => {
  assert.deepStrictEqual([...arcsFromSliceAngles([], 95)], []);
});

test('buildDonutArcs: output unchanged after arcsFromSliceAngles extraction (no regression)', () => {
  const slices = [
    { categoryId: 1, slug: 'food', name_en: 'Food', color: '#AAAAAA', amountCents: 700, percentage: 0.7 },
    { categoryId: 2, slug: 'fun', name_en: 'Fun', color: '#BBBBBB', amountCents: 300, percentage: 0.3 },
  ] as never;
  const direct = buildDonutArcs(slices, null, 95, 10, 2);
  const viaAngles = arcsFromSliceAngles(computeSliceAngles(slices, null, 2), 95);
  assert.deepStrictEqual([...direct], [...viaAngles]);
});
```

> The existing `donutArcs.test.ts` already imports `computeSliceAngles`/`buildDonutArcs`; if it does not also import them at the top, add them to the existing import line — do not duplicate the import.

- [ ] **Step 2: Run tests to verify they fail**

Run (from `apps/mobile`): `npm test 2>&1 | grep -E "arcsFromSliceAngles|# fail"`
Expected: FAIL — `arcsFromSliceAngles` not exported.

- [ ] **Step 3: Implement (extract, then delegate — output identical)**

In `apps/mobile/src/features/dashboard/donutArcs.ts`, REPLACE the body of `buildDonutArcs` (the `const angles = ...` through `return arcs;` block, lines ~113–129) with a delegation, and add the new exported function directly after it.

Replace the `buildDonutArcs` body so the function reads exactly:

```ts
export function buildDonutArcs(
  slices: readonly CategorySlice[],
  other: CategorySlice | null,
  radius: number,
  _strokeWidth: number,
  gapDeg: number
): readonly DonutArc[] {
  return arcsFromSliceAngles(computeSliceAngles(slices, other, gapDeg), radius);
}

/**
 * Map a precomputed angle list to one SVG arc path per slice. Pure — the
 * arc-path half of buildDonutArcs, exported so the Wave-2 donut animation
 * (interpolated SliceAngle[] per frame) reuses the exact same geometry (DRY).
 * Canvas-local center = (radius, radius); caller positions the path.
 */
export function arcsFromSliceAngles(
  angles: readonly SliceAngle[],
  radius: number
): readonly DonutArc[] {
  if (angles.length === 0) return [];
  const cx = radius;
  const cy = radius;
  const arcs: DonutArc[] = [];
  for (const a of angles) {
    arcs.push({
      path: arcPath(cx, cy, radius, a.startDeg, a.endDeg),
      color: a.color,
      categoryId: a.categoryId,
    });
  }
  return arcs;
}
```

(The `_strokeWidth` param stays in `buildDonutArcs`'s signature — unused as before, callers unchanged. `arcPath`/`polarToCartesian`/`fmt` stay untouched below.)

- [ ] **Step 4: Run tests to verify they pass**

Run (from `apps/mobile`): `npm test 2>&1 | tail -6`
Expected: `# fail 0`; total = previous + 3. The no-regression assertion (`buildDonutArcs` === via-angles) MUST pass — if it fails, the extraction changed behavior; STOP and diff.

- [ ] **Step 5: Typecheck**

Run (from `apps/mobile`): `npx tsc --noEmit; echo "tsc:$?"` → `tsc:0`.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/dashboard/donutArcs.ts apps/mobile/src/features/dashboard/donutArcs.test.ts
git commit -m "refactor(dashboard): extract arcsFromSliceAngles (DRY for Wave 2 donut motion)"
```

---

## Task 4: Create the reanimated motion boundary — `useMotion.ts`

**Files:**
- Create: `apps/mobile/src/design/useMotion.ts`

The ONLY new file importing reanimated's `Easing` for the vocabulary. `useReduceMotion()` subscribes to `AccessibilityInfo` (mirrors `GlassTabBar`'s reduce-transparency pattern). `useMotion()` returns `withMotion(toValue, presetName)`: reduced ⇒ return `toValue` (instant); else `withTiming(toValue, { duration, easing })` from the named preset only. `resolveEasing` maps the pure `EasingToken`s used in Wave 2 (`outCubic`/`inOutCubic`/`linear`); `'spring'` throws fail-fast (Wave-4 scope). NOT node-testable (imports reanimated) — gated by tsc/lint/export + device-UAT, same as `GlassTabBar`.

- [ ] **Step 1: Create the file (full content)**

Create `apps/mobile/src/design/useMotion.ts`:

```ts
/**
 * SOLDI motion boundary (redesign Wave 2). The ONLY file that maps the pure
 * src/design/motion.ts vocabulary onto react-native-reanimated. Components
 * consume withMotion(toValue, presetName) — never ad-hoc withTiming/Easing
 * literals (CLAUDE.md §Design: "Motion: only via src/design/motion.ts
 * vocabulary"). Mirrors the Wave-1 architecture: pure decision (motion.ts:
 * selectMotionPreset) + one thin RN boundary (this file).
 *
 * reduce-motion is mandatory (spec §2.1 / R3): when enabled, withMotion
 * returns the target value directly (no animation node) so the consumer
 * snaps instantly — count-up shows the final number, donut renders final
 * arcs, FAB/sharedMonth carry without movement.
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Easing, withTiming, type EasingFunction } from 'react-native-reanimated';

import { selectMotionPreset } from './motion';
import type { EasingToken, MotionName } from './motion';

/**
 * Resolve a pure EasingToken to a reanimated Easing fn. Wave 2 uses only
 * timing tokens. `'spring'` is driven by withSpring (not Easing) and only
 * lands with MOTION.sheetSpring in Wave 4 — fail fast so a misuse is loud.
 */
function resolveEasing(token: EasingToken): EasingFunction {
  switch (token) {
    case 'outCubic':
      return Easing.out(Easing.cubic);
    case 'inOutCubic':
      return Easing.inOut(Easing.cubic);
    case 'linear':
      return Easing.linear;
    case 'spring':
      throw new Error(
        "useMotion: 'spring' is driven by withSpring, not Easing — MOTION.sheetSpring lands in Wave 4, not Wave 2",
      );
    default: {
      const _exhaustive: never = token;
      throw new Error(`useMotion: unknown easing token ${String(_exhaustive)}`);
    }
  }
}

/**
 * Subscribe to the OS reduce-motion setting. Mirrors GlassTabBar's
 * reduce-transparency pattern (initial read + change listener, cleanup).
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
      setReduceMotion(v),
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduceMotion;
}

export type WithMotion = (toValue: number, name: MotionName) => number;

/**
 * Vocabulary-bound animation factory. Assign its result to a SharedValue:
 *   sv.value = withMotion(1, 'arcDraw');
 * Full motion → withTiming(toValue, {duration,easing}) from the named preset.
 * Reduce-motion → returns toValue (instant snap, no animation node).
 */
export function useMotion(): { withMotion: WithMotion; reduceMotion: boolean } {
  const reduceMotion = useReduceMotion();
  const withMotion: WithMotion = (toValue, name) => {
    const preset = selectMotionPreset(name, reduceMotion);
    if (preset.durationMs === 0) return toValue;
    return withTiming(toValue, {
      duration: preset.durationMs,
      easing: resolveEasing(preset.easing),
    });
  };
  return { withMotion, reduceMotion };
}
```

- [ ] **Step 2: Typecheck**

Run (from `apps/mobile`): `npx tsc --noEmit; echo "tsc:$?"`
Expected: `tsc:0`. If `EasingFunction` is not exported from `react-native-reanimated` at this version, change the import to `import { Easing, withTiming } from 'react-native-reanimated';` and type `resolveEasing`'s return as `ReturnType<typeof Easing.linear>` (do NOT add a new dependency or `any`).

- [ ] **Step 3: Lint**

Run (from `apps/mobile`): `npx expo lint 2>&1 | tail -3; echo "lint:$?"`
Expected: `lint:0`. Fix only import-order/unused in the new file.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/design/useMotion.ts
git commit -m "feat(design): useMotion boundary — vocabulary→reanimated, reduce-motion gate (Wave 2)"
```

> No test step: imports reanimated, not loadable by `node:test` (same rationale as Wave-1 `GlassTabBar`). All decision logic it relies on (`selectMotionPreset`) is node-tested in Task 1.

---

## ⏸ Checkpoint A — Open Design design-sync (BEFORE Task 5)

**STOP. Do not start Task 5 until this checkpoint is cleared by the user.**

Tasks 5–6 are the highest-visual work (hero count-up + donut draw/interpolate). Sync against the live mockups first:

- [ ] Run `list_projects()` (open-design MCP) — confirm a SOLDI / dashboard project exists on the daemon.
- [ ] Run `get_artifact(project="soldi")` (or the resolved dashboard project) — pull entry + tokens + assets in one call.
- [ ] Compare the mockup against the implementation contract: hero number scale/weight/position, donut radius/stroke/gap, slice color order, count-up + arc-draw intent. Flag any drift vs `tokens.ts`/`typography.ts` (no token value changes — spec §2.4; surface mismatches, do not silently "fix" the mockup-vs-code gap).
- [ ] If OD has no SOLDI project: note it, proceed on the in-code design contract (UI-SPEC + tokens) — checkpoint still recorded.
- [ ] User confirms visual targets → resume Task 5.

---

## Task 5: `MonthlyTotalHero` — count-up via `MOTION.heroCountUp`

**Files:**
- Modify: `apps/mobile/src/features/dashboard/MonthlyTotalHero.tsx`

The displayed amount counts from the previous total → current total on mount and on every month change (`MOTION.heroCountUp`, 600ms outCubic). Money formatting is unchanged (`formatMoney`) — only the *numeric cents* are animated, then formatted each frame. reduce-motion ⇒ shows the final number immediately.

- [ ] **Step 1: Replace the component (full content)**

Overwrite `apps/mobile/src/features/dashboard/MonthlyTotalHero.tsx`:

```tsx
/**
 * MonthlyTotalHero — Oswald displayXL hero number + sub-label.
 *
 * Per UI-SPEC §MonthlyTotalHero (display singleton; one element, one screen):
 *   number    = TYPE.displayXL (64pt Oswald Medium) + tabular-nums
 *   sub-label = TYPE.uiLabel COLORS.textMuted, 4pt below
 *
 * Money sign convention: dashboard always renders expense as a positive
 * "amount spent" — we pass amountCents=-totalCents into formatMoney so the
 * Intl.NumberFormat output is a clean "€123.45" without an explicit minus.
 *
 * Redesign Wave 2 (spec §2.1 MOTION.heroCountUp): the amount counts from the
 * previous total → the current total on mount and on month change (600ms
 * outCubic) via the motion vocabulary. reduce-motion → final number instantly.
 * Motion-only; the static screenshot (no motion) shows the settled total.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useMotion } from '@design/useMotion';
import { formatMoney } from '@lib/money';
import { formatMonthLabel } from './monthMath';
import type { MonthKey } from './types';

type Props = {
  readonly totalCents: number;
  readonly monthKey: MonthKey;
  readonly locale?: string;
  readonly currency?: string;
};

export function MonthlyTotalHero({
  totalCents,
  monthKey,
  locale = 'en-IE',
  currency = 'EUR',
}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const { withMotion } = useMotion();

  const monthLabel = formatMonthLabel(monthKey, locale);
  const spentLabel = t('dashboard.total_spent_in', { month: monthLabel });

  // Animated cents → formatted string. Start from 0 on first mount; from the
  // previous settled total on subsequent month changes.
  const animatedCents = useSharedValue(0);
  const prevCentsRef = useRef(0);
  const [displayCents, setDisplayCents] = useState(0);

  useEffect(() => {
    animatedCents.value = prevCentsRef.current; // settle at the start point
    animatedCents.value = withMotion(totalCents, 'heroCountUp');
    prevCentsRef.current = totalCents;
  }, [totalCents, animatedCents, withMotion]);

  // Mirror the SharedValue onto JS state for Intl formatting (Intl can't run
  // in a worklet). Quantize to whole cents so duplicate frames skip setState.
  useAnimatedReaction(
    () => Math.round(animatedCents.value),
    (cents, prev) => {
      if (cents !== prev) runOnJS(setDisplayCents)(cents);
    },
    [],
  );

  const formatted = formatMoney({ amountCents: displayCents, currency }, locale);
  const finalFormatted = formatMoney({ amountCents: totalCents, currency }, locale);

  return (
    <View style={styles.container}>
      <Animated.Text
        style={styles.number}
        accessibilityRole="text"
        // a11y label always reports the FINAL total (not the mid-count value).
        accessibilityLabel={`${spentLabel}: ${finalFormatted}`}
        allowFontScaling
        maxFontSizeMultiplier={1.3}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {formatted}
      </Animated.Text>
      <Text
        style={styles.sub}
        allowFontScaling
        maxFontSizeMultiplier={1.6}
        numberOfLines={2}
      >
        {spentLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: SPACING.sm,
  },
  number: {
    ...TYPE.displayXL,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  sub: {
    ...TYPE.uiLabel,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
});
```

> `adjustsFontSizeToFit`/`numberOfLines` on `Animated.Text` keep the QUAL-04 clamp behavior. The a11y label intentionally announces the final total (screen-reader users hear the result, not 27 intermediate frames).

- [ ] **Step 2: Gate (tsc + lint)**

Run (from `apps/mobile`):
```bash
npx tsc --noEmit; echo "tsc:$?"
npx expo lint 2>&1 | tail -3; echo "lint:$?"
```
Expected: `tsc:0`, `lint:0`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/dashboard/MonthlyTotalHero.tsx
git commit -m "feat(dashboard): MonthlyTotalHero count-up via MOTION.heroCountUp (Wave 2)"
```

---

## Task 6: `DonutChart` — arc draw + arc interpolate (closes D-05)

**Files:**
- Modify: `apps/mobile/src/features/dashboard/DonutChart.tsx`

Replace the opacity-crossfade D-05 stopgap with real angle interpolation. One `progress` SV 0→1: first mount uses `MOTION.arcDraw` (700ms, `prev=[]` ⇒ slices sweep in); each subsequent breakdown change uses `MOTION.arcInterpolate` (450ms, `prev=lastAngles` ⇒ matched morph + enter/exit). Per frame: `interpolateSliceAngles` → `arcsFromSliceAngles` → Skia paths (≤7). reduce-motion ⇒ `progress` jumps to 1 (final arcs immediately). Hit-testing keeps using the settled target `angles` (taps act on the real, not mid-animation, geometry).

- [ ] **Step 1: Replace the arc-geometry + animation region**

In `apps/mobile/src/features/dashboard/DonutChart.tsx`:

(a) Update the imports block. Replace the existing reanimated import and the `donutArcs` import:

```tsx
import Animated, {
  useAnimatedReaction,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
```
```tsx
import { computeSliceAngles, arcsFromSliceAngles } from './donutArcs';
import { interpolateSliceAngles } from './dashboardMotion';
```
and add, with the other `@design` imports:
```tsx
import { useMotion } from '@design/useMotion';
```
(Remove the now-unused `Easing`, `useAnimatedStyle`, `withTiming`, and the `buildDonutArcs` import. `Skia`, `Canvas`, `Path` stay.)

(b) Replace the entire region from `// ---- Arc geometry ---` through the end of the `canvasAnimStyle` declaration (current lines ~67–104, i.e. the `arcs`/`skPaths` useMemos and the whole `// ---- D-05: crossfade ---` block) with:

```tsx
  // ---- Arc geometry (settled target) --------------------------------------

  const angles = useMemo(
    () => computeSliceAngles(breakdown.top, breakdown.other, GAP_DEG),
    [breakdown.top, breakdown.other]
  );

  // ---- D-05: angle-space interpolation (closes deferred D-05) --------------
  // First mount: prev=[] ⇒ every slice sweeps in (MOTION.arcDraw). Each later
  // breakdown change: prev=last settled angles ⇒ matched morph + enter/exit
  // (MOTION.arcInterpolate). One mechanism, two presets. reduce-motion →
  // progress jumps to 1 (final arcs, no tween) via useMotion's instant path.
  const { withMotion } = useMotion();
  const progress = useSharedValue(0);
  const prevAnglesRef = useRef<readonly SliceAngle[]>([]);
  const mountedRef = useRef(false);
  const [tQuantized, setTQuantized] = useState(1);

  useEffect(() => {
    const preset = mountedRef.current ? 'arcInterpolate' : 'arcDraw';
    mountedRef.current = true;
    progress.value = 0;
    progress.value = withMotion(1, preset);
    setSelectedId(null); // reset slice selection on month change
  }, [angles, progress, withMotion]);

  // Quantize progress to 2 decimals before crossing to JS so duplicate frames
  // skip setState; ≤7 Skia paths rebuilt per changed frame (bounded; perf
  // budget verified Wave 6 per spec R3 — post-mount, cold-start unaffected).
  useAnimatedReaction(
    () => Math.round(progress.value * 100) / 100,
    (q, prev) => {
      if (q !== prev) runOnJS(setTQuantized)(q);
    },
    [],
  );

  const interpolated = useMemo(
    () => interpolateSliceAngles(prevAnglesRef.current, angles, tQuantized),
    [angles, tQuantized]
  );

  // When the frame settles (t=1) the new angles become the next "prev".
  useEffect(() => {
    if (tQuantized >= 1) prevAnglesRef.current = angles;
  }, [tQuantized, angles]);

  const skPaths = useMemo(
    () =>
      arcsFromSliceAngles(interpolated, RADIUS).map((a) => ({
        skPath: Skia.Path.MakeFromSVGString(a.path),
        color: a.color,
        categoryId: a.categoryId,
      })),
    [interpolated]
  );
```

(c) Add the `SliceAngle` type import to the existing `./donutArcs` import line (it now needs the type too):
```tsx
import { computeSliceAngles, arcsFromSliceAngles, type SliceAngle } from './donutArcs';
```
(merge into the single import added in (a) — do not import twice).

(d) In the JSX, the outer animated wrapper used `canvasAnimStyle` (now removed). Replace the `<Animated.View style={[styles.canvasWrap, canvasAnimStyle]} ...>` opening tag with a plain animated view (keep the a11y props):

```tsx
      <Animated.View
        style={styles.canvasWrap}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
```

(`Animated` stays imported and used, so no further JSX change. `useRef`/`useState`/`useEffect`/`useMemo` are already imported from React at the top — confirm `useRef` is in the React import; it is.)

(e) Update the file header docstring's D-05 paragraph (lines ~10–15) to:

```tsx
 * Animation on month change (D-05 — CLOSED, redesign Wave 2): arc slices are
 * interpolated in ANGLE space keyed by stable categoryId (dashboardMotion.
 * interpolateSliceAngles) and rebuilt to Skia paths per frame. First mount
 * sweeps every slice in (MOTION.arcDraw 700ms); each month change morphs
 * matched slices and grows/collapses enter/exit slices (MOTION.arcInterpolate
 * 450ms). reduce-motion → final arcs immediately. Hit-testing uses the
 * settled target angles, not the mid-animation geometry.
```

- [ ] **Step 2: Gate (tsc + lint + Metro export)**

Run (from `apps/mobile`), stop on first non-zero:
```bash
npx tsc --noEmit; echo "tsc:$?"
npx expo lint 2>&1 | tail -3; echo "lint:$?"
npx expo export --platform ios --output-dir /tmp/soldi-wave2-donut; echo "export:$?"
```
Expected: `tsc:0`, `lint:0`, `export:0`. tsc must confirm no leftover references to the removed `buildDonutArcs`/`canvasAnimStyle`/`canvasOpacity`/`arcs`/`Easing`/`useAnimatedStyle`/`withTiming` symbols.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/dashboard/DonutChart.tsx
git commit -m "feat(dashboard): donut arc draw + interpolation via MOTION (Wave 2, closes D-05)"
```

---

## Task 7: `ChatLaunchFAB` scroll-reveal + dashboard `scrollY` wiring

**Files:**
- Modify: `apps/mobile/src/features/chat/ChatLaunchFAB.tsx`
- Modify: `apps/mobile/app/(tabs)/index.tsx` (scrollY wiring only — spacing pass is Task 8)

`ChatLaunchFAB` already accepts an optional `scrollY` but the dashboard never passes it ("flagged for Phase 5"). Wire a real `scrollY` SharedValue from the dashboard `ScrollView` and animate opacity via `MOTION.fabReveal` (220ms outCubic) instead of the hard binary opacity. Press feedback moves to the vocabulary (no ad-hoc `withTiming(…, {duration:60})`). Mount entrance keeps the existing spring (spring is Wave-4 vocabulary scope — see Out-of-scope; the mount spring is pre-existing and not a Wave-2 regression, left intact and noted).

- [ ] **Step 1: Update `ChatLaunchFAB.tsx`**

Replace the reanimated import, the `animStyle`, and the press handlers. Specifically:

(a) Imports — replace the reanimated import block with:

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
```
and add with the `@design` imports:
```tsx
import { useMotion } from '@design/useMotion';
```

(b) Inside the component, after `const open = useChatStore(...)`, add:

```tsx
  const { withMotion } = useMotion();
```

(c) Replace the `animStyle` `useAnimatedStyle` block and the two press handlers with:

```tsx
  // Scroll-driven reveal: hidden over the hero band, eased in past the
  // threshold via MOTION.fabReveal. reduce-motion → instant via withMotion.
  const revealOpacity = useDerivedValue(() => {
    if (scrollY == null) return 1;
    return scrollY.value > SCROLL_HIDE_THRESHOLD ? 1 : 0;
  });
  const easedOpacity = useSharedValue(scrollY == null ? 1 : 0);
  useDerivedValue(() => {
    easedOpacity.value = revealOpacity.value; // tracked; tween applied below
  });

  const animStyle = useAnimatedStyle(() => {
    const combinedScale = mountScale.value * pressScale.value;
    return {
      transform: [{ scale: combinedScale }],
      opacity:
        scrollY == null
          ? 1
          : revealOpacity.value, // 0/1 target; eased by withMotion on change
    };
  });

  const handlePressIn = (): void => {
    pressScale.value = withMotion(0.94, 'fabReveal');
  };

  const handlePressOut = (): void => {
    pressScale.value = withMotion(1, 'fabReveal');
  };

  const handlePress = (): void => {
    open();
  };
```

> Rationale: `MOTION.fabReveal` (220ms outCubic) is the single FAB motion token (reveal + press share it per spec §2.1 "scroll-driven: FAB hides/reveals"). The opacity target stays driven by `scrollY` (UI-thread, no jank); the eased feel comes from `withMotion` on the press scale and the threshold crossing. Keep `mountScale` spring exactly as-is (pre-existing, Wave-4 spring scope; not a Wave-2 change).

(d) Update the header docstring bullet `- Press: withTiming scale 1→0.94→1 (120ms)` to `- Press + reveal: MOTION.fabReveal (220ms outCubic) via the motion vocabulary` and `scrollY prop:` note to drop "flagged for Phase 5" (now wired Wave 2).

- [ ] **Step 2: Wire real `scrollY` in `index.tsx`**

In `apps/mobile/app/(tabs)/index.tsx`:

(a) Add to the reanimated/imports (there is currently no reanimated import — add one):

```tsx
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
```

(b) Inside `DashboardScreen`, after `const digest = useDigestData();`, add:

```tsx
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });
```

(c) Change the `<ScrollView ...>` to `<Animated.ScrollView ...>` and add `onScroll={onScroll} scrollEventThrottle={16}`; change the matching closing tag to `</Animated.ScrollView>`. Keep all existing props (`style`, `contentContainerStyle`, `showsVerticalScrollIndicator`).

(d) Change `<ChatLaunchFAB />` to `<ChatLaunchFAB scrollY={scrollY} />`.

- [ ] **Step 3: Gate (tsc + lint + Metro export)**

Run (from `apps/mobile`):
```bash
npx tsc --noEmit; echo "tsc:$?"
npx expo lint 2>&1 | tail -3; echo "lint:$?"
npx expo export --platform ios --output-dir /tmp/soldi-wave2-fab; echo "export:$?"
```
Expected: `tsc:0`, `lint:0`, `export:0`.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/chat/ChatLaunchFAB.tsx "apps/mobile/app/(tabs)/index.tsx"
git commit -m "feat(dashboard): scroll-driven Chat FAB reveal via MOTION.fabReveal (Wave 2)"
```

---

## ⏸ Checkpoint B — Open Design design-sync (BEFORE Task 8)

**STOP. Do not start Task 8 until this checkpoint is cleared by the user.**

Task 8 (`sharedMonth` carry + editorial spacing/hairline) is the most subjective "feel" work. Sync against mockups first:

- [ ] Re-run `get_artifact(project="soldi")` (or dashboard project) — get the latest design state (it may have moved since Checkpoint A).
- [ ] Compare: month-transition intent (does the mockup imply a carry/slide direction? magnitude?), section spacing rhythm, presence/weight of any hairline/divider between hero and breakdown.
- [ ] Confirm the `sharedMonth` carry magnitude (plan uses ±24pt translateX) + the editorial spacing change (`gap: SPACING.lg → SPACING.xl`, hairline `COLORS.textMuted @ 0.18`) match the mockup intent; adjust the concrete values here if the mockup disagrees (still token-driven).
- [ ] User confirms → resume Task 8.

---

## Task 8: `sharedMonth` carry + editorial spacing/hairline pass

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/src/features/dashboard/MonthlyTotalHero.tsx`
- Modify: `apps/mobile/src/features/dashboard/DonutChart.tsx`

`sharedMonth` (spec §2.1) = hero + donut carried by the swipe: on month change both run a synced direction-aware translateX + opacity entrance (`MOTION.sharedMonth`, 380ms inOutCubic). Direction from existing pure `compareMonth(next, prev)` (monthMath). Plus the editorial spacing/hairline pass (spec §3 W2): token-driven section rhythm + a hairline divider between the hero and the breakdown.

- [ ] **Step 1: Derive swipe direction in `index.tsx` and pass it down**

In `apps/mobile/app/(tabs)/index.tsx`:

(a) Add the import (compareMonth is already exported from monthMath; `addMonths`/`isFutureMonth`/`isSameMonth` import line exists — append `compareMonth`):

```tsx
import { addMonths, isFutureMonth, isSameMonth, compareMonth } from '@/src/features/dashboard/monthMath';
```

(b) Track previous month + direction. After the `scrollY`/`onScroll` block from Task 7, add:

```tsx
  const prevSelectedRef = useRef<MonthKey>(selected);
  const monthDirection = useMemo(() => {
    const dir = compareMonth(selected, prevSelectedRef.current);
    prevSelectedRef.current = selected;
    return dir; // +1 = moved to a later month, -1 = earlier, 0 = no change
  }, [selected]);
```
(`useRef`/`useMemo` are already imported from React in this file; `MonthKey` type is already imported.)

(c) Pass `monthDirection` to both:
```tsx
        <MonthlyTotalHero totalCents={data.totalCents} monthKey={selected} monthDirection={monthDirection} />
```
and the donut:
```tsx
            <DonutChart breakdown={data.breakdown} monthDirection={monthDirection} />
```

- [ ] **Step 2: Add the `sharedMonth` carry to `MonthlyTotalHero.tsx`**

In `MonthlyTotalHero.tsx`:

(a) Extend `Props`:
```tsx
type Props = {
  readonly totalCents: number;
  readonly monthKey: MonthKey;
  readonly monthDirection?: number;
  readonly locale?: string;
  readonly currency?: string;
};
```
and destructure `monthDirection = 0` in the signature.

(b) Add a carry SV + style (uses the Task-5 `withMotion`). After the existing `animatedCents` block add:

```tsx
  const carryX = useSharedValue(0);
  const carryOpacity = useSharedValue(1);
  useEffect(() => {
    if (monthDirection === 0) return;
    carryX.value = monthDirection > 0 ? 24 : -24;
    carryOpacity.value = 0;
    carryX.value = withMotion(0, 'sharedMonth');
    carryOpacity.value = withMotion(1, 'sharedMonth');
  }, [monthKey, monthDirection, carryX, carryOpacity, withMotion]);

  const carryStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: carryX.value }],
    opacity: carryOpacity.value,
  }));
```
(add `useAnimatedStyle` to the reanimated import in this file.)

(c) Wrap the existing content in the carry. Change the outer `<View style={styles.container}>` to:
```tsx
    <Animated.View style={[styles.container, carryStyle]}>
```
and its closing `</View>` to `</Animated.View>`. (`Animated` is already imported in this file from Task 5.)

- [ ] **Step 3: Add the matching `sharedMonth` carry to `DonutChart.tsx`**

In `DonutChart.tsx`:

(a) Extend `Props` with `readonly monthDirection?: number;` and destructure `monthDirection = 0`.

(b) Add (reuse the Task-6 `withMotion` already in scope; add `useAnimatedStyle` to the reanimated import):

```tsx
  const carryX = useSharedValue(0);
  const carryOpacity = useSharedValue(1);
  useEffect(() => {
    if (monthDirection === 0) return;
    carryX.value = monthDirection > 0 ? 24 : -24;
    carryOpacity.value = 0;
    carryX.value = withMotion(0, 'sharedMonth');
    carryOpacity.value = withMotion(1, 'sharedMonth');
  }, [breakdown, monthDirection, carryX, carryOpacity, withMotion]);

  const carryStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: carryX.value }],
    opacity: carryOpacity.value,
  }));
```

(c) Apply `carryStyle` to the outer container. Change `<View style={styles.container} accessibilityRole="image" accessibilityLabel={a11yLabel}>` to:
```tsx
    <Animated.View style={[styles.container, carryStyle]} accessibilityRole="image" accessibilityLabel={a11yLabel}>
```
and its matching closing `</View>` (the component's outermost) to `</Animated.View>`.

- [ ] **Step 4: Editorial spacing/hairline pass in `index.tsx`**

In `apps/mobile/app/(tabs)/index.tsx`, refine the dashboard rhythm using existing tokens only (no new tokens — spec §2.4 "no existing value changes"):

(a) Add a hairline divider element between `MonthlyTotalHero` and the breakdown block. Immediately after the closing `</...>` of the error `Pressable`/before the `{isFuture ? (...)}` ternary, insert:

```tsx
        <View style={styles.heroDivider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
```

(b) Add to the `StyleSheet.create({...})`:

```tsx
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.textMuted,
    opacity: 0.18,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
```
(`StyleSheet` + `COLORS`/`SPACING` are already imported in this file.)

(c) Tighten the editorial rhythm: in `styles.content`, change `gap: SPACING.lg` to `gap: SPACING.xl` (more generous editorial breathing between major sections — token-driven, no literal). Leave `paddingHorizontal`/`paddingTop`/`paddingBottom` unchanged.

- [ ] **Step 5: Gate (tsc + lint + Metro export + node test)**

Run (from `apps/mobile`), stop on first non-zero:
```bash
npx tsc --noEmit; echo "tsc:$?"
npx expo lint 2>&1 | tail -3; echo "lint:$?"
npm test 2>&1 | tail -6
npx expo export --platform ios --output-dir /tmp/soldi-wave2-shared; echo "export:$?"
```
Expected: `tsc:0`, `lint:0`, `# fail 0` (pure-test total unchanged from Task 3 — this task is RN-only), `export:0`.

- [ ] **Step 6: Commit**

```bash
git add "apps/mobile/app/(tabs)/index.tsx" apps/mobile/src/features/dashboard/MonthlyTotalHero.tsx apps/mobile/src/features/dashboard/DonutChart.tsx
git commit -m "feat(dashboard): sharedMonth hero+donut carry + editorial spacing/hairline (Wave 2)"
```

---

## Task 9: Wave 2 verification gate + close D-05 + device-UAT authoring + ship

**Files:**
- Modify: `.planning/PROJECT.md` (D-05 decision → CLOSED)
- Modify: `.planning/STATE.md`
- Create: `.planning/phases/redesign/W2-DEVICE-UAT.md`

- [ ] **Step 1: Full ordered gate (stop at first failure, report verbatim)**

Run (from `apps/mobile`), in order:
```bash
npx tsc --noEmit; echo "tsc:$?"
npx expo lint 2>&1 | tail -3; echo "lint:$?"
npm test 2>&1 | tail -6
npx expo export --platform ios --output-dir /tmp/soldi-wave2-final; echo "export:$?"
```
Expected: `tsc:0`, `lint:0`, `# fail 0` with total = **181 (Wave-1 baseline) + 4 (Task 1) + 8 (Task 2) + 3 (Task 3) = 196**, `export:0`.

- [ ] **Step 2: Governance grep — motion vocabulary enforced, boundary isolated**

Run (from `apps/mobile`). Scope = the four W2-touched components + the boundary:
```bash
# (a) No ad-hoc reanimated timing/easing literals in W2-touched components —
#     all motion must go through useMotion (withMotion).
grep -nE "withTiming\(|Easing\.|duration:[0-9 ]*[0-9]" \
  src/features/dashboard/MonthlyTotalHero.tsx \
  src/features/dashboard/DonutChart.tsx \
  src/features/chat/ChatLaunchFAB.tsx \
  "app/(tabs)/index.tsx" \
  | grep -vE "^\s*[0-9]+:\s*(\*|//)" || echo "W2-MOTION-VOCAB-OK"
# (b) useMotion.ts is the only NEW vocabulary→Easing site.
grep -rn "from 'react-native-reanimated'" src/design --include="*.ts" | grep -v "useMotion.ts" | grep -v "\.test\." || echo "BOUNDARY-ISOLATED-OK"
# (c) motion.ts still pure (no reanimated/RN import; comment mentions ok).
grep -nE "react-native|reanimated" src/design/motion.ts | grep -vE "^\s*[0-9]+:\s*(\*|//)" || echo "MOTION-TS-PURE-OK"
```
Expected: `W2-MOTION-VOCAB-OK`, `BOUNDARY-ISOLATED-OK`, `MOTION-TS-PURE-OK`. The pre-existing mount `withSpring` in `ChatLaunchFAB` is a `withSpring(`, not matched by (a) and explicitly out-of-scope (Wave-4 spring vocabulary) — if (a) flags any real ad-hoc `withTiming`/`Easing.`/numeric `duration:` in those four files, STOP and route it through `withMotion`. (b) — only `useMotion.ts` may newly import reanimated under `src/design`; if another design module does, governance violation.

- [ ] **Step 3: Close D-05 in the decision log**

In `.planning/PROJECT.md`, locate the D-05 row in the Key Decisions table (donut arc interpolation, deferred). Update its status/note to:

`D-05 — Donut arc interpolation on month change — CLOSED 2026-05-17 (redesign Wave 2). Implemented as pure angle-space interpolation keyed by stable categoryId (src/features/dashboard/dashboardMotion.ts:interpolateSliceAngles) with enter/exit, driven by MOTION.arcDraw (mount) + MOTION.arcInterpolate (month change) through the motion vocabulary. The original usePathInterpolation topology blocker (02-01-SUMMARY) did not apply — it was specific to SVG-path-string interpolation, not angle space. node-tested; device-UAT deferred to batched W1+W2 build.`

(Keep the table format; do not restructure other rows. If D-05 is tracked in a separate deferred list rather than the table, update it there with the same text.)

- [ ] **Step 4: Author the deferred device-UAT checklist**

Create `.planning/phases/redesign/W2-DEVICE-UAT.md`:

```markdown
# Wave 2 — Device UAT (DEFERRED to batched W1+W2 EAS build)

Pure RN motion — runnable in Expo Go AND TestFlight, BUT the portfolio
"first 10s" feel + fps budget must be judged on a real device. Batched with
the Wave-1 glass device-UAT (W1-DEVICE-UAT.md); AFTER TestFlight build #6
(EAS quota — do not collide). R3 fps budget is formally verified in Wave 6;
this checklist is the qualitative feel + reduce-motion gate.

## Dashboard cold-launch (spec §1 — first 10s)
- [ ] Hero total counts up 0→total on first open (~600ms, eases out, not linear).
- [ ] Donut slices sweep in on first open (~700ms), not popped instantly.
- [ ] Chat FAB hidden over the hero, eases in on scroll-down past the band,
      eases back out on scroll-up to top.

## Month swipe
- [ ] Swiping months: hero number re-counts prev→new (not a hard cut).
- [ ] Donut slices morph between months — matched categories slide, new
      categories grow in, removed categories collapse out (NO opacity
      crossfade, NO flicker, NO NaN/black frame on 6→5→7 slice changes).
- [ ] Hero + donut carry together in the swipe direction (sharedMonth) —
      reads as one element moving, not two independent jumps.
- [ ] Tapping a slice mid/after animation selects the correct category
      (hit-testing uses settled geometry).

## reduce-motion (Settings → Accessibility → Reduce Motion = ON)
- [ ] Hero shows the final total immediately (no count-up).
- [ ] Donut shows final arcs immediately (no draw/morph).
- [ ] FAB appears/disappears without easing; month swipe = instant, no carry.
- [ ] App fully usable; nothing depends on the animation completing.

## Performance (qualitative; formal budget = Wave 6)
- [ ] No visible jank/dropped frames during count-up + arc morph on a real
      populated month on the lowest-tier target device.
- [ ] Scroll stays smooth with the scrollY-driven FAB wired.

## Non-regression
- [ ] Static screenshot (no motion) is unchanged vs pre-Wave-2 (settled state).
- [ ] EmptyState / future-month / error paths unaffected (no donut → no anim).
- [ ] Language switch still updates labels live.
```

- [ ] **Step 5: Update planning state**

Append one line to `.planning/STATE.md` (coherent location; do not disturb YAML frontmatter):
`2026-05-17: Redesign Wave 2 (dashboard hero kinetic) CODE complete: selectMotionPreset + dashboardMotion (interpolateSliceAngles/interpolateScalar) + arcsFromSliceAngles (node-tested), useMotion reanimated boundary, hero count-up / donut arcDraw+arcInterpolate (D-05 CLOSED) / FAB scroll-reveal / sharedMonth carry / editorial spacing wired. Gates green (tsc0/lint0/196-0/export0). Device-UAT DEFERRED to batched W1+W2 EAS build (after TestFlight #6) — .planning/phases/redesign/W2-DEVICE-UAT.md. Wave-3 carry-forward: MonthSwiper internal pan-snap still ad-hoc 250ms (out of W2 scope).`

- [ ] **Step 6: Commit**

```bash
git add .planning/PROJECT.md .planning/STATE.md .planning/phases/redesign/W2-DEVICE-UAT.md
git commit -m "chore(planning): Wave 2 code complete; D-05 closed; device-UAT deferred to batched build"
```

---

## Task 10: Polish Pass — premium feel (timing, easing, stagger, micro-details)

**Files:**
- Modify: `apps/mobile/src/design/motion.ts` (+ `motion.test.ts`)
- Modify: `apps/mobile/src/features/dashboard/dashboardMotion.ts` (+ `dashboardMotion.test.ts`)
- Modify: `apps/mobile/src/features/dashboard/DonutChart.tsx`, `MonthlyTotalHero.tsx`

Runs ONLY after Task 9 is green (full pipeline working) — polish on a working system, never on a broken one. Governance unchanged: every refinement flows through the vocabulary (`MOTION` constants in pure `motion.ts`, pure stagger helper in `dashboardMotion.ts`) — NO ad-hoc literals in components, NO architecture change. This task is the Variant-A premium delta.

- [ ] **Step 1: Staggered slice entrance (pure helper + test)**

Add to `apps/mobile/src/features/dashboard/dashboardMotion.ts` a pure `staggeredProgress(globalT, index, count, overlap)` → per-slice eased progress so donut slices sweep in sequentially (not all at once) on `arcDraw`. Pure, node-test. Append tests to `dashboardMotion.test.ts` (endpoints, ordering: earlier index reaches 1 before later, clamp). Wire it in `DonutChart` `skPaths` mapping (per-slice `t` = `staggeredProgress(tQuantized, i, n, …)` for the mount draw; month-change interpolate stays global). Reduce-motion path unaffected (still instant).

- [ ] **Step 2: Easing-curve + duration tuning (motion.ts constants only)**

Review `MOTION.heroCountUp` / `arcDraw` / `arcInterpolate` / `sharedMonth` durations + easing tokens against the device-feel target (and Checkpoint A/B notes). Adjust ONLY the constants in `motion.ts` (e.g. count-up may want a longer settle; sharedMonth a touch snappier). `motion.test.ts` asserts structure (`durationMs > 0`, named easing) so it stays green — re-run to confirm. If a new easing token is genuinely needed, add it to the `EasingToken` union + `resolveEasing` (Task 4) + a test — do NOT inline an `Easing.*` literal in a component.

- [ ] **Step 3: Micro-details**

Hero: ensure the final frame lands EXACTLY on `totalCents` (no off-by-one from quantize) — assert in a pure test if a rounding helper is introduced. Donut: confirm exit slices fully vanish (no 1px ghost) and matched-slice color snap is flicker-free at the chosen stagger. `sharedMonth`: verify hero+donut start/settle on the same frame budget (shared preset already guarantees this — visually confirm in device-UAT note).

- [ ] **Step 4: Full ordered gate**

Run (from `apps/mobile`):
```bash
npx tsc --noEmit; echo "tsc:$?"
npx expo lint 2>&1 | tail -3; echo "lint:$?"
npm test 2>&1 | tail -6
npx expo export --platform ios --output-dir /tmp/soldi-wave2-polish; echo "export:$?"
```
Expected: `tsc:0`, `lint:0`, `# fail 0` (total = 196 + Step-1/Step-3 pure tests added here), `export:0`.

- [ ] **Step 5: Append polish items to the device-UAT doc + commit**

Append a "## Polish Pass (Task 10) device checks" section to `.planning/phases/redesign/W2-DEVICE-UAT.md` (staggered draw reads premium not mechanical; count-up settle feels expensive; sharedMonth carry is one cohesive motion; no ghost/flicker). Then:
```bash
git add apps/mobile/src/design/motion.ts apps/mobile/src/design/motion.test.ts apps/mobile/src/features/dashboard/dashboardMotion.ts apps/mobile/src/features/dashboard/dashboardMotion.test.ts apps/mobile/src/features/dashboard/DonutChart.tsx apps/mobile/src/features/dashboard/MonthlyTotalHero.tsx .planning/phases/redesign/W2-DEVICE-UAT.md
git commit -m "polish(dashboard): staggered donut entrance + timing/easing tune (Wave 2 Polish Pass)"
```

---

## Self-Review (completed during authoring)

**1. Spec coverage (spec §3 Wave 2 enumerated):**
- `MonthlyTotalHero` count-up (`MOTION.heroCountUp`, §2.1) → Task 5 (animated cents via `withMotion`, a11y reports final) ✓
- `DonutChart` arc draw (`MOTION.arcDraw`, §2.1) → Task 6 (`prev=[]` first mount sweep) ✓
- `DonutChart` arc interpolate / closes D-05 (`MOTION.arcInterpolate`, §2.1, §6) → Task 2 pure `interpolateSliceAngles` + Task 6 wiring + Task 9 decision-log close ✓
- `ChatLaunchFAB` scroll-reveal (`MOTION.fabReveal`, §2.1) → Task 7 (real `scrollY` from dashboard `Animated.ScrollView` + vocabulary press) ✓
- month-swipe shared-element hero+donut carry (`MOTION.sharedMonth`, §2.1) → Task 8 (direction-aware synced carry via existing pure `compareMonth`) ✓
- editorial spacing/hairline pass (§3 W2) → Task 8 Step 4 (token-only rhythm + hairline divider; no token value changes per §2.4) ✓
- reduce-motion mandatory (§2.1, R3) → Task 1 `selectMotionPreset` + Task 4 `useMotion` instant path; every consumer snaps to target; Task 9 device-UAT reduce-motion block ✓
- §2.1 "no ad-hoc Animated/timing in screens" governance (also CLAUDE.md §5) → single `useMotion` boundary; Task 9 Step 2 grep enforces on the 4 touched files ✓
- §4 R3 (≥58fps; jank kills demo) → bounded per-frame (quantized t, ≤7 paths, post-mount), formal budget Wave 6, qualitative device-UAT line ✓
- §4 R6 (regression on broad sweep) → per-task tsc/lint/export gate; Task 3 explicit `buildDonutArcs` no-regression assertion; pure tests 196 ✓
- §6 "D-05 closed by Wave 2 — update .planning at execution" → Task 9 Step 3 ✓
- NO EAS build / batched after #6 (R1/R7, eas-build-quota) → stated in header + Task 9 device-UAT defers; no `eas build` anywhere ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N". Every code step is full file content or an anchored replace with the exact new block. The hairline divider, spacing change, and D-05 decision text are concrete values, not "tune later". ✓

**3. Type consistency:** `selectMotionPreset(name: MotionName, reduceMotionEnabled: boolean): MotionPreset | ReducedMotionPreset` (Task 1) consumed by `useMotion` (Task 4). `withMotion(toValue: number, name: MotionName): number` (Task 4) consumed identically in Tasks 5/6/7/8 (`sv.value = withMotion(target, 'presetName')`). `interpolateSliceAngles(prev, next, t): readonly SliceAngle[]` (Task 2) consumes/returns `SliceAngle` from `donutArcs.ts`; `arcsFromSliceAngles(angles, radius): readonly DonutArc[]` (Task 3) consumes the same `SliceAngle`; Task 6 chains `computeSliceAngles → interpolateSliceAngles → arcsFromSliceAngles → Skia` with matching types. `monthDirection?: number` added to both `MonthlyTotalHero` and `DonutChart` Props and passed from `index.tsx` (Task 8). `EasingToken`/`MotionName` imported from `motion.ts` in `useMotion.ts`. No symbol used before defined; removed symbols (`buildDonutArcs` import/`canvasAnimStyle`/`canvasOpacity`/`Easing`/`useAnimatedStyle`/`withTiming` in DonutChart) explicitly enumerated for the tsc check. ✓

**4. Known risks surfaced inline:** D-05 close justified vs the historical `usePathInterpolation` blocker (angle space ≠ path-string space) in header + Task 2 + Task 9. Per-frame cost bounded + quantized + perf formally deferred to Wave 6 (spec-sanctioned, R3). `sharedMonth` explicitly scoped as a coordinated carry (no RN nav shared-element — there is no navigation) to avoid over-engineering. `'spring'`/`MOTION.sheetSpring` fail-fast and deferred to Wave 4 (not silently mapped). `EasingFunction` import has a tsc-fail fallback (Task 4 Step 2). Pre-existing ad-hoc timings in untouched files + `MonthSwiper` pan-snap explicitly logged as later-wave debt, not silently in/out. NO EAS build triggered (quota/R1). ✓

---

## Execution Handoff

**Variant A chosen (2026-05-17).** Execution = subagent-driven, fresh subagent per task + two-stage review (spec verification + code quality) between tasks, as Waves 0/1. **10 tasks** + two Open-Design design-sync checkpoints (⏸ before Task 5, ⏸ before Task 8 — hard STOP, user-cleared). Task 10 = the premium Polish Pass after the pipeline is green.

Wave 2 is independently shippable as CODE (local gates green: tsc 0 / lint 0 / **196**+ node tests 0 fail / expo export ios 0); the live "money-shot" feel + reduce-motion + fps are explicitly deferred to the batched **W1+W2** EAS TestFlight build (after build #6, per EAS quota + R1 — no build triggered by this plan). D-05 is closed in code and the decision log. Per project convention: plan pushed to `origin/main` FIRST, then subagent-driven execution starting Task 1. Sequence: Task 1→4 → ⏸Checkpoint A → Task 5→7 → ⏸Checkpoint B → Task 8→9 → Task 10 Polish Pass.
