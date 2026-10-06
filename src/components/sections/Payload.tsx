"use client";

import { lineRadial, curveLinearClosed } from "d3-shape";
import { scaleLinear } from "d3-scale";
import { motion, useInView } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Reveal } from "@/components/primitives/Reveal";
import { ChapterHeader } from "@/site/ChapterHeader";
import { useSite } from "@/site/SiteContext";
import { Chip } from "@/components/ui/Chip";
import { useLenis, scrollToId } from "@/components/providers/SmoothScroll";
import { domainEvidence, domainLabel, domainsInUse, owners, type SkillUsage } from "@/lib/resume";
import { GRAPH_H, GRAPH_W, type GraphNode, type SkillGraph } from "@/lib/skill-graph-types";
import { useReducedMotion } from "@/lib/prefs";
import { tween, stagger } from "@/design/motion";
import { play } from "@/lib/sound";
import { cn } from "@/lib/cn";

const W = GRAPH_W;
const H = GRAPH_H;

type GNode = GraphNode;

/** Layout precomputed when the site was generated (site.graph); here we only resolve link endpoints. */
function useGraph(graph: SkillGraph) {
  return useMemo(() => {
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    const links = graph.links.map(([s, t]) => ({ source: byId.get(s)!, target: byId.get(t)! })).filter((l) => l.source && l.target);
    return { nodes: graph.nodes, links };
  }, [graph]);
}

/**
 * Skill labels sit right of their dot; when one would overlap a label (or an owner name) already placed,
 * it flips left, and if that collides too it is hidden until the skill is hovered. Biggest dots place first.
 */
type Side = "right" | "left" | "hidden";
function placeLabels(nodes: GNode[]): Map<string, Side> {
  const boxes: Array<[number, number, number, number]> = [];
  // off-canvas counts as a collision, so a label never gets clipped at the graph's edge
  const hit = (b: [number, number, number, number]) => b[0] < 2 || b[2] > W - 2 || boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
  const out = new Map<string, Side>();
  for (const n of nodes) {
    if (n.kind !== "owner") continue;
    const w = n.label.length * 8.2;
    boxes.push([n.x! - w / 2, n.y! - 8, n.x! + w / 2, n.y! + 32]);
  }
  for (const n of nodes) if (n.kind !== "owner") boxes.push([n.x! - n.r, n.y! - n.r, n.x! + n.r, n.y! + n.r]);
  const skills = nodes.filter((n) => n.kind !== "owner").sort((a, b) => b.r - a.r);
  for (const n of skills) {
    const w = n.label.length * 6.4 + 2;
    const right: [number, number, number, number] = [n.x! + n.r + 3, n.y! - 6, n.x! + n.r + 4 + w, n.y! + 6];
    const left: [number, number, number, number] = [n.x! - n.r - 4 - w, n.y! - 6, n.x! - n.r - 3, n.y! + 6];
    const side: Side = !hit(right) ? "right" : !hit(left) ? "left" : "hidden";
    if (side !== "hidden") boxes.push(side === "right" ? right : left);
    out.set(n.id, side);
  }
  return out;
}

const shortDomain = (label: string) => (label.length <= 18 ? label : label.split(/\s*[,&/]\s*|\s+/)[0]!);

function Radar() {
  const site = useSite();
  // only domains with evidence: a spoke at zero says nothing (keep at least a triangle)
  const all = domainEvidence(site.resume);
  const data = all.filter((d) => d.bullets > 0).length >= 3 ? all.filter((d) => d.bullets > 0) : all;
  const reduced = useReducedMotion();
  const max = Math.max(1, ...data.map((d) => d.bullets));
  const R = 92;
  const r = scaleLinear().domain([0, max]).range([0, R]);
  const angle = (i: number) => (i / data.length) * Math.PI * 2;
  const path = lineRadial<(typeof data)[number]>()
    .angle((_, i) => angle(i))
    .radius((d) => r(d.bullets))
    .curve(curveLinearClosed)(data)!;
  return (
    <figure className="rounded-lg border border-rule p-4">
      <figcaption className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[length:var(--fs--1)] font-medium">Where the evidence sits</span>
        <span className="mono text-[length:var(--fs--2)] text-ink-muted">bullets citing each domain</span>
      </figcaption>
      <svg viewBox="-235 -125 470 250" className="w-full" role="img" aria-label={`Radar of resume bullets by domain: ${data.map((d) => `${d.label} ${d.bullets}`).join(", ")}`}>
        {[0.33, 0.66, 1].map((k) => (
          <circle key={k} r={R * k} fill="none" stroke="var(--c-rule)" />
        ))}
        {data.map((d, i) => {
          const a = angle(i) - Math.PI / 2;
          const lx = Math.cos(a) * (R + 16);
          const ly = Math.sin(a) * (R + 16);
          return (
            <g key={d.domain}>
              <line x1={0} y1={0} x2={Math.cos(a) * R} y2={Math.sin(a) * R} stroke="var(--c-rule)" />
              <text x={lx} y={ly} fontSize={9.5} textAnchor={Math.abs(lx) < 8 ? "middle" : lx > 0 ? "start" : "end"} dominantBaseline="middle" fill="var(--c-ink-muted)" fontFamily="var(--ff-mono)">
                {shortDomain(d.label)} · {d.bullets}
              </text>
            </g>
          );
        })}
        <motion.path
          d={path}
          fill="color-mix(in oklab, var(--c-signal) 16%, transparent)"
          stroke="var(--c-signal)"
          strokeWidth={2}
          strokeLinejoin="round"
          initial={reduced ? false : { scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={tween("slower", "out")}
        />
      </svg>
      <table className="sr-only">
        <caption>Resume bullets citing each skill domain</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.domain}>
              <th scope="row">{d.label}</th>
              <td>{d.bullets}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** "bars" variant: skills grouped by domain, bar length = resume lines that name the skill. */
function Bars({ usage, active, pinned, setFocus, select }: { usage: SkillUsage[]; active: string | null; pinned: string | null; setFocus: (id: string) => void; select: (id: string) => void }) {
  const site = useSite();
  const reduced = useReducedMotion();
  const max = Math.max(1, ...usage.map((u) => u.highlightIds.length));
  return (
    <div className="space-y-8" role="group" aria-label="Skills by domain" data-testid="skills-bars">
      {domainsInUse(site.resume).map((d) => {
        const list = usage.filter((u) => u.skill.domain === d.id).sort((a, b) => b.highlightIds.length - a.highlightIds.length);
        if (!list.length) return null;
        return (
          <div key={d.id}>
            <h3 className="eyebrow mb-3 border-b border-rule pb-2">{d.label}</h3>
            <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
              {list.map((u, i) => (
                <li key={u.skill.id}>
                  <button
                    type="button"
                    aria-pressed={pinned === u.skill.id}
                    onFocus={() => setFocus(u.skill.id)}
                    onPointerEnter={() => setFocus(u.skill.id)}
                    onClick={() => select(u.skill.id)}
                    className={cn("group grid w-full grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 rounded-sm px-1 py-1.5 text-left", active === u.skill.id && "bg-paper-sunk")}
                  >
                    <span className="truncate text-[length:var(--fs--1)]">{u.skill.name}</span>
                    <span className="relative h-2 overflow-hidden rounded-pill bg-paper-sunk" aria-hidden>
                      <motion.span
                        className={cn("absolute inset-y-0 left-0 rounded-pill", u.highlightIds.length ? "bg-signal" : "bg-ink-faint")}
                        initial={reduced ? false : { width: 0 }}
                        whileInView={{ width: `${Math.max(6, (u.highlightIds.length / max) * 100)}%` }}
                        viewport={{ once: true }}
                        transition={tween("slower", "out", reduced ? 0 : (i % 12) * stagger.char)}
                        style={reduced ? { width: `${Math.max(6, (u.highlightIds.length / max) * 100)}%` } : undefined}
                      />
                    </span>
                    <span className="mono w-8 text-right text-[length:var(--fs--2)] text-ink-muted">{u.highlightIds.length || "—"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <p className="mono text-[length:var(--fs--2)] text-ink-muted">Bars count resume lines that name the skill; “—” means listed on the resume only.</p>
    </div>
  );
}

export function Payload() {
  const site = useSite();
  const USAGE = site.usage;
  const OWNERS = useMemo(() => owners(site.resume), [site.resume]);
  const OWNER_LABEL = useMemo(() => new Map(OWNERS.map((o) => [o.id, o])), [OWNERS]);
  const PROJECT_TITLE = useMemo(() => new Map(site.resume.projects.map((p) => [p.id, p])), [site.resume]);
  const variant = site.genome.sections.payload === "graph" && site.graph.links.length ? "graph" : "bars";
  const { nodes, links } = useGraph(site.graph);
  const sides = useMemo(() => placeLabels(nodes), [nodes]);
  const lenis = useLenis();
  const reduced = useReducedMotion();
  const [focus, setFocus] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const active = pinned ?? focus;

  const related = useMemo(() => {
    const s = new Set<string>();
    if (!active) return s;
    s.add(active);
    for (const l of links) {
      if (l.source.id === active) s.add(l.target.id);
      if (l.target.id === active) s.add(l.source.id);
    }
    return s;
  }, [active, links]);

  const activeSkill = USAGE.find((u) => u.skill.id === active);
  const activeOwner = active ? OWNER_LABEL.get(active) : undefined;
  const toolkit = USAGE.filter((u) => !u.ownerIds.length);
  const graphRef = useRef<SVGSVGElement>(null);
  const inView = useInView(graphRef, { once: true, amount: 0.2 });
  const shown = reduced || inView;
  // after the entrance stagger finishes, hover/dim changes respond without per-node delay
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setEntered(true), 1600);
    return () => clearTimeout(t);
  }, [shown]);

  const select = (id: string) => {
    setPinned((p) => (p === id ? null : id));
    play("tick");
  };

  return (
    <section id="payload" aria-labelledby="payload-title" className="relative px-gutter py-section" data-cite-id="skills">
      <ChapterHeader id="payload" />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="relative lg:col-span-8">
          {variant === "bars" ? (
            <Bars usage={USAGE} active={active} pinned={pinned} setFocus={setFocus} select={select} />
          ) : (
          <>
          <div className="drafting-grid relative overflow-hidden rounded-lg border border-rule bg-paper-raised/40">
            <svg ref={graphRef} viewBox={`0 0 ${W} ${H}`} className="block w-full" aria-hidden="true" data-testid="skills-graph">
              <g>
                {links.map((l, i) => {
                  const on = related.has(l.source.id) && related.has(l.target.id) && (l.source.id === active || l.target.id === active);
                  return (
                    <line
                      key={i}
                      x1={l.source.x}
                      y1={l.source.y}
                      x2={l.target.x}
                      y2={l.target.y}
                      stroke={on ? "var(--c-signal)" : "var(--c-ink)"}
                      strokeOpacity={on ? 0.9 : active ? 0.07 : 0.18}
                      strokeWidth={on ? 1.6 : 1}
                      style={{ transition: "stroke-opacity var(--dur-base) var(--ease-out), stroke var(--dur-base)" }}
                    />
                  );
                })}
              </g>
              {nodes.map((n, i) => {
                const on = related.has(n.id);
                const dim = !!active && !on;
                return (
                  // Plain <g> + CSS transitions (one observer for the whole graph, not one per node)
                  <g
                    key={n.id}
                    className="transition-[opacity,transform] duration-[var(--dur-slow)] ease-[var(--ease-out)]"
                    style={{
                      transformOrigin: `${n.x}px ${n.y}px`,
                      transform: shown ? "none" : "scale(0.4)",
                      opacity: !shown ? 0 : dim ? 0.35 : 1,
                      transitionDelay: shown && !entered ? `${Math.round(i * stagger.char * 1000)}ms` : "0ms",
                      cursor: "pointer",
                    }}
                    onPointerEnter={() => setFocus(n.id)}
                    onClick={() => select(n.id)}
                    data-cursor="link"
                    data-cursor-label={n.kind === "owner" ? "Role" : "Skill"}
                  >
                    {n.kind === "owner" ? (
                      <>
                        <rect x={n.x! - 7} y={n.y! - 7} width={14} height={14} transform={`rotate(45 ${n.x} ${n.y})`} fill={on ? "var(--c-signal)" : "var(--c-ink)"} />
                        <text x={n.x} y={n.y! + 26} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--c-ink)" fontFamily="var(--ff-display)" paintOrder="stroke" stroke="var(--c-paper)" strokeWidth={4}>
                          {n.label}
                        </text>
                      </>
                    ) : (
                      <>
                        <circle cx={n.x} cy={n.y} r={n.r + 8} fill="transparent" />
                        <circle cx={n.x} cy={n.y} r={n.r} fill={on ? "var(--c-signal)" : "var(--c-paper)"} stroke={on ? "var(--c-signal)" : "var(--c-ink)"} strokeWidth={1.25} />
                        <text
                          x={sides.get(n.id) === "left" ? n.x! - n.r - 4 : n.x! + n.r + 4}
                          y={n.y! + 3.5}
                          textAnchor={sides.get(n.id) === "left" ? "end" : "start"}
                          opacity={sides.get(n.id) === "hidden" && active !== n.id ? 0 : 1}
                          fontSize={10.5}
                          paintOrder="stroke"
                          stroke="var(--c-paper)"
                          strokeWidth={3}
                          fill={on ? "var(--c-ink)" : "var(--c-ink-muted)"}
                          fontFamily="var(--ff-mono)"
                        >
                          {n.label}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-6 space-y-4" role="group" aria-label="Skills by domain">
            {domainsInUse(site.resume).map((dm) => {
              const list = USAGE.filter((u) => u.skill.domain === dm.id && u.ownerIds.length);
              if (!list.length) return null;
              return (
                <div key={dm.id} className="flex flex-wrap items-baseline gap-2">
                  <span className="eyebrow mr-2 w-full sm:w-44 sm:shrink-0">{dm.label}</span>
                  {list.map((u) => (
                    <button
                      key={u.skill.id}
                      type="button"
                      aria-pressed={pinned === u.skill.id}
                      onFocus={() => setFocus(u.skill.id)}
                      onPointerEnter={() => setFocus(u.skill.id)}
                      onClick={() => select(u.skill.id)}
                      className={cn(
                        "mono rounded-pill border px-2.5 py-1 text-[length:var(--fs--2)] transition-colors duration-[var(--dur-fast)]",
                        active === u.skill.id ? "border-signal-ink bg-signal-ink text-on-signal" : "border-rule text-ink hover:border-ink",
                      )}
                    >
                      {u.skill.name}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
          </>
          )}
        </div>

        <aside className="space-y-6 lg:col-span-4" aria-live="polite">
          <div className="rounded-lg border border-ink bg-paper p-5 shadow-paper">
            <p className="eyebrow">{activeOwner ? "Role" : activeSkill ? "Selected skill" : "Skill graph"}{pinned ? " · pinned" : ""}</p>
            <h3 className="display mt-1 text-[length:var(--fs-3)] font-semibold" data-testid="payload-active">
              {activeSkill?.skill.name ?? activeOwner?.label ?? "Pick a skill"}
            </h3>
            {!activeSkill && !activeOwner ? (
              <p className="mt-2 text-[length:var(--fs--1)] text-ink-muted">
                {USAGE.filter((u) => u.ownerIds.length).length} of {USAGE.length} skills are named in specific roles or projects. {variant === "graph" ? "Hover the graph, or tap a skill below," : "Tap a skill"} to see where each one was used.
              </p>
            ) : null}
            {activeSkill ? (
              <>
                <p className="mt-1 text-[length:var(--fs--1)] text-ink-muted">
                  {domainLabel(site.resume, activeSkill.skill.domain)} · cited in {activeSkill.highlightIds.length} bullet{activeSkill.highlightIds.length === 1 ? "" : "s"}
                  {activeSkill.skill.listed ? "" : " · named in a bullet"}
                </p>
                <p className="eyebrow mt-5">Used in</p>
                <ul className="mt-2 space-y-2">
                  {activeSkill.ownerIds.map((o) => (
                    <li key={o}>
                      <button type="button" onClick={() => scrollToId(o, lenis)} className="group flex w-full items-baseline justify-between gap-3 text-left">
                        <span className="font-medium underline decoration-rule underline-offset-4 group-hover:decoration-signal">{OWNER_LABEL.get(o)?.label}</span>
                        <span className="mono text-[length:var(--fs--2)] text-ink-muted">{OWNER_LABEL.get(o)?.sub}</span>
                      </button>
                    </li>
                  ))}
                  {activeSkill.projectIds.map((p) => (
                    <li key={p}>
                      <button type="button" onClick={() => scrollToId(p, lenis)} className="group flex w-full items-baseline justify-between gap-3 text-left">
                        <span className="underline decoration-rule underline-offset-4 group-hover:decoration-signal">{PROJECT_TITLE.get(p)?.title}</span>
                        <span className="mono text-[length:var(--fs--2)] text-signal-ink">{PROJECT_TITLE.get(p)?.codename}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : activeOwner ? (
              <p className="mt-1 text-[length:var(--fs--1)] text-ink-muted">
                {activeOwner.sub} · {USAGE.filter((u) => u.ownerIds.includes(activeOwner.id)).map((u) => u.skill.name).join(", ") || "no named skills"}
              </p>
            ) : null}
          </div>
          {domainEvidence(site.resume).filter((d) => d.bullets > 0).length >= 3 ? (
            <Reveal>
              <Radar />
            </Reveal>
          ) : null}
          {variant === "graph" && toolkit.length ? (
          <div className="rounded-lg border border-dashed border-rule p-4">
            <p className="eyebrow mb-2">Toolkit · listed, not tied to a bullet</p>
            <div className="flex flex-wrap gap-1.5">
              {toolkit.map((u) => (
                <Chip key={u.skill.id}>{u.skill.name}</Chip>
              ))}
            </div>
          </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
