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
- **Timing:** planned now, **executed after Wave 2 motion + Checkpoint B**
  complete on `main` (Wave 2 stays on the current palette — see §8).

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
| textMuted | `#8A6558` | `#71695E` ‡ (raw `--muted` `#8A8175` fails WCAG, §5) | `--muted` |
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

`‡ textMuted`: raw Oat & Ink `--muted` `#8A8175` fails WCAG AA body
(3.34:1 on background) — replaced with the §5-computed `#71695E`
(4.70:1 background / 5.18:1 surface, hue preserved). This is the only
token whose final hex deviates from the raw HTML.

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

**Propagation:** every component that consumes `GLASS.chromeTint` /
`GLASS.sheetTint` / `GLASS.fallbackChromeBg` does so through `glass.ts`
(`resolveChromeSurface` / `resolveTabBarChrome`). Changing the `tokens.ts`
`GLASS` object alone re-tints the tab bar, nav, and bottom-sheet chrome
across all screens with **zero component code changes**.

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

**Computed (sRGB, WCAG 2.1) vs new `background #F2EFE7` / `surface #FBFAF6`:**

| token | hex | bg | surface | threshold | verdict |
|---|---|---|---|---|---|
| textPrimary | `#1F1B16` | 14.9:1 | 16.4:1 | 4.5:1 body | PASS |
| textSecondary | `#6B6258` | 5.20:1 | 5.72:1 | 4.5:1 body | PASS |
| textMuted (raw) | `#8A8175` | 3.34:1 | 3.67:1 | 4.5:1 body | **FAIL** |
| **textMuted (gated)** | **`#71695E`** | **4.70:1** | **5.18:1** | 4.5:1 body | **PASS** |
| sageDark (income/success text) | `#5C6B4A` | 5.00:1 | 5.50:1 | 4.5:1 body | PASS |
| accentDeep | `#8C4A30` | 5.83:1 | 6.41:1 | 4.5:1 body | PASS |
| accent (graphic/large only) | `#A85C3C` | 4.29:1 | 4.72:1 | 3:1 graphic | PASS |

**Result: only `textMuted` is remediated** — `#8A8175` → `#71695E`
(hue preserved). All other tokens pass as mapped in §3; their ratios are
recorded inline in `tokens.ts`. `accent` keeps its existing usage policy
(graphic / large-text only; body uses `accentDeep`) — unchanged from the
current D-09 policy, and the new value is strictly better than the old
`#BF6F4F` (3.34:1).

**Required `tokens.ts` comment for the remediated token** (D-09 style):

```ts
// Oat & Ink + WCAG gate: raw --muted #8A8175 = 3.34:1 on background
// (#F2EFE7) / 3.67:1 on surface — WCAG AA body 4.5:1 FAIL.
// Darkened (hue preserved) to #71695E → 4.70:1 background,
// 5.18:1 surface. PASS.
textMuted: '#71695E',
```

**Verification rule:** implementation must re-compute these ratios (not trust
this table blindly) and assert them in the contrast test. This gate takes
precedence over literal HTML fidelity for **text** tokens only;
surface/decorative tokens follow the HTML exactly.

## 6. Derived Constants & Residue Cleanup

- `apps/mobile/src/features/chat/ChatBubbleUser.tsx`: `ACCENT_12 =
  rgba(201,123,92,0.12)` is decomposed from the stale pre-D-09 `#C97B5C`.
  Re-derive from new `accent` `#A85C3C` → `rgba(168,92,60,0.12)`.
- Enumerate during implementation: grep for opacity-decomposed accent triples
  `201, 123, 92` (#C97B5C) and `191, 111, 79` (#BF6F4F) across
  `apps/mobile/src`; re-derive each from the new accent.
- Color-asserting tests / stale comments to refresh to new token values:
  `donutArcs.test.ts`, `categoryMutations.test.ts`, `ChatLaunchFAB.tsx`
  (comment), any test asserting `GRADIENTS.*` literals.

**Mandatory enumeration commands** (run in the implementation plan; every hit
must be triaged — re-derive, retoken, or justify):

```bash
cd apps/mobile

# (a) opacity-decomposed accent rgb() triples (legacy accents)
grep -rnE 'rgba?\(\s*201,\s*123,\s*92|rgba?\(\s*191,\s*111,\s*79|rgba?\(\s*168,\s*92,\s*60' src

# (b) all legacy palette hexes hardcoded outside tokens.ts
grep -rniE '#(C97B5C|BF6F4F|D9997A|A86147|2C1810|7A5C52|8A6558|7E8B6C|7A876A|B5C0A5|9DA88C|B85C5C|F7F1E8|FAF5F0|F0E6D8|F2D5C5|D9A994)' \
  src --include='*.ts' --include='*.tsx' | grep -v 'design/tokens.ts'

# (c) tests asserting GRADIENTS / COLORS literals
grep -rnE 'GRADIENTS\.|COLORS\.(accent|sage|background|surface|textMuted)' src --include='*.test.ts*'
```

`(b)` is the catch-all the reviewer requested — any non-`tokens.ts` hit is
either a residue to retoken or a deliberate exception that must be commented.

## 7. Contract Doc Updates (Commit 2)

- `.planning/phases/redesign/W1-DEVICE-UAT.md`: replace acceptance hexes
  `#FAF5F0` (chromeTint) / `#F7F1E8` (sheetTint) with `#FBFAF6` / `#F2EFE7`.
  Valid because device-UAT has not been executed yet.
- Phase 2 UI-SPEC: update palette references to Oat & Ink. Exact file path
  located during implementation (under `.planning/phases/02*/`). Authority =
  `soldify-screens.html` per the brainstorming decision.

## 8. Timing & Wave 2 Coordination

**Sequencing constraint (user directive):** the Palette Foundation is
**planned now but executed after Wave 2 motion is complete** — all Wave 2
tasks + the Polish Pass + Checkpoint B finished and on `main`.

- **Wave 2 stays on the current (pre–Oat & Ink) palette.** Do not mix motion
  polish and the color shift in the same wave or the same range of commits.
- **Rationale:** a clean before/after — motion regressions and color
  regressions never appear in the same diff, so the visual review of each is
  unambiguous and higher quality.
- **Status at spec time:** Wave 2 is mid-flight (Task 7 Chat-FAB scroll-reveal
  shipped — `65209dc`, `8d2969f`). Later Wave 2 tasks + Checkpoint B are
  pending. Checkpoint B is independently blocked on the Open Design "Soldify"
  project being polluted with Foodify content (tracked in memory
  `open-design-soldi-absent`) — that blocker is **out of scope here** and is
  not resolved by this spec.
- **Consequence for the plan:** `writing-plans` produces the implementation
  plan now, but its first step is an explicit gate — "confirm Wave 2 +
  Checkpoint B complete on `main`" — and execution does not start until that
  gate passes. The plan is a ready-to-fire artifact, not an immediate action.

## 9. Verification

Gate (CLAUDE.md, run in order, stop at first failure):

1. `cd apps/mobile && npx tsc --noEmit` exits 0
2. `cd apps/mobile && npx expo lint` exits 0 (includes BANNED_COLORS ESLint)
3. `npm test` green — color-asserting tests updated to new values
4. `cd apps/mobile && npx expo export` succeeds (bundle integrity)
5. **Residue gate:** the §6(b) catch-all grep
   (`#(C97B5C|BF6F4F|D9997A|…)` outside `tokens.ts`) returns no hits — or
   every remaining hit carries an inline justification comment. Hard exit
   gate, not advisory.
6. No EAS build burned (memory `eas-build-quota`). Device-UAT for the glass
   tab bar stays **deferred** to the batched W1+W2 EAS build per the existing
   redesign plan; this spec only re-derives its written acceptance criteria.

WCAG contrast (§5) is part of verification: every text token's post-swap ratio
recorded inline in `tokens.ts`.

## 10. Commit Plan

- **Commit 1 (code):** `tokens.ts` (`COLORS` + `GLASS` + `GRADIENTS`) +
  re-derived component constants + test/comment cleanup. Conventional subject,
  e.g. `feat(design): Oat & Ink palette foundation`. Gated by §9 1–4.
- **Commit 2 (docs):** `W1-DEVICE-UAT.md` + Phase 2 UI-SPEC palette refs.
  Doc-only, e.g. `docs(redesign): re-derive locked contracts to Oat & Ink`.
  (Color-asserting test updates land in Commit 1 as part of §9.3.)

Direct-to-main (solo, well-scoped — established working style).

## 11. Risks

| risk | mitigation |
|---|---|
| WCAG regression from lighter Oat & Ink text tokens | §5 gate — recompute + darken-with-hue, document inline |
| Opacity-derived accents drift (off-tone overlays) | §6 grep enumeration, re-derive every decomposed triple |
| Color-asserting tests fail on new hexes | update in Commit 1, part of §8.3 |
| Editing "locked" Phase 2 UI-SPEC / W1-UAT | sanctioned by Q2 decision; soldify = authority; UAT not yet run |
| `warm`/`sageDeep` derived (no HTML source) | values fixed in §3/§4, approved in brainstorming |
| Glass tint shift vs deferred device-UAT | only written criteria change now; physical test still deferred to batched W1+W2 build |
| Executing before Wave 2 done → mixed motion+color diff, muddy visual review | §8 hard gate: plan's first step blocks until Wave 2 + Checkpoint B are complete on `main` |
| `textMuted` table trusted blindly (computed values stale/wrong) | §5 verification rule: implementation re-computes ratios and asserts them in the contrast test, not copy-paste |
