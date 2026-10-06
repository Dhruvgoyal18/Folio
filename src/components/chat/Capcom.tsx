"use client";

import { CONCEPT_DEFS } from "@/genome/concepts";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat, type Msg } from "./useChat";
import { on } from "@/lib/events";
import { useReducedMotion } from "@/lib/prefs";
import { play } from "@/lib/sound";
import { useSite } from "@/site/SiteContext";
import type { SiteModel } from "@/site/model";
import { scrollToId } from "@/components/providers/SmoothScroll";
import { Close, Collapse, Expand, Reticle, Send } from "@/components/ui/icons";
import { spring, stagger, tween, reducedTransition } from "@/design/motion";
import { cn } from "@/lib/cn";

/** Starter questions written from this resume's own facts. */
function starters(site: SiteModel): string[] {
  const f = site.first;
  const out: string[] = [];
  if (site.current) out.push(`What does ${f} do at ${site.current.orgShort}?`);
  else if (site.resume.experience[0]) out.push(`What was ${f}'s most recent role?`);
  if (site.kpis.length) out.push(`What are ${f}'s strongest measurable results?`);
  if (site.projects[0]) out.push(`Tell me about the ${site.projects[0].title} work.`);
  if (site.resume.education[0]) out.push(`Where did ${f} study?`);
  if (site.resume.skills.length) out.push(`Which skills does ${f} use most?`);
  if (site.resume.competitions.length + site.resume.awards.length) out.push(`Has ${f} won any awards?`);
  out.push(`How can I contact ${f}?`);
  return out.slice(0, 6);
}

const MAX = 500;

function glow(id: string, reduced: boolean) {
  const lenis = (window as unknown as { __lenis?: Parameters<typeof scrollToId>[1] }).__lenis ?? null;
  const el = scrollToId(id, lenis);
  if (!el) return;
  const cls = reduced ? "cite-mark" : "cite-glow";
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 2600);
}

function Typing({ assistant }: { assistant: string }) {
  return (
    <div className="flex items-center gap-3 py-1" role="status" aria-label={`${assistant} is composing an answer`}>
      <span className="relative block h-6 w-6" aria-hidden>
        <span className="absolute inset-0 rounded-full border border-signal/40" />
        <span className="absolute inset-0 animate-[spin_var(--loop-spin)_linear_infinite] rounded-full border-2 border-transparent border-t-signal" />
        <span className="absolute inset-[9px] rounded-full bg-signal" />
      </span>
      <span className="mono text-[length:var(--fs--2)] uppercase tracking-[var(--tr-caps)] text-ink-muted">Checking the logbook…</span>
    </div>
  );
}

function Bubble({ m, onCite, reduced }: { m: Msg; onCite: (id: string) => void; reduced: boolean }) {
  const site = useSite();
  const TARGETS = new Map(site.cites.map((t) => [t.id, t]));
  const assistant = site.genome.copy.assistant;
  if (m.role === "user") {
    return (
      <motion.div
        layout={!reduced ? "position" : false}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring.gentle}
        className="ml-auto max-w-[85%] rounded-lg rounded-br-xs bg-ink px-4 py-2.5 text-[length:var(--fs--1)] text-paper"
      >
        {m.content}
      </motion.div>
    );
  }
  const waiting = m.status === "streaming" && !m.content;
  return (
    <motion.div layout={!reduced ? "position" : false} className="max-w-[92%]" data-testid="assistant-message" data-mode={m.mode ?? ""} data-status={m.status}>
      <div className="mb-1 flex items-center gap-2">
        <span className="mono text-[length:var(--fs--2)] uppercase tracking-[var(--tr-caps)] text-signal-ink">{assistant}</span>
        {m.mode === "retrieval" ? (
          <span className="mono rounded-pill border border-rule px-1.5 text-[length:var(--fs--2)] text-ink-muted" title="No live model: quoting the resume directly">offline · quotes</span>
        ) : null}
      </div>
      {waiting ? (
        <Typing assistant={assistant} />
      ) : (
        <div className={cn("whitespace-pre-wrap text-[length:var(--fs--1)] leading-[var(--lh-relaxed)]", m.status === "error" && "text-signal-ink")}>
          {reduced || !m.chunks?.length
            ? m.content
            : m.chunks.map((c, i) => (
                <motion.span key={i} initial={{ opacity: 0, filter: "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} transition={tween("slow", "out")}>
                  {c}
                </motion.span>
              ))}
          {m.status === "streaming" ? <span aria-hidden className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-signal" /> : null}
        </div>
      )}
      {m.cites?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Sources">
          {m.cites.map((id, i) => {
            const t = TARGETS.get(id);
            if (!t) return null;
            return (
              <motion.button
                type="button"
                key={id}
                onClick={() => onCite(id)}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...spring.snappy, delay: reduced ? 0 : i * stagger.item }}
                className="mono inline-flex items-center gap-1.5 rounded-pill border border-signal px-2.5 py-1 text-[length:var(--fs--2)] text-signal-ink hover:bg-signal-ink hover:text-on-signal"
                data-testid="source-chip"
                data-cite={id}
              >
                <span aria-hidden>↗</span> {t.label}
              </motion.button>
            );
          })}
        </div>
      ) : null}
    </motion.div>
  );
}


export default function Capcom() {
  const site = useSite();
  const assistant = site.genome.copy.assistant;
  const STARTERS = starters(site);
  const { messages, busy, send, reset } = useChat(site.slug, `${assistant} lost signal. Please try again.`);
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const orbRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const pending = useRef<string | null>(null);

  const openPanel = useCallback((q?: string) => {
    setOpen(true);
    play("open");
    if (q) pending.current = q;
  }, []);

  useEffect(() => on("dg:capcom", (d) => openPanel(d?.question)), [openPanel]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    if (pending.current) {
      const q = pending.current;
      pending.current = null;
      void send(q);
    }
    return () => clearTimeout(t);
  }, [open, send]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [messages, reduced]);

  useEffect(() => {
    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis;
    if (open && full) lenis?.stop();
    else lenis?.start();
  }, [open, full]);

  const close = () => {
    setOpen(false);
    setFull(false);
    play("close");
    setTimeout(() => orbRef.current?.focus(), 50);
  };

  const submit = () => {
    if (!text.trim() || busy) return;
    void send(text.slice(0, MAX));
    setText("");
  };

  const onCite = (id: string) => {
    if (full || window.innerWidth < 768) {
      setFull(false);
      setOpen(false);
    }
    setTimeout(() => glow(id, reduced), 80);
  };

  const shell = useMemo(
    () =>
      full
        ? "fixed inset-2 sm:inset-6 rounded-xl"
        : "fixed bottom-3 right-3 left-3 sm:left-auto sm:bottom-6 sm:right-6 h-[min(640px,calc(100svh-5.5rem))] sm:w-[420px] rounded-xl",
    [full],
  );

  return (
    <LayoutGroup id="capcom">
      <AnimatePresence initial={false}>
        {!open ? (
          <motion.button
            key="orb"
            ref={orbRef}
            type="button"
            layoutId={reduced ? undefined : "capcom-shell"}
            onClick={() => openPanel()}
            aria-label={`Ask ${assistant} — chat about ${site.first}'s resume`}
            data-testid="capcom-orb"
            data-cursor-label="Ask"
            className="group fixed bottom-5 right-5 flex h-14 items-center gap-3 rounded-pill bg-ink pl-3.5 pr-5 text-paper shadow-lifted max-sm:h-12 max-sm:w-12 max-sm:justify-center max-sm:p-0 sm:bottom-6 sm:right-6"
            style={{ zIndex: "var(--z-orb)", borderRadius: 999 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            whileHover={reduced ? undefined : { scale: 1.04 }}
            whileTap={reduced ? undefined : { scale: 0.96 }}
            transition={spring.gentle}
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-signal text-on-signal">
              <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-signal opacity-40" />
              <Reticle size={18} />
            </span>
            <span className="mono text-[length:var(--fs--1)] font-medium max-sm:hidden">Ask {assistant}</span>
          </motion.button>
        ) : (
          <motion.div
            key="panel"
            layoutId={reduced ? undefined : "capcom-shell"}
            role="dialog"
            aria-modal={full ? "true" : "false"}
            aria-labelledby="capcom-title"
            data-testid="capcom-panel"
            data-lenis-prevent
            className={cn("vellum flex flex-col overflow-hidden border border-ink/80 shadow-overlay", shell)}
            style={{ zIndex: full ? "var(--z-modal)" : "var(--z-orb)", borderRadius: 18 }}
            transition={reduced ? reducedTransition : spring.gentle}
            initial={reduced ? { opacity: 0 } : undefined}
            animate={reduced ? { opacity: 1 } : undefined}
            exit={reduced ? { opacity: 0 } : undefined}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
            }}
          >
            <motion.header layout="position" className="flex items-center gap-3 border-b border-rule px-4 py-3">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-signal text-on-signal" aria-hidden>
                <Reticle size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="capcom-title" className="mono text-[length:var(--fs--1)] font-medium tracking-normal">{assistant}</h2>
                <p className="truncate text-[length:var(--fs--2)] text-ink-muted">Answers only from {site.first}’s resume</p>
              </div>
              {messages.length ? (
                <button type="button" onClick={reset} className="mono rounded-pill px-2 py-1 text-[length:var(--fs--2)] uppercase text-ink-muted hover:text-ink">
                  Clear
                </button>
              ) : null}
              <button type="button" onClick={() => setFull((f) => !f)} aria-label={full ? "Exit full screen" : "Full screen"} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink/10" data-testid="capcom-fullscreen">
                {full ? <Collapse /> : <Expand />}
              </button>
              <button type="button" onClick={close} aria-label="Close chat" className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink/10" data-testid="capcom-close">
                <Close />
              </button>
            </motion.header>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={tween("base", "out", reduced ? 0 : 0.12)}
              ref={logRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              className={cn("flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5", full && "mx-auto w-full max-w-3xl")}
            >
              {!messages.length ? (
                <div>
                  <p className="display text-[length:var(--fs-2)] font-semibold leading-[var(--lh-snug)]">{CONCEPT_DEFS[site.genome.concept].greeting} What would you like to know about {site.first}?</p>
                  <p className="mt-2 text-[length:var(--fs--1)] text-ink-muted">
                    I answer from the resume only, cite the section I used, and say so when something isn’t in it.
                  </p>
                  <ul className="mt-5 flex flex-wrap gap-2" aria-label="Suggested questions">
                    {STARTERS.map((q, i) => (
                      <motion.li key={q} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={tween("base", "out", 0.15 + i * stagger.word)}>
                        <button
                          type="button"
                          onClick={() => void send(q)}
                          className="rounded-pill border border-rule bg-paper/60 px-3 py-1.5 text-left text-[length:var(--fs--1)] hover:border-ink"
                          data-testid="starter"
                        >
                          {q}
                        </button>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              ) : (
                messages.map((m) => <Bubble key={m.id} m={m} onCite={onCite} reduced={reduced} />)
              )}
            </motion.div>

            <form
              className={cn("border-t border-rule p-3", full && "mx-auto w-full max-w-3xl")}
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <div className="flex items-end gap-2 rounded-lg border border-rule bg-paper px-3 py-2 focus-within:border-ink">
                <label htmlFor="capcom-input" className="sr-only">Ask about {site.first}’s background</label>
                <textarea
                  id="capcom-input"
                  ref={inputRef}
                  rows={1}
                  value={text}
                  maxLength={MAX}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="Ask about roles, projects, skills…"
                  className="max-h-32 min-h-[1.5rem] flex-1 resize-none bg-transparent text-[length:var(--fs--1)] outline-none placeholder:text-ink-muted"
                  data-testid="capcom-input"
                />
                <motion.button
                  type="submit"
                  disabled={!text.trim() || busy}
                  aria-label="Send question"
                  whileTap={reduced ? undefined : { scale: 0.9 }}
                  transition={spring.snappy}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal-ink text-on-signal disabled:opacity-40"
                  data-testid="capcom-send"
                >
                  <Send size={16} />
                </motion.button>
              </div>
              <p className="mono mt-1.5 flex justify-between text-[length:var(--fs--2)] text-ink-muted">
                <span>Enter to send · Shift+Enter for a new line</span>
                <span aria-live="off">{text.length}/{MAX}</span>
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}
