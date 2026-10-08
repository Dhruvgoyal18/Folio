"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { Draft } from "@/extract/draft";
import { generateGenome } from "@/genome/generate";
import { CONCEPTS, LOCKABLE, type Genome, type LockKey } from "@/genome/schema";
import { CONCEPT_DEFS } from "@/genome/concepts";
import { computeSkillGraph } from "@/lib/skill-graph";
import type { SiteData } from "@/site/model";
import { loadForEdit } from "./client";
import { applyCustom, EMPTY_CUSTOM, type Custom } from "@/lib/customize";
import { rememberEditToken } from "@/lib/owner";
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
  const [custom, setCustom] = useState<Custom>(EMPTY_CUSTOM);
  const [past, setPast] = useState<Genome[]>([]);
  const [locks, setLocks] = useState<LockKey[]>([]);
  const [edit, setEdit] = useState<{ slug: string; token: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const heading = useRef<HTMLDivElement>(null);
  // /create?template=<concept>[&seed=<n>] — started from the template gallery: the first design uses that template
  const template = useRef<{ concept: Genome["concept"]; seed?: number } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const t = q.get("template");
    if (t && (CONCEPTS as readonly string[]).includes(t)) {
      const seed = Number(q.get("seed"));
      template.current = { concept: t as Genome["concept"], ...(Number.isFinite(seed) && seed > 0 ? { seed } : {}) };
      setTemplateLabel(CONCEPT_DEFS[t as Genome["concept"]].label);
    }
  }, []);
  const [templateLabel, setTemplateLabel] = useState<string | null>(null);

  // Undo / redo for content edits. Typing is coalesced (one step per pause); adding, removing and
  // moving entries are always their own step, so "Undo" reverses exactly what the owner expects.
  const hist = useRef<{ past: Draft[]; future: Draft[]; at: number }>({ past: [], future: [], at: 0 });
  const [, bumpHist] = useState(0);
  const editDraft = (next: Draft, structural = false) => {
    const h = hist.current;
    const now = Date.now();
    if (draft && (structural || now - h.at > 800)) h.past = [...h.past.slice(-49), draft];
    h.future = [];
    h.at = structural ? 0 : now;
    setDraft(next);
    bumpHist((v) => v + 1);
  };
  const undoDraft = () => {
    const h = hist.current;
    const prev = h.past[h.past.length - 1];
    if (!prev || !draft) return;
    h.past = h.past.slice(0, -1);
    h.future = [...h.future, draft];
    h.at = 0;
    setDraft(prev);
    bumpHist((v) => v + 1);
  };
  const redoDraft = () => {
    const h = hist.current;
    const next = h.future[h.future.length - 1];
    if (!next || !draft) return;
    h.future = h.future.slice(0, -1);
    h.past = [...h.past, draft];
    h.at = 0;
    setDraft(next);
    bumpHist((v) => v + 1);
  };

  // Work in progress survives a reload (this tab only). Restored once, saved on every change.
  const SAVE_KEY = "folio.studio";
  useEffect(() => {
    if (new URLSearchParams(location.search).get("edit")) return;
    try {
      const raw = sessionStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as { step: Step; draft: Draft | null; meta: typeof meta; genome: Genome | null; locks: LockKey[]; custom?: Custom };
        if (s.draft) {
          const fromTemplate = new URLSearchParams(location.search).has("template");
          setDraft(s.draft);
          setMeta(s.meta ?? { unplaced: [] });
          // arriving from the template gallery with work in progress: keep the content, redesign with the template
          setGenome(fromTemplate ? null : s.genome);
          if (fromTemplate && (s.step === "design" || s.step === "publish")) s.step = "review";
          setLocks(s.locks ?? []);
          setCustom(s.custom ?? EMPTY_CUSTOM);
          setStep(s.step === "upload" ? "review" : s.step);
        }
      }
    } catch {}
    setBooting(false);
  }, []);
  useEffect(() => {
    if (booting || edit) return;
    try {
      if (draft) sessionStorage.setItem(SAVE_KEY, JSON.stringify({ step, draft, meta, genome, locks, custom }));
    } catch {}
  }, [booting, edit, step, draft, meta, genome, locks, custom]);

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
        rememberEditToken(slug, token);
        setDraft(r.draft);
        setGenome(r.genome);
        setCustom(r.custom ?? EMPTY_CUSTOM);
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
    // owner-written wording is never regenerated
    if (!first && genome && !custom.keepWording) setGenome(generateGenome(resume, { seed: genome.seed, previous: genome, locks: LOCKABLE.filter((k) => k !== "copy"), concept: genome.concept }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeKey]);

  // owner choices (featured numbers, case files) applied on top — exactly what the server will store
  const shown = useMemo(() => (resume ? applyCustom(resume, custom) : null), [resume, custom]);
  const shownGraph = useMemo(() => (shown && shown !== resume ? computeSkillGraph(shown) : graph), [shown, resume, graph]);
  const site: SiteData | null = shown && genome && shownGraph ? { slug: edit?.slug ?? "preview", resume: shown, genome, graph: shownGraph, custom } : null;
  const editCopy = (copy: Genome["copy"]) => {
    if (!genome) return;
    setPast((p) => [...p.slice(-19), genome]);
    setGenome({ ...genome, copy });
    if (!custom.keepWording) setCustom((c) => ({ ...c, keepWording: true }));
    if (!locks.includes("copy")) setLocks((l) => [...l, "copy"]);
  };

  const toDesign = () => {
    if (!resume) return;
    if (!genome) setGenome(generateGenome(resume, { seed: template.current?.seed ?? randomSeed(), concept: template.current?.concept }));
    setStep("design");
  };

  const remix = (o: { concept?: Genome["concept"]; energy?: number; theme?: "light" | "dark" } = {}) => {
    if (!resume || !genome) return;
    let next: Genome;
    if (o.theme) next = { ...genome, defaultTheme: o.theme };
    else if (o.energy !== undefined) next = generateGenome(resume, { seed: genome.seed, previous: genome, locks: LOCKABLE.filter((k) => k !== "motion"), concept: genome.concept, energy: o.energy, theme: genome.defaultTheme });
    else if (o.concept) next = generateGenome(resume, { seed: genome.seed, concept: o.concept, previous: genome, locks: locks.filter((k) => k !== "concept") });
    else next = generateGenome(resume, { seed: randomSeed(), previous: genome, locks });
    // the owner's own wording survives every remix, even into another template (only the chapter
    // numbering style follows the new template)
    if (custom.keepWording) next = { ...next, copy: { ...genome.copy, codeStyle: next.copy.codeStyle } };
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
    setCustom(EMPTY_CUSTOM);
    hist.current = { past: [], future: [], at: 0 };
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
                        "step-btn flex h-7 items-center gap-1.5 rounded-pill px-2.5 text-[length:var(--fs--1)] transition-colors sm:px-3",
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
        {!booting && templateLabel && (step === "upload" || step === "review") ? (
          <p className="mb-5 inline-flex items-center gap-2 rounded-pill border border-rule bg-paper-raised px-3 py-1.5 text-[length:var(--fs--1)]" data-testid="template-banner">
            <span className="inline-block h-2 w-2 rounded-full bg-signal" /> Template: <strong className="font-semibold">{templateLabel}</strong>
            <span className="text-ink-muted">— your site starts with this design. You can still change it.</span>
          </p>
        ) : null}
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
        {!booting && step === "review" && draft && check ? <ReviewStep draft={draft} onChange={editDraft} history={{ undo: undoDraft, redo: redoDraft, canUndo: hist.current.past.length > 0, canRedo: hist.current.future.length > 0 }} unplaced={meta.unplaced} onUnplaced={(u) => setMeta((m) => ({ ...m, unplaced: u }))} check={check} mode={meta.mode} source={meta.source} onNext={toDesign} /> : null}
        {!booting && step === "design" && site ? (
          <DesignStep site={site} rawResume={resume!} custom={custom} onCustom={setCustom} onCopy={editCopy} locks={locks} onLocks={setLocks} onRemix={remix} onBack={() => setStep("review")} onNext={() => setStep("publish")} history={{ canUndo: past.length > 0, undo }} />
        ) : null}
        {!booting && step === "design" && !site ? <p aria-busy="true" className="text-ink-muted">Preparing your design…</p> : null}
        {!booting && step === "publish" && tidied && genome ? (
          <PublishStep
            draft={tidied}
            genome={genome}
            custom={custom}
            edit={edit ?? undefined}
            onBack={() => setStep("design")}
            onPublished={(p) => {
              // from now on this tab edits the published site (saving updates it instead of publishing a copy)
              if (p.token) {
                setEdit({ slug: p.slug, token: p.token });
                rememberEditToken(p.slug, p.token);
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
