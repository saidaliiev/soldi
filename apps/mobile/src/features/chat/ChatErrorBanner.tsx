/**
 * ChatErrorBanner — service-unavailable banner between message list and input row.
 *
 * UI-SPEC §ChatErrorBanner:
 * - Full-width, auto height, COLORS.error@10% bg, 1pt top+bottom COLORS.error@30% border
 * - No corner radius (full-width banner)
 * - Layout: error icon (16pt) | body text (TYPE.uiLabel COLORS.error) | right: ChevronRefresh icon
 * - Slide in: withTiming opacity 0→1 + translateY -8→0, 200ms
 * - Tap: re-fires last failed request (via chatStore.retryLast + bumpRetry)
 * - Copy: retryCount 0 → chat.error_unavailable; ≥1 → chat.error_unavailable_retry
 * - Auto-dismiss: none (stays until tap or sheet close)
 * - accessibilityRole=button, liveRegion=assertive
 */

import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useMotion } from '@design/useMotion';
import { ChevronRefresh } from '@design/icons/system/ChevronRefresh';
import { useChatStore } from './chatStore';

const ERROR_BG = `${COLORS.error}1A`;      // error @ 10%
const ERROR_BORDER = `${COLORS.error}4D`; // error @ 30%

type Props = {
  /** Whether the banner is currently visible */
  readonly visible: boolean;
};

export function ChatErrorBanner({ visible }: Props): React.JSX.Element | null {
  const { t } = useTranslation();
  const retryLast = useChatStore((s) => s.retryLast);
  const bumpRetry = useChatStore((s) => s.bumpRetry);
  const retryCount = useChatStore((s) => s.retryCount);

  const { withMotion } = useMotion();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-8);

  React.useEffect(() => {
    if (visible) {
      opacity.value = withMotion(1, 'chatBubbleEnter');
      translateY.value = withMotion(0, 'chatBubbleEnter');
    } else {
      opacity.value = withMotion(0, 'fabReveal');
      translateY.value = withMotion(-8, 'fabReveal');
    }
  }, [visible, opacity, translateY, withMotion]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  const copy =
    retryCount >= 1
      ? t('chat:error_unavailable_retry')
      : t('chat:error_unavailable');

  const handlePress = (): void => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    bumpRetry();
    retryLast().catch(() => {});
  };

  return (
    <Animated.View style={animStyle} pointerEvents="box-none">
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={copy}
        accessibilityLiveRegion="assertive"
        style={styles.banner}
      >
        {/* Left: error dot indicator */}
        <View style={styles.errorDot} />
        <Text style={styles.text} numberOfLines={2} allowFontScaling>
          {copy}
        </Text>
        <ChevronRefresh size={16} color={COLORS.error} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ERROR_BG,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: ERROR_BORDER,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  errorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.error,
    flexShrink: 0,
  },
  text: {
    ...TYPE.uiLabel,
    color: COLORS.error,
    flex: 1,
  },
});
