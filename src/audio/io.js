let audioContext;

function getContext() {
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    audioContext = new Ctor();
  }
  return audioContext;
}

function readArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function decodeFile(file) {
  const arrayBuffer = await readArrayBuffer(file);
  const buffer = await getContext().decodeAudioData(arrayBuffer.slice(0));
  const channels = [];
  for (let i = 0; i < buffer.numberOfChannels; i += 1) {
    channels.push(new Float32Array(buffer.getChannelData(i)));
  }

  return {
    name: file.name,
    sampleRate: buffer.sampleRate,
    length: buffer.length,
    durationSec: buffer.duration,
    channels,
  };
}

export async function decodeArrayBuffer(arrayBuffer, name = "imported.wav") {
  const buffer = await getContext().decodeAudioData(arrayBuffer.slice(0));
  const channels = [];
  for (let i = 0; i < buffer.numberOfChannels; i += 1) {
    channels.push(new Float32Array(buffer.getChannelData(i)));
  }

  return {
    name,
    sampleRate: buffer.sampleRate,
    length: buffer.length,
    durationSec: buffer.duration,
    channels,
  };
}

export function getMonoChannel(clip, reversed = false) {
  const mono = clip.channels[0];
  if (!reversed) return mono;
  const out = new Float32Array(mono.length);
  for (let i = 0; i < mono.length; i += 1) {
    out[i] = mono[mono.length - 1 - i];
  }
  return out;
}

export function getTailWindowFromMono(mono, sampleRate, windowMs) {
  const samples = Math.max(1, Math.round((sampleRate * windowMs) / 1000));
  const start = Math.max(0, mono.length - samples);
  return mono.subarray(start, mono.length);
}

export function getHeadWindowFromMono(mono, sampleRate, windowMs) {
  const samples = Math.max(1, Math.round((sampleRate * windowMs) / 1000));
  return mono.subarray(0, Math.min(mono.length, samples));
}

export function getTailWindow(clip, windowMs) {
  return getTailWindowFromMono(getMonoChannel(clip), clip.sampleRate, windowMs);
}

export function getHeadWindow(clip, windowMs) {
  return getHeadWindowFromMono(getMonoChannel(clip), clip.sampleRate, windowMs);
}

export function resampleLinear(input, srcRate, dstRate) {
  if (srcRate === dstRate) return new Float32Array(input);
  const ratio = srcRate / dstRate;
  const outLength = Math.max(1, Math.round(input.length / ratio));
  const out = new Float32Array(outLength);

  for (let i = 0; i < outLength; i += 1) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const t = pos - i0;
    out[i] = input[i0] * (1 - t) + input[i1] * t;
  }
  return out;
}
