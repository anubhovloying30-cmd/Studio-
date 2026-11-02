import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Check, AlertCircle, X, Volume2 } from 'lucide-react';
import { AudioClip, Project, Track } from '../types/studio';
import { AudioEngine } from '../audio/audioEngine';

interface MicRecordModalProps {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  engine: AudioEngine;
  onClose: () => void;
}

export const MicRecordModal: React.FC<MicRecordModalProps> = ({
  project,
  setProject,
  engine,
  onClose,
}) => {
  const [micReady, setMicReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const [inputLevel, setInputLevel] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<number | null>(null);
  const animRef = useRef<number | null>(null);

  // Initialize selected track
  useEffect(() => {
    const armed = project.tracks.find((t) => t.armed && t.type === 'audio');
    if (armed) {
      setSelectedTrackId(armed.id);
    } else {
      const anyAudio = project.tracks.find((t) => t.type === 'audio');
      if (anyAudio) setSelectedTrackId(anyAudio.id);
      else if (project.tracks.length > 0) setSelectedTrackId(project.tracks[0].id);
    }
  }, [project.tracks]);

  // Request mic access
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const ok = await engine.initMic();
        if (active) {
          if (ok) setMicReady(true);
          else setErrorMsg('Microphone hardware or permission was not granted.');
        }
      } catch (err: any) {
        if (active) setErrorMsg(err?.message || 'Failed to initialize microphone');
      }
    })();

    return () => {
      active = false;
    };
  }, [engine]);

  // Live input visualizer animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const level = engine.getMicInputLevel();
      setInputLevel(level);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);

      if (engine.micAnalyser) {
        const bufferLength = engine.micAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        engine.micAnalyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = isRecording ? '#ef4444' : '#dfb743';
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [engine, isRecording]);

  // Start recording flow with 3-second countdown
  const handleStartCountdown = () => {
    setCountdown(3);
    const countInterval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countInterval);
          startActualRecording();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startActualRecording = async () => {
    try {
      await engine.startMicRecording();
      setIsRecording(true);
      setElapsedSec(0);

      // Start elapsed timer
      const startT = performance.now();
      timerRef.current = window.setInterval(() => {
        setElapsedSec((performance.now() - startT) / 1000);
      }, 100);

      // Also trigger engine playback if project is running so user records over music
      if (!engine.isPlaying) {
        engine.startPlayback(project, engine.currentBeat);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Recording failed to start');
    }
  };

  const handleStopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const clip = await engine.stopMicRecording();
      engine.stopPlayback();

      // Ensure clip is assigned to selected track
      clip.trackId = selectedTrackId;

      setProject((prev) => ({
        ...prev,
        tracks: prev.tracks.map((t) =>
          t.id === selectedTrackId ? { ...t, clips: [...t.clips, clip] } : t
        ),
      }));

      onClose();
    } catch (err: any) {
      setErrorMsg('Error saving audio clip: ' + err.message);
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-[#141414] border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#1a1a1a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <Mic className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100 leading-tight">
                Studio Vocal & Mic Recording 🎙️
              </h2>
              <span className="text-[11px] text-[#dfb743] font-mono">Dhwoni Studio Gold Engine</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5 items-center">
          {errorMsg && (
            <div className="w-full p-3 bg-red-950/40 border border-red-500/50 rounded-xl flex items-center gap-2 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Track destination selector */}
          <div className="w-full flex flex-col gap-1.5">
            <label className="text-xs font-mono text-neutral-400">RECORD ONTO TRACK:</label>
            <select
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              disabled={isRecording}
              className="w-full bg-[#1e1e1e] border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-400"
            >
              {project.tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.type})
                </option>
              ))}
            </select>
          </div>

          {/* Oscilloscope Canvas */}
          <div className="w-full h-36 rounded-2xl overflow-hidden border border-neutral-800 bg-black relative shadow-inner">
            <canvas ref={canvasRef} width={480} height={144} className="w-full h-full block" />

            {/* Live Recording HUD overlay */}
            {isRecording && (
              <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-600/80 text-white text-[11px] font-bold animate-pulse shadow">
                <div className="w-2 h-2 rounded-full bg-white" />
                <span>REC • {elapsedSec.toFixed(1)}s</span>
              </div>
            )}

            {/* Countdown overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <span className="text-6xl font-black text-amber-400 animate-ping">
                  {countdown}
                </span>
              </div>
            )}
          </div>

          {/* Input Level Bar */}
          <div className="w-full flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-neutral-400 shrink-0" />
            <div className="flex-1 h-3 bg-black rounded-full overflow-hidden border border-neutral-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  inputLevel > 0.85
                    ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                    : inputLevel > 0.5
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, inputLevel * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-neutral-400 w-10 text-right tabular-nums">
              {Math.round(inputLevel * 100)}%
            </span>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex items-center gap-3 w-full mt-2">
            {!isRecording ? (
              <button
                onClick={handleStartCountdown}
                disabled={!micReady || countdown !== null}
                className="flex-1 py-3.5 rounded-xl bg-red-500 hover:bg-red-400 active:scale-98 font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition disabled:opacity-50"
              >
                <Mic className="w-4 h-4" />
                <span>{countdown !== null ? `Starting in ${countdown}...` : 'Start Recording (3s Count)'}</span>
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="flex-1 py-3.5 rounded-xl bg-white hover:bg-neutral-200 active:scale-98 font-bold text-sm text-neutral-950 flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Square className="w-4 h-4 fill-current text-red-600" />
                <span>Stop & Save to Timeline</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
