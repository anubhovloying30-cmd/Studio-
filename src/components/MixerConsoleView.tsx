import React, { useEffect, useState } from 'react';
import { Sliders, Volume2, ShieldAlert } from 'lucide-react';
import { Project, Track } from '../types/studio';
import { AudioEngine } from '../audio/audioEngine';

interface MixerConsoleViewProps {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  engine: AudioEngine;
  onOpenTrackFx: (track: Track) => void;
}

export const MixerConsoleView: React.FC<MixerConsoleViewProps> = ({
  project,
  setProject,
  engine,
  onOpenTrackFx,
}) => {
  const [trackPeaks, setTrackPeaks] = useState<Record<string, number>>({});
  const [masterPeak, setMasterPeak] = useState<number>(0);
  const [masterVolume, setMasterVolume] = useState<number>(0.85);

  // Meter loop
  useEffect(() => {
    let animId: number;
    const updateMeters = () => {
      const peaks: Record<string, number> = {};
      project.tracks.forEach((t) => {
        peaks[t.id] = engine.isPlaying ? engine.getTrackLevel(t.id) : 0;
      });
      setTrackPeaks(peaks);
      setMasterPeak(engine.isPlaying ? engine.getMasterLevel() : 0);
      animId = requestAnimationFrame(updateMeters);
    };
    animId = requestAnimationFrame(updateMeters);
    return () => cancelAnimationFrame(animId);
  }, [engine, project.tracks]);

  // Volume change
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

  // Pan change
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

  // Toggle Mute
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

  // Toggle Solo
  const toggleSolo = (trackId: string) => {
    setProject((prev) => {
      const target = prev.tracks.find((t) => t.id === trackId);
      const newSolo = !target?.solo;
      const updated = {
        ...prev,
        tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, solo: newSolo } : t)),
      };
      updated.tracks.forEach((t) => engine.updateTrackParams(t));
      return updated;
    });
  };

  const handleMasterVolChange = (val: number) => {
    setMasterVolume(val);
    if (engine.masterGain && engine.ctx) {
      engine.masterGain.gain.setValueAtTime(val, engine.ctx.currentTime);
    }
  };

  return (
    <div className="flex flex-1 h-full bg-[#0a0a0a] text-neutral-200 overflow-x-auto p-4 gap-3 select-none">
      {/* Track Channel Strips */}
      <div className="flex gap-3 flex-1">
        {project.tracks.map((track) => {
          const peak = trackPeaks[track.id] || 0;
          const isClipping = peak >= 0.95;

          return (
            <div
              key={track.id}
              className="w-36 shrink-0 bg-[#121212] border border-neutral-800 rounded-xl flex flex-col justify-between p-3 relative shadow-lg"
            >
              {/* Color Top Border */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl"
                style={{ backgroundColor: track.color }}
              />

              {/* Channel Header */}
              <div className="flex flex-col items-center gap-1 mt-1 border-b border-neutral-800/80 pb-2">
                <span className="text-base">{track.type === 'audio' ? '🎙️' : track.type === 'synth' ? '🎹' : '🥁'}</span>
                <span className="text-xs font-bold text-center truncate w-full text-neutral-200">
                  {track.name}
                </span>

                {/* DSP Rack Quick Launch */}
                <button
                  onClick={() => onOpenTrackFx(track)}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-400 mt-1 border border-neutral-700 transition"
                >
                  <Sliders className="w-3 h-3" />
                  <span>DSP FX</span>
                </button>
              </div>

              {/* Rotary Pan Dial */}
              <div className="flex flex-col items-center gap-1 my-2">
                <span className="text-[9px] font-mono text-neutral-400">
                  PAN: {track.pan < 0 ? `${Math.round(-track.pan * 100)}%L` : track.pan > 0 ? `${Math.round(track.pan * 100)}%R` : 'C'}
                </span>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.05"
                  value={track.pan}
                  onChange={(e) => handlePanChange(track.id, parseFloat(e.target.value))}
                  className="w-20 h-1 cursor-pointer"
                />
              </div>

              {/* Vertical Fader & VU Meter Section */}
              <div className="flex-1 flex justify-center items-center gap-3 my-2 min-h-[160px]">
                {/* dB Scale */}
                <div className="flex flex-col justify-between h-36 text-[9px] font-mono text-neutral-400">
                  <span>+6</span>
                  <span>0</span>
                  <span>-6</span>
                  <span>-18</span>
                  <span>-inf</span>
                </div>

                {/* Vertical Slider Fader */}
                <div className="relative h-36 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1.2"
                    step="0.01"
                    value={track.volume}
                    onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                    className="h-32 w-1.5 cursor-pointer appearance-none bg-neutral-800 rounded -rotate-90 origin-center"
                    style={{ width: '130px' }}
                  />
                </div>

                {/* LED Segmented Peak Meter */}
                <div className="w-3.5 h-36 bg-black border border-neutral-800 rounded p-0.5 flex flex-col justify-end overflow-hidden relative">
                  <div
                    className={`w-full transition-all duration-75 rounded-sm ${
                      isClipping ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : peak > 0.6 ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ height: `${Math.min(100, peak * 100)}%` }}
                  />
                </div>
              </div>

              {/* Bottom Readout & Mute/Solo */}
              <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800/80">
                <span className="text-[10px] font-mono font-bold text-center text-amber-400">
                  {Math.round(track.volume * 100)}%
                </span>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => toggleMute(track.id)}
                    className={`py-1 text-xs font-bold rounded font-mono transition ${
                      track.muted
                        ? 'bg-amber-500 text-black shadow'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    MUTE
                  </button>
                  <button
                    onClick={() => toggleSolo(track.id)}
                    className={`py-1 text-xs font-bold rounded font-mono transition ${
                      track.solo
                        ? 'bg-emerald-500 text-black shadow'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    SOLO
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Master Bus Channel Strip (Fixed Right) */}
      <div className="w-44 shrink-0 bg-[#161616] border-2 border-amber-500/40 rounded-xl flex flex-col justify-between p-3 relative shadow-2xl">
        {/* Master Header */}
        <div className="flex flex-col items-center gap-1 border-b border-neutral-800 pb-2">
          <span className="text-xs font-bold font-serif tracking-wider text-amber-400">
            MASTER OUT
          </span>
          <span className="text-[10px] font-mono text-neutral-400">Limiter Active</span>
        </div>

        {/* Master Vertical Faders & Stereo Meter */}
        <div className="flex-1 flex justify-center items-center gap-4 my-2 min-h-[160px]">
          {/* dB Scale */}
          <div className="flex flex-col justify-between h-40 text-[9px] font-mono text-neutral-400">
            <span>+6</span>
            <span>0</span>
            <span>-6</span>
            <span>-18</span>
            <span>-inf</span>
          </div>

          {/* Master Fader */}
          <div className="relative h-40 flex items-center">
            <input
              type="range"
              min="0"
              max="1.2"
              step="0.01"
              value={masterVolume}
              onChange={(e) => handleMasterVolChange(parseFloat(e.target.value))}
              className="h-36 w-2 cursor-pointer appearance-none bg-neutral-800 rounded -rotate-90 origin-center"
              style={{ width: '140px' }}
            />
          </div>

          {/* Master Stereo Peak LED Meter */}
          <div className="w-4 h-40 bg-black border border-neutral-800 rounded p-0.5 flex flex-col justify-end overflow-hidden relative">
            <div
              className={`w-full transition-all duration-75 rounded-sm ${
                masterPeak > 0.85 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : masterPeak > 0.6 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{ height: `${Math.min(100, masterPeak * 100)}%` }}
            />
          </div>
        </div>

        {/* Master Volume Label & Output Spec */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-800">
          <span className="text-xs font-mono font-bold text-center text-amber-300">
            {Math.round(masterVolume * 100)}%
          </span>
          <div className="bg-black/40 rounded p-1 text-[9px] font-mono text-neutral-400 text-center leading-tight">
            <span>Dhwoni Bus</span>
            <br />
            <span>24-bit Soft Clip</span>
          </div>
        </div>
      </div>
    </div>
  );
};
