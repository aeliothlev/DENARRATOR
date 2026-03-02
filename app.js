const state = {
  input: null,
  reference: null,
  output: null,
  outputBlob: null,
  blobUrl: null,
  vizData: null,
  outputWavePeaks: null,
  manualRetriggerPoints: [],
  manualGaterPoints: [],
};

let sessionDirty = false;
const renderSaveSeqByKey = {};

const refs = {
  inputFile: document.getElementById("inputFile"),
  inputBrowseBtn: document.getElementById("inputBrowseBtn"),
  inputFileLabel: document.getElementById("inputFileLabel"),
  refFile: document.getElementById("refFile"),
  refBrowseBtn: document.getElementById("refBrowseBtn"),
  refFileLabel: document.getElementById("refFileLabel"),
  swapInputRefBtn: document.getElementById("swapInputRefBtn"),
  inputMeta: document.getElementById("inputMeta"),
  refMeta: document.getElementById("refMeta"),
  inputWavePreview: document.getElementById("inputWavePreview"),
  refWavePreview: document.getElementById("refWavePreview"),

  windowType: document.getElementById("windowType"),
  fftSize: document.getElementById("fftSize"),
  overlap: document.getElementById("overlap"),
  zeroPad: document.getElementById("zeroPad"),

  refMode: document.getElementById("refMode"),
  alpha: document.getElementById("alpha"),
  alphaOut: document.getElementById("alphaOut"),
  refScale: document.getElementById("refScale"),
  refScaleOut: document.getElementById("refScaleOut"),
  complementAbs: document.getElementById("complementAbs"),
  enableComplement: document.getElementById("enableComplement"),

  expectMode: document.getElementById("expectMode"),
  deviationMode: document.getElementById("deviationMode"),
  expectWindow: document.getElementById("expectWindow"),
  expectWindowOut: document.getElementById("expectWindowOut"),
  beta: document.getElementById("beta"),
  betaOut: document.getElementById("betaOut"),
  threshold: document.getElementById("threshold"),
  thresholdOut: document.getElementById("thresholdOut"),
  softMask: document.getElementById("softMask"),
  softMaskOut: document.getElementById("softMaskOut"),
  enableDeviation: document.getElementById("enableDeviation"),

  phaseMode: document.getElementById("phaseMode"),
  randomizeDeviation: document.getElementById("randomizeDeviation"),

  antiClip: document.getElementById("antiClip"),
  limiter: document.getElementById("limiter"),
  rmsNorm: document.getElementById("rmsNorm"),
  enableLowLift: document.getElementById("enableLowLift"),
  lowLiftDb: document.getElementById("lowLiftDb"),
  lowLiftDbOut: document.getElementById("lowLiftDbOut"),
  lowLiftMax: document.getElementById("lowLiftMax"),
  lowLiftMaxOut: document.getElementById("lowLiftMaxOut"),
  enableTritone: document.getElementById("enableTritone"),
  tritoneMix: document.getElementById("tritoneMix"),
  tritoneMixOut: document.getElementById("tritoneMixOut"),
  tritoneUpGain: document.getElementById("tritoneUpGain"),
  tritoneUpOut: document.getElementById("tritoneUpOut"),
  tritoneDownGain: document.getElementById("tritoneDownGain"),
  tritoneDownOut: document.getElementById("tritoneDownOut"),
  tritoneStereoSpread: document.getElementById("tritoneStereoSpread"),
  tritoneSpread: document.getElementById("tritoneSpread"),
  tritoneSpreadOut: document.getElementById("tritoneSpreadOut"),
  tritoneRandomPhase: document.getElementById("tritoneRandomPhase"),
  tritonePhaseJitter: document.getElementById("tritonePhaseJitter"),
  tritonePhaseJitterOut: document.getElementById("tritonePhaseJitterOut"),
  enableRetrigger: document.getElementById("enableRetrigger"),
  retriggerMode: document.getElementById("retriggerMode"),
  retriggerAmount: document.getElementById("retriggerAmount"),
  retriggerAmountOut: document.getElementById("retriggerAmountOut"),
  enableGater: document.getElementById("enableGater"),
  gaterMode: document.getElementById("gaterMode"),
  gaterAmount: document.getElementById("gaterAmount"),
  gaterAmountOut: document.getElementById("gaterAmountOut"),
  preserveLength: document.getElementById("preserveLength"),
  showIntermediate: document.getElementById("showIntermediate"),
  enableReshuffler: document.getElementById("enableReshuffler"),
  reshuffleSplits: document.getElementById("reshuffleSplits"),
  reshuffleSplitsOut: document.getElementById("reshuffleSplitsOut"),
  reshuffleSeed: document.getElementById("reshuffleSeed"),
  randomSeedBtn: document.getElementById("randomSeedBtn"),
  useFixedSeed: document.getElementById("useFixedSeed"),

  processBtn: document.getElementById("processBtn"),
  status: document.getElementById("status"),

  specCanvas: document.getElementById("specCanvas"),
  outputWaveCanvas: document.getElementById("outputWaveCanvas"),
  waveClickTool: document.getElementById("waveClickTool"),
  retriggerPointCount: document.getElementById("retriggerPointCount"),
  gaterPointCount: document.getElementById("gaterPointCount"),
  clearRetriggerPointsBtn: document.getElementById("clearRetriggerPointsBtn"),
  clearGaterPointsBtn: document.getElementById("clearGaterPointsBtn"),
  outputPlayBtn: document.getElementById("outputPlayBtn"),
  outputRenderBtn: document.getElementById("outputRenderBtn"),
  audioOut: document.getElementById("audioOut"),
  loopOutput: document.getElementById("loopOutput"),
  enableLiveSaturator: document.getElementById("enableLiveSaturator"),
  saturatorDrive: document.getElementById("saturatorDrive"),
  saturatorDriveOut: document.getElementById("saturatorDriveOut"),
  saturatorMix: document.getElementById("saturatorMix"),
  saturatorMixOut: document.getElementById("saturatorMixOut"),
  addSaturatorBtn: document.getElementById("addSaturatorBtn"),
  outputName: document.getElementById("outputName"),
  configName: document.getElementById("configName"),
  saveConfigBtn: document.getElementById("saveConfigBtn"),
  loadConfigBtn: document.getElementById("loadConfigBtn"),
  loadConfigFile: document.getElementById("loadConfigFile"),
  downloadBtn: document.getElementById("downloadBtn"),
};

let audioCtx = null;
let outputFx = null;
let outputWaveRaf = null;
let outputMeterAnalyser = null;
let outputMeterData = null;
let outputMeterRaf = null;
let masterOutputVolume = 1;
let masterLimiterEnabled = false;
let selectedOutputDeviceId = "";
let outputPlayToken = null;
let modulePaths = null;
const undoStack = [];
const UNDO_LIMIT = 10;

function getAudioContext() {
  if (!audioCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) throw new Error("AudioContext wird nicht unterstützt.");
    audioCtx = new Ctor();
  }
  return audioCtx;
}

class FFT {
  constructor(size) {
    if ((size & (size - 1)) !== 0) throw new Error("FFT size must be power of 2");
    this.size = size;
    this.levels = Math.log2(size);
    this.cos = new Float64Array(size / 2);
    this.sin = new Float64Array(size / 2);
    this.rev = new Uint32Array(size);

    for (let i = 0; i < size / 2; i += 1) {
      const a = (2 * Math.PI * i) / size;
      this.cos[i] = Math.cos(a);
      this.sin[i] = Math.sin(a);
    }

    for (let i = 0; i < size; i += 1) {
      let x = i;
      let y = 0;
      for (let j = 0; j < this.levels; j += 1) {
        y = (y << 1) | (x & 1);
        x >>= 1;
      }
      this.rev[i] = y;
    }
  }

  transform(re, im, inverse = false) {
    const n = this.size;

    for (let i = 0; i < n; i += 1) {
      const j = this.rev[i];
      if (j > i) {
        const tr = re[i];
        re[i] = re[j];
        re[j] = tr;
        const ti = im[i];
        im[i] = im[j];
        im[j] = ti;
      }
    }

    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const step = n / size;
      for (let i = 0; i < n; i += size) {
        let table = 0;
        for (let j = i; j < i + half; j += 1) {
          const l = j + half;
          const cosv = this.cos[table];
          const sinv = inverse ? -this.sin[table] : this.sin[table];

          const tre = re[l] * cosv + im[l] * sinv;
          const tim = -re[l] * sinv + im[l] * cosv;

          re[l] = re[j] - tre;
          im[l] = im[j] - tim;
          re[j] += tre;
          im[j] += tim;

          table += step;
        }
      }
    }

    if (inverse) {
      for (let i = 0; i < n; i += 1) {
        re[i] /= n;
        im[i] /= n;
      }
    }
  }
}

function hann(size) {
  const w = new Float64Array(size);
  for (let i = 0; i < size; i += 1) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return w;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function globalPlayStart(sourceLabel) {
  const token = `neg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    window.parent?.postMessage(
      {
        type: "GLOBAL_PLAY_START",
        version: 1,
        payload: { token, moduleId: "negativraum", source: sourceLabel },
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

function peakAbs(channels) {
  let p = 0;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i += 1) {
      const a = Math.abs(ch[i]);
      if (a > p) p = a;
    }
  }
  return p;
}

function rms(samples) {
  let acc = 0;
  for (let i = 0; i < samples.length; i += 1) acc += samples[i] * samples[i];
  return Math.sqrt(acc / Math.max(1, samples.length));
}

function softLimit(data, drive = 1.8) {
  const denom = Math.tanh(drive);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.tanh(drive * data[i]) / denom;
  }
}

function normalizePeak(channels, target = 0.99) {
  const p = peakAbs(channels);
  if (p > target && p > 0) {
    const g = target / p;
    for (const ch of channels) {
      for (let i = 0; i < ch.length; i += 1) ch[i] *= g;
    }
  }
}

function copyArray(data) {
  return new Float32Array(data);
}

function cloneAudioClip(clip) {
  if (!clip) return null;
  return {
    name: clip.name,
    sampleRate: clip.sampleRate,
    channels: clip.channels.map((ch) => new Float32Array(ch)),
    length: clip.length,
    numberOfChannels: clip.numberOfChannels,
  };
}

function pushUndoSnapshot() {
  undoStack.push({
    input: cloneAudioClip(state.input),
    reference: cloneAudioClip(state.reference),
    output: state.output
      ? {
          sampleRate: state.output.sampleRate,
          channels: state.output.channels.map((ch) => new Float32Array(ch)),
        }
      : null,
    manualRetriggerPoints: state.manualRetriggerPoints.slice(),
    manualGaterPoints: state.manualGaterPoints.slice(),
    config: getConfig(),
    inputMeta: refs.inputMeta.textContent || "Keine Datei geladen",
    refMeta: refs.refMeta.textContent || "Keine Referenz geladen",
    inputLabel: refs.inputFileLabel?.textContent || "Keine Datei geladen",
    refLabel: refs.refFileLabel?.textContent || "Keine Referenz geladen",
  });
  if (undoStack.length > UNDO_LIMIT) {
    undoStack.splice(0, undoStack.length - UNDO_LIMIT);
  }
  sessionDirty = true;
}

function applyClipUiFromState() {
  if (state.input) {
    refs.inputMeta.textContent = `${state.input.name} | ${state.input.sampleRate} Hz | ${state.input.numberOfChannels}ch | ${state.input.length} Samples`;
    if (refs.inputFileLabel) refs.inputFileLabel.textContent = state.input.name;
    drawWavePreview(refs.inputWavePreview, state.input.channels);
  } else {
    refs.inputMeta.textContent = "Keine Datei geladen";
    if (refs.inputFileLabel) refs.inputFileLabel.textContent = "Keine Datei geladen";
    clearWavePreview(refs.inputWavePreview);
  }
  if (state.reference) {
    refs.refMeta.textContent = `${state.reference.name} | ${state.reference.sampleRate} Hz | ${state.reference.numberOfChannels}ch`;
    if (refs.refFileLabel) refs.refFileLabel.textContent = state.reference.name;
    drawWavePreview(refs.refWavePreview, state.reference.channels);
  } else {
    refs.refMeta.textContent = "Keine Referenz geladen";
    if (refs.refFileLabel) refs.refFileLabel.textContent = "Keine Referenz geladen";
    clearWavePreview(refs.refWavePreview);
  }
}

function undoLastAction() {
  const snap = undoStack.pop();
  if (!snap) {
    setStatus("Nothing to undo.", true);
    return;
  }
  state.input = cloneAudioClip(snap.input);
  state.reference = cloneAudioClip(snap.reference);
  state.output = snap.output
    ? {
        sampleRate: snap.output.sampleRate,
        channels: snap.output.channels.map((ch) => new Float32Array(ch)),
      }
    : null;
  state.manualRetriggerPoints = Array.isArray(snap.manualRetriggerPoints) ? snap.manualRetriggerPoints.slice() : [];
  state.manualGaterPoints = Array.isArray(snap.manualGaterPoints) ? snap.manualGaterPoints.slice() : [];
  if (snap.config) {
    applyConfig(snap.config);
  } else {
    updateLabels();
    updateManualPointCounts();
    drawVisualizer();
    drawOutputWaveform();
  }
  applyClipUiFromState();
  if (state.output && state.output.channels) {
    refreshOutputBlob(state.output.channels, state.output.sampleRate);
  } else {
    if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
    state.blobUrl = null;
    state.outputBlob = null;
    refs.audioOut.removeAttribute("src");
    refs.audioOut.load();
    refs.downloadBtn.disabled = true;
    refs.outputPlayBtn.disabled = true;
  }
  setStatus("Undo.");
}

function averageToMono(channels) {
  const len = channels[0].length;
  const out = new Float32Array(len);
  for (const ch of channels) {
    for (let i = 0; i < len; i += 1) out[i] += ch[i];
  }
  const inv = 1 / channels.length;
  for (let i = 0; i < len; i += 1) out[i] *= inv;
  return out;
}

function resampleLinear(input, srcRate, dstRate) {
  if (srcRate === dstRate) return copyArray(input);
  const ratio = srcRate / dstRate;
  const outLen = Math.max(1, Math.round(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i += 1) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const t = pos - i0;
    out[i] = input[i0] * (1 - t) + input[i1] * t;
  }
  return out;
}

function setStatus(msg, isErr = false) {
  refs.status.textContent = msg;
  refs.status.style.color = isErr ? "#8b3f2f" : "#666";
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getTauriInvoke() {
  const ownInvoke = window.__TAURI__?.core?.invoke;
  if (typeof ownInvoke === "function") return ownInvoke;
  try {
    const parentInvoke = window.parent?.__TAURI__?.core?.invoke;
    if (typeof parentInvoke === "function") return parentInvoke;
  } catch {
    // ignore cross-frame errors
  }
  return null;
}

async function openFileViaNativeDialog(defaultDir, filters) {
  const tauriInvoke = getTauriInvoke();
  if (!tauriInvoke) return null;
  try {
    const path = await tauriInvoke("dialog_open_file", {
      defaultDir: defaultDir || null,
      filters: Array.isArray(filters) ? filters : null,
      dialogKey: "lazy.loadWave",
    });
    if (!path) return null;
    const base64 = await tauriInvoke("read_file_base64", { path: String(path) });
    const name = String(path).split(/[\\/]/).pop() || "file";
    return { path: String(path), name, base64: String(base64 || "") };
  } catch {
    return null;
  }
}

async function saveBlobWithPicker(blob, filename, options = null) {
  const tauriInvoke = getTauriInvoke();
  const kind = String(options?.kind || "");
  const defaultDir =
    kind === "preset"
      ? (modulePaths?.presets || null)
      : kind === "sesh"
        ? (modulePaths?.sesh || null)
        : (modulePaths?.mater || null);
  const filters =
    kind === "preset"
      ? [{ name: "Preset", extensions: ["negat", "json", "logo"] }]
      : [{ name: "WAV", extensions: ["wav"] }];
  if (tauriInvoke) {
    try {
      const path = await tauriInvoke("dialog_save_file", {
        defaultDir,
        suggestedName: filename,
        filters,
        dialogKey: kind === "preset" ? "lazy.savePreset" : kind === "sesh" ? "lazy.saveSesh" : "lazy.saveWav",
      });
      if (!path) return null;
      const arrayBuffer = await blob.arrayBuffer();
      const dataBase64 = arrayBufferToBase64(arrayBuffer);
      const saved = await tauriInvoke("save_blob_to_path", {
        dataBase64,
        path,
      });
      return saved ? true : null;
    } catch (error) {
      console.warn("native save dialog invoke failed, falling back", error);
    }
  }
  if (typeof window.showSaveFilePicker !== "function") {
    return false;
  }
  const extMatch = String(filename).match(/(\.[^.]+)$/);
  const extension = extMatch ? extMatch[1] : "";
  const mimeType = blob.type || "application/octet-stream";
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: "Export",
          accept: {
            [mimeType]: extension ? [extension] : [],
          },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (error) {
    if (error?.name === "AbortError") {
      return null;
    }
    throw error;
  }
}

async function saveBlobWithFallback(blob, filename, options = null) {
  const pickerResult = await saveBlobWithPicker(blob, filename, options);
  if (pickerResult === true) {
    return "saved";
  }
  if (pickerResult === null) {
    return "cancelled";
  }
  triggerBlobDownload(blob, filename);
  return "downloaded";
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
  const tauriInvoke = getTauriInvoke();
  if (!tauriInvoke) return null;
  try {
    const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
    return await tauriInvoke("save_blob_with_dialog_path", { dataBase64, suggestedName });
  } catch {
    return null;
  }
}

async function saveBlobToPath(blob, path) {
  const tauriInvoke = getTauriInvoke();
  if (!tauriInvoke) return false;
  try {
    const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
    return Boolean(await tauriInvoke("save_blob_to_path", { dataBase64, path }));
  } catch {
    return false;
  }
}

async function saveBlobSequencedWithFallback(blob, suggestedName, sequenceKey) {
  const seq = renderSaveSeqByKey[sequenceKey];
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
      renderSaveSeqByKey[sequenceKey] = {
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
  const fallback = await saveBlobWithFallback(blob, suggestedName);
  if (fallback === "saved" || fallback === "downloaded") {
    const parts = splitFileNameParts(suggestedName);
    renderSaveSeqByKey[sequenceKey] = {
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

function updateManualPointCounts() {
  refs.retriggerPointCount.textContent = String(state.manualRetriggerPoints.length);
  refs.gaterPointCount.textContent = String(state.manualGaterPoints.length);
}

function sortUniquePoints(points, minDist = 0.0015) {
  const sorted = points.slice().sort((a, b) => a - b);
  const out = [];
  for (const p of sorted) {
    const v = clamp(p, 0, 1);
    if (out.length === 0 || Math.abs(v - out[out.length - 1]) >= minDist) {
      out.push(v);
    }
  }
  return out;
}

function clearWavePreview(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(235, 233, 227, 0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawWavePreview(canvas, channels) {
  if (!canvas || !channels || channels.length === 0) return;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(236, 234, 228, 0.62)";
  ctx.fillRect(0, 0, w, h);

  const mono = averageToMono(channels);
  const mid = h * 0.5;
  const half = h * 0.4;
  const spp = mono.length / w;

  ctx.strokeStyle = "rgba(158, 158, 158, 0.55)";
  ctx.lineWidth = Math.max(1, dpr);
  ctx.beginPath();
  for (let x = 0; x < w; x += 1) {
    const start = Math.floor(x * spp);
    const end = Math.min(mono.length, Math.floor((x + 1) * spp) + 1);
    let peak = 0;
    for (let i = start; i < end; i += 1) {
      const v = Math.abs(mono[i]);
      if (v > peak) peak = v;
    }
    const yTop = mid - peak * half;
    const yBottom = mid + peak * half;
    ctx.moveTo(x + 0.5, yTop);
    ctx.lineTo(x + 0.5, yBottom);
  }
  ctx.stroke();
}

function redrawFilePreviews() {
  if (state.input) drawWavePreview(refs.inputWavePreview, state.input.channels);
  else clearWavePreview(refs.inputWavePreview);

  if (state.reference) drawWavePreview(refs.refWavePreview, state.reference.channels);
  else clearWavePreview(refs.refWavePreview);
}

function buildWavePeaks(channels, pixelWidth) {
  if (!channels || channels.length === 0 || pixelWidth <= 0) return null;
  const mono = averageToMono(channels);
  const peaks = new Float32Array(pixelWidth);
  const spp = mono.length / pixelWidth;
  for (let x = 0; x < pixelWidth; x += 1) {
    const start = Math.floor(x * spp);
    const end = Math.min(mono.length, Math.floor((x + 1) * spp) + 1);
    let peak = 0;
    for (let i = start; i < end; i += 1) {
      const v = Math.abs(mono[i]);
      if (v > peak) peak = v;
    }
    peaks[x] = peak;
  }
  return peaks;
}

function drawOutputWaveform() {
  const canvas = refs.outputWaveCanvas;
  const ctx = canvas.getContext("2d");
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(237, 235, 230, 0.7)";
  ctx.fillRect(0, 0, w, h);

  if (!state.outputWavePeaks || state.outputWavePeaks.length !== w) {
    state.outputWavePeaks = state.output?.channels ? buildWavePeaks(state.output.channels, w) : null;
  }

  if (state.outputWavePeaks) {
    const mid = h * 0.5;
    const half = h * 0.42;
    ctx.strokeStyle = "rgba(168, 166, 160, 0.52)";
    ctx.lineWidth = Math.max(1, dpr);
    ctx.beginPath();
    for (let x = 0; x < w; x += 1) {
      const p = state.outputWavePeaks[x];
      const yTop = mid - p * half;
      const yBottom = mid + p * half;
      ctx.moveTo(x + 0.5, yTop);
      ctx.lineTo(x + 0.5, yBottom);
    }
    ctx.stroke();
  }

  const dur = refs.audioOut.duration;
  if (Number.isFinite(dur) && dur > 0) {
    const pos = clamp(refs.audioOut.currentTime / dur, 0, 1);
    const x = pos * w;
    ctx.strokeStyle = "rgba(118, 116, 110, 0.9)";
    ctx.lineWidth = Math.max(1, dpr);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  if (state.manualRetriggerPoints.length > 0) {
    ctx.strokeStyle = "rgba(132, 118, 102, 0.78)";
    ctx.lineWidth = Math.max(1, dpr);
    for (const p of state.manualRetriggerPoints) {
      const x = clamp(p, 0, 1) * w;
      ctx.beginPath();
      ctx.moveTo(x, 2);
      ctx.lineTo(x, h * 0.44);
      ctx.stroke();
    }
  }

  if (state.manualGaterPoints.length > 0) {
    ctx.strokeStyle = "rgba(92, 92, 92, 0.78)";
    ctx.lineWidth = Math.max(1, dpr);
    for (const p of state.manualGaterPoints) {
      const x = clamp(p, 0, 1) * w;
      ctx.beginPath();
      ctx.moveTo(x, h * 0.56);
      ctx.lineTo(x, h - 2);
      ctx.stroke();
    }
  }
}

function syncPlayButton() {
  refs.outputPlayBtn.classList.toggle("is-playing", !refs.audioOut.paused);
}

async function handlePanicKill() {
  try {
    refs.audioOut.pause();
  } catch {
    // Ignore pause errors.
  }
  refs.audioOut.currentTime = 0;
  if (outputPlayToken) {
    globalPlayStop(outputPlayToken);
    outputPlayToken = null;
  }
  stopOutputMeterLoop();
  syncPlayButton();
  if (audioCtx) {
    try {
      await audioCtx.close();
    } catch {
      // Ignore close errors.
    }
  }
  audioCtx = null;
  outputFx = null;
  setStatus("PANIC KILL");
}

function stopOutputWaveLoop() {
  if (outputWaveRaf != null) {
    cancelAnimationFrame(outputWaveRaf);
    outputWaveRaf = null;
  }
}

function startOutputWaveLoop() {
  stopOutputWaveLoop();
  const tick = () => {
    drawOutputWaveform();
    if (!refs.audioOut.paused) {
      outputWaveRaf = requestAnimationFrame(tick);
    } else {
      outputWaveRaf = null;
    }
  };
  outputWaveRaf = requestAnimationFrame(tick);
}

function seekOutputFromClientX(clientX) {
  const rect = refs.outputWaveCanvas.getBoundingClientRect();
  const dur = refs.audioOut.duration;
  if (!Number.isFinite(dur) || dur <= 0 || rect.width <= 0) return;
  const t = clamp((clientX - rect.left) / rect.width, 0, 1);
  refs.audioOut.currentTime = t * dur;
  drawOutputWaveform();
}

function nearestPointIndex(points, xNorm) {
  if (!points || points.length === 0) return -1;
  let best = -1;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length; i += 1) {
    const d = Math.abs(points[i] - xNorm);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function updateLabels() {
  refs.alphaOut.value = Number(refs.alpha.value).toFixed(2);
  refs.refScaleOut.value = Number(refs.refScale.value).toFixed(2);
  refs.expectWindowOut.value = Number(refs.expectWindow.value).toFixed(2);
  refs.betaOut.value = Number(refs.beta.value).toFixed(2);
  refs.thresholdOut.value = Number(refs.threshold.value).toFixed(3);
  refs.softMaskOut.value = Number(refs.softMask.value).toFixed(3);
  refs.reshuffleSplitsOut.value = String(Number(refs.reshuffleSplits.value));
  refs.lowLiftDbOut.value = `${Math.round(Number(refs.lowLiftDb.value))} dB`;
  refs.lowLiftMaxOut.value = `${Math.round(Number(refs.lowLiftMax.value))} dB`;
  refs.tritoneMixOut.value = Number(refs.tritoneMix.value).toFixed(2);
  refs.tritoneUpOut.value = Number(refs.tritoneUpGain.value).toFixed(2);
  refs.tritoneDownOut.value = Number(refs.tritoneDownGain.value).toFixed(2);
  refs.tritoneSpreadOut.value = Number(refs.tritoneSpread.value).toFixed(2);
  refs.tritonePhaseJitterOut.value = Number(refs.tritonePhaseJitter.value).toFixed(2);
  refs.retriggerAmountOut.value = Number(refs.retriggerAmount.value).toFixed(2);
  refs.gaterAmountOut.value = Number(refs.gaterAmount.value).toFixed(2);
  refs.saturatorDriveOut.value = Number(refs.saturatorDrive.value).toFixed(2);
  refs.saturatorMixOut.value = Number(refs.saturatorMix.value).toFixed(2);
}

async function loadAudioFile(file) {
  const ctx = getAudioContext();
  const arr = await file.arrayBuffer();
  const decoded = await ctx.decodeAudioData(arr.slice(0));
  const n = Math.min(2, decoded.numberOfChannels);
  const channels = [];
  for (let ch = 0; ch < n; ch += 1) {
    channels.push(copyArray(decoded.getChannelData(ch)));
  }
  return {
    name: file.name,
    sampleRate: decoded.sampleRate,
    channels,
    length: decoded.length,
    numberOfChannels: n,
  };
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
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

async function loadAudioFromBase64Wav(base64, name = "imported.wav") {
  const ctx = getAudioContext();
  const decoded = await ctx.decodeAudioData(base64ToArrayBuffer(base64).slice(0));
  const n = Math.min(2, decoded.numberOfChannels);
  const channels = [];
  for (let ch = 0; ch < n; ch += 1) {
    channels.push(copyArray(decoded.getChannelData(ch)));
  }
  return {
    name,
    sampleRate: decoded.sampleRate,
    channels,
    length: decoded.length,
    numberOfChannels: n,
  };
}

async function audioClipToWavBase64(clip) {
  if (!clip || !Array.isArray(clip.channels) || !clip.channels.length || !clip.sampleRate) return null;
  const blob = encodeWav(clip.channels, clip.sampleRate);
  return arrayBufferToBase64(await blob.arrayBuffer());
}

function makeReferenceSpectrum(mode, bins, inputMagFrames, refMagFrames, refScale = 1) {
  const R = new Float64Array(bins);

  if (mode === "white") {
    R.fill(1);
  } else if (mode === "pink") {
    for (let k = 0; k < bins; k += 1) {
      R[k] = k === 0 ? 1 : 1 / Math.sqrt(k);
    }
  } else {
    const source = mode === "external" && refMagFrames ? refMagFrames : inputMagFrames;
    for (let t = 0; t < source.length; t += 1) {
      const frame = source[t];
      for (let k = 0; k < bins; k += 1) R[k] += frame[k];
    }
    const inv = source.length > 0 ? 1 / source.length : 1;
    for (let k = 0; k < bins; k += 1) R[k] *= inv;
  }

  let meanR = 0;
  let meanX = 0;
  for (let k = 0; k < bins; k += 1) meanR += R[k];
  meanR /= Math.max(1, bins);

  if (inputMagFrames.length > 0) {
    const f0 = inputMagFrames[0];
    for (let k = 0; k < bins; k += 1) meanX += f0[k];
    meanX /= Math.max(1, bins);
  } else {
    meanX = 1;
  }

  const normalize = meanR > 1e-12 ? meanX / meanR : 1;
  for (let k = 0; k < bins; k += 1) R[k] *= normalize * refScale;
  return R;
}

function softThresholdMask(value, threshold, softness) {
  if (threshold <= 0) return 1;
  if (value <= threshold) return 0;
  if (softness <= 1e-9) return 1;
  const x = clamp((value - threshold) / softness, 0, 1);
  return x * x * (3 - 2 * x);
}

function selectPhase(mode, origPhase, refPhase) {
  if (mode === "preserve") return origPhase;
  if (mode === "randomize") return (Math.random() * 2 - 1) * Math.PI;
  if (mode === "reference") return Number.isFinite(refPhase) ? refPhase : origPhase;
  return origPhase;
}

function stftChannel(samples, fftSize, hop, window, zeroPad) {
  const inLen = samples.length;
  const frameCount = zeroPad
    ? Math.max(1, Math.ceil((inLen - fftSize) / hop) + 1)
    : Math.max(1, Math.floor(Math.max(0, inLen - fftSize) / hop) + 1);
  const outLen = (frameCount - 1) * hop + fftSize;
  const bins = fftSize / 2 + 1;

  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  const fft = new FFT(fftSize);

  const mags = new Array(frameCount);
  const phases = new Array(frameCount);

  for (let t = 0; t < frameCount; t += 1) {
    re.fill(0);
    im.fill(0);
    const base = t * hop;
    for (let n = 0; n < fftSize; n += 1) {
      const idx = base + n;
      const s = idx < inLen ? samples[idx] : 0;
      re[n] = s * window[n];
    }

    fft.transform(re, im, false);

    const mag = new Float64Array(bins);
    const ph = new Float64Array(bins);
    for (let k = 0; k < bins; k += 1) {
      mag[k] = Math.hypot(re[k], im[k]);
      ph[k] = Math.atan2(im[k], re[k]);
    }
    mags[t] = mag;
    phases[t] = ph;
  }

  return { mags, phases, frameCount, outLen, bins };
}

function istftFromPolar(mags, phases, fftSize, hop, window, desiredLen) {
  const frameCount = mags.length;
  const outLen = (frameCount - 1) * hop + fftSize;
  const out = new Float32Array(outLen);
  const norm = new Float64Array(outLen);

  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  const fft = new FFT(fftSize);

  for (let t = 0; t < frameCount; t += 1) {
    re.fill(0);
    im.fill(0);

    const mag = mags[t];
    const ph = phases[t];

    for (let k = 0; k <= fftSize / 2; k += 1) {
      const m = Math.max(0, mag[k]);
      const p = ph[k];
      const rr = m * Math.cos(p);
      const ii = m * Math.sin(p);

      const i = k;
      const j = k === 0 || k === fftSize / 2 ? k : fftSize - k;
      re[i] = rr;
      im[i] = k === 0 || k === fftSize / 2 ? 0 : ii;
      if (j !== i) {
        re[j] = rr;
        im[j] = -ii;
      }
    }

    fft.transform(re, im, true);

    const base = t * hop;
    for (let n = 0; n < fftSize; n += 1) {
      const idx = base + n;
      const w = window[n];
      out[idx] += re[n] * w;
      norm[idx] += w * w;
    }
  }

  for (let i = 0; i < out.length; i += 1) {
    out[i] /= norm[i] > 1e-10 ? norm[i] : 1;
  }

  if (desiredLen == null) return out;
  const cut = new Float32Array(desiredLen);
  cut.set(out.subarray(0, Math.min(desiredLen, out.length)));
  return cut;
}

function computeExpectation(mags, mode, windowFrames) {
  const frameCount = mags.length;
  const bins = mags[0].length;
  const mu = new Array(frameCount);

  if (mode === "global") {
    const mean = new Float64Array(bins);
    for (let t = 0; t < frameCount; t += 1) {
      for (let k = 0; k < bins; k += 1) mean[k] += mags[t][k];
    }
    const inv = 1 / Math.max(1, frameCount);
    for (let k = 0; k < bins; k += 1) mean[k] *= inv;
    for (let t = 0; t < frameCount; t += 1) mu[t] = mean;
    return mu;
  }

  const accum = new Float64Array(bins);
  for (let t = 0; t < frameCount; t += 1) {
    for (let k = 0; k < bins; k += 1) accum[k] += mags[t][k];
    if (t - windowFrames >= 0) {
      const old = mags[t - windowFrames];
      for (let k = 0; k < bins; k += 1) accum[k] -= old[k];
    }
    const span = Math.min(t + 1, windowFrames);
    const inv = 1 / Math.max(1, span);
    const row = new Float64Array(bins);
    for (let k = 0; k < bins; k += 1) row[k] = accum[k] * inv;
    mu[t] = row;
  }
  return mu;
}

function runEngineForChannel(inputSamples, options, refDataForChannel = null) {
  const fftSize = options.fftSize;
  const hop = Math.max(1, Math.round(fftSize * (1 - options.overlap)));
  const window = hann(fftSize);

  const inputSTFT = stftChannel(inputSamples, fftSize, hop, window, options.zeroPad);
  const frameCount = inputSTFT.frameCount;
  const bins = inputSTFT.bins;

  let refSTFT = null;
  if (refDataForChannel) {
    refSTFT = stftChannel(refDataForChannel, fftSize, hop, window, true);
  }

  const refMags = refSTFT ? refSTFT.mags : null;
  const R = makeReferenceSpectrum(
    options.refMode,
    bins,
    inputSTFT.mags,
    refMags,
    options.refScale
  );

  const windowFrames = Math.max(1, Math.round((options.expectWindowSec * options.sampleRate) / hop));
  const mu = computeExpectation(inputSTFT.mags, options.expectMode, windowFrames);

  const outMags = new Array(frameCount);
  const outPhases = new Array(frameCount);
  const compMags = new Array(frameCount);
  const devMags = new Array(frameCount);

  for (let t = 0; t < frameCount; t += 1) {
    const xMag = inputSTFT.mags[t];
    const xPhase = inputSTFT.phases[t];

    const refPhaseFrame =
      refSTFT && t < refSTFT.phases.length ? refSTFT.phases[t] : null;

    const yMag = new Float64Array(bins);
    const yPhase = new Float64Array(bins);
    const cMag = new Float64Array(bins);
    const dMag = new Float64Array(bins);

    for (let k = 0; k < bins; k += 1) {
      const x = xMag[k];
      const rk = R[k];
      const mk = mu[t][k];

      let comp = options.complementAbs ? Math.abs(rk - x) : rk - x;
      if (!options.complementAbs) comp = Math.max(0, comp);
      if (!options.enableComplement) comp = 0;

      let dev = x - mk;
      if (options.deviationMode === "positive") dev = Math.max(0, dev);
      else if (options.deviationMode === "negative") dev = Math.max(0, mk - x);
      if (!options.enableDeviation) dev = 0;

      const mask = softThresholdMask(Math.abs(dev), options.threshold, options.softMask);
      dev *= mask;

      const raw = options.alpha * comp + options.beta * dev;
      const safeMag = Math.max(0, raw);

      cMag[k] = Math.max(0, options.alpha * comp);
      dMag[k] = Math.max(0, options.beta * dev);
      yMag[k] = safeMag;

      let phaseMode = options.phaseMode;
      if (options.randomizeDeviation && !options.enableComplement && options.enableDeviation) {
        phaseMode = "randomize";
      }
      yPhase[k] = selectPhase(
        phaseMode,
        xPhase[k],
        refPhaseFrame ? refPhaseFrame[k] : Number.NaN
      );
    }

    outMags[t] = yMag;
    outPhases[t] = yPhase;
    compMags[t] = cMag;
    devMags[t] = dMag;
  }

  const targetLen = options.preserveLength ? inputSamples.length : null;
  const out = istftFromPolar(outMags, outPhases, fftSize, hop, window, targetLen);

  return {
    out,
    outMags,
    compMags,
    devMags,
    inputMags: inputSTFT.mags,
    R,
  };
}

function lerpPhase(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
}

function pitchShiftChannelSTFT(samples, semitones, fftSize, overlap, phaseJitter = 0) {
  const factor = Math.pow(2, semitones / 12);
  const hop = Math.max(1, Math.round(fftSize * (1 - overlap)));
  const win = hann(fftSize);
  const spec = stftChannel(samples, fftSize, hop, win, true);
  const bins = spec.bins;

  const outMags = new Array(spec.frameCount);
  const outPhases = new Array(spec.frameCount);

  for (let t = 0; t < spec.frameCount; t += 1) {
    const srcMag = spec.mags[t];
    const srcPhase = spec.phases[t];
    const dstMag = new Float64Array(bins);
    const dstPhase = new Float64Array(bins);

    for (let k = 0; k < bins; k += 1) {
      const srcPos = k / factor;
      const k0 = Math.floor(srcPos);
      const k1 = Math.min(k0 + 1, bins - 1);

      if (k0 < 0 || k0 >= bins) {
        dstMag[k] = 0;
        dstPhase[k] = 0;
        continue;
      }

      const frac = clamp(srcPos - k0, 0, 1);
      dstMag[k] = srcMag[k0] * (1 - frac) + srcMag[k1] * frac;
      dstPhase[k] = lerpPhase(srcPhase[k0], srcPhase[k1], frac);

      if (phaseJitter > 0) {
        dstPhase[k] += (Math.random() * 2 - 1) * phaseJitter;
      }
    }

    outMags[t] = dstMag;
    outPhases[t] = dstPhase;
  }

  return istftFromPolar(outMags, outPhases, fftSize, hop, win, samples.length);
}

function applyTritoneLayers(channels, options) {
  if (!options.enableTritone) return channels.map((ch) => copyArray(ch));

  const phaseJitter = options.tritoneRandomPhase ? options.tritonePhaseJitter : 0;
  const upLayers = channels.map((ch) =>
    pitchShiftChannelSTFT(ch, 6, options.fftSize, options.overlap, phaseJitter)
  );
  const downLayers = channels.map((ch) =>
    pitchShiftChannelSTFT(ch, -6, options.fftSize, options.overlap, phaseJitter)
  );

  const out = channels.map((ch) => copyArray(ch));
  const mix = clamp(options.tritoneMix, 0, 1);

  for (let c = 0; c < out.length; c += 1) {
    let upGain = options.tritoneUpGain;
    let downGain = options.tritoneDownGain;

    if (options.tritoneStereoSpread && out.length === 2) {
      const s = clamp(options.tritoneSpread, 0, 1) * 0.5;
      if (c === 0) {
        upGain *= 1 + s;
        downGain *= 1 - s;
      } else {
        upGain *= 1 - s;
        downGain *= 1 + s;
      }
    }

    for (let i = 0; i < out[c].length; i += 1) {
      const layer = upLayers[c][i] * upGain + downLayers[c][i] * downGain;
      out[c][i] = channels[c][i] + mix * layer;
    }
  }

  return out;
}

function randIn(rnd, min, max) {
  return min + rnd() * (max - min);
}

function applyRandomRetriggers(channels, options, manualPoints = []) {
  if (!options.enableRetrigger || channels.length === 0) {
    return channels.map((ch) => copyArray(ch));
  }

  const amount = clamp(options.retriggerAmount, 0, 1);
  const useAuto = options.retriggerMode !== "manual";
  const useManual = options.retriggerMode !== "auto";
  if (amount <= 0 && manualPoints.length === 0) return channels.map((ch) => copyArray(ch));

  const out = channels.map((ch) => copyArray(ch));
  const len = out[0].length;
  if (len < 8) return out;

  const rnd = Math.random;
  const sr = Math.max(1, options.sampleRate);
  const events = [];
  const stepMin = Math.max(16, Math.floor(sr * 0.03));
  const stepMax = Math.max(stepMin + 1, Math.floor(sr * 0.12));
  const p = 0.03 + amount * 0.32;

  if (useAuto) {
    for (let pos = 0; pos < len; ) {
      if (rnd() < p) {
        const lookback = Math.floor(randIn(rnd, sr * 0.03, sr * (0.16 + amount * 0.5)));
        const srcStart = Math.max(0, pos - lookback);
        const grainLen = Math.floor(randIn(rnd, sr * 0.012, sr * (0.03 + amount * 0.07)));
        const repeats = Math.max(2, Math.floor(randIn(rnd, 2, 2 + amount * 6)));
        events.push({ dstStart: pos, srcStart, grainLen: Math.max(8, grainLen), repeats });
        pos += Math.floor(randIn(rnd, stepMin, stepMax));
      } else {
        pos += Math.floor(randIn(rnd, stepMin, stepMax));
      }
    }
  }

  if (useManual && manualPoints.length > 0) {
    for (const pNorm of manualPoints) {
      const dstStart = Math.floor(clamp(pNorm, 0, 1) * Math.max(0, len - 1));
      const lookback = Math.floor(sr * (0.06 + amount * 0.2));
      const srcStart = Math.max(0, dstStart - lookback);
      const grainLen = Math.max(8, Math.floor(sr * (0.015 + amount * 0.04)));
      const repeats = Math.max(2, Math.floor(2 + amount * 5));
      events.push({ dstStart, srcStart, grainLen, repeats });
    }
  }

  for (const ev of events) {
    for (let r = 0; r < ev.repeats; r += 1) {
      const dst = ev.dstStart + r * ev.grainLen;
      if (dst >= len) break;
      const src = ev.srcStart;
      const copyLen = Math.min(ev.grainLen, len - dst, len - src);
      if (copyLen <= 0) continue;
      for (let ch = 0; ch < out.length; ch += 1) {
        out[ch].set(out[ch].subarray(src, src + copyLen), dst);
      }
    }
  }

  return out;
}

function applyAbsurdGaters(channels, options, manualPoints = []) {
  if (!options.enableGater || channels.length === 0) {
    return channels.map((ch) => copyArray(ch));
  }

  const amount = clamp(options.gaterAmount, 0, 1);
  const useAuto = options.gaterMode !== "manual";
  const useManual = options.gaterMode !== "auto";
  if (amount <= 0 && manualPoints.length === 0) return channels.map((ch) => copyArray(ch));

  const out = channels.map((ch) => copyArray(ch));
  const len = out[0].length;
  if (len < 8) return out;

  const rnd = Math.random;
  const sr = Math.max(1, options.sampleRate);
  const stepMin = Math.max(12, Math.floor(sr * 0.02));
  const stepMax = Math.max(stepMin + 1, Math.floor(sr * 0.09));
  const p = 0.04 + amount * 0.42;

  const applyGateAt = (start) => {
    const muteLen = Math.floor(randIn(rnd, sr * 0.002, sr * (0.008 + amount * 0.05)));
    const fadeLen = Math.max(2, Math.floor(sr * 0.0015));
    const end = Math.min(len, start + Math.max(4, muteLen));
    for (let i = start; i < end; i += 1) {
      let g = 0;
      const into = i - start;
      const outof = end - i - 1;
      if (into < fadeLen) g = into / fadeLen;
      if (outof < fadeLen) g = Math.min(g, outof / fadeLen);
      g = clamp(g, 0, 1);
      for (let ch = 0; ch < out.length; ch += 1) {
        out[ch][i] *= g;
      }
    }
  };

  if (useAuto) {
    for (let pos = 0; pos < len; ) {
      if (rnd() < p) {
        applyGateAt(pos);
        pos += Math.floor(randIn(rnd, stepMin, stepMax));
      } else {
        pos += Math.floor(randIn(rnd, stepMin, stepMax));
      }
    }
  }

  if (useManual && manualPoints.length > 0) {
    for (const pNorm of manualPoints) {
      const start = Math.floor(clamp(pNorm, 0, 1) * Math.max(0, len - 1));
      applyGateAt(start);
    }
  }

  return out;
}

function buildSaturationCurve(drive, size = 2048) {
  const curve = new Float32Array(size);
  const d = Math.max(1, Number(drive) || 1);
  const norm = Math.tanh(d);
  for (let i = 0; i < size; i += 1) {
    const x = (i / (size - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * d) / norm;
  }
  return curve;
}

async function ensureOutputFx() {
  if (outputFx) return outputFx;
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  const src = ctx.createMediaElementSource(refs.audioOut);
  const master = ctx.createGain();
  const dry = ctx.createGain();
  const pre = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  const wet = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor();
  const limiterGain = ctx.createGain();
  const bypassGain = ctx.createGain();
  const meter = ctx.createAnalyser();
  meter.fftSize = 1024;

  src.connect(master);
  master.connect(dry);
  master.connect(pre);
  pre.connect(shaper);
  shaper.connect(wet);
  dry.connect(bypassGain);
  wet.connect(bypassGain);
  bypassGain.connect(ctx.destination);
  dry.connect(limiter);
  wet.connect(limiter);
  limiter.connect(limiterGain);
  limiterGain.connect(ctx.destination);
  master.connect(meter);

  limiter.threshold.value = -1;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.09;

  outputMeterAnalyser = meter;
  outputFx = { master, dry, pre, shaper, wet, limiter, limiterGain, bypassGain };
  applyOutputMasterRouting();
  return outputFx;
}

function startOutputMeterLoop() {
  if (!outputMeterAnalyser) return;
  if (!outputMeterData || outputMeterData.length !== outputMeterAnalyser.fftSize) {
    outputMeterData = new Uint8Array(outputMeterAnalyser.fftSize);
  }
  const tick = () => {
    if (refs.audioOut.paused || !outputMeterAnalyser) {
      outputMeterRaf = null;
      window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
      return;
    }
    outputMeterAnalyser.getByteTimeDomainData(outputMeterData);
    let peak = 0;
    for (let i = 0; i < outputMeterData.length; i += 1) {
      const v = Math.abs((outputMeterData[i] - 128) / 128);
      if (v > peak) peak = v;
    }
    window.parent?.postMessage({ type: "denarrator-meter", level: clamp(peak * 1.8, 0, 1) }, "*");
    outputMeterRaf = requestAnimationFrame(tick);
  };
  if (outputMeterRaf) cancelAnimationFrame(outputMeterRaf);
  outputMeterRaf = requestAnimationFrame(tick);
}

function stopOutputMeterLoop() {
  if (outputMeterRaf) {
    cancelAnimationFrame(outputMeterRaf);
    outputMeterRaf = null;
  }
  window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
}

function applyOutputMasterRouting() {
  if (outputFx) {
    outputFx.master.gain.value = clamp(masterOutputVolume, 0, 1);
    outputFx.limiterGain.gain.value = masterLimiterEnabled ? 1 : 0;
    outputFx.bypassGain.gain.value = masterLimiterEnabled ? 0 : 1;
    refs.audioOut.volume = 1;
  } else {
    refs.audioOut.volume = clamp(masterOutputVolume, 0, 1);
  }
}

async function applyOutputDeviceToAudioEl() {
  if (!refs.audioOut || typeof refs.audioOut.setSinkId !== "function") {
    return;
  }
  try {
    await refs.audioOut.setSinkId(selectedOutputDeviceId || "");
  } catch {
    // Ignore sink selection failures on unsupported platforms.
  }
}

function saturateSample(v, drive) {
  const d = Math.max(1, Number(drive) || 1);
  return Math.tanh(v * d) / Math.tanh(d);
}

function applySaturatorToChannels(channels, drive, mix) {
  const dryAmt = 1 - clamp(mix, 0, 1);
  const wetAmt = clamp(mix, 0, 1);
  const out = channels.map((ch) => new Float32Array(ch.length));
  for (let c = 0; c < channels.length; c += 1) {
    const src = channels[c];
    const dst = out[c];
    for (let i = 0; i < src.length; i += 1) {
      const wet = saturateSample(src[i], drive);
      dst[i] = src[i] * dryAmt + wet * wetAmt;
    }
  }
  return out;
}

function refreshOutputBlob(channels, sampleRate) {
  state.output = { channels, sampleRate };
  state.outputWavePeaks = null;
  const wav = encodeWav(channels, sampleRate);
  state.outputBlob = wav;
  if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
  state.blobUrl = URL.createObjectURL(wav);
  refs.audioOut.src = state.blobUrl;
  refs.audioOut.currentTime = 0;
  refs.audioOut.pause();
  syncPlayButton();
  refs.audioOut.loop = refs.loopOutput.checked;
  drawOutputWaveform();
  refs.downloadBtn.disabled = false;
  refs.addSaturatorBtn.disabled = false;
  refs.outputPlayBtn.disabled = false;
  refs.downloadBtn.onclick = async () => {
    if (!state.outputBlob) {
      setStatus("Kein Output zum Speichern vorhanden.", true);
      return;
    }
    try {
      const filename = `${sanitizeFileBaseName(refs.outputName.value)}.wav`;
      const saveResult = await saveBlobWithFallback(state.outputBlob, filename);
      if (saveResult === "cancelled") {
        setStatus("Speichern abgebrochen.", true);
      } else {
        setStatus("Output gespeichert.");
      }
    } catch (err) {
      setStatus(`Speichern fehlgeschlagen: ${err.message}`, true);
    }
  };
}

async function updateLiveSaturator() {
  try {
    if (!refs.enableLiveSaturator.checked) {
      if (outputFx) {
        outputFx.dry.gain.value = 1;
        outputFx.pre.gain.value = 1;
        outputFx.wet.gain.value = 0;
      }
      return;
    }
    const fx = await ensureOutputFx();
    const enabled = refs.enableLiveSaturator.checked;
    const mix = clamp(Number(refs.saturatorMix.value), 0, 1);
    const drive = Math.max(1, Number(refs.saturatorDrive.value) || 1);
    fx.shaper.curve = buildSaturationCurve(drive, 4096);
    fx.shaper.oversample = "4x";
    if (!enabled) {
      fx.dry.gain.value = 1;
      fx.pre.gain.value = 1;
      fx.wet.gain.value = 0;
      return;
    }
    fx.dry.gain.value = 1 - mix;
    fx.pre.gain.value = 1;
    fx.wet.gain.value = mix;
  } catch (_err) {
    // Live FX can fail before a user gesture; ignore and retry on next interaction.
  }
}

function postProcessChannels(channels, inputChannels, options) {
  const out = channels.map((ch) => copyArray(ch));

  if (options.rmsNorm) {
    for (let c = 0; c < out.length; c += 1) {
      const inR = rms(inputChannels[c]);
      const outR = rms(out[c]);
      if (outR > 1e-9) {
        const g = clamp(inR / outR, 0.1, 8);
        for (let i = 0; i < out[c].length; i += 1) out[c][i] *= g;
      }
    }
  }

  if (options.enableLowLift) {
    const targetDb = options.lowLiftDb;
    const maxLiftDb = Math.max(0, options.lowLiftMaxDb);
    const targetLin = Math.pow(10, targetDb / 20);
    const maxGain = Math.pow(10, maxLiftDb / 20);
    const eps = 1e-8;
    const len = out[0]?.length || 0;
    for (let i = 0; i < len; i += 1) {
      let mono = 0;
      for (let ch = 0; ch < out.length; ch += 1) mono += Math.abs(out[ch][i]);
      mono /= Math.max(1, out.length);
      const needed = targetLin / Math.max(mono, eps);
      const hardGain = clamp(needed, 1, maxGain);

      for (let ch = 0; ch < out.length; ch += 1) out[ch][i] *= hardGain;
    }
  }

  if (options.limiter) {
    for (const ch of out) softLimit(ch, 1.8);
  }

  if (options.antiClip) {
    normalizePeak(out, 0.99);
  }

  return out;
}

function makeSeededRng(seed) {
  let s = (seed >>> 0) || 1;
  return function next() {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isIdentity(order) {
  for (let i = 0; i < order.length; i += 1) {
    if (order[i] !== i) return false;
  }
  return true;
}

function hasFixedPoints(order) {
  for (let i = 0; i < order.length; i += 1) {
    if (order[i] === i) return true;
  }
  return false;
}

function shuffledOrderWithRng(count, rnd, requireDerangement = true) {
  const base = Array.from({ length: count }, (_, i) => i);
  if (count <= 1) return base;

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const order = base.slice();
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }
    if (isIdentity(order)) continue;
    if (requireDerangement && hasFixedPoints(order)) continue;
    return order;
  }

  // Fallback: sichere Rotation, damit immer hörbare Umordnung entsteht.
  const rot = base.slice();
  const first = rot.shift();
  rot.push(first);
  return rot;
}

function applyReshuffler(channels, splitCount, seed = null) {
  const count = Math.max(1, Math.floor(splitCount));
  if (count <= 1 || channels.length === 0) {
    return { channels: channels.map((ch) => copyArray(ch)), order: [0] };
  }

  const len = channels[0].length;
  if (len <= 1) {
    return { channels: channels.map((ch) => copyArray(ch)), order: [0] };
  }

  const starts = new Array(count);
  const ends = new Array(count);
  for (let i = 0; i < count; i += 1) {
    starts[i] = Math.floor((i * len) / count);
    ends[i] = Math.floor(((i + 1) * len) / count);
  }

  const rnd =
    Number.isFinite(seed) && seed != null
      ? makeSeededRng(seed)
      : Math.random;
  const order = shuffledOrderWithRng(count, rnd, true);
  const out = channels.map(() => new Float32Array(len));

  for (let targetIdx = 0; targetIdx < count; targetIdx += 1) {
    const srcIdx = order[targetIdx];
    const srcStart = starts[srcIdx];
    const srcEnd = ends[srcIdx];
    const dstStart = starts[targetIdx];
    const segLen = srcEnd - srcStart;

    for (let ch = 0; ch < channels.length; ch += 1) {
      out[ch].set(channels[ch].subarray(srcStart, srcEnd), dstStart);
      // Falls numerische Rundung tiny Gap erzeugt, bleibt dieser Bereich als 0 bestehen;
      // bei linearen Segmentgrenzen sollte das nicht auftreten.
      if (segLen === 0) {
        out[ch][dstStart] = channels[ch][srcStart] || 0;
      }
    }
  }

  return { channels: out, order };
}

function encodeWav(channels, sampleRate) {
  const numChannels = channels.length;
  const length = channels[0].length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let o = 44;
  for (let i = 0; i < length; i += 1) {
    for (let ch = 0; ch < numChannels; ch += 1) {
      const s = clamp(channels[ch][i], -1, 1);
      const val = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(o, Math.round(val), true);
      o += 2;
    }
  }

  return new Blob([buf], { type: "audio/wav" });
}

function averageFrames(frames) {
  if (!frames || frames.length === 0) return null;
  const bins = frames[0].length;
  const out = new Float64Array(bins);
  for (let t = 0; t < frames.length; t += 1) {
    for (let k = 0; k < bins; k += 1) out[k] += frames[t][k];
  }
  const inv = 1 / frames.length;
  for (let k = 0; k < bins; k += 1) out[k] *= inv;
  return out;
}

function drawSpectrumLine(ctx, mags, width, height, color, maxDb = -6, minDb = -86) {
  if (!mags || mags.length < 2) return;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  for (let k = 1; k < mags.length; k += 1) {
    const db = 20 * Math.log10(mags[k] + 1e-12);
    const norm = clamp((db - minDb) / (maxDb - minDb), 0, 1);
    const x = (k / (mags.length - 1)) * width;
    const y = height - norm * height;
    if (k === 1) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawVisualizer() {
  const ctx = refs.specCanvas.getContext("2d");
  const w = refs.specCanvas.width;
  const h = refs.specCanvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "#fdfbf7";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#d8d2c8";
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i += 1) {
    const y = (h / 6) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  if (!state.vizData) {
    ctx.fillStyle = "#777";
    ctx.font = "13px 'Avenir Next', sans-serif";
    ctx.fillText("Lade ein Signal und rendere für Spektraldaten.", 14, 24);
    return;
  }

  drawSpectrumLine(ctx, state.vizData.original, w, h, "#3d7f7f");
  if (refs.showIntermediate.checked) {
    drawSpectrumLine(ctx, state.vizData.complement, w, h, "#875a45");
    drawSpectrumLine(ctx, state.vizData.deviation, w, h, "#6d6d6d");
  }
  drawSpectrumLine(ctx, state.vizData.final, w, h, "#111111");

  ctx.font = "12px 'Avenir Next', sans-serif";
  ctx.fillStyle = "#3d7f7f";
  ctx.fillText("Original", 10, 18);
  if (refs.showIntermediate.checked) {
    ctx.fillStyle = "#875a45";
    ctx.fillText("Complement", 72, 18);
    ctx.fillStyle = "#6d6d6d";
    ctx.fillText("Deviation", 160, 18);
  }
  ctx.fillStyle = "#111111";
  ctx.fillText("Final Output", refs.showIntermediate.checked ? 240 : 90, 18);
}

function getOptions() {
  return {
    fftSize: Number(refs.fftSize.value),
    overlap: Number(refs.overlap.value),
    zeroPad: refs.zeroPad.checked,
    refMode: refs.refMode.value,
    refScale: Number(refs.refScale.value),
    alpha: Number(refs.alpha.value),
    beta: Number(refs.beta.value),
    complementAbs: refs.complementAbs.checked,
    enableComplement: refs.enableComplement.checked,
    expectMode: refs.expectMode.value,
    deviationMode: refs.deviationMode.value,
    expectWindowSec: Number(refs.expectWindow.value),
    threshold: Number(refs.threshold.value),
    softMask: Number(refs.softMask.value),
    enableDeviation: refs.enableDeviation.checked,
    phaseMode: refs.phaseMode.value,
    randomizeDeviation: refs.randomizeDeviation.checked,
    antiClip: refs.antiClip.checked,
    limiter: refs.limiter.checked,
    rmsNorm: refs.rmsNorm.checked,
    enableLowLift: refs.enableLowLift.checked,
    lowLiftDb: Number(refs.lowLiftDb.value),
    lowLiftMaxDb: Number(refs.lowLiftMax.value),
    enableTritone: refs.enableTritone.checked,
    tritoneMix: Number(refs.tritoneMix.value),
    tritoneUpGain: Number(refs.tritoneUpGain.value),
    tritoneDownGain: Number(refs.tritoneDownGain.value),
    tritoneStereoSpread: refs.tritoneStereoSpread.checked,
    tritoneSpread: Number(refs.tritoneSpread.value),
    tritoneRandomPhase: refs.tritoneRandomPhase.checked,
    tritonePhaseJitter: Number(refs.tritonePhaseJitter.value),
    enableRetrigger: refs.enableRetrigger.checked,
    retriggerMode: refs.retriggerMode.value,
    retriggerAmount: Number(refs.retriggerAmount.value),
    enableGater: refs.enableGater.checked,
    gaterMode: refs.gaterMode.value,
    gaterAmount: Number(refs.gaterAmount.value),
    preserveLength: refs.preserveLength.checked,
    enableReshuffler: refs.enableReshuffler.checked,
    reshuffleSplits: Number(refs.reshuffleSplits.value),
    reshuffleSeed: Number(refs.reshuffleSeed.value) >>> 0,
    useFixedSeed: refs.useFixedSeed.checked,
    sampleRate: state.input.sampleRate,
  };
}

function getConfig() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    name: String(refs.configName.value || "").trim() || "negativraum_config",
    params: {
      windowType: refs.windowType.value,
      fftSize: Number(refs.fftSize.value),
      overlap: Number(refs.overlap.value),
      zeroPad: refs.zeroPad.checked,
      refMode: refs.refMode.value,
      alpha: Number(refs.alpha.value),
      refScale: Number(refs.refScale.value),
      complementAbs: refs.complementAbs.checked,
      enableComplement: refs.enableComplement.checked,
      expectMode: refs.expectMode.value,
      deviationMode: refs.deviationMode.value,
      expectWindow: Number(refs.expectWindow.value),
      beta: Number(refs.beta.value),
      threshold: Number(refs.threshold.value),
      softMask: Number(refs.softMask.value),
      enableDeviation: refs.enableDeviation.checked,
      phaseMode: refs.phaseMode.value,
      randomizeDeviation: refs.randomizeDeviation.checked,
      antiClip: refs.antiClip.checked,
      limiter: refs.limiter.checked,
      rmsNorm: refs.rmsNorm.checked,
      enableLowLift: refs.enableLowLift.checked,
      lowLiftDb: Number(refs.lowLiftDb.value),
      lowLiftMax: Number(refs.lowLiftMax.value),
      enableTritone: refs.enableTritone.checked,
      tritoneMix: Number(refs.tritoneMix.value),
      tritoneUpGain: Number(refs.tritoneUpGain.value),
      tritoneDownGain: Number(refs.tritoneDownGain.value),
      tritoneStereoSpread: refs.tritoneStereoSpread.checked,
      tritoneSpread: Number(refs.tritoneSpread.value),
      tritoneRandomPhase: refs.tritoneRandomPhase.checked,
      tritonePhaseJitter: Number(refs.tritonePhaseJitter.value),
      enableRetrigger: refs.enableRetrigger.checked,
      retriggerMode: refs.retriggerMode.value,
      retriggerAmount: Number(refs.retriggerAmount.value),
      enableGater: refs.enableGater.checked,
      gaterMode: refs.gaterMode.value,
      gaterAmount: Number(refs.gaterAmount.value),
      manualRetriggerPoints: state.manualRetriggerPoints.slice(),
      manualGaterPoints: state.manualGaterPoints.slice(),
      enableLiveSaturator: refs.enableLiveSaturator.checked,
      saturatorDrive: Number(refs.saturatorDrive.value),
      saturatorMix: Number(refs.saturatorMix.value),
      outputName: String(refs.outputName.value || "").trim() || "negativraum_output",
      preserveLength: refs.preserveLength.checked,
      showIntermediate: refs.showIntermediate.checked,
      enableReshuffler: refs.enableReshuffler.checked,
      reshuffleSplits: Number(refs.reshuffleSplits.value),
      reshuffleSeed: Number(refs.reshuffleSeed.value) >>> 0,
      useFixedSeed: refs.useFixedSeed.checked,
      loopOutput: refs.loopOutput.checked,
    },
  };
}

function clampNumber(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, min, max);
}

function applyConfig(configObj) {
  const p = configObj?.params;
  if (!p || typeof p !== "object") {
    throw new Error("Ungueltige .negat/.logo Datei: params fehlt.");
  }

  if (typeof p.windowType === "string") refs.windowType.value = p.windowType;
  refs.fftSize.value = String(clampNumber(p.fftSize, 1024, 4096, Number(refs.fftSize.value)));
  refs.overlap.value = String(clampNumber(p.overlap, 0.5, 0.875, Number(refs.overlap.value)));
  refs.zeroPad.checked = Boolean(p.zeroPad);
  if (typeof p.refMode === "string") refs.refMode.value = p.refMode;
  refs.alpha.value = String(clampNumber(p.alpha, 0, 2, Number(refs.alpha.value)));
  refs.refScale.value = String(clampNumber(p.refScale, 0.1, 4, Number(refs.refScale.value)));
  refs.complementAbs.checked = Boolean(p.complementAbs);
  refs.enableComplement.checked = Boolean(p.enableComplement);
  if (typeof p.expectMode === "string") refs.expectMode.value = p.expectMode;
  if (typeof p.deviationMode === "string") refs.deviationMode.value = p.deviationMode;
  refs.expectWindow.value = String(clampNumber(p.expectWindow, 0.5, 10, Number(refs.expectWindow.value)));
  refs.beta.value = String(clampNumber(p.beta, 0, 3, Number(refs.beta.value)));
  refs.threshold.value = String(clampNumber(p.threshold, 0, 0.2, Number(refs.threshold.value)));
  refs.softMask.value = String(clampNumber(p.softMask, 0, 0.2, Number(refs.softMask.value)));
  refs.enableDeviation.checked = Boolean(p.enableDeviation);
  if (typeof p.phaseMode === "string") refs.phaseMode.value = p.phaseMode;
  refs.randomizeDeviation.checked = Boolean(p.randomizeDeviation);
  refs.antiClip.checked = Boolean(p.antiClip);
  refs.limiter.checked = Boolean(p.limiter);
  refs.rmsNorm.checked = Boolean(p.rmsNorm);
  refs.enableLowLift.checked = Boolean(p.enableLowLift);
  refs.lowLiftDb.value = String(clampNumber(p.lowLiftDb, -30, -10, Number(refs.lowLiftDb.value)));
  refs.lowLiftMax.value = String(clampNumber(p.lowLiftMax, 6, 30, Number(refs.lowLiftMax.value)));
  refs.enableTritone.checked = Boolean(p.enableTritone);
  refs.tritoneMix.value = String(clampNumber(p.tritoneMix, 0, 1, Number(refs.tritoneMix.value)));
  refs.tritoneUpGain.value = String(clampNumber(p.tritoneUpGain, 0, 2, Number(refs.tritoneUpGain.value)));
  refs.tritoneDownGain.value = String(clampNumber(p.tritoneDownGain, 0, 2, Number(refs.tritoneDownGain.value)));
  refs.tritoneStereoSpread.checked = Boolean(p.tritoneStereoSpread);
  refs.tritoneSpread.value = String(clampNumber(p.tritoneSpread, 0, 1, Number(refs.tritoneSpread.value)));
  refs.tritoneRandomPhase.checked = Boolean(p.tritoneRandomPhase);
  refs.tritonePhaseJitter.value = String(clampNumber(p.tritonePhaseJitter, 0, 0.5, Number(refs.tritonePhaseJitter.value)));
  refs.enableRetrigger.checked = Boolean(p.enableRetrigger);
  if (typeof p.retriggerMode === "string") refs.retriggerMode.value = p.retriggerMode;
  refs.retriggerAmount.value = String(clampNumber(p.retriggerAmount, 0, 1, Number(refs.retriggerAmount.value)));
  refs.enableGater.checked = Boolean(p.enableGater);
  if (typeof p.gaterMode === "string") refs.gaterMode.value = p.gaterMode;
  refs.gaterAmount.value = String(clampNumber(p.gaterAmount, 0, 1, Number(refs.gaterAmount.value)));
  state.manualRetriggerPoints = sortUniquePoints(Array.isArray(p.manualRetriggerPoints) ? p.manualRetriggerPoints : []);
  state.manualGaterPoints = sortUniquePoints(Array.isArray(p.manualGaterPoints) ? p.manualGaterPoints : []);
  refs.enableLiveSaturator.checked = Boolean(p.enableLiveSaturator);
  refs.saturatorDrive.value = String(clampNumber(p.saturatorDrive, 1, 8, Number(refs.saturatorDrive.value)));
  refs.saturatorMix.value = String(clampNumber(p.saturatorMix, 0, 1, Number(refs.saturatorMix.value)));
  if (typeof p.outputName === "string" && p.outputName.trim()) {
    refs.outputName.value = p.outputName.trim();
  }
  refs.preserveLength.checked = Boolean(p.preserveLength);
  refs.showIntermediate.checked = Boolean(p.showIntermediate);
  refs.enableReshuffler.checked = Boolean(p.enableReshuffler);
  refs.reshuffleSplits.value = String(clampNumber(p.reshuffleSplits, 1, 32, Number(refs.reshuffleSplits.value)));
  refs.reshuffleSeed.value = String((Number(p.reshuffleSeed) >>> 0) || (Number(refs.reshuffleSeed.value) >>> 0));
  refs.useFixedSeed.checked = Boolean(p.useFixedSeed);
  refs.loopOutput.checked = Boolean(p.loopOutput);
  refs.audioOut.loop = refs.loopOutput.checked;
  if (typeof configObj?.name === "string" && configObj.name.trim()) {
    refs.configName.value = configObj.name.trim();
  }

  updateLabels();
  updateManualPointCounts();
  drawVisualizer();
  drawOutputWaveform();
  void updateLiveSaturator();
}

function sanitizeFileBaseName(name) {
  const cleaned = String(name || "")
    .trim()
    .replace(/[^\w\- ]+/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
  return cleaned || "negativraum_config";
}

function validateOptions(options) {
  if (options.refMode === "external" && !state.reference) {
    throw new Error("Reference mode 'external' benötigt eine geladene Referenzdatei.");
  }
  if (options.phaseMode === "reference" && !state.reference) {
    throw new Error("Phase mode 'reference' benötigt eine geladene Referenzdatei.");
  }
  if (!options.enableComplement && !options.enableDeviation) {
    throw new Error("Mindestens ein Modul (Complement oder Deviation) muss aktiv sein.");
  }
}

function ensureReferenceChannels(targetChannels, sampleRate) {
  if (!state.reference) return null;
  const ref = state.reference;
  const mono = averageToMono(ref.channels);
  const out = [];
  for (let c = 0; c < targetChannels; c += 1) {
    const src = ref.channels[c] || mono;
    out.push(resampleLinear(src, ref.sampleRate, sampleRate));
  }
  return out;
}

async function processAudio() {
  if (!state.input) throw new Error("Bitte zuerst ein Eingangssignal laden.");

  const options = getOptions();
  validateOptions(options);

  const inChannels = state.input.channels.map((ch) => copyArray(ch));
  const nChannels = inChannels.length;
  const refChannels = ensureReferenceChannels(nChannels, state.input.sampleRate);

  const outChannels = [];
  let vizSeed = null;

  for (let c = 0; c < nChannels; c += 1) {
    const result = runEngineForChannel(inChannels[c], options, refChannels ? refChannels[c] : null);
    outChannels.push(result.out);

    if (c === 0) {
      vizSeed = {
        original: averageFrames(result.inputMags),
        complement: averageFrames(result.compMags),
        deviation: averageFrames(result.devMags),
        final: averageFrames(result.outMags),
      };
    }
  }

  const activeSeed = options.enableReshuffler
    ? (options.useFixedSeed ? options.reshuffleSeed : (Math.floor(Math.random() * 4294967296) >>> 0))
    : null;
  if (activeSeed != null) refs.reshuffleSeed.value = String(activeSeed >>> 0);

  const reshuffled = options.enableReshuffler
    ? applyReshuffler(outChannels, options.reshuffleSplits, activeSeed)
    : { channels: outChannels, order: [] };
  const tritoneMixed = applyTritoneLayers(reshuffled.channels, options);
  const retriggered = applyRandomRetriggers(tritoneMixed, options, state.manualRetriggerPoints);
  const gated = applyAbsurdGaters(retriggered, options, state.manualGaterPoints);
  const post = postProcessChannels(gated, inChannels, options);
  return { channels: post, vizSeed, activeSeed, shuffleOrder: reshuffled.order };
}

function wireEvents() {
  applyOutputMasterRouting();
  void applyOutputDeviceToAudioEl();
  refs.inputBrowseBtn?.addEventListener("click", async () => {
    const picked = await openFileViaNativeDialog(modulePaths?.mater, [{ name: "Audio", extensions: ["wav", "aiff", "aif", "flac", "mp3", "ogg"] }]);
    if (picked?.base64) {
      try {
        pushUndoSnapshot();
        setStatus("Lade Eingangssignal ...");
        state.input = await loadAudioFromBase64Wav(picked.base64, picked.name);
        if (refs.inputFileLabel) refs.inputFileLabel.textContent = picked.name;
        refs.inputMeta.textContent = `${state.input.name} | ${state.input.sampleRate} Hz | ${state.input.numberOfChannels}ch | ${state.input.length} Samples`;
        drawWavePreview(refs.inputWavePreview, state.input.channels);
        setStatus("Eingang geladen.");
      } catch (err) {
        setStatus(`Input-Fehler: ${err.message || err}`, true);
      }
      return;
    }
    refs.inputFile?.click();
  });
  refs.refBrowseBtn?.addEventListener("click", async () => {
    const picked = await openFileViaNativeDialog(modulePaths?.mater, [{ name: "Audio", extensions: ["wav", "aiff", "aif", "flac", "mp3", "ogg"] }]);
    if (picked?.base64) {
      try {
        pushUndoSnapshot();
        setStatus("Lade Referenz ...");
        state.reference = await loadAudioFromBase64Wav(picked.base64, picked.name);
        if (refs.refFileLabel) refs.refFileLabel.textContent = picked.name;
        refs.refMeta.textContent = `${state.reference.name} | ${state.reference.sampleRate} Hz | ${state.reference.numberOfChannels}ch`;
        drawWavePreview(refs.refWavePreview, state.reference.channels);
        setStatus("Referenz geladen.");
      } catch (err) {
        setStatus(`Referenz-Fehler: ${err.message || err}`, true);
      }
      return;
    }
    refs.refFile?.click();
  });
  refs.swapInputRefBtn?.addEventListener("click", () => {
    if (!state.input && !state.reference) {
      setStatus("Kein Input/Ref zum Tauschen.", true);
      return;
    }
    pushUndoSnapshot();
    const nextInput = state.reference ? cloneAudioClip(state.reference) : null;
    const nextReference = state.input ? cloneAudioClip(state.input) : null;
    state.input = nextInput;
    state.reference = nextReference;
    syncFileViews();
    drawVisualizer();
    setStatus("Input/Ref getauscht.");
  });

  const toWatch = [
    refs.alpha,
    refs.refScale,
    refs.expectWindow,
    refs.beta,
    refs.threshold,
    refs.softMask,
    refs.reshuffleSplits,
    refs.reshuffleSeed,
    refs.lowLiftDb,
    refs.lowLiftMax,
    refs.tritoneMix,
    refs.tritoneUpGain,
    refs.tritoneDownGain,
    refs.tritoneSpread,
    refs.tritonePhaseJitter,
    refs.retriggerAmount,
    refs.gaterAmount,
    refs.retriggerMode,
    refs.gaterMode,
    refs.waveClickTool,
    refs.saturatorDrive,
    refs.saturatorMix,
    refs.showIntermediate,
  ];
  toWatch.forEach((el) => {
    el.addEventListener("input", () => {
      updateLabels();
      drawVisualizer();
    });
    el.addEventListener("change", drawVisualizer);
  });

  refs.inputFile.addEventListener("change", async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    try {
      pushUndoSnapshot();
      setStatus("Lade Eingangssignal ...");
      state.input = await loadAudioFile(file);
      if (refs.inputFileLabel) refs.inputFileLabel.textContent = file.name;
      refs.inputMeta.textContent = `${state.input.name} | ${state.input.sampleRate} Hz | ${state.input.numberOfChannels}ch | ${state.input.length} Samples`;
      drawWavePreview(refs.inputWavePreview, state.input.channels);
      setStatus("Eingang geladen.");
    } catch (err) {
      setStatus(`Input-Fehler: ${err.message}`, true);
    }
  });

  refs.refFile.addEventListener("change", async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) {
      pushUndoSnapshot();
      state.reference = null;
      if (refs.refFileLabel) refs.refFileLabel.textContent = "Keine Referenz geladen";
      refs.refMeta.textContent = "Keine Referenz geladen";
      clearWavePreview(refs.refWavePreview);
      return;
    }
    try {
      pushUndoSnapshot();
      setStatus("Lade Referenz ...");
      state.reference = await loadAudioFile(file);
      if (refs.refFileLabel) refs.refFileLabel.textContent = file.name;
      refs.refMeta.textContent = `${state.reference.name} | ${state.reference.sampleRate} Hz | ${state.reference.numberOfChannels}ch`;
      drawWavePreview(refs.refWavePreview, state.reference.channels);
      setStatus("Referenz geladen.");
    } catch (err) {
      setStatus(`Referenz-Fehler: ${err.message}`, true);
    }
  });

  const runRender = async () => {
  if (refs.processBtn) refs.processBtn.disabled = true;
  refs.outputRenderBtn.disabled = true;
    try {
      setStatus("STFT + Negativraum-Render läuft ...");
      const result = await processAudio();
      pushUndoSnapshot();

      state.output = {
        sampleRate: state.input.sampleRate,
        channels: result.channels,
      };

      state.vizData = result.vizSeed;
      drawVisualizer();
      refreshOutputBlob(result.channels, state.input.sampleRate);
      await updateLiveSaturator();

      let saveSuffix = "";
      if (state.outputBlob) {
        const filename = `${sanitizeFileBaseName(refs.outputName.value)}.wav`;
        const saveResult = await saveBlobSequencedWithFallback(state.outputBlob, filename, "render");
        if (saveResult === "saved" || saveResult === "downloaded") {
          saveSuffix = ` | saved: ${filename}`;
        } else {
          saveSuffix = " | save cancelled";
        }
      }

      if (refs.enableReshuffler.checked) {
        const preview = (result.shuffleOrder || []).slice(0, 8).join(",");
        setStatus(`Fertig: Negativraum${refs.enableTritone.checked ? " + Tritone" : ""}${refs.enableRetrigger.checked ? " + Retrigger" : ""}${refs.enableGater.checked ? " + Gater" : ""} + Reshuffler (Seed ${result.activeSeed >>> 0}, Order ${preview}${(result.shuffleOrder || []).length > 8 ? ",..." : ""}).${saveSuffix}`);
      } else if (refs.enableTritone.checked && refs.enableRetrigger.checked) {
        setStatus(`Fertig: Negativraum + Tritone Layers + Random Retriggers${refs.enableGater.checked ? " + Absurd Gaters" : ""} gerendert.${saveSuffix}`);
      } else if (refs.enableTritone.checked) {
        setStatus(`Fertig: Negativraum + Tritone Layers${refs.enableGater.checked ? " + Absurd Gaters" : ""} gerendert.${saveSuffix}`);
      } else if (refs.enableRetrigger.checked) {
        setStatus(`Fertig: Negativraum + Random Retriggers${refs.enableGater.checked ? " + Absurd Gaters" : ""} gerendert.${saveSuffix}`);
      } else if (refs.enableGater.checked) {
        setStatus(`Fertig: Negativraum + Absurd Gaters gerendert.${saveSuffix}`);
      } else {
        setStatus(`Fertig: Negativraum-Output gerendert.${saveSuffix}`);
      }
    } catch (err) {
      setStatus(`Rendering fehlgeschlagen: ${err.message}`, true);
    } finally {
      if (refs.processBtn) refs.processBtn.disabled = false;
      refs.outputRenderBtn.disabled = false;
    }
  };

  if (refs.processBtn) refs.processBtn.addEventListener("click", runRender);
  refs.outputRenderBtn.addEventListener("click", runRender);

  refs.randomSeedBtn.addEventListener("click", () => {
    refs.reshuffleSeed.value = String(Math.floor(Math.random() * 4294967296) >>> 0);
  });

  refs.loopOutput.addEventListener("change", () => {
    refs.audioOut.loop = refs.loopOutput.checked;
  });

  refs.outputPlayBtn.addEventListener("click", async () => {
    if (!state.output) return;
    try {
      await updateLiveSaturator();
      if (refs.audioOut.paused) {
        await refs.audioOut.play();
        syncPlayButton();
        startOutputWaveLoop();
      } else {
        refs.audioOut.pause();
        syncPlayButton();
  drawOutputWaveform();
}

async function exportSessionChunk(includeOnlyDirty = true) {
  const chunk = {
    schemaVersion: 1,
    transport: {
      playheadSec: Number(refs.audioOut.currentTime) || 0,
      loopA: 0,
      loopB: Number(refs.audioOut.duration) || 0,
    },
    ui: {},
    refs: {
      inputName: state.input?.name || "",
      referenceName: state.reference?.name || "",
      outputName: refs.outputName?.value || "negativraum_output",
    },
    dirty: Boolean(sessionDirty),
  };
  if (!includeOnlyDirty || sessionDirty) {
    chunk.heavy = {
      config: getConfig(),
      inputWavBase64: await audioClipToWavBase64(state.input),
      referenceWavBase64: await audioClipToWavBase64(state.reference),
      outputWavBase64:
        state.output && Array.isArray(state.output.channels) && state.output.channels.length
          ? arrayBufferToBase64(await encodeWav(state.output.channels, state.output.sampleRate).arrayBuffer())
          : null,
    };
  }
  return chunk;
}

async function importSessionChunk(chunk) {
  if (!chunk || typeof chunk !== "object") return;
  const heavy = chunk.heavy;
  if (heavy?.config) applyConfig(heavy.config);
  if (heavy?.inputWavBase64) {
    state.input = await loadAudioFromBase64Wav(heavy.inputWavBase64, chunk?.refs?.inputName || "input.wav");
  } else {
    state.input = null;
  }
  if (heavy?.referenceWavBase64) {
    state.reference = await loadAudioFromBase64Wav(heavy.referenceWavBase64, chunk?.refs?.referenceName || "reference.wav");
  } else {
    state.reference = null;
  }
  if (heavy?.outputWavBase64) {
    const outClip = await loadAudioFromBase64Wav(heavy.outputWavBase64, chunk?.refs?.outputName || "output.wav");
    state.output = { channels: outClip.channels, sampleRate: outClip.sampleRate };
    refreshOutputBlob(outClip.channels, outClip.sampleRate);
  } else {
    state.output = null;
  }
  applyClipUiFromState();
  if (chunk?.transport && Number.isFinite(Number(chunk.transport.playheadSec))) {
    refs.audioOut.currentTime = Math.max(0, Number(chunk.transport.playheadSec));
  }
  drawVisualizer();
  drawOutputWaveform();
  updateManualPointCounts();
  sessionDirty = false;
}
    } catch (err) {
      setStatus(`Playback fehlgeschlagen: ${err.message}`, true);
    }
  });

  refs.outputWaveCanvas.addEventListener("click", (evt) => {
    const rect = refs.outputWaveCanvas.getBoundingClientRect();
    const xNorm = clamp((evt.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const tool = refs.waveClickTool.value;

    if (tool === "seek") {
      seekOutputFromClientX(evt.clientX);
      return;
    }

    if (tool === "add_retrigger") {
      pushUndoSnapshot();
      state.manualRetriggerPoints = sortUniquePoints([...state.manualRetriggerPoints, xNorm]);
      updateManualPointCounts();
      drawOutputWaveform();
      return;
    }

    if (tool === "add_gate") {
      pushUndoSnapshot();
      state.manualGaterPoints = sortUniquePoints([...state.manualGaterPoints, xNorm]);
      updateManualPointCounts();
      drawOutputWaveform();
      return;
    }

    if (tool === "erase_retrigger") {
      pushUndoSnapshot();
      const idx = nearestPointIndex(state.manualRetriggerPoints, xNorm);
      if (idx >= 0) state.manualRetriggerPoints.splice(idx, 1);
      updateManualPointCounts();
      drawOutputWaveform();
      return;
    }

    if (tool === "erase_gate") {
      pushUndoSnapshot();
      const idx = nearestPointIndex(state.manualGaterPoints, xNorm);
      if (idx >= 0) state.manualGaterPoints.splice(idx, 1);
      updateManualPointCounts();
      drawOutputWaveform();
    }
  });

  refs.clearRetriggerPointsBtn.addEventListener("click", () => {
    pushUndoSnapshot();
    state.manualRetriggerPoints = [];
    updateManualPointCounts();
    drawOutputWaveform();
  });

  refs.clearGaterPointsBtn.addEventListener("click", () => {
    pushUndoSnapshot();
    state.manualGaterPoints = [];
    updateManualPointCounts();
    drawOutputWaveform();
  });

  refs.audioOut.addEventListener("play", () => {
    if (!outputPlayToken) outputPlayToken = globalPlayStart("preview");
    syncPlayButton();
    startOutputWaveLoop();
    startOutputMeterLoop();
  });

  refs.audioOut.addEventListener("pause", () => {
    if (outputPlayToken) {
      globalPlayStop(outputPlayToken);
      outputPlayToken = null;
    }
    syncPlayButton();
    stopOutputWaveLoop();
    stopOutputMeterLoop();
    drawOutputWaveform();
  });

  refs.audioOut.addEventListener("ended", () => {
    if (outputPlayToken) {
      globalPlayStop(outputPlayToken);
      outputPlayToken = null;
    }
    syncPlayButton();
    stopOutputMeterLoop();
    drawOutputWaveform();
  });

  refs.audioOut.addEventListener("timeupdate", () => {
    drawOutputWaveform();
  });

  refs.audioOut.addEventListener("loadedmetadata", () => {
    drawOutputWaveform();
  });

  refs.enableLiveSaturator.addEventListener("change", () => {
    void updateLiveSaturator();
  });

  refs.saturatorDrive.addEventListener("input", () => {
    updateLabels();
    void updateLiveSaturator();
  });

  refs.saturatorMix.addEventListener("input", () => {
    updateLabels();
    void updateLiveSaturator();
  });

  refs.audioOut.addEventListener("play", () => {
    void ensureOutputFx();
    void updateLiveSaturator();
  });

  refs.addSaturatorBtn.addEventListener("click", () => {
    if (!state.output || !state.output.channels) {
      setStatus("Kein Output zum Einbrennen vorhanden.", true);
      return;
    }
    try {
      pushUndoSnapshot();
      const drive = Number(refs.saturatorDrive.value);
      const mix = Number(refs.saturatorMix.value);
      const baked = applySaturatorToChannels(state.output.channels, drive, mix);
      normalizePeak(baked, 0.99);
      refreshOutputBlob(baked, state.output.sampleRate);
      setStatus("Saturator eingebrannt und als neues Output gesetzt.");
    } catch (err) {
      setStatus(`Saturator-Add fehlgeschlagen: ${err.message}`, true);
    }
  });

  refs.saveConfigBtn.addEventListener("click", async () => {
    try {
      const config = getConfig();
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
      const filename = `${sanitizeFileBaseName(refs.configName.value)}.negat`;
      const saveResult = await saveBlobWithFallback(blob, filename, { kind: "preset" });
      if (saveResult === "cancelled") {
        setStatus("Config speichern abgebrochen.", true);
      } else {
        setStatus("Config gespeichert (.negat).");
      }
    } catch (err) {
      setStatus(`Config speichern fehlgeschlagen: ${err.message}`, true);
    }
  });

  refs.loadConfigBtn.addEventListener("click", async () => {
    const picked = await openFileViaNativeDialog(modulePaths?.presets, [{ name: "Preset", extensions: ["negat", "json", "logo"] }]);
    if (picked?.base64) {
      try {
        pushUndoSnapshot();
        const text = new TextDecoder().decode(new Uint8Array(base64ToArrayBuffer(picked.base64)));
        const parsed = JSON.parse(text);
        applyConfig(parsed);
        setStatus(`Config geladen: ${picked.name}`);
      } catch (err) {
        setStatus(`Config laden fehlgeschlagen: ${err.message || err}`, true);
      }
      return;
    }
    refs.loadConfigFile.click();
  });

  refs.loadConfigFile.addEventListener("change", async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    try {
      pushUndoSnapshot();
      const text = await file.text();
      const parsed = JSON.parse(text);
      applyConfig(parsed);
      setStatus(`Config geladen: ${file.name}`);
    } catch (err) {
      setStatus(`Config laden fehlgeschlagen: ${err.message}`, true);
    } finally {
      refs.loadConfigFile.value = "";
    }
  });

  window.addEventListener("resize", redrawFilePreviews);
  window.addEventListener("resize", drawOutputWaveform);
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
    const target = event.target;
    const tag = String(target?.tagName || "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
      return;
    }
    event.preventDefault();
    undoLastAction();
  });
  window.addEventListener("message", (event) => {
    const data = event?.data;
    if (!data) return;
    if (data.type === "PATHS_BROADCAST" && data.version === 1 && event.source === window.parent) {
      modulePaths = data?.payload || null;
      return;
    }
    if (data.type === "SESSION_EXPORT_REQ" && data.version === 1 && event.source === window.parent) {
      void (async () => {
        const includeOnlyDirty = data?.payload?.includeOnlyDirty !== false;
        const chunk = await exportSessionChunk(includeOnlyDirty);
        window.parent?.postMessage(
          {
            type: "SESSION_EXPORT_RES",
            version: 1,
            payload: {
              moduleId: "negativraum",
              schemaVersion: 1,
              dirty: Boolean(sessionDirty),
              chunk,
            },
          },
          "*"
        );
      })();
      return;
    }
    if (data.type === "SESSION_IMPORT" && data.version === 1 && event.source === window.parent) {
      void (async () => {
        try {
          await importSessionChunk(data?.payload?.chunk || {});
          setStatus("SESSION LOADED");
        } catch (err) {
          setStatus(`Session import failed: ${err.message || err}`, true);
        }
      })();
      return;
    }
    if (data.type === "SESSION_SAVED" && data.version === 1 && event.source === window.parent) {
      sessionDirty = false;
      setStatus("Session saved.");
      return;
    }
    if (data.type === "DENARRATOR_GLOBAL_PLAY" && data.version === 1 && event.source === window.parent) {
      if (refs.audioOut.paused && !refs.outputPlayBtn.disabled) {
        refs.outputPlayBtn.click();
      }
      return;
    }
    if (data.type === "DENARRATOR_GLOBAL_STOP" && data.version === 1 && event.source === window.parent) {
      if (!refs.audioOut.paused) {
        refs.outputPlayBtn.click();
      }
      return;
    }
    if (data.type === "PANIC_KILL" && data.version === 1 && event.source === window.parent) {
      void handlePanicKill();
      return;
    }
    if (data.type === "GLOBAL_PLAY_CLEAR" && data.version === 1 && event.source === window.parent) {
      if (outputPlayToken) {
        globalPlayStop(outputPlayToken);
        outputPlayToken = null;
      }
      return;
    }
    if (data.type === "UI_SQUISH_SET" && data.version === 1 && event.source === window.parent) {
      document.documentElement.classList.toggle("dn-squish", Boolean(data?.payload?.enabled));
      return;
    }
    if (data.type === "AUDIO_RESET_DONE" && data.version === 1 && event.source === window.parent) {
      setStatus("Audio reset ready.");
      return;
    }
    if (data.type === "DENARRATOR_UNDO" && data.version === 1 && event.source === window.parent) {
      undoLastAction();
      return;
    }
    if (data.type === "denarrator-master-volume") {
      const next = Number(data.value);
      if (!Number.isFinite(next)) return;
      masterOutputVolume = clamp(next, 0, 1);
      applyOutputMasterRouting();
      return;
    }
    if (data.type === "denarrator-master-limiter") {
      masterLimiterEnabled = Boolean(data.enabled);
      if (masterLimiterEnabled) {
        void ensureOutputFx();
      }
      applyOutputMasterRouting();
      return;
    }
    if (data.type === "denarrator-audio-device") {
      selectedOutputDeviceId = String(data.deviceId || "");
      void applyOutputDeviceToAudioEl();
      return;
    }
    if (data.type === "DENARRATOR_IMPORT_CLIP" && data.version === 1) {
      if (event.source !== window.parent) return;
      const slot = data.targetSlot === "external" ? "external" : "input";
      const wav = typeof data.wavBytesBase64 === "string" ? data.wavBytesBase64 : "";
      if (!wav) return;
      void (async () => {
        try {
          pushUndoSnapshot();
          const clip = await loadAudioFromBase64Wav(wav, data.name || "imported.wav");
          if (slot === "input") {
            state.input = clip;
            if (refs.inputFileLabel) refs.inputFileLabel.textContent = clip.name;
            refs.inputMeta.textContent = `${clip.name} | ${clip.sampleRate} Hz | ${clip.numberOfChannels}ch | ${clip.length} Samples`;
            drawWavePreview(refs.inputWavePreview, clip.channels);
            setStatus("Eingang aus i^2 importiert.");
          } else {
            state.reference = clip;
            if (refs.refFileLabel) refs.refFileLabel.textContent = clip.name;
            refs.refMeta.textContent = `${clip.name} | ${clip.sampleRate} Hz | ${clip.numberOfChannels}ch`;
            drawWavePreview(refs.refWavePreview, clip.channels);
            setStatus("Externe Referenz aus i^2 importiert.");
          }
        } catch (err) {
          setStatus(`Import fehlgeschlagen: ${err.message}`, true);
        }
      })();
    }
  });
}

updateLabels();
installTactileButtons(document);
wireEvents();
window.parent?.postMessage({ type: "PATHS_REQ", version: 1 }, "*");
drawVisualizer();
clearWavePreview(refs.inputWavePreview);
clearWavePreview(refs.refWavePreview);
refs.outputPlayBtn.disabled = true;
syncPlayButton();
updateManualPointCounts();
drawOutputWaveform();
