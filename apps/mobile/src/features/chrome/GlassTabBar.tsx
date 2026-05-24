/**
 * SOLDI warm Liquid Glass floating tab bar (redesign Wave 1, spec §2.2/§3).
 *
 * The ONLY file allowed to import expo-glass-effect (CLAUDE.md governance).
 * Screens never import it — they get this via app/(tabs)/_layout.tsx's
 * `tabBar` prop. All glass-vs-fallback DECISION + style lives in the pure,
 * node-tested src/design/glass.ts; this component only:
 *   1. reads the two native availability fns at the RN boundary,
 *   2. asks glass.ts what to render,
 *   3. renders GlassContainer+GlassView (glass) OR a solid View (fallback).
 *
 * Fallback is mandatory and equally premium (spec §2.2): off iOS-26 the
 * library degrades GlassView to a TRANSPARENT View, so the fallback path
 * renders an explicit solid warm fill + ELEVATION.floating — never an empty
 * bar. Tab switching is instant (spec — no tab-switch motion preset).
 *
 * Accessibility: each tab is role="tab" with selected state + i18n label;
 * tap target ≥ 44pt (spec R5). reduce-transparency: isLiquidGlassAvailable()
 * may still be true under accessibility limits, so we additionally honor
 * AccessibilityInfo.isReduceTransparencyEnabled() → force the solid path.
 */

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, RADIUS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { isSafeToRenderGlass, resolveTabBarChrome } from '@/src/design/glass';
import { getGlassEffect } from '@lib/glassEffect';
import {
  DashboardIcon,
  TransactionsIcon,
  JarsIcon,
} from '@/src/design/icons/tabs';

const MIN_TAP = 44; // spec R5 — minimum tap target (pt)
const BAR_HEIGHT = 56;
const BAR_MARGIN = SPACING.md; // floating inset from screen edges

type IconCmp = (props: { color: string; size?: number }) => React.ReactNode;

// route name (expo-router) → tab icon. Only registered routes render —
// allow-list filter in the component below uses this map as the source
// of truth. To add a new tab: register here AND in app/(tabs)/_layout.tsx.
const ICONS: Record<string, IconCmp> = {
  index: DashboardIcon,
  transactions: TransactionsIcon,
  jars: JarsIcon,
};

export function GlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  // reduce-transparency: glass may still report available under a11y limits.
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then((v) => {
      if (mounted) setReduceTransparency(v);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      (v) => setReduceTransparency(v),
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  // Native boundary: load expo-glass-effect ONLY on iOS 26+; pre-26 + Android
  // never touch the native binding (it weak-links iOS-26 symbols that produce
  // EXC_BAD_ACCESS in Hermes microtask checkpoint on older OS — TF crash
  // 2026-05-23, expo/expo#40911). When the gate returns null, force fallback.
  const glassMod = getGlassEffect();
  const safeGlass =
    glassMod !== null &&
    !reduceTransparency &&
    isSafeToRenderGlass(glassMod.isGlassEffectAPIAvailable(), glassMod.isLiquidGlassAvailable());
  const chrome = resolveTabBarChrome(safeGlass);

  const bottom = Math.max(insets.bottom, BAR_MARGIN);

  const tabs = state.routes
    .filter((route) => {
      // Allow-list by registered icon. expo-router v6 does NOT propagate
      // Tabs.Screen `href: null` into descriptor.options, so the previous
      // deny-list (`opts.href !== null`) silently let any unregistered
      // route through as a leaked 5th tab. Routes shipped to the bar must
      // appear in ICONS; anything else is junk and is dropped at render.
      if (!descriptors[route.key]) return false;
      return route.name in ICONS;
    })
    .map((route) => {
      // Non-null: routes reaching here are guaranteed present in descriptors
      // (expo-router populates descriptors for every route in state.routes).
      const { options } = descriptors[route.key]!;
      const routeIndex = state.routes.findIndex((r) => r.key === route.key);
      const focused = state.index === routeIndex;
      const color = focused ? COLORS.accent : COLORS.textMuted; // icon = accent indicator (I-01)
      const labelColor = focused ? COLORS.textPrimary : COLORS.textMuted; // label AA body (I-01)
      // tabBarLabel function overload intentionally unsupported (all SOLDI tabs use string title)
      const label =
        typeof options.tabBarLabel === 'string'
          ? options.tabBarLabel
          : (options.title ?? route.name);
      const Icon = ICONS[route.name];

      const onPress = () => {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });
        if (!focused && !event.defaultPrevented) {
          navigation.navigate(route.name);
        }
      };

      const tabContent = (
        <Pressable
          key={route.key}
          onPress={onPress}
          accessibilityRole="tab"
          accessibilityState={{ selected: focused }}
          accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
          style={styles.tab}
        >
          {Icon ? <Icon color={color} size={24} /> : null}
          {/* maxFontSizeMultiplier=1.0: fixed pill height — label overflow would break
              bar geometry. Deliberate a11y tradeoff; icon + AA contrast carry low-vision. */}
          <Text
            maxFontSizeMultiplier={1.0}
            numberOfLines={1}
            style={[styles.label, { color: labelColor }]}
          >
            {label}
          </Text>
        </Pressable>
      );

      // safeGlass = (glassMod !== null && ...) by construction, so chrome.glass
      // implies glassMod !== null. The non-null assertion is the invariant.
      if (chrome.glass) {
        const GlassView = glassMod!.GlassView;
        return (
          <GlassView
            key={route.key}
            glassEffectStyle={chrome.glassEffectStyle}
            tintColor={chrome.tintColor}
            isInteractive={chrome.isInteractive}
            style={styles.glassTab}
          >
            {tabContent}
          </GlassView>
        );
      }
      return tabContent;
    });

  if (chrome.glass) {
    const GlassContainer = glassMod!.GlassContainer;
    return (
      <View
        pointerEvents="box-none"
        style={[styles.wrap, { bottom, left: BAR_MARGIN, right: BAR_MARGIN }]}
      >
        <GlassContainer spacing={SPACING.xs} style={styles.glassContainer}>
          {tabs}
        </GlassContainer>
      </View>
    );
  }

  // Mandatory solid fallback — explicit warm fill + floating shadow.
  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom, left: BAR_MARGIN, right: BAR_MARGIN }]}
    >
      <View
        style={[
          styles.solidBar,
          { backgroundColor: chrome.backgroundColor },
          chrome.shadow,
        ]}
      >
        {tabs}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
  },
  glassContainer: {
    flexDirection: 'row',
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    height: BAR_HEIGHT,
  },
  glassTab: {
    flex: 1,
    height: BAR_HEIGHT,
  },
  solidBar: {
    flexDirection: 'row',
    borderRadius: RADIUS.pill,
    height: BAR_HEIGHT,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    minHeight: MIN_TAP,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    ...TYPE.uiLabel,
  },
});
