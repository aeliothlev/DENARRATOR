class FFT {
  constructor(size) {
    if ((size & (size - 1)) !== 0) {
      throw new Error("FFT size must be power of 2");
    }
    this.size = size;
    this.levels = Math.log2(size);
    this.cos = new Float64Array(size / 2);
    this.sin = new Float64Array(size / 2);
    this.rev = new Uint32Array(size);

    for (let i = 0; i < size / 2; i += 1) {
      const a = (2 * Math.PI * i) / size;
      this.cos[i] = Math.cos(a);
      this.sin[i] = Math.sin(a);
    }

    for (let i = 0; i < size; i += 1) {
      let x = i;
      let y = 0;
      for (let j = 0; j < this.levels; j += 1) {
        y = (y << 1) | (x & 1);
        x >>= 1;
      }
      this.rev[i] = y;
    }
  }

  transform(re, im, inverse = false) {
    const n = this.size;

    for (let i = 0; i < n; i += 1) {
      const j = this.rev[i];
      if (j > i) {
        const tr = re[i];
        re[i] = re[j];
        re[j] = tr;
        const ti = im[i];
        im[i] = im[j];
        im[j] = ti;
      }
    }

    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const step = n / size;
      for (let i = 0; i < n; i += size) {
        let table = 0;
        for (let j = i; j < i + half; j += 1) {
          const l = j + half;
          const cosv = this.cos[table];
          const sinv = inverse ? -this.sin[table] : this.sin[table];

          const tre = re[l] * cosv + im[l] * sinv;
          const tim = -re[l] * sinv + im[l] * cosv;

          re[l] = re[j] - tre;
          im[l] = im[j] - tim;
          re[j] += tre;
          im[j] += tim;

          table += step;
        }
      }
    }

    if (inverse) {
      for (let i = 0; i < n; i += 1) {
        re[i] /= n;
        im[i] /= n;
      }
    }
  }
}

export function hannWindow(size) {
  const win = new Float32Array(size);
  for (let i = 0; i < size; i += 1) {
    win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return win;
}

function frameCount(signalLength, fftSize, hopSize) {
  if (signalLength <= fftSize) return 1;
  return 1 + Math.ceil((signalLength - fftSize) / hopSize);
}

export function stft(signal, { fftSize = 2048, hopSize = 512, window = hannWindow(2048) } = {}) {
  const fft = new FFT(fftSize);
  const nFrames = frameCount(signal.length, fftSize, hopSize);
  const bins = fftSize / 2 + 1;
  const frames = [];

  for (let f = 0; f < nFrames; f += 1) {
    const start = f * hopSize;
    const re = new Float64Array(fftSize);
    const im = new Float64Array(fftSize);

    for (let i = 0; i < fftSize; i += 1) {
      const idx = start + i;
      const s = idx < signal.length ? signal[idx] : 0;
      re[i] = s * window[i];
    }

    fft.transform(re, im, false);

    const mag = new Float32Array(bins);
    const phase = new Float32Array(bins);
    for (let k = 0; k < bins; k += 1) {
      const r = re[k];
      const m = im[k];
      mag[k] = Math.hypot(r, m);
      phase[k] = Math.atan2(m, r);
    }

    frames.push({ mag, phase });
  }

  return {
    fftSize,
    hopSize,
    window,
    bins,
    frames,
  };
}

export function istft(frames, { fftSize = 2048, hopSize = 512, window = hannWindow(2048), outputLength } = {}) {
  if (!frames || frames.length === 0) {
    return new Float32Array(outputLength || 0);
  }

  const fft = new FFT(fftSize);
  const baseLength = (frames.length - 1) * hopSize + fftSize;
  const targetLength = outputLength ? Math.max(outputLength, 1) : baseLength;
  const out = new Float32Array(baseLength);
  const norm = new Float32Array(baseLength);
  const bins = fftSize / 2 + 1;

  for (let f = 0; f < frames.length; f += 1) {
    const start = f * hopSize;
    const re = new Float64Array(fftSize);
    const im = new Float64Array(fftSize);

    const frame = frames[f];
    for (let k = 0; k < bins; k += 1) {
      const m = frame.mag[k];
      const p = frame.phase[k];
      re[k] = m * Math.cos(p);
      im[k] = m * Math.sin(p);
    }

    for (let k = 1; k < bins - 1; k += 1) {
      const mk = fftSize - k;
      re[mk] = re[k];
      im[mk] = -im[k];
    }

    fft.transform(re, im, true);

    for (let i = 0; i < fftSize; i += 1) {
      const idx = start + i;
      if (idx >= baseLength) continue;
      const w = window[i];
      out[idx] += re[i] * w;
      norm[idx] += w * w;
    }
  }

  for (let i = 0; i < baseLength; i += 1) {
    if (norm[i] > 1e-9) out[i] /= norm[i];
  }

  if (targetLength === baseLength) return out;
  return out.subarray(0, Math.min(targetLength, baseLength));
}
