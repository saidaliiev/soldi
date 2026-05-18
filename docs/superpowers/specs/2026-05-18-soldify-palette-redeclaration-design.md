# Soldify Palette Re-declaration — Design Spec (Slate & Sand)

- **Date:** 2026-05-18
- **Status:** Locked (design approved in brainstorming; pending user spec review → writing-plans)
- **Supersedes:** `docs/superpowers/specs/2026-05-18-soldify-palette-foundation-design.md` (Oat & Ink — REJECTED)
- **Authority model:** Path C — spec drives design; `docs/design/soldify-screens.html` is the rendered authority; app code conforms (no code edits in this design pass).

## 1. Context & Problem

The prior locked identity (Oat & Ink: `#F2EFE7` cream / `#A85C3C` terracotta / sage) was rejected by the user 2026-05-18: it "reads as for women only" for a broad-audience finance app. Requirement: a **gender-neutral, simple-premium** palette that keeps the editorial brand DNA and the portfolio-grade bar.

Three directions were explored visually (Graphite & Bone, Slate & Sand, Ink & Paper). User locked **B — Slate & Sand**: keep the existing editorial structure and type system; deepen + desaturate the warm clay; trade pinky cream for a warm sand-grey neutral. The existing screen structure, typography (Oswald numbers / EB Garamond narrative / Manrope UI), motion, and the cohesive no-seam header are **unchanged** — only palette values move. Validated against real screens 02 (Dashboard) and 07 (Chat AI-insight) recolored 1:1.

## 2. Decision

Adopt **Slate & Sand**. It is a recolor, not a redesign: smallest blast radius, preserves Wave 1/2 work. Token semantics and key names are identical to the current `tokens.ts` (17 color keys + GRADIENTS + GLASS); only hex values change. All text-bearing tokens are WCAG 2.1 AA gated (body ≥ 4.5:1, large/graphic ≥ 3:1) and verified by computed contrast, not estimated.

## 3. Locked Token Map

Contrast ratios computed against `background #EDEAE3` and `surface #F7F5F0` (sRGB relative-luminance formula). `bg` = ratio on background, `surf` = ratio on surface.

### COLORS

| Token | Hex | bg | surf | Usage policy |
|---|---|---|---|---|
| `background` | `#EDEAE3` | — | — | App shell. Status-bar safe area uses the header fill (see §6), never a separate tone. |
| `surface` | `#F7F5F0` | — | — | Cards, sheets, chat answer bubbles, tab bar tint base. |
| `white` | `#FFFFFF` | — | — | On-accent button/FAB text + icon only. |
| `textPrimary` | `#221F1B` | 13.66 | 15.06 | All primary text, hero numerals (Oswald). |
| `textSecondary` | `#6A645A` | 4.88 | 5.38 | Secondary/meta text — **body-safe**. |
| `textMuted` | `#6E695F` | 4.54 | 5.01 | **GATED** from raw `#8A8478` (3.09 — FAIL). Hue preserved (warm grey). Smallest meta/captions. |
| `accent` | `#9C5B41` | 4.38 | 4.84 | **Graphic + large-text only** (donut arc, chips, icon strokes, ≥24px display). NEVER body text — fails body 4.5 on bg. |
| `accentSoft` | `#B97A5A` | 2.92 | 3.22 | **Decorative only** — gradient stop / fill. Never text, never sole indicator. |
| `accentDeep` | `#7C4632` | 6.29 | 6.94 | The text-safe clay: hero `−€` numerals, expense amounts, accent-colored body/label text, button-on-light. |
| `sage` | `#687653` | 4.06 | 4.48 | Positive **graphic** (donut/chart). `success`/`income` graphic. |
| `sageDark` | `#586A45` | 4.91 | 5.41 | Text-safe positive: income/positive **amount text**, "● online", positive deltas. |
| `sageSoft` | `#9AA585` | 2.16 | 2.38 | **Decorative fill ONLY** — secondary donut/chart segment, chip bg. Never text, never a contrast-bearing or sole indicator (documented sub-3:1, mirrors Oat&Ink CR-04). |
| `sageDeep` | `#4F5C3C` | 5.97 | 6.58 | Positive on dark surfaces / deep emphasis. |
| `error` | `#97463A` | 5.37 | 5.92 | Error text + destructive — body-safe. |
| `success` | `#586A45` | 4.91 | 5.41 | = `sageDark` (text contexts: amounts/badges are text). |
| `income` | `#586A45` | 4.91 | 5.41 | = `sageDark`. |
| `expense` | `#7C4632` | 6.29 | 6.94 | = `accentDeep` (amounts are text — must be body-safe; do NOT use `accent`). |

**Critical policy delta vs. design HTML:** the rendered HTML colors list amounts with `var(--accent)`. In code, amount/label **text** must bind to `accentDeep` / `sageDark` (body-safe), not `accent`/`sage` (graphic-only). The donut/chart **strokes** use `accent`/`sage`/`accentSoft`/`sageSoft`. This split is mandatory.

### GRADIENTS (tuples)

| Token | Stops | Use |
|---|---|---|
| `primary` | `['#B97A5A','#9C5B41']` | CTA, FAB, send button. White text on it = 5.27:1 ✓. |
| `warm` | `['#E6E1D4','#D9D2C0']` | Header hero band (cohesive top region). Decorative. |
| `hero` | `['#EDEAE3','#E2DDD0']` | Subtle full-bleed hero background. |
| `sage` | `['#9AA585','#788566']` | Positive decorative sweep. Decorative only. |
| `dark` | `['#2A2622','#3A332C','#322B25']` | Dark surfaces (dark sheets/empty states). |

### GLASS (warm Liquid Glass — chrome only, fallback mandatory)

| Token | Value | Note |
|---|---|---|
| `chromeTint` | `#F7F5F0` | = `surface`. Tab bar / nav. |
| `sheetTint` | `#EDEAE3` | = `background`. Bottom-sheet bg. |
| `chromeTintAlpha` | `0.62` | Unchanged from current. |
| `sheetTintAlpha` | `0.55` | Unchanged from current. |
| `fallbackChromeBg` | `#F7F5F0` | Opaque iOS<26 fallback (non-optional). |

`BANNED_COLORS` unchanged: `#667EEA #8B7AB8 #E8E0FF #10B981 #1A73E8 #2563EB`. None of the new tokens collide.

## 4. Header Cohesion Rule (palette-agnostic, re-affirmed)

Top of every screen = one continuous fill from the status-bar safe area through the header band to the eyebrow label. No two-tone seam. Implementation: the status-bar/SafeArea region uses the header's first fill stop (`warm[0]` `#E6E1D4` for hero screens, or `surface`/`background` for plain screens) — never a distinct status-bar tint. Holds for light, dark, and content screens. The regenerated `soldify-screens.html` must keep the negative-margin hero technique that unifies notch + hero under one fill.

## 5. Blast Radius (impact on palette-foundation plan `1d80545`)

The committed plan `docs/superpowers/plans/2026-05-18-soldify-palette-foundation.md` maps Oat & Ink and is **invalidated** by this re-declaration. Affected:

- **Task 1** (`tokens.ts` COLORS): re-derive all 17 keys to §3 values.
- **Task 2** (`GLASS` + `GRADIENTS`): re-derive per §3.
- **Task 3** (ChatBubbleUser `ACCENT_12` rgb triple): re-derive from `accent #9C5B41` → `rgba(156,91,65,…)`.
- **Task 4** (residue hex sweep): legacy-hex replacement map must target Slate & Sand values.
- **Task 5** (WCAG audit `auditTokenPairs()`): assertions re-baselined to §3 ratios.
- **Task 6** (contract docs: W1-DEVICE-UAT, Phase 2 UI-SPEC): re-cell to §3 hexes.
- **New Task** (design authority): regenerate `docs/design/soldify-screens.html` to Slate & Sand + cohesive header for ALL screens (currently encodes rejected Oat & Ink + seam defect on some screens).
- **Task 0 gate** (Wave 2 + Checkpoint B completion): autonomous — survives unchanged.

Plan must be rebuilt (writing-plans) superseding `1d80545`.

## 6. Out of Scope

- Component layout / JSX / structure changes (recolor only).
- Motion vocabulary changes (Wave 2 motion stays).
- Code edits during this design pass (Path C — conformance only until the rebuilt plan executes).
- Dark-mode full theme (future milestone; `dark` gradient + sageDeep/accentDeep are the only dark-surface tokens in scope now).

## 7. Acceptance

1. `tokens.ts` exports exactly the §3 keys/values; `npx tsc --noEmit` + `npx expo lint` exit 0.
2. `auditTokenPairs()` (Task 5) asserts every §3 ratio; body tokens ≥4.5, graphic ≥3; `accent`/`accentSoft`/`sageSoft` flagged graphic/decorative-only.
3. No `accent`/`sage`/`sageSoft`/`accentSoft` bound to body text in any screen (grep gate).
4. `soldify-screens.html` regenerated: Slate & Sand, cohesive header on every screen, Oswald numerals.
5. No `BANNED_COLORS` present (existing CI grep).
