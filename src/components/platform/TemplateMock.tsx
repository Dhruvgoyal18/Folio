import type { CSSProperties } from "react";
import type { Resume } from "@/data/schema";
import { CONCEPT_DEFS } from "@/genome/concepts";
import { PAIRINGS, stack } from "@/genome/fonts";
import type { Genome } from "@/genome/schema";
import { credentials, kpis, formatMetric } from "@/lib/resume";
import { initials } from "@/components/visuals/Monogram";

/**
 * A miniature, static rendering of a template's hero in its own palette and type — cheap enough to
 * show nine at once (no iframes, no site JS). Each hero layout gets its own composition so the
 * gallery shows how different the templates really are.
 */
export function TemplateMock({ g, resume, className }: { g: Genome; resume: Resume; className?: string }) {
  const p = g.palette[g.defaultTheme];
  const f = PAIRINGS[g.fonts];
  const layout = CONCEPT_DEFS[g.concept].heroLayout;
  const name = resume.profile.name;
  const [first, ...rest] = name.split(/\s+/);
  const last = rest.join(" ");
  const k = kpis(resume).slice(0, 3);
  const cred = credentials(resume, 2);
  const display: CSSProperties = { fontFamily: stack(f.display), fontWeight: f.displayWeight, letterSpacing: f.tracking, textTransform: f.uppercaseHero ? "uppercase" : "none" };
  const mono: CSSProperties = { fontFamily: stack(f.mono) };
  const text: CSSProperties = { fontFamily: stack(f.text) };
  const muted = p["ink-muted"];
  const radius = g.radius === "round" ? 14 : g.radius === "soft" ? 8 : 0;
  const base: CSSProperties = { background: p.paper, color: p.ink, ...text };
  const cta = (label: string, filled = true): React.ReactNode => (
    <span className="inline-block px-2.5 py-1 text-[10px]" style={{ ...mono, borderRadius: g.radius === "sharp" ? 2 : 999, background: filled ? p["signal-ink"] : "transparent", color: filled ? p["on-signal"] : p.ink, border: `1px solid ${filled ? p["signal-ink"] : p.rule}` }}>
      {label}
    </span>
  );

  const grid: CSSProperties = g.texture === "grid" ? { backgroundImage: `linear-gradient(${p.grid} 1px, transparent 1px), linear-gradient(90deg, ${p.grid} 1px, transparent 1px)`, backgroundSize: "18px 18px" } : {};

  let body: React.ReactNode;
  switch (layout) {
    case "editorial":
      body = (
        <div className="flex h-full flex-col p-5">
          <div className="flex justify-between border-b pb-1 text-[10px] italic" style={{ borderColor: p.ink }}>
            <span>{g.copy.kicker}</span>
            <span style={mono}>{resume.profile.callsign}</span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-[34px] leading-[0.95]" style={display}>{name}</p>
            <p className="mt-2 max-w-[30ch] text-[11px] italic" style={{ color: muted }}>{resume.profile.headline}</p>
          </div>
          <div className="h-8 border-y" style={{ borderColor: p.ink, background: `repeating-linear-gradient(90deg, ${p.rule} 0 1px, transparent 1px 9px)` }} />
        </div>
      );
      break;
    case "terminal":
      body = (
        <div className="h-full p-5" style={{ ...grid }}>
          <div className="h-full border p-3 text-[11px]" style={{ ...mono, borderColor: p.rule, borderRadius: radius, background: p["paper-raised"] }}>
            <p style={{ color: p["signal-ink"] }}>$ whoami</p>
            <p className="mt-1 text-[26px] leading-none" style={display}>{name}<span style={{ color: p.signal }}>▍</span></p>
            <p className="mt-3" style={{ color: p["signal-ink"] }}>$ cat headline.txt</p>
            <p className="mt-1 line-clamp-2" style={text}>{resume.profile.headline}</p>
            <p className="mt-3" style={{ color: p["signal-ink"] }}>$ ls ./links</p>
            <div className="mt-1 flex gap-2">{cta(g.copy.heroCta)}</div>
          </div>
        </div>
      );
      break;
    case "minimal":
      body = (
        <div className="grid h-full grid-cols-[1.5fr_1fr] gap-4 p-5">
          <div className="flex flex-col justify-end">
            <p className="text-[10px]" style={{ color: muted }}>{g.copy.kicker}</p>
            <p className="mt-1 text-[30px] leading-[0.98]" style={display}>{name}</p>
            <p className="mt-2 line-clamp-2 text-[11px]">{resume.profile.headline}</p>
            <div className="mt-3">{cta(g.copy.heroCta)}</div>
          </div>
          <div className="flex flex-col justify-end gap-0 text-[9.5px]">
            <div className="mb-3 flex aspect-square items-center justify-center rounded-full border text-[34px]" style={{ ...display, borderColor: p.rule, color: p.signal }}>{initials(name)}</div>
            {[resume.experience.find((e) => e.end === null)?.orgShort, ...cred].filter(Boolean).slice(0, 3).map((t) => (
              <p key={t} className="truncate border-t py-1" style={{ borderColor: p.rule }}>{t}</p>
            ))}
          </div>
        </div>
      );
      break;
    case "poster":
      body = (
        <div className="relative h-full overflow-hidden p-5">
          <span className="relative z-[1] inline-block border-2 px-1.5 text-[9px] font-bold uppercase" style={{ ...mono, borderColor: p.ink, background: p["signal-ink"], color: p["on-signal"] }}>{g.copy.kicker}</span>
          <p className="mt-2 text-[44px] uppercase leading-[0.82]" style={display}>
            {first}
            <br />
            <span style={{ color: p["signal-ink"] }}>{last}</span>
          </p>
          <div className="absolute bottom-4 left-5 right-12 border-2 p-2 text-[11px] font-semibold leading-tight" style={{ borderColor: p.ink, background: p["paper-raised"], boxShadow: `5px 5px 0 ${p.ink}` }}>
            {resume.profile.headline}
          </div>
          <span className="absolute bottom-16 right-3 text-[56px] leading-none" style={{ ...display, color: p.signal }}>{initials(name)}</span>
        </div>
      );
      break;
    case "noir":
      body = (
        <div className="relative flex h-full flex-col items-center justify-center p-5 text-center">
          <div className="absolute inset-3 border" style={{ borderColor: `color-mix(in oklab, ${p.signal} 40%, transparent)` }} />
          <p className="text-[8px] uppercase tracking-[0.35em]" style={{ color: p["signal-ink"] }}>{g.copy.kicker}</p>
          <p className="mt-2 text-[34px] leading-[0.95]" style={display}>
            {first} <em style={{ color: p["signal-ink"] }}>{last}</em>
          </p>
          <span className="my-3 block h-px w-10" style={{ background: p.signal }} />
          <p className="max-w-[30ch] text-[11px] italic" style={{ color: muted }}>{resume.profile.headline}</p>
        </div>
      );
      break;
    case "aurora":
      body = (
        <div className="relative h-full overflow-hidden p-5 text-center">
          <span className="absolute -left-10 -top-10 h-40 w-40 rounded-full blur-2xl" style={{ background: `color-mix(in oklab, ${p.signal} 45%, transparent)` }} />
          <span className="absolute -right-8 top-0 h-36 w-36 rounded-full blur-2xl" style={{ background: `color-mix(in oklab, ${p.teal} 40%, transparent)` }} />
          <div className="relative">
            <span className="inline-block rounded-full border px-2 py-0.5 text-[9px]" style={{ borderColor: p.rule, background: `color-mix(in oklab, ${p["paper-raised"]} 70%, transparent)` }}>● {g.copy.kicker}</span>
            <p className="mt-2 text-[30px] leading-[0.95]" style={display}>{name}</p>
            <p className="mx-auto mt-1 line-clamp-2 max-w-[30ch] text-[11px] font-semibold" style={{ color: p["signal-ink"] }}>{resume.profile.headline}</p>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {k.map((m) => (
                <span key={m.label} className="border px-1 py-1.5 text-left" style={{ borderColor: p.rule, borderRadius: 10, background: `color-mix(in oklab, ${p["paper-raised"]} 75%, transparent)` }}>
                  <span className="block text-[14px] leading-none" style={display}>{formatMetric(m)}</span>
                  <span className="mt-1 block truncate text-[8px]" style={{ color: muted }}>{m.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      );
      break;
    case "paper":
      body = (
        <div className="mx-auto flex h-full max-w-[85%] flex-col p-5">
          <div className="flex justify-between border-b pb-1 text-[9px]" style={{ borderColor: p.ink, fontVariant: "small-caps" }}>
            <span>{g.copy.kicker}</span>
            <span>{resume.profile.callsign}</span>
          </div>
          <p className="mt-3 text-center text-[24px] leading-none" style={display}>{name}</p>
          <p className="mt-1 text-center text-[9.5px] italic" style={{ color: muted }}>{resume.experience.find((e) => e.end === null)?.org ?? resume.profile.currentRole}</p>
          <div className="mt-3 border-y py-2" style={{ borderColor: p.rule }}>
            <p className="text-center text-[8px] font-semibold uppercase tracking-widest">Abstract</p>
            <p className="mt-1 line-clamp-3 text-justify text-[9.5px] leading-snug">{resume.profile.headline}. {resume.profile.summary}</p>
          </div>
        </div>
      );
      break;
    default:
      body = (
        <div className="relative h-full overflow-hidden p-5" style={grid}>
          <p className="text-[9px] uppercase tracking-widest" style={{ ...mono, color: muted }}>{g.copy.kicker} · {resume.profile.callsign}</p>
          <p className="mt-5 text-[38px] leading-[0.88]" style={display}>
            {first}
            <br />
            <span className="pl-4" style={{ color: p.signal }}>{last}</span>
          </p>
          <p className="mt-2 line-clamp-2 max-w-[24ch] text-[11px]">{resume.profile.headline}</p>
          <div className="mt-3">{cta(g.copy.heroCta)}</div>
          <svg viewBox="0 0 100 100" className="absolute -right-2 top-4 h-[80%] w-[48%]" aria-hidden>
            {[[20, 20], [55, 12], [80, 30], [40, 45], [70, 60], [30, 75], [85, 85], [60, 90]].map(([x, y], i, a) => (
              <g key={i}>
                {i ? <line x1={a[i - 1]![0]} y1={a[i - 1]![1]} x2={x} y2={y} stroke={p.rule} strokeWidth="0.6" /> : null}
                <circle cx={x} cy={y} r={i % 3 ? 2 : 2.8} fill={i % 3 ? p.ink : p.signal} />
              </g>
            ))}
          </svg>
        </div>
      );
  }
  return (
    <div className={className} style={base}>
      {body}
    </div>
  );
}
