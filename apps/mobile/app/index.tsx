/**
 * Boot redirector — reads onboarding completion flag and routes accordingly.
 *
 * If onboarding is complete → /(tabs)
 * Otherwise → /onboarding/welcome
 *
 * This is the only file that decides the initial navigation destination.
 */

import { Redirect } from 'expo-router';

import { useOnboardingStore } from '@stores/onboarding';

export default function Index(): React.JSX.Element {
  const completed = useOnboardingStore((s) => s.completed);

  if (completed) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding/welcome" />;
}
