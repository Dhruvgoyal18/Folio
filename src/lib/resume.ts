import type { Resume, Highlight, Metric, Skill, SkillDomain } from "@/data/schema";

/**
 * Pure, resume-agnostic views over a validated Resume. Nothing here knows whose
 * resume it is: every site on the platform runs through the same functions.
 */

export function domainLabel(r: Resume, id: SkillDomain): string {
  return r.domains.find((d) => d.id === id)?.label ?? id;
}
/** Domains that actually have skills, most populated first. */
export function domainsInUse(r: Resume): Array<{ id: string; label: string }> {
  const count = (id: string) => r.skills.filter((s) => s.domain === id).length;
  return r.domains.filter((d) => count(d.id) > 0).sort((a, b) => count(b.id) - count(a.id));
}

export type OwnedHighlight = Highlight & {
  ownerId: string;
  ownerKind: "experience" | "competition" | "project";
  ownerLabel: string;
  /** short owner name, e.g. "Zolve" */
  ownerShort: string;
  /** YYYY-MM the owning role started (projects: their own start, if any) */
  date: string | null;
  group?: string;
};

export function allHighlights(r: Resume): OwnedHighlight[] {
  const out: OwnedHighlight[] = [];
  for (const e of r.experience) {
    for (const g of e.groups) {
      for (const h of g.highlights) {
        out.push({ ...h, ownerId: e.id, ownerKind: "experience", ownerLabel: `${e.role} · ${e.orgShort}`, ownerShort: e.orgShort, date: e.start, group: g.title });
      }
    }
  }
  for (const c of r.competitions) {
    for (const h of c.highlights) {
      out.push({ ...h, ownerId: c.id, ownerKind: "competition", ownerLabel: `${c.name} · ${c.result}`, ownerShort: c.short ?? c.name, date: c.start });
    }
  }
  for (const p of r.projects) {
    for (const h of p.highlights) {
      out.push({ ...h, ownerId: p.id, ownerKind: "project", ownerLabel: p.title, ownerShort: p.title, date: p.start ?? null });
    }
  }
  return out;
}

export type MetricKind = NonNullable<Metric["kind"]>;

const DOWN_WORDS = /\b(reduc\w*|cut\w*|lower\w*|decreas\w*|drop\w*|shr[iau]nk\w*|sav(?:e|ed|ing|ings)|less|fewer|latency|downtime|churn|cost)\b/i;

/** How a metric should be read (and drawn). Explicit `kind` wins; otherwise inferred from its shape and words. */
export function metricKind(m: Pick<Metric, "kind" | "from" | "prefix" | "suffix" | "label">, sourceText = ""): MetricKind {
  if (m.kind) return m.kind;
  if (m.from !== undefined) return "change";
  if (/[$€£₹]/.test(m.prefix)) return "money";
  if (m.suffix.startsWith("×") || /^x$/i.test(m.suffix)) return "multiple";
  if (m.suffix.includes("%")) {
    if (m.prefix === "−" || m.prefix === "-" || DOWN_WORDS.test(m.label)) return "reduction";
    if (m.prefix === "+") return "lift";
    if (DOWN_WORDS.test(sourceText) && /\bby\b/i.test(sourceText) && !/accura|precision|recall|f1|score|reliab|uptime|coverage|satisf/i.test(m.label)) return "reduction";
    return "share";
  }
  return "count";
}

/** Strength of a kind for picking and ordering headline numbers. */
export const KIND_WEIGHT: Record<MetricKind, number> = { change: 6, money: 5, reduction: 5, multiple: 5, lift: 4, share: 3, count: 3 };

export type Kpi = Metric & {
  kind: MetricKind;
  highlightId: string;
  ownerId: string;
  ownerLabel: string;
  ownerShort: string;
  sourceText: string;
  /** what the number is about: the case file it belongs to, else the role's group, else the role */
  context: string;
};

/** "peak memory reduction" → "Peak memory reduction" (labels are lifted from bullets, often lower-case). */
export function sentenceCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function kpis(r: Resume): Kpi[] {
  const projectOf = new Map<string, string>();
  for (const p of r.projects) for (const id of [...p.highlightIds, ...p.highlights.map((h) => h.id)]) if (!projectOf.has(id)) projectOf.set(id, p.title);
  const out = allHighlights(r).flatMap((h, hi) =>
    h.metrics
      .filter((m) => m.kpi)
      .map((m, mi) => {
        const kind = metricKind(m, h.text);
        const role = h.ownerKind === "experience" ? r.experience.find((e) => e.id === h.ownerId)?.role : undefined;
        const context = projectOf.get(h.id) ?? h.group ?? role ?? h.ownerShort;
        return { k: { ...m, kind, highlightId: h.id, ownerId: h.ownerId, ownerLabel: h.ownerLabel, ownerShort: h.ownerShort, sourceText: h.text, context }, order: hi * 10 + mi };
      }),
  );
  return out
    .sort((a, b) => (a.k.kpiRank ?? 100) - (b.k.kpiRank ?? 100) || (a.k.kpiRank !== undefined ? 0 : KIND_WEIGHT[b.k.kind] - KIND_WEIGHT[a.k.kind]) || a.order - b.order)
    .map((x) => x.k);
}

/**
 * Derived, honest arithmetic for a reduction: 99.93% less → "≈1,400× less". Only shown when the
 * remainder is small enough for the ratio to be the clearer way to say it.
 */
export function reductionRatio(value: number): string | null {
  if (value < 75 || value >= 100) return null;
  const ratio = 100 / (100 - value);
  const sig = ratio >= 100 ? Math.round(ratio / 100) * 100 : ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10;
  return `≈${sig.toLocaleString("en-US")}×`;
}

/** Short proof points for a hero: school, top competition results, medals. Pure data, nothing invented. */
export function credentials(r: Resume, max = 3): string[] {
  const out: string[] = [];
  const edu = r.education[0];
  if (edu) out.push(edu.short ?? edu.institution);
  const strong = /\b(gold|winner|won|1st|first|champion|silver|2nd|bronze|3rd|finalist|top\s?\d+)/i;
  for (const c of r.competitions) if (strong.test(c.result)) out.push(`${c.result}, ${c.short ?? c.name}`);
  for (const a of r.awards) if (a.medal === "gold" || a.medal === "silver") out.push(a.title);
  return [...new Set(out)].slice(0, max);
}

export function formatMetric(m: Pick<Metric, "value" | "prefix" | "suffix" | "decimals">, value = m.value): string {
  return `${m.prefix}${value.toFixed(m.decimals)}${m.suffix}`;
}

/** A metric as a compact tag: "68%→87%", "14→6 minutes" style changes keep their starting point. */
export function formatChange(m: Pick<Metric, "value" | "prefix" | "suffix" | "decimals" | "from">): string {
  if (m.from === undefined) return formatMetric(m);
  const unit = m.suffix.replace(/\+$/, "");
  return `${m.prefix}${m.from}${unit}→${formatMetric(m)}`;
}

/** Experience sorted oldest → newest. */
export function experienceChronological(r: Resume) {
  return [...r.experience].sort((a, b) => a.start.localeCompare(b.start));
}

export function currentRole(r: Resume) {
  return r.experience.filter((e) => e.end === null).sort((a, b) => b.start.localeCompare(a.start))[0] ?? null;
}

export function projectsWithHighlights(r: Resume) {
  const hs = new Map(allHighlights(r).map((h) => [h.id, h]));
  return r.projects.map((p) => {
    const highlights = [...p.highlightIds.map((id) => hs.get(id)!).filter(Boolean), ...p.highlights.map((h) => hs.get(h.id)!)];
    const skills = [...new Set(highlights.flatMap((h) => h.skills))];
    const metrics = highlights.flatMap((h) => h.metrics);
    return { ...p, highlights, skills, metrics };
  });
}
export type ProjectView = ReturnType<typeof projectsWithHighlights>[number];

export function projectSource(r: Resume, p: ProjectView): { label: string; dates: string } {
  if (p.source?.kind === "experience") {
    const e = r.experience.find((x) => x.id === p.source!.id);
    if (e) return { label: `${e.role} · ${e.orgShort}`, dates: dateRange(e.start, e.end, e.yearOnly) };
  }
  if (p.source?.kind === "competition") {
    const c = r.competitions.find((x) => x.id === p.source!.id);
    if (c) return { label: `${c.result} · ${c.short ?? c.name}`, dates: dateRange(c.start, c.end, c.yearOnly) };
  }
  // a standalone project: describe it by the tools its bullets name
  const names = new Map(r.skills.map((s) => [s.id, s.name]));
  const tools = p.skills.slice(0, 3).map((id) => names.get(id)).filter(Boolean);
  return { label: tools.length ? `Project · ${tools.join(", ")}` : "Project", dates: p.start ? monthLabel(p.start) : "" };
}

/* ---------- Skill graph: only edges with textual evidence ---------- */

export type SkillUsage = {
  skill: Skill;
  highlightIds: string[];
  ownerIds: string[];
  projectIds: string[];
  /** earliest YYYY-MM it is evidenced, or null when only listed / undated */
  firstUsed: string | null;
};

export function skillUsage(r: Resume): SkillUsage[] {
  const hs = allHighlights(r);
  const projects = projectsWithHighlights(r);
  return r.skills.map((skill) => {
    const evidence = hs.filter((h) => h.skills.includes(skill.id));
    const highlightIds = evidence.map((h) => h.id);
    const ownerIds = [...new Set(evidence.map((h) => h.ownerId))];
    const projectIds = projects.filter((p) => p.highlights.some((h) => highlightIds.includes(h.id))).map((p) => p.id);
    const firstUsed = evidence.map((h) => h.date).filter((d): d is string => !!d).sort()[0] ?? null;
    return { skill, highlightIds, ownerIds, projectIds, firstUsed };
  });
}

/** Skills that co-occur in the same bullet are connected. */
export function skillEdges(r: Resume): Array<[string, string]> {
  const set = new Set<string>();
  for (const h of allHighlights(r)) {
    const s = [...h.skills].sort();
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) set.add(`${s[i]}|${s[j]}`);
  }
  return [...set].map((k) => k.split("|") as [string, string]);
}

/** Bullets that cite at least one skill in the domain — used by the radar/bars. */
export function domainEvidence(r: Resume): Array<{ domain: SkillDomain; label: string; bullets: number; skills: number }> {
  const hs = allHighlights(r);
  const byId = new Map(r.skills.map((s) => [s.id, s]));
  return domainsInUse(r).map((d) => ({
    domain: d.id,
    label: d.label,
    bullets: hs.filter((h) => h.skills.some((s) => byId.get(s)?.domain === d.id)).length,
    skills: r.skills.filter((s) => s.domain === d.id).length,
  }));
}

/** Roles + competitions + standalone projects that can own skills, oldest first. */
export function owners(r: Resume) {
  return [
    ...r.experience.map((e) => ({ id: e.id, label: e.orgShort, sub: e.role, date: e.start })),
    ...r.competitions.map((c) => ({ id: c.id, label: c.short ?? c.name, sub: c.result, date: c.start })),
    ...r.projects.filter((p) => p.highlights.length).map((p) => ({ id: p.id, label: p.title, sub: "Project", date: p.start ?? "9999-12" })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}

/* ---------- Citations: every addressable section id and its label ---------- */

export type CiteTarget = { id: string; label: string; section: string };

export function citeTargets(r: Resume): CiteTarget[] {
  return [
    { id: "profile", label: "Profile", section: "launch" },
    { id: "contact", label: "Contact", section: "comms" },
    { id: "skills", label: "Skills", section: "payload" },
    ...r.experience.map((e) => ({ id: e.id, label: `${e.orgShort} — ${e.role}`, section: "trajectory" })),
    ...r.projects.map((p) => ({ id: p.id, label: p.title, section: "missions" })),
    ...r.education.map((e) => ({ id: e.id, label: `${e.short ?? e.institution} — ${e.degree}`, section: "training" })),
    ...r.competitions.map((c) => ({ id: c.id, label: `${c.result} — ${c.short ?? c.name}`, section: "honors" })),
    ...r.awards.map((a) => ({ id: a.id, label: a.title, section: "honors" })),
  ];
}

export function firstName(r: Resume): string {
  return r.profile.name.trim().split(/\s+/)[0] ?? r.profile.name;
}

export function monthLabel(ym: string | null): string {
  if (!ym) return "Present";
  const [y, m] = ym.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(m) - 1]} ${y}`;
}

export function dateRange(start: string, end: string | null, yearOnly = false): string {
  if (yearOnly) {
    const a = start.slice(0, 4);
    const b = end ? end.slice(0, 4) : "Present";
    return a === b ? a : `${a} – ${b}`;
  }
  const a = monthLabel(start);
  const b = monthLabel(end);
  return a === b ? a : `${a} – ${b}`;
}
