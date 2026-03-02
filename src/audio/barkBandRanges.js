function hzToBark(f) {
  return Math.max(0, (26.81 * f) / (1960 + f) - 0.53);
}

function barkToHz(z) {
  const zz = Math.max(0, z);
  const num = 1960 * (zz + 0.53);
  const den = 26.81 - (zz + 0.53);
  return den <= 1e-9 ? 20000 : num / den;
}

export function buildBarkBandRanges({
  sampleRate,
  fftSize,
  numBands = 24,
  fMin = 40,
  fMax = null,
  includeDC = false,
} = {}) {
  if (!sampleRate || !fftSize) throw new Error("buildBarkBandRanges requires sampleRate and fftSize");
  const nyquist = sampleRate / 2;
  const maxFreq = Math.min(fMax ?? nyquist, nyquist);
  const f0 = Math.max(1e-6, Math.min(fMin, maxFreq));
  const f1 = Math.max(f0 * 1.001, maxFreq);
  const maxBin = Math.floor(fftSize / 2);
  const binHz = sampleRate / fftSize;
  const fToBin = (f) => Math.max(0, Math.min(maxBin, Math.round(f / binHz)));
  const z0 = hzToBark(f0);
  const z1 = hzToBark(f1);
  const dz = (z1 - z0) / numBands;
  const edgesHz = [];
  for (let i = 0; i <= numBands; i += 1) edgesHz.push(barkToHz(z0 + dz * i));
  const edgesBin = edgesHz.map(fToBin);
  const minStartBin = includeDC ? 0 : 1;
  const ranges = [];
  let lastK1 = minStartBin - 1;
  for (let b = 0; b < numBands; b += 1) {
    let k0 = edgesBin[b];
    let k1 = edgesBin[b + 1];
    if (k1 <= k0) k1 = k0 + 1;
    k0 = Math.max(minStartBin, Math.min(maxBin, k0));
    k1 = Math.max(minStartBin, Math.min(maxBin, k1));
    if (k0 <= lastK1) k0 = lastK1 + 1;
    if (k1 < k0) k1 = k0;
    if (k0 > maxBin) break;
    if (b === numBands - 1 || k1 >= maxBin) k1 = maxBin;
    ranges.push({ k0, k1, f0: k0 * binHz, f1: k1 * binHz });
    lastK1 = k1;
    if (k1 >= maxBin) break;
  }
  return ranges;
}
