# Phase 5: Polish + TestFlight Beta — Pattern Map

**Mapped:** 2026-05-16
**Files analyzed:** 11 new/modified files
**Analogs found:** 10 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/features/settings/SettingsScreen.tsx` | component | request-response | `src/features/settings/SettingsScreen.tsx` (extend) | exact — extend in place |
| `src/lib/secure.ts` | utility | CRUD | `src/lib/secure.ts` (extend) | exact — add key to union |
| `src/stores/onboarding.ts` | store | CRUD | `src/stores/onboarding.ts` (extend) | exact — add field |
| `app/_layout.tsx` | provider | event-driven | `app/_layout.tsx` (extend) | exact — add AppState listener |
| `src/features/settings/BiometricToggle.tsx` | component | request-response | `src/features/settings/LanguageToggle.tsx` | role-match |
| `src/features/settings/ExportButton.tsx` | component | file-I/O | `src/features/settings/LanguageToggle.tsx` | role-match |
| `src/features/notifications/digestNotification.ts` | utility | event-driven | `src/data/transactionsRepo.ts` (sumLastNDays) + `src/features/dashboard/DigestCard.tsx` | data-flow match |
| `src/features/notifications/jarMilestoneNotification.ts` | utility | event-driven | `src/features/jars/jarsRepo.ts` (jarBalanceCents) | data-flow match |
| `src/features/export/exportRepo.ts` | utility | file-I/O | `src/data/transactionsRepo.ts` + `src/features/jars/jarsRepo.ts` | role-match |
| `src/i18n/locales/en/settings.json` | config | transform | `src/i18n/locales/en/settings.json` (extend) | exact |
| `src/i18n/locales/uk/settings.json` | config | transform | `src/i18n/locales/uk/settings.json` (extend) | exact |

---

## Pattern Assignments

### `src/lib/secure.ts` — add `'soldi-biometric'` key (utility, CRUD)

**Analog:** `src/lib/secure.ts` (lines 21–25)

**Pattern — extend SecureKey union only:**
```typescript
// CURRENT (lines 21-25):
export type SecureKey =
  | 'monobank_token'
  | 'monobank_token_hash'
  | 'soldi-onboarding'
  | 'soldi-tx-filter';

// PHASE 5 — add one line:
  | 'soldi-biometric';
```

**Rule:** Never write to SecureStore with an arbitrary string. The typed union is
the entire guard. No other changes to this file needed — `secureGet`/`secureSet`/
`secureDelete` already accept any `SecureKey`.

---

### `src/stores/onboarding.ts` — add `biometricEnabled` field (store, CRUD)

**Analog:** `src/stores/onboarding.ts` (full file, 83 lines)

**Imports pattern** (lines 9–14):
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';

import { secureGet, secureSet, secureDelete } from '@lib/secure';
import type { SecureKey } from '@lib/secure';
```

**State type extension** (lines 22–35 — add after `completed`):
```typescript
export type OnboardingState = {
  language: 'en' | 'uk' | null;
  dataSource: DataSource | null;
  completed: boolean;
  // Phase 5 — ONBD-04
  biometricEnabled: boolean;

  setLanguage: (lng: 'en' | 'uk') => void;
  setDataSource: (source: DataSource) => void;
  setCompleted: (value: boolean) => void;
  setBiometricEnabled: (value: boolean) => void;  // add
  reset: () => void;
};
```

**Store initialState + setter pattern** (lines 62–83):
```typescript
const initialState = {
  language: null,
  dataSource: null,
  completed: false,
  biometricEnabled: false,   // add — default OFF per D-03 pattern
} as const;

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      setLanguage: (lng) => set({ language: lng }),
      setDataSource: (source) => set({ dataSource: source }),
      setCompleted: (value) => set({ completed: value }),
      setBiometricEnabled: (value) => set({ biometricEnabled: value }), // add
      reset: () => set(initialState),
    }),
    {
      name: 'soldi-onboarding',  // unchanged — same SecureStore key
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
```

**Security rule:** The persist name stays `'soldi-onboarding'` (already in SecureKey
union). Do NOT create a separate `'soldi-biometric'` persist store — the flag rides
inside the existing onboarding blob. `'soldi-biometric'` is reserved only if a
standalone secret value (not a boolean flag) needs separate keychain storage.

---

### `app/_layout.tsx` — biometric cold-start gate + AppState resume listener (provider, event-driven)

**Analog:** `app/_layout.tsx` (full file, 152 lines)

**Existing render gate pattern** (lines 107–109) — cold-start hook plugs here:
```typescript
// Current guard — biometric gate added as additional condition:
if (!fontsLoaded || !i18nReady || !dbReady) {
  return null;
}
// Phase 5: add || !biometricPassed
if (!fontsLoaded || !i18nReady || !dbReady || !biometricPassed) {
  return null;
}
```

**AppState listener pattern** — add inside `RootLayout`, parallel to existing
`useEffect` blocks (lines 75–105):
```typescript
// Resume gate — D-01: fire when backgrounded > 5 minutes
useEffect(() => {
  let backgroundedAt: number | null = null;

  const sub = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'background') {
      backgroundedAt = Date.now();
    } else if (nextState === 'active' && backgroundedAt !== null) {
      const elapsed = Date.now() - backgroundedAt;
      backgroundedAt = null;
      if (biometricEnabled && elapsed > 5 * 60 * 1000) {
        setBiometricPassed(false); // triggers render-gate → re-auth
      }
    }
  });
  return () => sub.remove();
}, [biometricEnabled]);
```

**Imports to add** (after line 26):
```typescript
import { AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
```

**Auth call pattern** — async, graceful failure (mirrors CLAUDE.md security rule):
```typescript
async function authenticateDevice(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Soldi',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false, // D-01: OS passcode fallback, no app cap
    });
    return result.success;
  } catch {
    // Never log biometric failure details in prod (CLAUDE.md security rule)
    return false;
  }
}
```

---

### `src/features/settings/SettingsScreen.tsx` — extend with Security + Export + Notifications sections (component, request-response)

**Analog:** `src/features/settings/SettingsScreen.tsx` (full file, 72 lines) — extend in place

**Existing section/card pattern** (lines 35–43) — copy for each new section:
```typescript
<View style={styles.section}>
  <Text style={styles.sectionLabel} allowFontScaling>
    {t('settings.security_section')}
  </Text>
  <View style={styles.card}>
    <BiometricToggle />
  </View>
</View>
```

**Existing style tokens** (lines 47–71) — reuse all, add nothing new unless gap
adjustment is needed:
```typescript
const styles = StyleSheet.create({
  scroll:        { flex: 1, backgroundColor: COLORS.background },
  content:       { paddingHorizontal: SPACING.md, paddingTop: SPACING.lg,
                   paddingBottom: SPACING.xxl, gap: SPACING.lg },
  section:       { gap: SPACING.sm },
  sectionLabel:  { ...TYPE.uiMeta, color: COLORS.textMuted,
                   textTransform: 'uppercase', letterSpacing: 0.8 },
  card:          { backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
                   padding: SPACING.md },
});
```

**Section order (Claude's discretion per CONTEXT.md):**
1. Language (existing)
2. Security (BiometricToggle)
3. Notifications (digest toggle)
4. Data (ExportButton)

---

### `src/features/settings/BiometricToggle.tsx` — new component (component, request-response)

**Analog:** `src/features/settings/LanguageToggle.tsx` (pattern by role)

**Expected pattern — read from codebase neighbor, copy structure:**
```typescript
import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useOnboardingStore } from '@stores/onboarding';

export function BiometricToggle(): React.JSX.Element {
  const { t } = useTranslation();
  const biometricEnabled = useOnboardingStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useOnboardingStore((s) => s.setBiometricEnabled);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={t('settings.biometric_label')}
      accessibilityRole="switch"
      accessibilityState={{ checked: biometricEnabled }}
    >
      <Text style={styles.label} allowFontScaling>
        {t('settings.biometric_label')}
      </Text>
      <Switch
        value={biometricEnabled}
        onValueChange={setBiometricEnabled}
        // Request iOS permission in-context on first enable (D-03 pattern)
        trackColor={{ false: COLORS.border, true: COLORS.accent }}
        thumbColor={COLORS.surface}
        accessibilityLabel={t('settings.biometric_label')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44, // CLAUDE.md: 44pt minimum tap target
  },
  label: { ...TYPE.uiLabel, color: COLORS.text },
});
```

**Security note:** When `onValueChange(true)` fires, call `LocalAuthentication.authenticateAsync()`
first — only persist `true` if auth succeeds. Never store `true` from a failed auth.

---

### `src/features/settings/ExportButton.tsx` — new component (component, file-I/O)

**Analog:** `src/features/settings/LanguageToggle.tsx` (role-match for component shell);
`src/features/export/exportRepo.ts` for data layer (see below)

**Component shell pattern:**
```typescript
import React, { useState } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Sharing from 'expo-sharing';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { buildExportFiles } from '@features/export/exportRepo';

export function ExportButton(): React.JSX.Element {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { transactionsUri, jarsUri } = await buildExportFiles();
      // D-02: share both files together in single share-sheet
      await Sharing.shareAsync(transactionsUri, { UTI: 'public.comma-separated-values-text' });
      // Note: expo-sharing v11 shares one file at a time; second share follows first
      await Sharing.shareAsync(jarsUri, { UTI: 'public.comma-separated-values-text' });
    } catch {
      // Graceful failure — never crash, never log tx details (CLAUDE.md)
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      style={styles.button}
      onPress={handleExport}
      disabled={loading}
      accessibilityLabel={t('settings.export_label')}
      accessibilityRole="button"
      accessibilityState={{ busy: loading }}
    >
      {loading
        ? <ActivityIndicator color={COLORS.surface} />
        : <Text style={styles.label}>{t('settings.export_label')}</Text>
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    minHeight: 44,
  },
  label: { ...TYPE.uiLabel, color: COLORS.surface },
});
```

---

### `src/features/export/exportRepo.ts` — new utility (utility, file-I/O)

**Analog:** `src/data/transactionsRepo.ts` (repo pattern) + `src/features/jars/jarsRepo.ts`

**Imports pattern** (mirrors transactionsRepo lines 17–19):
```typescript
import * as FileSystem from 'expo-file-system';
import { getDB } from '@lib/db';
import { listJars, jarBalanceCents } from '@features/jars/jarsRepo';
```

**Core pattern — synchronous DB read → CSV string → FileSystem write:**
```typescript
export async function buildExportFiles(): Promise<{
  transactionsUri: string;
  jarsUri: string;
}> {
  const db = getDB();

  // transactions.csv — D-02: description is null by Phase 1 AI-safety design
  const txRows = db.executeSync(
    `SELECT id, date, amount_cents, currency, merchant, category_id, ai_category
     FROM transactions ORDER BY date DESC`
  );
  const txCsv = rowsToCsv(
    ['id', 'date', 'amount_cents', 'currency', 'merchant', 'category_id', 'ai_category'],
    txRows.rows ?? []
  );

  // jars.csv — D-02: include jar_contributions ledger
  const jarRows = db.executeSync(
    `SELECT j.id, j.name, j.target_cents, jc.amount_cents, jc.source, jc.created_at
     FROM jars j
     LEFT JOIN jar_contributions jc ON jc.jar_id = j.id
     ORDER BY j.id, jc.created_at`
  );
  const jarCsv = rowsToCsv(
    ['jar_id', 'jar_name', 'target_cents', 'contribution_cents', 'source', 'created_at'],
    jarRows.rows ?? []
  );

  const txUri = `${FileSystem.cacheDirectory}transactions.csv`;
  const jarsUri = `${FileSystem.cacheDirectory}jars.csv`;

  await FileSystem.writeAsStringAsync(txUri, txCsv, { encoding: FileSystem.EncodingType.UTF8 });
  await FileSystem.writeAsStringAsync(jarsUri, jarCsv, { encoding: FileSystem.EncodingType.UTF8 });

  return { transactionsUri: txUri, jarsUri };
}
```

**Error handling pattern** (mirrors jarsRepo lines 8–9):
```typescript
// Catch blocks log only error.name, never row data or amounts (CLAUDE.md security rule)
} catch (err) {
  const name = err instanceof Error ? err.name : 'UnknownError';
  if (__DEV__) console.error('exportRepo failed:', name);
  throw err; // re-throw — ExportButton catches and handles gracefully
}
```

---

### `src/features/notifications/digestNotification.ts` — new utility (utility, event-driven)

**Analog:** `src/features/dashboard/DigestCard.tsx` (digest computation, lines 44–52) +
`src/data/transactionsRepo.ts` `sumLastNDays` (lines 140–156)

**Data access pattern** (copy from transactionsRepo lines 140–156):
```typescript
import { sumLastNDays } from '@data/transactionsRepo';
import * as Notifications from 'expo-notifications';

// D-03: editorial EB-Garamond voice — copy tone from DigestCard phrase pattern
export async function scheduleDailyDigest(enabled: boolean): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return;

  // Compute yesterday spend — same source as DigestCard (sumLastNDays(1))
  // NOTE: notification body is computed at schedule time for the trigger;
  // for a 09:00 daily trigger the body is generic — actual amount filled at
  // notification fire time via a background task or trigger handler.
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Soldi',
      // D-03 zero-spend literal:
      body: 'A quiet day — nothing spent',
      // Real body assembled in trigger handler with sumLastNDays(1)
    },
    trigger: {
      hour: 9,
      minute: 0,
      repeats: true,
    },
  });
}
```

**Permission request pattern** (D-03: in-context, not at launch):
```typescript
export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}
```

**Editorial body builder** (voice from DigestCard D-07 + CONTEXT.md specifics):
```typescript
export function buildDigestBody(yesterdayCents: number, locale = 'en-IE'): string {
  if (yesterdayCents === 0) return 'A quiet day — nothing spent';
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency', currency: 'EUR',
  }).format(yesterdayCents / 100);
  // D-03 example voice: "Yesterday's coffee added up to €83"
  return `Yesterday's spending added up to ${formatted}`;
}
```

---

### `src/features/notifications/jarMilestoneNotification.ts` — new utility (utility, event-driven)

**Analog:** `src/features/jars/jarsRepo.ts` `jarBalanceCents` (lines 91–100) + `insertContribution` (lines 109–124)

**Milestone detection pattern** (trigger after `insertContribution` call sites):
```typescript
import { jarBalanceCents, getJar } from '@features/jars/jarsRepo';
import * as Notifications from 'expo-notifications';

const MILESTONE_THRESHOLDS = [0.25, 0.5, 1.0]; // NOTIF-02: 25/50/100% only — no 75%

export async function checkAndFireMilestone(
  jarId: number,
  prevBalanceCents: number,
): Promise<void> {
  try {
    const jar = getJar(jarId);
    if (jar == null || jar.targetCents === 0) return;

    const newBalance = jarBalanceCents(jarId);
    const prevRatio = prevBalanceCents / jar.targetCents;
    const newRatio = newBalance / jar.targetCents;

    for (const threshold of MILESTONE_THRESHOLDS) {
      if (prevRatio < threshold && newRatio >= threshold) {
        const pct = Math.round(threshold * 100);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: jar.name,
            // Never log jar.name + amount together (CLAUDE.md security rule)
            body: `${pct}% of the way there`,
          },
          trigger: null, // immediate
        });
        break; // only one milestone notification per contribution
      }
    }
  } catch (err) {
    const name = err instanceof Error ? err.name : 'UnknownError';
    if (__DEV__) console.error('jarMilestoneNotification failed:', name);
    // Never crash — graceful absence
  }
}
```

---

### `src/i18n/locales/en/settings.json` + `uk/settings.json` — extend (config, transform)

**Analog:** existing files (en: 6 keys, uk: 6 keys — Phase 4 D-08 parity gate enforces equal key counts)

**Current en keys** (lines 1–7):
```json
{
  "title": "Settings",
  "language_section": "Language",
  "language_en": "English",
  "language_uk": "Ukrainian",
  "open_a11y": "Open settings"
}
```

**Phase 5 additions — en:**
```json
{
  "title": "Settings",
  "language_section": "Language",
  "language_en": "English",
  "language_uk": "Ukrainian",
  "open_a11y": "Open settings",
  "security_section": "Security",
  "biometric_label": "Face ID / Touch ID",
  "biometric_description": "Require biometric authentication on open",
  "notifications_section": "Notifications",
  "digest_toggle_label": "Daily spending digest",
  "digest_toggle_description": "09:00 morning summary",
  "data_section": "Data",
  "export_label": "Export CSV"
}
```

**Phase 5 additions — uk (must be key-for-key parity):**
```json
{
  "title": "Налаштування",
  "language_section": "Мова",
  "language_en": "English",
  "language_uk": "Українська",
  "open_a11y": "Відкрити налаштування",
  "security_section": "Безпека",
  "biometric_label": "Face ID / Touch ID",
  "biometric_description": "Вимагати біометрію при відкритті",
  "notifications_section": "Сповіщення",
  "digest_toggle_label": "Щоденний дайджест витрат",
  "digest_toggle_description": "Зведення о 09:00",
  "data_section": "Дані",
  "export_label": "Експорт CSV"
}
```

**D-08 parity gate:** Both files must have identical key sets. The CI script
(`scripts/check-i18n-parity.mjs`) will fail the build if counts diverge.

---

## Shared Patterns

### SecureStore — never AsyncStorage
**Source:** `src/lib/secure.ts` (entire file, 60 lines)
**Apply to:** `onboarding.ts` (biometricEnabled field), `BiometricToggle.tsx` (auth result must NOT be cached in AsyncStorage)
```typescript
// Correct — already used by onboarding store:
import { secureGet, secureSet } from '@lib/secure';
import type { SecureKey } from '@lib/secure';
// Wrong — never:
import AsyncStorage from '@react-native-async-storage/async-storage';
```

### Error handling — log name only, never data
**Source:** `app/_layout.tsx` lines 98–100; `src/features/jars/jarsRepo.ts` lines 8–9
**Apply to:** `exportRepo.ts`, `digestNotification.ts`, `jarMilestoneNotification.ts`
```typescript
} catch (err) {
  const name = err instanceof Error ? err.name : 'UnknownError';
  if (__DEV__) console.error('moduleName failed:', name);
  // Never: console.error(err.message) — may contain tx amounts or jar names
}
```

### Render gate — return null until ready
**Source:** `app/_layout.tsx` lines 107–109
**Apply to:** biometric cold-start gate in `app/_layout.tsx`
```typescript
if (!fontsLoaded || !i18nReady || !dbReady || !biometricPassed) {
  return null; // splash stays visible — do not render partial UI
}
```

### StyleSheet.create + tokens only
**Source:** `src/features/settings/SettingsScreen.tsx` lines 47–71; `src/features/dashboard/DigestCard.tsx` lines 84–107
**Apply to:** `BiometricToggle.tsx`, `ExportButton.tsx`
```typescript
// Correct:
import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
const styles = StyleSheet.create({ ... });
// Wrong:
style={{ color: '#10B981' }}  // banned — no hardcoded hex ever
```

### Accessibility — every interactive element
**Source:** `src/features/settings/SettingsScreen.tsx` lines 32–33; `src/features/dashboard/DigestCard.tsx` lines 58–67
**Apply to:** `BiometricToggle.tsx`, `ExportButton.tsx`
```typescript
accessibilityLabel={t('settings.biometric_label')}
accessibilityRole="switch"   // Switch
accessibilityRole="button"   // Pressable
// minHeight: 44 in StyleSheet (44pt minimum tap target)
```

### i18n — useTranslation hook, never hardcoded strings
**Source:** `src/features/settings/SettingsScreen.tsx` lines 18, 25; `src/features/dashboard/DigestCard.tsx` lines 22, 41
**Apply to:** All new components and notification body builders
```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
// Then: t('settings.biometric_label') — never raw string literals in JSX
```

### DB repo — parameterized SQL, no string interpolation
**Source:** `src/data/transactionsRepo.ts` lines 144–148; `src/features/jars/jarsRepo.ts` lines 93–94
**Apply to:** `src/features/export/exportRepo.ts`
```typescript
db.executeSync(
  'SELECT ... FROM transactions WHERE date >= ? AND amount_cents < 0',
  [threshold]  // always parameterized — never string-concatenated user input
);
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| EAS build config (`eas.json` updates) | config | batch | No existing EAS profile for `internal` distribution channel — greenfield. Reference CONTEXT.md D-04 + EAS docs via context7. |

---

## Metadata

**Analog search scope:** `apps/mobile/src/`, `apps/mobile/app/`
**Files scanned:** 11 analog files read (SettingsScreen, _layout, onboarding store, secure lib, DigestCard, transactionsRepo, jarsRepo, en/settings.json, uk/settings.json) + grep on transactionsRepo and jarsRepo for targeted section extraction
**Pattern extraction date:** 2026-05-16
