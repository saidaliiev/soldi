---
phase: 04-jars-i18n-accessibility
reviewed: 2026-05-15T20:15:00Z
depth: standard
files_reviewed: 42
files_reviewed_list:
  - apps/mobile/app/(tabs)/_layout.tsx
  - apps/mobile/app/(tabs)/index.tsx
  - apps/mobile/app/(tabs)/jars.tsx
  - apps/mobile/app/_layout.tsx
  - apps/mobile/app/jars/[id].tsx
  - apps/mobile/app/settings.tsx
  - apps/mobile/package.json
  - apps/mobile/scripts/check-i18n-parity.mjs
  - apps/mobile/src/components/BottomSheet/BottomSheetPrimitive.tsx
  - apps/mobile/src/components/BottomSheet/ConfirmModal.tsx
  - apps/mobile/src/design/contrast.ts
  - apps/mobile/src/design/icons/jars/index.tsx
  - apps/mobile/src/design/icons/system/GearIcon.tsx
  - apps/mobile/src/design/icons/tabs/index.tsx
  - apps/mobile/src/design/tokens.ts
  - apps/mobile/src/features/dashboard/DonutChart.tsx
  - apps/mobile/src/features/dashboard/MonthlyTotalHero.tsx
  - apps/mobile/src/features/dashboard/Sparkline.tsx
  - apps/mobile/src/features/jars/JarCreateBottomSheet.tsx
  - apps/mobile/src/features/jars/JarDetailScreen.tsx
  - apps/mobile/src/features/jars/JarListScreen.tsx
  - apps/mobile/src/features/jars/JarRing.tsx
  - apps/mobile/src/features/jars/JarRow.tsx
  - apps/mobile/src/features/jars/jarRingGeometry.ts
  - apps/mobile/src/features/jars/jarStore.ts
  - apps/mobile/src/features/jars/jarsRepo.ts
  - apps/mobile/src/features/jars/roundUp.ts
  - apps/mobile/src/features/jars/sweepRepo.ts
  - apps/mobile/src/features/jars/types.ts
  - apps/mobile/src/features/settings/LanguageToggle.tsx
  - apps/mobile/src/features/settings/SettingsScreen.tsx
  - apps/mobile/src/features/transactions/TransactionRow.tsx
  - apps/mobile/src/i18n/locales/en/jars.json
  - apps/mobile/src/i18n/locales/en/settings.json
  - apps/mobile/src/i18n/locales/uk/ai.json
  - apps/mobile/src/i18n/locales/uk/chat.json
  - apps/mobile/src/i18n/locales/uk/dashboard.json
  - apps/mobile/src/i18n/locales/uk/jars.json
  - apps/mobile/src/i18n/locales/uk/settings.json
  - apps/mobile/src/lib/db/migrations.ts
  - apps/mobile/src/lib/db/schema.sql.ts
  - apps/mobile/src/lib/i18n/index.ts
findings:
  critical: 5
  warning: 7
  info: 4
  total: 16
status: fixed
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-15T20:15:00Z
**Depth:** standard
**Files Reviewed:** 42
**Status:** issues_found

## Summary

Phase 4 adds Goal Jars (DB migration v5, round-up sweep engine, Skia JarRing), runtime i18n EN↔UK switching, WCAG contrast remediation, and maxFontSizeMultiplier clamps. The data layer is architecturally sound — parameterised queries throughout, no PII logged, integer-cents math correct. The critical findings are concentrated in four areas: (1) a timestamp unit mismatch that causes the sweep engine to never find pending transactions after the first sweep, (2) a variable-shadowing bug that silently swallows the jar name in an error log, (3) SCHEMA_002 non-idempotency that crashes migration re-runs, (4) a WCAG AA body-text failure that is acknowledged in tokens.ts comments but left unresolved and misclassified in the audit table, and (5) the i18n parity script's PASS logic having a boolean-composition bug that can suppress failure output. Warnings cover the sweep being non-atomic (no SQLite transaction wrapping), the BottomSheetPrimitive using a stale `Dimensions.get` at module load time, unchecked `insertId` on jar create, and minor a11y gaps.

---

## Critical Issues

### CR-01: Sweep cutoff uses mixed timestamp units — sweep always no-ops after first run

**File:** `apps/mobile/src/features/jars/sweepRepo.ts:43-51` and `:100-103`

**Issue:** `lastSweepAt()` returns the value of `jar_contributions.created_at`, which `insertContribution()` stores as `now` — and `now` defaults to `Date.now()` (milliseconds since epoch, e.g. `1_747_338_000_000`). The sweep query at line 100 filters `created_at > ?` against the `transactions` table, where `created_at` is stored as Unix **seconds** (per `jarsRepo.createJar` line 36: `Math.floor(Date.now() / 1000)`). After the first successful sweep the cutoff is ~1.7 trillion; every transaction has a `created_at` in the low billions (Unix seconds), so `created_at > cutoff` matches nothing. The jar silently contributes €0 on every subsequent tap.

**Fix:**
```typescript
// sweepRepo.ts — insertContribution call, line 121
insertContribution(
  {
    jarId,
    amountCents: contributedCents,
    source: 'roundup',
    txId: null,
    createdAt: Math.floor(now / 1000),  // convert ms → seconds to match transactions.created_at
  },
  db,
);
```
Also update `lastSweepAt` doc-comment: "Returns Unix timestamp **seconds**."

---

### CR-02: Variable shadowing silently drops jar name from error log

**File:** `apps/mobile/src/features/jars/JarCreateBottomSheet.tsx:90`

**Issue:** Inside `handleSave`, the outer `name` state variable (line 46) is shadowed by a `const name = ...` declaration at line 90 inside the `catch` block. TypeScript does not error because both are `string`. The intended behaviour (log only `error.name`, never the jar name) is accidentally correct, but the shadowing means any future developer adding `console.error(name)` at component scope inside the catch will unknowingly log the jar name (PII risk). Additionally, the variable identifier `name` is a reserved identifier in some strict-mode contexts and creates reader confusion.

**Fix:**
```typescript
} catch (err) {
  const errName = err instanceof Error ? err.name : 'UnknownError';
  console.error('[JarCreateBottomSheet] save failed:', errName);
  setErrorKey('jars.error_save');
}
```

---

### CR-03: SCHEMA_002 is not idempotent — crashes migration re-run

**File:** `apps/mobile/src/lib/db/schema.sql.ts:112-134`

**Issue:** `ALTER TABLE categories ADD COLUMN slug TEXT` has no `IF NOT EXISTS` guard (SQLite does not support that syntax on `ALTER TABLE`). The migration header comment (lines 7-11) claims "SQL MUST be idempotent when wrapped with `CREATE TABLE IF NOT EXISTS`" but `ALTER TABLE` cannot be made idempotent that way. If `runMigrations()` is called when `PRAGMA user_version` is already 2 (e.g. re-entrant startup after a crash mid-migration), SQLite throws "duplicate column name: slug" and the catch in `_layout.tsx` sets `dbReady=true` anyway — silently unblocking the UI with an incomplete schema. `SCHEMA_005` (jars tables) uses `IF NOT EXISTS` correctly; `SCHEMA_002` and `SCHEMA_003` do not.

**Fix:** Wrap the `ALTER TABLE` statements in a guard procedure or use a `BEGIN … COMMIT` block with a schema-meta sentinel:
```sql
-- At start of SCHEMA_002 migration SQL:
INSERT OR IGNORE INTO schema_meta (key, value) VALUES ('migration_002_applied', '1');
-- Then check rowcount before ALTERs, or use the PRAGMA user_version gate
-- (runMigrations already does this — the real fix is ensuring runMigrations
-- never calls version 2 twice, which requires the PRAGMA update to be inside
-- the same transaction as the DDL so a crash mid-migration rolls back both).
```
The correct minimal fix is to wrap each migration's SQL in `BEGIN; … UPDATE PRAGMA user_version = N; COMMIT;` so a crash mid-migration leaves `user_version` unchanged and the migration is retried cleanly on next launch. As written, a mid-migration crash leaves the DB partially migrated but `user_version` still at the old value, causing the duplicate-column error on retry.

---

### CR-04: `sage` overFundedLabel fails WCAG AA body-text threshold — acknowledged but unresolved and misclassified

**File:** `apps/mobile/src/design/tokens.ts:33-37` and `apps/mobile/src/design/contrast.ts:136-143`

**Issue:** The `tokens.ts` comment at line 33 explicitly states: "overFundedLabel uses TYPE.uiLabel (14pt medium = body text, 4.5 required) on background — at 3.23:1 this still fails strict body threshold." The `contrast.ts` audit entry for `sage` (lines 136-143) classifies it at `requiredAA: 3.0` citing `§1.4.11 non-text contrast`, but the overFundedLabel in `JarRing.tsx:170` renders it as `TYPE.uiLabel` body text on `COLORS.background`, which requires 4.5:1 under §1.4.3. The audit `passes: true` at 3.23:1 is a false pass for that specific text usage. This is a shipped WCAG AA failure on a text element, not just a graphic element.

**Fix:** Add a dedicated `sageDark` token at ≥4.5:1 on `COLORS.background` (target ~`#5C6B4A`, approx 5.1:1) and use it for `overFundedLabel`. The ring arc itself can keep `sage` at 3.0.
```typescript
// tokens.ts
sageDark: '#5C6B4A',  // text-safe sage: ~5.1:1 on #F7F1E8

// JarRing.tsx overFundedLabel style:
overFundedLabel: {
  ...TYPE.uiLabel,
  color: COLORS.sageDark,   // was COLORS.sage (3.23:1 — fails 4.5 body threshold)
  ...
}
```

---

### CR-05: i18n parity script PASS-line logic is bugged — can print PASS for a failed namespace

**File:** `apps/mobile/scripts/check-i18n-parity.mjs:87-91`

**Issue:** The condition on line 87 reads:
```js
if (!failed || !results.some((r) => r.includes(`[${ns}]`))) {
```
`failed` is a module-level flag that becomes `true` on the **first** failure across **any** namespace. After the first namespace fails, `failed` is `true` for all subsequent iterations. For a subsequent namespace that itself passes, `!failed` is `false` but `!results.some(r => r.includes('[ns]'))` is `true` (no results yet for this ns), so the whole condition is `true` and a `PASS` line is emitted — correct for a passing namespace. However, if the first namespace fails AND a subsequent namespace also fails, `results.some(r => r.includes('[ns2]'))` is `true` (FAIL lines were just pushed), making the whole condition `false` — so no PASS or FAIL summary line is emitted for `ns2`. The FAIL lines are still in `results` so the overall exit code is correct, but the per-namespace PASS/FAIL summary line is silently dropped, making the output misleading.

The guard on line 89 (`else if (!results.some(r => r.startsWith('FAIL') && r.includes(...)))`) also suffers from the same `!failed` elision in the primary branch.

**Fix:** Track per-namespace failure with a local flag:
```js
for (const filename of enFiles) {
  let nsFailed = false;
  // ... replace all `failed = true` inside this loop with:
  nsFailed = true;
  failed = true;
  // ... at end of loop:
  if (!nsFailed) {
    results.push(`PASS [${ns}] ${enKeys.size} keys, placeholder parity OK`);
  }
}
```

---

## Warnings

### WR-01: Sweep is non-atomic — balance can be read between insert and query

**File:** `apps/mobile/src/features/jars/sweepRepo.ts:120-133`

**Issue:** `insertContribution()` and `jarBalanceCents()` are two separate `executeSync` calls with no wrapping SQLite transaction. On a device where another write hits the DB between these two calls (unlikely in solo-use but structurally incorrect), the returned `newBalanceCents` can reflect contributions from a concurrent write, not just the sweep. More critically, if the app is killed between the two calls, the contribution is recorded but `newBalanceCents` is never returned to the UI — the ring won't animate to the new value until the next focus refresh.

**Fix:** Wrap steps 6-7 in a single transaction using op-sqlite's `transaction()` API (or `BEGIN … COMMIT` via `executeSync`).

---

### WR-02: `createJar` returns `insertId ?? 0` — 0 is a valid failure sentinel but silently ignored

**File:** `apps/mobile/src/features/jars/jarsRepo.ts:42`

**Issue:** `result.insertId ?? 0` returns 0 when op-sqlite doesn't populate `insertId` (e.g. if the INSERT fails silently or the driver version doesn't set it). The caller in `JarCreateBottomSheet.handleSave` discards the return value entirely — but even if it used it, 0 would look like a valid (impossible) row id. If `insertId` is undefined/null after a failed insert, `onRefresh()` is still called, the list re-queries, and the jar silently doesn't appear.

**Fix:** Throw or set an error state when `insertId` is 0 or null:
```typescript
const id = result.insertId;
if (id == null || id === 0) throw new Error('InsertFailed');
return id;
```

---

### WR-03: `BottomSheetPrimitive` captures stale screen height at module load

**File:** `apps/mobile/src/components/BottomSheet/BottomSheetPrimitive.tsx:51`

**Issue:** `const SCREEN_HEIGHT = Dimensions.get('window').height` is computed once at module initialisation. On iPad with Split View / Slide Over, or when the orientation changes after the module is first loaded, `SCREEN_HEIGHT` is stale. `restingHeight` (computed from it at line 88) controls the sheet's snap point and close-animation target — using a stale value causes the sheet to animate to the wrong position, potentially leaving it partially visible or over-shooting offscreen.

**Fix:** Use `useWindowDimensions()` inside the component to get a reactive height:
```typescript
import { useWindowDimensions } from 'react-native';
// inside BottomSheetPrimitive:
const { height: screenHeight } = useWindowDimensions();
const restingHeight = screenHeight * parsePercent(snapPoints[0]);
```

---

### WR-04: `jarRingGeometry.ts` — `strokeWidth` parameter is accepted but unused (dead API surface)

**File:** `apps/mobile/src/features/jars/jarRingGeometry.ts:63-65`

**Issue:** `strokeWidth` is in the function signature but immediately voided (`void strokeWidth`). The arc center coordinates are computed using `cx = radius; cy = radius` — these are independent of stroke width. The caller in `JarRing.tsx` computes `radius = (size - STROKE_WIDTH) / 2` and passes `STROKE_WIDTH` as the third argument, expecting the geometry function to account for it. The actual canvas is sized `{ width: size, height: size }` but the arc's center is at `(radius, radius)` not `(size/2, size/2)` — these only coincide when stroke width is zero. At STROKE_WIDTH=12 on a 160pt canvas: `radius = (160-12)/2 = 74`, so center is at `(74,74)` but the canvas center is at `(80,80)`. The ring is offset by 6pt toward top-left.

**Fix:** Either remove `strokeWidth` from the signature (it's genuinely not needed if the caller pre-computes radius correctly), or document explicitly that center = (radius, radius) is correct because the caller sizes the canvas to `radius*2` not `size`. Currently `JarRing.tsx` sizes the Canvas to `{ width: size, height: size }` (160×160) but the arc center is at (74,74), not (80,80) — the ring is visually off-center by half the stroke width.

The minimal correct fix in `JarRing.tsx`:
```typescript
// Canvas and container should be sized to radius*2, not `size`
const canvasSize = radius * 2; // = size - STROKE_WIDTH
// or center the arc correctly:
// cx = cy = size / 2 in jarRingArcPath, passing size/2 as radius
```

---

### WR-05: `JarDetailScreen` — sweep error silently clears the result message

**File:** `apps/mobile/src/features/jars/JarDetailScreen.tsx:67-70`

**Issue:** The `catch` block in `handleSweep` sets `setSweepResult(null)` — so when the sweep throws (e.g. DB failure), the user sees no feedback at all; the spinner stops and nothing changes. The CLAUDE.md security rule says "catch blocks fail gracefully (cached data, never crash)" — failing silently with no user feedback is not graceful failure.

**Fix:**
```typescript
} catch {
  setSweepResult(t('jars.error_save'));  // reuse existing error key
}
```

---

### WR-06: Tab bar labels are hardcoded English strings, not i18n keys

**File:** `apps/mobile/app/(tabs)/_layout.tsx:83,91,99,115`

**Issue:** All four tab labels use hardcoded English string literals (`'Overview'`, `'Transactions'`, `'Categories'`, `'Jars'`) in `tabBarLabel` render props and `tabBarAccessibilityLabel`. These do not update when the user switches to Ukrainian via the new LanguageToggle. The rest of the app uses `t()` from `useTranslation()`. This is a regression introduced by phase 4's i18n work — the tab bar is the most visible persistent UI element.

**Fix:** Add tab label keys to the dashboard/common namespace and use `t()`:
```tsx
// In TabLayout (needs useTranslation hook):
const { t } = useTranslation();
// then:
tabBarLabel: ({ focused }) => <TabLabel focused={focused}>{t('tabs.jars')}</TabLabel>
```

---

### WR-07: `DonutChart` center label "Total" is hardcoded English

**File:** `apps/mobile/src/features/dashboard/DonutChart.tsx:203`

**Issue:** `<Text style={styles.totalLabel}>Total</Text>` is a hardcoded string not routed through `useTranslation()`. The donut center label does not update on language switch. `dashboard.donut_total_label` key exists in both locale files (value: `"Разом"` in UK) but is not used here.

**Fix:**
```tsx
const { t } = useTranslation();
// line 203:
<Text style={styles.totalLabel} allowFontScaling>{t('dashboard.donut_total_label')}</Text>
```

---

## Info

### IN-01: `MonthlyTotalHero` sub-label is hardcoded English

**File:** `apps/mobile/src/features/dashboard/MonthlyTotalHero.tsx:64`

**Issue:** `{`Total spent in ${monthLabel}`}` is a hardcoded English template string, not i18n-keyed. `dashboard.total_spent_in` exists in both locales (UK: `"Витрачено в {{month}}"`) but is unused here. On UK language switch this label stays English.

**Fix:** Pass `t` into the component or use `useTranslation()` inside it and replace with `t('dashboard.total_spent_in', { month: monthLabel })`.

---

### IN-02: `MonthlyTotalHero` accessibilityLabel is also hardcoded English

**File:** `apps/mobile/src/features/dashboard/MonthlyTotalHero.tsx:43`

**Issue:** `accessibilityLabel={`Total spent in ${monthLabel}: ${formatted}`}` — same hardcoded string as the visible label, also not i18n-keyed.

---

### IN-03: `JarCreateBottomSheet` — icon picker accessibilityLabel exposes internal slug identifier

**File:** `apps/mobile/src/features/jars/JarCreateBottomSheet.tsx:169`

**Issue:** `accessibilityLabel={slug}` on each icon tile exposes the raw slug string (e.g. `'jar-piggy'`, `'jar-plane'`) to VoiceOver instead of a human-readable label. VoiceOver users hear "jar-piggy, button" rather than "Piggy bank, button".

**Fix:** Add a slug-to-label map or i18n keys:
```typescript
const JAR_ICON_LABELS: Record<JarIconSlug, string> = {
  'jar-piggy': t('jars.icon_piggy'),
  'jar-plane': t('jars.icon_plane'),
  // ...
};
// accessibilityLabel={JAR_ICON_LABELS[slug]}
```

---

### IN-04: `LanguageToggle` uses `accessibilityRole="radiogroup"` on the container but child options use `role="button"` instead of `role="radio"`

**File:** `apps/mobile/src/features/settings/LanguageToggle.tsx:89,48`

**Issue:** ARIA radiogroup semantics require child elements with `role="radio"` + `accessibilityState={{ checked }}`. Using `role="button"` + `accessibilityState={{ selected }}` inside a `radiogroup` container is semantically inconsistent. VoiceOver on iOS announces these as buttons inside a group rather than as radio buttons, which is confusing to screen-reader users.

**Fix:** Change `LanguageOption` to use `accessibilityRole="radio"` and `accessibilityState={{ checked: selected }}`.

---

_Reviewed: 2026-05-15T20:15:00Z_
_Reviewer: Claude (adversarial code review)_
_Depth: standard_
