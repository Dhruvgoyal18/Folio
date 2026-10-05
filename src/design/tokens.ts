/**
 * Design tokens — the only place raw values live.
 * `npm run tokens` (scripts/build-tokens.ts) compiles these into CSS custom
 * properties in src/design/tokens.css; a unit test fails if that file is stale.
 * Feature code consumes tokens through Tailwind utilities (bg-paper, text-ink…),
 * CSS variables, or the typed exports below — never raw hex/ms/bezier values.
 */

export const palette = {
  light: {
    paper: "#F3EEE4",
    "paper-raised": "#E9E2D3",
    "paper-sunk": "#E2DACA",
    ink: "#1A1712",
    "ink-muted": "#5C554A",
    "ink-faint": "#8F877A",
    signal: "#D9481A",
    "signal-ink": "#B23A12",
    "on-signal": "#F3EEE4",
    teal: "#1F5F5B",
    rule: "rgba(26, 23, 18, 0.14)",
    grid: "rgba(26, 23, 18, 0.055)",
    "grid-major": "rgba(26, 23, 18, 0.09)",
    vellum: "rgba(243, 238, 228, 0.94)",
    scrim: "rgba(26, 23, 18, 0.35)",
    glow: "rgba(217, 72, 26, 0.0)",
    focus: "#D9481A",
    "term-bg": "#0E0C0A",
    "term-ink": "#EFE8DA",
    "term-accent": "#FF6B3D",
  },
  dark: {
    paper: "#13110E",
    "paper-raised": "#1C1915",
    "paper-sunk": "#0E0C0A",
    ink: "#EFE8DA",
    "ink-muted": "#A69E90",
    "ink-faint": "#777064",
    signal: "#FF6B3D",
    "signal-ink": "#FF6B3D",
    "on-signal": "#13110E",
    teal: "#5FB8AE",
    rule: "rgba(239, 232, 218, 0.16)",
    grid: "rgba(239, 232, 218, 0.045)",
    "grid-major": "rgba(239, 232, 218, 0.08)",
    vellum: "rgba(28, 25, 21, 0.94)",
    scrim: "rgba(0, 0, 0, 0.55)",
    glow: "rgba(255, 107, 61, 0.35)",
    focus: "#FF6B3D",
    "term-bg": "#0E0C0A",
    "term-ink": "#EFE8DA",
    "term-accent": "#FF6B3D",
  },
} as const;

export type ColorRole = keyof typeof palette.light;
export const colorRoles = Object.keys(palette.light) as ColorRole[];

/** Semantic meaning of each color role, rendered on /design-system. */
export const colorRoleDocs: Record<ColorRole, string> = {
  paper: "Page background",
  "paper-raised": "Cards, panels",
  "paper-sunk": "Wells, code, inputs",
  ink: "Primary text and strokes",
  "ink-muted": "Secondary text, labels (AA on paper)",
  "ink-faint": "Decorative only — never body text",
  signal: "Accent for large type, lines, dots, focus",
  "signal-ink": "Accent for small text, primary button fill",
  "on-signal": "Text on signal-ink fills",
  teal: "Secondary data series, live states",
  rule: "Hairlines and borders",
  grid: "Drafting grid, minor",
  "grid-major": "Drafting grid, major",
  vellum: "Translucent panels (chat, nav)",
  scrim: "Overlay behind dialogs",
  glow: "Dark-mode bloom on emphasis",
  focus: "Focus ring",
  "term-bg": "Terminal surface (always dark)",
  "term-ink": "Terminal text",
  "term-accent": "Terminal prompt and input echo",
};

export const typography = {
  families: {
    // self-hosted in /public/fonts (src/app/fonts.css); a site's genome may swap the pairing
    display: "'Bricolage Grotesque', 'Arial Narrow', system-ui, sans-serif",
    text: "'Instrument Sans', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  /** Fluid scale: ratio 1.2 at 360px → 1.25 at 1440px, base 15px → 17px (refined: reads well on laptops). */
  scale: {
    "-2": "clamp(0.72rem, 0.71rem + 0.05vw, 0.75rem)",
    "-1": "clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem)",
    "0": "clamp(0.938rem, 0.896rem + 0.185vw, 1.062rem)",
    "1": "clamp(1.125rem, 1.057rem + 0.301vw, 1.328rem)",
    "2": "clamp(1.350rem, 1.247rem + 0.459vw, 1.660rem)",
    "3": "clamp(1.620rem, 1.468rem + 0.674vw, 2.075rem)",
    "4": "clamp(1.944rem, 1.727rem + 0.963vw, 2.594rem)",
    "5": "clamp(2.333rem, 2.030rem + 1.348vw, 3.242rem)",
    "6": "clamp(2.799rem, 2.381rem + 1.857vw, 4.053rem)",
    "7": "clamp(3.359rem, 2.790rem + 2.529vw, 5.066rem)",
    "8": "clamp(4.031rem, 3.264rem + 3.410vw, 6.333rem)",
  },
  leading: { tight: "0.88", snug: "1.12", normal: "1.5", relaxed: "1.65" },
  tracking: { display: "-0.035em", tight: "-0.015em", normal: "0", mono: "0.02em", caps: "0.14em" },
} as const;

export const space = {
  "0": "0",
  "1": "0.25rem",
  "2": "0.5rem",
  "3": "0.75rem",
  "4": "1rem",
  "5": "1.5rem",
  "6": "2rem",
  "7": "3rem",
  "8": "4rem",
  "9": "6rem",
  "10": "8rem",
  gutter: "clamp(1rem, 0.6rem + 2vw, 2.5rem)",
  section: "clamp(5rem, 3rem + 8vw, 11rem)",
} as const;

export const radius = { none: "0", xs: "2px", sm: "6px", md: "10px", lg: "18px", xl: "28px", pill: "999px" } as const;

export const elevation = {
  flat: "none",
  paper: "0 1px 0 rgba(26,23,18,0.06), 0 8px 24px -12px rgba(26,23,18,0.18)",
  lifted: "0 2px 0 rgba(26,23,18,0.05), 0 24px 48px -20px rgba(26,23,18,0.32)",
  overlay: "0 40px 120px -30px rgba(26,23,18,0.45)",
} as const;

export const blur = { sm: "6px", md: "14px", lg: "28px" } as const;

export const zIndex = {
  base: 0,
  raised: 10,
  sticky: 40,
  nav: 50,
  orb: 60,
  overlay: 70,
  modal: 80,
  cursor: 90,
  boot: 100,
} as const;

export const breakpoints = { sm: 480, md: 768, lg: 1024, xl: 1280, "2xl": 1536 } as const;

export const tokens = { palette, typography, space, radius, elevation, blur, zIndex, breakpoints };
