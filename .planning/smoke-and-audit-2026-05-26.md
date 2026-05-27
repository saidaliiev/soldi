# Soldify smoke test + visual+tech audit — 2026-05-26

**HEAD:** `6fded76` (post-emoji refactor)
**Build:** EAS Android preview `5609d790` (self-contained, no Metro dependency)
**Device:** emulator-5554 — Android 15, sdk_gphone64_x86_64, 1080×2400
**Onboarding path:** EN language → Sample data (synthetic, 90 days)
**Method:** Walked 13 screens, 18 screenshots, logcat scanned for FATAL/Exception

---

## TL;DR

**Native loads + 90-second onboarding works.** Sample data generation, dashboard render, navigation between 4 tabs, transaction list with sticky date headers, all bottom sheets, settings, language toggle — all functional. Zero native crashes in logcat.

**13 visual findings + 6 functional bugs** identified. Two are P0-priority (dashboard double-Other row + EmojiPicker discoverability). All other issues are P1 polish or P2.

The emoji refactor renders correctly across all screens; emoji-vs-badge alignment is solid; cross-platform rendering on Android Noto Color Emoji is consistent. Premium Slate&Sand palette holds.

---

## Smoke test — pass/fail per screen

| # | Screen | Status | Evidence | Notes |
|---|--------|--------|----------|-------|
| 1 | Welcome / language pick | ✅ PASS | walk-01 | Donut decoration, EB Garamond "Money, slower.", 2 lang tiles, 3-dot indicator. Matches design intent. |
| 2 | Onboarding data-source | ✅ PASS | walk-02 | 4 cards with D5 source icons (sparkle, pencil, link, download). Editorial title. |
| 3 | Sample-data generation | ✅ PASS | (instant transition) | No loading spinner observed — sample 90-day data generated synchronously, lands on dashboard within ~3s. |
| 4 | Dashboard / Overview | ⚠️ PARTIAL | walk-03, walk-04, walk-13b | Loads, hero band + donut + yesterday card render. **TWO duplicate "Other" rows** (P0-1). FAB peeks behind tab bar. |
| 5 | Activity / Transactions | ✅ PASS | walk-05 | Filter pills (default-set + sign + date), sticky date headers, currency mix (UAH/€) works. Sample categorisation puts many merchants in "Other" — synthetic-data weakness, not code bug. |
| 6 | Transaction detail | ⚠️ ISSUES | walk-06 | White header bar mismatches sand bg (P1). Date raw ISO (P1). Amount field no currency (P1). |
| 7 | Recategorize sheet | ✅ PASS | walk-07 | Recent chips + full category list, all canonical emojis rendered. Sheet snap point correct. |
| 8 | Jars (empty) | ✅ PASS | walk-08 | E4 fix verified — no top-right pill, only centered New Jar. EB Garamond italic subtitle. |
| 9 | Jar create sheet | ✅ PASS | walk-09 | SVG icons preserved (jars rule honored). TARGET AMOUNT missing currency (P1). |
| 10 | Chat (empty) | ⚠️ ISSUES | walk-11 | E5 parametrised pill says "How much on **other** last month?" — bug (P1). Pill tap = no visible reaction (P1). No input row visible (P1). |
| 11 | Settings | ✅ PASS | walk-14 | All 5 sections render (Security, Language, Notifications, Data, Categories). Toggle + segmented + export pill work. |
| 12 | Categories list | ✅ PASS | walk-15, walk-16 | All 18 default categories with canonical emojis. Custom section empty state. |
| 13 | Category editor | ⚠️ P0 | walk-17, walk-18 | **EmojiPicker horizontal scroll** — only 7 of 30 emojis visible, selected emoji has no visible indicator (P0-2). |

**Cold-start logcat:** zero `FATAL EXCEPTION` / `AndroidRuntime` errors. Zero `Hermes panic`. Zero `JS Exception` after app boot.

---

## VISUAL FINDINGS

### 🚨 V-P0-1 — Dashboard double-"Other" row (HIGH IMPACT)

**Evidence:** walk-04 (`/tmp/walk-04-dashboard-scroll.jpg`)

Two rows labelled "Other" appear in the category breakdown:
- Top: "Other" €51,005.31 (largest spender, ~67% of total)
- Bottom: "Other" €2,505.53 (after Eating out)

**Root cause** (verified in `apps/mobile/src/data/dashboardRepo.ts:166-184`): The synthetic data seeder assigns many merchants to the real DB category `Other` (slug `misc`, color textMuted, emoji 📌). On top of that, the dashboard's `getCategoryBreakdown` returns top-5 categories + a synthesised "Other" aggregator bucket for the remainder. Both buckets render with name "Other" + emoji 📌 — visually indistinguishable.

**Fix:**
1. Rename the synthetic aggregator slice to `"All others"` / `"Rest"` to differentiate from the real "Other" category
2. OR exclude the real "Other" category from the top-5 set so it always falls into the aggregator (clean dedup)

**Effort:** ~30 min.

---

### 🚨 V-P0-2 — EmojiPicker undiscoverable scroll (HIGH IMPACT)

**Evidence:** walk-17, walk-18 (`/tmp/walk-17-cat-edit.jpg`, `/tmp/walk-18-picker-scroll.jpg`)

Category editor's EmojiPicker is a horizontal ScrollView. Only 7 of 30 emojis visible at once. To find a specific category emoji the user must blind-scroll through ~5 pages worth. Worse:
- **No visible "selected" indicator** for the currently-set emoji — when editing "Gifts" with emoji 🎁, no border/highlight is visible in initial state (🎁 is scrolled off screen).
- No "scroll-to-selected" on open.
- No grouping/labels (food / transport / bills / etc).

Confirms the earlier static P1-1 finding from `.planning/perf-audit-2026-05-26.md`.

**Fix (one of):**
1. Convert to wrap-grid layout (`flexWrap: 'wrap'`) — all 30 fit on one screen at 44pt × 5 cols × 6 rows
2. Add `scrollToIndex` on open to center selected emoji
3. Group emojis (Food, Transport, Bills, Lifestyle, Income, Misc) with section headers

**Effort:** ~30min (grid swap).

---

### 🟡 V-P1 polish findings

| # | Where | Issue | Fix |
|---|-------|-------|-----|
| V21 | Transaction Detail | White header bar (`Stack header`) mismatches sand bg | Override `headerStyle: { backgroundColor: 'transparent' }` in route options |
| V22 | Transaction Detail | DATE field shows raw ISO `2026-05-26` | Format via `Intl.DateTimeFormat(language === 'uk' ? 'uk-UA' : 'en-IE')` |
| V23 | Transaction Detail | AMOUNT field "242.48" no currency symbol | Add `€` prefix in input OR a currency badge |
| V27 | Transaction Detail | No Delete affordance (only Save) | Add Delete row at bottom (red text style) for explicit destructive action |
| V48 | Jar create sheet | TARGET AMOUNT no currency context | Same as V23 |
| V56 | Chat empty | Suggestion pill tap = no visible reaction | Wire pill → send via `useChatStore.sendPrompt(prompt)` + show optimistic user bubble |
| V57 | Chat empty | No visible text input row | Render `ChatInputRow` in empty state above tab bar — pill is shortcut, input is fallback |
| V58 | Chat empty | E5 parametrised prompt: "How much on **other** last month?" | If top category resolves to `'other'` / `'misc'`, fall back to second-place category for the prompt (Transport in our sample) |
| V1-cutoff | Dashboard | Bottom category row partially behind floating tab bar | Increase ScrollView `contentContainerStyle.paddingBottom` by `TAB_BAR_HEIGHT + TAB_BAR_FLOATING_MARGIN + SPACING.md` (E2 commit `00d392d` was incomplete on Android — works on iOS) |

### 🔵 V-P2 minor polish

| # | Where | Issue | Fix |
|---|-------|-------|-----|
| V8 | Dashboard | Hairline under category row is only as wide as the color dot (~10pt), not full row | Make hairline full width below entire row content |
| V20 | Activity | Spotify shows category `Mobile` (alias) — confusing for "music streaming" mental model | Out of scope (data layer) — or rename Mobile → Mobile/Apps |
| V73 | Cat editor | COLOR swatches have no selected ring either | Match emoji picker fix — add rust ring on selected swatch |
| V77 | Cat editor | Title "Gifts" + input "Gifts" — redundant | Drop title; show only label "Edit category" |
| V4 | Dashboard | Hero subline reads "X more than April 2026" — "more" reads negative | Soften to "X above April 2026" |
| V40-vert | Jars empty | Empty card not perfectly vertically centered | Adjust container `justifyContent: 'center'` or add top padding |

---

## FUNCTIONAL FINDINGS

| # | Where | Bug | Severity |
|---|-------|-----|----------|
| F1 | Dashboard | Double "Other" row breakdown (see V-P0-1) | P0 |
| F2 | Cat editor | EmojiPicker no visible selected state — `selectedEmoji === emoji` compare may fail on Unicode normalization OR is below fold (see V-P0-2) | P0 |
| F3 | Chat | Suggestion pill tap = no UI response. Either `onPress` not wired, or send fails silently (preview build has no `SUPABASE_URL`/`ANTHROPIC_API_KEY` in env — but error banner should appear) | P1 |
| F4 | Chat empty | No fallback input row — user with no suggestion fit has no way to type a custom question | P1 |
| F5 | Sample data | Synthetic generator assigns ~67% of spend to "Other" (€51K of €76K) — unrealistic for portfolio demo; reviewers see a sea of "Other" rows | P1 (UX) |
| F6 | Activity | Apple Store / Епіцентр get bucketed to "Other" instead of Electronics / Shopping — synthetic MCC mapping is too narrow | P2 (sample data tuning) |

---

## ✅ WHAT WORKS WELL

### Premium aesthetic holds
- Slate&Sand palette consistent across all screens
- Oswald display + EB Garamond editorial + Manrope UI — type hierarchy respected
- Glass tab bar floats correctly at bottom, only on chrome (not content)
- EB Garamond italic for "yesterday in money" caption, sample data subtitles, chat — editorial voice consistent

### Emoji refactor
- All 30 canonical emojis render cleanly on Android Noto Color Emoji
- Badge tint (BADGE_BG_ALPHA) doesn't fight emoji color — backdrops feel intentional
- Vertical alignment in 40pt badges is good (lineHeight 24 buffer prevents clipping)
- No null/undefined emoji renders observed (fallback to 📌 works)
- Categories list, recategorize sheet, activity list all consistent

### Navigation + state
- 4-tab bottom nav works (Overview/Activity/Jars/Chat)
- Back gestures + back arrows work
- Bottom sheets snap, dismiss, restore content
- Sample data persists across tab switches (op-sqlite working)

### Design system
- All Pressables have 44pt+ tap targets (verified via earlier static audit)
- Section eyebrows in sage uppercase across Settings, Categories
- Hairline dividers consistent
- Active tab indicator (rust fill) clear

### Functional
- Cold start to interactive ~2-3s on emulator
- Onboarding 90-second flow lands on dashboard correctly
- Currency-locale mix (UAH for Ukrainian merchants, € for Irish) works
- Sticky date headers in transaction list (FlashList)

---

## 🔴 STATIC FINDINGS (pre-confirmed, re-confirmed on device)

From `.planning/perf-audit-2026-05-26.md`:
- **P0-1 Biometric infinite loop** — NOT tested on device (biometric was off in this run)
- **P0-2 Donut first-frame budget unmeasured** — visually < 100ms looked smooth on emu
- **P1 Dashboard double-query monthly total** — couldn't observe at runtime, code-confirmed
- **P1 ChatMessageList unvirtualized** — N/A here (empty chat)
- **P1 Victory Native bundled but unused** — confirmed (no import in app)
- **P1 PostHog bundled but unused** — confirmed (no `initObservability` calls posthog)

---

## RECOMMENDED FIX ORDER (concrete next sprint)

| # | P | Item | Effort |
|---|---|------|--------|
| 1 | P0 | Dedup "Other" — rename aggregator bucket OR exclude real Other category | 30min |
| 2 | P0 | EmojiPicker → grid layout (flexWrap, 5×6) + scroll-to-selected + visible selected ring | 1h |
| 3 | P1 | Synthetic generator MCC tuning — narrow "Other" to <15% of spend | 1h |
| 4 | P1 | Chat suggestion pill → wire to `sendPrompt()` + show optimistic bubble + error banner | 1h |
| 5 | P1 | Chat empty state: render `ChatInputRow` always (move out of conversation branch) | 30min |
| 6 | P1 | Transaction Detail: localize DATE + add currency to AMOUNT + transparent header | 1h |
| 7 | P1 | Jar create: add currency context to TARGET AMOUNT | 15min |
| 8 | P1 | E5 parametrised prompt: skip 'misc'/'other' when picking top category | 15min |
| 9 | P1 | Dashboard: bump bottom padding to clear tab bar on Android (E2 follow-up) | 15min |
| 10 | P0 (existing) | Biometric retry cap + fallback | 2h |
| 11 | P0 (existing) | DonutChart first-frame Sentry instrumentation | 1h |
| 12 | P1 (existing) | Drop unused `victory-native` + `posthog-react-native` | 15min |
| 13 | P1 (existing) | TanStack-Query monthly total | 1.5h |
| 14 | P1 (existing) | ChatMessageList → FlashList | 2h |
| 15 | P1 (existing) | TransactionRow swipe state reset on row identity change | 1h |
| 16 | P1 (existing) | RecategorizeBottomSheet ScrollView a11yLabel | 5min |

**Total for new P0+P1 (#1-9):** ~5.5h
**Combined with existing perf-audit P0+P1:** ~13h (1.5 days focused work)

---

## NOT COVERED (deferred)

- **iOS smoke test** — only Android emulator. iOS native render may differ (different emoji font, different glass behavior, different safe-area)
- **Runtime profiling** — perf SLOs unverified (donut <100ms, cold start <2s, 5000 tx @ 60fps)
- **Ukrainian locale walk** — language toggle visible but didn't tap through screens in `uk-UA`
- **Real chat round-trip** — would require Supabase env vars in preview build (intentionally absent)
- **Long-session memory** — no stress test
- **VoiceOver / TalkBack a11y interaction** — static labels checked, but live screen-reader flow not exercised
- **Onboarding paths besides synthetic** — manual / monobank / CSV not walked
- **Deep links** — `?category=X` filter deep link not tested

---

## INFRA NOTE — Metro ↔ dev-launcher bundle bug

For documentation: spent ~1h trying to smoke-test via the dev-client APK + Metro bundler (`expo start --dev-client`). All 4 Metro configurations (default, no-bytecode env, `--no-dev --minify`, port variants) produced the same `unexpected end of stream on http://localhost:NNNN/...` error on the dev-launcher's bundle fetch. Root cause not isolated (likely Expo SDK 54 + Hermes bytecode-vs-text mismatch in dev-client 6.0.21). **Workaround used:** EAS preview build (self-contained APK, no Metro dependency) — works perfectly. This bug doesn't affect production users (only local dev iteration). Worth filing a separate ticket if it persists into SDK 55.

---

## Screenshots captured

- `/tmp/walk-01-launch.jpg` — Welcome
- `/tmp/walk-02-after-en.jpg` — Data source pick
- `/tmp/walk-03-after-sample.jpg` — Dashboard top (hero band visible)
- `/tmp/walk-04-dashboard-scroll.jpg` — Dashboard with category breakdown
- `/tmp/walk-05-activity.jpg` — Activity tab with filters + transactions
- `/tmp/walk-06-tx-detail.jpg` — Transaction detail
- `/tmp/walk-07-recategorize.jpg` — Recategorize bottom sheet
- `/tmp/walk-08-jars.jpg` — Jars empty state
- `/tmp/walk-09-jar-new.jpg` — New Jar bottom sheet
- `/tmp/walk-11-chat.jpg` — Chat empty state
- `/tmp/walk-13b-dashboard-top.jpg` — Dashboard scrolled to top (gear visible)
- `/tmp/walk-14-settings.jpg` — Settings full
- `/tmp/walk-15-categories.jpg` — Categories list (default)
- `/tmp/walk-16-cat-scroll.jpg` — Categories scrolled (Custom section visible)
- `/tmp/walk-17-cat-edit.jpg` — Category editor (Gifts)
- `/tmp/walk-18-picker-scroll.jpg` — EmojiPicker scrolled

---

*Smoke walk completed 2026-05-26 16:15 GMT+1 on EAS preview build `5609d790` against HEAD `6fded76`.*
