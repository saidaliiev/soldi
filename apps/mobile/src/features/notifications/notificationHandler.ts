/**
 * SOLDI notification handler — Phase 5 plan 05-02.
 *
 * Registers a foreground presentation handler so notifications display as
 * banners while the app is open. Must be imported for side-effect at app
 * startup (app/_layout.tsx) — before any notification can fire.
 *
 * Sound is intentionally off (ASVS L1 minimal intrusion; user can override
 * via iOS system settings). Badge count is not managed here.
 */

import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
