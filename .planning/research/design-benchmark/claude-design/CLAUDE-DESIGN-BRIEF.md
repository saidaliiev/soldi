# Claude Design — Brief

> **Project**: soldify (premium iOS personal-finance manager)
> **Screen scope**: Dashboard tab (Overview)
> **Date**: 2026-05-27
> **Purpose**: External design pass to refine / extend the current Dashboard beyond the in-house Designer audit (commit `cd87f73`). Want a fresh creative perspective from Claude Design with full constraint context.

---

## 1. TL;DR

Design 3–5 alternative compositions of the soldify Dashboard tab for a premium iOS personal-finance manager built in React Native + Expo SDK 54. The product is **editorial, restrained, warm** — not fintech-blue, not AI-slop purple. Honor the locked palette (Slate & Sand), three-typeface stack (Oswald display / EB Garamond editorial / Manrope UI), and React Native primitives. Produce concept frames + a recommended direction with token-level rationale.

---

## 2. Product

**soldify** is a premium iOS personal-finance manager built as a portfolio piece by a solo dev. Positioning: between Copilot Money's polish and Lunch Money's indie restraint, with a distinct editorial voice (warm Slate & Sand palette, mixed-typeface system). Ships free to App Store. No PSD2 / no real banking integrations — local-first via op-sqlite, AI-pipeline runs on Supabase Edge Functions (Anthropic Claude API).

The user is someone who wants a beautiful, focused money tool that feels like a magazine, not a spreadsheet.

---

## 3. Screen to design — Dashboard tab

The Dashboard is the first thing the user sees after auth. It must answer three questions in one glance:

1. **How much did I spend this month?**
2. **Where did the money go?** (category breakdown)
3. **Am I on track relative to my history?** (delta to prior period)

### Current regions (top → bottom)

| Region | What it shows |
|---|---|
| Hero band | Month nav + gear button; "SPENT IN [MONTH]" eyebrow; monetary total at 64pt Oswald; subline with delta vs prior month |
| Donut chart | 200×200pt Skia ring, 14pt stroke, gap 2°. Center: "LARGEST" eyebrow + top category name (Oswald 28pt) + percentage. Tap a slice → morphs to that category's total |
| "Yesterday in money" card | Daily-digest editorial card with sparkline and comparative subline |
| Category breakdown list | Top 5 categories ranked by spend. Each row: 10pt color dot + emoji + name + right-aligned tabular amount |
| Floating tab bar | iOS 26 Liquid Glass (warm-tinted) with non-glass fallback; 4 tabs: Overview / Activity / Jars / Chat |
| Chat FAB | 56pt accent-gradient circle with SparkQuill icon, hides on hero scroll, revealed past 40pt |

See attached screenshots for current visual state.

---

## 4. Brand DNA — Slate & Sand

Editorial warm palette inspired by **mid-century print finance journalism** + **handmade ledger aesthetic**. NOT fintech-blue, NOT crypto-neon, NOT bank-app sterile.

### Palette (locked tokens, do not redefine)

```
Surfaces:
  background    #EDEAE3   warm slate, app shell
  surface       #F7F5F0   card surface
  white         #FFFFFF

Text:
  textPrimary   #221F1B   deep warm slate
  textSecondary #6A645A
  textMuted     #6E695F   (WCAG AA gated — body 4.5:1 hard floor)

Accents — sandstone family:
  accent        #9C5B41   primary CTA, selected, expense
  accentSoft    #B97A5A   gradient pair (decorative only)
  accentDeep    #7C4632   pressed, text-safe (6.29:1 on BG)

Sage — positive / savings:
  sage          #687653   graphic-only (4.06:1 — below body)
  sageDark      #586A45   text-safe positive (4.91:1 on BG)
  sageSoft      #9AA585   decorative
  sageDeep      #4F5C3C

Error / hairline:
  error          #97463A   muted warm red
  borderSubtle   #6E695F33  (20% alpha textMuted)
```

### Gradients (locked)

```
primary: [#B97A5A → #9C5B41]   CTA, FAB, send button (white text 5.27:1)
warm:    [#E6E1D4 → #D9D2C0]   hero band cohesive top region
hero:    [#EDEAE3 → #E2DDD0]   subtle full-bleed hero background
sage:    [#9AA585 → #788566]   positive decorative sweep
```

### Typography (locked stack)

| Family | Role | Where it shows |
|---|---|---|
| **Oswald** (display) | Monthly total, hero numbers, large titles | Hero band 64pt; donut center fallback 40pt; donut center top-category 28pt |
| **EB Garamond** (editorial) | Chat bubbles, long-form insights, body with personality | Chat tab, yesterday card subline (italic) |
| **Manrope** (UI) | Buttons, labels, pills, tab labels, tabular numbers | Tab bar, eyebrow labels, category row amounts |

Type presets (`apps/mobile/src/design/typography.ts`):

```
displayXL    Oswald 64/72 medium, tracking -1   hero monthly total
displayL     Oswald 40/48 medium, tracking -0.5 empty-state fallback only
displayM     Oswald 28/34 medium                 donut center top-category
editorialBody Garamond 16/24 regular             chat / body
editorialLead Garamond 20/28 semibold            insight leads
uiBody       Manrope 16/22 medium                category row name
uiButton     Manrope 16/20 semibold              CTAs
uiLabel      Manrope 14/18 medium                metadata, percent, slice percent
uiMeta       Manrope 12/16 medium, tracking 0.3  meta strings
tabular      Manrope 16/22 semibold + tnum       transaction amounts
heroLabel    Manrope 13/16 semibold, tracking 1.8  eyebrow above monthly total + donut center eyebrow (uppercase via textTransform)
heroSubline  Manrope 15/20 semibold              hero delta subline
```

### Spacing / radius / elevation

```
spacing: xs=4, sm=8, md=16, lg=24, xl=32, xxl=48
radius:  sm=8, md=12, lg=16, xl=24, pill=999
shadows: card opacity 0.04 / modal 0.06 / floating 0.12  (warm editorial — NEVER harsh)
```

---

## 5. Locked constraints — never violate

### Banned colors (ESLint-enforced)

```
#667EEA  AI-slop blue
#8B7AB8  AI-slop purple
#E8E0FF  AI-slop lavender
#10B981  bright Tailwind green
#1A73E8  Google fintech blue
#2563EB  Stripe-ish fintech blue
```

### Banned patterns

- Neon gradients (anything saturated and bright)
- Glassmorphism / floating blur cards on content (lists, dashboard cards, chat bubbles). EXCEPTION: iOS 26 Liquid Glass on system chrome only (tab bar, nav) — warm-tinted, with mandatory non-glass fallback for iOS < 26.
- Emoji as UI icons EXCEPT category icons (decision 2026-05-26 — curated single-grapheme set is allowed).
- Hardcoded hex in components (must come from `tokens.ts`).

### Platform

- React Native primitives only (`View`, `Text`, `ScrollView`, `Pressable`). No `div`/`span`/`p`.
- StyleSheet.create exclusively (no inline `style` with hex).
- All interactive elements: `accessibilityLabel` + `accessibilityRole`; min tap target 44×44pt.
- Motion via centralized `motion.ts` vocabulary (no ad-hoc `Animated`/`withTiming`); reduce-motion respected.

### Target

- iPhone (390pt width baseline — iPhone 14/15 Pro).
- Android second-class but functional (current dev runs on Android emulator).
- iOS 17 minimum; iOS 26 nice-to-have (Liquid Glass).
- Dynamic Type AAA — typography must scale.

---

## 6. Current state

### Recent design history (commits)

```
cd87f73  style(donut): force textTransform uppercase on totalLabel
aa0bad2  docs(design): annotate displayXL/displayL hero-only rule
c9a6922  style(dashboard): soften hero→donut bridge from -xl to -md
ad1f276  style(donut): promote totalLabel uiLabel→heroLabel (tracked uppercase)
d1942a3  style(donut): demote slicePercent uiBody→uiLabel
843e6bb  style(donut): tighten center sliceName/sliceAmount displayL→displayM
9be15f4  style(dashboard): promote category-row dot 8→10pt with sm margin
f89eb3c  refactor(dashboard): drop 2pt color bar from CategoryRow
21371f3  fix(dashboard): bump donut weight + scale up center label
098dfbf  chore(ci): bump actions to Node.js 24 runtime
b254981  fix(dashboard): bridge donut to hero band — close dead-space gap
```

### Screenshots attached (in `./assets/`)

| File | Shows | When |
|---|---|---|
| `01-current-hero-donut.png` | Today's hero + donut state (LARGEST tracked, displayM Oswald) | 2026-05-27 after `cd87f73` |
| `02-current-rows.png` | Today's donut + yesterday card + 5 category rows (no bar, 10pt dot) | 2026-05-27 |
| `03-baseline-pre-redesign.png` | Pre-redesign baseline (10pt stroke ring, 40pt center, dot+bar rows) | 2026-05-27 before E1 redesign |

### Known issues / live questions

1. **Donut canvas size** — currently 200pt. Industry benchmark cluster is 200–235pt on 390pt iPhone (50–60% of screen width). soldify is at the low end. Should it grow?
2. **Hero ↔ donut bridge** — softened from -32pt overlap to -16pt. Still negative. Is positive 24–32pt gap better?
3. **Donut center default** — currently shows "LARGEST [Category] %" when there's data. On tap morphs to the tapped slice. Is `LARGEST` the right framing, or should it be `TOP` / `BIGGEST` / `LARGEST CATEGORY` / nothing-just-the-name?
4. **Yesterday-in-money card** — sits between donut and category list. Does it belong there, or should the slot carry a different secondary visualization (sparkline of monthly trend, vs-last-month delta pill)?
5. **Category row density** — top 5 rows currently bullet-list style. Should they group into something more editorial (e.g., grouped chips, bento card with all 5 inside)?
6. **FAB placement** — terracotta circle bottom-right above tab bar. Acceptable, or should the chat entry live somewhere else (inline in hero, pinned to tab bar slot)?

---

## 7. What we want from this design pass

**3 to 5 alternative dashboard compositions**, each with a clear point of view. For each variant deliver:

1. **Concept frame** — full Dashboard screen at iPhone 14/15 Pro (390×844pt or 393×852pt). PNG export at @3x or vector.
2. **Annotation overlay** — call out what's different vs the current state and why.
3. **Token impact** — which `tokens.ts` values change (if any), which typography presets are new, which spacing tokens shift. Keep changes minimal — additive, not destructive.
4. **Component anatomy** for any new/changed component (donut, category row, hero band, yesterday card, FAB).
5. **Acceptance** — confirm a11y contrast ratios for any new color pair, dark-mode counterpart for any new surface, Dynamic Type AAA scale behavior.

Then **one recommendation** with reasoning — which of the 3–5 variants you'd ship and why.

### Variant directions to explore (pick at least 3)

- **(a) Editorial restraint** — push the magazine aesthetic harder. Heavy serif in unexpected places, more whitespace, donut smaller, hierarchy via type weight not size.
- **(b) Card-stacked** — every region becomes a card with surface elevation. Hero card + donut card + yesterday card + categories card. Feels modular, less editorial.
- **(c) Donut-as-hero** — kill the separate hero band, the donut center IS the monetary total at 64pt. Category rows below tighten up. Most space for the visualization.
- **(d) Activity-led** — kill the donut. Hero monthly total + horizontal bar breakdown (one row per category, color-filled to percent). Closer to YNAB / Lunch Money low-cardinality fallback. Bolder departure.
- **(e) Bento dashboard** — modern 2026 bento grid: hero takes top half, 2×2 grid below (donut, yesterday, sparkline, top-3 list). Most dense.
- **(f) Other** — surprise me with one direction not listed.

---

## 8. Reference benchmark

Studied 14 PFM apps (2024–2025 active state). Use as inspiration / anti-pattern reference. Full notes in `../RESEARCH-NOTES.md`.

**Primary references:**

| App | Why look at it |
|---|---|
| **Copilot Money** | Apple Design Award 2024. Closest premium peer. SF Pro tight tracking, donut + center total, color-redundant rows with identical-hue dots |
| **Monarch Money** | Tinted row backgrounds (low-opacity category color fill). Stacks secondary chart below donut |
| **YNAB** | 2025 iOS redesign. Opinionated envelope UI. Horizontal bar breakdown — useful for variant (d) |
| **Lunch Money** | Indie design-led. Flips to bar chart at low cardinality |
| **Apple Wallet / Apple Card** | System-level money UI gold standard. SF Pro condensed, tight tracking |
| **Emma** | EU multi-bank, donut 10-slice cap + "Other" grouping. Closest layout analog |
| **Revolut** | Deep analytics; reference for what NOT to do (too dense, too neobank-blue) |
| **Linum** | Closest indie peer to soldify's positioning. Worth a deep look |

**Discontinued / weaker:** Mint (folded March 2024 into Credit Karma).

### Key patterns research surfaced

- Donut + center total + ranked category rows is the **convergent 2024–2025 premium pattern**, NOT an anti-pattern.
- Color-redundant rows (color cue + emoji icon) are the **industry norm**. Soldify previously had 3 cues (dot + emoji + 2pt bar) — over-stacking. Now down to 2 (dot + emoji).
- Center-tap morph is the dominant interactive pattern.
- Hero monetary typography trends **condensed-gothic or display-sans** in 2024–2025. Soldify uses Oswald (condensed-gothic) — defensible differentiation.
- Premium donut canvas clusters 50–60% screen width (~200–235pt on 390pt iPhone).
- Premium hero↔viz gap clusters at 24–32pt positive (soldify currently -16pt overlap — open question).

---

## 9. Acceptance criteria

Every variant must pass:

- **WCAG 2.2 AA contrast** — body text ≥ 4.5:1, large text ≥ 3:1, UI components ≥ 3:1. `textMuted` is at the hard floor — do not redefine downward.
- **Dynamic Type AAA** — all text scales without breaking layout (test at iOS "Larger text > AX5"). 64pt hero scaling to 128pt must not push donut off-screen.
- **Reduce Motion** — entrance animations and arc-draw motion respect `AccessibilityInfo.isReduceMotionEnabled`.
- **VoiceOver** — donut chart has a single summary label (NOT individual slice elements), category rows announce `{name}, {amount}, {percent}`.
- **Dark mode** — every new surface ships a dark counterpart (use the `GRADIENTS.dark` token family as the starting point; full dark palette TBD).
- **Tap targets** — minimum 44×44pt for all interactive elements.
- **Reduce motion fallback** for any motion vocabulary additions.

---

## 10. Out of scope (do not redesign)

- Other tabs (Activity, Jars, Chat) — Dashboard only this pass.
- Onboarding / settings / category editor — separate sprints.
- Tab bar geometry — already redesigned in Wave 1 (Liquid Glass + fallback). Just respect it as a 64pt safe-area-aware floating element.
- The mixed-typeface decision — Oswald / EB Garamond / Manrope is locked. Variants may use them differently but not introduce new families.
- Banned colors — never introduce.

---

## 11. Deliverable format

- **Frames**: Figma, Penpot, or PNG @3x for each variant.
- **Annotation**: text callouts inline or sidecar markdown.
- **Token diff**: a `tokens.diff.md` per variant listing every token added / changed / removed vs current `tokens.ts`.
- **Recommendation memo**: 200–400 word doc picking the winner with reasoning.
- **Optional**: lottie / video / pseudocode for any motion concept.

Drop everything in `.planning/research/design-benchmark/claude-design/variants/` organized by letter (`a-editorial-restraint/`, `b-card-stacked/`, etc.).

---

## 12. Copy-paste prompt (condensed — for pasting into Claude Design)

```
Design 3-5 alternative compositions of the soldify Dashboard screen for a premium iOS personal-finance app built in React Native. The product is editorial and restrained — NOT fintech-blue, NOT AI-slop purple, NOT neon. Use the locked Slate & Sand warm palette (background #EDEAE3, surface #F7F5F0, accent #9C5B41 sandstone, sage #586A45) and the three-typeface stack (Oswald display, EB Garamond editorial, Manrope UI). NEVER introduce #667EEA / #8B7AB8 / #E8E0FF / #10B981 / #1A73E8 / #2563EB or any neon gradient. No glassmorphism on content (only on system chrome).

The current Dashboard shows: hero band with "SPENT IN [MONTH]" eyebrow + 64pt Oswald monthly total + delta subline; 200pt Skia donut chart with 14pt stroke and "LARGEST [Category] %" center; "Yesterday in money" editorial card; top-5 category rows with 10pt color dot + emoji + name + tabular amount; floating Liquid Glass tab bar; terracotta chat FAB. Screenshots attached.

Explore three to five directions, at minimum: (a) push editorial restraint harder, (b) bento dashboard 2×2 grid, (c) donut-as-hero killing the separate hero band, (d) horizontal-bar breakdown killing the donut, (e) card-stacked modular layout. Deliver per variant: a full iPhone 14 Pro frame, annotation of differences vs current, token-level impact, component anatomy for any changed component, and a11y check. End with ONE recommendation with reasoning.

Hard rules: WCAG 2.2 AA contrast, Dynamic Type AAA, reduce-motion fallbacks, 44pt tap targets, VoiceOver summary label on donut. Target iPhone 390pt baseline, iOS 17 minimum.
```

---

## 13. Where to find supporting artifacts

| Path | Contents |
|---|---|
| `./assets/` | Screenshots (1 baseline, 2 current state) |
| `../DESIGN-ORDER.md` | In-house Designer audit (2026-05-27) — context for what we already changed |
| `../RESEARCH-NOTES.md` | PerplexityResearcher benchmark findings |
| `../outline.yaml` | The 14 PFM apps + scope config |
| `../fields.yaml` | Visual-treatment fields matrix |
| `apps/mobile/src/design/tokens.ts` | Full token source (palette, typography, spacing) |
| `apps/mobile/src/design/typography.ts` | TYPE.* preset definitions |
| `apps/mobile/src/features/dashboard/DonutChart.tsx` | Current donut implementation |
| `apps/mobile/src/features/dashboard/CategoryRow.tsx` | Current row implementation |
| `apps/mobile/app/(tabs)/index.tsx` | Current dashboard composition |
| `CLAUDE.md` (project root) | Full design / security / workflow rules |

---

*Brief author: saidaliiev's PAI assistant.*
*Hand-off ready: drop this whole `claude-design/` directory into Claude Design's input, or paste the §12 prompt with the three screenshots attached.*
