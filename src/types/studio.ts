export type TrackType = 'audio' | 'drums' | 'synth';

export interface FxSettings {
  eq: {
    low: number; // dB (-12 to +12)
    mid: number; // dB (-12 to +12)
    high: number; // dB (-12 to +12)
  };
  delay: {
    enabled: boolean;
    time: number; // in seconds (0.05 to 1.0)
    feedback: number; // 0 to 0.85
    mix: number; // 0 to 1
  };
  reverb: {
    enabled: boolean;
    decay: number; // seconds (0.5 to 4.0)
    mix: number; // 0 to 1
  };
  distortion: {
    enabled: boolean;
    drive: number; // 0 to 50
    mix: number; // 0 to 1
  };
}

export interface AudioClip {
  id: string;
  trackId: string;
  name: string;
  startBeat: number; // In beats (e.g. 0 = start of project)
  durationBeats: number; // Length in beats
  buffer?: AudioBuffer;
  waveformPeaks: number[]; // Normalized 0-1 peak heights for rendering
  color?: string;
  type?: 'audio' | 'synth' | 'vocal' | 'recorded';
  notes?: { midi: number; startBeat: number; durationBeats: number; velocity?: number }[];
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  color: string;
  volume: number; // 0 to 1.2
  pan: number; // -1 (left) to 1 (right)
  muted: boolean;
  solo: boolean;
  armed: boolean; // Ready for mic recording
  fx: FxSettings;
  clips: AudioClip[];
}

export type DrumPadId =
  | 'kick'
  | 'snare'
  | 'clap'
  | 'hatClosed'
  | 'hatOpen'
  | 'tomLow'
  | 'tomMid'
  | 'tomHi'
  | 'rim'
  | 'shaker'
  | 'crash'
  | 'ride'
  | 'sub808'
  | 'perc'
  | 'snap'
  | 'fx';

export interface DrumPadInfo {
  id: DrumPadId;
  name: string;
  key: string;
  group: 'kick' | 'snare' | 'hats' | 'toms' | 'percs' | 'cymbals' | 'bass';
  color: string;
}

export interface StepGrid {
  [sound: string]: boolean[]; // 16 steps
}

export interface SynthSettings {
  waveform: 'sine' | 'triangle' | 'sawtooth' | 'square';
  cutoff: number; // 100 to 12000 Hz
  resonance: number; // 0 to 20
  attack: number; // 0.01 to 2s
  decay: number; // 0.05 to 2s
  sustain: number; // 0 to 1
  release: number; // 0.05 to 3s
  octave: number; // -2 to +2
}

export interface Project {
  id: string;
  name: string;
  bpm: number;
  timeSignature: [number, number]; // [4, 4]
  tracks: Track[];
  stepGrid: StepGrid;
  snap: '1/4' | '1/8' | '1/16' | 'off';
  loopEnabled: boolean;
  loopStartBeat: number;
  loopEndBeat: number;
  totalBeats: number;
}
