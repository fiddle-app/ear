'use strict';
// SOUNDFONT LOADING via soundfont-player
// sfInstruments: sfName → Soundfont instrument object
// ══════════════════════════════════════════════════════
const sfInstruments = {};
const sfLoadingP    = {};

async function loadSfInstrument(sfName) {
if (sfInstruments[sfName]) return sfInstruments[sfName];
if (sfLoadingP[sfName])    return sfLoadingP[sfName];
sfLoadingP[sfName] = Soundfont.instrument(audioCtx, sfName, {
  from: 'sounds/',
  gain: 1.0,
}).then(inst => {
  sfInstruments[sfName] = inst;
  return inst;
});
return sfLoadingP[sfName];
}

// ══════════════════════════════════════════════════════
// PLAY FUNCTIONS — all return a handle with stopAt()
// ══════════════════════════════════════════════════════
function playSfNote(inst, midiF, startTime, duration, gain) {
// soundfont-player: inst.play(note, time, options) — accepts fractional midi for detuning
// Returns an AudioNode with .stop(when)
const node = inst.play(midiF, startTime, { duration: duration, gain: gain });
return {
  stopAt(t) { try { node.stop(t); } catch(e){} }
};
}

function playSynthViolin(freqHz, startTime, duration) {
const ctx    = audioCtx;
const atk    = ATK_PRESETS[settings.attack][1];
const rel    = DEC_PRESETS[settings.decay][1];
const peak   = 0.137, sus=0.65, dec=0.10;

const mg = ctx.createGain(); mg.connect(ctx.destination);
mg.gain.setValueAtTime(0,startTime);
mg.gain.linearRampToValueAtTime(peak, startTime+atk);
mg.gain.linearRampToValueAtTime(peak*sus, startTime+atk+dec);
mg.gain.setValueAtTime(peak*sus, startTime+duration-rel);
mg.gain.linearRampToValueAtTime(0, startTime+duration);

const vLFO=ctx.createOscillator(), vG=ctx.createGain();
vLFO.frequency.setValueAtTime(0,startTime); vLFO.frequency.linearRampToValueAtTime(5.5,startTime+0.38);
vG.gain.setValueAtTime(0,startTime); vG.gain.linearRampToValueAtTime(freqHz*0.008,startTime+0.38);
vLFO.connect(vG); vLFO.start(startTime); vLFO.stop(startTime+duration+0.05);

[[1,1.00],[2,0.58],[3,0.40],[4,0.22],[5,0.16],[6,0.09],[7,0.06],[8,0.04]].forEach(([m,g])=>{
  const osc=ctx.createOscillator(),hg=ctx.createGain(),bp=ctx.createBiquadFilter();
  osc.type='sawtooth'; osc.frequency.setValueAtTime(freqHz*m,startTime);
  vG.connect(osc.frequency);
  bp.type='bandpass'; bp.frequency.setValueAtTime(freqHz*m,startTime); bp.Q.setValueAtTime(1.8,startTime);
  hg.gain.setValueAtTime(g,startTime);
  osc.connect(bp); bp.connect(hg); hg.connect(mg);
  osc.start(startTime); osc.stop(startTime+duration+0.1);
});

const bLen=Math.ceil(ctx.sampleRate*(duration+0.2));
const bBuf=ctx.createBuffer(1,bLen,ctx.sampleRate);
const bd=bBuf.getChannelData(0);
for(let i=0;i<bLen;i++) bd[i]=(Math.random()*2-1)*0.025;
const bs=ctx.createBufferSource(),bf=ctx.createBiquadFilter(),bg=ctx.createGain();
bs.buffer=bBuf; bf.type='bandpass'; bf.frequency.setValueAtTime(freqHz,startTime); bf.Q.setValueAtTime(3,startTime);
bg.gain.setValueAtTime(0,startTime); bg.gain.linearRampToValueAtTime(0.5,startTime+atk);
bg.gain.setValueAtTime(0.5,startTime+duration-rel); bg.gain.linearRampToValueAtTime(0,startTime+duration);
bs.connect(bf); bf.connect(bg); bg.connect(mg);
bs.start(startTime); bs.stop(startTime+duration+0.1);

return { gain:mg, stopAt(t){ mg.gain.cancelScheduledValues(t); mg.gain.setValueAtTime(mg.gain.value,t); mg.gain.linearRampToValueAtTime(0,t+0.06); } };
}

function playSineTone(freqHz, startTime, duration) {
const ctx = audioCtx;
const atk = ATK_PRESETS[settings.attack][1];
const rel = DEC_PRESETS[settings.decay][1];
const osc=ctx.createOscillator(), g=ctx.createGain();
osc.type='sine'; osc.frequency.setValueAtTime(freqHz,startTime);
g.gain.setValueAtTime(0,startTime); g.gain.linearRampToValueAtTime(0.112,startTime+atk);
g.gain.setValueAtTime(0.112,startTime+duration-rel); g.gain.linearRampToValueAtTime(0,startTime+duration);
osc.connect(g); g.connect(ctx.destination);
osc.start(startTime); osc.stop(startTime+duration+0.1);
return { gain:g, stopAt(t){ g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value,t); g.gain.linearRampToValueAtTime(0,t+0.04); try{osc.stop(t+0.05);}catch(e){} } };
}

// Unified play — returns a handle with stopAt()
async function playNote(midiF, startTime, duration) {
const sound = SOUNDS[settings.soundIdx];
const hz    = midiToHz(midiF);
if (sound.type==='synth') return playSynthViolin(hz, startTime, duration);
if (sound.type==='sine')  return playSineTone(hz, startTime, duration);
// SF via soundfont-player
const inst = sfInstruments[sound.sfName];
if (inst) return playSfNote(inst, midiF, startTime, duration, VOICE_GAIN[sound.id] ?? 8.0);
return playSynthViolin(hz, startTime, duration); // fallback while loading
}

// ══════════════════════════════════════════════════════
// FEEDBACK BEEPS
// ══════════════════════════════════════════════════════
function beepCorrect() {
const ctx=audioCtx,t=ctx.currentTime+0.02;
[523.25,659.25].forEach((f,i)=>{ const o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine'; o.frequency.setValueAtTime(f,t+i*0.12); g.gain.setValueAtTime(0.16,t+i*0.12); g.gain.exponentialRampToValueAtTime(0.001,t+i*0.12+0.22); o.connect(g); g.connect(ctx.destination); o.start(t+i*0.12); o.stop(t+i*0.12+0.25); });
}
function chimeSuccess() {
// Boxing ring bell: A4 (440Hz), single strike, 2.5s decay
// Uses inharmonic partials to simulate metal bell resonance
const freq  = 440;   // A4 (changed from A5 880Hz)
const dur   = 2.5;
const gain  = 0.1;
const delay = 0;
const partials = [
  { ratio: 1.000, gainFrac: 1.00, durFrac: 1.0 },
  { ratio: 2.756, gainFrac: 0.50, durFrac: 0.7 },
  { ratio: 5.404, gainFrac: 0.25, durFrac: 0.5 },
  { ratio: 8.933, gainFrac: 0.12, durFrac: 0.3 },
];
partials.forEach(({ ratio, gainFrac, durFrac }) => {
  const t = audioCtx.currentTime + delay;
  const g = audioCtx.createGain();
  const o = audioCtx.createOscillator();
  o.type = 'sine';
  o.frequency.value = freq * ratio;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain * gainFrac, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur * durFrac);
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start(t);
  o.stop(t + dur * durFrac + 0.05);
});
}

/*
// Original meditation chime (528Hz fundamental, 3s decay) — kept for reference
function chimeSuccess_orig() {
const ctx = audioCtx, t = ctx.currentTime + 0.05;
const fundamental = 528;
const harmonics = [1, 2, 3, 4.2];
const gains     = [0.18, 0.10, 0.05, 0.02];
harmonics.forEach((h, i) => {
const o = ctx.createOscillator(), g = ctx.createGain();
o.type = 'sine';
o.frequency.setValueAtTime(fundamental * h, t);
g.gain.setValueAtTime(0, t);
g.gain.linearRampToValueAtTime(gains[i], t + 0.008);
g.gain.exponentialRampToValueAtTime(0.0001, t + 3.0);
o.connect(g); g.connect(ctx.destination);
o.start(t); o.stop(t + 3.1);
});
}
*/

function beepWrong() {
const ctx=audioCtx,t=ctx.currentTime+0.02;
[220,196].forEach((f,i)=>{ const o=ctx.createOscillator(),g=ctx.createGain(); o.type='triangle'; o.frequency.setValueAtTime(f,t+i*0.15); g.gain.setValueAtTime(0.16,t+i*0.15); g.gain.exponentialRampToValueAtTime(0.001,t+i*0.15+0.42); o.connect(g); g.connect(ctx.destination); o.start(t+i*0.15); o.stop(t+i*0.15+0.48); });
}


