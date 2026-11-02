import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  Plus,
  Trash2,
  Save,
  Volume2,
  Sparkles,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Music,
  Check,
} from 'lucide-react';
import { AudioClip, Project, Track, SynthSettings } from '../types/studio';
import { AudioEngine } from '../audio/audioEngine';
import {
  NoteEvent,
  playLiveSynthNote,
  renderSynthSequenceToBuffer,
  SYNTH_PRESETS,
  midiToFreq,
} from '../audio/synthEngine';
import { extractWaveformPeaks } from '../audio/drumSynth';

interface PianoRollViewProps {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  engine: AudioEngine;
}

// Generate vertical pitch list from C5 (72) down to C2 (36) -> 37 keys
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface PitchRow {
  midi: number;
  name: string;
  octave: number;
  isBlack: boolean;
  label: string;
}

function generatePitchRows(): PitchRow[] {
  const rows: PitchRow[] = [];
  // From C5 (72) down to C2 (36)
  for (let m = 72; m >= 36; m--) {
    const noteIndex = m % 12;
    const name = NOTE_NAMES[noteIndex];
    const octave = Math.floor(m / 12) - 1;
    const isBlack = name.includes('#');
    rows.push({
      midi: m,
      name,
      octave,
      isBlack,
      label: `${name}${octave}`,
    });
  }
  return rows;
}

const PITCH_ROWS = generatePitchRows();

export const PianoRollView: React.FC<PianoRollViewProps> = ({
  project,
  setProject,
  engine,
}) => {
  // Target instrument track
  const synthTracks = useMemo(
    () => project.tracks.filter((t) => t.type === 'synth'),
    [project.tracks]
  );

  const [selectedTrackId, setSelectedTrackId] = useState<string>(() => {
    return synthTracks[0]?.id || project.tracks[0]?.id || '';
  });

  // Current track object
  const currentTrack = useMemo(() => {
    return project.tracks.find((t) => t.id === selectedTrackId) || synthTracks[0] || project.tracks[0];
  }, [project.tracks, selectedTrackId, synthTracks]);

  // Notes state for this piano roll session
  const [notes, setNotes] = useState<NoteEvent[]>(() => {
    // If the selected track already has a synth clip with saved notes, load them
    const existingClip = currentTrack?.clips.find((c) => c.notes && c.notes.length > 0);
    if (existingClip?.notes) return [...existingClip.notes];

    // Default starter motif
    return [
      { midi: 60, startBeat: 0, durationBeats: 1.0, velocity: 0.9 }, // C4
      { midi: 63, startBeat: 1, durationBeats: 1.0, velocity: 0.85 }, // Eb4
      { midi: 67, startBeat: 2, durationBeats: 1.5, velocity: 0.9 }, // G4
      { midi: 70, startBeat: 4, durationBeats: 1.0, velocity: 0.8 }, // Bb4
      { midi: 72, startBeat: 5, durationBeats: 2.0, velocity: 0.95 }, // C5
    ];
  });

  // Synth settings & Preset
  const [presetKey, setPresetKey] = useState<string>('vintageKeys');
  const [synthSettings, setSynthSettings] = useState<SynthSettings>(SYNTH_PRESETS.vintageKeys);

  // Grid config
  const [totalPatternBeats, setTotalPatternBeats] = useState<number>(8); // 8 beats = 2 bars
  const [snap, setSnap] = useState<'1/4' | '1/8' | '1/16'>('1/8');
  const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(null);
  const [scaleFilter, setScaleFilter] = useState<'all' | 'pentatonic' | 'minor' | 'blues'>('pentatonic');

  // Preview playback inside Piano Roll
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [previewBeat, setPreviewBeat] = useState<number>(0);
  const previewTimerRef = useRef<number | null>(null);
  const previewAudioSources = useRef<AudioNode[]>([]);
  const previewStartTime = useRef<number>(0);

  // Status message
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  // Snap decimal step
  const snapStep = snap === '1/16' ? 0.25 : snap === '1/8' ? 0.5 : 1.0;
  const pixelsPerBeat = 72; // Horizontal scale width
  const rowHeight = 22; // Height of each pitch row

  // Clean up preview audio on unmount
  useEffect(() => {
    return () => {
      if (previewTimerRef.current) cancelAnimationFrame(previewTimerRef.current);
    };
  }, []);

  // Play sound when clicking a piano key or editing a note
  const auditionNote = async (midi: number) => {
    await engine.init();
    if (engine.ctx) {
      const dest = engine.masterGain || engine.ctx.destination;
      playLiveSynthNote(engine.ctx, dest, midi, synthSettings, 0.4);
    }
  };

  // Check if a pitch row belongs to the active scale guide
  const isRowInScale = (midi: number): boolean => {
    if (scaleFilter === 'all') return true;
    const noteInOctave = midi % 12;
    if (scaleFilter === 'minor') return [0, 2, 3, 5, 7, 8, 10].includes(noteInOctave); // C Minor
    if (scaleFilter === 'pentatonic') return [0, 3, 5, 7, 10].includes(noteInOctave); // C Minor Pentatonic
    if (scaleFilter === 'blues') return [0, 3, 5, 6, 7, 10].includes(noteInOctave); // C Blues
    return true;
  };

  // Click on empty grid cell to create a note
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>, midi: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const rawBeat = clickX / pixelsPerBeat;
    const snappedBeat = Math.floor(rawBeat / snapStep) * snapStep;

    // Check if a note already exists at this exact pitch & beat
    const existingIdx = notes.findIndex(
      (n) => n.midi === midi && Math.abs(n.startBeat - snappedBeat) < snapStep
    );

    if (existingIdx !== -1) {
      // Toggle delete
      setNotes((prev) => prev.filter((_, idx) => idx !== existingIdx));
      if (selectedNoteIndex === existingIdx) setSelectedNoteIndex(null);
    } else {
      // Add note
      auditionNote(midi);
      const newNote: NoteEvent = {
        midi,
        startBeat: snappedBeat,
        durationBeats: Math.max(snapStep, 0.5),
        velocity: 0.85,
      };
      setNotes((prev) => [...prev, newNote]);
      setSelectedNoteIndex(notes.length);
    }
  };

  // Dragging a note (Move or change pitch)
  const handleNoteMouseDown = (
    e: React.MouseEvent,
    index: number,
    isResizeHandle: boolean = false
  ) => {
    e.stopPropagation();
    setSelectedNoteIndex(index);

    const initialNote = notes[index];
    const startX = e.clientX;
    const startY = e.clientY;
    let lastAuditionedPitch = initialNote.midi;

    if (!isResizeHandle) {
      auditionNote(initialNote.midi);
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      if (isResizeHandle) {
        // Resizing duration
        const deltaBeats = deltaX / pixelsPerBeat;
        const newDur = Math.max(snapStep, Math.round((initialNote.durationBeats + deltaBeats) / snapStep) * snapStep);
        setNotes((prev) =>
          prev.map((n, i) => (i === index ? { ...n, durationBeats: newDur } : n))
        );
      } else {
        // Moving note horizontally (beat) and vertically (pitch)
        const deltaBeats = deltaX / pixelsPerBeat;
        const newStartBeat = Math.max(
          0,
          Math.min(totalPatternBeats - 0.25, Math.round((initialNote.startBeat + deltaBeats) / snapStep) * snapStep)
        );

        // Vertical pitch shift
        const deltaRows = Math.round(deltaY / rowHeight);
        const newPitch = Math.max(36, Math.min(72, initialNote.midi - deltaRows));

        if (newPitch !== lastAuditionedPitch) {
          auditionNote(newPitch);
          lastAuditionedPitch = newPitch;
        }

        setNotes((prev) =>
          prev.map((n, i) =>
            i === index ? { ...n, startBeat: newStartBeat, midi: newPitch } : n
          )
        );
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Transpose all notes up or down
  const transposeNotes = (semitones: number) => {
    setNotes((prev) =>
      prev.map((n) => ({
        ...n,
        midi: Math.max(36, Math.min(72, n.midi + semitones)),
      }))
    );
  };

  // Presets
  const loadMotifPreset = (presetName: string) => {
    if (presetName === 'assam') {
      // Dhwoni Assam Folk Hook
      setNotes([
        { midi: 69, startBeat: 0, durationBeats: 1.0, velocity: 0.9 }, // A4
        { midi: 71, startBeat: 1, durationBeats: 0.5, velocity: 0.85 }, // B4
        { midi: 72, startBeat: 1.5, durationBeats: 1.5, velocity: 0.95 }, // C5
        { midi: 74, startBeat: 3, durationBeats: 1.0, velocity: 0.9 }, // D5
        { midi: 76, startBeat: 4, durationBeats: 2.0, velocity: 0.95 }, // E5
        { midi: 74, startBeat: 6, durationBeats: 1.0, velocity: 0.85 }, // D5
        { midi: 72, startBeat: 7, durationBeats: 1.0, velocity: 0.9 }, // C5
      ]);
    } else if (presetName === 'chords') {
      // Neo-Soul / Jazz Chords
      setNotes([
        { midi: 57, startBeat: 0, durationBeats: 3.5, velocity: 0.8 }, // Am7
        { midi: 60, startBeat: 0, durationBeats: 3.5, velocity: 0.8 },
        { midi: 64, startBeat: 0, durationBeats: 3.5, velocity: 0.85 },
        { midi: 67, startBeat: 0, durationBeats: 3.5, velocity: 0.8 },

        { midi: 53, startBeat: 4, durationBeats: 3.5, velocity: 0.8 }, // Fmaj7
        { midi: 57, startBeat: 4, durationBeats: 3.5, velocity: 0.8 },
        { midi: 60, startBeat: 4, durationBeats: 3.5, velocity: 0.85 },
        { midi: 64, startBeat: 4, durationBeats: 3.5, velocity: 0.8 },
      ]);
    } else if (presetName === 'arp') {
      // Minor Pentatonic Arpeggio
      setNotes([
        { midi: 60, startBeat: 0, durationBeats: 0.5, velocity: 0.85 },
        { midi: 63, startBeat: 0.5, durationBeats: 0.5, velocity: 0.85 },
        { midi: 65, startBeat: 1.0, durationBeats: 0.5, velocity: 0.9 },
        { midi: 67, startBeat: 1.5, durationBeats: 0.5, velocity: 0.9 },
        { midi: 70, startBeat: 2.0, durationBeats: 0.5, velocity: 0.85 },
        { midi: 72, startBeat: 2.5, durationBeats: 1.5, velocity: 0.95 },
        { midi: 70, startBeat: 4.0, durationBeats: 0.5, velocity: 0.85 },
        { midi: 67, startBeat: 4.5, durationBeats: 0.5, velocity: 0.9 },
        { midi: 65, startBeat: 5.0, durationBeats: 0.5, velocity: 0.85 },
        { midi: 63, startBeat: 5.5, durationBeats: 0.5, velocity: 0.85 },
        { midi: 60, startBeat: 6.0, durationBeats: 2.0, velocity: 0.95 },
      ]);
    }
  };

  // Preview Playback loop
  const togglePreviewPlay = async () => {
    await engine.init();
    if (isPreviewPlaying) {
      setIsPreviewPlaying(false);
      if (previewTimerRef.current) cancelAnimationFrame(previewTimerRef.current);
      setPreviewBeat(0);
    } else {
      setIsPreviewPlaying(true);
      previewStartTime.current = performance.now();
      const secondsPerBeat = 60 / project.bpm;
      const totalPatternSeconds = totalPatternBeats * secondsPerBeat;

      // Play through all notes in sequence
      const schedulePreview = () => {
        const elapsedSec = (performance.now() - previewStartTime.current) / 1000;
        const currentPatternSec = elapsedSec % totalPatternSeconds;
        const currentBeatPos = (currentPatternSec / totalPatternSeconds) * totalPatternBeats;
        setPreviewBeat(currentBeatPos);

        // Check for notes starting at current time
        const prevBeatPos = ((elapsedSec - 0.05) % totalPatternSeconds) / totalPatternSeconds * totalPatternBeats;
        for (const n of notes) {
          if (n.startBeat >= prevBeatPos && n.startBeat < currentBeatPos) {
            auditionNote(n.midi);
          }
        }

        previewTimerRef.current = requestAnimationFrame(schedulePreview);
      };

      previewTimerRef.current = requestAnimationFrame(schedulePreview);
    }
  };

  // Render notes into an AudioBuffer and save to track as an AudioClip
  const handleSaveToTrack = async () => {
    if (!currentTrack || !engine.ctx) return;
    await engine.init();

    // Render notes into AudioBuffer
    const buffer = renderSynthSequenceToBuffer(
      engine.ctx,
      notes,
      project.bpm,
      synthSettings
    );
    const peaks = extractWaveformPeaks(buffer, 80);
    const durationBeats = Math.max(1, Math.ceil(buffer.duration / (60 / project.bpm)));

    const newClip: AudioClip = {
      id: `clip_midi_${Date.now()}`,
      trackId: currentTrack.id,
      name: `${currentTrack.name.replace(/[^\w\s]/gi, '').trim()} Melody (${notes.length} notes)`,
      startBeat: 0,
      durationBeats,
      buffer,
      waveformPeaks: peaks,
      color: currentTrack.color || '#dfb743',
      type: 'synth',
      notes: [...notes],
    };

    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) =>
        t.id === currentTrack.id
          ? {
              ...t,
              clips: [
                // Replace any existing clip or add new
                ...t.clips.filter((c) => c.startBeat !== 0),
                newClip,
              ],
            }
          : t
      ),
    }));

    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0a0a0a] text-neutral-200 select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="p-3 border-b border-neutral-800 bg-[#0e0e0e] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Track Target & Preset */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-neutral-400 text-[10px]">TARGET TRACK:</span>
          <select
            value={selectedTrackId}
            onChange={(e) => setSelectedTrackId(e.target.value)}
            className="bg-[#181818] border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-semibold focus:outline-none"
          >
            {project.tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.type})
              </option>
            ))}
          </select>

          {/* Preset Sound */}
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-neutral-800">
            <span className="font-mono text-neutral-400 text-[10px]">SOUND:</span>
            <select
              value={presetKey}
              onChange={(e) => {
                setPresetKey(e.target.value);
                setSynthSettings(SYNTH_PRESETS[e.target.value] || SYNTH_PRESETS.vintageKeys);
              }}
              className="bg-[#181818] border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:outline-none"
            >
              <option value="vintageKeys">Vintage Keys</option>
              <option value="pluckLead">Pluck Lead</option>
              <option value="subBass">808 Sub Bass</option>
              <option value="analogPad">Analog Warm Pad</option>
            </select>
          </div>
        </div>

        {/* Center: Play, Snap, Length, Scale Guide */}
        <div className="flex items-center gap-2">
          {/* Play/Stop Preview Button */}
          <button
            onClick={togglePreviewPlay}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition active:scale-95 shadow ${
              isPreviewPlaying
                ? 'bg-amber-400 text-black ring-2 ring-amber-400/50'
                : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
            }`}
          >
            {isPreviewPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPreviewPlaying ? 'Stop' : 'Preview'}</span>
          </button>

          {/* Snap */}
          <div className="flex items-center gap-1 bg-[#161616] border border-neutral-800 rounded-lg px-2 py-0.5">
            <span className="text-[10px] text-neutral-400 font-mono">SNAP:</span>
            <select
              value={snap}
              onChange={(e) => setSnap(e.target.value as any)}
              className="bg-transparent text-amber-400 font-mono font-bold focus:outline-none cursor-pointer"
            >
              <option value="1/4" className="bg-neutral-900">1/4</option>
              <option value="1/8" className="bg-neutral-900">1/8</option>
              <option value="1/16" className="bg-neutral-900">1/16</option>
            </select>
          </div>

          {/* Scale Guide */}
          <div className="flex items-center gap-1 bg-[#161616] border border-neutral-800 rounded-lg px-2 py-0.5">
            <span className="text-[10px] text-neutral-400 font-mono">SCALE:</span>
            <select
              value={scaleFilter}
              onChange={(e) => setScaleFilter(e.target.value as any)}
              className="bg-transparent text-amber-400 font-mono font-semibold focus:outline-none cursor-pointer"
            >
              <option value="pentatonic" className="bg-neutral-900">Minor Pentatonic</option>
              <option value="minor" className="bg-neutral-900">Natural Minor</option>
              <option value="blues" className="bg-neutral-900">Blues</option>
              <option value="all" className="bg-neutral-900">All (Chromatic)</option>
            </select>
          </div>
        </div>

        {/* Right: Presets, Transpose, and Save to Track Button */}
        <div className="flex items-center gap-2">
          {/* Quick Motifs */}
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => loadMotifPreset('assam')}
              className="px-2 py-0.5 text-[11px] font-semibold text-amber-300 hover:text-white rounded hover:bg-neutral-800 transition"
              title="Assam Melodic Hook Motif"
            >
              Assam Hook
            </button>
            <button
              onClick={() => loadMotifPreset('chords')}
              className="px-2 py-0.5 text-[11px] text-neutral-300 hover:text-white rounded hover:bg-neutral-800 transition"
              title="Smooth Chords"
            >
              Chords
            </button>
            <button
              onClick={() => loadMotifPreset('arp')}
              className="px-2 py-0.5 text-[11px] text-neutral-300 hover:text-white rounded hover:bg-neutral-800 transition"
              title="Arpeggio"
            >
              Arp
            </button>
          </div>

          {/* Transpose */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => transposeNotes(-12)}
              title="Transpose Octave Down (-12 semitones)"
              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
            >
              -8ve
            </button>
            <button
              onClick={() => transposeNotes(12)}
              title="Transpose Octave Up (+12 semitones)"
              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
            >
              +8ve
            </button>
            <button
              onClick={() => setNotes([])}
              title="Clear All Notes"
              className="p-1 rounded hover:bg-red-950/40 text-neutral-400 hover:text-red-400 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Save to Track Clip Button */}
          <button
            onClick={handleSaveToTrack}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition active:scale-95 shadow ${
              savedNotice
                ? 'bg-emerald-500 text-black'
                : 'bg-[#dfb743] hover:bg-[#edd482] text-neutral-950'
            }`}
          >
            {savedNotice ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedNotice ? 'Saved to Track!' : 'Render to Track'}</span>
          </button>
        </div>
      </div>

      {/* Main Piano Roll Workspace (Left: Vertical Keys, Right: Grid Canvas) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Vertical Piano Keys */}
        <div className="w-24 shrink-0 bg-[#111111] border-r border-neutral-800 flex flex-col z-20 overflow-y-hidden select-none">
          {/* Header align spacer */}
          <div className="h-7 border-b border-neutral-800 bg-[#161616] px-2 flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>KEY</span>
            <span>MIDI</span>
          </div>

          <div
            className="flex-1 overflow-y-auto"
            id="pianoRollKeysScroll"
            style={{ height: 'calc(100% - 28px)' }}
          >
            {PITCH_ROWS.map((row) => {
              const isMiddleC = row.midi === 60;
              const inScale = isRowInScale(row.midi);

              return (
                <div
                  key={row.midi}
                  onClick={() => auditionNote(row.midi)}
                  style={{ height: `${rowHeight}px` }}
                  className={`flex items-center justify-between px-2 cursor-pointer border-b transition-colors ${
                    row.isBlack
                      ? 'bg-[#181818] border-neutral-900 text-neutral-400 hover:bg-[#252525]'
                      : 'bg-[#222222] border-neutral-800 text-neutral-200 hover:bg-[#303030]'
                  } ${isMiddleC ? 'ring-1 ring-amber-400/70 font-bold text-amber-300' : ''}`}
                >
                  <span className={`text-[10px] font-mono ${isMiddleC ? 'text-amber-400 font-bold' : ''}`}>
                    {row.label}
                  </span>
                  <div className="flex items-center gap-1">
                    {inScale && <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />}
                    <span className="text-[9px] font-mono opacity-50">{row.midi}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Area: Grid & Beat Timeline */}
        <div
          className="flex-1 flex flex-col overflow-x-auto overflow-y-auto relative bg-[#090909]"
          id="pianoRollGridScroll"
          onScroll={(e) => {
            // Sync vertical scroll with piano keys
            const keysEl = document.getElementById('pianoRollKeysScroll');
            if (keysEl) keysEl.scrollTop = e.currentTarget.scrollTop;
          }}
        >
          {/* Beat Ruler (Sticky Top) */}
          <div
            className="h-7 border-b border-neutral-800 bg-[#131313] sticky top-0 z-10 flex relative select-none"
            style={{ width: `${totalPatternBeats * pixelsPerBeat}px` }}
          >
            {Array.from({ length: Math.ceil(totalPatternBeats / 4) }).map((_, barIdx) => (
              <div
                key={barIdx}
                className="h-full border-r border-neutral-800 flex items-center px-2 text-[10px] font-mono text-neutral-400 relative"
                style={{ width: `${4 * pixelsPerBeat}px` }}
              >
                <span className="font-bold text-amber-400">BAR {barIdx + 1}</span>
                {/* 1/4 beat sub ticks */}
                <div
                  className="absolute bottom-0 h-2 border-r border-neutral-800"
                  style={{ left: `${pixelsPerBeat}px` }}
                />
                <div
                  className="absolute bottom-0 h-3 border-r border-neutral-700"
                  style={{ left: `${2 * pixelsPerBeat}px` }}
                />
                <div
                  className="absolute bottom-0 h-2 border-r border-neutral-800"
                  style={{ left: `${3 * pixelsPerBeat}px` }}
                />
              </div>
            ))}
          </div>

          {/* Grid Rows Container */}
          <div
            className="relative flex flex-col"
            style={{
              width: `${totalPatternBeats * pixelsPerBeat}px`,
              height: `${PITCH_ROWS.length * rowHeight}px`,
            }}
          >
            {/* Background Pitch Rows */}
            {PITCH_ROWS.map((row) => {
              const inScale = isRowInScale(row.midi);

              return (
                <div
                  key={row.midi}
                  onClick={(e) => handleGridClick(e, row.midi)}
                  style={{ height: `${rowHeight}px` }}
                  className={`w-full border-b flex relative cursor-crosshair transition-colors ${
                    row.isBlack
                      ? 'bg-[#0a0a0a] border-neutral-900/80 hover:bg-[#121212]'
                      : 'bg-[#101010] border-neutral-800/80 hover:bg-[#161616]'
                  } ${!inScale ? 'opacity-40' : ''}`}
                >
                  {/* Vertical Beat Columns */}
                  {Array.from({ length: totalPatternBeats }).map((_, bIdx) => (
                    <div
                      key={bIdx}
                      className="h-full border-r border-neutral-800/40 relative"
                      style={{ width: `${pixelsPerBeat}px` }}
                    >
                      {/* Sub-grid 1/16 or 1/8 markers */}
                      <div
                        className="absolute inset-y-0 border-r border-neutral-900/60"
                        style={{ left: '50%' }}
                      />
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Playhead Scrubber Line when previewing */}
            {isPreviewPlaying && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-30 pointer-events-none shadow-[0_0_10px_rgba(245,158,11,0.9)]"
                style={{ left: `${previewBeat * pixelsPerBeat}px` }}
              >
                <div className="w-2.5 h-2.5 bg-amber-400 rotate-45 -ml-1 -mt-1 shadow" />
              </div>
            )}

            {/* Rendered Interactive Note Blocks */}
            {notes.map((note, idx) => {
              // Find vertical row index
              const rowIndex = PITCH_ROWS.findIndex((r) => r.midi === note.midi);
              if (rowIndex === -1) return null;

              const top = rowIndex * rowHeight + 2;
              const left = note.startBeat * pixelsPerBeat;
              const width = Math.max(12, note.durationBeats * pixelsPerBeat);
              const isSelected = selectedNoteIndex === idx;

              return (
                <div
                  key={idx}
                  onMouseDown={(e) => handleNoteMouseDown(e, idx, false)}
                  style={{
                    top: `${top}px`,
                    left: `${left}px`,
                    width: `${width}px`,
                    height: `${rowHeight - 4}px`,
                  }}
                  className={`absolute rounded-md flex items-center justify-between px-1.5 cursor-move shadow-md overflow-hidden select-none transition-shadow z-20 ${
                    isSelected
                      ? 'bg-amber-400 text-neutral-950 ring-2 ring-white shadow-lg'
                      : 'bg-[#dfb743] hover:bg-[#f3cf65] text-neutral-900'
                  }`}
                >
                  {/* Note Label */}
                  <span className="text-[10px] font-mono font-bold truncate">
                    {NOTE_NAMES[note.midi % 12]}
                  </span>

                  {/* Resize Handle on Right Edge */}
                  <div
                    onMouseDown={(e) => handleNoteMouseDown(e, idx, true)}
                    className="w-2 h-full cursor-ew-resize hover:bg-black/20 -mr-1.5 flex items-center justify-center shrink-0"
                    title="Drag to adjust note duration"
                  >
                    <div className="w-0.5 h-3 bg-black/40 rounded-full" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Status / Instructions Bar */}
      <div className="px-4 py-2 border-t border-neutral-800 bg-[#0e0e0e] flex items-center justify-between text-[11px] font-mono text-neutral-400">
        <div className="flex items-center gap-3">
          <span>{notes.length} MIDI Notes Placed</span>
          <span>•</span>
          <span className="text-amber-400/80">Click grid to place • Drag note to move • Drag right edge to resize</span>
        </div>

        <div className="flex items-center gap-2">
          <span>Target: {currentTrack?.name}</span>
        </div>
      </div>
    </div>
  );
};
