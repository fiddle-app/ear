# 2026-04-17-23-21 iOS Zombie AudioContext Fix

**2026-04-17**

- User reported a persistent bug: after the app loses and regains focus on iOS,
  all sound stops and never recovers — not even after multiple focus cycles.
  Previous debug attempts had failed.

- User provided a key diagnostic: a copied log showing `audioCtx.state=running`
  on every single entry, including entries logged after the bug manifested.
  This was the decisive clue.

- **Root cause identified:** iOS WebAudio zombie context. When iOS backgrounds
  an app and the audio hardware is interrupted, the `AudioContext` does not
  transition to `suspended` — it stays in `running`. As a result, the existing
  `resume()` calls on `visibilitychange` were no-ops (state was already reported
  as running), and the context was silenced with no way to recover via normal
  means.

- **Fix:** Three-part change to `index.html`:
  1. Added `contextNeedsReset = false` flag alongside `audioCtx`.
  2. Changed the `visibilitychange → visible` handler: if state is `'suspended'`,
     call `resume()` as before; if state is `'running'` (the zombie case), set
     `contextNeedsReset = true` instead — no point calling resume on a running
     context.
  3. In `ensureAudio()`: if `contextNeedsReset` is true, close the old context
     (`audioCtx.close()`), clear the soundfont instrument caches (`sfInstruments`
     and `sfLoadingP` — both are bound to the old context), null `audioCtx`, and
     clear the flag. The existing code then falls through to create a fresh
     `AudioContext`.

- The reset happens on the **next user gesture** (button tap → `playBothNotes`
  → `ensureAudio`), not on visibility return — this is required because iOS
  won't allow `new AudioContext()` without a user gesture.

- Soundfont reload after reset is transparent in practice: the audio files in
  `sounds/` are served locally and browser-cached after the first load.

- Committed: `fix: close and recreate AudioContext on focus return to cure iOS zombie audio`
- Deployed to: https://fiddle-app.github.io/ear/
