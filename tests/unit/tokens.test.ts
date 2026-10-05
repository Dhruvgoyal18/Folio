import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { palette } from "@/design/tokens";
import { contrast } from "@/design/contrast";
import { renderTokensCss } from "@/design/render-css";
import { duration, ease, spring, stagger } from "@/design/motion";

describe("design tokens", () => {
  it("tokens.css is regenerated from tokens.ts (run `npm run tokens`)", () => {
    const onDisk = readFileSync("src/design/tokens.css", "utf8");
    expect(onDisk).toBe(renderTokensCss());
  });
  it("light and dark define the same roles", () => {
    expect(Object.keys(palette.dark).sort()).toEqual(Object.keys(palette.light).sort());
  });
  for (const mode of ["light", "dark"] as const) {
    const p = palette[mode];
    it(`${mode}: text roles meet WCAG AA on paper and raised surfaces`, () => {
      for (const bg of [p.paper, p["paper-raised"]]) {
        expect(contrast(p.ink, bg)).toBeGreaterThanOrEqual(7);
        expect(contrast(p["ink-muted"], bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(p["signal-ink"], bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(p.teal, bg)).toBeGreaterThanOrEqual(4.5);
      }
    });
    it(`${mode}: large-text accent and fills meet AA`, () => {
      expect(contrast(p.signal, p.paper)).toBeGreaterThanOrEqual(3);
      expect(contrast(p["on-signal"], p["signal-ink"])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.paper, p.ink)).toBeGreaterThanOrEqual(7);
    });
  }
  it("motion tokens are ordered and sane", () => {
    const d = Object.values(duration);
    expect([...d].sort((a, b) => a - b)).toEqual(d);
    for (const b of Object.values(ease)) expect(b).toHaveLength(4);
    for (const s of Object.values(spring)) expect(s.damping).toBeGreaterThan(0);
    expect(stagger.char).toBeLessThan(stagger.card);
  });
});

import { cubicBezier } from "@/design/easing";
describe("cubicBezier", () => {
  it("matches linear and endpoints", () => {
    const lin = cubicBezier(0, 0, 1, 1);
    for (const x of [0, 0.25, 0.5, 0.9, 1]) expect(lin(x)).toBeCloseTo(x, 3);
    const out = cubicBezier(0.16, 1, 0.3, 1);
    expect(out(0)).toBe(0);
    expect(out(1)).toBe(1);
    expect(out(0.5)).toBeGreaterThan(0.85);
  });
});
