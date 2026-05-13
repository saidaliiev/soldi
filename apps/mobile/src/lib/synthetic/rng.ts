/**
 * SOLDI seedable pseudorandom generator — mulberry32.
 *
 * mulberry32 is a fast, high-quality 32-bit PRNG.
 * Given the same seed it always produces the same sequence —
 * critical for reproducible synthetic data generation and unit tests.
 *
 * No external dependencies. Pure module.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A function returning a float in [0, 1). */
export type RngFn = () => number;

// ---------------------------------------------------------------------------
// PRNG
// ---------------------------------------------------------------------------

/**
 * Creates a mulberry32 PRNG seeded with the given 32-bit integer.
 *
 * Returns a closure that advances the state on every call and returns a float
 * in [0, 1). Identical seeds always produce identical sequences.
 *
 * @param seed - 32-bit integer seed. Use a deterministic value (e.g. Unix epoch
 *               truncated to int) for reproducible generator output.
 */
export function mulberry32(seed: number): RngFn {
  let s = seed >>> 0; // coerce to unsigned 32-bit int

  return function rng(): number {
    s += 0x6d2b79f5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    z = (z ^ (z >>> 14)) >>> 0;
    return z / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Picks a random element from a non-empty array using the given RNG.
 *
 * @throws {RangeError} If the array is empty.
 */
export function pick<T>(rng: RngFn, arr: ReadonlyArray<T>): T {
  if (arr.length === 0) {
    throw new RangeError('pick: array must be non-empty');
  }
  const index = Math.floor(rng() * arr.length);
  const value = arr[index];
  if (value === undefined) {
    // Should never happen given the length check above; guard for strictness
    throw new RangeError(`pick: index ${index} out of bounds for length ${arr.length}`);
  }
  return value;
}

/**
 * Returns a random integer in [min, maxInclusive] using the given RNG.
 *
 * @throws {RangeError} If min > maxInclusive.
 */
export function randInt(rng: RngFn, min: number, maxInclusive: number): number {
  if (min > maxInclusive) {
    throw new RangeError(`randInt: min (${min}) must not exceed maxInclusive (${maxInclusive})`);
  }
  return min + Math.floor(rng() * (maxInclusive - min + 1));
}
