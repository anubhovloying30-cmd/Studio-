import { AudioClip, Project, StepGrid, Track } from '../types/studio';
import { extractWaveformPeaks } from './drumSynth';
import { NoteEvent, renderSynthSequenceToBuffer, SYNTH_PRESETS } from './synthEngine';

export function createDefaultStepGrid(): StepGrid {
  return {
    kick: [true, false, false, false, false, false, true, false, false, true, false, false, false, false, false, false],
    snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    clap: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, true],
    hatClosed: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    hatOpen: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
    sub808: [true, false, false, false, false, false, false, false, false, false, true, false, false, false, false, false],
    tomLow: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, true, false],
    perc: [false, false, false, true, false, false, false, false, false, false, false, true, false, false, false, false],
  };
}

export function generateTrapDemoProject(ctx: BaseAudioContext): Project {
  const bpm = 140;

  // 1. Synth Lead Pluck
  const leadNotes: NoteEvent[] = [
    { midi: 72, startBeat: 0, durationBeats: 0.75, velocity: 0.9 }, // C5
    { midi: 75, startBeat: 1, durationBeats: 0.75, velocity: 0.85 }, // Eb5
    { midi: 74, startBeat: 2, durationBeats: 1.0, velocity: 0.8 }, // D5
    { midi: 70, startBeat: 3.5, durationBeats: 0.5, velocity: 0.75 }, // Bb4
    { midi: 72, startBeat: 4, durationBeats: 1.5, velocity: 0.9 }, // C5
    { midi: 79, startBeat: 6, durationBeats: 1.0, velocity: 0.95 }, // G5
    { midi: 77, startBeat: 7, durationBeats: 1.0, velocity: 0.85 }, // F5
    { midi: 75, startBeat: 8, durationBeats: 1.5, velocity: 0.8 }, // Eb5
    { midi: 74, startBeat: 10, durationBeats: 1.5, velocity: 0.85 }, // D5
    { midi: 72, startBeat: 12, durationBeats: 3.0, velocity: 0.9 }, // C5
  ];
  const leadBuf = renderSynthSequenceToBuffer(ctx, leadNotes, bpm, SYNTH_PRESETS.pluckLead);
  const leadClip: AudioClip = {
    id: 'clip_lead_1',
    trackId: 'track_lead',
    name: 'Cyber Pluck Melody',
    startBeat: 0,
    durationBeats: 16,
    buffer: leadBuf,
    waveformPeaks: extractWaveformPeaks(leadBuf, 64),
    color: '#06b6d4',
    type: 'synth',
  };

  // 2. 808 Sub Bass Line
  const bassNotes: NoteEvent[] = [
    { midi: 36, startBeat: 0, durationBeats: 3.5, velocity: 1.0 }, // C2
    { midi: 39, startBeat: 4, durationBeats: 3.5, velocity: 0.95 }, // Eb2
    { midi: 38, startBeat: 8, durationBeats: 3.5, velocity: 0.95 }, // D2
    { midi: 34, startBeat: 12, durationBeats: 3.5, velocity: 0.9 }, // Bb1
  ];
  const bassBuf = renderSynthSequenceToBuffer(ctx, bassNotes, bpm, SYNTH_PRESETS.subBass);
  const bassClip: AudioClip = {
    id: 'clip_bass_1',
    trackId: 'track_bass',
    name: 'Deep 808 Glides',
    startBeat: 0,
    durationBeats: 16,
    buffer: bassBuf,
    waveformPeaks: extractWaveformPeaks(bassBuf, 64),
    color: '#ec4899',
    type: 'synth',
  };

  // 3. Ambient Pad Chords
  const padNotes: NoteEvent[] = [
    { midi: 60, startBeat: 0, durationBeats: 7.5, velocity: 0.6 }, // C4
    { midi: 63, startBeat: 0, durationBeats: 7.5, velocity: 0.6 }, // Eb4
    { midi: 67, startBeat: 0, durationBeats: 7.5, velocity: 0.6 }, // G4
    { midi: 58, startBeat: 8, durationBeats: 7.5, velocity: 0.6 }, // Bb3
    { midi: 62, startBeat: 8, durationBeats: 7.5, velocity: 0.6 }, // D4
    { midi: 65, startBeat: 8, durationBeats: 7.5, velocity: 0.6 }, // F4
  ];
  const padBuf = renderSynthSequenceToBuffer(ctx, padNotes, bpm, SYNTH_PRESETS.analogPad);
  const padClip: AudioClip = {
    id: 'clip_pad_1',
    trackId: 'track_pad',
    name: 'Analog Dark Pad',
    startBeat: 0,
    durationBeats: 16,
    buffer: padBuf,
    waveformPeaks: extractWaveformPeaks(padBuf, 64),
    color: '#8b5cf6',
    type: 'synth',
  };

  // 4. Vocal Chop Hook
  const vocalNotes: NoteEvent[] = [
    { midi: 67, startBeat: 4, durationBeats: 1.0, velocity: 0.8 },
    { midi: 70, startBeat: 5.5, durationBeats: 0.8, velocity: 0.85 },
    { midi: 72, startBeat: 6.5, durationBeats: 1.5, velocity: 0.9 },
    { midi: 67, startBeat: 12, durationBeats: 1.0, velocity: 0.8 },
    { midi: 65, startBeat: 13.5, durationBeats: 0.8, velocity: 0.85 },
    { midi: 63, startBeat: 14.5, durationBeats: 1.5, velocity: 0.9 },
  ];
  const vocalBuf = renderSynthSequenceToBuffer(ctx, vocalNotes, bpm, {
    ...SYNTH_PRESETS.vintageKeys,
    waveform: 'sine',
    cutoff: 2400,
  });
  const vocalClip: AudioClip = {
    id: 'clip_vocal_1',
    trackId: 'track_vocal',
    name: 'Vocal Hook Stems',
    startBeat: 0,
    durationBeats: 16,
    buffer: vocalBuf,
    waveformPeaks: extractWaveformPeaks(vocalBuf, 64),
    color: '#f59e0b',
    type: 'vocal',
  };

  const tracks: Track[] = [
    {
      id: 'track_vocal',
      name: 'Lead Vocal 🎙️',
      type: 'audio',
      color: '#f59e0b',
      volume: 0.9,
      pan: 0,
      muted: false,
      solo: false,
      armed: true,
      fx: {
        eq: { low: -2, mid: 2, high: 3 },
        delay: { enabled: true, time: 0.28, feedback: 0.35, mix: 0.25 },
        reverb: { enabled: true, decay: 2.2, mix: 0.3 },
        distortion: { enabled: false, drive: 10, mix: 0 },
      },
      clips: [vocalClip],
    },
    {
      id: 'track_lead',
      name: 'Cyber Pluck ⚡',
      type: 'synth',
      color: '#06b6d4',
      volume: 0.85,
      pan: -0.2,
      muted: false,
      solo: false,
      armed: false,
      fx: {
        eq: { low: -3, mid: 1, high: 2 },
        delay: { enabled: true, time: 0.21, feedback: 0.4, mix: 0.3 },
        reverb: { enabled: true, decay: 1.8, mix: 0.25 },
        distortion: { enabled: false, drive: 15, mix: 0 },
      },
      clips: [leadClip],
    },
    {
      id: 'track_drums',
      name: '808 Trap Drums 🥁',
      type: 'drums',
      color: '#10b981',
      volume: 0.95,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      fx: {
        eq: { low: 2, mid: 0, high: 2 },
        delay: { enabled: false, time: 0.25, feedback: 0.2, mix: 0 },
        reverb: { enabled: false, decay: 1.2, mix: 0 },
        distortion: { enabled: true, drive: 12, mix: 0.15 },
      },
      clips: [],
    },
    {
      id: 'track_bass',
      name: 'Sub 808 Bass 🎹',
      type: 'synth',
      color: '#ec4899',
      volume: 0.92,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      fx: {
        eq: { low: 4, mid: -1, high: -4 },
        delay: { enabled: false, time: 0.3, feedback: 0.2, mix: 0 },
        reverb: { enabled: false, decay: 1.0, mix: 0 },
        distortion: { enabled: true, drive: 22, mix: 0.25 },
      },
      clips: [bassClip],
    },
    {
      id: 'track_pad',
      name: 'Analog Pad 🌌',
      type: 'synth',
      color: '#8b5cf6',
      volume: 0.75,
      pan: 0.25,
      muted: false,
      solo: false,
      armed: false,
      fx: {
        eq: { low: -1, mid: 0, high: 1 },
        delay: { enabled: true, time: 0.42, feedback: 0.45, mix: 0.3 },
        reverb: { enabled: true, decay: 3.0, mix: 0.45 },
        distortion: { enabled: false, drive: 10, mix: 0 },
      },
      clips: [padClip],
    },
  ];

  return {
    id: 'proj_trap_cyber',
    name: 'Cyberpunk Trap 808',
    bpm,
    timeSignature: [4, 4],
    tracks,
    stepGrid: createDefaultStepGrid(),
    snap: '1/4',
    loopEnabled: true,
    loopStartBeat: 0,
    loopEndBeat: 16,
    totalBeats: 16,
  };
}

export function generateLofiDemoProject(ctx: BaseAudioContext): Project {
  const bpm = 84;

  // Vintage Rhodes keys
  const rhodesNotes: NoteEvent[] = [
    { midi: 50, startBeat: 0, durationBeats: 3.5, velocity: 0.7 }, // D3
    { midi: 57, startBeat: 0, durationBeats: 3.5, velocity: 0.75 }, // A3
    { midi: 60, startBeat: 0, durationBeats: 3.5, velocity: 0.8 }, // C4
    { midi: 64, startBeat: 0, durationBeats: 3.5, velocity: 0.8 }, // E4

    { midi: 55, startBeat: 4, durationBeats: 3.5, velocity: 0.7 }, // G3
    { midi: 59, startBeat: 4, durationBeats: 3.5, velocity: 0.75 }, // B3
    { midi: 62, startBeat: 4, durationBeats: 3.5, velocity: 0.8 }, // D4
    { midi: 65, startBeat: 4, durationBeats: 3.5, velocity: 0.8 }, // F4

    { midi: 48, startBeat: 8, durationBeats: 3.5, velocity: 0.7 }, // C3
    { midi: 55, startBeat: 8, durationBeats: 3.5, velocity: 0.75 }, // G3
    { midi: 59, startBeat: 8, durationBeats: 3.5, velocity: 0.8 }, // B3
    { midi: 64, startBeat: 8, durationBeats: 3.5, velocity: 0.8 }, // E4

    { midi: 45, startBeat: 12, durationBeats: 3.5, velocity: 0.7 }, // A2
    { midi: 52, startBeat: 12, durationBeats: 3.5, velocity: 0.75 }, // E3
    { midi: 57, startBeat: 12, durationBeats: 3.5, velocity: 0.8 }, // A3
    { midi: 61, startBeat: 12, durationBeats: 3.5, velocity: 0.8 }, // C#4
  ];

  const rhodesBuf = renderSynthSequenceToBuffer(ctx, rhodesNotes, bpm, SYNTH_PRESETS.vintageKeys);
  const rhodesClip: AudioClip = {
    id: 'clip_rhodes_1',
    trackId: 'track_rhodes',
    name: 'Midnight Rhodes Chords',
    startBeat: 0,
    durationBeats: 16,
    buffer: rhodesBuf,
    waveformPeaks: extractWaveformPeaks(rhodesBuf, 64),
    color: '#f97316',
    type: 'synth',
  };

  const lofiSteps: StepGrid = {
    kick: [true, false, false, false, false, false, true, false, false, false, true, false, false, false, false, false],
    snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    clap: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    hatClosed: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
    hatOpen: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, true, false],
    sub808: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    tomLow: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    perc: [false, false, true, false, false, false, false, true, false, false, true, false, false, true, false, false],
  };

  const tracks: Track[] = [
    {
      id: 'track_rhodes',
      name: 'Rhodes Keys 🎹',
      type: 'synth',
      color: '#f97316',
      volume: 0.88,
      pan: -0.15,
      muted: false,
      solo: false,
      armed: false,
      fx: {
        eq: { low: 1, mid: 1, high: -2 },
        delay: { enabled: true, time: 0.35, feedback: 0.4, mix: 0.25 },
        reverb: { enabled: true, decay: 2.5, mix: 0.35 },
        distortion: { enabled: true, drive: 8, mix: 0.1 },
      },
      clips: [rhodesClip],
    },
    {
      id: 'track_drums',
      name: 'Lo-Fi Tape Drums 🥁',
      type: 'drums',
      color: '#14b8a6',
      volume: 0.85,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      fx: {
        eq: { low: 2, mid: -1, high: -3 },
        delay: { enabled: false, time: 0.25, feedback: 0.2, mix: 0 },
        reverb: { enabled: true, decay: 1.5, mix: 0.2 },
        distortion: { enabled: true, drive: 14, mix: 0.2 },
      },
      clips: [],
    },
    {
      id: 'track_mic',
      name: 'Studio Mic Vocal 🎙️',
      type: 'audio',
      color: '#e11d48',
      volume: 0.9,
      pan: 0,
      muted: false,
      solo: false,
      armed: true,
      fx: {
        eq: { low: -3, mid: 2, high: 2 },
        delay: { enabled: true, time: 0.3, feedback: 0.3, mix: 0.2 },
        reverb: { enabled: true, decay: 2.0, mix: 0.25 },
        distortion: { enabled: false, drive: 5, mix: 0 },
      },
      clips: [],
    },
  ];

  return {
    id: 'proj_lofi_midnight',
    name: 'Midnight Lo-Fi Chill',
    bpm,
    timeSignature: [4, 4],
    tracks,
    stepGrid: lofiSteps,
    snap: '1/4',
    loopEnabled: true,
    loopStartBeat: 0,
    loopEndBeat: 16,
    totalBeats: 16,
  };
}

export function generateAssamDemoProject(ctx: BaseAudioContext): Project {
  const bpm = 108;

  // 1. Anurag Loying Lead Vocal Hook Melody
  const anuragVocalNotes: NoteEvent[] = [
    { midi: 69, startBeat: 0, durationBeats: 1.5, velocity: 0.9 }, // A4
    { midi: 71, startBeat: 1.5, durationBeats: 0.5, velocity: 0.85 }, // B4
    { midi: 72, startBeat: 2, durationBeats: 1.5, velocity: 0.95 }, // C5
    { midi: 74, startBeat: 3.5, durationBeats: 0.5, velocity: 0.85 }, // D5
    { midi: 76, startBeat: 4, durationBeats: 2.0, velocity: 0.95 }, // E5
    { midi: 74, startBeat: 6, durationBeats: 1.0, velocity: 0.85 }, // D5
    { midi: 72, startBeat: 7, durationBeats: 1.0, velocity: 0.9 }, // C5
    { midi: 71, startBeat: 8, durationBeats: 2.0, velocity: 0.85 }, // B4
    { midi: 69, startBeat: 10, durationBeats: 2.0, velocity: 0.9 }, // A4
    { midi: 67, startBeat: 12, durationBeats: 1.5, velocity: 0.85 }, // G4
    { midi: 69, startBeat: 14, durationBeats: 2.0, velocity: 0.95 }, // A4
  ];

  const anuragBuf = renderSynthSequenceToBuffer(ctx, anuragVocalNotes, bpm, {
    ...SYNTH_PRESETS.vintageKeys,
    waveform: 'sine',
    cutoff: 2800,
  });

  const anuragClip: AudioClip = {
    id: 'clip_anurag_vocal',
    trackId: 'track_anurag',
    name: 'Anurag Loying • Lead Vocal',
    startBeat: 0,
    durationBeats: 16,
    buffer: anuragBuf,
    waveformPeaks: extractWaveformPeaks(anuragBuf, 64),
    color: '#dfb743',
    type: 'vocal',
  };

  // 2. Koustav Jyoti Borah Harmony Vocal
  const koustavVocalNotes: NoteEvent[] = [
    { midi: 64, startBeat: 0, durationBeats: 2.0, velocity: 0.75 }, // E4
    { midi: 67, startBeat: 2, durationBeats: 2.0, velocity: 0.8 }, // G4
    { midi: 69, startBeat: 4, durationBeats: 2.0, velocity: 0.85 }, // A4
    { midi: 67, startBeat: 6, durationBeats: 2.0, velocity: 0.75 }, // G4
    { midi: 65, startBeat: 8, durationBeats: 2.0, velocity: 0.8 }, // F4
    { midi: 64, startBeat: 10, durationBeats: 2.0, velocity: 0.8 }, // E4
    { midi: 62, startBeat: 12, durationBeats: 2.0, velocity: 0.75 }, // D4
    { midi: 64, startBeat: 14, durationBeats: 2.0, velocity: 0.85 }, // E4
  ];

  const koustavBuf = renderSynthSequenceToBuffer(ctx, koustavVocalNotes, bpm, {
    ...SYNTH_PRESETS.vintageKeys,
    waveform: 'sine',
    cutoff: 2200,
  });

  const koustavClip: AudioClip = {
    id: 'clip_koustav_vocal',
    trackId: 'track_koustav',
    name: 'Koustav J. Borah • Harmonies',
    startBeat: 0,
    durationBeats: 16,
    buffer: koustavBuf,
    waveformPeaks: extractWaveformPeaks(koustavBuf, 64),
    color: '#10b981',
    type: 'vocal',
  };

  // 3. Anubhov Loying Acoustic Pluck Riff
  const anubhovNotes: NoteEvent[] = [
    { midi: 57, startBeat: 0, durationBeats: 0.5, velocity: 0.9 }, // A3
    { midi: 64, startBeat: 0.5, durationBeats: 0.5, velocity: 0.85 }, // E4
    { midi: 69, startBeat: 1.0, durationBeats: 0.5, velocity: 0.9 }, // A4
    { midi: 72, startBeat: 1.5, durationBeats: 0.5, velocity: 0.95 }, // C5
    { midi: 57, startBeat: 2.0, durationBeats: 0.5, velocity: 0.85 },
    { midi: 64, startBeat: 2.5, durationBeats: 0.5, velocity: 0.85 },
    { midi: 71, startBeat: 3.0, durationBeats: 0.5, velocity: 0.9 },
    { midi: 69, startBeat: 3.5, durationBeats: 0.5, velocity: 0.85 },

    { midi: 55, startBeat: 4.0, durationBeats: 0.5, velocity: 0.9 }, // G3
    { midi: 62, startBeat: 4.5, durationBeats: 0.5, velocity: 0.85 },
    { midi: 67, startBeat: 5.0, durationBeats: 0.5, velocity: 0.9 },
    { midi: 71, startBeat: 5.5, durationBeats: 0.5, velocity: 0.95 },
    { midi: 55, startBeat: 6.0, durationBeats: 0.5, velocity: 0.85 },
    { midi: 62, startBeat: 6.5, durationBeats: 0.5, velocity: 0.85 },
    { midi: 67, startBeat: 7.0, durationBeats: 0.5, velocity: 0.9 },
    { midi: 65, startBeat: 7.5, durationBeats: 0.5, velocity: 0.85 },

    { midi: 53, startBeat: 8.0, durationBeats: 0.5, velocity: 0.9 }, // F3
    { midi: 60, startBeat: 8.5, durationBeats: 0.5, velocity: 0.85 },
    { midi: 65, startBeat: 9.0, durationBeats: 0.5, velocity: 0.9 },
    { midi: 69, startBeat: 9.5, durationBeats: 0.5, velocity: 0.95 },
    { midi: 53, startBeat: 10.0, durationBeats: 0.5, velocity: 0.85 },
    { midi: 60, startBeat: 10.5, durationBeats: 0.5, velocity: 0.85 },
    { midi: 65, startBeat: 11.0, durationBeats: 0.5, velocity: 0.9 },
    { midi: 64, startBeat: 11.5, durationBeats: 0.5, velocity: 0.85 },

    { midi: 52, startBeat: 12.0, durationBeats: 0.5, velocity: 0.9 }, // E3
    { midi: 59, startBeat: 12.5, durationBeats: 0.5, velocity: 0.85 },
    { midi: 64, startBeat: 13.0, durationBeats: 0.5, velocity: 0.9 },
    { midi: 67, startBeat: 13.5, durationBeats: 0.5, velocity: 0.95 },
    { midi: 52, startBeat: 14.0, durationBeats: 0.5, velocity: 0.85 },
    { midi: 59, startBeat: 14.5, durationBeats: 0.5, velocity: 0.85 },
    { midi: 64, startBeat: 15.0, durationBeats: 0.5, velocity: 0.9 },
    { midi: 62, startBeat: 15.5, durationBeats: 0.5, velocity: 0.85 },
  ];

  const anubhovBuf = renderSynthSequenceToBuffer(ctx, anubhovNotes, bpm, SYNTH_PRESETS.pluckLead);
  const anubhovClip: AudioClip = {
    id: 'clip_anubhov_pluck',
    trackId: 'track_anubhov',
    name: 'Anubhov Loying • Acoustic Pluck',
    startBeat: 0,
    durationBeats: 16,
    buffer: anubhovBuf,
    waveformPeaks: extractWaveformPeaks(anubhovBuf, 64),
    color: '#06b6d4',
    type: 'synth',
  };

  // 4. Warm Drone Pad & Bass
  const droneNotes: NoteEvent[] = [
    { midi: 45, startBeat: 0, durationBeats: 7.5, velocity: 0.7 }, // A2
    { midi: 52, startBeat: 0, durationBeats: 7.5, velocity: 0.65 }, // E3
    { midi: 41, startBeat: 8, durationBeats: 7.5, velocity: 0.7 }, // F2
    { midi: 48, startBeat: 8, durationBeats: 7.5, velocity: 0.65 }, // C3
  ];

  const droneBuf = renderSynthSequenceToBuffer(ctx, droneNotes, bpm, SYNTH_PRESETS.analogPad);
  const droneClip: AudioClip = {
    id: 'clip_drone_pad',
    trackId: 'track_drone',
    name: 'Dhwoni Folk Drone & Pad',
    startBeat: 0,
    durationBeats: 16,
    buffer: droneBuf,
    waveformPeaks: extractWaveformPeaks(droneBuf, 64),
    color: '#8b5cf6',
    type: 'synth',
  };

  const assamStepGrid: StepGrid = {
    kick: [true, false, false, true, false, false, true, false, true, false, false, true, false, false, true, false],
    snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    clap: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    hatClosed: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    hatOpen: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
    sub808: [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
    tomLow: [false, false, false, false, false, true, false, false, false, false, false, false, false, true, false, false],
    perc: [false, true, false, false, false, false, true, true, false, true, false, false, false, false, true, true],
  };

  const tracks: Track[] = [
    {
      id: 'track_anurag',
      name: 'Anurag Loying 🎙️ (Lead)',
      type: 'audio',
      color: '#dfb743',
      volume: 0.92,
      pan: -0.1,
      muted: false,
      solo: false,
      armed: true,
      fx: {
        eq: { low: -2, mid: 2, high: 3 },
        delay: { enabled: true, time: 0.32, feedback: 0.35, mix: 0.25 },
        reverb: { enabled: true, decay: 2.4, mix: 0.3 },
        distortion: { enabled: false, drive: 5, mix: 0 },
      },
      clips: [anuragClip],
    },
    {
      id: 'track_koustav',
      name: 'Koustav J. Borah 🎙️ (Harmony)',
      type: 'audio',
      color: '#10b981',
      volume: 0.88,
      pan: 0.2,
      muted: false,
      solo: false,
      armed: false,
      fx: {
        eq: { low: -3, mid: 1, high: 2 },
        delay: { enabled: true, time: 0.32, feedback: 0.3, mix: 0.2 },
        reverb: { enabled: true, decay: 2.6, mix: 0.35 },
        distortion: { enabled: false, drive: 5, mix: 0 },
      },
      clips: [koustavClip],
    },
    {
      id: 'track_anubhov',
      name: 'Anubhov Loying 🎸 (Pluck)',
      type: 'synth',
      color: '#06b6d4',
      volume: 0.9,
      pan: -0.25,
      muted: false,
      solo: false,
      armed: false,
      fx: {
        eq: { low: -2, mid: 2, high: 1 },
        delay: { enabled: true, time: 0.28, feedback: 0.4, mix: 0.25 },
        reverb: { enabled: true, decay: 2.0, mix: 0.25 },
        distortion: { enabled: false, drive: 8, mix: 0 },
      },
      clips: [anubhovClip],
    },
    {
      id: 'track_biplab_drums',
      name: 'Dhol & Perc 🥁 (Biplab Mix)',
      type: 'drums',
      color: '#f97316',
      volume: 0.95,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      fx: {
        eq: { low: 3, mid: 0, high: 2 },
        delay: { enabled: false, time: 0.25, feedback: 0.2, mix: 0 },
        reverb: { enabled: true, decay: 1.2, mix: 0.15 },
        distortion: { enabled: true, drive: 12, mix: 0.15 },
      },
      clips: [],
    },
    {
      id: 'track_drone',
      name: 'Folk Drone & Pad 🌌',
      type: 'synth',
      color: '#8b5cf6',
      volume: 0.78,
      pan: 0.15,
      muted: false,
      solo: false,
      armed: false,
      fx: {
        eq: { low: 1, mid: 0, high: 0 },
        delay: { enabled: true, time: 0.45, feedback: 0.4, mix: 0.3 },
        reverb: { enabled: true, decay: 3.2, mix: 0.4 },
        distortion: { enabled: false, drive: 5, mix: 0 },
      },
      clips: [droneClip],
    },
  ];

  return {
    id: 'proj_assam_dhwoni',
    name: 'Dhwoni Studio Assam Session',
    bpm,
    timeSignature: [4, 4],
    tracks,
    stepGrid: assamStepGrid,
    snap: '1/4',
    loopEnabled: true,
    loopStartBeat: 0,
    loopEndBeat: 16,
    totalBeats: 16,
  };
}

