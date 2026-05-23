# Phase 03 — Visual Quality Loop

## Purpose

Iteratively improve the site's visual quality until it scores ≥ 85/100 or reaches 10 iterations.
Each iteration: screenshot → AI score → identify worst issue → apply fix → repeat.

## Scoring Rubric (via /api/visual-qa)

The visual-qa endpoint returns scores across 5 dimensions (each /20, total /100):
1. **Typography** — scale contrast, line-height, tracking, weight discipline
2. **Whitespace & Layout** — breathing room, alignment, nothing cramped
3. **Color & Contrast** — palette discipline, legibility, hierarchy through color
4. **Motion & Polish** — transitions, scroll animations, overall finish
5. **Mobile / Responsiveness** — tap targets, no overflow, readable at 390px

Scores to also capture:
- `worst_issue` — the single thing holding the score back
- `fix` — specific actionable fix (file/CSS reference)
- `positives` — what's genuinely working

## Loop Protocol

```
iteration = 0
while iteration < 10:
  1. Take screenshots at scroll positions [0, 500, 1000] on desktop and mobile
  2. POST to /api/visual-qa with { url: "http://localhost:3099", siteId }
  3. Receive score JSON
  4. Log: { iteration, scores, total, worst_issue, fix }
  5. If total >= 85: EXIT → Phase 04
  6. Apply the fix from step 4
  7. If build error after fix → POST to /api/build-iterate for error analysis
  8. Restart dev server if needed
  9. iteration++

If iteration === 10 and total < 85:
  → Log "Max iterations reached. Best score: {max}. Proceeding to deploy."
  → EXIT → Phase 04 with current state
```

## Fix Application Rules

When applying a fix from `score.fix`:

### Typography fixes
- Increase heading font-size via clamp: `clamp(2rem, 5vw, 4rem)`
- Tighten tracking on uppercase labels: `letterSpacing: '0.15em'`
- Improve line-height on body copy: 1.7–1.8
- Add font-weight contrast (headings 700+, body 400–450)

### Whitespace fixes
- Increase section padding: minimum `5rem 1.5rem` desktop, `3rem 1.25rem` mobile
- Add gap between related elements: minimum 1.5rem
- Never less than 0.5rem gap between stacked items
- Max content width on prose: 680px; on wide layouts: 1100–1200px

### Color fixes
- If text is unreadable: check contrast ratio. Body text on bg must be ≥ 4.5:1.
- If palette feels flat: add a darker version of primary for hover/active states
- If sections blend together: alternate bg colors (`--bg` vs `--bg-alt`)

### Motion fixes
- All non-hero sections should have AnimateIn (direction='up', delay staggered by 0.05–0.1s)
- Hover states on cards: `transform: translateY(-4px)` with `transition: 0.2s ease`
- Nav: `position: fixed` with backdrop-blur on scroll

### Mobile fixes
- Grid columns: use `repeat(auto-fit, minmax(280px, 1fr))` for card grids
- Wrap flex rows: `flexWrap: 'wrap'`
- Font size floors: never below 0.875rem (14px) for body, 1.5rem for section headings
- Touch targets: minimum 44px height on all interactive elements

## Common High-Impact Fixes (apply in order if score < 70)

1. **Hero section** — add full-viewport height, large headline (clamp 3–5rem), strong CTA button
2. **Section spacing** — double all padding values
3. **Color contrast** — ensure dark text on light bg or light text on dark bg (never gray-on-gray)
4. **Nav** — fix to top with blur on scroll, add active link indicator
5. **Cards** — add box-shadow, border-radius 8–12px, hover lift
6. **CTA buttons** — min 48px height, clear primary color, 0 border-radius or strong radius

## Iteration Log Format

Update build log after each iteration:

```json
{
  "iteration": 3,
  "scores": [
    { "i": 1, "total": 62, "worst": "Typography too small, no contrast hierarchy" },
    { "i": 2, "total": 74, "worst": "Section padding too tight, sections bleed together" },
    { "i": 3, "total": 82, "worst": "Mobile nav overlaps content at 390px" }
  ],
  "currentScore": 82
}
```

## Video Recording (optional but preferred)

After every 3rd iteration, record a scroll-through video:
```bash
node /Users/drive/record.js 3099 --fast
open /tmp/preview/review.mp4
```

Use the video to catch: sticky elements that don't unstick, scroll-jank, animation timing issues.

## Exit Criteria

- Score ≥ 85/100 (preferred) OR 10 iterations reached
- Build log updated with all iteration scores
- Final iteration screenshots saved to `{projectPath}/qa-screenshots/iteration-{n}/`
