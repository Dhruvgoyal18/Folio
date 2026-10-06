"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useState } from "react";
import { TiltCard } from "@/components/primitives/TiltCard";
import { Reveal } from "@/components/primitives/Reveal";
import { CountUp } from "@/components/primitives/CountUp";
import { ChapterHeader } from "@/site/ChapterHeader";
import { useSite } from "@/site/SiteContext";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Close, Reticle, ArrowUpRight } from "@/components/ui/icons";
import { formatMetric, projectSource, type ProjectView } from "@/lib/resume";
import { useReducedMotion } from "@/lib/prefs";
import { emit } from "@/lib/events";
import { play } from "@/lib/sound";
import { spring, stagger, tween } from "@/design/motion";

function Card({ p, onOpen, index }: { p: ProjectView; onOpen: () => void; index: number }) {
  const site = useSite();
  const reduced = useReducedMotion();
  // the strongest number leads: a headline KPI if the case file has one
  const lead = p.metrics.find((m) => m.kpi) ?? p.metrics[0];
  const src = projectSource(site.resume, p);
  const result = p.source?.kind === "competition" ? site.resume.competitions.find((c) => c.id === p.source!.id)?.result : undefined;
  return (
    <TiltCard className="rounded-lg">
      <motion.button
        type="button"
        id={p.id}
        data-cite-id={p.id}
        layoutId={reduced ? undefined : `mission-${p.id}`}
        onClick={onOpen}
        transition={spring.gentle}
        data-cursor-label="Open"
        aria-haspopup="dialog"
        className="group relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-rule bg-paper p-5 text-left shadow-paper transition-colors duration-[var(--dur-base)] hover:border-ink"
      >
        <div className="flex items-center justify-between">
          <span className="mono text-[length:var(--fs--1)] font-medium text-signal-ink">{p.codename}</span>
          <span className="mono text-[length:var(--fs--2)] text-ink-muted">#{String(index + 1).padStart(2, "0")}</span>
        </div>
        <motion.h3 layout="position" className="display mt-5 text-[length:var(--fs-2)] font-semibold leading-[var(--lh-snug)] tracking-[var(--tr-tight)]">
          {p.title}
        </motion.h3>
        <p className="mt-3 text-[length:var(--fs--1)] leading-[var(--lh-normal)] text-ink-muted">{p.summary}</p>
        <div className="mt-auto pt-6">
          {lead ? (
            <p className="flex flex-col gap-1.5">
              <span className="display text-[length:var(--fs-4)] leading-none text-ink">{formatMetric(lead)}</span>
              <span className="mono text-[length:var(--fs--2)] text-ink-muted">{lead.label}</span>
            </p>
          ) : result ? (
            <p className="flex items-baseline gap-2">
              <span className="display text-[length:var(--fs-3)] leading-none text-signal-ink">{result}</span>
            </p>
          ) : null}
          <div className="mt-4 flex items-center justify-between border-t border-rule pt-3">
            <span className="mono text-[length:var(--fs--2)] text-ink-muted">{src.label}</span>
            <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rule transition-transform duration-[var(--dur-base)] group-hover:rotate-45 group-hover:border-ink">
              <ArrowUpRight size={14} />
            </span>
          </div>
        </div>
      </motion.button>
    </TiltCard>
  );
}

function Dossier({ p, onClose }: { p: ProjectView; onClose: () => void }) {
  const site = useSite();
  const SKILL_NAME = site.skillName;
  const reduced = useReducedMotion();
  const src = projectSource(site.resume, p);
  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal forceMount>
        <Dialog.Overlay asChild forceMount>
          <motion.div
            className="fixed inset-0 bg-scrim backdrop-blur-sm"
            style={{ zIndex: "var(--z-modal)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={tween("base")}
          />
        </Dialog.Overlay>
        <div className="pointer-events-none fixed inset-0 flex items-end justify-center p-3 sm:items-center sm:p-8" style={{ zIndex: "var(--z-modal)" }}>
          <Dialog.Content asChild forceMount aria-describedby={`${p.id}-summary`}>
            <motion.div
              layoutId={reduced ? undefined : `mission-${p.id}`}
              transition={spring.gentle}
              initial={reduced ? { opacity: 0 } : undefined}
              animate={reduced ? { opacity: 1 } : undefined}
              exit={reduced ? { opacity: 0 } : undefined}
              className="pointer-events-auto relative max-h-[88svh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-xl border border-ink bg-paper p-6 shadow-overlay sm:p-10"
              data-lenis-prevent
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mono text-[length:var(--fs--1)] font-medium text-signal-ink">{p.codename} · case file</p>
                  <Dialog.Title asChild>
                    <motion.h3 layout="position" className="display mt-3 text-[length:var(--fs-4)] font-semibold leading-[var(--lh-snug)] tracking-[var(--tr-tight)]">
                      {p.title}
                    </motion.h3>
                  </Dialog.Title>
                  <p className="mono mt-2 text-[length:var(--fs--1)] text-ink-muted">
                    {src.label} · {src.dates}
                  </p>
                </div>
                <Dialog.Close asChild>
                  <button type="button" aria-label="Close case file" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rule hover:border-ink hover:bg-ink hover:text-paper">
                    <Close />
                  </button>
                </Dialog.Close>
              </div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={tween("slow", "out", reduced ? 0 : 0.2)}>
                <p id={`${p.id}-summary`} className="mt-6 text-[length:var(--fs-1)] leading-[var(--lh-snug)]">
                  {p.summary}
                </p>
                {p.derived ? <p className="mono mt-2 text-[length:var(--fs--2)] text-ink-muted">Summary written from the resume lines below.</p> : null}

                {p.metrics.length ? (
                  <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {p.metrics.map((m, i) => (
                      <div key={m.label} className="border-l-2 border-signal pl-3">
                        <CountUp value={m.value} from={m.from ?? 0} prefix={m.prefix} suffix={m.suffix} decimals={m.decimals} delay={0.3 + i * stagger.item} className="display text-[length:var(--fs-4)] leading-none" />
                        <p className="mt-1 text-[length:var(--fs--1)] text-ink-muted">{m.label}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <h4 className="eyebrow mt-8">From the logbook</h4>
                <ul className="mt-3 space-y-3">
                  {p.highlights.map((h) => (
                    <li key={h.id} className="relative pl-5 leading-[var(--lh-relaxed)]">
                      <span aria-hidden className="absolute left-0 top-[0.75em] h-px w-3 bg-signal" />
                      {h.text}
                    </li>
                  ))}
                </ul>
                {p.skills.length ? (
                  <div className="mt-6 flex flex-wrap gap-1.5">
                    {p.skills.map((s) => (
                      <Chip key={s}>{SKILL_NAME.get(s)}</Chip>
                    ))}
                  </div>
                ) : null}
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button
                    variant="signal"
                    onClick={() => {
                      onClose();
                      emit("dg:capcom", { question: `Tell me more about the ${p.title} work.` });
                    }}
                  >
                    <Reticle /> Ask {site.genome.copy.assistant} about this
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** "index" variant: a numbered editorial index; hovering/focusing a row previews it, clicking opens the dossier. */
function IndexList({ onOpen }: { onOpen: (id: string) => void }) {
  const site = useSite();
  const [hover, setHover] = useState<string | null>(site.projects[0]?.id ?? null);
  const preview = site.projects.find((p) => p.id === hover) ?? site.projects[0];
  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <ol className="border-t border-ink lg:col-span-7">
        {site.projects.map((p, i) => {
          const src = projectSource(site.resume, p);
          return (
            <li key={p.id} className="border-b border-rule">
              <button
                type="button"
                id={p.id}
                data-cite-id={p.id}
                aria-haspopup="dialog"
                onClick={() => onOpen(p.id)}
                onPointerEnter={() => setHover(p.id)}
                onFocus={() => setHover(p.id)}
                className="group grid w-full grid-cols-[3rem_1fr_auto] items-baseline gap-4 py-[var(--sp-4)] text-left"
                data-cursor-label="Open"
              >
                <span className="mono text-[length:var(--fs--1)] text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="display block text-[length:var(--fs-3)] font-semibold leading-[var(--lh-snug)] tracking-[var(--tr-tight)] transition-colors duration-[var(--dur-fast)] group-hover:text-signal-ink">{p.title}</span>
                  <span className="mt-1 block text-[length:var(--fs--1)] text-ink-muted">{src.label}</span>
                </span>
                <span aria-hidden className="mono text-signal-ink transition-transform duration-[var(--dur-base)] group-hover:translate-x-1">→</span>
              </button>
            </li>
          );
        })}
      </ol>
      {preview ? (
        <aside aria-hidden className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-28 border-l-2 border-signal pl-6">
            <p className="mono text-[length:var(--fs--1)] text-signal-ink">{preview.codename}</p>
            <p className="mt-3 text-[length:var(--fs-1)] leading-[var(--lh-snug)]">{preview.summary}</p>
            {preview.metrics[0] ? (
              <p className="display mt-6 text-[length:var(--fs-5)] leading-none">
                {formatMetric(preview.metrics[0])}
                <span className="mono ml-2 align-middle text-[length:var(--fs--2)] font-normal tracking-normal text-ink-muted">{preview.metrics[0].label}</span>
              </p>
            ) : null}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

export function Missions() {
  const site = useSite();
  const PROJECTS = site.projects;
  const [openId, setOpenId] = useState<string | null>(null);
  const open = PROJECTS.find((p) => p.id === openId) ?? null;

  useEffect(() => {
    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis;
    if (openId) lenis?.stop();
    else lenis?.start();
  }, [openId]);

  const openCase = (id: string) => {
    setOpenId(id);
    play("open");
  };

  return (
    <section id="missions" aria-labelledby="missions-title" className="relative px-gutter py-section">
      <ChapterHeader id="missions" />
      <LayoutGroup>
        {site.genome.sections.missions === "index" ? (
          <IndexList onOpen={openCase} />
        ) : (
          <ul className="grid gap-5 sm:auto-rows-fr sm:grid-cols-2 xl:grid-cols-4" role="list">
            {PROJECTS.map((p, i) => (
              <Reveal as="li" key={p.id} delay={(i % 4) * stagger.item} className="h-full">
                <Card p={p} index={i} onOpen={() => openCase(p.id)} />
              </Reveal>
            ))}
          </ul>
        )}
        <AnimatePresence>{open ? <Dossier key={open.id} p={open} onClose={() => { setOpenId(null); play("close"); }} /> : null}</AnimatePresence>
      </LayoutGroup>
    </section>
  );
}
