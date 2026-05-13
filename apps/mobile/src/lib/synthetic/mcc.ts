/**
 * SOLDI MCC → category slug mapping.
 *
 * ISO 18245 Merchant Category Codes mapped to the 18 SOLDI category slugs.
 * Used by both the synthetic generator and the monobank transaction mapper.
 *
 * Slug literals match SOLDI's seeded categories (name_en in categories table).
 * See src/lib/db/schema.sql.ts → SEED_DEFAULT_CATEGORIES for canonical mapping.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Literal union of the 18 default category slugs seeded by migration 001.
 * Order matches the INSERT order in SEED_DEFAULT_CATEGORIES.
 */
export type CategorySlug =
  | 'groceries'
  | 'transport'
  | 'eating-out'
  | 'coffee'
  | 'rent'
  | 'utilities'
  | 'mobile'
  | 'entertainment'
  | 'health'
  | 'clothing'
  | 'gifts'
  | 'transfers'
  | 'salary'
  | 'refunds'
  | 'savings'
  | 'kids'
  | 'pets'
  | 'misc';

// ---------------------------------------------------------------------------
// MCC → CategorySlug map
// ---------------------------------------------------------------------------

/**
 * Maps ISO 18245 MCC codes to SOLDI category slugs.
 * Covers the most common codes seen in Irish and Ukrainian card spending.
 * Falls back to 'misc' for unmapped codes (via categoryForMcc).
 */
export const MCC_TO_CATEGORY: ReadonlyMap<number, CategorySlug> = new Map<number, CategorySlug>([
  // Groceries & food retail
  [5411, 'groceries'],  // Grocery stores, supermarkets
  [5412, 'groceries'],  // Convenience stores
  [5422, 'groceries'],  // Freezer / meat provisioners
  [5441, 'groceries'],  // Candy, nut, confectionery stores
  [5451, 'groceries'],  // Dairy product stores
  [5462, 'groceries'],  // Bakeries
  [5499, 'groceries'],  // Misc food stores (deli, ethnic, specialty)

  // Eating out & dining
  [5812, 'eating-out'], // Eating places, restaurants
  [5813, 'eating-out'], // Bars, cocktail lounges
  [5814, 'coffee'],     // Fast food restaurants (also catches coffee chains)
  [5921, 'eating-out'], // Package stores, beer, wine, liquor

  // Transport
  [4111, 'transport'],  // Local/suburban commuter passenger transit
  [4112, 'transport'],  // Passenger railways
  [4121, 'transport'],  // Taxi cabs, limo services
  [4131, 'transport'],  // Bus lines
  [4215, 'transport'],  // Courier services (Nova Poshta etc.)
  [4411, 'transport'],  // Cruise lines
  [5541, 'transport'],  // Service stations, auto fuel
  [5542, 'transport'],  // Automated fuel dispensers
  [7523, 'transport'],  // Auto parking lots and garages
  [7011, 'entertainment'], // Hotels, resorts

  // Utilities
  [4900, 'utilities'],  // Utilities (electric, gas, water)
  [4911, 'utilities'],  // Electric + other utility services
  [9311, 'utilities'],  // Tax payments

  // Mobile / telecom
  [4814, 'mobile'],     // Telecommunication services
  [4812, 'mobile'],     // Telephone equipment
  [4899, 'mobile'],     // Cable and other pay-TV / radio services (streaming)
  [5815, 'mobile'],     // Digital goods: media, books (Spotify, streaming)

  // Entertainment
  [7832, 'entertainment'], // Motion picture theatres
  [7841, 'entertainment'], // Video game arcades and shops
  [7922, 'entertainment'], // Theatrical producers, ticket agencies
  [7929, 'entertainment'], // Bands, orchestras, misc entertainment
  [7993, 'entertainment'], // Video game supply stores
  [7994, 'entertainment'], // Video game arcades
  [7995, 'entertainment'], // Gambling / lottery / betting

  // Health
  [5912, 'health'],     // Drug stores, pharmacies
  [5047, 'health'],     // Medical, dental, ophthalmic equipment
  [5122, 'health'],     // Drugs, drug proprietors, sundries
  [8011, 'health'],     // Doctors, physicians
  [8021, 'health'],     // Dentists
  [8049, 'health'],     // Chiropodists, podiatrists
  [8099, 'health'],     // Health practitioners, misc

  // Clothing & apparel
  [5600, 'clothing'],   // Apparel and accessory stores
  [5621, 'clothing'],   // Women's ready-to-wear stores
  [5631, 'clothing'],   // Women's accessories, specialty shops
  [5641, 'kids'],       // Children's, infants' clothing shops
  [5651, 'clothing'],   // Family clothing stores (Penneys, H&M)
  [5661, 'clothing'],   // Shoe stores
  [5691, 'clothing'],   // Men's, women's clothing stores
  [5699, 'clothing'],   // Misc apparel
  [5311, 'clothing'],   // Department stores (M&S etc. — broad catchall)

  // Gifts
  [5947, 'gifts'],      // Gift, card, novelty, souvenir shops
  [5999, 'gifts'],      // Misc retail stores
  [7399, 'gifts'],      // Business services (flowers, gifts online)

  // Transfers & financial
  [4829, 'transfers'],  // Wire transfers
  [6010, 'transfers'],  // Manual cash disbursements
  [6011, 'transfers'],  // ATM cash advances
  [6051, 'transfers'],  // Non-financial institutions: currency exchanges
  [6300, 'savings'],    // Insurance sales / underwriting
  [6411, 'savings'],    // Insurance agents, brokers

  // Salary (incoming)
  [6012, 'salary'],     // Financial institutions — merchandise
  [6099, 'salary'],     // Financial institutions (other)

  // Refunds
  [4722, 'refunds'],    // Travel agencies, tour operators
  [5200, 'misc'],       // Home supply / hardware (catch-all for Epicenter UA)

  // Kids
  [5945, 'kids'],       // Hobby, toy, and game shops

  // Pets
  [5995, 'pets'],       // Pet shops, pet food, and pet supplies

  // Electronics (mapping to misc — broad category)
  [5732, 'misc'],       // Electronics stores (Apple, Rozetka, Comfy)
  [5734, 'misc'],       // Computer and software stores
  [5045, 'misc'],       // Computers, peripherals, software (B2B)
]);

// ---------------------------------------------------------------------------
// Lookup function
// ---------------------------------------------------------------------------

/**
 * Returns the CategorySlug for a given MCC code.
 *
 * Falls back to the provided fallback slug ('misc' by default) if the MCC is
 * not in the map. This is intentional — monobank sends unknown MCC codes.
 */
export function categoryForMcc(mcc: number, fallback: CategorySlug = 'misc'): CategorySlug {
  return MCC_TO_CATEGORY.get(mcc) ?? fallback;
}
