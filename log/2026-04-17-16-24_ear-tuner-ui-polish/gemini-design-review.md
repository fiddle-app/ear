# Gemini Design Review: Ear Tuner
*Date: April 13, 2026*

## 1. Core Identity & Vibe
The app has a strong, distinctive "Workshop" personality. The use of **Burnt Orange (#b83c08)** and **Forest Green (#0d2a1a)** creates a warm, focused environment that suits a practice tool. 

**Recommendation:** Lean further into the "Instrument-Grade" aesthetic. The current UI uses very standard web-style transparency. By adding subtle depth (inner shadows, soft glows) and refined typography, we can make it feel less like a "web page" and more like a high-end digital tuner.

- [s] Your statement`
    
- [i] Your statement`
    
- ["] Your statement`
## 2. Typography
**Current:** Inconsolata (Mono) + Nunito (Sans).
 - [ ] **Inconsolata** is great for the "technical" data (cents, settings). 
 - [ ] **Nunito** feels a bit too "friendly/playful" for the serious technical task of ear training.
> [!casey] But the zero "0" of Inconsolata looked weird... a dot in the middle. I'm open for a different font for displaying the numbers.

**Recommendation:** Keep Inconsolata for technical readouts, but switch the Note Names (G4, A#5) to a high-contrast, bold Proportional Sans (like **Inter** or **Public Sans**). This makes the primary information (the note) feel "anchored" and professional.
> [!todo]  Consider Inter, Public Sans, and Inter 800

## 3. Interaction & Animation
**Current:** 0.5s background transitions and simple opacity flashes.
 - [s] The transition to Retest mode is good, but the =="flash" states for Correct/Wrong are a bit "thin."==

**Recommendation:** 
 - [ ] **Resonance:** When a note plays, add a subtle CSS "pulse" animation to the circle. It should feel like the note is "ringing" through the UI. ==YES==
 - [ ] **Haptic-Style Visuals:** Use "spring" animations (transform: scale(1.05)) for success states.  ==YES==
 - [ ] **Improved Vignette:** Keep the vignette (as per user preference), but perhaps make it dynamic—pulse it slightly when the audio starts to signal the "Listen" phase.

## 4. Usability Fixes (Priority)
 - [ ] **Status Text Contrast:** As noted in the previous review, `#e8d5b0` on orange is low contrast. I recommend moving to a high-white (`rgba(255,255,255,0.95)`) for the base message and using distinct, glowing colors for Correct (Emerald) and Wrong (Soft Red/Coral).
 - [ ] **Flash Visibility:** In Retest mode (dark green), the red/green flashes need higher saturation to stand out against the dark background.
 - [ ] **Progress Row:** Bump to 40px for better visibility on mobile, as previously suggested.

## 5. Proposed "Mockup C" Strategy
I will create a mockup that combines the "Warmth" of the original with "Precision" elements:
 - [ ] **Frosted Glass (Glassmorphism):** Use `backdrop-filter: blur` on circles to make them pop against the orange/green backgrounds.
 - [ ] **Instrument Display:** Give the "diff-value" area a subtle "LCD" or "LED" backlight feel.
 - [ ] **Tactile Feedback:** Buttons should have a more "pressed" state rather than just opacity changes.

