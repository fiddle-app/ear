'use strict';
// iOS sometimes caches font sizes across orientation changes — force recalc
window.addEventListener('orientationchange', () => {
setTimeout(() => {
  document.querySelectorAll('.hint-text').forEach(el => {
    el.style.fontSize = '';
  });
}, 100);
});

// SWIPE + SHAKE
// ══════════════════════════════════════════════════════
let touchStartY=0, touchStartX=0;
document.getElementById('app').addEventListener('touchstart', e=>{
touchStartY=e.touches[0].clientY; touchStartX=e.touches[0].clientX;
}, {passive:true});
document.getElementById('app').addEventListener('touchend', e=>{
const dy=touchStartY-e.changedTouches[0].clientY;
const dx=touchStartX-e.changedTouches[0].clientX;
const absDx=Math.abs(dx), absDy=Math.abs(dy);

if (absDx > 45 && absDx > absDy) {
  if (dx < 0 && roundFailed) {
    const actionsVisible = $('round-actions').style.display === 'flex';
    const continueVisible = actionsVisible && $('continue-action-btn').style.display !== 'none';
    const backVisible = actionsVisible && $('back-action-btn').style.display !== 'none';
    if (continueVisible || backVisible) { continueAfterFail(); return; }
  }
  if (dx > 0 && roundFailed && retestNote) {
    const retryVisible = $('retry-action-btn').style.display !== 'none' &&
      $('round-actions').style.display === 'flex';
    if (retryVisible) { retryRound(); return; }
  }
}

if (roundFailed||!awaiting) return;
if (absDy<45||absDx>absDy) return;
handleAnswer(dy>0);
}, {passive:true});


function openResetDefaults() { $('reset-overlay').classList.add('open'); }
function closeResetDefaults() { $('reset-overlay').classList.remove('open'); }
function confirmResetDefaults() {
$('reset-overlay').classList.remove('open');
settings = { lowestNote:22, highestNote:53, startCentsIdx:5, noteDurIdx:3, attack:1, decay:1, soundIdx:0, testsPerRound:3 };
saveSettings();
centsIdx = settings.startCentsIdx;
renderSettings();
}

// ══════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════
let previewTimer=null;
function adjustSetting(key,dir) {
if      (key==='lowestNote')    settings.lowestNote    = Math.max(0, Math.min(settings.highestNote-1, settings.lowestNote+dir));
else if (key==='highestNote')   settings.highestNote   = Math.max(settings.lowestNote+1, Math.min(ALL_NOTES.length-1, settings.highestNote+dir));
else if (key==='startCentsIdx') settings.startCentsIdx = Math.max(0, Math.min(CENTS_SEQ.length-1, settings.startCentsIdx+dir));
else if (key==='testsPerRound') settings.testsPerRound = Math.max(1, Math.min(7, settings.testsPerRound+dir));
else if (key==='noteDurIdx')    settings.noteDurIdx    = Math.max(0, Math.min(DUR_STEPS.length-1, settings.noteDurIdx+dir));
else if (key==='attack') { settings.attack=Math.max(0,Math.min(ATK_PRESETS.length-1,settings.attack+dir)); schedulePreview(); }
else if (key==='decay')  { settings.decay =Math.max(0,Math.min(DEC_PRESETS.length-1,settings.decay+dir));  schedulePreview(); }
saveSettings(); renderSettings();
}

function schedulePreview() {
if (previewTimer) clearTimeout(previewTimer);
previewTimer=setTimeout(async ()=>{ await ensureAudio(); const dur=noteDur(); playNote(69, audioCtx.currentTime+0.04, dur); }, 150);
}

function renderSettings() {
$('s-lowest').textContent      = dn(ALL_NOTES[settings.lowestNote].name);
$('s-highest').textContent     = dn(ALL_NOTES[settings.highestNote].name);
$('s-start-cents').textContent = fmtC(CENTS_SEQ[settings.startCentsIdx]);
$('s-tests-per-round').textContent = settings.testsPerRound;
$('s-note-dur').textContent    = DUR_STEPS[settings.noteDurIdx].toFixed(1)+'s';
$('s-attack').textContent      = ATK_PRESETS[settings.attack][0];
$('s-decay').textContent       = DEC_PRESETS[settings.decay][0];
$('s-build-date').textContent  = 'build ' + BUILD_DATE;
renderSoundGrid();
updateLogUI();
}

function renderSoundGrid() {
const grid=$('sound-grid'); grid.innerHTML='';
SOUNDS.forEach((s,idx)=>{
  const btn=document.createElement('button');
  btn.className='sound-btn'+(idx===settings.soundIdx?' active':'');
  btn.textContent=s.label;
  if (s.type==='sf'&&!sfInstruments[s.sfName]) btn.classList.add('loading');
  btn.onclick=()=>selectSound(idx);
  grid.appendChild(btn);
});
}

async function selectSound(idx) {
settings.soundIdx=idx; saveSettings(); renderSoundGrid();
await ensureAudio();
const sound=SOUNDS[idx];
if (sound.type==='sf'&&!sfInstruments[sound.sfName]) {
  try { await loadSfInstrument(sound.sfName); } catch(e){ console.warn('SF load failed:',e); }
  renderSoundGrid();
}
const dur=noteDur();
playNote(69, audioCtx.currentTime+0.06, dur);
}

let settingsOpenTestsPerRound = 3;

async function openSettings() {
await ensureAudio();
settingsOpenTestsPerRound = settings.testsPerRound;
const s=SOUNDS[settings.soundIdx];
if (s.type==='sf'&&!sfInstruments[s.sfName]) loadSfInstrument(s.sfName).then(()=>renderSoundGrid()).catch(()=>{});
renderSettings();
setBg('#1a1a1a');
$('settings-overlay').classList.add('open');
$('info-btn').style.visibility = 'hidden';
$('settings-btn').style.visibility = 'hidden';
}
function closeSettings() {
$('settings-overlay').classList.remove('open');
$('info-btn').style.visibility = '';
$('settings-btn').style.visibility = '';
if (welcomeIsOpen) { setBg('#f5efe6'); return; }
setBg(retestNote ? '#0d2a1a' : '#4d1903');
if (settings.testsPerRound !== settingsOpenTestsPerRound) {
  clearProgress();
  roundResults = [];
  roundAttempts = 0;
  roundFailed = false;
  awaiting = false;
  $('round-actions').style.display = 'none'; hideRetestEndActions();
  $('status-msg').textContent = '';
  setTimeout(setupAttempt, 300);
}
}

// ══════════════════════════════════════════════════════

// WELCOME
// ══════════════════════════════════════════════════════
let welcomeIsOpen = false;

function openWelcome() {
showStartScreen();
welcomeIsOpen = true;
setBg('#f5efe6');
$('welcome-overlay').classList.add('open');
$('app').style.visibility = 'hidden';
$('swipe-hint').style.visibility = 'hidden';
}

function closeWelcome() {
welcomeIsOpen = false;
try { localStorage.setItem('vio4-seen-welcome', '1'); } catch(e) {}
$('welcome-overlay').classList.remove('open');
$('app').style.visibility = '';
$('swipe-hint').style.visibility = '';
setBg('#4d1903');
}

function resetWelcome() {
try { localStorage.removeItem('vio4-seen-welcome'); } catch(e) {}
const btn = $('welcome-reset-btn');
if (!btn) return;
btn.textContent = 'Done!';
btn.disabled = true;
setTimeout(() => { btn.textContent = 'Reset'; btn.disabled = false; }, 1500);
}

// ══════════════════════════════════════════════════════

// INFO / STATS
// ══════════════════════════════════════════════════════
function toggleInfoMore() {
const content = $('info-more-content');
const btn = $('info-more-btn');
const isOpen = content.classList.toggle('open');
btn.innerHTML = isOpen ? '▲ <span>Show less</span>' : '… more';
}

function openInfo() {
setBg('#f5efe6');
const bd = $('build-date-display');
if (bd) bd.textContent = 'build ' + BUILD_DATE;
$('info-overlay').classList.add('open');
$('app').style.visibility = 'hidden';
$('swipe-hint').style.visibility = 'hidden';
$('info-btn').style.visibility = 'hidden';
$('settings-btn').style.visibility = 'hidden';
$('info-more-content').classList.remove('open');
$('info-more-btn').innerHTML = '… more';
setTimeout(() => requestAnimationFrame(() => {
  renderStats();
  const wrap = $('stats-chart-wrap');
  const canvas = $('stats-chart');
  if (wrap && canvas) {
    canvas.style.width = wrap.offsetWidth + 'px';
  }
}), 80);
}
function closeInfo() {
$('info-overlay').classList.remove('open');
$('info-btn').style.visibility = '';
$('settings-btn').style.visibility = '';
if (welcomeIsOpen) { setBg('#f5efe6'); return; }
$('app').style.visibility = '';
$('swipe-hint').style.visibility = '';
$('phase-label').textContent = 'Listen';
setBg(retestNote ? '#0d2a1a' : '#4d1903');
if (!awaiting && !roundFailed && !retestNote &&
  $('start-btn').style.display !== 'block') {
  setTimeout(startRound, 200);
}
}

function noteWeight(noteName) {
const bc = stats[noteName]?.bestCents;
const base = (bc == null) ? MAX_CENTS : bc;
return isRegressed(noteName) ? base * 1.25 : base;
}

function renderStats() {
const tbody=$('stats-tbody'); tbody.innerHTML='';

const noteInfo = {};
ALL_NOTES.forEach(n => { noteInfo[n.name] = { midi: n.midi, hz: midiToHz(n.midi) }; });

const lowestHz  = midiToHz(ALL_NOTES[settings.lowestNote].midi);
const highestHz = midiToHz(ALL_NOTES[settings.highestNote].midi);

const inRangeWithData = Object.keys(stats).filter(name => {
  const info = noteInfo[name];
  if (!info) return false;
  if (info.hz < lowestHz - 0.01 || info.hz > highestHz + 0.01) return false;
  const st = stats[name];
  return st && (st.bestCents != null || st.lastFailureCents != null || st.attempts);
});

const sorted = inRangeWithData
  .map(name => ({ name, hz: noteInfo[name].hz, midi: noteInfo[name].midi }))
  .sort((a, b) => a.hz - b.hz);

const pool = ALL_NOTES.slice(settings.lowestNote, settings.highestNote+1);
const untested = pool.filter(n => !stats[n.name] || stats[n.name].attempts == null || stats[n.name].attempts === 0);
const allTested = untested.length === 0;
let totalWeight = 0;
if (allTested) {
  totalWeight = pool.reduce((s, n) => s + noteWeight(n.name), 0);
}

const allWithBest = ALL_NOTES.filter(n => {
  const hz = midiToHz(n.midi);
  return hz >= lowestHz - 0.01 && hz <= highestHz + 0.01 && stats[n.name]?.bestCents != null;
});
if (allWithBest.length > 0) {
  const avg = allWithBest.reduce((s, n) => s + stats[n.name].bestCents, 0) / allWithBest.length;
  $('overall-score').textContent = avg.toFixed(1) + '¢';
} else {
  $('overall-score').textContent = '—';
}

if (!sorted.length) {
  tbody.innerHTML='<tr><td colspan="4" style="opacity:.45;font-style:italic;padding:10px 8px">No data yet</td></tr>';
} else {
  sorted.forEach(note=>{
    const st=stats[note.name];
    const best    = (st?.bestCents!=null)       ? fmtC(st.bestCents)        : '—';
    const failed  = (st?.lastFailureCents!=null) ? fmtC(st.lastFailureCents) : '—';
    const regressed = isRegressed(note.name);
    const noBest = st?.lastFailureCents != null && st?.bestCents == null;
    const tr=document.createElement('tr');
    if (regressed) tr.classList.add('stat-row-regressed');
    else if (noBest) tr.classList.add('stat-row-no-best');
    tr.innerHTML=`<td class="stat-note-name">${dn(note.name)}</td> <td class="stat-best">${best}</td> <td class="stat-failed">${failed}</td> <td><button class="stat-btn stat-retest-btn" onclick="startNoteTest('${note.name}')">Retest</button></td>`;
    tbody.appendChild(tr);
  });
}
drawChart(sorted);
}

function drawChart(notes) {
const canvas = $('stats-chart');
const ctx    = canvas.getContext('2d');
const dpr    = window.devicePixelRatio || 1;

const pn = notes.filter(n => stats[n.name]?.bestCents != null);

const parent = canvas.parentElement;
const W = parent.getBoundingClientRect().width ||
  parent.offsetWidth ||
  window.innerWidth || 300;
const rowH = 22;
const pad  = { l: 44, r: 36, t: 10, b: 20 };
const H    = Math.max(120, pad.t + pn.length * rowH + pad.b);

canvas.width  = W * dpr;
canvas.height = H * dpr;
canvas.style.width  = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);
ctx.clearRect(0, 0, W, H);

if (!pn.length) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.font = '13px Inconsolata,monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Play some rounds to see progress', W / 2, H / 2);
  return;
}

const cW   = W - pad.l - pad.r;
const worstScore = Math.max(...pn.map(n => stats[n.name].bestCents));
const xMax = CENTS_SEQ.slice().reverse().find(c => c >= worstScore) || worstScore;
const xFor = c => pad.l + (c / xMax) * cW;

const allGridCandidates = [1, 2, 3, 5, 7, 10, 15, 20, 25, 50, 75, 100];
const gridLines = allGridCandidates.filter(c => c <= xMax);
const step = Math.ceil(gridLines.length / 5);
const filteredGrid = gridLines.filter((_, i) => i % step === 0 || gridLines[i] === xMax);
ctx.strokeStyle = 'rgba(0,0,0,0.10)';
ctx.lineWidth   = 1;
filteredGrid.forEach(c => {
  const x = xFor(c);
  ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, H - pad.b); ctx.stroke();
  ctx.fillStyle  = 'rgba(0,0,0,0.38)';
  ctx.font       = '9px Inconsolata,monospace';
  ctx.textAlign  = 'center';
  ctx.fillText(fmtC(c), x, H - pad.b + 12);
});

ctx.strokeStyle = 'rgba(0,0,0,0.15)';
ctx.lineWidth = 1;
ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, H - pad.b); ctx.stroke();

const bh = Math.min(14, rowH - 6);

pn.forEach((note, i) => {
  const y  = pad.t + i * rowH + rowH / 2;
  const c  = stats[note.name].bestCents;
  const bw = xFor(c) - pad.l;
  const regressed = isRegressed(note.name);

  ctx.fillStyle = regressed ? '#b87c00' : '#c94a0a';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pad.l, y - bh/2, bw, bh, 3);
  else ctx.rect(pad.l, y - bh/2, bw, bh);
  ctx.fill();

  ctx.fillStyle  = 'rgba(0,0,0,0.65)';
  ctx.font       = '10px Inconsolata,monospace';
  ctx.textAlign  = 'right';
  ctx.fillText(dn(note.name), pad.l - 5, y + 4);

  ctx.fillStyle  = 'rgba(0,0,0,0.50)';
  ctx.textAlign  = 'left';
  ctx.fillText(fmtC(c), pad.l + bw + 4, y + 4);
});
}

async function startRetest(n) {
if ($('start-btn').style.display === 'block') {
  await ensureAudio();
  hideStartScreen();
  const s = SOUNDS[settings.soundIdx];
  if (s.type === 'sf') {
    $('status-msg').textContent = 'Loading…';
    $('status-msg').style.color = 'rgba(255,255,255,0.45)';
    loadSfInstrument(s.sfName)
      .then(() => { renderSoundGrid(); $('status-msg').textContent = ''; _startRetestInner(n); })
      .catch(() => { $('status-msg').textContent = ''; _startRetestInner(n); });
    return;
  }
}
_startRetestInner(n);
}

function _startRetestInner(n) {
retestNote               = n;
logEvent(`retestStart | note=${n}`);
firstRoundOfRetest       = true;
atLeastOneSuccessfulRetest = false;
roundAttempts = 0; roundResults = [];
closeInfo();
updateRetestUI();
const bestCents = stats[n]?.bestCents;
if (bestCents != null) {
  let idx = CENTS_SEQ.findIndex(c => c <= bestCents);
  if (idx < 0) idx = CENTS_SEQ.length - 1;
  centsIdx = idx;
} else {
  centsIdx = settings.startCentsIdx;
}
currentNote = ALL_NOTES.find(note => note.name === n);
startRound();
}

function exitRetest(silent=false) {
logEvent(`retestExit | note=${retestNote} | silent=${silent}`);
retestNote               = null;
firstRoundOfRetest       = false;
atLeastOneSuccessfulRetest = false;
retestEnding             = false;
roundAttempts = 0; roundResults = [];
$('round-actions').style.display = 'none'; hideRetestEndActions();
$('status-msg').textContent = '';
updateRetestUI();
if (!silent) startRound();
}

function startNoteTest(n) { startRetest(n); }
function endNoteTest()    { exitRetest(); }

function updateRetestUI() {
if (retestNote) {
  $('phase-label').textContent = 'Re-testing ' + dn(retestNote);
  $('app').classList.add('retest-mode');
  setBg('#0d2a1a');
  $('exit-retest-btn').style.display = '';
  $('retest-close-btn').style.display = '';
} else {
  $('phase-label').textContent = 'Listen';
  $('app').classList.remove('retest-mode');
  setBg('#4d1903');
  $('exit-retest-btn').style.display = 'none';
  $('retest-close-btn').style.display = 'none';
}
}

// ══════════════════════════════════════════════════════

// CONFIRM
// ══════════════════════════════════════════════════════
let confirmCb=null;
function showConfirm(t,m,cb){ $('confirm-title').textContent=t; $('confirm-msg').textContent=m; confirmCb=cb; $('confirm-overlay').classList.add('open'); }
function closeConfirm(){ $('confirm-overlay').classList.remove('open'); confirmCb=null; }
$('confirm-yes').addEventListener('click',()=>{ const cb=confirmCb; closeConfirm(); if(cb) cb(); });
$('confirm-no').addEventListener('click',closeConfirm);
function confirmResetNote(n){ showConfirm('Reset '+dn(n),'Erase scores for '+dn(n)+'?',()=>{ delete stats[n]; saveStats(); renderStats(); }); }
function confirmResetAll(){   showConfirm('Reset All','Erase scores for every note?',()=>{ stats={}; try{localStorage.removeItem('vio4-stats');}catch(e){} renderStats(); }); }

function fakeHistory() {
const validCents = CENTS_SEQ.filter(c => c >= 5 && c <= MAX_CENTS);
const rand = arr => arr[Math.floor(Math.random() * arr.length)];
ALL_NOTES.forEach(note => {
  if (!stats[note.name]) stats[note.name] = {};
  stats[note.name].attempts = Math.floor(Math.random() * 20) + 3;
  const best = rand(validCents);
  stats[note.name].bestCents = best;
  if (Math.random() < 0.40) {
    const harderOptions = validCents.filter(c => c < best);
    stats[note.name].lastFailureCents = harderOptions.length > 0 ? rand(harderOptions) : best;
  } else {
    const easierOrSame = validCents.filter(c => c >= best);
    stats[note.name].lastFailureCents = rand(easierOrSame);
  }
});
saveStats();
renderStats();
}

function confirmRandomizeScores() {
showConfirm('Randomize Scores', 'This will erase all existing scores and replace them with random data.', fakeHistory);
}

function copyScores() {
const lowestHz  = midiToHz(ALL_NOTES[settings.lowestNote].midi);
const highestHz = midiToHz(ALL_NOTES[settings.highestNote].midi);
const scored = ALL_NOTES
  .filter(n => {
    const hz = midiToHz(n.midi);
    return hz >= lowestHz - 0.01 && hz <= highestHz + 0.01 && stats[n.name]?.bestCents != null;
  })
  .sort((a, b) => midiToHz(a.midi) - midiToHz(b.midi));

const btn = $('info-copy-scores-btn');
if (!scored.length) {
  btn.textContent = 'No scores yet';
  setTimeout(() => { btn.textContent = 'Copy Scores'; }, 2000);
  return;
}

const avg   = scored.reduce((s, n) => s + stats[n.name].bestCents, 0) / scored.length;
const worst = Math.max(...scored.map(n => stats[n.name].bestCents));

const introText = 'These are my Ear Tuner scores. Each score is the smallest pitch gap I can reliably hear at that note\u2019s frequency, measured in cents (hundredths of a semitone). Lower is better. Check out https://fiddle-app.github.io/ear to test your own aural acuity.';
const introHtml = introText.replace('https://fiddle-app.github.io/ear', '<a class="et-link" href="https://fiddle-app.github.io/ear" style="color:#8f2d06;">https://fiddle-app.github.io/ear</a>');

const rows = scored.map(n => {
  const c   = stats[n.name].bestCents;
  const pct = Math.round((c / worst) * 100);
  return `<tr>
    <td class="et-note" style="font-size:14px;font-weight:600;padding:4px 12px 4px 0;border-bottom:1px solid rgba(0,0,0,0.07);width:52px;">${dn(n.name)}</td>
    <td class="et-score" style="font-size:14px;font-weight:600;color:#8f2d06;padding:4px 12px 4px 0;border-bottom:1px solid rgba(0,0,0,0.07);width:48px;">${fmtC(c)}</td>
    <td style="font-size:14px;width:100%;padding:4px 0 4px 4px;border-bottom:1px solid rgba(0,0,0,0.07);vertical-align:middle;">
      <div class="et-bar-track" style="background:rgba(0,0,0,0.07);border-radius:3px;height:8px;width:100%;">
        <div class="et-bar-fill" style="background:#b83c08;border-radius:3px;height:8px;width:${pct}%;"></div>
      </div>
    </td>
  </tr>`;
}).join('');

const html = `<style>
  @media (prefers-color-scheme: dark) {
    .et-wrap  { background-color:#1c1c1e !important; color:#e8ddd0 !important; }
    .et-intro { color:#c8bfb5 !important; }
    .et-link  { color:#e87a50 !important; }
    .et-avg   { background:rgba(184,60,8,0.25) !important; border-left-color:#e87a50 !important; color:#f0a080 !important; }
    .et-note  { color:#e8ddd0 !important; border-bottom-color:rgba(255,255,255,0.08) !important; }
    .et-score { color:#f0a080 !important; border-bottom-color:rgba(255,255,255,0.08) !important; }
    .et-bar-track { background:rgba(255,255,255,0.12) !important; }
    .et-bar-fill  { background:#e87a50 !important; }
    .et-footer    { color:rgba(255,255,255,0.35) !important; }
    .et-th { color:rgba(255,255,255,0.38) !important; border-bottom-color:rgba(255,255,255,0.15) !important; }
  }
</style>
<div class="et-wrap" style="font-family:'Inconsolata',monospace,sans-serif;color:#2a2018;font-size:15px;">
  <p class="et-intro" style="color:#2a2018;font-size:14px;line-height:1.65;margin:0 0 16px;">${introHtml}</p>
  <div class="et-avg" style="background:rgba(184,60,8,0.12);border-left:3px solid #b83c08;padding:8px 14px;border-radius:0 6px 6px 0;margin-bottom:18px;font-size:14px;color:#8f2d06;font-weight:600;display:inline-block;">Average score: ${avg.toFixed(1)}\u00a2</div>
  <table style="border-collapse:collapse;width:100%;max-width:440px;">
    <thead><tr>
      <th class="et-th" style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(0,0,0,0.38);text-align:left;padding:0 12px 6px 0;border-bottom:2px solid rgba(0,0,0,0.15);font-weight:600;">Note</th>
      <th class="et-th" style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(0,0,0,0.38);text-align:left;padding:0 12px 6px 0;border-bottom:2px solid rgba(0,0,0,0.15);font-weight:600;">Score</th>
      <th class="et-th" style="width:100%;border-bottom:2px solid rgba(0,0,0,0.15);padding-bottom:6px;"> </th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="et-footer" style="margin-top:14px;font-size:12px;color:rgba(0,0,0,0.35);">Ear Tuner \u00b7 fiddle-app.github.io/ear</p>
</div>`;

const noteColW = Math.max(...scored.map(n => dn(n.name).length));
const plainRows = scored.map(n => dn(n.name).padEnd(noteColW + 2) + fmtC(stats[n.name].bestCents)).join('\n');
const plain = `${introText}\n\nAverage: ${avg.toFixed(1)}\u00a2\n\nNote${''.padEnd(noteColW - 2)}  Score\n${'─'.repeat(noteColW + 8)}\n${plainRows}`;

try {
  const item = new ClipboardItem({
    'text/html':  new Blob([html],  { type: 'text/html' }),
    'text/plain': new Blob([plain], { type: 'text/plain' }),
  });
  navigator.clipboard.write([item]).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy Scores'; }, 2000);
  }).catch(() => {
    navigator.clipboard.writeText(plain).then(() => {
      btn.textContent = 'Copied (text)';
      setTimeout(() => { btn.textContent = 'Copy Scores'; }, 2000);
    });
  });
} catch(e) {
  navigator.clipboard.writeText(plain).then(() => {
    btn.textContent = 'Copied (text)';
    setTimeout(() => { btn.textContent = 'Copy Scores'; }, 2000);
  });
}
}

(function() {
const u = 'eartunerapp', d = 'gmail.com';
const el = document.getElementById('feedback-email');
if (el) { el.href = 'mailto:' + u + '@' + d; el.textContent = u + '@' + d; }
})();


// ══════════════════════════════════════════════════════
// KEYBOARD SUPPORT
// ══════════════════════════════════════════════════════
document.addEventListener('keydown', e => {
if (e.key !== ' ' && e.key !== 'Enter') return;
e.preventDefault();
if ($('settings-overlay').classList.contains('open')) { closeSettings(); return; }
if ($('info-overlay').classList.contains('open')) { closeInfo(); return; }
if ($('start-btn').style.display !== 'none' && $('start-btn').style.display !== '') { handleStart(); return; }
if (e.key === ' ') { handleTap('left'); } else { handleTap('right'); }
});


