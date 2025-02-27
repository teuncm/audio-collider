import * as Tone from "tone";
import _ from 'lodash';

// Flag to check Tone.js initialization
export let isToneStarted = false;

// Ensure Tone.js is initialized only once
export async function ensureTone() {
  if (!isToneStarted) {
    await Tone.start();
    isToneStarted = true;
    console.log("Initialized Tone.js and AudioContext!");
  }
};

// Effect chain
export const effectChain = new Tone.Volume(-18)
  .connect(new Tone.PingPongDelay({
    delayTime: "0.3s",
    feedback: 0.3,
    wet: 0.15
  })
    .connect(new Tone.Chorus({
      frequency: 0.4,
      delayTime: 5,
      depth: 1.5,
      wet: 0.4
    })
      .connect(new Tone.Filter({
        type: "highshelf",
        frequency: 2400,
        gain: -28
      })
        .connect(new Tone.Limiter(-1)
          .toDestination()))));

const freqObj = Tone.Frequency("C2");
const scaleIdxs = [0, 4, 7, 10];
const octIdxs = [1, 2, 3, 4];
const scale = _.flatten(
  _.map(octIdxs, (o) =>
    _.map(scaleIdxs, (s) =>
      o * 12 + s
    )
  )
);

let frequencies;

constructFrequencies();

// Construct a list of frequencies
export function constructFrequencies(transpose = 0) {
  const newFrequencies = freqObj.transpose(transpose).harmonize(scale);

  frequencies = newFrequencies;
};

const polySynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "fmtriangle" },
  envelope: {
    attack: 0.01,
    decay: 0.5,
    sustain: 0,
    release: 0.01,
  },
  maxPolyphony: 10
}).connect(effectChain);

const lowSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "sawtooth6" },
  envelope: {
    attack: 0.5,
    decay: 15,
    sustain: 0,
    release: 0.01,
  },
  maxPolyphony: 3
}).connect(effectChain);

// Trigger a bell sound
export function triggerBell() {
  const frequency = _.sample(frequencies);

  if (isToneStarted) {
    const now = Tone.now();
    polySynth.triggerAttackRelease(frequency, "0.51s", now + Math.random() * 0.1);
  }
};

// Trigger a saw sound
export function triggerSaw() {
  const frequency = frequencies[0] / 2;

  if (isToneStarted) {
    lowSynth.releaseAll();
    const now = Tone.now();
    lowSynth.triggerAttackRelease(frequency * 0.995, "16s", now);
    lowSynth.triggerAttackRelease(frequency * 1.5, "16s", now);
    lowSynth.triggerAttackRelease(frequency * 1.005, "16s", now);
  }
};
