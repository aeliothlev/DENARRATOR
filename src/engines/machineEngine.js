import { generateAlignBridge } from "./alignEngine.js";

function estimateFreq(samples, sampleRate) {
  let zc = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const a = samples[i - 1];
    const b = samples[i];
    if ((a <= 0 && b > 0) || (a >= 0 && b < 0)) zc += 1;
  }
  const duration = samples.length / sampleRate;
  if (duration <= 0) return 110;
  return Math.max(40, Math.min(2000, zc / (2 * duration)));
}

export function generateMachineBridge({ tailWindow, headWindow, sampleRate, durationMs, params }) {
  const outLen = Math.max(1, Math.round((sampleRate * durationMs) / 1000));
  const base = generateAlignBridge({
    tailWindow,
    headWindow,
    sampleRate,
    durationMs,
    params: { searchRangeMs: 14, smoothness: 0.7 },
  });

  const out = new Float32Array(outLen);
  const partials = Math.max(1, Math.min(128, Math.round(params?.partials ?? 48)));
  const noiseMix = Math.max(0, Math.min(1, params?.noiseMix ?? 0.25));
  const fA = estimateFreq(tailWindow, sampleRate);
  const fB = estimateFreq(headWindow, sampleRate);
  let phase = 0;

  for (let i = 0; i < outLen; i += 1) {
    const t = i / Math.max(1, outLen - 1);
    const s = t * t * (3 - 2 * t);
    const f = fA * (1 - s) + fB * s;
    let harm = 0;
    for (let k = 1; k <= partials; k += 1) {
      const amp = 1 / (k * k);
      harm += Math.sin(phase * k) * amp;
    }
    const env = Math.sin(Math.PI * t);
    const noise = (Math.random() * 2 - 1) * env * noiseMix * 0.4;
    out[i] = base[i] * (1 - noiseMix * 0.35) + (harm * 0.6 + noise) * 0.18;
    phase += (2 * Math.PI * f) / sampleRate;
  }

  return out;
}
