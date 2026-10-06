import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import type { Resume } from "@/data/schema";
import { owners, skillUsage } from "./resume";
import { GRAPH_H, GRAPH_W, type SkillGraph } from "./skill-graph-types";
export { GRAPH_H, GRAPH_W, type SkillGraph };

/**
 * Skill ↔ owner force layout. Deterministic for a given resume, so it is computed once
 * when a site is generated/published and stored with it — visitors never run d3-force.
 */
type SimNode = SimulationNodeDatum & { id: string; label: string; kind: "skill" | "owner"; r: number };

/** Long names are shortened in the graph only; the side panel shows the full name. */
import { shortLabel } from "./skill-graph-label";
export { shortLabel };

export function computeSkillGraph(r: Resume): SkillGraph {
  const W = GRAPH_W;
  const H = GRAPH_H;
  const nodes: SimNode[] = [];
  const links: Array<{ source: string | SimNode; target: string | SimNode }> = [];
  const os = owners(r);
  os.forEach((o, i) => {
    const a = Math.PI - (i / Math.max(1, os.length)) * Math.PI * 2;
    nodes.push({ id: o.id, label: shortLabel(o.label), kind: "owner", r: 9, fx: W / 2 + Math.cos(a) * (W / 2 - 150), fy: H / 2 - Math.sin(a) * (H / 2 - 95) });
  });
  for (const u of skillUsage(r)) {
    if (!u.ownerIds.length) continue;
    const owner = nodes.find((n) => n.id === u.ownerIds[0]);
    if (!owner) continue;
    nodes.push({ id: u.skill.id, label: shortLabel(u.skill.name), kind: "skill", r: 3.5 + Math.min(u.highlightIds.length, 5) * 1.2, x: owner.fx! + 1, y: owner.fy! + 1 });
    for (const o of u.ownerIds) links.push({ source: u.skill.id, target: o });
  }
  const sim = forceSimulation(nodes)
    .force("link", forceLink<SimNode, (typeof links)[number]>(links).id((d) => d.id).distance(58).strength(0.7))
    .force("charge", forceManyBody().strength(-70))
    .force("collide", forceCollide<SimNode>().radius((d) => (d.kind === "owner" ? 38 : Math.max(20, 10 + d.label.length * 2))).iterations(3))
    .force("x", forceX(W / 2).strength(0.015))
    .force("y", forceY(H / 2).strength(0.02))
    .stop();
  for (let i = 0; i < 300; i++) sim.tick();
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.label,
      kind: n.kind,
      r: n.r,
      x: Math.round(Math.max(30, Math.min(W - 30, n.x ?? 0)) * 10) / 10,
      y: Math.round(Math.max(24, Math.min(H - 24, n.y ?? 0)) * 10) / 10,
    })),
    links: links.map((l) => [(l.source as SimNode).id, (l.target as SimNode).id]),
  };
}
