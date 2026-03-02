import { decodeArrayBuffer, decodeFile } from "../audio/io.js";
import { getState, setState, updateParam } from "../state/store.js";
import { encodeWavBlob } from "../audio/wav.js";
import { renderBridgeOutput } from "../render/bridgeRender.js";
import { renderWaveform } from "./waveformView.js";
import { arrayBufferToBase64, base64ToArrayBuffer } from "../utils/base64.js";
import { dialogOpenFile, getTauriInvoke, readFileBase64, saveBlobWithDialog as saveBlobWithTauriDialog } from "../utils/tauriFiles.js";

function formatClipMeta(clip) {
  return `${clip.name} | ${clip.sampleRate} Hz | ${clip.durationSec.toFixed(2)} s`;
}

function syncReverseBadges(dom) {
  const { reverse } = getState();
  dom.revBadgeA.classList.toggle("active", Boolean(reverse.A));
  dom.revBadgeB.classList.toggle("active", Boolean(reverse.B));
}

let renderCache = null;
let previewAudio = null;
let previewUrl = null;
let masterOutputVolume = 1;
let masterLimiterEnabled = false;
let selectedOutputDeviceId = "";
let masterVolumeListenerBound = false;
let previewCtx = null;
let previewSource = null;
let previewMasterGain = null;
let previewLimiter = null;
let previewLimiterGain = null;
let previewBypassGain = null;
let previewAnalyser = null;
let previewMeterData = null;
let previewMeterRaf = null;
let previewPlayToken = null;
let runtimePaths = null;
let loadDialogBusy = false;
let allowNativeFilePickerOnce = false;

export function setRuntimePaths(nextPaths) {
  runtimePaths = nextPaths && typeof nextPaths === "object" ? nextPaths : null;
}

function globalPlayStart(sourceLabel) {
  const token = `morphogo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    window.parent?.postMessage(
      {
        type: "GLOBAL_PLAY_START",
        version: 1,
        payload: { token, moduleId: "morphogo", source: sourceLabel },
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

async function saveBlobWithDialog(blob, suggestedName) {
  const tauriResult = await saveBlobWithTauriDialog(blob, {
    defaultDir: String(runtimePaths?.mater || ""),
    suggestedName,
    filters: [{ name: "WAV", extensions: ["wav"] }],
  });
  if (tauriResult === "saved" || tauriResult === "cancelled") {
    return tauriResult;
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

async function ensurePreviewOutputChain() {
  if (previewSource) return;
  const audio = getPreviewAudio();
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  previewCtx = new Ctor();
  if (previewCtx.state === "suspended") {
    await previewCtx.resume();
  }
  previewSource = previewCtx.createMediaElementSource(audio);
  previewMasterGain = previewCtx.createGain();
  previewLimiter = previewCtx.createDynamicsCompressor();
  previewLimiterGain = previewCtx.createGain();
  previewBypassGain = previewCtx.createGain();
  previewAnalyser = previewCtx.createAnalyser();
  previewAnalyser.fftSize = 1024;
  previewLimiter.threshold.value = -1;
  previewLimiter.knee.value = 0;
  previewLimiter.ratio.value = 20;
  previewLimiter.attack.value = 0.003;
  previewLimiter.release.value = 0.09;

  previewSource.connect(previewMasterGain);
  previewMasterGain.connect(previewBypassGain);
  previewBypassGain.connect(previewCtx.destination);
  previewMasterGain.connect(previewLimiter);
  previewLimiter.connect(previewLimiterGain);
  previewLimiterGain.connect(previewCtx.destination);
  previewMasterGain.connect(previewAnalyser);
  audio.volume = 1;
  applyPreviewMasterOutput();
}

function applyPreviewMasterOutput() {
  if (previewMasterGain && previewLimiterGain && previewBypassGain) {
    previewMasterGain.gain.value = masterOutputVolume;
    previewLimiterGain.gain.value = masterLimiterEnabled ? 1 : 0;
    previewBypassGain.gain.value = masterLimiterEnabled ? 0 : 1;
  } else if (previewAudio) {
    previewAudio.volume = masterOutputVolume;
  }
}

function getPreviewAudio() {
  if (!previewAudio) {
    previewAudio = new Audio();
    previewAudio.preload = "auto";
    previewAudio.volume = masterOutputVolume;
    if (selectedOutputDeviceId && typeof previewAudio.setSinkId === "function") {
      void previewAudio.setSinkId(selectedOutputDeviceId).catch(() => {});
    }
  }
  return previewAudio;
}

function clearPreviewAudio() {
  if (previewMeterRaf) {
    cancelAnimationFrame(previewMeterRaf);
    previewMeterRaf = null;
  }
  window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
  if (previewAudio) {
    previewAudio.pause();
    previewAudio.currentTime = 0;
    previewAudio.removeAttribute("src");
    previewAudio.load();
  }
  if (previewPlayToken) {
    globalPlayStop(previewPlayToken);
    previewPlayToken = null;
  }
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
}

function startPreviewMeterLoop(dom) {
  if (!previewAnalyser || !previewAudio) return;
  if (!previewMeterData || previewMeterData.length !== previewAnalyser.fftSize) {
    previewMeterData = new Uint8Array(previewAnalyser.fftSize);
  }
  const tick = () => {
    if (!previewAudio || previewAudio.paused || !previewAnalyser) {
      previewMeterRaf = null;
      window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
      return;
    }
    previewAnalyser.getByteTimeDomainData(previewMeterData);
    let peak = 0;
    for (let i = 0; i < previewMeterData.length; i += 1) {
      const v = Math.abs((previewMeterData[i] - 128) / 128);
      if (v > peak) peak = v;
    }
    const duration = Number(previewAudio.duration) || 0;
    const norm = duration > 0 ? Math.max(0, Math.min(1, (Number(previewAudio.currentTime) || 0) / duration)) : 0;
    window.__denarratorMorphogoPlayheadNorm = norm;
    renderWaveform(dom);
    window.parent?.postMessage({ type: "denarrator-meter", level: Math.max(0, Math.min(1, peak * 1.8)) }, "*");
    previewMeterRaf = requestAnimationFrame(tick);
  };
  if (previewMeterRaf) cancelAnimationFrame(previewMeterRaf);
  previewMeterRaf = requestAnimationFrame(tick);
}

async function handlePanicKill(dom) {
  clearPreviewAudio();
  if (previewCtx) {
    try {
      await previewCtx.close();
    } catch {
      // Ignore close errors.
    }
  }
  previewCtx = null;
  previewSource = null;
  previewMasterGain = null;
  previewLimiter = null;
  previewLimiterGain = null;
  previewBypassGain = null;
  dom.playBtn.textContent = "Play";
  dom.playBtn.setAttribute("aria-pressed", "false");
  dom.status.textContent = "PANIC KILL";
}

async function handleFile(dom, side, file) {
  if (!file) return;
  dom.status.textContent = `Loading ${side}...`;
  try {
    const clip = await decodeFile(file);
    const state = getState();
    setState({
      clips: { ...state.clips, [side]: clip },
      reverse: { ...state.reverse, [side]: false },
      renderedBridge: null,
    });
    renderCache = null;
    clearPreviewAudio();
    dom.playBtn.disabled = true;
    dom.exportBtn.disabled = true;
    dom.playBtn.textContent = "Play";
    dom.playBtn.setAttribute("aria-pressed", "false");
    if (side === "A") dom.reverseA.checked = false;
    if (side === "B") dom.reverseB.checked = false;
    syncReverseBadges(dom);
    if (side === "A") dom.metaA.textContent = `A: ${formatClipMeta(clip)}`;
    if (side === "B") dom.metaB.textContent = `B: ${formatClipMeta(clip)}`;
    dom.status.textContent = "Ready. Adjust parameters and render.";
    renderWaveform(dom);
  } catch (error) {
    dom.status.textContent = `Failed to decode ${side}: ${error.message}`;
  }
}

async function openAudioClipViaDialog() {
  if (loadDialogBusy) return null;
  loadDialogBusy = true;
  if (!getTauriInvoke()) {
    loadDialogBusy = false;
    return null;
  }
  try {
    const path = await dialogOpenFile({
      defaultDir: String(runtimePaths?.mater || ""),
      filters: [{ name: "Audio", extensions: ["wav", "aif", "aiff", "mp3", "ogg", "flac"] }],
    });
    if (!path) return null;
    const base64 = await readFileBase64(path);
    if (!base64) return null;
    const fileName = String(path).split(/[\\/]/).pop() || "audio.wav";
    return await decodeArrayBuffer(base64ToArrayBuffer(String(base64)), fileName);
  } catch {
    return null;
  } finally {
    loadDialogBusy = false;
  }
}

async function handleClipObject(dom, side, clip) {
  if (!clip) return;
  dom.status.textContent = `Loading ${side}...`;
  try {
    const state = getState();
    setState({
      clips: { ...state.clips, [side]: clip },
      reverse: { ...state.reverse, [side]: false },
      renderedBridge: null,
    });
    renderCache = null;
    clearPreviewAudio();
    dom.playBtn.disabled = true;
    dom.exportBtn.disabled = true;
    dom.playBtn.textContent = "Play";
    dom.playBtn.setAttribute("aria-pressed", "false");
    if (side === "A") dom.reverseA.checked = false;
    if (side === "B") dom.reverseB.checked = false;
    syncReverseBadges(dom);
    if (side === "A") dom.metaA.textContent = `A: ${formatClipMeta(clip)}`;
    if (side === "B") dom.metaB.textContent = `B: ${formatClipMeta(clip)}`;
    dom.status.textContent = "Ready. Adjust parameters and render.";
    renderWaveform(dom);
  } catch (error) {
    dom.status.textContent = `Failed to decode ${side}: ${error.message}`;
  }
}

export function bindControlEvents(dom) {
  dom.loopPreview.checked = Boolean(getState().params.common.loopPreview);
  dom.minLevelDb.value = String(getState().params.common.minLevelDb);
  dom.minLevelDbOut.textContent = `${getState().params.common.minLevelDb} dB`;
  syncReverseBadges(dom);

  if (!masterVolumeListenerBound) {
    window.addEventListener("message", (event) => {
      const data = event?.data;
      if (data?.type === "PANIC_KILL" && data?.version === 1 && event.source === window.parent) {
        void handlePanicKill(dom);
        return;
      }
      if (data?.type === "AUDIO_RESET_DONE" && data?.version === 1 && event.source === window.parent) {
        dom.status.textContent = "AUDIO RESET READY";
        return;
      }
      if (!data || data.type !== "denarrator-master-volume") return;
      const next = Number(data.value);
      if (!Number.isFinite(next)) return;
      masterOutputVolume = Math.max(0, Math.min(1, next));
      applyPreviewMasterOutput();
      return;
    });
    window.addEventListener("message", (event) => {
      const data = event?.data;
      if (!data || data.type !== "denarrator-master-limiter") return;
      masterLimiterEnabled = Boolean(data.enabled);
      applyPreviewMasterOutput();
      if (masterLimiterEnabled) {
        void ensurePreviewOutputChain();
      }
    });
    window.addEventListener("message", (event) => {
      const data = event?.data;
      if (!data || data.type !== "denarrator-audio-device") return;
      selectedOutputDeviceId = String(data.deviceId || "");
      if (previewAudio && typeof previewAudio.setSinkId === "function") {
        void previewAudio.setSinkId(selectedOutputDeviceId).catch(() => {});
      }
    });
    window.addEventListener("message", (event) => {
      const data = event?.data;
      if (!data || event.source !== window.parent) return;
      if (data.type === "DENARRATOR_GLOBAL_PLAY" && data.version === 1) {
        if (previewAudio && previewAudio.paused && !dom.playBtn.disabled) {
          dom.playBtn.click();
        }
        return;
      }
      if (data.type === "DENARRATOR_GLOBAL_STOP" && data.version === 1) {
        if (previewAudio && !previewAudio.paused && !dom.playBtn.disabled) {
          dom.playBtn.click();
        } else {
          if (previewPlayToken) {
            globalPlayStop(previewPlayToken);
            previewPlayToken = null;
          }
          if (previewMeterRaf) {
            cancelAnimationFrame(previewMeterRaf);
            previewMeterRaf = null;
          }
          window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
          dom.playBtn.textContent = "Play";
          dom.playBtn.setAttribute("aria-pressed", "false");
          renderWaveform(dom);
        }
        return;
      }
      if (data.type === "GLOBAL_PLAY_CLEAR" && data.version === 1) {
        if (previewPlayToken) {
          globalPlayStop(previewPlayToken);
          previewPlayToken = null;
        }
        return;
      }
      if (data.type === "UI_SQUISH_SET" && data.version === 1) {
        document.documentElement.classList.toggle("dn-squish", Boolean(data?.payload?.enabled));
      }
    });
    masterVolumeListenerBound = true;
  }

  dom.fileA.addEventListener("change", (e) => handleFile(dom, "A", e.target.files?.[0]));
  dom.fileB.addEventListener("change", (e) => handleFile(dom, "B", e.target.files?.[0]));
  const bindDialogLoad = (inputEl, side) => {
    if (!inputEl) return;
    const opener = (event) => {
      if (allowNativeFilePickerOnce && event.currentTarget === inputEl) {
        allowNativeFilePickerOnce = false;
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      void (async () => {
        // If Tauri dialog is unavailable, allow native picker fallback.
        if (!getTauriInvoke()) {
          allowNativeFilePickerOnce = true;
          inputEl.click();
          return;
        }
        const clip = await openAudioClipViaDialog();
        if (!clip) return;
        inputEl.value = "";
        await handleClipObject(dom, side, clip);
      })();
    };
    // Handle clicks on the hidden input itself.
    inputEl.addEventListener("click", opener);
    // Handle clicks on the visual label button (primary path in Morphogo/Algebra).
    const labelEl = inputEl.closest("label");
    if (labelEl) {
      labelEl.addEventListener("click", opener);
    }
  };
  bindDialogLoad(dom.fileA, "A");
  bindDialogLoad(dom.fileB, "B");
  if (dom.swapABBtn) {
    dom.swapABBtn.addEventListener("click", () => {
      const state = getState();
      setState({
        clips: { A: state.clips.B, B: state.clips.A },
        reverse: { A: Boolean(state.reverse.B), B: Boolean(state.reverse.A) },
        renderedBridge: null,
      });
      dom.reverseA.checked = Boolean(state.reverse.B);
      dom.reverseB.checked = Boolean(state.reverse.A);
      const a = state.clips.B;
      const b = state.clips.A;
      dom.metaA.textContent = a ? `A: ${formatClipMeta(a)}` : "A: no file";
      dom.metaB.textContent = b ? `B: ${formatClipMeta(b)}` : "B: no file";
      renderCache = null;
      clearPreviewAudio();
      dom.playBtn.disabled = true;
      dom.exportBtn.disabled = true;
      dom.playBtn.textContent = "Play";
      dom.playBtn.setAttribute("aria-pressed", "false");
      dom.status.textContent = "Swapped A/B.";
      renderWaveform(dom);
      syncReverseBadges(dom);
    });
  }
  dom.reverseA.addEventListener("change", (e) => {
    const state = getState();
    setState({
      reverse: { ...state.reverse, A: e.target.checked },
      renderedBridge: null,
    });
    renderCache = null;
    clearPreviewAudio();
    dom.playBtn.disabled = true;
    dom.exportBtn.disabled = true;
    dom.playBtn.textContent = "Play";
    dom.playBtn.setAttribute("aria-pressed", "false");
    dom.status.textContent = "Reverse A updated. Render again.";
    syncReverseBadges(dom);
    renderWaveform(dom);
  });
  dom.reverseB.addEventListener("change", (e) => {
    const state = getState();
    setState({
      reverse: { ...state.reverse, B: e.target.checked },
      renderedBridge: null,
    });
    renderCache = null;
    clearPreviewAudio();
    dom.playBtn.disabled = true;
    dom.exportBtn.disabled = true;
    dom.playBtn.textContent = "Play";
    dom.playBtn.setAttribute("aria-pressed", "false");
    dom.status.textContent = "Reverse B updated. Render again.";
    syncReverseBadges(dom);
    renderWaveform(dom);
  });

  dom.windowMs.addEventListener("input", (e) => {
    const v = Number(e.target.value);
    updateParam("common", "windowMs", v);
    dom.windowMsOut.textContent = `${v} ms`;
    renderWaveform(dom);
  });

  dom.durationMs.addEventListener("input", (e) => {
    const v = Number(e.target.value);
    updateParam("common", "durationMs", v);
    dom.durationMsOut.textContent = `${v} ms`;
    renderWaveform(dom);
  });

  dom.minLevelDb.addEventListener("input", (e) => {
    const v = Number(e.target.value);
    updateParam("common", "minLevelDb", v);
    dom.minLevelDbOut.textContent = `${v} dB`;
    renderCache = null;
    clearPreviewAudio();
    setState({ renderedBridge: null });
    dom.playBtn.disabled = true;
    dom.exportBtn.disabled = true;
    dom.playBtn.textContent = "Play";
    dom.playBtn.setAttribute("aria-pressed", "false");
    dom.status.textContent = "Min Level updated. Render again.";
    renderWaveform(dom);
  });

  dom.exportMode.addEventListener("change", (e) => {
    updateParam("common", "exportMode", e.target.value);
  });

  dom.loopPreview.addEventListener("change", (e) => {
    const enabled = e.target.checked;
    updateParam("common", "loopPreview", enabled);
    if (previewAudio) previewAudio.loop = enabled;
  });

  dom.renderBtn.addEventListener("click", async () => {
    try {
      const result = renderBridgeOutput(getState());
      renderCache = result;
      clearPreviewAudio();
      const renderBlob = encodeWavBlob(result.output, result.sampleRate);
      previewUrl = URL.createObjectURL(renderBlob);
      previewAudio = getPreviewAudio();
      previewAudio.src = previewUrl;
      previewAudio.loop = Boolean(getState().params.common.loopPreview);
      previewAudio.onended = () => {
        if (previewMeterRaf) {
          cancelAnimationFrame(previewMeterRaf);
          previewMeterRaf = null;
        }
        window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
        if (!previewAudio.loop) {
          window.__denarratorMorphogoPlayheadNorm = 0;
          if (previewPlayToken) {
            globalPlayStop(previewPlayToken);
            previewPlayToken = null;
          }
          dom.playBtn.textContent = "Play";
          dom.playBtn.setAttribute("aria-pressed", "false");
          renderWaveform(dom);
        }
      };

      setState({ renderedBridge: result.bridge });
      dom.playBtn.disabled = false;
      dom.exportBtn.disabled = false;
      dom.playBtn.textContent = "Play";
      dom.playBtn.setAttribute("aria-pressed", "false");
      try {
          const invoke = getTauriInvoke();
        if (invoke) {
          const moduleId = (String(document.body?.dataset?.defaultTab || "").toUpperCase() === "ALGEBRA") ? "algebra" : "morphogo";
          const wavBytesBase64 = arrayBufferToBase64(await renderBlob.arrayBuffer());
          await invoke("write_temp_wav", { moduleId, wavBytesBase64 });
        }
      } catch {}
      dom.status.textContent = `RENDER DONE: TEMP READY (${result.output.length} samples @ ${result.sampleRate} Hz).`;
      renderWaveform(dom);
    } catch (error) {
      dom.status.textContent = `Render failed: ${error.message}`;
    }
  });

  dom.playBtn.addEventListener("click", async () => {
    if (!previewAudio) return;
    await ensurePreviewOutputChain();
    if (previewCtx && previewCtx.state === "suspended") {
      await previewCtx.resume();
    }
    if (previewAudio.paused) {
      await previewAudio.play();
      if (!previewPlayToken) previewPlayToken = globalPlayStart("preview");
      startPreviewMeterLoop(dom);
      dom.playBtn.textContent = "Pause";
      dom.playBtn.setAttribute("aria-pressed", "true");
    } else {
      previewAudio.pause();
      window.__denarratorMorphogoPlayheadNorm = Math.max(0, Math.min(1, Number(previewAudio.currentTime || 0) / Math.max(Number(previewAudio.duration) || 1, 1e-6)));
      if (previewPlayToken) {
        globalPlayStop(previewPlayToken);
        previewPlayToken = null;
      }
      if (previewMeterRaf) {
        cancelAnimationFrame(previewMeterRaf);
        previewMeterRaf = null;
      }
      window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
      dom.playBtn.textContent = "Play";
      dom.playBtn.setAttribute("aria-pressed", "false");
      renderWaveform(dom);
    }
  });

  dom.exportBtn.addEventListener("click", async () => {
    if (!renderCache) return;
    const blob = encodeWavBlob(renderCache.output, renderCache.sampleRate);
    const suffix = getState().params.common.exportMode === "bridge_only" ? "bridge" : "full";
    const filename = `morphogo_${suffix}_${Date.now()}.wav`;
    const result = await saveBlobWithDialog(blob, filename);
    dom.status.textContent = result === "saved" ? "WAV exported." : "Export cancelled.";
  });
}
