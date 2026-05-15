/**
 * PromptSuggestionChip — tappable suggested-prompt chip in ChatEmptyState.
 *
 * UI-SPEC §PromptSuggestionChip:
 * - Height 36pt; horizontal padding SPACING.md; RADIUS.pill; auto-width
 * - COLORS.surface bg; 1pt COLORS.textMuted@30% border (normal)
 * - Pressed: COLORS.accent@10% bg, border COLORS.accent@60%
 * - Label: TYPE.uiLabel (14pt Manrope) COLORS.textPrimary
 * - Tap: populate input AND submit immediately; Haptics.selectionAsync()
 * - hitSlop: 8pt vertical → 52pt total tap target (≥ 44pt)
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';

type Props = {
  readonly label: string;
  readonly onSubmit: (prompt: string) => void;
};

const BORDER_NORMAL = `${COLORS.textMuted}4D`;  // textMuted @ 30%
const BORDER_PRESSED = `${COLORS.accent}99`;    // accent @ 60%
const BG_PRESSED = `${COLORS.accent}1A`;        // accent @ 10%

export function PromptSuggestionChip({ label, onSubmit }: Props): React.JSX.Element {
  const [pressed, setPressed] = React.useState(false);

  const handlePressIn = (): void => {
    setPressed(true);
  };

  const handlePressOut = (): void => {
    setPressed(false);
  };

  const handlePress = (): void => {
    Haptics.selectionAsync().catch(() => {
      // Haptics not available on simulator — never fail the UI on this.
    });
    onSubmit(label);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8 }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Sends this question to the assistant"
    >
      <View
        style={[
          styles.chip,
          pressed
            ? { backgroundColor: BG_PRESSED, borderColor: BORDER_PRESSED }
            : { backgroundColor: COLORS.surface, borderColor: BORDER_NORMAL },
        ]}
      >
        <Text style={styles.label} numberOfLines={1} allowFontScaling>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  label: {
    ...TYPE.uiLabel,
    color: COLORS.textPrimary,
  },
});
