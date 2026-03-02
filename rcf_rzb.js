const MAX_SLOTS = 10;
const MIN_TARGET_SEC = 0.2;
const MAX_TARGET_SEC = 12.0;
const MAX_SLICE_COUNT = 256;

const FLAVORS = ["grind", "hybrid", "smooth"];
const SHAPES = ["sine", "tri", "rand"];

const PRESETS = [
  {
    id: "rzb_grind",
    name: "RZB GRIND",
    params: { flavor: "grind", intensity: 0.85, smooth: 0.12, seed: "random", timewarp: { enabled: true, rateSec: 1.6, depth: 0.85, shape: "tri" } },
  },
  {
    id: "rcf_hybrid_drift",
    name: "RCF HYBRID DRIFT",
    params: { flavor: "hybrid", intensity: 0.62, smooth: 0.42, seed: 404, timewarp: { enabled: true, rateSec: 5.5, depth: 0.55, shape: "sine" } },
  },
  {
    id: "smooth_glue",
    name: "SMOOTH GLUE",
    params: { flavor: "smooth", intensity: 0.38, smooth: 0.78, seed: 12, timewarp: { enabled: true, rateSec: 9.0, depth: 0.22, shape: "rand" } },
  },
  {
    id: "ghost_choir",
    name: "GHOST CHOIR",
    params: { flavor: "hybrid", intensity: 0.58, smooth: 0.62, seed: 606, timewarp: { enabled: true, rateSec: 6.8, depth: 0.65, shape: "sine" } },
  },
  {
    id: "glass_engine",
    name: "GLASS ENGINE",
    params: { flavor: "smooth", intensity: 0.74, smooth: 0.48, seed: 909, timewarp: { enabled: true, rateSec: 3.4, depth: 0.42, shape: "tri" } },
  },
];

const refs = {
  slots: document.getElementById("slots"),
  loadedCount: document.getElementById("loadedCount"),
  modeBtn: document.getElementById("modeBtn"),
  rzbControls: document.getElementById("rzbControls"),
  centrifugeControls: document.getElementById("centrifugeControls"),
  flavorBtn: document.getElementById("flavorBtn"),
  intensityInput: document.getElementById("intensityInput"),
  intensityValue: document.getElementById("intensityValue"),
  smoothInput: document.getElementById("smoothInput"),
  smoothValue: document.getElementById("smoothValue"),
  seedInput: document.getElementById("seedInput"),
  reseedBtn: document.getElementById("reseedBtn"),
  timewarpBtn: document.getElementById("timewarpBtn"),
  rateInput: document.getElementById("rateInput"),
  rateValue: document.getElementById("rateValue"),
  depthInput: document.getElementById("depthInput"),
  depthValue: document.getElementById("depthValue"),
  shapeBtn: document.getElementById("shapeBtn"),
  fibBtn: document.getElementById("fibBtn"),
  baseInput: document.getElementById("baseInput"),
  baseValue: document.getElementById("baseValue"),
  minInput: document.getElementById("minInput"),
  minValue: document.getElementById("minValue"),
  maxInput: document.getElementById("maxInput"),
  maxValue: document.getElementById("maxValue"),
  xfadeInput: document.getElementById("xfadeInput"),
  xfadeValue: document.getElementById("xfadeValue"),
  renderBtn: document.getElementById("renderBtn"),
  playBtn: document.getElementById("playBtn"),
  loopBtn: document.getElementById("loopBtn"),
  saveBtn: document.getElementById("saveBtn"),
  sendBtn: document.getElementById("sendBtn"),
  presetSelect: document.getElementById("presetSelect"),
  applyPresetBtn: document.getElementById("applyPresetBtn"),
  renderInfo: document.getElementById("renderInfo"),
  status: document.getElementById("status"),
  waveCanvas: document.getElementById("waveCanvas"),
  fileInput: document.getElementById("fileInput"),
};

const state = {
  activeSlot: 0,
  slots: Array.from({ length: MAX_SLOTS }, (_, index) => ({
    id: `slot_${index + 1}`,
    name: "",
    source: null,
    buffer: null,
  })),
  params: {
    mode: "rzb",
    flavor: "hybrid",
    intensity: 0.6,
    smooth: 0.35,
    seed: 1337,
    fibomatix: true,
    baseMs: 25,
    minMs: 6,
    maxMs: 250,
    xfadeMs: 8,
    timewarp: {
      enabled: false,
      rateSec: 4.0,
      depth: 0.5,
      shape: "sine",
    },
  },
  output: null,
  render: {
    busy: false,
    tempExists: false,
    tempPath: null,
    outBuffer: null,
    lastError: null,
  },
  preview: { playing: false, loop: true },
};

const runtime = {
  audioContext: null,
  previewSource: null,
  previewAnalyser: null,
  previewMeterData: null,
  previewMeterRaf: null,
  previewOffsetSec: 0,
  previewStartOffsetSec: 0,
  previewStartedAtCtxSec: 0,
  previewDurationSec: 0,
  previewPlayToken: null,
  cliplibReqSeq: 1,
  pendingWavReqById: new Map(),
  midiMapMode: false,
  midiLastTrigger: {},
  sessionDirty: false,
  paths: null,
  renderSaveSeqByKey: {},
};

function ensureParamDefaults() {
  if (state.params.mode !== "rzb" && state.params.mode !== "centrifuge") state.params.mode = "rzb";
  if (!Number.isFinite(Number(state.params.baseMs))) state.params.baseMs = 25;
  if (!Number.isFinite(Number(state.params.minMs))) state.params.minMs = 6;
  if (!Number.isFinite(Number(state.params.maxMs))) state.params.maxMs = 250;
  if (!Number.isFinite(Number(state.params.xfadeMs))) state.params.xfadeMs = 8;
  if (typeof state.params.fibomatix !== "boolean") state.params.fibomatix = true;
  state.params.baseMs = clamp(Number(state.params.baseMs), 2, 1200);
  state.params.minMs = clamp(Number(state.params.minMs), 1, 1000);
  state.params.maxMs = clamp(Number(state.params.maxMs), 1, 2000);
  if (state.params.maxMs < state.params.minMs) state.params.maxMs = state.params.minMs;
  if (state.params.baseMs < state.params.minMs) state.params.baseMs = state.params.minMs;
  if (state.params.baseMs > state.params.maxMs) state.params.baseMs = state.params.maxMs;
  state.params.xfadeMs = clamp(Number(state.params.xfadeMs), 0, 80);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function setStatus(text, isError = false) {
  refs.status.textContent = text;
  refs.status.style.color = isError ? "#8a3a2d" : "#55585a";
}

function markSessionDirty() {
  runtime.sessionDirty = true;
}

function armMidiTarget(targetId, label) {
  if (!runtime.midiMapMode) return false;
  try {
    window.parent?.postMessage(
      {
        type: "MIDI_LEARN_ARM_TARGET",
        version: 1,
        targetId,
        label,
      },
      "*"
    );
  } catch {
    // ignore
  }
  return true;
}

function registerMidiTargets() {
  const targets = [
    { id: "rcf.intensity", label: "RCF Intensity", kind: "continuous", default: 0.6 },
    { id: "rcf.smooth", label: "RCF Smooth", kind: "continuous", default: 0.35 },
    { id: "rcf.timewarp.depth", label: "RCF Timewarp Depth", kind: "continuous", default: 0.5 },
    { id: "rcf.timewarp.rate", label: "RCF Timewarp Rate", kind: "continuous", default: 0.33 },
    { id: "rcf.action.reseed", label: "RCF Reseed", kind: "trigger", default: 0 },
    { id: "rcf.action.render", label: "RCF Render", kind: "trigger", default: 0 },
  ];
  try {
    window.parent?.postMessage(
      {
        type: "MIDI_TARGETS_REGISTER",
        version: 1,
        moduleId: "rcf",
        targets,
      },
      "*"
    );
  } catch {
    // ignore
  }
}

function applyMidiTarget(targetId, value01) {
  const v = clamp(Number(value01) || 0, 0, 1);
  if (targetId === "rcf.intensity") {
    refs.intensityInput.value = String(Math.round(v * 100));
    state.params.intensity = v;
    markSessionDirty();
    updateReadouts();
    return;
  }
  if (targetId === "rcf.smooth") {
    refs.smoothInput.value = String(Math.round(v * 100));
    state.params.smooth = v;
    markSessionDirty();
    updateReadouts();
    return;
  }
  if (targetId === "rcf.timewarp.depth") {
    refs.depthInput.value = String(Math.round(v * 100));
    state.params.timewarp.depth = v;
    markSessionDirty();
    updateReadouts();
    return;
  }
  if (targetId === "rcf.timewarp.rate") {
    const sec = 0.5 + (v * 11.5);
    refs.rateInput.value = String(Math.round(sec * 10));
    state.params.timewarp.rateSec = clamp(sec, 0.5, 12);
    markSessionDirty();
    updateReadouts();
    return;
  }
  if (targetId === "rcf.action.reseed" || targetId === "rcf.action.render") {
    const prev = Boolean(runtime.midiLastTrigger[targetId]);
    const next = v >= 0.5;
    runtime.midiLastTrigger[targetId] = next;
    if (!prev && next) {
      if (targetId === "rcf.action.reseed") {
        state.params.seed = nextSeed();
        refs.seedInput.value = String(state.params.seed);
        markSessionDirty();
        setStatus(`SEED ${state.params.seed}`);
      } else {
        void renderOutput();
      }
    }
  }
}

function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 0xffffffff);
  };
}

function ensureAudioContext() {
  if (!runtime.audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    runtime.audioContext = new Ctor();
  }
  return runtime.audioContext;
}

function nextSeed() {
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
}

function globalPlayStart(sourceLabel) {
  const token = `rcf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    window.parent?.postMessage(
      {
        type: "GLOBAL_PLAY_START",
        version: 1,
        payload: { token, moduleId: "rcf", source: sourceLabel },
      },
      "*"
    );
  } catch {}
  return token;
}

function globalPlayStop(token) {
  if (!token) return;
  try {
    window.parent?.postMessage({ type: "GLOBAL_PLAY_STOP", version: 1, payload: { token } }, "*");
  } catch {}
}

function installTactileButtons(root = document) {
  const styleId = "dn-squish-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      html.dn-squish .dn-btn{--press-scale:.88;--press-rotate:-1.2deg;--press-y:1px;--press-dur:55ms;--release-dur:220ms;--ease-in:cubic-bezier(.2,0,.15,1);--ease-out-back:cubic-bezier(.16,.95,.24,1.35);transform:translateZ(0) translateY(0) rotate(0deg) scale(1);transition:transform var(--release-dur) var(--ease-out-back),filter var(--release-dur) var(--ease-out-back),opacity 140ms var(--ease-in),background-color 140ms var(--ease-in),color 140ms var(--ease-in),box-shadow var(--release-dur) var(--ease-out-back);will-change:transform,filter,opacity,background-color,color,box-shadow}
      html.dn-squish .dn-btn.is-pressing{transition:transform var(--press-dur) var(--ease-in),filter var(--press-dur) var(--ease-in),opacity var(--press-dur) var(--ease-in),background-color var(--press-dur) var(--ease-in),color var(--press-dur) var(--ease-in),box-shadow var(--press-dur) var(--ease-in);transform:translateZ(0) translateY(var(--press-y)) rotate(var(--press-rotate)) scale(var(--press-scale));filter:brightness(1.16) saturate(1.45);box-shadow:0 0 10px rgba(255,255,255,.2)}
    `;
    document.head.appendChild(style);
  }
  const addClass = () => {
    root.querySelectorAll("button").forEach((button) => button.classList.add("dn-btn"));
  };
  addClass();
  new MutationObserver(addClass).observe(root.documentElement || root.body, { childList: true, subtree: true });
  const clear = () => root.querySelectorAll(".dn-btn.is-pressing").forEach((button) => button.classList.remove("is-pressing"));
  root.addEventListener("pointerdown", (event) => {
    const button = event.target?.closest?.(".dn-btn");
    if (!button || button.disabled) return;
    button.classList.add("is-pressing");
    try { button.setPointerCapture(event.pointerId); } catch {}
  }, { passive: true, capture: true });
  root.addEventListener("pointerup", (event) => {
    const button = event.target?.closest?.(".dn-btn");
    if (button) button.classList.remove("is-pressing");
    else clear();
  }, { passive: true, capture: true });
  root.addEventListener("pointercancel", clear, { passive: true, capture: true });
}

function toCanonicalBuffer(audioBuffer) {
  const channels = Math.min(2, audioBuffer.numberOfChannels);
  if (channels === 1) {
    const mono = new Float32Array(audioBuffer.length);
    mono.set(audioBuffer.getChannelData(0));
    return {
      sr: audioBuffer.sampleRate,
      channels: 2,
      frames: audioBuffer.length,
      data: [mono, new Float32Array(mono)],
    };
  }
  return {
    sr: audioBuffer.sampleRate,
    channels: 2,
    frames: audioBuffer.length,
    data: [
      new Float32Array(audioBuffer.getChannelData(0)),
      new Float32Array(audioBuffer.getChannelData(1)),
    ],
  };
}

function resampleLinear(input, targetFrames) {
  const out = new Float32Array(targetFrames);
  if (!input || input.length < 2) return out;
  const ratio = (input.length - 1) / Math.max(1, targetFrames - 1);
  for (let i = 0; i < targetFrames; i += 1) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(input.length - 1, i0 + 1);
    const t = src - i0;
    out[i] = input[i0] * (1 - t) + input[i1] * t;
  }
  return out;
}

function onePoleLowpass(input, cutoffNorm) {
  const out = new Float32Array(input.length);
  const a = clamp(cutoffNorm, 0.001, 0.999);
  let y = input[0] || 0;
  for (let i = 0; i < input.length; i += 1) {
    y += a * (input[i] - y);
    out[i] = y;
  }
  return out;
}

function smoothAbsEnvelope(input, winMs, sr) {
  const alpha = 1 - Math.exp(-1 / Math.max(1, (winMs / 1000) * sr));
  const out = new Float32Array(input.length);
  let y = 0;
  for (let i = 0; i < input.length; i += 1) {
    y += alpha * (Math.abs(input[i]) - y);
    out[i] = y;
  }
  return out;
}

function softClipChannel(data, amount = 1.4) {
  const out = new Float32Array(data.length);
  const norm = Math.tanh(amount);
  for (let i = 0; i < data.length; i += 1) {
    out[i] = Math.tanh(data[i] * amount) / norm;
  }
  return out;
}

function normalizePeakStereo(buffer, target = 0.95) {
  let peak = 0;
  for (let c = 0; c < buffer.channels; c += 1) {
    const ch = buffer.data[c];
    for (let i = 0; i < ch.length; i += 1) {
      const a = Math.abs(ch[i]);
      if (a > peak) peak = a;
    }
  }
  if (peak <= 0 || peak <= target) return buffer;
  const g = target / peak;
  for (let c = 0; c < buffer.channels; c += 1) {
    const ch = buffer.data[c];
    for (let i = 0; i < ch.length; i += 1) ch[i] *= g;
  }
  return buffer;
}

function makeTimewarpValue(tNorm, shape, randCurve) {
  if (shape === "tri") {
    const x = (tNorm % 1 + 1) % 1;
    return x < 0.5 ? x * 2 : 2 - x * 2;
  }
  if (shape === "rand") {
    if (!randCurve || randCurve.length < 2) return 0.5;
    const x = clamp(tNorm, 0, 1) * (randCurve.length - 1);
    const i0 = Math.floor(x);
    const i1 = Math.min(randCurve.length - 1, i0 + 1);
    const t = x - i0;
    return randCurve[i0] * (1 - t) + randCurve[i1] * t;
  }
  return 0.5 + 0.5 * Math.sin((Math.PI * 2) * tNorm);
}

function buildRandCurve(rng, points = 24) {
  const out = new Float32Array(points);
  let v = 0.5;
  for (let i = 0; i < points; i += 1) {
    v = clamp(v + (rng() - 0.5) * 0.45, 0, 1);
    out[i] = v;
  }
  return out;
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function microReassembleStereo(buffer, flavor, intensity, smooth, rng, sr) {
  const grainMsByFlavor = {
    grind: [8, 35],
    hybrid: [20, 80],
    smooth: [60, 180],
  };
  const range = grainMsByFlavor[flavor] || grainMsByFlavor.hybrid;
  const minMs = range[0];
  const maxMs = range[1];
  const grainMs = minMs + (maxMs - minMs) * clamp(0.25 + intensity * 0.75, 0, 1);
  const grainFrames = clamp(Math.round((grainMs / 1000) * sr), 32, Math.max(32, Math.floor(buffer.frames / 4)));
  const overlap = Math.round(grainFrames * clamp(0.1 + smooth * 0.65, 0.05, 0.85));
  const hop = Math.max(8, grainFrames - overlap);
  if (grainFrames >= buffer.frames || hop >= buffer.frames) return buffer;

  const starts = [];
  for (let s = 0; s + grainFrames <= buffer.frames; s += hop) starts.push(s);
  const perm = starts.slice();
  shuffleInPlace(perm, rng);
  const blend = clamp(intensity, 0, 1);
  const out = {
    sr: buffer.sr,
    channels: 2,
    frames: buffer.frames,
    data: [new Float32Array(buffer.frames), new Float32Array(buffer.frames)],
  };
  const weight = new Float32Array(buffer.frames);
  for (let gi = 0; gi < starts.length; gi += 1) {
    const dstStart = starts[gi];
    const srcStart = perm[gi];
    for (let n = 0; n < grainFrames; n += 1) {
      const dst = dstStart + n;
      const src = srcStart + n;
      if (dst >= buffer.frames || src >= buffer.frames) continue;
      const w = 0.5 - 0.5 * Math.cos((Math.PI * 2 * n) / Math.max(1, grainFrames - 1));
      for (let c = 0; c < 2; c += 1) {
        const dry = buffer.data[c][dst];
        const wet = buffer.data[c][src];
        out.data[c][dst] += (dry * (1 - blend) + wet * blend) * w;
      }
      weight[dst] += w;
    }
  }
  for (let i = 0; i < buffer.frames; i += 1) {
    const w = weight[i] > 1e-9 ? weight[i] : 1;
    out.data[0][i] /= w;
    out.data[1][i] /= w;
  }
  return out;
}

function runRzbRender(buffers, params) {
  if (!buffers.length) throw new Error("NO INPUTS");
  const sr = buffers[0].sr;
  const avgFramesRaw = Math.round(buffers.reduce((sum, b) => sum + b.frames, 0) / buffers.length);
  const minFrames = Math.round(MIN_TARGET_SEC * sr);
  const maxFrames = Math.round(MAX_TARGET_SEC * sr);
  const targetFrames = clamp(avgFramesRaw, minFrames, maxFrames);

  const normalized = buffers.map((b) => ({
    sr,
    channels: 2,
    frames: targetFrames,
    data: [
      resampleLinear(b.data[0], targetFrames),
      resampleLinear(b.data[1], targetFrames),
    ],
  }));

  const seed = (Number(params.seed) >>> 0) || 1;
  const rng = makeRng(seed);
  const envWindowByFlavor = {
    grind: 20 + params.smooth * 25,
    hybrid: 30 + params.smooth * 35,
    smooth: 50 + params.smooth * 60,
  };
  const lowCutByFlavor = {
    grind: 0.14 + params.smooth * 0.08,
    hybrid: 0.10 + params.smooth * 0.07,
    smooth: 0.07 + params.smooth * 0.05,
  };
  const envWinMs = envWindowByFlavor[params.flavor] || envWindowByFlavor.hybrid;
  const lowCut = lowCutByFlavor[params.flavor] || lowCutByFlavor.hybrid;

  const envs = normalized.map((b) => smoothAbsEnvelope(b.data[0], envWinMs, sr));
  const lows = normalized.map((b) => [onePoleLowpass(b.data[0], lowCut), onePoleLowpass(b.data[1], lowCut)]);
  const highs = normalized.map((b, i) => {
    const h0 = new Float32Array(targetFrames);
    const h1 = new Float32Array(targetFrames);
    for (let n = 0; n < targetFrames; n += 1) {
      h0[n] = b.data[0][n] - lows[i][0][n];
      h1[n] = b.data[1][n] - lows[i][1][n];
    }
    return [h0, h1];
  });

  const N = normalized.length;
  const idx = Array.from({ length: N }, (_, i) => i);
  shuffleInPlace(idx, rng);
  const activeK = clamp(Math.round(2 + params.intensity * 2), 2, Math.min(4, N));
  const active = idx.slice(0, activeK);
  const base = new Float32Array(N);
  for (let i = 0; i < N; i += 1) base[i] = 0.0001;
  for (const i of active) base[i] = 0.2 + rng();
  let baseSum = 0;
  for (let i = 0; i < N; i += 1) baseSum += base[i];
  for (let i = 0; i < N; i += 1) base[i] /= baseSum;

  const randCurve = params.timewarp.enabled && params.timewarp.shape === "rand" ? buildRandCurve(rng, 20) : null;
  const modA = active[0] ?? 0;
  const modB = active[1] ?? modA;
  const sharpenExp = 1 + params.intensity * 4;
  const highBlend = 0.6 + params.intensity * 0.8;

  const out = {
    sr,
    channels: 2,
    frames: targetFrames,
    data: [new Float32Array(targetFrames), new Float32Array(targetFrames)],
  };
  let envPeak = 0;
  for (let n = 0; n < targetFrames; n += 1) {
    const tNorm = targetFrames <= 1 ? 0 : n / (targetFrames - 1);
    const w = new Float32Array(base);

    if (params.timewarp.enabled && N > 1) {
      const cycles = tNorm / Math.max(0.1, params.timewarp.rateSec / Math.max(0.001, targetFrames / sr));
      const p = makeTimewarpValue(cycles, params.timewarp.shape, randCurve);
      const d = params.timewarp.depth;
      const delta = ((p - 0.5) * 2) * d * 0.55;
      w[modA] = clamp(w[modA] + delta, 0.0001, 1);
      w[modB] = clamp(w[modB] - delta, 0.0001, 1);
    }

    let sumW = 0;
    for (let i = 0; i < N; i += 1) {
      w[i] = Math.pow(w[i], sharpenExp);
      sumW += w[i];
    }
    sumW = Math.max(1e-9, sumW);
    for (let i = 0; i < N; i += 1) w[i] /= sumW;

    let env = 0;
    let loL = 0;
    let loR = 0;
    let hiL = 0;
    let hiR = 0;
    for (let i = 0; i < N; i += 1) {
      env += envs[i][n] * w[i];
      loL += lows[i][0][n] * w[i];
      loR += lows[i][1][n] * w[i];
      const wHi = w[(i + 1) % N];
      hiL += highs[i][0][n] * wHi;
      hiR += highs[i][1][n] * wHi;
    }
    envPeak = Math.max(envPeak, env);
    out.data[0][n] = loL + hiL * highBlend;
    out.data[1][n] = loR + hiR * highBlend;
    out.data[0][n] *= 0.35 + env * 0.65;
    out.data[1][n] *= 0.35 + env * 0.65;
  }

  const envNorm = envPeak > 1e-9 ? 1 / envPeak : 1;
  for (let n = 0; n < targetFrames; n += 1) {
    out.data[0][n] *= envNorm;
    out.data[1][n] *= envNorm;
  }

  const resembled = microReassembleStereo(out, params.flavor, params.intensity, params.smooth, rng, sr);
  resembled.data[0] = softClipChannel(resembled.data[0], 1.2 + params.intensity * 1.6);
  resembled.data[1] = softClipChannel(resembled.data[1], 1.2 + params.intensity * 1.6);
  normalizePeakStereo(resembled, 0.95);
  return resembled;
}

function buildSliceLengths(targetFrames, sr, params) {
  const minSliceFrames = Math.max(16, Math.round((params.minMs / 1000) * sr));
  const maxSliceFrames = Math.max(minSliceFrames, Math.round((params.maxMs / 1000) * sr));
  const baseFrames = clamp(Math.round((params.baseMs / 1000) * sr), minSliceFrames, maxSliceFrames);
  const lengths = [];
  let sum = 0;

  if (params.fibomatix) {
    let f1 = baseFrames;
    let f2 = baseFrames;
    while (sum < targetFrames && lengths.length < MAX_SLICE_COUNT) {
      const nextRaw = lengths.length === 0 ? f1 : lengths.length === 1 ? f2 : (f1 + f2);
      const next = clamp(nextRaw, minSliceFrames, maxSliceFrames);
      const remain = targetFrames - sum;
      const len = Math.max(1, Math.min(next, remain));
      lengths.push(len);
      sum += len;
      f1 = f2;
      f2 = nextRaw;
    }
  } else {
    while (sum < targetFrames && lengths.length < MAX_SLICE_COUNT) {
      const remain = targetFrames - sum;
      const len = Math.max(1, Math.min(baseFrames, remain));
      lengths.push(len);
      sum += len;
    }
  }

  if (!lengths.length) lengths.push(targetFrames);
  return lengths;
}

function buildSlices(targetFrames, sr, params) {
  const lengths = buildSliceLengths(targetFrames, sr, params);
  const slices = [];
  let start = 0;
  for (let i = 0; i < lengths.length && start < targetFrames; i += 1) {
    const remain = targetFrames - start;
    const len = Math.max(1, Math.min(lengths[i], remain));
    slices.push({ k: i + 1, start, len });
    start += len;
  }
  return slices;
}

function sliceChunk(channel, start, len, reverse) {
  const out = new Float32Array(len);
  if (!reverse) {
    out.set(channel.subarray(start, start + len));
    return out;
  }
  for (let i = 0; i < len; i += 1) {
    out[i] = channel[start + len - 1 - i];
  }
  return out;
}

function appendWithCrossfade(dstL, dstR, chunkL, chunkR, xfFrames) {
  if (!dstL.length || !dstR.length) {
    for (let i = 0; i < chunkL.length; i += 1) {
      dstL.push(chunkL[i]);
      dstR.push(chunkR[i]);
    }
    return;
  }
  const xf = clamp(xfFrames, 0, Math.min(dstL.length, chunkL.length));
  if (xf > 0) {
    const start = dstL.length - xf;
    for (let i = 0; i < xf; i += 1) {
      const t = xf <= 1 ? 1 : i / (xf - 1);
      const fadeIn = Math.sin((Math.PI * 0.5) * t);
      const fadeOut = Math.cos((Math.PI * 0.5) * t);
      const oldL = dstL[start + i];
      const oldR = dstR[start + i];
      dstL[start + i] = (oldL * fadeOut * fadeOut) + (chunkL[i] * fadeIn * fadeIn);
      dstR[start + i] = (oldR * fadeOut * fadeOut) + (chunkR[i] * fadeIn * fadeIn);
    }
  }
  for (let i = xf; i < chunkL.length; i += 1) {
    dstL.push(chunkL[i]);
    dstR.push(chunkR[i]);
  }
}

function runCentrifugeRender(buffers, params) {
  if (!Array.isArray(buffers) || buffers.length < 2) throw new Error("LOAD AT LEAST 2 SOURCES");
  const targetSr = buffers[0].sr;
  const avgSecRaw = buffers.reduce((sum, b) => sum + (b.frames / Math.max(1, b.sr)), 0) / buffers.length;
  const targetSec = clamp(avgSecRaw, MIN_TARGET_SEC, MAX_TARGET_SEC);
  const targetFrames = Math.max(64, Math.round(targetSec * targetSr));

  const normalized = buffers.map((b) => ({
    sr: targetSr,
    channels: 2,
    frames: targetFrames,
    data: [
      resampleLinear(b.data[0], targetFrames),
      resampleLinear(b.data[1], targetFrames),
    ],
  }));

  const slices = buildSlices(targetFrames, targetSr, params);
  const M = slices.length;
  const N = normalized.length;
  const outL = [];
  const outR = [];
  const xfFrames = Math.round((params.xfadeMs / 1000) * targetSr);

  for (let t = 1; t <= M; t += 1) {
    for (let r = 0; r < N; r += 1) {
      const k = t + r;
      if (k > M) break;
      const slice = slices[k - 1];
      const isEvenRow1Based = (r % 2) === 1;
      const reverse = isEvenRow1Based ? ((k % 2) === 0) : false;
      const source = normalized[r];
      const chunkL = sliceChunk(source.data[0], slice.start, slice.len, reverse);
      const chunkR = sliceChunk(source.data[1], slice.start, slice.len, reverse);
      appendWithCrossfade(outL, outR, chunkL, chunkR, xfFrames);
    }
  }

  const output = {
    sr: targetSr,
    channels: 2,
    frames: outL.length,
    data: [Float32Array.from(outL), Float32Array.from(outR)],
    meta: { mode: "centrifuge", inputs: N, slices: M, targetFrames },
  };
  output.data[0] = softClipChannel(output.data[0], 1.35);
  output.data[1] = softClipChannel(output.data[1], 1.35);
  normalizePeakStereo(output, 0.95);
  return output;
}

function bufferToAudioBuffer(buffer) {
  const ctx = ensureAudioContext();
  const out = ctx.createBuffer(2, buffer.frames, buffer.sr);
  out.copyToChannel(buffer.data[0], 0);
  out.copyToChannel(buffer.data[1], 1);
  return out;
}

function audioBufferToWavBlob(buffer) {
  const channels = 2;
  const frames = buffer.frames;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const out = new ArrayBuffer(44 + dataSize);
  const v = new DataView(out);
  const write = (off, str) => { for (let i = 0; i < str.length; i += 1) v.setUint8(off + i, str.charCodeAt(i)); };
  write(0, "RIFF");
  v.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, channels, true);
  v.setUint32(24, buffer.sr, true);
  v.setUint32(28, buffer.sr * blockAlign, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, 16, true);
  write(36, "data");
  v.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const s = clamp(buffer.data[c][i], -1, 1);
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([out], { type: "audio/wav" });
}

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function getInvoke() {
  const ownInvoke = window.__TAURI__?.core?.invoke;
  if (typeof ownInvoke === "function") return ownInvoke;
  try {
    const parentInvoke = window.parent?.__TAURI__?.core?.invoke;
    if (typeof parentInvoke === "function") return parentInvoke;
  } catch {
    // ignore cross-frame access errors
  }
  return null;
}

async function openAudioFileViaDialog() {
  const invoke = getInvoke();
  if (!invoke) return null;
  try {
    const path = await invoke("dialog_open_file", {
      defaultDir: runtime.paths?.mater || null,
      filters: [{ name: "Audio", extensions: ["wav", "aiff", "aif", "flac", "mp3", "ogg"] }],
      dialogKey: "rcf_rzb.loadAudio",
    });
    if (!path) return null;
    const base64 = await invoke("read_file_base64", { path: String(path) });
    const name = String(path).split(/[\\/]/).pop() || "audio.wav";
    return { name, arrayBuffer: base64ToArrayBuffer(base64) };
  } catch {
    return null;
  }
}

async function saveBlobWithDialog(blob, suggestedName) {
  const invoke = getInvoke();
  if (typeof invoke === "function") {
    try {
      const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
      const saved = await invoke("save_blob_with_dialog", { dataBase64, suggestedName });
      return saved ? "saved" : "cancelled";
    } catch {}
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "saved";
}

function splitFileNameParts(fileName) {
  const trimmed = String(fileName || "render.wav").trim() || "render.wav";
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return { stem: trimmed, ext: ".wav" };
  return { stem: trimmed.slice(0, dot), ext: trimmed.slice(dot) || ".wav" };
}

function pathSeparator(path) {
  return String(path || "").includes("\\") ? "\\" : "/";
}

function pathDir(path) {
  const value = String(path || "");
  const idx = Math.max(value.lastIndexOf("/"), value.lastIndexOf("\\"));
  return idx >= 0 ? value.slice(0, idx) : "";
}

function joinPath(dir, file, sep = "/") {
  return dir ? `${dir}${sep}${file}` : file;
}

function indexedFileName(stem, ext, index) {
  if (index <= 1) return `${stem}${ext}`;
  return `${stem}_${String(index).padStart(3, "0")}${ext}`;
}

async function saveBlobWithDialogPath(blob, suggestedName) {
  const ownInvoke = window.__TAURI__?.core?.invoke;
  let invoke = typeof ownInvoke === "function" ? ownInvoke : null;
  if (!invoke) {
    try {
      const parentInvoke = window.parent?.__TAURI__?.core?.invoke;
      if (typeof parentInvoke === "function") invoke = parentInvoke;
    } catch {}
  }
  if (typeof invoke !== "function") return null;
  try {
    const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
    return await invoke("save_blob_with_dialog_path", { dataBase64, suggestedName });
  } catch {
    return null;
  }
}

async function saveBlobToPath(blob, path) {
  const ownInvoke = window.__TAURI__?.core?.invoke;
  let invoke = typeof ownInvoke === "function" ? ownInvoke : null;
  if (!invoke) {
    try {
      const parentInvoke = window.parent?.__TAURI__?.core?.invoke;
      if (typeof parentInvoke === "function") invoke = parentInvoke;
    } catch {}
  }
  if (typeof invoke !== "function") return false;
  try {
    const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
    return Boolean(await invoke("save_blob_to_path", { dataBase64, path }));
  } catch {
    return false;
  }
}

async function saveBlobSequenced(blob, suggestedName, sequenceKey) {
  const seq = runtime.renderSaveSeqByKey[sequenceKey];
  if (seq && !seq.dialogOnly && seq.dir && seq.stem && seq.ext && seq.sep) {
    const fileName = indexedFileName(seq.stem, seq.ext, seq.nextIndex || 2);
    const targetPath = joinPath(seq.dir, fileName, seq.sep);
    const ok = await saveBlobToPath(blob, targetPath);
    if (ok) {
      seq.nextIndex = (seq.nextIndex || 2) + 1;
      return "saved";
    }
    seq.dialogOnly = true;
  } else {
    const pickedPath = await saveBlobWithDialogPath(blob, suggestedName);
    if (pickedPath) {
      const sep = pathSeparator(pickedPath);
      const pickedName = pickedPath.split(/[\\/]/).pop() || suggestedName;
      const parts = splitFileNameParts(pickedName);
      runtime.renderSaveSeqByKey[sequenceKey] = {
        dir: pathDir(pickedPath),
        sep,
        stem: parts.stem,
        ext: parts.ext,
        nextIndex: 2,
        dialogOnly: false,
      };
      return "saved";
    }
  }
  const fallback = await saveBlobWithDialog(blob, suggestedName);
  if (fallback === "saved" || fallback === "downloaded") {
    const parts = splitFileNameParts(suggestedName);
    runtime.renderSaveSeqByKey[sequenceKey] = {
      dir: "",
      sep: "/",
      stem: parts.stem,
      ext: parts.ext,
      nextIndex: 2,
      dialogOnly: true,
    };
  }
  return fallback;
}

function loadedBuffers() {
  return state.slots.filter((slot) => slot.buffer).map((slot) => slot.buffer);
}

function sanitizeName(name) {
  return String(name || "RZB").trim().replace(/[^a-z0-9._-]+/gi, "_").replace(/_+/g, "_").slice(0, 64) || "RZB";
}

function defaultOutputName() {
  const n = loadedBuffers().length;
  if (state.params.mode === "centrifuge") {
    return `CENTRIFUGE_${n}src_${state.params.fibomatix ? "fibomatix" : "uniform"}.wav`;
  }
  const flavor = state.params.flavor;
  const seed = Number(state.params.seed) >>> 0;
  return `RZB_${n}src_seed${seed}_${flavor}.wav`;
}

function nextEmptySlotIndex() {
  const idx = state.slots.findIndex((slot) => !slot.buffer);
  return idx >= 0 ? idx : -1;
}

async function decodeFileToSlot(file, slotIndex) {
  const arr = await file.arrayBuffer();
  return decodeArrayBufferToSlot(arr, file.name, slotIndex);
}

async function decodeArrayBufferToSlot(arrayBuffer, fileName, slotIndex) {
  const ctx = ensureAudioContext();
  const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
  state.slots[slotIndex].buffer = toCanonicalBuffer(decoded);
  state.slots[slotIndex].name = fileName;
  state.slots[slotIndex].source = { type: "file", name: fileName };
  markSessionDirty();
}

function drawWave() {
  const canvas = refs.waveCanvas;
  const c = canvas.getContext("2d");
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.floor(canvas.clientWidth * ratio));
  const h = Math.max(1, Math.floor(canvas.clientHeight * ratio));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  c.clearRect(0, 0, w, h);
  c.fillStyle = "rgba(236, 234, 228, 0.62)";
  c.fillRect(0, 0, w, h);
  const out = state.output;
  if (!out) return;
  const mono = new Float32Array(out.frames);
  for (let i = 0; i < out.frames; i += 1) mono[i] = 0.5 * (out.data[0][i] + out.data[1][i]);
  const spp = mono.length / w;
  const mid = h * 0.5;
  const amp = h * 0.42;
  c.strokeStyle = "rgba(47,49,50,0.85)";
  c.lineWidth = Math.max(1, ratio);
  c.beginPath();
  for (let x = 0; x < w; x += 1) {
    const start = Math.floor(x * spp);
    const end = Math.min(mono.length, Math.floor((x + 1) * spp) + 1);
    let peak = 0;
    for (let i = start; i < end; i += 1) {
      const v = Math.abs(mono[i]);
      if (v > peak) peak = v;
    }
    c.moveTo(x + 0.5, mid - peak * amp);
    c.lineTo(x + 0.5, mid + peak * amp);
  }
  c.stroke();

  const durationSec = out.frames / Math.max(1, out.sr);
  let playheadSec = clamp(Number(runtime.previewOffsetSec) || 0, 0, Math.max(0, durationSec));
  if (state.preview.playing && runtime.audioContext && runtime.previewSource && durationSec > 0) {
    const elapsed = Math.max(0, runtime.audioContext.currentTime - runtime.previewStartedAtCtxSec);
    let at = runtime.previewStartOffsetSec + elapsed;
    if (state.preview.loop) at %= durationSec;
    else at = Math.min(durationSec, at);
    playheadSec = clamp(at, 0, durationSec);
  }
  const x = clamp(Math.round((playheadSec / Math.max(durationSec, 1e-6)) * (w - 1)), 0, Math.max(0, w - 1));
  c.strokeStyle = "rgba(138,58,45,0.92)";
  c.lineWidth = Math.max(1, Math.round(ratio * 1.5));
  c.beginPath();
  c.moveTo(x + 0.5, 0);
  c.lineTo(x + 0.5, h);
  c.stroke();
}

function updateReadouts() {
  refs.loadedCount.textContent = `${loadedBuffers().length} / ${MAX_SLOTS} LOADED`;
  refs.modeBtn.textContent = state.params.mode === "centrifuge" ? "MODE: CENTRIFUGE" : "MODE: RZB";
  refs.flavorBtn.textContent = state.params.flavor.toUpperCase();
  refs.intensityValue.textContent = `${Math.round(state.params.intensity * 100)}%`;
  refs.smoothValue.textContent = `${Math.round(state.params.smooth * 100)}%`;
  refs.rateValue.textContent = state.params.timewarp.rateSec.toFixed(1);
  refs.depthValue.textContent = `${Math.round(state.params.timewarp.depth * 100)}%`;
  refs.shapeBtn.textContent = state.params.timewarp.shape.toUpperCase();
  refs.timewarpBtn.setAttribute("aria-pressed", String(state.params.timewarp.enabled));
  refs.timewarpBtn.textContent = state.params.timewarp.enabled ? "ON" : "OFF";
  refs.fibBtn.setAttribute("aria-pressed", String(state.params.fibomatix));
  refs.fibBtn.textContent = state.params.fibomatix ? "ON" : "OFF";
  refs.baseValue.textContent = `${Math.round(state.params.baseMs)}MS`;
  refs.minValue.textContent = `${Math.round(state.params.minMs)}MS`;
  refs.maxValue.textContent = `${Math.round(state.params.maxMs)}MS`;
  refs.xfadeValue.textContent = `${Math.round(state.params.xfadeMs)}MS`;
  refs.renderBtn.textContent = "RENDER";
  refs.loopBtn.checked = Boolean(state.preview.loop);
  refs.playBtn.setAttribute("aria-pressed", String(state.preview.playing));
  refs.playBtn.textContent = state.preview.playing ? "PAUSE" : "PLAY";
  refs.playBtn.disabled = !state.render.tempExists && !state.output;
  refs.saveBtn.disabled = !state.render.tempExists;
  refs.sendBtn.disabled = !state.render.tempExists;
  const isCentrifuge = state.params.mode === "centrifuge";
  refs.rzbControls?.classList.toggle("hidden", isCentrifuge);
  refs.centrifugeControls?.classList.toggle("hidden", !isCentrifuge);
}

function renderSlots() {
  refs.slots.innerHTML = "";
  for (let i = 0; i < MAX_SLOTS; i += 1) {
    const slot = state.slots[i];
    const box = document.createElement("div");
    box.className = `slot${i === state.activeSlot ? " active" : ""}`;

    const head = document.createElement("div");
    head.className = "slot-head";
    const title = document.createElement("strong");
    title.textContent = `SLOT ${i + 1}`;
    const selectBtn = document.createElement("button");
    selectBtn.type = "button";
    selectBtn.textContent = i === state.activeSlot ? "ACTIVE" : "SELECT";
    selectBtn.setAttribute("aria-pressed", String(i === state.activeSlot));
    selectBtn.addEventListener("click", () => {
      state.activeSlot = i;
      renderSlots();
    });
    head.append(title, selectBtn);

    const name = document.createElement("div");
    name.className = "slot-name";
    if (slot.buffer) {
      const sec = (slot.buffer.frames / slot.buffer.sr).toFixed(2);
      name.textContent = `${slot.name || "BUFFER"} | ${sec}S`;
    } else {
      name.textContent = "EMPTY";
    }

    const actions = document.createElement("div");
    actions.className = "slot-actions";
    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.textContent = "LOAD";
    loadBtn.addEventListener("click", async () => {
      state.activeSlot = i;
      const picked = await openAudioFileViaDialog();
      if (picked?.arrayBuffer) {
        try {
          await decodeArrayBufferToSlot(picked.arrayBuffer, picked.name, state.activeSlot);
          renderSlots();
          setStatus(`LOADED: ${picked.name}`);
        } catch (error) {
          setStatus(`LOAD FAILED: ${String(error?.message || error)}`, true);
        }
        return;
      }
      refs.fileInput.click();
    });
    const cliplibBtn = document.createElement("button");
    cliplibBtn.type = "button";
    cliplibBtn.textContent = "CLIPLIB";
    cliplibBtn.addEventListener("click", () => {
      state.activeSlot = i;
      requestCliplibList();
    });
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.textContent = "CLEAR";
    clearBtn.addEventListener("click", () => {
      state.slots[i].buffer = null;
      state.slots[i].name = "";
      state.slots[i].source = null;
      if (!loadedBuffers().length) {
        state.output = null;
        stopPreview();
        drawWave();
      }
      updateReadouts();
      renderSlots();
    });
    actions.append(loadBtn, cliplibBtn, clearBtn);
    box.append(head, name, actions);
    refs.slots.appendChild(box);
  }
  updateReadouts();
}

function stopPreview() {
  if (runtime.previewSource && runtime.audioContext && runtime.previewDurationSec > 0) {
    const elapsed = Math.max(0, runtime.audioContext.currentTime - runtime.previewStartedAtCtxSec);
    let nextOffset = runtime.previewStartOffsetSec + elapsed;
    if (state.preview.loop) {
      nextOffset %= runtime.previewDurationSec;
    } else {
      nextOffset = Math.min(runtime.previewDurationSec, nextOffset);
      if (nextOffset >= runtime.previewDurationSec - 0.0005) nextOffset = 0;
    }
    runtime.previewOffsetSec = clamp(nextOffset, 0, Math.max(0, runtime.previewDurationSec - 0.0005));
  }
  if (runtime.previewSource) {
    try { runtime.previewSource.stop(); } catch {}
    try { runtime.previewSource.disconnect(); } catch {}
    runtime.previewSource = null;
  }
  if (runtime.previewPlayToken) {
    globalPlayStop(runtime.previewPlayToken);
    runtime.previewPlayToken = null;
  }
  if (runtime.previewMeterRaf) {
    cancelAnimationFrame(runtime.previewMeterRaf);
    runtime.previewMeterRaf = null;
  }
  state.preview.playing = false;
  runtime.previewStartedAtCtxSec = 0;
  runtime.previewStartOffsetSec = runtime.previewOffsetSec;
  window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
  updateReadouts();
}

function startPreviewMeter() {
  const analyser = runtime.previewAnalyser;
  if (!analyser) return;
  if (!runtime.previewMeterData || runtime.previewMeterData.length !== analyser.fftSize) {
    runtime.previewMeterData = new Uint8Array(analyser.fftSize);
  }
  const tick = () => {
    if (!state.preview.playing || !runtime.previewSource || !runtime.previewAnalyser) {
      runtime.previewMeterRaf = null;
      window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
      return;
    }
    analyser.getByteTimeDomainData(runtime.previewMeterData);
    let peak = 0;
    for (let i = 0; i < runtime.previewMeterData.length; i += 1) {
      const v = Math.abs((runtime.previewMeterData[i] - 128) / 128);
      if (v > peak) peak = v;
    }
    window.parent?.postMessage({ type: "denarrator-meter", level: clamp(peak * 1.8, 0, 1) }, "*");
    drawWave();
    runtime.previewMeterRaf = requestAnimationFrame(tick);
  };
  runtime.previewMeterRaf = requestAnimationFrame(tick);
}

async function playPreview() {
  if (!state.output) return;
  stopPreview();
  const ctx = ensureAudioContext();
  await ctx.resume();
  const durationSec = state.output.frames / Math.max(1, state.output.sr);
  const startOffset = clamp(Number(runtime.previewOffsetSec) || 0, 0, Math.max(0, durationSec - 0.0005));
  const source = ctx.createBufferSource();
  source.buffer = bufferToAudioBuffer(state.output);
  source.loop = state.preview.loop;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  analyser.connect(ctx.destination);
  runtime.previewAnalyser = analyser;
  runtime.previewPlayToken = globalPlayStart("preview");
  source.onended = () => {
    if (runtime.previewSource === source) {
      runtime.previewOffsetSec = 0;
      stopPreview();
    }
  };
  runtime.previewSource = source;
  runtime.previewDurationSec = durationSec;
  runtime.previewStartOffsetSec = startOffset;
  runtime.previewStartedAtCtxSec = ctx.currentTime;
  source.start(0, startOffset);
  state.preview.playing = true;
  updateReadouts();
  startPreviewMeter();
}

async function renderOutput() {
  const inputs = loadedBuffers();
  if (inputs.length < 2) {
    setStatus("LOAD AT LEAST 2 SOURCES", true);
    return;
  }
  const t0 = performance.now();
  const params = {
    mode: state.params.mode,
    flavor: state.params.flavor,
    intensity: state.params.intensity,
    smooth: state.params.smooth,
    seed: (Number(state.params.seed) >>> 0) || 1,
    fibomatix: Boolean(state.params.fibomatix),
    baseMs: Number(state.params.baseMs) || 25,
    minMs: Number(state.params.minMs) || 6,
    maxMs: Number(state.params.maxMs) || 250,
    xfadeMs: Number(state.params.xfadeMs) || 8,
    timewarp: {
      enabled: state.params.timewarp.enabled,
      rateSec: state.params.timewarp.rateSec,
      depth: state.params.timewarp.depth,
      shape: state.params.timewarp.shape,
    },
  };
  try {
    state.render.busy = true;
    state.render.lastError = null;
    refs.renderInfo.textContent = "RENDERING...";
    updateReadouts();
    if (params.mode === "centrifuge") {
      if (params.minMs > params.maxMs) params.maxMs = params.minMs;
      if (params.baseMs < params.minMs) params.baseMs = params.minMs;
      if (params.baseMs > params.maxMs) params.baseMs = params.maxMs;
      state.output = runCentrifugeRender(inputs, params);
    } else {
      state.output = runRzbRender(inputs, params);
    }
    state.render.outBuffer = state.output;
    state.render.tempExists = Boolean(state.output);
    state.render.busy = false;
    markSessionDirty();
    drawWave();
    const ms = Math.round(performance.now() - t0);
    if (params.mode === "centrifuge") {
      refs.renderInfo.textContent = `TEMP READY | CENTRIFUGE | ${state.output.frames} FRAMES | ${ms}MS`;
    } else {
      refs.renderInfo.textContent = `TEMP READY | RZB | ${state.output.frames} FRAMES | ${ms}MS`;
    }
    setStatus(`RENDER DONE: TEMP READY`);
    updateReadouts();
  } catch (error) {
    state.render.busy = false;
    state.render.lastError = String(error?.message || error);
    state.render.tempExists = false;
    setStatus(`RENDER FAILED: ${String(error?.message || error)}`, true);
    updateReadouts();
  }
}

async function saveOutput() {
  if (!state.render.tempExists || !state.output) {
    setStatus("NO OUTPUT", true);
    return;
  }
  const blob = audioBufferToWavBlob(state.output);
  const result = await saveBlobWithDialog(blob, defaultOutputName());
  setStatus(result === "saved" ? "WAV SAVED" : "SAVE CANCELLED", result !== "saved");
}

async function sendToLazy() {
  if (!state.render.tempExists || !state.output) {
    setStatus("NO OUTPUT", true);
    return;
  }
  const blob = audioBufferToWavBlob(state.output);
  const wavBytesBase64 = arrayBufferToBase64(await blob.arrayBuffer());
  const name = sanitizeName(defaultOutputName().replace(/\.wav$/i, ""));
  window.parent?.postMessage(
    {
      type: "CLIPLIB_ADD",
      version: 1,
      target: "lazy",
      name,
      wavBytesBase64,
      meta: {
        sr: state.output.sr,
        channels: state.output.channels,
        frames: state.output.frames,
        durationSec: state.output.frames / state.output.sr,
        source: "rcf_rzb",
        seed: (Number(state.params.seed) >>> 0) || 1,
        mode: state.params.mode,
        fibomatix: Boolean(state.params.fibomatix),
      },
      source: "rcf_rzb",
    },
    "*"
  );
  setStatus(`SENT ${name} TO LAZY`);
}

function applyPresetById(id) {
  const preset = PRESETS.find((p) => p.id === id);
  if (!preset) return;
  const p = preset.params;
  state.params.flavor = p.flavor;
  state.params.intensity = clamp(p.intensity, 0, 1);
  state.params.smooth = clamp(p.smooth, 0, 1);
  state.params.seed = p.seed === "random" ? nextSeed() : ((Number(p.seed) >>> 0) || nextSeed());
  state.params.timewarp.enabled = Boolean(p.timewarp.enabled);
  state.params.timewarp.rateSec = clamp(Number(p.timewarp.rateSec) || 4, 0.5, 12);
  state.params.timewarp.depth = clamp(Number(p.timewarp.depth) || 0, 0, 1);
  state.params.timewarp.shape = SHAPES.includes(p.timewarp.shape) ? p.timewarp.shape : "sine";
  syncControlsFromState();
  setStatus(`PRESET: ${preset.name}`);
}

function syncControlsFromState() {
  ensureParamDefaults();
  refs.intensityInput.value = String(Math.round(state.params.intensity * 100));
  refs.smoothInput.value = String(Math.round(state.params.smooth * 100));
  refs.seedInput.value = String((Number(state.params.seed) >>> 0) || 1);
  refs.rateInput.value = String(Math.round(state.params.timewarp.rateSec * 10));
  refs.depthInput.value = String(Math.round(state.params.timewarp.depth * 100));
  refs.baseInput.value = String(Math.round(state.params.baseMs || 25));
  refs.minInput.value = String(Math.round(state.params.minMs || 6));
  refs.maxInput.value = String(Math.round(state.params.maxMs || 250));
  refs.xfadeInput.value = String(Math.round(state.params.xfadeMs || 8));
  updateReadouts();
}

function requestCliplibList() {
  const requestId = `rcf_cliplib_list_${runtime.cliplibReqSeq++}`;
  window.parent?.postMessage({ type: "CLIPLIB_LIST_REQ", version: 1, requestId }, "*");
  setStatus("CLIPLIB LIST REQUESTED");
}

function requestCliplibWav(path) {
  const requestId = `rcf_cliplib_wav_${runtime.cliplibReqSeq++}`;
  runtime.pendingWavReqById.set(requestId, path);
  window.parent?.postMessage({ type: "CLIPLIB_WAV_REQ", version: 1, requestId, path }, "*");
  setStatus("CLIPLIB WAV REQUESTED");
}

async function importFromWavBase64(wavBytesBase64, name, slotIndex = state.activeSlot) {
  const ctx = ensureAudioContext();
  const decoded = await ctx.decodeAudioData(base64ToArrayBuffer(wavBytesBase64).slice(0));
  const target = clamp(slotIndex, 0, MAX_SLOTS - 1);
  state.slots[target].buffer = toCanonicalBuffer(decoded);
  state.slots[target].name = name || `clip_${target + 1}.wav`;
  state.slots[target].source = { type: "cliplib", name: state.slots[target].name };
  state.activeSlot = target;
  markSessionDirty();
  renderSlots();
  setStatus(`LOADED INTO SLOT ${target + 1}`);
}

async function exportSessionChunk(includeOnlyDirty = true) {
  const chunk = {
    schemaVersion: 1,
    transport: {
      playheadSec: Number(runtime.previewOffsetSec) || 0,
      loopA: 0,
      loopB: Number(runtime.previewDurationSec) || 0,
    },
    ui: { activeSlot: state.activeSlot },
    refs: {},
    dirty: Boolean(runtime.sessionDirty),
  };
  if (!includeOnlyDirty || runtime.sessionDirty) {
    chunk.heavy = {
      params: JSON.parse(JSON.stringify(state.params)),
      preview: { loop: Boolean(state.preview.loop) },
      activeSlot: state.activeSlot,
      outputWavBase64: state.output ? arrayBufferToBase64(await audioBufferToWavBlob(state.output).arrayBuffer()) : null,
      slots: await Promise.all(
        state.slots.map(async (slot) => ({
          id: slot.id,
          name: slot.name,
          source: slot.source ? { ...slot.source } : null,
          wavBase64: slot.buffer ? arrayBufferToBase64(await audioBufferToWavBlob(slot.buffer).arrayBuffer()) : null,
        }))
      ),
    };
  }
  return chunk;
}

async function importSessionChunk(chunk) {
  if (!chunk || typeof chunk !== "object") return;
  if (chunk.transport && Number.isFinite(Number(chunk.transport.playheadSec))) {
    runtime.previewOffsetSec = Math.max(0, Number(chunk.transport.playheadSec));
  } else {
    runtime.previewOffsetSec = 0;
  }
  if (chunk.ui && Number.isFinite(Number(chunk.ui.activeSlot))) {
    state.activeSlot = clamp(Number(chunk.ui.activeSlot), 0, MAX_SLOTS - 1);
  }
  if (chunk.heavy) {
    const heavy = chunk.heavy;
    if (heavy.params) state.params = JSON.parse(JSON.stringify(heavy.params));
    if (heavy.preview) state.preview.loop = Boolean(heavy.preview.loop);
    if (Number.isFinite(Number(heavy.activeSlot))) {
      state.activeSlot = clamp(Number(heavy.activeSlot), 0, MAX_SLOTS - 1);
    }
    if (Array.isArray(heavy.slots)) {
      for (let i = 0; i < Math.min(MAX_SLOTS, heavy.slots.length); i += 1) {
        const src = heavy.slots[i] || {};
        state.slots[i].id = src.id || `slot_${i + 1}`;
        state.slots[i].name = src.name || "";
        state.slots[i].source = src.source ? { ...src.source } : null;
        if (src.wavBase64) {
          const decoded = await ensureAudioContext().decodeAudioData(base64ToArrayBuffer(src.wavBase64).slice(0));
          state.slots[i].buffer = toCanonicalBuffer(decoded);
        } else {
          state.slots[i].buffer = null;
        }
      }
    }
    if (heavy.outputWavBase64) {
      const decoded = await ensureAudioContext().decodeAudioData(base64ToArrayBuffer(heavy.outputWavBase64).slice(0));
      state.output = toCanonicalBuffer(decoded);
    } else {
      state.output = null;
    }
  }
  ensureParamDefaults();
  stopPreview();
  syncControlsFromState();
  renderSlots();
  drawWave();
  runtime.sessionDirty = false;
}

function bindEvents() {
  refs.fileInput.addEventListener("change", async () => {
    const file = refs.fileInput.files?.[0];
    refs.fileInput.value = "";
    if (!file) return;
    try {
      await decodeFileToSlot(file, state.activeSlot);
      renderSlots();
      setStatus(`LOADED: ${file.name}`);
    } catch (error) {
      setStatus(`LOAD FAILED: ${String(error?.message || error)}`, true);
    }
  });

  refs.flavorBtn.addEventListener("click", () => {
    const idx = FLAVORS.indexOf(state.params.flavor);
    state.params.flavor = FLAVORS[(idx + 1) % FLAVORS.length];
    markSessionDirty();
    updateReadouts();
  });
  refs.modeBtn.addEventListener("click", () => {
    state.params.mode = state.params.mode === "rzb" ? "centrifuge" : "rzb";
    markSessionDirty();
    updateReadouts();
  });
  refs.shapeBtn.addEventListener("click", () => {
    const idx = SHAPES.indexOf(state.params.timewarp.shape);
    state.params.timewarp.shape = SHAPES[(idx + 1) % SHAPES.length];
    markSessionDirty();
    updateReadouts();
  });
  refs.timewarpBtn.addEventListener("click", () => {
    state.params.timewarp.enabled = !state.params.timewarp.enabled;
    markSessionDirty();
    updateReadouts();
  });
  refs.intensityInput.addEventListener("input", () => {
    state.params.intensity = clamp(Number(refs.intensityInput.value) / 100, 0, 1);
    markSessionDirty();
    updateReadouts();
  });
  refs.smoothInput.addEventListener("input", () => {
    state.params.smooth = clamp(Number(refs.smoothInput.value) / 100, 0, 1);
    markSessionDirty();
    updateReadouts();
  });
  refs.rateInput.addEventListener("input", () => {
    state.params.timewarp.rateSec = clamp(Number(refs.rateInput.value) / 10, 0.5, 12);
    markSessionDirty();
    updateReadouts();
  });
  refs.depthInput.addEventListener("input", () => {
    state.params.timewarp.depth = clamp(Number(refs.depthInput.value) / 100, 0, 1);
    markSessionDirty();
    updateReadouts();
  });
  refs.fibBtn.addEventListener("click", () => {
    state.params.fibomatix = !state.params.fibomatix;
    markSessionDirty();
    updateReadouts();
  });
  refs.baseInput.addEventListener("input", () => {
    state.params.baseMs = clamp(Number(refs.baseInput.value) || 25, 2, 1200);
    markSessionDirty();
    updateReadouts();
  });
  refs.minInput.addEventListener("input", () => {
    state.params.minMs = clamp(Number(refs.minInput.value) || 6, 1, 1000);
    if (state.params.minMs > state.params.maxMs) state.params.maxMs = state.params.minMs;
    if (state.params.baseMs < state.params.minMs) state.params.baseMs = state.params.minMs;
    syncControlsFromState();
    markSessionDirty();
  });
  refs.maxInput.addEventListener("input", () => {
    state.params.maxMs = clamp(Number(refs.maxInput.value) || 250, 1, 2000);
    if (state.params.maxMs < state.params.minMs) state.params.minMs = state.params.maxMs;
    if (state.params.baseMs > state.params.maxMs) state.params.baseMs = state.params.maxMs;
    syncControlsFromState();
    markSessionDirty();
  });
  refs.xfadeInput.addEventListener("input", () => {
    state.params.xfadeMs = clamp(Number(refs.xfadeInput.value) || 8, 0, 80);
    markSessionDirty();
    updateReadouts();
  });
  refs.seedInput.addEventListener("change", () => {
    state.params.seed = (Number(refs.seedInput.value) >>> 0) || 1;
    refs.seedInput.value = String(state.params.seed);
    markSessionDirty();
  });
  refs.reseedBtn.addEventListener("click", () => {
    state.params.seed = nextSeed();
    refs.seedInput.value = String(state.params.seed);
    markSessionDirty();
    setStatus(`SEED ${state.params.seed}`);
  });
  refs.renderBtn.addEventListener("click", () => void renderOutput());
  refs.playBtn.addEventListener("click", () => {
    if (state.preview.playing || runtime.previewSource) {
      stopPreview();
      return;
    }
    void playPreview();
  });
  refs.loopBtn.addEventListener("change", () => {
    state.preview.loop = !!refs.loopBtn.checked;
    if (runtime.previewSource) runtime.previewSource.loop = state.preview.loop;
    markSessionDirty();
    updateReadouts();
  });
  refs.saveBtn.addEventListener("click", () => void saveOutput());
  refs.sendBtn.addEventListener("click", () => void sendToLazy());
  refs.applyPresetBtn.addEventListener("click", () => applyPresetById(refs.presetSelect.value));

  const midiBindings = [
    [refs.intensityInput, "rcf.intensity", "RCF Intensity"],
    [refs.smoothInput, "rcf.smooth", "RCF Smooth"],
    [refs.depthInput, "rcf.timewarp.depth", "RCF Timewarp Depth"],
    [refs.rateInput, "rcf.timewarp.rate", "RCF Timewarp Rate"],
    [refs.reseedBtn, "rcf.action.reseed", "RCF Reseed"],
    [refs.renderBtn, "rcf.action.render", "RCF Render"],
  ];
  for (const [el, targetId, label] of midiBindings) {
    if (!el) continue;
    el.dataset.midiTarget = targetId;
    el.dataset.midiLabel = label;
  }
  document.addEventListener(
    "click",
    (event) => {
      const el = event.target?.closest?.("[data-midi-target]");
      if (!el || !runtime.midiMapMode) return;
      const targetId = el.dataset.midiTarget;
      if (!targetId) return;
      event.preventDefault();
      event.stopPropagation();
      armMidiTarget(targetId, el.dataset.midiLabel || targetId);
    },
    true
  );

  window.addEventListener("message", async (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.version !== 1 || typeof data.type !== "string") return;
    if (data.type === "PANIC_KILL") {
      stopPreview();
      if (runtime.audioContext) {
        try { await runtime.audioContext.close(); } catch {}
        runtime.audioContext = null;
      }
      setStatus("PANIC KILL");
      return;
    }
    if (data.type === "AUDIO_RESET_DONE") {
      setStatus("AUDIO RESET READY");
      return;
    }
    if (data.type === "SESSION_EXPORT_REQ") {
      const includeOnlyDirty = data?.payload?.includeOnlyDirty !== false;
      const chunk = await exportSessionChunk(includeOnlyDirty);
      window.parent?.postMessage(
        {
          type: "SESSION_EXPORT_RES",
          version: 1,
          payload: { moduleId: "rcf", schemaVersion: 1, dirty: Boolean(runtime.sessionDirty), chunk },
        },
        "*"
      );
      return;
    }
    if (data.type === "SESSION_IMPORT") {
      try {
        await importSessionChunk(data?.payload?.chunk || {});
        setStatus("SESSION LOADED");
      } catch (error) {
        setStatus(`SESSION IMPORT FAILED: ${String(error?.message || error)}`, true);
      }
      return;
    }
    if (data.type === "SESSION_SAVED") {
      runtime.sessionDirty = false;
      setStatus("SESSION SAVED");
      return;
    }
    if (data.type === "MIDI_MAP_MODE") {
      runtime.midiMapMode = Boolean(data?.payload?.enabled);
      return;
    }
    if (data.type === "MIDI_TARGET_SET") {
      applyMidiTarget(String(data.targetId || ""), Number(data.value01));
      return;
    }
    if (data.type === "DENARRATOR_GLOBAL_PLAY") {
      if (!state.preview.playing) void playPreview();
      return;
    }
    if (data.type === "DENARRATOR_GLOBAL_STOP") {
      if (state.preview.playing || runtime.previewSource) stopPreview();
      return;
    }
    if (data.type === "GLOBAL_PLAY_CLEAR") {
      if (runtime.previewPlayToken) {
        globalPlayStop(runtime.previewPlayToken);
        runtime.previewPlayToken = null;
      }
      return;
    }
    if (data.type === "UI_SQUISH_SET") {
      document.documentElement.classList.toggle("dn-squish", Boolean(data?.payload?.enabled));
      return;
    }
    if (data.type === "PATHS_BROADCAST") {
      runtime.paths = data?.payload || null;
      return;
    }
    if (data.type === "CLIPLIB_LIST_RES") {
      const items = Array.isArray(data.items) ? data.items : [];
      if (!items.length) {
        setStatus("CLIPLIB EMPTY", true);
        return;
      }
      const listing = items.slice(0, 12).map((item, idx) => `${idx + 1}: ${String(item?.name || "clip")}`).join("\n");
      const answer = window.prompt(`CLIPLIB PICK\n${listing}`, "1");
      if (!answer) {
        setStatus("CLIPLIB PICK CANCELLED");
        return;
      }
      const idx = Math.floor(Number(answer)) - 1;
      if (!Number.isFinite(idx) || idx < 0 || idx >= items.length) {
        setStatus("INVALID PICK", true);
        return;
      }
      const path = String(items[idx]?.path || "");
      if (!path) {
        setStatus("INVALID CLIP PATH", true);
        return;
      }
      requestCliplibWav(path);
      return;
    }
    if (data.type === "CLIPLIB_WAV_RES") {
      const requestId = String(data.requestId || "");
      if (requestId && runtime.pendingWavReqById.has(requestId)) {
        runtime.pendingWavReqById.delete(requestId);
      }
      const wav = String(data.wavBytesBase64 || "");
      if (!wav) {
        setStatus("EMPTY WAV DATA", true);
        return;
      }
      try {
        await importFromWavBase64(wav, data.name || "cliplib.wav", state.activeSlot);
      } catch (error) {
        setStatus(`CLIPLIB IMPORT FAILED: ${String(error?.message || error)}`, true);
      }
      return;
    }
    if (data.type === "CLIPLIB_WAV_ERR") {
      const requestId = String(data.requestId || "");
      runtime.pendingWavReqById.delete(requestId);
      setStatus(`CLIPLIB WAV FAILED: ${String(data.error || "error")}`, true);
      return;
    }
    if (data.type === "CLIPLIB_ADD_OK") {
      setStatus(`SENT: ${String(data.name || "clip")}`);
      return;
    }
    if (data.type === "CLIPLIB_ADD_ERR") {
      setStatus(`SEND FAILED: ${String(data.error || "error")}`, true);
      return;
    }
    if (data.type === "DENARRATOR_IMPORT_CLIP") {
      const targetSlotRaw = data.targetSlot;
      let targetSlot = state.activeSlot;
      if (typeof targetSlotRaw === "number") targetSlot = clamp(Math.floor(targetSlotRaw), 0, MAX_SLOTS - 1);
      if (typeof targetSlotRaw === "string" && /^slot_\d+$/i.test(targetSlotRaw)) {
        targetSlot = clamp(parseInt(targetSlotRaw.split("_")[1], 10) - 1, 0, MAX_SLOTS - 1);
      }
      if (typeof data.wavBytesBase64 === "string" && data.wavBytesBase64) {
        try {
          await importFromWavBase64(data.wavBytesBase64, data.name || "import.wav", targetSlot);
        } catch (error) {
          setStatus(`IMPORT FAILED: ${String(error?.message || error)}`, true);
        }
      }
    }
  });

  window.addEventListener("keydown", (event) => {
    if ((event.code === "Space" || event.key === " ") && !event.repeat) {
      const target = event.target;
      const tag = String(target?.tagName || "").toUpperCase();
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT" && !target?.isContentEditable) {
        event.preventDefault();
        window.parent?.postMessage({ type: "DENARRATOR_GLOBAL_TOGGLE", version: 1 }, "*");
      }
    }
  });
}

function initPresets() {
  refs.presetSelect.innerHTML = PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
  refs.presetSelect.value = PRESETS[0].id;
}

function init() {
  registerMidiTargets();
  window.parent?.postMessage({ type: "PATHS_REQ", version: 1 }, "*");
  installTactileButtons(document);
  ensureParamDefaults();
  initPresets();
  syncControlsFromState();
  renderSlots();
  bindEvents();
  drawWave();
}

init();
