import { clamp, lerp } from "../utils/math.js";

function fract(x) {
  return x - Math.floor(x);
}

function sampleLinear(wave, pos) {
  if (!wave || wave.length === 0) return 0;
  if (wave.length === 1) return wave[0];
  const wrapped = fract(pos / wave.length) * wave.length;
  const i0 = Math.floor(wrapped);
  const i1 = (i0 + 1) % wave.length;
  const t = wrapped - i0;
  return wave[i0] * (1 - t) + wave[i1] * t;
}

function createSeededRandom(seed) {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function ensureWaveBAligned(waveA, waveB, mode = "resample") {
  if (!waveB || waveB.length === 0) return null;
  if (waveB.length === waveA.length) return waveB;

  if (mode === "cycle") {
    const cycled = new Float32Array(waveA.length);
    for (let i = 0; i < cycled.length; i += 1) {
      cycled[i] = waveB[i % waveB.length];
    }
    return cycled;
  }

  const aligned = new Float32Array(waveA.length);
  if (waveB.length === 1) {
    aligned.fill(waveB[0]);
    return aligned;
  }

  for (let i = 0; i < aligned.length; i += 1) {
    const pos = (i / Math.max(1, aligned.length - 1)) * (waveB.length - 1);
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, waveB.length - 1);
    const t = pos - i0;
    aligned[i] = waveB[i0] * (1 - t) + waveB[i1] * t;
  }
  return aligned;
}

function smoothCosine(x) {
  const c = clamp(x, 0, 1);
  return 0.5 - 0.5 * Math.cos(Math.PI * c);
}

export function resolveMirrorIndex(input, t0Norm, zeroSnap) {
  if (!input || input.length < 2) return 0;
  const target = clamp(Math.round(clamp(Number(t0Norm ?? 0.5), 0, 1) * (input.length - 1)), 0, input.length - 1);
  if (!zeroSnap) return target;

  const maxRadius = Math.min(input.length - 2, Math.max(32, Math.floor(input.length * 0.1)));
  let best = target;
  let bestDist = Number.POSITIVE_INFINITY;

  const considerCrossing = (i) => {
    if (i < 0 || i >= input.length - 1) return;
    const a = input[i];
    const b = input[i + 1];
    if (a === 0) {
      const d = Math.abs(i - target);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
      return;
    }
    if (b === 0) {
      const d = Math.abs(i + 1 - target);
      if (d < bestDist) {
        bestDist = d;
        best = i + 1;
      }
      return;
    }
    if (a > 0 === b > 0) return;
    const candidate = Math.abs(a) <= Math.abs(b) ? i : i + 1;
    const d = Math.abs(candidate - target);
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  };

  for (let r = 0; r <= maxRadius; r += 1) {
    considerCrossing(target - r);
    considerCrossing(target + r);
    if (bestDist <= r) break;
  }
  return best;
}

export function evaluateParameter(param, sampleIndex, waveA, waveB) {
  if (!param || param.source === "constant") return Number(param?.value ?? 0);
  if (param.source === "waveA") {
    return waveA && sampleIndex < waveA.length ? waveA[sampleIndex] : 0;
  }
  if (param.source === "waveB") {
    return waveB && sampleIndex < waveB.length ? waveB[sampleIndex] : 0;
  }
  return Number(param?.value ?? 0);
}

function processPower(input, param, waveA, waveB) {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const x = input[i];
    const p = clamp(evaluateParameter(param, i, waveA, waveB), 0.1, 4);
    out[i] = Math.sign(x) * Math.pow(Math.abs(x), p);
  }
  return out;
}

function processSaturation(input, param, waveA, waveB) {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const x = input[i];
    const k = clamp(evaluateParameter(param, i, waveA, waveB), 0, 10);
    out[i] = Math.tanh(k * x);
  }
  return out;
}

function processSelfInteraction(input, param, waveA, waveB) {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const x = input[i];
    const alpha = clamp(evaluateParameter(param, i, waveA, waveB), -2, 2);
    out[i] = x + alpha * x * x;
  }
  return out;
}

function processGlobalMatrix(input, param, waveA, waveB) {
  const out = new Float32Array(input.length);
  let sum = 0;
  for (let i = 0; i < input.length; i += 1) sum += input[i];

  for (let i = 0; i < input.length; i += 1) {
    const a = clamp(evaluateParameter(param, i, waveA, waveB), -1, 1);
    out[i] = input[i] + a * (sum - input[i]);
  }
  return out;
}

function processPermutation(input, mode = "identity", seed = 1) {
  const out = new Float32Array(input.length);
  if (mode === "identity") {
    out.set(input);
    return out;
  }

  if (mode === "reverse") {
    for (let i = 0; i < input.length; i += 1) out[i] = input[input.length - 1 - i];
    return out;
  }

  if (mode === "block-swap") {
    const half = Math.floor(input.length / 2);
    out.set(input.subarray(half), 0);
    out.set(input.subarray(0, half), input.length - half);
    return out;
  }

  if (mode === "random-seeded") {
    const rng = createSeededRandom(seed);
    const perm = new Uint32Array(input.length);
    for (let i = 0; i < perm.length; i += 1) perm[i] = i;
    for (let i = perm.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = perm[i];
      perm[i] = perm[j];
      perm[j] = tmp;
    }
    for (let i = 0; i < input.length; i += 1) out[i] = input[perm[i]];
    return out;
  }

  out.set(input);
  return out;
}

function processTimeStretch(input, param, waveA, waveB) {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const lambda = clamp(evaluateParameter(param, i, waveA, waveB), 0.25, 4);
    out[i] = sampleLinear(input, i * lambda);
  }
  return out;
}

function mirrorBlendAtIndex(input, mirrored, index, t0, crossfadeWidth) {
  if (crossfadeWidth <= 0) return mirrored;
  const dist = Math.abs(index - t0);
  if (dist > crossfadeWidth) return mirrored;
  const w = smoothCosine(dist / crossfadeWidth);
  return input[index] * w + mirrored * (1 - w);
}

function processMirror1(input, op) {
  if (!input || input.length === 0) return new Float32Array(0);
  const n = input.length;
  const mode = op?.mirror1?.mode === "extend" ? "extend" : "replace";
  const side = op?.mirror1?.side === "right-left" ? "right-left" : "left-right";
  const blend = clamp(Number(op?.mirror1?.blend ?? 1), 0, 1);
  const crossfade = clamp(Number(op?.mirror1?.crossfade ?? 0), 0, 1);
  const t0 = resolveMirrorIndex(input, op?.t0Norm, Boolean(op?.zeroSnap));
  const crossfadeWidth = Math.round(crossfade * Math.max(1, Math.floor(n * 0.1)));

  if (mode === "replace") {
    // Replace mode keeps length constant and mirrors across t0 on one side.
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      let mirrored = input[i];
      if (side === "left-right") {
        if (i >= t0) mirrored = input[clamp(2 * t0 - i, 0, n - 1)];
      } else if (i <= t0) {
        mirrored = input[clamp(2 * t0 - i, 0, n - 1)];
      }
      const withCrossfade = mirrorBlendAtIndex(input, mirrored, i, t0, crossfadeWidth);
      out[i] = lerp(input[i], withCrossfade, blend);
    }
    return out;
  }

  if (side === "left-right") {
    // Extend mode (left->right): L_new = 2*t0 + 1
    const newLen = Math.max(1, 2 * t0 + 1);
    const out = new Float32Array(newLen);
    const localFade = Math.min(crossfadeWidth, t0);
    for (let i = 0; i < newLen; i += 1) {
      const original = i < n ? input[i] : input[clamp(2 * t0 - i, 0, n - 1)];
      const mirrored = i <= t0 ? input[i] : input[clamp(2 * t0 - i, 0, n - 1)];
      const withCrossfade = mirrorBlendAtIndex(input, mirrored, clamp(i, 0, n - 1), t0, localFade);
      out[i] = lerp(original, withCrossfade, blend);
    }
    return out;
  }

  // Extend mode (right->left): reverse, apply left->right logic, then reverse back.
  const reversed = reverseArray(input);
  const mirroredT0 = n - 1 - t0;
  const mirrorOp = {
    mirror1: {
      mode: "extend",
      side: "left-right",
      blend,
      crossfade,
    },
    t0Norm: mirroredT0 / Math.max(1, n - 1),
    zeroSnap: false,
  };
  return reverseArray(processMirror1(reversed, mirrorOp));
}

function smoothSignal(input, windowSize) {
  const w = Math.max(1, Math.round(windowSize));
  if (w <= 1 || input.length < 3) return new Float32Array(input);
  const out = new Float32Array(input.length);
  const prefix = new Float64Array(input.length + 1);
  for (let i = 0; i < input.length; i += 1) prefix[i + 1] = prefix[i] + input[i];
  const half = Math.floor(w / 2);
  for (let i = 0; i < input.length; i += 1) {
    const a = Math.max(0, i - half);
    const b = Math.min(input.length - 1, i + half);
    const sum = prefix[b + 1] - prefix[a];
    out[i] = sum / Math.max(1, b - a + 1);
  }
  return out;
}

function reverseArray(input) {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i += 1) out[i] = input[input.length - 1 - i];
  return out;
}

function makeProjectionWindow(length, center, widthNorm) {
  const out = new Float32Array(length);
  const half = Math.max(1, Math.round(clamp(widthNorm, 0.001, 1) * length * 0.5));
  for (let i = 0; i < length; i += 1) {
    const d = Math.abs(i - center) / half;
    out[i] = d <= 1 ? 0.5 * (1 + Math.cos(Math.PI * d)) : 0;
  }
  return out;
}

function processMirror2(input, op, waveBOriginal) {
  if (!input || input.length === 0) return new Float32Array(0);
  if (!waveBOriginal || waveBOriginal.length === 0) return new Float32Array(input);

  const alignMode = op?.mirror2?.alignMode === "cycle" ? "cycle" : "resample";
  const alignedB = ensureWaveBAligned(input, waveBOriginal, alignMode);
  if (!alignedB) return new Float32Array(input);

  const n = input.length;
  const t0 = resolveMirrorIndex(input, op?.t0Norm, Boolean(op?.zeroSnap));
  const width = clamp(Number(op?.mirror2?.projectionWidth ?? 0.35), 0.001, 1);
  const smoothness = clamp(Number(op?.mirror2?.envelopeSmoothness ?? 64), 1, 4096);
  const intensity = clamp(Number(op?.mirror2?.intensity ?? 1), 0, 1);
  const normalizeA = Boolean(op?.mirror2?.normalizeA);
  const signedMorphology = Boolean(op?.mirror2?.signedMorphology);
  const reverseMorphology = Boolean(op?.mirror2?.reverseMorphology);
  const thresholdMode = op?.mirror2?.thresholdMode === "hard" ? "hard" : "soft";
  const threshold = clamp(Number(op?.mirror2?.threshold ?? 0), 0, 1);

  const morphology = new Float32Array(n);
  for (let i = 0; i < n; i += 1) morphology[i] = signedMorphology ? alignedB[i] : Math.abs(alignedB[i]);
  let envelope = smoothSignal(morphology, smoothness);
  if (reverseMorphology) envelope = reverseArray(envelope);
  let envPeak = 0;
  for (let i = 0; i < n; i += 1) envPeak = Math.max(envPeak, Math.abs(envelope[i]));
  if (envPeak > 1e-9) {
    const inv = 1 / envPeak;
    for (let i = 0; i < n; i += 1) envelope[i] *= inv;
  }
  if (threshold > 0) {
    for (let i = 0; i < n; i += 1) {
      const a = Math.abs(envelope[i]);
      if (thresholdMode === "hard") {
        envelope[i] = a >= threshold ? envelope[i] : 0;
      } else {
        if (a <= threshold) {
          envelope[i] = 0;
        } else {
          const t = (a - threshold) / Math.max(1e-6, 1 - threshold);
          envelope[i] = envelope[i] * (0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1)));
        }
      }
    }
  }
  const window = makeProjectionWindow(n, t0, width);

  let peakA = 0;
  if (normalizeA) {
    for (let i = 0; i < n; i += 1) peakA = Math.max(peakA, Math.abs(input[i]));
  }
  const invPeak = peakA > 1e-9 ? 1 / peakA : 1;

  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const aNorm = normalizeA ? input[i] * invPeak : input[i];
    const projected = aNorm * envelope[i] * window[i];
    out[i] = lerp(input[i], projected, intensity);
  }
  return out;
}

export function synthesizeInputWave({ mode, sampleRate, lengthMs, frequency, seed }) {
  const sr = Math.max(8000, Math.round(sampleRate || 44100));
  const n = Math.max(1, Math.round((sr * Math.max(20, lengthMs || 1000)) / 1000));
  const freq = clamp(Number(frequency || 220), 20, 4000);
  const out = new Float32Array(n);
  const rng = createSeededRandom(seed || 1);

  for (let i = 0; i < n; i += 1) {
    const t = i / sr;
    const phase = 2 * Math.PI * freq * t;
    if (mode === "sine") out[i] = Math.sin(phase);
    else if (mode === "square") out[i] = Math.sin(phase) >= 0 ? 1 : -1;
    else if (mode === "saw") out[i] = 2 * fract(freq * t) - 1;
    else if (mode === "noise") out[i] = rng() * 2 - 1;
    else if (mode === "impulse") out[i] = i === 0 ? 1 : 0;
    else out[i] = Math.sin(phase);
  }

  return out;
}

export function runWaveAlgebra({ waveA, waveB, operators }) {
  const input = waveA || new Float32Array(0);
  let current = new Float32Array(input);

  for (const op of operators || []) {
    if (!op?.enabled) continue;
    const refB = ensureWaveBAligned(current, waveB);
    if (op.type === "power") {
      current = processPower(current, op.param, current, refB);
      continue;
    }
    if (op.type === "saturation") {
      current = processSaturation(current, op.param, current, refB);
      continue;
    }
    if (op.type === "selfInteraction") {
      current = processSelfInteraction(current, op.param, current, refB);
      continue;
    }
    if (op.type === "globalMatrix") {
      current = processGlobalMatrix(current, op.param, current, refB);
      continue;
    }
    if (op.type === "permutation") {
      current = processPermutation(current, op.mode, op.seed);
      continue;
    }
    if (op.type === "timeStretch") {
      current = processTimeStretch(current, op.param, current, refB);
      continue;
    }
    if (op.type === "mirror") {
      if (op.mode === "mirror2") {
        current = processMirror2(current, op, waveB);
      } else {
        current = processMirror1(current, op);
      }
    }
  }

  return current;
}
