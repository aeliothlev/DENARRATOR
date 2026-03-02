import { hannWindow, istft, stft } from "../analysis/stft.js";
import { clamp, lerp } from "../utils/math.js";

function smoothStep01(t) {
  return t * t * (3 - 2 * t);
}

function wrapPhase(p) {
  let x = p;
  while (x <= -Math.PI) x += Math.PI * 2;
  while (x > Math.PI) x -= Math.PI * 2;
  return x;
}

function shortestAngleDelta(from, to) {
  return wrapPhase(to - from);
}

function angleLerp(a, b, t) {
  return wrapPhase(a + shortestAngleDelta(a, b) * t);
}

function chooseFftSize(sampleRate, durationMs) {
  if (sampleRate >= 88200 || durationMs > 1400) return 4096;
  if (sampleRate >= 48000 || durationMs > 350) return 2048;
  return 1024;
}

function pickFrame(frames, normPos) {
  const index = Math.round(clamp(normPos, 0, 1) * Math.max(0, frames.length - 1));
  return frames[index];
}

export function generateSpectralBridge({ tailWindow, headWindow, sampleRate, durationMs, params }) {
  const outLen = Math.max(1, Math.round((sampleRate * durationMs) / 1000));
  const fftSize = chooseFftSize(sampleRate, durationMs);
  const hopSize = fftSize >> 2;
  const window = hannWindow(fftSize);

  const analysisA = stft(tailWindow, { fftSize, hopSize, window });
  const analysisB = stft(headWindow, { fftSize, hopSize, window });

  const tilt = clamp(params?.tilt ?? 0, -1, 1);
  const transientProtect = clamp(params?.transientProtect ?? 0.6, 0, 1);

  const frameCount = Math.max(2, 1 + Math.ceil(Math.max(0, outLen - fftSize) / hopSize));
  const bins = fftSize / 2 + 1;
  const phaseAcc = new Float32Array(bins);
  const expectedAdvance = new Float32Array(bins);
  for (let k = 0; k < bins; k += 1) {
    expectedAdvance[k] = (2 * Math.PI * hopSize * k) / fftSize;
  }

  const synthFrames = [];

  for (let f = 0; f < frameCount; f += 1) {
    const pos = f / Math.max(1, frameCount - 1);
    const alpha = smoothStep01(pos);
    const aFrame = pickFrame(analysisA.frames, pos);
    const bFrame = pickFrame(analysisB.frames, pos);

    const mag = new Float32Array(bins);
    const phase = new Float32Array(bins);

    for (let k = 0; k < bins; k += 1) {
      const freqNorm = bins > 1 ? k / (bins - 1) : 0;
      const aMag = aFrame.mag[k];
      const bMag = bFrame.mag[k];

      let m = lerp(aMag, bMag, alpha);

      const tiltFactor = Math.pow(2, tilt * ((freqNorm - 0.5) * 2));
      m *= tiltFactor;

      const relFlux = Math.abs(bMag - aMag) / (aMag + bMag + 1e-9);
      const protect = transientProtect * clamp(relFlux, 0, 1);
      m = m * (1 - protect) + Math.max(aMag, bMag) * protect;
      mag[k] = m;

      const targetPhase = angleLerp(aFrame.phase[k], bFrame.phase[k], alpha);
      if (f === 0) {
        phaseAcc[k] = targetPhase;
      } else {
        phaseAcc[k] = wrapPhase(phaseAcc[k] + expectedAdvance[k]);
        const lock = 0.14 + protect * 0.46;
        phaseAcc[k] = wrapPhase(phaseAcc[k] + shortestAngleDelta(phaseAcc[k], targetPhase) * lock);
      }
      phase[k] = phaseAcc[k];
    }

    synthFrames.push({ mag, phase });
  }

  const bridge = istft(synthFrames, {
    fftSize,
    hopSize,
    window,
    outputLength: outLen,
  });

  return new Float32Array(bridge);
}
