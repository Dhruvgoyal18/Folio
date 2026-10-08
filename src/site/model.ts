import type { Resume } from "@/data/schema";
import type { Genome, SectionId } from "@/genome/schema";
import { chapterOrder } from "@/genome/generate";
import { CONCEPT_DEFS } from "@/genome/concepts";
import { customOrder, type Custom } from "@/lib/customize";
import type { SkillGraph } from "@/lib/skill-graph-types";
import { citeTargets, currentRole, firstName, kpis, projectsWithHighlights, skillUsage } from "@/lib/resume";

/** What a published site is: the resume, its design genome, and precomputed layouts. */
export type SiteData = {
  slug: string;
  resume: Resume;
  genome: Genome;
  graph: SkillGraph;
  /** owner choices: hidden chapters and chapter order (numbers and case files are already applied to `resume`) */
  custom?: Custom;
  updatedAt?: string;
};

export type Chapter = { id: "launch" | SectionId; code: string; label: string };

export function chapterCode(style: Genome["copy"]["codeStyle"], n: number): string {
  const nn = String(n).padStart(2, "0");
  return style === "section" ? `§${n}` : style === "path" ? `~/${nn}` : nn;
}

/** Derived, memoizable view of a site used by every section. */
export function buildModel(site: SiteData) {
  const r = site.resume;
  const g = site.genome;
  const k = kpis(r);
  const usage = skillUsage(r);
  const projects = projectsWithHighlights(r);
  const hasContent: Record<SectionId, boolean> = {
    telemetry: k.length >= 2,
    trajectory: r.experience.length > 0,
    payload: r.skills.length > 0,
    missions: projects.length > 0,
    training: r.education.length + r.competitions.length + r.awards.length > 0,
    comms: true,
  };
  const order = customOrder(chapterOrder(g), site.custom).filter((id) => hasContent[id]);
  const chapters: Chapter[] = [
    { id: "launch", code: chapterCode(g.copy.codeStyle, 1), label: CONCEPT_DEFS[g.concept].launchLabel },
    ...order.map((id, i) => ({ id, code: chapterCode(g.copy.codeStyle, i + 2), label: g.copy.sections[id].eyebrow.split(/[&,]/)[0]!.trim() })),
  ];
  return {
    ...site,
    kpis: k,
    usage,
    projects,
    cites: citeTargets(r),
    skillName: new Map(r.skills.map((s) => [s.id, s.name])),
    first: firstName(r),
    current: currentRole(r),
    chapters,
    chapterOf: (id: SectionId) => chapters.find((c) => c.id === id),
    chatEndpoint: `/api/chat?site=${encodeURIComponent(site.slug)}`,
  };
}
export type SiteModel = ReturnType<typeof buildModel>;
