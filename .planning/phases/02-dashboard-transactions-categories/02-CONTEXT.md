# Phase 2: Dashboard + Transactions + Categories - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

User opens the app and sees a beautifully designed monthly overview (animated Skia donut + monthly hero total + "yesterday in money" digest), scrolls 5000+ transactions at 60fps with date grouping, swipes a row to recategorize via bottom sheet, taps a search icon to open a full filter modal, and edits/creates/merges categories via a bottom sheet editor with hand-drawn SVG icons.

In scope (Phase 2 only):
- Dashboard screen: monthly hero total + Skia donut + digest card + top-5 categories
- Month navigation (horizontal swipe across months that contain data, with current+1 placeholder)
- Transaction list: FlashList v2 + sticky date headers + daily subtotals
- Swipe-left → bottom sheet recategorize
- Search/filter modal (multi-axis)
- Category editor (bottom sheet): create / rename / delete / merge
- Custom hand-drawn SVG icon set (~30) + 8 terracotta color swatches
- Empty states (illustration + editorial italic phrase)
- All accessibility primitives (labels, roles, 44pt tap targets, dynamic type)

Out of scope (other phases):
- AI auto-categorization (Phase 3: CAT-03/04)
- AI chat (Phase 3: CHAT-01..04)
- Goal jars (Phase 4: JAR-01..03)
- Ukrainian translation pass (Phase 4: SET-02, QUAL-01..04)
- Settings, biometric, notifications (Phase 5)
- Receipt OCR / dark mode / projections (v1.5)

</domain>

<decisions>
## Implementation Decisions

### Dashboard Composition
- **D-01:** Editorial scrollable layout (no fixed shell). Vertical order: hero monthly total (Oswald `TYPE.displayXL`) → Skia donut + breakdown → "yesterday in money" digest card → top-5 category rows.
- **D-02:** Horizontal swipe between months (reanimated v4 worklet gesture). Past lock = month of earliest transaction. Forward lock = `current + 1` month; future month displays empty-state placeholder `"No data yet · Add transactions to see this month"`.
- **D-03:** Above-the-fold = monthly total + donut. Digest card and category rows are below-the-fold (scrollable). No tab bar overlay.

### Skia Donut Chart
- **D-04:** Tappable slices. On slice tap, the center label morphs from monthly total → category name + amount + percentage of total. Untap returns center to monthly total.
- **D-05:** Donut animation on month change: slices interpolate from previous month's values to new month's values (reanimated `withTiming`, 300ms `Easing.out(Easing.cubic)`).
- **D-06:** Category order in donut: descending by absolute amount. Top 5 explicit slices; remainder grouped into "Other" slice.

### "Yesterday in money" Digest Card
- **D-07:** Card contents: large Oswald number (yesterday total expense) + mini Skia sparkline of last 7 days + EB Garamond italic MoM compare snippet (e.g., `"−€42 vs last month avg"`).
- **D-08:** Card is its own dashboard section between donut and category rows. Full-width card with `RADIUS.lg`, `COLORS.surface` background, no border.

### Transaction List
- **D-09:** FlashList v2 with sticky date headers. Header format: `"Today"` / `"Yesterday"` / `"Mon 12 May"` (locale-aware via `i18next` + Intl.DateTimeFormat). Each header includes daily subtotal (sum of expense amounts that day) in Manrope `TYPE.uiLabel`.
- **D-10:** Row format: merchant name (Manrope semibold) + category chip (small, on left) + amount (Oswald medium, right-aligned, tabular figures). Tap anywhere → tx detail screen.
- **D-11:** Swipe-left gesture opens recategorize bottom sheet (reanimated `useAnimatedGestureHandler` worklet for the swipe; sheet itself uses `@gorhom/bottom-sheet` or built equivalent).
- **D-12:** Recategorize bottom sheet contents: top-5 most-recently-used categories rendered as chips (horizontal scroll) at the top; full category list below sorted by usage count. Haptic `light` on selection. Tapping a category writes to DB and closes the sheet.

### Search + Filter
- **D-13:** Search/filter modal (full screen, not bottom sheet). Trigger: search icon in transaction-screen header.
- **D-14:** Modal layout: search input at top (autofocus), filter axes as expandable sections below: Category (multi-select checkboxes), Amount range (min/max numeric inputs), Income / Expense / Both (segmented toggle), Date range (from/to calendar pickers).
- **D-15:** Search is live on `merchant_name` and `amount` (debounced 150ms). Filters compose with search via AND.
- **D-16:** "Apply" CTA closes the modal and returns to the transactions list with applied filter state visualized as removable pills above the list (e.g., `"Food · €0–€50 · Expense"` with `×` to clear each).

### Category Editor
- **D-17:** Editor opens as a bottom sheet (`@gorhom/bottom-sheet`, snapPoint `~60%`). Triggers: settings-style nested entry from dashboard category row long-press, and inline from `/categories` index.
- **D-18:** CRUD: create (`+` icon in sheet header) / rename (tap row) / delete (swipe row) / merge (drag-drop one category onto another).
- **D-19:** Drag-drop merge: long-press category row enters drag mode (haptic medium + lift animation). Drop on another row triggers confirm modal `"Merge {A} into {B}? All transactions in {A} will be reassigned to {B}. This cannot be undone."` `Confirm` → DB update + close sheet.

### SVG Icons + Color
- **D-20:** Custom hand-drawn SVG icon set, ~30 icons covering common categories (food, transport, bills, entertainment, health, education, gifts, savings, salary, etc.). Stored as inline React components in `src/design/icons/categories/`. Each icon supports `color` + `size` props.
- **D-21:** Banned: `lucide-react-native`, emoji, raw images. SVG only, hand-drawn aesthetic (rough edges, organic line weight — not geometric outline).
- **D-22:** 8 preset terracotta-family color swatches as the only color choices for new categories: `#C97B5C` (accent), `#D9997A` (accentSoft), `#A86147` (accentDeep), `#9DA88C` (sage), `#B5C0A5` (sageSoft), `#7A876A` (sageDeep), `#B85C5C` (error/muted), `#7A5C52` (textSecondary). No custom color picker.

### Empty States
- **D-23:** Editorial illustration (custom hand-drawn SVG in brand palette: coffee cup, empty table, pressed flower — picked per context) + EB Garamond italic single phrase + a single CTA button.
- **D-24:** States: empty current month (`"This month is a blank page."` + `Add transaction`), no search results (`"Nothing matches yet."` + `Clear filters`), no categories beyond defaults (`"Make it yours."` + `New category`).

### Performance
- **D-25:** FlashList v2 with `estimatedItemSize` tuned to ~72pt (row height), `drawDistance` default. Virtualization for the long list; no preloading beyond viewport.
- **D-26:** Worklets used for swipe gesture only. Donut animation and sparkline use reanimated `withTiming` on the JS thread (Skia handles GPU). Profile after Phase 5 polish — do not gate Phase 2 on iPhone SE 2020 60fps measurement; instead include a `must_have` that lists `react-native-performance` instrumentation hooks (not wired) for Phase 5.
- **D-27:** Dashboard mount budget: data fetch from op-sqlite must run inside `useFocusEffect` synchronously (executeSync is sync); donut first frame measured against Skia onLayout. Acceptance criterion in plans = `donut renders first frame within 100ms of dashboard mount on a populated DB`.

### Claude's Discretion
- Exact pixel sizes of dashboard sections, illustration choice per empty state, sparkline height, search input placeholder copy, exact swipe-distance threshold for bottom sheet trigger — pick brand-appropriate defaults during planning.
- Choice between `@gorhom/bottom-sheet` and a custom bottom sheet (research will assess; both are acceptable provided the gesture is smooth on physical device).
- Exact category color palette per default category (use D-22 swatches; assign during seed update if needed).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project rules + design contract
- `CLAUDE.md` — design tokens, banned values, typography rules, component primitives, security defaults
- `apps/mobile/src/design/tokens.ts` — color, gradient, spacing, radius constants (source of truth)
- `apps/mobile/src/design/typography.ts` — TYPE presets (Oswald display, EB Garamond editorial, Manrope UI)
- `.planning/PROJECT.md` — core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — DASH-01..03, TXN-01..04, CAT-01..02 (Phase 2 scope)
- `.planning/ROADMAP.md` §"Phase 2" — phase goal, success criteria, plan slugs

### Phase 1 learnings (mandatory pre-read)
- `.planning/phases/01-onboarding-data-ingest/01-LEARNINGS.md` — 16 decisions, 8 lessons, 12 patterns, 7 surprises from Phase 1 (op-sqlite v15 executeSync API, splitStatements, better-sqlite3 devDep, Zustand+persist+secure-store, node:test+tsx, explicit typed routes, mulberry32, slug→id pattern, AI safety description=NULL)
- `.planning/phases/01-onboarding-data-ingest/01-SKELETON.md` — locked architectural decisions (negative cents = expense, repo pattern, route literals)
- `apps/mobile/src/data/transactionsRepo.ts` — existing repository pattern to extend
- `apps/mobile/src/lib/db/index.ts` — DB singleton + splitStatements + migration runner
- `apps/mobile/app/(tabs)/index.tsx` — Phase 1 minimal dashboard (REPLACE per D-01)
- `apps/mobile/app/(tabs)/_layout.tsx` — tab bar (extend with Transactions, Categories)

### Stack docs (fetch via context7 during research)
- `@shopify/flash-list` v2 — FlashList component API (estimatedItemSize, drawDistance, stickyHeaderIndices)
- `@shopify/react-native-skia` — Path, Group, useFont, Skia canvas mounting
- `victory-native` — donut chart (or Skia-only if research recommends rolling our own — donut math is simple)
- `react-native-reanimated` v4 + `react-native-worklets` — `useAnimatedGestureHandler`, `withTiming`, shared values
- `@gorhom/bottom-sheet` — bottom sheet API (snapPoints, animatedIndex)
- `expo-router` v6 — typed routes (Stack inside Tab)
- `i18next` + `react-i18next` — runtime locale switching, Intl.DateTimeFormat for date headers

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/mobile/src/data/transactionsRepo.ts` — `countTransactions`, `sumLastNDays`, `insertManyTransactions` already exist. Extend with: `listByMonth(year, month)`, `listByFilter(filter)`, `updateCategory(txId, categoryId)`, `searchByMerchant(query)`.
- `apps/mobile/src/lib/money.ts` — `formatMoney(cents, locale)`, `toCents`, `fromCents`, `parseAmount` (used in Phase 1 manual entry; reuse for amount-range filter inputs and dashboard hero number).
- `apps/mobile/src/design/tokens.ts` — `COLORS.accent`, `GRADIENTS.warm`, `RADIUS.lg`, `SHADOWS` (verify SHADOWS export — was deferred to Phase 1 per ROADMAP).
- `apps/mobile/src/design/typography.ts` — `TYPE.displayXL`, `TYPE.displayL`, `TYPE.uiLabel`, `TYPE.bodyEditorial` presets.
- `apps/mobile/src/data/synthetic.ts` (Phase 1 generator) — used for default seed data; do not regenerate during Phase 2.

### Established Patterns
- **op-sqlite v15 executeSync** — synchronous, one statement per call. New queries follow this pattern (see `transactionsRepo.ts`).
- **Negative cents = expense, positive = income** — locked in `01-SKELETON.md`. All dashboard math respects this sign.
- **Repository slug→id lookup** — categories are referenced via slug in seeds; runtime resolves to numeric `id`. Same pattern applies to Phase 2 category CRUD.
- **Zustand + persist + expo-secure-store** — used for onboarding store. Any new persistent UI state (e.g., last-selected month, filter pills) uses the same `secureStorage` adapter.
- **Explicit typed-route branches** — `if/else if` over template literals (Phase 1 deviation #1 in `data-source.tsx`). New screens (`/transactions`, `/categories`, `/transactions/[id]`) follow this rule.
- **`useFocusEffect` for tab-focus data reload** — Phase 1 dashboard uses this to refresh counts when tab regains focus. Phase 2 dashboard + transaction list both adopt this.
- **i18next runtime locale** — already wired in Phase 1 `_layout.tsx`. New strings go to `src/i18n/locales/{en,uk}/dashboard.json` + `transactions.json` + `categories.json`.

### Integration Points
- `app/(tabs)/_layout.tsx` — extend tabs: `index` (Dashboard) + `transactions` + `categories`. Phase 1 placeholder tabs (Home, Explore) are replaced.
- `app/(tabs)/index.tsx` — REPLACE Phase 1 minimal dashboard with full Phase 2 dashboard per D-01..D-08.
- `app/transactions/index.tsx` (new) — FlashList screen with header (search icon + filter pills row).
- `app/transactions/[id].tsx` (new) — tx detail with full edit (TXN-04).
- `app/transactions/search.tsx` (new, modal route) — search/filter modal.
- `app/categories/index.tsx` (new) — category index (also reachable from dashboard category row long-press).
- `app/categories/edit.tsx` (new, modal route) — category bottom-sheet editor (could be a presented modal in expo-router rather than a separate route — research will confirm).
- DB schema: `transactions` table exists. `categories` table exists with seed. Phase 2 adds `merchant_overrides` (deferred to Phase 3) NOT here. Verify no schema migration required for Phase 2.

</code_context>

<specifics>
## Specific Ideas

- **Brand reference for digest card:** premium editorial card feel — think NYT Money column digest, not a fintech "Spending insights" card. EB Garamond italic phrasing tone: declarative, slightly literary (e.g., `"Yesterday's coffee added up."` over `"You spent €X on Y category."`).
- **Donut chart aesthetic:** thicker stroke than typical (8–12pt), gaps between slices (2pt), no labels on the donut itself — labels appear only in the center on tap. Color = category color from D-22 palette.
- **Sparkline aesthetic:** single-line, no fill, accent color, ~32pt height, anti-aliased via Skia.
- **Empty-state illustrations:** hand-drawn style, not vector-perfect. Inspired by editorial book spot illustrations. ~120pt square.
- **No tab bar emoji ever.** Tab icons = custom SVG (consistent with category icon style).
- **No glassmorphism, no neon, no fintech blue gradients anywhere.** Enforced by `CLAUDE.md`.
- **Tabular figures** for all amounts (Manrope variant + Oswald). CSS prop `fontVariant: ['tabular-nums']` on Text.

</specifics>

<deferred>
## Deferred Ideas

- **AI categorization on new manual entry** — defer to Phase 3 (CAT-03). Phase 2 manual entry uses last-selected category as default; user picks explicitly.
- **Custom color picker** beyond 8 swatches — defer to v1.5. v1 keeps the swatch set tight for brand consistency.
- **Bulk category operations** (delete-many, merge-many in one action) — defer to v1.5. v1 merge is one-pair at a time via drag-drop.
- **Saved filter presets** ("My favorite filters") — defer to v1.5.
- **Pull-to-refresh on transactions list** — synthetic + local data make this redundant; defer to Phase 4 when monobank live sync is real.
- **Receipt attachment to transaction** — out of scope (deferred to v1.5 per PROJECT.md).
- **Category icons from `lucide-react-native`** — explicitly rejected (D-21); brand-distinctive hand-drawn set is mandatory.

</deferred>

---

*Phase: 02-dashboard-transactions-categories*
*Context gathered: 2026-05-14*
