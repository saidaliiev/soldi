# UI Review — Sprint E + D6

**Audited:** 2026-05-25
**Commits in scope:** `891b609..e5a8df5` (E1 mantissa-only donut centre, E2 floating tab-bar clearance, E3 Activity header inset, E4 Jars empty-state pill hide, E5 chat suggestion params, D6 ActivityDefaultFilters, D6 follow-up excludeAxes).
**Design contract:** `docs/design/soldify-screens.html` §2 dashboard, §3 Activity, §6 Jars, §7 Chat.
**Mode:** read-only code audit. No dev-server screenshots; verification limited to source against tokens, typography, motion, a11y, i18n and design HTML.

---

## Pillar verdicts

| Pillar | Verdict |
|---|---|
| 1. Token discipline | **FLAG** — one alpha-on-hex inline literal (re-occurrence of an existing pattern). |
| 2. Typography contract | **PASS** — TYPE.* used everywhere; one minor override on the jars featured name. |
| 3. Motion governance | **PASS** — no ad-hoc `withTiming`/`withSpring` literals in any new file. |
| 4. Accessibility | **FLAG** — D6 sign+date pills lack mutual-exclusion `accessibilityState`; donut a11y string still hardcoded English. |
| 5. i18n completeness | **PASS** — every new user-facing string keyed; en+uk parity on `chat.json`, `transactions.json`, `dashboard.json`, `jars.json` for the new keys. |
| 6. Design-spec fidelity | **FLAG** — donut centre label dropped the fraction the spec showed; Activity sign/date pills landed as a 3-row vertical stack, not the single horizontal strip the HTML mocks. |

---

## 1. Token discipline — FLAG

**What's correct (most of the slice).**
- DonutChart.tsx uses `COLORS.textMuted`, `COLORS.textPrimary`, `COLORS.textSecondary`, `SPACING.md` — no inline hex (`DonutChart.tsx:357-381`).
- GlassTabBar.tsx new exports (`TAB_BAR_HEIGHT=56`, `TAB_BAR_FLOATING_MARGIN=SPACING.md`) are token-derived; dashboard consumer composes the padding from tokens (`index.tsx:175-180`).
- transactions.tsx header (`paddingHorizontal: SPACING.lg`, `paddingTop: SPACING.md`, `paddingBottom: SPACING.sm`) uses only `SPACING.*` (`transactions.tsx:188-191`).
- JarListScreen.tsx new branch (`!isEmpty && <Pressable…>`) uses `COLORS.accent`, `COLORS.white`, `RADIUS.pill`, `SPACING.md` — clean (`JarListScreen.tsx:88-99, 173-184`).
- FilterPillsRow.tsx unchanged token surface (excludeAxes is logic-only).

**FLAG — alpha-on-hex template literal in ActivityDefaultFilters.**
- `ActivityDefaultFilters.tsx:285` — `borderColor: \`${COLORS.textMuted}33\`` builds `#6E695F33` via string interpolation. This is the exact AI-slop pattern CLAUDE.md's design rule warns about: a derived color that bypasses the token surface. There is no `textMutedAlpha20` / `borderSubtle` token; one already exists in spirit on `transactions.tsx:219` (`backgroundColor: \`${COLORS.error}1A\``) so this is an established but unbridged debt, not a new defect — call it out and pay it down.
- Severity: P2 (consistent with prior file, but compounds drift). Fix: add `COLORS.borderSubtle` (or `COLORS.hairline`) to `tokens.ts`, swap both occurrences in the same commit.

**Notes that are NOT findings.**
- `JarListScreen.tsx:236-237` — `featuredName` does `...TYPE.editorialLead, fontSize: 21, lineHeight: 26` — those overrides are values (typography pillar), not tokens.
- The Pressable `pressed && styles.pressed` opacity 0.7 on `JarListScreen.tsx:247-248` is a style scalar, not a color token — fine.

---

## 2. Typography contract — PASS (with one nit)

**What's correct.**
- DonutChart centre stack uses `TYPE.uiLabel` (eyebrow) + `TYPE.displayL` (amount) + `TYPE.displayM` (slice name) — all from the contract (`DonutChart.tsx:358-380`). Tabular-nums set via `fontVariant`, matching the rule that lists/numbers get Manrope's tnum.
- transactions.tsx header title: `TYPE.displayM` (Oswald 28/34) — correct, matches the HTML mock at the same visual register (`transactions.tsx:192-195`).
- JarListScreen header: `TYPE.displayM` for the title (`JarListScreen.tsx:169-172`). Empty CTA label uses `TYPE.uiButton` — correct.
- ChatEmptyState: `TYPE.editorialBody` italic for the phrase, `TYPE.uiLabel` for the subphrase — exactly the rule (EB Garamond for editorial body, Manrope for UI meta) (`ChatEmptyState.tsx:137-150`).
- GlassTabBar label `TYPE.uiLabel` — correct (`GlassTabBar.tsx:243-245`).
- ActivityDefaultFilters Pill label `TYPE.uiLabel` — correct (`ActivityDefaultFilters.tsx:290-292`).
- FilterPillsRow label/dismiss `TYPE.uiLabel` / `TYPE.uiButton` (`FilterPillsRow.tsx:189-204`).

**Nit (not a finding).** `JarListScreen.tsx:236-237` spreads `TYPE.editorialLead` then overrides `fontSize:21, lineHeight:26`. The contract value is 20/28; the redesign locks 21/26 deliberately per HTML §6 ("Garamond 21pt jar name"). Document inline justification exists ("Garamond 21pt jar name"), so it's acceptable, but a `TYPE.featuredJarName` preset would remove the override entirely. P2.

**Searchwide verification (no findings).** No new file in scope uses raw `fontSize:` outside of `TYPE.*` except the documented featuredName override above and the deliberate `searchIcon` override (`transactions.tsx:204-207` — glyph sizing, not body text).

---

## 3. Motion governance — PASS

**Boundary respected in every new file.**
- DonutChart.tsx — every animation goes through `withMotion(target, 'presetName')` against `arcDraw` / `arcInterpolate` / `sharedMonth` (`DonutChart.tsx:106-111, 170-176`). Presets all exist in `motion.ts:30-40` (verified).
- ChatEmptyState.tsx — `withMotion(1, 'chatBubbleEnter')` for opacity AND translateY (`ChatEmptyState.tsx:43-46`). The 150ms `withDelay` lead from the older inline version was dropped with an explicit code comment justifying the trade ("the boundary exposes no governed delay primitive and CLAUDE.md bans ad-hoc literals"). That is the correct interpretation of the rule, not a regression — score it positively.
- ActivityDefaultFilters, FilterPillsRow, GlassTabBar, JarListScreen empty branch, transactions.tsx header, dashboard padding tweak — none of them animate. Adding new static surfaces with no ad-hoc motion is a clean way to satisfy this pillar.

**No `withTiming(` / `withSpring(` / `withDelay(` literals introduced in any in-scope file.** Verified by reading every new diff hunk; no escape hatches.

---

## 4. Accessibility — FLAG (two specific defects)

**What's correct.**
- DonutChart computes an a11y label and applies it to the outer wrapper; inner Skia canvas is correctly excluded with `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` (`DonutChart.tsx:259-272, 290-294`). Tap target is the entire 200×200 canvas (well over 44pt).
- GlassTabBar tabs: `accessibilityRole="tab"` + `accessibilityState={{ selected: focused }}` + `accessibilityLabel` + tap target `minHeight: MIN_TAP` (`GlassTabBar.tsx:144-149, 235-241`). Clean.
- JarListScreen new pressable: role/label/44+pt height (`height:42` with the container giving header padding — Note: 42pt height alone is **2pt below** the 44pt floor; `hitSlop` not set on this branch). See finding A below.
- transactions.tsx searchButton: `minWidth: 44, minHeight: 44`, hitSlop=12 (`transactions.tsx:103-114, 196-201`). Correct.
- ActivityDefaultFilters Pill: `accessibilityRole="button"`, `accessibilityState={{ selected: on }}`, hitSlop on top/bottom (`ActivityDefaultFilters.tsx:90-107`). Tap target is 32pt high — `hitSlop` adds 8+8 = effective 48pt vertical. ✓ horizontally relies on `minWidth:44`. ✓
- FilterPillsRow dismiss: `hitSlop={12}`, `accessibilityRole="button"`, `accessibilityLabel="Remove ${pill.label}"` (`FilterPillsRow.tsx:154-164`). Correct.
- ChatEmptyState illustration: `accessibilityRole="image"` + label; phrase has `accessibilityRole="text"` (`ChatEmptyState.tsx:91-105`).

**Finding A — P1 — JarListScreen header pressable is 42pt tall.**
- `JarListScreen.tsx:173-180` — `createBtn.height: 42` with NO `hitSlop`. CLAUDE.md rule says 44pt minimum. Visually the design HTML shows a header pill at ~42pt (mock metric), but the platform rule is hard 44pt. The empty-state CTA below (line 212-220) correctly uses `height: 52`. Fix: add `hitSlop={{ top: 4, bottom: 4 }}` or bump to 44. Two-line change.

**Finding B — P1 — ActivityDefaultFilters sign + date pills have no mutual-exclusion semantics.**
- `ActivityDefaultFilters.tsx:217-258` — the three sign pills (All / Expense / Income) are semantically a radio group. Same for the three date scope pills (This / Last / Custom). Each pill exposes `accessibilityState={{ selected: bool }}` independently, but there is no `accessibilityRole="radio"` and no enclosing group with `accessibilityRole="radiogroup"`. VoiceOver users hear "Expense, button, selected" with no signal that picking it deselects "All". Fix: change Pill role to `"radio"` for these two strips; wrap each strip's `ScrollView` in a `View accessibilityRole="radiogroup" accessibilityLabel="Sign filter"`. Category strip stays multi-select (`role=button` correct).

**Finding C — P2 — DonutChart a11y string hardcoded English.**
- `DonutChart.tsx:250-256` — `'Spending donut chart. No data this month.'` and `'…Double-tap a slice to see details.'` are literal strings. Surface mixes in localized data (`localizedCategoryName`, `formatMoney`) but the scaffold is English-only. Ukrainian VoiceOver users will hear English. Add keys e.g. `dashboard.donut_a11y_empty`, `dashboard.donut_a11y_with_data` (i18next interpolation) and route through `t()`.

**Finding D — P2 — transactions.tsx `accessibilityLabel="Open search and filter"` is hardcoded English.**
- `transactions.tsx:106` — same class of issue. Not new in this slice (predates E3), but the E3 commit touched this exact block and didn't fix it. Add `transactions.search_open_a11y` key.

**Finding E — P2 — transactions.tsx `accessibilityLabel="Transactions screen"` and ActivityDefaultFilters root `accessibilityLabel="Default filters"` hardcoded English.**
- `transactions.tsx:92`, `ActivityDefaultFilters.tsx:190`. Same fix pattern.

---

## 5. i18n completeness — PASS

**Parity verified (every new user-facing string).**

| Key | en | uk | Used by |
|---|---|---|---|
| `chat.prompt_category_last_month` | ✓ "How much on {{category}} last month?" | ✓ "Скільки витрачено на {{category}} минулого місяця?" | ChatEmptyState E5 |
| `chat.prompt_category_last_month_fallback` | ✓ | ✓ "…на продукти…" | ChatEmptyState E5 |
| `chat.prompt_compare_months` | ✓ "Compare {{thisMonth}} vs {{prevMonth}}" | ✓ "Порівняти {{thisMonth}} і {{prevMonth}}" | ChatEmptyState E5 |
| `chat.prompt_top_merchants` | ✓ | ✓ | ChatEmptyState E5 |
| `transactions.sign_all/expense/income` | ✓ | ✓ | ActivityDefaultFilters D6 |
| `transactions.scope_this_month/last_month/custom` | ✓ | ✓ | ActivityDefaultFilters D6 |
| `dashboard.donut_total_label` | ✓ "Total" | ✓ "Разом" | DonutChart E1 |
| `jars.create_cta`, `jars.empty_state`, `jars.empty_state_sub`, `jars.to_go_label` | ✓ | ✓ | JarListScreen E4 |

**Locale routing correct.** ChatEmptyState and FilterPillsRow consistently derive `locale = i18n.language === 'uk' ? 'uk-UA' : 'en-IE'` (`ChatEmptyState.tsx:58`, `FilterPillsRow.tsx:62`, `transactions.tsx:64`). `relativeMonth.ts:33-34` uses `Intl.DateTimeFormat(locale, { month: 'long' })` so the day-of-month edge case (Jan 31 → Dec 31 vs Nov 30) is correctly handled by `setMonth` with day=1 — verified per doc comment.

**Caveats (not P-class i18n findings; they're a11y findings already filed above).** The hardcoded English `accessibilityLabel`s in DonutChart, transactions.tsx, ActivityDefaultFilters are i18n debt too — captured under Pillar 4 to avoid double-counting.

---

## 6. Design-spec fidelity — FLAG (two divergences)

**What landed correctly.**
- Floating tab bar (Wave 1 implementation, but Sprint E2 ensures the dashboard ScrollView respects it via exported constants) — design HTML §2 shows the tab bar as a pill detached from screen edge with the FAB hovering. E2's `paddingBottom = TAB_BAR_HEIGHT + TAB_BAR_FLOATING_MARGIN + insets.bottom + SPACING.md` (`index.tsx:175-180`) correctly clears it. Previously the "Clothing" row was clipped — fixed.
- Activity header inset (E3): the design HTML §3 line 223 shows the "Activity" title at `padding-top:12px` inside a `.pad` (≈24pt from the screen edge). E3's `paddingHorizontal: SPACING.lg` (24pt) matches the row badge inset and the mock gutter. ✓
- Jars empty state (E4): design HTML §6 shows the create pill in the header for the populated state. The mock has no empty-state screenshot, but the spec rule "one affordance per screen" is the right call. The centred 52pt CTA below the empty copy is the singular affordance.
- D6 ActivityDefaultFilters (most of it): top-3 categories + sign + scope is the right discovery surface; pill atoms match HTML §3 line 225-226 (`pill on` / `pill` — sandstone surface inactive, accent fill active) — visually faithful.

**Finding F — P1 — DonutChart centre dropped the fraction the spec uses elsewhere.**
- E1 changed the centre to `minimumFractionDigits:0, maximumFractionDigits:0` (`DonutChart.tsx:241-248`). HTML §2 line 164 shows the dashboard hero rendering `−€2,418.60` (split-fraction). The PR's rationale says: hero band already shows the fraction; repeating it inside the ring is duplicate noise. That argument is defensible BUT the design HTML's donut mock at line 169-174 does not render any centre number (it's a four-arc ring with the title to the right). So the spec doesn't actually say "mantissa-only inside the ring" — it says "no number inside the ring at all in the dashboard money-shot mock; the largest-category card is the dominant nearby number". You diverged from the mock either way; mantissa-only is a reasonable middle ground but it's an interpretation, not a literal match. Track as a deliberate divergence with rationale captured inline (which the code comment does — fine).
- Severity: P2 — comment-justified divergence; surface it in the next design-sync review.

**Finding G — P1 — ActivityDefaultFilters renders 3 vertically-stacked horizontal ScrollViews; HTML §3 shows 1 horizontal strip.**
- HTML §3 line 225-226: `<div class="row" style="gap:8px;margin:18px 0 4px;overflow:hidden"><div class="pill on">All</div><div class="pill">Expense</div><div class="pill">Income</div><div class="pill">Rent</div></div>` — sign + categories interleaved in a single horizontal strip.
- Implementation: three separate `ScrollView horizontal` rows, one per axis (`ActivityDefaultFilters.tsx:191-258`), with `rowGap: SPACING.xs` between them. This is functionally richer (clearer axis grouping, no scroll thrash between groups) but it triples the vertical real estate before the list. On a tall iPhone this is fine; on a 4.7" SE-class device the first transaction row drops below the fold. Worth a design-sync ratify call: either reorganize as a single horizontal strip (literal match to HTML) or have the spec adopt the 3-row stack and document the rationale (axis legibility > vertical density). Track explicitly — neither side of this call is "wrong", but the current implementation silently disagrees with the authority doc.
- Severity: P1 (design-sync ratify required; no token/typography/a11y harm, but a vertical-density regression for short screens).

**Finding H — P2 — Date "Custom" pill jumps to a modal route on tap.**
- `ActivityDefaultFilters.tsx:182-184` — tapping Custom navigates `/transactions/search`. The other two pills toggle a date range inline. The state model becomes "Custom shows as selected only if you came back from the modal with an arbitrary range". On user mental-model: tapping Custom looks like it should expand inline pickers (the HTML mock has no precedent because §3 only shows the simple strip). Acceptable UX (modal owns the pickers), but the pill semantics differ from the other two — consider an explicit chevron glyph on the Custom pill to signal "this opens something". Track as P2 polish.

---

## Other observations (not pillar findings, but worth noting)

- **DonutChart `setTimeout(markFirstFrame, 0)` on every render is gated by `firstFrameLogged.current` — correct, fires once. No leak.** (`DonutChart.tsx:189-196`)
- **ActivityDefaultFilters `useFocusEffect` for top-3 categories re-runs the breakdown query every focus** — fine for now (Phase-2 data sizes), but if the breakdown query becomes expensive consider memoizing per month-key.
- **FilterPillsRow excludeAxes via `Set` lookup — clean** (`FilterPillsRow.tsx:43-46`). Default-empty `excludeAxes?: readonly FilterAxisKey[]` typed against the real `FilterAxisKey` union (`types.ts:26-31`), so unrecognized axis names won't compile. Good API.
- **DonutChart hero-carry effect depends on `breakdown` reference but `breakdown` is not in the dep array** (`DonutChart.tsx:170-176` — `useEffect(..., [breakdown, monthDirection, …])`). Actually it IS listed. ✓ Correct.

---

## Punch-list

### P1 (ship-blocker class — fix before next design review)
1. **Finding A** — JarListScreen header pressable must reach 44pt tap target. Bump height or add `hitSlop={{ top: 4, bottom: 4 }}`. `JarListScreen.tsx:173-180`.
2. **Finding B** — ActivityDefaultFilters sign + scope strips need `accessibilityRole="radio"` per pill + `accessibilityRole="radiogroup"` on the wrapper. `ActivityDefaultFilters.tsx:217-258`.
3. **Finding G** — ratify ActivityDefaultFilters 3-row stack vs HTML §3 single-strip with the design authority. Either reorganize to one horizontal strip (literal match) or update `soldify-screens.html` §3 to show the 3-row pattern and document why (axis grouping).

### P2 (debt — clean up in next polish slice)
4. **Finding F** — DonutChart centre mantissa-only vs HTML "no centre number at all". Capture decision in design HTML §2 so the redesign authority and code agree.
5. **Finding C, D, E** — i18n the hardcoded `accessibilityLabel`s in DonutChart, transactions.tsx, ActivityDefaultFilters (3 strings + 1 with-data interpolation).
6. **Token debt** — introduce `COLORS.borderSubtle` / `COLORS.hairline` to retire the `\`${COLORS.textMuted}33\`` and `\`${COLORS.error}1A\`` patterns. `ActivityDefaultFilters.tsx:285`, `transactions.tsx:219`.
7. **Finding H** — Custom date pill should signal "opens picker" (chevron glyph or trailing icon). `ActivityDefaultFilters.tsx:252-257`.
8. **Typography preset** — promote the 21/26 EB Garamond override to `TYPE.featuredJarName` so the override at `JarListScreen.tsx:236-237` disappears.

### P0
None. Nothing in this slice is broken in production; the slice ships safely.

---

## Files audited

- `apps/mobile/src/features/dashboard/DonutChart.tsx` (E1)
- `apps/mobile/app/(tabs)/index.tsx` (E2 padding consumer)
- `apps/mobile/src/features/chrome/GlassTabBar.tsx` (E2 export)
- `apps/mobile/app/(tabs)/transactions.tsx` (E3 + D6 wiring)
- `apps/mobile/src/features/jars/JarListScreen.tsx` (E4)
- `apps/mobile/src/features/chat/ChatEmptyState.tsx` (E5)
- `apps/mobile/src/lib/relativeMonth.ts` (E5)
- `apps/mobile/src/i18n/locales/en/chat.json`, `uk/chat.json` (E5)
- `apps/mobile/src/features/transactions/ActivityDefaultFilters.tsx` (D6)
- `apps/mobile/src/features/transactions/FilterPillsRow.tsx` (D6 follow-up)
- Cross-reference: `apps/mobile/src/design/tokens.ts`, `typography.ts`, `motion.ts`, `transactions/types.ts`, `i18n/locales/{en,uk}/{transactions,dashboard,jars}.json`, `docs/design/soldify-screens.html`.

Total verdicts: 2× PASS, 3× FLAG, 0× BLOCK. Slice is clean to ship; P1s are open the moment the next slice lands.
