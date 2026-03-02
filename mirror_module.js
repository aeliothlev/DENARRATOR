import { runWaveAlgebra } from "./src/engines/waveAlgebraEngine.js";

const refs = {
  loadABtn: document.getElementById("loadABtn"),
  loadAInput: document.getElementById("loadAInput"),
  loadBBtn: document.getElementById("loadBBtn"),
  loadBInput: document.getElementById("loadBInput"),
  swapABBtn: document.getElementById("swapABBtn"),
  metaA: document.getElementById("metaA"),
  metaB: document.getElementById("metaB"),
  modeMirror1Btn: document.getElementById("modeMirror1Btn"),
  modeMirror2Btn: document.getElementById("modeMirror2Btn"),
  playBtn: document.getElementById("playBtn"),
  loopBtn: document.getElementById("loopBtn"),
  renderBtn: document.getElementById("renderBtn"),
  undoBtn: document.getElementById("undoBtn"),
  t0Input: document.getElementById("t0Input"),
  t0Readout: document.getElementById("t0Readout"),
  zeroSnapBtn: document.getElementById("zeroSnapBtn"),
  status: document.getElementById("status"),
  waveCanvas: document.getElementById("waveCanvas"),
  mirror1Controls: document.getElementById("mirror1Controls"),
  mirror2Controls: document.getElementById("mirror2Controls"),
  mirror1Mode: document.getElementById("mirror1Mode"),
  mirror1Side: document.getElementById("mirror1Side"),
  mirror1Crossfade: document.getElementById("mirror1Crossfade"),
  mirror1Blend: document.getElementById("mirror1Blend"),
  mirror2Width: document.getElementById("mirror2Width"),
  mirror2Smooth: document.getElementById("mirror2Smooth"),
  mirror2Intensity: document.getElementById("mirror2Intensity"),
  mirror2AlignMode: document.getElementById("mirror2AlignMode"),
  mirror2Threshold: document.getElementById("mirror2Threshold"),
  mirror2ThresholdMode: document.getElementById("mirror2ThresholdMode"),
  mirror2NormalizeBtn: document.getElementById("mirror2NormalizeBtn"),
  mirror2SignedBtn: document.getElementById("mirror2SignedBtn"),
  mirror2ReverseBBtn: document.getElementById("mirror2ReverseBBtn"),
};

const state = {
  mode: "mirror1",
  zeroSnap: false,
  t0Norm: 0.5,
  clipA: null,
  clipB: null,
  rendered: null,
  mirror1: {
    mode: "replace",
    side: "left-right",
    crossfade: 0.14,
    blend: 1,
  },
  mirror2: {
    projectionWidth: 0.35,
    envelopeSmoothness: 64,
    intensity: 1,
    alignMode: "resample",
    threshold: 0,
    thresholdMode: "soft",
    normalizeA: true,
    signedMorphology: false,
    reverseMorphology: false,
  },
  preview: {
    loop: false,
  },
};

const runtime = {
  ctx: null,
  source: null,
  analyser: null,
  meterData: null,
  meterRaf: null,
  playing: false,
  playStartedAtCtxSec: 0,
  playDurationSec: 0,
  undoStack: [],
  previewPlayToken: null,
  paths: null,
  sessionDirty: false,
  renderSaveSeqByKey: {},
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function setStatus(text, isError = false) {
  refs.status.textContent = text;
  refs.status.classList.toggle("error", isError);
}

function globalPlayStart(sourceLabel) {
  const token = `mirror_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    window.parent?.postMessage(
      {
        type: "GLOBAL_PLAY_START",
        version: 1,
        payload: { token, moduleId: "mirror", source: sourceLabel },
      },
      "*"
    );
  } catch {}
  return token;
}

function globalPlayStop(token) {
  if (!token) return;
  try {
    window.parent?.postMessage(
      {
        type: "GLOBAL_PLAY_STOP",
        version: 1,
        payload: { token },
      },
      "*"
    );
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

function audioContext() {
  if (!runtime.ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    runtime.ctx = new Ctor();
  }
  return runtime.ctx;
}

function stopMirrorPlayback() {
  if (runtime.source) {
    try { runtime.source.stop(); } catch {}
    try { runtime.source.disconnect(); } catch {}
    runtime.source = null;
  }
  runtime.playing = false;
  runtime.playStartedAtCtxSec = 0;
  runtime.playDurationSec = 0;
  if (runtime.previewPlayToken) {
    globalPlayStop(runtime.previewPlayToken);
    runtime.previewPlayToken = null;
  }
  if (runtime.meterRaf) {
    cancelAnimationFrame(runtime.meterRaf);
    runtime.meterRaf = null;
  }
  window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
  refs.playBtn.textContent = "Play";
  refs.playBtn.setAttribute("aria-pressed", "false");
}

function startMirrorMeter() {
  const analyser = runtime.analyser;
  if (!analyser) return;
  if (!runtime.meterData || runtime.meterData.length !== analyser.fftSize) {
    runtime.meterData = new Uint8Array(analyser.fftSize);
  }
  const step = () => {
    if (!runtime.playing || !runtime.source || !runtime.analyser) {
      runtime.meterRaf = null;
      window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
      return;
    }
    analyser.getByteTimeDomainData(runtime.meterData);
    let peak = 0;
    for (let i = 0; i < runtime.meterData.length; i += 1) {
      const v = Math.abs((runtime.meterData[i] - 128) / 128);
      if (v > peak) peak = v;
    }
    window.parent?.postMessage({ type: "denarrator-meter", level: clamp(peak * 1.8, 0, 1) }, "*");
    drawWaveform();
    runtime.meterRaf = requestAnimationFrame(step);
  };
  if (runtime.meterRaf) cancelAnimationFrame(runtime.meterRaf);
  runtime.meterRaf = requestAnimationFrame(step);
}

async function handlePanicKill() {
  stopMirrorPlayback();
  if (runtime.ctx) {
    try {
      await runtime.ctx.close();
    } catch {
      // Ignore close errors.
    }
    runtime.ctx = null;
  }
  setStatus("PANIC KILL");
}

function cloneClip(clip) {
  if (!clip) return null;
  return {
    name: clip.name,
    sampleRate: clip.sampleRate,
    data: new Float32Array(clip.data),
  };
}

function pushUndo() {
  runtime.undoStack.push({
    mode: state.mode,
    zeroSnap: state.zeroSnap,
    t0Norm: state.t0Norm,
    clipA: cloneClip(state.clipA),
    clipB: cloneClip(state.clipB),
    rendered: state.rendered ? new Float32Array(state.rendered) : null,
    mirror1: { ...state.mirror1 },
    mirror2: { ...state.mirror2 },
    preview: { ...state.preview },
  });
  if (runtime.undoStack.length > 10) runtime.undoStack.splice(0, runtime.undoStack.length - 10);
  runtime.sessionDirty = true;
}

function restoreUndo() {
  const snap = runtime.undoStack.pop();
  if (!snap) {
    setStatus("Nothing to undo.", true);
    return;
  }
  state.mode = snap.mode;
  state.zeroSnap = snap.zeroSnap;
  state.t0Norm = snap.t0Norm;
  state.clipA = cloneClip(snap.clipA);
  state.clipB = cloneClip(snap.clipB);
  state.rendered = snap.rendered ? new Float32Array(snap.rendered) : null;
  state.mirror1 = { ...snap.mirror1 };
  state.mirror2 = { ...snap.mirror2 };
  state.preview = { ...state.preview, ...(snap.preview || {}) };
  syncUi();
  drawWaveform();
  setStatus("Undo.");
}

async function decodeAudioFile(file) {
  const arr = await file.arrayBuffer();
  return decodeAudioArrayBuffer(arr, file.name);
}

async function decodeAudioArrayBuffer(arrayBuffer, fileName = "audio.wav") {
  const ctx = audioContext();
  const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
  const mono = new Float32Array(decoded.length);
  for (let c = 0; c < decoded.numberOfChannels; c += 1) {
    const ch = decoded.getChannelData(c);
    for (let i = 0; i < mono.length; i += 1) mono[i] += ch[i];
  }
  for (let i = 0; i < mono.length; i += 1) mono[i] /= decoded.numberOfChannels;
  return { name: fileName, sampleRate: decoded.sampleRate, data: mono };
}

function getInvoke() {
  const ownInvoke = window.__TAURI__?.core?.invoke;
  if (typeof ownInvoke === "function") return ownInvoke;
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
      dialogKey: "mirror.loadAudio",
    });
    if (!path) return null;
    const base64 = await invoke("read_file_base64", { path: String(path) });
    const name = String(path).split(/[\\/]/).pop() || "audio.wav";
    const bin = atob(String(base64 || ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return { name, arrayBuffer: bytes.buffer };
  } catch {
    return null;
  }
}

function buildMirrorOperator() {
  if (state.mode === "mirror2") {
    return {
      type: "mirror",
      enabled: true,
      mode: "mirror2",
      t0Norm: state.t0Norm,
      zeroSnap: state.zeroSnap,
      mirror2: {
        projectionWidth: state.mirror2.projectionWidth,
        envelopeSmoothness: state.mirror2.envelopeSmoothness,
        intensity: state.mirror2.intensity,
        alignMode: state.mirror2.alignMode,
        threshold: state.mirror2.threshold,
        thresholdMode: state.mirror2.thresholdMode,
        normalizeA: state.mirror2.normalizeA,
        signedMorphology: state.mirror2.signedMorphology,
        reverseMorphology: state.mirror2.reverseMorphology,
      },
    };
  }
  return {
    type: "mirror",
    enabled: true,
    mode: "mirror1",
    t0Norm: state.t0Norm,
    zeroSnap: state.zeroSnap,
    mirror1: {
      mode: state.mirror1.mode,
      side: state.mirror1.side,
      crossfade: state.mirror1.crossfade,
      blend: state.mirror1.blend,
    },
  };
}

function renderCurrent() {
  if (!state.clipA) return null;
  const op = buildMirrorOperator();
  try {
    return runWaveAlgebra({
      waveA: state.clipA.data,
      waveB: state.clipB ? state.clipB.data : null,
      operators: [op],
    });
  } catch {
    return null;
  }
}

function drawWaveform() {
  const canvas = refs.waveCanvas;
  const ctx = canvas.getContext("2d");
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.clearRect(0, 0, w, h);
  if (!state.clipA) return;

  const input = state.clipA.data;
  const output = state.rendered || renderCurrent();
  const t0X = clamp(Math.round(state.t0Norm * (w - 1)), 0, w - 1);

  ctx.strokeStyle = "rgba(47,49,50,0.5)";
  ctx.lineWidth = Math.max(1, Math.floor(dpr));
  ctx.beginPath();
  for (let x = 0; x < w; x += 1) {
    const i = Math.floor((x / Math.max(1, w - 1)) * (input.length - 1));
    const y = (0.35 - input[i] * 0.24) * h;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  if (output && output.length) {
    ctx.strokeStyle = "rgba(47,49,50,0.95)";
    ctx.beginPath();
    for (let x = 0; x < w; x += 1) {
      const i = Math.floor((x / Math.max(1, w - 1)) * (output.length - 1));
      const y = (0.72 - output[i] * 0.24) * h;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(138,58,45,0.9)";
  ctx.lineWidth = Math.max(1, Math.round(2 * dpr));
  ctx.beginPath();
  ctx.moveTo(t0X, 0);
  ctx.lineTo(t0X, h);
  ctx.stroke();

  const durationSec = runtime.playDurationSec > 0 ? runtime.playDurationSec : (output.length / Math.max(1, state.clipA.sampleRate));
  let playheadSec = 0;
  if (runtime.playing && runtime.source && runtime.ctx && durationSec > 0) {
    let at = Math.max(0, runtime.ctx.currentTime - runtime.playStartedAtCtxSec);
    if (state.preview.loop) at %= durationSec;
    else at = Math.min(durationSec, at);
    playheadSec = at;
  }
  const playX = clamp(Math.round((playheadSec / Math.max(durationSec, 1e-6)) * (w - 1)), 0, Math.max(0, w - 1));
  ctx.strokeStyle = "rgba(31,111,100,0.88)";
  ctx.lineWidth = Math.max(1, Math.round(dpr * 1.5));
  ctx.beginPath();
  ctx.moveTo(playX + 0.5, 0);
  ctx.lineTo(playX + 0.5, h);
  ctx.stroke();
}

function encodeWavMono(samples, sampleRate) {
  const length = samples.length;
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const write = (off, str) => { for (let i = 0; i < str.length; i += 1) view.setUint8(off + i, str.charCodeAt(i)); };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < length; i += 1) {
    const s = clamp(samples[i], -1, 1);
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return new Blob([buf], { type: "audio/wav" });
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

async function clipToWavBase64(clip) {
  if (!clip) return null;
  return arrayBufferToBase64(await encodeWavMono(clip.data, clip.sampleRate).arrayBuffer());
}

async function wavBase64ToClip(wavBase64, name = "session.wav") {
  if (!wavBase64) return null;
  const decoded = await audioContext().decodeAudioData(base64ToArrayBuffer(wavBase64).slice(0));
  const mono = new Float32Array(decoded.length);
  for (let c = 0; c < decoded.numberOfChannels; c += 1) {
    const ch = decoded.getChannelData(c);
    for (let i = 0; i < mono.length; i += 1) mono[i] += ch[i];
  }
  for (let i = 0; i < mono.length; i += 1) mono[i] /= decoded.numberOfChannels;
  return { name, sampleRate: decoded.sampleRate, data: mono };
}

async function saveBlobWithDialog(blob, suggestedName) {
  const invoke = (() => {
    const ownInvoke = window.__TAURI__?.core?.invoke;
    if (typeof ownInvoke === "function") return ownInvoke;
    try {
      const parentInvoke = window.parent?.__TAURI__?.core?.invoke;
      if (typeof parentInvoke === "function") return parentInvoke;
    } catch {}
    return null;
  })();
  if (typeof invoke === "function") {
    try {
      const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
      const saved = await invoke("save_blob_with_dialog", { dataBase64, suggestedName });
      return saved ? "saved" : "cancelled";
    } catch {
      // Fallback below.
    }
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
  const invoke = (() => {
    const ownInvoke = window.__TAURI__?.core?.invoke;
    if (typeof ownInvoke === "function") return ownInvoke;
    try {
      const parentInvoke = window.parent?.__TAURI__?.core?.invoke;
      if (typeof parentInvoke === "function") return parentInvoke;
    } catch {}
    return null;
  })();
  if (!invoke) return null;
  try {
    const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
    return await invoke("save_blob_with_dialog_path", { dataBase64, suggestedName });
  } catch {
    return null;
  }
}

async function saveBlobToPath(blob, path) {
  const invoke = (() => {
    const ownInvoke = window.__TAURI__?.core?.invoke;
    if (typeof ownInvoke === "function") return ownInvoke;
    try {
      const parentInvoke = window.parent?.__TAURI__?.core?.invoke;
      if (typeof parentInvoke === "function") return parentInvoke;
    } catch {}
    return null;
  })();
  if (!invoke) return false;
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

async function playBuffer(samples, sampleRate) {
  if (!samples || !samples.length) return;
  const ctx = audioContext();
  await ctx.resume();
  if (runtime.source) {
    try { runtime.source.stop(); } catch {}
    try { runtime.source.disconnect(); } catch {}
    runtime.source = null;
  }
  const buf = ctx.createBuffer(1, samples.length, sampleRate);
  buf.copyToChannel(samples, 0);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = Boolean(state.preview.loop);
  src.onended = () => {
    if (!state.preview.loop) {
      runtime.playing = false;
      runtime.playStartedAtCtxSec = 0;
      runtime.playDurationSec = 0;
      if (runtime.previewPlayToken) {
        globalPlayStop(runtime.previewPlayToken);
        runtime.previewPlayToken = null;
      }
      if (runtime.meterRaf) {
        cancelAnimationFrame(runtime.meterRaf);
        runtime.meterRaf = null;
      }
      window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
      refs.playBtn.textContent = "Play";
    }
  };
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  src.connect(analyser);
  analyser.connect(ctx.destination);
  runtime.analyser = analyser;
  src.start();
  runtime.source = src;
  runtime.playing = true;
  runtime.playStartedAtCtxSec = ctx.currentTime;
  runtime.playDurationSec = samples.length / Math.max(1, sampleRate);
  if (!runtime.previewPlayToken) {
    runtime.previewPlayToken = globalPlayStart("preview");
  }
  startMirrorMeter();
  refs.playBtn.textContent = "Stop";
}

function canRender() {
  return Boolean(state.clipA);
}

function syncUi() {
  refs.modeMirror1Btn.setAttribute("aria-pressed", String(state.mode === "mirror1"));
  refs.modeMirror2Btn.setAttribute("aria-pressed", String(state.mode === "mirror2"));
  refs.zeroSnapBtn.setAttribute("aria-pressed", String(state.zeroSnap));
  refs.zeroSnapBtn.textContent = state.zeroSnap ? "On" : "Off";
  refs.mirror1Controls.style.display = state.mode === "mirror1" ? "grid" : "none";
  refs.mirror2Controls.style.display = state.mode === "mirror2" ? "grid" : "none";
  refs.renderBtn.disabled = !canRender();
  refs.playBtn.disabled = !state.clipA;
  refs.playBtn.setAttribute("aria-pressed", String(runtime.playing));
  refs.loopBtn.checked = Boolean(state.preview.loop);

  refs.t0Input.value = String(Math.round(state.t0Norm * 10000));
  if (refs.t0Readout) {
    const n = state.clipA?.data?.length || 1;
    const sr = state.clipA?.sampleRate || 44100;
    const sample = clamp(Math.round(state.t0Norm * Math.max(0, n - 1)), 0, Math.max(0, n - 1));
    const seconds = sample / sr;
    refs.t0Readout.textContent = `t0: ${state.t0Norm.toFixed(3)} | sample ${sample} | ${seconds.toFixed(4)}s`;
  }
  refs.mirror1Mode.value = state.mirror1.mode;
  refs.mirror1Side.value = state.mirror1.side;
  refs.mirror1Crossfade.value = String(Math.round(state.mirror1.crossfade * 100));
  refs.mirror1Blend.value = String(Math.round(state.mirror1.blend * 100));
  refs.mirror2Width.value = String(Math.round(state.mirror2.projectionWidth * 100));
  refs.mirror2Smooth.value = String(Math.round((state.mirror2.envelopeSmoothness / 4096) * 100));
  refs.mirror2Intensity.value = String(Math.round(state.mirror2.intensity * 100));
  refs.mirror2AlignMode.value = state.mirror2.alignMode;
  refs.mirror2Threshold.value = String(Math.round(state.mirror2.threshold * 100));
  refs.mirror2ThresholdMode.value = state.mirror2.thresholdMode;
  refs.mirror2NormalizeBtn.setAttribute("aria-pressed", String(state.mirror2.normalizeA));
  refs.mirror2NormalizeBtn.textContent = state.mirror2.normalizeA ? "On" : "Off";
  refs.mirror2SignedBtn.setAttribute("aria-pressed", String(state.mirror2.signedMorphology));
  refs.mirror2SignedBtn.textContent = state.mirror2.signedMorphology ? "On" : "Off";
  refs.mirror2ReverseBBtn.setAttribute("aria-pressed", String(state.mirror2.reverseMorphology));
  refs.mirror2ReverseBBtn.textContent = state.mirror2.reverseMorphology ? "On" : "Off";
}

function bind() {
  refs.loadABtn.addEventListener("click", async () => {
    const picked = await openAudioFileViaDialog();
    if (picked?.arrayBuffer) {
      try {
        pushUndo();
        state.clipA = await decodeAudioArrayBuffer(picked.arrayBuffer, picked.name);
        state.rendered = null;
        refs.metaA.textContent = `A: ${state.clipA.name}`;
        setStatus(`Loaded A: ${state.clipA.name}`);
        syncUi();
        drawWaveform();
      } catch (error) {
        setStatus(`Load A failed: ${String(error?.message || error)}`, true);
      }
      return;
    }
    refs.loadAInput.click();
  });
  refs.loadBBtn.addEventListener("click", async () => {
    const picked = await openAudioFileViaDialog();
    if (picked?.arrayBuffer) {
      try {
        pushUndo();
        state.clipB = await decodeAudioArrayBuffer(picked.arrayBuffer, picked.name);
        state.rendered = null;
        refs.metaB.textContent = `B: ${state.clipB.name}`;
        setStatus(`Loaded B: ${state.clipB.name}`);
        syncUi();
        drawWaveform();
      } catch (error) {
        setStatus(`Load B failed: ${String(error?.message || error)}`, true);
      }
      return;
    }
    refs.loadBInput.click();
  });

  refs.loadAInput.addEventListener("change", async () => {
    const file = refs.loadAInput.files?.[0];
    refs.loadAInput.value = "";
    if (!file) return;
    try {
      pushUndo();
      state.clipA = await decodeAudioFile(file);
      state.rendered = null;
      refs.metaA.textContent = `A: ${state.clipA.name}`;
      setStatus(`Loaded A: ${state.clipA.name}`);
      syncUi();
      drawWaveform();
    } catch (error) {
      setStatus(`Load A failed: ${String(error?.message || error)}`, true);
    }
  });

  refs.loadBInput.addEventListener("change", async () => {
    const file = refs.loadBInput.files?.[0];
    refs.loadBInput.value = "";
    if (!file) return;
    try {
      pushUndo();
      state.clipB = await decodeAudioFile(file);
      state.rendered = null;
      refs.metaB.textContent = `B: ${state.clipB.name}`;
      setStatus(`Loaded B: ${state.clipB.name}`);
      syncUi();
      drawWaveform();
    } catch (error) {
      setStatus(`Load B failed: ${String(error?.message || error)}`, true);
    }
  });

  refs.swapABBtn?.addEventListener("click", () => {
    if (!state.clipA && !state.clipB) {
      setStatus("Nothing to swap.", true);
      return;
    }
    pushUndo();
    const nextA = state.clipB ? cloneClip(state.clipB) : null;
    const nextB = state.clipA ? cloneClip(state.clipA) : null;
    state.clipA = nextA;
    state.clipB = nextB;
    state.rendered = null;
    refs.metaA.textContent = state.clipA ? `A: ${state.clipA.name}` : "A: no file";
    refs.metaB.textContent = state.clipB ? `B: ${state.clipB.name}` : "B: optional (required for mirror 2)";
    syncUi();
    drawWaveform();
    setStatus("Swapped A/B.");
  });

  refs.modeMirror1Btn.addEventListener("click", () => {
    if (state.mode === "mirror1") return;
    pushUndo();
    state.mode = "mirror1";
    state.rendered = null;
    syncUi();
    drawWaveform();
  });
  refs.modeMirror2Btn.addEventListener("click", () => {
    if (state.mode === "mirror2") return;
    pushUndo();
    state.mode = "mirror2";
    state.rendered = null;
    syncUi();
    drawWaveform();
  });

  refs.t0Input.addEventListener("input", () => {
    state.t0Norm = clamp(Number(refs.t0Input.value) / 10000, 0, 1);
    state.rendered = null;
    drawWaveform();
  });
  refs.zeroSnapBtn.addEventListener("click", () => {
    pushUndo();
    state.zeroSnap = !state.zeroSnap;
    state.rendered = null;
    syncUi();
    drawWaveform();
  });

  refs.mirror1Mode.addEventListener("change", () => { state.mirror1.mode = refs.mirror1Mode.value; state.rendered = null; drawWaveform(); });
  refs.mirror1Side.addEventListener("change", () => { state.mirror1.side = refs.mirror1Side.value; state.rendered = null; drawWaveform(); });
  refs.mirror1Crossfade.addEventListener("input", () => { state.mirror1.crossfade = Number(refs.mirror1Crossfade.value) / 100; state.rendered = null; drawWaveform(); });
  refs.mirror1Blend.addEventListener("input", () => { state.mirror1.blend = Number(refs.mirror1Blend.value) / 100; state.rendered = null; drawWaveform(); });
  refs.mirror2Width.addEventListener("input", () => { state.mirror2.projectionWidth = Number(refs.mirror2Width.value) / 100; state.rendered = null; drawWaveform(); });
  refs.mirror2Smooth.addEventListener("input", () => {
    const t = Number(refs.mirror2Smooth.value) / 100;
    state.mirror2.envelopeSmoothness = Math.round(1 + t * 4095);
    state.rendered = null;
    drawWaveform();
  });
  refs.mirror2Intensity.addEventListener("input", () => { state.mirror2.intensity = Number(refs.mirror2Intensity.value) / 100; state.rendered = null; drawWaveform(); });
  refs.mirror2AlignMode.addEventListener("change", () => { state.mirror2.alignMode = refs.mirror2AlignMode.value; state.rendered = null; drawWaveform(); });
  refs.mirror2Threshold.addEventListener("input", () => { state.mirror2.threshold = Number(refs.mirror2Threshold.value) / 100; state.rendered = null; drawWaveform(); });
  refs.mirror2ThresholdMode.addEventListener("change", () => { state.mirror2.thresholdMode = refs.mirror2ThresholdMode.value; state.rendered = null; drawWaveform(); });

  refs.mirror2NormalizeBtn.addEventListener("click", () => {
    pushUndo();
    state.mirror2.normalizeA = !state.mirror2.normalizeA;
    state.rendered = null;
    syncUi();
    drawWaveform();
  });
  refs.mirror2SignedBtn.addEventListener("click", () => {
    pushUndo();
    state.mirror2.signedMorphology = !state.mirror2.signedMorphology;
    state.rendered = null;
    syncUi();
    drawWaveform();
  });
  refs.mirror2ReverseBBtn.addEventListener("click", () => {
    pushUndo();
    state.mirror2.reverseMorphology = !state.mirror2.reverseMorphology;
    state.rendered = null;
    syncUi();
    drawWaveform();
  });

  refs.renderBtn.addEventListener("click", async () => {
    if (!state.clipA) {
      setStatus("Load wave A first.", true);
      return;
    }
    pushUndo();
    const rendered = renderCurrent();
    state.rendered = rendered && rendered.length ? rendered : new Float32Array(state.clipA.data);
    syncUi();
    drawWaveform();
    if (!state.rendered || !state.clipA) {
      setStatus("Render failed.", true);
      return;
    }
    const blob = encodeWavMono(state.rendered, state.clipA.sampleRate);
    const filename = `mirror_${state.mode}_${Date.now()}.wav`;
    const result = await saveBlobSequenced(blob, filename, "render");
    const usedFallback = !(rendered && rendered.length);
    if (result === "saved") {
      setStatus(usedFallback ? "Rendered fallback A + exported." : "Rendered + exported.");
    } else {
      setStatus(usedFallback ? "Rendered fallback A (export cancelled)." : "Rendered (export cancelled).");
    }
  });

  refs.playBtn.addEventListener("click", async () => {
    if (runtime.playing && runtime.source) {
      try { runtime.source.stop(); } catch {}
      try { runtime.source.disconnect(); } catch {}
      runtime.source = null;
      runtime.playing = false;
      refs.playBtn.textContent = "Play";
      refs.playBtn.setAttribute("aria-pressed", "false");
      setStatus("Stopped.");
      return;
    }
    const toPlay = state.rendered || renderCurrent() || state.clipA?.data || null;
    if (!toPlay || !state.clipA) return;
    await playBuffer(toPlay, state.clipA.sampleRate);
    refs.playBtn.setAttribute("aria-pressed", "true");
    setStatus(state.preview.loop ? "Playing (loop)." : "Playing.");
  });
  refs.loopBtn.addEventListener("change", () => {
    state.preview.loop = !!refs.loopBtn.checked;
    if (runtime.source) runtime.source.loop = state.preview.loop;
    syncUi();
  });

  refs.undoBtn.addEventListener("click", restoreUndo);

  let draggingLine = false;
  let dragUndoPushed = false;
  refs.waveCanvas.addEventListener("pointerdown", (event) => {
    draggingLine = true;
    dragUndoPushed = false;
    refs.waveCanvas.setPointerCapture(event.pointerId);
    const rect = refs.waveCanvas.getBoundingClientRect();
    state.t0Norm = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    state.rendered = null;
    syncUi();
    drawWaveform();
  });
  refs.waveCanvas.addEventListener("pointermove", (event) => {
    if (!draggingLine) return;
    if (!dragUndoPushed) {
      pushUndo();
      dragUndoPushed = true;
    }
    const rect = refs.waveCanvas.getBoundingClientRect();
    state.t0Norm = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    state.rendered = null;
    syncUi();
    drawWaveform();
  });
  const endDrag = () => {
    draggingLine = false;
    dragUndoPushed = false;
  };
  refs.waveCanvas.addEventListener("pointerup", endDrag);
  refs.waveCanvas.addEventListener("pointercancel", endDrag);

  window.addEventListener("message", async (event) => {
    const data = event?.data;
    if (!data || data.version !== 1 || event.source !== window.parent) return;
    if (data.type === "PANIC_KILL") {
      await handlePanicKill();
      return;
    }
    if (data.type === "DENARRATOR_GLOBAL_PLAY") {
      if (!runtime.playing) {
        const toPlay = state.rendered || renderCurrent() || state.clipA?.data || null;
        if (toPlay && state.clipA) {
          await playBuffer(toPlay, state.clipA.sampleRate);
          syncUi();
        }
      }
      return;
    }
    if (data.type === "DENARRATOR_GLOBAL_STOP") {
      if (runtime.playing || runtime.source) {
        stopMirrorPlayback();
        syncUi();
      }
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
    if (data.type === "AUDIO_RESET_DONE") {
      setStatus("AUDIO RESET READY");
      return;
    }
    if (data.type === "SESSION_EXPORT_REQ") {
      const includeOnlyDirty = data?.payload?.includeOnlyDirty !== false;
      const chunk = {
        schemaVersion: 1,
        transport: {
          playheadSec: state.t0Norm * ((state.clipA?.data?.length || 1) / (state.clipA?.sampleRate || 44100)),
          loopA: 0,
          loopB: state.clipA ? (state.clipA.data.length / state.clipA.sampleRate) : 0,
        },
        ui: { mode: state.mode, t0Norm: state.t0Norm },
        refs: {},
        dirty: Boolean(runtime.sessionDirty),
      };
      if (!includeOnlyDirty || runtime.sessionDirty) {
        chunk.heavy = {
          mode: state.mode,
          zeroSnap: state.zeroSnap,
          t0Norm: state.t0Norm,
          mirror1: { ...state.mirror1 },
          mirror2: { ...state.mirror2 },
          preview: { ...state.preview },
          clipAName: state.clipA?.name || "",
          clipBName: state.clipB?.name || "",
          clipAWavBase64: await clipToWavBase64(state.clipA),
          clipBWavBase64: await clipToWavBase64(state.clipB),
          renderedWavBase64: state.rendered && state.clipA ? arrayBufferToBase64(await encodeWavMono(state.rendered, state.clipA.sampleRate).arrayBuffer()) : null,
        };
      }
      window.parent?.postMessage(
        {
          type: "SESSION_EXPORT_RES",
          version: 1,
          payload: { moduleId: "mirror", schemaVersion: 1, dirty: Boolean(runtime.sessionDirty), chunk },
        },
        "*"
      );
      return;
    }
    if (data.type === "SESSION_IMPORT") {
      try {
        const chunk = data?.payload?.chunk || {};
        const heavy = chunk?.heavy;
        if (heavy) {
          state.mode = heavy.mode || state.mode;
          state.zeroSnap = Boolean(heavy.zeroSnap);
          state.t0Norm = clamp(Number(heavy.t0Norm) || 0.5, 0, 1);
          state.mirror1 = { ...state.mirror1, ...(heavy.mirror1 || {}) };
          state.mirror2 = { ...state.mirror2, ...(heavy.mirror2 || {}) };
          state.preview = { ...state.preview, ...(heavy.preview || {}) };
          state.clipA = await wavBase64ToClip(heavy.clipAWavBase64, heavy.clipAName || "A.wav");
          state.clipB = await wavBase64ToClip(heavy.clipBWavBase64, heavy.clipBName || "B.wav");
          if (heavy.renderedWavBase64 && state.clipA) {
            const renderedClip = await wavBase64ToClip(heavy.renderedWavBase64, "rendered.wav");
            state.rendered = renderedClip ? renderedClip.data : null;
          } else {
            state.rendered = null;
          }
        } else {
          if (chunk?.ui?.mode) state.mode = String(chunk.ui.mode);
          if (Number.isFinite(Number(chunk?.ui?.t0Norm))) state.t0Norm = clamp(Number(chunk.ui.t0Norm), 0, 1);
        }
        stopMirrorPlayback();
        syncUi();
        drawWaveform();
        runtime.sessionDirty = false;
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
    if (data.type === "DENARRATOR_UNDO") {
      restoreUndo();
      return;
    }
    if (data.type !== "DENARRATOR_IMPORT_CLIP") return;
    const slot = data.targetSlot === "B" ? "B" : "A";
    const b64 = typeof data.wavBytesBase64 === "string" ? data.wavBytesBase64 : "";
    if (!b64) return;
    try {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
      const decoded = await audioContext().decodeAudioData(bytes.slice(0));
      const mono = new Float32Array(decoded.length);
      for (let c = 0; c < decoded.numberOfChannels; c += 1) {
        const ch = decoded.getChannelData(c);
        for (let i = 0; i < mono.length; i += 1) mono[i] += ch[i];
      }
      for (let i = 0; i < mono.length; i += 1) mono[i] /= decoded.numberOfChannels;
      pushUndo();
      const clip = { name: data.name || `import_${slot}.wav`, sampleRate: decoded.sampleRate, data: mono };
      if (slot === "A") {
        state.clipA = clip;
        refs.metaA.textContent = `A: ${clip.name}`;
      } else {
        state.clipB = clip;
        refs.metaB.textContent = `B: ${clip.name}`;
      }
      state.rendered = null;
      syncUi();
      drawWaveform();
      setStatus(`Imported into ${slot}.`);
    } catch (error) {
      setStatus(`Import failed (${slot}): ${String(error?.message || error)}`, true);
    }
  });

  window.addEventListener("keydown", (event) => {
    if ((event.code === "Space" || event.key === " ") && !event.repeat) {
      const target = event.target;
      const tag = String(target?.tagName || "").toUpperCase();
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT" && !target?.isContentEditable) {
        event.preventDefault();
        window.parent?.postMessage({ type: "DENARRATOR_GLOBAL_TOGGLE", version: 1 }, "*");
        return;
      }
    }
    const isUndo = (event.metaKey || event.ctrlKey) && String(event.key || "").toLowerCase() === "z";
    if (!isUndo) return;
    const tag = String(event.target?.tagName || "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || event.target?.isContentEditable) return;
    event.preventDefault();
    restoreUndo();
  });

  window.addEventListener("resize", drawWaveform);
}

syncUi();
installTactileButtons(document);
bind();
window.parent?.postMessage({ type: "PATHS_REQ", version: 1 }, "*");
refs.t0Input.max = "10000";
drawWaveform();
