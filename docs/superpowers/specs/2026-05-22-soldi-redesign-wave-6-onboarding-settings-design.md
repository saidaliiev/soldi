# Wave 6 — Onboarding + Settings

Final slice of the Soldify redesign track. Brings the 7 onboarding screens and the Settings screen to the premium bar per `docs/design/soldify-screens.html` §1 (Onboarding) and §8 (Settings). After W6 the entire app — chrome, dashboard, transactions, chat, categories, jars, onboarding, settings — runs on the Slate & Sand palette + governed motion + tokens-only.

- **Status**: draft, pending user approval.
- **Predecessor**: W5 (categories + jars + sheet-motion governance) shipped 2026-05-22, commits `34cb4be → b33fe89`.
- **Successor**: none — closes the redesign track. After W6: TestFlight #7 with redesign-complete binary, then milestone close.
- **Branch policy**: direct-to-main, per solo-project convention.

## Goal

The Welcome onboarding screen renders to HTML §1 (editorial hero: Oswald 46pt headline, Garamond lead, accent CTA pill, page-dot indicator, decorative donut mark at top), and the other 6 onboarding screens (data-source / monobank / csv / manual / synthetic / biometric) inherit the same typographic + token contract without breaking their existing flow logic. The Settings screen renders to HTML §8 (Oswald title, uppercase section labels, grouped cards with internal hairlines, destructive "Sign out" link). After W6, every screen reads from `TYPE.*` + `COLORS.*` + `MOTION.*` + `SHADOWS.*`; no inline hex, no banned hex, no ad-hoc motion literals outside sanctioned boundaries.

## Scope

In scope:

- Welcome screen refactor per HTML §1 (Oswald 46pt headline, editorial subtitle, accent CTA pill, page-dot indicator, decorative donut mark). Existing language-picker logic preserved.
- 6 follow-on onboarding screens — typography + tokens sweep per Slate & Sand contract (Oswald headers, Garamond editorial body where applicable, Manrope UI everywhere else). No flow logic change.
- Settings screen layout refactor per HTML §8 (Oswald 30pt title, uppercase Manrope section labels with moss-text color, grouped cards with internal hairlines, optional destructive "Sign out" if existing logic supports it; otherwise log as deferred).
- BiometricToggle / DigestToggle / LanguageToggle / ExportButton visual polish — token-only, 28×46pt switch geometry per HTML §8.
- Wave gate (spec §4 4/4 GREEN) + R-check evidence.
- W6-DEVICE-UAT.md batched into the existing W1+W2+W3+W4+W5 EAS device build (or its successor).

Out of scope (anti-vision, declared upfront):

- New onboarding flow steps (the 7-screen sequence stays as-is — visual polish only).
- New Settings features (no new toggles, no new sections, no "Sign out" implementation if it doesn't already exist).
- Reduce-motion UI toggle inside Settings (HTML §8 mocks one — defer; system reduce-motion already respected via `useReduceMotion`).
- Dark-mode toggle.
- App-store review / TestFlight push (separate task).
- Performance budget perf passes (Wave 7 if needed).

## Principles

- **Typography contract enforced.** Every header on these surfaces is Oswald (display family); editorial copy is Garamond; everything else Manrope. No mixed roles.
- **Token-only.** Every color from `tokens.ts`. No raw hex, no banned hex.
- **No new motion debt.** Entrance animations already use `withTiming`/`useReduceMotion` via the established boundary; W6 does not introduce ad-hoc literals.
- **No new glass.** Onboarding + Settings are content surfaces — never glass.
- **No flow logic change.** This is a visual polish wave. Stores / mutations / router wiring stay byte-equivalent.

## Constraints

- Expo SDK 54, RN 0.81.5, Reanimated v4.1.5.
- All interactive elements ≥ 44×44pt tap target.
- VoiceOver: every interactive element has `accessibilityLabel` + `accessibilityRole`.
- All existing 217 tests stay green.

## Task breakdown

| # | Task | Output | Verifiable by |
|---|------|--------|---------------|
| T1 | Welcome screen refactor per HTML §1 | Hero with Oswald 46pt headline, Garamond lead, accent CTA pill, page-dot indicator, decorative donut mark | Screenshot vs `soldify-screens.html:109-136`; tokens-only |
| T2 | 6 follow-on onboarding screens — typography + tokens sweep | All screen text follows `TYPE.*`, no inline hex, all colors via tokens | `rg "#[0-9A-Fa-f]" app/onboarding/` empty; `rg banned-hex` empty |
| T3 | Settings screen refactor per HTML §8 | Oswald 30pt title, uppercase Manrope section labels (moss-text), grouped cards with internal hairlines | Screenshot vs `soldify-screens.html:448-481`; tokens-only |
| T4 | Toggle subcomponents visual polish (Biometric/Digest/Language/Export) | 28×46pt switch geometry, token-only colors, ≥44pt tap target | Component render + manual tap-area review |
| T5 | Wave gate + UAT doc + STATE update | tsc0/lint0/217+0/expo-export-ios0; W6-DEVICE-UAT.md; STATE.md W6 row | Run gate; read STATE.md |

## Architecture changes

### Onboarding — `app/onboarding/`

- **`welcome.tsx`**: replace existing hero markup with HTML §1 structure — decorative donut SVG at top, Oswald 46pt 2-line headline ("Your money. / At peace."), Garamond 19pt lead, accent CTA pill (`Get started`), page-dot indicator (3 dots, first wide). Language picker stays (existing flow logic) but as a secondary affordance — either tucked below the CTA or moved to a follow-on language screen. **Decision at T1 start**: keep language picker on welcome screen (HTML §1 shows a single hero, but the existing flow needs language before navigation — pragmatic call: hero + language tiles below). Logged as accepted spec drift.
- **`data-source.tsx`** + 5 others: typography sweep — replace any non-`TYPE.*` text style with the right preset. Background `COLORS.background`. CTA pills `COLORS.accent` with `TYPE.uiButton`. No layout change.

### Settings — `src/features/settings/`

- **`SettingsScreen.tsx`**: section labels switch from inline style to `{ ...TYPE.uiLabel, color: COLORS.sageDark, textTransform: 'uppercase', letterSpacing: 1.2 }` (moss-text per HTML §8). Card containers gain internal hairlines between rows (currently each toggle sits in its own card — consolidate by section so Security, Preferences, Notifications, Data have grouped cards).
- **`BiometricToggle.tsx`** + 3 others: row layout becomes `icon + label (flex:1) + control (switch / value-right / chevron-right)`. Switch geometry: 46×28pt pill, 22pt thumb, accent on / textMuted@22% off. Tap target 44pt min.
- **Sign-out row**: only if existing settings store has a sign-out action — otherwise OUT OF SCOPE and logged.

### No new files

All work is in-place edits to existing files. No new helpers, no new hooks, no new components.

## Verification gates

Spec §4 wave gate (4/4 must be GREEN before commit T5):

```bash
cd apps/mobile
npx tsc --noEmit          # 0 errors
npx expo lint             # 0 errors
npm test                  # 217+ green, no new failures
npx expo export -p ios    # 0 errors
```

R-check evidence (capture in commit body):

| Check | Command | Pass condition |
|-------|---------|----------------|
| R6 banned hex | `rg '#667EEA\|#8B7AB8\|#E8E0FF\|#10B981\|#1A73E8\|#2563EB' app/onboarding/ src/features/settings/` | empty |
| R-glass | `rg "from 'expo-glass-effect'" src/` | only `GlassTabBar.tsx` + `BottomSheetPrimitive.tsx` (unchanged from W4/W5) |
| R-icon | no emoji-as-UI in W6 files | empty |
| R-tokens | `rg "style=\{\{[^}]*#[0-9A-Fa-f]" app/onboarding/ src/features/settings/` | empty |
| R-typography | `rg "fontSize: \d+" app/onboarding/ src/features/settings/` | only inside `TYPE.*` consumer overrides documented per spec |

## Anti-criteria

- Anti: No new file under `app/onboarding/` or `src/features/settings/`.
- Anti: No flow logic change (router wiring, store mutations, validation rules untouched).
- Anti: No new glass on either surface.
- Anti: No new motion vocabulary (existing `useReduceMotion` pattern in `welcome.tsx` reused; no new MOTION presets).
- Anti: No new Settings sections / toggles.
- Anti: No "Sign out" implementation if it doesn't already exist (visual placeholder if mocked in HTML, OR drop and log).
- Anti: No raw hex anywhere.
- Anti: No emoji as UI icon (SVG only).

## Antecedents

- `docs/design/soldify-screens.html` §1 (lines 109-136) — Onboarding welcome authority.
- `docs/design/soldify-screens.html` §8 (lines 448-481) — Settings authority.
- W5's MOTION.sheet preset family — no new sheet on these surfaces; existing `BottomSheetPrimitive` consumers untouched.
- W4's editorial typography rules (Garamond bubbles, Oswald hero) — extended here to onboarding lead + headline.

## Risks

| Risk | Mitigation |
|------|-----------|
| Welcome screen HTML §1 omits language picker; current flow requires it before navigation | Keep language picker visible below CTA; surface as accepted drift in T1 commit body |
| Sign-out row depends on auth store that may not exist | Confirm at T3 start; if no auth/sign-out logic exists, skip the row entirely and log deferred |
| Toggle component restructure breaks existing tests | All 4 toggle components are isolated; visual change only; no API change to their consumer (`SettingsScreen`) |
| Onboarding screens have entrance animations using ad-hoc `withTiming` | Existing `welcome.tsx` uses `withTiming({duration: 600})` direct — accepted drift (one-shot entrance, not user-facing motion debt); not part of governed `MOTION.*` because no preset names it. Optionally add `MOTION.heroEnter` if appetite during T1, else leave |
| Settings card consolidation collides with bottom safe-area padding | `SettingsScreen` already reads `useSafeAreaInsets()` — re-grouping doesn't change footer; visual only |

## Documentation deliverables

- `docs/superpowers/specs/2026-05-22-soldi-redesign-wave-6-onboarding-settings-design.md` (this file).
- `docs/superpowers/plans/2026-05-22-soldi-redesign-wave-6-onboarding-settings.md` (next step — writing-plans skill).
- `.planning/phases/redesign/W6-DEVICE-UAT.md` (created at T5; batched into existing EAS device build).
- `.planning/STATE.md` updated at T5: W6 [~] until batched device build runs on physical iPhone; the redesign track is then code-complete.

## Euphoric surprise prediction

6/10 — Onboarding finally reads like a magazine: a thin moss-and-terracotta donut sketch above an Oswald two-line headline that lands with weight ("Your money. / At peace."), a Garamond lead that breathes, and a single accent CTA pill that doesn't feel like a Google form. Settings is monastic — three sections separated by uppercase moss-text labels, each card a quiet group of hairline-divided rows, no decoration, no AI-slop. The redesign track lands as a unified surface: chrome, dashboard, transactions, chat, categories, jars, onboarding, settings — all reading from the same vocabulary.
