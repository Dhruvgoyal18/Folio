"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { CountUp } from "@/components/primitives/CountUp";
import { Reveal } from "@/components/primitives/Reveal";
import { ChapterHeader } from "@/site/ChapterHeader";
import { useSite } from "@/site/SiteContext";
import { formatMetric, type Kpi } from "@/lib/resume";
import { useReducedMotion } from "@/lib/prefs";
import { stagger, tween, instantTransition } from "@/design/motion";

const SIZE = (len: number) => (len <= 3 ? "text-[length:var(--fs-4)]" : len <= 5 ? "text-[length:var(--fs-3)]" : "text-[length:var(--fs-2)]");

/** Arc gauge: share of the dial is meaningful only for percentages; counts get a full ring with a tick. */
function Dial({ k, index }: { k: Kpi; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();
  // Only absolute percentages fill the dial proportionally; lifts (+27%) and counts read as a full ring.
  const isPct = k.suffix.includes("%") && !k.prefix.startsWith("+") && k.value <= 100;
  const R = 52;
  const C = 2 * Math.PI * R;
  const sweep = 0.75; // 270° gauge
  const frac = isPct ? Math.min(1, k.value / 100) : 1;
  const fromFrac = k.from !== undefined ? k.from / 100 : null;
  const delay = index * stagger.item;
  const draw = (f: number) => ({ strokeDasharray: `${C * sweep * f} ${C}` });

  return (
    <div ref={ref} className="group relative flex flex-col gap-4 rounded-lg border border-rule bg-paper p-5 transition-colors duration-[var(--dur-base)] hover:border-ink">
      <div className="flex items-start justify-between gap-3">
        <span className="mono text-[length:var(--fs--2)] uppercase tracking-[var(--tr-caps)] text-ink-muted">CH-{String(index + 1).padStart(2, "0")}</span>
        <span className="mono text-[length:var(--fs--2)] text-ink-muted">{k.ownerShort}</span>
      </div>
      <div className="relative mx-auto aspect-square w-[min(100%,180px)]">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-[225deg]" aria-hidden>
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--c-rule)" strokeWidth="6" strokeLinecap="round" style={draw(1)} />
          {fromFrac !== null ? (
            <circle cx="60" cy="60" r={R} fill="none" stroke="var(--c-ink-faint)" strokeWidth="6" strokeLinecap="round" style={draw(fromFrac)} />
          ) : null}
          <motion.circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="var(--c-signal)"
            strokeWidth="6"
            strokeLinecap="round"
            initial={reduced ? draw(frac) : draw(0)}
            animate={inView ? draw(frac) : undefined}
            transition={reduced ? instantTransition : tween("cinematic", "plot", delay)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <CountUp
            value={k.value}
            from={k.from ?? 0}
            prefix={k.prefix}
            suffix={k.suffix}
            decimals={k.decimals}
            delay={delay}
            className={`display leading-none ${SIZE(formatMetric(k).length)}`}
          />
          {k.from !== undefined ? <span className="mono mt-1 text-[length:var(--fs--2)] text-ink-muted">from {/[$€£₹]/.test(k.prefix) ? k.prefix : ""}{k.from}{k.suffix.replace(/\+$/, "")}</span> : null}
        </div>
      </div>
      <p className="text-[length:var(--fs--1)] font-medium leading-[var(--lh-snug)]">{k.label}</p>
      <p className="text-[length:var(--fs--1)] leading-[var(--lh-normal)] text-ink-muted md:line-clamp-2 md:group-hover:line-clamp-none">{k.sourceText}</p>
    </div>
  );
}

/** "strip" variant: big editorial numbers on a hairline grid, each with its source line. */
function Strip({ list }: { list: Kpi[] }) {
  return (
    <ol className="grid border-t border-ink sm:grid-cols-2 lg:grid-cols-3" role="list">
      {list.map((k, i) => (
        <Reveal as="li" key={`${k.highlightId}-${k.label}`} delay={i * stagger.item} className="border-b border-rule py-[var(--sp-6)] sm:pr-[var(--sp-6)] lg:[&:not(:nth-child(3n))]:border-r lg:[&:not(:nth-child(3n+1))]:pl-[var(--sp-6)]">
          <p className="mono text-[length:var(--fs--2)] uppercase tracking-[var(--tr-caps)] text-ink-muted">{k.ownerShort}</p>
          <CountUp value={k.value} from={k.from ?? 0} prefix={k.prefix} suffix={k.suffix} decimals={k.decimals} delay={i * stagger.item} className="display mt-3 block text-[length:var(--fs-5)] leading-none text-signal-ink" />
          {k.from !== undefined ? <p className="mono mt-1 text-[length:var(--fs--2)] text-ink-muted">up from {k.from}{k.suffix.replace(/\+$/, "")}</p> : null}
          <p className="mt-3 text-[length:var(--fs-0)] font-medium">{k.label}</p>
          <p className="mt-2 text-[length:var(--fs--1)] leading-[var(--lh-normal)] text-ink-muted">{k.sourceText}</p>
        </Reveal>
      ))}
    </ol>
  );
}

export function Telemetry() {
  const site = useSite();
  const list = site.kpis.slice(0, 6);
  return (
    <section id="telemetry" aria-labelledby="telemetry-title" className="relative px-gutter py-section">
      <ChapterHeader id="telemetry" />
      {site.genome.sections.telemetry === "strip" ? (
        <Strip list={list} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {list.map((k, i) => (
            <Reveal as="li" key={`${k.highlightId}-${k.label}`} delay={i * stagger.item}>
              <Dial k={k} index={i} />
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}
