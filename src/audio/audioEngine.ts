import { AudioClip, DrumPadId, FxSettings, Project, Track } from '../types/studio';
import { createProceduralDrumBuffer, extractWaveformPeaks } from './drumSynth';
import { audioBufferToWav } from './wavEncoder';

export interface TrackAudioNodes {
  inputNode: GainNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  distortionNode: WaveShaperNode;
  distortionDryGain: GainNode;
  distortionWetGain: GainNode;
  delayNode: DelayNode;
  delayFeedbackGain: GainNode;
  delayWetGain: GainNode;
  reverbNode: ConvolverNode;
  reverbWetGain: GainNode;
  panNode: StereoPannerNode;
  volumeNode: GainNode;
  analyserNode: AnalyserNode;
  activeSources: AudioBufferSourceNode[];
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  public ctx: AudioContext | null = null;

  // Master nodes
  public masterGain: GainNode | null = null;
  public masterLimiter: DynamicsCompressorNode | null = null;
  public masterAnalyser: AnalyserNode | null = null;

  // Track nodes dictionary
  private trackNodes: Map<string, TrackAudioNodes> = new Map();

  // Drum buffers cache
  private drumBuffers: Map<DrumPadId, AudioBuffer> = new Map();

  // Transport State
  public isPlaying: boolean = false;
  public bpm: number = 120;
  public currentBeat: number = 0;
  private playbackStartTime: number = 0;
  private startOffsetBeat: number = 0;
  private timerId: number | null = null;

  // Sequencer lookahead
  private nextStepTime: number = 0;
  private currentStep: number = 0;

  // Microphone recording
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  public micAnalyser: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public isRecordingMic: boolean = false;

  // Metronome
  public metronomeEnabled: boolean = false;

  // Listeners
  private onStepListeners: Set<(step: number, beat: number) => void> = new Set();
  private onStateChangeListeners: Set<() => void> = new Set();

  private constructor() {}

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  // Initialize or resume AudioContext
  public async init(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      // Master Chain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      this.masterLimiter = this.ctx.createDynamicsCompressor();
      this.masterLimiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
      this.masterLimiter.knee.setValueAtTime(0, this.ctx.currentTime);
      this.masterLimiter.ratio.setValueAtTime(20.0, this.ctx.currentTime);
      this.masterLimiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.masterLimiter.release.setValueAtTime(0.1, this.ctx.currentTime);

      this.masterAnalyser = this.ctx.createAnalyser();
      this.masterAnalyser.fftSize = 256;
      this.masterAnalyser.smoothingTimeConstant = 0.8;

      // Connect: masterGain -> masterLimiter -> masterAnalyser -> destination
      this.masterGain.connect(this.masterLimiter);
      this.masterLimiter.connect(this.masterAnalyser);
      this.masterAnalyser.connect(this.ctx.destination);

      // Pre-render procedural drum kit
      this.preloadDrums();
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    return this.ctx;
  }

  private preloadDrums() {
    if (!this.ctx) return;
    const padIds: DrumPadId[] = [
      'kick', 'snare', 'clap', 'hatClosed', 'hatOpen', 'tomLow', 'tomMid', 'tomHi',
      'rim', 'shaker', 'crash', 'ride', 'sub808', 'perc', 'snap', 'fx'
    ];
    for (const id of padIds) {
      this.drumBuffers.set(id, createProceduralDrumBuffer(this.ctx, id, 'trap'));
    }
  }

  // Generate synthetic reverb impulse response
  private createReverbImpulse(ctx: BaseAudioContext, decay: number = 2.0): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * decay);
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / rate;
      const env = Math.exp(-t * (3.5 / decay));
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return impulse;
  }

  // Distortion curve
  private makeDistortionCurve(amount: number = 20): Float32Array<ArrayBuffer> {
    const n_samples = 256;
    const arrayBuffer = new ArrayBuffer(n_samples * 4);
    const curve = new Float32Array(arrayBuffer) as Float32Array<ArrayBuffer>;
    const deg = Math.PI / 180;
    const k = Math.max(1, amount);
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  // Setup / update track audio nodes
  public setupTrackNodes(track: Track): TrackAudioNodes {
    if (!this.ctx) throw new Error('AudioContext not initialized');

    let nodes = this.trackNodes.get(track.id);
    if (!nodes) {
      const inputNode = this.ctx.createGain();
      const eqLow = this.ctx.createBiquadFilter();
      eqLow.type = 'lowshelf';
      eqLow.frequency.setValueAtTime(120, this.ctx.currentTime);

      const eqMid = this.ctx.createBiquadFilter();
      eqMid.type = 'peaking';
      eqMid.frequency.setValueAtTime(1000, this.ctx.currentTime);
      eqMid.Q.setValueAtTime(1.0, this.ctx.currentTime);

      const eqHigh = this.ctx.createBiquadFilter();
      eqHigh.type = 'highshelf';
      eqHigh.frequency.setValueAtTime(6000, this.ctx.currentTime);

      // Distortion
      const distortionNode = this.ctx.createWaveShaper();
      distortionNode.curve = this.makeDistortionCurve(20);
      distortionNode.oversample = '2x';
      const distortionDryGain = this.ctx.createGain();
      const distortionWetGain = this.ctx.createGain();

      // Delay
      const delayNode = this.ctx.createDelay(2.0);
      const delayFeedbackGain = this.ctx.createGain();
      const delayWetGain = this.ctx.createGain();
      delayNode.connect(delayFeedbackGain);
      delayFeedbackGain.connect(delayNode);
      delayNode.connect(delayWetGain);

      // Reverb
      const reverbNode = this.ctx.createConvolver();
      reverbNode.buffer = this.createReverbImpulse(this.ctx, 2.0);
      const reverbWetGain = this.ctx.createGain();
      reverbNode.connect(reverbWetGain);

      // Pan & Volume & Metering
      const panNode = this.ctx.createStereoPanner();
      const volumeNode = this.ctx.createGain();
      const analyserNode = this.ctx.createAnalyser();
      analyserNode.fftSize = 64;

      // Routing: input -> EQ Low -> EQ Mid -> EQ High
      inputNode.connect(eqLow);
      eqLow.connect(eqMid);
      eqMid.connect(eqHigh);

      // EQ High splits to dry path, distortion, delay, reverb
      eqHigh.connect(distortionDryGain);
      eqHigh.connect(distortionNode);
      distortionNode.connect(distortionWetGain);

      // Sum distortion
      distortionDryGain.connect(panNode);
      distortionWetGain.connect(panNode);

      // Send to delay & reverb
      eqHigh.connect(delayNode);
      eqHigh.connect(reverbNode);
      delayWetGain.connect(panNode);
      reverbWetGain.connect(panNode);

      // Pan -> Volume -> Analyser -> MasterGain
      panNode.connect(volumeNode);
      volumeNode.connect(analyserNode);
      if (this.masterGain) {
        analyserNode.connect(this.masterGain);
      }

      nodes = {
        inputNode,
        eqLow,
        eqMid,
        eqHigh,
        distortionNode,
        distortionDryGain,
        distortionWetGain,
        delayNode,
        delayFeedbackGain,
        delayWetGain,
        reverbNode,
        reverbWetGain,
        panNode,
        volumeNode,
        analyserNode,
        activeSources: [],
      };

      this.trackNodes.set(track.id, nodes);
    }

    // Apply values
    this.updateTrackParams(track);
    return nodes;
  }

  public updateTrackParams(track: Track) {
    const nodes = this.trackNodes.get(track.id);
    if (!nodes || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Volume & Mute / Solo logic
    const effVolume = track.muted ? 0 : track.volume;
    nodes.volumeNode.gain.setValueAtTime(effVolume, now);

    // Pan
    nodes.panNode.pan.setValueAtTime(Math.max(-1, Math.min(1, track.pan)), now);

    // EQ
    nodes.eqLow.gain.setValueAtTime(track.fx.eq.low, now);
    nodes.eqMid.gain.setValueAtTime(track.fx.eq.mid, now);
    nodes.eqHigh.gain.setValueAtTime(track.fx.eq.high, now);

    // Distortion
    const distMix = track.fx.distortion.enabled ? track.fx.distortion.mix : 0;
    nodes.distortionWetGain.gain.setValueAtTime(distMix, now);
    nodes.distortionDryGain.gain.setValueAtTime(1 - distMix * 0.5, now);
    if (track.fx.distortion.enabled) {
      nodes.distortionNode.curve = this.makeDistortionCurve(track.fx.distortion.drive);
    }

    // Delay
    const delayMix = track.fx.delay.enabled ? track.fx.delay.mix : 0;
    nodes.delayWetGain.gain.setValueAtTime(delayMix, now);
    nodes.delayNode.delayTime.setValueAtTime(track.fx.delay.time, now);
    nodes.delayFeedbackGain.gain.setValueAtTime(track.fx.delay.feedback, now);

    // Reverb
    const revMix = track.fx.reverb.enabled ? track.fx.reverb.mix : 0;
    nodes.reverbWetGain.gain.setValueAtTime(revMix, now);
  }

  // Get RMS level for VU meters (0 - 1)
  public getTrackLevel(trackId: string): number {
    const nodes = this.trackNodes.get(trackId);
    if (!nodes) return 0;
    const data = new Uint8Array(nodes.analyserNode.frequencyBinCount);
    nodes.analyserNode.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / data.length) * 3);
  }

  // Get Master level for master VU meter
  public getMasterLevel(): number {
    if (!this.masterAnalyser) return 0;
    const data = new Uint8Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / data.length) * 3);
  }

  // Play a drum hit immediately (for MPC pads or preview)
  public playDrum(padId: DrumPadId, velocity: number = 0.9, trackId?: string) {
    if (!this.ctx) return;
    let buffer = this.drumBuffers.get(padId);
    if (!buffer) {
      buffer = createProceduralDrumBuffer(this.ctx, padId, 'trap');
      this.drumBuffers.set(padId, buffer);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.min(1.2, velocity), this.ctx.currentTime);
    source.connect(gain);

    // Route to specified track or master
    if (trackId && this.trackNodes.has(trackId)) {
      gain.connect(this.trackNodes.get(trackId)!.inputNode);
    } else if (this.masterGain) {
      gain.connect(this.masterGain);
    } else {
      gain.connect(this.ctx.destination);
    }

    source.start(this.ctx.currentTime);
  }

  // Play Metronome Click
  private playMetronomeClick(accent: boolean, time: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 1760 : 880, time);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    }
    osc.start(time);
    osc.stop(time + 0.05);
  }

  // Start Playback of full project
  public startPlayback(project: Project, startBeat: number = 0) {
    if (!this.ctx) return;
    this.stopPlayback();

    this.isPlaying = true;
    this.bpm = project.bpm;
    this.startOffsetBeat = startBeat;
    this.currentBeat = startBeat;
    this.playbackStartTime = this.ctx.currentTime;
    this.nextStepTime = this.ctx.currentTime;
    this.currentStep = Math.floor((startBeat * 4) % 16);

    // Schedule all track audio clips
    const secondsPerBeat = 60 / this.bpm;
    const anySolo = project.tracks.some((t) => t.solo);

    for (const track of project.tracks) {
      const nodes = this.setupTrackNodes(track);
      nodes.activeSources = [];

      // Solo override
      if (anySolo && !track.solo) {
        nodes.volumeNode.gain.setValueAtTime(0, this.ctx.currentTime);
      }

      for (const clip of track.clips) {
        if (!clip.buffer) continue;

        // Check if clip is within or after current beat
        const clipStartSec = clip.startBeat * secondsPerBeat;
        const currentSec = startBeat * secondsPerBeat;
        const clipEndSec = clipStartSec + clip.buffer.duration;

        if (clipEndSec <= currentSec) continue;

        const source = this.ctx.createBufferSource();
        source.buffer = clip.buffer;
        source.connect(nodes.inputNode);

        if (clipStartSec >= currentSec) {
          // Starts in future
          const when = this.playbackStartTime + (clipStartSec - currentSec);
          source.start(when, 0);
        } else {
          // Started in the past, play from offset
          const offset = currentSec - clipStartSec;
          source.start(this.playbackStartTime, offset);
        }

        nodes.activeSources.push(source);
      }
    }

    // Start sequencer scheduler loop
    this.scheduler(project);
    this.notifyState();
  }

  // Stop playback
  public stopPlayback() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }

    // Stop all active sources
    for (const nodes of this.trackNodes.values()) {
      for (const src of nodes.activeSources) {
        try {
          src.stop();
          src.disconnect();
        } catch {
          // Already stopped
        }
      }
      nodes.activeSources = [];
    }

    this.notifyState();
  }

  // Seek playhead
  public seekToBeat(project: Project, beat: number) {
    const wasPlaying = this.isPlaying;
    this.stopPlayback();
    this.currentBeat = Math.max(0, beat);
    if (wasPlaying) {
      this.startPlayback(project, this.currentBeat);
    } else {
      this.notifyStep(Math.floor((this.currentBeat * 4) % 16), this.currentBeat);
      this.notifyState();
    }
  }

  // Lookahead sequencer scheduler
  private scheduler(project: Project) {
    if (!this.ctx || !this.isPlaying) return;

    const lookahead = 0.025; // check every 25ms
    const scheduleAheadTime = 0.1; // schedule 100ms in advance
    const secondsPerBeat = 60 / project.bpm;
    const secondsPerStep = secondsPerBeat / 4; // 16th notes

    while (this.nextStepTime < this.ctx.currentTime + scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextStepTime, project);

      // Advance step
      this.nextStepTime += secondsPerStep;
      this.currentStep++;
      if (this.currentStep >= 16) {
        this.currentStep = 0;
      }
    }

    // Calculate elapsed beat
    const elapsedSec = this.ctx.currentTime - this.playbackStartTime;
    this.currentBeat = this.startOffsetBeat + elapsedSec / secondsPerBeat;

    // Loop logic
    if (project.loopEnabled && this.currentBeat >= project.loopEndBeat) {
      this.seekToBeat(project, project.loopStartBeat);
      return;
    }

    this.timerId = window.setTimeout(() => this.scheduler(project), lookahead * 1000);
  }

  private scheduleStep(step: number, time: number, project: Project) {
    // Drum track ID find
    const drumTrack = project.tracks.find((t) => t.type === 'drums');
    const trackId = drumTrack ? drumTrack.id : undefined;

    // Trigger scheduled drum steps
    for (const [soundId, steps] of Object.entries(project.stepGrid)) {
      if (steps[step]) {
        this.playScheduledDrum(soundId as DrumPadId, time, 0.9, trackId);
      }
    }

    // Metronome click on quarter notes (steps 0, 4, 8, 12)
    if (this.metronomeEnabled && step % 4 === 0) {
      this.playMetronomeClick(step === 0, time);
    }

    // Notify UI for active step indicator
    setTimeout(() => {
      this.notifyStep(step, this.currentBeat);
    }, Math.max(0, (time - this.ctx!.currentTime) * 1000));
  }

  private playScheduledDrum(padId: DrumPadId, time: number, velocity: number = 0.9, trackId?: string) {
    if (!this.ctx) return;
    let buffer = this.drumBuffers.get(padId);
    if (!buffer) {
      buffer = createProceduralDrumBuffer(this.ctx, padId, 'trap');
      this.drumBuffers.set(padId, buffer);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(velocity, time);
    source.connect(gain);

    if (trackId && this.trackNodes.has(trackId)) {
      gain.connect(this.trackNodes.get(trackId)!.inputNode);
    } else if (this.masterGain) {
      gain.connect(this.masterGain);
    }

    source.start(time);
  }

  // --- Microphone Recording System ---
  public async initMic(): Promise<boolean> {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        },
      });

      if (!this.ctx) await this.init();

      this.micSourceNode = this.ctx!.createMediaStreamSource(this.micStream);
      this.micAnalyser = this.ctx!.createAnalyser();
      this.micAnalyser.fftSize = 128;
      this.micSourceNode.connect(this.micAnalyser);
      return true;
    } catch (err) {
      console.warn('Microphone permission or hardware access error:', err);
      return false;
    }
  }

  public getMicInputLevel(): number {
    if (!this.micAnalyser) return 0;
    const data = new Uint8Array(this.micAnalyser.frequencyBinCount);
    this.micAnalyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / data.length) * 4);
  }

  public async startMicRecording(): Promise<void> {
    if (!this.micStream) {
      const ok = await this.initMic();
      if (!ok) throw new Error('Could not initialize microphone');
    }

    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(this.micStream!, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '',
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.start(50);
    this.isRecordingMic = true;
    this.notifyState();
  }

  public stopMicRecording(): Promise<AudioClip> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecordingMic) {
        reject(new Error('Recorder not active'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
          const arrayBuf = await blob.arrayBuffer();
          if (!this.ctx) await this.init();
          const audioBuffer = await this.ctx!.decodeAudioData(arrayBuf);
          const peaks = extractWaveformPeaks(audioBuffer, 80);

          const secondsPerBeat = 60 / this.bpm;
          const durationBeats = audioBuffer.duration / secondsPerBeat;

          const clip: AudioClip = {
            id: 'rec_' + Date.now(),
            trackId: '',
            name: `Mic Rec #${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
            startBeat: Math.floor(this.currentBeat * 4) / 4,
            durationBeats: Math.max(1, Math.round(durationBeats * 4) / 4),
            buffer: audioBuffer,
            waveformPeaks: peaks,
            type: 'recorded',
            color: '#ef4444',
          };

          this.isRecordingMic = false;
          this.notifyState();
          resolve(clip);
        } catch (err) {
          this.isRecordingMic = false;
          this.notifyState();
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  // --- Audio File Import ---
  public async loadAudioFile(file: File, trackId: string, startBeat: number = 0): Promise<AudioClip> {
    if (!this.ctx) await this.init();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await this.ctx!.decodeAudioData(arrayBuffer);
    const peaks = extractWaveformPeaks(buffer, 80);

    const secondsPerBeat = 60 / this.bpm;
    const durationBeats = buffer.duration / secondsPerBeat;

    return {
      id: 'import_' + Date.now(),
      trackId,
      name: file.name.replace(/\.[^/.]+$/, ''),
      startBeat,
      durationBeats: Math.round(durationBeats * 4) / 4,
      buffer,
      waveformPeaks: peaks,
      type: 'audio',
      color: '#3b82f6',
    };
  }

  // --- Full Offline Project WAV Export ---
  public async exportProjectWav(project: Project): Promise<Blob> {
    const secondsPerBeat = 60 / project.bpm;
    const totalDuration = Math.max(4, project.totalBeats * secondsPerBeat + 1.5);
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * totalDuration), sampleRate);

    // Setup master limiter on offline context
    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(0.85, 0);

    const limiter = offlineCtx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-1.0, 0);
    limiter.ratio.setValueAtTime(20.0, 0);
    masterGain.connect(limiter);
    limiter.connect(offlineCtx.destination);

    // Render tracks
    for (const track of project.tracks) {
      if (track.muted) continue;

      const trackGain = offlineCtx.createGain();
      trackGain.gain.setValueAtTime(track.volume, 0);

      const panner = offlineCtx.createStereoPanner();
      panner.pan.setValueAtTime(track.pan, 0);

      trackGain.connect(panner);
      panner.connect(masterGain);

      for (const clip of track.clips) {
        if (!clip.buffer) continue;
        const source = offlineCtx.createBufferSource();
        source.buffer = clip.buffer;
        source.connect(trackGain);
        const startTime = clip.startBeat * secondsPerBeat;
        source.start(startTime);
      }
    }

    // Render drum grid loops throughout project length
    const drumTrack = project.tracks.find((t) => t.type === 'drums');
    if (drumTrack && !drumTrack.muted) {
      const drumGain = offlineCtx.createGain();
      drumGain.gain.setValueAtTime(drumTrack.volume, 0);
      drumGain.connect(masterGain);

      const secondsPerStep = secondsPerBeat / 4;
      const totalSteps = Math.ceil((project.totalBeats * 4));

      for (let s = 0; s < totalSteps; s++) {
        const patternStep = s % 16;
        const time = s * secondsPerStep;

        for (const [soundId, steps] of Object.entries(project.stepGrid)) {
          if (steps[patternStep]) {
            const buf = createProceduralDrumBuffer(offlineCtx, soundId as DrumPadId, 'trap');
            const src = offlineCtx.createBufferSource();
            src.buffer = buf;
            src.connect(drumGain);
            src.start(time);
          }
        }
      }
    }

    const renderedBuffer = await offlineCtx.startRendering();
    return audioBufferToWav(renderedBuffer);
  }

  // --- Subscription Listeners ---
  public onStep(cb: (step: number, beat: number) => void): () => void {
    this.onStepListeners.add(cb);
    return () => this.onStepListeners.delete(cb);
  }

  public onStateChange(cb: () => void): () => void {
    this.onStateChangeListeners.add(cb);
    return () => this.onStateChangeListeners.delete(cb);
  }

  private notifyStep(step: number, beat: number) {
    for (const cb of this.onStepListeners) {
      cb(step, beat);
    }
  }

  private notifyState() {
    for (const cb of this.onStateChangeListeners) {
      cb();
    }
  }
}
