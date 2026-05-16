import {
  Oswald_300Light,
  Oswald_500Medium,
  Oswald_700Bold,
  useFonts as useOswald,
} from '@expo-google-fonts/oswald';
import {
  EBGaramond_400Regular,
  EBGaramond_400Regular_Italic,
  EBGaramond_600SemiBold,
  useFonts as useGaramond,
} from '@expo-google-fonts/eb-garamond';
import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts as useManrope,
} from '@expo-google-fonts/manrope';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import * as LocalAuthentication from 'expo-local-authentication';

import { COLORS } from '@design/tokens';
import { queryClient } from '@api/queryClient';
import { getDB, runMigrations } from '@lib/db';
import { initI18n, i18n } from '@lib/i18n';
import { useOnboardingStore } from '@stores/onboarding';
import { RecategorizeBottomSheet } from '@/src/features/transactions/RecategorizeBottomSheet';
import { PropagationToast } from '@/src/features/transactions/PropagationToast';
import { ChatBottomSheet } from '@/src/features/chat/ChatBottomSheet';

SplashScreen.preventAutoHideAsync().catch(() => {
  // ignored
});

// D-01: 5-minute background threshold — a code constant, not a user setting.
const RESUME_LOCK_MS = 5 * 60 * 1000;

/**
 * Prompts biometric / device passcode authentication.
 * D-01: disableDeviceFallback=false → OS passcode offered on biometric failure.
 * No app-level retry cap — iOS biometric lockout handles excessive failures.
 * Returns true on success, false on any failure or throw.
 * Never logs failure detail (CLAUDE.md security rule / T-05-01).
 */
async function authenticateDevice(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Soldi',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false, // D-01: OS passcode fallback, no app retry cap
    });
    return result.success;
  } catch {
    // Never log biometric failure details (CLAUDE.md security rule)
    return false;
  }
}

export default function RootLayout() {
  // D-07: read persisted language for root key-bump remount.
  // When LanguageToggle calls setLanguage, this selector re-fires → language
  // changes → key on I18nextProvider changes → full subtree remount.
  // This retranslates module-scope t(), Intl.DateTimeFormat date headers, and
  // FlashList sticky headers that don't update via useTranslation() alone.
  const language = useOnboardingStore((s) => s.language) ?? 'en';
  const biometricEnabled = useOnboardingStore((s) => s.biometricEnabled);

  // T-05-01: biometricPassed gates the render — null returned until auth succeeds.
  // Initialised to true when biometric is disabled (no gate needed).
  const [biometricPassed, setBiometricPassed] = useState(!biometricEnabled);

  const [oswaldLoaded] = useOswald({
    Oswald: Oswald_500Medium,
    Oswald_300Light,
    Oswald_500Medium,
    Oswald_700Bold,
  });

  const [garamondLoaded] = useGaramond({
    EBGaramond: EBGaramond_400Regular,
    EBGaramond_400Regular,
    EBGaramond_400Regular_Italic,
    EBGaramond_600SemiBold,
  });

  const [manropeLoaded] = useManrope({
    Manrope: Manrope_500Medium,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  const fontsLoaded = oswaldLoaded && garamondLoaded && manropeLoaded;

  const [i18nReady, setI18nReady] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        // ignored
      });
    }
  }, [fontsLoaded]);

  useEffect(() => {
    void (async () => {
      await initI18n();
      setI18nReady(true);

      try {
        runMigrations(getDB());
        setDbReady(true);
      } catch (err) {
        // CR-03: do NOT set dbReady=true on migration failure.
        // runMigrations wraps each migration in BEGIN/ROLLBACK so a crash
        // mid-migration leaves PRAGMA user_version unchanged — the migration
        // retries on next launch. Unblocking the UI with a partially-migrated
        // schema (e.g. missing jars/jar_contributions tables) causes crashes
        // that are harder to diagnose than a blank screen.
        // Log only error.name — never SQL fragments, values, or token bytes (T-01-01-02).
        const migrationErrName = err instanceof Error ? err.name : 'UnknownError';
        console.error('migration failed — DB not ready:', migrationErrName);
        // dbReady stays false → app renders null (splash stays visible).
        // On next cold start the migration retries from the last committed version.
      }
    })();
  }, []);

  // T-05-01: Cold-start biometric gate — runs once after db/i18n/fonts are ready.
  // If biometricEnabled is false, biometricPassed was initialised true → no-op.
  // If true, authenticate and re-attempt on failure until success (never render
  // partial UI on failed auth — T-05-01 ASVS L1 auth-on-open).
  useEffect(() => {
    if (!biometricEnabled) {
      setBiometricPassed(true);
      return;
    }
    if (!fontsLoaded || !i18nReady || !dbReady) return;

    let cancelled = false;
    void (async () => {
      // Re-attempt on failure — never render partial UI on failed auth (T-05-01).
      // iOS handles lockout after excessive failures.
      while (true) {
        const passed = await authenticateDevice();
        if (cancelled) return;
        if (passed) {
          setBiometricPassed(true);
          return;
        }
        // Failed auth (e.g. cancelled by user) — loop re-prompts immediately.
        // No failure logging (CLAUDE.md security rule).
      }
    })();
    return () => { cancelled = true; };
  }, [biometricEnabled, fontsLoaded, i18nReady, dbReady]);

  // D-01: AppState resume gate — re-locks after > 5 minutes backgrounded.
  useEffect(() => {
    let backgroundedAt: number | null = null;

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        backgroundedAt = Date.now();
      } else if (nextState === 'active' && backgroundedAt !== null) {
        const elapsed = Date.now() - backgroundedAt;
        backgroundedAt = null;
        if (biometricEnabled && elapsed > RESUME_LOCK_MS) {
          setBiometricPassed(false); // triggers render-gate → re-auth via cold-start effect
        }
      }
    });
    return () => sub.remove();
  }, [biometricEnabled]);

  // T-05-01: Render gate — never render partial UI when auth is pending/failed.
  if (!fontsLoaded || !i18nReady || !dbReady || !biometricPassed) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        {/* key={language} — D-07 root key-bump: changing language forces a full
            remount of the I18nextProvider subtree, retranslating module-scope
            t() calls, Intl.DateTimeFormat date headers, and FlashList sticky
            headers. Brief flash on explicit user language-switch is accepted. */}
        <I18nextProvider key={language} i18n={i18n}>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: COLORS.background },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: 'modal', title: 'Modal' }}
            />
            <Stack.Screen
              name="transactions/[id]"
              options={{ title: 'Transaction' }}
            />
            <Stack.Screen
              name="transactions/search"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="settings"
              options={{ title: 'Settings', presentation: 'card' }}
            />
          </Stack>
          <RecategorizeBottomSheet />
          <PropagationToast />
          <ChatBottomSheet />
          <StatusBar style="dark" />
        </I18nextProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
