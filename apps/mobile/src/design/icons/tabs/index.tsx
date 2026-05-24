/**
 * Tab icons barrel — re-exports the four tab bar icons.
 *
 * HTML design (docs/design/soldify-screens.html §2) tabs:
 *   Overview / Activity / Jars / Chat
 * CategoriesIcon is kept exported for the now-internal /categories route
 * still reached from Settings → "Manage categories".
 *
 * Consumed by src/features/chrome/GlassTabBar.tsx ICONS allow-list.
 */

export { DashboardIcon } from './DashboardIcon';
export { TransactionsIcon } from './TransactionsIcon';
export { CategoriesIcon } from './CategoriesIcon';
// Phase 4 plan 04-01 — Jars tab icon (jar/pot motif, Skia SVG path)
export { JarsIcon } from '@design/icons/jars';
// Chat tab icon — speech bubble per HTML §2 reference
export { ChatIcon } from './ChatIcon';
