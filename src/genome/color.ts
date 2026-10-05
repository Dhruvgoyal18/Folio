/** OKLCH → sRGB hex with gamut mapping (chroma reduction), plus WCAG contrast. */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function oklchToLinearSrgb(L: number, C: number, H: number): [number, number, number] {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const inGamut = (rgb: number[]) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
const toSrgb = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);

export function oklch(L: number, C: number, H: number): string {
  let c = C;
  let rgb = oklchToLinearSrgb(L, c, H);
  while (!inGamut(rgb) && c > 0) {
    c = Math.max(0, c - 0.005);
    rgb = oklchToLinearSrgb(L, c, H);
  }
  return (
    "#" +
    rgb
      .map((v) => Math.round(clamp01(toSrgb(clamp01(v))) * 255).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/** Walks lightness (darker on light backgrounds, lighter on dark) until the colour meets `min` against every background. */
export function ensureContrast(L: number, C: number, H: number, backgrounds: string[], min: number): { hex: string; L: number } {
  const bgDark = luminance(backgrounds[0]!) < 0.2;
  let l = L;
  for (let i = 0; i < 120; i++) {
    const hex = oklch(l, C, H);
    if (backgrounds.every((b) => contrast(hex, b) >= min)) return { hex, L: l };
    l = bgDark ? Math.min(1, l + 0.01) : Math.max(0, l - 0.01);
  }
  return { hex: oklch(l, C, H), L: l };
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
