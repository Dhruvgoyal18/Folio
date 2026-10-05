"use client";

import { AnimatePresence, motion, useScroll, useSpring, useInView } from "motion/react";
import { useRef, useState } from "react";
import { Reveal } from "@/components/primitives/Reveal";
import { ChapterHeader } from "@/site/ChapterHeader";
import { useSite } from "@/site/SiteContext";
import { Chip } from "@/components/ui/Chip";
import { Plus } from "@/components/ui/icons";
import { experienceChronological, dateRange, formatMetric, formatChange } from "@/lib/resume";
import type { Experience } from "@/data/schema";
import { useReducedMotion } from "@/lib/prefs";
import { spring, tween } from "@/design/motion";
import { play } from "@/lib/sound";
import { cn } from "@/lib/cn";


function Waypoint({ active }: { active: boolean }) {
  return (
    <span aria-hidden className="absolute left-0 top-7 -translate-x-1/2 md:left-1/2">
      <span className={cn("block h-4 w-4 rounded-full border-2 transition-colors duration-[var(--dur-slow)]", active ? "border-signal bg-signal" : "border-ink bg-paper")} />
      {active ? <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-signal/40" /> : null}
    </span>
  );
}

function RoleCard({ e, index }: { e: Experience; index: number }) {
  const { skillName } = useSite();
  const ref = useRef<HTMLLIElement>(null);
  const reached = useInView(ref, { amount: 0.4, once: true });
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(e.end === null);
  const right = index % 2 === 1;
  const highlights = e.groups.flatMap((g) => g.highlights);
  const metrics = highlights.flatMap((h) => h.metrics);
  const skills = [...new Set(highlights.flatMap((h) => h.skills))];
  const panelId = `${e.id}-log`;

  return (
    <li ref={ref} className="relative pl-8 md:grid md:grid-cols-2 md:gap-16 md:pl-0">
      <Waypoint active={reached} />
      <div className={cn("md:col-span-1", right ? "md:col-start-2" : "md:col-start-1 md:text-right")}>
        <p className={cn("mono mb-2 text-[length:var(--fs--1)] text-signal-ink", right ? "" : "md:pr-1")}>
          {dateRange(e.start, e.end, e.yearOnly)}
          {e.end === null ? <span className="ml-2 rounded-pill bg-teal px-2 py-0.5 text-[length:var(--fs--2)] text-paper">Ongoing</span> : null}
        </p>
      </div>
      <motion.article
        id={e.id}
        data-cite-id={e.id}
        layout={!reduced}
        transition={spring.gentle}
        className={cn(
          "relative mt-2 overflow-hidden rounded-lg border bg-paper p-5 shadow-paper md:row-start-1 md:mt-0",
          right ? "md:col-start-1" : "md:col-start-2",
          open ? "border-ink" : "border-rule",
        )}
      >
        <motion.div layout={!reduced ? "position" : false}>
          <h3 className="m-0 font-[inherit] text-[length:inherit] tracking-normal leading-[inherit]">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => {
              setOpen((o) => !o);
              play(open ? "close" : "open");
            }}
            className="flex w-full items-start justify-between gap-4 text-left"
            data-cursor-label={open ? "Close" : "Open"}
          >
            <span>
              <span className="eyebrow block">{e.type} · {e.orgShort}</span>
              <span className="display mt-1 block text-[length:var(--fs-2)] font-semibold leading-tight tracking-[var(--tr-tight)]">{e.role}</span>
              <span className="mt-1 block text-[length:var(--fs--1)] text-ink-muted">{e.org}</span>
            </span>
            <motion.span
              aria-hidden
              animate={{ rotate: open ? 45 : 0 }}
              transition={spring.snappy}
              className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rule"
            >
              <Plus />
            </motion.span>
          </button>
          </h3>
          {metrics.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {metrics.map((m) => (
                <Chip key={m.label} tone="signal">
                  {formatChange(m)} {m.label}
                </Chip>
              ))}
            </div>
          ) : null}
        </motion.div>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              id={panelId}
              key="log"
              initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={tween("slow", "out")}
            >
              <div className="pt-5">
                {e.groups.map((g, gi) => (
                  <div key={gi} className="mt-3 first:mt-0">
                    {g.title ? <h4 className="mono mb-2 text-[length:var(--fs--1)] uppercase tracking-[var(--tr-mono)] text-ink-muted">{g.title}</h4> : null}
                    <ul className="space-y-2">
                      {g.highlights.map((h, hi) => (
                        <motion.li
                          key={h.id}
                          className="relative pl-5 text-[length:var(--fs--1)] leading-[var(--lh-relaxed)]"
                          initial={reduced ? false : { opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={tween("base", "out", 0.05 + hi * 0.04)}
                        >
                          <span aria-hidden className="absolute left-0 top-[0.7em] h-px w-3 bg-signal" />
                          {h.text}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                ))}
                {skills.length ? (
                  <div className="mt-5 flex flex-wrap gap-1.5 border-t border-rule pt-4">
                    <span className="sr-only">Skills used:</span>
                    {skills.map((s) => (
                      <Chip key={s}>{skillName.get(s)}</Chip>
                    ))}
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.article>
    </li>
  );
}

/** "ledger" variant: a print-style chronology, newest first, each row expands in place. */
function LedgerRow({ e }: { e: Experience }) {
  const { skillName } = useSite();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(e.end === null);
  const highlights = e.groups.flatMap((g) => g.highlights);
  const skills = [...new Set(highlights.flatMap((h) => h.skills))];
  return (
    <li id={e.id} data-cite-id={e.id} className="border-b border-rule">
      <h3 className="m-0 font-[inherit] text-[length:inherit] leading-[inherit] tracking-normal">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${e.id}-log`}
          onClick={() => {
            setOpen((o) => !o);
            play(open ? "close" : "open");
          }}
          className="grid w-full grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-[var(--sp-5)] text-left md:grid-cols-[11rem_1fr_auto]"
          data-cursor-label={open ? "Close" : "Read"}
        >
          <span className="mono text-[length:var(--fs--1)] text-ink-muted max-md:col-span-2">{dateRange(e.start, e.end, e.yearOnly)}</span>
          <span>
            <span className="display block text-[length:var(--fs-3)] font-semibold leading-tight tracking-[var(--tr-tight)]">{e.role}</span>
            <span className="mt-1 block text-ink-muted">
              {e.org} · {e.type}
            </span>
          </span>
          <span aria-hidden className="mono text-[length:var(--fs-1)] text-signal-ink">{open ? "−" : "+"}</span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={`${e.id}-log`}
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={tween("slow", "out")}
            className="overflow-hidden"
          >
            <div className="grid gap-6 pb-[var(--sp-6)] md:grid-cols-[11rem_1fr]">
              <div className="flex flex-wrap content-start gap-1.5 max-md:order-2">
                {skills.map((sk) => (
                  <Chip key={sk}>{skillName.get(sk)}</Chip>
                ))}
              </div>
              <div className="space-y-4 md:columns-2 md:gap-10">
                {e.groups.map((g, gi) => (
                  <div key={gi} className="break-inside-avoid">
                    {g.title ? <h4 className="mb-2 text-[length:var(--fs--1)] font-semibold">{g.title}</h4> : null}
                    <ul className="space-y-2">
                      {g.highlights.map((h) => (
                        <li key={h.id} className="text-[length:var(--fs--1)] leading-[var(--lh-relaxed)]">
                          {h.text}
                          {h.metrics.length ? <span className="mono ml-2 text-signal-ink">[{h.metrics.map((m) => formatChange(m)).join(", ")}]</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

export function Trajectory() {
  const site = useSite();
  const ROLES = experienceChronological(site.resume);
  const listRef = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 75%", "end 55%"] });
  const draw = useSpring(scrollYProgress, spring.gentle);

  if (site.genome.sections.trajectory === "ledger") {
    return (
      <section id="trajectory" aria-labelledby="trajectory-title" className="relative px-gutter py-section">
        <ChapterHeader id="trajectory" />
        <ol className="border-t border-ink">
          {[...ROLES].reverse().map((e) => (
            <LedgerRow key={e.id} e={e} />
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section id="trajectory" aria-labelledby="trajectory-title" className="relative px-gutter py-section">
      <ChapterHeader id="trajectory" />
      <div className="relative">
        {/* scroll-drawn rail */}
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 top-0 w-[2px] -translate-x-1/2 bg-rule md:left-1/2">
          <motion.div className="absolute inset-0 origin-top bg-signal" style={{ scaleY: reduced ? 1 : draw }} />
        </div>
        <ol ref={listRef} className="relative space-y-16 md:space-y-24">
          {ROLES.map((e, i) => (
            <RoleCard key={e.id} e={e} index={i} />
          ))}
        </ol>
        <Reveal className="relative mt-16 pl-8 md:pl-0 md:text-center">
          <p className="mono text-[length:var(--fs--1)] text-ink-muted">▲ Next waypoint: unwritten.</p>
        </Reveal>
      </div>
    </section>
  );
}
