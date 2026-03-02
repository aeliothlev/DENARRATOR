const MIN_EMPTY_TIMELINE_SECONDS = 1;
const PEAK_POINTS = 1600;
const IZER_BANDS_HZ = [25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 12500, 16000];

function createDefaultIzerState() {
  return {
    bandsHz: [...IZER_BANDS_HZ],
    bands: Array.from({ length: 16 }, () => 0),
  };
}

const state = {
  timelineDuration: MIN_EMPTY_TIMELINE_SECONDS,
  clips: [],
  gainMinDb: -24,
  gainMaxDb: 0,
  retriggerRate: 0,
  gaterRate: 0,
  saturatorDrive: 1,
  saturatorMix: 0,
  delayEnabled: false,
  delayTimeMs: 260,
  delayFeedback: 0.35,
  delayMix: 0.28,
  pitchSemitones: 0,
  invCutoff: 0,
  exportAutomationEnabled: false,
  isAudioRecording: false,
  automation: {
    isRecording: false,
    lanes: {
      retriggerRate: [],
      gaterRate: [],
      saturatorDrive: [],
      saturatorMix: [],
      pitchSemitones: [],
      invCutoff: [],
    },
  },
  playheadTime: 0,
  isPlaying: false,
  transport: {
    playing: false,
    playheadSec: 0,
  },
  resumeSnapshot: {
    valid: false,
    capturedAtSec: 0,
    wasPlaying: false,
    loopstack: {
      followTransport: true,
      voices: [],
    },
  },
  loopEnabled: true,
  loopStartTime: 0,
  loopEndTime: MIN_EMPTY_TIMELINE_SECONDS,
  timelineFlexoMode: false,
  timelineStopLocked: false,
  timelineStopDuration: MIN_EMPTY_TIMELINE_SECONDS,
  loopMode: false,
  repeatSnap: true,
  repeatSnapCfg: {
    snapPx: 6,
    releasePx: 10,
  },
  toolMode: "arrow",
  channelMode: false,
  activeTab: "sequencer",
  selectedRootId: null,
  transportAnchorContextTime: 0,
  transportAnchorPlayhead: 0,
  nextClipId: 1,
  loopstack: {
    open: false,
    voices: [],
    followTransport: true,
    defaultStartMode: "free",
    relScaleView: true,
    muteAll: false,
    panicPaused: false,
    userPaused: false,
    normFrameMode: "median",
    normFrameSec: 0.25,
  },
  mixer: {
    open: false,
    ch: [
      { gain: 1, muted: false },
      { gain: 1, muted: false },
      { gain: 1, muted: false },
      { gain: 1, muted: false },
    ],
  },
  izer: createDefaultIzerState(),
};

const runtime = {
  audioContext: null,
  masterNodes: null,
  playingNodes: [],
  rafId: null,
  loopTimer: null,
  drag: null,
  undoStack: [],
  pendingDragUndoSnapshot: null,
  steppedApplyTimers: {
    retrigger: null,
    gater: null,
  },
  audioRecorder: null,
  selectedClipIds: new Set(),
  meterLevel: 0,
  meterData: null,
  clearAutomationArmed: false,
  clearAutomationArmTimer: null,
  hasUnsavedChanges: false,
  masterOutputVolume: 1,
  masterLimiterEnabled: false,
  selectedOutputDeviceId: "",
  delaySelectEnabled: false,
  cliplibRequestSeq: 1,
  cliplibPendingPathByRequest: new Map(),
  loopstackClearArmed: false,
  loopstackClearArmTimer: null,
  loopstackToastTimer: null,
  looprUiTimer: null,
  looprToggleBusy: false,
  loopPopupClipId: null,
  loopMarkerImage: null,
  loopMarkerImageReady: false,
  mixerDrag: null,
  midiMapMode: false,
  midiLastTrigger: {},
  transportPlayToken: null,
  timelineWorldWidthPx: 1400,
  timelinePaddingPx: 0,
  timelineMinWorldPx: 1400,
  timelinePxPerSec: 120,
  newClipHighlights: new Map(),
  highlightRafId: null,
};

const canvas = document.getElementById("timelineCanvas");
const ctx = canvas.getContext("2d");
const timelineViewport = document.getElementById("timelineViewport");
const fileInput = document.getElementById("fileInput");
const quenceInput = document.getElementById("quenceInput");
const automationInput = document.getElementById("automationInput");
const folderPickerInput = document.getElementById("folderPickerInput");
const importBtn = document.getElementById("importBtn");
const loadQuenceBtn = document.getElementById("loadQuenceBtn");
const dropzone = document.querySelector(".dropzone-wrap");
const clipList = document.getElementById("clipList");
const tabSequencerBtn = document.getElementById("tabSequencerBtn");
const tabClipListBtn = document.getElementById("tabClipListBtn");
const sequencerPanel = document.getElementById("sequencerPanel");
const sequencerControls = document.getElementById("sequencerControls");
const clipListPanel = document.getElementById("clipListPanel");
const playBtn = document.getElementById("playBtn");
const rewindBtn = document.getElementById("rewindBtn");
const stopBtn = document.getElementById("stopBtn");
const undoBtn = document.getElementById("undoBtn");
const loopBtn = document.getElementById("loopBtn");
const duplicateLoopBtn = document.getElementById("duplicateLoopBtn");
const stackToggleBtn = document.getElementById("stackToggleBtn");
const channelModeBtn = document.getElementById("channelModeBtn");
const mixToggleBtn = document.getElementById("mixToggleBtn");
const loopModeBtn = document.getElementById("loopModeBtn");
const repeatSnapBtn = document.getElementById("repeatSnapBtn");
const flexoModeBtn = document.getElementById("flexoModeBtn");
const stopTimelineBtn = document.getElementById("stopTimelineBtn");
const toolBtn = document.getElementById("toolBtn");
const delayKillBtn = document.getElementById("delayKillBtn");
const delaySelectBtn = document.getElementById("delaySelectBtn");
const exportLoopBtn = document.getElementById("exportLoopBtn");
const exportAutomationBtn = document.getElementById("exportAutomationBtn");
const newFileBtn = document.getElementById("newFileBtn");
const saveQuenceBtn = document.getElementById("saveQuenceBtn");
const pasteCliplibBtn = document.getElementById("pasteCliplibBtn");
const recordAutomationBtn = document.getElementById("recordAutomationBtn");
const recordFaderBtn = document.getElementById("recordFaderBtn");
const clearAutomationBtn = document.getElementById("clearAutomationBtn");
const loadAutomationBtn = document.getElementById("loadAutomationBtn");
const quenceNameInput = document.getElementById("quenceNameInput");
const gainMinInput = document.getElementById("gainMinInput");
const gainMaxInput = document.getElementById("gainMaxInput");
const retriggerInput = document.getElementById("retriggerInput");
const gaterInput = document.getElementById("gaterInput");
const satDriveInput = document.getElementById("satDriveInput");
const satMixInput = document.getElementById("satMixInput");
const rhythmPad = document.getElementById("rhythmPad");
const rhythmPadCursor = document.getElementById("rhythmPadCursor");
const saturatorPad = document.getElementById("saturatorPad");
const saturatorPadCursor = document.getElementById("saturatorPadCursor");
const tonePad = document.getElementById("tonePad");
const tonePadCursor = document.getElementById("tonePadCursor");
const pitchInput = document.getElementById("pitchInput");
const invCutoffInput = document.getElementById("invCutoffInput");
const pitchValue = document.getElementById("pitchValue");
const invCutoffValue = document.getElementById("invCutoffValue");
const retriggerValue = document.getElementById("retriggerValue");
const gaterValue = document.getElementById("gaterValue");
const satDriveValue = document.getElementById("satDriveValue");
const satMixValue = document.getElementById("satMixValue");
const delayTimeInput = document.getElementById("delayTimeInput");
const delayFeedbackInput = document.getElementById("delayFeedbackInput");
const delayMixInput = document.getElementById("delayMixInput");
const delayTimeValue = document.getElementById("delayTimeValue");
const delayFeedbackValue = document.getElementById("delayFeedbackValue");
const delayMixValue = document.getElementById("delayMixValue");
const timelineInfo = document.getElementById("timelineInfo");
const playheadInfo = document.getElementById("playheadInfo");
const clipInfo = document.getElementById("clipInfo");
const dropHint = document.getElementById("dropHint");
const loopInfo = document.getElementById("loopInfo");
const loopstackPanel = document.getElementById("clipListPanel");
const looprPausedBadge = document.getElementById("looprPausedBadge");
const looprPlayBtn = document.getElementById("looprPlayBtn");
const loopstackMuteAllBtn = document.getElementById("loopstackMuteAllBtn");
const loopstackFollowBtn = document.getElementById("loopstackFollowBtn");
const loopstackStartModeBtn = document.getElementById("loopstackStartModeBtn");
const loopstackResumeAllBtn = document.getElementById("loopstackResumeAllBtn");
const loopstackClearBtn = document.getElementById("loopstackClearBtn");
const loopstackList = document.getElementById("loopstackList");
const clipLoopPopup = document.getElementById("clipLoopPopup");
const clipLoopCanvas = document.getElementById("clipLoopCanvas");
const clipLoopName = document.getElementById("clipLoopName");
const clipLoopInInput = document.getElementById("clipLoopInInput");
const clipLoopOutInput = document.getElementById("clipLoopOutInput");
const clipLoopRangeInfo = document.getElementById("clipLoopRangeInfo");
const clipLoopStartMode = document.getElementById("clipLoopStartMode");
const clipLoopAfterMode = document.getElementById("clipLoopAfterMode");
const clipLoopOnBtn = document.getElementById("clipLoopOnBtn");
const clipLoopCancelBtn = document.getElementById("clipLoopCancelBtn");
const clipLoopCancelBtn2 = document.getElementById("clipLoopCancelBtn2");
const loopstackToast = document.getElementById("loopstackToast");
const loopstackToastText = document.getElementById("loopstackToastText");
const loopstackToastOpenBtn = document.getElementById("loopstackToastOpenBtn");
const mixerPanel = document.getElementById("mixerPanel");
const mixerCloseBtn = document.getElementById("mixerCloseBtn");
const mixerMuteAllBtn = document.getElementById("mixerMuteAllBtn");
const mixerFaders = Array.from(document.querySelectorAll(".mixer-fader"));
const mixerDbLabels = Array.from(document.querySelectorAll(".mixer-db"));
const mixerMuteButtons = Array.from(document.querySelectorAll(".mixer-mute-btn"));
const LOOP_MARKER_HIT_PX = 18;
const LOOP_MIN_GAP_SECONDS = 0.05;
const LOOP_TRIANGLE_SIZE = 5;
const LOOP_MARKER_DRAW_WIDTH = 16;
const LOCK_LOOP_END_TO_TIMELINE = false;
const CLIP_CUT_MIN_SEGMENT_SECONDS = 0.03;
const LOOPSTACK_MIN_REGION_SECONDS = 0.01;
const LOOPMODE_HANDLE_HIT_PX = 10;
const TOOL_ORDER = ["arrow", "select", "scissor", "duplicate", "delete", "half", "double", "reverse"];
const TOOL_LABELS = {
  arrow: "ARROW",
  select: "SELECT",
  scissor: "SCISSOR",
  duplicate: "DUPLICATE",
  delete: "DELETE",
  half: "HALF LENGTH",
  double: "DOUBLE LENGTH",
  reverse: "REVERSE",
};
const UNDO_LIMIT = 10;
const RATE_STEPS = [0, 2, 4, 8, 16, 32];
const AUTOMATION_MIN_TIME_DELTA = 0.01;
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeIzerGroupPayload(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const bandsHz = Array.isArray(source.bandsHz) && source.bandsHz.length === 16
    ? source.bandsHz.map((v, i) => clamp(Number(v) || IZER_BANDS_HZ[i], 20, 20000))
    : [...IZER_BANDS_HZ];
  let srcBands = [];
  if (Array.isArray(source.bands) && source.bands.length === 16) {
    srcBands = source.bands;
  } else if (source.groups && typeof source.groups === "object" && Array.isArray(source.groups.DEF)) {
    srcBands = source.groups.DEF;
  }
  const bands = Array.from({ length: 16 }, (_, i) => clamp(Number(srcBands[i]) || 0, -24, 24));
  return { bandsHz, bands };
}

function izerBandsForChannel(channelIndex) {
  return state.izer.bands;
}

function createLoopVoiceId() {
  return `lv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function setDropHint(message, isError = false) {
  dropHint.textContent = message;
  dropHint.style.color = isError ? "#8a3a2d" : "#55585a";
}

function globalPlayStart(sourceLabel) {
  const token = `lazy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    window.parent?.postMessage(
      {
        type: "GLOBAL_PLAY_START",
        version: 1,
        payload: {
          token,
          moduleId: "lazy",
          source: sourceLabel,
        },
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

function clearGlobalPlayTokens() {
  if (runtime.transportPlayToken) {
    globalPlayStop(runtime.transportPlayToken);
    runtime.transportPlayToken = null;
  }
  for (const voice of state.loopstack.voices) {
    if (voice?._playToken) {
      globalPlayStop(voice._playToken);
      voice._playToken = null;
    }
  }
}

function getLooprNormLenSec() {
  if (!state.loopstack.voices.length) {
    return Math.max(LOOPSTACK_MIN_REGION_SECONDS, Number(state.loopstack.normFrameSec) || 0.25);
  }
  if (state.loopstack.normFrameMode === "fixed") {
    return Math.max(LOOPSTACK_MIN_REGION_SECONDS, Number(state.loopstack.normFrameSec) || 0.25);
  }
  const lengths = state.loopstack.voices
    .map((voice) => Math.max(LOOPSTACK_MIN_REGION_SECONDS, Number(voice.loopOutSec) - Number(voice.loopInSec)))
    .sort((a, b) => a - b);
  const mid = Math.floor(lengths.length / 2);
  if (lengths.length % 2 === 0) {
    return Math.max(LOOPSTACK_MIN_REGION_SECONDS, (lengths[mid - 1] + lengths[mid]) * 0.5);
  }
  return Math.max(LOOPSTACK_MIN_REGION_SECONDS, lengths[mid]);
}

function getLooprMaxRatio(normLenSec) {
  const norm = Math.max(LOOPSTACK_MIN_REGION_SECONDS, Number(normLenSec) || LOOPSTACK_MIN_REGION_SECONDS);
  let maxRatio = 1;
  for (const voice of state.loopstack.voices) {
    const len = Math.max(LOOPSTACK_MIN_REGION_SECONDS, Number(voice.loopOutSec) - Number(voice.loopInSec));
    const ratio = len / norm;
    if (ratio > maxRatio) maxRatio = ratio;
  }
  return Math.max(1, maxRatio);
}

function getLoopVoicePhase01(voice) {
  if (!voice || voice.paused || voice.enabled === false || !voice.node?.src) return null;
  const audioContext = runtime.audioContext;
  if (!audioContext) return null;
  const loopLen = Math.max(LOOPSTACK_MIN_REGION_SECONDS, Number(voice.loopOutSec) - Number(voice.loopInSec));
  const startedAt = Number(voice.createdAtAudioTime) || audioContext.currentTime;
  const elapsed = Math.max(0, audioContext.currentTime - startedAt);
  return (elapsed % loopLen) / loopLen;
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
    { id: "lazy.mixer.ch0", label: "Lazy CH0 Fader", kind: "continuous", default: 1.0 },
    { id: "lazy.mixer.ch1", label: "Lazy CH1 Fader", kind: "continuous", default: 1.0 },
    { id: "lazy.mixer.ch2", label: "Lazy CH2 Fader", kind: "continuous", default: 1.0 },
    { id: "lazy.mixer.ch3", label: "Lazy CH3 Fader", kind: "continuous", default: 1.0 },
    { id: "lazy.xy.rhythm", label: "Lazy Rhythm", kind: "continuous", default: 0 },
    { id: "lazy.xy.drive", label: "Lazy Drive", kind: "continuous", default: 0 },
    { id: "lazy.xy.tone", label: "Lazy Tone", kind: "continuous", default: 0.5 },
    { id: "lazy.xy.mix", label: "Lazy Mix", kind: "continuous", default: 0 },
    { id: "lazy.loopstack.muteAll", label: "Lazy Loopstack Mute All", kind: "toggle", default: 0 },
    { id: "lazy.loopstack.resumeAll", label: "Lazy Loopstack Resume All", kind: "trigger", default: 0 },
  ];
  try {
    window.parent?.postMessage(
      {
        type: "MIDI_TARGETS_REGISTER",
        version: 1,
        moduleId: "lazy",
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
  if (targetId === "lazy.xy.rhythm") {
    const maxIndex = RATE_STEPS.length - 1;
    const idx = clamp(Math.round(v * maxIndex), 0, maxIndex);
    retriggerInput.value = String(idx);
    state.retriggerRate = RATE_STEPS[idx];
    retriggerValue.textContent = String(state.retriggerRate);
    syncRhythmPadCursor();
    applyRhythmLive();
    return;
  }
  if (targetId === "lazy.xy.drive") {
    state.saturatorDrive = 1 + v * 39;
    satDriveInput.value = String(Math.round(state.saturatorDrive));
    satDriveValue.textContent = state.saturatorDrive.toFixed(1);
    syncSaturatorPadCursor();
    applyMasterParams();
    return;
  }
  if (targetId === "lazy.xy.tone") {
    state.pitchSemitones = -12 + v * 24;
    pitchInput.value = String(state.pitchSemitones.toFixed(1));
    pitchValue.textContent = `${state.pitchSemitones >= 0 ? "+" : ""}${state.pitchSemitones.toFixed(1)}st`;
    syncTonePadCursor();
    applyMasterParams();
    return;
  }
  if (targetId === "lazy.xy.mix") {
    state.saturatorMix = v;
    satMixInput.value = String(Math.round(v * 100));
    satMixValue.textContent = `${Math.round(v * 100)}%`;
    syncSaturatorPadCursor();
    applyMasterParams();
    return;
  }
  if (targetId.startsWith("lazy.mixer.ch")) {
    const idx = sanitizeChannelId(targetId.slice("lazy.mixer.ch".length));
    state.mixer.ch[idx].gain = v;
    if (v > 0.001) state.mixer.ch[idx].muted = false;
    applyMasterParams();
    updateMixerUi();
    return;
  }
  if (targetId === "lazy.loopstack.muteAll") {
    state.loopstack.muteAll = v >= 0.5;
    for (const voice of state.loopstack.voices) {
      applyLoopVoiceGainState(voice);
    }
    updateLoopstackHeaderButtons();
    renderLoopstackList();
    return;
  }
  if (targetId === "lazy.loopstack.resumeAll") {
    const prev = Boolean(runtime.midiLastTrigger[targetId]);
    const next = v >= 0.5;
    runtime.midiLastTrigger[targetId] = next;
    if (!prev && next) {
      resumeAllLoopVoices();
    }
  }
}

function markUnsavedChanges() {
  runtime.hasUnsavedChanges = true;
}

function markSavedState() {
  runtime.hasUnsavedChanges = false;
}

function updateAutomationUi() {
  if (recordAutomationBtn) {
    recordAutomationBtn.setAttribute("aria-pressed", String(state.isAudioRecording));
    recordAutomationBtn.textContent = state.isAudioRecording ? "REC AUDIO ON" : "REC AUDIO";
  }
  if (recordFaderBtn) {
    recordFaderBtn.setAttribute("aria-pressed", String(state.automation.isRecording));
    recordFaderBtn.textContent = state.automation.isRecording ? "REC FDR ON" : "REC FDR";
  }
  if (clearAutomationBtn) {
    clearAutomationBtn.setAttribute("aria-pressed", String(runtime.clearAutomationArmed));
    clearAutomationBtn.textContent = runtime.clearAutomationArmed ? "CLR FDR ?" : "CLR FDR";
  }
  if (exportAutomationBtn) {
    exportAutomationBtn.setAttribute("aria-pressed", String(state.exportAutomationEnabled));
    exportAutomationBtn.textContent = state.exportAutomationEnabled ? "EXP AUTO ON" : "EXP AUTO OFF";
  }
}

function disarmClearAutomationButton() {
  if (runtime.clearAutomationArmTimer) {
    clearTimeout(runtime.clearAutomationArmTimer);
    runtime.clearAutomationArmTimer = null;
  }
  runtime.clearAutomationArmed = false;
  updateAutomationUi();
}

function armClearAutomationButton() {
  if (runtime.clearAutomationArmTimer) {
    clearTimeout(runtime.clearAutomationArmTimer);
  }
  runtime.clearAutomationArmed = true;
  updateAutomationUi();
  runtime.clearAutomationArmTimer = setTimeout(() => {
    runtime.clearAutomationArmTimer = null;
    runtime.clearAutomationArmed = false;
    updateAutomationUi();
  }, 2200);
}

function clearAutomationLanes() {
  for (const key of Object.keys(state.automation.lanes)) {
    state.automation.lanes[key] = [];
  }
}

function hasAutomationData() {
  return Object.values(state.automation.lanes).some((lane) => lane.length > 0);
}

function sampleLaneAtTime(lane, timeSeconds) {
  if (!lane || lane.length === 0) return undefined;
  for (let i = lane.length - 1; i >= 0; i -= 1) {
    if (lane[i].t <= timeSeconds) return lane[i].v;
  }
  return lane[0].v;
}

function pushAutomationPoint(key, value, timeSeconds = getCurrentPlayheadTime()) {
  if (!state.automation.isRecording) return;
  const lane = state.automation.lanes[key];
  if (!lane) return;
  const t = clamp(Number(timeSeconds) || 0, 0, state.timelineDuration);
  const v = Number(value);
  const last = lane[lane.length - 1];
  if (last && Math.abs(last.t - t) < AUTOMATION_MIN_TIME_DELTA && Math.abs(last.v - v) < 1e-6) {
    return;
  }
  lane.push({ t, v });
  markUnsavedChanges();
}

function normalizePathKey(value) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .toLowerCase();
}

function pathTail(value) {
  const normalized = normalizePathKey(value);
  if (!normalized) return "";
  const parts = normalized.split("/");
  return parts[parts.length - 1] || "";
}

function collectClipLookupKeys(item) {
  const rawCandidates = [
    item?.sourceRelativePath,
    item?.sourcePath,
    item?.relativePath,
    item?.filePath,
    item?.sourceName,
    item?.fileName,
    item?.name,
  ];
  const keys = new Set();
  for (const candidate of rawCandidates) {
    if (typeof candidate !== "string" || !candidate.trim()) {
      continue;
    }
    const normalized = normalizePathKey(candidate);
    if (!normalized) {
      continue;
    }
    keys.add(normalized);
    const tail = pathTail(normalized);
    if (tail) {
      keys.add(tail);
    }
  }
  return Array.from(keys);
}

function addLookupFile(fileMap, key, file) {
  if (!key || fileMap.has(key)) {
    return;
  }
  fileMap.set(key, file);
}

async function collectFilesFromDirectoryHandle(handle, prefix = "") {
  const files = [];
  for await (const [name, entry] of handle.entries()) {
    const nextPrefix = prefix ? `${prefix}/${name}` : name;
    if (entry.kind === "file") {
      const file = await entry.getFile();
      files.push({ file, relativePath: normalizePathKey(nextPrefix) });
      continue;
    }
    if (entry.kind === "directory") {
      const nested = await collectFilesFromDirectoryHandle(entry, nextPrefix);
      files.push(...nested);
    }
  }
  return files;
}

async function pickRecoveryFilesFromInput() {
  if (!folderPickerInput) {
    return [];
  }
  return new Promise((resolve) => {
    const onChange = () => {
      const files = Array.from(folderPickerInput.files || []);
      const entries = files.map((file) => ({
        file,
        relativePath: normalizePathKey(file.webkitRelativePath || file.name),
      }));
      folderPickerInput.value = "";
      resolve(entries);
    };
    folderPickerInput.addEventListener("change", onChange, { once: true });
    folderPickerInput.click();
  });
}

async function pickRecoveryFiles() {
  if (typeof window.showDirectoryPicker === "function") {
    try {
      const handle = await window.showDirectoryPicker({
        mode: "read",
        startIn: "documents",
      });
      return collectFilesFromDirectoryHandle(handle);
    } catch (error) {
      if (error?.name === "AbortError") {
        throw error;
      }
    }
  }
  return pickRecoveryFilesFromInput();
}

async function resolveMissingClipAudio(missingItems, audioContext) {
  if (!missingItems.length) {
    return [];
  }

  setDropHint(`MISSING ${missingItems.length} CLIP FILES. SELECT FOLDER...`, true);
  const candidates = await pickRecoveryFiles();
  if (!candidates.length) {
    throw new Error("No folder files selected for recovery.");
  }

  const fileMap = new Map();
  for (const { file, relativePath } of candidates) {
    addLookupFile(fileMap, normalizePathKey(relativePath), file);
    addLookupFile(fileMap, pathTail(relativePath), file);
    addLookupFile(fileMap, normalizePathKey(file.name), file);
  }

  const unresolvedNames = [];
  const resolved = [];
  for (const item of missingItems) {
    const keys = collectClipLookupKeys(item.raw);
    const matchedFile = keys.map((key) => fileMap.get(key)).find(Boolean);
    if (!matchedFile) {
      unresolvedNames.push(item.raw?.name || "CLIP");
      continue;
    }
    const arrayBuffer = await matchedFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    resolved.push({ ...item, audioBuffer });
  }

  if (unresolvedNames.length) {
    throw new Error(`Could not recover: ${unresolvedNames.slice(0, 4).join(", ")}${unresolvedNames.length > 4 ? "..." : ""}`);
  }

  return resolved;
}

function updateSliderTagPosition(inputEl, tagEl) {
  const min = Number(inputEl.min || 0);
  const max = Number(inputEl.max || 100);
  const value = Number(inputEl.value || min);
  const ratio = max === min ? 0 : (value - min) / (max - min);
  const padding = 12;
  const x = padding + ratio * Math.max(1, inputEl.clientWidth - padding * 2);
  tagEl.style.left = `${x}px`;
}

function setPadCursor(cursor, normX, normY) {
  if (!cursor) return;
  cursor.style.left = `${clamp(normX, 0, 1) * 100}%`;
  cursor.style.top = `${clamp(normY, 0, 1) * 100}%`;
}

function syncRhythmPadCursor() {
  const maxIndex = RATE_STEPS.length - 1;
  const retriggerIndex = clamp(Number(retriggerInput.value) || 0, 0, maxIndex);
  const gaterIndex = clamp(Number(gaterInput.value) || 0, 0, maxIndex);
  const x = maxIndex === 0 ? 0 : retriggerIndex / maxIndex;
  const y = 1 - (maxIndex === 0 ? 0 : gaterIndex / maxIndex);
  setPadCursor(rhythmPadCursor, x, y);
}

function syncSaturatorPadCursor() {
  const drive = clamp(Number(satDriveInput.value) || 1, 1, 40);
  const mix = clamp(Number(satMixInput.value) || 0, 0, 100);
  const x = (drive - 1) / 39;
  const y = 1 - mix / 100;
  setPadCursor(saturatorPadCursor, x, y);
}

function syncTonePadCursor() {
  const pitch = clamp(Number(pitchInput.value) || 0, -12, 12);
  const invCutoff = clamp(Number(invCutoffInput.value) || 0, 0, 1);
  const x = (pitch + 12) / 24;
  const y = 1 - invCutoff;
  setPadCursor(tonePadCursor, x, y);
}

function refreshAllSliderTags() {
  syncRhythmPadCursor();
  syncSaturatorPadCursor();
  syncTonePadCursor();
}

function updateDelayUi() {
  if (delayKillBtn) {
    delayKillBtn.setAttribute("aria-pressed", String(state.delayEnabled));
    delayKillBtn.textContent = state.delayEnabled ? "DLY ON" : "DLY OFF";
  }
  if (delaySelectBtn) {
    delaySelectBtn.setAttribute("aria-pressed", String(runtime.delaySelectEnabled));
    delaySelectBtn.textContent = runtime.delaySelectEnabled ? "SELECT ON" : "SELECT OFF";
  }
  if (delayTimeInput) delayTimeInput.value = String(Math.round(state.delayTimeMs));
  if (delayFeedbackInput) delayFeedbackInput.value = String(Math.round(state.delayFeedback * 100));
  if (delayMixInput) delayMixInput.value = String(Math.round(state.delayMix * 100));
  if (delayTimeValue) delayTimeValue.textContent = `${Math.round(state.delayTimeMs)}ms`;
  if (delayFeedbackValue) delayFeedbackValue.textContent = `${Math.round(state.delayFeedback * 100)}%`;
  if (delayMixValue) delayMixValue.textContent = `${Math.round(state.delayMix * 100)}%`;
}

function createSaturationCurve(drive) {
  const k = Math.max(1, drive);
  const samples = 2048;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / (samples - 1) - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

function getRhythmGateAtTime(timeSeconds) {
  let gate = 1;
  if (state.retriggerRate > 0) {
    const ph = ((timeSeconds * state.retriggerRate) % 1 + 1) % 1;
    gate *= ph < 0.34 ? 1 : 0;
  }
  if (state.gaterRate > 0) {
    const ph = ((timeSeconds * state.gaterRate) % 1 + 1) % 1;
    gate *= ph < 0.22 ? 0 : 1;
  }
  return gate;
}

function getRhythmGateAtTimeWithRates(timeSeconds, retriggerRate, gaterRate) {
  let gate = 1;
  if (retriggerRate > 0) {
    const ph = ((timeSeconds * retriggerRate) % 1 + 1) % 1;
    gate *= ph < 0.34 ? 1 : 0;
  }
  if (gaterRate > 0) {
    const ph = ((timeSeconds * gaterRate) % 1 + 1) % 1;
    gate *= ph < 0.22 ? 0 : 1;
  }
  return gate;
}

function sampleExportParam(key, fallbackValue, timeSeconds) {
  if (!state.exportAutomationEnabled || !hasAutomationData()) {
    return fallbackValue;
  }
  const lane = state.automation.lanes?.[key];
  const sampled = sampleLaneAtTime(lane, timeSeconds);
  return sampled === undefined ? fallbackValue : sampled;
}

function semitonesToPlaybackRate(semitones) {
  return Math.pow(2, clamp(Number(semitones) || 0, -12, 12) / 12);
}

function invCutoffToHz(invCutoff) {
  const minHz = 120;
  const maxHz = 20000;
  const t = clamp(Number(invCutoff) || 0, 0, 1);
  return maxHz * Math.pow(minHz / maxHz, t);
}

function ensureMasterNodes() {
  const audioContext = ensureAudioContext();
  if (runtime.masterNodes && runtime.masterNodes.context === audioContext) {
    return runtime.masterNodes;
  }

  const input = audioContext.createGain();
  const delayInput = audioContext.createGain();
  const delayNode = audioContext.createDelay(2.0);
  const delayFeedbackGain = audioContext.createGain();
  const delayWetGain = audioContext.createGain();
  const delayDryGain = audioContext.createGain();
  const toneFilter = audioContext.createBiquadFilter();
  const rhythmGain = audioContext.createGain();
  const dryGain = audioContext.createGain();
  const saturator = audioContext.createWaveShaper();
  const wetGain = audioContext.createGain();
  const outputMix = audioContext.createGain();
  const limiter = audioContext.createDynamicsCompressor();
  const limiterGain = audioContext.createGain();
  const bypassGain = audioContext.createGain();
  const postMix = audioContext.createGain();
  const meterAnalyser = audioContext.createAnalyser();
  const recordTap = audioContext.createMediaStreamDestination();
  const channelDryBus = [0, 1, 2, 3].map(() => audioContext.createGain());
  const channelDelayBus = [0, 1, 2, 3].map(() => audioContext.createGain());
  const izerDryChains = [];
  const izerDelayChains = [];

  toneFilter.type = "lowpass";
  meterAnalyser.fftSize = 1024;
  meterAnalyser.smoothingTimeConstant = 0.75;
  const createIzerChain = () => {
    const nodes = IZER_BANDS_HZ.map((hz, index) => {
      const node = audioContext.createBiquadFilter();
      if (index === 0) node.type = "lowshelf";
      else if (index === IZER_BANDS_HZ.length - 1) node.type = "highshelf";
      else node.type = "peaking";
      node.frequency.value = hz;
      node.Q.value = index === 0 || index === IZER_BANDS_HZ.length - 1 ? 0.7 : 1.0;
      node.gain.value = 0;
      return node;
    });
    for (let i = 0; i < nodes.length - 1; i += 1) {
      nodes[i].connect(nodes[i + 1]);
    }
    return { nodes, input: nodes[0], output: nodes[nodes.length - 1] };
  };
  for (let i = 0; i < 4; i += 1) {
    const dryChain = createIzerChain();
    const delayChain = createIzerChain();
    channelDryBus[i].connect(dryChain.input);
    channelDelayBus[i].connect(delayChain.input);
    dryChain.output.connect(input);
    delayChain.output.connect(delayInput);
    izerDryChains.push(dryChain);
    izerDelayChains.push(delayChain);
  }
  delayInput.connect(delayDryGain);
  delayDryGain.connect(input);
  delayInput.connect(delayNode);
  delayNode.connect(delayWetGain);
  delayWetGain.connect(input);
  delayNode.connect(delayFeedbackGain);
  delayFeedbackGain.connect(delayNode);
  input.connect(toneFilter);
  toneFilter.connect(rhythmGain);
  rhythmGain.connect(dryGain);
  rhythmGain.connect(saturator);
  saturator.connect(wetGain);
  dryGain.connect(outputMix);
  wetGain.connect(outputMix);
  limiter.threshold.value = -1;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.09;
  outputMix.connect(bypassGain);
  bypassGain.connect(postMix);
  outputMix.connect(limiter);
  limiter.connect(limiterGain);
  limiterGain.connect(postMix);
  postMix.connect(meterAnalyser);
  meterAnalyser.connect(audioContext.destination);
  postMix.connect(recordTap);

  runtime.masterNodes = {
    context: audioContext,
    input,
    delayInput,
    delayNode,
    delayFeedbackGain,
    delayWetGain,
    delayDryGain,
    toneFilter,
    rhythmGain,
    dryGain,
    saturator,
    wetGain,
    outputMix,
    limiter,
    limiterGain,
    bypassGain,
    postMix,
    meterAnalyser,
    recordTap,
    channelDryBus,
    channelDelayBus,
    izerDryChains,
    izerDelayChains,
  };
  applyMasterParams();
  return runtime.masterNodes;
}

function applyMasterParams() {
  if (!runtime.masterNodes) {
    return;
  }
  const {
    dryGain,
    wetGain,
    saturator,
    toneFilter,
    outputMix,
    limiterGain,
    bypassGain,
    delayNode,
    delayFeedbackGain,
    delayWetGain,
    delayDryGain,
    channelDryBus,
    channelDelayBus,
    izerDryChains,
    izerDelayChains,
  } = runtime.masterNodes;
  const mix = clamp(state.saturatorMix, 0, 1);
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;
  saturator.curve = createSaturationCurve(state.saturatorDrive);
  saturator.oversample = "2x";
  toneFilter.frequency.value = invCutoffToHz(state.invCutoff);
  toneFilter.Q.value = 0.8;
  outputMix.gain.value = clamp(runtime.masterOutputVolume, 0, 1);
  limiterGain.gain.value = runtime.masterLimiterEnabled ? 1 : 0;
  bypassGain.gain.value = runtime.masterLimiterEnabled ? 0 : 1;
  delayNode.delayTime.value = clamp(state.delayTimeMs / 1000, 0.02, 1.2);
  if (state.delayEnabled) {
    delayFeedbackGain.gain.value = clamp(state.delayFeedback, 0, 0.95);
    delayWetGain.gain.value = clamp(state.delayMix, 0, 1);
    delayDryGain.gain.value = 1;
  } else {
    delayFeedbackGain.gain.value = 0;
    delayWetGain.gain.value = 0;
    delayDryGain.gain.value = 1;
  }

  const rate = semitonesToPlaybackRate(state.pitchSemitones);
  for (const node of runtime.playingNodes) {
    node.source.playbackRate.setValueAtTime(rate, runtime.audioContext.currentTime);
  }
  for (const voice of state.loopstack.voices) {
    if (voice?.node?.src && runtime.audioContext) {
      voice.node.src.playbackRate.setValueAtTime(rate, runtime.audioContext.currentTime);
    }
    applyLoopVoiceGainState(voice);
  }

  for (let i = 0; i < 4; i += 1) {
    const chGain = mixerChannelGain(i);
    if (channelDryBus[i]) channelDryBus[i].gain.value = chGain;
    if (channelDelayBus[i]) channelDelayBus[i].gain.value = chGain;
    const bandDb = izerBandsForChannel(i);
    const dryChain = izerDryChains?.[i]?.nodes || [];
    const delayChain = izerDelayChains?.[i]?.nodes || [];
    for (let b = 0; b < 16; b += 1) {
      const target = clamp(Number(bandDb?.[b]) || 0, -24, 24);
      if (dryChain[b]) dryChain[b].gain.setTargetAtTime(target, runtime.audioContext.currentTime, 0.03);
      if (delayChain[b]) delayChain[b].gain.setTargetAtTime(target, runtime.audioContext.currentTime, 0.03);
    }
  }
}

function applyRhythmLive() {
  if (!runtime.masterNodes || !runtime.audioContext) {
    return;
  }
  const target = state.isPlaying ? getRhythmGateAtTime(state.playheadTime) : 1;
  runtime.masterNodes.rhythmGain.gain.setTargetAtTime(target, runtime.audioContext.currentTime, 0.01);
}

function updateMediaSessionState() {
  if (!("mediaSession" in navigator)) {
    return;
  }
  navigator.mediaSession.playbackState = state.isPlaying ? "playing" : "paused";
}

function setupMediaSessionHandlers() {
  if (!("mediaSession" in navigator)) {
    return;
  }
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: "Lazy.SEQ",
      artist: "DENARRATOR",
      album: "Live Session",
    });
  } catch {
    // Metadata is optional.
  }
  navigator.mediaSession.setActionHandler("play", () => {
    void startPlayback();
  });
  navigator.mediaSession.setActionHandler("pause", () => {
    stopPlayback({ keepPlayhead: true });
    render();
    renderClipList();
    updateMediaSessionState();
  });
  updateMediaSessionState();
}

function isTypingTarget(target) {
  if (!target) return false;
  if (target.closest && target.closest(".xy-pad")) return false;
  const tag = String(target.tagName || "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") {
    return true;
  }
  return Boolean(target.isContentEditable);
}

function installTactileButtons(root = document) {
  const addClass = () => {
    root.querySelectorAll("button").forEach((button) => button.classList.add("dn-btn"));
  };
  addClass();
  const observer = new MutationObserver(addClass);
  observer.observe(root.documentElement || root.body, { childList: true, subtree: true });
  const clear = () => {
    root.querySelectorAll(".dn-btn.is-pressing").forEach((button) => button.classList.remove("is-pressing"));
  };
  root.addEventListener(
    "pointerdown",
    (event) => {
      const button = event.target?.closest?.(".dn-btn");
      if (!button || button.disabled) return;
      button.classList.add("is-pressing");
      try { button.setPointerCapture(event.pointerId); } catch {}
    },
    { capture: true, passive: true }
  );
  root.addEventListener("pointerup", (event) => {
    const button = event.target?.closest?.(".dn-btn");
    if (button) button.classList.remove("is-pressing");
    else clear();
  }, { capture: true, passive: true });
  root.addEventListener("pointercancel", clear, { capture: true, passive: true });
  root.addEventListener("blur", clear, true);
}

function applySquishEnabled(enabled) {
  document.documentElement.classList.toggle("dn-squish", Boolean(enabled));
}

function pickRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return "";
}

function recorderExtensionForMimeType(mimeType) {
  if (mimeType.includes("mp4")) return "m4a";
  return "webm";
}

async function startAudioRecording() {
  if (state.isAudioRecording) return;
  if (typeof MediaRecorder === "undefined") {
    setDropHint("AUDIO REC NOT SUPPORTED", true);
    return;
  }
  const audioContext = ensureAudioContext();
  await audioContext.resume();
  const master = ensureMasterNodes();
  const mimeType = pickRecorderMimeType();
  const options = mimeType ? { mimeType } : undefined;
  const chunks = [];
  const recorder = options
    ? new MediaRecorder(master.recordTap.stream, options)
    : new MediaRecorder(master.recordTap.stream);
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };
  recorder.start(200);
  runtime.audioRecorder = { recorder, chunks, mimeType };
  state.isAudioRecording = true;
  updateAutomationUi();
  setDropHint("AUDIO REC ON");
}

async function stopAudioRecordingAndSave() {
  if (!state.isAudioRecording || !runtime.audioRecorder) return;
  const { recorder, chunks, mimeType } = runtime.audioRecorder;
  state.isAudioRecording = false;
  updateAutomationUi();

  const blob = await new Promise((resolve) => {
    const finalize = () => resolve(new Blob(chunks, { type: mimeType || "audio/webm" }));
    recorder.addEventListener("stop", finalize, { once: true });
    recorder.stop();
  });
  runtime.audioRecorder = null;

  if (!blob || blob.size === 0) {
    setDropHint("REC EMPTY", true);
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = sanitizeFilenameBase(quenceNameInput.value) || "lazy-quenzer";
  let outBlob = blob;
  let outExt = recorderExtensionForMimeType(mimeType || "");

  // Try to provide WAV output by decoding recorded stream first.
  try {
    const decodeCtx = ensureAudioContext();
    const decoded = await decodeCtx.decodeAudioData((await blob.arrayBuffer()).slice(0));
    outBlob = audioBufferToWavBlob(decoded);
    outExt = "wav";
  } catch {
    // Keep native recorder format if WAV conversion is not supported.
  }

  const saveResult = await downloadBlob(outBlob, `${baseName}-live-${timestamp}.${outExt}`);
  if (saveResult === "cancelled") {
    setDropHint("REC SAVE CANCELLED", true);
    return;
  }
  setDropHint("AUDIO REC SAVED");
}

function abortAudioRecordingSilently() {
  if (!runtime.audioRecorder) return;
  const { recorder } = runtime.audioRecorder;
  try {
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  } catch {
    // Ignore recorder shutdown errors.
  }
  runtime.audioRecorder = null;
  state.isAudioRecording = false;
  updateAutomationUi();
}

function applyAutomationAtTime(timeSeconds) {
  if (state.automation.isRecording || !hasAutomationData()) {
    return;
  }

  const retrigger = sampleLaneAtTime(state.automation.lanes.retriggerRate, timeSeconds);
  const gater = sampleLaneAtTime(state.automation.lanes.gaterRate, timeSeconds);
  const drive = sampleLaneAtTime(state.automation.lanes.saturatorDrive, timeSeconds);
  const mix = sampleLaneAtTime(state.automation.lanes.saturatorMix, timeSeconds);
  const pitch = sampleLaneAtTime(state.automation.lanes.pitchSemitones, timeSeconds);
  const invCutoff = sampleLaneAtTime(state.automation.lanes.invCutoff, timeSeconds);

  if (retrigger !== undefined && RATE_STEPS.includes(retrigger)) {
    state.retriggerRate = retrigger;
    retriggerInput.value = String(Math.max(0, RATE_STEPS.indexOf(retrigger)));
    retriggerValue.textContent = String(retrigger);
  }
  if (gater !== undefined && RATE_STEPS.includes(gater)) {
    state.gaterRate = gater;
    gaterInput.value = String(Math.max(0, RATE_STEPS.indexOf(gater)));
    gaterValue.textContent = String(gater);
  }
  if (drive !== undefined) {
    state.saturatorDrive = clamp(drive, 1, 40);
    satDriveInput.value = String(Math.round(state.saturatorDrive));
    satDriveValue.textContent = state.saturatorDrive.toFixed(1);
  }
  if (mix !== undefined) {
    state.saturatorMix = clamp(mix, 0, 1);
    satMixInput.value = String(Math.round(state.saturatorMix * 100));
    satMixValue.textContent = `${Math.round(state.saturatorMix * 100)}%`;
  }
  if (pitch !== undefined) {
    state.pitchSemitones = clamp(pitch, -12, 12);
    pitchInput.value = String(state.pitchSemitones.toFixed(1));
    pitchValue.textContent = `${state.pitchSemitones >= 0 ? "+" : ""}${state.pitchSemitones.toFixed(1)}st`;
  }
  if (invCutoff !== undefined) {
    state.invCutoff = clamp(invCutoff, 0, 1);
    invCutoffInput.value = String(state.invCutoff.toFixed(2));
    invCutoffValue.textContent = `${Math.round(state.invCutoff * 100)}%`;
  }

  refreshAllSliderTags();
  applyMasterParams();
  applyRhythmLive();
}

function pulseControlLabel(labelEl) {
  const host = labelEl.closest("label");
  if (!host) {
    return;
  }
  host.classList.remove("step-hit");
  void host.offsetWidth;
  host.classList.add("step-hit");
}

function beginUiDrag() {
  document.body.classList.add("ui-dragging");
}

function endUiDrag() {
  document.body.classList.remove("ui-dragging");
}

function getClipRootId(clip) {
  if (clip.rootId !== undefined && clip.rootId !== null) {
    return clip.rootId;
  }
  return clip.id;
}

function ensureSelectedRootIsValid() {
  if (state.selectedRootId === null) {
    return;
  }
  const stillExists = state.clips.some((clip) => getClipRootId(clip) === state.selectedRootId);
  if (!stillExists) {
    state.selectedRootId = null;
  }
}

function setActiveTab(tab) {
  state.activeTab = tab === "loopr" ? "loopr" : "sequencer";
  const showSequencer = state.activeTab === "sequencer";
  state.loopstack.open = !showSequencer;
  tabSequencerBtn.setAttribute("aria-pressed", String(showSequencer));
  tabClipListBtn.setAttribute("aria-pressed", String(!showSequencer));
  sequencerPanel.classList.toggle("panel-hidden", !showSequencer);
  sequencerControls.classList.toggle("panel-hidden", !showSequencer);
  clipListPanel.classList.toggle("panel-hidden", showSequencer);
  updateLoopstackHeaderButtons();
  if (!showSequencer) {
    renderLoopstackList();
    fitLooprRowsToViewport();
  }
}

function sanitizeFilenameBase(name) {
  const normalized = String(name || "").trim().replace(/\s+/g, "_");
  const safe = normalized.replace(/[^A-Za-z0-9._-]/g, "");
  return safe.replace(/^\.+/, "").slice(0, 80);
}

function createHistorySnapshot() {
  return {
    timelineDuration: state.timelineDuration,
    gainMinDb: state.gainMinDb,
    gainMaxDb: state.gainMaxDb,
    retriggerRate: state.retriggerRate,
    gaterRate: state.gaterRate,
    saturatorDrive: state.saturatorDrive,
    saturatorMix: state.saturatorMix,
    delayEnabled: state.delayEnabled,
    delayTimeMs: state.delayTimeMs,
    delayFeedback: state.delayFeedback,
    delayMix: state.delayMix,
    pitchSemitones: state.pitchSemitones,
    invCutoff: state.invCutoff,
    exportAutomationEnabled: state.exportAutomationEnabled,
    automation: {
      isRecording: state.automation.isRecording,
      lanes: {
        retriggerRate: state.automation.lanes.retriggerRate.map((p) => ({ ...p })),
        gaterRate: state.automation.lanes.gaterRate.map((p) => ({ ...p })),
        saturatorDrive: state.automation.lanes.saturatorDrive.map((p) => ({ ...p })),
        saturatorMix: state.automation.lanes.saturatorMix.map((p) => ({ ...p })),
        pitchSemitones: state.automation.lanes.pitchSemitones.map((p) => ({ ...p })),
        invCutoff: state.automation.lanes.invCutoff.map((p) => ({ ...p })),
      },
    },
    playheadTime: state.playheadTime,
    loopEnabled: state.loopEnabled,
    loopStartTime: state.loopStartTime,
    loopEndTime: state.loopEndTime,
    timelineFlexoMode: state.timelineFlexoMode,
    timelineStopLocked: state.timelineStopLocked,
    timelineStopDuration: state.timelineStopDuration,
    loopMode: state.loopMode,
    repeatSnap: state.repeatSnap,
    channelMode: state.channelMode,
    mixer: {
      open: state.mixer.open,
      ch: state.mixer.ch.map((channel) => ({
        gain: clamp(Number(channel?.gain) || 1, 0, 1),
        muted: Boolean(channel?.muted),
      })),
    },
    loopstackSettings: {
      open: state.loopstack.open,
      followTransport: state.loopstack.followTransport,
      defaultStartMode: state.loopstack.defaultStartMode,
      relScaleView: state.loopstack.relScaleView,
      muteAll: state.loopstack.muteAll,
      panicPaused: state.loopstack.panicPaused,
      userPaused: state.loopstack.userPaused,
      normFrameMode: state.loopstack.normFrameMode,
      normFrameSec: state.loopstack.normFrameSec,
    },
    loopstackVoices: state.loopstack.voices.map((voice) => ({
      id: voice.id,
      sourceClipId: voice.sourceClipId ?? null,
      sourceName: voice.sourceName || "clip",
      audioBuffer: voice.audioBuffer || null,
      sr: Number(voice.sr) || 48000,
      channels: Number(voice.channels) || 2,
      loopInSec: Number(voice.loopInSec) || 0,
      loopOutSec: Number(voice.loopOutSec) || 0,
      gain: clamp(Number(voice.gain) || 1, 0, 1.5),
      muted: Boolean(voice.muted),
      createdAtAudioTime: Number(voice.createdAtAudioTime) || 0,
      mode: voice.mode === "sync" ? "sync" : "free",
      transportPaused: Boolean(voice.transportPaused),
      enabled: voice.enabled !== false,
      paused: Boolean(voice.paused),
      userPaused: Boolean(voice.userPaused),
    })),
    toolMode: state.toolMode,
    activeTab: state.activeTab,
    selectedRootId: state.selectedRootId,
    selectedClipIds: Array.from(runtime.selectedClipIds),
    nextClipId: state.nextClipId,
    clips: state.clips.map((clip) => ({
      id: clip.id,
      name: clip.name,
      audioBuffer: clip.audioBuffer,
      duration: clip.duration,
      originalDuration: clip.originalDuration,
      loopEnabled: Boolean(clip.loopEnabled),
      startTime: clip.startTime,
      channelId: sanitizeChannelId(clip.channelId),
      yNorm: clip.yNorm,
      rootId: clip.rootId,
      parentId: clip.parentId,
      peaks: clip.peaks,
    })),
  };
}

function restoreHistorySnapshot(snapshot) {
  stopPlayback({ keepPlayhead: false });

  state.timelineDuration = snapshot.timelineDuration;
  state.gainMinDb = snapshot.gainMinDb;
  state.gainMaxDb = snapshot.gainMaxDb;
  state.retriggerRate = snapshot.retriggerRate ?? 0;
  state.gaterRate = snapshot.gaterRate ?? 0;
  state.saturatorDrive = snapshot.saturatorDrive ?? 1;
  state.saturatorMix = snapshot.saturatorMix ?? 0;
  state.delayEnabled = Boolean(snapshot.delayEnabled);
  state.delayTimeMs = clamp(Number(snapshot.delayTimeMs) || 260, 20, 1200);
  state.delayFeedback = clamp(Number(snapshot.delayFeedback) || 0, 0, 0.95);
  state.delayMix = clamp(Number(snapshot.delayMix) || 0, 0, 1);
  state.pitchSemitones = clamp(snapshot.pitchSemitones ?? 0, -12, 12);
  state.invCutoff = clamp(snapshot.invCutoff ?? 0, 0, 1);
  state.exportAutomationEnabled = Boolean(snapshot.exportAutomationEnabled);
  state.automation.isRecording = Boolean(snapshot.automation?.isRecording);
  state.automation.lanes = {
    retriggerRate: Array.isArray(snapshot.automation?.lanes?.retriggerRate) ? snapshot.automation.lanes.retriggerRate.map((p) => ({ ...p })) : [],
    gaterRate: Array.isArray(snapshot.automation?.lanes?.gaterRate) ? snapshot.automation.lanes.gaterRate.map((p) => ({ ...p })) : [],
    saturatorDrive: Array.isArray(snapshot.automation?.lanes?.saturatorDrive) ? snapshot.automation.lanes.saturatorDrive.map((p) => ({ ...p })) : [],
    saturatorMix: Array.isArray(snapshot.automation?.lanes?.saturatorMix) ? snapshot.automation.lanes.saturatorMix.map((p) => ({ ...p })) : [],
    pitchSemitones: Array.isArray(snapshot.automation?.lanes?.pitchSemitones) ? snapshot.automation.lanes.pitchSemitones.map((p) => ({ ...p })) : [],
    invCutoff: Array.isArray(snapshot.automation?.lanes?.invCutoff) ? snapshot.automation.lanes.invCutoff.map((p) => ({ ...p })) : [],
  };
  state.playheadTime = snapshot.playheadTime;
  state.loopEnabled = snapshot.loopEnabled;
  state.loopStartTime = snapshot.loopStartTime;
  state.loopEndTime = LOCK_LOOP_END_TO_TIMELINE
    ? state.timelineDuration
    : snapshot.loopEndTime;
  state.timelineFlexoMode = Boolean(snapshot.timelineFlexoMode);
  state.timelineStopLocked = Boolean(snapshot.timelineStopLocked);
  state.timelineStopDuration = Math.max(
    MIN_EMPTY_TIMELINE_SECONDS,
    Number(snapshot.timelineStopDuration) || Number(snapshot.timelineDuration) || MIN_EMPTY_TIMELINE_SECONDS
  );
  state.loopMode = Boolean(snapshot.loopMode);
  state.repeatSnap = snapshot.repeatSnap !== false;
  state.channelMode = false;
  state.mixer.open = Boolean(snapshot.mixer?.open);
  const mixerSnapshot = Array.isArray(snapshot.mixer?.ch) ? snapshot.mixer.ch : [];
  state.mixer.ch = [0, 1, 2, 3].map((index) => {
    const item = mixerSnapshot[index] || {};
    return {
      gain: clamp(Number(item.gain) || 1, 0, 1),
      muted: Boolean(item.muted),
    };
  });
  state.loopstack.open = Boolean(snapshot.loopstackSettings?.open);
  state.loopstack.followTransport = snapshot.loopstackSettings?.followTransport !== false;
  state.loopstack.defaultStartMode = snapshot.loopstackSettings?.defaultStartMode === "sync" ? "sync" : "free";
  state.loopstack.relScaleView = snapshot.loopstackSettings?.relScaleView !== false;
  state.loopstack.muteAll = Boolean(snapshot.loopstackSettings?.muteAll);
  state.loopstack.panicPaused = Boolean(snapshot.loopstackSettings?.panicPaused);
  state.loopstack.userPaused = Boolean(snapshot.loopstackSettings?.userPaused);
  state.loopstack.normFrameMode = snapshot.loopstackSettings?.normFrameMode === "fixed" ? "fixed" : "median";
  state.loopstack.normFrameSec = Math.max(
    LOOPSTACK_MIN_REGION_SECONDS,
    Number(snapshot.loopstackSettings?.normFrameSec) || 0.25
  );
  for (const voice of state.loopstack.voices) {
    stopLoopVoiceNode(voice, false);
  }
  state.loopstack.voices = Array.isArray(snapshot.loopstackVoices)
    ? snapshot.loopstackVoices
      .filter((voice) => voice?.audioBuffer)
      .map((voice) => ({
        ...voice,
        gain: clamp(Number(voice.gain) || 1, 0, 1.5),
        mode: voice.mode === "sync" ? "sync" : "free",
        enabled: voice.enabled !== false,
        paused: Boolean(voice.paused),
        userPaused: Boolean(voice.userPaused),
        muted: Boolean(voice.muted),
        node: null,
        _playToken: null,
      }))
    : state.loopstack.voices;
  for (const voice of state.loopstack.voices) {
    if (voice.enabled !== false && !voice.paused && !state.loopstack.userPaused) {
      startLoopVoiceNode(voice);
    } else {
      voice.node = null;
    }
  }
  state.toolMode = snapshot.toolMode || "arrow";
  state.activeTab = snapshot.activeTab || "sequencer";
  state.selectedRootId = snapshot.selectedRootId ?? null;
  runtime.selectedClipIds = new Set(Array.isArray(snapshot.selectedClipIds) ? snapshot.selectedClipIds : []);
  state.nextClipId = snapshot.nextClipId;
  state.clips = snapshot.clips.map((clip) => ({
    ...clip,
    channelId: sanitizeChannelId(clip.channelId),
    originalDuration: Number(clip.originalDuration) > 0 ? Number(clip.originalDuration) : Number(clip.duration) || 0,
    loopEnabled:
      Boolean(clip.loopEnabled) &&
      (Number(clip.duration) || 0) > (Number(clip.originalDuration) > 0 ? Number(clip.originalDuration) : Number(clip.duration) || 0) + 1e-6,
  }));

  gainMinInput.value = String(state.gainMinDb);
  gainMaxInput.value = String(state.gainMaxDb);
  retriggerInput.value = String(Math.max(0, RATE_STEPS.indexOf(state.retriggerRate)));
  gaterInput.value = String(Math.max(0, RATE_STEPS.indexOf(state.gaterRate)));
  satDriveInput.value = String(Math.round(state.saturatorDrive));
  satMixInput.value = String(Math.round(state.saturatorMix * 100));
  pitchInput.value = String(state.pitchSemitones.toFixed(1));
  invCutoffInput.value = String(state.invCutoff.toFixed(2));
  retriggerValue.textContent = String(state.retriggerRate);
  gaterValue.textContent = String(state.gaterRate);
  satDriveValue.textContent = state.saturatorDrive.toFixed(1);
  satMixValue.textContent = `${Math.round(state.saturatorMix * 100)}%`;
  pitchValue.textContent = `${state.pitchSemitones >= 0 ? "+" : ""}${state.pitchSemitones.toFixed(1)}st`;
  invCutoffValue.textContent = `${Math.round(state.invCutoff * 100)}%`;
  updateDelayUi();
  loopBtn.setAttribute("aria-pressed", String(state.loopEnabled));
  loopBtn.textContent = `LOOP ${state.loopEnabled ? "ON" : "OFF"}`;
  ensureSelectedRootIsValid();
  setActiveTab(state.activeTab);
  applyMasterParams();
  applyRhythmLive();
  refreshAllSliderTags();
  updateAutomationUi();
  updateToolUi();
  updateModeButtonsUi();
  updateMixerUi();
  updateLoopstackUiVisibility();
  updateLoopstackHeaderButtons();
  renderLoopstackList();
  render();
  renderClipList();
}

function pushUndoSnapshot(snapshot) {
  runtime.undoStack.push(snapshot);
  if (runtime.undoStack.length > UNDO_LIMIT) {
    runtime.undoStack.splice(0, runtime.undoStack.length - UNDO_LIMIT);
  }
  markUnsavedChanges();
}

function undoLastAction() {
  const snapshot = runtime.undoStack.pop();
  if (!snapshot) {
    setDropHint("NOTHING TO UNDO", true);
    return;
  }
  restoreHistorySnapshot(snapshot);
  setDropHint("UNDO");
}

function createNewFile() {
  const undoSnapshot = createHistorySnapshot();
  stopPlayback({ keepPlayhead: false });
  if (state.isAudioRecording) {
    void stopAudioRecordingAndSave();
  }
  disarmClearAutomationButton();
  disarmLoopstackClearButton();
  clearAllLoopVoices();
  closeClipLoopPopup();
  hideLoopstackToast();

  state.clips = [];
  state.timelineDuration = MIN_EMPTY_TIMELINE_SECONDS;
  state.retriggerRate = 0;
  state.gaterRate = 0;
  state.saturatorDrive = 1;
  state.saturatorMix = 0;
  state.delayEnabled = false;
  state.delayTimeMs = 260;
  state.delayFeedback = 0.35;
  state.delayMix = 0.28;
  state.pitchSemitones = 0;
  state.invCutoff = 0;
  state.exportAutomationEnabled = false;
  state.automation.isRecording = false;
  clearAutomationLanes();
  state.playheadTime = 0;
  state.loopStartTime = 0;
  state.loopEndTime = state.timelineDuration;
  state.timelineFlexoMode = false;
  state.timelineStopLocked = false;
  state.timelineStopDuration = state.timelineDuration;
  state.loopMode = false;
  state.repeatSnap = true;
  state.toolMode = "arrow";
  state.channelMode = false;
  state.activeTab = "sequencer";
  state.selectedRootId = null;
  state.nextClipId = 1;
  runtime.selectedClipIds.clear();
  runtime.drag = null;

  quenceNameInput.value = "";
  retriggerInput.value = "0";
  gaterInput.value = "0";
  satDriveInput.value = "1";
  satMixInput.value = "0";
  pitchInput.value = "0";
  invCutoffInput.value = "0";
  retriggerValue.textContent = "0";
  gaterValue.textContent = "0";
  satDriveValue.textContent = "1.0";
  satMixValue.textContent = "0%";
  pitchValue.textContent = "+0.0st";
  invCutoffValue.textContent = "0%";
  updateDelayUi();
  runtime.undoStack = [];
  runtime.pendingDragUndoSnapshot = null;
  state.mixer.open = false;
  state.mixer.ch = [0, 1, 2, 3].map(() => ({ gain: 1, muted: false }));
  state.izer = createDefaultIzerState();
  pushUndoSnapshot(undoSnapshot);

  loopBtn.setAttribute("aria-pressed", String(state.loopEnabled));
  loopBtn.textContent = `LOOP ${state.loopEnabled ? "ON" : "OFF"}`;
  setActiveTab(state.activeTab);
  applyMasterParams();
  applyRhythmLive();
  refreshAllSliderTags();
  updateAutomationUi();
  updateToolUi();
  updateModeButtonsUi();
  updateMixerUi();
  render();
  renderClipList();
  setDropHint("NEW FILE");
  markSavedState();
}

function updateToolUi() {
  const isSelect = state.toolMode === "select";
  const isCut = state.toolMode === "scissor";
  const isDuplicate = state.toolMode === "duplicate";
  const isDelete = state.toolMode === "delete";
  const isHalf = state.toolMode === "half";
  const isDouble = state.toolMode === "double";
  const isReverse = state.toolMode === "reverse";
  toolBtn.setAttribute("aria-pressed", String(state.toolMode !== "arrow"));
  toolBtn.textContent = `TOOL ${TOOL_LABELS[state.toolMode] || state.toolMode.toUpperCase()}`;
  document.body.classList.toggle("select-mode", isSelect);
  document.body.classList.toggle("cut-mode", isCut);
  document.body.classList.toggle("duplicate-mode", isDuplicate);
  document.body.classList.toggle("delete-mode", isDelete);
  document.body.classList.toggle("half-mode", isHalf);
  document.body.classList.toggle("double-mode", isDouble);
  document.body.classList.toggle("reverse-mode", isReverse);
}

function updateModeButtonsUi() {
  state.channelMode = false;
  document.body.classList.toggle("loopmode", Boolean(state.loopMode));
  document.body.classList.toggle("channelmode", false);
  if (channelModeBtn) {
    channelModeBtn.setAttribute("aria-pressed", "false");
    channelModeBtn.textContent = "GRP MODE OFF";
    channelModeBtn.disabled = true;
  }
  if (loopModeBtn) {
    loopModeBtn.setAttribute("aria-pressed", String(state.loopMode));
    loopModeBtn.textContent = state.loopMode ? "LOOPMODE ON" : "LOOPMODE";
  }
  if (repeatSnapBtn) {
    repeatSnapBtn.setAttribute("aria-pressed", String(state.repeatSnap));
    repeatSnapBtn.textContent = state.repeatSnap ? "SNAP ON" : "SNAP OFF";
  }
  if (flexoModeBtn) {
    flexoModeBtn.setAttribute("aria-pressed", String(state.timelineFlexoMode));
    flexoModeBtn.textContent = state.timelineFlexoMode ? "FLEXO ON" : "FLEXO OFF";
  }
  if (stopTimelineBtn) {
    stopTimelineBtn.setAttribute("aria-pressed", String(state.timelineStopLocked));
    stopTimelineBtn.textContent = state.timelineStopLocked ? "STOP TL ON" : "STOP TL OFF";
  }
}

function updateMixerUi() {
  if (mixToggleBtn) {
    mixToggleBtn.setAttribute("aria-pressed", String(state.mixer.open));
    mixToggleBtn.textContent = state.mixer.open ? "MIX ON" : "MIX";
  }
  if (mixerPanel) {
    mixerPanel.classList.toggle("panel-hidden", !state.mixer.open);
    mixerPanel.setAttribute("aria-hidden", String(!state.mixer.open));
  }

  let mutedCount = 0;
  for (let i = 0; i < 4; i += 1) {
    const channel = state.mixer.ch[i];
    if (channel?.muted) mutedCount += 1;
    const fader = mixerFaders.find((el) => Number(el.dataset.channelIndex) === i);
    const dbLabel = mixerDbLabels.find((el) => Number(el.dataset.channelIndex) === i);
    const muteBtn = mixerMuteButtons.find((el) => Number(el.dataset.channelIndex) === i);
    const dbValue = channel?.muted ? -60 : clamp(gainToDb(channel?.gain ?? 1), -60, 0);
    if (fader) fader.value = String(Math.round(dbValue));
    if (dbLabel) dbLabel.textContent = channel?.muted ? "-inf dB" : `${Math.round(dbValue)} dB`;
    if (muteBtn) {
      muteBtn.setAttribute("aria-pressed", String(Boolean(channel?.muted)));
      muteBtn.textContent = channel?.muted ? "MUTE ON" : "MUTE OFF";
    }
  }
  if (mixerMuteAllBtn) {
    const muteAll = mutedCount === 4;
    mixerMuteAllBtn.setAttribute("aria-pressed", String(muteAll));
    mixerMuteAllBtn.textContent = muteAll ? "MUTE ALL ON" : "MUTE ALL OFF";
  }
}

function updatePlayButtonUi() {
  playBtn.setAttribute("aria-pressed", String(state.isPlaying));
  playBtn.textContent = state.isPlaying ? "PAUSE" : "PLAY";
}

function syncTransportState() {
  state.transport.playing = Boolean(state.isPlaying);
  state.transport.playheadSec = clamp(Number(state.playheadTime) || 0, 0, state.timelineDuration);
}

function audioBufferToWavBlob(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;
  const bytesPerSample = 2;
  const dataSize = numFrames * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, value) {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sample = audioBuffer.getChannelData(channel)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function audioBufferToBase64Wav(audioBuffer) {
  const blob = audioBufferToWavBlob(audioBuffer);
  const arrayBuffer = await blob.arrayBuffer();
  return arrayBufferToBase64(arrayBuffer);
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function getTauriInvoke() {
  const ownInvoke = window.__TAURI__?.core?.invoke;
  if (typeof ownInvoke === "function") return ownInvoke;
  try {
    const parentInvoke = window.parent?.__TAURI__?.core?.invoke;
    if (typeof parentInvoke === "function") return parentInvoke;
  } catch {
    // Cross-frame access can fail depending on runtime.
  }
  return null;
}

async function saveBlobWithPicker(blob, filename) {
  const tauriInvoke = getTauriInvoke();
  if (tauriInvoke) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const dataBase64 = arrayBufferToBase64(arrayBuffer);
      const saved = await tauriInvoke("save_blob_with_dialog", {
        dataBase64,
        suggestedName: filename,
      });
      return saved ? true : null;
    } catch (error) {
      console.warn("native save dialog invoke failed, falling back", error);
      // Fall back to web picker / download.
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

async function downloadBlob(blob, filename) {
  const pickerResult = await saveBlobWithPicker(blob, filename);
  if (pickerResult === true) {
    return "saved";
  }
  if (pickerResult === null) {
    return "cancelled";
  }
  triggerBlobDownload(blob, filename);
  return "downloaded";
}

function drawLoopMarkerWithTriangles(x, height) {
  ctx.strokeStyle = "#2f3132";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();

  if (runtime.loopMarkerImageReady && runtime.loopMarkerImage) {
    const drawWidth = LOOP_MARKER_DRAW_WIDTH;
    const left = clamp(x - drawWidth * 0.5, 0, Math.max(0, canvas.width - drawWidth));
    ctx.drawImage(runtime.loopMarkerImage, left, 0, drawWidth, height);
    return;
  }

  ctx.fillStyle = "#2f3132";

  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x - LOOP_TRIANGLE_SIZE, LOOP_TRIANGLE_SIZE);
  ctx.lineTo(x + LOOP_TRIANGLE_SIZE, LOOP_TRIANGLE_SIZE);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x, height);
  ctx.lineTo(x - LOOP_TRIANGLE_SIZE, height - LOOP_TRIANGLE_SIZE);
  ctx.lineTo(x + LOOP_TRIANGLE_SIZE, height - LOOP_TRIANGLE_SIZE);
  ctx.closePath();
  ctx.fill();
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function dbToLinear(db) {
  return Math.pow(10, db / 20);
}

function gainToDb(gain) {
  const safe = clamp(Number(gain) || 0, 0.000001, 1);
  return 20 * Math.log10(safe);
}

function mixerChannelGain(index) {
  const channel = state.mixer.ch[index];
  if (!channel) return 1;
  if (channel.muted) return 0;
  return clamp(Number(channel.gain) || 1, 0, 1);
}

function sanitizeChannelId(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return clamp(Math.round(numeric), 0, 3);
}

function yNormToGainLinear(yNorm) {
  const t = 1 - clamp(yNorm, 0, 1);
  const db = lerp(state.gainMinDb, state.gainMaxDb, t);
  return dbToLinear(db);
}

function sliceAudioBuffer(sourceBuffer, startFrame, endFrame) {
  const audioContext = ensureAudioContext();
  const frameStart = clamp(Math.floor(startFrame), 0, sourceBuffer.length);
  const frameEnd = clamp(Math.floor(endFrame), frameStart, sourceBuffer.length);
  const length = frameEnd - frameStart;
  const out = audioContext.createBuffer(sourceBuffer.numberOfChannels, length, sourceBuffer.sampleRate);

  for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel += 1) {
    const sourceData = sourceBuffer.getChannelData(channel);
    out.copyToChannel(sourceData.subarray(frameStart, frameEnd), channel, 0);
  }

  return out;
}

function resampleAudioBuffer(sourceBuffer, lengthFactor) {
  const audioContext = ensureAudioContext();
  const srcLength = sourceBuffer.length;
  const dstLength = Math.max(1, Math.round(srcLength * lengthFactor));
  const out = audioContext.createBuffer(sourceBuffer.numberOfChannels, dstLength, sourceBuffer.sampleRate);

  if (srcLength <= 1 || dstLength <= 1) {
    for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel += 1) {
      const src = sourceBuffer.getChannelData(channel);
      const dst = out.getChannelData(channel);
      dst[0] = src[0] || 0;
    }
    return out;
  }

  for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel += 1) {
    const src = sourceBuffer.getChannelData(channel);
    const dst = out.getChannelData(channel);
    for (let i = 0; i < dstLength; i += 1) {
      const pos = (i / (dstLength - 1)) * (srcLength - 1);
      const left = Math.floor(pos);
      const right = Math.min(srcLength - 1, left + 1);
      const t = pos - left;
      dst[i] = src[left] * (1 - t) + src[right] * t;
    }
  }

  return out;
}

function reverseAudioBuffer(sourceBuffer) {
  const audioContext = ensureAudioContext();
  const out = audioContext.createBuffer(sourceBuffer.numberOfChannels, sourceBuffer.length, sourceBuffer.sampleRate);
  for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel += 1) {
    const src = sourceBuffer.getChannelData(channel);
    const dst = out.getChannelData(channel);
    for (let i = 0; i < src.length; i += 1) {
      dst[i] = src[src.length - 1 - i];
    }
  }
  return out;
}

function ensureTimelineCoversClips() {
  const unlockedDuration = getUnlockedTimelineDuration();
  const lockedDuration = getLockedTimelineDuration();
  state.timelineDuration = lockedDuration ?? unlockedDuration;
  state.playheadTime = clamp(state.playheadTime, 0, state.timelineDuration);
  state.loopStartTime = clamp(state.loopStartTime, 0, state.timelineDuration);
  if (LOCK_LOOP_END_TO_TIMELINE) {
    state.loopEndTime = state.timelineDuration;
  } else {
    state.loopEndTime = clamp(state.loopEndTime, state.loopStartTime + LOOP_MIN_GAP_SECONDS, state.timelineDuration);
  }
}

function getTimelineContentEnd() {
  return state.clips.reduce((maxEnd, clip) => {
    const start = Number(clip?.startTime) || 0;
    const duration = Number(clip?.duration) || 0;
    return Math.max(maxEnd, start + duration);
  }, 0);
}

function getTimelineContentDurationSum() {
  return state.clips.reduce((sum, clip) => {
    const duration = Number(clip?.duration) || 0;
    return sum + Math.max(0, duration);
  }, 0);
}

function clampClipStartTime(startTime, clipDuration) {
  if (state.timelineFlexoMode && !state.timelineStopLocked) {
    return Math.max(0, Number(startTime) || 0);
  }
  const duration = Math.max(0, Number(clipDuration) || 0);
  const maxStart = Math.max(0, (Number(state.timelineDuration) || 0) - duration);
  return clamp(Number(startTime) || 0, 0, maxStart);
}

function getLockedTimelineDuration() {
  if (!state.timelineStopLocked) return null;
  const locked = Number(state.timelineStopDuration);
  if (!Number.isFinite(locked) || locked <= 0) return null;
  return Math.max(MIN_EMPTY_TIMELINE_SECONDS, locked);
}

function getUnlockedTimelineDuration() {
  if (state.timelineFlexoMode) {
    return Math.max(MIN_EMPTY_TIMELINE_SECONDS, getTimelineContentEnd());
  }
  return Math.max(MIN_EMPTY_TIMELINE_SECONDS, getTimelineContentDurationSum());
}

function getAppendStartForIncomingClip(duration) {
  const rightLoopEdge = state.clips.length ? getLoopBounds().end : 0;
  return Math.max(0, rightLoopEdge);
}

function markNewClipHighlight(clipId, durationMs = 1400) {
  if (!Number.isFinite(Number(clipId))) return;
  const now = performance.now();
  runtime.newClipHighlights.set(Number(clipId), now + Math.max(200, durationMs));
}

function getNewClipHighlightAlpha(clipId) {
  const endAt = runtime.newClipHighlights.get(Number(clipId));
  if (!Number.isFinite(endAt)) return 0;
  const remaining = endAt - performance.now();
  if (remaining <= 0) {
    runtime.newClipHighlights.delete(Number(clipId));
    return 0;
  }
  return clamp(remaining / 1400, 0, 1);
}

function scaleClipLength(clip, lengthFactor) {
  const nextBuffer = resampleAudioBuffer(clip.audioBuffer, lengthFactor);
  const nextDuration = nextBuffer.length / nextBuffer.sampleRate;
  if (!Number.isFinite(nextDuration) || nextDuration < CLIP_CUT_MIN_SEGMENT_SECONDS) {
    return false;
  }
  clip.audioBuffer = nextBuffer;
  clip.duration = nextDuration;
  clip.originalDuration = nextDuration;
  clip.loopEnabled = false;
  clip.peaks = createPeaks(nextBuffer);
  ensureTimelineCoversClips();
  return true;
}

function reverseClipAudio(clip) {
  const nextBuffer = reverseAudioBuffer(clip.audioBuffer);
  clip.audioBuffer = nextBuffer;
  clip.loopEnabled = false;
  clip.peaks = createPeaks(nextBuffer);
  return true;
}

function splitClipAtTime(clip, cutTime) {
  const localCut = cutTime - clip.startTime;
  if (localCut <= CLIP_CUT_MIN_SEGMENT_SECONDS || localCut >= clip.duration - CLIP_CUT_MIN_SEGMENT_SECONDS) {
    return false;
  }

  const sampleRate = clip.audioBuffer.sampleRate;
  const cutFrame = Math.floor(localCut * sampleRate);
  if (cutFrame <= 1 || cutFrame >= clip.audioBuffer.length - 1) {
    return false;
  }

  const leftBuffer = sliceAudioBuffer(clip.audioBuffer, 0, cutFrame);
  const rightBuffer = sliceAudioBuffer(clip.audioBuffer, cutFrame, clip.audioBuffer.length);
  const leftDuration = leftBuffer.length / sampleRate;
  const rightDuration = rightBuffer.length / sampleRate;

  const originalName = clip.name || "CLIP";
  const rootId = getClipRootId(clip);
  clip.audioBuffer = leftBuffer;
  clip.duration = leftDuration;
  clip.originalDuration = leftDuration;
  clip.loopEnabled = false;
  clip.peaks = createPeaks(leftBuffer);
  clip.name = `${originalName} A`;
  clip.rootId = rootId;
  clip.parentId = clip.parentId ?? null;

  const rightClip = {
    id: state.nextClipId++,
    name: `${originalName} B`,
    audioBuffer: rightBuffer,
    duration: rightDuration,
    originalDuration: rightDuration,
    loopEnabled: false,
    startTime: clip.startTime + leftDuration,
    channelId: sanitizeChannelId(clip.channelId),
    yNorm: clip.yNorm,
    rootId,
    parentId: clip.id,
    peaks: createPeaks(rightBuffer),
  };

  const clipIndex = state.clips.findIndex((item) => item.id === clip.id);
  if (clipIndex === -1) {
    return false;
  }
  state.clips.splice(clipIndex + 1, 0, rightClip);
  return true;
}

function duplicateClip(clip) {
  const rootId = getClipRootId(clip);
  const duplicate = {
    id: state.nextClipId++,
    name: `${clip.name || "CLIP"} COPY`,
    audioBuffer: clip.audioBuffer,
    duration: clip.duration,
    originalDuration: Number(clip.originalDuration) > 0 ? Number(clip.originalDuration) : clip.duration,
    loopEnabled: Boolean(clip.loopEnabled),
    startTime: Math.max(0, clip.startTime + 0.05),
    channelId: sanitizeChannelId(clip.channelId),
    yNorm: clamp(clip.yNorm + 0.03, 0, 1),
    rootId,
    parentId: clip.id,
    peaks: clip.peaks,
  };
  const clipIndex = state.clips.findIndex((item) => item.id === clip.id);
  if (clipIndex === -1) {
    return false;
  }
  state.clips.splice(clipIndex + 1, 0, duplicate);
  return true;
}

function deleteClipAndCollapseTimeline(clip) {
  const index = state.clips.findIndex((item) => item.id === clip.id);
  if (index === -1) {
    return false;
  }
  state.clips.splice(index, 1);

  if (!state.clips.length) {
    state.timelineDuration = MIN_EMPTY_TIMELINE_SECONDS;
    state.loopStartTime = 0;
    state.loopEndTime = state.timelineDuration;
    state.playheadTime = clamp(state.playheadTime, 0, state.timelineDuration);
    return true;
  }

  ensureTimelineCoversClips();
  return true;
}

function createClipSegment(clip, segmentStartTime, segmentEndTime, shiftedStartTime) {
  const sampleRate = clip.audioBuffer.sampleRate;
  const localStart = Math.max(0, segmentStartTime - clip.startTime);
  const localEnd = Math.min(clip.duration, segmentEndTime - clip.startTime);
  if (localEnd <= localStart) {
    return null;
  }

  const startFrame = Math.floor(localStart * sampleRate);
  const endFrame = Math.floor(localEnd * sampleRate);
  if (endFrame <= startFrame) {
    return null;
  }

  const segmentBuffer = sliceAudioBuffer(clip.audioBuffer, startFrame, endFrame);
  const segmentDuration = segmentBuffer.length / sampleRate;

  return {
    id: state.nextClipId++,
    name: `${clip.name || "CLIP"} DUP`,
    audioBuffer: segmentBuffer,
    duration: segmentDuration,
    originalDuration: segmentDuration,
    loopEnabled: false,
    startTime: shiftedStartTime,
    channelId: sanitizeChannelId(clip.channelId),
    yNorm: clip.yNorm,
    rootId: getClipRootId(clip),
    parentId: clip.id,
    peaks: createPeaks(segmentBuffer),
  };
}

async function duplicateLoopRegion() {
  const { start: loopStart, end: loopEnd, span } = getLoopBounds();
  if (span <= 0 || !state.clips.length) {
    setDropHint("NOTHING TO DUPLICATE", true);
    return;
  }
  const undoSnapshot = createHistorySnapshot();

  const duplicatedSegments = [];
  for (const clip of state.clips) {
    const clipStart = clip.startTime;
    const clipEnd = clip.startTime + clip.duration;
    const overlapStart = Math.max(loopStart, clipStart);
    const overlapEnd = Math.min(loopEnd, clipEnd);
    if (overlapEnd <= overlapStart) {
      continue;
    }
    const shiftedStart = loopEnd + (overlapStart - loopStart);
    const duplicated = createClipSegment(clip, overlapStart, overlapEnd, shiftedStart);
    if (duplicated) {
      duplicatedSegments.push(duplicated);
    }
  }

  for (const clip of state.clips) {
    if (clip.startTime >= loopEnd) {
      clip.startTime += span;
    }
  }

  state.clips.push(...duplicatedSegments);
  state.clips.sort((a, b) => a.startTime - b.startTime);
  ensureTimelineCoversClips();

  pushUndoSnapshot(undoSnapshot);
  setDropHint(`LOOP DUPLICATED (${duplicatedSegments.length} CLIPS)`);
  render();
  renderClipList();
  await rescheduleAfterDragIfNeeded();
}

function ensureAudioContext() {
  if (!runtime.audioContext) {
    runtime.audioContext = new AudioContext();
    if (runtime.selectedOutputDeviceId) {
      void applyMasterOutputDevice(runtime.selectedOutputDeviceId);
    }
  }
  return runtime.audioContext;
}

async function ensureAudioContextRunning() {
  const audioContext = ensureAudioContext();
  if (audioContext.state !== "running") {
    try {
      await audioContext.resume();
    } catch {
      // ignored; caller handles non-running state
    }
  }
  return audioContext;
}

function createPeaks(audioBuffer, points = PEAK_POINTS) {
  const channel = audioBuffer.getChannelData(0);
  const bucketSize = Math.max(1, Math.floor(channel.length / points));
  const peaks = new Float32Array(points);

  for (let i = 0; i < points; i += 1) {
    const start = i * bucketSize;
    const end = Math.min(channel.length, start + bucketSize);
    let maxAbs = 0;
    for (let j = start; j < end; j += 1) {
      const abs = Math.abs(channel[j]);
      if (abs > maxAbs) {
        maxAbs = abs;
      }
    }
    peaks[i] = maxAbs;
  }

  return peaks;
}

function timeToX(time, width) {
  return (time / state.timelineDuration) * width;
}

function xToTime(x, width) {
  return (x / width) * state.timelineDuration;
}

function fitWorldToViewport(seconds) {
  const duration = Math.max(LOOP_MIN_GAP_SECONDS, Number(seconds) || MIN_EMPTY_TIMELINE_SECONDS);
  const viewWidthPx = Math.max(
    1,
    Math.floor(
      timelineViewport?.clientWidth
      || canvas?.parentElement?.clientWidth
      || canvas?.clientWidth
      || 1
    )
  );
  runtime.timelineMinWorldPx = viewWidthPx;
  if (!Number.isFinite(runtime.timelinePxPerSec) || runtime.timelinePxPerSec <= 0) {
    runtime.timelinePxPerSec = 120;
  }
  if (Number.isFinite(duration) && duration > 0) {
    const minPxPerSec = viewWidthPx / duration;
    runtime.timelinePxPerSec = Math.max(runtime.timelinePxPerSec, minPxPerSec);
  }
}

function recomputeTimelineBounds() {
  const viewWidthPx = Math.max(
    1,
    Math.floor(
      timelineViewport?.clientWidth
      || canvas?.parentElement?.clientWidth
      || canvas?.clientWidth
      || 1
    )
  );
  const previousTimeline = Number(state.timelineDuration) || 0;
  const unlockedTimeline = Math.max(LOOP_MIN_GAP_SECONDS, getUnlockedTimelineDuration());
  const lockedDuration = getLockedTimelineDuration();
  const nextTimeline = lockedDuration ?? unlockedTimeline;

  state.timelineDuration = nextTimeline;
  state.playheadTime = clamp(Number(state.playheadTime) || 0, 0, state.timelineDuration);
  state.loopStartTime = clamp(Number(state.loopStartTime) || 0, 0, state.timelineDuration);
  if (LOCK_LOOP_END_TO_TIMELINE) {
    state.loopEndTime = state.timelineDuration;
  } else {
    state.loopEndTime = clamp(
      Number(state.loopEndTime) || state.timelineDuration,
      state.loopStartTime + LOOP_MIN_GAP_SECONDS,
      state.timelineDuration
    );
  }

  const worldWidthPx = viewWidthPx;
  runtime.timelineWorldWidthPx = worldWidthPx;
  canvas.style.width = "100%";

  if (timelineViewport) {
    timelineViewport.scrollLeft = 0;
  }
}

function getLoopBounds() {
  const start = clamp(state.loopStartTime, 0, state.timelineDuration);
  const end = LOCK_LOOP_END_TO_TIMELINE
    ? state.timelineDuration
    : clamp(state.loopEndTime, start + LOOP_MIN_GAP_SECONDS, state.timelineDuration);
  return { start, end, span: Math.max(LOOP_MIN_GAP_SECONDS, end - start) };
}

function getLoopMarkerRenderState(width, marginPx = 12) {
  const { start, end } = getLoopBounds();
  const actualStartX = timeToX(start, width);
  const actualEndX = timeToX(end, width);
  const ratio = window.devicePixelRatio || 1;
  const viewportLeft = Math.max(0, (timelineViewport?.scrollLeft || 0) * ratio);
  const viewportWidth = Math.max(1, (timelineViewport?.clientWidth || canvas.clientWidth || 1) * ratio);
  const viewportRight = viewportLeft + viewportWidth;
  const margin = Math.max(1, marginPx * ratio);
  const dockLeft = viewportLeft + margin;
  const dockRight = Math.max(dockLeft + margin, viewportRight - margin);

  const startX = clamp(actualStartX, dockLeft, dockRight);
  const endX = clamp(actualEndX, dockLeft, dockRight);
  return {
    start,
    end,
    actualStartX,
    actualEndX,
    startX,
    endX,
    startDocked: Math.abs(startX - actualStartX) > 0.5,
    endDocked: Math.abs(endX - actualEndX) > 0.5,
  };
}

function resizeCanvasToDisplaySize() {
  recomputeTimelineBounds();
  const ratio = window.devicePixelRatio || 1;
  const cssWidth = Math.floor(canvas.clientWidth || 0);
  const cssHeight = Math.floor(canvas.clientHeight || 0);
  // Hidden pane guard: keep last valid backing size instead of collapsing to 0x0.
  if (cssWidth < 2 || cssHeight < 2) {
    return false;
  }
  const displayWidth = Math.floor(cssWidth * ratio);
  const displayHeight = Math.floor(cssHeight * ratio);
  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
  return true;
}

function getClipRenderData(clip) {
  const width = canvas.width;
  const height = canvas.height;
  const xStart = timeToX(clip.startTime, width);
  const xEnd = timeToX(clip.startTime + clip.duration, width);
  const yCenter = clip.yNorm * height;
  const amp = clamp(height * 0.08, 14, 34) * (0.6 + (1 - clip.yNorm) * 0.4);
  return { xStart, xEnd, yCenter, amp };
}

function findClipAtPoint(x, y) {
  for (let i = state.clips.length - 1; i >= 0; i -= 1) {
    const clip = state.clips[i];
    const { xStart, xEnd, yCenter, amp } = getClipRenderData(clip);
    const minX = Math.min(xStart, xEnd);
    const maxX = Math.max(xStart, xEnd);
    const hitY = Math.abs(y - yCenter) <= amp + 14;
    if (x >= minX && x <= maxX && hitY) {
      return clip;
    }
  }
  return null;
}

function findClipLoopHandleAtPoint(x, y) {
  if (!state.loopMode) return null;
  for (let i = state.clips.length - 1; i >= 0; i -= 1) {
    const clip = state.clips[i];
    const { xEnd, yCenter, amp } = getClipRenderData(clip);
    const nearX = Math.abs(x - xEnd) <= LOOPMODE_HANDLE_HIT_PX;
    const nearY = Math.abs(y - yCenter) <= amp + 16;
    if (nearX && nearY) {
      return clip;
    }
  }
  return null;
}

function findClipById(clipId) {
  return state.clips.find((clip) => clip.id === clipId) || null;
}

function disarmLoopstackClearButton() {
  if (runtime.loopstackClearArmTimer) {
    clearTimeout(runtime.loopstackClearArmTimer);
    runtime.loopstackClearArmTimer = null;
  }
  runtime.loopstackClearArmed = false;
  if (loopstackClearBtn) {
    loopstackClearBtn.textContent = "CLEAR ALL";
    loopstackClearBtn.setAttribute("aria-pressed", "false");
  }
}

function armLoopstackClearButton() {
  if (runtime.loopstackClearArmTimer) {
    clearTimeout(runtime.loopstackClearArmTimer);
  }
  runtime.loopstackClearArmed = true;
  if (loopstackClearBtn) {
    loopstackClearBtn.textContent = "CLEAR ALL ?";
    loopstackClearBtn.setAttribute("aria-pressed", "true");
  }
  runtime.loopstackClearArmTimer = setTimeout(() => {
    runtime.loopstackClearArmTimer = null;
    disarmLoopstackClearButton();
  }, 2200);
}

function hideLoopstackToast() {
  if (!loopstackToast) return;
  loopstackToast.classList.add("panel-hidden");
  loopstackToast.setAttribute("aria-hidden", "true");
}

function showLoopstackToast(message) {
  if (!loopstackToast || !loopstackToastText) return;
  loopstackToastText.textContent = message;
  loopstackToast.classList.remove("panel-hidden");
  loopstackToast.setAttribute("aria-hidden", "false");
  if (runtime.loopstackToastTimer) clearTimeout(runtime.loopstackToastTimer);
  runtime.loopstackToastTimer = setTimeout(() => {
    runtime.loopstackToastTimer = null;
    hideLoopstackToast();
  }, 2600);
}

function updateLoopstackUiVisibility() {
  state.loopstack.open = state.activeTab === "loopr";
  if (stackToggleBtn) {
    stackToggleBtn.setAttribute("aria-pressed", String(state.loopstack.open));
    stackToggleBtn.textContent = `LOOPR ${state.loopstack.voices.length}`;
  }
}

function updateLoopstackHeaderButtons() {
  const pausedCount = state.loopstack.voices.reduce((acc, voice) => acc + (voice?.paused ? 1 : 0), 0);
  if (looprPlayBtn) {
    const running = !state.loopstack.userPaused;
    looprPlayBtn.setAttribute("aria-pressed", String(running));
    looprPlayBtn.textContent = running ? "LOOPR PAUSE" : "LOOPR PLAY";
    looprPlayBtn.disabled = Boolean(runtime.looprToggleBusy);
  }
  if (loopstackMuteAllBtn) {
    loopstackMuteAllBtn.setAttribute("aria-pressed", String(state.loopstack.muteAll));
    loopstackMuteAllBtn.textContent = state.loopstack.muteAll ? "MUTE ALL ON" : "MUTE ALL OFF";
  }
  if (loopstackFollowBtn) {
    loopstackFollowBtn.setAttribute("aria-pressed", String(state.loopstack.followTransport));
    loopstackFollowBtn.textContent = state.loopstack.followTransport ? "FOLLOW ON" : "FOLLOW OFF";
  }
  if (loopstackStartModeBtn) {
    loopstackStartModeBtn.textContent = `NEW: ${String(state.loopstack.defaultStartMode || "free").toUpperCase()}`;
  }
  if (loopstackResumeAllBtn) {
    loopstackResumeAllBtn.textContent = pausedCount > 0 ? `RESUME ALL (${pausedCount})` : "RESUME ALL";
    loopstackResumeAllBtn.disabled = pausedCount === 0;
  }
  if (looprPausedBadge) {
    looprPausedBadge.classList.toggle("panel-hidden", pausedCount === 0);
  }
}

async function setLooprPlaybackEnabled(enabled) {
  if (runtime.looprToggleBusy) return;
  runtime.looprToggleBusy = true;
  updateLoopstackHeaderButtons();
  const shouldRun = Boolean(enabled);
  try {
    state.loopstack.userPaused = !shouldRun;
    let changed = 0;
    if (!shouldRun) {
      for (const voice of state.loopstack.voices) {
        if (voice.paused || voice.enabled === false) {
          voice.userPaused = false;
          continue;
        }
        voice.userPaused = true;
        if (voice.node?.src) {
          stopLoopVoiceNode(voice, false);
          changed += 1;
        }
      }
    } else {
      const audioContext = await ensureAudioContextRunning();
      if (audioContext.state !== "running") {
        setDropHint("AUDIO CONTEXT BLOCKED", true);
      }
      ensureMasterNodes();
      let index = 0;
      for (const voice of state.loopstack.voices) {
        if (voice.paused || voice.enabled === false) {
          voice.userPaused = false;
          continue;
        }
        if (voice.userPaused || !voice.node?.src) {
          if (audioContext.state === "running" && startLoopVoiceNode(voice)) {
            changed += 1;
          }
        }
        voice.userPaused = false;
        index += 1;
        if (index % 8 === 0) {
          await new Promise((resolve) => requestAnimationFrame(() => resolve()));
        }
      }
    }
    updateLoopstackHeaderButtons();
    updateLooprWaveCanvases();
    setDropHint(shouldRun ? `LOOPR PLAY (${changed})` : "LOOPR PAUSE");
  } finally {
    runtime.looprToggleBusy = false;
    updateLoopstackHeaderButtons();
  }
}

function drawLoopRegionMiniWave(canvasEl, audioBuffer, loopInSec, loopOutSec, options = {}) {
  if (!canvasEl) return;
  const c = canvasEl.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.floor(canvasEl.clientWidth * dpr));
  const h = Math.max(1, Math.floor(canvasEl.clientHeight * dpr));
  if (canvasEl.width !== w || canvasEl.height !== h) {
    canvasEl.width = w;
    canvasEl.height = h;
  }
  c.clearRect(0, 0, w, h);
  c.fillStyle = "rgba(255,255,255,0.56)";
  c.fillRect(0, 0, w, h);
  if (!audioBuffer) return;
  const ch = audioBuffer.getChannelData(0);
  const sr = audioBuffer.sampleRate;
  const inFrame = clamp(Math.floor(loopInSec * sr), 0, Math.max(0, ch.length - 1));
  const outFrame = clamp(Math.floor(loopOutSec * sr), inFrame + 1, ch.length);
  const span = Math.max(1, outFrame - inFrame);
  const loopLenSec = Math.max(LOOPSTACK_MIN_REGION_SECONDS, Number(loopOutSec) - Number(loopInSec));
  const normLenSec = Math.max(LOOPSTACK_MIN_REGION_SECONDS, Number(options.normLenSec) || loopLenSec);
  const maxRatio = Math.max(1, Number(options.maxRatio) || 1);
  const normWidth = Math.floor(w * 0.58);
  const lenRatio = loopLenSec / normLenSec;
  const maxWaveformWidth = Math.max(12, w - 4);
  const fitScale = Math.min(1, maxWaveformWidth / Math.max(1, normWidth * maxRatio));
  const waveformWidth = Math.max(12, Math.floor(normWidth * lenRatio * fitScale));
  const centerX = Math.floor(w * 0.5);
  const waveformLeft = centerX - Math.floor(waveformWidth * 0.5);
  const normLeft = centerX - Math.floor(normWidth * 0.5);
  const spp = Math.max(1, Math.floor(span / waveformWidth));

  c.strokeStyle = "rgba(47, 49, 50, 0.55)";
  c.lineWidth = Math.max(1, Math.floor(dpr));
  c.strokeRect(normLeft + 0.5, 1.5, Math.max(1, normWidth - 1), Math.max(1, h - 3));

  c.fillStyle = "rgba(47,49,50,0.06)";
  c.fillRect(Math.max(0, waveformLeft), 0, Math.min(w, waveformWidth), h);

  c.strokeStyle = "#2f3132";
  c.lineWidth = Math.max(1, Math.floor(dpr));
  c.beginPath();
  for (let x = 0; x < waveformWidth; x += 1) {
    const s = inFrame + x * spp;
    const e = Math.min(outFrame, s + spp);
    let min = 1;
    let max = -1;
    for (let i = s; i < e; i += 1) {
      const v = ch[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const y1 = ((1 - max) * 0.5) * h;
    const y2 = ((1 - min) * 0.5) * h;
    const xx = waveformLeft + x;
    c.moveTo(xx, y1);
    c.lineTo(xx, y2);
  }
  c.stroke();

  if (options.outMetrics && typeof options.outMetrics === "object") {
    options.outMetrics.waveformLeftCss = waveformLeft / dpr;
    options.outMetrics.waveformWidthCss = waveformWidth / dpr;
    options.outMetrics.canvasWidthCss = w / dpr;
  }
}

function fitLooprRowsToViewport() {
  if (!loopstackList || state.activeTab !== "loopr") return;
  const rows = Math.max(1, state.loopstack.voices.length || 1);
  const rect = loopstackList.getBoundingClientRect();
  const available = Math.max(120, Math.floor(window.innerHeight - rect.top - 18));
  const gap = 6;
  const rowChrome = 16;
  const waveH = clamp(
    Math.floor((available - (rows - 1) * gap - rows * rowChrome) / rows),
    22,
    56
  );
  loopstackList.style.height = `${available}px`;
  loopstackList.style.setProperty("--loopr-wave-h", `${waveH}px`);
}

function applyLoopVoiceGainState(voice) {
  if (!voice?.node?.gain) return;
  if (voice.enabled === false || voice.paused) {
    voice.node.gain.gain.value = 0;
    return;
  }
  const isMuted = state.loopstack.muteAll || voice.muted;
  voice.node.gain.gain.value = isMuted ? 0 : clamp(Number(voice.gain) || 1, 0, 1.5);
}

function stopLoopVoiceNode(voice, markTransportPaused = false) {
  if (!voice) return;
  if (markTransportPaused) {
    voice.transportPaused = true;
  } else {
    voice.transportPaused = false;
  }
  if (!voice.node) return;
  if (voice._playToken) {
    globalPlayStop(voice._playToken);
    voice._playToken = null;
  }
  try { voice.node.src.stop(); } catch {}
  try { voice.node.src.disconnect(); } catch {}
  try { voice.node.gain.disconnect(); } catch {}
  voice.node = null;
}

function startLoopVoiceNode(voice) {
  if (!voice || !voice.audioBuffer) return false;
  if (voice.enabled === false || voice.paused) return false;
  const audioContext = ensureAudioContext();
  const master = ensureMasterNodes();
  stopLoopVoiceNode(voice, false);

  const source = audioContext.createBufferSource();
  source.buffer = voice.audioBuffer;
  source.loop = true;
  source.loopStart = clamp(voice.loopInSec, 0, voice.audioBuffer.duration);
  source.loopEnd = clamp(voice.loopOutSec, source.loopStart + LOOPSTACK_MIN_REGION_SECONDS, voice.audioBuffer.duration);
  source.playbackRate.value = semitonesToPlaybackRate(state.pitchSemitones);

  const gainNode = audioContext.createGain();
  source.connect(gainNode);
  const loopBus = master.channelDryBus?.[0] || master.input;
  gainNode.connect(loopBus);

  const mode = voice.mode === "sync" ? "sync" : "free";
  let startAt = audioContext.currentTime;
  if (mode === "sync") {
    const now = audioContext.currentTime;
    if (state.isPlaying) {
      const loopStart = state.loopEnabled ? getLoopBounds().start : 0;
      const loopSpan = state.loopEnabled
        ? getLoopBounds().span
        : Math.max(LOOP_MIN_GAP_SECONDS, state.timelineDuration || LOOP_MIN_GAP_SECONDS);
      const rawPlayhead = state.transportAnchorPlayhead + (now - state.transportAnchorContextTime);
      const phase = (((rawPlayhead - loopStart) % loopSpan) + loopSpan) % loopSpan;
      const epsilon = 0.002;
      const delta = phase < epsilon || (loopSpan - phase) < epsilon ? 0 : (loopSpan - phase);
      startAt = now + delta;
    } else {
      startAt = now;
    }
  }
  source.start(startAt, source.loopStart);
  if (!voice._playToken) {
    voice._playToken = globalPlayStart(`loopstack:${voice.id}`);
  }

  voice.createdAtAudioTime = startAt;
  voice.mode = mode;
  voice.node = { src: source, gain: gainNode };
  voice.transportPaused = false;
  voice.paused = false;
  applyLoopVoiceGainState(voice);
  return true;
}

async function addLoopVoiceFromClip(clip, loopInSec, loopOutSec, mode = "free") {
  if (!clip?.audioBuffer) return false;
  const inSec = clamp(Number(loopInSec) || 0, 0, clip.audioBuffer.duration);
  const outSec = clamp(Number(loopOutSec) || clip.audioBuffer.duration, inSec + LOOPSTACK_MIN_REGION_SECONDS, clip.audioBuffer.duration);
  const voice = {
    id: createLoopVoiceId(),
    sourceClipId: clip.id,
    sourceName: clip.name || "clip",
    audioBuffer: clip.audioBuffer,
    sr: clip.audioBuffer.sampleRate,
    channels: clip.audioBuffer.numberOfChannels,
    loopInSec: inSec,
    loopOutSec: outSec,
    gain: 1.0,
    muted: false,
    createdAtAudioTime: 0,
    mode: mode === "sync" ? "sync" : "free",
    node: null,
    transportPaused: false,
    enabled: true,
    paused: false,
    userPaused: false,
  };
  let started = false;
  if (!state.loopstack.userPaused) {
    started = startLoopVoiceNode(voice);
    if (!started) return false;
  }
  state.loopstack.voices.push(voice);
  state.loopstack.panicPaused = false;
  markUnsavedChanges();
  if (!state.loopstack.open) {
    showLoopstackToast(`SENT TO LOOPR (${state.loopstack.voices.length})`);
  }
  updateLoopstackUiVisibility();
  updateLoopstackHeaderButtons();
  renderLoopstackList();
  return true;
}

function deleteLoopVoice(id) {
  const index = state.loopstack.voices.findIndex((voice) => voice.id === id);
  if (index === -1) return;
  const voice = state.loopstack.voices[index];
  stopLoopVoiceNode(voice, false);
  state.loopstack.voices.splice(index, 1);
  state.loopstack.panicPaused = state.loopstack.voices.some((item) => item.paused);
  updateLoopstackUiVisibility();
  updateLoopstackHeaderButtons();
  renderLoopstackList();
}

function clearAllLoopVoices() {
  for (const voice of state.loopstack.voices) {
    stopLoopVoiceNode(voice, false);
  }
  state.loopstack.voices = [];
  state.loopstack.panicPaused = false;
  if (runtime.looprUiTimer) {
    clearInterval(runtime.looprUiTimer);
    runtime.looprUiTimer = null;
  }
  updateLoopstackUiVisibility();
  updateLoopstackHeaderButtons();
  renderLoopstackList();
}

function handleLoopVoicesTransportStop() {
  if (!state.loopstack.followTransport) return;
  for (const voice of state.loopstack.voices) {
    if (voice.paused || voice.enabled === false) continue;
    stopLoopVoiceNode(voice, true);
  }
}

function handleLoopVoicesTransportStart() {
  if (!state.loopstack.followTransport || state.loopstack.userPaused) return;
  for (const voice of state.loopstack.voices) {
    if (voice.paused || voice.enabled === false) continue;
    if (!voice.node || voice.transportPaused) {
      startLoopVoiceNode(voice);
    }
  }
}

function panicPauseLoopVoices() {
  for (const voice of state.loopstack.voices) {
    stopLoopVoiceNode(voice, false);
    voice.paused = true;
    voice.enabled = false;
    voice.userPaused = false;
  }
  state.loopstack.panicPaused = state.loopstack.voices.length > 0;
  updateLoopstackHeaderButtons();
  renderLoopstackList();
}

function resumeLoopVoice(voice) {
  if (!voice) return false;
  voice.enabled = true;
  voice.paused = false;
  voice.userPaused = false;
  const started = startLoopVoiceNode(voice);
  if (!started) {
    voice.paused = true;
    voice.enabled = false;
    return false;
  }
  return true;
}

function applyLoopVoiceBounds(voice, inSec, outSec) {
  if (!voice?.audioBuffer) return;
  const duration = voice.audioBuffer.duration;
  const nextIn = clamp(Number(inSec) || 0, 0, duration);
  const nextOut = clamp(Number(outSec) || duration, nextIn + LOOPSTACK_MIN_REGION_SECONDS, duration);
  voice.loopInSec = nextIn;
  voice.loopOutSec = nextOut;
  if (voice.paused || voice.enabled === false || state.loopstack.userPaused) {
    updateLooprWaveCanvases();
    return;
  }
  if (voice.node?.src) {
    startLoopVoiceNode(voice);
  }
  updateLooprWaveCanvases();
}

function resumeAllLoopVoices() {
  let resumed = 0;
  for (const voice of state.loopstack.voices) {
    if (!voice?.paused) continue;
    if (resumeLoopVoice(voice)) {
      resumed += 1;
    }
  }
  if (resumed > 0) {
    state.loopstack.panicPaused = false;
  }
  updateLoopstackHeaderButtons();
  renderLoopstackList();
  setDropHint(resumed > 0 ? `LOOPR RESUMED (${resumed})` : "NO PAUSED VOICES");
}

function handlePanicKill() {
  stopPlayback({ keepPlayhead: true });
  clearGlobalPlayTokens();
  abortAudioRecordingSilently();
  state.automation.isRecording = false;
  disarmClearAutomationButton();
  panicPauseLoopVoices();
  updatePlayButtonUi();
  updateAutomationUi();
  render();
  renderClipList();
  setDropHint("PANIC KILL");
}

function handleAudioResetDone() {
  state.loopstack.panicPaused = state.loopstack.voices.some((voice) => voice.paused);
  updateLoopstackHeaderButtons();
  renderLoopstackList();
  setDropHint("AUDIO RESET READY");
}

function captureResumeSnapshot() {
  state.resumeSnapshot.valid = true;
  state.resumeSnapshot.wasPlaying = Boolean(state.isPlaying);
  state.resumeSnapshot.capturedAtSec = clamp(getCurrentPlayheadTime(), 0, state.timelineDuration);
  state.resumeSnapshot.loopstack.followTransport = Boolean(state.loopstack.followTransport);
  state.resumeSnapshot.loopstack.voices = state.loopstack.voices.map((voice) => ({
    id: voice.id,
    enabled: Boolean(voice.enabled) && !voice.paused && Boolean(voice.node?.src),
    muted: Boolean(voice.muted),
    mode: voice.mode === "sync" ? "sync" : "free",
  }));
}

function globalStopCapture() {
  if (!state.isPlaying) {
    syncTransportState();
    return;
  }
  captureResumeSnapshot();
  stopPlayback({ keepPlayhead: true });
  syncTransportState();
  render();
  renderClipList();
  setDropHint("GLOBAL STOP");
}

async function globalResumeFromSnapshot() {
  const hasPausedVoices = state.loopstack.voices.some((voice) => voice.paused);
  const snapshotValid = Boolean(state.resumeSnapshot.valid);
  const snapshot = state.resumeSnapshot;
  const startAtSec = snapshotValid
    ? clamp(Number(snapshot.capturedAtSec) || 0, 0, state.timelineDuration)
    : clamp(Number(state.playheadTime) || 0, 0, state.timelineDuration);

  if (snapshotValid && state.loopstack.followTransport && snapshot.loopstack.followTransport) {
    const enabledIds = new Set(
      (snapshot.loopstack.voices || [])
        .filter((item) => Boolean(item?.enabled))
        .map((item) => String(item.id))
    );
    for (const voice of state.loopstack.voices) {
      if (voice.paused) {
        continue;
      }
      const shouldRun = enabledIds.has(String(voice.id));
      voice.enabled = shouldRun;
      if (!shouldRun) {
        stopLoopVoiceNode(voice, false);
      }
    }
  }

  state.playheadTime = startAtSec;
  await startPlayback();
  syncTransportState();
  render();
  renderClipList();
  if (hasPausedVoices) {
    setDropHint("RESUMED (PAUSED STACK VOICES STAY PAUSED)");
  } else {
    setDropHint("GLOBAL RESUME");
  }
}

async function toggleStopResume() {
  if (state.isPlaying) {
    globalStopCapture();
  } else {
    await globalResumeFromSnapshot();
  }
}

async function jumpToLoopOrTimelineStart() {
  const target = state.loopEnabled
    ? clamp(Number(state.loopStartTime) || 0, 0, state.timelineDuration)
    : 0;
  const wasPlaying = state.isPlaying;
  if (wasPlaying) {
    stopPlayback({ keepPlayhead: false });
  }
  state.playheadTime = target;
  syncTransportState();
  render();
  renderClipList();
  if (wasPlaying) {
    await startPlayback();
  }
  setDropHint(state.loopEnabled ? "JUMP LOOP START" : "JUMP TIMELINE START");
}

function renderLoopstackList() {
  if (!loopstackList) return;
  loopstackList.innerHTML = "";
  if (!state.loopstack.voices.length) {
    const empty = document.createElement("p");
    empty.className = "loopstack-empty";
    empty.textContent = "NO LOOP VOICES";
    loopstackList.appendChild(empty);
    return;
  }
  const normLenSec = getLooprNormLenSec();
  const maxRatio = getLooprMaxRatio(normLenSec);
  for (const voice of state.loopstack.voices) {
    const row = document.createElement("div");
    row.className = "loopvoice-row";
    if (voice.paused) {
      row.classList.add("is-paused");
    }

    const waveWrap = document.createElement("div");
    waveWrap.className = "loopvoice-wave-wrap";
    const wave = document.createElement("canvas");
    wave.className = "loopvoice-wave";
    const playhead = document.createElement("div");
    playhead.className = "loopvoice-playhead";
    waveWrap.appendChild(wave);
    waveWrap.appendChild(playhead);
    voice._uiWaveCanvas = wave;
    voice._uiPlayhead = playhead;
    row.appendChild(waveWrap);
    const metrics = {};
    drawLoopRegionMiniWave(wave, voice.audioBuffer, voice.loopInSec, voice.loopOutSec, {
      normLenSec,
      maxRatio,
      outMetrics: metrics,
    });
    const phase01 = getLoopVoicePhase01(voice);
    const left = Number(metrics.waveformLeftCss) || 0;
    const width = Number(metrics.waveformWidthCss) || 0;
    if (Number.isFinite(phase01)) {
      playhead.style.left = `${left + phase01 * width}px`;
      playhead.style.display = "block";
    } else {
      playhead.style.display = "none";
    }

    const meta = document.createElement("div");
    meta.className = "loopvoice-meta";
    const durMs = Math.round((voice.loopOutSec - voice.loopInSec) * 1000);
    const m1 = document.createElement("span");
    m1.textContent = `${voice.sourceName} (${durMs}MS)`;
    const m2 = document.createElement("span");
    const pausedLabel = voice.paused ? " | PAUSED" : "";
    m2.textContent = `${voice.loopInSec.toFixed(2)}S - ${voice.loopOutSec.toFixed(2)}S | ${String(voice.mode || "free").toUpperCase()}${pausedLabel}`;
    meta.appendChild(m1);
    meta.appendChild(m2);

    const markerWrap = document.createElement("div");
    markerWrap.className = "loopvoice-markers";
    const markerInLabel = document.createElement("span");
    markerInLabel.textContent = "IN";
    const markerIn = document.createElement("input");
    markerIn.type = "range";
    markerIn.min = "0";
    markerIn.max = String(Math.max(0.001, voice.audioBuffer?.duration || 1));
    markerIn.step = "0.0005";
    markerIn.value = String(clamp(Number(voice.loopInSec) || 0, 0, Number(markerIn.max)));
    const markerOutLabel = document.createElement("span");
    markerOutLabel.textContent = "OUT";
    const markerOut = document.createElement("input");
    markerOut.type = "range";
    markerOut.min = "0";
    markerOut.max = markerIn.max;
    markerOut.step = "0.0005";
    markerOut.value = String(clamp(Number(voice.loopOutSec) || Number(markerOut.max), 0, Number(markerOut.max)));
    markerIn.addEventListener("input", () => {
      const inSec = Number(markerIn.value) || 0;
      let outSec = Number(markerOut.value) || Number(markerOut.max);
      if (outSec <= inSec + LOOPSTACK_MIN_REGION_SECONDS) {
        outSec = clamp(inSec + LOOPSTACK_MIN_REGION_SECONDS, 0, Number(markerOut.max));
        markerOut.value = String(outSec);
      }
      applyLoopVoiceBounds(voice, inSec, outSec);
      const localDurMs = Math.round((voice.loopOutSec - voice.loopInSec) * 1000);
      m2.textContent = `${voice.loopInSec.toFixed(2)}S - ${voice.loopOutSec.toFixed(2)}S | ${String(voice.mode || "free").toUpperCase()}${voice.paused ? " | PAUSED" : ""}`;
      m1.textContent = `${voice.sourceName} (${localDurMs}MS)`;
    });
    markerOut.addEventListener("input", () => {
      let inSec = Number(markerIn.value) || 0;
      const outSec = Number(markerOut.value) || Number(markerOut.max);
      if (outSec <= inSec + LOOPSTACK_MIN_REGION_SECONDS) {
        inSec = clamp(outSec - LOOPSTACK_MIN_REGION_SECONDS, 0, outSec);
        markerIn.value = String(inSec);
      }
      applyLoopVoiceBounds(voice, inSec, outSec);
      const localDurMs = Math.round((voice.loopOutSec - voice.loopInSec) * 1000);
      m2.textContent = `${voice.loopInSec.toFixed(2)}S - ${voice.loopOutSec.toFixed(2)}S | ${String(voice.mode || "free").toUpperCase()}${voice.paused ? " | PAUSED" : ""}`;
      m1.textContent = `${voice.sourceName} (${localDurMs}MS)`;
    });
    markerWrap.appendChild(markerInLabel);
    markerWrap.appendChild(markerIn);
    markerWrap.appendChild(markerOutLabel);
    markerWrap.appendChild(markerOut);
    meta.appendChild(markerWrap);
    row.appendChild(meta);

    const vol = document.createElement("input");
    vol.className = "loopvoice-vol";
    vol.type = "range";
    vol.min = "0";
    vol.max = "1.5";
    vol.step = "0.01";
    vol.value = String(clamp(Number(voice.gain) || 1, 0, 1.5));
    vol.addEventListener("input", () => {
      voice.gain = clamp(Number(vol.value) || 1, 0, 1.5);
      applyLoopVoiceGainState(voice);
    });
    row.appendChild(vol);

    const rowPlayBtn = document.createElement("button");
    rowPlayBtn.type = "button";
    rowPlayBtn.className = "loopvoice-resume";
    const rowIsRunning = Boolean(voice.node?.src) && !voice.paused && voice.enabled !== false;
    rowPlayBtn.textContent = voice.paused ? "RESUME" : rowIsRunning ? "PAUSE" : "PLAY";
    rowPlayBtn.setAttribute("aria-pressed", String(rowIsRunning));
    rowPlayBtn.addEventListener("click", () => {
      if (voice.paused) {
        const ok = resumeLoopVoice(voice);
        if (!ok) {
          setDropHint("VOICE RESUME FAILED", true);
          return;
        }
        state.loopstack.panicPaused = state.loopstack.voices.some((item) => item.paused);
        updateLoopstackHeaderButtons();
        renderLoopstackList();
        return;
      }
      if (voice.enabled === false || !voice.node?.src) {
        voice.enabled = true;
        voice.userPaused = false;
        if (!state.loopstack.userPaused) {
          startLoopVoiceNode(voice);
        }
      } else {
        voice.enabled = false;
        voice.userPaused = true;
        stopLoopVoiceNode(voice, false);
      }
      updateLoopstackHeaderButtons();
      renderLoopstackList();
    });
    row.appendChild(rowPlayBtn);

    const muteBtn = document.createElement("button");
    muteBtn.type = "button";
    muteBtn.setAttribute("aria-pressed", String(voice.muted));
    muteBtn.textContent = voice.muted ? "MUTE ON" : "MUTE OFF";
    muteBtn.addEventListener("click", () => {
      voice.muted = !voice.muted;
      applyLoopVoiceGainState(voice);
      renderLoopstackList();
    });
    row.appendChild(muteBtn);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "DEL";
    delBtn.addEventListener("click", () => {
      deleteLoopVoice(voice.id);
    });
    row.appendChild(delBtn);

    loopstackList.appendChild(row);
  }
  fitLooprRowsToViewport();
  startLooprUiTicker();
}

function updateLooprWaveCanvases() {
  const normLenSec = getLooprNormLenSec();
  const maxRatio = getLooprMaxRatio(normLenSec);
  for (const voice of state.loopstack.voices) {
    if (!voice?._uiWaveCanvas || !voice.audioBuffer) continue;
    const metrics = {};
    drawLoopRegionMiniWave(voice._uiWaveCanvas, voice.audioBuffer, voice.loopInSec, voice.loopOutSec, {
      normLenSec,
      maxRatio,
      outMetrics: metrics,
    });
    if (voice._uiPlayhead) {
      const phase01 = getLoopVoicePhase01(voice);
      const left = Number(metrics.waveformLeftCss) || 0;
      const width = Number(metrics.waveformWidthCss) || 0;
      if (Number.isFinite(phase01)) {
        voice._uiPlayhead.style.left = `${left + phase01 * width}px`;
        voice._uiPlayhead.style.display = "block";
      } else {
        voice._uiPlayhead.style.display = "none";
      }
    }
  }
}

function startLooprUiTicker() {
  if (runtime.looprUiTimer) return;
  runtime.looprUiTimer = setInterval(() => {
    if (!state.loopstack.voices.length) {
      clearInterval(runtime.looprUiTimer);
      runtime.looprUiTimer = null;
      return;
    }
    updateLooprWaveCanvases();
  }, 120);
}

function getLoopPopupClip() {
  if (!runtime.loopPopupClipId) return null;
  return findClipById(runtime.loopPopupClipId);
}

function closeClipLoopPopup() {
  runtime.loopPopupClipId = null;
  if (!clipLoopPopup) return;
  clipLoopPopup.classList.add("panel-hidden");
  clipLoopPopup.setAttribute("aria-hidden", "true");
}

function updateClipLoopPopupMeta() {
  const clip = getLoopPopupClip();
  if (!clip || !clipLoopInInput || !clipLoopOutInput || !clipLoopRangeInfo) return;
  let inSec = clamp(Number(clipLoopInInput.value) || 0, 0, clip.duration);
  let outSec = clamp(Number(clipLoopOutInput.value) || clip.duration, 0, clip.duration);
  if (outSec <= inSec + LOOPSTACK_MIN_REGION_SECONDS) {
    if (document.activeElement === clipLoopInInput) {
      outSec = clamp(inSec + LOOPSTACK_MIN_REGION_SECONDS, 0, clip.duration);
      clipLoopOutInput.value = String(outSec);
    } else {
      inSec = clamp(outSec - LOOPSTACK_MIN_REGION_SECONDS, 0, clip.duration);
      clipLoopInInput.value = String(inSec);
    }
  }
  clipLoopRangeInfo.textContent = `${inSec.toFixed(3)}S - ${outSec.toFixed(3)}S (${Math.round((outSec - inSec) * 1000)}MS)`;
  drawClipLoopPopupWaveform();
}

function drawClipLoopPopupWaveform() {
  const clip = getLoopPopupClip();
  if (!clipLoopCanvas) return;
  drawLoopRegionMiniWave(clipLoopCanvas, clip?.audioBuffer || null, 0, clip?.duration || 1);
  if (!clip || !clipLoopInInput || !clipLoopOutInput) return;
  const c = clipLoopCanvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const w = clipLoopCanvas.width;
  const h = clipLoopCanvas.height;
  const inSec = clamp(Number(clipLoopInInput.value) || 0, 0, clip.duration);
  const outSec = clamp(Number(clipLoopOutInput.value) || clip.duration, inSec + LOOPSTACK_MIN_REGION_SECONDS, clip.duration);
  const x1 = (inSec / clip.duration) * w;
  const x2 = (outSec / clip.duration) * w;
  c.fillStyle = "rgba(235, 219, 194, 0.32)";
  c.fillRect(x1, 0, Math.max(1, x2 - x1), h);
  c.strokeStyle = "rgba(47, 49, 50, 0.9)";
  c.lineWidth = Math.max(1, Math.floor(ratio));
  c.beginPath();
  c.moveTo(x1, 0);
  c.lineTo(x1, h);
  c.moveTo(x2, 0);
  c.lineTo(x2, h);
  c.stroke();
}

function openClipLoopPopup(clip) {
  if (!clip?.audioBuffer || !clipLoopPopup || !clipLoopInInput || !clipLoopOutInput || !clipLoopName || !clipLoopStartMode) {
    return;
  }
  runtime.loopPopupClipId = clip.id;
  clipLoopName.textContent = `${clip.name || "CLIP"} | ${clip.duration.toFixed(3)}S`;
  clipLoopInInput.min = "0";
  clipLoopOutInput.min = "0";
  clipLoopInInput.max = String(clip.duration);
  clipLoopOutInput.max = String(clip.duration);
  clipLoopInInput.value = "0";
  clipLoopOutInput.value = String(clip.duration);
  clipLoopStartMode.value = state.loopstack.defaultStartMode === "sync" ? "sync" : "free";
  if (clipLoopAfterMode) {
    clipLoopAfterMode.value = "remove";
  }
  clipLoopPopup.classList.remove("panel-hidden");
  clipLoopPopup.setAttribute("aria-hidden", "false");
  updateClipLoopPopupMeta();
}

function ensureSelectedClipsValid() {
  const existingIds = new Set(state.clips.map((clip) => clip.id));
  for (const id of runtime.selectedClipIds) {
    if (!existingIds.has(id)) {
      runtime.selectedClipIds.delete(id);
    }
  }
}

function getSelectionBounds(startX, startY, currentX, currentY) {
  return {
    minX: Math.min(startX, currentX),
    maxX: Math.max(startX, currentX),
    minY: Math.min(startY, currentY),
    maxY: Math.max(startY, currentY),
  };
}

function getClipsFullyInsideBounds(bounds) {
  const selectedIds = [];
  for (const clip of state.clips) {
    const { xStart, xEnd, yCenter, amp } = getClipRenderData(clip);
    const clipMinX = Math.min(xStart, xEnd);
    const clipMaxX = Math.max(xStart, xEnd);
    const clipMinY = yCenter - amp;
    const clipMaxY = yCenter + amp;
    if (
      clipMinX >= bounds.minX &&
      clipMaxX <= bounds.maxX &&
      clipMinY >= bounds.minY &&
      clipMaxY <= bounds.maxY
    ) {
      selectedIds.push(clip.id);
    }
  }
  return selectedIds;
}

function colorHashFromRootId(rootId) {
  let hash = 2166136261;
  const text = String(rootId ?? "");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getClipTintFillStyle(clip) {
  const rootId = getClipRootId(clip);
  const hue = colorHashFromRootId(rootId) % 360;
  return `hsla(${hue}, 24%, 63%, 0.12)`;
}

function sampleMeterLevel() {
  const analyser = runtime.masterNodes?.meterAnalyser;
  if (!analyser) {
    runtime.meterLevel *= 0.92;
    return runtime.meterLevel;
  }

  if (!runtime.meterData || runtime.meterData.length !== analyser.fftSize) {
    runtime.meterData = new Uint8Array(analyser.fftSize);
  }
  analyser.getByteTimeDomainData(runtime.meterData);

  let sumSq = 0;
  let peak = 0;
  for (let i = 0; i < runtime.meterData.length; i += 1) {
    const centered = (runtime.meterData[i] - 128) / 128;
    sumSq += centered * centered;
    const abs = Math.abs(centered);
    if (abs > peak) {
      peak = abs;
    }
  }
  const rms = Math.sqrt(sumSq / runtime.meterData.length);
  const blended = Math.max(rms * 0.7, peak * 0.65);
  const boosted = clamp(blended * 5.2, 0, 1);
  runtime.meterLevel = Math.max(boosted, runtime.meterLevel * 0.9);

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "denarrator-meter", level: runtime.meterLevel }, "*");
  }
  return runtime.meterLevel;
}

function applyMasterOutputVolume(value) {
  const next = clamp(Number(value), 0, 1);
  if (!Number.isFinite(next)) {
    return;
  }
  runtime.masterOutputVolume = next;
  if (runtime.masterNodes) {
    runtime.masterNodes.outputMix.gain.value = next;
  }
}

function applyMasterLimiterEnabled(enabled) {
  runtime.masterLimiterEnabled = Boolean(enabled);
  if (runtime.masterNodes) {
    runtime.masterNodes.limiterGain.gain.value = runtime.masterLimiterEnabled ? 1 : 0;
    runtime.masterNodes.bypassGain.gain.value = runtime.masterLimiterEnabled ? 0 : 1;
  }
}

async function applyMasterOutputDevice(deviceId) {
  runtime.selectedOutputDeviceId = String(deviceId || "");
  const ctx = runtime.audioContext;
  if (!ctx || typeof ctx.setSinkId !== "function") {
    return;
  }
  try {
    await ctx.setSinkId(runtime.selectedOutputDeviceId || "");
  } catch {
    // setSinkId is not consistently available across embedded webviews.
  }
}

function drawMinimalMeter(width, height) {
  const level = sampleMeterLevel();
  const x1 = 3;
  const x2 = 9;
  const barWidth = 2;
  const meterTop = 4;
  const meterBottom = Math.max(meterTop + 10, height - 4);
  const meterHeight = meterBottom - meterTop;
  const activeHeight = meterHeight * level;
  const activeTop = meterBottom - activeHeight;

  const baseGrad = ctx.createLinearGradient(0, meterTop, 0, meterBottom);
  baseGrad.addColorStop(0, "rgba(47, 49, 50, 0.48)");
  baseGrad.addColorStop(0.72, "rgba(85, 88, 90, 0.36)");
  baseGrad.addColorStop(1, "rgba(120, 124, 126, 0.25)");

  ctx.fillStyle = baseGrad;
  ctx.fillRect(x1, meterTop, barWidth, meterHeight);
  ctx.fillRect(x2, meterTop, barWidth, meterHeight);

  const activeGrad = ctx.createLinearGradient(0, meterTop, 0, meterBottom);
  activeGrad.addColorStop(0, "rgba(138, 58, 45, 0.85)");
  activeGrad.addColorStop(0.18, "rgba(72, 76, 78, 0.88)");
  activeGrad.addColorStop(1, "rgba(180, 184, 186, 0.7)");
  ctx.fillStyle = activeGrad;
  ctx.fillRect(x1, activeTop, barWidth, activeHeight);
  ctx.fillRect(x2, activeTop, barWidth, activeHeight);
}

function drawClipWaveSegment(xStart, segmentWidth, yCenter, amp, peaks, topSign = -1, ratio = 1) {
  const limit = Math.max(2, Math.floor(peaks.length * clamp(ratio, 0.01, 1)));
  ctx.beginPath();
  for (let i = 0; i < limit; i += 1) {
    const t = limit <= 1 ? 0 : i / (limit - 1);
    const x = xStart + t * segmentWidth;
    const y = yCenter + topSign * peaks[i] * amp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function render() {
  const sizeReady = resizeCanvasToDisplaySize();
  if (sizeReady === false && (canvas.width < 2 || canvas.height < 2)) {
    return;
  }
  ensureSelectedRootIsValid();
  ensureSelectedClipsValid();

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const loopMarker = getLoopMarkerRenderState(width);
  const loopStart = loopMarker.start;
  const loopEnd = loopMarker.end;
  const loopStartX = loopMarker.startX;
  const loopEndX = loopMarker.endX;

  ctx.fillStyle = "rgba(47, 49, 50, 0.05)";
  ctx.fillRect(loopStartX, 0, Math.max(1, loopEndX - loopStartX), height);

  ctx.strokeStyle = "#c3c0b7";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i += 1) {
    const y = (i / 8) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  for (const clip of state.clips) {
    const { xStart, xEnd, yCenter, amp } = getClipRenderData(clip);
    const clipWidth = Math.max(1, xEnd - xStart);
    const channelId = sanitizeChannelId(clip.channelId);
    const originalDuration = Math.max(LOOPSTACK_MIN_REGION_SECONDS, Number(clip.originalDuration) || clip.duration);
    const clipLooped = Boolean(clip.loopEnabled) && clip.duration > originalDuration + 1e-6;
    const isFamilySelected = state.selectedRootId !== null && getClipRootId(clip) === state.selectedRootId;
    const isSelectedByBox = runtime.selectedClipIds.has(clip.id);
    const newClipAlpha = getNewClipHighlightAlpha(clip.id);

    if (isFamilySelected) {
      ctx.fillStyle = "rgba(138, 58, 45, 0.14)";
      ctx.fillRect(xStart, 0, clipWidth, height);
    }
    if (isSelectedByBox) {
      ctx.fillStyle = "rgba(224, 140, 78, 0.28)";
      ctx.fillRect(xStart, Math.max(0, yCenter - amp - 6), clipWidth, amp * 2 + 12);
    }

    ctx.beginPath();
    if (clipLooped) {
      const repeats = Math.max(1, Math.ceil(clip.duration / originalDuration));
      for (let rep = 0; rep < repeats; rep += 1) {
        const repTime = rep * originalDuration;
        const remaining = clip.duration - repTime;
        if (remaining <= 0) break;
        const repDuration = Math.min(originalDuration, remaining);
        const repX = xStart + (repTime / clip.duration) * clipWidth;
        const repW = (repDuration / clip.duration) * clipWidth;
        const ratio = repDuration / originalDuration;
        const limit = Math.max(2, Math.floor(clip.peaks.length * clamp(ratio, 0.01, 1)));
        for (let i = 0; i < limit; i += 1) {
          const t = limit <= 1 ? 0 : i / (limit - 1);
          const x = repX + t * repW;
          const y = yCenter - clip.peaks[i] * amp;
          if (rep === 0 && i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      for (let rep = repeats - 1; rep >= 0; rep -= 1) {
        const repTime = rep * originalDuration;
        const remaining = clip.duration - repTime;
        if (remaining <= 0) continue;
        const repDuration = Math.min(originalDuration, remaining);
        const repX = xStart + (repTime / clip.duration) * clipWidth;
        const repW = (repDuration / clip.duration) * clipWidth;
        const ratio = repDuration / originalDuration;
        const limit = Math.max(2, Math.floor(clip.peaks.length * clamp(ratio, 0.01, 1)));
        for (let i = limit - 1; i >= 0; i -= 1) {
          const t = limit <= 1 ? 0 : i / (limit - 1);
          const x = repX + t * repW;
          const y = yCenter + clip.peaks[i] * amp;
          ctx.lineTo(x, y);
        }
      }
    } else {
      for (let i = 0; i < clip.peaks.length; i += 1) {
        const t = i / (clip.peaks.length - 1);
        const x = xStart + t * clipWidth;
        const y = yCenter - clip.peaks[i] * amp;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      for (let i = clip.peaks.length - 1; i >= 0; i -= 1) {
        const t = i / (clip.peaks.length - 1);
        const x = xStart + t * clipWidth;
        const y = yCenter + clip.peaks[i] * amp;
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fillStyle = getClipTintFillStyle(clip);
    ctx.fill();

    ctx.strokeStyle = "#2f3132";
    ctx.lineWidth = 1;
    if (clipLooped) {
      const repeats = Math.max(1, Math.ceil(clip.duration / originalDuration));
      for (let rep = 0; rep < repeats; rep += 1) {
        const repTime = rep * originalDuration;
        const remaining = clip.duration - repTime;
        if (remaining <= 0) break;
        const repDuration = Math.min(originalDuration, remaining);
        const repX = xStart + (repTime / clip.duration) * clipWidth;
        const repW = (repDuration / clip.duration) * clipWidth;
        const ratio = repDuration / originalDuration;
        drawClipWaveSegment(repX, repW, yCenter, amp, clip.peaks, -1, ratio);
        drawClipWaveSegment(repX, repW, yCenter, amp, clip.peaks, 1, ratio);
        if (rep > 0) {
          ctx.strokeStyle = "rgba(47, 49, 50, 0.18)";
          ctx.setLineDash([2, 4]);
          const markerX = repX;
          ctx.beginPath();
          ctx.moveTo(markerX, yCenter - amp - 8);
          ctx.lineTo(markerX, yCenter + amp + 8);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = "#2f3132";
        }
      }
    } else {
      drawClipWaveSegment(xStart, clipWidth, yCenter, amp, clip.peaks, -1, 1);
      drawClipWaveSegment(xStart, clipWidth, yCenter, amp, clip.peaks, 1, 1);
    }

    ctx.strokeStyle = "#55585a";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xStart, yCenter);
    ctx.lineTo(xEnd, yCenter);
    ctx.stroke();
    ctx.setLineDash([]);

    if (isSelectedByBox) {
      ctx.strokeStyle = "#2f3132";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(xStart, Math.max(0, yCenter - amp - 6), clipWidth, amp * 2 + 12);
      ctx.setLineDash([]);
    }

    if (newClipAlpha > 0) {
      const top = Math.max(0, yCenter - amp - 10);
      const boxH = Math.min(height - top, amp * 2 + 20);
      ctx.fillStyle = `rgba(224, 140, 78, ${0.18 * newClipAlpha})`;
      ctx.fillRect(xStart, top, clipWidth, boxH);
      ctx.strokeStyle = `rgba(138, 58, 45, ${0.85 * newClipAlpha})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(xStart + 0.5, top + 0.5, Math.max(1, clipWidth - 1), Math.max(1, boxH - 1));
    }

    const badgeText = "DEF";
    const badgeWidth = 28;
    const badgeHeight = 12;
    const badgeX = xStart + 3;
    const badgeY = Math.max(2, yCenter - amp - 18);
    ctx.fillStyle = "rgba(47,49,50,0.18)";
    ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
    ctx.strokeStyle = "#2f3132";
    ctx.strokeRect(badgeX, badgeY, badgeWidth, badgeHeight);
    ctx.fillStyle = "#2f3132";
    ctx.font = `${Math.max(8, Math.round((window.devicePixelRatio || 1) * 6.5))}px "Engebrechtre", sans-serif`;
    ctx.fillText(badgeText, badgeX + 3, badgeY + 9);

    if (state.loopMode) {
      const handleX = xEnd;
      const handleY = yCenter;
      ctx.fillStyle = "rgba(47,49,50,0.9)";
      ctx.fillRect(handleX - 1, handleY - 9, 2, 18);
      ctx.beginPath();
      ctx.moveTo(handleX + 1, handleY);
      ctx.lineTo(handleX + 7, handleY - 4);
      ctx.lineTo(handleX + 7, handleY + 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  const playheadX = timeToX(state.playheadTime, width);

  if (loopMarker.startDocked) {
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "rgba(47, 49, 50, 0.4)";
    ctx.beginPath();
    ctx.moveTo(loopStartX, 0);
    ctx.lineTo(loopStartX, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (loopMarker.endDocked) {
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "rgba(47, 49, 50, 0.4)";
    ctx.beginPath();
    ctx.moveTo(loopEndX, 0);
    ctx.lineTo(loopEndX, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  drawLoopMarkerWithTriangles(loopStartX, height);
  drawLoopMarkerWithTriangles(loopEndX, height);

  ctx.strokeStyle = "#2f3132";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(playheadX, 0);
  ctx.lineTo(playheadX, height);
  ctx.stroke();

  if (runtime.drag && runtime.drag.type === "selectionRect") {
    const bounds = getSelectionBounds(runtime.drag.startX, runtime.drag.startY, runtime.drag.currentX, runtime.drag.currentY);
    ctx.fillStyle = "rgba(47, 49, 50, 0.07)";
    ctx.fillRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    ctx.strokeStyle = "#2f3132";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    ctx.setLineDash([]);
  }

  sampleMeterLevel();
  syncTransportState();

  if (!state.isPlaying && runtime.newClipHighlights.size > 0 && !runtime.highlightRafId) {
    runtime.highlightRafId = requestAnimationFrame(() => {
      runtime.highlightRafId = null;
      render();
    });
  }

  timelineInfo.textContent = `TIMELINE: ${state.timelineDuration.toFixed(2)}S`;
  playheadInfo.textContent = `PLAYHEAD: ${state.playheadTime.toFixed(2)}S`;
  loopInfo.textContent = `LOOP: ${loopStart.toFixed(2)}S - ${loopEnd.toFixed(2)}S`;
  clipInfo.textContent = `CLIPS: ${state.clips.length}`;
  updateLoopstackUiVisibility();
  updateLoopstackHeaderButtons();
}

function renderClipList() {
  ensureSelectedRootIsValid();
  clipList.innerHTML = "";
  for (const clip of state.clips) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    const gain = yNormToGainLinear(clip.yNorm);
    button.textContent = `${clip.name} | DEF | START ${clip.startTime.toFixed(2)}S | DUR ${clip.duration.toFixed(2)}S | GAIN ${gain.toFixed(2)}`;
    if (state.selectedRootId !== null && getClipRootId(clip) === state.selectedRootId) {
      button.classList.add("family-selected");
    }
    button.addEventListener("click", () => {
      state.selectedRootId = getClipRootId(clip);
      setActiveTab("sequencer");
      render();
      renderClipList();
    });
    li.appendChild(button);
    clipList.appendChild(li);
  }
}

function clearPlayingNodes() {
  for (const node of runtime.playingNodes) {
    try {
      node.source.stop();
    } catch {
      // Node can already be stopped.
    }
    node.source.disconnect();
    node.gain.disconnect();
  }
  runtime.playingNodes = [];
}

function clearLoopTimer() {
  if (runtime.loopTimer) {
    clearTimeout(runtime.loopTimer);
    runtime.loopTimer = null;
  }
}

function getCurrentPlayheadTime() {
  if (!state.isPlaying || !runtime.audioContext) {
    return state.playheadTime;
  }
  const elapsed = runtime.audioContext.currentTime - state.transportAnchorContextTime;
  const rawPlayhead = state.transportAnchorPlayhead + elapsed;
  if (state.loopEnabled) {
    const { start, span } = getLoopBounds();
    return start + ((((rawPlayhead - start) % span) + span) % span);
  }
  return clamp(rawPlayhead, 0, state.timelineDuration);
}

function scheduleFromPlayhead(playhead) {
  const audioContext = ensureAudioContext();
  const master = ensureMasterNodes();
  clearPlayingNodes();
  clearLoopTimer();

  for (const clip of state.clips) {
    const clipStart = clip.startTime;
    const clipEnd = clip.startTime + clip.duration;
    if (clipEnd <= playhead) {
      continue;
    }

    const source = audioContext.createBufferSource();
    source.buffer = clip.audioBuffer;
    source.playbackRate.value = semitonesToPlaybackRate(state.pitchSemitones);
    const clipOriginalDuration = Math.max(LOOPSTACK_MIN_REGION_SECONDS, Number(clip.originalDuration) || clip.duration);
    const clipIsLooped = Boolean(clip.loopEnabled) && clip.duration > clipOriginalDuration + 1e-6;
    if (clipIsLooped) {
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = clipOriginalDuration;
    }

    const gainNode = audioContext.createGain();
    gainNode.gain.value = yNormToGainLinear(clip.yNorm);

    source.connect(gainNode);
    const useDelay = state.delayEnabled && runtime.selectedClipIds.has(clip.id);
    const channelId = sanitizeChannelId(clip.channelId);
    const destination = useDelay
      ? (master.channelDelayBus?.[channelId] || master.delayInput)
      : (master.channelDryBus?.[channelId] || master.input);
    gainNode.connect(destination);

    const offset = clipIsLooped
      ? Math.max(0, playhead - clipStart) % clipOriginalDuration
      : Math.max(0, playhead - clipStart);
    const delay = Math.max(0, clipStart - playhead);
    const startAt = audioContext.currentTime + delay;
    const stopAfter = Math.max(0, clipEnd - playhead);
    source.start(startAt, offset);
    try {
      source.stop(startAt + stopAfter);
    } catch {
      // stop scheduling can fail if source already ended.
    }

    runtime.playingNodes.push({ source, gain: gainNode, clipId: clip.id });
  }

  const { end: loopEnd } = getLoopBounds();
  const loopTargetEnd = state.loopEnabled ? loopEnd : state.timelineDuration;
  const remaining = Math.max(0, loopTargetEnd - playhead);
  runtime.loopTimer = setTimeout(() => {
    if (!state.isPlaying) {
      return;
    }
    if (state.loopEnabled) {
      const { start } = getLoopBounds();
      state.playheadTime = start;
      state.transportAnchorContextTime = ensureAudioContext().currentTime;
      state.transportAnchorPlayhead = start;
      scheduleFromPlayhead(start);
      render();
    } else {
      stopPlayback({ keepPlayhead: false });
      state.playheadTime = state.timelineDuration;
      updateMediaSessionState();
      render();
    }
  }, Math.max(1, Math.floor(remaining * 1000)));
}

async function startPlayback() {
  if (state.isPlaying) {
    return;
  }

  const audioContext = ensureAudioContext();
  await audioContext.resume();
  ensureMasterNodes();
  applyMasterParams();

  const { start, end } = getLoopBounds();
  let startAt = state.playheadTime >= state.timelineDuration ? 0 : clamp(state.playheadTime, 0, state.timelineDuration);
  if (state.loopEnabled && (startAt < start || startAt >= end)) {
    startAt = start;
  }
  state.isPlaying = true;
  if (!runtime.transportPlayToken) {
    runtime.transportPlayToken = globalPlayStart("transport");
  }
  syncTransportState();
  updatePlayButtonUi();
  state.transportAnchorContextTime = audioContext.currentTime;
  state.transportAnchorPlayhead = startAt;
  scheduleFromPlayhead(startAt);
  handleLoopVoicesTransportStart();
  updateMediaSessionState();

  if (!runtime.rafId) {
    tick();
  }
}

function stopPlayback({ keepPlayhead = true } = {}) {
  const hasActiveLoopVoices = state.loopstack.voices.some((voice) => Boolean(voice?.node?.src));
  if (!state.isPlaying && !runtime.playingNodes.length && !hasActiveLoopVoices) {
    return;
  }

  if (keepPlayhead) {
    state.playheadTime = getCurrentPlayheadTime();
  }

  state.isPlaying = false;
  if (runtime.transportPlayToken) {
    globalPlayStop(runtime.transportPlayToken);
    runtime.transportPlayToken = null;
  }
  syncTransportState();
  updatePlayButtonUi();
  updateMediaSessionState();
  clearLoopTimer();
  clearPlayingNodes();
  handleLoopVoicesTransportStop();
  applyRhythmLive();

  if (runtime.rafId) {
    cancelAnimationFrame(runtime.rafId);
    runtime.rafId = null;
  }
}

async function rescheduleAfterDragIfNeeded() {
  if (!state.isPlaying) {
    return;
  }
  const current = getCurrentPlayheadTime();
  stopPlayback({ keepPlayhead: true });
  state.playheadTime = current;
  await startPlayback();
}

function tick() {
  if (state.isPlaying) {
    state.playheadTime = getCurrentPlayheadTime();
    applyAutomationAtTime(state.playheadTime);
  }
  syncTransportState();
  applyRhythmLive();
  render();
  renderClipList();
  if (state.activeTab === "loopr" && state.loopstack.voices.length) {
    updateLooprWaveCanvases();
  }

  if (state.isPlaying) {
    runtime.rafId = requestAnimationFrame(tick);
  } else {
    runtime.rafId = null;
  }
}

async function importFiles(fileList) {
  const audioContext = ensureAudioContext();
  const files = Array.from(fileList || []);
  if (!files.length) {
    setDropHint("NO FILES DETECTED", true);
    return;
  }
  const undoSnapshot = createHistorySnapshot();

  let importedCount = 0;
  let failedCount = 0;

  for (const file of files) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      const duration = decoded.duration;

      const appendStart = getAppendStartForIncomingClip(duration);
      const isFirst = appendStart <= 0;

      const clipId = state.nextClipId++;
      const clip = {
        id: clipId,
        name: file.name,
        audioBuffer: decoded,
        duration,
        originalDuration: duration,
        loopEnabled: false,
        startTime: isFirst ? 0 : appendStart,
        channelId: 0,
        yNorm: 0.5,
        rootId: clipId,
        parentId: null,
        peaks: createPeaks(decoded),
      };

      state.clips.push(clip);
      if (state.timelineStopLocked) {
        const needed = clip.startTime + clip.duration;
        if (needed > state.timelineStopDuration) {
          state.timelineStopDuration = needed;
        }
      }
      markNewClipHighlight(clip.id);
      if (isFirst) {
        state.loopStartTime = 0;
        state.loopEndTime = Math.max(LOOP_MIN_GAP_SECONDS, duration);
      }
      ensureTimelineCoversClips();
      importedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  if (importedCount > 0 && failedCount === 0) {
    pushUndoSnapshot(undoSnapshot);
    setDropHint(`IMPORTED ${importedCount} FILE${importedCount === 1 ? "" : "S"}`);
  } else if (importedCount > 0 && failedCount > 0) {
    pushUndoSnapshot(undoSnapshot);
    setDropHint(`IMPORTED ${importedCount}, FAILED ${failedCount}`, true);
  } else {
    setDropHint("IMPORT FAILED. TRY WAV/AIFF/MP3", true);
  }

  render();
  renderClipList();
}

async function importCliplibWavBase64(payload) {
  const wavBytesBase64 = typeof payload?.wavBytesBase64 === "string" ? payload.wavBytesBase64 : "";
  if (!wavBytesBase64) {
    throw new Error("missing wav payload");
  }
  const audioContext = ensureAudioContext();
  const decoded = await audioContext.decodeAudioData(base64ToArrayBuffer(wavBytesBase64).slice(0));
  const duration = decoded.duration;

  const appendStart = getAppendStartForIncomingClip(duration);
  const isFirst = appendStart <= 0;

  const clipId = state.nextClipId++;
  const clipName = typeof payload?.name === "string" && payload.name.trim() ? payload.name.trim() : "I2 CLIP";
  const clip = {
    id: clipId,
    name: `${clipName}.wav`,
    audioBuffer: decoded,
    duration,
    originalDuration: duration,
    loopEnabled: false,
    startTime: isFirst ? 0 : appendStart,
    channelId: 0,
    yNorm: 0.5,
    rootId: clipId,
    parentId: null,
    peaks: createPeaks(decoded),
  };
  state.clips.push(clip);
  if (state.timelineStopLocked) {
    const needed = clip.startTime + clip.duration;
    if (needed > state.timelineStopDuration) {
      state.timelineStopDuration = needed;
    }
  }
  markNewClipHighlight(clip.id);
  if (isFirst) {
    state.loopStartTime = 0;
    state.loopEndTime = Math.max(LOOP_MIN_GAP_SECONDS, duration);
  }
  ensureTimelineCoversClips();
  markUnsavedChanges();
  render();
  renderClipList();
}

function requestCliplibListFromHost() {
  const requestId = `cliplib_list_${runtime.cliplibRequestSeq++}`;
  try {
    window.parent?.postMessage({ type: "CLIPLIB_LIST_REQ", version: 1, requestId }, "*");
  } catch {
    setDropHint("CLIPLIB REQUEST FAILED", true);
  }
}

function handleCliplibListResponse(data) {
  const items = Array.isArray(data?.items) ? data.items : [];
  if (!items.length) {
    setDropHint("CLIPLIB EMPTY", true);
    return;
  }
  const preview = items
    .slice(0, 12)
    .map((item, idx) => `${idx + 1}: ${String(item?.name || "clip")}`)
    .join("\n");
  const answer = window.prompt(`CLIPLIB PASTE\nChoose clip number:\n${preview}`, "1");
  if (!answer) {
    setDropHint("PASTE CANCELLED", true);
    return;
  }
  const idx = Math.floor(Number(answer)) - 1;
  if (!Number.isFinite(idx) || idx < 0 || idx >= items.length) {
    setDropHint("INVALID CLIP NUMBER", true);
    return;
  }
  const selected = items[idx];
  const path = typeof selected?.path === "string" ? selected.path : "";
  if (!path) {
    setDropHint("CLIP PATH MISSING", true);
    return;
  }
  const requestId = `cliplib_wav_${runtime.cliplibRequestSeq++}`;
  runtime.cliplibPendingPathByRequest.set(requestId, path);
  try {
    window.parent?.postMessage({ type: "CLIPLIB_WAV_REQ", version: 1, requestId, path }, "*");
    setDropHint(`PASTE REQUESTED: ${selected?.name || "clip"}`);
  } catch {
    runtime.cliplibPendingPathByRequest.delete(requestId);
    setDropHint("PASTE REQUEST FAILED", true);
  }
}

async function exportTimelineAsWav({ mode }) {
  if (!state.clips.length) {
    setDropHint("NOTHING TO EXPORT", true);
    return;
  }

  const { start: loopStart, end: loopEnd } = getLoopBounds();
  const exportStart = mode === "loop" ? loopStart : 0;
  const exportEnd = mode === "loop" ? loopEnd : state.timelineDuration;
  const exportDuration = Math.max(LOOP_MIN_GAP_SECONDS, exportEnd - exportStart);

  const sampleRate = state.clips[0].audioBuffer.sampleRate;
  const renderFrames = Math.max(1, Math.ceil(exportDuration * sampleRate));
  const offline = new OfflineAudioContext(2, renderFrames, sampleRate);
  const offlineInput = offline.createGain();
  const offlineDelayInput = offline.createGain();
  const offlineDelayNode = offline.createDelay(2.0);
  const offlineDelayFeedbackGain = offline.createGain();
  const offlineDelayWetGain = offline.createGain();
  const offlineDelayDryGain = offline.createGain();
  const offlineToneFilter = offline.createBiquadFilter();
  const offlineRhythmGain = offline.createGain();
  const offlineDryGain = offline.createGain();
  const offlineSaturator = offline.createWaveShaper();
  const offlineWetGain = offline.createGain();
  const channelDryBus = [0, 1, 2, 3].map(() => offline.createGain());
  const channelDelayBus = [0, 1, 2, 3].map(() => offline.createGain());

  for (let i = 0; i < 4; i += 1) {
    channelDryBus[i].gain.value = mixerChannelGain(i);
    channelDelayBus[i].gain.value = mixerChannelGain(i);
    channelDryBus[i].connect(offlineInput);
    channelDelayBus[i].connect(offlineDelayInput);
  }
  offlineDelayInput.connect(offlineDelayDryGain);
  offlineDelayDryGain.connect(offlineInput);
  offlineDelayInput.connect(offlineDelayNode);
  offlineDelayNode.connect(offlineDelayWetGain);
  offlineDelayWetGain.connect(offlineInput);
  offlineDelayNode.connect(offlineDelayFeedbackGain);
  offlineDelayFeedbackGain.connect(offlineDelayNode);
  offlineToneFilter.type = "lowpass";
  offlineToneFilter.Q.value = 0.8;
  offlineInput.connect(offlineToneFilter);
  offlineToneFilter.connect(offlineRhythmGain);
  offlineRhythmGain.connect(offlineDryGain);
  offlineRhythmGain.connect(offlineSaturator);
  offlineSaturator.connect(offlineWetGain);
  offlineDryGain.connect(offline.destination);
  offlineWetGain.connect(offline.destination);

  const mix = clamp(sampleExportParam("saturatorMix", state.saturatorMix, exportStart), 0, 1);
  const drive = clamp(sampleExportParam("saturatorDrive", state.saturatorDrive, exportStart), 1, 40);
  const invCutoff = clamp(sampleExportParam("invCutoff", state.invCutoff, exportStart), 0, 1);
  offlineDryGain.gain.value = 1 - mix;
  offlineWetGain.gain.value = mix;
  offlineSaturator.curve = createSaturationCurve(drive);
  offlineSaturator.oversample = "2x";
  offlineToneFilter.frequency.value = invCutoffToHz(invCutoff);
  offlineDelayNode.delayTime.value = clamp(state.delayTimeMs / 1000, 0.02, 1.2);
  offlineDelayFeedbackGain.gain.value = state.delayEnabled ? clamp(state.delayFeedback, 0, 0.95) : 0;
  offlineDelayWetGain.gain.value = state.delayEnabled ? clamp(state.delayMix, 0, 1) : 0;
  offlineDelayDryGain.gain.value = 1;

  const gateStep = 1 / 128;
  let t = 0;
  while (t <= exportDuration + gateStep) {
    const globalTime = exportStart + t;
    const sampledRetrigger = Number(sampleExportParam("retriggerRate", state.retriggerRate, globalTime));
    const sampledGater = Number(sampleExportParam("gaterRate", state.gaterRate, globalTime));
    const retriggerRate = RATE_STEPS.includes(sampledRetrigger) ? sampledRetrigger : state.retriggerRate;
    const gaterRate = RATE_STEPS.includes(sampledGater) ? sampledGater : state.gaterRate;
    const mixAtTime = clamp(sampleExportParam("saturatorMix", state.saturatorMix, globalTime), 0, 1);
    const invCutoffAtTime = clamp(sampleExportParam("invCutoff", state.invCutoff, globalTime), 0, 1);

    offlineRhythmGain.gain.setValueAtTime(getRhythmGateAtTimeWithRates(globalTime, retriggerRate, gaterRate), t);
    offlineDryGain.gain.setValueAtTime(1 - mixAtTime, t);
    offlineWetGain.gain.setValueAtTime(mixAtTime, t);
    offlineToneFilter.frequency.setValueAtTime(invCutoffToHz(invCutoffAtTime), t);
    t += gateStep;
  }

  for (const clip of state.clips) {
    const clipStart = clip.startTime;
    const clipEnd = clip.startTime + clip.duration;
    if (clipEnd <= exportStart || clipStart >= exportEnd) {
      continue;
    }

    const renderStart = Math.max(exportStart, clipStart);
    const renderOffset = Math.max(0, exportStart - clipStart);
    const available = clip.duration - renderOffset;
    const maxByWindow = exportEnd - renderStart;
    const segmentDuration = Math.max(0, Math.min(available, maxByWindow));
    if (segmentDuration <= 0) {
      continue;
    }

    const source = offline.createBufferSource();
    source.buffer = clip.audioBuffer;
    source.playbackRate.value = semitonesToPlaybackRate(sampleExportParam("pitchSemitones", state.pitchSemitones, renderStart));
    const clipOriginalDuration = Math.max(LOOPSTACK_MIN_REGION_SECONDS, Number(clip.originalDuration) || clip.duration);
    const clipIsLooped = Boolean(clip.loopEnabled) && clip.duration > clipOriginalDuration + 1e-6;
    if (clipIsLooped) {
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = clipOriginalDuration;
    }

    const gainNode = offline.createGain();
    gainNode.gain.value = yNormToGainLinear(clip.yNorm);

    source.connect(gainNode);
    const useDelay = state.delayEnabled && runtime.selectedClipIds.has(clip.id);
    const channelId = sanitizeChannelId(clip.channelId);
    gainNode.connect(useDelay ? channelDelayBus[channelId] : channelDryBus[channelId]);
    if (state.exportAutomationEnabled && hasAutomationData()) {
      let tPitch = Math.max(0, renderStart - exportStart);
      const tPitchEnd = tPitch + segmentDuration;
      while (tPitch <= tPitchEnd + gateStep) {
        const globalTime = exportStart + tPitch;
        const pitch = sampleExportParam("pitchSemitones", state.pitchSemitones, globalTime);
        source.playbackRate.setValueAtTime(semitonesToPlaybackRate(pitch), tPitch);
        tPitch += gateStep;
      }
    }
    const startAt = Math.max(0, renderStart - exportStart);
    const offset = clipIsLooped ? renderOffset % clipOriginalDuration : renderOffset;
    source.start(startAt, offset);
    source.stop(startAt + segmentDuration);
  }

  const modeLabel = state.exportAutomationEnabled ? "AUTO" : "STATIC";
  setDropHint(mode === "loop" ? `RENDERING LOOP EXPORT (${modeLabel})...` : `RENDERING FULL EXPORT (${modeLabel})...`);
  const rendered = await offline.startRendering();
  const wavBlob = audioBufferToWavBlob(rendered);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filenamePrefix = mode === "loop" ? "lazy-quenzer-loop" : "lazy-quenzer-full";
  const saveResult = await downloadBlob(wavBlob, `${filenamePrefix}-${timestamp}.wav`);
  if (saveResult === "cancelled") {
    setDropHint("EXPORT CANCELLED", true);
    return;
  }
  setDropHint(mode === "loop" ? "LOOP EXPORT READY" : "FULL EXPORT READY");
}

async function buildLazyQuencePayload() {
  const clipsSerialized = [];
  for (const clip of state.clips) {
    clipsSerialized.push({
      id: clip.id,
      name: clip.name,
      duration: clip.duration,
      originalDuration: Number(clip.originalDuration) > 0 ? Number(clip.originalDuration) : clip.duration,
      loopEnabled: Boolean(clip.loopEnabled),
      startTime: clip.startTime,
      channelId: sanitizeChannelId(clip.channelId),
      yNorm: clip.yNorm,
      rootId: getClipRootId(clip),
      parentId: clip.parentId ?? null,
      audioWavBase64: await audioBufferToBase64Wav(clip.audioBuffer),
    });
  }
  const looprVoicesSerialized = [];
  for (const voice of state.loopstack.voices) {
    if (!voice?.audioBuffer) continue;
    looprVoicesSerialized.push({
      id: voice.id,
      sourceClipId: voice.sourceClipId ?? null,
      sourceName: voice.sourceName || "clip",
      loopInSec: Number(voice.loopInSec) || 0,
      loopOutSec: Number(voice.loopOutSec) || 0,
      gain: clamp(Number(voice.gain) || 1, 0, 1.5),
      muted: Boolean(voice.muted),
      enabled: voice.enabled !== false,
      paused: Boolean(voice.paused),
      mode: voice.mode === "sync" ? "sync" : "free",
      audioWavBase64: await audioBufferToBase64Wav(voice.audioBuffer),
    });
  }

  const payload = {
    format: "lazy-quence",
    version: 1,
    app: "lazy.seq",
    exportedAt: new Date().toISOString(),
    settings: {
      gainMinDb: state.gainMinDb,
      gainMaxDb: state.gainMaxDb,
      retriggerRate: state.retriggerRate,
      gaterRate: state.gaterRate,
      saturatorDrive: state.saturatorDrive,
      saturatorMix: state.saturatorMix,
      delayEnabled: state.delayEnabled,
      delayTimeMs: state.delayTimeMs,
      delayFeedback: state.delayFeedback,
      delayMix: state.delayMix,
      delayClipIds: Array.from(runtime.selectedClipIds),
      pitchSemitones: state.pitchSemitones,
      invCutoff: state.invCutoff,
      exportAutomationEnabled: state.exportAutomationEnabled,
      automation: {
        retriggerRate: state.automation.lanes.retriggerRate,
        gaterRate: state.automation.lanes.gaterRate,
        saturatorDrive: state.automation.lanes.saturatorDrive,
        saturatorMix: state.automation.lanes.saturatorMix,
        pitchSemitones: state.automation.lanes.pitchSemitones,
        invCutoff: state.automation.lanes.invCutoff,
      },
      timelineDuration: state.timelineDuration,
      loopEnabled: state.loopEnabled,
      loopStartTime: state.loopStartTime,
      loopEndTime: state.loopEndTime,
      timelineFlexoMode: state.timelineFlexoMode,
      timelineStopLocked: state.timelineStopLocked,
      timelineStopDuration: state.timelineStopDuration,
      playheadTime: state.playheadTime,
      mixer: state.mixer,
      izer: {
        bandsHz: [...state.izer.bandsHz],
        bands: [...state.izer.bands],
      },
      loopMode: state.loopMode,
      repeatSnap: state.repeatSnap,
      channelMode: state.channelMode,
      lazyView: state.activeTab === "loopr" ? "loopr" : "sequencer",
      loopr: {
        followTransport: state.loopstack.followTransport,
        defaultStartMode: state.loopstack.defaultStartMode,
        muteAll: state.loopstack.muteAll,
        panicPaused: state.loopstack.panicPaused,
        playing: !state.loopstack.userPaused,
        normFrameMode: state.loopstack.normFrameMode,
        normFrameSec: state.loopstack.normFrameSec,
        voices: looprVoicesSerialized,
      },
    },
    clips: clipsSerialized,
  };
  return payload;
}

function buildLazySessionChunk(includeOnlyDirty = true) {
  const chunk = {
    schemaVersion: 1,
    transport: {
      playheadSec: Number(state.playheadTime) || 0,
      loopA: Number(state.loopStartTime) || 0,
      loopB: Number(state.loopEndTime) || 0,
    },
    ui: {
      activeTab: String(state.activeTab || "sequencer"),
      toolMode: String(state.toolMode || "arrow"),
      channelMode: Boolean(state.channelMode),
      loopMode: Boolean(state.loopMode),
      mixerOpen: Boolean(state.mixer?.open),
      loopstackOpen: Boolean(state.loopstack?.open),
    },
    refs: {},
    dirty: Boolean(runtime.hasUnsavedChanges),
  };
  if (!includeOnlyDirty || runtime.hasUnsavedChanges) {
    chunk.heavy = { quence: null };
  }
  return chunk;
}

async function saveQuenceFile() {
  const payload = await buildLazyQuencePayload();

  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = sanitizeFilenameBase(quenceNameInput.value) || `lazy-quenzer-${timestamp}`;
  const saveResult = await downloadBlob(blob, `${baseName}.quence`);
  if (saveResult === "cancelled") {
    setDropHint("SAVE CANCELLED", true);
    return false;
  }
  markSavedState();
  setDropHint(".QUENCE SAVED");
  return true;
}

async function loadQuenceFromObject(parsed, nameHint = "") {
  if (!parsed || parsed.format !== "lazy-quence" || !Array.isArray(parsed.clips)) {
    throw new Error("INVALID_QUENCE");
  }

  const audioContext = ensureAudioContext();
  const prepared = [];
  const missing = [];

  for (const raw of parsed.clips) {
    const item = {
      index: prepared.length,
      raw,
      id: Number.isFinite(raw.id) ? raw.id : state.nextClipId++,
      name: raw.name || "CLIP",
      startTime: Math.max(0, Number(raw.startTime) || 0),
      durationRaw: Number(raw.duration),
      channelId: sanitizeChannelId(raw.channelId),
      yNorm: clamp(Number(raw.yNorm) || 0.5, 0, 1),
      rootId: Number.isFinite(raw.rootId) ? raw.rootId : Number.isFinite(raw.id) ? raw.id : state.nextClipId,
      parentId: Number.isFinite(raw.parentId) ? raw.parentId : null,
      audioBuffer: null,
    };
    if (typeof raw.audioWavBase64 === "string" && raw.audioWavBase64.length > 0) {
      const wavArrayBuffer = base64ToArrayBuffer(raw.audioWavBase64);
      item.audioBuffer = await audioContext.decodeAudioData(wavArrayBuffer.slice(0));
    } else {
      missing.push(item);
    }
    prepared.push(item);
  }

  if (missing.length) {
    const recovered = await resolveMissingClipAudio(missing, audioContext);
    const recoveredByIndex = new Map(recovered.map((entry) => [entry.index, entry.audioBuffer]));
    for (const item of prepared) {
      if (!item.audioBuffer) {
        item.audioBuffer = recoveredByIndex.get(item.index) || null;
      }
      if (!item.audioBuffer) {
        throw new Error(`Missing audio for clip: ${item.name}`);
      }
    }
  }

  const nextClips = prepared.map((item) => ({
    id: item.id,
    name: item.name,
    duration: Number.isFinite(item.durationRaw) && item.durationRaw > 0 ? Number(item.durationRaw) : item.audioBuffer.duration,
    originalDuration: Number(item.raw?.originalDuration) > 0 ? Number(item.raw.originalDuration) : item.audioBuffer.duration,
    loopEnabled:
      Boolean(item.raw?.loopEnabled) &&
      (Number.isFinite(item.durationRaw) ? Number(item.durationRaw) : item.audioBuffer.duration) >
        (Number(item.raw?.originalDuration) || 0) + 1e-6,
    startTime: item.startTime,
    channelId: sanitizeChannelId(item.channelId),
    yNorm: item.yNorm,
    rootId: item.rootId,
    parentId: item.parentId,
    audioBuffer: item.audioBuffer,
    peaks: createPeaks(item.audioBuffer),
  }));
  const looprSettings = parsed.settings?.loopr || {};
  const preparedLooprVoices = [];
  if (Array.isArray(looprSettings.voices)) {
    for (const rawVoice of looprSettings.voices) {
      if (typeof rawVoice?.audioWavBase64 !== "string" || !rawVoice.audioWavBase64.length) continue;
      try {
        const wavArrayBuffer = base64ToArrayBuffer(rawVoice.audioWavBase64);
        const audioBuffer = await audioContext.decodeAudioData(wavArrayBuffer.slice(0));
        preparedLooprVoices.push({
          id: String(rawVoice.id || createLoopVoiceId()),
          sourceClipId: rawVoice.sourceClipId ?? null,
          sourceName: String(rawVoice.sourceName || "clip"),
          audioBuffer,
          sr: audioBuffer.sampleRate,
          channels: audioBuffer.numberOfChannels,
          loopInSec: clamp(Number(rawVoice.loopInSec) || 0, 0, audioBuffer.duration),
          loopOutSec: clamp(
            Number(rawVoice.loopOutSec) || audioBuffer.duration,
            (Number(rawVoice.loopInSec) || 0) + LOOPSTACK_MIN_REGION_SECONDS,
            audioBuffer.duration
          ),
          gain: clamp(Number(rawVoice.gain) || 1, 0, 1.5),
          muted: Boolean(rawVoice.muted),
          enabled: rawVoice.enabled !== false,
          paused: Boolean(rawVoice.paused),
          mode: rawVoice.mode === "sync" ? "sync" : "free",
          userPaused: false,
          node: null,
          _playToken: null,
          transportPaused: false,
          createdAtAudioTime: 0,
        });
      } catch {
        // ignore malformed loopr voice
      }
    }
  }

  stopPlayback({ keepPlayhead: false });
  for (const voice of state.loopstack.voices) {
    stopLoopVoiceNode(voice, false);
  }
  state.playheadTime = 0;
  state.clips = nextClips;
  state.nextClipId = nextClips.reduce((maxId, clip) => Math.max(maxId, clip.id), 0) + 1;
  runtime.selectedClipIds.clear();
  runtime.drag = null;

  const settings = parsed.settings || {};
  state.gainMinDb = Number.isFinite(settings.gainMinDb) ? Number(settings.gainMinDb) : -24;
  state.gainMaxDb = Number.isFinite(settings.gainMaxDb) ? Number(settings.gainMaxDb) : 0;
  state.retriggerRate = RATE_STEPS.includes(Number(settings.retriggerRate)) ? Number(settings.retriggerRate) : 0;
  state.gaterRate = RATE_STEPS.includes(Number(settings.gaterRate)) ? Number(settings.gaterRate) : 0;
  state.saturatorDrive = Number.isFinite(settings.saturatorDrive) ? clamp(Number(settings.saturatorDrive), 1, 40) : 1;
  state.saturatorMix = Number.isFinite(settings.saturatorMix) ? clamp(Number(settings.saturatorMix), 0, 1) : 0;
  state.delayEnabled = Boolean(settings.delayEnabled);
  state.delayTimeMs = Number.isFinite(settings.delayTimeMs) ? clamp(Number(settings.delayTimeMs), 20, 1200) : 260;
  state.delayFeedback = Number.isFinite(settings.delayFeedback) ? clamp(Number(settings.delayFeedback), 0, 0.95) : 0.35;
  state.delayMix = Number.isFinite(settings.delayMix) ? clamp(Number(settings.delayMix), 0, 1) : 0.28;
  runtime.selectedClipIds = new Set(Array.isArray(settings.delayClipIds) ? settings.delayClipIds : []);
  state.pitchSemitones = Number.isFinite(settings.pitchSemitones) ? clamp(Number(settings.pitchSemitones), -12, 12) : 0;
  state.invCutoff = Number.isFinite(settings.invCutoff) ? clamp(Number(settings.invCutoff), 0, 1) : 0;
  state.exportAutomationEnabled = Boolean(settings.exportAutomationEnabled);
  const automation = settings.automation || {};
  state.automation.isRecording = false;
  state.automation.lanes = {
    retriggerRate: Array.isArray(automation.retriggerRate) ? automation.retriggerRate.map((p) => ({ t: Number(p.t) || 0, v: Number(p.v) || 0 })) : [],
    gaterRate: Array.isArray(automation.gaterRate) ? automation.gaterRate.map((p) => ({ t: Number(p.t) || 0, v: Number(p.v) || 0 })) : [],
    saturatorDrive: Array.isArray(automation.saturatorDrive) ? automation.saturatorDrive.map((p) => ({ t: Number(p.t) || 0, v: Number(p.v) || 1 })) : [],
    saturatorMix: Array.isArray(automation.saturatorMix) ? automation.saturatorMix.map((p) => ({ t: Number(p.t) || 0, v: Number(p.v) || 0 })) : [],
    pitchSemitones: Array.isArray(automation.pitchSemitones) ? automation.pitchSemitones.map((p) => ({ t: Number(p.t) || 0, v: Number(p.v) || 0 })) : [],
    invCutoff: Array.isArray(automation.invCutoff) ? automation.invCutoff.map((p) => ({ t: Number(p.t) || 0, v: Number(p.v) || 0 })) : [],
  };
  if (state.gainMinDb > state.gainMaxDb) {
    [state.gainMinDb, state.gainMaxDb] = [state.gainMaxDb, state.gainMinDb];
  }

  const fallbackDuration = Math.max(
    MIN_EMPTY_TIMELINE_SECONDS,
    LOOP_MIN_GAP_SECONDS,
    nextClips.reduce((sum, clip) => sum + Math.max(0, Number(clip.duration) || 0), 0)
  );
  state.timelineDuration = fallbackDuration;

  state.loopEnabled = Boolean(settings.loopEnabled);
  state.timelineFlexoMode = Boolean(settings.timelineFlexoMode);
  state.timelineStopLocked = Boolean(settings.timelineStopLocked);
  state.timelineStopDuration = Math.max(
    MIN_EMPTY_TIMELINE_SECONDS,
    Number(settings.timelineStopDuration) || Number(fallbackDuration) || MIN_EMPTY_TIMELINE_SECONDS
  );
  state.loopMode = Boolean(settings.loopMode);
  state.repeatSnap = settings.repeatSnap !== false;
  state.channelMode = false;
  state.activeTab = settings.lazyView === "loopr" ? "loopr" : "sequencer";
  const mixerSettings = Array.isArray(settings.mixer?.ch) ? settings.mixer.ch : [];
  state.mixer.open = Boolean(settings.mixer?.open);
  state.mixer.ch = [0, 1, 2, 3].map((index) => {
    const item = mixerSettings[index] || {};
    return {
      gain: clamp(Number(item.gain) || 1, 0, 1),
      muted: Boolean(item.muted),
    };
  });
  const izerClean = sanitizeIzerGroupPayload(settings.izer || null);
  state.izer.bandsHz = izerClean.bandsHz;
  state.izer.bands = izerClean.bands;
  state.toolMode = "arrow";
  state.selectedRootId = null;
  state.loopStartTime = clamp(Number(settings.loopStartTime) || 0, 0, state.timelineDuration);
  state.loopEndTime = LOCK_LOOP_END_TO_TIMELINE
    ? state.timelineDuration
    : clamp(
      Number(settings.loopEndTime) || state.timelineDuration,
      state.loopStartTime + LOOP_MIN_GAP_SECONDS,
      state.timelineDuration
    );
  state.playheadTime = clamp(Number(settings.playheadTime) || 0, 0, state.timelineDuration);
  state.loopstack.followTransport = looprSettings.followTransport !== false;
  state.loopstack.defaultStartMode = looprSettings.defaultStartMode === "sync" ? "sync" : "free";
  state.loopstack.muteAll = Boolean(looprSettings.muteAll);
  state.loopstack.panicPaused = Boolean(looprSettings.panicPaused);
  state.loopstack.userPaused = looprSettings.playing === false;
  state.loopstack.normFrameMode = looprSettings.normFrameMode === "fixed" ? "fixed" : "median";
  state.loopstack.normFrameSec = Math.max(LOOPSTACK_MIN_REGION_SECONDS, Number(looprSettings.normFrameSec) || 0.25);
  state.loopstack.voices = preparedLooprVoices;
  for (const voice of state.loopstack.voices) {
    if (voice.enabled !== false && !voice.paused && !state.loopstack.userPaused) {
      startLoopVoiceNode(voice);
    }
    applyLoopVoiceGainState(voice);
  }
  state.loopstack.panicPaused = state.loopstack.voices.some((voice) => voice.paused);

  gainMinInput.value = String(state.gainMinDb);
  gainMaxInput.value = String(state.gainMaxDb);
  retriggerInput.value = String(Math.max(0, RATE_STEPS.indexOf(state.retriggerRate)));
  gaterInput.value = String(Math.max(0, RATE_STEPS.indexOf(state.gaterRate)));
  satDriveInput.value = String(Math.round(state.saturatorDrive));
  satMixInput.value = String(Math.round(state.saturatorMix * 100));
  pitchInput.value = String(state.pitchSemitones.toFixed(1));
  invCutoffInput.value = String(state.invCutoff.toFixed(2));
  retriggerValue.textContent = String(state.retriggerRate);
  gaterValue.textContent = String(state.gaterRate);
  satDriveValue.textContent = state.saturatorDrive.toFixed(1);
  satMixValue.textContent = `${Math.round(state.saturatorMix * 100)}%`;
  pitchValue.textContent = `${state.pitchSemitones >= 0 ? "+" : ""}${state.pitchSemitones.toFixed(1)}st`;
  invCutoffValue.textContent = `${Math.round(state.invCutoff * 100)}%`;
  updateDelayUi();
  const normalizedNameHint = typeof nameHint === "string" ? nameHint : "";
  quenceNameInput.value = sanitizeFilenameBase(normalizedNameHint.replace(/\.quence$/i, "")) || "";
  loopBtn.setAttribute("aria-pressed", String(state.loopEnabled));
  loopBtn.textContent = `LOOP ${state.loopEnabled ? "ON" : "OFF"}`;
  setActiveTab(state.activeTab);
  applyMasterParams();
  applyRhythmLive();
  refreshAllSliderTags();
  updateAutomationUi();
  updateToolUi();
  updateModeButtonsUi();
  updateMixerUi();
  updateLoopstackHeaderButtons();
  renderLoopstackList();

  render();
  renderClipList();
  markSavedState();
}

async function loadQuenceFromFile(file) {
  const rawText = await file.text();
  const parsed = JSON.parse(rawText);
  await loadQuenceFromObject(parsed, file.name);
}

async function confirmProceedWithPotentialDataLoss(actionLabel) {
  if (!runtime.hasUnsavedChanges) {
    return true;
  }

  const askSave = window.confirm(
    `Es gibt ungespeicherte Aenderungen. Vor ${actionLabel} speichern?\nOK = Speichern\nAbbrechen = Ohne Speichern fortfahren`
  );
  if (askSave) {
    const saved = await saveQuenceFile();
    if (saved) {
      return true;
    }
    const proceedWithoutSaving = window.confirm(
      "Speichern wurde abgebrochen. Trotzdem ohne Speichern fortfahren?\nOK = Ohne Speichern fortfahren\nAbbrechen = Zurueck"
    );
    if (!proceedWithoutSaving) {
      setDropHint("AKTION ABGEBROCHEN", true);
      return false;
    }
    return true;
  }
  return true;
}

function handlePointerDown(event) {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const ratio = canvas.width / rect.width;
  const x = (event.clientX - rect.left) * ratio;
  const y = (event.clientY - rect.top) * ratio;

  if (state.channelMode) {
    const clipForChannel = findClipAtPoint(x, y);
    if (clipForChannel) {
      const undoSnapshot = createHistorySnapshot();
      const step = event.shiftKey ? -1 : 1;
      const next = (sanitizeChannelId(clipForChannel.channelId) + step + 4) % 4;
      clipForChannel.channelId = next;
      pushUndoSnapshot(undoSnapshot);
      const label = next === 0 ? "DEF" : next === 1 ? "A" : next === 2 ? "B" : "C";
      setDropHint(`${clipForChannel.name || "CLIP"} -> G${label}`);
      render();
      renderClipList();
      if (state.isPlaying) {
        void rescheduleAfterDragIfNeeded();
      }
    }
    return;
  }

  const loopHandleClip = findClipLoopHandleAtPoint(x, y);
  if (loopHandleClip) {
    runtime.pendingDragUndoSnapshot = createHistorySnapshot();
    runtime.drag = {
      pointerId: event.pointerId,
      type: "clipLoopHandle",
      clipId: loopHandleClip.id,
      moved: false,
      snapLocked: false,
      snapTarget: null,
    };
    beginUiDrag();
    canvas.setPointerCapture(event.pointerId);
    return;
  }

  if (runtime.delaySelectEnabled) {
    const clipForDelayToggle = findClipAtPoint(x, y);
    if (!clipForDelayToggle) {
      return;
    }
    const undoSnapshot = createHistorySnapshot();
    if (runtime.selectedClipIds.has(clipForDelayToggle.id)) {
      runtime.selectedClipIds.delete(clipForDelayToggle.id);
    } else {
      runtime.selectedClipIds.add(clipForDelayToggle.id);
    }
    pushUndoSnapshot(undoSnapshot);
    setDropHint(`DELAY SELECT: ${runtime.selectedClipIds.size} CLIPS`);
    render();
    renderClipList();
    return;
  }

  if (state.toolMode === "select") {
    const clip = findClipAtPoint(x, y);
    const clickedSelectedClip = clip && runtime.selectedClipIds.has(clip.id);

    if (clickedSelectedClip && runtime.selectedClipIds.size > 0) {
      const selectedClips = state.clips.filter((item) => runtime.selectedClipIds.has(item.id));
      if (!selectedClips.length) {
        return;
      }
      runtime.pendingDragUndoSnapshot = createHistorySnapshot();
      runtime.drag = {
        pointerId: event.pointerId,
        type: "selection",
        startX: x,
        startY: y,
        moved: false,
        clips: selectedClips.map((item) => ({
          clipId: item.id,
          startTime: item.startTime,
          startYNorm: item.yNorm,
        })),
      };
      beginUiDrag();
      canvas.setPointerCapture(event.pointerId);
      return;
    }

    runtime.selectedClipIds.clear();
    runtime.drag = {
      pointerId: event.pointerId,
      type: "selectionRect",
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      moved: false,
    };
    beginUiDrag();
    canvas.setPointerCapture(event.pointerId);
    render();
    return;
  }

  if (state.toolMode === "scissor") {
    const clipForCut = findClipAtPoint(x, y);
    if (!clipForCut) {
      return;
    }
    const cutTime = xToTime(x, canvas.width);
    const undoSnapshot = createHistorySnapshot();
    const didCut = splitClipAtTime(clipForCut, cutTime);
    if (didCut) {
      pushUndoSnapshot(undoSnapshot);
      setDropHint("CLIP CUT");
      render();
      renderClipList();
      rescheduleAfterDragIfNeeded();
    } else {
      setDropHint("CUT TOO CLOSE TO EDGE", true);
    }
    return;
  }

  if (state.toolMode === "duplicate") {
    const clipForDup = findClipAtPoint(x, y);
    if (!clipForDup) {
      return;
    }
    const undoSnapshot = createHistorySnapshot();
    const didDuplicate = duplicateClip(clipForDup);
    if (didDuplicate) {
      pushUndoSnapshot(undoSnapshot);
      setDropHint("CLIP DUPLICATED");
      render();
      renderClipList();
      rescheduleAfterDragIfNeeded();
    }
    return;
  }

  if (state.toolMode === "delete") {
    const clipForDelete = findClipAtPoint(x, y);
    if (!clipForDelete) {
      return;
    }
    const undoSnapshot = createHistorySnapshot();
    const didDelete = deleteClipAndCollapseTimeline(clipForDelete);
    if (didDelete) {
      pushUndoSnapshot(undoSnapshot);
      setDropHint("CLIP DELETED");
      render();
      renderClipList();
      rescheduleAfterDragIfNeeded();
    }
    return;
  }

  if (state.toolMode === "half") {
    const clipForHalf = findClipAtPoint(x, y);
    if (!clipForHalf) {
      return;
    }
    const undoSnapshot = createHistorySnapshot();
    const didHalf = scaleClipLength(clipForHalf, 0.5);
    if (didHalf) {
      pushUndoSnapshot(undoSnapshot);
      setDropHint("CLIP HALVED");
      render();
      renderClipList();
      rescheduleAfterDragIfNeeded();
    } else {
      setDropHint("HALF LENGTH FAILED", true);
    }
    return;
  }

  if (state.toolMode === "double") {
    const clipForDouble = findClipAtPoint(x, y);
    if (!clipForDouble) {
      return;
    }
    const undoSnapshot = createHistorySnapshot();
    const didDouble = scaleClipLength(clipForDouble, 2);
    if (didDouble) {
      pushUndoSnapshot(undoSnapshot);
      setDropHint("CLIP DOUBLED");
      render();
      renderClipList();
      rescheduleAfterDragIfNeeded();
    } else {
      setDropHint("DOUBLE LENGTH FAILED", true);
    }
    return;
  }

  if (state.toolMode === "reverse") {
    const clipForReverse = findClipAtPoint(x, y);
    if (!clipForReverse) {
      return;
    }
    const undoSnapshot = createHistorySnapshot();
    const didReverse = reverseClipAudio(clipForReverse);
    if (didReverse) {
      pushUndoSnapshot(undoSnapshot);
      setDropHint("CLIP REVERSED");
      render();
      renderClipList();
      rescheduleAfterDragIfNeeded();
    }
    return;
  }

  const markerState = getLoopMarkerRenderState(canvas.width);
  const { start, end } = markerState;
  const loopStartX = markerState.startX;
  const loopEndX = markerState.endX;
  const clickedTime = clamp(xToTime(x, canvas.width), 0, state.timelineDuration);
  const startHitPx = LOOP_MARKER_HIT_PX + (markerState.startDocked ? 10 : 0);
  const endHitPx = LOOP_MARKER_HIT_PX + (markerState.endDocked ? 14 : 4);

  if (Math.abs(x - loopStartX) <= startHitPx) {
    runtime.pendingDragUndoSnapshot = createHistorySnapshot();
    runtime.drag = {
      pointerId: event.pointerId,
      type: "loopStart",
      startX: x,
      startTime: state.loopStartTime,
      startEndTime: state.loopEndTime,
      moved: false,
    };
    beginUiDrag();
    canvas.setPointerCapture(event.pointerId);
    return;
  }

  if (Math.abs(x - loopEndX) <= endHitPx) {
    if (!LOCK_LOOP_END_TO_TIMELINE) {
      runtime.pendingDragUndoSnapshot = createHistorySnapshot();
      runtime.drag = {
        pointerId: event.pointerId,
        type: "loopEnd",
        startX: x,
        startTime: state.loopEndTime,
        startStartTime: state.loopStartTime,
        moved: false,
      };
      beginUiDrag();
      canvas.setPointerCapture(event.pointerId);
    }
    return;
  }

  if (clickedTime >= start && clickedTime <= end) {
    state.playheadTime = clickedTime;
    if (state.isPlaying) {
      state.transportAnchorContextTime = ensureAudioContext().currentTime;
      state.transportAnchorPlayhead = clickedTime;
      scheduleFromPlayhead(clickedTime);
    }
    render();
  }

  const clip = findClipAtPoint(x, y);
  if (!clip) {
    return;
  }

  runtime.pendingDragUndoSnapshot = createHistorySnapshot();
  runtime.drag = {
    pointerId: event.pointerId,
    type: "clip",
    clipId: clip.id,
    startX: x,
    startY: y,
    startTime: clip.startTime,
    startYNorm: clip.yNorm,
    moved: false,
  };
  beginUiDrag();
  canvas.setPointerCapture(event.pointerId);
}

function handlePointerMove(event) {
  if (!runtime.drag || runtime.drag.pointerId !== event.pointerId) {
    return;
  }
  event.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const ratio = canvas.width / rect.width;
  const x = (event.clientX - rect.left) * ratio;
  const y = (event.clientY - rect.top) * ratio;

  if (runtime.drag.type === "selectionRect") {
    runtime.drag.currentX = x;
    runtime.drag.currentY = y;
    const bounds = getSelectionBounds(runtime.drag.startX, runtime.drag.startY, x, y);
    const selectedIds = getClipsFullyInsideBounds(bounds);
    runtime.selectedClipIds = new Set(selectedIds);
    runtime.drag.moved = true;
    render();
    renderClipList();
    return;
  }

  if (runtime.drag.type === "selection") {
    const deltaX = x - runtime.drag.startX;
    const deltaY = y - runtime.drag.startY;
    const deltaTime = xToTime(deltaX, canvas.width);
    const deltaYNorm = deltaY / canvas.height;

    for (const item of runtime.drag.clips) {
      const clip = state.clips.find((entry) => entry.id === item.clipId);
      if (!clip) {
        continue;
      }
      clip.startTime = clampClipStartTime(item.startTime + deltaTime, clip.duration);
      clip.yNorm = clamp(item.startYNorm + deltaYNorm, 0, 1);
    }
    ensureTimelineCoversClips();
    runtime.drag.moved = true;
    render();
    renderClipList();
    return;
  }

  if (runtime.drag.type === "clipLoopHandle") {
    const clip = state.clips.find((item) => item.id === runtime.drag.clipId);
    if (!clip) return;
    const originalDuration = Math.max(LOOPSTACK_MIN_REGION_SECONDS, Number(clip.originalDuration) || clip.duration);
    const rawDuration = Math.max(originalDuration, xToTime(x, canvas.width) - clip.startTime);
    let nextDuration = rawDuration;

    if (state.repeatSnap && originalDuration > 0) {
      const targetCount = Math.max(1, Math.round(rawDuration / originalDuration));
      const targetDuration = targetCount * originalDuration;
      const rawX = timeToX(clip.startTime + rawDuration, canvas.width);
      const targetX = timeToX(clip.startTime + targetDuration, canvas.width);
      const deltaPx = Math.abs(rawX - targetX);

      if (!runtime.drag.snapLocked) {
        if (deltaPx <= state.repeatSnapCfg.snapPx) {
          runtime.drag.snapLocked = true;
          runtime.drag.snapTarget = targetDuration;
          nextDuration = targetDuration;
        }
      } else if (deltaPx > state.repeatSnapCfg.releasePx) {
        runtime.drag.snapLocked = false;
        runtime.drag.snapTarget = null;
      } else {
        nextDuration = runtime.drag.snapTarget || targetDuration;
      }
    }

    clip.duration = Math.max(originalDuration, nextDuration);
    clip.loopEnabled = clip.duration > originalDuration + 1e-6;
    ensureTimelineCoversClips();
    runtime.drag.moved = true;
    render();
    renderClipList();
    return;
  }

  if (runtime.drag.type === "loopStart") {
    const deltaTime = xToTime(x - runtime.drag.startX, canvas.width);
    const nextTime = clamp(
      (Number(runtime.drag.startTime) || 0) + deltaTime,
      0,
      (Number(runtime.drag.startEndTime) || state.loopEndTime) - LOOP_MIN_GAP_SECONDS
    );
    state.loopStartTime = nextTime;
    runtime.drag.moved = true;
    render();
    return;
  }

  if (runtime.drag.type === "loopEnd") {
    const deltaTime = xToTime(x - runtime.drag.startX, canvas.width);
    const nextTime = clamp(
      (Number(runtime.drag.startTime) || 0) + deltaTime,
      (Number(runtime.drag.startStartTime) || state.loopStartTime) + LOOP_MIN_GAP_SECONDS,
      state.timelineDuration
    );
    state.loopEndTime = nextTime;
    runtime.drag.moved = true;
    render();
    return;
  }

  const clip = state.clips.find((item) => item.id === runtime.drag.clipId);
  if (!clip) {
    return;
  }

  const deltaX = x - runtime.drag.startX;
  const deltaY = y - runtime.drag.startY;

  const deltaTime = xToTime(deltaX, canvas.width);
  const deltaYNorm = deltaY / canvas.height;

  clip.startTime = clampClipStartTime(runtime.drag.startTime + deltaTime, clip.duration);
  clip.yNorm = clamp(runtime.drag.startYNorm + deltaYNorm, 0, 1);
  ensureTimelineCoversClips();
  runtime.drag.moved = true;

  render();
  renderClipList();
}

async function handlePointerUp(event) {
  if (!runtime.drag || runtime.drag.pointerId !== event.pointerId) {
    return;
  }
  event.preventDefault();

  const dragType = runtime.drag.type;
  const moved = runtime.drag.moved;
  runtime.drag = null;
  endUiDrag();

  if (dragType === "selectionRect") {
    setDropHint(`SELECTED ${runtime.selectedClipIds.size} CLIPS`);
    render();
    renderClipList();
  } else if (dragType === "clipLoopHandle" && moved) {
    if (runtime.pendingDragUndoSnapshot) {
      pushUndoSnapshot(runtime.pendingDragUndoSnapshot);
    }
    setDropHint("LOOP LENGTH UPDATED");
    await rescheduleAfterDragIfNeeded();
  } else if (moved) {
    if (runtime.pendingDragUndoSnapshot) {
      pushUndoSnapshot(runtime.pendingDragUndoSnapshot);
    }
    await rescheduleAfterDragIfNeeded();
  }
  runtime.pendingDragUndoSnapshot = null;
}

function handleCanvasDoubleClick(event) {
  if (state.activeTab !== "sequencer") return;
  const rect = canvas.getBoundingClientRect();
  const ratio = canvas.width / rect.width;
  const x = (event.clientX - rect.left) * ratio;
  const y = (event.clientY - rect.top) * ratio;
  const clip = findClipAtPoint(x, y);
  if (!clip) return;
  openClipLoopPopup(clip);
}

function setupInteractions() {
  const midiBindings = [
    [retriggerInput, "lazy.xy.rhythm", "Lazy Rhythm"],
    [satDriveInput, "lazy.xy.drive", "Lazy Drive"],
    [pitchInput, "lazy.xy.tone", "Lazy Tone"],
    [satMixInput, "lazy.xy.mix", "Lazy Mix"],
    [loopstackMuteAllBtn, "lazy.loopstack.muteAll", "Lazy Loopstack Mute All"],
    [loopstackResumeAllBtn, "lazy.loopstack.resumeAll", "Lazy Loopstack Resume All"],
  ];
  for (const [el, targetId, label] of midiBindings) {
    if (!el) continue;
    el.dataset.midiTarget = targetId;
    el.dataset.midiLabel = label;
  }
  for (const fader of mixerFaders) {
    const index = sanitizeChannelId(fader.dataset.channelIndex);
    fader.dataset.midiTarget = `lazy.mixer.ch${index}`;
    fader.dataset.midiLabel = `Lazy CH${index} Fader`;
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

  tabSequencerBtn.addEventListener("click", () => {
    setActiveTab("sequencer");
  });
  tabClipListBtn.addEventListener("click", () => {
    setActiveTab("loopr");
  });

  importBtn.addEventListener("click", () => {
    fileInput.click();
  });
  loadQuenceBtn.addEventListener("click", async () => {
    const canProceed = await confirmProceedWithPotentialDataLoss("dem Laden einer .QUENCE");
    if (!canProceed) {
      return;
    }
    quenceInput.click();
  });

  playBtn.addEventListener("click", async () => {
    if (state.isPlaying) {
      stopPlayback({ keepPlayhead: true });
      updatePlayButtonUi();
      render();
      renderClipList();
      return;
    }
    await startPlayback();
  });
  if (rewindBtn) {
    rewindBtn.addEventListener("click", async () => {
      await jumpToLoopOrTimelineStart();
    });
  }

  exportLoopBtn.addEventListener("click", async () => {
    exportLoopBtn.disabled = true;
    try {
      await exportTimelineAsWav({ mode: "loop" });
    } catch {
      setDropHint("EXPORT FAILED", true);
    } finally {
      exportLoopBtn.disabled = false;
    }
  });

  exportAutomationBtn.addEventListener("click", () => {
    state.exportAutomationEnabled = !state.exportAutomationEnabled;
    updateAutomationUi();
    setDropHint(state.exportAutomationEnabled ? "EXPORT AUTO ON" : "EXPORT AUTO OFF");
  });

  saveQuenceBtn.addEventListener("click", async () => {
    saveQuenceBtn.disabled = true;
    try {
      setDropHint("SAVING .QUENCE...");
      await saveQuenceFile();
    } catch {
      setDropHint("SAVE FAILED", true);
    } finally {
      saveQuenceBtn.disabled = false;
    }
  });

  if (pasteCliplibBtn) {
    pasteCliplibBtn.addEventListener("click", () => {
      requestCliplibListFromHost();
    });
  }

  newFileBtn.addEventListener("click", async () => {
    const canProceed = await confirmProceedWithPotentialDataLoss("dem Erstellen einer neuen Datei");
    if (!canProceed) {
      return;
    }
    createNewFile();
  });

  stopBtn?.addEventListener("click", () => {
    stopPlayback({ keepPlayhead: false });
    state.playheadTime = 0;
    updatePlayButtonUi();
    render();
    renderClipList();
  });

  undoBtn.addEventListener("click", () => {
    undoLastAction();
  });

  recordAutomationBtn.addEventListener("click", async () => {
    if (state.isAudioRecording) {
      await stopAudioRecordingAndSave();
    } else {
      await startAudioRecording();
    }
  });

  recordFaderBtn.addEventListener("click", async () => {
    if (state.automation.isRecording) {
      stopAutomationRecording();
      await saveRecordedAutomationTake();
    } else {
      startAutomationRecording();
    }
  });

  clearAutomationBtn.addEventListener("click", () => {
    if (!runtime.clearAutomationArmed) {
      armClearAutomationButton();
      setDropHint("CLR ARMED (CLICK AGAIN)");
      return;
    }
    disarmClearAutomationButton();
    clearAutomationLanes();
    markUnsavedChanges();
    setDropHint("REC CLEARED");
  });

  loadAutomationBtn.addEventListener("click", () => {
    automationInput.click();
  });

  automationInput.addEventListener("change", async () => {
    const file = automationInput.files?.[0];
    automationInput.value = "";
    if (!file) return;
    try {
      await loadAutomationTakeFromFile(file);
    } catch {
      setDropHint("LOAD CLR FAILED", true);
    }
  });

  loopBtn.addEventListener("click", async () => {
    state.loopEnabled = !state.loopEnabled;
    loopBtn.setAttribute("aria-pressed", String(state.loopEnabled));
    loopBtn.textContent = `LOOP ${state.loopEnabled ? "ON" : "OFF"}`;
    await rescheduleAfterDragIfNeeded();
  });

  duplicateLoopBtn.addEventListener("click", async () => {
    duplicateLoopBtn.disabled = true;
    try {
      await duplicateLoopRegion();
    } catch {
      setDropHint("LOOP DUPLICATION FAILED", true);
    } finally {
      duplicateLoopBtn.disabled = false;
    }
  });

  if (stackToggleBtn) {
    stackToggleBtn.addEventListener("click", () => {
      setActiveTab(state.activeTab === "loopr" ? "sequencer" : "loopr");
      if (state.activeTab === "loopr") hideLoopstackToast();
    });
  }
  if (channelModeBtn) {
    channelModeBtn.addEventListener("click", () => {
      state.channelMode = false;
      updateModeButtonsUi();
      setDropHint("GROUP MODE REMOVED");
    });
  }
  if (loopModeBtn) {
    loopModeBtn.addEventListener("click", () => {
      state.loopMode = !state.loopMode;
      updateModeButtonsUi();
      render();
    });
  }
  if (repeatSnapBtn) {
    repeatSnapBtn.addEventListener("click", () => {
      state.repeatSnap = !state.repeatSnap;
      updateModeButtonsUi();
      setDropHint(state.repeatSnap ? "REPEAT SNAP ON" : "REPEAT SNAP OFF");
    });
  }
  if (flexoModeBtn) {
    flexoModeBtn.addEventListener("click", () => {
      state.timelineFlexoMode = !state.timelineFlexoMode;
      ensureTimelineCoversClips();
      updateModeButtonsUi();
      render();
      renderClipList();
      setDropHint(state.timelineFlexoMode ? "FLEXO ON" : "FLEXO OFF");
    });
  }
  if (stopTimelineBtn) {
    stopTimelineBtn.addEventListener("click", () => {
      state.timelineStopLocked = !state.timelineStopLocked;
      if (state.timelineStopLocked) {
        state.timelineStopDuration = Math.max(MIN_EMPTY_TIMELINE_SECONDS, Number(state.timelineDuration) || MIN_EMPTY_TIMELINE_SECONDS);
      }
      ensureTimelineCoversClips();
      updateModeButtonsUi();
      render();
      renderClipList();
      setDropHint(state.timelineStopLocked ? `TIMELINE LOCKED @ ${state.timelineDuration.toFixed(2)}S` : "TIMELINE UNLOCKED");
    });
  }
  if (mixToggleBtn) {
    mixToggleBtn.addEventListener("click", () => {
      state.mixer.open = !state.mixer.open;
      updateMixerUi();
    });
  }
  if (mixerCloseBtn) {
    mixerCloseBtn.addEventListener("click", () => {
      state.mixer.open = false;
      updateMixerUi();
    });
  }
  if (mixerMuteAllBtn) {
    mixerMuteAllBtn.addEventListener("click", () => {
      const shouldMute = !state.mixer.ch.every((ch) => ch.muted);
      for (const channel of state.mixer.ch) {
        channel.muted = shouldMute;
      }
      applyMasterParams();
      updateMixerUi();
    });
  }
  for (const fader of mixerFaders) {
    fader.addEventListener("input", () => {
      const index = sanitizeChannelId(fader.dataset.channelIndex);
      const db = clamp(Number(fader.value), -60, 0);
      state.mixer.ch[index].gain = dbToLinear(db);
      if (state.mixer.ch[index].muted && db > -60) {
        state.mixer.ch[index].muted = false;
      }
      applyMasterParams();
      updateMixerUi();
    });
  }
  for (const muteBtn of mixerMuteButtons) {
    muteBtn.addEventListener("click", () => {
      const index = sanitizeChannelId(muteBtn.dataset.channelIndex);
      state.mixer.ch[index].muted = !state.mixer.ch[index].muted;
      applyMasterParams();
      updateMixerUi();
    });
  }
  if (loopstackMuteAllBtn) {
    loopstackMuteAllBtn.addEventListener("click", () => {
      state.loopstack.muteAll = !state.loopstack.muteAll;
      for (const voice of state.loopstack.voices) {
        applyLoopVoiceGainState(voice);
      }
      updateLoopstackHeaderButtons();
      renderLoopstackList();
    });
  }
  if (looprPlayBtn) {
    looprPlayBtn.addEventListener("click", () => {
      void setLooprPlaybackEnabled(state.loopstack.userPaused);
    });
  }
  if (loopstackFollowBtn) {
    loopstackFollowBtn.addEventListener("click", () => {
      state.loopstack.followTransport = !state.loopstack.followTransport;
      if (!state.loopstack.followTransport && !state.isPlaying) {
        for (const voice of state.loopstack.voices) {
          if (voice.paused || voice.enabled === false) continue;
          if (voice.transportPaused) {
            startLoopVoiceNode(voice);
          }
        }
      }
      updateLoopstackHeaderButtons();
    });
  }
  if (loopstackStartModeBtn) {
    loopstackStartModeBtn.addEventListener("click", () => {
      state.loopstack.defaultStartMode = state.loopstack.defaultStartMode === "free" ? "sync" : "free";
      updateLoopstackHeaderButtons();
    });
  }
  if (loopstackResumeAllBtn) {
    loopstackResumeAllBtn.addEventListener("click", () => {
      resumeAllLoopVoices();
    });
  }
  if (loopstackClearBtn) {
    loopstackClearBtn.addEventListener("click", () => {
      if (!runtime.loopstackClearArmed) {
        armLoopstackClearButton();
        setDropHint("LOOPR CLEAR ARMED");
        return;
      }
      disarmLoopstackClearButton();
      clearAllLoopVoices();
      setDropHint("LOOPR CLEARED");
    });
  }
  if (clipLoopInInput) {
    clipLoopInInput.addEventListener("input", updateClipLoopPopupMeta);
  }
  if (clipLoopOutInput) {
    clipLoopOutInput.addEventListener("input", updateClipLoopPopupMeta);
  }
  if (clipLoopCancelBtn) {
    clipLoopCancelBtn.addEventListener("click", closeClipLoopPopup);
  }
  if (clipLoopCancelBtn2) {
    clipLoopCancelBtn2.addEventListener("click", closeClipLoopPopup);
  }
  if (clipLoopPopup) {
    clipLoopPopup.addEventListener("click", (event) => {
      if (event.target === clipLoopPopup) {
        closeClipLoopPopup();
      }
    });
  }
  if (clipLoopOnBtn) {
    clipLoopOnBtn.addEventListener("click", async () => {
      const clip = getLoopPopupClip();
      if (!clip) return;
      const undoSnapshot = createHistorySnapshot();
      const loopInSec = clamp(Number(clipLoopInInput?.value) || 0, 0, clip.duration);
      const loopOutSec = clamp(
        Number(clipLoopOutInput?.value) || clip.duration,
        loopInSec + LOOPSTACK_MIN_REGION_SECONDS,
        clip.duration
      );
      const startMode = clipLoopStartMode?.value === "sync" ? "sync" : "free";
      const afterMode = clipLoopAfterMode?.value === "keep" ? "keep" : "remove";
      const ok = await addLoopVoiceFromClip(clip, loopInSec, loopOutSec, startMode);
      if (ok) {
        if (afterMode === "remove") {
          deleteClipAndCollapseTimeline(clip);
        }
        pushUndoSnapshot(undoSnapshot);
        closeClipLoopPopup();
        setDropHint(afterMode === "remove" ? `SENT + REMOVED (${state.loopstack.voices.length})` : `LOOP ADDED (${state.loopstack.voices.length})`);
        render();
        renderClipList();
      } else {
        setDropHint("LOOP ADD FAILED", true);
      }
    });
  }
  if (loopstackToastOpenBtn) {
    loopstackToastOpenBtn.addEventListener("click", () => {
      hideLoopstackToast();
      setActiveTab("loopr");
      renderLoopstackList();
    });
  }

  if (delayKillBtn) {
    delayKillBtn.addEventListener("click", async () => {
      const undoSnapshot = createHistorySnapshot();
      state.delayEnabled = !state.delayEnabled;
      pushUndoSnapshot(undoSnapshot);
      applyMasterParams();
      updateDelayUi();
      setDropHint(state.delayEnabled ? "DELAY ON" : "DELAY OFF");
      await rescheduleAfterDragIfNeeded();
    });
  }

  if (delaySelectBtn) {
    delaySelectBtn.addEventListener("click", () => {
      runtime.delaySelectEnabled = !runtime.delaySelectEnabled;
      updateDelayUi();
      setDropHint(runtime.delaySelectEnabled ? "DELAY CLIP SELECT ON" : "DELAY CLIP SELECT OFF");
    });
  }

  toolBtn.addEventListener("click", () => {
    const currentIndex = TOOL_ORDER.indexOf(state.toolMode);
    const nextIndex = (currentIndex + 1) % TOOL_ORDER.length;
    state.toolMode = TOOL_ORDER[nextIndex];
    updateToolUi();
  });

  function applyGainInputs() {
    const undoSnapshot = createHistorySnapshot();
    let min = Number(gainMinInput.value);
    let max = Number(gainMaxInput.value);

    if (!Number.isFinite(min)) min = state.gainMinDb;
    if (!Number.isFinite(max)) max = state.gainMaxDb;

    if (min > max) {
      [min, max] = [max, min];
    }

    state.gainMinDb = min;
    state.gainMaxDb = max;
    pushUndoSnapshot(undoSnapshot);

    gainMinInput.value = String(min);
    gainMaxInput.value = String(max);

    if (state.isPlaying) {
      for (const node of runtime.playingNodes) {
        const clip = state.clips.find((item) => item.id === node.clipId);
        if (clip) {
          node.gain.gain.value = yNormToGainLinear(clip.yNorm);
        }
      }
    }

    renderClipList();
  }

  function scheduleSteppedRateUpdate(kind, sliderEl, valueEl) {
    const stepIndex = clamp(Number(sliderEl.value), 0, RATE_STEPS.length - 1);
    const rate = RATE_STEPS[stepIndex];
    valueEl.textContent = String(rate);
    pulseControlLabel(valueEl);
    syncRhythmPadCursor();
    if (runtime.steppedApplyTimers[kind]) {
      clearTimeout(runtime.steppedApplyTimers[kind]);
    }
    runtime.steppedApplyTimers[kind] = setTimeout(() => {
      const undoSnapshot = createHistorySnapshot();
      if (kind === "retrigger") {
        state.retriggerRate = rate;
        pushAutomationPoint("retriggerRate", rate);
      } else {
        state.gaterRate = rate;
        pushAutomationPoint("gaterRate", rate);
      }
      pushUndoSnapshot(undoSnapshot);
      applyRhythmLive();
      setDropHint(`${kind.toUpperCase()}: ${rate}`);
      runtime.steppedApplyTimers[kind] = null;
    }, 55);
  }

  function applySaturatorInputs() {
    const undoSnapshot = createHistorySnapshot();
    state.saturatorDrive = clamp(Number(satDriveInput.value) || 1, 1, 40);
    state.saturatorMix = clamp((Number(satMixInput.value) || 0) / 100, 0, 1);
    satDriveValue.textContent = state.saturatorDrive.toFixed(1);
    satMixValue.textContent = `${Math.round(state.saturatorMix * 100)}%`;
    pulseControlLabel(satDriveValue);
    pulseControlLabel(satMixValue);
    syncSaturatorPadCursor();
    pushAutomationPoint("saturatorDrive", state.saturatorDrive);
    pushAutomationPoint("saturatorMix", state.saturatorMix);
    pushUndoSnapshot(undoSnapshot);
    applyMasterParams();
  }

  function applyToneInputs() {
    const undoSnapshot = createHistorySnapshot();
    state.pitchSemitones = clamp(Number(pitchInput.value) || 0, -12, 12);
    state.invCutoff = clamp(Number(invCutoffInput.value) || 0, 0, 1);
    pitchValue.textContent = `${state.pitchSemitones >= 0 ? "+" : ""}${state.pitchSemitones.toFixed(1)}st`;
    invCutoffValue.textContent = `${Math.round(state.invCutoff * 100)}%`;
    syncTonePadCursor();
    pushAutomationPoint("pitchSemitones", state.pitchSemitones);
    pushAutomationPoint("invCutoff", state.invCutoff);
    pushUndoSnapshot(undoSnapshot);
    applyMasterParams();
  }

  function applyDelayInputs() {
    const undoSnapshot = createHistorySnapshot();
    state.delayTimeMs = clamp(Number(delayTimeInput.value) || 260, 20, 1200);
    state.delayFeedback = clamp((Number(delayFeedbackInput.value) || 0) / 100, 0, 0.95);
    state.delayMix = clamp((Number(delayMixInput.value) || 0) / 100, 0, 1);
    pushUndoSnapshot(undoSnapshot);
    updateDelayUi();
    applyMasterParams();
    setDropHint(
      `DELAY ${Math.round(state.delayTimeMs)}MS / ${Math.round(state.delayFeedback * 100)}% / ${Math.round(state.delayMix * 100)}%`
    );
  }

  function getPadNormFromEvent(event, padEl) {
    const rect = padEl.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const y = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    return { x, y };
  }

  function applyRhythmPadAt(normX, normY) {
    const maxIndex = RATE_STEPS.length - 1;
    const retriggerIndex = clamp(Math.round(normX * maxIndex), 0, maxIndex);
    const gaterIndex = clamp(Math.round((1 - normY) * maxIndex), 0, maxIndex);
    retriggerInput.value = String(retriggerIndex);
    gaterInput.value = String(gaterIndex);
    scheduleSteppedRateUpdate("retrigger", retriggerInput, retriggerValue);
    scheduleSteppedRateUpdate("gater", gaterInput, gaterValue);
  }

  function applySaturatorPadAt(normX, normY) {
    const drive = Math.round(1 + normX * 39);
    const mix = Math.round((1 - normY) * 100);
    satDriveInput.value = String(clamp(drive, 1, 40));
    satMixInput.value = String(clamp(mix, 0, 100));
    applySaturatorInputs();
  }

  function applyTonePadAt(normX, normY) {
    const pitch = -12 + normX * 24;
    const invCutoff = 1 - normY;
    pitchInput.value = String(clamp(pitch, -12, 12).toFixed(1));
    invCutoffInput.value = String(clamp(invCutoff, 0, 1).toFixed(2));
    applyToneInputs();
  }

  function startAutomationRecording() {
    clearAutomationLanes();
    state.automation.isRecording = true;
    const t = getCurrentPlayheadTime();
    pushAutomationPoint("retriggerRate", state.retriggerRate, t);
    pushAutomationPoint("gaterRate", state.gaterRate, t);
    pushAutomationPoint("saturatorDrive", state.saturatorDrive, t);
    pushAutomationPoint("saturatorMix", state.saturatorMix, t);
    pushAutomationPoint("pitchSemitones", state.pitchSemitones, t);
    pushAutomationPoint("invCutoff", state.invCutoff, t);
    updateAutomationUi();
    setDropHint("REC ON");
  }

  function stopAutomationRecording() {
    state.automation.isRecording = false;
    updateAutomationUi();
    setDropHint("REC OFF");
  }

  async function saveRecordedAutomationTake() {
    if (!hasAutomationData()) {
      setDropHint("NO REC DATA", true);
      return;
    }
    const payload = {
      format: "lazy-automation",
      version: 1,
      app: "lazy.seq",
      recordedAt: new Date().toISOString(),
      lanes: state.automation.lanes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseName = sanitizeFilenameBase(quenceNameInput.value) || "lazy-quenzer";
    const saveResult = await downloadBlob(blob, `${baseName}-rec-${timestamp}.lqrec`);
    if (saveResult === "cancelled") {
      setDropHint("REC SAVE CANCELLED", true);
      return;
    }
    setDropHint("REC SAVED");
  }

  function normalizeAutomationLane(rawLane, fallback) {
    if (!Array.isArray(rawLane)) return [];
    return rawLane
      .map((point) => ({
        t: clamp(Number(point?.t) || 0, 0, state.timelineDuration),
        v: Number.isFinite(Number(point?.v)) ? Number(point.v) : fallback,
      }))
      .sort((a, b) => a.t - b.t);
  }

  async function loadAutomationTakeFromFile(file) {
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || parsed.format !== "lazy-automation" || !parsed.lanes) {
      throw new Error("Invalid automation file");
    }

    const undoSnapshot = createHistorySnapshot();
    state.automation.isRecording = false;
    state.automation.lanes = {
      retriggerRate: normalizeAutomationLane(parsed.lanes.retriggerRate, 0),
      gaterRate: normalizeAutomationLane(parsed.lanes.gaterRate, 0),
      saturatorDrive: normalizeAutomationLane(parsed.lanes.saturatorDrive, 1),
      saturatorMix: normalizeAutomationLane(parsed.lanes.saturatorMix, 0),
      pitchSemitones: normalizeAutomationLane(parsed.lanes.pitchSemitones, 0),
      invCutoff: normalizeAutomationLane(parsed.lanes.invCutoff, 0),
    };
    pushUndoSnapshot(undoSnapshot);
    applyAutomationAtTime(state.playheadTime);
    applyMasterParams();
    applyRhythmLive();
    refreshAllSliderTags();
    updateAutomationUi();
    render();
    renderClipList();
    setDropHint("CLR LOADED");
  }

  gainMinInput.addEventListener("change", applyGainInputs);
  gainMaxInput.addEventListener("change", applyGainInputs);
  retriggerInput.addEventListener("input", () => {
    scheduleSteppedRateUpdate("retrigger", retriggerInput, retriggerValue);
  });
  gaterInput.addEventListener("input", () => {
    scheduleSteppedRateUpdate("gater", gaterInput, gaterValue);
  });
  satDriveInput.addEventListener("input", applySaturatorInputs);
  satMixInput.addEventListener("input", applySaturatorInputs);
  if (delayTimeInput) delayTimeInput.addEventListener("input", applyDelayInputs);
  if (delayFeedbackInput) delayFeedbackInput.addEventListener("input", applyDelayInputs);
  if (delayMixInput) delayMixInput.addEventListener("input", applyDelayInputs);
  pitchInput.addEventListener("input", applyToneInputs);
  invCutoffInput.addEventListener("input", applyToneInputs);

  if (rhythmPad) {
    rhythmPad.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      beginUiDrag();
      rhythmPad.setPointerCapture(event.pointerId);
      const norm = getPadNormFromEvent(event, rhythmPad);
      applyRhythmPadAt(norm.x, norm.y);
    });
    rhythmPad.addEventListener("pointermove", (event) => {
      event.preventDefault();
      if ((event.buttons & 1) === 0) return;
      const norm = getPadNormFromEvent(event, rhythmPad);
      applyRhythmPadAt(norm.x, norm.y);
    });
    rhythmPad.addEventListener("pointerup", endUiDrag);
    rhythmPad.addEventListener("pointercancel", endUiDrag);
  }

  if (saturatorPad) {
    saturatorPad.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      beginUiDrag();
      saturatorPad.setPointerCapture(event.pointerId);
      const norm = getPadNormFromEvent(event, saturatorPad);
      applySaturatorPadAt(norm.x, norm.y);
    });
    saturatorPad.addEventListener("pointermove", (event) => {
      event.preventDefault();
      if ((event.buttons & 1) === 0) return;
      const norm = getPadNormFromEvent(event, saturatorPad);
      applySaturatorPadAt(norm.x, norm.y);
    });
    saturatorPad.addEventListener("pointerup", endUiDrag);
    saturatorPad.addEventListener("pointercancel", endUiDrag);
  }

  if (tonePad) {
    tonePad.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      beginUiDrag();
      tonePad.setPointerCapture(event.pointerId);
      const norm = getPadNormFromEvent(event, tonePad);
      applyTonePadAt(norm.x, norm.y);
    });
    tonePad.addEventListener("pointermove", (event) => {
      event.preventDefault();
      if ((event.buttons & 1) === 0) return;
      const norm = getPadNormFromEvent(event, tonePad);
      applyTonePadAt(norm.x, norm.y);
    });
    tonePad.addEventListener("pointerup", endUiDrag);
    tonePad.addEventListener("pointercancel", endUiDrag);
  }

  fileInput.addEventListener("change", async (event) => {
    await importFiles(event.target.files);
    fileInput.value = "";
  });

  quenceInput.addEventListener("change", async (event) => {
    const [file] = Array.from(event.target.files || []);
    if (!file) {
      return;
    }
    loadQuenceBtn.disabled = true;
    try {
      setDropHint("LOADING .QUENCE...");
      await loadQuenceFromFile(file);
      runtime.undoStack = [];
      setDropHint(".QUENCE LOADED");
    } catch (error) {
      const message = error?.message ? String(error.message) : "LOAD FAILED";
      setDropHint(`LOAD FAILED: ${message}`, true);
    } finally {
      quenceInput.value = "";
      loadQuenceBtn.disabled = false;
    }
  });

  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", async (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
    await importFiles(event.dataTransfer.files);
  });

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("dblclick", handleCanvasDoubleClick);

  window.addEventListener("resize", render);
  window.addEventListener("resize", refreshAllSliderTags);

  // Prevent the browser from opening dropped files if user misses the dropzone.
  window.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  window.addEventListener("drop", (event) => {
    event.preventDefault();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && clipLoopPopup && !clipLoopPopup.classList.contains("panel-hidden")) {
      event.preventDefault();
      closeClipLoopPopup();
      return;
    }
    if ((event.code === "Space" || event.key === " ") && !event.repeat && !isTypingTarget(event.target)) {
      event.preventDefault();
      try {
        window.parent?.postMessage({ type: "DENARRATOR_GLOBAL_TOGGLE", version: 1 }, "*");
      } catch {
        void toggleStopResume();
      }
      return;
    }
    const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z";
    if (!isUndo) {
      return;
    }
    event.preventDefault();
    undoLastAction();
  });

  window.addEventListener("message", (event) => {
    const data = event?.data;
    if (!data) {
      return;
    }
    if (data.type === "SESSION_EXPORT_REQ" && data.version === 1 && event.source === window.parent) {
      void (async () => {
        const includeOnlyDirty = data?.payload?.includeOnlyDirty !== false;
        const chunk = buildLazySessionChunk(includeOnlyDirty);
        if (chunk.heavy) {
          try {
            chunk.heavy.quence = await buildLazyQuencePayload();
          } catch (error) {
            chunk.heavy = { error: String(error?.message || error || "lazy export failed") };
          }
        }
        window.parent?.postMessage(
          {
            type: "SESSION_EXPORT_RES",
            version: 1,
            payload: {
              moduleId: "lazy",
              schemaVersion: 1,
              dirty: Boolean(runtime.hasUnsavedChanges),
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
          const chunk = data?.payload?.chunk || {};
          if (chunk?.heavy?.quence) {
            await loadQuenceFromObject(chunk.heavy.quence, String(chunk?.ui?.quenceName || "session.quence"));
          } else if (chunk?.transport) {
            state.playheadTime = clamp(Number(chunk.transport.playheadSec) || 0, 0, state.timelineDuration);
            if (Number.isFinite(Number(chunk.transport.loopA))) {
              state.loopStartTime = clamp(Number(chunk.transport.loopA), 0, state.timelineDuration);
            }
            if (Number.isFinite(Number(chunk.transport.loopB))) {
              state.loopEndTime = LOCK_LOOP_END_TO_TIMELINE
                ? state.timelineDuration
                : clamp(
                  Number(chunk.transport.loopB),
                  state.loopStartTime + LOOP_MIN_GAP_SECONDS,
                  state.timelineDuration
                );
            }
            render();
          }
        } catch (error) {
          setDropHint(`SESSION IMPORT FAILED: ${String(error?.message || error)}`, true);
        }
      })();
      return;
    }
    if (data.type === "SESSION_SAVED" && data.version === 1 && event.source === window.parent) {
      markSavedState();
      setDropHint("SESSION SAVED");
      return;
    }
    if (data.type === "DENARRATOR_UNDO" && data.version === 1 && event.source === window.parent) {
      undoLastAction();
      return;
    }
    if (data.type === "DENARRATOR_GLOBAL_PLAY" && data.version === 1 && event.source === window.parent) {
      if (!state.isPlaying) {
        void globalResumeFromSnapshot();
      }
      return;
    }
    if (data.type === "DENARRATOR_GLOBAL_STOP" && data.version === 1 && event.source === window.parent) {
      if (state.isPlaying) {
        globalStopCapture();
      }
      return;
    }
    if (data.type === "GLOBAL_PLAY_CLEAR" && data.version === 1 && event.source === window.parent) {
      clearGlobalPlayTokens();
      return;
    }
    if (data.type === "UI_SQUISH_SET" && data.version === 1 && event.source === window.parent) {
      applySquishEnabled(Boolean(data?.payload?.enabled));
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
    if (data.type === "PANIC_KILL" && data.version === 1 && event.source === window.parent) {
      handlePanicKill();
      return;
    }
    if (data.type === "AUDIO_RESET_DONE" && data.version === 1 && event.source === window.parent) {
      handleAudioResetDone();
      return;
    }
    if ((data.type === "LAZY_IZER_EQ_SET" || data.type === "LAZY_IZER_GROUPS_SET") && data.version === 1 && event.source === window.parent) {
      const clean = sanitizeIzerGroupPayload(data.payload || null);
      state.izer.bandsHz = clean.bandsHz;
      state.izer.bands = clean.bands;
      applyMasterParams();
      render();
      renderClipList();
      renderLoopstackList();
      return;
    }
    if (data.type === "CLIPLIB_LIST_RES" && data.version === 1) {
      handleCliplibListResponse(data);
      return;
    }
    if (data.type === "CLIPLIB_LIST_ERR" && data.version === 1) {
      setDropHint(`CLIPLIB LIST FAILED: ${String(data.error || "ERROR")}`, true);
      return;
    }
    if (data.type === "CLIPLIB_WAV_RES" && data.version === 1) {
      const requestId = String(data.requestId || "");
      if (requestId) {
        runtime.cliplibPendingPathByRequest.delete(requestId);
      }
      void (async () => {
        try {
          await importCliplibWavBase64(data);
          setDropHint("CLIPLIB PASTED");
        } catch (error) {
          setDropHint(`CLIPLIB PASTE FAILED: ${String(error?.message || error)}`, true);
        }
      })();
      return;
    }
    if (data.type === "CLIPLIB_WAV_ERR" && data.version === 1) {
      const requestId = String(data.requestId || "");
      if (requestId) {
        runtime.cliplibPendingPathByRequest.delete(requestId);
      }
      setDropHint(`CLIPLIB READ FAILED: ${String(data.error || "ERROR")}`, true);
      return;
    }
    if (data.type === "denarrator-master-volume") {
      applyMasterOutputVolume(data.value);
      return;
    }
    if (data.type === "denarrator-master-limiter") {
      applyMasterLimiterEnabled(data.enabled);
      return;
    }
    if (data.type === "denarrator-audio-device") {
      void applyMasterOutputDevice(data.deviceId);
      return;
    }
    if (data.type === "CLIPLIB_UPDATED" && data.version === 1) {
      void (async () => {
        try {
          await importCliplibWavBase64(data);
          setDropHint(`CLIPLIB ADD: ${data.name || "I2 CLIP"}`);
        } catch (error) {
          setDropHint(`CLIPLIB ADD FAILED: ${String(error?.message || error)}`, true);
        }
      })();
      return;
    }
    if (data.type === "DENARRATOR_PANE_ACTIVE" && data.version === 1 && event.source === window.parent) {
      const isActive = Boolean(data?.payload?.active);
      if (!isActive) {
        return;
      }
      // Ensure canvas/layout is valid again after hidden pane -> visible pane switch.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          render();
          renderClipList();
          renderLoopstackList();
        });
      });
    }
  });
}

function initLoopMarkerAsset() {
  const markerImage = new Image();
  markerImage.onload = () => {
    runtime.loopMarkerImage = markerImage;
    runtime.loopMarkerImageReady = true;
    render();
  };
  markerImage.onerror = () => {
    runtime.loopMarkerImage = null;
    runtime.loopMarkerImageReady = false;
  };
  markerImage.src = "../assets/loop_bereich.svg";
}

installTactileButtons(document);
setupInteractions();
initLoopMarkerAsset();
setupMediaSessionHandlers();
updatePlayButtonUi();
retriggerInput.value = "0";
gaterInput.value = "0";
satDriveInput.value = "1";
satMixInput.value = "0";
pitchInput.value = "0";
invCutoffInput.value = "0";
retriggerValue.textContent = "0";
gaterValue.textContent = "0";
satDriveValue.textContent = "1.0";
satMixValue.textContent = "0%";
pitchValue.textContent = "+0.0st";
invCutoffValue.textContent = "0%";
updateDelayUi();
refreshAllSliderTags();
updateAutomationUi();
setActiveTab(state.activeTab);
updateToolUi();
updateModeButtonsUi();
updateMixerUi();
updateLoopstackUiVisibility();
updateLoopstackHeaderButtons();
renderLoopstackList();
hideLoopstackToast();
registerMidiTargets();
render();
renderClipList();
