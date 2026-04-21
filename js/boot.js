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

// ══════════════════════════════════════════════════════
// APP ICON — draws the home screen icon onto a 180×180 canvas
// and sets it as the apple-touch-icon (used when adding to home screen)
// and the in-app info/welcome overlay icons.
// ══════════════════════════════════════════════════════
// APP ICON — draws the home screen icon onto a 180×180 canvas
// and sets it as the apple-touch-icon (used when adding to home screen)
// and the in-app info overlay icon (#info-app-icon).
// ══════════════════════════════════════════════════════
(function(){
  const sz = 180;
  const c  = document.createElement('canvas');
  c.width  = c.height = sz;
  const ctx = c.getContext('2d');

  const r = 36;
  ctx.fillStyle = '#b83c08';
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(sz-r, 0);
  ctx.quadraticCurveTo(sz, 0, sz, r);
  ctx.lineTo(sz, sz-r);
  ctx.quadraticCurveTo(sz, sz, sz-r, sz);
  ctx.lineTo(r, sz);
  ctx.quadraticCurveTo(0, sz, 0, sz-r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath(); ctx.fill();

  const vg = ctx.createRadialGradient(sz/2, sz/2, sz*0.2, sz/2, sz/2, sz*0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, sz, sz);

  const earScale = 110 / 15;
  const earOffX  = 10;
  const earOffY  = 35;
  ctx.save();
  ctx.translate(earOffX, earOffY);
  ctx.scale(earScale, earScale);
  const earPath = new Path2D(
    'M7 0C11 0 13 2 13 5C13 7.5 11 8.5 10.5 11C10 12.5 9 15 7 15C5 15 4.5 13.5 3.5 12C2.5 10.5 3.5 10 4 10.5C4.5 11 5.5 14 7 14C8 14 9 12 9.5 10.5C10 8 12 7 12 5C12 2.5 10.5 1 7 1C4.5 1 3.5 2.5 3.5 4C3.5 5 2.5 5 2.5 4C2.5 1.5 4 0 7 0zM7.5 2.5C5.5 2.5 4.5 3.5 4.5 5C4.5 6 4.5 7 5 7.5C5.5 8 6 8.5 5.5 9C5 9.5 6 10.5 7 9C7.5 8 7 7.5 6.5 7C6 6.5 5.5 6 5.5 5C5.5 4.5 6 3 7.5 3C8.5 3 10 3.5 10 5C10 6.5 9 7.5 9.5 7.5C10 7.5 10.5 6 10.5 5C10.5 3 8.5 2.5 7.5 2.5z'
  );
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill(earPath);
  ctx.restore();

  const forkAngle  = -41.42 * Math.PI / 180;
  const forkScale2 = 1.05;
  const forkCanvasX = 135;
  const forkCanvasY = sz / 2;

  ctx.save();
  ctx.translate(forkCanvasX, forkCanvasY);
  ctx.rotate(forkAngle);
  ctx.scale(forkScale2, forkScale2);
  ctx.translate(-50, -50);

  const forkPath2 = new Path2D(
    'M44.166,64.814c-2.928,3.32-6.117,2.474-8.33,0.521c-2.213-1.952-3.449-5.011-0.521-8.33L82.169,3.905L77.744,0L30.891,53.102c-4.33,4.907-3.796,10.473-0.949,14.454L11.626,88.314c-1.999-0.401-4.149,0.243-5.595,1.881c-2.156,2.442-1.923,6.174,0.521,8.329c2.444,2.156,6.174,1.922,8.33-0.521c1.445-1.638,1.816-3.853,1.169-5.786L34.368,71.46c4.303,2.329,9.893,2.166,14.223-2.739l46.854-53.103l-4.426-3.904L44.166,64.814L44.166,64.814z'
  );
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill(forkPath2);
  ctx.restore();

  const dataUrl = c.toDataURL('image/png');
  const icon = document.getElementById('apple-touch-icon');
  if (icon) icon.href = dataUrl;
  const infoIcon = document.getElementById('info-app-icon');
  if (infoIcon) infoIcon.src = dataUrl;
  const welcomeIcon = document.getElementById('welcome-app-icon');
  if (welcomeIcon) welcomeIcon.src = dataUrl;
})();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/ear/sw.js');
}
