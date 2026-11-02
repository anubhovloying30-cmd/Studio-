import { DrumPadId } from '../types/studio';

export function createProceduralDrumBuffer(
  ctx: BaseAudioContext,
  sound: DrumPadId,
  kitType: 'trap' | 'lofi' | 'acoustic' | 'electro' = 'trap'
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  let duration = 0.5;

  if (sound === 'sub808' || sound === 'crash' || sound === 'ride') {
    duration = 1.6;
  } else if (sound === 'hatClosed' || sound === 'rim' || sound === 'shaker' || sound === 'snap') {
    duration = 0.15;
  } else if (sound === 'kick' || sound === 'snare' || sound === 'clap') {
    duration = 0.35;
  }

  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  switch (sound) {
    case 'kick': {
      const pitchStart = kitType === 'acoustic' ? 120 : 160;
      const pitchEnd = kitType === 'acoustic' ? 45 : 38;
      const decayTime = 0.22;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * (1 / decayTime) * 6);
        const freq = pitchEnd + (pitchStart - pitchEnd) * Math.exp(-t * 35);
        const sample = Math.sin(2 * Math.PI * freq * t) * env;
        // subtle click on attack
        const click = t < 0.005 ? (Math.random() * 2 - 1) * 0.4 * (1 - t / 0.005) : 0;
        const val = Math.tanh((sample + click) * 1.3);
        left[i] = val;
        right[i] = val;
      }
      break;
    }

    case 'sub808': {
      const startFreq = 75;
      const endFreq = 38;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const freq = endFreq + (startFreq - endFreq) * Math.exp(-t * 12);
        const env = Math.exp(-t * 2.2);
        // rich harmonics saturation
        const raw = Math.sin(2 * Math.PI * freq * t);
        const val = Math.tanh(raw * 1.6) * env * 0.9;
        left[i] = val;
        right[i] = val;
      }
      break;
    }

    case 'snare': {
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const toneEnv = Math.exp(-t * 30);
        const noiseEnv = Math.exp(-t * 16);
        const toneFreq = kitType === 'acoustic' ? 190 : 220;
        const tone = Math.sin(2 * Math.PI * toneFreq * t) * toneEnv * 0.5;
        const noise = (Math.random() * 2 - 1) * noiseEnv * 0.7;
        const val = Math.tanh((tone + noise) * 1.2);
        left[i] = val;
        right[i] = val;
      }
      break;
    }

    case 'clap': {
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        let env = 0;
        // Multiple rapid pre-bursts
        if (t < 0.01) env += Math.exp(-t * 120);
        if (t >= 0.012 && t < 0.022) env += Math.exp(-(t - 0.012) * 120);
        if (t >= 0.024 && t < 0.035) env += Math.exp(-(t - 0.024) * 100);
        if (t >= 0.035) env += Math.exp(-(t - 0.035) * 22) * 1.1;
        const noise = (Math.random() * 2 - 1) * env * 0.8;
        left[i] = noise * 0.95;
        right[i] = noise * 1.05; // slight stereo spread
      }
      break;
    }

    case 'hatClosed': {
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 70);
        const noise = (Math.random() * 2 - 1);
        // metallic high-pass feel
        const metallic = (Math.sin(2 * Math.PI * 8200 * t) + Math.sin(2 * Math.PI * 12400 * t)) * 0.3;
        const val = (noise * 0.7 + metallic) * env * 0.7;
        left[i] = val;
        right[i] = val;
      }
      break;
    }

    case 'hatOpen': {
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 9);
        const noise = (Math.random() * 2 - 1);
        const metallic = (Math.sin(2 * Math.PI * 7500 * t) + Math.sin(2 * Math.PI * 11200 * t)) * 0.35;
        const val = (noise * 0.75 + metallic) * env * 0.65;
        left[i] = val;
        right[i] = val;
      }
      break;
    }

    case 'tomLow':
    case 'tomMid':
    case 'tomHi': {
      const baseFreq = sound === 'tomLow' ? 85 : sound === 'tomMid' ? 125 : 175;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const freq = baseFreq * (1 + 0.8 * Math.exp(-t * 30));
        const env = Math.exp(-t * 12);
        const tone = Math.sin(2 * Math.PI * freq * t) * env;
        const click = t < 0.004 ? (Math.random() * 2 - 1) * 0.3 : 0;
        const val = (tone + click) * 0.8;
        left[i] = val;
        right[i] = val;
      }
      break;
    }

    case 'rim':
    case 'snap': {
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 110);
        const tone = Math.sin(2 * Math.PI * 1850 * t) * env * 0.6;
        const noise = (Math.random() * 2 - 1) * env * 0.4;
        const val = (tone + noise);
        left[i] = val;
        right[i] = val;
      }
      break;
    }

    case 'shaker': {
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        // soft attack and decay
        const env = Math.sin(Math.min(1, t / 0.03) * Math.PI * 0.5) * Math.exp(-t * 35);
        const noise = (Math.random() * 2 - 1) * env * 0.6;
        left[i] = noise;
        right[i] = noise;
      }
      break;
    }

    case 'crash':
    case 'ride': {
      const decayRate = sound === 'crash' ? 3.5 : 2.5;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * decayRate);
        const noise = (Math.random() * 2 - 1);
        const ring = (
          Math.sin(2 * Math.PI * 3400 * t) +
          Math.sin(2 * Math.PI * 5200 * t) +
          Math.sin(2 * Math.PI * 8700 * t)
        ) * 0.2;
        const val = (noise * 0.6 + ring) * env * 0.6;
        left[i] = val * 0.95;
        right[i] = val * 1.05;
      }
      break;
    }

    case 'perc':
    case 'fx':
    default: {
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 20);
        const freq = 600 + 400 * Math.sin(2 * Math.PI * 15 * t);
        const tone = Math.sin(2 * Math.PI * freq * t) * env * 0.7;
        left[i] = tone;
        right[i] = tone;
      }
      break;
    }
  }

  return buffer;
}

export function extractWaveformPeaks(buffer: AudioBuffer, numPeaks: number = 60): number[] {
  const channelData = buffer.getChannelData(0);
  const step = Math.floor(channelData.length / numPeaks);
  const peaks: number[] = [];

  for (let i = 0; i < numPeaks; i++) {
    const start = i * step;
    const end = Math.min(start + step, channelData.length);
    let max = 0;
    for (let j = start; j < end; j++) {
      const val = Math.abs(channelData[j]);
      if (val > max) max = val;
    }
    peaks.push(Math.min(1, max));
  }

  return peaks;
}
