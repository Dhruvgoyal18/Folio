"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { on, emit } from "@/lib/events";
import { prefs, useReducedMotion } from "@/lib/prefs";
import { play } from "@/lib/sound";
import { tween } from "@/design/motion";
import { dateRange, kpis, formatMetric, projectsWithHighlights, firstName } from "@/lib/resume";
import type { Resume } from "@/data/schema";
import { useSite } from "@/site/SiteContext";
import { scrollToId } from "@/components/providers/SmoothScroll";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

type Line = { kind: "in" | "out" | "err"; text: string };

const roleKey = (orgShort: string) => orgShort.toLowerCase().split(/[\s·.,]+/)[0]!.replace(/[^a-z0-9]/g, "");

const help = (r: Resume) => `commands:
  whoami            who is this
  ls missions       list case files
  cat <role>        read a role: ${r.experience.map((e) => roleKey(e.orgShort)).join(" | ") || "(none)"}
  open <section>    jump: telemetry trajectory payload missions training comms
  kpis              telemetry readout
  skills            the skills section
  contact           channels
  ask <question>    hand a question to CAPCOM
  theme dark|light  switch theme
  sudo hire ${firstName(r).toLowerCase()}   …
  clear | exit`;

export function runCommand(resume: Resume, raw: string): { out: string; action?: () => void } {
  const [cmd = "", ...args] = raw.trim().split(/\s+/);
  const arg = args.join(" ");
  const p = resume.profile;
  switch (cmd.toLowerCase()) {
    case "":
      return { out: "" };
    case "help":
    case "?":
      return { out: help(resume) };
    case "whoami":
      return { out: [`${p.name} — ${p.headline}`, p.currentRole, resume.education[0] ? `${resume.education[0].degree}, ${resume.education[0].institution}` : ""].filter(Boolean).join("\n") };
    case "ls":
      if (arg.startsWith("mission") || arg === "")
        return { out: projectsWithHighlights(resume).map((x) => `${x.codename.padEnd(14)} ${x.title}`).join("\n") };
      return { out: `ls: ${arg}: no such directory (try: ls missions)` };
    case "cat": {
      const e = resume.experience.find((x) => x.id === arg || roleKey(x.orgShort) === arg.toLowerCase());
      if (!e) return { out: `cat: ${arg || "?"}: try ${resume.experience.map((x) => roleKey(x.orgShort)).join(" | ")}` };
      return {
        out: `${e.role} @ ${e.org}\n${e.type} · ${dateRange(e.start, e.end, e.yearOnly)}\n${e.groups
          .flatMap((g) => g.highlights)
          .map((h) => `  • ${h.text}`)
          .join("\n")}`,
      };
    }
    case "kpis":
      return { out: kpis(resume).map((k) => `${formatMetric(k).padStart(8)}  ${k.label}`).join("\n") };
    case "skills":
      return { out: resume.skills.filter((s) => s.listed).map((s) => s.name).join(", ") };
    case "contact":
      return { out: p.links.map((l) => `${l.kind.padEnd(9)} ${l.href.replace("mailto:", "").replace("tel:", "")}`).join("\n") };
    case "open":
    case "goto":
      return { out: `→ ${arg}`, action: () => scrollToId(arg, (window as unknown as { __lenis?: never }).__lenis ?? null) };
    case "ask":
      return arg ? { out: "→ handing over to CAPCOM…", action: () => emit("dg:capcom", { question: arg }) } : { out: "usage: ask <question>" };
    case "theme":
      if (arg === "dark" || arg === "light") return { out: `theme → ${arg}`, action: () => prefs.set({ theme: arg }) };
      return { out: "usage: theme dark|light" };
    case "sudo":
      if (arg.toLowerCase().replace(/\s+/g, " ").trim() === `hire ${firstName(resume).toLowerCase()}`)
        return p.email
          ? { out: `[sudo] permission granted.\nOpening a channel to ${p.email} …`, action: () => (window.location.href = `mailto:${p.email}?subject=${encodeURIComponent(`Let's talk — via ${p.callsign}`)}`) }
          : { out: "[sudo] permission granted. See the contact section for channels." };
      return { out: "sudo: nice try." };
    case "rm":
      return { out: "rm: the logbook is read-only." };
    default:
      return { out: `${cmd}: command not found. type 'help'` };
  }
}

function Terminal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const site = useSite();
  const [lines, setLines] = useState<Line[]>([{ kind: "out", text: `${site.resume.profile.callsign} terminal. type 'help'.` }]);
  const [value, setValue] = useState("");
  const [hist, setHist] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines]);

  const submit = () => {
    const raw = value;
    setValue("");
    setHi(-1);
    if (raw.trim()) setHist((h) => [raw, ...h].slice(0, 30));
    if (["clear", "cls"].includes(raw.trim())) return setLines([]);
    if (["exit", "quit"].includes(raw.trim())) return onOpenChange(false);
    const r = runCommand(site.resume, raw);
    play("tick");
    setLines((l) => [...l, { kind: "in", text: raw }, ...(r.out ? [{ kind: "out" as const, text: r.out }] : [])]);
    if (r.action) {
      if (/^(open|goto|ask|sudo)/.test(raw.trim())) onOpenChange(false);
      setTimeout(r.action, 60);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 bg-scrim" style={{ zIndex: "var(--z-modal)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tween("fast")} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                data-testid="terminal"
                data-lenis-prevent
                className="mono fixed left-1/2 top-1/2 flex h-[min(70svh,520px)] w-[min(94vw,760px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-paper/20 bg-[var(--c-term-bg)] text-[length:var(--fs--1)] text-[var(--c-term-ink)] shadow-overlay"
                style={{ zIndex: "var(--z-modal)" }}
                initial={{ opacity: 0, scale: 0.96, clipPath: "inset(0 0 100% 0)" }}
                animate={{ opacity: 1, scale: 1, clipPath: "inset(0 0 0% 0)" }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={tween("slow", "out")}
              >
                <div className="flex items-center justify-between border-b border-[var(--c-rule)] px-4 py-2 text-[length:var(--fs--2)] uppercase tracking-[var(--tr-caps)] opacity-60">
                  <Dialog.Title className="font-normal">{site.resume.profile.callsign.toLowerCase()} :: terminal</Dialog.Title>
                  <Dialog.Close className="rounded px-2 py-0.5 hover:opacity-100" aria-label="Close terminal">esc</Dialog.Close>
                </div>
                <div ref={scroller} className="flex-1 overflow-y-auto whitespace-pre-wrap p-4 leading-relaxed" aria-live="polite">
                  {lines.map((l, i) => (
                    <div key={i} className={l.kind === "in" ? "text-[var(--c-term-accent)]" : "text-[var(--c-term-ink)] opacity-90"}>
                      {l.kind === "in" ? `› ${l.text}` : l.text}
                    </div>
                  ))}
                </div>
                <form
                  className="flex items-center gap-2 border-t border-[var(--c-rule)] px-4 py-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                  }}
                >
                  <span aria-hidden className="text-[var(--c-term-accent)]">›</span>
                  <label htmlFor="term-input" className="sr-only">Terminal command</label>
                  <input
                    id="term-input"
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        const n = Math.min(hist.length - 1, hi + 1);
                        setHi(n);
                        setValue(hist[n] ?? "");
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        const n = Math.max(-1, hi - 1);
                        setHi(n);
                        setValue(n < 0 ? "" : (hist[n] ?? ""));
                      }
                    }}
                    className="flex-1 bg-transparent text-[var(--c-term-ink)] caret-[var(--c-term-accent)] outline-none"
                    placeholder="help"
                  />
                </form>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/** Ink-particle "launch" burst for the Konami code (canvas 2D, ~1.2s, skipped under reduced motion). */
function Launch({ go }: { go: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!go) return;
    if (reduced) return;
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const dpr = Math.min(devicePixelRatio, 2);
    c.width = innerWidth * dpr;
    c.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const s = getComputedStyle(document.documentElement);
    const colors = [s.getPropertyValue("--c-signal").trim(), s.getPropertyValue("--c-ink").trim(), s.getPropertyValue("--c-teal").trim()];
    const parts = Array.from({ length: 160 }, (_, i) => ({
      x: innerWidth / 2,
      y: innerHeight + 10,
      vx: (Math.random() - 0.5) * 9,
      vy: -(9 + Math.random() * 12),
      r: 1.5 + Math.random() * 3.5,
      c: colors[i % 3]!,
    }));
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = (t - t0) / 1400;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of parts) {
        p.vy += 0.28;
        p.x += p.vx;
        p.y += p.vy;
        ctx.globalAlpha = Math.max(0, 1 - k);
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (k < 1) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [go, reduced]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 h-full w-full" style={{ zIndex: "var(--z-cursor)" }} />;
}

export default function EasterEggs() {
  const [term, setTerm] = useState(false);
  const [launch, setLaunch] = useState(0);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    let buf: string[] = [];
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.matches("input, textarea, [contenteditable=true]");
      if (!typing && (e.key === "`" || e.key === "~")) {
        e.preventDefault();
        setTerm((v) => !v);
        return;
      }
      buf = [...buf, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-KONAMI.length);
      if (buf.join() === KONAMI.join()) {
        buf = [];
        play("launch");
        setAnnounce("Konami code accepted. Launch sequence and terminal opened.");
        setLaunch((n) => n + 1);
        setTimeout(() => setTerm(true), 600);
      }
    };
    window.addEventListener("keydown", key);
    document.documentElement.dataset.eggs = "ready";
    const off1 = on("dg:terminal", () => setTerm(true));
    const off2 = on("dg:launch", () => setLaunch((n) => n + 1));
    return () => {
      window.removeEventListener("keydown", key);
      off1();
      off2();
    };
  }, []);

  return (
    <>
      <Launch go={launch} />
      <Terminal open={term} onOpenChange={setTerm} />
      <p className="sr-only" aria-live="polite">{announce}</p>
    </>
  );
}
