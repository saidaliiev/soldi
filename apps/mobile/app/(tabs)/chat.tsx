/**
 * Chat tab route — full-screen AI chat surface (HTML §7).
 *
 * Mounted as the fourth tab per the design reference (Overview / Activity /
 * Jars / Chat). The previous chat-FAB + ChatBottomSheet pattern is being
 * phased out in favour of this first-class tab destination; ChatBottomSheet
 * remains mounted at the root layout for now to avoid disrupting the
 * existing useChatStore.open() call-sites (Dashboard chip taps), but
 * future cleanup removes the FAB once all entry points route here.
 */

import React from 'react';

import { ChatScreen } from '@/src/features/chat/ChatScreen';

export default function ChatTab(): React.JSX.Element {
  return <ChatScreen />;
}
