/**
 * ChatInputRow — bottom-anchored text input + send + mic row.
 *
 * UI-SPEC §ChatInputRow:
 * - Height 56pt + safe area; COLORS.surface bg; 1pt top border textMuted@20%
 * - TextInput flex-1; TYPE.uiBody; multiline up to 4 lines; blurOnSubmit=false
 * - MicButton: 40×40pt visible; disabled Phase 3 stub (shows toast on tap)
 * - SendButton: 40×40pt; RADIUS.pill; COLORS.accentSoft bg when active
 *   (gradient approximated; expo-linear-gradient not in deps)
 * - Send disabled when text empty or isLoading
 * - On send: appendUser → appendTyping → aiQuery → replaceTyping[Success|Error]
 * - Haptics.impactAsync('light') on send; Haptics.selectionAsync on mic stub tap
 * - Submit on return key: disabled (multiline; Return inserts newline)
 *
 * Timeout: if isAwaitingResponse for > 6000ms, replaceTypingWithError with error_timeout.
 */

import React from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { PaperPlane } from '@design/icons/system/PaperPlane';
import { MicMuted } from '@design/icons/system/MicMuted';
import { useChatStore } from './chatStore';
import { buildFactsPack } from './factsPackBuilder';

const BORDER_TOP = `${COLORS.textMuted}33`; // textMuted @ 20%
const TIMEOUT_MS = 6000;

type Props = {
  /** Initial text to pre-fill (from prompt chip tap). Cleared after consumption. */
  readonly prefillText?: string;
  readonly onPrefillConsumed?: () => void;
};

export function ChatInputRow({ prefillText, onPrefillConsumed }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [text, setText] = React.useState('');
  const inputRef = React.useRef<TextInput>(null);

  const appendUser = useChatStore((s) => s.appendUser);
  const appendTyping = useChatStore((s) => s.appendTyping);
  const replaceTypingWithAssistant = useChatStore((s) => s.replaceTypingWithAssistant);
  const replaceTypingWithError = useChatStore((s) => s.replaceTypingWithError);
  const setError = useChatStore((s) => s.setError);
  const resetRetry = useChatStore((s) => s.resetRetry);
  const setLastFactsPack = useChatStore((s) => s.setLastFactsPack);
  const isAwaitingResponse = useChatStore((s) => s.isAwaitingResponse);
  const messages = useChatStore((s) => s.messages);

  // Prefill from prompt chip
  React.useEffect(() => {
    if (prefillText && prefillText.length > 0) {
      setText(prefillText);
      onPrefillConsumed?.();
      // Submit automatically after a short tick so state settles
      const timer = setTimeout(() => {
        handleSend(prefillText);
      }, 50);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillText]);

  const sendScale = useSharedValue(1);
  const sendAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  const isEmpty = text.trim().length === 0;
  const isDisabled = isEmpty || isAwaitingResponse;

  const handleSend = React.useCallback(
    (overrideText?: string): void => {
      const messageText = (overrideText ?? text).trim();
      if (messageText.length === 0 || isAwaitingResponse) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setText('');

      appendUser(messageText);
      const typingId = appendTyping();
      resetRetry();
      setError(null);

      // Build facts pack from current DB state
      const factsPack = buildFactsPack();
      setLastFactsPack(factsPack);

      // Build history from existing messages (exclude typing bubbles)
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .filter(
          (m): m is Extract<typeof m, { role: 'user' | 'assistant' }> =>
            m.role === 'user' || m.role === 'assistant',
        )
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          text: m.role === 'user'
            ? (m as Extract<typeof m, { role: 'user' }>).text
            : (m as Extract<typeof m, { role: 'assistant' }>).text,
        }));

      // Dynamic import to avoid circular at module level
      import('@services/aiQuery')
        .then(({ aiQuery }) => {
          // 6s timeout guard
          let timedOut = false;
          const timeoutHandle = setTimeout(() => {
            timedOut = true;
            replaceTypingWithError(typingId, t('chat:error_timeout'));
            setError(t('chat:error_timeout'));
          }, TIMEOUT_MS);

          aiQuery({ message: messageText, history, factsPack })
            .then((resp) => {
              clearTimeout(timeoutHandle);
              if (timedOut) return;
              const assistantMsg = {
                id: typingId,
                role: 'assistant' as const,
                text: resp.text,
                chart: resp.chart,
                createdAt: Date.now(),
              };
              replaceTypingWithAssistant(typingId, assistantMsg);
              setError(null);
            })
            .catch((err: unknown) => {
              clearTimeout(timeoutHandle);
              if (timedOut) return;
              const msg =
                err instanceof Error ? err.message : t('chat:error_unavailable');
              replaceTypingWithError(typingId, msg);
              setError(msg);
            });
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : t('chat:error_unavailable');
          replaceTypingWithError(typingId, msg);
          setError(msg);
        });
    },
    [
      text,
      isAwaitingResponse,
      messages,
      appendUser,
      appendTyping,
      replaceTypingWithAssistant,
      replaceTypingWithError,
      setError,
      resetRetry,
      setLastFactsPack,
      t,
    ],
  );

  const handlePressIn = (): void => {
    if (isDisabled) return;
    sendScale.value = withTiming(0.92, { duration: 50 });
  };

  const handlePressOut = (): void => {
    sendScale.value = withTiming(1, { duration: 70 });
  };

  const handleMicPress = (): void => {
    Haptics.selectionAsync().catch(() => {});
    Alert.alert('', t('chat:voice_coming_soon'));
  };

  const bottomPad = Platform.OS === 'ios' ? insets.bottom : SPACING.sm;

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <View style={styles.row}>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder={t('chat:input_placeholder')}
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
          multiline
          maxLength={500}
          blurOnSubmit={false}
          returnKeyType="default"
          textAlignVertical="center"
          accessibilityLabel="Question"
          accessibilityHint="Type a question about your spending"
          allowFontScaling
        />

        {/* Mic stub — disabled Phase 3 */}
        <Pressable
          onPress={handleMicPress}
          hitSlop={2}
          accessibilityRole="button"
          accessibilityLabel={t('chat:voice_a11y')}
          accessibilityHint="Voice input is coming in a future update"
          accessibilityState={{ disabled: true }}
          style={styles.micButton}
        >
          <MicMuted size={20} color={COLORS.textMuted} />
        </Pressable>

        {/* Send button */}
        <Animated.View style={sendAnimStyle}>
          <Pressable
            onPress={() => handleSend()}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isDisabled}
            hitSlop={2}
            accessibilityRole="button"
            accessibilityLabel={t('chat:send_a11y')}
            accessibilityState={{ disabled: isDisabled }}
            style={[
              styles.sendButton,
              isDisabled ? styles.sendButtonDisabled : styles.sendButtonActive,
            ]}
          >
            <PaperPlane
              size={18}
              color={isDisabled ? `${COLORS.white}99` : COLORS.white}
            />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: BORDER_TOP,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    minHeight: 56,
  },
  input: {
    ...TYPE.uiBody,
    flex: 1,
    color: COLORS.textPrimary,
    backgroundColor: 'transparent',
    maxHeight: 22 * 4 + SPACING.sm * 2, // 4 lines × lineHeight + padding
    paddingVertical: 0,
  },
  micButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: COLORS.accentSoft,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
});
