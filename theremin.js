const refs = {
  status: document.getElementById('status'),
  sourceInfo: document.getElementById('sourceInfo'),
  wave: document.getElementById('wave'),
  lenInput: document.getElementById('lenInput'),
  lenVal: document.getElementById('lenVal'),
  startInput: document.getElementById('startInput'),
  startVal: document.getElementById('startVal'),
  pitchLabel: document.getElementById('pitchLabel'),
  pitchInput: document.getElementById('pitchInput'),
  pitchVal: document.getElementById('pitchVal'),
  volLabel: document.getElementById('volLabel'),
  pitchModeBtn: document.getElementById('pitchModeBtn'),
  modeBtn: document.getElementById('modeBtn'),
  scaleWrap: document.getElementById('scaleWrap'),
  scaleSel: document.getElementById('scaleSel'),
  rootWrap: document.getElementById('rootWrap'),
  rootSel: document.getElementById('rootSel'),
  glideWrap: document.getElementById('glideWrap'),
  glideInput: document.getElementById('glideInput'),
  glideVal: document.getElementById('glideVal'),
  tritonalsBtn: document.getElementById('tritonalsBtn'),
  scratchMuteBtn: document.getElementById('scratchMuteBtn'),
  volInput: document.getElementById('volInput'),
  volVal: document.getElementById('volVal'),
  grainInfo: document.getElementById('grainInfo'),
  loadBtn: document.getElementById('loadBtn'),
  cliplibBtn: document.getElementById('cliplibBtn'),
  setGrainBtn: document.getElementById('setGrainBtn'),
  onBtn: document.getElementById('onBtn'),
  saveBtn: document.getElementById('saveBtn'),
  sendBtn: document.getElementById('sendBtn'),
  fileInput: document.getElementById('fileInput'),
};

const ON_THRESHOLD = 0.01;
const OFF_THRESHOLD = 0.005;
const TRITONE_RATIO = Math.pow(2, 6 / 12);
const ROOT_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCALES = {
  CHROM: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  ION: [0, 2, 4, 5, 7, 9, 11],
  DOR: [0, 2, 3, 5, 7, 9, 10],
  PHR: [0, 1, 3, 5, 7, 8, 10],
  LYD: [0, 2, 4, 6, 7, 9, 11],
  MIX: [0, 2, 4, 5, 7, 9, 10],
  AEO: [0, 2, 3, 5, 7, 8, 10],
  LOC: [0, 1, 3, 5, 6, 8, 10],
};

const state = {
  sourceName: 'NONE',
  sourceClipPath: null,
  sourceBuffer: null,
  grainStartSec: 0,
  grainLenMs: 60,
  grainBuffer: null,
  grainBufferRev: null,
  on: false,
  mode: 'THEREMIN',
  pitch01: 0.5,
  vol01: 0,
  rangeSemitones: 24,
  pitchMode: 'FREE',
  scale: 'CHROM',
  root: 0,
  glideMs: 18,
  tritonals: { on: false, mix: 0.65 },
  scratch: {
    scrub01: 0.5,
    xfade01: 0,
    muteHeld: false,
    restartHzLimit: 60,
    restartMinDelta01: 0.01,
    fadeMs: 6,
  },
};

const runtime = {
  ctx: null,
  sumGainNode: null,
  muteGainNode: null,
  masterGainNode: null,
  voices: { base: null, low: null, high: null, fwd: null, rev: null },
  triStopTimer: null,
  engineStopTimer: null,
  scratchLastRestartMs: 0,
  scratchLastScrub01: 0.5,
  playToken: null,
  midiMapMode: false,
  dirty: false,
  cliplibReqSeq: 1,
  paths: null,
};

function setStatus(msg, isErr = false) {
  refs.status.textContent = String(msg || '');
  refs.status.style.color = isErr ? '#8a3a2d' : '#55585a';
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function modeIsScratch() {
  return state.mode === 'SCRATCH';
}

function equalPowerGains(xfade01) {
  const x = clamp(xfade01, 0, 1);
  return {
    gF: Math.cos(x * Math.PI * 0.5),
    gR: Math.sin(x * Math.PI * 0.5),
  };
}

function buildReversedBuffer(buffer) {
  const ctx = ensureCtx();
  const out = ctx.createBuffer(2, buffer.length, buffer.sampleRate);
  const srcL = buffer.getChannelData(0);
  const srcR = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : srcL;
  const dstL = out.getChannelData(0);
  const dstR = out.getChannelData(1);
  for (let i = 0, j = buffer.length - 1; i < buffer.length; i += 1, j -= 1) {
    dstL[i] = srcL[j];
    dstR[i] = srcR[j];
  }
  return out;
}

function markDirty() { runtime.dirty = true; }

function ensureCtx() {
  if (!runtime.ctx) runtime.ctx = new AudioContext();
  return runtime.ctx;
}

function ensureEngineNodes() {
  const ctx = ensureCtx();
  if (!runtime.sumGainNode) {
    runtime.sumGainNode = ctx.createGain();
    runtime.sumGainNode.gain.value = 1;
  }
  if (!runtime.muteGainNode) {
    runtime.muteGainNode = ctx.createGain();
    runtime.muteGainNode.gain.value = 1;
  }
  if (!runtime.masterGainNode) {
    runtime.masterGainNode = ctx.createGain();
    runtime.masterGainNode.gain.value = 0;
  }
  try { runtime.sumGainNode.disconnect(); } catch {}
  try { runtime.muteGainNode.disconnect(); } catch {}
  try { runtime.masterGainNode.disconnect(); } catch {}
  runtime.sumGainNode.connect(runtime.muteGainNode);
  runtime.muteGainNode.connect(runtime.masterGainNode);
  runtime.masterGainNode.connect(ctx.destination);
}

function globalPlayStart() {
  const token = `theremin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  runtime.playToken = token;
  window.parent?.postMessage({ type: 'GLOBAL_PLAY_START', version: 1, payload: { token, moduleId: 'theremin', source: 'theremin' } }, '*');
}

function globalPlayStop() {
  if (!runtime.playToken) return;
  window.parent?.postMessage({ type: 'GLOBAL_PLAY_STOP', version: 1, payload: { token: runtime.playToken } }, '*');
  runtime.playToken = null;
}

function maybeUpdatePlayToken() {
  const audible = modeIsScratch()
    ? state.on && !state.scratch.muteHeld
    : state.on && state.vol01 > (runtime.playToken ? OFF_THRESHOLD : ON_THRESHOLD);
  if (audible && !runtime.playToken) globalPlayStart();
  if (!audible && runtime.playToken) globalPlayStop();
}

function semitoneFromPitch01(v01) {
  const span = state.rangeSemitones * 2;
  return (v01 * span) - state.rangeSemitones;
}

function quantizeToScale(stCont, scaleName, root) {
  const intervals = SCALES[scaleName] || SCALES.CHROM;
  const octave = Math.floor(stCont / 12);
  const pc = ((stCont % 12) + 12) % 12;
  const rel = (pc - root + 12) % 12;
  let best = intervals[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const iv of intervals) {
    const d = Math.abs(iv - rel);
    const wrapped = Math.min(d, 12 - d);
    if (wrapped < bestDist) {
      bestDist = wrapped;
      best = iv;
    }
  }
  const snappedPc = (root + best) % 12;
  const cand0 = octave * 12 + snappedPc;
  const candUp = (octave + 1) * 12 + snappedPc;
  const candDn = (octave - 1) * 12 + snappedPc;
  let out = cand0;
  if (Math.abs(candUp - stCont) < Math.abs(out - stCont)) out = candUp;
  if (Math.abs(candDn - stCont) < Math.abs(out - stCont)) out = candDn;
  return out;
}

function getCurrentSemitone() {
  const cont = semitoneFromPitch01(state.pitch01);
  if (state.pitchMode !== 'SCALE') return cont;
  return quantizeToScale(cont, state.scale, state.root);
}

function playbackRateFromPitch01(v01) {
  const cont = semitoneFromPitch01(v01);
  const semi = state.pitchMode === 'SCALE' ? quantizeToScale(cont, state.scale, state.root) : cont;
  return Math.pow(2, semi / 12);
}

function updateReadouts() {
  const scratch = modeIsScratch();
  refs.lenVal.textContent = `${Math.round(state.grainLenMs)}ms`;
  refs.startVal.textContent = `${state.grainStartSec.toFixed(3)}s`;
  refs.pitchLabel.textContent = scratch ? 'SCRUB' : 'PITCH';
  refs.volLabel.textContent = scratch ? 'XFADE' : 'VOL';
  refs.pitchInput.value = String(Math.round((scratch ? state.scratch.scrub01 : state.pitch01) * 100));
  refs.volInput.value = String(Math.round((scratch ? state.scratch.xfade01 : state.vol01) * 100));
  refs.pitchVal.textContent = scratch
    ? `${Math.round(state.scratch.scrub01 * 100)}%`
    : `${getCurrentSemitone().toFixed(1)} st`;
  refs.volVal.textContent = scratch
    ? `${Math.round(state.scratch.xfade01 * 100)}%`
    : `${Math.round(state.vol01 * 100)}%`;
  refs.modeBtn.textContent = `MODE: ${scratch ? 'SCR' : 'THER'}`;
  refs.pitchModeBtn.textContent = `PITCH: ${state.pitchMode}`;
  refs.scaleSel.value = state.scale;
  refs.rootSel.value = String(state.root);
  refs.glideVal.textContent = `${Math.round(state.glideMs)}ms`;
  refs.tritonalsBtn.textContent = `TRITONALS ${state.tritonals.on ? 'ON' : 'OFF'}`;
  refs.tritonalsBtn.setAttribute('aria-pressed', String(state.tritonals.on));
  const scaleVisible = !scratch && state.pitchMode === 'SCALE';
  refs.scaleWrap.style.display = scaleVisible ? '' : 'none';
  refs.rootWrap.style.display = scaleVisible ? '' : 'none';
  refs.glideWrap.style.display = scratch ? 'none' : (scaleVisible ? '' : 'none');
  refs.pitchModeBtn.style.display = scratch ? 'none' : '';
  refs.tritonalsBtn.disabled = scratch;
  refs.scratchMuteBtn.style.display = scratch ? '' : 'none';
  refs.scratchMuteBtn.setAttribute('aria-pressed', String(state.scratch.muteHeld));
  refs.sourceInfo.textContent = state.sourceBuffer ? `${state.sourceName} (${state.sourceBuffer.duration.toFixed(2)}s)` : 'NO SOURCE';
  refs.grainInfo.textContent = state.grainBuffer
    ? `GRAIN: ${state.grainLenMs.toFixed(0)}ms @ ${state.grainStartSec.toFixed(3)}s | ${scratch ? `SCR XFADE ${Math.round(state.scratch.xfade01 * 100)}%` : `${state.pitchMode}${state.pitchMode === 'SCALE' ? ` ${state.scale} ${ROOT_NAMES[state.root]}` : ''}${state.tritonals.on ? ' | TRITONALS' : ''}`}`
    : 'GRAIN: NONE';
  refs.onBtn.textContent = state.on ? 'ON' : 'OFF';
  refs.onBtn.setAttribute('aria-pressed', String(state.on));
}

function updateStartRange() {
  const dur = state.sourceBuffer ? state.sourceBuffer.duration : 0;
  const maxStart = Math.max(0, dur - state.grainLenMs / 1000);
  refs.startInput.max = String(Math.max(0, Math.round(maxStart * 1000)));
  refs.startInput.value = String(Math.max(0, Math.round(state.grainStartSec * 1000)));
}

function drawWave() {
  const canvas = refs.wave;
  const ctx = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.floor(canvas.clientWidth * ratio));
  const h = Math.max(1, Math.floor(canvas.clientHeight * ratio));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.fillRect(0, 0, w, h);

  const b = state.sourceBuffer;
  if (!b) return;
  const ch = b.getChannelData(0);
  const spp = Math.max(1, Math.floor(ch.length / w));
  ctx.strokeStyle = '#2f3132';
  ctx.lineWidth = Math.max(1, Math.floor(ratio));
  ctx.beginPath();
  for (let x = 0; x < w; x += 1) {
    const s = x * spp;
    const e = Math.min(ch.length, s + spp);
    let min = 1; let max = -1;
    for (let i = s; i < e; i += 1) { const v = ch[i]; if (v < min) min = v; if (v > max) max = v; }
    const y1 = ((1 - max) * 0.5) * h;
    const y2 = ((1 - min) * 0.5) * h;
    ctx.moveTo(x, y1); ctx.lineTo(x, y2);
  }
  ctx.stroke();

  const gStart = state.grainStartSec;
  const gEnd = Math.min(b.duration, gStart + state.grainLenMs / 1000);
  const x1 = (gStart / b.duration) * w;
  const x2 = (gEnd / b.duration) * w;
  ctx.fillStyle = 'rgba(235,219,194,.33)';
  ctx.fillRect(x1, 0, Math.max(1, x2 - x1), h);
  ctx.strokeStyle = '#2f3132';
  ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, h); ctx.moveTo(x2, 0); ctx.lineTo(x2, h); ctx.stroke();
}

function setGrainFromSource() {
  if (!state.sourceBuffer) return false;
  const src = state.sourceBuffer;
  const sr = src.sampleRate;
  const lenFrames = Math.max(1, Math.floor((state.grainLenMs / 1000) * sr));
  const startFrame = Math.max(0, Math.min(src.length - lenFrames, Math.floor(state.grainStartSec * sr)));
  const chCount = Math.max(1, src.numberOfChannels);
  const ctx = ensureCtx();
  const out = ctx.createBuffer(2, lenFrames, sr);
  const l = src.getChannelData(0);
  const r = chCount > 1 ? src.getChannelData(1) : l;
  out.copyToChannel(l.subarray(startFrame, startFrame + lenFrames), 0, 0);
  out.copyToChannel(r.subarray(startFrame, startFrame + lenFrames), 1, 0);
  state.grainBuffer = out;
  state.grainBufferRev = buildReversedBuffer(out);
  markDirty();
  updateReadouts();
  drawWave();
  setStatus('GRAIN SET');
  return true;
}

function stopVoice(which) {
  const voice = runtime.voices[which];
  if (!voice) return;
  try { voice.src.stop(); } catch {}
  try { voice.src.disconnect(); } catch {}
  try { voice.gain.disconnect(); } catch {}
  runtime.voices[which] = null;
}

function stopAllVoices() {
  stopVoice('base');
  stopVoice('low');
  stopVoice('high');
  stopVoice('fwd');
  stopVoice('rev');
}

function hardStopEngineImmediate() {
  if (runtime.engineStopTimer) {
    clearTimeout(runtime.engineStopTimer);
    runtime.engineStopTimer = null;
  }
  if (runtime.triStopTimer) {
    clearTimeout(runtime.triStopTimer);
    runtime.triStopTimer = null;
  }
  stopAllVoices();
}

function createVoice(buffer, initialGain = 0, offsetSec = 0) {
  ensureEngineNodes();
  const ctx = ensureCtx();
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.loopStart = 0;
  src.loopEnd = buffer.duration;
  const gain = ctx.createGain();
  gain.gain.value = initialGain;
  src.connect(gain);
  gain.connect(runtime.sumGainNode);
  src.start(0, clamp(offsetSec, 0, Math.max(0, buffer.duration - 1 / Math.max(1, buffer.sampleRate))));
  return { src, gain };
}

function updateSumCompensation() {
  if (!runtime.sumGainNode || !runtime.ctx) return;
  const now = runtime.ctx.currentTime;
  const sumComp = modeIsScratch() ? 1.0 : (state.tritonals.on ? 0.8 : 1.0);
  runtime.sumGainNode.gain.setTargetAtTime(sumComp, now, 0.02);
}

function fadeInTriVoices() {
  if (!runtime.ctx) return;
  const now = runtime.ctx.currentTime;
  const triGain = 0.55 * clamp(Number(state.tritonals.mix) || 0.65, 0, 1);
  if (runtime.voices.low) runtime.voices.low.gain.gain.setTargetAtTime(triGain, now, 0.02);
  if (runtime.voices.high) runtime.voices.high.gain.gain.setTargetAtTime(triGain, now, 0.02);
}

function fadeOutTriVoicesAndStop() {
  if (!runtime.ctx) {
    stopVoice('low');
    stopVoice('high');
    return;
  }
  const now = runtime.ctx.currentTime;
  if (runtime.voices.low) runtime.voices.low.gain.gain.setTargetAtTime(0, now, 0.02);
  if (runtime.voices.high) runtime.voices.high.gain.gain.setTargetAtTime(0, now, 0.02);
  if (runtime.triStopTimer) clearTimeout(runtime.triStopTimer);
  runtime.triStopTimer = setTimeout(() => {
    stopVoice('low');
    stopVoice('high');
    runtime.triStopTimer = null;
  }, 45);
}

function stopEngine() {
  if (runtime.masterGainNode && runtime.ctx) {
    runtime.masterGainNode.gain.setTargetAtTime(0, runtime.ctx.currentTime, 0.02);
  }
  if (runtime.engineStopTimer) clearTimeout(runtime.engineStopTimer);
  runtime.engineStopTimer = setTimeout(() => {
    hardStopEngineImmediate();
    runtime.engineStopTimer = null;
  }, 35);
  globalPlayStop();
}

function setScratchMuteHeld(nextHeld) {
  state.scratch.muteHeld = Boolean(nextHeld);
  if (runtime.muteGainNode && runtime.ctx) {
    runtime.muteGainNode.gain.setTargetAtTime(state.scratch.muteHeld ? 0 : 1, runtime.ctx.currentTime, 0.01);
  }
  maybeUpdatePlayToken();
  updateReadouts();
}

function applyScratchXfade() {
  if (!runtime.ctx) return;
  const now = runtime.ctx.currentTime;
  const { gF, gR } = equalPowerGains(state.scratch.xfade01);
  if (runtime.voices.fwd) runtime.voices.fwd.gain.gain.setTargetAtTime(gF, now, 0.01);
  if (runtime.voices.rev) runtime.voices.rev.gain.gain.setTargetAtTime(gR, now, 0.01);
}

function restartScratchAtScrub(force = false) {
  if (!modeIsScratch() || !state.on || !state.grainBuffer || !state.grainBufferRev) return;
  const nowMs = performance.now();
  const minInterval = 1000 / Math.max(1, state.scratch.restartHzLimit);
  const delta = Math.abs(state.scratch.scrub01 - runtime.scratchLastScrub01);
  if (!force) {
    if (delta < state.scratch.restartMinDelta01) return;
    if ((nowMs - runtime.scratchLastRestartMs) < minInterval) return;
  }
  runtime.scratchLastRestartMs = nowMs;
  runtime.scratchLastScrub01 = state.scratch.scrub01;

  const len = state.grainBuffer.duration;
  const sr = state.grainBuffer.sampleRate;
  const pos = clamp(state.scratch.scrub01, 0, 1) * len;
  const posR = clamp(len - pos, 0, Math.max(0, len - 1 / Math.max(1, sr)));
  stopVoice('fwd');
  stopVoice('rev');
  runtime.voices.fwd = createVoice(state.grainBuffer, 0, pos);
  runtime.voices.rev = createVoice(state.grainBufferRev, 0, posR);
  applyScratchXfade();
}

function applyEngineParams() {
  if (!runtime.ctx || !runtime.masterGainNode) { maybeUpdatePlayToken(); return; }
  const now = runtime.ctx.currentTime;
  if (modeIsScratch()) {
    runtime.masterGainNode.gain.setTargetAtTime(1, now, 0.02);
    runtime.muteGainNode.gain.setTargetAtTime(state.scratch.muteHeld ? 0 : 1, now, 0.01);
    applyScratchXfade();
    maybeUpdatePlayToken();
    return;
  }
  const rateBase = playbackRateFromPitch01(state.pitch01);
  const rateLow = rateBase / TRITONE_RATIO;
  const rateHigh = rateBase * TRITONE_RATIO;
  const vol = Math.max(0, Math.min(1, state.vol01));
  const pitchTc = state.pitchMode === 'SCALE'
    ? Math.max(0.001, state.glideMs / 1000)
    : 0.012;
  if (runtime.voices.base) runtime.voices.base.src.playbackRate.setTargetAtTime(rateBase, now, pitchTc);
  if (runtime.voices.low) runtime.voices.low.src.playbackRate.setTargetAtTime(rateLow, now, pitchTc);
  if (runtime.voices.high) runtime.voices.high.src.playbackRate.setTargetAtTime(rateHigh, now, pitchTc);
  runtime.muteGainNode.gain.setTargetAtTime(1, now, 0.01);
  runtime.masterGainNode.gain.setTargetAtTime(vol, now, 0.02);
  updateSumCompensation();
  maybeUpdatePlayToken();
}

function startEngine() {
  if (!state.grainBuffer) {
    setStatus('SET GRAIN FIRST', true);
    state.on = false;
    updateReadouts();
    return;
  }
  ensureEngineNodes();
  ensureCtx();
  hardStopEngineImmediate();
  if (modeIsScratch()) {
    state.tritonals.on = false;
    if (!state.grainBufferRev) state.grainBufferRev = buildReversedBuffer(state.grainBuffer);
    runtime.scratchLastRestartMs = 0;
    runtime.scratchLastScrub01 = state.scratch.scrub01;
    restartScratchAtScrub(true);
  } else {
    runtime.voices.base = createVoice(state.grainBuffer, 1.0, 0);
    if (state.tritonals.on) {
      runtime.voices.low = createVoice(state.grainBuffer, 0, 0);
      runtime.voices.high = createVoice(state.grainBuffer, 0, 0);
      fadeInTriVoices();
    }
  }
  applyEngineParams();
}

function setTritonalsOn(next) {
  const on = Boolean(next);
  if (modeIsScratch() && on) return;
  if (state.tritonals.on === on) return;
  state.tritonals.on = on;
  markDirty();
  if (!state.on) {
    updateReadouts();
    return;
  }
  if (on) {
    if (!runtime.voices.low) runtime.voices.low = createVoice(state.grainBuffer, 0, 0);
    if (!runtime.voices.high) runtime.voices.high = createVoice(state.grainBuffer, 0, 0);
    applyEngineParams();
    fadeInTriVoices();
  } else {
    fadeOutTriVoicesAndStop();
    applyEngineParams();
  }
  updateReadouts();
}

function setOn(next) {
  state.on = Boolean(next);
  if (state.on) startEngine();
  else stopEngine();
  markDirty();
  updateReadouts();
}

function base64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function arrayBufferToBase64(ab) {
  const bytes = new Uint8Array(ab);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function getInvoke() {
  const ownInvoke = window.__TAURI__?.core?.invoke;
  if (typeof ownInvoke === 'function') return ownInvoke;
  try {
    const parentInvoke = window.parent?.__TAURI__?.core?.invoke;
    if (typeof parentInvoke === 'function') return parentInvoke;
  } catch {}
  return null;
}

async function openAudioFileViaDialog() {
  const invoke = getInvoke();
  if (!invoke) return null;
  try {
    const path = await invoke('dialog_open_file', {
      defaultDir: runtime.paths?.mater || null,
      filters: [{ name: 'Audio', extensions: ['wav', 'aiff', 'aif', 'flac', 'mp3', 'ogg'] }],
      dialogKey: 'theremin.loadSource',
    });
    if (!path) return null;
    const b64 = await invoke('read_file_base64', { path: String(path) });
    const name = String(path).split(/[\\/]/).pop() || 'source.wav';
    return { name, arrayBuffer: base64ToArrayBuffer(b64) };
  } catch {
    return null;
  }
}

function encodeWavStereo(buffer) {
  const ch = Math.max(1, buffer.numberOfChannels);
  const len = buffer.length;
  const sr = buffer.sampleRate;
  const channels = 2;
  const dataBytes = len * channels * 2;
  const ab = new ArrayBuffer(44 + dataBytes);
  const dv = new DataView(ab);
  const wr = (o, s) => { for (let i = 0; i < s.length; i += 1) dv.setUint8(o + i, s.charCodeAt(i)); };
  wr(0, 'RIFF'); dv.setUint32(4, 36 + dataBytes, true); wr(8, 'WAVE'); wr(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, channels, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * channels * 2, true); dv.setUint16(32, channels * 2, true); dv.setUint16(34, 16, true);
  wr(36, 'data'); dv.setUint32(40, dataBytes, true);
  const l = buffer.getChannelData(0);
  const r = ch > 1 ? buffer.getChannelData(1) : l;
  let o = 44;
  for (let i = 0; i < len; i += 1) {
    const lv = Math.max(-1, Math.min(1, l[i] || 0));
    const rv = Math.max(-1, Math.min(1, r[i] || 0));
    dv.setInt16(o, lv < 0 ? lv * 0x8000 : lv * 0x7fff, true); o += 2;
    dv.setInt16(o, rv < 0 ? rv * 0x8000 : rv * 0x7fff, true); o += 2;
  }
  return new Blob([ab], { type: 'audio/wav' });
}

async function saveBlobWithDialog(blob, suggestedName) {
  const invoke = getInvoke();
  if (typeof invoke === 'function') {
    try {
      const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
      const saved = await invoke('save_blob_with_dialog', { dataBase64, suggestedName });
      return saved ? 'saved' : 'cancelled';
    } catch {}
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = suggestedName; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  return 'saved';
}

async function saveWav() {
  if (!state.grainBuffer) return;
  const blob = encodeWavStereo(state.grainBuffer);
  const r = await saveBlobWithDialog(blob, `theremin_grain_${Date.now()}.wav`);
  setStatus(r === 'saved' ? 'WAV SAVED' : 'SAVE CANCELLED');
}

async function sendToLazy() {
  if (!state.grainBuffer) return;
  const blob = encodeWavStereo(state.grainBuffer);
  const b64 = arrayBufferToBase64(await blob.arrayBuffer());
  window.parent?.postMessage({ type: 'CLIPLIB_ADD', version: 1, target: 'lazy', name: `theremin_${Date.now()}`, wavBytesBase64: b64, meta: { sr: state.grainBuffer.sampleRate, channels: 2, frames: state.grainBuffer.length, durationSec: state.grainBuffer.duration } }, '*');
  setStatus('SENT TO LAZY');
}

function registerMidi() {
  window.parent?.postMessage({
    type: 'MIDI_TARGETS_REGISTER',
    version: 1,
    moduleId: 'theremin',
    targets: [
      { id: 'theremin.pitch', label: 'Theremin Pitch', kind: 'continuous', default: 0.5 },
      { id: 'theremin.vol', label: 'Theremin Volume', kind: 'continuous', default: 0.0 },
      { id: 'theremin.scratch.mute', label: 'Theremin Scratch Mute', kind: 'trigger' },
    ],
  }, '*');
}

function armMidiTarget(id, label) {
  if (!runtime.midiMapMode) return;
  window.parent?.postMessage({ type: 'MIDI_LEARN_ARM_TARGET', version: 1, targetId: id, label }, '*');
}

async function loadSourceFromArrayBuffer(ab, name = 'source.wav') {
  const ctx = ensureCtx();
  const decoded = await ctx.decodeAudioData(ab.slice(0));
  state.sourceBuffer = decoded;
  state.sourceName = name;
  state.sourceClipPath = null;
  state.grainStartSec = 0;
  updateStartRange();
  setGrainFromSource();
  markDirty();
  updateReadouts();
  drawWave();
}

function pickFromCliplib() {
  const requestId = `theremin_cliplib_${runtime.cliplibReqSeq++}`;
  window.parent?.postMessage({ type: 'CLIPLIB_LIST_REQ', version: 1, requestId }, '*');
}

function exportSessionChunk(includeOnlyDirty = true) {
  const chunk = {
    schemaVersion: 1,
    transport: { playheadSec: 0, loopA: 0, loopB: 0 },
    ui: { on: false },
    refs: { sourcePath: state.sourceClipPath || null },
    dirty: Boolean(runtime.dirty),
  };
  if (!includeOnlyDirty || runtime.dirty) {
    chunk.heavy = {
      sourceName: state.sourceName,
      sourceWavBase64: null,
      grain: { startSec: state.grainStartSec, lenMs: state.grainLenMs },
      settings: {
        rangeSemitones: state.rangeSemitones,
        pitch01: state.pitch01,
        vol01: state.vol01,
        mode: state.mode,
        pitchMode: state.pitchMode,
        scale: state.scale,
        root: state.root,
        glideMs: state.glideMs,
        tritonalsOn: state.tritonals.on,
        tritonalsMix: state.tritonals.mix,
        scratchScrub01: state.scratch.scrub01,
        scratchXfade01: state.scratch.xfade01,
      },
    };
  }
  return chunk;
}

async function importSessionChunk(chunk) {
  const heavy = chunk?.heavy || null;
  if (heavy?.sourceWavBase64) {
    await loadSourceFromArrayBuffer(base64ToArrayBuffer(heavy.sourceWavBase64), heavy.sourceName || 'source.wav');
  }
  if (heavy?.grain) {
    state.grainStartSec = Math.max(0, Number(heavy.grain.startSec) || 0);
    state.grainLenMs = Math.max(10, Math.min(500, Number(heavy.grain.lenMs) || 60));
    refs.lenInput.value = String(Math.round(state.grainLenMs));
  }
  if (heavy?.settings) {
    state.rangeSemitones = Math.max(12, Math.min(48, Number(heavy.settings.rangeSemitones) || 24));
    state.pitch01 = Math.max(0, Math.min(1, Number(heavy.settings.pitch01) || 0.5));
    state.vol01 = Math.max(0, Math.min(1, Number(heavy.settings.vol01) || 0));
    state.mode = heavy.settings.mode === 'SCRATCH' ? 'SCRATCH' : 'THEREMIN';
    state.pitchMode = heavy.settings.pitchMode === 'SCALE' ? 'SCALE' : 'FREE';
    state.scale = SCALES[heavy.settings.scale] ? heavy.settings.scale : 'CHROM';
    state.root = Math.max(0, Math.min(11, Number(heavy.settings.root) || 0));
    state.glideMs = Math.max(0, Math.min(50, Number(heavy.settings.glideMs) || 18));
    state.tritonals.on = Boolean(heavy.settings.tritonalsOn);
    state.tritonals.mix = clamp(Number(heavy.settings.tritonalsMix) || 0.65, 0, 1);
    if (modeIsScratch()) state.tritonals.on = false;
    state.scratch.scrub01 = clamp(Number(heavy.settings.scratchScrub01 ?? 0.5), 0, 1);
    state.scratch.xfade01 = clamp(Number(heavy.settings.scratchXfade01 ?? 0), 0, 1);
    refs.pitchInput.value = String(Math.round(state.pitch01 * 100));
    refs.volInput.value = String(Math.round(state.vol01 * 100));
    refs.glideInput.value = String(Math.round(state.glideMs));
  }
  updateStartRange();
  refs.startInput.value = String(Math.round(state.grainStartSec * 1000));
  setGrainFromSource();
  setOn(false);
  runtime.dirty = false;
  updateReadouts();
  drawWave();
}

function bind() {
  refs.loadBtn.addEventListener('click', async () => {
    const picked = await openAudioFileViaDialog();
    if (picked?.arrayBuffer) {
      try { await loadSourceFromArrayBuffer(picked.arrayBuffer, picked.name); setStatus('SOURCE LOADED'); }
      catch (err) { setStatus(`LOAD FAILED: ${err.message || err}`, true); }
      return;
    }
    refs.fileInput.click();
  });
  refs.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { await loadSourceFromArrayBuffer(await file.arrayBuffer(), file.name); setStatus('SOURCE LOADED'); }
    catch (err) { setStatus(`LOAD FAILED: ${err.message || err}`, true); }
    refs.fileInput.value = '';
  });
  refs.cliplibBtn.addEventListener('click', pickFromCliplib);

  refs.wave.addEventListener('pointerdown', (event) => {
    if (!state.sourceBuffer) return;
    const rect = refs.wave.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const t = (x / rect.width) * state.sourceBuffer.duration;
    state.grainStartSec = Math.max(0, Math.min(state.sourceBuffer.duration - state.grainLenMs / 1000, t));
    refs.startInput.value = String(Math.round(state.grainStartSec * 1000));
    markDirty();
    updateReadouts();
    drawWave();
  });

  refs.lenInput.addEventListener('input', () => {
    state.grainLenMs = Math.max(10, Math.min(500, Number(refs.lenInput.value) || 60));
    updateStartRange();
    state.grainStartSec = Math.max(0, Math.min(Number(refs.startInput.value) / 1000 || 0, Math.max(0, (state.sourceBuffer?.duration || 0) - state.grainLenMs / 1000)));
    markDirty();
    updateReadouts();
    drawWave();
  });

  refs.startInput.addEventListener('input', () => {
    state.grainStartSec = Math.max(0, Number(refs.startInput.value) / 1000 || 0);
    markDirty();
    updateReadouts();
    drawWave();
  });

  refs.setGrainBtn.addEventListener('click', () => {
    if (!setGrainFromSource()) return;
    if (state.on) startEngine();
  });

  refs.onBtn.addEventListener('click', () => setOn(!state.on));
  refs.tritonalsBtn.addEventListener('click', () => setTritonalsOn(!state.tritonals.on));
  refs.modeBtn.addEventListener('click', () => {
    state.mode = modeIsScratch() ? 'THEREMIN' : 'SCRATCH';
    setScratchMuteHeld(false);
    if (modeIsScratch()) setTritonalsOn(false);
    markDirty();
    updateReadouts();
    if (state.on) startEngine();
    else applyEngineParams();
  });

  refs.pitchModeBtn.addEventListener('click', () => {
    state.pitchMode = state.pitchMode === 'FREE' ? 'SCALE' : 'FREE';
    markDirty();
    updateReadouts();
    applyEngineParams();
  });
  refs.scaleSel.addEventListener('change', () => {
    state.scale = SCALES[refs.scaleSel.value] ? refs.scaleSel.value : 'CHROM';
    markDirty();
    updateReadouts();
    applyEngineParams();
  });
  refs.rootSel.addEventListener('change', () => {
    state.root = Math.max(0, Math.min(11, Number(refs.rootSel.value) || 0));
    markDirty();
    updateReadouts();
    applyEngineParams();
  });
  refs.glideInput.addEventListener('input', () => {
    state.glideMs = Math.max(0, Math.min(50, Number(refs.glideInput.value) || 0));
    markDirty();
    updateReadouts();
    applyEngineParams();
  });

  refs.pitchInput.addEventListener('input', () => {
    const value01 = Math.max(0, Math.min(1, Number(refs.pitchInput.value) / 100 || 0));
    if (modeIsScratch()) {
      state.scratch.scrub01 = value01;
      if (state.on) restartScratchAtScrub(false);
    } else {
      state.pitch01 = value01;
      applyEngineParams();
    }
    markDirty(); updateReadouts();
  });

  refs.volInput.addEventListener('input', () => {
    const value01 = Math.max(0, Math.min(1, Number(refs.volInput.value) / 100 || 0));
    if (modeIsScratch()) {
      state.scratch.xfade01 = value01;
      applyEngineParams();
    } else {
      state.vol01 = value01;
      applyEngineParams();
    }
    markDirty(); updateReadouts();
  });

  const muteDown = () => {
    if (!modeIsScratch()) return;
    setScratchMuteHeld(true);
  };
  const muteUp = () => {
    if (!modeIsScratch()) return;
    setScratchMuteHeld(false);
  };
  refs.scratchMuteBtn.addEventListener('pointerdown', muteDown);
  refs.scratchMuteBtn.addEventListener('pointerup', muteUp);
  refs.scratchMuteBtn.addEventListener('pointercancel', muteUp);
  refs.scratchMuteBtn.addEventListener('pointerleave', muteUp);

  refs.saveBtn.addEventListener('click', () => { void saveWav(); });
  refs.sendBtn.addEventListener('click', () => { void sendToLazy(); });

  document.addEventListener('pointerdown', (event) => {
    const el = event.target?.closest?.('[data-midi-target]');
    if (!el) return;
    armMidiTarget(el.dataset.midiTarget, el.dataset.midiLabel || el.dataset.midiTarget);
  }, true);

  window.addEventListener('message', async (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.version !== 1) return;
    if (data.type === 'MIDI_MAP_MODE') { runtime.midiMapMode = Boolean(data?.payload?.enabled); return; }
    if (data.type === 'PATHS_BROADCAST') { runtime.paths = data?.payload || null; return; }
    if (data.type === 'MIDI_TARGET_SET') {
      const targetId = String(data?.payload?.targetId || '');
      const v01 = Math.max(0, Math.min(1, Number(data?.payload?.value01) || 0));
      if (targetId === 'theremin.pitch') {
        if (modeIsScratch()) {
          state.scratch.scrub01 = v01;
          refs.pitchInput.value = String(Math.round(v01 * 100));
          restartScratchAtScrub(false);
          updateReadouts();
        } else {
          state.pitch01 = v01;
          refs.pitchInput.value = String(Math.round(v01 * 100));
          updateReadouts();
          applyEngineParams();
        }
      } else if (targetId === 'theremin.vol') {
        if (modeIsScratch()) {
          state.scratch.xfade01 = v01;
          refs.volInput.value = String(Math.round(v01 * 100));
          updateReadouts();
          applyEngineParams();
        } else {
          state.vol01 = v01;
          refs.volInput.value = String(Math.round(v01 * 100));
          updateReadouts();
          applyEngineParams();
        }
      } else if (targetId === 'theremin.scratch.mute') {
        if (modeIsScratch()) {
          setScratchMuteHeld(v01 >= 0.5);
        }
      }
      return;
    }
    if (data.type === 'CLIPLIB_LIST_RES') {
      const items = Array.isArray(data.items) ? data.items : [];
      if (!items.length) { setStatus('CLIPLIB EMPTY', true); return; }
      const listing = items.slice(0, 16).map((it, i) => `${i + 1}: ${String(it?.name || 'clip')}`).join('\n');
      const answer = window.prompt(`CLIPLIB PICK\n${listing}`, '1');
      if (!answer) return;
      const idx = Math.floor(Number(answer)) - 1;
      if (!Number.isFinite(idx) || idx < 0 || idx >= items.length) return;
      const path = String(items[idx]?.path || '');
      state.sourceClipPath = path;
      const reqId = `theremin_wav_${runtime.cliplibReqSeq++}`;
      window.parent?.postMessage({ type: 'CLIPLIB_WAV_REQ', version: 1, requestId: reqId, path }, '*');
      return;
    }
    if (data.type === 'CLIPLIB_WAV_RES') {
      try { await loadSourceFromArrayBuffer(base64ToArrayBuffer(String(data.wavBytesBase64 || '')), 'cliplib.wav'); setStatus('SOURCE LOADED FROM CLIPLIB'); }
      catch (err) { setStatus(`CLIPLIB LOAD FAILED: ${err.message || err}`, true); }
      return;
    }
    if (data.type === 'SESSION_EXPORT_REQ') {
      const includeOnlyDirty = data?.payload?.includeOnlyDirty !== false;
      const chunk = exportSessionChunk(includeOnlyDirty);
      if (chunk.heavy && state.sourceBuffer) {
        chunk.heavy.sourceWavBase64 = arrayBufferToBase64(await encodeWavStereo(state.sourceBuffer).arrayBuffer());
      }
      window.parent?.postMessage({ type: 'SESSION_EXPORT_RES', version: 1, payload: { moduleId: 'theremin', schemaVersion: 1, dirty: Boolean(runtime.dirty), chunk } }, '*');
      return;
    }
    if (data.type === 'SESSION_IMPORT') {
      try { await importSessionChunk(data?.payload?.chunk || {}); setStatus('SESSION LOADED'); }
      catch (err) { setStatus(`SESSION IMPORT FAILED: ${err.message || err}`, true); }
      return;
    }
    if (data.type === 'SESSION_SAVED') { runtime.dirty = false; setStatus('SESSION SAVED'); return; }
    if (data.type === 'GLOBAL_PLAY_CLEAR' || data.type === 'PANIC_KILL' || data.type === 'DENARRATOR_GLOBAL_STOP') { setOn(false); return; }
    if (data.type === 'DENARRATOR_GLOBAL_PLAY') { if (!state.on) setOn(true); return; }
    if (data.type === 'CLIPLIB_ADD_OK') { setStatus('SENT TO LAZY'); return; }
    if (data.type === 'CLIPLIB_ADD_ERR') { setStatus(`SEND FAILED: ${String(data.error || 'error')}`, true); return; }
    if ((data.type === 'DENARRATOR_IMPORT_CLIP' || data.type === 'BROWSER_LOAD_ITEM') && data.version === 1) {
      try {
        const wavB64 = String(data?.wavBytesBase64 || '');
        if (!wavB64) return;
        await loadSourceFromArrayBuffer(base64ToArrayBuffer(wavB64), String(data?.name || data?.payload?.name || 'browser.wav'));
        setStatus('SOURCE LOADED FROM BROWSER');
      } catch (err) {
        setStatus(`BROWSER LOAD FAILED: ${String(err?.message || err)}`, true);
      }
      return;
    }
  });
}

function init() {
  registerMidi();
  window.parent?.postMessage({ type: 'PATHS_REQ', version: 1 }, '*');
  bind();
  updateReadouts();
  updateStartRange();
  drawWave();
}

init();
