"use client";

import { motion } from "motion/react";
import { Reveal } from "@/components/primitives/Reveal";
import { Marquee } from "@/components/primitives/Marquee";
import { ChapterHeader } from "@/site/ChapterHeader";
import { useSite } from "@/site/SiteContext";
import { dateRange } from "@/lib/resume";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/prefs";
import { spring, stagger, reducedTransition } from "@/design/motion";
import type { Award } from "@/data/schema";

const MEDAL: Record<Award["medal"], { ring: string; label: string }> = {
  other: { ring: "var(--c-ink-muted)", label: "Honour" },
  gold: { ring: "var(--c-signal)", label: "Gold" },
  silver: { ring: "var(--c-ink-muted)", label: "Silver" },
  bronze: { ring: "var(--c-ink-muted)", label: "Bronze" },
  rank: { ring: "var(--c-teal)", label: "Rank" },
  team: { ring: "var(--c-signal)", label: "Team gold" },
};

/** Short medal text from the result wording (e.g. "Gold Medal" → Gold, "5th position" → 5th, "Round 2" → R2). */
function medalText(result: string, kind?: Award["medal"]): string {
  const r = result.toLowerCase();
  if (r.includes("gold") || kind === "gold" || kind === "team") return "Gold";
  if (r.includes("silver") || kind === "silver") return "Silver";
  if (r.includes("bronze") || kind === "bronze") return "Bronze";
  const place = result.match(/\b(\d+)(st|nd|rd|th)\b/i);
  if (place) return `${place[1]}${place[2]!.toLowerCase()}`;
  const round = result.match(/round\s*(\d+)/i);
  if (round) return `R${round[1]}`;
  return "★";
}
function medalKind(result: string): Award["medal"] {
  const r = result.toLowerCase();
  return r.includes("gold") || r.includes("winner") || r.includes("first") ? "gold" : r.includes("silver") ? "silver" : r.includes("bronze") ? "bronze" : "rank";
}

function Medal({ kind, text }: { kind: keyof typeof MEDAL; text: string }) {
  const m = MEDAL[kind];
  return (
    <span aria-hidden className="relative inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: m.ring }}>
      <span className="absolute inset-1.5 rounded-full border border-dashed" style={{ borderColor: m.ring }} />
      <span className="mono text-center text-[length:var(--fs--2)] font-medium uppercase leading-tight">{text}</span>
    </span>
  );
}

function Stamp({ children, index }: { children: React.ReactNode; index: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.li
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.25, rotate: -6 }}
      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={reduced ? reducedTransition : { ...spring.snappy, delay: index * stagger.card }}
      className="flex gap-4 rounded-lg border border-rule bg-paper p-5"
    >
      {children}
    </motion.li>
  );
}

export function Training() {
  const site = useSite();
  const resume = site.resume;
  const honors = resume.competitions.length + resume.awards.length > 0;
  return (
    <section id="training" aria-labelledby="training-title" className="relative py-section">
      <div className="px-gutter">
        <ChapterHeader id="training" />
        <div className="grid gap-6 lg:grid-cols-12">
          {resume.education.length ? (
          <div className={cn("space-y-4", honors ? "lg:col-span-5" : "lg:col-span-12")}>
          {resume.education.map((edu) => (
          <Reveal key={edu.id}>
            <article id={edu.id} data-cite-id={edu.id} className="relative h-full overflow-hidden rounded-lg border border-ink bg-ink p-6 text-paper sm:p-8">
              <p className="mono text-[length:var(--fs--1)] opacity-70">{dateRange(edu.start, edu.end, edu.yearOnly)}</p>
              <h3 className="display mt-4 text-[length:var(--fs-3)] font-semibold leading-[var(--lh-snug)]">{edu.institution}</h3>
              <p className="mt-2 text-[length:var(--fs-1)]">{edu.degree}</p>
              {edu.coursework.length ? (
                <>
                  <p className="mono mt-8 text-[length:var(--fs--2)] uppercase tracking-[var(--tr-caps)] opacity-70">Relevant coursework</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {edu.coursework.map((c) => (
                      <li key={c} className="rounded-pill border border-paper/40 px-3 py-1 text-[length:var(--fs--1)]">
                        {c}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 opacity-15">
                <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" />
                <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeDasharray="4 6" />
                <path d="M10 100h180M100 10v180" stroke="currentColor" />
              </svg>
            </article>
          </Reveal>
          ))}
          </div>
          ) : null}
          {honors ? (
          <div className={resume.education.length ? "lg:col-span-7" : "lg:col-span-12"}>
            <ul className="grid gap-4" role="list">
              {resume.competitions.map((c, i) => (
                <Stamp key={c.id} index={i}>
                  <Medal kind={medalKind(c.result)} text={medalText(c.result)} />
                  <div id={c.id} data-cite-id={c.id}>
                    <p className="mono text-[length:var(--fs--2)] text-ink-muted">{dateRange(c.start, c.end, c.yearOnly)}</p>
                    <h3 className="mt-1 text-[length:var(--fs-1)] font-semibold">
                      {c.result} — {c.name}
                    </h3>
                    <ul className="mt-2 space-y-1">
                      {c.highlights.map((h) => (
                        <li key={h.id} className="text-[length:var(--fs--1)] text-ink-muted">
                          {h.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Stamp>
              ))}
              {resume.awards.map((a, i) => (
                <Stamp key={a.id} index={i + resume.competitions.length}>
                  <Medal kind={a.medal} text={medalText(a.title, a.medal)} />
                  <div id={a.id} data-cite-id={a.id}>
                    {a.year ? <p className="mono text-[length:var(--fs--2)] text-ink-muted">{a.year}</p> : null}
                    <h3 className="mt-1 text-[length:var(--fs-1)] font-semibold">{a.title}</h3>
                    {a.text.trim() !== a.title.trim() ? <p className="mt-1 text-[length:var(--fs--1)] text-ink-muted">{a.text}</p> : null}
                  </div>
                </Stamp>
              ))}
            </ul>
          </div>
          ) : null}
        </div>
      </div>
      {resume.skills.some((s) => s.listed) ? (
      <Marquee className="mt-[var(--sp-9)] border-y border-rule py-5" speed={45} label="Skills ribbon">
        {resume.skills
          .filter((s) => s.listed)
          .map((s) => (
            <span key={s.id} className="display flex items-center gap-[var(--sp-6)] text-[length:var(--fs-3)] font-semibold whitespace-nowrap">
              {s.name}
              <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-signal" />
            </span>
          ))}
      </Marquee>
      ) : null}
    </section>
  );
}
