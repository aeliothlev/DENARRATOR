const refs = {
  view: document.getElementById('view'),
  persist: document.getElementById('persist'),
  hud: document.getElementById('hud'),
};

const PALETTE = {
  bg: '#f6f3ea',
  panel: '#f3efe5',
  grid: '#8f9192',
  fg: '#2f3132',
  cyan: '#3b3f41',
  magenta: '#676b6e',
  warn: '#8a3a2d',
};

const state = {
  persist: 0.7,
  frame: { timeL: [], timeR: [], freq: [], rms: 0, peak: 0, corr: 0 },
  spectrogramCols: [],
  rmsHistory: [],
  peakHistory: [],
  corrHistory: [],
};

function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

function postToHost(type, payload = {}) {
  window.parent?.postMessage({ type, version: 1, payload }, '*');
}

function panelRects(w, h) {
  const cols = 3;
  const rows = 2;
  const gap = Math.max(6, Math.floor(Math.min(w, h) * 0.008));
  const px = gap;
  const py = gap;
  const cw = Math.floor((w - px * (cols + 1)) / cols);
  const ch = Math.floor((h - py * (rows + 1)) / rows);
  const rects = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      rects.push({ x: px + c * (cw + px), y: py + r * (ch + py), w: cw, h: ch });
    }
  }
  return rects;
}

function drawPanelFrame(ctx, rect, title) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  ctx.fillStyle = PALETTE.fg;
  ctx.font = '11px Engebrechtre, Avenir Next, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(title, rect.x + 8, rect.y + 6);
}

function drawScope(ctx, rect, timeL, timeR) {
  const inset = 12;
  const x0 = rect.x + inset;
  const y0 = rect.y + 24;
  const w = Math.max(1, rect.w - inset * 2);
  const h = Math.max(1, rect.h - 30);

  ctx.strokeStyle = PALETTE.grid;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + h * 0.5);
  ctx.lineTo(x0 + w, y0 + h * 0.5);
  ctx.stroke();

  ctx.lineWidth = 1.25;
  ctx.strokeStyle = PALETTE.cyan;
  ctx.beginPath();
  for (let i = 0; i < timeL.length; i += 1) {
    const x = x0 + (i / Math.max(1, timeL.length - 1)) * w;
    const y = y0 + (0.5 - clamp(timeL[i] || 0, -1, 1) * 0.42) * h;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = PALETTE.magenta;
  ctx.beginPath();
  for (let i = 0; i < timeR.length; i += 1) {
    const x = x0 + (i / Math.max(1, timeR.length - 1)) * w;
    const y = y0 + (0.5 - clamp(timeR[i] || 0, -1, 1) * 0.42) * h;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawSpectrum(ctx, rect, freq) {
  const inset = 12;
  const x0 = rect.x + inset;
  const y0 = rect.y + 24;
  const w = Math.max(1, rect.w - inset * 2);
  const h = Math.max(1, rect.h - 30);

  ctx.strokeStyle = PALETTE.warn;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  for (let i = 0; i < freq.length; i += 1) {
    const x = x0 + (i / Math.max(1, freq.length - 1)) * w;
    const y = y0 + (1 - clamp(freq[i] || 0, 0, 1) * 0.95) * h;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawSpectrogram(ctx, rect, freq) {
  const inset = 12;
  const x0 = rect.x + inset;
  const y0 = rect.y + 24;
  const w = Math.max(1, rect.w - inset * 2);
  const h = Math.max(1, rect.h - 30);

  const col = new Uint8ClampedArray(h * 4);
  for (let y = 0; y < h; y += 1) {
    const fi = Math.floor((1 - (y / Math.max(1, h - 1))) * Math.max(0, freq.length - 1));
    const v = clamp(freq[fi] || 0, 0, 1);
    const base = Math.floor(238 - v * 130);
    const accent = Math.floor(50 + v * 90);
    const o = y * 4;
    col[o] = clamp(base + Math.floor(v * 25), 0, 255);
    col[o + 1] = clamp(base - 8, 0, 255);
    col[o + 2] = clamp(base - 16, 0, 255);
    if (v > 0.78) {
      col[o] = clamp(120 + accent, 0, 255);
      col[o + 1] = clamp(75 + Math.floor(v * 35), 0, 255);
      col[o + 2] = clamp(60 + Math.floor(v * 20), 0, 255);
    }
    col[o + 3] = 255;
  }
  state.spectrogramCols.push(col);
  if (state.spectrogramCols.length > w) state.spectrogramCols.splice(0, state.spectrogramCols.length - w);

  const img = ctx.createImageData(w, h);
  const start = Math.max(0, w - state.spectrogramCols.length);
  for (let x = 0; x < state.spectrogramCols.length; x += 1) {
    const c = state.spectrogramCols[x];
    for (let y = 0; y < h; y += 1) {
      const si = y * 4;
      const di = ((y * w) + (start + x)) * 4;
      img.data[di] = c[si];
      img.data[di + 1] = c[si + 1];
      img.data[di + 2] = c[si + 2];
      img.data[di + 3] = 255;
    }
  }
  ctx.putImageData(img, x0, y0);
}

function drawVectorscope(ctx, rect, timeL, timeR, corr) {
  const inset = 12;
  const x0 = rect.x + inset;
  const y0 = rect.y + 24;
  const w = Math.max(1, rect.w - inset * 2);
  const h = Math.max(1, rect.h - 30);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();

  ctx.strokeStyle = PALETTE.grid;
  ctx.beginPath();
  ctx.moveTo(x0 + w * 0.5, y0);
  ctx.lineTo(x0 + w * 0.5, y0 + h);
  ctx.moveTo(x0, y0 + h * 0.5);
  ctx.lineTo(x0 + w, y0 + h * 0.5);
  ctx.stroke();

  ctx.strokeStyle = PALETTE.fg;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const n = Math.min(timeL.length, timeR.length);
  for (let i = 0; i < n; i += 2) {
    const px = x0 + (0.5 + clamp(timeL[i] || 0, -1, 1) * 0.45) * w;
    const py = y0 + (0.5 - clamp(timeR[i] || 0, -1, 1) * 0.45) * h;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = PALETTE.warn;
  ctx.font = '10px Engebrechtre, Avenir Next, sans-serif';
  ctx.fillText(`corr ${corr.toFixed(2)}`, x0 + 6, y0 + 6);
}

function pushHistory(list, value, maxLen) {
  list.push(value);
  if (list.length > maxLen) list.splice(0, list.length - maxLen);
}

function drawDynamics(ctx, rect, rms, peak) {
  const inset = 12;
  const x0 = rect.x + inset;
  const y0 = rect.y + 24;
  const w = Math.max(1, rect.w - inset * 2);
  const h = Math.max(1, rect.h - 30);

  pushHistory(state.rmsHistory, rms, w);
  pushHistory(state.peakHistory, peak, w);

  ctx.strokeStyle = PALETTE.grid;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + h);
  ctx.lineTo(x0 + w, y0 + h);
  ctx.moveTo(x0, y0 + h * 0.5);
  ctx.lineTo(x0 + w, y0 + h * 0.5);
  ctx.stroke();

  ctx.strokeStyle = PALETTE.cyan;
  ctx.beginPath();
  for (let i = 0; i < state.rmsHistory.length; i += 1) {
    const x = x0 + i;
    const y = y0 + (1 - clamp(state.rmsHistory[i], 0, 1)) * h;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = PALETTE.warn;
  ctx.beginPath();
  for (let i = 0; i < state.peakHistory.length; i += 1) {
    const x = x0 + i;
    const y = y0 + (1 - clamp(state.peakHistory[i], 0, 1)) * h;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawCorrelation(ctx, rect, corr) {
  const inset = 12;
  const x0 = rect.x + inset;
  const y0 = rect.y + 24;
  const w = Math.max(1, rect.w - inset * 2);
  const h = Math.max(1, rect.h - 30);

  pushHistory(state.corrHistory, corr, w);

  ctx.strokeStyle = PALETTE.grid;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + h * 0.5);
  ctx.lineTo(x0 + w, y0 + h * 0.5);
  ctx.stroke();

  ctx.strokeStyle = PALETTE.magenta;
  ctx.beginPath();
  for (let i = 0; i < state.corrHistory.length; i += 1) {
    const x = x0 + i;
    const y = y0 + (0.5 - clamp(state.corrHistory[i], -1, 1) * 0.45) * h;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const meterW = Math.max(24, Math.floor(w * 0.08));
  const meterX = x0 + w - meterW - 4;
  ctx.fillStyle = '#d8d3c8';
  ctx.fillRect(meterX, y0 + 4, meterW, h - 8);
  const fillH = Math.floor(((clamp(corr, -1, 1) + 1) / 2) * (h - 8));
  ctx.fillStyle = PALETTE.warn;
  ctx.fillRect(meterX, y0 + h - 4 - fillH, meterW, fillH);
  ctx.fillStyle = PALETTE.fg;
  ctx.font = '10px Engebrechtre, Avenir Next, sans-serif';
  ctx.fillText(corr.toFixed(2), x0 + 6, y0 + 6);
}

function draw() {
  const canvas = refs.view;
  const ctx = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.floor(canvas.clientWidth * ratio));
  const h = Math.max(1, Math.floor(canvas.clientHeight * ratio));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  const fade = 1 - state.persist;
  ctx.fillStyle = `rgba(18,20,18,${clamp(0.12 + fade * 0.35, 0.12, 0.55)})`;
  ctx.fillRect(0, 0, w, h);

  const rects = panelRects(w, h);
  const frame = state.frame;
  const timeL = frame.timeL;
  const timeR = frame.timeR;
  const freq = frame.freq;

  drawPanelFrame(ctx, rects[0], 'Scope');
  drawScope(ctx, rects[0], timeL, timeR);

  drawPanelFrame(ctx, rects[1], 'Spectrum');
  drawSpectrum(ctx, rects[1], freq);

  drawPanelFrame(ctx, rects[2], 'Spectrogram');
  drawSpectrogram(ctx, rects[2], freq);

  drawPanelFrame(ctx, rects[3], 'Vectorscope');
  drawVectorscope(ctx, rects[3], timeL, timeR, frame.corr);

  drawPanelFrame(ctx, rects[4], 'Dynamics RMS/Peak');
  drawDynamics(ctx, rects[4], frame.rms, frame.peak);

  drawPanelFrame(ctx, rects[5], 'Correlation');
  drawCorrelation(ctx, rects[5], frame.corr);

  refs.hud.textContent = `RMS ${frame.rms.toFixed(2)} | PEAK ${frame.peak.toFixed(2)} | CORR ${frame.corr.toFixed(2)}`;
  requestAnimationFrame(draw);
}

function bind() {
  refs.persist.addEventListener('change', () => {
    state.persist = clamp(Number(refs.persist.value) || 0.7, 0.1, 0.95);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) postToHost('NUKLEAR_UNSUBSCRIBE', {});
    else postToHost('NUKLEAR_SUBSCRIBE', { fps: 30, fftSize: 512 });
  });

  window.addEventListener('beforeunload', () => {
    postToHost('NUKLEAR_UNSUBSCRIBE', {});
  });

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.version !== 1) return;
    if (data.type === 'NUKLEAR_FRAME') {
      const p = data.payload || {};
      state.frame.timeL = Array.isArray(p.timeL) ? p.timeL : [];
      state.frame.timeR = Array.isArray(p.timeR) ? p.timeR : [];
      state.frame.freq = Array.isArray(p.freq) ? p.freq : [];
      state.frame.rms = Number(p.rms) || 0;
      state.frame.peak = Number(p.peak) || 0;
      state.frame.corr = Number(p.corr) || 0;
      return;
    }
    if (data.type === 'SESSION_EXPORT_REQ') {
      const chunk = {
        schemaVersion: 1,
        transport: { playheadSec: 0, loopA: 0, loopB: 0 },
        ui: {},
        refs: {},
        dirty: false,
        heavy: { persist: state.persist },
      };
      window.parent?.postMessage({
        type: 'SESSION_EXPORT_RES',
        version: 1,
        payload: { moduleId: 'nuklear', schemaVersion: 1, dirty: false, chunk },
      }, '*');
      return;
    }
    if (data.type === 'SESSION_IMPORT') {
      const heavy = data?.payload?.chunk?.heavy || {};
      state.persist = clamp(Number(heavy.persist) || state.persist, 0.1, 0.95);
      refs.persist.value = String(state.persist);
    }
  });
}

bind();
postToHost('NUKLEAR_SUBSCRIBE', { fps: 30, fftSize: 512 });
requestAnimationFrame(draw);
