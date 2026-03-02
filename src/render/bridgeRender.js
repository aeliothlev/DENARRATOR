import {
  getHeadWindowFromMono,
  getMonoChannel,
  getTailWindowFromMono,
  resampleLinear,
} from "../audio/io.js";
import { concatMono } from "../audio/concat.js";
import { engineMap } from "../engines/index.js";
import { runWaveAlgebra, synthesizeInputWave } from "../engines/waveAlgebraEngine.js";

function normalizePeak(data, target = 0.98) {
  let peak = 0;
  for (let i = 0; i < data.length; i += 1) {
    const a = Math.abs(data[i]);
    if (a > peak) peak = a;
  }
  if (peak > target && peak > 0) {
    const g = target / peak;
    for (let i = 0; i < data.length; i += 1) data[i] *= g;
  }
}

function applyMinLevelFloor(data, minLevelDb) {
  const threshold = Math.pow(10, minLevelDb / 20);
  for (let i = 0; i < data.length; i += 1) {
    const s = data[i];
    const a = Math.abs(s);
    if (a > 1e-9 && a < threshold) {
      data[i] = s < 0 ? -threshold : threshold;
    }
  }
}

export function renderBridgeOutput(state) {
  const clipA = state.clips.A;
  const clipB = state.clips.B;
  if (state.tab === "ALGEBRA") {
    const algebra = state.params.ALGEBRA || {};
    const sampleRate = clipA?.sampleRate || clipB?.sampleRate || 44100;
    const useClipA = algebra.inputMode === "clipA";
    if (useClipA && !clipA) {
      throw new Error("Clip A is required in clipA input mode.");
    }

    const waveA = useClipA
      ? getMonoChannel(clipA, Boolean(state.reverse?.A))
      : synthesizeInputWave({
        mode: algebra.inputMode,
        sampleRate,
        lengthMs: algebra.generator?.lengthMs,
        frequency: algebra.generator?.frequency,
        seed: algebra.generator?.seed,
      });

    const waveB = clipB ? getMonoChannel(clipB, Boolean(state.reverse?.B)) : null;
    const transformed = runWaveAlgebra({
      waveA,
      waveB,
      operators: algebra.operators || [],
    });

    normalizePeak(transformed);
    applyMinLevelFloor(transformed, state.params.common.minLevelDb);
    return {
      bridge: transformed,
      output: transformed,
      sampleRate,
    };
  }

  if (!clipA || !clipB) {
    throw new Error("Both clip A and clip B are required.");
  }

  const sampleRate = clipA.sampleRate;
  const clipAMono = getMonoChannel(clipA, Boolean(state.reverse?.A));
  const clipBInputMono = getMonoChannel(clipB, Boolean(state.reverse?.B));
  const clipBMono = clipB.sampleRate === sampleRate
    ? clipBInputMono
    : resampleLinear(clipBInputMono, clipB.sampleRate, sampleRate);

  const tailWindow = getTailWindowFromMono(clipAMono, sampleRate, state.params.common.windowMs);
  const headWindow = getHeadWindowFromMono(clipBMono, sampleRate, state.params.common.windowMs);
  const durationMs = state.params.common.durationMs;
  const generator = engineMap[state.tab];

  if (!generator) {
    throw new Error(`Unknown engine: ${state.tab}`);
  }

  const bridge = generator({
    tailWindow,
    headWindow,
    sampleRate,
    durationMs,
    params: state.params[state.tab],
  });
  normalizePeak(bridge);
  applyMinLevelFloor(bridge, state.params.common.minLevelDb);

  const full = concatMono([clipAMono, bridge, clipBMono]);
  normalizePeak(full);
  applyMinLevelFloor(full, state.params.common.minLevelDb);
  const output = state.params.common.exportMode === "bridge_only" ? bridge : full;

  return {
    bridge,
    output,
    sampleRate,
  };
}
