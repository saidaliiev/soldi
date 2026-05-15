/**
 * ConfirmModal — shared destructive-confirm modal used by 02-04 (category
 * delete + merge) and reusable by 02-03.
 *
 * Layout (UI-SPEC §"Destructive Confirmations"):
 *   - Full-screen <Modal transparent animationType="fade">
 *   - Backdrop: COLORS.textPrimary @ 0.9
 *   - Centered card: COLORS.surface, RADIUS.lg, max-width 320pt, padding lg
 *   - Title: TYPE.displayM, COLORS.textPrimary
 *   - Body:  TYPE.editorialBody, COLORS.textSecondary, mt sm
 *   - Confirm button (full-width 48pt, RADIUS.lg): TYPE.uiButton, COLORS.white,
 *     bg COLORS.error when destructive=true else COLORS.accent
 *   - Cancel button below as text-only Pressable
 *
 * All copy is passed in by the caller — this is presentation-only; i18n
 * resolution happens at the call site.
 */

import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, AccessibilityInfo, findNodeHandle } from 'react-native';

import { COLORS, RADIUS, SPACING, SHADOWS } from '@design/tokens';
import { TYPE } from '@design/typography';

const BACKDROP = `${COLORS.textPrimary}E6`; // E6 = 90% opacity 8-bit hex

type Props = {
  readonly visible: boolean;
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly destructive?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  /** Optional accessibilityLabel for the confirm button (e.g. "Delete Coffee"). */
  readonly confirmAccessibilityLabel?: string;
  /**
   * D-09 / QUAL-03: optional ref to the element that triggered this modal.
   * On close (confirm or cancel), VoiceOver/TalkBack focus returns here so
   * users are never left in a dead end. If absent, Modal teardown returns
   * OS focus naturally.
   */
  readonly returnFocusRef?: React.RefObject<React.ElementRef<typeof View> | null>;
};

export function ConfirmModal({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
  confirmAccessibilityLabel,
  returnFocusRef,
}: Props): React.JSX.Element | null {
  // D-09 / QUAL-03: ref to the title so VoiceOver focus lands here on open.
  const titleRef = React.useRef<Text>(null);

  // Move VoiceOver/TalkBack focus to the modal title when the modal mounts.
  React.useEffect(() => {
    if (!visible) return;
    // Small defer so the Modal's native view is committed before we try to
    // resolve the node handle (RAF/setTimeout both work; setTimeout is simpler).
    const id = setTimeout(() => {
      const tag = findNodeHandle(titleRef.current);
      if (tag != null) {
        AccessibilityInfo.setAccessibilityFocus(tag);
      }
    }, 100);
    return () => clearTimeout(id);
  }, [visible]);

  // Return focus to the trigger on close.
  const handleClose = React.useCallback(
    (action: () => void) => () => {
      action();
      if (returnFocusRef?.current != null) {
        const tag = findNodeHandle(returnFocusRef.current);
        if (tag != null) {
          AccessibilityInfo.setAccessibilityFocus(tag);
        }
      }
    },
    [returnFocusRef],
  );

  if (!visible) return null;
  const confirmBg = destructive === true ? COLORS.error : COLORS.accent;
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose(onCancel)}
    >
      <View style={styles.backdrop} accessibilityViewIsModal>
        <View style={styles.card}>
          <Text ref={titleRef} style={styles.title} allowFontScaling accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.body} allowFontScaling>
            {body}
          </Text>
          <Pressable
            onPress={handleClose(onConfirm)}
            accessibilityRole="button"
            accessibilityLabel={confirmAccessibilityLabel ?? confirmLabel}
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: confirmBg },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.confirmLabel} allowFontScaling>
              {confirmLabel}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleClose(onCancel)}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
          >
            <Text style={styles.cancelLabel} allowFontScaling>
              {cancelLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: BACKDROP,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.modal,
  },
  title: {
    ...TYPE.displayM,
    color: COLORS.textPrimary,
  },
  body: {
    ...TYPE.editorialBody,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  confirmBtn: {
    height: 48,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  confirmLabel: {
    ...TYPE.uiButton,
    color: COLORS.white,
  },
  cancelBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  cancelLabel: {
    ...TYPE.uiBody,
    color: COLORS.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
});
