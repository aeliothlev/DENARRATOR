import { clamp } from "../utils/math.js";

const PARAM_META = {
  power: { key: "p", min: 0.1, max: 4 },
  saturation: { key: "k", min: 0, max: 10 },
  selfInteraction: { key: "alpha", min: -2, max: 2 },
  globalMatrix: { key: "a", min: -1, max: 1 },
  timeStretch: { key: "lambda", min: 0.25, max: 4 },
};

const VALID_INPUTS = new Set(["clipA", "sine", "square", "saw", "noise", "impulse"]);
const VALID_SOURCES = new Set(["constant", "waveA", "waveB"]);
const VALID_PERM_MODES = new Set(["identity", "reverse", "block-swap", "random-seeded"]);
const VALID_MIRROR_MODES = new Set(["mirror1", "mirror2"]);
const VALID_MIRROR1_MODES = new Set(["replace", "extend"]);
const VALID_MIRROR_SIDES = new Set(["left-right", "right-left"]);

function toBool(value, fallback = false) {
  const s = String(value ?? "").toLowerCase().trim();
  if (s === "1" || s === "true" || s === "on" || s === "yes") return true;
  if (s === "0" || s === "false" || s === "off" || s === "no") return false;
  return fallback;
}

function toFinite(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeParam(type, param = {}) {
  const meta = PARAM_META[type];
  if (!meta) return param;
  const source = VALID_SOURCES.has(param.source) ? param.source : "constant";
  const value = clamp(toFinite(param.value, 0), meta.min, meta.max);
  return { value, source };
}

function tokenize(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function parseKvTokens(tokens) {
  const out = {};
  for (const token of tokens) {
    const eq = token.indexOf("=");
    if (eq <= 0) continue;
    const key = token.slice(0, eq).trim();
    const value = token.slice(eq + 1).trim();
    if (!key) continue;
    out[key] = value;
  }
  return out;
}

function serializeOperator(operator) {
  if (operator.type === "permutation") {
    return [
      "op",
      operator.type,
      `enabled=${Boolean(operator.enabled)}`,
      `mode=${operator.mode || "identity"}`,
      `seed=${Math.max(1, Math.round(toFinite(operator.seed, 1)))}`,
    ].join(" ");
  }
  if (operator.type === "mirror") {
    const mode = VALID_MIRROR_MODES.has(operator.mode) ? operator.mode : "mirror1";
    const mirror1Mode = VALID_MIRROR1_MODES.has(operator?.mirror1?.mode) ? operator.mirror1.mode : "replace";
    const mirror1Side = VALID_MIRROR_SIDES.has(operator?.mirror1?.side) ? operator.mirror1.side : "left-right";
    return [
      "op",
      operator.type,
      `enabled=${Boolean(operator.enabled)}`,
      `mode=${mode}`,
      `t0=${clamp(toFinite(operator.t0Norm, 0.5), 0, 1)}`,
      `zeroSnap=${Boolean(operator.zeroSnap)}`,
      `m1.mode=${mirror1Mode}`,
      `m1.crossfade=${clamp(toFinite(operator?.mirror1?.crossfade, 0), 0, 1)}`,
      `m1.blend=${clamp(toFinite(operator?.mirror1?.blend, 1), 0, 1)}`,
      `m1.side=${mirror1Side}`,
      `m2.width=${clamp(toFinite(operator?.mirror2?.projectionWidth, 0.35), 0.001, 1)}`,
      `m2.smooth=${clamp(toFinite(operator?.mirror2?.envelopeSmoothness, 64), 1, 4096)}`,
      `m2.intensity=${clamp(toFinite(operator?.mirror2?.intensity, 1), 0, 1)}`,
      `m2.normalizeA=${Boolean(operator?.mirror2?.normalizeA)}`,
      `m2.signed=${Boolean(operator?.mirror2?.signedMorphology)}`,
      `m2.reverse=${Boolean(operator?.mirror2?.reverseMorphology)}`,
    ].join(" ");
  }
  const meta = PARAM_META[operator.type];
  if (!meta) return "";
  const param = normalizeParam(operator.type, operator.param);
  return [
    "op",
    operator.type,
    `enabled=${Boolean(operator.enabled)}`,
    `${meta.key}.value=${param.value}`,
    `${meta.key}.source=${param.source}`,
  ].join(" ");
}

function parseOperatorLine(line, byType) {
  const parts = line.split(/\s+/);
  if (parts.length < 2 || parts[0] !== "op") return;
  const type = parts[1];
  const current = byType.get(type);
  if (!current) return;

  const kv = parseKvTokens(parts.slice(2));
  const next = { ...current };
  next.enabled = toBool(kv.enabled, Boolean(current.enabled));

  if (type === "permutation") {
    next.mode = VALID_PERM_MODES.has(kv.mode) ? kv.mode : current.mode;
    next.seed = Math.max(1, Math.round(toFinite(kv.seed, current.seed)));
    byType.set(type, next);
    return;
  }
  if (type === "mirror") {
    next.mode = VALID_MIRROR_MODES.has(kv.mode) ? kv.mode : (VALID_MIRROR_MODES.has(current.mode) ? current.mode : "mirror1");
    next.t0Norm = clamp(toFinite(kv.t0, current.t0Norm ?? 0.5), 0, 1);
    next.zeroSnap = toBool(kv.zeroSnap, Boolean(current.zeroSnap));
    next.mirror1 = {
      ...current.mirror1,
      mode: VALID_MIRROR1_MODES.has(kv["m1.mode"]) ? kv["m1.mode"] : (VALID_MIRROR1_MODES.has(current?.mirror1?.mode) ? current.mirror1.mode : "replace"),
      crossfade: clamp(toFinite(kv["m1.crossfade"], current?.mirror1?.crossfade ?? 0), 0, 1),
      blend: clamp(toFinite(kv["m1.blend"], current?.mirror1?.blend ?? 1), 0, 1),
      side: VALID_MIRROR_SIDES.has(kv["m1.side"]) ? kv["m1.side"] : (VALID_MIRROR_SIDES.has(current?.mirror1?.side) ? current.mirror1.side : "left-right"),
    };
    next.mirror2 = {
      ...current.mirror2,
      projectionWidth: clamp(toFinite(kv["m2.width"], current?.mirror2?.projectionWidth ?? 0.35), 0.001, 1),
      envelopeSmoothness: clamp(toFinite(kv["m2.smooth"], current?.mirror2?.envelopeSmoothness ?? 64), 1, 4096),
      intensity: clamp(toFinite(kv["m2.intensity"], current?.mirror2?.intensity ?? 1), 0, 1),
      normalizeA: toBool(kv["m2.normalizeA"], Boolean(current?.mirror2?.normalizeA)),
      signedMorphology: toBool(kv["m2.signed"], Boolean(current?.mirror2?.signedMorphology)),
      reverseMorphology: toBool(kv["m2.reverse"], Boolean(current?.mirror2?.reverseMorphology)),
    };
    byType.set(type, next);
    return;
  }

  const meta = PARAM_META[type];
  const currentParam = normalizeParam(type, current.param);
  const valueKey = `${meta.key}.value`;
  const sourceKey = `${meta.key}.source`;
  const source = VALID_SOURCES.has(kv[sourceKey]) ? kv[sourceKey] : currentParam.source;
  const value = clamp(toFinite(kv[valueKey], currentParam.value), meta.min, meta.max);
  next.param = { value, source };
  byType.set(type, next);
}

export function serializeAlgebraDsl(algebra) {
  const lines = [
    "# Wave Algebra Chain v1",
    `input=${algebra.inputMode}`,
    `overlay=${Boolean(algebra.overlayOriginal)}`,
    `generator.frequency=${toFinite(algebra.generator?.frequency, 220)}`,
    `generator.lengthMs=${toFinite(algebra.generator?.lengthMs, 1200)}`,
    `generator.seed=${Math.max(1, Math.round(toFinite(algebra.generator?.seed, 1)))}`,
  ];

  for (const operator of algebra.operators || []) {
    const line = serializeOperator(operator);
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

export function parseAlgebraDsl(content, currentAlgebra) {
  const next = structuredClone(currentAlgebra);
  const byType = new Map((next.operators || []).map((op) => [op.type, op]));
  const lines = tokenize(content);

  for (const line of lines) {
    if (line.startsWith("op ")) {
      parseOperatorLine(line, byType);
      continue;
    }

    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();

    if (key === "input") {
      next.inputMode = VALID_INPUTS.has(value) ? value : next.inputMode;
      continue;
    }
    if (key === "overlay") {
      next.overlayOriginal = toBool(value, Boolean(next.overlayOriginal));
      continue;
    }
    if (key === "generator.frequency") {
      next.generator.frequency = clamp(toFinite(value, next.generator.frequency), 20, 4000);
      continue;
    }
    if (key === "generator.lengthMs") {
      next.generator.lengthMs = clamp(toFinite(value, next.generator.lengthMs), 20, 8000);
      continue;
    }
    if (key === "generator.seed") {
      next.generator.seed = Math.max(1, Math.round(toFinite(value, next.generator.seed)));
    }
  }

  next.operators = (next.operators || []).map((operator) => {
    const parsed = byType.get(operator.type) || operator;
    if (parsed.type === "permutation") {
      return {
        ...parsed,
        mode: VALID_PERM_MODES.has(parsed.mode) ? parsed.mode : "identity",
        seed: Math.max(1, Math.round(toFinite(parsed.seed, 1))),
      };
    }
    if (parsed.type === "mirror") {
      return {
        ...parsed,
        mode: VALID_MIRROR_MODES.has(parsed.mode) ? parsed.mode : "mirror1",
        t0Norm: clamp(toFinite(parsed.t0Norm, 0.5), 0, 1),
        zeroSnap: Boolean(parsed.zeroSnap),
        mirror1: {
          mode: VALID_MIRROR1_MODES.has(parsed?.mirror1?.mode) ? parsed.mirror1.mode : "replace",
          crossfade: clamp(toFinite(parsed?.mirror1?.crossfade, 0), 0, 1),
          blend: clamp(toFinite(parsed?.mirror1?.blend, 1), 0, 1),
          side: VALID_MIRROR_SIDES.has(parsed?.mirror1?.side) ? parsed.mirror1.side : "left-right",
        },
        mirror2: {
          projectionWidth: clamp(toFinite(parsed?.mirror2?.projectionWidth, 0.35), 0.001, 1),
          envelopeSmoothness: clamp(toFinite(parsed?.mirror2?.envelopeSmoothness, 64), 1, 4096),
          intensity: clamp(toFinite(parsed?.mirror2?.intensity, 1), 0, 1),
          normalizeA: Boolean(parsed?.mirror2?.normalizeA),
          signedMorphology: Boolean(parsed?.mirror2?.signedMorphology),
          reverseMorphology: Boolean(parsed?.mirror2?.reverseMorphology),
        },
      };
    }
    return {
      ...parsed,
      param: normalizeParam(parsed.type, parsed.param),
    };
  });

  return next;
}

export const ALGEBRA_PRESETS = [
  {
    id: "glass-shimmer",
    name: "Glass Shimmer",
    dsl: [
      "# Wave Algebra Chain v1",
      "input=sine",
      "overlay=true",
      "generator.frequency=330",
      "generator.lengthMs=1200",
      "generator.seed=9",
      "op power enabled=true p.value=2.4 p.source=constant",
      "op saturation enabled=true k.value=0.9 k.source=constant",
      "op selfInteraction enabled=true alpha.value=0.28 alpha.source=constant",
      "op globalMatrix enabled=false a.value=0.02 a.source=constant",
      "op permutation enabled=false mode=identity seed=13",
      "op timeStretch enabled=true lambda.value=0.72 lambda.source=constant",
    ].join("\n"),
  },
  {
    id: "folded-bass",
    name: "Folded Bass",
    dsl: [
      "# Wave Algebra Chain v1",
      "input=saw",
      "overlay=true",
      "generator.frequency=63",
      "generator.lengthMs=1500",
      "generator.seed=5",
      "op power enabled=true p.value=0.62 p.source=constant",
      "op saturation enabled=true k.value=3.8 k.source=constant",
      "op selfInteraction enabled=true alpha.value=-0.64 alpha.source=constant",
      "op globalMatrix enabled=true a.value=0.015 a.source=constant",
      "op permutation enabled=false mode=identity seed=13",
      "op timeStretch enabled=false lambda.value=1 lambda.source=constant",
    ].join("\n"),
  },
  {
    id: "chaotic-fm-ish",
    name: "Chaotic FM-ish",
    dsl: [
      "# Wave Algebra Chain v1",
      "input=clipA",
      "overlay=true",
      "generator.frequency=220",
      "generator.lengthMs=1200",
      "generator.seed=11",
      "op power enabled=true p.value=1.4 p.source=waveA",
      "op saturation enabled=true k.value=1.1 k.source=waveB",
      "op selfInteraction enabled=true alpha.value=0.22 alpha.source=waveB",
      "op globalMatrix enabled=true a.value=0.03 a.source=constant",
      "op permutation enabled=true mode=random-seeded seed=71",
      "op timeStretch enabled=true lambda.value=1.07 lambda.source=waveA",
    ].join("\n"),
  },
];
