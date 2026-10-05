import type { ColorRole } from "@/design/tokens";
import { contrast, ensureContrast, hexToRgba, oklch } from "./color";

/**
 * Palette generator. A concept supplies a *recipe* (lightness/chroma targets per role);
 * the seed supplies hues. Every text role is then pushed until it meets WCAG AA
 * against both surfaces, so any seed yields an accessible palette.
 */

export type Palette = Record<ColorRole, string>;
export type PaletteRecipe = "paper" | "gallery" | "phosphor" | "studio";
export type Mode = "light" | "dark";

type Spec = {
  paper: [number, number]; // L, C
  raised: number; // L
  sunk: number;
  ink: [number, number];
  muted: number;
  faint: number;
  signal: [number, number];
  signalInk: number;
  teal: [number, number];
  /** hue used for neutrals: "paper" = warm paper hue, "accent" = tinted by the accent */
  neutralHue: "paper" | "accent" | "cool";
};

const RECIPES: Record<PaletteRecipe, Record<Mode, Spec>> = {
  // warm drafting paper (Mission Control)
  paper: {
    light: { paper: [0.955, 0.014], raised: 0.925, sunk: 0.9, ink: [0.2, 0.012], muted: 0.47, faint: 0.64, signal: [0.63, 0.19], signalInk: 0.52, teal: [0.45, 0.07], neutralHue: "paper" },
    dark: { paper: [0.175, 0.01], raised: 0.215, sunk: 0.145, ink: [0.94, 0.02], muted: 0.74, faint: 0.56, signal: [0.72, 0.18], signalInk: 0.72, teal: [0.76, 0.08], neutralHue: "paper" },
  },
  // bright gallery white, near-black ink, one deep accent (Editorial)
  gallery: {
    light: { paper: [0.982, 0.004], raised: 0.955, sunk: 0.935, ink: [0.17, 0.005], muted: 0.45, faint: 0.66, signal: [0.5, 0.17], signalInk: 0.47, teal: [0.42, 0.06], neutralHue: "cool" },
    dark: { paper: [0.16, 0.004], raised: 0.2, sunk: 0.13, ink: [0.95, 0.006], muted: 0.75, faint: 0.55, signal: [0.76, 0.15], signalInk: 0.76, teal: [0.78, 0.07], neutralHue: "cool" },
  },
  // phosphor screen, tinted by the accent (Terminal)
  phosphor: {
    light: { paper: [0.965, 0.012], raised: 0.935, sunk: 0.91, ink: [0.22, 0.03], muted: 0.46, faint: 0.66, signal: [0.58, 0.17], signalInk: 0.48, teal: [0.45, 0.08], neutralHue: "accent" },
    dark: { paper: [0.15, 0.022], raised: 0.19, sunk: 0.12, ink: [0.93, 0.05], muted: 0.76, faint: 0.56, signal: [0.84, 0.18], signalInk: 0.84, teal: [0.8, 0.1], neutralHue: "accent" },
  },
  // soft tinted studio (alt. for any concept)
  studio: {
    light: { paper: [0.96, 0.02], raised: 0.93, sunk: 0.905, ink: [0.21, 0.03], muted: 0.47, faint: 0.65, signal: [0.6, 0.2], signalInk: 0.5, teal: [0.44, 0.08], neutralHue: "accent" },
    dark: { paper: [0.18, 0.02], raised: 0.22, sunk: 0.15, ink: [0.94, 0.02], muted: 0.75, faint: 0.56, signal: [0.74, 0.17], signalInk: 0.74, teal: [0.78, 0.09], neutralHue: "accent" },
  },
};

export function generatePalette(recipe: PaletteRecipe, mode: Mode, accentHue: number, paperHue: number): Palette {
  const s = RECIPES[recipe][mode];
  const nh = s.neutralHue === "paper" ? paperHue : s.neutralHue === "accent" ? accentHue : 250;
  const paper = oklch(s.paper[0], s.paper[1], nh);
  const raised = oklch(s.raised, s.paper[1], nh);
  const sunk = oklch(s.sunk, s.paper[1], nh);
  const surfaces = [paper, raised];
  const ink = ensureContrast(s.ink[0], s.ink[1], nh, surfaces, 7).hex;
  const muted = ensureContrast(s.muted, s.ink[1] + 0.01, nh, surfaces, 4.6).hex;
  const faint = oklch(s.faint, s.ink[1], nh);
  const signal = ensureContrast(s.signal[0], s.signal[1], accentHue, [paper], 3.1).hex;
  const signalInk = ensureContrast(s.signalInk, s.signal[1], accentHue, surfaces, 4.6).hex;
  const teal = ensureContrast(s.teal[0], s.teal[1], (accentHue + 150) % 360, surfaces, 4.6).hex;
  // text on a signal-ink fill: whichever of paper/ink reads better
  const onSignal = contrast(paper, signalInk) >= contrast(ink, signalInk) ? paper : ink;
  const dark = mode === "dark";
  return {
    paper,
    "paper-raised": raised,
    "paper-sunk": sunk,
    ink,
    "ink-muted": muted,
    "ink-faint": faint,
    signal,
    "signal-ink": signalInk,
    "on-signal": onSignal,
    teal,
    rule: hexToRgba(ink, dark ? 0.16 : 0.14),
    grid: hexToRgba(ink, dark ? 0.045 : 0.055),
    "grid-major": hexToRgba(ink, dark ? 0.08 : 0.09),
    vellum: hexToRgba(paper, 0.94),
    scrim: dark ? "rgba(0, 0, 0, 0.55)" : hexToRgba(ink, 0.35),
    glow: dark ? hexToRgba(signal, 0.35) : hexToRgba(signal, 0),
    focus: signal,
    "term-bg": "#0E0C0A",
    "term-ink": "#EFE8DA",
    "term-accent": "#FF6B3D",
  };
}

export type PaletteIssue = { role: string; against: string; ratio: number; min: number };

/** The same rules the generator enforces, as an independent check (used by validate + tests). */
export function auditPalette(p: Palette): PaletteIssue[] {
  const out: PaletteIssue[] = [];
  const check = (role: ColorRole, bg: ColorRole, min: number) => {
    const r = contrast(p[role], p[bg]);
    if (r < min) out.push({ role, against: bg, ratio: Math.round(r * 100) / 100, min });
  };
  for (const bg of ["paper", "paper-raised"] as const) {
    check("ink", bg, 7);
    check("ink-muted", bg, 4.5);
    check("signal-ink", bg, 4.5);
    check("teal", bg, 4.5);
  }
  check("signal", "paper", 3);
  check("on-signal", "signal-ink", 4.5);
  check("paper", "ink", 7);
  return out;
}
