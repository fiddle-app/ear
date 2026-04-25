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

async function handleStart() {
await ensureAudio();
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
    // Relative path so it resolves at fiddle-app.github.io/ear/sw.js.
    navigator.serviceWorker.register('sw.js');
  }
}
