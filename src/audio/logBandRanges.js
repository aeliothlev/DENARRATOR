export function buildLogBandRanges({
  sampleRate,
  fftSize,
  numBands = 24,
  fMin = 40,
  fMax = null,
  includeDC = false,
} = {}) {
  if (!sampleRate || !fftSize) throw new Error("buildLogBandRanges requires sampleRate and fftSize");
  const nyquist = sampleRate / 2;
  const maxFreq = fMax ?? nyquist;
  const f0 = Math.max(1e-6, Math.min(fMin, nyquist));
  const f1 = Math.max(f0 * 1.001, Math.min(maxFreq, nyquist));
  const maxBin = Math.floor(fftSize / 2);
  const binHz = sampleRate / fftSize;
  const fToBin = (f) => Math.max(0, Math.min(maxBin, Math.round(f / binHz)));
  const edgesHz = [];
  for (let i = 0; i <= numBands; i += 1) {
    const t = i / numBands;
    edgesHz.push(f0 * Math.pow(f1 / f0, t));
  }
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
