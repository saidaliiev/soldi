/**
 * ChatBottomSheet — primary chat surface, pull-up 85% sheet.
 *
 * UI-SPEC §ChatBottomSheet:
 * - Reuses BottomSheetPrimitive (NOT @gorhom/bottom-sheet; Expo Go compatible)
 * - snapPoints ['85%']; COLORS.surface bg; RADIUS.xl top corners
 * - Backdrop COLORS.textPrimary@50% (lighter than Phase 1's 0.9)
 * - Header 56pt: "Ask SOLDI" TYPE.displayM left + close × button right
 * - Body: ChatEmptyState when messages.length===0, else ChatMessageList
 * - ChatErrorBanner anchored between list and input row
 * - ChatInputRow anchored bottom above safe area
 * - KeyboardAvoidingView behavior=padding on iOS
 * - accessibilityViewIsModal on sheet root (handled by BottomSheetPrimitive)
 *
 * State: useChatStore.isOpen → open/close imperative bridge via ref.
 *
 * Backdrop alpha: BottomSheetPrimitive hardcodes 0x90 (~56%). To match
 * UI-SPEC 0.5 more precisely we accept that minor delta — the primitive's
 * backdrop is close enough and overriding it requires forking the component.
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import {
  BottomSheetPrimitive,
  type BottomSheetPrimitiveRef,
} from '@/src/components/BottomSheet/BottomSheetPrimitive';
import { useChatStore } from './chatStore';
import { ChatEmptyState } from './ChatEmptyState';
import { ChatMessageList } from './ChatMessageList';
import { ChatInputRow } from './ChatInputRow';
import { ChatErrorBanner } from './ChatErrorBanner';

const SNAP_POINTS = ['85%'] as const;
const HEADER_BORDER = `${COLORS.textMuted}26`; // textMuted @ 15%

export function ChatBottomSheet(): React.JSX.Element {
  const { t } = useTranslation();
  const isOpen = useChatStore((s) => s.isOpen);
  const close = useChatStore((s) => s.close);
  const messages = useChatStore((s) => s.messages);
  const lastError = useChatStore((s) => s.lastError);

  const sheetRef = React.useRef<BottomSheetPrimitiveRef>(null);
  const [prefillText, setPrefillText] = React.useState<string | undefined>(undefined);

  // Imperative bridge: sync Zustand isOpen → BottomSheetPrimitive ref
  React.useEffect(() => {
    if (isOpen) {
      sheetRef.current?.open();
    } else {
      sheetRef.current?.close();
    }
  }, [isOpen]);

  const handlePromptSubmit = React.useCallback((prompt: string) => {
    setPrefillText(prompt);
  }, []);

  const handlePrefillConsumed = React.useCallback(() => {
    setPrefillText(undefined);
  }, []);

  const handleRetryAssistant = React.useCallback((): void => {
    // ChatErrorBanner handles retryLast; individual bubble retry is secondary.
    // For now, tap on error bubble triggers the same retryLast flow.
    useChatStore.getState().retryLast().catch(() => {});
  }, []);

  return (
    <BottomSheetPrimitive
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      glassSurface
      onChange={(index) => {
        // index === 0 means sheet was dragged closed
        if (index === 0 && isOpen) {
          close();
        }
      }}
      accessibilityLabel={t('chat:sheet_title')}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header} accessibilityRole="header">
          <Text style={styles.headerTitle} allowFontScaling>
            {t('chat:sheet_title')}
          </Text>
          <Pressable
            onPress={close}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('chat:close_a11y')}
            style={styles.closeButton}
          >
            <Text style={styles.closeIcon} allowFontScaling={false}>
              ×
            </Text>
          </Pressable>
        </View>

        {/* Body */}
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

        {/* Error banner */}
        <ChatErrorBanner visible={lastError != null} />

        {/* Input row */}
        <ChatInputRow
          prefillText={prefillText}
          onPrefillConsumed={handlePrefillConsumed}
        />
      </KeyboardAvoidingView>
    </BottomSheetPrimitive>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: HEADER_BORDER,
  },
  headerTitle: {
    ...TYPE.displayM,
    color: COLORS.textPrimary,
    flex: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 24,
    lineHeight: 28,
    color: COLORS.textSecondary,
    fontFamily: undefined, // system font — × is universal
  },
  body: {
    flex: 1,
    borderRadius: RADIUS.lg,
  },
});
