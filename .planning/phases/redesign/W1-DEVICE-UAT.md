# Wave 1 — Device UAT (DEFERRED to batched W1+W2 EAS build)

NOT runnable in Expo Go or `expo export` — native glass needs a TestFlight
build on a real device. Batched with Wave 2; AFTER TestFlight build #6.

## Pre-build gate (R1) — do BEFORE the batched EAS build
- [ ] `eas.json` testflight/production ios `image` set (Task 5 = "latest").
- [ ] Confirm "latest" resolves to ≥ Xcode 26 / iOS 26 SDK via
      https://docs.expo.dev/build-reference/infrastructure/ — if Expo requires
      a pinned image, set the exact `macos-…-xcode-26.x` id and re-commit.
- [ ] Confirm not colliding with in-flight TestFlight build #6.
- [ ] Actively read the RESOLVED image slug in the EAS build logs (do NOT assume "latest" upgraded — as of 2026-05 "latest" may still resolve to Xcode 16, which lacks the iOS 26 SDK). If the resolved slug is not Xcode-26 / iOS-26-SDK capable, pin the exact `macos-…-xcode-26.x` slug in eas.json and re-commit BEFORE building.

## iOS 26 device (glass path)
- [ ] Tab bar renders as a floating warm Liquid Glass pill (GlassContainer +
      4 GlassView), not flat. Warm cream tint (#F7F5F0 chromeTint, tintAlpha
      0.62 baked into the native glass layer — not a flat semi-transparent
      fill), NOT grey.
- [ ] Glass is interactive (specular/refraction reacts to scroll/touch).
- [ ] Active tab: accent (#9C5B41) icon + textPrimary (#221F1B) label.
      Inactive: textMuted. Labels legible over glass at all scroll positions
      (R5 — if any position drops below AA, escalate: tighten tint alpha).
- [ ] Tap targets ≥ 44pt; all 4 tabs switch correctly; `explore` absent.
- [ ] Glass bar is visible on the first dashboard frame after a cold launch
      (≤10s from cold start) — the cold-launch-to-dashboard demo moment.
- [ ] Settings → Accessibility → Reduce Transparency ON → bar switches to the
      solid fallback (no broken/empty bar).

## iOS < 26 device (fallback path)
- [ ] Tab bar is a solid warm pill (GLASS.fallbackChromeBg #F7F5F0) with the
      ELEVATION.floating shadow — premium, NOT an empty/transparent bar.
- [ ] Same color/contrast/tap-target/i18n behavior as glass path.

## Both
- [ ] Language switch updates tab labels live (i18n).
- [ ] No regression vs pre-Wave-1 navigation behavior.
- [ ] Screen content (transaction list, dashboard cards) is NOT clipped or hidden behind the floating bar at the bottom of scroll — content must be reachable/legible with the bar overlaid. If clipped: follow-up to feed a bottom safe-inset/height to screens (do NOT pre-wire via a private `@react-navigation/bottom-tabs/src/...` import — find the supported expo-router v6 mechanism).

---
**Batched build also covers Wave 3** — run `W3-DEVICE-UAT.md` in the same device pass (one EAS build = W1+W2+W3; user decision 2026-05-19).
