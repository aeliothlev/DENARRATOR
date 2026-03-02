import { buildAutoBandRanges } from "./src/audio/bandAutoConfig.js";

const refs = {
  status: document.getElementById("status"),
  renderBtn: document.getElementById("renderBtn"),
  playBtn: document.getElementById("playBtn"),
  loopBtn: document.getElementById("loopBtn"),
  saveBtn: document.getElementById("saveBtn"),
  sendBtn: document.getElementById("sendBtn"),
  renderInfo: document.getElementById("renderInfo"),
  slots: document.getElementById("slots"),
  modeSel: document.getElementById("modeSel"),
  lenSel: document.getElementById("lenSel"),
  durInput: document.getElementById("durInput"),
  durVal: document.getElementById("durVal"),
  seedInput: document.getElementById("seedInput"),
  reseedBtn: document.getElementById("reseedBtn"),
  normBtn: document.getElementById("normBtn"),
  airbagBtn: document.getElementById("airbagBtn"),
  presetSel: document.getElementById("presetSel"),
  presetApplyBtn: document.getElementById("presetApplyBtn"),
  presetSaveAsBtn: document.getElementById("presetSaveAsBtn"),
  presetDeleteBtn: document.getElementById("presetDeleteBtn"),
  timeControls: document.getElementById("timeControls"),
  specControls: document.getElementById("specControls"),
  projControls: document.getElementById("projControls"),
  timeSrcSel: document.getElementById("timeSrcSel"),
  timeWarpInput: document.getElementById("timeWarpInput"),
  timeWarpVal: document.getElementById("timeWarpVal"),
  timeScramInput: document.getElementById("timeScramInput"),
  timeScramVal: document.getElementById("timeScramVal"),
  timeGrainInput: document.getElementById("timeGrainInput"),
  timeGrainVal: document.getElementById("timeGrainVal"),
  timeXfadeInput: document.getElementById("timeXfadeInput"),
  timeXfadeVal: document.getElementById("timeXfadeVal"),
  timeRevSel: document.getElementById("timeRevSel"),
  timeSmoothInput: document.getElementById("timeSmoothInput"),
  timeSmoothVal: document.getElementById("timeSmoothVal"),
  specFrameInput: document.getElementById("specFrameInput"),
  specFrameVal: document.getElementById("specFrameVal"),
  specFftSel: document.getElementById("specFftSel"),
  specHopSel: document.getElementById("specHopSel"),
  specMagSel: document.getElementById("specMagSel"),
  specPhaseSel: document.getElementById("specPhaseSel"),
  specRotInput: document.getElementById("specRotInput"),
  specRotVal: document.getElementById("specRotVal"),
  specMorphInput: document.getElementById("specMorphInput"),
  specMorphVal: document.getElementById("specMorphVal"),
  specBandSwInput: document.getElementById("specBandSwInput"),
  specBandSwVal: document.getElementById("specBandSwVal"),
  specTiltInput: document.getElementById("specTiltInput"),
  specTiltVal: document.getElementById("specTiltVal"),
  specTprotInput: document.getElementById("specTprotInput"),
  specTprotVal: document.getElementById("specTprotVal"),
  specBlurInput: document.getElementById("specBlurInput"),
  specBlurVal: document.getElementById("specBlurVal"),
  specBandScaleSel: document.getElementById("specBandScaleSel"),
  specBandDbgBtn: document.getElementById("specBandDbgBtn"),
  specBandDebugWrap: document.getElementById("specBandDebugWrap"),
  specBandDebugCanvas: document.getElementById("specBandDebugCanvas"),
  specBandDebugText: document.getElementById("specBandDebugText"),
  projInSel: document.getElementById("projInSel"),
  projBasisSel: document.getElementById("projBasisSel"),
  projKInput: document.getElementById("projKInput"),
  projKVal: document.getElementById("projKVal"),
  projWinInput: document.getElementById("projWinInput"),
  projWinVal: document.getElementById("projWinVal"),
  projOutSel: document.getElementById("projOutSel"),
  projMixInput: document.getElementById("projMixInput"),
  projMixVal: document.getElementById("projMixVal"),
  projOrthoBtn: document.getElementById("projOrthoBtn"),
  projSmoothInput: document.getElementById("projSmoothInput"),
  projSmoothVal: document.getElementById("projSmoothVal"),
  waveCanvas: document.getElementById("waveCanvas"),
  fileInput: document.getElementById("fileInput"),
};

const FACTORY_PRESETS = [
  { id: "factory_time_shatter", name: "SHATTER", kind: "factory", mode: "TIME", global: { targetLenMode: "MEAN", normalize: true, airbag: true, seed: 111 }, params: { SRC: "A", WARP: 0.25, SCRAM: 0.85, GRAIN_MS: 22, XFADE_MS: 9, REV_RULE: "OFF", SMOOTH: 0.15 } },
  { id: "factory_time_diagonal_weave", name: "DIAG WEAVE", kind: "factory", mode: "TIME", global: { targetLenMode: "MEAN", normalize: true, airbag: true, seed: 222 }, params: { SRC: "DIAG", WARP: 0.15, SCRAM: 0.55, GRAIN_MS: 38, XFADE_MS: 10, REV_RULE: "2ND_ROW", SMOOTH: 0.22 } },
  { id: "factory_time_tape_drift", name: "TAPE DRIFT", kind: "factory", mode: "TIME", global: { targetLenMode: "MEAN", normalize: true, airbag: true, seed: 333 }, params: { SRC: "A", WARP: 0.75, SCRAM: 0.12, GRAIN_MS: 55, XFADE_MS: 12, REV_RULE: "OFF", SMOOTH: 0.35 } },
  { id: "factory_spec_magA_phaseRand", name: "MAG A / PH RAND", kind: "factory", mode: "SPECTRAL", global: { targetLenMode: "MEAN", normalize: true, airbag: true, seed: 444 }, params: { FRAME_MS: 40, FFT: 2048, HOP: "QTR", MAG_SRC: "A", MAG_MORPH: 0, PHASE_SRC: "RAND", PHASE_ROT_DEG: 0, BANDSW: 0, TILT: -0.1, TPROT: 0.25, BLUR: 0.3 } },
  { id: "factory_spec_bandswap", name: "BANDSWAP", kind: "factory", mode: "SPECTRAL", global: { targetLenMode: "MEAN", normalize: true, airbag: true, seed: 555 }, params: { FRAME_MS: 35, FFT: 2048, HOP: "QTR", MAG_SRC: "MIX", MAG_MORPH: 0.5, PHASE_SRC: "A", PHASE_ROT_DEG: 0, BANDSW: 0.75, TILT: 0, TPROT: 0.15, BLUR: 0.2 } },
  { id: "factory_spec_phase_rotate", name: "PH ROT", kind: "factory", mode: "SPECTRAL", global: { targetLenMode: "MEAN", normalize: true, airbag: true, seed: 666 }, params: { FRAME_MS: 40, FFT: 2048, HOP: "QTR", MAG_SRC: "A", MAG_MORPH: 0, PHASE_SRC: "ROT", PHASE_ROT_DEG: 90, BANDSW: 0, TILT: 0.1, TPROT: 0.1, BLUR: 0.15 } },
  { id: "factory_proj_essence_sin16", name: "ESSENCE (SIN16)", kind: "factory", mode: "PROJECT", global: { targetLenMode: "MEAN", normalize: true, airbag: true, seed: 777 }, params: { IN: "A", BASIS: "SINBANK", K: 16, WIN_MS: 80, OUT: "PROJECT", MIX: 0.5, ORTHO: false, SMOOTH: 0.25 } },
  { id: "factory_proj_remainder_wave24", name: "REMAINDER (WAV24)", kind: "factory", mode: "PROJECT", global: { targetLenMode: "MEAN", normalize: true, airbag: true, seed: 888 }, params: { IN: "A", BASIS: "WAVEBANK", K: 24, WIN_MS: 90, OUT: "RESIDUAL", MIX: 0.5, ORTHO: false, SMOOTH: 0.18 } },
  { id: "factory_proj_split_mix", name: "SPLIT MIX", kind: "factory", mode: "PROJECT", global: { targetLenMode: "MEAN", normalize: true, airbag: true, seed: 999 }, params: { IN: "A", BASIS: "WAVEBANK", K: 20, WIN_MS: 70, OUT: "MIX", MIX: 0.62, ORTHO: false, SMOOTH: 0.22 } },
];

const USER_PRESET_FILE_META = {
  version: 1,
  module: "projektor",
  file: "DENARRATOR/presets/projektor_presets.json",
};

function makeEmptySlot(label) {
  return { id: label, name: `${label}: empty`, sourceRef: null, buffer: null };
}

const state = {
  mode: "TIME",
  activeSlot: 0,
  inputs: [makeEmptySlot("A"), makeEmptySlot("B"), makeEmptySlot("C"), makeEmptySlot("D")],
  global: { targetLenMode: "MEAN", targetLenSec: 4, seed: 1234, stereoLinked: true, normalize: true, airbag: true },
  params: {
    TIME: { SRC: "A", WARP: 0.25, SCRAM: 0.85, GRAIN_MS: 22, XFADE_MS: 9, REV_RULE: "OFF", SMOOTH: 0.15 },
    SPECTRAL: { FRAME_MS: 40, FFT: 2048, HOP: "QTR", MAG_SRC: "A", MAG_MORPH: 0, PHASE_SRC: "RAND", PHASE_ROT_DEG: 0, BANDSW: 0, TILT: -0.1, TPROT: 0.25, BLUR: 0.3, BAND_SCALE: "BARK", BAND_DEBUG: false },
    PROJECT: { IN: "A", BASIS: "SINBANK", K: 16, WIN_MS: 80, OUT: "PROJECT", MIX: 0.5, ORTHO: false, SMOOTH: 0.25 },
  },
  render: { busy: false, tempExists: false, tempPath: null, outBuffer: null, playing: false, loop: false, offsetSec: 0, lastError: null },
  userPresets: [],
};

const runtime = {
  audioContext: null,
  source: null,
  analyser: null,
  meterData: null,
  meterRaf: null,
  playToken: null,
  startedAt: 0,
  startOffset: 0,
  durationSec: 0,
  cliplibReqSeq: 1,
  pendingCliplibList: new Map(),
  pendingCliplibWav: new Map(),
  sessionDirty: false,
  renderSaveSeqByKey: {},
  midiMapMode: false,
  midiLastTrigger: {},
  specDebug: null,
  paths: null,
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function setStatus(text, isError = false) { refs.status.textContent = text; refs.status.style.color = isError ? "#8a3a2d" : "#55585a"; }
function markDirty() { runtime.sessionDirty = true; }
function nextSeed() { return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1; }
function makeRng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 0xffffffff); }; }

function getInvoke() {
  const own = window.__TAURI__?.core?.invoke;
  if (typeof own === "function") return own;
  try {
    const parentInvoke = window.parent?.__TAURI__?.core?.invoke;
    if (typeof parentInvoke === "function") return parentInvoke;
  } catch {}
  return null;
}

async function openAudioFileViaDialog() {
  const invoke = getInvoke();
  if (!invoke) return null;
  try {
    const path = await invoke("dialog_open_file", {
      defaultDir: runtime.paths?.mater || null,
      filters: [{ name: "Audio", extensions: ["wav", "aiff", "aif", "flac", "mp3", "ogg"] }],
      dialogKey: "projektor.loadAudio",
    });
    if (!path) return null;
    const b64 = await invoke("read_file_base64", { path: String(path) });
    const name = String(path).split(/[\\/]/).pop() || "audio.wav";
    return { name, arrayBuffer: base64ToArrayBuffer(b64) };
  } catch {
    return null;
  }
}

function getAllPresets() {
  return [...FACTORY_PRESETS, ...state.userPresets];
}

function refreshPresetOptions(selectedId = null) {
  const all = getAllPresets();
  refs.presetSel.innerHTML = all
    .map((p) => `<option value="${p.id}">${p.kind === "user" ? "USER | " : "FACTORY | "}${p.name}</option>`)
    .join("");
  const fallback = all[0]?.id || "";
  refs.presetSel.value = selectedId && all.some((p) => p.id === selectedId) ? selectedId : fallback;
}

async function loadUserPresetsFromDisk() {
  const invoke = getInvoke();
  if (!invoke) return;
  try {
    const text = await invoke("projektor_presets_read");
    if (!text) return;
    const parsed = JSON.parse(String(text));
    const list = Array.isArray(parsed?.presets) ? parsed.presets : [];
    state.userPresets = list
      .filter((p) => p && typeof p === "object" && p.kind === "user" && typeof p.id === "string")
      .map((p) => ({
        id: String(p.id),
        name: String(p.name || "USER"),
        kind: "user",
        mode: String(p.mode || "TIME"),
        global: { ...(p.global || {}) },
        params: { ...(p.params || {}) },
      }));
  } catch (error) {
    setStatus(`User presets load failed: ${String(error?.message || error)}`, true);
  }
}

async function saveUserPresetsToDisk() {
  const invoke = getInvoke();
  if (!invoke) return false;
  const payload = {
    version: USER_PRESET_FILE_META.version,
    module: USER_PRESET_FILE_META.module,
    presets: state.userPresets.map((p) => ({
      id: p.id,
      name: p.name,
      kind: "user",
      mode: p.mode,
      global: { ...(p.global || {}) },
      params: { ...(p.params || {}) },
    })),
  };
  try {
    return Boolean(await invoke("projektor_presets_write", { text: JSON.stringify(payload, null, 2) }));
  } catch (error) {
    setStatus(`User presets save failed: ${String(error?.message || error)}`, true);
    return false;
  }
}

function installTactileButtons(root = document) {
  const styleId = "dn-squish-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `html.dn-squish .dn-btn{--press-scale:.88;--press-rotate:-1.2deg;--press-y:1px;--press-dur:55ms;--release-dur:220ms;--ease-in:cubic-bezier(.2,0,.15,1);--ease-out-back:cubic-bezier(.16,.95,.24,1.35);transform:translateZ(0) translateY(0) rotate(0deg) scale(1);transition:transform var(--release-dur) var(--ease-out-back),filter var(--release-dur) var(--ease-out-back),opacity 140ms var(--ease-in),background-color 140ms var(--ease-in),color 140ms var(--ease-in),box-shadow var(--release-dur) var(--ease-out-back)}html.dn-squish .dn-btn.is-pressing{transition:transform var(--press-dur) var(--ease-in),filter var(--press-dur) var(--ease-in),opacity var(--press-dur) var(--ease-in),background-color var(--press-dur) var(--ease-in),color var(--press-dur) var(--ease-in),box-shadow var(--press-dur) var(--ease-in);transform:translateZ(0) translateY(var(--press-y)) rotate(var(--press-rotate)) scale(var(--press-scale));filter:brightness(1.16) saturate(1.45);box-shadow:0 0 10px rgba(255,255,255,.2)}`;
    document.head.appendChild(style);
  }
  const addClass = () => root.querySelectorAll("button").forEach((b) => b.classList.add("dn-btn"));
  addClass();
  new MutationObserver(addClass).observe(root.documentElement || root.body, { childList: true, subtree: true });
  const clear = () => root.querySelectorAll(".dn-btn.is-pressing").forEach((b) => b.classList.remove("is-pressing"));
  root.addEventListener("pointerdown", (event) => { const b = event.target?.closest?.(".dn-btn"); if (!b || b.disabled) return; b.classList.add("is-pressing"); try { b.setPointerCapture(event.pointerId); } catch {} }, { passive: true, capture: true });
  root.addEventListener("pointerup", (event) => { const b = event.target?.closest?.(".dn-btn"); if (b) b.classList.remove("is-pressing"); else clear(); }, { passive: true, capture: true });
  root.addEventListener("pointercancel", clear, { passive: true, capture: true });
}

function ensureAudioContext() {
  if (!runtime.audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    runtime.audioContext = new Ctor();
  }
  return runtime.audioContext;
}

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
function splitFileNameParts(fileName) {
  const trimmed = String(fileName || "render.wav").trim() || "render.wav";
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return { stem: trimmed, ext: ".wav" };
  return { stem: trimmed.slice(0, dot), ext: trimmed.slice(dot) || ".wav" };
}
function pathSeparator(path) { return String(path || "").includes("\\") ? "\\" : "/"; }
function pathDir(path) { const value = String(path || ""); const idx = Math.max(value.lastIndexOf("/"), value.lastIndexOf("\\")); return idx >= 0 ? value.slice(0, idx) : ""; }
function joinPath(dir, file, sep = "/") { return dir ? `${dir}${sep}${file}` : file; }
function indexedFileName(stem, ext, index) { if (index <= 1) return `${stem}${ext}`; return `${stem}_${String(index).padStart(3, "0")}${ext}`; }

async function saveBlobWithDialog(blob, suggestedName) {
  const ownInvoke = window.__TAURI__?.core?.invoke;
  let invoke = typeof ownInvoke === "function" ? ownInvoke : null;
  if (!invoke) {
    try { const parentInvoke = window.parent?.__TAURI__?.core?.invoke; if (typeof parentInvoke === "function") invoke = parentInvoke; } catch {}
  }
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
async function saveBlobWithDialogPath(blob, suggestedName) {
  const ownInvoke = window.__TAURI__?.core?.invoke;
  let invoke = typeof ownInvoke === "function" ? ownInvoke : null;
  if (!invoke) {
    try { const parentInvoke = window.parent?.__TAURI__?.core?.invoke; if (typeof parentInvoke === "function") invoke = parentInvoke; } catch {}
  }
  if (typeof invoke !== "function") return null;
  try {
    const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
    return await invoke("save_blob_with_dialog_path", { dataBase64, suggestedName });
  } catch { return null; }
}
async function saveBlobToPath(blob, path) {
  const ownInvoke = window.__TAURI__?.core?.invoke;
  let invoke = typeof ownInvoke === "function" ? ownInvoke : null;
  if (!invoke) {
    try { const parentInvoke = window.parent?.__TAURI__?.core?.invoke; if (typeof parentInvoke === "function") invoke = parentInvoke; } catch {}
  }
  if (typeof invoke !== "function") return false;
  try {
    const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
    return Boolean(await invoke("save_blob_to_path", { dataBase64, path }));
  } catch { return false; }
}
async function saveBlobSequenced(blob, suggestedName, sequenceKey) {
  const seq = runtime.renderSaveSeqByKey[sequenceKey];
  if (seq && !seq.dialogOnly && seq.dir && seq.stem && seq.ext && seq.sep) {
    const fileName = indexedFileName(seq.stem, seq.ext, seq.nextIndex || 2);
    const targetPath = joinPath(seq.dir, fileName, seq.sep);
    const ok = await saveBlobToPath(blob, targetPath);
    if (ok) { seq.nextIndex = (seq.nextIndex || 2) + 1; return "saved"; }
    seq.dialogOnly = true;
  } else {
    const pickedPath = await saveBlobWithDialogPath(blob, suggestedName);
    if (pickedPath) {
      const sep = pathSeparator(pickedPath);
      const pickedName = pickedPath.split(/[\\/]/).pop() || suggestedName;
      const parts = splitFileNameParts(pickedName);
      runtime.renderSaveSeqByKey[sequenceKey] = { dir: pathDir(pickedPath), sep, stem: parts.stem, ext: parts.ext, nextIndex: 2, dialogOnly: false };
      return "saved";
    }
  }
  const fallback = await saveBlobWithDialog(blob, suggestedName);
  if (fallback === "saved") {
    const parts = splitFileNameParts(suggestedName);
    runtime.renderSaveSeqByKey[sequenceKey] = { dir: "", sep: "/", stem: parts.stem, ext: parts.ext, nextIndex: 2, dialogOnly: true };
  }
  return fallback;
}

function globalPlayStart(sourceLabel) {
  const token = `projektor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try { window.parent?.postMessage({ type: "GLOBAL_PLAY_START", version: 1, payload: { token, moduleId: "projektor", source: sourceLabel } }, "*"); } catch {}
  return token;
}
function globalPlayStop(token) {
  if (!token) return;
  try { window.parent?.postMessage({ type: "GLOBAL_PLAY_STOP", version: 1, payload: { token } }, "*"); } catch {}
}

function toStereoFloatArrays(audioBuffer) {
  const L = new Float32Array(audioBuffer.getChannelData(0));
  const R = audioBuffer.numberOfChannels > 1 ? new Float32Array(audioBuffer.getChannelData(1)) : new Float32Array(L);
  return { sr: audioBuffer.sampleRate, frames: audioBuffer.length, data: [L, R], channels: 2 };
}

function resampleLinear(input, outFrames) {
  if (outFrames <= 0) return new Float32Array(0);
  const inFrames = input.length;
  if (inFrames === outFrames) return new Float32Array(input);
  const out = new Float32Array(outFrames);
  for (let i = 0; i < outFrames; i += 1) {
    const t = (i / Math.max(1, outFrames - 1)) * Math.max(0, inFrames - 1);
    const a = Math.floor(t);
    const b = Math.min(inFrames - 1, a + 1);
    const frac = t - a;
    out[i] = input[a] * (1 - frac) + input[b] * frac;
  }
  return out;
}

function normalizeStereo(buffer, target = 0.95) {
  let peak = 0;
  for (let c = 0; c < 2; c += 1) for (let i = 0; i < buffer.data[c].length; i += 1) peak = Math.max(peak, Math.abs(buffer.data[c][i]));
  if (peak <= 1e-9 || peak <= target) return;
  const g = target / peak;
  for (let c = 0; c < 2; c += 1) for (let i = 0; i < buffer.data[c].length; i += 1) buffer.data[c][i] *= g;
}
function softClip(v, amt = 1.4) { const n = Math.tanh(amt); return Math.tanh(v * amt) / n; }
function applyAirbag(buffer) { for (let c = 0; c < 2; c += 1) for (let i = 0; i < buffer.data[c].length; i += 1) buffer.data[c][i] = softClip(buffer.data[c][i], 1.4); }
function onePoleLP(input, amount01) {
  const out = new Float32Array(input.length);
  const a = clamp(0.02 + (1 - amount01) * 0.6, 0.01, 0.95);
  let y = input[0] || 0;
  for (let i = 0; i < input.length; i += 1) { y += a * (input[i] - y); out[i] = y; }
  return out;
}

function getLoadedInputs() { return state.inputs.filter((slot) => slot.buffer); }

function targetFramesFromMode() {
  const loaded = getLoadedInputs();
  const sr = 48000;
  if (!loaded.length) return Math.round(state.global.targetLenSec * sr);
  const lengths = loaded.map((s) => s.buffer.frames);
  if (state.global.targetLenMode === "MAX") return Math.max(...lengths);
  if (state.global.targetLenMode === "MANUAL") return Math.max(1, Math.round(clamp(state.global.targetLenSec, 0.5, 16) * sr));
  return Math.max(1, Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length));
}

function buildPreparedInputs(targetFrames) {
  const slotMap = new Map();
  for (const slot of state.inputs) {
    if (!slot.buffer) continue;
    slotMap.set(slot.id, {
      L: resampleLinear(slot.buffer.data[0], targetFrames),
      R: resampleLinear(slot.buffer.data[1], targetFrames),
    });
  }
  return slotMap;
}

function getTimeSourceSlotIds() {
  if (state.params.TIME.SRC === "AB") return ["A", "B"];
  if (state.params.TIME.SRC === "DIAG") return ["A", "B", "C", "D"];
  return ["A"];
}

function renderTimeMode(prepped, targetFrames, sr) {
  const ids = getTimeSourceSlotIds().filter((id) => prepped.has(id));
  if (!ids.length) throw new Error("TIME: no input");
  const p = state.params.TIME;
  const grain = clamp(Math.round((p.GRAIN_MS / 1000) * sr), 64, Math.max(64, Math.floor(targetFrames / 2)));
  const count = Math.max(1, Math.floor(targetFrames / grain));
  const rng = makeRng((state.global.seed >>> 0) ^ 0x9919);
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    if (rng() > p.SCRAM) continue;
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const outL = new Float32Array(count * grain);
  const outR = new Float32Array(count * grain);
  const xfade = clamp(Math.round((p.XFADE_MS / 1000) * sr), 0, Math.floor(grain / 3));
  for (let gi = 0; gi < count; gi += 1) {
    const slotId = ids[gi % ids.length];
    const src = prepped.get(slotId);
    const srcIdx = order[gi];
    const base = clamp(Math.floor(srcIdx * grain * (0.2 + p.WARP * 0.8)), 0, Math.max(0, targetFrames - grain - 1));
    const reverse = p.REV_RULE === "2ND_SL" ? ((gi + 1) % 2 === 0)
      : p.REV_RULE === "2ND_ROW" ? ((gi % ids.length) % 2 === 1 && ((gi + 1) % 2 === 0))
      : false;
    const dstBase = gi * grain;
    for (let i = 0; i < grain; i += 1) {
      const sIdx = reverse ? base + (grain - 1 - i) : base + i;
      const a = i < xfade ? i / Math.max(1, xfade) : (i >= grain - xfade ? (grain - 1 - i) / Math.max(1, xfade) : 1);
      const mix = clamp(a, 0, 1);
      outL[dstBase + i] += src.L[sIdx] * mix;
      outR[dstBase + i] += src.R[sIdx] * mix;
    }
  }
  if (p.SMOOTH > 0.001) {
    const amt = clamp(p.SMOOTH, 0, 1);
    return { L: onePoleLP(outL, 1 - amt), R: onePoleLP(outR, 1 - amt) };
  }
  return { L: outL, R: outR };
}

function fft(re, im, inverse = false) {
  const n = re.length;
  let j = 0;
  for (let i = 0; i < n; i += 1) {
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
    let m = n >> 1;
    while (j >= m && m >= 2) { j -= m; m >>= 1; }
    j += m;
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inverse ? 2 : -2) * Math.PI / len;
    const wlenCos = Math.cos(ang);
    const wlenSin = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wCos = 1;
      let wSin = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vRe = re[i + k + len / 2] * wCos - im[i + k + len / 2] * wSin;
        const vIm = re[i + k + len / 2] * wSin + im[i + k + len / 2] * wCos;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe;
        im[i + k + len / 2] = uIm - vIm;
        const nextCos = wCos * wlenCos - wSin * wlenSin;
        const nextSin = wCos * wlenSin + wSin * wlenCos;
        wCos = nextCos;
        wSin = nextSin;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i += 1) { re[i] /= n; im[i] /= n; }
  }
}

function buildBandMask(numBands, amount01, seed) {
  const K = Math.max(0, Math.min(numBands, Math.round(amount01 * numBands)));
  const bands = Array.from({ length: numBands }, (_, i) => i);
  const rnd = makeRng(seed >>> 0);
  for (let i = bands.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [bands[i], bands[j]] = [bands[j], bands[i]];
  }
  const mask = new Uint8Array(numBands);
  for (let i = 0; i < K; i += 1) mask[bands[i]] = 1;
  return mask;
}

function formatBandRanges(bandRanges) {
  return bandRanges.map((b, i) => `B${String(i).padStart(2, "0")}: ${Math.round(b.f0)}-${Math.round(b.f1)} Hz (k${b.k0}-${b.k1})`);
}

function drawBandOverlay() {
  const canvas = refs.specBandDebugCanvas;
  const text = refs.specBandDebugText;
  if (!canvas || !text) return;
  const debug = runtime.specDebug;
  if (!debug?.ranges?.length) {
    text.textContent = "No band data yet";
    const c = canvas.getContext("2d");
    c.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.floor(canvas.clientWidth * ratio));
  const h = Math.max(1, Math.floor(canvas.clientHeight * ratio));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#f5f2eb";
  ctx.fillRect(0, 0, w, h);
  const nyq = debug.sampleRate / 2;
  const hzToX = (hz) => Math.max(0, Math.min(w, (hz / nyq) * w));
  for (let i = 0; i < debug.ranges.length; i += 1) {
    const b = debug.ranges[i];
    const x0 = hzToX(b.f0);
    const x1 = hzToX(b.f1);
    const ww = Math.max(1, x1 - x0);
    ctx.fillStyle = debug.mask?.[i] ? "rgba(42,43,45,0.82)" : "rgba(42,43,45,0.12)";
    ctx.fillRect(x0, 0, ww, h);
    ctx.strokeStyle = "rgba(42,43,45,0.28)";
    ctx.beginPath();
    ctx.moveTo(x0 + 0.5, 0);
    ctx.lineTo(x0 + 0.5, h);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(42,43,45,0.55)";
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  text.textContent = formatBandRanges(debug.ranges).join("\n");
}

function applyTilt(mag, sampleRate, fftSize, tilt) {
  const t = clamp(tilt, -1, 1);
  if (Math.abs(t) < 1e-6) return;
  const maxDbPerOct = 12;
  const s = maxDbPerOct * Math.sign(t) * Math.pow(Math.abs(t), 1.35);
  const pivot = 1000;
  for (let k = 1; k < mag.length; k += 1) {
    const f = Math.max(20, (k * sampleRate) / fftSize);
    const oct = Math.log2(f / pivot);
    const db = clamp(s * oct, -24, 24);
    mag[k] *= Math.pow(10, db / 20);
  }
}

function buildSwapWeightByBin(ranges, mask, bins, edgeBins = 4) {
  const weights = new Float32Array(bins + 1);
  for (let bi = 0; bi < ranges.length; bi += 1) {
    if (!mask[bi]) continue;
    const r = ranges[bi];
    const k0 = clamp(r.k0, 0, bins);
    const k1 = clamp(r.k1, 0, bins);
    const len = Math.max(1, k1 - k0 + 1);
    const e = Math.max(0, Math.min(edgeBins, Math.floor(len / 2)));
    for (let k = k0; k <= k1; k += 1) {
      let w = 1;
      if (e > 0) {
        if (k < k0 + e) w = (k - k0) / e;
        else if (k > k1 - e) w = (k1 - k) / e;
      }
      weights[k] = Math.max(weights[k], clamp(w, 0, 1));
    }
  }
  return weights;
}

function blurMagnitudesInPlace(mag, amount01) {
  const amt = clamp(amount01, 0, 1);
  if (amt < 1e-4) return;
  const out = new Float32Array(mag.length);
  out[0] = mag[0];
  const wCenter = 0.5 + (1 - amt) * 0.45;
  const wSide = (1 - wCenter) / 2;
  for (let k = 1; k < mag.length - 1; k += 1) out[k] = mag[k - 1] * wSide + mag[k] * wCenter + mag[k + 1] * wSide;
  out[mag.length - 1] = mag[mag.length - 1];
  mag.set(out);
}

function renderSpectralChannel(primary, secondary, phaseSrc, targetFrames, sr, channelId = 0) {
  const p = state.params.SPECTRAL;
  const fftSize = clamp(Number(p.FFT) || 2048, 256, 4096);
  const hop = p.HOP === "HALF" ? Math.floor(fftSize / 2) : Math.floor(fftSize / 4);
  const frameCount = Math.max(1, Math.floor((targetFrames - fftSize) / hop) + 1);
  const out = new Float32Array(targetFrames + fftSize);
  const acc = new Float32Array(targetFrames + fftSize);
  const window = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i += 1) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, fftSize - 1));
  const bins = fftSize / 2;
  const ranges = buildAutoBandRanges({ sampleRate: sr, fftSize, scale: p.BAND_SCALE || "BARK", includeDC: false, preferAir: false });
  const bandMask = buildBandMask(ranges.length, p.BANDSW, (state.global.seed ^ 0xa53f) >>> 0);
  const swapW = buildSwapWeightByBin(ranges, bandMask, bins, 4);
  if (channelId === 0) runtime.specDebug = { ranges, mask: bandMask, sampleRate: sr };
  const rng = makeRng((state.global.seed ^ 0x1731) >>> 0);
  let prevMagA = null;
  let maxFlux = 1e-9;
  for (let f = 0; f < frameCount; f += 1) {
    const base = f * hop;
    const reA = new Float32Array(fftSize);
    const imA = new Float32Array(fftSize);
    const reB = new Float32Array(fftSize);
    const imB = new Float32Array(fftSize);
    const reP = new Float32Array(fftSize);
    const imP = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i += 1) {
      const s = base + i;
      reA[i] = (s < primary.length ? primary[s] : 0) * window[i];
      reB[i] = (s < secondary.length ? secondary[s] : 0) * window[i];
      reP[i] = (s < phaseSrc.length ? phaseSrc[s] : 0) * window[i];
    }
    fft(reA, imA, false);
    fft(reB, imB, false);
    fft(reP, imP, false);
    const outRe = new Float32Array(fftSize);
    const outIm = new Float32Array(fftSize);
    const magAFrame = new Float32Array(bins + 1);
    const magRaw = new Float32Array(bins + 1);
    const magBlur = new Float32Array(bins + 1);
    const morph = clamp(p.MAG_MORPH, 0, 1);
    const rot = (p.PHASE_ROT_DEG * Math.PI) / 180;
    let flux = 0;
    for (let k = 0; k <= bins; k += 1) {
      const magA = Math.hypot(reA[k], imA[k]);
      const magB = Math.hypot(reB[k], imB[k]);
      magAFrame[k] = magA;
      const primaryMag = lerp(magA, magB, morph);
      magRaw[k] = lerp(primaryMag, magB, swapW[k]);
      if (prevMagA) flux += Math.max(0, magA - prevMagA[k]);
    }
    prevMagA = magAFrame;
    maxFlux = Math.max(maxFlux, flux);
    applyTilt(magRaw, sr, fftSize, p.TILT);
    magBlur.set(magRaw);
    blurMagnitudesInPlace(magBlur, p.BLUR);
    const tMask = clamp((flux / maxFlux) * clamp(p.TPROT, 0, 1), 0, 1);
    for (let k = 0; k <= bins; k += 1) {
      const mag = lerp(magBlur[k], magRaw[k], tMask);
      let phase = Math.atan2(imP[k], reP[k]);
      if (p.PHASE_SRC === "RAND") phase = (rng() * 2 - 1) * Math.PI;
      if (p.PHASE_SRC === "ROT") phase += rot;
      outRe[k] = Math.cos(phase) * mag;
      outIm[k] = Math.sin(phase) * mag;
      if (k > 0 && k < bins) {
        outRe[fftSize - k] = outRe[k];
        outIm[fftSize - k] = -outIm[k];
      }
    }
    fft(outRe, outIm, true);
    for (let i = 0; i < fftSize; i += 1) {
      const idx = base + i;
      if (idx >= out.length) continue;
      const val = outRe[i] * window[i];
      out[idx] += val;
      acc[idx] += window[i] * window[i];
    }
  }
  const normalized = new Float32Array(targetFrames);
  for (let i = 0; i < targetFrames; i += 1) normalized[i] = out[i] / Math.max(1e-7, acc[i]);
  return normalized;
}

function pickSource(prepped, key, ch = 0) {
  const s = prepped.get(key);
  if (!s) return null;
  return ch === 0 ? s.L : s.R;
}

function sourceByLabel(prepped, label, ch = 0) {
  const direct = pickSource(prepped, label, ch);
  if (direct) return direct;
  return pickSource(prepped, "A", ch) || new Float32Array(0);
}

function renderSpectralMode(prepped, targetFrames, sr) {
  const p = state.params.SPECTRAL;
  const chooseMagA = (ch) => {
    if (p.MAG_SRC === "MIX") return sourceByLabel(prepped, "A", ch);
    return sourceByLabel(prepped, p.MAG_SRC, ch);
  };
  const chooseMagB = (ch) => sourceByLabel(prepped, "B", ch);
  const choosePhase = (ch) => {
    if (["A", "B", "C", "D"].includes(p.PHASE_SRC)) return sourceByLabel(prepped, p.PHASE_SRC, ch);
    return sourceByLabel(prepped, "A", ch);
  };
  const outL = renderSpectralChannel(chooseMagA(0), chooseMagB(0), choosePhase(0), targetFrames, sr, 0);
  const outR = renderSpectralChannel(chooseMagA(1), chooseMagB(1), choosePhase(1), targetFrames, sr, 1);
  return { L: outL, R: outR };
}

function renderProjectChannel(input, basisSource, targetFrames, sr) {
  const p = state.params.PROJECT;
  const win = clamp(Math.round((p.WIN_MS / 1000) * sr), 128, 8192);
  const hop = Math.floor(win / 2);
  const frames = Math.max(1, Math.floor((targetFrames - win) / hop) + 1);
  const K = clamp(Math.round(p.K), 1, 64);
  const outProj = new Float32Array(targetFrames + win);
  const outAcc = new Float32Array(targetFrames + win);
  const window = new Float32Array(win);
  for (let i = 0; i < win; i += 1) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, win - 1));
  const rng = makeRng((state.global.seed ^ 0x44ab) >>> 0);
  const atoms = [];
  if (p.BASIS === "PCA_FRAMES") {
    const frameCount = frames;
    const data = new Array(frameCount);
    const mean = new Float32Array(win);
    for (let f = 0; f < frameCount; f += 1) {
      const base = f * hop;
      const frame = new Float32Array(win);
      for (let i = 0; i < win; i += 1) {
        const v = (input[base + i] || 0) * window[i];
        frame[i] = v;
        mean[i] += v;
      }
      data[f] = frame;
    }
    for (let i = 0; i < win; i += 1) mean[i] /= Math.max(1, frameCount);
    const comps = [];
    const compCount = Math.min(K, 12);
    for (let c = 0; c < compCount; c += 1) {
      let v = new Float32Array(win);
      const rng = makeRng((state.global.seed ^ (0x9e37 + c)) >>> 0);
      for (let i = 0; i < win; i += 1) v[i] = (rng() * 2 - 1) * 0.1;
      for (let it = 0; it < 6; it += 1) {
        const next = new Float32Array(win);
        for (let f = 0; f < frameCount; f += 1) {
          const frame = data[f];
          let dot = 0;
          for (let i = 0; i < win; i += 1) dot += (frame[i] - mean[i]) * v[i];
          for (let i = 0; i < win; i += 1) next[i] += dot * (frame[i] - mean[i]);
        }
        for (const u of comps) {
          let du = 0;
          for (let i = 0; i < win; i += 1) du += next[i] * u[i];
          for (let i = 0; i < win; i += 1) next[i] -= du * u[i];
        }
        let norm = 1e-9;
        for (let i = 0; i < win; i += 1) norm += next[i] * next[i];
        norm = Math.sqrt(norm);
        for (let i = 0; i < win; i += 1) v[i] = next[i] / norm;
      }
      comps.push(v);
    }
    for (const comp of comps) atoms.push(comp);
    for (let f = 0; f < frames; f += 1) {
      const base = f * hop;
      const frame = new Float32Array(win);
      for (let i = 0; i < win; i += 1) frame[i] = (input[base + i] || 0) * window[i] - mean[i];
      const coeffs = new Float32Array(atoms.length);
      for (let k = 0; k < atoms.length; k += 1) {
        let dot = 0;
        const atom = atoms[k];
        for (let i = 0; i < win; i += 1) dot += frame[i] * atom[i];
        coeffs[k] = dot;
      }
      for (let i = 0; i < win; i += 1) {
        let s = mean[i];
        for (let k = 0; k < atoms.length; k += 1) s += coeffs[k] * atoms[k][i];
        outProj[base + i] += s;
        outAcc[base + i] += window[i] * window[i];
      }
    }
  } else if (p.BASIS === "WAVEBANK" && basisSource.length > win) {
    for (let k = 0; k < K; k += 1) {
      const start = Math.floor(rng() * Math.max(1, basisSource.length - win));
      const atom = new Float32Array(win);
      let norm = 1e-7;
      for (let i = 0; i < win; i += 1) { atom[i] = basisSource[start + i] * window[i]; norm += atom[i] * atom[i]; }
      norm = Math.sqrt(norm);
      for (let i = 0; i < win; i += 1) atom[i] /= norm;
      atoms.push(atom);
    }
  } else {
    for (let k = 0; k < K; k += 1) {
      const atom = new Float32Array(win);
      const freq = 40 * Math.pow(240, k / Math.max(1, K - 1));
      const w = (2 * Math.PI * freq) / sr;
      let norm = 1e-7;
      for (let i = 0; i < win; i += 1) { atom[i] = Math.sin(i * w) * window[i]; norm += atom[i] * atom[i]; }
      norm = Math.sqrt(norm);
      for (let i = 0; i < win; i += 1) atom[i] /= norm;
      atoms.push(atom);
    }
  }
  if (p.BASIS !== "PCA_FRAMES") {
    for (let f = 0; f < frames; f += 1) {
      const base = f * hop;
      const frame = new Float32Array(win);
      for (let i = 0; i < win; i += 1) frame[i] = (input[base + i] || 0) * window[i];
      const coeffs = new Float32Array(K);
      for (let k = 0; k < K; k += 1) {
        const atom = atoms[k];
        let dot = 0;
        for (let i = 0; i < win; i += 1) dot += frame[i] * atom[i];
        coeffs[k] = dot;
      }
      for (let i = 0; i < win; i += 1) {
        let s = 0;
        for (let k = 0; k < K; k += 1) s += coeffs[k] * atoms[k][i];
        outProj[base + i] += s;
        outAcc[base + i] += window[i] * window[i];
      }
    }
  }
  const proj = new Float32Array(targetFrames);
  for (let i = 0; i < targetFrames; i += 1) proj[i] = outProj[i] / Math.max(1e-7, outAcc[i]);
  const residual = new Float32Array(targetFrames);
  for (let i = 0; i < targetFrames; i += 1) residual[i] = input[i] - proj[i];
  const out = new Float32Array(targetFrames);
  for (let i = 0; i < targetFrames; i += 1) {
    if (p.OUT === "PROJECT") out[i] = proj[i];
    else if (p.OUT === "RESIDUAL") out[i] = residual[i];
    else out[i] = lerp(proj[i], residual[i], clamp(p.MIX, 0, 1));
  }
  if (p.SMOOTH > 0.001) return onePoleLP(out, 1 - p.SMOOTH);
  return out;
}

function renderProjectMode(prepped, targetFrames, sr) {
  const p = state.params.PROJECT;
  const inA = sourceByLabel(prepped, "A", 0);
  const inB = sourceByLabel(prepped, "B", 0);
  const inputL = p.IN === "AB" ? inA.map((v, i) => 0.5 * (v + (inB[i] || 0))) : inA;
  const inA2 = sourceByLabel(prepped, "A", 1);
  const inB2 = sourceByLabel(prepped, "B", 1);
  const inputR = p.IN === "AB" ? inA2.map((v, i) => 0.5 * (v + (inB2[i] || 0))) : inA2;
  const basisL = sourceByLabel(prepped, "B", 0).length ? sourceByLabel(prepped, "B", 0) : sourceByLabel(prepped, "C", 0);
  const basisR = sourceByLabel(prepped, "B", 1).length ? sourceByLabel(prepped, "B", 1) : sourceByLabel(prepped, "C", 1);
  const outL = renderProjectChannel(inputL, basisL, targetFrames, sr);
  const outR = renderProjectChannel(inputR, basisR, targetFrames, sr);
  return { L: outL, R: outR };
}

function renderOutput() {
  const loaded = getLoadedInputs();
  if (!loaded.length) throw new Error("Load at least one input");
  const targetFrames = targetFramesFromMode();
  const prepped = buildPreparedInputs(targetFrames);
  const sr = 48000;
  let rendered;
  if (state.mode === "SPECTRAL") rendered = renderSpectralMode(prepped, targetFrames, sr);
  else if (state.mode === "PROJECT") rendered = renderProjectMode(prepped, targetFrames, sr);
  else rendered = renderTimeMode(prepped, targetFrames, sr);
  const out = { sr, channels: 2, frames: targetFrames, data: [rendered.L, rendered.R] };
  if (state.global.airbag) applyAirbag(out);
  if (state.global.normalize) normalizeStereo(out, 0.95);
  state.render.outBuffer = out;
  markDirty();
  return out;
}

function outputFileName() {
  const mode = state.mode.toLowerCase();
  return `projektor_${mode}_seed${state.global.seed}.wav`;
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

function drawWave() {
  const canvas = refs.waveCanvas;
  const c = canvas.getContext("2d");
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.floor(canvas.clientWidth * ratio));
  const h = Math.max(1, Math.floor(canvas.clientHeight * ratio));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  c.clearRect(0, 0, w, h);
  c.fillStyle = "rgba(236,234,228,0.62)";
  c.fillRect(0, 0, w, h);
  const out = state.render.outBuffer;
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
    for (let i = start; i < end; i += 1) peak = Math.max(peak, Math.abs(mono[i]));
    c.moveTo(x + 0.5, mid - peak * amp);
    c.lineTo(x + 0.5, mid + peak * amp);
  }
  c.stroke();
  const durationSec = out.frames / Math.max(1, out.sr);
  let playheadSec = clamp(Number(state.render.offsetSec) || 0, 0, Math.max(0, durationSec));
  if (state.render.playing && runtime.audioContext && runtime.source && durationSec > 0) {
    const elapsed = Math.max(0, runtime.audioContext.currentTime - runtime.startedAt);
    let at = runtime.startOffset + elapsed;
    if (state.render.loop) at %= durationSec;
    else at = Math.min(durationSec, at);
    playheadSec = clamp(at, 0, durationSec);
  }
  const x = clamp(Math.round((playheadSec / Math.max(durationSec, 1e-6)) * (w - 1)), 1, Math.max(1, w - 2));
  c.strokeStyle = "rgba(138,58,45,1)";
  c.lineWidth = Math.max(2, Math.round(ratio * 2.2));
  c.beginPath();
  c.moveTo(x + 0.5, 0);
  c.lineTo(x + 0.5, h);
  c.stroke();
  c.fillStyle = "rgba(138,58,45,1)";
  c.beginPath();
  c.moveTo(x - Math.max(3, ratio * 2), 0);
  c.lineTo(x + Math.max(3, ratio * 2), 0);
  c.lineTo(x, Math.max(7, ratio * 5));
  c.closePath();
  c.fill();
}

function stopPlayback() {
  if (runtime.source && runtime.audioContext && runtime.durationSec > 0) {
    const elapsed = Math.max(0, runtime.audioContext.currentTime - runtime.startedAt);
    let nextOffset = runtime.startOffset + elapsed;
    if (state.render.loop) nextOffset %= runtime.durationSec;
    else nextOffset = Math.min(runtime.durationSec, nextOffset);
    state.render.offsetSec = clamp(nextOffset, 0, Math.max(0, runtime.durationSec - 0.0005));
  }
  if (runtime.source) {
    try { runtime.source.stop(); } catch {}
    try { runtime.source.disconnect(); } catch {}
    runtime.source = null;
  }
  if (runtime.playToken) { globalPlayStop(runtime.playToken); runtime.playToken = null; }
  if (runtime.meterRaf) { cancelAnimationFrame(runtime.meterRaf); runtime.meterRaf = null; }
  state.render.playing = false;
  refs.playBtn.textContent = "PLAY";
  refs.playBtn.setAttribute("aria-pressed", "false");
  window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
  drawWave();
}

function bufferToAudioBuffer(buffer) {
  const ctx = ensureAudioContext();
  const out = ctx.createBuffer(2, buffer.frames, buffer.sr);
  out.copyToChannel(buffer.data[0], 0);
  out.copyToChannel(buffer.data[1], 1);
  return out;
}

function startMeter() {
  const analyser = runtime.analyser;
  if (!analyser) return;
  if (!runtime.meterData || runtime.meterData.length !== analyser.fftSize) runtime.meterData = new Uint8Array(analyser.fftSize);
  const tick = () => {
    if (!state.render.playing || !runtime.source || !runtime.analyser) {
      runtime.meterRaf = null;
      window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
      return;
    }
    analyser.getByteTimeDomainData(runtime.meterData);
    let peak = 0;
    for (let i = 0; i < runtime.meterData.length; i += 1) peak = Math.max(peak, Math.abs((runtime.meterData[i] - 128) / 128));
    window.parent?.postMessage({ type: "denarrator-meter", level: clamp(peak * 1.8, 0, 1) }, "*");
    drawWave();
    runtime.meterRaf = requestAnimationFrame(tick);
  };
  runtime.meterRaf = requestAnimationFrame(tick);
}

async function playRendered() {
  if (!state.render.outBuffer) return;
  stopPlayback();
  const ctx = ensureAudioContext();
  await ctx.resume();
  const source = ctx.createBufferSource();
  source.buffer = bufferToAudioBuffer(state.render.outBuffer);
  source.loop = state.render.loop;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  analyser.connect(ctx.destination);
  runtime.analyser = analyser;
  const durationSec = state.render.outBuffer.frames / Math.max(1, state.render.outBuffer.sr);
  const startOffset = clamp(state.render.offsetSec || 0, 0, Math.max(0, durationSec - 0.0005));
  runtime.source = source;
  runtime.durationSec = durationSec;
  runtime.startOffset = startOffset;
  runtime.startedAt = ctx.currentTime;
  runtime.playToken = globalPlayStart("preview");
  source.onended = () => {
    if (runtime.source === source) {
      state.render.offsetSec = 0;
      stopPlayback();
    }
  };
  source.start(0, startOffset);
  state.render.playing = true;
  refs.playBtn.textContent = "PAUSE";
  refs.playBtn.setAttribute("aria-pressed", "true");
  drawWave();
  startMeter();
}

function registerMidiTargets() {
  const targets = [
    { id: "projektor.action.render", label: "Projektor Render", kind: "trigger" },
    { id: "projektor.action.sendToLazy", label: "Projektor Send to Lazy", kind: "trigger" },
    { id: "projektor.time.warp", label: "Projektor TIME Warp", kind: "continuous" },
    { id: "projektor.time.scram", label: "Projektor TIME Scram", kind: "continuous" },
    { id: "projektor.time.grain", label: "Projektor TIME Grain", kind: "continuous" },
    { id: "projektor.time.xfade", label: "Projektor TIME XFade", kind: "continuous" },
    { id: "projektor.time.revRule", label: "Projektor TIME Rev Rule", kind: "continuous" },
    { id: "projektor.spec.magMorph", label: "Projektor SPEC Mag Morph", kind: "continuous" },
    { id: "projektor.spec.bandSw", label: "Projektor SPEC Band Swap", kind: "continuous" },
    { id: "projektor.spec.tilt", label: "Projektor SPEC Tilt", kind: "continuous" },
    { id: "projektor.spec.blur", label: "Projektor SPEC Blur", kind: "continuous" },
    { id: "projektor.spec.phaseRot", label: "Projektor SPEC Phase Rot", kind: "continuous" },
    { id: "projektor.proj.k", label: "Projektor PROJ K", kind: "continuous" },
    { id: "projektor.proj.mix", label: "Projektor PROJ Mix", kind: "continuous" },
    { id: "projektor.proj.outMode", label: "Projektor PROJ Out Mode", kind: "continuous" },
    { id: "projektor.proj.basis", label: "Projektor PROJ Basis", kind: "continuous" },
  ];
  try { window.parent?.postMessage({ type: "MIDI_TARGETS_REGISTER", version: 1, moduleId: "projektor", targets }, "*"); } catch {}
}

function armMidiTarget(targetId, label) {
  if (!runtime.midiMapMode) return false;
  try { window.parent?.postMessage({ type: "MIDI_LEARN_ARM_TARGET", version: 1, targetId, label }, "*"); } catch {}
  return true;
}

function applyMidiTarget(targetId, value01) {
  const v = clamp(Number(value01) || 0, 0, 1);
  const trigger = (id, fn) => {
    const prev = Boolean(runtime.midiLastTrigger[id]);
    const next = v >= 0.5;
    runtime.midiLastTrigger[id] = next;
    if (!prev && next) fn();
  };
  if (targetId === "projektor.action.render") return trigger(targetId, () => void handleRender());
  if (targetId === "projektor.action.sendToLazy") return trigger(targetId, () => void handleSend());
  if (targetId === "projektor.time.warp") state.params.TIME.WARP = v;
  if (targetId === "projektor.time.scram") state.params.TIME.SCRAM = v;
  if (targetId === "projektor.time.grain") state.params.TIME.GRAIN_MS = Math.round(Math.exp(Math.log(5) + (Math.log(250) - Math.log(5)) * v));
  if (targetId === "projektor.time.xfade") state.params.TIME.XFADE_MS = Math.round(v * 30);
  if (targetId === "projektor.time.revRule") state.params.TIME.REV_RULE = ["OFF", "2ND_SL", "2ND_ROW"][Math.min(2, Math.floor(v * 3))];
  if (targetId === "projektor.spec.magMorph") state.params.SPECTRAL.MAG_MORPH = v;
  if (targetId === "projektor.spec.bandSw") state.params.SPECTRAL.BANDSW = v;
  if (targetId === "projektor.spec.tilt") state.params.SPECTRAL.TILT = v * 2 - 1;
  if (targetId === "projektor.spec.blur") state.params.SPECTRAL.BLUR = v;
  if (targetId === "projektor.spec.phaseRot") state.params.SPECTRAL.PHASE_ROT_DEG = (v * 2 - 1) * 180;
  if (targetId === "projektor.proj.k") state.params.PROJECT.K = Math.round(1 + v * 63);
  if (targetId === "projektor.proj.mix") state.params.PROJECT.MIX = v;
  if (targetId === "projektor.proj.outMode") state.params.PROJECT.OUT = ["PROJECT", "RESIDUAL", "MIX"][Math.min(2, Math.floor(v * 3))];
  if (targetId === "projektor.proj.basis") state.params.PROJECT.BASIS = ["SINBANK", "WAVEBANK", "PCA_FRAMES"][Math.min(2, Math.floor(v * 3))];
  markDirty();
  updateUi();
}

function updateUi() {
  refs.modeSel.value = state.mode;
  refs.lenSel.value = state.global.targetLenMode;
  refs.durInput.disabled = state.global.targetLenMode !== "MANUAL";
  refs.durInput.value = String(Math.round(state.global.targetLenSec * 100));
  refs.durVal.textContent = `${state.global.targetLenSec.toFixed(1)}S`;
  refs.seedInput.value = String(state.global.seed);
  refs.normBtn.setAttribute("aria-pressed", String(state.global.normalize));
  refs.normBtn.textContent = state.global.normalize ? "On" : "Off";
  refs.airbagBtn.setAttribute("aria-pressed", String(state.global.airbag));
  refs.airbagBtn.textContent = state.global.airbag ? "On" : "Off";
  refs.playBtn.textContent = state.render.playing ? "PAUSE" : "PLAY";
  refs.playBtn.setAttribute("aria-pressed", String(state.render.playing));
  refs.playBtn.disabled = !state.render.tempExists;
  refs.saveBtn.disabled = !state.render.tempExists;
  refs.sendBtn.disabled = !state.render.tempExists;
  refs.loopBtn.checked = Boolean(state.render.loop);
  refs.timeControls.classList.toggle("hidden", state.mode !== "TIME");
  refs.specControls.classList.toggle("hidden", state.mode !== "SPECTRAL");
  refs.projControls.classList.toggle("hidden", state.mode !== "PROJECT");
  refs.timeSrcSel.value = state.params.TIME.SRC;
  refs.timeWarpInput.value = String(Math.round(state.params.TIME.WARP * 100));
  refs.timeWarpVal.textContent = `${Math.round(state.params.TIME.WARP * 100)}%`;
  refs.timeScramInput.value = String(Math.round(state.params.TIME.SCRAM * 100));
  refs.timeScramVal.textContent = `${Math.round(state.params.TIME.SCRAM * 100)}%`;
  refs.timeGrainInput.value = String(Math.round(state.params.TIME.GRAIN_MS));
  refs.timeGrainVal.textContent = `${Math.round(state.params.TIME.GRAIN_MS)}MS`;
  refs.timeXfadeInput.value = String(Math.round(state.params.TIME.XFADE_MS));
  refs.timeXfadeVal.textContent = `${Math.round(state.params.TIME.XFADE_MS)}MS`;
  refs.timeRevSel.value = state.params.TIME.REV_RULE;
  refs.timeSmoothInput.value = String(Math.round(state.params.TIME.SMOOTH * 100));
  refs.timeSmoothVal.textContent = `${Math.round(state.params.TIME.SMOOTH * 100)}%`;
  refs.specFrameInput.value = String(Math.round(state.params.SPECTRAL.FRAME_MS));
  refs.specFrameVal.textContent = `${Math.round(state.params.SPECTRAL.FRAME_MS)}MS`;
  refs.specFftSel.value = String(state.params.SPECTRAL.FFT);
  refs.specHopSel.value = state.params.SPECTRAL.HOP;
  refs.specMagSel.value = state.params.SPECTRAL.MAG_SRC;
  refs.specPhaseSel.value = state.params.SPECTRAL.PHASE_SRC;
  refs.specRotInput.value = String(Math.round(state.params.SPECTRAL.PHASE_ROT_DEG));
  refs.specRotVal.textContent = `${Math.round(state.params.SPECTRAL.PHASE_ROT_DEG)}°`;
  refs.specMorphInput.value = String(Math.round(state.params.SPECTRAL.MAG_MORPH * 100));
  refs.specMorphVal.textContent = `${Math.round(state.params.SPECTRAL.MAG_MORPH * 100)}%`;
  refs.specBandSwInput.value = String(Math.round(state.params.SPECTRAL.BANDSW * 100));
  refs.specBandSwVal.textContent = `${Math.round(state.params.SPECTRAL.BANDSW * 100)}%`;
  refs.specTiltInput.value = String(Math.round(state.params.SPECTRAL.TILT * 100));
  refs.specTiltVal.textContent = `${Math.round(state.params.SPECTRAL.TILT * 100)}%`;
  refs.specTprotInput.value = String(Math.round(state.params.SPECTRAL.TPROT * 100));
  refs.specTprotVal.textContent = `${Math.round(state.params.SPECTRAL.TPROT * 100)}%`;
  refs.specBlurInput.value = String(Math.round(state.params.SPECTRAL.BLUR * 100));
  refs.specBlurVal.textContent = `${Math.round(state.params.SPECTRAL.BLUR * 100)}%`;
  refs.specBandScaleSel.value = state.params.SPECTRAL.BAND_SCALE || "BARK";
  refs.specBandDbgBtn.setAttribute("aria-pressed", String(Boolean(state.params.SPECTRAL.BAND_DEBUG)));
  refs.specBandDbgBtn.textContent = state.params.SPECTRAL.BAND_DEBUG ? "On" : "Off";
  refs.specBandDebugWrap.classList.toggle("hidden", !state.params.SPECTRAL.BAND_DEBUG || state.mode !== "SPECTRAL");
  refs.projInSel.value = state.params.PROJECT.IN;
  refs.projBasisSel.value = state.params.PROJECT.BASIS;
  refs.projKInput.value = String(Math.round(state.params.PROJECT.K));
  refs.projKVal.textContent = `${Math.round(state.params.PROJECT.K)}`;
  refs.projWinInput.value = String(Math.round(state.params.PROJECT.WIN_MS));
  refs.projWinVal.textContent = `${Math.round(state.params.PROJECT.WIN_MS)}MS`;
  refs.projOutSel.value = state.params.PROJECT.OUT;
  refs.projMixInput.value = String(Math.round(state.params.PROJECT.MIX * 100));
  refs.projMixVal.textContent = `${Math.round(state.params.PROJECT.MIX * 100)}%`;
  refs.projOrthoBtn.setAttribute("aria-pressed", String(state.params.PROJECT.ORTHO));
  refs.projOrthoBtn.textContent = state.params.PROJECT.ORTHO ? "On" : "Off";
  refs.projSmoothInput.value = String(Math.round(state.params.PROJECT.SMOOTH * 100));
  refs.projSmoothVal.textContent = `${Math.round(state.params.PROJECT.SMOOTH * 100)}%`;
  if (state.params.SPECTRAL.BAND_DEBUG && state.mode === "SPECTRAL") drawBandOverlay();
}

function renderSlots() {
  refs.slots.innerHTML = "";
  for (let i = 0; i < state.inputs.length; i += 1) {
    const slot = state.inputs[i];
    const card = document.createElement("div");
    card.className = `slot${i === state.activeSlot ? " active" : ""}`;
    const title = document.createElement("div");
    title.className = "row";
    title.style.justifyContent = "space-between";
    const t = document.createElement("strong");
    t.textContent = slot.id;
    const sel = document.createElement("button");
    sel.type = "button";
    sel.textContent = i === state.activeSlot ? "ACTIVE" : "SELECT";
    sel.addEventListener("click", () => { state.activeSlot = i; renderSlots(); });
    title.append(t, sel);
    const meta = document.createElement("div");
    meta.className = "muted";
    meta.textContent = slot.buffer ? `${slot.name} | ${(slot.buffer.frames / slot.buffer.sr).toFixed(2)}s` : "EMPTY";
    const row = document.createElement("div");
    row.className = "row";
    const load = document.createElement("button");
    load.type = "button";
    load.textContent = "LOAD";
    load.addEventListener("click", async () => {
      state.activeSlot = i;
      const picked = await openAudioFileViaDialog();
      if (picked?.arrayBuffer) {
        try {
          const decoded = await ensureAudioContext().decodeAudioData(picked.arrayBuffer.slice(0));
          const stereo = toStereoFloatArrays(decoded);
          state.inputs[state.activeSlot].buffer = stereo;
          state.inputs[state.activeSlot].name = picked.name;
          state.inputs[state.activeSlot].sourceRef = { type: "file", name: picked.name };
          markDirty();
          renderSlots();
          setStatus(`Loaded ${picked.name}`);
        } catch (error) {
          setStatus(`Load failed: ${String(error?.message || error)}`, true);
        }
        return;
      }
      refs.fileInput.click();
    });
    const lib = document.createElement("button");
    lib.type = "button";
    lib.textContent = "CLIPLIB";
    lib.addEventListener("click", () => void pickFromCliplib(i));
    const clear = document.createElement("button");
    clear.type = "button";
    clear.textContent = "CLR";
    clear.addEventListener("click", () => {
      state.inputs[i] = makeEmptySlot(slot.id);
      markDirty();
      renderSlots();
    });
    row.append(load, lib, clear);
    card.append(title, meta, row);
    refs.slots.appendChild(card);
  }
}

async function loadSlotFromFile(slotIndex, file) {
  const ctx = ensureAudioContext();
  const decoded = await ctx.decodeAudioData((await file.arrayBuffer()).slice(0));
  const stereo = toStereoFloatArrays(decoded);
  state.inputs[slotIndex].buffer = stereo;
  state.inputs[slotIndex].name = file.name;
  state.inputs[slotIndex].sourceRef = { type: "file", name: file.name };
  markDirty();
  renderSlots();
}

function requestCliplibList() {
  const requestId = `projektor_list_${runtime.cliplibReqSeq++}`;
  return new Promise((resolve, reject) => {
    runtime.pendingCliplibList.set(requestId, { resolve, reject, startedAt: performance.now() });
    window.parent?.postMessage({ type: "CLIPLIB_LIST_REQ", version: 1, requestId }, "*");
    setTimeout(() => {
      const p = runtime.pendingCliplibList.get(requestId);
      if (!p) return;
      runtime.pendingCliplibList.delete(requestId);
      reject(new Error("Cliplib list timeout"));
    }, 5000);
  });
}

function requestCliplibWav(path) {
  const requestId = `projektor_wav_${runtime.cliplibReqSeq++}`;
  return new Promise((resolve, reject) => {
    runtime.pendingCliplibWav.set(requestId, { resolve, reject, startedAt: performance.now(), path });
    window.parent?.postMessage({ type: "CLIPLIB_WAV_REQ", version: 1, requestId, path }, "*");
    setTimeout(() => {
      const p = runtime.pendingCliplibWav.get(requestId);
      if (!p) return;
      runtime.pendingCliplibWav.delete(requestId);
      reject(new Error("Cliplib wav timeout"));
    }, 8000);
  });
}

async function pickFromCliplib(slotIndex) {
  try {
    const list = await requestCliplibList();
    if (!Array.isArray(list) || !list.length) {
      setStatus("Cliplib empty", true);
      return;
    }
    const labels = list.slice(0, 24).map((c, i) => `${i + 1}. ${c.name || c.id || "clip"} (${(c.durationSec || 0).toFixed(2)}s)`);
    const input = prompt(`Select clip for ${state.inputs[slotIndex].id}\n${labels.join("\n")}\n\nEnter number:`, "1");
    const idx = Number(input) - 1;
    if (!Number.isFinite(idx) || idx < 0 || idx >= Math.min(list.length, 24)) return;
    const clip = list[idx];
    const wav = await requestCliplibWav(clip.path);
    const dec = await ensureAudioContext().decodeAudioData(base64ToArrayBuffer(wav).slice(0));
    state.inputs[slotIndex].buffer = toStereoFloatArrays(dec);
    state.inputs[slotIndex].name = clip.name || clip.id || `clip_${idx + 1}`;
    state.inputs[slotIndex].sourceRef = { type: "cliplib", path: clip.path, clipId: clip.id || null, name: clip.name || null };
    markDirty();
    renderSlots();
  } catch (error) {
    setStatus(`Cliplib load failed: ${String(error?.message || error)}`, true);
  }
}

function applyPresetById(id) {
  const preset = getAllPresets().find((p) => p.id === id);
  if (!preset) return;
  state.mode = preset.mode || state.mode;
  state.global.targetLenMode = preset.global?.targetLenMode || state.global.targetLenMode;
  state.global.normalize = Boolean(preset.global?.normalize ?? state.global.normalize);
  state.global.airbag = Boolean(preset.global?.airbag ?? state.global.airbag);
  if (Number.isFinite(Number(preset.global?.seed))) state.global.seed = Number(preset.global.seed);
  if (preset.mode === "TIME") {
    Object.assign(state.params.TIME, { ...preset.params, SMOOTH: preset.params.SMOOTH ?? state.params.TIME.SMOOTH });
  } else if (preset.mode === "SPECTRAL") {
    Object.assign(state.params.SPECTRAL, { ...preset.params, FFT: Number(preset.params.FFT || state.params.SPECTRAL.FFT) });
    if (!state.params.SPECTRAL.BAND_SCALE) state.params.SPECTRAL.BAND_SCALE = "BARK";
    if (typeof state.params.SPECTRAL.BAND_DEBUG !== "boolean") state.params.SPECTRAL.BAND_DEBUG = false;
  } else if (preset.mode === "PROJECT") {
    Object.assign(state.params.PROJECT, { ...preset.params });
  }
  markDirty();
  updateUi();
  setStatus(`Preset: ${preset.name}`);
}

function buildCurrentPresetSnapshot(name, forcedId = null) {
  const safeName = String(name || "USER PRESET").trim() || "USER PRESET";
  const id = forcedId || `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const mode = state.mode;
  const params = mode === "TIME"
    ? { ...state.params.TIME }
    : mode === "SPECTRAL"
      ? { ...state.params.SPECTRAL }
      : { ...state.params.PROJECT };
  return {
    id,
    name: safeName,
    kind: "user",
    mode,
    global: {
      targetLenMode: state.global.targetLenMode,
      normalize: state.global.normalize,
      airbag: state.global.airbag,
      seed: state.global.seed,
    },
    params,
  };
}

async function saveCurrentAsUserPreset() {
  const suggested = `USER ${state.mode}`;
  const name = prompt("Preset name:", suggested);
  if (!name) return;
  const existing = state.userPresets.find((p) => p.name.toLowerCase() === String(name).trim().toLowerCase()) || null;
  const snapshot = buildCurrentPresetSnapshot(name, existing?.id || null);
  if (existing) {
    const idx = state.userPresets.findIndex((p) => p.id === existing.id);
    if (idx >= 0) state.userPresets[idx] = snapshot;
  } else {
    state.userPresets.push(snapshot);
  }
  const ok = await saveUserPresetsToDisk();
  if (!ok) return;
  refreshPresetOptions(snapshot.id);
  markDirty();
  setStatus(`User preset saved: ${snapshot.name}`);
}

async function deleteSelectedUserPreset() {
  const id = refs.presetSel.value;
  const found = state.userPresets.find((p) => p.id === id);
  if (!found) {
    setStatus("Select a USER preset to delete", true);
    return;
  }
  const yes = confirm(`Delete user preset "${found.name}"?`);
  if (!yes) return;
  state.userPresets = state.userPresets.filter((p) => p.id !== id);
  const ok = await saveUserPresetsToDisk();
  if (!ok) return;
  refreshPresetOptions();
  markDirty();
  setStatus(`User preset deleted: ${found.name}`);
}

async function handleRender() {
  try {
    state.render.busy = true;
    state.render.lastError = null;
    refs.renderInfo.textContent = "RENDERING...";
    updateUi();
    const t0 = performance.now();
    const out = renderOutput();
    drawWave();
    if (state.params.SPECTRAL.BAND_DEBUG && state.mode === "SPECTRAL") drawBandOverlay();
    const ms = Math.round(performance.now() - t0);
    state.render.tempExists = true;
    state.render.busy = false;
    refs.renderInfo.textContent = `TEMP READY | ${out.frames} FRAMES | ${ms}MS`;
    setStatus("RENDER DONE: TEMP READY");
    updateUi();
  } catch (error) {
    state.render.busy = false;
    state.render.tempExists = false;
    state.render.lastError = String(error?.message || error);
    setStatus(`Render failed: ${String(error?.message || error)}`, true);
    updateUi();
  }
}

async function handleSave() {
  if (!state.render.tempExists || !state.render.outBuffer) { setStatus("No render", true); return; }
  const res = await saveBlobWithDialog(audioBufferToWavBlob(state.render.outBuffer), outputFileName());
  setStatus(res === "saved" ? "Saved" : "Save cancelled", res !== "saved");
}

async function handleSend() {
  if (!state.render.tempExists || !state.render.outBuffer) { setStatus("No render", true); return; }
  const blob = audioBufferToWavBlob(state.render.outBuffer);
  const wavBytesBase64 = arrayBufferToBase64(await blob.arrayBuffer());
  const name = `projektor_${state.mode.toLowerCase()}_${Date.now()}`;
  window.parent?.postMessage({
    type: "CLIPLIB_ADD",
    version: 1,
    target: "lazy",
    name,
    wavBytesBase64,
    meta: { sr: state.render.outBuffer.sr, channels: 2, frames: state.render.outBuffer.frames, durationSec: state.render.outBuffer.frames / state.render.outBuffer.sr, source: "projektor" },
    source: "projektor",
  }, "*");
  setStatus(`Sent ${name} to Lazy`);
}

function setupBindings() {
  refs.fileInput.addEventListener("change", async () => {
    const file = refs.fileInput.files?.[0];
    refs.fileInput.value = "";
    if (!file) return;
    try {
      await loadSlotFromFile(state.activeSlot, file);
      setStatus(`Loaded ${file.name}`);
    } catch (error) {
      setStatus(`Load failed: ${String(error?.message || error)}`, true);
    }
  });
  refs.modeSel.addEventListener("change", () => { state.mode = refs.modeSel.value; markDirty(); updateUi(); });
  refs.lenSel.addEventListener("change", () => { state.global.targetLenMode = refs.lenSel.value; markDirty(); updateUi(); });
  refs.durInput.addEventListener("input", () => { state.global.targetLenSec = clamp(Number(refs.durInput.value) / 100, 0.5, 16); markDirty(); updateUi(); });
  refs.seedInput.addEventListener("change", () => { state.global.seed = Math.round(Number(refs.seedInput.value) || 1); markDirty(); updateUi(); });
  refs.reseedBtn.addEventListener("click", () => { state.global.seed = nextSeed(); markDirty(); updateUi(); });
  refs.normBtn.addEventListener("click", () => { state.global.normalize = !state.global.normalize; markDirty(); updateUi(); });
  refs.airbagBtn.addEventListener("click", () => { state.global.airbag = !state.global.airbag; markDirty(); updateUi(); });
  refs.presetApplyBtn.addEventListener("click", () => applyPresetById(refs.presetSel.value));
  refs.presetSel.addEventListener("change", () => applyPresetById(refs.presetSel.value));
  refs.presetSaveAsBtn.addEventListener("click", () => void saveCurrentAsUserPreset());
  refs.presetDeleteBtn.addEventListener("click", () => void deleteSelectedUserPreset());
  refs.renderBtn.addEventListener("click", () => void handleRender());
  refs.playBtn.addEventListener("click", () => {
    if (state.render.playing || runtime.previewSource) {
      stopPlayback();
      updateUi();
      return;
    }
    void playRendered();
  });
  refs.loopBtn.addEventListener("change", () => { state.render.loop = !!refs.loopBtn.checked; if (runtime.source) runtime.source.loop = state.render.loop; updateUi(); });
  refs.saveBtn.addEventListener("click", () => void handleSave());
  refs.sendBtn.addEventListener("click", () => void handleSend());
  const bindNum = (el, setter) => el.addEventListener("input", () => { setter(Number(el.value)); markDirty(); updateUi(); });
  bindNum(refs.timeWarpInput, (v) => { state.params.TIME.WARP = clamp(v / 100, 0, 1); });
  bindNum(refs.timeScramInput, (v) => { state.params.TIME.SCRAM = clamp(v / 100, 0, 1); });
  bindNum(refs.timeGrainInput, (v) => { state.params.TIME.GRAIN_MS = clamp(v, 5, 250); });
  bindNum(refs.timeXfadeInput, (v) => { state.params.TIME.XFADE_MS = clamp(v, 0, 30); });
  bindNum(refs.timeSmoothInput, (v) => { state.params.TIME.SMOOTH = clamp(v / 100, 0, 1); });
  refs.timeSrcSel.addEventListener("change", () => { state.params.TIME.SRC = refs.timeSrcSel.value; markDirty(); updateUi(); });
  refs.timeRevSel.addEventListener("change", () => { state.params.TIME.REV_RULE = refs.timeRevSel.value; markDirty(); updateUi(); });
  bindNum(refs.specFrameInput, (v) => { state.params.SPECTRAL.FRAME_MS = clamp(v, 10, 100); });
  refs.specFftSel.addEventListener("change", () => { state.params.SPECTRAL.FFT = Number(refs.specFftSel.value) || 2048; markDirty(); updateUi(); });
  refs.specHopSel.addEventListener("change", () => { state.params.SPECTRAL.HOP = refs.specHopSel.value; markDirty(); updateUi(); });
  refs.specMagSel.addEventListener("change", () => { state.params.SPECTRAL.MAG_SRC = refs.specMagSel.value; markDirty(); updateUi(); });
  refs.specPhaseSel.addEventListener("change", () => { state.params.SPECTRAL.PHASE_SRC = refs.specPhaseSel.value; markDirty(); updateUi(); });
  bindNum(refs.specRotInput, (v) => { state.params.SPECTRAL.PHASE_ROT_DEG = clamp(v, -180, 180); });
  bindNum(refs.specMorphInput, (v) => { state.params.SPECTRAL.MAG_MORPH = clamp(v / 100, 0, 1); });
  bindNum(refs.specBandSwInput, (v) => { state.params.SPECTRAL.BANDSW = clamp(v / 100, 0, 1); });
  bindNum(refs.specTiltInput, (v) => { state.params.SPECTRAL.TILT = clamp(v / 100, -1, 1); });
  bindNum(refs.specTprotInput, (v) => { state.params.SPECTRAL.TPROT = clamp(v / 100, 0, 1); });
  bindNum(refs.specBlurInput, (v) => { state.params.SPECTRAL.BLUR = clamp(v / 100, 0, 1); });
  refs.specBandScaleSel.addEventListener("change", () => { state.params.SPECTRAL.BAND_SCALE = refs.specBandScaleSel.value; markDirty(); updateUi(); });
  refs.specBandDbgBtn.addEventListener("click", () => { state.params.SPECTRAL.BAND_DEBUG = !state.params.SPECTRAL.BAND_DEBUG; markDirty(); updateUi(); });
  refs.projInSel.addEventListener("change", () => { state.params.PROJECT.IN = refs.projInSel.value; markDirty(); updateUi(); });
  refs.projBasisSel.addEventListener("change", () => { state.params.PROJECT.BASIS = refs.projBasisSel.value; markDirty(); updateUi(); });
  bindNum(refs.projKInput, (v) => { state.params.PROJECT.K = clamp(v, 1, 64); });
  bindNum(refs.projWinInput, (v) => { state.params.PROJECT.WIN_MS = clamp(v, 20, 200); });
  refs.projOutSel.addEventListener("change", () => { state.params.PROJECT.OUT = refs.projOutSel.value; markDirty(); updateUi(); });
  bindNum(refs.projMixInput, (v) => { state.params.PROJECT.MIX = clamp(v / 100, 0, 1); });
  refs.projOrthoBtn.addEventListener("click", () => { state.params.PROJECT.ORTHO = !state.params.PROJECT.ORTHO; markDirty(); updateUi(); });
  bindNum(refs.projSmoothInput, (v) => { state.params.PROJECT.SMOOTH = clamp(v / 100, 0, 1); });

  window.addEventListener("resize", () => { drawWave(); if (state.params.SPECTRAL.BAND_DEBUG && state.mode === "SPECTRAL") drawBandOverlay(); });
  window.addEventListener("message", async (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.version !== 1 || typeof data.type !== "string") return;
    if (data.type === "CLIPLIB_LIST_RES") {
      const pending = runtime.pendingCliplibList.get(String(data.requestId || ""));
      if (!pending) return;
      runtime.pendingCliplibList.delete(String(data.requestId || ""));
      pending.resolve(Array.isArray(data.entries) ? data.entries : []);
      return;
    }
    if (data.type === "CLIPLIB_LIST_ERR") {
      const pending = runtime.pendingCliplibList.get(String(data.requestId || ""));
      if (!pending) return;
      runtime.pendingCliplibList.delete(String(data.requestId || ""));
      pending.reject(new Error(String(data.error || "Cliplib list error")));
      return;
    }
    if (data.type === "CLIPLIB_WAV_RES") {
      const pending = runtime.pendingCliplibWav.get(String(data.requestId || ""));
      if (!pending) return;
      runtime.pendingCliplibWav.delete(String(data.requestId || ""));
      pending.resolve(String(data.wavBytesBase64 || ""));
      return;
    }
    if (data.type === "CLIPLIB_WAV_ERR") {
      const pending = runtime.pendingCliplibWav.get(String(data.requestId || ""));
      if (!pending) return;
      runtime.pendingCliplibWav.delete(String(data.requestId || ""));
      pending.reject(new Error(String(data.error || "Cliplib wav error")));
      return;
    }
    if (data.type === "PANIC_KILL") {
      stopPlayback();
      if (runtime.audioContext) {
        try { await runtime.audioContext.close(); } catch {}
        runtime.audioContext = null;
      }
      setStatus("Panic kill");
      return;
    }
    if (data.type === "AUDIO_RESET_DONE") { setStatus("Audio reset ready"); return; }
    if (data.type === "MIDI_MAP_MODE") { runtime.midiMapMode = Boolean(data.enabled); return; }
    if (data.type === "MIDI_TARGET_SET") {
      const payload = data.payload || {};
      const targetId = String(payload.targetId || "");
      const value01 = Number(payload.value01);
      if (!targetId || !Number.isFinite(value01)) return;
      applyMidiTarget(targetId, value01);
      return;
    }
    if (data.type === "SESSION_EXPORT_REQ") {
      const includeOnlyDirty = data?.payload?.includeOnlyDirty !== false;
      const chunk = {
        schemaVersion: 1,
        transport: { playheadSec: Number(state.render.offsetSec) || 0, loopA: 0, loopB: runtime.durationSec || 0 },
        ui: { mode: state.mode, activeSlot: state.activeSlot },
        refs: {
          inputs: state.inputs.map((s) => ({ id: s.id, name: s.name, sourceRef: s.sourceRef || null })),
        },
        dirty: Boolean(runtime.sessionDirty),
      };
      if (!includeOnlyDirty || runtime.sessionDirty) {
        chunk.heavy = {
          global: { ...state.global },
          params: JSON.parse(JSON.stringify(state.params)),
          inputsWav: await Promise.all(state.inputs.map(async (s) => ({
            id: s.id,
            name: s.name,
            sourceRef: s.sourceRef || null,
            wavBase64: s.buffer ? arrayBufferToBase64(await audioBufferToWavBlob(s.buffer).arrayBuffer()) : null,
          }))),
          outputWavBase64: state.render.outBuffer ? arrayBufferToBase64(await audioBufferToWavBlob(state.render.outBuffer).arrayBuffer()) : null,
        };
      }
      window.parent?.postMessage({ type: "SESSION_EXPORT_RES", version: 1, payload: { moduleId: "projektor", schemaVersion: 1, dirty: Boolean(runtime.sessionDirty), chunk } }, "*");
      return;
    }
    if (data.type === "SESSION_IMPORT") {
      try {
        const chunk = data?.payload?.chunk || {};
        state.render.offsetSec = clamp(Number(chunk?.transport?.playheadSec) || 0, 0, 1e9);
        state.mode = chunk?.ui?.mode || state.mode;
        state.activeSlot = clamp(Number(chunk?.ui?.activeSlot) || 0, 0, 3);
        if (chunk.heavy) {
          if (chunk.heavy.global) Object.assign(state.global, chunk.heavy.global);
          if (chunk.heavy.params) state.params = { ...state.params, ...chunk.heavy.params };
          if (!state.params.SPECTRAL.BAND_SCALE) state.params.SPECTRAL.BAND_SCALE = "BARK";
          if (typeof state.params.SPECTRAL.BAND_DEBUG !== "boolean") state.params.SPECTRAL.BAND_DEBUG = false;
          if (Array.isArray(chunk.heavy.inputsWav)) {
            for (const src of chunk.heavy.inputsWav) {
              const idx = ["A", "B", "C", "D"].indexOf(String(src?.id || ""));
              if (idx < 0) continue;
              if (src?.wavBase64) {
                const decoded = await ensureAudioContext().decodeAudioData(base64ToArrayBuffer(src.wavBase64).slice(0));
                state.inputs[idx].buffer = toStereoFloatArrays(decoded);
              } else {
                state.inputs[idx].buffer = null;
              }
              state.inputs[idx].name = src?.name || `${state.inputs[idx].id}: empty`;
              state.inputs[idx].sourceRef = src?.sourceRef || null;
            }
          }
          if (chunk.heavy.outputWavBase64) {
            const dec = await ensureAudioContext().decodeAudioData(base64ToArrayBuffer(chunk.heavy.outputWavBase64).slice(0));
            state.render.outBuffer = toStereoFloatArrays(dec);
          } else {
            state.render.outBuffer = null;
          }
        }
        stopPlayback();
        runtime.sessionDirty = false;
        renderSlots();
        updateUi();
        drawWave();
        setStatus("Session loaded");
      } catch (error) {
        setStatus(`Session import failed: ${String(error?.message || error)}`, true);
      }
      return;
    }
    if (data.type === "SESSION_SAVED") { runtime.sessionDirty = false; setStatus("Session saved"); return; }
    if (data.type === "DENARRATOR_GLOBAL_PLAY") { if (!state.render.playing && state.render.outBuffer) void playRendered(); return; }
    if (data.type === "DENARRATOR_GLOBAL_STOP") { if (state.render.playing || runtime.previewSource) stopPlayback(); return; }
    if (data.type === "GLOBAL_PLAY_CLEAR") { if (runtime.playToken) { globalPlayStop(runtime.playToken); runtime.playToken = null; } return; }
    if (data.type === "UI_SQUISH_SET") { document.documentElement.classList.toggle("dn-squish", Boolean(data?.payload?.enabled)); return; }
    if (data.type === "PATHS_BROADCAST") { runtime.paths = data?.payload || null; return; }
    if (data.type === "CLIPLIB_ADD_OK") { setStatus(`Sent: ${String(data.name || "clip")}`); return; }
    if (data.type === "CLIPLIB_ADD_ERR") { setStatus(`Send failed: ${String(data.error || "error")}`, true); return; }
    if ((data.type === "DENARRATOR_IMPORT_CLIP" || data.type === "BROWSER_LOAD_ITEM") && data.version === 1) {
      void (async () => {
        try {
          const wavB64 = String(data?.wavBytesBase64 || "");
          if (!wavB64) return;
          const decoded = await ensureAudioContext().decodeAudioData(base64ToArrayBuffer(wavB64).slice(0));
          const stereo = toStereoFloatArrays(decoded);
          let targetId = String(data?.targetSlot || data?.payload?.targetId || "").toUpperCase();
          if (!["A", "B", "C", "D"].includes(targetId)) targetId = "A";
          const slotIndex = ["A", "B", "C", "D"].indexOf(targetId);
          if (slotIndex < 0) return;
          state.inputs[slotIndex].buffer = stereo;
          state.inputs[slotIndex].name = String(data?.name || data?.payload?.name || `${targetId}.wav`);
          state.inputs[slotIndex].sourceRef = {
            type: "browser",
            clipId: String(data?.payload?.clipId || ""),
            path: String(data?.payload?.path || ""),
          };
          state.activeSlot = slotIndex;
          runtime.sessionDirty = true;
          renderSlots();
          updateUi();
          drawWave();
          setStatus(`Loaded ${state.inputs[slotIndex].name} -> ${targetId}`);
        } catch (error) {
          setStatus(`Browser load failed: ${String(error?.message || error)}`, true);
        }
      })();
      return;
    }
    if (data.type === "BROWSER_APPLY_PRESET" && data.version === 1) {
      setStatus("Preset apply from Browser is available via local preset selector.");
      return;
    }
  });

  window.addEventListener("keydown", (event) => {
    if ((event.code === "Space" || event.key === " ") && !event.repeat) {
      const tag = String(event.target?.tagName || "").toUpperCase();
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT" && !event.target?.isContentEditable) {
        event.preventDefault();
        window.parent?.postMessage({ type: "DENARRATOR_GLOBAL_TOGGLE", version: 1 }, "*");
      }
    }
  });
}

function installMidiLearnArming() {
  const armMap = [
    [refs.renderBtn, "projektor.action.render", "Projektor Render"],
    [refs.sendBtn, "projektor.action.sendToLazy", "Projektor Send to Lazy"],
    [refs.timeWarpInput, "projektor.time.warp", "Projektor TIME Warp"],
    [refs.timeScramInput, "projektor.time.scram", "Projektor TIME Scram"],
    [refs.timeGrainInput, "projektor.time.grain", "Projektor TIME Grain"],
    [refs.timeXfadeInput, "projektor.time.xfade", "Projektor TIME XFade"],
    [refs.specMorphInput, "projektor.spec.magMorph", "Projektor SPEC Mag Morph"],
    [refs.specBandSwInput, "projektor.spec.bandSw", "Projektor SPEC Band Swap"],
    [refs.specTiltInput, "projektor.spec.tilt", "Projektor SPEC Tilt"],
    [refs.specBlurInput, "projektor.spec.blur", "Projektor SPEC Blur"],
    [refs.specRotInput, "projektor.spec.phaseRot", "Projektor SPEC Phase Rot"],
    [refs.projKInput, "projektor.proj.k", "Projektor PROJ K"],
    [refs.projMixInput, "projektor.proj.mix", "Projektor PROJ Mix"],
  ];
  for (const [el, id, label] of armMap) {
    if (!el) continue;
    el.addEventListener("pointerdown", () => armMidiTarget(id, label), { capture: true });
  }
}

async function init() {
  window.parent?.postMessage({ type: "PATHS_REQ", version: 1 }, "*");
  installTactileButtons(document);
  await loadUserPresetsFromDisk();
  refreshPresetOptions();
  renderSlots();
  updateUi();
  drawWave();
  setupBindings();
  installMidiLearnArming();
  registerMidiTargets();
}

void init();
