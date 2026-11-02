import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  Mic,
  Download,
  Smartphone,
  Monitor,
  Code2,
  Volume2,
  FolderOpen,
} from 'lucide-react';
import { DhwoniLogo } from './DhwoniLogo';
import { AudioEngine } from '../audio/audioEngine';
import { Project } from '../types/studio';

interface TopTransportBarProps {
  project: Project;
  engine: AudioEngine;
  currentBeat: number;
  activeView: 'timeline' | 'drums' | 'synth' | 'pianoroll' | 'mixer' | 'android';
  setActiveView: (view: 'timeline' | 'drums' | 'synth' | 'pianoroll' | 'mixer' | 'android') => void;
  isPhoneFrame: boolean;
  setIsPhoneFrame: (val: boolean) => void;
  onOpenMicModal: () => void;
  onOpenFxModal: () => void;
  onOpenStudioInfo: () => void;
  onOpenApkModal: () => void;
  onExportWav: () => void;
  onLoadDemo: (type: 'trap' | 'lofi' | 'assam') => void;
  onSeek: (beat: number) => void;
  isExporting: boolean;
}

export const TopTransportBar: React.FC<TopTransportBarProps> = ({
  project,
  engine,
  currentBeat,
  activeView,
  setActiveView,
  isPhoneFrame,
  setIsPhoneFrame,
  onOpenMicModal,
  onOpenStudioInfo,
  onOpenApkModal,
  onExportWav,
  onLoadDemo,
  onSeek,
  isExporting,
}) => {
  const [isPlaying, setIsPlaying] = useState(engine.isPlaying);
  const [bpm, setBpm] = useState(project.bpm);
  const [metronome, setMetronome] = useState(engine.metronomeEnabled);
  const [masterVol, setMasterVol] = useState(0.85);
  const [masterPeak, setMasterPeak] = useState(0);

  // Tap tempo state
  const tapTimesRef = useRef<number[]>([]);

  useEffect(() => {
    const unsub = engine.onStateChange(() => {
      setIsPlaying(engine.isPlaying);
      setMetronome(engine.metronomeEnabled);
    });
    return unsub;
  }, [engine]);

  // Master VU meter animation loop
  useEffect(() => {
    let animId: number;
    const updateMeter = () => {
      if (engine.isPlaying) {
        setMasterPeak(engine.getMasterLevel());
      } else {
        setMasterPeak((prev) => Math.max(0, prev * 0.9));
      }
      animId = requestAnimationFrame(updateMeter);
    };
    animId = requestAnimationFrame(updateMeter);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  // Play / Pause toggle
  const togglePlay = async () => {
    await engine.init();
    if (isPlaying) {
      engine.stopPlayback();
    } else {
      engine.startPlayback(project, currentBeat);
    }
  };

  // Rewind
  const handleRewind = () => {
    onSeek(0);
  };

  // Metronome toggle
  const toggleMetronome = async () => {
    await engine.init();
    engine.metronomeEnabled = !metronome;
    setMetronome(!metronome);
  };

  // BPM change
  const handleBpmChange = (newBpm: number) => {
    const clamped = Math.max(40, Math.min(260, newBpm));
    setBpm(clamped);
    project.bpm = clamped;
    engine.bpm = clamped;
  };

  // Tap Tempo calculation
  const handleTapTempo = () => {
    const now = performance.now();
    const taps = tapTimesRef.current;

    // Reset if last tap was more than 2 seconds ago
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      tapTimesRef.current = [];
    }

    tapTimesRef.current.push(now);

    if (tapTimesRef.current.length > 4) {
      tapTimesRef.current.shift();
    }

    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      handleBpmChange(calculatedBpm);
    }
  };

  // Master Volume slider
  const handleMasterVolChange = (val: number) => {
    setMasterVol(val);
    if (engine.masterGain && engine.ctx) {
      engine.masterGain.gain.setValueAtTime(val, engine.ctx.currentTime);
    }
  };

  // Compute Bars.Beats.16ths
  const bar = Math.floor(currentBeat / 4) + 1;
  const beat = (Math.floor(currentBeat) % 4) + 1;
  const sixteenth = Math.floor((currentBeat * 4) % 4) + 1;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-[#0d0d0d]/95 backdrop-blur-md px-3 sm:px-6 py-2.5 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-6">
        {/* Left: Brand Identity with Dhwoni Logo */}
        <div
          onClick={onOpenStudioInfo}
          className="flex items-center gap-3 cursor-pointer group hover:opacity-95 transition"
          title="Click to view DHWONI (STUDIO) Team & Booking Info"
        >
          <DhwoniLogo size={36} showText={true} />
        </div>

        {/* Center: Transport Controls & Audio Clock */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-neutral-900/90 border border-neutral-800 rounded-xl px-3 py-1.5 shadow-inner">
          {/* Rewind */}
          <button
            onClick={handleRewind}
            title="Rewind to Start (0:00)"
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 active:scale-95 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play (Space)'}
            className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold shadow-lg transition active:scale-95 ${
              isPlaying
                ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400 ring-2 ring-amber-500/50'
                : 'bg-[#dfb743] text-neutral-950 hover:bg-[#ebd074]'
            }`}
          >
            {isPlaying ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Time & Bar Display */}
          <div className="flex flex-col items-center justify-center bg-black/60 border border-neutral-800/80 rounded px-2.5 py-1 min-w-[72px]">
            <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">
              BAR.BEAT
            </span>
            <span className="text-sm font-mono font-bold text-amber-400 tabular-nums">
              {bar}.{beat}.{sixteenth}
            </span>
          </div>

          {/* BPM & Tap Tempo */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-neutral-800">
            <div className="flex flex-col">
              <span className="text-[9px] text-neutral-400 font-mono uppercase">TEMPO</span>
              <div className="flex items-center">
                <input
                  type="number"
                  min="40"
                  max="240"
                  value={bpm}
                  onChange={(e) => handleBpmChange(parseInt(e.target.value) || 120)}
                  className="w-12 bg-transparent text-sm font-bold text-white font-mono focus:outline-none focus:text-amber-400 tabular-nums"
                />
                <span className="text-[10px] text-neutral-400 font-mono">BPM</span>
              </div>
            </div>
            <button
              onClick={handleTapTempo}
              title="Tap Tempo"
              className="text-[10px] font-mono px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 active:bg-amber-500 active:text-black text-neutral-300 font-semibold transition"
            >
              TAP
            </button>
          </div>

          {/* Metronome */}
          <button
            onClick={toggleMetronome}
            title="Toggle Metronome"
            className={`px-2.5 py-1 text-xs font-mono font-semibold rounded transition ${
              metronome
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            METRO
          </button>

          {/* Live Mic Recording Trigger */}
          <button
            onClick={onOpenMicModal}
            title="Live Microphone Recording"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 hover:bg-red-900/40 hover:text-red-200 active:scale-95 transition text-xs font-semibold"
          >
            <Mic className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span className="hidden sm:inline">REC MIC</span>
          </button>
        </div>

        {/* Right Zone: View Tabs & Utility Controls */}
        <div className="flex items-center gap-2">
          {/* Master Volume & Meter */}
          <div className="hidden lg:flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5">
            <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
            <input
              type="range"
              min="0"
              max="1.2"
              step="0.01"
              value={masterVol}
              onChange={(e) => handleMasterVolChange(parseFloat(e.target.value))}
              className="w-16 h-1 cursor-pointer"
              title={`Master Volume: ${Math.round(masterVol * 100)}%`}
            />
            {/* Visual VU Meter */}
            <div className="w-8 h-2 bg-black rounded-sm overflow-hidden flex items-center">
              <div
                className={`h-full transition-all duration-75 ${
                  masterPeak > 0.85 ? 'bg-red-500' : masterPeak > 0.6 ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, masterPeak * 100)}%` }}
              />
            </div>
          </div>

          {/* Demo Project Switcher */}
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => onLoadDemo('assam')}
              title="Load Dhwoni Studio Assam Melodic Session (Anurag & Koustav)"
              className="px-2 py-1 text-[11px] font-semibold text-amber-300 hover:text-white rounded hover:bg-neutral-800 transition"
            >
              Assam 🎙️
            </button>
            <button
              onClick={() => onLoadDemo('trap')}
              title="Load Cyberpunk Trap Demo"
              className="px-2 py-1 text-[11px] font-medium text-neutral-300 hover:text-white rounded hover:bg-neutral-800 transition"
            >
              Trap 808
            </button>
            <button
              onClick={() => onLoadDemo('lofi')}
              title="Load Midnight Lo-Fi Demo"
              className="px-2 py-1 text-[11px] font-medium text-neutral-300 hover:text-white rounded hover:bg-neutral-800 transition"
            >
              Lo-Fi
            </button>
          </div>

          {/* Studio Info / Booking Desk Trigger */}
          <button
            onClick={onOpenStudioInfo}
            title="DHWONI (STUDIO) Team & Booking Desk"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#dfb743]/15 text-[#dfb743] hover:bg-[#dfb743]/25 border border-[#dfb743]/40 text-xs font-bold transition active:scale-95"
          >
            <span>ধ্বনি Team</span>
          </button>

          {/* Download Android APK Button */}
          <button
            onClick={onOpenApkModal}
            title="Download & Install Dhwoni Studio Android App (APK)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 active:scale-95 border border-emerald-500/40 text-xs font-bold transition shadow-sm"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>App Download (APK)</span>
          </button>

          {/* Export WAV */}
          <button
            onClick={onExportWav}
            disabled={isExporting}
            title="Mixdown and Download WAV Audio"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-100 rounded-lg text-xs font-semibold border border-neutral-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">{isExporting ? 'Exporting...' : 'WAV'}</span>
          </button>

          {/* Android Code Hub & NDK Blueprint Modal Trigger */}
          <button
            onClick={() => setActiveView(activeView === 'android' ? 'timeline' : 'android')}
            title="Android NDK & Jetpack Compose Blueprint"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              activeView === 'android'
                ? 'bg-amber-500 text-black border-amber-400 font-bold'
                : 'bg-neutral-900 text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Android NDK</span>
          </button>

          {/* Phone Frame Toggle */}
          <button
            onClick={() => setIsPhoneFrame(!isPhoneFrame)}
            title={isPhoneFrame ? 'Switch to Full Screen Studio' : 'Preview in Google Pixel Phone Frame'}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition"
          >
            {isPhoneFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Sub Navigation Bar for Workspace Modes */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-800/60 overflow-x-auto text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveView('timeline')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              activeView === 'timeline'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            Multi-Track Timeline
          </button>
          <button
            onClick={() => setActiveView('drums')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              activeView === 'drums'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            MPC Pads & Sequencer
          </button>
          <button
            onClick={() => setActiveView('synth')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              activeView === 'synth'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            Virtual Synth & Piano
          </button>
          <button
            onClick={() => setActiveView('pianoroll')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              activeView === 'pianoroll'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            Piano Roll (MIDI)
          </button>
          <button
            onClick={() => setActiveView('mixer')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              activeView === 'mixer'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            Mixer Console
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-neutral-400 text-[11px] font-mono">
          <span>{project.tracks.length} Tracks</span>
          <span>•</span>
          <span>44.1 kHz / 16-bit</span>
          <span>•</span>
          <span className="text-amber-400/80">Golaghat Engine</span>
        </div>
      </div>
    </header>
  );
};
