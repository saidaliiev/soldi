/**
 * Settings stack route (D-06).
 *
 * Reached via gear control in dashboard header → router.push('/settings').
 * NOT a tab — the four-tab editorial shell is preserved (D-06).
 * Registered as Stack.Screen name="settings" in app/_layout.tsx.
 */

import React from 'react';
import { SettingsScreen } from '@/src/features/settings/SettingsScreen';

export default function SettingsRoute(): React.JSX.Element {
  return <SettingsScreen />;
}
