#!/usr/bin/env node
// calibrate.js — one-time volume calibration for ear-tuner voices
// Measures RMS of a reference note from each soundfont instrument via ffmpeg.
// Computes synth/sine voice levels analytically from their gain parameters.
// Outputs a VOICE_GAIN table normalized so all voices are equally loud.

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os   = require('os');

const SOUNDS_DIR    = 'C:/Users/CaseyM/OneDrive/Projects/fiddle/ear-tuner/sounds';
const CURRENT_SF_GAIN = 5.5;  // current uniform gain in playSfNote
const MEASURE_SECS  = 1.5;    // measure first N seconds (sustain phase, ignore decay tail)

const SF_INSTRUMENTS = [
  { id: 'violin',     sfName: 'violin'                },
  { id: 'viola',      sfName: 'viola'                 },
  { id: 'cello',      sfName: 'cello'                 },
  { id: 'contrabass', sfName: 'contrabass'            },
  { id: 'gtr-nylon',  sfName: 'acoustic_guitar_nylon' },
  { id: 'gtr-steel',  sfName: 'acoustic_guitar_steel' },
  { id: 'piano',      sfName: 'acoustic_grand_piano'  },
  { id: 'elec-bass',  sfName: 'electric_bass_finger'  },
];

// Try these notes in order until one is found in the soundfont
const REF_NOTES = ['A4', 'G4', 'B4', 'A3', 'G3', 'C4'];

// ── helpers ──────────────────────────────────────────────────────────────────

function dbToLinear(db)     { return Math.pow(10, db / 20); }
function linearToDb(linear) { return 20 * Math.log10(Math.max(linear, 1e-10)); }

function extractSample(sfName, noteName) {
  const jsFile = path.join(SOUNDS_DIR, `${sfName}-mp3.js`);
  const src = fs.readFileSync(jsFile, 'utf8');
  // Keys look like "A4": "data:audio/mp3;base64,..."
  const regex = new RegExp(`"${noteName}"\\s*:\\s*"data:audio/mp3;base64,([^"]+)"`);
  const m = src.match(regex);
  return m ? Buffer.from(m[1], 'base64') : null;
}

function measureMeanVolumeDb(audioBuf) {
  const tmp = path.join(os.tmpdir(), `vcal_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
  fs.writeFileSync(tmp, audioBuf);
  try {
    const out = execSync(
      `ffmpeg -i "${tmp}" -t ${MEASURE_SECS} -af volumedetect -f null NUL 2>&1`,
      { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }
    );
    const m = out.match(/mean_volume:\s*([-\d.]+)\s*dB/);
    if (m) return parseFloat(m[1]);
    console.error('  [warn] could not parse volumedetect output');
    return null;
  } catch (e) {
    console.error('  [ffmpeg error]', e.message.slice(0, 300));
    return null;
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) {}
  }
}

// ── synth/sine theoretical RMS ───────────────────────────────────────────────
// playSynthViolin: master gain peak=0.35, sus=0.65 → sustain level = 0.2275
// 8 harmonics with gains [1, 0.58, 0.40, 0.22, 0.16, 0.09, 0.06, 0.04]
// Harmonics are at different frequencies → uncorrelated → RMS sums in quadrature
// Each harmonic modeled as sine: RMS = amplitude / sqrt(2)
const SYNTH_VIOLIN_SUSTAIN = 0.35 * 0.65;
const SYNTH_VIOLIN_H_GAINS = [1, 0.58, 0.40, 0.22, 0.16, 0.09, 0.06, 0.04];
const synthHarmonicSumSq   = SYNTH_VIOLIN_H_GAINS.reduce((s, g) => s + g * g, 0);
const SYNTH_VIOLIN_RMS     = SYNTH_VIOLIN_SUSTAIN * Math.sqrt(synthHarmonicSumSq / 2);

// playSineTone: gain ramps to 0.40, sustain at 0.40. Single sine → RMS = peak / sqrt(2)
const SINE_RMS = 0.40 / Math.sqrt(2);

// ── main ─────────────────────────────────────────────────────────────────────

console.log('=== Ear Tuner Volume Calibration ===\n');
console.log(`Measuring first ${MEASURE_SECS}s of reference note (sustain phase).\n`);

// Measure SF instruments
const sfResults = [];
for (const inst of SF_INSTRUMENTS) {
  let buf = null, foundNote = null;
  for (const note of REF_NOTES) {
    buf = extractSample(inst.sfName, note);
    if (buf) { foundNote = note; break; }
  }
  if (!buf) {
    console.error(`SKIP: no reference note found for ${inst.id}`);
    continue;
  }
  process.stdout.write(`Measuring ${inst.id.padEnd(14)} (${foundNote})... `);
  const rawDb     = measureMeanVolumeDb(buf);
  const rawLinear = rawDb !== null ? dbToLinear(rawDb) : null;
  // Effective output level = raw sample level × current SF gain
  const effLinear = rawLinear !== null ? rawLinear * CURRENT_SF_GAIN : null;
  const effDb     = effLinear !== null ? linearToDb(effLinear) : null;
  sfResults.push({ ...inst, note: foundNote, rawDb, rawLinear, effLinear, effDb });
  console.log(rawDb !== null ? `raw ${rawDb.toFixed(1)} dBFS → effective ${effDb.toFixed(1)} dBFS` : 'FAILED');
}

// Synth voices
console.log('\nSynth voices (theoretical):');
console.log(`  synth-violin  sustain RMS = ${SYNTH_VIOLIN_RMS.toFixed(4)}  (${linearToDb(SYNTH_VIOLIN_RMS).toFixed(1)} dBFS)`);
console.log(`  sine          sustain RMS = ${SINE_RMS.toFixed(4)}  (${linearToDb(SINE_RMS).toFixed(1)} dBFS)`);

// Target: violin at 1.5× its current loudness → +3.5 dB → -22 dBFS
const validSf   = sfResults.filter(r => r.effLinear != null);
const targetDb     = -22.0;
const targetLinear = dbToLinear(targetDb);
console.log(`\nTarget level: ${targetDb.toFixed(1)} dBFS  (violin × 1.5 current loudness)\n`);

// Output VOICE_GAIN table
console.log('=== Paste this into index.html ===\n');
console.log('// Per-voice gain — all voices normalized to equal perceived loudness.');
console.log('// Generated by calibrate.js. See log for raw measurements.');
console.log('const VOICE_GAIN = {');

for (const r of validSf) {
  const multiplier = targetLinear / r.effLinear;
  const newGain    = +(CURRENT_SF_GAIN * multiplier).toFixed(2);
  console.log(`  '${r.id.padEnd(14)}': ${String(newGain).padStart(6)},  // ref=${r.note}, raw=${r.rawDb?.toFixed(1)} dBFS`);
}

// Synth voices: express as new peak values (multiply existing peak by ratio)
const synthViolinMult = targetLinear / SYNTH_VIOLIN_RMS;
const sineMult        = targetLinear / SINE_RMS;
const newSynthPeak    = +(0.35 * synthViolinMult).toFixed(3);
const newSinePeak     = +(0.40 * sineMult).toFixed(3);
console.log(`  'synth-violin': '×${synthViolinMult.toFixed(2)}',  // new peak = ${newSynthPeak} (theoretical)`);
console.log(`  'sine':         '×${sineMult.toFixed(2)}',  // new peak = ${newSinePeak} (theoretical)`);
console.log('};');
console.log('\n(synth-violin and sine entries show multipliers to apply to their peak values,');
console.log(' not gain values — the code change is different for those two voices.)');
