"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { Draft } from "@/extract/draft";
import { generateGenome } from "@/genome/generate";
import { LOCKABLE, type Genome, type LockKey } from "@/genome/schema";
import { computeSkillGraph } from "@/lib/skill-graph";
import type { SiteData } from "@/site/model";
import { loadForEdit } from "./client";
import { STEPS, tidy, tryNormalize, type Step } from "./model";
import { UploadStep } from "./UploadStep";
import { ReviewStep } from "./ReviewStep";
import { DesignStep } from "./DesignStep";
import { PublishStep } from "./PublishStep";
import { cn } from "@/lib/cn";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";

const randomSeed = () => {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return b[0]! % 2 ** 31;
};

export function CreateApp() {
  const [step, setStep] = useState<Step>("upload");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [meta, setMeta] = useState<{ unplaced: string[]; mode?: "llm" | "rules"; source?: string }>({ unplaced: [] });
  const [genome, setGenome] = useState<Genome | null>(null);
  const [past, setPast] = useState<Genome[]>([]);
  const [locks, setLocks] = useState<LockKey[]>([]);
  const [edit, setEdit] = useState<{ slug: string; token: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const heading = useRef<HTMLDivElement>(null);

  // Work in progress survives a reload (this tab only). Restored once, saved on every change.
  const SAVE_KEY = "folio.studio";
  useEffect(() => {
    if (new URLSearchParams(location.search).get("edit")) return;
    try {
      const raw = sessionStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as { step: Step; draft: Draft | null; meta: typeof meta; genome: Genome | null; locks: LockKey[] };
        if (s.draft) {
          setDraft(s.draft);
          setMeta(s.meta ?? { unplaced: [] });
          setGenome(s.genome);
          setLocks(s.locks ?? []);
          setStep(s.step === "upload" ? "review" : s.step);
        }
      }
    } catch {}
    setBooting(false);
  }, []);
  useEffect(() => {
    if (booting || edit) return;
    try {
      if (draft) sessionStorage.setItem(SAVE_KEY, JSON.stringify({ step, draft, meta, genome, locks }));
    } catch {}
  }, [booting, edit, step, draft, meta, genome, locks]);

  // edit mode: /create?edit=<slug>#token=<token>
  useEffect(() => {
    const slug = new URLSearchParams(location.search).get("edit");
    const token = new URLSearchParams(location.hash.slice(1)).get("token");
    if (!slug) return;
    // a different edit link pasted into the same tab only changes the hash — reload to use it
    const onHash = () => location.reload();
    window.addEventListener("hashchange", onHash);
    if (!token) return void setLoadError("This edit link is missing its token. Use the full link you saved when you published.");
    loadForEdit(slug, token)
      .then((r) => {
        setEdit({ slug, token });
        setDraft(r.draft);
        setGenome(r.genome);
        setStep("design");
      })
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setBooting(false));
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // move focus to the step heading on step change (keyboard and screen-reader users)
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    window.scrollTo({ top: 0 });
    const h = heading.current?.querySelector<HTMLElement>("h1");
    if (h) {
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
    }
  }, [step]);

  const deferred = useDeferredValue(draft);
  const tidied = useMemo(() => (deferred ? tidy(deferred) : null), [deferred]);
  const check = useMemo(() => (tidied ? tryNormalize(tidied) : null), [tidied]);
  const resume = check?.ok ? check.resume : null;
  const graph = useMemo(() => (resume ? computeSkillGraph(resume) : null), [resume]);

  // keep the genome's wording in sync with content changes (counts, first name) without touching the look
  const resumeKey = resume ? JSON.stringify([resume.profile.name, resume.experience.length, resume.skills.length, resume.projects.length]) : "";
  const lastKey = useRef(resumeKey);
  useEffect(() => {
    if (!resume || resumeKey === lastKey.current) return;
    const first = lastKey.current === "";
    lastKey.current = resumeKey;
    if (!first && genome) setGenome(generateGenome(resume, { seed: genome.seed, previous: genome, locks: LOCKABLE.filter((k) => k !== "copy"), concept: genome.concept }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeKey]);

  const site: SiteData | null = resume && genome && graph ? { slug: edit?.slug ?? "preview", resume, genome, graph } : null;

  const toDesign = () => {
    if (!resume) return;
    if (!genome) setGenome(generateGenome(resume, { seed: randomSeed() }));
    setStep("design");
  };

  const remix = (o: { concept?: Genome["concept"]; energy?: number; theme?: "light" | "dark" } = {}) => {
    if (!resume || !genome) return;
    let next: Genome;
    if (o.theme) next = { ...genome, defaultTheme: o.theme };
    else if (o.energy !== undefined) next = generateGenome(resume, { seed: genome.seed, previous: genome, locks: LOCKABLE.filter((k) => k !== "motion"), concept: genome.concept, energy: o.energy, theme: genome.defaultTheme });
    else if (o.concept) next = generateGenome(resume, { seed: genome.seed, concept: o.concept, previous: genome, locks: locks.filter((k) => k !== "concept") });
    else next = generateGenome(resume, { seed: randomSeed(), previous: genome, locks });
    setPast((p) => [...p.slice(-19), genome]);
    setGenome(next);
  };
  const undo = () => {
    const prev = past[past.length - 1];
    if (!prev) return;
    setPast((p) => p.slice(0, -1));
    setGenome(prev);
  };

  const reachable = (s: Step) => (s === "upload" ? !edit : s === "review" ? !!draft : s === "design" ? !!resume : !!resume && !!genome);

  const startOver = () => {
    try {
      sessionStorage.removeItem(SAVE_KEY);
    } catch {}
    setDraft(null);
    setGenome(null);
    setPast([]);
    setLocks([]);
    setMeta({ unplaced: [] });
    setStep("upload");
  };

  if (loadError)
    return (
      <main id="main" className="app mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-3 px-6">
        <p className="kicker">Edit link</p>
        <h1 className="display text-[length:var(--fs-3)]">Couldn't open that site for editing</h1>
        <p className="text-ink-muted" role="alert">
          {loadError}
        </p>
        <Link href="/create" className="btn btn-outline mt-2 self-start no-underline">
          Start a new site instead
        </Link>
      </main>
    );

  return (
    <div className="app min-h-dvh">
      <header className="sticky top-0 border-b border-rule bg-vellum backdrop-blur" style={{ zIndex: "var(--z-nav)" }}>
        <div className="mx-auto grid h-14 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-[var(--sp-gutter)]">
          <Link href="/" className="display justify-self-start text-[length:var(--fs-1)] no-underline">
            Folio<span className="text-signal-ink">.</span>
          </Link>
          <nav aria-label="Steps">
            <ol className="flex items-center gap-0.5 rounded-pill border border-rule bg-paper-raised p-0.5" role="list">
              {STEPS.map((s, i) => {
                const active = s.id === step;
                const can = reachable(s.id) && !active;
                const done = STEPS.findIndex((x) => x.id === step) > i;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      disabled={!can}
                      aria-current={active ? "step" : undefined}
                      onClick={() => (s.id === "design" ? toDesign() : setStep(s.id))}
                      className={cn(
                        "flex h-7 items-center gap-1.5 rounded-pill px-2.5 text-[length:var(--fs--1)] transition-colors sm:px-3",
                        active ? "bg-ink text-paper" : can ? "text-ink hover:bg-ink/[0.06]" : "text-ink-muted",
                      )}
                    >
                      <span aria-hidden="true" className={cn("mono text-[length:var(--fs--2)]", active ? "opacity-70" : "opacity-60")}>
                        {done ? "✓" : i + 1}
                      </span>
                      <span className="max-sm:sr-only">{s.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="flex items-center gap-2 justify-self-end">
            <span className="mono hidden text-[length:var(--fs--2)] text-ink-muted lg:inline" title={`build ${process.env.NEXT_PUBLIC_BUILD}`}>
              {edit ? `editing /u/${edit.slug}` : draft ? "draft saved in this tab" : "new site"}
            </span>
            {draft && !edit ? (
              <button type="button" className="btn btn-sm btn-ghost max-sm:hidden" onClick={startOver}>
                Start over
              </button>
            ) : null}
            <ThemeSwitch />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1440px] px-[var(--sp-gutter)] py-8 sm:py-10" ref={heading} data-step={step}>
        {booting ? <p aria-busy="true" className="text-ink-muted">Loading…</p> : null}
        {!booting && step === "upload" ? (
          <UploadStep
            onDone={(r) => {
              setDraft(r.draft);
              setMeta({ unplaced: r.unplaced, mode: r.mode, source: r.source });
              setGenome(null);
              setStep("review");
            }}
          />
        ) : null}
        {!booting && step === "review" && draft && check ? <ReviewStep draft={draft} onChange={setDraft} unplaced={meta.unplaced} onUnplaced={(u) => setMeta((m) => ({ ...m, unplaced: u }))} check={check} mode={meta.mode} source={meta.source} onNext={toDesign} /> : null}
        {!booting && step === "design" && site ? (
          <DesignStep site={site} locks={locks} onLocks={setLocks} onRemix={remix} onBack={() => setStep("review")} onNext={() => setStep("publish")} history={{ canUndo: past.length > 0, undo }} />
        ) : null}
        {!booting && step === "design" && !site ? <p aria-busy="true" className="text-ink-muted">Preparing your design…</p> : null}
        {!booting && step === "publish" && tidied && genome ? (
          <PublishStep
            draft={tidied}
            genome={genome}
            edit={edit ?? undefined}
            onBack={() => setStep("design")}
            onPublished={(p) => {
              // from now on this tab edits the published site (saving updates it instead of publishing a copy)
              if (p.token) {
                setEdit({ slug: p.slug, token: p.token });
                try {
                  sessionStorage.removeItem(SAVE_KEY);
                } catch {}
                history.replaceState(null, "", `/create?edit=${p.slug}#token=${p.token}`);
              }
            }}
          />
        ) : null}
      </main>
    </div>
  );
}
