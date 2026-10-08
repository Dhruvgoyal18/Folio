"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Resume } from "@/data/schema";
import type { Genome, SectionId } from "@/genome/schema";
import { chapterOrder } from "@/genome/generate";
import { HIDEABLE, metricChoices, type Custom } from "@/lib/customize";
import { kpis, sentenceCase } from "@/lib/resume";
import { cn } from "@/lib/cn";

/**
 * "Content" tab of the design step: what the site shows and says, on top of the résumé itself.
 * Chapters (show, hide, reorder), the featured numbers, case files and every line of wording.
 * Each change updates the live preview immediately; nothing here edits the résumé text.
 */
type Props = {
  /** the normalised résumé before customisations — the full set of choices */
  resume: Resume;
  custom: Custom;
  onCustom: (c: Custom) => void;
  genome: Genome;
  onCopy: (copy: Genome["copy"]) => void;
};

const move = <T,>(arr: T[], i: number, by: number) => {
  const j = i + by;
  if (j < 0 || j >= arr.length) return arr;
  const out = [...arr];
  [out[i], out[j]] = [out[j]!, out[i]!];
  return out;
};

function Group({ title, hint, children, action, testId, defaultOpen = false }: { title: string; hint: string; children: ReactNode; action?: ReactNode; testId: string; defaultOpen?: boolean }) {
  return (
    <details className="group rounded-md border border-rule" open={defaultOpen} data-testid={testId}>
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-90">
          ›
        </span>
        <span className="flex-1 font-medium">{title}</span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-rule p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="hint">{hint}</p>
          {action}
        </div>
        {children}
      </div>
    </details>
  );
}

function Arrows({ i, n, label, onMove }: { i: number; n: number; label: string; onMove: (by: number) => void }) {
  return (
    <span className="flex shrink-0 gap-0.5">
      <button type="button" className="btn btn-sm btn-ghost px-2" onClick={() => onMove(-1)} disabled={i === 0} aria-label={`Move ${label} up`}>
        ↑
      </button>
      <button type="button" className="btn btn-sm btn-ghost px-2" onClick={() => onMove(1)} disabled={i === n - 1} aria-label={`Move ${label} down`}>
        ↓
      </button>
    </span>
  );
}

const SECTION_NAME: Record<SectionId, string> = { telemetry: "Impact numbers", trajectory: "Experience", payload: "Skills", missions: "Case files", training: "Education & honours", comms: "Contact" };

export function CustomizePanel({ resume, custom, onCustom, genome, onCopy }: Props) {
  const set = (patch: Partial<Custom>) => onCustom({ ...custom, ...patch });

  /* ---------- chapters ---------- */
  const has: Record<SectionId, boolean> = {
    telemetry: metricChoices(resume).length >= 2,
    trajectory: resume.experience.length > 0,
    payload: resume.skills.length > 0,
    missions: resume.projects.length > 0,
    training: resume.education.length + resume.competitions.length + resume.awards.length > 0,
    comms: true,
  };
  const base = chapterOrder(genome).filter((s): s is (typeof HIDEABLE)[number] => s !== "comms");
  const wanted = (custom.order ?? []).filter((s, i, a): s is (typeof HIDEABLE)[number] => s !== "comms" && (base as SectionId[]).includes(s) && a.indexOf(s) === i);
  const chapters = [...wanted, ...base.filter((s) => !wanted.includes(s))];
  const hidden = new Set(custom.hidden);

  /* ---------- numbers ---------- */
  const choices = useMemo(() => metricChoices(resume), [resume]);
  const autoRefs = useMemo(() => {
    // the automatic picks in the order the site shows them
    return kpis(resume)
      .map((k) => choices.find((c) => c.ref.startsWith(`${k.highlightId}:`) && c.label === k.label)?.ref)
      .filter((x): x is string => !!x);
  }, [resume, choices]);
  const featured: NonNullable<Custom["kpis"]> = custom.kpis ?? autoRefs.map((ref) => ({ ref }));
  const featuredRefs = featured.map((f) => f.ref);
  const setFeatured = (list: NonNullable<Custom["kpis"]>) => set({ kpis: list });
  const toggleMetric = (ref: string) =>
    setFeatured(featuredRefs.includes(ref) ? featured.filter((f) => f.ref !== ref) : featured.length >= 6 ? featured : [...featured, { ref }]);
  const patchMetric = (ref: string, p: { label?: string; note?: string }) => setFeatured(featured.map((f) => (f.ref === ref ? { ...f, ...p } : f)));

  /* ---------- case files ---------- */
  const projOverrides = new Map((custom.projects ?? []).map((p) => [p.id, p]));
  const projOrder = (custom.projects ?? []).map((p) => p.id);
  const projects = [...resume.projects].sort((a, b) => {
    const ia = projOrder.indexOf(a.id);
    const ib = projOrder.indexOf(b.id);
    return (ia < 0 ? 1e6 : ia) - (ib < 0 ? 1e6 : ib);
  });
  const writeProjects = (list: typeof projects, patch?: { id: string; p: Partial<NonNullable<Custom["projects"]>[number]> }) =>
    set({
      projects: list.map((p) => {
        const o = { ...(projOverrides.get(p.id) ?? { id: p.id }) };
        return patch && patch.id === p.id ? { ...o, ...patch.p, id: p.id } : { ...o, id: p.id };
      }),
    });
  const visibleCount = projects.filter((p) => !projOverrides.get(p.id)?.hidden).length;

  /* ---------- wording ---------- */
  const copy = genome.copy;
  const setSection = (id: SectionId, p: Partial<Genome["copy"]["sections"][SectionId]>) => onCopy({ ...copy, sections: { ...copy.sections, [id]: { ...copy.sections[id], ...p } } });
  const [wordingFor, setWordingFor] = useState<SectionId>("telemetry");

  return (
    <div className="flex flex-col gap-2" data-testid="customize">
      <Group
        title="Chapters"
        hint="Show, hide and reorder the chapters of your site. Contact always closes the page."
        testId="custom-chapters"
        defaultOpen
        action={
          custom.order || custom.hidden.length ? (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => set({ order: undefined, hidden: [] })}>
              Reset
            </button>
          ) : null
        }
      >
        <ol className="flex flex-col gap-1" role="list">
          {chapters.map((id, i) => (
            <li key={id} className={cn("flex items-center gap-2 rounded-sm px-1", !has[id] && "opacity-60")} data-testid={`chapter-${id}`}>
              <label className="flex min-h-10 flex-1 items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--c-signal-ink)]"
                  checked={!hidden.has(id)}
                  onChange={() => set({ hidden: hidden.has(id) ? custom.hidden.filter((x) => x !== id) : [...custom.hidden, id] })}
                  data-testid={`show-${id}`}
                />
                <span>
                  {SECTION_NAME[id]}
                  {!has[id] ? <span className="ml-1 text-[length:var(--fs--2)] text-ink-muted">(nothing to show yet)</span> : null}
                </span>
              </label>
              <Arrows i={i} n={chapters.length} label={SECTION_NAME[id]} onMove={(by) => set({ order: move(chapters, i, by) })} />
            </li>
          ))}
          <li className="flex min-h-10 items-center gap-2 px-1 text-ink-muted">
            <input type="checkbox" className="h-4 w-4" checked disabled aria-label="Contact is always shown" /> Contact
          </li>
        </ol>
      </Group>

      <Group
        title={`Impact numbers (${featured.length}/6)`}
        hint={custom.kpis ? "Your picks, in this order. Rename a label to say it your way — the number itself always comes from the bullet." : "Picked automatically. Tick, untick or reorder to choose your own."}
        testId="custom-numbers"
        action={
          custom.kpis ? (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => set({ kpis: undefined })} data-testid="numbers-auto">
              Automatic
            </button>
          ) : null
        }
      >
        {choices.length === 0 ? <p className="hint">No numbers in your bullets yet — add results like “cut costs by 20%” to feature them.</p> : null}
        {featured.length ? (
          <ol className="flex flex-col gap-2" role="list" aria-label="Featured numbers">
            {featured.map((f, i) => {
              const c = choices.find((x) => x.ref === f.ref);
              if (!c) return null;
              return (
                <li key={f.ref} className="rounded-md border border-rule p-2" data-testid="featured-metric">
                  <div className="flex items-center gap-2">
                    <span className="display min-w-0 flex-1 truncate text-[length:var(--fs-1)]">{c.display}</span>
                    <Arrows i={i} n={featured.length} label={c.display} onMove={(by) => setFeatured(move(featured, i, by))} />
                    <button type="button" className="btn btn-sm btn-ghost px-2" onClick={() => toggleMetric(f.ref)} disabled={featured.length === 1} title={featured.length === 1 ? "To show no numbers, hide the Impact chapter above" : undefined} aria-label={`Remove ${c.display} from featured numbers`}>
                      ✕
                    </button>
                  </div>
                  <label className="mt-1.5 block">
                    <span className="sr-only">Label for {c.display}</span>
                    <input className="field" value={f.label ?? sentenceCase(c.label)} maxLength={60} onChange={(e) => patchMetric(f.ref, { label: e.target.value })} data-testid="metric-label" />
                  </label>
                  <label className="mt-1.5 block">
                    <span className="sr-only">Note for {c.display}</span>
                    <input className="field" value={f.note ?? c.note ?? ""} maxLength={80} placeholder="Optional note, e.g. how it was measured…" onChange={(e) => patchMetric(f.ref, { note: e.target.value })} data-testid="metric-note" />
                  </label>
                  <p className="hint mt-1 line-clamp-2">“{c.text}”</p>
                </li>
              );
            })}
          </ol>
        ) : null}
        {choices.filter((c) => !featuredRefs.includes(c.ref)).length ? (
          <details className="rounded-md bg-ink/[0.03] p-2">
            <summary className="min-h-10 cursor-pointer content-center text-[length:var(--fs--1)] font-medium">Other numbers in your résumé ({choices.length - featured.length})</summary>
            <ul className="mt-1 flex flex-col gap-1" role="list">
              {choices
                .filter((c) => !featuredRefs.includes(c.ref))
                .map((c) => (
                  <li key={c.ref}>
                    <button type="button" disabled={featured.length >= 6} onClick={() => toggleMetric(c.ref)} className="flex min-h-10 w-full items-center gap-2 rounded-sm px-1 text-left hover:bg-ink/[0.04] disabled:opacity-50" data-testid="add-metric">
                      <span aria-hidden="true">+</span>
                      <span className="display shrink-0">{c.display}</span>
                      <span className="truncate text-[length:var(--fs--1)] text-ink-muted">{c.label} · {c.owner}</span>
                    </button>
                  </li>
                ))}
            </ul>
            {featured.length >= 6 ? <p className="hint mt-1">Six is the most the Impact chapter shows — remove one to add another.</p> : null}
          </details>
        ) : null}
      </Group>

      <Group
        title={`Case files (${visibleCount}/${projects.length})`}
        hint="Rename, rewrite, hide or reorder the projects on your site. The bullets inside come from your résumé."
        testId="custom-projects"
        action={
          custom.projects?.length ? (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => set({ projects: undefined })}>
              Reset
            </button>
          ) : null
        }
      >
        {projects.length === 0 ? <p className="hint">No case files yet. They are built from your roles and projects.</p> : null}
        <ol className="flex flex-col gap-2" role="list">
          {projects.map((p, i) => {
            const o = projOverrides.get(p.id);
            const shown = !o?.hidden;
            return (
              <li key={p.id} className={cn("rounded-md border border-rule p-2", !shown && "opacity-60")} data-testid="custom-project">
                <div className="flex items-center gap-2">
                  <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--c-signal-ink)]"
                      checked={shown}
                      disabled={shown && visibleCount === 1}
                      onChange={() => writeProjects(projects, { id: p.id, p: { hidden: shown } })}
                      aria-label={`Show ${o?.title || p.title}`}
                      data-testid="project-show"
                    />
                    <span className="truncate font-medium">{o?.title || p.title}</span>
                  </label>
                  <Arrows i={i} n={projects.length} label={o?.title || p.title} onMove={(by) => writeProjects(move(projects, i, by))} />
                </div>
                <details className="mt-1">
                  <summary className="min-h-10 cursor-pointer content-center text-[length:var(--fs--1)] text-ink-muted">Edit title and summary</summary>
                  <label className="mt-1 block">
                    <span className="label">Title</span>
                    <input className="field mt-1" value={o?.title ?? p.title} maxLength={90} onChange={(e) => writeProjects(projects, { id: p.id, p: { title: e.target.value } })} data-testid="project-title" />
                  </label>
                  <label className="mt-2 block">
                    <span className="label">Summary</span>
                    <textarea className="field mt-1" rows={3} value={o?.summary ?? p.summary} maxLength={420} onChange={(e) => writeProjects(projects, { id: p.id, p: { summary: e.target.value } })} data-testid="project-summary" />
                  </label>
                </details>
              </li>
            );
          })}
        </ol>
      </Group>

      <Group title="Wording" hint="Rewrite the headings, the assistant's name and the button text. Remix keeps your wording." testId="custom-wording">
        <div className="grid gap-2">
          <label>
            <span className="label">Assistant name</span>
            <input className="field mt-1" value={copy.assistant} maxLength={24} onChange={(e) => onCopy({ ...copy, assistant: e.target.value })} data-testid="copy-assistant" />
          </label>
          <label>
            <span className="label">Hero button</span>
            <input className="field mt-1" value={copy.heroCta} maxLength={60} onChange={(e) => onCopy({ ...copy, heroCta: e.target.value })} data-testid="copy-cta" />
          </label>
          <label>
            <span className="label">Kicker</span>
            <input className="field mt-1" value={copy.kicker} maxLength={120} onChange={(e) => onCopy({ ...copy, kicker: e.target.value })} />
          </label>
          <label>
            <span className="label">Chapter</span>
            <select className="field mt-1" value={wordingFor} onChange={(e) => setWordingFor(e.target.value as SectionId)} data-testid="copy-section">
              {(Object.keys(SECTION_NAME) as SectionId[]).map((id) => (
                <option key={id} value={id}>
                  {SECTION_NAME[id]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Label</span>
            <input className="field mt-1" value={copy.sections[wordingFor].eyebrow} maxLength={80} onChange={(e) => setSection(wordingFor, { eyebrow: e.target.value })} data-testid="copy-eyebrow" />
          </label>
          <label>
            <span className="label">Title</span>
            <input className="field mt-1" value={copy.sections[wordingFor].title} maxLength={140} onChange={(e) => setSection(wordingFor, { title: e.target.value })} data-testid="copy-title" />
          </label>
          <label>
            <span className="label">Intro line</span>
            <textarea className="field mt-1" rows={2} value={copy.sections[wordingFor].lede ?? ""} maxLength={480} onChange={(e) => setSection(wordingFor, { lede: e.target.value || undefined })} data-testid="copy-lede" />
          </label>
        </div>
      </Group>
    </div>
  );
}

