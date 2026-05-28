# DESIGN-ORDER — Dashboard color-cue & typography audit

> Designer review. soldify dashboard. Decision-grade artifact. Hand to Forge/Engineer.
> Reviewer: Designer agent. Date: 2026-05-27.
> Evidence sources: PerplexityResearcher 2026-05-27 benchmark (Copilot, Monarch, Emma),
> `tokens.ts`, `typography.ts`, `CategoryRow.tsx`, `DonutChart.tsx`, `app/(tabs)/index.tsx`.

---

## Section 1 — Verdict on the color-dot question

**VERDICT: (b) — drop the bar, keep the dot + emoji.**

### Justification (160 words)

Three color cues per row is over-cueing. The benchmark norm (Copilot, Monarch, Emma) is two: a chromatic chip plus an iconic glyph, sometimes a chip alone. soldify currently triples up — 8pt dot, 20pt emoji, AND a 2pt color-tinted percent bar — which fights the editorial Slate & Sand restraint we built the palette around. Something has to go.

The 2pt bar is the weakest of the three. It encodes proportion (already shown by donut arc length AND by amount text on the right), and it duplicates the slice color a third time. Dropping it removes a graphic element entirely, restoring whitespace and pulling the row closer to the donut chart's quietude.

I rejected (a) because the dot is the binding contract between donut and list — without it, the user has to re-learn the legend per row. I rejected (c) because two cues (dot+emoji) is the proven premium minimum. I rejected (d) because three cues IS the AI-slop "stack everything" smell.

### Before / after JSX diff — `apps/mobile/src/features/dashboard/CategoryRow.tsx`

**BEFORE** (lines 65-92, dot + emoji + bar):

```tsx
<Pressable …>
  <View style={styles.topLine}>
    <View style={[styles.dot, { backgroundColor: slice.color }]} />
    <Text style={styles.emoji} allowFontScaling={false}>
      {slice.emoji}
    </Text>
    <Text style={styles.name} …>{displayName}</Text>
    <View style={styles.spacer} />
    <Text style={styles.amount} …>{formatted}</Text>
  </View>
  <View style={styles.barTrack}>
    <View style={[styles.barFill, { backgroundColor: barColor, width: `${pct}%` }]} />
  </View>
</Pressable>
```

**AFTER** (single line, dot + emoji, bar removed):

```tsx
<Pressable …>
  <View style={styles.topLine}>
    <View style={[styles.dot, { backgroundColor: slice.color }]} />
    <Text style={styles.emoji} allowFontScaling={false}>
      {slice.emoji}
    </Text>
    <Text style={styles.name} …>{displayName}</Text>
    <View style={styles.spacer} />
    <Text style={styles.amount} …>{formatted}</Text>
  </View>
</Pressable>
```

**Style deletions** (lines 137-145): drop `barTrack` and `barFill`. **Logic deletions** (lines 43-45): drop `barWidth`, `barColor`, and the unused `maxAmountCents` prop. Update `Props` to remove `maxAmountCents`. Update the dashboard caller in `app/(tabs)/index.tsx` to stop passing it.

**Row height impact**: row min-height stays 44pt (CLAUDE.md tap target floor). Visual height drops ~6pt (2pt bar + 4pt `marginTop: SPACING.xs`), tightening the list and increasing vertical density — desirable for a top-5 panel.

**Dot promotion** (optional, recommended): with the bar gone, bump dot from 8×8 to 10×10 and `marginRight: SPACING.sm` (was xs). Reads more confidently as the color anchor when it's the only color cue besides the emoji. ESLint enforces no inline hex; the dot still pulls `slice.color` dynamically, which is legitimate (data, not literal).

---

## Section 2 — Typography + spacing delta table

Reviewed regions: hero band, donut center, category row, yesterday card, FAB. Premise: Oswald for hero numbers only, EB Garamond reserved for editorial/chat, Manrope for UI primitives. The current dashboard mostly respects this — two corrections below.

| Region | Current preset | Proposed preset | pt change | Reason |
|---|---|---|---|---|
| Hero monthly total | (assumed) `TYPE.displayXL` 64/72 Oswald | keep | 0 | Aligned with benchmark hero scale; nothing to change. |
| Hero label ("THIS MONTH") | `TYPE.heroLabel` 13/16 Manrope, 1.8 tracking | keep | 0 | Tracked uppercase eyebrow is correct and premium. |
| Hero subline ("€312 less than April") | `TYPE.heroSubline` 15/20 Manrope semibold | keep | 0 | Right typeface, right weight, right hierarchy step. |
| Donut center — fallback total | `TYPE.displayL` 40/48 Oswald | keep | 0 | Empty-state fallback only; correct scale. |
| Donut center — `totalLabel` ("TOP CATEGORY") | `TYPE.uiLabel` 14/18 Manrope | **`TYPE.heroLabel` 13/16 + 1.8 tracking** | -1pt + tracking | Centre eyebrow currently reads as a generic label. Promoting to the tracked uppercase eyebrow matches the hero band visually and binds the two regions. |
| Donut center — `sliceName` (selected/top) | `TYPE.displayL` 40/48 Oswald | **`TYPE.displayM` 28/34 Oswald** | -12pt | 40pt category name inside a 200pt canvas with 14pt stroke leaves zero side margin; the `adjustsFontSizeToFit minimumFontScale={0.6}` is a tell that the size is too big. 28pt sits in the ring cleanly without auto-shrink, removing the variable-size cognitive flicker between months. |
| Donut center — `sliceAmount` | `TYPE.displayL` 40/48 Oswald | **`TYPE.displayM` 28/34 Oswald** | -12pt | Same reasoning — the amount duplicated at 40pt next to a 64pt hero is redundant heavy weight. 28pt establishes a clean step (64 → 28). |
| Donut center — `slicePercent` | `TYPE.uiBody` 16/22 Manrope | **`TYPE.uiLabel` 14/18 Manrope** | -2pt | Percentage is supporting metadata, not body copy. Drops it one level in the hierarchy. |
| Category row — name | `TYPE.uiBody` 16/22 Manrope medium | keep | 0 | Correct. |
| Category row — amount | `TYPE.tabular` 16/22 Manrope semibold + tnum | keep | 0 | Correct — tabular alignment is the whole point of this preset. |
| Donut canvas / hero gap | -32pt (negative `donutBridge.marginTop`) overlapping into +24pt below-hero pad | **-16pt overlap** (`donutBridge.marginTop: -SPACING.md`) | +16pt breathing room | Benchmark premium gap is 24–32pt POSITIVE. soldify currently *crashes* the donut into the hero (-32). The reduction to -16 still preserves the deliberate "handshake" but stops looking like a layout bug at small-text accessibility scales. |

**Total touched typography presets**: 4 (donut center label, sliceName, sliceAmount, slicePercent).
**Total touched spacing values**: 1 (`donutBridge.marginTop`).
**Net Oswald usage on dashboard** drops from 3 sites at displayL to 1 site (hero only) + displayM in donut centre — restores the rule "Oswald is the hero typeface, not a recurring decoration."

---

## Section 3 — Atomic-commit checklist

Optimised for Forge/Engineer hand-off. Each task ≤30 LOC, ≤2 files. Order = dependency order.

```
1. refactor(dashboard): drop bar from CategoryRow — apps/mobile/src/features/dashboard/CategoryRow.tsx:81-92,137-145 — remove barTrack/barFill view + styles, delete barWidth/barColor locals, drop maxAmountCents from Props — third color cue is AI-slop over-stacking; benchmark norm is two cues (dot + emoji).

2. refactor(dashboard): stop passing maxAmountCents to CategoryRow — apps/mobile/app/(tabs)/index.tsx (search call site for <CategoryRow), and any test fixture under apps/mobile/src/features/dashboard/__tests__/ — remove the prop from the JSX and from any computed denominator above the map — strict-TS will flag stragglers; required to land step 1.

3. style(dashboard): promote dot to 10pt with sm margin — apps/mobile/src/features/dashboard/CategoryRow.tsx:109-114 — change width/height 8→10, marginRight SPACING.xs→SPACING.sm — with the bar gone, the dot becomes the sole chromatic anchor and needs more presence.

4. style(donut): tighten center labels to displayM — apps/mobile/src/features/dashboard/DonutChart.tsx:402-411 — sliceName + sliceAmount styles change ...TYPE.displayL → ...TYPE.displayM — 40pt inside a 200pt canvas relies on adjustsFontSizeToFit; 28pt fits natively, removes per-month size flicker.

5. style(donut): demote slicePercent to uiLabel — apps/mobile/src/features/dashboard/DonutChart.tsx:412-415 — change ...TYPE.uiBody → ...TYPE.uiLabel — percentage is metadata, not body; restores hierarchy step under the now-smaller sliceName.

6. style(donut): promote totalLabel to tracked heroLabel — apps/mobile/src/features/dashboard/DonutChart.tsx:393-396 — change ...TYPE.uiLabel → ...TYPE.heroLabel, keep color textMuted — binds the donut centre to the hero band's eyebrow visually.

7. style(dashboard): soften hero→donut crash from -xl to -md — apps/mobile/app/(tabs)/index.tsx:331-334 — donutBridge.marginTop -SPACING.xl → -SPACING.md, leave marginBottom -sm as-is — benchmark premium gap is 24-32pt positive; -32 reads as overlap bug at large-text accessibility scales, -16 keeps the deliberate handshake.

8. test(dashboard): update CategoryRow snapshot/unit for removed bar — apps/mobile/src/features/dashboard/__tests__/CategoryRow.test.tsx (or wherever the test lives — grep "CategoryRow" under __tests__) — drop assertions referencing barTrack/barFill/barWidth, drop maxAmountCents from test props — keep the dot + emoji + amount accessibility-label assertion as the contract.

9. test(donut): update DonutChart visual + a11y test for new typography — apps/mobile/src/features/dashboard/__tests__/DonutChart.test.tsx — update any inline style assertions for sliceName/sliceAmount/slicePercent presets — a11y label is unchanged so accessibility tests should pass without edit.

10. chore(design): document Oswald-on-dashboard rule — apps/mobile/src/design/typography.ts:21-43 — add a one-line JSDoc above displayL/displayXL: "Hero only. Do not stack inside donut centre — use displayM there." — prevents drift on the next iteration.
```

**Verification gate (per CLAUDE.md)** before each commit lands:
1. `cd apps/mobile && npx tsc --noEmit` → exit 0
2. `cd apps/mobile && npx expo lint` → exit 0
3. Eyeball on physical iPhone (Expo Go) — donut centre labels at the system "Large" accessibility text size; CategoryRow with `slice.name` ≥ 24 chars to confirm ellipsis still works without the bar.

**Out of scope for this order** (parked deliberately):
- Donut canvas size (200pt is low end of 200-235pt benchmark band — bump is a separate sprint with hero band recompute).
- Centre-tap morph animation (already exists via D-04; not part of this audit).
- Liquid Glass tab bar (handled in Wave 1; not a dashboard concern).
