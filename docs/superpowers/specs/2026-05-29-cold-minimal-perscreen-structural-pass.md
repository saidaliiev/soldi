# Cold Minimal — per-screen structural pass

> Spec — 2026-05-29. Owner: saidaliiev. Source-of-truth: Figma `mQkHqa6xfWyyQpmS5gyoby`,
> page **Cold Minimal — Screens** (node `22:2`, 7 screens) + **Cold Minimal — Dashboard** (node `17:3`).
> Companion to `2026-05-29-cold-minimal-redesign-design.md` (palette/type). This doc = **layout only**.
> Token reskin already shipped (`5a9d149`). Goal direction: a fully-working, free portfolio app —
> everything necessary and unique, **no visual noise**, works without problems.

## Scope rule

**Dashboard first → device-approve → expand to remaining screens.** (Locked by user 2026-05-29.)

## Tier 1 — safe layout alignments (no functionality loss)

### Dashboard — DONE (`f510bc7`)
- Hero band flat (drop `GRADIENTS.warm` LinearGradient) — §4.1
- Donut in own hairline card; removed negative-margin overlap — §4.2
- Category rows in card: `CATEGORIES` eyebrow + `See all` (→ `/categories` interim) + hairline dividers — §4.3
- Digest moved last; shadow→hairline, italic dropped — §1/§4.4
- Uniform 24px gutter. i18n keys added (en+uk). tsc 0 / lint 0. **Device-UAT pending.**

### Remaining tier-1 — DONE 2026-05-29 (pushed)
- **Chat** `48af830` — header `Soldi` + `Your money assistant` subline.
- **Settings** `e41a898` — cards shadow→hairline (§1), section labels muted, lg gutter,
  footer `SOLDI v1.0 · made in Donegal`. (Profile card DEFERRED — see open items.)
- **Jars** `5c82286` — dropped 184pt featured-ring card → uniform JarRows; header create
  pill → saved-total subline + bottom full-width `+ New jar` ghost button.
- **Activity** `7e72e9f` — 3-row discovery → single segmented row (All/Income/Expenses/Subs),
  `All`=clearAll escape; FilterPillsRow kept for search/amount. (Badge still emoji — see icons.)

## Icon system — SF Symbols (decision 2026-05-29)

Engine: **SF Symbols via expo-symbols**, slate-tinted, drop emoji on content. Foundation
shipped `c3cc2ff`: `src/design/icons/CategorySymbol.tsx` + `categorySymbols.ts` (slug→SF map,
30 defaults). iOS = native symbol; Android/Web = emoji fallback (`emojiForSlug`).

**Rollout = dedicated data-layer pass (decided: SymbolPicker + DB column).** The SF map covers
only the 30 default slugs; custom categories store a user-picked emoji in `categories.emoji`. Full
rollout needs: (1) `categories.symbol` column + migration, (2) EmojiPicker → SymbolPicker (pick
from a curated SF set), (3) migrate render sites (Dashboard CategoryRow, Activity TransactionRow
badge, CategoryChip, CategoryListRow) off emoji. Until then badges stay emoji app-wide (uniform).

## Open items
- **Settings profile card** (Figma 29:4 avatar+name+email): app is offline/no-auth → no real
  identity source. Decision needed: local editable display-name, brand/identity card, or skip.
- **Activity category deep-link**: Dashboard CategoryRow tap still deep-links `?categoryId`; the
  new segmented filter doesn't surface a non-subs category filter (shows `All`). Repoint CategoryRow
  to the Categories spend-grid screen (tier-2) when it lands, or add a category pill.

## Tier 2 — Figma mock ≠ app function (decisions locked 2026-05-29, execution DEFERRED)

| Screen | Conflict | Decision |
|---|---|---|
| **Txn Detail** (25:2) | Figma read-only label/value card vs app edit form | **Keep edit form**, reskin to Cold Minimal structure. Editing stays. |
| **Categories** (26:2) | Figma spend bento-grid vs app management list | **Build Figma grid as a NEW screen** = the Dashboard `See all` destination. Leave `categories.tsx` management untouched. (Repoint Dashboard `See all` to it when built.) |
| **Onboarding** (23:2) | Figma `Get started`+login vs app language picker | **Keep language picker**; fold the `Get started` CTA in rather than replace. |

All tier-2 handled in a later focused pass, not the Dashboard-expand sequence.
