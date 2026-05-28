# Token reference excerpt for Claude Design

> Full source: `apps/mobile/src/design/tokens.ts` + `apps/mobile/src/design/typography.ts`.
> This file is a flat reference for pasting into a design tool. Values are LOCKED — do not redefine. Variants may extend with NEW tokens, never overwrite.

## Palette

| Token | Hex | Use | Contrast on #EDEAE3 (background) |
|---|---|---|---|
| `background` | #EDEAE3 | App shell | — |
| `surface` | #F7F5F0 | Cards | — |
| `white` | #FFFFFF | Inverted text on accent | — |
| `textPrimary` | #221F1B | Primary text | 13.2:1 ✓ AAA |
| `textSecondary` | #6A645A | Secondary text | 4.88:1 ✓ AA body |
| `textMuted` | #6E695F | Muted text (hard 4.5 floor) | 4.54:1 ✓ AA body |
| `accent` | #9C5B41 | CTA, selected, expense | 4.38:1 graphic+large text only |
| `accentSoft` | #B97A5A | Gradient pair (decorative) | — graphic-only |
| `accentDeep` | #7C4632 | Pressed, text-safe | 6.29:1 ✓ AAA |
| `sage` | #687653 | Graphic positive | 4.06:1 graphic-only |
| `sageDark` | #586A45 | Text-safe positive | 4.91:1 ✓ AA body |
| `sageSoft` | #9AA585 | Decorative | — graphic-only |
| `sageDeep` | #4F5C3C | Pressed positive | text-safe |
| `error` | #97463A | Muted warm red | text-safe |
| `borderSubtle` | #6E695F33 | Hairline (20% alpha) | — |

## Gradients

| Token | Stops | Use |
|---|---|---|
| `primary` | `#B97A5A → #9C5B41` | CTA, FAB, send button. White text passes 5.27:1 |
| `warm` | `#E6E1D4 → #D9D2C0` | Hero band cohesive top |
| `hero` | `#EDEAE3 → #E2DDD0` | Subtle full-bleed hero bg |
| `sage` | `#9AA585 → #788566` | Positive decorative sweep |
| `dark` | `#2A2622 → #3A332C → #322B25` | Dark surfaces (dark-mode future) |

## Typography presets

| Preset | Family | pt | line | tracking | Where it appears |
|---|---|---|---|---|---|
| `displayXL` | Oswald medium | 64 | 72 | -1 | Hero monthly total |
| `displayL` | Oswald medium | 40 | 48 | -0.5 | Donut empty-state fallback (HERO-ONLY rule) |
| `displayM` | Oswald medium | 28 | 34 | — | Donut center top-category |
| `editorialBody` | EBGaramond reg | 16 | 24 | — | Chat / long-form body |
| `editorialLead` | EBGaramond semi | 20 | 28 | — | Insight leads |
| `uiBody` | Manrope medium | 16 | 22 | — | Category row name |
| `uiButton` | Manrope semi | 16 | 20 | — | CTAs |
| `uiLabel` | Manrope medium | 14 | 18 | — | Metadata, slice percent |
| `uiMeta` | Manrope medium | 12 | 16 | 0.3 | Meta strings |
| `tabular` | Manrope semi + tnum | 16 | 22 | 0 | Row amounts, transaction amounts |
| `heroLabel` | Manrope semi | 13 | 16 | 1.8 | Hero eyebrow + donut center eyebrow (USE textTransform: 'uppercase' in style) |
| `heroSubline` | Manrope semi | 15 | 20 | — | Hero delta subline |

## Spacing

```
xs  4    inline gaps, tight margins
sm  8    icon margin, row gap
md  16   standard padding
lg  24   region padding, content gap
xl  32   hero region padding-bottom
xxl 48   reserved (rare)
```

## Radius

```
sm   8    chips, small pills
md   12   buttons
lg   16   cards
xl   24   bottom sheets, hero overlays
pill 999  dots, FAB, tab bar
```

## Shadows

| Token | Opacity | Use |
|---|---|---|
| `SHADOWS.card` | 0.04 | All content cards |
| `SHADOWS.modal` | 0.06 | Modals, bottom sheets |
| `ELEVATION.floating` | 0.12 | Floating tab bar |

## Banned colors (ESLint-enforced)

```
#667EEA  AI-slop blue
#8B7AB8  AI-slop purple
#E8E0FF  AI-slop lavender
#10B981  bright Tailwind green
#1A73E8  Google fintech blue
#2563EB  Stripe-ish fintech blue
```

## Banned patterns

- Neon gradients
- Glassmorphism on content (lists, cards, chat bubbles)
- Hardcoded hex in components (must come from tokens.ts)
- Inline `style` with hex
- Emoji as UI icons (EXCEPT category icons — curated set)
- Mixing the wrong typeface (Oswald in body, Manrope in hero)

## Dark mode

Not implemented yet. `GRADIENTS.dark` is the starting hint. Every new variant should propose its dark counterpart even if rough — informs the future dark token table.
