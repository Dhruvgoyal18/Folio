import { z } from "zod";

/**
 * Single source of truth for resume data — for every site on the platform.
 * Every section, KPI, graph edge and chat answer is derived from a value that
 * passes this schema. `derived: true` marks wording composed by the system
 * (not copied from the resume) so it can be audited and shown as such.
 */

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM");

export const IdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "ids are kebab-case");

/** Skill categories are data, not code: a designer's and an ML engineer's resumes group skills differently. */
export const DomainSchema = z.object({ id: IdSchema, label: z.string().min(1) });
export type Domain = z.infer<typeof DomainSchema>;
export type SkillDomain = string;

export const SkillSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  domain: IdSchema,
  /** true = appears in the resume's Skills section; false = only named inside a bullet */
  listed: z.boolean(),
  listGroup: z.string().optional(),
});
export type Skill = z.infer<typeof SkillSchema>;

export const MetricSchema = z.object({
  value: z.number(),
  from: z.number().optional(),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
  decimals: z.number().int().min(0).max(3).default(0),
  label: z.string().min(1),
  /** show in the Telemetry / numbers section */
  kpi: z.boolean().default(false),
});
export type Metric = z.infer<typeof MetricSchema>;

export const HighlightSchema = z.object({
  id: IdSchema,
  text: z.string().min(1),
  /** the resume's own wording when `text` was edited at the owner's request */
  original: z.string().optional(),
  skills: z.array(IdSchema).default([]),
  metrics: z.array(MetricSchema).default([]),
});
export type Highlight = z.infer<typeof HighlightSchema>;

export const HighlightGroupSchema = z.object({
  title: z.string().optional(),
  highlights: z.array(HighlightSchema).min(1),
});

export const ExperienceSchema = z.object({
  id: IdSchema,
  org: z.string().min(1),
  orgShort: z.string().min(1),
  role: z.string().min(1),
  type: z.enum(["Full-time", "Part-time", "Internship", "Contract", "Freelance", "Volunteer", "Leadership", "Other"]),
  location: z.string().optional(),
  start: yearMonth,
  end: yearMonth.nullable(),
  /** the résumé gave years only — show "2019 – 2021", not "Jan 2019 – Jan 2021" */
  yearOnly: z.boolean().optional(),
  groups: z.array(HighlightGroupSchema).min(1),
});
export type Experience = z.infer<typeof ExperienceSchema>;

export const CompetitionSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  short: z.string().optional(),
  result: z.string().min(1),
  start: yearMonth,
  end: yearMonth,
  yearOnly: z.boolean().optional(),
  highlights: z.array(HighlightSchema).min(1),
});
export type Competition = z.infer<typeof CompetitionSchema>;

export const AwardSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  text: z.string().min(1),
  year: z.number().int().optional(),
  medal: z.enum(["gold", "silver", "bronze", "rank", "team", "other"]),
});
export type Award = z.infer<typeof AwardSchema>;

export const EducationSchema = z.object({
  id: IdSchema,
  institution: z.string().min(1),
  short: z.string().optional(),
  degree: z.string().min(1),
  start: yearMonth,
  end: yearMonth,
  yearOnly: z.boolean().optional(),
  coursework: z.array(z.string()).default([]),
});
export type Education = z.infer<typeof EducationSchema>;

export const ProjectSchema = z.object({
  id: IdSchema,
  codename: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  /** true when the summary was composed by the system from bullets */
  derived: z.boolean(),
  /** set when the case file regroups bullets from a role or competition */
  source: z.object({ kind: z.enum(["experience", "competition"]), id: IdSchema }).optional(),
  highlightIds: z.array(IdSchema).default([]),
  /** bullets owned by the project itself (a "Projects" section on the resume) */
  highlights: z.array(HighlightSchema).default([]),
  start: yearMonth.optional(),
  link: z.string().url().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const LinkSchema = z.object({
  kind: z.enum(["email", "phone", "linkedin", "github", "website", "resume", "other"]),
  label: z.string(),
  href: z.string().min(1),
});
export type Link = z.infer<typeof LinkSchema>;

export const ResumeSchema = z
  .object({
    meta: z.object({
      source: z.string(),
      parsedAt: z.string(),
      notes: z.array(z.string()).default([]),
    }),
    profile: z.object({
      name: z.string().min(1),
      callsign: z.string().min(1),
      headline: z.string().min(1),
      headlineDerived: z.boolean(),
      /** the resume's own summary/objective, verbatim */
      summary: z.string().optional(),
      currentRole: z.string().default(""),
      location: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      links: z.array(LinkSchema).default([]),
    }),
    domains: z.array(DomainSchema).default([]),
    education: z.array(EducationSchema).default([]),
    skills: z.array(SkillSchema).default([]),
    experience: z.array(ExperienceSchema).default([]),
    competitions: z.array(CompetitionSchema).default([]),
    awards: z.array(AwardSchema).default([]),
    projects: z.array(ProjectSchema).default([]),
  })
  .superRefine((r, ctx) => {
    const skillIds = new Set(r.skills.map((s) => s.id));
    const domainIds = new Set(r.domains.map((d) => d.id));
    const allHighlights = [
      ...r.experience.flatMap((e) => e.groups.flatMap((g) => g.highlights)),
      ...r.competitions.flatMap((c) => c.highlights),
      ...r.projects.flatMap((p) => p.highlights),
    ];
    const seen = new Set<string>();
    for (const id of [
      ...r.skills.map((s) => s.id),
      ...r.experience.map((e) => e.id),
      ...r.competitions.map((c) => c.id),
      ...r.awards.map((a) => a.id),
      ...r.education.map((e) => e.id),
      ...r.projects.map((p) => p.id),
      ...allHighlights.map((h) => h.id),
    ]) {
      if (seen.has(id)) ctx.addIssue({ code: "custom", message: `duplicate id ${id}` });
      seen.add(id);
    }
    for (const s of r.skills) {
      if (!domainIds.has(s.domain)) ctx.addIssue({ code: "custom", message: `skill ${s.id} uses unknown domain ${s.domain}` });
    }
    for (const h of allHighlights) {
      for (const s of h.skills) {
        if (!skillIds.has(s)) ctx.addIssue({ code: "custom", message: `highlight ${h.id} references unknown skill ${s}` });
      }
    }
    const hIds = new Set(allHighlights.map((h) => h.id));
    for (const p of r.projects) {
      if (p.source) {
        const pool = p.source.kind === "experience" ? r.experience.find((e) => e.id === p.source!.id) : r.competitions.find((c) => c.id === p.source!.id);
        if (!pool) ctx.addIssue({ code: "custom", message: `project ${p.id} has unknown source ${p.source.id}` });
      }
      for (const h of p.highlightIds) {
        if (!hIds.has(h)) ctx.addIssue({ code: "custom", message: `project ${p.id} references unknown highlight ${h}` });
      }
      if (!p.highlightIds.length && !p.highlights.length) ctx.addIssue({ code: "custom", message: `project ${p.id} has no bullets` });
    }
    for (const e of r.experience) {
      if (e.end && e.end < e.start) ctx.addIssue({ code: "custom", message: `${e.id} ends before it starts` });
    }
  });

export type Resume = z.infer<typeof ResumeSchema>;
