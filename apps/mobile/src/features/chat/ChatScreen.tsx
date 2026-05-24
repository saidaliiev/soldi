/**
 * ChatScreen — full-screen Chat tab surface (HTML §7).
 *
 * Replaces the chat-FAB-and-bottom-sheet entry point: Chat is now a
 * first-class tab destination per the docs/design/soldify-screens.html
 * §2 tab bar (Overview / Activity / Jars / Chat).
 *
 * Composition (reuses the chat feature primitives that ChatBottomSheet
 * also uses, so a single source of truth for bubbles/input/error):
 *   - In-body Oswald title (matches the Transactions/Settings pattern —
 *     native stack header is hidden via _layout.tsx)
 *   - ChatEmptyState when no messages; ChatMessageList otherwise
 *   - ChatErrorBanner anchored between list and input
 *   - ChatInputRow anchored bottom with safe-area + tab-bar clearance
 *   - KeyboardAvoidingView padding behavior on iOS
 *
 * Accessibility: header labelled, message list role=list (in
 * ChatMessageList), input row has its own labels.
 */

import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';

import { useChatStore } from './chatStore';
import { ChatEmptyState } from './ChatEmptyState';
import { ChatMessageList } from './ChatMessageList';
import { ChatInputRow } from './ChatInputRow';
import { ChatErrorBanner } from './ChatErrorBanner';

export function ChatScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const messages = useChatStore((s) => s.messages);
  const lastError = useChatStore((s) => s.lastError);

  const [prefillText, setPrefillText] = React.useState<string | undefined>(undefined);

  const handlePromptSubmit = React.useCallback((prompt: string) => {
    setPrefillText(prompt);
  }, []);

  const handlePrefillConsumed = React.useCallback(() => {
    setPrefillText(undefined);
  }, []);

  const handleRetryAssistant = React.useCallback((): void => {
    useChatStore.getState().retryLast().catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.safe} accessibilityLabel={t('chat.sheet_title')}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header} accessibilityRole="header">
          <Text style={styles.title} allowFontScaling numberOfLines={1}>
            {t('chat.sheet_title')}
          </Text>
        </View>

        <View style={styles.body}>
          {messages.length === 0 ? (
            <ChatEmptyState onSubmitPrompt={handlePromptSubmit} />
          ) : (
            <ChatMessageList
              messages={messages}
              onRetryAssistant={handleRetryAssistant}
            />
          )}
        </View>

        <ChatErrorBanner visible={lastError != null} />

        <ChatInputRow
          prefillText={prefillText}
          onPrefillConsumed={handlePrefillConsumed}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: {
    ...TYPE.displayM,
    color: COLORS.textPrimary,
  },
  body: {
    flex: 1,
  },
});
