/**
 * Motion tokens. Every animation in the app reads from here.
 * Meanings:
 *  - entrance  → things arriving: rise + fade with ease.out
 *  - exit      → things leaving: quick ease.in
 *  - emphasis  → scale 1.04 + glow, spring.gentle
 *  - feedback  → press compress 0.96, spring.snappy
 *  - transition→ scene cuts / morphs with ease.inOut, clip-path wipes
 *  - draw      → lines plotted with ease.plot
 */

/** milliseconds */
export const duration = {
  instant: 80,
  fast: 160,
  base: 240,
  slow: 420,
  slower: 700,
  cinematic: 1200,
} as const;
export type DurationToken = keyof typeof duration;

/** cubic-bezier control points */
export const ease = {
  out: [0.16, 1, 0.3, 1],
  in: [0.7, 0, 0.84, 0],
  inOut: [0.65, 0, 0.35, 1],
  plot: [0.45, 0, 0.15, 1],
  linear: [0, 0, 1, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;
export type EaseToken = keyof typeof ease;

export const spring = {
  snappy: { type: "spring", stiffness: 520, damping: 34, mass: 1 },
  gentle: { type: "spring", stiffness: 170, damping: 26, mass: 1 },
  magnetic: { type: "spring", stiffness: 150, damping: 15, mass: 0.1 },
  cursor: { type: "spring", stiffness: 600, damping: 40, mass: 0.4 },
} as const;
export type SpringToken = keyof typeof spring;

/** seconds between siblings */
export const stagger = { char: 0.02, word: 0.04, item: 0.08, card: 0.14 } as const;
export type StaggerToken = keyof typeof stagger;

export const distance = { entrance: 24, emphasisScale: 1.04, pressScale: 0.96, parallax: 80, tilt: 8, magnetic: 0.35 } as const;

export const scroll = {
  /** seconds of smoothing on scrubbed timelines */
  scrub: 0.6,
  /** Lenis lerp */
  lerp: 0.1,
  /** fraction of an element visible before a reveal fires */
  revealAmount: 0.2,
} as const;

/** Reduced-motion substitutes: transforms become short crossfades. */
export const reduced = { duration: 150, ease: ease.linear } as const;
/** Transition used in place of any transform animation when motion is reduced. */
export const reducedTransition = { duration: reduced.duration / 1000 } as const;
export const instantTransition = { duration: 0 } as const;

/** ms per cycle for ambient loops (spinners, shimmer, pulses) */
export const loop = { spin: 1100, shimmer: 1600, pulse: 2000 } as const;

/* ---------- helpers that convert tokens to library formats ---------- */

export const sec = (t: DurationToken) => duration[t] / 1000;
export const cssEase = (t: EaseToken) => `cubic-bezier(${ease[t].join(", ")})`;

/** Framer/motion transition from tokens */
export type Bezier = [number, number, number, number];
export const bezier = (e: EaseToken) => [...ease[e]] as Bezier;
export const tween = (d: DurationToken, e: EaseToken = "out", delay = 0) => ({
  duration: sec(d),
  ease: bezier(e),
  delay,
});

export const motionTokens = { duration, ease, spring, stagger, distance, scroll, reduced, loop };
