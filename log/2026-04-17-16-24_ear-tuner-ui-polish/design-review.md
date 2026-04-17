# Ear Tuner — UI Design Review
*Reviewed against iPhone 15 (390×844pt logical), April 2026*

---

## Fonts

**Inconsolata** is a monospace coding font. For a music app, it's an unusual choice, but it actually works — it gives the app a "technical instrument" feel, like a digital tuner or signal meter. That's coherent with what the app *does*. It's not wrong; it reads as intentional.

The main weakness is **note names in circles at large sizes** (28–42px). Monospace means every character is equal width, so "G4" and "A♭4" feel mechanically sized rather than visually weighted. A proportional bold sans (Inter 800, as in the mockups) looks more confident at display size.

> [!casey] OK, let's try Inter 800

**Nunito** as the secondary font (diff-value, nc-detail) is a reasonable contrast — rounded and friendly against the technical mono. But it's doing very little work since those elements are small and dim. Could probably unify to just Inconsolata.

---

## Colors

The **burnt orange (#b83c08)** is bold and distinctive. It reads as warm and energetic — suits a practice tool. The **warm parchment (#f5efe6)** in the info overlay and **dark forest green (#0d2a1a)** for retest mode make a coherent 3-color family.

### Issues

- **Vignette at 55% opacity**: Too heavy on a small screen. It creates a dark tunnel effect and competes with the circle elements. Pull it back to ~28–30%.
> [!casey] I don't agree
- **Status text #e8d5b0**: Warm tan on orange is low contrast. On a sunlit iPhone screen it could be hard to read. This is the most impactful usability fix — change to `rgba(255,255,255,0.92)` and give it a color shift on correct/wrong states (soft green / soft coral). Currently status text is the same color whether you got it right or wrong.
> [!casey] I kinda like the subtlety of the text. Leave it for now.

- **Circle flash states** (correct/wrong): The `rgba` bg opacity of 0.34 is too subtle against the orange background. Both states need to be more vivid — 0.42–0.45 bg opacity and brighter borders. Currently they're easy to miss.
> [!todo]  I agree... they look weird in the different modes. Make the change
---

## Balance & Layout

The three-zone vertical layout (diff label / circles / controls) is well-conceived. The circles land naturally in the middle third.

- **Progress row** (32px slots) is small on iPhone. Bumping to 40px helps legibility without changing the layout.
> [!casey] OK. Increase to 40px 
- The replay button at 69px below the circles is fine for size but sits close to them — the 18px gap is slightly tight visually. Not a usability problem.
- Corner buttons (settings bottom-left, info bottom-right) are well-placed for thumb access.

---

## States

| State       | Assessment                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Idle**    | Clean. Start button is clear and well-sized.                                                                                                                                   |
| **Listen**  | ==Phase label at 0.55 opacity is dim in ambient light. Could be 0.70.==                                                                                                        |
| **Correct** | ==Circle flash too subtle; status text doesn't turn green.==                                                                                                                   |
| **Fail**    | Same — flash too subtle; status text stays warm tan regardless of outcome. Retry/Continue buttons appear correctly.                                                            |
| **Retest**  | Orange → dark green transition is jarring on first exposure. The 0.5s ease transition helps, but the accent color shift (orange UI chrome → green bg) needs a moment to parse. |

---

## Mockups

Two alternative HTML mockups are in this folder. Each has a state-switcher tab bar at the top (Idle / Listen / Correct / Fail / Retest). Open directly in Safari on iPhone.

### Option A — Refined Warmth (`mockup-a-refined.html`)

Same orange identity. Seven targeted improvements:

- [x] **Note name font**: Inter 800 instead of Inconsolata 600 — proportional, more confident at large sizes
1. **Vignette**: 28% opacity (was 55%) — lets orange breathe, less tunnel effect
- [x] 2. **Label opacity**: 0.70 (was 0.55) — phase label, diff label both more readable. Compromise.. .63
> [!casey] As a compromise, use opacity .63 for the phase label. I want it to stay somewhat subtle


1. **Status text**: `rgba(255,255,255,0.92)` (was warm tan `#e8d5b0`) — better contrast
- [x] **Status text states**: soft green on correct, soft coral on fail (was same color always)
1. **Circle flash**: bg opacity 0.44 + brighter borders (was 0.34) — more vivid feedback
- [x] **Progress row**: 40px slots (was 32px) — easier to read at a glance

### Option B — Obsidian Dark (`mockup-b-dark.html`)

Complete redesign. "Rack-mount tuner" / oscilloscope aesthetic.

- **Background**: `#0e0c0a` — warm near-black
- **Accent**: amber/gold `#d4882a` replaces burnt orange
- **Circles**: dark glass with amber border glow; glow shifts to emerald (correct) or rose (fail)
- **Retest mode**: deep navy `#080c18` with blue-purple accent
- **Scanline texture**: very faint CSS repeating gradient — instrument display feel
- **Note names**: Inter 800 (same recommendation as Option A)

Pros: better for dark practice environments, high contrast state feedback, distinctive "instrument" identity.
Cons: loses the orange brand warmth, retest mode distinction is subtler (navy vs black).

---

## Summary Recommendations (priority order)

1. **Status text contrast** — biggest usability gain, one-line fix
2. **Status text color states** — makes correct/fail feel meaningfully different
3. **Circle flash opacity** — more vivid feedback without changing layout
4. **Vignette reduction** — subtle but makes the screen feel less heavy
5. **Label opacity bump** — small readability improvement
6. **Note name font** — optional but Inter 800 in circles looks more polished

> [!casey] Additional, look at, C:\Users\CaseyM\OneDrive\Projects\fiddle\ear-tuner\research\mockup-c-gemini.html which contains mock ups of suggestions from [gemini-design-review](gemini-design-review.md)
> I like a few of its suggestions:
> - **Resonance:** When a note plays, add a subtle CSS "pulse" animation to the circle. It should feel like the note is "ringing" through the UI. 
> -  **Haptic-Style Visuals:** Use "spring" animations (transform: scale(1.05)) for success states.  Also the sideways shaking effect for the "wrong state"
> - Don't take the other changes in that mock up