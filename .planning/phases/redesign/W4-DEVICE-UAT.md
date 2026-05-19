# Wave 4 — Device UAT (DEFERRED to the W3-5 glass EAS build)

Wave 4 adds a NEW native glass surface (the chat sheet) → the real glass
path is NOT runnable in Expo Go (R2). Batched with the W1+W2+W3 device pass
(see W1/W2/W3-DEVICE-UAT.md), AFTER TestFlight build #6 (EAS quota — do not
collide). R1 pre-build gate: `eas.json` testflight `image` must be Xcode-26
(already `image=latest` from W1 — re-verify at build, do NOT rebuild here).
R3 fps formal budget = Wave 6; this is the qualitative feel + correctness +
fallback-matrix gate.

## Sheet glass — iOS 26 path (real glass)
- [ ] Open chat (FAB): the sheet background reads as warm Liquid Glass
      (sheet tint, not neutral grey), content (bubbles/input) legible on it.
- [ ] Glass is ONLY the sheet backdrop — bubbles, mini-chart, input row are
      flat editorial (NO blur on content; CLAUDE.md). Verify no glass leak
      onto bubbles.
- [ ] Pan-down / backdrop tap still closes; the glass backdrop does not eat
      the pan or list scroll (pointerEvents none on the GlassView).
- [ ] The 3 OTHER sheets (Recategorize, JarCreate, CategoryEditor) are
      UNCHANGED — still solid COLORS.surface (they don't opt in). Regression
      check: open each, confirm no visual change vs pre-W4.

## Sheet glass — iOS < 26 fallback path (Expo-Go testable)
- [ ] Chat sheet renders an opaque warm solid fill + modal shadow (NEVER a
      transparent / empty sheet). Premium, not a degraded bar.
- [ ] reduce-transparency ON (Settings → Accessibility) on an iOS 26 device:
      forces the solid fallback even though glass is available.
- [ ] Fallback and glass paths are both acceptable as a portfolio shot.

## Chat motion (governed)
- [ ] Bubbles (user + AI) settle in on send — subtle fade + rise
      (chatBubbleEnter ~280ms), not popped, not a long slide.
- [ ] Timestamp tap reveal is quick + smooth (fabReveal), reduce-motion ON →
      appears instantly.
- [ ] ChatMiniChart fades in with its bubble (not popped); reduce-motion ON
      → chart appears instantly.
- [ ] Send-button press feels snappy (pressFeedback ~90ms scale) — a tap
      blip, not a sluggish ease; reduce-motion ON → no scale.
- [ ] Empty state + error banner enter/exit are smooth and governed.
- [ ] Typing-dots breath still pulses (logged accepted-drift); reduce-motion
      ON → static "…" (no pulse).

## Editorial (design-sync vs soldify-screens.html:400-446)
- [ ] Bubbles use EB Garamond editorial body (already correct — confirm on
      device it reads editorial, not Manrope).
- [ ] Input row pill reads ~58pt; send button is a 42pt accent pill
      (solid-accent approximates the authority gradient — accepted drift,
      no gradient dep).
- [ ] Mini-chart bars are single-accent (multi-color = accepted drift,
      logged — confirm intentional, not a bug).

## reduce-motion (global)
- [ ] All chat enters instant; sheet still opens/closes (primitive motion
      is NOT governed yet — deferred debt — but functions; confirm it is not
      jarring next to the now-governed content).

## Non-regression
- [ ] Send / retry / error / timeout / prefill-chip flows all work.
- [ ] VoiceOver: sheet focus-on-open + return-focus still work; bubble a11y
      labels intact; never logs message text.
- [ ] Language switch (en/uk) updates chat copy live.

## Accepted design-sync drift (verify intentional, not bugs)
- [ ] Header keeps "Ask SOLDI" + × (NOT the authority spark mark + "Soldify"
      + "● online" badge) — header redesign out of an editorial wave's scope.
- [ ] Input pill is SOLID (no backdrop blur) — glass-on-content banned.
- [ ] Mini-chart single-accent (not authority multi-color) — needs a
      ChartPayload color-array change (functional, out of scope).
- [ ] Shared-sheet open/close motion still ad-hoc (deferred
      shared-primitive-motion debt — not chat-specific).

---
**Batched build = W1+W2+W3+W4** — single device pass after TestFlight #6
(user decision; spec §3 'batch Wave 3–5 → build', W3 rode W1+W2 as pure RN,
W4 is the first new native glass since W1). Cross-linked from W1/W2/W3 UAT.
