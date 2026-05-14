# Phase 2 Discussion Log

**Date:** 2026-05-14
**Mode:** discuss (default), batched single-pass

## Areas Selected
User selected all 4 proposed gray areas (multiSelect):
1. Dashboard composition + month nav
2. Transaction list UX
3. Search + filter behavior
4. Category editor + SVG icon picker

## Q&A

### Dashboard — first screen + month navigation
**Options:** Editorial scroll + swipe months | Fixed top + scroll body, arrow nav | Current month only (v1)
**Selected:** Editorial scroll + swipe months
**Note:** Hero monthly total → Skia donut → digest card → top-5 categories. Horizontal swipe between months.

### Transaction list — grouping + gesture
**Options:** Sticky date headers + swipe-left bottom sheet | Soft groups + inline 3 buttons | Calendar dates + tap-only
**Selected:** Sticky date headers + swipe-left bottom sheet
**Note:** "Today/Yesterday/Mon 12 May" with daily subtotals. Bottom sheet with all categories scroll.

### Search/filter
**Options:** Header bar + filter pills row, live | Search icon → expand, no filters in v1 | Full search/filter modal
**Selected:** Full search/filter modal
**Note:** Richer experience preferred over speed.

### Category editor + SVG icons
**Options:** Full-screen list + curated SVG (~60) | Settings-nested + lucide-react-native | Bottom sheet editor + custom SVG only
**Selected:** Bottom sheet editor + custom SVG only (~30 hand-drawn) + 8 terracotta swatches
**Note:** Premium brand-distinctive icons. No lucide.

### Donut chart interaction
**Options:** Tappable slices, center morphs label | Static donut + legend list | Donut → category detail navigation
**Selected:** Tappable slices, center morphs label

### Recategorize bottom sheet contents
**Options:** Top-5 recent + scrollable all | All categories, sorted by usage | Search-first + alphabetical
**Selected:** Top-5 recent + scrollable all (chips at top, full list below)

### Search/filter modal axes (multi-select)
**Selected all 4 axes:** Category (multi-select), Amount range (min/max), Income/Expense/Both, Date range

### Category merge UX
**Options:** Multi-select → pick survivor | Drag-drop merge | No merge in v1
**Selected:** Drag-drop merge + 8 terracotta swatches
**Note:** Premium gesture, reanimated v4.

### "Yesterday in money" digest data
**Options:** Yesterday total + 7-day sparkline + MoM compare | Yesterday total + top-3 categories | 7-day rolling spend + sparkline
**Selected:** Yesterday total + 7-day sparkline + MoM compare snippet

### Month swipe boundaries
**Options:** First-tx → current+1 with placeholder | Months with tx only | Last 12 months hard limit
**Asked for recommendation; recommended:** First-tx → current+1 with placeholder.
**Selected:** First-tx → current+1 with placeholder

### Empty states styling
**Options:** Editorial illustration + EB Garamond phrase | Minimal icon + Manrope phrase | Skeleton placeholder rows
**Selected:** Editorial illustration + EB Garamond italic phrase

### Performance budget
**Options:** Reanimated worklets + FlashList + JS profiler check | FlashList + virtualization only, profile post-MVP
**Selected:** FlashList + virtualization, profile post-MVP
**Note:** Acceptance criterion `donut first frame < 100ms` retained; SE 2020 60fps measurement gated to Phase 5.

## Deferred Ideas
- AI categorization on manual entry → Phase 3
- Custom color picker → v1.5
- Bulk category operations → v1.5
- Saved filter presets → v1.5
- Pull-to-refresh → Phase 4 (monobank live sync)
- Receipt attachment → v1.5
- lucide-react-native rejected outright

## Claude's Discretion
- Pixel sizes, exact illustration choice per empty state, sparkline height, search input placeholder copy, swipe-distance threshold for bottom sheet trigger.
- @gorhom/bottom-sheet vs custom (research-driven).
- Per-default-category color swatch assignment.

---
*Phase: 02-dashboard-transactions-categories*
