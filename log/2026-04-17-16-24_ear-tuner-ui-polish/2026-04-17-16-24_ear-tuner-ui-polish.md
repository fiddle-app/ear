# 2026-04-17-16-24 Ear Tuner UI Polish

## Plan

See [`2026-04-17-16-24_ear-tuner-ui-polish/impl-design-review.md`](2026-04-17-16-24_ear-tuner-ui-polish/impl-design-review.md) for the full implementation plan generated at the start of this session.

---

## Execution Log

**2026-04-17**

### Context

Casey had left comments in `research/design-review.md` (Obsidian-style `[!casey]` and `[!todo]` callout blocks) indicating which design review recommendations to accept, reject, or modify. The session was to read those, plan the implementation, and execute it in two commits.

Two prior design reviews existed: one from Claude (`design-review.md`) and one from Gemini (`gemini-design-review.md`), plus three HTML mockups (A, B, C). Casey approved a handful of items from each and explicitly rejected others.

### What was rejected (and why)

- **Vignette reduction** (55% → 28%): Casey disagreed. The heavy vignette is intentional.
- **Status text color** (`#e8d5b0` → white): Casey likes the warm subtlety. Left as-is.
- **Status text color states** (green on correct, coral on wrong): Deferred ("for now").
- **Option B (Obsidian Dark)**: Not taken — Casey is keeping the orange brand.
- **Gemini mockup-c extras** (glassmorphism, LCD display feel, frosted glass): Explicitly excluded. Only the three animation ideas were taken.

### Commit 1 — Static UI tweaks

Five CSS-only changes, no JS:

- **Inter 800 for note names** — Added `family=Inter:wght@800` to the Google Fonts import; changed `.nc-name` from `Inconsolata 600` to `Inter 800`, tightened letter-spacing from `-0.01em` to `-0.02em`.
- **Circle flash states more vivid** — Opacity 0.34 → 0.44 on both correct/wrong backgrounds; borders to full opacity; added `box-shadow` glow (20px, 0.35 alpha). Switched to Gemini mockup-c's color values which were slightly more saturated.
- **Progress row** — Slot size 32px → 40px; `min-height` on `#progress-row` 36px → 44px.
- **Phase label opacity** — 0.55 → 0.63 (Casey's explicit compromise; he wanted it subtle but readable).

### Commit 2 — Animations

Three animation additions, no JS changes needed (flash dwell is 1600ms — well above the longest animation at 450ms):

- **Resonance pulse ring** — `::after` pseudo-element on `.note-circle.playing`. Required adding `position: relative; overflow: visible` to `.note-circle` (not previously set). Ring animates from `scale(0.9) opacity 0.8` to `scale(1.3) opacity 0` over 2.4s (infinite). Initial plan called for 1.2s, but Casey asked to slow it to half speed so only one ring emanates per note playback. Border thickened 2px → 3px at the same time.
- **Spring scale on correct** — `transform: scale(1.05)` on `.flash-correct`, with `transition: transform 0.3s cubic-bezier(0.175,0.885,0.32,1.275)` (spring overshoot easing).
- **Shake on wrong** — `animation: shake-wrong 0.45s` keyframe that translates ±7px, with `animation-fill-mode: forwards`. Both circles shake in sync, which felt right.

### Post-implementation tweaks

Casey manually changed the note name `font-size` minimum from `28px` to `24px` (in `clamp(28px, 9vw, 42px)`) after testing on device. This was folded into the commit 2 push.

### Deploy

Ran `npm run deploy` → `deploy.sh` → copies to `/c/Builds/fiddle/ear` → commits and pushes to `fiddle-app/ear`. Live at `fiddle-app.github.io/ear/`.

### New deploy skill

Designed and wrote `~/.claude/skills/deploy/skill.md`. Key decisions:

- **One generic skill, not per-app** — `deploy.sh` is already the source of truth for app-specific logic; the skill just ensures the source repo is clean before running it.
- **Electron placeholder** — Casey floated making an Electron desktop build of ear-tuner. Decision: don't design for it yet. The skill has a table noting Electron is TBD; when it exists, `deploy.sh` gets the new case and the skill picks it up automatically.

### Research bundle

All design review artifacts copied to `log/2026-04-17-16-24_ear-tuner-ui-polish/`:
- `design-review.md` — Claude's original review with Casey's inline comments
- `gemini-design-review.md` — Gemini's review
- `impl-design-review.md` — Implementation plan (generated this session)
- `mockup-a-refined.html`, `mockup-b-dark.html`, `mockup-c-gemini.html` — The three HTML mockups
