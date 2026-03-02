const refs = {
  status: document.getElementById("status"),
  diagBtn: document.getElementById("diagBtn"),
  selftestBtn: document.getElementById("selftestBtn"),
  badgeModel: document.getElementById("badgeModel"),
  badgeField: document.getElementById("badgeField"),
  badgeView: document.getElementById("badgeView"),
  badgeSonify: document.getElementById("badgeSonify"),
  diagLog: document.getElementById("diagLog"),
  zInput: document.getElementById("zInput"),
  nInput: document.getElementById("nInput"),
  qnNInput: document.getElementById("qnNInput"),
  qnLInput: document.getElementById("qnLInput"),
  qnMInput: document.getElementById("qnMInput"),
  viewSel: document.getElementById("viewSel"),
  sonifySel: document.getElementById("sonifySel"),
  durInput: document.getElementById("durInput"),
  durVal: document.getElementById("durVal"),
  liftInput: document.getElementById("liftInput"),
  liftVal: document.getElementById("liftVal"),
  isoInput: document.getElementById("isoInput"),
  isoVal: document.getElementById("isoVal"),
  smoothInput: document.getElementById("smoothInput"),
  smoothVal: document.getElementById("smoothVal"),
  normBtn: document.getElementById("normBtn"),
  airbagBtn: document.getElementById("airbagBtn"),
  autorotBtn: document.getElementById("autorotBtn"),
  planeSel: document.getElementById("planeSel"),
  renderBtn: document.getElementById("renderBtn"),
  playBtn: document.getElementById("playBtn"),
  saveBtn: document.getElementById("saveBtn"),
  sendBtn: document.getElementById("sendBtn"),
  tempBadge: document.getElementById("tempBadge"),
  renderBar: document.getElementById("renderBar"),
  meta: document.getElementById("meta"),
  canvas: document.getElementById("viewCanvas"),
};

const state = {
  diag: false,
  modelMode: "HYDRO",
  Z: 8,
  N: 8,
  n: 3,
  l: 2,
  m: 0,
  realForm: "REAL",
  grid: { nx: 56, ny: 56, nz: 56 },
  extent: { rMax: 12.0 },
  normalize: { mode: "RMS", liftDb: 24, norm: true, airbag: true },
  viewMode: "ISO3D",
  slice: { axis: "Z", pos: 0.0, plane: "XY" },
  iso: { level: 0.22, smooth: 0.35, autoRotate: true },
  colors: { pos: "#e7a35f", neg: "#2a2b2d", bg: "#f5f2eb", line: "#2a2b2d" },
  sonifyMode: "SPEC",
  durationSec: 4.0,
  sonify: {
    spec: { fMin: 60, fMax: 12000, gamma: 0.7, minDb: -80, maxDb: -18, huePhase: true },
    path: { path: "SPIRAL", voices: 3, speed: 1.0, carrierHz: 110, depth: 0.9 },
    add: { partials: 32, baseHz: 55, spread: 0.6, noiseMix: 0.12 },
  },
  render: { busy: false, tempPath: null, tempExists: false, lastError: null, outBuffer: null },
  field: null,
};

const runtime = {
  audioCtx: null,
  playSource: null,
  playToken: null,
  paths: null,
  dirty: false,
  rotX: 0.68,
  rotY: 0.46,
  dragIso: null,
  raf: 0,
  diagLines: [],
  diagLastError: "",
  badges: { MODEL: false, FIELD: false, VIEW: false, SONIFY: false },
};

function clamp(v, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function clamp01(v) {
  return clamp(v, 0, 1);
}

function getInvoke() {
  const own = window.__TAURI__?.core?.invoke;
  if (typeof own === "function") return own;
  try {
    const parent = window.parent?.__TAURI__?.core?.invoke;
    if (typeof parent === "function") return parent;
  } catch {}
  return null;
}

function ensureAudioCtx() {
  if (!runtime.audioCtx) runtime.audioCtx = new AudioContext({ latencyHint: "playback" });
  return runtime.audioCtx;
}

function markDirty() {
  runtime.dirty = true;
}

function setStatus(msg, err = false) {
  refs.status.textContent = String(msg || "");
  refs.status.style.color = err ? "#e7a35f" : "#5e6164";
}

function pushDiag(line, err = false) {
  const stamp = new Date().toISOString().slice(11, 19);
  const item = `${stamp} ${err ? "ERR" : "OK"} ${line}`;
  runtime.diagLines.push(item);
  if (runtime.diagLines.length > 80) runtime.diagLines = runtime.diagLines.slice(-80);
  if (state.diag) {
    const header = runtime.diagLastError ? `LAST ERROR:\n${runtime.diagLastError}\n\n` : "";
    refs.diagLog.textContent = `${header}${runtime.diagLines.join("\n")}`;
  }
}

function setBadge(name, ok) {
  runtime.badges[name] = Boolean(ok);
  const el = name === "MODEL" ? refs.badgeModel
    : name === "FIELD" ? refs.badgeField
      : name === "VIEW" ? refs.badgeView
        : refs.badgeSonify;
  el.classList.toggle("ok", !!ok);
  el.classList.toggle("err", !ok);
  el.textContent = `${name} ${ok ? "OK" : "FAIL"}`;
}

function refreshDiagUi() {
  refs.diagBtn.setAttribute("aria-pressed", String(state.diag));
  refs.diagLog.classList.toggle("on", state.diag);
  if (state.diag) {
    const header = runtime.diagLastError ? `LAST ERROR:\n${runtime.diagLastError}\n\n` : "";
    refs.diagLog.textContent = `${header}${runtime.diagLines.join("\n")}`;
  }
}

function elementSymbol(Z) {
  const symbols = ["X", "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca"];
  return symbols[Z] || `Z${Z}`;
}

function refreshMetaUi() {
  refs.durVal.textContent = `${state.durationSec.toFixed(1)}s`;
  refs.liftVal.textContent = `${Math.round(state.normalize.liftDb)}dB`;
  refs.isoVal.textContent = state.iso.level.toFixed(2);
  refs.smoothVal.textContent = `${Math.round(state.iso.smooth * 100)}%`;
  refs.meta.textContent = `ELEMENT: ${elementSymbol(state.Z)} | CHARGE: ${state.Z - state.N}`;
  refs.normBtn.setAttribute("aria-pressed", String(state.normalize.norm));
  refs.normBtn.textContent = state.normalize.norm ? "On" : "Off";
  refs.airbagBtn.setAttribute("aria-pressed", String(state.normalize.airbag));
  refs.airbagBtn.textContent = state.normalize.airbag ? "On" : "Off";
  refs.autorotBtn.setAttribute("aria-pressed", String(state.iso.autoRotate));
  refs.autorotBtn.textContent = state.iso.autoRotate ? "On" : "Off";
  refs.tempBadge.textContent = state.render.tempExists ? "TEMP ON" : "TEMP OFF";
  refs.renderBar.classList.toggle("busy", state.render.busy);
  const canAct = Boolean(state.render.tempExists && state.render.outBuffer);
  refs.playBtn.disabled = !canAct;
  refs.saveBtn.disabled = !canAct;
  refs.sendBtn.disabled = !canAct;
}

function validateModelParams() {
  const prev = { n: state.n, l: state.l, m: state.m };
  state.Z = clamp(Math.round(state.Z), 1, 118);
  state.N = clamp(Math.round(state.N), 0, 126);
  state.n = clamp(Math.round(state.n), 1, 7);
  state.l = clamp(Math.round(state.l), 0, state.n - 1);
  state.m = clamp(Math.round(state.m), -state.l, state.l);

  refs.zInput.value = String(state.Z);
  refs.nInput.value = String(state.N);
  refs.qnNInput.value = String(state.n);
  refs.qnLInput.value = String(state.l);
  refs.qnMInput.value = String(state.m);

  const changed = prev.n !== state.n || prev.l !== state.l || prev.m !== state.m;
  if (changed) pushDiag(`MODEL CLAMP n:${prev.n}->${state.n} l:${prev.l}->${state.l} m:${prev.m}->${state.m}`);
  setBadge("MODEL", true);
  return true;
}

function associatedLaguerre(k, alpha, x) {
  if (k <= 0) return 1;
  if (k === 1) return 1 + alpha - x;
  let Lkm2 = 1;
  let Lkm1 = 1 + alpha - x;
  for (let n = 2; n <= k; n += 1) {
    const Lk = (((2 * n - 1 + alpha - x) * Lkm1) - ((n - 1 + alpha) * Lkm2)) / n;
    Lkm2 = Lkm1;
    Lkm1 = Lk;
  }
  return Lkm1;
}

function radialHydrogenic(n, l, r, zEff) {
  const rho = (2 * zEff * Math.max(1e-6, r)) / Math.max(1, n);
  const k = Math.max(0, n - l - 1);
  const lag = associatedLaguerre(k, 2 * l + 1, rho);
  return Math.exp(-0.5 * rho) * Math.pow(rho, l) * lag;
}

function angularReal(l, m, x, y, z, r) {
  const rn = Math.max(1e-9, r);
  const xn = x / rn;
  const yn = y / rn;
  const zn = z / rn;
  if (l === 0) return 1;
  if (l === 1) {
    if (m === -1) return yn;
    if (m === 0) return zn;
    if (m === 1) return xn;
  }
  if (l === 2) {
    if (m === -2) return xn * yn;
    if (m === -1) return yn * zn;
    if (m === 0) return (2 * zn * zn - xn * xn - yn * yn) * 0.5;
    if (m === 1) return xn * zn;
    if (m === 2) return (xn * xn - yn * yn) * 0.5;
  }
  // fallback for higher l not fully modeled in v2
  return Math.pow(zn, l - Math.abs(m)) * Math.pow(Math.max(1e-9, xn * xn + yn * yn), Math.abs(m) * 0.5);
}

function psiAt(x, y, z) {
  const r = Math.sqrt(x * x + y * y + z * z);
  const zEff = Math.max(1, state.Z - (state.modelMode === "HYDRO" ? 0 : 0.35 * Math.max(0, state.N - 1)));
  const R = radialHydrogenic(state.n, state.l, r, zEff);
  const Y = angularReal(state.l, state.m, x, y, z, r);
  return R * Y;
}

function sampleField3D() {
  const nx = state.grid.nx;
  const ny = state.grid.ny;
  const nz = state.grid.nz;
  const rMax = Math.max(4, Number(state.extent.rMax) || 12);
  const vals = new Float32Array(nx * ny * nz);
  let min = Infinity;
  let max = -Infinity;
  let sumSq = 0;
  let signPos = 0;
  let signNeg = 0;

  let ptr = 0;
  for (let iz = 0; iz < nz; iz += 1) {
    const z = ((iz / (nz - 1)) * 2 - 1) * rMax;
    for (let iy = 0; iy < ny; iy += 1) {
      const y = ((iy / (ny - 1)) * 2 - 1) * rMax;
      for (let ix = 0; ix < nx; ix += 1) {
        const x = ((ix / (nx - 1)) * 2 - 1) * rMax;
        const v = psiAt(x, y, z);
        vals[ptr++] = v;
        if (v < min) min = v;
        if (v > max) max = v;
        sumSq += v * v;
        if (v > 0) signPos += 1;
        if (v < 0) signNeg += 1;
      }
    }
  }

  const rms = Math.sqrt(sumSq / vals.length);
  const maxAbs = Math.max(Math.abs(min), Math.abs(max), 1e-9);
  state.field = { vals, nx, ny, nz, rMax, min, max, rms, maxAbs, signPos, signNeg };

  const nonZero = maxAbs > 1e-8;
  const signOk = state.l === 0 ? signPos > 0 : (signPos > 0 && signNeg > 0);
  const ok = nonZero && signOk;
  setBadge("FIELD", ok);
  if (ok) {
    pushDiag(`FIELD OK min=${min.toExponential(2)} max=${max.toExponential(2)} rms=${rms.toExponential(2)} pos=${signPos} neg=${signNeg}`);
  } else {
    pushDiag(`FIELD FAIL min=${min} max=${max} rms=${rms} pos=${signPos} neg=${signNeg}`, true);
  }
  return ok;
}

function fieldIndex(ix, iy, iz) {
  const { nx, ny } = state.field;
  return iz * nx * ny + iy * nx + ix;
}

function sampleSlice2D(plane = state.slice.plane, pos01 = 0.5, outW = 220, outH = 220) {
  const f = state.field;
  const arr = new Float32Array(outW * outH);
  for (let j = 0; j < outH; j += 1) {
    for (let i = 0; i < outW; i += 1) {
      const u = i / Math.max(1, outW - 1);
      const v = j / Math.max(1, outH - 1);
      let ix = Math.round(u * (f.nx - 1));
      let iy = Math.round(v * (f.ny - 1));
      let iz = Math.round(pos01 * (f.nz - 1));
      if (plane === "XZ") {
        ix = Math.round(u * (f.nx - 1));
        iz = Math.round(v * (f.nz - 1));
        iy = Math.round(pos01 * (f.ny - 1));
      } else if (plane === "YZ") {
        iy = Math.round(u * (f.ny - 1));
        iz = Math.round(v * (f.nz - 1));
        ix = Math.round(pos01 * (f.nx - 1));
      }
      arr[j * outW + i] = f.vals[fieldIndex(ix, iy, iz)];
    }
  }
  return arr;
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.floor(refs.canvas.clientWidth * ratio));
  const h = Math.max(1, Math.floor(refs.canvas.clientHeight * ratio));
  if (refs.canvas.width !== w || refs.canvas.height !== h) {
    refs.canvas.width = w;
    refs.canvas.height = h;
  }
  return { w, h, ratio };
}

function drawSlice2D(ctx, w, h) {
  const plane = refs.planeSel.value;
  const mapW = 240;
  const mapH = 240;
  const vals = sampleSlice2D(plane, 0.5, mapW, mapH);
  const maxAbs = state.field.maxAbs;
  const cellW = w / mapW;
  const cellH = h / mapH;

  for (let j = 0; j < mapH; j += 1) {
    for (let i = 0; i < mapW; i += 1) {
      const v = vals[j * mapW + i];
      const mag = Math.pow(Math.abs(v) / maxAbs, 0.68);
      const pos = v >= 0;
      const r = pos ? 231 : 58;
      const g = pos ? 163 : 60;
      const b = pos ? 95 : 62;
      ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0.03, mag * 0.88)})`;
      ctx.fillRect(i * cellW, j * cellH, Math.ceil(cellW) + 1, Math.ceil(cellH) + 1);
    }
  }

  ctx.strokeStyle = "rgba(42,43,45,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

function collectIsoPoints() {
  const f = state.field;
  const threshold = Math.max(1e-6, state.iso.level * f.maxAbs);
  const pts = [];
  const smoothT = clamp01(state.iso.smooth);
  const nx = f.nx;
  const ny = f.ny;
  const nz = f.nz;

  for (let iz = 1; iz < nz - 1; iz += 1) {
    const zN = (iz / (nz - 1)) * 2 - 1;
    for (let iy = 1; iy < ny - 1; iy += 1) {
      const yN = (iy / (ny - 1)) * 2 - 1;
      for (let ix = 1; ix < nx - 1; ix += 1) {
        const idx = fieldIndex(ix, iy, iz);
        const v = f.vals[idx];
        const absV = Math.abs(v);
        if (absV < threshold) continue;
        const sign = v >= 0 ? 1 : -1;

        let boundary = false;
        const nIdx = [
          fieldIndex(ix - 1, iy, iz), fieldIndex(ix + 1, iy, iz),
          fieldIndex(ix, iy - 1, iz), fieldIndex(ix, iy + 1, iz),
          fieldIndex(ix, iy, iz - 1), fieldIndex(ix, iy, iz + 1),
        ];
        for (let n = 0; n < nIdx.length; n += 1) {
          const nv = f.vals[nIdx[n]];
          if ((nv >= 0 ? 1 : -1) !== sign || Math.abs(nv) < threshold) {
            boundary = true;
            break;
          }
        }
        if (!boundary) continue;

        const xN = (ix / (nx - 1)) * 2 - 1;
        const alpha = Math.pow(absV / f.maxAbs, 0.65);
        pts.push({ x: xN, y: yN, z: zN, sign, alpha: lerp(alpha, alpha * 0.72, smoothT) });
      }
    }
  }
  return pts;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawIso3D(ctx, w, h) {
  const pts = collectIsoPoints();
  if (!pts.length) {
    setBadge("VIEW", false);
    pushDiag("VIEW FAIL no iso vertices (auto-lowering iso)", true);
    state.iso.level = Math.max(0.06, state.iso.level * 0.8);
    refs.isoInput.value = String(Math.round(state.iso.level * 100));
    refs.isoVal.textContent = state.iso.level.toFixed(2);
    return;
  }

  const cosY = Math.cos(runtime.rotY);
  const sinY = Math.sin(runtime.rotY);
  const cosX = Math.cos(runtime.rotX);
  const sinX = Math.sin(runtime.rotX);
  const cx = w * 0.5;
  const cy = h * 0.54;
  const scl = Math.min(w, h) * 0.34;

  const drawPts = [];
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const x1 = p.x * cosY - p.z * sinY;
    const z1 = p.x * sinY + p.z * cosY;
    const y1 = p.y * cosX - z1 * sinX;
    const z2 = p.y * sinX + z1 * cosX;
    const persp = 1 / (1 + z2 * 0.7);
    drawPts.push({
      sx: cx + x1 * scl * persp,
      sy: cy + y1 * scl * persp,
      depth: z2,
      sign: p.sign,
      alpha: p.alpha,
      size: 1.2 + 2.2 * p.alpha,
    });
  }

  drawPts.sort((a, b) => a.depth - b.depth);
  for (let i = 0; i < drawPts.length; i += 1) {
    const p = drawPts[i];
    const isPos = p.sign > 0;
    const r = isPos ? 231 : 52;
    const g = isPos ? 163 : 54;
    const b = isPos ? 95 : 56;
    ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0.12, p.alpha * 0.9)})`;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  setBadge("VIEW", true);
  pushDiag(`VIEW OK iso points=${drawPts.length}`);
}

function drawView() {
  const { w, h } = resizeCanvas();
  const ctx = refs.canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.46)";
  ctx.fillRect(0, 0, w, h);

  try {
    if (!state.field) {
      setBadge("VIEW", false);
      pushDiag("VIEW FAIL no field", true);
      return;
    }
    if (state.viewMode === "SLICE2D") {
      drawSlice2D(ctx, w, h);
      setBadge("VIEW", true);
      pushDiag("VIEW OK slice2d");
    } else {
      drawIso3D(ctx, w, h);
    }
  } catch (error) {
    runtime.diagLastError = String(error?.stack || error?.message || error);
    setBadge("VIEW", false);
    pushDiag(`VIEW EXC ${String(error?.message || error)}`, true);
  }
}

function sampleFieldNearest(x, y, z) {
  const f = state.field;
  const toIndex = (v, n) => clamp(Math.round(((v / f.rMax) * 0.5 + 0.5) * (n - 1)), 0, n - 1);
  const ix = toIndex(x, f.nx);
  const iy = toIndex(y, f.ny);
  const iz = toIndex(z, f.nz);
  return f.vals[fieldIndex(ix, iy, iz)];
}

function runSonifySpec(sr, frames) {
  const mapW = 180;
  const mapH = 64;
  const slice = sampleSlice2D("XY", 0.5, mapW, mapH);
  const fMin = state.sonify.spec.fMin;
  const fMax = state.sonify.spec.fMax;
  const gamma = clamp(state.sonify.spec.gamma, 0.2, 1.2);
  const bins = 28;
  const freqs = Array.from({ length: bins }, (_, i) => fMin * Math.pow(fMax / fMin, i / Math.max(1, bins - 1)));
  const phasesL = new Float64Array(bins);
  const phasesR = new Float64Array(bins);

  const outL = new Float32Array(frames);
  const outR = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) {
    const t01 = i / Math.max(1, frames - 1);
    const cx = Math.floor(t01 * (mapW - 1));
    let smL = 0;
    let smR = 0;
    for (let b = 0; b < bins; b += 1) {
      const row = Math.floor((b / Math.max(1, bins - 1)) * (mapH - 1));
      const v = slice[row * mapW + cx];
      const mag = Math.pow(Math.abs(v) / Math.max(1e-9, state.field.maxAbs), gamma);
      const signPhase = v >= 0 ? 0 : Math.PI;
      const inc = (2 * Math.PI * freqs[b]) / sr;
      phasesL[b] += inc;
      phasesR[b] += inc * (1 + 0.0008 * b);
      smL += Math.sin(phasesL[b] + signPhase) * mag;
      smR += Math.sin(phasesR[b] + signPhase * 0.8) * mag;
    }
    outL[i] = smL / bins;
    outR[i] = smR / bins;
  }
  return [outL, outR];
}

function runSonifyPath(sr, frames) {
  const outL = new Float32Array(frames);
  const outR = new Float32Array(frames);
  const baseHz = state.sonify.path.carrierHz;
  const depth = state.sonify.path.depth;
  let phL = 0;
  let phR = 0;
  for (let i = 0; i < frames; i += 1) {
    const t = i / Math.max(1, frames - 1);
    const r = 1.5 + t * state.extent.rMax * 0.72;
    const ang = t * Math.PI * 2 * (1.6 * state.sonify.path.speed + 0.2);
    const x = r * Math.cos(ang);
    const y = r * Math.sin(ang);
    const z = (t * 2 - 1) * state.extent.rMax * 0.5;
    const v = sampleFieldNearest(x, y, z) / Math.max(1e-9, state.field.maxAbs);
    const fm = v * 120 * depth;
    phL += (2 * Math.PI * (baseHz + fm)) / sr;
    phR += (2 * Math.PI * (baseHz * 1.006 + fm * 0.86)) / sr;
    const env = 0.45 + 0.55 * Math.abs(v);
    outL[i] = Math.sin(phL) * env;
    outR[i] = Math.sin(phR) * env;
  }
  return [outL, outR];
}

function runSonifyAdd(sr, frames) {
  const outL = new Float32Array(frames);
  const outR = new Float32Array(frames);
  const partials = clamp(Math.round(state.sonify.add.partials), 8, 48);
  const baseHz = state.sonify.add.baseHz;
  const spread = clamp01(state.sonify.add.spread);
  const noiseMix = clamp01(state.sonify.add.noiseMix);

  const energies = new Float32Array(partials);
  const f = state.field;
  const stride = Math.max(1, Math.floor(f.vals.length / 20000));
  for (let i = 0; i < f.vals.length; i += stride) {
    const e = Math.abs(f.vals[i]) / Math.max(1e-9, f.maxAbs);
    const band = Math.floor(((i / f.vals.length) * partials));
    energies[Math.min(partials - 1, Math.max(0, band))] += e;
  }
  let maxE = 1e-9;
  for (let i = 0; i < partials; i += 1) if (energies[i] > maxE) maxE = energies[i];

  const phasesL = new Float64Array(partials);
  const phasesR = new Float64Array(partials);
  for (let i = 0; i < frames; i += 1) {
    const t = i / Math.max(1, frames - 1);
    let smL = 0;
    let smR = 0;
    for (let p = 0; p < partials; p += 1) {
      const amp = Math.pow(energies[p] / maxE, 0.82);
      const hz = baseHz * (p + 1) * (1 + spread * 0.015 * p);
      const inc = (2 * Math.PI * hz) / sr;
      phasesL[p] += inc;
      phasesR[p] += inc * (1 + 0.0009 * p);
      smL += Math.sin(phasesL[p]) * amp;
      smR += Math.sin(phasesR[p]) * amp;
    }
    const noise = (Math.random() * 2 - 1) * noiseMix;
    outL[i] = smL / partials + noise;
    outR[i] = smR / partials + noise * 0.85;
  }
  return [outL, outR];
}

function applyPostFx(channels) {
  const [L, R] = channels;
  const frames = L.length;
  const liftDb = clamp(state.normalize.liftDb, 0, 36);
  const gamma = lerp(1.0, 0.35, liftDb / 36);

  let sumSq = 0;
  let peak = 1e-9;
  for (let i = 0; i < frames; i += 1) {
    L[i] = Math.sign(L[i]) * Math.pow(Math.abs(L[i]), gamma);
    R[i] = Math.sign(R[i]) * Math.pow(Math.abs(R[i]), gamma);
    sumSq += 0.5 * (L[i] * L[i] + R[i] * R[i]);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }

  const rms = Math.sqrt(sumSq / Math.max(1, frames));
  let gain = 1;
  if (state.normalize.norm) {
    gain = 0.92 / peak;
  }
  if (rms < Math.pow(10, -45 / 20)) {
    gain *= 2.4;
  }

  for (let i = 0; i < frames; i += 1) {
    L[i] *= gain;
    R[i] *= gain;
    if (state.normalize.airbag) {
      L[i] = Math.tanh(L[i] * 1.15);
      R[i] = Math.tanh(R[i] * 1.15);
    }
  }
}

function buildSonifyBuffer() {
  const sr = 48000;
  const frames = Math.max(1, Math.floor(state.durationSec * sr));
  let channels;
  if (state.sonifyMode === "PATH") {
    channels = runSonifyPath(sr, frames);
  } else if (state.sonifyMode === "ADD") {
    channels = runSonifyAdd(sr, frames);
  } else {
    channels = runSonifySpec(sr, frames);
  }
  applyPostFx(channels);

  let sumSq = 0;
  for (let i = 0; i < frames; i += 1) {
    sumSq += 0.5 * (channels[0][i] ** 2 + channels[1][i] ** 2);
  }
  const rms = Math.sqrt(sumSq / Math.max(1, frames));
  const rmsDb = 20 * Math.log10(Math.max(1e-9, rms));
  const ok = rmsDb > -45;
  setBadge("SONIFY", ok);
  if (ok) pushDiag(`SONIFY OK mode=${state.sonifyMode} rms=${rmsDb.toFixed(1)}dBFS`);
  else pushDiag(`SONIFY LOW mode=${state.sonifyMode} rms=${rmsDb.toFixed(1)}dBFS`, true);

  return {
    sr,
    frames,
    ch: channels,
  };
}

function encodeWav(rendered) {
  const channels = 2;
  const len = rendered.frames;
  const sr = rendered.sr;
  const ab = new ArrayBuffer(44 + len * channels * 2);
  const dv = new DataView(ab);
  const write = (off, text) => { for (let i = 0; i < text.length; i += 1) dv.setUint8(off + i, text.charCodeAt(i)); };

  write(0, "RIFF");
  dv.setUint32(4, 36 + len * channels * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, channels, true);
  dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * channels * 2, true);
  dv.setUint16(32, channels * 2, true);
  dv.setUint16(34, 16, true);
  write(36, "data");
  dv.setUint32(40, len * channels * 2, true);

  const L = rendered.ch[0];
  const R = rendered.ch[1];
  let ptr = 44;
  for (let i = 0; i < len; i += 1) {
    const lv = clamp(L[i], -1, 1);
    const rv = clamp(R[i], -1, 1);
    dv.setInt16(ptr, lv < 0 ? lv * 0x8000 : lv * 0x7fff, true);
    ptr += 2;
    dv.setInt16(ptr, rv < 0 ? rv * 0x8000 : rv * 0x7fff, true);
    ptr += 2;
  }
  return new Blob([ab], { type: "audio/wav" });
}

function arrayBufferToBase64(ab) {
  const bytes = new Uint8Array(ab);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function stopPlayback() {
  if (runtime.playSource) {
    try { runtime.playSource.stop(); } catch {}
    try { runtime.playSource.disconnect(); } catch {}
    runtime.playSource = null;
  }
  refs.playBtn.setAttribute("aria-pressed", "false");
  refs.playBtn.textContent = "Play";
  if (runtime.playToken) {
    window.parent?.postMessage({ type: "GLOBAL_PLAY_STOP", version: 1, payload: { token: runtime.playToken } }, "*");
    runtime.playToken = null;
  }
}

function startPlayback() {
  if (!state.render.tempExists || !state.render.outBuffer) {
    setStatus("Render first", true);
    return;
  }
  if (runtime.playSource) {
    stopPlayback();
    return;
  }
  const ctx = ensureAudioCtx();
  const b = ctx.createBuffer(2, state.render.outBuffer.frames, state.render.outBuffer.sr);
  b.copyToChannel(state.render.outBuffer.ch[0], 0);
  b.copyToChannel(state.render.outBuffer.ch[1], 1);
  const src = ctx.createBufferSource();
  src.buffer = b;
  src.connect(ctx.destination);
  src.onended = () => {
    if (runtime.playSource === src) stopPlayback();
  };
  src.start(0);
  runtime.playSource = src;
  refs.playBtn.setAttribute("aria-pressed", "true");
  refs.playBtn.textContent = "Pause";
  const token = `particles_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  runtime.playToken = token;
  window.parent?.postMessage({ type: "GLOBAL_PLAY_START", version: 1, payload: { token, moduleId: "particles", source: "preview" } }, "*");
}

async function saveWav() {
  if (!state.render.outBuffer) {
    setStatus("No render", true);
    return;
  }
  try {
    const blob = encodeWav(state.render.outBuffer);
    const invoke = getInvoke();
    if (invoke) {
      const path = await invoke("dialog_save_file", {
        defaultDir: String(runtime.paths?.mater || ""),
        suggestedName: `particles_${Date.now()}.wav`,
        filters: [{ name: "WAV", extensions: ["wav"] }],
        dialogKey: "particles.saveWav",
      });
      if (!path) {
        setStatus("Save cancelled");
        return;
      }
      const ok = await invoke("save_blob_to_path", { dataBase64: arrayBufferToBase64(await blob.arrayBuffer()), path: String(path) });
      setStatus(ok ? "WAV saved" : "Save failed", !ok);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `particles_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus("WAV saved");
  } catch (error) {
    setStatus(`Save failed: ${String(error?.message || error)}`, true);
  }
}

async function sendToLazy() {
  if (!state.render.outBuffer) {
    setStatus("No render", true);
    return;
  }
  const blob = encodeWav(state.render.outBuffer);
  const b64 = arrayBufferToBase64(await blob.arrayBuffer());
  window.parent?.postMessage({
    type: "CLIPLIB_ADD",
    version: 1,
    target: "lazy",
    name: `particles_${state.n}${state.l}${state.m}_${Date.now()}`,
    wavBytesBase64: b64,
    meta: { sr: state.render.outBuffer.sr, channels: 2, frames: state.render.outBuffer.frames, durationSec: state.durationSec },
  }, "*");
  setStatus("Sent to Lazy");
}

function runAuditAndView() {
  runtime.diagLastError = "";
  try {
    const modelOk = validateModelParams();
    if (!modelOk) return false;
    const fieldOk = sampleField3D();
    if (!fieldOk) return false;
    drawView();
    return runtime.badges.MODEL && runtime.badges.FIELD && runtime.badges.VIEW;
  } catch (error) {
    runtime.diagLastError = String(error?.stack || error?.message || error);
    setBadge("MODEL", false);
    setBadge("FIELD", false);
    setBadge("VIEW", false);
    pushDiag(`AUDIT EXC ${String(error?.message || error)}`, true);
    return false;
  }
}

async function renderParticlesAudio() {
  if (state.render.busy) return;
  state.render.busy = true;
  state.render.lastError = null;
  refreshMetaUi();
  setStatus("Rendering...");

  try {
    const preOk = runAuditAndView();
    if (!preOk) throw new Error("audit failed before sonify");

    const outBuffer = buildSonifyBuffer();
    state.render.outBuffer = outBuffer;
    state.render.tempExists = true;

    const invoke = getInvoke();
    if (invoke) {
      try {
        const wavBytesBase64 = arrayBufferToBase64(await encodeWav(outBuffer).arrayBuffer());
        const tempPath = await invoke("write_temp_wav", { moduleId: "particles", wavBytesBase64 });
        state.render.tempPath = tempPath ? String(tempPath) : null;
      } catch (tempErr) {
        pushDiag(`TEMP WRITE WARN ${String(tempErr?.message || tempErr)}`, true);
      }
    }

    markDirty();
    setStatus(`Render done (${outBuffer.frames}f)`);
  } catch (error) {
    state.render.lastError = String(error?.message || error);
    runtime.diagLastError = String(error?.stack || error?.message || error);
    state.render.tempExists = false;
    setBadge("SONIFY", false);
    setStatus(`Render failed: ${state.render.lastError}`, true);
    pushDiag(`RENDER FAIL ${state.render.lastError}`, true);
  } finally {
    state.render.busy = false;
    refreshMetaUi();
  }
}

async function runSelfTest() {
  const snapshot = {
    Z: state.Z,
    N: state.N,
    n: state.n,
    l: state.l,
    m: state.m,
    sonifyMode: state.sonifyMode,
    durationSec: state.durationSec,
    viewMode: state.viewMode,
  };
  try {
    setStatus("Selftest running...");
    state.Z = 1;
    state.N = 1;
    state.n = 3;
    state.l = 2;
    state.m = 0;
    state.sonifyMode = "SPEC";
    state.durationSec = 4.0;
    state.viewMode = "ISO3D";

    refs.zInput.value = String(state.Z);
    refs.nInput.value = String(state.N);
    refs.qnNInput.value = String(state.n);
    refs.qnLInput.value = String(state.l);
    refs.qnMInput.value = String(state.m);
    refs.sonifySel.value = state.sonifyMode;
    refs.durInput.value = String(Math.round(state.durationSec * 100));
    refs.viewSel.value = state.viewMode;

    refreshMetaUi();
    const ok = runAuditAndView();
    if (!ok) throw new Error("view pipeline failed");
    await renderParticlesAudio();
    if (!state.render.tempExists || !state.render.outBuffer) throw new Error("sonify/render produced no output");
    startPlayback();
    setStatus("Selftest passed");
    pushDiag("SELFTEST PASS generate->view->sonify->play");
  } catch (error) {
    runtime.diagLastError = String(error?.stack || error?.message || error);
    setStatus(`Selftest failed: ${String(error?.message || error)}`, true);
    pushDiag(`SELFTEST FAIL ${String(error?.message || error)}`, true);
  } finally {
    // keep current test params visible for immediate troubleshooting.
    void snapshot;
  }
}

function exportSessionChunk(includeOnlyDirty = true) {
  const chunk = {
    schemaVersion: 2,
    transport: { playheadSec: 0, loopA: 0, loopB: state.durationSec },
    ui: {},
    refs: {},
    dirty: Boolean(runtime.dirty),
  };
  if (!includeOnlyDirty || runtime.dirty) {
    chunk.heavy = {
      diag: state.diag,
      modelMode: state.modelMode,
      Z: state.Z,
      N: state.N,
      n: state.n,
      l: state.l,
      m: state.m,
      viewMode: state.viewMode,
      sonifyMode: state.sonifyMode,
      durationSec: state.durationSec,
      liftDb: state.normalize.liftDb,
      norm: state.normalize.norm,
      airbag: state.normalize.airbag,
      isoLevel: state.iso.level,
      isoSmooth: state.iso.smooth,
      autoRotate: state.iso.autoRotate,
      plane: state.slice.plane,
      renderedWavBase64: null,
    };
  }
  return chunk;
}

async function importSessionChunk(chunk) {
  const heavy = chunk?.heavy;
  if (!heavy) return;

  state.diag = Boolean(heavy.diag);
  state.modelMode = String(heavy.modelMode || "HYDRO");
  state.Z = clamp(Math.round(heavy.Z), 1, 118);
  state.N = clamp(Math.round(heavy.N), 0, 126);
  state.n = clamp(Math.round(heavy.n), 1, 7);
  state.l = clamp(Math.round(heavy.l), 0, state.n - 1);
  state.m = clamp(Math.round(heavy.m), -state.l, state.l);
  state.viewMode = heavy.viewMode === "SLICE2D" ? "SLICE2D" : "ISO3D";
  state.sonifyMode = ["SPEC", "PATH", "ADD"].includes(heavy.sonifyMode) ? heavy.sonifyMode : "SPEC";
  state.durationSec = clamp(Number(heavy.durationSec), 1, 8);
  state.normalize.liftDb = clamp(Number(heavy.liftDb), 0, 36);
  state.normalize.norm = heavy.norm !== false;
  state.normalize.airbag = heavy.airbag !== false;
  state.iso.level = clamp(Number(heavy.isoLevel), 0.04, 0.8);
  state.iso.smooth = clamp(Number(heavy.isoSmooth), 0, 1);
  state.iso.autoRotate = heavy.autoRotate !== false;
  state.slice.plane = ["XY", "XZ", "YZ"].includes(heavy.plane) ? heavy.plane : "XY";

  refs.zInput.value = String(state.Z);
  refs.nInput.value = String(state.N);
  refs.qnNInput.value = String(state.n);
  refs.qnLInput.value = String(state.l);
  refs.qnMInput.value = String(state.m);
  refs.viewSel.value = state.viewMode;
  refs.sonifySel.value = state.sonifyMode;
  refs.durInput.value = String(Math.round(state.durationSec * 100));
  refs.liftInput.value = String(Math.round(state.normalize.liftDb));
  refs.isoInput.value = String(Math.round(state.iso.level * 100));
  refs.smoothInput.value = String(Math.round(state.iso.smooth * 100));
  refs.planeSel.value = state.slice.plane;

  if (heavy.renderedWavBase64) {
    try {
      const ctx = ensureAudioCtx();
      const decoded = await ctx.decodeAudioData(base64ToArrayBuffer(heavy.renderedWavBase64).slice(0));
      state.render.outBuffer = {
        sr: decoded.sampleRate,
        frames: decoded.length,
        ch: [new Float32Array(decoded.getChannelData(0)), new Float32Array(decoded.numberOfChannels > 1 ? decoded.getChannelData(1) : decoded.getChannelData(0))],
      };
      state.render.tempExists = true;
    } catch {
      state.render.outBuffer = null;
      state.render.tempExists = false;
    }
  }

  runtime.dirty = false;
  refreshDiagUi();
  refreshMetaUi();
  runAuditAndView();
}

function bindUi() {
  refs.diagBtn.addEventListener("click", () => {
    state.diag = !state.diag;
    refreshDiagUi();
  });
  refs.selftestBtn.addEventListener("click", () => { void runSelfTest(); });

  refs.zInput.addEventListener("change", () => { state.Z = Number(refs.zInput.value); markDirty(); refreshMetaUi(); runAuditAndView(); });
  refs.nInput.addEventListener("change", () => { state.N = Number(refs.nInput.value); markDirty(); refreshMetaUi(); runAuditAndView(); });
  refs.qnNInput.addEventListener("change", () => { state.n = Number(refs.qnNInput.value); markDirty(); refreshMetaUi(); runAuditAndView(); });
  refs.qnLInput.addEventListener("change", () => { state.l = Number(refs.qnLInput.value); markDirty(); refreshMetaUi(); runAuditAndView(); });
  refs.qnMInput.addEventListener("change", () => { state.m = Number(refs.qnMInput.value); markDirty(); refreshMetaUi(); runAuditAndView(); });

  refs.viewSel.addEventListener("change", () => { state.viewMode = refs.viewSel.value; markDirty(); runAuditAndView(); });
  refs.sonifySel.addEventListener("change", () => { state.sonifyMode = refs.sonifySel.value; markDirty(); });
  refs.durInput.addEventListener("input", () => { state.durationSec = clamp(Number(refs.durInput.value) / 100, 1, 8); markDirty(); refreshMetaUi(); });
  refs.liftInput.addEventListener("input", () => { state.normalize.liftDb = clamp(Number(refs.liftInput.value), 0, 36); markDirty(); refreshMetaUi(); });
  refs.isoInput.addEventListener("input", () => { state.iso.level = clamp(Number(refs.isoInput.value) / 100, 0.04, 0.8); markDirty(); refreshMetaUi(); drawView(); });
  refs.smoothInput.addEventListener("input", () => { state.iso.smooth = clamp(Number(refs.smoothInput.value) / 100, 0, 1); markDirty(); refreshMetaUi(); drawView(); });
  refs.planeSel.addEventListener("change", () => { state.slice.plane = refs.planeSel.value; markDirty(); drawView(); });

  refs.normBtn.addEventListener("click", () => { state.normalize.norm = !state.normalize.norm; markDirty(); refreshMetaUi(); });
  refs.airbagBtn.addEventListener("click", () => { state.normalize.airbag = !state.normalize.airbag; markDirty(); refreshMetaUi(); });
  refs.autorotBtn.addEventListener("click", () => { state.iso.autoRotate = !state.iso.autoRotate; markDirty(); refreshMetaUi(); });

  refs.renderBtn.addEventListener("click", () => { void renderParticlesAudio(); });
  refs.playBtn.addEventListener("click", () => { startPlayback(); });
  refs.saveBtn.addEventListener("click", () => { void saveWav(); });
  refs.sendBtn.addEventListener("click", () => { void sendToLazy(); });

  refs.canvas.addEventListener("pointerdown", (ev) => {
    runtime.dragIso = { x: ev.clientX, y: ev.clientY, rotX: runtime.rotX, rotY: runtime.rotY };
    try { refs.canvas.setPointerCapture(ev.pointerId); } catch {}
  });
  refs.canvas.addEventListener("pointermove", (ev) => {
    if (!runtime.dragIso) return;
    const dx = ev.clientX - runtime.dragIso.x;
    const dy = ev.clientY - runtime.dragIso.y;
    runtime.rotY = runtime.dragIso.rotY + dx * 0.006;
    runtime.rotX = clamp(runtime.dragIso.rotX + dy * 0.006, -1.35, 1.35);
    drawView();
  });
  refs.canvas.addEventListener("pointerup", () => { runtime.dragIso = null; });
  refs.canvas.addEventListener("pointercancel", () => { runtime.dragIso = null; });

  window.addEventListener("resize", () => drawView());

  window.addEventListener("message", async (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.version !== 1) return;

    if (data.type === "PATHS_BROADCAST") {
      runtime.paths = data.payload || null;
      return;
    }
    if (data.type === "SESSION_EXPORT_REQ") {
      const includeOnlyDirty = data?.payload?.includeOnlyDirty !== false;
      const chunk = exportSessionChunk(includeOnlyDirty);
      if (chunk.heavy && state.render.outBuffer) {
        chunk.heavy.renderedWavBase64 = arrayBufferToBase64(await encodeWav(state.render.outBuffer).arrayBuffer());
      }
      window.parent?.postMessage({
        type: "SESSION_EXPORT_RES",
        version: 1,
        payload: { moduleId: "particles", schemaVersion: 2, dirty: Boolean(runtime.dirty), chunk },
      }, "*");
      return;
    }
    if (data.type === "SESSION_IMPORT") {
      try {
        await importSessionChunk(data?.payload?.chunk || {});
        setStatus("Session loaded");
      } catch (error) {
        setStatus(`Session import failed: ${String(error?.message || error)}`, true);
      }
      return;
    }
    if (data.type === "SESSION_SAVED") {
      runtime.dirty = false;
      setStatus("Session saved");
      return;
    }
    if (data.type === "PANIC_KILL" || data.type === "DENARRATOR_GLOBAL_STOP" || data.type === "GLOBAL_PLAY_CLEAR") {
      stopPlayback();
      return;
    }
    if (data.type === "DENARRATOR_GLOBAL_PLAY") {
      if (!runtime.playSource && state.render.tempExists) startPlayback();
      return;
    }
  });
}

function animate() {
  if (state.viewMode === "ISO3D" && state.iso.autoRotate && !runtime.dragIso) {
    runtime.rotY += 0.0035;
    drawView();
  }
  runtime.raf = requestAnimationFrame(animate);
}

function init() {
  refreshDiagUi();
  refreshMetaUi();
  bindUi();
  const ok = runAuditAndView();
  setStatus(ok ? "Ready" : "Audit warning", !ok);
  window.parent?.postMessage({ type: "PATHS_REQ", version: 1 }, "*");
  runtime.raf = requestAnimationFrame(animate);
}

init();
