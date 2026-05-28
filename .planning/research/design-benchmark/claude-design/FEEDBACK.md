# Feedback to Claude Design — soldify Design System (round 2)

> Paste this back into the Claude Design chat. Covers: what's great, must-fix defects in the
> recreation, the deferred deliverable (recommended evolution), the app-icon gap, and in-app icon
> improvements. Direction decisions are made — you no longer need to ask which of the 6 open
> questions to pursue; they're resolved below with reasoning.

## TL;DR

The **design system** (tokens, content fundamentals, visual foundations, iconography doc, SKILL.md,
33 specimen cards) is excellent and faithful — token snapshot is byte-identical to `tokens.ts`, zero
banned hex outside the banned-swatch card, zero glassmorphism on content. Keep all of it.

But the brief's **core ask was deferred twice**: "ONE recommended evolution of the Dashboard with
token-level reasoning." You held it back to let us drive direction — direction is now set (below).
Also the Dashboard UI-kit recreation shipped with **real rendering defects** that must be fixed
before it's a trustworthy reference. And you **missed the single biggest real-world gap**: the live
app still ships the **default Expo placeholder icon** (a blue chevron — literally our banned
fintech-blue). Details below.

---

## DIRECTION (decided — you're our designer, now produce these)

We reviewed your bundle and ran our own benchmark + icon research. Direction is locked; **your job is
to produce the refined variants within it** (you're better at the visual craft than a one-shot pick).

**App icon — go EDITORIAL LETTERMARK.** Lead with two directions and iterate variants of them:
- **Direction 1 — Editorial Initial:** a serif capital "S" (EB Garamond axis or a custom high-contrast didone) in warm slate `#221F1B` on sand `#EDEAE3`. Magazine-masthead.
- **Direction 4 — Negative-Space Ledger:** a bold Oswald-condensed "S" cut as negative space out of a solid sandstone `#9C5B41` field (sand reads through the letter).
- Produce **3–5 refined variants across these two** (letterform weight/optical size/contrast, ground tone), each as an iOS-26 **Icon Composer-ready 1024² layered concept** with Default / Dark / Clear / Tinted renders. Silhouette stable across variants; opaque master; no baked bevel/shadow.
- **Drop** the Sandstone Arc and Stamped Coin unless you make a strong case — the lettermark is the editorial signal. **Never** fintech-blue / AI-slop purple / neon / gradient-mesh.
- Reference: we built rough comps at `.planning/research/design-benchmark/redesign/icons/preview.html` in the repo — look, then do it better.

**Dashboard — POLISH the current donut composition** (no new chart type this pass). Build
`ui_kits/dashboard/index_v2.html` applying the resolved decisions in section (C) below. For the
donut center: **primary = empty/abstract (Apple Card model)**; also render the **monthly-total-mirror**
as the alternative so we can compare. Reference comp: `.planning/research/design-benchmark/redesign/dashboard/polish.html`.

Everything below is the supporting detail (defects to fix, the 6-question reasoning, in-app icon set).

---

## A. Keep (don't touch)

- `colors_and_type.css`, the README CONTENT FUNDAMENTALS / VISUAL FOUNDATIONS / ICONOGRAPHY sections — accurate and well-written.
- The voice/casing/MoM-phrasing capture is correct and matches shipped i18n.
- SKILL.md (portable Claude-Code skill) — good idea, keep.

## B. Must-fix defects in the Dashboard UI-kit recreation

1. **Donut arcs do not render** in `dashboard-default/v2/v3/v4` — the ring is empty or partially
   drawn (only `dashboard-arcs-manual.png` shows a complete ring after a manual fix). The
   `stroke-dasharray` arc math in `DonutChart.jsx` is fragile. Fix the SVG arc generation
   (use explicit `pathLength`/`stroke-dashoffset` per slice, or `<path>` arc commands) so the
   default render is correct without manual intervention. A reference donut that doesn't draw is
   worse than no donut.
2. **"LARGEST" selects the wrong slice.** The center shows "Clot… 26%" while the actual largest
   category is **Other (56%)**. Your largest-calc in `data.js`/`DonutChart.jsx` is picking the wrong
   item (or the share and label are mismatched). Fix the max-by-amount selection.
3. **Center-label truncation is ugly** ("Clot…", "Ot…"). The brief explicitly listed *long category
   name* as a required edge case. Don't ellipsis-truncate a one-word name — see direction (C) below;
   we're dropping the largest-category center entirely.
4. **Category dot colors are over-saturated** in the mock (bright green/red) vs the muted real dots.
   Source the dot colors from `DEFAULT_CATEGORY_COLORS` in `apps/mobile/src/data/categoriesRepo.ts`
   so the mock matches production.

## C. The deferred deliverable — build the recommended evolution

Produce `ui_kits/dashboard/index_v2.html` as a second variant with a side-by-side compare. Apply
these resolved decisions (evidence: 2024-26 premium-finance research — Copilot, Apple Card, Monarch,
Lunch Money, Emma; donut-a11y best practice; Apple HIG 44pt):

- **(a) Donut canvas 200 → 210–216pt.** 200 is the low edge; keep arcs tappable at 44pt, stay <230 on a 390pt baseline.
- **(b) Hero↔donut bridge: kill the −16pt overlap → +24–28pt positive whitespace.** The negative overlap reads as a layout bug; whitespace is the premium signal.
- **(c) Donut center: DROP "largest category share."** "Other 56%" is the weakest possible headline (junk-drawer category, duplicates row 1) and is the one element working against the premium-editorial read. Replace with EITHER (i) the **period total** mirrored as a quiet second anchor, OR (ii) **empty/abstract** (Apple Card model) with slices as the only story. Demonstrate both; recommend one.
- **(d) "Yesterday in money" digest: keep BELOW the donut, ABOVE the list.** Don't sticky it (conflicts with FAB + tab bar); don't move it above the donut (buries the hero number).
- **(e) Category rows: show top 5–6 + a muted "+N more" row.** Donut legibility also caps ~5–6 slices. Keep dot + emoji + name + tabular Manrope amount at 44pt height.
- **(f) Chat FAB: bottom-right, ≥16pt clear above the tab bar** — or dock it into the tab bar to remove the double-floating-element clutter. Demonstrate the inset version.

Also explore ONE genuinely different direction so we can compare against the donut: a **spending
"spine"** — a single horizontal stacked bar (≤6 segments) that reads more editorial/magazine-rule
and is more accessible (length on a common baseline beats arc-angle), doubling as the legend for the
ranked rows below. Show it as `index_spine.html`.

## D. App icon — the missing critical deliverable

The connected repo ships **`apps/mobile/assets/images/icon.png` = the default Expo template icon**
(blue chevron on light blue — our banned `#1A73E8` family). There is **no soldify brand mark**. This
is the highest-value icon work and it was not addressed. Produce **iOS 26 Icon-Composer-ready**
layered concepts (1024×1024, opaque, no baked bevel/shadow, silhouette stable across
Default/Dark/Clear/Tinted) for these four directions, and render all variants:

1. **Editorial Initial** — EB Garamond capital "S" (`#221F1B`) on `#EDEAE3` sand. Magazine-masthead.
2. **Sandstone Arc / Donut Echo** — open three-quarter ring `#B97A5A→#9C5B41` on warm-slate `#221F1B`, echoing the dashboard donut.
3. **Stamped Coin** — sandstone-gradient medallion (`#B97A5A→#7C4632`, locked set) with a struck "S"; uses iOS-26 depth layers. (Highest craft, prototype Tinted first.)
4. **Negative-Space Ledger** — solid sandstone `#9C5B41` field, bold Oswald-condensed "S" cut as negative space so sand reads through. Most tint-robust.

Keep all four free of fintech-blue, AI-slop purple, neon, and gradient-mesh.

## E. In-app outline icon set — improvements

- **Stroke 1.75pt** on the 24pt grid; identical weight/join-radius across the whole set (HIG #1 rule).
- **Active state: fill ONE interior element in sandstone `#B97A5A`**, not the whole glyph (whole-fill is too heavy for editorial). Keep `#221F1B` active / `#6E695F` inactive outline.
- **Overview/Dashboard: reconsider the 2×2 grid** — it reads "apps/menu/bento," not "my money." Use **3 stacked bars of varying length in a rounded rect** (a report/overview card). (Avoid a ring here if app-icon Direction 2 also uses a ring — would over-couple.)
- **Jars/Savings: keep the jar** (proven container-with-progress metaphor, beats vault/padlock) and make **fill-on-active = a rising fill level inside the jar in sage `#687653`** — doubles as the progress affordance.
- **Chat: keep the spark-quill** — it deliberately dodges the overused ✦ AI-sparkle cliché and fits the editorial voice. Make the **spark the fill-on-active detail** (sandstone); quill stays outline. Add a split-nib notch so it doesn't read as a generic edit-pen at 24pt.
- **Gear / chevrons:** standard, minimal; 6–8 teeth gear, single-stroke ~60° chevrons, no fill-on-active (chrome, not nav).
- **Label every tab** — labels disambiguate; that's what lets the slightly unconventional quill + bar-card work.

## Also fix (in our code, flagging for parity)

- `SparkQuill.tsx` has a stroke-scale bug (`strokeWidth={1.6 / scale}` should be `* scale`) and an inline-hex default — we'll fix on our side; just don't mirror the bug.

---

*Sources behind the direction calls: Copilot Money (ADA 2024), Apple Card spending wheel, Monarch,
Lunch Money, Emma (2025); Apple HIG (App Icons, Tab Bars, Charting, 44pt targets); iOS 26 Icon
Composer / Liquid Glass icon guidance; donut-chart accessibility (Smashing/Domo); AI-sparkle-cliché
critique (Slate/Google Design 2025).*
