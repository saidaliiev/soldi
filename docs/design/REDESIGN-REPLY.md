# Reply to Claude Design — Sprint C → D handoff

> Strong review. Plan is land-able. Greenlight 9 of 11 items as-is; 4 pushbacks below; final slice = 8 atomic commits. Anchored to verified code/HTML facts, not hopes.

---

## Verdict on the verdicts

### 01 Welcome — ⚠️ → mostly ✅, one fact-correction

You said the Garamond lead "reads as Manrope" on the screenshot. **Verified: it's actually bound correctly.** `welcome.tsx:191` spreads `...TYPE.editorialLead`, and `fonts.ts:112` registers `useGaramond({ EBGaramond_400Regular, EBGaramond_400Regular_Italic, EBGaramond_600SemiBold })`. Garamond IS loaded.

Most likely what you saw: small-print Garamond on Android low-DPI scaling reads thin/sans-ish, especially on the warm-slate background. We will spot-check on the dedicated AVD at 100% scale before changing anything. **No action.**

On the copy decision (D-canon below): HTML §1 line 123 literally says "Your money.<br>At peace.". Live i18n key `onboarding.welcome_title` resolves to "Money, slower.". Picking canonical = D-canon (new decision, see below).

### 02 Source picker — 🔴 ack

Agreed. Empty sandstone badges read as placeholders. Will render the 4 line icons (sparkles / pencil / link / arrow-down-tray) at 42×42 with `rgba(156,91,65,.12)` fill + `#9C5B41` stroke 1.7. **Greenlight P1.**

### 03 Dashboard — 🔴 ack, biggest scope

Agreed on all three points (double-rendered hero, stacked instead of side-by-side donut, "yesterday in money" inventory). Will port HTML §2 warm hero band literally — full-bleed gradient `168deg, #E6E1D4 → #D9D2C0`, 28px bottom radius, `margin-top: -54px`, month pill + 42×42 gear badge + accent-deep `−€2,418.60` Oswald 62pt with `.60` at 30pt.

Two execution notes for myself:
- **Net-new component:** `DashboardHero.tsx`. W2 hero kinetic (D-05 donut crossfade, count-up, FAB scroll-reveal) currently lives inside `Dashboard.tsx`; the split must preserve `useMotion` boundaries — no inline `withTiming` regressions.
- **`margin-top: -54px` bleed** interacts with the safe-area inset we are about to fix on the gear (D3 below). Order matters: ship gear fix first, then hero band, so we don't bleed under a hit-target we just enlarged.

**Greenlight P0, but slice as 2 commits** — see Sprint D slicing.

### 04 Chat — 🔴 ack on i18n; partial pushback on the icon plan

i18n: agreed, BLOCKER. Will port to true namespaces (D1).

Icon: **path geometry is sound but the file-touch list is wrong.** GlassTabBar doesn't carry a duplicate icon path — it reads from `ICONS` map → `ChatIcon` component. **Single file edit:** `apps/mobile/src/design/icons/tabs/ChatIcon.tsx`. GlassTabBar untouched.

Also one engineering risk on your proposed SVG path: `Skia.Path.MakeFromSVGString` supports `M / L / H / V / C / Z` reliably; the current bubble uses `Q` (quadratic Bezier) and that has worked, so your `C / H / V / L / Z` set is safe. Will prototype on emulator before committing. If the path renders crooked at 24×24 the way the current arc does, will pull it back from 5..19 range into 4..20 (full viewbox utilization) so the round-cap stroke doesn't crop edges.

**Greenlight P0** with single-file scope.

### 05 Settings — ⚠️ ack with one trim

Agreed: consolidate to 3 sections. Security · Preferences · Data, with "Manage categories" folded into Data. One trim: **drop "Reduce motion" toggle from Preferences.** `AccessibilityInfo.isReduceMotionEnabled()` reads the system-level value and motion.ts already respects it across all surfaces (`useMotion` returns reduce-motion-safe presets when system flag is on). Exposing an in-app override adds a settings row that fights the OS setting — confusing, and a fail point for App Store accessibility review.

Final Preferences contents: Language toggle + Daily spending digest toggle.

**Greenlight P1** with the trim.

### 06 Categories — ✅ ack

Row density tweak (64 → 56) is fine, drop into Sprint D as a one-line StyleSheet change. **Greenlight P2.**

---

## Decisions

| ID | Greenlight | Notes |
|---|---|---|
| D1 — i18n Option A (separate namespaces) | ✅ | `index.ts` `resources` reshape + `init({ ns: [...]})`. Per-namespace files already exist. Spot-test on chat tab + dashboard before pushing — if any consumer was relying on the broken `chat:` fallback, will surface during smoke. |
| D2 — Chat icon, extend path | ✅ with prototype gate | See §04 above. Path itself ok; verify Skia render at 24×24 before commit. |
| D3 — Settings gear: hitSlop + SafeAreaView + drop scroll-reveal gating | ✅ | Note: drop gating ONLY on the gear, keep on the FAB. Will verify gear becomes hit-testable at scroll position 0 on emulator. |
| D4 — Activity pills now | ✅ | One commit, isolated to `ActivityFilter.tsx`. |
| D5 — 3 sections, fold Categories into Data | ✅ with trim | Drop "Reduce motion" from Preferences — see §05 above. |
| D6 — Reset app data row | ✅ | Error-color label, confirmation sheet uses `TYPE.editorialBody` Garamond. Copy: keep yours verbatim — it's good. RU translation needed for `uk/settings.json`. |
| D7 — ChatScreen header port HTML §7 | ✅ | Inline 38×38 mint FAB + Oswald 20pt "Soldify" + moss-text "● online" pill, drop tab-bar header title. |

### One new decision Sprint D needs

**D-canon — onboarding Welcome copy.** HTML §1 literal = "Your money. At peace.". Live i18n = "Money, slower.". 

My take: keep **"Money, slower."** as live. It's stronger — implies the editorial thesis (slow-finance, calm) rather than a generic "peace" framing. Update HTML §1:123 to match. Need your ack before I rewrite the HTML.

---

## 7.4 cuts — all greenlit, with one specifier

| Cut | Status |
|---|---|
| HTML §4 bleed-through scrim → flat `rgba(34,31,27,.34)` | ✅ |
| HTML §4 per-tx AI quote → static category-context line | ✅ — and the data IS already in store (`useCategoryBreakdown(month)` selector). No new query. |
| HTML §5 2×2 card grid | ✅ — drop entirely |
| HTML §1 3-dot → 2-dot | ⚠️ **Verify first.** Onboarding actually has 3 gated steps: `welcome` → `data-source` → (`synthetic` / `manual` / `monobank` / `csv`) → optional `biometric`. So 3 dots is correct for the typical path. **Counter-proposal: keep 3 dots, but only show indicator when actual step > 0.** Welcome alone with 3 dots feels heavy. |
| Glass-on-input bar in composer | ✅ — solid `var(--surface)` + `SHADOWS.card`, no `backdrop-filter` |

---

## Sprint D slicing (8 atomic commits)

```
D1  P0  feat(i18n):     register chat/dashboard/categories/transactions/ai/jars/settings
                         as separate namespaces; ns: [...] init
                         touches index.ts only; resources files already in place
                         smoke: chat tab + dashboard render real strings on emulator-5556
                         tests: 217 still green

D2  P0  feat(icons):    new ChatIcon Skia path (D2 bubble + tail) — single file
                         apps/mobile/src/design/icons/tabs/ChatIcon.tsx
                         visual smoke on tab bar; no GlassTabBar change

D3  P0  fix(dashboard): gear hit-target + SafeAreaView + drop reveal gate on gear
                         apps/mobile/src/features/dashboard/DashboardHeader.tsx
                         must ship BEFORE D4 (hero bleed depends on stable gear)

D4  P0  feat(dashboard): port HTML §2 warm hero band + donut/sidebar composition
                         new DashboardHero.tsx + Dashboard.tsx compose
                         preserves W2 motion (count-up, donut crossfade)
                         biggest commit; expect ~6–8 file touches

D5  P1  feat(onboarding): line-icon glyphs in 4 source cards
                          apps/mobile/app/onboarding/data-source.tsx
                          + 4 new icon components in design/icons/onboarding/

D6  P1  feat(activity):  replace chip filter with HTML §3 pill row
                          apps/mobile/src/features/transactions/ActivityFilter.tsx

D7  P1  refactor(settings): consolidate to 3 sections + Reset app data + sheet
                             apps/mobile/app/settings.tsx
                             new ResetDataSheet.tsx
                             en/uk settings.json strings

D8  P1  feat(chat):      ChatScreen header port (HTML §7 inline FAB + online pill)
                          apps/mobile/src/features/chat/ChatScreen.tsx
                          drops tab-bar header title

P2 leftovers (P2-1, P2-2, P2-3 — bundle into one cleanup commit or defer)
   chat empty-state copy refresh once D1 unblocks
   categories row 64 → 56
   welcome 3-dot conditional render
```

**Order rationale:**
- D1 first because it unblocks D8 (ChatScreen header needs real strings).
- D2 (icon) before D4 (hero) because icon is single-file low-risk; clears one screen visually while hero is in flight.
- D3 (gear) before D4 (hero) because safe-area math interacts.
- D4 alone — biggest blast radius, isolate.
- D5–D8 parallel-safe; can ship in any order.

Estimated total: ~6 hours focused. Each commit verified on `emulator-5556` (dedicated AVD).

---

## Gates per commit (no exceptions)

1. `cd apps/mobile && npx tsc --noEmit` exits 0
2. `npx expo lint` exits 0
3. `bun test` 217+ green (D1 may legitimately add tests; absolute floor is "current count + any new tests, all green")
4. Screenshot on emulator-5556 captured + diff'd against the corresponding screenshot in `docs/design/screenshots/`
5. Conventional commit message, ≤50 char subject

---

## What I want from you before D1 fires

Three small returns, no narrative needed:

1. **D2 path sanity check:** does your proposed `M5 7.5 C5 6 6 5 7.5 5 H16.5 C18 5 19 6 19 7.5 V13.5 C19 15 18 16 16.5 16 H11 L7.5 19 V16 H7.5 C6 16 5 15 5 13.5 Z` render as a closed bubble with a tail at 24×24 in your head, or did you mean to use 4..20 viewbox utilization? Confirm or update.
2. **D-canon Welcome copy:** ack to keep "Money, slower." and update HTML §1.
3. **3-dot indicator counter-proposal:** ack to keep 3 dots but render only when step > 0.

Reply tight — 3 lines of YES/NO/UPDATED-PATH and I cut commits.

---

*End of reply.*
