import { duration, spring, stagger } from "@/design/motion";
import { PAIRINGS, stack } from "./fonts";
import type { Genome } from "./schema";

/** Genome → CSS custom properties (consumed by the same Tailwind token utilities as the default theme). */

const RADII: Record<Genome["radius"], Record<string, string>> = {
  sharp: { xs: "0", sm: "0", md: "2px", lg: "3px", xl: "4px", pill: "2px" },
  soft: { xs: "2px", sm: "6px", md: "10px", lg: "18px", xl: "28px", pill: "999px" },
  round: { xs: "4px", sm: "10px", md: "16px", lg: "26px", xl: "36px", pill: "999px" },
};
const DENSITY: Record<Genome["density"], Record<string, string>> = {
  airy: { section: "clamp(5rem, 3rem + 8vw, 11rem)", gutter: "clamp(1rem, 0.6rem + 2vw, 2.5rem)" },
  compact: { section: "clamp(3.5rem, 2.5rem + 5vw, 7rem)", gutter: "clamp(1rem, 0.6rem + 1.6vw, 2rem)" },
};
export const MOTION_SCALE: Record<Genome["motion"], { dur: number; stiff: number; damp: number; stagger: number }> = {
  calm: { dur: 1.3, stiff: 0.7, damp: 1.15, stagger: 1.25 },
  snappy: { dur: 0.7, stiff: 1.4, damp: 1.0, stagger: 0.7 },
  cinematic: { dur: 1.0, stiff: 1.0, damp: 1.0, stagger: 1.0 },
};

const vars = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join("");

export function genomeCss(g: Genome): string {
  const f = PAIRINGS[g.fonts];
  const m = MOTION_SCALE[g.motion];
  const base = {
    ...Object.fromEntries(Object.entries(g.palette.light).map(([k, v]) => [`c-${k}`, v])),
    "ff-display": stack(f.display),
    "ff-text": stack(f.text),
    "ff-mono": stack(f.mono),
    "display-weight": String(f.displayWeight),
    "tr-display": f.tracking,
    ...Object.fromEntries(Object.entries(RADII[g.radius]).map(([k, v]) => [`r-${k}`, v])),
    "sp-section": DENSITY[g.density].section!,
    "sp-gutter": DENSITY[g.density].gutter!,
    ...Object.fromEntries((["fast", "base", "slow", "slower", "cinematic"] as const).map((k) => [`dur-${k}`, `${Math.round(duration[k] * m.dur)}ms`])),
  };
  const dark = Object.fromEntries(Object.entries(g.palette.dark).map(([k, v]) => [`c-${k}`, v]));
  return `:root{${vars(base)}}:root[data-theme="dark"]{${vars(dark)}}`;
}

/** html attributes that switch concept-level CSS (textures, hero casing, etc.). */
export function genomeAttrs(g: Genome): Record<string, string> {
  return {
    "data-concept": g.concept,
    "data-texture": g.texture,
    "data-hero-case": PAIRINGS[g.fonts].uppercaseHero ? "upper" : "normal",
  };
}

const BASE = { duration: { ...duration }, spring: JSON.parse(JSON.stringify(spring)) as typeof spring, stagger: { ...stagger } };

/**
 * Applies the genome's motion personality to the JS motion tokens. Called once, before the
 * site renders (each site is its own page load), so every primitive picks it up unchanged.
 */
export function applyMotionPersonality(personality: Genome["motion"]) {
  const m = MOTION_SCALE[personality];
  const d = duration as Record<string, number>;
  for (const k of Object.keys(BASE.duration)) d[k] = Math.round(BASE.duration[k as keyof typeof BASE.duration] * m.dur);
  const sp = spring as unknown as Record<string, { stiffness: number; damping: number }>;
  for (const k of Object.keys(BASE.spring)) {
    const b = BASE.spring[k as keyof typeof BASE.spring];
    sp[k]!.stiffness = Math.round(b.stiffness * m.stiff);
    sp[k]!.damping = Math.round(b.damping * m.damp);
  }
  const st = stagger as Record<string, number>;
  for (const k of Object.keys(BASE.stagger)) st[k] = BASE.stagger[k as keyof typeof BASE.stagger] * m.stagger;
}
