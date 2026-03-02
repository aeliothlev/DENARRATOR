import { getState, setState, subscribe, undoState, hasUnsavedChanges, clearUnsavedChanges } from "./state/store.js";
import { getDomRefs } from "./ui/dom.js";
import { bindControlEvents, setRuntimePaths } from "./ui/controls.js";
import { bindTabEvents, renderTabControls, syncTabButtons } from "./ui/tabs.js";
import { bindMirrorLineDrag, renderWaveform } from "./ui/waveformView.js";
import { decodeArrayBuffer } from "./audio/io.js";
import { encodeWavBlob } from "./audio/wav.js";
import { arrayBufferToBase64, base64ToArrayBuffer } from "./utils/base64.js";

const dom = getDomRefs();
const defaultTab = String(document.body?.dataset?.defaultTab || "").trim().toUpperCase();
const moduleId = defaultTab === "ALGEBRA" ? "algebra" : "morphogo";
if (defaultTab) {
  setState({ tab: defaultTab }, { history: false, markDirty: false });
}

bindTabEvents(dom);
bindControlEvents(dom);
bindMirrorLineDrag(dom);

syncTabButtons(dom);
renderTabControls(dom);
renderWaveform(dom);

subscribe(() => {
  syncTabButtons(dom);
  renderTabControls(dom);
  renderWaveform(dom);
});

window.addEventListener("resize", () => renderWaveform(dom));

async function clipToWavBase64(clip) {
  if (!clip || !Array.isArray(clip.channels) || !clip.channels.length) return null;
  const blob = encodeWavBlob(clip.channels[0], clip.sampleRate);
  return arrayBufferToBase64(await blob.arrayBuffer());
}

function isTypingTarget(target) {
  if (!target) return false;
  const tag = String(target.tagName || "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.isContentEditable);
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

window.addEventListener("message", async (event) => {
  const data = event?.data;
  if (!data || data.version !== 1) return;
  if (event.source !== window.parent) return;
  if (data.type === "DENARRATOR_UNDO") {
    const ok = undoState();
    dom.status.textContent = ok ? "Undo." : "Nothing to undo.";
    return;
  }
  if (data.type === "DENARRATOR_GLOBAL_PLAY" || data.type === "DENARRATOR_GLOBAL_STOP") {
    return;
  }
  if (data.type === "UI_SQUISH_SET") {
    document.documentElement.classList.toggle("dn-squish", Boolean(data?.payload?.enabled));
    return;
  }
  if (data.type === "PATHS_BROADCAST") {
    setRuntimePaths(data?.payload || null);
    return;
  }
  if (data.type === "SESSION_EXPORT_REQ") {
    const includeOnlyDirty = data?.payload?.includeOnlyDirty !== false;
    const current = getState();
    const dirty = Boolean(hasUnsavedChanges());
    const chunk = {
      schemaVersion: 1,
      transport: { playheadSec: 0, loopA: 0, loopB: 0 },
      ui: { tab: current.tab },
      refs: {},
      dirty,
    };
    if (!includeOnlyDirty || dirty) {
      chunk.heavy = {
        tab: current.tab,
        reverse: { ...current.reverse },
        params: JSON.parse(JSON.stringify(current.params)),
        clipAName: current?.clips?.A?.name || "",
        clipBName: current?.clips?.B?.name || "",
        clipAWavBase64: await clipToWavBase64(current?.clips?.A),
        clipBWavBase64: await clipToWavBase64(current?.clips?.B),
      };
    }
    window.parent?.postMessage(
      {
        type: "SESSION_EXPORT_RES",
        version: 1,
        payload: { moduleId, schemaVersion: 1, dirty, chunk },
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
        const next = { ...getState() };
        if (heavy.tab) next.tab = String(heavy.tab);
        if (heavy.reverse) next.reverse = { ...next.reverse, ...heavy.reverse };
        if (heavy.params) next.params = { ...next.params, ...heavy.params };
        next.clips = { ...next.clips };
        if (heavy.clipAWavBase64) {
          next.clips.A = await decodeArrayBuffer(base64ToArrayBuffer(heavy.clipAWavBase64), heavy.clipAName || "A.wav");
        } else {
          next.clips.A = null;
        }
        if (heavy.clipBWavBase64) {
          next.clips.B = await decodeArrayBuffer(base64ToArrayBuffer(heavy.clipBWavBase64), heavy.clipBName || "B.wav");
        } else {
          next.clips.B = null;
        }
        next.renderedBridge = null;
        next.previewBridge = null;
        setState(next, { history: false, markDirty: false });
        clearUnsavedChanges();
        dom.metaA.textContent = next.clips.A ? `A: ${next.clips.A.name} | ${next.clips.A.sampleRate} Hz | ${next.clips.A.durationSec.toFixed(2)} s` : "A: no file";
        dom.metaB.textContent = next.clips.B ? `B: ${next.clips.B.name} | ${next.clips.B.sampleRate} Hz | ${next.clips.B.durationSec.toFixed(2)} s` : "B: no file";
      }
      dom.playBtn.disabled = true;
      dom.exportBtn.disabled = true;
      dom.playBtn.textContent = "Play";
      dom.status.textContent = "SESSION LOADED";
      renderWaveform(dom);
    } catch (error) {
      dom.status.textContent = `SESSION IMPORT FAILED: ${error.message || error}`;
    }
    return;
  }
  if (data.type === "SESSION_SAVED") {
    clearUnsavedChanges();
    dom.status.textContent = "SESSION SAVED";
    return;
  }
  if (data.type !== "DENARRATOR_IMPORT_CLIP") return;
  const slot = data.targetSlot === "B" ? "B" : "A";
  const wav = typeof data.wavBytesBase64 === "string" ? data.wavBytesBase64 : "";
  if (!wav) return;
  try {
    const clip = await decodeArrayBuffer(base64ToArrayBuffer(wav), data.name || `import_${slot}.wav`);
    const current = getState();
    setState({
      clips: { ...current.clips, [slot]: clip },
      reverse: { ...current.reverse, [slot]: false },
      renderedBridge: null,
    });
    if (slot === "A") {
      dom.metaA.textContent = `A: ${clip.name} | ${clip.sampleRate} Hz | ${clip.durationSec.toFixed(2)} s`;
      dom.reverseA.checked = false;
    } else {
      dom.metaB.textContent = `B: ${clip.name} | ${clip.sampleRate} Hz | ${clip.durationSec.toFixed(2)} s`;
      dom.reverseB.checked = false;
    }
    dom.playBtn.disabled = true;
    dom.exportBtn.disabled = true;
    dom.playBtn.textContent = "Play";
    dom.status.textContent = `Imported into ${slot}.`;
    renderWaveform(dom);
  } catch (error) {
    dom.status.textContent = `Import failed (${slot}): ${error.message}`;
  }
});

window.addEventListener("keydown", (event) => {
  if ((event.code === "Space" || event.key === " ") && !event.repeat && !isTypingTarget(event.target)) {
    event.preventDefault();
    window.parent?.postMessage({ type: "DENARRATOR_GLOBAL_TOGGLE", version: 1 }, "*");
    return;
  }
  const isUndo = (event.metaKey || event.ctrlKey) && String(event.key || "").toLowerCase() === "z";
  if (!isUndo || isTypingTarget(event.target)) return;
  event.preventDefault();
  const ok = undoState();
  dom.status.textContent = ok ? "Undo." : "Nothing to undo.";
});

installTactileButtons(document);
window.parent?.postMessage({ type: "PATHS_REQ", version: 1 }, "*");
