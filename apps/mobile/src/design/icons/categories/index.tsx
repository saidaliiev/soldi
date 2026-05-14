/**
 * Category icons barrel.
 *
 * Re-exports ICON_REGISTRY + IconSlug type + ICON_SLUGS array, plus a
 * `resolveIcon(slug)` helper that returns the matching component or the
 * Misc fallback for unknown slugs (used when a category has an
 * icon_slug that has been removed or never existed in the registry).
 *
 * Also re-exports the Wave 1 BaseCategoryIcon for code paths that still
 * reference the placeholder pattern (CategoryRow on dashboard).
 */

import React from 'react';

import { ICON_REGISTRY, ICON_SLUGS, type IconSlug } from './_iconRegistry';
import { Misc } from './Misc';

export { ICON_REGISTRY, ICON_SLUGS, type IconSlug };
export { BaseCategoryIcon } from './BaseCategoryIcon';
export { Misc as MiscIcon };

/**
 * Returns the icon component for a slug, falling back to Misc when the
 * slug is not registered. Never returns undefined — UI consumers can
 * render the result directly.
 */
export function resolveIcon(
  slug: string | null | undefined,
): React.FC<{ color: string; size?: number }> {
  if (slug == null) return Misc as React.FC<{ color: string; size?: number }>;
  const found = (ICON_REGISTRY as Record<string, React.FC<{ color: string; size?: number }>>)[slug];
  return found ?? (Misc as React.FC<{ color: string; size?: number }>);
}
