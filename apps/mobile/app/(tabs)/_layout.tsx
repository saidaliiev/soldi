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
      style={[styles.label, { color: focused ? COLORS.accent : COLORS.textMuted }]}
    >
      {children}
    </Text>
  );
}

export default function TabLayout(): React.JSX.Element {
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
          title: 'Overview',
          tabBarAccessibilityLabel: 'Overview tab',
          tabBarIcon: ({ focused }) => (
            <DashboardIcon color={focused ? COLORS.accent : COLORS.textMuted} size={24} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Overview</TabLabel>,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarAccessibilityLabel: 'Transactions tab',
          tabBarIcon: ({ focused }) => (
            <TransactionsIcon color={focused ? COLORS.accent : COLORS.textMuted} size={24} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Transactions</TabLabel>,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarAccessibilityLabel: 'Categories tab',
          tabBarIcon: ({ focused }) => (
            <CategoriesIcon color={focused ? COLORS.accent : COLORS.textMuted} size={24} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Categories</TabLabel>,
        }}
      />
      <Tabs.Screen
        name="jars"
        options={{
          title: 'Jars',
          tabBarAccessibilityLabel: 'Jars tab',
          tabBarIcon: ({ focused }) => (
            <JarsIcon color={focused ? COLORS.accent : COLORS.textMuted} size={24} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Jars</TabLabel>,
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
