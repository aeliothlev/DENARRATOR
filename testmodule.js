const MAX_SLOTS = 10;
const MIN_TARGET_SEC = 0.2;
const MAX_TARGET_SEC = 12.0;
const MAX_SLICE_COUNT = 256;

const refs = {
  slots: document.getElementById("slots"),
  loadedCount: document.getElementById("loadedCount"),
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
    fibomatix: true,
    baseMs: 25,
    minMs: 6,
    maxMs: 250,
    xfadeMs: 8,
  },
  output: null,
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
  paths: null,
  sessionDirty: false,
};

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

function ensureAudioContext() {
  if (!runtime.audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    runtime.audioContext = new Ctor();
  }
  return runtime.audioContext;
}

function globalPlayStart(sourceLabel) {
  const token = `testmodule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    window.parent?.postMessage(
      {
        type: "GLOBAL_PLAY_START",
        version: 1,
        payload: { token, moduleId: "testmodule", source: sourceLabel },
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
    slices.push({
      k: i + 1,
      start,
      len,
    });
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

function normalizePeakStereo(buffer, target = 0.95) {
  let peak = 0;
  for (let c = 0; c < buffer.channels; c += 1) {
    const ch = buffer.data[c];
    for (let i = 0; i < ch.length; i += 1) {
      const a = Math.abs(ch[i]);
      if (a > peak) peak = a;
    }
  }
  if (peak <= 1e-9 || peak <= target) return buffer;
  const g = target / peak;
  for (let c = 0; c < buffer.channels; c += 1) {
    const ch = buffer.data[c];
    for (let i = 0; i < ch.length; i += 1) ch[i] *= g;
  }
  return buffer;
}

function softClipChannel(data, amount = 1.5) {
  const out = new Float32Array(data.length);
  const norm = Math.tanh(amount);
  for (let i = 0; i < data.length; i += 1) {
    out[i] = Math.tanh(data[i] * amount) / norm;
  }
  return out;
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
    meta: {
      inputs: N,
      slices: M,
      targetFrames,
    },
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
      dialogKey: "testmodule.loadAudio",
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

function loadedBuffers() {
  return state.slots.filter((slot) => slot.buffer).map((slot) => slot.buffer);
}

function sanitizeName(name) {
  return String(name || "CENTRIFUGE").trim().replace(/[^a-z0-9._-]+/gi, "_").replace(/_+/g, "_").slice(0, 64) || "CENTRIFUGE";
}

function defaultOutputName() {
  const n = loadedBuffers().length;
  return `CENTRIFUGE_${n}src_${state.params.fibomatix ? "fibomatix" : "uniform"}.wav`;
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
}

function updateReadouts() {
  refs.loadedCount.textContent = `${loadedBuffers().length} / ${MAX_SLOTS} LOADED`;
  refs.baseValue.textContent = `${Math.round(state.params.baseMs)}MS`;
  refs.minValue.textContent = `${Math.round(state.params.minMs)}MS`;
  refs.maxValue.textContent = `${Math.round(state.params.maxMs)}MS`;
  refs.xfadeValue.textContent = `${Math.round(state.params.xfadeMs)}MS`;
  refs.fibBtn.setAttribute("aria-pressed", String(state.params.fibomatix));
  refs.fibBtn.textContent = state.params.fibomatix ? "ON" : "OFF";
  refs.loopBtn.setAttribute("aria-pressed", String(state.preview.loop));
  refs.loopBtn.textContent = state.preview.loop ? "AUGE ON" : "AUGE OFF";
  refs.playBtn.setAttribute("aria-pressed", String(state.preview.playing));
  refs.playBtn.textContent = "PLAY";
}

function syncControlsFromState() {
  refs.baseInput.value = String(Math.round(state.params.baseMs));
  refs.minInput.value = String(Math.round(state.params.minMs));
  refs.maxInput.value = String(Math.round(state.params.maxMs));
  refs.xfadeInput.value = String(Math.round(state.params.xfadeMs));
  updateReadouts();
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
      markSessionDirty();
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
  if (state.params.minMs > state.params.maxMs) {
    state.params.maxMs = state.params.minMs;
    refs.maxInput.value = String(Math.round(state.params.maxMs));
  }
  if (state.params.baseMs < state.params.minMs) {
    state.params.baseMs = state.params.minMs;
    refs.baseInput.value = String(Math.round(state.params.baseMs));
  }
  const t0 = performance.now();
  try {
    state.output = runCentrifugeRender(inputs, state.params);
    markSessionDirty();
    drawWave();
    const ms = Math.round(performance.now() - t0);
    refs.renderInfo.textContent = `CENTRIFUGE DONE | ${state.output.frames} FRAMES | ${ms}MS | ${state.output.meta.slices} SLICES`;
    setStatus("RENDER DONE");
  } catch (error) {
    setStatus(`RENDER FAILED: ${String(error?.message || error)}`, true);
  }
}

async function saveOutput() {
  if (!state.output) {
    setStatus("NO OUTPUT", true);
    return;
  }
  const blob = audioBufferToWavBlob(state.output);
  const result = await saveBlobWithDialog(blob, defaultOutputName());
  setStatus(result === "saved" ? "WAV SAVED" : "SAVE CANCELLED", result !== "saved");
}

async function sendToLazy() {
  if (!state.output) {
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
        source: "testmodule",
        fibomatix: Boolean(state.params.fibomatix),
      },
      source: "testmodule",
    },
    "*"
  );
  setStatus(`SENT ${name} TO LAZY`);
}

function requestCliplibList() {
  const requestId = `testmodule_cliplib_list_${runtime.cliplibReqSeq++}`;
  window.parent?.postMessage({ type: "CLIPLIB_LIST_REQ", version: 1, requestId }, "*");
  setStatus("CLIPLIB LIST REQUESTED");
}

function requestCliplibWav(path) {
  const requestId = `testmodule_cliplib_wav_${runtime.cliplibReqSeq++}`;
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
    state.params.xfadeMs = clamp(Number(refs.xfadeInput.value) || 0, 0, 80);
    markSessionDirty();
    updateReadouts();
  });

  refs.renderBtn.addEventListener("click", () => void renderOutput());
  refs.playBtn.addEventListener("click", () => {
    if (state.preview.playing || runtime.previewSource) stopPreview();
    else void playPreview();
  });
  refs.loopBtn.addEventListener("click", () => {
    state.preview.loop = !state.preview.loop;
    if (runtime.previewSource) runtime.previewSource.loop = state.preview.loop;
    markSessionDirty();
    updateReadouts();
  });
  refs.saveBtn.addEventListener("click", () => void saveOutput());
  refs.sendBtn.addEventListener("click", () => void sendToLazy());

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
    if (data.type === "PATHS_BROADCAST") {
      runtime.paths = data?.payload || null;
      return;
    }
    if (data.type === "SESSION_EXPORT_REQ") {
      const includeOnlyDirty = data?.payload?.includeOnlyDirty !== false;
      const chunk = await exportSessionChunk(includeOnlyDirty);
      window.parent?.postMessage(
        {
          type: "SESSION_EXPORT_RES",
          version: 1,
          payload: { moduleId: "testmodule", schemaVersion: 1, dirty: Boolean(runtime.sessionDirty), chunk },
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

function init() {
  window.parent?.postMessage({ type: "PATHS_REQ", version: 1 }, "*");
  installTactileButtons(document);
  syncControlsFromState();
  renderSlots();
  bindEvents();
  drawWave();
}

init();
