import { SynthSettings } from '../types/studio';

export const SYNTH_PRESETS: Record<string, SynthSettings> = {
  vintageKeys: {
    waveform: 'triangle',
    cutoff: 3200,
    resonance: 3,
    attack: 0.02,
    decay: 0.4,
    sustain: 0.5,
    release: 0.35,
    octave: 0,
  },
  subBass: {
    waveform: 'sine',
    cutoff: 600,
    resonance: 5,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.8,
    release: 0.4,
    octave: -1,
  },
  analogPad: {
    waveform: 'sawtooth',
    cutoff: 1800,
    resonance: 4,
    attack: 0.4,
    decay: 0.6,
    sustain: 0.7,
    release: 0.8,
    octave: 0,
  },
  pluckLead: {
    waveform: 'square',
    cutoff: 4200,
    resonance: 8,
    attack: 0.005,
    decay: 0.25,
    sustain: 0.2,
    release: 0.2,
    octave: 1,
  },
};

// Convert MIDI note number to frequency in Hz
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Play a live polyphonic synth note through an audio context
export function playLiveSynthNote(
  ctx: AudioContext,
  dest: AudioNode,
  midiNote: number,
  settings: SynthSettings,
  duration: number = 0.5
) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  const freq = midiToFreq(midiNote + settings.octave * 12);
  osc.type = settings.waveform;
  osc.frequency.setValueAtTime(freq, now);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(settings.cutoff, now);
  filter.Q.setValueAtTime(settings.resonance, now);

  // Filter envelope modulation
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(100, settings.cutoff * 0.4),
    now + settings.decay
  );

  // Amp envelope
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.5, now + settings.attack);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, 0.5 * settings.sustain),
    now + settings.attack + settings.decay
  );
  gain.gain.setValueAtTime(
    Math.max(0.0001, 0.5 * settings.sustain),
    now + duration
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + duration + settings.release
  );

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  osc.start(now);
  osc.stop(now + duration + settings.release + 0.05);
}

export interface NoteEvent {
  midi: number;
  startBeat: number;
  durationBeats: number;
  velocity?: number;
}

// Generate an AudioBuffer containing a sequence of synth notes/chords
export function renderSynthSequenceToBuffer(
  ctx: BaseAudioContext,
  notes: NoteEvent[],
  bpm: number,
  settings: SynthSettings
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const beatSec = 60 / bpm;

  // Find total duration
  let maxEndTime = 0;
  for (const n of notes) {
    const end = (n.startBeat + n.durationBeats) * beatSec + settings.release + 0.1;
    if (end > maxEndTime) maxEndTime = end;
  }
  if (maxEndTime <= 0) maxEndTime = 1;

  const length = Math.ceil(sampleRate * maxEndTime);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Render each note into the buffer
  for (const n of notes) {
    const startTime = n.startBeat * beatSec;
    const durTime = n.durationBeats * beatSec;
    const startSample = Math.floor(startTime * sampleRate);
    const noteLength = Math.floor((durTime + settings.release) * sampleRate);
    const freq = midiToFreq(n.midi + settings.octave * 12);
    const vel = n.velocity ?? 0.8;

    for (let i = 0; i < noteLength; i++) {
      const idx = startSample + i;
      if (idx >= length) break;

      const t = i / sampleRate;
      // Amp envelope
      let env = 0;
      if (t < settings.attack) {
        env = t / settings.attack;
      } else if (t < settings.attack + settings.decay) {
        const decayProgress = (t - settings.attack) / settings.decay;
        env = 1 - (1 - settings.sustain) * decayProgress;
      } else if (t <= durTime) {
        env = settings.sustain;
      } else {
        const relProgress = (t - durTime) / settings.release;
        env = Math.max(0, settings.sustain * (1 - relProgress));
      }

      // Waveform generator
      let raw = 0;
      const phase = 2 * Math.PI * freq * t;
      if (settings.waveform === 'sine') {
        raw = Math.sin(phase);
      } else if (settings.waveform === 'triangle') {
        raw = 2 * Math.abs(2 * ((freq * t) % 1) - 1) - 1;
      } else if (settings.waveform === 'sawtooth') {
        raw = 2 * ((freq * t) % 1) - 1;
      } else if (settings.waveform === 'square') {
        raw = (freq * t) % 1 < 0.5 ? 0.9 : -0.9;
      }

      // Soft saturation
      const sampleVal = Math.tanh(raw * 1.2) * env * vel * 0.35;
      left[idx] += sampleVal;
      right[idx] += sampleVal;
    }
  }

  // Normalize / soft clamp
  for (let i = 0; i < length; i++) {
    left[i] = Math.tanh(left[i]);
    right[i] = Math.tanh(right[i]);
  }

  return buffer;
}
