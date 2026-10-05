import { z } from "zod";

/**
 * DraftResume: the loose, human-shaped structure both extractors produce (rule-based parser
 * and Claude). `normalize()` turns it into a strict, validated `Resume` — ids, dates, skills,
 * evidence links, metrics and case files are all derived deterministically from the draft.
 */
const str = z.string().trim();
const opt = str.nullish().transform((v) => v || undefined).optional();

export const DraftSchema = z.object({
  name: str.min(1),
  headline: opt,
  summary: opt,
  email: opt,
  phone: opt,
  location: opt,
  links: z.array(z.object({ label: opt, url: str.min(1) })).default([]),
  experience: z
    .array(
      z.object({
        org: str.min(1),
        role: str.min(1),
        type: opt,
        location: opt,
        start: opt,
        end: opt,
        groups: z.array(z.object({ title: opt, bullets: z.array(str.min(1)).default([]) })).default([]),
      }),
    )
    .default([]),
  education: z
    .array(z.object({ institution: str.min(1), degree: str.min(1), start: opt, end: opt, coursework: z.array(str.min(1)).default([]) }))
    .default([]),
  skills: z.array(z.object({ group: opt, items: z.array(str.min(1)).default([]) })).default([]),
  projects: z.array(z.object({ title: str.min(1), start: opt, link: opt, bullets: z.array(str.min(1)).default([]) })).default([]),
  competitions: z.array(z.object({ name: str.min(1), result: opt, start: opt, end: opt, bullets: z.array(str.min(1)).default([]) })).default([]),
  awards: z.array(z.object({ text: str.min(1), title: opt, year: opt })).default([]),
});
export type Draft = z.infer<typeof DraftSchema>;
export type DraftInput = z.input<typeof DraftSchema>;

/** JSON Schema of the draft, handed to Claude as a tool input schema. */
export const draftJsonSchema = {
  type: "object",
  required: ["name", "experience", "education", "skills"],
  properties: {
    name: { type: "string", description: "Full name exactly as written" },
    headline: { type: "string", description: "Title line under the name, verbatim, if present" },
    summary: { type: "string", description: "Summary/objective paragraph, verbatim, if present" },
    email: { type: "string" },
    phone: { type: "string" },
    location: { type: "string" },
    links: { type: "array", items: { type: "object", required: ["url"], properties: { label: { type: "string" }, url: { type: "string" } } } },
    experience: {
      type: "array",
      items: {
        type: "object",
        required: ["org", "role", "groups"],
        properties: {
          org: { type: "string" },
          role: { type: "string" },
          type: { type: "string", description: "Full-time, Part-time, Internship, Contract, Freelance or Volunteer if stated" },
          location: { type: "string" },
          start: { type: "string", description: "YYYY-MM (or YYYY)" },
          end: { type: "string", description: "YYYY-MM, YYYY, or 'Present'" },
          groups: {
            type: "array",
            description: "Bullets, grouped under sub-headings if the resume has them (title omitted otherwise)",
            items: { type: "object", required: ["bullets"], properties: { title: { type: "string" }, bullets: { type: "array", items: { type: "string" } } } },
          },
        },
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        required: ["institution", "degree"],
        properties: { institution: { type: "string" }, degree: { type: "string" }, start: { type: "string" }, end: { type: "string" }, coursework: { type: "array", items: { type: "string" } } },
      },
    },
    skills: { type: "array", items: { type: "object", required: ["items"], properties: { group: { type: "string" }, items: { type: "array", items: { type: "string" } } } } },
    projects: { type: "array", items: { type: "object", required: ["title", "bullets"], properties: { title: { type: "string" }, start: { type: "string" }, link: { type: "string" }, bullets: { type: "array", items: { type: "string" } } } } },
    competitions: {
      type: "array",
      items: { type: "object", required: ["name", "bullets"], properties: { name: { type: "string" }, result: { type: "string" }, start: { type: "string" }, end: { type: "string" }, bullets: { type: "array", items: { type: "string" } } } },
    },
    awards: { type: "array", items: { type: "object", required: ["text"], properties: { title: { type: "string" }, text: { type: "string" }, year: { type: "string" } } } },
  },
} as const;

/** Collapse whitespace (incl. tabs, zero-width and line separators) the way the schema will see it. */
const tt = (v: string | undefined | null) => (v ?? "").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
const optT = (v: string | undefined | null) => tt(v) || undefined;
/** has at least one letter or digit (so "??", "—", "•" don't count as an entry) */
const real = (v: string | undefined | null) => /[\p{L}\p{N}]/u.test(tt(v));

/** Drop blank rows the editor may have left and fill required fields, so the schema sees only real entries. */
export function tidyDraft(d: Draft): Draft {
  const lines = (a: string[] | undefined) => (a ?? []).map(tt).filter(Boolean);
  return {
    name: tt(d.name),
    headline: optT(d.headline),
    summary: optT(d.summary),
    email: optT(d.email),
    phone: optT(d.phone),
    location: optT(d.location),
    links: (d.links ?? []).filter((l) => tt(l.url)).map((l) => ({ url: tt(l.url), label: optT(l.label) })),
    experience: (d.experience ?? [])
      .filter((e) => real(e.org) || real(e.role))
      .map((e) => ({
        org: real(e.org) ? tt(e.org) : "Independent",
        role: real(e.role) ? tt(e.role) : "Role",
        type: optT(e.type),
        location: optT(e.location),
        start: optT(e.start),
        end: optT(e.end),
        groups: (e.groups ?? []).map((g) => ({ title: optT(g.title), bullets: lines(g.bullets) })).filter((g) => g.bullets.length),
      })),
    education: (d.education ?? []).filter((e) => real(e.institution)).map((e) => ({ institution: tt(e.institution), degree: tt(e.degree) || "Studies", start: optT(e.start), end: optT(e.end), coursework: lines(e.coursework) })),
    skills: (d.skills ?? []).map((g) => ({ group: optT(g.group), items: lines(g.items) })).filter((g) => g.items.length),
    projects: (d.projects ?? []).filter((p) => real(p.title)).map((p) => ({ title: tt(p.title), start: optT(p.start), link: optT(p.link), bullets: lines(p.bullets) })),
    competitions: (d.competitions ?? []).filter((c) => real(c.name)).map((c) => ({ name: tt(c.name), result: optT(c.result), start: optT(c.start), end: optT(c.end), bullets: lines(c.bullets) })),
    awards: (d.awards ?? []).filter((a) => tt(a.text)).map((a) => ({ text: tt(a.text), title: optT(a.title), year: optT(a.year) })),
  };
}
