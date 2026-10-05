import type { Resume, SkillDomain } from "@/data/schema";
import { skillEdges, skillUsage } from "./resume";

/**
 * Pure layout for the hero constellation (tested in tests/unit/constellation.test.ts).
 * start = position in the 3D star cluster (clustered by domain)
 * end   = position on the career line; x is the month the skill was first evidenced
 */

export type CNode = {
  id: string;
  name: string;
  domain: SkillDomain;
  evidenced: boolean;
  firstUsed: string | null;
  /** labelled in the hero even when not hovered */
  key: boolean;
  start: [number, number, number];
  end: [number, number, number];
  size: number;
};

export type CLayout = {
  nodes: CNode[];
  edges: Array<[number, number]>;
  ticks: Array<{ label: string; x: number; kind: "year" | "toolkit" }>;
  line: { x0: number; x1: number };
};

/** Cluster directions for skill domains: evenly spread on a sphere (Fibonacci lattice). */
function domainDirections(domains: string[]): Map<SkillDomain, [number, number, number]> {
  const n = Math.max(1, domains.length);
  const golden = Math.PI * (3 - Math.sqrt(5));
  return new Map(
    domains.map((d, i) => {
      const y = 1 - ((i + 0.5) / n) * 2;
      const rad = Math.sqrt(1 - y * y);
      const t = golden * i + 0.6;
      return [d, [Math.cos(t) * rad, y * 0.8, Math.sin(t) * rad] as [number, number, number]];
    }),
  );
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const norm = (v: [number, number, number]): [number, number, number] => {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

export const monthIndex = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return (y ?? 0) * 12 + ((m ?? 1) - 1);
};

export function buildConstellation(r: Resume, opts: { radius?: number; halfWidth?: number; seed?: number } = {}): CLayout {
  const radius = opts.radius ?? 2.2;
  const half = opts.halfWidth ?? 4;
  const rand = mulberry32(opts.seed ?? 18);
  const usage = skillUsage(r);
  const dirs = domainDirections(r.domains.map((d) => d.id));
  // label the most-evidenced skills (up to 8) in the hero
  const keySkills = new Set(
    [...usage].filter((u) => u.highlightIds.length).sort((a, b) => b.highlightIds.length - a.highlightIds.length).slice(0, 8).map((u) => u.skill.id),
  );

  const dated = usage.map((u) => u.firstUsed).filter((d): d is string => !!d).map(monthIndex);
  const now = new Date().getUTCFullYear() * 12;
  const tMin = (dated.length ? Math.min(...dated) : now - 12) - 3;
  const tMax = (dated.length ? Math.max(...dated) : now) + 3;
  // timeline occupies the right 78% of the line; the left segment holds the listed-only "toolkit"
  const toolkitEnd = -half + half * 2 * 0.18;
  const xOf = (ym: string) => toolkitEnd + 0.06 * half + ((monthIndex(ym) - tMin) / (tMax - tMin)) * (half - toolkitEnd - 0.06 * half);

  const stackCount = new Map<string, number>();
  let toolkitI = 0;
  const toolkitTotal = usage.filter((u) => !u.firstUsed).length;

  const nodes: CNode[] = usage.map((u) => {
    const dir = dirs.get(u.skill.domain) ?? [0, 1, 0];
    const jitter: [number, number, number] = [rand() - 0.5, rand() - 0.5, rand() - 0.5];
    const d = norm([dir[0] + jitter[0] * 1.1, dir[1] + jitter[1] * 1.1, dir[2] + jitter[2] * 1.1]);
    const rr = radius * (0.78 + rand() * 0.32);
    const start: [number, number, number] = [d[0] * rr, d[1] * rr, d[2] * rr];

    let end: [number, number, number];
    if (u.firstUsed) {
      const k = stackCount.get(u.firstUsed) ?? 0;
      stackCount.set(u.firstUsed, k + 1);
      const offset = k === 0 ? 0 : (Math.ceil(k / 2) * 0.16) * (k % 2 ? 1 : -1);
      end = [xOf(u.firstUsed), offset, 0];
    } else {
      const cols = Math.max(1, Math.ceil(toolkitTotal / 5));
      const col = toolkitI % cols;
      const row = Math.floor(toolkitI / cols);
      toolkitI++;
      end = [-half + (col / Math.max(1, cols - 1)) * (toolkitEnd - -half), (row - 2) * 0.16, 0];
    }

    return {
      id: u.skill.id,
      name: u.skill.name,
      domain: u.skill.domain,
      evidenced: !!u.firstUsed,
      firstUsed: u.firstUsed,
      key: keySkills.has(u.skill.id),
      start,
      end,
      size: u.firstUsed ? 1 + Math.min(u.highlightIds.length, 4) * 0.25 : 0.8,
    };
  });

  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const edges = new Set<string>();
  for (const [a, b] of skillEdges(r)) {
    const i = index.get(a)!;
    const j = index.get(b)!;
    edges.add(`${Math.min(i, j)}-${Math.max(i, j)}`);
  }
  // constellation look: link each node to its nearest neighbour in the same domain
  nodes.forEach((n, i) => {
    let best = -1;
    let bestD = Infinity;
    nodes.forEach((m, j) => {
      if (i === j || m.domain !== n.domain) return;
      const dd = Math.hypot(n.start[0] - m.start[0], n.start[1] - m.start[1], n.start[2] - m.start[2]);
      if (dd < bestD) {
        bestD = dd;
        best = j;
      }
    });
    if (best >= 0) edges.add(`${Math.min(i, best)}-${Math.max(i, best)}`);
  });

  const years = new Set<number>();
  for (let t = tMin; t <= tMax; t++) years.add(Math.floor(t / 12));
  const ticks: CLayout["ticks"] = [{ label: "Toolkit", x: (-half + toolkitEnd) / 2, kind: "toolkit" }];
  const yearList = [...years].sort();
  const stepY = Math.max(1, Math.ceil(yearList.length / 7));
  for (const y of yearList.filter((_, i) => i % stepY === 0)) {
    const jan = `${y}-01`;
    if (monthIndex(jan) >= tMin && monthIndex(jan) <= tMax) ticks.push({ label: String(y), x: xOf(jan), kind: "year" });
  }

  return {
    nodes,
    edges: [...edges].map((e) => e.split("-").map(Number) as [number, number]),
    ticks,
    line: { x0: toolkitEnd + 0.03 * half, x1: half },
  };
}

/** Same easing on CPU for nodes, lines and tests. */
export function nodeProgress(progress: number, i: number, n: number, spread = 0.3) {
  const delay = (i / Math.max(1, n - 1)) * spread;
  const t = Math.min(1, Math.max(0, (progress - delay) / (1 - spread)));
  return t * t * (3 - 2 * t);
}
