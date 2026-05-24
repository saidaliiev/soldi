/**
 * SOLDI tab bar wiring — four tabs (Overview / Transactions / Categories /
 * Jars). The actual bar is the warm Liquid Glass `GlassTabBar` (redesign
 * Wave 1) with a mandatory solid editorial fallback for iOS<26.
 *
 * This file only wires expo-router → GlassTabBar. Color/contrast contract
 * (I-01, audited in src/design/contrast.ts) and the glass/fallback decision
 * live in GlassTabBar + the pure src/design/glass.ts. Do NOT re-add
 * tabBarActiveTintColor/tabBarStyle here — GlassTabBar owns appearance.
 *
 * Accessibility: each tab declares role="tab" + label + selected state
 * inside GlassTabBar; titles/labels are i18n (update on language switch).
 *
 * GlassTabBar filters via an allow-list (route.name in ICONS), so any new
 * Tabs.Screen added here MUST also be registered in
 * src/features/chrome/GlassTabBar.tsx ICONS to render.
 */

import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { GlassTabBar } from '@/src/features/chrome/GlassTabBar';

export default function TabLayout(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('dashboard.tab_overview'),
          tabBarAccessibilityLabel: t('dashboard.tab_overview'),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('dashboard.tab_transactions'),
          tabBarAccessibilityLabel: t('dashboard.tab_transactions'),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: t('dashboard.tab_categories'),
          tabBarAccessibilityLabel: t('dashboard.tab_categories'),
        }}
      />
      <Tabs.Screen
        name="jars"
        options={{
          title: t('dashboard.tab_jars'),
          tabBarAccessibilityLabel: t('dashboard.tab_jars'),
        }}
      />
    </Tabs>
  );
}
