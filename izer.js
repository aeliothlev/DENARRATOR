const BANDS_HZ = [25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 12500, 16000];
const EPS = 0.02;

const FACTORY_PRESETS = [
  { id: "factory_flat", name: "FLAT", kind: "factory", bandsDb: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: "factory_warm", name: "WARM", kind: "factory", bandsDb: [1.5, 1.5, 2.0, 2.5, 2.5, 2.0, 1.0, 0.2, -0.8, -1.2, -0.6, 0.2, 0.8, 1.2, 1.0, 0.6] },
  { id: "factory_dark", name: "DARK", kind: "factory", bandsDb: [1.0, 1.0, 1.2, 1.0, 0.6, 0.2, 0.0, -0.4, -0.8, -1.2, -1.8, -2.6, -3.4, -4.2, -4.6, -5.0] },
  { id: "factory_air", name: "AIR", kind: "factory", bandsDb: [-0.6, -0.6, -0.5, -0.3, -0.2, 0.0, 0.2, 0.4, 0.8, 1.4, 2.2, 3.0, 3.8, 4.8, 5.2, 5.0] },
  { id: "factory_smile", name: "SMILE", kind: "factory", bandsDb: [2.0, 2.0, 2.4, 2.6, 2.2, 1.2, -0.6, -2.2, -3.2, -2.8, -1.4, 0.2, 1.6, 2.6, 2.4, 2.0] },
  { id: "factory_mudcut", name: "MUDCUT", kind: "factory", bandsDb: [0.0, 0.0, 0.0, 0.0, -0.8, -2.8, -4.2, -2.6, -1.0, 0.0, 0.2, 0.2, 0.2, 0.0, 0.0, 0.0] },
  { id: "factory_harshcut", name: "HARSHCUT", kind: "factory", bandsDb: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.4, -0.8, -1.6, -2.8, -3.6, -3.2, -1.6, -0.6, 0.0] },
  { id: "factory_subsafe", name: "SUBSAFE", kind: "factory", bandsDb: [-6.0, -4.5, -3.0, -1.6, -0.6, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0] },
  { id: "factory_shine", name: "SHINE", kind: "factory", bandsDb: [-0.4, -0.4, -0.3, -0.2, 0.0, 0.2, 0.4, 0.8, 1.2, 1.8, 2.6, 3.4, 4.2, 5.0, 5.4, 5.2] },
];

const refs = {
  targetLazyBtn: document.getElementById("targetLazyBtn"),
  targetMasterBtn: document.getElementById("targetMasterBtn"),
  modeInfo: document.getElementById("modeInfo"),
  p2Select: document.getElementById("p2Select"),
  p3Select: document.getElementById("p3Select"),
  segP12: document.getElementById("segP12"),
  segP23: document.getElementById("segP23"),
  segP31: document.getElementById("segP31"),
  sliderP12: document.getElementById("sliderP12"),
  sliderP23: document.getElementById("sliderP23"),
  sliderP31: document.getElementById("sliderP31"),
  valP12: document.getElementById("valP12"),
  valP23: document.getElementById("valP23"),
  valP31: document.getElementById("valP31"),
  lockBadge: document.getElementById("lockBadge"),
  editorLock: document.getElementById("editorLock"),
  bands16: document.getElementById("bands16"),
  editorPresetSelect: document.getElementById("editorPresetSelect"),
  saveBtn: document.getElementById("saveBtn"),
  saveAsBtn: document.getElementById("saveAsBtn"),
  delUserBtn: document.getElementById("delUserBtn"),
  resetBtn: document.getElementById("resetBtn"),
  presetInfo: document.getElementById("presetInfo"),
  status: document.getElementById("status"),
  presetPrompt: document.getElementById("presetPrompt"),
  presetPromptInput: document.getElementById("presetPromptInput"),
  presetPromptOk: document.getElementById("presetPromptOk"),
  presetPromptCancel: document.getElementById("presetPromptCancel"),
};

const state = {
  target: "LAZY_OUT",
  p1: {
    bandsDb: Array.from({ length: 16 }, () => 0),
    presetId: "factory_flat",
    dirty: false,
  },
  p2PresetId: "factory_warm",
  p3PresetId: "factory_air",
  t12: 0,
  t23: 0,
  t31: 0,
  mode: "HOME", // HOME | TO_P2 | TO_P3 | RETURN_HOME
  eps: EPS,
  p1Snap: null,
  userPresets: [],
  paths: null,
};

const runtime = {
  bandInputs: [],
  presetPath: "",
  lastPostSig: "",
  lastPostMs: 0,
};

function clamp(v, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function clamp01(v) {
  return clamp(v, 0, 1);
}

function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

function setStatus(msg, err = false) {
  refs.status.textContent = String(msg || "");
  refs.status.style.color = err ? "#8a3a2d" : "";
}

function sanitizePresetName(raw) {
  return String(raw || "")
    .trim()
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 48)
    .toUpperCase();
}

function makeUserPresetId() {
  return `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function askPresetName(defaultName = "USER") {
  const fallback = () => {
    const typed = window.prompt("Preset name", defaultName);
    const name = sanitizePresetName(typed);
    return Promise.resolve(name || null);
  };
  if (!refs.presetPrompt || !refs.presetPromptInput || !refs.presetPromptOk || !refs.presetPromptCancel) {
    return fallback();
  }

  return new Promise((resolve) => {
    const overlay = refs.presetPrompt;
    const input = refs.presetPromptInput;
    const ok = refs.presetPromptOk;
    const cancel = refs.presetPromptCancel;
    const cleanup = () => {
      overlay.classList.remove("show");
      overlay.setAttribute("aria-hidden", "true");
      ok.removeEventListener("click", onOk);
      cancel.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onOverlay);
      input.removeEventListener("keydown", onKey);
    };
    const finish = (value) => {
      cleanup();
      resolve(value);
    };
    const onOk = () => {
      const name = sanitizePresetName(input.value);
      finish(name || null);
    };
    const onCancel = () => finish(null);
    const onOverlay = (event) => {
      if (event.target === overlay) finish(null);
    };
    const onKey = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onOk();
      } else if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    input.value = sanitizePresetName(defaultName) || "USER";
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
    ok.addEventListener("click", onOk);
    cancel.addEventListener("click", onCancel);
    overlay.addEventListener("click", onOverlay);
    input.addEventListener("keydown", onKey);
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  });
}

function getInvoke() {
  return window.__TAURI__?.core?.invoke;
}

function toBase64(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

function fromBase64(b64) {
  try {
    return decodeURIComponent(escape(atob(String(b64 || ""))));
  } catch {
    return "";
  }
}

function allPresets() {
  return [...FACTORY_PRESETS, ...state.userPresets];
}

function presetById(id) {
  return allPresets().find((p) => p.id === id) || FACTORY_PRESETS[0];
}

function lerpBands(a, b, t) {
  const tt = clamp01(t);
  const out = new Array(16);
  for (let i = 0; i < 16; i += 1) {
    out[i] = clamp((Number(a?.[i]) || 0) + ((Number(b?.[i]) || 0) - (Number(a?.[i]) || 0)) * tt, -12, 12);
  }
  return out;
}

function getP2Bands() {
  return presetById(state.p2PresetId).bandsDb;
}

function getP3Bands() {
  return presetById(state.p3PresetId).bandsDb;
}

function getEffectiveBands() {
  if (state.mode === "TO_P2") return lerpBands(state.p1Snap || state.p1.bandsDb, getP2Bands(), state.t12);
  if (state.mode === "TO_P3") return lerpBands(getP2Bands(), getP3Bands(), state.t23);
  if (state.mode === "RETURN_HOME") return lerpBands(getP3Bands(), state.p1Snap || state.p1.bandsDb, state.t31);
  return state.p1.bandsDb.slice();
}

function postToHost(force = false) {
  const bands = getEffectiveBands().map((v) => clamp(v, -12, 12));
  const payload = {
    bandsHz: BANDS_HZ,
    bands,
    target: state.target === "MASTER_OUT" ? "MASTER" : "LAZY",
    mode: state.mode,
    t12: state.t12,
    t23: state.t23,
    t31: state.t31,
  };
  const sig = `${payload.target}|${payload.mode}|${bands.map((x) => x.toFixed(3)).join(",")}`;
  const now = performance.now();
  if (!force && sig === runtime.lastPostSig && (now - runtime.lastPostMs) < 80) return;
  runtime.lastPostSig = sig;
  runtime.lastPostMs = now;
  window.parent?.postMessage({ type: "IZER_EQ_SET", version: 1, payload }, "*");
}

function syncPresetOptions() {
  const presets = allPresets();
  const setupSelect = (el, selectedId) => {
    el.innerHTML = "";
    for (const p of presets) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name}${p.kind === "user" ? " *" : ""}`;
      if (p.id === selectedId) opt.selected = true;
      el.appendChild(opt);
    }
  };
  setupSelect(refs.p2Select, state.p2PresetId);
  setupSelect(refs.p3Select, state.p3PresetId);
  setupSelect(refs.editorPresetSelect, state.p1.presetId || "factory_flat");
}

function setMode(nextMode) {
  state.mode = nextMode;
}

function completeCycleBackHome() {
  if (Array.isArray(state.p1Snap) && state.p1Snap.length === 16) {
    state.p1.bandsDb = state.p1Snap.slice();
  }
  state.p1Snap = null;
  state.t12 = 0;
  state.t23 = 0;
  state.t31 = 0;
  setMode("HOME");
}

function handleMorphInput(key, value01) {
  const v = clamp01(value01);

  if (key === "t12" && (state.mode === "HOME" || state.mode === "TO_P2")) {
    if (state.mode === "HOME" && v > state.eps) {
      state.p1Snap = state.p1.bandsDb.slice();
      setMode("TO_P2");
    }
    if (state.mode === "TO_P2") {
      state.t12 = Math.max(state.t12, v);
      if (state.t12 >= 1 - state.eps) {
        state.t12 = 1;
        setMode("TO_P3");
        state.t23 = 0;
      }
    }
    return;
  }

  if (key === "t23" && state.mode === "TO_P3") {
    state.t23 = Math.max(state.t23, v);
    if (state.t23 >= 1 - state.eps) {
      state.t23 = 1;
      setMode("RETURN_HOME");
      state.t31 = 0;
    }
    return;
  }

  if (key === "t31" && state.mode === "RETURN_HOME") {
    state.t31 = Math.max(state.t31, v);
    if (state.t31 >= 1 - state.eps) {
      state.t31 = 1;
      completeCycleBackHome();
    }
  }
}

function syncModeUi() {
  const active = state.mode === "TO_P3" ? "P23" : (state.mode === "RETURN_HOME" ? "P31" : "P12");

  const lock = state.mode !== "HOME";
  refs.lockBadge.textContent = lock ? "LOCKED (MORPH)" : "UNLOCKED";
  refs.lockBadge.classList.toggle("on", lock);
  refs.editorLock.classList.toggle("on", lock);

  refs.segP12.classList.toggle("active", active === "P12");
  refs.segP23.classList.toggle("active", active === "P23");
  refs.segP31.classList.toggle("active", active === "P31");
  refs.segP12.classList.toggle("inactive", active !== "P12");
  refs.segP23.classList.toggle("inactive", active !== "P23");
  refs.segP31.classList.toggle("inactive", active !== "P31");

  refs.sliderP12.disabled = active !== "P12";
  refs.sliderP23.disabled = active !== "P23";
  refs.sliderP31.disabled = active !== "P31";

  refs.modeInfo.textContent = `Mode: ${state.mode}`;

  refs.valP12.textContent = `${Math.round(state.t12 * 100)}%`;
  refs.valP23.textContent = `${Math.round(state.t23 * 100)}%`;
  refs.valP31.textContent = `${Math.round(state.t31 * 100)}%`;
  refs.sliderP12.value = String(Math.round(state.t12 * 100));
  refs.sliderP23.value = String(Math.round(state.t23 * 100));
  refs.sliderP31.value = String(Math.round(state.t31 * 100));

  refs.targetLazyBtn.setAttribute("aria-pressed", String(state.target === "LAZY_OUT"));
  refs.targetMasterBtn.setAttribute("aria-pressed", String(state.target === "MASTER_OUT"));

  refs.p2Select.disabled = lock;
  refs.p3Select.disabled = lock;

  refs.presetInfo.textContent = `P1: HOME${state.p1.presetId ? ` (${presetById(state.p1.presetId).name})` : ""} | P2: ${presetById(state.p2PresetId).name} | P3: ${presetById(state.p3PresetId).name}`;
}

function syncEditorThumbs(displayBands = state.p1.bandsDb) {
  for (let i = 0; i < runtime.bandInputs.length; i += 1) {
    const { db, thumb, track } = runtime.bandInputs[i];
    const v = clamp(displayBands?.[i], -12, 12);
    db.textContent = `${v >= 0 ? "+" : ""}${v.toFixed(1)}`;
    const h = track.clientHeight || 1;
    const t = clamp01((v + 12) / 24);
    thumb.style.top = `${(1 - t) * h}px`;
  }
}

function refreshAll(forcePost = true) {
  syncPresetOptions();
  syncModeUi();
  const displayBands = state.mode === "HOME" ? state.p1.bandsDb : getEffectiveBands();
  syncEditorThumbs(displayBands);
  postToHost(forcePost);
}

function buildEditorBandsUi() {
  refs.bands16.innerHTML = "";
  runtime.bandInputs = [];

  const setBandFromClientY = (idx, track, dbEl, clientY, wrap) => {
    if (state.mode !== "HOME") return;
    const rect = track.getBoundingClientRect();
    const y = clamp(clientY - rect.top, 0, rect.height);
    const t = 1 - (y / Math.max(1, rect.height));
    const v = clamp((t * 24) - 12, -12, 12);
    state.p1.bandsDb[idx] = v;
    state.p1.dirty = true;
    dbEl.textContent = `${v >= 0 ? "+" : ""}${v.toFixed(1)}`;
    syncEditorThumbs(state.p1.bandsDb);
    postToHost(true);
    wrap.classList.add("eq-active");
  };

  for (let i = 0; i < 16; i += 1) {
    const col = document.createElement("div");
    col.className = "bcol";
    const db = document.createElement("div");
    db.className = "db";
    const wrap = document.createElement("div");
    wrap.className = "eq-vwrap";
    const track = document.createElement("div");
    track.className = "eq-vtrack";
    const rail = document.createElement("div");
    rail.className = "eq-vrail";
    const thumb = document.createElement("div");
    thumb.className = "eq-vthumb";
    track.append(rail, thumb);

    track.addEventListener("pointerdown", (event) => {
      if (state.mode !== "HOME") return;
      event.preventDefault();
      const pid = event.pointerId;
      track.setPointerCapture?.(pid);
      setBandFromClientY(i, track, db, event.clientY, wrap);

      const onMove = (moveEvent) => setBandFromClientY(i, track, db, moveEvent.clientY, wrap);
      const onEnd = () => {
        wrap.classList.remove("eq-active");
        track.removeEventListener("pointermove", onMove);
        track.removeEventListener("pointerup", onEnd);
        track.removeEventListener("pointercancel", onEnd);
      };

      track.addEventListener("pointermove", onMove);
      track.addEventListener("pointerup", onEnd);
      track.addEventListener("pointercancel", onEnd);
    });

    const hz = document.createElement("div");
    hz.className = "hz";
    hz.textContent = BANDS_HZ[i] >= 1000 ? `${(BANDS_HZ[i] / 1000).toFixed(BANDS_HZ[i] % 1000 === 0 ? 0 : 1)}k` : `${BANDS_HZ[i]}`;

    wrap.appendChild(track);
    col.append(db, wrap, hz);
    refs.bands16.appendChild(col);
    runtime.bandInputs.push({ db, thumb, track });
  }
}

async function saveUserPresetsToDisk() {
  const invoke = getInvoke();
  if (typeof invoke !== "function" || !runtime.presetPath) {
    localStorage.setItem("denarrator.izer.v3.user", JSON.stringify(state.userPresets));
    return;
  }
  try {
    const payload = JSON.stringify({ version: 3, module: "=izer", presets: state.userPresets }, null, 2);
    await invoke("save_blob_to_path", { dataBase64: toBase64(payload), path: runtime.presetPath });
  } catch (error) {
    setStatus(`Preset save failed: ${String(error?.message || error)}`, true);
  }
}

async function loadUserPresetsFromDisk() {
  const invoke = getInvoke();
  if (typeof invoke !== "function" || !runtime.presetPath) {
    try {
      const fallback = localStorage.getItem("denarrator.izer.v3.user");
      if (fallback) state.userPresets = JSON.parse(fallback);
    } catch {}
    return;
  }
  try {
    const b64 = await invoke("read_file_base64", { path: runtime.presetPath });
    const text = fromBase64(b64);
    const parsed = JSON.parse(text || "{}");
    const arr = Array.isArray(parsed?.presets) ? parsed.presets : [];
    state.userPresets = arr
      .filter((p) => p && typeof p.id === "string" && Array.isArray(p.bandsDb) && p.bandsDb.length === 16)
      .map((p) => ({
        id: p.id,
        name: sanitizePresetName(p.name || p.id),
        kind: "user",
        bandsDb: p.bandsDb.map((v) => clamp(v, -12, 12)),
      }));
  } catch {
    // missing file is valid
  }
}

function applyPresetToP1(presetId) {
  const preset = presetById(presetId);
  state.p1.bandsDb = preset.bandsDb.map((v) => clamp(v, -12, 12));
  state.p1.presetId = preset.id;
  state.p1.dirty = false;
  refreshAll(true);
  setStatus(`Loaded HOME preset ${preset.name}.`);
}

async function saveCurrentP1AsUserPreset(name, overwriteId = null) {
  const cleanName = sanitizePresetName(name);
  if (!cleanName) return false;

  if (overwriteId) {
    const idx = state.userPresets.findIndex((p) => p.id === overwriteId);
    if (idx >= 0) {
      state.userPresets[idx] = {
        ...state.userPresets[idx],
        name: cleanName,
        bandsDb: state.p1.bandsDb.map((v) => clamp(v, -12, 12)),
      };
      state.p1.presetId = state.userPresets[idx].id;
      state.p1.dirty = false;
      await saveUserPresetsToDisk();
      refreshAll(true);
      setStatus(`Updated preset ${cleanName}.`);
      return true;
    }
  }

  const id = makeUserPresetId();
  state.userPresets.push({
    id,
    name: cleanName,
    kind: "user",
    bandsDb: state.p1.bandsDb.map((v) => clamp(v, -12, 12)),
  });
  state.p1.presetId = id;
  state.p1.dirty = false;
  await saveUserPresetsToDisk();
  refreshAll(true);
  setStatus(`Saved preset ${cleanName}.`);
  return true;
}

function resetToDefaults() {
  state.target = "LAZY_OUT";
  state.p1 = {
    bandsDb: Array.from({ length: 16 }, () => 0),
    presetId: "factory_flat",
    dirty: false,
  };
  state.p2PresetId = "factory_warm";
  state.p3PresetId = "factory_air";
  state.t12 = 0;
  state.t23 = 0;
  state.t31 = 0;
  state.mode = "HOME";
  state.p1Snap = null;
  refreshAll(true);
  setStatus("=izer reset.");
}

function exportChunk() {
  return {
    schemaVersion: 4,
    target: state.target,
    p1: deepClone(state.p1),
    p2PresetId: state.p2PresetId,
    p3PresetId: state.p3PresetId,
    t12: state.t12,
    t23: state.t23,
    t31: state.t31,
    mode: state.mode,
    eps: state.eps,
    p1Snap: state.p1Snap ? state.p1Snap.slice() : null,
    userPresets: deepClone(state.userPresets),
  };
}

function importChunk(chunk) {
  if (!chunk || typeof chunk !== "object") return;

  const schema = Number(chunk.schemaVersion || 0);
  if (schema >= 4) {
    if (chunk.target === "MASTER_OUT" || chunk.target === "LAZY_OUT") state.target = chunk.target;
    if (chunk.p1?.bandsDb && Array.isArray(chunk.p1.bandsDb) && chunk.p1.bandsDb.length === 16) {
      state.p1 = {
        bandsDb: chunk.p1.bandsDb.map((v) => clamp(v, -12, 12)),
        presetId: typeof chunk.p1.presetId === "string" ? chunk.p1.presetId : "factory_flat",
        dirty: Boolean(chunk.p1.dirty),
      };
    }
    if (typeof chunk.p2PresetId === "string") state.p2PresetId = chunk.p2PresetId;
    if (typeof chunk.p3PresetId === "string") state.p3PresetId = chunk.p3PresetId;
    state.t12 = clamp01(chunk.t12 ?? 0);
    state.t23 = clamp01(chunk.t23 ?? 0);
    state.t31 = clamp01(chunk.t31 ?? 0);
    if (["HOME", "TO_P2", "TO_P3", "RETURN_HOME"].includes(chunk.mode)) state.mode = chunk.mode;
    if (Array.isArray(chunk.p1Snap) && chunk.p1Snap.length === 16) {
      state.p1Snap = chunk.p1Snap.map((v) => clamp(v, -12, 12));
    }
  } else {
    // migration from older versions
    if (chunk.outputTarget === "MASTER" || chunk.target === "MASTER_OUT") state.target = "MASTER_OUT";
    if (chunk.editor16?.bandsDb && Array.isArray(chunk.editor16.bandsDb) && chunk.editor16.bandsDb.length === 16) {
      state.p1.bandsDb = chunk.editor16.bandsDb.map((v) => clamp(v, -12, 12));
    }
    if (chunk.presets?.slots) {
      if (typeof chunk.presets.slots.P2 === "string") state.p2PresetId = chunk.presets.slots.P2;
      if (typeof chunk.presets.slots.P3 === "string") state.p3PresetId = chunk.presets.slots.P3;
    }
    state.mode = "HOME";
    state.t12 = 0;
    state.t23 = 0;
    state.t31 = 0;
    state.p1Snap = null;
  }

  if (Array.isArray(chunk.userPresets)) {
    state.userPresets = chunk.userPresets
      .filter((p) => p && typeof p.id === "string" && Array.isArray(p.bandsDb) && p.bandsDb.length === 16)
      .map((p) => ({
        id: p.id,
        name: sanitizePresetName(p.name || p.id),
        kind: "user",
        bandsDb: p.bandsDb.map((v) => clamp(v, -12, 12)),
      }));
  }
}

function wireEvents() {
  refs.targetLazyBtn.addEventListener("click", () => {
    state.target = "LAZY_OUT";
    refreshAll(true);
  });

  refs.targetMasterBtn.addEventListener("click", () => {
    state.target = "MASTER_OUT";
    refreshAll(true);
  });

  refs.p2Select.addEventListener("change", () => {
    if (state.mode !== "HOME") {
      setStatus("Locked (Morph). Return to HOME first.", true);
      refreshAll(false);
      return;
    }
    state.p2PresetId = String(refs.p2Select.value || "factory_warm");
    refreshAll(true);
  });

  refs.p3Select.addEventListener("change", () => {
    if (state.mode !== "HOME") {
      setStatus("Locked (Morph). Return to HOME first.", true);
      refreshAll(false);
      return;
    }
    state.p3PresetId = String(refs.p3Select.value || "factory_air");
    refreshAll(true);
  });

  refs.editorPresetSelect.addEventListener("change", () => {
    if (state.mode !== "HOME") {
      setStatus("Editor locked (Morph).", true);
      refreshAll(false);
      return;
    }
    applyPresetToP1(String(refs.editorPresetSelect.value || "factory_flat"));
  });

  refs.sliderP12.addEventListener("input", () => {
    handleMorphInput("t12", Number(refs.sliderP12.value) / 100);
    refreshAll(true);
  });

  refs.sliderP23.addEventListener("input", () => {
    handleMorphInput("t23", Number(refs.sliderP23.value) / 100);
    refreshAll(true);
  });

  refs.sliderP31.addEventListener("input", () => {
    handleMorphInput("t31", Number(refs.sliderP31.value) / 100);
    refreshAll(true);
  });

  refs.saveBtn.addEventListener("click", async () => {
    if (state.mode !== "HOME") {
      setStatus("Editor locked (Morph).", true);
      return;
    }
    const selected = presetById(state.p1.presetId || "factory_flat");
    if (selected.kind === "user") {
      await saveCurrentP1AsUserPreset(selected.name, selected.id);
      return;
    }
    const name = await askPresetName(selected.name || "USER");
    if (!name) return;
    await saveCurrentP1AsUserPreset(name);
  });

  refs.saveAsBtn.addEventListener("click", async () => {
    if (state.mode !== "HOME") {
      setStatus("Editor locked (Morph).", true);
      return;
    }
    const selected = presetById(state.p1.presetId || "factory_flat");
    const name = await askPresetName(selected.name || "USER");
    if (!name) return;
    await saveCurrentP1AsUserPreset(name);
  });

  refs.delUserBtn.addEventListener("click", async () => {
    if (state.mode !== "HOME") {
      setStatus("Editor locked (Morph).", true);
      return;
    }
    const selectedId = state.p1.presetId || "factory_flat";
    const victim = state.userPresets.find((p) => p.id === selectedId);
    if (!victim) {
      setStatus("Select a user preset in HOME editor to delete.", true);
      return;
    }
    if (!window.confirm(`Delete ${victim.name}?`)) return;
    state.userPresets = state.userPresets.filter((p) => p.id !== victim.id);
    if (state.p2PresetId === victim.id) state.p2PresetId = "factory_warm";
    if (state.p3PresetId === victim.id) state.p3PresetId = "factory_air";
    state.p1.presetId = "factory_flat";
    await saveUserPresetsToDisk();
    refreshAll(true);
    setStatus(`Deleted ${victim.name}.`);
  });

  refs.resetBtn.addEventListener("click", () => {
    resetToDefaults();
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.version !== 1) return;

    if (data.type === "PATHS_BROADCAST") {
      state.paths = data.payload || null;
      const mater = String(state.paths?.mater || "");
      runtime.presetPath = `${mater}/Presets/=izer/izer_user_presets.json`;
      return;
    }

    if (data.type === "SESSION_EXPORT_REQ") {
      window.parent?.postMessage({ type: "SESSION_EXPORT_CHUNK", version: 1, payload: { moduleId: "izer", chunk: exportChunk() } }, "*");
      return;
    }

    if (data.type === "SESSION_IMPORT") {
      importChunk(data.payload?.izer || data.payload?.chunk?.izer || data.payload?.chunk || {});
      refreshAll(true);
      return;
    }

    if (data.type === "BROWSER_APPLY_PRESET" || data.type === "BROWSER_LOAD_ITEM") {
      const presetId = String(data.payload?.presetId || "");
      if (presetId && allPresets().some((p) => p.id === presetId)) {
        if (state.mode !== "HOME") {
          setStatus("Locked (Morph). Return to HOME first.", true);
          return;
        }
        applyPresetToP1(presetId);
      }
    }
  });
}

async function bootstrap() {
  const invoke = getInvoke();
  if (typeof invoke === "function") {
    try {
      const p = await invoke("paths_get_or_init");
      state.paths = p;
      const mater = String(p?.mater || "");
      runtime.presetPath = `${mater}/Presets/=izer/izer_user_presets.json`;
    } catch {}
  }

  buildEditorBandsUi();
  await loadUserPresetsFromDisk();
  wireEvents();
  refreshAll(true);

  window.parent?.postMessage({
    type: "BROWSER_CAPS_REGISTER",
    version: 1,
    payload: {
      moduleId: "izer",
      displayName: "=izer",
      accepts: { audio: false, image: false, session: false, preset: true },
      loadTargets: [{ id: "PRESET", label: "Apply =izer Preset", kind: "preset" }],
      defaults: { presetTarget: "PRESET" },
    },
  }, "*");
}

void bootstrap();
