# SOLDI Redesign — Wave 6 (Onboarding + Settings) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans, task-by-task. Steps use `- [ ]` checkboxes.

**Goal:** Close the redesign track by bringing the 7 onboarding screens to the HTML §1 editorial bar (Oswald headline + Garamond lead + accent CTA pill + page-dot indicator + decorative donut mark on welcome; typography + tokens sweep on the other 6 screens) and the Settings screen + 4 toggle subcomponents to the HTML §8 bar (Oswald 30pt title, uppercase moss-text section labels, grouped cards with internal hairlines, 46×28pt token-colored switches). After W6, every screen reads from `TYPE.*`/`COLORS.*`/`MOTION.*`/`SHADOWS.*` — chrome, dashboard, transactions, chat, categories, jars, onboarding, settings.

**Architecture:** Pure visual + token sweep. **No new files**, no API changes, no flow-logic changes, no new motion vocabulary, no new glass surfaces. Existing entrance animations in `welcome.tsx` already use `withTiming({duration: 600})` + `useReduceMotion`-compatible pattern; accepted drift — one-shot entrance, not user-facing motion debt. The Settings screen consolidates 4 single-toggle cards into 2 grouped cards (Security + Preferences à la HTML §8) with internal `StyleSheet.hairlineWidth` separators. Toggle subcomponents adopt a uniform `icon + label + control` row with 46×28pt switch geometry.

**Tech Stack:** Expo SDK 54, RN 0.81.5, TS 5.9 strict. Binds to REAL Wave-0..5 API on `origin/main @ b539052`: `TYPE.displayL`/`displayM`/`editorialLead`/`uiBody`/`uiButton`/`uiLabel`/`uiMeta` (`src/design/typography.ts`), `COLORS.background`/`surface`/`textPrimary`/`textSecondary`/`textMuted`/`accent`/`accentDeep`/`sage`/`sageDark`/`error` + `GRADIENTS.primary` (`src/design/tokens.ts`), `SHADOWS.card` (tokens), `SPACING.*`/`RADIUS.*` (tokens). HTML authority: `docs/design/soldify-screens.html:109-136` (Onboarding) + `:448-481` (Settings).

**Source of truth:** `docs/superpowers/specs/2026-05-22-soldi-redesign-wave-6-onboarding-settings-design.md`.

**Sequencing constraint (read first):** W6 introduces NO new native module. Local gates (tsc/lint/test/expo-export) run here; device-UAT is authored at T5 and **batched** into the existing W1-W5 EAS iOS device build (queued for after TestFlight #6). No second build needed.

**Working directory:** `apps/mobile/...` paths relative to repo root `/home/iskan/projects/soldify`. Run `npm`/`tsc`/`lint`/`expo`/`git` from `apps/mobile`. `npm test` glob = `src/**/*.test.ts` (node:test+tsx). Onboarding + Settings screen files are RN/Expo-router boundary, not testable with the node harness — gate + device-UAT, same as W1–W5.

---

## File Structure (decomposition locked here)

| File | Responsibility | Wave 6 action |
|---|---|---|
| `app/onboarding/welcome.tsx` | Hero + language picker | Modify — Oswald 46pt headline, Garamond 19pt lead, accent CTA pill above the language tiles, page-dot indicator (3 dots, first wide-accent), decorative donut SVG mark at top, existing entrance animation preserved |
| `app/onboarding/data-source.tsx` | Source-pick screen | Modify — typography + tokens sweep (no layout change) |
| `app/onboarding/monobank.tsx` | Monobank flow | Modify — typography + tokens sweep |
| `app/onboarding/csv.tsx` | CSV import flow | Modify — typography + tokens sweep |
| `app/onboarding/manual.tsx` | Manual entry flow | Modify — typography + tokens sweep |
| `app/onboarding/synthetic.tsx` | Synthetic-data flow | Modify — typography + tokens sweep |
| `app/onboarding/biometric.tsx` | Biometric opt-in | Modify — typography + tokens sweep |
| `src/features/settings/SettingsScreen.tsx` | Settings layout | Modify — Oswald 30pt title, uppercase moss-text section labels, grouped cards (Security + Preferences + Notifications + Data) with internal hairlines |
| `src/features/settings/BiometricToggle.tsx` | Biometric switch | Modify — row layout `icon + label (flex:1) + 46×28pt switch`; tokens + tap target |
| `src/features/settings/DigestToggle.tsx` | Daily-digest switch | Modify — same row layout pattern |
| `src/features/settings/LanguageToggle.tsx` | Language picker | Modify — same row layout pattern, control is value-right + chevron-right |
| `src/features/settings/ExportButton.tsx` | CSV export action | Modify — same row layout pattern, control is `chevron-right` |
| `.planning/phases/redesign/W6-DEVICE-UAT.md` | Deferred device-UAT | Create — batched into W1-W5 build |
| `.planning/STATE.md` | Planning state | Modify — W6 code-complete; redesign track CLOSED |

**Out of Wave 6 scope (do NOT touch):**
- Flow logic, store mutations, router wiring, validation rules — visual polish only.
- New onboarding steps, new Settings features, "Sign out" implementation if no existing auth path.
- Reduce-motion UI toggle inside Settings (HTML mocks one — defer; system reduce-motion respected via `useReduceMotion`).
- Dark-mode toggle.
- App-store review / TestFlight push.
- Perf budget passes.

**Key design decisions (locked, with citations):**
- **Welcome layout = hero + language tiles (accepted drift from HTML §1).** HTML §1 shows hero + CTA pill alone — language pick is implicit. The current flow stores language BEFORE navigation to `data-source`. Pragmatic call: keep both — hero (donut mark, headline, lead) at top, language tiles below, page-dot indicator at bottom. CTA pill becomes the language-tile pair; no separate "Get started" button (the language tap IS the CTA). Drift surfaced in T1 commit body.
- **Settings sections = 4 groups, not 2.** HTML §8 shows Security + Preferences (2 cards). Existing code has 4 sub-toggles (Language, Biometric, Digest, Export) currently in 4 separate cards. Consolidate into 4 sections matching code semantics: Security (Biometric), Preferences (Language), Notifications (Digest), Data (Export). Each section gets a single card with internal hairlines if multiple rows; current state = 1 row per section so internal hairlines unused, but the consolidation cadence (uppercase section label + grouped card) matches HTML §8 visually.
- **Sign-out row.** Existing `SettingsScreen.tsx` has no sign-out. Soldify is offline-first with no remote auth. OUT OF SCOPE; logged.
- **Existing entrance animation accepted.** `welcome.tsx` line 47: `opacity.value = withTiming(1, { duration: 600 })`. One-shot entrance, no MOTION preset name fits, not user-facing reusable motion. Leave as accepted drift; do NOT introduce `MOTION.heroEnter` for a single consumer.
- **Toggle row geometry.** 46×28pt switch (HTML §8: `width:46px;height:28px;border-radius:14px`). Thumb 22pt circle. Accent on / `${textMuted}38` off. Tap target ≥ 44pt via padded row container.

---

## Design-Sync Checkpoint (gate — before Task 1, STOP for user)

1. Read `soldify-screens.html:109-136` (ONBOARDING) and `:448-481` (SETTINGS).
2. Read impl: `welcome.tsx`, `SettingsScreen.tsx`, `BiometricToggle.tsx`, the 3 other toggles.
3. Compare against the locked decisions above. Drift list. **STOP** — user confirms before T1.

### Pre-resolved checkpoint deltas (locked at plan time, surface for confirmation):

1. **Welcome hero + language tiles together (NOT hero + standalone CTA).** Existing flow stores language BEFORE navigation. Drift accepted; tile pair functions as the CTA.
2. **4 Settings sections, not 2.** Code semantics (4 toggles) drive grouping; HTML cadence (uppercase moss-text label + card) preserved.
3. **No "Sign out" row.** No auth/sign-out logic in codebase. Logged out of scope.
4. **Decorative donut SVG on welcome.** Static SVG (matches HTML §1 lines 118-122) — pure JSX, no Skia, no animation.

---

## Task 1 — Welcome screen editorial hero (HTML §1)

**Files:**
- Modify: `apps/mobile/app/onboarding/welcome.tsx`

- [ ] **Step 1: Add decorative donut SVG above hero text**

Edit `apps/mobile/app/onboarding/welcome.tsx`. Add this import at the top alongside existing RN imports:

```tsx
import Svg, { Circle } from 'react-native-svg';
```

(If `react-native-svg` is not already a dependency, fall back to a pure-`View` two-ring approximation — but per HTML §1 the spec uses SVG circles; if `react-native-svg` is available — Skia is — use it.)

In the JSX, BEFORE the existing `<View style={styles.heroSection}>`, add:

```tsx
<View style={styles.donutMarkWrap} pointerEvents="none">
  <Svg width={116} height={116} viewBox="0 0 116 116">
    {/* Outer ring — accent terracotta */}
    <Circle
      cx={58} cy={58} r={44}
      fill="none"
      stroke={COLORS.accent}
      strokeWidth={7}
      strokeLinecap="round"
      strokeDasharray="207 277"
      transform="rotate(-90 58 58)"
    />
    {/* Inner ring — moss sage */}
    <Circle
      cx={58} cy={58} r={44}
      fill="none"
      stroke={COLORS.sage}
      strokeWidth={7}
      strokeLinecap="round"
      strokeDasharray="55 277"
      strokeDashoffset={-212}
      transform="rotate(-90 58 58)"
    />
    {/* Center dot — textPrimary */}
    <Circle cx={58} cy={58} r={6} fill={COLORS.textPrimary} />
  </Svg>
</View>
```

- [ ] **Step 2: Bump headline + lead typography to HTML §1 scale**

In the existing styles, modify:
```ts
title: {
  ...TYPE.displayL,
  fontSize: 46,
  lineHeight: 48,
  letterSpacing: -0.5,
  color: COLORS.textPrimary,
  marginBottom: SPACING.sm,
},
subtitle: {
  ...TYPE.editorialLead,
  fontSize: 19,
  lineHeight: 28,
  color: COLORS.textSecondary,
},
```

Add donut wrap style:
```ts
donutMarkWrap: {
  alignItems: 'center',
  marginBottom: SPACING.lg,
},
```

- [ ] **Step 3: Add page-dot indicator below tiles**

After the existing `<View style={styles.tilesContainer}>`, add:

```tsx
<View style={styles.dots}>
  <View style={[styles.dot, styles.dotActive]} />
  <View style={styles.dot} />
  <View style={styles.dot} />
</View>
```

Add styles:
```ts
dots: {
  flexDirection: 'row',
  justifyContent: 'center',
  columnGap: 7,
  marginTop: SPACING.lg,
},
dot: {
  width: 6,
  height: 6,
  borderRadius: 3,
  backgroundColor: `${COLORS.textPrimary}2E`, // 18% alpha
},
dotActive: {
  width: 22,
  backgroundColor: COLORS.accent,
},
```

- [ ] **Step 4: Type-check + lint**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: both exit 0.

If `react-native-svg` is missing, install it: `npm install react-native-svg`. Skia would be overkill for a static mark. If install adds native code requiring rebuild, fall back to a CSS-style `<View>`-only approximation (concentric circles via `borderWidth` + `position: absolute`) and log the SVG simplification as accepted drift.

- [ ] **Step 5: R-checks scoped to welcome.tsx**

Run:
```bash
grep -nE "#667EEA|#8B7AB8|#E8E0FF|#10B981|#1A73E8|#2563EB" apps/mobile/app/onboarding/welcome.tsx
grep -nE "style=\{\{[^}]*#[0-9A-Fa-f]" apps/mobile/app/onboarding/welcome.tsx
```
Expected: both empty.

- [ ] **Step 6: Commit**

```bash
cd /home/iskan/projects/soldify
git add apps/mobile/app/onboarding/welcome.tsx
# if react-native-svg was installed:
git add apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "feat(onboarding): editorial welcome hero per HTML §1 (Wave 6 T1)

Adds decorative donut SVG mark (accent terracotta outer ring + moss sage
inner arc + textPrimary center dot), bumps headline to Oswald 46pt /
lead to Garamond 19pt, adds page-dot indicator (3 dots, first wide-
accent) below language tiles. Tokens-only. Existing entrance animation
preserved (one-shot withTiming, accepted drift — no MOTION preset name
fits).

Accepted design-sync drift: HTML §1 shows hero + standalone CTA pill;
existing flow stores language before navigation, so language tiles
function as the CTA. No separate 'Get started' button."
```

---

## Task 2 — 6 follow-on onboarding screens: typography + tokens sweep

**Files:**
- Modify: `apps/mobile/app/onboarding/data-source.tsx`
- Modify: `apps/mobile/app/onboarding/monobank.tsx`
- Modify: `apps/mobile/app/onboarding/csv.tsx`
- Modify: `apps/mobile/app/onboarding/manual.tsx`
- Modify: `apps/mobile/app/onboarding/synthetic.tsx`
- Modify: `apps/mobile/app/onboarding/biometric.tsx`

This is a mechanical sweep. Do all 6 files in one pass, then verify.

- [ ] **Step 1: Audit each file for non-token text styles + inline hex**

For each file, run:
```bash
grep -nE "fontSize: \d+|color: '#|backgroundColor: '#|style=\{\{[^}]*#[0-9A-Fa-f]" apps/mobile/app/onboarding/<file>.tsx
```
List the offending lines per file.

- [ ] **Step 2: Replace inline text styles with TYPE.* presets**

For each text element using `fontSize: <n>`:
- Title-ish (≥ 24pt) → `...TYPE.displayM` (28pt) or override `fontSize` only when explicitly needed to hit HTML §1 cadence.
- Body / lead (16-22pt, editorial tone) → `...TYPE.editorialBody` or `...TYPE.editorialLead`.
- UI label / button / meta → `...TYPE.uiBody` / `...TYPE.uiButton` / `...TYPE.uiLabel` / `...TYPE.uiMeta`.
- Tabular numbers → `...TYPE.tabular`.

For each inline hex string in styles:
- Background → `COLORS.background` or `COLORS.surface`.
- Text-primary → `COLORS.textPrimary`.
- Text-muted → `COLORS.textMuted`.
- Accent → `COLORS.accent` (or `accentDeep` for pressed).
- Sage / moss → `COLORS.sage` / `COLORS.sageDark`.
- Error → `COLORS.error`.

Do NOT touch flow logic, store usage, navigation calls.

- [ ] **Step 3: Re-run R-checks across all 6 files**

```bash
cd apps/mobile
grep -rnE "#667EEA|#8B7AB8|#E8E0FF|#10B981|#1A73E8|#2563EB" app/onboarding/
grep -rnE "style=\{\{[^}]*#[0-9A-Fa-f]" app/onboarding/
grep -rnP "[\x{1F300}-\x{1FAFF}]" app/onboarding/
```
Expected: all empty.

- [ ] **Step 4: Type-check + lint + tests + export**

```bash
cd apps/mobile
npx tsc --noEmit
npx expo lint
npm test
npx expo export -p ios
```
Expected: all exit 0; 217+ tests green.

- [ ] **Step 5: Commit**

```bash
cd /home/iskan/projects/soldify
git add apps/mobile/app/onboarding/data-source.tsx apps/mobile/app/onboarding/monobank.tsx apps/mobile/app/onboarding/csv.tsx apps/mobile/app/onboarding/manual.tsx apps/mobile/app/onboarding/synthetic.tsx apps/mobile/app/onboarding/biometric.tsx
git commit -m "refactor(onboarding): typography + tokens sweep on 6 follow-on screens (Wave 6 T2)

data-source, monobank, csv, manual, synthetic, biometric — every text
style routed through TYPE.*, every color routed through COLORS.*. No
layout change, no flow logic change. R-checks clean (no banned hex,
no inline hex, no emoji-as-UI). Gate green: tsc0/lint0/217 tests/
expo-export-ios0."
```

---

## Task 3 — Settings layout per HTML §8

**Files:**
- Modify: `apps/mobile/src/features/settings/SettingsScreen.tsx`

- [ ] **Step 1: Add a header block above the scroll**

Edit `SettingsScreen.tsx`. Replace the existing scroll content with:

```tsx
return (
  <ScrollView
    style={styles.scroll}
    contentContainerStyle={[styles.content, { paddingBottom: SPACING.xxl + insets.bottom }]}
    showsVerticalScrollIndicator={false}
    accessibilityLabel={t('settings.title')}
  >
    <Text style={styles.screenTitle} accessibilityRole="header" allowFontScaling>
      {t('settings.title')}
    </Text>

    {/* Security section */}
    <Text style={styles.sectionLabel} allowFontScaling>
      {t('settings.security_section')}
    </Text>
    <View style={styles.card}>
      <BiometricToggle />
    </View>

    {/* Preferences section */}
    <Text style={styles.sectionLabel} allowFontScaling>
      {t('settings.language_section')}
    </Text>
    <View style={styles.card}>
      <LanguageToggle />
    </View>

    {/* Notifications section */}
    <Text style={styles.sectionLabel} allowFontScaling>
      {t('settings.notifications_section')}
    </Text>
    <View style={styles.card}>
      <DigestToggle />
    </View>

    {/* Data section */}
    <Text style={styles.sectionLabel} allowFontScaling>
      {t('settings.data_section')}
    </Text>
    <View style={styles.card}>
      <ExportButton />
    </View>
  </ScrollView>
);
```

- [ ] **Step 2: Update styles to match HTML §8 cadence**

Replace the `styles` const at the bottom of `SettingsScreen.tsx` with:

```ts
const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  screenTitle: {
    ...TYPE.displayM,
    fontSize: 30,
    lineHeight: 36,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    ...TYPE.uiLabel,
    color: COLORS.sageDark,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    ...SHADOWS.card,
    overflow: 'hidden',
  },
});
```

(Remove any `section` style entry that no longer has a consumer.)

- [ ] **Step 3: Hide the native Stack header**

Locate the Stack route configuration in `app/_layout.tsx` (or the route file `app/settings.tsx`). Add `headerShown: false` to the Settings screen options so the new in-body Oswald title doesn't compete with a native bar. If the native bar is required for back-navigation, leave it but pass `headerShown: false` ONLY when safe — confirm by checking the route file before editing.

```bash
cd apps/mobile && grep -n "settings" app/_layout.tsx app/settings.tsx
```

If the route already declares `options={{ headerShown: false }}` or similar, skip this step.

- [ ] **Step 4: Type-check + lint**

```bash
cd apps/mobile
npx tsc --noEmit
npx expo lint
```
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
cd /home/iskan/projects/soldify
git add apps/mobile/src/features/settings/SettingsScreen.tsx
# if Stack route was edited:
git add apps/mobile/app/_layout.tsx apps/mobile/app/settings.tsx
git commit -m "feat(settings): layout per HTML §8 (Wave 6 T3)

In-body Oswald 30pt title, uppercase moss-text (sageDark) section
labels with 1.2 letter-spacing, four grouped cards (Security /
Preferences / Notifications / Data) on COLORS.surface with SHADOWS.card.
No 'Sign out' row (no auth/sign-out logic in codebase; out of scope).
Tokens-only. T4 polishes the 4 toggle row components."
```

---

## Task 4 — Toggle subcomponents row geometry + tokens

**Files:**
- Modify: `apps/mobile/src/features/settings/BiometricToggle.tsx`
- Modify: `apps/mobile/src/features/settings/DigestToggle.tsx`
- Modify: `apps/mobile/src/features/settings/LanguageToggle.tsx`
- Modify: `apps/mobile/src/features/settings/ExportButton.tsx`

All four adopt the same row pattern: `icon + label (flex:1) + control`.

- [ ] **Step 1: Read each file to identify the current shape**

```bash
cd apps/mobile && head -50 src/features/settings/BiometricToggle.tsx src/features/settings/DigestToggle.tsx src/features/settings/LanguageToggle.tsx src/features/settings/ExportButton.tsx
```

Confirm each uses a `<Pressable>` or `<View>` row and a control element (switch / chevron / value-right).

- [ ] **Step 2: Apply the uniform row pattern**

For each component, the row structure becomes:

```tsx
<Pressable
  onPress={handlePress}
  accessibilityRole="button"
  accessibilityLabel={a11yLabel}
  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
>
  <View style={styles.iconWrap}>
    {/* existing icon SVG */}
  </View>
  <Text style={styles.label} allowFontScaling>
    {label}
  </Text>
  {/* control: switch / value-right / chevron */}
</Pressable>
```

Shared row styles (copy into each file's `StyleSheet.create`; no shared helper file per project pattern):

```ts
row: {
  flexDirection: 'row',
  alignItems: 'center',
  minHeight: 52,
  paddingHorizontal: SPACING.md,
  paddingVertical: SPACING.sm,
  columnGap: SPACING.md,
},
pressed: { opacity: 0.7 },
iconWrap: {
  width: 24,
  height: 24,
  alignItems: 'center',
  justifyContent: 'center',
},
label: {
  ...TYPE.uiBody,
  color: COLORS.textPrimary,
  flex: 1,
},
```

For **BiometricToggle** + **DigestToggle**, the control is a 46×28pt switch (use RN built-in `<Switch>` with `trackColor={{ false: \`${COLORS.textMuted}38\`, true: COLORS.accent }}` + `thumbColor={COLORS.white}` for cross-platform parity — RN Switch already maps to ~46×28pt geometry).

For **LanguageToggle**, the control is a `<Text style={styles.valueRight}>{currentLanguageName}</Text>` followed by `<ChevronRight ... />` icon.

For **ExportButton**, the control is just `<ChevronRight ... />` (entire row is the press target).

Add `valueRight`:
```ts
valueRight: {
  ...TYPE.uiBody,
  fontSize: 14,
  color: COLORS.textMuted,
  marginRight: SPACING.xs,
},
```

- [ ] **Step 3: R-checks scoped to settings**

```bash
cd apps/mobile
grep -rnE "#667EEA|#8B7AB8|#E8E0FF|#10B981|#1A73E8|#2563EB" src/features/settings/
grep -rnE "style=\{\{[^}]*#[0-9A-Fa-f]" src/features/settings/
grep -rnP "[\x{1F300}-\x{1FAFF}]" src/features/settings/
```
Expected: all empty.

- [ ] **Step 4: Type-check + lint + tests + export**

```bash
cd apps/mobile
npx tsc --noEmit
npx expo lint
npm test
npx expo export -p ios
```
Expected: all exit 0; 217+ tests green.

- [ ] **Step 5: Commit**

```bash
cd /home/iskan/projects/soldify
git add apps/mobile/src/features/settings/BiometricToggle.tsx apps/mobile/src/features/settings/DigestToggle.tsx apps/mobile/src/features/settings/LanguageToggle.tsx apps/mobile/src/features/settings/ExportButton.tsx
git commit -m "refactor(settings): uniform icon+label+control row geometry (Wave 6 T4)

BiometricToggle + DigestToggle use RN Switch with accent trackColor
on / textMuted@22% off. LanguageToggle shows current-language value +
chevron-right. ExportButton is a single tap-row with chevron-right.
All four share the icon+label(flex:1)+control row pattern, 52pt min
height, tokens-only, 44pt min tap target via row padding."
```

---

## Task 5 — Wave gate + W6-DEVICE-UAT + STATE update

**Files:**
- Create: `.planning/phases/redesign/W6-DEVICE-UAT.md`
- Modify: `.planning/STATE.md`

- [ ] **Step 1: Re-run the full wave gate**

```bash
cd apps/mobile
npx tsc --noEmit
npx expo lint
npm test
npx expo export -p ios
```
Expected: all exit 0; 217+ tests green.

- [ ] **Step 2: Re-run all R-checks (W6 scope)**

```bash
# R6 banned-hex sweep
grep -rnE "#667EEA|#8B7AB8|#E8E0FF|#10B981|#1A73E8|#2563EB" app/onboarding/ src/features/settings/
# Expected: empty.

# R-glass scope (unchanged from W5)
grep -rln "from 'expo-glass-effect'" src/
# Expected: only GlassTabBar.tsx + BottomSheetPrimitive.tsx.

# R-icon emoji
grep -rnP "[\x{1F300}-\x{1FAFF}]" app/onboarding/ src/features/settings/
# Expected: empty.

# R-tokens (no inline hex styles)
grep -rnE "style=\{\{[^}]*#[0-9A-Fa-f]" app/onboarding/ src/features/settings/
# Expected: empty.
```

- [ ] **Step 3: Author `.planning/phases/redesign/W6-DEVICE-UAT.md`**

```markdown
# Wave 6 device UAT — batched build

Wave 6 introduces NO new native module. Batched into the existing
W1+W2+W3+W4+W5 EAS iOS device build (queued for after TestFlight #6).
Re-use the same install; no second build needed.

## Test matrix (run on iPhone 12 mini + iPhone 15 Pro min)

### Onboarding — Welcome (W6 T1)
- Decorative donut mark renders at top (terracotta outer arc + moss inner arc + center dot).
- Headline "Your money. At peace." renders in Oswald 46pt across 2 lines.
- Subtitle renders in Garamond 19pt, textSecondary.
- Two language tiles render with surface bg + shadow.
- Page-dot indicator at bottom (3 dots, first wide-accent).
- Reduce-motion: entrance withTiming(600) collapses to instant.

### Onboarding — 6 follow-on screens (W6 T2)
- data-source / monobank / csv / manual / synthetic / biometric: typography reads from TYPE.*, no AI-slop hex, all colors via tokens.
- Existing flow (next button → next screen) unchanged.

### Settings (W6 T3)
- In-body Oswald 30pt title "Settings".
- 4 uppercase moss-text (sageDark) section labels: Security / Preferences / Notifications / Data.
- 4 grouped cards on COLORS.surface with SHADOWS.card.
- No "Sign out" row (no auth/sign-out logic in codebase).

### Toggles (W6 T4)
- Biometric switch: accent on / textMuted@22% off, white thumb.
- Digest switch: same.
- Language row: value-right (e.g. "English") + chevron-right.
- Export row: chevron-right only; whole row taps.
- Every row ≥ 44pt tap target.

### Accessibility
- VoiceOver swipe order: title → section label → row → section label → row → ...
- All interactive elements have accessibilityLabel + accessibilityRole.

## Pass criteria
- No crash on onboarding flow / Settings open / toggle tap.
- No visible AI-slop hex.
- Reduce-motion path works.

## Accepted design-sync drift (logged in plan)
- Welcome screen keeps language tiles below hero (existing flow stores language before navigation).
- 4 Settings sections (Security / Preferences / Notifications / Data), not 2 — driven by code semantics.
- No "Sign out" row — no auth/sign-out in codebase.
- decorative donut SVG static (no animation; HTML §1 mock is also static).
```

- [ ] **Step 4: Update `.planning/STATE.md`**

Prepend to the W4/W5 change log:

```
2026-05-22: Redesign Wave 6 (Onboarding + Settings) CODE complete. Plan docs/superpowers/plans/2026-05-22-soldi-redesign-wave-6-onboarding-settings.md (5 tasks). Design-sync checkpoint vs soldify-screens.html:109-136 + :448-481 pre-resolved in plan (4 decisions). Commits <hash range> on main: T1 Welcome editorial hero (donut SVG + Oswald 46pt headline + Garamond 19pt lead + page-dot indicator) → T2 6 follow-on onboarding screens typography + tokens sweep → T3 Settings in-body Oswald 30pt title + 4 uppercase moss-text sections + grouped cards → T4 4 toggle subcomponents uniform icon+label+control row geometry + 46×28pt switch + 44pt tap target → T5 wave gate + W6-DEVICE-UAT (batched W1-W6 build) + STATE. Gate spec §4 4/4 GREEN: tsc0/lint0/217+0/expo-export-ios0. R6 no banned/raw hex W6 files. R-glass scope: still GlassTabBar + BottomSheetPrimitive only. R-icon emoji empty. Device-UAT .planning/phases/redesign/W6-DEVICE-UAT.md BATCHED into W1-W5 glass build. Accepted design-sync drift: Welcome keeps language tiles below hero (existing flow); 4 Settings sections (not 2) by code semantics; no Sign out row (no auth/sign-out in codebase); decorative donut static SVG (no animation). REDESIGN TRACK COMPLETE — chrome, dashboard, transactions, chat, categories, jars, onboarding, settings all run on the Slate & Sand contract + governed motion + tokens-only. Next: TestFlight #7 with redesign-complete binary, then milestone close (or Wave 7 perf budget pass if appetite).
```

- [ ] **Step 5: Commit and push**

```bash
cd /home/iskan/projects/soldify
git add .planning/phases/redesign/W6-DEVICE-UAT.md .planning/STATE.md
git commit -m "docs(plan): Wave 6 gate green + batched device-UAT + state (T5)

All five Wave 6 tasks ship to main. Gate 4/4 green (tsc0/lint0/217+/
export0). R-checks clean across onboarding/ + settings/. Redesign
track COMPLETE — every screen runs on the Slate & Sand + governed
motion + tokens-only contract.

Next: TestFlight #7 with redesign-complete binary, then milestone close."

git push origin main
```

---

## Self-review summary

Verified against the spec:
- [x] T1 — Welcome screen editorial hero (donut SVG + Oswald headline + Garamond lead + page-dot indicator).
- [x] T2 — 6 follow-on onboarding screens typography + tokens sweep.
- [x] T3 — Settings in-body title + 4 uppercase section labels + grouped cards.
- [x] T4 — 4 toggle subcomponents uniform row + token-colored switch geometry.
- [x] T5 — Wave gate + R-checks + W6-DEVICE-UAT + STATE update.
- [x] Anti-criteria honored: no new file; no flow logic change; no new glass; no new motion vocabulary; no "Sign out" implementation; no raw hex; no emoji-as-UI.
- [x] Risks mitigated inline: language-tile drift surfaced and confirmed; sign-out absence confirmed; toggle restructure scoped to visual only; entrance-animation drift accepted with rationale.
- [x] All steps contain executable commands or actual code; no "TBD"/"similar to" placeholders.
