"use client";

import { shortLabel } from "@/lib/skill-graph-label";

import { useMotionValue, useMotionValueEvent, type MotionValue } from "motion/react";
import { useMemo, useRef } from "react";
import { buildConstellation, nodeProgress } from "@/lib/constellation";
import type { Resume } from "@/data/schema";

const TILT = 0.25;
const YAW = 0.6;

/**
 * Lightweight SVG constellation — the fallback for no-WebGL and low-power devices,
 * and the reduced-motion picture. With `progress` it performs the same collapse
 * as the WebGL scene by updating attributes directly (no React re-render per frame).
 */
export function StaticConstellation({
  resume, className, collapsed = false, progress, shift = { x: 0, y: 0 }, scale = 1, halfWidth = 4.6, viewBox,
}: {
  resume: Resume;
  className?: string;
  collapsed?: boolean;
  progress?: MotionValue<number>;
  shift?: { x: number; y: number };
  scale?: number;
  halfWidth?: number;
  viewBox?: string;
}) {
  const L = useMemo(() => buildConstellation(resume, { radius: 2.3 * scale, halfWidth }), [resume, scale, halfWidth]);
  const fallback = useMotionValue(collapsed ? 1 : 0);
  const pv = progress ?? fallback;
  const starts = useMemo(
    () =>
      L.nodes.map((n) => {
        const [x, y, z] = n.start;
        const cos = Math.cos(YAW);
        const sin = Math.sin(YAW);
        return { x: x * cos + z * sin + shift.x, y: -(y * Math.cos(TILT) - (-x * sin + z * cos) * Math.sin(TILT)) + shift.y };
      }),
    [L, shift.x, shift.y],
  );
  // Key-skill labels: shortened, then placed greedily so no two overlap (any résumé, any layout).
  const labels = useMemo(() => {
    const placed: Array<{ i: number; text: string; box: [number, number, number, number] }> = [];
    L.nodes.forEach((n, i) => {
      if (!n.key) return;
      const text = shortLabel(n.name).toUpperCase();
      const x = starts[i]!.x + 0.09, y = starts[i]!.y - 0.06;
      const box: [number, number, number, number] = [x - 0.02, y - 0.15, x + text.length * 0.15 * 0.62 + 0.02, y + 0.04];
      if (placed.some(({ box: b }) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) return;
      placed.push({ i, text, box });
    });
    return placed;
  }, [L, starts]);
  const ends = useMemo(() => L.nodes.map((n) => ({ x: n.end[0], y: -n.end[1] })), [L]);
  const circles = useRef<(SVGCircleElement | null)[]>([]);
  const lines = useRef<(SVGLineElement | null)[]>([]);
  const edgeGroup = useRef<SVGGElement>(null);
  const labelGroup = useRef<SVGGElement>(null);
  const trail = useRef<SVGLineElement>(null);
  const tickGroup = useRef<SVGGElement>(null);

  const at = (p: number) => L.nodes.map((_, i) => {
    const t = nodeProgress(p, i, L.nodes.length);
    return { x: starts[i]!.x + (ends[i]!.x - starts[i]!.x) * t, y: starts[i]!.y + (ends[i]!.y - starts[i]!.y) * t };
  });

  const initial = collapsed ? ends : starts;

  useMotionValueEvent(pv, "change", (p) => {
    const pts = at(p);
    pts.forEach((pt, i) => {
      const c = circles.current[i];
      if (c) {
        c.setAttribute("cx", pt.x.toFixed(3));
        c.setAttribute("cy", pt.y.toFixed(3));
      }
    });
    L.edges.forEach(([a, b], k) => {
      const l = lines.current[k];
      if (!l) return;
      l.setAttribute("x1", pts[a]!.x.toFixed(3));
      l.setAttribute("y1", pts[a]!.y.toFixed(3));
      l.setAttribute("x2", pts[b]!.x.toFixed(3));
      l.setAttribute("y2", pts[b]!.y.toFixed(3));
    });
    edgeGroup.current?.setAttribute("opacity", String(Math.max(0, 1 - p * 1.6)));
    labelGroup.current?.setAttribute("opacity", String(Math.max(0, 1 - p * 2.2)));
    trail.current?.setAttribute("opacity", String(Math.max(0, (p - 0.55) / 0.45)));
    tickGroup.current?.setAttribute("opacity", String(Math.max(0, (p - 0.7) / 0.3)));
  });

  return (
    <svg
      className={className}
      viewBox={viewBox ?? (collapsed ? "-5 -1.2 10 2.4" : "-5 -3 10 6")}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      data-testid="constellation-static"
    >
      <line ref={trail} x1={L.line.x0} x2={L.line.x1} y1={0} y2={0} stroke="var(--c-signal)" strokeWidth={0.02} opacity={collapsed ? 1 : 0} />
      <g ref={edgeGroup} stroke="var(--c-ink)" strokeOpacity={0.25} strokeWidth={0.012} opacity={collapsed ? 0 : 1}>
        {L.edges.map(([a, b], k) => (
          <line
            key={`${a}-${b}`}
            ref={(el) => {
              lines.current[k] = el;
            }}
            x1={initial[a]!.x}
            y1={initial[a]!.y}
            x2={initial[b]!.x}
            y2={initial[b]!.y}
          />
        ))}
      </g>
      {L.nodes.map((n, i) => (
        <circle
          key={n.id}
          ref={(el) => {
            circles.current[i] = el;
          }}
          cx={initial[i]!.x}
          cy={initial[i]!.y}
          r={0.035 * n.size}
          fill={n.evidenced ? "var(--c-signal)" : "var(--c-ink)"}
        />
      ))}
      <g ref={labelGroup} opacity={collapsed ? 0 : 1}>
        {labels.map(({ i, text }) => (
          <text key={L.nodes[i]!.id} x={starts[i]!.x + 0.09} y={starts[i]!.y - 0.06} fontSize={0.15} fill="var(--c-ink-muted)" fontFamily="var(--ff-mono)">
            {text}
          </text>
        ))}
      </g>
      <g ref={tickGroup} opacity={collapsed ? 1 : 0}>
        {L.ticks.map((t) => (
          <text key={t.label} x={t.x} y={0.75} fontSize={0.18} textAnchor="middle" fill={t.kind === "year" ? "var(--c-signal-ink)" : "var(--c-ink-muted)"} fontFamily="var(--ff-mono)">
            {t.kind === "year" ? `▲ ${t.label}` : "◇ toolkit"}
          </text>
        ))}
      </g>
    </svg>
  );
}
