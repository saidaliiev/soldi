/**
 * ChatBubbleUser — right-aligned user message bubble.
 *
 * UI-SPEC §ChatBubbleUser:
 * - alignSelf flex-end, maxWidth 80%
 * - bg accent @ 12% (rgba token-derived)
 * - 16/16/16/4 corner radius (bottom-right tail)
 * - EB Garamond body text
 * - Tap → toggle timestamp reveal
 * - Entrance: opacity 0→1 + translateY 12→0, 250ms cubic-out
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import type { ChatMessage } from './chatStore';

// accent @ 12% — derived from COLORS.accent (#9C5B41); rgba avoids hardcoded hex
// The channel values (156, 91, 65) come from COLORS.accent hex decomposition.
// See token reference in design/tokens.ts COLORS.accent.
const ACCENT_12 = 'rgba(156, 91, 65, 0.12)'; // COLORS.accent @ 12% opacity

type Props = {
  readonly message: Extract<ChatMessage, { role: 'user' }>;
};

export function ChatBubbleUser({ message }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const [showTimestamp, setShowTimestamp] = React.useState(false);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
  }, [opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const timestampOpacity = useSharedValue(0);
  const timestampStyle = useAnimatedStyle(() => ({
    opacity: timestampOpacity.value,
    height: timestampOpacity.value * 18,
    overflow: 'hidden',
  }));

  const toggleTimestamp = (): void => {
    const next = !showTimestamp;
    setShowTimestamp(next);
    timestampOpacity.value = withTiming(next ? 1 : 0, { duration: 150 });
  };

  const timeStr = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Animated.View style={[styles.wrapper, animStyle]}>
      <Pressable
        onPress={toggleTimestamp}
        accessibilityRole="text"
        accessibilityLabel={t('chat:bubble_label_user', { text: message.text })}
      >
        <View style={styles.bubble}>
          <Text style={styles.text} allowFontScaling>
            {message.text}
          </Text>
        </View>
        <Animated.View style={[styles.timestamp, timestampStyle]}>
          <Text style={styles.timestampText}>{timeStr}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    marginBottom: SPACING.sm,
  },
  bubble: {
    backgroundColor: ACCENT_12,
    borderRadius: RADIUS.lg,
    borderBottomRightRadius: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  text: {
    ...TYPE.editorialBody,
    color: COLORS.textPrimary,
  },
  timestamp: {
    alignSelf: 'flex-end',
    paddingRight: 4,
  },
  timestampText: {
    ...TYPE.uiLabel,
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
