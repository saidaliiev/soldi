# Wave 3 — Device UAT (DEFERRED to batched W1+W2 EAS build)

Pure RN — runnable in Expo Go AND TestFlight. Batched with the Wave-1 glass
+ Wave-2 motion device-UAT (see W1-DEVICE-UAT.md / W2-DEVICE-UAT.md); AFTER
TestFlight build #6 (EAS quota — do not collide). One device pass covers
W1+W2+W3 (user decision 2026-05-19). R3 fps budget is formally verified in
Wave 6; this is the qualitative feel + correctness gate.

## List-enter motion (Transactions screen, first open)
- [ ] Rows settle in once on the list's FIRST paint — a subtle fade + ~8pt
      rise (~260ms, eases out), not popped, not a long slide.
- [ ] Fast-scroll the list, then keep scrolling: rows realized by scroll /
      FlashList recycle do **NOT** re-animate (no flicker, no re-enter,
      no jank). The enter is one-shot, not per-scroll.
- [ ] Leave Transactions and return: acceptable that the one-shot enter
      does not replay (per-session first-paint delight) — confirm it does
      not mis-fire on every visit.

## reduce-motion (Settings → Accessibility → Reduce Motion = ON)
- [ ] Transaction rows appear instantly — no fade, no rise.
- [ ] MonthSwiper label snaps back instantly on release (no eased glide).
- [ ] Screen fully usable; nothing waits on an animation.

## Editorial polish (design-sync vs soldify-screens.html:205-256)
- [ ] DateHeader reads as an uppercase tracked eyebrow (moss/sage) with a
      hairline rule running to the right edge. No daily subtotal (dropped
      per checkpoint).
- [ ] TransactionRow: circular tinted category-icon badge + plain muted
      category text (no chip pill). 1px hairline separates rows.
- [ ] Expense amounts read in the warm accent; income in sage. Tabular
      figures align.
- [ ] **No header two-tone seam**: the status-bar area and the in-body
      "Activity" title are ONE continuous color region, top edge through
      the title (defect #1). Compare against the Overview screen (same
      cohesion). Check light + the iOS<26 fallback path.

## MonthSwiper snap (W2 carry-forward debt cleared, T6)
- [ ] Release a month-swipe: the label snaps back to centre smoothly,
      feel equivalent to before (220ms governed vs the old 250ms literal —
      should be imperceptibly different, no regression / no abrupt cut).

## Non-regression
- [ ] Swipe-left on a row still reveals + triggers "Categorize"
      (RecategorizeBottomSheet opens); spring unchanged.
- [ ] Row tap → transaction detail; VoiceOver "recategorize" action works.
- [ ] FilterPillsRow still shows/hides with active filters; × dismiss works;
      `?categoryId=` deep link from the dashboard still applies.
- [ ] Empty (initial) and no-search-results states render correctly under
      the new in-body header; error banner still tappable.
- [ ] Language switch (en/uk) updates the title, eyebrows, labels live.

## Accepted design-sync drift (verify intentional, not bugs)
- [ ] FilterPillsRow stays the active-filter-chips model (NOT the
      authority's All/Expense/Income/Rent segment selector) — out of scope
      for an editorial wave; intentional.
- [ ] DateHeader label keeps the existing Today / Yesterday / date logic
      (NOT the authority's "17 May · Today" combined string) — label-text
      change is i18n/dateGrouping scope, deferred; intentional.
- [ ] Row hairline is full-width (container border), not inset to content
      like the static mockup — swipe-stable tradeoff; intentional, minor.

---
**Batched build = W1+W2+W3+W4** — run W1/W2/W3/W4-DEVICE-UAT.md in one device pass (single EAS build after TestFlight #6; user decision 2026-05-19).
