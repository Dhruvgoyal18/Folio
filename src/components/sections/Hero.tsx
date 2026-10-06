"use client";

import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollScene } from "@/components/primitives/ScrollScene";
import { SplitText } from "@/components/primitives/SplitText";
import { Magnetic } from "@/components/primitives/Magnetic";
import { Skeleton } from "@/components/primitives/Skeleton";
import { StaticConstellation } from "@/components/three/StaticConstellation";
import { Contours } from "@/components/visuals/Contours";
import { Flowfield } from "@/components/visuals/Flowfield";
import { Aurora } from "@/components/visuals/Aurora";
import { Monogram } from "@/components/visuals/Monogram";
import { CONCEPT_DEFS } from "@/genome/concepts";
import { Button } from "@/components/ui/Button";
import { ArrowDown, Download, Reticle } from "@/components/ui/icons";
import { capability, useReducedMotion } from "@/lib/prefs";
import { emit } from "@/lib/events";
import { useSite } from "@/site/SiteContext";
import type { Resume } from "@/data/schema";
import { credentials, formatMetric, sentenceCase } from "@/lib/resume";
import { cn } from "@/lib/cn";

const Constellation = dynamic(() => import("@/components/three/Constellation"), {
  ssr: false,
  loading: () => <Skeleton className="absolute inset-0 opacity-0" label="Loading constellation" />,
});

/**
 * Progressive upgrade: the SVG constellation is the first paint everywhere.
 * WebGL (three.js, ~240 KB gz) loads only on desktop-class devices with a fine pointer,
 * and only after the visitor shows intent (moves the mouse, scrolls, presses a key) or
 * after a quiet 5 s — so it never competes with LCP or first input.
 */
function useWebGLAllowed() {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (reduced) return setReady(false);
    const c = capability();
    if (!c.webgl || c.lowPower || !c.finePointer) return setReady(false);
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      cleanup();
      setReady(true);
    };
    const events = ["pointermove", "wheel", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
    const t = window.setTimeout(go, 5000);
    const cleanup = () => {
      events.forEach((e) => window.removeEventListener(e, go));
      clearTimeout(t);
    };
    return cleanup;
  }, [reduced]);
  return ready;
}

function useWide() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = matchMedia("(min-width: 768px)");
    const f = () => setWide(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return wide;
}

function FallbackConstellation({ resume, progress }: { resume: Resume; progress: MotionValue<number> }) {
  const wide = useWide();
  return (
    <StaticConstellation
      resume={resume}
      progress={progress}
      className="absolute inset-0 h-full w-full"
      // phones: a portrait canvas, stars in the lower third under the CTAs, a shorter career line
      viewBox={wide ? "-5 -3 10 6" : "-2.6 -5.6 5.2 11.2"}
      shift={wide ? { x: 2.3, y: 0 } : { x: 0, y: 4.1 }}
      scale={wide ? 1 : 0.68}
      halfWidth={wide ? 4.6 : 2.4}
    />
  );
}

function ConstellationVisual({ progress }: { progress: MotionValue<number> }) {
  const site = useSite();
  const allowed = useWebGLAllowed();
  const [degraded, setDegraded] = useState(false);
  const webgl = allowed && !degraded;
  const [glReady, setGlReady] = useState(false);
  const degrade = useCallback(() => {
    setGlReady(false);
    setDegraded(true);
  }, []);
  return (
    <>
      <div className="absolute inset-0 transition-opacity duration-[var(--dur-slower)]" style={{ opacity: glReady ? 0 : 1 }}>
        <FallbackConstellation resume={site.resume} progress={progress} />
      </div>
      {webgl ? (
        <div className="absolute inset-0 transition-opacity duration-[var(--dur-slower)]" style={{ opacity: glReady ? 1 : 0 }}>
          <Constellation resume={site.resume} progress={progress} className="absolute inset-0" onReady={() => setGlReady(true)} onDegrade={degrade} />
        </div>
      ) : null}
    </>
  );
}

/** Any genome hero visual, for layouts that place it as a panel, band or backdrop. */
function HeroVisual({ className, progress, compact = false }: { className?: string; progress?: MotionValue<number>; compact?: boolean }) {
  const site = useSite();
  const g = site.genome;
  switch (g.hero) {
    case "contours":
      return <Contours seed={g.seed} progress={progress} className={className} density={compact ? 1.3 : 1} />;
    case "flowfield":
      return <Flowfield seed={g.seed} className={className} intensity={compact ? 0.7 : 1} />;
    case "aurora":
      return <Aurora seed={g.seed} className={className} />;
    case "monogram":
      return <Monogram name={site.resume.profile.name} seed={g.seed} className={className} />;
    default:
      return <StaticConstellation resume={site.resume} className={className} viewBox={compact ? "-6 -2 12 4" : undefined} scale={compact ? 0.8 : 1} />;
  }
}

/** Profile links other than phone/resume, for layouts that list them in the hero. */
function heroLinks(r: Resume) {
  return r.profile.links.filter((l) => l.kind !== "phone" && l.kind !== "resume").slice(0, 4);
}

/** Hero CTAs shared by every layout. */
function Actions({ className, variant = "pill" }: { className?: string; variant?: "pill" | "link" | "prompt" }) {
  const site = useSite();
  const pdf = site.resume.profile.links.find((l) => l.kind === "resume");
  if (variant === "link")
    return (
      <div className={cn("flex flex-wrap items-center gap-6", className)}>
        <button type="button" onClick={() => emit("dg:capcom", {})} className="group inline-flex items-center gap-2 text-[length:var(--fs-1)] text-signal-ink underline decoration-1 underline-offset-[6px]" data-testid="hero-ask" data-cursor-label="Ask">
          {site.genome.copy.heroCta} <span aria-hidden className="transition-transform duration-[var(--dur-base)] group-hover:translate-x-1">→</span>
        </button>
        {pdf ? (
          <a href={pdf.href} download className="text-[length:var(--fs-0)] underline decoration-rule underline-offset-[6px] hover:decoration-ink" data-cursor-label="PDF">
            Download resume
          </a>
        ) : null}
      </div>
    );
  if (variant === "prompt")
    return (
      <div className={cn("mono flex flex-wrap gap-3", className)}>
        <Button variant="signal" size="md" onClick={() => emit("dg:capcom", {})} data-testid="hero-ask" cursorLabel="Ask">
          <Reticle /> {site.genome.copy.heroCta}
        </Button>
        {pdf ? (
          <Button variant="outline" size="md" href={pdf.href} download cursorLabel="PDF">
            <Download /> ./resume.pdf
          </Button>
        ) : null}
      </div>
    );
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <Magnetic>
        <Button variant="signal" size="lg" onClick={() => emit("dg:capcom", {})} cursorLabel="Ask" data-testid="hero-ask">
          <Reticle /> {site.genome.copy.heroCta}
        </Button>
      </Magnetic>
      {pdf ? (
        <Magnetic>
          <Button variant="outline" size="lg" href={pdf.href} download cursorLabel="PDF">
            <Download /> Resume
          </Button>
        </Magnetic>
      ) : null}
    </div>
  );
}

/** Proof points under the headline: where they are now, school, top results. All taken from the résumé. */
function Proof({ className, tone = "pill" }: { className?: string; tone?: "pill" | "plain" }) {
  const site = useSite();
  const items = [site.current ? `Now · ${site.current.role}, ${site.current.orgShort}` : null, ...credentials(site.resume)].filter(Boolean) as string[];
  if (!items.length) return null;
  return (
    <ul className={cn("mono flex flex-wrap items-center gap-1.5 text-[length:var(--fs--2)] text-ink-muted", className)} aria-label="At a glance" data-testid="hero-proof">
      {items.map((t, i) => (
        <li key={t} className={cn(tone === "pill" ? "rounded-pill border border-rule bg-paper/70 px-2.5 py-1 backdrop-blur-[2px]" : "after:ml-1.5 after:text-signal-ink after:content-['/'] last:after:content-none", i === 0 && tone === "pill" && "border-ink/40 text-ink")}>
          {t}
        </li>
      ))}
    </ul>
  );
}

/** The résumé's summary (or one composed from its bullets), kept short enough for a hero. */
function Summary({ className }: { className?: string }) {
  const { summary } = useSite().resume.profile;
  if (!summary) return null;
  return (
    <p className={cn("max-w-[60ch] text-[length:var(--fs-0)] leading-[var(--lh-normal)] text-ink-muted line-clamp-4 md:line-clamp-5", className)} data-testid="hero-summary">
      {summary}
    </p>
  );
}

function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? [parts[0]!, parts.slice(1).join(" ")] : [parts[0]!, ""];
}

/* ---------------- Mission Control ---------------- */

function MissionInner({ progress, pinned }: { progress: MotionValue<number>; pinned: boolean }) {
  const site = useSite();
  const reduced = useReducedMotion();
  const { profile } = site.resume;
  const [first, rest] = splitName(profile.name);
  const evidenced = site.usage.filter((u) => u.firstUsed).length;
  const contentY = useTransform(progress, [0, 0.5], [0, -140]);
  const contentOpacity = useTransform(progress, [0, 0.4], [1, 0]);
  const captionOpacity = useTransform(progress, [0.62, 0.85], [0, 1]);
  const captionY = useTransform(progress, [0.62, 0.85], [24, 0]);
  const cueOpacity = useTransform(progress, [0, 0.1], [1, 0]);
  return (
    <div className="relative h-[100svh] min-h-[680px] w-full overflow-hidden">
      <div aria-hidden className="drafting-grid absolute inset-0" />
      {site.genome.hero === "constellation" ? (
        <ConstellationVisual progress={progress} />
      ) : site.genome.hero === "monogram" ? (
        <div className="absolute inset-y-0 right-0 flex w-full items-center justify-end opacity-30 md:w-[55%] md:opacity-100">
          <HeroVisual className="h-[78%] w-auto max-w-full" />
        </div>
      ) : site.genome.hero === "aurora" ? (
        <HeroVisual className="absolute inset-0" />
      ) : (
        <div className="absolute inset-y-0 right-0 w-full md:w-[62%]">
          <HeroVisual progress={progress} className="h-full w-full" />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--sp-8)+var(--sp-5))] px-gutter">
        <div className="mono flex flex-wrap items-center gap-x-6 gap-y-1 text-[length:var(--fs--2)] uppercase tracking-[var(--tr-caps)] text-ink-muted">
          <span>
            {site.genome.copy.kicker} · {profile.callsign}
          </span>
          {profile.location ? <span className="hidden sm:inline">{profile.location}</span> : null}
          <span className="flex items-center gap-2 text-teal">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-teal" /> Status: active
          </span>
        </div>
      </div>

      <motion.div
        style={reduced ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative z-[1] flex h-full flex-col justify-center px-gutter pt-[var(--sp-8)] max-md:justify-start max-md:pt-[16svh]"
      >
        <h1 id="hero-name" className="hero-name display text-[length:var(--fs-8)]">
          <SplitText text={first} trigger="mount" delay={0.15} className="block" />
          {rest ? <SplitText text={rest} trigger="mount" delay={0.32} className="block pl-[0.6em] max-md:pl-[0.3em]" unitClassName="text-signal" /> : null}
        </h1>
        <p className="mt-[var(--sp-5)] max-w-[36ch] text-[length:var(--fs-2)] leading-[1.3] animate-[rise-only_var(--dur-slower)_var(--ease-out)_both] [animation-delay:450ms]" data-cite-id="profile">
          {profile.headline}
          {/[.!?]$/.test(profile.headline) ? "" : "."}
        </p>
        <Summary className="mt-[var(--sp-4)] max-md:hidden animate-[fade-in_var(--dur-slower)_var(--ease-out)_both] [animation-delay:650ms]" />
        <Proof className="mt-[var(--sp-4)] max-w-[70ch] animate-[fade-in_var(--dur-slower)_var(--ease-out)_both] [animation-delay:750ms]" />
        <Actions className="mt-[var(--sp-6)] animate-[fade-in_var(--dur-slower)_var(--ease-out)_both] [animation-delay:900ms]" />
      </motion.div>

      {pinned && !reduced ? (
        <motion.div style={{ opacity: captionOpacity, y: captionY }} className="pointer-events-none absolute inset-x-0 top-[18%] z-[1] px-gutter text-center">
          <p className="eyebrow mb-3">Scene 01 → trajectory</p>
          <p className="display mx-auto max-w-[18ch] text-[length:var(--fs-5)] normal-case">
            {site.usage.length} skills. <span className="text-signal">One line.</span>
          </p>
          <p className="mx-auto mt-4 max-w-[52ch] text-ink-muted">
            Accent stars ({evidenced}) landed where a role first put them to work. Ink stars are toolkit listed on the resume.
          </p>
        </motion.div>
      ) : null}

      {!reduced ? (
        <motion.div style={{ opacity: cueOpacity }} className="mono absolute bottom-6 left-gutter flex items-center gap-2 text-[length:var(--fs--2)] uppercase tracking-[var(--tr-caps)] text-ink-muted">
          <ArrowDown size={14} /> {pinned ? "Scroll — collapse the constellation" : "Scroll"}
        </motion.div>
      ) : null}
    </div>
  );
}

function MissionHero() {
  const site = useSite();
  const reduced = useReducedMotion();
  const pinned = site.genome.hero === "constellation";
  const evidenced = site.usage.filter((u) => u.firstUsed).length;
  return (
    <>
      <ScrollScene id="launch" length={pinned ? 1.3 : 0.4} reducedProgress={0} aria-labelledby="hero-name">
        {(p) => <MissionInner progress={p} pinned={pinned} />}
      </ScrollScene>
      {reduced && pinned ? (
        <section aria-label="Skills on the career line" className="px-gutter py-[var(--sp-7)]">
          <p className="eyebrow mb-3">Scene 01 → trajectory</p>
          <p className="display text-[length:var(--fs-4)]">
            {site.usage.length} skills. <span className="text-signal">One line.</span>
          </p>
          <p className="mt-2 max-w-[60ch] text-ink-muted">Accent marks ({evidenced}) sit where a role first put the skill to work; ink marks are toolkit listed on the resume.</p>
          <StaticConstellation resume={site.resume} collapsed className="mt-6 h-40 w-full" />
        </section>
      ) : null}
    </>
  );
}

/* ---------------- Editorial ---------------- */

function EditorialHero() {
  const site = useSite();
  const { profile } = site.resume;
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bandY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const reduced = useReducedMotion();
  const year = new Date().getFullYear();
  return (
    <section ref={ref} id="launch" aria-labelledby="hero-name" className="relative px-gutter pb-[var(--sp-8)] pt-[calc(var(--sp-9)+var(--sp-4))]">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink pb-3 text-[length:var(--fs--1)]">
        <span className="italic">{site.genome.copy.kicker}</span>
        <span className="mono text-ink-muted">
          {profile.callsign} · {year}
        </span>
      </div>
      <div className="mx-auto max-w-[min(100%,1200px)] py-[var(--sp-8)] text-center">
        <p className="eyebrow mb-6">{site.current ? `${site.current.role}, ${site.current.orgShort}` : profile.currentRole}</p>
        <h1 id="hero-name" className="hero-name display text-[length:var(--fs-8)] leading-[0.95]">
          <SplitText text={profile.name} trigger="mount" by="word" delay={0.1} />
        </h1>
        <p className="mx-auto mt-[var(--sp-6)] max-w-[40ch] text-[length:var(--fs-2)] italic leading-[var(--lh-snug)] animate-[rise-only_var(--dur-slower)_var(--ease-out)_both] [animation-delay:350ms]" data-cite-id="profile">
          {profile.headline}
        </p>
        <Summary className="mx-auto mt-[var(--sp-5)]" />
        <Proof className="mt-[var(--sp-5)] justify-center" />
        <Actions variant="link" className="mt-[var(--sp-6)] justify-center" />
      </div>
      <motion.div style={reduced ? undefined : { y: bandY }} className="relative h-[34svh] min-h-[220px] overflow-hidden border-y border-ink">
        <HeroVisual compact className="h-full w-full" />
      </motion.div>
    </section>
  );
}

/* ---------------- Terminal ---------------- */

function TerminalHero() {
  const site = useSite();
  const { profile } = site.resume;
  const reduced = useReducedMotion();
  const lines = [
    { cmd: "whoami", delay: 0 },
    { cmd: "cat headline.txt", delay: 700 },
    { cmd: "ls ./links", delay: 1200 },
  ];
  return (
    <section id="launch" aria-labelledby="hero-name" className="relative min-h-[100svh] overflow-hidden px-gutter pt-[calc(var(--sp-9)+var(--sp-2))]">
      <div aria-hidden className="drafting-grid absolute inset-0" />
      {site.genome.hero === "constellation" ? (
        <div className="absolute inset-0 opacity-70">
          <StaticConstellation resume={site.resume} className="h-full w-full" shift={{ x: 2.6, y: 0.3 }} />
        </div>
      ) : site.genome.hero === "monogram" ? (
        <div className="absolute inset-y-0 right-0 flex w-[55%] items-center opacity-40">
          <HeroVisual className="h-[80%] w-auto" />
        </div>
      ) : (
        <HeroVisual className="absolute inset-0 h-full w-full opacity-75" />
      )}
      <div className="mono relative z-[1] max-w-[min(100%,980px)] text-[length:var(--fs-0)]">
        <p className="text-ink-muted">
          {site.genome.copy.kicker} <span className="text-teal">● online</span>
        </p>
        <div className="mt-[var(--sp-6)] rounded-md border border-rule bg-paper/80 p-[var(--sp-5)] backdrop-blur-sm">
          <p className="text-signal-ink" style={reduced ? undefined : { animation: `fade-in var(--dur-base) both ${lines[0]!.delay}ms` }}>
            $ {lines[0]!.cmd}
          </p>
          <h1 id="hero-name" className="hero-name display mt-2 text-[length:var(--fs-7)] leading-[0.95] caret">
            <SplitText text={profile.name} trigger="mount" by="char" delay={0.2} />
          </h1>
          <p className="mt-[var(--sp-5)] text-signal-ink" style={reduced ? undefined : { animation: `fade-in var(--dur-base) both ${lines[1]!.delay}ms` }}>
            $ {lines[1]!.cmd}
          </p>
          <p className="mt-1 max-w-[52ch] font-[family-name:var(--ff-text)] text-[length:var(--fs-1)] leading-[var(--lh-snug)] animate-[rise-only_var(--dur-slower)_var(--ease-out)_both] [animation-delay:400ms]" data-cite-id="profile">
            {profile.headline}
          </p>
          <Summary className="mt-2 font-[family-name:var(--ff-text)]" />
          <Proof className="mt-3" tone="plain" />
          <p className="mt-[var(--sp-5)] text-signal-ink" style={reduced ? undefined : { animation: `fade-in var(--dur-base) both ${lines[2]!.delay}ms` }}>
            $ {lines[2]!.cmd}
          </p>
          <Actions variant="prompt" className="mt-3" />
        </div>
      </div>
    </section>
  );
}


/* ---------------- Minimal ---------------- */

function MinimalHero() {
  const site = useSite();
  const { profile } = site.resume;
  const links = heroLinks(site.resume);
  return (
    <section id="launch" aria-labelledby="hero-name" className="relative px-gutter pb-[var(--sp-8)] pt-[calc(var(--sp-9)+var(--sp-5))]">
      <div className="grid items-end gap-[var(--sp-8)] lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="eyebrow">{site.genome.copy.kicker}</p>
          <h1 id="hero-name" className="hero-name display mt-[var(--sp-4)] text-[length:var(--fs-7)] leading-[0.98]">
            <SplitText text={profile.name} trigger="mount" by="word" delay={0.1} />
          </h1>
          <p className="mt-[var(--sp-5)] max-w-[34ch] text-[length:var(--fs-2)] leading-[1.3] animate-[rise-only_var(--dur-slower)_var(--ease-out)_both] [animation-delay:300ms]" data-cite-id="profile">
            {profile.headline}
          </p>
          <Summary className="mt-[var(--sp-4)]" />
          <Actions className="mt-[var(--sp-6)]" />
        </div>
        <aside className="lg:col-span-4" aria-label="Profile at a glance">
          <div className="relative mb-[var(--sp-5)] hidden aspect-square w-full max-w-[18rem] overflow-hidden lg:block">
            <HeroVisual compact className="h-full w-full" />
          </div>
          <dl className="divide-y divide-rule border-y border-rule text-[length:var(--fs--1)]">
            {site.current ? (
              <div className="grid grid-cols-[6.5rem_1fr] gap-3 py-2.5">
                <dt className="text-ink-muted">Now</dt>
                <dd>{site.current.role}, {site.current.orgShort}</dd>
              </div>
            ) : null}
            {credentials(site.resume).map((c, i) => (
              <div key={c} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2.5">
                <dt className="text-ink-muted">{i === 0 && site.resume.education.length ? "Education" : "Recognition"}</dt>
                <dd>{c}</dd>
              </div>
            ))}
            {profile.location ? (
              <div className="grid grid-cols-[6.5rem_1fr] gap-3 py-2.5">
                <dt className="text-ink-muted">Based in</dt>
                <dd>{profile.location}</dd>
              </div>
            ) : null}
            {links.length ? (
              <div className="grid grid-cols-[6.5rem_1fr] gap-3 py-2.5">
                <dt className="text-ink-muted">Links</dt>
                <dd className="flex flex-wrap gap-x-3 gap-y-1">
                  {links.map((l) => (
                    <a key={l.href} href={l.href} className="underline decoration-rule underline-offset-4 hover:decoration-ink" {...(l.kind !== "email" ? { target: "_blank", rel: "noreferrer" } : {})}>
                      {l.kind === "email" ? "Email" : l.label}
                    </a>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        </aside>
      </div>
    </section>
  );
}

/* ---------------- Bold (poster) ---------------- */

function PosterHero() {
  const site = useSite();
  const { profile } = site.resume;
  const words = profile.name.trim().split(/\s+/);
  return (
    <section id="launch" aria-labelledby="hero-name" className="relative overflow-hidden px-gutter pb-[var(--sp-8)] pt-[calc(var(--sp-9)+var(--sp-3))]">
      {site.genome.hero !== "monogram" ? <HeroVisual className="absolute inset-0 h-full w-full opacity-40" /> : null}
      <div className="relative">
        <p className="poster-tag mono inline-block border-2 border-ink bg-signal-ink px-3 py-1 text-[length:var(--fs--1)] font-bold uppercase text-on-signal">{site.genome.copy.kicker}</p>
        <h1 id="hero-name" className="hero-name display poster-name mt-[var(--sp-5)] leading-[0.82]">
          {words.map((w, i) => (
            <SplitText key={i} text={w} trigger="mount" delay={0.08 + i * 0.12} className={cn("block", i % 2 === 1 && "text-signal-ink")} />
          ))}
        </h1>
        <div className="mt-[var(--sp-6)] grid gap-[var(--sp-5)] lg:grid-cols-12">
          <div className="poster-card border-2 border-ink bg-paper-raised p-[var(--sp-5)] shadow-lifted lg:col-span-7">
            <p className="display text-[length:var(--fs-2)] leading-[1.1] md:text-[length:var(--fs-3)]" data-cite-id="profile">{profile.headline}</p>
            <Summary className="mt-[var(--sp-3)] text-ink" />
          </div>
          <div className="flex flex-col justify-between gap-[var(--sp-5)] lg:col-span-5">
            <Proof />
            <Actions />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Noir ---------------- */

function NoirHero() {
  const site = useSite();
  const { profile } = site.resume;
  const [first, rest] = splitName(profile.name);
  return (
    <section id="launch" aria-labelledby="hero-name" className="relative flex min-h-[100svh] items-center overflow-hidden px-gutter py-[var(--sp-9)]">
      <div aria-hidden className="absolute inset-0 flex items-center justify-center opacity-25">
        <HeroVisual className={site.genome.hero === "monogram" ? "h-[86%] w-auto" : "h-full w-full"} />
      </div>
      <div aria-hidden className="noir-frame pointer-events-none absolute inset-[var(--sp-5)] border border-rule" />
      <div className="relative mx-auto max-w-[60rem] text-center">
        <p className="eyebrow">{site.genome.copy.kicker}</p>
        <h1 id="hero-name" className="hero-name display mt-[var(--sp-5)] text-[length:var(--fs-8)] leading-[0.92]">
          <SplitText text={first} trigger="mount" delay={0.2} className="block" />
          {rest ? <SplitText text={rest} trigger="mount" delay={0.4} className="block italic text-signal-ink" /> : null}
        </h1>
        <span aria-hidden className="mx-auto mt-[var(--sp-6)] block h-px w-24 bg-signal" />
        <p className="mx-auto mt-[var(--sp-6)] max-w-[38ch] text-[length:var(--fs-2)] italic leading-[var(--lh-snug)] animate-[rise-only_var(--dur-slower)_var(--ease-out)_both] [animation-delay:500ms]" data-cite-id="profile">
          {profile.headline}
        </p>
        <Summary className="mx-auto mt-[var(--sp-4)]" />
        <Proof tone="plain" className="mt-[var(--sp-5)] justify-center" />
        <Actions variant="link" className="mt-[var(--sp-6)] justify-center" />
      </div>
    </section>
  );
}

/* ---------------- Aurora ---------------- */

function AuroraHero() {
  const site = useSite();
  const { profile } = site.resume;
  const stats = site.kpis.slice(0, 3);
  return (
    <section id="launch" aria-labelledby="hero-name" className="relative overflow-hidden px-gutter pb-[var(--sp-8)] pt-[calc(var(--sp-9)+var(--sp-5))]">
      <HeroVisual className="absolute inset-0 h-full w-full" />
      <div className="relative mx-auto max-w-[62rem] text-center">
        {site.current ? (
          <p className="glass mx-auto inline-flex items-center gap-2 rounded-pill border border-rule px-3 py-1 text-[length:var(--fs--1)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal" /> {site.genome.copy.kicker} · {site.current.role} at {site.current.orgShort}
          </p>
        ) : (
          <p className="eyebrow">{site.genome.copy.kicker}</p>
        )}
        <h1 id="hero-name" className="hero-name display mt-[var(--sp-5)] text-[length:var(--fs-8)] leading-[0.95]">
          <SplitText text={profile.name} trigger="mount" by="word" delay={0.1} />
        </h1>
        <p className="aurora-text mx-auto mt-[var(--sp-5)] max-w-[30ch] text-[length:var(--fs-3)] font-semibold leading-[1.15] animate-[rise-only_var(--dur-slower)_var(--ease-out)_both] [animation-delay:300ms]" data-cite-id="profile">
          {profile.headline}
        </p>
        <Summary className="mx-auto mt-[var(--sp-4)]" />
        <Actions className="mt-[var(--sp-6)] justify-center" />
        <Proof className="mt-[var(--sp-5)] justify-center" />
      </div>
      {stats.length >= 2 ? (
        <ul className={cn("relative mx-auto mt-[var(--sp-8)] grid max-w-[62rem] gap-3", stats.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")} aria-label="Highlights">
          {stats.map((k) => (
            <li key={`${k.highlightId}-${k.label}`} className="glass rounded-lg border border-rule p-4 text-left">
              <p className="display text-[length:var(--fs-4)] leading-none">{formatMetric(k)}</p>
              <p className="mt-2 text-[length:var(--fs--1)] font-medium">{sentenceCase(k.label)}</p>
              <p className="mono mt-1 truncate text-[length:var(--fs--2)] text-ink-muted">{k.context}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/* ---------------- Scholar (paper title block) ---------------- */

function PaperHero() {
  const site = useSite();
  const { profile } = site.resume;
  const edu = site.resume.education[0];
  const links = heroLinks(site.resume);
  const keywords = [...site.usage].filter((u) => u.highlightIds.length).sort((a, b) => b.highlightIds.length - a.highlightIds.length).slice(0, 6).map((u) => u.skill.name);
  const affiliation = [site.current ? `${site.current.role}, ${site.current.org}` : profile.currentRole, edu ? `${edu.degree}, ${edu.short ?? edu.institution}` : null].filter(Boolean) as string[];
  return (
    <section id="launch" aria-labelledby="hero-name" className="relative px-gutter pb-[var(--sp-8)] pt-[calc(var(--sp-9)+var(--sp-5))]">
      <div className="mx-auto max-w-[46rem]">
        <div className="flex justify-between border-b border-ink pb-2 text-[length:var(--fs--1)] text-ink-muted">
          <span className="eyebrow">{site.genome.copy.kicker}</span>
          <span className="mono">{profile.callsign}</span>
        </div>
        <h1 id="hero-name" className="hero-name display mt-[var(--sp-7)] text-center text-[length:var(--fs-6)] leading-[1.02]">
          <SplitText text={profile.name} trigger="mount" by="word" delay={0.1} />
        </h1>
        <div className="mt-[var(--sp-4)] space-y-1 text-center text-[length:var(--fs-0)] italic text-ink-muted">
          {affiliation.map((a) => (
            <p key={a}>{a}</p>
          ))}
        </div>
        {links.length ? (
          <p className="mono mt-[var(--sp-3)] flex flex-wrap justify-center gap-x-4 gap-y-1 text-[length:var(--fs--1)]">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-signal-ink underline decoration-1 underline-offset-4" {...(l.kind !== "email" ? { target: "_blank", rel: "noreferrer" } : {})}>
                {l.kind === "email" ? l.label : l.label}
              </a>
            ))}
          </p>
        ) : null}
        <div className="mt-[var(--sp-7)] border-y border-rule py-[var(--sp-5)]">
          <p className="text-center text-[length:var(--fs--1)] font-semibold uppercase tracking-[var(--tr-caps)]">Abstract</p>
          <p className="mt-3 text-justify text-[length:var(--fs-1)] leading-[var(--lh-relaxed)] [hyphens:auto]" data-cite-id="profile">
            {profile.headline}
            {/[.!?]$/.test(profile.headline) ? " " : ". "}
            {profile.summary ?? ""}
          </p>
          {keywords.length ? (
            <p className="mt-3 text-[length:var(--fs--1)]">
              <span className="font-semibold italic">Keywords: </span>
              {keywords.join(" · ")}
            </p>
          ) : null}
        </div>
        <Proof tone="plain" className="mt-[var(--sp-5)] justify-center" />
        <Actions variant="link" className="mt-[var(--sp-6)] justify-center" />
      </div>
    </section>
  );
}

export function Hero() {
  const site = useSite();
  switch (CONCEPT_DEFS[site.genome.concept].heroLayout) {
    case "editorial":
      return <EditorialHero />;
    case "terminal":
      return <TerminalHero />;
    case "minimal":
      return <MinimalHero />;
    case "poster":
      return <PosterHero />;
    case "noir":
      return <NoirHero />;
    case "aurora":
      return <AuroraHero />;
    case "paper":
      return <PaperHero />;
    default:
      return <MissionHero />;
  }
}
