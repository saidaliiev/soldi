# Preliminary Research Notes — 2026-05-27

> Auto-captured from PerplexityResearcher run during `/research` skill, Step 2.
> Strict 14-item scope per saidaliiev. Time window: since 2024.

## Key findings

1. **Donut + center total + ranked category rows is the convergent 2024-2025 premium pattern** (NOT an anti-pattern). soldify aligns with industry convention.

2. **Color-redundant category rows** (color swatch + emoji/icon) are the **norm**, not an anti-pattern, even though technically duplicative. Industry typically uses **2 signals** (color cue + icon), soldify currently uses **3** (dot + emoji + 2pt bar). Over-stacking is the soldify-specific concern, not the general pattern.

3. **Center label morphs on slice tap** is dominant interactive pattern across Copilot, Monarch, Emma.

4. Hero monetary typography trends **condensed-gothic or display-sans** in 2024-2025 premium. Oswald (condensed-gothic) is **defensible for differentiation**.

5. Mint discontinued March 2024 — weakest reference. **Emma** is strongest swap candidate (active, EU, donut-centric).

## Supplementary fields surfaced (now merged into fields.yaml)

| Field | Reason added |
|---|---|
| `slice_tap_morph_target` | What does the center morph into on tap? Critical for interactive vs static |
| `fallback_chart_type` | Low-cardinality degradation (1-2 categories) |
| `secondary_chart_below_donut` | Slot between donut and category list — soldify uses yesterday card here |
| `row_value_treatment` | Amount column treatment — drives Manrope tnum decision |
| `ring_canvas_to_screen_ratio` | Cross-device proportional sizing — soldify 200pt is at band's low end |
| `color_treatment_match` | Identical-hue vs tinted-derivative for legend element |
| `hero_to_donut_gap_pt` | Specific pt range (24-32pt) for premium designs |

## Soldify-specific verdict on the dot question (preliminary, Designer will finalize)

soldify's CategoryRow currently renders:
- 8×8pt color dot (left of emoji)
- 20pt emoji icon
- 2pt color bar (40% alpha) under the row

Three independent color/cue signals for one binding. Industry convention is 2 (color + icon). **Suggest drop the dot, keep emoji + bar** — bar already provides the slice-color binding via the row's bottom edge, and emoji+amount carry the semantic info. Designer agent will produce the canonical verdict in DESIGN-ORDER.md.

## Source bundle (22 links)

See full list in agent transcript. Primary references:

- Copilot Money Dashboard Tab Overview — https://help.copilot.money/en/articles/6045480-dashboard-tab-overview
- Apple Design Awards 2024 — https://developer.apple.com/design/awards/2024/
- Monarch Reports & Breakdown — https://help.monarch.com/hc/en-us/articles/21846787088916-Using-Reports
- YNAB Spending Breakdown — https://support.ynab.com/en_us/spending-breakdown-H1H7YxmD0
- Revolut Spending Breakdown — https://help.revolut.com/help/app-features/budgeting-and-analytics/how-can-i-see-a-spending-breakdown-by-category-or-merchant-or-country/
- Revolut iOS Analytics Flow (Mobbin) — https://mobbin.com/explore/flows/41c1815b-b1d4-4251-93fd-a427b26c5dd4
- Monzo Trends — https://monzo.com/help/monzo-perks/trends-spending-and-balance-web
- Emma Analytics — https://emma-app.com/analytics
- Lunch Money Changelog — https://lunchmoney.app/changelog
- Origin Budget by Groups — https://useorigin.com/resources/blog/budget-by-groups-how-to
- Adobe Spectrum Donut Chart Guidelines — https://spectrum.adobe.com/page/donut-chart/
- Semrush Intergalactic Donut Chart — https://developer.semrush.com/intergalactic/data-display/donut-chart/donut-chart
- iOS 17 Pie/Donut Charts in SwiftUI — https://medium.com/evangelist-apps/ios-17-pie-charts-donut-charts-in-swiftui-4d5b585f5ee5
- Smashing — Typography for Fintech — https://www.smashingmagazine.com/2023/10/choose-typefaces-fintech-products-guide-part1/
- Wise iOS Design Critique 2025 — https://ixd.prattsi.org/2025/09/design-critique-wise-ios-app/

## Next

- `Designer` agent running in background — will produce `DESIGN-ORDER.md` (canonical A-to-Я redesign spec)
- After Designer finishes: merge into atomic-commit task list, route through `gsd-plan-phase` or direct execution
- Optional later: `/research-deep` on `outline.yaml + fields.yaml` for per-app per-field deep fills (14 × 35 fields ≈ 490 cells)
