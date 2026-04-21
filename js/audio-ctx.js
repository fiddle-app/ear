'use strict';
// =================================================
// SHARED ZOMBIE-PROOF AUDIOCTX MANAGER
// Used by: microbreaker, ear-tuner
// =================================================
// Exposed globals: audioCtx, audioCtxGeneration, audioUnlocked, masterGain,
//                  nukeAudioCtx(), ensureAudio()
// Each app's audio.js may add its own synth functions that reference audioCtx.

let audioCtx          = null;
let audioCtxGeneration = 0;   // bumped on every recreate — stale refs detect zombie
let audioUnlocked     = false;

let masterGain = null;

function nukeAudioCtx(reason) {
  // Abandon old context synchronously — no await, preserves user-gesture stack on iOS.
  if (!audioCtx) return;
  const old = audioCtx;
  audioCtx   = null;
  masterGain = null;
  audioUnlocked = false;
  audioCtxGeneration++;
  // Soundfont instruments are bound to the old context — clear so they reload on next play.
  // (sfInstruments/sfLoadingP only exist in apps using soundfont-player)
  if (typeof sfInstruments !== 'undefined') {
    Object.keys(sfInstruments).forEach(k => delete sfInstruments[k]);
  }
  if (typeof sfLoadingP !== 'undefined') {
    Object.keys(sfLoadingP).forEach(k => delete sfLoadingP[k]);
  }
  // Fire-and-forget close so the OS reclaims hardware eventually
  try { old.close(); } catch(e){}
}

async function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = (parseFloat(settings.notifyVol) || 0.35) / 0.35;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    try { await audioCtx.resume(); } catch(e){}
  }
  audioUnlocked = true;
  // Request 'playback' audio session so audio is not muted by iOS Ring/Silent switch
  if (navigator.audioSession && navigator.audioSession.type !== 'playback') {
    try { navigator.audioSession.type = 'playback'; } catch(e){}
  }
}

// iOS zombie-context: state stays 'running' but hardware output is disconnected.
// Nuke unconditionally — ensureAudio() will recreate on next user gesture.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (audioCtx) nukeAudioCtx('visibility-restore');
  }
});

// Nuke here too — pageshow may fire without visibilitychange (BFCache)
window.addEventListener('pageshow', () => {
  if (audioCtx) nukeAudioCtx('pageshow');
  // iOS BFCache restores DOM inline styles including visibility:hidden set by openInfo/openSettings.
  // Always reset to ensure app content is visible on restore.
  const appEl   = document.getElementById('app');
  const swipeEl = document.getElementById('swipe-hint');
  const infoEl  = document.getElementById('info-overlay');
  if (appEl)   appEl.style.visibility   = '';
  if (swipeEl) swipeEl.style.visibility = '';
  if (infoEl)  infoEl.classList.remove('open');
});

// iOS/iPadOS: unlock audio context on any touch, in case ensureAudio()
// was never called (e.g. foot pedal was first interaction)
document.addEventListener('touchstart', () => {
  ensureAudio();
}, { once: false, passive: true });
