import { buildLogBandRanges } from "./logBandRanges.js";
import { buildBarkBandRanges } from "./barkBandRanges.js";
import { buildMelBandRanges } from "./melBandRanges.js";

export function chooseBandConfig({
  sampleRate,
  fftSize,
  scale = "BARK",
  includeDC = false,
  preferAir = false,
} = {}) {
  const nyquist = sampleRate / 2;
  const fMin = 40;
  const fMaxCap = preferAir ? 16000 : 14000;
  const fMax = Math.min(nyquist, fMaxCap);
  let numBands;
  if (fftSize <= 1024) numBands = 16;
  else if (fftSize <= 2048) numBands = 24;
  else if (fftSize <= 4096) numBands = 32;
  else numBands = 40;
  const maxBin = Math.floor(fftSize / 2);
  const maxReasonable = Math.max(8, Math.floor(maxBin / 20));
  numBands = Math.min(numBands, maxReasonable);
  return { scale, numBands, fMin, fMax, includeDC };
}

export function buildAutoBandRanges({
  sampleRate,
  fftSize,
  scale = "BARK",
  includeDC = false,
  preferAir = false,
} = {}) {
  const cfg = chooseBandConfig({ sampleRate, fftSize, scale, includeDC, preferAir });
  const common = {
    sampleRate,
    fftSize,
    numBands: cfg.numBands,
    fMin: cfg.fMin,
    fMax: cfg.fMax,
    includeDC: cfg.includeDC,
  };
  if (cfg.scale === "MEL") return buildMelBandRanges(common);
  if (cfg.scale === "LOG") return buildLogBandRanges(common);
  return buildBarkBandRanges(common);
}
