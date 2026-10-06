import type { Resume } from "@/data/schema";
import { CONCEPT_DEFS } from "./concepts";
import { generateGenome } from "./generate";
import { generatePalette } from "./palette";
import { CONCEPTS, type Concept, type Genome } from "./schema";

/**
 * Templates are concepts with a curated starting seed: the gallery and "Use this template"
 * open on a version that shows the concept at its best. Remix moves away from it freely.
 */
export const TEMPLATE_SEEDS: Record<Concept, number> = {
  mission: 11,
  editorial: 23,
  terminal: 37,
  minimal: 41,
  noir: 53,
  brutalist: 67,
  aurora: 71,
  scholar: 83,
  blueprint: 97,
};

export const TEMPLATES = CONCEPTS.map((id) => ({ id, ...CONCEPT_DEFS[id], seed: TEMPLATE_SEEDS[id] }));

export function templateGenome(r: Resume, concept: Concept, seed = TEMPLATE_SEEDS[concept]): Genome {
  return generateGenome(r, { seed, concept });
}

/** Three representative colours per template (paper, ink, accent) for pickers, from its default palette. */
export function templateSwatches(): Record<Concept, [string, string, string]> {
  const out = {} as Record<Concept, [string, string, string]>;
  for (const c of CONCEPTS) {
    const d = CONCEPT_DEFS[c];
    const mid = (b: [number, number]) => Math.round((b[0] + b[1]) / 2);
    const theme = [...d.defaultTheme].sort((a, b) => b[1] - a[1])[0]![0];
    const p = generatePalette(d.palettes[0]![0], theme, mid(d.accentHues[0]!), mid(d.paperHues[0]!));
    out[c] = [p.paper, p.ink, p.signal];
  }
  return out;
}
