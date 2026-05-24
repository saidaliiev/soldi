/**
 * ChatBubbleAssistant — left-aligned assistant message bubble.
 *
 * UI-SPEC §ChatBubbleAssistant:
 * - alignSelf flex-start, max 80%
 * - COLORS.surface bg, 1pt textMuted@20% border, 16/16/4/16 radius
 * - Optional KPI in Oswald displayM + tabular-nums
 * - Editorial body in EB Garamond
 * - Optional ChatMiniChart
 * - Error variant: error bg + border, TYPE.uiLabel, retry on tap
 * - leakDetector: if merchant_key found in prose → replace with error_assistant_inline
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useMotion } from '@design/useMotion';
import { ChatMiniChart } from './ChatMiniChart';
import { detectMerchantLeak } from './leakDetector';
import { useChatStore } from './chatStore';
import type { ChatMessage } from './chatStore';

// COLORS.textMuted @ 20% alpha
const BORDER_COLOR = `${COLORS.textMuted}33`;
const ERROR_BG = `${COLORS.error}14`;    // error @ 8%
const ERROR_BORDER = `${COLORS.error}4D`; // error @ 30%

type Props = {
  readonly message: Extract<ChatMessage, { role: 'assistant' }>;
  readonly onRetry?: () => void;
};

export function ChatBubbleAssistant({ message, onRetry }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const lastFactsPack = useChatStore((s) => s.lastFactsPack);
  const [showTimestamp, setShowTimestamp] = React.useState(false);

  const { withMotion } = useMotion();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  React.useEffect(() => {
    opacity.value = withMotion(1, 'chatBubbleEnter');
    translateY.value = withMotion(0, 'chatBubbleEnter');
  }, [opacity, translateY, withMotion]);

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
    timestampOpacity.value = withMotion(next ? 1 : 0, 'fabReveal');
  };

  // Leak detection (CHAT-04 / T-03-03-01)
  let displayText = message.text;
  let displayChart = message.chart;
  let isLeak = false;

  if (!message.isError && lastFactsPack) {
    isLeak = detectMerchantLeak(message.text, lastFactsPack);
    if (isLeak) {
      displayText = t('chat.error_assistant_inline');
      displayChart = undefined;
      // SENTRY P0: chat.merchant_leak_detected
      // Phase 5 wires the Sentry SDK — do not include prose or merchant_key in extras.
      // Sentry.captureMessage('chat.merchant_leak_detected', { level: 'fatal', extra: { msg_id: message.id } });
    }
  }

  const isError = message.isError === true || isLeak;

  const timeStr = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Accessibility label
  let a11yLabel: string;
  if (isError) {
    a11yLabel = t('chat.bubble_label_error', { text: displayText });
  } else if (displayChart && message.chart && 'kpi' in message.chart && message.chart.kpi != null) {
    a11yLabel = t('chat.bubble_label_assistant_kpi', {
      text: displayText,
      kpi: message.chart.kpi,
    });
  } else {
    a11yLabel = t('chat.bubble_label_assistant', { text: displayText });
  }

  return (
    <Animated.View style={[styles.wrapper, animStyle]}>
      <Pressable
        onPress={isError && onRetry ? onRetry : toggleTimestamp}
        onLongPress={isError && onRetry ? onRetry : undefined}
        accessibilityRole={isError ? 'button' : 'text'}
        accessibilityLabel={a11yLabel}
        accessibilityLiveRegion="polite"
      >
        <View
          style={[
            styles.bubble,
            isError ? styles.bubbleError : null,
          ]}
        >
          {/* KPI — optional Oswald hero number */}
          {!isError && displayChart && 'kpi' in displayChart && displayChart.kpi != null && (
            <Text style={styles.kpi} allowFontScaling>
              {displayChart.unit === 'EUR' ? '€' : ''}{displayChart.kpi.toFixed(2)}
            </Text>
          )}

          {/* Editorial body */}
          <Text
            style={[styles.text, isError ? styles.textError : null]}
            allowFontScaling
          >
            {displayText}
          </Text>

          {/* Mini chart */}
          {!isError && displayChart && <ChatMiniChart chart={displayChart} />}
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
    alignSelf: 'flex-start',
    maxWidth: '80%',
    marginBottom: SPACING.sm,
  },
  bubble: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: SPACING.md,
  },
  bubbleError: {
    backgroundColor: ERROR_BG,
    borderColor: ERROR_BORDER,
  },
  kpi: {
    ...TYPE.displayM,
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    fontVariant: ['tabular-nums'],
  },
  text: {
    ...TYPE.editorialBody,
    color: COLORS.textPrimary,
  },
  textError: {
    ...TYPE.uiLabel,
    color: COLORS.error,
  },
  timestamp: {
    alignSelf: 'flex-start',
    paddingLeft: 4,
    overflow: 'hidden',
  },
  timestampText: {
    ...TYPE.uiLabel,
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
