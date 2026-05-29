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

### Remaining tier-1 (after Dashboard sign-off)
- **Jars** (Figma 22:12): drop the 184pt featured-ring hero card → uniform 54pt-ring rows
  (`€X of €Y` + % right); move create from header pill → bottom `+ New jar` full-width button.
- **Settings** (22:16): add profile card at top (avatar + name + email); add footer
  `SOLDI v1.0 · made in Donegal`; reconcile rows to Currency/Appearance/Hide-amounts/Connected-accounts
  vs current Language/Biometric/Digest/Export/Categories (keep app's real toggles, adopt Figma grouping).
- **Chat / Soldi Insight** (22:14): header `Soldi` + `Your money assistant` subline (currently
  `Soldi Insights`, no subline); inline assistant action chips.
- **Activity** (22:6): current 3-row pill-discovery filter vs Figma single segmented row
  (All/Income/Expenses/Subs). Decide simplify-vs-keep at execution (lean simpler = less noise).

## Tier 2 — Figma mock ≠ app function (decisions locked 2026-05-29, execution DEFERRED)

| Screen | Conflict | Decision |
|---|---|---|
| **Txn Detail** (25:2) | Figma read-only label/value card vs app edit form | **Keep edit form**, reskin to Cold Minimal structure. Editing stays. |
| **Categories** (26:2) | Figma spend bento-grid vs app management list | **Build Figma grid as a NEW screen** = the Dashboard `See all` destination. Leave `categories.tsx` management untouched. (Repoint Dashboard `See all` to it when built.) |
| **Onboarding** (23:2) | Figma `Get started`+login vs app language picker | **Keep language picker**; fold the `Get started` CTA in rather than replace. |

All tier-2 handled in a later focused pass, not the Dashboard-expand sequence.
