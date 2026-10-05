/** Client-safe pieces of the skill graph (no d3). The layout itself is built by src/lib/skill-graph.ts. */
export const GRAPH_W = 820;
export const GRAPH_H = 560;
export type GraphNode = { id: string; label: string; kind: "skill" | "owner"; r: number; x: number; y: number };
export type SkillGraph = { nodes: GraphNode[]; links: Array<[string, string]> };
