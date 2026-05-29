/**
 * CategorySymbol — renders a category icon as an SF Symbol (Cold Minimal).
 *
 * iOS: native SF Symbol, monochrome, tinted to the palette (default accent).
 * Android/Web: falls back to the category emoji (emojiForSlug) — never blank.
 * Android is a preview-only target for this portfolio app, so the emoji
 * fallback is acceptable while iOS gets the premium native treatment.
 *
 * Replaces the prior emoji-as-UI-icon approach on content surfaces. Pass the
 * category `slug` (preferred) so the symbol stays correct regardless of locale.
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SymbolView, type SymbolWeight } from 'expo-symbols';

import { COLORS } from '@design/tokens';
import { emojiForSlug } from '@data/categoryEmojis';
import { symbolForSlug } from './categorySymbols';

type Props = {
  /** Category slug — drives both the SF Symbol and the emoji fallback. */
  readonly slug: string | null | undefined;
  /** Rendered point size of the glyph. Default 22. */
  readonly size?: number;
  /** Tint colour (iOS). Default accent slate. */
  readonly color?: string;
  /** SF Symbol weight. Default 'medium'. */
  readonly weight?: SymbolWeight;
};

export function CategorySymbol({
  slug,
  size = 22,
  color = COLORS.accent,
  weight = 'medium',
}: Props): React.JSX.Element {
  return (
    <SymbolView
      name={symbolForSlug(slug)}
      size={size}
      tintColor={color}
      type="monochrome"
      weight={weight}
      fallback={
        <Text
          style={[styles.fallback, { fontSize: size, lineHeight: size + 2 }]}
          allowFontScaling={false}
        >
          {emojiForSlug(slug)}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    textAlign: 'center',
  },
});
