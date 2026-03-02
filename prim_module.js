const PRESETS = [
  {
    id: "clean_chop",
    name: "CLEAN CHOP",
    snapZeroCross: true,
    dup: { mode: "OVERWRITE", count: 4 },
    fx: {
      filter: { enabled: true, type: "lowpass", cutoff: 16000, q: 0.7, drive: 0, mix: 1 },
      reverb: { enabled: false, seconds: 0.8, preDelayMs: 10, damp: 0.5, mix: 0.25, tailExtend: true },
    },
    tapestop: { timeMs: 700, curve: "exp", floor: 0.02, tailFadeMs: 20 },
  },
  {
    id: "shattered_room",
    name: "SHATTERED ROOM",
    snapZeroCross: false,
    dup: { mode: "MIRROR", count: 4 },
    fx: {
      filter: { enabled: true, type: "lowpass", cutoff: 4200, q: 0.9, drive: 0.25, mix: 1 },
      reverb: { enabled: true, seconds: 1.6, preDelayMs: 18, damp: 0.72, mix: 0.33, tailExtend: true },
    },
    tapestop: { timeMs: 900, curve: "exp", floor: 0.015, tailFadeMs: 25 },
  },
  {
    id: "tape_crash",
    name: "TAPE CRASH",
    snapZeroCross: false,
    dup: { mode: "STUTTER", count: 6 },
    fx: {
      filter: { enabled: true, type: "lowpass", cutoff: 9000, q: 0.8, drive: 0.35, mix: 1 },
      reverb: { enabled: true, seconds: 0.9, preDelayMs: 6, damp: 0.35, mix: 0.22, tailExtend: true },
    },
    tapestop: { timeMs: 420, curve: "exp", floor: 0.03, tailFadeMs: 18 },
  },
];

const refs = {
  primTabEditorBtn: document.getElementById("primTabEditorBtn"),
  primTabArithBtn: document.getElementById("primTabArithBtn"),
  arithView: document.getElementById("arithView"),
  arithAInfo: document.getElementById("arithAInfo"),
  arithBInfo: document.getElementById("arithBInfo"),
  arithStats: document.getElementById("arithStats"),
  arithLoadABtn: document.getElementById("arithLoadABtn"),
  arithLoadBBtn: document.getElementById("arithLoadBBtn"),
  arithClrABtn: document.getElementById("arithClrABtn"),
  arithClrBBtn: document.getElementById("arithClrBBtn"),
  arithLoadAInput: document.getElementById("arithLoadAInput"),
  arithLoadBInput: document.getElementById("arithLoadBInput"),
  arithSwapBtn: document.getElementById("arithSwapBtn"),
  arithLenMode: document.getElementById("arithLenMode"),
  arithOpDiffBtn: document.getElementById("arithOpDiffBtn"),
  arithOpMultBtn: document.getElementById("arithOpMultBtn"),
  arithOpDivBtn: document.getElementById("arithOpDivBtn"),
  arithDiffPanel: document.getElementById("arithDiffPanel"),
  arithMultPanel: document.getElementById("arithMultPanel"),
  arithDivPanel: document.getElementById("arithDivPanel"),
  arithDiffDir: document.getElementById("arithDiffDir"),
  arithDiffAlignBtn: document.getElementById("arithDiffAlignBtn"),
  arithDiffGainMatch: document.getElementById("arithDiffGainMatch"),
  arithDiffClampBtn: document.getElementById("arithDiffClampBtn"),
  arithMultMode: document.getElementById("arithMultMode"),
  arithMultEnvSmooth: document.getElementById("arithMultEnvSmooth"),
  arithMultDcKillBtn: document.getElementById("arithMultDcKillBtn"),
  arithMultMix: document.getElementById("arithMultMix"),
  arithDivMode: document.getElementById("arithDivMode"),
  arithDivEps: document.getElementById("arithDivEps"),
  arithDivGain: document.getElementById("arithDivGain"),
  arithDivSign: document.getElementById("arithDivSign"),
  arithDivClampBtn: document.getElementById("arithDivClampBtn"),
  arithWaveCanvas: document.getElementById("arithWaveCanvas"),
  arithRenderBtn: document.getElementById("arithRenderBtn"),
  arithPlayBtn: document.getElementById("arithPlayBtn"),
  arithLoopBtn: document.getElementById("arithLoopBtn"),
  arithSaveBtn: document.getElementById("arithSaveBtn"),
  arithSendBtn: document.getElementById("arithSendBtn"),
  arithRenderInfo: document.getElementById("arithRenderInfo"),
  arithRenderingBar: document.getElementById("arithRenderingBar"),
  recBtn: document.getElementById("recBtn"),
  stopRecBtn: document.getElementById("stopRecBtn"),
  recRefreshBtn: document.getElementById("recRefreshBtn"),
  recInputSelect: document.getElementById("recInputSelect"),
  recDeviceInfo: document.getElementById("recDeviceInfo"),
  loadBtn: document.getElementById("loadBtn"),
  loadInput: document.getElementById("loadInput"),
  recProgress: document.getElementById("recProgress"),
  sourceInfo: document.getElementById("sourceInfo"),
  lengthSec: document.getElementById("lengthSec"),
  lengthMinusBtn: document.getElementById("lengthMinusBtn"),
  lengthPlusBtn: document.getElementById("lengthPlusBtn"),
  applyLengthBtn: document.getElementById("applyLengthBtn"),
  playBtn: document.getElementById("playBtn"),
  loopBtn: document.getElementById("loopBtn"),
  undoBtn: document.getElementById("undoBtn"),
  redoBtn: document.getElementById("redoBtn"),
  presetSelect: document.getElementById("presetSelect"),
  applyPresetBtn: document.getElementById("applyPresetBtn"),
  snapBtn: document.getElementById("snapBtn"),
  saveBtn: document.getElementById("saveBtn"),
  sendBtn: document.getElementById("sendBtn"),
  sendInfo: document.getElementById("sendInfo"),
  stats: document.getElementById("stats"),
  status: document.getElementById("status"),
  toolButtons: Array.from(document.querySelectorAll("[data-tool]")),
  dupMode: document.getElementById("dupMode"),
  dupCount: document.getElementById("dupCount"),
  dupExtendBtn: document.getElementById("dupExtendBtn"),
  waveCanvas: document.getElementById("waveCanvas"),
  fOn: document.getElementById("fOn"),
  fPreview: document.getElementById("fPreview"),
  fType: document.getElementById("fType"),
  fCutoff: document.getElementById("fCutoff"),
  fQ: document.getElementById("fQ"),
  fDrive: document.getElementById("fDrive"),
  fMix: document.getElementById("fMix"),
  fApply: document.getElementById("fApply"),
  fReset: document.getElementById("fReset"),
  rOn: document.getElementById("rOn"),
  rPreview: document.getElementById("rPreview"),
  rSec: document.getElementById("rSec"),
  rPredelay: document.getElementById("rPredelay"),
  rDamp: document.getElementById("rDamp"),
  rMix: document.getElementById("rMix"),
  rTail: document.getElementById("rTail"),
  rApply: document.getElementById("rApply"),
  rReset: document.getElementById("rReset"),
  tOn: document.getElementById("tOn"),
  tPreview: document.getElementById("tPreview"),
  tTime: document.getElementById("tTime"),
  tCurve: document.getElementById("tCurve"),
  tFloor: document.getElementById("tFloor"),
  tFade: document.getElementById("tFade"),
  tApplyAtPlayhead: document.getElementById("tApplyAtPlayhead"),
  tReset: document.getElementById("tReset"),
  renderOutBtn: document.getElementById("renderOutBtn"),
  bakeOutBtn: document.getElementById("bakeOutBtn"),
  abBtn: document.getElementById("abBtn"),
  clearSelBtn: document.getElementById("clearSelBtn"),
  fxStatus: document.getElementById("fxStatus"),
};

const state = {
  subtab: "EDITOR",
  sourceName: "NONE",
  base: null,
  sampleLenFrames: 0,
  segments: [],
  selection: null,
  playheadFrame: 0,
  tool: "ARROW",
  snapZeroCross: false,
  dup: { mode: "OVERWRITE", count: 4, stepFrames: 0 },
  dupAutoExtend: false,
  fx: {
    filter: { enabled: false, preview: false, type: "lowpass", cutoff: 8000, q: 0.7, drive: 0, mix: 1 },
    reverb: { enabled: false, preview: false, seconds: 0.8, preDelayMs: 10, damp: 0.5, mix: 0.25, tailExtend: true },
  },
  tapestop: { enabled: true, preview: false, anchorFrame: 0, timeMs: 700, curve: "exp", floor: 0.02, tailFadeMs: 20 },
  preview: { playing: false, loop: false, useAB: false },
  rec: { selectedDeviceId: null, devices: [], permission: "unknown", selectedMissing: false },
  arith: {
    A: { name: "NONE", buffer: null },
    B: { name: "NONE", buffer: null },
    lenMode: "TRIM",
    op: "DIFF",
    diff: { dir: "A-B", align: false, gainMatch: "OFF", clamp: true },
    mult: { mode: "SAMPLE", envSmoothMs: 30, dcKill: true, mix: 1 },
    div: { mode: "SAFE", eps: 0.02, gain: 1.4, sign: "SIGNED", clamp: true },
    preview: { playing: false, loop: false },
    render: { busy: false, tempPath: null, outBuffer: null, tempExists: false },
  },
};

const runtime = {
  audioContext: null,
  previewSource: null,
  previewAnalyser: null,
  previewMeterData: null,
  previewMeterRaf: null,
  renderedOut: null,
  debouncedFxTimer: null,
  drag: null,
  recorder: null,
  stream: null,
  recChunks: [],
  recTimer: null,
  recStartedAt: 0,
  undo: [],
  redo: [],
  midiMapMode: false,
  midiLastTrigger: {},
  previewPlayToken: null,
  paths: null,
  recDeviceChangeCleanup: null,
  sessionDirty: false,
  renderSaveSeqByKey: {},
  arithPreviewSource: null,
  arithPreviewAnalyser: null,
  arithPreviewMeterData: null,
  arithPreviewMeterRaf: null,
  arithPreviewPlayToken: null,
};

const REC_DEVICE_STORAGE_KEY = "denarrator.rec.device.prim";

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

function globalPlayStart(sourceLabel) {
  const token = `prim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    window.parent?.postMessage(
      {
        type: "GLOBAL_PLAY_START",
        version: 1,
        payload: { token, moduleId: "prim", source: sourceLabel },
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
  const addClass = () => root.querySelectorAll("button").forEach((button) => button.classList.add("dn-btn"));
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
    { id: "prim.fx.filter.cutoff", label: "Prim Filter Cutoff", kind: "continuous", default: 0.5 },
    { id: "prim.fx.filter.q", label: "Prim Filter Q", kind: "continuous", default: 0.2 },
    { id: "prim.fx.filter.drive", label: "Prim Filter Drive", kind: "continuous", default: 0 },
    { id: "prim.fx.filter.mix", label: "Prim Filter Mix", kind: "continuous", default: 1 },
    { id: "prim.fx.filter.enable", label: "Prim Filter Enable", kind: "toggle", default: 0 },
    { id: "prim.fx.reverb.mix", label: "Prim Reverb Mix", kind: "continuous", default: 0.25 },
    { id: "prim.fx.reverb.time", label: "Prim Reverb Time", kind: "continuous", default: 0.2 },
    { id: "prim.fx.reverb.damp", label: "Prim Reverb Damp", kind: "continuous", default: 0.5 },
    { id: "prim.fx.reverb.enable", label: "Prim Reverb Enable", kind: "toggle", default: 0 },
    { id: "prim.tapestop.time", label: "Prim Tapestop Time", kind: "continuous", default: 0.25 },
    { id: "prim.action.applyFx", label: "Prim Apply FX", kind: "trigger", default: 0 },
    { id: "prim.action.sendToLazy", label: "Prim Send To Lazy", kind: "trigger", default: 0 },
  ];
  try {
    window.parent?.postMessage(
      {
        type: "MIDI_TARGETS_REGISTER",
        version: 1,
        moduleId: "prim",
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
  if (targetId === "prim.fx.filter.cutoff") {
    state.fx.filter.cutoff = Math.round(80 + v * (20000 - 80));
    refs.fCutoff.value = String(state.fx.filter.cutoff);
    schedulePreviewRender();
    return;
  }
  if (targetId === "prim.fx.filter.q") {
    state.fx.filter.q = Number((0.1 + v * 15).toFixed(2));
    refs.fQ.value = String(state.fx.filter.q);
    schedulePreviewRender();
    return;
  }
  if (targetId === "prim.fx.filter.drive") {
    state.fx.filter.drive = Number(v.toFixed(3));
    refs.fDrive.value = String(state.fx.filter.drive);
    schedulePreviewRender();
    return;
  }
  if (targetId === "prim.fx.filter.mix") {
    state.fx.filter.mix = Number(v.toFixed(3));
    refs.fMix.value = String(state.fx.filter.mix);
    schedulePreviewRender();
    return;
  }
  if (targetId === "prim.fx.filter.enable") {
    state.fx.filter.enabled = v >= 0.5;
    syncUiFromState();
    schedulePreviewRender();
    return;
  }
  if (targetId === "prim.fx.reverb.mix") {
    state.fx.reverb.mix = Number(v.toFixed(3));
    refs.rMix.value = String(state.fx.reverb.mix);
    schedulePreviewRender();
    return;
  }
  if (targetId === "prim.fx.reverb.time") {
    state.fx.reverb.seconds = Number((0.1 + v * 4.9).toFixed(2));
    refs.rSec.value = String(state.fx.reverb.seconds);
    schedulePreviewRender();
    return;
  }
  if (targetId === "prim.fx.reverb.damp") {
    state.fx.reverb.damp = Number(v.toFixed(3));
    refs.rDamp.value = String(state.fx.reverb.damp);
    schedulePreviewRender();
    return;
  }
  if (targetId === "prim.fx.reverb.enable") {
    state.fx.reverb.enabled = v >= 0.5;
    syncUiFromState();
    schedulePreviewRender();
    return;
  }
  if (targetId === "prim.tapestop.time") {
    state.tapestop.timeMs = Math.round(80 + v * 4000);
    refs.tTime.value = String(state.tapestop.timeMs);
    return;
  }
  if (targetId === "prim.action.applyFx" || targetId === "prim.action.sendToLazy") {
    const prev = Boolean(runtime.midiLastTrigger[targetId]);
    const next = v >= 0.5;
    runtime.midiLastTrigger[targetId] = next;
    if (!prev && next) {
      if (targetId === "prim.action.applyFx") {
        void bakeOut();
      } else {
        void sendToLazy();
      }
    }
  }
}

function ensureAudioContext() {
  if (!runtime.audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    runtime.audioContext = new Ctor();
  }
  return runtime.audioContext;
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
  refs.recInputSelect.disabled = refs.recBtn.disabled || !state.rec.devices.length;
}

async function refreshRecDevices({ askPermission = false } = {}) {
  const mediaDevices = getMediaDevicesApi();
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function" || typeof mediaDevices.enumerateDevices !== "function") {
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
      const probe = await getUserMediaCompat({ audio: true });
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
  if (state.rec.permission !== "denied") state.rec.permission = "granted";
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
    channelCount: 2,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  };
  const selectedId = state.rec.selectedDeviceId;
  if (selectedId && state.rec.devices.some((d) => d.deviceId === selectedId)) {
    try {
      return await getUserMediaCompat({
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
  return getUserMediaCompat({ audio: baseAudio });
}

function createWholeSegment(frames) {
  return { id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, srcStart: 0, srcLength: frames, dstStart: 0, reversed: false, yNorm: 0, muted: false };
}

function cloneBuffer(buf) {
  return {
    sr: buf.sr,
    channels: buf.channels,
    frames: buf.frames,
    data: buf.data.map((ch) => new Float32Array(ch)),
  };
}

function cloneSegments(segments) {
  return segments.map((s) => ({ ...s }));
}

function snapshot() {
  return {
    sourceName: state.sourceName,
    base: state.base ? cloneBuffer(state.base) : null,
    sampleLenFrames: state.sampleLenFrames,
    segments: cloneSegments(state.segments),
    selection: state.selection ? { ...state.selection } : null,
    playheadFrame: state.playheadFrame,
    dup: { ...state.dup },
    dupAutoExtend: state.dupAutoExtend,
    snapZeroCross: state.snapZeroCross,
    fx: JSON.parse(JSON.stringify(state.fx)),
    tapestop: JSON.parse(JSON.stringify(state.tapestop)),
    renderedOut: runtime.renderedOut ? cloneBuffer(runtime.renderedOut) : null,
  };
}

function restoreFromSnapshot(snap) {
  state.sourceName = snap.sourceName;
  state.base = snap.base ? cloneBuffer(snap.base) : null;
  state.sampleLenFrames = snap.sampleLenFrames;
  state.segments = cloneSegments(snap.segments || []);
  state.selection = snap.selection ? { ...snap.selection } : null;
  state.playheadFrame = snap.playheadFrame || 0;
  state.dup = { ...state.dup, ...(snap.dup || {}) };
  state.dupAutoExtend = Boolean(snap.dupAutoExtend);
  state.snapZeroCross = Boolean(snap.snapZeroCross);
  state.fx = JSON.parse(JSON.stringify(snap.fx || state.fx));
  state.tapestop = JSON.parse(JSON.stringify(snap.tapestop || state.tapestop));
  runtime.renderedOut = snap.renderedOut ? cloneBuffer(snap.renderedOut) : null;
  syncUiFromState();
  draw();
}

function pushUndo(actionLabel) {
  runtime.undo.push({ actionLabel, snap: snapshot() });
  if (runtime.undo.length > 10) runtime.undo.splice(0, runtime.undo.length - 10);
  runtime.redo = [];
  markSessionDirty();
}

function undo() {
  const entry = runtime.undo.pop();
  if (!entry) {
    setStatus("NOTHING TO UNDO", true);
    return;
  }
  runtime.redo.push({ actionLabel: entry.actionLabel, snap: snapshot() });
  restoreFromSnapshot(entry.snap);
  setStatus(`UNDO ${entry.actionLabel}`);
}

function redo() {
  const entry = runtime.redo.pop();
  if (!entry) {
    setStatus("NOTHING TO REDO", true);
    return;
  }
  runtime.undo.push({ actionLabel: entry.actionLabel, snap: snapshot() });
  restoreFromSnapshot(entry.snap);
  setStatus(`REDO ${entry.actionLabel}`);
}

function gainFromYNorm(yNorm) {
  const db = clamp(yNorm, -1, 1) * 18;
  return Math.pow(10, db / 20);
}

function sortSegments() {
  state.segments.sort((a, b) => a.dstStart - b.dstStart);
}

function splitSegmentsAt(frame) {
  if (!state.base || state.sampleLenFrames <= 0) return;
  const t = clamp(Math.round(frame), 0, state.sampleLenFrames);
  const out = [];
  for (const seg of state.segments) {
    const segStart = seg.dstStart;
    const segEnd = seg.dstStart + seg.srcLength;
    if (t <= segStart || t >= segEnd) {
      out.push(seg);
      continue;
    }
    const leftLen = t - segStart;
    const rightLen = seg.srcLength - leftLen;
    const left = { ...seg, id: `${seg.id}_L_${t}`, srcLength: leftLen };
    const right = { ...seg, id: `${seg.id}_R_${t}`, srcLength: rightLen, dstStart: t };
    if (!seg.reversed) {
      right.srcStart = seg.srcStart + leftLen;
    } else {
      left.srcStart = seg.srcStart + rightLen;
      right.srcStart = seg.srcStart;
    }
    out.push(left, right);
  }
  state.segments = out.filter((s) => s.srcLength > 0);
  sortSegments();
}

function frameFromX(x, rect) {
  if (state.sampleLenFrames <= 0) return 0;
  const n = clamp((x - rect.left) / rect.width, 0, 1);
  return Math.round(n * state.sampleLenFrames);
}

function xFromFrame(frame, width) {
  if (state.sampleLenFrames <= 0) return 0;
  return (clamp(frame, 0, state.sampleLenFrames) / state.sampleLenFrames) * width;
}

function nearestZeroCrossing(data, frame, radius = 1024) {
  const center = clamp(Math.round(frame), 1, data.length - 2);
  let best = center;
  let bestDist = Infinity;
  const from = clamp(center - radius, 1, data.length - 2);
  const to = clamp(center + radius, 1, data.length - 2);
  for (let i = from; i <= to; i += 1) {
    const a = data[i - 1];
    const b = data[i];
    if ((a <= 0 && b >= 0) || (a >= 0 && b <= 0)) {
      const d = Math.abs(i - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
  }
  return best;
}

function maybeSnapFrame(frame) {
  if (!state.snapZeroCross || !state.base || state.base.frames < 3) return frame;
  return nearestZeroCrossing(state.base.data[0], frame);
}

function makeCanonical(channels, frames, sr) {
  return { sr, channels, frames, data: Array.from({ length: channels }, () => new Float32Array(frames)) };
}

function renderDry() {
  if (!state.base || state.sampleLenFrames <= 0) return null;
  const out = makeCanonical(state.base.channels, state.sampleLenFrames, state.base.sr);
  for (const seg of state.segments) {
    if (seg.muted || seg.srcLength <= 0) continue;
    const gain = gainFromYNorm(seg.yNorm || 0);
    const len = Math.min(seg.srcLength, out.frames - seg.dstStart);
    if (len <= 0) continue;
    for (let ch = 0; ch < out.channels; ch += 1) {
      const src = state.base.data[ch];
      const dst = out.data[ch];
      for (let i = 0; i < len; i += 1) {
        const srcIdx = seg.reversed ? (seg.srcStart + seg.srcLength - 1 - i) : (seg.srcStart + i);
        if (srcIdx < 0 || srcIdx >= state.base.frames) continue;
        const dstIdx = seg.dstStart + i;
        if (dstIdx < 0 || dstIdx >= out.frames) continue;
        dst[dstIdx] += src[srcIdx] * gain;
      }
    }
  }
  return out;
}

function clampAudio(buf) {
  const out = cloneBuffer(buf);
  for (const ch of out.data) {
    for (let i = 0; i < ch.length; i += 1) {
      ch[i] = clamp(ch[i], -1, 1);
    }
  }
  return out;
}

async function renderFilter(input) {
  if (!state.fx.filter.enabled) return input;
  const ctx = ensureAudioContext();
  const offline = new OfflineAudioContext(input.channels, input.frames, input.sr);
  const srcBuf = offline.createBuffer(input.channels, input.frames, input.sr);
  for (let ch = 0; ch < input.channels; ch += 1) srcBuf.copyToChannel(input.data[ch], ch);
  const src = offline.createBufferSource();
  src.buffer = srcBuf;
  const biquad = offline.createBiquadFilter();
  biquad.type = state.fx.filter.type;
  biquad.frequency.value = Number(state.fx.filter.cutoff);
  biquad.Q.value = Number(state.fx.filter.q);
  const driveNode = offline.createWaveShaper();
  const drive = clamp(Number(state.fx.filter.drive), 0, 1);
  const curve = new Float32Array(4096);
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * (1 + drive * 9));
  }
  driveNode.curve = curve;
  driveNode.oversample = "2x";

  const dryGain = offline.createGain();
  const wetGain = offline.createGain();
  const mix = clamp(Number(state.fx.filter.mix), 0, 1);
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;

  src.connect(dryGain);
  dryGain.connect(offline.destination);
  src.connect(biquad);
  biquad.connect(driveNode);
  driveNode.connect(wetGain);
  wetGain.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();
  return canonicalFromAudioBuffer(rendered);
}

function createImpulseResponse(ctx, sr, seconds, damp) {
  const frames = Math.max(128, Math.round(seconds * sr));
  const ir = ctx.createBuffer(2, frames, sr);
  for (let ch = 0; ch < 2; ch += 1) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < frames; i += 1) {
      const t = i / frames;
      const env = Math.pow(1 - t, 1 + damp * 8);
      d[i] = (Math.random() * 2 - 1) * env * (0.6 + 0.4 * (1 - damp));
    }
  }
  return ir;
}

async function renderReverb(input) {
  if (!state.fx.reverb.enabled) return input;
  const sec = Math.max(0.1, Number(state.fx.reverb.seconds));
  const tailFrames = Math.round(sec * input.sr);
  const outFrames = state.fx.reverb.tailExtend ? input.frames + tailFrames : input.frames;
  const offline = new OfflineAudioContext(input.channels, outFrames, input.sr);
  const srcBuf = offline.createBuffer(input.channels, input.frames, input.sr);
  for (let ch = 0; ch < input.channels; ch += 1) srcBuf.copyToChannel(input.data[ch], ch);
  const src = offline.createBufferSource();
  src.buffer = srcBuf;
  const dryGain = offline.createGain();
  const wetGain = offline.createGain();
  const mix = clamp(Number(state.fx.reverb.mix), 0, 1);
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;
  const delay = offline.createDelay(4);
  delay.delayTime.value = clamp(Number(state.fx.reverb.preDelayMs), 0, 1200) / 1000;
  const convolver = offline.createConvolver();
  convolver.buffer = createImpulseResponse(offline, input.sr, sec, clamp(Number(state.fx.reverb.damp), 0, 1));
  src.connect(dryGain);
  dryGain.connect(offline.destination);
  src.connect(delay);
  delay.connect(convolver);
  convolver.connect(wetGain);
  wetGain.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();
  return canonicalFromAudioBuffer(rendered);
}

function renderTapestop(input, frameOverride = null) {
  if (!state.tapestop.enabled) return input;
  const t0Raw = frameOverride == null ? Number(state.tapestop.anchorFrame || 0) : Number(frameOverride);
  const t0 = clamp(Math.round(t0Raw), 0, input.frames - 1);
  const out = makeCanonical(input.channels, input.frames, input.sr);
  const stopFrames = Math.max(8, Math.round((Number(state.tapestop.timeMs) / 1000) * input.sr));
  const floor = clamp(Number(state.tapestop.floor), 0.005, 0.5);
  for (let ch = 0; ch < input.channels; ch += 1) {
    const inCh = input.data[ch];
    const outCh = out.data[ch];
    for (let i = 0; i < t0; i += 1) outCh[i] = inCh[i];
    let pos = t0;
    for (let i = t0; i < input.frames; i += 1) {
      const rel = clamp((i - t0) / stopFrames, 0, 1);
      const speed = state.tapestop.curve === "exp"
        ? (1 - rel) * (1 - floor) + floor
        : 1 - rel * (1 - floor);
      pos += speed;
      const p0 = Math.floor(pos);
      const p1 = Math.min(input.frames - 1, p0 + 1);
      const frac = pos - p0;
      const s = inCh[p0] * (1 - frac) + inCh[p1] * frac;
      const tailFrames = Math.max(1, Number(state.tapestop.tailFadeMs) * input.sr / 1000);
      const fadeRel = clamp((i - (input.frames - tailFrames)) / tailFrames, 0, 1);
      outCh[i] = s * (1 - fadeRel);
    }
  }
  return clampAudio(out);
}

async function renderOut(options = {}) {
  const includeTapestop = Boolean(options.includeTapestop);
  if (!state.base) return null;
  refs.fxStatus.textContent = "CPU: rendering";
  let out = renderDry();
  if (!out) return null;
  if (includeTapestop && state.tapestop.enabled) {
    out = renderTapestop(out);
  }
  const fPreview = state.fx.filter.enabled && state.fx.filter.preview;
  const rPreview = state.fx.reverb.enabled && state.fx.reverb.preview;
  if (fPreview) out = await renderFilter(out);
  if (rPreview) out = await renderReverb(out);
  out = clampAudio(out);
  runtime.renderedOut = out;
  refs.fxStatus.textContent = `CPU: ok OUT ${(out.frames / out.sr).toFixed(2)}s`;
  return out;
}

function resetSegmentsToWhole() {
  if (!state.base) return;
  state.segments = [createWholeSegment(state.sampleLenFrames)];
}

async function bakeOut() {
  const out = await renderOut({ includeTapestop: true });
  if (!out) return;
  pushUndo("BAKE OUT");
  state.base = cloneBuffer(out);
  state.sampleLenFrames = out.frames;
  state.selection = null;
  state.playheadFrame = 0;
  resetSegmentsToWhole();
  runtime.renderedOut = cloneBuffer(out);
  refs.lengthSec.value = (state.sampleLenFrames / state.base.sr).toFixed(2);
  updateStats();
  draw();
  setStatus(`BAKED OUT ${(out.frames / out.sr).toFixed(2)}S`);
}

function canonicalFromAudioBuffer(audioBuffer) {
  const channels = audioBuffer.numberOfChannels;
  const frames = audioBuffer.length;
  const sr = audioBuffer.sampleRate;
  const data = [];
  for (let ch = 0; ch < channels; ch += 1) data.push(new Float32Array(audioBuffer.getChannelData(ch)));
  return { sr, channels, frames, data };
}

function bufferToAudioBuffer(canonical) {
  const ctx = ensureAudioContext();
  const audioBuffer = ctx.createBuffer(canonical.channels, canonical.frames, canonical.sr);
  for (let ch = 0; ch < canonical.channels; ch += 1) audioBuffer.copyToChannel(canonical.data[ch], ch);
  return audioBuffer;
}

function sanitizeName(name) {
  return String(name || "prim")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .replace(/^\.+/, "")
    .slice(0, 80) || "prim";
}

function audioBufferToWavBlob(canonical) {
  const channels = canonical.channels;
  const sampleRate = canonical.sr;
  const frames = canonical.frames;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const write = (off, str) => { for (let i = 0; i < str.length; i += 1) view.setUint8(off + i, str.charCodeAt(i)); };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < frames; i += 1) {
    for (let ch = 0; ch < channels; ch += 1) {
      const s = clamp(canonical.data[ch][i], -1, 1);
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
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

async function canonicalToWavBase64(canonical) {
  if (!canonical) return null;
  const blob = audioBufferToWavBlob(canonical);
  return arrayBufferToBase64(await blob.arrayBuffer());
}

async function wavBase64ToCanonical(wavBase64) {
  if (!wavBase64) return null;
  const decoded = await ensureAudioContext().decodeAudioData(base64ToArrayBuffer(wavBase64).slice(0));
  return canonicalFromAudioBuffer(decoded);
}

async function exportSessionChunk(includeOnlyDirty = true) {
  const chunk = {
    schemaVersion: 1,
    transport: {
      playheadSec: state.base ? (state.playheadFrame / state.base.sr) : 0,
      loopA: 0,
      loopB: state.base ? (state.sampleLenFrames / state.base.sr) : 0,
    },
    ui: {
      tool: state.tool,
      snapZeroCross: Boolean(state.snapZeroCross),
    },
    refs: {
      sourceName: state.sourceName,
    },
    dirty: Boolean(runtime.sessionDirty),
  };
  if (!includeOnlyDirty || runtime.sessionDirty) {
    chunk.heavy = {
      baseWavBase64: await canonicalToWavBase64(state.base),
      renderedWavBase64: await canonicalToWavBase64(runtime.renderedOut),
      sampleLenFrames: state.sampleLenFrames,
      segments: state.segments.map((segment) => ({ ...segment })),
      selection: state.selection ? { ...state.selection } : null,
      playheadFrame: state.playheadFrame,
      dup: { ...state.dup },
      dupAutoExtend: Boolean(state.dupAutoExtend),
      fx: JSON.parse(JSON.stringify(state.fx)),
      tapestop: JSON.parse(JSON.stringify(state.tapestop)),
      preview: { loop: Boolean(state.preview.loop), useAB: Boolean(state.preview.useAB) },
      arith: {
        op: state.arith.op,
        lenMode: state.arith.lenMode,
        diff: { ...state.arith.diff },
        mult: { ...state.arith.mult },
        div: { ...state.arith.div },
        aName: state.arith.A.name,
        bName: state.arith.B.name,
        aWavBase64: await canonicalToWavBase64(state.arith.A.buffer),
        bWavBase64: await canonicalToWavBase64(state.arith.B.buffer),
      },
    };
  }
  return chunk;
}

async function importSessionChunk(chunk) {
  if (!chunk || typeof chunk !== "object") return;
  const heavy = chunk.heavy;
  if (heavy) {
    state.base = await wavBase64ToCanonical(heavy.baseWavBase64);
    runtime.renderedOut = await wavBase64ToCanonical(heavy.renderedWavBase64);
    state.sampleLenFrames = Number(heavy.sampleLenFrames) || (state.base?.frames || 0);
    state.segments = Array.isArray(heavy.segments) ? heavy.segments.map((segment) => ({ ...segment })) : [];
    state.selection = heavy.selection && typeof heavy.selection === "object" ? { ...heavy.selection } : null;
    state.playheadFrame = Number(heavy.playheadFrame) || 0;
    state.dup = { ...state.dup, ...(heavy.dup || {}) };
    state.dupAutoExtend = Boolean(heavy.dupAutoExtend);
    if (heavy.fx) state.fx = JSON.parse(JSON.stringify(heavy.fx));
    if (heavy.tapestop) state.tapestop = JSON.parse(JSON.stringify(heavy.tapestop));
    if (heavy.preview) {
      state.preview.loop = Boolean(heavy.preview.loop);
      state.preview.useAB = Boolean(heavy.preview.useAB);
    }
    if (heavy.arith) {
      state.arith.op = String(heavy.arith.op || state.arith.op);
      state.arith.lenMode = String(heavy.arith.lenMode || state.arith.lenMode);
      state.arith.diff = { ...state.arith.diff, ...(heavy.arith.diff || {}) };
      state.arith.mult = { ...state.arith.mult, ...(heavy.arith.mult || {}) };
      state.arith.div = { ...state.arith.div, ...(heavy.arith.div || {}) };
      state.arith.A = {
        name: String(heavy.arith.aName || "NONE"),
        buffer: await wavBase64ToCanonical(heavy.arith.aWavBase64),
      };
      state.arith.B = {
        name: String(heavy.arith.bName || "NONE"),
        buffer: await wavBase64ToCanonical(heavy.arith.bWavBase64),
      };
      state.arith.render.outBuffer = null;
      state.arith.render.tempExists = false;
    }
  }
  if (chunk?.refs?.sourceName) state.sourceName = String(chunk.refs.sourceName);
  if (chunk?.ui?.tool) state.tool = String(chunk.ui.tool);
  if (chunk?.ui?.snapZeroCross !== undefined) state.snapZeroCross = Boolean(chunk.ui.snapZeroCross);
  stopPreview();
  syncUiFromState();
  draw();
  runtime.sessionDirty = false;
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
  if (typeof invoke !== "function") return null;
  try {
    const path = await invoke("dialog_open_file", {
      defaultDir: runtime.paths?.mater || null,
      filters: [{ name: "Audio", extensions: ["wav", "aiff", "aif", "flac", "mp3", "ogg"] }],
      dialogKey: "prim.loadAudio",
    });
    if (!path) return null;
    const base64 = await invoke("read_file_base64", { path: String(path) });
    const name = String(path).split(/[\\/]/).pop() || "audio.wav";
    return { name, arrayBuffer: base64ToArrayBuffer(base64) };
  } catch {
    return null;
  }
}

async function saveBlobWithDialogPath(blob, filename) {
  const invoke = getInvoke();
  if (typeof invoke !== "function") return null;
  try {
    return await invoke("dialog_save_file", {
      defaultDir: runtime.paths?.mater || null,
      suggestedName: filename,
      filters: [{ name: "WAV", extensions: ["wav"] }],
      dialogKey: "prim.saveWav",
    });
  } catch {
    return null;
  }
}

async function saveBlobToPath(blob, path) {
  const invoke = getInvoke();
  if (typeof invoke !== "function") return false;
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
      const fileName = indexedFileName(seq.stem, seq.ext, seq.nextIndex || 2);
      const targetPath = joinPath(seq.dir, fileName, seq.sep);
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

  const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
  const invoke = getInvoke();
  if (typeof invoke === "function") {
    const savePath = await invoke("dialog_save_file", {
      defaultDir: runtime.paths?.mater || null,
      suggestedName: filename,
      filters: [{ name: "WAV", extensions: ["wav"] }],
      dialogKey: "prim.saveWav",
    });
    if (!savePath) return "cancelled";
    const ok = await invoke("save_blob_to_path", { dataBase64, path: savePath });
    return ok ? "saved" : "cancelled";
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 3000);
  return "saved";
}

function arithToStereo(canonical) {
  if (!canonical) return null;
  const channels = Math.max(1, canonical.channels || 1);
  const out = makeCanonical(2, canonical.frames, canonical.sr);
  const left = canonical.data[0] || new Float32Array(canonical.frames);
  const right = channels > 1 ? canonical.data[1] : left;
  out.data[0].set(left);
  out.data[1].set(right);
  return out;
}

function arithResampleLinear(input, targetSr) {
  if (!input) return null;
  if (input.sr === targetSr) return cloneBuffer(input);
  const ratio = targetSr / Math.max(1, input.sr);
  const targetFrames = Math.max(1, Math.round(input.frames * ratio));
  const out = makeCanonical(input.channels, targetFrames, targetSr);
  for (let ch = 0; ch < input.channels; ch += 1) {
    const src = input.data[ch];
    const dst = out.data[ch];
    for (let i = 0; i < targetFrames; i += 1) {
      const pos = (i / Math.max(1, targetFrames - 1)) * Math.max(0, input.frames - 1);
      const i0 = Math.floor(pos);
      const i1 = Math.min(input.frames - 1, i0 + 1);
      const t = pos - i0;
      dst[i] = src[i0] * (1 - t) + src[i1] * t;
    }
  }
  return out;
}

function arithMatchLength(a, b, lenMode) {
  const mode = String(lenMode || "TRIM").toUpperCase();
  const target = mode === "PAD" ? Math.max(a.frames, b.frames) : Math.min(a.frames, b.frames);
  const outA = makeCanonical(a.channels, target, a.sr);
  const outB = makeCanonical(b.channels, target, b.sr);
  for (let ch = 0; ch < outA.channels; ch += 1) {
    outA.data[ch].set(a.data[ch].subarray(0, Math.min(target, a.frames)));
    outB.data[ch].set(b.data[ch].subarray(0, Math.min(target, b.frames)));
  }
  return { A: outA, B: outB };
}

function arithRms(ch) {
  let sum = 0;
  for (let i = 0; i < ch.length; i += 1) sum += ch[i] * ch[i];
  return Math.sqrt(sum / Math.max(1, ch.length));
}

function arithDot(a, b) {
  let sum = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) sum += a[i] * b[i];
  return sum;
}

function arithSoftClipInPlace(buf) {
  for (let ch = 0; ch < buf.channels; ch += 1) {
    const d = buf.data[ch];
    for (let i = 0; i < d.length; i += 1) d[i] = Math.tanh(d[i] * 1.35);
  }
}

function arithRemoveDcInPlace(buf) {
  for (let ch = 0; ch < buf.channels; ch += 1) {
    const d = buf.data[ch];
    let mean = 0;
    for (let i = 0; i < d.length; i += 1) mean += d[i];
    mean /= Math.max(1, d.length);
    for (let i = 0; i < d.length; i += 1) d[i] -= mean;
  }
}

function arithFindBestLag(a, b, sr) {
  const maxLag = Math.max(1, Math.round(sr * 0.2));
  let bestLag = 0;
  let bestScore = -Infinity;
  for (let lag = -maxLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < a.length; i += 1) {
      const j = i + lag;
      if (j < 0 || j >= b.length) continue;
      sum += a[i] * b[j];
      count += 1;
    }
    if (count < 8) continue;
    const score = sum / count;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  return bestLag;
}

function arithShiftChannel(ch, lag) {
  const out = new Float32Array(ch.length);
  for (let i = 0; i < ch.length; i += 1) {
    const src = i + lag;
    out[i] = src >= 0 && src < ch.length ? ch[src] : 0;
  }
  return out;
}

function arithAlignB(A, B) {
  const lag = arithFindBestLag(A.data[0], B.data[0], A.sr);
  const out = cloneBuffer(B);
  for (let ch = 0; ch < out.channels; ch += 1) out.data[ch] = arithShiftChannel(B.data[ch], lag);
  return out;
}

function arithEnvelope(ch, smoothMs, sr) {
  const out = new Float32Array(ch.length);
  const tc = Math.max(0.001, smoothMs / 1000);
  const alpha = 1 - Math.exp(-1 / Math.max(1, sr * tc));
  let y = 0;
  for (let i = 0; i < ch.length; i += 1) {
    const x = Math.abs(ch[i]);
    y += alpha * (x - y);
    out[i] = y;
  }
  let peak = 1e-9;
  for (let i = 0; i < out.length; i += 1) if (out[i] > peak) peak = out[i];
  const inv = 1 / peak;
  for (let i = 0; i < out.length; i += 1) out[i] *= inv;
  return out;
}

function arithPrepareAB() {
  const aRaw = arithToStereo(state.arith.A.buffer);
  const bRaw = arithToStereo(state.arith.B.buffer);
  if (!aRaw || !bRaw) return null;
  const bRs = arithResampleLinear(bRaw, aRaw.sr);
  return arithMatchLength(aRaw, bRs, state.arith.lenMode);
}

function arithRenderDiff(A, B) {
  const out = makeCanonical(2, A.frames, A.sr);
  const dirAB = state.arith.diff.dir === "A-B";
  const leftSrc = dirAB ? A : B;
  let rightSrc = dirAB ? B : A;
  if (state.arith.diff.align) rightSrc = arithAlignB(leftSrc, rightSrc);
  for (let ch = 0; ch < out.channels; ch += 1) {
    const l = leftSrc.data[ch];
    const r = rightSrc.data[ch];
    let k = 1;
    if (state.arith.diff.gainMatch === "RMS") {
      const rr = arithRms(r);
      k = rr > 1e-9 ? arithRms(l) / rr : 1;
    } else if (state.arith.diff.gainMatch === "LSQ") {
      const den = arithDot(r, r);
      k = den > 1e-9 ? arithDot(l, r) / den : 1;
    }
    for (let i = 0; i < out.frames; i += 1) out.data[ch][i] = l[i] - r[i] * k;
  }
  if (state.arith.diff.clamp) arithSoftClipInPlace(out);
  return out;
}

function arithRenderMult(A, B) {
  const out = makeCanonical(2, A.frames, A.sr);
  const mode = state.arith.mult.mode;
  const wet = clamp(Number(state.arith.mult.mix) || 1, 0, 1);
  const envL = mode === "ENV" ? arithEnvelope(B.data[0], state.arith.mult.envSmoothMs, A.sr) : null;
  const envR = mode === "ENV" ? arithEnvelope(B.data[1], state.arith.mult.envSmoothMs, A.sr) : null;
  const srcA = cloneBuffer(A);
  const srcB = cloneBuffer(B);
  if (state.arith.mult.dcKill) {
    arithRemoveDcInPlace(srcA);
    arithRemoveDcInPlace(srcB);
  }
  for (let ch = 0; ch < out.channels; ch += 1) {
    const a = srcA.data[ch];
    const b = srcB.data[ch];
    const env = ch === 0 ? envL : envR;
    for (let i = 0; i < out.frames; i += 1) {
      const y = mode === "ENV" ? a[i] * env[i] : a[i] * b[i];
      out.data[ch][i] = a[i] * (1 - wet) + y * wet;
    }
  }
  arithSoftClipInPlace(out);
  return out;
}

function arithRenderDiv(A, B) {
  const out = makeCanonical(2, A.frames, A.sr);
  const eps = clamp(Number(state.arith.div.eps) || 0.02, 0.0001, 0.5);
  const mode = state.arith.div.mode;
  const gain = clamp(Number(state.arith.div.gain) || 1.4, 0, 8);
  const signed = state.arith.div.sign === "SIGNED";
  for (let ch = 0; ch < out.channels; ch += 1) {
    const a = A.data[ch];
    const b = B.data[ch];
    const d = out.data[ch];
    for (let i = 0; i < out.frames; i += 1) {
      const den = eps + Math.abs(b[i]);
      const s = signed ? (b[i] >= 0 ? 1 : -1) : 1;
      if (mode === "SHAPER") {
        d[i] = Math.tanh(a[i] * ((gain / den) * s));
      } else {
        const base = clamp((a[i] / den) * s, -8, 8);
        d[i] = base;
      }
    }
  }
  if (state.arith.div.clamp || mode === "SAFE") arithSoftClipInPlace(out);
  return out;
}

function arithRenderCurrent() {
  const prepared = arithPrepareAB();
  if (!prepared) return null;
  const { A, B } = prepared;
  if (state.arith.op === "MULT") return arithRenderMult(A, B);
  if (state.arith.op === "DIV") return arithRenderDiv(A, B);
  return arithRenderDiff(A, B);
}

function arithStopPreview() {
  if (runtime.arithPreviewSource) {
    try { runtime.arithPreviewSource.stop(); } catch {}
    runtime.arithPreviewSource.disconnect();
    runtime.arithPreviewSource = null;
  }
  if (runtime.arithPreviewMeterRaf) {
    cancelAnimationFrame(runtime.arithPreviewMeterRaf);
    runtime.arithPreviewMeterRaf = null;
  }
  runtime.arithPreviewAnalyser = null;
  if (runtime.arithPreviewPlayToken) {
    globalPlayStop(runtime.arithPreviewPlayToken);
    runtime.arithPreviewPlayToken = null;
  }
  state.arith.preview.playing = false;
  window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
}

function drawArithWave() {
  const canvas = refs.arithWaveCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.fillRect(0, 0, width, height);
  const out = state.arith.render.outBuffer;
  if (!out) return;
  const ch = out.data[0];
  const spp = Math.max(1, Math.floor(ch.length / width));
  ctx.strokeStyle = "#2f3132";
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    const start = x * spp;
    const end = Math.min(ch.length, start + spp);
    let min = 1, max = -1;
    for (let i = start; i < end; i += 1) {
      const v = ch[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const y1 = ((1 - max) * 0.5) * height;
    const y2 = ((1 - min) * 0.5) * height;
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
  }
  ctx.stroke();
}

function updateStats() {
  const lenSec = state.base ? (state.sampleLenFrames / state.base.sr) : 0;
  const sel = state.selection ? `${(state.selection.a / state.base.sr).toFixed(2)}..${(state.selection.b / state.base.sr).toFixed(2)}S` : "NONE";
  refs.stats.textContent = `LEN: ${lenSec.toFixed(2)}S | SEGS: ${state.segments.length} | SEL: ${sel}`;
}

function syncToolUi() {
  refs.toolButtons.forEach((btn) => btn.setAttribute("aria-pressed", btn.dataset.tool === state.tool ? "true" : "false"));
}

function syncUiFromState() {
  const arithMode = state.subtab === "ARITH";
  refs.primTabEditorBtn?.setAttribute("aria-pressed", arithMode ? "false" : "true");
  refs.primTabArithBtn?.setAttribute("aria-pressed", arithMode ? "true" : "false");
  document.querySelectorAll(".prim-edit-only").forEach((el) => el.classList.toggle("prim-hidden", arithMode));
  refs.arithView?.classList.toggle("prim-hidden", !arithMode);

  refs.snapBtn.setAttribute("aria-pressed", state.snapZeroCross ? "true" : "false");
  refs.snapBtn.textContent = state.snapZeroCross ? "SNAP ZC ON" : "SNAP ZC OFF";
  refs.loopBtn.checked = Boolean(state.preview.loop);
  refs.playBtn?.setAttribute("aria-pressed", state.preview.playing ? "true" : "false");
  if (refs.playBtn) refs.playBtn.textContent = state.preview.playing ? "PAUSE" : "PLAY";
  const hasTemp = Boolean(runtime.renderedOut);
  const hasPlayable = Boolean(state.base);
  if (refs.playBtn) refs.playBtn.disabled = !hasPlayable;
  if (refs.saveBtn) refs.saveBtn.disabled = !hasTemp;
  if (refs.sendBtn) refs.sendBtn.disabled = !hasTemp;
  if (refs.renderOutBtn) refs.renderOutBtn.disabled = !state.base;
  refs.sendInfo.textContent = hasTemp ? "TEMP READY" : "TEMP: NONE";
  refs.dupMode.value = state.dup.mode;
  refs.dupCount.value = String(state.dup.count);
  if (refs.dupExtendBtn) {
    refs.dupExtendBtn.setAttribute("aria-pressed", state.dupAutoExtend ? "true" : "false");
    refs.dupExtendBtn.textContent = state.dupAutoExtend ? "INS EXT ON" : "INS EXT OFF";
  }
  refs.fOn.setAttribute("aria-pressed", state.fx.filter.enabled ? "true" : "false");
  refs.fPreview.setAttribute("aria-pressed", state.fx.filter.preview ? "true" : "false");
  refs.fType.value = state.fx.filter.type;
  refs.fCutoff.value = String(state.fx.filter.cutoff);
  refs.fQ.value = String(state.fx.filter.q);
  refs.fDrive.value = String(state.fx.filter.drive);
  refs.fMix.value = String(state.fx.filter.mix);
  refs.rOn.setAttribute("aria-pressed", state.fx.reverb.enabled ? "true" : "false");
  refs.rPreview.setAttribute("aria-pressed", state.fx.reverb.preview ? "true" : "false");
  refs.rSec.value = String(state.fx.reverb.seconds);
  refs.rPredelay.value = String(state.fx.reverb.preDelayMs);
  refs.rDamp.value = String(state.fx.reverb.damp);
  refs.rMix.value = String(state.fx.reverb.mix);
  refs.rTail.setAttribute("aria-pressed", state.fx.reverb.tailExtend ? "true" : "false");
  refs.rTail.textContent = state.fx.reverb.tailExtend ? "ON" : "OFF";
  refs.tOn.setAttribute("aria-pressed", state.tapestop.enabled ? "true" : "false");
  refs.tPreview.setAttribute("aria-pressed", state.tapestop.preview ? "true" : "false");
  refs.tTime.value = String(state.tapestop.timeMs);
  refs.tCurve.value = state.tapestop.curve;
  refs.tFloor.value = String(state.tapestop.floor);
  refs.tFade.value = String(state.tapestop.tailFadeMs);
  refs.abBtn.setAttribute("aria-pressed", state.preview.useAB ? "true" : "false");
  refs.abBtn.textContent = state.preview.useAB ? "A/B ON" : "A/B OFF";
  if (refs.recRefreshBtn) refs.recRefreshBtn.disabled = refs.recBtn.disabled;
  if (refs.recInputSelect) refs.recInputSelect.disabled = refs.recBtn.disabled || !state.rec.devices.length;
  updateRecDeviceInfoLine();
  syncToolUi();
  updateStats();

  if (refs.arithAInfo) refs.arithAInfo.textContent = `A: ${state.arith.A.name}`;
  if (refs.arithBInfo) refs.arithBInfo.textContent = `B: ${state.arith.B.name}`;
  if (refs.arithStats) {
    const aSec = state.arith.A.buffer ? (state.arith.A.buffer.frames / state.arith.A.buffer.sr) : 0;
    const bSec = state.arith.B.buffer ? (state.arith.B.buffer.frames / state.arith.B.buffer.sr) : 0;
    refs.arithStats.textContent = `A: ${aSec.toFixed(2)}S | B: ${bSec.toFixed(2)}S`;
  }
  if (refs.arithLenMode) refs.arithLenMode.value = state.arith.lenMode;
  refs.arithOpDiffBtn?.setAttribute("aria-pressed", state.arith.op === "DIFF" ? "true" : "false");
  refs.arithOpMultBtn?.setAttribute("aria-pressed", state.arith.op === "MULT" ? "true" : "false");
  refs.arithOpDivBtn?.setAttribute("aria-pressed", state.arith.op === "DIV" ? "true" : "false");
  refs.arithDiffPanel?.classList.toggle("prim-hidden", state.arith.op !== "DIFF");
  refs.arithMultPanel?.classList.toggle("prim-hidden", state.arith.op !== "MULT");
  refs.arithDivPanel?.classList.toggle("prim-hidden", state.arith.op !== "DIV");
  if (refs.arithDiffDir) refs.arithDiffDir.value = state.arith.diff.dir;
  refs.arithDiffAlignBtn?.setAttribute("aria-pressed", state.arith.diff.align ? "true" : "false");
  if (refs.arithDiffAlignBtn) refs.arithDiffAlignBtn.textContent = state.arith.diff.align ? "ON" : "OFF";
  if (refs.arithDiffGainMatch) refs.arithDiffGainMatch.value = state.arith.diff.gainMatch;
  refs.arithDiffClampBtn?.setAttribute("aria-pressed", state.arith.diff.clamp ? "true" : "false");
  if (refs.arithDiffClampBtn) refs.arithDiffClampBtn.textContent = state.arith.diff.clamp ? "ON" : "OFF";
  if (refs.arithMultMode) refs.arithMultMode.value = state.arith.mult.mode;
  if (refs.arithMultEnvSmooth) refs.arithMultEnvSmooth.value = String(state.arith.mult.envSmoothMs);
  refs.arithMultDcKillBtn?.setAttribute("aria-pressed", state.arith.mult.dcKill ? "true" : "false");
  if (refs.arithMultDcKillBtn) refs.arithMultDcKillBtn.textContent = state.arith.mult.dcKill ? "ON" : "OFF";
  if (refs.arithMultMix) refs.arithMultMix.value = String(Math.round(state.arith.mult.mix * 100));
  if (refs.arithDivMode) refs.arithDivMode.value = state.arith.div.mode;
  if (refs.arithDivEps) refs.arithDivEps.value = String(state.arith.div.eps);
  if (refs.arithDivGain) refs.arithDivGain.value = String(state.arith.div.gain);
  if (refs.arithDivSign) refs.arithDivSign.value = state.arith.div.sign;
  refs.arithDivClampBtn?.setAttribute("aria-pressed", state.arith.div.clamp ? "true" : "false");
  if (refs.arithDivClampBtn) refs.arithDivClampBtn.textContent = state.arith.div.clamp ? "ON" : "OFF";
  if (refs.arithRenderBtn) refs.arithRenderBtn.disabled = state.arith.render.busy || !state.arith.A.buffer || !state.arith.B.buffer;
  if (refs.arithPlayBtn) refs.arithPlayBtn.disabled = !state.arith.render.tempExists;
  if (refs.arithPlayBtn) {
    refs.arithPlayBtn.setAttribute("aria-pressed", state.arith.preview.playing ? "true" : "false");
    refs.arithPlayBtn.textContent = state.arith.preview.playing ? "PAUSE" : "PLAY";
  }
  if (refs.arithLoopBtn) {
    refs.arithLoopBtn.checked = Boolean(state.arith.preview.loop);
    refs.arithLoopBtn.disabled = !state.arith.render.tempExists;
  }
  if (refs.arithSaveBtn) refs.arithSaveBtn.disabled = !state.arith.render.tempExists;
  if (refs.arithSendBtn) refs.arithSendBtn.disabled = !state.arith.render.tempExists;
  if (refs.arithRenderInfo) refs.arithRenderInfo.textContent = state.arith.render.tempExists ? "TEMP READY" : "TEMP: NONE";
  if (refs.arithRenderingBar) refs.arithRenderingBar.classList.toggle("busy", state.arith.render.busy);
  drawArithWave();
}

function draw() {
  const canvas = refs.waveCanvas;
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(47,49,50,0.2)";
  ctx.beginPath();
  ctx.moveTo(0, height * 0.5);
  ctx.lineTo(width, height * 0.5);
  ctx.stroke();

  if (!state.base || state.sampleLenFrames <= 0) return;
  const dry = renderDry();
  if (!dry) return;
  const ch = dry.data[0];
  const samplesPerPixel = Math.max(1, Math.floor(ch.length / width));
  ctx.strokeStyle = "#2f3132";
  ctx.lineWidth = Math.max(1, Math.floor(ratio));
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    const start = x * samplesPerPixel;
    const end = Math.min(ch.length, start + samplesPerPixel);
    let min = 1;
    let max = -1;
    for (let i = start; i < end; i += 1) {
      const v = ch[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const y1 = ((1 - max) * 0.5) * height;
    const y2 = ((1 - min) * 0.5) * height;
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
  }
  ctx.stroke();

  for (const seg of state.segments) {
    const x1 = xFromFrame(seg.dstStart, width);
    const x2 = xFromFrame(seg.dstStart + seg.srcLength, width);
    const y = ((1 - clamp(seg.yNorm, -1, 1)) * 0.5) * height;
    ctx.strokeStyle = seg.muted ? "rgba(138,58,45,0.65)" : "rgba(31,111,100,0.45)";
    ctx.strokeRect(x1, 1, Math.max(1, x2 - x1), height - 2);
    ctx.strokeStyle = "rgba(47,49,50,0.34)";
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  }

  if (state.selection) {
    const xa = xFromFrame(state.selection.a, width);
    const xb = xFromFrame(state.selection.b, width);
    ctx.fillStyle = "rgba(31,111,100,0.12)";
    ctx.fillRect(Math.min(xa, xb), 0, Math.abs(xb - xa), height);
  }

  const phx = xFromFrame(state.playheadFrame, width);
  ctx.strokeStyle = "rgba(47,49,50,0.8)";
  ctx.beginPath();
  ctx.moveTo(phx, 0);
  ctx.lineTo(phx, height);
  ctx.stroke();
}

function applySelectionRange(a, b) {
  if (!state.base) return;
  let aa = clamp(Math.round(a), 0, state.sampleLenFrames);
  let bb = clamp(Math.round(b), 0, state.sampleLenFrames);
  if (aa > bb) [aa, bb] = [bb, aa];
  if (state.snapZeroCross) {
    aa = maybeSnapFrame(aa);
    bb = maybeSnapFrame(bb);
    if (aa > bb) [aa, bb] = [bb, aa];
  }
  if (bb - aa < 1) {
    state.selection = null;
  } else {
    state.selection = { a: aa, b: bb };
  }
  updateStats();
  draw();
}

function getSelectionOrAll() {
  if (state.selection) return { a: state.selection.a, b: state.selection.b };
  return { a: 0, b: state.sampleLenFrames };
}

function reverseSelection() {
  if (!state.base) return;
  const { a, b } = getSelectionOrAll();
  pushUndo("REVERSE");
  splitSegmentsAt(a);
  splitSegmentsAt(b);
  const inRange = [];
  const outRange = [];
  for (const seg of state.segments) {
    if (seg.dstStart >= a && seg.dstStart + seg.srcLength <= b) inRange.push(seg);
    else outRange.push(seg);
  }
  inRange.reverse();
  let cursor = a;
  for (const seg of inRange) {
    seg.dstStart = cursor;
    seg.reversed = !seg.reversed;
    cursor += seg.srcLength;
  }
  state.segments = [...outRange, ...inRange];
  sortSegments();
  draw();
  setStatus("REVERSED");
}

function deleteSelectionSilence() {
  if (!state.base || !state.selection) return;
  const { a, b } = state.selection;
  pushUndo("DELETE");
  splitSegmentsAt(a);
  splitSegmentsAt(b);
  for (const seg of state.segments) {
    if (seg.dstStart >= a && seg.dstStart + seg.srcLength <= b) seg.muted = true;
  }
  draw();
  setStatus("DELETED (SILENCE)");
}

function bakeTransformedBuffer(newBase, actionLabel) {
  pushUndo(actionLabel);
  state.base = newBase;
  state.sampleLenFrames = newBase.frames;
  state.selection = null;
  state.playheadFrame = 0;
  resetSegmentsToWhole();
  refs.lengthSec.value = (newBase.frames / newBase.sr).toFixed(2);
  runtime.renderedOut = cloneBuffer(newBase);
  updateStats();
  draw();
}

function transformSelectionHalfDouble(isHalf) {
  if (!state.base) return;
  const src = renderDry();
  if (!src) return;
  const { a, b } = getSelectionOrAll();
  const len = b - a;
  if (len < 2) return;
  const out = cloneBuffer(src);
  for (let ch = 0; ch < out.channels; ch += 1) {
    const d = out.data[ch];
    if (isHalf) {
      const halfLen = Math.max(1, Math.floor(len * 0.5));
      for (let i = 0; i < len; i += 1) {
        const rel = i % halfLen;
        const srcPos = a + Math.floor((rel / halfLen) * len);
        d[a + i] = d[srcPos];
      }
    } else {
      for (let i = 0; i < len; i += 1) {
        const srcPos = a + Math.floor((i / len) * (len * 0.5));
        d[a + i] = d[srcPos];
      }
    }
  }
  bakeTransformedBuffer(clampAudio(out), isHalf ? "HALF" : "DOUBLE");
  setStatus(isHalf ? "HALF APPLIED" : "DOUBLE APPLIED");
}

function duplicateSelection() {
  if (!state.base || !state.selection) return;
  const { a, b } = state.selection;
  const selLen = b - a;
  if (selLen < 2) return;
  const dry = renderDry();
  if (!dry) return;
  const mode = state.dup.mode;
  const count = clamp(Number(state.dup.count) || 1, 1, 8);
  const outFrames = mode === "INSERT" && state.dupAutoExtend
    ? dry.frames + (selLen * count)
    : dry.frames;
  const out = makeCanonical(dry.channels, outFrames, dry.sr);
  for (let ch = 0; ch < dry.channels; ch += 1) {
    out.data[ch].set(dry.data[ch].subarray(0, Math.min(dry.frames, outFrames)));
  }
  const targetStart = state.selection.a;
  if (mode === "INSERT") {
    const shift = selLen * count;
    for (let ch = 0; ch < out.channels; ch += 1) {
      const d = out.data[ch];
      for (let i = out.frames - 1; i >= targetStart + shift; i -= 1) d[i] = d[i - shift] ?? 0;
      for (let i = targetStart; i < Math.min(out.frames, targetStart + shift); i += 1) d[i] = 0;
    }
  }
  for (let rep = 0; rep < count; rep += 1) {
    const blockStart = targetStart + rep * selLen;
    if (blockStart >= out.frames) break;
    for (let ch = 0; ch < out.channels; ch += 1) {
      const d = out.data[ch];
      for (let i = 0; i < selLen; i += 1) {
        const dst = blockStart + i;
        if (dst < 0 || dst >= out.frames) continue;
        const srcRel = (() => {
          if (mode === "STUTTER") {
            const chunk = Math.max(1, Math.floor(selLen / count));
            return i % chunk;
          }
          if (mode === "MIRROR") {
            return i < selLen * 0.5 ? i * 2 : (selLen - 1 - (i - Math.floor(selLen * 0.5)) * 2);
          }
          if (mode === "PINGPONG") return rep % 2 === 0 ? i : selLen - 1 - i;
          return i;
        })();
        const srcIdx = clamp(a + srcRel, a, b - 1);
        if (mode === "OVERWRITE" || mode === "INSERT" || mode === "STUTTER" || mode === "MIRROR" || mode === "PINGPONG") {
          d[dst] = dry.data[ch][srcIdx];
        }
      }
    }
  }
  bakeTransformedBuffer(clampAudio(out), `DUP ${mode}`);
  setStatus(`DUP ${mode}`);
}

function applyLengthChange(newFrames) {
  if (!state.base || newFrames <= 16) return;
  const target = Math.round(newFrames);
  if (target === state.sampleLenFrames) return;
  pushUndo("LENGTH");
  const old = state.sampleLenFrames;
  state.sampleLenFrames = target;
  splitSegmentsAt(target);
  for (const seg of state.segments) {
    if (seg.dstStart >= target) seg.muted = true;
    if (seg.dstStart + seg.srcLength > target) seg.srcLength = target - seg.dstStart;
  }
  state.segments = state.segments.filter((s) => s.srcLength > 0);
  if (target > old) {
    const tail = { ...createWholeSegment(target - old), srcStart: 0, srcLength: target - old, dstStart: old, muted: true };
    state.segments.push(tail);
  }
  if (state.selection) applySelectionRange(state.selection.a, state.selection.b);
  state.playheadFrame = clamp(state.playheadFrame, 0, state.sampleLenFrames);
  runtime.renderedOut = null;
  updateStats();
  draw();
  setStatus(`LENGTH ${(target / state.base.sr).toFixed(2)}S`);
}

function findSegmentAtFrame(frame) {
  return state.segments.find((s) => frame >= s.dstStart && frame < s.dstStart + s.srcLength) || null;
}

function applyTapestopAt(frame) {
  if (!state.base || !state.tapestop.enabled) return;
  const src = renderDry();
  if (!src) return;
  const t0 = clamp(Math.round(frame), 0, src.frames - 1);
  const out = renderTapestop(src, t0);
  bakeTransformedBuffer(out, `TSTOP @ ${(t0 / src.sr).toFixed(2)}S`);
  setStatus(`TAPESTOP @ ${(t0 / src.sr).toFixed(2)}S`);
}

function schedulePreviewRender() {
  if (runtime.debouncedFxTimer) clearTimeout(runtime.debouncedFxTimer);
  runtime.debouncedFxTimer = setTimeout(() => {
    void renderOut().then(() => draw()).catch((err) => setStatus(String(err?.message || err), true));
  }, 180);
}

function updateRecProgress() {
  const elapsed = (Date.now() - runtime.recStartedAt) / 1000;
  const pct = clamp(elapsed / 8, 0, 1);
  refs.recProgress.style.width = `${Math.round(pct * 100)}%`;
  if (pct >= 1 && runtime.recorder?.state === "recording") runtime.recorder.stop();
}

function getUserMediaCompat(constraints) {
  const modern = navigator?.mediaDevices?.getUserMedia;
  if (typeof modern === "function") return modern.call(navigator.mediaDevices, constraints);
  const legacy = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  if (typeof legacy === "function") return new Promise((resolve, reject) => legacy.call(navigator, constraints, resolve, reject));
  return Promise.reject(new Error("getUserMedia unavailable"));
}

async function startRec() {
  try {
    runtime.stream = await getRecordingStreamForSelectedDevice();
    runtime.recChunks = [];
    runtime.recorder = new MediaRecorder(runtime.stream);
    runtime.recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) runtime.recChunks.push(event.data);
    };
    runtime.recorder.onstop = async () => {
      refs.recBtn.disabled = false;
      refs.stopRecBtn.disabled = true;
      refs.recBtn.setAttribute("aria-pressed", "false");
      if (refs.recRefreshBtn) refs.recRefreshBtn.disabled = false;
      if (refs.recInputSelect) refs.recInputSelect.disabled = !state.rec.devices.length;
      if (runtime.recTimer) clearInterval(runtime.recTimer);
      refs.recProgress.style.width = "0%";
      try {
        const blob = new Blob(runtime.recChunks, { type: runtime.recorder.mimeType || "audio/webm" });
        const arr = await blob.arrayBuffer();
        const ctx = ensureAudioContext();
        const decoded = await ctx.decodeAudioData(arr.slice(0));
        loadCanonical(canonicalFromAudioBuffer(decoded), "REC_8S");
        setStatus("REC READY");
      } catch (err) {
        setStatus(`REC FAILED: ${String(err?.message || err)}`, true);
      } finally {
        runtime.stream?.getTracks()?.forEach((t) => t.stop());
        runtime.stream = null;
        runtime.recorder = null;
      }
    };
    runtime.recorder.start();
    runtime.recStartedAt = Date.now();
    refs.recBtn.disabled = true;
    refs.stopRecBtn.disabled = false;
    refs.recBtn.setAttribute("aria-pressed", "true");
    if (refs.recRefreshBtn) refs.recRefreshBtn.disabled = true;
    if (refs.recInputSelect) refs.recInputSelect.disabled = true;
    runtime.recTimer = setInterval(updateRecProgress, 80);
  } catch (err) {
    setStatus(`REC FAILED: ${String(err?.message || err)}`, true);
  }
}

function stopRec() {
  if (runtime.recorder?.state === "recording") runtime.recorder.stop();
}

function stopPreview() {
  if (runtime.previewSource) {
    try { runtime.previewSource.stop(); } catch {}
    runtime.previewSource.disconnect();
    runtime.previewSource = null;
  }
  if (runtime.previewMeterRaf) {
    cancelAnimationFrame(runtime.previewMeterRaf);
    runtime.previewMeterRaf = null;
  }
  runtime.previewAnalyser = null;
  if (runtime.previewPlayToken) {
    globalPlayStop(runtime.previewPlayToken);
    runtime.previewPlayToken = null;
  }
  window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
  state.preview.playing = false;
  refs.playBtn?.setAttribute("aria-pressed", "false");
  syncUiFromState();
}

function startPreviewMeterLoop() {
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
  if (runtime.previewMeterRaf) cancelAnimationFrame(runtime.previewMeterRaf);
  runtime.previewMeterRaf = requestAnimationFrame(tick);
}

function panicStopRec() {
  if (runtime.recTimer) {
    clearInterval(runtime.recTimer);
    runtime.recTimer = null;
  }
  if (runtime.recorder?.state === "recording") {
    try { runtime.recorder.stop(); } catch {}
  }
  try {
    runtime.stream?.getTracks()?.forEach((t) => t.stop());
  } catch {
    // Ignore stream shutdown errors.
  }
  runtime.stream = null;
  runtime.recorder = null;
  refs.recProgress.style.width = "0%";
  refs.recBtn.disabled = false;
  refs.stopRecBtn.disabled = true;
  refs.recBtn.setAttribute("aria-pressed", "false");
  if (refs.recRefreshBtn) refs.recRefreshBtn.disabled = false;
  if (refs.recInputSelect) refs.recInputSelect.disabled = !state.rec.devices.length;
}

async function handlePanicKill() {
  stopPreview();
  arithStopPreview();
  panicStopRec();
  if (runtime.audioContext) {
    try {
      await runtime.audioContext.close();
    } catch {
      // Ignore close errors.
    }
    runtime.audioContext = null;
  }
  setStatus("PANIC KILL");
}

function publishMeterLevel(buffer) {
  if (!buffer || buffer.frames < 1) return;
  let max = 0;
  const n = Math.min(buffer.frames, 4096);
  for (let ch = 0; ch < buffer.channels; ch += 1) {
    const d = buffer.data[ch];
    for (let i = 0; i < n; i += 1) {
      const v = Math.abs(d[i]);
      if (v > max) max = v;
    }
  }
  window.parent?.postMessage({ type: "denarrator-meter", level: clamp(max, 0, 1) }, "*");
}

async function playPreview() {
  if (!state.base) return;
  stopPreview();
  const out = runtime.renderedOut || renderDry();
  if (!out) return;
  const ctx = ensureAudioContext();
  if (ctx.state === "suspended") await ctx.resume();
  const src = ctx.createBufferSource();
  const dry = renderDry();
  const toPlay = state.preview.useAB ? dry : out;
  if (!toPlay) return;
  src.buffer = bufferToAudioBuffer(toPlay);
  src.loop = state.preview.loop;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  src.connect(analyser);
  analyser.connect(ctx.destination);
  runtime.previewAnalyser = analyser;
  src.onended = () => {
    state.preview.playing = false;
    if (runtime.previewPlayToken) {
      globalPlayStop(runtime.previewPlayToken);
      runtime.previewPlayToken = null;
    }
    if (runtime.previewSource === src) runtime.previewSource = null;
    if (runtime.previewMeterRaf) {
      cancelAnimationFrame(runtime.previewMeterRaf);
      runtime.previewMeterRaf = null;
    }
    window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
    syncUiFromState();
  };
  runtime.previewSource = src;
  runtime.previewPlayToken = globalPlayStart("preview");
  src.start(0);
  publishMeterLevel(toPlay);
  state.preview.playing = true;
  startPreviewMeterLoop();
  refs.playBtn?.setAttribute("aria-pressed", "true");
  syncUiFromState();
}

async function saveCurrentWav() {
  if (!state.base) return;
  const out = runtime.renderedOut;
  if (!out) {
    setStatus("NO TEMP RENDER", true);
    return;
  }
  if (!out) return;
  const name = `${sanitizeName(state.sourceName)}_prim.wav`;
  const result = await saveBlob(audioBufferToWavBlob(out), name);
  setStatus(result === "saved" ? `SAVED ${name}` : "SAVE CANCELLED", result !== "saved");
}

async function sendToLazy() {
  if (!state.base) return;
  const out = runtime.renderedOut;
  if (!out) {
    setStatus("NO TEMP RENDER", true);
    return;
  }
  if (!out) return;
  const blob = audioBufferToWavBlob(out);
  const wavBytesBase64 = arrayBufferToBase64(await blob.arrayBuffer());
  window.parent?.postMessage({
    type: "CLIPLIB_ADD",
    version: 1,
    target: "lazy",
    name: `${sanitizeName(state.sourceName)}_prim`,
    wavBytesBase64,
    meta: { sr: out.sr, channels: out.channels, frames: out.frames, durationSec: out.frames / out.sr },
    source: "prim",
  }, "*");
  refs.sendInfo.textContent = "SENDING TO LAZY...";
}

async function loadCanonical(canonical, sourceName) {
  pushUndo("LOAD");
  state.sourceName = sourceName || "SOURCE";
  state.base = canonical;
  state.sampleLenFrames = canonical.frames;
  state.selection = null;
  state.playheadFrame = 0;
  state.segments = [createWholeSegment(canonical.frames)];
  refs.lengthSec.value = (canonical.frames / canonical.sr).toFixed(2);
  refs.sourceInfo.textContent = `SOURCE: ${state.sourceName}`;
  runtime.renderedOut = null;
  updateStats();
  syncUiFromState();
  draw();
}

function handleCanvasPointerDown(event) {
  if (!state.base) return;
  const rect = refs.waveCanvas.getBoundingClientRect();
  const frame = frameFromX(event.clientX, rect);
  state.playheadFrame = frame;
  if (state.tool === "SCISSOR") {
    pushUndo("SCISSOR");
    splitSegmentsAt(maybeSnapFrame(frame));
    draw();
    setStatus(`SPLIT @ ${(frame / state.base.sr).toFixed(2)}S`);
    return;
  }
  if (state.tool === "DELETE") {
    if (state.selection) {
      deleteSelectionSilence();
    }
    return;
  }
  if (state.tool === "REVERSE") {
    reverseSelection();
    return;
  }
  if (state.tool === "DUPLICATE") {
    duplicateSelection();
    return;
  }
  if (state.tool === "HALF") {
    transformSelectionHalfDouble(true);
    return;
  }
  if (state.tool === "DOUBLE") {
    transformSelectionHalfDouble(false);
    return;
  }
  if (state.tool === "TSTOP") {
    state.tapestop.anchorFrame = maybeSnapFrame(frame);
    setStatus(`TSTOP ANCHOR @ ${(state.tapestop.anchorFrame / state.base.sr).toFixed(2)}S (RENDER TO HEAR)`);
    return;
  }
  if (state.tool === "SELECT") {
    runtime.drag = { mode: "select", startFrame: frame };
    applySelectionRange(frame, frame);
    return;
  }
  if (state.tool === "ARROW") {
    const seg = findSegmentAtFrame(frame);
    if (seg) {
      pushUndo("MOVE");
      runtime.drag = {
        mode: "move",
        pointerStartFrame: frame,
        pointerStartY: event.clientY,
        selectedIds: state.selection
          ? state.segments.filter((s) => s.dstStart >= state.selection.a && s.dstStart + s.srcLength <= state.selection.b).map((s) => s.id)
          : [seg.id],
        baseline: state.segments.map((s) => ({ id: s.id, dstStart: s.dstStart, yNorm: s.yNorm })),
      };
      return;
    }
    runtime.drag = { mode: "seek" };
  }
}

function handleCanvasPointerMove(event) {
  if (!runtime.drag || !state.base) return;
  const rect = refs.waveCanvas.getBoundingClientRect();
  const frame = frameFromX(event.clientX, rect);
  if (runtime.drag.mode === "select") {
    applySelectionRange(runtime.drag.startFrame, frame);
    return;
  }
  if (runtime.drag.mode === "move") {
    const dx = frame - runtime.drag.pointerStartFrame;
    const dy = (event.clientY - runtime.drag.pointerStartY) / rect.height;
    for (const seg of state.segments) {
      if (!runtime.drag.selectedIds.includes(seg.id)) continue;
      const base = runtime.drag.baseline.find((b) => b.id === seg.id);
      if (!base) continue;
      seg.dstStart = clamp(Math.round(base.dstStart + dx), 0, Math.max(0, state.sampleLenFrames - seg.srcLength));
      seg.yNorm = clamp(base.yNorm - dy * 2, -1, 1);
    }
    sortSegments();
    draw();
  }
}

function handleCanvasPointerUp() {
  if (!runtime.drag) return;
  if (runtime.drag.mode === "move") {
    setStatus("MOVED SEGMENTS");
  }
  runtime.drag = null;
  draw();
}

function applyPresetById(id) {
  const preset = PRESETS.find((p) => p.id === id);
  if (!preset) return;
  pushUndo("PRESET");
  state.snapZeroCross = Boolean(preset.snapZeroCross);
  state.dup.mode = preset.dup.mode;
  state.dup.count = preset.dup.count;
  state.fx.filter = { ...state.fx.filter, ...preset.fx.filter, preview: false };
  state.fx.reverb = { ...state.fx.reverb, ...preset.fx.reverb, preview: false };
  state.tapestop = { ...state.tapestop, ...preset.tapestop, preview: false, enabled: true };
  syncUiFromState();
  schedulePreviewRender();
  setStatus(`PRESET ${preset.name}`);
}

function bindEvents() {
  refs.primTabEditorBtn?.addEventListener("click", () => {
    state.subtab = "EDITOR";
    syncUiFromState();
  });
  refs.primTabArithBtn?.addEventListener("click", () => {
    state.subtab = "ARITH";
    syncUiFromState();
  });

  const loadArithFile = async (slot, file) => {
    if (!file) return;
    try {
      const arr = await file.arrayBuffer();
      const decoded = await ensureAudioContext().decodeAudioData(arr.slice(0));
      state.arith[slot].buffer = arithToStereo(canonicalFromAudioBuffer(decoded));
      state.arith[slot].name = file.name.replace(/\.[^.]+$/, "");
      state.arith.render.outBuffer = null;
      state.arith.render.tempExists = false;
      markSessionDirty();
      syncUiFromState();
      setStatus(`ARITH ${slot} LOADED`);
    } catch (err) {
      setStatus(`ARITH LOAD FAILED: ${String(err?.message || err)}`, true);
    }
  };
  refs.arithLoadABtn?.addEventListener("click", async () => {
    const picked = await openAudioFileViaDialog();
    if (picked?.arrayBuffer) {
      await loadArithFile("A", new File([picked.arrayBuffer], picked.name || "A.wav", { type: "audio/wav" }));
      return;
    }
    refs.arithLoadAInput?.click();
  });
  refs.arithLoadBBtn?.addEventListener("click", async () => {
    const picked = await openAudioFileViaDialog();
    if (picked?.arrayBuffer) {
      await loadArithFile("B", new File([picked.arrayBuffer], picked.name || "B.wav", { type: "audio/wav" }));
      return;
    }
    refs.arithLoadBInput?.click();
  });
  refs.arithLoadAInput?.addEventListener("change", async () => {
    const file = refs.arithLoadAInput.files?.[0];
    refs.arithLoadAInput.value = "";
    await loadArithFile("A", file);
  });
  refs.arithLoadBInput?.addEventListener("change", async () => {
    const file = refs.arithLoadBInput.files?.[0];
    refs.arithLoadBInput.value = "";
    await loadArithFile("B", file);
  });
  refs.arithClrABtn?.addEventListener("click", () => {
    state.arith.A = { name: "NONE", buffer: null };
    state.arith.render.outBuffer = null;
    state.arith.render.tempExists = false;
    syncUiFromState();
  });
  refs.arithClrBBtn?.addEventListener("click", () => {
    state.arith.B = { name: "NONE", buffer: null };
    state.arith.render.outBuffer = null;
    state.arith.render.tempExists = false;
    syncUiFromState();
  });
  refs.arithSwapBtn?.addEventListener("click", () => {
    const a = state.arith.A;
    state.arith.A = state.arith.B;
    state.arith.B = a;
    markSessionDirty();
    syncUiFromState();
    setStatus("ARITH SWAP A/B");
  });
  refs.arithLenMode?.addEventListener("change", () => {
    state.arith.lenMode = refs.arithLenMode.value;
    markSessionDirty();
    syncUiFromState();
  });
  refs.arithOpDiffBtn?.addEventListener("click", () => { state.arith.op = "DIFF"; syncUiFromState(); });
  refs.arithOpMultBtn?.addEventListener("click", () => { state.arith.op = "MULT"; syncUiFromState(); });
  refs.arithOpDivBtn?.addEventListener("click", () => { state.arith.op = "DIV"; syncUiFromState(); });
  refs.arithDiffDir?.addEventListener("change", () => { state.arith.diff.dir = refs.arithDiffDir.value; markSessionDirty(); });
  refs.arithDiffAlignBtn?.addEventListener("click", () => {
    state.arith.diff.align = !state.arith.diff.align;
    markSessionDirty();
    syncUiFromState();
  });
  refs.arithDiffGainMatch?.addEventListener("change", () => { state.arith.diff.gainMatch = refs.arithDiffGainMatch.value; markSessionDirty(); });
  refs.arithDiffClampBtn?.addEventListener("click", () => {
    state.arith.diff.clamp = !state.arith.diff.clamp;
    markSessionDirty();
    syncUiFromState();
  });
  refs.arithMultMode?.addEventListener("change", () => { state.arith.mult.mode = refs.arithMultMode.value; markSessionDirty(); });
  refs.arithMultEnvSmooth?.addEventListener("input", () => { state.arith.mult.envSmoothMs = Number(refs.arithMultEnvSmooth.value); markSessionDirty(); });
  refs.arithMultDcKillBtn?.addEventListener("click", () => {
    state.arith.mult.dcKill = !state.arith.mult.dcKill;
    markSessionDirty();
    syncUiFromState();
  });
  refs.arithMultMix?.addEventListener("input", () => { state.arith.mult.mix = clamp(Number(refs.arithMultMix.value) / 100, 0, 1); markSessionDirty(); });
  refs.arithDivMode?.addEventListener("change", () => { state.arith.div.mode = refs.arithDivMode.value; markSessionDirty(); });
  refs.arithDivEps?.addEventListener("input", () => { state.arith.div.eps = Number(refs.arithDivEps.value); markSessionDirty(); });
  refs.arithDivGain?.addEventListener("input", () => { state.arith.div.gain = Number(refs.arithDivGain.value); markSessionDirty(); });
  refs.arithDivSign?.addEventListener("change", () => { state.arith.div.sign = refs.arithDivSign.value; markSessionDirty(); });
  refs.arithDivClampBtn?.addEventListener("click", () => {
    state.arith.div.clamp = !state.arith.div.clamp;
    markSessionDirty();
    syncUiFromState();
  });
  refs.arithRenderBtn?.addEventListener("click", () => {
    void (async () => {
      const rendered = arithRenderCurrent();
      if (!rendered) {
        setStatus("ARITH NEEDS A + B", true);
        return;
      }
      state.arith.render.busy = true;
      syncUiFromState();
      try {
        state.arith.render.outBuffer = rendered;
        state.arith.render.tempExists = true;
        const invoke = getInvoke();
        if (invoke) {
          const wavBytesBase64 = arrayBufferToBase64(await audioBufferToWavBlob(rendered).arrayBuffer());
          const tempPath = await invoke("write_temp_wav", { moduleId: "prim", wavBytesBase64 });
          state.arith.render.tempPath = tempPath ? String(tempPath) : null;
        }
        markSessionDirty();
        setStatus("ARITH RENDER DONE: TEMP READY");
      } catch (err) {
        setStatus(`ARITH RENDER FAILED: ${String(err?.message || err)}`, true);
      } finally {
        state.arith.render.busy = false;
        syncUiFromState();
      }
    })();
  });
  refs.arithPlayBtn?.addEventListener("click", async () => {
    if (runtime.arithPreviewSource || state.arith.preview.playing) {
      arithStopPreview();
      syncUiFromState();
      return;
    }
    if (!state.arith.render.outBuffer) return;
    const ctx = ensureAudioContext();
    if (ctx.state === "suspended") await ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = bufferToAudioBuffer(state.arith.render.outBuffer);
    src.loop = Boolean(state.arith.preview.loop);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    runtime.arithPreviewSource = src;
    runtime.arithPreviewAnalyser = analyser;
    runtime.arithPreviewPlayToken = globalPlayStart("arith");
    state.arith.preview.playing = true;
    src.onended = () => {
      if (runtime.arithPreviewSource === src) {
        arithStopPreview();
        syncUiFromState();
      }
    };
    src.start(0);
    syncUiFromState();
  });
  refs.arithLoopBtn?.addEventListener("change", () => {
    state.arith.preview.loop = !!refs.arithLoopBtn.checked;
    if (runtime.arithPreviewSource) runtime.arithPreviewSource.loop = state.arith.preview.loop;
    syncUiFromState();
  });
  refs.arithSaveBtn?.addEventListener("click", async () => {
    const out = state.arith.render.outBuffer;
    if (!out) return;
    const name = `${sanitizeName(state.sourceName || "prim")}_arith.wav`;
    const result = await saveBlob(audioBufferToWavBlob(out), name, { sequenceKey: "prim_arith" });
    setStatus(result === "saved" ? `SAVED ${name}` : "SAVE CANCELLED", result !== "saved");
  });
  refs.arithSendBtn?.addEventListener("click", async () => {
    const out = state.arith.render.outBuffer;
    if (!out) return;
    const blob = audioBufferToWavBlob(out);
    const wavBytesBase64 = arrayBufferToBase64(await blob.arrayBuffer());
    window.parent?.postMessage({
      type: "CLIPLIB_ADD",
      version: 1,
      target: "lazy",
      name: `${sanitizeName(state.sourceName || "prim")}_arith`,
      wavBytesBase64,
      meta: { sr: out.sr, channels: out.channels, frames: out.frames, durationSec: out.frames / out.sr },
      source: "prim",
    }, "*");
    setStatus("ARITH SENT TO LAZY");
  });

  refs.recBtn.addEventListener("click", () => void startRec());
  refs.stopRecBtn.addEventListener("click", stopRec);
  refs.recRefreshBtn?.addEventListener("click", () => void refreshRecDevices({ askPermission: true }));
  refs.recInputSelect?.addEventListener("change", () => {
    const deviceId = String(refs.recInputSelect.value || "");
    state.rec.selectedDeviceId = deviceId || null;
    state.rec.selectedMissing = false;
    writeStoredRecDeviceId(state.rec.selectedDeviceId);
    updateRecDeviceInfoLine();
  });
  refs.loadBtn.addEventListener("click", async () => {
    const picked = await openAudioFileViaDialog();
    if (picked?.arrayBuffer) {
      try {
        const decoded = await ensureAudioContext().decodeAudioData(picked.arrayBuffer.slice(0));
        await loadCanonical(canonicalFromAudioBuffer(decoded), picked.name.replace(/\.[^.]+$/, ""));
        setStatus(`LOADED ${picked.name}`);
      } catch (err) {
        setStatus(`LOAD FAILED: ${String(err?.message || err)}`, true);
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
      const arr = await file.arrayBuffer();
      const decoded = await ensureAudioContext().decodeAudioData(arr.slice(0));
      await loadCanonical(canonicalFromAudioBuffer(decoded), file.name.replace(/\.[^.]+$/, ""));
      setStatus(`LOADED ${file.name}`);
    } catch (err) {
      setStatus(`LOAD FAILED: ${String(err?.message || err)}`, true);
    }
  });

  refs.lengthMinusBtn.addEventListener("click", () => {
    if (!state.base) return;
    refs.lengthSec.value = String(clamp(Number(refs.lengthSec.value) - 0.1, 0.01, 60).toFixed(2));
  });
  refs.lengthPlusBtn.addEventListener("click", () => {
    if (!state.base) return;
    refs.lengthSec.value = String(clamp(Number(refs.lengthSec.value) + 0.1, 0.01, 60).toFixed(2));
  });
  refs.applyLengthBtn.addEventListener("click", () => {
    if (!state.base) return;
    const sec = clamp(Number(refs.lengthSec.value), 0.01, 60);
    applyLengthChange(Math.round(sec * state.base.sr));
  });

  refs.playBtn.addEventListener("click", () => {
    if (state.preview.playing || runtime.previewSource) {
      stopPreview();
      return;
    }
    void playPreview();
  });
  refs.loopBtn.addEventListener("change", () => {
    state.preview.loop = !!refs.loopBtn.checked;
    syncUiFromState();
  });

  refs.undoBtn.addEventListener("click", undo);
  refs.redoBtn.addEventListener("click", redo);
  refs.snapBtn.addEventListener("click", () => {
    state.snapZeroCross = !state.snapZeroCross;
    syncUiFromState();
  });
  refs.saveBtn.addEventListener("click", () => void saveCurrentWav());
  refs.sendBtn.addEventListener("click", () => void sendToLazy());
  refs.clearSelBtn.addEventListener("click", () => {
    state.selection = null;
    draw();
    updateStats();
  });

  refs.toolButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.tool = btn.dataset.tool;
      syncToolUi();
    });
  });
  refs.dupMode.addEventListener("change", () => { state.dup.mode = refs.dupMode.value; });
  refs.dupCount.addEventListener("change", () => { state.dup.count = Number(refs.dupCount.value); });
  refs.dupExtendBtn?.addEventListener("click", () => {
    state.dupAutoExtend = !state.dupAutoExtend;
    syncUiFromState();
    setStatus(state.dupAutoExtend ? "INSERT AUTO-EXTEND ON" : "INSERT AUTO-EXTEND OFF");
  });

  refs.fOn.addEventListener("click", () => { state.fx.filter.enabled = !state.fx.filter.enabled; syncUiFromState(); schedulePreviewRender(); });
  refs.fPreview.addEventListener("click", () => { state.fx.filter.preview = !state.fx.filter.preview; syncUiFromState(); schedulePreviewRender(); });
  refs.fType.addEventListener("change", () => { state.fx.filter.type = refs.fType.value; schedulePreviewRender(); });
  refs.fCutoff.addEventListener("input", () => { state.fx.filter.cutoff = Number(refs.fCutoff.value); schedulePreviewRender(); });
  refs.fQ.addEventListener("input", () => { state.fx.filter.q = Number(refs.fQ.value); schedulePreviewRender(); });
  refs.fDrive.addEventListener("input", () => { state.fx.filter.drive = Number(refs.fDrive.value); schedulePreviewRender(); });
  refs.fMix.addEventListener("input", () => { state.fx.filter.mix = Number(refs.fMix.value); schedulePreviewRender(); });
  refs.fApply.addEventListener("click", async () => {
    if (!state.base) return;
    const dry = renderDry();
    if (!dry) return;
    const oldPreview = state.fx.filter.preview;
    state.fx.filter.preview = true;
    const out = await renderFilter(dry);
    state.fx.filter.preview = oldPreview;
    bakeTransformedBuffer(clampAudio(out), "FILTER");
    setStatus("BAKED FILTER");
  });
  refs.fReset.addEventListener("click", () => {
    state.fx.filter = { ...state.fx.filter, enabled: false, preview: false, type: "lowpass", cutoff: 8000, q: 0.7, drive: 0, mix: 1 };
    syncUiFromState();
    schedulePreviewRender();
  });

  refs.rOn.addEventListener("click", () => { state.fx.reverb.enabled = !state.fx.reverb.enabled; syncUiFromState(); schedulePreviewRender(); });
  refs.rPreview.addEventListener("click", () => { state.fx.reverb.preview = !state.fx.reverb.preview; syncUiFromState(); schedulePreviewRender(); });
  refs.rSec.addEventListener("input", () => { state.fx.reverb.seconds = Number(refs.rSec.value); schedulePreviewRender(); });
  refs.rPredelay.addEventListener("input", () => { state.fx.reverb.preDelayMs = Number(refs.rPredelay.value); schedulePreviewRender(); });
  refs.rDamp.addEventListener("input", () => { state.fx.reverb.damp = Number(refs.rDamp.value); schedulePreviewRender(); });
  refs.rMix.addEventListener("input", () => { state.fx.reverb.mix = Number(refs.rMix.value); schedulePreviewRender(); });
  refs.rTail.addEventListener("click", () => { state.fx.reverb.tailExtend = !state.fx.reverb.tailExtend; syncUiFromState(); schedulePreviewRender(); });
  refs.rApply.addEventListener("click", async () => {
    if (!state.base) return;
    const dry = renderDry();
    if (!dry) return;
    const oldPreview = state.fx.reverb.preview;
    state.fx.reverb.preview = true;
    const out = await renderReverb(dry);
    state.fx.reverb.preview = oldPreview;
    bakeTransformedBuffer(clampAudio(out), "REVERB");
    setStatus("BAKED REVERB");
  });
  refs.rReset.addEventListener("click", () => {
    state.fx.reverb = { ...state.fx.reverb, enabled: false, preview: false, seconds: 0.8, preDelayMs: 10, damp: 0.5, mix: 0.25, tailExtend: true };
    syncUiFromState();
    schedulePreviewRender();
  });

  refs.tOn.addEventListener("click", () => { state.tapestop.enabled = !state.tapestop.enabled; syncUiFromState(); });
  refs.tPreview.addEventListener("click", () => {
    state.tapestop.preview = !state.tapestop.preview;
    syncUiFromState();
    setStatus(state.tapestop.preview ? "TSTOP WILL APPLY ON RENDER" : "TSTOP RENDER OFF");
  });
  refs.tTime.addEventListener("input", () => { state.tapestop.timeMs = Number(refs.tTime.value); });
  refs.tCurve.addEventListener("change", () => { state.tapestop.curve = refs.tCurve.value; });
  refs.tFloor.addEventListener("input", () => { state.tapestop.floor = Number(refs.tFloor.value); });
  refs.tFade.addEventListener("input", () => { state.tapestop.tailFadeMs = Number(refs.tFade.value); });
  refs.tApplyAtPlayhead.addEventListener("click", () => applyTapestopAt(state.playheadFrame));
  refs.tReset.addEventListener("click", () => {
    state.tapestop = { ...state.tapestop, enabled: true, preview: false, timeMs: 700, curve: "exp", floor: 0.02, tailFadeMs: 20 };
    syncUiFromState();
  });

  refs.renderOutBtn.addEventListener("click", () => {
    void (async () => {
      const out = await renderOut({ includeTapestop: state.tapestop.preview });
      draw();
      if (!out) return;
      setStatus(`RENDER DONE: TEMP READY (${(out.frames / out.sr).toFixed(2)}S)`);
      syncUiFromState();
    })().catch((err) => setStatus(String(err?.message || err), true));
  });
  refs.bakeOutBtn.addEventListener("click", () => void bakeOut());
  refs.abBtn.addEventListener("click", () => {
    state.preview.useAB = !state.preview.useAB;
    syncUiFromState();
  });

  refs.waveCanvas.addEventListener("pointerdown", handleCanvasPointerDown);
  refs.waveCanvas.addEventListener("pointermove", handleCanvasPointerMove);
  refs.waveCanvas.addEventListener("pointerup", handleCanvasPointerUp);
  refs.waveCanvas.addEventListener("pointercancel", handleCanvasPointerUp);

  refs.applyPresetBtn.addEventListener("click", () => applyPresetById(refs.presetSelect.value));

  const midiBindings = [
    [refs.fCutoff, "prim.fx.filter.cutoff", "Prim Filter Cutoff"],
    [refs.fQ, "prim.fx.filter.q", "Prim Filter Q"],
    [refs.fDrive, "prim.fx.filter.drive", "Prim Filter Drive"],
    [refs.fMix, "prim.fx.filter.mix", "Prim Filter Mix"],
    [refs.fOn, "prim.fx.filter.enable", "Prim Filter Enable"],
    [refs.rMix, "prim.fx.reverb.mix", "Prim Reverb Mix"],
    [refs.rSec, "prim.fx.reverb.time", "Prim Reverb Time"],
    [refs.rDamp, "prim.fx.reverb.damp", "Prim Reverb Damp"],
    [refs.rOn, "prim.fx.reverb.enable", "Prim Reverb Enable"],
    [refs.tTime, "prim.tapestop.time", "Prim Tapestop Time"],
    [refs.bakeOutBtn, "prim.action.applyFx", "Prim Apply FX"],
    [refs.sendBtn, "prim.action.sendToLazy", "Prim Send To Lazy"],
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

  window.addEventListener("resize", draw);
  window.addEventListener("keydown", (event) => {
    const key = String(event.key || "").toLowerCase();
    const mod = event.metaKey || event.ctrlKey;
    if (mod && key === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (key === " ") {
      event.preventDefault();
      window.parent?.postMessage({ type: "DENARRATOR_GLOBAL_TOGGLE", version: 1 }, "*");
    }
  });
  window.addEventListener("message", (event) => {
    const data = event?.data;
    if (!data || typeof data.type !== "string") return;
    if (data.type === "SESSION_EXPORT_REQ" && data.version === 1 && event.source === window.parent) {
      void (async () => {
        const includeOnlyDirty = data?.payload?.includeOnlyDirty !== false;
        const chunk = await exportSessionChunk(includeOnlyDirty);
        window.parent?.postMessage(
          {
            type: "SESSION_EXPORT_RES",
            version: 1,
            payload: {
              moduleId: "prim",
              schemaVersion: 1,
              dirty: Boolean(runtime.sessionDirty),
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
        } catch (error) {
          setStatus(`SESSION IMPORT FAILED: ${String(error?.message || error)}`, true);
        }
      })();
      return;
    }
    if (data.type === "SESSION_SAVED" && data.version === 1 && event.source === window.parent) {
      runtime.sessionDirty = false;
      setStatus("SESSION SAVED");
      return;
    }
    if (data.type === "PANIC_KILL" && data.version === 1 && event.source === window.parent) {
      void handlePanicKill();
      return;
    }
    if (data.type === "DENARRATOR_GLOBAL_PLAY" && data.version === 1 && event.source === window.parent) {
      if (!state.preview.playing) void playPreview();
      return;
    }
    if (data.type === "DENARRATOR_GLOBAL_STOP" && data.version === 1 && event.source === window.parent) {
      if (state.preview.playing || runtime.previewSource) stopPreview();
      if (runtime.arithPreviewSource) arithStopPreview();
      return;
    }
    if (data.type === "GLOBAL_PLAY_CLEAR" && data.version === 1 && event.source === window.parent) {
      if (runtime.previewPlayToken) {
        globalPlayStop(runtime.previewPlayToken);
        runtime.previewPlayToken = null;
      }
      return;
    }
    if (data.type === "UI_SQUISH_SET" && data.version === 1 && event.source === window.parent) {
      document.documentElement.classList.toggle("dn-squish", Boolean(data?.payload?.enabled));
      return;
    }
    if (data.type === "PATHS_BROADCAST" && data.version === 1 && event.source === window.parent) {
      runtime.paths = data?.payload || null;
      return;
    }
    if (data.type === "MIDI_MAP_MODE" && data.version === 1 && event.source === window.parent) {
      runtime.midiMapMode = Boolean(data?.payload?.enabled);
      return;
    }
    if (data.type === "MIDI_TARGET_SET" && data.version === 1 && event.source === window.parent) {
      const targetId = String(data?.payload?.targetId || "");
      if (targetId) {
        applyMidiTarget(targetId, data?.payload?.value01);
      }
      return;
    }
    if (data.type === "AUDIO_RESET_DONE" && data.version === 1 && event.source === window.parent) {
      setStatus("AUDIO RESET READY");
      return;
    }
    if (data.type === "DENARRATOR_UNDO" && data.version === 1) {
      undo();
      return;
    }
    if (data.type === "CLIPLIB_ADD_OK" && data.version === 1) {
      refs.sendInfo.textContent = `SENT: ${String(data.name || "clip")}`;
      setStatus(`SENT TO ${String(data.target || "LAZY").toUpperCase()}`);
      return;
    }
    if (data.type === "CLIPLIB_ADD_ERR" && data.version === 1) {
      refs.sendInfo.textContent = `SEND FAILED`;
      setStatus(`SEND FAILED: ${String(data.error || "error")}`, true);
      return;
    }
    if ((data.type === "DENARRATOR_IMPORT_CLIP" || data.type === "BROWSER_LOAD_ITEM") && data.version === 1) {
      void (async () => {
        try {
          const wavB64 = String(data?.wavBytesBase64 || "");
          if (!wavB64) return;
          const decoded = await ensureAudioContext().decodeAudioData(base64ToArrayBuffer(wavB64).slice(0));
          await loadCanonical(canonicalFromAudioBuffer(decoded), String(data?.name || data?.payload?.name || "browser.wav"));
          setStatus(`LOADED ${String(data?.name || data?.payload?.name || "BROWSER")}`);
        } catch (error) {
          setStatus(`BROWSER LOAD FAILED: ${String(error?.message || error)}`, true);
        }
      })();
      return;
    }
  });
}

function initPresets() {
  refs.presetSelect.innerHTML = PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
  refs.presetSelect.value = "clean_chop";
}

function init() {
  installTactileButtons(document);
  initPresets();
  bindEvents();
  void refreshRecDevices({ askPermission: false });
  if (navigator?.mediaDevices?.addEventListener) {
    const handler = () => {
      void refreshRecDevices();
      if (runtime.recorder?.state === "recording") {
        stopRec();
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
  syncUiFromState();
  draw();
  runtime.sessionDirty = false;
}

init();
