---
status: partial
phase: 04-jars-i18n-accessibility
source: [04-VERIFICATION.md]
started: 2026-05-15T21:35:05Z
updated: 2026-05-15T21:35:05Z
---

## Current Test

[awaiting human testing — physical iPhone via Expo Go]

## Tests

### 1. Jar create + sweep + Skia ring animation (JAR-01/JAR-02)
expected: Create a jar (name + target + SVG icon); tap "Sweep to Jar"; ring animates 0→new fraction smoothly over ~300ms Easing.out(Easing.cubic); balance updates; over-funded clamps ring at 100% with over-funded label.
result: [pending]

### 2. Runtime EN↔UK full-app retranslation (SET-02)
expected: Toggle language EN→UK in Settings; every tab label, dashboard hero sub-label, donut center label, chat screen, transaction list retranslate with no restart; no English visible; brief remount flash acceptable.
result: [pending]

### 3. VoiceOver modal focus contract (QUAL-03, ROADMAP SC#4)
expected: With VoiceOver on, open RecategorizeBottomSheet + ChatBottomSheet; focus enters the sheet; background not reachable (accessibilityViewIsModal); closing returns focus to the triggering element.
result: [pending]

### 4. VoiceOver full-tab navigation, no dead ends (QUAL-03, ROADMAP SC#4)
expected: VoiceOver navigate all 4 tabs + Settings + JarDetailScreen; every interactive element announces label+role; Skia canvases announce one summarizing label (no child-path enumeration); swipe-recategorize alternative action announced.
result: [pending]

### 5. axe-style contrast audit on device (QUAL-02, ROADMAP SC#5)
expected: Run axe-style a11y audit on device build; zero WCAG AA failures (4.5:1 body, 3.0:1 large text) across computed text/background pairs incl. opacity/animated states.
result: [pending]

### 6. Native-Ukrainian review (ROADMAP SC#2, D-08)
expected: Upwork native-Ukrainian reviewer certifies full UK-mode app reads natural; commits edits as the approval artifact (D-08 pattern).
result: [pending]

### 7. jarsRepo + sweepRepo native DB tests (op-sqlite)
expected: Run jarsRepo.test.ts + sweepRepo.test.ts on device / RN harness with native op-sqlite: schema version reaches 5; createJar/listJars/getJar/jarBalanceCents/insertContribution pass; sweepToJar contributes EUR-only round-ups, second immediate sweep = 0, UAH/income excluded (validates CR-01 timestamp fix end-to-end).
result: [pending]

### 8. Dynamic Type AccessibilityXXXL reflow (QUAL-04)
expected: System Dynamic Type = AccessibilityXXXL; dashboard MonthlyTotalHero, Jars JarRing center label, tab bar — no truncation/overflow; hero ~1.3× cap fits band; tab bar single-line at 1.0×; ring label inside ring at 1.2×.
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps

(none recorded yet — populated if human testing reports issues → gap closure via /gsd:plan-phase 4 --gaps)

## Known Non-Blocking

- WR-04 (deferred): jarRingGeometry ring ~6pt off-center — cosmetic, device-only visual pass, not correctness/a11y/security.
- Info findings IN-01..IN-04 from 04-REVIEW.md (MonthlyTotalHero hardcoded English sub-label, icon slug a11y label, LanguageToggle radio semantics) — non-blocking, optional polish.
