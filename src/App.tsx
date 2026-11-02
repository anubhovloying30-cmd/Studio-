import React, { useEffect, useState, useCallback } from 'react';
import { AudioEngine } from './audio/audioEngine';
import {
  generateAssamDemoProject,
  generateLofiDemoProject,
  generateTrapDemoProject,
} from './audio/demoProjects';
import { Project, Track } from './types/studio';
import { TopTransportBar } from './components/TopTransportBar';
import { TimelineView } from './components/TimelineView';
import { DrumSequencerView } from './components/DrumSequencerView';
import { SynthKeyboardView } from './components/SynthKeyboardView';
import { MixerConsoleView } from './components/MixerConsoleView';
import { FxRackModal } from './components/FxRackModal';
import { MicRecordModal } from './components/MicRecordModal';
import { AndroidBlueprintModal } from './components/AndroidBlueprintModal';
import { PhoneSimulatorFrame } from './components/PhoneSimulatorFrame';
import { StudioInfoModal } from './components/StudioInfoModal';
import { ApkDownloadModal } from './components/ApkDownloadModal';
import { PianoRollView } from './components/PianoRollView';

export default function App() {
  const [engine] = useState<AudioEngine>(() => AudioEngine.getInstance());
  const [project, setProject] = useState<Project>(() => {
    // Initial fallback project until Web Audio initializes
    const dummyCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return generateAssamDemoProject(dummyCtx);
  });

  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [activeView, setActiveView] = useState<'timeline' | 'drums' | 'synth' | 'pianoroll' | 'mixer' | 'android'>('timeline');
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(false);
  const [selectedFxTrack, setSelectedFxTrack] = useState<Track | null>(null);
  const [isMicModalOpen, setIsMicModalOpen] = useState<boolean>(false);
  const [isStudioInfoOpen, setIsStudioInfoOpen] = useState<boolean>(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Initialize AudioEngine on first load
  useEffect(() => {
    let animId: number;

    const setup = async () => {
      const ctx = await engine.init();
      // Load Dhwoni Studio Assam session with real buffers
      const initialProject = generateAssamDemoProject(ctx);
      setProject(initialProject);

      // Pre-bind all track nodes in audio engine
      initialProject.tracks.forEach((t) => engine.setupTrackNodes(t));
    };

    setup();

    // Subscribe to playhead animation
    const updatePlayhead = () => {
      if (engine.isPlaying) {
        setCurrentBeat(engine.currentBeat);
      }
      animId = requestAnimationFrame(updatePlayhead);
    };
    animId = requestAnimationFrame(updatePlayhead);

    return () => {
      cancelAnimationFrame(animId);
      engine.stopPlayback();
    };
  }, [engine]);

  // Spacebar shortcut to Play / Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        if (engine.isPlaying) {
          engine.stopPlayback();
        } else {
          engine.startPlayback(project, currentBeat);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, project, currentBeat]);

  // Seek handler
  const handleSeek = useCallback(
    (beat: number) => {
      setCurrentBeat(beat);
      engine.seekToBeat(project, beat);
    },
    [engine, project]
  );

  // Load Demo Project
  const handleLoadDemo = useCallback(
    async (type: 'trap' | 'lofi' | 'assam') => {
      engine.stopPlayback();
      const ctx = await engine.init();
      const newProject =
        type === 'assam'
          ? generateAssamDemoProject(ctx)
          : type === 'trap'
          ? generateTrapDemoProject(ctx)
          : generateLofiDemoProject(ctx);

      setProject(newProject);
      newProject.tracks.forEach((t) => engine.setupTrackNodes(t));
      setCurrentBeat(0);
      engine.seekToBeat(newProject, 0);
    },
    [engine]
  );

  // Full Offline WAV Export
  const handleExportWav = useCallback(async () => {
    setIsExporting(true);
    try {
      await engine.init();
      const wavBlob = await engine.exportProjectWav(project);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_dhwoni_mix.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export audio: ' + err);
    } finally {
      setIsExporting(false);
    }
  }, [engine, project]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#070707] flex flex-col font-sans select-none">
      <PhoneSimulatorFrame isPhoneFrame={isPhoneFrame} setIsPhoneFrame={setIsPhoneFrame}>
        {/* Top Transport & Studio Control Bar */}
        <TopTransportBar
          project={project}
          engine={engine}
          currentBeat={currentBeat}
          activeView={activeView}
          setActiveView={setActiveView}
          isPhoneFrame={isPhoneFrame}
          setIsPhoneFrame={setIsPhoneFrame}
          onOpenMicModal={() => setIsMicModalOpen(true)}
          onOpenFxModal={() => {
            if (project.tracks.length > 0) setSelectedFxTrack(project.tracks[0]);
          }}
          onOpenStudioInfo={() => setIsStudioInfoOpen(true)}
          onOpenApkModal={() => setIsApkModalOpen(true)}
          onExportWav={handleExportWav}
          onLoadDemo={handleLoadDemo}
          onSeek={handleSeek}
          isExporting={isExporting}
        />

        {/* Dynamic Studio Workspace Views */}
        <main className="flex-1 overflow-hidden relative flex flex-col">
          {activeView === 'timeline' && (
            <TimelineView
              project={project}
              setProject={setProject}
              engine={engine}
              currentBeat={currentBeat}
              onSeek={handleSeek}
              onOpenTrackFx={(tr) => setSelectedFxTrack(tr)}
              onOpenMicModal={() => setIsMicModalOpen(true)}
              onOpenPianoRoll={() => setActiveView('pianoroll')}
            />
          )}

          {activeView === 'drums' && (
            <DrumSequencerView
              project={project}
              setProject={setProject}
              engine={engine}
            />
          )}

          {activeView === 'synth' && (
            <SynthKeyboardView
              project={project}
              setProject={setProject}
              engine={engine}
              currentBeat={currentBeat}
            />
          )}

          {activeView === 'pianoroll' && (
            <PianoRollView
              project={project}
              setProject={setProject}
              engine={engine}
            />
          )}

          {activeView === 'mixer' && (
            <MixerConsoleView
              project={project}
              setProject={setProject}
              engine={engine}
              onOpenTrackFx={(tr) => setSelectedFxTrack(tr)}
            />
          )}

          {activeView === 'android' && <AndroidBlueprintModal />}
        </main>

        {/* DSP Effects Rack Modal */}
        {selectedFxTrack && (
          <FxRackModal
            track={selectedFxTrack}
            project={project}
            setProject={setProject}
            engine={engine}
            onClose={() => setSelectedFxTrack(null)}
          />
        )}

        {/* Live Microphone Recording Modal */}
        {isMicModalOpen && (
          <MicRecordModal
            project={project}
            setProject={setProject}
            engine={engine}
            onClose={() => setIsMicModalOpen(false)}
          />
        )}

        {/* Studio Info & Team Directory Modal */}
        {isStudioInfoOpen && (
          <StudioInfoModal
            onClose={() => setIsStudioInfoOpen(false)}
            onLoadAssamDemo={() => handleLoadDemo('assam')}
          />
        )}

        {/* Download APK & Android Install Modal */}
        {isApkModalOpen && (
          <ApkDownloadModal onClose={() => setIsApkModalOpen(false)} />
        )}
      </PhoneSimulatorFrame>
    </div>
  );
}
