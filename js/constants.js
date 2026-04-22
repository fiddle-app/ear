'use strict';
// SOUND DEFINITIONS — soundfont-player uses gleitz MusyngKite by default
// ══════════════════════════════════════════════════════
const SOUNDS = [
{ id:'violin',        label:'Violin (sample)',    type:'sf', sfName:'violin'                },
{ id:'synth-violin',  label:'Violin (synth)',    type:'synth'                              },
{ id:'sine',          label:'Sine Wave',          type:'sine'                               },
{ id:'viola',         label:'Viola',              type:'sf', sfName:'viola'                 },
{ id:'cello',         label:'Cello',              type:'sf', sfName:'cello'                 },
{ id:'contrabass',    label:'Contrabass',         type:'sf', sfName:'contrabass'            },
{ id:'gtr-nylon',     label:'Guitar (nylon)',     type:'sf', sfName:'acoustic_guitar_nylon' },
{ id:'gtr-steel',     label:'Guitar (steel)',     type:'sf', sfName:'acoustic_guitar_steel' },
{ id:'piano',         label:'Piano',              type:'sf', sfName:'acoustic_grand_piano'  },
{ id:'elec-bass',     label:'Electric Bass',      type:'sf', sfName:'electric_bass_finger'  },
];

// Per-voice SF gain — calibrated by calibrate.js (target: violin × 1.5 current loudness, -22 dBFS).
// Raw sample levels vary widely across instruments; these normalize them to equal loudness.
const VOICE_GAIN = {
  'violin':      8.22,
  'viola':       6.03,
  'cello':       3.39,
  'contrabass':  2.40,
  'gtr-nylon':   9.33,
  'gtr-steel':  10.72,
  'piano':      12.88,
  'elec-bass':   9.66,
};

// ══════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════
const BUILD_DATE  = '2026-04-22 01:56';   // stamped by deploy.sh — do not edit manually
const CENTS_SEQ   = [100, 50, 25, 20, 15, 10, 7, 6, 5, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5];
const MAX_CENTS   = CENTS_SEQ[0]; // 100 — largest/easiest difference
const fmtC        = c => Number.isInteger(c) ? c+'¢' : c.toFixed(1)+'¢'; // format cents value
const DUR_STEPS   = [0.8, 1.2, 1.6, 2.0, 2.2, 2.8, 3.5, 4.5];
const ATK_PRESETS = [['Soft',0.20],['Med',0.09],['Crisp',0.04]];
const DEC_PRESETS = [['Long',0.60],['Med',0.28],['Short',0.12]];
const NOTE_GAP    = 0.42;

// All notes A1–G7 (MIDI 33–103)
const ALL_NOTES = (function(){
const nm=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'], out=[];
for (let midi=33; midi<=103; midi++) {
  const n = midi % 12;
  const o = Math.floor(midi/12) - 1;
  out.push({name: nm[n]+o, midi});
}
return out;
})();

const midiToHz  = m => 440 * Math.pow(2, (m-69)/12);
const centsToHz = (hz,c) => hz * Math.pow(2, c/1200);
const hzToMidi  = hz => 69 + 12*Math.log2(hz/440);
const dn        = name => name.replace('#','♯');

// ══════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════
let settings = {
  lowestNote:22, highestNote:53,
  startCentsIdx:5, noteDurIdx:3, attack:1, decay:1, soundIdx:0, testsPerRound:3,
};
let stats = {}; // noteName → { bestCents, attempts }

let currentNote              = null;
let centsIdx                 = 0;
let roundAttempts            = 0;
let roundResults             = [];
let retestNote               = null;  // note name being retested, null = random mode
let firstRoundOfRetest       = false;
let atLeastOneSuccessfulRetest = false;
let retestEnding             = false; // true when retest just ended, waiting for user to continue
let pendingCentsStep         = 0;     // centsIdx adjustment deferred until user continues
let awaiting                 = false;
let roundFailed              = false;
let currentRound             = {};

// Per-note playing handles for review mode single-note replay
let playingNode1   = null;
let playingNode2   = null;

// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// HELPER
// ══════════════════════════════════════════════════════
function $(id){ return document.getElementById(id); }
