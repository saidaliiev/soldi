# Wave 6 device UAT — batched build

Wave 6 introduces NO new native module. Batched into the existing
W1+W2+W3+W4+W5 EAS iOS device build (queued for after TestFlight #6).
Re-use the same install; no second build needed.

## Test matrix (run on iPhone 12 mini + iPhone 15 Pro min)

### Onboarding — Welcome (W6 T1)
- Decorative donut mark renders at top (terracotta accent outer ring + moss sage inner ring + textPrimary center dot, 116pt envelope).
- Headline "Your money. / At peace." renders in Oswald 46pt across 2 lines, -0.5 letterSpacing.
- Subtitle renders in Garamond 19pt, textSecondary.
- Two language tiles render with surface bg + SHADOWS.card.
- Page-dot indicator at bottom: 3 dots, first is wide-accent (22×6), others are textPrimary@18% (6×6).
- Reduce-motion: entrance withTiming(600) collapses to instant.

### Onboarding — 6 follow-on screens (W6 T2, verification only)
- data-source / monobank / csv / manual / synthetic / biometric: typography reads from TYPE.*, no AI-slop hex, all colors via tokens.
- Existing flow (next button → next screen) unchanged.

### Settings (W6 T3)
- Native Stack header HIDDEN (headerShown:false in app/_layout.tsx).
- In-body back affordance: "‹ Back" tap row, accent-colored, 44pt min, at top of scroll.
- In-body Oswald 30pt title "Settings", textPrimary, 36 lineHeight.
- 4 uppercase moss-text (sageDark) section labels with 1.2 letterSpacing: Security / Preferences / Notifications / Data.
- 4 grouped cards on COLORS.surface with SHADOWS.card and overflow:hidden (clean rounded corners).
- No "Sign out" row (no auth/sign-out logic in codebase; out of scope).

### Toggles (W6 T4)
- BiometricToggle: 56pt row, internal SPACING.md padding both axes, RN Switch with trackColor false=textMuted@22%, true=accent, thumbColor=white.
- DigestToggle: same row geometry + switch styling as Biometric.
- LanguageToggle: segmented EN | Українська (existing functional control, retained); margin SPACING.md inside card so it breathes.
- ExportButton: accent pill, margin SPACING.md inside card.
- Every row ≥ 44pt tap target.

### Accessibility
- VoiceOver swipe order: back row → title → section label → row → section label → row → ...
- All interactive elements have accessibilityLabel + accessibilityRole.
- Reduce-motion path works (welcome entrance instant).

## Pass criteria
- No crash on onboarding flow / Settings open / toggle tap.
- No visible AI-slop hex.
- Reduce-motion path works.
- iOS edge-swipe back from Settings works (fallback for the in-body back row).

## Accepted design-sync drift (logged in plan)
- Welcome screen keeps language tiles below hero (existing flow stores language before navigation; HTML §1 standalone CTA pill replaced by tile pair).
- Decorative donut uses concentric `<View>` rings (no react-native-svg in deps; Skia is overkill for a static decoration). Palette story preserved (terracotta + moss + textPrimary dot).
- 4 Settings sections (Security / Preferences / Notifications / Data), not HTML §8's 2, because the codebase has 4 toggle semantics.
- No "Sign out" row — no auth/sign-out in codebase.
- LanguageToggle keeps segmented EN | UK control (not row-with-value-right pattern from HTML §8) — segmented saves a tap on a 2-option choice.
- ExportButton keeps accent pill (not row-with-chevron) — pill reads clearly as a one-shot action vs a tap-row that suggests navigation.

## Known carry-forward
- Android dev-client emulator UAT runs independently (Android-glass-fallback active; onboarding + settings are pure RN, fully renderable).
- TestFlight #7 push (redesign-complete binary) is a separate task.
- The redesign track is now CODE-COMPLETE across all 6 waves.
