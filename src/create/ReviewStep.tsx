"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Draft } from "@/extract/draft";
import { Card, Lines, SmallButton, Text, TextArea } from "./fields";
import { emptyCompetition, emptyEducation, emptyExperience, emptyProject, type Normalized } from "./model";
import { Close, Plus } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type Props = {
  draft: Draft;
  onChange: (d: Draft) => void;
  unplaced: string[];
  onUnplaced: (u: string[]) => void;
  check: Normalized;
  mode?: "llm" | "rules";
  source?: string;
  onNext: () => void;
};

/** Generic list helpers that keep the editor code flat. */
function upd<T>(arr: T[], i: number, patch: Partial<T>): T[] {
  return arr.map((x, j) => (j === i ? { ...x, ...patch } : x));
}
const del = <T,>(arr: T[], i: number) => arr.filter((_, j) => j !== i);
const move = <T,>(arr: T[], i: number, by: number) => {
  const j = i + by;
  if (j < 0 || j >= arr.length) return arr;
  const out = [...arr];
  [out[i], out[j]] = [out[j]!, out[i]!];
  return out;
};
const count = (xs: string[]) => xs.filter((x) => x.trim()).length;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const span = (a?: string, b?: string) => [a, b].filter(Boolean).join(" – ");

const SECTIONS = [
  { id: "sec-about", label: "About you" },
  { id: "sec-experience", label: "Experience" },
  { id: "sec-education", label: "Education" },
  { id: "sec-skills", label: "Skills" },
  { id: "sec-projects", label: "Projects" },
  { id: "sec-competitions", label: "Competitions" },
  { id: "sec-awards", label: "Honours" },
];

/** A collapsible entry: a one-line summary that opens into its form. */
function Entry({ title, meta, children, defaultOpen, testId, actions }: { title: string; meta: string; children: ReactNode; defaultOpen?: boolean; testId?: string; actions: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <details className="group rounded-md border border-rule bg-paper open:bg-paper" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)} data-testid={testId}>
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-md px-3 py-2.5 hover:bg-ink/[0.03] [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-90">
          ›
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{title}</span>
          <span className="block truncate text-[length:var(--fs--1)] text-ink-muted">{meta}</span>
        </span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-rule px-3 pb-3 pt-4">
        {children}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-rule pt-3">{actions}</div>
      </div>
    </details>
  );
}

export function ReviewStep({ draft: d, onChange, unplaced, onUnplaced, check, mode, source, onNext }: Props) {
  const set = (patch: Partial<Draft>) => onChange({ ...d, ...patch });
  const [active, setActive] = useState(SECTIONS[0]!.id);
  const navLock = useRef(0); // ignore scroll-spy while a clicked link is scrolling into place

  /** Move a line the parser couldn't place into the draft (or drop it). */
  const place = (i: number, where: "award" | "bullet" | "course" | "dismiss") => {
    const text = unplaced[i]!.replace(/^[•●▪‣◦\-*–]\s*/, "").trim();
    if (where === "award") set({ awards: [...d.awards, { text }] });
    if (where === "bullet") {
      const last = d.experience.length - 1;
      const e = d.experience[last]!;
      const groups = e.groups.length ? e.groups : [{ bullets: [] }];
      set({ experience: upd(d.experience, last, { groups: upd(groups, groups.length - 1, { bullets: [...groups[groups.length - 1]!.bullets, text] }) }) });
    }
    if (where === "course") set({ education: upd(d.education, 0, { coursework: [...d.education[0]!.coursework, text] }) });
    onUnplaced(unplaced.filter((_, j) => j !== i));
  };
  const notes = check.ok ? check.notes : [];

  // highlight the section in view
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && Date.now() > navLock.current && setActive(e.target.id)), { rootMargin: "-30% 0px -60% 0px" });
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const status = (suffix = "") => check.ok ? (
    <p className="text-[length:var(--fs--1)] text-ink-muted" data-testid={`ready-ok${suffix}`}>
      {plural(check.resume.experience.length, "role")} · {plural(check.resume.skills.length, "skill")} · {plural(check.resume.projects.length, "case file")}
    </p>
  ) : (
    <p className="text-[length:var(--fs--1)] font-medium text-signal-ink" role={suffix ? undefined : "alert"} data-testid={`ready-error${suffix}`}>
      {check.error}
    </p>
  );

  const extras = (where: "aside" | "main") => (
    <>
          {notes.length ? (
            <div className="border-t border-rule pt-3">
              <h3 className="text-[length:var(--fs--1)] font-semibold">Worth a look</h3>
              <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-[length:var(--fs--1)] text-ink-muted">
                {notes.slice(0, 6).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {unplaced.length ? (
            <div className="border-t border-rule pt-3">
              <h3 className="text-[length:var(--fs--1)] font-semibold">Lines we couldn't place ({unplaced.length})</h3>
              <p className="hint mt-0.5">Not on your site yet — add them where they belong, or dismiss.</p>
              <ul className="mt-2 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1" data-testid={where === "aside" ? "unplaced" : "unplaced-main"}>
                {unplaced.map((n, i) => (
                  <li key={`${i}-${n}`} className="rounded-md border border-rule p-2 text-[length:var(--fs--1)]">
                    <span className="block text-ink-muted">“{n}”</span>
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => place(i, "award")}>
                        + Honours
                      </button>
                      {d.experience.length ? (
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => place(i, "bullet")}>
                          + Last role
                        </button>
                      ) : null}
                      {d.education.length ? (
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => place(i, "course")}>
                          + Coursework
                        </button>
                      ) : null}
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => place(i, "dismiss")} aria-label={`Dismiss “${n.slice(0, 40)}”`}>
                        Dismiss
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
    </>
  );

  return (
    <div className="mx-auto grid max-w-[1240px] gap-8 pb-28 lg:grid-cols-[minmax(0,1fr)_300px] lg:pb-0 xl:grid-cols-[170px_minmax(0,1fr)_300px]">
      {/* section index */}
      <nav aria-label="Résumé sections" className="hidden xl:block">
        <ul className="sticky top-24 flex flex-col gap-0.5" role="list">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} onClick={() => {
                  navLock.current = Date.now() + 1200;
                  setActive(s.id);
                }} className={cn("block rounded-sm px-2.5 py-1.5 text-[length:var(--fs--1)] no-underline", active === s.id ? "bg-ink/[0.06] font-medium text-ink" : "text-ink-muted hover:text-ink")} aria-current={active === s.id ? "true" : undefined}>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-5">
        <header>
          <p className="kicker">Step 2 of 4</p>
          <h1 className="display mt-2 text-[length:var(--fs-4)] leading-tight">Check what we found</h1>
          <p className="mt-2 max-w-[60ch] text-ink-muted">
            {source ? (
              <>
                From <span className="text-ink">{source}</span>
                {mode === "llm" ? ", structured with Claude" : ""}.{" "}
              </>
            ) : null}
            Fix anything that's wrong — your site only says what's on this page.
          </p>
        </header>

        {notes.length || unplaced.length ? <div className="panel flex flex-col gap-3 p-4 lg:hidden">{extras("main")}</div> : null}

        <Card title="About you" id="sec-about">
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Full name" value={d.name} onChange={(name) => set({ name })} testId="f-name" />
            <Text label="Headline" value={d.headline} onChange={(headline) => set({ headline: headline || undefined })} hint="Leave blank to have one written from your roles." testId="f-headline" />
            <Text label="Email" type="email" value={d.email} onChange={(email) => set({ email: email || undefined })} />
            <Text label="Phone" value={d.phone} onChange={(phone) => set({ phone: phone || undefined })} hint="Shown on your site — clear it to keep it private." />
            <Text label="Location" value={d.location} onChange={(location) => set({ location: location || undefined })} />
            <Lines label="Links" value={d.links.map((l) => l.url)} onChange={(v) => set({ links: v.map((url) => ({ url })) })} hint="LinkedIn, GitHub, portfolio — one per line." rows={2} />
          </div>
          <TextArea label="Summary" value={d.summary ?? ""} onChange={(summary) => set({ summary: summary || undefined })} testId="f-summary" />
        </Card>

        <Card
          title="Experience"
          id="sec-experience"
          count={d.experience.length}
          actions={
            <SmallButton onClick={() => set({ experience: [...d.experience, emptyExperience()] })}>
              <Plus size={13} /> Add role
            </SmallButton>
          }
        >
          {d.experience.length === 0 ? <p className="hint">No roles yet.</p> : null}
          <div className="flex flex-col gap-2">
            {d.experience.map((e, i) => (
              <Entry
                key={i}
                testId="exp-entry"
                defaultOpen={!e.org && !e.role}
                title={`${e.role || "New role"}${e.org ? ` · ${e.org}` : ""}`}
                meta={[span(e.start, e.end), e.type, plural(e.groups.reduce((n, g) => n + count(g.bullets), 0), "bullet")].filter(Boolean).join(" · ")}
                actions={
                  <>
                    <SmallButton onClick={() => set({ experience: upd(d.experience, i, { groups: [...e.groups, { title: "", bullets: [] }] }) })}>
                      <Plus size={13} /> Bullet group
                    </SmallButton>
                    <SmallButton onClick={() => set({ experience: move(d.experience, i, -1) })} disabled={i === 0} aria-label={`Move ${e.role || "role"} up`}>
                      ↑
                    </SmallButton>
                    <SmallButton onClick={() => set({ experience: move(d.experience, i, 1) })} disabled={i === d.experience.length - 1} aria-label={`Move ${e.role || "role"} down`}>
                      ↓
                    </SmallButton>
                    <SmallButton tone="danger" className="ml-auto" onClick={() => set({ experience: del(d.experience, i) })}>
                      <Close size={13} /> Remove
                    </SmallButton>
                  </>
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Text label="Role" value={e.role} onChange={(role) => set({ experience: upd(d.experience, i, { role }) })} />
                  <Text label="Company / organisation" value={e.org} onChange={(org) => set({ experience: upd(d.experience, i, { org }) })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Text label="Start" value={e.start} placeholder="Sep 2025" onChange={(start) => set({ experience: upd(d.experience, i, { start }) })} />
                    <Text label="End" value={e.end} placeholder="Present" onChange={(end) => set({ experience: upd(d.experience, i, { end }) })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Text label="Type" value={e.type} placeholder="Full-time" onChange={(type) => set({ experience: upd(d.experience, i, { type }) })} />
                    <Text label="Location" value={e.location} onChange={(location) => set({ experience: upd(d.experience, i, { location }) })} />
                  </div>
                </div>
                {e.groups.map((g, gi) => (
                  <div key={gi} className="flex flex-col gap-3 rounded-md bg-ink/[0.03] p-3">
                    {e.groups.length > 1 || g.title ? (
                      <div className="flex items-end gap-2">
                        <Text className="flex-1" label="Group heading" value={g.title} onChange={(title) => set({ experience: upd(d.experience, i, { groups: upd(e.groups, gi, { title }) }) })} />
                        {e.groups.length > 1 ? (
                          <SmallButton tone="danger" onClick={() => set({ experience: upd(d.experience, i, { groups: del(e.groups, gi) }) })} aria-label="Remove this group">
                            <Close size={13} />
                          </SmallButton>
                        ) : null}
                      </div>
                    ) : null}
                    <Lines label="Bullets" value={g.bullets} onChange={(bullets) => set({ experience: upd(d.experience, i, { groups: upd(e.groups, gi, { bullets }) }) })} />
                  </div>
                ))}
                {e.groups.length === 0 ? <Lines label="Bullets" value={[]} onChange={(bullets) => set({ experience: upd(d.experience, i, { groups: [{ bullets }] }) })} /> : null}
              </Entry>
            ))}
          </div>
        </Card>

        <Card
          title="Education"
          id="sec-education"
          count={d.education.length}
          actions={
            <SmallButton onClick={() => set({ education: [...d.education, emptyEducation()] })}>
              <Plus size={13} /> Add
            </SmallButton>
          }
        >
          <div className="flex flex-col gap-2">
            {d.education.map((e, i) => (
              <Entry
                key={i}
                defaultOpen={!e.institution}
                title={e.institution || "New school"}
                meta={[e.degree, span(e.start, e.end), e.coursework.length ? plural(count(e.coursework), "course") : ""].filter(Boolean).join(" · ")}
                actions={
                  <SmallButton tone="danger" className="ml-auto" onClick={() => set({ education: del(d.education, i) })}>
                    <Close size={13} /> Remove
                  </SmallButton>
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Text label="Institution" value={e.institution} onChange={(institution) => set({ education: upd(d.education, i, { institution }) })} />
                  <Text label="Degree" value={e.degree} onChange={(degree) => set({ education: upd(d.education, i, { degree }) })} />
                  <Text label="Start" value={e.start} onChange={(start) => set({ education: upd(d.education, i, { start }) })} />
                  <Text label="End" value={e.end} onChange={(end) => set({ education: upd(d.education, i, { end }) })} />
                </div>
                <Lines label="Coursework" value={e.coursework} onChange={(coursework) => set({ education: upd(d.education, i, { coursework }) })} rows={2} />
              </Entry>
            ))}
          </div>
        </Card>

        <Card
          title="Skills"
          id="sec-skills"
          actions={
            <SmallButton onClick={() => set({ skills: [...d.skills, { group: "", items: [] }] })}>
              <Plus size={13} /> Group
            </SmallButton>
          }
        >
          {d.skills.map((g, i) => (
            <div key={i} className="grid items-end gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
              <Text label="Group" value={g.group} onChange={(group) => set({ skills: upd(d.skills, i, { group }) })} />
              <Text label="Skills, comma-separated" value={g.items.join(", ")} onChange={(v) => set({ skills: upd(d.skills, i, { items: v.split(",").map((s) => s.trimStart()) }) })} />
              <SmallButton tone="danger" onClick={() => set({ skills: del(d.skills, i) })} aria-label={`Remove skill group ${g.group || i + 1}`}>
                <Close size={13} />
              </SmallButton>
            </div>
          ))}
        </Card>

        <Card
          title="Projects"
          id="sec-projects"
          count={d.projects.length}
          actions={
            <SmallButton onClick={() => set({ projects: [...d.projects, emptyProject()] })}>
              <Plus size={13} /> Add
            </SmallButton>
          }
        >
          {d.projects.length === 0 ? <p className="hint">None listed — Folio builds case files from your roles, so this is optional.</p> : null}
          <div className="flex flex-col gap-2">
            {d.projects.map((p, i) => (
              <Entry
                key={i}
                defaultOpen={!p.title}
                title={p.title || "New project"}
                meta={[p.link, plural(count(p.bullets), "bullet")].filter(Boolean).join(" · ")}
                actions={
                  <SmallButton tone="danger" className="ml-auto" onClick={() => set({ projects: del(d.projects, i) })}>
                    <Close size={13} /> Remove
                  </SmallButton>
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Text label="Title" value={p.title} onChange={(title) => set({ projects: upd(d.projects, i, { title }) })} />
                  <Text label="Link" value={p.link} onChange={(link) => set({ projects: upd(d.projects, i, { link: link || undefined }) })} />
                </div>
                <Lines label="Bullets" value={p.bullets} onChange={(bullets) => set({ projects: upd(d.projects, i, { bullets }) })} />
              </Entry>
            ))}
          </div>
        </Card>

        <Card
          title="Competitions"
          id="sec-competitions"
          count={d.competitions.length}
          actions={
            <SmallButton onClick={() => set({ competitions: [...d.competitions, emptyCompetition()] })}>
              <Plus size={13} /> Add
            </SmallButton>
          }
        >
          {d.competitions.length === 0 ? <p className="hint">None listed.</p> : null}
          <div className="flex flex-col gap-2">
            {d.competitions.map((c, i) => (
              <Entry
                key={i}
                defaultOpen={!c.name}
                title={c.name || "New competition"}
                meta={[c.result, span(c.start, c.end), plural(count(c.bullets), "bullet")].filter(Boolean).join(" · ")}
                actions={
                  <SmallButton tone="danger" className="ml-auto" onClick={() => set({ competitions: del(d.competitions, i) })}>
                    <Close size={13} /> Remove
                  </SmallButton>
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Text label="Name" value={c.name} onChange={(name) => set({ competitions: upd(d.competitions, i, { name }) })} />
                  <Text label="Result" value={c.result} onChange={(result) => set({ competitions: upd(d.competitions, i, { result }) })} />
                  <Text label="Start" value={c.start} onChange={(start) => set({ competitions: upd(d.competitions, i, { start }) })} />
                  <Text label="End" value={c.end} onChange={(end) => set({ competitions: upd(d.competitions, i, { end }) })} />
                </div>
                <Lines label="Bullets" value={c.bullets} onChange={(bullets) => set({ competitions: upd(d.competitions, i, { bullets }) })} />
              </Entry>
            ))}
          </div>
        </Card>

        <Card title="Honours & awards" id="sec-awards" count={d.awards.length}>
          <Lines label="Awards" value={d.awards.map((a) => a.text)} onChange={(v) => set({ awards: v.map((text) => ({ text })) })} rows={3} />
        </Card>
      </div>

      {/* status + next (sticky aside on large screens) */}
      <aside className="hidden lg:block">
        <div className="panel sticky top-24 flex flex-col gap-3 p-4">
          <h2 className="font-semibold">Ready check</h2>
          {status()}
          <button type="button" disabled={!check.ok} onClick={onNext} className="btn btn-primary btn-lg w-full" data-testid="to-design">
            Design my site →
          </button>
          {extras("aside")}
        </div>
      </aside>

      {/* phones/tablets: a bottom bar with the same status and action */}
      <div className="fixed inset-x-0 bottom-0 border-t border-rule bg-vellum px-[var(--sp-gutter)] py-3 backdrop-blur lg:hidden" style={{ zIndex: "var(--z-nav)" }}>
        <div className="mx-auto flex max-w-[1240px] items-center gap-3">
          <div className="min-w-0 flex-1">{status("-mobile")}</div>
          <button type="button" disabled={!check.ok} onClick={onNext} className="btn btn-primary" data-testid="to-design-mobile">
            Design →
          </button>
        </div>
      </div>
    </div>
  );
}
