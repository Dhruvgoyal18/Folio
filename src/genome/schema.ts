import { z } from "zod";

/**
 * The design genome: everything that makes one portfolio look and feel different from another.
 * It is *data* chosen from a curated, validated design space — never generated code — so every
 * combination keeps the platform's accessibility and performance guarantees.
 */

export const CONCEPTS = ["mission", "editorial", "terminal", "minimal", "noir", "brutalist", "aurora", "scholar", "blueprint"] as const;
export const HEROES = ["constellation", "contours", "flowfield", "aurora", "monogram"] as const;
export const MOTIONS = ["calm", "snappy", "cinematic"] as const;
export const DENSITIES = ["airy", "compact"] as const;
export const RADII = ["sharp", "soft", "round"] as const;
export const TEXTURES = ["grid", "grain", "scanlines", "none"] as const;
export const ORDERS = ["story", "work-first", "skills-first"] as const;
export const SECTION_IDS = ["telemetry", "trajectory", "payload", "missions", "training", "comms"] as const;
export const VARIANTS = {
  telemetry: ["dials", "strip"],
  trajectory: ["rail", "ledger"],
  payload: ["graph", "bars"],
  missions: ["cards", "index"],
} as const;

const hex = z.string().regex(/^#[0-9A-F]{6}$/i);
/** colours end up inside a <style> element, so only hex and rgb()/rgba() literals are accepted */
const color = z.string().regex(/^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+%?\s*)?\))$/i);

export const PaletteSchema = z.record(z.string().regex(/^[a-z][a-z0-9-]{0,31}$/), color)
  .refine((p) => Object.keys(p).length <= 48, "palette has too many roles").refine((p) => ["paper", "ink", "signal", "signal-ink", "ink-muted"].every((k) => k in p), "palette is missing roles");

const line = (max: number) => z.string().max(max);
export const SectionCopySchema = z.object({ eyebrow: line(80), title: line(140), lede: line(480).optional() });

export const GenomeSchema = z.object({
  version: z.literal(1),
  seed: z.number().int().nonnegative().max(2 ** 32),
  concept: z.enum(CONCEPTS),
  paletteRecipe: z.enum(["paper", "gallery", "phosphor", "studio", "noir", "blueprint", "pastel", "poster"]),
  accentHue: z.number().min(0).max(360),
  paperHue: z.number().min(0).max(360),
  palette: z.object({ light: PaletteSchema, dark: PaletteSchema }),
  defaultTheme: z.enum(["light", "dark"]),
  fonts: z.enum(["grotesk", "editorial", "swiss", "terminal", "neo", "technical", "minimal", "noir", "poster", "modern", "scholar", "blueprint"]),
  motion: z.enum(MOTIONS),
  hero: z.enum(HEROES),
  density: z.enum(DENSITIES),
  radius: z.enum(RADII),
  texture: z.enum(TEXTURES),
  order: z.enum(ORDERS),
  sections: z.object({
    telemetry: z.enum(VARIANTS.telemetry),
    trajectory: z.enum(VARIANTS.trajectory),
    payload: z.enum(VARIANTS.payload),
    missions: z.enum(VARIANTS.missions),
  }),
  copy: z.object({
    assistant: z.string().min(1).max(24),
    kicker: line(120),
    heroCta: line(60),
    codeStyle: z.enum(["numeric", "section", "path"]),
    sections: z.object({
      telemetry: SectionCopySchema,
      trajectory: SectionCopySchema,
      payload: SectionCopySchema,
      missions: SectionCopySchema,
      training: SectionCopySchema,
      comms: SectionCopySchema,
    }),
  }),
});
export type Genome = z.infer<typeof GenomeSchema>;
export type Concept = Genome["concept"];
export type SectionId = (typeof SECTION_IDS)[number];

/** Fields an owner can lock while remixing. */
export const LOCKABLE = ["concept", "palette", "fonts", "hero", "layout", "motion", "copy"] as const;
export type LockKey = (typeof LOCKABLE)[number];

export { hex as HexSchema };
