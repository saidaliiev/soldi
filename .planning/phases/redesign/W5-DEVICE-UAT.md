# Wave 5 device UAT — batched build

Wave 5 introduces NO new native module. This UAT is batched into the
existing W1+W2+W3+W4 EAS iOS device build (queued for after TestFlight #6).
Re-use the same TestFlight install; no second build needed.

## Test matrix (run on iPhone 12 mini + iPhone 15 Pro min)

### Sheet motion (W5 T1/T2) — governance debt closed
- Open ChatBottomSheet → soft spring settle (no overshoot bounce); reduce-motion → instant.
- Open RecategorizeBottomSheet → identical feel to chat sheet open.
- Open CategoryEditorBottomSheet → identical.
- Open JarCreateBottomSheet → identical.
- Programmatic close on each → 220ms outCubic glide.
- Drag down 60pt (under threshold) → snap-back spring (380ms governed).
- Drag down 100pt (over threshold) → gesture-close timing 200ms.

### Categories (W5 T3)
- List paints with hairline separators between rows.
- Each row shows a 40pt icon-badge (category color @ 12% alpha) + Manrope name + chevron-right.
- Tapping a row opens CategoryEditor; section labels render uppercase Manrope.
- ColorSwatchPicker: tap rotates accent ring (2.5pt now); selected swatch reads as `radio` checked in VoiceOver.
- IconPicker: existing horizontal scroll; selected icon shows accent ring + 15% accent bg.
- Long-press a custom-category row → drag-merge unchanged (D-19 contract preserved).

### Jars (W5 T4)
- Jars tab opens with the featured-jar card at top: 184pt ring, Oswald €amount center, Garamond 21pt name, "€X to go" Manrope sub-meta.
- JarRow list below: 46pt mini ring left (sage if ≥50% progress, sageSoft otherwise), name + balance/target meta, moss-text (sageDark) percentage right.
- Tap a JarRow → JarDetail header shows 184pt featured ring + Garamond name + icon-badge.
- JarCreate sheet: uppercase field labels, 42pt accent pill save.

### Accessibility
- VoiceOver swipe order: featured jar card → row 1 → row 2 → ... (no a11y trap).
- Reduce-motion: sheet open/close becomes instant, JarRing crossfade reflects degraded preset.
- Tap targets ≥ 44×44pt on every interactive element (row 56pt; CTA pill 42pt + padding).

## Pass criteria
- No crash on tab switch / sheet open / row tap.
- No visible AI-slop hex (blue/lavender/Tailwind-green).
- Sheet motion feels uniform across all 4 sheets (the W5 governance promise — single SHEET_DAMPING_RATIO).
- Reduce-motion path works.

## Accepted design-sync drift (logged in plan)
- Categories card-grid (HTML §5) → kept as list (scales to many categories without budget-per-category data model).
- Per-row 4pt share-of-month progress bar deferred (needs monthly totals piped through `listCategoriesEnriched`; out of editorial-wave scope).
- Featured-jar selection = `listJars()[0]` (createdAt ASC); no UI reorder control added.

## Known carry-forward
- Android dev-client emulator UAT runs independently (W5 features Android-glass-fallback — runtime gates already return false on Android; ring + list surfaces are pure RN/Skia, fully renderable on Android Skia).
- Existing pre-W5 animations inside sanctioned primitives are NOT governance debt:
  - `CategoryListRow` drag-merge `withSpring` (D-19 contract; spec §Anti-criteria: DragMerge behavior frozen).
  - `JarRing` D-05 crossfade `withTiming` (the ring IS the animation primitive, mirrors DonutChart idiom).
