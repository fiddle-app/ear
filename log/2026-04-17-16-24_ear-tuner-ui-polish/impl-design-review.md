# Ear Tuner — Design Review Implementation Plan

*Based on Casey's comments in `design-review.md`, April 2026*

---

## Changes Selected

From the design-review, Casey approved:

| # | Change | Source |
|---|--------|--------|
| 1 | Inter 800 font for note names | `[!casey] OK, let's try Inter 800` |
| 2 | Circle flash opacity: 0.34 → 0.44, brighter borders | `[!todo] I agree` |
| 3 | Progress row slot size: 32px → 40px | `[!casey] OK. Increase to 40px` |
| 4 | Phase label opacity: 0.55 → 0.63 | `[!casey] use opacity .63` |
| 5 | Resonance pulse animation when note plays | Mockup C approval |
| 6 | Spring scale(1.05) on correct state | Mockup C approval |
| 7 | Shake animation on wrong state | Mockup C approval |

**Not changing:**
- Vignette opacity (Casey disagrees with reducing it)
- Status text color `#e8d5b0` (Casey likes the subtlety)
- Status text green/coral color states (left for now)

---

## Commit 1 — Static UI Tweaks

No animation logic. Pure CSS/font changes. Low risk.

### 1.1 — Add Inter 800 to font import

**File:** `index.html` line ~14

Current:
```html
<link href="https://fonts.googleapis.com/css2?family=Inconsolata:wght@300;400;500;600&family=Nunito:wght@700&display=swap" rel="stylesheet">
```

Change to:
```html
<link href="https://fonts.googleapis.com/css2?family=Inconsolata:wght@300;400;500;600&family=Nunito:wght@700&family=Inter:wght@800&display=swap" rel="stylesheet">
```

### 1.2 — Apply Inter 800 to `.nc-name`

**File:** `index.html`, `.nc-name` rule (~line 187)

Current:
```css
.nc-name {
  font-size: clamp(28px, 9vw, 42px); font-weight: 600;
  letter-spacing: -0.01em; line-height: 1;
}
```

Change to:
```css
.nc-name {
  font-family: 'Inter', sans-serif;
  font-size: clamp(28px, 9vw, 42px); font-weight: 800;
  letter-spacing: -0.02em; line-height: 1;
}
```

> Note: Tighten letter-spacing slightly to match Inter 800's proportional feel (from mockup-c at -0.02em).

### 1.3 — Increase circle flash opacity and border brightness

**File:** `index.html`, `.flash-correct` and `.flash-wrong` rules (~lines 179–186)

Current:
```css
.note-circle.flash-correct {
  background: rgba(55,185,75,0.34);
  border-color: rgba(100,230,110,0.82);
}
.note-circle.flash-wrong {
  background: rgba(210,45,35,0.34);
  border-color: rgba(240,85,75,0.82);
}
```

Change to:
```css
.note-circle.flash-correct {
  background: rgba(46,204,113,0.44);
  border-color: rgba(100,230,110,1.0);
  box-shadow: 0 0 20px rgba(46,204,113,0.35);
}
.note-circle.flash-wrong {
  background: rgba(210,45,35,0.44);
  border-color: rgba(240,85,75,1.0);
  box-shadow: 0 0 20px rgba(231,76,60,0.35);
}
```

> Using Gemini mockup-c's color values (rgba(46,204,113,...) green, rgba(231,76,60,...) red) which are more vivid. Adding a glow box-shadow for extra visibility on the orange background.

### 1.4 — Progress slot size 32px → 40px

**File:** `index.html`, `.prog-slot` rule (~line 216)

Current:
```css
.prog-slot {
  width: 32px; height: 32px;
  ...
}
```

Change to:
```css
.prog-slot {
  width: 40px; height: 40px;
  ...
}
```

> Also update `min-height` on `#progress-row` from `36px` to `44px` to accommodate.

### 1.5 — Phase label opacity 0.55 → 0.63

**File:** `index.html`, `#phase-label` rule (~line 73)

Current:
```css
opacity: 0.55;
```

Change to:
```css
opacity: 0.63;
```

---

## Commit 2 — Animations

These require both CSS keyframe additions and a JS change to how `.playing` is applied/removed. More care needed to avoid breaking existing playback timing.

### 2.1 — Resonance pulse ring when note plays

Mockup-c's approach: a `::after` pseudo-element on `.playing` that expands and fades as a ring.

**CSS addition** (near `.note-circle.playing` rule, ~line 175):

```css
.note-circle {
  position: relative;  /* ensure ::after positions correctly — CHECK: may already be set */
}

.note-circle.playing {
  background: rgba(255,255,255,0.24);
  border-color: rgba(255,255,255,0.75);
}

.note-circle.playing::after {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.4);
  animation: pulse-ring 1.2s cubic-bezier(0.2, 0, 0.8, 1) infinite;
  pointer-events: none;
}

@keyframes pulse-ring {
  0%   { transform: scale(0.9); opacity: 0.8; }
  100% { transform: scale(1.3); opacity: 0; }
}
```

> **Risk:** `.note-circle` currently has no `position` set. Check if `::after` on a non-positioned element positions correctly — if not, add `position: relative` to `.note-circle`. Test that the ring doesn't clip against `#circles-zone` overflow. May need `overflow: visible` on `.note-circle`.

### 2.2 — Spring scale on correct state

**CSS change** to `.note-circle.flash-correct` (extends 1.3 changes):

```css
.note-circle.flash-correct {
  background: rgba(46,204,113,0.44);
  border-color: rgba(100,230,110,1.0);
  box-shadow: 0 0 20px rgba(46,204,113,0.35);
  transform: scale(1.05);
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
              background 0.18s, border-color 0.18s;
}
```

The `cubic-bezier(0.175, 0.885, 0.32, 1.275)` is a spring easing that overshoots slightly — this is the "spring" effect. The base `.note-circle` transition already has `transition: background 0.18s, border-color 0.18s, transform 0.12s`; the flash-correct rule overrides transform's transition to use the spring curve.

> **Risk:** Existing `.note-circle:active` also uses `transform: scale(0.92)`. Confirm CSS specificity doesn't cause `.flash-correct` and `:active` to fight on tap.

### 2.3 — Shake on wrong state

**CSS change** to `.note-circle.flash-wrong` (extends 1.3 changes):

```css
.note-circle.flash-wrong {
  background: rgba(210,45,35,0.44);
  border-color: rgba(240,85,75,1.0);
  box-shadow: 0 0 20px rgba(231,76,60,0.35);
  animation: shake-wrong 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

@keyframes shake-wrong {
  0%, 100% { transform: translateX(0); }
  15%, 55%  { transform: translateX(-7px); }
  35%, 75%  { transform: translateX(7px); }
}
```

> **Risk:** The shake animation conflicts with the `transition: transform 0.12s` on `.note-circle`. Explicitly set `animation-fill-mode: forwards` to hold the end state, and ensure the JS flash timing (how long `flash-wrong` class stays on) is longer than 0.45s so the animation completes before class removal.
>
> Also: if both circles get `flash-wrong` simultaneously (current behavior per JS), both will shake in sync — this is fine and actually looks right.

### 2.4 — JS timing review

**File:** `index.html` JS section

Search for where `flash-correct` / `flash-wrong` classes are added and the timeout that removes them. Confirm:
- Flash-correct dwell time ≥ 300ms (spring animation needs ~300ms to complete)
- Flash-wrong dwell time ≥ 500ms (shake animation is 450ms)

If current dwell is shorter, extend it. This is the only JS change needed for the animations.

---

## File Scope

Only `index.html` is modified. No new files.

---

## Commit Messages

```
Commit 1: ui: font, flash opacity, progress row, phase label opacity

Commit 2: ui: resonance pulse, spring correct, shake wrong animations
```
