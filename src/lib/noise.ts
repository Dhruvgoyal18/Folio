import { mulberry32 } from "./constellation";

/** Seeded 2D value-noise with smooth interpolation + fBm. Small, deterministic, dependency-free. */
export function makeNoise(seed: number) {
  const rand = mulberry32(seed);
  const P = 256;
  const perm = Array.from({ length: P }, (_, i) => i);
  for (let i = P - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j]!, perm[i]!];
  }
  const vals = Array.from({ length: P }, () => rand());
  const v = (x: number, y: number) => vals[(perm[(x & 255)]! + y) & 255]!;
  const fade = (t: number) => t * t * (3 - 2 * t);
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
    const u = fade(xf), w = fade(yf);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
  const fbm = (x: number, y: number, oct = 4) => {
    let f = 0, amp = 0.5, fr = 1;
    for (let i = 0; i < oct; i++) {
      f += amp * noise(x * fr, y * fr);
      fr *= 2.03;
      amp *= 0.5;
    }
    return f;
  };
  return { noise, fbm };
}
