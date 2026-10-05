"use client";

import { contours } from "d3-contour";
import { geoPath } from "d3-geo";
import { useMotionValue, useMotionValueEvent, type MotionValue } from "motion/react";
import { useMemo, useRef } from "react";
import { makeNoise } from "@/lib/noise";
import { useReducedMotion } from "@/lib/prefs";

/**
 * Topographic contour field — a "career terrain" generated from the site's seed.
 * Pure SVG (no WebGL); paths draw themselves in on load and drift with scroll.
 */
export function Contours({ seed, className, progress, density = 1 }: { seed: number; className?: string; progress?: MotionValue<number>; density?: number }) {
  const reduced = useReducedMotion();
  const g = useRef<SVGGElement>(null);
  const still = useMotionValue(0);
  const { paths, w, h } = useMemo(() => {
    const W = 120, H = 70;
    const { fbm } = makeNoise(seed);
    const values = new Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) values[y * W + x] = fbm(x / 26, y / 26, 4) + (y / H) * 0.15;
    const levels = Array.from({ length: Math.round(14 * density) }, (_, i) => 0.2 + (i / (14 * density)) * 0.6);
    const cs = contours().size([W, H]).thresholds(levels)(values);
    const path = geoPath();
    return { paths: cs.map((c, i) => ({ d: path(c) ?? "", major: i % 4 === 2 })), w: W, h: H };
  }, [seed, density]);

  useMotionValueEvent(progress ?? still, "change", (p) => {
    if (g.current) g.current.style.transform = `translateY(${-p * 6}px) scale(${1 + p * 0.08})`;
  });

  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" data-testid="hero-contours">
      <g ref={g} style={{ transformOrigin: "50% 50%", transition: "transform var(--dur-fast) linear" }}>
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke={p.major ? "var(--c-signal)" : "var(--c-ink)"}
            strokeOpacity={p.major ? 0.85 : 0.28}
            strokeWidth={p.major ? 0.28 : 0.14}
            pathLength={1}
            style={
              reduced
                ? undefined
                : { strokeDasharray: 1, strokeDashoffset: 1, animation: `contour-draw var(--dur-cinematic) var(--ease-plot) ${i * 60}ms forwards` }
            }
          />
        ))}
      </g>
    </svg>
  );
}
