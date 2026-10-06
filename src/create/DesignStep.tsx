"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import type { Genome, LockKey } from "@/genome/schema";
import { CONCEPTS, LOCKABLE } from "@/genome/schema";
import { CONCEPT_DEFS } from "@/genome/concepts";
import { templateSwatches } from "@/genome/templates";
import { PAIRINGS } from "@/genome/fonts";
import type { SiteData } from "@/site/model";
import type { PreviewMessage } from "@/site/SiteShell";
import { cn } from "@/lib/cn";

const LOCK_LABEL: Record<LockKey, string> = {
  concept: "Concept",
  palette: "Colours",
  fonts: "Typefaces",
  hero: "Hero visual",
  layout: "Layout",
  motion: "Motion",
  copy: "Wording",
};
const ENERGY: Record<Genome["motion"], number> = { calm: 0.15, snappy: 0.5, cinematic: 0.85 };

type Props = {
  site: SiteData;
  locks: LockKey[];
  onLocks: (l: LockKey[]) => void;
  onRemix: (o?: { concept?: Genome["concept"]; energy?: number; theme?: "light" | "dark" }) => void;
  onBack: () => void;
  onNext: () => void;
  history: { canUndo: boolean; undo: () => void };
};

/** Static swatches for the picker (the real palette is generated per seed). */
const SWATCH = templateSwatches();

export function DesignStep({ site, locks, onLocks, onRemix, onBack, onNext, history }: Props) {
  const g = site.genome;
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const post = useCallback(() => {
    const w = frame.current?.contentWindow;
    if (w) w.postMessage({ type: "folio:site", site } satisfies PreviewMessage, location.origin);
  }, [site]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin === location.origin && e.source === frame.current?.contentWindow && (e.data as { type?: string })?.type === "folio:ready") {
        setReady(true);
        post();
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [post]);
  useEffect(() => {
    if (ready) post();
  }, [ready, post]);

  const toggleLock = (k: LockKey) => onLocks(locks.includes(k) ? locks.filter((x) => x !== k) : [...locks, k]);

  // Scale the preview so "Desktop" shows a real 1366px-wide layout and "Mobile" a 390px phone, whatever the pane size.
  const pane = useRef<HTMLDivElement>(null);
  const [paneSize, setPaneSize] = useState({ w: 900, h: 600 });
  useEffect(() => {
    const el = pane.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPaneSize({ w: e!.contentRect.width, h: e!.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const logicalW = device === "desktop" ? 1366 : 390;
  const scale = Math.min(1, (paneSize.w - (device === "mobile" ? 32 : 0)) / logicalW);
  const frameH = device === "desktop" ? paneSize.h / scale : Math.min(844, (paneSize.h - 32) / scale);
  const [tab, setTab] = useState<"controls" | "preview">("controls");

  return (
    <div className="flex flex-col gap-4 lg:grid lg:h-[calc(100dvh-8.5rem)] lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6">
      {/* phones: switch between controls and preview */}
      <div className="flex gap-1 self-start rounded-pill border border-rule bg-paper-raised p-0.5 lg:hidden" role="tablist" aria-label="Design view">
        {(["controls", "preview"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("h-7 rounded-pill px-3 text-[length:var(--fs--1)] capitalize", tab === t ? "bg-ink text-paper" : "text-ink-muted")}>
            {t}
          </button>
        ))}
      </div>

      <div className={cn("flex min-h-0 flex-col gap-5 lg:overflow-y-auto lg:pr-1", tab === "preview" && "max-lg:hidden")}>
        <header>
          <p className="kicker">Step 3 of 4</p>
          <h1 className="display mt-2 text-[length:var(--fs-3)] leading-tight">Design your site</h1>
          <p className="mt-1.5 text-[length:var(--fs--1)] text-ink-muted">Remix until it feels like you. Locked parts stay put.</p>
        </header>

        <fieldset className="flex flex-col gap-2">
          <legend className="label mb-2 flex w-full items-center justify-between">
            Template <a href="/templates" target="_blank" rel="noreferrer" className="text-[length:var(--fs--2)] font-normal text-ink-muted underline underline-offset-2 hover:text-ink">Browse all</a>
          </legend>
          <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Template">
            {CONCEPTS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={g.concept === c}
                title={CONCEPT_DEFS[c].blurb}
                onClick={() => g.concept !== c && onRemix({ concept: c })}
                className={cn("flex items-start gap-2 rounded-md border px-2.5 py-2 text-left transition-colors", g.concept === c ? "border-ink bg-paper-raised shadow-[inset_3px_0_0_var(--c-signal-ink)]" : "border-rule hover:border-ink/50")}
                data-testid={`concept-${c}`}
              >
                <span aria-hidden className="mt-0.5 flex shrink-0 overflow-hidden rounded-full border border-rule">
                  {SWATCH[c].map((col) => (
                    <span key={col} className="block h-3.5 w-2" style={{ background: col }} />
                  ))}
                </span>
                <span className="min-w-0">
                  <span className="block text-[length:var(--fs--1)] font-medium leading-tight">{CONCEPT_DEFS[c].label}</span>
                  <span className="block truncate text-[length:var(--fs--2)] leading-snug text-ink-muted">{CONCEPT_DEFS[c].bestFor}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="text-[length:var(--fs--2)] text-ink-muted">{CONCEPT_DEFS[g.concept].blurb}</p>
        </fieldset>

        <div className="flex gap-2">
          <button type="button" onClick={() => onRemix()} className="btn btn-accent flex-1" data-testid="remix">
            Remix ↻
          </button>
          <button type="button" onClick={history.undo} disabled={!history.canUndo} className="btn btn-outline">
            Undo
          </button>
        </div>

        <fieldset>
          <legend className="label mb-2">Keep when remixing</legend>
          <div className="flex flex-wrap gap-1.5">
            {LOCKABLE.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={locks.includes(k)}
                onClick={() => toggleLock(k)}
                className={cn("btn btn-sm", locks.includes(k) ? "btn-primary" : "btn-outline")}
                data-testid={`lock-${k}`}
              >
                {locks.includes(k) ? "✓ " : ""}
                {LOCK_LABEL[k]}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <span id="energy-label" className="label">
            Motion energy
          </span>
          <Slider.Root className="relative mt-3 flex h-5 w-full touch-none select-none items-center" value={[ENERGY[g.motion]]} min={0} max={1} step={0.05} onValueCommit={([v]) => onRemix({ energy: v })} aria-labelledby="energy-label">
            <Slider.Track className="relative h-1 grow rounded-full bg-ink/10">
              <Slider.Range className="absolute h-full rounded-full bg-signal-ink" />
            </Slider.Track>
            <Slider.Thumb aria-labelledby="energy-label" aria-valuetext={g.motion} className="block h-4 w-4 rounded-full border-2 border-ink bg-paper shadow-sm" />
          </Slider.Root>
          <div className="mono mt-1.5 flex justify-between text-[length:var(--fs--2)] text-ink-muted">
            <span>calm</span>
            <span>snappy</span>
            <span>cinematic</span>
          </div>
        </div>

        <fieldset>
          <legend className="label mb-2">Opens in</legend>
          <div className="flex gap-0.5 rounded-pill border border-rule bg-paper-raised p-0.5">
            {(["light", "dark"] as const).map((t) => (
              <button key={t} type="button" aria-pressed={g.defaultTheme === t} onClick={() => g.defaultTheme !== t && onRemix({ theme: t })} className={cn("h-7 flex-1 rounded-pill text-[length:var(--fs--1)] capitalize", g.defaultTheme === t ? "bg-ink text-paper" : "text-ink-muted hover:text-ink")}>
                {t}
              </button>
            ))}
          </div>
        </fieldset>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md bg-ink/[0.04] p-3 text-[length:var(--fs--1)]" data-testid="genome-summary">
          <dt className="text-ink-muted">Type</dt>
          <dd>{PAIRINGS[g.fonts].label}</dd>
          <dt className="text-ink-muted">Hero</dt>
          <dd className="capitalize">{g.hero}</dd>
          <dt className="text-ink-muted">Motion</dt>
          <dd className="capitalize">{g.motion}</dd>
          <dt className="text-ink-muted">Assistant</dt>
          <dd>{g.copy.assistant}</dd>
          <dt className="text-ink-muted">Seed</dt>
          <dd className="mono">{g.seed}</dd>
        </dl>

        <div className="mt-auto flex gap-2 border-t border-rule pt-4">
          <button type="button" onClick={onBack} className="btn btn-outline">
            ← Content
          </button>
          <button type="button" onClick={onNext} className="btn btn-primary flex-1" data-testid="to-publish">
            Publish →
          </button>
        </div>
      </div>

      <div className={cn("flex min-h-0 flex-col gap-2", tab === "controls" && "max-lg:hidden")}>
        <div className="flex items-center justify-between gap-3">
          <span className="mono truncate text-[length:var(--fs--2)] text-ink-muted" aria-live="polite">
            {ready ? `Live preview · ${CONCEPT_DEFS[g.concept].label} · ${Math.round(scale * 100)}%` : "Loading preview…"}
          </span>
          <div className="flex gap-0.5 rounded-pill border border-rule bg-paper-raised p-0.5" role="group" aria-label="Preview size">
            {(["desktop", "mobile"] as const).map((d) => (
              <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)} className={cn("h-7 rounded-pill px-3 text-[length:var(--fs--1)] capitalize", device === d ? "bg-ink text-paper" : "text-ink-muted hover:text-ink")}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div ref={pane} className={cn("relative min-h-[70vh] flex-1 overflow-hidden rounded-lg border border-rule lg:min-h-0", device === "mobile" ? "bg-paper-sunk" : "bg-paper")}>
          <div
            className={cn("absolute top-0", device === "mobile" ? "left-1/2 top-4 overflow-hidden rounded-[28px] border border-rule shadow-lifted" : "left-0")}
            style={{ width: logicalW * scale, height: frameH * scale, marginLeft: device === "mobile" ? -(logicalW * scale) / 2 : 0 }}
          >
            <iframe
              ref={frame}
              src="/site?preview=1"
              title="Live preview of your site"
              className="origin-top-left border-0 bg-paper"
              style={{ width: logicalW, height: frameH, transform: `scale(${scale})` }}
              data-testid="preview-frame"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
