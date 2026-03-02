export function msToSamples(ms, sampleRate) {
  return Math.max(1, Math.round((ms * sampleRate) / 1000));
}
