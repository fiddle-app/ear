# 2026-04-17-16-51 Smile Animation

**2026-04-17**

## What was built

Added a "success smile" animation to the progress row in Ear Tuner. At the end of a
perfect round (all answers correct), the row of status circles arcs upward into a
subtle smile shape — corners rise, center stays (or droops slightly for 3 circles).

---

## Design iteration

Three mockups were generated first (`smile-anim-subtle.html`, `smile-anim-medium.html`,
`smile-anim-pronounced.html`). Casey selected the medium (12 px max lift) approach.
Mockups are archived alongside this log.

**Key arc formula problem and fix:**

The first attempt used a **sqrt curve** for the per-slot vertical offsets:

```
offset[i] = -MAX_LIFT * sqrt(distNorm)
```

For n=5 this produced `[-12, -8.5, 0, -8.5, -12]`. The steps are *unequal*:
3.5 px from edge to adjacent, then 8.5 px from adjacent to center. That large
jump near the center reads as a **V**, not an arc.

Root cause: the sqrt curve front-loads the lift near the center. Equal visual
steps require linear interpolation for n=5.

**Final formula by circle count:**

| n | Offsets (px) | Formula |
|---|---|---|
| 5 | `-12, -6, 0, -6, -12` | linear (`power=1`) — equal 6 px steps |
| 4 | `-12, -7, -7, -12` | sqrt (`power=0.5`) — accepted without change |
| 3 | `-12, +2, -12` | hardcoded — 3 points can't show a curve; center droop signals intent |

The n=4 sqrt case was correct because its inner circles are equidistant from
the center with no "step mismatch" problem. A single power value can't work
uniformly across all n — the formula branches on `n === 5`.

---

## Implementation (index.html)

- **CSS**: `#progress-row.smiling` adds a soft green glow (`drop-shadow`). Slot
  transforms are applied inline by JS (not via nth-child CSS) so the formula
  works for any `testsPerRound`.
- **`smileProgressRow()`**: reads the live slot count from the DOM, computes
  offsets, applies `translateY` with outward stagger (outer slots lag ~80 ms)
  via inline `transition` + `transform`.
- **Trigger**: fires 250 ms after round success — lets the last checkmark's
  `popIn` animation land before the arc begins.
- **`clearProgress()`**: strips `.smiling`, inline `filter`, and slot transforms
  when the next round starts.

---

## Remaining

- Commit and deploy to GitHub Pages were initiated but not completed this session.
  Next step: stage `index.html` + this log folder, commit, push, then run `/deploy`.
