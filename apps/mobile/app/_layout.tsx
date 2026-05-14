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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { COLORS } from '@design/tokens';
import { queryClient } from '@api/queryClient';
import { getDB, runMigrations } from '@lib/db';
import { initI18n, i18n } from '@lib/i18n';
import { RecategorizeBottomSheet } from '@/src/features/transactions/RecategorizeBottomSheet';

SplashScreen.preventAutoHideAsync().catch(() => {
  // ignored
});

export default function RootLayout() {
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
        // Log only error.name — never SQL fragments, values, or token bytes (T-01-01-02)
        const name = err instanceof Error ? err.name : 'UnknownError';
        console.warn('migration failed', name);
        // Still unblock the UI — app is usable without completed migration
        setDbReady(true);
      }
    })();
  }, []);

  if (!fontsLoaded || !i18nReady || !dbReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
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
          </Stack>
          <RecategorizeBottomSheet />
          <StatusBar style="dark" />
        </I18nextProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
