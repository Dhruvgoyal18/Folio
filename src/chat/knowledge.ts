import type { Resume } from "@/data/schema";
import { allHighlights, dateRange, domainsInUse, kpis, formatMetric, firstName } from "@/lib/resume";

/**
 * Turns a resume into (a) the grounded context block for the model and
 * (b) retrieval chunks for the offline fallback. Each line carries its cite id.
 * Works for any resume on the platform — nothing here is person-specific.
 */

export type Chunk = { id: string; cites: string[]; text: string; boost?: string };

/** Resume text is user-supplied: neutralise anything that could close the data block. */
const clean = (s: string) => s.replace(/<\/?\s*(resume|system|instructions?|assistant|user)[^>]*>/gi, "").replace(/\s+/g, " ").trim();

export function resumeContext(r: Resume): string {
  const lines: string[] = [];
  const p = r.profile;
  lines.push(`[profile] ${p.name}. ${p.headline}${p.headlineDerived ? " (summary line written for this site from the resume)" : ""}.${p.currentRole ? ` Current role: ${p.currentRole}.` : ""}${p.location ? ` Location: ${p.location}.` : ""}`);
  if (p.summary) lines.push(`[profile] Summary from the resume: ${p.summary}`);
  const contact = [
    p.email ? `Email ${p.email}` : "",
    p.phone ? `phone ${p.phone}` : "",
    ...p.links.filter((l) => !["email", "phone", "resume"].includes(l.kind)).map((l) => `${l.label} ${l.href}`),
    p.links.some((l) => l.kind === "resume") ? "resume PDF downloadable on this site" : "",
  ].filter(Boolean);
  lines.push(`[contact] ${contact.join("; ") || "Contact details are in the Contact section."}.`);
  for (const e of r.education) {
    lines.push(`[${e.id}] Education: ${e.degree}, ${e.institution} (${dateRange(e.start, e.end, e.yearOnly)}).${e.coursework.length ? ` Relevant coursework: ${e.coursework.join(", ")}.` : ""}`);
  }
  for (const e of [...r.experience].sort((a, b) => b.start.localeCompare(a.start))) {
    lines.push(`[${e.id}] ${e.role}, ${e.org} — ${e.type}, ${dateRange(e.start, e.end, e.yearOnly)}${e.end === null ? " (current role)" : ""}${e.location ? `, ${e.location}` : ""}.`);
    for (const g of e.groups) {
      if (g.title) lines.push(`  ${g.title}:`);
      for (const h of g.highlights) lines.push(`  - ${h.text}`);
    }
  }
  for (const c of r.competitions) {
    lines.push(`[${c.id}] Competition: ${c.name} — ${c.result} (${dateRange(c.start, c.end, c.yearOnly)}).`);
    for (const h of c.highlights) lines.push(`  - ${h.text}`);
  }
  for (const a of r.awards) lines.push(`[${a.id}] Award: ${a.text}`);
  const hs = new Map(allHighlights(r).map((h) => [h.id, h]));
  for (const pr of r.projects) {
    if (pr.highlights.length) {
      lines.push(`[${pr.id}] Project "${pr.title}": ${pr.summary}`);
      for (const h of pr.highlights) lines.push(`  - ${h.text}`);
    } else {
      const owner = hs.get(pr.highlightIds[0] ?? "")?.ownerId;
      lines.push(`[${pr.id}] Case file "${pr.title}" (groups bullets from ${owner}): ${pr.summary}`);
    }
  }
  const listed = r.skills.filter((s) => s.listed);
  if (r.skills.length) {
    lines.push(`[skills] Skills on the resume:`);
    const groups = [...new Set(listed.map((s) => s.listGroup ?? "Skills"))];
    for (const g of groups) lines.push(`  ${g}: ${listed.filter((s) => (s.listGroup ?? "Skills") === g).map((s) => s.name).join(", ")}`);
    const extra = r.skills.filter((s) => !s.listed).map((s) => s.name);
    if (extra.length) lines.push(`  Also named inside bullets: ${extra.join(", ")}`);
  }
  return lines.map(clean).join("\n");
}

export function chunks(r: Resume): Chunk[] {
  const out: Chunk[] = [];
  const p = r.profile;
  out.push({ id: "profile", cites: ["profile"], text: `${p.name}${p.currentRole ? ` — ${p.currentRole}` : ""}. ${p.headline}.`, boost: "who about summary introduce yourself overview background current now today" });
  if (p.summary) out.push({ id: "summary", cites: ["profile"], text: p.summary, boost: "summary about objective overview" });
  out.push({
    id: "contact",
    cites: ["contact"],
    text: [p.email ? `Email ${p.email}` : "", p.phone ? `phone ${p.phone}` : "", ...p.links.filter((l) => ["linkedin", "github", "website"].includes(l.kind)).map((l) => `${l.label}: ${l.href}`)].filter(Boolean).join(", ") + ".",
    boost: "contact email reach hire phone call linkedin github website portfolio message connect",
  });
  const k = kpis(r);
  if (k.length)
    out.push({
      id: "kpis",
      cites: [...new Set(k.map((x) => x.ownerId))],
      text: `Headline numbers: ${k.map((x) => `${x.from !== undefined ? `${x.from}${x.suffix.replace(/\+$/, "")} → ` : ""}${formatMetric(x)} ${x.label} (${x.ownerShort})`).join("; ")}.`,
      boost: "results metrics numbers impact measurable strongest biggest best achievements accomplishments quantified outcomes kpi kpis wins",
    });
  for (const e of r.education) {
    out.push({ id: e.id, cites: [e.id], text: `${e.degree} at ${e.institution} (${dateRange(e.start, e.end, e.yearOnly)})${e.coursework.length ? `; coursework: ${e.coursework.join(", ")}` : ""}.`, boost: "education study studied degree college university school graduate coursework" });
  }
  const projectOf = new Map<string, string>();
  for (const pr of r.projects) for (const h of pr.highlightIds) projectOf.set(h, pr.id);
  for (const e of r.experience) {
    out.push({ id: e.id, cites: [e.id], text: `${e.role} at ${e.org} (${e.type}, ${dateRange(e.start, e.end, e.yearOnly)}${e.end === null ? ", current" : ""}).`, boost: `experience job role company ${e.end === null ? "current now present today" : ""} ${e.type.toLowerCase()}` });
    for (const g of e.groups)
      for (const h of g.highlights) {
        const pr = projectOf.get(h.id);
        out.push({ id: h.id, cites: pr ? [e.id, pr] : [e.id], text: `${e.orgShort} (${e.role}): ${h.text}`, boost: `${g.title ?? ""} ${e.org}` });
      }
  }
  for (const c of r.competitions) {
    out.push({ id: c.id, cites: [c.id], text: `${c.name}: ${c.result} (${dateRange(c.start, c.end, c.yearOnly)}).`, boost: "competition hackathon won medal award achievement" });
    for (const h of c.highlights) {
      const pr = projectOf.get(h.id);
      out.push({ id: h.id, cites: pr ? [c.id, pr] : [c.id], text: `${c.name}: ${h.text}`, boost: "competition" });
    }
  }
  for (const pr of r.projects) {
    out.push({ id: pr.id, cites: pr.source ? [pr.id, pr.source.id] : [pr.id], text: `${pr.title} (${pr.codename}): ${pr.summary}`, boost: `project mission case ${pr.codename.toLowerCase()}` });
    for (const h of pr.highlights) out.push({ id: h.id, cites: [pr.id], text: `${pr.title}: ${h.text}`, boost: "project built" });
  }
  for (const a of r.awards) out.push({ id: a.id, cites: [a.id], text: a.text, boost: "award achievement medal won honor prize" });
  for (const d of domainsInUse(r)) {
    const s = r.skills.filter((x) => x.domain === d.id);
    out.push({ id: `skills-${d.id}`, cites: ["skills"], text: `${d.label}: ${s.map((x) => x.name).join(", ")}.`, boost: "skills stack tech technologies tools languages frameworks libraries know software" });
  }
  return out.map((c) => ({ ...c, text: clean(c.text) }));
}

export { firstName };
