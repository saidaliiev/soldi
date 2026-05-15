#!/usr/bin/env node
/**
 * check-i18n-parity.mjs
 * Verifies that every en/ locale namespace has:
 *   1. A matching uk/ file
 *   2. Identical key sets (reports missing keys in either direction)
 *   3. Every {{placeholder}} token in an en value is present in the matching uk value and vice-versa
 *
 * Uses node builtins only — zero external dependencies.
 * Exit 0 = all checks pass. Exit 1 = any mismatch found.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesRoot = join(__dirname, '..', 'src', 'i18n', 'locales');
const enDir = join(localesRoot, 'en');
const ukDir = join(localesRoot, 'uk');

/** Extract all {{placeholder}} tokens from a string */
function extractPlaceholders(value) {
  const matches = value.match(/\{\{[^}]+\}\}/g);
  return new Set(matches ?? []);
}

let failed = false;
const results = [];

const enFiles = readdirSync(enDir).filter((f) => f.endsWith('.json'));

for (const filename of enFiles) {
  const ns = filename.replace('.json', '');
  const enPath = join(enDir, filename);
  const ukPath = join(ukDir, filename);

  // Check 1: uk file must exist
  if (!existsSync(ukPath)) {
    results.push(`FAIL [${ns}] uk/${filename} is MISSING`);
    failed = true;
    continue;
  }

  const enData = JSON.parse(readFileSync(enPath, 'utf8'));
  const ukData = JSON.parse(readFileSync(ukPath, 'utf8'));

  const enKeys = new Set(Object.keys(enData));
  const ukKeys = new Set(Object.keys(ukData));

  // Check 2: key sets must match
  const missingInUk = [...enKeys].filter((k) => !ukKeys.has(k));
  const extraInUk = [...ukKeys].filter((k) => !enKeys.has(k));

  if (missingInUk.length > 0) {
    results.push(`FAIL [${ns}] Keys present in en but MISSING in uk:`);
    missingInUk.forEach((k) => results.push(`       - ${k}`));
    failed = true;
  }
  if (extraInUk.length > 0) {
    results.push(`FAIL [${ns}] Keys present in uk but MISSING in en:`);
    extraInUk.forEach((k) => results.push(`       + ${k}`));
    failed = true;
  }

  // Check 3: placeholder parity for keys present in both
  const commonKeys = [...enKeys].filter((k) => ukKeys.has(k));
  for (const key of commonKeys) {
    const enVal = String(enData[key]);
    const ukVal = String(ukData[key]);
    const enPH = extractPlaceholders(enVal);
    const ukPH = extractPlaceholders(ukVal);

    const missingInUkPH = [...enPH].filter((p) => !ukPH.has(p));
    const extraInUkPH = [...ukPH].filter((p) => !enPH.has(p));

    if (missingInUkPH.length > 0) {
      results.push(`FAIL [${ns}] "${key}": uk is missing placeholders: ${missingInUkPH.join(', ')}`);
      failed = true;
    }
    if (extraInUkPH.length > 0) {
      results.push(`FAIL [${ns}] "${key}": uk has extra placeholders not in en: ${extraInUkPH.join(', ')}`);
      failed = true;
    }
  }

  if (!failed || !results.some((r) => r.includes(`[${ns}]`))) {
    results.push(`PASS [${ns}] ${enKeys.size} keys, placeholder parity OK`);
  } else if (!results.some((r) => r.startsWith('FAIL') && r.includes(`[${ns}]`))) {
    results.push(`PASS [${ns}] ${enKeys.size} keys, placeholder parity OK`);
  }
}

// Also check for uk files that have no en counterpart
const ukFiles = readdirSync(ukDir).filter((f) => f.endsWith('.json'));
for (const filename of ukFiles) {
  const ns = filename.replace('.json', '');
  const enPath = join(enDir, filename);
  if (!existsSync(enPath)) {
    results.push(`FAIL [${ns}] uk/${filename} exists but en/${filename} is MISSING`);
    failed = true;
  }
}

console.log('\n=== i18n key+placeholder parity check ===');
results.forEach((r) => console.log(r));
console.log('==========================================\n');

if (failed) {
  console.error('PARITY CHECK FAILED — fix the issues above before committing.\n');
  process.exit(1);
} else {
  console.log('All namespaces pass key + placeholder parity.\n');
  process.exit(0);
}
