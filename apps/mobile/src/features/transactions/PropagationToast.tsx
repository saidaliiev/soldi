/**
 * PropagationToast — bottom-anchored confirmation that an AI propagation event
 * updated similar transactions (CAT-04 user feedback).
 *
 * UI-SPEC §PropagationToast:
 *   - Bottom of screen, width = screen − 2 × SPACING.md, height 56pt, RADIUS.md
 *   - Background COLORS.surface; 2pt vertical stripe on left edge = COLORS.success
 *   - Body text TYPE.uiLabel COLORS.textPrimary, pluralized via chat namespace
 *   - Right-aligned Undo (Manrope 600, COLORS.accent, 44×44pt hit target)
 *   - Appears with translateY 60→0 withSpring(damping=16) + Haptics.impactAsync('medium')
 *   - Auto-dismiss 4000ms via withTiming(translateY:60, opacity:0) 250ms
 *   - Undo: Haptics.notificationAsync('warning'), rollback(), fade 150ms
 *
 * Security: never console.log merchant data; toast only shows a count.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS, SHADOWS } from '@design/tokens';
import { TYPE } from '@design/typography';

import { usePropagationStore } from './propagationStore';

const AUTO_DISMISS_MS = 4000;
const FADE_OUT_MS = 250;
const UNDO_FADE_MS = 150;
const HIDDEN_TRANSLATE_Y = 60;

export function PropagationToast(): React.JSX.Element {
  const { t } = useTranslation();
  const visible = usePropagationStore((s) => s.visible);
  const count = usePropagationStore((s) => s.count);
  const rollback = usePropagationStore((s) => s.rollback);
  const nonce = usePropagationStore((s) => s.nonce);
  const dismiss = usePropagationStore((s) => s.dismiss);

  const translateY = useSharedValue(HIDDEN_TRANSLATE_Y);
  const opacity = useSharedValue(0);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    // Cancel any existing auto-dismiss timer when state changes.
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (visible) {
      translateY.value = withSpring(0, { damping: 16, stiffness: 180 });
      opacity.value = withTiming(1, { duration: 180 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
        // Haptics may not be available on simulator — never fail the UI on this.
      });

      timerRef.current = setTimeout(() => {
        translateY.value = withTiming(HIDDEN_TRANSLATE_Y, { duration: FADE_OUT_MS });
        opacity.value = withTiming(0, { duration: FADE_OUT_MS }, (finished) => {
          if (finished) runOnJS(dismiss)();
        });
      }, AUTO_DISMISS_MS);
    } else {
      translateY.value = HIDDEN_TRANSLATE_Y;
      opacity.value = 0;
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // The nonce dependency intentionally re-runs the spring + timer when a
    // second propagation fires while the first is still on-screen (stack
    // behavior: replace, not stack — per UI-SPEC).
  }, [visible, nonce, dismiss, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleUndo = React.useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {
      // Haptics may not be available — never fail the UI.
    });
    try {
      rollback?.();
    } catch {
      // DB rollback failure is non-fatal — toast still dismisses gracefully.
    }
    translateY.value = withTiming(HIDDEN_TRANSLATE_Y, { duration: UNDO_FADE_MS });
    opacity.value = withTiming(0, { duration: UNDO_FADE_MS }, (finished) => {
      if (finished) runOnJS(dismiss)();
    });
  }, [rollback, dismiss, translateY, opacity]);

  // Keep the component mounted across visibility transitions so the fade-out
  // animation can run; pointer-events on the container guard interaction.

  const message =
    count === 1
      ? t('chat.propagation_one')
      : t('chat.propagation_many', { count });

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.stripe} />
      <Text style={styles.body} numberOfLines={1} allowFontScaling>
        {message}
      </Text>
      <Pressable
        onPress={handleUndo}
        accessibilityRole="button"
        accessibilityLabel="Undo updates"
        accessibilityHint="Reverts the auto-applied category changes"
        hitSlop={12}
        style={styles.undoTarget}
      >
        <Text style={styles.undoLabel} allowFontScaling>
          {t('chat.propagation_undo')}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...SHADOWS.modal,
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.success,
  },
  body: {
    ...TYPE.uiLabel,
    color: COLORS.textPrimary,
    flex: 1,
  },
  undoTarget: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: SPACING.sm,
  },
  undoLabel: {
    ...TYPE.uiLabel,
    fontWeight: '600',
    color: COLORS.accent,
  },
});
