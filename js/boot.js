'use strict';
// BOOT
// ══════════════════════════════════════════════════════
loadState();
loadLoggingState();
centsIdx=settings.startCentsIdx;
renderSettings();
updateRetestUI();
$('status-msg').textContent = '';
setBg('#4d1903');

function checkFirstRun() {
if (!localStorage.getItem('vio4-seen-welcome')) {
  openWelcome();
  return;
}
// Returning user. If voice is opted in globally, show the Hello daily
// opt-in; otherwise go straight to StartScreen.
if (settings.voiceCommands) {
  openHello();
} else {
  showStartScreen();
}
}
document.addEventListener('DOMContentLoaded', checkFirstRun);
if (document.readyState !== 'loading') checkFirstRun();

function showStartScreen() {
$('app').style.visibility  = '';
$('swipe-hint').style.visibility = '';
$('info-overlay').classList.remove('open');
$('settings-overlay').classList.remove('open');
retestNote = null;
retestEnding = false;
firstRoundOfRetest = false;
atLeastOneSuccessfulRetest = false;
roundFailed = false;
roundResults = []; roundAttempts = 0;
pendingCentsStep = 0;
updateRetestUI();
$('round-actions').style.display = 'none'; hideRetestEndActions();
$('status-msg').textContent = '';
$('note-row').style.display        = 'none';
$('replay-btn').style.display      = 'none';
$('swipe-hint').style.display      = 'none';
$('start-btn').style.display       = 'block';
$('upper-half').style.visibility   = 'hidden';
$('lower-half').style.visibility   = 'hidden';
}

function hideStartScreen() {
$('note-row').style.display        = '';
$('replay-btn').style.display      = '';
$('swipe-hint').style.display      = '';
$('start-btn').style.display       = 'none';
$('upper-half').style.visibility   = 'visible';
$('lower-half').style.visibility   = 'visible';
$('diff-value').textContent = fmtC(CENTS_SEQ[centsIdx]);
}

// Start tap. Synchronous gesture-frame entry — kicks off audio (and mic
// when VR is engaged this session) synchronously and resolves the rest
// in a .then. iOS Safari closes the permission window on the first
// async boundary inside a click handler, so the kick MUST happen before
// any await. Mirrors microbreaker's start-btn-inner pattern.
function handleStart() {
const audioP = ensureAudio();
let micP = Promise.resolve(true);
// Re-acquire mic if the user opted into voice this session but the
// stream was invalidated (e.g., persistent-mute auto-release after a
// background). Idempotent if the stream is already live.
if (sessionUseVoice && typeof acquireMic === 'function') {
  micP = acquireMic();
}
Promise.all([audioP, micP]).then(([_, micOk]) => {
  if (sessionUseVoice && !micOk) {
    console.warn('[start] mic acquisition failed — voice will be unavailable for this round');
    sessionUseVoice = false;
  }
  if (typeof wlAcquire === 'function') wlAcquire('start');
  _handleStartContinue();
}).catch(e => {
  console.warn('[start] error:', e);
  _handleStartContinue();
});
}

// Post-gesture continuation. Soundfont load + round start.
function _handleStartContinue() {
hideStartScreen();
const s = SOUNDS[settings.soundIdx];
if (s.type === 'sf') {
  $('status-msg').textContent = 'Loading…';
  $('status-msg').style.color = 'rgba(255,255,255,0.45)';
  loadSfInstrument(s.sfName)
    .then(() => {
      renderSoundGrid();
      $('status-msg').textContent = '';
      startRound();
    })
    .catch(() => {
      $('status-msg').textContent = '';
      startRound();
    });
} else {
  startRound();
}
}

// App icon (apple-touch-icon + info/welcome overlays) is served from
// resources/app-icon-180.png, referenced statically from index.html.
// Do not re-introduce canvas-drawn or data:-URL icons here — iOS Safari
// "Add to Home Screen" does not reliably accept them. Source of truth for
// the icon is resources/app-icon.svg; regenerate the PNG via the svg-to-png
// skill. See research/pwa-home-screen-icon-plan.md.

if ('serviceWorker' in navigator) {
  // In dev, the cache key in sw.js is `ear-tuner-static-%%BUILD_DATE%%`
  // — the placeholder is only stamped at deploy time, so the cache name
  // is stable across dev sessions and an old SW will happily serve
  // stale CSS/JS forever. Auto-unregister any existing SW when running
  // on localhost; only register a real SW in prod.
  //
  // To test SW behavior locally, deploy to a real origin (or flip the
  // isDev check below).
  const isDev = location.hostname === 'localhost' ||
                location.hostname === '127.0.0.1';
  if (isDev) {
    navigator.serviceWorker.getRegistrations()
      .then(regs => regs.forEach(r => r.unregister()));
  } else {
    // Auto-update on every launch — iOS home-screen PWAs honour the browser's
    // built-in 24h update check very loosely, leaving users many days out of
    // date. Force a check now, push any new SW to activate, and reload once
    // when it takes over. See research/pwa-reload-button-diagnosis.md §8.
    let reloadingForUpdate = false;
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.update().catch(() => {});
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            newSW.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloadingForUpdate) return;
        reloadingForUpdate = true;
        window.location.reload();
      });
    });
  }
}
