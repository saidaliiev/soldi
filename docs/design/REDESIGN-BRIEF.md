# SOLDI — Redesign Brief for Claude Design

> **Status:** Sprint C (HTML structural alignment) shipped to `main` on 2026-05-24.
> Tab bar restructured 5 → 4 destinations. Chat promoted to first-class tab.
> Verified end-to-end on Android emulator (AVD `soldify`, port 5556, Android 15).
> **Live commits on origin/main:** `8afcf53 → 07532b2` (4 commits this sprint).

---

## 0. What this brief is

A complete handoff for Claude Design to (a) review the current visual state, (b) propose the **polish layer** that closes the gap to `docs/design/soldify-screens.html`, and (c) flag any tokens / motion / typography decisions that should be re-examined before final ship.

Six fresh screenshots from the live dev-client build are at `docs/design/screenshots/01-06`. The HTML design contract is at `docs/design/soldify-screens.html` (485 lines, sections §1–§9). Both files now live on `main`.

You will:

1. Read this brief.
2. Open the 6 screenshots side-by-side with their HTML §N counterpart.
3. Return a **prioritized polish plan** — see "What we need from you" (§7) for the exact deliverable shape.

---

## 1. Product context (compressed)

- **App:** SOLDI — premium iOS-first personal finance manager for Ireland / EU.
- **Stack:** Expo SDK 54 + React Native 0.81 + TypeScript strict + expo-router v6. Tokens-only design system at `apps/mobile/src/design/tokens.ts`. No NativeWind, no inline hex.
- **Palette:** Slate & Sand (warm slate `#EDEAE3` background, sandstone accent `#9C5B41`, sage positive `#687653` / `#586A45`). WCAG AA hard-floored. Gender-neutral relock from Oat & Ink (rejected as "women-only").
- **Typography:** Oswald (display / hero), EB Garamond (editorial / chat / lead), Manrope (UI labels / tabular). Mixing rules enforced via `TYPE.*` presets in `apps/mobile/src/design/typography.ts`. Banned: emoji as UI, inline hex, glass-on-content, neon gradients, fintech blue.
- **Glass:** iOS 26 Liquid Glass only on system chrome (tab bar, sheet backgrounds). Mandatory non-glass fallback for iOS<26 and Android. Direct `expo-glass-effect` import is banned outside `src/design/glass.ts`.
- **Motion:** governed via `src/design/motion.ts` + `useMotion` worklet boundary. reduce-motion respected. No ad-hoc `withTiming` literals in components.
- **Solo dev, portfolio piece.** Ship target: Phase 5 TestFlight beta closed; redesign waves W1–W6 code-complete (chrome → dashboard → transactions → chat → cat/jars/sheet-motion → onboarding/settings). Currently auditing for App Store submit.

---

## 2. What just shipped (Sprint C — HTML §2 structural)

Pushed to `origin/main` 2026-05-24:

| Commit | Subject | Effect |
|---|---|---|
| `7966a95` | feat(i18n): rename Transactions tab label to Activity | Tab text only, route key unchanged → deep links preserved |
| `b4991a5` | refactor(tabs): move Categories out of tab bar → /categories sub-route | Categories now lives at root `/categories`, reachable from Settings → "Manage categories". Card-presentation modal style. |
| `07532b2` | feat(chat): promote Chat from FAB+sheet to first-class tab | New `ChatIcon` (Skia Canvas hand-drawn speech bubble), new `ChatScreen` (full-screen surface reusing chat feature primitives), new `(tabs)/chat.tsx` route, `GlassTabBar` ICONS allow-list extended. |
| `8afcf53` | refactor(cleanup): purge Expo starter template leak | 13 stray Expo template files removed (Sprint A). |

Plus 2 earlier commits same day:
- `ff48ab2` fix(glass): iOS-26 runtime gate for `expo-glass-effect` (defensive fix for TF#8 EXC_BAD_ACCESS crash; lazy-requires native binding only when `Platform.OS === 'ios' && parseIOSMajor(Platform.Version) >= 26`).
- `0ce0ae5` fix(eas): disable Sentry auto-upload on Android preview profile.

**Tab bar before:** Overview · Activity · Categories · Jars · Explore (5)
**Tab bar after:** Overview · Activity · Jars · Chat (4) — matches HTML §2 1:1

---

## 3. Current visual state (screenshots)

All captured fresh on dedicated emulator `emulator-5556` (AVD `soldify`, Pixel 7 profile, Android 15 / API 35, 1080×2400). Source: `docs/design/screenshots/`.

| # | File | Surface | HTML reference |
|---|---|---|---|
| 01 | `01-welcome.png` | Onboarding Welcome — concentric View donut hero + Oswald 46pt "Money, slower." + Garamond 19pt lead + language tiles + 3-dot page indicator | §1 (Welcome) |
| 02 | `02-onboard-source.png` | Data source picker — 4 cards (Try with sample data / Add manually / monobank / Import CSV) with sandstone icon-badges | §1 (continued) |
| 03 | `03-dashboard.png` | Main Overview tab — €81,726.88 May 2026 hero, donut total, "yesterday in money" trend card, category breakdown rows, 4-tab bar at bottom | §3 (Overview / Dashboard) |
| 04 | `04-chat-tab.png` | Chat tab — book-empty-state icon + 3 prompt suggestion pills + 4-tab bar with Chat selected (accent state) | §7 (Chat) |
| 05 | `05-settings.png` | Settings — in-body back row, Oswald 30pt title, 5 sections (SECURITY / LANGUAGE / NOTIFICATIONS / DATA / CATEGORIES), 4 grouped cards | §8 (Settings) |
| 06 | `06-categories.png` | Categories sub-route reached via Settings → Manage categories — 13 default categories, icon-badge rows, chevrons, full-width hairlines | §5-ish (Categories editor) |

---

## 4. What works (don't touch)

These match HTML §2 / §3 / §8 within accepted-drift envelope. Confirm in your review, but **don't propose changes here unless you find a regression**:

- ✅ **4-tab bar geometry & icons** — verified via a11y tree: `Overview` `[42,2190][291,2337]`, `Activity` `[291..540]`, `Jars` `[540..789]`, `Chat` `[789..1038]`. No Explore. No Categories tab.
- ✅ **Welcome onboarding** — Slate & Sand palette, concentric mark, Oswald hero, Garamond lead. Pixel-aligned with HTML §1.
- ✅ **Dashboard hero typography** — Oswald `€81,726.88` 56pt, donut total, "yesterday in money" trend block. Sample-data path produces realistic 90-day spend.
- ✅ **Settings layout** — Oswald 30pt title, in-body back row (no Stack header), 4 uppercase moss-text section labels with letter-spacing 1.2px, 4 grouped surface cards with `SHADOWS.card`. Categories row appears at bottom — chevron-led navigation to `/categories`.
- ✅ **Categories list** — icon-badges per category (warm-tinted to category color), full-width hairlines, chevrons, top-right `+` add button.
- ✅ **Glass fallback** — Android renders solid `SHADOWS.card` on tab bar / sheet backgrounds without crashing. Proves `getGlassEffect()` iOS-26-gated path correctly bypasses native binding on non-26 platforms.
- ✅ **Tokens-only contract** — zero raw hex in W1–W6 source files (verified via grep + gate).

---

## 5. Issues discovered during verify (DECIDE)

### 5.1 Chat tab — i18n keys render raw 🔴 BLOCKER

**Screenshot 04 evidence:** Chat tab shows literal strings `sheet_title`, `empty_phrase`, `empty_subphrase`, `prompt_groceries_last_month`, `prompt_compare_months`, `prompt_top_merchants` instead of translated copy.

**Root cause:** `t('chat:sheet_title')` uses `:` as namespace separator (i18next default `nsSeparator`). Resources are bundled under a single `translation` namespace with `chat` as a nested key (`translation.chat.sheet_title`). When the namespace `chat` is not registered, i18next falls back to the key name (with the namespace prefix stripped, which is why screenshots show `sheet_title` not `chat:sheet_title`).

**Why this was masked until now:** Chat was previously only inside `ChatBottomSheet` (sheet UI), which is rarely opened during smoke tests. The Chat tab promotion (commit `07532b2`) made the failure mode unmissable.

**Fix options (need Claude Design to pick one):**

| Option | Effort | Pro | Con |
|---|---|---|---|
| **A. Register `chat` (+ `dashboard`, `categories`, `transactions`, `ai`, `jars`, `settings`) as separate namespaces** | Medium — touch `index.ts` `resources` shape + `init({ ns: [...] })` | Clean separation. Standard i18next pattern. Lazy-load per surface possible later. | Touches every `useTranslation()` consumer? No — `t('chat:key')` already uses correct ns syntax; only the resource shape changes. Tests need re-asserting. |
| **B. Change all call sites from `t('chat:key')` → `t('chat.key')`** (dot keySeparator already default) | Low — mechanical regex across components | No i18next config touch. | Hides the namespace structure. Wave 4 already shipped using `:`. Cosmetic-only fix. |

**Recommendation:** Option A — proper namespacing. Wave 4 plan implicitly assumed namespaces existed; this is closing the contract debt.

---

### 5.2 Chat tab icon — speech bubble OR refresh-loop? 🟡

**Screenshot 04 evidence:** Chat tab icon renders as an arc / C-shape. The C3 commit message describes it as a "Skia Canvas speech bubble".

**Question:** Is the rendered arc the *intended* hand-drawn speech bubble (matching D-21 aesthetic — minimalist), or a Skia path bug? HTML §7 reference image shows a more recognizable bubble outline with the tail.

**File:** `apps/mobile/src/design/icons/ChatIcon.tsx` (new in C3).

**Ask:** Review against HTML §2 row 4 tab-bar icon and D-21 hand-drawn convention. Recommend either (a) keep as minimalist arc with rationale, or (b) extend the Skia path to include a clearer bubble silhouette + tail. If (b), provide the path commands or an SVG to convert.

---

### 5.3 Overview Settings gear — tap dispatch issue 🟡

**Behaviour:** `Open settings` a11y button exists at bounds `[923,21][1038,137]` (top-right of Overview header) but `adb shell input tap` does not navigate. Only the deep link `soldi:///settings` reaches the screen.

**Hypothesis 1 — pre-existing:** The gear is rendered behind / inside the system-chrome status bar overlay area (Y < 137 ≈ status bar height region) and the Pressable hit-target is shadowed by the system insets.

**Hypothesis 2 — W2 motion gating:** Dashboard FAB scroll-reveal (D-05 / W2) may include the gear and require initial scroll position to be `> 0` before the Pressable becomes hit-testable.

**Ask:** Review `apps/mobile/src/features/dashboard/` Dashboard header rendering — is the gear inside a `SafeAreaView` with the correct insets? Should the hit-target extend down (e.g. `hitSlop`) so finger taps anywhere in the top-right corner register?

Not blocking ship — users can reach Settings from any other entry (we have a sign-out / preferences row planned per HTML §8 deferred list).

---

### 5.4 Deferred from STATUS CHECKPOINT (carry into your plan)

These were already on the post-verify backlog and are explicitly in scope for this brief:

- 🟡 **Activity filter pills per HTML §3** — current segmented control (chips model) is accepted-drift from W3; HTML reference shows pill row above transaction list with sandstone selected + sage idle. See W3-DEVICE-UAT.md "Accepted design-sync drift" section.
- 🟡 **Sign-out + sections per HTML §8** — Settings currently has 5 sections (Security, Language, Notifications, Data, Categories). HTML §8 calls for 2 (Account, App). Plus there is no Sign-out row (we are offline-first, no real auth — but a "Reset app data" row would map cleanly).
- 🟡 **Dashboard gear visibility + motion** — see 5.3 above; also HTML §3 shows gear with a subtle entrance animation tied to scroll.
- 🟡 **ChatScreen header polish** — HTML §7 shows mint FAB inline with header + "● online" pill. ChatScreen currently has no header beyond `t('chat:sheet_title')` (which itself is broken — see 5.1).
- 🟡 **Chat empty-state copy** — once 5.1 is fixed, review the empty-state phrasing for tone (currently English `Ask anything about your spending.` / `Try one of these`). HTML §7 voice may want a softer / more editorial register that matches the EB Garamond bubbles.

---

## 6. Design contract — quick reference

Embed only the constants Claude Design needs to validate the screenshots without grepping. Full source: `apps/mobile/src/design/tokens.ts`, `typography.ts`, `motion.ts`, `glass.ts`.

### 6.1 Colors (Slate & Sand, WCAG-floored)

```
background    #EDEAE3   warm slate, app shell
surface       #F7F5F0   card surface
white         #FFFFFF

textPrimary   #221F1B   deep warm slate (any TYPE)
textSecondary #6A645A   4.88:1 on background — text-safe
textMuted     #6E695F   4.54:1 on background — text-safe (hard AA floor)

accent        #9C5B41   sandstone primary CTA, selected, expense
                        4.38:1 — graphic + large-text-only (≥24px reg / ≥18.66px bold)
accentSoft    #B97A5A   decorative gradient pair, no text
accentDeep    #7C4632   pressed state, 6.29:1 — text-safe

sage          #687653   positive / savings — graphic-only (4.06:1)
sageDark      #586A45   text-safe positive variant (4.91:1)
sageSoft      #(see tokens.ts)
moss          (see tokens.ts) — section labels in Settings
```

### 6.2 Typography (presets — never raw)

```
TYPE.hero          Oswald 56pt   dashboard total, monthly hero
TYPE.displayLg     Oswald 46pt   Welcome headline
TYPE.displayMd     Oswald 30pt   Settings title, Categories title
TYPE.editorialLead EB Garamond 19pt   onboarding lead
TYPE.editorialBody EB Garamond 17pt   chat bubbles, insights
TYPE.uiTitle       Manrope 18pt bold  card titles
TYPE.uiBody        Manrope 16pt
TYPE.uiLabel       Manrope 14pt
TYPE.uiMeta        Manrope 12pt
TYPE.tabular       Manrope tabular-figures   amounts in transaction list
```

### 6.3 Spacing scale

```
SPACING.xs  4
SPACING.sm  8
SPACING.md  16
SPACING.lg  24
SPACING.xl  32
```

### 6.4 Banned (will block PR)

- Any raw hex in components (inline `style={{ color: '#XYZ' }}`).
- Emoji as UI (use SVG / Skia).
- Glass on content surfaces (lists, cards, chat bubbles).
- `expo-glass-effect` direct import outside `src/design/glass.ts`.
- Tailwind / NativeWind.
- `Animated.timing` / `withTiming` literals in components — use `useMotion` boundary.
- Fintech blue `#1A73E8` `#2563EB`, AI-slop blue `#667EEA`, AI-slop purple `#8B7AB8`, lavender `#E8E0FF`, bright green `#10B981` (use `sage`).

---

## 7. What we need from you (Claude Design)

Return ONE markdown reply with these sections in this order. Keep it tight — bullets over prose. We will turn each item into a planned plan in `docs/superpowers/plans/`.

### 7.1 Verdict per screenshot
For each of `01-welcome.png` through `06-categories.png`:
- **Status:** ✅ matches HTML / ⚠️ accepted-drift / 🔴 needs polish
- **Reasoning:** one sentence anchored in `soldify-screens.html` §N lines.
- **Action:** if not ✅, the exact change (component + token reference, not freeform CSS).

### 7.2 Decisions
Pick one for each. Justify in one sentence.

- **D1.** Issue 5.1 chat i18n — option A (separate namespaces) or option B (rewrite call sites)?
- **D2.** Issue 5.2 Chat icon — keep minimalist arc or extend bubble path? If extend, paste the SVG/path commands.
- **D3.** Issue 5.3 Settings gear — extend hit-target with `hitSlop`, fix safe-area insets, or change entrance to be always-visible (drop scroll-reveal gating)?
- **D4.** Activity filter pills — replace chips with HTML §3 pill row now or accept drift for v1.0?
- **D5.** Settings 5 sections vs HTML §8's 2 — consolidate to 2 (Account, App) or keep 5 and update HTML reference?
- **D6.** Add "Reset app data" row to Settings (replaces Sign-out for offline-first)? Y / N.
- **D7.** ChatScreen header — port HTML §7 (mint inline FAB + online pill) or omit for v1.0?

### 7.3 Polish plan (ordered)

1. … (highest impact first)
2. …
3. …

Each entry: `P0/P1/P2 — <surface> — <one-line change> — <component path>`.

### 7.4 Out-of-scope flags

Anything in `soldify-screens.html` you think we should **drop from v1.0** because cost outweighs portfolio value. Be ruthless — we are solo dev shipping in ~3 weeks.

---

## 8. Constraints (non-negotiable)

- No raw hex. No emoji. No glass-on-content. No Tailwind. No backwards-compat shims.
- All copy must land in `apps/mobile/src/i18n/locales/{en,uk}/<ns>.json` — never inline.
- All motion must route through `useMotion` + `MOTION.<preset>`.
- All glass surfaces must go via `glass.ts` `resolveTabBarChrome()` / `resolveSheetChrome()`.
- Atomic conventional commits. One commit per logical change.
- Before any "done" claim: `cd apps/mobile && npx tsc --noEmit && npx expo lint` + 217 tests green + emulator UAT screenshot.

---

## 9. How we will run the cycle

1. You (Claude Design) reply with §7.1–§7.4.
2. I review, push back if anything misreads the constraints.
3. We turn the polish plan into `superpowers:writing-plans` → atomic Sprint D commits.
4. Each Sprint D commit verified on `emulator-5556` (dedicated AVD, separate from parallel work on `emulator-5554`).
5. When all P0/P1 land: TestFlight #10 + emulator UAT pass → milestone close.

---

## Appendix A — Files / paths Claude Design may want to read

| Purpose | Path |
|---|---|
| Design contract (single source of truth) | `apps/mobile/src/design/tokens.ts` |
| Type presets | `apps/mobile/src/design/typography.ts` |
| Motion vocabulary | `apps/mobile/src/design/motion.ts` |
| Glass primitives | `apps/mobile/src/design/glass.ts` |
| Tab bar | `apps/mobile/src/components/GlassTabBar.tsx` |
| Tab layout | `apps/mobile/app/(tabs)/_layout.tsx` |
| New chat route | `apps/mobile/app/(tabs)/chat.tsx` |
| Chat screen | `apps/mobile/src/features/chat/ChatScreen.tsx` |
| Chat empty state | `apps/mobile/src/features/chat/ChatEmptyState.tsx` |
| Settings | `apps/mobile/app/settings.tsx` |
| Categories sub-route | `apps/mobile/app/categories.tsx` |
| Welcome onboarding | `apps/mobile/app/(onboarding)/welcome.tsx` |
| Chat icon (Skia) | `apps/mobile/src/design/icons/ChatIcon.tsx` |
| en chat strings | `apps/mobile/src/i18n/locales/en/chat.json` |
| uk chat strings | `apps/mobile/src/i18n/locales/uk/chat.json` |
| HTML design contract | `docs/design/soldify-screens.html` |
| Wave UAT reports (already shipped) | `.planning/phases/redesign/W{1..6}-DEVICE-UAT.md` |
| Project state | `.planning/STATE.md` |
| Global rules | `CLAUDE.md` |

---

## Appendix B — Git state snapshot

```
origin/main: 07532b2  (pushed 2026-05-24 ~17:50 GMT+1)

Sprint C commits (HTML §2 structural alignment):
  07532b2  feat(chat): promote Chat from FAB+sheet to first-class tab
  b4991a5  refactor(tabs): move Categories out of tab bar → /categories sub-route
  7966a95  feat(i18n): rename Transactions tab label to Activity
  8afcf53  refactor(cleanup): purge Expo starter template leak

Same-day fixes pushed alongside:
  ff48ab2  fix(glass): iOS-26 runtime gate for expo-glass-effect
  447cc4b  chore(repo): add mobile-mcp WSL bridge to Windows adb server
  f205635  docs(state): TF#8 EXC_BAD_ACCESS triage + glass iOS-26 gate
  0ce0ae5  fix(eas): disable Sentry auto-upload on Android preview profile

Gates green: tsc 0 / expo lint 0 / jest 217 / expo export 0.
```

---

*End of brief.*
