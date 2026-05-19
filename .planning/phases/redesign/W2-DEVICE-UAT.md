# Wave 2 — Device UAT (DEFERRED to batched W1+W2 EAS build)

Pure RN motion — runnable in Expo Go AND TestFlight, BUT the portfolio
"first 10s" feel + fps budget must be judged on a real device. Batched with
the Wave-1 glass device-UAT (W1-DEVICE-UAT.md); AFTER TestFlight build #6
(EAS quota — do not collide). R3 fps budget is formally verified in Wave 6;
this checklist is the qualitative feel + reduce-motion gate.

## Dashboard cold-launch (spec §1 — first 10s)
- [ ] Hero total counts up 0→total on first open (~600ms, eases out, not linear).
- [ ] Donut slices sweep in on first open (~700ms), not popped instantly.
- [ ] Chat FAB hidden over the hero, eases in on scroll-down past the band,
      eases back out on scroll-up to top.

## Month swipe
- [ ] Swiping months: hero number re-counts prev→new (not a hard cut).
- [ ] Donut slices morph between months — matched categories slide, new
      categories grow in, removed categories collapse out (NO opacity
      crossfade, NO flicker, NO NaN/black frame on 6→5→7 slice changes).
- [ ] Hero + donut carry together in the swipe direction (sharedMonth) —
      reads as one element moving, not two independent jumps.
- [ ] Tapping a slice mid/after animation selects the correct category
      (hit-testing uses settled geometry).

## reduce-motion (Settings → Accessibility → Reduce Motion = ON)
- [ ] Hero shows the final total immediately (no count-up).
- [ ] Donut shows final arcs immediately (no draw/morph).
- [ ] FAB appears/disappears without easing; month swipe = instant, no carry.
- [ ] App fully usable; nothing depends on the animation completing.

## Performance (qualitative; formal budget = Wave 6)
- [ ] No visible jank/dropped frames during count-up + arc morph on a real
      populated month on the lowest-tier target device.
- [ ] Scroll stays smooth with the scrollY-driven FAB wired.

## Non-regression
- [ ] Static screenshot (no motion) is unchanged vs pre-Wave-2 (settled state).
- [ ] EmptyState / future-month / error paths unaffected (no donut → no anim).
- [ ] Language switch still updates labels live.

## Polish Pass (Task 10) device checks
- [ ] Staggered donut draw reads premium not mechanical — slices sweep in
      sequentially (each clearly leading the next), not all at once and not a
      discrete one-by-one march (STAGGER_OVERLAP=0.55, arcDraw 760ms).
- [ ] Count-up settle feels expensive — decelerates into the final number
      (not linear, not an abrupt stop); ~720ms outCubic reads unhurried.
- [ ] sharedMonth carry reads as one cohesive motion — hero + donut move
      together, snappier (~340ms) without feeling laggy or two-stage.
- [ ] No exit-slice ghost (removed slices fully vanish, no 1px residue) and
      no matched-slice color flicker at the chosen stagger on 6→5→7 changes.
