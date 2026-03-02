function smoothStep01(t) {
  return t * t * (3 - 2 * t);
}

function smoothWithAmount(t, amount) {
  const curved = smoothStep01(t);
  return curved * (1 - amount) + Math.pow(curved, 1.8) * amount;
}

function bestLag(tail, head, maxShift) {
  let best = 0;
  let bestScore = -Infinity;
  const n = Math.min(tail.length, head.length);
  if (n < 2) return 0;

  for (let lag = -maxShift; lag <= maxShift; lag += 1) {
    let score = 0;
    for (let i = 0; i < n; i += 1) {
      const j = i + lag;
      if (j < 0 || j >= n) continue;
      score += tail[i] * head[j];
    }
    if (score > bestScore) {
      bestScore = score;
      best = lag;
    }
  }
  return best;
}

function nearestZeroCrossing(data, fromIndex) {
  let bestIndex = Math.max(0, Math.min(data.length - 1, fromIndex));
  let bestAbs = Math.abs(data[bestIndex] || 0);
  const radius = Math.min(96, data.length);
  for (let d = 1; d < radius; d += 1) {
    const left = fromIndex - d;
    const right = fromIndex + d;
    if (left >= 0) {
      const a = Math.abs(data[left]);
      if (a < bestAbs) {
        bestAbs = a;
        bestIndex = left;
      }
    }
    if (right < data.length) {
      const a = Math.abs(data[right]);
      if (a < bestAbs) {
        bestAbs = a;
        bestIndex = right;
      }
    }
  }
  return bestIndex;
}

export function generateAlignBridge({ tailWindow, headWindow, sampleRate, durationMs, params }) {
  const outLen = Math.max(1, Math.round((sampleRate * durationMs) / 1000));
  const out = new Float32Array(outLen);
  const searchRangeMs = params?.searchRangeMs ?? 20;
  const smoothness = params?.smoothness ?? 0.5;
  const maxShift = Math.max(1, Math.round((sampleRate * searchRangeMs) / 1000));

  const lag = bestLag(tailWindow, headWindow, maxShift);
  const tailStartBase = Math.max(0, tailWindow.length - outLen);
  const tailStart = nearestZeroCrossing(tailWindow, tailStartBase);
  const headStart = nearestZeroCrossing(headWindow, Math.max(0, lag));

  for (let i = 0; i < outLen; i += 1) {
    const t = i / Math.max(1, outLen - 1);
    const s = smoothWithAmount(t, smoothness);
    const ai = Math.min(tailWindow.length - 1, tailStart + i);
    const bi = Math.min(headWindow.length - 1, headStart + i);
    const a = ai >= 0 ? tailWindow[ai] : 0;
    const b = bi >= 0 ? headWindow[bi] : 0;
    out[i] = a * (1 - s) + b * s;
  }

  return out;
}
