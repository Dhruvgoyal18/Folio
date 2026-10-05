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
import { Button } from "@/components/ui/Button";
import { ArrowDown, Download, Reticle } from "@/components/ui/icons";
import { capability, useReducedMotion } from "@/lib/prefs";
import { emit } from "@/lib/events";
import { useSite } from "@/site/SiteContext";
import type { Resume } from "@/data/schema";
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
      shift={wide ? { x: 2.3, y: 0 } : { x: 0, y: 3.4 }}
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
  const now = site.current;

  return (
    <div className="relative h-[100svh] min-h-[640px] w-full overflow-hidden">
      <div aria-hidden className="drafting-grid absolute inset-0" />
      {site.genome.hero === "constellation" ? (
        <ConstellationVisual progress={progress} />
      ) : site.genome.hero === "contours" ? (
        <div className="absolute inset-y-0 right-0 w-full md:w-[62%]">
          <Contours seed={site.genome.seed} progress={progress} className="h-full w-full" />
        </div>
      ) : (
        <Flowfield seed={site.genome.seed} className="absolute inset-y-0 right-0 h-full w-full md:w-[62%]" />
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
        {now ? (
          <p className="mono mt-[var(--sp-3)] text-[length:var(--fs--1)] text-ink-muted animate-[fade-in_var(--dur-slower)_var(--ease-out)_both] [animation-delay:750ms]">
            Now → {now.role} @ {now.orgShort}
          </p>
        ) : null}
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
        <Actions variant="link" className="mt-[var(--sp-6)] justify-center" />
      </div>
      <motion.div style={reduced ? undefined : { y: bandY }} className="relative h-[34svh] min-h-[220px] overflow-hidden border-y border-ink">
        {site.genome.hero === "flowfield" ? (
          <Flowfield seed={site.genome.seed} className="h-full w-full" intensity={0.7} />
        ) : site.genome.hero === "contours" ? (
          <Contours seed={site.genome.seed} className="h-full w-full" density={1.3} />
        ) : (
          <StaticConstellation resume={site.resume} className="h-full w-full" viewBox="-6 -2 12 4" scale={0.8} />
        )}
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
      ) : site.genome.hero === "contours" ? (
        <Contours seed={site.genome.seed} className="absolute inset-0 h-full w-full opacity-70" />
      ) : (
        <Flowfield seed={site.genome.seed} className="absolute inset-0 h-full w-full opacity-80" />
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
          <p className="mt-[var(--sp-5)] text-signal-ink" style={reduced ? undefined : { animation: `fade-in var(--dur-base) both ${lines[2]!.delay}ms` }}>
            $ {lines[2]!.cmd}
          </p>
          <Actions variant="prompt" className="mt-3" />
        </div>
      </div>
    </section>
  );
}

export function Hero() {
  const site = useSite();
  if (site.genome.concept === "editorial") return <EditorialHero />;
  if (site.genome.concept === "terminal") return <TerminalHero />;
  return <MissionHero />;
}
