import React, { useEffect, useState } from 'react';
import { Music, Sliders, Play, Disc } from 'lucide-react';
import { AudioClip, Project, SynthSettings } from '../types/studio';
import { AudioEngine } from '../audio/audioEngine';
import { NoteEvent, playLiveSynthNote, renderSynthSequenceToBuffer, SYNTH_PRESETS } from '../audio/synthEngine';
import { extractWaveformPeaks } from '../audio/drumSynth';

interface SynthKeyboardViewProps {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  engine: AudioEngine;
  currentBeat: number;
}

// 25-key piano definition (C3 = MIDI 60)
const PIANO_KEYS = [
  { midi: 48, note: 'C', isBlack: false, hotkey: 'Z' },
  { midi: 49, note: 'C#', isBlack: true, hotkey: 'S' },
  { midi: 50, note: 'D', isBlack: false, hotkey: 'X' },
  { midi: 51, note: 'D#', isBlack: true, hotkey: 'D' },
  { midi: 52, note: 'E', isBlack: false, hotkey: 'C' },
  { midi: 53, note: 'F', isBlack: false, hotkey: 'V' },
  { midi: 54, note: 'F#', isBlack: true, hotkey: 'G' },
  { midi: 55, note: 'G', isBlack: false, hotkey: 'B' },
  { midi: 56, note: 'G#', isBlack: true, hotkey: 'H' },
  { midi: 57, note: 'A', isBlack: false, hotkey: 'N' },
  { midi: 58, note: 'A#', isBlack: true, hotkey: 'J' },
  { midi: 59, note: 'B', isBlack: false, hotkey: 'M' },

  { midi: 60, note: 'C', isBlack: false, hotkey: 'Q' },
  { midi: 61, note: 'C#', isBlack: true, hotkey: '2' },
  { midi: 62, note: 'D', isBlack: false, hotkey: 'W' },
  { midi: 63, note: 'D#', isBlack: true, hotkey: '3' },
  { midi: 64, note: 'E', isBlack: false, hotkey: 'E' },
  { midi: 65, note: 'F', isBlack: false, hotkey: 'R' },
  { midi: 66, note: 'F#', isBlack: true, hotkey: '5' },
  { midi: 67, note: 'G', isBlack: false, hotkey: 'T' },
  { midi: 68, note: 'G#', isBlack: true, hotkey: '6' },
  { midi: 69, note: 'A', isBlack: false, hotkey: 'Y' },
  { midi: 70, note: 'A#', isBlack: true, hotkey: '7' },
  { midi: 71, note: 'B', isBlack: false, hotkey: 'U' },
  { midi: 72, note: 'C', isBlack: false, hotkey: 'I' },
];

export const SynthKeyboardView: React.FC<SynthKeyboardViewProps> = ({
  project,
  setProject,
  engine,
  currentBeat,
}) => {
  const [synthSettings, setSynthSettings] = useState<SynthSettings>(SYNTH_PRESETS.vintageKeys);
  const [activePreset, setActivePreset] = useState<string>('vintageKeys');
  const [activeMidiNotes, setActiveMidiNotes] = useState<Set<number>>(new Set());
  const [scaleGuide, setScaleGuide] = useState<'all' | 'minor' | 'pentatonic' | 'blues'>('pentatonic');

  // Performance live recording
  const [isRecordingNotes, setIsRecordingNotes] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<NoteEvent[]>([]);
  const [recStartBeat, setRecStartBeat] = useState(0);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toUpperCase();
      const pKey = PIANO_KEYS.find((k) => k.hotkey === key);
      if (pKey && !activeMidiNotes.has(pKey.midi)) {
        triggerNote(pKey.midi);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const pKey = PIANO_KEYS.find((k) => k.hotkey === key);
      if (pKey) {
        releaseNote(pKey.midi);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeMidiNotes, synthSettings]);

  const triggerNote = async (midi: number) => {
    await engine.init();
    setActiveMidiNotes((prev) => new Set(prev).add(midi));

    // Play note through engine master or armed track
    if (engine.ctx) {
      const armedSynthTrack = project.tracks.find((t) => t.type === 'synth' && t.armed);
      const destNode = armedSynthTrack && engine['trackNodes'].has(armedSynthTrack.id)
        ? engine['trackNodes'].get(armedSynthTrack.id)!.inputNode
        : engine.masterGain || engine.ctx.destination;

      playLiveSynthNote(engine.ctx, destNode, midi, synthSettings, 0.6);
    }

    // Record note if recording session active
    if (isRecordingNotes) {
      const relBeat = Math.max(0, currentBeat - recStartBeat);
      setRecordedNotes((prev) => [
        ...prev,
        {
          midi,
          startBeat: Math.round(relBeat * 4) / 4,
          durationBeats: 1.0,
          velocity: 0.85,
        },
      ]);
    }
  };

  const releaseNote = (midi: number) => {
    setActiveMidiNotes((prev) => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
  };

  const selectPreset = (key: string) => {
    setActivePreset(key);
    if (SYNTH_PRESETS[key]) {
      setSynthSettings(SYNTH_PRESETS[key]);
    }
  };

  // Start / Stop note recording into a new clip on timeline
  const toggleRecordNotes = async () => {
    if (!isRecordingNotes) {
      setIsRecordingNotes(true);
      setRecStartBeat(currentBeat);
      setRecordedNotes([]);
    } else {
      setIsRecordingNotes(false);
      if (recordedNotes.length > 0 && engine.ctx) {
        // Render recorded note buffer
        const buffer = renderSynthSequenceToBuffer(
          engine.ctx,
          recordedNotes,
          project.bpm,
          synthSettings
        );
        const peaks = extractWaveformPeaks(buffer, 60);

        let targetTrack = project.tracks.find((t) => t.type === 'synth' && t.armed);
        if (!targetTrack) {
          targetTrack = project.tracks.find((t) => t.type === 'synth');
        }

        if (targetTrack) {
          const newClip: AudioClip = {
            id: `clip_synth_${Date.now()}`,
            trackId: targetTrack.id,
            name: `${synthSettings.waveform.toUpperCase()} Riff (${recordedNotes.length} notes)`,
            startBeat: Math.floor(recStartBeat),
            durationBeats: Math.max(2, Math.ceil(buffer.duration / (60 / project.bpm))),
            buffer,
            waveformPeaks: peaks,
            color: '#8b5cf6',
            type: 'synth',
          };

          setProject((prev) => ({
            ...prev,
            tracks: prev.tracks.map((t) =>
              t.id === targetTrack!.id
                ? { ...t, clips: [...t.clips, newClip] }
                : t
            ),
          }));
        }
      }
    }
  };

  // Filter notes based on scale guide
  const isKeyInScale = (midi: number): boolean => {
    if (scaleGuide === 'all') return true;
    const noteInOctave = midi % 12; // 0 = C, 2 = D, 3 = Eb, etc.
    if (scaleGuide === 'minor') {
      return [0, 2, 3, 5, 7, 8, 10].includes(noteInOctave); // C Natural Minor
    }
    if (scaleGuide === 'pentatonic') {
      return [0, 3, 5, 7, 10].includes(noteInOctave); // Minor Pentatonic
    }
    if (scaleGuide === 'blues') {
      return [0, 3, 5, 6, 7, 10].includes(noteInOctave); // Blues Scale
    }
    return true;
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0a0a0a] text-neutral-200 overflow-y-auto">
      {/* Synth Controls & Parameters Header */}
      <div className="p-4 border-b border-neutral-800 bg-[#0d0d0d] flex flex-wrap items-center justify-between gap-4">
        {/* Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400 font-mono">PRESET:</span>
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
            <button
              onClick={() => selectPreset('vintageKeys')}
              className={`px-2.5 py-1 text-xs rounded transition ${
                activePreset === 'vintageKeys' ? 'bg-amber-500 text-black font-bold' : 'text-neutral-300 hover:text-white'
              }`}
            >
              Vintage Keys
            </button>
            <button
              onClick={() => selectPreset('subBass')}
              className={`px-2.5 py-1 text-xs rounded transition ${
                activePreset === 'subBass' ? 'bg-amber-500 text-black font-bold' : 'text-neutral-300 hover:text-white'
              }`}
            >
              808 Sub Bass
            </button>
            <button
              onClick={() => selectPreset('pluckLead')}
              className={`px-2.5 py-1 text-xs rounded transition ${
                activePreset === 'pluckLead' ? 'bg-amber-500 text-black font-bold' : 'text-neutral-300 hover:text-white'
              }`}
            >
              Cyber Pluck
            </button>
            <button
              onClick={() => selectPreset('analogPad')}
              className={`px-2.5 py-1 text-xs rounded transition ${
                activePreset === 'analogPad' ? 'bg-amber-500 text-black font-bold' : 'text-neutral-300 hover:text-white'
              }`}
            >
              Warm Pad
            </button>
          </div>
        </div>

        {/* Waveform Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-400 font-mono">WAVE:</span>
          {(['triangle', 'sine', 'sawtooth', 'square'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setSynthSettings((prev) => ({ ...prev, waveform: w }))}
              className={`px-2 py-0.5 text-xs font-mono rounded capitalize transition ${
                synthSettings.waveform === w
                  ? 'bg-neutral-700 text-amber-300 border border-amber-400/50'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        {/* Scale Guide & Octave */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px] text-neutral-400 font-mono">SCALE:</span>
            <select
              value={scaleGuide}
              onChange={(e) => setScaleGuide(e.target.value as any)}
              className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none"
            >
              <option value="pentatonic">Pentatonic Scale (Recommended)</option>
              <option value="minor">Natural Minor</option>
              <option value="blues">Blues Scale</option>
              <option value="all">Chromatic (All 12 Keys)</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="text-[10px] text-neutral-400 font-mono">OCT:</span>
            <button
              onClick={() => setSynthSettings((prev) => ({ ...prev, octave: Math.max(-2, prev.octave - 1) }))}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 font-mono font-bold"
            >
              -
            </button>
            <span className="w-5 text-center font-mono font-bold text-amber-400">{synthSettings.octave > 0 ? `+${synthSettings.octave}` : synthSettings.octave}</span>
            <button
              onClick={() => setSynthSettings((prev) => ({ ...prev, octave: Math.min(2, prev.octave + 1) }))}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 font-mono font-bold"
            >
              +
            </button>
          </div>

          {/* Record performance to timeline */}
          <button
            onClick={toggleRecordNotes}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 shadow ${
              isRecordingNotes
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>{isRecordingNotes ? 'Finish Recording' : 'Record to Clip'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Envelope & Filter Sliders */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 p-4 bg-[#0e0e0e] border-b border-neutral-800/80 text-xs font-mono">
        <div>
          <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
            <span>CUTOFF</span>
            <span className="text-amber-400">{synthSettings.cutoff}Hz</span>
          </div>
          <input
            type="range"
            min="200"
            max="10000"
            value={synthSettings.cutoff}
            onChange={(e) => setSynthSettings((prev) => ({ ...prev, cutoff: parseInt(e.target.value) }))}
            className="w-full h-1 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
            <span>RESONANCE</span>
            <span className="text-amber-400">{synthSettings.resonance}</span>
          </div>
          <input
            type="range"
            min="0"
            max="18"
            value={synthSettings.resonance}
            onChange={(e) => setSynthSettings((prev) => ({ ...prev, resonance: parseInt(e.target.value) }))}
            className="w-full h-1 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
            <span>ATTACK</span>
            <span className="text-amber-400">{synthSettings.attack}s</span>
          </div>
          <input
            type="range"
            min="0.005"
            max="1"
            step="0.01"
            value={synthSettings.attack}
            onChange={(e) => setSynthSettings((prev) => ({ ...prev, attack: parseFloat(e.target.value) }))}
            className="w-full h-1 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
            <span>DECAY</span>
            <span className="text-amber-400">{synthSettings.decay}s</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1.5"
            step="0.05"
            value={synthSettings.decay}
            onChange={(e) => setSynthSettings((prev) => ({ ...prev, decay: parseFloat(e.target.value) }))}
            className="w-full h-1 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
            <span>SUSTAIN</span>
            <span className="text-amber-400">{Math.round(synthSettings.sustain * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={synthSettings.sustain}
            onChange={(e) => setSynthSettings((prev) => ({ ...prev, sustain: parseFloat(e.target.value) }))}
            className="w-full h-1 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
            <span>RELEASE</span>
            <span className="text-amber-400">{synthSettings.release}s</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="2"
            step="0.05"
            value={synthSettings.release}
            onChange={(e) => setSynthSettings((prev) => ({ ...prev, release: parseFloat(e.target.value) }))}
            className="w-full h-1 cursor-pointer"
          />
        </div>
      </div>

      {/* 25-Key Interactive Piano Roll */}
      <div className="flex-1 flex flex-col justify-end p-4 pb-6 overflow-x-auto">
        <div className="relative flex justify-center min-w-[760px] h-60 mx-auto select-none bg-black/40 p-2 rounded-2xl border border-neutral-800 shadow-2xl">
          {PIANO_KEYS.map((k) => {
            const isActive = activeMidiNotes.has(k.midi);
            const inScale = isKeyInScale(k.midi);

            if (k.isBlack) {
              return (
                <button
                  key={k.midi}
                  onMouseDown={() => triggerNote(k.midi)}
                  onMouseUp={() => releaseNote(k.midi)}
                  onMouseLeave={() => releaseNote(k.midi)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    triggerNote(k.midi);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    releaseNote(k.midi);
                  }}
                  className={`w-9 h-36 -mx-4.5 z-20 rounded-b-md border transition-all duration-75 relative flex flex-col justify-end items-center pb-2 ${
                    isActive
                      ? 'bg-amber-400 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.8)] scale-95'
                      : inScale
                      ? 'bg-[#181818] border-neutral-700 hover:bg-[#252525]'
                      : 'bg-[#0f0f0f] border-neutral-900 opacity-50'
                  }`}
                >
                  <span className={`text-[9px] font-mono font-bold ${isActive ? 'text-black' : 'text-neutral-400'}`}>
                    {k.hotkey}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={k.midi}
                onMouseDown={() => triggerNote(k.midi)}
                onMouseUp={() => releaseNote(k.midi)}
                onMouseLeave={() => releaseNote(k.midi)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  triggerNote(k.midi);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  releaseNote(k.midi);
                }}
                className={`w-12 h-56 rounded-b-lg border transition-all duration-75 relative flex flex-col justify-end items-center pb-3 ${
                  isActive
                    ? 'bg-amber-400 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.7)] text-black font-bold'
                    : inScale
                    ? 'bg-neutral-100 border-neutral-300 text-neutral-800 hover:bg-neutral-200'
                    : 'bg-neutral-400/80 border-neutral-500 text-neutral-700 opacity-60'
                }`}
              >
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-[11px] font-bold">{k.note}</span>
                  <span className="text-[9px] font-mono opacity-60">{k.hotkey}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
