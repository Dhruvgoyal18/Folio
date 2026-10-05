import { auditPalette, generatePalette, type Palette } from "./palette";
import { GenomeSchema, type Genome } from "./schema";

/**
 * Publish-time gate. A genome from any client (including a hand-edited one) must parse,
 * and both palettes must pass WCAG AA. Failing palettes are regenerated from the genome's
 * own hues rather than rejected, so publishing never ships an inaccessible site.
 */
export function validateGenome(input: unknown): { ok: true; genome: Genome; repaired: string[] } | { ok: false; issues: string[] } {
  const parsed = GenomeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  const g = structuredClone(parsed.data);
  const repaired: string[] = [];
  for (const mode of ["light", "dark"] as const) {
    const issues = auditPalette(g.palette[mode] as Palette);
    if (issues.length) {
      g.palette[mode] = generatePalette(g.paletteRecipe, mode, g.accentHue, g.paperHue);
      repaired.push(`${mode} palette regenerated (${issues.map((i) => `${i.role} on ${i.against} ${i.ratio}:1`).join(", ")})`);
    }
  }
  return { ok: true, genome: g, repaired };
}
