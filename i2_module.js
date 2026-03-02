const MIDI_NOTES = [
  { name: "C3", midi: 48 },
  { name: "C#3", midi: 49 },
  { name: "D3", midi: 50 },
  { name: "D#3", midi: 51 },
  { name: "E3", midi: 52 },
  { name: "F3", midi: 53 },
  { name: "F#3", midi: 54 },
  { name: "G3", midi: 55 },
  { name: "G#3", midi: 56 },
  { name: "A3", midi: 57 },
  { name: "A#3", midi: 58 },
  { name: "B3", midi: 59 },
];

const PRESETS = [
  { id: "shred_cutup", name: "SHRED CUTUP", time: { sizeMs: 35, amount: 85, seam: "hard", chaos: 65 }, spec: { enabled: false } },
  { id: "glue_glitch", name: "GLUE GLITCH", time: { sizeMs: 60, amount: 70, seam: "fade", chaos: 40 }, spec: { enabled: false } },
  { id: "smear_cloud", name: "SMEAR CLOUD", time: { sizeMs: 18, amount: 95, seam: "smear", chaos: 30 }, spec: { enabled: false } },
  { id: "alien_patch", name: "ALIEN PATCH", time: { sizeMs: 90, amount: 55, seam: "fade", chaos: 25 }, spec: { enabled: true, resolution: "mid", bands: 8, shift: 45, patch: 55, phase: "rotate", smooth: 30 } },
  { id: "phase_worm", name: "PHASE WORM", time: { sizeMs: 45, amount: 65, seam: "fade", chaos: 35 }, spec: { enabled: true, resolution: "mid", bands: 16, shift: 20, patch: 35, phase: "random", smooth: 15 } },
  { id: "harmonic_broken", name: "HARMONIC BROKEN", time: { sizeMs: 120, amount: 40, seam: "fade", chaos: 15 }, spec: { enabled: true, resolution: "mid", bands: 4, shift: 12, patch: 25, phase: "rotate", smooth: 45 } },
];

const refs = {
  recBtn: document.getElementById("recBtn"),
  stopRecBtn: document.getElementById("stopRecBtn"),
  recRefreshBtn: document.getElementById("recRefreshBtn"),
  recInputSelect: document.getElementById("recInputSelect"),
  recDeviceInfo: document.getElementById("recDeviceInfo"),
  recProgress: document.getElementById("recProgress"),
  recMeterFill: document.getElementById("recMeterFill"),
  dupMonoBtn: document.getElementById("dupMonoBtn"),
  loadBtn: document.getElementById("loadBtn"),
  loadInput: document.getElementById("loadInput"),
  sourceInfo: document.getElementById("sourceInfo"),
  waveCycleBtn: document.getElementById("waveCycleBtn"),
  pitchCycleBtn: document.getElementById("pitchCycleBtn"),
  cyclesCycleBtn: document.getElementById("cyclesCycleBtn"),
  dutyCycleBtn: document.getElementById("dutyCycleBtn"),
  genBtn: document.getElementById("genBtn"),
  clickBtn: document.getElementById("clickBtn"),
  stereoLinkBtn: document.getElementById("stereoLinkBtn"),
  presetSelect: document.getElementById("presetSelect"),
  applyPresetBtn: document.getElementById("applyPresetBtn"),
  savePresetBtn: document.getElementById("savePresetBtn"),
  loadPresetBtn: document.getElementById("loadPresetBtn"),
  loadPresetInput: document.getElementById("loadPresetInput"),
  status: document.getElementById("status"),
  sizeMs: document.getElementById("sizeMs"),
  amount: document.getElementById("amount"),
  seam: document.getElementById("seam"),
  chaos: document.getElementById("chaos"),
  seed: document.getElementById("seed"),
  reseedBtn: document.getElementById("reseedBtn"),
  specToggleBtn: document.getElementById("specToggleBtn"),
  resolution: document.getElementById("resolution"),
  bands: document.getElementById("bands"),
  shift: document.getElementById("shift"),
  patch: document.getElementById("patch"),
  phase: document.getElementById("phase"),
  smooth: document.getElementById("smooth"),
  renderBtn: document.getElementById("renderBtn"),
  undoRenderBtn: document.getElementById("undoRenderBtn"),
  renderInfo: document.getElementById("renderInfo"),
  waveCanvas: document.getElementById("waveCanvas"),
  playBtn: document.getElementById("playBtn"),
  loopBtn: document.getElementById("loopBtn"),
  saveRawBtn: document.getElementById("saveRawBtn"),
  saveOutBtn: document.getElementById("saveOutBtn"),
  sendLazyBtn: document.getElementById("sendLazyBtn"),
  sendTarget: document.getElementById("sendTarget"),
  slotBtns: [0, 1, 2, 3].map((i) => document.getElementById(`slotBtn${i}`)),
  slotMetas: [0, 1, 2, 3].map((i) => document.getElementById(`slotMeta${i}`)),
  slotFullModal: document.getElementById("slotFullModal"),
  slotFullModalText: document.getElementById("slotFullModalText"),
  slotFullSaveBtn: document.getElementById("slotFullSaveBtn"),
  slotFullOverwriteBtn: document.getElementById("slotFullOverwriteBtn"),
  slotFullCancelBtn: document.getElementById("slotFullCancelBtn"),
};

function createEmptySlot() {
  return {
    source: { type: "none", name: "NONE" },
    raw: null,
    out: null,
    prevOut: null,
    prevOutWasSet: false,
  };
}

const state = {
  activeSlot: 0,
  slots: [createEmptySlot(), createEmptySlot(), createEmptySlot(), createEmptySlot()],
  gen: { wave: "sine", pitchMidi: 48, cycles: 2, duty: 0.5, amp: 0.8 },
  click: { lengthMs: 3, amp: 0.9 },
  rec: { recording: false, maxSec: 8, duplicateMono: true, selectedDeviceId: null, devices: [], permission: "unknown", selectedMissing: false },
  stereo: { channelsPreferred: 2, link: true, unlinkAmount: 0 },
  time: { sizeMs: 60, amount: 70, seam: "fade", chaos: 40, seed: 1337 },
  spec: { enabled: false, resolution: "mid", bands: 8, shift: 35, patch: 40, phase: "off", smooth: 25 },
  preview: { playing: false, loop: false },
};

const runtime = {
  audioContext: null,
  stream: null,
  recorder: null,
  recordChunks: [],
  recMimeType: "",
  recMeterSource: null,
  recMeterAnalyser: null,
  recMeterData: null,
  recMeterRaf: null,
  recStartMs: 0,
  recTimer: null,
  previewSource: null,
  previewAnalyser: null,
  previewMeterData: null,
  previewMeterRaf: null,
  previewOffsetSec: 0,
  previewStartOffsetSec: 0,
  previewStartedAtCtxSec: 0,
  previewDurationSec: 0,
  lastClipAck: null,
  undoStack: [],
  slotModalResolver: null,
  midiMapMode: false,
  midiLastTrigger: {},
  previewPlayToken: null,
  paths: null,
  recDeviceChangeCleanup: null,
  sessionDirty: false,
  renderSaveSeqByKey: {},
  render: {
    busy: false,
    tempExists: false,
    tempPath: null,
    outBuffer: null,
    lastError: null,
  },
};

const REC_DEVICE_STORAGE_KEY = "denarrator.rec.device.i2";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function setStatus(text, isError = false) {
  refs.status.textContent = text;
  refs.status.classList.toggle("error", isError);
}

function markSessionDirty() {
  runtime.sessionDirty = true;
}

function globalPlayStart(sourceLabel) {
  const token = `i2_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    window.parent?.postMessage(
      {
        type: "GLOBAL_PLAY_START",
        version: 1,
        payload: { token, moduleId: "i2", source: sourceLabel },
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
    { id: "i2.time.size", label: "i2 Size", kind: "continuous", default: 0.2 },
    { id: "i2.time.amount", label: "i2 Amount", kind: "continuous", default: 0.7 },
    { id: "i2.time.chaos", label: "i2 Chaos", kind: "continuous", default: 0.4 },
    { id: "i2.spec.patch", label: "i2 Spec Patch", kind: "continuous", default: 0.4 },
    { id: "i2.spec.smooth", label: "i2 Spec Smooth", kind: "continuous", default: 0.25 },
    { id: "i2.action.reseed", label: "i2 Reseed", kind: "trigger", default: 0 },
    { id: "i2.action.render", label: "i2 Render", kind: "trigger", default: 0 },
  ];
  try {
    window.parent?.postMessage(
      {
        type: "MIDI_TARGETS_REGISTER",
        version: 1,
        moduleId: "i2",
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
  if (targetId === "i2.time.size") {
    refs.sizeMs.value = String(Math.round(5 + v * 495));
    return;
  }
  if (targetId === "i2.time.amount") {
    refs.amount.value = String(Math.round(v * 100));
    return;
  }
  if (targetId === "i2.time.chaos") {
    refs.chaos.value = String(Math.round(v * 100));
    return;
  }
  if (targetId === "i2.spec.patch") {
    refs.patch.value = String(Math.round(v * 100));
    return;
  }
  if (targetId === "i2.spec.smooth") {
    refs.smooth.value = String(Math.round(v * 100));
    return;
  }
  if (targetId === "i2.action.reseed" || targetId === "i2.action.render") {
    const prev = Boolean(runtime.midiLastTrigger[targetId]);
    const next = v >= 0.5;
    runtime.midiLastTrigger[targetId] = next;
    if (!prev && next) {
      if (targetId === "i2.action.reseed") {
        refs.seed.value = String((Math.random() * 0xffffffff) >>> 0);
      } else {
        renderOffline();
      }
    }
  }
}

function setRecMeter(level) {
  const pct = Math.round(clamp(level, 0, 1) * 100);
  if (refs.recMeterFill) refs.recMeterFill.style.width = `${pct}%`;
}

function readStoredRecDeviceId() {
  try {
    return localStorage.getItem(REC_DEVICE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredRecDeviceId(deviceId) {
  try {
    if (deviceId) localStorage.setItem(REC_DEVICE_STORAGE_KEY, deviceId);
    else localStorage.removeItem(REC_DEVICE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function ensureAudioContext() {
  if (!runtime.audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    runtime.audioContext = new Ctor();
  }
  return runtime.audioContext;
}

function requestUserMediaCompat(constraints) {
  const modern = navigator?.mediaDevices?.getUserMedia;
  if (typeof modern === "function") {
    return modern.call(navigator.mediaDevices, constraints);
  }
  try {
    const parentModern = window.parent?.navigator?.mediaDevices?.getUserMedia;
    if (typeof parentModern === "function") {
      return parentModern.call(window.parent.navigator.mediaDevices, constraints);
    }
  } catch {
    // Parent access can fail in restricted contexts.
  }
  const legacy = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  if (typeof legacy === "function") {
    return new Promise((resolve, reject) => {
      legacy.call(navigator, constraints, resolve, reject);
    });
  }
  try {
    const parentLegacy =
      window.parent?.navigator?.getUserMedia ||
      window.parent?.navigator?.webkitGetUserMedia ||
      window.parent?.navigator?.mozGetUserMedia;
    if (typeof parentLegacy === "function") {
      return new Promise((resolve, reject) => {
        parentLegacy.call(window.parent.navigator, constraints, resolve, reject);
      });
    }
  } catch {
    // Parent access can fail in restricted contexts.
  }
  return Promise.reject(new Error("getUserMedia API unavailable in this webview"));
}

function getMediaDevicesApi() {
  if (navigator?.mediaDevices) return navigator.mediaDevices;
  try {
    if (window.parent?.navigator?.mediaDevices) return window.parent.navigator.mediaDevices;
  } catch {
    // Parent access can fail in restricted contexts.
  }
  return null;
}

async function enumerateAudioInputDevicesCompat() {
  const mediaDevices = getMediaDevicesApi();
  if (!mediaDevices || typeof mediaDevices.enumerateDevices !== "function") return [];
  return mediaDevices.enumerateDevices();
}

function updateRecDeviceInfoLine() {
  if (!refs.recDeviceInfo) return;
  if (state.rec.permission === "denied") {
    refs.recDeviceInfo.textContent = "ALLOW MICROPHONE";
    return;
  }
  if (!state.rec.devices.length) {
    refs.recDeviceInfo.textContent = "NO AUDIO INPUTS FOUND";
    return;
  }
  if (state.rec.selectedMissing) {
    refs.recDeviceInfo.textContent = "DEVICE NOT FOUND, USING DEFAULT";
    return;
  }
  const selected = state.rec.devices.find((d) => d.deviceId === state.rec.selectedDeviceId);
  refs.recDeviceInfo.textContent = selected ? `INPUT: ${selected.label}` : "INPUT: DEFAULT";
}

function populateRecInputSelect() {
  if (!refs.recInputSelect) return;
  refs.recInputSelect.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "DEFAULT INPUT";
  refs.recInputSelect.appendChild(defaultOption);
  for (const device of state.rec.devices) {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || "(microphone)";
    refs.recInputSelect.appendChild(option);
  }
  refs.recInputSelect.value = state.rec.selectedDeviceId || "";
  if (refs.recInputSelect.value !== (state.rec.selectedDeviceId || "")) {
    refs.recInputSelect.value = "";
  }
  refs.recInputSelect.disabled = state.rec.recording || !state.rec.devices.length;
}

async function refreshRecDevices({ askPermission = false } = {}) {
  const mediaDevices = getMediaDevicesApi();
  const hasMediaApi =
    !!mediaDevices &&
    typeof mediaDevices.getUserMedia === "function" &&
    typeof mediaDevices.enumerateDevices === "function";
  if (!hasMediaApi) {
    state.rec.permission = "denied";
    state.rec.devices = [];
    state.rec.selectedDeviceId = null;
    state.rec.selectedMissing = false;
    populateRecInputSelect();
    updateRecDeviceInfoLine();
    return;
  }
  if (askPermission) {
    try {
      const probe = await requestUserMediaCompat({ audio: true });
      probe.getTracks().forEach((track) => track.stop());
      state.rec.permission = "granted";
    } catch {
      state.rec.permission = "denied";
    }
  }
  const devices = await enumerateAudioInputDevicesCompat();
  state.rec.devices = (devices || [])
    .filter((d) => d.kind === "audioinput")
    .map((d, index) => ({
      deviceId: d.deviceId,
      label: d.label || `INPUT ${index + 1}`,
      groupId: d.groupId || null,
    }));
  if (state.rec.permission !== "denied") {
    state.rec.permission = "granted";
  }
  const stored = state.rec.selectedDeviceId || readStoredRecDeviceId();
  if (stored && state.rec.devices.some((d) => d.deviceId === stored)) {
    state.rec.selectedDeviceId = stored;
    state.rec.selectedMissing = false;
  } else if (stored) {
    state.rec.selectedDeviceId = null;
    state.rec.selectedMissing = true;
    writeStoredRecDeviceId(null);
  } else {
    state.rec.selectedMissing = false;
  }
  populateRecInputSelect();
  updateRecDeviceInfoLine();
}

async function getRecordingStreamForSelectedDevice() {
  const baseAudio = {
    channelCount: state.stereo.channelsPreferred,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  };
  const selectedId = state.rec.selectedDeviceId;
  if (selectedId && state.rec.devices.some((d) => d.deviceId === selectedId)) {
    try {
      return await requestUserMediaCompat({
        audio: { ...baseAudio, deviceId: { exact: selectedId } },
      });
    } catch {
      state.rec.selectedDeviceId = null;
      state.rec.selectedMissing = true;
      writeStoredRecDeviceId(null);
      populateRecInputSelect();
      updateRecDeviceInfoLine();
      setStatus("DEVICE NOT FOUND, USING DEFAULT");
    }
  }
  return requestUserMediaCompat({ audio: baseAudio });
}

function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function createRng(seedInt) {
  let a = (seedInt >>> 0) || 1;
  return function rand() {
    a ^= a << 13;
    a ^= a >>> 17;
    a ^= a << 5;
    return ((a >>> 0) & 0xffffffff) / 0x100000000;
  };
}

function copyBufferData(buf) {
  return {
    sr: buf.sr,
    channels: buf.channels,
    frames: buf.frames,
    durationSec: buf.frames / buf.sr,
    data: buf.data.map((ch) => new Float32Array(ch)),
  };
}

function getSlot(index = state.activeSlot) {
  return state.slots[clamp(index, 0, state.slots.length - 1)];
}

function cloneSlot(slot) {
  return {
    source: { ...slot.source },
    raw: slot.raw ? copyBufferData(slot.raw) : null,
    out: slot.out ? copyBufferData(slot.out) : null,
    prevOut: slot.prevOut ? copyBufferData(slot.prevOut) : null,
    prevOutWasSet: Boolean(slot.prevOutWasSet),
  };
}

function snapshotState() {
  return {
    activeSlot: state.activeSlot,
    slots: state.slots.map((slot) => cloneSlot(slot)),
  };
}

function restoreSnapshot(snapshot) {
  state.activeSlot = clamp(Number(snapshot?.activeSlot) || 0, 0, state.slots.length - 1);
  if (Array.isArray(snapshot?.slots) && snapshot.slots.length === state.slots.length) {
    state.slots = snapshot.slots.map((slot) => cloneSlot(slot));
  }
  stopPreview();
  refs.renderInfo.textContent = "TEMP READY (UNDO)";
  updateButtons();
  drawWaveform();
}

function pushUndoSnapshot() {
  runtime.undoStack.push(snapshotState());
  if (runtime.undoStack.length > 10) {
    runtime.undoStack.splice(0, runtime.undoStack.length - 10);
  }
}

function undoStep() {
  const snapshot = runtime.undoStack.pop();
  if (!snapshot) {
    setStatus("NOTHING TO UNDO", true);
    return;
  }
  restoreSnapshot(snapshot);
  setStatus("UNDO");
}

function sanitizeName(name) {
  return String(name || "clip")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .replace(/^\.+/, "")
    .slice(0, 80) || "clip";
}

function bufferToAudioBuffer(canonical) {
  const ctx = ensureAudioContext();
  const audioBuffer = ctx.createBuffer(canonical.channels, canonical.frames, canonical.sr);
  for (let c = 0; c < canonical.channels; c += 1) {
    audioBuffer.copyToChannel(canonical.data[c], c, 0);
  }
  return audioBuffer;
}

function audioBufferToCanonical(decoded, sourceName = "LOAD") {
  let channels = Math.min(2, decoded.numberOfChannels);
  const data = [];
  if (channels === 1 && state.rec.duplicateMono) {
    const mono = new Float32Array(decoded.getChannelData(0));
    data.push(mono);
    data.push(new Float32Array(mono));
    channels = 2;
  } else {
    for (let c = 0; c < channels; c += 1) {
      data.push(new Float32Array(decoded.getChannelData(c)));
    }
  }
  return {
    sr: decoded.sampleRate,
    channels,
    frames: decoded.length,
    durationSec: decoded.length / decoded.sampleRate,
    data,
    name: sourceName,
  };
}

function setActiveSlot(index) {
  const next = clamp(Number(index) || 0, 0, state.slots.length - 1);
  if (next === state.activeSlot) return;
  stopPreview();
  state.activeSlot = next;
  updateButtons();
  drawWaveform();
  setStatus(`ACTIVE SLOT ${next + 1}`);
}

function slotHasContent(slot) {
  return Boolean(slot?.raw || slot?.out);
}

function findFirstEmptySlotIndex() {
  for (let i = 0; i < state.slots.length; i += 1) {
    if (!slotHasContent(state.slots[i])) return i;
  }
  return -1;
}

function openSlotFullModal() {
  if (!refs.slotFullModal) return Promise.resolve("overwrite");
  refs.slotFullModal.classList.add("open");
  refs.slotFullModalText.textContent = "All 4 slots are occupied. Overwrite SLOT 1 or save SLOT 1 before overwriting.";
  return new Promise((resolve) => {
    runtime.slotModalResolver = resolve;
  });
}

function resolveSlotFullModal(choice) {
  if (refs.slotFullModal) refs.slotFullModal.classList.remove("open");
  const resolver = runtime.slotModalResolver;
  runtime.slotModalResolver = null;
  if (resolver) resolver(choice);
}

async function saveSlotPreviewBuffer(slotIndex) {
  const slot = getSlot(slotIndex);
  const src = slot.out || slot.raw;
  if (!src) {
    setStatus(`SLOT ${slotIndex + 1} EMPTY`, true);
    return false;
  }
  const blob = encodeWav(src.data, src.sr);
  const name = sanitizeName(slot.source.name || "i2") + `_s${slotIndex + 1}_backup.wav`;
  const result = await saveBlob(blob, name);
  if (result === "cancelled") {
    setStatus("SAVE CANCELLED", true);
    return false;
  }
  return true;
}

async function pickRecordingTargetSlot() {
  const emptyIndex = findFirstEmptySlotIndex();
  if (emptyIndex >= 0) return emptyIndex;
  const choice = await openSlotFullModal();
  if (choice === "cancel") return -1;
  if (choice === "save") {
    const ok = await saveSlotPreviewBuffer(0);
    if (!ok) return -1;
  }
  return 0;
}

async function assignIncomingBufferToNextSlot(canonical, sourceType, sourceName, statusLabel) {
  const targetSlot = await pickRecordingTargetSlot();
  if (targetSlot < 0) {
    setStatus(`${statusLabel} CANCELLED`);
    return false;
  }
  pushUndoSnapshot();
  const slot = getSlot(targetSlot);
  slot.raw = canonical;
  slot.out = null;
  slot.source = { type: sourceType, name: sourceName };
  slot.prevOut = null;
  slot.prevOutWasSet = false;
  state.activeSlot = targetSlot;
  refs.renderInfo.textContent = "TEMP: NONE";
  runtime.render.tempExists = false;
  runtime.render.outBuffer = null;
  runtime.render.lastError = null;
  setStatus(`${statusLabel} READY S${targetSlot + 1}${canonical?.durationSec ? ` (${canonical.durationSec.toFixed(2)}s, ${canonical.channels}ch)` : ""}`);
  drawWaveform();
  updateButtons();
  markSessionDirty();
  return true;
}

function updateButtons() {
  const active = getSlot();
  const hasRaw = Boolean(active.raw);
  const hasOut = Boolean(active.out);
  const hasPreview = hasOut || hasRaw;
  refs.saveRawBtn.disabled = !hasRaw;
  refs.saveOutBtn.disabled = !hasOut;
  refs.sendLazyBtn.disabled = !hasOut || runtime.render.busy;
  refs.renderBtn.disabled = !hasRaw || runtime.render.busy;
  refs.playBtn.disabled = !hasPreview || runtime.render.busy;
  refs.stopRecBtn.disabled = !state.rec.recording;
  refs.recBtn.setAttribute("aria-pressed", String(state.rec.recording));
  refs.dupMonoBtn.setAttribute("aria-pressed", String(state.rec.duplicateMono));
  refs.specToggleBtn.setAttribute("aria-pressed", String(state.spec.enabled));
  refs.specToggleBtn.textContent = state.spec.enabled ? "SPEC ON" : "SPEC OFF";
  refs.loopBtn.checked = Boolean(state.preview.loop);
  refs.playBtn?.setAttribute("aria-pressed", String(state.preview.playing));
  if (refs.playBtn) refs.playBtn.textContent = state.preview.playing ? "PAUSE" : "PLAY";
  refs.stereoLinkBtn.setAttribute("aria-pressed", String(state.stereo.link));
  refs.stereoLinkBtn.textContent = state.stereo.link ? "ON" : "OFF";
  refs.waveCycleBtn.textContent = `WAVE ${state.gen.wave.toUpperCase()}`;
  refs.cyclesCycleBtn.textContent = `CYCLES ${state.gen.cycles}`;
  const note = MIDI_NOTES.find((n) => n.midi === state.gen.pitchMidi);
  refs.pitchCycleBtn.textContent = `PITCH ${note ? note.name : state.gen.pitchMidi}`;
  refs.dutyCycleBtn.textContent = `DUTY ${Math.round(state.gen.duty * 100)}%`;
  refs.sourceInfo.textContent = `SLOT ${state.activeSlot + 1} SOURCE: ${active.source.type.toUpperCase()}${active.source.name ? ` (${active.source.name})` : ""}`;
  if (refs.recRefreshBtn) refs.recRefreshBtn.disabled = state.rec.recording;
  if (refs.recInputSelect) refs.recInputSelect.disabled = state.rec.recording || !state.rec.devices.length;
  updateRecDeviceInfoLine();
  for (let i = 0; i < refs.slotBtns.length; i += 1) {
    const slot = state.slots[i];
    refs.slotBtns[i]?.setAttribute("aria-pressed", String(i === state.activeSlot));
    if (refs.slotMetas[i]) {
      if (slot.out) {
        refs.slotMetas[i].textContent = `${slot.source.name || "CLIP"} | OUT`;
      } else if (slot.raw) {
        refs.slotMetas[i].textContent = `${slot.source.name || "CLIP"} | RAW`;
      } else {
        refs.slotMetas[i].textContent = "EMPTY";
      }
    }
  }
}

function startRecMeter(stream) {
  stopRecMeter();
  const ctx = ensureAudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.78;
  const data = new Uint8Array(analyser.fftSize);
  source.connect(analyser);
  runtime.recMeterSource = source;
  runtime.recMeterAnalyser = analyser;
  runtime.recMeterData = data;

  function tick() {
    if (!runtime.recMeterAnalyser || !runtime.recMeterData) return;
    runtime.recMeterAnalyser.getByteTimeDomainData(runtime.recMeterData);
    let peak = 0;
    for (let i = 0; i < runtime.recMeterData.length; i += 1) {
      const v = Math.abs((runtime.recMeterData[i] - 128) / 128);
      if (v > peak) peak = v;
    }
    setRecMeter(Math.pow(clamp(peak * 1.9, 0, 1), 0.72));
    runtime.recMeterRaf = requestAnimationFrame(tick);
  }
  runtime.recMeterRaf = requestAnimationFrame(tick);
}

function stopRecMeter() {
  if (runtime.recMeterRaf) {
    cancelAnimationFrame(runtime.recMeterRaf);
    runtime.recMeterRaf = null;
  }
  try {
    runtime.recMeterSource?.disconnect();
  } catch {
    // noop
  }
  try {
    runtime.recMeterAnalyser?.disconnect();
  } catch {
    // noop
  }
  runtime.recMeterSource = null;
  runtime.recMeterAnalyser = null;
  runtime.recMeterData = null;
  setRecMeter(0);
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
  const active = getSlot();
  const src = active.out || active.raw;
  if (!src) return;
  const mono = new Float32Array(src.frames);
  for (let c = 0; c < src.channels; c += 1) {
    const ch = src.data[c];
    for (let i = 0; i < src.frames; i += 1) mono[i] += ch[i];
  }
  for (let i = 0; i < src.frames; i += 1) mono[i] /= src.channels;

  ctx.strokeStyle = "#2f3132";
  ctx.lineWidth = Math.max(1, Math.floor(dpr));
  ctx.beginPath();
  for (let x = 0; x < w; x += 1) {
    const i = Math.floor((x / Math.max(1, w - 1)) * (mono.length - 1));
    const y = (0.5 - mono[i] * 0.42) * h;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const durationSec = src.frames / Math.max(1, src.sr);
  let playheadSec = clamp(Number(runtime.previewOffsetSec) || 0, 0, Math.max(0, durationSec));
  if (state.preview.playing && runtime.audioContext && runtime.previewSource && durationSec > 0) {
    const elapsed = Math.max(0, runtime.audioContext.currentTime - runtime.previewStartedAtCtxSec);
    let at = runtime.previewStartOffsetSec + elapsed;
    if (state.preview.loop) at %= durationSec;
    else at = Math.min(durationSec, at);
    playheadSec = clamp(at, 0, durationSec);
  }
  const x = clamp(Math.round((playheadSec / Math.max(durationSec, 1e-6)) * (w - 1)), 0, Math.max(0, w - 1));
  ctx.strokeStyle = "rgba(138,58,45,0.92)";
  ctx.lineWidth = Math.max(1, Math.round(dpr * 1.5));
  ctx.beginPath();
  ctx.moveTo(x + 0.5, 0);
  ctx.lineTo(x + 0.5, h);
  ctx.stroke();
}

async function startRecording() {
  if (state.rec.recording) return;
  try {
    const ctx = ensureAudioContext();
    await ctx.resume();
    const stream = await getRecordingStreamForSelectedDevice();
    const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    let mimeType = "";
    for (const cand of mimeCandidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(cand)) {
        mimeType = cand;
        break;
      }
    }
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    runtime.stream = stream;
    runtime.recorder = recorder;
    runtime.recordChunks = [];
    runtime.recMimeType = mimeType || recorder.mimeType || "audio/webm";
    runtime.recStartMs = Date.now();
    startRecMeter(stream);
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        runtime.recordChunks.push(event.data);
      }
    };

    recorder.start(120);

    state.rec.recording = true;
    updateButtons();
    setStatus("REC ON");

    runtime.recTimer = window.setInterval(() => {
      const elapsed = (Date.now() - runtime.recStartMs) / 1000;
      const ratio = clamp(elapsed / state.rec.maxSec, 0, 1);
      refs.recProgress.style.width = `${Math.round(ratio * 100)}%`;
      if (elapsed >= state.rec.maxSec + 0.2) {
        void stopRecording();
      }
    }, 80);
  } catch (error) {
    setStatus(`REC FAILED: ${String(error?.message || error)}`, true);
  }
}

async function stopRecording() {
  if (!state.rec.recording) return;
  state.rec.recording = false;
  updateButtons();

  if (runtime.recTimer) {
    clearInterval(runtime.recTimer);
    runtime.recTimer = null;
  }

  if (runtime.recorder && runtime.recorder.state !== "inactive") {
    await new Promise((resolve) => {
      runtime.recorder.addEventListener("stop", resolve, { once: true });
      runtime.recorder.stop();
    });
  }

  if (runtime.stream) {
    for (const track of runtime.stream.getTracks()) track.stop();
  }
  stopRecMeter();

  const ctx = ensureAudioContext();
  const recBlob = new Blob(runtime.recordChunks, { type: runtime.recMimeType || "audio/webm" });
  if (!recBlob.size) {
    refs.recProgress.style.width = "0%";
    runtime.stream = null;
    runtime.recorder = null;
    runtime.recordChunks = [];
    setStatus("REC EMPTY", true);
    return;
  }
  let decoded;
  try {
    decoded = await ctx.decodeAudioData((await recBlob.arrayBuffer()).slice(0));
  } catch (error) {
    refs.recProgress.style.width = "0%";
    runtime.stream = null;
    runtime.recorder = null;
    runtime.recordChunks = [];
    setStatus(`REC DECODE FAILED: ${String(error?.message || error)}`, true);
    return;
  }
  const canonical = audioBufferToCanonical(decoded, "REC_8S");
  const assigned = await assignIncomingBufferToNextSlot(canonical, "rec", "REC_8S", "REC");
  if (!assigned) {
    refs.recProgress.style.width = "0%";
    runtime.stream = null;
    runtime.recorder = null;
    runtime.recordChunks = [];
    runtime.recMimeType = "";
    return;
  }
  refs.recProgress.style.width = "0%";

  runtime.stream = null;
  runtime.recorder = null;
  runtime.recordChunks = [];
  runtime.recMimeType = "";
}

function capturePresetPayload() {
  return {
    version: 1,
    module: "i2minus1",
    savedAt: new Date().toISOString(),
    stereo: {
      channelsPreferred: state.stereo.channelsPreferred,
      link: state.stereo.link,
      unlinkAmount: state.stereo.unlinkAmount,
    },
    rec: {
      maxSec: state.rec.maxSec,
      duplicateMono: state.rec.duplicateMono,
    },
    gen: {
      wave: state.gen.wave,
      pitchMidi: state.gen.pitchMidi,
      cycles: state.gen.cycles,
      duty: state.gen.duty,
      amp: state.gen.amp,
    },
    time: {
      sizeMs: Number(refs.sizeMs.value),
      amount: Number(refs.amount.value),
      seam: refs.seam.value,
      chaos: Number(refs.chaos.value),
      seed: Number(refs.seed.value) || 1337,
    },
    spec: {
      enabled: state.spec.enabled,
      resolution: refs.resolution.value,
      bands: Number(refs.bands.value),
      shift: Number(refs.shift.value),
      patch: Number(refs.patch.value),
      phase: refs.phase.value,
      smooth: Number(refs.smooth.value),
    },
  };
}

async function savePreset() {
  const payload = capturePresetPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const invoke = getInvoke();
  let result = "cancelled";
  if (invoke) {
    try {
      const savePath = await invoke("dialog_save_file", {
        defaultDir: runtime.paths?.presets || null,
        suggestedName: `i2minus1-preset-${ts}.non`,
        filters: [{ name: "Preset", extensions: ["non", "json"] }],
        dialogKey: "i2.savePreset",
      });
      if (savePath) {
        const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
        await invoke("save_blob_to_path", { dataBase64, path: savePath });
        result = "saved";
      }
    } catch {
      result = await saveBlob(blob, `i2minus1-preset-${ts}.non`);
    }
  } else {
    result = await saveBlob(blob, `i2minus1-preset-${ts}.non`);
  }
  if (result === "cancelled") {
    setStatus("PRESET SAVE CANCELLED", true);
    return;
  }
  setStatus("PRESET SAVED");
}

function readI2PresetFromObject(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  if (parsed.module === "i2minus1") return parsed;
  if (parsed.i2minus1 && typeof parsed.i2minus1 === "object") return parsed.i2minus1;
  if (parsed.modules?.i2minus1 && typeof parsed.modules.i2minus1 === "object") return parsed.modules.i2minus1;
  return null;
}

function applyLoadedPreset(preset) {
  if (!preset) return;
  if (preset.stereo && typeof preset.stereo === "object") {
    if (typeof preset.stereo.link === "boolean") state.stereo.link = preset.stereo.link;
  }
  if (preset.rec && typeof preset.rec === "object") {
    if (typeof preset.rec.duplicateMono === "boolean") state.rec.duplicateMono = preset.rec.duplicateMono;
  }
  if (preset.gen && typeof preset.gen === "object") {
    if (typeof preset.gen.wave === "string") state.gen.wave = preset.gen.wave;
    if (Number.isFinite(preset.gen.pitchMidi)) state.gen.pitchMidi = clamp(Number(preset.gen.pitchMidi), 48, 59);
    if (Number.isFinite(preset.gen.cycles)) state.gen.cycles = [1, 2, 4, 8].includes(Number(preset.gen.cycles)) ? Number(preset.gen.cycles) : 2;
    if (Number.isFinite(preset.gen.duty)) state.gen.duty = [0.125, 0.25, 0.5, 0.75].includes(Number(preset.gen.duty)) ? Number(preset.gen.duty) : 0.5;
  }
  if (preset.time && typeof preset.time === "object") {
    if (Number.isFinite(preset.time.sizeMs)) refs.sizeMs.value = String(clamp(Number(preset.time.sizeMs), 5, 500));
    if (Number.isFinite(preset.time.amount)) refs.amount.value = String(clamp(Number(preset.time.amount), 0, 100));
    if (typeof preset.time.seam === "string") refs.seam.value = preset.time.seam;
    if (Number.isFinite(preset.time.chaos)) refs.chaos.value = String(clamp(Number(preset.time.chaos), 0, 100));
    if (Number.isFinite(preset.time.seed)) refs.seed.value = String((Number(preset.time.seed) >>> 0));
  }
  if (preset.spec && typeof preset.spec === "object") {
    if (typeof preset.spec.enabled === "boolean") state.spec.enabled = preset.spec.enabled;
    if (typeof preset.spec.resolution === "string") refs.resolution.value = preset.spec.resolution;
    if (Number.isFinite(preset.spec.bands)) refs.bands.value = String(clamp(Number(preset.spec.bands), 4, 16));
    if (Number.isFinite(preset.spec.shift)) refs.shift.value = String(clamp(Number(preset.spec.shift), 0, 100));
    if (Number.isFinite(preset.spec.patch)) refs.patch.value = String(clamp(Number(preset.spec.patch), 0, 100));
    if (typeof preset.spec.phase === "string") refs.phase.value = preset.spec.phase;
    if (Number.isFinite(preset.spec.smooth)) refs.smooth.value = String(clamp(Number(preset.spec.smooth), 0, 100));
  }
  updateButtons();
}

async function loadPresetFromFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const preset = readI2PresetFromObject(parsed);
  if (!preset) {
    throw new Error("No i2 preset block found");
  }
  applyLoadedPreset(preset);
  setStatus("PRESET LOADED");
}

async function loadAudioFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  return loadAudioArrayBuffer(arrayBuffer, file.name);
}

async function loadAudioArrayBuffer(arrayBuffer, fileName = "audio.wav") {
  const ctx = ensureAudioContext();
  const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
  const canonical = audioBufferToCanonical(decoded, fileName);
  const ok = await assignIncomingBufferToNextSlot(canonical, "load", fileName, "LOAD");
  if (!ok) return false;
  setStatus(`LOADED ${fileName} -> S${state.activeSlot + 1}`);
  return true;
}

function generateWaveSample(wave, phase01, duty) {
  const x = phase01;
  if (wave === "sine") return Math.sin(2 * Math.PI * x);
  if (wave === "tri") return 1 - 4 * Math.abs(Math.round(x - 0.25) - (x - 0.25));
  if (wave === "saw") return 2 * (x - Math.floor(x + 0.5));
  if (wave === "square") return Math.sin(2 * Math.PI * x) >= 0 ? 1 : -1;
  if (wave === "pulse") return x < duty ? 1 : -1;
  return 0;
}

async function generateToneBuffer() {
  const sr = ensureAudioContext().sampleRate;
  const hz = midiToHz(state.gen.pitchMidi);
  const frames = clamp(Math.round((state.gen.cycles / hz) * sr), 64, sr * 2);
  const chL = new Float32Array(frames);
  const chR = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) {
    const ph = i / frames;
    const s = generateWaveSample(state.gen.wave, ph * state.gen.cycles, state.gen.duty) * state.gen.amp;
    chL[i] = s;
    chR[i] = s;
  }
  const fade = Math.max(1, Math.floor(sr * 0.001));
  for (let i = 0; i < fade; i += 1) {
    const g = i / fade;
    const r = frames - 1 - i;
    chL[i] *= g; chR[i] *= g;
    chL[r] *= g; chR[r] *= g;
  }
  await assignIncomingBufferToNextSlot(
    { sr, channels: 2, frames, durationSec: frames / sr, data: [chL, chR] },
    "gen",
    `${state.gen.wave}_${state.gen.cycles}cyc`,
    "GEN"
  );
}

async function generateClickBuffer() {
  const sr = ensureAudioContext().sampleRate;
  const frames = clamp(Math.round((state.click.lengthMs / 1000) * sr), 32, sr);
  const tau = Math.max(1, Math.floor(frames * 0.28));
  const l = new Float32Array(frames);
  const r = new Float32Array(frames);
  const sign = Math.random() > 0.5 ? 1 : -1;
  for (let i = 0; i < frames; i += 1) {
    const env = Math.exp(-i / tau);
    const n = (Math.random() * 2 - 1) * 0.18;
    const s = (sign * env + n) * state.click.amp;
    l[i] = s;
    r[i] = s;
  }
  await assignIncomingBufferToNextSlot(
    { sr, channels: 2, frames, durationSec: frames / sr, data: [l, r] },
    "click",
    "CLICK",
    "CLICK"
  );
}

function shuffleSubset(indices, subsetCount, rand) {
  const selected = [];
  const pool = [...indices];
  for (let i = 0; i < subsetCount && pool.length; i += 1) {
    const idx = Math.floor(rand() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  const shuffled = [...selected];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const map = new Map();
  for (let i = 0; i < selected.length; i += 1) map.set(selected[i], shuffled[i]);
  return map;
}

function buildSegments(frames, segLen) {
  const segs = [];
  let start = 0;
  while (start < frames) {
    const end = Math.min(frames, start + segLen);
    segs.push({ start, end, len: end - start });
    start = end;
  }
  return segs;
}

function applyBoundaryFade(chData, boundaries, width) {
  if (width <= 0) return;
  for (const b of boundaries) {
    const s = clamp(b - width, 0, chData.length - 1);
    const e = clamp(b + width, 0, chData.length - 1);
    for (let i = s; i < b; i += 1) {
      const t = (i - s) / Math.max(1, b - s);
      chData[i] *= t;
    }
    for (let i = b; i <= e; i += 1) {
      const t = 1 - (i - b) / Math.max(1, e - b + 1);
      chData[i] *= clamp(t, 0, 1);
    }
  }
}

function applyBoundarySmear(chData, boundaries, width) {
  if (width <= 1) return;
  for (const b of boundaries) {
    const s = clamp(b - width, 0, chData.length - 1);
    const e = clamp(b + width, 0, chData.length - 1);
    for (let i = s + 1; i < e - 1; i += 1) {
      chData[i] = (chData[i - 1] + chData[i] + chData[i + 1]) / 3;
    }
  }
}

function timeScrambleBuffer(input, opts) {
  const randShared = createRng(opts.seed >>> 0);
  const segLen = clamp(Math.round((opts.sizeMs / 1000) * input.sr), 16, input.sr);
  const segs = buildSegments(input.frames, segLen);
  const ids = segs.map((_, i) => i);
  const subsetCount = Math.round(ids.length * (opts.amount / 100));

  const makeMap = () => shuffleSubset(ids, subsetCount, randShared);
  const linkedMap = makeMap();

  const pReverse = (opts.chaos / 100) * 0.35;
  const pDrop = (opts.chaos / 100) * 0.15;
  const pDup = (opts.chaos / 100) * 0.15;
  const pStutter = (opts.chaos / 100) * 0.2;

  const outData = [];
  for (let c = 0; c < input.channels; c += 1) {
    const rand = state.stereo.link ? randShared : createRng((opts.seed + c + 17) >>> 0);
    const map = state.stereo.link ? linkedMap : shuffleSubset(ids, subsetCount, rand);
    const source = input.data[c];
    const out = new Float32Array(input.frames);
    const boundaries = [];

    for (let i = 0; i < segs.length; i += 1) {
      const dst = segs[i];
      const src = segs[map.get(i) ?? i];

      const reverse = rand() < pReverse;
      const drop = rand() < pDrop;
      const dup = rand() < pDup;
      const stutter = rand() < pStutter;
      const stN = stutter ? 2 + Math.floor(rand() * 4) : 1;

      for (let n = 0; n < dst.len; n += 1) {
        const dstIdx = dst.start + n;
        if (drop) {
          out[dstIdx] = 0;
          continue;
        }
        let srcN = n;
        if (stutter) {
          const sub = Math.max(1, Math.floor(src.len / stN));
          const local = n % sub;
          srcN = local;
        } else if (dup) {
          srcN = Math.floor((n * 0.5) % Math.max(1, src.len));
        }
        if (reverse) srcN = src.len - 1 - srcN;
        srcN = clamp(srcN, 0, src.len - 1);
        out[dstIdx] = source[src.start + srcN];
      }

      if (i < segs.length - 1) boundaries.push(dst.end);
    }

    if (opts.seam === "fade") {
      applyBoundaryFade(out, boundaries, clamp(Math.round(input.sr * 0.004), 2, 220));
    } else if (opts.seam === "smear") {
      applyBoundarySmear(out, boundaries, clamp(Math.round(input.sr * 0.006), 2, 320));
    }

    outData.push(out);
  }

  return { sr: input.sr, channels: input.channels, frames: input.frames, durationSec: input.durationSec, data: outData };
}

class FFT {
  constructor(size) {
    if ((size & (size - 1)) !== 0) throw new Error("fft size must be power of 2");
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
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
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

function stftChannel(samples, fftSize, hop, win) {
  const fft = new FFT(fftSize);
  const bins = fftSize / 2 + 1;
  const frameCount = Math.max(1, Math.ceil((samples.length - fftSize) / hop) + 1);
  const mags = new Array(frameCount);
  const phases = new Array(frameCount);

  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);

  for (let t = 0; t < frameCount; t += 1) {
    const start = t * hop;
    re.fill(0);
    im.fill(0);
    for (let n = 0; n < fftSize; n += 1) {
      const idx = start + n;
      re[n] = (idx < samples.length ? samples[idx] : 0) * win[n];
    }
    fft.transform(re, im, false);
    const mag = new Float32Array(bins);
    const ph = new Float32Array(bins);
    for (let k = 0; k < bins; k += 1) {
      mag[k] = Math.hypot(re[k], im[k]);
      ph[k] = Math.atan2(im[k], re[k]);
    }
    mags[t] = mag;
    phases[t] = ph;
  }
  return { mags, phases, frameCount, bins };
}

function istftFromPolar(mags, phases, fftSize, hop, win, outLen) {
  const fft = new FFT(fftSize);
  const out = new Float32Array(outLen + fftSize);
  const norm = new Float32Array(outLen + fftSize);
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  const bins = fftSize / 2 + 1;

  for (let t = 0; t < mags.length; t += 1) {
    re.fill(0);
    im.fill(0);
    const mag = mags[t];
    const ph = phases[t];
    for (let k = 0; k < bins; k += 1) {
      re[k] = mag[k] * Math.cos(ph[k]);
      im[k] = mag[k] * Math.sin(ph[k]);
    }
    for (let k = 1; k < bins - 1; k += 1) {
      const mirror = fftSize - k;
      re[mirror] = re[k];
      im[mirror] = -im[k];
    }
    fft.transform(re, im, true);
    const start = t * hop;
    for (let n = 0; n < fftSize; n += 1) {
      const i = start + n;
      if (i >= out.length) break;
      const w = win[n];
      out[i] += re[n] * w;
      norm[i] += w * w;
    }
  }

  const trimmed = new Float32Array(outLen);
  for (let i = 0; i < outLen; i += 1) {
    const d = norm[i] > 1e-8 ? norm[i] : 1;
    trimmed[i] = out[i] / d;
  }
  return trimmed;
}

function spectralPatchBuffer(input, opts) {
  let fftSize = 2048;
  let hop = 512;
  if (opts.resolution === "low") {
    fftSize = 1024;
    hop = 512;
  } else if (opts.resolution === "high") {
    fftSize = input.frames > input.sr * 4 ? 2048 : 4096;
    hop = fftSize === 4096 ? 1024 : 512;
  }

  const bins = fftSize / 2 + 1;
  const win = hann(fftSize);
  const outData = [];
  const randShared = createRng((opts.seed + 911) >>> 0);

  for (let c = 0; c < input.channels; c += 1) {
    const rand = state.stereo.link ? randShared : createRng((opts.seed + 991 + c * 7) >>> 0);
    const st = stftChannel(input.data[c], fftSize, hop, win);

    const bandCount = clamp(Number(opts.bands) || 8, 4, 16);
    const bandSize = Math.max(1, Math.floor(bins / bandCount));
    const patchOps = Math.round((opts.patch / 100) * st.frameCount * 0.25);
    const smoothA = clamp(opts.smooth / 100, 0, 1);

    for (let p = 0; p < patchOps; p += 1) {
      const t0 = Math.floor(rand() * st.frameCount);
      const tSpan = 1 + Math.floor(rand() * 6);
      const t1 = clamp(t0 + tSpan, 1, st.frameCount);
      const b0Band = Math.floor(rand() * bandCount);
      const bSpanBand = 1 + Math.floor(rand() * Math.max(1, Math.floor(bandCount / 3)));
      const b1Band = clamp(b0Band + bSpanBand, 1, bandCount);
      const b0 = b0Band * bandSize;
      const b1 = clamp(b1Band * bandSize, b0 + 1, bins);
      const opSel = rand();

      if (opSel < 0.45) {
        const maxShiftBins = Math.floor((opts.shift / 100) * Math.max(1, bandSize - 1));
        const delta = Math.floor((rand() * 2 - 1) * maxShiftBins);
        for (let t = t0; t < t1; t += 1) {
          const srcMag = st.mags[t].slice();
          const srcPh = st.phases[t].slice();
          for (let k = b0; k < b1; k += 1) {
            const width = b1 - b0;
            const srcK = b0 + (((k - b0 - delta) % width) + width) % width;
            st.mags[t][k] = srcMag[srcK];
            st.phases[t][k] = srcPh[srcK];
          }
        }
      } else if (opSel < 0.75) {
        const toBand = Math.floor(rand() * bandCount);
        const toB0 = toBand * bandSize;
        const toB1 = clamp(toB0 + (b1 - b0), toB0 + 1, bins);
        for (let t = t0; t < t1; t += 1) {
          for (let k = 0; k < (toB1 - toB0); k += 1) {
            const dstK = toB0 + k;
            const srcK = b0 + k;
            const m = st.mags[t][srcK];
            const ph = st.phases[t][srcK];
            st.mags[t][dstK] = st.mags[t][dstK] * smoothA + m * (1 - smoothA);
            st.phases[t][dstK] = st.phases[t][dstK] * smoothA + ph * (1 - smoothA);
          }
        }
      } else {
        const otherBand = Math.floor(rand() * bandCount);
        const o0 = otherBand * bandSize;
        const o1 = clamp(o0 + (b1 - b0), o0 + 1, bins);
        for (let t = t0; t < t1; t += 1) {
          for (let k = 0; k < Math.min(b1 - b0, o1 - o0); k += 1) {
            const a = b0 + k;
            const b = o0 + k;
            [st.mags[t][a], st.mags[t][b]] = [st.mags[t][b], st.mags[t][a]];
            [st.phases[t][a], st.phases[t][b]] = [st.phases[t][b], st.phases[t][a]];
          }
        }
      }

      if (opts.phase === "rotate") {
        const phi = (rand() * 2 - 1) * Math.PI;
        for (let t = t0; t < t1; t += 1) {
          for (let k = b0; k < b1; k += 1) st.phases[t][k] += phi;
        }
      } else if (opts.phase === "random") {
        for (let t = t0; t < t1; t += 1) {
          for (let k = b0; k < b1; k += 1) {
            st.phases[t][k] = (rand() * 2 - 1) * Math.PI;
          }
        }
      }
    }

    const outCh = istftFromPolar(st.mags, st.phases, fftSize, hop, win, input.frames);
    outData.push(outCh);
  }

  return { sr: input.sr, channels: input.channels, frames: input.frames, durationSec: input.durationSec, data: outData };
}

function softClipBuffer(buf, drive = 1.15) {
  for (let c = 0; c < buf.channels; c += 1) {
    const ch = buf.data[c];
    for (let i = 0; i < ch.length; i += 1) {
      ch[i] = Math.tanh(ch[i] * drive) / Math.tanh(drive);
    }
  }
}

async function renderOffline() {
  if (runtime.render.busy) return;
  const slot = getSlot();
  if (!slot.raw) {
    setStatus("NO RAW BUFFER", true);
    return;
  }
  const opts = {
    sizeMs: clamp(Number(refs.sizeMs.value) || state.time.sizeMs, 5, 500),
    amount: clamp(Number(refs.amount.value) || state.time.amount, 0, 100),
    seam: refs.seam.value,
    chaos: clamp(Number(refs.chaos.value) || state.time.chaos, 0, 100),
    seed: (Number(refs.seed.value) || state.time.seed) >>> 0,
    resolution: refs.resolution.value,
    bands: Number(refs.bands.value) || 8,
    shift: clamp(Number(refs.shift.value) || state.spec.shift, 0, 100),
    patch: clamp(Number(refs.patch.value) || state.spec.patch, 0, 100),
    phase: refs.phase.value,
    smooth: clamp(Number(refs.smooth.value) || state.spec.smooth, 0, 100),
  };

  pushUndoSnapshot();
  slot.prevOut = slot.out ? copyBufferData(slot.out) : null;
  slot.prevOutWasSet = true;
  runtime.render.busy = true;
  runtime.render.lastError = null;
  refs.renderInfo.textContent = "RENDERING...";
  updateButtons();
  setStatus("RENDERING...");

  try {
    const scrambled = timeScrambleBuffer(slot.raw, opts);
    let out = scrambled;
    if (state.spec.enabled) {
      out = spectralPatchBuffer(out, opts);
    }
    softClipBuffer(out, 1.12);

    slot.out = out;
    runtime.render.outBuffer = out;
    runtime.render.tempExists = true;
    refs.renderInfo.textContent = `TEMP READY | ${state.spec.enabled ? "TIME+SPEC" : "TIME"} | SEED ${opts.seed}`;
    setStatus("RENDER DONE: TEMP READY");
    markSessionDirty();
  } catch (error) {
    runtime.render.tempExists = false;
    runtime.render.outBuffer = null;
    runtime.render.lastError = String(error?.message || error);
    refs.renderInfo.textContent = "TEMP: NONE";
    setStatus(`RENDER FAILED: ${runtime.render.lastError}`, true);
  } finally {
    runtime.render.busy = false;
    drawWaveform();
    updateButtons();
  }
}

function undoRender() {
  const slot = getSlot();
  if (!slot.prevOutWasSet) {
    setStatus("NO PREV RENDER", true);
    return;
  }
  pushUndoSnapshot();
  slot.out = slot.prevOut ? copyBufferData(slot.prevOut) : null;
  runtime.render.outBuffer = slot.out || null;
  runtime.render.tempExists = Boolean(slot.out);
  runtime.render.lastError = null;
  slot.prevOut = null;
  slot.prevOutWasSet = false;
  refs.renderInfo.textContent = slot.out ? "TEMP READY (RESTORED)" : "TEMP: NONE";
  drawWaveform();
  updateButtons();
  setStatus("UNDO RENDER");
}

function getPreviewBuffer() {
  const slot = getSlot();
  return slot.out || slot.raw;
}

async function startPreview() {
  const src = getPreviewBuffer();
  if (!src) {
    setStatus("NO AUDIO IN SLOT", true);
    return;
  }
  const ctx = ensureAudioContext();
  await ctx.resume();
  stopPreview();
  const durationSec = src.frames / Math.max(1, src.sr);
  const startOffset = clamp(Number(runtime.previewOffsetSec) || 0, 0, Math.max(0, durationSec - 0.0005));
  const source = ctx.createBufferSource();
  source.buffer = bufferToAudioBuffer(src);
  source.loop = state.preview.loop;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  analyser.connect(ctx.destination);
  runtime.previewAnalyser = analyser;
  source.start(0, startOffset);
  source.onended = () => {
    if (runtime.previewSource === source) {
      runtime.previewSource = null;
      runtime.previewOffsetSec = 0;
      if (runtime.previewPlayToken) {
        globalPlayStop(runtime.previewPlayToken);
        runtime.previewPlayToken = null;
      }
      state.preview.playing = false;
      if (runtime.previewMeterRaf) {
        cancelAnimationFrame(runtime.previewMeterRaf);
        runtime.previewMeterRaf = null;
      }
      window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
    }
  };
  runtime.previewSource = source;
  runtime.previewDurationSec = durationSec;
  runtime.previewStartOffsetSec = startOffset;
  runtime.previewStartedAtCtxSec = ctx.currentTime;
  runtime.previewPlayToken = globalPlayStart("preview");
  state.preview.playing = true;
  startPreviewMeter();
  refs.playBtn?.setAttribute("aria-pressed", "true");
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
  runtime.previewAnalyser = null;
  runtime.previewStartedAtCtxSec = 0;
  runtime.previewStartOffsetSec = runtime.previewOffsetSec;
  window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
  state.preview.playing = false;
  refs.playBtn?.setAttribute("aria-pressed", "false");
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
    drawWaveform();
    runtime.previewMeterRaf = requestAnimationFrame(tick);
  };
  if (runtime.previewMeterRaf) cancelAnimationFrame(runtime.previewMeterRaf);
  runtime.previewMeterRaf = requestAnimationFrame(tick);
}

function abortRecordingForPanic() {
  if (runtime.recTimer) {
    clearInterval(runtime.recTimer);
    runtime.recTimer = null;
  }
  state.rec.recording = false;
  if (runtime.recorder && runtime.recorder.state !== "inactive") {
    try { runtime.recorder.stop(); } catch {}
  }
  if (runtime.stream) {
    try {
      for (const track of runtime.stream.getTracks()) track.stop();
    } catch {
      // Ignore stream shutdown errors.
    }
  }
  runtime.stream = null;
  runtime.recorder = null;
  runtime.recordChunks = [];
  runtime.recMimeType = "";
  stopRecMeter();
  refs.recProgress.style.width = "0%";
  updateButtons();
}

async function hardResetAudioRuntime() {
  stopPreview();
  abortRecordingForPanic();
  if (runtime.audioContext) {
    try {
      await runtime.audioContext.close();
    } catch {
      // Ignore close errors.
    }
  }
  runtime.audioContext = null;
  runtime.previewSource = null;
}

async function handlePanicKill() {
  await hardResetAudioRuntime();
  setStatus("PANIC KILL");
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

  function writeStr(off, str) {
    for (let i = 0; i < str.length; i += 1) view.setUint8(off + i, str.charCodeAt(i));
  }

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let off = 44;
  for (let i = 0; i < length; i += 1) {
    for (let c = 0; c < numChannels; c += 1) {
      const s = clamp(channels[c][i], -1, 1);
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([buf], { type: "audio/wav" });
}

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const chunk = 0x8000;
  let out = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(out);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function canonicalToWavBase64(canonical) {
  if (!canonical) return null;
  const blob = encodeWav(canonical.data, canonical.sr);
  return arrayBufferToBase64(await blob.arrayBuffer());
}

async function wavBase64ToCanonical(wavBase64, name = "session.wav") {
  if (!wavBase64) return null;
  const ctx = ensureAudioContext();
  const decoded = await ctx.decodeAudioData(base64ToArrayBuffer(wavBase64).slice(0));
  return audioBufferToCanonical(decoded, name);
}

function getInvoke() {
  const ownInvoke = window.__TAURI__?.core?.invoke;
  if (typeof ownInvoke === "function") return ownInvoke;
  try {
    const parentInvoke = window.parent?.__TAURI__?.core?.invoke;
    if (typeof parentInvoke === "function") return parentInvoke;
  } catch {
    // ignore
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
      dialogKey: "i2.loadRaw",
    });
    if (!path) return null;
    const base64 = await invoke("read_file_base64", { path: String(path) });
    const name = String(path).split(/[\\/]/).pop() || "audio.wav";
    return { name, arrayBuffer: base64ToArrayBuffer(base64) };
  } catch {
    return null;
  }
}

async function openPresetFileViaDialog() {
  const invoke = getInvoke();
  if (!invoke) return null;
  try {
    const path = await invoke("dialog_open_file", {
      defaultDir: runtime.paths?.presets || null,
      filters: [{ name: "Presets", extensions: ["non", "json"] }],
      dialogKey: "i2.loadPreset",
    });
    if (!path) return null;
    const base64 = await invoke("read_file_base64", { path: String(path) });
    const bytes = new Uint8Array(base64ToArrayBuffer(base64));
    const text = new TextDecoder().decode(bytes);
    const name = String(path).split(/[\\/]/).pop() || "preset.non";
    return { name, text };
  } catch {
    return null;
  }
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

async function saveBlobWithDialogPath(blob, filename) {
  const invoke = getInvoke();
  if (!invoke) return null;
  try {
    const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
    return await invoke("save_blob_with_dialog_path", { dataBase64, suggestedName: filename });
  } catch {
    return null;
  }
}

async function saveBlobToPath(blob, path) {
  const invoke = getInvoke();
  if (!invoke) return false;
  try {
    const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
    return Boolean(await invoke("save_blob_to_path", { dataBase64, path }));
  } catch {
    return false;
  }
}

async function saveBlob(blob, filename, options = null) {
  const sequenceKey = options && typeof options.sequenceKey === "string" ? options.sequenceKey : "";
  if (sequenceKey) {
    const seq = runtime.renderSaveSeqByKey[sequenceKey];
    if (seq && !seq.dialogOnly && seq.dir && seq.stem && seq.ext && seq.sep) {
      const nextFileName = indexedFileName(seq.stem, seq.ext, seq.nextIndex || 2);
      const targetPath = joinPath(seq.dir, nextFileName, seq.sep);
      const ok = await saveBlobToPath(blob, targetPath);
      if (ok) {
        seq.nextIndex = (seq.nextIndex || 2) + 1;
        return "saved";
      }
      seq.dialogOnly = true;
    } else {
      const pickedPath = await saveBlobWithDialogPath(blob, filename);
      if (pickedPath) {
        const sep = pathSeparator(pickedPath);
        const pickedName = pickedPath.split(/[\\/]/).pop() || filename;
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
  }

  const invoke = getInvoke();
  if (invoke) {
    try {
      const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
      const ok = await invoke("save_blob_with_dialog", { dataBase64, suggestedName: filename });
      if (ok) return "saved";
      return "cancelled";
    } catch {
      // fallback below
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "downloaded";
}

async function saveCurrent(which) {
  const slot = getSlot();
  const src = which === "out" ? slot.out : slot.raw;
  if (!src) return;
  const blob = encodeWav(src.data, src.sr);
  const name = sanitizeName(slot.source.name || "i2") + `_s${state.activeSlot + 1}_${which}.wav`;
  const result = await saveBlob(blob, name);
  if (result === "cancelled") setStatus("SAVE CANCELLED", true);
  else setStatus(`${which.toUpperCase()} SAVED`);
}

async function sendToLazy() {
  const src = getSlot().out;
  if (!src) return;
  const wavBlob = encodeWav(src.data, src.sr);
  const wavBytesBase64 = arrayBufferToBase64(await wavBlob.arrayBuffer());
  window.parent.postMessage(
    {
      type: "DENARRATOR_AUDIO_SEND",
      version: 1,
      name: sanitizeName(`i2_s${state.activeSlot + 1}_${getSlot().source.name || "clip"}`),
      wavBytesBase64,
      meta: { sr: src.sr, channels: src.channels, frames: src.frames, durationSec: src.durationSec },
      source: "i2",
      target: "lazy",
    },
    "*"
  );
  setStatus("SENDING TO LAZY...");
}

function cycleWave() {
  const items = ["sine", "tri", "saw", "square", "pulse"];
  const i = items.indexOf(state.gen.wave);
  state.gen.wave = items[(i + 1) % items.length];
  updateButtons();
}

function cyclePitch() {
  const i = MIDI_NOTES.findIndex((n) => n.midi === state.gen.pitchMidi);
  const next = (i + 1) % MIDI_NOTES.length;
  state.gen.pitchMidi = MIDI_NOTES[next].midi;
  updateButtons();
}

function cycleCycles() {
  const items = [1, 2, 4, 8];
  const i = items.indexOf(state.gen.cycles);
  state.gen.cycles = items[(i + 1) % items.length];
  updateButtons();
}

function cycleDuty() {
  const items = [0.125, 0.25, 0.5, 0.75];
  const i = items.indexOf(state.gen.duty);
  state.gen.duty = items[(i + 1) % items.length];
  updateButtons();
}

function applyPresetById(id) {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) return;
  if (p.time) {
    refs.sizeMs.value = String(p.time.sizeMs);
    refs.amount.value = String(p.time.amount);
    refs.seam.value = p.time.seam;
    refs.chaos.value = String(p.time.chaos);
  }
  if (p.spec) {
    state.spec.enabled = Boolean(p.spec.enabled);
    if (p.spec.resolution) refs.resolution.value = p.spec.resolution;
    if (p.spec.bands) refs.bands.value = String(p.spec.bands);
    if (p.spec.shift !== undefined) refs.shift.value = String(p.spec.shift);
    if (p.spec.patch !== undefined) refs.patch.value = String(p.spec.patch);
    if (p.spec.phase) refs.phase.value = p.spec.phase;
    if (p.spec.smooth !== undefined) refs.smooth.value = String(p.spec.smooth);
  }
  refs.seed.value = String(Math.floor(Math.random() * 0xffffffff) >>> 0);
  markSessionDirty();
  updateButtons();
  setStatus(`PRESET ${p.name}`);
}

function bind() {
  refs.slotFullOverwriteBtn?.addEventListener("click", () => resolveSlotFullModal("overwrite"));
  refs.slotFullSaveBtn?.addEventListener("click", () => resolveSlotFullModal("save"));
  refs.slotFullCancelBtn?.addEventListener("click", () => resolveSlotFullModal("cancel"));
  refs.slotFullModal?.addEventListener("click", (event) => {
    if (event.target === refs.slotFullModal) resolveSlotFullModal("cancel");
  });
  refs.slotBtns.forEach((btn, index) => {
    btn?.addEventListener("click", () => setActiveSlot(index));
  });
  refs.recBtn.addEventListener("click", () => void startRecording());
  refs.stopRecBtn.addEventListener("click", () => void stopRecording());
  refs.recRefreshBtn?.addEventListener("click", () => void refreshRecDevices({ askPermission: true }));
  refs.recInputSelect?.addEventListener("change", () => {
    const deviceId = String(refs.recInputSelect.value || "");
    state.rec.selectedDeviceId = deviceId || null;
    state.rec.selectedMissing = false;
    writeStoredRecDeviceId(state.rec.selectedDeviceId);
    updateRecDeviceInfoLine();
  });
  refs.dupMonoBtn.addEventListener("click", () => {
    state.rec.duplicateMono = !state.rec.duplicateMono;
    updateButtons();
  });
  refs.loadBtn.addEventListener("click", async () => {
    const picked = await openAudioFileViaDialog();
    if (picked?.arrayBuffer) {
      try {
        await loadAudioArrayBuffer(picked.arrayBuffer, picked.name);
      } catch (error) {
        setStatus(`LOAD FAILED: ${String(error?.message || error)}`, true);
      }
      return;
    }
    refs.loadInput.click();
  });
  refs.loadInput.addEventListener("change", async () => {
    const file = refs.loadInput.files?.[0];
    refs.loadInput.value = "";
    if (!file) return;
    try {
      await loadAudioFile(file);
    } catch (error) {
      setStatus(`LOAD FAILED: ${String(error?.message || error)}`, true);
    }
  });

  refs.waveCycleBtn.addEventListener("click", cycleWave);
  refs.pitchCycleBtn.addEventListener("click", cyclePitch);
  refs.cyclesCycleBtn.addEventListener("click", cycleCycles);
  refs.dutyCycleBtn.addEventListener("click", cycleDuty);
  refs.genBtn.addEventListener("click", () => void generateToneBuffer());
  refs.clickBtn.addEventListener("click", () => void generateClickBuffer());

  refs.reseedBtn.addEventListener("click", () => {
    refs.seed.value = String((Math.random() * 0xffffffff) >>> 0);
  });

  refs.specToggleBtn.addEventListener("click", () => {
    state.spec.enabled = !state.spec.enabled;
    updateButtons();
  });

  refs.stereoLinkBtn.addEventListener("click", () => {
    state.stereo.link = !state.stereo.link;
    updateButtons();
  });

  refs.renderBtn.addEventListener("click", renderOffline);
  refs.undoRenderBtn.addEventListener("click", undoRender);

  refs.playBtn.addEventListener("click", () => {
    if (state.preview.playing || runtime.previewSource) {
      stopPreview();
      updateButtons();
      drawWaveform();
      return;
    }
    void startPreview();
  });
  refs.loopBtn.addEventListener("change", () => {
    state.preview.loop = !!refs.loopBtn.checked;
    if (runtime.previewSource) runtime.previewSource.loop = state.preview.loop;
    updateButtons();
  });

  refs.saveRawBtn.addEventListener("click", () => void saveCurrent("raw"));
  refs.saveOutBtn.addEventListener("click", () => void saveCurrent("out"));
  refs.sendLazyBtn.addEventListener("click", () => void sendToLazy());

  refs.applyPresetBtn.addEventListener("click", () => {
    applyPresetById(refs.presetSelect.value);
  });
  refs.savePresetBtn.addEventListener("click", () => void savePreset());
  refs.loadPresetBtn.addEventListener("click", async () => {
    const picked = await openPresetFileViaDialog();
    if (picked?.text) {
      try {
        const parsed = JSON.parse(picked.text);
        const preset = readI2PresetFromObject(parsed);
        if (!preset) throw new Error("No i2 preset block found");
        applyLoadedPreset(preset);
        setStatus(`PRESET LOADED: ${picked.name}`);
      } catch (error) {
        setStatus(`PRESET LOAD FAILED: ${String(error?.message || error)}`, true);
      }
      return;
    }
    refs.loadPresetInput.click();
  });
  refs.loadPresetInput.addEventListener("change", async () => {
    const file = refs.loadPresetInput.files?.[0];
    refs.loadPresetInput.value = "";
    if (!file) return;
    try {
      await loadPresetFromFile(file);
    } catch (error) {
      setStatus(`PRESET LOAD FAILED: ${String(error?.message || error)}`, true);
    }
  });

  const dirtyInputs = [
    refs.sizeMs,
    refs.amount,
    refs.seam,
    refs.chaos,
    refs.seed,
    refs.resolution,
    refs.bands,
    refs.shift,
    refs.patch,
    refs.phase,
    refs.smooth,
  ];
  for (const input of dirtyInputs) {
    input?.addEventListener("input", markSessionDirty);
    input?.addEventListener("change", markSessionDirty);
  }

  const midiBindings = [
    [refs.sizeMs, "i2.time.size", "i2 Size"],
    [refs.amount, "i2.time.amount", "i2 Amount"],
    [refs.chaos, "i2.time.chaos", "i2 Chaos"],
    [refs.patch, "i2.spec.patch", "i2 Spec Patch"],
    [refs.smooth, "i2.spec.smooth", "i2 Spec Smooth"],
    [refs.reseedBtn, "i2.action.reseed", "i2 Reseed"],
    [refs.renderBtn, "i2.action.render", "i2 Render"],
  ];
  for (const [el, targetId, label] of midiBindings) {
    if (!el) continue;
    el.dataset.midiTarget = targetId;
    el.dataset.midiLabel = label;
  }
  document.addEventListener(
    "pointerdown",
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

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.version !== 1 || typeof data.type !== "string") return;
    if (data.type === "SESSION_EXPORT_REQ") {
      void (async () => {
        const includeOnlyDirty = data?.payload?.includeOnlyDirty !== false;
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
            gen: { ...state.gen },
            click: { ...state.click },
            rec: {
              maxSec: state.rec.maxSec,
              duplicateMono: state.rec.duplicateMono,
              selectedDeviceId: state.rec.selectedDeviceId || null,
            },
            stereo: { ...state.stereo },
            time: {
              sizeMs: Number(refs.sizeMs.value),
              amount: Number(refs.amount.value),
              seam: refs.seam.value,
              chaos: Number(refs.chaos.value),
              seed: Number(refs.seed.value) || 1337,
            },
            spec: {
              enabled: state.spec.enabled,
              resolution: refs.resolution.value,
              bands: Number(refs.bands.value),
              shift: Number(refs.shift.value),
              patch: Number(refs.patch.value),
              phase: refs.phase.value,
              smooth: Number(refs.smooth.value),
            },
            preview: { loop: Boolean(state.preview.loop) },
            slots: await Promise.all(
              state.slots.map(async (slot) => ({
                source: { ...slot.source },
                rawWavBase64: await canonicalToWavBase64(slot.raw),
                outWavBase64: await canonicalToWavBase64(slot.out),
              }))
            ),
          };
        }
        window.parent?.postMessage(
          {
            type: "SESSION_EXPORT_RES",
            version: 1,
            payload: { moduleId: "i2", schemaVersion: 1, dirty: Boolean(runtime.sessionDirty), chunk },
          },
          "*"
        );
      })();
      return;
    }
    if (data.type === "SESSION_IMPORT") {
      void (async () => {
        try {
          const chunk = data?.payload?.chunk || {};
          const heavy = chunk?.heavy;
          if (chunk?.transport && Number.isFinite(Number(chunk.transport.playheadSec))) {
            runtime.previewOffsetSec = Math.max(0, Number(chunk.transport.playheadSec));
          } else {
            runtime.previewOffsetSec = 0;
          }
          if (heavy) {
            if (heavy.gen) state.gen = { ...state.gen, ...heavy.gen };
            if (heavy.click) state.click = { ...state.click, ...heavy.click };
            if (heavy.rec) {
              state.rec.maxSec = Number(heavy.rec.maxSec) || state.rec.maxSec;
              state.rec.duplicateMono = Boolean(heavy.rec.duplicateMono);
              state.rec.selectedDeviceId = heavy.rec.selectedDeviceId || null;
            }
            if (heavy.stereo) state.stereo = { ...state.stereo, ...heavy.stereo };
            if (heavy.time) {
              refs.sizeMs.value = String(Number(heavy.time.sizeMs) || Number(refs.sizeMs.value));
              refs.amount.value = String(Number(heavy.time.amount) || Number(refs.amount.value));
              refs.seam.value = String(heavy.time.seam || refs.seam.value);
              refs.chaos.value = String(Number(heavy.time.chaos) || Number(refs.chaos.value));
              refs.seed.value = String(Number(heavy.time.seed) || Number(refs.seed.value));
            }
            if (heavy.spec) {
              state.spec.enabled = Boolean(heavy.spec.enabled);
              refs.resolution.value = String(heavy.spec.resolution || refs.resolution.value);
              refs.bands.value = String(Number(heavy.spec.bands) || Number(refs.bands.value));
              refs.shift.value = String(Number(heavy.spec.shift) || Number(refs.shift.value));
              refs.patch.value = String(Number(heavy.spec.patch) || Number(refs.patch.value));
              refs.phase.value = String(heavy.spec.phase || refs.phase.value);
              refs.smooth.value = String(Number(heavy.spec.smooth) || Number(refs.smooth.value));
            }
            if (heavy.preview) state.preview.loop = Boolean(heavy.preview.loop);
            if (Array.isArray(heavy.slots)) {
              for (let i = 0; i < Math.min(state.slots.length, heavy.slots.length); i += 1) {
                const s = heavy.slots[i] || {};
                state.slots[i].source = s.source ? { ...s.source } : { type: "none", name: "NONE" };
                state.slots[i].raw = await wavBase64ToCanonical(s.rawWavBase64, s?.source?.name || `slot_${i + 1}_raw.wav`);
                state.slots[i].out = await wavBase64ToCanonical(s.outWavBase64, s?.source?.name || `slot_${i + 1}_out.wav`);
                state.slots[i].prevOut = null;
                state.slots[i].prevOutWasSet = false;
              }
            }
          }
          if (Number.isFinite(Number(chunk?.ui?.activeSlot))) {
            state.activeSlot = clamp(Number(chunk.ui.activeSlot), 0, state.slots.length - 1);
          }
          stopPreview();
          drawWaveform();
          updateButtons();
          runtime.sessionDirty = false;
          setStatus("SESSION LOADED");
        } catch (error) {
          setStatus(`SESSION IMPORT FAILED: ${String(error?.message || error)}`, true);
        }
      })();
      return;
    }
    if (data.type === "SESSION_SAVED") {
      runtime.sessionDirty = false;
      setStatus("SESSION SAVED");
      return;
    }
    if (data.type === "PANIC_KILL") {
      void handlePanicKill();
      return;
    }
    if (data.type === "DENARRATOR_GLOBAL_PLAY") {
      if (!state.preview.playing) void startPreview();
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
    if (data.type === "MIDI_MAP_MODE") {
      runtime.midiMapMode = Boolean(data?.payload?.enabled);
      return;
    }
    if (data.type === "MIDI_TARGET_SET") {
      const targetId = String(data?.payload?.targetId || "");
      if (targetId) {
        applyMidiTarget(targetId, data?.payload?.value01);
      }
      return;
    }
    if (data.type === "AUDIO_RESET_DONE") {
      setStatus("AUDIO RESET READY");
      return;
    }
    if (data.type === "DENARRATOR_UNDO") {
      undoStep();
      return;
    }
    if (data.type === "CLIPLIB_ADD_OK") {
      runtime.lastClipAck = data;
      setStatus(`SENT: ${data.name || "clip"} -> ${(data.target || "TARGET").toUpperCase()}`);
      return;
    }
    if (data.type === "CLIPLIB_ADD_ERR") {
      setStatus(`SEND FAILED: ${String(data.error || "unknown")}`, true);
      return;
    }
    if ((data.type === "DENARRATOR_IMPORT_CLIP" || data.type === "BROWSER_LOAD_ITEM") && data.version === 1) {
      void (async () => {
        try {
          const wavB64 = String(data?.wavBytesBase64 || "");
          if (!wavB64) return;
          const canonical = await wavBase64ToCanonical(wavB64, String(data?.name || data?.payload?.name || "browser.wav"));
          const targetSlotRaw = data?.targetSlot;
          let slotIndex = state.activeSlot;
          if (typeof targetSlotRaw === "number") slotIndex = clamp(Math.floor(targetSlotRaw), 0, MAX_SLOTS - 1);
          if (typeof targetSlotRaw === "string" && /^slot_\d+$/i.test(targetSlotRaw)) {
            slotIndex = clamp(parseInt(targetSlotRaw.split("_")[1], 10) - 1, 0, MAX_SLOTS - 1);
          }
          const slot = state.slots[slotIndex];
          slot.raw = canonical;
          slot.out = null;
          slot.prevOut = null;
          slot.prevOutWasSet = false;
          slot.source = {
            type: "load",
            name: canonical.name || String(data?.name || "browser.wav"),
            savedPath: null,
            clipId: null,
          };
          state.activeSlot = slotIndex;
          updateButtons();
          drawWaveform();
          runtime.sessionDirty = true;
          setStatus(`LOADED ${slot.source.name} -> S${slotIndex + 1}`);
        } catch (error) {
          setStatus(`BROWSER LOAD FAILED: ${String(error?.message || error)}`, true);
        }
      })();
    }
  });

  window.addEventListener("resize", drawWaveform);
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
    const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z";
    if (!isUndo) return;
    event.preventDefault();
    undoStep();
  });
}

function init() {
  installTactileButtons(document);
  for (const p of PRESETS) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    refs.presetSelect.appendChild(opt);
  }
  refs.presetSelect.value = PRESETS[1].id;
  updateButtons();
  void refreshRecDevices({ askPermission: false });
  bind();
  if (navigator?.mediaDevices?.addEventListener) {
    const handler = () => {
      void refreshRecDevices();
      if (state.rec.recording) {
        void stopRecording();
        setStatus("REC STOPPED: INPUT DEVICE CHANGED", true);
      }
    };
    navigator.mediaDevices.addEventListener("devicechange", handler);
    runtime.recDeviceChangeCleanup = () => navigator.mediaDevices.removeEventListener("devicechange", handler);
  }
  window.addEventListener("beforeunload", () => {
    runtime.recDeviceChangeCleanup?.();
    runtime.recDeviceChangeCleanup = null;
  });
  registerMidiTargets();
  window.parent?.postMessage({ type: "PATHS_REQ", version: 1 }, "*");
  drawWaveform();
  runtime.sessionDirty = false;
}

init();
