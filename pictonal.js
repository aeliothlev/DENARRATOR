const refs = {
  clipCount: document.getElementById("clipCount"),
  loadImgBtn: document.getElementById("loadImgBtn"),
  imgInput: document.getElementById("imgInput"),
  renderBtn: document.getElementById("renderBtn"),
  playBtn: document.getElementById("playBtn"),
  loopBtn: document.getElementById("loopBtn"),
  saveBtn: document.getElementById("saveBtn"),
  sendBtn: document.getElementById("sendBtn"),
  modeSel: document.getElementById("modeSel"),
  durationInput: document.getElementById("durationInput"),
  durationVal: document.getElementById("durationVal"),
  smoothInput: document.getElementById("smoothInput"),
  smoothVal: document.getElementById("smoothVal"),
  normalizeBtn: document.getElementById("normalizeBtn"),
  fftSel: document.getElementById("fftSel"),
  overrideBtn: document.getElementById("overrideBtn"),
  presetSel: document.getElementById("presetSel"),
  presetApplyBtn: document.getElementById("presetApplyBtn"),
  drawGridCanvas: document.getElementById("drawGridCanvas"),
  gridSourceSel: document.getElementById("gridSourceSel"),
  gridComposeSel: document.getElementById("gridComposeSel"),
  gridAmountInput: document.getElementById("gridAmountInput"),
  gridAmountVal: document.getElementById("gridAmountVal"),
  gridMapSel: document.getElementById("gridMapSel"),
  gridPaletteModeSel: document.getElementById("gridPaletteModeSel"),
  gridToolSel: document.getElementById("gridToolSel"),
  gridClearBtn: document.getElementById("gridClearBtn"),
  gridInvertBtn: document.getElementById("gridInvertBtn"),
  gridRandomBtn: document.getElementById("gridRandomBtn"),
  gridPresetSel: document.getElementById("gridPresetSel"),
  gridPresetApplyBtn: document.getElementById("gridPresetApplyBtn"),
  gridPalette: document.getElementById("gridPalette"),
  gridMapHint: document.getElementById("gridMapHint"),
  waveCanvas: document.getElementById("waveCanvas"),
  renderInfo: document.getElementById("renderInfo"),
  status: document.getElementById("status"),
  clips: document.getElementById("clips"),
};

const PICTONAL_PRESETS = [
  {
    id: "nebula_gram",
    name: "Nebula (GRAM)",
    mode: "GRAM",
    params: { durationSec: 4.0, smoothMs: 18, normalize: true, fftQuality: "MID" },
    clipParams: { fftQuality: "MID" },
  },
  {
    id: "barcode_fm_scan",
    name: "Barcode FM (SCAN)",
    mode: "SCAN",
    params: { durationSec: 3.0, smoothMs: 10, normalize: true },
    clipParams: { baseHz: 110, depth: 0.85, filterMaxHz: 9000 },
  },
  {
    id: "color_organ_rgb",
    name: "Color Organ (RGB)",
    mode: "RGB_OSC",
    params: { durationSec: 5.0, smoothMs: 14, normalize: true },
    clipParams: { carrierHz: 110, spreadCents: 14, filterMaxHz: 12000 },
  },
  {
    id: "ghost_text_gram_logfreq",
    name: "Ghost Text (GRAM)",
    mode: "GRAM",
    params: { durationSec: 6.0, smoothMs: 12, normalize: true, fftQuality: "HIGH" },
    clipParams: { fftQuality: "HIGH" },
  },
  {
    id: "broken_crt_scan",
    name: "Broken CRT (SCAN)",
    mode: "SCAN",
    params: { durationSec: 3.5, smoothMs: 6, normalize: true },
    clipParams: { baseHz: 220, depth: 0.95, filterMaxHz: 6500 },
  },
];

const GRID_BASE_PALETTE = [
  { i: 0, name: "EMPTY", rgba: [0, 0, 0, 0], tone: null },
  { i: 1, name: "Paper", rgba: [245, 242, 235, 255], tone: { type: "amp", level: 0.16 } },
  { i: 2, name: "Warm Gray", rgba: [214, 209, 199, 255], tone: { type: "amp", level: 0.3 } },
  { i: 3, name: "Cool Gray", rgba: [188, 184, 176, 255], tone: { type: "amp", level: 0.45 } },
  { i: 4, name: "Anth Light", rgba: [72, 74, 78, 255], tone: { type: "band", band: 2 } },
  { i: 5, name: "Anth", rgba: [38, 40, 43, 255], tone: { type: "band", band: 4 } },
  { i: 6, name: "Ink", rgba: [18, 19, 20, 255], tone: { type: "spike", amp: 1 } },
  { i: 7, name: "Offwhite", rgba: [252, 250, 246, 255], tone: { type: "amp", level: 0.85 } },
  { i: 8, name: "Cyan", rgba: [0, 229, 255, 255], tone: { type: "band", band: 5 } },
  { i: 9, name: "Magenta", rgba: [255, 43, 214, 255], tone: { type: "band", band: 6 } },
  { i: 10, name: "Deep", rgba: [10, 10, 10, 255], tone: { type: "noise", amt: 0.35 } },
  { i: 11, name: "Shadow", rgba: [120, 122, 126, 255], tone: { type: "amp", level: 0.65 } },
  { i: 12, name: "Accent Warm", rgba: [255, 184, 90, 255], tone: { type: "osc", osc: 1 } },
  { i: 13, name: "Accent Cold", rgba: [120, 255, 210, 255], tone: { type: "osc", osc: 2 } },
  { i: 14, name: "Soft White", rgba: [236, 233, 226, 255], tone: { type: "amp", level: 0.74 } },
  { i: 15, name: "Dark Warm", rgba: [28, 24, 22, 255], tone: { type: "band", band: 1 } },
];

const GRID_PRESETS = [
  {
    id: "linen_grid_8",
    name: "Linen Grid",
    paletteMode: 8,
    cellsRLE: [
      ["fill", 512, 1],
      ["hlineEvery", { step: 2, rowValue: 3 }],
      ["vlineEvery", { step: 4, colValue: 4 }],
      ["sprinkle", { count: 18, value: 6, seed: 11 }],
    ],
  },
  {
    id: "anthracite_stripes_8",
    name: "Anthracite Stripes",
    paletteMode: 8,
    cellsRLE: [
      ["fill", 512, 1],
      ["vstripe", { period: 4, width: 1, value: 3 }],
      ["vstripe", { period: 8, width: 1, offset: 2, value: 4 }],
      ["edgeFrame", { value: 2 }],
    ],
  },
  {
    id: "calligraphy_diagonal_12",
    name: "Calligraphy Diagonal",
    paletteMode: 12,
    cellsRLE: [
      ["fill", 512, 1],
      ["diagonalStroke", { thickness: 2, valueA: 7, valueB: 6 }],
      ["smudge", { count: 32, values: [4, 5, 6], seed: 21 }],
      ["sprinkle", { count: 6, value: 8, seed: 5 }],
    ],
  },
  {
    id: "weirdo_spiral_notebook_12",
    name: "Weirdo Spiral Notebook",
    paletteMode: 12,
    cellsRLE: [
      ["fill", 512, 1],
      ["hlineEvery", { step: 3, rowValue: 2 }],
      ["spiral", { value: 3, thickness: 1 }],
      ["punctures", { count: 12, value: 10, seed: 7 }],
    ],
  },
  {
    id: "weirdo_checker_crush_8",
    name: "Weirdo Checker Crush",
    paletteMode: 8,
    cellsRLE: [
      ["checker", { a: 1, b: 3 }],
      ["edgeFrame", { value: 7 }],
      ["centerDot", { value: 4 }],
    ],
  },
  {
    id: "weirdo_microglyphs_16",
    name: "Weirdo Microglyphs",
    paletteMode: 16,
    cellsRLE: [
      ["fill", 512, 1],
      ["microGlyphs", { count: 90, values: [8, 9, 10, 11], seed: 33 }],
      ["microGlyphs", { count: 18, values: [12, 13], seed: 34 }],
      ["hlineEvery", { step: 5, rowValue: 4 }],
    ],
  },
];

const state = {
  clips: [],
  activeClipId: null,
  global: {
    sr: 48000,
    mode: "GRAM",
    durationSec: 3.0,
    smoothMs: 12,
    normalize: true,
    fftQuality: "MID",
    clipOverride: false,
  },
  render: {
    busy: false,
    tempExists: false,
    tempPath: null,
    outBuffer: null,
    playing: false,
    loop: true,
    offsetSec: 0,
    lastError: null,
  },
  grid: {
    enabled: true,
    w: 32,
    h: 16,
    cells: new Uint8Array(32 * 16),
    paletteMode: 8,
    palette: GRID_BASE_PALETTE.slice(0, 8).map((entry) => ({ ...entry })),
    selectedIndex: 1,
    tool: "PEN",
    source: "IMAGE",
    compose: "OVERLAY",
    amount01: 0.7,
    mapMode: "COLOR",
  },
};

const runtime = {
  audioContext: null,
  source: null,
  analyser: null,
  meterData: null,
  meterRaf: null,
  startedAt: 0,
  startOffset: 0,
  durationSec: 0,
  playToken: null,
  cliplibReqSeq: 1,
  sessionDirty: false,
  renderSaveSeqByKey: {},
  paths: null,
  gridPointerDown: false,
  gridLastCell: -1,
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function markDirty() { runtime.sessionDirty = true; }
function setStatus(text, isError = false) {
  refs.status.textContent = text;
  refs.status.style.color = isError ? "#8a3a2d" : "#55585a";
}

function mulberry32(seed) {
  let t = (Number(seed) || 0) >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function setGridPaletteMode(mode) {
  const size = clamp(Number(mode) || 8, 8, 16);
  state.grid.paletteMode = size;
  state.grid.palette = GRID_BASE_PALETTE.slice(0, size).map((entry) => ({ ...entry }));
  state.grid.selectedIndex = clamp(state.grid.selectedIndex, 0, size - 1);
}

function gridIndex(x, y) {
  return y * state.grid.w + x;
}

function gridForEachCell(cb) {
  for (let y = 0; y < state.grid.h; y += 1) {
    for (let x = 0; x < state.grid.w; x += 1) {
      cb(x, y, gridIndex(x, y));
    }
  }
}

function drawGridCanvas() {
  const canvas = refs.drawGridCanvas;
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const cssW = Math.max(1, canvas.clientWidth || 640);
  const cellSize = Math.max(8, Math.floor(cssW / state.grid.w));
  const drawW = state.grid.w * cellSize;
  const drawH = state.grid.h * cellSize;
  const w = Math.floor(drawW * ratio);
  const h = Math.floor(drawH * ratio);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    canvas.style.height = `${drawH}px`;
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, drawW, drawH);
  gridForEachCell((x, y, idx) => {
    const entry = state.grid.palette[state.grid.cells[idx]] || state.grid.palette[0];
    const [r, g, b, a] = entry.rgba;
    ctx.fillStyle = a > 0 ? `rgba(${r},${g},${b},${a / 255})` : "rgba(255,255,255,0.7)";
    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
  });
  ctx.strokeStyle = "rgba(47,49,50,0.22)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= state.grid.w; x += 1) {
    const px = x * cellSize + 0.5;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, drawH);
    ctx.stroke();
  }
  for (let y = 0; y <= state.grid.h; y += 1) {
    const py = y * cellSize + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(drawW, py);
    ctx.stroke();
  }
}

function renderGridPalette() {
  const root = refs.gridPalette;
  if (!root) return;
  root.innerHTML = "";
  for (let i = 0; i < state.grid.paletteMode; i += 1) {
    const p = state.grid.palette[i];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `swatch dn-btn${i === state.grid.selectedIndex ? " active" : ""}${i === 0 ? " empty" : ""}`;
    btn.title = `${i}: ${p.name || "Slot"}`;
    const [r, g, b, a] = p.rgba;
    btn.style.background = a > 0 ? `rgba(${r},${g},${b},${a / 255})` : "linear-gradient(135deg,#f5f2eb,#ddd8cc)";
    btn.addEventListener("click", () => {
      state.grid.selectedIndex = i;
      markDirty();
      renderGridPalette();
    });
    root.appendChild(btn);
  }
}

function pointerToGridCell(event) {
  const canvas = refs.drawGridCanvas;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = clamp(Math.floor(((event.clientX - rect.left) / rect.width) * state.grid.w), 0, state.grid.w - 1);
  const y = clamp(Math.floor(((event.clientY - rect.top) / rect.height) * state.grid.h), 0, state.grid.h - 1);
  return { x, y, idx: gridIndex(x, y) };
}

function paintGridCell(cell, event) {
  if (!cell) return;
  if (runtime.gridLastCell === cell.idx) return;
  runtime.gridLastCell = cell.idx;
  const erase = state.grid.tool === "ERASE" || event.altKey || event.button === 2;
  const value = erase ? 0 : clamp(state.grid.selectedIndex, 0, state.grid.paletteMode - 1);
  if (state.grid.cells[cell.idx] === value) return;
  state.grid.cells[cell.idx] = value;
  markDirty();
  drawGridCanvas();
}

function clearGrid() {
  state.grid.cells.fill(0);
  markDirty();
  drawGridCanvas();
}

function invertGrid() {
  for (let i = 0; i < state.grid.cells.length; i += 1) {
    if (state.grid.cells[i] === 0) continue;
    state.grid.cells[i] = state.grid.paletteMode - state.grid.cells[i];
  }
  markDirty();
  drawGridCanvas();
}

function randomizeGrid(seed = Date.now()) {
  const rnd = mulberry32(seed);
  for (let i = 0; i < state.grid.cells.length; i += 1) {
    const r = rnd();
    state.grid.cells[i] = r < 0.18 ? 0 : 1 + Math.floor(rnd() * Math.max(1, state.grid.paletteMode - 1));
  }
  markDirty();
  drawGridCanvas();
}

function applyGridOp(opName, spec, fillValue = null) {
  const W = state.grid.w;
  const H = state.grid.h;
  const cells = state.grid.cells;
  const clampPalette = (v) => clamp(Number(v) || 0, 0, state.grid.paletteMode - 1);
  const setXY = (x, y, value) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    cells[y * W + x] = clampPalette(value);
  };
  const pickFrom = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];
  if (opName === "fill") {
    const count = clamp(Number(spec) || 0, 0, cells.length);
    const value = clampPalette(fillValue);
    for (let i = 0; i < count; i += 1) cells[i] = value;
    return;
  }
  if (opName === "hlineEvery") {
    const step = Math.max(1, Number(spec?.step) || 1);
    const v = clampPalette(spec?.rowValue);
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += 1) setXY(x, y, v);
    return;
  }
  if (opName === "vlineEvery") {
    const step = Math.max(1, Number(spec?.step) || 1);
    const v = clampPalette(spec?.colValue);
    for (let x = 0; x < W; x += step) for (let y = 0; y < H; y += 1) setXY(x, y, v);
    return;
  }
  if (opName === "vstripe") {
    const period = Math.max(1, Number(spec?.period) || 1);
    const width = Math.max(1, Number(spec?.width) || 1);
    const offset = Math.max(0, Number(spec?.offset) || 0);
    const v = clampPalette(spec?.value);
    for (let x = 0; x < W; x += 1) {
      if (((x + period - (offset % period)) % period) < width) {
        for (let y = 0; y < H; y += 1) setXY(x, y, v);
      }
    }
    return;
  }
  if (opName === "edgeFrame") {
    const v = clampPalette(spec?.value);
    for (let x = 0; x < W; x += 1) { setXY(x, 0, v); setXY(x, H - 1, v); }
    for (let y = 0; y < H; y += 1) { setXY(0, y, v); setXY(W - 1, y, v); }
    return;
  }
  if (opName === "checker") {
    const a = clampPalette(spec?.a);
    const b = clampPalette(spec?.b);
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) setXY(x, y, (x + y) % 2 ? b : a);
    return;
  }
  if (opName === "centerDot") {
    setXY(Math.floor(W * 0.5), Math.floor(H * 0.5), clampPalette(spec?.value));
    return;
  }
  if (opName === "diagonalStroke") {
    const th = Math.max(1, Number(spec?.thickness) || 1);
    const a = clampPalette(spec?.valueA);
    const b = clampPalette(spec?.valueB);
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const d = Math.abs(y - Math.round((x / Math.max(1, W - 1)) * (H - 1)));
        if (d <= th) setXY(x, y, d % 2 ? b : a);
      }
    }
    return;
  }
  if (opName === "spiral") {
    const v = clampPalette(spec?.value);
    const th = Math.max(1, Number(spec?.thickness) || 1);
    let left = 0;
    let right = W - 1;
    let top = 0;
    let bottom = H - 1;
    while (left <= right && top <= bottom) {
      for (let t = 0; t < th; t += 1) {
        for (let x = left; x <= right; x += 1) setXY(x, top + t, v);
        for (let y = top; y <= bottom; y += 1) setXY(right - t, y, v);
        for (let x = right; x >= left; x -= 1) setXY(x, bottom - t, v);
        for (let y = bottom; y >= top; y -= 1) setXY(left + t, y, v);
      }
      left += th + 1;
      right -= th + 1;
      top += th + 1;
      bottom -= th + 1;
    }
    return;
  }
  if (opName === "smudge" || opName === "sprinkle" || opName === "punctures" || opName === "microGlyphs") {
    const rnd = mulberry32(Number(spec?.seed) || 1);
    const count = Math.max(1, Number(spec?.count) || 1);
    const values = Array.isArray(spec?.values) && spec.values.length ? spec.values : [spec?.value ?? 1];
    const glyph = opName === "microGlyphs";
    for (let i = 0; i < count; i += 1) {
      const x = Math.floor(rnd() * W);
      const y = Math.floor(rnd() * H);
      const value = clampPalette(pickFrom(values, rnd));
      setXY(x, y, value);
      if (glyph && rnd() > 0.55) setXY(x + 1, y, value);
      if (glyph && rnd() > 0.7) setXY(x, y + 1, value);
      if (opName === "smudge" && rnd() > 0.6) setXY(x + (rnd() > 0.5 ? 1 : -1), y, value);
      if (opName === "smudge" && rnd() > 0.6) setXY(x, y + (rnd() > 0.5 ? 1 : -1), value);
    }
  }
}

function applyGridPresetById(id) {
  const preset = GRID_PRESETS.find((p) => p.id === id);
  if (!preset) return;
  setGridPaletteMode(preset.paletteMode || 8);
  state.grid.cells.fill(0);
  for (const op of preset.cellsRLE || []) {
    if (!Array.isArray(op) || !op.length) continue;
    if (op[0] === "fill") applyGridOp("fill", op[1], op[2]);
    else applyGridOp(op[0], op[1]);
  }
  markDirty();
  renderGridPalette();
  drawGridCanvas();
  setStatus(`GRID PRESET: ${preset.name}`);
}

function gridToRgbaImage() {
  const W = state.grid.w;
  const H = state.grid.h;
  const out = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < state.grid.cells.length; i += 1) {
    const p = state.grid.palette[state.grid.cells[i]] || state.grid.palette[0];
    const o = i * 4;
    out[o] = p.rgba[0];
    out[o + 1] = p.rgba[1];
    out[o + 2] = p.rgba[2];
    out[o + 3] = p.rgba[3];
  }
  return { width: W, height: H, pixelsRGBA: out };
}

function scaleRgbaNearest(src, targetW, targetH) {
  const out = new Uint8ClampedArray(targetW * targetH * 4);
  for (let y = 0; y < targetH; y += 1) {
    const sy = clamp(Math.floor((y / Math.max(1, targetH - 1)) * (src.height - 1)), 0, src.height - 1);
    for (let x = 0; x < targetW; x += 1) {
      const sx = clamp(Math.floor((x / Math.max(1, targetW - 1)) * (src.width - 1)), 0, src.width - 1);
      const si = (sy * src.width + sx) * 4;
      const oi = (y * targetW + x) * 4;
      out[oi] = src.pixelsRGBA[si];
      out[oi + 1] = src.pixelsRGBA[si + 1];
      out[oi + 2] = src.pixelsRGBA[si + 2];
      out[oi + 3] = src.pixelsRGBA[si + 3];
    }
  }
  return { width: targetW, height: targetH, pixelsRGBA: out };
}

function composeImageAndGrid(baseImage, gridImage, source, compose, amount01) {
  if (source === "GRID") return gridImage;
  if (source === "IMAGE" || !baseImage) return baseImage;
  const targetW = baseImage.width;
  const targetH = baseImage.height;
  const gridScaled = gridImage.width === targetW && gridImage.height === targetH
    ? gridImage
    : scaleRgbaNearest(gridImage, targetW, targetH);
  if (!baseImage) return gridScaled;
  const out = new Uint8ClampedArray(targetW * targetH * 4);
  const aMix = clamp(amount01, 0, 1);
  for (let i = 0; i < out.length; i += 4) {
    const ga = gridScaled.pixelsRGBA[i + 3] / 255;
    if (compose === "REPLACE") {
      if (ga > 0) {
        out[i] = gridScaled.pixelsRGBA[i];
        out[i + 1] = gridScaled.pixelsRGBA[i + 1];
        out[i + 2] = gridScaled.pixelsRGBA[i + 2];
        out[i + 3] = 255;
      } else {
        out[i] = baseImage.pixelsRGBA[i];
        out[i + 1] = baseImage.pixelsRGBA[i + 1];
        out[i + 2] = baseImage.pixelsRGBA[i + 2];
        out[i + 3] = baseImage.pixelsRGBA[i + 3];
      }
    } else {
      const localMix = aMix * ga;
      out[i] = Math.round(baseImage.pixelsRGBA[i] * (1 - localMix) + gridScaled.pixelsRGBA[i] * localMix);
      out[i + 1] = Math.round(baseImage.pixelsRGBA[i + 1] * (1 - localMix) + gridScaled.pixelsRGBA[i + 1] * localMix);
      out[i + 2] = Math.round(baseImage.pixelsRGBA[i + 2] * (1 - localMix) + gridScaled.pixelsRGBA[i + 2] * localMix);
      out[i + 3] = 255;
    }
  }
  return { width: targetW, height: targetH, pixelsRGBA: out };
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
  const addClass = () => root.querySelectorAll("button").forEach((b) => b.classList.add("dn-btn"));
  addClass();
  new MutationObserver(addClass).observe(root.documentElement || root.body, { childList: true, subtree: true });
  const clear = () => root.querySelectorAll(".dn-btn.is-pressing").forEach((b) => b.classList.remove("is-pressing"));
  root.addEventListener("pointerdown", (event) => {
    const b = event.target?.closest?.(".dn-btn");
    if (!b || b.disabled) return;
    b.classList.add("is-pressing");
    try { b.setPointerCapture(event.pointerId); } catch {}
  }, { passive: true, capture: true });
  root.addEventListener("pointerup", (event) => {
    const b = event.target?.closest?.(".dn-btn");
    if (b) b.classList.remove("is-pressing"); else clear();
  }, { passive: true, capture: true });
  root.addEventListener("pointercancel", clear, { passive: true, capture: true });
}

function globalPlayStart(sourceLabel) {
  const token = `pictonal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    window.parent?.postMessage({ type: "GLOBAL_PLAY_START", version: 1, payload: { token, moduleId: "pictonal", source: sourceLabel } }, "*");
  } catch {}
  return token;
}

function globalPlayStop(token) {
  if (!token) return;
  try {
    window.parent?.postMessage({ type: "GLOBAL_PLAY_STOP", version: 1, payload: { token } }, "*");
  } catch {}
}

function ensureAudioContext() {
  if (!runtime.audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    runtime.audioContext = new Ctor();
  }
  return runtime.audioContext;
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

function sanitizeName(name) {
  return String(name || "pictonal").trim().replace(/[^a-z0-9._-]+/gi, "_").replace(/_+/g, "_").slice(0, 80) || "pictonal";
}

function outputFileName() {
  return `pictonal_${state.clips.length}clips_${Date.now()}.wav`;
}

async function saveBlobWithDialog(blob, suggestedName) {
  const invoke = getInvoke();
  if (typeof invoke === "function") {
    try {
      const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
      const savePath = await invoke("dialog_save_file", {
        defaultDir: String(runtime.paths?.mater || ""),
        suggestedName,
        filters: [{ name: "WAV", extensions: ["wav"] }],
        dialogKey: "pictonal.saveWav",
      });
      if (!savePath) return "cancelled";
      const saved = await invoke("save_blob_to_path", { dataBase64, path: savePath });
      return saved ? "saved" : "cancelled";
    } catch {}
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

async function saveBlobWithDialogPath(blob, suggestedName) {
  const invoke = getInvoke();
  if (typeof invoke !== "function") return null;
  try {
    return await invoke("dialog_save_file", {
      defaultDir: String(runtime.paths?.mater || ""),
      suggestedName,
      filters: [{ name: "WAV", extensions: ["wav"] }],
      dialogKey: "pictonal.saveWav",
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

async function saveBlobSequenced(blob, suggestedName, sequenceKey) {
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
    const pickedPath = await saveBlobWithDialogPath(blob, suggestedName);
    if (pickedPath) {
      const sep = pathSeparator(pickedPath);
      const pickedName = pickedPath.split(/[\\/]/).pop() || suggestedName;
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
  const fallback = await saveBlobWithDialog(blob, suggestedName);
  if (fallback === "saved" || fallback === "downloaded") {
    const parts = splitFileNameParts(suggestedName);
    runtime.renderSaveSeqByKey[sequenceKey] = {
      dir: "",
      sep: "/",
      stem: parts.stem,
      ext: parts.ext,
      nextIndex: 2,
      dialogOnly: true,
    };
  }
  return fallback;
}

function audioBufferToWavBlob(buffer) {
  const channels = 2;
  const frames = buffer.frames;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const out = new ArrayBuffer(44 + dataSize);
  const v = new DataView(out);
  const write = (off, str) => { for (let i = 0; i < str.length; i += 1) v.setUint8(off + i, str.charCodeAt(i)); };
  write(0, "RIFF");
  v.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, channels, true);
  v.setUint32(24, buffer.sr, true);
  v.setUint32(28, buffer.sr * blockAlign, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, 16, true);
  write(36, "data");
  v.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const s = clamp(buffer.data[c][i], -1, 1);
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([out], { type: "audio/wav" });
}

function stopPlayback() {
  if (runtime.source && runtime.audioContext && runtime.durationSec > 0) {
    const elapsed = Math.max(0, runtime.audioContext.currentTime - runtime.startedAt);
    let nextOffset = runtime.startOffset + elapsed;
    if (state.render.loop) nextOffset %= runtime.durationSec;
    else nextOffset = Math.min(runtime.durationSec, nextOffset);
    state.render.offsetSec = clamp(nextOffset, 0, Math.max(0, runtime.durationSec - 0.0005));
  }
  if (runtime.source) {
    try { runtime.source.stop(); } catch {}
    try { runtime.source.disconnect(); } catch {}
    runtime.source = null;
  }
  if (runtime.playToken) {
    globalPlayStop(runtime.playToken);
    runtime.playToken = null;
  }
  if (runtime.meterRaf) {
    cancelAnimationFrame(runtime.meterRaf);
    runtime.meterRaf = null;
  }
  state.render.playing = false;
  refs.playBtn.textContent = "PLAY";
  refs.playBtn.setAttribute("aria-pressed", "false");
  window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
  updateUi();
}

function startMeter() {
  const analyser = runtime.analyser;
  if (!analyser) return;
  if (!runtime.meterData || runtime.meterData.length !== analyser.fftSize) runtime.meterData = new Uint8Array(analyser.fftSize);
  const tick = () => {
    if (!state.render.playing || !runtime.source || !runtime.analyser) {
      runtime.meterRaf = null;
      window.parent?.postMessage({ type: "denarrator-meter", level: 0 }, "*");
      return;
    }
    analyser.getByteTimeDomainData(runtime.meterData);
    let peak = 0;
    for (let i = 0; i < runtime.meterData.length; i += 1) {
      const v = Math.abs((runtime.meterData[i] - 128) / 128);
      if (v > peak) peak = v;
    }
    window.parent?.postMessage({ type: "denarrator-meter", level: clamp(peak * 1.8, 0, 1) }, "*");
    drawWave();
    runtime.meterRaf = requestAnimationFrame(tick);
  };
  runtime.meterRaf = requestAnimationFrame(tick);
}

function bufferToAudioBuffer(buffer) {
  const ctx = ensureAudioContext();
  const out = ctx.createBuffer(2, buffer.frames, buffer.sr);
  out.copyToChannel(buffer.data[0], 0);
  out.copyToChannel(buffer.data[1], 1);
  return out;
}

async function playRendered() {
  if (!state.render.outBuffer) return;
  stopPlayback();
  const ctx = ensureAudioContext();
  await ctx.resume();
  const source = ctx.createBufferSource();
  source.buffer = bufferToAudioBuffer(state.render.outBuffer);
  source.loop = state.render.loop;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  analyser.connect(ctx.destination);
  runtime.analyser = analyser;
  const durationSec = state.render.outBuffer.frames / Math.max(1, state.render.outBuffer.sr);
  const startOffset = clamp(state.render.offsetSec || 0, 0, Math.max(0, durationSec - 0.0005));
  runtime.source = source;
  runtime.durationSec = durationSec;
  runtime.startOffset = startOffset;
  runtime.startedAt = ctx.currentTime;
  runtime.playToken = globalPlayStart("preview");
  source.onended = () => {
    if (runtime.source === source) {
      state.render.offsetSec = 0;
      stopPlayback();
    }
  };
  source.start(0, startOffset);
  state.render.playing = true;
  refs.playBtn.textContent = "PAUSE";
  refs.playBtn.setAttribute("aria-pressed", "true");
  startMeter();
  updateUi();
}

function lumaAt(pixels, w, h, x, y) {
  const xi = clamp(Math.floor(x), 0, w - 1);
  const yi = clamp(Math.floor(y), 0, h - 1);
  const idx = (yi * w + xi) * 4;
  const r = pixels[idx] / 255;
  const g = pixels[idx + 1] / 255;
  const b = pixels[idx + 2] / 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b);
}

function rgbAt(pixels, w, h, x, y) {
  const xi = clamp(Math.floor(x), 0, w - 1);
  const yi = clamp(Math.floor(y), 0, h - 1);
  const idx = (yi * w + xi) * 4;
  return {
    r: pixels[idx] / 255,
    g: pixels[idx + 1] / 255,
    b: pixels[idx + 2] / 255,
  };
}

function applyFadeStereo(chL, chR, fadeFrames) {
  const len = chL.length;
  const f = clamp(fadeFrames, 0, Math.floor(len / 2));
  for (let i = 0; i < f; i += 1) {
    const gIn = i / Math.max(1, f - 1);
    const gOut = 1 - gIn;
    chL[i] *= gIn;
    chR[i] *= gIn;
    const j = len - 1 - i;
    chL[j] *= gOut;
    chR[j] *= gOut;
  }
}

function softClip(v, amt = 1.4) {
  const n = Math.tanh(amt);
  return Math.tanh(v * amt) / n;
}

function normalizeStereo(buffer, target = 0.95) {
  let peak = 0;
  for (let c = 0; c < 2; c += 1) {
    const ch = buffer.data[c];
    for (let i = 0; i < ch.length; i += 1) peak = Math.max(peak, Math.abs(ch[i]));
  }
  if (peak <= 1e-9 || peak <= target) return;
  const g = target / peak;
  for (let c = 0; c < 2; c += 1) {
    const ch = buffer.data[c];
    for (let i = 0; i < ch.length; i += 1) ch[i] *= g;
  }
}

function onePoleLP(input, cutoffNorm) {
  const out = new Float32Array(input.length);
  const a = clamp(cutoffNorm, 0.001, 0.999);
  let y = input[0] || 0;
  for (let i = 0; i < input.length; i += 1) {
    y += a * (input[i] - y);
    out[i] = y;
  }
  return out;
}

function gridToneSupportedForMode(mode) {
  return mode === "GRAM";
}

function resolveClipImageSource(clip, mode) {
  const gridImg = gridToRgbaImage();
  const source = state.grid.source;
  const compose = state.grid.compose;
  if (source === "GRID") {
    if (clip?.image) return scaleRgbaNearest(gridImg, clip.image.width, clip.image.height);
    return scaleRgbaNearest(gridImg, 320, 180);
  }
  if (!clip?.image) return scaleRgbaNearest(gridImg, 320, 180);
  return composeImageAndGrid(clip.image, gridImg, source, compose, state.grid.amount01);
}

function renderGramTone(_clip, frames, sr) {
  const bins = 24;
  const W = state.grid.w;
  const H = state.grid.h;
  const freq = new Float32Array(bins);
  const phaseL = new Float32Array(bins);
  const phaseR = new Float32Array(bins);
  for (let b = 0; b < bins; b += 1) {
    const t = b / Math.max(1, bins - 1);
    freq[b] = 55 * Math.pow(120, t);
    phaseL[b] = 0;
    phaseR[b] = 0.1;
  }
  const L = new Float32Array(frames);
  const R = new Float32Array(frames);
  for (let n = 0; n < frames; n += 1) {
    const gx = clamp(Math.floor((n / Math.max(1, frames - 1)) * (W - 1)), 0, W - 1);
    let accL = 0;
    let accR = 0;
    for (let b = 0; b < bins; b += 1) {
      const gy = clamp(H - 1 - Math.floor((b / Math.max(1, bins - 1)) * (H - 1)), 0, H - 1);
      const idx = state.grid.cells[gy * W + gx];
      const tone = state.grid.palette[idx]?.tone || null;
      let amp = 0;
      let detune = 1;
      if (tone?.type === "amp") amp = tone.level ?? 0.4;
      else if (tone?.type === "band") amp = 0.35 + ((tone.band ?? 0) / 8) * 0.5;
      else if (tone?.type === "noise") amp = tone.amt ?? 0.25;
      else if (tone?.type === "spike") amp = 0.92;
      else if (tone?.type === "osc") { amp = 0.4; detune = 1 + ((tone.osc ?? 0) * 0.02); }
      else amp = idx === 0 ? 0 : 0.2 + (idx / Math.max(1, state.grid.paletteMode - 1)) * 0.55;
      const inc = (Math.PI * 2 * freq[b] * detune) / sr;
      phaseL[b] += inc;
      phaseR[b] += inc * 1.001;
      accL += Math.sin(phaseL[b]) * (amp / bins);
      accR += Math.sin(phaseR[b]) * (amp / bins);
    }
    L[n] = accL;
    R[n] = accR;
  }
  return { L, R };
}

function renderGram(clip, frames, sr) {
  const { pixelsRGBA: p, width: w, height: h } = clip.image;
  const bins = clip.params.fftQuality === "HIGH" ? 40 : clip.params.fftQuality === "LOW" ? 12 : 24;
  const freqs = new Float32Array(bins);
  const phaseL = new Float32Array(bins);
  const phaseR = new Float32Array(bins);
  for (let b = 0; b < bins; b += 1) {
    const t = b / Math.max(1, bins - 1);
    freqs[b] = 70 * Math.pow(110, t);
    phaseL[b] = Math.random() * Math.PI * 2;
    phaseR[b] = phaseL[b] + 0.12;
  }
  const L = new Float32Array(frames);
  const R = new Float32Array(frames);
  for (let n = 0; n < frames; n += 1) {
    const x = (n / Math.max(1, frames - 1)) * (w - 1);
    let accL = 0;
    let accR = 0;
    for (let b = 0; b < bins; b += 1) {
      const y = (1 - (b / Math.max(1, bins - 1))) * (h - 1);
      const lum = lumaAt(p, w, h, x, y);
      const amp = Math.pow(lum, 1.35) / bins;
      const inc = (Math.PI * 2 * freqs[b]) / sr;
      phaseL[b] += inc;
      phaseR[b] += inc * 1.001;
      accL += Math.sin(phaseL[b]) * amp;
      accR += Math.sin(phaseR[b]) * amp;
    }
    L[n] = accL;
    R[n] = accR;
  }
  return { L, R };
}

function renderScan(clip, frames, sr) {
  const { pixelsRGBA: p, width: w, height: h } = clip.image;
  const baseHz = clip.params.baseHz || 110;
  const depth = clip.params.depth || 0.85;
  let phL = 0;
  let phR = 0;
  const L = new Float32Array(frames);
  const R = new Float32Array(frames);
  for (let n = 0; n < frames; n += 1) {
    const t = n / Math.max(1, frames - 1);
    const row = t * (h - 1);
    const col = t * (w - 1);
    const lumRow = lumaAt(p, w, h, (t * 3 % 1) * (w - 1), row);
    const lumCol = lumaAt(p, w, h, col, ((t * 3 + 0.33) % 1) * (h - 1));
    const ampL = 0.2 + (lumRow * depth);
    const ampR = 0.2 + (lumCol * depth);
    const freqL = baseHz * (0.7 + lumRow * 1.6);
    const freqR = baseHz * (0.7 + lumCol * 1.6);
    phL += (Math.PI * 2 * freqL) / sr;
    phR += (Math.PI * 2 * freqR) / sr;
    L[n] = Math.sin(phL) * ampL;
    R[n] = Math.sin(phR) * ampR;
  }
  const cutoffNorm = clamp((clip.params.filterMaxHz || 9000) / (sr * 0.5), 0.01, 0.99);
  return { L: onePoleLP(L, cutoffNorm), R: onePoleLP(R, cutoffNorm) };
}

function renderRgbOsc(clip, frames, sr) {
  const { pixelsRGBA: p, width: w, height: h } = clip.image;
  const carrier = clip.params.carrierHz || 110;
  const spread = (clip.params.spreadCents || 14) / 1200;
  const f1 = carrier;
  const f2 = carrier * Math.pow(2, spread);
  const f3 = carrier * 1.5;
  let ph1L = 0, ph2L = 0, ph3L = 0;
  let ph1R = 0.4, ph2R = 0.2, ph3R = 0.6;
  const L = new Float32Array(frames);
  const R = new Float32Array(frames);
  for (let n = 0; n < frames; n += 1) {
    const t = n / Math.max(1, frames - 1);
    const x = t * (w - 1);
    const y = (1 - t) * (h - 1);
    const rgb = rgbAt(p, w, h, x, y);
    ph1L += (Math.PI * 2 * f1) / sr;
    ph2L += (Math.PI * 2 * f2) / sr;
    ph3L += (Math.PI * 2 * f3) / sr;
    ph1R += (Math.PI * 2 * f1 * 1.001) / sr;
    ph2R += (Math.PI * 2 * f2 * 0.999) / sr;
    ph3R += (Math.PI * 2 * f3 * 1.002) / sr;
    const noise = (Math.random() * 2 - 1) * rgb.b * 0.35;
    L[n] = Math.sin(ph1L) * rgb.r + Math.sin(ph2L) * rgb.g * 0.9 + Math.sign(Math.sin(ph3L)) * rgb.b * 0.55 + noise;
    R[n] = Math.sin(ph1R) * rgb.r + Math.sin(ph2R) * rgb.g * 0.9 + Math.sign(Math.sin(ph3R)) * rgb.b * 0.55 + noise;
  }
  const cutoffNorm = clamp((500 + (clip.params.filterMaxHz || 12000) * 0.5) / (sr * 0.5), 0.01, 0.99);
  return { L: onePoleLP(L, cutoffNorm), R: onePoleLP(R, cutoffNorm) };
}

function effectiveClipSettings(clip) {
  if (state.global.clipOverride) return clip;
  return {
    ...clip,
    mode: state.global.mode,
    durationSec: state.global.durationSec,
    params: {
      ...clip.params,
      fftQuality: state.global.fftQuality,
      smoothMs: state.global.smoothMs,
    },
  };
}

function currentGridModeForUi() {
  if (!state.global.clipOverride) return state.global.mode;
  const active = state.clips.find((c) => c.id === state.activeClipId);
  return active?.mode || state.global.mode;
}

function renderClip(clip) {
  const cfg = effectiveClipSettings(clip);
  const sr = state.global.sr;
  const frames = Math.max(64, Math.round(clamp(cfg.durationSec || 3, 0.1, 16) * sr));
  const toneRequested = state.grid.mapMode === "TONE";
  const toneSupported = gridToneSupportedForMode(cfg.mode);
  if (toneRequested && !toneSupported) {
    refs.gridMapHint.textContent = `${cfg.mode}: TONE NOT SUPPORTED, USING COLOR`;
  } else if (toneRequested && toneSupported) {
    refs.gridMapHint.textContent = "TONE MAP ACTIVE (GRAM)";
  } else {
    refs.gridMapHint.textContent = "COLOR MAP ACTIVE";
  }
  const resolvedImage = resolveClipImageSource(cfg, cfg.mode);
  const sourceCfg = { ...cfg, image: resolvedImage };
  let rendered;
  if (toneRequested && toneSupported) rendered = renderGramTone(sourceCfg, frames, sr);
  else if (sourceCfg.mode === "SCAN") rendered = renderScan(sourceCfg, frames, sr);
  else if (sourceCfg.mode === "RGB_OSC") rendered = renderRgbOsc(sourceCfg, frames, sr);
  else rendered = renderGram(sourceCfg, frames, sr);
  const fadeFrames = Math.round((clamp(state.global.smoothMs, 0, 100) / 1000) * sr);
  applyFadeStereo(rendered.L, rendered.R, fadeFrames);
  return rendered;
}

function concatStereo(chunks) {
  const frames = chunks.reduce((acc, c) => acc + c.L.length, 0);
  const outL = new Float32Array(frames);
  const outR = new Float32Array(frames);
  let at = 0;
  for (const c of chunks) {
    outL.set(c.L, at);
    outR.set(c.R, at);
    at += c.L.length;
  }
  return { sr: state.global.sr, channels: 2, frames, data: [outL, outR] };
}

function postProcess(buffer) {
  const L = buffer.data[0];
  const R = buffer.data[1];
  for (let i = 0; i < L.length; i += 1) {
    L[i] = softClip(L[i], 1.4);
    R[i] = softClip(R[i], 1.4);
  }
  if (state.global.normalize) normalizeStereo(buffer, 0.95);
}

async function renderAll() {
  const gridOnly = state.grid.source === "GRID";
  if (!state.clips.length && !gridOnly) {
    setStatus("LOAD AT LEAST 1 IMAGE", true);
    return;
  }
  const t0 = performance.now();
  state.render.busy = true;
  state.render.lastError = null;
  refs.renderInfo.textContent = "RENDERING...";
  updateUi();
  const renderClipsList = state.clips.length
    ? state.clips
    : [{
      id: "grid_virtual",
      name: "grid",
      image: { width: 320, height: 180, pixelsRGBA: new Uint8ClampedArray(320 * 180 * 4) },
      durationSec: state.global.durationSec,
      mode: state.global.mode,
      params: { fftQuality: state.global.fftQuality, smoothMs: state.global.smoothMs, baseHz: 110, depth: 0.85, filterMaxHz: 9000, carrierHz: 110, spreadCents: 14 },
    }];
  const chunks = renderClipsList.map((clip) => renderClip(clip));
  const out = concatStereo(chunks);
  postProcess(out);
  state.render.outBuffer = out;
  state.render.tempExists = true;
  try {
    const invoke = getInvoke();
    if (invoke) {
      const wavBytesBase64 = arrayBufferToBase64(await audioBufferToWavBlob(out).arrayBuffer());
      const tempPath = await invoke("write_temp_wav", { moduleId: "pictonal", wavBytesBase64 });
      state.render.tempPath = tempPath ? String(tempPath) : null;
    }
  } catch {}
  state.render.busy = false;
  markDirty();
  drawWave();
  const ms = Math.round(performance.now() - t0);
  refs.renderInfo.textContent = `TEMP READY | ${out.frames} FRAMES | ${ms}MS`;
  setStatus("RENDER DONE: TEMP READY");
  updateUi();
}

function drawWave() {
  const canvas = refs.waveCanvas;
  const c = canvas.getContext("2d");
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.floor(canvas.clientWidth * ratio));
  const h = Math.max(1, Math.floor(canvas.clientHeight * ratio));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  c.clearRect(0, 0, w, h);
  c.fillStyle = "rgba(236, 234, 228, 0.62)";
  c.fillRect(0, 0, w, h);
  const out = state.render.outBuffer;
  if (!out) return;
  const mono = new Float32Array(out.frames);
  for (let i = 0; i < out.frames; i += 1) mono[i] = 0.5 * (out.data[0][i] + out.data[1][i]);
  const spp = mono.length / w;
  const mid = h * 0.5;
  const amp = h * 0.42;
  c.strokeStyle = "rgba(47,49,50,0.85)";
  c.lineWidth = Math.max(1, ratio);
  c.beginPath();
  for (let x = 0; x < w; x += 1) {
    const start = Math.floor(x * spp);
    const end = Math.min(mono.length, Math.floor((x + 1) * spp) + 1);
    let peak = 0;
    for (let i = start; i < end; i += 1) peak = Math.max(peak, Math.abs(mono[i]));
    c.moveTo(x + 0.5, mid - peak * amp);
    c.lineTo(x + 0.5, mid + peak * amp);
  }
  c.stroke();

  const durationSec = out.frames / Math.max(1, out.sr);
  let playheadSec = clamp(Number(state.render.offsetSec) || 0, 0, Math.max(0, durationSec));
  if (state.render.playing && runtime.audioContext && runtime.source && durationSec > 0) {
    const elapsed = Math.max(0, runtime.audioContext.currentTime - runtime.startedAt);
    let at = runtime.startOffset + elapsed;
    if (state.render.loop) at %= durationSec;
    else at = Math.min(durationSec, at);
    playheadSec = clamp(at, 0, durationSec);
  }
  const x = clamp(Math.round((playheadSec / Math.max(durationSec, 1e-6)) * (w - 1)), 0, Math.max(0, w - 1));
  c.strokeStyle = "rgba(138,58,45,0.92)";
  c.lineWidth = Math.max(1, Math.round(ratio * 1.5));
  c.beginPath();
  c.moveTo(x + 0.5, 0);
  c.lineTo(x + 0.5, h);
  c.stroke();
}

function updateUi() {
  refs.clipCount.textContent = `${state.clips.length} clips`;
  refs.durationVal.textContent = `${state.global.durationSec.toFixed(1)}S`;
  refs.smoothVal.textContent = `${Math.round(state.global.smoothMs)}MS`;
  refs.normalizeBtn.setAttribute("aria-pressed", String(state.global.normalize));
  refs.normalizeBtn.textContent = state.global.normalize ? "ON" : "OFF";
  refs.overrideBtn.setAttribute("aria-pressed", String(state.global.clipOverride));
  refs.overrideBtn.textContent = state.global.clipOverride ? "ON" : "OFF";
  refs.loopBtn.checked = Boolean(state.render.loop);
  refs.playBtn.setAttribute("aria-pressed", String(state.render.playing));
  refs.playBtn.textContent = state.render.playing ? "PAUSE" : "PLAY";
  refs.playBtn.disabled = !state.render.tempExists;
  refs.saveBtn.disabled = !state.render.tempExists;
  refs.sendBtn.disabled = !state.render.tempExists;
  refs.gridAmountVal.textContent = `${Math.round(state.grid.amount01 * 100)}%`;
  refs.gridSourceSel.value = state.grid.source;
  refs.gridComposeSel.value = state.grid.compose;
  refs.gridAmountInput.value = String(Math.round(state.grid.amount01 * 100));
  refs.gridMapSel.value = state.grid.mapMode;
  refs.gridPaletteModeSel.value = String(state.grid.paletteMode);
  refs.gridToolSel.value = state.grid.tool;
  const both = state.grid.source === "BOTH";
  refs.gridComposeSel.disabled = !both;
  refs.gridAmountInput.disabled = !both || state.grid.compose !== "OVERLAY";
  const toneOption = refs.gridMapSel?.querySelector?.('option[value="TONE"]');
  const modeForTone = currentGridModeForUi();
  const toneAllowed = gridToneSupportedForMode(modeForTone);
  if (toneOption) toneOption.disabled = !toneAllowed;
  if (!toneAllowed && state.grid.mapMode === "TONE") {
    state.grid.mapMode = "COLOR";
    refs.gridMapSel.value = "COLOR";
    refs.gridMapHint.textContent = `${modeForTone}: TONE OFF (COLOR FALLBACK)`;
  } else if (toneAllowed && state.grid.mapMode === "TONE") {
    refs.gridMapHint.textContent = "TONE MAP ACTIVE (GRAM)";
  } else {
    refs.gridMapHint.textContent = "COLOR MAP ACTIVE";
  }
}

function applyPresetById(presetId) {
  const preset = PICTONAL_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  state.global.mode = preset.mode || state.global.mode;
  if (Number.isFinite(Number(preset.params?.durationSec))) {
    state.global.durationSec = clamp(Number(preset.params.durationSec), 0.1, 16);
  }
  if (Number.isFinite(Number(preset.params?.smoothMs))) {
    state.global.smoothMs = clamp(Number(preset.params.smoothMs), 0, 100);
  }
  if (typeof preset.params?.normalize === "boolean") {
    state.global.normalize = preset.params.normalize;
  }
  if (preset.params?.fftQuality) {
    state.global.fftQuality = String(preset.params.fftQuality).toUpperCase();
  }
  const active = state.clips.find((c) => c.id === state.activeClipId) || null;
  if (active) {
    active.mode = preset.mode || active.mode;
    active.durationSec = state.global.durationSec;
    active.params = {
      ...active.params,
      ...(preset.clipParams || {}),
      smoothMs: state.global.smoothMs,
      fftQuality: state.global.fftQuality,
    };
  }
  refs.modeSel.value = state.global.mode;
  refs.durationInput.value = String(Math.round(state.global.durationSec * 100));
  refs.smoothInput.value = String(Math.round(state.global.smoothMs));
  refs.fftSel.value = state.global.fftQuality;
  markDirty();
  updateUi();
  renderClips();
  setStatus(`PRESET: ${preset.name}`);
}

function renderClips() {
  refs.clips.innerHTML = "";
  for (let i = 0; i < state.clips.length; i += 1) {
    const clip = state.clips[i];
    const card = document.createElement("div");
    card.className = `clip${clip.id === state.activeClipId ? " active" : ""}`;

    const title = document.createElement("div");
    title.className = "row";
    title.style.justifyContent = "space-between";
    const left = document.createElement("strong");
    left.textContent = `#${i + 1} ${clip.name}`;
    const select = document.createElement("button");
    select.type = "button";
    select.textContent = clip.id === state.activeClipId ? "ACTIVE" : "SELECT";
    select.addEventListener("click", () => {
      state.activeClipId = clip.id;
      renderClips();
    });
    title.append(left, select);

    const img = document.createElement("img");
    img.className = "thumb";
    img.src = clip.thumbDataUrl;

    const meta = document.createElement("div");
    meta.className = "muted";
    meta.textContent = `${clip.mode} | ${clip.durationSec.toFixed(2)}S | ${clip.image.width}x${clip.image.height}`;

    const row1 = document.createElement("div");
    row1.className = "row";
    const modeSel = document.createElement("select");
    modeSel.innerHTML = `<option value="GRAM">GRAM</option><option value="SCAN">SCAN</option><option value="RGB_OSC">RGB_OSC</option>`;
    modeSel.value = clip.mode;
    modeSel.addEventListener("change", () => { clip.mode = modeSel.value; markDirty(); renderClips(); });
    const dur = document.createElement("input");
    dur.type = "number";
    dur.step = "0.1";
    dur.min = "0.1";
    dur.max = "16";
    dur.value = String(clip.durationSec.toFixed(2));
    dur.style.width = "80px";
    dur.addEventListener("change", () => {
      clip.durationSec = clamp(Number(dur.value) || 3, 0.1, 16);
      dur.value = String(clip.durationSec.toFixed(2));
      markDirty();
      renderClips();
    });
    row1.append(modeSel, dur);

    const row2 = document.createElement("div");
    row2.className = "row";
    const up = document.createElement("button");
    up.textContent = "UP";
    up.disabled = i === 0;
    up.addEventListener("click", () => {
      const tmp = state.clips[i - 1];
      state.clips[i - 1] = state.clips[i];
      state.clips[i] = tmp;
      markDirty();
      renderClips();
    });
    const down = document.createElement("button");
    down.textContent = "DOWN";
    down.disabled = i === state.clips.length - 1;
    down.addEventListener("click", () => {
      const tmp = state.clips[i + 1];
      state.clips[i + 1] = state.clips[i];
      state.clips[i] = tmp;
      markDirty();
      renderClips();
    });
    const del = document.createElement("button");
    del.textContent = "DELETE";
    del.addEventListener("click", () => {
      state.clips.splice(i, 1);
      if (state.activeClipId === clip.id) state.activeClipId = state.clips[0]?.id || null;
      markDirty();
      renderClips();
    });
    row2.append(up, down, del);

    card.append(title, img, meta, row1, row2);
    refs.clips.appendChild(card);
  }
  updateUi();
}

async function fileToClip(file) {
  const bmp = await createImageBitmap(file);
  const w = clamp(bmp.width, 8, 1024);
  const h = clamp(bmp.height, 8, 1024);
  const cvs = document.createElement("canvas");
  cvs.width = w;
  cvs.height = h;
  const cx = cvs.getContext("2d");
  cx.drawImage(bmp, 0, 0, w, h);
  const img = cx.getImageData(0, 0, w, h);
  const thumb = document.createElement("canvas");
  thumb.width = 320;
  thumb.height = 180;
  const tx = thumb.getContext("2d");
  tx.drawImage(cvs, 0, 0, thumb.width, thumb.height);
  return {
    id: `ptc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    image: {
      width: w,
      height: h,
      pixelsRGBA: new Uint8ClampedArray(img.data),
    },
    thumbDataUrl: thumb.toDataURL("image/jpeg", 0.86),
    durationSec: state.global.durationSec,
    mode: state.global.mode,
    params: {
      fftQuality: state.global.fftQuality,
      smoothMs: state.global.smoothMs,
      baseHz: 110,
      depth: 0.85,
      filterMaxHz: 10000,
      carrierHz: 110,
      spreadCents: 14,
    },
  };
}

async function openImageViaDialog() {
  const invoke = getInvoke();
  if (!invoke) return null;
  try {
    const path = await invoke("dialog_open_file", {
      defaultDir: String(runtime.paths?.mater || ""),
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
      dialogKey: "pictonal.loadImg",
    });
    if (!path) return null;
    const base64 = await invoke("read_file_base64", { path: String(path) });
    if (!base64) return null;
    const bytes = new Uint8Array(base64ToArrayBuffer(String(base64)));
    const fileName = String(path).split(/[\\/]/).pop() || "image.png";
    const type = /\.jpe?g$/i.test(fileName)
      ? "image/jpeg"
      : /\.webp$/i.test(fileName)
      ? "image/webp"
      : "image/png";
    return new File([bytes], fileName, { type });
  } catch {
    return null;
  }
}

async function saveWav() {
  if (!state.render.tempExists || !state.render.outBuffer) {
    setStatus("NO RENDER", true);
    return;
  }
  const result = await saveBlobWithDialog(audioBufferToWavBlob(state.render.outBuffer), outputFileName());
  setStatus(result === "saved" ? "WAV SAVED" : "SAVE CANCELLED", result !== "saved");
}

async function sendToLazy() {
  if (!state.render.tempExists || !state.render.outBuffer) {
    setStatus("NO RENDER", true);
    return;
  }
  const blob = audioBufferToWavBlob(state.render.outBuffer);
  const wavBytesBase64 = arrayBufferToBase64(await blob.arrayBuffer());
  const name = sanitizeName(outputFileName().replace(/\.wav$/i, ""));
  window.parent?.postMessage({
    type: "CLIPLIB_ADD",
    version: 1,
    target: "lazy",
    name,
    wavBytesBase64,
    meta: {
      sr: state.render.outBuffer.sr,
      channels: 2,
      frames: state.render.outBuffer.frames,
      durationSec: state.render.outBuffer.frames / state.render.outBuffer.sr,
      source: "pictonal",
    },
    source: "pictonal",
  }, "*");
  setStatus(`SENT ${name} TO LAZY`);
}

function serializeClip(clip) {
  return {
    id: clip.id,
    name: clip.name,
    durationSec: clip.durationSec,
    mode: clip.mode,
    params: { ...clip.params },
    thumbDataUrl: clip.thumbDataUrl,
    imageDataUrl: clip.imageDataUrl || clip.thumbDataUrl,
  };
}

async function imageDataUrlToClip(serialized) {
  const imgEl = new Image();
  const loaded = new Promise((resolve, reject) => {
    imgEl.onload = resolve;
    imgEl.onerror = reject;
  });
  imgEl.src = serialized.imageDataUrl;
  await loaded;
  const cvs = document.createElement("canvas");
  cvs.width = imgEl.naturalWidth || 320;
  cvs.height = imgEl.naturalHeight || 180;
  const cx = cvs.getContext("2d");
  cx.drawImage(imgEl, 0, 0);
  const img = cx.getImageData(0, 0, cvs.width, cvs.height);
  return {
    id: serialized.id || `ptc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: serialized.name || "image",
    durationSec: clamp(Number(serialized.durationSec) || 3, 0.1, 16),
    mode: ["GRAM", "SCAN", "RGB_OSC"].includes(serialized.mode) ? serialized.mode : "GRAM",
    params: { ...(serialized.params || {}) },
    thumbDataUrl: serialized.thumbDataUrl || serialized.imageDataUrl,
    imageDataUrl: serialized.imageDataUrl,
    image: {
      width: cvs.width,
      height: cvs.height,
      pixelsRGBA: new Uint8ClampedArray(img.data),
    },
  };
}

function serializeGrid() {
  return {
    w: state.grid.w,
    h: state.grid.h,
    paletteMode: state.grid.paletteMode,
    selectedIndex: state.grid.selectedIndex,
    tool: state.grid.tool,
    source: state.grid.source,
    compose: state.grid.compose,
    amount01: state.grid.amount01,
    mapMode: state.grid.mapMode,
    cellsBase64: arrayBufferToBase64(state.grid.cells.buffer),
  };
}

function restoreGrid(serialized) {
  if (!serialized || typeof serialized !== "object") return;
  const w = Number(serialized.w) || 32;
  const h = Number(serialized.h) || 16;
  if (w !== 32 || h !== 16) return;
  setGridPaletteMode(Number(serialized.paletteMode) || 8);
  const cells = serialized.cellsBase64 ? new Uint8Array(base64ToArrayBuffer(serialized.cellsBase64)) : null;
  if (cells && cells.length === state.grid.cells.length) {
    state.grid.cells.set(cells.subarray(0, state.grid.cells.length));
    for (let i = 0; i < state.grid.cells.length; i += 1) {
      state.grid.cells[i] = clamp(state.grid.cells[i], 0, state.grid.paletteMode - 1);
    }
  }
  state.grid.selectedIndex = clamp(Number(serialized.selectedIndex) || 1, 0, state.grid.paletteMode - 1);
  state.grid.tool = serialized.tool === "ERASE" ? "ERASE" : "PEN";
  state.grid.source = ["IMAGE", "GRID", "BOTH"].includes(serialized.source) ? serialized.source : "IMAGE";
  state.grid.compose = serialized.compose === "REPLACE" ? "REPLACE" : "OVERLAY";
  state.grid.amount01 = clamp(Number(serialized.amount01) || 0.7, 0, 1);
  state.grid.mapMode = serialized.mapMode === "TONE" ? "TONE" : "COLOR";
}

function bindEvents() {
  refs.loadImgBtn.addEventListener("click", async () => {
    const fromNative = await openImageViaDialog();
    if (fromNative) {
      try {
        const clip = await fileToClip(fromNative);
        clip.imageDataUrl = await new Promise((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result || clip.thumbDataUrl));
          fr.readAsDataURL(fromNative);
        });
        state.clips.push(clip);
        state.activeClipId = clip.id;
        markDirty();
        renderClips();
        setStatus(`IMAGE LOADED: ${fromNative.name}`);
      } catch (error) {
        setStatus(`LOAD FAILED: ${String(error?.message || error)}`, true);
      }
      return;
    }
    refs.imgInput.click();
  });
  refs.imgInput.addEventListener("change", async () => {
    const file = refs.imgInput.files?.[0];
    refs.imgInput.value = "";
    if (!file) return;
    try {
      const clip = await fileToClip(file);
      clip.imageDataUrl = await new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || clip.thumbDataUrl));
        fr.readAsDataURL(file);
      });
      state.clips.push(clip);
      state.activeClipId = clip.id;
      markDirty();
      renderClips();
      setStatus(`IMAGE LOADED: ${file.name}`);
    } catch (error) {
      setStatus(`LOAD FAILED: ${String(error?.message || error)}`, true);
    }
  });

  refs.modeSel.addEventListener("change", () => { state.global.mode = refs.modeSel.value; markDirty(); updateUi(); });
  refs.durationInput.addEventListener("input", () => {
    state.global.durationSec = clamp(Number(refs.durationInput.value) / 100, 0.1, 16);
    markDirty();
    updateUi();
  });
  refs.smoothInput.addEventListener("input", () => {
    state.global.smoothMs = clamp(Number(refs.smoothInput.value), 0, 100);
    markDirty();
    updateUi();
  });
  refs.normalizeBtn.addEventListener("click", () => { state.global.normalize = !state.global.normalize; markDirty(); updateUi(); });
  refs.fftSel.addEventListener("change", () => { state.global.fftQuality = refs.fftSel.value; markDirty(); updateUi(); });
  refs.overrideBtn.addEventListener("click", () => { state.global.clipOverride = !state.global.clipOverride; markDirty(); updateUi(); });
  refs.presetApplyBtn?.addEventListener("click", () => applyPresetById(refs.presetSel?.value));
  refs.presetSel?.addEventListener("change", () => applyPresetById(refs.presetSel?.value));

  refs.gridSourceSel?.addEventListener("change", () => {
    state.grid.source = refs.gridSourceSel.value;
    markDirty();
    updateUi();
  });
  refs.gridComposeSel?.addEventListener("change", () => {
    state.grid.compose = refs.gridComposeSel.value;
    markDirty();
    updateUi();
  });
  refs.gridAmountInput?.addEventListener("input", () => {
    state.grid.amount01 = clamp(Number(refs.gridAmountInput.value) / 100, 0, 1);
    markDirty();
    updateUi();
  });
  refs.gridMapSel?.addEventListener("change", () => {
    state.grid.mapMode = refs.gridMapSel.value;
    markDirty();
    updateUi();
  });
  refs.gridPaletteModeSel?.addEventListener("change", () => {
    setGridPaletteMode(Number(refs.gridPaletteModeSel.value));
    markDirty();
    renderGridPalette();
    drawGridCanvas();
    updateUi();
  });
  refs.gridToolSel?.addEventListener("change", () => {
    state.grid.tool = refs.gridToolSel.value;
    markDirty();
    updateUi();
  });
  refs.gridClearBtn?.addEventListener("click", () => clearGrid());
  refs.gridInvertBtn?.addEventListener("click", () => invertGrid());
  refs.gridRandomBtn?.addEventListener("click", () => randomizeGrid());
  refs.gridPresetApplyBtn?.addEventListener("click", () => applyGridPresetById(refs.gridPresetSel?.value));
  refs.gridPresetSel?.addEventListener("change", () => applyGridPresetById(refs.gridPresetSel?.value));

  refs.drawGridCanvas?.addEventListener("contextmenu", (event) => event.preventDefault());
  refs.drawGridCanvas?.addEventListener("pointerdown", (event) => {
    runtime.gridPointerDown = true;
    runtime.gridLastCell = -1;
    paintGridCell(pointerToGridCell(event), event);
    try { refs.drawGridCanvas.setPointerCapture(event.pointerId); } catch {}
  });
  refs.drawGridCanvas?.addEventListener("pointermove", (event) => {
    if (!runtime.gridPointerDown) return;
    paintGridCell(pointerToGridCell(event), event);
  });
  refs.drawGridCanvas?.addEventListener("pointerup", () => {
    runtime.gridPointerDown = false;
    runtime.gridLastCell = -1;
  });
  refs.drawGridCanvas?.addEventListener("pointerleave", () => {
    runtime.gridLastCell = -1;
  });

  refs.renderBtn.addEventListener("click", () => void renderAll());
  refs.playBtn.addEventListener("click", () => {
    if (state.render.playing || runtime.source) {
      stopPlayback();
    } else {
      void playRendered();
    }
  });
  refs.loopBtn.addEventListener("change", () => {
    state.render.loop = !!refs.loopBtn.checked;
    if (runtime.source) runtime.source.loop = state.render.loop;
    updateUi();
  });
  refs.saveBtn.addEventListener("click", () => void saveWav());
  refs.sendBtn.addEventListener("click", () => void sendToLazy());

  window.addEventListener("message", async (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.version !== 1 || typeof data.type !== "string") return;

    if (data.type === "PANIC_KILL") {
      stopPlayback();
      if (runtime.audioContext) {
        try { await runtime.audioContext.close(); } catch {}
        runtime.audioContext = null;
      }
      setStatus("PANIC KILL");
      return;
    }
    if (data.type === "AUDIO_RESET_DONE") {
      setStatus("AUDIO RESET READY");
      return;
    }
    if (data.type === "SESSION_EXPORT_REQ") {
      const includeOnlyDirty = data?.payload?.includeOnlyDirty !== false;
      const chunk = {
        schemaVersion: 1,
        transport: { playheadSec: Number(state.render.offsetSec) || 0, loopA: 0, loopB: runtime.durationSec || 0 },
        ui: { activeClipId: state.activeClipId },
        refs: {},
        dirty: Boolean(runtime.sessionDirty),
      };
      if (!includeOnlyDirty || runtime.sessionDirty) {
        chunk.heavy = {
          global: { ...state.global },
          grid: serializeGrid(),
          clips: state.clips.map(serializeClip),
          outputWavBase64: state.render.outBuffer ? arrayBufferToBase64(await audioBufferToWavBlob(state.render.outBuffer).arrayBuffer()) : null,
        };
      }
      window.parent?.postMessage({ type: "SESSION_EXPORT_RES", version: 1, payload: { moduleId: "pictonal", schemaVersion: 1, dirty: Boolean(runtime.sessionDirty), chunk } }, "*");
      return;
    }
    if (data.type === "SESSION_IMPORT") {
      try {
        const chunk = data?.payload?.chunk || {};
        state.render.offsetSec = clamp(Number(chunk?.transport?.playheadSec) || 0, 0, 1e9);
        state.activeClipId = chunk?.ui?.activeClipId || null;
        if (chunk.heavy) {
          if (chunk.heavy.global) state.global = { ...state.global, ...chunk.heavy.global };
          if (chunk.heavy.grid) restoreGrid(chunk.heavy.grid);
          if (Array.isArray(chunk.heavy.clips)) {
            const imported = [];
            for (const serialized of chunk.heavy.clips) {
              if (!serialized?.imageDataUrl) continue;
              imported.push(await imageDataUrlToClip(serialized));
            }
            state.clips = imported;
            if (!state.activeClipId) state.activeClipId = state.clips[0]?.id || null;
          }
          if (chunk.heavy.outputWavBase64) {
            const dec = await ensureAudioContext().decodeAudioData(base64ToArrayBuffer(chunk.heavy.outputWavBase64).slice(0));
            const L = new Float32Array(dec.getChannelData(0));
            const R = dec.numberOfChannels > 1 ? new Float32Array(dec.getChannelData(1)) : new Float32Array(L);
            state.render.outBuffer = { sr: dec.sampleRate, channels: 2, frames: dec.length, data: [L, R] };
          } else {
            state.render.outBuffer = null;
          }
        }
        stopPlayback();
        refs.modeSel.value = state.global.mode;
        refs.durationInput.value = String(Math.round(state.global.durationSec * 100));
        refs.smoothInput.value = String(Math.round(state.global.smoothMs));
        refs.fftSel.value = state.global.fftQuality;
        refs.gridSourceSel.value = state.grid.source;
        refs.gridComposeSel.value = state.grid.compose;
        refs.gridAmountInput.value = String(Math.round(state.grid.amount01 * 100));
        refs.gridMapSel.value = state.grid.mapMode;
        refs.gridPaletteModeSel.value = String(state.grid.paletteMode);
        refs.gridToolSel.value = state.grid.tool;
        renderGridPalette();
        drawGridCanvas();
        drawWave();
        renderClips();
        runtime.sessionDirty = false;
        setStatus("SESSION LOADED");
      } catch (error) {
        setStatus(`SESSION IMPORT FAILED: ${String(error?.message || error)}`, true);
      }
      return;
    }
    if (data.type === "SESSION_SAVED") {
      runtime.sessionDirty = false;
      setStatus("SESSION SAVED");
      return;
    }
    if (data.type === "DENARRATOR_GLOBAL_PLAY") {
      if (!state.render.playing && state.render.outBuffer) void playRendered();
      return;
    }
    if (data.type === "DENARRATOR_GLOBAL_STOP") {
      if (state.render.playing || runtime.source) stopPlayback();
      return;
    }
    if (data.type === "GLOBAL_PLAY_CLEAR") {
      if (runtime.playToken) {
        globalPlayStop(runtime.playToken);
        runtime.playToken = null;
      }
      return;
    }
    if (data.type === "PATHS_BROADCAST") {
      runtime.paths = data?.payload || null;
      return;
    }
    if (data.type === "UI_SQUISH_SET") {
      document.documentElement.classList.toggle("dn-squish", Boolean(data?.payload?.enabled));
      return;
    }
    if (data.type === "CLIPLIB_ADD_OK") {
      setStatus(`SENT: ${String(data.name || "clip")}`);
      return;
    }
    if (data.type === "CLIPLIB_ADD_ERR") {
      setStatus(`SEND FAILED: ${String(data.error || "error")}`, true);
      return;
    }
  });

  window.addEventListener("keydown", (event) => {
    if ((event.code === "Space" || event.key === " ") && !event.repeat) {
      const tag = String(event.target?.tagName || "").toUpperCase();
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT" && !event.target?.isContentEditable) {
        event.preventDefault();
        window.parent?.postMessage({ type: "DENARRATOR_GLOBAL_TOGGLE", version: 1 }, "*");
      }
    }
  });

  window.addEventListener("resize", () => {
    drawGridCanvas();
    drawWave();
  });
}

function init() {
  installTactileButtons(document);
  refs.modeSel.value = state.global.mode;
  refs.durationInput.value = String(Math.round(state.global.durationSec * 100));
  refs.smoothInput.value = String(Math.round(state.global.smoothMs));
  refs.fftSel.value = state.global.fftQuality;
  if (refs.presetSel) {
    refs.presetSel.innerHTML = PICTONAL_PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
  }
  if (refs.gridPresetSel) {
    refs.gridPresetSel.innerHTML = GRID_PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
  }
  refs.gridSourceSel.value = state.grid.source;
  refs.gridComposeSel.value = state.grid.compose;
  refs.gridAmountInput.value = String(Math.round(state.grid.amount01 * 100));
  refs.gridMapSel.value = state.grid.mapMode;
  refs.gridPaletteModeSel.value = String(state.grid.paletteMode);
  refs.gridToolSel.value = state.grid.tool;
  renderGridPalette();
  drawGridCanvas();
  bindEvents();
  updateUi();
  renderClips();
  drawWave();
  window.parent?.postMessage({ type: "PATHS_REQ", version: 1 }, "*");
}

init();
