export function concatMono(parts) {
  const length = parts.reduce((acc, p) => acc + p.length, 0);
  const out = new Float32Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
