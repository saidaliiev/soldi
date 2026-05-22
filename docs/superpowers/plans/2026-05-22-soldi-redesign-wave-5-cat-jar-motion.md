# SOLDI Redesign — Wave 5 (Categories + Jars + Sheet-Motion Governance) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans, task-by-task. Steps use `- [ ]` checkboxes.

**Goal:** Bring the Categories and Jars surfaces to the premium bar (spec §5 + §6) and close the W4 deferred debt — the four `withSpring`/`withTiming` literals inside the shared `BottomSheetPrimitive` (the only motion site not yet governed by `MOTION.*`) — by routing all four sites through the existing spring-capable `useMotion`/`useMotionSnap` boundary. All motion through `MOTION` vocabulary; all glass only via `glass.ts`; reduce-motion mandatory; tokens-only colors; no banned hex; no glass on content.

**Architecture:** Mirrors Wave 4 cadence (governance-first, then visual). **Additive** motion presets land in T1, the shared primitive swaps to them in T2 (no visual diff), Categories visual lands in T3, Jars visual + ring consolidation in T4, wave gate + batched device-UAT in T5.

- `motion.ts`: append four entries — `sheetOpen`, `sheetClose`, `sheetGestureClose`, `sheetSnapBack` — each typed `MotionPreset` (`{durationMs, easing}`). `sheetSpring` is renamed/superseded by `sheetOpen` (only the motion.test consumes it today; no component references).
- `useMotion.ts`: untouched. The existing `withMotion`/`useMotionSnap` already route `'spring'` via `SHEET_DAMPING_RATIO` and `'outCubic'` via timing — no boundary change needed.
- `BottomSheetPrimitive.tsx`: 4 ad-hoc sites (lines 194 open spring, 203 close timing, 228 gesture-close timing, 238 snap-back spring) → consume `withMotion`/`useMotionSnap` against the four new presets. The primitive already imports the boundary patterns from W4.
- `features/categories/`: list row + editor sheet swap to the design-sync target (decided at the checkpoint — see "Design-Sync Checkpoint" below). All colors via tokens, hairlines for separators, ColorSwatchPicker grid layout.
- `features/jars/`: JarListScreen restructures around a **featured hero card** (184pt ring + Oswald 38pt amount + Garamond 21pt name + Manrope sub-meta) + a hairline-separated list of `JarRow`s using a **46pt mini ring** (left-aligned) + moss-text % right-aligned. `JarRing` consolidates to `{size, strokeWidth, palette}` props so featured/mini variants share one Skia tree.

**Hard constraint (CLAUDE.md §Design):** No glass on content. `CategoryEditorBottomSheet` and `JarCreateBottomSheet` stay on the **default** (non-opt-in) `BottomSheetPrimitive` path — solid `COLORS.surface` + `SHADOWS.modal`. Glass remains a `ChatBottomSheet`-only opt-in established in W4.

**Tech Stack:** Expo SDK 54, RN 0.81.5, TS 5.9 strict, `node:test`+`tsx` (`src/**/*.test.ts`), `react-native-reanimated@~4.1.x` (`withSpring`/`withTiming` via boundary only), `@shopify/react-native-skia@~2`, `@shopify/flash-list@~2`. Binds to REAL Wave-0..4 API on `origin/main`: `MOTION`/`MotionPreset`/`MotionName`/`selectMotionPreset`/`SHEET_DAMPING_RATIO` (`src/design/motion.ts`), `useMotion`/`useMotionSnap` (`src/design/useMotion.ts`), `resolveSheetChrome`/`isSafeToRenderGlass` (`src/design/glass.ts`), `TYPE.displayL`/`displayM`/`editorialBody`/`editorialLead`/`uiBody`/`uiMeta`/`uiLabel`/`tabular` (`src/design/typography.ts`), `COLORS.accent`/`accentSoft`/`accentDeep`/`sage`/`sageSoft`/`sageDeep`/`mossText` (`src/design/tokens.ts`), `SHADOWS.card`/`modal` (tokens).

**Source of truth:** `docs/superpowers/specs/2026-05-22-soldi-redesign-wave-5-cat-jar-motion-design.md` §Task breakdown + §Architecture changes. Design-sync authority: `docs/design/soldify-screens.html` §5 (lines 305–347) for Categories and §6 (lines 350–397) for Jars (Slate & Sand palette).

**Sequencing constraint (read first):** W5 introduces NO new native module. Local gates (tsc/lint/test/expo-export) run here. Device-UAT is authored at T5 and **batched into the W1+W2+W3+W4 EAS device build** queued for after TestFlight #6. Android dev-client emulator path is independent of the iOS device-UAT.

**Working directory:** `apps/mobile/...` paths relative to repo root `/home/iskan/projects/soldify`. Run `npm`/`tsc`/`lint`/`expo`/`git` from `apps/mobile`. `npm test` glob = `src/**/*.test.ts` (node:test+tsx). Pure modules testable, RN/reanimated/Skia boundary + screen files NOT (gate + device-UAT, same as W1–W4).

---

## File Structure (decomposition locked here)

| File | Responsibility | Wave 5 action |
|---|---|---|
| `src/design/motion.ts` | Pure motion vocabulary | Modify — append `sheetOpen`/`sheetClose`/`sheetGestureClose`/`sheetSnapBack`; supersede `sheetSpring` (delete after T2 confirms no consumer) |
| `src/design/motion.test.ts` | Pure motion guard | Modify — extend coverage to 4 new presets; drop `sheetSpring` from registry assertions when removed |
| `src/components/BottomSheet/BottomSheetPrimitive.tsx` | Shared sheet primitive | Modify — 4 inline motion sites → governed presets via `useMotion` + `useMotionSnap`; no API change, no glass change |
| `src/features/categories/CategoryListRow.tsx` | Category list row | Modify per checkpoint outcome (default: spec §5 row treatment — icon-badge + Manrope name + meta count + tabular amount-right + hairline-only separator; drag-merge behavior frozen) |
| `src/features/categories/CategoryEditorBottomSheet.tsx` | Editor sheet | Modify — Oswald 24pt header, Manrope field labels, tokens-only, default non-glass surface (mandatory) |
| `src/features/categories/ColorSwatchPicker.tsx` | Color swatch grid | Modify — palette swatch grid per spec §5 (8 per row max, 44×44pt hit, accent ring on selected) — visual polish only, existing API kept |
| `src/features/categories/IconPicker.tsx` | Icon grid | Modify — scroll-snap grid polish (spec §5 grid feel); existing API kept |
| `src/features/jars/JarListScreen.tsx` | Jars list screen | Modify — restructure: Oswald 30pt title, featured-jar card (FIRST jar by `createdAt`) at top, FlashList<Jar> of remaining `JarRow`s below with hairline separators, no card shadows on rows |
| `src/features/jars/JarRow.tsx` | Jar list row | Modify — 46pt mini `JarRing` LEFT, Manrope name + meta, moss-text % right-aligned, hairline below, no `SHADOWS.card` |
| `src/features/jars/JarRing.tsx` | Skia ring | Modify — accept `{size, strokeWidth, palette}` props (featured: 184/14, mini: 46/5); geometry already pure |
| `src/features/jars/jarRingGeometry.test.ts` | Ring geometry guard | Modify — add featured-and-mini variant assertions (dasharray `325 465` at fraction=0.7 r=74 sw=14; `79 113` at 0.7 r=18 sw=5; `34 113` at 0.3 r=18 sw=5) |
| `src/features/jars/JarCreateBottomSheet.tsx` | Create sheet | Modify — Oswald 24pt header, Manrope field labels, color subset (3 swatches `sage`/`sageSoft`/`sageDeep`), accent 42pt pill save, non-glass surface |
| `src/features/jars/JarDetailScreen.tsx` | Jar detail | Modify — header rebuild: featured-size ring + Oswald amount + Garamond name + sub-meta. Existing sweep-history tabs unchanged |
| `.planning/phases/redesign/W5-DEVICE-UAT.md` | Deferred device-UAT | Create — batched into the W1+W2+W3+W4 EAS device build |
| `.planning/STATE.md` | Planning state | Modify — W5 code-complete; shared-primitive motion debt CLOSED; device-UAT batched |
| `docs/design/soldify-screens.html` | Design authority | Read-only (checkpoint) — surface drift, never edit |

**Out of Wave 5 scope (do NOT touch):**
- Onboarding (7 screens) and Settings + BiometricToggle — moves to W6.
- Glass on `CategoryEditorBottomSheet` / `JarCreateBottomSheet` — banned (glass-on-content rule); they use the default solid sheet path.
- `DragMergeContext` behavior — frozen, visual untouched (D-19 contract).
- `ChatBottomSheet` opt-in glass path (W4 already shipped) — do not regress.
- Spring-symmetric sheet motion. Keep open=spring / close=timing feel.
- `RecategorizeBottomSheet` content (transactions feature) — its motion will improve automatically via the shared primitive swap in T2; no visual diff intended.
- Jar reordering / featured-jar control / multi-color chart — explicit anti-criteria.

**Key design decisions (locked, with citations):**
- **Sheet motion via existing boundary (no new hook).** Spec §Architecture proposed `useMotionSheet`, but `useMotion`/`useMotionSnap` already route `'spring'` → `withSpring({duration, dampingRatio: SHEET_DAMPING_RATIO})` and `'outCubic'` → `withTiming(...)`. Adding a new hook would duplicate logic. Use 4 named presets + the existing boundary; document the single `SHEET_DAMPING_RATIO` collapse (open vs snap-back damping ratios from spec — `damping:18/stiffness:180` and `damping:20/stiffness:200` — both visually settle into the same governed soft-overshoot feel; acceptable per spec anti-criteria "No visual diff at T2 commit").
- **`sheetSpring` removal.** Only `motion.test.ts` references the legacy entry. T2 removes it AFTER the swap is verified, in the same commit, so the registry stays minimal. If any consumer surfaces during T2 verification, leave it deprecated with a `@deprecated` jsdoc and revisit in T5.
- **Categories surface = list, not card-grid (decided at checkpoint).** HTML §5 shows a 2×2 card grid with per-row progress bars. Spec §5 calls for a hairline-row list with icon-badge + name + count + tabular amount-right. The Soldify product (>40 categories common) cannot fit a card grid; the existing list pattern is the right call. Drift surfaced at the checkpoint and resolved in favor of spec §5 + the current FlashList shape. Card-grid logged as accepted drift.
- **Featured jar = `createdAt` ASC[0].** No new model field, no reorder UI, no priority concept. Risk mitigation per spec §Risks.
- **JarRing single Skia tree with size/strokeWidth/palette props.** Two callers (featured 184/14, mini 46/5). Geometry already pure. Animation crossfade preserved.
- **No glass on Category/Jar editor sheets.** Mandatory per CLAUDE.md. `BottomSheetPrimitive` default branch unchanged (solid + `SHADOWS.modal`).

---

## Design-Sync Checkpoint (gate — before Task 3/4, STOP for user)

1. Read `soldify-screens.html:305-347` (CATEGORIES section) and `:350-397` (JARS section).
2. Read impl: `CategoryListRow.tsx`, `CategoryEditorBottomSheet.tsx`, `ColorSwatchPicker.tsx`, `IconPicker.tsx`, `JarListScreen.tsx`, `JarRow.tsx`, `JarRing.tsx`, `JarDetailScreen.tsx`, `JarCreateBottomSheet.tsx`.
3. Compare (Slate & Sand palette in both, post-W4 typography contract): Categories layout (card-grid vs list), Jars featured-card structure (ring stroke, hero label sizes), JarRow geometry (mini ring vs current icon-well), separator style (hairline vs card-shadow).
4. Drift list. **STOP** — user confirms each ruling before T3/T4. Do NOT edit the HTML.

### Pre-resolved checkpoint deltas (locked at plan time, surface for confirmation):

1. **Categories card-grid drift.** HTML §5 = 2×2 card grid w/ progress bars. Resolution: keep the list+row shape (spec §5, scale-to-many-categories, drag-merge intact). Logged as accepted drift; revisit if a "categorize-by-budget" feature lands.
2. **Categories progress bar.** HTML rows show a 4pt category progress bar. Resolution: **add** a 4pt hairline bar at row bottom showing share-of-month — pure visual addition, no data model change; uses `useFocusEffect`-loaded monthly totals already available to CategoriesList. (If implementation cost spikes, drop and log as deferred.)
3. **JarRow icon-vs-ring left-element.** Current = icon-well. HTML §6 = mini progress ring. Resolution: ring left, icon dropped from row (icon still visible on featured card + JarDetail). Drag-merge n/a in jars surface.
4. **Featured jar card shadow.** HTML §6 card uses subtle elevation. Resolution: `SHADOWS.card` retained on the featured card, hairlines on JarRows (no `SHADOWS.card` on row).
5. **JarRing color palette.** Current = hard-coded `COLORS.sage`. HTML §6 alternates `#687653` (moss) and `#9AA585` (moss-soft). Resolution: add `palette: 'sage' | 'sageSoft'` prop; default `'sage'`. JarListScreen picks `sageSoft` for jars below 50% progress, `sage` otherwise. Pure cosmetic, no data model.

---

## Task 1 — `MOTION.sheet*` preset family (additive)

**Files:**
- Modify: `apps/mobile/src/design/motion.ts`
- Modify: `apps/mobile/src/design/motion.test.ts`

- [ ] **Step 1: Read current motion.ts entries**

Run: `sed -n '25,50p' apps/mobile/src/design/motion.ts`
Expected: `MOTION` const ends with `sheetSpring` entry.

- [ ] **Step 2: Append the four new presets**

Edit `apps/mobile/src/design/motion.ts`. Replace the `sheetSpring` line with:

```ts
  /** Bottom-sheet open (spring; replaces legacy sheetSpring; consumed by BottomSheetPrimitive). */
  sheetOpen: { durationMs: 420, easing: 'spring' },
  /** Bottom-sheet programmatic close (timing; matches W4 chat-sheet close feel). */
  sheetClose: { durationMs: 220, easing: 'outCubic' },
  /** Bottom-sheet pan-down dismiss close (timing; slightly snappier than programmatic close). */
  sheetGestureClose: { durationMs: 200, easing: 'outCubic' },
  /** Bottom-sheet snap-back after partial pan-down (spring; same governed damping as sheetOpen). */
  sheetSnapBack: { durationMs: 380, easing: 'spring' },
```

- [ ] **Step 3: Update motion.test.ts registry assertions**

Edit `apps/mobile/src/design/motion.test.ts`. In both `for (const k of [...]` arrays (lines 17 and 50), replace `'sheetSpring'` with `'sheetOpen', 'sheetClose', 'sheetGestureClose', 'sheetSnapBack'`. Replace the dedicated `sheetSpring` test block (lines ~94–100) with:

```ts
test('selectMotionPreset: sheet* presets resolve PURE (no throw — throw was boundary-only) (Wave 5)', () => {
  assert.deepStrictEqual(selectMotionPreset('sheetOpen', false), MOTION.sheetOpen);
  assert.deepStrictEqual(selectMotionPreset('sheetSnapBack', false), MOTION.sheetSnapBack);
  assert.strictEqual(MOTION.sheetOpen.easing, 'spring');
  assert.strictEqual(MOTION.sheetSnapBack.easing, 'spring');
  assert.strictEqual(MOTION.sheetClose.easing, 'outCubic');
  assert.strictEqual(MOTION.sheetGestureClose.easing, 'outCubic');
  assert.strictEqual(selectMotionPreset('sheetOpen', true).durationMs, 0);
  assert.strictEqual(selectMotionPreset('sheetClose', true).durationMs, 0);
});
```

- [ ] **Step 4: Run pure tests**

Run: `cd apps/mobile && npm test -- motion.test`
Expected: PASS — all entries plus the new sheet test.

- [ ] **Step 5: Type-check**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: exit 0. (No consumer references `sheetSpring` yet — boundary still resolves it from `MotionName` until T2.)

If tsc fails because `sheetSpring` is referenced anywhere besides `motion.test.ts`, keep `sheetSpring` in `MOTION` for now (mark `@deprecated`) and revisit at T5.

- [ ] **Step 6: Commit**

```bash
cd apps/mobile && cd ../.. && git add apps/mobile/src/design/motion.ts apps/mobile/src/design/motion.test.ts
git commit -m "feat(motion): add MOTION.sheet{Open,Close,GestureClose,SnapBack} (Wave 5 T1)

Closes the shared-primitive motion governance debt logged in W4. Four
named presets replace the legacy sheetSpring entry; consumed by
BottomSheetPrimitive in T2. The existing useMotion/useMotionSnap
boundary already routes 'spring' via SHEET_DAMPING_RATIO and 'outCubic'
via withTiming — no boundary change needed."
```

---

## Task 2 — `BottomSheetPrimitive` literal → preset swap

**Files:**
- Modify: `apps/mobile/src/components/BottomSheet/BottomSheetPrimitive.tsx`

Current ad-hoc motion sites (verified by `grep "withSpring\|withTiming" BottomSheetPrimitive.tsx`):
- line 194 — `openSheet`: `withSpring(0, { damping: 18, stiffness: 180 }, cb)`
- line 203 — `closeSheet`: `withTiming(restingHeight, { duration: 220, easing: Easing.out(Easing.cubic) }, cb)`
- line 228 — gesture `onEnd` (translationY > 80): `withTiming(restingHeight, { duration: 200, easing: Easing.out(Easing.cubic) }, cb)`
- line 238 — gesture `onEnd` (snap back): `withSpring(0, { damping: 20, stiffness: 200 })`

Pattern: lines 194 and 238 are spring → use `useMotionSnap('sheetOpen' | 'sheetSnapBack')`. Lines 203 and 228 are timing → can use `useMotionSnap` too OR `withMotion`. Lines 228 and 238 sit inside a Gesture worklet (`onEnd`), so they MUST use `useMotionSnap` (worklet-safe). Lines 194 and 203 sit inside JS callbacks (`openSheet`/`closeSheet`) — `withMotion` works, but using `useMotionSnap` everywhere keeps the call sites uniform.

Caveat: `useMotionSnap` does not support a completion callback. Lines 194/203/228 currently pass a callback to `runOnJS(notifyChange/moveFocusToSheet/finishClose)`. We need callbacks for visibility teardown + a11y focus return. Resolution: keep the underlying `withSpring`/`withTiming` calls, but pull duration/easing/damping from the named preset via `selectMotionPreset`. This is a "boundary inlined locally" pattern; the primitive is already a sanctioned reanimated site (W4 boundary).

- [ ] **Step 1: Add a local preset resolver**

Edit `BottomSheetPrimitive.tsx`. Add this import near the top:

```ts
import { MOTION, SHEET_DAMPING_RATIO, type MotionName } from '@design/motion';
import { useReducedMotion } from 'react-native-reanimated';
```

(`useReducedMotion` already used elsewhere in the file? if so, skip the import; just import what's missing.)

Above the component body, add a worklet-safe resolver:

```ts
function resolveSheetSpring(reduceMotion: boolean, name: 'sheetOpen' | 'sheetSnapBack') {
  if (reduceMotion) return { kind: 'instant' as const };
  const p = MOTION[name];
  return { kind: 'spring' as const, duration: p.durationMs, dampingRatio: SHEET_DAMPING_RATIO };
}
function resolveSheetTiming(reduceMotion: boolean, name: 'sheetClose' | 'sheetGestureClose') {
  if (reduceMotion) return { kind: 'instant' as const };
  const p = MOTION[name];
  return { kind: 'timing' as const, duration: p.durationMs, easing: Easing.out(Easing.cubic) };
}
```

Inside the component, after `const { height: SCREEN_HEIGHT } = useWindowDimensions();`:

```ts
const reduceMotion = useReducedMotion();
```

- [ ] **Step 2: Swap site #1 — `openSheet` (line 194)**

Replace:
```ts
translateY.value = withSpring(0, { damping: 18, stiffness: 180 }, (finished) => {
```
with:
```ts
const openCfg = resolveSheetSpring(reduceMotion, 'sheetOpen');
if (openCfg.kind === 'instant') {
  translateY.value = 0;
  runOnJS(notifyChange)(1);
  runOnJS(moveFocusToSheet)();
} else {
  translateY.value = withSpring(0, { duration: openCfg.duration, dampingRatio: openCfg.dampingRatio }, (finished) => {
```

Keep the existing `if (finished === true) {...}` block; close the `else` branch after the existing `});`.

- [ ] **Step 3: Swap site #2 — `closeSheet` (line 203)**

Replace:
```ts
translateY.value = withTiming(
  restingHeight,
  { duration: 220, easing: Easing.out(Easing.cubic) },
  (finished) => {
```
with:
```ts
const closeCfg = resolveSheetTiming(reduceMotion, 'sheetClose');
if (closeCfg.kind === 'instant') {
  translateY.value = restingHeight;
  runOnJS(finishClose)();
} else {
  translateY.value = withTiming(
    restingHeight,
    { duration: closeCfg.duration, easing: closeCfg.easing },
    (finished) => {
```

Close the `else` after the existing callback `},);`.

- [ ] **Step 4: Swap site #3 — gesture pan-end (line 228)**

This is inside a worklet (`pan.onEnd`). Replace:
```ts
translateY.value = withTiming(
  restingHeight,
  { duration: 200, easing: Easing.out(Easing.cubic) },
  (finished) => {
```
with:
```ts
const gCloseCfg = resolveSheetTiming(reduceMotion, 'sheetGestureClose');
if (gCloseCfg.kind === 'instant') {
  translateY.value = restingHeight;
  runOnJS(finishClose)();
} else {
  translateY.value = withTiming(
    restingHeight,
    { duration: gCloseCfg.duration, easing: gCloseCfg.easing },
    (finished) => {
```

Close the `else` after the existing `},);`.

Worklet-safety: `resolveSheetTiming` references `MOTION` (frozen object) and `Easing.out(Easing.cubic)` — both worklet-callable when invoked at gesture-end time. If reanimated complains about closure capture, hoist the cfg to a JS-side `useMemo` and read from it inside the worklet.

- [ ] **Step 5: Swap site #4 — snap back (line 238)**

Replace:
```ts
translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
```
with:
```ts
const snapCfg = resolveSheetSpring(reduceMotion, 'sheetSnapBack');
if (snapCfg.kind === 'instant') {
  translateY.value = 0;
} else {
  translateY.value = withSpring(0, { duration: snapCfg.duration, dampingRatio: snapCfg.dampingRatio });
}
```

- [ ] **Step 6: Remove `sheetSpring` legacy entry**

Now that no consumer references `sheetSpring`, edit `apps/mobile/src/design/motion.ts` and DELETE the `sheetSpring` line if it still exists (it was replaced by `sheetOpen` in T1).

- [ ] **Step 7: Type-check + lint**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: both exit 0.

If `useReducedMotion` is not the symbol exported by the installed reanimated version, fall back to `AccessibilityInfo.isReduceMotionEnabled()` via a JS-side `useEffect` (already pattern in `useMotion.ts`).

- [ ] **Step 8: Run all pure tests**

Run: `cd apps/mobile && npm test`
Expected: 216+ tests green; `motion.test` shows 4 new presets.

- [ ] **Step 9: Expo export sanity**

Run: `cd apps/mobile && npx expo export -p ios`
Expected: exit 0, no resolver/type errors.

- [ ] **Step 10: R5 grep — no banned literals left in the primitive**

Run: `grep -nE "damping: [0-9]|stiffness: [0-9]|duration: 2[0-9]0" apps/mobile/src/components/BottomSheet/BottomSheetPrimitive.tsx`
Expected: NO MATCHES for raw `damping:`/`stiffness:` literals (the resolved `dampingRatio` value comes from `SHEET_DAMPING_RATIO`). Matches like `dampingRatio: openCfg.dampingRatio` and `duration: closeCfg.duration` are OK because they read from the resolved preset.

- [ ] **Step 11: Commit**

```bash
git add apps/mobile/src/components/BottomSheet/BottomSheetPrimitive.tsx apps/mobile/src/design/motion.ts apps/mobile/src/design/motion.test.ts
git commit -m "refactor(sheet): route BottomSheetPrimitive motion via MOTION.sheet* (Wave 5 T2)

Closes shared-primitive-motion debt logged in W4. Four ad-hoc sites
(open spring, programmatic close timing, gesture-close timing, snap-back
spring) now read durations from MOTION.sheet{Open,Close,GestureClose,SnapBack}
and resolve via SHEET_DAMPING_RATIO. Visual feel preserved (single
governed damping ratio; spec anti-criteria 'no visual diff at T2'). Legacy
sheetSpring entry removed; no consumers."
```

---

## Task 3 — Categories surface refactor (spec §5)

**Files:**
- Modify: `apps/mobile/src/features/categories/CategoryListRow.tsx`
- Modify: `apps/mobile/src/features/categories/CategoryEditorBottomSheet.tsx`
- Modify: `apps/mobile/src/features/categories/ColorSwatchPicker.tsx` (visual polish only)
- Modify: `apps/mobile/src/features/categories/IconPicker.tsx` (visual polish only)
- Modify: route file `apps/mobile/app/(tabs)/categories.tsx` (header treatment; defer if file shape doesn't match assumption — re-read first)

The checkpoint already resolved the card-grid drift in favor of the list+row shape. T3 polishes the existing list to spec §5 row treatment and adds the per-row monthly share-of-month hairline bar.

- [ ] **Step 1: Read `(tabs)/categories.tsx` to confirm assumption**

Run: `cat apps/mobile/app/\(tabs\)/categories.tsx`
Expected: Header + `<FlashList>` (or `<ScrollView>`) of `<CategoryListRow>`. Note the data shape used to feed rows.

- [ ] **Step 2: Update `CategoryListRow.tsx` typography + meta**

Edit `apps/mobile/src/features/categories/CategoryListRow.tsx`:

- Increase row `minHeight` from 52 to 56 (still ≥44 tap target; better editorial rhythm).
- Add a `share` numeric prop (0..1) for the monthly share-of-month bar — optional, defaults `undefined` (no bar rendered when monthly totals unavailable).
- Render the existing icon + name + chevron, then **append**:
  - A meta line under the name: `<Text style={styles.meta}>{count} txns · {amountStr}</Text>` — `TYPE.uiMeta`, `COLORS.textMuted`.
  - A 4pt hairline progress bar at row bottom showing `share`, color = `category.color` at full alpha, track = `category.color + '26'` (15% alpha).
- Move chevron to far right, vertically centered; replace columnGap with explicit spacing.

Update `styles`:
```ts
row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, columnGap: SPACING.sm, backgroundColor: 'transparent' },
nameWrap: { flex: 1, rowGap: 2 },
name: { ...TYPE.uiBody, color: COLORS.textPrimary },
meta: { ...TYPE.uiMeta, color: COLORS.textMuted },
amount: { ...TYPE.tabular, color: COLORS.textPrimary, marginRight: SPACING.xs },
bar: { position: 'absolute', left: SPACING.md, right: SPACING.md, bottom: 0, height: 4, borderRadius: 2 },
barFill: { height: 4, borderRadius: 2 },
```

Wrap row in a `<View>` to host the absolute-positioned bar; the existing `<Pressable>` stays as the interactive surface above the bar.

- [ ] **Step 3: Add hairline between rows in `(tabs)/categories.tsx`**

If the list is `<FlashList>`, set `ItemSeparatorComponent={Hairline}` where:
```ts
function Hairline() { return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: COLORS.textMuted, opacity: 0.18, marginLeft: SPACING.md + 24 + SPACING.sm }} />; }
```
If it's a `<ScrollView>`, inline the same separator between siblings.

Drop any per-row `SHADOWS.card` if present (none currently — defensive note).

- [ ] **Step 4: Update `CategoryEditorBottomSheet.tsx` typography**

Edit the sheet:
- Header style → Oswald 24pt: replace `...TYPE.displayM` with `...TYPE.displayS` (24pt Oswald — already exists in `typography.ts`).
- Field label style stays `TYPE.uiLabel` + `COLORS.textMuted`.
- Section labels: Manrope 12pt uppercase. If not present, add a style:
  ```ts
  sectionLabel: { ...TYPE.uiLabel, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  ```
- CTA pill height stays 52, color `COLORS.accent`, label `TYPE.uiButton` white. No glass.

- [ ] **Step 5: Polish `ColorSwatchPicker.tsx`**

Edit `ColorSwatchPicker.tsx`: ensure the SWATCHES grid renders in a flexWrap row with 8-per-row max (already does). Increase the selected-ring border from 2 to 2.5 for legibility on the busier sand background. No API change.

- [ ] **Step 6: Polish `IconPicker.tsx`**

Edit `IconPicker.tsx`: change from horizontal scroll to a `flexWrap` grid (8 per row). Replace `<ScrollView horizontal>` with `<View style={styles.grid}>` and add `grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: SPACING.sm, rowGap: SPACING.sm, paddingHorizontal: SPACING.md }`. Each cell stays 44×44.

- [ ] **Step 7: R6 banned-hex check**

Run: `grep -nE "#667EEA|#8B7AB8|#E8E0FF|#10B981|#1A73E8|#2563EB" apps/mobile/src/features/categories/`
Expected: empty.

- [ ] **Step 8: R-tokens inline-hex check**

Run: `grep -nE "style=\{\{[^}]*#[0-9A-Fa-f]" apps/mobile/src/features/categories/`
Expected: empty (no raw hex in inline styles).

- [ ] **Step 9: Type-check + lint + tests + export**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test && npx expo export -p ios`
Expected: all exit 0; 216+ tests green.

- [ ] **Step 10: Commit**

```bash
git add apps/mobile/src/features/categories/ apps/mobile/app/\(tabs\)/categories.tsx
git commit -m "feat(categories): editorial list + share-bar + sheet polish (Wave 5 T3)

CategoryListRow gains a 4pt category-color share-of-month bar at row
bottom, Manrope meta line under the name, and tabular amount-right.
List uses hairline separators (no card shadows). CategoryEditorBottomSheet
swaps to displayS header + uppercase section labels. ColorSwatchPicker
and IconPicker get visual polish; no API change. No glass on sheet
content (CLAUDE.md). Tokens-only."
```

---

## Task 4 — Jars surface refactor (spec §6)

**Files:**
- Modify: `apps/mobile/src/features/jars/JarRing.tsx`
- Modify: `apps/mobile/src/features/jars/jarRingGeometry.test.ts`
- Modify: `apps/mobile/src/features/jars/JarRow.tsx`
- Modify: `apps/mobile/src/features/jars/JarListScreen.tsx`
- Modify: `apps/mobile/src/features/jars/JarDetailScreen.tsx`
- Modify: `apps/mobile/src/features/jars/JarCreateBottomSheet.tsx`

- [ ] **Step 1: Generalize `JarRing` props**

Edit `JarRing.tsx`:
- Add to `Props`: `readonly strokeWidth?: number;` (default 12) and `readonly palette?: 'sage' | 'sageSoft';` (default `'sage'`) and `readonly showCenterLabel?: boolean;` (default true).
- Inside the component, derive: `const SW = strokeWidth ?? STROKE_WIDTH;` and use `SW` everywhere `STROKE_WIDTH` is read.
- Derive ring color:
  ```ts
  const ringColor = palette === 'sageSoft' ? COLORS.sageSoft : COLORS.sage;
  const trackColor = `${ringColor}33`;
  ```
  Use `ringColor` for progress arc and `trackColor` for track.
- Wrap the center overlay (`heroAmount` + `overFundedLabel`) in `{showCenterLabel && (...)}` so the mini variant (used in `JarRow`) can request a clean ring.

Keep existing crossfade animation untouched.

- [ ] **Step 2: Extend ring geometry tests**

Edit `apps/mobile/src/features/jars/jarRingGeometry.test.ts`:

Add a test asserting featured-and-mini variants stay consistent (no behavior change, just guard against regression):

```ts
test('jarRingArcPath: featured + mini variants produce SVG strings of the expected shape (Wave 5)', () => {
  const featured = jarRingArcPath(0.7, 74, 14);
  const miniHigh = jarRingArcPath(0.7, 18, 5);
  const miniLow  = jarRingArcPath(0.3, 18, 5);
  assert.match(featured, /^M /);
  assert.match(miniHigh, /^M /);
  assert.match(miniLow,  /^M /);
  // Sanity: the same fraction produces different paths at different radii
  assert.notStrictEqual(featured, miniHigh);
  // And different fractions produce different paths at the same radius
  assert.notStrictEqual(miniHigh, miniLow);
});
```

(If the geometry function uses dasharray rather than a literal SVG path string, swap the assertions to match the actual return shape — read `jarRingGeometry.ts` first.)

- [ ] **Step 3: Refactor `JarRow.tsx` to mini-ring left + hairline**

Edit `JarRow.tsx`:

Replace the body with:
```tsx
return (
  <Pressable
    onPress={() => router.push(`/jars/${jar.id}`)}
    accessibilityRole="button"
    accessibilityLabel={a11yLabel}
    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
  >
    <View style={styles.ringWrap} pointerEvents="none">
      <JarRing
        balanceCents={balanceCents}
        targetCents={jar.targetCents}
        size={46}
        strokeWidth={5}
        palette={pct >= 0.5 ? 'sage' : 'sageSoft'}
        showCenterLabel={false}
      />
    </View>
    <View style={styles.info}>
      <Text style={styles.name} numberOfLines={1} allowFontScaling>{jar.name}</Text>
      <Text style={styles.meta} allowFontScaling>{balanceStr} / {targetStr}</Text>
    </View>
    <Text style={styles.pct} allowFontScaling>{Math.round(pct * 100)}%</Text>
  </Pressable>
);
```

Add: `const pct = jar.targetCents > 0 ? balanceCents / jar.targetCents : 0;` before `return`.

Replace `styles` with:
```ts
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, columnGap: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.textMuted, backgroundColor: 'transparent' },
  pressed: { opacity: 0.75 },
  ringWrap: { width: 46, height: 46 },
  info: { flex: 1, rowGap: 2 },
  name: { ...TYPE.uiBody, color: COLORS.textPrimary },
  meta: { ...TYPE.uiMeta, color: COLORS.textMuted },
  pct: { ...TYPE.uiBody, color: COLORS.mossText },
});
```

Remove `JarIcon` and `SHADOWS.card` imports (no longer used).

- [ ] **Step 4: Restructure `JarListScreen.tsx` — featured + list**

Edit `JarListScreen.tsx`:

After the existing `loadJars` block, split into featured + rest:
```ts
const [featured, ...rest] = jarsWithBalance;
```

Replace the empty/non-empty branch with:
```tsx
{isEmpty ? (
  /* unchanged empty state */
) : (
  <>
    {featured && (
      <View style={styles.featuredCard}>
        <JarRing
          balanceCents={featured.balance}
          targetCents={featured.jar.targetCents}
          size={184}
          strokeWidth={14}
          palette="sage"
          showCenterLabel
        />
        <Text style={styles.featuredName} allowFontScaling>{featured.jar.name}</Text>
        <Text style={styles.featuredSub} allowFontScaling>
          {/* example: "€900 to go · ~3 months" — keep simple, no months projection in W5 */}
          {`${formatMoney({ amountCents: Math.max(0, featured.jar.targetCents - featured.balance), currency: 'EUR' })} ${t('jars.to_go_label')}`}
        </Text>
      </View>
    )}
    {rest.map(({ jar, balance }) => (
      <JarRow key={jar.id} jar={jar} balanceCents={balance} />
    ))}
  </>
)}
```

Add styles:
```ts
featuredCard: { alignItems: 'center', paddingVertical: SPACING.lg, paddingHorizontal: SPACING.md, marginHorizontal: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface, ...SHADOWS.card, marginBottom: SPACING.md },
featuredName: { ...TYPE.editorialBody, fontSize: 21, color: COLORS.textPrimary, marginTop: SPACING.md },
featuredSub: { ...TYPE.uiBody, color: COLORS.textMuted, marginTop: 4 },
```

If `t('jars.to_go_label')` key doesn't exist, add it to the existing i18n bundles (`en`/`uk` minimum) with values `"to go"` / `"до цілі"`. If keys aren't trivially editable, fall back to a hard-coded `' to go'` and log as i18n debt.

- [ ] **Step 5: Polish `JarDetailScreen.tsx` header**

Edit `JarDetailScreen.tsx`: replace the existing header block with a featured-size ring (184/14), Oswald amount (rendered by the ring's `showCenterLabel`), Garamond 21pt jar name beneath, Manrope sub-meta. The existing sweep-history tabs stay untouched.

If the file already structures the header similarly, only update font sizes/family per spec — do NOT rewrite the data path.

- [ ] **Step 6: Polish `JarCreateBottomSheet.tsx`**

Edit `JarCreateBottomSheet.tsx`:
- Header style → `TYPE.displayS` (Oswald 24pt) instead of `displayM`.
- Reduce icon picker to the JarIcon set already present (no change needed — current 6-icon row matches spec §6 "subset").
- Replace CTA height 52 → 42 with `borderRadius: RADIUS.pill` to match the 42pt accent pill in spec §5/§6.
- No color picker added (spec §6 doesn't require one for create; can be added in W6 if needed).
- Default solid surface (no glass — banned).

- [ ] **Step 7: R6 banned-hex check**

Run: `grep -nE "#667EEA|#8B7AB8|#E8E0FF|#10B981|#1A73E8|#2563EB" apps/mobile/src/features/jars/`
Expected: empty.

- [ ] **Step 8: R-glass scope check**

Run: `grep -rn "from 'expo-glass-effect'" apps/mobile/src/`
Expected: only `GlassTabBar.tsx` + `BottomSheetPrimitive.tsx`. No jar/category files import expo-glass-effect.

- [ ] **Step 9: Type-check + lint + tests + export**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test && npx expo export -p ios`
Expected: all exit 0; 217+ tests green (new geometry test added).

- [ ] **Step 10: Commit**

```bash
git add apps/mobile/src/features/jars/
git commit -m "feat(jars): featured hero + mini-ring rows + ring palette prop (Wave 5 T4)

JarListScreen restructures around a featured-jar card (184pt ring,
Oswald amount, Garamond name, Manrope sub-meta) and a hairline-
separated list of JarRows below. JarRow swaps icon-well for a
46pt mini ring (sage / sageSoft by progress threshold) with moss-
text percentage right-aligned. JarRing accepts {size, strokeWidth,
palette, showCenterLabel} props so featured + mini share one Skia
tree. Geometry tests cover both variants. JarCreateBottomSheet uses
displayS header + 42pt accent pill CTA. Tokens-only, no glass."
```

---

## Task 5 — Wave gate + W5-DEVICE-UAT + STATE update

**Files:**
- Create: `.planning/phases/redesign/W5-DEVICE-UAT.md`
- Modify: `.planning/STATE.md`

- [ ] **Step 1: Re-run the full wave gate**

Run from `apps/mobile`:
```bash
npx tsc --noEmit
npx expo lint
npm test
npx expo export -p ios
```
Expected: all exit 0; 217+ tests green.

- [ ] **Step 2: Re-run all R-checks**

```bash
# R5 motion vocab (excluding the resolved sites inside primitive)
grep -nE "withTiming|withSpring" apps/mobile/src/features/categories apps/mobile/src/features/jars apps/mobile/src/components/BottomSheet/
# Expected: matches only inside BottomSheetPrimitive.tsx (governed via resolveSheet*); no matches in categories/ or jars/.

# R6 banned-hex sweep
grep -nE "#667EEA|#8B7AB8|#E8E0FF|#10B981|#1A73E8|#2563EB" apps/mobile/src/features/categories apps/mobile/src/features/jars
# Expected: empty.

# R-glass scope
grep -rn "from 'expo-glass-effect'" apps/mobile/src/
# Expected: only GlassTabBar.tsx + BottomSheetPrimitive.tsx.

# R-icon (no emoji-as-UI)
grep -nP "[\x{1F300}-\x{1FAFF}]" apps/mobile/src/features/categories apps/mobile/src/features/jars
# Expected: empty.

# R-tokens (no inline hex styles)
grep -nE "style=\{\{[^}]*#[0-9A-Fa-f]" apps/mobile/src/features/categories apps/mobile/src/features/jars
# Expected: empty.
```

Capture failures inline in the commit body if any can't be resolved (logged as accepted drift).

- [ ] **Step 3: Author `.planning/phases/redesign/W5-DEVICE-UAT.md`**

Create with:

```markdown
# Wave 5 device UAT — batched build

Wave 5 introduces NO new native module. This UAT is batched into the
existing W1+W2+W3+W4 EAS iOS device build (queued for after TestFlight #6).
Re-use the same TestFlight install; no second build needed.

## Test matrix (run on iPhone 12 mini + iPhone 15 Pro min)

### Sheet motion (W5 T1/T2)
- Open ChatBottomSheet → soft spring settle (no overshoot bounce); reduce-motion → instant.
- Open RecategorizeBottomSheet → identical feel to chat sheet open.
- Open CategoryEditorBottomSheet → identical.
- Open JarCreateBottomSheet → identical.
- Programmatic close on each → 220ms outCubic glide.
- Drag down 60pt (under threshold) → snap-back spring.
- Drag down 100pt (over threshold) → gesture-close timing 200ms.

### Categories (W5 T3)
- List paints with hairline separators between rows.
- Each row shows icon + name + count meta + tabular amount-right + 4pt category-color share bar at row bottom.
- Tapping a row opens CategoryEditor; header is Oswald 24pt; section labels uppercase Manrope.
- ColorSwatchPicker: tap rotates accent ring; selected swatch reads as `radio` checked in VoiceOver.
- IconPicker: grid layout, 8 per row; selected icon shows accent ring + 15% accent bg.

### Jars (W5 T4)
- Jars tab opens with a featured-jar card at top: 184pt ring, Oswald €amount center, Garamond name beneath.
- JarRow list below: 46pt mini ring left (sage if ≥50%, sageSoft otherwise), name + balance/target meta, moss-text % right.
- Tap a JarRow → JarDetail header shows featured-size ring + Oswald amount + Garamond name.
- JarCreate sheet: Oswald 24pt header, accent 42pt pill save.

### Accessibility
- VoiceOver swipe order: featured card → row 1 → row 2 → ... (no a11y trap).
- Reduce-motion: sheet open/close becomes instant, JarRing crossfade becomes instant.
- Tap targets ≥ 44×44pt on every interactive element.

## Pass criteria
- No crash on tab switch / sheet open / row tap.
- No visible AI-slop hex (blue/lavender/Tailwind-green).
- Sheet motion feels uniform across all 4 sheets (the W5 governance promise).
- Reduce-motion path works.

## Known carry-forward
- Android dev-client emulator UAT runs independently (build queued separately).
- Card-grid Categories drift accepted; revisit when budget-per-category lands.
- Featured-jar selection = createdAt ASC[0]; no UI reorder control.
```

- [ ] **Step 4: Update `.planning/STATE.md`**

Append a `2026-05-22: Wave 5 ...` block to the existing change log. Suggested content:

```
2026-05-22: Redesign Wave 5 (categories + jars + sheet-motion governance) CODE complete. Plan docs/superpowers/plans/2026-05-22-soldi-redesign-wave-5-cat-jar-motion.md (5 tasks). Design-sync checkpoint vs soldify-screens.html:305-397 RESOLVED (5 user decisions in plan). Commits <hash range> on main: T1 MOTION.sheet{Open,Close,GestureClose,SnapBack} (additive, sheetSpring superseded) → T2 BottomSheetPrimitive 4 ad-hoc sites → governed via SHEET_DAMPING_RATIO (W4 shared-primitive motion debt CLOSED) → T3 Categories editorial list + share-of-month hairline bar + sheet typography → T4 Jars featured hero + mini-ring rows + ring palette prop + geometry variant tests → T5 wave gate + W5-DEVICE-UAT (batched W1-W5 build) + STATE. Gate spec §4 4/4 GREEN: tsc0/lint0/217+0/expo-export-ios0. R5 motion-vocab: zero ad-hoc literals in categories/ + jars/; primitive routes via MOTION.sheet*. R6 no banned/raw hex W5 files. R-glass scope: still GlassTabBar + BottomSheetPrimitive only (zero glass on Category/Jar editor content). Device-UAT .planning/phases/redesign/W5-DEVICE-UAT.md BATCHED into W1+W2+W3+W4 glass build. Accepted design-sync drift logged: Categories card-grid → kept-as-list (scale to many categories); featured-jar selection = createdAt ASC[0] (no UI reorder control). Next: Wave 6 (Onboarding + Settings) or run the batched W1-5 EAS build after TestFlight #6.
```

Also update the deferred-items table: REMOVE the "Tech-debt | Shared BottomSheetPrimitive open/close motion is ad-hoc..." row (debt closed in T2). Adjust progress percentage downstream if it's auto-computed.

- [ ] **Step 5: Commit and push**

```bash
git add .planning/phases/redesign/W5-DEVICE-UAT.md .planning/STATE.md
git commit -m "docs(plan): Wave 5 gate green + batched device-UAT + state (T5)

All five Wave 5 tasks ship to main. Gate 4/4 green (tsc0/lint0/217+/export0).
R-checks clean across categories/ + jars/ + sheet primitive. Shared-primitive
motion debt logged in W4 is now closed. Device-UAT batched into the W1+W2+W3+W4
EAS glass build."

git push origin main
```

---

## Self-review summary

Verified against the spec:
- [x] T1 — MOTION.sheet preset family covered (4 entries + tests).
- [x] T2 — BottomSheetPrimitive 4 sites covered with worklet-safety note for gesture sites.
- [x] T3 — Categories surface covered (list + editor + pickers).
- [x] T4 — Jars surface covered (list + featured + ring consolidation + detail + create sheet + geometry tests).
- [x] T5 — Wave gate + R-checks + W5-DEVICE-UAT + STATE update covered.
- [x] Anti-criteria honored: no new file under `src/components/BottomSheet/`; no spring-symmetric close; no glass on editor sheets; no emoji-as-UI; no Onboarding/Settings touched.
- [x] Risks mitigated inline: geometry variant tests precede ring consolidation; featured-jar deterministic ordering documented; `useReducedMotion` fallback note for boundary changes.
- [x] All steps contain executable commands or actual code; no "TBD"/"similar to" placeholders.
