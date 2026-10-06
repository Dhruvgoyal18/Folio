"use client";

import { motion, useInView } from "motion/react";
import { useRef, type ReactNode } from "react";
import { CountUp } from "@/components/primitives/CountUp";
import { Reveal } from "@/components/primitives/Reveal";
import { ChapterHeader } from "@/site/ChapterHeader";
import { useSite } from "@/site/SiteContext";
import { reductionRatio, sentenceCase, type Kpi } from "@/lib/resume";
import { useReducedMotion } from "@/lib/prefs";
import { stagger, tween, instantTransition } from "@/design/motion";
import { cn } from "@/lib/cn";

/**
 * Impact numbers. Each figure is drawn the way it should be read:
 *  change    → before / after bars on one scale         (68% → 87%)
 *  share     → a 0–100 meter                            (95%+ reliability)
 *  reduction → before vs what is left, plus the ratio   (99.93% less ≈ 1,400× less)
 *  lift      → baseline vs lifted                       (+27% F1)
 *  multiple  → 1× vs N×                                 (3× faster)
 *  count     → pips for small counts, the full number for big ones
 * The bullet each number was quoted from sits under it.
 */

const unit = (k: Pick<Kpi, "suffix">) => k.suffix.replace(/\+$/, "");
const fmt = (n: number, k: Pick<Kpi, "decimals">) => (Math.round(n * 10 ** k.decimals) / 10 ** k.decimals).toLocaleString("en-US", { maximumFractionDigits: k.decimals });

/** One labelled bar; `frac` 0..1 of the track. */
function Bar({ label, value, frac, tone, delay, show }: { label: string; value: string; frac: number; tone: "muted" | "signal"; delay: number; show: boolean }) {
  const reduced = useReducedMotion();
  const f = Math.max(0.012, Math.min(1, frac));
  return (
    <div className="grid grid-cols-[4.75rem_1fr_auto] items-center gap-3">
      <span className="mono text-[length:var(--fs--2)] uppercase tracking-[var(--tr-caps)] text-ink-muted">{label}</span>
      <span className="relative h-2 overflow-hidden rounded-pill bg-paper-sunk">
        <motion.span
          className={cn("absolute inset-y-0 left-0 origin-left rounded-pill", tone === "signal" ? "bg-signal" : "bg-ink-faint")}
          style={{ width: `${f * 100}%` }}
          initial={reduced ? false : { scaleX: 0 }}
          animate={show ? { scaleX: 1 } : undefined}
          transition={reduced ? instantTransition : tween("slower", "out", delay)}
        />
      </span>
      <span className={cn("mono text-right text-[length:var(--fs--1)] tabular-nums", tone === "signal" ? "text-signal-ink" : "text-ink-muted")}>{value}</span>
    </div>
  );
}

function Pips({ n, show, delay }: { n: number; show: boolean; delay: number }) {
  const reduced = useReducedMotion();
  const count = Math.min(40, Math.max(1, Math.round(n)));
  return (
    <div className="flex flex-wrap gap-1.5" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-signal"
          initial={reduced ? false : { opacity: 0.15 }}
          animate={show ? { opacity: 1 } : undefined}
          transition={reduced ? instantTransition : tween("fast", "out", delay + i * 0.02)}
        />
      ))}
    </div>
  );
}

/** The visual for one figure, and a one-line reading of it for everyone (including screen readers). */
function Visual({ k, show, delay }: { k: Kpi; show: boolean; delay: number }): { viz: ReactNode; reading: string | null } {
  const u = unit(k);
  const pct = u.startsWith("%");
  switch (k.kind) {
    case "change": {
      if (k.from === undefined) break;
      const max = pct ? 100 : Math.max(k.from, k.value) || 1;
      const diff = k.value - k.from;
      const reading = pct ? `${diff >= 0 ? "+" : "−"}${fmt(Math.abs(diff), k)} points` : `${diff >= 0 ? "+" : "−"}${fmt(Math.abs(diff), k)}${u ? ` ${u}` : ""}`;
      return {
        reading,
        viz: (
          <div className="space-y-2">
            <Bar label="Before" value={`${k.prefix}${fmt(k.from, k)}${u}`} frac={k.from / max} tone="muted" delay={delay} show={show} />
            <Bar label="After" value={`${k.prefix}${fmt(k.value, k)}${u}`} frac={k.value / max} tone="signal" delay={delay + 0.15} show={show} />
          </div>
        ),
      };
    }
    case "share":
      if (!pct || k.value > 100) break;
      return {
        reading: null,
        viz: (
          <div>
            <Bar label="Score" value={`${fmt(k.value, k)}%`} frac={k.value / 100} tone="signal" delay={delay} show={show} />
            <div aria-hidden className="mono mt-1 grid grid-cols-[4.75rem_1fr_auto] gap-3 text-[length:var(--fs--2)] text-ink-muted">
              <span />
              <span className="flex justify-between"><span>0</span><span>50</span><span>100</span></span>
              <span className="invisible">100%</span>
            </div>
          </div>
        ),
      };
    case "reduction": {
      if (!pct || k.value > 100) break;
      const left = 100 - k.value;
      const ratio = reductionRatio(k.value);
      return {
        reading: ratio ? `${ratio} less than before` : `${fmt(left, k)}% of the original remains`,
        viz: (
          <div className="space-y-2">
            <Bar label="Before" value="100%" frac={1} tone="muted" delay={delay} show={show} />
            <Bar label="After" value={`${fmt(left, { decimals: Math.max(k.decimals, left < 1 ? 2 : 0) })}%`} frac={left / 100} tone="signal" delay={delay + 0.15} show={show} />
          </div>
        ),
      };
    }
    case "lift": {
      if (!pct) break;
      const base = 100 / (100 + k.value);
      return {
        reading: `${(1 + k.value / 100).toFixed(2).replace(/0$/, "")}× the baseline`,
        viz: (
          <div className="space-y-2">
            <Bar label="Baseline" value="1.0×" frac={base} tone="muted" delay={delay} show={show} />
            <Bar label="Now" value={`${(1 + k.value / 100).toFixed(2).replace(/0$/, "")}×`} frac={1} tone="signal" delay={delay + 0.15} show={show} />
          </div>
        ),
      };
    }
    case "multiple": {
      const n = Math.min(k.value, 50);
      return {
        reading: null,
        viz: (
          <div className="space-y-2">
            <Bar label="Before" value="1×" frac={1 / n} tone="muted" delay={delay} show={show} />
            <Bar label="After" value={`${fmt(k.value, k)}×`} frac={1} tone="signal" delay={delay + 0.15} show={show} />
          </div>
        ),
      };
    }
    case "count": {
      const mult = /^k/i.test(u) ? 1e3 : /^m/i.test(u) ? 1e6 : /^b/i.test(u) ? 1e9 : 1;
      const full = k.value * mult;
      if (mult === 1 && full <= 40 && Number.isInteger(full)) return { reading: null, viz: <Pips n={full} show={show} delay={delay} /> };
      if (mult > 1) return { reading: `${full.toLocaleString("en-US")}${k.suffix.endsWith("+") ? "+" : ""} in total`, viz: null };
      break;
    }
    default:
      break;
  }
  return { reading: null, viz: null };
}

function Figure({ k, className }: { k: Kpi; className?: string }) {
  return <CountUp value={k.value} from={k.from !== undefined && k.kind === "change" ? k.from : 0} prefix={k.prefix} suffix={k.suffix} decimals={k.decimals} className={className} />;
}

function Source({ k }: { k: Kpi }) {
  return (
    <details className="group/src mt-auto border-t border-rule pt-3 text-[length:var(--fs--1)]">
      <summary className="mono flex cursor-pointer list-none items-center justify-between gap-2 text-[length:var(--fs--2)] uppercase tracking-[var(--tr-caps)] text-ink-muted hover:text-ink [&::-webkit-details-marker]:hidden">
        <span>Source · {k.ownerShort}</span>
        <span aria-hidden className="transition-transform duration-[var(--dur-base)] group-open/src:rotate-45">+</span>
      </summary>
      <p className="mt-2 leading-[var(--lh-normal)] text-ink-muted">“{k.sourceText}”</p>
    </details>
  );
}

/** "dials" variant: an instrument card per figure. */
function Instrument({ k, index }: { k: Kpi; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const show = useInView(ref, { once: true, amount: 0.4 });
  const delay = index * stagger.item;
  const { viz, reading } = Visual({ k, show, delay: delay + 0.2 });
  return (
    <div ref={ref} className="group flex h-full flex-col gap-4 rounded-lg border border-rule bg-paper p-5 transition-colors duration-[var(--dur-base)] hover:border-ink" data-testid="kpi" data-kind={k.kind}>
      <p className="mono flex items-center justify-between gap-3 text-[length:var(--fs--2)] uppercase tracking-[var(--tr-caps)] text-ink-muted">
        <span className="truncate" title={k.context}>{k.context}</span>
        <span className="shrink-0 text-signal-ink">{String(index + 1).padStart(2, "0")}</span>
      </p>
      <div>
        <Figure k={k} className="display block text-[length:var(--fs-5)] leading-none tracking-[var(--tr-display)]" />
        <p className="mt-2 text-[length:var(--fs-0)] font-semibold leading-[var(--lh-snug)]">{sentenceCase(k.label)}</p>
        {reading || k.note ? (
          <p className="mono mt-1 text-[length:var(--fs--2)] text-ink-muted">
            {[reading, k.note].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>
      {viz ? <div>{viz}</div> : null}
      <Source k={k} />
    </div>
  );
}

/** "strip" variant: big editorial numbers on a hairline grid, each with its context, reading and source line. */
function Strip({ list }: { list: Kpi[] }) {
  return (
    <ol className="grid border-t border-ink sm:grid-cols-2 lg:grid-cols-3" role="list">
      {list.map((k, i) => (
        <StripItem key={`${k.highlightId}-${k.label}`} k={k} i={i} />
      ))}
    </ol>
  );
}

function StripItem({ k, i }: { k: Kpi; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const show = useInView(ref, { once: true, amount: 0.4 });
  const { viz, reading } = Visual({ k, show, delay: i * stagger.item + 0.2 });
  return (
    <Reveal as="li" delay={i * stagger.item} className="border-b border-rule py-[var(--sp-6)] sm:pr-[var(--sp-6)] lg:[&:not(:nth-child(3n))]:border-r lg:[&:not(:nth-child(3n+1))]:pl-[var(--sp-6)]">
      <div ref={ref} className="flex h-full flex-col" data-testid="kpi" data-kind={k.kind}>
        <p className="mono text-[length:var(--fs--2)] uppercase tracking-[var(--tr-caps)] text-ink-muted">{k.context} · {k.ownerShort}</p>
        <Figure k={k} className="display mt-3 block text-[length:var(--fs-6)] leading-none text-signal-ink" />
        <p className="mt-3 text-[length:var(--fs-0)] font-semibold">{sentenceCase(k.label)}</p>
        {reading || k.note ? <p className="mono mt-1 text-[length:var(--fs--2)] text-ink-muted">{[reading, k.note].filter(Boolean).join(" · ")}</p> : null}
        {viz ? <div className="mt-4 max-w-[26rem]">{viz}</div> : null}
        <p className="mt-4 text-[length:var(--fs--1)] leading-[var(--lh-normal)] text-ink-muted">“{k.sourceText}”</p>
      </div>
    </Reveal>
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
        <ul className={cn("grid gap-4 sm:grid-cols-2", list.length % 3 === 0 || list.length > 4 ? "lg:grid-cols-3" : "lg:grid-cols-2")} role="list">
          {list.map((k, i) => (
            <Reveal as="li" key={`${k.highlightId}-${k.label}`} delay={i * stagger.item}>
              <Instrument k={k} index={i} />
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}
