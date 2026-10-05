import type { Resume } from "@/data/schema";
import { allHighlights, kpis, projectsWithHighlights, firstName } from "@/lib/resume";
import { mulberry32 } from "@/lib/constellation";
import { CONCEPT_DEFS, conceptAffinity, type ConceptDef } from "./concepts";
import { generatePalette } from "./palette";
import { CONCEPTS, type Genome, type LockKey, type SectionId } from "./schema";

/**
 * Deterministic genome generator: same (resume, seed, options) → same site.
 * Resume content steers the concept and section choices; the seed picks within the
 * concept's curated space; locks carry fields over from a previous genome on Remix.
 */

export type GenerateOptions = {
  seed: number;
  concept?: Genome["concept"];
  theme?: "light" | "dark";
  /** 0 = calm … 1 = energetic; biases motion personality */
  energy?: number;
  previous?: Genome;
  locks?: LockKey[];
};

function pick<T>(rand: () => number, items: Array<[T, number]>): T {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let r = rand() * total;
  for (const [v, w] of items) {
    r -= w;
    if (r <= 0) return v;
  }
  return items[items.length - 1]![0];
}
const pickOne = <T,>(rand: () => number, xs: T[]) => xs[Math.floor(rand() * xs.length)]!;
const inBand = (rand: () => number, bands: Array<[number, number]>) => {
  const [a, b] = pickOne(rand, bands);
  return Math.round(a + rand() * (b - a)) % 360;
};

export function resumeText(r: Resume): string {
  return [r.profile.headline, r.profile.summary ?? "", r.profile.currentRole, ...r.experience.map((e) => `${e.role} ${e.org}`), ...r.skills.map((s) => s.name), ...allHighlights(r).map((h) => h.text)].join(" ");
}

export function fill(template: string, vars: Record<string, string | number>): string {
  // "Ask the {assistant}" with assistant "The Desk" → "Ask The Desk", not "Ask the The Desk"
  return template
    .replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""))
    .replace(/\b[Tt]he (The)\b/g, "$1")
    // "1 roles" → "1 role", "1 entries" → "1 entry" (counts come from the résumé)
    .replace(/\b1 ((?:[a-z]+ )?)([a-z]+?)(ies|es|s)\b/g, (m, lead: string, stem: string, end: string) => {
      if (/^(news|series|this|bus|gas|is|was|has|does)$/i.test(stem + end)) return m;
      const singular = end === "ies" ? `${stem}y` : end === "es" && /(ch|sh|x|ss)$/.test(stem) ? stem : end === "es" ? `${stem}e` : stem;
      return `1 ${lead}${singular}`;
    });
}

export function copyVars(r: Resume, assistant: string) {
  return {
    first: firstName(r),
    assistant,
    kpiCount: kpis(r).length,
    roleCount: r.experience.length,
    skillCount: r.skills.length,
    projectCount: r.projects.length,
  };
}

function buildCopy(r: Resume, def: ConceptDef, rand: () => number): Genome["copy"] {
  const assistant = pickOne(rand, def.assistants);
  const vars = copyVars(r, assistant);
  const sections = {} as Genome["copy"]["sections"];
  for (const id of Object.keys(def.copy) as SectionId[]) {
    const c = pickOne(rand, def.copy[id]);
    sections[id] = { eyebrow: fill(c.eyebrow, vars), title: fill(c.title, vars), ...(c.lede ? { lede: fill(c.lede, vars) } : {}) };
  }
  return { assistant, kicker: pickOne(rand, def.kickers), heroCta: fill(pickOne(rand, def.ctas), vars), codeStyle: def.codeStyle, sections };
}

export function generateGenome(r: Resume, opts: GenerateOptions): Genome {
  const seed = Math.abs(Math.floor(opts.seed)) % 2 ** 31;
  const rand = mulberry32(seed + 7);
  const prev = opts.previous;
  const locked = (k: LockKey) => !!prev && !!opts.locks?.includes(k);

  // 1. concept: explicit > locked > affinity-weighted pick
  const aff = conceptAffinity(resumeText(r));
  const concept: Genome["concept"] =
    opts.concept ?? (locked("concept") ? prev!.concept : pick(rand, CONCEPTS.map((c) => [c, aff[c]] as [Genome["concept"], number])));
  const def = CONCEPT_DEFS[concept];

  // 2. palette
  const paletteRecipe = locked("palette") ? prev!.paletteRecipe : pick(rand, def.palettes);
  const accentHue = locked("palette") ? prev!.accentHue : inBand(rand, def.accentHues);
  const paperHue = locked("palette") ? prev!.paperHue : inBand(rand, def.paperHues);
  const palette = locked("palette")
    ? prev!.palette
    : { light: generatePalette(paletteRecipe, "light", accentHue, paperHue), dark: generatePalette(paletteRecipe, "dark", accentHue, paperHue) };
  const defaultTheme = opts.theme ?? (locked("palette") ? prev!.defaultTheme : pick(rand, def.defaultTheme));

  // 3. type, hero, motion
  const fonts = locked("fonts") ? prev!.fonts : pick(rand, def.fonts);
  const hero = locked("hero") ? prev!.hero : pick(rand, def.heroes);
  let motion = locked("motion") ? prev!.motion : pick(rand, def.motions);
  if (opts.energy !== undefined && !locked("motion")) motion = opts.energy < 0.34 ? "calm" : opts.energy > 0.66 ? "cinematic" : "snappy";

  // 4. layout: variants + order (content-aware: e.g. no metrics → numbers strip is pointless, prefer it compact)
  const hasGraph = allHighlights(r).some((h) => h.skills.length > 0);
  const projectCount = projectsWithHighlights(r).length;
  const layout = locked("layout")
    ? { sections: prev!.sections, order: prev!.order, density: prev!.density, radius: prev!.radius, texture: prev!.texture }
    : {
        sections: {
          telemetry: pick(rand, def.variants.telemetry),
          trajectory: pick(rand, def.variants.trajectory),
          payload: hasGraph ? pick(rand, def.variants.payload) : ("bars" as const),
          missions: projectCount > 6 ? pick(rand, def.variants.missions) : pick(rand, def.variants.missions),
        },
        order: pick(rand, def.orders),
        density: pick(rand, def.densities),
        radius: pick(rand, def.radii),
        texture: pick(rand, def.textures),
      };

  const copy = locked("copy") && prev!.concept === concept ? prev!.copy : buildCopy(r, def, rand);

  return { version: 1, seed, concept, paletteRecipe, accentHue, paperHue, palette, defaultTheme, fonts, hero, motion, copy, ...layout };
}

/** Chapter order for a genome (training + comms always close the page). */
export function chapterOrder(g: Pick<Genome, "order">): SectionId[] {
  switch (g.order) {
    case "work-first":
      return ["missions", "telemetry", "trajectory", "payload", "training", "comms"];
    case "skills-first":
      return ["telemetry", "payload", "trajectory", "missions", "training", "comms"];
    default:
      return ["telemetry", "trajectory", "payload", "missions", "training", "comms"];
  }
}

/** Seed from any string (slug, name) — stable across runs and platforms. */
export function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2 ** 31;
}
