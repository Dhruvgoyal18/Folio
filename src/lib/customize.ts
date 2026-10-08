import type { Resume } from "@/data/schema";
import { SECTION_IDS, type SectionId } from "@/genome/schema";
import { formatChange, metricKind, type MetricKind } from "./resume";

/**
 * Owner customisations layered on top of what the parser and normaliser derive:
 *  - which chapters show, and in what order
 *  - which numbers are featured in Impact, in what order, with what label and note
 *  - which case files show, in what order, with what title and summary
 * Everything references derived ids, so it survives re-publishing; a reference that no longer
 * exists (the bullet was edited away) is ignored and the automatic choice takes over.
 */

/** Contact always stays: a portfolio without a way to reach the person defeats its purpose. */
export const HIDEABLE = SECTION_IDS.filter((s) => s !== "comms") as Array<Exclude<SectionId, "comms">>;

/** Validated by CustomSchema (src/lib/custom-schema.ts) — kept zod-free here so published sites don't ship zod. */
export type Custom = {
  hidden: Array<Exclude<SectionId, "comms">>;
  order?: SectionId[];
  kpis?: Array<{ ref: string; label?: string; note?: string }>;
  projects?: Array<{ id: string; title?: string; summary?: string; hidden?: boolean }>;
  /** the owner rewrote headings or button text: content edits and remixes keep their wording */
  keepWording?: boolean;
};
export const EMPTY_CUSTOM: Custom = { hidden: [] };

/** A stable reference to one metric: the bullet's id plus the metric's position in it. */
export const metricRef = (highlightId: string, index: number) => `${highlightId}:${index}`;

export type MetricChoice = { ref: string; display: string; label: string; note?: string; kind: MetricKind; owner: string; text: string; auto: boolean };

/** Every number in the résumé, for the "Numbers" editor. `auto` marks the ones picked automatically. */
export function metricChoices(r: Resume): MetricChoice[] {
  const out: MetricChoice[] = [];
  const add = (owner: string, h: Resume["experience"][number]["groups"][number]["highlights"][number]) =>
    h.metrics.forEach((m, i) => out.push({ ref: metricRef(h.id, i), display: formatChange(m), label: m.label, note: m.note, kind: metricKind(m, h.text), owner, text: h.text, auto: m.kpi }));
  for (const e of r.experience) for (const g of e.groups) for (const h of g.highlights) add(`${e.role} · ${e.orgShort}`, h);
  for (const c of r.competitions) for (const h of c.highlights) add(c.short ?? c.name, h);
  for (const p of r.projects) for (const h of p.highlights) add(p.title, h);
  return out;
}

/** Apply number and case-file choices to a normalised résumé (pure; returns a new object). */
export function applyCustom(r: Resume, c: Custom | undefined): Resume {
  if (!c) return r;
  let out: Resume = r;

  if (c.kpis) {
    const wanted = new Map(c.kpis.map((k, i) => [k.ref, { ...k, rank: i }]));
    const exists = new Set(metricChoices(r).map((m) => m.ref));
    // only take over when at least one reference still resolves; otherwise keep the automatic picks
    if ([...wanted.keys()].some((ref) => exists.has(ref))) {
      const mapH = <H extends { id: string; metrics: Resume["experience"][number]["groups"][number]["highlights"][number]["metrics"] }>(h: H): H => ({
        ...h,
        metrics: h.metrics.map((m, i) => {
          const w = wanted.get(metricRef(h.id, i));
          if (!w) return { ...m, kpi: false, kpiRank: undefined };
          return { ...m, kpi: true, kpiRank: w.rank, ...(w.label ? { label: w.label } : {}), ...(w.note !== undefined ? { note: w.note || undefined } : {}) };
        }),
      });
      out = {
        ...out,
        experience: out.experience.map((e) => ({ ...e, groups: e.groups.map((g) => ({ ...g, highlights: g.highlights.map(mapH) })) })),
        competitions: out.competitions.map((x) => ({ ...x, highlights: x.highlights.map(mapH) })),
        projects: out.projects.map((p) => ({ ...p, highlights: p.highlights.map(mapH) })),
      };
    }
  }

  if (c.projects?.length) {
    const byId = new Map(c.projects.map((p, i) => [p.id, { ...p, i }]));
    const edited = out.projects.map((p) => {
      const o = byId.get(p.id);
      if (!o) return p;
      return {
        ...p,
        ...(o.title ? { title: o.title } : {}),
        // the owner's own words are no longer "composed by the system"
        ...(o.summary ? { summary: o.summary, derived: false } : {}),
      };
    });
    const rank = (id: string) => byId.get(id)?.i ?? Number.MAX_SAFE_INTEGER;
    const kept = edited.filter((p) => !byId.get(p.id)?.hidden);
    // never hide every case file by accident: an empty Missions chapter is hidden via `hidden` instead
    const visible = kept.length ? kept : edited;
    out = { ...out, projects: visible.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p.id) - rank(b.p.id) || a.i - b.i).map((x) => x.p) };
  }
  return out;
}

/** Chapter order after the owner's choices: their order (unknown ids dropped, missing appended), contact last. */
export function customOrder(base: SectionId[], c: Custom | undefined): SectionId[] {
  const hidden = new Set<SectionId>(c?.hidden ?? []);
  const wanted = (c?.order ?? []).filter((s, i, a) => base.includes(s) && a.indexOf(s) === i);
  const order = [...wanted, ...base.filter((s) => !wanted.includes(s))].filter((s) => !hidden.has(s) && s !== "comms");
  return base.includes("comms") ? [...order, "comms"] : order;
}
