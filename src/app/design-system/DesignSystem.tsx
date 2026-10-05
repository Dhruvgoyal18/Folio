"use client";

import * as Slider from "@radix-ui/react-slider";
import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { palette, colorRoles, colorRoleDocs, typography, space, radius, elevation, zIndex, breakpoints, blur } from "@/design/tokens";
import { duration, ease, spring, stagger, distance, cssEase, sec, bezier, type EaseToken, type DurationToken, type SpringToken } from "@/design/motion";
import { contrast, isHex } from "@/design/contrast";
import { Reveal, SplitText, Magnetic, Parallax, CountUp, Marquee, TiltCard, Skeleton } from "@/components/primitives";
import { Button, IconButton } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Chip } from "@/components/ui/Chip";
import { MotionToggle, SoundToggle, ThemeSwitch } from "@/components/ui/ThemeSwitch";
import { ArrowUpRight, Download, Reticle, Terminal } from "@/components/ui/icons";
import { usePrefs } from "@/lib/prefs";
import { StaticConstellation } from "@/components/three/StaticConstellation";
import { seedResume } from "@/data/seed";

/* ---------- controls ---------- */

function Range({ label, value, min, max, step = 1, onChange, unit = "" }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <label className="block">
      <span className="mono flex justify-between text-[length:var(--fs--2)] uppercase tracking-[var(--tr-mono)] text-ink-muted">
        <span>{label}</span>
        <span className="text-ink">{value}{unit}</span>
      </span>
      <Slider.Root className="relative mt-2 flex h-5 w-full touch-none items-center" value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v!)} aria-label={label}>
        <Slider.Track className="relative h-[3px] grow rounded-full bg-rule">
          <Slider.Range className="absolute h-full rounded-full bg-signal" />
        </Slider.Track>
        <Slider.Thumb aria-label={label} className="block h-4 w-4 rounded-full border-2 border-ink bg-paper focus-visible:outline-2" />
      </Slider.Root>
    </label>
  );
}

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <label className="block">
      <span className="mono text-[length:var(--fs--2)] uppercase tracking-[var(--tr-mono)] text-ink-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="mono mt-1 block w-full rounded-sm border border-rule bg-paper px-2 py-1.5 text-[length:var(--fs--1)]">
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function Spec({ id, title, note, children, controls }: { id: string; title: string; note?: string; children: ReactNode; controls?: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 border-t border-rule py-[var(--sp-8)]">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={`${id}-h`} className="display text-[length:var(--fs-4)] font-semibold">{title}</h2>
        {note ? <p className="max-w-[60ch] text-[length:var(--fs--1)] text-ink-muted">{note}</p> : null}
      </div>
      <div className={controls ? "grid gap-6 lg:grid-cols-[1fr_280px]" : ""}>
        <div>{children}</div>
        {controls ? <div className="space-y-4 rounded-lg border border-rule bg-paper-raised/50 p-4">{controls}</div> : null}
      </div>
    </section>
  );
}

const Code = ({ children }: { children: ReactNode }) => <code className="mono rounded-xs bg-paper-sunk px-1.5 py-0.5 text-[length:var(--fs--2)]">{children}</code>;

/* ---------- token sections ---------- */

function Colors() {
  const { theme } = usePrefs();
  return (
    <Spec id="color" title="Color" note="Semantic roles, two themes. Contrast is computed live against paper; AA needs 4.5 for body text, 3 for large type and graphics.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {colorRoles.map((r) => {
          const v = palette[theme][r];
          const c = isHex(v) && isHex(palette[theme].paper) ? contrast(v, palette[theme].paper) : null;
          return (
            <div key={r} className="flex items-center gap-3 rounded-md border border-rule p-3">
              <span className="h-12 w-12 shrink-0 rounded-sm border border-rule" style={{ background: `var(--c-${r})` }} />
              <div className="min-w-0">
                <p className="mono text-[length:var(--fs--1)] font-medium">--c-{r}</p>
                <p className="text-[length:var(--fs--2)] text-ink-muted">{colorRoleDocs[r]}</p>
                <p className="mono text-[length:var(--fs--2)] text-ink-muted">
                  {v} {c ? <span className={c >= 4.5 ? "text-teal" : c >= 3 ? "text-signal-ink" : ""}>· {c.toFixed(2)}:1</span> : null}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Spec>
  );
}

function Type() {
  return (
    <Spec id="type" title="Typography" note="Bricolage Grotesque (display), Instrument Sans (text), JetBrains Mono (data). Fluid scale: ratio 1.2 → 1.333 between 360 and 1440px.">
      <div className="space-y-3">
        {Object.entries(typography.scale)
          .sort((a, b) => Number(b[0]) - Number(a[0]))
          .map(([k, v]) => (
            <div key={k} className="grid grid-cols-[64px_1fr] items-baseline gap-4 border-b border-rule pb-2">
              <span className="mono text-[length:var(--fs--2)] text-ink-muted">step {k}</span>
              <span className={Number(k) >= 3 ? "display truncate" : "truncate"} style={{ fontSize: `var(--fs-${k})` }} title={v}>
                {Number(k) >= 3 ? "Mission Log DG-01" : "Multi-agent systems, RAG pipelines and applied ML."}
              </span>
            </div>
          ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-rule p-4"><p className="display text-[length:var(--fs-4)]">Aa</p><p className="mono text-[length:var(--fs--2)] text-ink-muted">display · 800 · {typography.tracking.display}</p></div>
        <div className="rounded-md border border-rule p-4"><p className="text-[length:var(--fs-4)]">Aa</p><p className="mono text-[length:var(--fs--2)] text-ink-muted">text · 400–700</p></div>
        <div className="rounded-md border border-rule p-4"><p className="mono text-[length:var(--fs-4)]">Aa</p><p className="mono text-[length:var(--fs--2)] text-ink-muted">mono · {typography.tracking.mono}</p></div>
      </div>
    </Spec>
  );
}

function Scales() {
  return (
    <Spec id="space" title="Space, radius, elevation, blur, z-index, breakpoints">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-2">
          {Object.entries(space).map(([k, v]) => (
            <div key={k} className="flex items-center gap-3">
              <span className="mono w-20 text-[length:var(--fs--2)] text-ink-muted">--sp-{k}</span>
              <span className="h-3 bg-signal" style={{ width: `var(--sp-${k})` }} />
              <span className="mono text-[length:var(--fs--2)] text-ink-muted">{v}</span>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            {Object.keys(radius).map((k) => (
              <div key={k} className="text-center">
                <div className="h-14 w-14 border-2 border-ink bg-paper-raised" style={{ borderRadius: `var(--r-${k})` }} />
                <p className="mono mt-1 text-[length:var(--fs--2)] text-ink-muted">{k}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            {Object.keys(elevation).map((k) => (
              <div key={k} className="flex h-16 w-24 items-end rounded-md bg-paper p-2" style={{ boxShadow: `var(--el-${k})` }}>
                <span className="mono text-[length:var(--fs--2)] text-ink-muted">{k}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(blur).map(([k, v]) => (
              <div key={k} className="relative h-16 w-24 overflow-hidden rounded-md border border-rule">
                <span className="absolute left-3 top-3 h-6 w-6 rounded-full bg-signal" />
                <span className="vellum absolute inset-x-0 bottom-0 h-1/2" style={{ backdropFilter: `blur(${v})` }} />
                <span className="mono absolute bottom-1 left-2 text-[length:var(--fs--2)]">blur {k}</span>
              </div>
            ))}
          </div>
          <p className="mono text-[length:var(--fs--2)] text-ink-muted">
            z: {Object.entries(zIndex).map(([k, v]) => `${k} ${v}`).join(" · ")}
            <br />
            breakpoints: {Object.entries(breakpoints).map(([k, v]) => `${k} ${v}px`).join(" · ")}
          </p>
        </div>
      </div>
    </Spec>
  );
}

/* ---------- motion tokens ---------- */

function EaseCurve({ name }: { name: EaseToken }) {
  const [x1, y1, x2, y2] = ease[name];
  const [k, setK] = useState(0);
  const P = (x: number, y: number) => `${8 + x * 104} ${112 - y * 84}`;
  return (
    <button type="button" onClick={() => setK((n) => n + 1)} className="rounded-md border border-rule p-3 text-left hover:border-ink" aria-label={`Replay ease.${name}`}>
      <svg viewBox="0 0 120 130" className="w-full" aria-hidden>
        <path d={`M${P(0, 0)} C${P(x1, y1)} ${P(x2, y2)} ${P(1, 1)}`} fill="none" stroke="var(--c-ink)" strokeWidth={1.5} />
        <line x1={8} y1={112} x2={112} y2={112} stroke="var(--c-rule)" />
        <motion.circle key={k} r={4} cy={20} fill="var(--c-signal)" initial={{ cx: 8 }} animate={{ cx: 112 }} transition={{ duration: sec("cinematic"), ease: bezier(name) }} />
      </svg>
      <p className="mono text-[length:var(--fs--2)]">ease.{name}</p>
      <p className="mono text-[length:var(--fs--2)] text-ink-muted">{cssEase(name).replace("cubic-bezier", "")}</p>
    </button>
  );
}

function Durations() {
  const [k, setK] = useState(0);
  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" onClick={() => setK((n) => n + 1)}>Replay durations</Button>
      {(Object.keys(duration) as DurationToken[]).map((d) => (
        <div key={d} className="flex items-center gap-3">
          <span className="mono w-28 text-[length:var(--fs--2)] text-ink-muted">{d} · {duration[d]}ms</span>
          <div className="relative h-3 flex-1 rounded-full bg-paper-sunk">
            <motion.span key={k} className="absolute left-0 top-0 h-3 w-3 rounded-full bg-signal" initial={{ left: "0%" }} animate={{ left: "calc(100% - 12px)" }} transition={{ duration: duration[d] / 1000, ease: bezier("out") }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SpringLab() {
  const [preset, setPreset] = useState<SpringToken>("gentle");
  const [stiff, setStiff] = useState<number>(spring.gentle.stiffness);
  const [damp, setDamp] = useState<number>(spring.gentle.damping);
  const [on, setOn] = useState(false);
  return (
    <Spec
      id="springs"
      title="Springs"
      note="Physics for feedback and panels. Pick a token, then tune it to feel the difference."
      controls={
        <>
          <Select<SpringToken>
            label="token"
            value={preset}
            options={Object.keys(spring) as SpringToken[]}
            onChange={(v) => {
              setPreset(v);
              setStiff(spring[v].stiffness);
              setDamp(spring[v].damping);
            }}
          />
          <Range label="stiffness" value={stiff} min={50} max={800} step={10} onChange={setStiff} />
          <Range label="damping" value={damp} min={4} max={60} onChange={setDamp} />
          <Button size="sm" onClick={() => setOn((v) => !v)}>Fire</Button>
        </>
      }
    >
      <div className="relative h-40 rounded-md border border-rule drafting-grid">
        <motion.div className="absolute top-1/2 h-14 w-14 -translate-y-1/2 rounded-md bg-ink" animate={{ left: on ? "calc(100% - 4.5rem)" : "1rem", rotate: on ? 90 : 0 }} transition={{ type: "spring", stiffness: stiff, damping: damp, mass: spring[preset].mass }} />
      </div>
      <p className="mono mt-3 text-[length:var(--fs--2)] text-ink-muted">
        stagger: {Object.entries(stagger).map(([k, v]) => `${k} ${v * 1000}ms`).join(" · ")} — distance: {Object.entries(distance).map(([k, v]) => `${k} ${v}`).join(" · ")}
      </p>
    </Spec>
  );
}

/* ---------- primitive demos ---------- */

function RevealDemo() {
  const [k, setK] = useState(0);
  const [y, setY] = useState<number>(distance.entrance);
  const [d, setD] = useState<DurationToken>("slow");
  return (
    <Spec id="reveal" title="<Reveal>" note="Entrance: rise + fade when scrolled into view. Reduced motion → 150ms crossfade." controls={<><Range label="y" value={y} min={0} max={120} onChange={setY} unit="px" /><Select label="duration" value={d} options={Object.keys(duration) as DurationToken[]} onChange={setD} /><Button size="sm" onClick={() => setK((n) => n + 1)}>Replay</Button></>}>
      <div key={k} className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Reveal key={i} y={y} duration={d} delay={i * stagger.item} once={false}>
            <div className="h-24 rounded-md border border-rule bg-paper-raised p-3 mono text-[length:var(--fs--2)]">item {i + 1}</div>
          </Reveal>
        ))}
      </div>
      <p className="mt-3"><Code>{`<Reveal y={${y}} duration="${d}" delay={i * stagger.item}>`}</Code></p>
    </Spec>
  );
}

function SplitDemo() {
  const [k, setK] = useState(0);
  const [text, setText] = useState("Kinetic type, accessible.");
  const [by, setBy] = useState<"char" | "word">("char");
  return (
    <Spec id="splittext" title="<SplitText>" note="Units rise out of clipped lines. Screen readers get the intact string; animated spans are aria-hidden." controls={<><label className="block"><span className="mono text-[length:var(--fs--2)] uppercase text-ink-muted">text</span><input value={text} onChange={(e) => setText(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-paper px-2 py-1.5" /></label><Select label="by" value={by} options={["char", "word"] as const} onChange={setBy} /><Button size="sm" onClick={() => setK((n) => n + 1)}>Replay</Button></>}>
      <SplitText key={`${k}-${by}-${text}`} text={text} by={by} as="p" className="display text-[length:var(--fs-6)]" />
    </Spec>
  );
}

function MagneticDemo() {
  const [s, setS] = useState<number>(distance.magnetic);
  return (
    <Spec id="magnetic" title="<Magnetic>" note="Pulls toward the pointer. Mouse only; inert on touch and under reduced motion." controls={<Range label="strength" value={s} min={0} max={1} step={0.05} onChange={setS} />}>
      <div className="flex h-40 items-center justify-center gap-6 rounded-md border border-rule">
        <Magnetic strength={s}><Button variant="signal" size="lg"><Reticle /> Pull me</Button></Magnetic>
        <Magnetic strength={s}><IconButton label="Magnetic icon"><ArrowUpRight /></IconButton></Magnetic>
      </div>
    </Spec>
  );
}

function ParallaxDemo() {
  const [sp, setSp] = useState(1);
  return (
    <Spec id="parallax" title="<Parallax>" note="Layers drift against page scroll. Scroll the page to see the three layers separate." controls={<Range label="speed" value={sp} min={-2} max={2} step={0.1} onChange={setSp} />}>
      <div className="relative h-56 overflow-hidden rounded-md border border-rule drafting-grid">
        <Parallax speed={-sp} className="absolute left-[10%] top-10"><span className="display text-[length:var(--fs-6)] text-ink/20">BACK</span></Parallax>
        <Parallax speed={sp * 0.5} className="absolute left-[40%] top-16"><span className="display text-[length:var(--fs-5)] text-ink-muted">MID</span></Parallax>
        <Parallax speed={sp} className="absolute left-[65%] top-20"><span className="display text-[length:var(--fs-4)] text-signal">FRONT</span></Parallax>
      </div>
    </Spec>
  );
}

function CountDemo() {
  const [v, setV] = useState(87);
  const [from, setFrom] = useState(68);
  const [k, setK] = useState(0);
  return (
    <Spec id="countup" title="<CountUp>" note="Counts when visible. Assistive tech reads only the final value." controls={<><Range label="value" value={v} min={0} max={100} onChange={setV} /><Range label="from" value={from} min={0} max={100} onChange={setFrom} /><Button size="sm" onClick={() => setK((n) => n + 1)}>Replay</Button></>}>
      <CountUp key={`${k}-${v}-${from}`} value={v} from={from} suffix="%" className="display text-[length:var(--fs-7)]" />
    </Spec>
  );
}

function ScrollSceneDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const width = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  return (
    <Spec id="scrollscene" title="<ScrollScene>" note="Pins a section with position: sticky and exposes 0→1 scroll progress as a MotionValue (works with Lenis, native and touch scrolling). The hero uses it to collapse the constellation; below, the same progress drives the SVG fallback while you scroll.">
      <div ref={ref} className="rounded-md border border-rule p-4">
        <div className="h-2 rounded-full bg-paper-sunk"><motion.div className="h-2 rounded-full bg-signal" style={{ width }} /></div>
        <StaticConstellation resume={seedResume} progress={scrollYProgress} className="mt-4 h-56 w-full" />
        <p className="mt-2"><Code>{`<ScrollScene length={1.3}>{(progress) => <Constellation progress={progress} />}</ScrollScene>`}</Code></p>
      </div>
    </Spec>
  );
}

function MarqueeDemo() {
  const [sp, setSp] = useState(30);
  const [rev, setRev] = useState(false);
  return (
    <Spec id="marquee" title="<Marquee>" note="Infinite ribbon; pauses on hover/focus; static when reduced." controls={<><Range label="seconds / loop" value={sp} min={5} max={80} onChange={setSp} /><div className="flex items-center justify-between"><span className="mono text-[length:var(--fs--2)] uppercase text-ink-muted">reverse</span><Toggle checked={rev} onCheckedChange={setRev} label="Reverse marquee" /></div></>}>
      <Marquee speed={sp} reverse={rev} className="rounded-md border border-rule py-4">
        {["LangGraph", "RAG", "MCP", "Kafka", "RoBERTa", "SARIMAX"].map((w) => (
          <span key={w} className="display text-[length:var(--fs-4)]">{w} <span className="text-signal">✦</span></span>
        ))}
      </Marquee>
    </Spec>
  );
}

function TiltDemo() {
  const [m, setM] = useState<number>(distance.tilt);
  return (
    <Spec id="tiltcard" title="<TiltCard>" note="Tilts toward the pointer with a moving glare. Flat on touch and reduced motion." controls={<Range label="max tilt" value={m} min={0} max={20} onChange={setM} unit="°" />}>
      <div className="grid max-w-md">
        <TiltCard max={m} className="rounded-lg">
          <div className="rounded-lg border border-ink bg-paper p-6">
            <p className="mono text-signal-ink">QUERY-87</p>
            <p className="display mt-6 text-[length:var(--fs-3)]">Text-to-SQL Copilot</p>
            <p className="display mt-6 text-[length:var(--fs-5)]">87%</p>
          </div>
        </TiltCard>
      </div>
    </Spec>
  );
}

function CursorDemo() {
  return (
    <Spec id="glowcursor" title="<GlowCursor>" note='A reticle that reacts to content: data-cursor="link" grows it, data-cursor-label adds a word. Inputs keep the native caret. Mouse + full motion only.'>
      <div className="flex flex-wrap gap-3">
        {["Open", "Ask", "PDF", "Drag"].map((l) => (
          <span key={l} data-cursor="link" data-cursor-label={l} className="rounded-md border border-dashed border-rule px-6 py-8 mono text-[length:var(--fs--1)]">hover → “{l}”</span>
        ))}
        <input placeholder="native caret here" className="rounded-md border border-rule bg-paper px-3" />
      </div>
    </Spec>
  );
}

function TransitionDemo() {
  return (
    <Spec id="pagetransition" title="<PageTransition>" note="Client navigations feed a new sheet: an ink wipe clears upward while content settles. Never runs on the first load (protects LCP).">
      <Link href="/u/dhruv-goyal" className="mono inline-flex items-center gap-2 rounded-pill bg-ink px-5 py-3 text-paper no-underline">See it on the showcase site <ArrowUpRight size={14} /></Link>
    </Spec>
  );
}

function SkeletonDemo() {
  return (
    <Spec id="skeleton" title="<Skeleton>" note="Loading placeholder for the 3D scene and chat. Shimmer stops under reduced motion.">
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4" /><Skeleton className="h-4 w-1/2" /></div>
      </div>
    </Spec>
  );
}

function UiKit() {
  const [t, setT] = useState(true);
  return (
    <Spec id="ui" title="Controls" note="Buttons carry spring press feedback (scale 0.96) and cursor labels. Toggles use Radix semantics.">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="signal"><Reticle /> Signal</Button>
        <Button variant="outline"><Download /> Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button size="sm">Small</Button>
        <IconButton label="Terminal"><Terminal /></IconButton>
        <ThemeSwitch />
        <MotionToggle />
        <SoundToggle />
        <Toggle checked={t} onCheckedChange={setT} label="Demo toggle" />
        <Chip>default</Chip>
        <Chip tone="signal">signal</Chip>
        <Chip tone="teal">teal</Chip>
        <Chip tone="solid">solid</Chip>
      </div>
    </Spec>
  );
}

const NAV = ["color", "type", "space", "motion", "springs", "reveal", "splittext", "magnetic", "parallax", "countup", "scrollscene", "marquee", "tiltcard", "glowcursor", "pagetransition", "skeleton", "ui"];

export function DesignSystem() {
  return (
    <div className="px-gutter pb-[var(--sp-9)]">
      <header className="flex flex-wrap items-center justify-between gap-4 py-6">
        <Link href="/" className="mono no-underline">← Folio</Link>
        <div className="flex gap-2"><SoundToggle /><MotionToggle /><ThemeSwitch /></div>
      </header>
      <div className="py-[var(--sp-7)]">
        <p className="eyebrow">Design & motion system · v1</p>
        <h1 className="display mt-3 text-[length:var(--fs-7)] uppercase">Mission control<br /><span className="text-signal">on paper.</span></h1>
        <p className="mt-6 max-w-[62ch] text-[length:var(--fs-1)] text-ink-muted">
          Every color, size and motion on the site comes from <Code>src/design/tokens.ts</Code> and <Code>src/design/motion.ts</Code>. Feature code may not hard-code values. <Code>npm run lint:tokens</Code> enforces it at build.
        </p>
        <nav aria-label="System sections" className="mt-8 flex flex-wrap gap-2">
          {NAV.map((n) => (
            <a key={n} href={`#${n}`} className="mono rounded-pill border border-rule px-3 py-1 text-[length:var(--fs--2)] no-underline hover:border-ink">{n}</a>
          ))}
        </nav>
      </div>
      <Colors />
      <Type />
      <Scales />
      <Spec id="motion" title="Motion tokens" note="Durations and easings. Click a curve to replay it. Meanings: entrance = ease.out, exit = ease.in, transition = ease.inOut, drawing = ease.plot.">
        <div className="grid gap-6 lg:grid-cols-2">
          <Durations />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(Object.keys(ease) as EaseToken[]).map((e) => <EaseCurve key={e} name={e} />)}
          </div>
        </div>
      </Spec>
      <SpringLab />
      <RevealDemo />
      <SplitDemo />
      <MagneticDemo />
      <ParallaxDemo />
      <CountDemo />
      <ScrollSceneDemo />
      <MarqueeDemo />
      <TiltDemo />
      <CursorDemo />
      <TransitionDemo />
      <SkeletonDemo />
      <UiKit />
    </div>
  );
}
