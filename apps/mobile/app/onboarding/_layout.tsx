/**
 * Onboarding stack layout.
 *
 * All onboarding screens share this layout:
 * - No headers (headerShown: false)
 * - App background colour (warm cream)
 * - Slide-from-right transition
 */

import { Stack } from 'expo-router';

import { COLORS } from '@design/tokens';

export default function OnboardingLayout(): React.JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
