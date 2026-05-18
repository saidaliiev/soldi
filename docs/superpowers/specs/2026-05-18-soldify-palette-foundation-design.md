# Soldify Palette Foundation (Oat & Ink) — Design Spec

**Date:** 2026-05-18
**Status:** Approved (brainstorming) — pending implementation plan
**Authority:** `docs/design/soldify-screens.html` (Path C: design = spec, code conforms)
**Scope owner:** solo dev (Iskan)

## 1. Problem & Decision

The new canonical design `docs/design/soldify-screens.html` (8 premium iOS
screens) introduces the **"Oat & Ink"** palette — a warmer, de-pinked,
gender-neutral shift over the current terracotta/sage tokens. The app is
already structurally complete (all 8 screens exist as routes); the new design
is **not** a structural change.

**Decisions taken during brainstorming:**

- **Rollout scope:** *Palette foundation first*. Port Oat & Ink into
  `tokens.ts` (single source of truth) so all 8 screens reskin through tokens.
  Per-screen layout polish is **deferred** (not in this spec).
- **Locked-contract conflict:** *Re-derive contracts to Oat & Ink*.
  `soldify-screens.html` is the authority; `W1-DEVICE-UAT.md` and the Phase 2
  UI-SPEC palette references are updated to the new palette. Low cost because
  Wave 1 device-UAT has not run yet — criteria are updated before the test,
  not breaking a passed gate.
- **Commit structure:** *Bucketed — code vs contracts*. Two atomic commits.

## 2. Scope

**In scope (palette only):**

- `apps/mobile/src/design/tokens.ts` — `COLORS`, `GLASS`, `GRADIENTS`.
- Opacity-decomposed accent constants in components (re-derive from new accent).
- Color-asserting tests + stale color comments (refresh to new values).
- Contract docs: `W1-DEVICE-UAT.md`, Phase 2 UI-SPEC palette refs.

**Out of scope (explicit):**

- Per-screen layout / JSX / component structure changes.
- New components.
- `--line` / `--line-soft` tokens from the HTML (YAGNI — no current consumer).
- Chat dark-mode gradient (`GRADIENTS.dark`, v1.5, no consumer, no Oat & Ink
  dark spec).
- Typography (`FONTS`/`TYPE` — fonts identical), `motion.ts`, onboarding logic.
- `BANNED_COLORS` list and its ESLint rule (Oat & Ink is already compliant —
  no AI-slop blue/purple/lavender, Tailwind green, or fintech blue).

## 3. Token Map — `COLORS` (tokens.ts:10-49)

| token | current | → Oat & Ink | HTML source |
|---|---|---|---|
| background | `#F7F1E8` | `#F2EFE7` | `--bg` |
| surface | `#FAF5F0` | `#FBFAF6` | `--surface` |
| white | `#FFFFFF` | `#FFFFFF` | (unchanged) |
| textPrimary | `#2C1810` | `#1F1B16` | `--ink` |
| textSecondary | `#7A5C52` | `#6B6258` | `--sub` |
| textMuted | `#8A6558` | `#8A8175` †WCAG-gated | `--muted` |
| accent | `#BF6F4F` | `#A85C3C` | `--accent` |
| accentSoft | `#D9997A` | `#C07A55` | `--accent-soft` |
| accentDeep | `#A86147` | `#8C4A30` | `--accent-deep` |
| sage | `#7E8B6C` | `#74815C` | `--moss` |
| sageDark | `#5C6B4A` | `#5C6B4A` | `--moss-text` (unchanged) |
| sageSoft | `#B5C0A5` | `#9AA585` | `--moss-soft` |
| sageDeep | `#7A876A` | `#687653` | derived: mid moss/moss-text |
| error | `#B85C5C` | `#9E4A3C` | `--error` |
| success | `#7A876A` | `#5C6B4A` | `--moss-text` (text-safe) |
| income | `#7A876A` | `#5C6B4A` | `--moss-text` (text-safe) |
| expense | `#BF6F4F` | `#A85C3C` | = `accent` |

`† textMuted`: final value is subject to the §5 WCAG gate and may be darkened
from `#8A8175`.

## 4. `GLASS` + `GRADIENTS` (tokens.ts:51-57, 131-137)

`glass.ts` is a **pure consumer** of `GLASS` — no code change there; only the
`tokens.ts` `GLASS` object changes.

**`GLASS`:**

- `chromeTint` `#FAF5F0` → `#FBFAF6` (= new surface)
- `sheetTint` `#F7F1E8` → `#F2EFE7` (= new background)
- `fallbackChromeBg` `#FAF5F0` → `#FBFAF6`
- `chromeTintAlpha` `0.62`, `sheetTintAlpha` `0.55` — **unchanged**. Rationale:
  the HTML mock does not model native Liquid Glass; the established opacity
  vocabulary is kept and only the warm base hex is shifted to match the new
  palette.

**`GRADIENTS`:**

- `primary` `['#D9997A','#C97B5C']` → `['#C07A55','#A85C3C']` (accentSoft→accent)
- `hero` `['#F7F1E8','#F0E6D8']` → `['#F2EFE7','#E9E4D7']` (token bg → HTML
  device bg)
- `sage` `['#B5C0A5','#9DA88C']` → `['#9AA585','#74815C']` (moss-soft→moss)
- `warm` `['#F2D5C5','#D9A994']` → `['#EDE6D9','#D9B79E']` — **judgement call**:
  HTML defines no gradient; values are an Oat & Ink-consistent warm interpolation.
  Approved in brainstorming.
- `dark` — **unchanged** (out of scope, §2).

## 5. WCAG AA Gate (non-negotiable — CLAUDE.md "WCAG AA enforced")

`soldify-screens.html` is **not** contrast-audited. The current tokens carry
D-09 / CR-04 / QUAL-02 remediation history (textMuted, accent, sage, sageDark
all darkened to pass AA on cream).

**Rule:** After the swap, recompute WCAG contrast for every text-bearing token
against the new `background` `#F2EFE7` and `surface` `#FBFAF6`:

- `textPrimary`, `textSecondary`, `textMuted`
- `sageDark` (income/success text), `accentDeep`
- `accent` (large-text / graphic 3:1 where used as such)

If a token used for text fails its WCAG AA threshold (4.5:1 body, 3:1
large/graphic), **darken it while preserving hue** and document the original
ratio + remediated ratio inline, matching the existing D-09 comment style in
`tokens.ts`. Consequence: final text-token hexes may deviate slightly from raw
Oat & Ink. `textMuted` (`#8A8175`, greyer/lighter than the remediated
`#8A6558`) is the prime suspect and likely requires darkening.

This gate takes precedence over literal HTML fidelity for **text** tokens only.
Surface/decorative tokens follow the HTML exactly.

## 6. Derived Constants & Residue Cleanup

- `apps/mobile/src/features/chat/ChatBubbleUser.tsx`: `ACCENT_12 =
  rgba(201,123,92,0.12)` is decomposed from the stale pre-D-09 `#C97B5C`.
  Re-derive from new `accent` `#A85C3C` → `rgba(168,92,60,0.12)`.
- Enumerate during implementation: grep for opacity-decomposed accent triples
  `201, 123, 92` (#C97B5C) and `191, 111, 79` (#BF6F4F) across
  `apps/mobile/src`; re-derive each from the new accent.
- Color-asserting tests / stale comments to refresh to new token values:
  `donutArcs.test.ts`, `categoryMutations.test.ts`, `ChatLaunchFAB.tsx`
  (comment), any test asserting `GRADIENTS.*` literals. Exact set confirmed via
  grep in the implementation plan.

## 7. Contract Doc Updates (Commit 2)

- `.planning/phases/redesign/W1-DEVICE-UAT.md`: replace acceptance hexes
  `#FAF5F0` (chromeTint) / `#F7F1E8` (sheetTint) with `#FBFAF6` / `#F2EFE7`.
  Valid because device-UAT has not been executed yet.
- Phase 2 UI-SPEC: update palette references to Oat & Ink. Exact file path
  located during implementation (under `.planning/phases/02*/`). Authority =
  `soldify-screens.html` per the brainstorming decision.

## 8. Verification

Gate (CLAUDE.md, run in order, stop at first failure):

1. `cd apps/mobile && npx tsc --noEmit` exits 0
2. `cd apps/mobile && npx expo lint` exits 0 (includes BANNED_COLORS ESLint)
3. `npm test` green — color-asserting tests updated to new values
4. `cd apps/mobile && npx expo export` succeeds (bundle integrity)
5. No EAS build burned (memory `eas-build-quota`). Device-UAT for the glass
   tab bar stays **deferred** to the batched W1+W2 EAS build per the existing
   redesign plan; this spec only re-derives its written acceptance criteria.

WCAG contrast (§5) is part of verification: every text token's post-swap ratio
recorded inline in `tokens.ts`.

## 9. Commit Plan

- **Commit 1 (code):** `tokens.ts` (`COLORS` + `GLASS` + `GRADIENTS`) +
  re-derived component constants + test/comment cleanup. Conventional subject,
  e.g. `feat(design): Oat & Ink palette foundation`. Gated by §8 1–4.
- **Commit 2 (docs):** `W1-DEVICE-UAT.md` + Phase 2 UI-SPEC palette refs.
  Doc-only, e.g. `docs(redesign): re-derive locked contracts to Oat & Ink`.

Direct-to-main (solo, well-scoped — established working style).

## 10. Risks

| risk | mitigation |
|---|---|
| WCAG regression from lighter Oat & Ink text tokens | §5 gate — recompute + darken-with-hue, document inline |
| Opacity-derived accents drift (off-tone overlays) | §6 grep enumeration, re-derive every decomposed triple |
| Color-asserting tests fail on new hexes | update in Commit 1, part of §8.3 |
| Editing "locked" Phase 2 UI-SPEC / W1-UAT | sanctioned by Q2 decision; soldify = authority; UAT not yet run |
| `warm`/`sageDeep` derived (no HTML source) | values fixed in §3/§4, approved in brainstorming |
| Glass tint shift vs deferred device-UAT | only written criteria change now; physical test still deferred to batched W1+W2 build |
