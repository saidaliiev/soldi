/**
 * Categories feature — type re-exports.
 *
 * Component code in src/features/categories/* and app/(tabs)/categories/* imports
 * Category from here so the dependency direction stays features→data, not the
 * other way around. The Category shape itself is declared in
 * src/data/categoriesRepo.ts.
 */

export type { Category } from '@data/categoriesRepo';
