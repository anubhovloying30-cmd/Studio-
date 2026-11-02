import React, { useRef, useState } from 'react';
import {
  Sliders,
  Plus,
  Volume2,
  Trash2,
  Copy,
  Upload,
  Mic,
  Maximize2,
  Music,
} from 'lucide-react';
import { AudioClip, Project, Track } from '../types/studio';
import { AudioEngine } from '../audio/audioEngine';

interface TimelineViewProps {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  engine: AudioEngine;
  currentBeat: number;
  onSeek: (beat: number) => void;
  onOpenTrackFx: (track: Track) => void;
  onOpenMicModal: () => void;
  onOpenPianoRoll?: (trackId?: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  project,
  setProject,
  engine,
  currentBeat,
  onSeek,
  onOpenTrackFx,
  onOpenMicModal,
  onOpenPianoRoll,
}) => {
  const [zoom, setZoom] = useState(36); // Pixels per beat
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importTrackId, setImportTrackId] = useState<string | null>(null);

  // Total bars to display
  const totalBars = Math.max(8, Math.ceil(project.totalBeats / 4) + 2);
  const totalBeats = totalBars * 4;

  // Track volume change
  const handleVolumeChange = (trackId: string, val: number) => {
    setProject((prev) => {
      const updated = {
        ...prev,
        tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, volume: val } : t)),
      };
      const tr = updated.tracks.find((t) => t.id === trackId);
      if (tr) engine.updateTrackParams(tr);
      return updated;
    });
  };

  // Track pan change
  const handlePanChange = (trackId: string, val: number) => {
    setProject((prev) => {
      const updated = {
        ...prev,
        tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, pan: val } : t)),
      };
      const tr = updated.tracks.find((t) => t.id === trackId);
      if (tr) engine.updateTrackParams(tr);
      return updated;
    });
  };

  // Track mute toggle
  const toggleMute = (trackId: string) => {
    setProject((prev) => {
      const updated = {
        ...prev,
        tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t)),
      };
      const tr = updated.tracks.find((t) => t.id === trackId);
      if (tr) engine.updateTrackParams(tr);
      return updated;
    });
  };

  // Track solo toggle
  const toggleSolo = (trackId: string) => {
    setProject((prev) => {
      const target = prev.tracks.find((t) => t.id === trackId);
      const newSolo = !target?.solo;
      const updated = {
        ...prev,
        tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, solo: newSolo } : t)),
      };
      // update all track nodes
      updated.tracks.forEach((t) => engine.updateTrackParams(t));
      return updated;
    });
  };

  // Track arm toggle
  const toggleArm = (trackId: string) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => ({
        ...t,
        armed: t.id === trackId ? !t.armed : false, // arm exclusively
      })),
    }));
  };

  // Add new track
  const handleAddTrack = (type: 'audio' | 'synth' | 'drums') => {
    const newTrack: Track = {
      id: `track_${Date.now()}`,
      name:
        type === 'audio'
          ? `Audio Vocal ${project.tracks.length + 1} 🎙️`
          : type === 'synth'
          ? `Synth Lead ${project.tracks.length + 1} 🎹`
          : `Beat Machine ${project.tracks.length + 1} 🥁`,
      type,
      color:
        type === 'audio'
          ? '#ef4444'
          : type === 'synth'
          ? '#8b5cf6'
          : '#10b981',
      volume: 0.85,
      pan: 0,
      muted: false,
      solo: false,
      armed: type === 'audio',
      fx: {
        eq: { low: 0, mid: 0, high: 0 },
        delay: { enabled: false, time: 0.25, feedback: 0.3, mix: 0 },
        reverb: { enabled: false, decay: 1.5, mix: 0 },
        distortion: { enabled: false, drive: 10, mix: 0 },
      },
      clips: [],
    };

    setProject((prev) => ({
      ...prev,
      tracks: [...prev.tracks, newTrack],
    }));
    engine.setupTrackNodes(newTrack);
  };

  // Duplicate track
  const handleDuplicateTrack = (trackId: string) => {
    const tr = project.tracks.find((t) => t.id === trackId);
    if (!tr) return;

    const dupTrack: Track = {
      ...tr,
      id: `track_${Date.now()}`,
      name: `${tr.name} (Copy)`,
      clips: tr.clips.map((c) => ({
        ...c,
        id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      })),
    };

    setProject((prev) => ({
      ...prev,
      tracks: [...prev.tracks, dupTrack],
    }));
    engine.setupTrackNodes(dupTrack);
  };

  // Delete track
  const handleDeleteTrack = (trackId: string) => {
    if (project.tracks.length <= 1) return;
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((t) => t.id !== trackId),
    }));
  };

  // Delete audio clip
  const handleDeleteClip = (trackId: string, clipId: string) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) =>
        t.id === trackId
          ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
          : t
      ),
    }));
    if (selectedClipId === clipId) setSelectedClipId(null);
  };

  // Trigger file upload for track
  const handleTriggerUpload = (trackId: string) => {
    setImportTrackId(trackId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle uploaded audio file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importTrackId) return;

    try {
      const clip = await engine.loadAudioFile(file, importTrackId, Math.floor(currentBeat));
      setProject((prev) => ({
        ...prev,
        tracks: prev.tracks.map((t) =>
          t.id === importTrackId ? { ...t, clips: [...t.clips, clip] } : t
        ),
      }));
    } catch (err) {
      alert('Failed to load audio file: ' + err);
    }
  };

  // Seek on ruler click
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const beat = Math.max(0, clickX / zoom);
    onSeek(Math.round(beat * 4) / 4);
  };

  // Handle clip dragging
  const handleClipMouseDown = (
    e: React.MouseEvent,
    trackId: string,
    clip: AudioClip
  ) => {
    e.stopPropagation();
    setSelectedClipId(clip.id);

    const startX = e.clientX;
    const initialStartBeat = clip.startBeat;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaBeats = deltaX / zoom;
      const snapStep = project.snap === '1/16' ? 0.25 : project.snap === '1/8' ? 0.5 : 1.0;
      const rawNewBeat = Math.max(0, initialStartBeat + deltaBeats);
      const snappedBeat = Math.round(rawNewBeat / snapStep) * snapStep;

      setProject((prev) => ({
        ...prev,
        tracks: prev.tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                clips: t.clips.map((c) =>
                  c.id === clip.id ? { ...c, startBeat: snappedBeat } : c
                ),
              }
            : t
        ),
      }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0a0a0a] text-neutral-200 select-none overflow-hidden">
      {/* Hidden File Input for Audio File Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Timeline Controls Header (Zoom, Snap, Track Action) */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-900/60 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-neutral-300">Arrangement Tracks</span>
          <div className="flex items-center gap-1.5 bg-neutral-800/80 rounded px-2 py-0.5 border border-neutral-700/60">
            <span className="text-[10px] text-neutral-400 font-mono">SNAP</span>
            <select
              value={project.snap}
              onChange={(e) =>
                setProject((prev) => ({
                  ...prev,
                  snap: e.target.value as '1/4' | '1/8' | '1/16' | 'off',
                }))
              }
              className="bg-transparent text-amber-400 font-mono font-bold focus:outline-none cursor-pointer"
            >
              <option value="1/4" className="bg-neutral-900 text-white">1/4 Beat</option>
              <option value="1/8" className="bg-neutral-900 text-white">1/8 Beat</option>
              <option value="1/16" className="bg-neutral-900 text-white">1/16 Beat</option>
              <option value="off" className="bg-neutral-900 text-white">Off</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <span className="text-[10px] text-neutral-400 font-mono">ZOOM</span>
          <input
            type="range"
            min="20"
            max="80"
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value))}
            className="w-20 h-1 cursor-pointer"
          />

          {/* Add Track Dropdown */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleAddTrack('audio')}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold border border-amber-500/30 text-xs transition active:scale-95"
            >
              <Plus className="w-3 h-3" />
              <span>Vocal Track</span>
            </button>
            <button
              onClick={() => handleAddTrack('synth')}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 text-neutral-200 hover:bg-neutral-700 text-xs transition"
            >
              <Plus className="w-3 h-3" />
              <span>Synth</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Multi-Track Scroll Container */}
      <div className="flex flex-1 overflow-x-auto overflow-y-auto relative">
        {/* Track Headers Column (Fixed on Left) */}
        <div className="w-60 sm:w-72 shrink-0 border-r border-neutral-800 bg-[#0f0f0f] z-20 flex flex-col">
          {/* Header Spacer aligning with Beat Ruler */}
          <div className="h-8 border-b border-neutral-800 bg-neutral-900/80 px-3 flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>TRACK / CHANNEL</span>
            <div className="flex items-center gap-2">
              <span>VOL</span>
              <span>PAN</span>
            </div>
          </div>

          {/* Track Channel Strips */}
          <div className="flex flex-col">
            {project.tracks.map((track) => (
              <div
                key={track.id}
                className="h-28 border-b border-neutral-800/80 px-3 py-2 flex flex-col justify-between bg-neutral-900/30 hover:bg-neutral-900/60 transition group relative"
              >
                {/* Color Strip on Left Edge */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{ backgroundColor: track.color }}
                />

                {/* Top Row: Track Name & Quick Tools */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 pl-1.5 truncate">
                    <span className="text-xs">{track.type === 'audio' ? '🎙️' : track.type === 'synth' ? '🎹' : '🥁'}</span>
                    <input
                      type="text"
                      value={track.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setProject((prev) => ({
                          ...prev,
                          tracks: prev.tracks.map((t) =>
                            t.id === track.id ? { ...t, name: newName } : t
                          ),
                        }));
                      }}
                      className="bg-transparent text-xs font-semibold text-neutral-200 focus:outline-none focus:text-amber-400 truncate w-28 sm:w-36"
                    />
                  </div>

                  {/* Actions: Piano Roll, FX, Duplicate, Delete */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    {track.type === 'synth' && (
                      <button
                        onClick={() => onOpenPianoRoll?.(track.id)}
                        title="Open Piano Roll MIDI Editor"
                        className="p-1 rounded text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition"
                      >
                        <Music className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onOpenTrackFx(track)}
                      title="Open DSP FX Rack (EQ, Delay, Reverb)"
                      className="p-1 rounded text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleTriggerUpload(track.id)}
                      title="Import Audio File into Track"
                      className="p-1 rounded text-neutral-400 hover:text-cyan-400 hover:bg-neutral-800 transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDuplicateTrack(track.id)}
                      title="Duplicate Track"
                      className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {project.tracks.length > 1 && (
                      <button
                        onClick={() => handleDeleteTrack(track.id)}
                        title="Delete Track"
                        className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Middle Row: Volume Slider & Pan Slider */}
                <div className="flex items-center gap-2 pl-1.5 text-[10px] font-mono text-neutral-400">
                  <div className="flex items-center gap-1 flex-1">
                    <Volume2 className="w-3 h-3 text-neutral-400" />
                    <input
                      type="range"
                      min="0"
                      max="1.2"
                      step="0.01"
                      value={track.volume}
                      onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                      className="w-full h-1 cursor-pointer"
                      title={`Volume: ${Math.round(track.volume * 100)}%`}
                    />
                    <span className="w-7 text-right tabular-nums">{Math.round(track.volume * 100)}%</span>
                  </div>

                  <div className="flex items-center gap-1 w-20">
                    <span>PAN</span>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={track.pan}
                      onChange={(e) => handlePanChange(track.id, parseFloat(e.target.value))}
                      className="w-full h-1 cursor-pointer"
                      title={`Pan: ${track.pan < 0 ? `${Math.round(-track.pan * 100)}%L` : track.pan > 0 ? `${Math.round(track.pan * 100)}%R` : 'Center'}`}
                    />
                  </div>
                </div>

                {/* Bottom Row: Mute, Solo, Arm Buttons */}
                <div className="flex items-center gap-1.5 pl-1.5">
                  <button
                    onClick={() => toggleMute(track.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition font-mono ${
                      track.muted
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => toggleSolo(track.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition font-mono ${
                      track.solo
                        ? 'bg-emerald-500 text-black shadow-sm'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    S
                  </button>
                  <button
                    onClick={() => toggleArm(track.id)}
                    title={track.armed ? 'Armed for Recording' : 'Arm Track for Mic Recording'}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition font-mono ${
                      track.armed
                        ? 'bg-red-500 text-white animate-pulse shadow-sm'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    REC
                  </button>
                  {track.armed && (
                    <button
                      onClick={onOpenMicModal}
                      className="text-[10px] text-red-400 underline ml-auto hover:text-red-300 font-medium"
                    >
                      Record Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Lane Grid Area */}
        <div
          className="flex-1 relative flex flex-col"
          style={{ width: `${totalBeats * zoom}px`, minWidth: '100%' }}
        >
          {/* Beat Ruler */}
          <div
            onClick={handleRulerClick}
            className="h-8 border-b border-neutral-800 bg-[#0d0d0d] sticky top-0 z-10 cursor-pointer relative flex"
          >
            {Array.from({ length: totalBars }).map((_, barIdx) => (
              <div
                key={barIdx}
                className="h-full border-r border-neutral-800/80 flex items-center px-1 text-[11px] font-mono text-neutral-400 select-none relative"
                style={{ width: `${4 * zoom}px` }}
              >
                <span className="font-bold text-neutral-300">{barIdx + 1}</span>
                {/* 1/4 beat sub tick marks */}
                <div
                  className="absolute bottom-0 h-2 border-r border-neutral-800"
                  style={{ left: `${zoom}px` }}
                />
                <div
                  className="absolute bottom-0 h-3 border-r border-neutral-700"
                  style={{ left: `${2 * zoom}px` }}
                />
                <div
                  className="absolute bottom-0 h-2 border-r border-neutral-800"
                  style={{ left: `${3 * zoom}px` }}
                />
              </div>
            ))}

            {/* Loop Bracket Region Overlay */}
            {project.loopEnabled && (
              <div
                className="absolute top-0 bottom-0 bg-amber-500/10 border-b-2 border-amber-400 pointer-events-none"
                style={{
                  left: `${project.loopStartBeat * zoom}px`,
                  width: `${(project.loopEndBeat - project.loopStartBeat) * zoom}px`,
                }}
              />
            )}
          </div>

          {/* Timeline Playhead Needle (Runs through all tracks) */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-30 pointer-events-none shadow-[0_0_8px_rgba(245,158,11,0.8)]"
            style={{
              left: `${currentBeat * zoom}px`,
              transition: engine.isPlaying ? 'none' : 'left 0.1s ease-out',
            }}
          >
            <div className="w-3 h-3 bg-amber-400 rotate-45 -ml-[5px] -mt-1.5 shadow" />
          </div>

          {/* Track Lanes with Audio Clips */}
          <div className="flex flex-col relative">
            {project.tracks.map((track) => (
              <div
                key={track.id}
                className="h-28 border-b border-neutral-800/60 relative bg-[#0b0b0b]/40 hover:bg-[#111111]/30 transition"
              >
                {/* Background Beat Grid Lines */}
                <div className="absolute inset-0 pointer-events-none flex">
                  {Array.from({ length: totalBars }).map((_, barIdx) => (
                    <div
                      key={barIdx}
                      className="h-full border-r border-neutral-900"
                      style={{ width: `${4 * zoom}px` }}
                    />
                  ))}
                </div>

                {/* Audio Clips inside this track */}
                {track.clips.map((clip) => {
                  const clipWidth = clip.durationBeats * zoom;
                  const clipLeft = clip.startBeat * zoom;
                  const isSelected = selectedClipId === clip.id;

                  return (
                    <div
                      key={clip.id}
                      onMouseDown={(e) => handleClipMouseDown(e, track.id, clip)}
                      onDoubleClick={() => onOpenPianoRoll?.(track.id)}
                      title="Drag to move • Double-click to edit notes in Piano Roll"
                      style={{
                        left: `${clipLeft}px`,
                        width: `${clipWidth}px`,
                      }}
                      className={`absolute top-2 bottom-2 rounded-lg border overflow-hidden cursor-move transition-shadow ${
                        isSelected
                          ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      {/* Clip Background with Track Color */}
                      <div
                        className="absolute inset-0 opacity-80"
                        style={{
                          backgroundColor: clip.color || track.color,
                        }}
                      />

                      {/* Header bar on clip */}
                      <div className="relative z-10 px-2 py-0.5 bg-black/40 flex items-center justify-between text-[10px] font-semibold text-white">
                        <span className="truncate">{clip.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClip(track.id, clip.id);
                          }}
                          className="text-white/60 hover:text-white ml-1 p-0.5 hover:bg-black/40 rounded"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Waveform Visualization Canvas */}
                      <div className="relative z-10 h-14 flex items-center justify-between px-2 gap-0.5">
                        {clip.waveformPeaks.map((peak, idx) => (
                          <div
                            key={idx}
                            className="w-1 bg-white/90 rounded-full"
                            style={{
                              height: `${Math.max(4, peak * 48)}px`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Empty Track Placeholder Prompt */}
                {track.clips.length === 0 && track.type !== 'drums' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-neutral-600 text-xs gap-2">
                    <Music className="w-4 h-4 opacity-40" />
                    <span>Arm track to record vocals, or import an audio file</span>
                  </div>
                )}
                {track.type === 'drums' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-neutral-600 text-xs gap-2">
                    <span>Active MPC Step Pattern Playing in Sync</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
