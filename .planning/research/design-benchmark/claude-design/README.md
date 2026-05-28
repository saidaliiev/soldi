# Claude Design — hand-off package

> Drop this whole directory into Claude Design (claude.ai/design or equivalent) for an external design pass on the soldify Dashboard tab.

## Contents

| File | Purpose |
|---|---|
| `CLAUDE-DESIGN-BRIEF.md` | The full brief — product, scope, constraints, variant directions, acceptance criteria. The primary document. |
| `tokens-excerpt.md` | Flat palette + typography + spacing reference. For pasting into a design tool. |
| `assets/01-current-hero-donut.png` | Today's Dashboard hero + donut (after `cd87f73`) |
| `assets/02-current-rows.png` | Today's Dashboard donut + yesterday card + 5 category rows |
| `assets/03-baseline-pre-redesign.png` | Pre-redesign baseline for before/after comparison |

## How to use

### Option A — full hand-off to Claude Design

1. Open Claude Design.
2. Attach all three screenshots in `assets/`.
3. Paste the entire contents of `CLAUDE-DESIGN-BRIEF.md` as the prompt.
4. Optionally paste `tokens-excerpt.md` as additional context if the tool supports multi-doc input.
5. Run.

### Option B — quick paste-in prompt

1. Open Claude Design.
2. Attach `assets/01-current-hero-donut.png` and `assets/02-current-rows.png`.
3. Paste only §12 from `CLAUDE-DESIGN-BRIEF.md` (the 200-word condensed prompt).
4. Run.

### Option C — give Claude.ai chat the brief and ask for token-level recommendations only (no visual output)

1. Open Claude.ai chat (Opus 4.7).
2. Attach the screenshots.
3. Paste `CLAUDE-DESIGN-BRIEF.md`.
4. Ask: "Don't generate images. Give me a written recommendation memo with token-level deltas for each of the 5 variant directions."

## Expected output

Each variant returned should land at:

```
.planning/research/design-benchmark/claude-design/variants/
  ├── a-editorial-restraint/
  │   ├── frame.png
  │   ├── annotation.md
  │   └── tokens.diff.md
  ├── b-card-stacked/
  ...
  └── RECOMMENDATION.md
```

After Claude Design returns, the next step is a code-side review pass — likely via `Agent(subagent_type="Designer")` or direct hand-implementation through `Forge` / `Engineer`.

## Notes for future iterations

- The package is self-contained — does NOT depend on cloning the repo.
- Banned values list is locked. If the design pass returns any banned hex, reject.
- Dynamic Type AAA is a hard gate. If the design pass returns layout that breaks at large text, reject.

## Related artifacts (not in this package, but referenced by the brief)

- `../DESIGN-ORDER.md` — in-house Designer audit from 2026-05-27
- `../RESEARCH-NOTES.md` — PerplexityResearcher benchmark findings
- `../outline.yaml` — 14 apps + scope config
- `../fields.yaml` — visual-treatment fields matrix
- `/home/iskan/projects/soldify/CLAUDE.md` — full project workflow + design rules
- `/home/iskan/projects/soldify/apps/mobile/src/design/tokens.ts` — full token source
