'use strict';
// LOGGING SYSTEM
// ══════════════════════════════════════════════════════
const LOG_KEY     = 'vio4-log';
const LOG_MAX     = 200;
let   loggingEnabled = false;

function loadLoggingState() {
try { loggingEnabled = localStorage.getItem('vio4-logging') === '1'; } catch(e){}
}
function logEvent(msg) {
if (!loggingEnabled) return;
try {
  const entries = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  const ts = new Date().toISOString().replace('T',' ').slice(0,22);
  entries.push(`[${ts}] ${msg}`);
  if (entries.length > LOG_MAX) entries.splice(0, entries.length - LOG_MAX);
  localStorage.setItem(LOG_KEY, JSON.stringify(entries));
} catch(e){}
}
function onLoggingToggle(val) {
loggingEnabled = val;
try { localStorage.setItem('vio4-logging', val ? '1' : '0'); } catch(e){}
updateLogUI();
if (val) logEvent('Logging enabled');
}

// ── CHANGED: copyLog now shows "Copied!" feedback on the button ──
function copyLog() {
try {
  const entries = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  const text = entries.join('\n') || '(empty)';
  const btn = document.getElementById('s-copy-log-btn');
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      btn.textContent = 'Copied!';
      btn.classList.add('feedback');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('feedback');
      }, 1800);
    }
  }).catch(() => {
    // Fallback: prompt with text
    prompt('Copy log:', text);
  });
  logEvent('Log copied');
} catch(e){}
}

function clearLog() {
try { localStorage.removeItem(LOG_KEY); } catch(e){}
updateLogUI();
logEvent('Log cleared');
}
async function reloadFromServer() {
try {
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.update();
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }
  if (window.caches) {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith('ear-tuner-static-')).map(k => caches.delete(k))
    );
  }
} catch (e) { /* ignore — reload anyway */ }
window.location.replace(window.location.pathname);
}
function updateLogUI() {
const chk = $('s-logging-chk');
if (chk) chk.checked = loggingEnabled;
const row = $('s-copy-log-row');
if (row) row.style.display = loggingEnabled ? '' : 'none';
if (loggingEnabled) {
  try {
    const entries = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    const el = $('s-log-count');
    if (el) el.textContent = `${entries.length} entries`;
  } catch(e){}
}
}


