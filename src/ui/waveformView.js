import { getState, setState } from "../state/store.js";
import { getHeadWindowFromMono, getMonoChannel, getTailWindowFromMono } from "../audio/io.js";
import { resolveMirrorIndex } from "../engines/waveAlgebraEngine.js";

function resizeCanvas(canvas) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function drawLine(ctx, data, color, dashed = false) {
  if (!data || data.length < 2) return;
  const { width, height } = ctx.canvas;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash(dashed ? [6, 4] : []);
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    const idx = Math.floor((x / (width - 1)) * (data.length - 1));
    const y = height * 0.5 - data[idx] * (height * 0.42);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawFill(ctx, data, color) {
  if (!data || data.length < 2) return;
  const { width, height } = ctx.canvas;
  const mid = height * 0.5;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, mid);
  for (let x = 0; x < width; x += 1) {
    const idx = Math.floor((x / (width - 1)) * (data.length - 1));
    const y = mid - data[idx] * (height * 0.42);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, mid);
  ctx.closePath();
  ctx.fill();
}

function buildPreviewBridge(tailA, headB, durationMs, sampleRate) {
  const n = Math.max(1, Math.round((durationMs * sampleRate) / 1000));
  const out = new Float32Array(n);
  const a0 = tailA.length ? tailA[tailA.length - 1] : 0;
  const b0 = headB.length ? headB[0] : 0;
  for (let i = 0; i < n; i += 1) {
    const t = i / Math.max(1, n - 1);
    const s = t * t * (3 - 2 * t);
    out[i] = a0 * (1 - s) + b0 * s;
  }
  return out;
}

function composeWindow(tailA, bridge, headB) {
  const out = new Float32Array(tailA.length + bridge.length + headB.length);
  out.set(tailA, 0);
  out.set(bridge, tailA.length);
  out.set(headB, tailA.length + bridge.length);
  return out;
}

function stretchToLength(data, length) {
  if (!data || data.length === length) return data;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor((i / Math.max(1, length - 1)) * (data.length - 1));
    out[i] = data[idx];
  }
  return out;
}

function getMirrorOperator(algebra) {
  return (algebra?.operators || []).find((op) => op?.type === "mirror") || null;
}

function patchMirrorOperator(updater) {
  const state = getState();
  const operators = (state.params?.ALGEBRA?.operators || []).map((op) => (op?.type === "mirror" ? updater(op) : op));
  setState({
    params: {
      ALGEBRA: {
        ...state.params.ALGEBRA,
        operators,
      },
    },
    renderedBridge: null,
  }, { history: false });
}

function drawMirrorLine(ctx, length, mirrorOperator, source) {
  if (!mirrorOperator || length < 2) return;
  const t0 = resolveMirrorIndex(source || new Float32Array(length), mirrorOperator.t0Norm, Boolean(mirrorOperator.zeroSnap));
  const x = (t0 / Math.max(1, length - 1)) * ctx.canvas.width;
  ctx.strokeStyle = "rgba(120, 44, 22, 0.92)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, ctx.canvas.height);
  ctx.stroke();
}

let mirrorDragBound = false;
let mirrorDragging = false;

export function bindMirrorLineDrag(dom) {
  if (mirrorDragBound) return;
  mirrorDragBound = true;

  const handlePointer = (event) => {
    const state = getState();
    if (state.tab !== "ALGEBRA") return;
    const mirrorOperator = getMirrorOperator(state.params?.ALGEBRA);
    if (!mirrorOperator) return;

    const canvas = dom.waveformCanvas;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const t0Norm = rect.width > 1 ? x / rect.width : 0;
    patchMirrorOperator((mirror) => ({ ...mirror, t0Norm: Math.max(0, Math.min(1, t0Norm)) }));
  };

  dom.waveformCanvas.addEventListener("pointerdown", (event) => {
    mirrorDragging = true;
    dom.waveformCanvas.setPointerCapture(event.pointerId);
    handlePointer(event);
  });
  dom.waveformCanvas.addEventListener("pointermove", (event) => {
    if (!mirrorDragging) return;
    handlePointer(event);
  });
  dom.waveformCanvas.addEventListener("pointerup", () => {
    mirrorDragging = false;
  });
  dom.waveformCanvas.addEventListener("pointercancel", () => {
    mirrorDragging = false;
  });
}

function drawDirectionOverlay(ctx, n, tailLen, bridgeLen, reverse) {
  const { width, height } = ctx.canvas;
  const aEndX = (tailLen / n) * width;
  const bStartX = ((tailLen + bridgeLen) / n) * width;

  if (reverse.A) {
    ctx.fillStyle = "rgba(88, 88, 88, 0.06)";
    ctx.fillRect(0, 0, aEndX, height);
  }
  if (reverse.B) {
    ctx.fillStyle = "rgba(88, 88, 88, 0.06)";
    ctx.fillRect(bStartX, 0, width - bStartX, height);
  }

  ctx.fillStyle = "rgba(48, 46, 43, 0.72)";
  ctx.font = `${Math.max(11, Math.round(height * 0.045))}px SF Pro Text, Segoe UI, sans-serif`;
  const aDir = reverse.A ? "<- A" : "A ->";
  const bDir = reverse.B ? "<- B" : "B ->";
  ctx.fillText(aDir, 10, Math.max(16, Math.round(height * 0.08)));
  const bWidth = ctx.measureText(bDir).width;
  ctx.fillText(bDir, width - bWidth - 10, Math.max(16, Math.round(height * 0.08)));
}

function drawPlayheadOverlay(ctx) {
  const norm = Number(window.__denarratorMorphogoPlayheadNorm);
  if (!Number.isFinite(norm)) return;
  const x = Math.max(0, Math.min(ctx.canvas.width - 1, norm * (ctx.canvas.width - 1)));
  ctx.strokeStyle = "rgba(138,58,45,0.92)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 0.5, 0);
  ctx.lineTo(x + 0.5, ctx.canvas.height);
  ctx.stroke();
}

export function renderWaveform(dom) {
  const { clips, params, renderedBridge, reverse } = getState();
  const canvas = dom.waveformCanvas;
  resizeCanvas(canvas);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f8f6f1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const clipA = clips.A;
  const clipB = clips.B;
  if (getState().tab === "ALGEBRA") {
    const mirrorOperator = getMirrorOperator(params.ALGEBRA);
    const source = clipA ? getMonoChannel(clipA, reverse.A) : null;
    const transformed = renderedBridge || source;
    if (!transformed || transformed.length < 2) {
      ctx.fillStyle = "#66625b";
      ctx.font = `${Math.max(12, Math.round(canvas.height * 0.055))}px SF Pro Text, Segoe UI, sans-serif`;
      ctx.fillText("Algebra view: load A or use generator input and press Render", 20, 30);
      return;
    }

    const n = transformed.length;
    drawFill(ctx, transformed, "rgba(164, 164, 164, 0.28)");
    if (params.ALGEBRA?.overlayOriginal && source && renderedBridge) {
      drawLine(ctx, stretchToLength(source, n), "rgba(34, 34, 34, 0.5)", true);
    }
    drawLine(ctx, transformed, "rgba(34, 34, 34, 0.95)");
    drawMirrorLine(ctx, n, mirrorOperator, transformed);
    drawPlayheadOverlay(ctx);
    return;
  }

  if (!clipA && !clipB) {
    ctx.fillStyle = "#66625b";
    ctx.font = `${Math.max(12, Math.round(canvas.height * 0.055))}px SF Pro Text, Segoe UI, sans-serif`;
    ctx.fillText("Single transition view: tail(A) + bridge + head(B)", 20, 30);
    return;
  }

  const sr = clipA?.sampleRate || clipB?.sampleRate || 44100;
  const monoA = clipA ? getMonoChannel(clipA, reverse.A) : new Float32Array(0);
  const monoB = clipB ? getMonoChannel(clipB, reverse.B) : new Float32Array(0);
  const tailA = clipA ? getTailWindowFromMono(monoA, clipA.sampleRate, params.common.windowMs) : new Float32Array(0);
  const headB = clipB ? getHeadWindowFromMono(monoB, clipB.sampleRate, params.common.windowMs) : new Float32Array(0);
  const bridge = renderedBridge || buildPreviewBridge(tailA, headB, params.common.durationMs, sr);

  const result = composeWindow(tailA, bridge, headB);
  const aLayer = composeWindow(tailA, new Float32Array(bridge.length), new Float32Array(headB.length));
  const bLayer = composeWindow(new Float32Array(tailA.length), new Float32Array(bridge.length), headB);

  const n = result.length;
  drawDirectionOverlay(ctx, n, tailA.length, bridge.length, reverse);
  drawFill(ctx, result, "rgba(164, 164, 164, 0.34)");
  drawLine(ctx, stretchToLength(aLayer, n), "rgba(34, 34, 34, 0.95)");
  drawLine(ctx, stretchToLength(bLayer, n), "rgba(34, 34, 34, 0.7)", true);

  const leftX = (tailA.length / n) * canvas.width;
  const centerX = ((tailA.length + bridge.length) / n) * canvas.width;
  ctx.strokeStyle = "rgba(52, 50, 47, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX, 0);
  ctx.lineTo(leftX, canvas.height);
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, canvas.height);
  ctx.stroke();
  drawPlayheadOverlay(ctx);
}
