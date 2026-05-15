/**
 * SOLDI tab bar — three tabs (Overview / Transactions / Categories).
 *
 * Replaces the Phase 1 Home/Explore placeholders. Per D-21:
 *   - No lucide icons. No emoji. No raster images. Custom Skia-rendered
 *     SVG paths only (hand-drawn aesthetic, strokeWidth 1.6, round caps).
 *
 * Design contract (UI-SPEC §"Tab Bar"):
 *   active tint   = COLORS.accent
 *   inactive tint = COLORS.textMuted
 *   background    = COLORS.surface
 *   top border    = 1pt COLORS.textMuted @ 20% alpha
 *   label preset  = TYPE.uiLabel
 *
 * Accessibility: each tab declares role="tab" + label + selected state via
 *   tabBarAccessibilityLabel and Tabs.Screen options.
 */

import { Tabs } from 'expo-router';
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { COLORS } from '@design/tokens';
import { TYPE } from '@design/typography';
import {
  DashboardIcon,
  TransactionsIcon,
  CategoriesIcon,
  JarsIcon,
} from '@/src/design/icons/tabs';

// 20% alpha for the top border — `33` is the 8-bit alpha hex suffix pattern
// already established in CLAUDE.md (the LinearGradient guidance).
const BORDER_TOP_COLOR = `${COLORS.textMuted}33`;

type TabLabelProps = {
  readonly focused: boolean;
  readonly children: string;
};

function TabLabel({ focused, children }: TabLabelProps): React.JSX.Element {
  return (
    <Text
      allowFontScaling
      // QUAL-04: Tab bar labels are 14pt (TYPE.uiLabel). At AccessibilityXXXL
      // the system scale is ~3.1× → 43pt, which breaks the fixed-height tab bar
      // (icon + label must stay single-line inside ~50pt bar height).
      // Cap at 1.0× so the label stays exactly at design size; the tab bar's
      // tabBarAccessibilityLabel already provides a full description for
      // VoiceOver users, so scale suppression here does not harm accessibility.
      maxFontSizeMultiplier={1.0}
      numberOfLines={1}
      style={[styles.label, { color: focused ? COLORS.accent : COLORS.textMuted }]}
    >
      {children}
    </Text>
  );
}

export default function TabLayout(): React.JSX.Element {
  // WR-06: tab labels were hardcoded English — use t() so they update on
  // language switch. Keys added to dashboard namespace (tab_overview etc.).
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: BORDER_TOP_COLOR,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('dashboard.tab_overview'),
          tabBarAccessibilityLabel: t('dashboard.tab_overview'),
          tabBarIcon: ({ focused }) => (
            <DashboardIcon color={focused ? COLORS.accent : COLORS.textMuted} size={24} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>{t('dashboard.tab_overview')}</TabLabel>,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('dashboard.tab_transactions'),
          tabBarAccessibilityLabel: t('dashboard.tab_transactions'),
          tabBarIcon: ({ focused }) => (
            <TransactionsIcon color={focused ? COLORS.accent : COLORS.textMuted} size={24} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>{t('dashboard.tab_transactions')}</TabLabel>,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: t('dashboard.tab_categories'),
          tabBarAccessibilityLabel: t('dashboard.tab_categories'),
          tabBarIcon: ({ focused }) => (
            <CategoriesIcon color={focused ? COLORS.accent : COLORS.textMuted} size={24} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>{t('dashboard.tab_categories')}</TabLabel>,
        }}
      />
      <Tabs.Screen
        name="jars"
        options={{
          title: t('dashboard.tab_jars'),
          tabBarAccessibilityLabel: t('dashboard.tab_jars'),
          tabBarIcon: ({ focused }) => (
            <JarsIcon color={focused ? COLORS.accent : COLORS.textMuted} size={24} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>{t('dashboard.tab_jars')}</TabLabel>,
        }}
      />
      {/* Hide the Phase 1 placeholder route from the tab bar without deleting
          the file outright (let plan 02-03 swap it cleanly). */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: {
    ...TYPE.uiLabel,
  },
});
