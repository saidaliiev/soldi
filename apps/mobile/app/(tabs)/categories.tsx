/**
 * Categories tab — placeholder route for Wave 1.
 *
 * Replaced by the full CategoriesScreen in plan 02-04. Renders a single
 * "Coming next" centered Text so the tab bar compiles.
 */

import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';

export default function CategoriesScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe} accessibilityLabel="Categories screen">
      <View style={styles.center}>
        <Text style={styles.text} accessibilityRole="text">
          Coming next
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  text: {
    ...TYPE.uiBody,
    color: COLORS.textMuted,
  },
});
