import React, { useEffect, useState } from 'react';
import { Play, RotateCcw, Volume2, Sparkles, Trash2 } from 'lucide-react';
import { DrumPadId, DrumPadInfo, Project, StepGrid } from '../types/studio';
import { AudioEngine } from '../audio/audioEngine';
import { createDefaultStepGrid } from '../audio/demoProjects';

interface DrumSequencerViewProps {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  engine: AudioEngine;
}

export const DRUM_PADS: DrumPadInfo[] = [
  { id: 'sub808', name: '808 BOOM', key: '1', group: 'bass', color: '#ec4899' },
  { id: 'kick', name: 'KICK 808', key: '2', group: 'kick', color: '#f59e0b' },
  { id: 'snare', name: 'SNARE TRAP', key: '3', group: 'snare', color: '#3b82f6' },
  { id: 'clap', name: 'CLAP 808', key: '4', group: 'snare', color: '#8b5cf6' },

  { id: 'hatClosed', name: 'CLOSED HAT', key: 'Q', group: 'hats', color: '#10b981' },
  { id: 'hatOpen', name: 'OPEN HAT', key: 'W', group: 'hats', color: '#06b6d4' },
  { id: 'rim', name: 'RIM SHOT', key: 'E', group: 'snare', color: '#6366f1' },
  { id: 'shaker', name: 'SHAKER', key: 'R', group: 'percs', color: '#14b8a6' },

  { id: 'tomLow', name: 'LOW TOM', key: 'A', group: 'toms', color: '#f97316' },
  { id: 'tomMid', name: 'MID TOM', key: 'S', group: 'toms', color: '#eab308' },
  { id: 'tomHi', name: 'HIGH TOM', key: 'D', group: 'toms', color: '#84cc16' },
  { id: 'snap', name: 'SNAP', key: 'F', group: 'percs', color: '#a855f7' },

  { id: 'crash', name: 'CRASH', key: 'Z', group: 'cymbals', color: '#d946ef' },
  { id: 'ride', name: 'RIDE', key: 'X', group: 'cymbals', color: '#f43f5e' },
  { id: 'perc', name: 'PERCUSSION', key: 'C', group: 'percs', color: '#22c55e' },
  { id: 'fx', name: 'SFX RISER', key: 'V', group: 'percs', color: '#0ea5e9' },
];

const GRID_INSTRUMENTS: { id: DrumPadId; name: string; color: string }[] = [
  { id: 'kick', name: 'Kick 808', color: '#f59e0b' },
  { id: 'snare', name: 'Snare Trap', color: '#3b82f6' },
  { id: 'clap', name: 'Clap 808', color: '#8b5cf6' },
  { id: 'hatClosed', name: 'Hat Closed', color: '#10b981' },
  { id: 'hatOpen', name: 'Hat Open', color: '#06b6d4' },
  { id: 'sub808', name: 'Sub 808 Bass', color: '#ec4899' },
  { id: 'tomLow', name: 'Tom Low', color: '#f97316' },
  { id: 'perc', name: 'Percussion', color: '#22c55e' },
];

export const DrumSequencerView: React.FC<DrumSequencerViewProps> = ({
  project,
  setProject,
  engine,
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [pressedPadId, setPressedPadId] = useState<DrumPadId | null>(null);

  // Listen to audio engine step events for moving visual playhead
  useEffect(() => {
    const unsub = engine.onStep((step) => {
      setActiveStep(step);
    });
    return unsub;
  }, [engine]);

  // Keyboard trigger shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toUpperCase();
      const pad = DRUM_PADS.find((p) => p.key === key);
      if (pad) {
        triggerPad(pad.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerPad = async (padId: DrumPadId) => {
    await engine.init();
    setPressedPadId(padId);
    engine.playDrum(padId, 0.95);
    setTimeout(() => {
      setPressedPadId((prev) => (prev === padId ? null : prev));
    }, 150);
  };

  // Toggle step on 16-step grid
  const toggleStep = (sound: string, stepIdx: number) => {
    setProject((prev) => {
      const currentSteps = prev.stepGrid[sound] || Array(16).fill(false);
      const newSteps = [...currentSteps];
      newSteps[stepIdx] = !newSteps[stepIdx];

      // Preview drum sound on click
      if (newSteps[stepIdx]) {
        engine.playDrum(sound as DrumPadId, 0.85);
      }

      return {
        ...prev,
        stepGrid: {
          ...prev.stepGrid,
          [sound]: newSteps,
        },
      };
    });
  };

  // Pattern presets
  const applyPreset = (type: 'trap' | 'lofi' | 'four' | 'clear') => {
    let newGrid: StepGrid;
    if (type === 'clear') {
      newGrid = {
        kick: Array(16).fill(false),
        snare: Array(16).fill(false),
        clap: Array(16).fill(false),
        hatClosed: Array(16).fill(false),
        hatOpen: Array(16).fill(false),
        sub808: Array(16).fill(false),
        tomLow: Array(16).fill(false),
        perc: Array(16).fill(false),
      };
    } else if (type === 'four') {
      newGrid = {
        kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        clap: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        hatClosed: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
        hatOpen: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, true, false],
        sub808: [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
        tomLow: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        perc: [false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, true],
      };
    } else if (type === 'lofi') {
      newGrid = {
        kick: [true, false, false, false, false, false, true, false, false, false, true, false, false, false, false, false],
        snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        clap: Array(16).fill(false),
        hatClosed: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
        hatOpen: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, true, false],
        sub808: Array(16).fill(false),
        tomLow: Array(16).fill(false),
        perc: [false, false, true, false, false, false, false, true, false, false, true, false, false, true, false, false],
      };
    } else {
      newGrid = createDefaultStepGrid();
    }

    setProject((prev) => ({
      ...prev,
      stepGrid: newGrid,
    }));
  };

  return (
    <div className="flex flex-col lg:flex-row flex-1 h-full bg-[#0a0a0a] text-neutral-200 overflow-y-auto">
      {/* Left: 16-Pad MPC Sampler */}
      <div className="w-full lg:w-96 p-4 border-b lg:border-b-0 lg:border-r border-neutral-800 bg-[#0d0d0d] flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-amber-400">MPC 16-PAD SAMPLER</span>
            <span className="text-[10px] text-neutral-400 font-mono">Dhwoni Engine</span>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono">HOTKEYS 1-4, Q-R, A-F, Z-V</span>
        </div>

        {/* 4x4 Responsive Velocity-Sensitive Pad Grid */}
        <div className="grid grid-cols-4 gap-2.5 flex-1 aspect-square max-w-sm mx-auto w-full">
          {DRUM_PADS.map((pad) => {
            const isHit = pressedPadId === pad.id;
            return (
              <button
                key={pad.id}
                onMouseDown={() => triggerPad(pad.id)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  triggerPad(pad.id);
                }}
                className={`relative flex flex-col items-center justify-between p-2 rounded-xl border transition-all duration-75 select-none active:scale-95 shadow-md ${
                  isHit
                    ? 'border-amber-300 bg-amber-400 text-black scale-95 shadow-[0_0_15px_rgba(245,158,11,0.6)]'
                    : 'border-neutral-800 bg-[#161616] hover:bg-[#202020] text-neutral-200 hover:border-neutral-700'
                }`}
              >
                {/* Hotkey Tag */}
                <span className="self-start text-[10px] font-mono font-bold opacity-60">
                  {pad.key}
                </span>

                {/* Pad Name */}
                <span className="text-[10px] font-bold text-center leading-tight">
                  {pad.name}
                </span>

                {/* Accent Color Dot */}
                <div
                  className="w-2 h-2 rounded-full self-end"
                  style={{ backgroundColor: pad.color }}
                />
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-neutral-400 text-center mt-3 font-mono">
          Touch or tap keyboard keys to play live beats with zero latency
        </p>
      </div>

      {/* Right: 16-Step Beat Sequencer Grid */}
      <div className="flex-1 p-4 flex flex-col bg-[#0b0b0b] overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <span>16-Step Pattern Sequencer</span>
              <span className="text-xs font-normal text-neutral-400 font-mono">(4/4 Time Signature)</span>
            </h2>
            <p className="text-xs text-neutral-400">
              Pattern loops continuously during playback. Click steps to toggle drum hits.
            </p>
          </div>

          {/* Pattern Presets */}
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
            <span className="text-[10px] text-neutral-400 font-mono px-1">PRESETS:</span>
            <button
              onClick={() => applyPreset('trap')}
              className="px-2 py-0.5 text-xs rounded hover:bg-neutral-800 text-neutral-200 transition"
            >
              Trap 808
            </button>
            <button
              onClick={() => applyPreset('lofi')}
              className="px-2 py-0.5 text-xs rounded hover:bg-neutral-800 text-neutral-200 transition"
            >
              Lo-Fi Chill
            </button>
            <button
              onClick={() => applyPreset('four')}
              className="px-2 py-0.5 text-xs rounded hover:bg-neutral-800 text-neutral-200 transition"
            >
              House 4/4
            </button>
            <button
              onClick={() => applyPreset('clear')}
              className="p-1 rounded hover:bg-red-950/40 text-neutral-400 hover:text-red-400 transition"
              title="Clear Grid"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Step Grid Table */}
        <div className="flex-1 min-w-[620px] bg-[#111111] border border-neutral-800 rounded-xl p-3 shadow-inner flex flex-col justify-between">
          {/* Step Numbers Header */}
          <div className="grid grid-cols-16 gap-1 mb-2 pl-28">
            {Array.from({ length: 16 }).map((_, stepIdx) => {
              const isCurrent = engine.isPlaying && activeStep === stepIdx;
              const isBeatQuarter = stepIdx % 4 === 0;

              return (
                <div
                  key={stepIdx}
                  className={`text-center py-1 text-[10px] font-mono rounded transition-colors ${
                    isCurrent
                      ? 'bg-amber-400 text-neutral-950 font-bold shadow'
                      : isBeatQuarter
                      ? 'bg-neutral-800/80 text-amber-300 font-semibold'
                      : 'text-neutral-500'
                  }`}
                >
                  {stepIdx + 1}
                </div>
              );
            })}
          </div>

          {/* Instrument Rows */}
          <div className="flex flex-col gap-2">
            {GRID_INSTRUMENTS.map((inst) => {
              const steps = project.stepGrid[inst.id] || Array(16).fill(false);

              return (
                <div key={inst.id} className="flex items-center gap-2">
                  {/* Instrument Label */}
                  <div
                    onClick={() => triggerPad(inst.id)}
                    className="w-26 shrink-0 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#181818] border border-neutral-800 hover:border-amber-400/50 cursor-pointer active:scale-95 transition"
                  >
                    <span className="text-xs font-semibold text-neutral-200 truncate">{inst.name}</span>
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: inst.color }}
                    />
                  </div>

                  {/* 16 Step Buttons */}
                  <div className="grid grid-cols-16 gap-1 flex-1">
                    {steps.map((isActive, sIdx) => {
                      const isCurrent = engine.isPlaying && activeStep === sIdx;
                      const isQuarter = sIdx % 4 === 0;

                      return (
                        <button
                          key={sIdx}
                          onClick={() => toggleStep(inst.id, sIdx)}
                          className={`h-9 rounded-md border transition-all duration-75 flex items-center justify-center ${
                            isActive
                              ? 'border-amber-400 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                              : isQuarter
                              ? 'border-neutral-700/60 bg-[#1c1c1c] hover:bg-neutral-700'
                              : 'border-neutral-800/60 bg-[#141414] hover:bg-neutral-800'
                          } ${isCurrent ? 'ring-2 ring-white scale-105 z-10' : ''}`}
                        >
                          {isActive && (
                            <div className="w-2 h-2 rounded-full bg-neutral-950 shadow-sm" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
