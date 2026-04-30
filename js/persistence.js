'use strict';
// PERSISTENCE
// ══════════════════════════════════════════════════════
function loadState() {
try {
  const s=localStorage.getItem('vio4-settings');
  if(s) Object.assign(settings, JSON.parse(s));
  // Clamp note range to valid indices (guards against stale saved values)
  settings.lowestNote  = Math.max(0, Math.min(ALL_NOTES.length-2, settings.lowestNote));
  settings.highestNote = Math.max(settings.lowestNote+1, Math.min(ALL_NOTES.length-1, settings.highestNote));
  settings.volume = Math.max(0, Math.min(2, Number.isFinite(settings.volume) ? settings.volume : 1.0));
  const t=localStorage.getItem('vio4-stats'); if(t) stats=JSON.parse(t);
} catch(e){}
}
function saveSettings() { try{localStorage.setItem('vio4-settings',JSON.stringify(settings));}catch(e){} }
function saveStats()    { try{localStorage.setItem('vio4-stats',   JSON.stringify(stats));}catch(e){} }


