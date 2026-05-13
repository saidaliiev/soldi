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
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { COLORS } from '@design';

export const unstable_settings = {
  anchor: '(tabs)',
};

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

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        // ignored
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: 'Modal' }}
        />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
