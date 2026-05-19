# Spec + Plan — Design-Sync Local Authority (Open Design bypass)

- **Date:** 2026-05-18
- **Status:** Active
- **Scope:** Process/documentation only. No code. No token-value changes.
- **Supersedes:** the Open Design MCP calls inside redesign Wave 2 Checkpoint A/B
  and the Palette Foundation Checkpoint.

## Context

Redesign Wave 2 Checkpoints A/B and the Palette Foundation Checkpoint were
written to call the Open Design MCP (`list_projects`, `get_artifact(project="soldi")`).
That path is dead: forensic on 2026-05-18 found no `soldi`/`Soldify` project ever
existed on this Open Design daemon (memory `open-design-soldi-absent`). The
design-sync gate cannot be cleared via OD.

A local, generated-from-spec premium reference exists and is current:
`docs/design/soldify-screens.html` (42 KB, regenerated 2026-05-18). It contains a
`<!-- DASHBOARD -->` screen (~line 138) covering the hero, donut, and Chat FAB
surfaces. Per memory `feedback_design-path-c-premium` / `soldify-figma-design-delivered`,
the project follows design-path C: this artifact is the authority and code
conforms to it — not the reverse.

## Decision

`docs/design/soldify-screens.html` is the **sole design-sync authority** for:

1. Redesign Wave 2 **Checkpoint A** (retroactive — see below).
2. Redesign Wave 2 **Checkpoint B** (active gate before Task 8).
3. The **Palette Foundation Checkpoint**.

Open Design MCP is **bypassed** for all three. No OD calls. Comparison stays
read-only drift surfacing — same rule as the original checkpoints: *surface the
mismatch, never silently "fix" the mockup-vs-code gap*.

## Palette caveat (important)

`soldify-screens.html` currently encodes the **Oat & Ink** terracotta-beige
palette, which the user flagged as reading "too feminine / for women only"
(memory `feedback_palette-too-feminine-reconsider`; palette no longer locked).

Therefore design-sync via this file is authoritative **only for layout, motion,
spacing rhythm, type scale, and component hierarchy** — **not for palette**.
Palette comparison is explicitly **out of scope** in every checkpoint below
until the gender-neutral palette direction is resolved and the HTML is
regenerated. This is a hard blocker on the *Palette Foundation* launch, not on
finishing Wave 2 motion.

## Checkpoint A — retroactive note

Tasks 5–7 (MonthlyTotalHero, DonutChart, ChatLaunchFAB) were executed and
committed (ce80b84/d978d2c, bae7388/df5ff17, 65209dc/8d2969f) **before** this
policy and with OD already dead, so no design-sync occurred at Checkpoint A.
This is accepted: the cumulative hero + donut + FAB surface all land before
Task 8, so Checkpoint B's comparison covers them post-hoc. Checkpoint A is
recorded as **bypassed-per-policy**, not skipped silently.

## Checkpoint B — revised procedure (replaces the OD steps)

Gate before Task 8. STOP — user must clear it.

1. Read `docs/design/soldify-screens.html` DASHBOARD screen section.
2. Read current implementation: `apps/mobile/app/(tabs)/index.tsx`,
   `apps/mobile/src/features/dashboard/MonthlyTotalHero.tsx`,
   `apps/mobile/src/features/dashboard/DonutChart.tsx`, and the Task-7
   Chat-launch FAB component.
3. Compare (structure/motion/spacing only — **not palette**):
   month-transition intent (carry/slide direction + magnitude), section
   spacing rhythm, hero/donut/FAB geometry & visual hierarchy, presence/weight
   of any hairline/divider between hero and breakdown.
4. Confirm the `sharedMonth` carry magnitude (plan: ±24pt translateX) and the
   editorial spacing change (`gap: SPACING.lg → SPACING.xl`, hairline
   `COLORS.textMuted @ 0.18`) match the HTML's structural intent. Adjust the
   concrete token-driven values in the Wave 2 plan if the HTML disagrees.
5. Surface the drift list to the user. User confirms → resume Task 8.

## Palette Foundation Checkpoint — same substitution

Local HTML, structural only, palette deferred until the gender-neutral
direction is locked (see caveat). The Palette Foundation Task 0 gate (Wave 2 +
Checkpoint B complete) is unchanged.

## Tracked design-authority defects (fix on next HTML regen + in impl)

The local authority HTML has known defects to correct when it is regenerated
(regen gated on the gender-neutral palette relock):

1. **Header two-tone seam.** Screenshot 2026-05-18 16:05: the status-bar safe
   area is a different shade than the header band beneath the month pill /
   eyebrow, on the DASHBOARD, Activity, and grey-header screens — a visible
   seam. Required: the top of every screen is **one continuous color region**
   from the very top edge through the eyebrow (status-bar tint = header fill,
   one surface). Palette-agnostic cohesion rule. Applies to the HTML regen AND
   the app SafeArea/header impl. See memory `feedback-header-cohesive-no-seam`.

2. **Authority staleness — user screenshots supersede the HTML.** User-supplied
   screenshots dated 2026-05-18 16:12 (`Screenshot 2026-05-18 161227.png`)
   show a refined dashboard NEWER than `soldify-screens.html`: cohesive header
   (defect #1 already fixed in the screenshot), donut paired with a "LARGEST
   CATEGORY" summary **card**, and a thin/delicate donut ring. The local HTML
   does not match this. Until the HTML is regenerated, treat the user
   screenshots as the design target; the structural Checkpoint B verdict below
   is valid only for *what the HTML currently encodes* and must be re-run after
   regen. Regen list (apply together, gated on palette relock): palette,
   header-seam, largest-category card pairing, donut ring thickness.

## Out of scope — `schema.sql.ts` category seed colors

The 18 legacy-hex category seed rows in `schema.sql.ts` are a **data migration
+ backward-compat** concern, **not** palette-foundation and **not** design-sync.
Sequenced as its own spec/plan **after** Palette Foundation, with DB-data
implications handled there. Recorded here only to fix its placement; no action
in this spec.
