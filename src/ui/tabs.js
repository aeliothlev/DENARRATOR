import { getState, setState, updateParam } from "../state/store.js";
import { ALGEBRA_PRESETS, parseAlgebraDsl, serializeAlgebraDsl } from "../engines/waveAlgebraSyntax.js";

const PARAM_SOURCES = [
  { value: "constant", label: "Constant" },
  { value: "waveA", label: "Wave A Value" },
  { value: "waveB", label: "Wave B Value" },
];

const TAB_FIELDS = {
  ALIGN: [
    { key: "searchRangeMs", label: "Search Range", min: 1, max: 120, step: 1, unit: " ms" },
    { key: "smoothness", label: "Smoothness", min: 0, max: 1, step: 0.01, unit: "" },
  ],
  SPECTRAL: [
    { key: "tilt", label: "Brightness / Tilt", min: -1, max: 1, step: 0.01, unit: "" },
    { key: "transientProtect", label: "Transient Protect", min: 0, max: 1, step: 0.01, unit: "" },
  ],
  MACHINE: [
    { key: "partials", label: "Partials (K)", min: 16, max: 128, step: 1, unit: "" },
    { key: "noiseMix", label: "Noise Mix", min: 0, max: 1, step: 0.01, unit: "" },
  ],
};

const ALGEBRA_LABELS = {
  power: "y(t) = sign(x(t)) * |x(t)|^p",
  saturation: "y(t) = tanh(k * x(t))",
  selfInteraction: "y(t) = x(t) + alpha * x(t)^2",
  globalMatrix: "y_i = x_i + a * sum_{j != i}(x_j)",
  permutation: "y_i = x_pi(i)",
  timeStretch: "y(t) = x(lambda * t)",
  mirror: "Mirror Module",
};

const ALGEBRA_PARAM_META = {
  power: { key: "p", min: 0.1, max: 4, step: 0.01 },
  saturation: { key: "k", min: 0, max: 10, step: 0.01 },
  selfInteraction: { key: "alpha", min: -2, max: 2, step: 0.01 },
  globalMatrix: { key: "a", min: -1, max: 1, step: 0.01 },
  timeStretch: { key: "lambda", min: 0.25, max: 4, step: 0.01 },
};

function patchAlgebra(nextPartial) {
  const { params } = getState();
  setState({
    params: {
      ALGEBRA: {
        ...params.ALGEBRA,
        ...nextPartial,
      },
    },
    renderedBridge: null,
  });
}

function patchOperator(index, updater) {
  const { params } = getState();
  const operators = (params.ALGEBRA.operators || []).map((operator, i) => {
    if (i !== index) return operator;
    return updater(operator);
  });
  patchAlgebra({ operators });
}

function moveOperator(index, direction) {
  const { params } = getState();
  const operators = [...(params.ALGEBRA.operators || [])];
  const target = index + direction;
  if (target < 0 || target >= operators.length) return;
  const tmp = operators[target];
  operators[target] = operators[index];
  operators[index] = tmp;
  patchAlgebra({ operators });
}

function createRangeAndNumber(meta, value) {
  const range = document.createElement("input");
  range.type = "range";
  range.min = String(meta.min);
  range.max = String(meta.max);
  range.step = String(meta.step);
  range.value = String(value);

  const number = document.createElement("input");
  number.type = "number";
  number.min = String(meta.min);
  number.max = String(meta.max);
  number.step = String(meta.step);
  number.value = String(value);
  number.className = "alg-number";

  return { range, number };
}

function bindParamSource(select, operatorIndex, current) {
  for (const source of PARAM_SOURCES) {
    const option = document.createElement("option");
    option.value = source.value;
    option.textContent = source.label;
    if (source.value === current) option.selected = true;
    select.appendChild(option);
  }
  select.addEventListener("change", (event) => {
    const source = event.target.value;
    patchOperator(operatorIndex, (operator) => ({
      ...operator,
      param: {
        ...operator.param,
        source,
      },
    }));
  });
}

function addOption(select, value, label, selectedValue) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = value === selectedValue;
  select.appendChild(option);
}

function bindMirrorNumberAndRange(range, number, min, max, step, value, onChange) {
  range.type = "range";
  range.min = String(min);
  range.max = String(max);
  range.step = String(step);
  range.value = String(value);
  number.type = "number";
  number.min = String(min);
  number.max = String(max);
  number.step = String(step);
  number.value = String(value);
  number.className = "alg-number";

  const sync = (next) => {
    const clamped = Math.max(min, Math.min(max, next));
    range.value = String(clamped);
    number.value = String(clamped);
    onChange(clamped);
  };
  range.addEventListener("input", (event) => sync(Number(event.target.value)));
  number.addEventListener("input", (event) => {
    const v = Number(event.target.value);
    if (Number.isFinite(v)) sync(v);
  });
}

function renderAlgebraControls(dom) {
  const { params, clips } = getState();
  const algebra = params.ALGEBRA;
  dom.tabControls.innerHTML = "";
  dom.tabControls.classList.add("tab-controls-algebra");

  const topRow = document.createElement("div");
  topRow.className = "alg-top-row";

  const inputModeLabel = document.createElement("label");
  inputModeLabel.className = "alg-inline";
  inputModeLabel.textContent = "Input";
  const inputModeSelect = document.createElement("select");
  for (const mode of ["clipA", "sine", "square", "saw", "noise", "impulse"]) {
    const option = document.createElement("option");
    option.value = mode;
    option.textContent = mode;
    if (mode === algebra.inputMode) option.selected = true;
    inputModeSelect.appendChild(option);
  }
  inputModeSelect.addEventListener("change", (event) => patchAlgebra({ inputMode: event.target.value }));
  inputModeLabel.appendChild(inputModeSelect);

  const overlayLabel = document.createElement("label");
  overlayLabel.className = "toggle";
  const overlayInput = document.createElement("input");
  overlayInput.type = "checkbox";
  overlayInput.checked = Boolean(algebra.overlayOriginal);
  overlayInput.addEventListener("change", (event) => patchAlgebra({ overlayOriginal: event.target.checked }));
  overlayLabel.append(overlayInput, document.createTextNode("Overlay Original"));

  topRow.append(inputModeLabel, overlayLabel);

  if (algebra.inputMode !== "clipA") {
    const generatorWrap = document.createElement("div");
    generatorWrap.className = "alg-generator-row";

    const freqLabel = document.createElement("label");
    freqLabel.textContent = "Freq";
    const freqInput = document.createElement("input");
    freqInput.type = "number";
    freqInput.min = "20";
    freqInput.max = "4000";
    freqInput.step = "1";
    freqInput.value = String(algebra.generator.frequency);
    freqInput.className = "alg-number";
    freqInput.addEventListener("input", (event) => {
      patchAlgebra({
        generator: {
          ...algebra.generator,
          frequency: Number(event.target.value),
        },
      });
    });
    freqLabel.appendChild(freqInput);

    const lengthLabel = document.createElement("label");
    lengthLabel.textContent = "Length ms";
    const lengthInput = document.createElement("input");
    lengthInput.type = "number";
    lengthInput.min = "20";
    lengthInput.max = "8000";
    lengthInput.step = "1";
    lengthInput.value = String(algebra.generator.lengthMs);
    lengthInput.className = "alg-number";
    lengthInput.addEventListener("input", (event) => {
      patchAlgebra({
        generator: {
          ...algebra.generator,
          lengthMs: Number(event.target.value),
        },
      });
    });
    lengthLabel.appendChild(lengthInput);

    const seedLabel = document.createElement("label");
    seedLabel.textContent = "Seed";
    const seedInput = document.createElement("input");
    seedInput.type = "number";
    seedInput.min = "1";
    seedInput.max = "2147483647";
    seedInput.step = "1";
    seedInput.value = String(algebra.generator.seed);
    seedInput.className = "alg-number";
    seedInput.addEventListener("input", (event) => {
      patchAlgebra({
        generator: {
          ...algebra.generator,
          seed: Number(event.target.value),
        },
      });
    });
    seedLabel.appendChild(seedInput);

    generatorWrap.append(freqLabel, lengthLabel, seedLabel);
    topRow.appendChild(generatorWrap);
  }

  dom.tabControls.appendChild(topRow);

  const operatorList = document.createElement("div");
  operatorList.className = "alg-operator-list";

  for (let i = 0; i < algebra.operators.length; i += 1) {
    const operator = algebra.operators[i];
    const block = document.createElement("section");
    block.className = "alg-block";

    const header = document.createElement("div");
    header.className = "alg-block-header";

    const formula = document.createElement("div");
    formula.className = "alg-formula";
    formula.textContent = ALGEBRA_LABELS[operator.type] || operator.type;

    const enabledLabel = document.createElement("label");
    enabledLabel.className = "toggle";
    const enabledInput = document.createElement("input");
    enabledInput.type = "checkbox";
    enabledInput.checked = Boolean(operator.enabled);
    enabledInput.addEventListener("change", (event) => {
      patchOperator(i, (prev) => ({ ...prev, enabled: event.target.checked }));
    });
    enabledLabel.append(enabledInput, document.createTextNode("On"));

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.textContent = "↑";
    upBtn.disabled = i === 0;
    upBtn.addEventListener("click", () => moveOperator(i, -1));

    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.textContent = "↓";
    downBtn.disabled = i === algebra.operators.length - 1;
    downBtn.addEventListener("click", () => moveOperator(i, 1));

    header.append(formula, enabledLabel, upBtn, downBtn);
    block.appendChild(header);

    if (operator.type === "permutation") {
      const permRow = document.createElement("div");
      permRow.className = "alg-param-row";

      const modeLabel = document.createElement("label");
      modeLabel.textContent = "pi mode";
      const modeSelect = document.createElement("select");
      for (const mode of ["identity", "reverse", "block-swap", "random-seeded"]) {
        const option = document.createElement("option");
        option.value = mode;
        option.textContent = mode;
        if (operator.mode === mode) option.selected = true;
        modeSelect.appendChild(option);
      }
      modeSelect.addEventListener("change", (event) => {
        patchOperator(i, (prev) => ({ ...prev, mode: event.target.value }));
      });
      modeLabel.appendChild(modeSelect);
      permRow.appendChild(modeLabel);

      const seedLabel = document.createElement("label");
      seedLabel.textContent = "seed";
      const seedInput = document.createElement("input");
      seedInput.type = "number";
      seedInput.min = "1";
      seedInput.max = "2147483647";
      seedInput.step = "1";
      seedInput.value = String(operator.seed ?? 1);
      seedInput.className = "alg-number";
      seedInput.addEventListener("input", (event) => {
        patchOperator(i, (prev) => ({ ...prev, seed: Number(event.target.value) }));
      });
      seedLabel.appendChild(seedInput);
      permRow.appendChild(seedLabel);

      block.appendChild(permRow);
      operatorList.appendChild(block);
      continue;
    }

    if (operator.type === "mirror") {
      const hasWaveB = Boolean(clips.B);
      const modeRow = document.createElement("div");
      modeRow.className = "alg-param-row";

      const modeLabel = document.createElement("label");
      modeLabel.textContent = "Mode";
      const modeSelect = document.createElement("select");
      addOption(modeSelect, "mirror1", "Mirror 1", operator.mode);
      addOption(modeSelect, "mirror2", "Mirror 2", operator.mode);
      if (!hasWaveB) {
        const mirror2Option = modeSelect.querySelector('option[value="mirror2"]');
        if (mirror2Option) mirror2Option.disabled = true;
      }
      modeSelect.addEventListener("change", (event) => {
        patchOperator(i, (prev) => ({ ...prev, mode: event.target.value }));
      });
      modeLabel.appendChild(modeSelect);

      const snapLabel = document.createElement("label");
      snapLabel.className = "toggle";
      const snapInput = document.createElement("input");
      snapInput.type = "checkbox";
      snapInput.checked = Boolean(operator.zeroSnap);
      snapInput.addEventListener("change", (event) => {
        patchOperator(i, (prev) => ({ ...prev, zeroSnap: event.target.checked }));
      });
      snapLabel.append(snapInput, document.createTextNode("Zero-Cross Snap"));

      modeRow.append(modeLabel, snapLabel);
      block.appendChild(modeRow);

      const t0Row = document.createElement("div");
      t0Row.className = "alg-param-row";
      const t0Label = document.createElement("label");
      t0Label.textContent = "Mirror Position t0 (0..1)";
      const t0Range = document.createElement("input");
      const t0Number = document.createElement("input");
      bindMirrorNumberAndRange(
        t0Range,
        t0Number,
        0,
        1,
        0.001,
        Number(operator.t0Norm ?? 0.5),
        (v) => patchOperator(i, (prev) => ({ ...prev, t0Norm: v })),
      );
      t0Label.append(t0Range, t0Number);
      t0Row.appendChild(t0Label);
      block.appendChild(t0Row);

      if (operator.mode === "mirror1") {
        const m1RowA = document.createElement("div");
        m1RowA.className = "alg-param-row";

        const m1ModeLabel = document.createElement("label");
        m1ModeLabel.textContent = "Mirror 1 Type";
        const m1ModeSelect = document.createElement("select");
        addOption(m1ModeSelect, "replace", "Replace", operator.mirror1?.mode);
        addOption(m1ModeSelect, "extend", "Extend", operator.mirror1?.mode);
        m1ModeSelect.addEventListener("change", (event) => {
          patchOperator(i, (prev) => ({
            ...prev,
            mirror1: { ...prev.mirror1, mode: event.target.value },
          }));
        });
        m1ModeLabel.appendChild(m1ModeSelect);

        const sideLabel = document.createElement("label");
        sideLabel.textContent = "Mirror Side";
        const sideSelect = document.createElement("select");
        addOption(sideSelect, "left-right", "Left -> Right", operator.mirror1?.side);
        addOption(sideSelect, "right-left", "Right -> Left", operator.mirror1?.side);
        sideSelect.addEventListener("change", (event) => {
          patchOperator(i, (prev) => ({
            ...prev,
            mirror1: { ...prev.mirror1, side: event.target.value },
          }));
        });
        sideLabel.appendChild(sideSelect);

        m1RowA.append(m1ModeLabel, sideLabel);
        block.appendChild(m1RowA);

        const m1RowB = document.createElement("div");
        m1RowB.className = "alg-param-row";

        const crossLabel = document.createElement("label");
        crossLabel.textContent = "Crossfade";
        const crossRange = document.createElement("input");
        const crossNumber = document.createElement("input");
        bindMirrorNumberAndRange(
          crossRange,
          crossNumber,
          0,
          1,
          0.01,
          Number(operator.mirror1?.crossfade ?? 0),
          (v) => patchOperator(i, (prev) => ({ ...prev, mirror1: { ...prev.mirror1, crossfade: v } })),
        );
        crossLabel.append(crossRange, crossNumber);

        const blendLabel = document.createElement("label");
        blendLabel.textContent = "Blend (Original <-> Mirrored)";
        const blendRange = document.createElement("input");
        const blendNumber = document.createElement("input");
        bindMirrorNumberAndRange(
          blendRange,
          blendNumber,
          0,
          1,
          0.01,
          Number(operator.mirror1?.blend ?? 1),
          (v) => patchOperator(i, (prev) => ({ ...prev, mirror1: { ...prev.mirror1, blend: v } })),
        );
        blendLabel.append(blendRange, blendNumber);

        m1RowB.append(crossLabel, blendLabel);
        block.appendChild(m1RowB);
      } else {
        const m2RowA = document.createElement("div");
        m2RowA.className = "alg-param-row";

        const widthLabel = document.createElement("label");
        widthLabel.textContent = "Projection Width";
        const widthRange = document.createElement("input");
        const widthNumber = document.createElement("input");
        bindMirrorNumberAndRange(
          widthRange,
          widthNumber,
          0.001,
          1,
          0.001,
          Number(operator.mirror2?.projectionWidth ?? 0.35),
          (v) => patchOperator(i, (prev) => ({ ...prev, mirror2: { ...prev.mirror2, projectionWidth: v } })),
        );
        widthRange.disabled = !hasWaveB;
        widthNumber.disabled = !hasWaveB;
        widthLabel.append(widthRange, widthNumber);

        const smoothLabel = document.createElement("label");
        smoothLabel.textContent = "Envelope Smoothness";
        const smoothRange = document.createElement("input");
        const smoothNumber = document.createElement("input");
        bindMirrorNumberAndRange(
          smoothRange,
          smoothNumber,
          1,
          4096,
          1,
          Number(operator.mirror2?.envelopeSmoothness ?? 64),
          (v) => patchOperator(i, (prev) => ({ ...prev, mirror2: { ...prev.mirror2, envelopeSmoothness: v } })),
        );
        smoothRange.disabled = !hasWaveB;
        smoothNumber.disabled = !hasWaveB;
        smoothLabel.append(smoothRange, smoothNumber);

        m2RowA.append(widthLabel, smoothLabel);
        block.appendChild(m2RowA);

        const m2RowB = document.createElement("div");
        m2RowB.className = "alg-param-row";

        const intensityLabel = document.createElement("label");
        intensityLabel.textContent = "Projection Intensity";
        const intensityRange = document.createElement("input");
        const intensityNumber = document.createElement("input");
        bindMirrorNumberAndRange(
          intensityRange,
          intensityNumber,
          0,
          1,
          0.01,
          Number(operator.mirror2?.intensity ?? 1),
          (v) => patchOperator(i, (prev) => ({ ...prev, mirror2: { ...prev.mirror2, intensity: v } })),
        );
        intensityRange.disabled = !hasWaveB;
        intensityNumber.disabled = !hasWaveB;
        intensityLabel.append(intensityRange, intensityNumber);

        const toggleWrap = document.createElement("div");
        toggleWrap.className = "alg-toggle-grid";

        const normalizeLabel = document.createElement("label");
        normalizeLabel.className = "toggle";
        const normalizeInput = document.createElement("input");
        normalizeInput.type = "checkbox";
        normalizeInput.checked = Boolean(operator.mirror2?.normalizeA);
        normalizeInput.disabled = !hasWaveB;
        normalizeInput.addEventListener("change", (event) => {
          patchOperator(i, (prev) => ({ ...prev, mirror2: { ...prev.mirror2, normalizeA: event.target.checked } }));
        });
        normalizeLabel.append(normalizeInput, document.createTextNode("Normalize A"));

        const signedLabel = document.createElement("label");
        signedLabel.className = "toggle";
        const signedInput = document.createElement("input");
        signedInput.type = "checkbox";
        signedInput.checked = Boolean(operator.mirror2?.signedMorphology);
        signedInput.disabled = !hasWaveB;
        signedInput.addEventListener("change", (event) => {
          patchOperator(i, (prev) => ({ ...prev, mirror2: { ...prev.mirror2, signedMorphology: event.target.checked } }));
        });
        signedLabel.append(signedInput, document.createTextNode("Signed Morphology"));

        const reverseLabel = document.createElement("label");
        reverseLabel.className = "toggle";
        const reverseInput = document.createElement("input");
        reverseInput.type = "checkbox";
        reverseInput.checked = Boolean(operator.mirror2?.reverseMorphology);
        reverseInput.disabled = !hasWaveB;
        reverseInput.addEventListener("change", (event) => {
          patchOperator(i, (prev) => ({ ...prev, mirror2: { ...prev.mirror2, reverseMorphology: event.target.checked } }));
        });
        reverseLabel.append(reverseInput, document.createTextNode("Reverse B Morphology"));

        toggleWrap.append(normalizeLabel, signedLabel, reverseLabel);
        m2RowB.append(intensityLabel, toggleWrap);
        block.appendChild(m2RowB);

        if (!hasWaveB) {
          const hint = document.createElement("div");
          hint.className = "alg-hint";
          hint.textContent = "Mirror 2 benötigt Wave B (Parameter sind deaktiviert).";
          block.appendChild(hint);
        }
      }

      operatorList.appendChild(block);
      continue;
    }

    const meta = ALGEBRA_PARAM_META[operator.type];
    if (meta) {
      const paramRow = document.createElement("div");
      paramRow.className = "alg-param-row";

      const { range, number } = createRangeAndNumber(meta, operator.param.value);
      const sourceLabel = document.createElement("label");
      sourceLabel.textContent = `${meta.key} source`;
      const sourceSelect = document.createElement("select");
      bindParamSource(sourceSelect, i, operator.param.source);
      sourceLabel.appendChild(sourceSelect);

      const disabled = operator.param.source !== "constant";
      range.disabled = disabled;
      number.disabled = disabled;

      const valueLabel = document.createElement("label");
      valueLabel.textContent = meta.key;
      const syncValue = (nextValue) => {
        const clamped = Math.max(meta.min, Math.min(meta.max, nextValue));
        range.value = String(clamped);
        number.value = String(clamped);
        patchOperator(i, (prev) => ({
          ...prev,
          param: {
            ...prev.param,
            value: clamped,
          },
        }));
      };
      range.addEventListener("input", (event) => syncValue(Number(event.target.value)));
      number.addEventListener("input", (event) => {
        const numeric = Number(event.target.value);
        if (Number.isFinite(numeric)) syncValue(numeric);
      });

      valueLabel.append(range, number);
      paramRow.append(valueLabel, sourceLabel);
      block.appendChild(paramRow);
    }

    operatorList.appendChild(block);
  }

  dom.tabControls.appendChild(operatorList);

  const dslWrap = document.createElement("section");
  dslWrap.className = "alg-block";
  const dslHeader = document.createElement("div");
  dslHeader.className = "alg-block-header";
  const dslTitle = document.createElement("div");
  dslTitle.className = "alg-formula";
  dslTitle.textContent = "Chain Syntax (DSL)";
  dslHeader.appendChild(dslTitle);
  dslWrap.appendChild(dslHeader);

  const dslArea = document.createElement("textarea");
  dslArea.className = "alg-dsl";
  dslArea.value = serializeAlgebraDsl(algebra);
  dslWrap.appendChild(dslArea);

  const dslActions = document.createElement("div");
  dslActions.className = "alg-dsl-actions";

  const presetSelect = document.createElement("select");
  const presetPlaceholder = document.createElement("option");
  presetPlaceholder.value = "";
  presetPlaceholder.textContent = "Load preset...";
  presetSelect.appendChild(presetPlaceholder);
  for (const preset of ALGEBRA_PRESETS) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    presetSelect.appendChild(option);
  }
  presetSelect.addEventListener("change", (event) => {
    const selected = ALGEBRA_PRESETS.find((preset) => preset.id === event.target.value);
    if (!selected) return;
    dslArea.value = selected.dsl;
    dom.status.textContent = `Preset loaded: ${selected.name}`;
  });

  const applyBtn = document.createElement("button");
  applyBtn.type = "button";
  applyBtn.textContent = "Apply DSL";
  applyBtn.addEventListener("click", () => {
    try {
      const current = getState().params.ALGEBRA;
      const parsed = parseAlgebraDsl(dslArea.value, current);
      patchAlgebra(parsed);
      dom.status.textContent = "Algebra DSL applied.";
    } catch (error) {
      dom.status.textContent = `DSL parse failed: ${error.message}`;
    }
  });

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.textContent = "Copy DSL";
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(dslArea.value);
      dom.status.textContent = "Algebra DSL copied.";
    } catch {
      dom.status.textContent = "Clipboard unavailable.";
    }
  });

  dslActions.append(presetSelect, applyBtn, copyBtn);
  dslWrap.appendChild(dslActions);
  dom.tabControls.appendChild(dslWrap);
}

function renderStandardTabControls(dom, tab, params) {
  const fields = TAB_FIELDS[tab];
  dom.tabControls.innerHTML = "";
  dom.tabControls.classList.remove("tab-controls-algebra");

  for (const field of fields) {
    const wrap = document.createElement("label");
    const output = document.createElement("output");
    const input = document.createElement("input");

    input.type = "range";
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step);
    input.value = String(params[tab][field.key]);

    output.textContent = `${params[tab][field.key]}${field.unit}`;
    wrap.append(field.label, input, output);

    input.addEventListener("input", (event) => {
      const value = Number(event.target.value);
      updateParam(tab, field.key, value);
      output.textContent = `${value}${field.unit}`;
    });

    dom.tabControls.appendChild(wrap);
  }
}

export function bindTabEvents(dom) {
  for (const tab of dom.tabs) {
    tab.addEventListener("click", () => {
      setState({ tab: tab.dataset.tab, renderedBridge: null });
      syncTabButtons(dom);
      renderTabControls(dom);
    });
  }
}

export function syncTabButtons(dom) {
  const { tab } = getState();
  for (const btn of dom.tabs) {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  }
}

export function renderTabControls(dom) {
  const { tab, params } = getState();
  if (tab === "ALGEBRA") {
    renderAlgebraControls(dom);
    return;
  }
  renderStandardTabControls(dom, tab, params);
}
