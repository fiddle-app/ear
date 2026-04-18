# 2026-04-18-08-15 iOS Audio Zombie Fix (v2) + Build Date Display

**2026-04-18**

## The Problem

After the app loses and regains focus on iOS, all audio stops permanently and
never recovers. User provided diagnostic logs showing `audioCtx.state=running`
on every single entry — including entries logged *after* the bug manifested.

## First Fix Attempt (failed)

Introduced a `contextNeedsReset` flag: set to `true` in the `visibilitychange →
visible` handler when state was `'running'`; `ensureAudio()` would then close
the old context and recreate. The fix deployed at 23:21 local.

User tested and the bug recurred. Key finding: the log line `ensureAudio |
closing zombie context` **never appeared**, meaning the fix didn't fire. The
exact reason was unclear — possible explanations were browser caching (ruled out:
no service worker) or a subtle bug in the flag approach.

## Opus Advisor Analysis

Spawned an Opus agent with both diagnostic logs and the full relevant code.
Opus identified three interacting issues:

1. **The flag never fired reliably.** The `focus` event handler was calling
   `audioCtx.resume()` on the zombie context, which may have interfered with
   flag detection or context state.

2. **`await audioCtx.close()` loses iOS user-gesture context.** The async gap
   introduced by `await close()` breaks the user-gesture call stack that iOS
   requires for `new AudioContext()`. The recreated context would be created
   outside gesture context and could not be resumed.

3. **`resume()` is useless on a running zombie.** iOS reports `state='running'`
   even after hardware is silenced — `resume()` is a no-op in that state.

Notably, the Opus agent applied its fixes directly to `index.html` (not just
described them), so the changes were already present locally when the conversation
resumed.

## Second Fix (Opus approach)

Replaced the flag mechanism entirely with `nukeAudioCtx(reason)`:

- **Synchronous** — no `await`. Saves the old context reference, nulls `audioCtx`,
  bumps `audioCtxGeneration`, clears soundfont caches (`sfInstruments`,
  `sfLoadingP`), then calls `old.close()` fire-and-forget. No async gap means
  no loss of iOS user-gesture context.
- **Called unconditionally** on `visibilitychange → visible` and `pageshow`.
  No heuristics, no state checking — every focus return nukes the context.
- **`focus` event handler removed** — it was calling `resume()` on zombies.
- **`ensureAudio()` simplified** — just creates a new context if null, resumes
  if suspended, sets audio session type. Logs context creation with generation
  counter for diagnostics.

All `ensureAudio()` call sites were already awaited in the current code, so no
changes needed there.

## Build Date Display

User noted that without a visible version stamp, it's impossible to verify
whether the browser is running the latest deployed code (especially during rapid
iteration). Added:

- `const BUILD_DATE = 'YYYY-MM-DD HH:mm';` constant at the top of the JS
  constants block — updated manually on every commit.
- A `<div id="build-date-display">` at the very bottom of the info overlay
  (after the close button), populated by `openInfo()` via
  `bd.textContent = 'build ' + BUILD_DATE`.
- Format: `YYYY-MM-DD HH:mm` local time. Fixed-size monospace, low-opacity,
  centered.

Initial placement was in the app header (under the tagline) — user moved it
to the last line of the info page on review.

## Commits & Deploys

| Time  | Commit | What |
|-------|--------|------|
| 23:21 | `1eec363` | First fix (contextNeedsReset — failed) |
| 23:37 | `cc469cc` | Opus nuke approach + build date |
| 08:12 | `916944a` | Move build date to bottom; HH:mm format |

Live at: https://fiddle-app.github.io/ear/  
Current build stamp: `2026-04-17 23:37`

## What to Watch For in Testing

Log lines that confirm the fix is running:
- `nukeAudioCtx | reason=visibility-restore | gen=N | old.state=running`
- `ensureAudio | new ctx created | gen=N | state=...`

If sound fails after a focus return and these lines are absent, the fix did not
execute — likely a cache issue or the context was already null before nuke ran.
