# SOLDI — Cold Minimal redesign (Direction A)

> Spec — 2026-05-29. Owner: saidaliiev. Source-of-truth design lives in Figma (file `mQkHqa6xfWyyQpmS5gyoby`, page **Cold Minimal — Dashboard**, node `17:3`).
>
> **Supersedes** the warm "Slate & Sand" / "Oat & Ink" editorial palette for the app's visual identity. Warm direction was flagged by the user (2026-05-18) as reading "for women only"; this direction is the gender-neutral answer.

## 1. Decision summary

| Item | Decision |
|---|---|
| Visual direction | **Cold Minimal** — slate-blue + graphite on cool near-white. Bloomberg-calm, clinical, unisex. |
| Typography | **2-family**: Oswald (hero numerals, section totals) + Manrope (everything else). **EB Garamond retired.** |
| Shadows | **None on content.** Cards = 1px hairline border only. (Sidesteps Figma→iOS shadow-spread mismatch entirely.) |
| Scope (this pass) | **Dashboard first**, approve, then expand to the other 7 screens to match. |
| Out of scope | Dark theme (future milestone), code port (separate plan), the other 7 screens (after Dashboard sign-off). |

## 2. Palette (final — Cold Minimal)

Replaces the warm tokens in `apps/mobile/src/design/tokens.ts`. Contrast measured on `bg`/`surface`; all text-bearing tokens clear WCAG AA 4.5:1.

| New token | Hex | Role | Replaces (warm) |
|---|---|---|---|
| `background` | `#F4F5F7` | cool near-white app shell | `#EDEAE3` |
| `surface` | `#FFFFFF` | card surface | `#F7F5F0` |
| `textPrimary` | `#1C2024` | graphite primary text | `#221F1B` |
| `textSecondary` | `#3F4550` | secondary | `#6A645A` |
| `textMuted` | `#5C6270` | muted (≥4.5:1 on bg — darkened from #6B7280) | `#6E695F` |
| `accent` | `#34506E` | slate-blue: donut primary, selected, FAB, CTA (~8:1 on white → text-safe) | `#9C5B41` |
| `accentSoft` | `#4A678A` | donut ramp / lighter slate (decorative) | `#B97A5A` |
| `accentDeep` | `#26405C` | pressed / shadow tint | `#7C4632` |
| `positive` (sage→) | `#4A6B5A` | savings / money-in (~5.8:1) | `#687653` |
| `negative` | `#8A4B45` | overspend warning only, restrained (~6.5:1) | `#97463A` |
| `neutralGrey` | `#AAB0BB` | "Other" / inert donut segment | — (new) |
| `borderSubtle` | `#E4E6EA` | hairlines, card borders | `#6E695F33` |

Donut hue policy (cold = restrained): **slate ramp** (`accent` @ 1.0 / 0.6 / 0.32) + `positive` + `neutralGrey`. No multi-hue rainbow.

## 3. Typography

- Keep `FONTS.display = Oswald`, `FONTS.ui = Manrope`.
- **Remove `FONTS.editorial` (EB Garamond)** and every `TYPE.*` preset that uses it (editorial/chat/insight presets re-map to Manrope).
- Insight/digest copy → Manrope Regular (not serif). Cold direction has no literary serif.
- All `lineHeight` stays absolute pt in `typography.ts` (already the case — confirmed).

## 4. Dashboard anatomy (top → bottom)

1. **Hero band** — flat, no gradient. Month nav (`‹ May 2026 ›`) + gear (SVG) right. Eyebrow `SPENT IN MAY` Manrope Medium 11 / tracked / muted. Total `€2,418` Oswald Medium 60 / ink. Delta subline `↓ 12% vs April` Manrope Medium 14, tinted positive/negative.
2. **Donut card** — white, hairline border, no shadow. 200pt Skia ring, slate ramp segments. Center: `LARGEST` eyebrow + category name + amount (amount in Oswald, accent).
3. **Category breakdown card** — rows = dot (matches donut segment) + name (Manrope Medium 15) + amount (Manrope SemiBold 15, tabular). Hairline dividers. No bars.
4. **Digest/insight card** — `INSIGHT` eyebrow + one-line Manrope Regular body.
5. **FAB** — slate-blue circle, `+`, bottom-right.
6. **Tab bar** — white, top hairline; glass tint flips warm→cool (`GLASS.chromeTint` → cool surface), solid `#FFFFFF` fallback. 5 tabs, active = accent.

## 5. Figma authoring rules (kept RN-faithful — so the port stays 1:1)

The mock is built to map cleanly onto React Native, addressing the known Figma→RN pitfalls:

- **Auto Layout everywhere** → maps to flex (`flexDirection`/`justifyContent`/`alignItems`).
- **line-height set in PIXELS**, never % → maps directly to RN `lineHeight` (pt).
- **FILL widths**, no hardcoded element widths → maps to `flex: 1` / `alignSelf: 'stretch'`.
- **No drop shadows on content** — hairline borders only → no shadow-approximation drift.
- **Icons = vector placeholders** → replace with existing `react-native-svg` icon set on port.
- Frame = 393×852 (iPhone 15/16 logical pt) but layout is fluid, not pinned.

## 6. Port strategy (why this is ~98%, not 85%)

SOLDI already has the architecture the Figma→RN article assumes is missing:

- `tokens.ts` — numeric tokens, iOS shadow shape (no `spread`) already.
- `typography.ts` — `TYPE.*` presets, lineHeight already absolute pt.
- Components — RN primitives, `StyleSheet.create()`, SVG icons, FILL/flex widths (no hardcoded sizes), `design/motion.ts`, `design/glass.ts`.

So the port is **not** "generate RN from Figma blind." It is:

1. **Swap palette** warm→cold in `tokens.ts` (table §2). Most components inherit automatically.
2. **Drop EB Garamond** from `FONTS`/`TYPE.*`; re-map editorial presets to Manrope.
3. **Flip glass tint** warm→cool in `glass.ts`/`GLASS` tokens.
4. **Per-screen structural tweaks** (donut hue ramp, flat hero band) where layout differs from current.

Verification gate per `CLAUDE.md`: `cd apps/mobile && npx tsc --noEmit` exit 0 + `npx expo lint` exit 0 + device test. The banned-color ESLint list in `tokens.ts` must be updated (warm hexes are no longer "the palette"; old AI-slop bans stay).

## 7. Open questions / risks

- Banned-value ESLint + `contrast.ts` `auditTokenPairs` assertions reference the warm palette — both must be updated in lockstep with the token swap or the build goes red.
- `schema.sql.ts` seed category colors (warm) — defer; not user-visible at app-shell level.
- The other 7 screens may surface warm-specific treatments not covered by a pure token swap — handle per-screen.
