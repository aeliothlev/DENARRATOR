const listeners = new Set();
const history = [];
const HISTORY_LIMIT = 10;
let restoring = false;
let unsavedChanges = false;

export const initialState = {
  tab: "ALIGN",
  clips: {
    A: null,
    B: null,
  },
  reverse: {
    A: false,
    B: false,
  },
  previewBridge: null,
  renderedBridge: null,
  params: {
    common: {
      windowMs: 120,
      durationMs: 300,
      minLevelDb: -24,
      exportMode: "bridge_only",
      loopPreview: false,
    },
    ALIGN: {
      searchRangeMs: 20,
      smoothness: 0.5,
    },
    SPECTRAL: {
      tilt: 0,
      transientProtect: 0.6,
    },
    MACHINE: {
      partials: 48,
      noiseMix: 0.25,
    },
    ALGEBRA: {
      inputMode: "clipA",
      generator: {
        frequency: 220,
        lengthMs: 1200,
        seed: 1,
      },
      overlayOriginal: true,
      operators: [
        { type: "power", enabled: true, param: { value: 1.5, source: "constant" } },
        { type: "saturation", enabled: true, param: { value: 1.2, source: "constant" } },
        { type: "selfInteraction", enabled: false, param: { value: 0.35, source: "constant" } },
        { type: "globalMatrix", enabled: false, param: { value: 0.05, source: "constant" } },
        { type: "permutation", enabled: false, mode: "identity", seed: 13 },
        { type: "timeStretch", enabled: false, param: { value: 1, source: "constant" } },
        {
          type: "mirror",
          enabled: false,
          mode: "mirror1",
          t0Norm: 0.5,
          zeroSnap: false,
          mirror1: {
            mode: "replace",
            crossfade: 0.06,
            blend: 1,
            side: "left-right",
          },
          mirror2: {
            projectionWidth: 0.35,
            envelopeSmoothness: 64,
            intensity: 1,
            normalizeA: true,
            signedMorphology: false,
            reverseMorphology: false,
          },
        },
      ],
    },
  },
};

let state = structuredClone(initialState);

function notify() {
  for (const listener of listeners) listener(state);
}

function pushHistorySnapshot() {
  if (restoring) return;
  history.push(structuredClone(state));
  if (history.length > HISTORY_LIMIT) {
    history.splice(0, history.length - HISTORY_LIMIT);
  }
}

export function getState() {
  return state;
}

export function setState(update, options = {}) {
  if (options.history !== false) {
    pushHistorySnapshot();
  }
  if (options.markDirty !== false) {
    unsavedChanges = true;
  }
  state = {
    ...state,
    ...update,
    params: {
      ...state.params,
      ...(update.params || {}),
    },
  };
  notify();
}

export function updateParam(group, key, value, options = {}) {
  if (options.history !== false) {
    pushHistorySnapshot();
  }
  if (options.markDirty !== false) {
    unsavedChanges = true;
  }
  state = {
    ...state,
    params: {
      ...state.params,
      [group]: {
        ...state.params[group],
        [key]: value,
      },
    },
  };
  notify();
}

export function undoState() {
  const previous = history.pop();
  if (!previous) return false;
  restoring = true;
  state = previous;
  restoring = false;
  unsavedChanges = true;
  notify();
  return true;
}

export function hasUnsavedChanges() {
  return unsavedChanges;
}

export function clearUnsavedChanges() {
  unsavedChanges = false;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
