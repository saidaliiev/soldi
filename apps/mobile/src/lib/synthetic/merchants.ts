/**
 * SOLDI synthetic merchant seed data.
 *
 * Two regions: IE (Ireland) and UA (Ukraine).
 * Generator picks IE:UA at approximately 70:30 by default.
 *
 * Each merchant has:
 * - name: display name shown in transaction list
 * - mcc: ISO 18245 merchant category code
 * - min / max: spending range in the merchant's local currency (float EUR or UAH)
 * - currency: 'EUR' for IE merchants, 'UAH' for UA merchants
 * - region: 'IE' or 'UA'
 * - weight (optional): relative pick probability within the region list (default 1)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Region = 'IE' | 'UA';

export type MerchantSeed = {
  /** Display name of the merchant. */
  name: string;
  /** ISO 18245 Merchant Category Code. */
  mcc: number;
  /** Minimum transaction amount in merchant currency (float, pre-toCents). */
  min: number;
  /** Maximum transaction amount in merchant currency (float, pre-toCents). */
  max: number;
  /** Currency of the amount range. */
  currency: 'EUR' | 'UAH';
  /** Region tag — used by generator to split IE:UA pools. */
  region: Region;
  /** Relative pick probability. Defaults to 1 if omitted. */
  weight?: number;
};

// ---------------------------------------------------------------------------
// Irish (IE) merchant list
// ---------------------------------------------------------------------------

export const IE_MERCHANTS: ReadonlyArray<MerchantSeed> = [
  // --- Groceries ---
  { name: 'Tesco', mcc: 5411, min: 8, max: 90, currency: 'EUR', region: 'IE', weight: 3 },
  { name: 'Dunnes Stores', mcc: 5411, min: 5, max: 120, currency: 'EUR', region: 'IE', weight: 3 },
  { name: 'Lidl', mcc: 5411, min: 4, max: 60, currency: 'EUR', region: 'IE', weight: 3 },
  { name: 'Aldi', mcc: 5411, min: 6, max: 70, currency: 'EUR', region: 'IE', weight: 2 },
  { name: 'SuperValu', mcc: 5411, min: 6, max: 95, currency: 'EUR', region: 'IE', weight: 2 },
  { name: 'Centra', mcc: 5499, min: 3, max: 25, currency: 'EUR', region: 'IE', weight: 2 },
  { name: 'Spar', mcc: 5499, min: 2, max: 20, currency: 'EUR', region: 'IE', weight: 2 },
  // --- Coffee & fast food ---
  { name: 'Starbucks', mcc: 5814, min: 3.5, max: 7, currency: 'EUR', region: 'IE', weight: 2 },
  { name: 'Insomnia Coffee', mcc: 5814, min: 3, max: 6, currency: 'EUR', region: 'IE', weight: 2 },
  { name: 'Butlers Chocolate Cafe', mcc: 5814, min: 4, max: 8, currency: 'EUR', region: 'IE', weight: 1 },
  { name: 'Boojum', mcc: 5814, min: 9, max: 14, currency: 'EUR', region: 'IE', weight: 2 },
  { name: "Eddie Rocket's", mcc: 5812, min: 12, max: 25, currency: 'EUR', region: 'IE', weight: 1 },
  { name: "McDonald's", mcc: 5814, min: 5, max: 15, currency: 'EUR', region: 'IE', weight: 2 },
  { name: 'Subway', mcc: 5812, min: 6, max: 12, currency: 'EUR', region: 'IE', weight: 1 },
  // --- Transport ---
  { name: 'Dublin Bus / TFI Leap', mcc: 4111, min: 2, max: 3.5, currency: 'EUR', region: 'IE', weight: 3 },
  { name: 'Irish Rail', mcc: 4111, min: 4, max: 25, currency: 'EUR', region: 'IE', weight: 2 },
  { name: 'FreeNow', mcc: 4121, min: 8, max: 30, currency: 'EUR', region: 'IE', weight: 2 },
  { name: 'Aircoach', mcc: 4111, min: 7, max: 12, currency: 'EUR', region: 'IE', weight: 1 },
  { name: 'Topaz', mcc: 5541, min: 30, max: 90, currency: 'EUR', region: 'IE', weight: 1 },
  { name: 'Circle K', mcc: 5541, min: 25, max: 85, currency: 'EUR', region: 'IE', weight: 1 },
  // --- Mobile / utilities ---
  { name: 'Three Mobile', mcc: 4814, min: 20, max: 40, currency: 'EUR', region: 'IE', weight: 1 },
  { name: 'Eir', mcc: 4814, min: 25, max: 45, currency: 'EUR', region: 'IE', weight: 1 },
  { name: 'Bord Gáis Energy', mcc: 4900, min: 50, max: 180, currency: 'EUR', region: 'IE', weight: 1 },
  { name: 'Electric Ireland', mcc: 4900, min: 60, max: 220, currency: 'EUR', region: 'IE', weight: 1 },
  // --- Clothing & retail ---
  { name: 'Penneys/Primark', mcc: 5651, min: 10, max: 90, currency: 'EUR', region: 'IE', weight: 2 },
  { name: 'Brown Thomas', mcc: 5651, min: 30, max: 300, currency: 'EUR', region: 'IE', weight: 1 },
  { name: 'Marks & Spencer', mcc: 5311, min: 15, max: 90, currency: 'EUR', region: 'IE', weight: 1 },
  // --- Entertainment / digital ---
  { name: 'Apple Store', mcc: 5732, min: 30, max: 1500, currency: 'EUR', region: 'IE', weight: 1 },
  { name: 'Cineworld', mcc: 7832, min: 12, max: 35, currency: 'EUR', region: 'IE', weight: 1 },
  { name: 'Spotify', mcc: 5815, min: 9.99, max: 15.99, currency: 'EUR', region: 'IE', weight: 1 },
  { name: 'Netflix', mcc: 4899, min: 8.99, max: 17.99, currency: 'EUR', region: 'IE', weight: 1 },
];

// ---------------------------------------------------------------------------
// Ukrainian (UA) merchant list
// ---------------------------------------------------------------------------

export const UA_MERCHANTS: ReadonlyArray<MerchantSeed> = [
  // --- Groceries ---
  { name: 'Сільпо', mcc: 5411, min: 80, max: 1500, currency: 'UAH', region: 'UA', weight: 3 },
  { name: 'АТБ', mcc: 5411, min: 50, max: 1200, currency: 'UAH', region: 'UA', weight: 3 },
  { name: 'Novus', mcc: 5411, min: 100, max: 2000, currency: 'UAH', region: 'UA', weight: 2 },
  { name: 'Varus', mcc: 5411, min: 60, max: 1500, currency: 'UAH', region: 'UA', weight: 2 },
  { name: 'Аврора', mcc: 5499, min: 30, max: 800, currency: 'UAH', region: 'UA', weight: 1 },
  // --- Fuel ---
  { name: 'WOG', mcc: 5541, min: 400, max: 2500, currency: 'UAH', region: 'UA', weight: 1 },
  { name: 'OKKO', mcc: 5541, min: 400, max: 2500, currency: 'UAH', region: 'UA', weight: 1 },
  { name: 'SOCAR', mcc: 5541, min: 500, max: 2400, currency: 'UAH', region: 'UA', weight: 1 },
  // --- Retail & electronics ---
  { name: 'Епіцентр', mcc: 5200, min: 200, max: 15000, currency: 'UAH', region: 'UA', weight: 1 },
  { name: 'Rozetka', mcc: 5732, min: 150, max: 25000, currency: 'UAH', region: 'UA', weight: 2 },
  { name: 'Comfy', mcc: 5732, min: 500, max: 30000, currency: 'UAH', region: 'UA', weight: 1 },
  // --- Transport & delivery ---
  { name: 'Nova Poshta', mcc: 4215, min: 60, max: 500, currency: 'UAH', region: 'UA', weight: 2 },
  { name: 'Bolt', mcc: 4121, min: 70, max: 400, currency: 'UAH', region: 'UA', weight: 2 },
  { name: 'Uklon', mcc: 4121, min: 80, max: 500, currency: 'UAH', region: 'UA', weight: 2 },
  // --- Mobile / telecom ---
  { name: 'Kyivstar', mcc: 4814, min: 100, max: 500, currency: 'UAH', region: 'UA', weight: 1 },
  { name: 'Vodafone UA', mcc: 4814, min: 100, max: 500, currency: 'UAH', region: 'UA', weight: 1 },
  { name: 'lifecell', mcc: 4814, min: 80, max: 400, currency: 'UAH', region: 'UA', weight: 1 },
  // --- Dining & coffee ---
  { name: 'Сушія', mcc: 5812, min: 200, max: 1800, currency: 'UAH', region: 'UA', weight: 2 },
  { name: "McDonald's UA", mcc: 5814, min: 100, max: 500, currency: 'UAH', region: 'UA', weight: 2 },
  { name: 'Aroma Kava', mcc: 5814, min: 60, max: 250, currency: 'UAH', region: 'UA', weight: 2 },
  { name: 'Львівська Майстерня Шоколаду', mcc: 5814, min: 80, max: 400, currency: 'UAH', region: 'UA', weight: 1 },
  { name: 'Silpo Café', mcc: 5814, min: 100, max: 400, currency: 'UAH', region: 'UA', weight: 1 },
  // --- Shopping malls ---
  { name: 'Forum Lviv', mcc: 5311, min: 200, max: 5000, currency: 'UAH', region: 'UA', weight: 1 },
];
