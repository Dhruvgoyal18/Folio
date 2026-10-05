import { seedResume } from "@/data/seed";
import { computeSkillGraph } from "@/lib/skill-graph";
import type { SiteData } from "@/site/model";
import { SHOWCASE_SLUG, signatureGenome } from "@/site/showcase";

/** Sites that exist without a store entry (the platform showcase). */
let cache: SiteData | null = null;
export function builtinSite(slug: string): SiteData | null {
  if (slug !== SHOWCASE_SLUG) return null;
  cache ??= { slug: SHOWCASE_SLUG, resume: seedResume, genome: signatureGenome(), graph: computeSkillGraph(seedResume) };
  return cache;
}
