/**
 * ICON_REGISTRY — slug → React component map for the 30 hand-drawn
 * category icons (D-20). Each entry is a Skia-rendered Path component
 * accepting { color, size } props. Slugs are lowercase, no spaces.
 *
 * Consumed by:
 *   - IconPicker (renders all entries)
 *   - CategoryListRow (resolves a category's icon_slug to a component)
 *   - 02-03 RecategorizeBottomSheet (renders category chips)
 *
 * Keep alphabetical-ish but by intuitive grouping for IconPicker scroll order.
 */

import { Beauty } from './Beauty';
import { Bills } from './Bills';
import { Charity } from './Charity';
import { Clothing } from './Clothing';
import { Coffee } from './Coffee';
import { Education } from './Education';
import { Electronics } from './Electronics';
import { Entertainment } from './Entertainment';
import { Family } from './Family';
import { Fitness } from './Fitness';
import { Food } from './Food';
import { Fuel } from './Fuel';
import { Gifts } from './Gifts';
import { Groceries } from './Groceries';
import { Health } from './Health';
import { Hobbies } from './Hobbies';
import { Investments } from './Investments';
import { Misc } from './Misc';
import { Pets } from './Pets';
import { PublicTransport } from './PublicTransport';
import { Rent } from './Rent';
import { Restaurant } from './Restaurant';
import { Salary } from './Salary';
import { Savings } from './Savings';
import { Shopping } from './Shopping';
import { Subscriptions } from './Subscriptions';
import { Tax } from './Tax';
import { Transport } from './Transport';
import { Travel } from './Travel';
import { Utilities } from './Utilities';

export const ICON_REGISTRY = {
  food: Food,
  groceries: Groceries,
  restaurant: Restaurant,
  coffee: Coffee,
  transport: Transport,
  fuel: Fuel,
  'public-transport': PublicTransport,
  travel: Travel,
  bills: Bills,
  rent: Rent,
  utilities: Utilities,
  subscriptions: Subscriptions,
  shopping: Shopping,
  clothing: Clothing,
  electronics: Electronics,
  entertainment: Entertainment,
  hobbies: Hobbies,
  fitness: Fitness,
  beauty: Beauty,
  health: Health,
  education: Education,
  gifts: Gifts,
  charity: Charity,
  family: Family,
  pets: Pets,
  savings: Savings,
  salary: Salary,
  investments: Investments,
  tax: Tax,
  misc: Misc,
} as const;

export type IconSlug = keyof typeof ICON_REGISTRY;

/** All slugs in registry display order (used by IconPicker). */
export const ICON_SLUGS: readonly IconSlug[] = Object.keys(ICON_REGISTRY) as IconSlug[];

/**
 * Seed category slugs that have no dedicated component of their own. Migration
 * 002 backfills these slugs (groceries/transport/… → see schema.sql.ts), but
 * five of them never had a 1:1 icon: they fall back here to the closest
 * existing component instead of the Misc three-dots placeholder.
 *
 * Kept OUT of ICON_REGISTRY/ICON_SLUGS on purpose so IconPicker still shows
 * exactly the 30 canonical icons (no duplicate Restaurant/Family entries) and
 * IconSlug stays the canonical union. resolveIcon consults this on a miss.
 *
 * eating-out → restaurant and kids → family are exact; mobile/transfers/
 * refunds are approximate (no phone/transfer/refund art in v1 — polish later).
 */
export const SLUG_ALIASES: Readonly<Record<string, IconSlug>> = {
  'eating-out': 'restaurant',
  mobile: 'electronics',
  transfers: 'investments',
  refunds: 'salary',
  kids: 'family',
};
