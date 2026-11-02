import React, { useEffect, useRef } from 'react';
import { X, Sliders, Activity, Sparkles, Volume2 } from 'lucide-react';
import { Project, Track } from '../types/studio';
import { AudioEngine } from '../audio/audioEngine';

interface FxRackModalProps {
  track: Track;
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  engine: AudioEngine;
  onClose: () => void;
}

export const FxRackModal: React.FC<FxRackModalProps> = ({
  track,
  project,
  setProject,
  engine,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Real-time oscilloscope & frequency analyzer canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const trackNodes = engine['trackNodes'].get(track.id);
    const analyser = trackNodes?.analyserNode || engine.masterAnalyser;

    const draw = () => {
      if (!analyser) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw EQ Frequency Curve Background
      ctx.fillStyle = '#0f0f0f';
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw synthetic EQ curve line
      ctx.strokeStyle = '#dfb743';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const midY = height / 2;
      const lowY = midY - (track.fx.eq.low / 12) * (height * 0.35);
      const mY = midY - (track.fx.eq.mid / 12) * (height * 0.35);
      const highY = midY - (track.fx.eq.high / 12) * (height * 0.35);

      ctx.moveTo(0, lowY);
      ctx.bezierCurveTo(width * 0.25, lowY, width * 0.35, mY, width * 0.5, mY);
      ctx.bezierCurveTo(width * 0.65, mY, width * 0.75, highY, width, highY);
      ctx.stroke();

      // 2. Draw live spectrum or waveform if playing
      if (engine.isPlaying) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        const barWidth = (width / bufferLength) * 2;
        let barX = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.8;
          ctx.fillRect(barX, height - barHeight, barWidth - 1, barHeight);
          barX += barWidth;
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [track, engine]);

  // Update effect helper
  const updateFx = (updater: (fx: typeof track.fx) => typeof track.fx) => {
    setProject((prev) => {
      const updatedTracks = prev.tracks.map((t) =>
        t.id === track.id ? { ...t, fx: updater(t.fx) } : t
      );
      const updatedTrack = updatedTracks.find((t) => t.id === track.id);
      if (updatedTrack) engine.updateTrackParams(updatedTrack);
      return { ...prev, tracks: updatedTracks };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#121212] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#161616]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <span>DSP FX RACK: {track.name}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Studio Quality
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Visual Frequency Response Canvas */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-mono text-neutral-400">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Activity className="w-3.5 h-3.5" />
                <span>3-BAND PARAMETRIC EQ CURVE & SPECTRUM</span>
              </span>
              <span>20 Hz – 20 kHz</span>
            </div>
            <div className="w-full h-32 rounded-xl overflow-hidden border border-neutral-800 relative bg-black shadow-inner">
              <canvas
                ref={canvasRef}
                width={600}
                height={128}
                className="w-full h-full block"
              />
            </div>
          </div>

          {/* 3-Band Parametric EQ Sliders */}
          <div className="grid grid-cols-3 gap-4 bg-[#181818] p-4 rounded-xl border border-neutral-800">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-neutral-400">LOW (120 Hz)</span>
                <span className="text-amber-400 font-bold">{track.fx.eq.low > 0 ? `+${track.fx.eq.low}` : track.fx.eq.low} dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={track.fx.eq.low}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateFx((fx) => ({ ...fx, eq: { ...fx.eq, low: val } }));
                }}
                className="w-full h-1.5 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-neutral-400">MID (1.0 kHz)</span>
                <span className="text-amber-400 font-bold">{track.fx.eq.mid > 0 ? `+${track.fx.eq.mid}` : track.fx.eq.mid} dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={track.fx.eq.mid}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateFx((fx) => ({ ...fx, eq: { ...fx.eq, mid: val } }));
                }}
                className="w-full h-1.5 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-neutral-400">HIGH (6.0 kHz)</span>
                <span className="text-amber-400 font-bold">{track.fx.eq.high > 0 ? `+${track.fx.eq.high}` : track.fx.eq.high} dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={track.fx.eq.high}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateFx((fx) => ({ ...fx, eq: { ...fx.eq, high: val } }));
                }}
                className="w-full h-1.5 cursor-pointer"
              />
            </div>
          </div>

          {/* Time & Spatial Effects: Delay & Reverb */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stereo Delay */}
            <div className="bg-[#181818] p-4 rounded-xl border border-neutral-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200">STEREO DELAY</span>
                <button
                  onClick={() =>
                    updateFx((fx) => ({
                      ...fx,
                      delay: { ...fx.delay, enabled: !fx.delay.enabled },
                    }))
                  }
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold transition ${
                    track.fx.delay.enabled
                      ? 'bg-amber-500 text-black shadow'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {track.fx.delay.enabled ? 'ACTIVE' : 'BYPASS'}
                </button>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-neutral-400 mb-1">
                  <span>TIME</span>
                  <span className="text-amber-400">{Math.round(track.fx.delay.time * 1000)} ms</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.01"
                  value={track.fx.delay.time}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateFx((fx) => ({ ...fx, delay: { ...fx.delay, time: val } }));
                  }}
                  className="w-full h-1 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-neutral-400 mb-1">
                  <span>FEEDBACK</span>
                  <span className="text-amber-400">{Math.round(track.fx.delay.feedback * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={track.fx.delay.feedback}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateFx((fx) => ({ ...fx, delay: { ...fx.delay, feedback: val } }));
                  }}
                  className="w-full h-1 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-neutral-400 mb-1">
                  <span>WET / DRY MIX</span>
                  <span className="text-amber-400">{Math.round(track.fx.delay.mix * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={track.fx.delay.mix}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateFx((fx) => ({ ...fx, delay: { ...fx.delay, mix: val } }));
                  }}
                  className="w-full h-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Studio Reverb */}
            <div className="bg-[#181818] p-4 rounded-xl border border-neutral-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200">STUDIO REVERB</span>
                <button
                  onClick={() =>
                    updateFx((fx) => ({
                      ...fx,
                      reverb: { ...fx.reverb, enabled: !fx.reverb.enabled },
                    }))
                  }
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold transition ${
                    track.fx.reverb.enabled
                      ? 'bg-amber-500 text-black shadow'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {track.fx.reverb.enabled ? 'ACTIVE' : 'BYPASS'}
                </button>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-neutral-400 mb-1">
                  <span>ROOM DECAY</span>
                  <span className="text-amber-400">{track.fx.reverb.decay.toFixed(1)} s</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.1"
                  value={track.fx.reverb.decay}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateFx((fx) => ({ ...fx, reverb: { ...fx.reverb, decay: val } }));
                  }}
                  className="w-full h-1 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-neutral-400 mb-1">
                  <span>WET / DRY MIX</span>
                  <span className="text-amber-400">{Math.round(track.fx.reverb.mix * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={track.fx.reverb.mix}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateFx((fx) => ({ ...fx, reverb: { ...fx.reverb, mix: val } }));
                  }}
                  className="w-full h-1 cursor-pointer"
                />
              </div>

              {/* Tube Distortion */}
              <div className="pt-2 border-t border-neutral-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono text-neutral-300 font-bold">WARM TUBE DRIVE</span>
                  <button
                    onClick={() =>
                      updateFx((fx) => ({
                        ...fx,
                        distortion: { ...fx.distortion, enabled: !fx.distortion.enabled },
                      }))
                    }
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      track.fx.distortion.enabled ? 'bg-amber-500 text-black font-bold' : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {track.fx.distortion.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  value={track.fx.distortion.drive}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateFx((fx) => ({ ...fx, distortion: { ...fx.distortion, drive: val, mix: 0.25 } }));
                  }}
                  className="w-full h-1 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-[#161616] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 transition"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
