/**
 * SOLDI tab bar wiring — four tabs (Overview / Transactions / Categories /
 * Jars) plus one hidden route (explore). The actual bar is the warm Liquid
 * Glass `GlassTabBar` (redesign Wave 1) with a mandatory solid editorial
 * fallback for iOS<26.
 *
 * This file only wires expo-router → GlassTabBar. Color/contrast contract
 * (I-01, audited in src/design/contrast.ts) and the glass/fallback decision
 * live in GlassTabBar + the pure src/design/glass.ts. Do NOT re-add
 * tabBarActiveTintColor/tabBarStyle here — GlassTabBar owns appearance.
 *
 * Accessibility: each tab declares role="tab" + label + selected state
 * inside GlassTabBar; titles/labels are i18n (update on language switch).
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
      {/* Phase 1 placeholder — kept out of the tab bar (href:null). The
          GlassTabBar filters href:null routes so this never renders a tab. */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
