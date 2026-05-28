# Ready-to-paste content for claude.ai/design setup wizard

> URL: `claude.ai/design/p/<id>?setup=design-system`
> GitHub repo `saidaliiev/soldify` already connected ✓

---

## Field 1 — "Company name and blurb (or name of design system)"

**Paste:**

```
soldify — premium iOS personal-finance manager. Editorial warm aesthetic, "money tool that feels like a magazine, not a spreadsheet." Built in React Native + Expo for solo dev portfolio. Slate & Sand warm palette (sandstone + sage on warm slate). Mixed-typeface system: Oswald (display) + EB Garamond (editorial) + Manrope (UI). Positioned between Copilot Money's polish and Lunch Money's indie restraint. Hard rules: NOT fintech-blue, NOT AI-slop purple, NOT crypto-neon. No glassmorphism on content. Single screen scope this pass: the Dashboard tab.
```

---

## Field 2 — "Link code on GitHub"

Already connected: `saidaliiev/soldify`.
**No action needed** unless you want to grant access to additional repos (you don't — single-repo monorepo).

---

## Field 3 — ".fig file"

**Skip.** No Figma file exists. soldify designed code-first.

---

## Field 4 — "Add fonts, logos and assets"

Drag-drop these files (in this order):

| File | What it is |
|---|---|
| `.planning/research/design-benchmark/claude-design/assets/01-current-hero-donut.png` | Current Dashboard hero + donut state |
| `.planning/research/design-benchmark/claude-design/assets/02-current-rows.png` | Current Dashboard donut + yesterday + category rows |
| `.planning/research/design-benchmark/claude-design/assets/03-baseline-pre-redesign.png` | Pre-redesign baseline for before/after |
| `.planning/research/design-benchmark/claude-design/tokens-excerpt.md` | Flat token reference (palette / typography / spacing) |
| `.planning/research/design-benchmark/CLAUDE-DESIGN-BRIEF.md` *(optional)* | Full brief if the tool accepts markdown attachments |

**Fonts**: do NOT upload font files unless the tool explicitly asks. Oswald / EB Garamond / Manrope are Google Fonts — Claude Design can fetch them by name.

---

## Field 5 — "Any other notes?"

**Paste:**

```
SCOPE — Dashboard tab only. Other tabs (Activity, Jars, Chat) and onboarding/settings are out of scope.

LOCKED TOKENS (do not redefine — extend only):
- background #EDEAE3, surface #F7F5F0, white #FFFFFF
- textPrimary #221F1B, textSecondary #6A645A, textMuted #6E695F (WCAG AA hard floor 4.5:1)
- accent #9C5B41 (text-safe large only), accentSoft #B97A5A (graphic), accentDeep #7C4632 (text-safe 6.29:1)
- sage #687653 (graphic), sageDark #586A45 (text-safe 4.91:1), sageSoft #9AA585, sageDeep #4F5C3C
- error #97463A, borderSubtle #6E695F33

LOCKED GRADIENTS — primary [#B97A5A → #9C5B41], warm [#E6E1D4 → #D9D2C0], hero [#EDEAE3 → #E2DDD0], sage [#9AA585 → #788566].

LOCKED TYPOGRAPHY — Oswald (display, hero numbers, large titles), EB Garamond (editorial body, chat, italic insights), Manrope (UI primitives, labels, tabular numbers).

BANNED COLORS (ESLint-enforced): #667EEA, #8B7AB8, #E8E0FF, #10B981, #1A73E8, #2563EB. Any neon gradient.

BANNED PATTERNS: glassmorphism on content (lists, cards, chat bubbles); emoji as UI icons EXCEPT category icons; hardcoded hex in components.

PLATFORM CONSTRAINTS — React Native + Expo SDK 54. Components use View / Text / ScrollView / Pressable only. StyleSheet.create() exclusively. Min 44pt tap targets. accessibilityLabel + accessibilityRole on all interactive elements. Motion via centralized motion.ts vocabulary. Reduce-motion respected. Dynamic Type AAA scale.

DELIVERABLE — for the design system: generate a tokens snapshot, type scale, component library covering Dashboard primitives (hero band, donut chart, category row, "yesterday in money" card, chat FAB, floating tab bar). Each primitive: dimensions, internal padding, states (default / pressed / disabled), edge cases (empty month, long category name, zero balance, single-category). Then ONE recommended evolution of the Dashboard composition with token-level reasoning.

REFERENCES (look at, don't copy) — Copilot Money (Apple Design Award 2024, premium peer), Monarch Money, Lunch Money (indie restraint), Apple Wallet, Linum (closest indie peer). Avoid Revolut density and any neobank-blue.

KNOWN OPEN QUESTIONS — (1) donut canvas size 200pt vs benchmark 200-235pt; (2) hero↔donut bridge -16pt vs benchmark 24-32pt positive; (3) donut center default "LARGEST" framing; (4) yesterday card slot (does it belong between donut and list?); (5) category row density; (6) FAB placement.

RESEARCH FINDINGS — donut + center total + ranked rows is the convergent 2024-2025 premium pattern, NOT an anti-pattern. Color-redundant rows are industry norm; soldify now uses 2 cues (dot + emoji) after dropping a third (2pt bar) per Designer audit cd87f73.

OUTPUT — design system entities for the soldify dashboard primitives, plus a recommendation memo.
```

---

## Field 6 — submit / next step

After submitting the form Claude Design will likely:
1. Read the linked GitHub repo at `saidaliiev/soldify`
2. Parse the screenshots as visual reference
3. Generate the design system

When variants / system come back, drop them into `.planning/research/design-benchmark/claude-design/variants/` per the BRIEF §11.

---

## Length-safety note

The "Any other notes" field is text — there's no published cap but most such fields prefer < 4000 chars. The above is ~3000 chars. If it rejects, drop the LOCKED TOKENS block (the GitHub repo already has it in `apps/mobile/src/design/tokens.ts`) and just paste the platform constraints + banned + deliverable + research.
