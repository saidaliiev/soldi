# D-Series Visual UAT — Android emulator-5556

> Captured 2026-05-25 ~11:35 GMT+1. Device: sdk_gphone64_x86_64 (Android 15, 1080×2400 @ 420dpi).
> Build: dev-client APK installed 2026-05-24 18:34 (Sprint A/B/C era APK), JS hot-loaded from Metro 8082.
> Bundle: `node_modules/expo-router/entry.js` (2612 modules), bundled in 1325ms.
> Screenshots: `docs/design/screenshots/D-series/`.

## Coverage matrix

| ID  | Commit    | Sprint slice                         | Verified | Notes |
| --- | --------- | ------------------------------------ | -------- | ----- |
| D1  | `fb7ea5a` | i18n `chat:` → `chat.` separator      | ✅ pass  | All chat strings resolve (`"Ask Soldify"`, suggestion pills) |
| D2  | `a3b4fb3` | ChatIcon asymmetric speech bubble    | ✅ pass  | Visible accent-deep when Chat tab active; resolution too low to confirm asymmetry — zoom check pending |
| D3  | `ff962e4` | Gear safe-area + larger hitSlop      | ⚠ partial | Gear icon renders in hero band top-right corner; tap-target not yet exercised |
| D4  | `055017c` | Dashboard hero band split + delta    | ⚠ partial | Hero band rendered correctly (gradient, month pill, Oswald split number, MoM delta subline) — **but adjacent donut center label wraps** (see Bug #1) |
| D5  | `ae1b984` | SourceTile onboarding icons          | ❌ not tested | Onboarding already complete on this emulator state; need fresh app data to re-trigger source picker |

## Bugs found

### Bug #1 — P0 — Activity tab infinite re-render loop

**Severity:** P0 — feature totally broken under repeated navigation
**File:** `apps/mobile/app/(tabs)/transactions.tsx:45`
**Symptom:** First mount renders once (screenshot 05 is the lucky-snapshot). Subsequent navigation back to this tab triggers `Maximum update depth exceeded` and the tab unmounts to a blank screen.

**Root cause:** Zustand selector returns a fresh object literal on every call. Without `useShallow` / `shallow` equality, `useSyncExternalStore` sees a new snapshot every commit → infinite re-render.

```tsx
// transactions.tsx:45 — BROKEN
const filterSnapshot = useFilterStore((s) => ({
  search: s.search,
  categoryIds: s.categoryIds,
  minCents: s.minCents,
  maxCents: s.maxCents,
  sign: s.sign,
  dateFromISO: s.dateFromISO,
  dateToISO: s.dateToISO,
}));
```

**Console:**
```
ERROR  The result of getSnapshot should be cached to avoid an infinite loop
ERROR  [Error: Maximum update depth exceeded.]
  at TransactionListScreen (transactions.tsx:88)
```

**Fix (one of):**
- `import { useShallow } from 'zustand/react/shallow';` → `useFilterStore(useShallow((s) => ({ ... })))`
- Or split into 7 individual primitive selectors (matches the setter selectors above)
- Or precompute the snapshot inside the store as a derived selector

### Bug #2 — P1 — Dashboard donut center label wraps mid-number

**Severity:** P1 — readability fail on the most important number in the app
**Surface:** Dashboard donut "Total" center label
**Symptom:** `€67,695.98` renders as `€67,695.9` / `8` — fraction digit `8` wraps to a second line.
**Cause:** Donut ring inner-container width too narrow for the current font + digit count, no `numberOfLines={1}` clamp, no `adjustsFontSizeToFit`.
**Fix:** Add `numberOfLines={1}` + `adjustsFontSizeToFit` or downsize the center-label preset; alternatively drop the fraction in the center (mantissa-only inside ring, full number is already in hero band above).

### Bug #3 — P1 — Tab-screen titles overlap status bar

**Severity:** P1 — affects every tab except Overview
**Surfaces:** Chat (`Ask Soldify`), Jars (`Jars`), Activity (`Transactions`)
**Symptom:** Oswald header sits at y≈0, status-bar time + icons overlay it.
**Cause:** Screens render in-body title without `SafeAreaView` top inset (or `Stack.Screen { headerShown: false }` removes the native header without compensating padding).
**Fix:** Wrap each tab's root in `react-native-safe-area-context` `<SafeAreaView edges={['top']}>` or add `paddingTop: insets.top + N` from `useSafeAreaInsets()`.
**Cross-ref:** D3 fix (`ff962e4`) added safe-area to Dashboard gear — same fix should be applied uniformly across Chat / Jars / Activity tabs. D-series rename only touched the tab label, not the per-screen header layout.

### Bug #4 — P2 — Activity tab title says "Transactions" not "Activity"

**Severity:** P2 — naming inconsistency (tab label says one thing, screen header another)
**Surfaces:** Activity tab body
**Symptom:** Tab bar label = "Activity" (rename `7966a95`), but `transactions.tsx:88` renders the in-body `<Text style={styles.title}>` with the legacy key.
**Cause:** Commit `7966a95` updated `i18n` for the tab label but missed the screen header copy + file rename.
**Fix:** Update the in-body title key to `transactions.activity_title` (or rename the file to `activity.tsx` if the route should also change; deep links from elsewhere may need patching).

## Workflow gotchas captured for future sessions

- **WSL2 + Windows ADB bridge:** `ADB_SERVER_SOCKET="tcp:$(ip route show default | awk '{print $3}'):5037"` is mandatory before any `adb` command; otherwise WSL spawns a local server that finds 0 devices.
- **Expo CLI port-conflict prompt is non-overridable when non-TTY:** if another project's Metro holds 8081, `npx expo start --port 8082` still prompts ("Use port 8082 instead?") and aborts. Workaround: pick any port OTHER than 8081 and 8082 (e.g. 8088) — the prompt only appears when the auto-fallback equals the requested port.
- **dev-client deep link must use WSL IP, not localhost:** the Windows ADB-server-mediated reverse forward does not bridge to WSL host. Launch with `exp+soldi://expo-development-client/?url=http%3A%2F%2F<WSL_IP>%3A8088`. WSL IP discoverable via `ip -4 addr show eth0`.
- **Metro manifest advertises 127.0.0.1 by default** — when dev-client follows that URL from the emulator it hits the emulator's own loopback, not the host. The launch-intent URL needs the WSL IP; expo handles the rest.

## Open items

1. **Fix Bug #1** (Activity tab re-render loop) before any further D-series UAT — it blocks regression testing of any cross-tab navigation.
2. **Fix Bug #2** (donut wrap) and **Bug #3** (safe-area on Chat/Jars/Activity) — both single-line component fixes.
3. **D5 verification** (onboarding source picker icons) requires wiping app data first: `adb shell pm clear app.soldi.mobile`.
4. **Push the 6 unpushed local commits** to `origin/main` once bugs above are addressed.
5. **Update `.planning/STATE.md`** with a D1-D5 closure entry — currently stale to May 16.
