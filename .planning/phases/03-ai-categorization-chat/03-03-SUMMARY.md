---
phase: 03-ai-categorization-chat
plan: "03"
subsystem: chat-ui
tags:
  - ai
  - chat
  - bottom-sheet
  - skia
  - flash-list
  - reanimated
dependency_graph:
  requires:
    - 03-01  # ai-query Edge Function + Supabase client
    - 03-02  # merchant_overrides propagation (RecategorizeBottomSheet analog)
  provides:
    - chat surface (ChatBottomSheet + ChatLaunchFAB)
    - CHAT-01 (FAB → sheet)
    - CHAT-02 (message flow + 6s timeout)
    - CHAT-03 (mini Skia charts in bubbles)
    - CHAT-04 (leak detector pre-render guard)
  affects:
    - app/_layout.tsx (ChatBottomSheet portal)
    - app/(tabs)/index.tsx (ChatLaunchFAB overlay)
tech_stack:
  added: []
  patterns:
    - BottomSheetPrimitive (reuse, no @gorhom)
    - FlashList v2 (no estimatedItemSize — removed in v2)
    - Reanimated v4 useReducedMotion for a11y
    - Dynamic import of aiQuery in ChatInputRow (avoids circular at module level)
    - Alert for voice stub (Phase 5)
key_files:
  created:
    - apps/mobile/src/features/chat/ChatLaunchFAB.tsx
    - apps/mobile/src/features/chat/ChatBottomSheet.tsx
    - apps/mobile/src/features/chat/ChatEmptyState.tsx
    - apps/mobile/src/features/chat/PromptSuggestionChip.tsx
    - apps/mobile/src/features/chat/ChatMessageList.tsx
    - apps/mobile/src/features/chat/ChatBubbleAssistantTyping.tsx
    - apps/mobile/src/features/chat/ChatInputRow.tsx
    - apps/mobile/src/features/chat/ChatErrorBanner.tsx
  modified:
    - apps/mobile/app/(tabs)/index.tsx
    - apps/mobile/app/_layout.tsx
    - apps/mobile/src/features/chat/ChatMiniChart.tsx
decisions:
  - "FlashList v2 dropped estimatedItemSize — prop does not exist; removed without replacement"
  - "expo-linear-gradient absent from deps; FAB/send gradient approximated with COLORS.accentSoft solid; Phase 5 can wire Skia LinearGradient paint"
  - "BottomSheetPrimitive reused (not @gorhom/bottom-sheet) — Expo Go compatible; 03-UI-SPEC §ChatBottomSheet references @gorhom but 03-PATTERNS.md mandates BottomSheetPrimitive"
  - "aiQuery dynamic-imported in ChatInputRow to avoid circular module reference (chatStore imports aiQuery; ChatInputRow imports chatStore)"
  - "ChatMiniChart unused Reanimated imports fixed (Rule 1) — entrance animation stubs were prepared but not wired; Phase 5 can activate"
metrics:
  duration: "resumed session; Task 3 ~90min"
  completed_date: "2026-05-15"
  tasks_completed: 3
  files_modified: 11
---

# Phase 3 Plan 03: Chat UI Surfaces Summary

Chat bottom-sheet surface with FAB launcher, FlashList message list, typing indicator, editorial bubbles, Skia mini-charts, error banner, and dashboard wiring — all per 03-UI-SPEC.

## What Was Built

**Task 1** (prior session, `2e415d5`): ai-query Edge Function, closed-enum facts-runner, chat schemas.

**Task 2** (prior session, `ce3c6e6`): Mobile chat plumbing — aiQuery service, chatStore, factsPackBuilder, leakDetector, i18n strings, system icons, illustrations.

**Task 3** (this session, `7c01254`):
- `ChatLaunchFAB` — 56pt gradient FAB, spring entrance (200ms delay), scroll-hide prop wired (Phase 5 SharedValue hookup flagged)
- `ChatBottomSheet` — 85% BottomSheetPrimitive, "Ask SOLDI" header, close ×, body switching EmptyState↔MessageList, error banner + input row anchored
- `ChatEmptyState` — open-book illustration + editorial italic phrase + 3 PromptSuggestionChips
- `PromptSuggestionChip` — 36pt pill, Haptics.selectionAsync, immediate submit
- `ChatMessageList` — FlashList v2, auto-scroll-to-end, per-role render dispatch
- `ChatBubbleAssistantTyping` — 3 staggered breath dots (150ms stagger), reduced-motion static "…"
- `ChatInputRow` — multiline TextInput, disabled mic stub (Alert toast), send button with 6s timeout guard
- `ChatErrorBanner` — slide-in/out, retryLast + bumpRetry, copy switches at retryCount≥1
- `app/(tabs)/index.tsx` wiring — `<ChatLaunchFAB />` absolute overlay
- `app/_layout.tsx` wiring — `<ChatBottomSheet />` alongside RecategorizeBottomSheet

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FlashList v2 removed `estimatedItemSize` prop**
- **Found during:** Task 3 — tsc error TS2322
- **Issue:** FlashList v2.0.2 dropped `estimatedItemSize`; it no longer exists in `FlashListProps`
- **Fix:** Removed prop entirely; v2 handles layout sizing internally
- **Files modified:** `ChatMessageList.tsx`
- **Commit:** 7c01254

**2. [Rule 1 - Bug] expo-linear-gradient absent from project deps**
- **Found during:** Task 3 — dependency scan
- **Issue:** 03-UI-SPEC references `LinearGradient` but `expo-linear-gradient` is not in `package.json`
- **Fix:** FAB gradient approximated with `COLORS.accentSoft` solid fill (midpoint of `#D9997A→#C97B5C`); flagged in code comment for Phase 5 Skia LinearGradient upgrade
- **Files modified:** `ChatLaunchFAB.tsx`
- **Commit:** 7c01254

**3. [Rule 1 - Bug] ChatMiniChart unused Reanimated imports (pre-committed wip)**
- **Found during:** `expo lint` — 10 warnings all in ChatMiniChart.tsx (commit 98c7064)
- **Issue:** Reanimated entrance animation imports prepared but never wired; `cx` variable unused; `Array<T>` instead of `T[]`
- **Fix:** Removed unused imports and variable; fixed array type syntax
- **Files modified:** `ChatMiniChart.tsx`
- **Commit:** 7c01254

**4. [Rule 1 - Bug] Dynamic import required for aiQuery in ChatInputRow**
- **Found during:** Architecture review before writing
- **Issue:** chatStore.ts already imports aiQuery.ts; ChatInputRow imports chatStore — circular if it also imports aiQuery statically
- **Fix:** Used `import('@services/aiQuery')` dynamic import in send handler
- **Files modified:** `ChatInputRow.tsx`
- **Commit:** 7c01254

## Verification Results

```
npx tsc --noEmit          → exit 0
npx expo lint             → exit 0 (0 errors, 0 warnings)
jest (chatChartGeometry)  → SKIPPED — no jest harness in this repo (known infra gap, memory jest-harness-missing)
color gate                → PASS — 0 raw hex values in style code; 3 matches are comment-only
@gorhom in package.json   → PASS — not present (exit 1 = not found)
```

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `scrollY` prop always `undefined` on FAB | `app/(tabs)/index.tsx` | Dashboard uses regular `ScrollView`, not Reanimated `ScrollView`; SharedValue scroll tracking deferred to Phase 5 |
| `ChatLaunchFAB` gradient is `COLORS.accentSoft` solid | `ChatLaunchFAB.tsx` | `expo-linear-gradient` not in deps; visually close to spec; Phase 5 Skia paint upgrade |
| Mic button fires `Alert` | `ChatInputRow.tsx` | Voice input deferred to Phase 5 per ROADMAP |
| Skia entrance animation on ChatMiniChart | `ChatMiniChart.tsx` | Animation stubs removed (unused); Phase 5 can wire withDelay Skia progress |

## Self-Check

- [x] `ChatLaunchFAB.tsx` — exists at `apps/mobile/src/features/chat/ChatLaunchFAB.tsx`
- [x] `ChatBottomSheet.tsx` — exists
- [x] `ChatEmptyState.tsx` — exists
- [x] `PromptSuggestionChip.tsx` — exists
- [x] `ChatMessageList.tsx` — exists
- [x] `ChatBubbleAssistantTyping.tsx` — exists
- [x] `ChatInputRow.tsx` — exists
- [x] `ChatErrorBanner.tsx` — exists
- [x] `app/(tabs)/index.tsx` — modified, ChatLaunchFAB mounted
- [x] `app/_layout.tsx` — modified, ChatBottomSheet mounted
- [x] Task 3 commit `7c01254` — verified in git log

## Self-Check: PASSED
